---
title: "F023 — Hub realtime (SSE) — test report"
tags: [test-report, director-studio, F023, sse, realtime]
created: 2026-05-15
---

# Test report — F023 Hub realtime (SSE)

**Data**: 2026-05-15
**Resultado**: **pass** (10/10)
**Ambiente**: dev local — API `localhost:3001`, Studio `localhost:3000` via Caddy
**Caso real testado**: sessão PROCESSA/99 → DBdirector_imperial_logistica_29 (IMPERIAL LOG, userId=1, empresa=1)

## Critérios cobertos (10)

| # | Critério (decisão/contrato) | Esperado | Observado | Resultado |
|---|---|---|---|---|
| C1 | SSE exige sessão httpOnly ([[hub-sse-mapping]] §"Auth"; F023-decisions #7) | `GET /api/hub/sse` sem cookie → 401 | `HTTP 401` | ✓ |
| C2 | Canal validado server-side (decisão #6: hard-coded `notification`, `session.changed`, `broadcast`) | canal inválido → 400 com lista de canais; canal válido → 200 + `event: connected` com `listenerId` UUID, `id` `{listenerId}:1`, `retry: 3000` | `bogus` → `400 {"error":"unknown-channel","known":[…]}`; `notification` → connected event com `listenerId=f94d4d0d-…`, `userId="1"`, `empresa=1`, `empresaNome="IMPERIAL LOG"`, `retry: 3000` | ✓ |
| C3 | Heartbeat via `event: heartbeat` a cada 25s (decisão #2) | stream long-lived emite `event: heartbeat\ndata: {"ts":…}` em ~25s | recebido `event: heartbeat\ndata: {"ts":1778871833107}` no curl em background após ~25s | ✓ |
| C4 | Filtragem de target server-side (decisão #8; contrato §"PushNotification") | `target:{all:true}` → delivered=1; `target:{userId:"1"}` (match) → delivered=1; `target:{empresa:99}` (no match) → delivered=0; `target:{userId:"999"}` (no match) → delivered=0; só os 2 matches chegam ao stream | exatamente isso: `delivered:1, 1, 0, 0`; stream recebeu 2 eventos `notification` (titles `hi` e `u1`), nenhum dos não-match | ✓ |
| C5 | POST /publish exige sessão (decisão #7) | sem cookie → 401 | `HTTP 401` | ✓ |
| C6 | Last-Event-ID stale via **header** → `event: resync` (decisão #4 + #5; contrato §"Estratégia de Last-Event-ID") | header `Last-Event-ID: deadbeef-stale-listener:5` → connected + `event: resync data:{reason:"listener-changed",lastEventId:"…"}` | exatamente isso, novo listenerId emitido, resync emitido | ✓ |
| C7 | Last-Event-ID via **querystring** fallback (decisão #3 — EventSource não envia header em reconnect manual) | `?lastEventId=stale-via-qs:9` → connected + `event: resync` | exatamente isso | ✓ |
| C8 | GET /snapshot reflete listeners ativos | sem listener → `channels:[]`; com 1 listener `notification` → `channels:[{channel:"notification", listeners:1}]`; cleanup ao fechar stream | `[]` → `[{listeners:1}]` durante stream → `[]` após fim | ✓ |
| C9 | EventSource real do browser ponta-a-ponta (decisão #9 knownTypes; hook `useHub`) | abrir `EventSource('/api/hub/sse?channel=notification')` no browser (cookie auto), publicar, receber via listeners nomeados | conectou (connected event), publish retornou `delivered:2` (1 listener browser + 1 curl bg do mesmo userId="1" — filtragem por userId funcionou: ambos listeners pertencem ao mesmo user), evento `notification` chegou ao callback com payload `{type:"info",title:"browser-test",body:"from useHub C9"}`, EventSource fechou limpo | ✓ |
| C10 | Sem polling (decisão #10; skill `realtime-sse`) | UI consome via stream persistente; network mostra 1 GET SSE long-lived + POSTs explícitos apenas (sem GETs repetidos) | DevTools network: 1 `GET /api/hub/sse` (status 200 confirmado direto via fetch; 503 no snapshot é artefato Chrome ao ler aborted long-lived stream) + 1 `POST /api/hub/publish`. Zero polling | ✓ |

## Notas de execução

- **Auth correto**: endpoint de login espera `{identity, password}` (não `username`). Cookie `director_session` httpOnly, Max-Age=28800.
- **Listener cleanup**: ao encerrar o curl em background (kill por PID 59260, não por nome), `snapshot` voltou a `channels:[]`. Confirma que a decisão "listenerId UUID por conexão" + cleanup no abort funcionam.
- **Filtragem cumulativa userId**: publish com `target:{userId:"1"}` chegou aos 2 listeners ativos do mesmo user (curl + browser), confirmando que o filtro é por **identidade**, não por conexão.
- **knownTypes**: `event: connected`, `event: notification`, `event: heartbeat`, `event: resync` todos disparados em listeners nomeados no `addEventListener`. `EventSource.onmessage` NÃO seria chamado para esses (decisão #9 valida o fix).

## Limitações / não exercitado

- **HubStatus não está montado em nenhuma página** do app (`grep` por `HubStatus` em `apps/web` ou `app-shell` retorna zero matches fora do próprio componente em `packages/ui`). O componente passa typecheck e está exportado, mas a integração visual no shell **não foi testada porque não existe ainda**. **Não bloqueia F023** porque o smith entregou o hook + componente conforme escopo do contrato; integração no shell pode ser feature subsequente (ex.: F-status-chip no header) ou ressalva pro curator.
- **Channels `session.changed` e `broadcast`**: validados apenas via list de canais conhecidos (C2). Smoke do dispatcher real desses canais seria responsabilidade da feature consumidora (F004 já dispara `session.changed` quando sessão expira — não exercitado nesta wave).
- **Multi-instância / Redis pub/sub**: bus in-memory por design (decisão #1), TODO para F024+.

## MISSION / PERSONA check

- **MISSION (upgrade real do legado)**: ✓ — substitui SignalR (WebSocket bidirecional + `.Encrypt()` custom + retry hard-coded `Attempts=10`) por SSE simples sobre HTTP, cookie httpOnly TLS, filtragem server-side. Cliente não pode mais entrar em grupo arbitrário (anti-pattern do legado eliminado). Stream long-lived, sem polling — bate com contrato §"Proibido no Studio".
- **PERSONA (Time Director, varejo/atacado BR)**: ✓ neutro — feature de infra invisível ao usuário final por enquanto. Quando F020 (notifications) ou F004 (`session.changed`) consumirem, o gerente de loja vai sentir como "alerta chegou na hora", não como "tive que dar F5".

## Evidência

- API real respondendo em `localhost:3001` (não mock)
- Sessão real PROCESSA/99 com DB Imperial Logística 29
- Cookies em `.tmp/cookies-f023.txt`, log SSE em `.tmp/sse-f023.log`
- 10 comandos curl + 1 EventSource real no browser
- Console limpo (read_console_messages sem matches em hub|sse|EventSource|error|warn)

## Próxima ação

- **pass** → curator aceita
- Sugestão não-bloqueante: backlog F-XXX para montar `<HubStatus channel="notification" />` no app-header (DevAffordance ou status real conforme MISSION) — torna feedback visível pro usuário e cobre C9-visual end-to-end.
