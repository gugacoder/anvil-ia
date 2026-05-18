# Test report — F092d tab `logo` (configuracoes_cotacao)

**Data**: 2026-05-17
**Resultado**: pass
**Ambiente**: localhost:3001 (apps/api dev) + SQL `acesso.TBmodel_pagina` em Imperial Logística (`DBdirector_imperial_logistica_29` via `172.27.0.121\SQL2k19`, user `sl`). VPN restaurada (ping 172.27.0.121 ≈52ms).
**Caso real testado**: page `portal-director.configuracoes_cotacao` em tenant Imperial (DFid_model_pagina=18 confirmado idempotente, slot 3 `logo`). Login identity=`processa` via temp-password 24h, cookie `director_session` reaproveitado de `/d/anvil/.tmp/cookies.txt` (válido até 2026-05-18).

---

## Casos cobertos

| # | Cenário | Esperado (contrato/spec) | Observado | Resultado |
|---|---|---|---|---|
| 1 | Probe smith F092d multi-camada (DB shape + bridge cotacao + 3 route gates) com VPN ativa | 6/6 PASS (DoD §1) | `6 PASS, 0 FAIL, 0 SKIP (total 6)` — VPN ativa permitiu execução do DB check direto (DFid_model_pagina=18; pageTabs=4; logo.logoUploader.api+endPoint OK; payloadProp=novoLogo/currentImageProp=logo/maxLengthProp=maxLength OK; accept=.jpeg,.jpg,.png; slots 0/1/2 preservados). Bridge cotacao both procs OK (R4+R6+R7). 3 route gates OK (no-session 503 / health 200 / uppercase 503). | pass |
| 2 | `GET /api/model?app=portal-director&path=/configuracoes/cotacao` autenticado retorna pageTabs[3].key='logo' com `logoUploader` shape canônica; slots 0/1/2 preservados (DoD §2) | shape Studio-canonical do model byte-perfect `ConfigLogo.jsx` em base real Imperial; canônicos `/api/cotacao/proc/...` (anti-F111) | HTTP 200; idModel=18 idPagina=7 modelJson.pageTabs.length=4 keys=`gerais/usuarios/email/logo`; slot[3].key=`logo` label=`Logo`; **logoUploader shape**: `api=/api/cotacao/proc/cotacao_sp_consultar_logo_cliente`, `endPoint=/api/cotacao/proc/cotacao_persistir_config_logo_cliente`, `payloadProp=novoLogo` (cf ConfigLogo.jsx linha 28), `currentImageProp=logo` (cf linha 98), `maxLengthProp=maxLength` (cf linha 45), `accept=".jpeg,.jpg,.png"`, `acceptMimeTypes=["image/jpeg","image/png"]` (cf linha 60), strings literais legado preservadas (`genericPageTitle="Logo"`, `genericPageDescription`, `emptySelectionMessage`, `selectFileLabel`, `extensionsHint=".jpg, .jpeg, .png"`, `submitLabel="Salvar"`). slot[0] gerais.genericform.endPoint=`/api/cotacao/proc/cotacao_persistir_config_opcoes` preservado; slot[1] usuarios.datagrid.api=`/api/cotacao/proc/cotacao_sp_obter_usuarios` preservado; slot[2] email.genericform.endPoint=`/api/cotacao/proc/cotacao_persistir_config_email` preservado. | pass |
| 3 | Idempotência: `apply-f092d-seed.ts` rodado 2x consecutivo via `npx dotenv-cli -- npx tsx` produz mesmo shape, preserva slots 0/1/2 (DoD §3) | seed JSON_MODIFY $.pageTabs[3] determinístico, guards THROW 50960/50961/50962 nos slots vizinhos | Apply 1: `OK — DFid_model_pagina=18; pageTabs=4; pageTabs[3]=logo com logoUploader.api+endPoint /api/cotacao/proc/... ; payloadProp=novoLogo / currentImageProp=logo / maxLengthProp=maxLength ; accept=.jpeg,.jpg,.png mimes=["image/jpeg","image/png"] ; slots 0 gerais + 1 usuarios + 2 email preservados`. Apply 2: idem byte-por-byte. Confirmação pós-apply via GET /api/model: `modelJson` serializado pré=4138 bytes / pós=4138 bytes / equal=`true`; pageTabs=4 estável em `gerais/usuarios/email/logo`. | pass |

---

## Evidência

- `.tmp/f092d-model.json` — payload completo do GET /api/model pré-apply (HTTP 200, 10891 bytes)
- `.tmp/f092d-model-postapply.json` — payload pós-apply 2x (HTTP 200, 10891 bytes, modelJson byte-perfect equal=true)
- `/d/anvil/.tmp/cookies.txt` — cookie director_session reaproveitado (válido até 2026-05-18)
- Probe output: `6 PASS, 0 FAIL, 0 SKIP (total 6)` (probe-f092d.ts via dotenv-cli)
- Apply 1 + Apply 2: outputs idênticos byte-por-byte (`DFid_model_pagina=18; pageTabs=4; pageTabs[3]=logo...`)

## Notas

- **VPN ativa nesta sessão** permitiu DB shape executar direto no probe (não-SKIP) — contraste com F092c que rodou com VPN intermitente e SKIPou DB shape (validado então por dotenv-cli + curl).
- F111 anti-violação confirmada no payload do GET: todos paths cotacao usam canônico `/api/cotacao/proc/...` (sem variante legada `/cotacao/proc/`, sem `/portal-aws/`, sem naming inventado `sp_persistir_logo_cotacao`/`sp_consultar_logo_cotacao`).
- Slots vizinhos preservados (anti-violação F092a/F092b/F092c): gerais com `cotacao_persistir_config_opcoes`, usuarios com `cotacao_sp_obter_usuarios`, email com `cotacao_persistir_config_email` + pageActions.testEmail intactos.
- Shape `logoUploader` é a primeira ocorrência desse componente declarativo no Studio (débito D10 sistêmico: engine renderer de logoUploader fora escopo desta sub-feature; declarativo aceitável cf manifest).
- **Fecha epic F092** (4/4 sub-features `accepted` quando curator confirmar): F092a gerais + F092b usuarios + F092c email + F092d logo.

## Próxima ação

- pass → curator aceita F092d e fecha epic F092
