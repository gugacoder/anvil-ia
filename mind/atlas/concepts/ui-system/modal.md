---
title: "Modal"
aliases: [modal, action-modal, confirm-dialog, alert-dialog, form-modal, detail-modal, modal-shell, use-modal]
tags: [ui-system, component, overlay, dialog, sheet, drawer, modal, a11y]
sources:
  - "calendar/notes/2026-05-16.md"
  - "atlas/concepts/legacy-contracts/modals.md"
created: 2026-05-16
updated: 2026-05-16
---

# Modal

Guarda-chuva único do Director.Studio para **overlays bloqueantes** — diálogos, painéis laterais, formulários sobrepostos, confirmações destrutivas, alertas modais. Substitui o `Modal` / `ActionModal` / `GenericModal` / `Grid*Modal` do legado, que eram **um primitivo só usado para tudo** sem hierarquia semântica, sem portal, sem focus trap, sem `Esc`, sem dismiss por backdrop, com z-index numérico literal.

Esta spec **não** introduz uma primitiva nova: ela define a **fachada** sobre `Dialog`, `AlertDialog`, `Sheet` e `Drawer` do shadcn — escolhe o componente certo por **`kind`** semântico (intenção) e por **viewport** (mobile vs desktop), e impõe os comportamentos a11y mandatórios. Smith não decide entre `Dialog` e `Sheet` em cada feature; ele escolhe um `kind` e o `<Modal>` resolve.

Modelo mental: **um modal é uma intenção, não um componente shadcn**. "Confirmar exclusão", "preencher um formulário", "ver detalhe", "alertar de algo crítico" são intenções. A apresentação (centro vs lateral vs bottom-sheet) deriva da intenção e do viewport.

## Quando usar

- Confirmação destrutiva ou irreversível ("Excluir registro?").
- Alerta bloqueante que **exige acknowledge** ("Sessão expirou — faça login novamente").
- Formulário curto que interrompe o fluxo (cadastro rápido, edição pontual, ação parametrizada do legado).
- Painel de detalhe / drill-down de um item de [[data-grid]] ou [[tree-view]].
- Painel de configuração / preferências aberto sobre a página atual.
- Picker em volume (lista longa de ícones, registros, opções) que não cabe em [[power-select]].

## Quando NÃO usar

- Feedback transitório de ação ("Salvo com sucesso") → [[toaster]].
- Erro fixo no fluxo da página/form → [[inline-alert]].
- Banner persistente ancorado a um bloco → [[inline-alert]] / `page-banner` (futuro).
- Menu contextual leve (3–7 opções) → `popover` / `dropdown-menu` (spec separada).
- Hover-tooltip / hint passageiro → `tooltip` (spec separada).
- Navegação principal lateral → [[sidebar]].
- Conteúdo que precisa coexistir com a página sem bloquear interação → painel inline, tab, accordion.

## Anti-padrões legados que esta spec corrige

| Gap legado (de `legacy-contracts/modals.md`) | Mandato no Studio |
|---|---|
| **M1** sem `createPortal` | `<Modal>` sempre renderiza via portal do shadcn (`DialogPortal` / `SheetPortal` / `DrawerPortal`). Sem exceções. |
| **M2** backdrop não fecha | Backdrop fecha por default. Opt-out explícito via `closeOnOverlayClick={false}` (só para `kind="alert"` ou fluxos críticos). |
| **M3** `Esc` não fecha | `Esc` sempre fecha. Opt-out só em `kind="alert"` com `dismissible={false}`. |
| **M4** sem focus trap | Focus trap nativo do Radix (via shadcn). Foco inicial vai pra primeira ação primária; ao fechar, retorna ao trigger. |
| **M5** sem scroll lock | Scroll do body trava enquanto qualquer modal está aberto (Radix faz; reforço aqui). |
| **M6** z-index numérico literal por consumidor | Stack manager interno atribui z-index automático. Consumidor **não** passa número. Aninhamento até 3 níveis suportado. |
| **M7** múltiplos backdrops empilhados | Backdrop por modal, mas escurece com mesma intensidade base — sem somatório visual. |
| **M8** sem `aria-modal` / `aria-labelledby` / `aria-describedby` | Todos os três obrigatórios. `title` vira `aria-labelledby`; `description` vira `aria-describedby`. |
| **M9** background continua tabável | Background `inert` enquanto modal está aberto (via Radix). |
| **M13** `cleanForm()` destrutivo de form em `ActionModal` | Form interno **preserva estado** entre aberturas por default. Reset explícito via prop `resetOnClose` (opt-in). |
| **M14** bug `color === true` | Sem prop `color`. Variante semântica via `kind` (controla apresentação) + `tone="destructive"` para a ação primária. |
| Textos "Confirmar" / "Cancelar" hardcoded em PT-BR | `confirmLabel` / `cancelLabel` sempre props. Default PT-BR; sem i18n nesta wave (mas API pronta). |
| Stack ≥ 3 (form → action → confirmation) com z-index conflitante | Stack manager garante ordem correta sem intervenção do consumidor. |

