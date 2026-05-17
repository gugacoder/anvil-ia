---
title: "tbdashboard-catalog — inventário cross-tenant de acesso.TBdashboard / acesso.TBobjetos_dashboard"
aliases: [tbdashboard-catalog, tbobjetos-dashboard-catalog, dashboard-seed-strategy, dashboard-cross-tenant-inventory]
tags: [contract, legacy, dashboard, sql-server, multi-tenant, director-studio, sub-contract]
sources:
  - "calendar/notes/2026-05-17.md"
created: 2026-05-17
updated: 2026-05-17
---

# Contrato: catálogo cross-tenant de `acesso.TBdashboard` + `acesso.TBobjetos_dashboard`

Sub-contrato de [[model-valor-dashboard]] (F012) e contrato-mãe da feature **F-tbobjetos-dashboard**. Cobre **duas entidades** acopladas: `acesso.TBdashboard` (composições salvas por usuário/aplicação) e `acesso.TBobjetos_dashboard` (catálogo de widgets reusáveis). Documenta o DDL canônico, uma **variante paralela `appbuilder.*`** observada em produção, e o **achado central** da escavação: **zero linhas em ambas as tabelas em todos os 84+ tenants `DBdirector_*` acessíveis** na SQL2k19. A consequência é que a estratégia de seed/migração para F012 **não pode** se basear em transcrever boxConfig legado real — não existe boxConfig legado real. Em vez disso, o Studio precisa de um seed sintético derivado dos arquivos SQL/.NET de cadastro de objetos (que existem mas nunca foram populados) ou ingerir dados de uma instância onde o módulo de dashboard tenha sido efetivamente usado (não localizada nesta wave).

> **Asserção D0 (achado central, com impacto direto na fase de descoberta da feature)**: o módulo `DashBoard` do `react-tools` (F012) **nunca foi adotado** nas instâncias de produção/homologação inventariadas (Area 52). O renderer existe, as procs existem, as tabelas existem em quase todo tenant — mas o usuário-final nunca cadastrou objetos nem montou dashboards. F012 entregou stub com payload fake porque **não há dado real** para exercitar; este sub-contrato confirma que isso não foi acaso de fixture, foi reflexo do legado.

## Citações de fonte

- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBdashboard.sql:1-20` — DDL canônico de `acesso.TBdashboard` (8 colunas: `DFid_dashboard PK identity`, `DFid_usuario`, `DFnome NVARCHAR(255)`, `DFdescricao NVARCHAR(255)`, `DFfavorito NVARCHAR(3)`, `DFmodel NVARCHAR(MAX)`, `DFaplicacao NVARCHAR(255)`, `DFusuario NVARCHAR(255)` via `ALTER`).
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBobjetos_dashboard.sql:1-25` — DDL canônico de `acesso.TBobjetos_dashboard` (8 colunas: `DFid_objeto_dashboard PK identity`, `DFnome NVARCHAR(255)`, `DFdescricao NVARCHAR(255)`, `DFtipo NVARCHAR(255)`, `DFproc NVARCHAR(255)`, `DFfiltros NVARCHAR(MAX)`, `DFaplicacao NVARCHAR(255)` via `ALTER`, `DFchave NVARCHAR(150) NOT NULL UNIQUE` via `ALTER`).
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.sp_persistir_dashboard.sql` — UPSERT em `acesso.TBdashboard`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.consultar_model_dashboards.sql` — listagem.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.consultar_model_objetos_dashboard.sql` — listagem do catálogo.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.sp_obter_dashboard_favorito.sql` — busca favorito de `(id_usuario, aplicacao, usuario)`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.sp_persistir_favorito_dashboard.sql` — marca favorito 1-de-N.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.sp_deletar_dashboard.sql` — DELETE.
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/2-procedures/appbuilder.sp_persistir_objetos_dashboard.sql:65-66` — cadastro de objeto pelo AppBuilder (UI separada): INSERT em `acesso.TBobjetos_dashboard (DFnome,DFdescricao,DFtipo,DFproc,DFfiltros,DFaplicacao,DFchave)`. Confirma que o schema `acesso.*` é o **canônico**, mesmo quando a entrada vem pelo AppBuilder.
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/2-procedures/appbuilder.sp_deletar_objeto_dashboard.sql` — DELETE no catálogo.
- `sources/engenharia--fabrica--sql--processa-appbuilder/appbuilder/0-criacao/acesso.TBobjetos_dashboard.sql` — duplicata do DDL, mesma forma.
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/Processa.AppBuilder.Repositories/DashboardRepository.cs:75` — INSERT em `acesso.TBobjetos_dashboard` via repository .NET do AppBuilder (mesma forma).
- `sources/engenharia--fabrica--dotnet--processa.appbuilder/Fontes/Processa.AppBuilder.Api/ModelScript.cs:632` — DDL/INSERT inline gerado por scripts de migração do AppBuilder.
- **Probe SQL2k19 ao vivo** (2026-05-17, `172.27.0.121\SQL2k19` via VPN, login `sl`): inventário cross-tenant de `acesso.TBdashboard` em 84 bases `DBdirector_*` ONLINE — todas com `COUNT(*)=0`. Probe `appbuilder.TBdashboard` em 3 bases (`Bazinho_29`, `Bergao_29`, `PCP_29`) — todas com `COUNT(*)=0`. Probe `acesso.TBobjetos_dashboard` em todas — todas zeradas. Probe `DBengenharia_Director_RC` (seed/release-candidate) — zero. Probe `DBx_appb_ti_teste` (com login `director_web`) — zero. Bases `DBappBuilder` e `DBappBuilder_Engenharia` inacessíveis com ambos os logins disponíveis (`sl`, `director_web`) — registrado como ponto-cego (ver §"Notas de ambiguidade").

## Estrutura — `acesso.TBdashboard` (composição salva)

Schema canônico (observado em produção + DDL):

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `DFid_dashboard` | `int IDENTITY PK` | sim | Identidade da composição | int sequencial | PK clusterizada `PK__TBdashbo__*` | identity |
| `DFid_usuario` | `int NULL` | não (na prática sempre preenchida) | FK lógica para `acesso.TBusuario.DFid_usuario` (sem FK física observada) | int | filtra dashboards do usuário em `consultar_model_dashboards` | proc persistir |
| `DFnome` | `nvarchar(255) NULL` | sim no UI (`sendUpdateRequest` valida `nome+descricao` obrigatórios) | rótulo humano do dashboard | string | título visível no `<DashBoardCrud>` | usuário |
| `DFdescricao` | `nvarchar(255) NULL` | sim no UI | descrição livre | string | exibido na lista | usuário |
| `DFfavorito` | `nvarchar(3) NULL` | não | flag de favorito por usuário+app | `'Sim'` ou `NULL` | dashboard usado em `<DashBoardHome>`; lookup por `acesso.sp_obter_dashboard_favorito` | proc favorito |
| `DFmodel` | `nvarchar(MAX) NULL` | sim quando dashboard salvo | JSON do `boxConfig` (vide [[model-valor-dashboard]] §"Estrutura do JSON `boxConfig`") | string JSON com 5 chaves | é o **corpo** do dashboard; parseado em `JSON.parse(linha[0].json)` no `<DashBoard>` | UI legado |
| `DFaplicacao` | `nvarchar(255) NULL` | sim na prática | chave da aplicação (`TBaplicacao.DFchave`) — escopa multi-tenant lógico | string | filtro de listagem `WHERE DFaplicacao=@aplicacao` | proc persistir |
| `DFusuario` | `nvarchar(255) NULL` (via `ALTER`) | sim na prática | login do usuário (`TBusuario.DFusuario`) — redundante com `DFid_usuario`, presente para favorito por login | string | usado em `sp_persistir_favorito_dashboard` e `sp_obter_dashboard_favorito` | ALTER tardio |

Índices: `PK__TBdashbo__*` (clustered em `DFid_dashboard`). **Nenhum índice secundário em `(DFid_usuario, DFaplicacao)` apesar de ser o filtro mais comum em `consultar_model_dashboards`** — ponto de débito de performance que importa pouco enquanto a tabela vive vazia.

> **Asserção D1**: a tabela não tem `DFdata_criacao` nem `DFdata_modificacao`. A tarefa-pai presumiu existência de `MAX(DFdata_modificacao)` para datar o último uso — coluna inexistente no schema. **Não é possível datar nem o "último update" de um dashboard nem a "última atividade" da tabela via SQL.** Studio decide se adiciona essas colunas na migração (recomendado: sim, ambas com `SYSUTCDATETIME()`).

> **Asserção D2**: chave de unicidade lógica não declarada. Não há `UNIQUE` sobre `(DFid_usuario, DFnome, DFaplicacao)`. O legado aceita dois dashboards com o mesmo nome para o mesmo usuário na mesma app. Studio decide se restringe.

> **Asserção D3**: `DFfavorito` é "1-de-N" forçado por procedure (`sp_persistir_favorito_dashboard` limpa antes de marcar), não por constraint. Em ambiente vivo com concorrência, duas linhas marcadas `'Sim'` simultaneamente são possíveis. Studio recomenda transação serializável ou UNIQUE filtrado `WHERE DFfavorito='Sim'`.

> **Asserção D4**: redundância `DFid_usuario` (int FK) + `DFusuario` (login string). Adicionada via `ALTER` tardio para suportar favorito-por-login. Studio decide se descarta `DFusuario` (já que `DFid_usuario` é suficiente para o JOIN) ou mantém pelo legado.

## Estrutura — `acesso.TBobjetos_dashboard` (catálogo de widgets)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `DFid_objeto_dashboard` | `int IDENTITY PK` | sim | identidade do widget | int sequencial | PK clusterizada `PK__TBobjeto__*` | identity |
| `DFnome` | `nvarchar(255) NULL` | sim na prática | rótulo visível do widget no modal de configuração + título do gráfico | string | mostrado na dropdown de objetos | admin |
| `DFdescricao` | `nvarchar(255) NULL` | não | descrição auxiliar | string | helper no modal | admin |
| `DFtipo` | `nvarchar(255) NULL` | sim na prática | **discriminante de renderer** — vide [[model-valor-dashboard]] §"Catálogo de `tipo`": `'String'`, `'Grid'`, `'Buttons'`, ou qualquer `chartType` do Google Charts (`'PieChart'`, `'Line'`, `'Bar'`, `'ColumnChart'`, `'AreaChart'`, `'Gauge'`, etc.) | string livre | `DashBoardBox.js:811-869` branches por valor | admin |
| `DFproc` | `nvarchar(255)` | sim para `tipo` ≠ `'Buttons'` | nome da stored procedure que produz os dados (`/proc/<DFproc>` no fetch) | string nome-de-procedure | `sendDataRequest` invoca POST `/proc/{DFproc}` com `{filtro}` | admin |
| `DFfiltros` | `nvarchar(MAX)` | não | JSON com schema de filtros do widget: `{filtros:[{label, prop}, ...]}` | string JSON ou NULL | renderiza `<Filtros>` por quadrante | admin |
| `DFaplicacao` | `nvarchar(255) NULL` (via `ALTER`) | sim na prática | chave da aplicação dona do widget | string | escopa quais widgets aparecem para um dashboard daquela app | ALTER |
| `DFchave` | `nvarchar(150) NOT NULL UNIQUE` (via `ALTER`) | sim | chave estável para deploy/migração entre tenants | string | índice único `UQ__TBobjeto__*`; **é a única coluna `NOT NULL` "real"** (PK é identity, demais são `NULL`-permissive) | ALTER tardio |

Índices: PK (clustered) + `UQ__TBobjeto__*` (non-clustered em `DFchave`). Nenhum índice em `DFaplicacao` (esperado-frequente filtro).

> **Asserção D5**: `DFchave` foi adicionada tardiamente via `ALTER` e tornou-se `NOT NULL UNIQUE` — sinal de que houve esforço para tornar o catálogo deployável entre tenants (chave estável independente do `IDENTITY`). É o equivalente legado de uma "natural key" para seed cross-tenant. Studio adota `DFchave` como id estável de migração (não migrar pelo `DFid_objeto_dashboard`).

> **Asserção D6**: `DFtipo` é **string livre** sem `CHECK` constraint. O universo aceito é o cartesian `{Google Charts chartType} ∪ {'String', 'Grid', 'Buttons'}`. Admins cadastraram strings sem validação — em qualquer base populada haveria risco de typo (`'Pirechart'`, `'line'` minúsculo, etc.). Studio precisa enum + validação na ingestão.

> **Asserção D7**: `DFproc` é **string livre** apontando para o nome de uma stored procedure no mesmo banco. Não há FK para um catálogo de procs nem validação de existência. Dashboard quebra silenciosamente em runtime (toast "Dados insuficientes") se a proc for renomeada/deletada. Studio idem: validar existência da fonte de dados na ingestão.

## Variante observada: schema paralelo `appbuilder.TBdashboard`

Em 3 das 84 bases inventariadas (`DBdirector_Bazinho_29`, `DBdirector_Bergao_29`, `DBdirector_PCP_29`), além das tabelas canônicas `acesso.*`, existem tabelas-irmãs em schema `appbuilder.*`:

- `appbuilder.TBdashboard` — **sem coluna `DFusuario`** (só `DFid_usuario`). 7 colunas: `DFid_dashboard, DFid_usuario, DFnome, DFdescricao, DFfavorito, DFmodel, DFaplicacao`.
- `appbuilder.TBobjetos_dashboard` — **sem coluna `DFchave`** (a coluna `NOT NULL UNIQUE` que foi adicionada tardiamente). 7 colunas: `DFid_objeto_dashboard, DFnome, DFdescricao, DFtipo, DFproc, DFfiltros, DFaplicacao`.

Ambas vazias (qtd=0). As procs de cadastro do AppBuilder (`appbuilder.sp_persistir_objetos_dashboard`) **gravam em `acesso.TBobjetos_dashboard`**, não em `appbuilder.TBobjetos_dashboard`, mesmo nestas bases. Conclusão: o schema `appbuilder.*` é **resíduo de uma migração anterior** (provavelmente uma fase inicial do AppBuilder onde dashboards viviam num schema próprio antes da consolidação em `acesso`). Não usar como referência.

> **Asserção D8**: `acesso.*` é o **único schema canônico** para dashboard, mesmo quando a entrada é feita pelo AppBuilder. Studio ignora completamente o schema `appbuilder.*` para essa entidade.

## Inventário cross-tenant (probe ao vivo 2026-05-17)

Execução: `SET NOCOUNT ON; FOR EACH db LIKE 'DBdirector%' ONLINE: SELECT COUNT(*) FROM <db>.acesso.TBdashboard; SELECT COUNT(*) FROM <db>.acesso.TBobjetos_dashboard;` agregando em `#temp`. 84 bases responderam.

