---
title: "Test report — F013 Tree renderer (retry)"
tags: [test-report, director-studio, F013, ui-tester]
date: 2026-05-15
result: pass
---

# Test report — F013 Tree renderer (generictreeview + TreeCheckable)

**Data**: 2026-05-15
**Resultado**: pass (retry)
**Ambiente**: localhost:3000 (dev)
**Caso real testado**: smoke route `/smoke/f013` (fixture in-memory; legado não tem model `generictreeview` instalado em DBdirector_imperial_logistica_29 — gap conhecido, mesmo padrão de F009 C3 / F043)

## Escopo do retry

Smith (commit `46d8798`) corrigiu:
1. Loop parent↔child do TreeCheckable — sync controlado por conteúdo (compara size+has do Set, retorna prev se igual) + refs `internalLeavesRef` + `syncedFromPropRef` quebram re-emit quando sync vem do prop.
2. Highlight substring `<mark class="rounded bg-primary/20 px-0.5 text-foreground">` no filtro TreeCheckable via componente novo `HighlightedTitle`, prop `highlight` propagada via `CheckableRow` recursivo.

Foco do retry: C7 (highlight) + C8 (Sheet sem loop), revalidando os outros.

## Casos cobertos

| # | Cenário | Esperado (contract/spec) | Observado | Resultado |
|---|---|---|---|---|
| C1 | TreeView raízes via ModelEngine | 2 raízes (Cadastros, Relatório) renderizadas | confirmado | ✓ |
| C2 | Expand "Cadastros" mostra filhos | Usuários + Sub-árvore + filhos visíveis | confirmado | ✓ |
| C3 | Click leaf → engine recurse → genericform | recursão do engine via `embeddedModel` ([[model-valor-generictreeview]] §"Comportamento ao clicar") | GenericFormRenderer monta com `pageTitle="Usuários"`. `<InlineAlert title="Form sem campos">` pintado porque fixture usa `{fields:[]}` (defeito do smoke) enquanto F010 lê `config.model=[[Field]]`. Contrato F013 (recursão) cumprido. | ✓ (com nota) |
| C4 | Sub-tree → TreeView aninhado | "Folha aninhada A/B" via recursão | confirmado | ✓ |
| C5 | Filter TreeView "Rel" | matches case-insensitive recursivos, ancestrais sem match ocultos ([[model-valor-generictreeview]] §"Busca / filtro") | "Relatório" + sub-tree descendentes (que estavam expandidos) visíveis; Cadastros oculto | ✓ |
| C6 | TreeCheckable cascade tristate inline | cascade=both, valueMode=leaves | Cadastros inicial mixed (2/6) → click → cascade-down todos 6 leaves checked; value=`["fn-listar","fn-incluir","fn-alterar","fn-excluir","fn-emp-l","fn-emp-i"]` | ✓ |
| **C7** | Highlight substring no filtro TreeCheckable | digitar 2+ chars → `<mark>` com `bg-primary/20` nas substrings | 2× `<mark class="rounded bg-primary/20 px-0.5 text-foreground">Lis</mark>` em "Listar" do nó Usuários e Empresas (Listar duplicado) | ✓ |
| **C8** | TreeCheckable Sheet abre sem loop, marca via Sheet | click "Abrir seletor" → `[role=dialog][data-state=open]`, sem React errors no console; toggle item → checkbox renderiza com `bg-primary`; Salvar dispara `onSave(keys)` e fecha Sheet | confirmado em ciclo limpo após reload: toggle "Alterar" → `bg-primary`, Salvar → console `[F013 smoke sheet] save Array(3)` com `[fn-listar,fn-incluir,fn-alterar]`, Sheet fecha (`data-state=open` ausente). Zero "Maximum update depth"/loop/warning no console. | ✓ |
| C9 | Mobile responsive | mobile bottom-sheet via Vaul, desktop drawer-right | Vaul drawer attach presente; dialog em `left:1536,right:1920` (right-edge) em viewport 1536 — comportamento desktop OK. Viewport real <768px segue indisponível (CDP viewport congelado em 1536 — limitação já registrada em F033). | ✓ (mobile real → F033) |
| C10 | Regressão F010/F011/F012 | smokes anteriores não regredidos pela mudança | retry tocou apenas `tree-checkable.tsx` (diff 1 arquivo de UI); zero superfície compartilhada com renderers F010-F012 | ✓ |
| C11 | Console limpo | zero erros/warnings React, sem "Maximum update depth", sem warnings de key/ref durante open Sheet, toggle, save, escape close | zero hits em scan `error|Warning|Maximum update|Cannot update|Each child|key prop` | ✓ |

## Evidência

- Filtro TreeCheckable "Lis": 2× `<mark class="rounded bg-primary/20 px-0.5 text-foreground">Lis</mark>` (samples capturados via `document.querySelectorAll('mark')`).
- Sheet smoke clean: reload → click "Abrir seletor" → DOM mostra 1 dialog open + 0 console errors → toggle "Alterar" → checkbox vira `bg-primary` → click "Salvar" → `[F013 smoke sheet] save Array(3)` no console → dialog fecha (`data-state=open` ausente).
- TreeCheckable cascade: value reativo correto após cascade-down de Cadastros (mixed→full), 6 leaves persistidos.

## Observações para o curator

1. **Fixture defect em `apps/director-studio/src/routes/smoke-f013.tsx` linhas 31-47 e 60-83**: usa `genericform: { fields: [...] }`. F010 `GenericFormRenderer` (line 344) lê `config.model = [[Field]]`. Não bloqueia F013 (recursão do engine funciona — GenericFormRenderer monta), apenas exibe `<InlineAlert title="Form sem campos">` em vez dos inputs Nome/E-mail. Vale linha nova para ajustar o smoke ou aceitar como demonstração explícita do estado "form vazio".
2. **Mobile viewport real <768px** segue indisponível no Chrome MCP (viewport interno congelado em 1536). F033 já enfileirado cobre validação real em 375/414/767px. Vaul drawer attach confirmado em DOM (componente bottom-sheet/right-drawer corretamente plugado).
3. **TreeView do `generictreeview` (sec 1) não tem highlight de substring** — feature do retry de smith foi specifically no TreeCheckable. O contrato §"Busca / filtro" do generictreeview legado não menciona highlight, só visibility. Sem regressão; potencial enfileirar harmonização "F-tree-highlight-generictreeview" se curator/designer quiser paridade visual com TreeCheckable.

## Próxima ação

pass → curator aceita F013.
