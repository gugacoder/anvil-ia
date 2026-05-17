---
title: F064 — Dashboard mobile stack responsive (decisões)
tags: [effort, director-studio, F064, decisions, smith]
created: 2026-05-17
---

# F064 — Dashboard mobile stack responsive

Débito explícito de F012 C8. Spec [[dashboard]] §74-78 exige stack vertical
full-width em viewport `< 640px` (sm). F012 entregou usando `md:`
(`< 768px`), deixando a faixa 640-768 em stack quando spec §85 classifica
640-1024 como tablet com grid 2 colunas.

## Decisões

1. **Breakpoint corrigido `md:` → `sm:`** em
   `packages/ui/src/components/dashboard/dashboard-surface.tsx`:
   - Loading skeleton: `grid-cols-1 sm:grid-cols-2`.
   - Layout principal: `grid grid-cols-1 gap-y-3 sm:grid-cols-2 sm:gap-3
     sm:grid-rows-[minmax(220px,1fr)_minmax(220px,1fr)]`.
   - `colSpan`/`rowSpan` aplicados via `sm:col-span-2`/`sm:row-span-2`
     — em mobile cada widget ocupa a linha independente do span.

2. **Min-height por widget**: `min-h-[180px] sm:min-h-0`. Em mobile o
   container do slot reserva 180px mínimos para evitar colapso de widgets
   chart/table com `flex-1` interno; em desktop a row do grid
   (`minmax(220px,1fr)`) já governa a altura. Paridade spec §77 (KPI ~120,
   table até `max-h-[60vh]`, chart `aspect-ratio 4/3`) é responsabilidade
   intrínseca do widget — `WidgetCard` já tem `flex min-h-0 flex-col`.

3. **Gap diferenciado**: `gap-y-3` em mobile (só vertical, sem coluna),
   `gap-3` em desktop (vertical + horizontal). Compactação leve em
   mobile alinhada à recomendação spec §76.

4. **Smoke standalone** em
   `apps/director-studio/src/routes/smoke-f064.tsx` — `/smoke/f064`:
   - 4 widgets fake (kpi/chart-bar colSpan=2/table/switcher) cobrindo os
     tipos suportados por F012.
   - Interceptação local de `window.fetch` para `/api/dashboards/me` e
     `/api/dashboards/refresh`, restaurada on-unmount. Zero dependência
     de backend ou auth — abre-se a rota e o dashboard renderiza.
   - Reproduz inline o `shapeData` do backend para kpi/table/chart/switcher.
   - Rota registrada fora do `AppShell` (root layout) para isolar o
     comportamento do grid responsivo sem ruído de sidebar/header.

5. **Verificação visual**: redimensionar a janela cruzando 640px deve
   alternar entre stack vertical (1 col, 4 linhas) e grid 2x2 (chart
   colSpan=2 na primeira linha; KPI/table/switcher distribuídos 2-col na
   sequência). `resize_window` do MCP claude-in-chrome pode confirmar em
   sessão Playwright (não exercitado nesta sessão — Vite morto conforme
   notas anteriores).

## Verificação

- `npx turbo run typecheck` — 3/3 packages OK (`@workspace/api`,
  `@workspace/ui`, `@workspace/director-studio`).
- Anti-violação:
  - Sem cor direta (paleta semântica via tokens herdada do `WidgetCard`).
  - Sem Lucide (Phosphor mantido).
  - Sem polling (interceptor `fetch` é estritamente request/response).
  - Sem `console.log`.

## Não-cobertos (débito consciente)

- Validação visual end-to-end via Playwright + `resize_window` mobile
  (delegado ao ui-tester quando Vite voltar).
- Pull-to-refresh mobile (spec §83) — fora do escopo F064.
- `/dashboard` real (rota produtiva) usa o mesmo `DashboardSurface`, então
  herda a correção automaticamente; smoke isolado existe para garantir
  reprodutibilidade sem auth.
