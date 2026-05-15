---
title: F012 — Dashboard renderer (decisões de implementação)
tags: [effort, director-studio, F012, decisions, smith]
created: 2026-05-15
---

# F012 — Dashboard renderer

## Decisões

1. **Rota separada `/app/dashboard`** (não via ModelEngine). O engine F009 dispatcheia
   por presença de chave em `TBmodel_pagina.DFvalor`; dashboard vive em **entidade
   própria** `acesso.TBdashboard` (vide [[model-valor-dashboard]]). Manter o
   renderer fora do engine reflete o contrato e evita aliasing.

2. **Schema normalizado no engine, não no widget.** Forma canônica em
   `packages/ui/src/components/dashboard/types.ts`:
   `boxConfig = { widgets: WidgetSlot[] }`, com `WidgetSlot = {id, type, title,
   procedure?, body?, intervalSeconds?, layout, fake?}`. O backend já entrega
   na forma canônica; quando F052b destravar a proc
   `acesso.consultar_model_dashboards`, o adapter converte
   `boxElements/boxDimension/chartData/quadrante` → `widgets[]` antes de servir.

3. **Recharts** em vez de Google Charts (decisão F012 da spec UX).
   `widget-chart.tsx` suporta `bar | line | pie`. Gauge fica para P2
   (custom SVG arc, sem dep externa). Scatter/Combo/GeoChart/TreeMap/Sankey
   reportados como sinais ao curator pela designer; smith não implementa
   nesta wave.

4. **Tokens semânticos como cor de série** (proibido hex). Recharts aceita
   `var(--token)` como `fill`/`stroke` literal — paleta default é
   `[primary, x-info, x-success, x-warning, x-error, accent-foreground]`,
   reciclada em mod n. Tema claro/escuro alterna nativamente via CSS.

5. **Layout responsivo**: mobile (< 768px) = stack vertical scrollável;
   desktop = CSS Grid 2×2 fixo, com `colSpan`/`rowSpan` honrados via
   `col-span-2`/`row-span-2`. `react-grid-layout` é P2 (sinal ao curator
   já consta em F-dashboard-grid-layout).

6. **Auto-refresh por widget** via `setInterval`, mínimo 10s (paridade
   legado §"DashBoardBox.js:285-291"). Hook `useDashboard` mantém o pool
   de timers, dispara apenas se `document.visibilityState === 'visible'`
   e refaz vencidos ao voltar (paridade não tinha; legado drenava
   bateria). SSE substitui em F-dashboard-sse (P2).

7. **Endpoints**:
   - `GET /api/dashboards/me` — devolve `{ok, dashboards:[{id,name,description,favorite,boxConfig}]}`.
     MVP retorna **1 dashboard fake hardcoded** (4 widgets cobrindo
     kpi+chart+table+switcher) com `widgets[].fake.rows` embutido para
     smoke local sem dep de banco. Quando F052b destravar, troca para
     execução da proc `acesso.consultar_model_dashboards`.
   - `POST /api/dashboards/refresh` — body `{widgets:[{id,type,procedure,body,fake}]}`,
     resposta `{ok, widgets:[{id, ok, data?, error?}]}`. Partial failure
     não colapsa o batch. Executa proc por widget (XML `<root>` payload
     como em forms-proxy/grid), tolerante a envelope `<Response>` (dashboard)
     OU `<Relatorio>` (grid) OU JSON OU recordset plano.

8. **Sem persistir snapshot** do `data` no `boxConfig` (recomendação UX
   spec — metadata-only). Refetch sempre ao mount.

9. **Switcher redesenhado como segmented control** (spec dashboard-widget).
   Estado da opção ativa é local ao componente (não envia ao backend).
   `linkedSlotId` registra qual slot é trocado — semântica de "trocar
   conteúdo do outro quadrante" do legado é exposta textualmente no
   footer do switcher ("Atualiza: <slot-id>"). Aplicação efetiva da troca
   (re-fetch do slot alvo com filtro do switcher) fica para wave
   subsequente — switcher hoje só registra estado UI.

10. **Adiados explicitamente**:
    - Shared-link `#/dashboard?tkn=...&obj=...` (F-dashboard-shared-link
      precisa redesenhar o token de 30 dias na URL).
    - Edit mode (drag/resize/configurar/salvar layout). Spec descreve
      mas wave atual é só `view`.
    - Pull-to-refresh mobile (recomendado pela spec; ainda não implementado).
    - Rotation exhibition multi-dashboard.
    - Gauge (sem equivalente direto em Recharts; requer SVG custom).

