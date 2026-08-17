import { defineConfig } from "wxt";

export default defineConfig({
  srcDir: "extension",
  outDir: ".output",
  manifest: {
    name: "Central Dark",
    description:
      "Themes for Aruba Central: Central Light, Dim, Midnight, High Contrast, and native Central Dark.",
    version: "0.2.0",
    permissions: ["storage", "activeTab"],
    host_permissions: [
      "https://internal-ui.central.arubanetworks.com/*",
      "https://*.central.arubanetworks.com/*",
    ],
    action: {
      default_title: "Central Dark",
    },
    browser_specific_settings: {
      gecko: {
        id: "central-dark@local",
        strict_min_version: "121.0",
      },
    },
  },
});
