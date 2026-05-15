# Test report — F005 App layout (sidebar + header)

**Data**: 2026-05-15
**Resultado**: blocked
**Ambiente**: localhost:3000 (Caddy proxy)
**Caso real testado**: tentativa de login com PROCESSA/99 (não chegou ao shell)

## Bloqueio

O front (Caddy + Vite) responde 200 em `/` e `/login`, mas todo o backend Hono (`/api/*`, `/healthz`) retorna **502 Bad Gateway**.

Evidências:

- `curl http://localhost:3000/healthz` → `502`
- `curl -X POST http://localhost:3000/api/auth/login -d '{"username":"PROCESSA","password":"99"}'` → `502 Bad Gateway` (Server: Caddy, Content-Length: 0)
- `docker ps` lista apenas `director-studio-redis` (healthy) e `director-studio-caddy` (up). **Container/processo da API Hono ausente.**
- Caddyfile (`infra/docker/caddy/Caddyfile`) confirma roteamento `/api/*` e `/healthz` → `{$API_HOST}:{$API_PORT}`, ambos sem responder.

Comportamento observado no Studio: login form renderiza, ao submeter PROCESSA/99 a UI exibe `"Erro no servidor. Tente novamente em instantes."` (consistente com 502 do POST `/api/auth/login`).

## Cenários planejados (não executados)

| # | Cenário | Estado |
|---|---|---|
| 1 | Login PROCESSA/99 → /app | bloqueado por backend down |
| 2 | Desktop ≥768px: sidebar persistente + toggle expand/rail + persist `director-studio:sidebar-collapsed` | não alcançado |
| 3 | Mobile <768px: header sticky + shortcut-bar + drawer-up via menu | não alcançado |
| 4 | AvatarMenu: ThemeToggle ciclando + Logout | não alcançado |
| 5 | Logout → POST /api/auth/logout → /login | não alcançado |
| 6 | useBlocking / BlockingOverlay | não alcançado |
| 7 | Regressão F006: tema cicla via toggle + atalho D | não alcançado |
| 8 | Console limpo (exceto reduced-motion warning) | parcial — apenas warning de motion observado pré-submit |

## Próxima ação

- Smith/infra: subir API Hono do Director.Studio (porta/host definidos em `API_HOST`/`API_PORT` que o Caddyfile consome). Sem ele, F005 não pode ser validado.
- Reabrir teste após `/healthz` retornar 200 e `POST /api/auth/login` autenticar PROCESSA/99 com 200 + cookie.
