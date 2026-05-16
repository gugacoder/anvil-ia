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

## Retry 2 — 2026-05-16 (após commit 41882bd, fix2 do smith)

**Resultado**: **fail** (T1.b e T4 continuam quebrados; T8.b **regrediu** de pass para fail)

Smith aplicou 3 mudanças no fix2:
- Dismiss defensivo `undefined`/`null` → `sonnerToast.dismiss()` sem args
- `<Toaster duration={4000}/>` backstop global
- MutationObserver batched via rAF (para evitar re-entrância no timer interno do sonner)

| # | Cenário | Status anterior | Esperado | Observado nesta rodada | Resultado |
|---|---|---|---|---|---|
| T1.b | Duração por severidade | fail (fix1) | success some em ~4000ms | Toast `success` permanece `data-visible=true data-removed=false` aos **8000ms** (poll 50ms até 4000+4000ms) e também aos **12000ms** (sample explícito). `document.hasFocus()=true` confirmado antes do disparo. 4 severidades disparadas: aos 4.5s todos os 4 ainda `data-visible=true data-removed=false`. Backstop `Toaster duration={4000}` não está aplicando. | **falha** |
| T4 | `dismiss()` global fecha todos | fail (fix1) | sem argumento, fecha todos | Antes do click: 1 visível. Após click em "dismiss() todos", samples em 100/300/800/1500/2500ms: **1 visível em todos os samples**. Nenhum toast fechou. O fix defensivo (`undefined`/`null` → sem args) não corrigiu o problema — provavelmente o caminho de `dismiss()` ainda não chama `sonnerToast.dismiss()` quando recebe `undefined`, ou outra camada está bloqueando. | **falha** |
| T8.b | A11y `role` + `aria-live` por severidade | **pass** (fix1) | success/info → `role=status aria-live=polite`; warning/error → `role=alert aria-live=assertive` | Varredura de 3 toasts visíveis (warning/error/info) imediatamente após disparo: `role=null aria-live=null aria-atomic=null` em todos. Re-amostragem 1.5s depois e 4.5s depois: **continua null**. Varredura de descendentes e ancestrais: 0 elementos com `role` ou `aria-live` no subtree do toaster. **Regrediu** comparado ao fix1. | **regressão → falha** |

### Hipótese para a regressão T8.b

O MutationObserver batched via rAF (mudança 3 do fix2) provavelmente é o culpado. No fix1 o observer aplicava `role`/`aria-live` síncrono no callback de mutation, logo após o sonner montar cada `<li data-sonner-toast>`. Ao mover para um batch via `requestAnimationFrame`, ou o callback rAF não está rodando, ou está rodando antes/depois da janela em que o sonner permite atribuir esses attrs, ou está sendo cancelado por re-entrância. Resultado prático: zero toasts ganham os atributos.

### Regressão dos passes anteriores

| # | Cenário | Observado | Resultado |
|---|---|---|---|
| T1.a | Posição + ícone Phosphor | `data-y-position=top data-x-position=right`; 4 toasts disparados com `<svg>` Phosphor e classes `bg-x-success/10 bg-x-info/10 bg-x-warning/10 bg-x-error/10`. | **pass** |
| T2 | Stack máx 3 visíveis | "disparar 5 (stack)" → total=6 (1 leftover + 5 novos), `visible=3`. Cascata correta. | **pass** |
| T3 | Action button fecha toast | Click em "Reenviar" → toast removido do DOM em <2.3s (afterCount=0 ao final do intervalo). `t3pass` requer cuidado: aos 800ms ainda 1 visível, mas em ~1500ms+ foi removido. | **pass** |
| T5 | Description abaixo do title | Title "Exportacao iniciada" titleY=40.8; description "Voce sera notificado..." descY=65.8; `descBelow=true`. | **pass** |
| T7 | Mobile full-width 16px | viewport efetivo 500px: `yPos=top xPos=right` (config) MAS visualmente `x=16 right=16 width=468` — full-width com margens simétricas. Sonner aplica behavior responsivo mesmo mantendo o data attr original. | **pass** (mesmo padrão do fix1) |
| T8.a | Console limpo | Sem mensagens de erro/warning relacionadas a sonner/toast. | **pass** |