## API conceitual

### Componente `<Modal>`

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `open` | booleano | — | Controlado. Estado de visibilidade. |
| `onOpenChange` | fn(open: boolean) | — | Notificação de transição. Único caminho de fechar (X, backdrop, Esc, confirmar/cancelar). |
| `kind` | `confirm` \| `alert` \| `form` \| `detail` \| `picker` \| `custom` | `confirm` | Decide o shadcn subjacente e os defaults. Veja "Mapping". |
| `title` | texto | — | Obrigatório (a11y). Vira `<DialogTitle>` / `<SheetTitle>` / `<DrawerTitle>`. Conectado via `aria-labelledby`. |
| `description` | texto / nó | — | Opcional. Vira `<DialogDescription>`. Conectado via `aria-describedby`. Quando ausente, modal mantém boa a11y sem o atributo. |
| `size` | `sm` \| `md` \| `lg` \| `xl` \| `full` | `md` | Mapeia para `max-w-*` Tailwind. Aplicável a `kind` centrado (`confirm`, `alert`, `form-mobile-fullscreen`, `picker`). Para `detail`, mapeia largura do Sheet. |
| `mobileAs` | `drawer` \| `fullscreen` \| `sheet` | `drawer` para `form`/`detail`/`picker`; `fullscreen` para `form` longo (configurável); `drawer` para `confirm`/`alert` | Como o modal se manifesta abaixo de 768px. `drawer` = bottom-sheet Vaul com handle e swipe-to-dismiss. `fullscreen` = ocupa 100% da viewport. `sheet` = side=right mesmo mobile (raro; só quando faz sentido). |
| `tone` | `default` \| `destructive` | `default` | Cor semântica da ação primária. `destructive` usa `bg-destructive text-destructive-foreground`. Não tinge título nem header. |
| `confirmLabel` | texto | `"Confirmar"` (`kind="confirm"`) / `"OK"` (`kind="alert"`) / `"Salvar"` (`kind="form"`) | Label da ação primária no footer. |
| `cancelLabel` | texto | `"Cancelar"` (`kind="confirm"`/`form`) / `undefined` (`kind="alert"`/`detail`/`picker`) | Label da ação secundária. Quando `undefined`, botão não renderiza. |
| `onConfirm` | fn() => void \| Promise<void> | — | Handler da ação primária. Quando retorna `Promise`, o botão entra em `loading` automaticamente até resolver; falha não fecha o modal. |
| `onCancel` | fn() => void | — | Handler da ação secundária. Default = `onOpenChange(false)`. |
| `closeOnOverlayClick` | booleano | `true` (`confirm`/`form`/`detail`/`picker`); `false` (`alert`) | Clique no backdrop fecha. |
| `dismissible` | booleano | `true` (todos); `false` aceitável só em `alert` crítico | Combina com `closeOnOverlayClick`. `false` → sem X no header, `Esc` desligado, backdrop não fecha. Caso raro. |
| `resetOnClose` | booleano | `false` | Quando `true`, o `<Modal>` desmonta children ao fechar (perde estado interno). Quando `false`, mantém montado (preserva form, scroll, etc.). |
| `showCloseButton` | booleano | `true` | Renderiza botão X (`Phosphor X`) no header. Em `kind="alert"` com `dismissible=false`, força `false`. |
| `footer` | nó / `false` | `<ModalFooter>` automático com Confirm+Cancel | Quando passado, substitui o footer default por nó custom. `false` remove footer (útil para `kind="detail"`/`picker`/`form` que controla submit internamente). |
| `children` | nó | — | Corpo do modal. Renderizado em `<DialogBody>` análogo (div com padding e scroll). |

