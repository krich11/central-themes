/**
 * One-off Playwright MCP stdio client for color discovery.
 * Not part of the extension implementation.
 */
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const TOKEN = process.env.PLAYWRIGHT_MCP_EXTENSION_TOKEN || "";
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";

function startMcp() {
  const env = {
    ...process.env,
    DEBUG: process.env.DEBUG || "pw:mcp:*",
    PLAYWRIGHT_MCP_BROWSER: "msedge",
    PLAYWRIGHT_MCP_EXECUTABLE_PATH: EDGE,
  };
  if (TOKEN) env.PLAYWRIGHT_MCP_EXTENSION_TOKEN = TOKEN;
  const cli = "C:\\Users\\Ken\\AppData\\Local\\npm-cache\\_npx\\9833c18b2d85bc59\\node_modules\\@playwright\\mcp\\cli.js";
  const child = spawn(process.execPath, [cli, "--extension", "--browser", "msedge"], {
    env,
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: false,
  });
  child.stderr.on("data", (buf) => process.stderr.write(buf));
  child.on("exit", (code, signal) => process.stderr.write(`mcp exit code=${code} signal=${signal}\n`));
  child.on("error", (err) => process.stderr.write(`mcp spawn error: ${err}\n`));
  return child;
}

function makeRpc(child) {
  let nextId = 1;
  let buf = "";
  const pending = new Map();
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buf += chunk;
    process.stderr.write(`stdout+ ${JSON.stringify(chunk).slice(0, 400)}\n`);
    for (;;) {
      const nl = buf.indexOf("\n");
      if (nl < 0) break;
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      let msg;
      try {
        msg = JSON.parse(line);
      } catch (e) {
        process.stderr.write(`bad json line: ${line.slice(0, 200)}\n`);
        continue;
      }
      if (msg.id != null && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      } else if (msg.method) {
        process.stderr.write(`NOTIFY ${msg.method}\n`);
      }
    }
  });
  function send(method, params) {
    const id = nextId++;
    const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
    return new Promise((resolve, reject) => {
      pending.set(id, { resolve, reject });
      child.stdin.write(payload);
      setTimeout(() => {
        if (pending.has(id)) {
          pending.delete(id);
          reject(new Error(`timeout waiting for ${method}`));
        }
      }, method === "tools/call" ? 120000 : 45000);
    });
  }
  return { send };
}

