import {
  OVERLAY_COLOR_FIELDS,
  applyField,
  canCustomize,
  fieldValue,
  hexToHsv,
  hsvToHex,
  isHexColor,
  normalizeHex,
  parsePaletteFile,
  textContrastIssues,
  type ColorField,
} from "./palette";
import { slugify } from "./profiles";
import { type ThemeDefinition } from "./themes";

export const CUSTOMIZER_CSS = `
.cd-customizer {
  font: 12px/1.35 Segoe UI, system-ui, sans-serif;
  color: #e8eaed;
  display: flex;
  flex-direction: column;
  min-height: 0;
  flex: 1;
  height: 100%;
}
.cd-customizer h2 {
  margin: 0;
  font-size: 13px;
  font-weight: 650;
}
.cd-customizer-chrome {
  flex-shrink: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-bottom: 8px;
}
.cd-customizer-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  min-width: 0;
}
.cd-customizer-actions {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
  flex-wrap: nowrap;
  justify-content: flex-end;
}
.cd-customizer-head h2 {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.cd-body {
  flex: 1;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
  padding-right: 4px;
}
.cd-customizer-actions button.cd-eyedrop-on {
  background: #01a982;
  border-color: #01ce9e;
  color: #0a0a0a;
}
.cd-customizer button {
  font: inherit;
  color: inherit;
  background: #2b2d31;
  border: 1px solid #3c4043;
  border-radius: 6px;
  padding: 4px 8px;
  cursor: pointer;
}
.cd-customizer button:hover {
  background: #32343a;
}
.cd-customizer-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.cd-row {
  display: grid;
  grid-template-columns: 1fr auto 76px;
  gap: 8px;
  align-items: center;
}
.cd-row span {
  color: #c4c7cc;
}
.cd-swatch {
  width: 28px;
  height: 22px;
  border: 1px solid #5f6368;
  border-radius: 4px;
  padding: 0;
  cursor: pointer;
}
.cd-hex {
  font: 11px/1.2 ui-monospace, Consolas, monospace;
  width: 76px;
  box-sizing: border-box;
  padding: 4px 6px;
  border-radius: 4px;
  border: 1px solid #3c4043;
  background: #1e1f22;
  color: inherit;
}
.cd-popover {
  position: absolute;
  z-index: 3;
  width: 242px;
  padding: 8px;
  background: #2b2d31;
  border: 1px solid #5f6368;
  border-radius: 8px;
  box-shadow: 0 8px 24px rgba(0,0,0,.4);
  overflow: visible;
}
.cd-picker-title {
  margin: 0 0 8px;
  font-size: 12px;
  font-weight: 650;
  color: #e8eaed;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cd-picker-tabs {
  display: flex;
  gap: 4px;
  margin-bottom: 8px;
}
.cd-picker-tabs button {
  flex: 1;
  padding: 4px 6px;
}
.cd-picker-tabs button.cd-tab-active {
  background: #3c4043;
  border-color: #9aa0a6;
}
.cd-picker-panel[hidden] {
  display: none !important;
}
.cd-palette {
  display: flex;
  flex-direction: column;
  gap: 8px;
  overflow: visible;
}
.cd-palette-label {
  margin: 0 0 4px;
  color: #9aa0a6;
  font-size: 11px;
}
.cd-palette-grid {
  display: grid;
  grid-template-columns: repeat(8, 1fr);
  gap: 3px;
}
.cd-palette-chip {
  width: 100%;
  aspect-ratio: 1;
  border: 1px solid #5f6368;
  border-radius: 3px;
  padding: 0;
  cursor: pointer;
}
.cd-palette-chip.cd-chip-active {
  outline: 2px solid #e8eaed;
  outline-offset: 1px;
}
.cd-sv {
  position: relative;
  width: 100%;
  height: 120px;
  border-radius: 4px;
  cursor: crosshair;
  background: #f00;
}
.cd-sv-white, .cd-sv-black {
  position: absolute;
  inset: 0;
  border-radius: 4px;
}
.cd-sv-white {
  background: linear-gradient(to right, #fff, transparent);
}
.cd-sv-black {
  background: linear-gradient(to top, #000, transparent);
}
.cd-sv-thumb {
  position: absolute;
  width: 10px;
  height: 10px;
  border: 2px solid #fff;
  border-radius: 50%;
  box-shadow: 0 0 0 1px #000;
  transform: translate(-50%, -50%);
  pointer-events: none;
}
.cd-hue {
  width: 100%;
  margin: 8px 0 0;
  accent-color: #01a982;
}
.cd-note {
  margin: 8px 0 0;
  color: #9aa0a6;
}
.cd-contrast {
  margin: 8px 0 0;
  color: #f0c840;
  display: flex;
  flex-direction: column;
  gap: 8px;
}
.cd-contrast-item {
  margin: 0;
  line-height: 1.4;
}
.cd-contrast-apply {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  margin-top: 6px;
  padding: 3px 8px;
}
.cd-contrast-swatch {
  width: 12px;
  height: 12px;
  border-radius: 2px;
  border: 1px solid #5f6368;
}
`;

