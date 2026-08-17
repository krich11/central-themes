# Central Themes

Unofficial browser extension that themes [Aruba Central](https://www.arubanetworks.com/products/network-management-operations/central/).

This project is not affiliated with HPE or Aruba.

![Extension popup](docs/screenshots/popup.png)

## What it does (v0.2.6)

- Five themes from a popup menu: **Central Light**, **Dim**, **Midnight**, **High Contrast**, and native **Central Dark**
- Overlay themes sit on Central’s light UI and remap Gravity CSS variables
- **Customize** opens a floating card on Central so you can edit colors live
- **Select** maps a click on the page to the matching swatch
- Settings stay in the browser (`chrome.storage.local`). No accounts, no analytics, no network calls from the extension

## Themes

| Menu label | Behavior |
| --- | --- |
| **Central Light** | Stock light UI. No changes. |
| **Dim** | Gray overlay on native light. |
| **Midnight** | Charcoal overlay. |
| **High Contrast** | Near-black overlay. |
| **Central Dark** | Aruba Central’s built-in dark theme. Reloads once when switching to or from it. |

Customize is available on Dim, Midnight, and High Contrast.

## Install

End users: download the zip from GitHub Releases. Do not clone the repo.

**[Download 0.2.6 (Chrome / Edge zip)](https://github.com/krich11/central-themes/releases/download/v0.2.6/central-themes-0.2.6-chrome.zip)**

All versions: [Releases](https://github.com/krich11/central-themes/releases) · step-by-step: [docs/install.md](docs/install.md)

1. Download `central-themes-0.2.6-chrome.zip` (that file only — not Source code)
2. Unzip it
3. Edge or Chrome → `edge://extensions` / `chrome://extensions` → **Developer mode** → **Load unpacked**
4. Select the unzipped folder that contains `manifest.json`
5. Open Aruba Central and **refresh that tab**

## Customize

Open the extension popup on a Central tab, pick an overlay theme, then click **Customize**.

![Swatch list](docs/screenshots/swatches.png)

- **Reset** restores that theme’s built-in defaults
- **Select** then click a control on the page to open its swatch
- Click a color chip to open the picker (**Palette** or **Wheel**)

![Palette picker](docs/screenshots/picker-palette.png)
![Wheel picker](docs/screenshots/picker-wheel.png)

Full walkthrough: [docs/customize.md](docs/customize.md)

## Permissions

| Permission | Why |
| --- | --- |
| `storage` | Remember the selected theme and color overrides |
| `activeTab` | Tell the current Central tab to open the customizer |
| Hosts `https://*.central.arubanetworks.com/*` and `https://internal-ui.central.arubanetworks.com/*` | Inject the overlay and customizer on Central only |

## Development

Build from source if you are changing the extension:

```bash
npm install
npm run build
```

Load unpacked from `.output/chrome-mv3`. Firefox: `npm run build:firefox`, then `.output/firefox-mv3`. Zip a Chrome package with `npm run zip` and attach it to a GitHub Release.

Source lives in `extension/`.

## Issues

Support is **best-effort**. If something is broken or looks wrong, [open a GitHub issue](https://github.com/krich11/central-themes/issues). Include the theme you were using, the Central page you were on, and what you expected.

## License

[MIT](LICENSE)

Screenshots in `docs/screenshots/` show **this extension’s UI only**, not Aruba Central product screens.
