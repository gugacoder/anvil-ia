---
name: nic-dockerization
description: "Padrao de dockerizacao de projetos multi-servico: 2 camadas compose (platform + app), scripts npm 'docker:*' (staging/prod) e 'platform:*' (dev), estrutura /infra, convencoes de rede/volumes. Use quando for configurar Docker num projeto novo, reorganizar compose files, criar scripts de npm pra operar containers, ou entender o modelo dev-vs-staging/prod do stack. Tambem use quando o usuario mencionar: 'setup docker no projeto', 'estrutura infra/', 'docker-compose platform', 'dev-ports', 'platform.mjs', 'npm run docker:', 'npm run platform:'."
---

# Dockerization — fundacao Docker de projetos multi-servico

Padrao reutilizavel pra projetos multi-servico em Docker. Define **como o projeto e dockerizado** antes de qualquer decisao de deploy.

## Princípios

1. **Todo projeto e uma composicao de servicos** (frontend, backend, workers, etc).
2. **Compose files com papeis claros**: `platform` (infra shared) + `dev-ports` (overlay dev) + `docker-compose.yml` (staging/prod completo).
3. **2 modos de operar**: dev (platform containerizada + apps no host) vs staging/prod (tudo em container via `docker-compose.yml`).
4. **Scripts npm** pra esconder `docker compose -f ...` verbose do dia-a-dia.
5. **Convencoes de rede** (`.internal` aliases) desacoplam os servicos dos hostnames.

## Arquivos do projeto

```
<projeto>/
├── package.json                                   # scripts platform:* e docker:*
├── .env                                           # runtime, gitignored
├── .env.example                                   # template publico
└── infra/
    ├── docker-compose.yml                         # staging/prod: tudo (apps + include platform + Traefik)
    ├── docker-compose.platform.yml                # infra shared (caddy, postgres, redis)
    ├── docker-compose.platform.dev-ports.yml      # overlay dev: expoe portas pro host
    └── scripts/
        └── platform.mjs                           # wrapper de platform:* (opcional)
```

### Papel de cada compose file

| Arquivo | Contem | Usado em |
|---------|--------|----------|
| `docker-compose.platform.yml` | **Servicos de infra** (postgres, redis, caddy se houver). So rede interna. | dev (sempre) — e tambem importado pelo `docker-compose.yml` |
| `docker-compose.platform.dev-ports.yml` | **Overlay dev**: adiciona `ports:` de infra pro host (5432, 6379 etc). | dev |
| `docker-compose.yml` | **Pacote completo de staging/prod**: `include:` da platform + servicos do app + labels Traefik + `codr-net`. Pronto pra ir pra VPS. | staging + prod |

`docker-compose.yml` e **autocontido** pra deploy: incluir a platform + descrever os apps + ja carregar tudo que a VPS precisa (Traefik labels, `codr-net`, `pull_policy: always`). Em dev ele fica de fora — quem orquestra dev e a dupla `platform.yml + dev-ports.yml`.

## Os 2 modos de operacao

### Dev — infra containerizada, apps no host

```bash
npm run platform:up      # sobe caddy + postgres + redis (com portas expostas via overlay)
npm run dev              # roda frontend + backend direto via tsx/vite (hot-reload)
```

Compose files carregados: `platform.yml + dev-ports.yml`.
Apps rodam no host pra ter HMR, breakpoints e iteracao rapida.

### Staging/Prod — tudo em Docker

```bash
npm run docker:up        # sobe tudo: platform (postgres/redis/caddy) + apps + Traefik labels
```

Compose file carregado: **so** `docker-compose.yml` (que faz `include: docker-compose.platform.yml`).
Apps rodam em container, vindo da imagem (`image:`) — ou buildados local em ambientes self-hosted.

## Scripts do `package.json`

Adicione estes scripts:

