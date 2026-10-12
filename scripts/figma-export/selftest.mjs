// Dry-runs the generated plugin against a strict mock of the Figma Plugin API, so API
// misuse (unloaded fonts, malformed paints, bad sizes…) fails here instead of in Figma.
//   node scripts/figma-export/selftest.mjs [--free-plan]
import { readFileSync } from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const code = readFileSync(
  path.join(projectRoot, "figma-export/aangan-figma-plugin/code.js"),
  "utf8",
);
const FREE_PLAN = process.argv.includes("--free-plan");

const fail = (msg) => {
  throw new Error(msg);
};
const finite = (v, what) =>
  typeof v === "number" && Number.isFinite(v) ? v : fail(`${what} is not a finite number: ${v}`);
const unit = (v, what) => (finite(v, what) >= 0 && v <= 1 ? v : fail(`${what} out of 0–1: ${v}`));
const onlyKeys = (obj, keys, what) => {
  for (const k of Object.keys(obj)) if (!keys.includes(k)) fail(`${what}: unexpected key "${k}"`);
};
const rgb = (c, what) => {
  onlyKeys(c, ["r", "g", "b"], what);
  ["r", "g", "b"].forEach((k) => unit(c[k], `${what}.${k}`));
};
const rgba = (c, what) => {
  onlyKeys(c, ["r", "g", "b", "a"], what);
  ["r", "g", "b", "a"].forEach((k) => unit(c[k], `${what}.${k}`));
};
const transform = (t, what) => {
  if (
    !Array.isArray(t) ||
    t.length !== 2 ||
    t.some((row) => !Array.isArray(row) || row.length !== 3)
  )
    fail(`${what} must be a 2×3 matrix`);
  t.flat().forEach((v) => finite(v, what));
};

function validatePaint(p) {
  const base = ["type", "visible", "opacity", "blendMode", "boundVariables"];
  if (p.opacity !== undefined) unit(p.opacity, "paint.opacity");
  if (p.type === "SOLID") {
    onlyKeys(p, [...base, "color"], "SOLID paint");
    rgb(p.color, "SOLID color");
  } else if (p.type === "GRADIENT_LINEAR" || p.type === "GRADIENT_RADIAL") {
    onlyKeys(p, [...base, "gradientTransform", "gradientStops"], p.type);
    transform(p.gradientTransform, "gradientTransform");
    if (!p.gradientStops.length) fail("gradient without stops");
    p.gradientStops.forEach((s) => {
      onlyKeys(s, ["position", "color", "boundVariables"], "gradient stop");
      unit(s.position, "stop.position");
      rgba(s.color, "stop.color");
    });
  } else if (p.type === "IMAGE") {
    onlyKeys(
      p,
      [...base, "imageHash", "scaleMode", "imageTransform", "scalingFactor", "rotation", "filters"],
      "IMAGE paint",
    );
    if (typeof p.imageHash !== "string") fail("image paint without a hash");
    if (!["FILL", "FIT", "CROP", "TILE"].includes(p.scaleMode))
      fail(`bad scaleMode ${p.scaleMode}`);
    if (p.scaleMode === "CROP") transform(p.imageTransform, "imageTransform");
  } else fail(`unknown paint type ${p.type}`);
}
function validateEffect(e) {
  if (e.type === "DROP_SHADOW" || e.type === "INNER_SHADOW") {
    onlyKeys(
      e,
      [
        "type",
        "color",
        "offset",
        "radius",
        "spread",
        "visible",
        "blendMode",
        "showShadowBehindNode",
        "boundVariables",
      ],
      e.type,
    );
    rgba(e.color, "shadow color");
    finite(e.offset.x, "offset.x");
    finite(e.offset.y, "offset.y");
    if (finite(e.radius, "shadow radius") < 0) fail("negative shadow radius");
  } else if (e.type === "BACKGROUND_BLUR" || e.type === "LAYER_BLUR") {
    onlyKeys(e, ["type", "radius", "visible", "blurType", "boundVariables"], e.type);
    finite(e.radius, "blur radius");
  } else fail(`unknown effect ${e.type}`);
}

let ids = 0;
const loadedFonts = new Set();
const fontKey = (f) => `${f.family}|${f.style}`;
const requireFont = (f, what) => {
  if (!f || typeof f.family !== "string" || typeof f.style !== "string")
    fail(`${what}: bad FontName`);
  if (!loadedFonts.has(fontKey(f))) fail(`${what}: font not loaded ${fontKey(f)}`);
};
const counts = {};
const collections = new Map();

