---
title: "Concept article — spec"
aliases: [concept-spec]
tags: [lyt, location, template]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# Concept article — `atlas/concepts/`

Um artigo de conceito é uma **nota atômica**: um fato, padrão, decisão, pessoa, lugar, entidade ou lição. Escrito em estilo enciclopédia — neutro, factual.

## Key Points

- Uma ideia por artigo. Veja [[evergreen]] e [[BOAT]] para os estados do ciclo de vida.
- Frontmatter completo obrigatório.
- Corpo segue uma estrutura canônica de seções.
- Mínimo 2 wikilinks de saída em `## Related Concepts`.

## Details

Frontmatter:

```yaml
---
title: "Concept Name"
aliases: [alternate-name, abbreviation]
tags: [domain, topic]
sources:
  - "calendar/notes/YYYY-MM-DD.md"
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

Corpo:

- Explicação central curta (1–2 parágrafos).
- `## Key Points` — 3–5 bullets auto-contidos.
- `## Details` — 2+ parágrafos de elaboração.
- `## Related Concepts` — 2+ wikilinks.
- `## Sources` — back-references para daily logs, arquivos ou eventos que alimentaram o artigo.

Conceitos amadurecem de [[BOAT]] (formação inicial) para [[evergreen]] (vivo, refinado continuamente).

## Related Concepts

- [[evergreen]]
- [[BOAT]]
- [[invariants]]
- [[home-reachable]]

## Sources

- [[-about]] — seção 4 (`atlas/concepts/`)
