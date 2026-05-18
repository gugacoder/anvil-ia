---
title: "F093 — Decisões de implementação"
tags: [effort, director-studio, F093, F091, F052b, refactor, agent, decisions]
created: 2026-05-18
---

# F093 — Refactor `configuracoes_email` (+ absorve F091 `configuracoes_agendameno`)

**Status:** ready-for-test
**Data:** 2026-05-18
**Frente:** [[feature-manifest]] F093 (sequência F052b caminho A; gate F048
runtime-stable; absorve F091 cf decisão curator 2026-05-17).
**Contratos base:** [[obter-model-pagina]] + [[portal-aws-bridge]] §"Caminho 1
multi-app" + [[tbaplicacao-registry]] §R5 (default Bearer JWT) §R24 (agent
ausente em Imperial).
**Template-base:** F092c (genericform single + pageActions.testEmail) — shape
mais próximo. F093 NÃO é page-tabs (não usa F108).

---

## D1 — Mitigação R24 (Imperial sem appKey `agent`): seed (a)

[[tbaplicacao-registry]] §R24 confirma que `DBdirector_imperial_logistica_29`
não tem `DFchave='agent'` (agent presente em apenas 43/89 bases cross-tenant).
Sem essa linha, `multi-app-proxy` (F110) retorna 404 `app-not-found` ao
resolver `agent` — runtime quebra antes mesmo do forward.

**Saídas avaliadas:**
- **(a) Seed idempotente TBaplicacao(agent) em Imperial pré-cutover** —
  escolhida.
- (b) Fallback `<ConfigEmail appKey='cotacao'>` — **rejeitada**: duplica
  F092c (configuracoes_cotacao já tem tab email cotacao-based) e desvirtua
  o significado da page `configuracoes_email` (deveria ser config global
  via agent, não config cotacao).
- (c) Detect-and-empty no front — **rejeitada**: UX quebrada em Imperial
  (único tenant de teste); não permite probe de bridge runtime; força
  rework quando Imperial ganhar agent real.

**Dados do seed:**

| Coluna | Valor | Justificativa |
|---|---|---|
| `DFchave` | `'agent'` | Literal R10 kebab-case (cross-tenant estável) |
| `DFnome` | `'Agent'` | Label legível (não consumido por F110) |
| `DFdescricao` | `'Módulo de agendamento (Agent) — F093 mitigação R24 pré-cutover'` | Documenta no DB que esta linha é dev-seed |
| `DFendereco` | `'http://127.0.0.1:5200'` | Loopback dev paridade Imperial cotacao :5000; porta 5200 é o core observado em R24 universe (`agent` 43 bases tem `http://52.67.203.133:5200` como `DFendereco` distinto majoritário) |
| `DFdominio` | `'imperial'` | Paridade Imperial cotacao `DFdominio='cotacao'` (default-tenant não-prod); produção real usa slug do tenant — `engenharia`/`srgranel`/`esquinao` etc |
| `DFhabilitado` | `0` | Paridade Imperial restante; F110 ignora flag (R11/R13 — só menu filtra) |

**Idempotência:** UPSERT por `DFchave='agent'` com `COALESCE(NULLIF(...))`
para preservar valores reais já populados (não-NULL/não-vazios) em
reaplicações. Em DB virgem, INSERT. Em DB já com agent real (43 bases
restantes), UPDATE soft NÃO sobrescreve `DFendereco`/`DFdominio` reais.

**Anti-violação:** `THROW 50970/50971` se `DFendereco`/`DFdominio` ficarem
vazios após o apply.

---

## D2 — Absorção de F091 no MESMO seed

Decisão curator 2026-05-17 (manifest F091 `discarded`): `Agendamento.jsx` no
PortalDirector.Website é só tab email-only que monta `<ConfigEmail appKey='agent'>`
— consome o MESMO par de procs que `configuracoes_email`. Procs
`persistir_definicoes_agendamento` e `persistir_data_bloqueio_agendamento`
existem em `portal-aws/agent` mas zero hits no Director — provavelmente
consumidas pelo AppBuilder/agent-UI (cutover-fase-2, F107).

