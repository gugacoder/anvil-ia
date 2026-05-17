---
title: "model-valor.genericactionform — schema do no genericactionform no DFvalor"
aliases: [model-valor-genericactionform, genericactionform-model, action-form-renderer-contract, F037]
tags: [contract, legacy, react-tools, genericactionform, model-valor, director-studio, F037]
sources:
  - "calendar/notes/2026-05-17.md"
created: 2026-05-17
updated: 2026-05-17
---

# Contrato: no `genericactionform` dentro de `DFvalor` (model de pagina)

Sub-contrato do [[engine-schema-driven]] para o discriminante `genericactionform`. Cataloga a **forma** do no JSON `genericactionform` em `acesso.TBmodel_pagina.DFvalor` (vide [[obter-model-pagina]] e [[tbmodel-pagina]]). Quando o engine encontra a chave `genericactionform` no model parsed, instancia `<GenericActionForm/>` (`react-tools/src/components/GenericPage/GenericActionForm.js`). Cobre **F037** do manifest.

O no `genericactionform` descreve uma **lista de grupos colapsaveis de botoes** (`actionGroups[]`). Cada botao dispara um **POST direto** para uma rota relativa (`/api/...` ou `/proc/...`). Botoes podem ser de dois tipos: **acao direta** (POST imediato no clique) ou **acao com payload de filtro** (`openModal:true` → abre `<Modal>` contendo `<Filtros>`; o submit do filtro vira o body do POST). Opcionalmente, um botao pode habilitar **polling de progresso** (`sendProgressRequest:true`), que dispara um POST adicional em loop de 5s ate a chamada principal completar. Inclui tambem um **campo de busca** no topo que filtra os botoes visiveis por substring do `label` (case-insensitive).

O renderer e **estritamente um disparador de POSTs**: nao tem estado de form proprio fora do filtro modal, nao tem validacao alem da que vem do `<Filtros>` interno, e nao tem feedback alem de `useNotifications` (success/warning) e `useBlur` (overlay global). O agrupamento (`actionGroups → rows → buttons`) e estritamente apresentacional (define quebra de grupo e quebra de linha no grid Bootstrap), nao tem semantica de submit-em-lote.

Template canonico associado: **`TemplateFormularioAcoes`** em `acesso.TBmodel_template`, com payload semente `{"genericPageTitle":"","genericactionform":{"actionGroups":[]}}`.

