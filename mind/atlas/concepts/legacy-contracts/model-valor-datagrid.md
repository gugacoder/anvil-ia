---
title: "model-valor.datagrid / datagrid2 — schema do nó grid no DFvalor"
aliases: [model-valor-datagrid, datagrid-model, datagrid2-model, grid-renderer-contract]
tags: [contract, legacy, react-tools, datagrid, datagrid2, model-valor, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: nós `datagrid` e `datagrid2` dentro de `DFvalor` (model de página)

Sub-contrato do [[engine-schema-driven]] para os discriminantes `datagrid` (legado v1) e `datagrid2` (variante moderna). Cataloga a **forma** do nó JSON correspondente em `acesso.TBmodel_pagina.DFvalor` (vide [[obter-model-pagina]] e [[tbmodel-pagina]]). Quando o engine encontra `datagrid` **ou** `filtro` em [[engine-schema-driven]] §"Tabela de dispatch", instancia `<GenericGridPage/>` que decide por presença: `datagrid` → `<DataGrid/>` (v1, fora do escopo deste contrato), `datagrid2` → `<DataGrid2/>` (objeto deste contrato). Ambos podem coexistir no mesmo model (raro). Cobre F011 do manifest.

O nó é um **bundle** que descreve em um só lugar: (a) o **endpoint** de leitura (`api`); (b) o **schema das colunas** (`headers[]`); (c) **toolbar opcional** (paginação, exportação, agrupamento, auto-update, legendas, ações em massa); (d) flags comportamentais (`isSelectable`, `isEditable`, `showTotalCount`, `enableExport`). Filtro acoplado vive em **chave irmã `filtro`** ([[engine-schema-driven]] §F016) — não dentro de `datagrid2`. O `<GenericGridPage/>` injeta o estado do filtro como prop `filter` no `<DataGrid2/>`.

> Observação crítica: o **estado atual do código `DataGrid2`** tem várias `gridActions` (`detailModal`, `execProc`, `delete`, `actionModal`, `batchEdit`, `externalAction`, `redirectTo`) com **handlers comentados/stubados** em `DataGrid2/Header/Actions.js:11-57`. O contrato de **schema** ainda aceita esses campos (idênticos ao `DataGrid` v1 — os models em produção usam `datagrid:` mais frequentemente que `datagrid2:`), mas o **comportamento real** dos botões só está implementado no `<DataGrid/>` v1. `DataGrid2` é redesign em curso. Documentado abaixo onde aplicável.

## Citações de fonte

- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/index.js:5-13` — entrypoint; envolve em `DataGridProvider` e renderiza `<Main/>`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Main.js:12-95` — props aceitas pelo componente (forma plana derivada do nó `datagrid2`), `useEffect` chama `init({ api, title, headers, isEditable })` e `setFilter(filter+additionalFilterParams)`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Context.js:7-52` — provider que injeta `useDataGrid` no contexto consumido por todos os sub-componentes.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useDataGrid.js:5-12` — `headerInitialState` (defaults `currentLimit=10`, `currentPage=1`).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useDataGrid.js:34-80` — `fetchRows`: POST `{api}` com body `{...filter, pagina, limite, ordenacao}`; lê resposta `dados.relatorio.{linhas.linha,quantidadeParcial,quantidadeTotal}`.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useDataGrid.js:101-115` — `selectRow` usa `getUniqueProp` para encontrar PK (`id` → `cod` → `codigo`).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useDataGrid.js:127-149` — `handleSorting` (toggle asc/desc) e `handleColumnGroupping` (add/del em `grouppingState`).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useDataGrid.js:151-160` — `useEffect` que re-dispara `fetchRows` em mudança de `currentLimit`/`currentPage`/`partialCount`/`sortingState`/`filter`.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useUtils.js:101-107` — `getUniqueProp` (algoritmo de detecção de PK).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useUtils.js:26-41` — `checkBooleanValue` (coerção `'true'/'1'/1/true → true`); usado em `hideColumn`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/index.js:16-69` — toolbar; condicionais de render por flag (`isSelectable`, `showTotalCount`, `updateIntervals.length>0`, `enableExport`, `gridActions.length>0`, `captions.length>0`, `grouppable` em algum header).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/Actions.js:11-57` — catálogo de `action` em `gridActions[]` (7 casos no `switch`, **6 com handler comentado** — stub).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/AutoUpdater.js:10-20` — `setInterval(fetchRows, 1000*option)` por `updateIntervals[]` em segundos.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/Captions.js:5-21` — `captions[]` (legendas estáticas, label+value+color+bgColor).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/ColumnOptions.js:8-13` — toggle de visibilidade por coluna; muta `headers[].hideColumn` no state.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/Exporter.js:11-96` — duas saídas: **Impressão** (abre `window.open` com tabela HTML inline) e **CSV** (POST `/csv${api}` via `exportResult` do `useFetch` → blob download).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/Groupping.js:28-40` — drop zone para arrastar header e agrupar; só aceita drop se header tiver `grouppable: true`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/Limiter.js:7-31` — dropdown `limits[]` (itens-por-página).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/Pagination.js:8-50` — pagination derivada de `partialCount/currentLimit` (janela de 3 páginas, first/prev/next/last).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/PartialCounter.js:7-21` — badge com `partialCount` ou spinner enquanto `isLoading`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/SelectedCounter.js:4-15` — badge `✓ {selected.length}`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/TotalCounter.js:4-15` — badge `Total {totalCount}` (escondido se `showTotalCount=false`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/THead/TH.js:14-110` — `<th>`: clique no `<span>` aciona `handleSorting` se `sortable`, drag-handle reordena coluna, divisor lateral redimensiona (`mousemove` ajusta width), `column-fixed` desabilita drag.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/THead/TRow.js:14-79` — checkbox "marcar todos", drag-and-drop entre colunas dentro do mesmo `tableId`, filtro `!checkBooleanValue(h.hideColumn)`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/TBody/TRow.js:7-42` — `onDoubleClick(row)`, `onClick → selectRow(row)` se `isSelectable`, lê `row['@color']` e `row['@bgColor']` como cor por linha.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/TBody/TData.js:6-37` — renderer de célula: branch por `header.type`: `undefined` → `<span>{valor}</span>`, `'html'` → `<div dangerouslySetInnerHTML/>`, `'badge'` → `<span class="badge badge-{row.bgColor}">{valor}</span>`. Lê `header.fixed/bgColor/color` para styling do `<td>`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/TBody/index.js:16-78` — agrupamento até 3 níveis, gerado a partir de `grouppingState[]`; `data-group` em `<tr>` para colapso por classe CSS.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/TFoot.js:5-15` — footer com label `"Exibindo {currentLimit} itens por página."` (sem informações de range).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericGridPage.js:15-162` — wrapper externo: faz spread de `{...datagrid2}` no `<DataGrid2/>` e injeta `filter`, `requiredFilters`, `selected`, `onUpdate`, `onDoubleClick` (com `externalAction` override), `handleOpenNewTab`, `additionalParams`, `filterModel`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:42-54` — destruturação do model (`datagrid, datagrid2, filtro, ...`); `RenderGridPage(...)` é chamado quando `datagrid || filtro` (e por extensão `datagrid2`).
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/1-alimentacao/insert_template_pagina.sql:10-13` — templates `TemplateCadastro` e `TemplateConsulta` contendo `datagrid` (não `datagrid2`).
- `sources/engenharia--fabrica--sql--portal-director/processa.agendamento/alimentacao/model.consultar_agendamento.sql:40-200` — exemplo real e completo de `datagrid` em produção (`api`, `additionalFilterParams`, `gridActions`, `detailModalConfigs`, `headers` com `sortable`/`hideColumn`/`summarizeColumn`, paginação implícita).
- `sources/engenharia--fabrica--sql--portal-director/processa.gerenciamento.integracoes/alimentacao/model.fusion_pedidos.sql:44-117` — exemplo de `datagrid` com `gridActions[]` ricas (`execProc` + `actionRule` por linha).
- `sources/engenharia--fabrica--javascript--react-tools/src/index.js` — `DataGrid2` exportado como public API do pacote `react-tools`.

## Estrutura do nó `datagrid` / `datagrid2`

Forma canônica:

```
"datagrid" | "datagrid2": {
  "api": string,
  "title": string,
  "headers": Header[],
  "limits": number[],
  "updateIntervals": number[],
  "gridActions": GridAction[],
  "captions": Caption[],
  "isSelectable": boolean,
  "isEditable": boolean,
  "isGridButton": boolean,
  "showTotalCount": boolean,
  "enableExport": boolean,
  "additionalFilterParams": object,
  "onDoubleClick": function,
  // específicos do v1 (DataGrid), aparecem nos models reais mas DataGrid2 ignora hoje:
  "detailModalConfigs": { ... },
  "actionModalConfigs": [ ... ]
}
```

### Campos do nó raiz

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `api` | string | sim | Path do endpoint POST que retorna as linhas | `/proc/<nome>` ou path arbitrário | `useDataGrid.fetchRows` faz `post(api, body)` a cada mudança de paginação/ordenação/filtro | model |
| `title` | string | não (default `'Dados'`) | Texto exibido no header da grid | livre | render do `<span class="h5">` em `Header/index.js:37` + título de impressão/CSV | model |
| `headers` | `Header[]` (vide §"Coluna") | sim | Schema de colunas | array não-vazio | render do `<THead>` e `<TBody>`; também filtra `hideColumn` | model |
| `limits` | `number[]` | sim (PropType) | Opções de itens-por-página | ex. `[5, 10, 20, 50, 100]` | renderiza `<Limiter>`; primeiro valor não é default (default = 10 do `headerInitialState`) | model |
| `updateIntervals` | `number[]` (segundos) | não (default `[]`) | Habilita auto-update se não-vazio | ex. `[5, 10, 30, 60]` | renderiza `<AutoUpdater>`; `setInterval(fetchRows, 1000*v)` | model |
| `gridActions` | `GridAction[]` | não (default `[]`) | Ações em massa sobre linhas selecionadas | array; só renderiza se `isSelectable && length>0` | renderiza `<Actions>` dropdown; **handlers stubados no DataGrid2** | model |
| `captions` | `Caption[]` | não (default `[]`) | Legendas estáticas (badges) | array | renderiza `<Captions>` dropdown | model |
| `isSelectable` | boolean | não (default `false`) | Habilita coluna de checkbox e seleção por clique | true/false | adiciona `<th><input type=checkbox/></th>`; clique em `<tr>` toggla `selected[]`; habilita `<SelectedCounter>` e `<Actions>` | model |
| `isEditable` | boolean | não (default `false`) | Indica edição inline | true/false | repassado ao `<TData isEditable>` — **não implementado no DataGrid2** (campo lido pela context mas só renderiza `<span>`/html/badge); no v1 é onde edit inline ligaria | model |
| `isGridButton` | boolean | não (default `false`) | Flag de "submeter filtro fecha painel de filtro" | true/false | lido por `GenericGridPage.handleSubmitFilter:42-43`: se true, `setShowFilter(false)` após submit | model |
| `showTotalCount` | boolean | não (default `false`) | Exibe badge `Total {N}` separado do `partialCount` | true/false | renderiza `<TotalCounter>` | model |
| `enableExport` | boolean | não (default `false`) | Habilita dropdown de impressão/CSV | true/false | renderiza `<Exporter>` (Impressão + CSV via `/csv{api}`) | model |
| `additionalFilterParams` | object \| `'dParam<N>'` | não (default `{}`) | Params anexados ao body de toda request | objeto JSON ou placeholder de interpolação | `Main.js:38`: `setFilter({...filter, ...additionalFilterParams})` — vai no body do POST | model |
| `onDoubleClick` | function | não | Handler para duplo clique em linha | função JS string (resolvida via `funcoes`) ou ref | sobrescrita pelo `externalAction` no wrapper; senão chamada com `row` | model + injeção |
| `detailModalConfigs` | object | não | Config de modal de detalhe para `action='detailModal'` (v1) | `{detailModalHeaders, api, modalTitle}` | **ignorado pelo DataGrid2** (handler stub em `Actions.js:13`); ativo no `<DataGrid/>` v1 | model |
| `actionModalConfigs` | object[] | não | Modais auxiliares para `action='actionModal'`/`'batchEdit'` (v1) | array | **ignorado pelo DataGrid2** | model |

### Estado do componente (não vem do model, mas é parte do contrato runtime)

| Item | Tipo | Default | Origem |
|---|---|---|---|
| `headerState.currentLimit` | number | 10 | `headerInitialState` em `useDataGrid.js:8` |
| `headerState.currentPage` | number | 1 | idem |
| `headerState.partialCount` | number | 0 (atualizado pelo servidor) | resposta `dados.relatorio.quantidadeParcial` |
| `headerState.totalCount` | number | 0 (atualizado pelo servidor) | resposta `dados.relatorio.quantidadeTotal` |
| `headerState.currentUpdaterInterval` | number | 0 | escolha do usuário no `<AutoUpdater>` |
| `headerState.selectedCount` | number | 0 (mas na prática lê de `selected.length`) | derivado |
| `sortingState.column` | string\|null | null | clique em `<TH sortable>` |
| `sortingState.direction` | `'asc'\|'desc'\|''` | null | alterna a cada clique |
| `grouppingState` | string[] | `[]` | drop de header com `grouppable=true` em `<Groupping>` |
| `selected` | any[] | `[]` | array de PKs das linhas selecionadas |
| `filter` | object | `{}` | injetado via prop `filter` pelo `<GenericGridPage>` (estado do `<Filtros>`) |

> Não é persistido. Cada mount/aba reinicia estado de paginação/ordenação/grouping/seleção.

## Sub-estruturas

### `Header` (coluna)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `prop` | string | sim | Nome da chave em cada `row` que provê o valor | string | usado em `row[prop]` no `<TData>`; também é o id da coluna p/ sort/group/drag | model |
| `label` | string | sim | Cabeçalho exibido | string | render do `<TH>` e `<TData>` (group rows usam label) | model |
| `type` | string | não | Renderer de célula | `'html' \| 'badge' \| undefined` | `TData.interpret()`: undefined → `<span>`, `'html'` → `dangerouslySetInnerHTML`, `'badge'` → badge colorido | model |
| `sortable` | boolean | não (default false) | Habilita ordenação clicando no header | true/false | `TH.js:99-101` mostra ícone e dispara `handleSorting(prop)` | model |
| `hideColumn` | boolean \| string-bool \| placeholder | não (default false) | Esconde coluna do render (mas mantém no schema) | true/false/`'true'`/`'1'`/`'dParam<N>'` | filtro em `TRow.js:69` e `TBody/TRow.js:31` via `checkBooleanValue`; pode ser interpolado dinamicamente | model + interpolação |
| `fixed` | boolean | não (default false) | Marca coluna como "fixa" (não-arrastável) | true/false | `THead/TH.js:89-92`: `draggable=false` + classe `column-fixed`; **sticky CSS posicionamento por código foi removido/comentado** (`TH.js:35-47,82-84` e `TData.js:20-27`) | model |
| `color` | string (CSS color) | não | Cor do texto da célula e do header | livre | inline-style em `<td>` e `<th>` | model |
| `bgColor` | string (CSS color) | não | Cor de fundo do header e da célula | livre | inline-style + classe `badge-{bgColor}` quando `type='badge'` | model |
| `grouppable` | boolean | não (default false) | Habilita agrupar por essa coluna | true/false | `Groupping.handleDrop:35-37` rejeita drop se false | model |
| `sortKey` | string | não | **F044 (Studio)** — nome literal da coluna SQL usado em `ORDER BY` quando `prop` (alias da resposta) diverge da coluna fonte. Sem `sortKey`, o backend cai em heurística (capitalize / `DF<prop>`). Não existe no legado. | nome de coluna SQL (regex `[A-Za-z_][A-Za-z0-9_]{0,63}`) | propagado pelo `<DataGridRenderer>` no body `__sortColumnMap` | model (Studio-only) |
| `summarizeColumn` | boolean | não | (v1) Somatório no rodapé | true/false | **ignorado no DataGrid2** (sem rodapé de sumarização) | model |

> Convenções especiais em `row`:
> - `row['@color']` e `row['@bgColor']` (no objeto da linha, não no header) são aplicados ao `<tr>` inteiro como inline-style — permitem **colorir linhas dinamicamente** com base nos dados (`TBody/TRow.js:17-20`).
> - `row.bgColor` (sem `@`) é usado quando `header.type='badge'` para escolher a classe do badge.

### `GridAction` (ações em massa)

| Item | Tipo | Obrigatório | Semântica | Vem de |
|---|---|---|---|---|
| `title` | string | sim | Label do botão no dropdown | model |
| `action` | string | sim | Discriminador do handler | model |
| `isNotBatchAction` | boolean | não | (v1) Habilita ação mesmo com 1 selecionado; no DataGrid2 todos exigem `selected.length > 0` para não estar disabled | model |
| `isNotProcedure` | boolean | não | (v1) Marca que `execProc` é endpoint REST, não `/proc/<nome>` | model |
| `execProc` | string | quando `action='execProc'` | Endpoint a chamar | model |
| `idModal` | string | quando `action='actionModal'`/`'batchEdit'` | Aponta para `actionModalConfigs[idModal]` | model |
| `path` | string | quando `action='redirectTo'` | Rota a abrir em nova aba | model |
| `actionRule` | `{prop, condition, value[]}` | não | (v1) Regra para esconder/desabilitar a ação por valor de `row.prop` | model |

Universo de `action` (extraído do `switch` em `Actions.js:11-57`):

| `action` | Comportamento esperado (v1) | Estado no DataGrid2 |
|---|---|---|
| `detailModal` | abrir modal lendo `detailModalConfigs` | **stub** |
| `execProc` | POST em `execProc` com `{selected}` | **stub** |
| `sendRequest` | idem `execProc` (sem rótulo de proc) | **stub** |
| `delete` | abrir confirm modal `danger` (`'Confirmar Exclusão'` / `'Tem certeza que deseja realizar a exclusão?'`), POST em `execProc`(/api) com `{ids: selected.toString()}` (ou `{rows: selectedRows}` se `sendSelectRows`); refresh em 700 ms; tradução hard-coded de FK violation. Detalhes completos + 17 asserções em [[grid-action-delete]] (F045). | **stub** |
| `actionModal` | abrir modal customizado de `actionModalConfigs` | **stub** |
| `batchEdit` | modal de edição em massa | **stub** |
| `externalAction` | chamar função nomeada via `executeGenericFunctions` | **stub** |
| `redirectTo` | abrir nova aba via `handleOpenNewTab(path, {...config, selected, filter})` | **stub** |

> Implicação: hoje o `<DataGrid2/>` renderiza o dropdown e habilita por seleção, mas **nenhum botão de ação efetivamente executa**. Models em produção que usam `gridActions[]` ainda apontam para `datagrid:` (v1) — `datagrid2:` é usado quando o renderer não precisa das ações ou quando o time aceitou regressão temporária.

### `Caption` (legenda)

| Item | Tipo | Obrigatório | Semântica |
|---|---|---|---|
| `label` | string | sim | Texto descritivo da legenda |
| `value` | string | sim | Valor exibido no badge |
| `color` | string | não | Cor do texto do badge |
| `bgColor` | string | não | Cor de fundo do badge |

Render estático em dropdown — não interage com seleção, sorting ou filtro.

## Endpoint de dados (`api`)

### Request

| Item | Valor |
|---|---|
| Método | POST |
| URL | base + `api` (ex. `/proc/agent.obter_agendamentos` → `/api/proc/...` via proxy do shell) |
| Body | `{ ...filter, ...additionalFilterParams, pagina, limite, ordenacao }` |
| `pagina` | número da página corrente (1-based) |
| `limite` | itens-por-página corrente |
| `ordenacao` | string `"<column>,<asc|desc>"`; ambos vazios se nada ordenado (`",,"`). **F044 (Studio)**: o backend `apps/api/src/routes/grid.ts` normaliza este campo — aceita `<prop>` lowercase emitido pelo frontend e tenta variantes (`prop` → `CapitalizeFirst(prop)` → `DF<prop>` → `DF<CapitalizeFirst(prop)>`) caso a proc rejeite com `Invalid column name`. Override explícito via `body.__sortColumnMap = { <prop>: '<colunaSQLReal>' }`, derivado de `header.sortKey` no model. **Divergência consciente do legado**: o legado mandava `<prop>` cru e dependia que cada proc casasse — Studio resolve no servidor sem tocar nas procs. |
| Auth | header injetado pelo `useRequest` (Bearer do `authState.token`, vide [[obter-model-pagina]]) |

> `additionalFilterParams` é **merge raso** no body — mesmas chaves do filtro sobrescrevem.

### Response (formato canônico Processa)

```
{
  "sucesso": boolean,
  "dados": {
    "relatorio": {
      "linhas": { "linha": Row[] | null },
      "quantidadeParcial": number | string,
      "quantidadeTotal": number | string
    }
  }
}
```

- `sucesso=false` → `console.error(response)`, sem toast — UI fica em estado anterior.
- `linhas.linha` ausente/null → grid mostra `"Nenhum resultado encontrado."` em colspan total.
- `quantidadeParcial` = nº de registros que satisfazem o filtro corrente (drive da paginação).
- `quantidadeTotal` = nº total sem filtro (exibido em `<TotalCounter>` se `showTotalCount`).
- Ambos são coergidos com `Number(...)` — backend pode mandar string.
- Cada `Row` é objeto livre; usa `getUniqueProp` (`id`/`cod`/`codigo` nessa ordem) como PK para seleção. **Se nenhuma chave existir, seleção quebra silenciosamente** (`console.error`).

> Backend é tipicamente uma stored procedure SQL Server que retorna `<root><relatorio>...` como XML serializado para JSON pelo Pipeliner/.NET. Forma do envelope é cross-cutting do legado Processa (mesma do `obter_model_pagina`).

### Exportação CSV

| Item | Valor |
|---|---|
| Método | POST |
| URL | base + `/csv{api}` (concatenação literal — ex. `/csv/proc/agent.obter_agendamentos`) |
| Body | `{ pagina, limite, ordenacao, exportar: 'csv' }` (note: **filter é hard-coded `{}` no `Exporter.js:67`** — bug conhecido: exporta sem filtro corrente) |
| Resposta | texto CSV; convertido em `Blob` `text/plain` e baixado como `{title}.csv` |

### Impressão

`window.open` em nova aba com HTML inline reproduzindo a tabela atual (linhas e colunas visíveis). Sem chamada extra ao servidor.

## Paginação, ordenação, filtro

- **Paginação**: server-side por design (`pagina`+`limite` no body). Cliente não fatia. Janela de 3 páginas (`<Pagination>`) calculada a partir de `Math.ceil(partialCount/currentLimit)`. Botões first/prev/next/last clampeados.
- **Ordenação**: server-side; cliente só envia `"<col>,<dir>"`. Um único campo por vez (não há multi-sort). Alterna asc → desc → asc; nunca volta a "sem ordenação" pelo UI.
- **Filtro**: estado vive em `<GenericGridPage>` (vindo do `<Filtros>`); injetado como prop `filter`. Mudança dispara `useEffect` em `useDataGrid` → re-fetch. **Tudo server-side** — nenhuma filtragem é feita no cliente.
- **Trigger de re-fetch**: deps em `useDataGrid.js:151-160` — `currentLimit`, `currentPage`, `partialCount`, `sortingState.column`, `sortingState.direction`, `filter`. (Note: `partialCount` no dep faz refetch espúrio quando o servidor devolve um valor diferente; assumimos artefato do legado.)

## Seleção

- Single click em `<tr>` (com `isSelectable=true`) toggla a linha no array `selected[]`. PK descoberta por `getUniqueProp(row)`.
- Checkbox no header marca/desmarca todas as linhas **da página corrente** (não global — só `rows`).
- `<SelectedCounter>` exibe `✓ N`. Limpa-se ao submeter filtro novo (`GenericGridPage.handleSubmitFilter:41`).
- Não há modo single-select dedicado. O legado usa **double-click** + `onDoubleClick` para escolher 1 linha (padrão em modais de busca).
- **Inline edit**: prop `isEditable` chega ao `<TData>` mas nada é feito com ele no DataGrid2 atual.

## Agrupamento (`grouppingState`)

- Habilitado se **algum** `header.grouppable === true` (`Main.js:54`). Mostra a faixa drop-zone `<Groupping>`.
- Usuário arrasta um `<TH>` para a faixa → coluna entra em `grouppingState[]`. Até 3 níveis (verde/amarelo/vermelho).
- Agrupamento é **client-side**: linhas da página corrente são re-arranjadas em grupos pelo `getGroupRows` (`TBody/index.js:16-33`). Não re-fetcha.
- Colapso por classe CSS `show`/sem `show` em `<tr data-group=...>`.
- Drag dentro do `<THead>` reordena colunas; drag para a faixa de agrupamento agrupa. Mesmo `tableId` é checado para impedir cross-grid.

## Comportamento por linha

| Evento | Handler | Efeito |
|---|---|---|
| `onClick` em `<tr>` | `selectRow(row)` se `isSelectable` | toggla PK em `selected[]` |
| `onDoubleClick` em `<tr>` | prop `onDoubleClick(row)` | navega para form de edição (uso canônico no `TemplateCadastro`); `externalAction` do `<GenericPage>` pode sobrescrever |
| Inline style | `row['@color']`, `row['@bgColor']` | colore a linha inteira |
| Renderer de célula | `header.type` (undefined/`html`/`badge`) | conforme tabela `Header` acima |
| Style célula | `header.color`, `header.bgColor` | inline-style no `<td>` |
| Sticky | `header.fixed` | adiciona classe `column-fixed`; lógica de posicionamento via `offsetLeft` está **comentada** (uso atual: só estilização) |

## Toolbar (resumo visual da ordem em `Header/index.js:33-53`)

```
[título] [partial badge]            [selected] [total] [pagination] [limiter]
                                    [auto-upd] [export] [actions]   [captions] [columns]
[ groupping drop-zone (se grouppable em algum header) ]
```

Toda flag é independente — sem precedência entre `gridActions` e `captions`, por exemplo.

## Integração com `Filtro` (F016)

- `filtro` vive **fora** do nó `datagrid2`, no mesmo nível do model.
- `<GenericGridPage>` lê `filtro.model[]` (lista de campos) e renderiza `<Filtros>` toggleável (padrão fechado, exceto `filtro.openFilter=true`).
- Estado interno do filtro é commitado em `setFilter({...})` após o usuário submeter — só então `<DataGrid2/>` re-fetcha.
- `filtro.model[].required=true` campos viram `requiredFilters` repassados ao grid; o grid não bloqueia fetch (envia mesmo sem required preenchido), mas o `<Filtros>` valida no submit.
- `additionalFilterParams` no nó `datagrid2` é **diferente** de `filtro` — vai sempre em todo request, sem UI; usado para constantes do contexto (ex. `idAplicacao`).
- `filtro.id` é usado como `id` HTML para acoplar visualmente.

## `additionalParams` (do shell)

`route` inteiro do flat-list de navegação ([[menu-hierarquia]]) é repassado opaco até `<DataGrid2/>`:

- Se `additionalParams.selected` existe → `<GenericGridPage>` injeta `{ id: selected }` no `filter` inicial (deep-link).
- Se `additionalParams.filter` existe → spread no filter inicial.
- Caso contrário: `filter = {}`.

Permite abrir uma página de listagem já filtrada via URL.

## Convivência `datagrid` + `datagrid2` (mesmo model)

`GenericGridPage.js:99-143` renderiza **ambos** sequencialmente se ambos presentes. Não há lógica de "preferir v2 se ambos". Em produção, models nunca contêm os dois — é variante de design (use um ou outro).

## Relações com o ecossistema

- Consome de: [[engine-schema-driven]] (dispatch por presença de `datagrid`/`datagrid2`/`filtro`); [[obter-model-pagina]] (origem do JSON); endpoint de dados é externo (procs SQL via Pipeliner/.NET — sub-contrato `proc-grid-response.md` a criar para o envelope `dados.relatorio.linhas.linha`).
- É consumido por: F011 (renderer). Indireto: F010 (formOnModal aciona refresh do grid via `setCurrentFilter`).
- Acopla: [[model-valor-genericform|model-valor.genericform]] (cadastros = form+grid no mesmo model; submit do form chama `setCurrentFilter` no `<GenericPage>` para re-fetch do grid); F016 (`filtro` irmão); F021 (`buttons` da página, fora deste nó); F033 (mobile — grid não é responsivo, vide §"Notas").
- Sub-contratos a criar:
  - `proc-grid-response.md` — envelope `{sucesso, dados:{relatorio:{linhas:{linha[]}, quantidadeParcial, quantidadeTotal}}}` é cross-cutting; merece contrato próprio.
  - `model-valor-datagrid-v1.md` — escavar `<DataGrid/>` legado (a v1 implementa de verdade `gridActions`, `detailModalConfigs`, `actionModalConfigs`, `summarizeColumn`); contrato deste arquivo cobre só `datagrid2`. **Nota**: em produção, a chave `datagrid:` (v1) é dominante; o `datagrid2:` aparece em casos específicos.

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- **Schema `datagrid` e `datagrid2` são idênticos** (mesma forma JSON). O dispatch é só pela chave que existe. Studio pode unificar.
- **DataGrid2 hoje é incompleto vs v1**: `gridActions` todas stubadas, `isEditable` sem efeito, `detailModalConfigs`/`actionModalConfigs` ignorados, sticky-column positioning comentado, `summarizeColumn` sem rodapé. Migrar 100% requer escavar [[model-valor-datagrid-v1]] (a criar) e ressuscitar handlers — ou implementar do zero no Studio.
- **Paginação é sempre server-side** com janela fixa de 3 páginas. Não há cursor/infinite-scroll. Studio decide se mantém.
- **Ordenação é mono-coluna**, sem indicador de "limpar ordenação". Asc/desc só.
- **`@color`/`@bgColor` em `row`**: convenção do legado para colorir linha pela proc. Studio precisa preservar OU oferecer alternativa (ex. `__theme`).
- **`type='html'` usa `dangerouslySetInnerHTML`**: a proc pode retornar HTML arbitrário. Risco XSS depende de quem escreve a proc. Studio decide sanitizar/banir.
- **Reorder e resize de colunas são UI-only** — não persistem. Refresh perde tudo. Studio decide se persistir em preferences do usuário ([[engine-schema-driven]] §preferences).
- **Agrupamento é client-side só na página corrente** — não é "group by global". Se um grupo se estende em várias páginas, cada página o redesenha do zero. Studio decide se agrupa global (re-query) ou mantém comportamento.
- **CSV exportado ignora filtro corrente** (bug do `Exporter.js:67` — `const filter = {}`). Studio deve corrigir.
- **Impressão monta HTML inline e abre nova aba** — sem CSS print do projeto, sem cabeçalho, sem paginação. Studio reimagina.
- **Sem skeleton de loading no body**: durante `isLoading`, só o badge do counter vira spinner. Linhas anteriores persistem na tela. Studio decide UX.
- **`getUniqueProp` falha silenciosamente** se a linha não tem `id|cod|codigo` — seleção fica quebrada. Studio precisa de discriminador explícito ou política de erro.
- **Drag-and-drop usa HTML5 nativo** sem touch-events — quebra em mobile. F033 herda esse débito.
- **Multi-select e seleção persistente**: `selected[]` zera ao mudar página (porque `toggleSelectAll` opera sobre `rows` atuais e seleção por clique fica órfã quando a linha não está mais visível). Studio decide se persiste seleção cross-page.
- **`isGridButton: true`** é uma flag única (do model) que muda comportamento do **filtro**, não do grid: faz o painel fechar após submit. Migrar com nome melhor.
- **Pacote `react-tools` exporta `DataGrid2` na public API** (`src/index.js`) — apps externos podem estar usando direto, não só via engine. Inventário de consumers fora do AppBuilder pode ser necessário antes de descontinuar.

## Features novas identificadas (para o curator)

Durante a escavação, surgiram candidatas a feature dedicada que não aparecem no manifest sob F011:

1. **proc-grid-response (envelope `dados.relatorio.linhas.linha`)** — é cross-cutting (toda proc de listagem usa, inclusive fora de F011); merece contrato próprio e talvez feature de "Data adapter Pipeliner" (P0/P1). Não-bloqueante para F011 mas será revisitado.
2. **export-csv (`/csv{api}` + filtro hard-coded `{}`)** — comportamento isolado, com bug conhecido. Pode virar F011-sub ou feature autônoma de exportação se Studio quiser export Excel/PDF.
3. **print-table (window.open + HTML inline)** — feature isolada com UX completamente repensada (zero precedente reaproveitável). Candidata a feature autônoma F-print.
4. **column-preferences (reorder/resize/hide persistente)** — hoje é state-only no DataGrid2. Studio pode promover a feature com persistência em `userPreference` ([[engine-schema-driven]] §preferences).
5. **datagrid-v1 (`<DataGrid/>`) com gridActions reais** — sub-contrato a escavar para preservar paridade de comportamento durante o cutover (delete/execProc/detailModal/actionModal/batchEdit/externalAction/redirectTo são funcionais no v1).

## Sources

- [[calendar/notes/2026-05-15.md]]
