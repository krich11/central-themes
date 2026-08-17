import { storage } from "wxt/utils/storage";
import { applyTheme, readFastTheme } from "../lib/apply";
import { DEFAULT_THEME, isThemeId, type ThemeId } from "../lib/themes";

const themeStorage = storage.defineItem<ThemeId>("local:cd-theme", {
  fallback: DEFAULT_THEME,
});

export default defineContentScript({
  matches: [
    "https://internal-ui.central.arubanetworks.com/*",
    "https://*.central.arubanetworks.com/*",
  ],
  runAt: "document_start",
  allFrames: false,
  main() {
    applyTheme(readFastTheme());

    void themeStorage.getValue().then((stored) => {
      if (isThemeId(stored) && stored !== readFastTheme()) {
        applyTheme(stored);
      } else if (isThemeId(stored)) {
        applyTheme(stored);
      }
    });

    themeStorage.watch((value) => {
      if (isThemeId(value)) applyTheme(value);
    });
  },
});
