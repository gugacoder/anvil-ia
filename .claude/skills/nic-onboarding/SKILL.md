---
name: nic-onboarding
description: "Onboarding ONE-TIME de um projeto novo no servidor interno da Processa Sistemas (ia-web, 172.27.0.50, pasta /projetos/<app>/), atras da nginx-proxy compartilhada com Authelia (LDAP) como SSO. Cobre o trabalho que acontece UMA vez na vida do projeto: setup do GitLab NIC group (admin), bootstrap do /projetos/<app>/ (lead, via bootstrap-project.sh), cert SSL Let's Encrypt + nginx vhost (lead, via setup-edge.sh com container-as-root bypass), regra Authelia (admin), e estabelecimento do pipeline CI. Depois disso, deploy recorrente eh so 'git push'. Use sempre que o usuario mencionar: 'publicar pela primeira vez na Processa', 'onboardar app na Processa', 'subir app novo no ia-web', '/projetos/', 'nic.processa.info' (ou qualquer *.processa.info), 'Authelia', 'gitlab.processa.info', 'nginx-proxy', 'runner-docker-01', 'bootstrap do projeto na Processa', ou qualquer variante de primeiro deploy / setup inicial na Processa."
---

# Processa Onboarding

Camada de deploy **especifica da Processa**, em cima das convencoes genericas. Esta skill assume que voce ja tem um projeto seguindo:

- **`dockerization`** skill — estrutura `infra/`, 3 compose files, scripts `docker:*`/`platform:*`.
- **`nic-caddy`** skill — Caddy interno como porta publica do projeto.
- **`env-pattern`** skill — `.env` com Docker defaults + DEV OVERRIDES.

Se o projeto nao segue isso, leia aquelas skills primeiro. Aqui so cobrimos o que e **especifico da Processa** (credenciais, nginx-proxy, Authelia, GitLab interno, SSH pro ia-web).

## Topologia do alvo

```
git push branch <env>
       |
       v
GitLab CI (runner-docker-01, tags docker/compose/build)
       | build + docker push
       v
<DOCKER_REGISTRY_URL>/<projeto>/{frontend,backend}:<env>-<sha>
       | docker pull
       v
SSH suporte@172.27.0.50  (chave SSH_DEPLOY_KEY do GitLab group)
       | cd /projetos/<projeto>
       | git fetch + reset --hard origin/<env>
       | docker compose pull && up -d
       v
  <projeto>-<env>-caddy-1  (rede docker web_network)
       ^
       | proxy_pass
       |
  nginx-proxy (/projetos/proxy)
       ^
       | HTTPS + Authelia forward-auth + Let's Encrypt
       |
  Internet: https://<projeto>.processa.info
```

## Tres personas

| Persona | Frequencia | Acao | Setup local |
|---------|-----------|------|-------------|
| **Admin** | UMA vez na vida do grupo NIC | `setup-group-vars.sh` — setup compartilhado | PAT Maintainer+ no grupo |
| **Lead** | Uma vez por projeto novo | `bootstrap-project.sh` (`/projetos/<app>`) + `setup-edge.sh` (cert SSL + nginx vhost) | PAT pessoal no `.env` do projeto |
| **Admin** | Uma vez por dominio novo | Adicionar regra Authelia em `/projetos/proxy/authelia/` + restart authelia | acesso sudo no ia-web |
| **Dev** | Toda hora | `git push origin <branch>` | **Zero** — pipeline faz tudo |

## Cada segredo mora onde