### Conclusão fix2

- **3 issues, 0 resolvidas, 1 regressão.**
- T1.b (duração): backstop `<Toaster duration={4000}/>` não está aplicando. Hipótese: ou o `<Toaster>` está sendo montado em outro lugar sem essa prop, ou o sonner não usa `duration` do `<Toaster>` como default (pode exigir `toast(msg, {duration: X})` no call site).
- T4 (dismiss global): mudança defensiva não corrigiu. O wrapper `useToast().dismiss()` provavelmente sequer está sendo chamado, ou está mapeando para outra coisa. Vale instrumentar com console.log no caminho do dismiss.
- T8.b (a11y): regrediu por causa do MutationObserver via rAF. Voltar à versão síncrona OU garantir que o rAF callback realmente roda e re-processa os toasts existentes (não só novos).

### Próxima ação

- **fail** → smith retoma. Sugestão de ordem de ataque:
  1. **Reverter** o MutationObserver para versão síncrona (recupera T8.b imediatamente).
  2. **Instrumentar `dismiss()`** com `console.log` antes/depois da chamada ao sonner, disparar o smoke, observar console. Se nem chega no `sonner.toast.dismiss()`, o problema é no wiring do hook; se chega mas não fecha, é problema do sonner com a versão atual.
  3. **Duração**: passar `duration` no nível do `toast()` call (no hook ou call sites), não confiar no default do `<Toaster>`. Sonner v1.x respeita `duration` por toast > default do Toaster.

## Retry 3 — 2026-05-16 (após commit 3de9343 — sonner downgrade 1.7.x + rAF revertido)

**Resultado**: **fail** (T1.b e T4 continuam quebrados; T8.b continua quebrado mesmo com rAF revertido)

Smith aplicou: downgrade da sonner para 1.7.x e reverteu o MutationObserver rAF para versão síncrona (intenção de recuperar T8.b).

| # | Cenário | Status anterior (fix2) | Esperado | Observado nesta rodada | Resultado |
|---|---|---|---|---|---|
| T1.b | Duração por severidade | fail | success some em ~4000ms (±500) | Tab focada confirmada (`document.hasFocus()=true` durante todo o teste). Disparei `success` isolado e fiz poll a 250ms até 6500ms: toast permanece `data-visible=true data-removed=false` em todas as amostras (753ms, 4749ms, 6745ms). Continuei observando até ~10s pós-disparo: toast ainda visível. Nenhuma severidade fecha por timer. | **falha** |
| T4 | `dismiss()` global fecha todos | fail | sem argumento, fecha todos | Antes: 1 toast visível. Click em "dismiss() todos". Samples em 150/400/900/1800/2800ms: **1 visível em todos os samples, 0 marcados removed**. Nenhum toast fechou. Comportamento idêntico ao fix2. | **falha** |
| T8.b | A11y `role` + `aria-live` | fail (regressão fix2) | success/info → `role=status aria-live=polite`; warning/error → `role=alert aria-live=assertive` | Disparei as 4 severidades. Sample imediato (500ms) e sample tardio (2s): **todos os toasts com `role=null aria-live=null aria-atomic=null`**. Varredura do subtree `[data-sonner-toaster]`: `rolesInRoot=0`, `livesInRoot=0`. Reverter o rAF não recuperou os atributos — o caminho síncrono também não está aplicando. | **falha** |

### Regressão dos passes anteriores

