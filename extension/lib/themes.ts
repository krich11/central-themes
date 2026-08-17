export const THEME_IDS = [
  "central-light",
  "dim",
  "midnight",
  "high-contrast",
  "central-dark",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export const DEFAULT_THEME: ThemeId = "central-light";

export const NATIVE_THEME_STORAGE_KEY = "cnx-ui-theme";
export const CD_THEME_STORAGE_KEY = "cd-theme";
export const CD_RELOAD_FLAG = "cd-theme-reload";
export const CD_TOGGLE_CUSTOMIZER = "cd-toggle-customizer";

export type ThemeKind = "native" | "overlay";

export interface ThemeDefinition {
  id: ThemeId;
  label: string;
  kind: ThemeKind;
  /** Native Central theme this overlay sits on. Central Dark is native-only. */
  native: "light" | "dark";
  description: string;
  vars?: Record<string, string>;
  colorScheme?: "light" | "dark";
}

/** Charcoal overlay — former "Dark", renamed so it does not clash with Central Dark. */
export const THEMES: Record<ThemeId, ThemeDefinition> = {
  "central-light": {
    id: "central-light",
    label: "Central Light",
    kind: "native",
    native: "light",
    description: "Stock Aruba Central light UI. No overlay.",
  },
  dim: {
    id: "dim",
    label: "Dim",
    kind: "overlay",
    native: "light",
    colorScheme: "light",
    description: "Gray surfaces, reduced glare, still on the light chrome.",
    vars: {
      "--background-default": "#a4aab4",
      "--background-front": "#c6cad1",
      "--background-back": "#a4aab4",
      "--background-solidHover": "#c6cad1",
      "--background-backSolidHover": "#969ca6",
      "--palette-background-default": "#a4aab4",
      "--palette-background-paper": "#c6cad1",
      "--ag-background-color": "#c6cad1",
      "--ag-header-background-color": "#a4aab4",
      "--text-default": "#2a2a2a",
      "--text-strong": "#111111",
      "--text-readonly": "#4a4a4a",
      "--text-weak": "#5c5c5c",
      "--palette-text-primary": "#2a2a2a",
      "--palette-text-secondary": "#444444",
      "--palette-text-disabled": "#6e6e6e",
      "--border-default": "#7a7a7a",
      "--border-strong": "#5a5a5a",
      "--border-weak": "#9aa0a6",
      "--ag-border-color": "#7a7a7a",
      "--ag-secondary-border-color": "#7a7a7a",
      "--ag-row-border-color": "#7a7a7a",
      "--brand-hpeGreen": "#e07500",
      "--brand-default": "#e07500",
      "--brand-arubaOrange": "#e07500",
      "--focus": "#e07500",
      "--status-good": "#008000",
      "--status-fair": "#ffe100",
      "--severity-major": "#ffe100",
      "--status-unknown": "#008000",
      "--heatMap-good": "#008000",
      "--heatMap-fair": "#ffe100",
      "--cd-selected-fill": "#c6cad1",
      "--cd-icon-fill": "#000000",
    },
  },
  midnight: {
    id: "midnight",
    label: "Midnight",
    kind: "overlay",
    native: "light",
    colorScheme: "dark",
    description: "Charcoal overlay. Not native Central Dark.",
    vars: {
      "--background-default": "#1e1f22",
      "--background-front": "#1e1f22",
      "--background-back": "#2b2d31",
      "--background-solidHover": "#32343a",
      "--background-backSolidHover": "#3a3d44",
      "--palette-background-default": "#1e1f22",
      "--palette-background-paper": "#2b2d31",
      "--ag-background-color": "#1e1f22",
      "--ag-header-background-color": "#2b2d31",
      "--text-default": "#d6d9df",
      "--text-strong": "#c6cad1",
      "--text-readonly": "#9aa0a6",
      "--text-weak": "#9aa0a6",
      "--palette-text-primary": "#d6d9df",
      "--palette-text-secondary": "#9aa0a6",
      "--palette-text-disabled": "#80868b",
      "--border-default": "#3c4043",
      "--border-strong": "#5f6368",
      "--border-weak": "#2a2a2a",
      "--ag-border-color": "#3c4043",
      "--ag-secondary-border-color": "#3c4043",
      "--ag-row-border-color": "#3c4043",
      "--brand-hpeGreen": "#1ec99a",
      "--brand-default": "#1ec99a",
      "--brand-arubaOrange": "#ff9a2e",
      "--focus": "#1ec99a",
      "--status-good": "#4ad49a",
      "--status-fair": "#f4d04c",
      "--severity-major": "#f4d04c",
      "--status-unknown": "#5f6368",
      "--heatMap-good": "#5ed080",
      "--heatMap-fair": "#f6d65a",
      "--cd-selected-fill": "#292b2f",
      "--cd-icon-fill": "#c6cad1",
    },
  },
  "high-contrast": {
    id: "high-contrast",
    label: "High Contrast",
    kind: "overlay",
    native: "light",
    colorScheme: "dark",
    description: "Near-black, high contrast.",
    vars: {
      "--background-default": "#0a0a0a",
      "--background-front": "#0a0a0a",
      "--background-back": "#111111",
      "--background-solidHover": "#1a1a1a",
      "--background-backSolidHover": "#222222",
      "--palette-background-default": "#0a0a0a",
      "--palette-background-paper": "#111111",
      "--ag-background-color": "#0a0a0a",
      "--ag-header-background-color": "#111111",
      "--text-default": "#d6d9df",
      "--text-strong": "#ffffff",
      "--text-readonly": "#c8c8c8",
      "--text-weak": "#c8c8c8",
      "--palette-text-primary": "#d6d9df",
      "--palette-text-secondary": "#c6cad1",
      "--palette-text-disabled": "#888888",
      "--border-default": "#333333",
      "--border-strong": "#555555",
      "--border-weak": "#222222",
      "--ag-border-color": "#333333",
      "--ag-secondary-border-color": "#333333",
      "--ag-row-border-color": "#333333",
      "--brand-hpeGreen": "#ff8300",
      "--brand-default": "#ff8300",
      "--brand-arubaOrange": "#ffb347",
      "--focus": "#ff8300",
      "--status-good": "#3cb87a",
      "--status-fair": "#f4d04c",
      "--severity-major": "#f4d04c",
      "--status-unknown": "#555555",
      "--heatMap-good": "#4cba70",
      "--heatMap-fair": "#f6d65a",
      "--cd-selected-fill": "#101010",
      "--cd-icon-fill": "#ffffff",
    },
  },
  "central-dark": {
    id: "central-dark",
    label: "Central Dark",
    kind: "native",
    native: "dark",
    description: "Aruba Central’s built-in dark theme (cnx-ui-theme).",
  },
};

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return THEME_IDS.includes(value as ThemeId);
}

