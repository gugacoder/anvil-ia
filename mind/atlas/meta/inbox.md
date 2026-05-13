---
title: "Inbox — mind/+/"
aliases: [inbox-spec]
tags: [lyt, arc, location]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# Inbox — `mind/+/`

Inbox é o staging transitório onde arquivos externos chegam antes de serem absorvidos pela base. É a camada **Add** do [[ARC]].

## Key Points

- Arquivos em `mind/+/` **não são permanentes**.
- Cada arquivo é sintetizado em notas (atomic) ou movido para `mind/x/files/` após processamento.
- `mind/+/` **não é alvo de citação** — nenhuma nota deve linkar para arquivos do inbox.

## Details

O pipeline: arquivo chega → agente sintetiza em uma ou mais notas → binário é preservado em [[x-files]] e referenciado a partir das notas resultantes via `## Sources`.

A natureza transitória do inbox reflete sua posição no ARC: Add é onde material entra, mas o valor nasce no Relate. Notas-cemitério são note-taking; síntese ativa é note-making.

## Related Concepts

- [[ARC]]
- [[x-files]]
- [[PKM]]

## Sources

- [[-about]] — seção 4 (`mind/+/`)