class BaseNode {
  constructor(type, container) {
    this.id = `${++ids}:1`;
    this.type = type;
    this.name = "";
    this.parent = null;
    if (container) this.children = [];
    counts[type] = (counts[type] || 0) + 1;
  }
  appendChild(child) {
    if (!this.children) fail(`${this.type} cannot have children`);
    if (child.type === "PAGE") fail("cannot append a page");
    if (this.type === "PAGE" || this.type === "SECTION" || this.type === "FRAME") {
      /* ok */
    } else fail(`appendChild on ${this.type}`);
    if (child.parent) child.parent.children.splice(child.parent.children.indexOf(child), 1);
    child.parent = this;
    this.children.push(child);
  }
  remove() {
    if (this === figma.currentPage) fail("cannot remove the current page");
    if (this.type === "PAGE") figma.root.children.splice(figma.root.children.indexOf(this), 1);
    else if (this.parent) this.parent.children.splice(this.parent.children.indexOf(this), 1);
  }
}
class SceneNode extends BaseNode {
  constructor(type, container) {
    super(type, container);
    this._x = 0;
    this._y = 0;
    this.width = 100;
    this.height = 100;
    this._fills = [];
    this._strokes = [];
    this._effects = [];
    this._opacity = 1;
  }
  set x(v) {
    this._x = finite(v, `${this.type}.x`);
  }
  get x() {
    return this._x;
  }
  set y(v) {
    this._y = finite(v, `${this.type}.y`);
  }
  get y() {
    return this._y;
  }
  set opacity(v) {
    this._opacity = unit(v, "opacity");
  }
  get opacity() {
    return this._opacity;
  }
  set fills(v) {
    v.forEach(validatePaint);
    this._fills = v;
  }
  get fills() {
    return this._fills;
  }
  set strokes(v) {
    v.forEach(validatePaint);
    this._strokes = v;
  }
  get strokes() {
    return this._strokes;
  }
  set effects(v) {
    v.forEach(validateEffect);
    this._effects = v;
  }
  get effects() {
    return this._effects;
  }
  resize(w, h) {
    if (finite(w, "width") < 0.01 || finite(h, "height") < 0.01)
      fail(`resize below 0.01: ${w}×${h}`);
    this.width = w;
    this.height = h;
  }
  resizeWithoutConstraints(w, h) {
    this.resize(w, h);
  }
  setExplicitVariableModeForCollection(collection, modeId) {
    if (typeof collection !== "object")
      fail("setExplicitVariableModeForCollection expects the collection object");
    if (!collection.modes.some((m) => m.modeId === modeId)) fail(`unknown mode ${modeId}`);
  }
  async setEffectStyleIdAsync(id) {
    if (!String(id).startsWith("S:")) fail("bad effect style id");
  }
}
for (const k of [
  "topLeftRadius",
  "topRightRadius",
  "bottomRightRadius",
  "bottomLeftRadius",
  "cornerRadius",
  "strokeWeight",
  "strokeTopWeight",
  "strokeRightWeight",
  "strokeBottomWeight",
  "strokeLeftWeight",
]) {
  Object.defineProperty(SceneNode.prototype, k, {
    set(v) {
      if (finite(v, k) < 0) fail(`${k} negative`);
      this[`_${k}`] = v;
    },
    get() {
      return this[`_${k}`] || 0;
    },
  });
}
Object.defineProperty(SceneNode.prototype, "strokeAlign", {
  set(v) {
    if (!["INSIDE", "OUTSIDE", "CENTER"].includes(v)) fail(`strokeAlign ${v}`);
  },
});
Object.defineProperty(SceneNode.prototype, "clipsContent", {
  set(v) {
    if (typeof v !== "boolean") fail("clipsContent not boolean");
  },
});

