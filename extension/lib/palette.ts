import { type ThemeDefinition } from "./themes";

export const CD_OVERRIDES_STORAGE_KEY = "cd-overrides";

export type ThemeOverrides = Record<string, Record<string, string>>;

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
    tokens: ["--text-default", "--palette-text-primary"],
  },
  {
    id: "text2",
    label: "Text 2",
    tokens: ["--palette-text-secondary"],
  },
  {
    id: "navIcons",
    label: "Nav icons",
    tokens: ["--cd-icon-fill"],
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

export function canCustomize(theme: ThemeDefinition | null | undefined): boolean {
  return Boolean(theme?.kind === "overlay" && theme.vars);
}

export function isHexColor(value: string): boolean {
  return /^#[0-9a-fA-F]{6}$/.test(value.trim());
}

export function normalizeHex(value: string): string {
  return value.trim().toLowerCase();
}

function srgbChannel(value: number): number {
  const s = value / 255;
  return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

/** Relative luminance for a #rrggbb color (WCAG). */
export function relativeLuminance(hex: string): number {
  const h = normalizeHex(hex).slice(1);
  const r = srgbChannel(Number.parseInt(h.slice(0, 2), 16));
  const g = srgbChannel(Number.parseInt(h.slice(2, 4), 16));
  const b = srgbChannel(Number.parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a: string, b: string): number {
  const l1 = relativeLuminance(a);
  const l2 = relativeLuminance(b);
  const hi = Math.max(l1, l2);
  const lo = Math.min(l1, l2);
  return (hi + 0.05) / (lo + 0.05);
}

const AA_NORMAL_TEXT = 4.5;

export interface ContrastPair {
  surfaceLabel: string;
  bg: string;
  ratio: number;
}

export interface ContrastIssue {
  fieldId: string;
  fieldLabel: string;
  usedFor: string;
  fg: string;
  pairs: ContrastPair[];
  recommended: string;
}

const TEXT2_SELECTOR = [
  ".form-label",
  ".MuiTableCell-head",
  ".MuiTableCell-body",
  ".form-value.primary.text",
  ".ag-cell",
  ".ag-header-cell",
].join(", ");

function mixHex(from: string, to: string, amount: number): string {
  const a = normalizeHex(from).slice(1);
  const b = normalizeHex(to).slice(1);
  const mix = (offset: number) => {
    const x = Number.parseInt(a.slice(offset, offset + 2), 16);
    const y = Number.parseInt(b.slice(offset, offset + 2), 16);
    return Math.round(x + (y - x) * amount)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${mix(0)}${mix(2)}${mix(4)}`;
}

function meetsAa(fg: string, backgrounds: string[]): boolean {
  return backgrounds.every((bg) => contrastRatio(fg, bg) >= AA_NORMAL_TEXT);
}

/** Closest mix of `fg` toward white or black that hits 4.5:1 on every background. */
export function recommendForeground(fg: string, backgrounds: string[]): string {
  const bgs = backgrounds.filter((bg) => isHexColor(bg));
  if (!bgs.length || !isHexColor(fg)) return fg;
  if (meetsAa(fg, bgs)) return normalizeHex(fg);
  const avgLum =
    bgs.reduce((sum, bg) => sum + relativeLuminance(bg), 0) / bgs.length;
  const toward = avgLum < 0.5 ? "#ffffff" : "#000000";
  const fallback = toward === "#ffffff" ? "#000000" : "#ffffff";
  const target = meetsAa(toward, bgs)
    ? toward
    : meetsAa(fallback, bgs)
      ? fallback
      : toward;
  let lo = 0;
  let hi = 1;
  let best = target;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    const candidate = mixHex(fg, target, mid);
    if (meetsAa(candidate, bgs)) {
      best = candidate;
      hi = mid;
    } else {
      lo = mid;
    }
  }
  return normalizeHex(best);
}

function parseRgba(
  css: string,
): { r: number; g: number; b: number; a: number } | null {
  const m = css.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)(?:,\s*([\d.]+))?\)/i);
  if (!m) return null;
  return {
    r: Number(m[1]),
    g: Number(m[2]),
    b: Number(m[3]),
    a: m[4] == null ? 1 : Number(m[4]),
  };
}

function rgbToHex(r: number, g: number, b: number): string {
  const h = (n: number) =>
    Math.round(Math.min(255, Math.max(0, n)))
      .toString(16)
      .padStart(2, "0");
  return `#${h(r)}${h(g)}${h(b)}`;
}

/** Walk ancestors and composite backgrounds (does not assume Page vs Cards). */
export function opaqueBackgroundHex(el: Element): string | null {
  const stack: Element[] = [];
  let node: Element | null = el;
  while (node) {
    stack.push(node);
    node = node.parentElement;
  }
  stack.reverse();
  let r = 255;
  let g = 255;
  let b = 255;
  let painted = false;
  for (const item of stack) {
    if (item.id === "central-dark-customizer-host") continue;
    const color = parseRgba(getComputedStyle(item).backgroundColor);
    if (!color || color.a < 0.04) continue;
    r = color.r * color.a + r * (1 - color.a);
    g = color.g * color.a + g * (1 - color.a);
    b = color.b * color.a + b * (1 - color.a);
    painted = true;
  }
  return painted ? rgbToHex(r, g, b) : null;
}

function isVisible(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  const style = getComputedStyle(el);
  if (style.display === "none" || style.visibility === "hidden") return false;
  const box = el.getBoundingClientRect();
  return box.width > 0 && box.height > 0;
}

function sampleBackgrounds(root: ParentNode, selector: string): string[] {
  const found = new Set<string>();
  const nodes = root.querySelectorAll(selector);
  let seen = 0;
  for (const el of nodes) {
    if (seen >= 60) break;
    if (el.closest("#central-dark-customizer-host")) continue;
    if (!isVisible(el)) continue;
    seen += 1;
    const bg = opaqueBackgroundHex(el);
    if (bg) found.add(normalizeHex(bg));
  }
  return [...found];
}

function nameSurface(bg: string, vars: Record<string, string>): string {
  const page = vars["--background-default"];
  const cards =
    vars["--palette-background-paper"] ?? vars["--background-front"];
  const tables = vars["--ag-background-color"];
  const near = (token: string | undefined) =>
    Boolean(token && isHexColor(token) && hexDistance(bg, token) <= 12);
  if (near(cards)) return "Cards";
  if (near(tables)) return "Tables";
  if (near(page)) return "Page";
  return `this background (${bg})`;
}

/**
 * Contrast for text tokens against backgrounds actually under matching
 * elements on the current page. No matches → no warning for that token.
 */
export function textContrastIssues(
  vars: Record<string, string>,
  root: ParentNode | null = typeof document === "undefined" ? null : document,
): ContrastIssue[] {
  if (!root) return [];
  const text = vars["--text-default"];
  const text2 = vars["--palette-text-secondary"];
  const textBackgrounds = new Set<string>();
  if (isHexColor(text ?? "")) {
    const fg = normalizeHex(text as string);
    const candidates = root.querySelectorAll(
      "p, span, li, h1, h2, h3, h4, .MuiTypography-root, .form-value",
    );
    let seen = 0;
    for (const el of candidates) {
      if (seen >= 80) break;
      if (el.closest("#central-dark-customizer-host")) continue;
      if (el.closest(TEXT2_SELECTOR)) continue;
      if (!isVisible(el)) continue;
      const color = cssColorToHex(getComputedStyle(el).color);
      if (!color || hexDistance(color, fg) > 14) continue;
      seen += 1;
      const bg = opaqueBackgroundHex(el);
      if (bg) textBackgrounds.add(normalizeHex(bg));
    }
  }
  const checks: {
    fieldId: string;
    fieldLabel: string;
    usedFor: string;
    fg: string | undefined;
    backgrounds: string[];
  }[] = [
    {
      fieldId: "text2",
      fieldLabel: "Text 2",
      usedFor: "labels and table cells on this page",
      fg: text2,
      backgrounds: sampleBackgrounds(root, TEXT2_SELECTOR),
    },
    {
      fieldId: "text",
      fieldLabel: "Text",
      usedFor: "body text on this page",
      fg: text,
      backgrounds: [...textBackgrounds],
    },
  ];

  const issues: ContrastIssue[] = [];
  for (const check of checks) {
    if (!check.fg || !isHexColor(check.fg) || !check.backgrounds.length) continue;
    const fg = normalizeHex(check.fg);
    const pairs: ContrastPair[] = [];
    for (const bg of check.backgrounds) {
      const ratio = contrastRatio(fg, bg);
      if (ratio < AA_NORMAL_TEXT) {
        pairs.push({
          surfaceLabel: nameSurface(bg, vars),
          bg,
          ratio,
        });
      }
    }
    if (!pairs.length) continue;
    issues.push({
      fieldId: check.fieldId,
      fieldLabel: check.fieldLabel,
      usedFor: check.usedFor,
      fg,
      pairs,
      recommended: recommendForeground(fg, check.backgrounds),
    });
  }
  return issues;
}

export function sanitizeOverrides(
  vars: Record<string, string> | undefined,
  incoming: Record<string, unknown>,
): Record<string, string> {
  if (!vars) return {};
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(incoming)) {
    if (key in vars && typeof value === "string" && isHexColor(value)) {
      next[key] = normalizeHex(value);
    }
  }
  return next;
}

export function parsePaletteFile(
  raw: string,
  allowedVars: Record<string, string> | undefined,
): {
  name?: string;
  themeId?: string;
  overrides: Record<string, string>;
  vars: Record<string, string>;
} | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;
  const body = parsed as {
    overrides?: unknown;
    vars?: unknown;
    colors?: unknown;
    name?: unknown;
    profile?: unknown;
    theme?: unknown;
  };
  const source =
    body.vars && typeof body.vars === "object"
      ? (body.vars as Record<string, unknown>)
      : body.overrides && typeof body.overrides === "object"
        ? (body.overrides as Record<string, unknown>)
        : body.colors && typeof body.colors === "object"
          ? (body.colors as Record<string, unknown>)
          : (parsed as Record<string, unknown>);
  const allowed = allowedVars ?? hexVarMap(source);
  const overrides = sanitizeOverrides(allowed, source);
  const name =
    typeof body.name === "string"
      ? body.name.trim()
      : typeof body.profile === "string"
        ? body.profile.trim()
        : "";
  const themeId = typeof body.theme === "string" ? body.theme : undefined;
  return {
    overrides,
    name: name || undefined,
    themeId,
    vars: { ...allowed, ...overrides },
  };
}

function hexVarMap(source: Record<string, unknown>): Record<string, string> {
  const next: Record<string, string> = {};
  for (const [key, value] of Object.entries(source)) {
    if (key.startsWith("--") && typeof value === "string" && isHexColor(value)) {
      next[key] = normalizeHex(value);
    }
  }
  return next;
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
  theme: ThemeDefinition,
  overrides?: Record<string, string> | null,
): ThemeDefinition {
  if (!theme.vars || !overrides) return theme;
  const vars = { ...theme.vars };
  const secondary = overrides["--palette-text-secondary"];
  const primary =
    overrides["--palette-text-primary"] ?? overrides["--text-default"];
  for (const [key, value] of Object.entries(overrides)) {
    if (
      key === "--palette-text-secondary" &&
      secondary &&
      primary &&
      normalizeHex(secondary) === normalizeHex(primary)
    ) {
      continue;
    }
    if (key in vars && isHexColor(value)) vars[key] = normalizeHex(value);
  }
  if (vars["--status-fair"]) vars["--severity-major"] = vars["--status-fair"];
  return { ...theme, vars };
}

export function overridesFor(
  all: ThemeOverrides | null | undefined,
  id: string,
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

function fieldById(id: string): ColorField | null {
  return OVERLAY_COLOR_FIELDS.find((field) => field.id === id) ?? null;
}

function fieldForToken(token: string): ColorField | null {
  for (const field of OVERLAY_COLOR_FIELDS) {
    if ((field.tokens as readonly string[]).includes(token)) return field;
  }
  if (token.startsWith("--opacity-status-good")) return fieldById("statusGood");
  if (token.startsWith("--opacity-status-fair")) return fieldById("statusFair");
  if (token.startsWith("--opacity-status-unknown")) return fieldById("statusUnknown");
  return null;
}

function varsInCss(css: string): string[] {
  return [...css.matchAll(/var\(\s*(--[A-Za-z0-9-]+)/gi)].map((m) => m[1]);
}

const PAINT_PROPS = [
  "color",
  "fill",
  "stroke",
  "background-color",
  "border-color",
  "border-bottom-color",
] as const;

function collectSheetVars(
  el: Element,
  rules: CSSRuleList,
  found: string[],
) {
  for (const rule of rules) {
    if (rule instanceof CSSMediaRule || rule instanceof CSSSupportsRule) {
      collectSheetVars(el, rule.cssRules, found);
      continue;
    }
    if (!(rule instanceof CSSStyleRule) || !rule.selectorText) continue;
    if (!rule.cssText.includes("var(--")) continue;
    try {
      if (!el.matches(rule.selectorText)) continue;
    } catch {
      continue;
    }
    found.push(...varsInCss(rule.style.cssText));
    for (const prop of PAINT_PROPS) {
      found.push(...varsInCss(rule.style.getPropertyValue(prop)));
    }
  }
}

/** CSS custom properties the node actually uses (not nearest hex). */
function cssTokensOn(el: Element): string[] {
  const found: string[] = [];
  found.push(...varsInCss(el.getAttribute("style") ?? ""));
  if (el instanceof HTMLElement || el instanceof SVGElement) {
    for (const prop of PAINT_PROPS) {
      found.push(...varsInCss(el.style.getPropertyValue(prop)));
    }
  }
  const sheets: CSSStyleSheet[] = [...document.styleSheets];
  if (document.adoptedStyleSheets) sheets.push(...document.adoptedStyleSheets);
  for (const sheet of sheets) {
    try {
      collectSheetVars(el, sheet.cssRules, found);
    } catch {
      /* cross-origin sheet */
    }
  }
  return found;
}

function isGraphic(el: Element): boolean {
  if (el instanceof SVGTextElement) return false;
  return (
    el instanceof SVGElement ||
    Boolean(el.closest("path, circle, rect, line, polygon, polyline, .gvt-icon"))
  );
}

function classField(el: Element): ColorField | null {
  const style = `${el.getAttribute("class") ?? ""} ${el.getAttribute("style") ?? ""} ${el.getAttribute("data-testid") ?? ""}`;
  if (/severity-major|status-fair|HealthMediumFair|SeverityMediumMajor/i.test(style)) {
    return fieldById("statusFair");
  }
  if (/status-good|HealthMediumGood/i.test(style)) {
    return fieldById("statusGood");
  }
  if (/status-unknown|severity-minor/i.test(style)) {
    return fieldById("statusUnknown");
  }
  if (/\bform-label\b|\bMuiTableCell-head\b|\bMuiTableCell-body\b|\bag-cell\b|\bag-header-cell\b|\bform-value\b/i.test(style)) {
    return fieldById("text2");
  }
  return null;
}

function classFieldWalk(el: Element): ColorField | null {
  let node: Element | null = el;
  for (let i = 0; i < 5 && node; i++) {
    const hit = classField(node);
    if (hit) return hit;
    const cls = node.getAttribute("class") ?? "";
    if (/\bMuiPaper-root\b|\bMuiCard-root\b/.test(cls)) break;
    node = node.parentElement;
  }
  return null;
}

function fieldFromTokens(tokens: string[]): ColorField | null {
  for (const token of tokens) {
    const field = fieldForToken(token);
    if (field) return field;
  }
  return null;
}

export function matchOverlayField(
  el: Element,
  _vars: Record<string, string>,
): ColorField | null {
  if (el.closest(".MuiToggleButton-root.Mui-selected")) {
    return fieldById("selectedFill");
  }
  if (
    el.closest(
      '.gvt-icon.home, .gvt-icon.menu, [aria-label="Home"], [aria-label="Menu"]',
    ) ||
    (el.closest('[data-testid="context-header"] .MuiToggleButton-root') &&
      !el.closest(".MuiToggleButton-root.Mui-selected"))
  ) {
    return fieldById("navIcons");
  }

  const graphic = isGraphic(el);
  const tokens = cssTokensOn(el);
  const colorTokens = tokens.filter((token) =>
    token.includes("text") ||
    token.includes("status") ||
    token.includes("brand") ||
    token.includes("heatMap") ||
    token.includes("icon") ||
    token.includes("background") ||
    token.includes("border") ||
    token.includes("focus") ||
    token.startsWith("--cd-"),
  );
  const preferFill = graphic
    ? colorTokens.filter(
        (token) =>
          token.includes("status") ||
          token.includes("heatMap") ||
          token.includes("brand") ||
          token.includes("icon") ||
          token.startsWith("--cd-icon"),
      )
    : colorTokens.filter(
        (token) =>
          token.includes("text") || token.startsWith("--palette-text"),
      );
  const fromCss =
    fieldFromTokens(preferFill) ?? fieldFromTokens(colorTokens) ?? fieldFromTokens(tokens);
  if (fromCss) return fromCss;

  if (!graphic) {
    const fromClass = classFieldWalk(el);
    if (fromClass) return fromClass;
    if (
      el.closest(
        ".form-label, .MuiTableCell-head, .MuiTableCell-body, .form-value.primary, .ag-cell, .ag-header-cell, label, td, th",
      ) &&
      !el.closest("a, .form-value-hyperlink, .anchor-bold-default")
    ) {
      return fieldById("text2");
    }
    return null;
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
  return classField(el) ?? classField(el.closest("path, svg") ?? el);
}
