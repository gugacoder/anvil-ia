---
title: "Mapeamento SignalR → SSE (Director Studio)"
aliases: [hub-sse-mapping, hub-sse, signalr-to-sse]
tags: [contract, mapping, sse, realtime, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: Mapeamento SignalR → SSE

Este contrato descreve **como cada canal/evento do hub legado** (ver [[hub-signalr-legacy]]) **deve ser representado no Director Studio** usando SSE (Server-Sent Events) em vez de SignalR. É um contrato de **superfície da API**, não de implementação — define o protocolo de fio que o Studio expõe, sem prescrever stack ou biblioteca.

> note: SSE é unidirecional (server→client). RPC do legado (`GetClientResponse`/`Callback`) **não cabe em SSE puro**. Para esses casos, o Studio combina SSE com REST: o cliente faz `POST` (request) e ouve um `event` em SSE (response correlacionada por `requestId`).

## Decisões arquiteturais

| Tema | Legado SignalR | Studio SSE |
|---|---|---|
| Transporte | WebSocket (fallback long-polling) | EventSource (HTTP/1.1 long-lived GET; HTTP/2 multiplex em produção) |
| Direção | Bi-direcional | Server→Client apenas; client→server via REST |
| Auth | JWT em `Authorization` header (handshake) | Cookie httpOnly de sessão (já existe via F003/F004); `EventSource` envia cookies automaticamente |
| Reconnect | `withAutomaticReconnect` 20s fixo (custom) | `retry:` field no stream + nativo `EventSource`; `Last-Event-ID` para resumir |
| Grupos | `Groups.AddToGroupAsync` runtime | Endpoint por canal (`?channel=`) ou claim no cookie de sessão |
| Encriptação payload | `.Encrypt()` custom | TLS 1.3 (não duplicar criptografia de aplicação — fora de escopo do mapping) |
| Healthcheck | `GetAck` RPC com timeout 15s | SSE comment ping `:\n\n` a cada 15s; cliente trata `error` event |
| RPC sync | `GetClientResponse`+`Callback` | `POST /api/hub/exec` retorna `{ requestId }` imediato; resposta chega via SSE event `exec.result` |

## Endpoint canônico

```
GET /api/hub/sse?channel={channelName}
```

- **Auth**: cookie de sessão (`director_studio_session`); 401 se anônimo.
- **Headers**:
  - `Accept: text/event-stream` (obrigatório; senão 406)
  - `Cache-Control: no-cache` (cliente)
  - `Last-Event-ID: <id>` (opcional, para resumir após reconnect)
- **Response headers**:
  - `Content-Type: text/event-stream; charset=utf-8`
  - `Cache-Control: no-cache, no-transform`
  - `X-Accel-Buffering: no` (nginx/caddy)
  - `Connection: keep-alive`
- **Query params**:
  - `channel` (obrigatório): `notifications`, `sessions`, `exec-results`, `mobile`, ou composição `notifications,sessions`.
  - `since` (opcional, ISO-8601): mesmo papel de `Last-Event-ID` mas explícito.

## Mapeamento evento-a-evento

### `Connected` → SSE event `connected`

| Legado | Studio |
|---|---|
| `Clients.Caller.SendAsync("Connected", connectionId)` | Primeiro evento ao abrir o stream |

```
event: connected
id: <sessionId>:0
data: {"sessionId":"...","userId":1141,"empresa":"IMPERIAL LOG"}

```

- `id` segue formato `{sessionId}:{seq}` para o cliente conseguir resumir.
- `sessionId` aqui é o **ID de sessão httpOnly do Studio**, não um connectionId SignalR.

### `RefreshSession` → SSE event `session.changed`

| Legado | Studio |
|---|---|
| Broadcast `RefreshSession=true` em todo connect/disconnect | Evento granular com a mudança específica |

```
event: session.changed
id: <sessionId>:<seq>
data: {"kind":"connected"|"disconnected"|"expired","userId":1141,"empresa":"..."}

```

- **Quem dispara**: API do Studio quando uma sessão é criada/encerrada na própria store (Redis). Não é mais broadcast global indiscriminado.
- **Escopo**: por padrão `channel=sessions` recebe **só sessões da mesma empresa do usuário** (filtro server-side via cookie). Admins (super-user PROCESSA) podem escutar `channel=sessions:all`.

### `PushNotification` → SSE event `notification`

| Legado | Studio |
|---|---|
| `Clients.Client(connId).SendAsync("PushNotification", json)` ou broadcast all | Evento por destinatário ou por canal |

```
event: notification
id: <sessionId>:<seq>
data: {"type":"success"|"info"|"warning"|"danger","title":"...","body":"...","icon":"..."}

```

- Payload mantém o shape do legado (`{ type, command: { title, body, icon? } }`) **aplainado** para `{ type, title, body, icon? }` — `command` era nome arbitrário do legado, sem ganho semântico.
- **Roteamento server-side**:
  - Notificação para usuário específico: API publica no Redis pub/sub channel `notif:user:{userId}`; cada conexão SSE assina o próprio canal.
  - Notificação para empresa: `notif:empresa:{cnpj}`.
  - Broadcast all: `notif:all`.
- **Dispatcher REST** (substitui `POST /api/hub/notify`):
  ```
  POST /api/hub/notify
  body: { type, title, body, icon?, target: { userId? | cnpj? | all: true } }
  ```

### `ReceiveMessage` / `propagate` → SSE event `broadcast`

| Legado | Studio |
|---|---|
| App envia `{type:"propagate", method, payload, group}` → hub reemite | App posta REST; outros assinam SSE |

Cliente publica:
```
POST /api/hub/broadcast
body: { channel: "<groupName>", event: "<eventName>", payload: <any> }
```

Outros recebem:
```
event: broadcast
id: <sessionId>:<seq>
data: {"channel":"...","event":"...","payload":...}

```

- **Filtragem**: o cliente SSE só recebe broadcasts dos channels para os quais tem permissão (claim no cookie). Substitui o modelo `Groups.AddToGroupAsync` runtime: grupos são **derivados de roles**, não declarados pelo cliente.
- **Anti-pattern eliminado**: cliente não pode mais "entrar em grupo arbitrário" só pedindo. Server decide.

### `GetClientResponse` + `Callback` → REST + SSE event `exec.result`

| Legado | Studio |
|---|---|
| RPC server→client sobre WebSocket com retry 10× e timeout escalonado | REST + SSE correlacionado por `requestId` |

**Quando precisa (`/hub-suphelp` cross-tenant)**:

Cenário legado: ADM precisa rodar uma proc no banco do tenant on-prem. Studio equivalente: API do Studio chama API do tenant via HTTP direto (não via reverse-tunnel WebSocket).

```
POST /api/tenants/{cnpj}/exec
body: { type:"proc"|"query"|"command", command, params, db? }
→ 200 { requestId, status:"accepted" }
```

Cliente assina:
```
event: exec.result
id: <sessionId>:<seq>
data: {"requestId":"...","status":"ok"|"running"|"error","result":...,"error":...}

```

- Status intermediário `running` substitui o `"running"` legado.
- Timeout e retry passam a ser **policy server-side** (não exposto ao cliente). Recomendação: timeout total 30min (igual à última tentativa do legado), retries com backoff exponencial 1s/2s/4s/8s/16s.
- **Quando o tenant é o próprio Studio**: nem precisa de cross-tenant — REST direto resolve, sem SSE.

### `GetAck` → SSE comment ping

| Legado | Studio |
|---|---|
| Hub invoca `GetAck` em loop, cliente responde `"ok"` | Servidor envia SSE comment `:\n` periódico; cliente detecta erro automático |

```
: ping
```

- Frequência: 15s (mesmo timeout do legado).
- Cliente: confia no `EventSource.onerror` para detectar conexão morta.
- **Não há eviction server-side**: a sessão httpOnly tem TTL próprio (F004); a conexão SSE só vive enquanto o socket vive.

### `mobile.sp_atualizar_conexao_sessao` → opcional `session.touch`

> TBD: se F-mobile entrar no Studio, replicar com `mobile.TBsessao` ou abandonar a tabela e confiar na sessão Redis. Decisão fica para quando o app mobile chegar à Onda 2.

## Estratégia de reconnect

- Cliente browser usa `EventSource` nativo + `Last-Event-ID` (enviado automaticamente em reconnect).
- Servidor mantém **buffer in-memory por sessão** dos últimos N=100 eventos (TTL 5min) — suficiente para reconnects curtos. Cliente que ficou offline mais que 5min recebe `event: resync` pedindo refetch completo.
- `retry:` field no stream define delay base (recomendação: 3000ms = 3s; menor que os 20s do legado).

```
retry: 3000
event: connected
...
```

- **Sem custom retry policy** equivalente ao `HubRetryPolicy.cs` do legado: EventSource lida nativamente.

## Estratégia de Last-Event-ID

- Formato: `{sessionId}:{monotonicSeq}`.
- `monotonicSeq` é um inteiro por sessão, incrementado server-side a cada evento publicado para aquela conexão.
- Em reconnect, servidor lê `Last-Event-ID` do header, decompõe, e:
  - Se `sessionId` bate e seq está no buffer: replay eventos `(seq, current]`.
  - Se sessão expirou ou seq fora do buffer: envia `event: resync` e cliente refetch.

## Quem dispara o quê

| Evento Studio | Quem publica (API/serviço) | Trigger |
|---|---|---|
| `connected` | rota `GET /api/hub/sse` | open do EventSource |
| `session.changed` | serviço de sessão (Redis pub/sub) | criação/expiração de sessão httpOnly |
| `notification` | `POST /api/hub/notify` ou jobs internos | comando explícito ou alerta de proc |
| `broadcast` | `POST /api/hub/broadcast` | app pede propagação |
| `exec.result` | `POST /api/tenants/{cnpj}/exec` (callback) | execução remota terminou |
| `resync` | rota `GET /api/hub/sse` em reconnect com Last-Event-ID stale | gap > buffer |

## Endpoints REST de suporte (substitutos do `HubController` legado)

| Legado (`api/hub/`) | Studio | Notas |
|---|---|---|
| `POST exec-query?group&db` | `POST /api/tenants/{cnpj}/exec` (`type:"query"`) | unificado |
| `POST notify?group` | `POST /api/hub/notify` | payload com `target` em vez de query |
| `GET query?group&key&db` | `POST /api/tenants/{cnpj}/exec` (`type:"query"`, com `key` no body) | unificado |
| `POST command?group&key` | `POST /api/tenants/{cnpj}/exec` (`type:"command"`) | unificado |
| `POST proc/{name}?group&db` | `POST /api/tenants/{cnpj}/exec` (`type:"proc"`, `command:name`) | unificado |
| `GET auth?group` | n/a no Studio (F003/F004 já cobre auth) | login não passa mais pelo hub |
| `GET loginEmail?group&app` | `POST /api/auth/email-login` | proc `sp_login_email` chamada direta |
| `POST cadastrarEmail?group&app` | `POST /api/auth/email-register` | proc `sp_cadastrar_login_email` chamada direta |
| `POST director/sync` | `POST /api/director/sync` + SSE `exec.result` por tenant | broadcast paralelo |

## Persistência de sessões (substituto de `Sessao` / `mobile.TBsessao`)

- Studio já tem sessão httpOnly em Redis (F004). **Não recria** a tabela `Sessao` SQL.
- A view `mobile.vw_sessao` e a proc `mobile.sp_atualizar_conexao_sessao` ficam no legado on-prem **apenas** se o app mobile legado continuar consumindo `/hub-mobile` durante o cutover. > TBD na fase de migração.
- Para visibilidade ADM ("quem está conectado"): query no Redis (`SCAN session:*`) → expõe como REST `GET /api/admin/sessions` consumido pelo painel.

## Proibido no Studio (anti-patterns do legado a evitar)

- **RPC sobre WebSocket disfarçado de hub**: não replicar `GetClientResponse`/`Callback`. Se precisa de request/response, é REST.
- **Cliente declarar próprio grupo (`type:"group" action:"add"`)**: grupos vêm da sessão server-side, não do cliente.
- **`RefreshSession` broadcast global**: usar eventos granulares.
- **Encriptação custom de payload de aplicação**: TLS cobre. Eliminar `.Encrypt()`/`.Decrypt()` do wire.
- **Retry policy hard-coded em código (`Attempts=10`)**: políticas devem ser configuráveis via env.

## Relações com o ecossistema

- **Contrato pareado**: [[hub-signalr-legacy]] — fonte deste mapeamento.
- **Depende de**: F003/F004 (sessão httpOnly + Redis), F031 (REDIS_URL derivado).
- **Skill canônica**: `realtime-sse` (skill do Studio, fora deste contrato).
- **Consumido por**: F020 (Notifications), e qualquer feature que precise de invalidação reativa de cache (F007 menu, F008 ACL, F011 grid).

## Notas para o smith

- Implementação inicial pode usar Redis pub/sub como fan-out entre instâncias da API; cada conexão SSE subscreve aos channels Redis derivados do `userId`/`empresa` do cookie.
- Buffer in-memory de eventos por sessão pode ser um `LRU` de 100 entradas em memória do processo Node/Hono (não Redis — adicionar Redis aqui só se houver múltiplas réplicas da API atendendo a mesma sessão).
- Não é necessário polyfill `EventSource` em browsers modernos; suportar IE/Edge legacy não está em escopo do Studio.

## Sources

- [[calendar/notes/2026-05-15.md]]