const STATUS_OPACITY = [
  ["0", "00"],
  ["8", "14"],
  ["12", "1f"],
  ["16", "29"],
  ["24", "3c"],
  ["32", "52"],
  ["40", "66"],
  ["48", "7a"],
  ["56", "8f"],
  ["64", "a3"],
  ["72", "b8"],
  ["80", "cc"],
  ["88", "e0"],
  ["100", "ff"],
] as const;

function stripHash(hex: string): string {
  return hex.replace("#", "");
}

function overlayStatusCss(theme: ThemeDefinition): string {
  const vars = theme.vars;
  if (!vars) return "";
  const id = theme.id;
  const fair = vars["--status-fair"];
  const good = vars["--status-good"];
  const unknown = vars["--status-unknown"];
  const accent = vars["--brand-default"] ?? vars["--brand-hpeGreen"];
  const selectedFill = vars["--cd-selected-fill"];
  const extraDecls: string[] = [];
  for (const [name, alpha] of STATUS_OPACITY) {
    if (fair) {
      extraDecls.push(
        `  --opacity-status-fair-${name}: #${stripHash(fair)}${alpha};`,
      );
    }
    if (good) {
      extraDecls.push(
        `  --opacity-status-good-${name}: #${stripHash(good)}${alpha};`,
      );
    }
    if (unknown) {
      extraDecls.push(
        `  --opacity-status-unknown-${name}: #${stripHash(unknown)}${alpha};`,
      );
    }
  }
  const extraBlock = extraDecls.length
    ? `html[data-cd-theme="${id}"] {\n${extraDecls.join("\n")}\n}\n`
    : "";
  const remaps: string[] = [];
  if (fair) {
    remaps.push(`html[data-cd-theme="${id}"] [fill="#ffbc44" i],
html[data-cd-theme="${id}"] [stroke="#ffbc44" i] {
  fill: ${fair} !important;
  stroke: ${fair} !important;
}
html[data-cd-theme="${id}"] .segment-1 {
  background-color: ${fair} !important;
}
html[data-cd-theme="${id}"] .brand-logo [fill="#FF8300" i],
html[data-cd-theme="${id}"] .brand-logo [fill="#ff8300" i] {
  fill: #FF8300 !important;
}`);
  }
  if (good) {
    remaps.push(`html[data-cd-theme="${id}"] [fill="#17eba0" i],
html[data-cd-theme="${id}"] [stroke="#17eba0" i] {
  fill: ${good} !important;
  stroke: ${good} !important;
}
html[data-cd-theme="${id}"] .segment-2 {
  background-color: ${good} !important;
}`);
  }
  if (unknown) {
    remaps.push(`html[data-cd-theme="${id}"] .segment-unknown,
html[data-cd-theme="${id}"] .segment-invalid {
  background-color: ${unknown} !important;
}`);
  }
  if (accent || selectedFill) {
    const fillRule = selectedFill
      ? `  background-color: ${selectedFill} !important;\n`
      : "";
    const accentRules = accent
      ? `  border-color: ${accent} !important;
  border-bottom-color: ${accent} !important;
  color: ${accent} !important;`
      : "";
    remaps.push(`html[data-cd-theme="${id}"] .MuiToggleButton-root.Mui-selected {
${fillRule}${accentRules}
}`);
    if (accent) {
      remaps.push(`html[data-cd-theme="${id}"] .MuiToggleButton-root.Mui-selected svg,
html[data-cd-theme="${id}"] .MuiToggleButton-root.Mui-selected path {
  fill: ${accent} !important;
  color: ${accent} !important;
}`);
    }
  }
  return extraBlock + remaps.join("\n");
}

