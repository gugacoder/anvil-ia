# Test report — F024 Bridge AWS (retry)

**Data**: 2026-05-15
**Resultado**: pass
**Ambiente**: localhost:3001 (API dev, tsx watch), Redis localhost:6379, DB legado 172.27.0.121\SQL2k19 DBdirector_imperial_logistica_29
**Caso real testado**: PROCESSA/99 → IMPERIAL LOG (userId=1, codEmpresa=1)

## Contexto

Wave 1 falhou em C4: erro do driver mssql caía em 500 server-error com o host SQL ("Failed to connect to 172.27.0.121\\SQL2k19 in 8000ms") vazando no body. Smith aplicou em `apps/api/src/aws-client.ts` + `routes/aws.ts`:

- novos kinds `db-unavailable` (503) e `proc-failed` (502) em `AwsBridgeError`;
- helpers `isMssqlError`/`promoteMssqlError` classificam por `err.name` e `err.code` (ConnectionError, TimeoutError, ETIMEOUT, ECONNREFUSED, ENOTFOUND, ELOGIN…);
- `executeSyncProcedure` envolve `pool.connect()` e `pool.request().query()` em try/catch que loga warn com host/code internamente e promove para `AwsBridgeError` sanitizado;
- `bridgeErrorResponse` mapeia db-unavailable→503, proc-failed→502, e em erro inesperado (não-AwsBridgeError, não-mssql) devolve sempre `{ok:false, error:"server-error", message:"Erro interno na bridge AWS."}` em 500 — nunca repassa `message` cru.

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| C1 | GET /api/aws/health | 200 + bridge config (source=env-fallback ou db-tbaplicacao) | 200 `{ok:true, bridge:{baseUrl:"http://127.0.0.1:5100", source:"env-fallback", hasJwtSecret:true}}` | pass |
| C2 | POST /api/aws/sync/redes sem cookie | 401 no-session | 401 `{ok:false,error:"no-session"}` | pass |
| C3 | POST /api/aws/sync/bogus com cookie | 400 invalid-entidade + lista whitelist | 400 `{error:"invalid-entidade", message:"Entidade 'bogus' não suportada..."}` | pass |
| C4 | POST /api/aws/sync/redes com DB apontando para host inexistente (10.99.99.99) + cookie válido | 503 `{error:"db-unavailable", message:"DB local indisponível — verifique conexão com SQL Server."}` SEM host/porta no body | 503 + body exato esperado; log interno mantém `name=ConnectionError code=ETIMEOUT err="Failed to connect to 10.99.99.99:1433 in 8000ms"` | pass |
| C5 | POST /api/aws/proxy/foo;DROP com cookie | 400 invalid-proc | 400 `{error:"invalid-proc", message:"Nome de proc inválido: 'foo;DROP'..."}` | pass |
| C5b | POST /api/aws/proxy/portal.listar sem cookie | 401 no-session | 401 `{error:"no-session"}` | pass |
| C6 | POST /api/aws/proxy/portal.listar com cookie + STUDIO_AWS_JWT_SECRET setado + AWS down em 127.0.0.1:5100 | 502 aws-unreachable | 502 `{error:"aws-unreachable", message:"AWS inacessível em http://127.0.0.1:5100/api/proc/portal.listar: fetch failed"}` | pass |
| C7 | Fallback genérico (revisão de código): erro inesperado fora de AwsBridgeError/mssql | 500 + `message:"Erro interno na bridge AWS."` sem stack | `bridgeErrorResponse` (routes/aws.ts:273-278) retorna exatamente isso; mssql captura via `isMssqlError(err)` antes da fallback | pass |
| C8 | F003 (login híbrido) sem regressão | login PROCESSA/99 → 200 + cookie | 200 `{ok:true, user:{id:"1", nome:"PROCESSA", codEmpresa:1, nomeEmpresa:"IMPERIAL LOG"}}` | pass |
| C8b | F004 (session redis) sem regressão | GET /api/auth/me com cookie → 200 | 200 com loginAt | pass |
| C8c | F023 (hub realtime) sem regressão | /api/hub/snapshot 401 anon, 200 com cookie | 401 anon, 200 `{channels:[]}` com cookie | pass |
| C9 | Console limpo | apenas erros esperados (test-induced) | só `aws-sync: failed` (C4) e `aws-proxy: failed` (C6); nenhum unhandled, sem stack vazado | pass |

## Evidência (logs)

C4 — db-unavailable sanitizado:

```
WARN ConnectionError: aws-sync: db connect failed
    code: "ETIMEOUT"
    entidade: "redes"
    err: "Failed to connect to 10.99.99.99:1433 in 8000ms"
ERROR: aws-sync: failed
    entidade: "redes"
    elapsedMs: 8005
    err: "DB local indisponível — verifique conexão com SQL Server."
```

Resposta HTTP: `503 {"ok":false,"error":"db-unavailable","message":"DB local indisponível — verifique conexão com SQL Server."}` — sem host, sem porta, sem stack.

C6 — aws-unreachable com JWT secret + DB ok:

```
ERROR: aws-proxy: failed
HTTP 502 {"ok":false,"error":"aws-unreachable","message":"AWS inacessível em http://127.0.0.1:5100/api/proc/portal.listar: fetch failed"}
```

## Procedimento de teste

1. API iniciada com `.env` apontando para DB real (172.27.0.121\SQL2k19) + STUDIO_AWS_URL=http://127.0.0.1:5100 + STUDIO_AWS_JWT_SECRET=dev-aws-bridge-secret-change-me.
2. Login PROCESSA/99 via POST /api/auth/login → cookie `director_session` salvo em `.tmp/cookies.txt`.
3. API parada, `.env` editado para DB_HOST=10.99.99.99 e DB_INSTANCE vazio (host inexistente), reiniciada — cookie continua válido porque sessão vive em Redis.
4. C4 executado: confirmou 503 + sanitização.
5. C1, C2, C3, C5, C5b, C6 re-executados com DB bogus (proxy não toca DB; sync valida whitelist antes).
6. C8/C8b/C8c executados para confirmar zero regressão.
7. `.env` restaurado.

## Próxima ação

pass → curator aceita F024. Smith tem permissão para commit.

## Ressalvas não-bloqueantes

- C7 (fallback genérico real) validado por revisão de código apenas — não consegui forçar um erro fora do espectro AwsBridgeError/mssql em wire test sem mexer em código. A linha `routes/aws.ts:273-278` cobre o caso de forma defensiva: qualquer `err` que escape do `bridgeErrorResponse` sem ser AwsBridgeError nem mssql vira `500 server-error` com message genérica.
- Smoke real ERP→AWS (com AWS contraparte respondendo) fica para F048 (já registrado pelo smith), pois requer mock/staging do portal-aws.
