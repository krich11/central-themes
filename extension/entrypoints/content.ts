import { storage } from "wxt/utils/storage";
import { applyTheme, readFastOverrides, readFastProfiles, readFastTheme } from "../lib/apply";
import { CUSTOMIZER_CSS, mountCustomizer, type CustomizerHandle } from "../lib/customizer";
import {
  CD_OVERRIDES_STORAGE_KEY,
  canCustomize,
  matchOverlayField,
  mergeTheme,
  overridesFor,
  type ThemeOverrides,
} from "../lib/palette";
import {
  CD_PROFILES_STORAGE_KEY,
  resolveTheme,
  sanitizeProfiles,
  type CustomProfile,
} from "../lib/profiles";
import {
  CD_PING,
  CD_TOGGLE_CUSTOMIZER,
  DEFAULT_THEME,
  THEMES,
  type ThemeDefinition,
} from "../lib/themes";

const themeStorage = storage.defineItem<string>("local:cd-theme", {
  fallback: DEFAULT_THEME,
});

const overrideStorage = storage.defineItem<ThemeOverrides>(
  `local:${CD_OVERRIDES_STORAGE_KEY}`,
  { fallback: {} },
);

const profileStorage = storage.defineItem<CustomProfile[]>(
  `local:${CD_PROFILES_STORAGE_KEY}`,
  { fallback: [] },
);

const HOST_ID = "central-dark-customizer-host";

let eyedropStop: (() => void) | null = null;

function stopEyedrop(handle?: CustomizerHandle) {
  eyedropStop?.();
  eyedropStop = null;
  handle?.setEyedropActive(false);
}

function startEyedrop(handle: CustomizerHandle, theme: ThemeDefinition) {
  stopEyedrop();
  handle.setEyedropActive(true);
  const highlight = document.createElement("div");
  highlight.style.cssText = [
    "position:fixed",
    "pointer-events:none",
    "z-index:2147483645",
    "border:2px solid #01ce9e",
    "background:rgba(1,206,158,0.1)",
    "display:none",
  ].join(";");
  document.documentElement.append(highlight);
  document.body.style.cursor = "crosshair";

  const onMove = (event: PointerEvent) => {
    const el = document.elementFromPoint(event.clientX, event.clientY);
    if (!el || el.id === HOST_ID || el.closest(`#${HOST_ID}`)) {
      highlight.style.display = "none";
      return;
    }
    const box = el.getBoundingClientRect();
    highlight.style.display = "block";
    highlight.style.left = `${box.left}px`;
    highlight.style.top = `${box.top}px`;
    highlight.style.width = `${box.width}px`;
    highlight.style.height = `${box.height}px`;
  };

  const swallow = (event: Event) => {
    const path = event.composedPath();
    if (path.some((node) => node instanceof Element && node.id === HOST_ID)) {
      return false;
    }
    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();
    return true;
  };

  const onDown = (event: PointerEvent) => {
    if (!swallow(event)) return;
    highlight.style.display = "none";
    const el = document.elementFromPoint(event.clientX, event.clientY);
    void (async () => {
      const all = await overrideStorage.getValue();
      const vars = mergeTheme(theme, overridesFor(all, theme.id)).vars ?? {};
      const field = el ? matchOverlayField(el, vars) : null;
      if (field) handle.openField(field.id);
    })();
  };

  const onClick = (event: Event) => {
    if (!swallow(event)) return;
    stopEyedrop(handle);
  };

  const onKey = (event: KeyboardEvent) => {
    if (event.key === "Escape") stopEyedrop(handle);
  };

  document.addEventListener("pointermove", onMove, true);
  document.addEventListener("pointerdown", onDown, true);
  document.addEventListener("pointerup", swallow, true);
  document.addEventListener("click", onClick, true);
  document.addEventListener("auxclick", swallow, true);
  document.addEventListener("keydown", onKey, true);
  eyedropStop = () => {
    highlight.remove();
    document.body.style.cursor = "";
    document.removeEventListener("pointermove", onMove, true);
    document.removeEventListener("pointerdown", onDown, true);
    document.removeEventListener("pointerup", swallow, true);
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("auxclick", swallow, true);
    document.removeEventListener("keydown", onKey, true);
  };
}

function closeCustomizer() {
  stopEyedrop();
  document.getElementById(HOST_ID)?.remove();
}

async function currentTheme(): Promise<ThemeDefinition> {
  const stored = await themeStorage.getValue();
  const profiles = sanitizeProfiles(await profileStorage.getValue());
  return resolveTheme(stored, profiles) ?? THEMES[DEFAULT_THEME];
}

