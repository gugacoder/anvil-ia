---
title: "x/files — binários preservados"
aliases: [x-files]
tags: [lyt, x, location]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# `mind/x/files/` — binários preservados

Binários preservados do inbox: PDFs, imagens, áudio, arquivos-fonte que devem permanecer junto aos concept articles derivados deles.

## Key Points

- Vivem em `mind/x/files/`.
- **Sempre wikilinkados** a partir do concept article que os usa como fonte, via `[[x/files/<name>]]` na seção `## Sources`.
- Binário sem wikilink em qualquer nota é **órfão** — deve ser flagged por lint.

## Details

O pipeline típico: arquivo chega em [[inbox]] → agente sintetiza em um ou mais concept articles → o binário original é preservado em `x/files/` → cada concept article referencia o binário em `## Sources`.

Isso garante **provenance** — o binário continua acessível para auditoria, e qualquer nota derivada aponta de volta para a fonte concreta.

## Related Concepts

- [[inbox]]
- [[concept-spec]]
- [[x]]

## Sources

- [[-about]] — seção 4 (`mind/x/files/`)