function mixTowardWhite(hex: string, amount: number): string {
  const h = stripHash(hex);
  if (h.length < 6) return hex;
  const mix = (channel: number) =>
    Math.round(channel + (255 - channel) * amount)
      .toString(16)
      .padStart(2, "0");
  const r = Number.parseInt(h.slice(0, 2), 16);
  const g = Number.parseInt(h.slice(2, 4), 16);
  const b = Number.parseInt(h.slice(4, 6), 16);
  return `#${mix(r)}${mix(g)}${mix(b)}`;
}

export function overlayCss(theme: ThemeDefinition): string {
  if (!theme.vars) return "";
  const decls = Object.entries(theme.vars)
    .map(([k, v]) => `  ${k}: ${v};`)
    .join("\n");
  const scheme = theme.colorScheme ?? "dark";
  const bg = theme.vars["--background-default"] ?? "#1e1f22";
  const paper =
    theme.vars["--palette-background-paper"] ??
    theme.vars["--background-front"] ??
    bg;
  const fg = theme.vars["--text-default"] ?? "#e8eaed";
  const labels = theme.vars["--palette-text-secondary"] ?? fg;
  const tagBg = mixTowardWhite(paper, scheme === "light" ? 0.28 : 0.16);
  return `html[data-cd-theme="${theme.id}"], html[data-cd-theme="${theme.id}"] body {
  color-scheme: ${scheme};
  background-color: ${bg} !important;
  color: ${fg};
}
html[data-cd-theme="${theme.id}"] {
${decls}
}
html[data-cd-theme="${theme.id}"] .MuiPaper-root,
html[data-cd-theme="${theme.id}"] .MuiCard-root {
  background-color: ${paper} !important;
}
html[data-cd-theme="${theme.id}"] .MuiChip-root.MuiChip-header {
  background-color: ${tagBg} !important;
}
html[data-cd-theme="${theme.id}"] .form-label,
html[data-cd-theme="${theme.id}"] .MuiTableCell-head,
html[data-cd-theme="${theme.id}"] .MuiTableCell-body,
html[data-cd-theme="${theme.id}"] .form-value.primary.text {
  color: ${labels} !important;
}
html[data-cd-theme="${theme.id}"] .gvt-icon.home,
html[data-cd-theme="${theme.id}"] .gvt-icon.menu,
html[data-cd-theme="${theme.id}"] .gvt-icon.home path,
html[data-cd-theme="${theme.id}"] .gvt-icon.menu path,
html[data-cd-theme="${theme.id}"] [data-testid="context-header"] .MuiToggleButton-root:not(.Mui-selected) .gvt-icon,
html[data-cd-theme="${theme.id}"] [data-testid="context-header"] .MuiToggleButton-root:not(.Mui-selected) .gvt-icon path {
  fill: ${theme.vars["--cd-icon-fill"] ?? fg} !important;
  color: ${theme.vars["--cd-icon-fill"] ?? fg} !important;
}
${overlayStatusCss(theme)}`;
}