**Decisão:** o seed F093 reescreve AMBOS os models F043 (`#2` typo legado
`configuracoes_agendameno`, `#4` `configuracoes_email`) com payload
**IDÊNTICO** (genericform single com mesmas 6 campos + pageActions.testEmail).

**Por quê typo `agendameno`?** F043 seedou `portal-director.configuracoes_agendameno`
sem o `t` final — typo histórico que casa com a linha real em `acesso.TBpagina`
em Imperial. Mudar para `agendamento` aqui quebra o join `TBpagina → TBmodel_pagina`
e a navegação no menu. Preservo a typo até uma frente dedicada de housekeeping
(corrigir typo simultaneamente em TBpagina + TBmodel_pagina cross-tenant fica
fora do escopo F093).

**Verificação:** o post-check do apply roda o mesmo conjunto de asserções
sobre os 2 models — falha duro se um divergir do outro.

---

## D3 — Shape genericform single (paridade F092c)

`ConfigEmail.jsx` é um formulário plano com 6 campos. F092c já estabeleceu
o shape canônico. F093 reusa byte-perfect:

| Prop        | Type     | Required | maxLength | maskType | Origem legado          |
|-------------|----------|----------|-----------|----------|------------------------|
| smtp        | text     | true     | 255       | —        | linha 118-126          |
| portaSmtp   | text     | true     | 5         | inteiro  | linha 128-139          |
| usuario     | text     | true     | 255       | —        | linha 143-150          |
| senha       | text     | true     | 255       | —        | linha 153-160          |
| remetente   | text     | false    | 255       | —        | linha 163-172          |
| ssl         | checkbox | false    | —         | —        | linha 173-181          |

**Required = 4** (smtp/portaSmtp/usuario/senha) — exato da função
`verifyRequired` linha 45 do legado.

`senha` segue `type: 'text'` (legado usa `<Input>` plain, não password
mask) — paridade fiel; débito implícito de promoção opcional no renderer.

`ssl` é `checkbox` boolean — legado normaliza string `'true'`/boolean true
na hidratação; renderer trata a coerção.

---

## D4 — AppKey `agent` → auth Bearer JWT (R5 default)

Diferente de F092c (cotacao → Basic R4 hardcoded), `agent` cai no caso
**default** de [[tbaplicacao-registry]] §R5: `Authorization: Bearer <jwt>`
com `DirectorIdentity` fixa (`Id=1, Name='processa', Empresa=0, NomeEmpresa='Processa', Domain=DFdominio`),
assinada com `STUDIO_AWS_JWT_SECRET`.

`buildOutboundHeaders(entry={appKey:'agent', endereco:..., dominio:'imperial'})`
do `app-registry.ts` produz exatamente isso — sem nenhuma alteração no F110
(reuso integral, paridade F090/F092a-d).

Probe valida `cap.authorization.startsWith('Bearer ')` + decodifica payload
JWT (tolerante à variação de nome de claim — assert real é o header
`Domain: imperial` via R6).

---

## D5 — F112 soft-gate `/api/teste-email` declarativo (herdado de F092c)

Idêntico a F092c — declaro `pageActions.testEmail.endPoint='/api/teste-email'`
no model. NÃO crio rota Studio paralela nesta feature. Mount real do
endpoint não-proc é débito sistêmico D9 (já enfileirado em F112 soft-gate).
Probe verifica que o contrato declarativo está presente nos 2 models.

---

## D6 — Reuso F110 integral

Nenhuma rota nova criada. `multi-app-proxy.ts` + `app-registry.ts` cobrem
ambas procs (`agent.sp_consultar_configuracao_email`,
`agent.persistir_config_email_agendamento`) sem 1 linha adicional. Cobertura
total via paridade R5 default Bearer JWT + R6 Domain + R7 URL `/api/proc/<proc>`.

`/api/teste-email` (F112) NÃO passa pelo proxy multi-app (é endpoint plain
não-proc) — nada a mexer em F110.

---

## D7 — Anti-violações canônicas

Defesa em profundidade em SQL + TS + probe contra 5 classes de regressão:

1. **AppKey errado** — `THROW 50975` se `/portal-aws/` vazar no DFvalor.
2. **AppKey errado cross-feature** — `THROW 50976` se `/api/cotacao/proc/`
   vazar (F092c byproduct potencial num refactor errado).