11. **Sem Google Charts**, sem `eval`, sem polling fora do `setInterval`
    do hook, sem `console.log` no backend (Pino estruturado em todos os
    paths via `logger.info`/`logger.warn`).

## Smoke test

Local (sem Playwright nesta sessão): typecheck dos 3 packages OK; `vite build`
do app `director-studio` OK (sem unresolved imports). Caminho exercitado em
runtime quando o usuário navegar para `/app/dashboard` autenticado:

- Frontend chama `GET /api/dashboards/me`, recebe o dashboard fake (4 widgets).
- `useDashboard` faz `POST /api/dashboards/refresh` com `widgets[]` carregando
  `fake.rows` — backend aplica `shapeData(type, rows)` por widget e devolve
  `{ok, data, source:'fake'}` para cada.
- `DashboardSurface` pinta:
  - **KPI "Pedidos hoje"** — value `128` formatado pt-BR (`1.28e2 → 128`),
    label "Pedidos hoje", sublabel "vs. ontem 102".
  - **Bar chart "Pedidos por turno"** — 3 categorias (Manhã/Tarde/Noite) ×
    2 séries (concluidos/pendentes), via Recharts `<BarChart>`, paleta
    `primary` + `x-info`, axes/grid/tooltip com tokens semânticos.
  - **Table "Top motoristas"** — 4 linhas (M-101..M-104), headers
    inferidos do primeiro row (`CODIGO/NOME/PEDIDOS/STATUS`).
  - **Switcher "Filtrar período"** — 3 opções (Hoje/Semana/Mês),
    segmented control com `aria-selected`, footer "Atualiza: chart-1".
- Em mobile (<768px) os 4 widgets empilham; em desktop 2×2.
- Auto-refresh: o KPI roda a 30s, chart/table a 60s; pausa quando aba
  oculta. Verificável via DevTools (network).

Smoke real contra base Area 52 fica adiado: não há proc
`studio.smoke_dashboard_*` cadastrada nem dashboard real seedado
(depende de F-tbobjetos-dashboard + F052b). O caminho de `fake.rows`
é o que o backend usa para smoke; é o gatilho deste DoD.

## Arquivos

### Novos

- `workspace/director-studio/apps/api/src/routes/dashboards.ts` — endpoints
  `/me` + `/refresh`, parser de envelope `<Response>`/`<Relatorio>`, shaper
  por widget, fake dashboard hardcoded.
- `workspace/director-studio/packages/ui/src/components/dashboard/types.ts`
- `workspace/director-studio/packages/ui/src/components/dashboard/widget-card.tsx`
- `workspace/director-studio/packages/ui/src/components/dashboard/widget-kpi.tsx`
- `workspace/director-studio/packages/ui/src/components/dashboard/widget-table.tsx`
- `workspace/director-studio/packages/ui/src/components/dashboard/widget-chart.tsx`
- `workspace/director-studio/packages/ui/src/components/dashboard/widget-switcher.tsx`
- `workspace/director-studio/packages/ui/src/components/dashboard/dashboard-surface.tsx`
- `workspace/director-studio/packages/ui/src/components/dashboard/index.ts`
- `workspace/director-studio/packages/ui/src/hooks/use-dashboard.ts`
- `workspace/director-studio/apps/director-studio/src/routes/dashboard.tsx`
- `mind/effort/on/director-studio/backlog/F012-decisions.md` — este arquivo.

### Editados

- `workspace/director-studio/apps/api/src/index.ts` — mount `/api/dashboards`.
- `workspace/director-studio/packages/ui/package.json` — exports
  `./components/dashboard` + `./components/dashboard/types`; dep `recharts`.
- `workspace/director-studio/apps/director-studio/src/routes/tree.tsx` —
  rota explícita `/app/dashboard` antes do splat `/app/$`.

## Aberto / followups

- F-dashboard-shared-link (P1, redesenhar token).
- F-dashboard-grid-layout (P2, `react-grid-layout` n×m).
- F-dashboard-sse (P2, eventos por objeto).
- F-tbobjetos-dashboard (P1, catálogo).
- F-dashboard-edit-mode (drag/resize/configurar) — não enfileirada como
  feature dedicada ainda; provavelmente subdivide entre catálogo (objetos)
  e grid-layout.
- Gauge widget (custom SVG arc, P2).
- Pull-to-refresh mobile (primitivo reusável — sinal já registrado pela
  designer).
- Apontar entrada do menu para `/app/dashboard` (ACL precisa ter `TBpagina`
  para essa rota; provavelmente vira sub-feature de admin).