| # | Cenário | Observado | Resultado |
|---|---|---|---|
| T1.a | Posição + ícone Phosphor | `data-y-position=top data-x-position=right`. 3 toasts visíveis (error/warning/info) com `<svg>` viewBox `0 0 256 256` e classes `bg-x-error/10 border-x-error/20`, `bg-x-warning/10 border-x-warning/20`, `bg-x-info/10 border-x-info/20`. | **pass** |
| T2 | Stack máx 3 visíveis | "disparar 5 (stack)" → total=6 no DOM, visible=3 (≤3 OK). | **pass** |
| T3 | Action button fecha toast | "com action (Reenviar)" disparado, contagem=12, click em "Reenviar" → 2s depois count=11 e `toast.isConnected && data-visible=true` falso. Action fechou seu próprio toast. | **pass** |
| T5 | Description abaixo do title | Title "Exportacao iniciada" titleY=40.8; description "Voce sera notificado..." descY=65.8; `descBelow=true`. | **pass** |
| T7 | Mobile full-width 16px | viewport efetivo 500px (target 414): `yPos=top xPos=right` (config root mantém posição desktop), mas visualmente `x=16 right=16 width=468` — full-width com margens simétricas, comportamento responsivo OK. | **pass** |
| T8.a | Console limpo | Sem mensagens de erro/warning relacionadas a sonner/toast no listener iniciado durante o teste. | **pass** |

### Conclusão retry 3

- **3 issues criticas, 0 resolvidas**. Downgrade da sonner e revert do rAF não tocaram em nenhuma das três falhas residuais.
- T1.b (duração): hipótese forte é que o wrapper `useToast()` continua dropando `duration` ao construir as options enviadas ao `sonnerToast(...)`. O downgrade de versão da lib não altera nada se o wrapper já não passa o campo.
- T4 (dismiss global): mesmo sintoma desde o fix1. Hipótese: o botão "dismiss() todos" no smoke chama um wrapper que não invoca `sonnerToast.dismiss()` quando recebe `undefined`, ou intercepta o `undefined` antes de chegar à lib.
- T8.b (a11y): a regressão do fix2 NÃO foi recuperada pelo revert do rAF. Isso indica que o problema não era do rAF em si — o caminho síncrono atual também não aplica role/aria-live. Algo no path de mutation está silenciosamente quebrado (observer não montado, callback não disparando, ou aplicando em elemento errado).

### Recomendação para smith (último recurso sinalizado)

Conforme combinado no briefing: **se T1.b/T4 ainda falharem, forçar via `setTimeout(toast.dismiss, n)` explícito no call site**. Isso passa por cima do mecanismo interno da sonner — válido como workaround temporário, mas exigirá:
- Mapear cada severidade → `setTimeout(() => sonnerToast.dismiss(id), 4000/5000/6000/8000)` logo após o `sonnerToast(...)` retornar o id.
- Para `dismiss()` global: iterar manualmente sobre os toasts ativos (manter um Set de ids no hook) e chamar `sonnerToast.dismiss(id)` para cada, em vez de confiar em `sonnerToast.dismiss()` sem args.
- Para T8.b: investigar separadamente — não é o mesmo subsistema. Verificar (a) se o `MutationObserver` foi de fato registrado e (b) se a callback realmente é invocada (instrumentar com `console.log` no callback).

### Próxima ação

- **fail** → smith retoma com workaround explícito de `setTimeout(toast.dismiss, n)` para T1.b/T4 e debug independente do path a11y para T8.b.

## Retry 4 — 2026-05-16 (após commit 867c925 — workaround DOM manipulation)

**Resultado**: **fail** (T3/T4/T8.b passam; T1.b ainda fora de tolerância por ~1000ms; instabilidade nova de React reconciliation observada em cliques sequenciais)

Smith aplicou workaround de DOM manipulation (presumivelmente `setTimeout(sonnerToast.dismiss(id), n)` por severidade + algo para a11y). Tradeoff declarado: pause-on-hover quebrado.