| Segredo | Onde | Quem cria |
|---------|------|-----------|
| `DOCKER_REGISTRY_URL/USER/PASSWORD` | **GitLab group NIC** | admin (uma vez) |
| `SSH_DEPLOY_KEY` (file, CI→ia-web) | **GitLab group NIC** | admin |
| Pubkey de deploy no `~suporte/.ssh/authorized_keys` | ia-web | admin |
| `VPS_IAWEB_HOST/USER/PASS` + `VPS_IAWEB_DEPLOY_FOLDER` | **GitLab group NIC** | admin |
| **PAT pessoal** | `.env` do projeto local (gitignored) | cada dev |
| `GITLAB_URL` | `.env` do projeto local | cada dev |
| `JWT_SECRET`, `POSTGRES_PASSWORD`, etc | `.env` em `/projetos/<app>/` no servidor | operador no bootstrap |

**Regra**: o que o time compartilha vive no GitLab group. O que e pessoal (PAT) vive no `.env` local. Pronto.

### ⚠️ Nomes das vars: NEUTROS, NUNCA com marca de fornecedor

As vars acima tem nomes **genericos de propósito**: `DOCKER_REGISTRY_*`, `VPS_IAWEB_*`, `SSH_DEPLOY_KEY`. **Nunca** usar nome de fornecedor/empresa externa:

- ✅ `DOCKER_REGISTRY_URL/USER/PASSWORD` — neutro; valor aponta pra onde for hoje, troca amanha sem tocar codigo

**Por que**: o GitLab do cliente (Processa) e territorio do cliente. Se voce usa CODR Studio, GitHub Container Registry, Harbor self-hosted, ou o que for — isso e o **valor** da var, nao o **nome**. Dia que o registry muda (ex: cliente libera registry interno), voce troca o valor. Se o nome carregar marca antiga, vira debito tecnico perpetuo OU rename coordenado dolorido.

## Fase 0 — Pre-requisitos do projeto

Antes de qualquer coisa, o projeto precisa ter a fundacao em ordem:

- Estrutura `infra/` montada (skill `nic-dockerization`)
- Caddyfile escrito (skill `nic-caddy`)
- `.env.example` com as 3 camadas (skill `nic-env-pattern`)
- Dockerfiles pra frontend e backend (templates `Dockerfile.frontend` e `Dockerfile.backend` desta skill — sao adaptacoes Processa-aware)

## Fase 1 — Setup do GitLab group (admin, UMA vez)

```bash
bash <skill>/scripts/setup-group-vars.sh
```

Popula 8 vars no NIC group (id 470), gera deploy keypair, instala pubkey no ia-web.

Detalhes e troubleshooting: `references/architecture.md` secao "CI Variables".

## Fase 2 — Bootstrap do projeto (lead, uma vez)

```bash
bash <skill>/scripts/bootstrap-project.sh <PROJECT> <BRANCH> <GITLAB_PROJECT_PATH>
```

Operador so precisa do PAT pessoal no `.env` local. Script:

1. Fetcha as vars do group via API
2. SSH no ia-web com deploy key
3. `sudo mkdir /projetos/<PROJECT>` + `chown suporte`
4. `sudo usermod -aG docker suporte` (se precisa)
5. `git clone` do repo
6. Copia `.env.production.example` → `.env` no servidor, pre-popula `IMAGE_REGISTRY`
7. `docker login` persistente no registry

Apos isso, **operador edita `/projetos/<PROJECT>/.env` no servidor** com:
- `PUBLIC_PORT`, `FRONTEND_PORT`, `BACKEND_PORT` (portas livres no host — ver `check-prereqs.sh`)
- `JWT_SECRET` (gerar: `openssl rand -base64 32`)
- `POSTGRES_PASSWORD` (gerar: `openssl rand -base64 24`)
- Demais vars do projeto

## Fase 3 — Integracao com nginx-proxy + Authelia + Let's Encrypt

**O edge publico dos `*.processa.info` e a propria `nginx-proxy` do ia-web** (container em `/projetos/proxy/`). Nao existe Apache separado.

A fase divide em duas partes:

- **3a (lead) — cert + vhost + reload nginx-proxy.** Lead pode fazer via container-as-root bypass (sem precisar de senha sudo).
- **3b (admin) — regra Authelia.** Continua admin-only porque `configuration.yml` afeta auth de todos os dominios.