const COLOR_FN = `() => {
  const COLOR_PROPS = [
    "color","background","background-color","border-color","border-top-color",
    "border-right-color","border-bottom-color","border-left-color","outline-color",
    "fill","stroke","box-shadow","text-shadow","caret-color","column-rule-color",
    "border-block-start-color","border-block-end-color","border-inline-start-color",
    "border-inline-end-color","accent-color","text-decoration-color"
  ];
  const NAMED = {
    black:"#000000",white:"#ffffff",red:"#ff0000",green:"#008000",blue:"#0000ff",
    aqua:"#00ffff",fuchsia:"#ff00ff",gray:"#808080",grey:"#808080",lime:"#00ff00",
    maroon:"#800000",navy:"#000080",olive:"#808000",purple:"#800080",silver:"#c0c0c0",
    teal:"#008080",orange:"#ffa500",transparent:"#00000000"
  };
  function clamp(n){ return Math.max(0, Math.min(255, n|0)); }
  function toHex(r,g,b,a){
    const hr = clamp(r).toString(16).padStart(2,"0");
    const hg = clamp(g).toString(16).padStart(2,"0");
    const hb = clamp(b).toString(16).padStart(2,"0");
    if (a == null || a >= 0.999) return "#"+hr+hg+hb;
    const ha = clamp(Math.round(a*255)).toString(16).padStart(2,"0");
    return "#"+hr+hg+hb+ha;
  }
  function parseColor(input){
    if (!input) return null;
    let s = String(input).trim().toLowerCase();
    if (!s || s === "none" || s === "inherit" || s === "initial" || s === "unset" || s === "currentcolor") return null;
    if (NAMED[s]) {
      const hex = NAMED[s];
      return { hex: hex.length===9?hex.slice(0,7):hex, alpha: hex.length===9?parseInt(hex.slice(7,9),16)/255:1, raw: input };
    }
    if (s === "transparent") return { hex:"#000000", alpha:0, raw:input };
    const hexm = s.match(/^#([0-9a-f]{3,8})$/);
    if (hexm) {
      let h = hexm[1];
      if (h.length===3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
      if (h.length===4) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];
      const hex = "#"+h.slice(0,6);
      const alpha = h.length>=8 ? parseInt(h.slice(6,8),16)/255 : 1;
      return { hex, alpha, raw:input };
    }
    const rgb = s.match(/^rgba?\\(([^)]+)\\)$/);
    if (rgb) {
      const p = rgb[1].split(/[,\\/\\s]+/).filter(Boolean);
      const r = p[0].includes("%") ? parseFloat(p[0])*2.55 : parseFloat(p[0]);
      const g = p[1].includes("%") ? parseFloat(p[1])*2.55 : parseFloat(p[1]);
      const b = p[2].includes("%") ? parseFloat(p[2])*2.55 : parseFloat(p[2]);
      const a = p[3]==null ? 1 : parseFloat(p[3]);
      return { hex: toHex(r,g,b,1), alpha: isNaN(a)?1:a, raw:input };
    }
    const hsl = s.match(/^hsla?\\(([^)]+)\\)$/);
    if (hsl) return { hex: null, alpha:1, raw:input, unparsed:s };
    return { hex:null, alpha:1, raw:input, unparsed:s };
  }
  function roleOf(prop){
    if (prop==="color"||prop==="caret-color"||prop==="text-decoration-color") return "text";
    if (prop.includes("background")) return "background";
    if (prop.includes("border")||prop==="outline-color"||prop==="column-rule-color") return "border";
    if (prop.includes("shadow")) return "shadow";
    if (prop==="fill") return "fill";
    if (prop==="stroke") return "stroke";
    if (prop==="accent-color") return "accent";
    return "other";
  }
  const groups = new Map();
  function add(parsed, role, selector, source){
    if (!parsed) return;
    const key = (parsed.hex||parsed.unparsed||parsed.raw) + "|a:" + (Math.round((parsed.alpha??1)*1000)/1000);
    if (!groups.has(key)) {
      groups.set(key, {
        hex: parsed.hex, alpha: parsed.alpha??1, rawSamples: new Set(),
        roles: {}, count:0, selectors: new Set(), sources: new Set()
      });
    }
    const g = groups.get(key);
    g.count++;
    g.roles[role] = (g.roles[role]||0)+1;
    if (parsed.raw) g.rawSamples.add(String(parsed.raw).slice(0,80));
    if (selector) g.selectors.add(String(selector).slice(0,120));
    g.sources.add(source);
  }
  const architecture = {
    href: location.href, origin: location.origin, title: document.title,
    readyState: document.readyState,
    stylesheetCount: document.styleSheets.length,
    constructedSheetCount: document.adoptedStyleSheets ? document.adoptedStyleSheets.length : 0,
    iframeCount: document.querySelectorAll("iframe").length,
    shadowHostCount: 0,
    darkModeHints: [],
    cssVarColors: [],
    cssomReadable: 0, cssomBlocked: 0, cssomRules: 0,
    inlineStyled: 0, computedFallback: false
  };
  const html = document.documentElement;
  architecture.darkModeHints = [
    html.className, document.body && document.body.className, html.getAttribute("data-theme"),
    html.getAttribute("data-color-mode"), html.getAttribute("data-bs-theme")
  ].filter(Boolean);
  architecture.shadowHostCount = [...document.querySelectorAll("*")].filter(el => el.shadowRoot).length;
  function harvestVars(el, sel){
    const cs = getComputedStyle(el);
    for (let i=0;i<cs.length;i++){
      const n = cs[i];
      if (!n.startsWith("--")) continue;
      const v = cs.getPropertyValue(n).trim();
      if (!v) continue;
      const p = parseColor(v);
      if (p && (p.hex || /rgb|hsl|#/.test(v))) {
        architecture.cssVarColors.push({ name:n, value:v.slice(0,80), hex:p.hex, alpha:p.alpha });
        add(p, "token", sel+" "+n, "css-variable");
      }
    }
  }
  harvestVars(html, ":root");
  harvestVars(document.body, "body");
  function walkRules(rules, href){
    if (!rules) return;
    for (const rule of rules) {
      try {
        if (rule.cssRules) { walkRules(rule.cssRules, href); continue; }
        if (!rule.style) continue;
        architecture.cssomRules++;
        const sel = rule.selectorText || href || "<rule>";
        for (const prop of COLOR_PROPS) {
          const val = rule.style.getPropertyValue(prop);
          if (!val) continue;
          add(parseColor(val), roleOf(prop), sel, "cssom");
        }
      } catch(e) { architecture.cssomBlocked++; }
    }
  }
  const sheets = [...document.styleSheets];
  if (document.adoptedStyleSheets) sheets.push(...document.adoptedStyleSheets);
  for (const sheet of sheets) {
    try {
      walkRules(sheet.cssRules, sheet.href||"<inline/constructed>");
      architecture.cssomReadable++;
    } catch(e) {
      architecture.cssomBlocked++;
    }
  }
  const inlineEls = document.querySelectorAll("[style]");
  architecture.inlineStyled = inlineEls.length;
  inlineEls.forEach((el, i) => {
    if (i>400) return;
    const st = el.style;
    for (const prop of COLOR_PROPS) {
      const val = st.getPropertyValue(prop);
      if (!val) continue;
      add(parseColor(val), roleOf(prop), el.tagName.toLowerCase()+(el.className?("."+String(el.className).trim().split(/\\s+/).slice(0,3).join(".")):"")+"[style]", "inline");
    }
  });
  const sameOriginFrames = [];
  for (const iframe of document.querySelectorAll("iframe")) {
    try {
      const doc = iframe.contentDocument;
      if (!doc) continue;
      sameOriginFrames.push(iframe.src||iframe.id||"<iframe>");
      for (const sheet of doc.styleSheets) {
        try { walkRules(sheet.cssRules, sheet.href||"<iframe>"); } catch(e) {}
      }
    } catch(e) {}
  }
  architecture.sameOriginFrames = sameOriginFrames;
  if (architecture.cssomReadable === 0 || groups.size < 8) {
    architecture.computedFallback = true;
    const els = [...document.querySelectorAll("body, body *")].slice(0, 2500);
    for (const el of els) {
      const cs = getComputedStyle(el);
      const sel = el.tagName.toLowerCase() + (el.id?("#"+el.id):"") + (el.className && typeof el.className==="string"?("."+el.className.trim().split(/\\s+/).slice(0,2).join(".")) : "");
      for (const prop of ["color","background-color","border-top-color","outline-color","fill","stroke","caret-color"]) {
        add(parseColor(cs.getPropertyValue(prop)), roleOf(prop), sel, "computed");
      }
      const sh = cs.boxShadow;
      if (sh && sh !== "none") add(parseColor(sh.match(/rgba?\\([^)]+\\)|#[0-9a-f]+/i)?.[0]), "shadow", sel, "computed");
    }
  }
  const out = [];
  for (const [key,g] of groups) {
    out.push({
      key, hex:g.hex, alpha:g.alpha,
      roles:g.roles, count:g.count,
      selectors:[...g.selectors].slice(0,8),
      rawSamples:[...g.rawSamples].slice(0,6),
      sources:[...g.sources]
    });
  }
  out.sort((a,b)=>b.count-a.count);
  return { architecture, groupCount: out.length, groups: out };
}`;

