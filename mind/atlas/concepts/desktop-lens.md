---
title: "Desktop Lens"
aliases: [desktop-lens, lens, app-lens, dock-lens]
tags: [ux, component, desktop, processa-os, app-launcher]
sources:
  - "calendar/notes/2026-05-23.md"
created: 2026-05-23
updated: 2026-05-23
---

# Desktop Lens

App launcher do dock desktop no [[processa-os-mob]]: painel modal que exibe todos os apps do registry com capacidade de pin/unpin e drag-to-reorder. Equivalente desktop do `MobileAppDrawer` mobile. Atalho global: `Cmd/Ctrl+Shift+Espaço`. Botão Lens (ícone Grip) fixo na direita do dock, fora do scroll horizontal, separado por divider.

## Key Points

- **Reorder via DnD sempre-ligado**: sem necessidade de entrar em modo editar para reordenar. `@dnd-kit/core` + `@dnd-kit/sortable` com `activationConstraint.distance:6` (evita drag acidental). `KeyboardSensor` com announcements pt-BR para screen reader. `TouchSensor` com delay/tolerance. `DragOverlay` em portal. Prefers-reduced-motion respeitado.
- **Pin/unpin no edit mode**: toggle via click no modo editar (não no modo normal, onde click abre o app). Todos os apps nascem pinados de fábrica na primeira carga (default = todos os slugs do registry). Slugs órfãos (sumiram do registry) são purgados na hidratação. Novos slugs do registry **não** são auto-pinados.
- **HomeShortcut = `minimizeAll()`**: botão no topo da lens que minimiza todas as janelas, revelando o desktop. Coerente com a equivalência mobile/desktop ("área de trabalho").
- **Overflow do dock**: scroll horizontal interno quando há mais ícones que cabem. Coerente com macOS; Lens é o "índice canônico" de todos os apps.
- **Atalho `Cmd/Ctrl+Shift+Espaço`**: não conflita com Spotlight (`Cmd+Space`), Win+Space (layout), `Cmd+K` (command palette web). Esc fecha.

## Details

A Lens nasceu da necessidade de um equivalente desktop do drawer de apps mobile. No mobile, o `MobileAppDrawer` é um sheet bottom-up que mostra todos os apps; no desktop, o dock mostra apps pinados mas não tem UI para acessar os não-pinados ou reordená-los. A Lens preenche esse gap: mostra todos os apps do registry em grid, com estado de pin visível, reordenação via drag, e acesso rápido via atalho de teclado.

A decisão de que todos os apps nascem pinados na primeira carga (e novos apps do registry não são auto-pinados) foi deliberada: o Processa OS é um ambiente controlado onde o conjunto de apps é curado, não uma app store com centenas de opções. Faz sentido que tudo comece visível; o operador desfixa o que não usa. Se o registry ganha um app novo, o operador decide quando/se quer fixar — sem surpresas no dock.

O indicador `pinned-idle` (bolinha vazada como 4º estado do `AppStatusIndicator`) foi criado mas depois removido inteiramente: no dock, todo ícone é pinado por definição (redundante); na lens, pinados já estão visualmente distinguidos (cor primary). O estado ficou sem uso e foi deletado, seguindo o princípio de não manter código sem consumidor.

Cross-container drag (arrastar da lens para o dock para pinar em posição específica, e vice-versa) ficou como Phase 2 — alinhamento prévio necessário sobre o interaction model.

## Related Concepts

- [[processa-os-mob]] — projeto onde a Lens foi implementada
- [[window-negotiation-pattern]] — dock completo (onde o botão Lens vive) interage com o filete da negociação
- [[windowed-workspace-layouts]] — Lens existe apenas no modo `windowed` (workspace tem sidebar com apps)
- [[app-content-width-primitives]] — Lens usa width `widget` quando aberta como componente centralizado

## Sources

- [[calendar/notes/2026-05-23.md]] — Session 03:58: conceito do Lens, atalho global Cmd/Ctrl+Shift+Espaço, DnD always-on com dnd-kit, pin/unpin, HomeShortcut=minimizeAll, overflow scroll horizontal, indicador pinned-idle criado e removido, Phase 2 cross-container drag pendente. Decisão: novos apps do registry não auto-pinam; todos nascem pinados na primeira carga.
