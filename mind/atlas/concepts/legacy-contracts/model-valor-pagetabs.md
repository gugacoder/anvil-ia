---
title: "model-valor.pageTabs — renderer DFtipo=tabs (PageTabs / GenericTabPage)"
aliases: [model-valor-pagetabs, pagetabs-contract, generictabpage-contract, dftipo-tabs-renderer]
tags: [contract, legacy, react-tools, tabs, pagetabs, generictabpage, model-valor, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: renderer de abas (F014) — chave `pageTabs`

Sub-contrato do [[engine-schema-driven]] para o discriminante **`pageTabs`** em `acesso.TBmodel_pagina.DFvalor`. O legado usa o termo "DFtipo=tabs" no manifest, mas — assim como nos demais renderers — o dispatch real **não** consulta `TBpagina.DFtipo`: ele se decide **pela presença da chave `pageTabs` (array) no model**, antes de cair no `<GenericPage/>` clássico. Veja [[engine-schema-driven]] §"Dispatch por presença de chave".

## Citações de fonte

### Dispatch e shape

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPages/GenericPages.js:109-119` — bifurcação raiz do engine: `model.pageTabs ? <GenericTabPage model={...} checkAcl={checkAcl}/> : <GenericPage .../>`. **Toda página com `pageTabs` no model curto-circuita o `<GenericPage/>` normal — abas são tratadas no nível mais externo do engine, antes do dispatch interno por (`genericform`, `genericgrid`, `dashboard`, `generictreeview`, ...).**
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/1-alimentacao/insert_template_pagina.sql:18` — semente do template `TemplatePaginaAbas`: `{"genericPageTitle":"","pageTabs":[]}`. Confirma que o nó raiz do model carrega `genericPageTitle` (string) e `pageTabs` (array).

### Renderer interno

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericTabPage.js:1-62` — componente que monta a lista de abas. Importa `GenericPage` (recursão do engine), `PageTabs` (apresentação visual), `useAcl`, `useUtils`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericTabPage.js:14-45` — `useEffect([])` único: mapeia `model.pageTabs[]` para `tabList` no formato `{ tabLabel, tabName, element }`, e seta no estado interno via `setPageTabs(newTabList)`. **Roda apenas na montagem (deps `[]`); se `model.pageTabs` mudar depois, nada acontece.**
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericTabPage.js:26-31` e `:33-39` — para cada aba: `tabLabel = x.genericPageTitle`, `tabName = `tabPage${pageIndex}`` (índice posicional, **não estável** se a ordem mudar), `element = <GenericPage model={x}/>` — **a aba inteira é um sub-model do engine: qualquer template legítimo (form, grid, dashboard, tree, action-form, pipeliner) pode morar dentro de uma aba.**
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericTabPage.js:47-54` — render: `<div class="row px-3 py-1"><span class="h5">{model.genericPageTitle}</span></div>` no topo (título da página inteira, fora das abas) seguido de `<PageTabs tabList={_pageTabs}/>` apenas se `_pageTabs.length > 0`. **Se ACL filtrar todas as abas, o componente renderiza só o título e nada mais.**

### Apresentação visual

- `sources/engenharia--fabrica--javascript--react-tools/src/components/PageTabs/PageTabs.js:1-63` — componente puro de apresentação. Recebe `tabList` (PropTypes.array) e desenha `<ul class="nav nav-tabs border-0">` (Bootstrap) + `<div class="tab-content card">`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PageTabs/PageTabs.js:5-15` — estado local: `tabs` (cópia de `tabList`) e `activeTab` (string). No `useEffect([])`, **`activeTab` é inicializado com `tabList[0].tabName` (primeira aba) e nunca persiste** — sem URL, sem sessionStorage, sem prop controlada.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PageTabs/PageTabs.js:8-10` — `handleClickTab(param)` = `setActiveTab(param)`. Troca de aba é puro `useState` local; não há callback exposto, não há sincronia com router.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PageTabs/PageTabs.js:19-54` — **todos os painéis são renderizados sempre, simultaneamente**: o map produz uma `<li>` por aba e um `<div class="tab-pane fade">` por aba; o ativo recebe a classe extra `active show`, os demais ficam no DOM mas com `display:none` via Bootstrap (`.tab-pane:not(.show)`). **Não há lazy mount.** Os filhos (sub-`<GenericPage/>`) são montados na primeira render e permanecem montados — o estado é preservado entre trocas de aba **como efeito colateral**, não como decisão de design.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PageTabs/PageTabs.js:22-36` e `:40-52` — flag `doNotRender` (boolean) por aba: se `true`, **a aba é totalmente removida do DOM** (não esconde — não emite `<li>` nem `<div>`). Não há uso de `doNotRender` na população via `GenericTabPage` (sempre `false` implícito); a flag existe como hook genérico para consumidores diretos de `<PageTabs/>` (ex.: `UserPreferenceForm.js:72` usa).

### Filtragem por ACL

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericTabPage.js:19-31` — fluxo ACL quando `checkAcl === true`:
  1. Lê `sessionStorage['@director/acl']` (escrito por [[acesso-obter-rotas-aplicacao]]).
  2. `findPageConfig(model.functionKey, _acl)` — busca a entrada de ACL pelo `functionKey` da página-mãe ([[acl-papel-funcao-pagina]]).
  3. Extrai `_aclTabs = _pageConfig.children.route.map(x => x.key)` — **as abas permitidas são modeladas no ACL como sub-rotas da rota-mãe** (`children.route[]` é o mesmo formato hierárquico do [[menu-hierarquia]]).
  4. Filtra `model.pageTabs.filter(x => _aclTabs.includes(x.functionKey))` antes do map.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:5,77-87` — `findPageConfig` percorre `acl[].children.route[]` à procura de `modulePage.key === value`. Retorna `null` se não achar (e nesse caso `_pageConfig?.children?.route?.map(...)` produz `undefined`, e o `.filter` quebraria com `TypeError` se `_aclTabs` fosse `undefined` — protegido pelo `try/catch` em `:42-44` que apenas loga e deixa `_pageTabs=[]`, resultando em página vazia silenciosa).

## Estrutura

### Nó raiz do model (quando a página é "abas")

| Campo | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `genericPageTitle` | string | sim (pode ser `""`) | Título exibido **acima** da faixa de abas, sempre visível. | qualquer texto | `<span class="h5">` no topo de `<GenericTabPage/>`. | `TBmodel_pagina.DFvalor` |
| `pageTabs` | array de TabModel | sim | Conjunto de abas. **A presença desta chave é o discriminante do dispatch.** Pode vir vazio (`[]`), e nesse caso o engine ainda escolhe o caminho `<GenericTabPage/>` (renderiza só o título). | array de objetos TabModel | iterado por `GenericTabPage` em `:23-39`. | `TBmodel_pagina.DFvalor` |
| `functionKey` | string | só se `checkAcl=true` | Chave de função ACL da página-mãe (a página de abas em si). | mesmo formato de [[acl-papel-funcao-pagina]] (ex.: `acesso.usuarios`). | usado em `findPageConfig(model.functionKey, _acl)` para descobrir o conjunto de abas permitidas. | `TBmodel_pagina.DFvalor` (via configuração da página em `TBpagina`/`TBfuncao` — ver [[tbfuncao-model]]) |

### TabModel (cada item de `pageTabs[]`)

| Campo | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `genericPageTitle` | string | sim | **Rótulo da aba** (texto visível no `<a class="nav-link">`). Reaproveitado como `tabLabel` em `:27`. | qualquer texto | aparece no `<a>` da faixa de abas. | `pageTabs[i]` |
| `functionKey` | string | só se `checkAcl=true` na página-mãe | Chave de função ACL **da aba**. Usada pelo `filter` em `:24-25` contra `_aclTabs` derivado de `pageConfig.children.route[].key`. | mesmo formato de [[acl-papel-funcao-pagina]] | aba é incluída se e somente se `_aclTabs.includes(functionKey)`. **Aba sem `functionKey` é silenciosamente filtrada quando `checkAcl=true`** (porque `undefined ∉ _aclTabs`). | `pageTabs[i]` |
| `genericform` / `genericgrid` / `genericactionform` / `dashboard` / `generictreeview` / `pipeliner` / ... | qualquer | conforme template da aba | **O conteúdo da aba é um sub-model do engine.** Qualquer chave de dispatch reconhecida por [[engine-schema-driven]] pode estar aqui — porque a aba renderiza `<GenericPage model={x}/>` (`:30`), reentrando no engine. | conforme o sub-contrato do template (ex.: [[model-valor-genericform]], [[model-valor-datagrid]], [[model-valor-generictreeview]], [[model-valor-dashboard]]). | despachado pelo `<GenericPage/>` interno. | `pageTabs[i]` |
| (qualquer outra chave) | — | — | Demais campos do TabModel atravessam intactos para o `<GenericPage/>` interno; o engine consulta apenas os discriminantes que reconhece. | — | sem efeito se não for chave conhecida. | `pageTabs[i]` |

> **`tabName` é gerado pelo wrapper, não vem do model.** `GenericTabPage` injeta ``tabName: `tabPage${pageIndex}` `` (`:28`, `:36`) — o identificador de aba é puramente posicional. Renomear/reordenar abas no `DFvalor` muda os `tabName` de todos os pares afetados.

## Comportamento observado

### Lazy load por aba

**Não existe.** Todas as abas (todos os sub-`<GenericPage/>`) montam de uma vez na primeira renderização de `<PageTabs/>` (`PageTabs.js:39-52` — `tabs?.map` produz `<div class="tab-pane">` para cada item, independente de `activeTab`). O CSS Bootstrap esconde os inativos via `display:none`; React mantém todos montados.

Consequências:
- Carga inicial da página = soma das cargas de todas as abas (todos os sub-modelos disparam suas requisições no `useEffect` próprio assim que montam).
- Estado interno dos sub-componentes (formulário preenchido, paginação de grid, scroll, filtros) **é preservado entre trocas de aba** — mas como efeito de não-desmontagem, não como decisão deliberada.
- Em abas pesadas (ex.: dashboard com KPIs polling — [[model-valor-dashboard]]), o polling roda **em paralelo nas abas escondidas** porque `document.hidden` continua `false` (o documento inteiro está visível; quem está escondido é o painel). Possível ressalva para o Studio.

### Estado preservado entre trocas

Sim, **por dois motivos cumulativos**:
1. `<PageTabs/>` mantém todos os `<GenericPage/>` filhos montados (acima).
2. A troca de aba mexe **apenas em CSS class** (`active show`), não remonta a árvore.

Logo, qualquer `useState` interno (form fields, grid pageSize/filters, expanded rows) sobrevive trocas de aba dentro da mesma sessão de página.

### Persistência da aba ativa

**Não há.** `activeTab` é puro `useState` local em `<PageTabs/>` (`:5-6`), inicializado em `useEffect([])` com `tabList[0].tabName` (`:13`). Não é lido da URL, do hash, do query-string, nem do `sessionStorage`/`localStorage`. **Recarregar a página sempre volta para a primeira aba.** Navegar para fora e voltar idem.

### Mudança de `model.pageTabs` em tempo de execução

O `useEffect` de `GenericTabPage` (`:14-45`) tem `deps=[]`, então **só executa uma vez**. Se o pai mudar o `model` (improvável no fluxo do legado, mas teoricamente possível), as abas não são recomputadas. O `useEffect` de `PageTabs` (`:12-15`) também tem `deps=[]`: nunca relê `tabList` depois do mount, e por isso `tabs` (estado interno) só recebe `setTabs(tabList)` uma vez. **Mudanças subsequentes em `tabList` aparecem na faixa de abas pelo render direto de `tabs?.map`? Não — porque `tabs` veio do `useState`, e o `useEffect` não atualiza nas mudanças seguintes. Os `<li>` e `<div>` ficam congelados na primeira leitura.**

### Erro silencioso

O `try/catch` em `GenericTabPage.js:42-44` engole qualquer exceção do bloco ACL/map e apenas faz `console.log`. Consequência: ACL malformado, `functionKey` ausente, falha de `JSON.parse` do sessionStorage — qualquer um leva à página em branco com erro só no console.

### Permissões por aba (relação com F008 ACL)

- A semântica da filtragem está descrita em **§"Filtragem por ACL"** acima. Pontos práticos:
- Aba é incluída **se e somente se** seu `functionKey` aparece em `pageConfig.children.route[].key` do ACL ([[acl-papel-funcao-pagina]]).
- A página-mãe (`<GenericTabPage/>`) precisa ela mesma estar no ACL — caso contrário `findPageConfig` retorna `null` e o try/catch protege, mas o usuário cai em página vazia (geralmente o gate de rota já o impediu antes — [[acesso-obter-rotas-aplicacao]]).
- O `checkAcl` é uma **prop da raiz** `<GenericPages/>` (passada para `<GenericTabPage/>` em `GenericPages.js:110`). Não é decidido pelo model — é decidido pelo consumidor (`PortalDirector.Website` passa `checkAcl=true` para páginas de admin/acesso, `checkAcl=false` ou ausente para páginas operacionais). Verificar caso a caso na chamada.
- **Não há permissões de "somente leitura por aba"**: ACL nesta camada é binário (aba aparece ou não). Permissões finas (read/write/delete) vivem dentro dos sub-models (ex.: actionGroups no genericactionform — ver [[model-valor-genericform]]).

## Sub-contratos relevantes

Como o conteúdo de cada aba é qualquer template do engine, **todos os outros sub-contratos de model-valor podem ser sub-contratos desta página**:

- [[model-valor-genericform]] — aba que é formulário.
- [[model-valor-datagrid]] — aba que é grid.
- [[model-valor-dashboard]] — aba que é dashboard.
- [[model-valor-generictreeview]] — aba que é árvore.
- [[engine-schema-driven]] — dispatch geral que ocorre dentro de cada aba.

Reciprocamente, qualquer um desses contratos pode aparecer **dentro** de uma `pageTabs[i]`.

## Relações com o ecossistema

- Consome de: [[engine-schema-driven]] (este é um sub-renderer dispatched por presença de chave); [[acl-papel-funcao-pagina]] (filtragem por `functionKey`); [[acesso-obter-rotas-aplicacao]] (origem do `sessionStorage['@director/acl']`).
- É consumido por: `<GenericPages/>` raiz do engine (bifurcação `model.pageTabs ? <GenericTabPage/> : <GenericPage/>`).
- Recursão: cada aba reentra no engine via `<GenericPage model={x}/>` — qualquer template legítimo é válido dentro de uma aba, **incluindo outra página com `pageTabs`** (abas-dentro-de-abas — não exemplificado no template seed, mas o código não impede).
- Procedure que entrega o model: [[obter-model-pagina]] (`acesso.obter_model_pagina`) — entrega o `DFvalor` cru de `TBmodel_pagina`.

## Notas de implementação para o Studio

(curtas — só comportamento observado, não prescrição de stack)

- O estado de **aba ativa não persiste** no legado. Decisão do Studio: replicar (sempre primeira aba ao entrar) ou evoluir (URL/hash/storage). Curator decide.
- Todas as abas montam ao mesmo tempo: replicar exato implica em **carregar todos os sub-modelos antecipadamente**, com custo proporcional. Lazy mount é evolução comum, mas **muda comportamento observável** (estado dos sub-modelos não preexiste à primeira visita da aba). Curator decide.
- `tabName` posicional (`tabPage${i}`) é fragil para deep-link — se o Studio quiser deep-link por aba, usar `functionKey` (estável) como ID, não o índice.
- Erro silencioso do try/catch em `GenericTabPage` é defeito conhecido — sub-modelos malformados deixam a página em branco. Studio pode optar por mostrar o erro.
- **Polling em abas escondidas continua rodando no legado** (dashboards com auto-refresh em todas as abas, mesmo invisível). Replicar exato = mesmo custo de rede; otimizar = pausar polling em abas inativas (mudança comportamental).
- Quando `model.pageTabs` existe **e** outras chaves de dispatch também (`genericform`, `genericgrid`, etc.) coexistem **no mesmo nó raiz**, **o legado escolhe sempre o caminho de abas** (bifurcação em `GenericPages.js:109` é a primeira); as outras chaves do nó raiz são ignoradas. Sub-models válidos vão **dentro** de cada `pageTabs[i]`, não no irmão.

## Pontos abertos / follow-ups para o time

(registros de ambiguidade — não inferi nada nestes; quem precisar deve aprofundar)

1. **`pageTabs` aninhado (abas-dentro-de-abas):** o código permite, o template seed não exemplifica. Não encontrei uso real no `appbuilder` seed. Eventual feature de catálogo. Sugiro F-pagetabs-nested no backlog do archaeologist.
2. **Comportamento quando `pageTabs[]` está vazio:** o engine cai no caminho `<GenericTabPage/>`, que renderiza só `<span class="h5">{title}</span>` e nada de `<PageTabs/>` (`:52`). Página visualmente vazia. É design (placeholder enquanto admin preenche) ou bug? Não dá para saber pela fonte.
3. **`doNotRender` em `<PageTabs/>` vinda direto (não via `<GenericTabPage/>`):** `UserPreferenceForm.js:72` usa. Fluxo paralelo que não envolve model do engine. Fora do escopo de F014 stricto, mas o componente `<PageTabs/>` é o mesmo — Studio precisa decidir se o renderer novo aceita também esse caso de uso ou se as preferências viram outro componente.
4. **Race no setActiveTab quando `tabList` chega vazio na primeira render:** `useEffect([])` em `PageTabs.js:13` faz `tabList[0]?.tabName ?? ''` — se as abas entram depois (ex.: ACL async), `activeTab` fica `''` e nenhuma aba ativa visualmente. No `GenericTabPage` atual isso não acontece (`setPageTabs` síncrono no `useEffect`), mas o `<PageTabs/>` exposto é frágil para consumidores assíncronos.

## Sources

- [[calendar/notes/2026-05-15.md]]