### 3a — Script automatizado: `setup-edge.sh`

```bash
bash <skill>/scripts/setup-edge.sh <PROJECT> <ENV> <PUBLIC_PORT> <DOMAIN>
# ex: bash <skill>/scripts/setup-edge.sh coletivos development 2000 processa.info
```

O script faz 4 passos em sequencia, todos via container-as-root (sem `sudo`):

1. **Bootstrap vhost** (HTTP-only, template `nginx-vhost-bootstrap.conf`) — copia pra `/projetos/proxy/nginx/conf.d/<DOMAIN>.conf` e reload nginx. Necessario pra viabilizar o ACME challenge antes do cert existir.
2. **Cert Let's Encrypt** via container `certbot/certbot`. Usa account default existente em `/etc/letsencrypt/accounts/`. Idempotente — se cert existe, pula.
3. **Copia cert** pra `/projetos/proxy/nginx/certs/live/<DOMAIN>/` (rename `privkey.pem` -> `private.key`, chmod 644/600).
4. **Vhost final** (template `nginx-vhost.conf`, HTTPS + Authelia forward-auth) substitui o bootstrap, reload nginx.

#### Tecnica: container-as-root bypass

`suporte` no ia-web **nao tem sudo NOPASSWD**, e `/projetos/proxy/` e' root:root. Em vez de pedir senha, rodamos comandos em containers Docker que montam os paths root-owned como volumes. Docker daemon roda como root, container roda como root, write no host fica como root. `suporte` so precisa de acesso ao Docker daemon (que tem via grupo `docker`).

Padrao reusavel:
```bash
# write em path root-owned
docker run --rm -v /local/file:/in:ro -v /target/dir:/out alpine cp /in /out/dest
# read de path root-owned
docker run --rm -v /target:/x:ro alpine cat /x/some-file
# exec arbitrario como root no host (via mount)
docker run --rm -v /target:/x alpine sh -c 'mkdir -p /x/sub && chmod 600 /x/file'
```

A tecnica **vale pra qualquer alteracao em `/projetos/proxy/` que nao seja `authelia/`**. Authelia continua admin porque a mudanca afeta auth de todos os outros apps.

#### Vhost: estrutura de auth

O `nginx-vhost.conf` da skill tem 4 zonas:

| Path | Auth | Justificativa |
|------|------|---------------|
| `/` (raiz) | bypass | Caddy interno redireciona `/ → /landing`. Sem bypass, usuario nunca chega na landing |
| `/landing` | bypass | Pagina publica de marketing |
| `/health` | bypass | Healthchecks externos |
| `/api/` | Authelia + fallback | 401 da Authelia cai em `@api_backend_auth` pra API key/JWT direto |
| Tudo o mais (`/hub`, `/portal`, …) | Authelia obrigatorio | Login via LDAP |

### 3b — Regra Authelia (admin-only)

```yaml
# /projetos/proxy/authelia/config/configuration.yml — bloco access_control.rules
- domain: "<DOMAIN>"
  policy: one_factor  # user+senha LDAP, sem 2FA, sem filtro de grupo
```
+ `sudo docker restart authelia`.

**Sem essa regra**: `/hub` e `/portal` retornam **403** (default policy = deny). `/` e `/landing` continuam funcionando porque sao bypass. Util pra deploys progressivos: lead sobe landing/marketing publico imediatamente, admin libera o resto depois.

### Renovacao SSL (~60 dias)

Certbot renova `/etc/letsencrypt/` automaticamente MAS NAO copia pra `/projetos/proxy/nginx/certs/`. Duas opcoes:

1. **Rerun do `setup-edge.sh`** — passos 1-2 sao no-ops se cert existe; passo 3 copia o cert novo.
2. **Deploy hook em `/etc/letsencrypt/renewal-hooks/deploy/<DOMAIN>.sh`** — requer admin pra criar o arquivo root-owned (uma vez na vida do dominio).

