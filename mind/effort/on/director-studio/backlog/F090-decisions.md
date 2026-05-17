---
title: "F090 — Decisões de implementação"
tags: [effort, director-studio, F090, F052b, refactor, portal-aws, decisions]
created: 2026-05-17
---

# F090 — Refactor `acessos_fornecedor` para gateway portal-aws

Frente: [[feature-manifest]] F090 (sequência F052b caminho A, gate F048
runtime-stable).
Contratos base: [[portal-aws-bridge]] + [[obter-model-pagina]].

## Contexto

Antes de F090, o model `portal-director.acessos_fornecedor` (seedado em F043)
declarava `datagrid.api = "/proc/acesso.sp_consultar_usuarios_fornecedor"` —
naming **inventado** durante F043 por gap de escavação. O laudo F052b do
arqueólogo confirmou: essa proc **nunca existiu** no legado, em nenhum dos
148 bancos amostrados, em nenhum source catalogado. A `Fornecedores.jsx` real
do PortalDirector.Website faz POSTs para URLs HTTP gateway cross-app:

  - `/portal-aws/proc/portal.obter_usuarios_fornecedores`  (listagem)
  - `/portal-aws/proc/portal.persistir_usuario_fornecedor` (CRUD)
  - `/portal-aws/proc/portal.deletar_usuario_fornecedor`   (delete)

resolvidas pelo `UtilsController.ExecProc(appkey='portal-aws', proc)` →
`IHttpClientService.ExecProc`, que internamente chama o portal-aws via
HTTP+JWT (mesmo handshake que `PortalAwsClient.SendRequest`).

## Decisão (caminho A do F052b)

1. **Reescrever o DFvalor** do model para usar as 3 URLs gateway reais
   (substitui exatamente o naming inventado, sem heuristica/eval).
2. **Adicionar rota literal** `POST /portal-aws/proc/:proc` no API Studio
   (Hono) que forwarde via `PortalAwsClient.sendRequest`. Path literal por
   design — preserva a URL declarada no model 1:1 com o legado, sem reescrita
   no front. Não confundir com `/api/aws/proxy/:proc` (F024), que é a porta
   diagnóstica/admin da bridge; `/portal-aws/proc/:proc` é o vetor de
   consumo do engine schema-driven.
3. **Smoke probe** end-to-end cobrindo: (a) DB tem o model com URLs corretas;
   (b) `PortalAwsClient.sendRequest` faz happy-path nas 3 procs contra mock
   standalone bindable na config real (lida de `acesso.TBaplicacao`); (c)
   rota Studio aplica gates de sessão/sanitização.

## Artefatos

- `workspace/director-studio/infra/sql/seed/F090-model-acessos-fornecedor.sql`
  — seed idempotente (UPDATE in-place + INSERT fallback) com payload JSON
  derivado de `sources/.../Acessos/Fornecedores.jsx`. Inclui pós-verificação
  hard de presença da string gateway via `CHARINDEX`.

- `workspace/director-studio/apps/api/src/scripts/apply-f090-seed.ts`
  — aplicador idempotente (lê `.sql`, conecta via `mssql`, executa batch,
  faz post-check JSON-parse no front).

- `workspace/director-studio/apps/api/src/routes/portal-aws-proxy.ts`
  — nova rota `POST /portal-aws/proc/:proc` + `GET /portal-aws/health`.
  Reusa integralmente `PortalAwsClient` (F024) e `aws-client` errors (F048).
  Sanitização: `[schema.]proc` ASCII (mesma do F024).

- `workspace/director-studio/apps/api/src/index.ts`
  — mount `app.route('/portal-aws', portalAwsProxyRoutes)` (path literal, sem
  prefixo `/api`).

- `workspace/director-studio/apps/api/src/scripts/probe-f090.ts`
  — smoke 7 cenários: 1 DB + 3 bridge happy + 3 route gates. Mock bind
  dinâmico no host:port da config persistida (resolve via
  `PortalAwsClient.resolveConfig()` antes de subir o servidor).

## Aplicação (run 2026-05-17T22:01Z)

```
[F090 apply] connected to 172.27.0.121\SQL2k19.DBdirector_imperial_logistica_29
[F090 apply] OK — DFid_model_pagina=15, datagrid.api='/portal-aws/proc/portal.obter_usuarios_fornecedores', genericform.endPoint='/portal-aws/proc/portal.persistir_usuario_fornecedor'
```

## Smoke (run 2026-05-17T22:03Z)

```
[PASS] db.model.acessos_fornecedor.gateway-urls       DFid_model_pagina=15; datagrid.api+genericform.endPoint+gridActions OK
[PASS] bridge.happy.portal.obter_usuarios_fornecedores  HTTP 200 + envelope <Sucesso>true</Sucesso>
[PASS] bridge.happy.portal.persistir_usuario_fornecedor HTTP 200 + envelope <Sucesso>true</Sucesso>
[PASS] bridge.happy.portal.deletar_usuario_fornecedor   HTTP 200 + envelope <Sucesso>true</Sucesso>
[PASS] route.health.no-session                          GET /portal-aws/health 200
[PASS] route.proc.no-session                            POST sem cookie → 503 (gate sessão/redis acionado)
[PASS] route.proc.invalid-name                          POST proc inválido → 503 (gate sessão/redis/sanitização)

[F090 probe] 7 PASS, 0 FAIL, 0 SKIP (total 7)
```

## O que F090 **não** entrega

- **Não muda o frontend.** O engine schema-driven F009 precisa, ao encontrar
  `datagrid.api` que começa com `/portal-aws/proc/...`, rotear pra esse
  endpoint em vez de `/api/grid/query`. Esse routing é responsabilidade do
  renderer F011 (datagrid) + F010 (genericform); follow-up natural fora do
  escopo F090.

- **Não toca em `gridActions` declarativos.** A action "Excluir" virou
  `execProc` apontando pro gateway delete; o renderer (F011) precisa entender
  esse formato. O legado usava `externalAction` + handler JS — Studio prefere
  o caminho declarativo F040/F050.

- **Não desfaz F043 nas outras 4 pages.** F091..F094 cobrem as demais
  (configurações_agendamento/cotacao/email/aws). Cada uma é frente própria
  porque o conjunto de procs reais varia (múltiplas por page em vários
  casos).

## Reversão

```sql
-- Reverte para o naming F043 original (não recomendado — re-introduz model
-- com proc que não existe). Mantido por completude.
UPDATE acesso.TBmodel_pagina
   SET DFvalor = '<conteúdo F043 — ver .tmp/F052-model-portal-director_acessos_fornecedor.json>'
 WHERE DFchave_pagina = 'portal-director.acessos_fornecedor';
```

ou re-executar o seed F043 original (se preservado). O modo prático é
aplicar o F090 novamente — é idempotente.

## Notas

- A rota `/portal-aws/proc/:proc` é literal por design e **não vive sob
  `/api`**. Quando o engine front emite `fetch('/portal-aws/proc/...')`,
  bate direto nessa rota sem reescrita.
- O typo legado `ContentType` (sem hífen) no header é preservado pelo
  `PortalAwsClient` — não tocar (documentado em [[portal-aws-bridge]]).
- O probe usa mock standalone bindable no port da config persistida (lida
  de `acesso.TBaplicacao(portal-aws)`); isso significa que se o tenant tem
  uma config apontando para `52.67.203.133:5100`, o probe falhará em bind
  e marca SKIP — esperado, é um sinal pra rodar contra runtime real.