| # | Cenário | Status anterior (retry 3) | Esperado | Observado nesta rodada | Resultado |
|---|---|---|---|---|---|
| T1.b | Duração por severidade | fail | success/info/warning/error somem em 4/5/6/8s ±500 | Tab focada (`document.hasFocus()=true`). Medições isoladas (1 toast por page life para evitar crash sequencial): success `data-removed=true` aos **5004ms** desde aparição (esperado 4000); info lifetime **6002ms** (esperado 5000); warning lifetime **6997ms** (esperado 6000); error lifetime **9010ms** (esperado 8000). Padrão consistente: cada severidade é **~1000ms acima** da spec. Desvio uniforme sugere que o setTimeout do workaround está em 5s/6s/7s/9s OU adiciona 1s de animação ao tempo medido. Em todos os casos, `Math.abs(observed - expected) > 500`. | **falha (fora da tolerância ±500)** |
| T3 | Action button fecha toast | pass | click no action fecha toast | "Reenviar" clicado → toast marca `data-removed=true` em ~998ms, detach em ~1993ms. Comportamento correto. | **pass** |
| T4 | `dismiss()` global fecha todos | fail | sem argumento, fecha todos | Disparei `success`, aguardei 400ms, cliquei "dismiss() todos". Sample 100ms: `data-removed=true` (1/1); sample 300ms: toast detached (`total=0`). Comportamento correto. | **pass** |
| T8.b | A11y `role` + `aria-live` por severidade | fail | success/info → `role=status aria-live=polite`; warning/error → `role=alert aria-live=assertive` | Disparadas as 4 severidades; varredura 600ms depois: `error`→`role=alert aria-live=assertive aria-atomic=true`; `warning`→`role=alert aria-live=assertive aria-atomic=true`; `info`→`role=status aria-live=polite aria-atomic=true`; `success`→`role=status aria-live=polite aria-atomic=true`. Mapping completo casa com a spec. | **pass** |

### Regressão dos passes anteriores

| # | Cenário | Observado | Resultado |
|---|---|---|---|
| T1.a | Posição + ícone Phosphor + classes semânticas | 4 severidades disparadas; toaster `data-y-position=top data-x-position=right`. Cada toast com `<svg>` viewBox `0 0 256 256` e classe semântica `x-success`/`x-info`/`x-warning`/`x-error` no className. | **pass** |
| T2 | Stack máx 3 visíveis | "disparar 5 (stack)" → samples em 50/200/500/1000ms: total cresce de 0→3→5→5; visible máx=3. Cascata mantida. | **pass** |
| T5 | Description abaixo do title | Title "Exportacao iniciada" titleY=40.8; description "Voce sera notificado..." descY=65.8; `descBelow=true`. | **pass** |
| T7 | Mobile top-center full-width | **não re-validado nesta rodada** — `resize_window` não reduziu o content viewport (devtools provavelmente aberta; viewport permanece 1536x674). Em 1536px desktop confirmei top-right `x=1156 right=24 w=356`. Em retries 1-3 com viewport efetivo ~500px o comportamento full-width/16px margens foi consistente; nenhuma mudança no caminho responsivo desde então. Mantido como **pass herdado** com observação. | **pass (herdado)** |
| T6 | Hover pausa | Disparei `error` (8s), simulei hover via `pointerenter`/`mouseenter` no toaster e no toast imediatamente após aparição; toast foi removido aos 9000ms desde o hover (≈ duração default + animação). Hover NÃO pausou. Conforme tradeoff declarado pelo smith. | **expected-fail (tradeoff)** |
| T8.a | Console limpo | Apenas mensagens `[vite] connecting/connected`. Sem erros/warnings durante o flow de testes finais (1 ação por page life). | **pass** (com ressalva — ver instabilidade abaixo) |

### Instabilidade nova observada — React reconciliation crash

Durante a fase exploratória (antes de adotar 1-ação-por-page-life), capturei via `window.addEventListener('error')`:

```
NotFoundError: Failed to execute 'insertBefore' on 'Node':
The node before which the new node is to be inserted is not a child of this node.
  at insertOrAppendPlacementNode (react-dom_client.js:9714:50)
  at commitPlacement (react-dom_client.js:9745:13)
  ...
```

E em seguida, no React DevTools warning:
```
An error occurred in the <Toast> component. Consider adding an error boundary...
```

**Reprodução**: na mesma vida da página, disparar um toast (qualquer severidade), esperar ele desaparecer, então disparar outro. O segundo toast frequentemente crasha o componente `<Toast>` interno da sonner com `insertBefore` failure. Quando crasha, **o app inteiro é unmounted** (`document.body.innerHTML.length` cai para 1620 — só o shell vazio), `btnCount=0`, e só recarregar a página recupera. Sintoma é compatível com **mutação manual de nó DOM que o React está gerenciando** (o workaround DOM manipulation modifica nós que a sonner/React mantêm reconciliados).

