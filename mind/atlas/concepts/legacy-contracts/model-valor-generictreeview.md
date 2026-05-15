---
title: "model-valor.generictreeview / SearchTree — duas árvores distintas no legado"
aliases: [model-valor-generictreeview, generictreeview-model, searchtree-contract, tree-renderer-contract]
tags: [contract, legacy, react-tools, tree, searchtree, generictreeview, model-valor, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: árvore-renderer no legado (F013) — `generictreeview` vs `SearchTree`

Sub-contrato do [[engine-schema-driven]] para o discriminante `generictreeview` em `acesso.TBmodel_pagina.DFvalor`. Cataloga **duas árvores conceitualmente distintas** que o time precisa não confundir:

1. **`generictreeview`** — nó de model que faz **navegação multi-página em árvore** (sidebar de árvore + área principal que renderiza um sub-`model` quando a folha tem `model:{...}`). Despachado por [[engine-schema-driven]] §"Tabela de dispatch": `generictreeview && !genericactionform → <GenericTreeView {...generictreeview}/>` (vide `GenericPage.js:325-329`). É o **renderer de `DFtipo=tree`** que F013 cobre.
2. **`<SearchTree/>`** — componente **independente** exposto no public API do pacote `react-tools` (`src/index.js:77`). Faz uma **árvore checkable com busca**, baseado em `rc-tree`. **Não é despachado pelo engine** — é importado direto por apps específicos (encontrado em uso no PortalDirector.Website, módulo de Acessos/Usuarios, dentro de Modal para escolher recursos ACL). Não tem chave de model associada.

> O usuário pediu o contrato sob o título `model-valor-generictreeview`. Os dois componentes vivem ao lado e o briefing menciona ambos ("DFtipo=tree (SearchTree)"). Resolvo cobrindo os dois aqui — `generictreeview` é o caminho do engine (relevante para F013 strict), `SearchTree` é uma primitiva de UX que apps consomem direto e que o Studio precisará oferecer também (provavelmente como widget de form/modal, não como renderer de página). Manter o contrato unificado evita o team confundir os dois.

## Citações de fonte

### `generictreeview` (renderer engine)

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:325-329` — despacho: `generictreeview !== undefined && (genericactionform || <GenericTreeView {...generictreeview}/>)`. Atenção: **se ambos `genericactionform` e `generictreeview` estiverem no model, o engine renderiza só o action-form** (curto-circuito do `||`). Bug ou design intencional, não documentado.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:138-150` — destruturação: `{ generictreeview, pipeliner, ... } = model`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericTreeView.js:5-152` — implementação completa do componente: makeTree (atribui `id=path/idx`), findNode (caminhada por `id`), handleTree (toggle isOpen ou setPage), filterList (visibility por substring case-insensitive), renderList (recursão), render principal divide em 2 colunas (col-md-3 árvore + col-md-9 `<GenericPage>` aninhado).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericTreeView.js:79-124` — render do nó: ícone (default `cil-file`), título, caret de expansão (90deg ↔ -90deg), classe `active` quando `id === page?.id`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericTreeView.js:143-148` — `<GenericPage key={key} title={page.model?.genericPageTitle} model={page.model}/>` — recursão do engine na área principal. `key={Math.random()}` força remontagem a cada troca de página (perde estado).
- `sources/engenharia--fabrica--javascript--react-tools/example/src/routes/TemplateTreeView.js:499-589` — exemplo canônico (sample): `tree[]` com `{title, model, tree:[{title, tree:[]}]}`. Demonstra:
  - nó folha pode ter `model` (sub-model do engine — qualquer template válido).
  - nó interno tem `tree:[]` (mesmo formato recursivo).
  - profundidade arbitrária no sample (3 níveis).
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/1-alimentacao/insert_template_pagina.sql:19` — template canônico no DB: `('Página de árvore', 'TemplatePaginaArvore', '{"genericPageTitle":"","generictreeview":{"tree":[]}}')`. Forma raiz do template = bundle `generictreeview.tree=[]`.
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/components/GenericPageConfig/TreePageConfig.jsx:7-347` — editor visual de árvore no AppBuilder. Operações: addNode (cria `{id, title, icon, tree:[]}`), removeNode (rejeita se filho existe), changeTitle (rejeita duplicados case-insensitive), onTemplateChange (define `node.model = JSON.parse(template.template)` e `node.template = <chave>`). Filtra templates `TemplatePaginaAbas` e `TemplatePaginaArvore` da lista (impede aninhar árvore-de-árvore e árvore-de-abas — limite de design). `cleanNode` (`:217-224`) é o serializer canônico: preserva só `{title, model, template, icon, tree}` — IDs e `isOpen` ficam fora do JSON persistido.
- `sources/engenharia--fabrica--javascript--react-tools/src/index.js` — `GenericTreeView` **não** é exportado no public API; é interno do `<GenericPage>`. Só `SearchTree` é exportado.
- `sources/engenharia--fabrica--javascript--react-tools/src/css/react-tools.css` e `src/index.css` — sem regras específicas de `.generictreeview`; árvore reusa classes Bootstrap/CoreUI (`c-sidebar-nav-link`, `card`, `list-group-item`).

### `SearchTree` (componente standalone, public API)

- `sources/engenharia--fabrica--javascript--react-tools/src/components/SearchTree/SearchTree.js:1-173` — implementação. Baseado em `rc-tree` (npm `rc-tree`). PropTypes: `placeholder`, `title`, `options` (`array`), `onChange(checkedKeys)`, `onSave(checkedKeys)`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/SearchTree/SearchTree.js:6-53` — `useSearchTree(options)`: faz `flatList` para busca em árvore aplanada; `preCheckedList` extrai nós com `checked:true` recursivamente; `getExpandedKeys(value)` calcula chaves a expandir para revelar matches de busca (sobe pelos pais via `getParentKey`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/SearchTree/SearchTree.js:71-83` — handleChange: só dispara expansão se `value.length >= 2` (limiar de busca).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/SearchTree/SearchTree.js:100-121` — `filter()`: hack de DOM direto — manipula `document.getElementsByClassName(child.title)` para `style.display='block'|'none'`. **Não filtra a árvore na fonte de dados**, esconde via CSS pelo title. Implica: títulos viram seletores de classe (fragilidade óbvia: títulos com caracteres especiais, espaços etc. quebram). Só funciona em **um nível abaixo do root** (`data[].children[]`), não recursivamente.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/SearchTree/SearchTree.js:123-162` — render: `<input>` de busca → `<Tree checkable selectable={false} ...>` (rc-tree) → 2 botões (`Limpar` + `Salvar`). `onCheck` dispara `onChange(checkedKeys)`. `onSave` é externo — só dispara quando usuário clica Salvar.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/SearchTree/SearchTreeIcons.js:1-31` — `SwitcherIcon`: SVG da seta de expandir (`isLeaf` retorna `false` → rc-tree esconde switcher para folhas).
- `sources/engenharia--fabrica--javascript--react-tools/src/index.js:77` — `export { default as SearchTree } from './components/SearchTree/SearchTree';` — **public API do pacote**.
- `sources/engenharia--fabrica--javascript--react-tools/src/css/rc-tree.css` — estilos do rc-tree (existência do arquivo confirma dep, conteúdo não relevante ao contrato).
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/routes/Acessos/Usuarios/components/ModalRecursos.jsx:1-43` — **consumidor real**: importa `SearchTree` de `@engenharia/react-tools` e renderiza dentro de `<Modal>` para escolher recursos (módulos/páginas/funções) de um usuário. Passa props **fora do PropTypes**: `ref`, `hideSaveButton`, `value`. Indica que o consumer espera um SearchTree com suporte a esses props — discrepância vs `react-tools` HEAD: ou o consumer está em versão antiga, ou os props são ignorados/silenciosamente OK. > inferido: drift entre versão publicada e fonte HEAD.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/routes/Acessos/Usuarios/Alterar.jsx:273-309` — **construção da árvore de entrada**: 3 níveis (módulo → página → função), cada nó tem `{key, value, title, checked, children:[...]}`. Marca `checked:true` nos nós cuja `key` está em `state.recursos` (estado pré-existente do usuário). Renderiza dentro do `<ModalRecursos>`.

## Estrutura A — `generictreeview` (renderer engine)

Forma canônica do nó no `DFvalor`:

```
"generictreeview": {
  "tree": TreeNode[]
}
```

### Nó raiz

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `tree` | `TreeNode[]` | sim | Lista de raízes da árvore | array (pode ser vazia — template `TemplatePaginaArvore`) | `<GenericTreeView tree={tree}/>` itera recursivamente | model |

### `TreeNode` (recursivo)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `title` | string | sim | Label exibido no nó | livre (validação `TreePageConfig`: max 100 chars, único entre irmãos case-insensitive) | render do botão `<button>{title}</button>`; também usado em filter (substring case-insensitive) | model |
| `tree` | `TreeNode[]` | sim | Filhos do nó (vazio se folha estrutural) | array | recursão de render; presença de filhos define o caret de expansão | model |
| `model` | object | não | Sub-model do engine renderizado na área principal quando o nó é clicado | qualquer model válido (form, grid, dashboard, action-form, etc. — vide [[engine-schema-driven]]); **não pode ser outro `generictreeview` nem `pageTabs`** (filtro do `TreePageConfig.jsx:16`) | clique em nó com `model` → `setPage(node)` → renderiza `<GenericPage model={page.model}/>` no col-md-9 | model |
| `template` | string | não | Nome do template-pai do `model` (audit trail) | chave em `appbuilder.TBtemplate_pagina.DFchave` (ex. `TemplateCadastro`, `TemplateConsulta`, `TemplateGrids`, `TemplateIntegracao`) | usado pelo `<TreePageConfig>` para dropdown de "trocar template"; **runtime ignora** (não muda render) | model |
| `icon` | string | não (default `cil-file`) | Classe CSS do ícone CoreUI | qualquer `cil-*` | `<i class="${icon || 'cil-file'} mr-2 lg"/>` no botão do nó | model |
| `id` | string | não no JSON; **derivado** | Path posicional gerado pelo `makeTree` (`'0'`, `'0/1'`, `'0/1/2'`) | índices separados por `/` | usado p/ `findNode(list, id)` em handleTree/loadPage; **não persistido** | runtime |
| `isOpen` | boolean | não no JSON; **estado** | Indica se o nó está expandido | runtime | toggle por `handleTree(id)`; perde no remount | runtime |
| `visible` | boolean | não no JSON; **estado** | Resultado do filtro de busca | runtime | esconde nó se `false` em `renderList`; `true` quando título contém substring OU algum descendente é visível | runtime |

> O `cleanNode` do `TreePageConfig.jsx:217-224` é o serializer autoritativo do que persiste: `{title, model, template, icon, tree}`. Tudo o mais é estado.

### Comportamento ao clicar

- Clique no **caret** (`handleTree`): toggla `isOpen` (sem fechar siblings — múltiplos abertos simultaneamente OK).
- Clique no **botão do nó** (`loadPage`): se `model` presente → `setPage(node)` (carrega no col-md-9); se ausente → toggla `isOpen` como fallback. Implica: **um nó pode ser página E pasta ao mesmo tempo** — clicar nele tanto abre filhos quanto carrega a página.
- Clique em outro nó com `model` → `setPage(novoNode)` → `setKey(Math.random())` no useEffect → `<GenericPage>` remonta totalmente. Estado do form/grid anterior é descartado.

### Busca / filtro

- Input `<input>` no topo (texto livre).
- Filtro client-side por **substring case-insensitive** em `title`, **recursivo** (`filterList` em `GenericTreeView.js:59-69`).
- Lógica: um nó é visível se o próprio título contém o termo **OU** algum descendente é visível. Recursão pós-ordem.
- Não há limiar mínimo (digita 1 char → já filtra). Diferente do `SearchTree` (que tem limiar de 2 chars).
- **Não toca isOpen/expandedKeys** — só altera `visible`. Se o match está num nó dobrado, o usuário não vê (precisa expandir manualmente). > débito de UX vs `SearchTree`.

### Layout

```
+-----------------+---------------------------+
| col-md-3        | col-md-9                  |
|                 |                           |
| [filtro input]  |  <GenericPage model={...}/>|
|                 |                           |
| ▼ Nó 1          |  (form, grid, etc.)       |
|   • Nó 1.1      |                           |
|   ▼ Nó 1.2      |                           |
|     • Nó 1.2.1  |                           |
| ▶ Nó 2          |                           |
+-----------------+---------------------------+
```

Bootstrap grid 3/9. Sem responsividade explícita — em mobile vira stack (col-md-* colapsa em <768px).

### Estado e persistência

- **Não persistido**: árvore aberta/fechada, página corrente, filtro, seleção. Tudo zera ao recarregar.
- **Sem deep-link**: não há prop/`additionalParams` para abrir um nó específico via URL. > inferido: F022 (deep-link) precisaria ler de `additionalParams` e simular cliques sequenciais.

### Endpoints

- **`<GenericTreeView>` em si não tem endpoint**. A árvore é **estática no model** (vem com o `DFvalor` da página, lido por [[obter-model-pagina]]).
- Endpoints aparecem **dentro dos sub-models** (`node.model.genericform.api`, `node.model.datagrid.api`, etc.) — herdados de cada sub-renderer ([[model-valor-genericform]], [[model-valor-datagrid]]).
- **Sem paginação** da árvore (tudo carregado no model). **Sem lazy-load** (toda a árvore vem do JSON). > implicação: árvores grandes inflam o `DFvalor` da página inteira. Models de produção típicos têm dezenas de nós, não milhares.

### Limites observados

- Aninhamento de `generictreeview` dentro de `generictreeview` é **bloqueado no editor** (`TreePageConfig.jsx:16` filtra `TemplatePaginaArvore` da lista de templates atribuíveis a um nó). Runtime não bloqueia, mas o caminho `→` editor visual não permite.
- Aninhamento de `pageTabs` (F014) também bloqueado no mesmo filtro. Outras combinações livres.
- `TreePageConfig` rejeita títulos duplicados entre irmãos (case-insensitive) com `warning('Título "X" já existe')`.
- Renderer não tem limite explícito de profundidade. Bootstrap usa `ml-4` por nível — visualmente quebra > ~10 níveis.

## Estrutura B — `<SearchTree/>` (componente standalone)

Forma esperada de `options`:

```
options: TreeOption[]

TreeOption = {
  key: string,                // PK no rc-tree (única na árvore inteira)
  title: string,              // label exibido
  checked: boolean,           // se vem pré-marcado (lido pelo preCheckedList)
  children: TreeOption[]      // filhos (rc-tree espera `children`, não `tree`)
}
```

> Atenção à divergência: `generictreeview` usa **`tree`** para filhos; `SearchTree` usa **`children`** (convenção do rc-tree). São contratos diferentes — modelos não são intercambiáveis.

### Props do `<SearchTree/>`

| Prop | Tipo | Obrigatório | Semântica | Default | Efeito |
|---|---|---|---|---|---|
| `placeholder` | string | não | Placeholder do input de busca | `'Procurar'` | atributo do `<input>` |
| `title` | string | não | Cabeçalho `<h5>` acima do input | undefined | render condicional |
| `options` | `TreeOption[]` | sim (default `[]`) | Dados da árvore | `[]` | drive de tudo |
| `onChange` | `(checkedKeys: string[]) => void` | não | Callback em **cada** check/uncheck | undefined | dispara em `handleCheck` e em `handleClear` (`[]`) |
| `onSave` | `(checkedKeys: string[]) => void` | não | Callback do botão "Salvar" | undefined | dispara apenas no clique manual |

### Props observados em consumers **fora do PropTypes**

| Prop | Onde aparece | Provável semântica |
|---|---|---|
| `ref` | `ModalRecursos.jsx:30` | forward de ref — > inferido: versão pré-fork tinha `forwardRef`; HEAD não. |
| `hideSaveButton` | `ModalRecursos.jsx:32` | esconder botão "Salvar" quando o save é externo (modal tem próprio `onConfirm`) — > inferido: HEAD ignora. |
| `value` | `ModalRecursos.jsx:33` | controle externo de `checkedKeys` — > inferido: HEAD usa só `preCheckedList` interno; `value` ignorado. |

> Implica: o `<SearchTree>` em uso no Director Portal não é exatamente o que está no HEAD do `react-tools` — há drift. Studio precisa decidir qual contrato adotar (HEAD com PropTypes ou efetivo do consumer com 3 props extras). Resposta canônica: **adotar o contrato do consumer** (`value` controlado + `hideSaveButton` + `ref`) porque é o que está em produção.

### Comportamento

- Renderiza um **input de busca** (form-control) + `<Tree checkable selectable={false}>` (rc-tree) + 2 botões (Limpar/Salvar) em `<div class="card">`.
- **Limiar de busca**: só dispara expansão quando `value.length >= 2`. Abaixo, só atualiza o campo (não filtra/expande).
- **Filtro**: hack de DOM direto manipula `style.display` via `document.getElementsByClassName(child.title)`. Funciona só em **2 níveis** (`data[].children[]`), não recursivo. Frágil: títulos com caracteres especiais quebram seletor de classe.
- **Expansão automática**: quando busca casa, expande pais via `getParentKey` (sobe pelo `key`). Pais ficam expandidos enquanto `autoExpandParent: true` — desliga ao usuário expandir/colapsar manualmente.
- **Seleção**: `rc-tree checkable` → cascade automático filho→pai e pai→filho (default rc-tree). `selectable={false}` desliga seleção (só checkbox importa).
- **Pré-seleção**: `preCheckedList` no useState — lê todos os nós com `checked:true` recursivamente. Após mount, `checkedKeys` é estado interno.
- **Limpar**: `handleClear` zera busca, expansão e `checkedKeys[]`. Dispara `onChange([])`.
- **Salvar**: clique no botão dispara `onSave(checkedKeys)` (consumer recebe lista de PKs marcadas).
- **Sem drag-and-drop**: rc-tree suporta `draggable`, mas SearchTree não habilita.
- **Sem multi-select por shift/range**: só checkbox.
- **Sem lazy-load**: rc-tree suporta `loadData`, mas SearchTree não usa. Toda a árvore vem em `options` síncrono.

### Endpoints

- **Nenhum**. SearchTree é puramente apresentação. Caller é responsável por fetch (no caso do `Alterar.jsx`, vem de `/api/acesso/recursos` ou similar — fora do escopo deste contrato; sub-contrato a criar se necessário).

## Diferenças críticas entre A e B (resumo)

| Aspecto | `generictreeview` (A) | `<SearchTree/>` (B) |
|---|---|---|
| Despacho | engine via `GenericPage.js` | import direto do `react-tools` |
| Chave filhos | `tree[]` | `children[]` |
| Identificador de nó | `id` derivado (path posicional) | `key` explícito no model |
| Função primária | navegação multi-página (sidebar) | seleção checkable (multi-select) |
| Checkbox | não tem | sim (cascade pai↔filho) |
| Busca | substring recursiva, limiar 0 | substring 1-nível, limiar 2 chars |
| Side-by-side com conteúdo | sim (col-md-3 + col-md-9 GenericPage) | não (componente isolado) |
| Persistência de seleção | n/a (não tem seleção) | só em memória; consumer salva via `onSave` |
| Suporte legado em consumer | usado por F013 (DFtipo=tree) | usado em modais específicos (ACL de usuário, possivelmente outros) |
| Dep externa | nenhuma (DOM puro + CoreUI) | `rc-tree` (npm) |
| Public API do `react-tools` | não (interno) | sim (`SearchTree` exportado) |

## Padrões legacy observados

- **Folder/leaf**: distinção implícita em `generictreeview` (folha = sem `tree` ou `tree:[]`; pasta = `tree.length>0`). Em `SearchTree` é distinção do rc-tree (folha = sem `children`).
- **Multi-select**: só em `SearchTree`. `generictreeview` é navigation-only (1 página ativa por vez).
- **Drag-and-drop**: nenhum dos dois habilita. Editor (`TreePageConfig`) também não — usuário recria nós para reordenar (débito conhecido). > inferido: reorder é débito.
- **Lazy-load**: nenhum dos dois.
- **Persistência de estado da UI**: nenhum dos dois preserva expansão/seleção entre mounts.

## Relações com o ecossistema

- Consome de: [[engine-schema-driven]] (dispatch de `generictreeview` em `GenericPage.js`); [[obter-model-pagina]] (origem do JSON do model que contém `generictreeview`); [[tbmodel-pagina]] (armazenamento do `DFvalor`).
- É consumido por: F013 (renderer DFtipo=tree). `SearchTree` é consumido fora do engine (ACL de usuário em `PortalDirector.Website/src/routes/Acessos/Usuarios`).
- Acopla:
  - **Sub-models recursivos**: cada `node.model` pode ser qualquer template — `<GenericTreeView>` re-instancia `<GenericPage>` recursivamente. Implicação: todos os contratos de model ([[model-valor-genericform]], [[model-valor-datagrid]], [[model-valor-dashboard]], action-form, calendar, etc.) podem aparecer **aninhados sob um nó de árvore**. A árvore é só um caminho de navegação.
  - **Templates**: `TemplatePaginaArvore` no `appbuilder.TBtemplate_pagina` é o seed; runtime aceita `generictreeview` em qualquer model, mas o editor visual só permite criar via esse template.
  - **Editor visual**: `TreePageConfig.jsx` no AppBuilder (sub-contrato a criar se F-tree-editor virar feature).
- Sub-contratos a criar:
  - **`recursos-acesso-tree-shape`** — schema da árvore de recursos ACL que o `ModalRecursos.jsx` consome (módulo → página → função). > inferido: vem de uma proc tipo `obter_recursos_aplicacao` ou similar — escavar quando F-acessos-usuario virar feature.
  - **`rc-tree-public-api-drift`** — catalogar exatamente quais props o SearchTree em produção tem (`ref`, `hideSaveButton`, `value`), olhando a versão publicada do `@engenharia/react-tools` (npm) vs o HEAD do monorepo. > TBD: precisa abrir o pacote publicado.

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- **Dois contratos distintos. Não unificar prematuramente.** `generictreeview` é renderer de página (sidebar+conteúdo); `SearchTree` é widget de seleção multi-check. Studio pode até implementar ambos com a mesma primitiva interna, mas a **superfície de model** é diferente (chave `tree` vs `children`, presença de checkboxes, divisão de tela).
- **Chave de filhos: `tree` no engine, `children` no SearchTree.** Manter compatibilidade significa **respeitar ambas**. Unificar para uma só quebra models existentes.
- **`generictreeview` é puramente static-tree no model** — sem lazy-load, sem fetch. Studio decide se quer manter (simples, mas limita escala) ou introduzir lazy.
- **`node.model` é recursão do engine inteira** — qualquer template aninhado. Implica: o renderer de árvore não pode fazer nenhuma suposição sobre o que vai pintar à direita. Plug-in pattern.
- **Caret-toggle vs node-click**: hoje, clicar no nó com `model` carrega a página E NÃO expande filhos (só o caret expande). Clicar em nó sem `model` toggla expansão como fallback. Studio decide se mantém essa dupla-modalidade ou separa (ex. nó sempre toggla + ícone separado de "abrir página").
- **`<GenericPage key={Math.random()}/>`** força remontagem total a cada troca de nó — descarta estado do form/grid anterior. Comportamento canônico do legado. Studio decide se preserva (estável) ou cacheia (UX melhor).
- **Filtro do `generictreeview` esconde mas não expande matches**: usuário precisa expandir manualmente — diferente do `SearchTree`, que **auto-expande** pais dos matches. Studio pode harmonizar.
- **`SearchTree.filter()` é hack de DOM** (`getElementsByClassName(title)`) — frágil, não-recursivo, expõe títulos como seletores CSS. Reimplementar com state-driven filter no Studio é trivial e seguro.
- **Sem reorder/drag**: nem o renderer nem o editor permitem reordenar nós sem deletar/recriar. Studio pode oferecer drag desde o início.
- **`hideSaveButton` no SearchTree** indica padrão **embed-em-modal** (modal externo orquestra save). Studio precisa suportar uso embarcado e standalone do widget de árvore-checkable.
- **`value` controlado em SearchTree** (não no HEAD do react-tools mas presente no consumer) é o padrão React moderno. Studio deve adotar (controlado), evitando `preCheckedList` derivado de `options` (que é fonte dupla de verdade).
- **Aninhamento `generictreeview` em `generictreeview`** é bloqueado no editor mas não no runtime. Studio decide se bloqueia explicitamente (recomendado — UX colapsa rápido) ou só desencoraja.
- **`pageTabs` (F014) também é bloqueado em árvore.** Conexão F013 ↔ F014 — escavar `pageTabs` para confirmar simetria.
- **Sem deep-link** para nó/página específica. F022 (deep-link) precisaria adaptar `additionalParams.treeNodeId` → navigate-on-mount.
- **Ícone padrão `cil-file`** (CoreUI). Studio escolhe próprio set; mapping de `cil-*` → lucide/etc. é débito atravessado de toda a UI (vide [[react-tools]] ou ui-system).
- **Mobile**: Bootstrap colapsa col-md-3+col-md-9 em stack — árvore vira coluna full-width acima da página. Provavelmente quebra UX (precisa rolar muito até a página). F033 (mobile) herda esse débito.
- **A11y**: nenhum dos dois usa `role="tree"`, `aria-expanded`, etc. rc-tree tem alguns ARIA built-in (limitado). Studio pode ganhar fácil aqui.
- **Performance**: `filterList` no `generictreeview` muta o array clonado a cada keystroke. Para árvores grandes (>500 nós) provavelmente lagga. Studio pode debouncear ou usar useMemo.
- **`SearchTree` depende de `rc-tree` (`ant-design/rc-tree`)** — pacote tem peerDeps com React 16/17/18 conforme versão. Studio decide se mantém a dep ou substitui (radix? shadcn? não há tree primitivo pronto em ambos — sub-issue do designer).

## Estratégia para o Studio (sinal ao designer, não prescrição)

> Este bloco é uma **antecipação de perguntas** que o designer e o curator vão fazer. **Não é prescrição de stack.**

- **`generictreeview` no Studio**: 2 sub-superfícies (sidebar-de-árvore + slot principal recursivo). Slot principal **é** o engine renderer (chama o próprio engine recursivamente — mesma primitiva `<ModelEngine model={...}/>`).
- **`SearchTree` no Studio**: widget reusável. Casos de uso conhecidos: (a) seleção de recursos ACL em modal (F-acessos-usuario), (b) provavelmente seleção de itens em filtro/form (não confirmado), (c) potencial reuso para qualquer multi-select hierárquico em form (`ctype: 'tree-select'`?).
- **Designer decide**: tem componente shadcn de tree? **inferido: shadcn não tem tree built-in** (catálogo do shadcn não inclui Tree até onde sei — verificar). Alternativas: (a) implementar primitivo próprio com radix-collapsible + recursão, (b) usar `@radix-ui/react-tree-view` (existe?), (c) adotar `react-arborist` (npm), (d) seguir com `rc-tree` por compatibilidade direta. Decisão do designer.
- **Mobile**: stack vertical (full-width tree no topo, conteúdo abaixo) provavelmente ruim. Designer pode propor drawer/sheet pattern (árvore vira drawer lateral aberto por botão).

## Features novas identificadas (para o curator)

Durante a escavação, surgiram candidatas a feature dedicada:

1. **F-acessos-usuario-recursos** — `ModalRecursos` + `<SearchTree>` + procs de recursos ACL é um fluxo coeso (selecionar permissões granulares por usuário em árvore checkable). Distinto de [[acl-papel-funcao-pagina]] (que é cataloga o modelo de dados, não a UI de gestão). Candidato P1.
2. **F-tree-editor** — `TreePageConfig.jsx` do AppBuilder (editor visual de árvore de páginas). Necessário para o Studio quando virar AppBuilder substituto. Candidato P2.
3. **F-recursos-acesso-tree-shape** — sub-contrato do schema `{key, title, value, checked, children}` que `Alterar.jsx:278-307` constrói. Cross-cutting (provavelmente reusado em outros lugares — escavar). Candidato a sub-contrato.
4. **F-tree-lazy-load** — feature opcional para árvores grandes (acesso/menus enterprise). Não existe no legado; antecipação. Candidato P3 (só se aparecer necessidade real).
5. **F-tree-drag-reorder** — débito de UX do legado (reordenar nó = deletar+recriar). Candidato P2 só se Studio quiser elevar UX do editor.
6. **F-pageTabs (F014) — paridade `generictreeview`/`pageTabs`** — ambos são bloqueados de aninhar-se mutuamente. Confirmar simetria escavando F014.
7. **F-rc-tree-public-api-drift** — investigar diff entre `react-tools` HEAD e o pacote `@engenharia/react-tools` em produção quanto a `<SearchTree>` props (`ref`, `hideSaveButton`, `value`). Bloqueante para Studio decidir contrato definitivo. Candidato P1.

## Sources

- [[calendar/notes/2026-05-15.md]]
