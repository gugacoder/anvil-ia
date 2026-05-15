# Grupo `nic-*` — skills do time

A `nic-onboarding` e' o hub que orquestra primeiro deploy de um projeto no servidor interno. Os passos dela referenciam padroes/utilitarios que vivem em **skills irmas com prefixo `nic-`**. Cada uma pode ser usada/mantida em separado.

## Especificas do ambiente

| Skill | O que faz |
|---|---|
| [`nic-onboarding`](./SKILL.md) | Primeiro deploy de um projeto novo no servidor interno: bootstrap do `/projetos/<app>/`, cert SSL, vhost nginx-proxy, pipeline CI |
| `nic-authelia` | Integracao SSO via Authelia forward-auth + LDAP nos apps (endpoint `/auth/sso`, upsert no primeiro login, hybrid auth) |
| `nic-sqlserver` | Convencao de nomenclatura SQL Server (prefixos `TB/DF/PK/FK/UQ/IX/TR`) |
| `vpn-processa` (global) | Tunel L2TP pra `vpn.processa.info` — pre-requisito pra acessar o servidor interno. Mora em `~/.claude/skills/`, nao no projeto, porque e' cross-projeto. |

## Padroes genericos (reutilizaveis fora do contexto NIC)

| Skill | O que faz |
|---|---|
| `nic-dockerization` | Padrao Docker multi-servico: 2 camadas compose (platform + app), scripts `docker:*` / `platform:*`, estrutura `infra/` |
| `nic-caddy` | Caddy como proxy reverso interno do projeto — unifica todos os servicos em 1 porta publica |
| `nic-env-pattern` | `.env` em camadas (Docker defaults + DEV OVERRIDES) |
| `nic-env-encryption` | Secrets via dotenvx encriptado per-environment |
| `nic-git-commit` | Convencao de commits tematicos (`--all`, `--one`) |

## Como `nic-onboarding` orquestra as outras

```
Pre-requisitos (Fase 0):
  └── projeto montado conforme nic-dockerization + nic-caddy + nic-env-pattern

Fase 2 (bootstrap do projeto):
  └── bootstrap-project.sh

Fase 3a (edge — lead):
  └── setup-edge.sh
      ├── certbot + cp via container-as-root
      └── vhost nginx-proxy

Fase 3b (Authelia rule — admin):
  └── handoff manual

Apos onboarding, dia-a-dia:
  └── git push  -->  pipeline CI definido no template gitlab-ci.yml
```

## Outras conexoes

- `nic-authelia` se aplica **depois** que o app entrou no ar via `nic-onboarding` — adiciona auto-login dentro do app
- `nic-sqlserver` aplica em qualquer migration nova, independente de onde o app esta deployado
- Skills genericas (`nic-dockerization`, `nic-caddy`, etc.) sao pre-requisitos da fundacao do projeto

## Portabilidade

As skills genericas (`nic-dockerization`, `nic-caddy`, `nic-env-pattern`, `nic-env-encryption`, `nic-git-commit`) descrevem padroes aplicaveis fora do contexto NIC. Quem adota o stack pode usar.

As especificas (`nic-onboarding`, `nic-authelia`, `nic-sqlserver`) contem execucao concreta no nosso ambiente (IP, dominio, hostname, convencao interna). Pra reuso em outro ambiente, substituir os valores especificos no proprio conteudo.