```json
{
  "scripts": {
    "platform:up": "node infra/scripts/platform.mjs up -d",
    "platform:down": "node infra/scripts/platform.mjs down",
    "platform:ps": "node infra/scripts/platform.mjs ps",
    "platform:logs": "node infra/scripts/platform.mjs logs -f",
    "docker:up": "dotenv -- docker compose -f infra/docker-compose.platform.yml -f infra/docker-compose.yml up -d",
    "docker:pull": "dotenv -- docker compose -f infra/docker-compose.platform.yml -f infra/docker-compose.yml pull",
    "docker:down": "dotenv -- docker compose -f infra/docker-compose.platform.yml -f infra/docker-compose.yml down",
    "docker:ps": "dotenv -- docker compose -f infra/docker-compose.platform.yml -f infra/docker-compose.yml ps",
    "docker:logs": "dotenv -- docker compose -f infra/docker-compose.platform.yml -f infra/docker-compose.yml logs -f"
  }
}
```

- `platform:*` — combina `platform.yml + dev-ports.yml`. Em projetos novos prefira **`dotenv -- docker compose -f ... -f ... up -d`** direto (mais simples, depende só do `dotenv-cli`). O wrapper `platform.mjs` continua disponível como alternativa quando o `dotenv-cli` não pode ser instalado.
- `docker:*` — combina **`platform.yml + docker-compose.yml`** (NÃO só `docker-compose.yml`). A infra precisa subir junto com as apps em prod; se você omitir `-f platform.yml`, sobem apps sem postgres/redis/caddy e o stack quebra silenciosamente.

## Padrao image + build

**Servicos de app** no `docker-compose.yml` declaram ambos `image:` e `build:`. A imagem fica **completamente hardcoded** no compose (atrelada ao repo do GitHub e a tag `:latest`):

```yaml
services:
  backend:
    image: ghcr.io/<org>/<repo>/backend:latest
    build:
      context: ..
      dockerfile: Dockerfile
      target: production
    pull_policy: always
```

Comportamento:
- `docker compose pull` → puxa `:latest` do registry.
- `docker compose up` (sem `--build`) → usa a imagem ja em cache local; com `pull_policy: always` checa update no registry.
- `docker compose up --build` → builda a partir do `build:` local (util em ambientes self-hosted sem acesso ao registry).
- **CI builda + pusha**; servidor compartilhado **puxa**.

O caminho da imagem fica definido **so** em dois lugares (zero parametros no `.env`):
- `infra/docker-compose.yml` — `image: ghcr.io/<org>/<repo>/<servico>:latest`
- `.github/workflows/build.yml` — `IMAGE_PREFIX: ghcr.io/<org>/<repo>`

Em rollback (raro), aponta-se um servico pra uma tag `:release-N` editando temporariamente o `image:` no `docker-compose.yml` da VPS — as imagens versionadas ficam todas no ghcr.io.

Mesmo `docker-compose.yml`, comportamentos diferentes conforme o flag — sem precisar de arquivos separados pra cada cenario.

### Em producao na VPS: pull-only

Em servidores compartilhados (VPS KeepCoding e similares), o fluxo e: `docker compose pull && docker compose up -d`. Razoes:
- VPS nao tem fontes nem toolchain (Node, Vite, etc).
- A imagem do CI ja foi testada — deploy reproduz exatamente isso.
- Recursos da VPS ficam livres pros stacks rodarem.

`pull_policy: always` no compose ajuda: `docker compose up -d` sozinho ja garante imagem atualizada sem precisar de comando extra.

## CI: build + publish em ghcr.io

CI publica as imagens em **GitHub Container Registry (ghcr.io)**, com tags por branch/tag git:

| Branch / Tag git | Tag Docker |
|---|---|
| `develop` | `:staging` |
| `main` | `:latest` |
| `release-N` | `:release-N` + `:latest` |

Workflow base (`.github/workflows/build.yml`):

