---
title: "Processa OS Mob"
aliases: [processa-os-mob, pos-mob, so-mob, mobile-os]
tags: [projeto, processa, pwa, mobile-first, shell, themes]
sources:
  - "calendar/notes/2026-05-23.md"
created: 2026-05-23
updated: 2026-05-23
---

# Processa OS Mob

Reescrita mobile-first do [[processa-os]] como PWA de produção (não protótipo). Workspace em `workspace/processa-os-mob/`, slug `/so/`. Enquanto o Processa OS original (e sua variante federada [[processa-os-federation]]) foram protótipos desktop-first com window manager GNOME-like, o Mob parte do celular como experiência primária e expande para desktop com dois layouts alternativos: `windowed` (SO-like com janelas) e `workspace` (app-shell com sidebar+outlet). Stack idêntico: Vite 7 + React 19 + Tailwind v4 + Hono + zod 4.

## Key Points

- **Mobile-first, desktop-capable**: design começa no celular (thumb zone, drawers, gestos), desktop é expansão coerente. Breakpoints viewport-driven via `useSyncExternalStore` + `matchMedia` (5 categorias: mobile <600, tablet-pequeno 600-819, tablet-grande 820-1199, desktop 1200-1919, tv ≥1920).
- **4 temas de cor**: Floresta (default, esmeralda), Noite (indigo), Brasa (laranja), Lavanda (roxo). Variável `--accent-h` no `<html>` propaga em background/card/primary/wallpaper. Light/dark/system via ThemeProvider estendido. Persistido em `os.theme` e `os.color-theme`.
- **Zod em toda fronteira**: shell e server com schemas centrais (`lib/schemas/index.ts` e `apps/server/src/schemas/index.ts`). `safeParse` + warn + fallback no frontend; `zValidator` middleware customizado no backend (descartado `@hono/zod-validator` por incompatibilidade com zod 4). Teste de estresse: localStorage com lixo → 3 warns, app renderiza com defaults.
- **Apps reais via Module Federation**: Chat (openclaude-chat), Notas, Calendário, Arquivos, Sistema, Relógio. Registro em `registry.ts`. Cada app com porta dev dedicada.
- **Auto-update PWA**: decisão de banner manual + reload por clique (não silencioso). Version polling + SW message.
- **Window negotiation (desktop)**: janela maximizada "negocia" chrome com o shell — título migra pra topbar, dock vira filete, janela ocupa espaço total. Ver [[window-negotiation-pattern]].

## Details

O Processa OS Mob evoluiu significativamente em 2026-05-23 com três eixos de trabalho. Primeiro, o sistema de temas unificado: a abordagem de CSS variables com `--accent-h` como raiz de uma cor permite trocar a identidade visual inteira do SO com uma classe no `<html>`. A descoberta técnica foi que CSS variable resolution não é lazy — `var()` aninhada em `oklch()` é substituída no escopo onde a var pai foi declarada, não onde é usada. Workaround: aplicar a classe de override (`theme-brasa`, etc.) no mesmo elemento onde as vars derivadas vivem.

Segundo, a cultura de contract-first (zod) foi implementada em duas ondas: shell (hub central `lib/schemas/index.ts` refatorando api, notifications, use-apps, app-storage, mob-state, workspace-state, color-theme, theme, layout) e server (middleware `zValidator` próprio em vez de `@hono/zod-validator` que ainda exige zod 3). O loadJSON do app-storage ganhou schema opcional: `loadJSON('key', schema)` retorna valor validado ou fallback.

Terceiro, a implementação do desktop Lens (ver [[desktop-lens]]) como launcher de apps no dock, com pin/unpin, drag-to-reorder via dnd-kit, e atalho global `Cmd/Ctrl+Shift+Espaço`. Também o polimento de window controls (bolinhas de minimize/maximize/close com hit area 24×24 em vez da inicial 14×14).

Bugs notáveis corrigidos na sessão: (1) `MobileDock setState during render` — `togglePin` chamava `dispatchEvent` síncrono dentro do updater do `setDockSlugs`; fix: side-effects fora do updater, persistência via `useEffect` com flag `loaded`. (2) Manifest 404 — `href="/so/manifest.webmanifest"` no index.html + Vite `base: /so/` duplicava path; fix: paths relativos. (3) Bug de vocabulário PT-BR — "desktop" interpretado como "modo desktop" em vez de "área de trabalho" (home screen), gerando bug de `switchToDesktop` que travava user.

## Related Concepts

- [[processa-os]] — protótipo original desktop-first; Mob é a reescrita mobile-first de produção
- [[processa-os-federation]] — variante federada que o Mob herdou arquiteturalmente
- [[windowed-workspace-layouts]] — dois paradigmas de layout desktop disponíveis no Mob
- [[app-content-width-primitives]] — primitiva de largura declarativa usada por cada app no Mob
- [[window-negotiation-pattern]] — UX de janela maximizada negociando chrome com o shell
- [[desktop-lens]] — app launcher do dock desktop
- [[openclaude-sdk-chat]] — par SDK+Chat usado no app Anvil Chat dentro do Mob
- [[team]] — time que constrói o Mob; contract-first cultura aplicada nesta sessão

## Sources

- [[calendar/notes/2026-05-23.md]] — Session 00:00: bug MobileDock, sistema de temas (4 cores + light/dark/system), CSS var scope gotcha, SettingsApp unificado, useBreakpoint viewport-driven, layout windowed/workspace, zod ondas 1+2, refator dos 5 agentes, SOUL pragmatic. Session 03:57: window negotiation topbar/dock, filete, botão calendario. Session 03:58: openclaude-chat history coordination, Desktop Lens com drag-to-reorder, window controls polish. Sessão tarde: WorkspaceShell, AppContent primitiva, zod global, refator agentes done, team.md criado, SOUL refatorado como artesão.
