---
title: "Modal / ActionModal — react-tools"
aliases: [modal, modals, action-modal, confirm-modal, alert-modal, generic-modal, grid-detail-modal, grid-image-modal, grid-action-modal]
tags: [contract, legacy, react-tools, modal, dialog, overlay, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Contrato: Modais do `react-tools`

Cobre **F021** do manifest. O legado **não tem hierarquia de tipos** (`ActionModal` / `ConfirmModal` / `AlertModal` como componentes distintos). Existe **um único componente primitivo `Modal`** em `components/Modal.js` (~100 linhas) e **toda variação semântica é uso, não componente**: o mesmo `<Modal>` vira "confirmação", "alerta", "formulário em modal", "carrossel de imagens", "grid de detalhes" — só mudando children, `color`, `size` e quais callbacks (`onConfirm`/`onCancel`/`onClose`) são passados.

Componentes em pastas com sufixo `Modal` (`ActionModal`, `GridActionModal`, `GridDetailModal`, `GridImageModal`, `GenericModal`, `DataGridPrintingModal`) **não são variantes do `Modal`** — são **conteúdos** que vivem dentro de um `<Modal>` (`GridImageModal` é um carrossel, `GridDetailModal` é um painel mestre-detalhe, `GridActionModal` é um wrapper de form+grid, `ActionModal` é um wrapper que monta `Modal + GenericForm`, `GenericModal` é um **hook-factory** que devolve um `<Modal>` de "Confirmar exclusão"). Esses componentes ou (a) **embrulham** o `Modal` (ActionModal, GenericModal), ou (b) **vivem como children** (Grid*Modal, DataGridPrintingModal).

Camadas:

- **`Modal`** (`components/Modal.js`) — primitivo. Renderiza diretamente JSX no fluxo da árvore (**sem `ReactDOM.createPortal`**). Estilos e classes seguem Bootstrap 4 (`.modal`, `.modal-dialog`, `.modal-content`, `.modal-header`, `.modal-body`, `.modal-footer`, `.modal-backdrop`). É a **única** primitiva de overlay.
- **`ActionModal`** (`components/ActionModal/ActionModal.js`) — embrulha `<Modal size='xl'>` + `GenericForm`. Não adiciona props novas além de `genericform`, `model`, `componentId`, `onSubmit`, `onClose`. Útil para abrir um form de ação em diálogo.
- **`GenericModal`** (`components/GenericPage/GenericModal.js`) — **factory de hook**: retorna `{renderModals, openDeleteConfirmModal}`. Provê um `<Modal title='Confirmar exclusão' color='danger'>` reusável dentro de `GenericPage`. Único "preset" semântico do legado.
- **`Grid*Modal`** (`DataGrid/`) — **conteúdos** que `DataGrid` injeta como children de `<Modal>`. `GridImageModal` (carrossel Bootstrap), `GridDetailModal` (lista detalhada com filtros e ações), `GridActionModal` (form + datagrid de ação em lote).
- **`DataGridPrintingModal`** (`components/UserPreference/`) — content puro, é children de um `<Modal>` em `GenericPage`.

Não há `Drawer`, `Sheet`, `Popover` ou `Tooltip` como componente separado dentro de `components/Modal.js`. O legado não diferencia centro vs lateral vs fullscreen como componentes — só como `size` do Bootstrap (`sm|md|lg|xl`).

## Citações de fonte

### Primitivo Modal

- `sources/engenharia--fabrica--javascript--react-tools/src/components/Modal.js:4-18` — assinatura: `Modal({id, visible, title, size, children, color, onConfirm, onConfirmButtonTitle, onCancel, onClose, modalStyle, modalBodyStyle, zIndexOverride})`. Defaults: `visible=false`, `title=''`, `size='lg'`, `modalStyle={}`, `modalBodyStyle={}`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Modal.js:20-21` — visibilidade: `{visible === true || visible === 'true' ? (...) : ''}`. Aceita string `'true'` além de boolean (legado vindo de XML/schema-driven).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Modal.js:22-34` — root: `<div tabIndex='-1' role='dialog' class='modal overflow-auto fade modal-custom-class show modal-<color>? d-block' data-modal='true' style={...modalStyle, zIndex: zIndexOverride || 'null'}>`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Modal.js:35` — `<div class='modal-dialog modal-<size>' role='document'>`. **`size` é interpolada direto na classe Bootstrap** (`modal-xl`, `modal-lg`, `modal-md`, `modal-sm`). `md` é tamanho default visual do Bootstrap (sem classe), o legado aceita literal `'md'` mas vira `modal-md` (classe inexistente — fallback ao tamanho padrão).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Modal.js:36-67` — estrutura interna: `<div id={id} class='modal-content'>` contém **header obrigatório** (`<h5>{title}</h5>` + botão `×`), **body sempre presente** (`<div class='modal-body'>{children}</div>`), e **footer condicional** (renderiza só se `onConfirm` **ou** `onCancel` está definido).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Modal.js:39-44` — botão de fechar no header: `<button class='close' aria-label='Close' onClick={() => onClose && onClose()}>×</button>`. Caractere literal `×` (`'×'`). **Único `aria-label` do componente.**
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Modal.js:49-66` — footer:
  - `onConfirm` → `<button class='btn btn-primary'>{onConfirmButtonTitle || 'Confirmar'}</button>` — sempre cor primary, ignora `color` da prop.
  - `onCancel` → `<button class='btn btn-<color || 'outline-danger'>'>Cancelar</button>` — texto fixo `'Cancelar'` (em português, hardcoded). Cor: se `color` definido (`info|danger|success|warning`), `btn-<color>`; senão `btn-outline-danger`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Modal.js:70-77` — backdrop: `<div class='modal-backdrop fade show' style={{height:'100%', width:'100%', zIndex: zIndexOverride ? zIndexOverride - 1 : 'null'}}/>`. Backdrop é **irmão**, não filho, do dialog root.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Modal.js:85-99` — propTypes: `size: oneOf(['xl','lg','md','sm'])`; `color: oneOf(['info','danger','success','warning'])`; `zIndexOverride: any`. **Nada além disso.** Sem `fullscreen`, sem `position`, sem `placement`.

### ActionModal (wrapper de form em modal)

- `sources/engenharia--fabrica--javascript--react-tools/src/components/ActionModal/ActionModal.js:6-15` — assinatura: `ActionModal({genericform, model, modalState, visible, componentId, title, onClose, onSubmit})`. Não há `size` configurável: **hardcoded `size='xl'`** em `Modal.js:31, 41`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/ActionModal/ActionModal.js:16-20` — instancia `GenericForm({...genericform, pageState: modalState, onSubmitForm: onSubmit})`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/ActionModal/ActionModal.js:22-25` — `handleCloseModal`: chama `cleanForm()` (resetar o form) **antes** de `onClose(componentId)`. Estado do form **não persiste** entre aberturas.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/ActionModal/ActionModal.js:28-50` — branch: se `genericform` truthy renderiza `renderGenericForm()` como children; senão `<span></span>` (modal vazio).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/ActionModal/ActionModal.js:32-35` — `id='action-modal-${componentId}'`. ID estável por instância.

### GenericModal (factory de confirmar-exclusão)

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericModal.js:7-44` — função-fábrica (não componente direto). Estado local: `modalDelete` + `modalDeleteAction`. Retorna `{renderModals, openDeleteConfirmModal}`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericModal.js:14-23` — `openDeleteConfirmModal(param)` armazena `param` (com `action: fn, endPoint: string`); `handleConfirmModalDelete` chama `modalDeleteAction.action(modalDeleteAction.endPoint)` e fecha.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericModal.js:27-40` — `renderModals()`: `<Modal title='Confirmar exclusão' color='danger' onCancel onClose onConfirm>` com texto fixo: `'Depois de realizada, a operação não pode ser desfeita, tem certeza que deseja continuar?'`. **Único "ConfirmModal" do legado** é este — não há componente reutilizável genérico para "confirmar X".

### Outros confirmation modals (ad-hoc, replicados inline)

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:618-633` — `getFormConfirmationModal`: `<Modal id='form-confirm-modal' title='Corfirmação' zIndexOverride={1052}>` (sic — "Corfirmação"). Texto fixo `'Tem certeza que deseja realizar a operação?'`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:485-494` — modal `'Confirmar Exclusão'` com `color='danger'`, texto `'Tem certeza que deseja realizar a exclusão?'`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/GridDetailModal.js:174-181` — modal `'Confirmar execução.'`, texto `'Deseja prosseguir com a execução desta ação?'`. Aqui `onCancel === onClose === handleAction('cancelar')` — **clicar no X executa "cancelar" como ação**, não só dismiss.

### Z-index stacking (modal sobre modal)

- `sources/engenharia--fabrica--javascript--react-tools/src/components/Modal.js:27, 75` — `zIndex: zIndexOverride || 'null'` no dialog; `zIndex: zIndexOverride - 1` no backdrop. **String literal `'null'`** quando não definido (não `null` JS — Bootstrap default do CSS prevalece).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:621` — confirmation modal sobre form modal usa `zIndexOverride={1052}` (Bootstrap default `.modal` é 1050).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:648` — action modal aninhado em form modal usa `zIndexOverride={1061}` (ainda mais acima). **Stack ≥ 3 níveis observável**: page → form modal (default ~1050) → action modal (1061) → confirmation modal (1052 — mas valor menor que action modal, **bug observável de empilhamento**: confirmação dentro de action modal pode ficar atrás do action modal).

### Consumidores (≥ 11 imports diretos do `Modal` no react-tools)

- `sources/engenharia--fabrica--javascript--react-tools/src/components/ActionModal/ActionModal.js:3` — wrapper de form.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:13` — modais de detail, image, action, confirm-delete.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardBox.js:3` + `DashBoardCrud.js:3` — modais de CRUD em dashboard.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GridButton.js:7` (linhas 170, 320) — modal de seleção em GridButton.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericActionForm.js:6` — confirmação de ação genérica.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericModal.js:4` — factory de confirmar-exclusão.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:20` — modal de preferências (`DataGridPrintingModal` como children).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/IconListButton/index.js:6` — modal de seleção de ícone.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/GridDetailModal.js:12` — modal de confirmação aninhado.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:5` — confirmation + action + form modal.

## Estrutura

### Props do `<Modal>` (primitivo)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `id` | string | não | `id` HTML do `.modal-content` | qualquer string | Aplicado em `<div id={id} class='modal-content'>`. Não é usado para foco nem para `aria-labelledby`. | `Modal.js:36, 86` |
| `visible` | bool \| `'true'` \| `'false'` | não (default `false`) | Mostra/oculta o modal | `true \| false \| 'true' \| 'false'` | Sem efeito de animação JS — só renderiza ou não a árvore inteira (incluindo backdrop) | `Modal.js:8, 20-21, 89` |
| `title` | string | não (default `''`) | Linha de cabeçalho | qualquer | Renderiza `<h5>{title}</h5>` na `.modal-header` | `Modal.js:8, 38, 90` |
| `size` | string | não (default `'lg'`) | Largura do dialog (Bootstrap) | `'xl' \| 'lg' \| 'md' \| 'sm'` | Interpola em `class='modal-dialog modal-<size>'`. `md` produz classe inexistente | `Modal.js:8, 35, 91` |
| `children` | ReactNode | não | Conteúdo do body | qualquer JSX (Form, Grid, texto, etc) | Renderiza em `<div class='modal-body' style={modalBodyStyle}>` | `Modal.js:9, 46-48, 92` |
| `color` | string | não | Variante semântica do header/cancel | `'info' \| 'danger' \| 'success' \| 'warning'` | (a) **Bug observável**: `color === true || color === 'true' ? 'modal-<color>'` em `Modal.js:32` — a condição testa boolean, não string de tipo; classe `modal-<color>` raramente é aplicada de fato. (b) `<h5 class={color ? 'text-white' : ''}>` — título fica branco se color truthy. (c) Botão `Cancelar` vira `btn-<color>` em vez de `btn-outline-danger` | `Modal.js:10, 32, 38, 58, 93` |
| `onConfirm` | fn | não | Handler do botão "Confirmar" | função | Renderiza `<button class='btn btn-primary'>{onConfirmButtonTitle \|\| 'Confirmar'}</button>`. **Footer só aparece se `onConfirm` ou `onCancel` está definido** | `Modal.js:11, 49-55, 94` |
| `onConfirmButtonTitle` | string | não | Texto do botão Confirmar | qualquer | Override do default `'Confirmar'` | `Modal.js:12, 53, 95` |
| `onCancel` | fn | não | Handler do botão "Cancelar" | função | Renderiza `<button>Cancelar</button>`. Texto **hardcoded** em português | `Modal.js:13, 56-62, 96` |
| `onClose` | fn | não | Handler do X no header | função | Botão `×` no canto da header chama `onClose()` (sem argumentos) | `Modal.js:14, 42, 97` |
| `modalStyle` | object | não (default `{}`) | Override inline de style do root | objeto CSS-in-JS | Spread no `<div class='modal ...'>`. **Combina com `zIndex`** — pode sobrescrever | `Modal.js:15, 26, 87` |
| `modalBodyStyle` | object | não (default `{}`) | Override inline de style do body | objeto CSS-in-JS | Spread no `<div class='modal-body'>` | `Modal.js:16, 46, 88` |
| `zIndexOverride` | number \| any | não | Z-index manual para stack de modais | número | `zIndex` do dialog = `zIndexOverride`; do backdrop = `zIndexOverride - 1`. Se `undefined`, vira string literal `'null'` (CSS default Bootstrap prevalece) | `Modal.js:17, 27, 75, 98` |

### Props do `<ActionModal>` (wrapper de GenericForm)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `genericform` | object | não (mas se falso, renderiza modal vazio) | Config completa de `GenericForm` | objeto válido para `GenericForm({...})` | Hospedado como children do `Modal`; recebe `pageState=modalState` e `onSubmitForm=onSubmit` | `ActionModal.js:7, 16-20, 28, 55` |
| `model` | array | não | Schema do form (declarado mas não usado diretamente) | array | Declarado em propTypes; o uso real está embutido no `genericform` | `ActionModal.js:8, 56` |
| `modalState` | object | não | Estado inicial passado ao form | objeto | Vira `pageState` do `GenericForm` | `ActionModal.js:9, 18` |
| `visible` | bool | não | Mostra/oculta o modal | bool | Pass-through para `Modal.visible` | `ActionModal.js:10, 31, 41, 57` |
| `componentId` | string | não | ID base do modal | string | Vira `id='action-modal-<componentId>'`; passado também a `onClose(componentId)` para o caller saber qual fechar | `ActionModal.js:11, 24, 33, 43, 58` |
| `title` | string | não | Título do header | string | Pass-through | `ActionModal.js:12, 34, 44, 59` |
| `onClose` | fn(componentId) | não | Handler de fechar | função | Antes de chamar, dispara `cleanForm()` do GenericForm; depois chama com `componentId` | `ActionModal.js:13, 22-25, 60` |
| `onSubmit` | fn | não | Handler de submit do form | função | Vira `onSubmitForm` do GenericForm | `ActionModal.js:14, 19, 61` |

`size` **não** é prop — hardcoded `'xl'` no JSX (`ActionModal.js:31, 41`).

### API do `GenericModal()` (factory de confirmar-exclusão)

| Item | Tipo | Semântica | Vem de |
|---|---|---|---|
| `openDeleteConfirmModal({action, endPoint})` | fn | Abre o modal de confirmação de exclusão; ao confirmar, chama `action(endPoint)` | `GenericModal.js:20-23, 14-19` |
| `renderModals()` | fn → JSX | Retorna o `<Modal>` que deve ser inserido na árvore do consumidor | `GenericModal.js:26-41` |

Texto e título são **fixos** ("Confirmar exclusão" / "Depois de realizada, a operação não pode ser desfeita, tem certeza que deseja continuar?"). Não há props para customizar.

## Asserções observáveis (M1..M14)

**M1 — Não há `Portal`.** `Modal` renderiza diretamente onde é instanciado na árvore. Não usa `ReactDOM.createPortal`. Implicação: stacking context, scroll containers e `overflow: hidden` de ancestrais **podem clipar o modal** se mal-posicionados. O Bootstrap CSS `position: fixed` em `.modal` mitiga, mas problemas com `transform`/`will-change` em ancestrais quebram (problema clássico de modais não-portados).

**M2 — Sem fechar por backdrop click.** O `<div class='modal-backdrop ...'>` (`Modal.js:70-77`) **não tem `onClick`**. Clicar no backdrop **não fecha** o modal. Único caminho de fechar é o `×` do header (chama `onClose`) ou os botões `Confirmar`/`Cancelar` do footer.

**M3 — Sem fechar por `Esc`.** Nenhum `onKeyDown`, `useEffect` com `keydown`, ou `addEventListener` no componente. **Tecla Escape não fecha.** Verificado via grep: `Modal.js` não contém `keydown`, `Escape`, `event.key`, `preventDefault`.

**M4 — Sem focus trap.** Não há `tabIndex` em elementos internos (apenas `tabIndex='-1'` no root, que **remove** o root do tab order). Não há `useEffect` para mover foco ao abrir. Foco **permanece onde estava** (geralmente no botão que abriu). Tab navega normalmente pelos elementos **fora do modal** também — vaza foco para a página atrás.

**M5 — Sem animação JS.** Apesar das classes `fade` e `show` (CSS Bootstrap define transição de opacidade), **não há montagem/desmontagem animada**: `{visible ? <modal/> : ''}` é troca síncrona. Backdrop entra/sai instantaneamente. Não há `slide` (Bootstrap modal só tem `fade` por default e o legado herda).

**M6 — Stack de modais é manual e numérico.** Não há gerenciador (provider, context, store) que rastreia modais abertos e atribui z-index automaticamente. Cada caller define `zIndexOverride` literal (1052, 1061, ...). **Erros de stacking são possíveis** — o exemplo do `GenericForm` (M.bug) tem o confirmation modal em 1052 que pode ficar atrás de um action modal em 1061.

**M7 — Modal sobre modal renderiza 2 backdrops.** Cada `<Modal visible>` injeta seu próprio `<div class='modal-backdrop'>`. Dois modais simultâneos = dois backdrops sobrepostos (escurece mais). Não é "regra" — é consequência da árvore.

**M8 — `role='dialog'` mas sem `aria-modal`, `aria-labelledby`, `aria-describedby`.** Atributos ARIA observados: apenas `role='dialog'` no root (`Modal.js:24`) e `role='document'` no `.modal-dialog` (`:35`) e `aria-label='Close'` no botão `×` (`:41`). **Faltam**: `aria-modal='true'`, `aria-labelledby={titleId}`, `aria-describedby={bodyId}`. Sem isso, leitores de tela tratam o modal como conteúdo regular.

**M9 — Sem `inert` na página de fundo.** Quando o modal abre, o restante da página **continua interativo via teclado** (TAB navega). Combinado com M4, navegação por teclado é confusa.

**M10 — Lib: Bootstrap 4 (CSS) + JSX próprio.** Não importa `react-bootstrap`, `reactstrap`, `@mui/material`, `react-modal`, `headlessui` — nada. Classes literais `modal`, `modal-dialog`, `modal-content`, `modal-header`, `modal-body`, `modal-footer`, `modal-backdrop`, `modal-<size>`, `fade`, `show`, `d-block`, `btn`, `btn-primary`, `btn-outline-danger` indicam dependência do CSS do Bootstrap (vivo no `react-tools`).

**M11 — Render imperativo via state, não via hook/context.** Não há `useModal()`, `ModalProvider`, `modal.open(...)`. Cada consumidor declara `useState(false)` para visibilidade e renderiza `<Modal visible={state} ...>` na sua árvore (com children inline). O **único exceção semi-imperativo** é `GenericModal()` (factory), que ainda assim retorna `renderModals` JSX para o consumidor inserir.

**M12 — Modal **sem** body ou footer não é caso suportado.** Body sempre renderiza (mesmo vazio). Footer só some se `onConfirm` e `onCancel` ambos ausentes. Header sempre presente, com título (mesmo vazio) e botão `×` (mesmo se `onClose` undefined — apenas o click vira no-op).

**M13 — `cleanForm()` em `ActionModal` é destrutivo.** Toda vez que o `ActionModal` fecha, o estado do `GenericForm` interno é zerado **antes** do callback. Reabrir o modal **não preserva** o que o usuário digitou. Não há prop para opt-out.

**M14 — Bug "color string vs boolean".** Em `Modal.js:32`, a expressão `color === true || color === 'true' ? 'modal-${color}' : ''` testa apenas booleans / string `'true'`. Como `color` é definido como `oneOf(['info','danger','success','warning'])`, **a classe `modal-<color>` quase nunca é aplicada**. O efeito visual do prop `color` se manifesta de fato em (a) cor branca do título (`color ? 'text-white' : ''`, linha 38), e (b) classe do botão Cancelar (`btn-<color>`, linha 58). Header colorido depende, na prática, do `modalStyle`.

## Tipos de uso observados (variações semânticas — todas o mesmo `<Modal>`)

| Variação | Como se faz | Onde aparece |
|---|---|---|
| **Confirmação** | `<Modal visible color='danger' onConfirm onCancel onClose>Texto?</Modal>` (footer com 2 botões) | `GenericModal.js`, `DataGrid.js:485`, `GenericForm.js:620`, `GridDetailModal.js:174` |
| **Alerta / aviso simples** | `<Modal visible onClose>Texto.</Modal>` (sem footer, só X no header) | não há caso direto observado — variação teórica; legado usa `useNotifications` (toast) para isso |
| **Form em modal** | `<Modal visible size='xl' onClose>{form}</Modal>` (sem footer; submit pelo botão do form) | `ActionModal.js`, `GenericForm.js:726` |
| **Form em modal com botões Salvar/Cancelar** | `<Modal visible size='xl' onConfirm={save} onCancel onClose>{form}</Modal>` | `GenericForm.js:745` |
| **Grid em modal** | `<Modal visible size='xl' onClose><GridDetailModal/></Modal>` | `DataGrid.js:506` |
| **Carrossel de imagens** | `<Modal visible onClose><GridImageModal/></Modal>` | `DataGrid.js:495` |
| **Configurações / preferências** | `<Modal visible onClose><DataGridPrintingModal/></Modal>` | `GenericPage.js:217` |
| **Seleção (picker)** | `<Modal visible onClose>{list/grid de opções}</Modal>` | `IconListButton/index.js:53`, `GridButton.js:170` |

Não existe variação "fullscreen". O `size='xl'` é o máximo suportado.

## Relações com o ecossistema

- Consome: nada — é folha. Só CSS de Bootstrap.
- É consumido por: [[engine-schema-driven]] (toda apresentação de form em modal e confirmações de CRUD), [[model-valor-genericform]] (`formOnModal: true`, `formConfirmationModal`, `actionModalConfigs`), [[model-valor-datagrid]] (detail/image/action/delete em modal), [[model-valor-dashboard]] (CRUD em `DashBoardBox`/`DashBoardCrud`), [[filtros-componente]] (não diretamente — filtros vivem inline), [[notifications]] (não relacionado — toast é alternativa para feedback sem bloqueio).
- Componentes wrappers do mesmo arquivo / pasta:
  - [[#ActionModal]] embrulha Modal + GenericForm
  - `GenericModal` factory para confirmar exclusão
  - `Grid*Modal` são conteúdos, não envelopes
- Sem ligação com [[hub-signalr-legacy]] / [[hub-sse-mapping]] — modais nunca são abertos por eventos do hub diretamente; só pela cadeia engine-schema-driven (a action que vem do schema dispara o modal).

## Notas de implementação para o Studio

- **O contrato real é a primitiva `Modal`, não os "tipos".** Studio precisa decidir se mantém uma primitiva única e variações por uso (como hoje), ou se decompõe em `ConfirmDialog`, `AlertDialog`, `FormDialog` (semânticos). Se decompuser, é refactor de **todos** os call-sites (≥ 11 consumidores diretos + dezenas indiretos via engine-schema-driven). A camada de compat seria `Modal` continuar exportado e mapear para o novo.
- **A11y precisa ser **adicionada**, não "preservada".** Hoje falta `aria-modal`, `aria-labelledby`, focus trap, `inert` em background, fechar por `Esc`, fechar por backdrop click. Esses são **gaps**, não comportamentos do legado a respeitar. Curator/designer decidem se entram no contrato como "mandatos do novo".
- **`md` é classe Bootstrap inexistente.** Modais com `size='md'` recebem `class='modal-dialog modal-md'` — o CSS do Bootstrap não define isso, então o tamanho cai no default (~500px). Studio pode tratar `md` como sinônimo do default ou rejeitar.
- **Bug "color M14" muda comportamento se corrigido.** Modais que passam `color='danger'` hoje **não recebem** `class='modal-danger'`; só o título fica branco e o cancelar fica vermelho. Corrigir (testar `color` em vez de `color === true`) faria a classe `modal-<color>` aplicar — se houver CSS para ela, o visual muda. Verificar CSS Bootstrap (não há `.modal-danger` no Bootstrap 4 default — provavelmente custom não-encontrado).
- **Stacking de z-index é problema do Studio resolver.** O legado deixa números literais nas mãos do dev. Padrão moderno é stack manager (cada modal aberto pega `base + N*step`). Mudar isso quebra a expectativa de quem passa `zIndexOverride` explícito.
- **`ActionModal.cleanForm()` é decisão UX.** O reset destrutivo pode ser feature (modal limpa toda vez) ou bug (usuário perde edição). Designer decide.
- **Backdrop click "muda comportamento" se virar dismiss.** Hoje só fecha pelo `×`. Habilitar backdrop dismiss é UX moderna, mas **muda** o contrato observável.
- **Texto "Confirmar" e "Cancelar" é hardcoded em PT-BR.** Sem i18n. Studio decide se internacionaliza ou mantém.
- **Não há "Drawer/Sheet/Popover".** Se o design system tiver, Studio cria do zero — não tem contrapartida no legado para mapear.

## Sub-contratos a aprofundar (referência futura)

- `GridDetailModal` — content específico (mestre-detalhe com filtros, intervalos, ações em lote). Vale contrato próprio se F021 for explodida.
- `GridImageModal` — carrossel Bootstrap (`carousel-indicators`, `carousel-inner`, `carousel-item active`). Não usa lib externa; controles prev/next manuais.
- `GenericForm`-em-modal (`formOnModal: true`) — fluxo de form com submit, confirmation modal e action modals empilhados ([[model-valor-genericform]] cobre parcialmente).

## Sources

- [[calendar/notes/2026-05-16.md]]
