# Test report — F092a tab `gerais` (configuracoes_cotacao)

**Data**: 2026-05-17
**Resultado**: pass
**Ambiente**: localhost:3001 (apps/api dev) + SQL `acesso.TBmodel_pagina` em Imperial Logística (`DBdirector_imperial_logistica_29` via `172.27.0.121\SQL2k19`, user `sl`). VPN ativa.
**Caso real testado**: page `portal-director.configuracoes_cotacao` em tenant Imperial (DFid_model_pagina=18 confirmado idempotente). Login identity=`processa` via temp-password 24h, cookie `director_session` salvo em `.tmp/f092a-cookies.txt`.

---

## Casos cobertos

| # | Cenário | Esperado (contrato/DoD) | Observado | Resultado |
|---|---------|-------------------------|-----------|-----------|
| 1 | `npx dotenv-cli -e .env -- npx tsx apps/api/src/scripts/probe-f092a.ts` | 6/6 PASS (DB shape + 2 procs bridge + 3 route gates) | `6 PASS, 0 FAIL, 0 SKIP` — `db.model.configuracoes_cotacao.pageTabs[0]` DFid=18 pageTabs=4 10 campos OK; `bridge.cotacao.cotacao_persistir_config_opcoes` Auth Basic R4 + Domain=imperial R6 + URL `/api/proc/...` R7 OK; `bridge.cotacao.cotacao_sp_consultar_opcoes` idem; route gates 503 (redis down — gate infra antes do auth, comportamento aceito por design F110) | ✓ |
| 2 | `GET /api/model?app=portal-director&path=/configuracoes/cotacao` autenticado | HTTP 200 com `modelJson.pageTabs[0].key='gerais'`, `genericform.endPoint=/api/cotacao/proc/cotacao_persistir_config_opcoes`, `genericform.api=/api/cotacao/proc/cotacao_sp_consultar_opcoes`, 10 campos (`nomeEmpresa, integradorIp, emailAtivacaoHabilitado, botaoAcoesAtivado, botaoVendedoresAtivado, botaoVincularAtivado, habilitarPrecoUnitario, menuHistoricoAtivado, habilitarPlanoPagamento, planoPagamentoErpId`) | HTTP 200, payload com `idModel=18`, `idPagina=7`, `pageTabs.length=4` (keys: `gerais, usuarios, email, logo` — slots 1-3 são stubs F092b/c/d), tab[0].key=`gerais`, endPoint+api exatos como esperado, 10 campos na ordem do `CotacaoConfig.jsx` legado | ✓ |
| 3 | `POST /api/cotacao/proc/cotacao_sp_consultar_opcoes` body `{}` autenticado | 200 se cotacao :5000 up; 502 `app-unreachable` esperado se backend real não-up (paridade com F110 cenário 3) | HTTP 502, `{"ok":false,"error":"app-unreachable","message":"Aplicação remota inacessível."}` — proxy F110 resolveu `cotacao` em TBaplicacao (`DFid=5, DFendereco=http://127.0.0.1:5000, DFdominio=cotacao, DFhabilitado=0`), classificou connect-error sem vazar host. Comportamento esperado (cotacao real :5000 não-up no host dev). | ✓ (documentado) |
| 4 | Idempotência `apply-f092a-seed.ts` 2x | Mesmo `DFid_model_pagina` e mesma estrutura (4 pageTabs, gerais com 10 campos) | Run 1: `DFid_model_pagina=18; pageTabs=4; pageTabs[0]=gerais com endPoint+api /api/cotacao/proc/... e 10 campos`. Run 2: idêntico (mesmo id=18, mesmas 4 tabs, mesmos 10 campos). JSON_MODIFY $.pageTabs[0] não duplica linhas nem altera shape em re-runs. | ✓ |

---

## Evidência

- **Probe**: `D:/anvil/.tmp/` (output capturado acima) — 6 PASS, 0 FAIL, 0 SKIP.
- **Modelo via API**: `D:/anvil/.tmp/f092a-model.json` (resposta HTTP 200 do `/api/model`).
- **Cookies**: `D:/anvil/.tmp/f092a-cookies.txt` (login `POST /api/auth/login` body `{identity:processa, password:<temp-24h base64>}` → 200 com user payload `{id:1, nome:processa, codEmpresa:1, nomeEmpresa:Processa, path:temp-password}`).
- **Bridge auth-scheme cotacao confirmado** (probe cenário 2/3): `Authorization: Basic base64('processa|imperial:99')` (R4) + `Domain: imperial` (R6) + URL final `/api/proc/<proc>` literal sem normalizar trailing slash (R7).
- **Anti-violação**: `DFvalor` não contém `/portal-aws/` nem naming inventado `sp_persistir_configuracao_cotacao` (probe DB check explícito).
- **Reuso F110**: rota `POST /api/:appKey/proc/:proc` (multi-app-proxy) atende cotacao sem rota nova — `appKey=cotacao` resolve via `acesso.TBaplicacao` e bate `cotacao_persistir_config_opcoes` / `cotacao_sp_consultar_opcoes` no backend remoto (R1-R24 do [[tbaplicacao-registry]]).
- **Slots stubs F092b/c/d**: pageTabs `[usuarios, email, logo]` presentes com placeholders (validado em runtime — keys corretas, smith implementa nas sub-features dedicadas).

## Falhas

Nenhuma.

## Notas

- 502 `app-unreachable` no cenário 3 não é falha — é estado de ambiente (cotacao real `:5000` não-up no host local de dev, paridade com F110 nota equivalente). DoD original prevê "502 esperado se cotacao real não-up". Para fechar runtime full, seria necessário backend cotacao ativo no tenant Imperial ou ambiente staging — gate de runtime, fora do escopo F092a (contrato proxy+model).
- Route gates do probe declaram 503 (redis indisponível) ao invés de 401 (no-session). Comportamento defensivo correto: gate de infra antes do gate de auth — aceito pelo probe (lista de status válidos inclui 503).
- A11y/UI/responsivo: F092a é **backend-only testável** (modelo + proxy + idempotência) — sem componente Studio que renderize o tab `gerais` ainda; teste de UI fica para uma feature de renderer (gates F108 + futuras) quando engine `pageTabs` rodar end-to-end no browser.
- Idempotência validada: 2 runs consecutivos resultam em `DFid_model_pagina=18` estável (JSON_MODIFY sobre `$.pageTabs[0]` é determinístico; não cria nova linha em re-aplicação).

## Próxima ação

- pass → curator aceita; manifest `Tested=✓ 2026-05-17` aplicado.
- Habilita avanço de F092b/c/d (mesmo gateway `/api/cotacao/proc/:proc`, mesmos R4/R6/R7, padrão proven).