### Hook `useModal()`

Controlador imperativo para casos onde o consumidor não quer gerenciar `open` localmente. Devolve `{open, close, isOpen, toggle}`.

| Método | Assinatura | Efeito |
|---|---|---|
| `open()` | `fn() => void` | Abre o modal. Idempotente. |
| `close()` | `fn() => void` | Fecha o modal. Dispara `onOpenChange(false)`. |
| `toggle()` | `fn() => void` | Inverte estado. |
| `isOpen` | `boolean` | Estado atual (reativo). |

Uso típico:

```
const detail = useModal()
<Button onClick={detail.open}>Ver detalhe</Button>
<Modal open={detail.isOpen} onOpenChange={(v) => v ? detail.open() : detail.close()} kind="detail" title="Registro #123">
  ...
</Modal>
```

`useModal()` é **conveniência**, não obrigatório. Para fluxos onde o `open` vem de URL/state global, controlar diretamente é preferível.

### Componente `<ModalFooter>`

Slot opcional para footer custom. Aplica layout responsivo padronizado: botões empilhados em mobile (full-width), inline alinhados à direita em desktop. Espaçamento e ordem (cancel à esquerda, confirm à direita) padronizados.

| Propriedade | Tipo | Default | Efeito |
|---|---|---|---|
| `align` | `between` \| `end` \| `start` | `end` | Alinhamento desktop. `between` separa esquerda/direita (útil para botão "Voltar" oposto a "Salvar"). |
| `children` | nó | — | Botões. Espera [[button]]. |

## Mapping `kind` → shadcn

| `kind` | Desktop (≥ 768px) | Mobile (< 768px, default `mobileAs`) | Footer default | Tamanho default |
|---|---|---|---|---|
| `confirm` | `Dialog` centrado | `Drawer` bottom | Confirm + Cancel | `sm` (max-w-md) |
| `alert` | `AlertDialog` centrado | `Drawer` bottom (não swipe-dismissable se `dismissible=false`) | OK (sem cancel) | `sm` (max-w-md) |
| `form` | `Sheet side=right` | `Drawer` bottom (snap points possíveis) ou `fullscreen` se `mobileAs="fullscreen"` | Salvar + Cancelar | `md` (Sheet w-[480px]) ou `lg` |
| `detail` | `Sheet side=right` | `Drawer` bottom | sem footer (`footer={false}`) | `lg` (Sheet w-[600px]) |
| `picker` | `Dialog` centrado (lista scrollável) | `Drawer` bottom | sem footer | `md` (max-w-lg) |
| `custom` | `Dialog` por default; consumidor controla | `Drawer` por default | nenhum | `md` |

Critério de escolha alinhado com a skill [[vaul]] cheat-sheet: ação curta → Dialog/AlertDialog; conteúdo extenso, drill-down ou form complexo → Sheet/Drawer.

## Tamanhos

Mapping Tailwind para Dialog (centrado):

| `size` | `max-w-*` |
|---|---|
| `sm` | `max-w-md` (~448px) |
| `md` | `max-w-lg` (~512px) |
| `lg` | `max-w-2xl` (~672px) |
| `xl` | `max-w-4xl` (~896px) |
| `full` | `max-w-[calc(100vw-2rem)]` |

Mapping para Sheet (lateral direito desktop):

| `size` | `width` |
|---|---|
| `sm` | `sm:max-w-sm` (~384px) |
| `md` | `sm:max-w-md` (~448px) |
| `lg` | `sm:max-w-xl` (~576px) |
| `xl` | `sm:max-w-2xl` (~672px) |
| `full` | `sm:max-w-[calc(100vw-4rem)]` |

