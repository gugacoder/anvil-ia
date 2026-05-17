---
title: "F110 — Proxy multi-app: decisões de implementação"
tags: [backlog, director-studio, decisions, F110, proxy, multi-app, tbaplicacao]
created: 2026-05-17
updated: 2026-05-17
---

# F110 — Proxy multi-app `POST /api/:appKey/proc/:proc`

Implementação 2026-05-17. Contrato fonte: [[tbaplicacao-registry]] R1-R24.
Gate F113 ✓. Mantém [[F090-decisions]] (`/portal-aws/proc/:proc` literal) intacto.

## D1 — Arquivo novo `multi-app-proxy.ts`, não estender `portal-aws-proxy.ts`

Os dois caminhos do legado são **semanticamente distintos**:

- `/portal-aws/proc/:proc` (F090) → `PortalAwsClient.SendRequest` legado:
  identity do **usuário corrente** (`Thread.CurrentPrincipal.Identity`),
  `Domain` sobrescrito do registro `portal-aws`, JWT assinado por chamada.
- `/api/:appKey/proc/:proc` (F110) → `AppClientService.ExecProc` legado:
  identity-de-serviço **FIXA** `(Id=1, Name="processa", CodEmpresa=0,
  NomeEmpresa="Processa")`, **NÃO** propaga usuário; switch auth Basic/Bearer
  por `DFchave`.

Misturar os dois numa rota só apagaria a diferença de identity. Arquivo
separado preserva paridade exata com cada caminho.

## D2 — Registry isolado em `app-registry.ts`

Lookup de `acesso.TBaplicacao` por `DFchave` + cache TTL 60s + auth-scheme
switch + build de headers/URL viram um módulo único reusável. Razões:

- F092a-d + F093 vão consumir esse mesmo registry — não duplicar lookup.
- Cache invalidável via `resetAppRegistryCache()` quando AppBuilder mutar
  TBaplicacao (futuro F025).
- Helpers (`buildOutboundHeaders`, `buildOutboundUrl`, `signServiceJwt`,
  `isValidAppKey`) testáveis em isolamento (probe-f110 cobre os 5 helpers
  sem rede).

## D3 — Validação de `appKey` em regex kebab-case ASCII

R10 do contrato: nenhum `DFchave` cross-tenant tem underscore, ponto,
espaço ou caractere não-ASCII; todos kebab-case. Aplicamos regex
`/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/` no resolver — appKeys fora disso fazem
`AppRegistryError(invalid-app-key)` → HTTP 400. Defesa em profundidade
contra path traversal/injeção via param.

## D4 — Cache TTL 60s + inflight dedup

`Map<appKey, {entry, loadedAt}>` com TTL 60s. Cache miss faz query
parametrizada single-row em `acesso.TBaplicacao`. `Map<appKey, Promise>`
para coalescer requests concorrentes do mesmo appKey (primeira faz a
query, demais aguardam o mesmo Promise). Endereços mudam em deploys de
tenant — 60s é a janela aceitável (legado não cacheia, faz SELECT a cada
request; nossa janela é estritamente mais conservadora que a paridade
permitiria).

## D5 — `STUDIO_AWS_JWT_SECRET` reusado como `Consts.SecretKey` deploy-wide

Mesma chave simétrica que F024/F090 usam. No legado é literalmente o
mesmo `Consts.SecretKey` que `AppClientService.BuildHeader` e
`PortalAwsClient.SendRequest` ambos consomem (`TokenUtils.GenerateJWTToken`).
Não cabe segredo separado por appKey: a chave é deploy-wide.

## D6 — Header `Domain` em **TODAS** as chamadas, mesmo no caso Bearer (R6)

`AppClientService.cs:20,36` envia header HTTP `Domain` adicional ao
Authorization em ambos os ramos do switch. No caso Bearer JWT é
redundante com a claim `Domain` dentro do token; no caso Basic é a
**única** forma do destino conhecer o tenant. Paridade exata exige
manter em ambos.

## D7 — Headers `ContentType` (sem hífen) E `Content-Type` (canônico) coexistem

