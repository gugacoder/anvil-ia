---
title: "Windowed vs Workspace Layouts"
aliases: [windowed-workspace, layout-modes, desktop-layouts, windowed-layout, workspace-layout]
tags: [ux, layout, desktop, processa-os, responsive, design]
sources:
  - "calendar/notes/2026-05-23.md"
created: 2026-05-23
updated: 2026-05-23
---

# Windowed vs Workspace Layouts

Dois paradigmas de layout desktop disponíveis no [[processa-os-mob]], selecionáveis por breakpoint via env vars CSV. O modo `windowed` é o SO-like original (janelas flutuantes com drag/resize/min/max); o modo `workspace` é um app-shell com sidebar permanente, breadcrumb sticky, e outlet único onde cada app ocupa a área inteira. Mobile/tablet-pequeno sempre usa o layout mobile-like nativo (sem opção de windowed ou workspace).

## Key Points

- **Vocabulário unificado**: `windowed` e `workspace` — mesma palavra em env vars, localStorage, TypeScript types e UI. Descartado `os|web` (curto mas ambíguo) em favor de expressividade. Zero camada de mapeamento.
- **Env CSV per-breakpoint**: 3 vars `VITE_LAYOUT_TABLET`, `VITE_LAYOUT_DESKTOP`, `VITE_LAYOUT_TV`. Formato: primeiro item = default, lista completa = opções disponíveis, item único = trava. Ex: `windowed,workspace` permite ambos com windowed como default; `workspace` trava em workspace.
- **Defaults de código**: tablet-grande = `workspace,windowed`; desktop = `windowed,workspace`; tv = `windowed,workspace`. Rationale: tablet cabe melhor em app-shell; desktop em janelas; TV em janelas por default mas workspace disponível.
- **localStorage override**: `os.layout-{categoria}` sobrescreve se o valor estiver na lista de opções do env. Validação via zod garante que valor inválido/corrompido cai pro default sem crash.
- **WorkspaceShell**: sidebar 240px (expandida) / 56px (colapsada) com brand + lista de apps + avatar com menu e sub-menu de tema. Breadcrumb sticky no topo da área central. Área única, estado preservado entre trocas via render condicional `invisible` (não unmount).

## Details

A decisão de oferecer dois layouts surgiu da observação de que o paradigma SO-like (janelas flutuantes) é ótimo para multitasking e uso em telas grandes, mas produz overhead em tablets e monitores de tamanho médio onde o operador tipicamente usa um app por vez. O app-shell (`workspace`) é mais familiar para quem vem de apps web tradicionais — sidebar para navegação, área central para conteúdo, sem gerenciamento de janelas.

A implementação é per-breakpoint (não global) porque os cenários de uso são distintos: um tablet de 10" conectado a uma base no depósito provavelmente quer workspace; um monitor 24" no escritório quer windowed; uma TV de monitoramento pode ir para qualquer um. A lista CSV no env permite que o deploy configure quais opções existem por device category, e o localStorage permite que o usuário individual customize dentro do permitido.

O vocabulário foi objeto de debate extenso. Opções como `os|web`, `desktop|app`, `floating|fixed` foram descartadas por cada uma ter pelo menos uma ambiguidade. `windowed` é autoexplicativo (janelas) e `workspace` evoca o conceito de área de trabalho organizada (Figma, VS Code, Android split-screen). A regra adotada — mesma palavra em todo ponto do stack — elimina bugs de mapeamento (ex: env diz `os`, storage diz `desktop`, TS diz `WindowedMode`).

A seção "Layout" em Settings é separada de "Aparência" (que controla tema claro/escuro/system e cor accent). Princípio aplicado: páginas focadas, não misturadas.

## Related Concepts

- [[processa-os-mob]] — projeto que implementa os dois layouts
- [[app-content-width-primitives]] — primitiva que controla largura do conteúdo dentro de ambos os layouts
- [[processa-os]] — protótipo original que só tinha o modo windowed
- [[team]] — princípio "não estique" influencia como o layout workspace renderiza conteúdo

## Sources

- [[calendar/notes/2026-05-23.md]] — Session 00:00: conceito windowed/workspace, env CSV design, vocabulário unificado, breakpoints, defaults de código. Sessão tarde: WorkspaceShell implementado (sidebar 240/56px, breadcrumb sticky, render condicional `invisible`), Settings seção Layout separada de Aparência.
