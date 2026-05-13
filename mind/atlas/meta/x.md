---
title: "Map: x (artefatos não-nota)"
aliases: [x-map, x]
tags: [lyt, x, map, moc]
created: 2026-05-11
updated: 2026-05-11
---

# Map: x

Sub-MOC da camada `x/` — artefatos não-markdown que orbitam alguma das outras camadas da [[ACE]]. Binários, scripts, estado de sistema — qualquer coisa que não seja uma nota LYT.

## Regra geral

Tudo em `x/` precisa ser **alcançável por wikilink a partir de alguma nota** em `mind/`. `x/` não é depósito — é anatomia anexada ao grafo. Arquivos sem wikilink são órfãos e devem ser flagged por lint.

## Três namespaces flat

`x/` tem três tipos de subpasta convivendo no mesmo nível:

### `x/files/` — binários do inbox

Preservados do inbox depois de sintetizados. Wikilinkados a partir dos concept articles derivados. Veja [[x-files]].

### `x/work/<effort-slug>/` — artefatos de frente

Pareados com efforts ativos. Scripts, logs, configs, saídas geradas. Slug bate com a frente. Veja [[x-work]].

### `x/<system>/` — estado interno por sistema

Estado escopado por sistema (ex: `mind/x/memory/state.json`). Wikilinkado a partir do map do sistema. Veja [[x-system]].

## Naming

Slugs de efforts e sistemas **não podem colidir** dentro de `x/`. Pick distintos.

## Related Concepts

- [[ACE]]
- [[x-files]]
- [[x-work]]
- [[x-system]]
- [[effort]]

## Sources

- [[-about]] — seção 4 (`mind/x/`)
