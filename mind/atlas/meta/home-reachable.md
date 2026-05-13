---
title: "Toda nota alcançável a partir de HOME"
aliases: [reachability, home-reachable]
tags: [lyt, arc, operational]
sources:
  - "calendar/notes/2026-05-11.md"
created: 2026-05-11
updated: 2026-05-11
---

# Alcançabilidade a partir de HOME

Toda nota desta base precisa ser alcançável a partir de HOME pela rede de links — **direta ou indiretamente**. É a forma operacional do R do [[ARC]] neste projeto.

## Key Points

- **Direta**: a nota aparece como linha em HOME (concept, connection, map, qa, work).
- **Indireta**: a nota não aparece em HOME, mas algum MOC que já é alcançável por HOME aponta para ela.
- **Pré-condição de save**: antes de fechar uma nota, garanta pelo menos uma das duas formas. Sem isso, a nota é órfã.
- A cadeia precisa terminar em HOME — uma nota apontada apenas por outra órfã continua inalcançável.

## Details

Operacionalmente, ao criar uma nota:

1. Decida a camada via [[ACE]] (relação com o tempo).
2. Decida o **MOC pai natural** — onde alguém que já é alcançável por HOME pode apontar para ela.
3. Adicione a referência ao MOC pai antes de fechar o trabalho.
4. Se o MOC pai atingir [[threshold]], aplique [[moc-growth]] em seguida.

Notas que entram em HOME **diretamente**: concepts, connections, qa, works (têm linha própria nas tabelas).
Notas que entram **via MOC pai**: filhas de sub-MOCs, notas dentro de efforts, eventos do calendar, artefatos não-nota em x.

O piso é uma aresta de entrada em cadeia válida. Acima do piso, vale linkar para todo nó relevante — o grafo só ganha com mais arestas curadas. Veja [[link-curation]] para o limite oposto (não diluir).

## Related Concepts

- [[ARC]]
- [[MOC]]
- [[home]]
- [[threshold]]
- [[moc-growth]]
- [[link-curation]]

## Sources

- Decisão registrada em [[calendar/notes/2026-05-11]]
