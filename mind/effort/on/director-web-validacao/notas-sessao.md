---
title: "Notas de sessão — Director Web validação"
aliases: [notas-sessao]
tags: [effort, director-web, log]
created: 2026-05-12
updated: 2026-05-12
---

# Notas de sessão

Append-only. O que aconteceu em cada rodada de trabalho na frente.

## 2026-05-12 — abertura

- Frente aberta após negociação claude ↔ deepseek via `.tmp/-chat.txt`.
- Estrutura definida: validação ativa, divisão infra/negócio, fase 1 = login + 3-5 CRUDs do happy path.
- App publicado em `http://172.27.0.52:4300/` voltou ao ar durante a negociação — próxima rodada já pode combinar leitura de source + acesso ao app.
- Próximos passos:
  - deepseek: levantar rotas, Menu.json, guards em `sources/`.
  - claude: levantar entidades, telas CRUD, campos em `sources/`.
  - ambos: registrar hipóteses em [[hipoteses]] e iniciar validação contra o app.

## Notas

- [[director-web-validacao]] — frente-mãe
- [[hipoteses]] — checklist de validação