```yaml
name: Build & Publish
on:
  push:
    branches: [develop, main]
    tags: ['release-*']

env:
  REGISTRY: ghcr.io
  IMAGE_PREFIX: ghcr.io/<org>/<repo>

jobs:
  build:
    runs-on: ubuntu-latest
    permissions:
      contents: read
      packages: write
    strategy:
      matrix:
        service:
          - { name: backend, dockerfile: apps/backend/Dockerfile }
          - { name: frontend, dockerfile: apps/frontend/Dockerfile }
    steps:
      - uses: actions/checkout@v4
      - uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}
      - id: tags
        run: |
          IMAGE="${{ env.IMAGE_PREFIX }}/${{ matrix.service.name }}"
          if [[ "${{ github.ref }}" == refs/tags/release-* ]]; then
            echo "tags=${IMAGE}:${{ github.ref_name }},${IMAGE}:latest" >> "$GITHUB_OUTPUT"
          elif [[ "${{ github.ref }}" == refs/heads/main ]]; then
            echo "tags=${IMAGE}:latest" >> "$GITHUB_OUTPUT"
          elif [[ "${{ github.ref }}" == refs/heads/develop ]]; then
            echo "tags=${IMAGE}:staging" >> "$GITHUB_OUTPUT"
          fi
      - uses: docker/build-push-action@v6
        with:
          context: .
          file: ${{ matrix.service.dockerfile }}
          push: true
          tags: ${{ steps.tags.outputs.tags }}
```

No `infra/docker-compose.yml` o `image:` ja referencia `ghcr.io/<org>/<repo>/<servico>:latest` direto — o `.env` nao precisa de variaveis pra imagem.

## Convencoes de rede

### Rede `internal` (bridge)

Servicos de infra (no `platform.yml`) e app (no `docker-compose.yml`) ficam todos em `internal`. Comunicam por **aliases `.internal`**:

```yaml
caddy:
  networks:
    internal:
      aliases: [caddy.internal]
postgres:
  networks:
    internal:
      aliases: [postgres.internal]
```

Backend refere `postgres.internal:5432`, em vez do nome bruto `postgres:5432`. O alias `.internal` deixa explicito que e servico interno da rede Docker e fica estavel mesmo se o nome do servico mudar.

### Servico publico do stack

Um stack publica **uma unica porta** pra fora (a entrada do Traefik global). Quem recebe as labels Traefik + entra na `codr-net` depende da forma do projeto:

| Forma | Quem recebe os labels Traefik | Onde fica |
|---|---|---|
| **Single-app** (so um servico publico — backend ou frontend, com uma porta publica) | O proprio servico de app | `docker-compose.yml` |
| **Multi-app** (frontend + backend + ... — varias rotas/portas internas atras de uma so URL) | O Caddy embarcado (proxy reverso interno) | `docker-compose.platform.yml` (compartilhado dev/staging/prod) — opcionalmente movido pra `docker-compose.yml` se for mais conveniente |

Em ambos os casos a porta interna que o Traefik aponta vem de **`PUBLIC_PORT`** e o dominio publico vem de **`PUBLIC_DOMAIN`**.

#### Single-app — labels no proprio servico (no `docker-compose.yml`)

```yaml
# infra/docker-compose.yml
services:
  backend:
    image: ghcr.io/<org>/<repo>/backend:latest
    pull_policy: always
    networks:
      internal:
        aliases: [backend.internal]
      codr-net:
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=codr-net"
      - "traefik.http.routers.${PROJECT}-${ENVIRONMENT}.rule=Host(`${PUBLIC_DOMAIN}`)"
      - "traefik.http.routers.${PROJECT}-${ENVIRONMENT}.entrypoints=websecure"
      - "traefik.http.routers.${PROJECT}-${ENVIRONMENT}.tls.certresolver=letsencrypt"
      - "traefik.http.services.${PROJECT}-${ENVIRONMENT}.loadbalancer.server.port=${PUBLIC_PORT}"

networks:
  internal:
    driver: bridge
  codr-net:
    external: true     # gerenciada pelo Traefik global da VPS
```

