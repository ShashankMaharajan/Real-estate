// Renders captured layer data back to HTML with the same interpretation the Figma plugin
// uses (absolute frames, text runs, image crops, gradients), so the capture can be checked
// against the real site before opening Figma.

const rgba = (c) =>
  c
    ? `rgba(${Math.round(c.r * 255)},${Math.round(c.g * 255)},${Math.round(c.b * 255)},${c.a})`
    : "transparent";
const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const stops = (list) => list.map((s) => `${rgba(s.color)} ${(s.pos * 100).toFixed(2)}%`).join(", ");

function backgrounds(fills) {
  // Figma order is bottom → top; CSS lists the top layer first.
  return [...fills]
    .reverse()
    .map((f) => {
      if (f.type === "solid") return `linear-gradient(${rgba(f.color)}, ${rgba(f.color)})`;
      if (f.type === "linear") return `linear-gradient(${f.angle}deg, ${stops(f.stops)})`;
      return `radial-gradient(${f.rx * 100}% ${f.ry * 100}% at ${f.cx * 100}% ${f.cy * 100}%, ${stops(f.stops)})`;
    })
    .join(", ");
}

/** Same crop maths as the plugin's IMAGE paint: object-fit cover/contain plus object-position. */
export function imageCrop(n, image) {
  const iw = image.width;
  const ih = image.height;
  const s = n.fit === "contain" ? Math.min(n.w / iw, n.h / ih) : Math.max(n.w / iw, n.h / ih);
  const dw = iw * s;
  const dh = ih * s;
  const ox = (n.w - dw) * n.position[0];
  const oy = (n.h - dh) * n.position[1];
  return { dw, dh, ox, oy };
}

function node(n, images) {
  const base = `position:absolute;left:${n.x}px;top:${n.y}px;opacity:${n.opacity ?? 1};`;
  if (n.t === "frame") {
    const radius = n.radius.map((r) => `${r}px`).join(" ");
    const shadows = (n.effects || [])
      .filter((e) => e.type !== "bgblur")
      .map(
        (e) =>
          `${e.type === "inner" ? "inset " : ""}${e.x}px ${e.y}px ${e.blur}px ${e.spread}px ${rgba(e.color)}`,
      )
      .join(", ");
    const blur = (n.effects || []).find((e) => e.type === "bgblur");
    const s = n.stroke;
    const border = s
      ? `border-style:solid;border-color:${rgba(s.color)};border-width:${s.top}px ${s.right}px ${s.bottom}px ${s.left}px;`
      : "";
    const style =
      `${base}width:${n.w}px;height:${n.h}px;box-sizing:border-box;border-radius:${radius};${border}` +
      (n.fills.length ? `background:${backgrounds(n.fills)};` : "") +
      (shadows ? `box-shadow:${shadows};` : "") +
      (blur ? `backdrop-filter:blur(${blur.radius}px);` : "") +
      (n.clip ? "overflow:hidden;" : "");
    // Children are positioned from the frame's outer edge, like Figma (not the padding box).
    return `<div title="${esc(n.name)}" style="${style}"><div style="position:absolute;left:${-(s ? s.left : 0)}px;top:${-(s ? s.top : 0)}px">${(n.children || []).map((c) => node(c, images)).join("")}</div></div>`;
  }
  if (n.t === "text") {
    const spans = n.runs
      .map((r) => {
        const text = n.chars.slice(r.start, r.end);
        const tt =
          { UPPER: "uppercase", LOWER: "lowercase", TITLE: "capitalize" }[r.textCase] || "none";
        return `<span style="font-family:'${r.family}';font-weight:${r.weight};font-style:${r.italic ? "italic" : "normal"};font-size:${r.size}px;color:${rgba(r.color)};line-height:${r.lineHeight ? `${r.lineHeight}px` : "normal"};letter-spacing:${r.letterSpacing}px;text-transform:${tt}">${esc(text)}</span>`;
      })
      .join("");
    const lh = n.runs[0].lineHeight ? `${n.runs[0].lineHeight}px` : "normal";
    const width = n.autoWidth ? "white-space:pre;" : `width:${n.w}px;white-space:pre-wrap;`;
    // Match the container font to the first run so the CSS strut does not stretch line boxes
    // (Figma has no strut).
    const r0 = n.runs[0];
    const font = `font-family:'${r0.family}';font-size:${r0.size}px;font-weight:${r0.weight};`;
    return `<div style="${base}${width}${font}line-height:${lh};text-align:${n.align.toLowerCase()}">${spans}</div>`;
  }
  if (n.t === "image") {
    const img = images[n.image];
    const { dw, dh, ox, oy } = imageCrop(n, img);
    const radius = n.radius.map((r) => `${r}px`).join(" ");
    return `<div style="${base}width:${n.w}px;height:${n.h}px;border-radius:${radius};background:url(data:${img.mime};base64,${img.base64}) ${ox}px ${oy}px / ${dw}px ${dh}px no-repeat"></div>`;
  }
  if (n.t === "svg")
    return `<div style="${base}width:${n.w}px;height:${n.h}px;line-height:0">${n.svg}</div>`;
  return "";
}

export function renderPreview(variant, images) {
  const gap = 24;
  let y = 0;
  const segs = variant.segments
    .map((s) => {
      const html = `<div style="position:absolute;left:0;top:${y}px;width:${variant.width}px;height:${s.h}px;overflow:hidden;background:${rgba(variant.background)}">${s.nodes.map((n) => node(n, images)).join("")}</div>`;
      y += s.h + gap;
      return html;
    })
    .join("");
  return `<!doctype html><meta charset="utf-8"><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght,SOFT@0,9..144,300..600,50;1,9..144,300..600,50&family=Instrument+Sans:wght@400..700&display=swap"><style>body{margin:0;background:#777}</style><div style="position:relative;width:${variant.width}px;height:${y}px">${segs}</div>`;
}
