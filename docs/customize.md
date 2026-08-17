# Customize

This page documents the extension chrome: the popup menu, the floating swatch list, and the color picker. Screenshots are of **Central Themes UI only** — not Aruba Central.

Install the zip first: [Install](install.md).

## Popup menu

Open the toolbar icon on any tab. The menu is the theme selector.

![Popup](screenshots/popup.png)

| Control | What it does |
| --- | --- |
| **Theme** | Central Light, Dim, Midnight, High Contrast, or Central Dark |
| **Customize** | Opens the floating card on the current Central tab |

Customize is disabled for Central Light and Central Dark (those are native Central themes, not overlays). If the active tab is not Central, or Central has not been refreshed after loading the unpacked build, the popup explains what to do instead of opening a settings page.

## Swatch list

On Dim, Midnight, or High Contrast, **Customize** mounts a 390px card on the Central page. Drag the header to move it.

![Swatch list](screenshots/swatches.png)

| Control | What it does |
| --- | --- |
| **Reset** | Drop stored overrides for this theme and restore built-in defaults |
| **Select** | Click a page control to open the matching swatch. Esc cancels. Clicks are swallowed so links do not navigate |
| **Done** | Close the card |
| Color chip | Open the picker for that swatch |
| Hex field | Type a `#rrggbb` value |

Changes apply live. They are stored per theme in `chrome.storage.local` (and mirrored to `localStorage` so the overlay can apply at `document_start`).

### Swatches

| Swatch | Typical Gravity use |
| --- | --- |
| **Page** | Page background |
| **Cards** | Paper / card surfaces |
| **Hover** | Hover fill |
| **Hover (back)** | Secondary hover fill |
| **Text** | Primary body text |
| **Text 2** | Secondary labels: table headers, form labels, Profiles column values |
| **Nav icons** | Home, Menu, and unselected context-bar tab icons (apps, monitoring, location, config) |
| **Text strong** | Strong / emphasis text |
| **Text muted** | Read-only and weak text |
| **Text disabled** | Disabled text |
| **Border** | Default borders |
| **Border strong** | Stronger borders |
| **Border weak** | Subtle borders |
| **HPE green / accent** | Accent, focus, and selected-tab icon color |
| **Selected fill** | Selected toggle background |
| **Aruba orange** | Brand orange token (the logo mark stays stock `#FF8300`) |
| **Status good / delayed / unknown** | Health and status colors |
| **Heatmap good / delayed** | Heatmap segments |

Selected context-bar tabs keep the accent color. Unselected tab icons follow **Nav icons**.

## Color picker

The picker stays inside the card. The header names the swatch you are editing.

### Palette

Named groups of chips (Neutrals, Brand, Status, Standard).

![Palette](screenshots/picker-palette.png)

### Wheel

Saturation/value square plus a hue slider.

![Wheel](screenshots/picker-wheel.png)

## Regenerating screenshots

`docs/preview.html` is a standalone mock of the extension chrome (no Central UI). From the repo:

```bash
python -m http.server 8765 --directory docs
```

Then capture `#shot-popup`, `#shot-swatches`, `#shot-picker-palette`, and `#shot-picker-wheel`.