`md` legacy do Bootstrap (que era classe inexistente) **não** existe aqui — `md` é tamanho válido e bem-definido.

## Estrutura visual

```
Desktop — kind="confirm":
              ┌──────────────────────────────────────┐
              │  Title                          [X]  │
              ├──────────────────────────────────────┤
              │  Description / body                  │
              │  ...                                 │
              ├──────────────────────────────────────┤
              │                  [Cancelar] [Confirmar] │
              └──────────────────────────────────────┘
                    (backdrop blur + dim)

Desktop — kind="form" ou "detail":
   ┌─────────────────────────────────┬──────────────┐
   │                                 │  Title  [X]  │
   │                                 ├──────────────┤
   │   página atrás (inert)          │  body        │
   │                                 │  ...         │
   │                                 │              │
   │                                 ├──────────────┤
   │                                 │ [Cnc][Save]  │
   └─────────────────────────────────┴──────────────┘

Mobile — qualquer kind (default mobileAs="drawer"):
              ┌──────────────────────┐
              │   página atrás       │
              │   (inert + scale)    │
              │                      │
              ├──────────────────────┤
              │ ─────                │  ← handle
              │  Title          [X]  │
              │                      │
              │  body                │
              │  ...                 │
              │                      │
              │  [Confirmar]         │  ← full-width
              │  [Cancelar]          │
              └──────────────────────┘
```

## Estados

- **closed** — não renderizado. Portal vazio, scroll do body livre, background tabável.
- **opening** — entrada animada (fade + scale para Dialog; slide-up para Drawer; slide-right para Sheet). Foco move pra primeira ação primária.
- **open / default** — estável. Background `inert`, scroll travado, focus trap ativo.
- **confirming** — `onConfirm` retornou Promise pendente. Botão primário em `loading` (label preservado + spinner). Botão secundário e X **disabled**. `Esc` e backdrop click **disabled** durante esta fase.
- **closing** — saída animada. Foco retorna ao trigger original.
- **error (form)** — quando `onConfirm` rejeita Promise, modal **não fecha**, [[inline-alert]] de erro aparece no topo do body, e o estado volta a `open`. Erro não interrompe o foco.
- **stacked** — outro `<Modal>` foi aberto por cima. Este permanece montado, mas com z-index inferior e visualmente subtle (mantém scrim, sem alteração de cor). Não recebe foco.

## Motion

- **entrada (Dialog/AlertDialog)**: fade (opacity 0→1) + scale (0.96→1) do conteúdo; fade do backdrop. Duração **normal (250ms)**. Easing `ease-out`.
- **entrada (Sheet desktop)**: slide do conteúdo (translate-x 100% → 0). Duração **normal (250ms)**. Easing `ease-out`.
- **entrada (Drawer mobile)**: spring do Vaul (slide-up + scale do background). Duração governada pelo spring config padrão do Vaul.
- **saída**: inversa, **fast (150ms)**. Easing `ease-in`. (Saída sempre mais rápida que entrada para responsividade percebida.)
- **transição entre `kind`**: **não suportada**. Mudar `kind` com `open=true` requer fechar e reabrir (smith não deve mudar `kind` dinamicamente).
- **reduced motion**: respeitar `prefers-reduced-motion`. Entrada/saída viram fade puro de 100ms, sem scale/slide. Vaul já honra isso.

## Responsivo

- **mobile (< 640px)**:
  - `kind="confirm"`/`alert`/`picker` → Drawer bottom com handle.
  - `kind="form"` → Drawer bottom; se conteúdo > 70% da viewport, snap points `[0.5, 0.95]` ou `mobileAs="fullscreen"`.
  - `kind="detail"` → Drawer bottom com snap points `[0.5, 0.95]` (preview + expandido).
  - Footer empilha botões full-width, ordem: primário em cima (mais próximo do polegar).
  - Swipe-to-dismiss habilitado (Vaul). Em `alert` com `dismissible=false`, desabilitado.
- **tablet (640–1024px)**:
  - Comportamento desktop, mas tamanhos `lg`/`xl` se aproximam de fullscreen com margem.
