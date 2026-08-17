import { storage } from "wxt/utils/storage";
import {
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

if (!select || !hint) {
  throw new Error("Popup markup missing");
}

for (const id of THEME_IDS) {
  const opt = document.createElement("option");
  opt.value = id;
  opt.textContent = THEMES[id].label;
  select.append(opt);
}

function setHint(id: ThemeId) {
  hint.textContent = THEMES[id].description;
}

const initial = await themeStorage.getValue();
const current = isThemeId(initial) ? initial : DEFAULT_THEME;
select.value = current;
setHint(current);

select.addEventListener("change", async () => {
  const id = select.value;
  if (!isThemeId(id)) return;
  await themeStorage.setValue(id);
  setHint(id);
});
