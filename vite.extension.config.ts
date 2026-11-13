import { resolve } from "node:path";
import { copyFileSync, mkdirSync, readdirSync } from "node:fs";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

const PUBLIC_KEYS = [
  "NEXT_PUBLIC_FIREBASE_API_KEY",
  "NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN",
  "NEXT_PUBLIC_FIREBASE_PROJECT_ID",
  "NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET",
  "NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID",
  "NEXT_PUBLIC_FIREBASE_APP_ID",
  "NEXT_PUBLIC_RECAPTCHA_ENTERPRISE_SITE_KEY",
  "NEXT_PUBLIC_APPCHECK_DEBUG",
  "NEXT_PUBLIC_FIREBASE_CLOUD_MODEL",
];

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "NEXT_PUBLIC_");
  const define: Record<string, string> = {};
  for (const key of PUBLIC_KEYS) {
    define[`process.env.${key}`] = JSON.stringify(env[key] ?? "");
  }

  return {
    root: resolve(__dirname, "extension"),
    publicDir: false,
    plugins: [
      react(),
      {
        name: "copy-extension-static",
        closeBundle() {
          const dist = resolve(__dirname, "extension/dist");
          mkdirSync(resolve(dist, "icons"), { recursive: true });
          for (const file of ["manifest.json", "content.js", "content.css", "background.js"]) {
            copyFileSync(resolve(__dirname, "extension", file), resolve(dist, file));
          }
          const icons = resolve(__dirname, "extension/icons");
          for (const file of readdirSync(icons)) {
            copyFileSync(resolve(icons, file), resolve(dist, "icons", file));
          }
        },
      },
    ],
    resolve: {
      alias: { "@": resolve(__dirname, "src") },
    },
    define,
    server: {
      fs: { allow: [resolve(__dirname)] },
    },
    build: {
      outDir: resolve(__dirname, "extension/dist"),
      emptyOutDir: true,
      rollupOptions: {
        input: resolve(__dirname, "extension/sidepanel.html"),
      },
    },
  };
});
