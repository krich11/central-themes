import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const raw = JSON.parse(readFileSync(join(ROOT, "src/tokens/hpe-tokens-from-cache.json"), "utf8"));

function parseColor(input) {
  if (!input) return null;
  let s = String(input).trim();
  const hexm = s.match(/^#([0-9a-fA-F]{3,8})$/);
  if (hexm) {
    let h = hexm[1].toLowerCase();
    if (h.length === 3) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2];
    if (h.length === 4) h = h[0]+h[0]+h[1]+h[1]+h[2]+h[2]+h[3]+h[3];
    const hex = "#" + h.slice(0, 6);
    const alpha = h.length >= 8 ? parseInt(h.slice(6, 8), 16) / 255 : 1;
    return { hex, alpha };
  }
  const rgb = s.match(/^rgba?\(([^)]+)\)$/i);
  if (rgb) {
    const p = rgb[1].split(/[\s,/]+/).filter(Boolean);
    const r = Math.round(p[0].includes("%") ? parseFloat(p[0]) * 2.55 : parseFloat(p[0]));
    const g = Math.round(p[1].includes("%") ? parseFloat(p[1]) * 2.55 : parseFloat(p[1]));
    const b = Math.round(p[2].includes("%") ? parseFloat(p[2]) * 2.55 : parseFloat(p[2]));
    const a = p[3] == null ? 1 : parseFloat(p[3]);
    const hex = "#" + [r, g, b].map((n) => Math.max(0, Math.min(255, n)).toString(16).padStart(2, "0")).join("");
    return { hex, alpha: isNaN(a) ? 1 : a };
  }
  const named = { white: "#ffffff", black: "#000000", transparent: "#000000" };
  if (named[s.toLowerCase()]) {
    return { hex: named[s.toLowerCase()], alpha: s.toLowerCase() === "transparent" ? 0 : 1 };
  }
  return null;
}

function lum(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  const f = (c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b);
}
function contrast(hex, bg) {
  const l1 = lum(hex);
  const l2 = lum(bg);
  const [a, b] = l1 > l2 ? [l1, l2] : [l2, l1];
  return (a + 0.05) / (b + 0.05);
}

const groups = new Map();
function add(raw, mode, source, hint) {
  const p = parseColor(raw);
  if (!p) return;
  const key = p.hex + "|a:" + Math.round(p.alpha * 1000) / 1000;
  if (!groups.has(key)) {
    groups.set(key, {
      hex: p.hex,
      alpha: p.alpha,
      count: 0,
      modes: new Set(),
      sources: new Set(),
      hints: new Set(),
    });
  }
  const g = groups.get(key);
  g.count++;
  if (mode) g.modes.add(mode);
  g.sources.add(source);
  if (hint) g.hints.add(hint);
}

for (const row of raw.grommetPairs) {
  const mode = /dark/i.test(row.name) ? "dark" : /light/i.test(row.name) ? "light" : "unknown";
  add(row.value, mode, "grommet-theme", row.name);
  for (let i = 1; i < row.count; i++) add(row.value, mode, "grommet-theme");
}
for (const row of raw.styledColorDecls) {
  add(row.value, "unknown", "styled-components", row.name);
  for (let i = 1; i < Math.min(row.count, 8); i++) add(row.value, "unknown", "styled-components");
}

function guessRole(hex, alpha, hints) {
  const h = [...hints].join(" ").toLowerCase();
  if (alpha < 1) {
    if (h.includes("shadow") || h.includes("overlay")) return "shadow";
    return "overlay";
  }
  if (h.includes("border")) return "border";
  if (h.includes("fill") || h.includes("stroke")) return "fill";
  if (h.includes("background") || h.includes("bg")) return "background";
  if (h.includes("color:") || h.includes("text")) return "text";
  const L = lum(hex);
  if (L > 0.9) return "background";
  if (L < 0.08) return "text";
  if (L > 0.7) return "background";
  if (L < 0.35) return "text";
  return "accent";
}

