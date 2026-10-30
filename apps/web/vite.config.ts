import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";
import vue from "@vitejs/plugin-vue";
import tailwindcss from "@tailwindcss/vite";

/**
 * Dev and `vite preview` forward /api to the gateway (the production image does the same with nginx).
 * GATEWAY_URL (or VITE_GATEWAY) selects the target: the real gateway by default.
 */
const gateway = process.env.GATEWAY_URL || process.env.VITE_GATEWAY || "http://localhost:8080";
const proxy = { "/api": { target: gateway, changeOrigin: false } };

export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: { alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) } },
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
  server: { port: 3000, proxy },
  preview: { port: 3000, proxy },
  build: { target: "es2022", sourcemap: false },
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./tests/unit/setup.ts"],
    include: ["tests/unit/**/*.test.ts"],
    css: false,
  },
});
