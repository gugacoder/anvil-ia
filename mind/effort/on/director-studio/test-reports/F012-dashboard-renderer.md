# Test report — F012 Dashboard renderer

**Data**: 2026-05-15
**Resultado**: fail
**Ambiente**: localhost:3000 (Vite dev) + localhost:3001 (API)
**Caso real testado**: PROCESSA/99 (Imperial Logística 29) — sessão F003 ativa; payload do dashboard é fake hardcoded conforme entregue por smith (F012 é renderer + endpoint stub; objetos reais ficam para F-tbobjetos-dashboard).

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| 1 | `GET /api/dashboards/me` com cookie de sessão | 200 + payload com 4 widgets | 200; payload contém `dashboards[0].boxConfig.widgets[]` com 4 itens (kpi-1, chart-1, table-1, switcher-1) com `fake.rows` embutido | pass |
| 2 | Navegar UI até `/app/dashboard` | Tela renderiza | URL atinge `/app/dashboard`; 4 widgets visíveis no DOM via `[role="region"]`/`section[aria-labelledby]` | pass |
| 3 | KPI valor 128 + sublabel "vs. ontem 102" | Ambos presentes | `text-4xl` "128" + "vs. ontem 102" em `text-xs text-muted-foreground` | pass |
| 4 | Recharts BarChart com 3 categorias | 3 ticks no xAxis | `.recharts-wrapper` presente; xAxis ticks = `["Manhã","Tarde","Noite"]`; 6 `.recharts-bar-rectangle` (3 cat × 2 series concluidos/pendentes) | pass |
| 5 | Tabela 4 linhas + headers auto-inferidos | 4 `<tr>` + headers | 4 rows; thead headers = `["CODIGO","NOME","PEDIDOS","STATUS"]` (auto-inferidos do payload `fake.rows[0]`) | pass |
| 6 | Switcher 3 opções, segmented, role=tablist | 1 tablist com 3 tabs | 1 `[role="tablist"]` com `[role="tab"]` × 3 = `["Hoje","Semana","Mês"]` | pass |
| 7 | Desktop grid 2×2 com colSpan/rowSpan | CSS Grid 2 colunas | `gridTemplateColumns: "538px 538px"`, `gridTemplateRows: "minmax(220px,1fr) minmax(220px,1fr)"`, `gap-3` | pass |
| 8 | Mobile stack vertical | CSS quebra em 1 coluna < 640px | Classe atual: `grid grid-cols-2 grid-rows-[...] gap-3` — **sem variante responsiva** (`md:grid-cols-2` ausente). Em viewport real <640px ainda seria 2 colunas. Viewport CDP-locked em 1536 (F033) impede teste empírico, mas inspeção CSS evidencia divergência de spec `dashboard.md §74` ("Sem grid. Widgets empilham na ordem `layout.order`, full-width"). | ressalva (não-bloqueante por critério explicitamente concedido pelo usuário; mas é débito real de spec compliance) |
| 9 | Auto-refresh dispara setInterval | KPI=30s deveria fazer 2 fetches em 76s; chart/table/switcher=60s deveriam fazer 1 fetch | Patcheei `window.fetch` e `XMLHttpRequest.prototype.open` antes da janela de observação; armei timer; aguardei **76 segundos contínuos** com a aba visível e focada. **Zero** requests para `/api/dashboards/refresh` (ou qualquer outro endpoint) registrados no período. | **FAIL** |
| 10 | Aba oculta pausa, retoma ao voltar | Refetcha vencidos no return | Não testável — auto-refresh não dispara mesmo com aba visível (C9 fail) | n/a |
| 11 | Sem regressão F003-F011/F023/F050/F051 | Shell intacto | Sidebar com menu hierárquico OK, breadcrumbs "Inicio › Dashboard" OK, header com switcher de empresa OK, theme toggle não testado mas presente | pass |
| 12 | Console limpo | Sem erros | 4 mensagens DEBUG do `@vite/client` ("connecting..." + "connected.") — esperado em dev | pass |

## Validação extra: botão manual