| Base | `acesso.TBdashboard` qtd | `acesso.TBobjetos_dashboard` qtd | obs |
|---|---|---|---|
| `DBdirector` (template original) | 0 | 0 | — |
| `DBdirector_Imperial_Logistica_29` (Area 52 default) | 0 | 0 | base usada em ui-test de F012 |
| `DBdirector_Imperial_Logistica_29_Novo` | 0 | 0 | — |
| `DBengenharia_Director_RC` (release-candidate seed) | 0 | 0 | nenhum seed-pack de objetos |
| `DBx_appb_ti_teste` (banco de testes do AppBuilder) | 0 | 0 | — |
| **Demais 79 bases `DBdirector_*` (clientes em produção/homol)** | **0** | **0** | uniformemente vazias |
| `DBappBuilder`, `DBappBuilder_Engenharia` | inacessível | inacessível | logins `sl` e `director_web` sem permissão (ver §"Notas de ambiguidade") |

**Total observável**: 0 dashboards, 0 objetos em 84 tenants. Cobertura cross-tenant: ~98% dos `DBdirector_*` da SQL2k19 (todas as bases ONLINE com tabela presente — bases sem a tabela foram filtradas por `OBJECT_ID(...) IS NOT NULL`).

> **Asserção D9**: a feature dashboard do legado nunca foi adotada em produção pelos clientes do Director ERP inventariados. Não há boxConfig real para transcrever. Os passos da tarefa-pai (extrair amostras de 2-3 top-bases, mapear estrutura, transcrever para `widgets[]`) **não são executáveis** com os dados existentes nesta wave. O Studio precisa de uma estratégia alternativa (ver §"Estratégia de seed/migração").

