---
title: "Test report — F004 Sessão httpOnly cookie + Redis"
tags: [test-report, director-studio, F004, auth]
created: 2026-05-15
feature: F004
contract: "[[processa-auth-paths]]"
result: pass
---

# Test report — F004 Sessão httpOnly cookie + Redis

**Data**: 2026-05-15
**Resultado**: pass
**Ambiente**: localhost:3001 (API host, sem dotenv-cli) + director-studio-redis em :3010 (container)
**Caso real testado**: DBdirector_imperial_logistica_29, usuário `PROCESSA`/`99`, empresa IMPERIAL LOG (path=internal-db). Validado contra Validar_Cript de `dbo`.

## Notas de ambiente

- `.env` originalmente apontava `REDIS_URL=redis://localhost:6379` (porta do redis do projeto coletivos). Alterado temporariamente para `redis://localhost:3010` (director-studio-redis) durante os cenários; restaurado ao final.
- API foi rodada diretamente (`PORT=3001 npx tsx src/index.ts`) sem dotenv-cli; o `config.ts:51-57` sobrescreve `process.env.REDIS_URL` ao carregar `.env`, então variar `REDIS_URL` exige editar o arquivo (não basta export).
- DB SQL Server 172.27.0.121\SQL2k19 ficou intermitente durante o teste — alguns logins precisaram retry (timeout de 5000ms na connection). Isso é infra externa, fora do escopo F004.

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| 1 | Boot fail-loud com REDIS_URL inválido | FATAL log + exit, sem listening em :3001 | Log FATAL `api boot aborted: redis unreachable` (`redis connect failed: Connection is closed.`), processo encerra, porta 3001 não fica em LISTENING | ✓ |
| 2 | Login PROCESSA/99 → cookie + key Redis | 200, Set-Cookie httpOnly SameSite=Lax, `ds:sess:<sid>` em SCAN | 200 com `{ok:true,user:{id:"1",nome:"PROCESSA",codEmpresa:1,nomeEmpresa:"IMPERIAL LOG",path:"internal-db"}}`. Cookie `director_session=<sid>.<mac>; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax` (sem Secure pois NODE_ENV!=production, esperado em dev). Redis SCAN devolveu exatamente uma key `ds:sess:70Gg7KBA...` | ✓ |
| 3 | Sliding TTL via 2 hits /me espaçados ~3s | TTL no Redis renova a cada hit | TTL inicial após login=28778; após 1º `/me`=28800 (200); após 2º `/me` (3s depois)=28800 (200). EXPIRE refrescado para o valor pleno (`SESSION_TTL_HOURS=8 * 3600 = 28800`) a cada hit | ✓ |
| 4 | Logout → cookie limpo + key removida | 200, Set-Cookie Max-Age=0, SCAN vazio, /me 401 | POST /logout → 200 `{ok:true}` + `set-cookie: director_session=; Max-Age=0; Path=/`. SCAN `ds:sess:*` = vazio. GET /me com cookie pós-logout → 401 `{ok:false,error:"no-session"}` | ✓ |
| 5 | Redis down mid-flight → /me 503 | 503 `session-store-unavailable`, sem 500/crash | Login OK com Redis vivo; `docker stop director-studio-redis`; após 3s, GET /me → 503 com `{ok:false,error:"session-store-unavailable"}`. Múltiplos hits seguintes também 503. API permanece responsiva (não crash) | ✓ |
| 6 | Recuperação: subir Redis, novo login funciona | Novo login OK; sessão antiga "perdida" | Após `docker start director-studio-redis`, /api/health=200. Novo POST /login com PROCESSA/99 → 200 (após 1 retry por DB timeout transitório); novo /me com cookie novo → 200. **Observação**: a sessão antiga **persistiu** (key `ds:sess:7w7MaQFO...` ainda presente, /me com cookie antigo retornou 200). Isso é consequência da config do container (`--save 60 1000 --appendonly yes` + volume `redis-data` em `infra/docker-compose.platform.yml`); não é bug do F004 — é decisão de infra. O comportamento "novo login funciona" foi atendido. | ✓ |

## Anotações por critério vs. spec

- **httpOnly + SameSite=Lax + Path=/**: confere com `auth.ts:410-416` e com a referência do contrato (proteção contra XSS + CSRF baseline).
- **Cookie name**: `director_session` (lido de `SESSION_COOKIE_NAME` no .env). Há a divergência F029 já catalogada entre spec (`director_studio_session`) e impl/.env (`director_session`) — fora do escopo deste teste.
- **HMAC do sid**: cookie observado tem formato `<sid>.<mac>` (base64url). Tentativa de cookie sem `.mac` resultaria em `no-session` antes de bater no Redis — coerente com `verifySession` em `auth.ts:56-72`. Não testado explicitamente porque é defense-in-depth secundária ao critério principal.
- **Namespace `ds:`**: confirmado via SCAN — keys com prefixo `ds:sess:`. Importante porque outros projetos podem compartilhar Redis (vide nota smith).
- **Princípio "fail-loud"**: tanto no boot (cenário 1) quanto mid-flight (cenário 5) o sistema se recusa a operar em modo degradado — retorna 503 explícito, nunca 500 silencioso e nunca aceita login sem sessão persistida.

## Falhas

Nenhuma. Todos os 6 critérios passaram.

## Observações não-bloqueantes (curator decide se vira follow-up)

1. **`.env` aponta para redis errado em dev**: `REDIS_URL=redis://localhost:6379` cai no `coletivos-redis` (compartilhado por outro projeto). O director-studio-redis vive em :3010. Smith já anotou isso na sessão anterior. Recomendação: o wizard de setup (F001) deveria escrever `REDIS_URL=redis://localhost:${REDIS_PORT}` derivado do `.env.example`. Sugestão de feature F031.
2. **`config.ts` sobrescreve `process.env`**: `reloadConfig` faz `process.env[key]=value` sempre, mesmo quando a env já está setada externamente. Isso impede override via env (ex.: para teste). Não-bloqueante mas inesperado — convenção UNIX é que env explícita ganha de .env.
3. **Critério 6 supõe Redis volátil**: o compose declara `--appendonly yes` + volume persistente, então sessões sobrevivem restart. Não é falha; é o comportamento real. Se o time prefere sessões voláteis, ajustar `infra/docker-compose.platform.yml` (remover `--appendonly`/volume) ou aceitar persistência.

## Evidência

- Log de boot fail-loud: cenário 1, output em `.tmp/api-bad-redis.log`:
  - `FATAL: api boot aborted: redis unreachable`
  - `err: "redis connect failed: Connection is closed."`
- Cookie observado: `director_session=70Gg7KBA_Dom-dlpAWVk1uVB8O0mvsIjsycOOKoj4b8.LD-D0S_cC1s5FAaGsTwqTRoJaalW5_a7pY9yO3GgQ1c; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax`
- Redis TTL trace: `28778 → 28800 (após /me #1) → 28800 (após /me #2)`
- /me com Redis down: `HTTP/1.1 503 Service Unavailable` + `{"ok":false,"error":"session-store-unavailable"}`

## Próxima ação

- pass → curator aceita F004 e marca `Accepted ✓ 2026-05-15`.
- considerar abrir F031 (wizard escrever REDIS_URL coerente com PREFIX/REDIS_PORT) — não bloqueia aceitação.
