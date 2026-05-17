---
title: "F092 — Bloqueio contract-mismatch (pré-implementação)"
tags: [effort, director-studio, F092, F052b, refactor, blocked, contract-mismatch, decisions]
created: 2026-05-17
---

# F092 — Refactor `configuracoes_cotacao` — BLOQUEADO

Frente: [[feature-manifest]] F092 (sequência F052b caminho A, gate F048
runtime-stable). Análoga em forma a F091 (também bloqueado e depois
descartado/fundido em F093).

## Status

`blocked` por **contract-mismatch** entre o briefing e o padrão real do legado.
Não foi escrito código, seed nem rota — nenhum arquivo novo em
`workspace/director-studio/` para F092.

## O briefing assumiu

> "model F043 inventou `acesso.sp_persistir_configuracao_cotacao`. Verdade
> legado: `Configuracoes/Cotacao/Cotacao.jsx` usa procs
> `cotacao_persistir_config_email` + `cotacao_sp_consultar_configuracao_email`
> + demais. Reescrever para gateway portal-aws."

Isto implica que F092 seria espelho de F090 (mesma forma de seed/proxy
gateway), só trocando o conjunto de procs.

## O que o legado realmente diz

Leitura **directa de `Configuracoes/Cotacao/Cotacao.jsx` (e tabs filhos)** —
realizada por instrução explícita do briefing (anti-violação preservada,
mesma exceção concedida em F091):

`Cotacao.jsx` é um **page-shell** que monta `<PageTabs>` com **9 tabs**, cada
um um componente próprio:

| # | tab | componente | API consumida |
|---|-----|------------|---------------|
| 1 | `gerais` | `CotacaoConfig.jsx` | `execProc('cotacao_persistir_config_opcoes')`, `execProc('cotacao_sp_consultar_opcoes')` via `useAppClient()` (appKey default `cotacao`) → `/api/cotacao/proc/<proc>` |
| 2 | `usuarios` | `CotacaoUsuarios.jsx` | model JSX inline com `datagrid.api = '/cotacao/proc/cotacao_sp_obter_usuarios'` + `postAsync('/cotacao/proc/cotacao_sp_persistir_usuario', ...)` — **note: path `/cotacao/proc/...` sem `/api`** (divergente de useAppClient) |
| 3 | `email` | `<ConfigEmail getInfoApi='cotacao_sp_consultar_configuracao_email' persistInfoApi='cotacao_persistir_config_email' testEmailApi='/api/teste-email'>` (appKey default `cotacao` no `ConfigEmail.jsx`) → `/api/cotacao/proc/<proc>` |
| 4 | `logo` | `ConfigLogo.jsx` | `execProc('cotacao_sp_consultar_logo_cliente')`, `execProc('cotacao_persistir_config_logo_cliente')` → `/api/cotacao/proc/<proc>` |
| 5 | `consulta` | `CotacaoConsulta.jsx` | REST não-proc: `/api/cotacaointegrador/consultar?e=...&id=...` |
| 6 | `sincronizar` | `CotacaoSincronizar.jsx` | REST não-proc: `/api/cotacaointegrador/...` |
| 7 | `monitorar` | `CotacaoMonitorar.jsx` | REST não-proc: `/api/cotacaointegrador/` |
| 8 | `opcoes` | `CotacaoOpcoes.jsx` | REST não-proc: `getAsync('/api/cotacaointegrador/opcoes')` + `postAsync('/api/cotacaointegrador/opcoes', {opcoes})` |
| 9 | `utilitarios` | `CotacaoUtilitarios.jsx` | REST não-proc: `getAsync('/api/cotacaointegrador/statusweb')` |

Hook canônico: `src/hooks/useAppClient.js` — `useAppClient(appKey = 'cotacao')`
emite `POST /api/${appKey}/proc/${proc}`. Default appKey é **`cotacao`**, não
`portal-aws`.

