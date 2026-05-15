---
title: "TBfuncao_model — catálogo de handlers JS executados via eval"
aliases: [tbfuncao-model, funcao-model, funcoes-model, generic-functions]
tags: [contract, legacy, schema, eval, render-engine, director-studio, F039]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: `acesso.TBfuncao_model`

Tabela que armazena **trechos de código JavaScript em string** indexados por `(chave_pagina, chave)`. O backend serializa todos os registros da página no payload de `/api/model`, e o frontend ([[engine-schema-driven]] §"Como `funcoes` entram no fluxo") executa cada trecho via `eval` quando o componente cadastrado invoca `executeGenericFunctions(chaveFuncao, args)`. É um dos **3 pontos de `eval`** que o Studio precisa eliminar — os outros são `TBmodel_parametro.DFvalor` (F040) e `button.externalAction` inline no JSON do model.

A tabela é o **catálogo de comportamento dinâmico** do AppBuilder: tudo que não couber em "submit padrão do formulário" vira uma `funcao` cadastrada e referenciada por chave no JSON do model (via `useGenericFunction` em campos, botões, modais e ações).

## Citações de fonte

### Definição (DDL)

- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBfuncao_model.sql:1-29` — DDL canônica no scriptpack do Portal Director.
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/0-criacao/acesso.TBfuncao_model.sql:1-29` — DDL idêntica no scriptpack `processa.appbuilder`.
- `sources/engenharia--fabrica--sql--processa-appbuilder/appbuilder/0-criacao/acesso.TBfuncao_model.sql:1-29` — DDL idêntica no scriptpack `appbuilder` standalone.

### Consumo backend (.NET)

- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Repositories/GenericPagesRepository.cs:26-34` — SELECT que alimenta `genericPageModel.Funcoes` na resposta de `POST /api/model` ([[obter-model-pagina]]).
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/Processa.AppBuilder.Repositories/ModelRepository.cs:52-58` — mesmo SELECT no AppBuilder.
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/Processa.AppBuilder.Repositories/ModelRepository.cs:121-122` — `DELETE FROM acesso.TBfuncao_model WHERE DFchave_pagina = @chave_pagina` executado quando uma página é deletada via AppBuilder.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_model_pagina.sql:33-46` — proc T-SQL alternativa (variante via `FOR XML PATH`) que também enxerga a tabela; ainda referencia a coluna `DFid_pagina` que **foi dropada** pela DDL canônica (linhas 19-29 da DDL). Inconsistência conhecida — a proc XML provavelmente não roda no schema atual.

### Consumo frontend (react-tools)

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPages/GenericPages.js:78-86, 113-117` — pós-fetch: `functionsArray.current = response.dados.funcoes` (ref, não state) e cascateia via prop `genericFunctionsArray` para `<GenericPage/>`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:61-98` — `executeGenericFunctions(index, args, _genericFunctionsArray, genericProps)`: localiza o trecho, faz `replaceAll('paramN', argN)`, executa `eval(funcaoStr)`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:390-409` — construção do array `genericFunctionsProps` (a "API de runtime" exposta para o código eval; ver §"Escopo de execução" abaixo).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:438-449` — chamada de `executeGenericFunctions` quando um campo/botão tem `useGenericFunction: "<chave>"` configurado no model.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:697-712` — invocação a partir de `modalObject.useGenericFunction` (botão dentro de modal aninhado).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/hooks/useGenericFormActions.js:134-148` — invocação a partir de actions declarativas (`action.useGenericFunction`).

### Seed (alimentação)

- `sources/engenharia--fabrica--sql--portal-aws/agent/alimentacao/insert_pagina_gerenciar_agendamento.sql:556-722` — 3 funções para `agent.age_gerenciar-agendamento` (`handle_submit_*`, `handle_update_*`, `handle_cancelar_*`).
- `sources/engenharia--fabrica--sql--portal-aws/agent/alimentacao/insert_pagina_realizar_agendamento.sql:454-580` — 1 função para `agent.age_realizar-agendamento` (`handle_submit_realizar_agendamento`).

## Estrutura da tabela

