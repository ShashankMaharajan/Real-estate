// Figma plugin runtime. capture.mjs prepends `const DATA = {...}` (the captured site).
// It builds: a "Design system" page (color variables with Light/Dark modes, text and
// effect styles, specimens) and one page per site page, with a Section per variant
// (Desktop Light, Desktop Dark, Mobile) holding one frame per page segment.
// Written without ?. and ?? to stay within the plugin sandbox's JS support.

const FALLBACK_FAMILY = "Inter";
const stats = { layers: 0, errors: 0 };
let FONTS = null;
let HASHES = {};
let VARS = null;

// ---------- Fonts ----------
const WEIGHT_WORDS = [
  ["extralight", 200],
  ["ultralight", 200],
  ["semibold", 600],
  ["demibold", 600],
  ["extrabold", 800],
  ["ultrabold", 800],
  ["hairline", 100],
  ["regular", 400],
  ["normal", 400],
  ["medium", 500],
  ["light", 300],
  ["black", 900],
  ["heavy", 900],
  ["thin", 100],
  ["book", 400],
  ["bold", 700],
];
function styleInfo(style) {
  const s = style.toLowerCase().replace(/[\s_-]/g, "");
  let weight = 400;
  for (let i = 0; i < WEIGHT_WORDS.length; i++) {
    if (s.indexOf(WEIGHT_WORDS[i][0]) !== -1) {
      weight = WEIGHT_WORDS[i][1];
      break;
    }
  }
  return {
    weight: weight,
    italic: /italic|oblique/.test(s),
    odd: /condensed|expanded|narrow|wide|compressed|\dpt|soft|wonk|display|caption|subhead/.test(s),
  };
}

async function resolveFonts() {
  const available = await figma.listAvailableFontsAsync();
  const byFamily = {};
  for (const f of available) {
    const fam = f.fontName.family;
    if (!byFamily[fam]) byFamily[fam] = [];
    byFamily[fam].push(f.fontName.style);
  }
  const cache = {};
  const missing = {};
  function pick(family, weight, italic) {
    const key = family + "|" + weight + "|" + italic;
    if (cache[key]) return cache[key];
    let fam = family;
    let styles = byFamily[family];
    if (!styles) {
      missing[family] = true;
      fam = FALLBACK_FAMILY;
      styles = byFamily[fam] || ["Regular"];
    }
    let best = styles[0];
    let bestScore = Infinity;
    for (const st of styles) {
      const info = styleInfo(st);
      const score =
        Math.abs(info.weight - weight) +
        (info.italic !== !!italic ? 1000 : 0) +
        (info.odd ? 300 : 0);
      if (score < bestScore) {
        bestScore = score;
        best = st;
      }
    }
    cache[key] = { family: fam, style: best };
    return cache[key];
  }
  return { pick: pick, missing: missing };
}

function neededFonts() {
  const list = [
    ["Instrument Sans", 400, false],
    ["Instrument Sans", 600, false],
    ["Fraunces", 360, false],
    [FALLBACK_FAMILY, 400, false],
  ];
  const visit = (nodes) => {
    for (const n of nodes) {
      if (n.t === "text") for (const r of n.runs) list.push([r.family, r.weight, r.italic]);
      if (n.children) visit(n.children);
    }
  };
  for (const p of DATA.pages)
    for (const v of p.variants) for (const s of v.segments) visit(s.nodes);
  for (const k in DATA.typeSamples) {
    const s = DATA.typeSamples[k];
    list.push([s.family, s.weight, s.italic]);
  }
  const unique = {};
  for (const [fam, w, it] of list) {
    const f = FONTS.pick(fam, w, it);
    unique[f.family + "|" + f.style] = f;
  }
  return Object.keys(unique).map((k) => unique[k]);
}

// ---------- Paints, strokes, effects ----------
const colorKey = (c) => [c.r, c.g, c.b, c.a].map((v) => v.toFixed(3)).join(",");
const dim = (v) => Math.max(0.01, v || 0);

