import path from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";

// Chat app vive sob /so/chat/. O shell (Vite 5621) proxia /so/chat/* aqui.
export default defineConfig({
  base: "/so/chat/",
  resolve: { alias: { "@": path.resolve(__dirname, "./src") } },
  plugins: [react(), tailwindcss()],
  server: {
    host: true,
    strictPort: true,
    // Quando aberto direto (sem proxy), tambem precisa do /so/api pra debug isolado.
    proxy: {
      "/so/api": { target: "http://localhost:5620", changeOrigin: false },
    },
  },
});