## Inspecao manual no servidor (SSH local)

Pra inspecionar arquivos/configs no `ia-web` durante desenvolvimento (ex: conferir vhost do nginx-proxy, ler Caddyfile remoto, debug de container), voce precisa de `ssh iaweb` funcionando localmente. **Nao peca pro humano colar output** — rode o bootstrap:

```bash
bash <skill>/scripts/setup-local-ssh.sh
```

Idempotente. Se `ssh iaweb true` ja funciona, sai na hora. Se nao, monta tudo em `~/.ssh/` (caminho padrao OpenSSH — **nao `.tmp/` do projeto**):

| Arquivo | Conteudo |
|---------|----------|
| `~/.ssh/processa_deploy_ed25519` | keypair privado (chmod 600) |
| `~/.ssh/processa_deploy_ed25519.pub` | pubkey |
| `~/.ssh/config` | bloco `Host iaweb` prepended |
| `~/.ssh/known_hosts` | host key do `ia-web` |

Fontes da chave, em ordem:

1. **SSH_DEPLOY_KEY do GitLab group NIC** (reusa chave do CI) — acionada se `.env` tem `GITLAB_ACCESS_TOKEN` + `GITLAB_URL`. Sem ceremonia.
2. **Keypair novo** gerado local — se (1) nao rolou. Pubkey precisa ser instalada em `~suporte/.ssh/authorized_keys`:
   - Automatico: se `.env` tem `VPS_IAWEB_PASS` e `sshpass` esta disponivel, script roda `ssh-copy-id`.
   - Manual: script imprime a pubkey e as 2 opcoes (dev com senha do `suporte` OU admin).

Apos o bootstrap, inspecao vira uma linha:

```bash
ssh iaweb 'ls /projetos/proxy/nginx/conf.d/ | grep -i <projeto>'
ssh iaweb 'cat /projetos/<projeto>/.env'
ssh iaweb 'docker ps --filter name=<projeto>'
```

Nada de `-F .tmp/...` ou credenciais ad-hoc.

## Inheritando um deploy em producao (investigar antes de mexer)

A skill prescreve um padrao — mas projetos reais nem sempre foram deployados seguindo ele. Quando voce encontra um `/projetos/<app>/` pre-existente no ia-web (deploy de outra pessoa, projeto legado, bootstrap feito com commit antigo), **investigar e' pre-requisito**, nao opcional. Deploy em cima de estado desconhecido quebra producao.

### Checklist de investigacao

Rode antes de qualquer `git pull` / `docker compose up -d`:

```bash
# Estado do checkout e source
ssh iaweb 'ls -la /projetos/<app>/'
ssh iaweb 'cd /projetos/<app> && git remote -v && git log --oneline -5 && git status'

# Containers rodando e de onde as imagens vieram
ssh iaweb 'docker ps --filter name=<app>- --format "table {{.Names}}\t{{.Image}}\t{{.Status}}"'
ssh iaweb 'docker images | grep -i <app>'

# Config de runtime — fonte da verdade, nao o repo
ssh iaweb 'cat /projetos/<app>/.env'
ssh iaweb 'docker exec <app>-<env>-caddy-1 cat /etc/caddy/Caddyfile 2>/dev/null'

# Vhost do edge — como o mundo chega
ssh iaweb 'cat /projetos/proxy/nginx/conf.d/<dominio>.conf'

# Redes do container — quais projetos compartilham rede
ssh iaweb 'docker network ls'
ssh iaweb 'docker network inspect <app>-<env>_internal | grep -A1 Containers'
```

### Red flags a catalogar