export interface CustomizerHandle {
  root: HTMLElement;
  refresh(theme: ThemeDefinition, vars: Record<string, string>): void;
  openField(fieldId: string): void;
  setEyedropActive(active: boolean): void;
}

function currentVars(
  theme: ThemeDefinition,
  overrides: Record<string, string>,
): Record<string, string> {
  return { ...(theme.vars ?? {}), ...overrides };
}

function setSwatch(button: HTMLButtonElement, hex: string) {
  button.style.background = hex;
  button.dataset.hex = hex;
}

type PickerTab = "palette" | "wheel";
let lastPickerTab: PickerTab = "palette";

const PALETTE_GROUPS: { label: string; colors: string[] }[] = [
  {
    label: "Neutrals",
    colors: [
      "#ffffff",
      "#f5f5f5",
      "#e8eaed",
      "#d6d9df",
      "#c6cad1",
      "#a4aab4",
      "#9aa0a6",
      "#80868b",
      "#5f6368",
      "#3c4043",
      "#2a2a2a",
      "#1e1f22",
      "#111111",
      "#000000",
      "#bcc1c8",
      "#969ca6",
    ],
  },
  {
    label: "Brand",
    colors: [
      "#01a982",
      "#01ce9e",
      "#00c389",
      "#1ec99a",
      "#e07500",
      "#ff8300",
      "#ff9a2e",
      "#000000",
    ],
  },
  {
    label: "Status",
    colors: [
      "#42c98c",
      "#17eba0",
      "#2e8b57",
      "#f0c840",
      "#ffbc44",
      "#e07500",
      "#d93025",
      "#cccccc",
      "#1a73e8",
    ],
  },
  {
    label: "Standard",
    colors: [
      "#800000",
      "#ff0000",
      "#ffc0cb",
      "#ffa500",
      "#ffff00",
      "#008000",
      "#00ff00",
      "#00ffff",
      "#000080",
      "#0000ff",
      "#800080",
      "#ff00ff",
      "#a52a2a",
      "#f4c430",
      "#4b0082",
      "#808000",
    ],
  },
];

