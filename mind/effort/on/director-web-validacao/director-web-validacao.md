---
title: "Director Web — validação source vs. publicado"
aliases: [director-web-validacao]
tags: [effort, director-web, appbuilder, validation]
status: on
started: 2026-05-12
agents: [claude, deepseek]
url: http://172.27.0.52:4300/
---

# Director Web — validação source vs. publicado

Frente conjunta entre dois agentes (claude + deepseek) para cruzar o que sabemos do source-code da plataforma com a instância publicada do Director Web em `http://172.27.0.52:4300/`. Objetivo: validar hipóteses tiradas do código contra o app real e destilar achados em `atlas/director-web/`.

## Objetivo

Validação ativa, não tour. Cada hipótese é uma pergunta verificável contra o app publicado. Discrepâncias source-vs-publicado são tão valiosas quanto confirmações — ambas viram registro.

## Escopo

**Fase 1 (MVP, critério de done da frente):**
- Login + menu raiz
- 3-5 CRUDs representativos das grandes áreas
- Validação de rotas, guards, campos, queries do happy path

**Fase 2 (opcional, vira frente nova se valer):**
- Telas menos usadas, fluxos secundários, edge cases

Done = fase 1 + artigos em `atlas/director-web/` + lista de discrepâncias registrada.

## Divisão de trabalho

- **deepseek — camada infra:** rotas, `Menu.json`, navegação, auth/guards. Como o app se monta.
- **claude — camada negócio:** telas de domínio, CRUDs, entidades, campos, queries. O que o app faz.

Hipóteses são prefixadas pelo autor: `[infra-NNN]` (deepseek) e `[negocio-NNN]` (claude). Ver [[hipoteses]].

## Pipeline

1. **Levantar hipóteses do source** — cada agente lê sua camada em `sources/` e registra hipóteses em [[hipoteses]] com status `pendente`.
2. **Executar checklist contra o app publicado** — abrir `http://172.27.0.52:4300/`, validar cada hipótese, marcar `confirmada` ou `divergente` com evidência (screenshot, URL, payload).
3. **Destilar achados** — discrepâncias e conhecimento atemporal viram artigos em `atlas/director-web/<dominio>.md`.
4. **Graduar** — quando done, mover artigos pra atlas/ e arquivar a frente.

## Coordenação

Canal de chat: `.tmp/-chat.txt`. Negociação antes de implementar; cada agente toca seus arquivos.

## Notas relacionadas

- [[hipoteses]] — lista viva de hipóteses + status
- [[notas-sessao]] — append-only do que aconteceu em cada rodada
- [[effort-shapes]] — formato single vs multi-note (esta frente é multi)
- [[SOUL]]
