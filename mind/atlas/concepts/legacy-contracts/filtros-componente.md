---
title: "Filtros (componente Filtro/) — painel de filtros do nó `filtro` do model"
aliases: [filtros-componente, filtro-componente, filter-component, model-valor-filtro]
tags: [contract, legacy, react-tools, filtro, filter, model-valor, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Contrato: componente `Filtros` (`react-tools/components/Filtro/`)

Cobre F016 do manifest. É o **renderer do nó `filtro`** dentro do `DFvalor` da página (vide [[engine-schema-driven]] §"Tabela de dispatch" e [[obter-model-pagina]]). Não é um filtro autônomo: vive sempre acoplado a um consumidor que recebe o estado submetido — tipicamente [[model-valor-datagrid|`<DataGrid2/>`/`<DataGrid/>`]] (F011) via `<GenericGridPage>`, mas também `<GenericGridCollection>` (várias grids irmãs compartilhando 1 filtro), `<GenericCalendar>` (F019), `<DashBoardHome>` (F020) e `<Modal>` em `GenericActionForm` (ações que precisam de parâmetros antes de executar).

O componente é **um único arquivo `Filtros.js`** + um hook auxiliar `useFiltros.js` (que só expõe `checkDefaultValue`, helper de comparação não usado pela maioria dos consumidores). Não há sub-pasta de variantes — é um único componente parametrizado por `model` (array de descritores de campo). Cada item de `model` declara um campo do painel com `type` discriminante; o `switch` por `type` no JSX escolhe o widget de entrada apropriado (`Input`, `PowerSelect3`, `DateInterval`, `DateTimeInterval`, `DateTimePicker`, `TimePicker`, `Checkbox`, `NullableBool`, `RadioButton`, `GridButton`).

> Observação crítica: o componente **NÃO envia query nem faz HTTP de filtragem por conta própria**. Ele apenas **agrega valores em um objeto `_filter`** e, no submit, chama `onSubmit(_filter)`. Quem dispara a busca (e como) é o consumidor (ex. `<GenericGridPage>` faz `setFilter({...e})`, e o `<DataGrid2/>` re-fetcha com `_filter` espalhado no body da request — vide [[model-valor-datagrid]] §"Endpoint de dados"). Toda semântica de operador (`=`, `like`, `between`, `>`, etc.) é **resolvida no backend** (stored procedure), **não no Filtro**: o legado posta o objeto cru e a proc decide. **O componente Filtros não conhece operadores.**

## Citações de fonte

- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:24-36` — assinatura: props `_ref, id, filter, visible, model, updateFilter, onSubmit, onClear, hideButtons, executeExternalAction, externalActionConfigs`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:48-50` — estado interno: `filterModel`, `_filter`, `filterError`. `selectOptions` é variável de **módulo** (`let selectOptions = {}` na linha 22) — compartilhada entre instâncias.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:52-67` — `handleChange`: aplica `verifyLinkedFilters`; ramos especiais por `field.type` (`select` com value vazio → null; `datetime-interval` → expande para `<prop>De` e `<prop>Ate`; `grid-button` → escreve `<prop>Rows`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:69-74` — `handleSubmit`: `preventDefault`, valida required, chama `onSubmit({..._filter})`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:76-81` — `handleClear`: recomputa defaults com `handleDefaultValue` e chama `onClear()` (sem param).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:83-123` — `verifyRequiredFilters`: percorre `model.required`; para `type='select'` exige array não vazio; demais tipos exigem valor não null/undefined/''; `bool` e `checkbox` ignoram required (linha 110). Erros vão em `filterError[prop]=true`, render mostra `<p style=color:red>Campo obrigatório.</p>`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:125-174` — `verifyLinkedFilters` (filtros encadeados): quando o campo modificado tem `linkedFilters[]`, dispara GET ao endpoint `{api.split('/select')[0]}/select/{lFilter.prop}?filtro={value}` e injeta opções no módulo `selectOptions`; alternativamente substitui `lFilter.value` no model se `lFilter.value !== null` (modo "valor fixo encadeado").
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:176-182` — `checkFieldVisibility`: lógica de `display:block|none` baseada em `field.hide` (boolean ou string `'true'`); `required=true` **sobrescreve** `hide` (campo obrigatório sempre visível).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:184-232` — `handleDefaultValue`: defaults por tipo. `dates`: `[hoje-1d, hoje+1d]`. `datetime-interval`: `[hoje + daysFromStartDate (default -1) @00:00, hoje + daysFromEndDate (default +1) @23:59]`. `radio`: primeiro item de `values[]`. `bool`: `null`. `checkbox`: `defaultValue` coergido por `checkBooleanValue` ou `false`. `select` com `linkedFilters`: re-aponta `api` do filtro irmão.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:251-259` — `useEffect`: aplica defaults no mount e chama `updateFilter(newFilter)` (notifica o pai); `useLayoutEffect` pré-carrega opções de todos os selects via `_getSelectOptions`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:261-263` — wrapper: `<div className="collapse {visible?show:''}" ref={_ref}>` — visibilidade controlada por classe Bootstrap, **o ref expõe o DOM** para o consumidor manipular `.classList.add/remove('show')` direto.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:267-537` — `model.map((field) ⇒ jsxElement)`: switch implícito por `field.type` cobrindo `select`, `checkbox`, `bool`, `time`, `prop==='date'` (sic — discriminador é `prop`, não `type`), `dates`, `datetime-interval`, `numbers`, `radio`, `grid-button`, fallback (`Input` genérico de texto). Todos os campos rendem em `col-md-4` exceto `time`/`dates`/`datetime-interval` (custom-col-md responsivos).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:539-567` — toolbar inferior: dois botões fixos `Limpar` (`btn-filtro-limpar`) e `Pesquisar` (`btn-filtro-pesquisar{id?-id:}`) — escondidos se `hideButtons=true`. Botão extra `btn-exec-external-action` se `executeExternalAction=true` (usado por `<GenericActionForm>` para modais de ação).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/hooks/useFiltros.js:1-21` — `checkDefaultValue(filterModel, filterValue)`: helper de detecção heurística "filtro tem default ativo?" — retorna `false` quando o filtro tem 3 propriedades preenchidas e algum campo é `dates`/`datetime-interval` (3 = `prop`+`propDe`+`propAte`). Aparentemente legado (não usado em `Filtros.js`; só re-export do hook).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericGridPage.js:15-94` — consumidor canônico: recebe nó `filtro` do model, passa `model={filtro.model}`, `id={filtro.id}`, `filter={filter}`, `visible={showFilter}`, `updateFilter={setFilter}`, `onSubmit={handleSubmitFilter}`. `handleSubmitFilter` zera `selected` e faz `setFilter({...e})` — dispara re-fetch do grid via `useEffect` em [[model-valor-datagrid|`useDataGrid`]].
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericGridPage.js:34-38` — `toggleFilter`: manipula `filtroRef.current.classList` direto. Não usa state.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericGridPage.js:57-60` — `useEffect` lê `filtro.openFilter` (boolean opcional do model) para abrir o painel no mount.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:46-54,109,142,231-233,297` — `GenericPage` extrai chave `filtro` do model raiz; passa pra `RenderGridPage` se `datagrid||filtro` existirem. Existe `<Title title='Filtros'>` (linha 233) acima do painel quando há filtro sem grid (uso raro).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericGridCollection.js:13-21,184-189` — consumidor `<GenericGridCollection>`: 1 filtro compartilhado entre N grids irmãs (`grids[]`). Cada submit propaga para todas via `setFilter` interno.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:7,124-141` — consumidor modal: `<Filtros>` dentro de `<Modal>` com `hideButtons=true`, `executeExternalAction=true`, `externalActionConfigs.onClick(e)` recebe `_filter` e dispara a ação (ex. envio em lote com parâmetros).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericCalendar/GenericCalendar.js:101` — consumidor `<GenericCalendar>` (F019) passa `id={filtro.id}` — mesma mecânica que grid.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardHome.js:182` — consumidor dashboard usa `openFilter={model.openFilter}` (F020).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GridButton.js:31,43,361` — `GridButton` (widget de seleção via mini-grid) também aceita `openFilter` próprio — não é o mesmo painel `Filtros`, mas reusa o conceito.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useSelectFields.js:7-27,29-65,67-98,100-130` — backend de opções de `select`: `getSelectFieldConfigs(model, 'filter')` filtra campos `type=select`; `mapSelectResources` agrupa por `api`/`queryKey`; `sendRequest` POST se `api?.includes('/proc/')`, senão GET `/selectquery/{queryKey}?parametro_id={id||''}` ou GET `{api}`.
- `sources/engenharia--fabrica--sql--portal-director/processa.agendamento/alimentacao/model.consultar_agendamento.sql:7-39` — exemplo real de nó `filtro` em produção: 6 campos (`select` com `api`, `numbers`, fallback texto, `dates`, `select` com api estático, fallback texto). Mostra `required: true` em `codEmpresa` e `required: false` em `data`.
- `sources/engenharia--fabrica--sql--portal-director/processa.gerenciamento.integracoes/alimentacao/model.fusion_pedidos.sql` — exemplo de filtro com mais campos.
- `sources/engenharia--fabrica--sql--portal-director/processa.agendamento/alimentacao/model.gerenciar_agendamento.sql` — outro consumer real.
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/1-alimentacao/insert_template_pagina.sql` — `TemplateConsulta` contém esqueleto base com `filtro`.
- `sources/engenharia--fabrica--javascript--react-tools/src/index.js` — `Filtros` **não** está na public API (só `DataGrid2`, `Modal`, etc.); é componente interno consumido apenas pelos `Generic*`.

## Estrutura do componente

### Props do `<Filtros>`

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `_ref` | React ref | não | Expõe o `<div className="collapse">` raiz para o consumidor manipular `.classList` (toggle de visibilidade fora do React) | qualquer ref | `toggleFilter` em `<GenericGridPage>` adiciona/remove classe `show` | consumidor |
| `id` | string | não | Sufixo do `id` HTML do botão Pesquisar (`btn-filtro-pesquisar-{id}`) | livre | discriminador para testes E2E e analytics; vem de `filtro.id` no model | model |
| `filter` | object | não (default `{}`) | Valor inicial do filtro (deep-link, restore, default vindo do consumidor) | objeto livre | seed do state `_filter` no mount | consumidor |
| `visible` | boolean | não | Controla classe `show` no `collapse` | true/false | renderiza visível ou colapsado | consumidor (state `showFilter`) |
| `model` | `FilterField[]` | sim | Schema dos campos | array | drive de todo o render | model `filtro.model` |
| `updateFilter` | `(filter)=>void` | não | Notifica o pai sobre defaults computados no mount | função | chamado UMA vez em `useEffect([])` com defaults | consumidor |
| `onSubmit` | `(filter)=>void` | não | Handler do clique em "Pesquisar" | função | recebe `{..._filter}` (clone raso); só dispara se `verifyRequiredFilters()` passar | consumidor |
| `onClear` | `()=>void` | não | Handler do clique em "Limpar" | função | recebe nada; state interno já foi resetado para defaults antes da chamada | consumidor |
| `hideButtons` | boolean | não (default false) | Esconde os botões Pesquisar/Limpar | true/false | usado em modais de ação onde submit é externo | consumidor |
| `executeExternalAction` | boolean | não (default false) | Renderiza botão extra `btn-exec-external-action` | true/false | habilita o modo `<GenericActionForm>` modal | consumidor |
| `externalActionConfigs` | `{title, onClick}` | quando `executeExternalAction` | Config do botão extra | objeto | `onClick(_filter)` ao clicar | consumidor |
| `selectOptions` | object | não (legado) | Pre-load de opções de select | objeto `{prop: option[]}` | passado em `getSelectOptions({optionRef:selectOptions})` mas o componente lê da var de módulo, não da prop | consumidor (pouco efeito) |
| `setSelectOptions` | função | não (legado) | Setter externo de opções | função | aceito mas não chamado de volta — efetivamente morto | consumidor |

> Inconsistência: `selectOptions`/`setSelectOptions` aparecem nas chamadas (`GenericGridPage.js:84-85`) mas o `Filtros` mantém `selectOptions` como **variável de módulo** (`let selectOptions = {}` na linha 22), compartilhada entre todas as instâncias da árvore. Cache global de facto.

### `FilterField` (item do `model[]`)

Campos comuns a todos os tipos:

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `prop` | string | sim | Nome da chave no objeto `_filter` (e portanto no body da request do consumer) | string | `_filter[prop] = value` | model |
| `label` | string | sim | Rótulo exibido (`<strong>{label}</strong>`) | string | render | model |
| `type` | string | não (default = `'input'` implícito) | Discriminador do widget | `select \| checkbox \| bool \| time \| dates \| datetime-interval \| numbers \| radio \| grid-button \| undefined` (= texto) | switch de render | model |
| `required` | boolean | não (default false) | Bloqueia submit se vazio | true/false | exibe `*` no label e valida em `verifyRequiredFilters` | model |
| `hide` | boolean \| `'true'`/`'false'` | não (default false) | Esconde o campo (mas mantém no schema/state) | boolean ou string-bool | `display:none` no `<div col-md-4>`; **`required=true` sobrescreve** | model + interpolação `dParam<N>` |
| `disabled` | boolean | não | Desabilita o widget (só usado por `select`/`PowerSelect`) | true/false | passa `_disabled` para o widget | model |

Campos específicos por `type`:

| `type` | Campo | Tipo | Semântica |
|---|---|---|---|
| `select` | `api` | string | endpoint de carga das opções (`/proc/...` → POST; `/select/<id>` → GET; outros → GET); chamado em `useLayoutEffect` |
| `select` | `queryKey` | string | alternativa a `api` — GET `/selectquery/{queryKey}?parametro_id={state.id\|\|''}` |
| `select` | `linkedFilters` | `LinkedFilter[]` | (ver §"Linked filters") |
| `select` | `selectDataType` | `'fixedList'` | quando `'fixedList'`, lê `options[]` em vez de chamar endpoint |
| `select` | `options` | `Option[]` | lista estática `{label,value}` (usado com `selectDataType:'fixedList'`) |
| `select` | `isMulti` | boolean | passado ao `PowerSelect3` — controla multi-select |
| `dates` | — | — | sem campos próprios; default `[hoje-1d, hoje+1d]` formato `yyyy-MM-DD` |
| `datetime-interval` | `daysFromStartDate` | number | default -1; soma em dias a partir de hoje para `<prop>De` |
| `datetime-interval` | `daysFromEndDate` | number | default +1; idem para `<prop>Ate` |
| `datetime-interval` | `useDefaultDate` | boolean | passado ao `DateTimeInterval` (controla aplicação do default) |
| `time` | — | — | `TimePicker` |
| `numbers` | `maskType` | string | passado ao `Input`; default usado é `'numerosTamanhoVariavel'` |
| `numbers` | `maskLength` | string/number | default `'100'` |
| `radio` | `values` | `{label,value}[]` | opções; primeira é default |
| `checkbox` | `defaultValue` | boolean \| string-bool | default coergido por `checkBooleanValue` |
| `bool` | — | — | `NullableBool` — 3 estados (true/false/null) |
| `grid-button` | `api`/`filterConfig`/`gridConfig` | — | abre mini-grid de seleção; valor armazenado em `_filter[prop]` + `_filter[propRows]` |
| `prop==='date'` (sic) | — | — | discriminador por **`prop`**, não `type` — usa `DateTimePicker` (data+hora, ponto único). Convenção: campo cujo `prop` é literalmente `'date'` |
| fallback (sem `type`) | — | — | `Input` de texto livre, sem máscara |

### `LinkedFilter` (encadeamento entre selects)

| Item | Tipo | Semântica |
|---|---|---|
| `prop` | string | `prop` do select irmão a atualizar quando este mudar |
| `value` | string \| `null` | Se `null`: re-chama o endpoint de opções do irmão passando o valor atual como `?filtro=`. Se string: substitui o `value` (e o `api`) do irmão diretamente (modo "cascata fixa") |

Comportamento em `verifyLinkedFilters`:
- Constrói `newApi = "{rootApi}/select/{lFilter.prop}?filtro={selectedValue}"` onde `rootApi = field.api.split('/select')[0]`.
- Faz request via `useSelectFields._sendRequest({api:newApi})`.
- Resposta com `status:200, sucesso:true` → injeta `dados` em `selectOptions[lFilter.prop]` (var de módulo).
- Limpa o valor selecionado do irmão: `newFilter[lFilter.prop] = []`.

## Estado interno

| Variável | Tipo | Default | Origem |
|---|---|---|---|
| `filterModel` | `FilterField[]` | prop `model` | `useState(model)` |
| `_filter` | object | prop `filter` | `useState(filter)` |
| `filterError` | `{[prop]: boolean}` | `{}` | preenchido por `verifyRequiredFilters` no submit; limpo no clear |
| `selectOptions` (módulo) | `{[prop]: Option[]}` | `{}` | populado em `useLayoutEffect` por `_getSelectOptions` e por `verifyLinkedFilters` |

> Não é persistido. Cada mount reinicia. **Não há sincronização com URL** — refresh perde o filtro (exceto pelo `additionalParams.filter` que o `<GenericGridPage>` recebe via `route` da [[menu-hierarquia|navegação]] e injeta como `filter` inicial; deep-link só funciona se a aba foi aberta com `additionalParams.filter` preenchido).

## API/payload (como o filtro vira request)

**O `<Filtros>` em si não dispara HTTP de busca.** O fluxo canônico é:

1. Usuário preenche campos → `handleChange` muta `_filter`.
2. Clique em "Pesquisar" → `handleSubmit(e)` → `verifyRequiredFilters()` → `onSubmit({..._filter})`.
3. Consumidor (ex. `<GenericGridPage.handleSubmitFilter>`) faz `setFilter({...e})`.
4. `<DataGrid2/>` re-fetcha via `useDataGrid` (deps incluem `filter`): POST `{api}` body `{...filter, ...additionalFilterParams, pagina, limite, ordenacao}`.
5. Backend (stored procedure) decide os operadores (`like %x%`, `between x and y`, `= x`, `in (...)`). **Toda inteligência de operador vive na proc.**

Forma típica do body para tipo de campo:

| `type` | Forma em `_filter` | Exemplo |
|---|---|---|
| `select` (single) | `[{value, label, ...}]` (array com 1 item) | `codEmpresa: [{value: 12, label: "Curitiba"}]` |
| `select` (multi `isMulti`) | `[{...}, {...}, ...]` | idem com N itens |
| `select` vazio | `null` (após `handleChange` com `value===''`) | `codEmpresa: null` |
| `dates` | string `"yyyy-MM-DD,yyyy-MM-DD"` (não array!) | `data: "2026-05-15,2026-05-17"` |
| `datetime-interval` | string `"yyyy-MM-DD HH:mm,yyyy-MM-DD HH:mm"` + `<prop>De`/`<prop>Ate` separados | `dataAg: "2026-05-15 00:00,2026-05-17 23:59"`, `dataAgDe: "2026-05-15 00:00"`, `dataAgAte: "2026-05-17 23:59"` |
| `numbers` | string (mantido como digitado, sem coerção) | `numAgendamento: "1234"` |
| `radio` | valor cru do item escolhido | `tipo: "A"` |
| `checkbox` | boolean | `ativo: true` |
| `bool` | `true \| false \| null` | `bloqueado: null` |
| `time` | string `"HH:mm"` (formato do `TimePicker`) | — |
| `grid-button` | valor da grid + `<prop>Rows: row[]` | `armazens: "1,2,3"`, `armazensRows: [{...}]` |
| fallback texto | string crua | `responsavel: "Joao"` |

## Integração com DataGrid2

Documentada em [[model-valor-datagrid]] §"Integração com Filtro (F016)". Pontos canônicos:

- `<GenericGridPage>` é o **mediador**: monta filtro + grid no mesmo container, mantém o `filter` state.
- `filtro` vive **fora** do nó `datagrid`/`datagrid2`, no mesmo nível do model raiz (irmão).
- `filtro.openFilter: true` no model abre o painel no mount.
- `requiredFilters` (computado a partir de `model.filter(x=>x.required)`) é repassado ao grid — mas **o grid não bloqueia fetch** se faltar required; só o `<Filtros>` bloqueia o submit.
- `additionalFilterParams` no nó `datagrid2` é **separado** do filtro — vai em toda request, sem UI; mesclado raso (mesma chave sobrescreve filter).
- `<GenericGridCollection>` permite 1 filtro compartilhado entre N grids.

## Persistência

| Estado | Persistido? | Como sobrevive a refresh |
|---|---|---|
| Valores do filtro | **Não** | Apenas via `additionalParams.filter` injetado pela [[menu-hierarquia|rota]] (deep-link explícito). |
| `selectOptions` carregados | Não (var de módulo, perde no reload) | Re-fetchado no `useLayoutEffect` do mount. |
| Estado de "visível/colapsado" | Não | Default fechado, abre com `filtro.openFilter=true` ou clique no toggle. |
| `filterError` | Não | Limpo no submit/clear. |

URL não é fonte de verdade. Não há sincronização explícita com query string.

## Reset (botão "Limpar")

- Botão `btn-filtro-limpar` no canto inferior direito (acima do "Pesquisar").
- `handleClear()`:
  1. `newFilter = handleDefaultValue()` — recomputa defaults (NÃO zera tudo; volta a `[hoje-1d,hoje+1d]` para `dates`, primeira opção do radio, `checkBooleanValue(defaultValue)` para checkbox, etc.).
  2. `setFilterError({})`.
  3. `setFilter(newFilter)` — **importante**: para campos sem default em `handleDefaultValue`, o valor anterior **persiste** porque `handleDefaultValue` só retorna chaves dos tipos `dates/datetime-interval/radio/bool/checkbox/select-linked`. Texto, numbers, select normal **não são limpos** — bug ou design opaco do legado.
  4. `onClear()` — sem argumentos. Consumidor decide se também zera o estado do filtro lá fora (no `<GenericGridPage>` o `handleClearFilter` está **comentado** — `GenericGridPage.js:46-49` — portanto o pai NÃO recebe notificação efetiva de clear no fluxo padrão).
- Botão escondido se `hideButtons=true`.

## Operadores

**Não existem operadores no componente.** O `<Filtros>` não tem UI para `=`, `like`, `between`, `>`, `<`, `in`, `not in`, `null`/`not null`, etc. O contrato implícito é:

- Cada campo é um **valor** (ou par De/Ate, para intervalos).
- A **stored procedure** consumidora (ex. `acesso.obter_agendamentos`) decide o operador por convenção de nome:
  - `<prop>` simples → `WHERE col = @prop OR @prop IS NULL` (igualdade ou ignorar).
  - `<prop>De` + `<prop>Ate` → `WHERE col BETWEEN @propDe AND @propAte`.
  - Strings texto → `LIKE '%' + @prop + '%'` (típico; depende da proc).
  - `select` multi → a proc recebe um array/CSV e faz `IN`.
- Não há contrato formal. **Quem decide operador é a proc** (vide [[model-valor-datagrid]] §"Endpoint de dados (`api`)").

## Asserções observáveis (FL1..FL12)

| # | Input | Output esperado | Regra | Fonte legado |
|---|---|---|---|---|
| FL1 | `model=[{prop:'data', type:'dates', required:false}]` → mount | `_filter.data === '<hoje-1d>,<hoje+1d>'` (strings `yyyy-MM-DD`) | `handleDefaultValue` aplica `moment().add(-1,'d')` e `+1d`, junta com `.toString()` (vírgula) | `Filtros.js:188-193` |
| FL2 | `model=[{prop:'codEmpresa', type:'select', required:true}]` → clicar "Pesquisar" sem preencher | `onSubmit` NÃO é chamado; `filterError.codEmpresa===true`; render mostra `<p style="color:red">Campo obrigatório.</p>` | `verifyRequiredFilters` exige `_filter[prop].length>0` para select | `Filtros.js:88-103, 319-325` |
| FL3 | `model=[{prop:'ativo', type:'bool', required:true}]` + valor `null` → "Pesquisar" | `onSubmit` É chamado (bool ignora required) | `if (field.type !== 'bool' && field.type !== 'checkbox')` é o gate do push erro | `Filtros.js:110-115` |
| FL4 | Campo `type='datetime-interval'`, `prop='dataAg'` → `handleChange` com `value="2026-05-15 00:00,2026-05-17 23:59"` | `_filter.dataAg === <valor>`, `_filter.dataAgDe === '2026-05-15 00:00'`, `_filter.dataAgAte === '2026-05-17 23:59'` | split por `,` em `handleChange` ramo `datetime-interval` | `Filtros.js:58-61` |
| FL5 | Campo `type='select'`, value selecionado `{value:'', label:'...'}` → `handleChange` | `_filter[prop] === null` (não `[]`, não `''`) | ramo especial em `handleChange` quando `value.value===''` | `Filtros.js:56-58` |
| FL6 | Campo `select` com `linkedFilters:[{prop:'cidade', value:null}]` → mudar valor → `handleChange` | dispara GET `{rootApi}/select/cidade?filtro={valor}`, popula `selectOptions.cidade`, zera `_filter.cidade=[]` | `verifyLinkedFilters` linhas 130-157 | `Filtros.js:125-174` |
| FL7 | `hide:true` + `required:true` no mesmo campo | Campo renderiza visível (`display:block`) — required vence | `checkFieldVisibility`: condição inclui `(field.required && field.required===true)` | `Filtros.js:176-182` |
| FL8 | Clicar "Limpar" com filtro `{texto:'abc', data:'2026-05-10,2026-05-12'}` | `_filter.data` volta a `<hoje-1d>,<hoje+1d>`; `_filter.texto` **continua `'abc'`** | `handleDefaultValue` só popula chaves dos tipos especiais — texto livre não é resetado | `Filtros.js:184-232, 76-81` |
| FL9 | Submit com filtro válido | `onSubmit` recebe **clone raso** `{..._filter}` (não a ref interna) | `onSubmit && onSubmit({ ..._filter })` em `handleSubmit` | `Filtros.js:72` |
| FL10 | Mount com prop `filter={x:'init'}` + `model` cujos defaults retornam `{data:'...'}` | `_filter === {x:'init', data:'...'}` (merge: defaults sobrescrevem props vazias mas spread coloca defaults depois de filter) | `setFilter({ ..._filter, ...newFilter })` em useEffect | `Filtros.js:252-253` |
| FL11 | `visible={false}` | wrapper renderiza `<div className="collapse">` sem `show` → painel colapsado (não removido do DOM) | className condicional `${visible?'show':''}` | `Filtros.js:262` |
| FL12 | Botão "Pesquisar" recebe `id` = `btn-filtro-pesquisar-{id}` quando prop `id` definida | id HTML estável para E2E | concatenação literal | `Filtros.js:550` |
| FL13 | `executeExternalAction=true` + `externalActionConfigs={title:'Enviar',onClick:fn}` | renderiza botão extra `btn-exec-external-action`; click chama `fn(_filter)` | bloco condicional na toolbar | `Filtros.js:557-566` |
| FL14 | `hideButtons=true` | nem "Pesquisar" nem "Limpar" renderizam; submit só via tecla Enter (`<form>`-less — não há form wrapper, então Enter também não submete) | `{hideButtons ? '' : <div>...</div>}` | `Filtros.js:540-556` |
| FL15 | `_ref` passado pelo pai | pai pode chamar `_ref.current.classList.add('show')` para mostrar sem re-render | `<div ref={_ref}>` direto na raiz | `Filtros.js:262`, consumidor `GenericGridPage.js:34-38` |

## Relações com o ecossistema

- Consome de:
  - [[engine-schema-driven]] (dispatch — chave `filtro` no `DFvalor`).
  - [[obter-model-pagina]] / [[tbmodel-pagina]] (origem do JSON `filtro.model[]`).
  - `useSelectFields` (carga de opções para `type:select`).
- É consumido por:
  - [[model-valor-datagrid]] (F011) — via `<GenericGridPage>`/`<GenericGridCollection>`; **principal consumidor**.
  - F019 (`GenericCalendar`) — mesmo padrão.
  - F020 (`DashBoardHome`) — passa `openFilter`.
  - F010 (cadastros) — `<GenericActionForm>` usa `<Filtros>` em modal para coletar parâmetros de ação.
- Acopla widgets:
  - F018 (`DateTimePicker`/`DateInterval`/`DateTimeInterval`) — tipos `dates`/`datetime-interval`/`date`.
  - `PowerSelect3` (F? — power-select, candidata a feature dedicada) — tipo `select`.
  - `NullableBool` (F? — bool tri-state, candidata).
  - `GridButton` (F? — mini-grid de seleção como input, candidata).
  - `Input` com máscaras (F? — input masking, candidata).
- Sub-contratos a criar:
  - `power-select3.md` — PowerSelect3 é peça complexa o suficiente para merecer contrato isolado (multi/single, opções dinâmicas, `linkedFilters` resolution no nível do select).
  - `select-options-endpoint.md` — convenção `/select/<id>`, `/selectquery/<key>`, `/proc/<nome>` + `selectDataType:fixedList` (regra de despacho está em `useSelectFields.sendRequest`).
  - `date-components.md` — F018 já mapeada; precisa de contrato do payload (string `yyyy-MM-DD,yyyy-MM-DD` vs ISO).

## ⚠️ Inércia legada

Pontos que o Studio deve decidir explicitamente preservar ou superar:

- **Operadores invisíveis**: filtro não tem UI de operador; toda lógica está na proc. Studio que quiser `WHERE col >= x` precisa criar campo separado ou estender a proc. Não há facilidade para "diferente de", "vazio", "not in", etc.
- **`dates` retorna string CSV `"yyyy-MM-DD,yyyy-MM-DD"`** (não par/array). Quem consome precisa fazer split. Convenção opaca.
- **`datetime-interval` duplica estado** em 3 chaves (`prop`, `propDe`, `propAte`) — proc precisa saber qual usar.
- **Clear é parcial** (FL8): só reseta tipos com default; texto livre persiste. Provável bug histórico.
- **`select` value=`null` vs `[]`**: handleChange às vezes seta `null`, defaults setam `[]`. Backend precisa lidar com os dois.
- **`selectOptions` é var de módulo** (não state). Múltiplas instâncias de `<Filtros>` montadas em paralelo compartilham cache; race conditions possíveis.
- **Sem URL state**: refresh perde filtro. Deep-link só funciona via `additionalParams.filter` injetado pela rota.
- **`type` indefinido = `Input` de texto**. Discriminador frágil — modelers escrevem `type:'text'` por engano e ainda funciona (mesma branch fallback).
- **`prop==='date'` discrimina por nome de prop**, não por type. Convenção mágica que confunde modelers (`Filtros.js:382-409`).
- **Validação de required ignora `bool` e `checkbox`** (FL3). Pode ser intencional (estado tri-state) mas é silente.
- **`onClear` no `<GenericGridPage>` está comentado** — pai não é notificado do clear; só o state interno do `<Filtros>` muda. `setFilter` no pai só ocorre se "Pesquisar" for clicado depois.
- **Submit não está em `<form>`**: clique no botão é `onClick` (não `onSubmit` de form); **Enter não submete**. Acessibilidade fraca.
- **`linkedFilters` faz request síncrono** dentro do `handleChange` (`await _sendRequest`) — bloqueia a UI até a resposta. Sem debounce, sem cancel.
- **Sem hooks de "antes de submeter"** para transformações custom (ex. converter `[{value:1}]` → `1`). Backend precisa lidar com array sempre.
- **Pre-load de opções no mount** (`useLayoutEffect`) — toda página com filtro+select dispara N requests em paralelo no first paint. Sem cache persistido entre páginas.

## Notas de implementação para o Studio

- Schema é **autodocumentado** mas com convenções mágicas (`prop==='date'`, default oculto de `dates`). Studio pode formalizar `dateMode: 'single' | 'range'` em vez de `prop`-based.
- Reutilização ampla (grids, calendário, dashboard, ações modais) sugere manter o conceito "painel de campos com `onSubmit`" como primitiva.
- `additionalFilterParams` (no grid) + `filter` (do `<Filtros>`) viajam **juntos** no body — não é responsabilidade do `<Filtros>` mesclar; é do consumidor. Mantém o componente puro.
- Considerar elevar operadores para o schema (`op: 'eq' | 'like' | 'between' | 'in'`) para liberar a proc do papel de roteador semântico. Mas: muitas procs hoje assumem o contrato implícito — migração precisa de paridade.
- Considerar URL-sync (querystring) e/ou storage de "última busca por página" como melhoria não-breaking.
- `selectOptions` global é candidato natural a query cache (React Query / SWR / equivalente) — não é prescrição de stack, é observação de padrão.

## Features novas identificadas (para o curator)

Durante a escavação de F016 surgiram candidatas dedicadas:

1. **PowerSelect3** — widget rico de select (single/multi, lazy options, linkedFilters resolution); aparece em filtros, forms e gridButton. Merece feature/contrato próprios.
2. **NullableBool (tri-state)** — bool com 3 estados. Convenção do legado.
3. **GridButton (mini-grid como input)** — campo de filtro que abre uma grid de seleção. Vive em `react-tools/components/GridButton.js`.
4. **select-options-endpoint** (`/select/<id>`, `/selectquery/<key>`, `/proc/<nome>`, `selectDataType:fixedList`) — convenção HTTP/payload que merece contrato isolado; afeta filtros, forms e GridButton.
5. **linked-filters / cascading selects** — semântica de filtros encadeados (`linkedFilters[]`). Hoje vive 100% no `<Filtros>` (`verifyLinkedFilters`), mas o padrão repete em `<GenericForm>`. Candidato a primitiva compartilhada.
6. **input masking** (`maskType: 'numerosTamanhoVariavel' | 'inteiro' | 'letrasNumeros' | ...`) — convenções de máscara aplicadas em filtros e forms. Catalogar separadamente.
7. **`DateInterval` / `DateTimeInterval` (F018)** já está mapeada — escavação precisa documentar payload string CSV vs ISO.

## Sources

- [[calendar/notes/2026-05-16.md]]
