# Test report — F093 `configuracoes_email` (absorve F091 `configuracoes_agendameno`)

**Data**: 2026-05-17
**Resultado**: pass
**Ambiente**: localhost:3001 (apps/api dev) + SQL `acesso.TBmodel_pagina` em Imperial Logística (`DBdirector_imperial_logistica_29` via `172.27.0.121\SQL2k19`). VPN ativa.
**Caso real testado**: pages `portal-director.configuracoes_email` (DFid_model_pagina=20, DFid_pagina=18) e `portal-director.configuracoes_agendameno` (typo legado preservado, DFid_model_pagina=16, DFid_pagina=6) em tenant Imperial. Login identity=`processa` via temp-password 24h, cookie `director_session` reaproveitado de `D:/anvil/.tmp/cookies.txt` (válido até 2026-05-18; `/api/auth/me` 200 confirma sessão `id=1 nome=processa codEmpresa=1 NomeEmpresa=Processa path=temp-password loginAt=2026-05-17T23:58:56.929Z`).

---

## Casos cobertos

| # | Cenário | Esperado (DoD/contrato) | Observado | Resultado |
|---|---|---|---|---|
| 1 | Probe smith F093 multi-camada (DB tbapl agent R24 + 2 DB models + bridge agent + 3 route gates) | DoD §1: 8/8 PASS | `8 PASS, 0 FAIL, 0 SKIP (total 8)` — db.tbaplicacao.agent.R24 (DFendereco=http://127.0.0.1:5200 DFdominio=imperial DFhabilitado=false), db.model.configuracoes_email (DFid=20 6 campos 4 required testEmail OK), db.model.configuracoes_agendameno (DFid=16 mesmo shape), bridge.agent.agent.sp_consultar_configuracao_email (Bearer JWT R5 + Domain=imperial R6 + URL /api/proc/<proc> R7), bridge.agent.agent.persistir_config_email_agendamento (mesmas asserções), route.agent.proc.no-session 503, route.agent.health 200, route.invalid-app-key.uppercase 503 R10/R23 | pass |
| 2 | `GET /api/model?app=portal-director&path=/configuracoes/email` autenticado → genericform 6 campos + pageActions.testEmail.endPoint=/api/teste-email | DoD §2.a: shape Studio-canonical byte-perfect ConfigEmail.jsx (paridade F092c) com URLs gateway `/api/agent/proc/...` | HTTP 200; pageKey=`portal-director.configuracoes_email` idModel=20 idPagina=18; `modelJson.genericform.api=/api/agent/proc/agent.sp_consultar_configuracao_email`, `endPoint=/api/agent/proc/agent.persistir_config_email_agendamento`; **6 campos** ordem ConfigEmail.jsx: `smtp`(text,required,maxLength=255), `portaSmtp`(text,required,maskType=inteiro,maxLength=5), `usuario`(text,required,maxLength=255), `senha`(text,required,maxLength=255), `remetente`(text,opcional,maxLength=255), `ssl`(checkbox,opcional); `pageActions.testEmail.endPoint=/api/teste-email` (F112 declarativo) | pass |
| 3 | `GET /api/model?app=portal-director&path=/configuracoes/agendamento` autenticado → mesmo payload byte-perfect | DoD §2.b: F091 absorvida — payload IDÊNTICO ao do email | HTTP 200; pageKey=`portal-director.configuracoes_agendameno` (typo DFchave preservado p/ casar TBpagina F043) idModel=16 idPagina=6. `modelJson` e `modelStringRaw` **byte-perfect idênticos** ao caso 2 (validado via `JSON.stringify(a.modelJson)===JSON.stringify(b.modelJson)` → true e `a.modelStringRaw===b.modelStringRaw` → true). Diferem apenas em `pageKey/idModel/idPagina`, conforme esperado. Path real registrado em TBpagina é `/configuracoes/agendamento` (sem typo); `/configuracoes/agendameno` retorna `page-not-found` esperado (DFcaminho legado canônico = "agendamento"). | pass |
| 4 | `POST /api/agent/proc/agent.sp_consultar_configuracao_email` body=`{}` autenticado → 502 ou 200 | DoD §2.c: agent semeado em `http://127.0.0.1:5200` sem app real → ECONNREFUSED → 502 `app-unreachable` (paridade F048) | HTTP **502** `{"ok":false,"error":"app-unreachable","message":"Aplicação remota inacessível."}` — esperado pelo DoD; gateway F110 forwardeou via Bearer JWT (R5 default — agent NÃO é case cotacao) + Domain=imperial (R6) + URL /api/proc/<proc> (R7), cf probe bridge agent §1 | pass |
| 5 | Idempotência: `apply-f093-seed.ts` 2x consecutivo → outputs operacionais byte-perfect + GET pós-apply preserva shape | DoD §3: seed JSON_MODIFY + UPSERT TBaplicacao(agent) determinístico; preserva valores reais via COALESCE NULLIF em reapplies | Apply 1: `R24 ok — TBaplicacao(agent) DFendereco=http://127.0.0.1:5200 DFdominio=imperial DFhabilitado=false; OK configuracoes_email DFid=20 6 campos 4 required testEmail=/api/teste-email; OK configuracoes_agendameno DFid=16 mesmo shape`. Apply 2: idem (diff apenas em timestamp+PID do logger pino). GET pós-apply em ambos paths: `diff f093-email.json f093-email-post.json` empty (EMAIL-IDENTICAL); `diff f093-agendamento.json f093-agend-post.json` empty (AGEND-IDENTICAL) | pass |

---

## Evidência

- `D:/anvil/.tmp/f093-email.json` — payload GET /api/model email pré-apply (2347B)
- `D:/anvil/.tmp/f093-agendamento.json` — payload GET /api/model agendamento pré-apply (2351B; difere só em pageKey/idModel/idPagina)
- `D:/anvil/.tmp/f093-email-post.json` + `f093-agend-post.json` — pós-apply byte-perfect
- `D:/anvil/.tmp/f093-apply1.txt` + `f093-apply2.txt` — outputs apply 2x (diff só timestamp/PID)
- Probe output: `8 PASS, 0 FAIL, 0 SKIP (total 8)` (probe-f093.ts; mock agent up at http://127.0.0.1:5293)
- `/api/auth/me` 200 confirma sessão temp-password válida (loginAt 2026-05-17T23:58:56Z, expira 2026-05-18T23:58:56Z)

## Notas

- DoD §2 menciona path `/configuracoes/agendamento` — confirmado que é o `DFcaminho` real em `acesso.TBpagina` (sem typo). O typo legado vive apenas em `DFchave_pagina=configuracoes_agendameno` (preservado para casar TBpagina seed F043 cf decisão smith). Validei ambos os paths: `/configuracoes/agendamento` resolve (200, idModel=16), `/configuracoes/agendameno` retorna `page-not-found` (esperado — DFcaminho não tem typo).
- Mitigação F113 R24 (Imperial sem appKey `agent`) validada empiricamente: probe §0 confirma `TBaplicacao(DFchave='agent')` agora existe em Imperial com `DFendereco=http://127.0.0.1:5200 DFdominio=imperial DFhabilitado=false` — saída (a) do briefing aplicada idempotente.
- F092c já validou byte-perfect mesmo shape ConfigEmail.jsx em 2026-05-17 (audit-pass-by-reference cf orchestrator nota archaeologist 2026-05-18T01:17:47Z). F118 enfileirado P3 (extração fontes legado + contrato formal `configuracoes-email-component.md`).
- Auth scheme correto via F110: agent default Bearer JWT (R5), distinto de cotacao Basic Auth — probe bridge cenário §2 confirma assinatura HS256 + Domain=imperial + URL canônica.
- F112 (`/api/teste-email`) permanece declarativo (débito D9 herdado de F092c): shape carrega `pageActions.testEmail.endPoint`, mount runtime fora de escopo F093.
- Anti-violações canônicas confirmadas no shape final (5 classes): nenhum `/portal-aws/`, nenhum `/api/cotacao/proc/`, nenhum naming inventado `acesso.sp_persistir_configuracao_email|agendamento`, nenhum path F111 `/agent/proc/` sem `/api`.

## Próxima ação

- pass → curator aceita F093 (fecha F091 absorvida)