| Coluna | Tipo | Obrigatório | Semântica | Valores legais | Vem de |
|---|---|---|---|---|---|
| `DFid_funcao_model` | `INT IDENTITY` (PK) | sim | Surrogate key | auto-incremento | engine |
| `DFchave` | `NVARCHAR(255)` NULL | de facto sim | Nome lógico do handler. É o que o JSON do model referencia em `useGenericFunction: "<chave>"`. Convenção snake_case por verbo+contexto (ex: `handle_submit_gerenciar_agendamento`). | string livre — não há check constraint nem unique index | seed/UI AppBuilder |
| `DFchave_pagina` | `NVARCHAR(255)` NULL | de facto sim | FK informal para `acesso.TBpagina.DFchave` / `acesso.TBmodel_pagina.DFchave_pagina`. Filtro usado pelo repositório `.NET` para montar `Funcoes` da página. | string livre — sem FK declarada | seed/UI AppBuilder |
| `DFvalor` | `NVARCHAR(MAX)` NULL | de facto sim | Trecho de **JavaScript em texto puro** que será passado a `eval()`. Pode conter `paramN` placeholders que `executeGenericFunctions` substitui textualmente pelos `args` recebidos. | qualquer JS válido no escopo definido em §"Escopo de execução" | autor humano via AppBuilder ou via seed SQL |

### Coluna removida historicamente

- `DFid_pagina` — `ALTER TABLE ... DROP COLUMN DFid_pagina` no final do script DDL (linhas 19-29). A migração mudou a chave de relacionamento de FK numérica (`DFid_pagina → TBpagina.DFid_pagina`) para chave textual (`DFchave_pagina → TBpagina.DFchave`). A proc `acesso.obter_model_pagina` ainda referencia `DFid_pagina` no SELECT XML — código morto/quebrado convivendo com a coluna nova.

### Índices, FKs e constraints

- **PK** em `DFid_funcao_model`.
- **Nenhuma FK declarada** para `TBpagina` nem `TBmodel_pagina`. Integridade é "por convenção" — orfãos são possíveis se uma página for deletada por caminho diferente de `acesso.deletar_pagina` ([[obter-model-pagina]] §"deletar_pagina").
- **Nenhum unique index** em `(DFchave_pagina, DFchave)`. Em tese é possível ter duas funções com a mesma chave na mesma página; o frontend pega a **primeira** (`.find` em `genericFunctionsArray`).
- **Nenhum default**, **nenhum trigger**.
- **Sem column store**, **sem fulltext** — `DFvalor` é `NVARCHAR(MAX)` cru.

## Como o react-tools consome

### Pipeline

1. `<GenericPages>` faz `POST /api/model` ([[obter-model-pagina]]).
2. Backend popula `resp.dados.funcoes = [{IdFuncao, ChaveFuncao, ChavePagina, Valor}, ...]` com todas as linhas de `TBfuncao_model` para a página.
3. Após `JSON.parse` do model, `<GenericPages>` armazena o array em **`useRef`** (não state — não dispara re-render):
   - `GenericPages.js:84-86` → `functionsArray.current = response.dados.funcoes;`
4. Repassa como prop `genericFunctionsArray` para `<GenericPage>`.
5. `<GenericPage>` define `executeGenericFunctions(index, args, _genericFunctionsArray, genericProps)`:
   - Resolve `funcaoStr = genericFunctionsArray.find(x => x.chaveFuncao.toString() === index).valor`.
   - Para cada `arg`, faz `funcaoStr.replaceAll('paramN', arg)` — substituição **textual**, não AST.
   - Executa `eval(funcaoStr)` no escopo do componente.
6. `executeGenericFunctions` é repassada como prop para `<GenericForm>`, `<GenericActionForm>`, etc., para invocação a partir de:
   - submit do form (`useGenericFunction: "<chave>"` no `genericform`);
   - ação declarativa em campo (`action.useGenericFunction`);
   - botão de modal aninhado (`modalObject.useGenericFunction`).

### Contrato de invocação

