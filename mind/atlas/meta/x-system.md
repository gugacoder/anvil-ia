---
title: "x/<system> — estado por sistema"
aliases: [x-system]
tags: [lyt, x, location, system-generated]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# `mind/x/<system>/` — estado interno por sistema

Estado interno (não-LYT) escopado por sistema. Exemplos: `mind/x/memory/state.json`, `mind/x/memory/last-flush.json`.

## Key Points

- Caminho: `mind/x/<system-slug>/`.
- O slug bate com o nome do sistema (ex: `memory`, `dictation`, ...).
- Wikilinkado a partir do map do sistema em `atlas/maps/<system>.md`.
- Não confundir com [[x-work]] (per-effort, slug bate com frente) nem com [[x-files]] (binários preservados do inbox).

## Details

Convenção de namespace: dentro de `x/`, os subdiretórios são `files/`, `work/`, ou nomes-de-sistema reconhecidos. Slugs de sistema e de effort **não podem colidir** — escolha nomes distintos.

O agente lê desta pasta sob demanda quando precisar inspecionar estado de algum sistema (debug, auditoria). Não é local de escrita manual — sistemas se gerenciam aqui.

## Related Concepts

- [[x]]
- [[x-files]]
- [[x-work]]
- [[map-spec]]

## Sources

- [[-about]] — seção 4 (`mind/x/<system>/`)
