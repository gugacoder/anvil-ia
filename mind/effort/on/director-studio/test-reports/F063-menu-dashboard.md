# Test report — F063 entrada menu dashboard

**Data**: 2026-05-17
**Resultado**: pass
**Ambiente**: localhost:3001 (apps/api) + 172.27.0.121\SQL2k19.DBdirector_imperial_logistica_29 (VPN ativa)
**Caso real testado**: DBdirector_imperial_logistica_29, super-user id=1 / empresa=Processa, app `portal-director`. Vite morto — teste exclusivamente backend (probe + curl).

## Casos cobertos

| # | Cenário | Esperado (contrato/spec) | Observado | Resultado |
|---|---|---|---|---|
| 1 | `apply-f063-seed.ts` 1ª execução | Insere/garante página `portal-director.dashboards_index` com caminho `/dashboard` em módulo `portal-director.dashboards`. | PageId=25, chave=`portal-director.dashboards_index`, caminho=`/dashboard`, módulo=`portal-director.dashboards`, app=`portal-director`. | ✓ |
| 2 | `apply-f063-seed.ts` 2ª execução (idempotência) | Mesmo PageId retornado, sem duplicar linha. | PageId=25 idêntico ao da 1ª execução. | ✓ |
| 3 | `probe-f063.ts` end-to-end | (a) Linha em `acesso.TBpagina` consistente; (b) sproc `acesso.obter_acl_token` (super-user PROCESSA/1) inclui módulo e página; (c) `to=/dashboard`. | Todas as três asserções PASS. id=25, to=/dashboard, key=portal-director.dashboards_index, name=Dashboard. | ✓ |
| 4 | `GET /api/menu/routes?app=portal-director` com sessão Redis forjada (super-user id=1, empresa=Processa, path=ldap-bridge) e cookie assinado (`director_session`, HMAC-SHA256 com JWT_SECRET) | HTTP 200, JSON inclui módulo `portal-director.dashboards` com filha `portal-director.dashboards_index` apontando para `/dashboard`. | HTTP 200; `modules[].key="portal-director.dashboards"` com label "Dashboards", icon `cil cil-chart`; child `id=25, label="Dashboard", path="/dashboard", key="portal-director.dashboards_index"`. ACL também lista `paginas[].path="/dashboard"`. | ✓ |
| 5 | Endpoint sem cookie | HTTP 401 (gate de autenticação). | `{"ok":false,"error":"no-session"}` HTTP 401. | ✓ |

## Evidência

Probe completo:
```
[F063 probe] PASS row: id=25 caminho=/dashboard modulo=portal-director.dashboards app=portal-director exibir=false
[F063 probe] PASS ACL modulo portal-director.dashboards encontrado.
[F063 probe] PASS ACL pagina id=25 to=/dashboard key=portal-director.dashboards_index name=Dashboard
[F063 probe] OK — todas as etapas passaram.
```

Curl `/api/menu/routes?app=portal-director` (trecho relevante do JSON):
```
{"id":14,"label":"Dashboards","icon":"cil cil-chart","key":"portal-director.dashboards",
 "children":[{"id":25,"label":"Dashboard","path":"/dashboard",
   "key":"portal-director.dashboards_index", ...}]}
```

ACL flat: `paths` inclui `/dashboard`; `pageKeys` inclui `portal-director.dashboards_index`; `modulos` inclui `portal-director.dashboards`.

Idempotência (2× apply-f063-seed.ts): ambas retornaram `PageId=25 chave=portal-director.dashboards_index caminho=/dashboard`.

## Observações

- `DFexibir_menu=false` no row (probe linha 71). O menu hierárquico do Studio expõe a página mesmo assim porque `obter_acl_token` retorna toda página com ACL válida. Caso o legado interprete `exibir_menu=false` como ocultar, isso é tema da renderização cliente (F012/menu component), fora do escopo deste seed.
- Sem UI (Vite morto) — não há cenário visual de menu/responsivo/a11y. Cobertura é puramente contratual.
- Cookie de sessão precisa do nome configurado no `.env` (`director_session`) e da assinatura HMAC com `JWT_SECRET`; sessão Redis simples (sem signature) retorna 401 (testado e confirmado o gate).

## Próxima ação

- pass → curator aceita.
