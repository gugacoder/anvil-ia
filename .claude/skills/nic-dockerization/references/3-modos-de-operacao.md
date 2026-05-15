# 3 modos de operacao — dev / staging / prod

Referencia expandida da secao "Os 2 modos de operacao" da SKILL.md. Explica variantes e casos-limite.

## Modo 1 — Dev (iteracao rapida)

**Objetivo**: desenvolver com hot-reload, breakpoints, sem precisar rebuildar imagens.

**Comando**: `npm run platform:up` + `npm run dev`.

**O que sobe em container**:
- `caddy` — proxy reverso (mesmo em dev, resolve rotas uniformemente)
- `postgres` — banco de dados
- `redis` — cache

**O que NAO sobe em container**:
- `frontend`, `backend`, `workers` — rodam no host via `tsx watch` (backend) ou `vite dev` (frontend).

**Como apps locais falam com infra**:
- Via `localhost:${POSTGRES_PORT}` etc — as portas expostas pelo `dev-ports.yml` overlay.
- A config do `.env` (ver skill `env-pattern`) tem secao `DEV OVERRIDES` no final que sobrescreve `POSTGRES_HOST=postgres.internal` por `POSTGRES_HOST=localhost`.

**Como Caddy em dev enxerga os apps locais**:
- Caddy **no container** precisa chegar no backend que roda **no host**. Usa `host.docker.internal` (Mac/Windows) ou a IP do host (Linux). O `.env` DEV OVERRIDES ajusta `PROXY_BACKEND_HOST=host.docker.internal`.

## Modo 2 — Staging (tudo em container)

**Objetivo**: rodar a stack inteira localmente ou em servidor de staging, com imagens buildadas no CI.

**Comando**: `npm run docker:up` (equivalente a `docker compose -f infra/docker-compose.yml up -d`).

**O que sobe em container**:
- Tudo que esta em `platform.yml` (caddy, postgres, redis)
- Tudo que esta em `docker-compose.yml` (frontend, backend, workers)

**Rede**: todos containers na `internal`. Apps se falam via `.internal` aliases. Nenhuma porta de infra exposta pro host (sem `dev-ports.yml`).

**Build vs pull**:
- Se `IMAGE_REGISTRY/*:IMAGE_TAG` existe no registry, puxa
- Se nao existe, builda localmente (fallback natural do compose com `image:` + `build:`)

## Modo 3 — Prod (ia-web ou outro host)

**Objetivo**: idem staging, mas no host de producao.

**Comando**: mesma coisa — `docker compose -f infra/docker-compose.yml up -d` (ou via skill `processa-deploy` em Processa).

**Diferencas vs staging**:
- Valores de `.env` (dominio real, secrets reais, banco persistente)
- Caddy geralmente conectado a uma rede externa (ex: `web_network` da Processa) pra integrar com proxy compartilhado. Ver skill `reverse-proxy`.
- Monitoramento, backup, logs rotacionados (depende do host)

**Fluxo tipico**:
1. CI builda + pusha imagem pro registry
2. Servidor pulla: `docker compose pull`
3. Servidor sobe: `docker compose up -d`

## Por que `dev-ports.yml` e separado?

Sem essa separacao, teriamos que escolher entre:
- **Sempre expor portas** → inseguro em prod (postgres acessivel do LAN)
- **Nunca expor** → chato em dev (nao da pra usar pgAdmin/redis-cli local)

Com o overlay:
- Dev carrega `platform.yml + dev-ports.yml` → tudo exposto
- Staging/prod carrega so `platform.yml` (via include no `docker-compose.yml`) → zero portas extras

## Variantes comuns

### App sem frontend (backend-only API)
Remova o service `frontend` do `docker-compose.yml`. Caddy roteia tudo pra backend.

### App com multiplos backends/workers
Adicione services no `docker-compose.yml`. Caddyfile roteia por path. Ver skill `reverse-proxy`.

### App que precisa de MongoDB, Meilisearch, etc
Adicione no `platform.yml` seguindo o mesmo padrao (alias `.internal`, volume em `../data/`, sem `ports:` no host; dev-ports overlay se precisar).

### Staging usando docker-compose.yml mas puxando registry separado
Variaveis `IMAGE_REGISTRY` e `IMAGE_TAG` no `.env` — simplesmente aponte pra registry de staging. Mesmo arquivo, comportamento diferente via env.
