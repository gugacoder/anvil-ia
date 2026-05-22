// =============================================================================
// Processa OS — backend (Hono, single port).
// =============================================================================
// Roteia tudo sob /so/api/v1/*. Em dev, app frontend roda no Vite (5611) e
// recebemos chamadas direto desse server. Em prod, server serve apps/web/dist.
// =============================================================================

import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serveStatic } from "@hono/node-server/serve-static";
import { readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { authRoutes } from "./routes/auth.js";
import { meRoute } from "./routes/me.js";
import { notesRoutes } from "./routes/notes.js";
import { filesRoutes } from "./routes/files.js";
import { notificationsRoutes, bus } from "./routes/notifications.js";
import { aiRoutes } from "./routes/ai.js";

const PORT = Number(process.env.PORT ?? 5610);
const PUBLIC_PATH = (process.env.PUBLIC_PATH ?? "/so").replace(/\/$/, "");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const WEB_DIST = path.resolve(__dirname, "../../web/dist");

const app = new Hono();
app.use("*", cors({ credentials: true, origin: (o) => o ?? "*" }));

// API
const api = new Hono();
api.route("/auth", authRoutes);
api.route("/me", meRoute);
api.route("/notes", notesRoutes);
api.route("/files", filesRoutes);
api.route("/notifications", notificationsRoutes);
api.route("/ai", aiRoutes);

app.route(`${PUBLIC_PATH}/api/v1`, api);

// healthcheck
app.get("/healthz", (c) => c.json({ ok: true }));

// Serve web em prod sob PUBLIC_PATH/*. Em dev o Vite cuida e o user abre
// http://localhost:5611/so/.
if (existsSync(WEB_DIST)) {
  app.use(
    `${PUBLIC_PATH}/*`,
    serveStatic({
      root: WEB_DIST,
      rewriteRequestPath: (p) => p.replace(new RegExp(`^${PUBLIC_PATH}`), "") || "/",
    }),
  );
  app.get(`${PUBLIC_PATH}`, async (c) => {
    const html = await readFile(path.join(WEB_DIST, "index.html"), "utf-8");
    return c.html(html);
  });
  app.get(`${PUBLIC_PATH}/*`, async (c) => {
    const html = await readFile(path.join(WEB_DIST, "index.html"), "utf-8");
    return c.html(html);
  });
}

app.get("/", (c) => c.redirect(`${PUBLIC_PATH}/`));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`[processa-os] http://localhost:${info.port}${PUBLIC_PATH}/`);
  // emite uma notificacao de boas-vindas pra demonstrar SSE
  setTimeout(() => {
    bus.emit({
      kind: "system",
      title: "Processa OS",
      body: "Sistema iniciado.",
    });
  }, 500);
});