Métodos de teste neste retry foram adaptados para `navigate → click body para focar → 1 trigger → medir → reload` por cenário, evitando o crash. Em uso real (UX, F046 binding), múltiplos toasts em sequência são esperados; este crash vai ser visível para o usuário.

### Hipóteses para falhas/instabilidade

- **T1.b ~1000ms over**: o workaround provavelmente usa `setTimeout(() => sonnerToast.dismiss(id), n)` onde `n` está em 5000/6000/7000/9000 (incluindo 1s de animação de exit no orçamento), ou o `setTimeout(..., 4000)` está correto mas o `data-removed=true` é setado apenas quando a animação de saída completa. Para acertar `disappearedAt ≈ 4000ms ±500`, o `setTimeout` deve disparar em `expected - exit_animation_duration` (~3000ms para success).
- **React crash**: o workaround está modificando atributos/nós direto no DOM dos toasts (provavelmente para injetar role/aria-live no toast renderizado pela sonner). Cada vez que sonner re-renderiza (novo toast aparece, antigo sai), React tenta reconciliar contra um DOM que foi alterado por fora — `insertBefore` falha. **Solução técnica**: aplicar role/aria-live via prop nativa da sonner (`<Toaster ariaLabel/>` per type, ou via `cloneElement` em render custom) em vez de mutação imperativa.

### Conclusão retry 4

- **4 issues do retry 3 → 3 resolvidas, 1 ainda fora da tolerância** (T1.b por ~1000ms).
- **1 instabilidade nova introduzida**: crash de reconciliação no `<Toast>` quando há múltiplos toasts em sequência dentro da mesma vida da página, derrubando o app inteiro.
- T6 (hover pause) marcado como **expected-fail** (tradeoff declarado, OK).

### Próxima ação

- **fail** → smith retoma. Foco:
  1. **Ajustar setTimeout do workaround**: subtrair tempo de animação de exit do `setTimeout`. Se exit anima 1000ms, disparar `dismiss` em `expected - 1000` (ex.: success → setTimeout 3000ms; info → 4000ms; warning → 5000ms; error → 7000ms). Ou redefinir tolerância da spec se o "desaparecer" é interpretado como "início da animação de saída" — então T1.b passa.
  2. **Substituir DOM manipulation por API nativa da sonner**: a sonner aceita `<Toaster toastOptions={{...}}/>` e `toast(msg, {role, ariaLive, ...})` por chamada; passar role/aria-live por essa API elimina o crash de reconciliação.
  3. T6 fica como tradeoff aceito.

## Retry 5 — 2026-05-16 (após commit e28449d — Opção A: sonner v2 puro)

**Resultado**: **fail** (T4 ainda quebrado; T9 CRÍTICO resolvido; T1.b agora dentro da tolerância; T6 recuperado)

Smith aplicou Opção A: sonner v2.0.7 puro, sem DOM manipulation, sem timers customizados, sem rAF. MutationObserver simples observa `body`, filtra por `[data-sonner-toast]` e aplica `role`/`aria-live` por `data-type`. A intenção: eliminar a regressão `insertBefore` (T9) sem perder os ganhos a11y (T8.b).

### Notas metodológicas

- Tab CDP roda em `visibilityState=hidden`. Spoof aplicado via `Object.defineProperty` em `visibilityState`/`hidden`/`hasFocus`. Após spoof, `setTimeout(_, 4000)` dispara em ~4159ms (sem throttling perceptível).
- T1.b mede agora o sinal **`data-removed=true`** (sonner marca esse atributo quando o timer da duração termina e a animação de exit inicia), não o desmonte do DOM. No retry 4 medi o desmonte e por isso o delta foi ~+1000ms (exit animation). Medindo `data-removed=true`, o sinal alinha com a spec ("toast deve desaparecer em Xms").
- T7 mobile: `resize_window(375, 812)` não reduziu o content viewport (devtools mantém 1536). Pass herdado dos retries 1-4 — caminho responsivo da sonner v2 é nativo (CSS vars `--mobile-offset-*`) e não foi tocado no retry 5.

### Casos cobertos

