import { storage } from "wxt/utils/storage";
import {
  CD_OVERRIDES_STORAGE_KEY,
  canCustomize,
  mergeTheme,
  overridesFor,
  type ThemeOverrides,
} from "../../lib/palette";
import {
  CD_PROFILES_STORAGE_KEY,
  CUSTOM_OPTION,
  cloneProfile,
  resolveTheme,
  sanitizeProfiles,
  type CustomProfile,
} from "../../lib/profiles";
import {
  CD_PING,
  CD_TOGGLE_CUSTOMIZER,
  DEFAULT_THEME,
  THEME_IDS,
  THEMES,
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

const select = document.querySelector<HTMLSelectElement>("#theme");
const hint = document.querySelector<HTMLParagraphElement>("#hint");
const notice = document.querySelector<HTMLParagraphElement>("#notice");
const customize = document.querySelector<HTMLButtonElement>("#customize");
const versionEl = document.querySelector<HTMLSpanElement>("#version");
const statusEl = document.querySelector<HTMLSpanElement>("#status");
const createRow = document.querySelector<HTMLDivElement>("#create-row");
const profileName = document.querySelector<HTMLInputElement>("#profile-name");
const createBtn = document.querySelector<HTMLButtonElement>("#create-profile");
const cancelCreate = document.querySelector<HTMLButtonElement>("#cancel-create");
const profileList = document.querySelector<HTMLDivElement>("#profile-list");

if (
  !select ||
  !hint ||
  !notice ||
  !customize ||
  !versionEl ||
  !statusEl ||
  !createRow ||
  !profileName ||
  !createBtn ||
  !cancelCreate ||
  !profileList
) {
  throw new Error("Popup markup missing");
}

let profiles: CustomProfile[] = sanitizeProfiles(await profileStorage.getValue());
const stored = await themeStorage.getValue();
let current = resolveTheme(stored, profiles)?.id ?? DEFAULT_THEME;

const TRASH_SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>`;

function fillSelect() {
  select.replaceChildren();
  for (const id of THEME_IDS) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = THEMES[id].label;
    select.append(opt);
  }
  if (profiles.length) {
    const group = document.createElement("optgroup");
    group.label = "My profiles";
    for (const profile of profiles) {
      const opt = document.createElement("option");
      opt.value = profile.id;
      opt.textContent = profile.name;
      group.append(opt);
    }
    select.append(group);
  }
  const custom = document.createElement("option");
  custom.value = CUSTOM_OPTION;
  custom.textContent = "Custom…";
  select.append(custom);
  select.value = current;
  fillProfileList();
}

function fillProfileList() {
  profileList.replaceChildren();
  profileList.hidden = profiles.length === 0;
  for (const profile of profiles) {
    const row = document.createElement("div");
    row.className = "profile-row";
    if (profile.id === current) row.classList.add("is-current");
    const pick = document.createElement("button");
    pick.type = "button";
    pick.className = "profile-pick";
    pick.textContent = profile.name;
    pick.addEventListener("click", () => {
      void selectProfile(profile.id);
    });
    const trash = document.createElement("button");
    trash.type = "button";
    trash.className = "trash";
    trash.title = `Delete ${profile.name}`;
    trash.setAttribute("aria-label", `Delete ${profile.name}`);
    trash.innerHTML = TRASH_SVG;
    trash.addEventListener("click", (event) => {
      event.stopPropagation();
      void deleteProfile(profile.id);
    });
    row.append(pick, trash);
    profileList.append(row);
  }
}

async function selectProfile(id: string) {
  if (!resolveTheme(id, profiles)) return;
  hideCreate();
  notice.hidden = true;
  current = id;
  select.value = id;
  await themeStorage.setValue(id);
  setHint();
  fillProfileList();
}

async function deleteProfile(id: string) {
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
  fillSelect();
  setHint();
}

function currentTheme() {
  return resolveTheme(current, profiles) ?? THEMES[DEFAULT_THEME];
}

function setHint() {
  const theme = currentTheme();
  hint.textContent = canCustomize(theme)
    ? `${theme.description} Customize opens a floating card on Aruba Central.`
    : theme.description;
  customize.disabled = !canCustomize(theme);
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

fillSelect();
setHint();

select.addEventListener("change", async () => {
  const id = select.value;
  notice.hidden = true;
  if (id === CUSTOM_OPTION) {
    select.value = current;
    showCreate();
    return;
  }
  hideCreate();
  if (!resolveTheme(id, profiles)) {
    select.value = current;
    return;
  }
  current = id;
  await themeStorage.setValue(id);
  setHint();
  fillProfileList();
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
  fillSelect();
  setHint();
}

createBtn.addEventListener("click", () => {
  void createProfile();
});
cancelCreate.addEventListener("click", () => {
  hideCreate();
  select.value = current;
});
profileName.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    event.preventDefault();
    void createProfile();
  }
  if (event.key === "Escape") {
    hideCreate();
    select.value = current;
  }
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
