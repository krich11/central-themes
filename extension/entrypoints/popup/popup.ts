import { storage } from "wxt/utils/storage";
import {
  CD_OVERRIDES_STORAGE_KEY,
  canCustomize,
  mergeTheme,
  overridesFor,
  parsePaletteFile,
  type ThemeOverrides,
} from "../../lib/palette";
import {
  CD_PROFILES_STORAGE_KEY,
  cloneProfile,
  isCustomId,
  resolveTheme,
  sanitizeProfiles,
  slugify,
  type CustomProfile,
} from "../../lib/profiles";
import {
  CD_PING,
  CD_TOGGLE_CUSTOMIZER,
  DEFAULT_THEME,
  THEME_IDS,
  THEMES,
  isThemeId,
} from "../../lib/themes";

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

const toggle = document.querySelector<HTMLButtonElement>("#theme-toggle");
const currentLabel = document.querySelector<HTMLSpanElement>("#theme-current");
const panel = document.querySelector<HTMLDivElement>("#theme-panel");
const hint = document.querySelector<HTMLParagraphElement>("#hint");
const notice = document.querySelector<HTMLParagraphElement>("#notice");
const customize = document.querySelector<HTMLButtonElement>("#customize");
const exportBtn = document.querySelector<HTMLButtonElement>("#export");
const importBtn = document.querySelector<HTMLButtonElement>("#import");
const importFile = document.querySelector<HTMLInputElement>("#import-file");
const versionEl = document.querySelector<HTMLSpanElement>("#version");
const statusEl = document.querySelector<HTMLSpanElement>("#status");
const createRow = document.querySelector<HTMLDivElement>("#create-row");
const profileName = document.querySelector<HTMLInputElement>("#profile-name");
const createBtn = document.querySelector<HTMLButtonElement>("#create-profile");
const cancelCreate = document.querySelector<HTMLButtonElement>("#cancel-create");

if (
  !toggle ||
  !currentLabel ||
  !panel ||
  !hint ||
  !notice ||
  !customize ||
  !exportBtn ||
  !importBtn ||
  !importFile ||
  !versionEl ||
  !statusEl ||
  !createRow ||
  !profileName ||
  !createBtn ||
  !cancelCreate
) {
  throw new Error("Popup markup missing");
}

let profiles: CustomProfile[] = sanitizeProfiles(await profileStorage.getValue());
const stored = await themeStorage.getValue();
let current = resolveTheme(stored, profiles)?.id ?? DEFAULT_THEME;
let menuOpen = false;

const TRASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

function currentTheme() {
  return resolveTheme(current, profiles) ?? THEMES[DEFAULT_THEME];
}

function setMenuOpen(open: boolean) {
  menuOpen = open;
  panel.hidden = !open;
  toggle.setAttribute("aria-expanded", open ? "true" : "false");
  if (open) fillMenu();
}

function addPick(
  parent: HTMLElement,
  id: string,
  label: string,
  canDelete: boolean,
) {
  const row = document.createElement("div");
  row.className = "theme-item";
  if (id === current) row.classList.add("is-current");
  row.setAttribute("role", "option");
  row.setAttribute("aria-selected", id === current ? "true" : "false");
  const pick = document.createElement("button");
  pick.type = "button";
  pick.className = "pick";
  pick.textContent = label;
  pick.addEventListener("click", () => {
    void selectProfile(id);
  });
  row.append(pick);
  if (canDelete) {
    const trash = document.createElement("button");
    trash.type = "button";
    trash.className = "trash";
    trash.title = `Delete ${label}`;
    trash.setAttribute("aria-label", `Delete ${label}`);
    trash.innerHTML = TRASH_SVG;
    trash.addEventListener("click", (event) => {
      event.stopPropagation();
      void deleteProfile(id);
    });
    row.append(trash);
  }
  parent.append(row);
}

function fillMenu() {
  panel.replaceChildren();
  const defaults = document.createElement("div");
  defaults.className = "theme-group";
  defaults.textContent = "Default profiles";
  panel.append(defaults);
  for (const id of THEME_IDS) {
    addPick(panel, id, THEMES[id].label, false);
  }
  if (profiles.length) {
    const sep = document.createElement("div");
    sep.className = "theme-sep";
    panel.append(sep);
    const group = document.createElement("div");
    group.className = "theme-group";
    group.textContent = "My profiles";
    panel.append(group);
    for (const profile of profiles) {
      addPick(panel, profile.id, profile.name, true);
    }
  }
  const sep = document.createElement("div");
  sep.className = "theme-sep";
  panel.append(sep);
  const customRow = document.createElement("div");
  customRow.className = "theme-item";
  const customBtn = document.createElement("button");
  customBtn.type = "button";
  customBtn.className = "pick";
  customBtn.textContent = "Custom…";
  customBtn.addEventListener("click", () => {
    setMenuOpen(false);
    showCreate();
  });
  customRow.append(customBtn);
  panel.append(customRow);
}

function paintToggle() {
  currentLabel.textContent = currentTheme().label;
}

function setHint() {
  const theme = currentTheme();
  hint.textContent = canCustomize(theme)
    ? `${theme.description} Customize opens a floating card on Aruba Central.`
    : theme.description;
  customize.disabled = !canCustomize(theme);
  exportBtn.disabled = !canCustomize(theme);
  paintToggle();
}