> **Asserção D10**: a única tabela com dados ligadas a "dashboard" no servidor é `carreira.TBusuario_dashboard` (1 linha) e `dpconecta.TBusuario_dpconecta_dashboard` (1 linha) em `DBdirector_Gestao_Pessoas_29` — ambas são **tabelas de usuário** (`DFnome_usuario`, `DFlogin`, `DFsenha`, `DFsenha_tmp`, `DFadministrador`, `DFprocessa`) de aplicativos batizados "Dashboard" e "DPConecta Dashboard"; **não têm relação semântica** com `acesso.TBdashboard`. Homônimo de nome, conteúdo é "login de usuário do app dashboard". Studio descarta.

## Estrutura JSON canônica observada — `acesso.TBdashboard.DFmodel`

**Não observada in vivo** (tabela vazia). A estrutura é a definida pelo renderer (vide [[model-valor-dashboard]] §"Estrutura do JSON `boxConfig`") — o renderer é a **única fonte canônica** disponível agora. Recapitulação curta para uso deste sub-contrato:

```
{
  "boxElements": [BoxElement, BoxElement, BoxElement, BoxElement],   // sempre 4 slots
  "boxDimension": { "<idx>": { "gridColumn": string, "gridRow": string }, ... },
  "boxInterval":  { "<idx>": string|number, ... },                    // segundos, mín 10
  "chartData":    { "<idx>": ChartDataItem | "", ... },               // config + snapshot
  "quadrante":    LinkedBox | ""                                      // alvo do Buttons
}
```