| Sintoma | Significa | Acao antes de mexer |
|---------|-----------|---------------------|
| `/projetos/<app>/` owned por `root:root` em vez de `suporte:suporte` | Bootstrap nunca rodou — diretorio criado manualmente; CI vai falhar com `Permission denied on .git/FETCH_HEAD` no primeiro `git fetch` | `ssh iaweb 'sudo chown -R suporte:suporte /projetos/<app>'` antes de qualquer pipeline |
| Compose na raiz, nao em `infra/` | Skill `dockerization` nao aplicada | Migrar pra `infra/` antes de novos deploys |
| Vhost com N upstreams pros containers direto | Skill `nic-caddy` nao aplicada (anti-padrao: Caddy interno ausente ou ignorado) | Plugar Caddy interno antes de adicionar servicos |
| `.env` com DEV OVERRIDES ativas (`HOST=localhost` sem `#`) em prod | Bomba-relogio (ver skill `nic-env-pattern`) | Comentar/remover antes de deploy |
| Imagens de registry inesperado (GHCR quando skill prescreve registry Processa) | Build externo (GHA, fork, manual) — repo local pode nao ser source-of-truth | Achar o source-of-truth antes de assumir que `git push` deploya |
| Compose referencia `apps/<svc>/Dockerfile` que nao existe no repo local | Imagens buildadas de outro branch/fork, ou repo local atras | Sincronizar com source-of-truth antes de migrar |
| Build foi feito de espelho/fork que diverge do upstream atual (ex: `codrstudio/agentic-backbone` GitHub vs `upstream/ab` no GitLab Processa) | Configs que o **runtime depende** (`vite.config.ts base`, args de Dockerfile, tsconfig paths) podem ter sido adicionadas no espelho e nunca voltaram pro upstream — upstream esta ATRAS do runtime | Diff HEAD do repo-que-foi-buildado vs upstream; restaurar configs "perdidas" no upstream como parte da migracao (nao e scope creep, e sync) |
| Caddy container existe mas vhost nao fala com ele | Caminho abandonado — tentativa passada sem completar | Completar o swap, nao descartar |
| Rede `shared-net` / `web_network` / outras externas | Dependencia cross-projeto (outro app NIC) | **Nao remover** achando que e lixo — descobrir membership (`docker network inspect`) |
| `git status` com arquivos modificados no deploy folder | Alguem editou `.env` ou compose manualmente | **Nao `git reset --hard`** cegamente — preservar edits |

### Principios

- **Runtime config no container e' fonte da verdade**, nao o repo. Caddyfile do container rodando tem o que realmente roteia; o `infra/docker/caddy/Caddyfile` do repo pode estar atras. Cristalize o do container no repo antes de remodelar.
- **Compose do servidor pode estar `a frente` do repo.** Pessoa que deployou adicionou service/env var direto no `/projetos/<app>/docker-compose.yml` sem commitar upstream. Preserve como descoberta.
- **Upstream pode estar ATRAS do runtime.** Se o source-of-truth oficial foi estabelecido recentemente mas a imagem em prod foi buildada de um espelho/fork antigo (ex: GitHub mirror sem sync ativo), o upstream pode estar faltando configs que a imagem viva usa. Diagnostico: build HTML do container rodando (`docker exec <app>-<env>-<svc>-1 cat /usr/share/<serve>/index.html`); compara os asset paths com o que o repo upstream geraria. Se batem, tudo certo; se divergem, upstream perdeu config. Restauracao nao e scope creep — e parte de colocar upstream em linha com o runtime.
- **Nunca teardown** (`docker compose down` com remocao de volumes) sem plano. Deploy rodando ha semanas em prod tem estado que o repo nao descreve.
- **Repo local pode nao ser o source.** Fork pessoal vs repo oficial, mirror vs upstream — confira antes de assumir.
- **Sincronize antes de evoluir.** Se descobriu que source-of-truth e' outro remote, `git fetch` dele e cria branch em cima desse estado. Nao trabalhe no estado desatualizado do seu fork.

### Quando voce pode enfim deployar

