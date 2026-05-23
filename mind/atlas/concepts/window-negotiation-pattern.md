---
title: "Window Negotiation Pattern"
aliases: [window-negotiation, negotiated-window, topbar-negotiation, dock-filete]
tags: [ux, pattern, window-manager, desktop, processa-os]
sources:
  - "calendar/notes/2026-05-23.md"
created: 2026-05-23
updated: 2026-05-23
---

# Window Negotiation Pattern

Padrão de UX no modo `windowed` do [[processa-os-mob]] onde uma janela maximizada "negocia" sua chrome com o shell — o título e window controls migram pra topbar do SO, o dock colapsa para um filete fino, e a janela ocupa todo o espaço útil. Inspirado em macOS (menu bar reflete app) + Unity/GNOME (window controls no painel superior).

## Key Points

- **`isNegotiated(win, activeId)`**: predicado central exportado de `windows.tsx`. Retorna true quando a janela é maximizada + está em foco + não minimizada. Usado tanto pela TopBar quanto pelo Dock pra decidir o comportamento.
- **Janela maximizada nunca tem titlebar**: regra `titlebarHidden = win.maximized` — independe do foco. A topbar mostra título/controls **apenas** da janela que tem foco; janela max-unfocused fica sem titlebar e sem representação na topbar (fica quieta, sem ruído visual).
- **Dock filete**: cada app vira tracinho horizontal `h-2`, app em foreground vira traço `w-8` em `primary`, inativos `w-4` em `muted-foreground/50`. Hover restaura dock completo. Container `min-w-[60vw]` pra hit area adequada. Colado no rodapé (`bottom-0`), dock expandido com `mb-3`.
- **Componentes públicos reutilizados**: `WindowTitleMenu` e `WindowControls` extraídos como componentes em `windows.tsx` — mesma implementação serve titlebar da janela e topbar negociada.
- **Key estável em AnimatePresence**: `negotiated-title` e `negotiated-ctrls` (não `${win.id}`) — swap entre janelas maximizadas é instantâneo, animação só nas bordas do estado.

## Details

O pattern resolve o desperdício de espaço vertical em desktop quando uma janela é maximizada: a titlebar da janela (com título, ícone e botões min/max/close) e o dock (com ícones de todos os apps) consomem ~100px que poderiam ser conteúdo. Na negociação, a janela cede sua titlebar (título migra pra topbar do SO junto com os window controls) e o dock colapsa para um filete de 8px. O conteúdo da janela estende até `vh - TOP_BAR`, passando atrás do filete, com `pb-8` (32px) como safe area para que conteúdo não fique atrás do filete.

A decisão sobre o comportamento de janela unfocused foi deliberada: entre (1) titlebar volta ao perder foco e (2) fica quieta — a segunda foi escolhida porque uma janela max-unfocused está sempre parcialmente obscurecida por outra; titlebar reaparecendo no fundo é ruído sem função. O modelo mental é: maximizada = tela cheia = sem chrome própria, independente do foco. A topbar (que pertence ao SO, não à janela) decide o que mostrar baseado no foco.

A implementação do filete exigiu atenção à hit area: `h-2` (8px de altura) seria impossível de clicar. A solução foi padding generoso (`px-10 py-4` + `min-w-[60vw]`) no container transparente — visualmente o filete é fino, mas a zona clicável é ~40px de altura. No hover, o dock completo aparece com animação suave. O conteúdo da janela maximizada fica com `pb-8` permanente, o que cobre o filete em repouso mas não o dock expandido (aceito como transient — dock expandido é hover momentâneo).

A feature do botão de calendário no datetime da topbar segue o mesmo padrão de "focar topmost se existir, abrir novo se não" usado pelo dock: `windows.filter(appId).sort(z desc)[0]` ou abre.

## Related Concepts

- [[processa-os-mob]] — projeto onde o pattern foi implementado
- [[windowed-workspace-layouts]] — o pattern só se aplica ao modo `windowed`; `workspace` não tem janelas
- [[processa-os]] — protótipo original com window manager sem negociação (titlebar sempre visível)

## Sources

- [[calendar/notes/2026-05-23.md]] — Session 03:57: conceito de negociação topbar/dock, isNegotiated predicado, titlebar sempre hidden em max, dock filete (h-2 tracinhos), pb-8 safe area, key estável em AnimatePresence, botão calendario no topbar, WindowTitleMenu/WindowControls extraídos. Decisão: janela max-unfocused fica quieta (sem titlebar voltando).
