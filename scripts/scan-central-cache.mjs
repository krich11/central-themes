import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const roots = [
  "C:\\Users\\Ken\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Cache\\Cache_Data",
  "C:\\Users\\Ken\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Code Cache\\js",
  "C:\\Users\\Ken\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Service Worker\\CacheStorage",
];
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const NEEDLE = /internal-ui\.central\.arubanetworks|gravity\/monitoring|aruba.?central|hpe-theme|grommet/i;

function walk(dir, acc = []) {
  let entries;
  try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return acc; }
  for (const e of entries) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, acc);
    else acc.push(p);
  }
  return acc;
}

const files = [];
for (const r of roots) files.push(...walk(r));

const centralFiles = [];
for (const p of files) {
  let st;
  try { st = statSync(p); } catch { continue; }
  if (st.size < 100 || st.size > 12_000_000) continue;
  let buf;
  try { buf = readFileSync(p); } catch { continue; }
  const ascii = buf.toString("latin1");
  if (!NEEDLE.test(ascii)) continue;
  centralFiles.push({ path: p, size: st.size, ascii });
}

console.log("central-related files", centralFiles.length);
for (const f of centralFiles.slice(0, 30)) console.log(f.size, f.path.slice(-80));

const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB = /rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?(?:\s*[,/]\s*[\d.]+%?)?\s*\)/gi;
const VARDECL = /(--[A-Za-z0-9-]+)\s*:\s*([^;}]{1,80})/g;

const colors = new Map();
const vars = new Map();
function add(raw, kind) {
  const key = String(raw).toLowerCase().replace(/\s+/g, "");
  if (!colors.has(key)) colors.set(key, { raw, kind, count: 0 });
  colors.get(key).count++;
}

for (const f of centralFiles) {
  const ascii = f.ascii;
  for (const m of ascii.match(HEX) || []) add(m, "hex");
  for (const m of ascii.match(RGB) || []) add(m, "rgb");
  let vm;
  VARDECL.lastIndex = 0;
  while ((vm = VARDECL.exec(ascii))) {
    const name = vm[1];
    const val = vm[2].trim();
    if (!/(color|bg|background|text|border|surface|fill|stroke|shadow|accent|brand|grey|gray|blue|green|red|orange|yellow)/i.test(name) && !/#|rgb|hsl/.test(val)) continue;
    const k = name + ":" + val;
    vars.set(k, (vars.get(k) || 0) + 1);
  }
}

const out = {
  source: "Edge disk cache files matching Aruba Central / gravity",
  fileCount: centralFiles.length,
  files: centralFiles.map((f) => ({ path: f.path, size: f.size })),
  colorCount: colors.size,
  colors: [...colors.values()].sort((a, b) => b.count - a.count).slice(0, 500),
  cssVars: [...vars.entries()].sort((a, b) => b[1] - a[1]).slice(0, 300),
};
mkdirSync(join(ROOT, "src", "tokens"), { recursive: true });
writeFileSync(join(ROOT, "src", "tokens", "central-cache-colors.json"), JSON.stringify(out, null, 2));
console.log("colors", colors.size, "vars", vars.size);