- **desktop (> 1024px)**:
  - `Dialog` centrado para confirm/alert/picker; `Sheet` à direita para form/detail.
  - Footer inline, alinhado à direita, ordem: `[Cancelar] [Confirmar]`. Botão primário à direita (convenção Windows/Web; convenção Apple inversa não adotada).
- **thumb zone**:
  - Mobile drawer mantém ação primária na metade inferior; X fica no topo, à direita.
- **gestos**:
  - Drawer mobile: swipe-down no handle ou backdrop dismiss.
  - Desktop: sem gesto; apenas mouse/keyboard.

## Acessibilidade

- **ARIA roles**:
  - `kind="alert"` → `role="alertdialog"` (via AlertDialog do shadcn). Implica que o usuário **deve** acknowledge.
  - Demais → `role="dialog"` + `aria-modal="true"` (default do Radix Dialog/Sheet).
- **`aria-labelledby`** → sempre conectado ao `title`. Obrigatório.
- **`aria-describedby`** → conectado a `description` quando presente. Quando ausente, atributo omitido (Radix permite via `<DialogDescription>` opcional + props de sr-only ou pass-through; aqui assumimos omissão limpa).
- **Foco inicial**:
  - `kind="confirm"`/`alert`/`form` → primeira ação primária do footer (botão Confirmar).
  - `kind="detail"`/`picker` → primeiro elemento focável do body, ou o próprio container (`tabIndex=-1`).
  - Override via prop futura `initialFocusRef` (não nesta wave).
- **Focus trap**: ativo enquanto `open=true`. Tab cicla apenas dentro do modal. Shift+Tab também.
- **Retorno de foco**: ao fechar, foco volta ao trigger (elemento que tinha foco quando o modal abriu).
- **Background**: `inert` enquanto open (Radix faz). Leitores de tela ignoram conteúdo de trás.
- **Teclado**:
  - `Esc` → fecha (exceto quando `dismissible=false`).
  - `Tab` / `Shift+Tab` → navegação interna.
  - `Enter` em ação primária focada → confirma.
  - `Enter` no body (sem botão focado) → não submete por default (evita confirm acidental). Forms internos do body com seu próprio submit não são afetados.
- **Contraste**: backdrop usa `bg-foreground/40` (modo claro) / `bg-background/60` (modo escuro) — alvo mínimo 3:1 para legibilidade do conteúdo dentro do modal. Botão `destructive` mantém ≥ 4.5:1.
- **Leitor de tela**: ao abrir, anuncia `title` + `description`. Em `alertdialog`, anuncia também o role como "diálogo de alerta".
- **Stack a11y**: ao abrir modal aninhado, foco vai pro novo; ao fechar, retorna pro anterior (sem cair pra página).

## Cores e tokens

Sempre tokens semânticos. Cores diretas (hex/rgb/oklch) proibidas.

| Elemento | Token |
|---|---|
| Fundo do dialog/sheet/drawer | `bg-background` |
| Borda sutil do container | `border-border` |
| Texto do título | `text-foreground` (peso 600) |
| Texto da description | `text-muted-foreground` (peso 400) |
| Texto do body | `text-foreground` |
| Backdrop | `bg-foreground/40` (claro) — Radix overlay com classe `data-[state=open]:animate-in fade-in-0` |
| Botão Confirm default | `bg-primary text-primary-foreground` |
| Botão Confirm destructive | `bg-destructive text-destructive-foreground` |
| Botão Cancel | variant `outline` ou `ghost` |
| Botão X header | `text-muted-foreground hover:text-foreground` |
| Handle (drawer mobile) | `bg-muted` (rounded-full) |
| Separadores (header/footer dividers) | `border-border` |

Sem tokens `x-info/success/warning/error/critical` aqui — modal é estrutura, não feedback. Feedback dentro do body usa [[inline-alert]] com seus próprios tokens.

## Stack manager

Comportamento global mantido por um pequeno store interno do `<Modal>` (provider montado no [[app-shell]] ou implícito via referência ao Radix `Portal`):

