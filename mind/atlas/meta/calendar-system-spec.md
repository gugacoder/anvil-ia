---
title: "Calendar system — spec"
aliases: [calendar-system-spec]
tags: [lyt, calendar, location, system-generated]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# Calendar system — `mind/calendar/system/`

Registros operacionais gerados por código. **Não editar à mão.**

## Key Points

- `log.md` — build log global, append-only. Toda compilação, ingestão, query e lint registrada cronologicamente.
- `YYYY-MM-DD/log-<system>.md` — log operacional bruto de um sistema específico naquele dia. `.md` para integrar com navegação LYT.
- `YYYY-MM-DD/lint.md` — relatório de lint do dia.
- `YYYY-MM-DD/session-flush-<system>-*.md` — contextos de sessão capturados.

## Details

A convenção de prefixo (`<system>-` no nome do arquivo) deixa múltiplos sistemas compartilharem a mesma pasta diária sem nesting. Ex: `log-memory.md`, `session-flush-memory-2026-05-11T14-23-08.md`.

Para o agente, esta pasta é leitura sob demanda — quando precisar reconstruir o que aconteceu em uma data ou auditar uma operação de sistema. Não é local de escrita manual.

## Related Concepts

- [[ACE]]
- [[calendar-note-spec]]

## Sources

- [[-about]] — seção 4 (`mind/calendar/system/`)
