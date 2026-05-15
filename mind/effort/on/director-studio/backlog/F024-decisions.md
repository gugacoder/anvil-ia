---
title: "F024 — Bridge AWS (decisões de implementação)"
aliases: [F024-decisions, bridge-aws-decisions]
tags: [effort, director-studio, decisions, F024, bridge, aws]
created: 2026-05-15
updated: 2026-05-15
---

# F024 — Decisões de implementação

Contrato: [[portal-aws-bridge]]

## Forma do cliente

- **Módulo único** `apps/api/src/aws-client.ts` exportando `PortalAwsClient` namespace (paridade nominal com a classe estática .NET) + função `sendRequest` reutilizável.
- **Não é uma classe**: TypeScript não precisa do boilerplate, exporta funções puras + um namespace fachada.
- **Sem retry, sem circuit breaker, sem fila** — paridade total com o legado. Se a UI exigir resiliência mais tarde, fica em frente nova.

## Resolução de configuração

- **Prioridade**: `acesso.TBaplicacao WHERE DFchave='portal-aws'` (`DFendereco` → `baseUrl`, `DFdominio` → `domain`).
- **Fallback**: env vars `STUDIO_AWS_URL` + `STUDIO_AWS_DOMAIN`. Garante que a bridge não fica gated por DB em dev/CI mock.
- **Cache em memória do processo**: a configuração muda raramente; lookup adiciona latência boba a cada chamada. Cache invalidado via `resetBridgeConfigCache()` (chamável em testes ou quando o admin editar a tabela).
- Se DB não está configurado **e** `STUDIO_AWS_URL` está vazia → `AwsBridgeError('config-missing')` → 400.

## JWT

- **Algoritmo**: HMAC-SHA256 (paridade com `Processa.Sdk.Auth.TokenUtils`).
- **Claim canônica**: `identidade` com **JSON-string** (não objeto) — bate com o `Claim("identidade", identity.ToJson())` do legado. Esse detalhe é o que faz o middleware AWS decodificar via `JsonConvert.DeserializeObject<DirectorIdentity>(claim.Value)`.
- **Formato do payload da claim**: `{ Id, Name, CodEmpresa, NomeEmpresa, Domain }` — exatamente o serializado de `DirectorIdentity.ToJson()`.
- **`Domain` sai do config da bridge**, sobrescrevendo qualquer domain que viesse do session principal — replica `PortalAwsClient.cs:19`.
- **`Id` numérico quando possível**: tentamos `Number(principal.id)`, caímos em string se NaN. O modelo legado é `int`, mas o `SessionPrincipal` do Studio armazena `string`.
- **TTL default 24h** (paridade legado) — irrelevante na prática porque cada call re-assina.
- **Segredo via env `STUDIO_AWS_JWT_SECRET`** (obrigatório). Equivalente ao `Consts.SecretKey` compilado no legado; aqui é externalizado para permitir rotação por deploy.

## Headers

- **`Authorization: Bearer <jwt>`** — padrão.
- **`ContentType: application/json`** (sic, sem hífen) — **typo legado preservado**. O middleware AWS lê esse header não-padrão. Trocar para `Content-Type` quebraria a integração até que ambos os lados sejam atualizados em coordenação.
- **Não enviamos `Domain` header** — domain vai dentro do JWT (paridade legado).

## Endpoints

### `POST /api/aws/sync/:entidade`

- **Whitelist hardcoded** das 10 entidades canônicas do contrato. Qualquer outro string → 400.
- **Sessão obrigatória** (cookie httpOnly).
- **Schema da proc discoverable**: `aws_sincronizar_entidade` pode estar em `dbo` (bases antigas) ou em schema custom. Usamos `sys.objects` na primeira chamada e cacheamos (paridade com o padrão schema-aware de `auth.ts`/`menu.ts`).
- **Parâmetro `@ids`**: sempre `NULL` (full-sync) — paridade com o controller legado, que nunca exercita esse hook.
- **XML capture**: o driver `mssql` retorna o XML do `FOR XML PATH` em colunas de string concatenadas. Captamos com `Object.values(row).join('')` para resiliência contra split em chunks.
- **Resposta do AWS**: devolvida cru ao front com `status` preservado. O front inspeciona `<Resposta><Status>...</Status></Resposta>` para decidir sucesso/erro (paridade legado — procs sempre retornam 200 HTTP mesmo em erro de negócio).
- **Header de diagnóstico**: `X-Aws-Bridge-Elapsed-Ms` para observabilidade.
- **Carga vazia**: se a proc retorna XML vazio, **422 empty-payload** (não enviamos requisição zero ao AWS).

### `POST /api/aws/proxy/:proc`

- **Sanitização**: regex `^[a-zA-Z_][a-zA-Z0-9_]*(\.[a-zA-Z_][a-zA-Z0-9_]*)?$` — aceita `proc` ou `schema.proc`, recusa qualquer caractere fora de ASCII/dígitos/underscore/ponto único. Protege contra path injection mesmo que o framework de roteamento decode o param. Inválido → 400.
- **Body cru**: `c.req.text()` repassa o que veio (JSON, XML, formdata serializado) sem reinterpretar. O legado faz a mesma coisa via `Request.Form` + serialização para JSON; aqui delegamos a serialização ao cliente do front.
- **`ContentType: application/json`** mantido (typo legado). O AWS aceita XML quando o body começa com `<`.

