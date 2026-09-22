import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";
import { nodePolyfills } from "vite-plugin-node-polyfills";

// GitHub Pages serves a project site from https://<user>.github.io/<repo>/, so the production
// build needs every asset URL prefixed with the repo name. Local dev stays at the root so the
// existing workflow (https://localhost:5173) doesn't change.
const GITHUB_PAGES_REPO = "Laufbestie";

export default defineConfig(({ command }) => ({
  base: command === "build" ? `/${GITHUB_PAGES_REPO}/` : "/",
  plugins: [
    react(),
    // csv-parse and fit-file-parser (used for client-side activity file parsing) both expect
    // Node's global Buffer, which doesn't exist in a browser. Scoped to just `buffer` — we
    // don't need the rest of this plugin's Node shims (process, path, fs, ...).
    nodePolyfills({ include: ["buffer"] }),
    // Self-signed HTTPS so the dev server can be installed as a PWA when opened from a phone
    // on the same WiFi — browsers only allow PWA install/service workers on secure origins,
    // and "localhost" doesn't count when accessed via a LAN IP from another device.
    basicSsl(),
    VitePWA({
      registerType: "autoUpdate",
      devOptions: { enabled: true },
      manifest: {
        name: "Laufplan Generator",
        short_name: "Laufplan",
        description: "Persönlicher Laufplan-Generator basierend auf deiner Trainingshistorie",
        start_url: ".",
        scope: ".",
        display: "standalone",
        background_color: "#f7f8fa",
        theme_color: "#3366cc",
        lang: "de",
        icons: [
          { src: "icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
  },
}));