function openPicker(
  anchor: HTMLButtonElement,
  host: HTMLElement,
  fieldLabel: string,
  onPick: (hex: string) => void,
) {
  host.querySelector(".cd-popover")?.remove();
  const start = normalizeHex(anchor.dataset.hex || "#888888");
  let hsv = hexToHsv(start);
  let current = start;
  const pop = document.createElement("div");
  pop.className = "cd-popover";
  const title = document.createElement("p");
  title.className = "cd-picker-title";
  title.textContent = fieldLabel;
  title.title = fieldLabel;

  const tabs = document.createElement("div");
  tabs.className = "cd-picker-tabs";
  const paletteTab = document.createElement("button");
  paletteTab.type = "button";
  paletteTab.textContent = "Palette";
  const wheelTab = document.createElement("button");
  wheelTab.type = "button";
  wheelTab.textContent = "Wheel";
  tabs.append(paletteTab, wheelTab);

  const palettePanel = document.createElement("div");
  palettePanel.className = "cd-picker-panel cd-palette";
  for (const group of PALETTE_GROUPS) {
    const label = document.createElement("p");
    label.className = "cd-palette-label";
    label.textContent = group.label;
    const grid = document.createElement("div");
    grid.className = "cd-palette-grid";
    for (const hex of group.colors) {
      const chip = document.createElement("button");
      chip.type = "button";
      chip.className = "cd-palette-chip";
      chip.title = hex;
      chip.style.background = hex;
      chip.dataset.hex = hex;
      if (normalizeHex(hex) === current) chip.classList.add("cd-chip-active");
      chip.addEventListener("click", () => {
        current = normalizeHex(hex);
        hsv = hexToHsv(current);
        paint();
        markActive();
        onPick(current);
      });
      grid.append(chip);
    }
    const wrap = document.createElement("div");
    wrap.append(label, grid);
    palettePanel.append(wrap);
  }

  const wheelPanel = document.createElement("div");
  wheelPanel.className = "cd-picker-panel";
  const sv = document.createElement("div");
  sv.className = "cd-sv";
  const white = document.createElement("div");
  white.className = "cd-sv-white";
  const black = document.createElement("div");
  black.className = "cd-sv-black";
  const thumb = document.createElement("div");
  thumb.className = "cd-sv-thumb";
  black.append(thumb);
  white.append(black);
  sv.append(white);
  const hue = document.createElement("input");
  hue.type = "range";
  hue.className = "cd-hue";
  hue.min = "0";
  hue.max = "360";
  hue.value = String(Math.round(hsv.h));
  wheelPanel.append(sv, hue);

  pop.append(title, tabs, palettePanel, wheelPanel);

  const showTab = (tab: PickerTab) => {
    lastPickerTab = tab;
    paletteTab.classList.toggle("cd-tab-active", tab === "palette");
    wheelTab.classList.toggle("cd-tab-active", tab === "wheel");
    palettePanel.hidden = tab !== "palette";
    wheelPanel.hidden = tab !== "wheel";
    place();
  };
  paletteTab.addEventListener("click", () => showTab("palette"));
  wheelTab.addEventListener("click", () => showTab("wheel"));

  const cardElement = (): HTMLElement => {
    const root = host.getRootNode();
    if (root instanceof ShadowRoot && root.host instanceof HTMLElement) {
      return root.host;
    }
    return host;
  };

  const place = () => {
    const cardEl = cardElement();
    const card = cardEl.getBoundingClientRect();
    const anchorRect = anchor.getBoundingClientRect();
    const margin = 8;
    const popH = pop.offsetHeight;
    const popW = pop.offsetWidth;
    let left = anchorRect.left;
    if (left + popW > card.right - margin) {
      left = card.right - margin - popW;
    }
    if (left < card.left + margin) left = card.left + margin;

    let top = anchorRect.bottom + 6;
    const maxBottom = card.bottom - margin;
    if (top + popH > maxBottom) {
      top = maxBottom - popH;
    }
    if (top < card.top + margin) top = card.top + margin;
    pop.style.position = "absolute";
    pop.style.left = `${left - card.left}px`;
    pop.style.top = `${top - card.top}px`;
  };

  const markActive = () => {
    for (const chip of palettePanel.querySelectorAll<HTMLButtonElement>(
      ".cd-palette-chip",
    )) {
      chip.classList.toggle(
        "cd-chip-active",
        normalizeHex(chip.dataset.hex || "") === current,
      );
    }
  };

  const paint = () => {
    sv.style.background = hsvToHex(hsv.h, 1, 1);
    thumb.style.left = `${hsv.s * 100}%`;
    thumb.style.top = `${(1 - hsv.v) * 100}%`;
    hue.value = String(Math.round(hsv.h));
  };

  const emitWheel = () => {
    current = hsvToHex(hsv.h, hsv.s, hsv.v);
    markActive();
    onPick(current);
  };

  const pickSv = (event: PointerEvent) => {
    const box = sv.getBoundingClientRect();
    hsv.s = Math.min(1, Math.max(0, (event.clientX - box.left) / box.width));
    hsv.v = Math.min(
      1,
      Math.max(0, 1 - (event.clientY - box.top) / box.height),
    );
    paint();
    emitWheel();
  };

  sv.addEventListener("pointerdown", (event) => {
    sv.setPointerCapture(event.pointerId);
    pickSv(event);
  });
  sv.addEventListener("pointermove", (event) => {
    if (!sv.hasPointerCapture(event.pointerId)) return;
    pickSv(event);
  });
  hue.addEventListener("input", () => {
    hsv.h = Number(hue.value);
    paint();
    emitWheel();
  });

  const mount =
    host.getRootNode() instanceof ShadowRoot
      ? host.getRootNode()
      : host;
  mount.append(pop);
  paint();
  showTab(lastPickerTab);

  const isInsidePicker = (event: Event) => {
    const path = event.composedPath();
    return path.includes(pop) || path.includes(anchor);
  };

  const onDoc = (event: PointerEvent) => {
    if (isInsidePicker(event)) return;
    pop.remove();
    document.removeEventListener("pointerdown", onDoc, true);
  };
  window.setTimeout(() => {
    document.addEventListener("pointerdown", onDoc, true);
  }, 0);
}