## Divergências de contrato

### 1. AppKey errado no briefing

Briefing aponta `/portal-aws/proc/cotacao_*`. Legado usa `/api/cotacao/proc/cotacao_*`.
O appKey é `cotacao`, **não** `portal-aws` — são duas registrations distintas
em `acesso.TBaplicacao` (já que `cotacao` é app própria com sua própria
config de bridge HTTP+JWT, mesmo handshake mas tenant diferente).

Replicar a rota literal `POST /portal-aws/proc/:proc` de F090 não atende —
precisaria de uma família `/api/:appKey/proc/:proc` (`appKey ∈ {cotacao,
agent, portal-aws, ...}`) com discovery dinâmico de config por tenant em
`acesso.TBaplicacao(<appKey>)`. Isso é decisão de **forma de proxy**, não
de feature de refactor.

### 2. Multi-superfície API impossível em "single genericform"

F043 modelou `configuracoes_cotacao` como `genericform` com 1 proc
(`acesso.sp_persistir_configuracao_cotacao` — inventada). Mas o legado é uma
**page de 9 tabs**, e cada tab tem renderer próprio:

- **Tabs 1, 3, 4** (gerais, email, logo): formulários consultar/persistir
  via procs do appKey `cotacao` — formato compatível com `genericform`-by-tab
  porém **com headers de tab no nível do model**, que F043 não tem.
- **Tab 2** (usuarios): `filtro + datagrid + genericform` com ações
  externalAction (Ativar/Inativar lote) usando appKey `cotacao` **com path
  divergente** `/cotacao/proc/...` (sem `/api`).
- **Tabs 5–9** (integrador-*): endpoints REST não-proc do AppBuilder
  `Cotacao.Integrador` (`/api/cotacaointegrador/...`) — fora completamente
  do conceito de proc gateway; é uma WebAPI .NET separada.

O conceito **"model F043 = JSON único renderizado por engine F009"** não
representa essa página. Renderizar `configuracoes_cotacao` schema-driven
exige um meta-model **tabbed page** + renderer-de-tab + suporte a
endpoints REST não-proc — nenhum desses existe nos contratos consolidados
([[obter-model-pagina]], [[portal-aws-bridge]]).

### 3. Endpoints `/api/cotacaointegrador/*` são clientes do AppBuilder

`Cotacao.Integrador` é uma WebAPI .NET separada (provavelmente em
`sources/engenharia--fabrica--dotnet*` — fora do meu escopo de leitura). É
um cliente HTTP, não proc. Cobrir essas 5 tabs (consulta/sincronizar/
monitorar/opcoes/utilitarios) no Studio requer:

(a) mapear a WebAPI `Cotacao.Integrador` (laudo archaeologist) — qual base
    URL, qual handshake, qual config em `acesso.TBaplicacao`;
(b) decidir se Studio proxia via gateway tipo F090/F024 (handshake JWT) ou
    se é HTTP plain com sessão;
