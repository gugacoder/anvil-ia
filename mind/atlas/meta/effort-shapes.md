---
title: "Effort — formato single-note vs multi-note"
aliases: [effort-shapes]
tags: [lyt, effort, operational]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# Effort — formato single-note vs multi-note

Uma frente (effort) é **uma constelação de pensamento com meia-vida finita** — não necessariamente um único arquivo. Dois formatos são válidos.

## Key Points

- **Single-note effort**: `effort/on/<slug>.md`. Use quando uma única nota contém todo o pensamento vivo.
- **Multi-note effort**: pasta `effort/on/<slug>/` com nota-índice `<slug>.md` (folder-note pattern) + notas irmãs (runbooks, diagnósticos, decisões, …).
- **Teste para nota irmã**: contém *pensamento* (raciocínio, decisões, gates, narrativa)? Sim → nota irmã na pasta da frente. Não (executável, log, binário) → vive em [[x-work]].
- **Promoção**: vire single em multi-note no momento em que a segunda nota irmã nasce. Mova o `<slug>.md` original pra dentro da nova pasta `<slug>/` com o mesmo nome.

## Details

A escolha do formato é uma decisão prática: se a frente vai emitir uma única peça de pensamento (uma análise, um draft único, uma decisão), single basta. Quando a frente emite pedaços que merecem nomes próprios — um roteiro, um diagnóstico, uma decisão registrada — promova para pasta.

A pasta paira artefatos não-nota junto, via [[x-work]]: o slug bate, e a pasta `mind/x/work/<slug>/` é criada ao mesmo tempo que o effort vira multi-note.

## Related Concepts

- [[effort]]
- [[effort-graduation]]
- [[x-work]]

## Sources

- [[-about]] — seção 4 (`mind/effort/`, Single-note vs multi-note)
