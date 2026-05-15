---
title: "Engine schema-driven (pipeline runtime de render por rota)"
aliases: [engine-schema-driven, generic-pages-engine, dispatch-engine, model-driven-render]
tags: [contract, legacy, react-tools, render-engine, director-studio, dispatch]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: Engine schema-driven do AppBuilder legado

Pipeline **runtime** que transforma uma rota navegada no shell ([[app-main]]) em uma página renderizada. Vive integralmente em `react-tools/src/components/GenericPages/` + `GenericPage/`. É o motor central que o manifest do Director.Studio nomeia "F009 — Engine schema-driven (dispatch por DFtipo)" — mas **o dispatch não é por `DFtipo`**: é por **presença de chaves** dentro do JSON cru armazenado em `acesso.TBmodel_pagina.DFvalor` (ver [[obter-model-pagina]] §"Estrutura das tabelas-base").

Dado: uma rota `/agendamento/gerenciar-agendamento` ativa em uma aba.
Resultado: um React tree composto pela combinação dos sub-componentes cujas chaves estão presentes no model.

## Citações de fonte

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPages/GenericPages.js:10-138` — orquestrador (fetch + interpolação + parse + branch tabs/page).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:43-355` — renderer de página única (dispatch por chaves).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericTabPage.js:9-62` — renderer de página de abas (recursão em `<GenericPage/>`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/AppMain/AppMain.js:211-218` — entrada: como `AppMain` decide chamar `<GenericPages/>` versus componentes custom (vide [[app-main]] §"Dispatch do conteúdo principal").
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/1-alimentacao/insert_template_pagina.sql:10-19` — universo de templates seed do AppBuilder (8 formas canônicas de model).
- `sources/engenharia--fabrica--sql--portal-director/processa.agendamento/alimentacao/model.gerenciar_agendamento.sql:1-80` — exemplo real de model em produção (forma "TemplateCadastro" expandida).

## Mapeamento rota → page-key

Em `AppMain.js:215-217`, antes de chamar o engine:

```
caso geral → <GenericPages api='/model' appKey={appConfigs.appKey} path={route.path} additionalParams={route}/>
```

Onde `route.path` vem do flat-list de rotas em `useNavigation` ([[menu-hierarquia]]), que por sua vez veio do ACL. **Casos especiais bypassam o engine** antes (vide [[app-main]] §"Dispatch do conteúdo principal"):

| Condição | Branch | Engine envolvido? |
|---|---|---|
| Hash `#/dashboard?...` | Renderiza `<DashBoardPage/>` direto no shell | não |
| Hash `#/auth?...` (com `useAuthRoute`) | Renderiza `<AuthRoute/>` | não |
| `route.component !== null` | Componente custom injetado via prop `routes` | não |
| `route.path === '/'` | `<DashBoardHome/>` | não |
| `route.path === '/dashboard'` | `<DashBoardCrud/>` | não |
| Demais rotas | **`<GenericPages/>` ← engine** | sim |

Dentro de `GenericPages`, o `path` efetivo é resolvido em ordem (`GenericPages.js:62-64`):

1. `props.path` se passado e não vazio
2. fallback: `window.location.href.split('#')[1]` — o próprio hash atual

## Pipeline runtime

```
mount <GenericPages api='/model' appKey path additionalParams/>
   |
   v
[1] effect dispara getModel(path)
   |
   v
[2] POST {api}  body={ caminho, chaveAplicacao=appKey, idUsuario }
                              (api é sempre '/model' no uso do shell)
   |
   v
[3] backend resolve: ver [[obter-model-pagina]]
   → resp.dados = { model: string, modelParams: ModelParam[], funcoes: Funcao[] }
   |
   v
[4] evalModelDynamicParams(modelParams, model)
   → para cada param: model = model.replaceAll(param.chave, eval(param.valor))
   |
   v
[5] JSON.parse(modelString) → modelObject  ✗ catch → warning('Ocorreu um erro ao processar...')
   |
   v
[6] functionsArray.current = funcoes (ref, não state)
   |
   v
[7] setModel(modelObject)
   |
   v
[8] render branch:
   model.pageTabs presente?
     sim → <GenericTabPage model={...} checkAcl={...}/>
                    → recursão: cada tab vira um <GenericPage model={tab}/>
     não → <GenericPage title={model.genericPageTitle}
                        model={...}
                        genericFunctionsArray={functionsArray.current}
                        additionalParams={additionalParams}
                        hidePreferenceButton={hidePreferenceButton}/>
   |
   v
[9] <GenericPage> dispatcha por presença de chaves (§"Tabela de dispatch" abaixo)
```

