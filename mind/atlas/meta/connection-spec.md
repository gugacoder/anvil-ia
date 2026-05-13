---
title: "Connection article — spec"
aliases: [connection-spec]
tags: [lyt, location, template]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# Connection article — `atlas/connections/`

Síntese transversal que liga 2+ conceitos. Criada quando uma relação não-óbvia entre conceitos existentes se torna visível. Frequentemente é o traço de [[refraction]]: "como é o conceito X visto através do conceito Y?".

## Key Points

- Vive em `mind/atlas/connections/`.
- Conecta sempre **2 ou mais conceitos** já existentes em `atlas/concepts/`.
- Frontmatter inclui `connects:` listando os conceitos.
- Corpo é breve e focado na **relação**, não nos conceitos em si.

## Details

Frontmatter:

```yaml
---
title: "Connection: X and Y"
connects:
  - "concepts/x"
  - "concepts/y"
sources:
  - "calendar/notes/YYYY-MM-DD.md"
created: YYYY-MM-DD
updated: YYYY-MM-DD
---
```

Corpo:

- `## The Connection` — descreve a relação.
- `## Key Insight` — o que se aprende ao ver os dois juntos.
- `## Evidence` — passagens, exemplos, casos que sustentam a relação.
- `## Related Concepts` — wikilinks.

## Related Concepts

- [[refraction]]
- [[concept-spec]]
- [[thought-collisions]]

## Sources

- [[-about]] — seção 4 (`atlas/connections/`)
