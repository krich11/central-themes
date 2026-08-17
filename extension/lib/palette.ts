import { THEMES, type ThemeDefinition, type ThemeId } from "./themes";

export const CD_OVERRIDES_STORAGE_KEY = "cd-overrides";

export type ThemeOverrides = Partial<Record<ThemeId, Record<string, string>>>;

export interface ColorField {
  id: string;
  label: string;
  tokens: readonly string[];
}

/** User-facing knobs. Each field writes every listed Gravity token. */
export const OVERLAY_COLOR_FIELDS: ColorField[] = [
  {
    id: "page",
    label: "Page",
    tokens: [
      "--background-default",
      "--background-back",
      "--palette-background-default",
      "--ag-header-background-color",
    ],
  },
  {
    id: "cards",
    label: "Cards",
    tokens: [
      "--background-front",
      "--palette-background-paper",
      "--ag-background-color",
    ],
  },
  {
    id: "hover",
    label: "Hover",
    tokens: ["--background-solidHover"],
  },
  {
    id: "hoverBack",
    label: "Hover (back)",
    tokens: ["--background-backSolidHover"],
  },
  {
    id: "text",
    label: "Text",
    tokens: [
      "--text-default",
      "--palette-text-primary",
      "--palette-text-secondary",
    ],
  },
  {
    id: "textStrong",
    label: "Text strong",
    tokens: ["--text-strong"],
  },
  {
    id: "textMuted",
    label: "Text muted",
    tokens: ["--text-readonly", "--text-weak"],
  },
  {
    id: "textDisabled",
    label: "Text disabled",
    tokens: ["--palette-text-disabled"],
  },
  {
    id: "border",
    label: "Border",
    tokens: [
      "--border-default",
      "--ag-border-color",
      "--ag-secondary-border-color",
      "--ag-row-border-color",
    ],
  },
  {
    id: "borderStrong",
    label: "Border strong",
    tokens: ["--border-strong"],
  },
  {
    id: "borderWeak",
    label: "Border weak",
    tokens: ["--border-weak"],
  },
  {
    id: "accent",
    label: "HPE green / accent",
    tokens: ["--brand-hpeGreen", "--brand-default", "--focus"],
  },
  {
    id: "selectedFill",
    label: "Selected fill",
    tokens: ["--cd-selected-fill"],
  },
  {
    id: "arubaOrange",
    label: "Aruba orange",
    tokens: ["--brand-arubaOrange"],
  },
  {
    id: "statusGood",
    label: "Status good",
    tokens: ["--status-good"],
  },
  {
    id: "statusFair",
    label: "Status delayed",
    tokens: ["--status-fair", "--severity-major"],
  },
  {
    id: "statusUnknown",
    label: "Status unknown",
    tokens: ["--status-unknown"],
  },
  {
    id: "heatGood",
    label: "Heatmap good",
    tokens: ["--heatMap-good"],
  },
  {
    id: "heatFair",
    label: "Heatmap delayed",
    tokens: ["--heatMap-fair"],
  },
];

export function canCustomize(id: ThemeId): boolean {
  return THEMES[id].kind === "overlay" && Boolean(THEMES[id].vars);
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

export function fieldValue(
  vars: Record<string, string>,
  field: ColorField,
): string {
  for (const token of field.tokens) {
    const raw = vars[token];
    if (raw && isHexColor(raw)) return normalizeHex(raw);
  }
  return "#888888";
}

export function applyField(
  vars: Record<string, string>,
  field: ColorField,
  hex: string,
): Record<string, string> {
  const next = { ...vars };
  const value = normalizeHex(hex);
  for (const token of field.tokens) {
    if (token in next) next[token] = value;
  }
  return next;
}

export function mergeTheme(
  id: ThemeId,
  overrides?: Record<string, string> | null,
): ThemeDefinition {
  const theme = THEMES[id];
  if (!theme.vars || !overrides) return theme;
  const vars = { ...theme.vars };
  for (const [key, value] of Object.entries(overrides)) {
    if (key in vars && isHexColor(value)) vars[key] = normalizeHex(value);
  }
  if (vars["--status-fair"]) vars["--severity-major"] = vars["--status-fair"];
  return { ...theme, vars };
}

export function overridesFor(
  all: ThemeOverrides | null | undefined,
  id: ThemeId,
): Record<string, string> {
  return all?.[id] ?? {};
}

export function hexToHsv(hex: string): { h: number; s: number; v: number } {
  const h = normalizeHex(hex).slice(1);
  const r = Number.parseInt(h.slice(0, 2), 16) / 255;
  const g = Number.parseInt(h.slice(2, 4), 16) / 255;
  const b = Number.parseInt(h.slice(4, 6), 16) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let hue = 0;
  if (d !== 0) {
    if (max === r) hue = ((g - b) / d) % 6;
    else if (max === g) hue = (b - r) / d + 2;
    else hue = (r - g) / d + 4;
    hue *= 60;
    if (hue < 0) hue += 360;
  }
  const s = max === 0 ? 0 : d / max;
  return { h: hue, s, v: max };
}

export function hsvToHex(h: number, s: number, v: number): string {
  const c = v * s;
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
  const m = v - c;
  let r = 0;
  let g = 0;
  let b = 0;
  if (h < 60) [r, g, b] = [c, x, 0];
  else if (h < 120) [r, g, b] = [x, c, 0];
  else if (h < 180) [r, g, b] = [0, c, x];
  else if (h < 240) [r, g, b] = [0, x, c];
  else if (h < 300) [r, g, b] = [x, 0, c];
  else [r, g, b] = [c, 0, x];
  const toHex = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, "0");
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

export function cssColorToHex(css: string): string | null {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!m) return null;
  const a = m[4] == null ? 1 : Number(m[4]);
  if (a < 0.12) return null;
  const r = Number(m[1]);
  const g = Number(m[2]);
  const b = Number(m[3]);
  if (a < 1) {
    const mix = (c: number) => Math.round(c * a + 255 * (1 - a));
    return normalizeHex(
      `#${[mix(r), mix(g), mix(b)].map((n) => n.toString(16).padStart(2, "0")).join("")}`,
    );
  }
  return normalizeHex(
    `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`,
  );
}

