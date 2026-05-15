---
title: "F023 — Hub realtime (SSE) — decisões de implementação"
tags: [effort, director-studio, decisions, F023, sse, realtime]
created: 2026-05-15
---

# F023 — Decisões

Contratos seguidos: [[hub-signalr-legacy]] + [[hub-sse-mapping]]. Skill: `realtime-sse`.

## Arquivos tocados

- `workspace/director-studio/apps/api/src/hub-bus.ts` — bus in-memory (Map<channel, Set<Listener>>); LRU buffer 100 por listener; filtragem por target (userId/empresa/all); `publish`, `registerListener`, `replayFromLastEventId`, `snapshot`.
- `workspace/director-studio/apps/api/src/routes/hub.ts` — `GET /sse?channel=`, `POST /publish`, `GET /snapshot`. Auth por cookie httpOnly (HMAC); Last-Event-ID via header HTTP **ou** querystring `?lastEventId=` (fallback porque EventSource não envia header custom em reconnect manual); heartbeat 25s via `event: heartbeat` (Hono streamSSE não tem comment helper, então usamos event nomeado que o cliente ignora).
- `workspace/director-studio/apps/api/src/index.ts` — wire `app.route('/api/hub', hubRoutes)`.
- `workspace/director-studio/packages/ui/src/hooks/use-hub.ts` — `useHub(channel, onEvent)` com backoff exponencial 1s→30s, status enum (connecting/open/closed/error), lastEventId em memória, eventos internos (`connected`, `heartbeat`, `resync`) filtrados.
- `workspace/director-studio/packages/ui/src/components/hub-status.tsx` — chip indicador com tokens semânticos x-success/x-warning/x-info/muted, ícones Phosphor, contador de eventos.

## Decisões conscientes

1. **Bus in-memory, não Redis** — F023 é P0 dentro de uma instância só (stack hoje tem 1 worker da API). TODO marcado no hub-bus.ts para trocar `dispatch` por `Redis PUBLISH ds:hub:<channel>` quando F024/multi-réplica chegar. Contrato hub-sse-mapping §"Notas para o smith" autoriza essa estratégia inicial.
2. **Heartbeat via `event: heartbeat`**, não comment SSE puro (`:keep-alive`) — Hono `streamSSE` não expõe API de comment-only sem quebrar encapsulamento do `SSEStreamingApi`. O `useHub` filtra esse evento antes de chamar `onEvent`. Mesmo efeito de keep-alive a nível de TCP/proxy.
3. **Last-Event-ID via querystring fallback** — `EventSource` nativo do browser só envia o header `Last-Event-ID` em reconnect IMPLÍCITO. Como `useHub` reabre manualmente (backoff custom > 3s nativo), passamos `?lastEventId=` na URL. Backend aceita ambos (header tem precedência).
4. **listenerId UUID por conexão** — `Last-Event-ID` no formato `{listenerId}:{seq}`. Como listenerId é único por conexão, qualquer LEID vindo de uma conexão anterior já encerrada **nunca** bate com o novo listener → resync explícito enviado em vez de replay. Estratégia conservadora: zero risco de replay cross-listener. Para replay em reconnect rápido dentro da MESMA conexão (rede falhou um instante), o cenário não se aplica (EventSource nativo já cobre); para reconnects > backoff, o cliente faz refetch.
5. **`event: resync` em vez de buffer cross-listener** — alinhado com hub-sse-mapping §"Estratégia de Last-Event-ID": "Se sessão expirou ou seq fora do buffer: envia event: resync e cliente refetch."
6. **Canais conhecidos hard-coded** (`notification`, `session.changed`, `broadcast`) — qualquer outro retorna 400. Evita explosão de canais e força adicionar via contrato.
7. **POST /publish exige sessão** — em produção a maioria das chamadas vai ser server-side direto via `import { publish }`. O endpoint REST fica como ferramentaria/admin. TODO no route para revisar quando F024 chegar.
8. **Filtragem de target server-side**, não cliente — `hub-bus.isDeliverable` confere userId/empresa antes de enviar. Cliente NUNCA recebe evento fora do scope dele. Cumpre o "Anti-pattern eliminado: cliente não pode mais entrar em grupo arbitrário só pedindo" do contrato §"Proibido no Studio".
9. **knownTypes hard-coded no useHub** — `EventSource` não dispara `onmessage` para `event:` nomeados. Em vez de pedir ao caller listar eventos, registramos um conjunto amplo prático (`connected`, `heartbeat`, `resync`, `notification`, `session.changed`, `broadcast`, `test`, `exec.result`). Quando F024/F036+ introduzirem novos tipos, adicionar nesta lista (ou expor opção `eventTypes` no hook).
10. **Sem polling em hipótese alguma** — ralfo proibido pelo skill `realtime-sse`. Toda fonte de eventos é SSE; ações cliente→server vão por REST normal.

## Smoke test (passou)

API rodando em `localhost:3001`. Login `PROCESSA/99` → cookie. SSE `?channel=notification` aberto via curl; `POST /publish` com 2 eventos:
- `{event:"test", data:{msg:"hello smith"}, target:{all:true}}` → `delivered:1`, cliente recebe `event: test`.
- `{event:"notification", data:{type:"success",...}, target:{userId:"1"}}` → `delivered:1`.
- `target:{empresa:99}` (não bate) → `delivered:0`.
- `?channel=bogus` → 400.
- `Last-Event-ID: deadbeef:5` → `event: resync` imediato após `connected`.

## Pendências (não bloqueiam F023)

- Redis pub/sub para multi-réplica (F024+).
- Migrar clientes existentes (F020 Notifications, etc.) — fora do escopo desta wave.
- Comment puro `:keep-alive` em vez de event heartbeat — só se um caso real surgir (cliente atual ignora heartbeat sem custo).
- Helper compartilhado de session-cookie verification — auth.ts, forms-proxy.ts, hub.ts duplicam. DRY adiada para wave de refactor (não bloqueia entrega).
