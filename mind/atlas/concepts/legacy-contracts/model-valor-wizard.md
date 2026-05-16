---
title: "model-valor.wizard / Steps — Pipeliner step machine (F015)"
aliases: [model-valor-wizard, pipeliner-wizard-contract, addpipeliner-addstage-addaction, dftipo-wizard-renderer, f015-wizard-steps]
tags: [contract, legacy, react-tools, appbuilder, pipeliner, wizard, steps, model-valor, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-16
---

# Contrato: renderer wizard / Steps (F015)

Sub-contrato do bloco de renderers para a feature **F015 — "Renderer DFtipo=wizard / Steps"**. O nome do manifest (`DFtipo=wizard`) sugere um discriminante do [[engine-schema-driven]] no mesmo molde de `pageTabs`/`generictreeview`/`dashboard`, **mas isso não existe no legado**. A escavação confirma:

1. **Não há chave `wizard` (nem `steps`, nem `step`) reconhecida por `<GenericPages/>`/`<GenericPage/>`** — a bifurcação raiz só conhece `pageTabs` ([[model-valor-pagetabs]]); o `<GenericPage/>` interno só conhece `genericform`/`genericgrid`/`dashboard`/`generictreeview`/`pipeliner`/... ([[engine-schema-driven]]).
2. **Não há `TemplatePaginaWizard` (nem similar) em `insert_template_pagina.sql`** — os templates seed conhecidos cobrem cadastro, formulário, integração, abas, grids, ações, mas nenhum nome inclui "wizard"/"steps".
3. **A única tela do legado que opera como wizard multi-step** é o **cadastro do Pipeliner no AppBuilder** (`/#/pipeliner`) — fluxo "Home → Integração → Estágio → Ação". É um componente próprio, **fora do engine schema-driven**, hand-rolled com `switch(indice)`, `forwardRef` + `useImperativeHandle`, e contexto React dedicado.

Portanto este contrato cataloga **o wizard concreto que existe no legado** (Pipeliner do AppBuilder) como referência empírica para F015. Curator decide se F015 vira (a) renderer schema-driven novo no Studio sem precedente legado, (b) reescrita declarativa da máquina de passos do Pipeliner como componente reusável, ou (c) deprecação da chave fantasma.

> Nota cruzada: existe **outra** chave `pipeliner` reconhecida pelo `<GenericPage/>` ([[engine-schema-driven]] §dispatch — visto em grep de `pipeliner|Pipeliner` em `GenericPage.js`). Ela renderiza um sub-componente diferente do wizard de cadastro — provavelmente a **lista/grid de pipelines dentro de um GenericPage**. Não é o wizard descrito aqui. Fica como follow-up de escavação (ver §"Pontos abertos").

## Citações de fonte

### Estrutura do wizard (4 páginas em uma máquina de estado linear)

- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/components/Pipeliner/Enum/TypePageEnum.jsx:1-10` — enum congelado das 4 páginas: `Home`, `Pipeliner`, `Stage`, `Action`. **Não há páginas opcionais, não há ramos, não há merge: é uma cadeia 0→1→2→3 com retorno 3→2 e 2→1.**
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx:31-56` — `renderEtapa()` é um `switch(indice.indice)` literal: `case 0` (Home) renderiza `<GenericPage route={{model: pagePipeliner}}/>` (a lista de pipelines via engine schema-driven); `case 1` `<AddPipeliner/>`; `case 2` `<AddStage/>`; `case 3` `<AddAction/>`.
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx:58-69` — `getIndice(typePageEnum)` mapeia o enum para o número (Home→0, Pipeliner→1, Stage→2, Action→3). **A identidade da página é dupla: índice (interno ao switch) e enum (semântico).**
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx:121` — `Avancar(parametros = null) = setIndice({...indice, indice: indice.indice + 1, parametros})`. **Avanço é puro incremento + payload acumulado em `indice.parametros`.**
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx:123-130` — `Cancelar()` = decremento. Comportamento especial: ao voltar de `Action(3) → Stage(2)`, preserva `indice.parametros`; ao voltar de outros casos, idem com pequena variação (mantém `parametros`).
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx:132-156` — `useEffect([indice.indice])` reage a cada troca de página: troca `sideBox` (painel lateral) e label do botão footer (`Adicionar estágio` / `Salvar Estágio` / `Salvar Ação`). **Não há useEffect de mount/unmount por step — todos os steps são `<AddPipeliner/>` etc. montados/desmontados pelo `switch`.**

### Validação por step (handshake via ref)

- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx:14` — `componetRef = useRef()` é um ref único compartilhado: a página corrente injeta sua própria `validate`/`savePipeline` no ref via `useImperativeHandle`. Sobrescrito a cada troca de step (porque o componente do step é desmontado).
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx:70-81` — `handlevalidate()` (sic, com 'v' minúsculo) é o handler do botão "Avançar/Salvar" do footer. Chama `componetRef.current.validate()` (interface exigida de todo step), recebe `{validade, data}`. Se `validade=false`, **aborta silenciosamente** (sem mensagem global; cada step exibe seus próprios erros). Se `validade=true`:
  - Se `componetRef.current.TYPE === 'AddAction'` ou `=== 'AddStage'` → `setIndice(data)` (o próprio step decide para qual índice voltar).
  - Senão (TYPE = `AddPipeliner`) → `Avancar(data)` (avança +1 levando `data` como `parametros`).
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx:82-87` — `SavePipeline()` chama `componetRef.current.savePipeline()` (só disponível em `AddPipeliner`). Persiste a integração inteira de uma vez (ver §Persistência abaixo).

### Step 1 — `AddPipeliner` (dados da integração + lista de estágios via tree lateral)

- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/components/Pipeliner/Componentes/AddPipeliner.jsx/AddPipeliner.jsx:18-36` — estado local inicializado a partir de `props.parametros`: `{idPipeline, nome, urlBase, urlBaseHomolocacao, statusPipeliner, stages: [], variaveis: []}`. Campos opcionais default `''`/`[]`. **Cada (re-)entrada em `AddPipeliner` reseta o useState — não há cache externo do form, exceto o que chega via `props.parametros` do orquestrador.**
- `:43-55` — `useImperativeHandle(ref, ...)`: expõe `validate()` (retorna `{validade, data: input}`) e `savePipeline()`. **`TYPE: 'AddPipeliner'` é a string discriminante para o orquestrador (ver `handlevalidate`).**
- `:57-95` — `savePipeline()` faz **2 chamadas em sequência**: (a) `POST /appbuilder/proc/pipeliner.sp_persistirPipeliner` (persiste no banco do AppBuilder, retorna `idPipeline`); (b) `POST /api/pipeliner/savePipelineNewDB` com `{ids: idPipeline}` (deploy do JSON pra banco de destino — ver [[appbuilder]] §deploy). **Só termina o wizard quando a (a) responde 200 — `(b)` só emite warning se falhar, não bloqueia.**
- `:97-114` — `validateInput(validateStages=false)`: campos obrigatórios `nome` + `statusPipeliner`. Se `validateStages=true` (chamado por `savePipeline()`), também exige que `props.parametros.stages` exista (≥ 1 estágio). **Validação não emite mensagem agregada — usa `setInputError` por campo + `<span class="span-campo-obrigatorio">Campo Obrigatório!</span>` inline.**

### Step 2 — `AddStage` (estágio + lista de ações reorderable)

- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/components/Pipeliner/Componentes/AddStage/AddStage.jsx:21-51` — `useEffect([keyStage])`: rehidratação ao entrar/sair do step. Reads `props.stage` (estágio sendo editado, vindo do orquestrador via `indice.stage`). Se `props.stage.acoes` é string JSON, parse; senão `[]`. **A chave de remount é `keyStage = indice.stage.idStage` — quando o estágio muda, o step inteiro reseta.**
- `:80-84` — `handleChange`: shallow merge em `input` (gerencia 5 campos `nomeStage`, `statusStage`, `tempoExecucao`, `ambienteStage`, `acoes`).
- `:154-191` — `useImperativeHandle.validate()`: valida 4 campos obrigatórios + checa unicidade do `nomeStage` dentro da lista de stages do pipeline + (se chamado em modo "salvar") exige ≥ 1 ação. Retorna `{validade, data: {indice: 1, parametros: novosParametros}}` — **o próprio step instrui o orquestrador a voltar para o passo 1 (Pipeliner) após salvar**, levando os parâmetros atualizados (estágio recém-criado/editado já está em `parametros.stages.stage[]`).
- `:58-79` — `handleUpdateListOrder(newList)`: callback do `ReorderableGrid` (drag-and-drop). Atualiza `input.acoes = JSON.stringify(newList)`. **A ordem das ações é semanticamente significativa (ações executam top-down — vide tooltip em `:316-324`).**
- `:86-99` — `goToPageAddAction(indexAction)`: valida o stage antes de pular pro step 3. Chama `refreshParams({...formatDataToAddAction({stage: input, indexAction, listActions})})` que internamente seta `indice: 3` (via `getIndice(TypePageEnum.Action)`).
- `:192-194` — `useEffect([listActions])`: desabilita o botão "Salvar Estágio" se a lista de ações está vazia.

### Step 3 — `AddAction` (ação dentro do estágio; sub-renderer por tipo)

- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/components/Pipeliner/Componentes/AddAction/AddAction.jsx:21-30` — estado inicial reidratado a partir de `props.listActions[props.indexAction]` (ação sendo editada) — ou default vazio para criação. Campos genéricos: `key`, `interval`, `stopWords`, `stopAction`, `type` (Request|SOAP|Query|Log|IMAP|SMTP — 6 tipos).
- `:79-126` — `useImperativeHandle.validate()`: delega validação dos **campos específicos do tipo** a `actionsRef.current.validate()` (um sub-ref aninhado: `<TypeAction ref={actionsRef}/>` em `:207`). Se ambos passam, monta o `_action` final, faz merge na `listActions[indexAction]` (edição) ou push (criação), e retorna `{validade: true, data: {indice: 2, page: TypePageEnum.Stage, ..., stage: {...props.stage, acoes: JSON.stringify(listActions)}}}` — **diz ao orquestrador para voltar pro step 2 com o estágio atualizado.**
- `:207` — `<TypeAction props={props} action={input.type[0].value} ref={actionsRef}/>` — sub-renderer poliforme por tipo de ação. **É outra camada de step interna, fora do escopo do contrato wizard, mas válida como precedente de "step dinâmico por type" — ver §Pontos abertos.**

### Contexto compartilhado (PipelinerContext)

- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/components/Pipeliner/Context/PipelinerContext.jsx:1-48` — `PipelinerProvider` envolve a rota inteira. Compartilha entre orquestrador + sidebox + steps: `indice` (estado de step + parâmetros), `pageSideBox` (qual sidebox renderizar), `nameButtonFooter` (label do botão), `pipelineConfigRef` (ref bruto do pipeline em edição), `disableBtnStage` (flag para gating do botão), `treeOptionRef` + `cleanRef` (seleção da árvore lateral).
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/components/Pipeliner/hooks/usePipeliner.js:4-89` — hook que produz os useState. **Estado inicial: `indice = {indice: 0, parametros: {}}`. Nada lido de URL/sessionStorage — sempre começa no Home.**
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx:89-119` — `refreshParams(e)`: callback genérico de mudança de step. Se `e.id` presente, busca pipeline completo via `POST /appbuilder/proc/pipeliner.sp_consultar_pipeliner_porId`. Senão, navega entre Stage/Action carregando estado local. **Esse é o ponto único de "load" do wizard quando o usuário entra para editar um pipeline existente (vindo do step 0/Home via duplo-clique no grid).**

### Persistência (one-shot ao fim)

- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/Processa.AppBuilder.Repositories/PipelinerRepository.cs:9-80` — proc backend `pipeliner.sp_persistirPipeliner` é única; recebe o pipeline inteiro como XML (`Parametro` envelope com `stages/stage[]` e cada stage com `acoes` JSON string).
- `sources/engenharia--fabrica--sql--processa-appbuilder/pipeliner/2-procedures/pipeliner.sp_persistirPipeliner.sql:38-140` — implementação SQL: parse XML → `#temp_stages` → `INSERT` ou `UPDATE` `pipeliner.TBpipeline` → DELETE/UPDATE/INSERT estágios em `pipeliner.TBstage`. **Não há tabela intermediária de "rascunho" / "wizard em progresso" — o usuário só persiste no botão "Concluir" do step 1 (`AddPipeliner`).**

### Layout do botão footer (efeito visual no step ativo)

- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx:158-185` — `DivBottomMain()` renderiza:
  - Botão "Cancelar" (sempre presente exceto no Home; faz `Cancelar()` = decremento).
  - Botão "Concluir" (verde, só visível em `indice === Pipeliner(1)`; faz `SavePipeline()`).
  - Botão dinâmico azul (label vem de `nameButtonFooter`: "Adicionar estágio" no step 1, "Salvar Estágio" no step 2, "Salvar Ação" no step 3); faz `handlevalidate()`. Desabilitado em `indice === 2 && disableBtnStage` (estágio sem ações).

## Estrutura

### Não há "model JSON" para wizard

Diferente de [[model-valor-genericform]], [[model-valor-datagrid]] etc., **o wizard do Pipeliner não é descrito por nenhum JSON em `TBmodel_pagina.DFvalor`**. A rota `/#/pipeliner` no AppBuilder é renderizada pelo `<Pipeliner/>` (`routes/Pipeliner/Pipeliner.jsx`), que é um componente React **hardcoded** — a única coisa schema-driven dentro dele é a **lista de pipelines no step 0**, que é um `<GenericPage route={{model: pagePipeliner}}/>` com `pagePipeliner` literal inline (`Pipeliner.jsx:188-253`), exatamente como qualquer outra página do engine.

Os campos de form de cada step (`AddPipeliner`, `AddStage`, `AddAction`) são **hardcoded em JSX** — não usam `<GenericForm/>` do engine. Inputs, selects, validação são todos imperativos.

### Máquina de estados do wizard (extraída do switch)

| Step | Enum | Índice | Componente | Persistência ao avançar | Comportamento de "Voltar" |
|---|---|---|---|---|---|
| 0 | `Home` | 0 | `<GenericPage model={pagePipeliner}/>` (lista + filtro + grid + botão "Add" que faz `Avancar()`) | — | — (Home é raiz) |
| 1 | `Pipeliner` | 1 | `<AddPipeliner/>` (form: nome, status, urlBase, urlBaseHomolocacao, variáveis; sidebox = tree lateral de estágios) | "Avançar" cria/edita estágio (vai pro step 2). "Concluir" persiste pipeline inteiro via `sp_persistirPipeliner`. | Volta pro Home (step 0), descarta tudo (estado é puro `useState` local). |
| 2 | `Stage` | 2 | `<AddStage/>` (form: nomeStage, tempoExecucao, ambienteStage, statusStage; lista reorderable de ações) | "Salvar Estágio" valida e volta pro step 1 com o estágio adicionado em `parametros.stages.stage[]`. "Adicionar Ação" vai pro step 3. | Volta pro step 1; ações adicionadas mas estágio não salvo são perdidas (porque o orquestrador só atualiza `parametros` quando o `validate()` do step retorna). |
| 3 | `Action` | 3 | `<AddAction/>` (form: key, type, interval, stopWords/stopAction; sub-form por type) | "Salvar Ação" valida e volta pro step 2 com a ação adicionada/editada em `listActions`. | Volta pro step 2; ação parcialmente preenchida é perdida. |

### Interface obrigatória de step (handshake via `useImperativeHandle`)

Cada step (`AddPipeliner`/`AddStage`/`AddAction`) **deve expor** via `forwardRef`+`useImperativeHandle`:

| Método | Obrigatório | Retorno | Semântica |
|---|---|---|---|
| `validate()` | sim | `{validade: boolean, data: any}` | Valida o form do step. Em falha, atualiza erro inline e retorna `validade=false`. Em sucesso, retorna `data` que o orquestrador usa para decidir próximo passo. Para `AddAction`/`AddStage`, `data` carrega `{indice, parametros, ...}` — **o step decide o próximo índice, não o orquestrador**. Para `AddPipeliner`, `data = input` e o orquestrador faz `Avancar(data)`. |
| `savePipeline()` | só em `AddPipeliner` | `boolean` | Persiste o pipeline inteiro. Disparado pelo botão "Concluir". Se sucesso, orquestrador chama `Cancelar()` (decrementa para Home). |
| `TYPE` | sim | string literal | Discrimina o tipo de step para o orquestrador escolher entre `Avancar(data)` (TYPE='AddPipeliner') e `setIndice(data)` (TYPE='AddStage'/'AddAction'). |

### Estado por step

| Step | Estado interno (useState) | Vem de | Vai para | Persiste entre re-entradas? |
|---|---|---|---|---|
| `AddPipeliner` | `input` (form), `inputError` (validação inline) | `props.parametros` (estado acumulado do wizard) | Volta como `data` no `validate()` → orquestrador faz `Avancar(data)` colocando-o em `indice.parametros` para o próximo step | Não em si — mas como **`indice.parametros` no orquestrador sobrevive entre steps**, e `AddPipeliner` lê `props.parametros` no init, o **efeito é de persistência** desde que o usuário não saia da rota. |
| `AddStage` | `input` (form), `listActions` (ações), `inputError` | `props.stage` (estágio em edição), `props.parametros` (lista de stages) | `validate()` retorna `data={indice:1, parametros: novosParametros}` — o orquestrador atualiza `indice` e o step 1 lê novamente. **`useEffect([keyStage])`** garante remount lógico quando muda o estágio sendo editado. | Não — cada remount lê de `props`. Mas `props.parametros` no orquestrador sobrevive. |
| `AddAction` | `input` (campos genéricos), `valueURls`, `actionsRef` (sub-ref do `TypeAction`) | `props.listActions[props.indexAction]` (ação em edição) | `validate()` retorna `data={indice:2, ..., stage: {...,acoes: JSON.stringify(listActions)}}` — atualiza step 2 com a nova lista de ações | Não — perde estado se voltar antes de salvar. |

### Persistência ao banco (somente no fim)

Não há save por step. Persiste apenas no clique de "Concluir" no step 1:

1. `AddPipeliner.savePipeline()` → `POST /appbuilder/proc/pipeliner.sp_persistirPipeliner` com `{Parametro: {idPipeline, nome, urlBase, urlBaseHomolocacao, statusPipeliner, stages: parametros.stages, variaveis: JSON.stringify(variaveis)}}`. Backend serializa para XML, `sp_persistirPipeliner` (`processa-appbuilder/pipeliner.sp_persistirPipeliner.sql:38-140`) faz INSERT/UPDATE em `pipeliner.TBpipeline` e DELETE/UPDATE/INSERT em `pipeliner.TBstage` num único trans. Retorna `<Resposta><Status>200</Status><Sucesso>true</Sucesso><Dados>{idPipeline}</Dados></Resposta>`.
2. **Em sequência**, `autoSave(idPipeline)` → `POST /api/pipeliner/savePipelineNewDB` (deploy do JSON pro banco de destino conforme [[appbuilder]] §deploy). Falha aqui apenas warning, não bloqueia.

**Não há rascunho/draft no servidor.** Refresh da página, navegação para fora, fechamento do browser — tudo descarta o que foi preenchido sem clicar "Concluir".

## Comportamento observado

### Não há "step ativo" persistido

Como em [[model-valor-pagetabs]], **a sessão do wizard não persiste** o índice atual: `indice = useState({indice: 0, parametros: {}})` sempre começa no Home. Recarregar a página perde tudo (form + posição). Navegar pra outra rota e voltar idem.

### Validação por step, não global

Cada step valida apenas seus próprios campos. **Não há resumo de erros agregado**, não há barra de progresso, não há indicação visual de "passo X de Y inválido". A UX é puramente sequential gate: usuário só avança se o step corrente passa.

### Estado sobrevive entre steps apenas pelo orquestrador

O orquestrador (`<Pipeliner/>`) carrega `indice.parametros` como blob mutável que cada step ler ao montar e devolve mutado ao desmontar. **O React unmount/remount entre steps zera o `useState` interno** — o que "persiste" é apenas o que o step explicitamente colocou em `data` no retorno de `validate()`. Campos não enviados (porque o usuário não chegou a clicar "Salvar") são perdidos.

### Ramificação não-linear: step 2 ↔ step 3

A máquina é mais que linear: dentro de um estágio (step 2), o usuário pode editar várias ações (step 3) em loop. **O índice da ação sendo editada (`indexAction`) é mantido no `indice.indexAction`** (ver `Pipeliner.jsx:52` — `key={indice.indexAction}`). Trocar de ação remonta o `<AddAction/>` (zera o form interno; carrega da `listActions[indexAction]`).

### Validação cruzada por unicidade

- `AddStage` valida que `nomeStage` é único dentro do mesmo `ambienteStage` na lista de stages do pipeline (`AddStage.jsx:110-119`).
- `AddAction` valida que `key` (nome da ação) é único dentro do mesmo `listActions[]` do estágio (`AddAction.jsx:43-49`).
- Não há validação cross-step (ex.: variável referenciada em `AddAction` que não existe em `AddPipeliner.variaveis`).

### Sidebox lateral (tree de navegação)

Paralelo aos steps, um `<SideBox/>` lateral exibe a árvore "pipeline → estágios → ações" (ver `Pipeliner.jsx:267-273`). O `pageSideBox` é trocado pelo orquestrador (`home`/`addPipeliner`/`addStage`/`addAction`) conforme o step. Cliques na árvore disparam `refreshParams(e)` que **navega direto para o step do nó clicado** (ex.: clicar numa ação leva direto ao step 3 com `indice.parametros` pré-carregado). **É uma rota paralela de navegação não-sequencial dentro do wizard** — atalho que o usuário tem além do botão footer.

### Erro silencioso

Como em [[model-valor-pagetabs]], `JSON.parse` em `AddStage.jsx:46-50` está envolto em `try/catch` que devolve `[]` em falha — ação malformada some sem aviso. Em `AddPipeliner.jsx:20-25`, o parse de `variaveis` idem.

### Modo edição vs criação

Ambos os modos usam a mesma máquina. Diferença: ao entrar pelo grid de pipelines (Home) com duplo-clique, `refreshParams({id: e.id, page: Pipeliner})` faz `POST .../sp_consultar_pipeliner_porId`, popula `indice.parametros` com o pipeline inteiro, e seta `indice.indice = 1`. **Edição preserva `idPipeline` no payload final → `sp_persistirPipeliner` faz UPDATE em vez de INSERT.**

## Sub-contratos relevantes

- [[engine-schema-driven]] — onde o discriminante `wizard`/`steps` **não** existe. F015 nasce sem precedente schema-driven.
- [[model-valor-pagetabs]] — máquina de estado paralela (abas) que **também** não persiste posição entre recargas; serve de paralelo de UX.
- [[appbuilder]] — projeto onde o wizard vive (não é Director.Studio nem Portal.Director).
- `pipeliner-wizard-typeaction` (a catalogar) — sub-renderer dinâmico dentro do step 3 que muda forma por `type` (Request/SOAP/Query/Log/IMAP/SMTP). Cada tipo tem seu próprio sub-form com campos próprios. Precedente válido de "step com schema variável".
- `pipeliner-sp-persistirpipeliner` (a catalogar) — contrato detalhado da proc + DDL de `pipeliner.TBpipeline` / `pipeliner.TBstage`.

## Relações com o ecossistema

- **Consome de**: `acesso.TBaplicacao(DFchave='appbuilder')` (rota); `pipeliner.TBpipeline` (load via `sp_consultar_pipeliner_porId`); `<GenericPage/>` (só para a lista do Home).
- **É consumido por**: nada — é leaf component.
- **Não é dispatched pelo engine schema-driven** — é uma rota direta da SPA AppBuilder (`/#/pipeliner`).
- **Persiste em**: `pipeliner.TBpipeline` + `pipeliner.TBstage` (`DFAcoes` é JSON string da lista de ações). Cf. [[appbuilder]] e [[pipeliner-service]].
- **Dispara deploy**: `POST /api/pipeliner/savePipelineNewDB` (deploy do JSON pro banco destino — ver [[appbuilder]] §"savePipelineNewDB").

## Notas de implementação para o Studio

(comportamento observado; curator decide o que replicar/evoluir)

- **Não existe schema declarativo para wizard no legado.** Studio que quiser uma chave `wizard` no engine inventa do zero — não há contrato a respeitar, só comportamento a paralelar (se quiser). Alternativa: tratar o wizard do Pipeliner como tela única especial (não-engine), e deixar F015 como "componente reusável wizard" sem entrada schema-driven.
- **Sem persistência intermediária no legado**: refresh perde tudo. Studio pode replicar exato ou evoluir (draft em sessionStorage/Redis). Curator decide.
- **Sem deep-link por step**: URL não muda entre steps. Não há `?step=2`. Studio pode evoluir para deep-link, mas isso muda comportamento.
- **Validação por step com `useImperativeHandle` + `forwardRef`** é o padrão imperativo do legado. Studio com React moderno pode preferir `react-hook-form` + state machine declarativo (XState, finite-state) — funcionalmente equivalente, idiomaticamente diferente.
- **Cada step desmonta o anterior** (porque `switch` retorna JSX diferente). Lazy state na prática — mas como o estado vive em `indice.parametros` no orquestrador, **o efeito é "draft em memória"**, perdido só ao sair da rota. Studio pode preservar componentes (keep-alive) ou explicitar draft.
- **Sidebox + footer button são parte essencial da UX** — não são acessórios, mas a única navegação possível além do footer. Studio deve decidir se preserva o pattern (drag tree lateral + footer dinâmico) ou redesenha (stepper visual no topo, próxima/anterior idiomáticos).
- **Steps com schema dinâmico por type** (caso de `AddAction` poliforme por tipo de ação) são frequentes em wizards reais — vale catalogar separadamente como `wizard-step-by-type` antes de F015 começar.
- **Persistência de uma vez no fim** (`sp_persistirPipeliner` com XML inteiro) é uma decisão de backend; o frontend nunca chama save parcial. Replicar exato implica em manter contrato de "tudo ou nada"; quebrar isso (save por step) **muda o contrato com o backend**, não apenas o UX.

## Pontos abertos / follow-ups para o time

(registros de ambiguidade — não inferi nada nestes; quem precisar deve aprofundar)

1. **Chave `pipeliner` no engine schema-driven**: o grep encontrou `pipeliner|Pipeliner` em `react-tools/src/components/GenericPage/GenericPage.js` e `GenericForm/GenericForm.js` (3 ocorrências no GenericPage). Existe um discriminante `pipeliner` no `<GenericPage/>` que renderiza um sub-componente **diferente** do wizard do AppBuilder — provavelmente uma visualização (read-only?) de pipelines dentro de uma página do Portal Director. Não é o wizard. **Não foi aprofundada aqui** porque cai em outra feature (talvez F-pipeliner-renderer). Sugerir backlog do archaeologist.
2. **`TypeAction.jsx` (sub-renderer por tipo)**: 6 tipos (Request/SOAP/Query/Log/IMAP/SMTP), cada um com seus campos. **Está fora deste contrato** (escopo F015 = máquina de steps); mas Studio que quiser implementar o wizard do Pipeliner end-to-end precisa de um contrato dedicado. Sugerir `pipeliner-wizard-typeaction.md`.
3. **`pipeliner-service.md` já existe em `atlas/concepts/`** — descreve o serviço de execução, não o wizard. Não conflita; complementa.
4. **Validação cross-step**: o legado não valida que variáveis referenciadas em ações existem no `AddPipeliner.variaveis`. **É um defeito conhecido ou intencional?** Não dá pra saber pela fonte. Sugerir investigação se F015 quiser fechar a lacuna.
5. **Mensagens de erro em UTF-8 quebradas** nas dicas do SQL XML (`"Aç ão"`, `"autenticaç ão"` em `pipeliner.sp_persistirPipeliner.sql:20`). Provável artefato de encoding na captura do source — confirmar com instalação ao vivo antes de replicar literais.
6. **`ReorderableGrid` para a lista de ações (step 2)** é um componente de `@engenharia/react-tools` (F022 no manifest). Studio que quiser implementar este wizard depende de F022 estar pronto antes ou ao mesmo tempo que F015.
7. **`refreshParams` quando vem do tree-click (sidebox)** — `Pipeliner.jsx:89-119` — duplica a lógica de navegação entre steps. Não há atomicidade entre tree-click e step-validate: se o user clica num nó da tree com form inválido no step atual, o wizard navega mesmo assim (perdendo o que foi preenchido). Defeito ou design? Não dá pra inferir.
8. **Não foi escavado se existe segunda instância de "wizard" em outro lugar do legado** (ex.: cadastro em múltiplas etapas no Portal Director — instalação, configuração de empresa, onboarding). Probabilidade baixa (engine schema-driven prefere abas a wizards), mas merece grep cross-source antes de F015 começar. Sugerir backlog.

## Asserções observáveis

Asserções factuais sobre o legado (Pipeliner do AppBuilder), descritas para serem verificadas contra a fonte. **Não prescrevem implementação no Studio** — somente descrevem o que o legado faz hoje, com citação `arquivo:linha`. A decisão de escopo de F015 (ver §⚠️ Decisão pendente) determina quais destas asserções viram mandato de paridade no Studio.

### W1 — Discriminador: o wizard é uma rota dedicada, não uma chave do engine

O engine schema-driven `<GenericPages/>` / `<GenericPage/>` **não reconhece chave `wizard` nem `steps`**. O acesso ao wizard de Pipeliner é puramente por rota da SPA AppBuilder: `path: '/pipeliner'` em `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/index.jsx:141`, registrada com `<PipelinerProvider>` em volta (`:30, :145`) e lazy import do componente em `:27`. Dentro do componente, a bifurcação de step é `switch (indice.indice)` literal em `routes/Pipeliner/Pipeliner.jsx:32-55`. **Não há precedente de `DFtipo='wizard'` no `<GenericPage/>`** — verificável por busca exaustiva: zero hits para `'wizard'`/`'steps'` como discriminantes em `react-tools/src/components/GenericPage/`.

### W2 — Forma do model: não existe model JSON para wizard

O wizard do Pipeliner **não é descrito por nenhum JSON em `acesso.TBmodel_pagina.DFvalor`**. A "model" passada ao step 0 (Home) é um literal hardcoded `pagePipeliner` inline em `routes/Pipeliner/Pipeliner.jsx:188-253` — modela apenas a lista (`<GenericPage/>` clássico), não a máquina de steps. Os formulários dos steps 1/2/3 são JSX imperativo em `AddPipeliner.jsx`, `AddStage.jsx`, `AddAction.jsx` — sem leitura de schema. **Não há atributos esperados de "model wizard"** porque a chave não existe.

### W3 — Estado dos steps: `useState({indice: 0, parametros: {}})` no provider

O estado da máquina vive no contexto `PipelinerProvider`. Inicialização exata em `components/Pipeliner/hooks/usePipeliner.js:6-9`: `useState({ indice: 0, parametros: {} })`. **Sempre começa em 0 (Home).** Nada lido de URL, sessionStorage, localStorage ou cookie — confirmado pela ausência de qualquer outro `useState`/`useEffect` em `usePipeliner.js:4-89`.

Estados auxiliares no mesmo hook: `pageSideBox` (default `'home'`, `:10`), `nameButtonFooter` (default `'Adicionar estágio'`, `:11`), `disableBtnStage` (default `false`, `:12`), `pipelineConfigRef` (default `null`, `:5`).

### W4 — Interface por step: `forwardRef` + `useImperativeHandle` expondo `{validate, savePipeline?, TYPE}`

Cada step é um `forwardRef` que injeta no `componetRef` do orquestrador (`routes/Pipeliner/Pipeliner.jsx:14` — `componetRef = useRef()`; passado como `ref={componetRef}` em `:40, :44, :52`):

- `AddPipeliner` expõe `{validate, savePipeline, TYPE: 'AddPipeliner'}` — `components/Pipeliner/Componentes/AddPipeliner.jsx/AddPipeliner.jsx:43-55`.
- `AddStage` expõe `{validate, TYPE: 'AddStage'}` — `components/Pipeliner/Componentes/AddStage/AddStage.jsx:154-191` (TYPE literal no objeto retornado).
- `AddAction` expõe `{validate, TYPE: 'AddAction'}` — `components/Pipeliner/Componentes/AddAction/AddAction.jsx:79-126`.

A interface é **dinâmica**: `componetRef` é único e sobrescrito a cada troca de step (porque o anterior desmonta no `switch`). `validate()` retorna `{validade: boolean, data: any}` em todos os três; `savePipeline()` existe só em `AddPipeliner`.

### W5 — Navegação: footer "Próximo/Salvar" só avança se `validate()` retorna `validade=true`

O handler do botão azul do footer é `handlevalidate()` em `routes/Pipeliner/Pipeliner.jsx:70-81`. Chama `componetRef.current.validate()` (`:72`), recebe `{validade, data}`, e em `:73` **aborta silenciosamente** se `validade=false` (`if (!validade) return;` — sem `setState`, sem warning, sem mensagem agregada). Em sucesso, ramifica por `TYPE` (`:75-79`):

- `TYPE === 'AddAction'` ou `'AddStage'` → `setIndice(data)` — o próprio step decide o próximo índice (data carrega `{indice, parametros, ...}`).
- Caso contrário (`TYPE === 'AddPipeliner'`) → `Avancar(data)` — orquestrador incrementa `indice.indice + 1` (`:121`) levando `data` como `parametros`.

**Não há fallback global de mensagem** — cada step exibe seus próprios `<span class="span-campo-obrigatorio">` inline.

### W6 — Sidebox tree lateral: navegação não-sequencial via `refreshParams`

Paralelo ao footer, `<SideBox/>` (renderizado em `routes/Pipeliner/Pipeliner.jsx:267-273` aproximadamente, container de `PipelinerProvider`) exibe árvore `pipeline → estágios → ações`. Cliques na árvore disparam `refreshParams(e)` (`:89-119`), que:

- Se `e.hasOwnProperty('id')` (`:93`): faz `POST /appbuilder/proc/pipeliner.sp_consultar_pipeliner_porId` (`:96`), popula `_indice.parametros` com `dados.pipeliner` (`:102, :104`), define `_indice.indice = getIndice(e.page)` se `page === Pipeliner`.
- Senão (`:110-115`): para `e.page === Stage|Action`, faz `_indice = { ...indice, indice: getIndice(e.page), ...e }` — **navega direto pro step do nó clicado** sem passar por validate.

`pipelineConfigRef.current = _indice` (`:117`) e `setIndice(_indice)` (`:118`) aplicam o salto. **Não há atomicidade**: clicar num nó da árvore com form inválido no step atual navega assim mesmo, perdendo o que estava preenchido (porque o `useState` interno do step desmonta).

### W7 — Persistência one-shot: botão "Concluir" no step 1 dispara `sp_persistirPipeliner` (XML envelope)

O wizard **não salva por step**. A única persistência ao banco é disparada pelo botão verde "Concluir", visível apenas em `indice.indice === 1` (renderizado em `routes/Pipeliner/Pipeliner.jsx:158-185` — `DivBottomMain`). Handler: `SavePipeline()` (`:82-87`) → `componetRef.current.savePipeline()` (`AddPipeliner.jsx:57-95`):

1. `POST /appbuilder/proc/pipeliner.sp_persistirPipeliner` (`AddPipeliner.jsx:57-95`) com payload `{Parametro: {idPipeline, nome, urlBase, urlBaseHomolocacao, statusPipeliner, stages, variaveis}}`.
2. Backend `Processa.AppBuilder.Repositories/PipelinerRepository.cs:9-80` serializa para XML envelope e executa a proc `pipeliner.sp_persistirPipeliner` (`sources/engenharia--fabrica--sql--processa-appbuilder/pipeliner/2-procedures/pipeliner.sp_persistirPipeliner.sql:38-140` — parse XML → `#temp_stages` → INSERT/UPDATE em `pipeliner.TBpipeline` e `pipeliner.TBstage` em transação única).
3. Em sequência (`AddPipeliner.jsx:57-95`), se (1) retorna 200, `autoSave(idPipeline)` → `POST /api/pipeliner/savePipelineNewDB`. Falha aqui apenas `warning`, **não bloqueia o término**.

Após sucesso de (1), `SavePipeline()` chama `Cancelar()` (`Pipeliner.jsx:84`) que decrementa pro Home. **Não há tabela intermediária de rascunho** — confirmado pela ausência de qualquer chamada de save em `AddStage.jsx`, `AddAction.jsx`, ou nos handlers de "Salvar Estágio"/"Salvar Ação" (que só fazem `setIndice` no orquestrador).

### W8 — Sem deep-link e sem persistência de sessão: refresh perde tudo

`indice` é puramente `useState` em memória do `PipelinerProvider` (`usePipeliner.js:6-9`). Verificável:

- **Nenhuma escrita** em `sessionStorage`/`localStorage` em `usePipeliner.js:1-92`, `PipelinerContext.jsx:1-48`, `routes/Pipeliner/Pipeliner.jsx:1-300`.
- **Nenhum uso de `useParams`/`useSearchParams`/`useLocation`** para hidratar step a partir da URL — a rota `/pipeliner` em `routes/index.jsx:141` é estática, sem `:step` ou querystring.
- `useEffect([indice.indice])` em `routes/Pipeliner/Pipeliner.jsx:132-156` apenas reage à troca de step para ajustar sidebox+label do botão; **se `indice.indice === 0`, reseta para `{indice: 0, parametros: {}}`** (`:134, :139`).

Recarregar a página, navegar para outra rota e voltar, fechar/reabrir o browser — todos descartam form + posição. O usuário sempre reentra em Home (step 0).

### W9 — Cada step desmonta e remonta: estado vive em `indice.parametros` no orquestrador

O `switch(indice.indice)` em `routes/Pipeliner/Pipeliner.jsx:32-55` retorna JSX diferente por step, então React desmonta o anterior e monta o próximo. O `useState` interno de cada step é **zerado a cada entrada**. Para preservar dados entre steps, cada step **lê `props.parametros` no init** (ex.: `AddPipeliner.jsx:18-36` — `useState(() => ({ ...props.parametros }))`-style) e **devolve dados via `validate().data`** que o orquestrador grava em `indice.parametros` (`Pipeliner.jsx:78, 121`).

`<AddAction/>` tem `key={indice.indexAction}` (`:52`) — força remount quando muda a ação editada (zera form interno; carrega da `props.listActions[indexAction]`).

### W10 — Footer dinâmico: label e visibilidade por step

`DivBottomMain` (`routes/Pipeliner/Pipeliner.jsx:158-185`):

- Botão "Cancelar" — sempre presente exceto no Home (gate em `indice.indice > 0` dentro de `Cancelar()`, `:124`).
- Botão "Concluir" (verde) — visível apenas em `indice.indice === 1` (`:158-185` condicional). Dispara `SavePipeline()`.
- Botão dinâmico (azul) — label vem de `nameButtonFooter` (`'Adicionar estágio'` em step 1, `'Salvar Estágio'` em step 2, `'Salvar Ação'` em step 3 — atribuído em `:141-152`). Dispara `handlevalidate()`. **Desabilitado** quando `indice.indice === 2 && disableBtnStage` (estágio sem ações — gate em `AddStage.jsx:192-194`).

## ⚠️ Decisão pendente (escopo F015)

**F015 não pode entrar em fila para implementação até o curator decidir o escopo.** A escavação confirma que a chave `wizard` que dá nome à feature **não existe no engine schema-driven do legado**. O único wizard concreto é a rota `/pipeliner` do AppBuilder, máquina hardcoded de 4 steps. As 3 opções de escopo:

### Opção (a) — Inventar a chave `wizard` no engine schema-driven do Studio sem precedente legado

Criar um novo discriminante `DFtipo='wizard'` (ou `wizard`/`steps` em algum nível do `DFvalor`) reconhecido por `<GenericPage/>` (ou equivalente do Studio), com um schema declarativo inventado. **Impacto**:

- Sem contrato legado a respeitar — desenho greenfield, decidido pelo time do Studio.
- Nenhum dado existente em `TBmodel_pagina.DFvalor` precisa ser migrado (não há registros wizard hoje).
- Aumenta a superfície do engine: o engine passa a saber renderizar máquinas de estado, validação por step, navegação não-sequencial via tree, persistência one-shot vs. por-step. Cada uma é uma decisão de design nova.
- O Pipeliner do AppBuilder continua existindo como tela hand-rolled — o wizard novo seria para outras features. **Risco**: feature sem caso de uso concreto ainda.

### Opção (b) — Reescrita declarativa da máquina do Pipeliner como componente reusável (não-schema-driven)

Manter o wizard fora do engine schema-driven; criar no Studio um componente `<Wizard/>` (ou equivalente) que receba steps como children/props (não via `TBmodel_pagina.DFvalor`). Usado pelo Pipeliner reescrito e por outras telas hand-rolled futuras. **Impacto**:

- Sub-features que provavelmente precisam ser cobertas para paridade com o Pipeliner: validate-per-step (W4, W5), tree-jump não-sequencial (W6), persist one-shot (W7), reset on refresh (W8), unmount-remount com estado externo (W9), footer dinâmico (W10).
- Bloqueia também por: F022 (`ReorderableGrid`, citado em `AddStage.jsx` para lista de ações) precisa estar pronto.
- Bloqueia por: sub-contrato `pipeliner-wizard-typeaction` (sub-renderer por tipo no step 3 — 6 tipos: Request/SOAP/Query/Log/IMAP/SMTP) não está catalogado.
- Não introduz nova superfície no engine; alinha com o legado.

### Opção (c) — Deprecar F015

Aceitar que a chave `wizard` é fantasma (nome do manifest sem fonte). Marcar F015 `deprecated` no manifest. **Impacto**:

- Se Studio quiser implementar o Pipeliner do AppBuilder, vira uma feature nova (`F-pipeliner-appbuilder` ou similar) com escopo claro: portar a tela `/pipeliner`, não inventar abstração.
- Risco: outras features ainda não escavadas podem precisar de wizard genérico. Curator deve confirmar que nenhuma outra rota do legado opera em modo multi-step **antes** de deprecar (ver Ponto Aberto §8 nesta nota — escavação cross-source ainda não feita).

### Sinalização ao curator

Esta seção é a saída de bloqueio: **F015 fica `todo` no manifest** até o curator escolher (a)/(b)/(c). Smith não pode pegar F015. Designer não deve desenhar UI para F015 antes da decisão (especialmente porque (c) descarta a feature inteira).

## Sources

- [[calendar/notes/2026-05-15.md]]
- [[calendar/notes/2026-05-16.md]]
