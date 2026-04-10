import { cloudflare } from "@cloudflare/vite-plugin";
import react from "@vitejs/plugin-react";
import type { PluginOption } from "vite";
import { defineConfig } from "vitest/config";
import { VitePWA } from "vite-plugin-pwa";

const isVitest =
  Boolean(
    (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env?.VITEST
  );

const plugins: PluginOption[] = [
  react(),
  !isVitest && cloudflare(),
  VitePWA({
    registerType: "autoUpdate",
    includeAssets: ["favicon.svg"],
    manifest: {
      name: "OmniHost",
      short_name: "OmniHost",
      description:
        "Offline-first guesthouse operations platform with realtime booking, quotations, invoices, finance, CRM, and hospitality workflows.",
      theme_color: "#0f3557",
      background_color: "#f6efe5",
      display: "standalone",
      start_url: "/",
      lang: "en",
      icons: [
        {
          src: "/favicon.svg",
          type: "image/svg+xml",
          sizes: "any",
          purpose: "any"
        }
      ]
    },
    workbox: {
      globPatterns: ["**/*.{js,css,html,svg,png,woff2}"],
      runtimeCaching: [
        {
          urlPattern: ({ request }) => request.mode === "navigate",
          handler: "NetworkFirst",
          options: {
            cacheName: "page-shell"
          }
        },
        {
          urlPattern: ({ url }) => url.pathname.startsWith("/api/"),
          handler: "NetworkFirst",
          options: {
            cacheName: "api-cache",
            networkTimeoutSeconds: 3,
            expiration: {
              maxEntries: 40,
              maxAgeSeconds: 60 * 60
            }
          }
        }
      ]
    },
    devOptions: {
      enabled: true
    }
  })
].filter(Boolean);

export default defineConfig({
  plugins,
  server: {
    port: 5173
  },
  preview: {
    port: 4173
  },
  build: {
    outDir: "dist"
  },
  test: {
    environment: "jsdom"
  }
});
