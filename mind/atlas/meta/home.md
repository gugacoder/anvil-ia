---
title: "HOME — MOC raiz da base"
aliases: [home-spec]
tags: [lyt, moc, structure, location]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# HOME — MOC raiz da base

`mind/HOME.md` é o [[MOC]] raiz. É a primeira porta que o agente cruza ao pensar — todo retrieval entra por aqui.

## Key Points

- Arquivo único: `mind/HOME.md`.
- Lista, em tabelas curadas, todo artigo de `atlas/` (concepts, connections, maps, qa, works) com sumário de uma linha, fonte e data de atualização.
- HOME **é MOC como qualquer outro**: cresce, atinge [[threshold]], se reorganiza via [[moc-growth]].
- Toda nota nova precisa ser alcançável por HOME direta ou indiretamente — veja [[home-reachable]].

## Details

Formato canônico de uma linha:

```markdown
| [[concepts/article-slug]] | Sumário de uma linha | source-file | YYYY-MM-DD |
```

Sumários são auto-contidos — ricos o suficiente para o agente decidir relevância sem abrir o artigo.

Quando uma seção de HOME atinge o threshold (~7 entradas), crie um sub-MOC em `atlas/maps/` e refatore HOME para apontar pro sub-MOC em vez de listar entradas individualmente. É a aplicação do antídoto do [[squeeze-point]] na raiz.

## Related Concepts

- [[MOC]]
- [[threshold]]
- [[moc-growth]]
- [[home-reachable]]

## Sources

- [[-about]] — seção 4 (HOME)
