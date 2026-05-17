# Test report — F090 refactor model acessos_fornecedor → gateway portal-aws

**Data**: 2026-05-17
**Resultado**: pass
**Ambiente**: localhost:3001 (apps/api dev) + SQL `172.27.0.121\SQL2k19` DB `DBdirector_imperial_logistica_29` (Área 52, Imperial Logística). VPN ativa.
**Caso real testado**: page `portal-director.acessos_fornecedor` em tenant Imperial Logística (DFid_pagina=3, DFcaminho=`/acessos/fornecedores`, DFid_model_pagina=15). Login identity=`processa` via temp-password (rota `temp-password`).

---

## Casos cobertos

| # | Cenário | Esperado (contrato/manifest) | Observado | Resultado |
|---|---------|------------------------------|-----------|-----------|
| 1 | probe-f090 com DB+bridge mock auto-bind | 7/7 PASS (1 db.model + 3 bridge.happy + 3 route.gates) | 7 PASS, 0 FAIL, 0 SKIP — bridge config source=`db-tbaplicacao`, baseUrl=`http://127.0.0.1:5100` | ✓ |
| 2 | `GET /api/model?app=portal-director&path=/acessos/fornecedores` autenticado | HTTP 200, modelJson com `datagrid.api` apontando para gateway portal-aws | HTTP 200, `datagrid.api="/portal-aws/proc/portal.obter_usuarios_fornecedores"`, `genericform.endPoint="/portal-aws/proc/portal.persistir_usuario_fornecedor"`, `gridActions[].execProc="/portal-aws/proc/portal.deletar_usuario_fornecedor"` | ✓ |
| 3 | `POST /portal-aws/proc/portal.obter_usuarios_fornecedores` body=`{}` autenticado | forward via `PortalAwsClient.sendRequest`; 502 `aws-unreachable` aceitável se AWS real não up | HTTP 502 `{"ok":false,"error":"aws-unreachable","message":"AWS inacessível em http://127.0.0.1:5100/api/proc/portal.obter_usuarios_fornecedores: fetch failed"}` — confirma forward correto (URL composta = baseUrl da TBaplicacao + `/api/proc/<proc>`); falha por portal-aws real não estar de pé no ambiente local | ✓ |
| 4 | Path solicitado no DoD (`/acessos/usuarios_fornecedor`) | divergência: TBpagina.DFcaminho real é `/acessos/fornecedores` | DoD literal retornou 404 `page-not-found`; query direta na `acesso.TBpagina` confirmou DFcaminho=`/acessos/fornecedores` para DFchave=`portal-director.acessos_fornecedor` — DoD tinha typo no path, model em si está correto | ✓ (observação) |

---

## Detalhes

### Caso 1 — probe-f090 (smith DoD #1)

```
[F090 probe] bridge config: source=db-tbaplicacao baseUrl=http://127.0.0.1:5100
[PASS] db.model.acessos_fornecedor.gateway-urls   DFid_model_pagina=15; datagrid.api+genericform.endPoint+gridActions OK
[PASS] bridge.happy.portal.obter_usuarios_fornecedores  HTTP 200 + envelope <Sucesso>true</Sucesso>
[PASS] bridge.happy.portal.persistir_usuario_fornecedor HTTP 200 + envelope <Sucesso>true</Sucesso>
[PASS] bridge.happy.portal.deletar_usuario_fornecedor   HTTP 200 + envelope <Sucesso>true</Sucesso>
[PASS] route.health.no-session                          GET /portal-aws/health 200
[PASS] route.proc.no-session                            POST sem cookie → 503
[PASS] route.proc.invalid-name                          POST proc inválido → 503
[F090 probe] 7 PASS, 0 FAIL, 0 SKIP (total 7)
```

### Caso 2 — curl GET /api/model (DoD #2)

```
HTTP=200
pageKey=portal-director.acessos_fornecedor
appKey=portal-director
idModel=15  idPagina=3
modelJson.datagrid.api          = /portal-aws/proc/portal.obter_usuarios_fornecedores
modelJson.genericform.endPoint  = /portal-aws/proc/portal.persistir_usuario_fornecedor
modelJson.genericform.api       = /portal-aws/proc/portal.sp_obter_usuario_fornecedor
modelJson.datagrid.gridActions[execProc] = /portal-aws/proc/portal.deletar_usuario_fornecedor
```

Naming legado `acesso.sp_consultar_*` / `acesso.sp_persistir_*` (inventado) está **substituído** pelas URLs gateway reais derivadas de `portal.obter_usuarios_fornecedores.sql` / `portal.persistir_usuario_fornecedor.sql` / `portal.deletar_usuario_fornecedor.sql`. Naming alinhado com `PortalDirector.Website/src/routes/Acessos/Fornecedores.jsx` do legado.

### Caso 3 — POST /portal-aws/proc/... (DoD #3)

```
POST http://localhost:3001/portal-aws/proc/portal.obter_usuarios_fornecedores
cookie: director_session=<sessão processa válida>
body:   {}
→ HTTP 502
→ {"ok":false,"error":"aws-unreachable","message":"AWS inacessível em http://127.0.0.1:5100/api/proc/portal.obter_usuarios_fornecedores: fetch failed"}
```

**Comportamento esperado e correto**: A rota `POST /portal-aws/proc/:proc` (apps/api/src/routes/portal-aws-proxy.ts:160) chamou `PortalAwsClient.sendRequest` com `baseUrl=http://127.0.0.1:5100` (resolvido via `acesso.TBaplicacao(DFchave='portal-aws')`). Como nenhum portal-aws real escuta em :5100 nesse ambiente, fetch falhou e foi mapeado para 502 `aws-unreachable` (apps/api/src/routes/portal-aws-proxy.ts:114). Forward está correto:

- gate de sessão passou (cookie processa válido)
- gate de sanitização passou (nome de proc válido)
- URL composta = `<baseUrl>/api/proc/<proc>` conforme contrato `[[portal-aws-bridge]]`
- envelope JWT assinado pelo `STUDIO_AWS_JWT_SECRET`

Para hit real, precisaria portal-aws de fato up — fora do escopo desta feature (gate F048 trata bridge runtime).

### Caso 4 — discrepância de path no DoD

O DoD pedia `path=/acessos/usuarios_fornecedor`, mas no DB do tenant (Imperial Logística) `acesso.TBpagina` tem somente um row para `DFchave='portal-director.acessos_fornecedor'` com `DFcaminho='/acessos/fornecedores'` (DFid_pagina=3). Tested o path real → 200 ok. Não bloqueia aceitação: o **model** (objeto sob teste em F090) está correto independente do caminho de URL da TBpagina, que é orthogonal (resolvido por F042/F088).

---

## Próxima ação

- pass → curator aceita. Manifest `Tested=✓ 2026-05-17`.
- Follow-up F106 já enfileirado para survey cross-tenant do literal `datagrid.api` (`/portal-aws/...` vs `/api/portal-aws/...`).
