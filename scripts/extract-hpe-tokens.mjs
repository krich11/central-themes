import { readdirSync, readFileSync, writeFileSync, mkdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const dir = "C:\\Users\\Ken\\AppData\\Local\\Microsoft\\Edge\\User Data\\Default\\Cache\\Cache_Data";
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const files = readdirSync(dir).filter((n) => n.startsWith("f_"));

const tokenRe = /(--hpe-[a-zA-Z0-9-]+)\s*:\s*([^;,}{]{1,120})/g;
const hexInJs = /(?:background|color|border|fill|stroke)\s*:\s*["']?(#[0-9A-Fa-f]{3,8}|rgba?\([^)]+\))["']?/g;
const grommetLightDark = /(?:light|dark)\s*:\s*["'](#[0-9A-Fa-f]{3,8}|rgb[^"']+)["']/g;

const tokens = new Map();
const grommet = new Map();
const styled = new Map();

function add(map, k, v, file) {
  const key = k + "=>" + v;
  if (!map.has(key)) map.set(key, { name: k, value: v, count: 0, files: new Set() });
  const g = map.get(key);
  g.count++;
  g.files.add(file);
}

for (const name of files) {
  const p = join(dir, name);
  let st;
  try { st = statSync(p); } catch { continue; }
  if (st.size > 12_000_000) continue;
  let s;
  try { s = readFileSync(p, "latin1"); } catch { continue; }
  if (!/grommet|hpe-design|--hpe-|internal-ui|greenlake/i.test(s)) continue;
  tokenRe.lastIndex = 0;
  let m;
  while ((m = tokenRe.exec(s))) add(tokens, m[1], m[2].trim(), name);
  hexInJs.lastIndex = 0;
  while ((m = hexInJs.exec(s))) add(styled, m[0].slice(0, 80), m[1], name);
  grommetLightDark.lastIndex = 0;
  while ((m = grommetLightDark.exec(s))) add(grommet, m[0], m[1], name);
}

function dump(map) {
  return [...map.values()]
    .map((x) => ({ name: x.name, value: x.value, count: x.count, files: [...x.files].slice(0, 4) }))
    .sort((a, b) => b.count - a.count);
}

const out = {
  hpeTokenCount: tokens.size,
  hpeTokens: dump(tokens).slice(0, 400),
  grommetPairs: dump(grommet).slice(0, 200),
  styledColorDecls: dump(styled).slice(0, 300),
};
mkdirSync(join(ROOT, "src", "tokens"), { recursive: true });
writeFileSync(join(ROOT, "src", "tokens", "hpe-tokens-from-cache.json"), JSON.stringify(out, null, 2));
console.log("hpe tokens", tokens.size, "grommet", grommet.size, "styled", styled.size);
console.log("sample tokens", dump(tokens).slice(0, 25));