```
executeGenericFunctions(
  index,          // string — DFchave do handler. Matched via .toString() === index (idempotente para string/number)
  args,           // array — substituído por replaceAll('paramN', arg) antes do eval
  _genericFunctionsArray, // referência completa (passada de novo, embora a closure já tenha)
  genericProps    // array indexado — a "API de runtime" (ver §"Escopo de execução")
)
```

**Retorno**: `''` em sucesso; `undefined` em erro (catch faz `console.error` e engole).

### Resolução de `paramN`

- Substituição é `String.prototype.replaceAll('paramN', argN)` — **textual**, sem AST.
- Se um arg é objeto, a substituição produz `[object Object]` quebrando o JS. Args são esperados primitivos. Não há serialização automática.
- Não há limite de N declarado; convenção observada usa `param0..param14`.
- Risco: o nome `paramN` colide com qualquer identificador que termine assim no código. Por exemplo, `myparam0` vira `my<arg0>`. Convenção é não usar `paramN` como sufixo.

### Escopo de execução (`eval` em `GenericPage.js:67-93`)

O `console.log` no início da função expõe explicitamente as variáveis no escopo léxico do `eval` — esse `console.log` **é documentação executável** do contrato:

| Identificador disponível | Origem | Tipo | Uso típico |
|---|---|---|---|
| `loggedUserData` | `JSON.parse(localStorage.getItem('@director/usr'))` | objeto | ler `id`, `cnpj`, `email`, `usuarioSupply`, `fornecedorCNPJ` |
| `userPreference` | `GenericPageContext` | objeto | preferências do usuário |
| `modelRef` | `GenericPageContext` | ref para o model | leitura do JSON parseado |
| `useAclHook` | `useAcl()` | objeto de hook | checagens de ACL |
| `useBlurHook` | `useBlur()` | objeto de hook | controlar overlay/loading global |
| `setCalendarCurrentFilter` | `<GenericCalendar/>` | função | re-fetch do calendário |
| `cleanForm` | `<GenericForm/>` | função | resetar form |
| `getFormValues` | `<GenericForm/>` | função | ler valores do form |
| `danger` | `useNotifications()` | função | toast erro |
| `get` | `useFetch()` | função | GET ad-hoc |
| `genericProps` | parâmetro da chamada | **array** indexado | API principal de runtime |
| `_genericFunctionsArray` | parâmetro | array | redundante (mesmo do escopo) |
| `genericFunctionsArray` | closure | array | catálogo completo de funções |

`genericProps` (montado em `GenericForm.js:391-409`) é um **array posicional** — código eval acessa por **índice numérico**, não por nome:

| Índice | Identidade | Fonte |
|---|---|---|
| `genericProps[0]` | `post` | `useFetch().post(url, body, onSuccess, onError)` |
| `genericProps[1]` | `get` | `useFetch().get(url, onSuccess, onError)` |
| `genericProps[2]` | `success` | toast verde |
| `genericProps[3]` | `warning` | toast amarelo |
| `genericProps[4]` | `danger` | toast vermelho |
| `genericProps[5]` | `getFormValues` | snapshot dos valores do form |
| `genericProps[6]` | `setPageBlur` | overlay global de loading |
| `genericProps[7]` | `console.log` | (comentário no código indica que era reservado para `sendEmail()`) |
| `genericProps[8]` | `handleCloseModalForm` | fechar modal de form |
| `genericProps[9]` | `setCurrentFilter` | re-fetch do grid |
| `genericProps[10]` | `cleanForm` | resetar form |
| `genericProps[11]` | `handleResetForm` | resetar form (variante) |
| `genericProps[12]` | `() => actionModalState` | snapshot do action modal |
| `genericProps[13]` | `handleCloseActionModal` | fechar action modal |
| `genericProps[14]` | `getFormState` | estado completo do form |

> O acesso por índice numérico é o pior tipo de API — qualquer reordenação do array em `GenericForm.js` quebra todas as funções cadastradas. Não há TypeScript, não há nome, não há contrato declarado.

Adicionalmente, o eval **vê o escopo global do browser**: `window`, `document`, `localStorage`, `sessionStorage`, `fetch`, `setTimeout`, `setInterval`, `Date`, `JSON`, etc.

## Inventário real (ambiente Área 52)

