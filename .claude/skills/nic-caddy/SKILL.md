---
name: nic-caddy
description: "Padrao de Caddy como proxy reverso INTERNO do projeto: unifica todos os servicos da composicao em 1 porta publica. Use quando configurar Caddyfile, adicionar novos servicos ao proxy interno, integrar a app com proxy reverso externo (web_network), entender por que cada projeto embarca seu proprio Caddy, ou quando o usuario mencionar: 'Caddyfile', 'Caddy proxy', 'proxy interno do projeto', 'adicionar servico ao Caddy', 'web_network', 'nic-caddy', 'porta publica do projeto'."
---

# Caddy — proxy reverso interno de cada projeto

Convencao de time: **todo projeto embarca um Caddy proprio** que age como o proxy reverso **dentro** da composicao docker. Unifica o conjunto de servicos (frontend, backend, workers, etc) em UMA porta publica.

## Por que Caddy interno (e nao deixar pra nginx-proxy do host)?

**Cenario 1 — sem Caddy interno**:
- Cada servico interno tem um vhost no proxy reverso do host
- Adicionar/remover/renomear servico = editar infra compartilhada
- Deploy de cada app precisa coordenar com a equipe de infra

**Cenario 2 — com Caddy interno (nosso padrao)**:
- **O contrato do projeto com o mundo externo e 1 porta** (`PUBLIC_PORT`)
- Nginx externo proxy_pass pra `<app>-caddy:<PUBLIC_PORT>` — ponto
- Toda complexidade de roteamento interno vive no Caddyfile, dentro do repo do projeto
- Adicionar servico interno = editar Caddyfile no repo. Zero mudanca em infra compartilhada.

**Regra pratica**:
> **"Todo projeto e uma composicao que expoe uma porta publica via Caddy."**  
> Mudou os servicos internos? Edita Caddyfile, commit, deploy. Ninguem precisa saber.

## Arquitetura

```
  External proxy (nginx, apache, LB, etc)
           │   (1 porta: PUBLIC_PORT)
           ▼
     <app>-caddy  ← Caddyfile decide rota
     ├── /api/v1/*  → backend.internal
     ├── /app/*     → frontend.internal
     ├── /health    → backend.internal
     ├── /docs/*    → docs.internal
     └── /          → redir /app/
           │
           ▼  (rede docker `internal`)
       frontend   backend   workers   docs
```

## Onde o Caddy vive

Servico `caddy` no `docker-compose.platform.yml` (ver skill `nic-dockerization`):

```yaml
caddy:
  image: caddy:alpine
  ports:
    - "${PUBLIC_PORT}:${PUBLIC_PORT}"
  volumes:
    - ./docker/caddy/Caddyfile:/etc/caddy/Caddyfile:ro
  environment:
    PUBLIC_PORT: ${PUBLIC_PORT}
    FRONTEND_HOST: ${PROXY_FRONTEND_HOST}
    FRONTEND_PORT: ${FRONTEND_PORT}
    BACKEND_HOST: ${PROXY_BACKEND_HOST}
    BACKEND_PORT: ${BACKEND_PORT}
```

- **`ports:`** — unica porta exposta pro host. E A porta publica do projeto.
- **Caddyfile** em `infra/docker/caddy/Caddyfile`, mountado read-only.
- **Env vars** `FRONTEND_HOST/PORT`, `BACKEND_HOST/PORT` — parametrizam o Caddyfile (hosts viram `localhost` em dev, `*.internal` em prod).

## Caddyfile — exemplo canonico

`infra/docker/caddy/Caddyfile` (template em `templates/Caddyfile`):

```caddyfile
:{$PUBLIC_PORT} {
    # API do backend (REST + SSE)
    handle /api/v1/* {
        reverse_proxy {$BACKEND_HOST}:{$BACKEND_PORT}
    }

    # Healthcheck do backend
    handle /health {
        reverse_proxy {$BACKEND_HOST}:{$BACKEND_PORT}
    }

    # Frontend (SPA sob /app)
    handle /app/* {
        reverse_proxy {$FRONTEND_HOST}:{$FRONTEND_PORT}
    }

    # /app sem barra → redireciona pra /app/  (parser quirk: matcher * explicito)
    handle /app {
        redir * /app/ permanent
    }

    # Raiz → /app/
    handle / {
        redir * /app/ permanent
    }
}
```

Ver `references/gotchas.md` pra armadilhas nao-obvias (parser `redir`, matchers, etc).

## Adicionar um servico novo

Passo a passo:

1. **No `docker-compose.yml`**: adicione o service (ex: `docs`), com `networks: internal: aliases: [docs.internal]`.
2. **No Caddyfile**: adicione o `handle` correspondente. Ex:
   ```caddyfile
   handle /docs/* {
       reverse_proxy docs.internal:3000
   }
   ```
3. **No `.env.example`**: adicione vars relevantes (`DOCS_PORT`, `DOCS_HOST`, etc).
4. **Reload**: `docker compose restart caddy` (ou `caddy reload` se souber o path do binario no container).

Zero mudanca em infra compartilhada (nginx do host, etc). Nome do dominio publico continua o mesmo.

## Integracao com proxy reverso externo

Quando o projeto vai pra um host que tem um **proxy reverso compartilhado** (ex: nginx-proxy externo que fronteia varios apps no mesmo servidor), o Caddy do projeto precisa virar acessivel na rede do proxy externo.

**Padrao**: conectar o Caddy numa **segunda rede externa** no `docker-compose.yml` do projeto:

```yaml
# docker-compose.yml (prod/staging, nao platform.yml)
services:
  caddy:
    networks:
      - web_network        # adicional; platform.yml ja tem `internal`

networks:
  web_network:
    external: true
```

Resultado: Caddy fica em **2 redes**:
- `internal` — fala com frontend/backend/workers do proprio projeto
- `web_network` — fica visivel pro proxy reverso externo

**Como o proxy externo alcanca o Caddy**:
- Pelo **nome do container**. Com `name: ${PROJECT}-${ENVIRONMENT}` no compose, o container vira `<projeto>-<env>-caddy-1` — unico e previsivel.
- Vhost do proxy externo faz: `proxy_pass http://<projeto>-<env>-caddy-1:<PUBLIC_PORT>`.
- **Sem necessidade de alias customizado** — o nome do container ja e unico por design.

**Nao ativar `web_network` em dev**: em dev (via `platform:up`), `platform.yml` nao declara `web_network`, e o Caddy so fica em `internal`. Sem proxy externo, sem precisar.

## Referencia cruzada

- **Composicao / scripts / estrutura infra/** — skill `nic-dockerization`
- **Estrutura do `.env` que parametriza o Caddy** — skill `nic-env-pattern`
- **Deploy na infra Processa (integracao com nginx-proxy compartilhado)** — skill `nic-onboarding`

## Estrutura desta skill

```
caddy/
├── SKILL.md
├── templates/
│   └── Caddyfile            (exemplo canonico pra app SPA + API)
└── references/
    └── gotchas.md           (parser ambiguity, matchers, bind-mount stale)
```
