import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import basicSsl from "@vitejs/plugin-basic-ssl";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
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
        start_url: "/",
        display: "standalone",
        background_color: "#f7f8fa",
        theme_color: "#3366cc",
        lang: "de",
        icons: [
          { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
          { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
          { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
        ],
      },
    }),
  ],
  server: {
    host: true,
    port: 5173,
    proxy: {
      "/api": "http://localhost:3001",
    },
  },
});
