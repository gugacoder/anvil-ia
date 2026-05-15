---
title: "Data Grid"
aliases: [data-grid, datagrid, data-table, grid-renderer, df-grid]
tags: [ui-system, component, data, table, renderer, schema-driven, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Data Grid

Renderizador de **tabela/grid dirigido por schema**. Recebe um descritor declarativo (endpoint, headers, flags de toolbar, gridActions, captions) e materializa em UI consistente: lista densa em desktop, cards/lista empilhada em mobile. É o segundo organismo mais alto do design system, par do [[generic-form]] — onde o form expressa "1 registro × N campos", o grid expressa "N registros × M campos".

Tudo que no legado é `<DataGrid/>` ou `<DataGrid2/>` (ver contrato [[model-valor-datagrid]]) renderiza por este componente no Studio. Schema das duas chaves é idêntico; o Studio unifica.

## Quando usar

- Toda página/sub-página cujo nó `datagrid` ou `datagrid2` esteja presente no model retornado por `obter_model_pagina`.
- Em modal de seleção (lookup) — variante densa, sem toolbar custosa, com `onDoubleClick` retornando linha.
- Em telas próprias do Studio que precisem de listagem server-paginada com mesmo vocabulário.

## Quando NÃO usar

- Para listagens de < 10 itens que cabem na tela sem paginação — `simple-list` ou cards diretos.
- Para árvore hierárquica — esse é `generic-tree-view` (F013).
- Para grid de **edição inline** primária (planilha) — fora do escopo desta spec; criar `editable-grid` quando demandado.
- Para coleção de grids irmãs num único model — esse é `generic-grid-collection` (F038).
- Para reorder drag-drop de linhas — esse é `reorderable-grid` (F022). Aqui drag-drop é só de colunas.

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `title` | texto | `"Dados"` | Título exibido no header da grid e em export/print. |
| `endpoint` | path string | obrigatório | Endpoint POST que entrega as linhas (`api` do contrato). |
| `headers` | `Header[]` | obrigatório | Schema das colunas — ver §"Coluna (header)". |
| `pageSizeOptions` | `number[]` | `[10,20,50,100]` | Opções do `pageSizeSelector`. Primeiro item não é default. |
| `defaultPageSize` | número | `10` | Tamanho de página inicial. |
| `autoUpdateOptions` | `number[]` (segundos) | `[]` | Quando não-vazio, mostra controle de auto-refresh. |
| `gridActions` | `GridAction[]` | `[]` | Ações em massa sobre seleção. Só visíveis se `selectionMode != 'none'`. |
| `captions` | `Caption[]` | `[]` | Legendas estáticas (badges explicativos). |
| `selectionMode` | enum: `none`, `single`, `multi` | `none` | Modo de seleção. Substitui o booleano `isSelectable` do legado. |
| `inlineEdit` | enum: `none`, `cell`, `row` | `none` | Edição inline. **v1 do Studio entrega `none` para todos os models — `cell`/`row` ficam fora de escopo da F011 v1.** Sinalizado para sub-feature. |
| `showTotalCount` | boolean | `false` | Exibe badge "Total {N}" separado do count parcial. |
| `enableExport` | boolean | `false` | Habilita menu de exportação (CSV + impressão). |
| `additionalFilterParams` | objeto | `{}` | Params extra anexados ao body de toda request (constantes de contexto, ex. `idAplicacao`). |
| `groupable` | boolean (derivado) | `false` | Calculado: `headers.some(h => h.groupable)`. Quando true, exibe drop-zone de agrupamento (apenas desktop). |
| `density` | enum: `compact`, `comfortable`, `auto` | `auto` | Compact em modal e desktop; comfortable em mobile e em página primária quando viewport > 1024px e `auto`. |
| `filter` | objeto | `{}` | Filtro corrente (injetado pelo engine vindo de [[generic-filter]] F016). Não-UI desta spec. |
| `requiredFilters` | string[] | `[]` | Chaves de filtro que, se vazias, bloqueiam o fetch e mostram empty-state explicativo. |
| `onRowSelect` | callback | — | Disparado ao selecionar/deselecionar linha (single ou multi). |
| `onRowOpen` | callback | — | Disparado em "abrir registro" — double-click desktop, tap em mobile (linha inteira é o gesto), Enter no teclado. Substitui `onDoubleClick` do legado, deixando explícito que é "abrir". |
| `onSortChange` | callback | — | Notifica componente externo sobre mudança de sort. |
| `emptyState` | objeto opcional | `{title, description, icon, action}` | Customização do empty-state. Default: "Nenhum resultado encontrado." |

> O componente **consome** `gridActions[]` declarativamente (não expõe handlers React). Cada `GridAction` carrega `action`, `title`, `execProc/idModal/path`, `actionRule` — interpretados pelo renderer (mesma forma do contrato). Smith implementa cada `action` como handler interno mapeado pelo discriminador.

## Sub-estruturas

### Header (coluna)

| Propriedade | Default | Efeito |
|---|---|---|
| `prop` | obrigatório | Chave em `row[prop]` que provê o valor. Também id da coluna. |
| `label` | obrigatório | Texto do cabeçalho. |
| `type` | `text` | Renderer da célula: `text`, `number`, `date`, `datetime`, `badge`, `html`, `link`, `currency`, `boolean-icon`. **`html` é sanitizado obrigatoriamente** (ver §Segurança). |
| `sortable` | `false` | Habilita ordenação por clique no header. |
| `groupable` | `false` | Habilita arrastar para drop-zone de agrupamento. |
| `align` | `start` | `start`, `center`, `end` — alinhamento horizontal de header e célula. `number`/`currency`/`date` defaultam para `end`. |
| `width` | `auto` | Largura sugerida (`'120px'`, `'minmax(160px, 1fr)'`, `'auto'`). |
| `minWidth` | `120px` | Largura mínima ao redimensionar. |
| `fixed` | `false` | Marca coluna como **sticky** à esquerda (ou direita, se `align='end'`). v1 implementa só desktop sticky-left; sticky-right + mobile fica fora de escopo. |
| `hidden` | `false` | Esconde do render mantendo no schema. |
| `color` / `bgColor` | — | Tokens semânticos (ver §Cores). **Hex/CSS color crus do legado são interpretados por mapping para tokens; não passam direto.** |
| `summarize` | `none` | `sum`, `avg`, `count`, `none` — sumariza na linha de footer da coluna (v1 implementa `sum` para `number`/`currency`; outros viram sub-feature). |
| `editable` | `false` | Reserva para `inlineEdit` futuro. Ignorado em v1. |

### GridAction (ação em massa)

| Propriedade | Default | Efeito |
|---|---|---|
| `id` | obrigatório | Identificador estável (chave para handler). |
| `title` | obrigatório | Label do botão no menu. |
| `icon` | — | Ícone Phosphor. Default por `action`: `delete`→`Trash`, `execProc`→`Play`, `redirectTo`→`ArrowSquareOut`, `detailModal`→`Eye`, `actionModal`/`batchEdit`→`PencilSimple`, `externalAction`→`Lightning`. |
| `action` | obrigatório | Discriminador: `detailModal`, `execProc`, `sendRequest`, `delete`, `actionModal`, `batchEdit`, `externalAction`, `redirectTo`. |
| `requiresSelection` | `true` | Quando `true`, fica disabled enquanto `selected.length === 0`. |
| `allowSingleSelection` | `true` para todas | Quando `false`, exige `selected.length >= 2` para habilitar (`batchEdit` típico). |
| `confirmation` | `auto` | `auto` (sempre para `delete`), `never`, ou objeto `{title, body, confirmLabel, variant}`. `delete` força `variant=destructive`. |
| `visibilityRule` | — | Regra `{prop, condition, value[]}` aplicada por linha — esconde a ação se nenhuma linha selecionada satisfaz a regra (ou todas, conforme `condition`). |

### Caption (legenda)

| Propriedade | Efeito |
|---|---|
| `label` | Texto descritivo da legenda. |
| `value` | Texto exibido no badge. |
| `tone` | Token semântico: `info`, `success`, `warning`, `error`, `neutral`. Substitui `color`/`bgColor` brutos do legado por mapping. |

## Layout responsivo (regra de breakpoint)

A topologia tabular do schema é **respeitada em desktop e reinterpretada em mobile** — não é "mesma tabela com scroll horizontal".

### Mobile (< 640px) — Card list

- Cada linha vira um **card** empilhado verticalmente. Sem tabela HTML.
- **Layout do card**:
  - **Linha 1**: campo "principal" em destaque (primeiro header com `type='text'` ou marcado `primary: true`), font weight 600, tamanho `text-base`.
  - **Linha 2–N**: pares `label : value` dos demais headers visíveis em `text-sm`, label `text-muted-foreground`, value `text-foreground`.
  - **Badges**: aparecem inline no fim da linha 1 ou em linha dedicada se houver > 1.
  - **Color row**: `row['@color']`/`row['@bgColor']` (tokens via mapping) aplicam-se ao card inteiro como `border-l-4` colorida + bg sutil.
- **Tap**: tap em qualquer ponto do card dispara `onRowOpen` (substitui o double-click).
- **Long-press** (`>= 500ms`): entra em **modo seleção** se `selectionMode !== 'none'`. A partir daí, taps subsequentes selecionam/deselecionam (cards mostram checkbox no canto direito). Ícone de check sobreposto. Botão "Cancelar seleção" no toolbar mobile.
- **Swipe esquerda** num card: revela **ações por linha** (até 2 — ações primárias derivadas de `gridActions` com `requiresSelection=false` ou ações específicas por linha em futura `rowActions[]`). Em v1, swipe é **opt-in** por config — pode entrar como sub-feature se ações por linha emergirem.
- **Menu kebab** (ícone `DotsThreeVertical`) no canto superior direito do card: dropdown com todas as ações disponíveis para a linha (filtradas por `visibilityRule`). Substitui qualquer hover de desktop.
- Headers com `hidden: true` continuam ocultos. Headers podem ter `mobileHidden: true` adicional para esconder só em mobile (ex.: timestamps técnicos).

### Tablet (640–1024px) — Table simplificada

- Tabela HTML, mas com **scroll horizontal** quando necessário. Não force reflow.
- Header sticky no topo (`position: sticky; top: 0`).
- Colunas `fixed: true` ficam sticky à esquerda; demais scrollam.
- Densidade `comfortable` (linhas `h-12`).
- Toolbar fica em uma linha; ações secundárias colapsam em menu kebab quando > 3.

### Desktop (> 1024px) — Table densa

- Tabela HTML completa com header sticky.
- Densidade `compact` (linhas `h-10`) por default em página primária; `h-9` em modal de lookup.
- Colunas redimensionáveis por arrastar divisor lateral; reorder por drag no header.
- Hover em linha exibe **row-actions inline** (botões discretos ao final da linha) — derivadas de `gridActions` com `requiresSelection=false` que se aplicam a 1 linha. Reduz cliques no kebab.
- Drop-zone de agrupamento aparece acima da tabela quando `groupable` é true.

### Espaçamento e densidade

- Cards mobile: `gap-y-2` entre cards, `p-4` interno, `rounded-lg`, `border border-border`.
- Table desktop: cell padding `px-3 py-2` em compact, `px-3 py-3` em comfortable; row divisor `border-b border-border`.
- Toolbar: `gap-2` entre controles, `px-4 py-3` no contêiner.
- Footer: `border-t border-border` + `px-4 py-2`.

## Toolbar

Barra superior do grid. Renderiza condicionalmente conforme flags.

### Composição (esquerda → direita)

```
[título + partial-count badge] [search?]            [selected counter] [export?] [actions menu?] [auto-update?]
                                                    [columns?] [captions?] [page-size] [pagination]
[ groupping drop-zone (se groupable) ]
[ filter chips (se filter ativo)     ]
```

### Comportamento por viewport

- **Mobile**: toolbar **colapsada** num único botão `Ajustar` (ícone `Sliders`) que abre [[modal-sheet]] tipo bottom-sheet com: search, page-size, sort, columns, export, captions empilhados. Apenas título + partial-count + botão `Ajustar` + actions menu (se houver seleção) ficam visíveis na barra fixa. Footer separado mostra pagination compacta.
- **Tablet**: toolbar inline, ações secundárias colapsam em kebab quando > 3.
- **Desktop**: toolbar inline completa.

### Search

- Input `search-input` inline em desktop/tablet; pleno em mobile dentro do sheet `Ajustar`.
- **Debounce**: 300ms.
- **Escopo**: integra com [[generic-filter]] F016 — search é um campo especial do filtro (chave conhecida `__search__`). Spec do filtro detalhada na F016; aqui só ponto de integração.
- **Atalho teclado**: `/` foca o search (desktop).

### Filter chips

- Quando `filter` tem chaves preenchidas, cada chave vira um **chip removível** abaixo da toolbar: `[label: value ×]`.
- Click no `×` remove a chave do filtro corrente (dispara reload).
- "Limpar filtros" aparece como link quando ≥ 2 chips.
- Em mobile, chips ficam num scroll horizontal `overflow-x-auto`.

### Bulk actions

- Quando `selected.length > 0`, toolbar muda para **modo bulk**: fundo `bg-accent/50`, mostra `✓ N selecionados`, botão `Limpar`, e botões de `gridActions` aplicáveis (filtrados por `visibilityRule` × seleção).
- Em mobile, modo bulk vira **barra inferior fixa** (acima do `shortcut-bar` do app-shell), com até 3 ações principais + kebab para o resto.

### Export

- Dropdown `Exportar` com itens: `CSV`, `Imprimir`.
- **CSV**: chama `/csv{endpoint}` enviando `{...filter, ...additionalFilterParams, pagina:1, limite:<count máximo permitido>, ordenacao}` — **corrige o bug do legado** (que enviava `filter={}`). Download como `{title}.csv`.
- **Imprimir**: gera HTML em nova aba **com estilos do design system aplicados** (CSS print dedicado, cabeçalho com título + filtros aplicados + timestamp). Substitui HTML cru do legado.
- Em mobile, "Imprimir" cai para "Compartilhar" (Web Share API) quando disponível; CSV ainda baixa.

### Auto-update

- Dropdown com `autoUpdateOptions` (segundos): `Desligado`, `5s`, `10s`, `30s`, `1min`...
- Visual de "atualizando" no badge de partial-count: spinner inline (Phosphor `CircleNotch` animado) quando refetch automático em curso.
- Pausa automática quando aba não está visível (`document.visibilityState !== 'visible'`).

### Captions

- Dropdown com lista de legendas — cada item é um badge + descrição. Estático. Substitui menu do legado.

### Column options

- Dropdown com lista de colunas e checkbox de visibilidade.
- Estado **persistido em preferences do usuário** (sinal ao curator: `column-preferences` F-derivada — não-bloqueante; v1 pode usar localStorage por chave `studio:grid:<pageKey>:columns`).
- Em mobile, vira sub-tela do sheet `Ajustar`.

## Header da tabela (THead)

### Visual

- Background: `bg-muted/30` (sutil contraste).
- Texto: `text-xs font-semibold text-muted-foreground uppercase tracking-wide`.
- Border: `border-b border-border`.
- Altura: `h-10` desktop, `h-12` tablet.

### Sort

- Coluna `sortable: true` mostra ícone `CaretUpDown` (Phosphor) discreto à direita do label.
- Quando ativo: `CaretUp` (asc) ou `CaretDown` (desc) preenchido + texto em `text-foreground`.
- **Mono-coluna**: clicar em outra coluna substitui (mantém comportamento do legado).
- **Toggle 3-estados**: asc → desc → **sem ordenação** (novo no Studio — corrige limitação do legado que só alternava asc/desc). Comunica via shift-click para preservar a coluna anterior? **Não** — Studio mantém mono-coluna; multi-sort fica para sub-feature.
- Hover no header sortável: cursor pointer + leve highlight do label.

### Reorder de colunas

- Desktop: arrastar header reordena coluna. Indicador de drop entre headers (linha vertical accent).
- Estado **persistido** junto com `column options` em preferences (mesma chave).
- Headers `fixed: true` não são arrastáveis.

### Resize de colunas

- Desktop: divisor lateral (`cursor-col-resize`) entre headers permite redimensionar.
- Snap a `minWidth`.
- Estado persistido.

### Checkbox "selecionar todos"

- Aparece como primeira "coluna" quando `selectionMode === 'multi'`.
- Tri-estado: vazio → todos da página → todos da página + parcial (se houver seleção cross-page).
- Click marca/desmarca **apenas a página corrente** (mantém comportamento legado; documentado).
- Sinal ao curator: persistência de seleção cross-page é P2 (`grid-selection-persistence`) — não-bloqueante.

## Corpo da tabela (TBody)

### Linhas

- Hover: `bg-muted/40` (desktop).
- Selecionada: `bg-primary/10` + `border-l-2 border-primary` (sticky à esquerda — fica visível mesmo em scroll horizontal).
- Cor por linha (`row['@color']`, `row['@bgColor']`): aplicada via **mapping para tokens semânticos**. Hex/CSS cru não-token cai num fallback `border-l-4` com `bg-muted/20` + warning no console (divergência reportada via debug strip do engine). Mapping aceita strings convencionais: `success|warning|error|info|critical|neutral` ou hex conhecidos.
- Click: seleciona/deseleciona se `selectionMode !== 'none'`. Sem modo seleção, click é no-op (linha não tem feedback fora hover).
- Double-click (desktop) / tap (mobile): `onRowOpen`.
- Cursor: `pointer` quando `onRowOpen` definido ou `selectionMode !== 'none'`; `default` caso contrário.

### Células (TData) — renderers por `type`

| `type` | Render |
|---|---|
| `text` (default) | `<span>{valor}</span>`; trunca com `truncate` + tooltip nativo quando excede width. |
| `number` | `<span class="tabular-nums">{format}</span>`; alinhamento default `end`; formatação `Intl.NumberFormat` por locale. |
| `currency` | Como `number` + símbolo de moeda (padrão `BRL`). |
| `date` / `datetime` | Formatação `dd/MM/yyyy` ou `dd/MM/yyyy HH:mm` (locale `pt-BR`). |
| `badge` | Badge colorido — `tone` derivado de `row.bgColor` mapeado para token semântico. Hex direto fallback como `tone=neutral` + warning. |
| `boolean-icon` | `Check` (success) / `X` (muted) — substitui texto `true`/`false`. |
| `link` | `<a>` com `text-primary underline-offset-2 hover:underline`; abre em nova aba se cross-origin. |
| `html` | **Sanitizado obrigatório**: HTML passa por sanitizer (allowlist de tags: `b, strong, i, em, br, span, a` + atributos `href, title, class`). Sem sanitização → não renderiza, mostra placeholder `[conteúdo bloqueado]` + log. Substitui `dangerouslySetInnerHTML` cru do legado. |

### Estados visuais especiais por linha

- **Loading inline** (refetch em curso após auto-update): linhas atuais permanecem; um overlay sutil (`opacity-70` + cursor `wait`) durante < 1s; spinner no badge de partial-count.
- **Pinned row** (futuro — fora de escopo v1): sticky no topo. Sinalizar quando demandado.

## Agrupamento

- **Drop-zone** acima da toolbar (visível só se `groupable`).
- Usuário arrasta header marcado `groupable: true` para a zona → cria nível de agrupamento. Até **3 níveis** (limite do legado).
- Cada nível tem cor distinta: nível 1 `border-l-x-info`, nível 2 `border-l-x-success`, nível 3 `border-l-x-warning`.
- Linha de grupo: `bg-muted/40 font-medium`, com `CaretDown` (expandido) / `CaretRight` (colapsado), label `"{groupValue} ({count})"`.
- Click no header de grupo expande/colapsa (motion `slow`, 300ms, com `transition-[grid-template-rows]`).
- **Agrupamento é client-side só na página corrente** (mantém comportamento legado). Documentado como limitação no debug strip.
- Em mobile, agrupamento é **desabilitado** (drop-zone não aparece). Sinal ao curator: UX mobile de agrupamento é sub-feature futura — provavelmente via sheet `Ajustar > Agrupar por` (selector de coluna + chip de remoção).

## Drag-drop de colunas e agrupamento (decisão UX mobile)

- **Drag de coluna (reorder)**: desktop só. Mobile usa sub-tela do sheet `Ajustar > Colunas` com handle `DotsSixVertical` em cada item da lista (drag vertical com `pointerdown` + threshold pequeno, sem HTML5 nativo).
- **Drag de header para agrupar**: desktop só. Mobile via sub-tela `Ajustar > Agrupar por` (mais clara que drag em viewport pequena).
- **F033 fica vivo**: o débito do legado (HTML5 drag-drop quebra em mobile) **não regride para o Studio** porque desktop só usa drag-drop dentro de áreas mouse-only, e mobile ganha UX dedicada via sheet. Drag de linha (reorderable-grid F022) é spec própria.

## Paginação

### Desktop

- Footer com 2 zonas:
  - **Esquerda**: `Exibindo {start}–{end} de {partialCount}` (substitui o "Exibindo {limit} itens por página" cru do legado). Quando `showTotalCount`, mostra também `(Total: {totalCount})`.
  - **Direita**: pager numérico — botões `‹‹` (first), `‹` (prev), `[1]...[k-1][k][k+1]...[N]` (janela de 5 com ellipses), `›` (next), `››` (last). + `page-size selector`.
- Mantém server-side: cada clique dispara fetch.

### Mobile

- Footer compacto: `‹ {currentPage}/{totalPages} ›` + page-size em sheet `Ajustar`.
- **Decisão UX**: não usar **infinite scroll** em v1 — server-paginação explícita é mais previsível para os tamanhos de página do Processa (datasets de centenas a milhares) e preserva âncora de URL. Sinal ao curator: `mobile-infinite-scroll` pode ser sub-feature opt-in (`pagination: 'infinite' | 'pager'`) se demanda surgir.

### Loading entre páginas

- Skeleton de linhas (≥ `currentPageSize` placeholders com `bg-muted/30 animate-pulse`) substitui body durante fetch (≥ 200ms; mostra só se levar mais de 200ms).
- Toolbar permanece interativa (não bloqueia troca de filtros em sequência).

## Estados

- **idle** — dados carregados, sem operação. Linhas + footer normais.
- **loading-initial** — primeiro fetch (sem dados prévios). Body mostra **skeleton de tabela**: ≥ 5 placeholders `bg-muted/30 animate-pulse` ocupando largura completa das colunas; toolbar visível porém limitada (page-size disabled).
- **loading-refetch** — fetch subsequente. Body atual permanece (não pisca); overlay sutil + spinner inline no badge de count.
- **loading-auto-update** — refetch via auto-update. Spinner inline; sem overlay (auto-update é silencioso).
- **empty** — fetch retornou 0 linhas mas filtro aplicado. Empty-state: ilustração discreta (Phosphor `MagnifyingGlassMinus`) + título `"Nenhum resultado encontrado"` + descrição `"Tente ajustar os filtros."` + botão `Limpar filtros` (se houver `filter` ativo).
- **empty-initial** — nunca houve dados (sem filtro aplicado, base vazia). Empty-state: Phosphor `Files` + título `"Sem registros cadastrados"` + ação primária (`emptyState.action` da API, ex.: botão `+ Novo`).
- **error** — fetch falhou. Body mostra `error-state`: Phosphor `WarningCircle` + título `"Não foi possível carregar os dados"` + descrição humanizada vinda da resposta ou fallback `"Tente novamente em instantes."` + botão `Tentar novamente` (refetch). Substitui silêncio do legado (`console.error` sem feedback).
- **error-partial** — auto-update falhou (mas página atual está OK). Toast `error` discreto: `"Atualização automática falhou. Tentando de novo em {N}s."` Não bloqueia UI.
- **required-filter-missing** — `requiredFilters` não preenchido. Body mostra empty-state especial: Phosphor `FunnelSimple` + título `"Preencha o filtro para começar"` + descrição listando filtros pendentes. Substitui fetch silencioso com filtro vazio do legado.
- **bulk-action-running** — `gridActions` em execução sobre seleção. Botão da ação em estado `loading` ([[button]]). Linhas afetadas em `opacity-60 cursor-wait`. Toast de progresso opcional.
- **selecting** (mobile) — modo seleção por long-press ativo. Toolbar em estilo bulk, checkboxes visíveis em cada card.

## Motion

- **entrada da grid**: fade-in 200ms (`normal`), `ease-out`. Sem slide.
- **troca de página**: body fade-out 100ms + skeleton aparece + fade-in 150ms quando dados chegam. Total ≈ 250ms (`normal`).
- **mudança de filtro**: idêntico a troca de página.
- **expand/collapse de grupo**: 300ms (`slow`), `ease-in-out`, com `grid-template-rows`.
- **drag de coluna**: ghost translúcido segue cursor; drop indicator pulsa 150ms (`fast`).
- **swipe em card mobile**: `transform: translateX` em 1:1 com gesto; snap aos dois estados (fechado/aberto-com-ações) com 200ms `ease-out`.
- **long-press feedback** (mobile): leve shrink (`scale-[0.98]`) no card durante o press com vibração tátil curta (10ms) se disponível.
- **bulk-mode toggle**: toolbar muda fundo em 200ms (`normal`), `ease-out`.
- **row selection**: borda esquerda colorida cresce de 0 a `border-l-2` em 100ms (`fast`).
- **reduced-motion**: todas as transições caem para mudança instantânea exceto fade-in inicial (50ms).

## Responsivo (resumo)

- **mobile (< 640px)**: card list; toolbar colapsada em sheet `Ajustar`; long-press para seleção; swipe para ações primárias (opt-in); pagination compacta; agrupamento desabilitado; drag-drop substituído por listas reordenáveis.
- **tablet (640–1024px)**: tabela com scroll horizontal; toolbar inline com colapso em kebab; densidade comfortable; sticky header + sticky columns.
- **desktop (> 1024px)**: tabela densa; toolbar inline completa; hover row-actions; drag-drop nativo de colunas + agrupamento.
- **thumb zone**: actions menu fixo na parte inferior em modo bulk mobile; pagination compacta acessível com polegar; tap target mínimo 44px nos cards.
- **gestos mobile**: tap (abrir), long-press (selecionar), swipe horizontal (ações por linha — opt-in), pull-to-refresh em telas dedicadas (futuro).

## Acessibilidade

- Tabela usa elementos semânticos: `<table>`, `<thead>`, `<tbody>`, `<tr>`, `<th scope="col">`, `<td>`. Em mobile (cards), usa `role="table"` + `role="row"` + `role="cell"` ou `<ul>` semântico com aria-labels por par chave/valor (decisão final na implementação; preferir `<table>` se atender bem).
- Header sortável: `<th aria-sort="ascending|descending|none">`; clique também acessível via Enter/Space.
- Linha selecionada: `<tr aria-selected="true">`.
- Checkbox "selecionar todos": `aria-label="Selecionar todas as linhas da página"` + `aria-checked` para estado misto.
- Pagination: cada botão de página com `aria-label="Página 3"` + `aria-current="page"` na corrente.
- Empty/error state: `role="status"` (não `alert` — não é interrupção).
- Bulk mode: anuncia mudança via `aria-live="polite"`: `"3 itens selecionados"`.
- Drag-drop de coluna: alternativa por teclado — `Space` no header inicia modo "mover", setas reordenam, `Enter` confirma, `Esc` cancela.
- Focus visível em todas as células interativas (links, botões, checkbox).
- Contraste: todos os tokens semânticos seguem [[semantic-colors]] (WCAG AA mínimo).

## Segurança

- **HTML sanitization**: `type='html'` **obrigatório** sanitiza via allowlist conservadora (`b, strong, i, em, br, span, a` + `href, title, class`). Implementação: DOMPurify ou equivalente — escolha do smith, fora desta spec; spec só impõe **que sanitize**. Conteúdo bloqueado pelo sanitizer renderiza placeholder `[conteúdo bloqueado]` + log.
- **Color row tokens**: hex direto do legado **não é interpolado em estilo inline**. Mapping para tokens semânticos antes; fallback `neutral` + warning.
- **Endpoint paths**: sanitizados pelo backend (validação `/proc/<nome>` ou allowlist) — fora desta spec; sinal ao smith para garantir.

## Composição

- **Compõe**: [[button]] (toolbar e bulk), [[form-field]] (search e column options), [[inline-alert]] (error state), [[modal-sheet]] (sheet `Ajustar` mobile, confirmação destrutiva, modais de gridAction `detailModal`/`actionModal`/`batchEdit`), `badge` (captions, badge type), `dropdown-menu` (kebab, captions, columns, export, auto-update, actions menu), `tooltip` (headers truncados, hover row-actions), `pagination` (controle), `skeleton` (loading), `empty-state` (vazio), `error-state` (erro), `data-grid-card` (variante mobile — sub-componente).
- **É composto por**: pages renderizadas pelo engine schema-driven (F009 → F011), templates legados `TemplateConsulta`/`TemplateCadastro`, modais de lookup de campos `grid-button` (F010), [[generic-filter]] (F016) é par lateral (não composição), [[reorderable-grid]] (F022) reusa primitivos.

## Cores e tokens

- `bg-background`, `bg-card` — superfícies (table container, cards).
- `bg-muted/30` — header bg, skeleton placeholder.
- `bg-muted/40` — linha hover, linha de grupo.
- `bg-accent/50` — toolbar em modo bulk.
- `bg-primary/10`, `border-primary` — linha selecionada.
- `text-foreground`, `text-muted-foreground` — texto e auxiliar.
- `border-border` — divisores de linha, header bottom, footer top.
- `border-input` — borda de search-input.
- `text-x-info`, `bg-x-info/10`, `border-l-x-info` — agrupamento nível 1, badges info, row tone info.
- `text-x-success`, `bg-x-success/10`, `border-l-x-success` — nível 2, badges success, row tone success.
- `text-x-warning`, `bg-x-warning/10`, `border-l-x-warning` — nível 3, badges warning, row tone warning.
- `text-x-error`, `bg-x-error/10` — error state, badges error.
- `text-primary` — links.
- Mapping `row['@color']`/`row['@bgColor']` → token: tabela em §"Segurança" + warning para valores não-mapeados.

## Edge cases

- **Linha sem PK**: o legado descobre via `getUniqueProp` (`id|cod|codigo`). Studio mantém o algoritmo mas, se nenhuma chave existir, **desabilita seleção** para o grid inteiro + log + debug strip do engine reporta `"PK não detectada — defina row.id|cod|codigo"`. Substitui o "selection silenciosamente quebra" do legado.
- **`linhas.linha` ausente**: empty state. Não erro.
- **`sucesso: false` na resposta**: error state com mensagem da resposta. Substitui `console.error` mudo do legado.
- **`partialCount === totalCount === 0`** + sem filtro: empty-initial.
- **Resposta com colunas a mais que o schema**: ignoradas silenciosamente (compatibilidade — proc pode evoluir antes do model).
- **Resposta com colunas a menos**: célula renderiza `—` (em-dash) em `text-muted-foreground`.
- **`type='html'` com payload muito longo**: trunca para `text-line-clamp-3` + tooltip; sem expand inline.
- **Auto-update durante bulk action**: pausa auto-update enquanto `bulk-action-running`; retoma após.
- **Filtro muda durante fetch**: cancela request anterior (AbortController); só o último vence.
- **Mudança de viewport mid-session** (rotate ou redimensionar): preserva estado de seleção, sort, filter, grouping; layout reflows. Preferências de coluna (width/order) podem se readaptar — em mobile, columns viram cards (não mostra width).
- **Modal de lookup (variante densa)**: oculta toolbar pesada (só search + page-size); seleção single ou multi conforme prop; `onRowOpen` resolve a seleção.
- **CSV em datasets grandes**: backend deve permitir export sem limite de página (`limite=-1` ou batch). Fora desta spec — sinal ao smith via contrato `export-csv`.

## Notas para o smith

- **Schema unificado**: `datagrid` e `datagrid2` viram a mesma chamada `<DataGrid />`. Engine pode normalizar.
- **`gridActions` é declarativo**: smith implementa o catálogo de 8 actions como handlers internos. Não expor handlers via props React (mantém schema-driven).
- **`type='html'` exige sanitizer**: dependência obrigatória. Sem ela, render placeholder.
- **Mapping color row → token**: implementar tabela explícita; warning para não-mapeados. Sinal para curator catalogar essa tabela em sub-spec se cresce.
- **Cancel de request em flight**: `AbortController` em cada fetch; recarga sequencial cancela anterior.
- **Persistência de preferências (column order/width/hidden)**: localStorage em v1 (`studio:grid:<pageKey>:prefs`); sub-feature `column-preferences` promove para `userPreference` server-side.
- **Skeleton ≥ 200ms gate**: não pisca em fetch < 200ms (UX percebida).
- **Mobile sheet `Ajustar`**: reaproveita [[modal-sheet]] tipo bottom-sheet (vaul).
- **Inline edit fora de escopo v1**: `inlineEdit !== 'none'` pode render `null` ou warning em v1; promover quando demandado.

## Notas vs legado (divergências conscientes)

- **Skeleton de loading no body** (legado mostra só spinner no badge).
- **Empty/error states explícitos** (legado fica em silêncio).
- **Sort tri-estado** (legado só asc/desc).
- **CSV respeita filtro corrente** (corrige bug do legado `filter={}` hard-coded).
- **HTML sanitizado** (legado usa `dangerouslySetInnerHTML` cru).
- **PK ausente → seleção desabilitada com feedback** (legado: erro silencioso).
- **Print com estilos do design system** (legado: HTML cru).
- **Mobile reinventado** (legado não tem mobile — F033 herda o débito que esta spec resolve).
- **Drag-drop de coluna acessível por teclado** (legado: mouse-only HTML5).
- **Pagination com range "{start}–{end} de {N}"** (legado: só "Exibindo N por página").
- **3 níveis de agrupamento mantidos** (paridade).
- **Auto-update pausado em aba oculta** (legado: drena bateria).

## Sinais ao curator

- **`grid-card`** (variante mobile do data-grid) — primitivo derivado: card que reproduz uma linha em formato vertical. Pode virar sub-spec se reusado fora do grid (ex.: timeline). Por enquanto interno ao data-grid.
- **`pagination`** — primitivo isolado (pager numérico + page-size + range). Reusável em outras listagens. Sinalizar spec dedicada quando demanda surgir fora do grid.
- **`empty-state`**, **`error-state`**, **`loading-skeleton`** — primitivos referenciados como `[[wiki]]` mas ainda não catalogados. Marcados como pendência genérica do catálogo (designer publica quando outra feature precisar).
- **`column-preferences`** (F-derivada) — persistência server-side de order/width/hidden. Sinalizada por F011 mas separável (P1).
- **`mobile-infinite-scroll`** (F-derivada) — opt-in mobile via `pagination='infinite'`. P2.
- **`grid-selection-persistence`** (F-derivada) — seleção cross-page. P2.
- **`grid-inline-edit`** (sub-feature) — `inlineEdit='cell'|'row'`. P1 quando demandado.
- **`grid-html-sanitizer`** — dependência obrigatória do `type='html'`. Curator escolhe implementação (DOMPurify/sanitize-html).
- **`grid-color-mapping`** — tabela canônica de `row['@color']`/`row['@bgColor']` → token semântico. Sub-spec curta se a lista crescer.
- **`grid-row-actions`** — `rowActions[]` por linha (independente de `gridActions[]` de bulk). Sub-feature P1 quando swipe ou hover-action por linha for demandado fora do `gridActions` de bulk.

## Sources

- [[calendar/notes/2026-05-15.md]] — UX de F011
- [[model-valor-datagrid]] — contrato legado