- Primeiro modal: z-index base (digamos 50; valor concreto fica no token Tailwind do shadcn — `z-50`).
- Cada modal aberto sobre outro: z-index +10 (próximo bucket Tailwind ou class arbitrária). Limite prático: 3 níveis.
- Backdrop de cada nível mantém intensidade base (não somatória) — modal aninhado escurece apenas o anterior, não o background original duas vezes.
- Ao fechar um modal, o stack reorganiza: o de cima cede o topo ao anterior.
- Consumidor **nunca** passa z-index. Prop `zIndexOverride` do legado **não existe** — qualquer migração que carregue isso deve ser rejeitada pelo smith.

## Composição

- **Compõe**: [[button]] (Confirm/Cancel/X), [[inline-alert]] (erro de submit dentro de form modal), [[form-field]] (em `kind="form"`), `Phosphor X` (botão de fechar), `Phosphor CaretLeft` (back em drill-down de Sheet).
- **É composto por**: [[generic-form]] (quando `formOnModal: true` do legado), [[data-grid]] (detalhe/imagem/ação em lote), [[dashboard]] / [[dashboard-widget]] (CRUD em dashboard), [[generic-filter]] (panel avançado em mobile), [[tree-checkable]] (picker), [[power-select]] (picker volumoso).
- **Concorre com**: [[toaster]] (feedback transitório), [[inline-alert]] (feedback fixo no fluxo), `popover` / `dropdown-menu` (overlays leves, não-bloqueantes).

## Casos de uso conhecidos (mapping do legado)

| Caso legado | `kind` | `mobileAs` | Observação |
|---|---|---|---|
| `GenericModal.openDeleteConfirmModal` | `confirm` | `drawer` | `tone="destructive"`, `confirmLabel="Excluir"`. |
| `ActionModal` (form em modal) | `form` | `drawer` (snap) ou `fullscreen` para forms longos | `size="lg"`. Sem `cleanForm()` automático — `resetOnClose=false`. |
| `DataGrid` detail modal (`GridDetailModal`) | `detail` | `drawer` | `footer={false}`; ações vivem dentro do body (toolbar próprio). |
| `DataGrid` image carousel (`GridImageModal`) | `custom` ou `picker` | `drawer` | Carrossel vive como children. Sem footer. |
| `GenericForm` confirmation antes de submit | `confirm` | `drawer` | Aninhado sobre form modal — stack manager cuida. |
| `IconListButton` picker | `picker` | `drawer` | Lista virtualizada como children, `footer={false}`. |
| `DataGridPrintingModal` (preferências) | `form` ou `custom` | `drawer` | Conteúdo é um form de configuração. |
| `GridButton` selection modal | `picker` | `drawer` | Lista de opções, single-select fecha ao escolher. |

Nenhum caso pede `kind="alert"` no legado direto — esse `kind` é **adição do Studio** para alertas bloqueantes (ex: sessão expirou).

## API rejeitada (explicitamente fora do escopo)

- **`color`** (`info|danger|success|warning`) — substituído por `kind` + `tone`. Pintar header inteiro com cor semântica não é padrão moderno; o ícone/contexto comunica.
- **`zIndexOverride`** — gerenciado internamente.
- **`modalStyle` / `modalBodyStyle`** (override CSS arbitrário) — proibido. Customizações via `className` quando absolutamente necessário e justificado.
- **`visible: 'true' | 'false'` string** — só boolean. Coerção implícita de string proibida.
- **`size='md'`** como classe-fantasma — `md` agora é tamanho válido bem-definido.
- **Footer condicional implícito** (legado removia footer se `onConfirm` e `onCancel` ambos ausentes) — aqui o footer vem do `kind`, não da presença de handlers. `footer={false}` é o opt-out explícito.

## Sources

- [[calendar/notes/2026-05-16.md]]
- [[atlas/concepts/legacy-contracts/modals.md]] — M1..M14, contrato do arqueólogo.
- skill [[vaul]] — cheat-sheet de decisão Dialog vs Sheet vs Drawer.
- skill [[semantic-colors]] — tokens obrigatórios.
- skill [[shadcn]] — primitivos base.
- skill [[mobile-first-page]] — princípio de viewport.