3. **Naming inventado #1** — `THROW 50977` se `acesso.sp_persistir_configuracao_email`
   (naming F043 original inventado) vazar.
4. **Naming inventado #2** — `THROW 50978` se `acesso.sp_persistir_configuracao_agendamento`
   (naming F043 original inventado para o model #2) vazar.
5. **Path divergente F111** — `THROW 50979` se `"/agent/proc/` (sem `/api`)
   vazar — canônico é `/api/agent/proc/`.

Os mesmos checks são replicados no apply TS (post-check) e no probe.

---

## D8 — Pontos NÃO entregues por F093 (escopo claro)

- **NÃO** entrego mount real do endpoint `/api/teste-email` (débito D9
  herdado de F092c — F112 soft-gate).
- **NÃO** entrego renderer pageActions.testEmail no engine front (sub-contrato
  pendente cf nota N1 de F092c, registrado pela curator).
- **NÃO** corrijo a typo histórica `agendameno` → `agendamento` em TBpagina
  (frente própria; preservar para casar com seed F043 + Imperial).
- **NÃO** seedo TBaplicacao(agent) cross-tenant (43 bases já têm; 46 que
  não têm são out-of-scope sem decisão de curator — Imperial é o tenant
  de teste).
- **NÃO** propago `agent.persistir_definicoes_agendamento` /
  `persistir_data_bloqueio_agendamento` — escopo cutover-fase-2 (F107
  AppBuilder/agent-UI).

---

## Notas de execução

- **Typecheck:** verde 3 packages (api/ui/director-studio).
- **Apply 1:** OK — TBaplicacao(agent) INSERT (Imperial era virgem para
  agent), configuracoes_email UPDATE (DFid=20), configuracoes_agendameno
  UPDATE (DFid=16).
- **Apply 2:** OK — mesmos DFids, mesma estrutura (idempotência
  confirmada). Agent row passou pelo branch UPDATE soft (COALESCE NULLIF
  preserva — mas DB já tinha valores válidos).
- **Probe:** 8/8 PASS — DB tbapl agent + 2 DB models + bridge 2 procs
  (Bearer R5 + Domain R6 + URL R7) + 3 route gates (no-session 503,
  health 200, uppercase 503 R10/R23).
- **Reuso F110:** integral — nenhuma rota nova criada.

## Cobertura legado vs Studio

| Legado `Agendamento.jsx` / `ConfigEmail.jsx` (agent) | Studio F093 |
|---|---|
| `<ConfigEmail appKey='agent' getInfoApi='agent.sp_consultar_configuracao_email' persistInfoApi='agent.persistir_config_email_agendamento'>` | `genericform.api = /api/agent/proc/agent.sp_consultar_configuracao_email` + `endPoint = /api/agent/proc/agent.persistir_config_email_agendamento` |
| `testEmailApi='/api/teste-email'` via `postAsync` | `pageActions.testEmail.endPoint = /api/teste-email` (declarativo, F112 soft-gate) |
| 6 inputs (smtp/portaSmtp/usuario/senha/remetente/ssl) | `genericform.model[]` 6 campos byte-perfect com F092c |
| `verifyRequired()` 4 campos | `required: true` em smtp/portaSmtp/usuario/senha |
| Save → POST `persistInfoApi` (Bearer JWT via `useAppClient('agent')`) | engine F009 default + F110 multi-app default Bearer JWT (R5) |
| Test → POST `testEmailApi` body composto | `pageActions.testEmail.endPoint` (D9 — engine constrói body do state em runtime quando F112 desbloqueia) |

## Anti-violações herdadas/novas (resumo)

- Não inventei procs — usei exclusivamente as 2 do contrato
  [[tbaplicacao-registry]] §"R24" e da decisão curator F052b/F091.
- Não criei rotas — F110 cobre tudo.
- Não toquei em sources legados — apenas contratos do arqueólogo.
- Mitigação F113 R24 com seed (a) registrada in-line no SQL (comentário
  multi-linha § "Mitigação F113 R24") + neste backlog.
- Path canônico `/api/agent/proc/...` (não `/agent/proc/...` — F111
  mitigação herdada).