function solidPaint(c, theme) {
  let paint = { type: "SOLID", color: { r: c.r, g: c.g, b: c.b }, opacity: c.a };
  if (theme && VARS && c.a >= 0.999) {
    const v = VARS.byTheme[theme][colorKey(c)];
    if (v) {
      try {
        paint = figma.variables.setBoundVariableForPaint(paint, "color", v);
      } catch (e) {
        /* keep the plain color */
      }
    }
  }
  return paint;
}

function linearTransform(angle, w, h) {
  const rad = (angle * Math.PI) / 180;
  const sin = Math.sin(rad);
  const cos = Math.cos(rad);
  const len = Math.abs(w * sin) + Math.abs(h * cos) || 1;
  const a = (w * sin) / len;
  const b = (-h * cos) / len;
  return [
    [a, b, 0.5 - 0.5 * a - 0.5 * b],
    [-b, a, 0.5 + 0.5 * b - 0.5 * a],
  ];
}

function radialTransform(f) {
  const rx = f.rx || 0.5;
  const ry = f.ry || 0.5;
  return [
    [0.5 / rx, 0, 0.5 - (0.5 * f.cx) / rx],
    [0, 0.5 / ry, 0.5 - (0.5 * f.cy) / ry],
  ];
}

const clamp01 = (v) => Math.min(1, Math.max(0, v));
function gradientStops(stops) {
  return stops
    .map((s) => ({
      position: clamp01(s.pos),
      color: { r: s.color.r, g: s.color.g, b: s.color.b, a: s.color.a },
    }))
    .sort((a, b) => a.position - b.position);
}

function paints(fills, w, h, theme) {
  const out = [];
  for (const f of fills || []) {
    if (f.type === "solid") out.push(solidPaint(f.color, theme));
    else if (f.type === "linear")
      out.push({
        type: "GRADIENT_LINEAR",
        gradientTransform: linearTransform(f.angle, w, h),
        gradientStops: gradientStops(f.stops),
      });
    else if (f.type === "radial")
      out.push({
        type: "GRADIENT_RADIAL",
        gradientTransform: radialTransform(f),
        gradientStops: gradientStops(f.stops),
      });
  }
  return out;
}

function imagePaint(n) {
  const img = DATA.images[n.image];
  const s =
    n.fit === "contain"
      ? Math.min(n.w / img.width, n.h / img.height)
      : Math.max(n.w / img.width, n.h / img.height);
  const dw = img.width * s;
  const dh = img.height * s;
  const ox = (n.w - dw) * n.position[0];
  const oy = (n.h - dh) * n.position[1];
  return {
    type: "IMAGE",
    imageHash: HASHES[n.image],
    scaleMode: "CROP",
    imageTransform: [
      [n.w / dw, 0, -ox / dw],
      [0, n.h / dh, -oy / dh],
    ],
  };
}

function applyRadius(node, r) {
  if (!r) return;
  node.topLeftRadius = r[0];
  node.topRightRadius = r[1];
  node.bottomRightRadius = r[2];
  node.bottomLeftRadius = r[3];
}

function applyStroke(node, s, theme) {
  if (!s) return;
  node.strokes = [solidPaint(s.color, theme)];
  node.strokeAlign = "INSIDE";
  if (s.top === s.right && s.right === s.bottom && s.bottom === s.left) node.strokeWeight = s.top;
  else {
    node.strokeTopWeight = s.top;
    node.strokeRightWeight = s.right;
    node.strokeBottomWeight = s.bottom;
    node.strokeLeftWeight = s.left;
  }
}

function effectsOf(list) {
  return (list || []).map((e) =>
    e.type === "bgblur"
      ? { type: "BACKGROUND_BLUR", radius: e.radius, visible: true }
      : {
          type: e.type === "inner" ? "INNER_SHADOW" : "DROP_SHADOW",
          color: { r: e.color.r, g: e.color.g, b: e.color.b, a: e.color.a },
          offset: { x: e.x, y: e.y },
          radius: Math.max(0, e.blur),
          spread: e.spread || 0,
          visible: true,
          blendMode: "NORMAL",
        },
  );
}

