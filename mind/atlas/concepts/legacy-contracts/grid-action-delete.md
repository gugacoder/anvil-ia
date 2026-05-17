---
title: "gridAction `delete` — fluxo canônico de exclusão a partir de linhas selecionadas"
aliases: [grid-action-delete, datagrid-delete, gridaction-delete, delete-flow]
tags: [contract, legacy, react-tools, datagrid, datagrid2, grid-actions, delete, director-studio]
sources:
  - "calendar/notes/2026-05-17.md"
created: 2026-05-17
updated: 2026-05-17
---

# Contrato: gridAction `delete`

Sub-contrato de [[model-valor-datagrid]] §"GridAction" / §"Universo de action". Cobre F045 do manifest. Documenta o **fluxo canônico de exclusão** que o legado implementa no `<DataGrid/>` v1 (`react-tools/components/DataGrid/DataGrid.js`) — o `<DataGrid2/>` deixa o caso `'delete'` **stubado** (handler comentado em `Actions.js:22-25`), de modo que toda a semântica viva está em v1. O nó `gridAction` com `action:'delete'` é válido em ambos os schemas (`datagrid` e `datagrid2`), mas só executa em `datagrid`.

Comportamento em uma linha: clique no item do dropdown abre **modal de confirmação `danger`**; ao confirmar, dispara POST contra `execProc` (ou `api`) do `gridAction`, com payload derivado das linhas selecionadas; reage por status/sucesso, traduz erro de **FK violation** para mensagem amigável, fecha o modal e **força refresh do grid** via `sendGridRequest('resetReactiveState')` 700 ms depois. Não há soft-delete embutido — a semântica de exclusão fica 100% na proc invocada (hard-delete, soft-delete via `UPDATE DFativo`, ou validação-com-rejeição, todas legítimas).

## Citações de fonte

- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:83-84` — estado `modalConfirmDelete` (visibilidade) e `modalDeleteConfig` (payload da action selecionada).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:316-323` — `handleModalConfirmDelete(param)`: `'open'` mostra modal; qualquer outro valor (incl. `undefined`) limpa `modalDeleteConfig` e fecha.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:325-362` — `sendPostRequest(config)`: monta body, prefixa `/proc/` quando aplicável, POST, trata resposta, fecha modal ao final (sempre).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:341-343` — refresh: `setTimeout(() => sendGridRequest('resetReactiveState'), 700)` ao sucesso.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:344-359` — política de erro: status 500 + dados contendo `'The DELETE statement conflicted with the REFERENCE constraint'` → `danger("Não foi possivel excluir o registro, pois ele é referenciado em outros registros")`; outros 500 → mesma `message` default; demais (status ≠ 500) → `warning(dados)` cru.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:383-386` — branch `case 'delete'` do `handleGridActions`: guarda `config` em `modalDeleteConfig` e abre o modal.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:485-494` — JSX do `<Modal/>` de confirmação: `title='Confirmar Exclusão'`, `color='danger'`, corpo literal `"Tem certeza que deseja realizar a exclusão?"`, `onConfirm={() => sendPostRequest(modalDeleteConfig)}`, `onClose` e `onCancel` apontam para `handleModalConfirmDelete` (sem `'open'` → fecham).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:42` — prop `selectedRows = []` (linhas inteiras, não só PKs) entrando no DataGrid.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:326-331` — discriminante `config.sendSelectRows`: se true, body é `{ rows: selectedRows }`; senão, `{ ids: selected.toString() }` (string CSV de PKs).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:332-335` — resolução do endpoint: `resourceString = config.execProc || config.api`; se a string **não contém** `'/proc/'` **e** `config.isNotProcedure` é falsy, prefixa `/proc/`. Ou seja, dá pra escapar de proc passando `isNotProcedure:true` (endpoint REST direto) ou já mandando uma string que contém `/proc/`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:68` — `useNotifications` provê `danger/warning/success`; toast lê string em `dados` no sucesso.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/Actions.js:22-25` — confirmação de que o `case 'delete'` no `<DataGrid2/>` é stub (corpo todo comentado: `setModalDeleteConfig(config)` + `handleModalConfirmDelete('open')`).
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/1-alimentacao/insert_datagrid_action.sql:11` — catálogo oficial da chave: `('delete','Executar procedure de exclusão*')`. O asterisco no rótulo é parte do dado (sinaliza diferença sintática vs `execProc`).
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/2-procedures/appbuilder.sp_deletar_aplicacoes.sql:1-60` — proc canônica de exclusão: aceita `@xml`, extrai `<ids>`, valida pré-condições (FK lógica via EXISTS), `DELETE` real, retorna `<Resposta><Status>200</Status><Sucesso>true|false</Sucesso><Dados>{mensagem}</Dados></Resposta>`. `Sucesso=false` com `Status=200` é o caminho "rejeição validada" (não é erro de servidor; é regra de negócio).
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Cadastros/Aplicacoes.jsx:87-94` — uso real: `{ title: 'Excluir', action: 'delete', isNotBatchAction: true, execProc: '/appbuilder/proc/appbuilder.sp_deletar_aplicacoes' }`. Note: o `execProc` aqui **já inclui** `/proc/`, então a regra `:332-334` não re-prefixa.
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Cadastros/Modulos.jsx:114` — outro consumidor.
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Cadastros/ConnectionStrings.jsx:100` — idem.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/routes/Acessos/NivelAcesso/index.jsx:294` — consumidor no Director portal.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardCrud.js:137` — uso fora do AppBuilder (pacote `react-tools` exporta o `<DataGrid/>` como public API; consumidores externos existem).

## Anatomia do `gridAction` quando `action='delete'`

Reaproveita o tipo `GridAction` de [[model-valor-datagrid]] §GridAction; abaixo só os campos **interpretados** no caminho `delete`:

| Campo | Tipo | Obrigatório | Semântica | Default / Coerção |
|---|---|---|---|---|
| `title` | string | sim | Label do botão no dropdown `<Actions>` (ex. `"Excluir"`) | — |
| `action` | `'delete'` | sim | Discriminador do switch | — |
| `execProc` | string | sim na prática | Endpoint a invocar no POST | se ausente, cai em `config.api` (mas `gridAction` em produção sempre traz `execProc`) |
| `api` | string | opcional | Endpoint fallback se `execProc` ausente | — |
| `isNotProcedure` | boolean | não | Se true, **não** prefixa `/proc/` mesmo quando faltar | default false → prefixa quando string crua |
| `sendSelectRows` | boolean | não | Se true, payload é `{ rows: selectedRows }` (objetos inteiros); senão `{ ids: selected.toString() }` (PKs CSV) | default false → modo `ids` |
| `isNotBatchAction` | boolean | não | (v1 grid) Se true, action pode rodar com 1 selecionado (não exige multi) | default false |

> Campos do `GridAction` genérico que **não se aplicam** ao `delete`: `idModal`, `path`, `actionRule.condition/value` (não consultados nesse branch — `actionRule` continua válido como filtro de visibilidade da ação, vide [[model-valor-datagrid]] §GridAction, mas não altera o fluxo de execução).

## Pré-condições para habilitar o botão

Render do dropdown em `Header/DataGridHeader` segue a mesma regra do `<DataGrid2/>` (vide [[model-valor-datagrid]] §Toolbar):

- `isSelectable=true` (sem checkbox, sem `selected[]`, sem botão).
- `gridActions.length > 0`.
- Disabled-state do `<button class='dropdown-item'>` segue `selected?.length === 0`. Não há flag separada para `delete` — segue a regra geral.

## Modal de confirmação

| Item | Valor (literal) |
|---|---|
| Componente | `<Modal/>` interno do `react-tools` |
| `title` | `'Confirmar Exclusão'` |
| `color` | `'danger'` |
| Corpo | `'Tem certeza que deseja realizar a exclusão?'` (texto cru, sem interpolação do número de selecionados nem do nome da entidade) |
| Botão confirmar | aciona `sendPostRequest(modalDeleteConfig)` |
| Botão cancelar/fechar/backdrop | aciona `handleModalConfirmDelete()` sem `'open'` → limpa `modalDeleteConfig=null` e `modalConfirmDelete=false` |
| `id` do modal | `uuid()` (regerado a cada render) |

> A mensagem **não diz quantas linhas serão excluídas** nem **quais**. O usuário aceita a exclusão "às cegas" relativamente ao conjunto — só sabe o que selecionou na grid antes de clicar.

## Request

| Item | Valor |
|---|---|
| Método | POST |
| URL bruta | `resourceString = config.execProc \|\| config.api` |
| Normalização de URL | se `!resourceString.includes('/proc/') && !config.isNotProcedure` → `resourceString = '/proc/' + resourceString` |
| Hook | `_postAsync` do `useRequestPool` (envia `Authorization` injetado pelo pool — mesmo trilho de [[obter-model-pagina]]) |
| Body — modo padrão | `{ ids: selected.toString() }` — `selected[]` é array de PKs descobertas via `getUniqueProp` ([[model-valor-datagrid]] §Estado); `.toString()` produz CSV (`"3,7,12"`). |
| Body — modo `sendSelectRows:true` | `{ rows: selectedRows }` — `selectedRows[]` é array de objetos `row` inteiros (todas as colunas). |

> **`filter` não é enviado.** Diferente do POST de listagem do grid, a request de delete **não anexa** `filter` corrente nem `additionalFilterParams`. A proc só recebe PKs (ou linhas inteiras).

> **Nada de CSRF token, nada de método HTTP DELETE.** É sempre POST. O verbo "delete" é semântico da proc, não do HTTP.

## Response

Envelope canônico do Processa (mesmo de toda proc) — vide [[obter-model-pagina]] §Envelope e exemplo em `sp_deletar_aplicacoes.sql`:

```
{
  "status": 200 | 500 | <outro>,
  "sucesso": true | false,
  "dados": string | object
}
```

Branches de tratamento em `sendPostRequest:339-360`:

| Condição | Ramificação | UI |
|---|---|---|
| `status===200 && sucesso===true` | Sucesso lógico | `success(dados)` (toast verde com `dados` como mensagem) + `setTimeout(() => sendGridRequest('resetReactiveState'), 700)` (refresh do grid em 700 ms, **reseta página para 1**) |
| `status===200 && sucesso===false` | Rejeição validada (regra de negócio — ex. FK lógica detectada pela própria proc) | **cai no `else` externo, sub-branch `status !== 500`** → `warning(dados)` (toast amarelo) |
| `status===500 && dados` contém `'The DELETE statement conflicted with the REFERENCE constraint'` | FK violation **não tratada pela proc** (DELETE bateu em RI do SQL Server) | `danger("Não foi possivel excluir o registro, pois ele é referenciado em outros registros")` + `console.error(dados)` |
| `status===500` (qualquer outro `dados`) | Erro server-side genérico | `danger("Não foi possível realizar a operação.")` + `console.error(dados)` |
| Outros status (4xx etc.) | Idem `status===200 && sucesso===false` | `warning(dados)` |

> Em **todos** os ramos, `handleModalConfirmDelete()` (sem `'open'`) é chamado ao final (`:361`) — fecha o modal e limpa `modalDeleteConfig`. Nenhum ramo deixa o modal aberto.

> O toast `success(dados)` é a única vez em que `dados` (texto da proc, ex. `"Aplicação excluida com sucesso."`) chega ao usuário. Erros 500 **descartam** `dados` do toast (vai só para `console.error`); o usuário vê só a mensagem hard-coded.

## Refresh do grid pós-sucesso

- Único trigger: 1 timer de **700 ms** após `success(dados)`.
- Ação: `sendGridRequest('resetReactiveState')` — re-fetcha página 1 e **zera sorting/refreshTime** (`reactiveState` reseta para `{currentPage:1, currentLimit, sorting:{}, refreshTime:null}` — vide `:176-183`).
- `selected[]` **não é zerado explicitamente** pelo `delete`. Como o re-fetch substitui `rows`, as PKs em `selected[]` que não existem mais na página viram seleção órfã (mesmo bug observado em [[model-valor-datagrid]] §Seleção). Próximo clique em qualquer linha consome o `selected[]` antigo via `selectRow` (que toggla).

## Variações por consumidor (observadas)

| Consumidor (página) | `execProc` | Modo body | `isNotBatchAction` | Proc-side: |
|---|---|---|---|---|
| AppBuilder · Aplicações | `/appbuilder/proc/appbuilder.sp_deletar_aplicacoes` | `ids` (CSV) | true | valida FK lógica via EXISTS, retorna `sucesso:false` quando há módulos |
| AppBuilder · Módulos / ConnectionStrings / SelectQuery / ObjetosDashboard / Clientes / Mobile.Modulos / Mobile.Aplicacoes / Mobile.ModelPaginas / ModelPaginas / Pipeliner | (paths análogos `appbuilder.sp_deletar_*`) | `ids` (CSV) | true (predominante) | varia por proc |
| Director · Conexoes / NivelAcesso | `acesso.sp_deletar_*` | `ids` (CSV) | true | varia |
| DashBoardCrud (`react-tools`) | proc do cliente | `ids` (CSV) | — | — |

Padrão dominante: **`ids` CSV + proc `sp_deletar_<entidade>` que aceita `@xml` com `<ids>`** e devolve envelope. `sendSelectRows:true` não foi observado em nenhum dos consumidores indexados (presença documentada no código mas sem call site real conhecido — registrar como ambíguo).

## Asserções observáveis (IDs estáveis para teste)

| ID | Asserção |
|---|---|
| **D1** | Com `isSelectable=true` e `gridActions[].action='delete'`, o dropdown `<Actions>` é renderizado e contém um botão cujo label é exatamente `gridAction.title`. |
| **D2** | Com `selected.length===0`, o botão de delete está `disabled`. |
| **D3** | Com `selected.length>=1`, clicar no botão de delete abre um `<Modal/>` com `title='Confirmar Exclusão'`, cor `danger`, e corpo de texto `'Tem certeza que deseja realizar a exclusão?'`. |
| **D4** | Cancelar o modal (close, cancel, backdrop) **não dispara nenhuma request**; o estado `modalDeleteConfig` volta a `null` e o modal fecha. |
| **D5** | Confirmar o modal dispara **exatamente 1** POST para a URL resultante da normalização (`config.execProc \|\| config.api`, com prefixo `/proc/` quando aplicável e `!isNotProcedure`). |
| **D6** | Quando `sendSelectRows` é falsy/ausente, o body do POST é exatamente `{ ids: <selected como CSV de strings> }` (ex. `selected=[3,7]` → `{ids:"3,7"}`). |
| **D7** | Quando `sendSelectRows===true`, o body do POST é `{ rows: selectedRows }` (objetos inteiros das linhas selecionadas, **sem** `ids`). |
| **D8** | O body do POST de delete **não** contém as chaves `filter`, `additionalFilterParams`, `pagina`, `limite`, `ordenacao` (delta vs request de listagem). |
| **D9** | Resposta `{status:200, sucesso:true, dados:"<texto>"}` → toast verde com texto exatamente `dados`; **após 700 ms**, o grid re-fetcha com `pagina=1`, `sorting=` (vazio), `limite` preservado. |
| **D10** | Resposta `{status:200, sucesso:false, dados:"<texto>"}` → toast **amarelo** (`warning`) com texto `dados`; **não** dispara re-fetch; modal fecha. |
| **D11** | Resposta `{status:500, dados:"... The DELETE statement conflicted with the REFERENCE constraint ..."}` → toast **vermelho** com mensagem literal `"Não foi possivel excluir o registro, pois ele é referenciado em outros registros"` (a string `dados` da resposta vai só para `console.error`, não para o toast). |
| **D12** | Resposta `{status:500, dados:"<qualquer outra coisa>"}` → toast vermelho com `"Não foi possível realizar a operação."`; `dados` em `console.error`. |
| **D13** | Em todos os ramos de resposta (sucesso ou erro), o modal de confirmação é fechado (estado `modalConfirmDelete` vai para false e `modalDeleteConfig` para null). |
| **D14** | URL bruta `appbuilder.sp_deletar_x` (sem `/proc/`) com `isNotProcedure!==true` resulta em POST para `/proc/appbuilder.sp_deletar_x`. |
| **D15** | URL bruta `/appbuilder/proc/appbuilder.sp_deletar_x` (já contém `/proc/`) resulta em POST para `/appbuilder/proc/appbuilder.sp_deletar_x` (sem dupla-prefixação). |
| **D16** | URL bruta `/rest/v1/delete-x` com `isNotProcedure===true` resulta em POST para `/rest/v1/delete-x` (sem prefixo). |
| **D17** | No `<DataGrid2/>` atual (`Header/Actions.js:22-25`), clicar no botão de delete **não abre modal e não dispara request** — apenas loga `'action is:'` no console. (Asserção de regressão deliberada do legado-em-redesign.) |

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack/componente):

- **Hard-delete vs soft-delete fica 100% server-side.** O contrato cliente é agnóstico — a UI não distingue. Studio pode manter essa indireção (proc decide) ou expor flag no schema.
- **`status:200, sucesso:false` é o canal de "regra de negócio rejeitou"** (proc valida FK lógica e responde mensagem amigável). É **observavelmente distinto** do `status:500` (FK física do SQL Server vaza para o cliente). Studio precisa preservar essa distinção ou normalizar — mas se normalizar, troca de toast amarelo por vermelho muda a expectativa do usuário legado.
- **Tradução hard-coded de "REFERENCE constraint"** é frágil: depende da mensagem do SQL Server **em inglês**. Bases instaladas em outros idiomas (ex. localização pt-BR do erro `O instrução DELETE conflitou com a restrição REFERENCE...`) caem no toast genérico. Studio pode (a) normalizar no backend, (b) usar código de erro 547 do SQL Server, (c) deixar as procs sempre retornarem `sucesso:false` (eliminando o caminho 500/RI).
- **Texto da confirmação é literal e não contextual** (`"Tem certeza que deseja realizar a exclusão?"`). Não informa quantidade nem entidade. Studio decide se enriquece (`"Excluir 3 aplicações?"`).
- **Refresh de 700 ms** é um magic-number. Função: dar tempo do toast aparecer antes do grid piscar. Studio decide se mantém, encurta, ou separa loading-states.
- **`selected[]` órfão pós-delete**: as PKs deletadas continuam em `selected[]` até o usuário interagir. Studio pode zerar explicitamente após `success`.
- **`sendSelectRows:true` não foi observado em produção** dentre os consumidores indexados — preservar suporte é cautela; deprecar é opção (registrar ambiguidade `note: ambiguous-source sendSelectRows usage` no `progress-messages.txt`).
- **Não há undo, nem trash, nem confirmação dupla.** Click + modal + confirm = registro foi para a proc. Studio decide se introduz "lixeira" ou recuperação.
- **Toast `success(dados)` mostra texto da proc cru** — incluindo erros de digitação (`"Aplicação excluida com sucesso."` sem acento). Studio pode (a) ignorar `dados` e usar texto fixo, (b) padronizar mensagens via i18n, (c) preservar fidelidade ao legado.
- **`<DataGrid2/>` regressão**: o stub atual (F011) renderiza um banner `InlineAlert "Ação ainda não disponível"`; a feature F045 substitui pelo fluxo descrito aqui.

## Relações com o ecossistema

- Consome de: [[model-valor-datagrid]] §GridAction (schema do `gridAction[]`), [[obter-model-pagina]] (envelope canônico de resposta), [[engine-schema-driven]] (dispatch para `<DataGrid/>` v1).
- É consumido por: F045 (renderer de delete no Studio); indireto F011 (`<DataGrid2/>` substitui stub).
- Acopla: [[model-valor-datagrid]] §Seleção (`getUniqueProp` decide PKs em `selected[]`), [[model-valor-datagrid]] §"Estado do componente" (`reactiveState.currentPage` é zerado no refresh pós-sucesso), procs `sp_deletar_*` / `sp_excluir_*` (contrato de envelope `<Resposta>` é convenção cross-Processa — vide `sp_deletar_aplicacoes.sql` como protótipo).
- Sub-contratos a criar:
  - `proc-resposta-envelope.md` — formato `<Resposta><Status/><Sucesso/><Dados/></Resposta>` é cross-cutting (todo POST que muta estado no Processa retorna isso). Merece contrato próprio; tanto delete quanto persist do genericform consomem.

## Sources

- [[calendar/notes/2026-05-17.md]]