class TextNode extends SceneNode {
  constructor() {
    super("TEXT", false);
    this._font = { family: "Inter", style: "Regular" };
    this._chars = "";
    this.height = 20;
  }
  set fontName(f) {
    requireFont(f, "fontName");
    this._font = f;
  }
  get fontName() {
    return this._font;
  }
  set characters(s) {
    requireFont(this._font, "characters");
    if (typeof s !== "string") fail("characters must be a string");
    this._chars = s;
    this.height = 20 * s.split("\n").length;
  }
  get characters() {
    return this._chars;
  }
  set fontSize(v) {
    if (finite(v, "fontSize") < 1) fail("fontSize < 1");
  }
  set textAutoResize(v) {
    if (!["NONE", "WIDTH_AND_HEIGHT", "HEIGHT", "TRUNCATE"].includes(v))
      fail(`textAutoResize ${v}`);
  }
  set textAlignHorizontal(v) {
    if (!["LEFT", "CENTER", "RIGHT", "JUSTIFIED"].includes(v)) fail(`textAlignHorizontal ${v}`);
  }
  range(s, e, what) {
    if (!(Number.isInteger(s) && Number.isInteger(e) && s >= 0 && e <= this._chars.length && s < e))
      fail(`${what}: bad range ${s}-${e} of ${this._chars.length}`);
  }
  setRangeFontName(s, e, f) {
    this.range(s, e, "setRangeFontName");
    requireFont(f, "setRangeFontName");
  }
  setRangeFontSize(s, e, v) {
    this.range(s, e, "setRangeFontSize");
    if (finite(v, "size") < 1) fail("size < 1");
  }
  setRangeFills(s, e, v) {
    this.range(s, e, "setRangeFills");
    v.forEach(validatePaint);
  }
  setRangeLetterSpacing(s, e, v) {
    this.range(s, e, "letterSpacing");
    onlyKeys(v, ["value", "unit"], "letterSpacing");
    finite(v.value, "letterSpacing");
  }
  setRangeLineHeight(s, e, v) {
    this.range(s, e, "lineHeight");
    if (v.unit === "AUTO") onlyKeys(v, ["unit"], "lineHeight AUTO");
    else {
      onlyKeys(v, ["value", "unit"], "lineHeight");
      if (finite(v.value, "lineHeight") <= 0) fail("lineHeight <= 0");
    }
  }
  setRangeTextCase(s, e, v) {
    this.range(s, e, "textCase");
    if (!["ORIGINAL", "UPPER", "LOWER", "TITLE"].includes(v)) fail(`textCase ${v}`);
  }
  setRangeTextDecoration(s, e, v) {
    this.range(s, e, "decoration");
    if (!["NONE", "UNDERLINE", "STRIKETHROUGH"].includes(v)) fail(`decoration ${v}`);
  }
  async setTextStyleIdAsync(id) {
    if (!String(id).startsWith("S:")) fail("bad text style id");
  }
}

const fontList = [];
const addFamily = (family, styles) =>
  styles.forEach((style) => fontList.push({ fontName: { family, style } }));
const STD = [
  "Thin",
  "ExtraLight",
  "Light",
  "Regular",
  "Medium",
  "SemiBold",
  "Bold",
  "ExtraBold",
  "Black",
];
addFamily("Inter", [...STD, ...STD.map((s) => (s === "Regular" ? "Italic" : `${s} Italic`))]);
addFamily("Fraunces", [
  ...STD,
  ...STD.map((s) => (s === "Regular" ? "Italic" : `${s} Italic`)),
  "72pt Soft Light",
  "9pt Regular",
]);
addFamily("Instrument Sans", [
  "Regular",
  "Medium",
  "SemiBold",
  "Bold",
  "Italic",
  "Condensed Regular",
  "SemiCondensed Medium",
]);

const closed = {};
const closedPromise = new Promise((resolve) => (closed.resolve = resolve));
const root = { children: [], type: "DOCUMENT" };
const firstPage = new BaseNode("PAGE", true);
firstPage.name = "Page 1";
root.children.push(firstPage);

