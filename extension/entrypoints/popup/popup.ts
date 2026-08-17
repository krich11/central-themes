import { storage } from "wxt/utils/storage";
import { canCustomize } from "../../lib/palette";
import {
  CD_TOGGLE_CUSTOMIZER,
  DEFAULT_THEME,
  THEME_IDS,
  THEMES,
  isThemeId,
  type ThemeId,
} from "../../lib/themes";

const themeStorage = storage.defineItem<ThemeId>("local:cd-theme", {
  fallback: DEFAULT_THEME,
});

const select = document.querySelector<HTMLSelectElement>("#theme");
const hint = document.querySelector<HTMLParagraphElement>("#hint");
const notice = document.querySelector<HTMLParagraphElement>("#notice");
const customize = document.querySelector<HTMLButtonElement>("#customize");

if (!select || !hint || !notice || !customize) {
  throw new Error("Popup markup missing");
}

for (const id of THEME_IDS) {
  const opt = document.createElement("option");
  opt.value = id;
  opt.textContent = THEMES[id].label;
  select.append(opt);
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

function setHint(id: ThemeId) {
  hint.textContent = canCustomize(id)
    ? `${THEMES[id].description} Customize opens a floating card on Aruba Central.`
    : THEMES[id].description;
  customize.disabled = !canCustomize(id);
}

function showNotice(text: string) {
  notice.hidden = false;
  notice.textContent = text;
}

const initial = await themeStorage.getValue();
let current = isThemeId(initial) ? initial : DEFAULT_THEME;
select.value = current;
setHint(current);

select.addEventListener("change", async () => {
  const id = select.value;
  if (!isThemeId(id)) return;
  current = id;
  await themeStorage.setValue(id);
  setHint(id);
  notice.hidden = true;
});

customize.addEventListener("click", async () => {
  if (!canCustomize(current)) return;
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