(c) inventar renderers para os 5 tabs (não há renderer de "REST não-proc
    com options-grid" em F010/F011).

Provavelmente esses 5 tabs caem em **cutover-fase-2** (paralelo a F107
para definições_agendamento — também é "fora do conjunto proc-gateway
limpo"), não em F092.

## Decisões pendentes (curator + archaeologist, não smith)

1. **Forma do proxy multi-app**: extender F090 para uma rota literal
   `POST /:appKey/proc/:proc` (descoberta dinâmica em `TBaplicacao`)? Ou
   namespace `/api/:appKey/proc/:proc`? Ou rota dedicada por app
   (`/cotacao/proc/:proc`, `/agent/proc/:proc`, ...) explicitamente
   roteada? **Não é decisão de smith — afeta convention multi-feature**.

2. **Escopo de F092 (cutover-fase-1 Studio)**: cobre apenas os tabs
   proc-based do appKey `cotacao` (gerais, email, logo, usuarios), ou
   precisa cobrir os 5 tabs `/cotacaointegrador/*` também? Se sim, vira
   épico (5 features novas para os tabs integrador). Se não, F092 entrega
   parcial com tabs "Integrador" ausentes (UX precário) ou stub
   "indisponível neste cutover" (decisão de design).

3. **Meta-model tabs**: F043 não comporta tabs. Precisa um novo modelo
   `tabs: [{ tabName, tabLabel, model: <model-de-tab> }]` (espelho da
   estrutura JSX legacy) ou page-por-tab (`configuracoes_cotacao_gerais`,
   `configuracoes_cotacao_email`, ...) com um page-shell pai novo? Decisão
   de **forma de catálogo de pages**, afeta F010/F011/F009 + todos os
   F092..F094 que toquem em pages-tabbed (F093 talvez também).

4. **Path divergente `CotacaoUsuarios`**: o tab `usuarios` usa
   `/cotacao/proc/...` sem o `/api`. Bug legado ou intenção (mount
   separado)? Survey archaeologist em `acesso.TBaplicacao(cotacao)` para
   ver se há 2 entry-points distintos ou se a divergência só funciona por
   reverse-proxy ambíguo (NGINX wildcard).

5. **`/api/teste-email`**: endpoint legado de teste de email — onde mora
   no backend? É plain REST do Director.Website ou também proxia? Precisa
   da rota no Studio para o tab `email` funcionar — sem ela, o botão
   "Testar email" do model F092 quebra mesmo com proc-set correto.

6. **`acesso.TBaplicacao(cotacao)` existe?** Survey archaeologist: o
   tenant Imperial Logística (DBdirector_imperial_logistica_29) tem row
   `cotacao` em TBaplicacao com host/port/secret? Se não, F092 é
   inaplicável neste tenant (cutover bloqueado por dado de tenant, não
   por código).

## O que F092 **não** entrega (até desbloqueio)

- Nenhum seed `F092-model-configuracoes-cotacao.sql`.
- Nenhum apply script `apply-f092-seed.ts`.
- Nenhum probe `probe-f092.ts`.
- Nenhuma mudança em `portal-aws-proxy.ts` ou nova rota multi-app.
- Anti-violação preservada: leitura de `Configuracoes/Cotacao/*.jsx` +
  `useAppClient.js` + `ConfigEmail.jsx` permitida apenas pela exceção
  explícita do briefing ("Leia `Configuracoes/Cotacao/Cotacao.jsx` real");
  nenhuma outra área de `sources/engenharia--fabrica--*` foi acessada
  para esta análise.

## Próximo passo

Aguardar decisão curator + (eventualmente) survey archaeologist sobre:

- forma de proxy multi-app (item 1);
- escopo cutover-fase-1 de F092 (item 2);
- meta-model tabs (item 3);
- presença/config de `cotacao` em `TBaplicacao` (item 6).

Quando os itens acima estiverem resolvidos, F092 reabre. Provável
desfecho — espelhando F091→F093: F092 pode ser **fatiada** em sub-features
(uma por tab proc-based) e os 5 tabs integrador migrados para uma F108
deferred (análoga a F107) até o cutover-fase-2 cobrir Cotacao.Integrador.

## Notas

- F091 foi bloqueado pela mesma classe de problema e descartado/fundido em
  F093 — F092 não é duplicata (procs e appKey distintos), mas o **shape**
  do bloqueio é idêntico: briefing assume "single-proc gateway refactor",
  legado tem multi-superfície.
- F092 é provavelmente o caso mais complexo de F090..F094 — Cotacao.jsx
  tem 9 tabs vs Fornecedores.jsx (1 page filtro+datagrid+form) ou
  Email/Agendamento (1 tab email). F094 (`configuracoes_integrador-aws`)
  pode ter shape similar; quando for puxado, vale pré-survey antes do
  briefing assumir gateway-direto.