Apos investigacao completa, diff entre (estado servidor) e (estado repo pos-migracao) tem que estar:
- Visualmente revisado, linha por linha
- Sem mudancas no `.env` (a menos que intencional, ex: comentar DEV OVERRIDES)
- Sem remocao de services que estao funcionando (a menos que intencional — nesse caso, `--remove-orphans` no `docker compose up`)
- Com ordem de deploy planejada: breaking changes em sequencia que nao cause downtime. Padrao zero-downtime:
  1. Commit A: add novo service (ex: caddy em `web_network`), apps continuam onde estao
  2. Deploy A, smoke test interno
  3. Coord com admin pro swap do edge
  4. Smoke test externo
  5. Commit B: remove services antigos da configuracao obsoleta
  6. Deploy B

Variant "janela unica" (colapsa A+B num commit, 1 coord com admin): aceitavel se admin disponivel, arriscado se nao.

## Fluxo diario — deploy recorrente

```bash
git push origin <branch>
```

Pipeline:
1. **build**: `docker build` de `frontend` e `backend`; push pras tags `<branch>-<sha>` + `<branch>-latest`
2. **deploy**: SSH no ia-web → git pull → `docker compose pull && up -d` → `restart caddy`

Detalhes de CI, vars, e fluxo: `templates/gitlab-ci.yml`.

## Gotchas Processa-especificos

`references/gotchas.md` cobre:

- **`$CI_REGISTRY` built-in aponta pra `:5001` que ta fechado** (bug GitLab Omnibus); use vars do group.
- **Registry com Basic Auth (htpasswd)** nao aceita JWT do CI job — use `$DOCKER_REGISTRY_PASSWORD`.
- **`registry.processa.info` requer senha htpasswd** que nem sempre temos; `changing-the-registry.md` explica como trocar o registry por outro sem alterar codigo.
- **Chave SSH em GitLab file var perde newline / ganha CRLF** — `tr -d '\r' + printf '\n'` no before_script.
- **`suporte` nao esta no grupo `docker` por default** — `usermod -aG docker` no bootstrap.
- **`/projetos` owned por `ti:ti`** — sudo + chown pra `suporte` no bootstrap.
- **`/projetos/<app>` owned por `root:root` (bootstrap pulado)** — se o diretorio foi criado manualmente sem rodar `bootstrap-project.sh`, o owner fica `root`. O CI falha no primeiro `git fetch` com `Permission denied on .git/FETCH_HEAD`. Fix: `ssh iaweb 'sudo chown -R suporte:suporte /projetos/<app>'`.
- **Senha htpasswd com `#` (ou outros chars fora de base64-safe) nao aceita `masked=true` no GitLab** — GitLab retorna `{"message":{"value":["is invalid"]}}`. Use `masked=false`. O risco e cosmetico: quem tem acesso a UI CI/CD ve o valor, mas o log do CI continua limpo porque o CI usa `--password-stdin` (nunca imprime a senha). Opcao de longo prazo: pedir ao admin que troque a senha pra uma base64-safe e re-ativar mask.
- **DNS da VPN pusha 8.8.8.8** — workarounds em dev, irrelevante em prod.
- **Let's Encrypt first-try flaky** — retente uma vez se falhar ACME (transient).
- **Certbot renew nao sincroniza `/etc/letsencrypt/` → `/projetos/proxy/nginx/certs/`** — copia manual periodica OU criar deploy-hook.

Caddy/compose gotchas nao estao aqui — vivem em `nic-caddy` e `dockerization`.

## Registry: opcoes validas

O `gitlab-ci.yml` template desta skill e' **registry-agnostic** — os passos `docker login` / `docker push` / `docker pull` sao parametrizados por 3 group vars:

- `DOCKER_REGISTRY_URL` — host do registry (ex: `ghcr.io`, `registry.codrstudio.dev`, `registry.processa.info`, `index.docker.io`)
- `DOCKER_REGISTRY_USER` — usuario
- `DOCKER_REGISTRY_PASSWORD` — senha ou PAT (mascara como secret)

