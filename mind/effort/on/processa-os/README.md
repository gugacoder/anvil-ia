---
title: Processa OS
status: on
slug: so
created: 2026-05-22
updated: 2026-05-22
tags: [frente, processa-os, prototipo]
---

# Processa OS

Prototipo de "sistema operacional" web-browser-based da Processa. Shell tipo Ubuntu/GNOME que hospeda nossos apps como janelas — login/avatar, notificações, dock, window manager — e dentro dele alguns apps reais (sem mock):

- **Anvil Chat** — conversa nativa comigo via `@codrstudio/openclaude-chat` + ponte HTTP+SSE pra `openclaude-sdk` (cwd `D:/anvil`).
- **Notas** — CRUD persistido em JSON.
- **Arquivos** — lista pasta sandbox `workspace/processa-os/storage/files/`.
- **Sistema** — tema (claro/escuro), avatar, logout.
- **Relógio** — live + fusos.

## Decisões

- Workspace: `workspace/processa-os/` ([[workspace-layout]] pairing).
- Stack: Vite 7 + React 19 + Tailwind v4 + Hono em Node (single port em dev).
- Slug de rota: `/so/` em prod.
- Auth: aceita qualquer user/senha, emite JWT em cookie `httpOnly`, rota `/so/me`.
- Chat: rica via `@codrstudio/openclaude-chat` instalado via `registry/install.mjs` (vendor em `D:/nic/references/codrstudio`).
- Idioma travado em pt-BR.

## Inspiração

LinuxOS demo do Kimi: `https://dwfcctyh2o6me.ok.kimi.link/?id=2045932438926155776`. Lock screen com avatar+senha+guest, top bar GNOME (Activities/clock/tray), desktop icons à esquerda, dock embaixo, janelas com titlebar+min/max/close. Tema dark+violeta.

## NIC hub

Inspiração de proxy/shell pra subapps em `D:/nic/workspace/nic/hub`. Ponte SDK+chat em `D:/nic/workspace/nic/jornada/apps/chat/src/index.ts` — copiei a forma do bridge.

## Estado

Em scaffolding.
