import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

const PUBLIC_PATH = process.env.VITE_PUBLIC_PATH ?? "/so/";

// Em dev, o Shell Vite eh quem o user acessa. Ele proxia:
//   /so/api/*  -> 5620 (server Hono)
//   /so/chat/* -> 5622 (chat Vite SPA, HMR via ws transparente)
//   /so/notas/* -> 5623 (notas Vite SPA, HMR via ws transparente)
// O proprio shell responde tudo o resto sob /so/.
//
// Em prod, o server Hono serve tudo (incluindo dist do shell e dos apps).

export default defineConfig({
  base: PUBLIC_PATH,
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    strictPort: true,
    proxy: {
      "/so/api": { target: "http://localhost:5620", changeOrigin: false },
      "/so/chat": { target: "http://localhost:5622", changeOrigin: false, ws: true },
      "/so/notas": { target: "http://localhost:5623", changeOrigin: false, ws: true },
    },
  },
});