Probe executado em `172.27.0.121\SQL2k19` em 2026-05-15 cobriu **148 bases** (`DB%` online). Resultado:

| Métrica | Valor |
|---|---|
| Bases que contêm a tabela `acesso.TBfuncao_model` com >0 linhas | 53 |
| Bases que contêm a tabela com 0 linhas | 95 |
| Total de linhas somadas (52 bases × 4 + 1 base × 4) | **216** |
| Linhas por base que tem dados | **exatamente 4 em todas as 53** |
| Chaves de página distintas (em qualquer base) | 2 — `agent.age_gerenciar-agendamento`, `agent.age_realizar-agendamento` |
| Chaves de função distintas | 4 |
| Tamanho mínimo (`LEN(DFvalor)`) | 806 chars |
| Tamanho máximo | 4773 chars |

Diagnóstico: **toda função em produção é réplica do seed do módulo `agent` (AWS — agendamento de entrega)**. Nenhum cliente cadastrou função própria via AppBuilder. As 4 funções são as mesmas seed-adas pelos scripts `insert_pagina_*_agendamento.sql`. Bases que não rodam o app `agent` têm a tabela vazia.

### Amostras (de `DBengenharia_Director_RC`, schema canônico)

| `DFid_funcao_model` | `DFchave_pagina` | `DFchave` | `LEN(DFvalor)` |
|---|---|---|---|
| 5 | `agent.age_gerenciar-agendamento` | `handle_submit_gerenciar_agendamento` | 933 |
| 6 | `agent.age_gerenciar-agendamento` | `handle_update_gerenciar_agendamento` | 4773 |
| 7 | `agent.age_gerenciar-agendamento` | `handle_cancelar_agendamento` | 806 |
| 8 | `agent.age_realizar-agendamento` | `handle_submit_realizar_agendamento` | 4334 |

**Primeiros ~200 chars de cada** (citados do seed em `insert_pagina_gerenciar_agendamento.sql:564` e `insert_pagina_realizar_agendamento.sql:462`):

- `handle_submit_gerenciar_agendamento` → `var param = genericProps[14](); ... if (dataAgendamento === dataAtual) { var body = {...param, status: "DC"}; ... }` — valida data atual, monta body, faz `POST /proc/agent.persistir_agendamento`.
- `handle_update_gerenciar_agendamento` → `genericProps[6](true); var param = genericProps[14](); ... POST /proc/agent.sp_validar_campos_obrigatorios_agendamento → POST /proc/agent.persistir_agendamento → constrói <div class="modal-dialog"> via document.createElement, mostra modal de comprovante, faz fetch direto a /api/proc/agent.sp_consultar_emails_fornecedor, abre window.open('about:blank').document.write(html)`.
- `handle_cancelar_agendamento` → `var actionFormData = genericProps[12](); var genericFormData = genericProps[14](); ... POST /proc/agent.cancelar_agendamento → setTimeout 500ms → genericProps[13]("cancelarAgendamento")`.
- `handle_submit_realizar_agendamento` → mesma forma do `update` mas usando `genericProps[10]` (cleanForm) em vez de `setCalendarCurrentFilter`. Constrói modal HTML inline, faz `fetch` direto, abre `window.open` e injeta HTML do email recebido do backend.

## Padrões identificados

Métricas heurísticas (4 linhas em `DBengenharia_Director_RC`):

| Padrão | Hits | Comentário |
|---|---|---|
| `genericProps[...]` | 4/4 | universal — toda função usa a API de runtime |
| `loggedUserData` | 3/4 | leitura de identidade do usuário |
| `setTimeout` | 2/4 | usado para encadear callbacks após sucesso |
| `document.*` | 2/4 | `document.createElement`, `document.body.append`, `document.getElementById` — manipulação direta de DOM (modal customizado) |
| `window.*` | 2/4 | `window.open('about:blank')` para abrir aba e injetar HTML |
| `localStorage` | 2/4 | leitura de `@director/tkn` (JWT) |
| `sessionStorage` | 2/4 | leitura de `@director/domain` |
| `fetch(` | 2/4 | bypass do `useFetch` — chama `fetch` global direto com headers manuais |
| `setCalendarCurrentFilter` | 2/4 | uso do identificador do escopo léxico (não via `genericProps`) |
| `eval(` aninhado | 0/4 | nenhum `eval` dentro de `eval` |
| `new Function` | 0/4 | nenhum |
| `modelRef` | 0/4 | nenhum acesso direto ao modelRef |
| `useAclHook` | 0/4 | nenhum |
| Bibliotecas externas (`moment`, `axios`, `jQuery`) | 0/4 | nenhuma — só APIs nativas do browser |

