---
title: "ACE"
aliases: [atlas-calendar-efforts]
tags: [lyt, structure]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# ACE — Atlas, Calendar, Efforts

ACE é o framework de pastas que [[LYT]] prescreve para particionar o conhecimento por **propósito**, não por tópico. Três camadas com três tempos distintos.

## Key Points

- **Atlas** — camada permanente, atemporal. O que você *sabe* de forma estável: conceitos, conexões, MOCs, Q&As finalizadas, works entregues.
- **Calendar** — camada temporal. O que tem **ponto no tempo** (data passada ou futura): notas diárias, eventos agendados, logs operacionais.
- **Efforts** — camada de trabalho em curso. **Timespan** (início → meio → fim): projetos que vão graduar para Atlas quando completos, ou ser abandonados.
- Cada camada tem tempo próprio: Atlas é lento (permanente), Calendar é fluente (temporal), Efforts é rápido e em rajadas (WIP).
- Uma nota que não cabe em nenhuma das três provavelmente não pertence à base.

## Details

O critério primário para decidir onde uma nota mora é a **relação dela com o tempo**:

- Atemporal (sem início nem fim) → Atlas
- Ponto fixo no tempo (data) → Calendar
- Timespan com extremos definíveis → Efforts

Esta escolha por *tempo* (não por tópico) é o que mantém a base navegável. Tópicos atravessam as três camadas via [[wikilinks]] e [[MOC]]s; o que importa é a tempo-vida da informação.

A camada `x/` (artefatos não-nota) orbita as três acima — binários, scripts, estado de sistema — sempre alcançável por wikilink a partir de alguma nota.

## Related Concepts

- [[LYT]]
- [[ARC]]
- [[effort]]

## Sources

- [[-about]] — seção 1.4
