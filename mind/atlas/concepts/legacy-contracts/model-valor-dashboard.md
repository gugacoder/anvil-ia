---
title: "model-valor.dashboard — schema do dashboard persistido em TBdashboard.DFmodel"
aliases: [model-valor-dashboard, dashboard-model, dashboard-renderer-contract, dashboard-boxconfig]
tags: [contract, legacy, react-tools, dashboard, model-valor, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: nó `boxConfig` (dashboard) — JSON persistido em `acesso.TBdashboard.DFmodel`

Sub-contrato fora da árvore de [[engine-schema-driven]]: o **dashboard não vive em `acesso.TBmodel_pagina.DFvalor`** como os demais discriminantes (form/grid/tree/tabs/wizard). Em vez disso, é uma **entidade própria** com tabela dedicada `acesso.TBdashboard` (uma linha por dashboard salvo pelo usuário) e catálogo separado `acesso.TBobjetos_dashboard` (paleta de "objetos" reutilizáveis que podem ser arrastados para um dashboard). O engine schema-driven **não despacha** dashboard por discriminante; o discriminante existe via **rotas hard-coded** em `AppMain.js`: `path === '/'` → `<DashBoardHome>` (dashboard favorito embutido na home da app); `path === '/dashboard'` → `<DashBoardCrud>` (CRUD de dashboards); `window.location.hash === '#/dashboard?...'` → `<DashBoardPage>` (modo exhibition standalone, com link compartilhável). Cobre F012 do manifest.

A unidade central é o `boxConfig` — um JSON com 5 chaves (`boxElements`, `boxDimension`, `boxInterval`, `chartData`, `quadrante`) que descreve uma **grid fixa 2×2 de quadrantes** onde cada quadrante hospeda um "objeto" do catálogo (`TBobjetos_dashboard`). O objeto traz: nome, procedure SQL que produz os dados, e `tipo` (discriminante do widget: chart Google Charts, grid HTML, string KPI, ou conjunto de botões que troca o conteúdo de outro quadrante). Layout permite redimensionar (drag das bordas) e fundir quadrantes adjacentes (1 célula vira 1×2, 2×1, 2×2). Auto-refresh por quadrante, com intervalo individual em segundos.

O renderer de widget é **`react-google-charts`** (wrapper React do Google Charts/Visualization API), com `chartType` repassado direto via `chartData[boxId].tipo`. Não há lib local de gauges/sparklines/mapas — o vocabulário de gráficos é estritamente o do Google Charts. Quatro tipos do `tipo` (`Grid`, `String`, `Buttons`, e qualquer outro) ramificam para renderers customizados; demais valores caem no `<Chart chartType={tipo}>`.

> Observação crítica: o catálogo `TBobjetos_dashboard` é por aplicação (campo `DFaplicacao`), administrado em outra UI (não no DashBoard); os usuários **só compõem** dashboards a partir desse catálogo. A procedure SQL de cada objeto deve retornar `dados.response.linhas.linha` (envelope diferente do `dados.relatorio.linhas.linha` do grid — vide §"Endpoint de dados"). O parser do `useDashboardUtils.sendDataRequest` transforma `linha[]` em um array bidimensional `[header[], ...rows]` que o Google Charts consome.

## Citações de fonte

- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoard.js:32-39` — props do `<DashBoard/>` e estado inicial derivado de `dashBoardConfig.boxConfig.{chartData,boxDimension,boxInterval,boxElements,quadrante}`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoard.js:242-243` — forma canônica do `model` ao persistir: `{boxElements, boxDimension, boxInterval, chartData, quadrante}` → `JSON.stringify` → vai em `DFmodel`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoard.js:500-532` — render: 4 quadrantes iterando `boxElements[]` (sempre 4 slots, mesmo vazios); cada slot vira `<DashBoardBox/>` com `gridColumn`/`gridRow` do `boxDimension[idx]`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoard.js:152-162` — busca catálogo de objetos por aplicação: `POST /proc/acesso.consultar_model_objetos_dashboard {aplicacao}`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoard.js:164-185` — carrega config de dashboard salvo: `POST /proc/acesso.consultar_model_dashboards {id}` → `JSON.parse(linha[0].json)`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoard.js:75-90` — `handleSetRefreshTimer`: `setTimeout` recursivo que refaz `sendDataRequest` a cada `chartData[id].intervalo * 1000` ms; rearma a si mesmo ao final.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoard.js:224-263` — `sendUpdateRequest`: monta `modelElements`, valida nome+descricao obrigatórios, `POST /proc/acesso.sp_persistir_dashboard {id, nome, descricao, model, idUsuario, aplicacao}`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoard.js:265-374` — `verifyBoxDimensions`: algoritmo de drop em grid 2×2 com `gridColumns[[0,2],[1,3]]` (mesma linha = índices 0,1 ou 2,3; mesma coluna = índices 0,2 ou 1,3); resolve fusões/swaps; `gridColumn: '1/3'` ou `'1/2'`/`'2/3'`, `gridRow: '1/3'` ou vazio.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardBox.js:3` — `import { Chart } from 'react-google-charts'`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardBox.js:104-111` — `options` do Google Charts: para `tipo` `'Line'` ou `'Bar'` usa material chart (`{chart: {title}}`); demais → classic chart (`{title}`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardBox.js:811-869` — branching do renderer por `chartData[boxId].tipo`: `'Grid'` → `<DashBoardGrid>`; `'String'` → KPI com `<h2>` + `<h1>`; `'Buttons'` → `<DashBoardButtons>`; **qualquer outro** → `<Chart chartType={tipo} data={data} options={options}/>`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardBox.js:104-119` — `objectFilter` lido de `JSON.parse(chartData[boxId].filtros)` (string JSON na própria linha do `TBobjetos_dashboard`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardBox.js:879-933` — modal de configuração: escolha de "Elemento único" vs "Múltiplos Elementos" (caso `Buttons`); seleção de aplicação, objeto e quadrante alvo.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardBox.js:947-953` — handles de resize: 4 `<div draggable>` nas bordas (esquerda/direita/topo/base).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardBox.js:285-291` — validação de intervalo: rejeita `< 10` segundos.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardBox.js:720-723` — máximo de **10 elementos** em um `Buttons`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardButtons.js:18-61` — render de `Buttons`: ao clicar, chama `handleUpdateData(linkedBox, '', [], '', obj, true, obj.intervalo)` — troca conteúdo do **outro** quadrante (`linkedBox`) pelos dados do objeto clicado.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardGrid.js:5-62` — render de `tipo='Grid'`: `<table>` com `data.cabecalho` em `<thead>` e `data.rows` (linhas crus da proc, `row[prop]['#text']` ou `row[prop]`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardCrud.js:30-198` — página `#/dashboard` (CRUD): `GenericPage` com `gridActions` de `delete` (`/proc/acesso.sp_deletar_dashboard`) e `externalAction` "Gerar Link" (token via `auth/generate?dias=30` + JSON encodado em base64 da config; abre `#/dashboard?tkn=...&obj=...&interval=...` em nova aba).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardHome.js:42-225` — `<DashBoardHome>`: dashboard favorito embutido na home; `<GridButton>` permite trocar dashboard ativo (lista de dashboards do usuário via `acesso.consultar_model_dashboards` filtrado por `aplicacao+idUsuario`); botão "Salvar" persiste favorito (`acesso.sp_persistir_favorito_dashboard`); "Limpar" desmarca favorito.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardPage.js:13-82` — `<DashBoardPage>`: modo exhibition standalone para link compartilhado. Lê `?tkn=` (token de auth temporário) + `?obj=` (config em base64) + `?interval=` (rotate inter-dashboards). Suporta **rotação** entre múltiplos dashboards (`rotateDashboards`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/hooks/useDashboardUtils.js:54-137` — `sendDataRequest`: POST `/proc/{objectData.procedure}` com `{filtro: filterSelected}`; lê `dados.response.linhas.linha`; gera `data` formatado por `tipo` (`Grid` → `{cabecalho, rows}`; `String` → `[label, value]`; chart → `[[header], [row1], [row2], ...]` com coerção `Number(...)` em colunas numéricas).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/hooks/useDashboardUtils.js:11-47` — `generateTknDashboard`: pega token via `GET /auth/generate?dias=30`, busca config(s) do(s) dashboard(s) via `consultar_model_dashboards`, codifica config em base64 (`fromBinaryToBase64`), retorna `tkn=...&obj=...&interval=...`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/hooks/useDashboardUtils.js:202-229` — `sendFavoriteRequest` (lê dashboard favorito do usuário/app) e `sendAppsRequest` (lista aplicações do usuário, para popular dropdown no modal de configuração).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/AppMain/AppMain.js:71-81,115-118` — montagem das 3 entradas: `/dashboard?` (standalone, fora do shell), `path='/'` → `<DashBoardHome>`, `path='/dashboard'` → `<DashBoardCrud>`.
- `sources/engenharia--fabrica--javascript--react-tools/src/index.js:42-49` — public API exporta `DashBoard`, `DashBoardBox`, `DashBoardCrud`, `DashBoardGrid`, `DashBoardPage`, `DashBoardHome`, `DashBoardButtons`, `useDashboardUtils`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBdashboard.sql:1-20` — DDL: PK `DFid_dashboard`, `DFid_usuario`, `DFnome`, `DFdescricao`, `DFfavorito ('Sim'|null)`, `DFmodel NVARCHAR(MAX)` (JSON), `DFaplicacao`, `DFusuario` (alter).
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBobjetos_dashboard.sql:1-25` — DDL: PK `DFid_objeto_dashboard`, `DFnome`, `DFdescricao`, `DFtipo`, `DFproc`, `DFfiltros NVARCHAR(MAX)` (JSON), `DFaplicacao`, `DFchave NVARCHAR(150) NOT NULL UNIQUE` (alter).
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.consultar_model_dashboards.sql:88-128` — `SELECT ... FOR XML PATH('Linha'), ROOT('Linhas')` com `json:Array` → envelope JSON `{relatorio:{linhas:{linha:[{Id,Nome,Descricao,Favorito,Json,Id_Usuario,Aplicacao}]}}}`. Filtros: `nome`, `descricao`, `id` (lista CSV), `id_usuario`, `aplicacao`, `usuario`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.consultar_model_objetos_dashboard.sql:87-128` — envelope idêntico, `linha` traz `{Id,Nome,Descricao,Tipo,Procedure,Filtros,Aplicacao,NomeAplicacao}`. Filtros: `nome`, `descricao`, `aplicacao` (exato), `filtroapp` (nome da aplicação, LIKE).
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.sp_persistir_dashboard.sql:21-91` — UPSERT (`@id NULL` → INSERT; senão UPDATE) em `TBdashboard`. Resposta `<Resposta><Status>...<Sucesso>...<Dados>...`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.sp_persistir_favorito_dashboard.sql:30-87` — limpa `DFfavorito` corrente do par `(id_usuario, aplicacao, usuario)`, depois marca `@id` como favorito (`'Sim'`). Idempotente.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.sp_obter_dashboard_favorito.sql:16-49` — retorna `Id` do dashboard com `DFfavorito='Sim'` para `(id_usuario, aplicacao, usuario)`; envelope `<Retorno>`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.sp_deletar_dashboard.sql` — `DELETE FROM TBdashboard WHERE DFid_dashboard=@id` (DELETE acionado por `gridAction.action='delete'` no `<DashBoardCrud>`).
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/Processa.AppBuilder.Repositories/DashboardRepository.cs` — repository .NET equivalente (caminho `appbuilder/website`, alternativo ao `react-tools` — relevante para o cadastro do catálogo `TBobjetos_dashboard`, fora do escopo deste contrato).

## Estrutura do JSON `boxConfig` (vive em `acesso.TBdashboard.DFmodel`)

Forma canônica:

```
{
  "boxElements": [BoxElement, BoxElement, BoxElement, BoxElement],   // sempre 4
  "boxDimension": { "<idx>": { "gridColumn": string, "gridRow": string }, ... },
  "boxInterval":  { "<idx>": string|number, ... },                    // segundos
  "chartData":    { "<idx>": ChartDataItem | "", ... },               // dados+config por quadrante
  "quadrante":    LinkedBox | ""                                      // alvo do Buttons (se houver)
}
```

`<idx>` é literal `'0'`, `'1'`, `'2'`, `'3'` — sempre 4 quadrantes. Slot vazio é `{}` em `boxElements` e `''` em `chartData`. Layout-default: 2 colunas × 2 linhas via `grid-template-columns: repeat(2, 1fr)` em `DashBoard.js:13-18`.

### Campos do raiz

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `boxElements` | `BoxElement[4]` | sim | Ocupação de slots da grid 2×2 | array fixo de 4 itens | iterado em `DashBoard.js:501-531`; cada item vira um `<DashBoardBox>` (slot vazio renderiza botão "+", slot com `display:'none'` é elidido por fusão) | model |
| `boxDimension` | `{[idx]: {gridColumn, gridRow}}` | não (default `{}`) | Span CSS de cada quadrante | strings `'1/2'`, `'2/3'`, `'1/3'` | inline-style em cada `<DashBoardBox>` (`DashBoardBox.js:755-756`) | model |
| `boxInterval` | `{[idx]: string\|number}` | não (default `{}`) | Intervalo de auto-refresh em segundos | inteiro ≥ 10 | dispara `setTimeout(sendDataRequest, intervalo*1000)`; **mínimo 10s validado no UI** | model |
| `chartData` | `{[idx]: ChartDataItem\|''}` | sim para slots ocupados | Dados resolvidos + config do objeto naquele quadrante | objeto ou string vazia | é o que é renderizado; persistido **com os dados de uma resolução do servidor já dentro** (não só metadados) | model + runtime |
| `quadrante` | `LinkedBox\|''` | apenas se algum quadrante tem `tipo='Buttons'` | Identifica o quadrante "alvo" onde o conteúdo trocado pelos botões aparece | array de 1 item `[{label, value, initialBox}]` | `<DashBoardButtons>` chama `handleUpdateData(parseInt(value), ...)` ao clicar | model |

> **Anatomia inusual**: `chartData[idx].data` (o output cru da proc do servidor) **é persistido junto** no JSON do dashboard. Isto significa que a config carregada do banco já mostra dados (possivelmente desatualizados) instantaneamente, antes do primeiro fetch. Auto-refresh substitui in-place. Studio decide se quer persistir snapshot ou só metadata.

### `BoxElement` (slot)

| Item | Tipo | Obrigatório | Semântica | Valores legais |
|---|---|---|---|---|
| `id` | string | sim (quando ocupado) | Identifica qual `chartData[id]` esse slot mostra (normalmente igual ao próprio idx; diferente quando há fusão/swap) | `'0'`/`'1'`/`'2'`/`'3'`/`''` |
| `display` | string | não | `'none'` quando o slot foi absorvido por outro (fusão); `''` caso contrário | `'none'`/`''` |

`{}` = slot vazio.

### `ChartDataItem` (config + dados do objeto no slot)

Origem dual: campos do catálogo `TBobjetos_dashboard` + campos sintetizados pelo `sendDataRequest`.

| Item | Tipo | Obrigatório | Semântica | Vem de |
|---|---|---|---|---|
| `id` | string\|number | sim | PK do objeto em `TBobjetos_dashboard.DFid_objeto_dashboard` | catálogo |
| `nome` | string | sim | Nome visível (vira título do gráfico) | catálogo |
| `descricao` | string | não | Descrição livre | catálogo |
| `aplicacao` | string | sim | Chave da aplicação dona do objeto (`TBaplicacao.DFchave`) | catálogo |
| `nomeAplicacao` | string | não | Nome humano da aplicação | catálogo |
| `procedure` | string | sim | Nome da stored procedure que produz os dados (`/proc/<procedure>`) | catálogo |
| `tipo` | string | sim | Discriminante do widget — **veja §"Catálogo de `tipo`"** | catálogo |
| `filtros` | string (JSON) | não | Schema de filtros aplicáveis a esse objeto: `{filtros:[{label, prop}]}` (renderizado pelo `<Filtros>` no botão filtro do quadrante) | catálogo |
| `data` | array \| object | sim (após primeira resolução) | Output formatado para o renderer (forma depende de `tipo` — ver §"Formato de `data`") | runtime (sendDataRequest) |
| `filtroSelecionado` | object | não | Filtro aplicado na última resolução (persistido junto com o snapshot) | runtime |
| `intervalo` | string\|number | não | Sobrepõe `boxInterval[idx]` para o auto-refresh deste objeto | catálogo (objetos em `Buttons` carregam intervalo próprio) |
| `elements` | `ChartDataItem[]` | apenas quando `tipo='Buttons'` | Lista de objetos cujos botões aparecem; cada item tem `id`, `label` (`nome`), `intervalo` | runtime |

### `LinkedBox` (alvo dos botões)

```
[ { "label": "1"|"2"|"3"|"4", "value": "0"|"1"|"2"|"3", "initialBox": number } ]
```

Array de **1 item** (legado usa estrutura de array para reaproveitar `<PowerSelect>`). `value` é o idx do quadrante alvo onde `<DashBoardButtons>` despeja o conteúdo do botão clicado. `label` é a "casa" humana (1-based). `initialBox` registra de qual quadrante o Buttons foi criado (usado em redimensionamento/swap).

## Catálogo de `tipo` (discriminante do widget)

Decidido em `DashBoardBox.js:811-869`. Universo observado:

| `tipo` | Renderer | Comentário |
|---|---|---|
| `'Grid'` | `<DashBoardGrid/>` (tabela HTML simples) | `data = { cabecalho: string[], rows: Row[] }`; sem ordenação, paginação ou filtro — é "dumb table". `max-height: 73vh`. |
| `'String'` | `<h2>{data[0]}</h2><h1>{data[1]}</h1>` inline (`stringContainer`) | KPI 1-up: label + valor. `data = [string, string]`. |
| `'Buttons'` | `<DashBoardButtons/>` | Lista horizontal de botões (até 10). Cada botão troca o conteúdo do quadrante `quadrante.value` pelos dados do objeto associado ao botão. Não chama proc própria — é um "switcher". |
| `'Line'` | `<Chart chartType='Line'/>` (Google Charts material Line) | options `{chart:{title}}`. |
| `'Bar'` | `<Chart chartType='Bar'/>` (Google Charts material Bar) | options `{chart:{title}}`. |
| **qualquer outro valor** | `<Chart chartType={tipo}/>` (Google Charts classic) | options `{title}`. Universo aceito é o **inteiro do Google Charts**: `'PieChart'`, `'AreaChart'`, `'ColumnChart'`, `'ScatterChart'`, `'ComboChart'`, `'Gauge'`, `'GeoChart'`, `'Timeline'`, `'TreeMap'`, `'Histogram'`, `'CandlestickChart'`, `'BubbleChart'`, `'OrgChart'`, `'Sankey'`, `'WordTree'`, etc. **Não há lista canônica no legado** — depende do que o admin do catálogo cadastrou em `TBobjetos_dashboard.DFtipo`. |

> **Inventário real** dos `tipo` em produção exige consulta a `TBobjetos_dashboard.DFtipo` por aplicação (não há catálogo enum). Sub-contrato `tbobjetos-dashboard.md` a criar para listar valores cross-tenant. Hipótese de maior uso: `'PieChart'`, `'ColumnChart'`, `'Line'`, `'Bar'`, `'Grid'`, `'String'` (com `'Gauge'` esporádico).

## Formato de `data` (saída do `sendDataRequest`)

`useDashboardUtils.sendDataRequest` (linhas 54-137) transforma o envelope da proc em formato consumível pelo renderer.

### Resposta canônica da proc (esperada pelo parser)

```
{
  "sucesso": boolean,
  "dados": {
    "response": {
      "linhas": { "linha": Row[] | Row }
    }
  }
}
```

> **Atenção — envelope diferente do grid**: dashboards usam `dados.response.linhas.linha` (singular `response`), enquanto o grid usa `dados.relatorio.linhas.linha` (singular `relatorio`). Não há `quantidadeParcial`/`quantidadeTotal` — dashboard não pagina. Procs cadastradas em `TBobjetos_dashboard.DFproc` devem montar `FOR XML PATH('Linha'), ROOT('Linhas'), TYPE` dentro de um root `<Response>` em vez de `<Relatorio>`.

### Pipeline de transformação

1. **`tags = Object.keys(linha[0])`** (ou `Object.keys(linha)` se `linha` é objeto singular).
2. **`header = tags.map(camelToSpace + UPPERCASE)`** via regex `/([A-Z])([A-Z])([a-z])|([a-z])([A-Z])/g`. Ex.: `dataInicio` → `DATA INICIO`. `'@Array'` é filtrado.
3. **Cada `Row`**: para cada `tag`, `row[tag]['#text']` (se XML attribute) ou `row[tag]` direto.
4. **Por `tipo`**:
   - `'String'`: `data = [header[0], rows[1]]` (KPI). Exige `linha` ser objeto singular, não array (senão `warning('Dados insuficientes')`).
   - `'Grid'`: `data = { cabecalho: header, rows: linha }` (linhas crus, **não** processadas).
   - chart (qualquer outro): `convertDataChart(header, rows, tipo)`:
     - Coerção: `Number(...)` em colunas numéricas; preserva string em colunas não-numéricas.
     - Reordenação: chama `reorderRows` que **força strings antes de numbers** em cada linha (necessário para Google Charts: 1ª coluna é eixo categórico, demais são séries).
     - Estrutura final: `[[h1, h2, h3], [s, n, n], [s, n, n], ...]`.

### Validações de erro (silenciadas com `warning`)

| Caso | Verificação | Efeito |
|---|---|---|
| `linha` ausente / `linhas` ausente | branch else em `:130-134` | toast "Dados insuficientes para preencher o objeto." |
| Linhas com nº de keys ≠ entre si | `verifyError(linha)` em `:192-200` | toast idem; data vira `''` |
| Múltiplos campos string por linha em chart | `verifyBatchString(rows)` em `:180-190` | toast idem |
| Procedure não definida no `objectData` | `if (!objectData?.procedure) return;` | silent return — quadrante fica em estado anterior |

## Endpoints (RPC)

| Endpoint | Quando | Body | Resposta esperada |
|---|---|---|---|
| `POST /proc/acesso.consultar_model_dashboards` | listar dashboards do usuário (Crud, Home, gerar link) | `{id?, nome?, descricao?, idUsuario, aplicacao, pagina?, limite?, ordenacao?}` | `{relatorio:{linhas:{linha:[{Id,Nome,Descricao,Favorito,Json,Id_Usuario,Aplicacao}]}, quantidadeParcial, quantidadeTotal}}` — `Json` é string com o `boxConfig` |
| `POST /proc/acesso.consultar_model_objetos_dashboard` | povoar dropdown de objetos no modal de configuração | `{aplicacao}` | `{relatorio:{linhas:{linha:[{Id,Nome,Descricao,Tipo,Procedure,Filtros,Aplicacao,NomeAplicacao}]}}}` |
| `POST /proc/acesso.sp_persistir_dashboard` | salvar dashboard (criar/atualizar) | `{id?, nome, descricao, model, idUsuario, aplicacao}` (`model = JSON.stringify(boxConfig)`) | `<Resposta><Status>200<Sucesso>true<Dados>...` |
| `POST /proc/acesso.sp_deletar_dashboard` | deletar (via `gridAction.delete` em `<DashBoardCrud>`) | `{id}` | `<Resposta>...` |
| `POST /proc/acesso.sp_obter_dashboard_favorito` | identificar favorito ao montar Home | `{idUsuario, aplicacao, usuario}` | `{retorno:{id}}` |
| `POST /proc/acesso.sp_persistir_favorito_dashboard` | marcar/desmarcar favorito | `{id?, idUsuario, aplicacao, usuario}` (`id` vazio = só limpa) | `<Resposta>...` |
| `POST /proc/acesso.sp_consultar_aplicacoes` | popular dropdown de aplicações no modal | (sem body) | `{relatorio:{linhas:{linha:[{chave, titulo, ...}]}}}` |
| `POST /proc/<objectData.procedure>` | resolver dados de um objeto (proc do catálogo) | `{filtro: filterSelected}` | `{response:{linhas:{linha:[...]\|{...}}}}` |
| `GET /auth/generate?dias=30` | gerar token para link compartilhável (DashBoardCrud > Gerar Link) | — | `{dados: <jwt>}` |

> Auth: todas as POSTs viajam com Bearer do `authState.token` (mesmo padrão do engine; vide [[obter-model-pagina]]).

## Modo "exhibition standalone" (link compartilhável)

Fluxo de `DashBoardCrud > Gerar Link`:

1. Seleciona 1+ dashboards no grid.
2. Se >1, pede `rotateInterval` (≥10s).
3. `generateTknDashboard` (em `useDashboardUtils`):
   - `GET /auth/generate?dias=30` → token com 30 dias de validade.
   - `POST consultar_model_dashboards {id: csv}` → recebe `linha[]` com JSON de cada dashboard.
   - `fromBinaryToBase64(JSON.stringify(linha[]))` → string base64 do array de configs.
4. Abre `window.open('#/dashboard?tkn=<jwt>&obj=<base64>&interval=<seg>?', '_blank')`.

`<DashBoardPage>` (path `#/dashboard?`):

- Lê params do hash, salva `tkn` em `localStorage['@director/tkn']` (autorização das procs subsequentes).
- Decodifica `obj` (`fromBase64ToString`); parseia o array de configs.
- Se 1 dashboard: monta `<DashBoard exhibitionMode={true}/>` direto.
- Se >1: `rotateDashboards(configs, 0, rotateInterval)` — alterna o config a cada `rotateInterval` segundos via `setTimeout` recursivo, refazendo a resolução de cada objeto a cada rotação (`sendRequestObj` por quadrante).
- `disableAppsRequest=true` (não busca catálogo — read-only).
- `disableInterval=true` (não auto-refresh interno; rotação substitui).

> **Implicação de segurança**: o link compartilhável carrega `tkn` (JWT de 30 dias do usuário gerador) na URL. Quem tiver o link tem **autenticação completa** do gerador por 30 dias. Não há revogação. Studio deve repensar (token escopado ao dashboard, sem permissão geral; ou autenticação separada).

## Relações com o ecossistema

- Consome de: [[app-main]] (montagem via path/hash); [[obter-model-pagina]] (envelope cross-cutting, mas com `response` em vez de `relatorio`); catálogo `TBobjetos_dashboard` (não tem contrato — sub-contrato a criar).
- É consumido por: F012 (renderer). Indireto: F005/F007 (a Home da app vive no mesmo slot do `tabLayout` e mostra `<DashBoardHome>` quando `path='/'`).
- Acopla: `<Filtros>` ([[engine-schema-driven]] §F016) — modal de filtro por quadrante; `<GenericPage>` + `<DataGrid>` ([[model-valor-datagrid]]) — `<DashBoardCrud>` usa o renderer de listagem padrão; `<PowerSelect>` (F019); `<GridButton>` ([[model-valor-datagrid]]).
- Sub-contratos a criar:
  - `tbobjetos-dashboard.md` — catálogo de objetos (forma do `DFfiltros`, universo real de `DFtipo`, ownership por aplicação).
  - `proc-dashboard-response.md` — envelope `{dados:{response:{linhas:{linha[]}}}}` vs `{dados:{relatorio:...}}` do grid (cross-cutting).
  - `dashboard-shared-link.md` — fluxo de token de 30 dias + base64 da config.

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- **Grid é fixa 2×2 (4 quadrantes)** — não há n×m configurável. Layout legado em `grid-template-columns: repeat(2, 1fr)`. Fusão até 1 quadrante 2×2 (ocupa o todo). Studio decide se mantém 2×2 ou abre para grid responsiva.
- **Catálogo de gráficos é o universo Google Charts** — qualquer `chartType` aceito por `react-google-charts` funciona. Migração para `recharts`/`visx` exige **mapeamento de tipo→componente**: `'PieChart'`→`<Pie>`, `'ColumnChart'`→`<Bar>` vertical, `'Line'`→`<Line>`, `'AreaChart'`→`<Area>`, `'Gauge'`→sem equivalente direto em recharts (custom). Não há "ScatterChart" pronto em recharts (`<Scatter>` sim). `'GeoChart'` é específico do Google.
- **`tipo` é texto livre vindo do catálogo** — admins cadastraram strings que **precisam coincidir** com nomes do Google Charts. Studio precisa: (a) cadastrar enum no catálogo migrado, (b) validar `tipo` na ingestão, (c) fallback amigável para `tipo` desconhecido.
- **Renderers customizados** (`Grid`, `String`, `Buttons`): paralelos ao Google Charts. Studio mantém:
  - `Grid` → tabela básica (sem ordenação/paginação) — reusar primitiva do DataGrid v2 em modo "dumb"?
  - `String` → card KPI 1-up. Spec de `kpi-card` a criar.
  - `Buttons` → switcher de conteúdo (acoplado a outro quadrante via `linkedBox`). Mecanismo de "linked quadrant" é único do legado — repensar como "filtro segmentado" ou "tab interno"?
- **Snapshot persistido**: o `data` resolvido do servidor é salvo dentro do JSON `boxConfig`. Em apps de longa duração, o dashboard pode mostrar dados estale na hora do carregamento até primeiro refresh. Studio decide se persiste só metadata (sempre re-fetch ao mount) ou snapshot (atual).
- **Auto-refresh é `setTimeout` recursivo** por quadrante, sem cap, sem coordenação. Em dashboard com 4 quadrantes a 10s, é 1 request/2.5s em média. Studio decide se mantém polling ou migra para SSE (F023 — `hub-sse-mapping`) com eventos `dashboard.<idObjeto>.refresh`.
- **Procs de dashboard usam envelope `<Response>` não `<Relatorio>`** — divergência sutil; backend reescrito precisa rotear ambos ou padronizar.
- **Filtros do dashboard são embutidos no JSON do objeto** (`TBobjetos_dashboard.DFfiltros` → `chartData[idx].filtros`) e renderizados pelo mesmo `<Filtros>` do grid. Studio reusa primitiva de filtro (F016).
- **Link compartilhável carrega JWT de 30 dias na URL** — vetor sério de vazamento (logs de proxy, histórico de browser, telemetria). Studio precisa repensar (token efêmero + handshake, ou link assinado escopado).
- **Multi-tenancy do dashboard** é por `(DFaplicacao, DFid_usuario, DFusuario)` — cada usuário tem seus dashboards por app, com favorito 1-de-N. Studio precisa preservar ou migrar para preferences usuário-app.
- **Rotação multi-dashboard** (`<DashBoardPage>`): refaz `sendRequestObj` por quadrante a cada rotação — `4 quadrantes × N dashboards` requests por ciclo. Studio considera cache TTL.
- **Modal de configuração lida com 2 modos de elemento** (`'Elemento único'` vs `'Múltiplos Elementos'`); o segundo é **só para `Buttons`** e exige escolher um **quadrante alvo**. Lógica de "Quadrante alvo" cria acoplamento entre slots — Studio precisa modelar relação ou esconder modo se não justificar.
- **Resize via drag das bordas** (`DashBoardBox.js:947-953`): handles esquerda/direita/topo/base. Algoritmo `verifyBoxDimensions` é específico para 2×2 (verifica `sameLine`/`sameColumn` com `gridColumns=[[0,2],[1,3]]`). Estende-se mal para grid n×m — Studio reescreve com lib de grid (ex. `react-grid-layout`) se quiser flexibilidade.
- **Nenhum skeleton de loading** no quadrante durante refresh — usa `setPageBlur(true)` global (overlay do app inteiro). Studio decide UX por quadrante.
- **Não há export** (CSV/PDF/imagem) de dashboard. Apenas o link compartilhável serve como "snapshot navegável".
- **Catálogo de objetos é administrado fora** — `<DashBoardCrud>` só gerencia dashboards (composições). Cadastro de `TBobjetos_dashboard` é feito por outra UI (provavelmente no `processa.appbuilder`, vide `DashboardRepository.cs`). Studio decide se traz cadastro de objetos para dentro ou mantém separado.
- **`@Array` tag** aparece no envelope JSON (artefato do `for json` no SQL Server) e é filtrada explicitamente no parser. Mesma convenção do envelope geral Processa.
- **`#/dashboard?` é fora do shell** (sem sidebar, sem header — montagem early em `AppMain.js:71-81`). Studio mantém modo "kiosk" como rota separada.

## Estratégia para o Studio (MVP)

Sem prescrever stack, o que precisa estar resolvido no MVP de F012 para paridade funcional mínima:

1. **Esquema de persistência**: tabela equivalente a `TBdashboard` (`{id, idUsuario, aplicacao, nome, descricao, favorito, model JSONB}`) + catálogo `TBobjetos_dashboard` (`{id, chave, aplicacao, nome, descricao, tipo, proc, filtros JSONB}`). Endpoints REST equivalentes às 8 procs listadas em §"Endpoints".
2. **Discriminantes de widget mínimos** (cobertura ≥80% dos casos esperados — confirmar com inventário cross-tenant):
   - `kpi` (sucessor de `'String'`) — card 1-up label+valor.
   - `table` (sucessor de `'Grid'`) — tabela simples sem features de grid.
   - `pie`, `bar`, `column`, `line`, `area` — gráficos canônicos. Em React: `recharts` ou `visx` (recharts é mais alto-nível, suficiente; visx tem mais flexibilidade mas requer mais código).
   - `gauge` — útil para KPIs com meta; sem equivalente direto em recharts. Custom com SVG arc é viável.
   - `switcher` (sucessor de `'Buttons'`) — repensar: pode ser "tab interno do quadrante" em vez de acoplamento cross-quadrante (que é confuso e específico do legado).
3. **Diferença vs Google Charts a documentar para admins**: parar de cadastrar `'PieChart'`, `'GeoChart'`, `'TreeMap'`, `'Sankey'`, `'OrgChart'`, `'CandlestickChart'`, `'Histogram'`, `'BubbleChart'` no catálogo se não for migrar. Studio decide se mantém Google Charts no MVP (passa-direto) ou força migração.
4. **Layout**: manter 2×2 no MVP (mesmo footprint visual e algoritmo de fusão simplificado). Em fase 2, considerar `react-grid-layout` para grid n×m responsiva.
5. **Auto-refresh**: polling como o legado no MVP; SSE em fase 2 (depende de F023 estável e de eventos por objeto modelados no backend).
6. **Link compartilhável**: re-engenhar autenticação (não copiar o JWT de 30 dias na URL). MVP pode adiar feature; reativar quando houver modelo de token escopado.

## Features novas identificadas (para o curator)

Durante a escavação, surgiram candidatas a feature dedicada:

1. **F-tbobjetos-dashboard (catálogo de objetos)** — `TBobjetos_dashboard` é entidade independente, administrada em CRUD separado (provavelmente no `appbuilder`). Inventário cross-tenant dos valores reais de `DFtipo` em produção define quais widgets o Studio precisa entregar. Pré-requisito de F012. (P1)
2. **F-dashboard-shared-link (modo exhibition + token)** — caminho `#/dashboard?` com rotação multi-dashboard + JWT de 30 dias na URL é vetor de segurança e merece feature/design próprio. (P1, mas adiável para fase 2)
3. **F-dashboard-grid-layout (n×m responsiva)** — atualmente 2×2 fixa. Studio pode promover a feature de "layout livre" com `react-grid-layout` ou similar. (P2)
4. **F-proc-dashboard-response (envelope `response` vs `relatorio`)** — diferença sutil mas real entre dashboard procs e grid procs. Merece sub-contrato cross-cutting. (P1, herdeiro de F011 e F012)
5. **F-dashboard-sse (substituir polling por eventos)** — após F023 estabilizar, dashboard pode receber `event:dashboard.refresh.<idObjeto>` em vez de polling. (P2)
6. **F-dashboard-export (snapshot PDF/imagem)** — não existe no legado; oportunidade nova se priorizado. (P3/backlog)
7. **F-buttons-revisit (Buttons como switcher cross-quadrante)** — o modo `Buttons` acopla dois quadrantes (botões num, conteúdo trocando noutro). Acoplamento confuso; Studio pode redesenhar como "tab interno" do próprio quadrante. (P2, decisão de UX)

## Sources

- [[calendar/notes/2026-05-15.md]]
