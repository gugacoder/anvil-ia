---
title: "Hub realtime legado (SignalR)"
aliases: [hub-signalr-legacy, processa-hub, hub-mobile, hub-suphelp]
tags: [contract, legacy, signalr, realtime, integration, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: Hub realtime legado (SignalR)

O Processa legado opera **dois hubs SignalR** simultâneos, ambos derivados da classe abstrata `ProcessaHub : Microsoft.AspNetCore.SignalR.Hub` no SDK. Os dois hubs falam o **mesmo wire protocol** (mesmos eventos `SendAsync`/`InvokeAsync`), só mudam o endpoint, a tabela de sessão e o público:

1. **`/hub-suphelp`** — hub central no `Processa.ADM` (na AWS). Cada **Portal.Director on-premise** do cliente se conecta como **cliente SignalR** (`HubConnection` reverso) para receber comandos da AWS (queries, procs, auth) e executá-los contra o banco local. É o caminho `ADM → tenant`. Também serve o painel web ADM (`Processa.ADM.Website/src/hooks/useHub.jsx`) para notificações e refresh de listagem de clientes conectados.
2. **`/hub-mobile`** — hub no próprio `Portal.Director` on-premise. **Apps Mobile do Director** se conectam para registrar presença, executar procs remotas e propagar mensagens entre dispositivos da mesma empresa. Sessão persistida em `mobile.TBsessao` via `mobile.sp_atualizar_conexao_sessao`.

Mesmo modelo de classe, configuração distinta:

| Hub | Endpoint default | Onde roda | SessionTable | SessionProc | Cliente típico |
|---|---|---|---|---|---|
| `/hub-suphelp` | `appsettings.json:AppSettings.HubEndpoint` | `Processa.ADM.Aplicacao` (nuvem) e cliente reverso em `PortalDirector.Aplicacao` | `Sessao` (tabela de clientes ADM) | n/a (sessão registrada via API REST do ADM) | Portais Director on-prem; SPA ADM (browser) |
| `/hub-mobile` | `AppSettings.HubMobileEndpoint` | `PortalDirector.Aplicacao` (on-prem do tenant) | `mobile.vw_sessao` | `mobile.sp_atualizar_conexao_sessao` | App Mobile Director (browser/PWA/nativo) |

O Studio substitui ambos por SSE — ver [[hub-sse-mapping]].

## Citações de fonte

- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.IOC/ProcessaHub.cs:12-213` — classe base abstrata, define todos os eventos do wire protocol.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.IOC/HubExtensions.cs:51-64` — `UseHub<T>()`: registra o hub no pipeline ASP.NET com `MapHub<T>(endpoint)` e injeta `ProcessaHubOptions` no `HttpContext.Items["HubOptions"]`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.IOC/HubExtensions.cs:35-49` — `UseHubClient<T>()`: registra o **cliente reverso** (singleton) que conecta o `Portal.Director` ao hub central do ADM.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.IOC/HubClient.cs:32-167` — implementação do cliente SignalR reverso (`@microsoft/signalr` .NET): builder com headers de identidade, retry policy, handlers para `GetAck`, `Connected`, `PushNotification`, `GetClientResponse`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.IOC/HubRetryPolicy.cs:1-21` — política de retry: a cada falha aguarda 20s e tenta de novo (sem backoff exponencial); emite `OnLostConnection` para logging.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.IOC/HubDAO.cs:12-72` — sessão SignalR persistida em SQL: `UserConnected` chama a `SessionProc` com XML dos headers; `UserDisconnected` faz `UPDATE Sessao SET Ativo=0, ConexaoId=NULL`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Program.cs:18-58` — bootstrap: `AddSignalR`, `UseHubClient<HubResponseHandler>()` (cliente reverso), `UseHub<HubMobileHandler>(...)` (servidor mobile).
- `sources/engenharia--fabrica--dotnet--processa.ADM/Fontes/Processa.ADM.Aplicacao/Program.cs:12-40` — bootstrap ADM: `AddSignalR` + `UseHub()` no endpoint default `/hub-suphelp`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Handlers/HubMobileHandler.cs:11-95` — handler de mensagens recebidas pelo hub mobile (server-side, atende apps).
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Handlers/HubResponseHandler.cs:10-101` — handler de respostas (client-side reverso): roteia comandos vindos do ADM por tipo (`query`/`proc`/`auth`/`command`/`alert`/`director`/`sped`).
- `sources/engenharia--fabrica--dotnet--processa.ADM/Fontes/Processa.ADM.Aplicacao/Controllers/HubController.cs:1-48` — API REST do ADM que dispara mensagens server→client via `IHubContext<ProcessaHub>`.
- `sources/engenharia--fabrica--dotnet--processa.ADM/Fontes/Processa.ADM.Services/HubService.cs:13-187` — orquestra `GetClientResponse` (request/response síncrono sobre SignalR) e logging em `LogHub`.
- `sources/engenharia--fabrica--dotnet--processa.ADM/Fontes/Processa.ADM.Repository/AdmRepository.cs:88-105` — `FindTargetGroup`: descobre qual `Grupo` SignalR atende um dado CNPJ+DB (lendo `Sessao` ativa).
- `sources/engenharia--fabrica--dotnet--processa.ADM/Fontes/Processa.ADM.Website/src/hooks/useHub.jsx:1-97` — único consumidor browser real: o painel ADM. Liga em `/hub-suphelp` e escuta `PushNotification`, `RefreshSession`, `Connected`.
- `sources/engenharia--fabrica--dotnet-core--director/Config/appsettings.json:20-23` — defaults `/hub-suphelp` e `/hub-mobile`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/mobile.sp_atualizar_conexao_sessao.sql:1-35` — proc de sessão mobile.

> note: na arquitetura legada o `react-tools/` **não consome SignalR** — único `signalr` no diretório aparece em `package-lock.json` e `coreui.css` (varredura). O consumidor web do `/hub-suphelp` é o `Processa.ADM.Website`, não o portal-website do Director. Apps Mobile são consumidores presumidos do `/hub-mobile` mas o código mobile **não está em `sources/`** > inferido pelos headers (`Device`, `Machine`, `Group=cnpj:level`) e pela tabela `mobile.TBsessao`.

## Estrutura — eventos do wire protocol

### Server → Client (`hub.Clients.*.SendAsync("<event>", ...)`)

| Evento | Direção | Payload | Semântica | Quem dispara | Quem consome |
|---|---|---|---|---|---|
| `Connected` | server→caller | `string connectionId` | Confirma handshake; envia o ID atribuído pelo hub | `ProcessaHub.OnConnectedAsync` após registrar sessão | Cliente reverso (`HubClient.cs:73`) e SPA ADM (`useHub.jsx:76`) para log |
| `RefreshSession` | server→all | `bool` (sempre `true`) | Sinaliza que a lista de sessões mudou (alguém conectou/desconectou). Broadcast indiscriminado. | `OnConnectedAsync`, `OnDisconnectedAsync`, `CheckClients` | SPA ADM dispara `queryClients()` para refazer listagem (`useHub.jsx:72`) |
| `PushNotification` | server→client (cliente específico) ou server→all | `string objeto` (JSON `{ type, command:{ title, body, icon? } }`) | Notificação não-solicitada para o usuário (toast). `type ∈ {success, info, warning, danger}` (> inferido de `useHub.jsx:56-69`); ícone usado só em Linux (`HubClient.cs:75-99`). Roteamento por `connId` ou broadcast. | `ProcessaHub.PushNotification`; exposto via REST `POST /api/hub/notify` (`HubController.cs:13`) | SPA ADM (toast via `useNotifications`) e cliente reverso .NET no Linux (notify-send) |
| `ReceiveMessage` | server→group **ou** server→all | `string objeto` (texto **encriptado**, ver §criptografia) | Mensagem genérica de propagação. Decifrada pelo destinatário. | `ProcessaHub.SendMessage` (`ProcessaHub.cs:71-77`) e `HubMobileHandler.HandleSendMessage` quando app envia `type=propagate` | Apps Mobile (presumido) |
| `GetClientResponse` | server→group | `(string message, string db, string guid)` — `message` **encriptado**, `db` em texto plano, `guid` da operação | RPC server→client: pede ao tenant para executar `query`/`proc`/`auth`/`command` no banco local e responder via `Callback`. | `ProcessaHub.GetClientResponse` (`ProcessaHub.cs:128-164`); chamado pelo `HubService` do ADM em todos os endpoints `/api/hub/*` | Cliente reverso .NET no `Portal.Director` (`HubClient.cs:101-153`) — executa via `HubResponseHandler.OnGetClientResponse` |
| `GetAck` | server→client (invoke) | `void` → cliente retorna `"ok"` | Healthcheck: verifica se um `connectionId` específico ainda responde. Timeout 15s. | `ProcessaHub.GetAck` (`ProcessaHub.cs:119-126`); chamado por `CheckClients` em loop | Cliente reverso .NET (`HubClient.cs:71`) |

### Client → Server (`hub.InvokeAsync("<method>", ...)`)

| Método | Direção | Payload | Semântica | Implementação |
|---|---|---|---|---|
| `ReceiveMessage` | client→server | `string message` (encriptado) | App envia comando para o hub mobile. Decifrado e roteado por `type` (`proc`/`group`/`propagate`). | `ProcessaHub.ReceiveMessage` → `OnReceived_Message` → `HubMobileHandler.HandleAction` (`HubMobileHandler.cs:28`) |
| `Callback` | client→server | `(string guid, string message)` — `message` encriptado | Cliente reverso devolve resultado de um `GetClientResponse` pendente. `message="running"` sinaliza in-flight; qualquer outro valor encerra a `TaskCompletionSource` daquela `guid`. | `ProcessaHub.Callback` → `ClientResponse` event (`ProcessaHub.cs:27-31`) consumido pelo handler interno de `TrySendAsync` (`ProcessaHub.cs:175-196`) |
| `Ack` | client→server | `(string guid, string status)` | Confirmação simples; usada quando `message="ack"` chega no cliente reverso (`HubClient.cs:106-109`). | > inferido: handler `Ack` não está visível em `ProcessaHub.cs` — TBD se vive em subclasse ou se é roteado para `Callback` |

### Tipos de mensagem (após decriptar `ReceiveMessage` no `/hub-mobile`)

Payload é JSON com campo `type`:

| `type` | Campos | Efeito | Citação |
|---|---|---|---|
| `proc` | `command` (nome da proc), `body` (params JSON), `database?` | Executa stored procedure no banco do tenant; sem resposta (fire-and-forget). Default DB: `Director`. | `HubMobileHandler.HandleProc:53-61` |
| `group` | `action ∈ {add, remove}`, `name` (nome do grupo) | Adiciona/remove a connection do app ao grupo SignalR (escopo de broadcast). Permite app entrar em "salas" por empresa/usuário. | `HubMobileHandler.HandleGroup:69-77` |
| `propagate` | `payload` (string), `method` (nome do evento client-side), `group?` | Re-broadcast: hub mobile reenvia `payload` como `SendAsync(method, payload)` para `Clients.Group(group)` ou `Clients.All`. Permite app pedir "mande X para tal grupo". | `HubMobileHandler.HandleSendMessage:84-94` |

### Tipos de mensagem (após decriptar `GetClientResponse` no cliente reverso)

Mesma estrutura JSON `{ type, command, body, ... }`; roteamento em `HubResponseHandler.OnGetClientResponse:63-101`:

| `type` | Efeito | Connection string |
|---|---|---|
| `query` | `_repo.ExecQuery(command, isNonQueryStatement, body, connString, containsGoStatement)` — executa SQL ad-hoc | `Settings.ConnectionStrings()[db]` ou `"Director"` |
| `proc` | `_repo.ExecProc(command, body, connString)` | idem |
| `auth` | `_service.ExecAuth(body, connString)` — fluxo de autenticação remota | idem |
| `command` | `_service.ExecCommand(command, body)` — comando interno do Director | n/a |
| `alert` | `_service.Notify(command)` — síncrono | n/a |
| `director` | `_service.SyncModules(body)` — sync do Director Update Service | n/a |
| `sped` | `_spedService.ExecCommand(body)` | n/a |
| `file`, `job`, `request` | `"TODO..."` literal — não implementados | n/a |

## Autorização

### `/hub-suphelp` (ADM)

- **JWT obrigatório**: `HubClient.TokenProvider` gera token via `TokenUtils.GenerateJWTToken(new(1, "portal-director"))` e passa em `options.AccessTokenProvider`. No SPA ADM, o token vem de `GET /auth` (`useHub.jsx:29-32`).
- **Identidade**: `ProcessaHub.OnConnectedAsync` exige `Thread.CurrentPrincipal.Identity is DirectorIdentity`; senão lança "Usuário não autenticado".
- **Headers obrigatórios** (cliente reverso, `HubClient.cs:46-56`):
  - `Group`: `"{cnpj}:0"` — chave de roteamento (CNPJ + nível)
  - `Env`: ambiente do tenant (`Os.GetEnvironment()`)
  - `Device`: MAC address (`Os.GetMacAddress()`)
  - `Machine`: hostname (`Os.GetMachineName()`)
  - `IP`: IP local
  - `Cnpj`: CNPJ raiz
  - `Level`: nível hierárquico (string)
  - `ConnStrings`: lista CSV de chaves de connection-string disponíveis no tenant (define quais DBs aquele node pode atender)
  - `Version`: versão do `Portal.Director`
- **Headers SPA** (browser, `useHub.jsx:41-46`): apenas `Env`, `Device` (UA), `Machine="PROCESSA"`, `Group="Processa\\{usuario}"`.
- **Validação de empresa**: `HubService.ExecProc` chama `authService.IsUserAllowedOnGroup(group)` (`HubService.cs:127`) — token tem que combinar com o `group` (CNPJ) alvo, ou lança "O token utilizado não corresponde ao grupo informado."

### `/hub-mobile` (Director on-prem)

- Mesma exigência de `DirectorIdentity` em `OnConnectedAsync`. > TBD: como o app mobile obtém o token (provavelmente `auth` via REST do próprio Director).
- Sessão é gravada na `mobile.TBsessao` indexada por `DFid_usuario` (do JWT) e `DFcod_connection` (connectionId SignalR).

## Lifecycle

### Connect

1. Cliente abre WebSocket em `/hub-suphelp` (ou `/hub-mobile`) com `Authorization: Bearer <jwt>`.
2. `ProcessaHub.OnConnectedAsync` (`ProcessaHub.cs:33-55`):
   - Lê `DirectorIdentity` do `Thread.CurrentPrincipal`.
   - Captura `RemoteIp` do `HttpContext` e injeta como header `RemoteIp`.
   - Chama `HubDAO.UserConnected(headers, identity, options, connectionId)` que monta XML `<Parametros>` e invoca `options.SessionProc` (no caso mobile, `mobile.sp_atualizar_conexao_sessao`).
   - Se a proc retorna `{ Grupo: "..." }`, adiciona a conexão ao grupo SignalR de mesmo nome.
   - Se retorna `{ Erro: "..." }`, lança exception (recusa a conexão).
3. Envia `Connected` para o caller (com o `connectionId`).
4. Broadcasta `RefreshSession=true` para todos.

### Disconnect

1. `OnDisconnectedAsync` chama `HubDAO.UserDisconnected(connectionId, options)`:
   - Executa `UPDATE {SessionTable} SET Ativo=0, ConexaoId=NULL WHERE ConexaoId=@connectionId`.
2. Broadcasta `RefreshSession=true`.

### Reconnect

- **Cliente .NET** (`HubClient`): `WithAutomaticReconnect(HubRetryPolicy)` + reabertura manual no `HubConnection.Closed` (`HubClient.cs:155-164`) — espera 1s e chama `StartAsync()`. `RetryPolicy.NextRetryDelay` sempre retorna 20s, sem backoff exponencial e sem limite de tentativas.
- **Cliente browser** (SPA ADM): `withAutomaticReconnect()` default do `@microsoft/signalr` (sequência 0,2,10,30s, depois desiste — comportamento padrão da lib).

### Heartbeat / liveness

- `ProcessaHub.CheckClients` (`ProcessaHub.cs:87-117`) varre `HubDAO.GetSession(options)` (todos os `ConexaoId` em `Sessao`/`mobile.TBsessao`), invoca `GetAck` em cada um com timeout 15s; o que não responder `"ok"` é marcado `Ativo=0`. Depois broadcasta `RefreshSession`. > TBD: quem dispara `CheckClients` (não vi `IHostedService` chamando) — possivelmente Quartz job (há `using Quartz.Util` no handler) > inferido.
- `GetAck` invoke do cliente: `HubConnection.On("GetAck", () => "ok")` (`HubClient.cs:71`).

### Request/response síncrono sobre SignalR (`GetClientResponse`)

Padrão de RPC implementado em cima do SignalR (`ProcessaHub.cs:128-210`):

1. Servidor gera `guid`, chama `Clients.Group(group).SendAsync("GetClientResponse", encrypted, db, guid)`.
2. Servidor registra handler local no event `ClientResponse`; cria `TaskCompletionSource<string?>`.
3. Cliente recebe, executa, chama `InvokeAsync("Callback", guid, response.Encrypt())`.
4. `Callback` invoca o event `ClientResponse`, que dispara o handler do servidor — se `guid` bater, resolve a TCS.
5. **Retry policy**: até `Attempts=10` (constante hard-coded `ProcessaHub.cs:16`); timeout escalonado por tentativa:
   - tentativas 1–5: 5s cada
   - tentativas 6–9: 30s cada
   - tentativa 10: 30min
6. Resposta intermediária `"running"` mantém o waiter aberto (cliente sinaliza que ainda está processando).

## Criptografia do payload

> note: payloads de `ReceiveMessage`, `Callback`, `SendMessage`, `GetClientResponse` passam por `.Encrypt()` / `.Decrypt()` extension methods do SDK (`Processa.Sdk.Api`). Implementação não auditada neste contrato — > TBD: catalogar algoritmo e chave em contrato separado se relevante para o Studio. `PushNotification` e `RefreshSession` viajam em texto plano. `db` e `guid` em `GetClientResponse` também em texto plano.

## Grupos (escopo de broadcast)

- **Chave**: string arbitrária, mais comum `"{cnpj}:{level}"` (CNPJ + nível). SPA ADM usa `"Processa\\{usuario}"`.
- **Mapeamento CNPJ → connectionId**: `AdmRepository.FindTargetGroup(cnpj, db)` (`AdmRepository.cs:88-105`) consulta `Sessao` ativa do CNPJ, filtra pelo cliente que declarou ter aquele `db` em `Conexoes` (CSV de chaves de connection-string que o tenant publicou via header `ConnStrings` no connect).
- **Adição de grupo via runtime**: app mobile envia `type=group action=add|remove name=...`; hub chama `Groups.AddToGroupAsync(connectionId, name)` (`HubMobileHandler.HandleGroup`).
- **Adição automática no connect**: se `SessionProc` retorna `Grupo`, o connectionId entra nesse grupo automaticamente.

## Persistência de sessão

### `Sessao` (ADM, `/hub-suphelp`)

Tabela legada (> inferido — DDL não escavada aqui). Colunas conhecidas via `HubDAO.GetConnectionInfo` (`HubDAO.cs:54-72`) e `AdmRepository.FindTargetGroup`:

| Coluna | Tipo | Origem |
|---|---|---|
| `Grupo` | string | header `Group` |
| `Ambiente` | string | header `Env` |
| `Dispositivo` | string | header `Device` |
| `Maquina` | string? | header `Machine` |
| `IP` | string | header `RemoteIp` |
| `UsuarioId` | int? | `identity.Id` |
| `NomeUsuario` | string? | `identity.Name` |
| `ConexaoId` | string? | `Context.ConnectionId` (null quando inativo) |
| `Cnpj` | string | header `Cnpj` |
| `Nivel` | int | header `Level` |
| `Versao` | string? | header `Version` |
| `Conexoes` | string? | header `ConnStrings` (CSV) |
| `Ativo` | bool | `1` no connect, `0` no disconnect |

> TBD: contrato dedicado `tbsessao-adm.md` se o Studio precisar replicar essa view.

### `mobile.TBsessao` (Director on-prem, `/hub-mobile`)

Colunas tocadas pela proc `mobile.sp_atualizar_conexao_sessao`:

| Coluna | Tipo | Efeito |
|---|---|---|
| `DFid_usuario` | int | chave (match com `<UserId>` do XML) |
| `DFcod_connection` | nvarchar(50) | atualizada com o `Context.ConnectionId` SignalR |
| `DFativo` | bit | setado para 1 |

> TBD: contrato `mobile-tbsessao.md` quando F-mobile entrar no Studio.

## API REST que dispara eventos server→client

Controller `Processa.ADM.Aplicacao.Controllers.HubController` (`HubController.cs:1-48`), prefix `api/hub/`:

| Verbo | Rota | Disparo no hub | Wire event resultante |
|---|---|---|---|
| `POST` | `exec-query?group={cnpj}&db={db}` | `service.ExecRawQuery` → `ProcessaHub.GetClientResponse` | `GetClientResponse` → `Callback` |
| `POST` | `notify?group={cnpj}` | `service.PushNotification` | `PushNotification` (broadcast all se group vazio, senão `Clients.Group`) |
| `GET` | `query?group={cnpj}&key={chave}&db={db}` | `service.ExecQuery` (busca SQL pré-cadastrada por `key`) | `GetClientResponse` |
| `POST` | `command?group={cnpj}&key={chave}` | `service.ExecCommand` | `GetClientResponse` |
| `POST` | `proc/{name}?group={cnpj}&db={db}` | `service.ExecProc` (com checagem `IsUserAllowedOnGroup`) | `GetClientResponse` |
| `GET` | `auth?group={cnpj}` | `service.Authenticate` | `GetClientResponse` |
| `GET` | `loginEmail?group={cnpj}&app={app}` | `service.AuthenticateExternalUser` (com `api-key` header) | `GetClientResponse` (proc `sp_login_email` no tenant) |
| `POST` | `cadastrarEmail?group={cnpj}&app={app}` | `service.RegisterExternalUser` | `GetClientResponse` (proc `sp_cadastrar_login_email`) |
| `POST` | `director/sync` | `service.UpdateDirector` (broadcast em todos os clients ativos via `Sessao`) | `GetClientResponse` paralelo com `type=director` |

## Relações com o ecossistema

- **Consome de**: tabela `Sessao` (ADM), `mobile.TBsessao` (Director), proc `mobile.sp_atualizar_conexao_sessao`.
- **É consumido por**:
  - `Processa.ADM.Website` (browser, painel ADM) — `useHub.jsx`.
  - Apps Mobile Director (fora do `sources/`) > inferido.
  - `Portal.Director` on-prem (cliente reverso .NET, não browser).
- **Procedures relacionadas** (consumidas via `type=proc` em `GetClientResponse`): `sp_login_email`, `sp_cadastrar_login_email`, `hub_obter` (chamada pela SPA ADM via REST `POST /proc/hub_obter`).
- **Contrato pareado**: [[hub-sse-mapping]] — como cada evento aqui mapeia em endpoint SSE no Studio.

## Notas de implementação para o Studio

- O Studio **não herda o papel de hub central** (`/hub-suphelp`) — esse fica no ADM legado ou em substituto cloud. O Studio é só **cliente** do ADM (consumidor de notificações cross-tenant) e potencialmente **servidor** do hub mobile (se F-mobile entrar em escopo).
- O modelo `GetClientResponse` (RPC sobre WebSocket) é um anti-pattern para SSE puro (SSE é one-way). Para cobrir RPC bidirecional o Studio precisa combinar SSE (server→client) com REST (client→server). Detalhamento em [[hub-sse-mapping]].
- `RefreshSession` é broadcast burro: dispara em todo connect/disconnect global. No Studio é preferível eventos específicos (`session.created`, `session.closed`) com payload mínimo para invalidar caches sob demanda.
- `PushNotification` mapeia direto em SSE (event-stream `notification` com payload `{ type, command:{ title, body, icon } }`).
- O retry-policy 20s fixo do legado é frágil; SSE nativo do browser já tem `retry:` field no event stream — usar isso, não reinventar.

## Sources

- [[calendar/notes/2026-05-15.md]]
