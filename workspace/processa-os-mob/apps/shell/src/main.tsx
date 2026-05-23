import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import { App } from "./app";

// Cleanup one-shot: chave legada da feature de override de form-factor (removida
// em favor de breakpoints CSS-driven). Quem tinha `mob.ff="desktop"` gravado
// ficava preso no desktop mesmo em viewport mobile.
try { localStorage.removeItem("mob.ff"); } catch { /* ignore */ }

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// Service Worker — so em prod (em dev o Vite HMR conflita)
const meta = import.meta as ImportMeta & { env?: { PROD?: boolean } };
if ("serviceWorker" in navigator && meta.env?.PROD) {
  window.addEventListener("load", () => {
    navigator.serviceWorker
      .register("/so/sw.js", { scope: "/so/" })
      .catch((err) => console.warn("[mob] SW registration failed", err));
  });
}
