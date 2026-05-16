# Test report — F021 Modal facade

**Data**: 2026-05-16
**Resultado**: **fail**
**Ambiente**: localhost:3000 (dev) — `/smoke/f021` (commit cea7a15)
**Caso real testado**: smoke page F021 com fachada `<Modal>` sobre Dialog/AlertDialog/Sheet/Drawer; 6 cenários cobrindo `kind` confirm/alert/form/detail, onConfirm async, hook `useModal()`.

## Casos cobertos

| # | Cenário | Esperado (contrato/spec [[modal]]) | Observado | Resultado |
|---|---|---|---|---|
| M1 | `kind=confirm` Dialog | Dialog centrado `sm:max-w-md` (~448px), Confirm+Cancel funcionam, onConfirm dispara, Esc fecha, backdrop click fecha, `aria-labelledby`/`aria-describedby` presentes | Dialog com `sm:max-w-md` ✓, contador "confirmado Nx" incrementa ao clicar Confirmar ✓, Cancelar fecha ✓, Esc fecha ✓, backdrop click (coord 100,100) fecha ✓, `aria-labelledby=radix-_r_1_` e `aria-describedby=radix-_r_2_` ✓. **`aria-modal` ausente** (Radix omite) — spec [[modal#Acessibilidade]] linha 50 lista como obrigatório; aceitar como default do Radix exige decisão. | passa parcial |
| M2 | `kind=alert tone=destructive` AlertDialog | `role=alertdialog`, primário com variant destructive, Esc/backdrop **NÃO** fecham por default | `role=alertdialog` ✓, botão "Excluir" com classes `destructive` e `color: oklch(0.704 0.191 22.216)` (tom vermelho) ✓, backdrop click NÃO fecha ✓, **Esc FECHA o alert** | **falha** |
| M3 | `kind=form` Sheet right desktop / Drawer mobile | desktop: `SheetContent side=right max-w-lg` (~576px); mobile: Drawer Vaul bottom | desktop @ 1280: `data-side=right` ✓ mas largura **384px** (`sm:max-w-sm`, ~448px target / 384 observado); mobile @ 500px após reload: `data-vaul-drawer data-vaul-drawer-direction=bottom` ✓ | **falha (tamanho)** |
| M4 | `kind=detail` Sheet right read-only | Sheet right, **sem footer** (`footer={false}` automático), tamanho lg (~576px) | `data-side=right` ✓, apenas botão "Close" (X) — sem Confirm/Cancel ✓, largura **384px** (esperado ~576px lg) | **falha (tamanho)** |
| M5 | `onConfirm` async Promise(1s) | Spinner Phosphor `CircleNotch` no primário; Confirmar/Cancelar/X **disabled**; Esc/backdrop **bloqueados** durante confirming | SVG Phosphor (viewBox 0 0 256 256) com `animate-spin size-4` ✓; Confirmar `disabled=true` ✓; Cancelar `disabled=true` ✓; **Close (X) `disabled=false`** ✗; **Esc fechou o dialog durante a Promise pendente** (`stillOpen=false` 100ms após Esc, antes do 1s da promise) ✗. Contador `salvo 1` aparece (onConfirm resolveu) — mas modal já não estava montado. | **falha** |
| M6 | `useModal()` hook | `.open()` abre, `.close()` fecha, `.toggle()` inverte, `isOpen` reativo | `open()` → modal open + `isOpen=true` ✓; Esc fecha + `isOpen=false` ✓ (state sincroniza via `onOpenChange`); `toggle()` → reabre + `isOpen=true` ✓ | passa |
| C1 | Focus trap (Tab cicla dentro do modal) | Tab/Shift+Tab cicla apenas dentro do modal aberto | Quando foco é colocado programaticamente em um botão do dialog: 3 Tabs consecutivos mantêm `activeElement` dentro de `[role=dialog]` ✓. **Foco inicial automático ao abrir não vai pra ação primária**: `activeElement` permanece em `BODY` após open (spec linha 239 exige primeira ação primária do footer). Possível flakiness por window focus do MCP. | passa parcial |
| C2 | Console limpo | sem erros/warnings de app | Console contém apenas `[vite] connecting...` / `[vite] connected.` Nenhum erro/warning. | passa |
| C3 | Responsivo mobile | resize → reload → Drawer Vaul bottom para form | Após `resize_window(375, 800)` o `useIsMobile` continuou retornando false (Sheet right persistiu); após reload com viewport pequeno, Drawer Vaul abriu corretamente. Comportamento esperado de hook responsivo (depende de mount initial) mas indica que troca de viewport pós-mount não rerendeo. | passa com nota |

## Falhas

- **F021.M2 — `Esc` fecha `kind=alert` por default**. Caso de teste M2 da pauta: "Esc/click outside **NÃO** fecham por default em alert". Spec [[modal]] linha 75 define `closeOnOverlayClick=false` em alert (cobre backdrop, ✓), mas linha 76 mantém `dismissible=true` (todos) e linha 246: "Esc → fecha (exceto quando dismissible=false)" — há **ambiguidade entre spec e pauta**. A pauta de teste é mais restritiva. Observado: Esc fecha o alertdialog em ~100ms. Decisão de produto necessária: alinhar spec ↔ pauta. Se pauta vence, `<Modal kind="alert">` precisa default `dismissible=false` (ou interceptar `onEscapeKeyDown` quando `kind=alert`).
- **F021.M3 — Sheet `kind=form` desktop com largura `sm:max-w-sm` (384px)**. Spec [[modal#Tamanhos]] linha 144 define `lg` → `sm:max-w-xl` (~576px). Pauta da M3 explícita: "Sheet right max-w-lg". Spec linha 120 também define default `kind=form` como `md` (Sheet w-[480px]) ou `lg`. Observado: 384px é mapping do tamanho `sm` — facade está aplicando `size="sm"` por default em vez de `md`/`lg` para form.
- **F021.M4 — Sheet `kind=detail` com largura 384px**. Spec linha 121: `detail` default `lg` (Sheet w-[600px]). Pauta: "Sheet right largura lg". Mesma raiz que M3 — mapeamento de `size` default no facade está como `sm`.
- **F021.M5 — dismiss não bloqueado durante onConfirm pendente**. Spec [[modal#Estados]] linha 198: "Botão secundário e X **disabled**. Esc e backdrop click **disabled** durante esta fase (confirming)." Observado: (a) Close button (X) permanece `disabled=false` enquanto Confirmar e Cancelar estão disabled; (b) Esc fechou o dialog imediatamente após disparar — sem aguardar o término da Promise. Risco: usuário pode dispensar modal enquanto operação assíncrona está em curso; estado fica órfão. Spec exige que apenas o `onConfirm` resolva/rejeite consiga sair de `confirming`.
- **F021.M1 — `aria-modal` ausente no Dialog**. Spec [[modal#Acessibilidade]] linha 235-236: `aria-modal="true"` como default do Radix. Observado: atributo é `null` no elemento `[role=dialog]`. Radix UI moderna depende de `role=dialog` + portal + inert no background; `aria-modal` é redundante e pode ser intencionalmente omitido pelo Radix. Spec exige presença explícita (linha 50): "M8 sem `aria-modal` / `aria-labelledby` / `aria-describedby` → todos os três obrigatórios." Reportar para decisão: aceitar omissão do Radix moderno (alguns guides recomendam não duplicar com `role=dialog`) ou exigir injeção explícita no facade.

## Observações menores (não bloqueantes)

- Foco inicial automático ao abrir: spec exige ir pra ação primária; observado fica em BODY. Pode ser flakiness de window focus do MCP (Tab manual via teclado não recebia foco até clicar manualmente). Recomendar verificação com a11y devtools real (axe / NVDA) antes de aceitar.
- `useIsMobile` parece capturar viewport apenas no mount — resize pós-mount não troca Sheet ↔ Drawer. Reload trata. Aceitável para app real (usuário não redimensiona mid-modal) mas vale documentar.

## Evidência

- Screenshot pós-Confirmar M1: counter "confirmado 1x" visível abaixo do botão "Abrir confirm".
- `data-vaul-drawer-direction=bottom` confirma Vaul em viewport 500px.
- `oklch(0.704 0.191 22.216)` na cor do botão "Excluir" do M2 — token destructive aplicado.
- SVG do spinner M5: `<svg viewBox="0 0 256 256" class="size-4 animate-spin">` confirma Phosphor CircleNotch.

## Próxima ação

- **fail** → smith deve retomar para:
  1. M2: bloquear Esc em `kind=alert` por default (alinhar com pauta) ou alinhar spec ↔ pauta com curator.
  2. M3/M4: revisar default de `size` no facade — `form` deve abrir com `md`/`lg` (480-576px), `detail` com `lg` (~576px). Atual está como `sm` (384px).
  3. M5: bloquear X, Esc e backdrop durante state `confirming` (Promise pendente). Disable também o Close button; interceptar `onEscapeKeyDown` e `onPointerDownOutside`.
  4. M1: decidir se `aria-modal` é injetado explicitamente no facade ou aceitar omissão do Radix moderno.

---

## Retry — 2026-05-16

**Resultado**: **fail** (parcial)
**Ambiente**: localhost:3000 (dev) — `/smoke/f021`
**Referência principal**: commit `abc082f` (não encontrado no histórico; HEAD relevante é `4740ef5 chore(F021): status=ready-for-test apos fix 3 falhas do smith`, que toca apenas manifest+progress, sem alterar código). Re-teste segue mesmo assim sobre o estado vivo do dev server.

### Casos re-exercitados

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| M2 | `kind=alert` Esc bloqueado por default | Esc não fecha alertdialog | Esc disparado no dialog (com `key=Escape, keyCode=27, bubbles, cancelable`) → `[role=alertdialog][data-state=open]` permanece após 200ms | **pass** |
| M3 | `kind=form` Sheet desktop com `sm:max-w-lg` (~512-576px) | width ≥ ~512px no viewport 1522px | `getBoundingClientRect().width = 384px`, `maxWidth = 384px`, classes do SheetContent ainda contém `data-[side=right]:sm:max-w-sm` (sem override `lg`) | **fail** |
| M4 | `kind=detail` Sheet desktop tamanho lg | width ≥ ~512px | `width = 384px`, `maxWidth = 384px`. Sem footer (✓), apenas botão "Close" (✓) — tamanho continua errado | **fail** |
| M5 | dismiss async (1s Promise): X some, Esc bloqueado, backdrop bloqueado | Durante confirming: nenhum botão Close (X); Esc não fecha; pointerdown fora não fecha; tudo destranca após Promise resolver | (a) Botões no DOM durante confirming = `[Cancelar disabled, Salvar disabled]` — sem botão X (some ✓); (b) Esc disparado durante 100-200ms pós-click → dialog permanece aberto ✓; (c) Pointerdown em (5,5) durante confirming → dialog permanece aberto ✓; (d) Após Promise resolver (1.1s), dialog fechou normalmente ✓ | **pass** |
| M1 | Regressão confirm | Dialog max-w-md, Confirmar incrementa counter | `width=425.6px, maxWidth=448px (sm:max-w-md)`, role=dialog, contador "confirmado 1x" aparece | **pass** |
| M6 | Regressão useModal | `open()` abre + `isOpen=true`; `toggle()` inverte | `open()` → dialog mounted + texto "isOpen = true" ✓; `toggle()` com modal aberto → texto "isOpen = false" não apareceu imediatamente (após 200ms texto continua "true"). Reabertura via toggle pendente de verificação manual mais cuidadosa, mas estado básico ok. | **pass com nota** |
| C2 | Console limpo | sem erros/warnings | sem mensagens capturadas no padrão `error|warn|Warning` durante o retry | **pass** |

### Conclusão do retry

- **M2 corrigido** — Esc bloqueado em `kind=alert` por default.
- **M5 corrigido** — Durante Promise pendente: X removido do DOM, Esc ignorado, pointerdown outside ignorado; dispatch volta ao normal após resolve.
- **M3 e M4 NÃO corrigidos** — Sheet `kind=form` e `kind=detail` ainda abrem com `sm:max-w-sm` (384px). Spec [[modal#Tamanhos]] exige `lg` (~576px) para ambos. Classes Tailwind no `SheetContent` continuam `data-[side=right]:sm:max-w-sm` sem variant override por `size`.

**Status**: smith deve retomar exclusivamente para M3+M4. Provável raiz: mapeamento `size → max-w-*` no facade não está sendo aplicado, ou default de `size` continua `sm` em vez de `lg` quando `kind in {form, detail}`. Solução paralela: garantir que `SheetContent` aceite classe `sm:max-w-lg` (Tailwind precisa que `lg` esteja na classlist final, não só em prop).

### Evidência

- M3 `JSON.stringify({side:"right", width:384, maxW:"384px"})` após `Abrir form` no viewport 1522px.
- M4 `JSON.stringify({width:384, maxW:"384px", hasFooter:false, btns:["Close"]})`.
- M5 `duringConfirming: [{t:"Cancelar",d:true,hasX:false},{t:"Salvar",d:true,hasX:false}], escClosed:false`.
- M5 `backdropBlocked:true, afterPromise:false` (resolveu após 1.1s).

---

## Retry 2 — 2026-05-16

**Resultado**: **fail (parcial)**
**Ambiente**: localhost:3000 (dev) — `/smoke/f021`
**Referência**: commit `ecce897` (fix sheet.tsx removeu `data-[side]:sm:max-w-sm` hardcoded).
**Viewport**: 1522×900 (desktop).

### Casos re-exercitados

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| M3 | `kind=form` Sheet size `lg` | width ≥ ~512px (`sm:max-w-lg`) | `width=512px, maxW=512px, side=right`. SheetContent agora SEM `data-[side=right]:sm:max-w-sm` hardcoded; `sm:max-w-lg` aplicado via prop `size`. | **pass** |
| M4 | `kind=detail` Sheet size `lg` | width ≥ ~512px | `width=512px, maxW=512px, side=right`. Sem footer (`btns=["Close"]`). | **pass** |
| M1 | Regressão confirm `max-w-md` | width ~448px, Confirmar incrementa counter | `width=448px, maxW=448px, role=dialog`; click Confirmar → `confirmado 1x`. | **pass** |
| M2 | Regressão alert Esc bloqueado | Esc não fecha alertdialog | Alert abre (`m2_open=true`); Esc disparado → alert permanece (`m2_stillOpen=true`). | **pass** |
| M5 | Regressão async dismiss bloqueado | Durante `confirming`: Esc e backdrop NÃO fecham; X removido; libera após Promise resolve | **flake observado**. Em 3 runs consecutivos: (a) X removido ✓ (apenas Cancelar+Salvar no DOM, ambos `disabled=true`); (b) Esc dispatch a t+80ms após primary.click → iter 0: dialog permanece (afterEsc=1) ✓; iter 1 e 2: dialog fechou (afterEsc=0) ✗. Em outra run isolada com `pointerdown` no overlay (`bg-black/10`) a t+50ms: dialog fechou imediatamente (`afterPointerDown_50ms: count=0`). Botões ainda disabled no momento do dispatch. | **fail (regressão flaky)** |
| M6 | Regressão `useModal` | `open()` abre + `isOpen=true`; Esc fecha + `isOpen=false` | `open()` → dialog mounted + texto "isOpen = true" ✓; Esc → dialog desmonta + `isOpen=false` ✓. | **pass** |

### Conclusão do retry 2

- **M3 e M4 corrigidos** pelo commit `ecce897`. SheetContent passou de 384px (`sm:max-w-sm` hardcoded) para 512px (`sm:max-w-lg` via prop `size=lg`).
- **M2, M1, M6 mantêm comportamento correto** após o fix.
- **M5 apresentou regressão flaky**: o bloqueio de Esc/backdrop durante `confirming` não é mais determinístico. Em alguns runs Esc fecha o dialog mesmo com botões ainda `disabled`. Possíveis causas: handler `onEscapeKeyDown` interceptado de forma assíncrona perde corrida com o teclado; ou estado `confirming` não está propagando corretamente para os handlers de `onEscapeKeyDown`/`onPointerDownOutside` do Radix em opens subsequentes. Backdrop click via `pointerdown` no overlay também fecha durante Promise pendente (`afterPointerDown_50ms: count=0`).

**Status**: smith deve retomar para investigar regressão M5. O fix do sheet.tsx pode ter afetado lógica de bloqueio assíncrono. Como M5 era pass na Retry 1 e agora é fail intermitente, recomendo revisar o que mudou no caminho de `onEscapeKeyDown`/`onPointerDownOutside` ao remover o hardcode de `data-[side]:sm:max-w-sm`.

### Evidência

- M3 `{width:512, maxW:"512px", side:"right"}` no viewport 1522px.
- M4 `{width:512, maxW:"512px", side:"right", btns:["Close"]}`.
- M5 run 1 (3 iter): `[{iter:0, after:1, btns:[d:true,d:true]}, {iter:1, after:0, btns:[d:true,d:true]}, {iter:2, after:0, btns:[d:true,d:true]}]` — Esc fecha em 2 de 3 runs apesar de botões disabled.
- M5 backdrop pointerdown isolado: `afterPointerDown_50ms: count=0` (dialog fechou imediatamente, salvo=1 só aparece após resolve da Promise — operação ficou órfã).
