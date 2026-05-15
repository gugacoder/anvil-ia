# Arquitetura — Processa Deploy

## Hosts e papeis

| Host | IP interno | Papel | Quem mantem |
|------|-----------|-------|-------------|
| `gitlab.processa.info` | `172.27.0.194` | GitLab (HTTP, nao HTTPS); Container Registry interno (`:5001` quebrado — nao usar) e Dependency Proxy (`:80`) | infra Processa |
| `ia-web` | `172.27.0.50` | Servidor de publicacao; pasta `/projetos/<app>/`; tambem hosts nginx local + Authelia (outros apps) | infra Processa, NIC opera apps |
| `dc1.processa.com` | `172.27.0.2` | Active Directory (LDAP em `:389`, LDAPS em `:636`); tambem DNS interno | infra Processa |
| Maquina do `runner-docker-01` | desconhecido | Executa jobs de CI; tem `/var/run/docker.sock` montada nos jobs; alcanca internet (registry.gitlab.com) e rede interna Processa | dono do runner (verificar via API) |
| Apache externo | desconhecido | Reverse proxy publico que vai expor o app; cria vhosts e gerencia SSL | infra Processa (a coordenar) |

## Convencoes de rede

- **Subnet interna**: `172.27.0.0/16`
- **DNS interno**: `172.27.0.2` (resolve `*.processa.info` e `*.processa.com` para IPs internos)
- **DNS publico de `*.processa.info`**: aponta para IPs publicos que **so atendem requisicoes vindas de dentro** (filtro SNI no proxy frontal). Nunca chegue por DNS publico de fora.
- **VPN dev**: a VPN "Processa" pusha `8.8.8.8` como DNS — bug que faz `*.processa.info` ir pro IP publico errado. Workarounds: editar `hosts` file local OR `curl --resolve` OR `nslookup ... 172.27.0.2`. **Irrelevante em prod** (runner e ia-web usam DNS interno corretamente).

## Convencao em `/projetos`

Cada app vive em sua propria pasta sob `/projetos/<app>/`. Padrao observado nos apps existentes:

```
/projetos/<app>/
  .env                          # config de prod (gitignored)
  docker-compose.yml ou similar
  infra/                        # se monorepo
    docker-compose.platform.yml
    docker-compose.yml
    docker/
      caddy/Caddyfile           # outer caddy
      frontend/Caddyfile        # inner caddy (frontend image)
  apps/
    frontend/...
    backend/...
  packages/...
  .git/
```

Owner default da pasta `/projetos`: `ti:ti`. A pasta do nosso app deve ser owned por `suporte:suporte` (ajustar com `chown` no bootstrap).

## Stack rodando por app

```
+------------------------------------------+
|  Apache externo (outra maquina)          |
|  vhost: <app>.processa.info              |
|  proxy: http://172.27.0.50:<PUBLIC_PORT> |
+------------------+-----------------------+
                   |
                   v  (HTTP plano interno)
+------------------------------------------+
|  ia-web 172.27.0.50  /projetos/<app>/    |
|                                          |
|  +--------------------------------+      |
|  |  Caddy externo (PUBLIC_PORT)   |      |
|  |  rotas:                        |      |
|  |    /api/v1/*  -> backend       |      |
|  |    /health    -> backend       |      |
|  |    /app/*     -> frontend      |      |
|  |    /, /app    -> redir /app/   |      |
|  +-----------+-------------+------+      |
|              |             |             |
|              v             v             |
|  +-----------+--+      +---+----------+  |
|  | frontend     |      | backend      |  |
|  | (Caddy serve |      | (Node + Hono |  |
|  |  Vite dist)  |      |  /Express)   |  |
|  | :FRONTEND    |      | :BACKEND     |  |
|  +--------------+      +-+----+-------+  |
|                          |    |          |
|                +---------v-+ +v--------+ |
|                | postgres  | | redis   | |
|                | (interno) | | (int.)  | |
|                +-----------+ +---------+ |
+------------------------------------------+
```

Todos containers do app rodam na docker network `internal` (bridge isolada por app).

## Runner

`runner-docker-01` (id 36 no GitLab Processa):

- **Tipo**: `project_type`, `locked: true`, vinculado **apenas** ao projeto onde foi registrado
- **Tags**: `docker, compose, build` — `run_untagged: false` (jobs sem tags sao ignorados)
- **Executor**: `docker` (Docker executor com `image:` por job)
- **Critico**: `/var/run/docker.sock` do host esta montada nos containers de job — permite `docker build` direto sem DinD nem `privileged=true`
- **Limitacao**: DinD (`docker:dind` service) NAO funciona — runner nao tem `privileged=true`, services DinD nao conseguem iniciar daemon