Forma de cada `ChartDataItem` (referência rápida — fonte autoritativa em [[model-valor-dashboard]]): `{id, nome, descricao, aplicacao, nomeAplicacao, procedure, tipo, filtros, data, filtroSelecionado, intervalo, elements?}`. `tipo` é a string do catálogo `TBobjetos_dashboard.DFtipo`.

> **Asserção D11**: no fluxo do legado, o snapshot dos dados resolvidos (`chartData[idx].data`) é persistido **dentro** do `DFmodel`. Em uma base com dashboards salvos antigos, ler `DFmodel` retorna o estado da última edição (incluindo dados possivelmente estale). Como hoje todas as bases estão vazias, esse comportamento não impacta a migração — mas o Studio precisa decidir na ingestão futura: **persistir só metadata** (forma canônica recomendada) **ou snapshot+metadata** (paridade legada). Recomendado: só metadata.

## Pontos-cego (notas de ambiguidade)

- **`DBappBuilder` e `DBappBuilder_Engenharia` inacessíveis**: o login `sl` (válido em todas as bases `DBdirector_*`) e o login `director_web` (válido em `DBx_appb_ti_teste`) **não têm permissão** nesses dois bancos. É possível que existam dashboards/objetos cadastrados lá (especialmente em `DBappBuilder_Engenharia`, que parece ser o ambiente onde o AppBuilder roda como app). **Ação requerida**: solicitar credencial com acesso a esses bancos (talvez `sa` ou login dedicado do AppBuilder) e re-rodar inventário antes de fechar a feature. Sem isso, a Asserção D9 vale **apenas** para o universo `DBdirector_*` + `DBx_appb_ti_teste` + `DBengenharia_Director_RC`.
- **Bases não-listadas**: o filtro foi `name LIKE 'DBdirector%'` + checagem `OBJECT_ID('acesso.TBdashboard') IS NOT NULL`. Bases com a tabela em **outro schema** (`portal.TBdashboard`, `dbo.TBdashboard`) não foram cobertas. A varredura ampla por `name LIKE '%dashboard%'` em `sys.tables` cross-DB confirmou que nenhuma outra tabela com "dashboard" no nome contém dados relevantes (só os homônimos de usuário em `Gestao_Pessoas_29`). Cobertura considerada adequada.
- **Bases offline/restricted**: bases com `state_desc != 'ONLINE'` ou sem permissão de leitura para `sys.databases` foram silenciosamente puladas pelo `BEGIN TRY/CATCH` do dynamic SQL. Lista exaustiva delas não foi computada; assume-se cobertura ≥98% por inspeção visual da lista de 96 bases ONLINE retornadas por `sys.databases`.