function applyEffects(node, list) {
  if (!list || !list.length) return;
  const fx = effectsOf(list);
  try {
    node.effects = fx;
  } catch (e) {
    try {
      node.effects = fx.map((f) =>
        f.type === "BACKGROUND_BLUR" ? Object.assign({}, f, { blurType: "NORMAL" }) : f,
      );
    } catch (e2) {
      node.effects = fx.filter((f) => f.type !== "BACKGROUND_BLUR");
    }
  }
}

// ---------- Layers ----------
function createText(n, parent, theme) {
  const t = figma.createText();
  parent.appendChild(t);
  const first = n.runs[0];
  t.fontName = FONTS.pick(first.family, first.weight, first.italic);
  t.characters = n.chars;
  for (const r of n.runs) {
    if (r.end <= r.start) continue;
    t.setRangeFontName(r.start, r.end, FONTS.pick(r.family, r.weight, r.italic));
    t.setRangeFontSize(r.start, r.end, Math.max(1, r.size));
    t.setRangeFills(r.start, r.end, r.color ? [solidPaint(r.color, theme)] : []);
    t.setRangeLetterSpacing(r.start, r.end, { value: r.letterSpacing || 0, unit: "PIXELS" });
    t.setRangeLineHeight(
      r.start,
      r.end,
      r.lineHeight ? { value: r.lineHeight, unit: "PIXELS" } : { unit: "AUTO" },
    );
    if (r.textCase && r.textCase !== "ORIGINAL") t.setRangeTextCase(r.start, r.end, r.textCase);
    if (r.decoration === "UNDERLINE") t.setRangeTextDecoration(r.start, r.end, "UNDERLINE");
  }
  t.textAlignHorizontal = n.align;
  if (n.autoWidth) t.textAutoResize = "WIDTH_AND_HEIGHT";
  else {
    t.textAutoResize = "HEIGHT";
    t.resize(dim(n.w), dim(t.height));
    t.textAutoResize = "HEIGHT";
  }
  t.x = n.x;
  t.y = n.y;
  t.name = n.name || "Text";
  return t;
}

function create(n, parent, theme) {
  let node = null;
  if (n.t === "frame") {
    node = figma.createFrame();
    parent.appendChild(node);
    node.name = n.name;
    node.resizeWithoutConstraints(dim(n.w), dim(n.h));
    node.x = n.x;
    node.y = n.y;
    node.fills = paints(n.fills, n.w, n.h, theme);
    node.clipsContent = !!n.clip;
    applyRadius(node, n.radius);
    applyStroke(node, n.stroke, theme);
    applyEffects(node, n.effects);
    build(n.children || [], node, theme);
  } else if (n.t === "text") {
    node = createText(n, parent, theme);
  } else if (n.t === "image") {
    node = figma.createRectangle();
    parent.appendChild(node);
    node.name = n.name;
    node.resize(dim(n.w), dim(n.h));
    node.x = n.x;
    node.y = n.y;
    applyRadius(node, n.radius);
    node.fills = HASHES[n.image] ? [imagePaint(n)] : [];
  } else if (n.t === "svg") {
    node = figma.createNodeFromSvg(n.svg);
    parent.appendChild(node);
    node.name = n.name;
    node.x = n.x;
    node.y = n.y;
    node.fills = [];
    node.clipsContent = false;
  }
  if (node && typeof n.opacity === "number" && n.opacity < 0.999)
    node.opacity = Math.max(0, n.opacity);
  return node;
}

function build(nodes, parent, theme) {
  for (const n of nodes) {
    try {
      if (create(n, parent, theme)) stats.layers++;
    } catch (e) {
      stats.errors++;
      if (stats.errors <= 20) console.warn("Layer failed: " + n.name, e);
    }
  }
}

// ---------- Variables and styles ----------
function setMode(node, modeId) {
  try {
    node.setExplicitVariableModeForCollection(VARS.collection, modeId);
    return true;
  } catch (e) {
    try {
      node.setExplicitVariableModeForCollection(VARS.collection.id, modeId);
      return true;
    } catch (e2) {
      return false;
    }
  }
}

