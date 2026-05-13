---
title: "Q&A article — spec"
aliases: [qa-spec]
tags: [lyt, location, template]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# Q&A article — `atlas/qa/`

Pares pergunta-resposta produzidos pelo pipeline de querying quando têm valor de referência duradouro. A resposta é sintetizada a partir de artigos existentes; quando vale a pena preservar, é arquivada aqui.

## Key Points

- Vive em `mind/atlas/qa/`.
- Captura a pergunta original *exatamente* como foi feita.
- Lista os artigos consultados na frontmatter (`consulted:`).
- A resposta cita esses artigos via wikilinks.

## Details

Frontmatter:

```yaml
---
title: "Q: Original Question"
question: "The exact question asked"
consulted:
  - "concepts/article-1"
filed: YYYY-MM-DD
---
```

Corpo:

- `## Answer` — resposta com citações por wikilink.
- `## Sources Consulted` — artigos consultados.
- `## Follow-Up Questions` — perguntas que emergiram.

Um Q&A é uma forma estabilizada de [[refraction]] entre conceitos. Veja [[concept-spec]] para os artigos consultados.

## Related Concepts

- [[concept-spec]]
- [[refraction]]
- [[ARC]]

## Sources

- [[-about]] — seção 4 (`atlas/qa/`)
