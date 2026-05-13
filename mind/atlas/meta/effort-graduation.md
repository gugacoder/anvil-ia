---
title: "Effort — graduação para Atlas"
aliases: [effort-graduation]
tags: [lyt, effort, operational]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# Effort — graduação para Atlas

**O destino final de uma frente bem-sucedida não é `effort/off/`.** Quando uma frente é completada, suas notas saem de `effort/` e vão para Atlas — `off/` é só para abandono.

## Key Points

- **Work entregue** → `atlas/works/`. Veja [[work-spec]].
- **Q&A finalizada** → `atlas/qa/`. Veja [[qa-spec]].
- **Conceito emergente** → `atlas/concepts/`. Veja [[concept-spec]].
- **Projeto multi-nota** → ganha um map em `atlas/maps/<slug>.md` referenciando onde cada peça foi parar. Veja [[map-spec]].
- **`effort/off/`** — somente para abandono, com a frente preservada como registro do que foi tentado e por que parou.

## Details

Subpastas do ciclo de vida:

- `on/` — frentes ativas, sendo tocadas agora.
- `slow/` — pausadas mas vivas; podem ser retomadas.
- `off/` — abandonadas. Preservadas como registro.

O `status:` no frontmatter do effort deve refletir a subpasta atual:

```yaml
---
title: "Project Name"
status: on | slow | off
started: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

Ao graduar, [[x-work]] também se dissolve — artefatos com valor de referência migram para [[x-files]] e são re-wikilinkados a partir da nota Atlas que herdou o conhecimento; o resto é deletado.

## Related Concepts

- [[effort]]
- [[effort-shapes]]
- [[work-spec]]
- [[qa-spec]]
- [[concept-spec]]
- [[map-spec]]
- [[x-work]]
- [[x-files]]

## Sources

- [[-about]] — seção 4 (`mind/effort/`, Graduation)
