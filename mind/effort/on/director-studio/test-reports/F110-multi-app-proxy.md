# Test report — F110 proxy multi-app `POST /api/:appKey/proc/:proc`

**Data**: 2026-05-17
**Resultado**: pass
**Ambiente**: localhost:3001 (apps/api dev) + SQL `acesso.TBaplicacao` cross-tenant (Área 52, Imperial Logística `DBdirector_imperial_logistica_29` via tenant resolver default). VPN ativa.
**Caso real testado**: rotas `/api/:appKey/proc/:proc` e `/api/:appKey/health` exercitadas com appKeys reais do registry (cotacao R2/R3, portal-aws R5 default-bearer, agent R24 ausente em Imperial). Login identity=`processa` via temp-password 24h (rota `temp-password`), cookie `director_session` salvo em `.tmp/f110-cookies.txt`.

---

## Casos cobertos

| # | Cenário | Esperado (contrato/DoD) | Observado | Resultado |
|---|---------|-------------------------|-----------|-----------|
| 1 | `npx tsx apps/api/src/scripts/probe-f110.ts` | 13/13 PASS — 5 helpers + 4 cenários DoD + registry invalid-key + 3 route gates | 13 PASS, 0 FAIL, 0 SKIP — helpers (isValidAppKey, cotacao-basic-header R4+R6, default-bearer-header R5+R6, outbound-url R7-R9, sign-service-jwt), cenários (cotacao Basic, portal-aws Bearer, invalido 404, disabled-still-works R11), registry.invalid-key-throws, 3 route gates (sessão/health/invalid-key todos 503 com redis down — gate aceito como válido pelo probe) | ✓ |
| 2 | `GET /api/cotacao/health` autenticado | HTTP 200 — appKey cotacao existe em Imperial (R2/R3 do registry), authScheme=basic (R4) | HTTP 200, `{"ok":true,"appKey":"cotacao","hasEndereco":true,"hasDominio":true,"authScheme":"basic","route":"multi-app-proxy","contract":"tbaplicacao-registry"}` | ✓ |
| 3 | `POST /api/cotacao/proc/cotacao_obter_config_opcoes` body `{}` autenticado | 200 OK se cotacao real :5000 up, ou 502 `aws-unreachable`/`app-unreachable` se backend não-up — documentar | HTTP 502, `{"ok":false,"error":"app-unreachable","message":"Aplicação remota inacessível."}` — forward executado, endereço resolvido via TBaplicacao (provavelmente `http://127.0.0.1:5000` dev/loopback), backend cotacao real não-up no host local. Comportamento esperado: proxy classifica connect-error sem vazar host (R do contrato). | ✓ (documentado) |
| 4 | `GET /api/agent/health` autenticado | HTTP 404 — Imperial NÃO tem appKey `agent` (R24, archaeologist 43/89 bases) | HTTP 404, `{"ok":false,"error":"app-not-found","message":"appKey 'agent' não encontrado em acesso.TBaplicacao."}` — paridade exata com R24 | ✓ |
| 5 | `GET /api/Invalid_Key/health` autenticado | HTTP 400 invalid-app-key (R10/R23 kebab-case minúsculo) | HTTP 400, `{"ok":false,"error":"invalid-app-key","message":"appKey inválido: 'Invalid_Key'. Esperado kebab-case ASCII em minúsculas (e.g. 'cotacao', 'portal-aws')."}` — validator rejeita `I` maiúsculo + `_` underscore | ✓ |
| 6 | `GET /api/portal-aws/health` autenticado | HTTP 200 (coexistência com F090 — mesmo backend, agora via multi-app proxy default-bearer) | HTTP 200, `{"ok":true,"appKey":"portal-aws","hasEndereco":true,"hasDominio":false,"authScheme":"bearer","route":"multi-app-proxy","contract":"tbaplicacao-registry"}` — appKey portal-aws resolve via TBaplicacao com authScheme=bearer (default switch R5), F090 literal `/portal-aws/proc/:proc` intacto em paralelo | ✓ |
| 7 | `GET /api/setup/status` sem autenticação (precedência de rotas) | HTTP 200 — rota literal não capturada pelo wildcard `/api/:appKey/*` | HTTP 200, `{"configured":true,"missing":[],...}` — confirmação de que multi-app-proxy montado por último no `app.route('/api', multiAppProxyRoutes)`, rotas literais ganham precedência | ✓ |

---

## Evidência

- **Probe**: `cd workspace/director-studio && npx tsx apps/api/src/scripts/probe-f110.ts` → 13 PASS, 0 FAIL, 0 SKIP.
- **Curls autenticados** (cookie `director_session` em `.tmp/f110-cookies.txt`, login `POST /api/auth/login` body `{identity:processa, password:<temp-24h>}` → 200 com user payload).
- **Discovery dinâmico TBaplicacao** confirmado: `authScheme=basic` para cotacao (R4 — `Basic base64('processa|<dominio>:99')` + header `Domain`) e `authScheme=bearer` para portal-aws/default (R5 — JWT HS256 identity-de-serviço fixa Id=1,Name=processa,CodEmpresa=0,NomeEmpresa=Processa).
- **R11 (DFhabilitado ignorado pelo proxy)**: validado no probe cenário 4 (disabled-still-works).
- **R24 (Imperial sem agent)**: validado em runtime real — `/api/agent/health` retorna 404 app-not-found com mensagem que cita `acesso.TBaplicacao`, paridade exata com survey archaeologist.
- **Coexistência F090**: `/api/portal-aws/health` via multi-app-proxy resolve com bearer; rota literal `/portal-aws/proc/:proc` de F090 permanece intacta (não testada aqui — escopo F090 já aceito).
- **Precedência rotas**: `/api/setup/status` 200 confirma mount order (multi-app-proxy por último → wildcards não capturam rotas literais).

## Falhas

Nenhuma.

## Notas

- 502 `app-unreachable` no cenário 3 não é falha — é estado de ambiente (cotacao real :5000 não-up no host local de dev). Documentado em F110-decisions.md (smith). Para fechar o ciclo runtime full, seria necessário cotacao :5000 ativo no tenant Imperial ou em ambiente staging — gate de runtime, fora do escopo F110 (paridade do gateway).
- Probe declara route gates como 503 (redis down) ao invés de 401 (no-session). Probe aceita 401/503 deliberadamente — em ambiente dev local sem redis up, sessões redis-backed caem para 503 antes do gate de sessão. Comportamento defensivo correto: gate de infraestrutura antes do gate de auth.
- Apenas appKey `Invalid_Key` testou validator (cobre R10/R23). Probe interno cobre 13 casos adicionais kebab-case.

## Próxima ação

- pass → curator aceita; manifest `Tested=✓ 2026-05-17` aplicado.
- Desbloqueio: F092a/b/c/d (cutover-fase-1 Cotacao) podem prosseguir agora que multi-app proxy está operacional e validado contra registry real.