## Etapas do pipeline (detalhe)

### [2] Request

| Item | Valor |
|---|---|
| Método | POST |
| URL | base + `api` (no shell: `/model`, resolvido para `/api/model` pelo proxy) |
| Body | `{ caminho, chaveAplicacao, idUsuario }` (idUsuario ignorado pelo backend — vide [[obter-model-pagina]]) |
| Auth | header injetado pelo `useRequest` (Bearer do `authState.token`) |

### [4] Interpolação de `modelParams`

Função `evalModelDynamicParams(modelParams, stringModel)` em `GenericPages.js:26-58`:

- Itera cada `param` em ordem do array.
- `eval(param.valor)` — expressão JS rodando no escopo do componente. Refs disponíveis no escopo: `getAclResourceCompanies` (de `useAcl`); demais variáveis JS globais do browser. **API implícita** que o backend precisa respeitar.
- Se `eval` retorna **primitivo**: `model.replaceAll(param.chave, primitivo)`.
- Se `eval` retorna **objeto**: monta literal sintático `#${"k":"v","k2":"v2"}#$`, substitui, depois limpa as aspas externas com dois `replaceAll('"#$', '')` / `replaceAll('#$"', '')`. Permite injetar objeto JSON literal sem quebrar parser.
- `try/catch` engole erro — `console.error` apenas; continua.
- Substituição é **literal/textual** (sem AST). Convenção de nomenclatura `dParam0..N` ou `#dParamX` para evitar colisão acidental.

### [5] Parse

`JSON.parse(modelString)` puro. Erros: toast `warning('Ocorreu um erro ao processar os dados da pagina.')` + `console.log(exc)`. O `setModel(null)` no início do `getModel` mantém a página em branco; o usuário vê área vazia sem indicador de erro persistente.

### [6] Funções

`functionsArray = useRef(null)` — armazenado em ref, não em state (não re-renderiza). Passado por prop `genericFunctionsArray` para `<GenericPage/>` e cascateado para `<GenericForm/>` e demais sub-componentes que precisam executar funções nomeadas.

Execução acontece em `executeGenericFunctions(chaveFuncao, args, ...)` em `GenericPage.js:61-98`:

- Resolve `funcao = genericFunctionsArray.find(x => x.chaveFuncao === chave).valor` (código JS string).
- Para cada `arg` em `args`: `funcao.replaceAll('param' + idx, arg)`.
- `eval(funcao)` no escopo do `GenericPage` — escopo inclui (`console.log` no início da função lista tudo): `loggedUserData`, `userPreference`, `modelRef`, `useAclHook`, `useBlurHook`, `setCalendarCurrentFilter`, `cleanForm`, `getFormValues`, `danger`, `get`, `genericProps`, `_genericFunctionsArray`, `genericFunctionsArray`. **Esse escopo é API** — funções cadastradas em `acesso.TBfuncao_model` dependem dele.

### [8] Branch tabs vs page

Discriminador: **`model.pageTabs` existe e não é falsy**.

- `pageTabs: PageTabConfig[]` → cada item tem `genericPageTitle`, `functionKey` e o próprio objeto-model. `GenericTabPage` (`GenericTabPage.js:14-45`):
  - Lê ACL do `sessionStorage['@director/acl']` se `checkAcl=true`.
  - Encontra a config da página atual via `findPageConfig(model.functionKey, _acl)` (vide [[acl-papel-funcao-pagina]]).
  - Filtra `pageTabs` mantendo só as cuja `functionKey` está em `acl.children.route[].key`.
  - Cada tab vira `{ tabLabel, tabName, element: <GenericPage model={tabModel}/> }`.
  - Renderiza `<PageTabs tabList={...}/>`.