#### Multi-app — labels no Caddy embarcado (no `platform.yml`)

```yaml
# infra/docker-compose.platform.yml
services:
  caddy:
    image: caddy:alpine
    networks:
      internal:
        aliases: [caddy.internal]
      codr-net:
    labels:
      - "traefik.enable=true"
      - "traefik.docker.network=codr-net"
      - "traefik.http.routers.${PROJECT}-${ENVIRONMENT}.rule=Host(`${PUBLIC_DOMAIN}`)"
      - "traefik.http.routers.${PROJECT}-${ENVIRONMENT}.entrypoints=websecure"
      - "traefik.http.routers.${PROJECT}-${ENVIRONMENT}.tls.certresolver=letsencrypt"
      - "traefik.http.services.${PROJECT}-${ENVIRONMENT}.loadbalancer.server.port=${PUBLIC_PORT}"

networks:
  internal:
    driver: bridge
  codr-net:
    external: true
```

`PUBLIC_PORT` aqui e a porta interna que o Caddy escuta (geralmente 80). O Caddy faz o roteamento interno por path/host pra cada app na rede `internal`.

Caddy normalmente vive em `platform.yml` pra atender dev, staging e prod com o mesmo Caddyfile. Se em algum projeto for mais conveniente que ele exista so em staging/prod, ele pode ser movido pra `docker-compose.yml` — a posicao das labels acompanha o servico onde quer que ele esteja.

#### Self-hosted (sem Traefik)

Em ambientes onde Traefik global nao existe, o servico publico (backend ou Caddy) abre `${PUBLIC_PORT}` diretamente:

```yaml
services:
  backend:                         # ou caddy
    ports:
      - "${PUBLIC_PORT}:${PUBLIC_PORT}"
```

Os dois cenarios coexistem no mesmo arquivo: as labels Traefik ficam inertes em self-hosted (sem Traefik que as leia), e a `codr-net` so e referenciada quando a rede ja existe no host. A skill `/deploy` cobre os detalhes de provisao na VPS.

## Volumes

Dados persistentes ficam em `../data/<servico>/` (relativo ao compose), mapeado pro path padrao do container:

```yaml
postgres:
  volumes:
    - ../data/postgres:/var/lib/postgresql/data
redis:
  volumes:
    - ../data/redis:/var/lib/redis/data
```

`infra/data/` vai no `.gitignore`. Backup = tar dessa pasta (ou solucao de backup do projeto).

## Nome do projeto no Docker

```yaml
name: ${PROJECT}-${ENVIRONMENT}
```

No topo de `docker-compose.yml` e `docker-compose.platform.yml`. Isso cria containers com nomes previsiveis:

```
<projeto>-production-frontend-1
<projeto>-production-backend-1
<projeto>-staging-backend-1
```

Util pra:
- Traefik referenciar container por nome
- Isolamento de ambientes no mesmo host
- Logs/ps legiveis

### Variavel `PROJECT` (obrigatoria)

`PROJECT` precisa estar no `.env` antes de qualquer `docker compose ...`. Sem ela o nome dos containers fica indefinido e pode colidir com outros stacks no mesmo host (especialmente em VPS compartilhada).

**Antes de subir o stack, valide a presenca de `PROJECT` no `.env`. Se faltar, use o campo `name` do `package.json` como valor padrao e adicione ao `.env`. Se o `package.json` nao existir ou nao tiver `name`, pergunte ao humano.**

Mesma regra vale pra `ENVIRONMENT` (`development` / `staging` / `production`) — sem ela o nome do projeto Docker fica incompleto. `ENVIRONMENT` nao tem fonte canonica como o `name` do `package.json`, entao quando faltar, pergunte ao humano qual ambiente este `.env` representa.