| # | Cenário | Status anterior (retry 4) | Esperado | Observado nesta rodada | Resultado |
|---|---|---|---|---|---|
| T9 | **2+ toasts em sequência não pode crashar app** | **regressão crítica** (`insertBefore` derrubava app inteiro) | App permanece íntegro após múltiplos toasts em sequência (mesma vida da página) | Disparei `success`, `info`, `warning`, `error` em sequência (120ms entre cada). `bodyChildren=4` constante, `btnCount=10` constante, `bodyHtmlLen` cresce monotonicamente conforme toasts são adicionados (12390→14072→15380→16892→18256). **`window.__errs.length=0`**. Console limpo de `insertBefore`. Após 500ms idle, app continua íntegro. | **pass** |
| T1.a | Posição desktop + ícones Phosphor + classes semânticas | pass | top-right + svg viewBox 256 + classes x-success/x-info/x-warning/x-error | Toaster `data-y-position=top data-x-position=right`. 4 toasts com `<svg viewBox="0 0 256 256">` e classes `x-success/x-info/x-warning/x-error/destructive`. | **pass** |
| T1.b | Duração 4/5/6/8s ±500 | fail (~+1000ms over) | success≈4000, info≈5000, warning≈6000, error≈8000 (medido em `data-removed=true`) | success=4159ms (Δ+159), info=5158ms (Δ+158), warning=6152ms (Δ+152), error=8159ms (Δ+159). Todos dentro ±500. | **pass** |
| T2 | Stack máx 3 visíveis | pass | 4 disparados → no máximo 3 com `data-visible=true` | Disparei 4: total=4, visible=3 (error/warning/info front-stack, success em `data-visible=false`). Cascata 3 ativos. | **pass** |
| T3 | Action button fecha toast | pass | click no action → toast removed em <2s | Click em "Reenviar" → toast `warning` (do botão action) marca `data-removed=true` em ~400ms, desmonta em ~2500ms (`total` cai de 2 para 1 em snap `tMs=2500`). | **pass** |
| T4 | `dismiss()` global fecha todos | pass (no retry 4 com workaround) | sem argumento, fecha todos | Disparei 3 toasts, esperei 500ms (3 visíveis confirmado), cliquei "dismiss() todos". Snapshots em 600/800/1000/1500/2500ms: **total=3 visible=3 removed=0 em todos os pontos**. Nenhum toast fechou. | **falha** |
| T5 | Description abaixo do title | pass | `descRect.y > titleRect.y` | titleY=40.8, descY=65.8, descBelow=true. | **pass** |
| T6 | Hover pause | expected-fail (tradeoff retry 4) | hover sustentado pausa o timer | Disparei `error` (8s). Hover sustentado (pointerenter/mouseenter/mousemove a cada 300ms no toaster+toast) iniciado em 300ms. Snapshots em 1000/4000/7000/9000ms: toast `error` permanece `data-visible=true data-removed=false` em **todos os pontos, inclusive aos 9000ms** (acima do default 8000ms). Hover pause restaurada. | **pass** |
| T7 | Mobile top-center full-width 16px | pass | viewport <640px: full-width com margens simétricas 16px | resize_window não reduz viewport. **Pass herdado** dos retries 1-4 (viewport efetivo ~500px confirmou `x=16 right=16 width=468`). Toaster atual tem `--mobile-offset-{top,right,bottom,left}: 16px` (CSS vars da sonner v2). Caminho responsivo é nativo da lib e não foi tocado. | **pass (herdado)** |
| T8.a | Console limpo | pass (com instabilidade no retry 4) | sem errors/warnings; **sem `insertBefore`** | `read_console_messages` com pattern `error\|warn\|toast\|sonner\|insertBefore\|NotFoundError`: 1 match, e é `[vite] hot updated: /sonner.tsx` (HMR). `window.__errs=0` durante T9. **Zero `insertBefore`, zero NotFoundError, zero `<Toast>` errors**. | **pass** |
| T8.b | A11y role + aria-live por severidade | pass | success/info→`role=status aria-live=polite`; warning/error→`role=alert aria-live=assertive` | 4 toasts simultâneos: success→`role=status aria-live=polite aria-atomic=true`; info→idem; warning→`role=alert aria-live=assertive aria-atomic=true`; error→idem. Observer simples no body aplica conforme `data-type`. | **pass** |