Quando precisar usar runner em outro projeto: pedir ao dono pra vincular, OU promover a group runner.

## CI Variables — herdadas do GitLab group NIC

Setadas UMA vez pelo admin (via `setup-group-vars.sh`); herdadas por todos projetos do grupo:

| Var | Tipo | Conteudo |
|-----|------|----------|
| `DOCKER_REGISTRY_URL` | env_var | URL do registry de deploy |
| `DOCKER_REGISTRY_USER` | env_var | usuario do registry |
| `DOCKER_REGISTRY_PASSWORD` | env_var (masked) | senha do registry |
| `SSH_DEPLOY_KEY` | **file** | chave privada CI → ia-web |
| `VPS_IAWEB_HOST` | env_var | IP do ia-web |
| `VPS_IAWEB_USER` | env_var | usuario SSH (`suporte`) |
| `VPS_IAWEB_PASS` | env_var (masked) | senha do `suporte` (so pra ops sudo do bootstrap) |
| `VPS_IAWEB_DEPLOY_FOLDER` | env_var | `/projetos` |

Pra trocar registry: editar 3 vars do grupo. Sem alterar codigo. Detalhes em `changing-the-registry.md`.

## CI Variables locais (cada dev)

Apenas o PAT pessoal e a URL do GitLab vivem no `.env` do projeto (gitignored):

```env
GITLAB_ACCESS_TOKEN=glpat-...        # PAT pessoal
GITLAB_URL=http://gitlab.processa.info
```

Scripts da skill sourceiam o `.env`. CI **nao** usa essas vars (sao so pra tooling local).

## Pipeline em duas fases

**Stage `build`** (no runner):

1. Login no registry com `$DOCKER_REGISTRY_*` (vars do group)
2. `docker build -f apps/frontend/Dockerfile -t <img>:<tag> .`
3. `docker push`
4. Idem para backend
5. Tags: `<branch>-<sha-curto>` + `<branch>-latest`

**Stage `deploy`** (alpine + ssh-client):

1. Normaliza `SSH_DEPLOY_KEY` (tira CRLF, garante newline final)
2. `ssh-keyscan` adiciona `$VPS_IAWEB_HOST` em known_hosts
3. SSH no `$VPS_IAWEB_USER@$VPS_IAWEB_HOST` com `IdentitiesOnly=yes`
4. No servidor:
   - `git fetch + reset --hard origin/<branch>`
   - `docker compose -f infra/docker-compose.yml --env-file .env pull`
   - `docker compose ... up -d`
   - `docker compose ... restart caddy` (resolve bind-mount stale)

## Integracao Apache — quando a infra Processa criar o vhost

O Apache externo (em outra maquina) sera quem acessa `<app>.processa.info` da internet/rede. Nosso job:

1. Confirmar `PUBLIC_PORT` final (8080 default; pode coordenar outro)
2. Documentar pra infra:
   - **Hostname publico**: `<app>.processa.info`
   - **Backend interno**: `172.27.0.50:<PUBLIC_PORT>`
   - **Health check**: `GET /health` retorna 200 OK
3. Decidir Authelia: se vai integrar (forward auth headers? OIDC?). Apps existentes usam grupo LDAP especifico; backend leria header `Remote-User` etc. Coordenar com infra.

Sem essa integracao, o app so e acessivel **de dentro do servidor** via `curl http://localhost:<PUBLIC_PORT>/`. Util pra smoke test, mas nao pra usuarios.

## Decisoes-chave do design (porque assim)

1. **Branch dedicada (`<env>`) em repo compartilhado** — runner project-locked nao precisa de mudanca; multiplos ambientes podem coexistir; CI rules filtram por branch.
2. **`docker.sock` do host (nao DinD)** — runner nao tem `privileged=true`; usar sock evita pedir mudanca a outras equipes.
3. **Tudo compartilhado em GitLab group var** — registry creds, deploy SSH key, senha do servidor: vivem em UM lugar so. Trocar = editar group var, sem mexer em codigo.
4. **PAT pessoal no `.env` do projeto** — cada dev gerencia seu PAT (GitLab Profile → Access Tokens). Nao compartilhamos. Override de URL via `GITLAB_URL` permite contornar problemas de DNS.
5. **Compose prod separado de dev** — base usa `build:` (devs locais), prod usa `image:` do registry (servidor so puxa).
6. **Caddy interno por stack** — convencao da casa; Apache externo so faz proxy reverso plano pra `:PUBLIC_PORT`.
7. **SSH chave dedicada de deploy** (separada da chave pessoal do operador) — facilita rotacao, escopo limitado ao runner.
