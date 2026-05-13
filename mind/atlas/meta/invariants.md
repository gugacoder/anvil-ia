---
title: "Invariantes da base"
aliases: [invariants]
tags: [lyt, rules, operational]
sources:
  - "ABOUT.md"
created: 2026-05-11
updated: 2026-05-11
---

# Invariantes da base

Regras que valem em todas as categorias. Toda escrita na base preserva estas invariantes.

## Key Points

1. **Frontmatter YAML completo em todo artigo.** Mínimo: `title`, `created`, `updated`. Campos específicos por categoria como listado nos specs.
2. **Mínimo 2 wikilinks de saída por artigo.** Sustenta o grafo e habilita navegação heterárquica. BOATs podem começar com menos mas devem crescer até a régua.
3. **Todo artigo novo ou modificado em Atlas aparece em HOME** com linha de título, sumário, fonte e data. Nenhum artigo órfão do índice. Veja [[home-reachable]].
4. **Todo binário em `mind/x/files/`** — e todo artefato não-markdown em qualquer lugar de `x/` — **é wikilinkado a partir de pelo menos uma nota**. Veja [[x-files]].
5. **Wikilinks em forma Obsidian shortest-path**, sem extensão: `[[concepts/slug]]`, não `[[atlas/concepts/slug.md]]`.
6. **Datas em ISO 8601.** `YYYY-MM-DD` para datas, ISO completo (`YYYY-MM-DDTHH:MM:SS±TZ`) para timestamps.
7. **Nomes de arquivo em kebab-case minúsculo.** `supabase-row-level-security.md`, não `Supabase RLS.md`.
8. **Daily logs (`calendar/notes/YYYY-MM-DD.md`) são append-only.** Nunca reescreva história. Veja [[calendar-note-spec]].
9. **`calendar/system/` é gerado por código.** Não editar à mão. Veja [[calendar-system-spec]].
10. **Linke com intenção; não dilua.** Um link é uma afirmação de relação significativa. Sem articulação, sem link. Veja [[link-curation]].
11. **Prefira atualizar nota existente a criar quase-duplicata.** Ao ingerir material novo sobre tópico já coberto, mescle no artigo existente e adicione a nova fonte ao frontmatter.
12. **Maps emergem da necessidade, não do planejamento.** Não crie map preemptivamente para tema com menos de ~3–4 notas. Espere [[squeeze-point]] ou que o projeto mereça pela escala.
13. **Filhos diretos de `mind/x/` restritos a `files/`, `work/`, e nomes de sistema reconhecidos.** Sem arquivos soltos em `mind/x/`. Cada subpasta de `mind/x/work/` corresponde a uma frente em `effort/on/`, `effort/slow/`, ou `effort/off/`. Veja [[x-work]].

## Related Concepts

- [[home]]
- [[home-reachable]]
- [[link-curation]]
- [[concept-spec]]
- [[x]]

## Sources

- [[-about]] — seção 5 (Invariants)