## Citacoes de fonte

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:14` — assinatura: `GenericActionForm({ actionGroups })`. Unica prop.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:12` — `let stopProgressRequest = false` em escopo de **modulo** (singleton de arquivo, nao por instancia).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:23-35` — `sendProgressRequest`: POST em loop com `setTimeout(..., [5000])` (array passado como ms — JS coage para `NaN`/`0` dependendo do engine, ver §"Bugs observaveis").
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:37-61` — `sendRequest`: POST principal com `timeout=120000` (2min), trata `status===200 && sucesso` (success notif), `status===200 && !sucesso` (warning notif), demais (`console.log` apenas).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:30` — `setLoadMessage(resposta.dados || resposta.dados.mensagem)` (precedencia invertida — se `dados` for falsy, acessa `dados.mensagem` que crasha por `null.mensagem`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:46` — `stopProgressRequest = true` ao terminar `sendRequest`, encerrando o loop de progresso.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:63-76` — `handleRequest`: gera `userGuid` via `uuid()` por clique; dispara `sendRequest` e (se `sendProgressRequest`) zera `stopProgressRequest` e dispara `sendProgressRequest` com mesmo `userGuid` + `progressBar:true`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:78-85` — `handleOpenModal` / `handleCloseModal`: estado `showModal`/`modalAction` controla a abertura do modal de filtro.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:87-89` — `handleGroupVisibility`: toggle de colapso por indice de grupo. Estado inicial e `{}` (todos os grupos comecam **abertos** pela logica invertida do `collapse ${!visibleGroup[idx] ? 'show' : ''}` em `:167`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:91-109` — `handleFilterOptions`: case-insensitive substring match em `button.label`. **Muta o objeto do model direto** (`button.hideButton = true/false`) — nao usa estado React, depende de `setSearchInputText` para re-render.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:124-144` — render do `<Modal>` com `<Filtros>` interno: `model={modalAction.modalConfig.model}`, `executeExternalAction={true}`, `externalActionConfigs.onClick=(e)=>handleRequest({action:modalAction, param:e})`. `onSubmit` e inerte (`console.log`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:145-208` — render dos grupos: `actionGroups.map` → cabecalho clicavel + bloco colapsavel com `rows.map` → linha bootstrap (`row`) → `buttons.map` → `<div class="col">` + `<button class="form-control btn btn-sm btn-outline-primary">` com label do botao.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:182-186` — bifurcacao do clique: `actionButton.openModal ? handleOpenModal(actionButton) : handleRequest({action:actionButton})` (sem `param`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:189-193` — bloco de icone (`actionButton.icon`) **comentado out** no source atual; campo `icon` no model e aceito mas **nao renderiza**.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:155-160` — chevron: `cil-arrow-top` quando `!visibleGroup[idx]` (estado "expandido"), `cil-arrow-bottom` quando colapsado.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:114-122` — `<Input>` com `placeholder='Campo de busca...'`, `name='searchInput'`, `onChange=handleFilterOptions`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:50` — engine destructura `genericactionform` do model.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:314-324` — gating: `genericactionform !== undefined` instancia `<GenericActionForm {...genericactionform} />` (spread completo do no JSON).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:325-329` — bug residual no irmao `generictreeview`: linha `{genericactionform || <GenericTreeView {...generictreeview} />}` — quando `genericactionform` esta presente E truthy, **suprime** a renderizacao de `generictreeview` (provavel typo, deveria ser `generictreeview ?`).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useRequest.js:103-104` — `post(resource, body, timeout, token)`; `timeout` em **segundos** dentro do hook (`timeout*1000`).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useRequest.js:6-11` — `sanitize`: prefixa `/api` se ausente. Rotas no model podem omitir o prefixo (ex.: `/proc/...` vira `/api/proc/...`).
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/1-alimentacao/insert_template_pagina.sql:15` — seed do template `TemplateFormularioAcoes` com payload `{"genericPageTitle":"","genericactionform":{"actionGroups":[]}}`.
- `sources/engenharia--fabrica--sql--processa-appbuilder/appbuilder/1-alimentacao/insert_template_pagina.sql:15` — mesmo template replicado em portal-processa-appbuilder.
- `sources/engenharia--fabrica--sql--portal-director/processa.gerenciamento.integracoes/alimentacao/model.gestao_price.sql:1-50` — **unico** seed de producao localizado em `sources/sql/`: pagina `gerenciamento-de-integracoes.price_gestao-price`. **Importante**: este seed usa a chave `actions` (singular, sem `actionGroups`) — formato **incompatível** com o renderer atual que destructura apenas `actionGroups`. Ver §"Variantes obsoletas".
- `sources/engenharia--fabrica--javascript--react-tools/example/src/routes/TemplateActionForm.js:1-82` — exemplo dev canonico do componente, com 3 grupos (`Vendas`, `Produtos`, `Pre[c]os`) e mix de botoes diretos/com modal/com progress.
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/components/ActionForm/EditorGenericActionForm.jsx:1-181` — editor visual do AppBuilder que **escreve** este shape: confirma estrutura `actionGroups[].rows[][]` com botoes editaveis via `ConfigActionFormModal`.
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/components/ActionForm/hooks/useEditorGenericActionForm.js` — hook do editor (`handleFormGroup` add/remove, `handleFormLines` add/remove, `handleButton` add/remove).
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/constants/templates.js` — referencia ao template `TemplateFormularioAcoes` no AppBuilder.

## Estrutura do no `genericactionform`

Chave de discriminante no engine. Forma:

```
genericactionform: {
  actionGroups: [ActionGroup, ...]
}
```

| Campo | Tipo | Obrigatorio | Semantica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `actionGroups` | `ActionGroup[]` | sim (unica prop destructurada) | Lista ordenada de grupos colapsaveis exibidos verticalmente. | array. | `GenericActionForm.js:14` destructura; `:145` itera. Se `undefined`, nada renderiza alem do campo de busca. | seed template |

### Sub-estrutura `ActionGroup`

| Campo | Tipo | Obrigatorio | Semantica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `title` | string | sim (visual) | Texto do cabecalho clicavel do grupo. | qualquer string. | `:154`. Sem fallback — `undefined` renderiza vazio. | exemplo, seed |
| `rows` | `ActionButton[][]` | sim | Matriz: cada elemento e uma **linha** (`<div class="row">` bootstrap); cada elemento da linha e um **botao** que ocupa uma `<div class="col">` (largura igual entre botoes da linha). | array de arrays. | `:169-202`. Numero de cols por row controla largura visual dos botoes na linha. | exemplo, editor |

### Sub-estrutura `ActionButton`

| Campo | Tipo | Obrigatorio | Semantica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `label` | string | sim | Texto exibido no botao **e** chave de match do campo de busca (substring case-insensitive). | qualquer string. | `:187`, `:99`. | exemplo, seed, editor |
| `api` | string (path) | sim (para que o botao tenha efeito) | Rota relativa do POST disparado no clique (ou no submit do modal de filtro). Resolvido por `useRequest.post`; prefixo `/api` injetado se ausente. | string-path. Ex.: `/api/integracoes/atualizar-preco`, `/proc/appbuilder.sp_teste_submit_procedure`. | `:29`, `:45`. Se ausente, `sendRequest` no-op silencioso (`:38` guard). | exemplo, seed |
| `openModal` | bool | nao | Quando `true`, clique abre `<Modal>` com `<Filtros>` dentro (vide [[filtros-componente]], [[modals]]). Submit do filtro vira `param` do POST. Quando falsy, clique dispara POST imediato sem parametros extras. | `true`, `false`, ausente. | `:182-185`. | exemplo |
| `modalConfig` | `{title:string, model:Field[]}` | obrigatorio quando `openModal=true` | Configuracao do modal de filtro. `title` vai pro header do modal; `model` e o array de campos passado a `<Filtros model={...} />`. | objeto. | `:127`, `:132`. Sem guard — `undefined` quando `openModal=true` crasha em `modalAction.modalConfig.title`. | exemplo |
| `additionalParams` | objeto | nao | Body extra mesclado no POST (apos `userGuid` e antes do `param` do filtro modal). | objeto plano `{chave:valor}`. | `:27-28`, `:41-42`. Spread direto: `{ userGuid, ...param, ...additionalParams }`. | exemplo, seed |
| `sendProgressRequest` | bool | nao | Quando `true`, alem do POST principal dispara loop de progresso (POST adicional em `action.api` mesmo a cada ~5s ate a principal completar). | `true`, `false`. | `:68-75`. **Detalhe nao-obvio**: o loop chama o **mesmo `action.api`** com body acrescido de `progressBar:true` — nao ha endpoint separado de progresso. Servidor distingue pelo flag. | exemplo, seed |
| `icon` | string (classe CSS) | nao | **Dead prop no codigo atual** — destructurado/consumido apenas em codigo comentado (`:189-193`). Models de producao declaram (`cilBasket`, `cilBarcode`, `cilTag`) mas icone **nao renderiza**. | classe coreui icons (`cil-*` / `cilFoo`). | Nenhum efeito visivel. | exemplo, seed (declarado mas inerte) |
| `hideButton` | bool | nao (escrito pelo proprio renderer) | **Mutado em runtime** pelo `handleFilterOptions` (`:97-103`): true esconde o botao quando o filtro de busca nao casa com o label. Pode vir do model como `true` para esconder por padrao. | `true`, `false`, ausente. | `:174`. Renderer **muta o objeto do model in-place** — nao e estado React. | runtime, seed |

### Sub-estrutura `Field` (dentro de `modalConfig.model`)

Mesma forma do model de filtro descrito em [[filtros-componente]] e dos campos de [[model-valor-genericform]]. Forma minima observada no exemplo dev:

| Campo | Tipo | Semantica |
|---|---|---|
| `label` | string | Rotulo do campo no modal. |
| `prop` | string | Nome da propriedade no body POST resultante. |
| `type` | string | Tipo do campo. Valores observados: `dates`. Vide [[filtros-componente]] e [[date-components]] para catalogo completo. |
| `required` | bool | Bloqueia submit ate preenchimento (gating do proprio `<Filtros>`). |

## API endpoints

### Endpoint principal (`action.api`)

**Verbo**: POST. **Timeout**: 120s (`:45`). **Body**:
- **Sem modal** (clique direto): `{ userGuid:<uuid v4>, ...additionalParams }`.
- **Com modal**: `{ userGuid:<uuid v4>, ...paramDoFiltro, ...additionalParams }` (sobreposicoes: `additionalParams` sobrescreve campos do filtro com mesma chave).

**Resposta esperada**: `{ status:number, sucesso:bool, dados: string | { mensagem?:string, resposta?:{dados:string} } }`.

Logica de feedback (`:47-57`):
- `status===200 && sucesso===true` E `dados.resposta` existe → `success(dados.resposta.dados)`.
- `status===200 && sucesso===true` (sem `dados.resposta`) → `success(dados.mensagem ?? dados)`.
- `status===200 && sucesso===false` → `warning(dados.mensagem ?? dados)`.
- Demais → `console.log(dados.mensagem ?? dados)` (silencioso para o usuario).

### Endpoint de progresso (mesmo `action.api`)

**Verbo**: POST. **Timeout**: 36s (default do `useRequest`, sem override). **Body**: `{ userGuid:<mesmo uuid da chamada principal>, progressBar:true, ...paramDoFiltro, ...additionalParams }`. **Servidor distingue** pela flag `progressBar:true` para responder com mensagem de progresso ao inves de processar a acao.

**Resposta esperada**: `{ dados: string | { mensagem:string } }`. Conteudo de `dados` (ou `dados.mensagem` — vide §"Bugs observaveis") vai para `setLoadMessage`, exibido pelo overlay `useBlur`.

**Cadencia**: re-chama a si mesmo via `setTimeout(..., [5000])` — alvo de 5s entre chamadas, mas array literal como ms gera coercao para NaN (engines V8 retornam `setTimeout` com delay=0 nesse caso). Resultado pratico: loop **muito mais rapido que 5s**, possivelmente cada tick. Vide §"Bugs observaveis".

**Termino**: `stopProgressRequest = true` ao final de `sendRequest` (`:46`). Como a flag e de modulo, **qualquer** completion de qualquer `GenericActionForm` na pagina interrompe **todos** os loops em curso.

## Variantes obsoletas

O seed `model.gestao_price.sql` (portal-director) usa formato **mais antigo**:

```
"genericactionform": {
    "actions": [[ {...button}, {...button} ], [ {...button} ]]
}
```

— chave `actions` (singular, sem `title`/`rows`/agrupamento) e estrutura **matriz 2D direta de botoes**. O renderer atual **nao consome `actions`** (so destructura `actionGroups`); este seed renderiza **vazio**. Indica que o formato evoluiu de `actions:[[button[]]]` para `actionGroups:[{title,rows:[[button[]]]}]` em algum momento. Inventario completo de paginas vivas usando o formato antigo requer probe ao banco (vide §"Inventario nao realizado").

## Inventario nao realizado

Probe ao banco vivo (sqlserver 172.27.0.121\SQL2k19) para `SELECT DFchave_pagina FROM acesso.TBmodel_pagina WHERE DFvalor LIKE '%genericactionform%'` cross-tenant **nao foi executavel nesta sessao** (sqlcmd nao disponivel no shell desta task). Curator/principal deve agendar passo de inventario para:

1. Listar `DFchave_pagina` que usam `genericactionform` por tenant.
2. Distinguir `actionGroups[]` (formato atual) vs `actions[]` (formato obsoleto) por LIKE.
3. Validar se o seed `model.gestao_price.sql` foi de fato carregado em producao (e portanto se ha pagina viva em formato obsoleto).

Seed `TemplateFormularioAcoes` esta confirmado em duas fontes SQL (portal-director e processa-appbuilder).

## Bugs observaveis (relevantes para migracao)

- **Singleton de modulo `stopProgressRequest`** (`:12`): se duas instancias de `GenericActionForm` coexistem (improvavel pelo engine, mas possivel via tab page), o flag e compartilhado. Outra instancia completando uma acao para o loop de progresso da primeira.
- **`setTimeout(..., [5000])`** (`:33`): array literal coerido para `Number([5000])==5000` em JS estrito — funciona acidentalmente para arrays de 1 elemento, mas qualquer alteracao para 2+ elementos viraria `NaN`. Codigo fragil, intencao original era `5000` (number).
- **`resposta.dados || resposta.dados.mensagem`** (`:30`): se `dados` e null/undefined, acessar `.mensagem` crasha. Ordem inversa do idiomatico (`dados?.mensagem || dados`).
- **Sem `await` no progress loop** (`:31-33`): `setTimeout` agenda novo `sendProgressRequest` antes do anterior terminar, podendo gerar overlap de POSTs se servidor responde lento.
- **Mutacao do model** (`:97-103`): `handleFilterOptions` atribui `button.hideButton = true/false` direto no objeto que veio via props. Re-render funciona porque ha um `setSearchInputText` na sequencia.
- **`generictreeview` suprimido por `genericactionform`** (`GenericPage.js:327`): bug de irmao — se uma pagina declara ambos, `generictreeview` nao renderiza.
- **`modalConfig` sem guard quando `openModal=true`**: ausencia da chave crasha em runtime no clique.
- **Field `icon` documentado e nao renderizado**: codigo comentado em `:189-193`.
- **Field `additionalParams.userGuid` sobrescreve o uuid gerado** (`:25-28`): se model declara `additionalParams: { userGuid: uuid() }` (como o exemplo dev faz), o uuid do model **substitui** o uuid recem-gerado a cada clique — diferente do esperado (uuid por requisicao). Adicionalmente, em `TemplateActionForm.js:19,39,46,60` o `uuid()` e avaliado **na montagem do componente**, nao por clique, entao todos os cliques sucessivos enviam o mesmo `userGuid`. Servidor que use `userGuid` para dedup vai descartar a segunda chamada em diante.

## Asseroes observaveis (A1..A14)

1. **A1** — Render inicial mostra `<Input placeholder="Campo de busca...">` no topo dentro de `<div class="card card-body">` (`GenericActionForm.js:112-123`).
2. **A2** — Cada `actionGroups[i]` produz um cabecalho clicavel `<span role="button" class="badge bg-light text-dark h5 group-label">` com `groupConfig.title` e um icone `cil-arrow-top` (estado expandido) ou `cil-arrow-bottom` (colapsado) flutuando a direita (`:150-162`).
3. **A3** — Estado inicial: **todos os grupos comecam expandidos** (`visibleGroup={}` em `:16` + condicao invertida `!visibleGroup[idx] ? 'show' : ''` em `:167`).
4. **A4** — Clique no cabecalho alterna `visibleGroup[idx]`; bloco `.collapse` ganha/perde classe `show`.
5. **A5** — Cada `groupConfig.rows[r]` produz `<div class="row button-row-margin">`; cada `actionRow[b]` produz `<div class="col"><button class="form-control btn btn-sm btn-outline-primary">` com `actionButton.label` (`:171-194`).
6. **A6** — Campo de busca filtra **case-insensitive substring** em `label`: digitar texto que nao casa com label seta `hideButton=true` e a `<div class="col">` daquele botao **nao renderiza** (string vazia retornada em `:198`). Apagar texto restaura todos os botoes.
7. **A7** — Clique em botao com `openModal` falsy dispara `POST {api}` com body `{userGuid:<v4>, ...additionalParams}`, timeout 120s. Sem modal. Sem param adicional.
8. **A8** — Clique em botao com `openModal:true` abre `<Modal size="xl" title={modalConfig.title}>` contendo `<Filtros model={modalConfig.model} hideButtons={true} executeExternalAction={true} externalActionConfigs={{title:'Enviar', onClick:...}}>` (`:125-141`). POST so dispara quando usuario clica em **Enviar** dentro do modal.
9. **A9** — POST do modal envia body `{userGuid:<v4>, ...valoresDosCamposDoFiltro, ...additionalParams}`. `additionalParams` vence em colisao de chave.
10. **A10** — Em `status===200 && sucesso===true` com `dados.resposta` populado, dispara `success(dados.resposta.dados)`; senao, dispara `success(dados.mensagem ?? dados)`. Em `status===200 && sucesso===false`, dispara `warning(dados.mensagem ?? dados)`. Outros codigos: silencio (so `console.log`).
11. **A11** — Durante a chamada principal, `setPageBlur(true)` ativa o overlay global (`:44`); ao final, `setPageBlur()` (sem arg) limpa (`:59`). Modal fecha em `:58`.
12. **A12** — Quando `sendProgressRequest:true`, alem do POST principal, ha POST(s) adicional(is) no **mesmo `api`** com body acrescido de `progressBar:true`, em loop. Cada resposta atualiza `setLoadMessage` (texto exibido no overlay de blur). Loop encerra quando `sendRequest` principal completa.
13. **A13** — `userGuid` enviado e o **mesmo** entre a chamada principal e todas as chamadas de progresso de um mesmo clique (gerado uma vez em `handleRequest:64` e propagado).
14. **A14** — Campo `icon` declarado no model **nao** produz nenhum elemento `<i>` no DOM (codigo comentado).

## Sub-contratos relacionados

- [[engine-schema-driven]] — engine que dispatcha por chave (`genericactionform` aqui, sibling de `genericform`, `datagrid`, `genericcalendar`, `genericgridcollection`, `generictreeview`, `pipeliner`).
- [[obter-model-pagina]] / [[tbmodel-pagina]] — onde o JSON vive (`DFvalor`).
- [[filtros-componente]] — componente usado dentro do modal de acao com payload.
- [[modals]] — `<Modal>` size `xl`, controlado por estado local.
- [[notifications]] — `useNotifications().success/warning` para feedback.
- [[model-valor-genericform]] — irmao discriminante; nao co-renderiza com `genericactionform` na mesma pagina (engine renderiza um ou outro pela ordem do JSX em `GenericPage.js`).
- [[model-valor-datagrid]], [[model-valor-genericcalendar]], [[model-valor-pagetabs]], [[model-valor-generictreeview]], [[model-valor-wizard]] — discriminantes irmaos.

## Relacoes com o ecossistema

- **Consome de**: `acesso.TBmodel_pagina.DFvalor` (JSON model); endpoint declarado em cada `action.api` (proc qualquer do dominio, sem convenção de naming uniforme — exemplos: `/api/integracoes/*`, `/proc/appbuilder.sp_*`).
- **E consumido por**: `GenericPage` (engine, `GenericPage.js:50,314-324`).
- **Editor associado**: `Processa.AppBuilder` (`processa.appbuilder/Fontes/website/src/components/ActionForm/EditorGenericActionForm.jsx`) — UI no-code que produz o JSON neste shape.
- **Template seed**: `TemplateFormularioAcoes` em `acesso.TBmodel_template` (registro `'Formulário de Ações'`).
- **Acoplamento com servidor**: convenção de progresso (`progressBar:true` no body como discriminador entre acao principal e tick de progresso) e responsabilidade da proc — nao ha protocolo separado.

## Notas de implementacao para o Studio

- `actionGroups[].rows[][]` e estritamente layout. Migracao pode separar **estrutura logica** (lista plana de acoes com tags de grupo) de **layout** (grid responsivo). Curator decide se mantém o shape 2D.
- O field `icon` ja esta no model em producao mas nao renderiza — Studio precisa decidir: implementar (fechar a intencao) ou aceitar e remover do model.
- Polling de progresso esta acoplado ao mesmo endpoint da acao. Studio pode preferir SSE/WebSocket (vide [[hub-sse-mapping]]) ou endpoint dedicado de progresso.
- O `setTimeout(..., [5000])` deve ser tratado como bug intencional-acidental (loop mais rapido que 5s na pratica). Studio deve declarar cadencia explicita.
- `userGuid` por clique exige cuidado: ou (a) gerado fresh por clique no Studio (corrigindo o bug de `additionalParams.userGuid` capturado na montagem), ou (b) explicitamente herdado do model — escolha de design, nao migracao 1:1.
- Mutex de modulo (`stopProgressRequest`) precisa decisao explicita: scope por instancia (correto) vs scope global (compat com legado).
- Variante obsoleta `actions:[[button[]]]` (sem `actionGroups`/`title`/`rows`) provavelmente requer migracao de dados antes do cutover. Inventario via SQL pendente.
- Bug `generictreeview` suprimido por `genericactionform` na engine (`GenericPage.js:327`) e detalhe do engine, nao deste discriminante; documentado em [[engine-schema-driven]].

## Sources

- [[calendar/notes/2026-05-17.md]]