const figma = {
  root,
  currentPage: firstPage,
  async setCurrentPageAsync(p) {
    if (p.type !== "PAGE") fail("not a page");
    this.currentPage = p;
  },
  viewport: {
    scrollAndZoomIntoView(nodes) {
      if (!Array.isArray(nodes)) fail("scrollAndZoomIntoView expects an array");
    },
  },
  notify() {},
  closePlugin(msg) {
    closed.resolve(msg);
  },
  async listAvailableFontsAsync() {
    return fontList;
  },
  async loadFontAsync(f) {
    if (!fontList.some((x) => fontKey(x.fontName) === fontKey(f)))
      fail(`loadFontAsync: unknown font ${fontKey(f)}`);
    loadedFonts.add(fontKey(f));
  },
  base64Decode: (s) => new Uint8Array(Buffer.from(s, "base64")),
  createImage(bytes) {
    if (!(bytes instanceof Uint8Array) || bytes.length < 100) fail("createImage: bad bytes");
    return { hash: `hash${++ids}` };
  },
  createPage() {
    const p = new BaseNode("PAGE", true);
    root.children.push(p);
    return p;
  },
  createSection() {
    const s = new SceneNode("SECTION", true);
    this.currentPage.appendChild(s);
    return s;
  },
  createFrame() {
    const f = new SceneNode("FRAME", true);
    this.currentPage.appendChild(f);
    f._fills = [{ type: "SOLID", color: { r: 1, g: 1, b: 1 } }];
    return f;
  },
  createRectangle() {
    const r = new SceneNode("RECTANGLE", false);
    this.currentPage.appendChild(r);
    return r;
  },
  createText() {
    const t = new TextNode();
    this.currentPage.appendChild(t);
    return t;
  },
  createNodeFromSvg(svg) {
    if (!/^<svg[\s>]/.test(svg) || !svg.includes('xmlns="http://www.w3.org/2000/svg"'))
      fail("createNodeFromSvg: not an svg");
    if (/currentColor|NaN|undefined/.test(svg)) fail("createNodeFromSvg: unresolved value in svg");
    const opens = (svg.match(/<[a-z]/gi) || []).length;
    const closes = (svg.match(/<\/[a-z]|\/>/gi) || []).length;
    if (opens !== closes) fail(`createNodeFromSvg: unbalanced tags (${opens} vs ${closes})`);
    const f = new SceneNode("FRAME", true);
    this.currentPage.appendChild(f);
    return f;
  },
  createTextStyle() {
    const st = { id: `S:${++ids}`, name: "" };
    Object.defineProperty(st, "fontName", {
      set(f) {
        requireFont(f, "TextStyle.fontName");
      },
    });
    return st;
  },
  createEffectStyle() {
    const st = { id: `S:${++ids}`, name: "" };
    Object.defineProperty(st, "effects", {
      set(v) {
        v.forEach(validateEffect);
      },
    });
    return st;
  },
  variables: {
    createVariableCollection(name) {
      const c = {
        id: `VariableCollectionId:${++ids}`,
        name,
        modes: [{ modeId: "m1", name: "Mode 1" }],
        renameMode(id, n) {
          const m = this.modes.find((x) => x.modeId === id);
          if (!m) fail("renameMode: unknown");
          m.name = n;
        },
        addMode(n) {
          if (FREE_PLAN) fail("Limited to 1 modes only");
          const id = `m${this.modes.length + 1}`;
          this.modes.push({ modeId: id, name: n });
          return id;
        },
      };
      collections.set(c.id, c);
      return c;
    },
    createVariable(name, collection, type) {
      if (typeof collection !== "object") fail("createVariable expects the collection object");
      if (type !== "COLOR") fail("unexpected variable type");
      return {
        id: `VariableID:${++ids}`,
        name,
        setValueForMode(modeId, v) {
          if (!collection.modes.some((m) => m.modeId === modeId)) fail("unknown mode");
          rgba(v, "variable value");
        },
      };
    },
    setBoundVariableForPaint(paint, field, variable) {
      if (paint.type !== "SOLID" || field !== "color" || !variable.id) fail("bad bind");
      return { ...paint, boundVariables: { color: { type: "VARIABLE_ALIAS", id: variable.id } } };
    },
  },
};

const warnings = [];
const sandboxConsole = {
  log() {},
  warn: (...a) =>
    warnings.push(a.map((x) => (x instanceof Error ? x.message : String(x))).join(" ")),
  error: (...a) =>
    warnings.push(`ERROR ${a.map((x) => (x instanceof Error ? x.stack : String(x))).join(" ")}`),
};
const started = Date.now();
vm.runInNewContext(code, { figma, console: sandboxConsole, setTimeout });
const message = await Promise.race([
  closedPromise,
  new Promise((r) => setTimeout(() => r("TIMEOUT"), 120000)),
]);

console.log(`closePlugin: ${message}`);
console.log(`pages: ${root.children.map((p) => p.name).join(", ")}`);
console.log(`nodes: ${JSON.stringify(counts)}  (${Date.now() - started} ms)`);
if (warnings.length) {
  console.log(`warnings (${warnings.length}):`);
  [...new Set(warnings)].slice(0, 15).forEach((w) => console.log(`  - ${w}`));
}
const ok =
  /^Done/.test(message) &&
  !/skipped/.test(message) &&
  !warnings.some((w) => w.startsWith("ERROR") || w.startsWith("Layer failed"));
console.log(ok ? "SELFTEST PASSED" : "SELFTEST FAILED");
process.exit(ok ? 0 : 1);
