# 01 — Stack do protótipo

## Frontend — `apps/director-studio`

Stack `/stacks` perfil **Frontend App** (SPA autenticado, não landing).

- React 19 + TypeScript 5.9 + Vite 7
- TanStack Router (file-based, tipado — rotas dinâmicas via metadados)
- Tailwind CSS 4 + shadcn/ui (v4) + Radix
- Phosphor Icons (Lucide proibido)
- Framer Motion + Vaul (Drawer mobile-first)
- class-variance-authority + clsx + tailwind-merge + tw-animate-css
- Tema claro/escuro/auto (default `auto`)
- vite-plugin-pwa (service worker + manifest)
- Fontsource: Inter, Plus Jakarta Sans, Lora, Roboto Mono
- ESLint 9 + Prettier

## Backend — `apps/api` (iteração posterior)

Stack `/stacks` perfil **Backend** + SSE (polling proibido).

- Node 20+ / TypeScript 5.9
- Hono + @hono/node-server
- @hono/zod-validator + Zod
- Pino + pino-pretty (console.log proibido)
- tsx (dev runner)
- `mssql` driver (SQL Server local — DBdirector)
- SSE via `hono/streaming.streamSSE` — canais temáticos
- Redis para sessão (httpOnly cookie carrega sid opaco)

## Shared — `packages/ui`

- Componentes shadcn copiados (CLI, não dep runtime)
- Helpers de tema, utilitários de classe

## Monorepo

- npm workspaces (`apps/*`, `packages/*`)
- concurrently (dev paralelo api + app)
- dotenv-cli
- Playwright (E2E)

## Bootstrap

Comando único:

```bash
npx shadcn@latest init --preset b0 --template vite --monorepo --pointer
```

Rodar em `workspace/director-studio/`. Gera estrutura `apps/` + `packages/ui/` + workspace root.

Suplementos manuais após bootstrap:
- TanStack Router (`@tanstack/react-router`)
- Phosphor Icons (`@phosphor-icons/react`)
- Framer Motion (`framer-motion`)
- Vaul (`vaul`)
- vite-plugin-pwa (`vite-plugin-pwa`)
- Fontsource packages

## Decisões fixadas

- **SSE, não polling**. Para qualquer "update live" (metadados mudaram, novo registro em `TBmodel_pagina`, build do template rodou) → canal SSE temático.
- **Sem console.log no backend**. Só Pino estruturado.
- **shadcn é CLI**, componentes copiados pra `packages/ui/src/components/`. Não dep runtime.
- **Tema default `auto`** via next-themes ou equivalente.
- **Vite, não Next**. Studio é app autenticado, não landing.

## TODO de stack

- Decidir se backend usa connection pooling do `mssql` por aplicação (multi-tenant) ou single-pool.
- Avaliar `@tanstack/react-query` para cache de respostas das procs `obter_*`.
- PWA: definir estratégia de cache (Network First para procs vivas, Cache First para assets).
