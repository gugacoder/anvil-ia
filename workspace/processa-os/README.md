# Processa OS — prototype

SO web-browser da Processa. Shell GNOME-like + apps reais. Frente:
[`mind/effort/on/processa-os/README.md`](../../mind/effort/on/processa-os/README.md).

## Stack

- **apps/web** — Vite 7 + React 19 + TS + Tailwind v4 + shadcn
- **apps/server** — Hono em Node (single port; serve `apps/web/dist` em prod e proxia API)
- **vendor** — `@codrstudio/openclaude-sdk` (pacote npm) + `@codrstudio/openclaude-chat` (source-copy via shadcn)

## Dev

```bash
cp .env.example .env
npm install
npm run dev
# abre http://localhost:5610/so/
```

`apps/server` (porta 5610) serve `/so/api/v1/*` e proxia `/so/*` pro Vite (porta 5611).
Em prod, server serve `apps/web/dist` direto.

## Rotas API

- `POST /so/api/v1/auth/login` — `{ username, password }` → cookie `so_session` (JWT)
- `POST /so/api/v1/auth/logout`
- `GET  /so/api/v1/me`
- `GET  /so/api/v1/ai/...` — bridge pra openclaude-sdk (anvil em D:/anvil)
- `GET  /so/api/v1/notes` / `POST` / `PATCH/:id` / `DELETE/:id`
- `GET  /so/api/v1/files` — lista `storage/files/`
- `GET  /so/api/v1/notifications/stream` — SSE
- `POST /so/api/v1/notifications` — emite (uso interno)
