import {
  CD_RELOAD_FLAG,
  CD_THEME_STORAGE_KEY,
  DEFAULT_THEME,
  NATIVE_THEME_STORAGE_KEY,
  THEMES,
  isThemeId,
  overlayCss,
  type ThemeId,
} from "./themes";

const STYLE_ID = "central-dark-theme-vars";

export function readFastTheme(): ThemeId {
  try {
    const raw = localStorage.getItem(CD_THEME_STORAGE_KEY);
    if (isThemeId(raw)) return raw;
  } catch {
    /* ignore */
  }
  return DEFAULT_THEME;
}

export function writeFastTheme(id: ThemeId): void {
  try {
    localStorage.setItem(CD_THEME_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
}

function desiredNative(id: ThemeId): "light" | "dark" {
  return THEMES[id].native;
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
export function syncNativeTheme(id: ThemeId): boolean {
  const want = desiredNative(id);
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

export function applyOverlay(id: ThemeId): void {
  const theme = THEMES[id];
  document.documentElement.dataset.cdTheme = id;

  const existing = document.getElementById(STYLE_ID);
  if (theme.kind !== "overlay" || !theme.vars) {
    existing?.remove();
    if (theme.kind === "native") {
      delete document.documentElement.dataset.cdTheme;
    }
    return;
  }

  const css = overlayCss(theme);
  if (existing instanceof HTMLStyleElement) {
    existing.textContent = css;
    return;
  }
  const el = document.createElement("style");
  el.id = STYLE_ID;
  el.textContent = css;
  (document.head ?? document.documentElement).appendChild(el);
}

export function applyTheme(id: ThemeId): void {
  writeFastTheme(id);
  if (syncNativeTheme(id)) return;
  applyOverlay(id);
}
