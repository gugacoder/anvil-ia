---
title: "Threshold de split de MOC"
aliases: [moc-threshold]
tags: [lyt, moc, operational]
sources:
  - "calendar/notes/2026-05-11.md"
created: 2026-05-11
updated: 2026-05-11
---

# Threshold operacional para split de MOC

Um [[MOC]] cresce conforme novas notas relacionadas aparecem. Existe um ponto em que continuar inflando o MOC fere o orçamento de tokens por sessão — é hora de reorganizar em sub-MOCs.

## Key Points

- **Threshold: 30 entradas em uma mesma seção de um MOC.**
- Ao atingir, **proponha** sub-MOCs em vez de continuar inflando o pai.
- O MOC pai não some — reduz-se a apontar para os filhos com comentário curatorial.
- A regra vale para **qualquer MOC**, inclusive HOME.
- Soft signal — o agente avalia se o split realmente economiza ou se introduz mais saltos do que poupa tokens.

## Details

O número vem do orçamento de tokens, não de cognição humana. Uma entrada de MOC custa ~30-40 tokens (`| [[slug]] | sumário | fonte | data |`). 30 entradas ≈ 1000 tokens por seção. Acima disso, o custo de carregar o MOC inteiro a cada navegação começa a competir com o resto do contexto da sessão.

Aplica-se por **seção curada**, não por nota total. Um MOC com 90 entradas em 3 seções de 30 está saudável. Um MOC com 40 entradas numa única seção plana está estourado.

Veja [[moc-growth]] para a regra de como reorganizar quando o threshold dispara.

## Related Concepts

- [[MOC]]
- [[moc-growth]]
- [[home]]
- [[squeeze-point]]

## Sources

- Decisão registrada em [[calendar/notes/2026-05-11]]
