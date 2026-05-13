---
title: "Calendar note — spec"
aliases: [calendar-note-spec, daily-log]
tags: [lyt, calendar, location, template]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# Calendar note — `mind/calendar/notes/YYYY-MM-DD.md`

Logs diários de conversa. Um arquivo por dia. Captura o que aconteceu nas interações do agente naquele dia. É **matéria-prima** — não artigo final, mas a fonte da qual artigos serão compilados.

## Key Points

- Um arquivo por dia, nome `YYYY-MM-DD.md`.
- **Append-only**: imutável uma vez escrito. Nunca reescreva história.
- É camada **Add** do [[ARC]] junto com [[inbox]].
- Não é alvo de citação direta de prosa — outras notas referenciam via `sources:` na frontmatter.

## Details

A imutabilidade é estrutural: o daily log é o registro factual de uma sessão; reescrevê-lo destruiria a possibilidade de auditar de onde um conceito veio.

Logs diários são fonte primária para `atlas/concepts/` e `atlas/connections/`. Ao criar um concept article a partir de uma conversa, registre o daily log no campo `sources:` do frontmatter.

## Related Concepts

- [[ARC]]
- [[inbox]]
- [[concept-spec]]

## Sources

- [[-about]] — seção 4 (`mind/calendar/notes/`)
