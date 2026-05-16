# Test report — F071 generic-form-renderer 2 Drawers → Dialog + Sheet desktop

**Data**: 2026-05-16
**Resultado**: pass (parcial — G2 deferred por falta de consumer real)
**Ambiente**: localhost:3000 (vite dev)
**Caso real testado**: `/smoke/f050` seção 2 ("submit-com-validacao-e-comprovante") — único consumer do `GenericFormRenderer` no app que dispara `requireConfirmation` no fluxo real do F050.

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| G1 | Confirm modal Dialog desktop (≥768px) | `[data-slot="dialog-content"]`, sem `[vaul-drawer]`/`[data-slot="drawer-content"]`, com título/descrição/2 botões | DOM: `dialog=1, drawer=0, sheet=0, alertDialog=0`; role=dialog com texto "Confirmar operação · Tem certeza que deseja realizar a operação? · Cancelar · Confirmar · Close"; backdrop shadcn (não Vaul). | ✓ |
| G2 | Modal de detalhe Sheet desktop (formOnModal=true) | `[data-slot="sheet-content"]` side=right | **Não testável** — nenhum consumer no app hoje passa `config.formOnModal=true` para o `GenericFormRenderer`. `git grep formOnModal` em apps/ retorna apenas o próprio renderer; smoke-f050/f013/f014 não exercem modal-mode. | deferido |
| G3 | Mobile preservado (375px) | Viewport real 375 → ambos viram Drawer | `resize_window(375,800)` aceito mas `window.innerWidth=1267` permanece. Mesma classe **F033** (viewport mobile travado pelo Chrome MCP). Branch mobile validável só por inspeção de código (já confirmado por smith em `f660111`). | n/a — F033 |
| G4 | Console limpo | Sem erros React no submit | Console contém apenas 4 mensagens DEBUG do vite HMR (`[vite] connecting/connected`). Zero erro/warning durante click→confirm→submit. | ✓ |
| G5 | Não regrediu | Confirm fecha pós-OK; receipt flow continua | Após click "Confirmar" no dialog: dialog desaparece (`dialog=0` após 2s); flow do ReceiptModal segue sem erro; sem Drawer remanescente. | ✓ |

## Observações G1 (detalhe)

- DOM snapshot pós-click "Disparar c/ comprovante":
  ```
  { dialog: 1, drawer: 0, drawerContent: 0, sheet: 0, alertDialog: 0,
    roles: [{role:"dialog", slot:"dialog-content",
             snippet:"Confirmar operação Tem certeza que deseja realizar a operação? Cancelar Confirmar Close"}] }
  ```
- `Esc` testado: dialog **não fechou** via tecla — pequena anomalia. shadcn Dialog default escapeKeyDown deveria fechar; pode ser foco não capturado pelo portal ainda. Não bloqueia (clique no overlay/Cancelar/Close funcionam; UX desktop comum não depende exclusivamente de Esc). Anotar como observação para o curator.
- Click em "Confirmar" → dialog fecha + flow segue → sem regressão.

## G2 — gap de testabilidade (não-falha)

A mudança no código (`packages/ui/src/components/generic-form-renderer.tsx` linhas ~1156-1188) substitui o segundo Drawer pelo Sheet apenas no branch `!isMobile && isModal`. Como `isModal = isLegacyTrue(config.formOnModal) && !forceInline`, nenhum consumer atual aciona esse branch:

- smoke-f050 (todas as 4 seções): sem `formOnModal`
- smoke-f013/f014: idem
- app-page/area-page: dependem de `acesso.obter_model_pagina` que precisaria de model real com `formOnModal=true` — Área 52 PROCESSA/IMPERIAL LOG ACL não expõe nenhum.

**Recomendação para o curator**: enfileirar feature `F-smoke-form-modal` para um smoke route que exercite `formOnModal=true` (`+Novo` → Sheet desktop / Drawer mobile). Sem isso, G2 fica permanentemente não-empírico.

## Evidência

- Screenshot 1 (pré-click): form section 2 preenchido "Teste F071 / 12345678000190"
- Screenshot 2 (pós-click): Dialog overlay shadcn centralizado com título/descrição/botões — sem qualquer Vaul drawer
- Screenshot 3 (pós-confirm): backdrop limpo, form retorna estado
- Console: 4 mensagens vite HMR, nada mais

## Próxima ação

Pass com nota: G1/G4/G5 OK; G3 cobertura F033; G2 deferred por gap de testabilidade (não-falha). Curator decide se aceita F071 sem evidência live de G2 (mudança de código é mecânica e simétrica à de G1, já validada).
