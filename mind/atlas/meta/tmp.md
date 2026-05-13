---
title: ".tmp/ — válvula de alívio fora da base"
aliases: [tmp]
tags: [project-root, ephemeral]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# `.tmp/` — válvula de alívio fora da base

Fora da base — na raiz do projeto, não dentro de `mind/` — existe `.tmp/` para arquivos de trabalho efêmeros: scripts e ferramentas usadas em um único loop de raciocínio e descartadas depois.

## Key Points

- Localização: raiz do projeto, fora de `mind/`.
- Conteúdo: scrapers de uso único, helpers de query descartáveis, scripts de probe.
- **gitignored** — não entra em controle de versão.
- **Nunca referenciado** por nota em `mind/`. Nada de valor vive aqui.

## Details

A distinção importa porque nem todo artefato de trabalho merece um lugar em [[x-work]]. Aquela pasta é para artefatos que orbitam uma frente e vão ser referenciados pelas notas dela. `.tmp/` é para artefatos que existem só dentro de um único pensamento, sem follow-up e sem citação.

Em dúvida, prefira [[x-work]] — o custo de superpreservar é baixo; o custo de poluir `.tmp/` com coisas que deveriam ter sido mantidas é maior.

`.tmp/` é reconhecido aqui para que qualquer agente saiba que o destino existe e qual seu escopo. Não faz parte do contrato da base — é a válvula ao lado dela.

## Related Concepts

- [[x-work]]
- [[x]]

## Sources

- [[-about]] — seção 7 (`.tmp/`)
