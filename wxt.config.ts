import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "extension",
  outDir: ".output",
  publicDir: "public",
  manifest: {
    name: "Central Themes",
    description:
      "Themes for Aruba Central: Central Light, Dim, Midnight, High Contrast, and native Central Dark.",
    version: "0.2.7",
    permissions: ["storage", "activeTab"],
    host_permissions: [
      "https://internal-ui.central.arubanetworks.com/*",
      "https://*.central.arubanetworks.com/*",
    ],
    action: {
      default_title: "Central Themes",
      default_icon: {
        16: "icon-16.png",
        32: "icon-32.png",
        48: "icon-48.png",
        128: "icon-128.png",
      },
    },
    icons: {
      16: "icon-16.png",
      32: "icon-32.png",
      48: "icon-48.png",
      128: "icon-128.png",
    },
    browser_specific_settings: {
      gecko: {
        id: "central-themes@local",
        strict_min_version: "121.0",
      },
    },
  },
});