function tokenName(role, hex, alpha, idx) {
  const L = lum(hex);
  if (role === "background") {
    if (L > 0.95) return "cd-surface-0";
    if (L > 0.85) return "cd-surface-1";
    if (L > 0.7) return "cd-surface-2";
    if (L > 0.4) return "cd-surface-muted";
    return `cd-surface-dark-${idx}`;
  }
  if (role === "text") {
    if (L < 0.05) return "cd-text-primary";
    if (L < 0.2) return "cd-text-secondary";
    if (L < 0.45) return "cd-text-muted";
    return "cd-text-on-dark";
  }
  if (role === "border") return L > 0.7 ? "cd-border-subtle" : "cd-border-strong";
  if (role === "overlay" || role === "shadow") return alpha < 0.2 ? "cd-overlay-faint" : "cd-overlay";
  if (role === "accent") {
    // HPE green family
    if (/^#0[0-2]a98/i.test(hex) || /^#01a982/i.test(hex) || /^#00c781/i.test(hex)) return "cd-accent-brand";
    return `cd-accent-${hex.slice(1, 4)}`;
  }
  return `cd-${role}-${hex.slice(1, 5)}`;
}

const WHITE = "#ffffff";
const DARKBG = "#1e1f22";
const sorted = [...groups.values()].sort((a, b) => b.count - a.count);
const usedTokens = new Map();
const inventoryGroups = sorted.map((g, i) => {
  const role = guessRole(g.hex, g.alpha, g.hints);
  let token = tokenName(role, g.hex, g.alpha, i);
  if (usedTokens.has(token) && usedTokens.get(token) !== g.hex) token = `${token}-${g.hex.slice(1, 5)}`;
  usedTokens.set(token, g.hex);
  const id = `G${String(i + 1).padStart(3, "0")}`;
  const display = g.alpha < 0.999 ? `${g.hex}${Math.round(g.alpha * 255).toString(16).padStart(2, "0")}` : g.hex;
  return {
    id,
    hex: g.hex,
    alpha: Math.round(g.alpha * 1000) / 1000,
    display,
    role,
    roles: [role],
    usageCount: g.count,
    modes: [...g.modes],
    sources: [...g.sources],
    examples: [...g.hints].slice(0, 6),
    suggestedToken: token,
    contrastVsWhite: Math.round(contrast(g.hex, WHITE) * 100) / 100,
    contrastVsDark: Math.round(contrast(g.hex, DARKBG) * 100) / 100,
  };
});

const inventory = {
  generatedAt: new Date().toISOString(),
  inspected: {
    title: "Aruba Central",
    origin: "https://internal-ui.central.arubanetworks.com",
    samplePath: "/gravity/monitoring",
    spa: true,
  },
  hostMatchPatterns: [
    "https://internal-ui.central.arubanetworks.com/*",
    "https://*.central.arubanetworks.com/*",
    "https://common.cloud.hpe.com/*",
  ],
  cssArchitecture: {
    framework: "React 18 + Grommet 2.50 + styled-components 6 + Vite",
    tokensPackage: "hpe-design-tokens (bundled as hpe-design-tokens-Ra70VhW_.js)",
    cssInJs: true,
    constructedStylesheets: "styled-components injects style tags / SC componentIds",
    cssCustomProperties: "HPE tokens compile to var(--hpe-*) at runtime; not present as static --hpe- decls in cache",
    shadowDom: true,
    shadowDomNotes: "greenlake-header web component; guided-tour plugin shadowRoot with injected styles",
    nativeDarkMode: true,
    nativeDarkModeNotes: "Grommet themeMode light|dark exists in-app (welcome tour Ka themeMode). Central currently shown in light mode.",
    mapsCharts: "grommet-leaflet / pmtiles vector tiles — skip bitmap inversion",
    darkReader: "Dark Reader extension has site access on this origin — live computed styles may be rewritten. Inventory prefers theme source colors.",
  },
  collection: {
    cssomLive: false,
    reason: "Playwright MCP extension attaches then chrome.debugger detaches within ~200ms (connect.html close + DevTools conflict). CSSOM dump did not complete.",
    fallback: "Edge HTTP cache of Central/GLCP JS bundles (Grommet theme light/dark pairs + styled-components color literals) plus live DOM/UIA inspection of the logged-in Gravity monitoring page.",
  },
  groupCount: inventoryGroups.length,
  groups: inventoryGroups,
  groupingStrategy: {
    shareToken: [
      "All exact #ffffff backgrounds (page, cards, inputs) → cd-surface-0",
      "Near-white grays #f8f8f8 #ededed → cd-surface-1 / cd-surface-2 (chrome vs nested panels)",
      "Text blacks #000 / #333 / #444 → cd-text-primary / secondary; #555 #666 → cd-text-muted",
      "Borders #ccc #bbb and rgba(0,0,0,0.15) → cd-border-* ; keep alpha variants separate",
    ],
    keepIndependent: [
      "HPE brand green and status (critical/warning/ok) — retune lightness only",
      "Map/chart categorical palettes — do not merge with chrome",
      "Overlay/shadow alphas",
      "Grommet dark-mode pair values — used when mapping Dim/Dark/Black, not mixed into Normal",
    ],
    themeMaps: {
      Normal: "no injection",
      Dim: "cd-surface-0/1/2 → cool gray #d8dbe0–#c5c9d1; text slightly darker; borders stronger",
      Dark: "surfaces #1e1f22 / #2b2d31; text #e8eaed; muted #9aa0a6; lift brand ~10–15% lightness",
      Black: "surfaces #0a0a0a / #111; text #f5f5f5; borders #333; saturate accents",
    },
  },
};

mkdirSync(join(ROOT, "src/tokens"), { recursive: true });
writeFileSync(join(ROOT, "src/tokens/inventory.json"), JSON.stringify(inventory, null, 2));
console.log("groups", inventory.groupCount);
console.log(inventoryGroups.slice(0, 20).map((g) => `${g.id} ${g.display} ${g.role} n=${g.usageCount} ${g.suggestedToken}`).join("\n"));