async function main() {
  const child = startMcp();
  const rpc = makeRpc(child);
  try {
    await rpc.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "central-dark-discover", version: "0.1.0" },
    });
    const initialized = JSON.stringify({ jsonrpc: "2.0", method: "notifications/initialized" }) + "\n";
    child.stdin.write(initialized);
    const tools = await rpc.send("tools/list", {});
    process.stderr.write(`tools: ${(tools.tools || []).map((t) => t.name).join(", ")}\n`);
    let evalResult;
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        evalResult = await rpc.send("tools/call", {
          name: "browser_evaluate",
          arguments: { function: COLOR_FN },
        });
        const text = evalResult?.content?.[0]?.text || "";
        if (evalResult?.isError || text.startsWith("### Error")) {
          process.stderr.write(`eval attempt ${attempt} error: ${text.slice(0, 400)}\n`);
          if (attempt === 3) break;
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }
        break;
      } catch (e) {
        process.stderr.write(`eval attempt ${attempt} throw: ${e}\n`);
        if (attempt === 3) throw e;
        await new Promise((r) => setTimeout(r, 2000));
      }
    }
    const outDir = join(ROOT, "src", "tokens");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "mcp-raw-eval.json"), JSON.stringify(evalResult, null, 2));
    process.stdout.write("WROTE src/tokens/mcp-raw-eval.json\n");
  } catch (err) {
    process.stderr.write(`FAIL: ${err?.stack || err}\n`);
    process.exitCode = 1;
  } finally {
    child.kill();
  }
}

await main();
