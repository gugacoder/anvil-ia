import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import federation from "@originjs/vite-plugin-federation";

const PUBLIC_PATH = process.env.VITE_PUBLIC_PATH ?? "/so/";

// Shell como host federado. Consome remotes (chat, notas) via Module Federation.
// Em dev, o shell proxia /so/chat/* e /so/notas/* para os Vite SPA respectivos.
// O remoteEntry.js de cada remote fica acessivel via esse proxy.

export default defineConfig({
  base: PUBLIC_PATH,
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "shell",
      remotes: {
        chat: "/so/chat/assets/remoteEntry.js",
        notas: "/so/notas/assets/remoteEntry.js",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  build: {
    target: "esnext",
    minify: false,
  },
  server: {
    host: true,
    strictPort: true,
    proxy: {
      "/so/api": { target: "http://localhost:5630", changeOrigin: false },
      "/so/chat": { target: "http://localhost:5632", changeOrigin: false, ws: true },
      "/so/notas": { target: "http://localhost:5633", changeOrigin: false, ws: true },
    },
  },
});
