import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const invPath = join(root, "src/tokens/inventory.json");
const compactPath = join(root, "src/tokens/groups-compact.json");

/** Chrome / brand / overlay tokens the extension should implement first. */
const REMAP = {
  G001: "cd-surface-0",
  G002: "cd-text-primary",
  G003: "cd-text-secondary",
  G004: "cd-text-muted",
  G005: "cd-surface-1",
  G006: "cd-overlay-white-50",
  G007: "cd-overlay-black-15",
  G008: "cd-border",
  G009: "cd-text-muted",
  G010: "cd-border",
  G011: "cd-border-muted",
  G012: "cd-overlay-black-3",
  G013: "cd-surface-2",
  G014: "cd-overlay-black-6",
  G015: "cd-overlay-white-9",
  G016: "cd-overlay-white-33",
  G017: "cd-overlay-black-33",
  G018: "cd-text-primary",
  G019: "cd-overlay-black-50",
  G020: "cd-overlay-black-70",
  G021: "cd-surface-3",
  G023: "cd-surface-1",
  G025: "cd-surface-1",
  G030: "cd-accent-brand",
  G033: "cd-accent-brand-bright",
  G039: "cd-surface-1",
  G042: "cd-status-warn",
  G043: "cd-accent-brand-dark",
  G044: "cd-status-ok",
  G069: "cd-status-error",
  G077: "cd-status-error",
  G201: "cd-accent-brand",
  G202: "cd-overlay-black-20",
};

const groupingStrategy = {
  shareToken: [
    {
      token: "cd-surface-0",
      groups: ["G001"],
      note: "Page, card, input fills. Highest-count chrome color.",
    },
    {
      token: "cd-surface-1",
      groups: ["G005", "G023", "G025", "G039"],
      note: "Nested surfaces / zebra rows. Near-white cluster.",
    },
    {
      token: "cd-surface-2",
      groups: ["G013"],
      note: "Slightly darker nested chrome (#ededed).",
    },
    {
      token: "cd-surface-3",
      groups: ["G021"],
      note: "Disabled / well backgrounds (#e0e0e0).",
    },
    {
      token: "cd-text-primary",
      groups: ["G002", "G018"],
      note: "Body text #000 and #333. Theme together; keep as two source matches.",
    },
    {
      token: "cd-text-secondary",
      groups: ["G003"],
      note: "#444 headings / secondary copy.",
    },
    {
      token: "cd-text-muted",
      groups: ["G004", "G009"],
      note: "#555/#666 captions. Contrast on Dim/Dark needs a lift.",
    },
    {
      token: "cd-border",
      groups: ["G008", "G010"],
      note: "#d9d9d9 and #cccccc chrome strokes.",
    },
    {
      token: "cd-border-muted",
      groups: ["G011"],
      note: "#bbbbbb hairlines.",
    },
  ],
  independent: [
    {
      token: "cd-accent-brand",
      groups: ["G030", "G201"],
      note: "HPE green #01A982. Do not fold into chrome.",
    },
    {
      token: "cd-accent-brand-bright",
      groups: ["G033"],
      note: "#00C781 hover/active brand.",
    },
    {
      token: "cd-accent-brand-dark",
      groups: ["G043"],
      note: "#008567 darker brand text on light.",
    },
    {
      token: "cd-status-ok",
      groups: ["G044"],
      note: "#17EBA0 success. Keep hue.",
    },
    {
      token: "cd-status-warn",
      groups: ["G042", "G034"],
      note: "Ambers. Keep independent of chrome.",
    },
    {
      token: "cd-status-error",
      groups: ["G069", "G077", "G068"],
      note: "Reds. Keep independent.",
    },
  ],
  overlaysKeepAlphaSeparate: [
    "G006",
    "G007",
    "G012",
    "G014",
    "G015",
    "G016",
    "G017",
    "G019",
    "G020",
    "G202",
  ],
  skipVendorIconFills: "G031 and most G087–G194 are social/vendor SVG fills. Do not drive chrome tokens.",
  skipNativeGrommetDark: "G022, G024, G026, G027, G040 are Grommet dark-theme pair values. Use them as Dark/Black starting points, not as Normal matches.",
};

const inv = JSON.parse(readFileSync(invPath, "utf8"));
for (const g of inv.groups) {
  if (REMAP[g.id]) g.suggestedToken = REMAP[g.id];
}
inv.groupingStrategy = groupingStrategy;
inv.v1TokenCount = 14;
inv.notes =
  "Role labels from the cache scanner are crude (white/black often tagged fill). Use groupingStrategy for implementation. Live CSSOM dump did not complete.";
writeFileSync(invPath, JSON.stringify(inv, null, 2) + "\n");

const compact = JSON.parse(readFileSync(compactPath, "utf8"));
for (const g of compact) {
  if (REMAP[g.id]) g.token = REMAP[g.id];
}
writeFileSync(compactPath, JSON.stringify(compact) + "\n");
console.log("patched", Object.keys(REMAP).length, "tokens");