function hexDistance(a: string, b: string): number {
  const pa = normalizeHex(a).slice(1);
  const pb = normalizeHex(b).slice(1);
  const dr = Number.parseInt(pa.slice(0, 2), 16) - Number.parseInt(pb.slice(0, 2), 16);
  const dg = Number.parseInt(pa.slice(2, 4), 16) - Number.parseInt(pb.slice(2, 4), 16);
  const db = Number.parseInt(pa.slice(4, 6), 16) - Number.parseInt(pb.slice(4, 6), 16);
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function sampleElementColors(el: Element): string[] {
  const found: string[] = [];
  const add = (css: string) => {
    const hex = cssColorToHex(css);
    if (hex) found.push(hex);
  };
  let node: Element | null = el;
  for (let i = 0; i < 8 && node; i++) {
    const cs = getComputedStyle(node);
    add(cs.backgroundColor);
    add(cs.color);
    add(cs.borderBottomColor);
    add(cs.borderColor);
    add(cs.fill);
    add(cs.stroke);
    const fillAttr = node.getAttribute("fill");
    const strokeAttr = node.getAttribute("stroke");
    if (fillAttr && isHexColor(fillAttr)) found.push(normalizeHex(fillAttr));
    if (strokeAttr && isHexColor(strokeAttr)) found.push(normalizeHex(strokeAttr));
    node = node.parentElement;
  }
  if (el instanceof Element) {
    for (const painted of el.querySelectorAll("path, rect, circle")) {
      add(getComputedStyle(painted).fill);
      add(getComputedStyle(painted).stroke);
      const fillAttr = painted.getAttribute("fill");
      const strokeAttr = painted.getAttribute("stroke");
      if (fillAttr && isHexColor(fillAttr)) found.push(normalizeHex(fillAttr));
      if (strokeAttr && isHexColor(strokeAttr)) found.push(normalizeHex(strokeAttr));
    }
  }
  return found;
}

function fieldById(id: string): ColorField | null {
  return OVERLAY_COLOR_FIELDS.find((field) => field.id === id) ?? null;
}

const STOCK_HEX_FIELDS: Record<string, string> = {
  "#ffbc44": "statusFair",
  "#17eba0": "statusGood",
  "#cccccc": "statusUnknown",
};

function styleField(el: Element | null): ColorField | null {
  if (!el) return null;
  const style = `${el.getAttribute("style") ?? ""} ${el.getAttribute("class") ?? ""}`;
  if (/severity-major|status-fair|HealthMediumFair|SeverityMediumMajor/i.test(style)) {
    return fieldById("statusFair");
  }
  if (/status-good|HealthMediumGood/i.test(style)) {
    return fieldById("statusGood");
  }
  if (/status-unknown|severity-minor/i.test(style)) {
    return fieldById("statusUnknown");
  }
  return null;
}

export function matchOverlayField(
  el: Element,
  vars: Record<string, string>,
): ColorField | null {
  if (el.closest(".MuiToggleButton-root.Mui-selected")) {
    return fieldById("selectedFill");
  }
  const segment = el.closest("[class*='segment-']");
  if (segment) {
    const cls = ` ${segment.className} `;
    if (/\ssegment-unknown\s|\ssegment-invalid\s/.test(cls)) {
      return fieldById("statusUnknown");
    }
    if (/\ssegment-2\s/.test(cls)) return fieldById("statusGood");
    if (/\ssegment-1\s/.test(cls)) return fieldById("statusFair");
  }
  const chart = el.closest(".circular-chart, [class*='CircularChart']");
  if (chart) {
    const fromChart =
      styleField(el) ??
      styleField(el.closest("path, svg")) ??
      styleField(chart.querySelector("path.arc-0, path[id^='arc-']"));
    if (fromChart) return fromChart;
  }
  const fromEl = styleField(el) ?? styleField(el.closest("path, svg"));
  if (fromEl) return fromEl;
  const samples = sampleElementColors(el);
  for (const sample of samples) {
    const mapped = STOCK_HEX_FIELDS[normalizeHex(sample)];
    if (mapped) return fieldById(mapped);
  }
  if (!samples.length) return null;
  let best: { field: ColorField; dist: number } | null = null;
  for (const field of OVERLAY_COLOR_FIELDS) {
    const hex = fieldValue(vars, field);
    for (const sample of samples) {
      const dist = hexDistance(hex, sample);
      if (!best || dist < best.dist) best = { field, dist };
    }
  }
  if (!best) return null;
  if (best.dist > 48) return null;
  return best.field;
}