Trocar de registry = mudar 3 vars no GitLab group NIC. Zero mudanca no template ou no repo.

### Opcoes usadas em projetos NIC

| Registry | Status | Quando usar |
|----------|--------|-------------|
| `registry.processa.info` | ✅ **principal** | Registry oficial interno Processa — htpasswd disponibilizado em 2026-04-21; usar em todos os projetos novos |
| `registry.codrstudio.dev` | ⚠️ legado (CODR) | Registry pessoal do Guga; projetos migrados em 2026-04-21 — nao usar em projetos novos |
| `ghcr.io/<org>/<repo>` | ⚠️ legado (agentic-backbone pre-migracao) | Era usado via GHA num mirror GitHub; substituido por pipeline GitLab completo |
| `index.docker.io` | ⚠️ uso com cuidado | Imagens publicas (projetos open-source); rate limit pesado sem auth |

### Quando usar `gitlab-ci.deploy-only.yml` (template minoritario)

Edge case: build acontece em CI **externo ao GitLab Processa** (ex: GitHub Actions, outro GitLab self-hosted, CircleCI), e voce precisa que GitLab Processa **so deploye** a imagem ja publicada.

Armadilha observada em projeto legado (agentic-backbone, abril/2026): GHA builda snapshots mas **nao ha sync automatico** entre GitLab Processa (source-of-truth) e GitHub (mirror manual). Resultado: commits novos no GitLab nao chegam no GHA, que builda codigo estagnado — deploy-only CI acaba deployando imagens desatualizadas. **Before usar deploy-only, valide que o CI externo dispara em commits atuais do source-of-truth.** Se nao dispara, use `gitlab-ci.yml` completo (build+push+deploy interno).

## Registry atual

O NIC usa **`registry.processa.info`** (registry oficial interno Processa, migrado em 2026-04-21). Configurado em 3 vars do GitLab group NIC (`DOCKER_REGISTRY_URL/USER/PASSWORD`). Procedimento de troca documentado em `references/changing-the-registry.md`.

## Referencias cruzadas

- **Compose/scripts/infra estrutura** → skill `nic-dockerization`
- **Caddy (proxy interno do projeto)** → skill `nic-caddy`
- **.env (camadas)** → skill `nic-env-pattern`
- **Topologia detalhada da infra Processa** → `references/architecture.md`
- **Gotchas Processa** → `references/gotchas.md`
- **Trocar registry** → `references/changing-the-registry.md`

## Estrutura desta skill

```
nic-onboarding/
├── SKILL.md                                  (este arquivo)
├── references/
│   ├── architecture.md                       (nginx-proxy, Authelia, GitLab, ia-web)
│   ├── gotchas.md                            (problemas Processa-especificos)
│   └── changing-the-registry.md              (procedimento pra trocar o registry)
├── templates/
│   ├── Dockerfile.frontend                   (Caddy runtime + Vite build)
│   ├── Dockerfile.backend                    (Node runtime)
│   ├── dockerignore
│   ├── env.production.example                (.env do servidor)
│   ├── gitlab-ci.yml                         (CI: build + push + SSH deploy)
│   ├── nginx-vhost-bootstrap.conf            (vhost HTTP-only pra emissao do cert)
│   └── nginx-vhost.conf                      (vhost final HTTPS + Authelia)
└── scripts/
    ├── check-prereqs.sh                      (qualquer um)
    ├── setup-group-vars.sh                   (admin, UMA vez)
    ├── bootstrap-project.sh                  (lead, uma vez por projeto)
    ├── setup-edge.sh                         (lead, uma vez por dominio — cert + vhost via container-as-root)
    └── setup-local-ssh.sh                    (qualquer um — prepara `ssh iaweb` em ~/.ssh/)
```
