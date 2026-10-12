// Captures every page of the running site and packages it as a Figma plugin that
// rebuilds the design as editable layers.
//
//   npm run dev                 (in another terminal)
//   npm run figma:export        → figma-export/aangan-figma-plugin/  (+ .zip)
//
// Options (env): BASE_URL (default http://localhost:8080), BROWSER_PATH (Chrome/Edge).
// Flags: --preview  also writes figma-export/preview/*.html to check the capture.
import { spawn } from "node:child_process";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { renderPreview } from "./preview.mjs";

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, "../..");
const BASE = (process.env.BASE_URL || "http://localhost:8080").replace(/\/$/, "");
const OUT = path.join(root, "figma-export");

const PAGES = [
  { name: "Home", path: "/" },
  { name: "Properties", path: "/properties" },
  { name: "Property detail", path: "/properties/bhaisepati-family-home" },
  { name: "About", path: "/about" },
  { name: "Services", path: "/services" },
  { name: "Contact", path: "/contact" },
  { name: "404", path: "/this-page-does-not-exist" },
];
const VARIANTS = [
  { name: "Desktop · Light", width: 1440, height: 900, theme: "light", mobile: false },
  { name: "Desktop · Dark", width: 1440, height: 900, theme: "dark", mobile: false },
  { name: "Mobile · Light", width: 390, height: 844, theme: "light", mobile: true },
];

function findBrowser() {
  const candidates = [
    process.env.BROWSER_PATH,
    "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
    "C:/Program Files/Google/Chrome/Application/chrome.exe",
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium",
  ].filter(Boolean);
  const found = candidates.find((p) => existsSync(p));
  if (!found) throw new Error("No Chrome or Edge found. Set BROWSER_PATH to a Chromium browser.");
  return found;
}

/** Minimal Chrome DevTools Protocol client over the browser's WebSocket (flattened sessions). */
class Cdp {
  constructor(ws) {
    this.ws = ws;
    this.nextId = 0;
    this.pending = new Map();
    this.waiters = [];
    ws.addEventListener("message", (e) => {
      const msg = JSON.parse(e.data);
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} ${msg.error.data || ""}`));
        else resolve(msg.result);
        return;
      }
      this.waiters = this.waiters.filter((w) => {
        if (w.method !== msg.method || w.sessionId !== msg.sessionId) return true;
        w.resolve(msg.params);
        return false;
      });
    });
  }
  send(method, params = {}, sessionId) {
    const id = ++this.nextId;
    this.ws.send(JSON.stringify({ id, method, params, sessionId }));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }
  once(method, sessionId, timeoutMs = 45000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error(`Timed out waiting for ${method}`)),
        timeoutMs,
      );
      this.waiters.push({ method, sessionId, resolve: (p) => (clearTimeout(timer), resolve(p)) });
    });
  }
}

async function launch() {
  const profile = mkdtempSync(path.join(tmpdir(), "aangan-figma-"));
  const proc = spawn(
    findBrowser(),
    [
      "--headless=new",
      "--disable-gpu",
      "--no-first-run",
      "--hide-scrollbars",
      "--remote-debugging-port=0",
      `--user-data-dir=${profile}`,
      "about:blank",
    ],
    { stdio: ["ignore", "ignore", "pipe"] },
  );
  const wsUrl = await new Promise((resolve, reject) => {
    let buf = "";
    const timer = setTimeout(() => reject(new Error("Browser did not start")), 30000);
    proc.stderr.on("data", (d) => {
      buf += d;
      const m = buf.match(/DevTools listening on (ws:\/\/\S+)/);
      if (m) {
        clearTimeout(timer);
        resolve(m[1]);
      }
    });
  });
  const ws = new WebSocket(wsUrl);
  await new Promise((resolve, reject) => {
    ws.addEventListener("open", resolve, { once: true });
    ws.addEventListener("error", reject, { once: true });
  });
  const close = () => {
    ws.close();
    proc.kill();
    setTimeout(() => rmSync(profile, { recursive: true, force: true }), 1000);
  };
  return { cdp: new Cdp(ws), close };
}

const withTimeout = (promise, ms, what) =>
  Promise.race([
    promise,
    new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out ${what}`)), ms)),
  ]);

async function captureWithRetry(cdp, url, variant, extractSource) {
  try {
    return await capture(cdp, url, variant, extractSource);
  } catch (e) {
    process.stdout.write(`(retrying: ${e.message}) `);
    return capture(cdp, url, variant, extractSource);
  }
}

async function capture(cdp, url, variant, extractSource) {
  const { targetId } = await cdp.send("Target.createTarget", { url: "about:blank" });
  const { sessionId } = await cdp.send("Target.attachToTarget", { targetId, flatten: true });
  try {
    await cdp.send("Page.enable", {}, sessionId);
    // Background tabs are throttled (timers, rAF); keep the one being captured in front.
    await cdp.send("Page.bringToFront", {}, sessionId);
    await cdp.send(
      "Emulation.setDeviceMetricsOverride",
      {
        width: variant.width,
        height: variant.height,
        deviceScaleFactor: 1,
        mobile: variant.mobile,
      },
      sessionId,
    );
    await cdp.send("Emulation.setTouchEmulationEnabled", { enabled: variant.mobile }, sessionId);
    await cdp.send(
      "Emulation.setEmulatedMedia",
      { features: [{ name: "prefers-color-scheme", value: variant.theme }] },
      sessionId,
    );
    const loaded = cdp.once("Page.loadEventFired", sessionId);
    await cdp.send("Page.navigate", { url }, sessionId);
    await loaded;
    await new Promise((r) => setTimeout(r, 600)); // let React hydrate
    const { result, exceptionDetails } = await withTimeout(
      cdp.send(
        "Runtime.evaluate",
        {
          expression: `${extractSource}\naanganExtract()`,
          awaitPromise: true,
          returnByValue: true,
        },
        sessionId,
      ),
      60000,
      `extracting ${url}`,
    );
    if (exceptionDetails)
      throw new Error(exceptionDetails.exception?.description || exceptionDetails.text);
    return result.value;
  } finally {
    await cdp.send("Target.closeTarget", { targetId }).catch(() => {});
  }
}

