# Test report — F092c tab `email` (configuracoes_cotacao)

**Data**: 2026-05-17
**Resultado**: pass
**Ambiente**: localhost:3001 (apps/api dev) + SQL `acesso.TBmodel_pagina` em Imperial Logística (`DBdirector_imperial_logistica_29` via `172.27.0.121\SQL2k19`, user `sl`). VPN ativa.
**Caso real testado**: page `portal-director.configuracoes_cotacao` em tenant Imperial (DFid_model_pagina=18 confirmado idempotente, slot 2 `email`). Login identity=`processa` via temp-password 24h, cookie `director_session` reaproveitado de `/d/anvil/.tmp/cookies.txt` (válido até 2026-05-18).

---

## Casos cobertos

| # | Cenário | Esperado (contrato/spec) | Observado | Resultado |
|---|---|---|---|---|
| 1 | Probe smith F092c multi-camada (DB shape + bridge cotacao + 3 route gates) | 6/6 PASS (smith DoD §1) | `5 PASS, 0 FAIL, 1 SKIP (total 6)` — único SKIP é DB shape por DB_* env ausente em invocação direta (não-bloqueante: DoD §3 valida shape via apply 2x com dotenv-cli + DoD §2 valida via curl `/api/model`) | pass |
| 2 | `GET /api/model?app=portal-director&path=/configuracoes/cotacao` autenticado retorna pageTabs[2].key='email' com genericform 6 campos + pageActions.testEmail; slots 0/1 preservados | DoD §2.a: shape Studio-canonical do model byte-perfect `ConfigEmail.jsx` em base real Imperial | HTTP 200; idModel=18 idPagina=7 modelJson.pageTabs.length=4 keys=`gerais/usuarios/email/logo`; slot[2].key=`email` label=`E-mail`; genericform.api=`/api/cotacao/proc/cotacao_sp_consultar_configuracao_email` genericform.endPoint=`/api/cotacao/proc/cotacao_persistir_config_email`; **6 campos** ordem ConfigEmail.jsx: `smtp`(text,required,maxLength=255), `portaSmtp`(text,required,maskType=inteiro,maxLength=5), `usuario`(text,required,maxLength=255), `senha`(text,required,maxLength=255), `remetente`(text,opcional,maxLength=255), `ssl`(checkbox,opcional); pageActions={testEmail:{endPoint:`/api/teste-email`}} (F112 declarativo); slot[0] gerais preservado com genericform.endPoint=`/api/cotacao/proc/cotacao_persistir_config_opcoes`; slot[1] usuarios preservado com datagrid.api=`/api/cotacao/proc/cotacao_sp_obter_usuarios`; slot[3] logo stub intacto | pass |
| 3 | `POST /api/cotacao/proc/cotacao_persistir_config_email` body=`{}` retorna 502 (cotacao não-up local) | DoD §2.b: gateway multi-app F110 forward via Basic Auth (R4 cotacao); cotação :5000 não-up dev → ECONNREFUSED → 502 `app-unreachable` paridade F048 (sem vazar host) | 2 chamadas consecutivas → HTTP **502** `{"ok":false,"error":"app-unreachable","message":"Aplicação remota inacessível."}` ambas. Esperado por DoD. | pass |
| 4 | Idempotência: `apply-f092c-seed.ts` rodado 2x consecutivo via `npx dotenv-cli -- npx tsx` produz mesmo shape, preserva slots 0/1/3 | DoD §3: seed JSON_MODIFY $.pageTabs[2] determinístico, guards THROW 50948/50949 nos slots vizinhos | Apply 1: `OK — DFid_model_pagina=18; pageTabs=4; pageTabs[2]=email com genericform.api+endPoint /api/cotacao/proc/... ; pageActions.testEmail.endPoint=/api/teste-email (F112) ; campos(smtp, portaSmtp, usuario, senha, remetente, ssl) required(smtp, portaSmtp, usuario, senha) ; slot 0 gerais + slot 1 usuarios preservados`. Apply 2: idem byte-por-byte. Confirmação pós-apply via GET /api/model: idModel=18 estável, pageTabs=4 estável, slot 0 gerais.endPoint inalterado, slot 1 usuarios.datagrid.api inalterado, slot 2 email 6 campos com api+endPoint+testEmail, slot 3 logo intacto | pass |

---

## Evidência

- `.tmp/f092c-model.json` — payload completo do GET /api/model (pré-apply curl, 16KB+)
- `.tmp/f092c-model-postapply.json` — payload pós-apply 2x confirmando idempotência
- `/d/anvil/.tmp/cookies.txt` — cookie director_session reaproveitado (válido até 2026-05-18)
- Probe output: `5 PASS, 0 FAIL, 1 SKIP (total 6)` (probe-f092c.ts)
- Apply 1 + Apply 2: outputs idênticos (`DFid_model_pagina=18; pageTabs=4; pageTabs[2]=email...`)

## Notas

- Transient cold-cache do registry **não** observado nesta sessão (1ª POST proc já 502 — registry quente após sessões F092a/b prévias).
- F112 (`/api/teste-email`) é débito D9 declarativo: shape model carrega `pageActions.testEmail.endPoint=/api/teste-email`, mas mount runtime do endpoint é fora de F092c (sub aceitável sem botão runtime cf manifest). Quando F112 ganhar implementação, botão "Testar email" do renderer engageará declarativamente sem mudança de seed.
- F111 anti-violação confirmada: todos paths cotacao usam canônico `/api/cotacao/proc/...` (sem variante legada `/cotacao/proc/`).
- Slots vizinhos preservados: gerais (F092a) com `cotacao_persistir_config_opcoes`, usuarios (F092b) com `cotacao_sp_obter_usuarios` + `cotacao_sp_persistir_usuario`, logo (stub F092d) intacto.

## Próxima ação

- pass → curator aceita F092c
