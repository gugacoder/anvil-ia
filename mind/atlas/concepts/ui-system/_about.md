---
title: "UI System — sub-namespace"
aliases: [ui-system-about, ui-system, design-system]
tags: [ui, designer, design-system, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# `atlas/concepts/ui-system/`

Catálogo durável do **design system do Director.Studio**. Cada arquivo descreve **um componente** ou **um padrão de UI** que vive em `packages/ui` do workspace, com regras visuais, semânticas, de estado, de motion e de comportamento responsivo embutidas. Mantido pelo agente [[designer]] e consumido por [[smith]] e [[ui-tester]].

## Key Points

- **Component-first** ([[ui-dry]]): o catálogo prescreve componentes reusáveis, não telas. Smith compõe a partir daqui.
- **Mobile-first com expansão coerente pra desktop**: cada componente especifica comportamento em ambas as classes de viewport como **uma forma só**, não duas telas.
- **Cores semânticas obrigatórias** ([[semantic-colors]]): nenhum componente especifica hex/oklch direto; tokens semânticos sempre.
- **Estado, motion e a11y embutidos no componente** — features não decidem hover, focus, tab-order ou animação de entrada por conta própria.
- **Sem código**: o catálogo descreve **o quê o componente faz e por quê**. A implementação fica em `packages/ui/src/components/*.tsx`.

## Details

O designer opera respondendo aos **contratos** de [[legacy-contracts]]. Por exemplo, quando o arqueólogo documenta que `TBmodel_pagina` aceita `DFtipo='grid'` com colunas filtráveis/ordenáveis/com tipos variados, o designer extrai disso o que um componente `DataTable` do sistema precisa **conceitualmente** suportar. O designer **não** vê código do legado — vê só o contrato.

O catálogo cresce por necessidade real, não especulativa. Uma feature nova chega → o designer revisa se os componentes existentes cobrem; se sim, documenta a composição; se não, adiciona componente novo ao catálogo.

Convenção de nomenclatura: kebab-case, nome neutro (não vinculado a stack). Exemplos:

```
data-table.md           # tabela com filtros, ordenação, paginação
form-field.md           # campo de formulário (variantes: text/number/date/select/...)
badge.md                # rótulo categórico
page-shell.md           # layout de página (header + content + footer)
side-nav.md             # navegação lateral hierárquica
modal-sheet.md          # modal/drawer responsivo (modal desktop, sheet mobile)
toast.md                # notificação flutuante
empty-state.md          # estado vazio
loading-state.md        # estado de carregamento
error-state.md          # estado de erro
model-action-form.md    # renderer schema-driven de actionGroups[].rows[][] (F037)
```

Cada componente é descrito em seções canônicas:

1. **Propósito** — para que existe; quando usar; quando NÃO usar
2. **API conceitual** — propriedades semânticas que aceita (sem prescrever a forma TypeScript exata)
3. **Estados** — default, hover, focus, active, disabled, loading, error, empty
4. **Motion** — entrada, saída, transições; durações em buckets (fast=150ms, normal=250ms, slow=400ms)
5. **Responsivo** — comportamento em mobile, tablet, desktop; thumb zone, gestos
6. **Acessibilidade** — ARIA, navegação por teclado, leitor de tela
7. **Composição** — componentes que ele compõe ou que o compõem

## Related Concepts

- [[director-studio]] — projeto cujo design system é catalogado aqui
- [[legacy-contracts]] — input do designer; contratos de dados que o sistema precisa renderizar
- [[ui-dry]] (skill) — princípio component-first
- [[semantic-colors]] (skill) — tokens de cor obrigatórios
- [[mobile-first-page]] (skill) — princípio de viewport

## Sources

- [[calendar/notes/2026-05-15.md]] — formalização do mandato do designer durante montagem do time
