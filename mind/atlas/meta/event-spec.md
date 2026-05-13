---
title: "Event — spec"
aliases: [event-spec]
tags: [lyt, calendar, location, template]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# Event — `mind/calendar/events/YYYY-MM-DD/<slug>.md`

Notas atreladas a uma data — passada ou futura. Uma subpasta por dia, um arquivo por evento.

## Key Points

- Caminho: `mind/calendar/events/YYYY-MM-DD/<slug>.md`.
- Frontmatter inclui `date:`, opcionalmente `time:`, e flag `attended:`.
- Eventos passados **permanecem em lugar** — não migram após acontecerem. O que importa é a relação com o tempo, não se já passou.
- O corpo é livre: qualquer coisa relevante ao evento.

## Details

Frontmatter:

```yaml
---
title: "Event Title"
date: YYYY-MM-DD
time: HH:MM             # opcional; omita para eventos de dia inteiro
attended: false
created: YYYY-MM-DD
---
```

`attended` vira `true` quando o evento foi processado. A semântica do "processamento" é específica de cada sistema que lê eventos — `event-spec` não prescreve o que um evento contém ou como é tratado quando chega a data.

Eventos vivem em `calendar/` porque têm **ponto fixo no tempo**. Veja [[ACE]].

## Related Concepts

- [[ACE]]
- [[calendar-note-spec]]

## Sources

- [[-about]] — seção 4 (`mind/calendar/events/`)