function buildVariables() {
  try {
    const light = DATA.tokens.light || {};
    const dark = DATA.tokens.dark || {};
    const collection = figma.variables.createVariableCollection("Aangan colors");
    const lightId = collection.modes[0].modeId;
    collection.renameMode(lightId, "Light");
    // Figma's free plan allows one mode per collection: keep Light-only variables there.
    let darkId = null;
    try {
      darkId = collection.addMode("Dark");
    } catch (e) {
      console.warn("Dark mode variables need a paid Figma plan; creating Light only.");
    }
    const vars = {};
    const byTheme = { light: {}, dark: {} };
    for (const name of Object.keys(light)) {
      const l = light[name];
      if (!l) continue;
      const d = dark[name] || l;
      let v;
      try {
        v = figma.variables.createVariable("color/" + name, collection, "COLOR");
      } catch (e) {
        v = figma.variables.createVariable("color/" + name, collection.id, "COLOR");
      }
      v.setValueForMode(lightId, { r: l.r, g: l.g, b: l.b, a: l.a });
      if (darkId) v.setValueForMode(darkId, { r: d.r, g: d.g, b: d.b, a: d.a });
      vars[name] = v;
      if (!byTheme.light[colorKey(l)]) byTheme.light[colorKey(l)] = v;
      if (!byTheme.dark[colorKey(d)]) byTheme.dark[colorKey(d)] = v;
    }
    return {
      collection: collection,
      lightId: lightId,
      darkId: darkId,
      vars: vars,
      byTheme: byTheme,
    };
  } catch (e) {
    console.warn("Color variables unavailable", e);
    return null;
  }
}

function buildTextStyles() {
  const styles = {};
  for (const name of Object.keys(DATA.typeSamples)) {
    const s = DATA.typeSamples[name];
    try {
      const st = figma.createTextStyle();
      st.name = "Aangan/" + name;
      st.fontName = FONTS.pick(s.family, s.weight, s.italic);
      st.fontSize = s.size;
      st.lineHeight = s.lineHeight ? { value: s.lineHeight, unit: "PIXELS" } : { unit: "AUTO" };
      st.letterSpacing = { value: s.letterSpacing || 0, unit: "PIXELS" };
      st.textCase = s.textCase || "ORIGINAL";
      styles[name] = st;
    } catch (e) {
      console.warn("Text style failed: " + name, e);
    }
  }
  return styles;
}

function buildEffectStyles() {
  const out = {};
  const elevation = (DATA.elevation && DATA.elevation.light) || {};
  for (const name of Object.keys(elevation)) {
    try {
      const st = figma.createEffectStyle();
      st.name = "Aangan/Elevation " + name;
      st.effects = effectsOf(elevation[name]);
      out[name] = st;
    } catch (e) {
      console.warn("Effect style failed: " + name, e);
    }
  }
  return out;
}

// ---------- Design system page ----------
function label(parent, chars, x, y, opts) {
  const o = opts || {};
  const t = figma.createText();
  parent.appendChild(t);
  t.fontName = FONTS.pick(o.family || "Instrument Sans", o.weight || 400, false);
  t.characters = chars;
  t.fontSize = o.size || 14;
  t.fills = [solidPaint(o.color || DATA.tokens.light.foreground, o.theme || null)];
  t.x = x;
  t.y = y;
  return t;
}

async function applyTextStyle(t, style) {
  try {
    if (t.setTextStyleIdAsync) await t.setTextStyleIdAsync(style.id);
    else t.textStyleId = style.id;
  } catch (e) {
    /* leave the direct formatting */
  }
}

async function applyEffectStyle(node, style) {
  try {
    if (node.setEffectStyleIdAsync) await node.setEffectStyleIdAsync(style.id);
    else node.effectStyleId = style.id;
  } catch (e) {
    /* leave unstyled */
  }
}

