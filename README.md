# Central Themes

Browser extension that themes Aruba Central (Gravity) without inverting maps or photos.

## Themes

| Menu label | What it does |
| --- | --- |
| **Central Light** | Stock light UI. No overlay. Sets `localStorage.cnx-ui-theme` to `light`. |
| **Dim** | Gray overlay on light Central. |
| **Midnight** | Charcoal overlay (our dark look). Named this so it does not clash with native Central Dark. |
| **High Contrast** | Near-black, high contrast. |
| **Central Dark** | Aruba Central’s built-in dark theme (`cnx-ui-theme=dark`). Reloads once when switching to or from it. |

The popup dropdown is the selector for now. An in-page theme button comes later.

## Load in Edge (or Chrome)

1. `npm install`
2. `npm run build`
3. Edge: `edge://extensions` → Developer mode → Load unpacked
4. Pick `.output/chrome-mv3`

Firefox: `npm run build:firefox` then load `.output/firefox-mv3`.

Safari needs a Mac + converter; the codebase stays MV3.

## Hosts

- `https://internal-ui.central.arubanetworks.com/*`
- `https://*.central.arubanetworks.com/*`
