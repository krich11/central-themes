import {
  CD_RELOAD_FLAG,
  CD_THEME_STORAGE_KEY,
  DEFAULT_THEME,
  NATIVE_THEME_STORAGE_KEY,
  THEMES,
  isThemeId,
  overlayCss,
  type ThemeDefinition,
} from "./themes";
import {
  CD_OVERRIDES_STORAGE_KEY,
  mergeTheme,
  type ThemeOverrides,
} from "./palette";
import {
  CD_PROFILES_STORAGE_KEY,
  resolveTheme,
  sanitizeProfiles,
  type CustomProfile,
} from "./profiles";

const STYLE_ID = "central-dark-theme-vars";

export function readFastTheme(): string {
  try {
    const raw = localStorage.getItem(CD_THEME_STORAGE_KEY);
    if (isThemeId(raw)) return raw;
    if (raw && resolveTheme(raw, readFastProfiles())) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

export function writeFastTheme(id: string): void {
  try {
    localStorage.setItem(CD_THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

export function readFastOverrides(): ThemeOverrides {
  try {
    const raw = localStorage.getItem(CD_OVERRIDES_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as ThemeOverrides;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function writeFastOverrides(all: ThemeOverrides): void {
  try {
    localStorage.setItem(CD_OVERRIDES_STORAGE_KEY, JSON.stringify(all));
  } catch {
    /* ignore */
  }
}

export function readFastProfiles(): CustomProfile[] {
  try {
    const raw = localStorage.getItem(CD_PROFILES_STORAGE_KEY);
    if (!raw) return [];
    return sanitizeProfiles(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function writeFastProfiles(profiles: CustomProfile[]): void {
  try {
    localStorage.setItem(CD_PROFILES_STORAGE_KEY, JSON.stringify(profiles));
  } catch {
    /* ignore */
  }
}

function currentNative(): "light" | "dark" {
  try {
    return localStorage.getItem(NATIVE_THEME_STORAGE_KEY) === "dark"
      ? "dark"
      : "light";
  } catch {
    return "light";
  }
}

/** Align Central’s own cnx-ui-theme. Reloads once if it must change. */
export function syncNativeTheme(want: "light" | "dark"): boolean {
  const have = currentNative();
  if (want === have) {
    try {
      sessionStorage.removeItem(CD_RELOAD_FLAG);
    } catch {
      /* ignore */
    }
    return false;
  }
  try {
    if (sessionStorage.getItem(CD_RELOAD_FLAG) === want) {
      sessionStorage.removeItem(CD_RELOAD_FLAG);
      return false;
    }
    sessionStorage.setItem(CD_RELOAD_FLAG, want);
    localStorage.setItem(NATIVE_THEME_STORAGE_KEY, want);
  } catch {
    return false;
  }
  location.reload();
  return true;
}

/** Apply overlay by setting Gravity CSS variables (not a page invert-filter). */
export function applyOverlay(
  theme: ThemeDefinition,
  overrides?: Record<string, string> | null,
): void {
  const merged = mergeTheme(theme, overrides);
  document.documentElement.dataset.cdTheme = merged.id;

  const existing = document.getElementById(STYLE_ID);
  if (merged.kind !== "overlay" || !merged.vars) {
    existing?.remove();
    if (merged.kind === "native") {
      delete document.documentElement.dataset.cdTheme;
    }
    return;
  }

  const css = overlayCss(merged);
  if (existing instanceof HTMLStyleElement) {
    existing.textContent = css;
    return;
  }
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = css;
  (document.head ?? document.documentElement).appendChild(el);
}

export function applyTheme(
  id: string,
  allOverrides?: ThemeOverrides | null,
  profiles?: CustomProfile[] | null,
): void {
  const catalog = profiles ?? readFastProfiles();
  const theme = resolveTheme(id, catalog) ?? THEMES[DEFAULT_THEME];
  const resolvedId = theme.id;
  writeFastTheme(resolvedId);
  writeFastProfiles(catalog);
  const overrides = allOverrides ?? readFastOverrides();
  if (allOverrides) writeFastOverrides(allOverrides);
  if (syncNativeTheme(theme.native)) return;
  applyOverlay(theme, overrides[resolvedId]);
}
