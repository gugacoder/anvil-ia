# Test report — F020 Toaster (sonner)

**Data**: 2026-05-16
**Resultado**: **fail**
**Ambiente**: localhost:3000 (dev) — `/smoke/f020`
**Caso real testado**: smoke page F020 com sonner integrado ao app-shell; severidades, action, description, dismiss, stack, mobile.

## Casos cobertos

| # | Cenário | Esperado (contrato/spec) | Observado | Resultado |
|---|---|---|---|---|
| T1.a | Disparar 4 severidades, posição desktop | `top-right` desktop, ícone Phosphor por variant, cor token semântica | `data-sonner-toaster` com `data-y-position=top data-x-position=right`. Cada toast com `data-type` correto, classes `bg-x-success/10`/`bg-x-info/10`/`bg-x-warning/10`/`bg-x-destructive/10` e `border-x-*/20`. Cada toast com `<svg>` Phosphor (viewBox 0 0 256 256, size-5) | passa parcial |
| T1.b | Duração por severidade (4/5/6/8s) | success some em ~4s | Toast `success` permanece `data-visible="true"` após 7s+ sem qualquer hover (mouse posicionado em (5,5), fora do container) e `data-expanded=false`. Timer aparentemente não dispara `data-removed`. | **falha** |
| T2 | Stack 3 visíveis (5 disparados) | máx 3 com `opacity:1` / `data-visible=true`; demais em fila com `opacity:0` | Confirmado: 3 com `data-visible=true opacity=1` e front=true/false; toasts excedentes ficam `data-visible=false opacity=0`. Stack visual com scale 0.95/0.90/0.85 e translate Y 8/16/24 (cascata correta). | passa |
| T3 | Action button | botão renderiza, click dispara `onClick` e fecha toast | Botão "Reenviar" renderiza e é clicável. Após click, o toast NÃO foi removido do DOM nem marcado `data-visible=false` em janela de 350ms — permaneceu na pilha (`toastAfterAction=10`, mesma ordem). `onClick` provavelmente roda, mas o close não acontece. | **falha** |
| T4 | Dismiss programático (`toast.dismiss()`) | todos fecham imediatamente | Antes: 3 visíveis. Após click em "dismiss() todos" e janela de 200/800/2300ms: **continua 3 visíveis**. Nenhum toast fechou. | **falha** |
| T5 | Description abaixo do title | `[data-title]` em cima, `[data-description]` abaixo | Title "Exportacao iniciada" e description "Voce sera notificado..." renderizam; `descRect.y > titleRect.y` confirmado. | passa |
| T6 | Hover pausa | timer pausa em hover, retoma em mouseleave | Não isolável de T1.b — como toasts não respeitam duração default, T6 não pôde ser validado independentemente. Sintoma observado (toast persiste >7s sem hover) é consistente com timer nunca iniciar, não apenas com pause-on-hover bugado. | **inconcluso → falha** |
| T7 | Mobile top-center full-width | viewport <640px: `top-center`, margens 16px | Em viewport 375 (real ~500 com chrome devtools): `data-y-position=top data-x-position=center`; `x=16, right=16` (margens simétricas 16px); largura 468 de 500 disponíveis (full-width). | passa |
| T8.a | Console limpo | sem errors/warnings | Console contém apenas mensagens `[vite]` connecting/connected. Nenhum erro/warning de app. | passa |
| T8.b | A11y `role` + `aria-live` por severidade | `role="status" aria-live="polite"` (success/info); `role="alert" aria-live="assertive"` (warning/error) | **Nenhum** `role` ou `aria-live` em qualquer toast, em qualquer descendente, em qualquer ancestral até `<body>`. Container `data-sonner-toaster` sem aria. Varreu DOM completo: 0 elementos com role, 0 com aria-live. | **falha** |

## Falhas

