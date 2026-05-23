import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import federation from "@originjs/vite-plugin-federation";

// Notas app como remote federado. Expoe ./App para o shell consumir.
export default defineConfig({
  base: "/so/notas/",
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "notas",
      filename: "remoteEntry.js",
      exposes: {
        "./App": "./src/app.tsx",
      },
      shared: ["react", "react-dom"],
    }),
  ],
  build: {
    target: "esnext",
    minify: false,
    cssCodeSplit: false,
    rollupOptions: {
      output: {
        assetFileNames: (info) =>
          info.name?.endsWith(".css")
            ? "assets/styles.css"
            : "assets/[name]-[hash][extname]",
      },
    },
  },
  server: {
    host: true,
    strictPort: true,
    proxy: {
      "/so/api": { target: "http://localhost:5640", changeOrigin: false },
    },
  },
});
