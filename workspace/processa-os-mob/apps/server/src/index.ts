// =============================================================================
// Processa OS fed — backend Hono. NIC-style: shell e apps federados cada um
// em sua porta, fed server expoe APIs comuns + registry de apps.
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
import { appsRoutes, REGISTRY } from "./routes/apps.js";

const PORT = Number(process.env.PORT ?? 5640);
const PUBLIC_PATH = (process.env.PUBLIC_PATH ?? "/so").replace(/\/$/, "");

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SHELL_DIST = path.resolve(__dirname, "../../shell/dist");

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
api.route("/apps", appsRoutes);

app.route(`${PUBLIC_PATH}/api/v1`, api);

// healthcheck
app.get("/healthz", (c) => c.json({ ok: true, registry: REGISTRY.length }));

// Em prod (build), o server serve dist do shell sob PUBLIC_PATH.
// Apps federados terao seus dists servidos sob PUBLIC_PATH/<slug>/.
// Em dev, quem serve eh o Vite do shell (e Vite proxia /so/<slug>/* pras portas dos apps).
// Em prod, o remoteEntry.js de cada remote precisa estar acessivel para o shell importar.
if (existsSync(SHELL_DIST)) {
  // Apps federados dist (remoteEntry.js + chunks)
  for (const m of REGISTRY) {
    if ((m.kind !== "external" && m.kind !== "federated") || !m.basePath) continue;
    const dist = path.resolve(__dirname, `../../${m.slug}/dist`);
    if (!existsSync(dist)) continue;
    const base = `${PUBLIC_PATH}/${m.basePath}`;
    app.use(
      `${base}/*`,
      serveStatic({
        root: dist,
        rewriteRequestPath: (p) => p.replace(new RegExp(`^${base}`), "") || "/",
      }),
    );
    app.get(`${base}`, async (c) => c.html(await readFile(path.join(dist, "index.html"), "utf-8")));
    app.get(`${base}/`, async (c) => c.html(await readFile(path.join(dist, "index.html"), "utf-8")));
  }
  // Shell dist (catch-all do PUBLIC_PATH)
  app.use(
    `${PUBLIC_PATH}/*`,
    serveStatic({
      root: SHELL_DIST,
      rewriteRequestPath: (p) => p.replace(new RegExp(`^${PUBLIC_PATH}`), "") || "/",
    }),
  );
  app.get(`${PUBLIC_PATH}`, async (c) =>
    c.html(await readFile(path.join(SHELL_DIST, "index.html"), "utf-8")),
  );
  app.get(`${PUBLIC_PATH}/*`, async (c) =>
    c.html(await readFile(path.join(SHELL_DIST, "index.html"), "utf-8")),
  );
}

app.get("/", (c) => c.redirect(`${PUBLIC_PATH}/`));

serve({ fetch: app.fetch, port: PORT }, (info) => {
  // eslint-disable-next-line no-console
  console.log(`[mob-server] http://localhost:${info.port}${PUBLIC_PATH}/ · apps=${REGISTRY.length}`);
  setTimeout(() => {
    bus.emit({
      kind: "system",
      title: "Processa OS Mob",
      body: `Sistema iniciado · ${REGISTRY.length} apps no registry.`,
    });
  }, 500);
});
