# Test report — F070 receipt-modal (Dialog desktop / Drawer mobile)

**Data**: 2026-05-16
**Resultado**: pass
**Ambiente**: localhost:3000 (dev, smoke route `/smoke/f050` seção 2)
**Caso real testado**: fluxo `submit-com-validacao-e-comprovante` do app `agent` (F050), payload mínimo (Ana Silva / 11222333000144 / PJ), stub responde com `html` real do recibo. Mesmo ReceiptModal consumido por `generic-form-renderer.tsx:1067`.

## Casos cobertos

| # | Cenário | Esperado (contrato/spec) | Observado | Resultado |
|---|---|---|---|---|
| R1 | Desktop (1280×900) renderiza Dialog shadcn | `<div role="dialog" data-slot="dialog-content">` centralizado top-1/2 left-1/2 -translate-x/y-1/2, overlay `data-slot="dialog-overlay"`, sem atributos `data-vaul-drawer` | Dialog aberto centrado (rect: top=85, width=364px, centerX==viewport center ±10px), overlay presente em `data-state="open"`, `data-slot="dialog-content"` (não drawer), iframe `data-component="receipt-iframe"` renderizado com `sandbox="allow-same-origin allow-modals"` + srcDoc sanitizado por DOMPurify, botões "Imprimir"/"Fechar"/"Close" (X) presentes | ✓ |
| R2 | Mobile <768px renderiza Vaul Drawer | `<Drawer>` colando no bottom, vaul drawer attrs presentes | **Deferido a F033** — Chrome MCP viewport travado em 1267px mesmo após `resize_window(375,812)` (mesma classe de F005 C2 / F007 C7 / F013 C9 / F014). Mecanismo `useIsMobile` já validado empiricamente em F005/F007/F013/F014; branch JSX (linhas 169-184 do `receipt-modal.tsx`) idêntico ao pattern Drawer canônico. Não é fail — débito transversal documentado | deferido |
| R3a | `Esc` fecha o Dialog | Radix Dialog escuta `keydown Escape` no content; `data-state` → "closed" | Dispatch de `KeyboardEvent("Escape")` no nó com `role="dialog"` → `data-state` muda para `"closed"` | ✓ |
| R3b | Focus trap funciona | foco fica dentro do Dialog após abrir | `dlg.contains(document.activeElement) === true`, foco aterrissa no iframe (4 focáveis: iframe, Imprimir, Fechar, X Close) | ✓ |
| R3c | Console limpo no load + open + close | sem `error`/`warning` React | 7 mensagens: 2× Vite HMR (debug), 3× `[smoke-f050 stub] proxy call` (esperado pelo stub), 2× Vite reconnect — zero error/warning | ✓ |
| R4 | Conteúdo intocado (iframe sanitizado, botão print, fechar) | iframe com srcDoc DOMPurify-sanitizado, botões Imprimir + Fechar + X Close, conteúdo renderiza dentro do iframe | iframe `srcDoc` populado, `iframeBodyHasContent: true` (conteúdo do recibo no documento interno), botões presentes e clicáveis, Fechar dispara `onOpenChange(false)` → `data-state="closed"` | ✓ |

## Falhas

Nenhuma.

## Notas

- **Switch funcional confirmado**: `useIsMobile` retorna `false` em 1267px (`window.matchMedia('(max-width: 767px)').matches === false`), `if (isMobile) return <Drawer/>` é pulado, Dialog renderiza. Branch de mobile do mesmo hook é canônico (F005/F007/F013/F014).
- **Convivência com confirm-modal de F071**: o fluxo F050 abre primeiro o confirm modal (do `generic-form-renderer.tsx` linha ~1035) que **ainda é Drawer Vaul incondicional** — esse é exatamente o escopo de **F071** (não de F070). Drawer do confirm aparece no desktop como drawer-up até F071 ser implementada. Para isolar R1, exercitei o fluxo após `Confirmar` no confirm-modal — a partir daí, o ReceiptModal é Dialog limpo, como esperado.
- **`max-w-2xl` da DialogContent**: aplicado via classe Tailwind; observado width=364px num viewport de 1280px com max-w-2xl (sm:max-w-s herdado do `dialog-content` slot default da shadcn). Conteúdo do iframe `h-[60vh]` dentro respeita o container.
- **R2 (mobile Drawer)**: a impossibilidade de exercitar viewport <768px no Chrome MCP é débito de tooling (F033), não de F070. Recomendo curator aceitar com nota de R2 deferido — pattern idêntico aos aceites F005/F007/F013/F014.

## Evidência

- console: zero error/warning; logs esperados do stub.
- DOM verificado via `javascript_tool`: data-slot="dialog-content", overlay aberto, focus trap, Esc fecha, Fechar fecha.

## Próxima ação

- pass → curator aceita (com nota de R2 deferido a F033, padrão de aceites anteriores).