### Convenção de nomeação

- Padrão observado: `handle_<verbo>_<contexto>`. Ex: `handle_submit_*`, `handle_update_*`, `handle_cancelar_*`.
- Não é enforçado por código nem schema. Outros padrões poderiam existir em apps fora do `agent`, mas no ambiente Área 52 não há.

### Side-effects

- Todas as 4 funções fazem `POST` para procs SQL via `genericProps[0]` (`/proc/<schema>.<nome>`).
- 2 das 4 fazem **side effects de DOM** (modal HTML inline) que **bypassam o React** — manipulam `document` direto. Risco alto: o React não conhece esse modal, não pode desmontá-lo em route change.
- 2 das 4 usam **`fetch` global em vez de `useFetch`** — perdem injeção de headers padrão (Bearer/Domain feitos manualmente).
- Encoding observado no seed: caracteres acentuados estão como `?` mojibake (`Aten??o`, `opera??o`) — o seed foi salvo em encoding inadequado e essa string vai para `eval` literal. Bug latente do legado.

## Estratégia para Director.Studio (recomendação alta-nível, sem decisão final)

> **Não-decisão**: a escolha entre as opções abaixo é do Curator + Smith. Esta seção lista trade-offs descritivos baseados no inventário real.

### Opção A — Registry estático de handlers (transpile-time)

Cada handler vira uma função TS de primeira-classe, registrada em um `Map<chave, handler>`. O JSON do model continua referenciando `useGenericFunction: "handle_submit_..."`, mas o runtime resolve no map em vez de eval.

- **Prós**: zero eval; tipagem dos args; bundling tree-shakeable; LSP/refactor funciona; testes unitários por handler.
- **Contras**: cadastro via AppBuilder some — para adicionar handler novo, é necessário PR de código (não dá pra editar no banco e ver no browser).
- **Compatível com inventário atual**: sim — as 4 funções de produção podem ser portadas como 4 arquivos TS. Cobre 100% do uso observado em Área 52.
- **Considerações**: o cliente Processa hoje **não cadastra funções no AppBuilder** (todas vêm de seed dev). A "feature de cadastro dinâmico" é teórica neste recorte.

### Opção B — Sandbox seguro (QuickJS-wasm / Worker)

Manter o JSON com strings JS, executar em sandbox isolado (QuickJS via wasm) com superficies controladas (sem `document`, sem `window`, sem `fetch` direto).

- **Prós**: preserva o modelo de cadastro dinâmico; mitiga RCE.
- **Contras**: precisa reescrever 2 das 4 funções (as que usam `document.createElement`/`window.open`/`fetch`) porque sandbox não dá acesso a DOM/global. Custo cognitivo + performance (carregar runtime wasm).
- **Compatível com inventário atual**: parcial. As 2 funções simples (`handle_cancelar`, `handle_submit_gerenciar`) rodariam direto; as 2 complexas (`handle_update_*`, `handle_submit_realizar_*`) precisam ser quebradas em "API de modal" exposta pelo host.

### Opção C — Reescrita declarativa (sem JS user-supplied)

Substituir cada handler por uma **descrição declarativa** (JSON) de "qual proc chamar com qual body e que ação tomar no sucesso/erro". O modal de comprovante vira componente nomeado, não HTML inline.

- **Prós**: zero JS dinâmico, contrato auditável, internacionalizável.
- **Contras**: requer enriquecer o schema do model com primitivas para os padrões observados (validação prévia, modal de confirmação com fetch encadeado, abrir HTML em nova aba). É o caminho mais longo mas o mais sustentável.
- **Compatível com inventário atual**: sim com esforço — os 4 handlers caem em 2 templates: "submit-com-validação" e "submit-com-validação-e-comprovante". Inventário de Área 52 sugere que **2 primitivas declarativas cobrem 100%**.

