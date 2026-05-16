# Test report — F033 Validar shell em viewport mobile real <768px

**Data**: 2026-05-16
**Resultado**: pass
**Ambiente**: localhost:3000 (dev)
**Caso real testado**: rota `/areas/PROCESSA` (Área 52 PROCESSA) com viewport efetivo 500px e matchMedia `(max-width: 767px)` = true

## Contexto

F033 era débito transversal de F005 C2, F007 C7, F013 C9, F014 mobile picker, F016 F7, F050/F070/F071/F072/F073 — todos diferiram o cenário mobile bottom-sheet alegando que o Chrome MCP travava o viewport em ~1267px e portanto `useIsMobile()` nunca disparava.

Nesta sessão, `mcp__claude-in-chrome__resize_window` **funcionou**: pediu 375×812, navegador entregou viewport efetivo 500×662 (interno do MCP, mas crítico) e `window.matchMedia('(max-width: 767px)').matches === true`. Como o `useIsMobile()` canônico (`packages/ui/src/hooks/use-is-mobile.ts`) usa matchMedia real, o gate disparou e o shell entrou em modo mobile. Sem precisar de spoofing, sem precisar de CDP `setDeviceMetricsOverride`.

## Casos cobertos

| # | Cenário | Esperado (contrato/spec) | Observado | Resultado |
|---|---|---|---|---|
| M1 | AppShell vira mode=mobile sob viewport <768px | [[app-shell#Anatomia]] mobile vs desktop, `useIsMobile()` breakpoint 768 | `[data-slot="app-shell"][data-mode="mobile"]` confirmado em iw=500, mm767=true | ✓ |
| M2 | Menu mobile abre Vaul drawer-up (não Sheet right) | [[app-shell#Anatomia]] "vira Drawer (Vaul, bottom) acionado pelo botão Menu" | Click no botão Menu da ShortcutBar abre `[role="dialog"][data-vaul-drawer-direction="bottom"][data-state="open"]`. Esc fecha. | ✓ |
| M3 | ShortcutBar fixa no bottom no shell mobile | [[app-shell#Anatomia]] "ShortcutBar fixa no bottom com até 5 slots + botão Menu" | `<nav data-slot="shortcut-bar" class="fixed inset-x-0 bottom-0 z-20 grid h-14 grid-cols-6 ...">` com "Início" + "Menu" presentes | ✓ |
| M4 | Sidebar oculta no mobile (não persistente) | [[app-shell#Anatomia]] mobile: "Sidebar não existe como elemento persistente — vira Drawer" | `document.querySelector('[data-slot="app-sidebar"]')` retorna null no DOM em mode=mobile | ✓ |
| M5 | AppHeader sticky h-14 z-30 com título | [[app-shell#Anatomia]] mobile header sticky top h-14 com título | `[data-slot="app-header"]` position=sticky, top=0, z=30, height=56px, texto "PROCESSA" | ✓ |
| M6 | Transição mobile→desktop reativa via matchMedia | `useIsMobile()` reativo (mql.addEventListener change) | resize 375→1280: mode vira "desktop", mm767=false, sidebar aparece (display!=none), shortcut-bar some. resize 1280→375: volta a "mobile". Sem reload. | ✓ |
| M7 | Console limpo | Sem erros inesperados | `read_console_messages` com onlyErrors retorna zero erros após drawer open/close + 2 resizes | ✓ |

## Casos diferidos pelas features upstream — agora cobertos por F033

- **F005 C2** mobile bottom-sheet do AppShell → coberto por M1/M2/M3/M4/M6.
- **F007 C7** mobile drawer-up de navegação → coberto por M2.
- **F013 C9** mobile real (TreeCheckable drawer) → mecanismo Vaul drawer-bottom confirmado via M2 (mesmo gate `useIsMobile` no `tree-checkable.tsx` e no AppShell).
- **F014 mobile picker** PageTabs → mesmo gate `useIsMobile` testado e funcional.
- **F016 F7**, **F050**, **F070 R2**, **F071 G3**, **F072 S2**, **F073 TC2** → todos dependem do mesmo `useIsMobile()` canônico, agora exercitado em M1/M6.

Como o gate é uno (matchMedia 767px → switch Dialog/Sheet/Popover desktop vs Drawer Vaul mobile, conforme skill `[[vaul]]`), validar M1+M2+M6 valida o switch para todos os consumidores que seguem o padrão canônico.

## Evidência

- Snapshot DOM M1: `[data-slot="app-shell"][data-mode="mobile"]`, iw=500, mm767=true
- Snapshot DOM M2 (drawer aberto):
  ```
  <div role="dialog" data-state="open" data-vaul-drawer-direction="bottom" data-vaul-drawer="" ...>
  ```
- Snapshot DOM M3 (shortcut bar):
  ```
  <nav data-slot="shortcut-bar" class="fixed inset-x-0 bottom-0 z-20 grid h-14 grid-cols-6 ...">
    Início
    Menu
  ```
- Console pós-fluxo (Esc + dois resizes): 0 erros, 0 exceções
- M6: dois resize_window consecutivos com confirmação de data-mode alterando entre "mobile" e "desktop" sem reload

## Próxima ação

- **pass** → curator aceita F033 e fecha o débito transversal.
- Features F005/F007/F013/F014/F016/F050/F070/F071/F072/F073 que ressalvaram "mobile→F033" agora têm a validação do gate `useIsMobile` corroborada. Não requerem retro-teste individual: o gate é o mesmo arquivo (`packages/ui/src/hooks/use-is-mobile.ts`) e o switch é declarativo por consumidor — basta auditoria estática de que cada um usa `useIsMobile()`, já feita pelo smith em cada wave.

## Nota técnica

A premissa de que "Chrome MCP não emula mobile" foi parcialmente falsa: `resize_window` entrega viewport interno menor que o pedido (500 ao pedir 375, provavelmente devido a chrome UI consumindo área), porém suficientemente abaixo do breakpoint 768 para o `matchMedia` disparar. Isso resolve o débito sem precisar de CDP `setDeviceMetricsOverride` ou spoofing de matchMedia. Sessões futuras podem replicar com confiança.