async function selectProfile(id: string) {
  if (!resolveTheme(id, profiles)) return;
  hideCreate();
  notice.hidden = true;
  current = id;
  await themeStorage.setValue(id);
  setHint();
  setMenuOpen(false);
}

async function deleteProfile(id: string) {
  if (!isCustomId(id)) return;
  const profile = profiles.find((item) => item.id === id);
  if (!profile) return;
  if (!window.confirm(`Delete profile “${profile.name}”?`)) return;
  profiles = profiles.filter((item) => item.id !== id);
  await profileStorage.setValue(profiles);
  const all = { ...(await overrideStorage.getValue()) };
  delete all[id];
  await overrideStorage.setValue(all);
  if (current === id) {
    current = resolveTheme(profile.basedOn, profiles)?.id ?? DEFAULT_THEME;
    await themeStorage.setValue(current);
  }
  setHint();
  fillMenu();
}

function showNotice(text: string) {
  notice.hidden = false;
  notice.textContent = text;
}

function hideCreate() {
  createRow.hidden = true;
  profileName.value = "";
}

function showCreate() {
  createRow.hidden = false;
  profileName.value = currentTheme().label;
  profileName.focus();
  profileName.select();
}

function isCentralUrl(url: string | undefined): boolean {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return (
      host === "internal-ui.central.arubanetworks.com" ||
      host.endsWith(".central.arubanetworks.com")
    );
  } catch {
    return false;
  }
}

setHint();

toggle.addEventListener("click", () => {
  setMenuOpen(!menuOpen);
});

document.addEventListener("click", (event) => {
  if (!menuOpen) return;
  const target = event.target;
  if (!(target instanceof Node)) return;
  if (toggle.contains(target) || panel.contains(target)) return;
  setMenuOpen(false);
});

document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && menuOpen) setMenuOpen(false);
});

async function createProfile() {
  const requested = profileName.value.trim();
  if (!requested) {
    profileName.focus();
    return;
  }
  const source = mergeTheme(
    currentTheme(),
    overridesFor(await overrideStorage.getValue(), current),
  );
  const profile = cloneProfile(source, requested, profiles);
  profiles = [...profiles, profile];
  await profileStorage.setValue(profiles);
  current = profile.id;
  await themeStorage.setValue(profile.id);
  hideCreate();
  setHint();
}

createBtn.addEventListener("click", () => {
  void createProfile();
});
cancelCreate.addEventListener("click", () => {
  hideCreate();
});
profileName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void createProfile();
  }
  if (event.key === "Escape") hideCreate();
});

customize.addEventListener("click", async () => {
  if (!canCustomize(currentTheme())) return;
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!isCentralUrl(tab?.url)) {
    showNotice("This tab is not Aruba Central. Open a Central page, then click Customize.");
    return;
  }
  if (!tab?.id) {
    showNotice("Could not reach this tab. Refresh Central and try again.");
    return;
  }
  try {
    await browser.tabs.sendMessage(tab.id, { type: CD_TOGGLE_CUSTOMIZER });
    window.close();
  } catch {
    showNotice(
      "Refresh this Central tab so the updated extension can attach, then click Customize again.",
    );
  }
});

exportBtn.addEventListener("click", async () => {
  const theme = currentTheme();
  if (!canCustomize(theme) || !theme.vars) {
    showNotice("Export is for overlay and custom profiles.");
    return;
  }
  notice.hidden = true;
  const merged = mergeTheme(
    theme,
    overridesFor(await overrideStorage.getValue(), current),
  );
  const blob = new Blob(
    [
      JSON.stringify(
        {
          centralThemes: 1,
          name: theme.label,
          theme: theme.id,
          vars: merged.vars,
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

importBtn.addEventListener("click", () => importFile.click());
importFile.addEventListener("change", async () => {
  const file = importFile.files?.[0];
  importFile.value = "";
  if (!file) return;
  const parsed = parsePaletteFile(await file.text(), undefined);
  if (!parsed || !Object.keys(parsed.vars).length) {
    showNotice("That file is not a Central Themes palette.");
    return;
  }
  const live = currentTheme();
  const seed =
    parsed.themeId && isThemeId(parsed.themeId) && THEMES[parsed.themeId].vars
      ? THEMES[parsed.themeId]
      : live.kind === "overlay" && live.vars
        ? live
        : THEMES.dim;
  const source = {
    ...seed,
    vars: { ...(seed.vars ?? {}), ...parsed.vars },
  };
  const profile = cloneProfile(
    source,
    parsed.name || file.name.replace(/\.json$/i, "") || "Imported",
    profiles,
  );
  profiles = [...profiles, profile];
  await profileStorage.setValue(profiles);
  current = profile.id;
  await themeStorage.setValue(profile.id);
  notice.hidden = true;
  hideCreate();
  setHint();
});

function setStatus(kind: "red" | "yellow" | "green", title: string) {
  statusEl.className = `status status-${kind}`;
  statusEl.title = title;
}

versionEl.textContent = browser.runtime.getManifest().version;

async function detectCentral() {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!isCentralUrl(tab?.url)) {
    setStatus("red", "This tab is not Aruba Central");
    return;
  }
  if (!tab?.id) {
    setStatus("yellow", "Central URL, but this tab cannot be reached");
    return;
  }
  try {
    await browser.tabs.sendMessage(tab.id, { type: CD_PING });
    setStatus("green", "Aruba Central recognized");
  } catch {
    setStatus("yellow", "Central URL — refresh so the extension can attach");
  }
}

void detectCentral();
