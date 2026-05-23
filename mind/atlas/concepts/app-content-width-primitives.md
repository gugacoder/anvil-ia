---
title: "AppContent Width Primitives"
aliases: [app-content-width, appcontent, content-width, width-primitives, nao-estique]
tags: [design-system, ux, layout, responsive, component]
sources:
  - "calendar/notes/2026-05-23.md"
created: 2026-05-23
updated: 2026-05-23
---

# AppContent Width Primitives

Primitiva de layout `<AppContent>` que declara a **natureza de largura** do conteúdo de cada app/página. Implementa o princípio "não estique" do [[team]]: componentes em desktop respeitam largura natural, não inflam pra preencher viewport. Cada app declara qual dos 5 widths se aplica, e a primitiva aplica `max-width` + centralização automaticamente.

## Key Points

- **5 widths declarativos**: `reading` (720px — texto longo, forms), `comfortable` (1024px — Settings, dashboards), `wide` (1280px — tabelas, grids), `full` (sem max-width — chat, files, boards onde largura agrega), `widget` (largura intrínseca, centralizado — relógios, indicadores, status).
- **Exceções reforçam a regra**: páginas de **conteúdo contínuo** (chat, files, kanban) ganham com `full` — mas são minoria. O default é que controles não esticam.
- **Variante `flush`**: remove padding horizontal. `<AppContent width="comfortable" flush>` usa max-width mas sem margens laterais — útil quando o container pai já gerencia padding (ex: SettingsApp).
- **Variante `centerVertical`**: centraliza verticalmente além de horizontalmente. `<AppContent width="widget" centerVertical>` — para conteúdo compacto que flutua no centro da tela (ex: Relógio).
- **Manifestação por papel no time**: designer declara natureza de largura por componente; smith implementa respeitando; curator rejeita stretching gratuito; ui-tester roda viewports largos pra detectar.

## Details

A primitiva surgiu da aplicação prática do princípio "não estique" cunhado pelo usuário durante a sessão de 2026-05-23. O problema observado: em telas largas (1920+, TVs ultrawide), componentes que preenchem 100% da viewport viram "billboards" — botões de 600px de largura, segmented controls que parecem banners, cards que esticam sem propósito. O anti-pattern é especialmente visível em Settings: `ModeSegmented` com `grid-cols-3` esticava os três botões (Claro/Escuro/Sistema) pra ~500px cada em ultrawide.

O fix foi duplo: (1) trocar `grid-cols-3` por `inline-flex` no segmented (largura intrínseca), e (2) criar a primitiva `<AppContent>` que encapsula `max-width` + `mx-auto` com as 5 variantes. Cada app declara qual width faz sentido pro seu conteúdo. SettingsApp usa `comfortable flush`; Relógio usa `widget centerVertical`; Arquivos mantém `full` porque a lista de arquivos beneficia da largura. A decisão é do app, não do framework — o framework só oferece o vocabulário.

A taxonomia de 5 widths foi desenhada para cobrir os cenários observados empiricamente em apps do [[processa-os-mob]] e do [[director-studio]]: formulários/texto (reading), painéis de configuração (comfortable), tabelas de dados (wide), conteúdo contínuo (full), e widgets compactos (widget). Cada um corresponde a um `max-width` fixo em pixels (não em `ch` ou `em`), porque a referência é viewport — o conteúdo não precisa escalar com font-size, precisa parar de crescer num ponto razoável.

## Related Concepts

- [[team]] — princípio "não estique" que fundamenta esta primitiva; designer/smith/curator/ui-tester cada um aplica de forma distinta
- [[processa-os-mob]] — projeto onde a primitiva foi criada e é consumida
- [[windowed-workspace-layouts]] — ambos os layouts (windowed e workspace) usam AppContent internamente
- [[director-studio]] — projeto que compartilha o princípio via team.md; candidato a adotar a mesma primitiva

## Sources

- [[calendar/notes/2026-05-23.md]] — Sessão tarde: AppContent primitiva criada com 5 widths (reading 720, comfortable 1024, wide 1280, full, widget); SettingsApp usa comfortable flush; Relógio usa widget centerVertical; princípio "não estique" cunhado e catalogado em team.md; ModeSegmented refatorado de grid-cols-3 pra inline-flex.