function board(parent, name, x, y, w, h, fill) {
  const f = figma.createFrame();
  parent.appendChild(f);
  f.name = name;
  f.resizeWithoutConstraints(w, h);
  f.x = x;
  f.y = y;
  f.cornerRadius = 24;
  f.fills = [fill];
  return f;
}

async function buildDesignSystem(page, textStyles, effectStyles) {
  const L = DATA.tokens.light;
  const title = label(page, "Aangan — Design system", 0, 0, {
    family: "Fraunces",
    weight: 360,
    size: 64,
  });
  title.name = "Title";
  label(page, "Captured from " + DATA.source + " · " + DATA.generatedAt.slice(0, 10), 0, 92, {
    color: L["muted-foreground"],
  });

  // Colors, once per mode. Swatches are bound to the color variables.
  const names = Object.keys(L).filter((k) => L[k]);
  const cols = 4;
  const sw = 200;
  const sh = 120;
  const gap = 24;
  const rows = Math.ceil(names.length / cols);
  const bw = 64 * 2 + cols * sw + (cols - 1) * gap;
  const bh = 120 + rows * (sh + 64);
  const themes = VARS && VARS.darkId ? ["light", "dark"] : ["light"];
  for (let ti = 0; ti < themes.length; ti++) {
    const theme = themes[ti];
    const b = board(
      page,
      "Colors · " + (theme === "light" ? "Light" : "Dark"),
      ti * (bw + 64),
      160,
      bw,
      bh,
      solidPaint(L.background, "light"),
    );
    if (VARS && theme === "dark") setMode(b, VARS.darkId);
    const T = DATA.tokens[theme] || L;
    label(b, theme === "light" ? "Colors — Light" : "Colors — Dark", 64, 48, {
      family: "Fraunces",
      weight: 360,
      size: 32,
      color: T.foreground,
      theme: theme,
    });
    names.forEach((name, i) => {
      const x = 64 + (i % cols) * (sw + gap);
      const y = 120 + Math.floor(i / cols) * (sh + 64);
      const r = figma.createRectangle();
      b.appendChild(r);
      r.name = name;
      r.resize(sw, sh);
      r.x = x;
      r.y = y;
      r.cornerRadius = 16;
      r.fills = [solidPaint(T[name] || L[name], theme)];
      r.strokes = [solidPaint(T.border || L.border, theme)];
      r.strokeWeight = 1;
      label(b, name, x, y + sh + 10, { weight: 600, size: 13, color: T.foreground, theme: theme });
      const c = T[name] || L[name];
      const hex =
        "#" +
        [c.r, c.g, c.b]
          .map((v) =>
            Math.round(v * 255)
              .toString(16)
              .padStart(2, "0"),
          )
          .join("");
      label(b, hex + (c.a < 1 ? " · " + Math.round(c.a * 100) + "%" : ""), x, y + sh + 30, {
        size: 12,
        color: T["muted-foreground"],
        theme: theme,
      });
    });
  }

  // Typography specimens using the text styles.
  const typeNames = Object.keys(DATA.typeSamples);
  const ty = 160 + bh + 96;
  const typeBoard = board(
    page,
    "Typography",
    0,
    ty,
    bw * 2 + 64,
    120 + typeNames.length * 140,
    solidPaint(L.surface || L.background, "light"),
  );
  label(typeBoard, "Typography", 64, 48, { family: "Fraunces", weight: 360, size: 32 });
  let yy = 128;
  for (const name of typeNames) {
    const s = DATA.typeSamples[name];
    label(
      typeBoard,
      name +
        " · " +
        s.family +
        " " +
        s.weight +
        (s.italic ? " italic" : "") +
        " · " +
        Math.round(s.size) +
        "/" +
        (s.lineHeight ? Math.round(s.lineHeight) : "auto"),
      64,
      yy,
      { size: 12, color: L["muted-foreground"] },
    );
    const sample =
      name === "Display" || name === "Heading" || name === "Title"
        ? "A place to call home in Nepal."
        : name === "Price"
          ? "NPR 4.5 Cr"
          : "Homes, land, and possibilities — find a space that feels like you.";
    const t = label(typeBoard, sample, 64, yy + 24, { size: s.size });
    t.fontName = FONTS.pick(s.family, s.weight, s.italic);
    if (textStyles[name]) await applyTextStyle(t, textStyles[name]);
    yy += Math.max(60, Math.round((s.lineHeight || s.size * 1.2) + 56));
  }
  typeBoard.resizeWithoutConstraints(typeBoard.width, yy + 48);

  // Elevation.
  const ey = ty + typeBoard.height + 96;
  const elev = board(page, "Elevation", 0, ey, 760, 360, solidPaint(L.background, "light"));
  label(elev, "Elevation", 64, 48, { family: "Fraunces", weight: 360, size: 32 });
  Object.keys(effectStyles).forEach((name, i) => {
    const card = figma.createFrame();
    elev.appendChild(card);
    card.name = "Elevation " + name;
    card.resizeWithoutConstraints(280, 160);
    card.x = 64 + i * 340;
    card.y = 128;
    card.cornerRadius = 20;
    card.fills = [solidPaint(L.surface || L.background, "light")];
    applyEffectStyle(card, effectStyles[name]);
    label(card, name, 24, 24, { weight: 600, size: 14 });
  });
}