## Como aplicar a um projeto novo

1. Copie templates:
   - `templates/docker-compose.yml` → `infra/docker-compose.yml`
   - `templates/docker-compose.platform.yml` → `infra/docker-compose.platform.yml`
   - `templates/docker-compose.platform.dev-ports.yml` → `infra/docker-compose.platform.dev-ports.yml`
   - `templates/platform.mjs` → `infra/scripts/platform.mjs`
2. Adicione o bloco de scripts do `package-scripts.json` no seu `package.json`.
3. Adicione `dotenv-cli` se quiser `dotenv -- ...` no PATH (ou passe `--env-file .env` direto pro `docker compose`).
4. Substitua `<projeto>` pelos valores reais.
5. Configure secrets via dotenvx (skill `enc-encryption`): `.env.{development,staging,production}` encriptados na raiz, `.env.keys` so local.
6. Adicione ao `.gitignore`: `data/`, `.env`, `.env.keys`.

## Gotchas

### Caddy em container, apps no host (modo dev): `host.docker.internal`

Quando o Caddy roda em container e proxya pra apps rodando **no host** (modo dev), o Caddy **não consegue** resolver `localhost` — dentro do container, `localhost` é o próprio container. Sintoma: `502 Bad Gateway` em todas as rotas.

Solução, em **dois lugares**:

1. No `docker-compose.platform.yml`, adicione `extra_hosts` no service `caddy`:
   ```yaml
   caddy:
     extra_hosts:
       - "host.docker.internal:host-gateway"
   ```

2. No `.env`, na seção DEV OVERRIDES, setar os hosts que o Caddy lê pra `host.docker.internal` (NÃO `localhost`):
   ```env
   # DEV OVERRIDES
   API_HOST=host.docker.internal
   WEB_HOST=host.docker.internal
   # Redis vive em container; apps no host falam com ele via localhost
   REDIS_HOST=localhost
   ```

Apps no host continuam usando `localhost` nos seus próprios bindings — essas vars existem só pro Caddy. Em prod (com apps containerizadas) os defaults `*.internal` valem e essa complicação some.

### `container_name` estável causa colisão em re-up

Compose com `container_name: ${PROJECT}-redis` (ou similar) deixa o container com nome estável — bom pra logs/ps, mas se um deploy anterior (ou skill antiga) criou container com o mesmo nome em outro escopo Compose, `up` falha com `Conflict. The container name "/<projeto>-redis" is already in use`.

Sintoma: `Error response from daemon: Conflict...` no `platform:up`.

Resolução: `docker rm -f <nome-do-container>` e re-`up`. Pra prevenir em transições de schema (renomear projeto, mudar de skill antiga pra nova), faça `docker compose down` da versão antiga antes de aplicar a nova.

### Re-up com volumes que mudaram de driver/options

Se você muda config de volume entre versões (ex: adiciona `driver_opts`), o `up` pode falhar reclamando que o volume existente "tem configuração diferente". Remova o volume com `docker volume rm <nome>` (perde dados) ou ajuste a config pra coincidir com o existente.

## Referencias cruzadas

- **Conteudo do Caddyfile + justificativa de Caddy interno**: skill `nic-caddy`.
- **Estrutura do `.env`** (2 camadas: defaults Docker + DEV OVERRIDES): skill `nic-env-pattern`.
- **Deploy na VPS KeepCoding** (env templates, CI workflow, ops): skill `/deploy`.

## Estrutura desta skill

```
dockerization/
├── SKILL.md
├── templates/
│   ├── docker-compose.yml
│   ├── docker-compose.platform.yml
│   ├── docker-compose.platform.dev-ports.yml
│   ├── platform.mjs
│   └── package-scripts.json         (snippet pra colar no package.json)
└── references/
    └── 3-modos-de-operacao.md       (explicacao longa do dev vs staging vs prod)
```
