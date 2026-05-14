---
title: "Mind Pipeline"
aliases: [pipeline de compilação, flush-capture-digest]
tags: [meta, knowledge-management, pipeline]
sources:
  - "calendar/notes/2026-05-13.md"
created: 2026-05-13
updated: 2026-05-13
---

# Mind Pipeline

Pipeline de três estágios que transforma conversas brutas em artigos de conhecimento estruturados na base `mind/`. Cada estágio tem um script próprio e opera sobre uma camada específica do filesystem, garantindo separação entre dado bruto, dado consolidado e conhecimento curado.

## Key Points

- **Estágio 1 — Flush** (`flush.js`): ao fim de sessão, grava session-flushes em `calendar/system/<data>/`. Saída bruta, não editada.
- **Estágio 2 — Capture** (`/mind:capture`): consolida os flushes de uma sessão em um daily log estruturado em `calendar/notes/<data>.md`. Este é o ponto onde o dado ganha forma narrativa.
- **Estágio 3 — Digest** (`/mind:digest` → `compile.js`): lê exclusivamente de `calendar/notes/` e gera artigos em `atlas/concepts/`, `atlas/connections/` ou `atlas/works/`.
- O `compile.js` **não** lê de `calendar/system/` — apenas de `calendar/notes/`. Session-flushes em `system/` são input do capture, não do digest.
- Cada estágio é idempotente: rodar novamente não duplica — atualiza ou ignora se já processado.

## Details

A confusão mais comum é esperar que `/mind:digest` processe arquivos em `calendar/system/`. O `compile.js` usa `listRawFiles()` (em `.systems/memory/scripts/kb/utils.js:124`), que aponta exclusivamente para `NOTES_DIR = mind/calendar/notes/`. Os session-flushes (`session-flush-memory-*.md`, `log-memory.md`) são saída do `flush.js` e input do `/mind:capture`, não do `compile.js`.

Na prática, se `/mind:digest` reporta "all daily logs are up to date" mas existem arquivos novos em `calendar/system/<data>/`, isso significa que o estágio 2 (capture) ainda não foi executado. O caminho correto é rodar `/mind:capture` antes para consolidar os flushes em um daily note, e só então rodar `/mind:digest`.

O commit `008c4c9` (2026-05-13) removeu session-flushes obsoletos de 2026-05-12 e 2026-05-13 que nunca foram consolidados em daily notes — demonstrando que flushes sem capture são descartáveis.

## Related Concepts

- [[concepts/xml-to-json-node]] — exemplo de artigo produzido pelo estágio 3 (digest)
- [[-about]] — contrato estrutural da base que define as camadas `calendar/` e `atlas/`

## Sources

- [[calendar/notes/2026-05-13.md]] — investigação de por que `/mind:digest` reportava "up to date" com flushes pendentes; mapeamento completo do pipeline flush→capture→digest