### Conclusão descritiva (não decisão)

O inventário **rompe a premissa** de que `TBfuncao_model` justifica um sandbox completo. Com 4 funções de produção, **53 réplicas idênticas**, escritas todas pela própria equipe Processa via seed SQL, o caso de uso "cliente cadastra handler arbitrário em produção" **não está exercido**. Smith + Curator decidem se mantêm a porta aberta (A ou B) ou colapsam para C.

## Riscos

| Risco | Severidade | Notas |
|---|---|---|
| Reordenar `genericFunctionsProps` em `GenericForm.js:391-409` quebra silenciosamente todas as funções | alta | `genericProps[N]` é posicional; nenhum teste cobre isso |
| Funções acessam `document`/`window`/`fetch` direto — render fora do React tree | alta | modal de comprovante sobrevive a navegação até clicar; pode vazar entre páginas |
| `replaceAll('paramN', arg)` quando arg é objeto produz `[object Object]` | média | nenhuma das 4 funções de produção passa objeto — mas o contrato não impede |
| Encoding do seed (`Aten??o`) vai para eval cru e aparece no toast | baixa | bug de UX; corrigível mudando encoding do .sql |
| Sem FK entre `TBfuncao_model.DFchave_pagina` e `TBpagina.DFchave` | baixa | órfãos possíveis se delete fora da `deletar_pagina` |
| Sem unique `(chave_pagina, chave)` | baixa | duplicação muda comportamento (vence a primeira do `.find`) |
| `acesso.obter_model_pagina` ainda referencia `DFid_pagina` (coluna dropada) | média (legado) | a proc XML alternativa não funciona; só o repositório .NET funciona |
| RCE-by-design: quem escreve em `TBfuncao_model` executa JS em todos browsers | alta (conceitual) | mitigado por ACL da edição via AppBuilder; sem auditoria de quem escreveu |
| Migração precisa rodar 53 bases em paralelo | média (logística) | trivial se forem `INSERT/UPDATE` idempotentes, complexo se mudar schema |

## Relações com o ecossistema

- Consome de: nada (tabela folha).
- É consumido por: `acesso.TBmodel_pagina` indiretamente — toda função se liga a `(DFchave_pagina = DFchave_pagina do model)`.
- Lido por: `GenericPagesRepository.ObterModel` ([[obter-model-pagina]]); cascaded para `<GenericPages>` → `<GenericPage>` → `<GenericForm>` ([[engine-schema-driven]]).
- Deletado por: `ModelRepository.DeleteModel` em cascata quando uma página é apagada via AppBuilder ([[obter-model-pagina]] §"DeleteModel").
- Co-referenciado com: [[engine-schema-driven]] (descreve os 3 pontos de eval); [[obter-model-pagina]] (payload de resposta inclui `funcoes`); F040 ([[engine-schema-driven]] §`modelParams`) — análogo para `TBmodel_parametro`.

## Notas de implementação para o Studio

- O dispatch é por **chave string** + **índice posicional em array** — Studio define se preserva ambos.
- O escopo léxico do eval **é** a API real — `genericProps`, `loggedUserData`, `useAclHook`, `modelRef` etc. são lidos diretamente sem indireção. Migrar para registry exige listar tudo isso como **parâmetros explícitos** do handler.
- Funções **não retornam valor** observável (o `return ''` é descartado). Side-effects via callbacks de `genericProps[0]` (post). Studio decide se o novo handler é `async (ctx) => void` ou retorna Promise.
- Funções podem **invocar outras funções** indiretamente: `executeGenericFunctions` é repassada via `genericProps`/closure, mas no inventário atual nenhuma das 4 usa isso. Studio pode optar por proibir.
- Não há `try/catch` interno nas funções — o catch externo em `executeGenericFunctions` engole erro e só faz `console.error`. UX de falha é silenciosa.

## Sources

- [[calendar/notes/2026-05-15.md]]