- caso contrário → `<GenericPage/>` único.

### [9] Tabela de dispatch (`<GenericPage>`)

Em `GenericPage.js:42-54`, o model é destruturado:

```
const { datagrid, datagrid2, filtro, genericform, buttons,
        genericcalendar, genericactionform, genericgridcollection,
        generictreeview, pipeliner } = model;
```

E o render é uma **série de condicionais por presença** (não exclusivos — combinam):

| Chave presente no model | Renderiza | Implementação | Feature manifest |
|---|---|---|---|
| `genericform.model` | `renderGenericForm()` (form completo, inline ou modal) | `<GenericForm/>` (`components/GenericForm/`) | F010 |
| `datagrid` **ou** `filtro` | `RenderGridPage({...})` (grid + filtro acoplados) | `<GenericGridPage/>` interno (`GenericPage/GenericGridPage.js`) → usa `<DataGrid/>` ou `<DataGrid2/>` | F011 |
| `datagrid2` | (mesmo branch acima — `datagrid2` é variante moderna de `datagrid` no mesmo `GenericGridPage`) | `<DataGrid2/>` (`components/DataGrid2/`) | F011 |
| `filtro` | painel de filtro acoplado ao grid (toggleável) | `<Filtro/>` (`components/Filtro/`) | F016 |
| `genericcalendar` | `renderGenericCalendar()` | `<GenericCalendar/>` (`components/GenericCalendar/`) | (não no manifest — sugerir nova feature) |
| `genericactionform` | `<GenericActionForm {...genericactionform}/>` | `GenericPage/GenericActionForm.js` | (não no manifest — sugerir nova feature) |
| `generictreeview` (sem `genericactionform`) | `<GenericTreeView {...generictreeview}/>` | `GenericPage/GenericTreeView.js` | F013 |
| `genericgridcollection` | `<GenericGridCollection {...genericgridcollection}/>` | `GenericPage/GenericGridCollection.js` | (não no manifest — sugerir nova feature) |
| `buttons.dropdownOptions` | menu dropdown no header da página | `<DropdownComponent/>` | sub-bloco de F021 |
| `buttons.pageButtons` | botões inline no header da página | tags `<button>` raw | sub-bloco de F021 |
| `genericform.formOnModal && !hideAddButton` | botão `+` para abrir form em modal | inline | sub-bloco de F010/F021 |
| `pipeliner` (truthy) | **modificador** — não renderiza nada por si só; é repassado ao `GenericForm` que muda o endpoint de submit para o Pipeliner (`/api/pipeliner/jobs` ou similar). Ver [[pipeliner-service]] | flag | F024-adjacent |
| `model.pageTabs` (no nível superior) | já interceptado em [8] — não chega aqui | `<GenericTabPage/>` | F014 |

> **Convivência**: as condicionais não são `else if`. Um model com `genericform` + `filtro` + `datagrid` (template `TemplateCadastro`) renderiza **os três** empilhados na ordem do `GenericPage.js:228-336`: header(título+botões) → genericform → grid → calendar → actionform → treeview → gridcollection. Layout vertical sequencial.

> **Discriminadores não-mutuamente-exclusivos** são a forma canônica do legado. Nada impede um model "form + grid + tree" coexistirem na mesma página — só requer cadastrar as três chaves.

## Templates seed do AppBuilder (universo declarado)

8 templates em `insert_template_pagina.sql` antecipam as combinações canônicas:

| Template (`DFchave`) | `DFvalor` (JSON com placeholders vazios) | Discriminadores |
|---|---|---|
| `TemplateCadastro` | `{ genericPageTitle, genericform{...crudForm,formOnModal,modalConfig,model:[]}, filtro{model:[]}, datagrid{api,headers,limits,isSelectable,gridActions} }` | genericform + filtro + datagrid (3-em-1) |
| `TemplateConsulta` | `{ genericPageTitle, filtro{model:[]}, datagrid{api,headers,limits} }` | filtro + datagrid |
| `TemplateFormulario` | `{ genericPageTitle, genericform{endpoint,model:[]} }` | genericform standalone |
| `TemplateFormularioAcoes` | `{ genericPageTitle, genericactionform{actionGroups:[]} }` | genericactionform |
| `TemplateGrids` | `{ genericPageTitle, genericgridcollection{filtro:{},grids:[]} }` | genericgridcollection |
| `TemplateIntegracao` | `{ genericPageTitle, pipeliner:true, genericform{endPoint:"/api/pipeliner/jobs",model:[]} }` | flag pipeliner + genericform |
| `TemplatePaginaAbas` | `{ genericPageTitle, pageTabs:[] }` | pageTabs (branch superior em [8]) |
| `TemplatePaginaArvore` | `{ genericPageTitle, generictreeview{tree:[]} }` | generictreeview |

São **templates de partida** (skeleton para cópia humana no AppBuilder), não enums fechados. O JSON real pode adicionar/combinar chaves livremente.

## Hooks de ciclo de vida

O legado **não tem** hooks declarativos (`onMount`, `beforeFetch`, etc.) no model. O comportamento ciclo-de-vida acontece por **convenções de chaves**:

| Momento | Mecanismo no legado | Origem |
|---|---|---|
| Pré-render (interpolação de contexto) | `modelParams` com `eval` no cliente | [[obter-model-pagina]] |
| Pós-fetch do model | `_updateModelRef(model)` no `useEffect` do `GenericPage` — armazena em context `GenericPageContext` para sub-componentes lerem | `GenericPage.js:209-212` |
| Pré-load de preferências | `_getUserPreferences()` se `!hidePreferenceButton` | `GenericPage.js:199-207`; persiste em `userPreference` do context |
| ACL gate em tabs | `GenericTabPage` filtra `pageTabs` por `aclTabs` | `GenericTabPage.js:21-31` |
| Fetch de dados do grid | `datagrid.api` → executado pelo `GenericGridPage` (não pelo engine) | `GenericGridPage.js` |
| Fetch de dados do form | `genericform.api` para popular, `genericform.endPoint` para submeter | `GenericForm` |
| Submit de form | botão default ou `buttons.pageButtons[].externalAction` | inline |
| Pós-delete | `setCurrentFilter()` (re-fetch grid) + `success(...)` toast | `GenericPage.js:145-164` |
| Funções customizadas | `executeGenericFunctions(chave, args)` chamado de qualquer ponto que tenha acesso ao `genericFunctionsArray` | dispatch via `funcoes` do model |

> Não há `onUnmount` / cleanup explícito. Em modo multi-aba ([[app-main]]), abas inativas ficam **montadas** (classe `d-none`), preservando estado — mas também mantendo timers/listeners. Risco conhecido.

## Como `funcoes` (eval JS) entram no fluxo

3 pontos de entrada para `eval` de código vindo do banco:

1. **`modelParams.valor`** ([4] acima) — eval de expressão que produz **dado** para substituir no JSON do model. Roda **uma vez por fetch** no escopo do `GenericPages`.
2. **`funcoes.valor`** ([6]+execução posterior) — eval de **trechos de comportamento** invocados via `executeGenericFunctions(chave, args)` no escopo do `GenericPage`. Roda **N vezes** durante o ciclo de vida da página, sob demanda. Substituição de `param0..N` por `replaceAll` antes do eval.
3. **`button.externalAction`** (inline no `pageButtons[]`) — ação direta de botão; aceita função JS, mas no fluxo cadastrado pelo AppBuilder geralmente referencia uma chave de `funcoes` via `useGenericFunction`.

> **Toda a segurança** depende de que `DFvalor` em `TBfuncao_model` e `TBmodel_parametro` só sejam editáveis por administradores autenticados via AppBuilder. RCE-by-design: quem escreve em `TBfuncao_model` executa JS arbitrário em todos os browsers dos usuários.

## Estado preservado entre fetches