### `GET /api/aws/health`

- **Não chama AWS** — só resolve o config e reporta `{ baseUrl, hasDomain, source, hasJwtSecret }`.
- Útil para o setup wizard e para o ui-tester confirmar que o tenant tem a tabela `TBaplicacao` com a linha correta.
- Sem autenticação (paridade com `/api/health`) — informação não-sensível.

## Mapeamento de erros para HTTP

| `AwsBridgeError.kind` | HTTP | Quando |
|---|---|---|
| `config-missing` | 400 | TBaplicacao sem linha portal-aws **e** sem `STUDIO_AWS_URL`; ou `STUDIO_AWS_JWT_SECRET` ausente. |
| `identity-missing` | 400 | (defensivo — não deveria acontecer pós-gate de sessão). |
| `aws-timeout` | 504 | Timeout de 30s no fetch. |
| `aws-unreachable` | 502 | ECONNREFUSED, ENOTFOUND, EHOSTUNREACH, etc. |
| (outros) | 500 | DB local indisponível, erro inesperado. |

**Erros HTTP do AWS (4xx/5xx)** **não** geram erro: chegam ao front como body cru com o status preservado (paridade legado).

## Timeout

- **30s** por padrão (não tem timeout no legado, mas o default do Node 20+ fetch é infinito — definir explicitamente evita pilhas indefinidas).
- Pode ser desligado passando `timeoutMs: 0` (não exposto pela rota; só pelo cliente direto).

## Variáveis novas no `.env.example`

```env
STUDIO_AWS_URL=http://127.0.0.1:5100
STUDIO_AWS_DOMAIN=
STUDIO_AWS_JWT_SECRET=dev-aws-bridge-secret-change-me
```

`STUDIO_AWS_URL` foi setado pro mesmo valor seed do legado (`portal.director/pos-script.sql:8`). Em prod real, o valor sai de `TBaplicacao` no banco — env é apenas fallback.

## Smoke test rodado

`.tmp/smoke-aws-f024.mjs` (cliente isolado) — 5 cenários:

1. ✅ Config resolution (env-fallback quando DB indisponível)
2. ✅ JWT shape (HS256 + claim `identidade` com `{Id, Name, CodEmpresa, NomeEmpresa, Domain}`)
3. ✅ Reachability fail → `AwsBridgeError('aws-unreachable')`
4. ✅ Missing JWT secret → `AwsBridgeError('config-missing')`
5. ✅ Missing config → `AwsBridgeError('config-missing')`

Routes smoke (`.tmp/smoke-aws-routes-f024.mjs`, rodado no contexto do package api):

1. ✅ `GET /api/aws/health` → 200 com `source: 'db-tbaplicacao'`, `baseUrl: 'http://127.0.0.1:5100'` (lido do banco real do tenant de testes)
2. ✅ `POST /api/aws/sync/redes` sem cookie → 503 (Redis indisponível neste smoke)
3. ✅ `POST /api/aws/sync/foobar` sem cookie → 503 (gate de Redis antes do gate de whitelist — sem Redis a request nem chega no controller)
4. ✅ `POST /api/aws/proxy/...` sem cookie → 503

> O caminho de validação de **entidade inválida** (400) e **proc inválida** (400) só é exercitável com Redis vivo + sessão ativa — fica para o ui-tester com a frente plenamente bootada.

## Decisões deferidas (follow-ups para o curador)

- **Sync completo end-to-end** (ERP real → AWS real) só é validável quando há **um tenant com `acesso.TBaplicacao(portal-aws)` apontando para um portal-aws acessível**. Hoje a base de testes (`imperial_logistica_29`) tem a linha apontando para `127.0.0.1:5100`, que está desligado — então qualquer chamada real cai em `aws-unreachable` (comportamento correto, mas não exercita o sucesso). Fica como **F048 — Smoke real da bridge AWS** quando houver portal-aws-mock ou contraparte AWS de teste.
- **Cobertura idempotência server-side** (proc AWS faz UPDATE+INSERT por `ErpId`): paridade verificada no contrato, mas não exercitada no Studio.
- **Bus de retry/DLQ** caso o produto evolua para sync recorrente: hoje 100% manual, sem fila.

## Arquivos tocados

- **`apps/api/src/aws-client.ts`** (novo) — cliente HTTP + JWT.
- **`apps/api/src/routes/aws.ts`** (novo) — endpoints `/sync/:entidade`, `/proxy/:proc`, `/health`.
- **`apps/api/src/index.ts`** — registro do route group.
- **`.env.example`** — novas vars `STUDIO_AWS_URL`/`STUDIO_AWS_DOMAIN`/`STUDIO_AWS_JWT_SECRET`.
