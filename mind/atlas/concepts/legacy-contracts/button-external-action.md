---
title: "Contrato: button.externalAction"
aliases: [button-external-action, contract-button-external-action]
tags: [contract, legacy, engine, render, director-studio, eval-audit]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: `button.externalAction` (e `gridAction.action="externalAction"`)

> **Resumo da escavação (F054)**: a hipótese inicial — "`button.externalAction` no JSON do model é executado via `eval` no legado" — **é falsa**. `externalAction` é, em todos os pontos do legado, **uma referência de função JavaScript estaticamente passada por código React de host** para componentes genéricos (`GenericPage`, `GenericForm`, `Filtro`, `DataGrid`). **Nunca é uma string**. **Nunca passa por `eval`**. **Nunca foi observada no campo `DFvalor` de `acesso.TBmodel_pagina`** em nenhum tenant probado. F050 e F051 já cobrem os **dois únicos** pontos de `eval` do engine `react-tools/`. Não há terceiro ponto.

## Citações de fonte

### Consumidores (onde `externalAction` é chamado como função)

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:258` — `onClick={() => button.externalAction && button.externalAction()}` para cada item de `model.buttons.pageButtons`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericGridPage.js:109-110,133-134,149` — recebe `externalAction` como prop (`PropTypes.func`); chama em `onDoubleClick` se definida.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:301` — passa `handleFillForm` como `externalAction` para `RenderGridPage` quando há `formOnModal`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/hooks/useGenericFormActions.js:82-86,92-96,109-113,119-123` — `actionConfig.externalAction(getFormValues(), {...})` após validação de `formActions`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:35,562-563,645` — `externalActionConfigs.onClick(_filter)` quando `executeExternalAction=true`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:407-409` — `case 'externalAction': handleGridExternalAction(config)` para `gridActions[i].action="externalAction"`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid2/Header/Actions.js:46-48` — mesmo switch em DataGrid2 (no momento comentado/no-op).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardBox.js:516,535,561` e `DashBoardCrud.js:98,143` — passam funções literais como `externalAction`/`onClickAction`.

### Produtores (onde `externalAction` é declarado, sempre como função JS literal)

Páginas hardcoded (`.jsx`) que **constroem o model em JavaScript** e injetam closures como handlers. Amostra:

- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/ModelPaginas/ModelPaginas.jsx:18` — `externalAction: handleAddModel`.
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx:195-197,240-242` — `externalAction: () => { Avancar(); }` e `gridActions[].action='externalAction'` com `onClickAction` closure.
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Cadastros/ObjetosDashboard.jsx:317,350` — idem.
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/website/src/routes/Auditoria.jsx:107-109` — idem.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/routes/Acessos/Fornecedores.jsx`, `.../NivelAcesso/index.jsx`, `.../Cotacao/CotacaoUsuarios.jsx`, `.../Configuracoes/DirectorMobile/DirectorMobileAtualizacao.jsx`, `.../processa.ADM/.../instalacoes/Director.jsx` — todas seguem o mesmo padrão (handler literal).

### Auditoria de `eval` no engine

`Grep eval\(` em `sources/engenharia--fabrica--javascript--react-tools/src` retorna **exatamente 2 ocorrências**:

- `components/GenericPage/GenericPage.js:93` — `eval(funcaoStr)` aplicado a string vinda de `TBfuncao_model.DFvalor` (coberto por **F050** via primitivas declarativas).
- `components/GenericPages/GenericPages.js:33` — `eval(dParam.valor)` aplicado a expressões de `TBmodel_parametro.DFvalor` (coberto por **F051** via interpolador `{path}`).

`Grep "new Function\("` no mesmo escopo: **zero ocorrências**.

Não há terceiro ponto de `eval`/`new Function` no engine schema-driven do legado.

## Estrutura

`externalAction` aparece em três **shapes distintos** no contrato de API JS dos componentes genéricos. Em todos eles é função, nunca string:

| Local de uso | Shape | Tipo declarado | Semântica | Assinatura | Vem de |
|---|---|---|---|---|---|
| `model.buttons.pageButtons[i].externalAction` | propriedade do botão de página | `PropTypes.func` (implícito) | Handler de clique do botão superior da página | `() => void` | Closure JS no host React |
| `model.buttons.gridActions[i].action` + `.onClickAction` | string-discriminante + handler | `string` = `'externalAction'` + função | `action='externalAction'` discrimina o caso no switch interno; `onClickAction` é a função a chamar | `(selected) => void` | Closure JS no host React |
| `model.genericform.formActions[i].externalAction` | handler pós-submit | função | Executada após validação opcional; recebe form values + util refs | `(values, {handleCloseModalForm, setFilter, setCurrentFilter}) => void` | Closure JS no host React |
| `<Filtros executeExternalAction externalActionConfigs={{title, onClick}}>` | config object | objeto `{title:string, onClick:fn}` | Botão extra no filtro com handler arbitrário | `(filter) => void` | Closure JS no host React |
| `<RenderGridPage externalAction>` | prop direta | `PropTypes.func` | Sobrescreve `onDoubleClick` padrão do grid | `(row) => void` | Closure JS no host React |
| `gridActions[i].action='externalAction'` (string) | discriminante de switch | literal `'externalAction'` | Cai em `handleGridExternalAction(config)` que dispara `config.onClickAction(selected)` | n/a (sentinela) | Hardcoded na rota |

**Importante**: a string `'externalAction'` que aparece no campo `action` de `gridActions[i]` é um **discriminante de switch** — token estático interpretado por `case` em `DataGrid.js:407`. Não é código executável, não passa por `eval`. É equivalente, em poder expressivo, aos `'delete'`/`'redirectTo'`/`'openModal'` que coexistem no mesmo switch.

## Inventário real (probe Área 52)

Query: `SELECT COUNT(*) AS total, SUM(CASE WHEN DFvalor LIKE '%externalAction%' THEN 1 ELSE 0 END) AS hits FROM acesso.TBmodel_pagina` (instance `172.27.0.121\SQL2k19`, user `sl`).

| Base | total `TBmodel_pagina` | hits com `externalAction` |
|---|---:|---:|
| `DBdirector_Imperial_Logistica_29` (Area 52 canônica) | 15 | **0** |
| `DBdirector_Mobile_29` | 52 | **0** |
| `DBdirector_Apresentacao_Atacado_29` | 11 | **0** |
| `DBdirector_Implantacao_Base_29` | 0 | — |
| `DBdirector_Integracao_29` | 0 | — |
| `DBdirector` (central, sem tenant) | 0 | — |
| 10 tenants adicionais (`4x4_Store`, `Aguia_Diesel`, `Alamo`, `Bazinho`, `Bergao`, `Casa_Buque`, `Eldorado`, `Equipaminas`, `Flaire`, `Imperial_Salgados`, `Vinaque`) com tabela presente | 55 acumulados | **0** |
| **Total** | **133+** | **0** |

Mesmo padrão em `acesso.TBfuncao_model` (probado: `Mobile_29` 4/0, `Apresentacao_Atacado_29` 4/0).

Grep nos seeds canônicos (`sources/engenharia--fabrica--sql--portal-director`, `--portal-aws`, `--processa-appbuilder`, `--processa-adm`): **zero arquivos** com `externalAction`.

## Padrões

`externalAction` é, em todos os usos, **um hook de host React** — uma maneira do código que monta o model passar uma **função arbitrária** para o componente genérico executar em resposta a um evento (clique de botão, double-click de linha, clique pós-submit, botão extra de filtro). Os comportamentos observados nessas closures incluem:

- Abrir modal local da rota (`handleModal`, `handleModalDiffGenericPages`, `handleMultipleElementsModal`).
- Avançar passo de wizard (`Avancar`).
- Disparar request explícito (`handleRequest({action, param})`, `handleDownloadScripts`).
- Remover elemento local (`handleRemoveElement`).
- Gerar script/link (`handleGenerateScript`, `verifyDashboardSelecteds`).
- Preencher form com row selecionada (`handleFillForm`).

Nenhum desses comportamentos é declarado em metadado de banco. Todos vivem em código JS da rota hardcoded.

## Relações com o ecossistema

- **Não consome de**: `acesso.TBmodel_pagina`, `acesso.TBfuncao_model`, `acesso.TBmodel_parametro` (nenhum produz `externalAction`).
- **Coabita com**: [[engine-schema-driven]] (mesmo componente que dispatcha pelo schema), [[model-valor-genericform]] (campo `formActions` documenta `externalAction` como handler JS), [[model-valor-datagrid]] (campo `gridActions` documenta `action='externalAction'` como discriminante).
- **Não compete com**: [[tbfuncao-model]] (F050) — esse cobre o caminho **declarativo** em que o autor da página queria **distribuir um handler de submit via banco**, não via JSX. São mecanismos paralelos: `TBfuncao_model` é a única via "configurar handler por banco"; `externalAction` é a via "passar handler por JS de host".

## Conclusão para F054

**A feature F054, como formulada pelo curator, é vazia**: não existe ponto de `eval` no engine schema-driven legado que processe `button.externalAction`. Os dois únicos `eval` do engine já estão cobertos por F050 (`TBfuncao_model`) e F051 (`TBmodel_parametro`).

O caminho `externalAction` do legado é "model construído por JSX da rota" — uma forma de cadastro de página que **não existe** no Director.Studio (no Studio, todo model vem do banco; não há rotas `.jsx` hardcoded montando model em runtime com closures). Portanto:

- **Não há código a remover no Studio** (Studio nunca importou esse caminho).
- **Não há contrato de migração a desenhar** (não há produtor legado de `externalAction` no banco para mapear).
- **Não há primitiva nova a especificar** — as "ações externas" do legado (abrir modal, avançar wizard, gerar script, etc.) são features que, no Studio, **já caem em outras frentes**: `gridActions` (F011/F045), `pageButtons` (F010 e congêneres), `formActions` (F010 + F050), `genericactionform` (F037).

Recomendação ao curator: **fechar F054 como `accepted (no-op, hypothesis-rejected)`** ou converter F054 em **F054b — auditoria final declarando "engine livre de `eval`"**, com critério de aceitação:

1. `Grep "\beval\s*\("` em `packages/ui/src` e `apps/api/src` → zero hits.
2. `Grep "new Function\s*\("` no mesmo escopo → zero hits.
3. Smoke routes de F050 e F051 continuam verdes (sem regressão).

A trilha de eliminação de `eval` no engine **está completa** com F050 + F051.

## Riscos

- **Risco da feature como formulada**: smith pode gastar tempo procurando um `eval` que não existe. Mitigado por este contrato.
- **Risco residual cross-tenant**: as bases `DBappBuilder`/`DBappBuilder_Engenharia` (onde models são editados em UI do AppBuilder) não foram probadas (sem permissão do user `sl`). Probabilidade de existir `externalAction` ali é baixa (seeds canônicos do legado em `sources/...sql/...` não têm), mas não-zero. Se F054 for mantida em aberto, archaeologist deve obter credencial de `DBappBuilder` e reprobar.
- **Risco de naming colision**: ao desenhar `gridActions` no Studio (F011/F045), há tentação de reusar a string `'externalAction'` como discriminante de switch. Recomendação ao curator/designer: **renomear** para algo descritivo no Studio (`'custom-handler'`, `'route-callback'`) — o nome legado é misleading porque o caso paralelo no banco (campo `DFvalor` de model) **nunca** existiu.
- **Risco terminológico**: a F054 confunde "`externalAction` como string discriminante em `gridActions[i].action`" com "`externalAction` como função em `gridActions[i].onClickAction` ou em `button.externalAction`". Os dois nunca foram a mesma coisa no legado, mesmo carregando o mesmo identificador.

## Notas de implementação para o Studio

(Mínimo necessário, sem prescrever stack.)

- O Studio **não precisa** de um caminho de "executar callback de host" no engine: o engine processa exclusivamente model vindo do banco. Páginas que no legado eram `.jsx` hardcoded com closures viram, no Studio, **modelos cadastrados em `TBmodel_pagina`** com handlers declarativos (proc via `gridActions[].endPoint`, primitiva via F050, navegação via `redirectTo`, etc.).
- O switch de `gridActions[i].action` no Studio (já existente em F011) precisa **não** incluir um `case 'externalAction'`. Se um model legado migrado trouxer essa string, o engine deve emitir divergence visível (mesmo banner usado em F051/F053) com mensagem clara: "`externalAction` é um caminho do legado JSX-host; converter para `redirectTo`/`openModal`/proc-call declarativa".

## Sources

- [[calendar/notes/2026-05-15.md]]