`PortalAwsClient.cs:25` envia `ContentType: application/json` (sic — typo
legado sem hífen). Alguns middlewares AWS dependem disso. Para apps
modernas que validam `Content-Type` canônico, enviamos ambos. Custo zero,
compatibilidade máxima.

## D8 — Trailing slash do `DFendereco` NÃO é normalizado (R9)

Concatenação literal `{DFendereco}/api/proc/{proc}`. Se `DFendereco`
termina em `/` (Imperial: `http://127.0.0.1:5000/`), URL final fica
`http://127.0.0.1:5000//api/proc/cotacao_foo` com `//` no meio — o legado
convive com isso. Não normalizamos pra preservar 1:1.

## D9 — Sanitização de erros via classifier dedicado (não vaza host/port)

`classifyRegistryError` e `classifyFetchError` mapeiam exceções para
`{status, body}` com mensagens genéricas (sem URL/host/port). Padrão F048.
Log interno (Pino) mantém o detalhe; resposta para cliente é opaca.

## D10 — Montagem em `/api` por último para preservar ordem de matching Hono

`app.route('/api', multiAppProxyRoutes)` vai **após** todas as rotas
literais (`/api/setup`, `/api/auth`, `/api/menu`, `/api/forms-proxy`,
`/api/grid`, `/api/hub`, `/api/aws`, `/api/dashboards`, `/api/share`).
Hono casa a primeira rota que bater, então literais ganham; só path no
formato `/api/<algo>/proc/<algo>` chega no proxy multi-app.

## D11 — `DFhabilitado` ignorado (R11)

O proxy não filtra por `DFhabilitado`. R13 só filtra a proc do menu
home — o proxy é chamável para qualquer linha existente. Probe cobre
explicitamente com appKey `cotacao-disabled` que simula uma linha
desabilitada.

## D12 — Identity-de-serviço fixa, não a do usuário (R5)

`AppClientService.cs:52`: `new DirectorIdentity(1, "processa", 0,
"Processa") { Domain = app.Domain }`. NÃO é a identity do usuário
corrente. Paridade exata: nosso `signServiceJwt(domain)` constrói o mesmo
literal. Studio NÃO propaga `entry.principal` para o backend remoto via
esta rota — só usa o cookie pra **autorizar a chamada** (gate de sessão).

Decisão consciente: F092a-d (que vão consumir esta rota) preservam a
paridade exata. Se no futuro alguma feature exigir identity real, ela
deve abrir uma rota nova (não modificar esta).

## Probe

`apps/api/src/scripts/probe-f110.ts` — 13/13 PASS local:

- 5 helpers (validador appKey, cotacao-basic, default-bearer, URL,
  jwt-sign)
- 4 cenários DoD via mock standalone (cotacao-basic, portal-aws-bearer,
  invalido→404, disabled-still-works)
- 1 registry (invalid-key-throws)
- 3 route gates (no-session, health, invalid-app-key)

Cenário "appKey real contra DB" coberto pelo health do probe (resolve via
`acesso.TBaplicacao` real do tenant configurado em `.env`). Para
end-to-end com backend remoto vivo: ui-tester precisa de tenant com
cotacao up + cookie de sessão.

## Follow-ups enfileirados (não bloqueiam F110)

- F106 (`/api/portal-aws/` vs `/portal-aws/`): a rota F090 fica como
  está (literal `/portal-aws/proc/:proc`); paralelamente F106 confirma se
  algum legado tem `/api/portal-aws/...` e ajusta. F110 NÃO duplica essa
  rota — clientes que quiserem chamar portal-aws via discovery podem usar
  `POST /api/portal-aws/proc/:proc` (mesmo registry resolve), mas a
  semântica de identity é DIFERENTE (serviço fixa vs usuário) — documentar
  no follow-up.
- F111 (cotacao `/cotacao/proc/...` sem `/api`): se confirmado que o
  legado tem variante sem `/api`, criar segunda rota literal —
  `multi-app-proxy.ts` cobre só o caminho canônico `/api/<appKey>/proc/...`.
