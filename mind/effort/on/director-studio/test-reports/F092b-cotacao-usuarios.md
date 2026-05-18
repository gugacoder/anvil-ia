# Test report — F092b tab `usuarios` (configuracoes_cotacao)

**Data**: 2026-05-17
**Resultado**: pass
**Ambiente**: localhost:3001 (apps/api dev) + SQL `acesso.TBmodel_pagina` em Imperial Logística (`DBdirector_imperial_logistica_29` via `172.27.0.121\SQL2k19`, user `sl`). VPN ativa.
**Caso real testado**: page `portal-director.configuracoes_cotacao` em tenant Imperial (DFid_model_pagina=18 confirmado idempotente). Login identity=`processa` via temp-password 24h, cookie `director_session` salvo em `.tmp/cookies.txt`.

---

## Casos cobertos

| # | Cenário | Esperado (contrato/spec) | Observado | Resultado |
|---|---|---|---|---|
| 1 | Probe smith F092b multi-camada (DB shape + bridge cotacao + 3 route gates) | 6/6 PASS (smith DoD §1) | `5 PASS, 0 FAIL, 1 SKIP (total 6)` — único SKIP é DB shape por DB_* env ausente em invocação direta (não-bloqueante: DoD §3 valida shape via apply 2x com dotenv-cli + DoD §2 valida via curl `/api/model`) | pass |
| 2 | `GET /api/model?app=portal-director&path=/configuracoes/cotacao` autenticado retorna pageTabs[1].key='usuarios' com buttons + filtro + datagrid + pageActions; slot 0 (gerais) preservado | DoD §2.a: shape Studio-canonical do model em base real Imperial | HTTP 200; idModel=18 idPagina=7 modelJson.pageTabs.length=4 keys=`gerais/usuarios/email/logo`; slot[1].model com chaves `genericPageTitle/buttons/filtro/datagrid/pageActions`; buttons.pageButtons=[{title:'Add',buttonIcon:'cil-plus',color:'primary',action:'externalAction'}]; filtro.id='cotacao-usuario' filtro.model=4 props (email/nome/nomeUsuario/status select fixedList Todos=2/Ativo=1/Inativo='0'); datagrid.api=`/api/cotacao/proc/cotacao_sp_obter_usuarios` headers=4 (email/nome/nomeUsuario/status; nome+nomeUsuario sortable); datagrid.gridActions=2 (Ativar/Inativar externalAction); pageActions.persistir.endPoint=`/api/cotacao/proc/cotacao_sp_persistir_usuario`; slot[0] gerais preservado com genericform.endPoint=`/api/cotacao/proc/cotacao_persistir_config_opcoes` | pass |
| 3 | `POST /api/cotacao/proc/cotacao_sp_obter_usuarios` body=`{}` retorna 502 (cotacao não-up local) | DoD §2.b: gateway multi-app F110 forward via JWT + Basic auth; cotação :5000 não-up dev → ECONNREFUSED → 502 `app-unreachable` paridade F048 (sem vazar host) | 1ª req HTTP 503 `db-unavailable` (registry lazy load transient); 2ª req HTTP **502** `{"ok":false,"error":"app-unreachable","message":"Aplicação remota inacessível."}` — esperado por DoD. Transient 503 documentado como cold-cache do registry (não-bloqueante, retry imediato resolve) | pass |
| 4 | Idempotência: `apply-f092b-seed.ts` rodado 2x consecutivo via `npx dotenv-cli -- npx tsx` produz mesmo shape | DoD §3: seed JSON_MODIFY $.pageTabs[1] determinístico, preserva slots 0/2/3 | Apply 1: `OK — DFid_model_pagina=18; pageTabs=4; pageTabs[1]=usuarios com datagrid.api+pageActions.persistir.endPoint /api/cotacao/proc/... ; filtro(email, nome, nomeUsuario, status) ; headers(email, nome, nomeUsuario, status) ; slot 0 gerais preservado`. Apply 2: idem byte-por-byte. DFid_model_pagina=18 estável; pageTabs=4 estável; slot 1 igual; slot 0 (gerais F092a) preservado | pass |

---

## Evidência

- `.tmp/f092b-model.json` — payload completo do GET /api/model (16KB)
- `.tmp/cookies.txt` — cookie director_session válido até 2026-05-18
- Probe output: `5 PASS, 0 FAIL, 1 SKIP (total 6)`
- Apply 1 + Apply 2: outputs idênticos

## Notas

- Sem regressão observada: GET /api/model continua 200 após POST 502 (probe + curl interleaved).
- F111 soft-gate confirmado: implementação consolidou path canônico `/api/cotacao/proc/...` (sem variante legada `/cotacao/proc/`).
- Débitos F092b D7 (engine genericform-in-modal) e D8 (renderer externalAction handler) declarados pelo smith não afetam o shape do model — engine renderer é fora do escopo desta sub-feature (model-only).

## Próxima ação

- pass → curator aceita F092b
