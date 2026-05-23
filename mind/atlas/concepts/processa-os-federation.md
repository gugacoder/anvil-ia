---
title: "Processa OS — Module Federation"
aliases: [processa-os-fed, module-federation, vite-federation, processa-os-federation]
tags: [arquitetura, processa, federation, vite, react, micro-frontend]
sources:
  - "calendar/notes/2026-05-22.md"
created: 2026-05-22
updated: 2026-05-22
---

# Processa OS — Module Federation

Variante arquitetural do [[processa-os]] que usa **Module Federation puro** via `@originjs/vite-plugin-federation` v1.4.1 (Vite, não webpack) para carregar apps como remotes React nativos no mesmo DOM — **zero iframe**. Workspace em `workspace/processa-os-fed/`. O Shell (host) carrega remotes (`chat`, `notas`) via `React.lazy(() => import("chat/App"))`, com `react` e `react-dom` como `shared` dependencies (instância única, sem duplicação de hooks/state).

## Key Points

- **Zero iframe**: apps federados são componentes React carregados no mesmo DOM do Shell. Sem sandboxing de iframe, sem postMessage — React puro.
- **Auth compartilhada automaticamente**: cookie httpOnly `so_session` (JWT) funciona cross-app porque tudo roda same-origin sob `/so/`. Sem necessidade de propagar token entre host e remotes.
- **Sem state reativo compartilhado**: contextos do Shell (theme, windows, notifications) **NÃO são acessíveis pelos remotes**. Cada remote gerencia seu próprio state interno. Comunicação host↔remote é indireta: via backend (REST API) ou convenções CSS (classe `dark`/`light` no `<body>` + Tailwind `dark:`).
- **CSS requer injeção manual**: `useRemoteStylesheet` cria `<link>` no head do host porque o plugin de federation não carrega CSS de remotes automaticamente. Sem isso, remotes renderizam sem estilo.
- **Error boundaries isolam crashes**: um remote que crashe não derruba o Shell — error boundary captura e exibe fallback. Isolamento robusto sem overhead de iframe.

## Details

A auditoria arquitetural (sessão 20:45 de 2026-05-22) confirmou que a integração é robusta em termos de isolamento e auth, mas identificou uma limitação estrutural: **não há state reativo compartilhado** entre host e remotes. O Shell mantém contextos de theme, window manager e notificações, mas esses contextos são locais ao host — remotes não podem consumir `useTheme()` ou `useNotifications()` do Shell. Essa é uma consequência direta da arquitetura de Module Federation: cada remote é compilado separadamente e não tem acesso aos providers do host.

As alternativas para state compartilhado, quando necessário, são: (1) shared context exportado pelo host via federation config (requer que o host exporte e o remote importe o mesmo módulo); (2) custom events no DOM (`CustomEvent` + `addEventListener`); (3) store compartilhado (Zustand ou similar exportado como shared module). Nenhuma dessas foi implementada no protótipo — a comunicação atual passa exclusivamente pelo backend (REST API para dados persistentes) e por convenções CSS (o Shell aplica classe `dark`/`light` no `<body>`, e remotes usam Tailwind `dark:` que herda automaticamente).

Em ambiente de desenvolvimento, o Shell roda na porta 5631 e faz proxy para Chat (5632), Notas (5633) e Server (5630). Em produção, um servidor Hono único serve tudo — os remotes são bundled e servidos como assets estáticos pelo mesmo processo.

## Related Concepts

- [[processa-os]] — protótipo original sem federation; apps como componentes locais com window manager próprio
- [[director-studio]] — outro projeto que usa Vite 7 + React 19; poderia ser candidato a remote federado no futuro
- [[openclaude-sdk-chat]] — app Chat é um dos remotes federados na variante fed

## Sources

- [[calendar/notes/2026-05-22.md]] — Session 20:45: auditoria arquitetural confirmando zero iframe, Module Federation via `@originjs/vite-plugin-federation` v1.4.1, auth same-origin automática, ausência de state reativo compartilhado, CSS injection manual, error boundaries por remote, portas dev (5630-5633)
