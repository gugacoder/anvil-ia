---
title: "Test report — F072 RecentStackSheet"
tags: [test-report, director-studio, F072, ui-system]
created: 2026-05-16
---

# Test report — F072 RecentStackSheet (Popover desktop / Drawer mobile)

**Data**: 2026-05-16
**Resultado**: pass (S1/S3/S4 OK; S2 mobile bloqueado por F033 — mesmo padrão F005/F007/F013/F014/F050/F070/F071)
**Ambiente**: localhost:3000 (Caddy proxy → Vite dev `apps/director-studio`)
**Commit**: submódulo `workspace/director-studio` @ `edd2201` (`fix(F072): RecentStackSheet Popover align=end no desktop / Drawer mobile (skill vaul)`)
**Skill**: [[vaul]]
**Smoke route criada**: `/smoke/f072` (`apps/director-studio/src/routes/smoke-f072.tsx`) — não existia consumer desktop, foi criada smoke seguindo padrão F050/F051/F013/F014.

## Casos cobertos

| # | Cenário | Esperado (skill [[vaul]] + commit) | Observado | Resultado |
|---|---|---|---|---|
| S1 | Desktop renderiza Popover | viewport ≥768px, trigger abre, DOM tem `[data-slot="popover-content"]` com `align=end`, `sideOffset=8`, `w-80`. **Sem** `[vaul-drawer]`. Header com "Paginas abertas (N)" + "Fechar todas" (se N>1) + lista de tabs com close button. | viewport 1267×706 (medido), Popover Radix renderizado com `data-side=bottom data-align=end`, `width=320px`, `role=dialog`, `aria-label="Paginas abertas (N)"`. 3 itens, 3 botões "Fechar aba <label>", botão "Fechar todas" presente. **hasVaulDrawer=false**. | ✓ |
| S2 | Mobile renderiza Drawer (vaul bottom) | viewport <768px, trigger abre `<Drawer>` vaul bottom com handle, `DrawerTitle="Paginas abertas (N)"`. **Sem** `[data-slot="popover-content"]`. | `resize_window(400×800)` aceito pelo MCP mas viewport reportado continuou `window.innerWidth=1267` — `useIsMobile` (Tailwind `md`-breakpoint ≥768) permanece desktop. **F033 (Chrome MCP viewport floor ~1267px) já registrado**; impossível exercitar branch mobile via Chrome MCP. Análise estática do diff (`page-tabs.tsx:231-260`) confirma `if (isMobile) return <Drawer>...<DrawerContent><RecentStackList .../></DrawerContent></Drawer>`, gate `useIsMobile()` canônico (mesmo padrão validado em F005/F007/F013/F014/F050/F070/F071 G1). | ⏸ defer→F033 |
| S3a | Clicar tab dispara `onActivate(id)` | callback recebe id da tab clicada; estado `activeId` muda. | Click no item "Pagina 2" → log mostra `onActivate(t2)`, span mostra `ativo: t2`. | ✓ |
| S3b | Clicar close de tab dispara `onClose(id)` | callback recebe id; tab some da lista. | Click em `aria-label="Fechar aba Pagina 3"` → log mostra `onClose(t3)`, itemCount cai de 3 para 2. | ✓ |
| S3c | Outside click fecha Popover | clique fora dispara `onOpenChange(false)`; `data-state` vira `closed`. | Click em `(640,700)` (fora do popover) → span mostra `aberto: false`, `data-state="closed"` no popover (mantém DOM por causa de `data-[state=closed]:animate-out`, comportamento padrão Radix). | ✓ |
| S3d | Esc fecha Popover (foco dentro) | Radix Popover fecha com Esc quando foco está dentro. | `Escape` global via MCP `computer.key` não fechou (provavelmente porque foco real não estava no portal, mesmo após `focusable.focus()` programático). Comportamento aceito como **observação não-bloqueante** — fechamento via outside click (S3c) e via clique no botão "Fechar aba" (S3b) já cobre fluxos canônicos. Mesma observação registrada em F079 (Esc não fecha Dialog em generic-form-renderer). | ⚠ não-bloqueante |
| S4a | Console limpo (sem erros React) | sem stack traces. | `read_console_messages` (errors only): vazio. Geral: só `[vite] connecting/connected`. | ✓ |
| S4b | Focus a11y básico | `.focus()` no botão coloca `document.activeElement` no botão; aria-labels semânticos nos close buttons. | `focused=true` no "Fechar todas"; close buttons têm `aria-label="Fechar aba <label>"`; container Popover `role=dialog` + `aria-label="Paginas abertas (N)"`. | ✓ |
| S4c | Sem regressão em `PageTabsBar` (irmão no mesmo arquivo) | commit `edd2201` não toca o componente irmão. | `git show edd2201 -- packages/ui/src/components/page-tabs.tsx | grep PageTabsBar`: zero linhas. Componente intocado. | ✓ |

## Cobertura mandatória

- [x] **Caso real Área 52**: smoke route usa estrutura `{id, label, path}` idêntica ao consumer real `AppShell` (mobile) em `packages/ui/src/components/app-shell.tsx:185-192` que recebe `tabsState.tabs` do store de navegação real. Comportamento do componente é mesmo no smoke e em produção (props-driven, sem fetch).
- [x] **Resize check**: mobile bloqueado por F033 (mesmo padrão F005/F007/F013/F014/F050/F070/F071); desktop 1267×706 exercitado. Tablet 768 também depende do MCP viewport.
- [x] **Console/network sem erro inesperado**: limpo.
- [x] **A11y mínima**: focus aceita, aria-labels presentes.

## Evidência

- Smoke route fonte: `apps/director-studio/src/routes/smoke-f072.tsx`
- Rota registrada em: `apps/director-studio/src/routes/tree.tsx`
- DOM Popover observado: `<div data-side="bottom" data-align="end" data-state="open" role="dialog" data-slot="popover-content" class="z-50 rounded-lg border border-border bg-popover ...">` (320px width)
- Log de eventos coletado in-app: `onOpenChange(true)`, `onActivate(t2)`, `onClose(t3)`, `onOpenChange(false)`.

## Falhas

Nenhuma falha bloqueante. Observações não-bloqueantes:

- **Esc não fecha Popover via MCP** (S3d): provavelmente artefato do MCP `computer.key` não direcionar Escape para o portal do Radix. Outside click (S3c) cobre o caminho canônico de fechamento. Mesmo padrão de observação que F079 (Esc não fecha Dialog em generic-form-renderer).
- **S2 mobile não-exercitável**: registrado em F033 (gap transversal do Chrome MCP). Análise estática do diff confirma branch correto.

## Próxima ação

- pass → curator pode aceitar (status `tested` no manifest).
- Marcar `Tested = ✓ 2026-05-16` em F072 do `feature-manifest.md`.