## Asserções D1..D14 (verificáveis para Studio + ui-tester)

Consolida o que está espalhado acima, em forma checável:

| # | Asserção |
|---|---|
| D0 | F012 não é exercitada por dados reais em nenhum tenant inventariado — dashboard como feature do Director nunca foi adotada em produção (84 bases zeradas). |
| D1 | `acesso.TBdashboard` não tem `DFdata_criacao` nem `DFdata_modificacao` — Studio adiciona ambos. |
| D2 | Não há `UNIQUE(DFid_usuario, DFnome, DFaplicacao)` — Studio decide se restringe. |
| D3 | `DFfavorito='Sim'` é forçado 1-de-N por proc, não por constraint — Studio adiciona UNIQUE filtrado. |
| D4 | `DFusuario` (login) é redundante com `DFid_usuario` (FK) — Studio decide se descarta na migração. |
| D5 | `DFchave NOT NULL UNIQUE` em `acesso.TBobjetos_dashboard` é a chave de migração estável (não usar `DFid_objeto_dashboard`). |
| D6 | `DFtipo` é string livre sem CHECK — Studio aplica enum + validação na ingestão. |
| D7 | `DFproc` é string livre sem FK — Studio valida que a fonte de dados existe na ingestão. |
| D8 | Schema canônico é `acesso.*`; `appbuilder.*` em 3 bases é resíduo, ignorar. |
| D9 | Não há `boxConfig` real para transcrever em nenhuma das 84 bases acessíveis — seed sintético obrigatório. |
| D10 | `carreira.TBusuario_dashboard` e `dpconecta.TBusuario_dpconecta_dashboard` são homônimos sem relação com a entidade dashboard (são tabelas de usuário). |
| D11 | Legado persiste snapshot+metadata em `DFmodel`; Studio persiste só metadata (recomendado). |
| D12 | `DBappBuilder` e `DBappBuilder_Engenharia` são ponto-cego — credencial necessária antes de fechar feature. |
| D13 | Renderer F012 já consome forma canônica `widgets[]`; ingestão legado→Studio é simples (mapeamento 1:1 de campos), mas não há dados de origem. |
| D14 | Procs do legado (`consultar_model_dashboards`, `sp_persistir_dashboard`, `sp_persistir_favorito_dashboard`, `sp_obter_dashboard_favorito`, `sp_deletar_dashboard`, `consultar_model_objetos_dashboard`) existem em todas as 84 bases — backend de cutover precisa rotear endpoints equivalentes (ver [[model-valor-dashboard]] §"Endpoints"). |

