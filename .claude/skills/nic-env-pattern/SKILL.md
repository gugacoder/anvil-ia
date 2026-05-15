---
name: nic-env-pattern
description: Padrao de estruturacao do .env com camadas Docker defaults + DEV OVERRIDES. Use quando criar ou modificar arquivos .env e docker-compose.
---

# .env Guide

## Estrutura

O `.env` tem duas camadas:

1. **Defaults Docker** (topo do arquivo) — valores para quando tudo roda embarcado
   no Docker. Hosts usam `*.internal`, portas sao as internas dos containers.

2. **DEV OVERRIDES** (fundo do arquivo) — sobrescreve os defaults para dev local.
   Hosts viram `localhost`, portas viram as exportadas via dev-ports overlay.

A ultima definicao de uma variavel vence. Em dev, os overrides ficam ativos e
sobrescrevem os defaults. Em producao/staging, basta comentar a secao inteira
de DEV OVERRIDES.

## Modos de operacao

### Producao / Staging

- Comando: `npm run docker:*`
- Compose: `docker-compose.yml` (inclui `docker-compose.platform.yml`)
- Tudo embarcado no Docker — sources + infra
- Usa os defaults do topo: hosts `*.internal`, portas internas
- DEV OVERRIDES deve estar comentado

### Dev

- Comando: `npm run platform:*`
- Compose: `docker-compose.platform.yml` + `docker-compose.platform.dev-ports.yml`
- Somente infra sobe no Docker (postgres, redis, caddy)
- Sources (frontend, backend) rodam no host
- DEV OVERRIDES ativo: hosts = `localhost`, portas exportadas para o host

## Compose — separacao platform vs dev-ports

`docker-compose.platform.yml` define os services de infra **sem expor portas
para o host**. Containers se comunicam pela rede interna via aliases
(`postgres.internal`, `redis.internal`, `caddy.internal`).

`docker-compose.platform.dev-ports.yml` eh um overlay que **so adiciona
mapeamento de portas** para o host, permitindo acesso local com pgAdmin,
redis-cli, etc. Esse overlay eh usado automaticamente por `scripts/platform.mjs`.

Em producao, o overlay de dev-ports nao eh incluido — nenhuma porta de infra
eh exposta para fora da rede Docker.

## Variaveis compostas

Algumas variaveis sao montadas a partir de outras. Em dev, os overrides mudam
os componentes (HOST, PORT) e as variaveis compostas se recalculam automaticamente.

## ⚠️ DEV OVERRIDES ativas em ambiente nao-dev: bomba-relogio

**Regra absoluta**: em qualquer `.env` que NAO seja de dev local (staging,
prod, CI, review apps), o bloco DEV OVERRIDES **DEVE estar comentado ou
removido**. Sem excecao. Nao tem "funciona mesmo com override ativo porque
meu edge nao consome essas vars".

### Por que e armadilha silenciosa

DEV OVERRIDES sobrescreve `POSTGRES_HOST=postgres.internal` por
`POSTGRES_HOST=localhost`, `BACKBONE_HOST=backbone.internal` por `localhost`,
etc. Em prod, os containers nao tem `localhost` apontando pros servicos
internos — `localhost` dentro do container e o **proprio container**. Logo:

- Qualquer servico que consuma `POSTGRES_HOST` em prod tenta conectar no
  proprio container, falha silenciosamente ou com erro cripitico.
- **Pode parecer que funciona** se o servico nao precisa da variavel no
  runtime (ex: edge reverse-proxy fala com containers pelo nome, ignora
  `HOST` vars do `.env`). Nesse caso o sistema roda — por coincidencia.
- Bomba-relogio: quando alguem adicionar um novo servico que consome
  `POSTGRES_HOST`/`REDIS_HOST`/etc, vai pegar `localhost` e quebrar.

### Como detectar

Bug assinatura: `.env` de prod com `ENVIRONMENT=production` (ou
`=development` deployado em maquina de prod) contendo, perto do fim:

```
HUB_HOST=localhost
CHAT_HOST=localhost
BACKBONE_HOST=localhost
```

Sem `#` na frente. Se voce ver isso num servidor de prod, **corrige
antes de qualquer outra coisa** — comenta o bloco ou apaga. Nao deploye
nada novo em cima desse estado.

### Como prevenir

- `.env.production.example` nao tem secao DEV OVERRIDES. Zero. Quando o
  operador faz `cp .env.production.example .env` no servidor, nasce limpo.
- Bootstrap automatico (skill `nic-onboarding/scripts/bootstrap-project.sh`)
  gera `.env` a partir de `.env.production.example`, nao de `.env.example`.
- Em auditorias periodicas de deploys inherited, este e o **primeiro item**
  a checar: `ssh iaweb 'grep -c "^[A-Z_]*=localhost" /projetos/<app>/.env'`
  — qualquer resultado `>0` em prod e red flag imediata.