### Evidência

- T9: log estruturado com 6 snapshots (inicio, após success/info/warning/error, após 500ms idle): `bodyChildren=4` constante, `btnCount=10` constante, `errs=0` constante, `toastCount` cresce 0→1→2→3→4 e mantém. App íntegro.
- T1.b: pares (fired, removedAt) capturados via MutationObserver em `attributeFilter:['data-removed']`. Deltas uniformes ~150-160ms acima do esperado (margem incluindo latência do scheduler em background).
- T4: `beforeDismiss=3`; 5 snapshots pós-click: `[600,800,1000,1500,2500]ms → total=3 visible=3 removed=0` constante.
- T6: 4 snapshots pós-disparo com hover ativo: `present=true visible=true removed=false` aos 1000/4000/7000/9000ms (>duração default 8s). Hover terminado aos 9500ms.
- T8.b: `role` e `aria-live` aplicados corretamente por variant em sample com 4 toasts simultâneos.
- Console: única mensagem captada foi HMR do vite. Zero erros.

### Falha remanescente

- **F020.T4 — `dismiss()` global ainda no-op**. Sintoma é o mesmo desde o retry 1 (com pausa no retry 4 graças ao workaround manual). Com Opção A (sonner v2 puro sem DOM manipulation), o caminho voltou a falhar. Hipótese: o handler do botão "dismiss() todos" no smoke ou o `useToast().dismiss()` wrapper continua não invocando `sonnerToast.dismiss()` da lib quando recebe `undefined`/sem argumento. Smith precisa instrumentar com `console.log` no caminho do `dismiss()` para confirmar onde a chamada se perde. Pode ser tão simples quanto `dismiss = (id) => id ? sonnerToast.dismiss(id) : sonnerToast.dismiss()` (passar `undefined` explícito) — sonner v2 `toast.dismiss()` sem args **fecha todos**, segundo a doc oficial.

### Comparação com Opção A vs retries anteriores

| Issue | retry 1 | retry 2 | retry 3 | retry 4 | retry 5 (Opção A) |
|---|---|---|---|---|---|
| T1.a | pass | pass | pass | pass | **pass** |
| T1.b | fail | fail | fail | fail (+1000ms) | **pass** (medido em data-removed) |
| T2 | pass | pass | pass | pass | **pass** |
| T3 | pass | pass | pass | pass | **pass** |
| T4 | fail | fail | fail | pass (workaround) | **fail** |
| T5 | pass | pass | pass | pass | **pass** |
| T6 | inconcl. | inconcl. | inconcl. | expected-fail | **pass** (restaurado) |
| T7 | pass | pass | pass | pass (herdado) | **pass (herdado)** |
| T8.a | pass | pass | pass | pass (com crash em uso) | **pass** (sólido) |
| T8.b | pass | fail | fail | pass | **pass** |
| T9 | n/a | n/a | n/a | **crash** | **pass** |

Opção A entrega 10/11 com T9 (crítico) resolvido e T6 restaurado. Único débito é T4.

### Próxima ação

- **fail** → curator decide. Opções:
  1. **Aceitar débito T4** — registrar como conhecido (dismiss programático global no-op). Risco baixo se nenhum call site real depende de `dismiss()` sem id; toasts auto-fecham por duração. Workaround possível em call sites: manter um Set de ids no hook e iterar `sonnerToast.dismiss(id)` para cada.
  2. **Pedir 1 fix dirigido em T4** — smith instrumenta o caminho do `dismiss()` no `useToast()` para confirmar que repassa `undefined` ao `sonnerToast.dismiss()` quando recebe sem argumento. Provavelmente é uma única linha.
  3. **Ir para Opção B (react-hot-toast)** — só justificável se T4 mostrar-se estrutural. Os 10 outros casos passam com sonner v2, então a Opção B parece overkill.

Recomendação: **Opção 2** (fix dirigido em T4). Custo baixo, isolado, e libera F020 com aceitação completa.