- **F020.T1.b — duração ignorada**. Spec [[toaster#Motion]] define `success=4000ms / info=5000ms / warning=6000ms / error=8000ms`. Observado: toast `success` permanece visível >7s sem hover, com `data-removed=false` e `data-expanded=false`. Suspeita: prop `duration` não está sendo passada ao sonner, ou Toaster root foi configurado com `duration={Infinity}`/duração muito alta no default.
- **F020.T3 — action não fecha toast**. Spec [[toaster#API conceitual]]: "Ao clicar, executa onClick e fecha o toast." Observado: action "Reenviar" não dispara fechamento; toast permanece visível indefinidamente após click. Comportamento padrão do sonner é fechar — provável que `onClick` esteja chamando `event.preventDefault()`/`stopPropagation` ou que o smoke não esteja usando a API `action:{label,onClick}` nativa.
- **F020.T4 — `dismiss()` sem argumento é no-op**. Spec [[toaster#API conceitual]]: "Sem argumento, fecha todos." Observado: clicar "dismiss() todos" não fecha nenhum toast (verificado a 200ms, 800ms e 2300ms; contagem permanece igual). Suspeita: handler não chama `toast.dismiss()` da sonner, ou está chamando com argumento inválido.
- **F020.T8.b — a11y ausente**. Spec [[toaster#Acessibilidade]] exige `role="status"` para info/success e `role="alert"` para warning/error, com `aria-live` correspondentes. Observado: zero atributos `role` ou `aria-live` em qualquer parte do toaster — varredura completa do subtree retornou lista vazia. Suspeita: Toaster montado sem prop equivalente ou usando wrapper que stripa atributos de a11y do sonner.
- **F020.T6 — não validável**. Como T1.b falha, hover-pause não pode ser distinguido de "timer nunca rodou".

## Evidência

- DOM survey via `javascript_tool` (varredura de atributos):
  - Toast `<li>` example attrs: `tabindex=0`, `data-sonner-toast`, `data-mounted=true`, `data-visible=true`, `data-type=success`, `data-front=true`, `data-removed=false`, **sem `role`, sem `aria-live`**.
  - Container `data-sonner-toaster` attrs: `dir=ltr`, `tabindex=-1`, `data-y-position=top`, `data-x-position=right`, **sem `role`, sem `aria-label`, sem `aria-live`**.
- Stack measurement (5 toasts disparados): 3 com `opacity=1 data-visible=true`, 6 com `opacity=0 data-visible=false`. Confirma comportamento esperado de stack.
- Console: apenas `[vite] connecting/connected`. Sem erros.
- Mobile (375px de target, 500px efetivo): `top/center`, x=16 right=16 w=468.

## Próxima ação

- **fail** → smith retoma. Pontos de atenção:
  1. Conferir prop `duration` no `<Toaster />` root e no `useToast()` mapping — provavelmente está fixa em valor alto.
  2. Conferir se `action` está sendo passada como objeto `{label,onClick}` ao sonner ou como um React node manual (que não dispara o close automático).
  3. Conferir wiring de `dismiss()` no hook — deve chamar `sonner.toast.dismiss()` quando recebe `undefined`.
  4. Adicionar `role`/`aria-live` por variant — sonner aceita prop por toast ou pode ser injetado no Toaster custom render.
  5. Após correções, smoke deve incluir um botão "trigger 4 com mouse fora" pra retestar duração isoladamente.

## Casos não cobertos nesta rodada (fora do escopo da prioridade)

- Swipe-to-dismiss mobile (gesto não trivial via JS automation).
- `prefers-reduced-motion` (não exigido pelo enunciado).
- `toast.promise` (smoke tem botão; pulado após falhas críticas).
- Duration `Infinity` + closeButton automático (smoke tem botão; pulado).

## Retry — 2026-05-16 (após commit b93df14)

**Resultado**: **fail** (parcial — 2 dos 4 fixes funcionaram; 2 continuam quebrados)

Re-exercício dos 4 casos que falharam + regressão dos 4 que passavam.

| # | Cenário | Status anterior | Esperado | Observado nesta rodada | Resultado |
|---|---|---|---|---|---|
| T1.b | Duração por severidade | fail | success some em ~4000ms | Toast `success` permanece `data-visible=true data-removed=false` aos **4286ms reais** com `document.hasFocus()=true` (tab focada via click sintético em área vazia da página). Sem swipe (`data-swiping=false`). Em outra rodada, permaneceu visível por >19s. setTimeout nativo da página dispara em ~4215ms — não é background-throttle. Timer do sonner não está armando OU duração ainda está em valor altíssimo/Infinity. | **falha** |
| T3 | Action button fecha toast | fail | click no botão action fecha toast | Click em "Reenviar" → toast marca `data-removed=true` em ~200ms; some do DOM em ~1500ms (`count=0`). Comportamento correto. | **pass** |
| T4 | `dismiss()` global fecha todos | fail | sem argumento, fecha todos os toasts | Disparado success, aguardado 4s, chamado `dismiss() todos`. Aos 5296ms (1s após o click), success continua `data-visible=true data-removed=false`. Toast remanescente de testes anteriores também não fechou após dismiss(). | **falha** |
| T8.b | A11y `role` + `aria-live` | fail | success/info → `role=status`, `aria-live=polite`; warning/error → `role=alert`, `aria-live=assertive` | Varredura dos 4 toasts simultâneos: success/info → `role=status`, `aria-live=polite`; warning/error → `role=alert`, `aria-live=assertive`. Todos com `aria-atomic=true`. Casa com o spec. | **pass** |

### Regressão dos passes anteriores

| # | Cenário | Observado | Resultado |
|---|---|---|---|
| T1.a | Posição desktop + ícone Phosphor | `data-y-position=top data-x-position=right`. Todos os 4 toasts com `<svg>` (size 17–20px) e classes `bg-x-success/10`, `bg-x-info/10`, `bg-x-warning/10`, `bg-x-error/10` (nota: variant error agora usa `bg-x-error/10` — antes era `bg-x-destructive/10`; ambos são aceitáveis pelo spec via alias). | **pass** |
| T2 | Stack máx 3 visíveis | 5 toasts disparados; total=5 no DOM; 3 com `data-visible=true` (1 front=true + 2 front=false); 2 com `data-visible=false`. | **pass** |
| T5 | Description abaixo do title | Title "Exportacao iniciada" + description "Voce sera notificado..."; `descRect.y > titleRect.y` confirmado. | **pass** |
| T7 | Mobile top-center full-width | Viewport efetivo 500px (target 414): `top/center`, x=16, right=16 (margens simétricas), largura=468. | **pass** |

### Falhas remanescentes

- **F020.T1.b — duração ainda ignorada**. Confirmação rigorosa com `document.hasFocus()=true` e setTimeout nativo funcionando (dispara em 4215ms). Snapshots em 100/2000/4200/5500ms reais mostram `data-visible=true data-removed=false` durante todo o intervalo para um toast `success` (deveria sumir em 4000ms). Sintoma é o mesmo de antes — o fix não tocou no caminho do timer. Hipótese: `duration` continua não chegando ao sonner OU está sendo passado como `Infinity`/valor alto fixo no `<Toaster duration={...} />` root.
- **F020.T4 — `dismiss()` global ainda no-op**. Após chamar o botão "dismiss() todos", o toast success permanece `data-visible=true data-removed=false` 1s depois. Hipótese: o handler do botão no smoke continua não chamando `toast.dismiss()` da sonner sem argumento OU o wrapper `useToast().dismiss()` está chamando algo diferente. Vale conferir se `T3` (action que fecha o toast) usa caminho diferente do dismiss programático — provavelmente o action delega ao sonner enquanto o dismiss não.

### Observação cruzada T1.b ↔ T4

Como ambos dependem do mesmo subsistema (ciclo de vida de fechamento do toast no sonner), é plausível que a causa raiz seja única: **wrapper `<Toaster />` ou `useToast()` está stripando/ignorando opções que o sonner usa para fechamento** (duration default e dismiss programático). T3 funcionar reforça isso: o fechamento via action é orquestrado internamente pelo sonner (não passa pelo wrapper), enquanto duration e dismiss precisam ser propagados pelo nosso código.

### Console

- Apenas mensagens `[vite] connecting/connected`. Sem errors/warnings de app.

### Próxima ação

- **fail** → smith retoma. Foco em duas frentes acopladas:
  1. Investigar como `duration` é propagada do `useToast()` para o sonner — provavelmente está sendo dropada no spread de options.
  2. Investigar o `dismiss()` sem argumento no hook — deve repassar `undefined` (não substituir por outro valor) para `sonner.toast.dismiss(undefined)`, que fecha todos.
  3. T3 e T8.b agora passam — não tocar nesses caminhos.