// ---------- Main ----------
async function run() {
  figma.notify("Building the Aangan design… this can take a minute.", { timeout: 4000 });
  const startPage = figma.currentPage;
  const startEmpty = startPage.children.length === 0;

  FONTS = await resolveFonts();
  await Promise.all(neededFonts().map((f) => figma.loadFontAsync(f)));

  for (const id of Object.keys(DATA.images)) {
    HASHES[id] = figma.createImage(figma.base64Decode(DATA.images[id].base64)).hash;
  }
  VARS = buildVariables();
  const textStyles = buildTextStyles();
  const effectStyles = buildEffectStyles();

  const dsPage = figma.createPage();
  dsPage.name = "Design system";
  await buildDesignSystem(dsPage, textStyles, effectStyles);

  let firstSitePage = null;
  for (const page of DATA.pages) {
    const fp = figma.createPage();
    fp.name = page.name;
    if (!firstSitePage) firstSitePage = fp;
    let x = 0;
    for (const v of page.variants) {
      const pad = 80;
      const gap = 40;
      const section = figma.createSection();
      fp.appendChild(section);
      section.name = v.name;
      section.x = x;
      section.y = 0;
      // Bind colors to the variables only where the mode is known to match the capture.
      let theme = v.theme;
      if (v.theme === "dark" && !(VARS && VARS.darkId && setMode(section, VARS.darkId)))
        theme = null;
      let y = pad;
      for (const seg of v.segments) {
        const f = figma.createFrame();
        section.appendChild(f);
        f.name = seg.name;
        f.resizeWithoutConstraints(v.width, Math.max(1, Math.round(seg.h)));
        f.x = pad;
        f.y = y;
        f.clipsContent = true;
        f.fills = v.background ? [solidPaint(v.background, theme)] : [];
        build(seg.nodes, f, theme);
        y += Math.round(seg.h) + gap;
      }
      section.resizeWithoutConstraints(v.width + pad * 2, y - gap + pad);
      x += v.width + pad * 2 + 160;
    }
    figma.notify("Built " + page.name, { timeout: 1200 });
  }

  await figma.setCurrentPageAsync(firstSitePage || dsPage);
  if (startEmpty && figma.root.children.length > 1) startPage.remove();
  figma.viewport.scrollAndZoomIntoView(figma.currentPage.children);

  const missing = Object.keys(FONTS.missing);
  let msg = "Done — " + stats.layers + " layers across " + DATA.pages.length + " pages.";
  if (stats.errors) msg += " " + stats.errors + " layers skipped (see console).";
  if (missing.length)
    msg += " Missing fonts (used " + FALLBACK_FAMILY + "): " + missing.join(", ") + ".";
  figma.closePlugin(msg);
}

run().catch((e) => {
  console.error(e);
  figma.closePlugin("Import failed: " + (e && e.message ? e.message : e));
});
