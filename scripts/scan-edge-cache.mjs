import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const cacheDir = "C:\\Users\\Ken\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Cache\\Cache_Data";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const HEX = /#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})\b/g;
const RGB = /rgba?\(\s*[\d.]+%?\s*[, ]\s*[\d.]+%?\s*[, ]\s*[\d.]+%?(?:\s*[,/]\s*[\d.]+%?)?\s*\)/gi;
const VAR = /--[a-zA-Z0-9-]*(?:color|bg|background|text|border|surface|fill|stroke|shadow|accent|brand)[a-zA-Z0-9-]*\s*:\s*[^;]+/gi;
const CSS_HINT = /(?:background-color|border-color|--[a-zA-Z0-9-]+)\s*:/i;

const files = readdirSync(cacheDir).filter((n) => n.startsWith("f_"));
const colors = new Map();
const vars = new Map();
const hits = [];

function addColor(raw, file, kind) {
  const key = raw.toLowerCase().replace(/\s+/g, "");
  if (!colors.has(key)) colors.set(key, { raw, kind, files: new Set(), count: 0 });
  const g = colors.get(key);
  g.count++;
  g.files.add(file);
}

for (const name of files) {
  const p = join(cacheDir, name);
  let buf;
  try {
    const st = statSync(p);
    if (st.size < 200 || st.size > 8_000_000) continue;
    buf = readFileSync(p);
  } catch {
    continue;
  }
  const ascii = buf.toString("latin1");
  const isCentral = /central\.arubanetworks|internal-ui|greenlake|grommet|hpe-theme|gravity/i.test(ascii);
  const isCss = CSS_HINT.test(ascii) || ascii.includes("{") && /color\s*:/.test(ascii);
  if (!isCentral && !isCss) continue;
  hits.push({ name, size: buf.length, isCentral, isCss: !!isCss });
  for (const m of ascii.match(HEX) || []) addColor(m, name, "hex");
  for (const m of ascii.match(RGB) || []) addColor(m, name, "rgb");
  for (const m of ascii.match(VAR) || []) {
    const s = m.slice(0, 160);
    vars.set(s, (vars.get(s) || 0) + 1);
  }
}

const out = {
  scannedFiles: files.length,
  matchingFiles: hits,
  colorCount: colors.size,
  colors: [...colors.values()]
    .map((c) => ({ raw: c.raw, kind: c.kind, count: c.count, files: [...c.files].slice(0, 6) }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 400),
  cssVars: [...vars.entries()].sort((a, b) => b[1] - a[1]).slice(0, 200),
};
mkdirSync(join(ROOT, "src", "tokens"), { recursive: true });
writeFileSync(join(ROOT, "src", "tokens", "cache-scan.json"), JSON.stringify(out, null, 2));
console.log("matchingFiles", hits.length, "colors", colors.size, "vars", vars.size);
console.log(hits.slice(0, 20));
