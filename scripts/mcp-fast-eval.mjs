import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const EDGE = "C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe";
const cli = "C:\\Users\\Ken\\AppData\\Local\\npm-cache\\_npx\\9833c18b2d85bc59\\node_modules\\@playwright\\mcp\\cli.js";

function startMcp() {
  const child = spawn(process.execPath, [cli, "--extension", "--browser", "msedge"], {
    env: {
      ...process.env,
      DEBUG: "pw:mcp:relay",
      PLAYWRIGHT_MCP_BROWSER: "msedge",
      PLAYWRIGHT_MCP_EXECUTABLE_PATH: EDGE,
    },
    stdio: ["pipe", "pipe", "pipe"],
    windowsHide: false,
  });
  child.stderr.on("data", (b) => process.stderr.write(b));
  return child;
}

function makeRpc(child) {
  let nextId = 1;
  let buf = "";
  const pending = new Map();
  child.stdout.setEncoding("utf8");
  child.stdout.on("data", (chunk) => {
    buf += chunk;
    for (;;) {
      const nl = buf.indexOf("\n");
      if (nl < 0) break;
      const line = buf.slice(0, nl).replace(/\r$/, "");
      buf = buf.slice(nl + 1);
      if (!line.trim()) continue;
      let msg;
      try { msg = JSON.parse(line); } catch { continue; }
      if (msg.id != null && pending.has(msg.id)) {
        const { resolve, reject } = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) reject(new Error(JSON.stringify(msg.error)));
        else resolve(msg.result);
      }
    }
  });
  return {
    send(method, params, timeoutMs = 60000) {
      const id = nextId++;
      const payload = JSON.stringify({ jsonrpc: "2.0", id, method, params }) + "\n";
      return new Promise((resolve, reject) => {
        pending.set(id, { resolve, reject });
        child.stdin.write(payload);
        setTimeout(() => {
          if (pending.has(id)) {
            pending.delete(id);
            reject(new Error("timeout " + method));
          }
        }, timeoutMs);
      });
    },
    note(method, params) {
      child.stdin.write(JSON.stringify({ jsonrpc: "2.0", method, params }) + "\n");
    },
  };
}

const FAST = `() => ({
  href: location.href,
  origin: location.origin,
  title: document.title,
  htmlClass: document.documentElement.className,
  bodyClass: document.body && document.body.className,
  dataTheme: document.documentElement.getAttribute("data-theme"),
  dataBsTheme: document.documentElement.getAttribute("data-bs-theme"),
  sheetCount: document.styleSheets.length,
  adopted: document.adoptedStyleSheets ? document.adoptedStyleSheets.length : 0,
  iframeCount: document.querySelectorAll("iframe").length,
  shadowHosts: [...document.querySelectorAll("*")].filter(e => e.shadowRoot).length,
  htmlBg: getComputedStyle(document.documentElement).backgroundColor,
  bodyBg: getComputedStyle(document.body).backgroundColor,
  bodyColor: getComputedStyle(document.body).color,
  htmlColor: getComputedStyle(document.documentElement).color,
  vars: (() => {
    const cs = getComputedStyle(document.documentElement);
    const out = {};
    for (let i = 0; i < cs.length; i++) {
      const n = cs[i];
      if (n.startsWith("--")) {
        const v = cs.getPropertyValue(n).trim();
        if (/#|rgb|hsl|oklch|color\\(/i.test(v) || n.match(/color|bg|surface|text|border|fill/i)) out[n] = v.slice(0, 80);
      }
    }
    return out;
  })()
})`;

async function main() {
  const child = startMcp();
  const rpc = makeRpc(child);
  try {
    await rpc.send("initialize", {
      protocolVersion: "2024-11-05",
      capabilities: {},
      clientInfo: { name: "central-dark-fast", version: "0.1.0" },
    });
    rpc.note("notifications/initialized");
    await rpc.send("tools/list", {});
    const result = await rpc.send("tools/call", {
      name: "browser_evaluate",
      arguments: { function: FAST },
    });
    const outDir = join(ROOT, "src", "tokens");
    mkdirSync(outDir, { recursive: true });
    writeFileSync(join(outDir, "fast-eval.json"), JSON.stringify(result, null, 2));
    process.stderr.write(JSON.stringify(result).slice(0, 4000) + "\n");
    process.stdout.write("WROTE fast-eval.json\n");
  } catch (e) {
    process.stderr.write("FAIL " + e + "\n");
    process.exitCode = 1;
  } finally {
    child.kill();
  }
}

await main();
