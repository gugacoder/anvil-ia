import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

const PUBLIC_PATH = process.env.VITE_PUBLIC_PATH ?? "/so/";

export default defineConfig({
  base: PUBLIC_PATH,
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    strictPort: true,
    proxy: {
      "/so/api": { target: "http://localhost:5610", changeOrigin: false },
    },
  },
});