`GenericPages.js:96-104` — `useEffect` com deps **vazias** `[]`. Significa: **uma vez por mount**. Mudar `path` sem desmontar não dispara novo fetch. Como cada aba é um mount independente ([[app-main]] §multi-tabs), e cada navegação para path novo cria aba nova, na prática é "1 fetch por aba". Refresh manual requer fechar e reabrir a aba.

## Cache

Nenhum. `POST /api/model` é executado a cada mount. Não há HTTP cache headers, não há cache em memória, não há SWR. O `setModel(null)` no início do `getModel` faz a área de conteúdo desaparecer durante a chamada (sem skeleton/blur).

## Relações com o ecossistema

- Consome de: [[obter-model-pagina]] (define a forma do payload e dos placeholders); [[acl-papel-funcao-pagina]] (filtro de tabs em `GenericTabPage`); [[menu-hierarquia]] (origem dos `route.path` que viram `caminho` na request).
- Despacha para: F010 (`<GenericForm/>`), F011 (`<DataGrid2/>`), F013 (`<GenericTreeView/>`), F014 (`<PageTabs/>`/`<GenericTabPage/>`), F016 (`<Filtro/>`), F021 (`<DropdownComponent/>` + botões), F024-adjacent (flag `pipeliner`).
- Despacha para componentes **fora do manifest atual** (a adicionar): `<GenericCalendar/>`, `<GenericActionForm/>`, `<GenericGridCollection/>`, `<GenericGridPage/>` (wrapper interno).
- É consumido por: [[app-main]] (via `<GenericPages api='/model'>` no branch `caso geral`).
- Sub-contratos a criar por chave: `model-valor-*` (um por discriminante — ver [[obter-model-pagina]] §"Sub-contratos").

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- **Dispatch é por presença, não por discriminador único**: o Studio não pode assumir um `type: "form" | "grid" | ...` no JSON. A forma canônica é composição livre de chaves, e a página pode renderizar 1, 2, 3+ blocos verticalmente. Decidir se o Studio aceita essa composição livre ou força um discriminador é decisão arquitetural — não há precedente no legado para "model só pode ter uma chave".
- **`pageTabs` é exclusivo**: o único discriminador real que troca o renderer raiz. Tudo mais acumula.
- **Layout é vertical, sem grid de áreas**: header → form → grid → calendar → actionform → treeview → gridcollection, na ordem do código. Sem slots nomeados, sem áreas reposicionáveis. Studio define se preserva essa ordem ou abstrai.
- **`eval` é central**: remover `eval` requer ou (a) transpilar `funcoes.valor` para handlers nomeados em build-time, ou (b) executar em sandbox (Worker/iframe), ou (c) reescrever o catálogo de funções inteiro como código TS de primeira-classe. Decisão da Studio. Migração precisa de **inventário completo** de `TBfuncao_model` por aplicação — escavação dedicada.
- **Sem error boundary específico**: parse falha → toast + área vazia. Studio define UX de erro de model.
- **Sem loading state visível**: `setModel(null)` esconde tudo; nenhum skeleton/spinner é montado pelo engine. Apps consumidores compensam (ou não) com `PageBlur` global.
- **Estado preservado por aba**: cada aba mantém model, formulário, scroll do grid, etc. Re-fetch só por close+reopen. Studio define se mantém essa semântica.
- **`additionalParams` é repassado opaco**: `<GenericPages additionalParams={route}/>` → `<GenericPage additionalParams={...}/>` → `<GenericGridPage additionalParams={...}/>`. Conteúdo é o objeto `route` inteiro do flat-list (path, key, name, icon, children, etc.). Sub-componentes usam ad-hoc.
- **`hidePreferenceButton`** default `true` — preferences do usuário são opt-in, raramente exercitadas. Studio decide se mantém.
- **Multi-form-on-modal**: `genericform.formOnModal=true` faz o form sair do fluxo vertical e abrir em modal disparado pelo botão `+`. Combinação canônica de cadastros.
- **`pipeliner` flag**: indicador de "este formulário grava via Pipeliner em vez do endpoint próprio". Mexe no comportamento do submit do `GenericForm`, não no render. Tratar como sub-contrato (`model-valor-pipeliner-flag.md`).

## Sources

- [[calendar/notes/2026-05-15.md]]