async function persistOverrides(
  id: string,
  next: Record<string, string>,
): Promise<void> {
  const all = { ...(await overrideStorage.getValue()) };
  if (Object.keys(next).length === 0) delete all[id];
  else all[id] = next;
  await overrideStorage.setValue(all);
}

function enableDrag(host: HTMLElement, handle: HTMLElement) {
  let startX = 0;
  let startY = 0;
  let origX = 0;
  let origY = 0;
  handle.style.cursor = "move";
  handle.addEventListener("pointerdown", (event) => {
    if ((event.target as HTMLElement).closest("button")) return;
    startX = event.clientX;
    startY = event.clientY;
    const rect = host.getBoundingClientRect();
    origX = rect.left;
    origY = rect.top;
    handle.setPointerCapture(event.pointerId);
  });
  handle.addEventListener("pointermove", (event) => {
    if (!handle.hasPointerCapture(event.pointerId)) return;
    host.style.left = `${origX + event.clientX - startX}px`;
    host.style.top = `${origY + event.clientY - startY}px`;
    host.style.right = "auto";
  });
}

async function openCustomizer() {
  closeCustomizer();
  const theme = await currentTheme();
  if (!canCustomize(theme)) return;

  const host = document.createElement("div");
  host.id = HOST_ID;
  host.style.cssText = [
    "position:fixed",
    "top:72px",
    "right:16px",
    "z-index:2147483646",
    "width:344px",
    "background:#1e1f22",
    "border:1px solid #5f6368",
    "border-radius:10px",
    "padding:12px",
    "box-shadow:0 12px 40px rgba(0,0,0,.45)",
    "max-height:min(80vh, 640px)",
    "overflow:hidden",
    "display:flex",
    "flex-direction:column",
  ].join(";");
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `${CUSTOMIZER_CSS}
:host { display: flex; flex-direction: column; min-height: 0; }`;
  const shell = document.createElement("div");
  shell.style.cssText =
    "display:flex;flex-direction:column;min-height:0;flex:1;height:100%";
  shadow.append(style, shell);

  const all = await overrideStorage.getValue();
  const handle = mountCustomizer(shell, {
    theme,
    overrides: overridesFor(all, theme.id),
    onClose: closeCustomizer,
    onChange: (next) => {
      void persistOverrides(theme.id, next);
    },
    onReset: () => {
      void persistOverrides(theme.id, {});
    },
    onEyedropper: () => {
      if (eyedropStop) stopEyedrop(handle);
      else startEyedrop(handle, theme);
    },
    note: "Changes apply live on this page. Drag the header to move. Select: click a control to open its swatch. Esc cancels.",
  });
  const chrome = handle.root.querySelector(".cd-customizer-chrome");
  if (chrome instanceof HTMLElement) enableDrag(host, chrome);

  document.documentElement.append(host);
}

async function applyFromStorage() {
  const theme = await currentTheme();
  const all = await overrideStorage.getValue();
  const profiles = sanitizeProfiles(await profileStorage.getValue());
  applyTheme(theme.id, all, profiles);
}

export default defineContentScript({
  matches: [
    "https://internal-ui.central.arubanetworks.com/*",
    "https://*.central.arubanetworks.com/*",
  ],
  runAt: "document_start",
  allFrames: false,
  main() {
    applyTheme(readFastTheme(), readFastOverrides());
    void applyFromStorage();

    themeStorage.watch(() => {
      closeCustomizer();
      void applyFromStorage();
    });
    overrideStorage.watch(() => {
      void applyFromStorage();
    });
    profileStorage.watch(() => {
      void applyFromStorage();
    });

    browser.runtime.onMessage.addListener((message) => {
      if (
        message &&
        typeof message === "object" &&
        "type" in message &&
        message.type === CD_PING
      ) {
        return Promise.resolve({ ok: true });
      }
      if (
        message &&
        typeof message === "object" &&
        "type" in message &&
        message.type === CD_TOGGLE_CUSTOMIZER
      ) {
        const existing = document.getElementById(HOST_ID);
        if (existing) closeCustomizer();
        else void openCustomizer();
        return Promise.resolve({
          ok: true,
          theme: (
            resolveTheme(readFastTheme(), readFastProfiles()) ??
            THEMES[DEFAULT_THEME]
          ).label,
        });
      }
      return undefined;
    });
  },
});
