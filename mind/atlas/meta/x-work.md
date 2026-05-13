---
title: "x/work — artefatos de frente"
aliases: [x-work]
tags: [lyt, x, effort, location]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# `mind/x/work/<effort-slug>/` — artefatos de frente

Artefatos não-nota que orbitam uma frente: scripts executáveis (`.ps1`, `.sql`, `.js`, `.bat`), configs (`.ini`), logs de execução (`.log`), saídas geradas, screenshots, binários de instalador.

## Key Points

- Pareado com a frente: `mind/x/work/<slug>/` ↔ `effort/on/<slug>/` (ou `effort/slow/<slug>/`, `effort/off/<slug>/`).
- O slug **bate exatamente** com o da frente — o pareamento é físico, não simbólico.
- Wikilinkado a partir de notas dentro da frente: `[[x/work/<slug>/scripts/foo.ps1]]` ou caminho relativo.
- Artefato pode estar em qualquer estágio — work-in-progress ou finalizado. O teste é "não-markdown referenciado por nota".

## Details

**Pairing rule.** Quando uma frente é promovida a pasta (`effort/on/<slug>/`) ou criada já como pasta, **crie `mind/x/work/<slug>/` ao mesmo tempo**, mesmo vazia. O pareamento existe fisicamente antes de ser necessário.

**Lifecycle.** Enquanto a frente vive em `on/`, `slow/` ou `off/`, `x/work/<slug>/` fica pareado e imóvel. Na graduação para Atlas:

- Artefatos com valor de referência duradouro migram para [[x-files]] e são re-wikilinkados a partir da nota Atlas que herdou o conhecimento.
- O resto é deletado.
- `x/work/<slug>/` é removido ao final da graduação.

`x/work/<slug>/` vazio ou órfão pós-graduação é violação.

## Related Concepts

- [[effort]]
- [[effort-shapes]]
- [[effort-graduation]]
- [[x-files]]
- [[x]]

## Sources

- [[-about]] — seção 4 (`mind/x/work/`)
