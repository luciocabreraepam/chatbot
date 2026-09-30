import { defineConfig } from "vite-plus";
import { pluginsConfig } from "./config/vite.plugins.config";
import { fileURLToPath, URL } from "node:url";
import { lintConfig } from "./config/vite.lint.config";
import { fmtConfig } from "./config/vite.fmt.config";

export default defineConfig({
  fmt: fmtConfig,
  lint: lintConfig,
  plugins: pluginsConfig,
  test: {
    environment: "jsdom",
  },
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("src", import.meta.url)),
    },
    tsconfigPaths: true,
  },
  server: {
    proxy: {
      // LM Studio proxy
      "/api/lmstudio": {
        target: "http://127.0.0.1:1234",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lmstudio/, ""),
      },
      // Ollama proxy
      "/api/ollama": {
        target: "http://localhost:11434",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/ollama/, ""),
      },
      // Lemonade proxy
      "/api/lemonade": {
        target: "http://localhost:8000",
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api\/lemonade/, ""),
      },
    },
  },
});
