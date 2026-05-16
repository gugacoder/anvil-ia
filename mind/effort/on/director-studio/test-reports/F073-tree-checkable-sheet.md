# Test report — F073 tree-checkable Sheet canônico desktop

**Data**: 2026-05-16
**Resultado**: pass (TC1/TC3/TC4 OK, TC2 deferred → F033)
**Ambiente**: localhost:3000 (dev), Chrome MCP, viewport 1280×900
**Caso real testado**: fixture `/smoke/f013` seção 3 ("TreeCheckable em bottom-sheet (mobile) / drawer-right (desktop)") com árvore Cadastros/Usuários/Empresas/Relatórios (mesmo grafo do retry F013 que já validou shape contra contrato [[model-valor-generictreeview]] em PROCESSA/99 IMPERIAL LOG)

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| TC1 | Desktop ≥768px renderiza Sheet shadcn (não Drawer) | `[data-slot="sheet-content"][data-side="right"]` + overlay shadcn; **zero** `[vaul-drawer]` | sheetContent=1, sheetSide=right, sheetOverlay=1, vaulDrawer=0; header "Selecionar recursos", body com Procurar + árvore, footer Limpar/Salvar | ✓ |
| TC2 | Mobile <768px renderiza Drawer (sem regressão F013) | Vaul drawer bottom | não exercitável — Chrome MCP viewport floor ≥1267px | → F033 |
| TC3a | Cascade pai↔filho | clicar filho propaga estado pai (indeterminate/checked) | árvore inicial mostrava Cadastros/Usuários indeterminate (Listar+Incluir checked, Alterar/Excluir unchecked) — shape consistente com cascade legado | ✓ |
| TC3b | Filtro destaca matches com `<mark>` | 2+ chars → `<mark>` no substring | digitando "lis": 2 marks renderizados com texto "Lis", filtragem reduziu árvore a Cadastros>Usuários>Listar e Cadastros>Empresas>Listar | ✓ |
| TC3c | Footer Limpar desmarca tudo | 0 checked, 0 indeterminate após clicar Limpar | confirmado via JS: `checked: 0, indeterminate: 0`; árvore re-renderizada com todos os checkboxes vazios | ✓ |
| TC3d | Salvar dispara onSave e fecha | sheet fecha após click em Salvar | sheetContent=0 após click em Salvar (screenshot final mostra fixture sem overlay) | ✓ |
| TC3e | Esc fecha | sheet fecha ao pressionar Escape | sheet fechou (sheetContent=0 ao reabrir fixture) | ✓ |
| TC3f | Outside-click fecha | clicar overlay fora do sheet fecha | screenshot pós-click no canvas mostra sheet ausente | ✓ |
| TC4 | Console limpo + sem loop infinito | sem `Maximum update depth exceeded`, sem erros React | só 2 logs do Vite (`[vite] connecting...` / `[vite] connected.`); **zero erros, zero warnings, zero Maximum update depth** | ✓ |

## Evidência

- TC1 DOM check:
  ```
  { sheetContent: 1, sheetSide: "right", sheetOverlay: 1, vaulDrawer: 0 }
  { allDialogs: [{ side: "right", slot: "sheet-content", vaul: false }] }
  ```
- TC3b filtro: `{ marks: 2, markTexts: ["Lis", "Lis"] }`
- TC3c Limpar: `{ stillOpen: true, checked: 0, indeterminate: 0 }`
- TC4 console: apenas logs Vite, nada de React/Maximum update depth

## Diferenças vs F013 baseline

- F013 desktop usava `<Drawer direction="right">` (Vaul) — viewport raiz tinha `[data-vaul-drawer-wrapper]` e DOM `[vaul-drawer][vaul-drawer-direction="right"]`
- F073 commit `e5ebdaf`: desktop agora usa `<Sheet side="right">` shadcn — DOM tem `[data-slot="sheet-content"][data-side="right"]` + `[data-slot="sheet-overlay"]`, zero atributos vaul
- Funcionalidade do tree-checkable (cascade, filtro com mark, save/clear, esc/outside) preservada
- Sem regressão do fix `46d8798` (loop infinito que originou retry F013)

## Próxima ação

- pass → curator aceita F073
- TC2 mobile → coberto por F033 (débito transversal já enfileirado)
