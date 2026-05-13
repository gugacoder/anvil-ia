---
title: "Work article — spec"
aliases: [work-spec]
tags: [lyt, location, template]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# Work article — `atlas/works/`

Saídas finalizadas produzidas pelo agente e **entregues**: copy social, relatórios, drafts — qualquer artefato destinado a sair da base ou ser usado externamente. É a camada **Communicate** do [[ARC]].

## Key Points

- Vive em `mind/atlas/works/`.
- Estrutura **flat** — sem subpastas. Trabalhos relacionados são agrupados por um sub-MOC em `atlas/maps/<projeto>.md`.
- Frontmatter inclui `work_type:` (freeform) e `delivered_at:`.
- Origem (`origin:`) aponta para a frente que produziu o work, geralmente em `effort/on/<slug>` ou `effort/off/<slug>`.

## Details

Frontmatter:

```yaml
---
title: "Work Title"
work_type: social-copy | report | draft | ...
delivered_at: YYYY-MM-DD
origin: "effort/on/<project-slug>.md"
---
```

Corpo: o work em si. Referências de fonte em `## Sources` no final, com wikilinks para conceitos, daily logs ou eventos que informaram o work.

Works são o ponto de chegada do pipeline efforts → atlas. Veja [[effort]] (sub-MOC) para o ciclo de vida que precede a chegada aqui.

## Related Concepts

- [[ARC]]
- [[effort]]
- [[map-spec]]

## Sources

- [[-about]] — seção 4 (`atlas/works/`)