- Click em `button[aria-label="Atualizar agora"]` do widget KPI → `POST /api/dashboards/refresh` capturado pelo patch (status 200 implícito, sem erro). Confirma que **o endpoint existe e é acessível, e o fluxo manual funciona**. Falha está no **wiring do auto-refresh**, não no endpoint.

## Falhas

- **F012.C9 — Auto-refresh não dispara**. Esperado por `dashboard.md §"refreshPolicy"` (linha 39) e por critério explícito do principal ("auto-refresh por widget min 10s, pausa em aba oculta"): cada widget deve refazer fetch ao vencer seu `intervalSeconds`. Observado: 76s contínuos com aba focada, zero requests. Causa-raiz provável: hook `useDashboardRefresh` (mencionado em `dashboard.md §"Notas para o smith"` linha 244 e `dashboard-widget.md §393`) não está armando `setInterval`, OU o handler interno não chama o `fetch` patcheado (e.g., usa fetch capturado em closure no module-load — improvável, mas possível se o módulo faz `import {fetch} from ...`). Como o botão manual chama o endpoint corretamente, o problema é especificamente no **timer**, não no callback de refresh.

- **F012.C8 — Mobile sem stack vertical (ressalva)**. CSS `grid grid-cols-2` aplicado sem variante responsiva. Spec `dashboard.md §74-78` exige stack vertical full-width em viewport <640px. Em mobile real o usuário veria 2 colunas com cards apertados em vez do stack. Concedido como não-bloqueante pelo principal (mesma classe F033), mas é débito que precisa entrar no manifest (sugestão: `F012-mobile-stack`).

## Evidência

### Payload `/api/dashboards/me` (recorte)
```json
{
  "ok": true,
  "dashboards": [{
    "id": "fake-1",
    "name": "Operação — visão geral",
    "favorite": true,
    "boxConfig": {
      "widgets": [
        {"id":"kpi-1","type":"kpi","title":"Pedidos hoje","intervalSeconds":30,"fake":{"rows":[{"label":"Pedidos hoje","valor":128,"sub":"vs. ontem 102"}]}},
        {"id":"chart-1","type":"chart","chartKind":"bar","title":"Pedidos por turno","intervalSeconds":60,"fake":{"rows":[{"turno":"Manhã","concluidos":42,"pendentes":7},...]}},
        {"id":"table-1","type":"table","title":"Top motoristas","intervalSeconds":60,...},
        {"id":"switcher-1","type":"switcher",...}
      ]
    }
  }]
}
```

### DOM measurements
- `widgets count via [role=region]`: 4
- `kpiValue`: "128", `kpiSublabel`: true
- `recharts wrapper`: presente, bars=6, categorias=["Manhã","Tarde","Noite"]
- `table rows`: 4, headers=["CODIGO","NOME","PEDIDOS","STATUS"]
- `tablists`: 1, tabs=["Hoje","Semana","Mês"]
- `gridTemplateColumns`: "538px 538px" (desktop OK)
- container classes: `grid grid-cols-2 grid-rows-[minmax(220px,1fr)_minmax(220px,1fr)] gap-3` (sem responsivo)

### Auto-refresh probe
- t=0: armed (fetch + XHR patcheados, contador zerado)
- t=35681ms: fetches=0, xhrs=0
- t=76682ms: fetches=0, xhrs=0
- Manual click "Atualizar agora" → 1 fetch capturado em 1.5s, `POST /api/dashboards/refresh` (confirma que endpoint e fluxo manual funcionam)

### Console
- 4 mensagens DEBUG do vite-client (esperadas)
- Zero errors/warnings/exceptions

## Próxima ação

**fail → smith retoma**. Investigar:
1. Onde estão os `setInterval`/`setTimeout` dos widgets (hook `useDashboardRefresh`?)
2. Confirmar via React DevTools / breakpoint se o efeito monta e desmonta corretamente
3. Verificar se algum cleanup precoce está cancelando o timer no primeiro render (StrictMode duplo-mount em dev pode mascarar bug se o efeito não for idempotente)
4. Após corrigir: revalidar C9 + C10 (aba oculta pausa via `document.visibilityState`)
5. Spec compliance C8: adicionar variante `grid-cols-1 md:grid-cols-2` ou enfileirar `F012-mobile-stack` no manifest