## Estratégia de seed/migração proposta para F-tbobjetos-dashboard

Considerando D0/D9 (não há dado real para transcrever) e D5/D13 (mapeamento estável existe), três caminhos não-mutuamente-exclusivos:

### Caminho A — Seed sintético do catálogo (recomendado para destravar F012 end-to-end)

Criar 1 arquivo de seed idempotente (estilo F063) que popula `acesso.TBobjetos_dashboard` da base Area 52 (`DBdirector_Imperial_Logistica_29`) com **N widgets canônicos** cobrindo todos os discriminantes de `tipo` que o Studio entrega:

- 1× `'String'` → ex.: KPI "Faturamento do dia" apontando para uma proc real já existente (`acesso.consultar_model_dashboards` retorna count como string).
- 1× `'Grid'` → ex.: Top N produtos vendidos, proc real.
- 1× `'PieChart'` (mapeado para `pie` no Studio) → ex.: Distribuição de pedidos por status.
- 1× `'Bar'` → ex.: Vendas por vendedor.
- 1× `'Line'` → ex.: Histórico mensal.
- 1× `'Buttons'` (switcher) → grupo de 3 botões trocando o conteúdo de um quadrante alvo.

Cada widget tem `DFchave` estável (`portal-director.dashboard.<slug>`) e `DFaplicacao='portal-director'`. Após seed, criar 1 dashboard de demonstração em `acesso.TBdashboard` com `DFmodel` montando 4 desses widgets em grid 2×2. Esse dashboard substitui o payload fake hardcoded de F012 (referenciado em [[model-valor-dashboard]] e no aceite de F012).

**Pré-requisitos**: identificar procs reais já cadastradas em Area 52 que retornem dados compatíveis com o envelope `dados.response.linhas.linha`. Se nenhuma existir naturalmente, cadastrar 6 procs novas em `acesso.*` (ou `portal_director.*`) dedicadas ao demo do dashboard.

### Caminho B — Adapter de ingestão legado→canônico (para a hora que aparecer dado real)

Implementar a função `parseLegacyBoxConfig(dfmodelJson) → CanonicalDashboard` no backend do Studio. Forma do mapeamento:

| Legado (`boxConfig`) | Canônico (`widgets[]` consumido por F012) |
|---|---|
| `boxElements[i] = {id, display:'none'?}` ocupando slot `<i>` | `widgets[]` com `position={col,row,colSpan,rowSpan}` derivado de `boxDimension[i]` |
| `boxDimension[i] = {gridColumn:'1/3', gridRow:'1/2'}` | parse das strings CSS-grid → `{col, row, colSpan, rowSpan}` |
| `chartData[i] = {tipo, procedure, filtros, intervalo, nome, ...}` | `widget = {type: mapTipo(tipo), source: {procedure, filters: parseFiltros(filtros)}, refreshInterval, title: nome, ...}` |
| `boxInterval[i]` | sobrescreve `widget.refreshInterval` se presente |
| `quadrante = [{value:'2'}]` quando há Buttons | `widget(type=switcher).target = widgets[2]` |
| `chartData[i].data` (snapshot) | **descartado** na ingestão (D11) |

Função `mapTipo(legacyTipo: string) → CanonicalWidgetType`:

| Legado | Canônico (MVP F012) | Observação |
|---|---|---|
| `'String'` | `kpi` | |
| `'Grid'` | `table` | |
| `'Buttons'` | `switcher` | |
| `'Line'`, `'LineChart'` | `chart` com `chartType='line'` | F012 entrega line/area/bar/column/pie |
| `'Bar'`, `'BarChart'` | `chart` com `chartType='bar'` | bar = horizontal no Google Charts |
| `'ColumnChart'` | `chart` com `chartType='column'` | bar vertical no Recharts |
| `'AreaChart'` | `chart` com `chartType='area'` | |
| `'PieChart'` | `chart` com `chartType='pie'` | |
| `'Gauge'` | `unsupported` (banner amarelo) até F061 entregar | |
| `'ScatterChart'`, `'ComboChart'`, `'TreeMap'`, `'GeoChart'`, `'Sankey'`, `'OrgChart'`, `'CandlestickChart'`, `'Histogram'`, `'BubbleChart'`, `'WordTree'`, `'Timeline'` | `unsupported` até F062 entregar | sem uso real observado (D9), pode adiar indefinidamente |
| qualquer outro | `unsupported` + log de warning para arqueólogo | |

### Caminho C — Aguardar credencial em `DBappBuilder*` (mitiga D12)

Antes de fechar a feature, solicitar acesso aos bancos `DBappBuilder` e `DBappBuilder_Engenharia` e rerodar o inventário. Se aparecerem dashboards/objetos lá, Caminho B vira o caminho principal e o Caminho A vira coadjuvante. Sem acesso, D9 permanece e Caminho A é a única forma de exercitar F012 end-to-end.

## Relações com o ecossistema

- Sub-contrato de: [[model-valor-dashboard]] (F012).
- Adjacente a: [[obter-model-pagina]] (envelope cross-cutting), [[engine-schema-driven]] (mas dashboard é fora-do-engine — rotas hard-coded em `AppMain`).
- Consumido por: F-tbobjetos-dashboard (esta feature), F055 (edit-mode — depende de catálogo populado), F056 (shared-link — independente de catálogo, já aceito), F-proc-dashboard-response (envelope `response` vs `relatorio` — sub-contrato a criar para registrar a divergência).
- Sub-contratos a criar (próximas waves):
  - `proc-dashboard-response.md` — envelope `dados.response.linhas.linha` (vs `dados.relatorio.linhas.linha` do grid). Crítico para o backend Studio rotear corretamente.
  - `tbusuario-multi-tenant.md` — clarificar como `DFid_usuario` (int) + `DFusuario` (login string) coexistem em todas as tabelas com colunas `DFid_usuario`/`DFusuario` (`TBdashboard`, `TBfavorito_pagina`, etc.).

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- **Não há dado real para migrar nesta wave.** F-tbobjetos-dashboard, se for exercida só pelo inventário cross-tenant, **fecha com escopo Caminho A (seed sintético)**. Caminho B (adapter) fica como código defensivo pronto para receber dados quando aparecer (D12 resolvido ou nova entrega de cliente).
- **Seed deve cobrir todos os 4 discriminantes de F012 MVP** (`kpi`, `chart`, `table`, `switcher`) para o aceite de F012 ser exercitado end-to-end com dado real persistido em `acesso.TBobjetos_dashboard` + `acesso.TBdashboard`, não com payload fake.
- **`DFchave` é a chave de deploy** — o seed deve ser idempotente por `DFchave` (`MERGE` ou `IF NOT EXISTS`), análogo ao padrão de F063.
- **`DFaplicacao` deve casar com a chave da aplicação Studio** (provavelmente `'portal-director'` para o MVP, herdando de F063).
- **Backend Studio precisa expor 6 endpoints REST equivalentes às procs do legado** (listados em [[model-valor-dashboard]] §"Endpoints"). F012 entregou stub apenas para o endpoint `obter_dashboard_favorito` + payload fake — sem catálogo populado, os demais endpoints retornam vazio (comportamento aceitável até Caminho A executar).
- **Inventário cross-tenant não justifica P0/P1 para F062 (widgets unknown-type)**: D9 + ausência de qualquer `DFtipo` real em produção significam que `scatter/combo/treemap/geo/sankey` provavelmente nunca foram cadastrados. F062 vira P3/backlog até evidência contrária.

## Sources

- [[calendar/notes/2026-05-17.md]]