export function mountCustomizer(
  parent: HTMLElement,
  options: {
    theme: ThemeDefinition;
    overrides: Record<string, string>;
    onChange: (overrides: Record<string, string>) => void;
    onReset: () => void;
    onClose?: () => void;
    onEyedropper?: () => void;
    note?: string;
  },
): CustomizerHandle {
  const root = document.createElement("div");
  root.className = "cd-customizer";
  root.style.position = "relative";

  const chrome = document.createElement("div");
  chrome.className = "cd-customizer-chrome";
  const head = document.createElement("div");
  head.className = "cd-customizer-head";
  const title = document.createElement("h2");
  const actions = document.createElement("div");
  actions.className = "cd-customizer-actions";
  const reset = document.createElement("button");
  reset.type = "button";
  reset.textContent = "Reset";
  actions.append(reset);
  const exportBtn = document.createElement("button");
  exportBtn.type = "button";
  exportBtn.textContent = "Export";
  exportBtn.title = "Download this theme’s color overrides as JSON";
  actions.append(exportBtn);
  const importBtn = document.createElement("button");
  importBtn.type = "button";
  importBtn.textContent = "Import";
  importBtn.title = "Load color overrides from a JSON file";
  const importInput = document.createElement("input");
  importInput.type = "file";
  importInput.accept = "application/json,.json";
  importInput.hidden = true;
  actions.append(importBtn, importInput);
  const eyedrop = document.createElement("button");
  eyedrop.type = "button";
  eyedrop.textContent = "Select";
  eyedrop.title = "Click a page element to open its color picker";
  if (options.onEyedropper) {
    eyedrop.addEventListener("click", () => options.onEyedropper?.());
    actions.append(eyedrop);
  }
  if (options.onClose) {
    const close = document.createElement("button");
    close.type = "button";
    close.textContent = "Done";
    close.addEventListener("click", options.onClose);
    actions.append(close);
  }
  head.append(title);
  chrome.append(head, actions);

  const body = document.createElement("div");
  body.className = "cd-body";
  const list = document.createElement("div");
  list.className = "cd-customizer-list";
  const note = document.createElement("p");
  note.className = "cd-note";
  if (options.note) note.textContent = options.note;
  const contrast = document.createElement("div");
  contrast.className = "cd-contrast";
  contrast.hidden = true;

  body.append(list);
  if (options.note) body.append(note);
  body.append(contrast);
  root.append(chrome, body);
  parent.append(root);

  let theme = options.theme;
  let overrides = { ...options.overrides };
  const controls = new Map<
    string,
    { swatch: HTMLButtonElement; hex: HTMLInputElement }
  >();

  const paintRows = () => {
    const vars = currentVars(theme, overrides);
    for (const field of OVERLAY_COLOR_FIELDS) {
      const hex = fieldValue(vars, field);
      const pair = controls.get(field.id);
      if (!pair) continue;
      setSwatch(pair.swatch, hex);
      if (document.activeElement !== pair.hex) pair.hex.value = hex;
    }
    const issues = textContrastIssues(vars, document);
    contrast.replaceChildren();
    contrast.hidden = issues.length === 0;
    for (const issue of issues) {
      const item = document.createElement("div");
      item.className = "cd-contrast-item";
      const surfaces = issue.pairs
        .map(
          (pair) =>
            `${pair.surfaceLabel} ${pair.bg} at ${pair.ratio.toFixed(1)}:1`,
        )
        .join("; ");
      const line = document.createElement("p");
      line.className = "cd-contrast-item";
      line.textContent = `${issue.fieldLabel} (${issue.fg}) is ${issue.usedFor}. Against ${surfaces}, it is under the 4.5:1 readability target.`;
      const apply = document.createElement("button");
      apply.type = "button";
      apply.className = "cd-contrast-apply";
      apply.dataset.fieldId = issue.fieldId;
      apply.dataset.hex = issue.recommended;
      const swatch = document.createElement("span");
      swatch.className = "cd-contrast-swatch";
      swatch.style.background = issue.recommended;
      apply.append(swatch, document.createTextNode(`Try ${issue.recommended}`));
      item.append(line, apply);
      contrast.append(item);
    }
  };

  const commitField = (field: ColorField, hex: string) => {
    if (!isHexColor(hex)) return;
    const base = theme.vars ?? {};
    overrides = applyField({ ...base, ...overrides }, field, hex);
    const next: Record<string, string> = {};
    for (const [key, value] of Object.entries(overrides)) {
      if (base[key] && normalizeHex(base[key]) !== normalizeHex(value)) {
        next[key] = normalizeHex(value);
      }
    }
    overrides = next;
    options.onChange(overrides);
    paintRows();
  };

  contrast.addEventListener("click", (event) => {
    const btn = (event.target as HTMLElement).closest<HTMLButtonElement>(
      ".cd-contrast-apply",
    );
    if (!btn?.dataset.fieldId || !btn.dataset.hex) return;
    const field = OVERLAY_COLOR_FIELDS.find((item) => item.id === btn.dataset.fieldId);
    if (!field) return;
    commitField(field, btn.dataset.hex);
  });

  for (const field of OVERLAY_COLOR_FIELDS) {
    const row = document.createElement("div");
    row.className = "cd-row";
    const label = document.createElement("span");
    label.textContent = field.label;
    const swatch = document.createElement("button");
    swatch.type = "button";
    swatch.className = "cd-swatch";
    swatch.title = "Open color wheel";
    const hex = document.createElement("input");
    hex.className = "cd-hex";
    hex.spellcheck = false;
    hex.maxLength = 7;
    swatch.addEventListener("click", () => {
      openPicker(swatch, root, field.label, (value) => commitField(field, value));
    });
    hex.addEventListener("change", () => {
      const value = hex.value.startsWith("#") ? hex.value : `#${hex.value}`;
      commitField(field, value);
    });
    row.append(label, swatch, hex);
    row.dataset.fieldId = field.id;
    list.append(row);
    controls.set(field.id, { swatch, hex });
  }

  reset.addEventListener("click", () => {
    overrides = {};
    options.onReset();
    paintRows();
  });

  exportBtn.addEventListener("click", () => {
    const blob = new Blob(
      [
        JSON.stringify(
          {
            centralThemes: 1,
            name: theme.label,
            theme: theme.id,
            vars: currentVars(theme, overrides),
            overrides,
          },
          null,
          2,
        ),
      ],
      { type: "application/json" },
    );
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `central-themes-${slugify(theme.label)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  });

  importBtn.addEventListener("click", () => importInput.click());
  importInput.addEventListener("change", async () => {
    const file = importInput.files?.[0];
    importInput.value = "";
    if (!file) return;
    const raw = await file.text();
    const parsed = parsePaletteFile(raw, theme.vars);
    if (!parsed) return;
    overrides = parsed.overrides;
    options.onChange(overrides);
    paintRows();
  });

  const refresh = (nextTheme: ThemeDefinition, nextOverrides: Record<string, string>) => {
    theme = nextTheme;
    overrides = { ...nextOverrides };
    title.textContent = canCustomize(nextTheme)
      ? `Customize Profile: ${nextTheme.label}`
      : nextTheme.label;
    reset.disabled = !canCustomize(nextTheme);
    exportBtn.disabled = !canCustomize(nextTheme);
    importBtn.disabled = !canCustomize(nextTheme);
    list.style.display = canCustomize(nextTheme) ? "flex" : "none";
    paintRows();
  };

  refresh(options.theme, options.overrides);
  return {
    root,
    refresh,
    openField: (fieldId: string) => {
      const field = OVERLAY_COLOR_FIELDS.find((item) => item.id === fieldId);
      const pair = controls.get(fieldId);
      if (!field || !pair) return;
      pair.swatch.scrollIntoView({ block: "nearest" });
      openPicker(pair.swatch, root, field.label, (value) =>
        commitField(field, value),
      );
    },
    setEyedropActive: (active: boolean) => {
      eyedrop.classList.toggle("cd-eyedrop-on", active);
      eyedrop.textContent = active ? "Click page…" : "Select";
    },
  };
}