/** Replace image URLs with ids and embed each unique image once. */
async function collectImages(pages) {
  const images = {};
  const ids = new Map();
  const visit = async (nodes) => {
    for (const n of nodes) {
      if (n.t === "image") {
        if (!ids.has(n.src)) {
          const res = await fetch(n.src);
          if (!res.ok) throw new Error(`Could not fetch ${n.src}: ${res.status}`);
          const id = `img${ids.size + 1}`;
          ids.set(n.src, id);
          images[id] = {
            base64: Buffer.from(await res.arrayBuffer()).toString("base64"),
            mime: res.headers.get("content-type") || "image/jpeg",
            width: n.natural.w,
            height: n.natural.h,
          };
        }
        n.image = ids.get(n.src);
        delete n.src;
      }
      if (n.children) await visit(n.children);
    }
  };
  for (const page of pages)
    for (const v of page.variants) for (const s of v.segments) await visit(s.nodes);
  return images;
}

const countNodes = (nodes) =>
  nodes.reduce((n, x) => n + 1 + (x.children ? countNodes(x.children) : 0), 0);

async function main() {
  const res = await fetch(BASE).catch(() => null);
  if (!res)
    throw new Error(`Nothing is running at ${BASE}. Start the site with "npm run dev" first.`);
  const extractSource = readFileSync(path.join(here, "extract.js"), "utf8");
  const { cdp, close } = await launch();
  const pages = [];
  let tokens = {};
  let elevation = {};
  const typeSamples = {};
  try {
    for (const page of PAGES) {
      const variants = [];
      for (const variant of VARIANTS) {
        process.stdout.write(`Capturing ${page.name} · ${variant.name}… `);
        const data = await captureWithRetry(cdp, BASE + page.path, variant, extractSource);
        const layers = data.segments.reduce((n, s) => n + countNodes(s.nodes), 0);
        console.log(`${data.segments.length} segments, ${layers} layers`);
        variants.push({
          ...variant,
          background: data.background,
          pageHeight: data.height,
          segments: data.segments,
        });
        if (!variant.mobile) {
          tokens[variant.theme] = tokens[variant.theme] || data.tokens;
          elevation[variant.theme] = elevation[variant.theme] || data.elevation;
        }
        if (variant.theme === "light" && !variant.mobile) {
          for (const [k, v] of Object.entries(data.typeSamples))
            typeSamples[k] = typeSamples[k] || v;
        }
      }
      pages.push({ name: page.name, path: page.path, variants });
    }
  } finally {
    close();
  }

  const images = await collectImages(pages);
  const design = {
    name: "Aangan Real Estate",
    source: BASE,
    generatedAt: new Date().toISOString(),
    tokens,
    elevation,
    typeSamples,
    images,
    pages,
  };

  mkdirSync(OUT, { recursive: true });
  const pluginDir = path.join(OUT, "aangan-figma-plugin");
  mkdirSync(pluginDir, { recursive: true });
  writeFileSync(
    path.join(pluginDir, "manifest.json"),
    JSON.stringify(
      {
        name: "Aangan — build website design",
        id: "aangan-website-design-import",
        api: "1.0.0",
        main: "code.js",
        editorType: ["figma"],
        documentAccess: "dynamic-page",
      },
      null,
      2,
    ),
  );
  const runtime = readFileSync(path.join(here, "plugin.js"), "utf8");
  writeFileSync(
    path.join(pluginDir, "code.js"),
    `const DATA = ${JSON.stringify(design)};\n${runtime}`,
  );
  writeFileSync(path.join(OUT, "design.json"), JSON.stringify(design));
  writeFileSync(
    path.join(pluginDir, "README.txt"),
    readFileSync(path.join(here, "HOW-TO-OPEN.txt"), "utf8"),
  );
  if (process.argv.includes("--preview")) {
    const previewDir = path.join(OUT, "preview");
    mkdirSync(previewDir, { recursive: true });
    for (const page of pages)
      for (const v of page.variants)
        writeFileSync(
          path.join(previewDir, `${page.name}--${v.name}.html`.replace(/[^\w.-]+/g, "_")),
          renderPreview(v, images),
        );
  }
  const total = pages.reduce(
    (n, p) =>
      n +
      p.variants.reduce((m, v) => m + v.segments.reduce((k, s) => k + countNodes(s.nodes), 0), 0),
    0,
  );
  console.log(
    `\nDone: ${pages.length} pages × ${VARIANTS.length} variants, ${total} layers, ${Object.keys(images).length} images.`,
  );
  console.log(`Plugin: ${pluginDir}`);
}

main().catch((e) => {
  console.error(e.message || e);
  process.exit(1);
});
