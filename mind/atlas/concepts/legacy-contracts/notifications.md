---
title: "Notifications (toast/banner) — react-tools"
aliases: [notifications, react-notifications, toast, rnc, use-notifications]
tags: [contract, legacy, react-tools, notifications, toast, feedback, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Contrato: `Notifications` (toast/banner)

Cobre F020 do manifest. O legado **não tem** "banner persistente" como conceito separado — existe **apenas um sistema único** de notificações flutuantes, sobreposto à página, com timer de auto-dismiss configurável. Tudo é toast; o termo "banner" no rótulo F020 corresponde, na prática observada, a **variante full-width** (`top-full` / `bottom-full`) do mesmo componente — mesma instância, mesma API, só mudam container/raio/margens. Não há componente separado para banner inline ancorado em página.

A camada é composta por três peças:

- **`<ReactNotifications>`** (`components/Notifications/Container.js`) — provider root, montado uma vez no shell. Sustenta a lista de notificações ativas em `state`, distribui por 9 containers de posicionamento, registra-se num `Store` singleton para receber comandos de `add`/`remove`.
- **`Store`** (`components/Notifications/Store.js`) — singleton com **uma única instância** exportada (`new Store()` no `default export`). Faz `register({addNotification, removeNotification, removeAllNotifications, types, defaultNotificationWidth})` no `componentDidMount` do Container e expõe `addNotification(notification)` para os consumidores. **É instância única global**, não Context — quem chama `Store.addNotification(...)` esbarra direto no Container montado.
- **`useNotifications()`** (`hooks/useNotifications.js`) — fachada idiomática React. Não usa Context — apenas faz `import Store from '../components/Notifications/Store'` e empacota 4 callbacks (`info`, `success`, `danger`, `warning`) que chamam `Store.addNotification(...)` com defaults opinionados.

Conclusão arqueológica: **a API "fluent" exposta ao app é o hook `useNotifications`**, com 4 verbos fixos (info/success/danger/warning). O hook é gate **único-em-tela**: antes de disparar, varre o DOM por `.notification__item--<type>` e **só dispara se a classe não estiver presente**. Múltiplos toasts simultâneos do mesmo tipo são suprimidos. Tipos diferentes coexistem. Toda chamada também faz `Store.removeAllNotifications()` antes — todo novo toast **limpa o que estiver na tela** e abre depois de 500ms.

Lib base: **própria** (componentes `Container`/`Notification`/`Store`/`utils` totalmente custom no repositório). Classes CSS prefixadas `rnc__` (provável ancestral: `react-notifications-component`) mas o código é vendorizado dentro do `react-tools` — não há `import 'react-notifications-component'`. Animações por `animate.css` (`animate__animated animate__fadeIn` na raiz de cada item; transições explícitas via `style.transition` para height/left/opacity).

## Citações de fonte

### Container (root, posicionamento, registro)
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Container.js:14` — `DCV = constants.DEFAULT_CONTAINER_VALUES` (defaults `isMobile=true`, `breakpoint=768`, `defaultNotificationWidth=325`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Container.js:32-46` — `componentDidMount`: registra callbacks no `Store` singleton (`store.register({addNotification: this.add, removeNotification: this.remove, removeAllNotifications: ..., defaultNotificationWidth, types})`). Adiciona listener de `resize`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Container.js:56-78` — `add(notification)`: se já existe id, substitui no lugar; senão prepend (`insert: 'top'`) ou append (`insert: 'bottom'`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Container.js:80-99` — `remove(id)` marca `hasBeenRemoved=true` (dispara animação de saída); `removeAllNotifications()` marca todas. `toggleRemoval` (101-108) é a fase 2: remove de fato do array após `onTransitionEnd`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Container.js:125-180` — `renderMobileNotifications` (2 containers: top/bottom) vs `renderScreenNotifications` (9 containers). Switch em `render()` (183-192): `isMobile && windowWidth <= breakpoint` → mobile.

### Notification (item individual)
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Notification.js:45-87` — `componentDidMount`: mede `scrollHeight`, expande `parentStyle.height`, depois injeta classes `animationIn`. Inicia `Timer` (60-61) apenas após `onTransitionEnd` — **só se** `duration > 0` **e** `onScreen=false` (`onScreen` significa "a barra animada substitui o timer JS"; quando `onScreen=true`, o dismiss é pelo `onAnimationEnd` da barra, vide 269-292).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Notification.js:107-150` — `removeNotification(removalFlag)`: chama `onRemoval(id, removalFlag)` após animação de saída. Fontes do flag: `enums.NOTIFICATION_REMOVAL_SOURCE` = `TIMEOUT | CLICK | TOUCH | MANUAL` (utils.js:93-98).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Notification.js:152-159` — `onClick`: dismiss apenas se `dismiss.click === true` **ou** `dismiss.showIcon === true` (click no item OU no X). Sem `click` e sem `showIcon`, **não fecha por clique**.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Notification.js:161-244` — handlers de touch (mobile): `onTouchStart/Move/End` implementam swipe-to-dismiss; `hasFullySwiped` (utils.js:367-371) exige distância ≥ **40% da largura** do item.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Notification.js:246-260` — `onMouseEnter/Leave`: pausa/retoma o `Timer` (utils.js:101-128, pausável: registra `remaining` em `pause()`, reseta `start` em `resume()`). Hook 304/331: **mouse events só são ligados quando `duration > 0 && pauseOnHover === true`**. Default `pauseOnHover=false` (utils.js:535) — pausa por hover é **opt-in**.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Notification.js:262-292` — `renderTimer`: barra visual (`rnc__notification-timer-filler`) com `animationName: 'timer'`, `animationDuration: <duration>ms`, `animationFillMode: 'forwards'`. Quando `onScreen=true`, dismiss vem do `onAnimationEnd` do filler, **não** do `Timer` JS.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Notification.js:322-350` — `renderNotification` (default): `showIcon` controla X de fechar (`rnc__notification-close-mark` posicionado `absolute right:10 top:10`); `title` opcional (bold); `message` obrigatório.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/Notification.js:362-374` — root: classes `rnc__notification animate__animated animate__fadeIn` (entrada padrão via animate.css mesmo sem `animationIn`); `onClick` ligado só se `dismiss.click=true` (não confundir com X — o X tem handler próprio em 342).

### Defaults, types, posições (utils)
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/utils.js:67-99` — `enums`: `NOTIFICATION_CONTAINER` (9: bottom-left/right/center, top-left/right/center, center, top-full, bottom-full), `NOTIFICATION_INSERTION` (top/bottom), `NOTIFICATION_TYPE` (success/danger/info/default/warning), `NOTIFICATION_REMOVAL_SOURCE`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/utils.js:528-551` — `defaultDismiss`: `{duration:0, click:true, touch:true, onScreen:false, pauseOnHover:false, waitForAnimation:false, showIcon:false}`. **Nota crítica**: `duration:0` no default → **não auto-dismiss**. Só dismiss por click/touch.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/utils.js:573-650` — `parseNotification`: aplica defaults em `width/container/insert/dismiss/animationIn/animationOut/onRemoval/slidingEnter/slidingExit/touchRevert/touchSlidingExit`. Slidings default = `t(600,'linear',0)`. Fade do touch swipe = `t(300,'linear',0)`. `insert` default = `'top'`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/utils.js:101-128` — `Timer` class: pausable. `pause()` calcula `remaining -= Date.now() - start`; `resume()` re-arma `setTimeout(callback, remaining)`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Notifications/utils.js:388-433` — `getHtmlClassesForType` / `htmlClassesForExistingType`: switch em `type` mapeia para classe `rnc__notification-item--<success|danger|info|warning|default>`. **Não há classe para "error"** — o legado usa `danger`.

### Hook (fachada usada pelo app)
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useNotifications.js:4-27` — `notify(message, title, type)`: primeiro `Store.removeAllNotifications()`, depois `setTimeout(..., 500)` antes do `Store.addNotification({...})`. Defaults hardcoded no hook (sobrepõem o `defaultDismiss` do utils): `insert:'top'`, `container:'top-center'`, `dismiss:{duration:5000, onScreen:true, pauseOnHover:true}`, `slidingExit:{duration:100, timingFunction:'ease-out', delay:0}`. **`id` fixo `'notification-message-1'`** — re-disparo substitui no lugar (vide Container.js:59-66).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useNotifications.js:29-67` — 4 verbos: `info`, `success`, `danger`, `warning`. **Não há `error`.** Cada um, antes de disparar, consulta `document.getElementsByClassName('notification__item notification__item--<type>')`; se já existe um na tela, **suprime silenciosamente** (sem fila, sem upgrade). Defaults: `message='Mensagem'`, `title=''`.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useNotifications.js:69` — return: `{info, success, danger, warning}`. **Não exporta `dismiss` ou `clearAll`** — o app não tem como fechar manualmente; depende do timer ou do click do usuário.

### Estilo (CSS vendorizado)
- `sources/engenharia--fabrica--javascript--react-tools/src/css/notifications.css:1-82` — containers `position: absolute` dentro de `rnc__base` (`position: fixed; z-index: 9000; pointer-events: none`). Posicionamento literal: top/bottom `20px`, left/right `20px`. Top-center/bottom-center: `left: calc(50% - 175px); max-width: 350px`. Full: `width: 100%`, sem margens.
- `sources/engenharia--fabrica--javascript--react-tools/src/css/notifications.css:83-160` — cores por tipo (background + border-left 8px solid escurecida):
  - `default` → `#007bff` / `#0562c7` (azul Bootstrap)
  - `success` → `#28a745` / `#1f8838` (verde)
  - `danger` → `#dc3545` / `#bd1120` (vermelho)
  - `info` → `#17a2b8` / `#138b9e` (ciano)
  - `warning` → `#eab000` / `#ce9c09` (amarelo)
  - `awesome` → `#685dc3` / `#4c3fb1` (roxo — tipo customizado declarado só no CSS, sem entrada no `enums`).
- `sources/engenharia--fabrica--javascript--react-tools/src/css/notifications.css:161-167` — `rnc__base`: `position: fixed; z-index: 9000; height/width: 100%; pointer-events: none`. Cobre a viewport inteira mas é "passável" — apenas os itens (`pointer-events: all`) recebem eventos.
- `sources/engenharia--fabrica--javascript--react-tools/src/css/notifications.css:185-208` — `rnc__notification-message`: cor `#fff`, `font-size: 14px`, `line-height: 150%`. `rnc__notification-title`: `font-weight: 700`. **Sem ícone tipográfico** (sem ✓/✗/⚠/ℹ no CSS) — só cor.
- `sources/engenharia--fabrica--javascript--react-tools/src/css/notifications.css:215-232` — `rnc__notification-close-mark`: 18×18px, `border-radius: 50%`, conteúdo `\D7` (×) `font-size: 12px` `color: #fff`. **Único "ícone"** do componente.

### Consumidores (≥ 20 import no react-tools)
- `sources/engenharia--fabrica--javascript--react-tools/src/index.js:83-95` — exports do pacote: `ReactNotifications` (=Container), `Store` (namespace `* as Store`), `useNotifications` (hook).
- `sources/engenharia--fabrica--javascript--react-tools/src/contexts/AuthProvider.js:4` — autenticação reporta erros via toast.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/hooks/useGenericForm.js:4` + `useGenericFormActions.js:3` + `useGenericFormUtils.js:4` — toda persistência de form passa por toast.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DataGrid/DataGrid.js:19` + `GridDetailModal.js:5` + `DataGridExportDropdownMenu.js:7` — feedback de grid (export, save, delete, errors).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/{DashBoard,DashBoardBox,DashBoardCrud,DashBoardHome}.js` + `hooks/useDashboardUtils.js` — feedback de dashboard.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar.js:20` + `DateTimePicker/DateTimePicker.js:8` — erros de validação inline reciclados como toast.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/FileBrowser/FileBrowser.js:3` — feedback de upload/download.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/AppendList.js:5` + `AppendInput/AppendInput.js:4` — adição de itens.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/AuthRoute.js:4` — bloqueios de ACL.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useNavigation.js:4` + `useTabs.js:3` — navegação e abas.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/UserPreference/hooks/useUserPreferences.js:2` — save de preferências.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Input/hooks/useInputMask.js:1` — erros de máscara.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPages/GenericPages.js:6` + `GenericPage/GenericPage.js:7` + `GenericGridCollection.js:10` + `GenericActionForm.js:8` + `GenericCalendar/GenericCalendar.js:10` — engine schema-driven.

## Estrutura

### API do hook (camada que o app realmente usa)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `useNotifications()` | hook | n/a | Retorna objeto com 4 callbacks | n/a | `{info, success, danger, warning}` | `hooks/useNotifications.js:69` |
| `info(message, title)` | fn | não | Toast informativo (ciano) | `message: string` (default `'Mensagem'`); `title: string` (default `''`) | Se não houver toast `info` visível, limpa todos e abre novo após 500ms | `useNotifications.js:29-37` |
| `success(message, title)` | fn | não | Toast de sucesso (verde) | idem | idem (gate em `.notification__item--success`) | `useNotifications.js:39-47` |
| `danger(message, title)` | fn | não | Toast de erro (vermelho) | idem | idem (gate em `.notification__item--danger`) | `useNotifications.js:49-57` |
| `warning(message, title)` | fn | não | Toast de aviso (amarelo) | idem | idem (gate em `.notification__item--warning`) | `useNotifications.js:59-67` |

### Notification object (API plena via `Store.addNotification`)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `id` | string | não | Identidade do toast | qualquer; `getUid()` gera se ausente | Se já existe, substitui in-place | `utils.js:596`, `Container.js:59-66` |
| `type` | string | sim (se sem `content`) | Variante visual | `success | danger | info | default | warning` (lowercased em `parseNotification`) | Aplica `rnc__notification-item--<type>` | `utils.js:212-231, 597` |
| `title` | string | não | Linha bold superior | string | Renderiza `<div class="rnc__notification-title">` | `utils.js:178-191`, `Notification.js:344` |
| `message` | string | sim (se sem `content`) | Corpo do toast | string ou ReactElement | Renderiza `<div class="rnc__notification-message">` | `utils.js:193-210`, `Notification.js:345` |
| `content` | Component/Element | não | Substitui render padrão | função/classe React ou elemento | Bypass de `title`/`message`/`type` styling; render livre | `Notification.js:294-320` |
| `container` | string | **sim** | Slot de posicionamento | um dos 9 de `NOTIFICATION_CONTAINER` (lowercased) | Define onde o toast aparece | `utils.js:233-240, 609` |
| `insert` | string | não | Ordem de inserção | `'top' | 'bottom'`; default `'top'` | Prepend vs append | `utils.js:242-247, 610`, `Container.js:71-74` |
| `width` | number | não | Largura em px | número; default = `defaultNotificationWidth` (325) | Aplica `style.width: <n>px` | `utils.js:249-254, 606-608` |
| `dismiss.duration` | number ms | sim (validador) | Tempo até auto-dismiss | ≥ 0; default `0` (= sem auto-dismiss) | Após entrada, arma `Timer` (se `onScreen=false`) ou animação CSS (se `onScreen=true`) | `utils.js:528-538`, `Notification.js:46-61` |
| `dismiss.onScreen` | bool | não | Barra de progresso visível | default `false` | `true` → render `rnc__notification-timer` + barra animada por CSS; `false` → `Timer` JS invisível | `Notification.js:262-292` |
| `dismiss.pauseOnHover` | bool | não | Pausar timer no hover | default `false` | Liga `onMouseEnter/Leave` que chamam `Timer.pause/resume` | `Notification.js:304, 331, 246-260` |
| `dismiss.click` | bool | não | Dismiss ao clicar no corpo | default `true` (em `defaultDismiss`) | Liga `onClick` na root | `Notification.js:365` |
| `dismiss.touch` | bool | não | Permitir swipe-to-dismiss | default `true` | Sem efeito direto no código de touch (handlers sempre ligados quando `touchEnabled`); flag declarada mas não consultada nos handlers | `utils.js:535` |
| `dismiss.showIcon` | bool | não | Mostrar X de fechar | default `false` | Renderiza `rnc__notification-close-mark` (×); click no X chama `removeNotification(CLICK)` | `Notification.js:339-343, 156-158` |
| `dismiss.waitForAnimation` | bool | não | Esperar fade-out antes de colapsar height | default `false` | Sequencia animação CSS → transição de height; mais suave em saída | `Notification.js:127-140` |
| `onRemoval` | fn(id, source) | não | Callback de saída | função; default no-op | Chamada com source `timeout|click|touch|manual` | `utils.js:299-303, 615`, `Notification.js:119-120` |
| `animationIn` | array de classes | não | Classes CSS de entrada (animate.css) | array de strings | Acrescenta na root no mount | `utils.js:285-290, 612`, `Notification.js:67-71` |
| `animationOut` | array | não | Classes CSS de saída | array de strings | Acrescenta no removeNotification | `utils.js:292-297, 613`, `Notification.js:115-118` |
| `slidingEnter` | `{duration,timingFunction,delay}` | não | Transição CSS de altura na entrada | default `(600ms, linear, 0)` | Usada só se `shouldNotificationHaveSliding` (≥ 2 itens no container) | `utils.js:623-626`, `Notification.js:79-82` |
| `slidingExit` | idem | não | Transição CSS de altura na saída | default `(600ms, linear, 0)` | Aplicada no `parentStyle.transition` da saída | `utils.js:627-630` |
| `touchRevert` | idem | não | Transição CSS do swipe que volta | default `(600ms, linear, 0)` | Aplicada em `onTouchEnd` (não dispensou) | `utils.js:631-634`, `Notification.js:241` |
| `touchSlidingExit.swipe` | idem | não | Transição CSS do swipe que dispensa (eixo `left`) | default `(600ms, linear, 0)` | Animação de saída por swipe | `utils.js:636-643` |
| `touchSlidingExit.fade` | idem | não | Transição CSS do fade do swipe (eixo `opacity`) | default `(300ms, linear, 0)` | Roda em paralelo ao swipe | `utils.js:644-647` |

### Defaults efetivos quando usado via `useNotifications` (camada de fato no app)

| Item | Valor |
|---|---|
| `id` | `'notification-message-1'` (fixo — re-disparo substitui) |
| `container` | `'top-center'` |
| `insert` | `'top'` |
| `dismiss.duration` | `5000` ms |
| `dismiss.onScreen` | `true` (barra de progresso visível) |
| `dismiss.pauseOnHover` | `true` |
| `dismiss.click` | herdado de `defaultDismiss` → `true` |
| `dismiss.showIcon` | herdado → `false` (sem X visível) |
| `dismiss.touch` | herdado → `true` |
| `slidingExit` | `{duration: 100, timingFunction: 'ease-out', delay: 0}` |
| `width` | 325 px (defaultNotificationWidth do Container) |
| `delay antes de disparar` | 500 ms (após `removeAllNotifications` síncrono) |
| Único-em-tela do mesmo tipo | sim (gate por `document.getElementsByClassName('notification__item notification__item--<type>')`) |
| Stack de múltiplos toasts | **suprimido pelo hook** (apesar do Container suportar); cada chamada limpa todos antes |

## Asserções observáveis (N1..N12)

**N1 — 4 verbos, sem `error`.** `useNotifications()` retorna exatamente `{info, success, danger, warning}`. Tentativa de chamar `.error(...)` é `TypeError` (`undefined is not a function`). O nome semântico de erro no legado é **`danger`** — Studio precisa decidir se mantém ou renomeia.

**N2 — Default duration = 5000 ms para todos os 4 tipos.** Não há diferenciação por tipo (success/info/warning/danger têm a mesma duração via o hook). O componente subjacente aceitaria duração 0 (persistente) ou customizada, mas a fachada nunca expõe esse parâmetro.

**N3 — Posicionamento fixo top-center (desktop) ou mobile-top (mobile, `windowWidth ≤ 768`).** O hook hardcode `container: 'top-center'`. CSS aplica `top: 20px; left: calc(50% - 175px); max-width: 350px`. Em mobile, `Container.renderMobileNotifications` redireciona top-containers para `rnc__notification-container--mobile-top` (full-width `left: 20px; right: 20px`).

**N4 — Não há "banner persistente" inline.** Não existe componente separado para banner ancorado à página. As classes `top-full` / `bottom-full` produzem toast de largura total (border-radius 0, sem margens — visualmente um "banner") mas são **flutuantes** (`position: fixed` via `rnc__base`), sobrepostas à página, com mesmo ciclo de vida de timer. Banner = toast full-width, semântica de persistência **só** via `duration: 0`.

**N5 — `pauseOnHover` é opt-in no componente, mas obrigatório no hook.** O `defaultDismiss` traz `pauseOnHover: false`; o hook força `true`. Logo, **todo toast lançado pelo app pausa o timer com mouse hover** (e retoma no `mouseleave`). Verificação: `Timer.remaining` decresce no `pause()`, é re-armado em `resume()` (utils.js:114-122).

**N6 — Barra de progresso (`onScreen: true`) visível em todos os toasts do app.** Largura do filler decresce em `animationDuration: <duration>ms linear forwards`. Quando completa → `onAnimationEnd` chama `removeNotification(TIMEOUT)`. Cor do filler: **branco** (`#fff`) sobre fundo da cor do tipo.

**N7 — Dismiss por click no corpo.** `dismiss.click` é `true` (default herdado). Click em qualquer ponto do item dispara `removeNotification(CLICK)`. `showIcon: false` no app — **não há X visível para fechar**; a área inteira é clicável (cursor: pointer no CSS).

**N8 — Swipe-to-dismiss mobile.** Touch handlers ligados quando `touchEnabled=true` (sempre, exceto durante animação de saída). Threshold: 40% da largura do item. Anima `left` (`swipe`) + `opacity` (`fade`) em paralelo, depois colapsa height. `onRemoval` chamado com source `TOUCH`.

**N9 — Único-em-tela do mesmo tipo, sem fila.** Antes de disparar, o hook varre `document.getElementsByClassName('notification__item notification__item--<type>')`. **Se já há um do mesmo tipo na tela, a chamada é silenciosamente descartada** (sem warning, sem fila, sem upgrade). Tipos diferentes coexistem — mas só na janela de 500ms até o próximo `notify` zerar tudo.

**N10 — Toda chamada `removeAllNotifications` antes.** Cada `notify()` (linha 6 do hook) chama síncrono `Store.removeAllNotifications()` (marca todos para saída animada), e só **500ms depois** dispara `addNotification` do novo. Janela visual com tela vazia. Se app dispara 2 toasts em <500ms, o segundo cancela o primeiro antes dele aparecer (o `setTimeout` do primeiro ainda não rodou? — não; `removeAllNotifications` é síncrono e independente de `setTimeout`; o efeito é "novo sempre vence anterior").

**N11 — Gate do `getElementsByClassName` usa nome de classe legado, **não bate** com o que o componente renderiza.** O hook procura `notification__item notification__item--<type>` (com `notification__` simples), mas o `Notification` aplica `rnc__notification-item rnc__notification-item--<type>` (com prefixo `rnc__`). **Logo o gate de unicidade do hook nunca encontra match** — todo `notify` passa, e a barreira efetiva contra duplicatas é o `removeAllNotifications` síncrono. Bug observável no legado: o `if (... .length === 0)` é sempre verdade. Studio decide se preserva esse comportamento "sempre dispara" ou corrige a unicidade.

**N12 — Tipo `awesome` definido apenas no CSS, sem entrada nos enums.** CSS tem `.rnc__notification-item--awesome` (roxo `#685dc3`) mas `enums.NOTIFICATION_TYPE` não declara. Tipos customizados podem ser declarados via prop `types` do Container (`Container.js:33-42`, `store.register({types})`) — mas o legado não usa essa via no `react-tools` (nenhum `<ReactNotifications types={...} />` é exportado/conhecido). `awesome` é folclore de CSS.

## Relações com o ecossistema

- Consumido por: virtualmente **todos os componentes Generic\*** ([[engine-schema-driven]], [[model-valor-genericform]], [[model-valor-datagrid]], [[model-valor-dashboard]], [[model-valor-generictreeview]], [[model-valor-pagetabs]]) — toda persistência, ACL, validação e navegação fala via toast.
- Consumido por: [[filtros-componente]] (erros de carga de selects), [[date-components]] (validação inline), [[power-select]] (não diretamente; `useSelectFields` consumidor fala via toast).
- Consumido por: contexts de autenticação (`AuthProvider`, `AuthRoute`) — falhas de sessão, 401/403 redirecionados.
- Não tem dependência cíclica com nenhum outro contrato — é folha do grafo do legado.
- Sem ligação com [[hub-signalr-legacy]] / [[hub-sse-mapping]] — hub realtime tem ciclo próprio e não dispara toasts diretamente.

## Notas de implementação para o Studio

- **O contrato do legado é o hook, não o componente.** O app consome `useNotifications()` em ~25 arquivos do `react-tools`. A migração precisa preservar essa fachada (`info/success/danger/warning(message, title)`) ou prover compat camada — senão é refactor massivo. Renomear `danger → error` é decisão semântica (N1).
- **Bug N11 é "feature negativa".** Hoje o gate `getElementsByClassName('notification__item ...')` nunca dispara — qualquer correção que faça o gate funcionar **muda comportamento observável**: chamadas duplicadas dentro de 500ms passariam a ser suprimidas. Studio escolhe: replicar bug, corrigir para unicidade real, ou eliminar gate (e tratar dedup de outro jeito).
- **Sem `dismiss()` programático.** Componentes só sabem disparar, não fechar — confiam no timer/click/touch. Se o Studio quiser dismiss imperativo (ex.: "fechei o modal, fecha o toast junto"), é API nova.
- **Sem stack real.** A semântica observável é "1 toast por vez, novo cancela velho". Se o Studio quiser empilhar (boa prática moderna de toast), é mudança de comportamento — ressalvar com curator.
- **Acessibilidade ausente.** Sem `role="status"`, sem `aria-live`, sem `aria-atomic`, sem foco automático no X. CSS `pointer-events: none` na base + `pointer-events: all` nos itens funciona para mouse, mas leitor de tela não tem hint. Studio precisa **adicionar** ARIA — não é "preservar"; o legado simplesmente não tem.
- **Animações por animate.css + transitions inline.** O legado depende de `animate__animated animate__fadeIn` na raiz. Studio decide se importa animate.css ou troca por motion próprio (Framer/CSS modules) — não é parte do contrato.
- **`onScreen: true` no hook = barra de progresso sempre visível.** UX comum em libs modernas é barra opcional/discreta — preservar é decisão do designer.
- **Posicionamento responde a viewport, não a preferência do usuário.** Não há setting de posição; tudo é top-center no desktop, mobile-top no mobile. Studio pode parametrizar.

## Sources

- [[calendar/notes/2026-05-16.md]]
