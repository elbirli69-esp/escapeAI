import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import { VitePWA } from "vite-plugin-pwa";

export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: "autoUpdate",
      includeAssets: ["favicon.svg", "media/*"],
      workbox: {
        globPatterns: ["**/*.{js,css,html,ico,svg,jpg,webp}"],
      },
      manifest: {
        name: "escapeAI",
        short_name: "escapeAI",
        description: "Escape rooms online con orquestador IA",
        theme_color: "#0c1222",
        background_color: "#0c1222",
        display: "standalone",
        start_url: "/",
        icons: [
          {
            src: "favicon.svg",
            sizes: "any",
            type: "image/svg+xml",
            purpose: "any",
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:8787",
        changeOrigin: true,
      },
    },
  },
});
