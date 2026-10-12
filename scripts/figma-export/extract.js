// Runs inside the rendered page (injected by capture.mjs). Walks the DOM and returns a
// layer tree the Figma plugin can rebuild: frames, text, images and icons with page
// geometry and fully resolved styles. Pure browser JS — no imports.
async function aanganExtract() {
  // ---------- Settle the page: final animation state, all images and fonts loaded ----------
  const settle = document.createElement("style");
  settle.textContent =
    "*,*::before,*::after{animation:none!important;transition:none!important}" +
    ".reveal,.reveal-on-scroll{opacity:1!important;transform:none!important}";
  document.head.appendChild(settle);
  for (const img of document.images) img.loading = "eager";
  const settleImage = (i) =>
    Promise.race([i.decode().catch(() => {}), new Promise((r) => setTimeout(r, 8000))]);
  await Promise.all([...document.images].map(settleImage));
  await document.fonts.ready;
  window.scrollTo(0, 0);
  // A timer rather than requestAnimationFrame: background tabs never fire rAF.
  await new Promise((r) => setTimeout(r, 120));

  // ---------- Helpers ----------
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 1;
  const g2d = canvas.getContext("2d", { willReadFrequently: true });
  const colorCache = new Map();
  /** Any CSS color (oklch, color-mix, rgba…) → sRGB 0–1 floats via the canvas, or null if invisible. */
  function color(str) {
    if (!str || str === "none" || str === "transparent") return null;
    if (colorCache.has(str)) return colorCache.get(str);
    g2d.clearRect(0, 0, 1, 1);
    g2d.fillStyle = "rgba(0,0,0,0)";
    g2d.fillStyle = str;
    g2d.fillRect(0, 0, 1, 1);
    const [r, g, b, a] = g2d.getImageData(0, 0, 1, 1).data;
    const c = a === 0 ? null : { r: r / 255, g: g / 255, b: b / 255, a: +(a / 255).toFixed(3) };
    colorCache.set(str, c);
    return c;
  }
  const px = (v) => parseFloat(v) || 0;
  const r2 = (n) => Math.round(n * 100) / 100;

  /** Split on a separator that is not inside parentheses. */
  function splitTop(str, sep) {
    const out = [];
    let depth = 0;
    let cur = "";
    for (const ch of str) {
      if (ch === "(") depth++;
      if (ch === ")") depth--;
      if (ch === sep && depth === 0) {
        if (cur.trim()) out.push(cur.trim());
        cur = "";
      } else cur += ch;
    }
    if (cur.trim()) out.push(cur.trim());
    return out;
  }
  /** "oklch(…) 35%" → ["oklch(…)", "35%"]; handles functions and keywords. */
  function leadColor(s) {
    const m = s.match(/^[a-z-]+\(/i);
    if (m) {
      let depth = 0;
      for (let i = 0; i < s.length; i++) {
        if (s[i] === "(") depth++;
        if (s[i] === ")" && --depth === 0) return [s.slice(0, i + 1), s.slice(i + 1).trim()];
      }
    }
    const tok = s.split(/\s+/)[0];
    return [tok, s.slice(tok.length).trim()];
  }

  function shadows(str) {
    if (!str || str === "none") return [];
    return splitTop(str, ",")
      .map((part) => {
        const inset = /\binset\b/.test(part);
        part = part.replace(/\binset\b/, "").trim();
        let col;
        let lens;
        if (/^[-\d.]/.test(part)) {
          const toks = splitTop(part, " ");
          lens = toks.filter((t) => /^[-\d.]/.test(t));
          col = toks.filter((t) => !/^[-\d.]/.test(t)).join(" ");
        } else {
          const [c, rest] = leadColor(part);
          col = c;
          lens = splitTop(rest, " ");
        }
        const c = color(col);
        if (!c) return null;
        const [x = 0, y = 0, blur = 0, spread = 0] = lens.map(px);
        return { type: inset ? "inner" : "drop", color: c, x, y, blur, spread };
      })
      .filter(Boolean);
  }

  function stopsOf(args) {
    const stops = args.map((a) => {
      const [c, rest] = leadColor(a);
      return { color: color(c) || { r: 0, g: 0, b: 0, a: 0 }, pos: rest ? px(rest) / 100 : null };
    });
    if (stops.length && stops[0].pos === null) stops[0].pos = 0;
    if (stops.length && stops[stops.length - 1].pos === null) stops[stops.length - 1].pos = 1;
    for (let i = 1; i < stops.length - 1; i++) {
      if (stops[i].pos !== null) continue;
      let j = i;
      while (stops[j].pos === null) j++;
      const a = stops[i - 1].pos;
      const step = (stops[j].pos - a) / (j - i + 1);
      for (let k = i; k < j; k++) stops[k].pos = a + step * (k - i + 1);
    }
    return stops;
  }

  function gradients(str, w, h) {
    if (!str || str === "none") return [];
    return splitTop(str, ",")
      .map((layer) => {
        const m = layer.match(/^(?:repeating-)?(linear|radial)-gradient\(([\s\S]*)\)$/);
        if (!m) return null;
        const args = splitTop(m[2], ",");
        if (m[1] === "linear") {
          let angle = 180;
          const first = args[0];
          if (/^-?[\d.]+(deg|turn|rad)/.test(first) || /^to\s/.test(first)) {
            args.shift();
            const dirs = { "to top": 0, "to right": 90, "to bottom": 180, "to left": 270 };
            if (first in dirs) angle = dirs[first];
            else if (first.endsWith("turn")) angle = px(first) * 360;
            else if (first.endsWith("rad")) angle = (px(first) * 180) / Math.PI;
            else angle = px(first);
          }
          return { type: "linear", angle, stops: stopsOf(args) };
        }
        let cx = 0.5;
        let cy = 0.5;
        let rx = 0.71;
        let ry = 0.71;
        const first = args[0];
        if (/ at |^(circle|ellipse|closest|farthest|[\d.]+(px|%))/.test(first)) {
          args.shift();
          const [size, pos] = first.split(" at ");
          const frac = (v, len) => (v.endsWith("%") ? px(v) / 100 : px(v) / len);
          const kw = { left: 0, top: 0, center: 0.5, right: 1, bottom: 1 };
          if (pos) {
            const [a, b = "center"] = pos.trim().split(/\s+/);
            cx = a in kw ? kw[a] : frac(a, w);
            cy = b in kw ? kw[b] : frac(b, h);
          }
          const sz = (size || "")
            .trim()
            .split(/\s+/)
            .filter((s) => /^[\d.]/.test(s));
          if (sz.length >= 2) {
            rx = frac(sz[0], w);
            ry = frac(sz[1], h);
          } else if (sz.length === 1) {
            rx = frac(sz[0], w);
            ry = (rx * w) / h;
          }
        }
        return { type: "radial", cx, cy, rx, ry, stops: stopsOf(args) };
      })
      .filter(Boolean);
  }

  function radii(cs, w, h) {
    const lim = Math.min(w, h) / 2;
    const one = (v) => {
      const first = String(v).split(" ")[0];
      const n = first.endsWith("%") ? (px(first) / 100) * w : px(first);
      return r2(Math.min(n, lim));
    };
    return [
      one(cs.borderTopLeftRadius),
      one(cs.borderTopRightRadius),
      one(cs.borderBottomRightRadius),
      one(cs.borderBottomLeftRadius),
    ];
  }

  function boxStyle(cs, w, h) {
    const fills = [];
    const bg = color(cs.backgroundColor);
    if (bg) fills.push({ type: "solid", color: bg });
    // CSS lists the top background layer first; Figma stacks the last fill on top.
    fills.push(...gradients(cs.backgroundImage, w, h).reverse());
    const side = (s) =>
      cs[`border${s}Style`] !== "none" && px(cs[`border${s}Width`]) > 0
        ? px(cs[`border${s}Width`])
        : 0;
    const widths = {
      top: side("Top"),
      right: side("Right"),
      bottom: side("Bottom"),
      left: side("Left"),
    };
    const firstSide = ["Top", "Right", "Bottom", "Left"].find((s) => widths[s.toLowerCase()] > 0);
    const strokeColor = firstSide ? color(cs[`border${firstSide}Color`]) : null;
    const stroke = strokeColor ? { color: strokeColor, ...widths } : null;
    const effects = shadows(cs.boxShadow);
    const blur = (cs.backdropFilter || cs.webkitBackdropFilter || "").match(/blur\(([\d.]+)px\)/);
    if (blur) effects.push({ type: "bgblur", radius: +blur[1] });
    return { fills, stroke, effects, radius: radii(cs, w, h) };
  }
  const hasVisual = (b) => b.fills.length > 0 || !!b.stroke || b.effects.length > 0;

  function textStyle(cs) {
    const tt = cs.textTransform;
    return {
      family: cs.fontFamily.split(",")[0].replace(/["']/g, "").trim(),
      weight: Math.round(+cs.fontWeight),
      italic: cs.fontStyle === "italic",
      size: px(cs.fontSize),
      color: color(cs.color),
      lineHeight: cs.lineHeight === "normal" ? null : r2(px(cs.lineHeight)),
      letterSpacing: cs.letterSpacing === "normal" ? 0 : r2(px(cs.letterSpacing)),
      textCase:
        tt === "uppercase"
          ? "UPPER"
          : tt === "lowercase"
            ? "LOWER"
            : tt === "capitalize"
              ? "TITLE"
              : "ORIGINAL",
      decoration: cs.textDecorationLine.includes("underline") ? "UNDERLINE" : "NONE",
    };
  }
  const hex = (c) =>
    "#" +
    [c.r, c.g, c.b]
      .map((v) =>
        Math.round(v * 255)
          .toString(16)
          .padStart(2, "0"),
      )
      .join("");

  // ---------- Layer naming ----------
  const COMPONENTS = [
    "site-header",
    "hero",
    "hero-content",
    "hero-note",
    "dock",
    "filter-bar",
    "filter-field",
    "property-card",
    "property-media",
    "property-label",
    "property-cta",
    "property-facts",
    "property-price",
    "type-tile",
    "type-tile-mark",
    "panel",
    "surface-card",
    "icon-circle",
    "spec-list",
    "map-frame",
    "form-control",
    "footer-wordmark",
    "brand",
    "nav-link",
    "eyebrow",
  ];
  const GROUP_TAGS = new Set([
    "header",
    "nav",
    "footer",
    "form",
    "section",
    "article",
    "aside",
    "ul",
    "ol",
    "dl",
  ]);
  const TAG_NAMES = {
    header: "Header",
    nav: "Navigation",
    footer: "Footer",
    form: "Form",
    section: "Section",
    article: "Article",
    aside: "Aside",
    ul: "List",
    ol: "List",
    li: "List item",
    dl: "Details",
    div: "Group",
    p: "Paragraph",
    span: "Span",
    label: "Label",
    main: "Main",
  };
  const pretty = (s) =>
    s
      .replace(/-+/g, " ")
      .trim()
      .replace(/^./, (m) => m.toUpperCase());
  const componentOf = (el) => [...el.classList].find((c) => COMPONENTS.includes(c)) || null;
  const labelOf = (el) =>
    (el.getAttribute("aria-label") || el.textContent || "")
      .trim()
      .replace(/\s+/g, " ")
      .slice(0, 36);
  function layerName(el, tag) {
    const comp = componentOf(el);
    if (tag === "button" || (tag === "a" && el.classList.contains("rounded-full")))
      return `Button · ${labelOf(el)}`;
    if (comp) return pretty(comp);
    if (tag === "a") return `Link · ${labelOf(el)}`;
    return TAG_NAMES[tag] || pretty(tag);
  }

  // ---------- Node builders ----------
  function rel(abs, ctx) {
    return { x: r2(abs.x - ctx.ox), y: r2(abs.y - ctx.oy), w: r2(abs.w), h: r2(abs.h) };
  }
  function absRect(el) {
    const r = el.getBoundingClientRect();
    return { x: r.left + scrollX, y: r.top + scrollY, w: r.width, h: r.height };
  }

  function imageNode(el, cs, abs, ctx, opacity) {
    return {
      t: "image",
      name: el.alt ? `Image · ${el.alt.slice(0, 40)}` : "Image",
      ...rel(abs, ctx),
      src: el.currentSrc || el.src,
      natural: { w: el.naturalWidth, h: el.naturalHeight },
      fit: cs.objectFit,
      position: cs.objectPosition.split(" ").map((v) => (v.endsWith("%") ? px(v) / 100 : 0.5)),
      radius: radii(cs, abs.w, abs.h),
      opacity,
    };
  }

  function svgNode(el, cs, abs, ctx, opacity) {
    const c = color(cs.color);
    const clone = el.cloneNode(true);
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", r2(abs.w));
    clone.setAttribute("height", r2(abs.h));
    clone.removeAttribute("class");
    clone.removeAttribute("aria-hidden");
    clone.removeAttribute("style");
    const sel = "path,circle,rect,line,polyline,polygon,ellipse";
    const src = el.querySelectorAll(sel);
    const dst = clone.querySelectorAll(sel);
    src.forEach((s, i) => {
      dst[i].setAttribute("stroke-width", px(getComputedStyle(s).strokeWidth));
      dst[i].removeAttribute("class");
    });
    const icon = [...el.classList].find((k) => k.startsWith("lucide-"));
    return {
      t: "svg",
      name: icon
        ? `Icon · ${icon.slice(7)}`
        : el.classList.contains("brand-mark")
          ? "Logo mark"
          : "Vector",
      ...rel(abs, ctx),
      svg: clone.outerHTML.replace(/currentColor/g, c ? hex(c) : "#000000"),
      opacity: opacity * (c ? c.a : 1),
    };
  }

  function textLeaf(chars, style, abs, ctx, opacity, align = "LEFT") {
    return {
      t: "text",
      name: chars.slice(0, 40),
      ...rel(abs, ctx),
      autoWidth: true,
      align,
      chars,
      runs: [{ start: 0, end: chars.length, ...style }],
      opacity,
    };
  }

  /** Text, placeholder and chevron for native form controls. */
  function controlNodes(el, cs, abs, ctx) {
    const tag = el.tagName.toLowerCase();
    const padL = px(cs.paddingLeft) + px(cs.borderLeftWidth);
    const padR = px(cs.paddingRight) + px(cs.borderRightWidth);
    const style = textStyle(cs);
    const lh = style.lineHeight || style.size * 1.25;
    let chars = "";
    let st = style;
    if (tag === "select") chars = el.selectedOptions[0] ? el.selectedOptions[0].text : "";
    else if (el.value) chars = el.value;
    else if (el.placeholder) {
      chars = el.placeholder;
      st = { ...style, color: color(getComputedStyle(el, "::placeholder").color) || style.color };
    }
    const out = [];
    if (chars) {
      const y =
        tag === "textarea"
          ? abs.y + px(cs.borderTopWidth) + px(cs.paddingTop)
          : abs.y + (abs.h - lh) / 2;
      const node = textLeaf(
        chars,
        { ...st, lineHeight: lh },
        { x: abs.x + padL, y, w: abs.w - padL - padR, h: lh },
        ctx,
        1,
      );
      if (tag === "textarea") node.autoWidth = false;
      out.push(node);
    }
    if (tag === "select") {
      const size = 16;
      const chevron =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" ` +
        `stroke="${style.color ? hex(style.color) : "#000"}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>`;
      out.push({
        t: "svg",
        name: "Icon · chevron-down",
        ...rel(
          {
            x: abs.x + abs.w - Math.max(padR, 4) - size,
            y: abs.y + (abs.h - size) / 2,
            w: size,
            h: size,
          },
          ctx,
        ),
        svg: chevron,
        opacity: 1,
      });
    }
    return out;
  }

  /** Absolutely positioned decorative pseudo-elements (overlays, glows, underlines). */
  function pseudoNode(el, cs, which, abs, ctx) {
    const pcs = getComputedStyle(el, which);
    if (pcs.content === "none" || pcs.content === "normal" || pcs.display === "none") return [];
    if (pcs.position !== "absolute") return [];
    const m = pcs.transform && pcs.transform.match(/matrix\(([^)]+)\)/);
    if (m) {
      const [a, , , d] = m[1].split(",").map(Number);
      if (Math.abs(a) < 0.01 || Math.abs(d) < 0.01) return [];
    }
    const w = px(pcs.width);
    const h = px(pcs.height);
    if (w < 0.5 || h < 0.5) return [];
    const box = boxStyle(pcs, w, h);
    if (!hasVisual(box)) return [];
    const x = abs.x + px(cs.borderLeftWidth) + px(pcs.left);
    const y = abs.y + px(cs.borderTopWidth) + px(pcs.top);
    const base = pretty(componentOf(el) || el.tagName.toLowerCase());
    return [
      {
        t: "frame",
        name: `${base} ${which === "::before" ? "glow" : "overlay"}`,
        ...rel({ x, y, w, h }, ctx),
        ...box,
        clip: false,
        opacity: ctx.opacity * +pcs.opacity,
        children: [],
        z: pcs.zIndex === "auto" ? 0 : +pcs.zIndex,
      },
    ];
  }

  /** The short rule drawn before .eyebrow labels (a static flex-item pseudo-element). */
  function eyebrowRule(el, cs, abs, ctx) {
    const pcs = getComputedStyle(el, "::before");
    if (pcs.content === "none") return [];
    const w = px(pcs.width) || 24;
    const h = px(pcs.height) || 1;
    const c = color(pcs.backgroundColor);
    if (!c) return [];
    const x = abs.x + px(cs.borderLeftWidth) + px(cs.paddingLeft);
    return [
      {
        t: "frame",
        name: "Eyebrow rule",
        ...rel({ x, y: abs.y + (abs.h - h) / 2, w, h }, ctx),
        fills: [{ type: "solid", color: c }],
        stroke: null,
        effects: [],
        radius: [0, 0, 0, 0],
        clip: false,
        opacity: ctx.opacity,
        children: [],
      },
    ];
  }

  /** One text layer from a run of inline content (text nodes, <br>, inline elements). */
  function textNode(group, el, cs, abs, ctx) {
    const pre = /^pre/.test(cs.whiteSpace);
    const chars = [];
    let lastSpace = true;
    for (const n of group) {
      if (n.nodeType === 1) {
        while (chars.length && chars[chars.length - 1].ch === " ") chars.pop();
        chars.push({ ch: "\n", node: null });
        lastSpace = true;
        continue;
      }
      const data = n.data;
      for (let i = 0; i < data.length; i++) {
        const ch = data[i];
        if (!pre && /\s/.test(ch)) {
          if (!lastSpace) chars.push({ ch: " ", node: n, off: i });
          lastSpace = true;
        } else {
          chars.push({ ch, node: n, off: i });
          lastSpace = ch === "\n";
        }
      }
    }
    while (chars.length && /[ \n]/.test(chars[chars.length - 1].ch)) chars.pop();
    while (chars.length && chars[0].ch === "\n") chars.shift();
    const real = chars.filter((c) => c.node && c.ch.trim());
    if (!real.length) return null;

    const range = document.createRange();
    range.setStart(real[0].node, real[0].off);
    range.setEnd(real[real.length - 1].node, real[real.length - 1].off + 1);
    const rects = [...range.getClientRects()].filter((r) => r.width > 0 && r.height > 0);
    if (!rects.length) return null;
    const union = rects.reduce(
      (u, r) => ({
        l: Math.min(u.l, r.left),
        t: Math.min(u.t, r.top),
        r: Math.max(u.r, r.right),
        b: Math.max(u.b, r.bottom),
      }),
      { l: Infinity, t: Infinity, r: -Infinity, b: -Infinity },
    );

    // Find soft line breaks at word starts. Headings keep the browser's (balanced) breaks
    // as hard returns; paragraphs stay reflowable.
    const heading =
      /^H[12]$/.test(el.tagName) ||
      el.classList.contains("statement") ||
      el.classList.contains("footer-wordmark");
    let lines = 1;
    let lineMid = null;
    for (let i = 0; i < chars.length; i++) {
      const c = chars[i];
      if (c.ch === "\n") {
        lines++;
        lineMid = null;
        continue;
      }
      if (!c.node || c.ch === " ") continue;
      const prev = chars[i - 1];
      if (prev && prev.ch !== " " && prev.ch !== "\n") continue;
      range.setStart(c.node, c.off);
      range.setEnd(c.node, c.off + 1);
      const rr = range.getClientRects()[0] || range.getBoundingClientRect();
      const mid = rr.top + rr.height / 2;
      if (lineMid === null) lineMid = mid;
      else if (mid > lineMid + 2) {
        lines++;
        lineMid = mid;
        if (heading && prev && prev.ch === " ") prev.ch = "\n";
      }
    }

    // Style runs by parent element.
    let text = "";
    const runs = [];
    let cur = null;
    for (const c of chars) {
      const parent = c.node ? c.node.parentElement : cur ? cur.parent : el;
      if (!cur || cur.parent !== parent) {
        cur = { parent, start: text.length, end: text.length };
        runs.push(cur);
      }
      text += c.ch;
      cur.end = text.length;
    }
    const styled = [];
    for (const r of runs) {
      const st = textStyle(getComputedStyle(r.parent));
      const prev = styled[styled.length - 1];
      const { start, end } = r;
      if (
        prev &&
        JSON.stringify({ ...prev, start: 0, end: 0 }) ===
          JSON.stringify({ ...st, start: 0, end: 0 })
      )
        prev.end = end;
      else styled.push({ ...st, start, end });
    }

    const first = rects[0];
    const lh = styled[0].lineHeight || first.height;
    const contentX = abs.x + px(cs.borderLeftWidth) + px(cs.paddingLeft);
    const contentW =
      abs.w -
      px(cs.borderLeftWidth) -
      px(cs.paddingLeft) -
      px(cs.paddingRight) -
      px(cs.borderRightWidth);
    const blockish = /^(block|list-item|table-cell)$/.test(cs.display);
    const align =
      { center: "CENTER", right: "RIGHT", end: "RIGHT", justify: "JUSTIFIED" }[cs.textAlign] ||
      "LEFT";
    let x;
    let w;
    let autoWidth = false;
    if (lines === 1) {
      autoWidth = true;
      x = union.l + scrollX;
      w = union.r - union.l;
    } else if (blockish) {
      x = contentX;
      w = contentW;
    } else {
      x = union.l + scrollX;
      w = union.r - union.l + 2;
    }
    const y = first.top + scrollY - (lh - first.height) / 2;
    return {
      t: "text",
      name: text.replace(/\n/g, " ").slice(0, 40),
      ...rel({ x, y, w, h: lines * lh }, ctx),
      autoWidth,
      align,
      chars: text,
      runs: styled,
      opacity: ctx.opacity,
    };
  }

  function collectInline(el, group) {
    for (const n of el.childNodes) {
      if (n.nodeType === 3) group.push(n);
      else if (n.nodeType === 1) {
        if (n.tagName === "BR") group.push(n);
        else if (getComputedStyle(n).display !== "none") collectInline(n, group);
      }
    }
  }

  function walk(el, ctx) {
    const cs = getComputedStyle(el);
    if (cs.display === "none" || cs.visibility === "hidden" || +cs.opacity === 0) return [];
    const abs = absRect(el);
    const clip = /(hidden|clip)/.test(cs.overflowX + cs.overflowY);
    if (abs.w <= 1.5 && abs.h <= 1.5 && clip) return []; // visually hidden (sr-only)
    const tag = el.tagName.toLowerCase();
    const opacity = ctx.opacity * +cs.opacity;
    const z = cs.position !== "static" && cs.zIndex !== "auto" ? +cs.zIndex : 0;
    if (tag === "img") return [{ ...imageNode(el, cs, abs, ctx, opacity), z }];
    if (tag === "svg") return [{ ...svgNode(el, cs, abs, ctx, opacity), z }];

    const box = boxStyle(cs, abs.w, abs.h);
    if (tag === "iframe") {
      const muted = color(
        getComputedStyle(document.documentElement).getPropertyValue("--muted").trim(),
      );
      const label = textStyle(getComputedStyle(document.body));
      label.color = color(
        getComputedStyle(document.documentElement).getPropertyValue("--muted-foreground").trim(),
      );
      label.size = 14;
      label.lineHeight = 20;
      return [
        {
          t: "frame",
          name: "Map embed",
          ...rel(abs, ctx),
          ...box,
          fills: muted ? [{ type: "solid", color: muted }] : [],
          clip: true,
          opacity,
          z,
          children: [
            textLeaf(
              "Map · OpenStreetMap embed",
              label,
              { x: 20, y: 20, w: 300, h: 20 },
              { ox: 0, oy: 0 },
              1,
            ),
          ],
        },
      ];
    }
    const control = tag === "select" || tag === "input" || tag === "textarea";
    const isFrame = hasVisual(box) || clip || control || !!componentOf(el) || GROUP_TAGS.has(tag);
    const node = isFrame
      ? {
          t: "frame",
          name: layerName(el, tag),
          ...rel(abs, ctx),
          ...box,
          clip,
          opacity,
          z,
          children: [],
        }
      : null;
    const childCtx = node ? { ox: abs.x, oy: abs.y, opacity: 1 } : { ...ctx, opacity };

    const kids = [];
    kids.push(...pseudoNode(el, cs, "::before", abs, childCtx));
    if (el.classList.contains("eyebrow")) kids.push(...eyebrowRule(el, cs, abs, childCtx));
    if (control) kids.push(...controlNodes(el, cs, abs, childCtx));
    else {
      let group = [];
      const flush = () => {
        if (group.length) {
          const t = textNode(group, el, cs, abs, childCtx);
          if (t) kids.push(t);
          group = [];
        }
      };
      for (const child of el.childNodes) {
        if (child.nodeType === 3) {
          group.push(child);
          continue;
        }
        if (child.nodeType !== 1) continue;
        if (child.tagName === "BR") {
          group.push(child);
          continue;
        }
        const ccs = getComputedStyle(child);
        if (ccs.display === "inline" && !child.querySelector("svg,img")) {
          collectInline(child, group);
          continue;
        }
        flush();
        kids.push(...walk(child, childCtx));
      }
      flush();
    }
    kids.push(...pseudoNode(el, cs, "::after", abs, childCtx));
    // Paint order: positioned children with a positive z-index go on top.
    const ordered = kids
      .map((k, i) => ({ k, i }))
      .sort((a, b) => (a.k.z || 0) - (b.k.z || 0) || a.i - b.i)
      .map((o) => o.k);
    if (node) {
      node.children = ordered;
      return [node];
    }
    if (z) ordered.forEach((k) => (k.z = Math.max(k.z || 0, z)));
    return ordered;
  }

  // ---------- Segments: header, each top-level block in <main>, footer ----------
  const roots = [];
  const header = document.querySelector("header.site-header");
  if (header) roots.push(header);
  const main = document.querySelector("main");
  if (main) roots.push(...[...main.children].filter((c) => getComputedStyle(c).display !== "none"));
  const footer = document.querySelector("footer");
  if (footer) roots.push(footer);

  function segName(el) {
    if (el.matches("header")) return "Header";
    if (el.matches("footer")) return "Footer";
    if (el.classList.contains("hero")) return "Hero";
    if (el.matches("form.dock")) return "Search";
    if (el.querySelector(".panel")) return "Contact panel";
    const eyebrow = el.querySelector(".eyebrow");
    const h = el.querySelector("h1, h2");
    const txt = ((eyebrow && eyebrow.textContent) || (h && h.textContent) || el.tagName)
      .trim()
      .replace(/\s+/g, " ");
    return txt.length > 40 ? `${txt.slice(0, 40)}…` : txt;
  }
  const items = roots
    .map((el) => {
      const r = absRect(el);
      return { els: [el], top: r.y, bottom: r.y + r.h };
    })
    .sort((a, b) => a.top - b.top);
  const bands = [];
  for (const it of items) {
    const last = bands[bands.length - 1];
    if (last && it.top < last.bottom - 0.5) {
      last.els.push(...it.els);
      last.bottom = Math.max(last.bottom, it.bottom);
    } else bands.push({ ...it });
  }
  const docH = document.documentElement.scrollHeight;
  bands.forEach((b, i) => {
    b.top = i === 0 ? 0 : b.top;
    const next = bands[i + 1];
    b.bottom = next ? next.top : Math.max(b.bottom, docH);
  });

  const segments = bands.map((b, i) => ({
    name: `${String(i + 1).padStart(2, "0")} · ${b.els.map(segName).join(" + ")}`,
    y: r2(b.top),
    h: r2(b.bottom - b.top),
    nodes: b.els.flatMap((el) => walk(el, { ox: 0, oy: b.top, opacity: 1 })),
  }));

  // ---------- Design tokens and type samples ----------
  const rootCs = getComputedStyle(document.documentElement);
  const TOKENS = [
    "background",
    "surface",
    "foreground",
    "primary",
    "primary-foreground",
    "secondary",
    "muted",
    "muted-foreground",
    "accent",
    "border",
    "input",
    "destructive",
    "brick",
    "forest",
    "on-image",
    "sand",
  ];
  const tokens = Object.fromEntries(
    TOKENS.map((n) => [n, color(rootCs.getPropertyValue(`--${n}`).trim())]),
  );
  const elevation = {
    soft: shadows(rootCs.getPropertyValue("--elevation-soft").trim()),
    float: shadows(rootCs.getPropertyValue("--elevation-float").trim()),
  };
  const SAMPLES = [
    ["Display", ".hero h1"],
    ["Heading", "h1.text-heading"],
    ["Title", "h2.text-title"],
    ["Heading 3", "h3"],
    ["Lede", ".lede"],
    ["Body", ".body-copy"],
    ["Eyebrow", ".eyebrow"],
    ["Price", ".property-price"],
    ["Label", ".filter-field label"],
    ["Navigation", ".nav-link"],
    ["Button", "button.rounded-full, a.rounded-full"],
    ["Caption", "p.text-xs"],
  ];
  const typeSamples = {};
  for (const [name, sel] of SAMPLES) {
    const el = document.querySelector(sel);
    if (el) typeSamples[name] = textStyle(getComputedStyle(el));
  }

  return {
    title: document.title,
    width: document.documentElement.clientWidth,
    height: docH,
    background: color(getComputedStyle(document.body).backgroundColor),
    segments,
    tokens,
    elevation,
    typeSamples,
  };
}
