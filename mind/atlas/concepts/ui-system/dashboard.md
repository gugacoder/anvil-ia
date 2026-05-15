---
title: "Dashboard"
aliases: [dashboard, dashboard-renderer, dashboard-page, dftipo-dashboard]
tags: [ui-system, component, dashboard, renderer, schema-driven, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Dashboard

Renderizador da **superfície de painéis** do Director.Studio. Recebe um descritor declarativo (`boxConfig` no contrato legado — ver [[model-valor-dashboard]]) que enumera **N quadrantes** (no legado, sempre 4), cada qual hospedando um widget tipado (KPI, tabela, gráfico, gauge, switcher). Materializa em UI consistente: **stack vertical scrollável em mobile**, grid 2×2 em desktop. Cobre F012.

A spec aqui é da **página/superfície** — o vocabulário de widgets individuais vive em [[dashboard-widget]]. Aqui, dashboard é o organismo que **organiza widgets, dispara seu ciclo de vida (fetch + auto-refresh), expõe meta-controles (favoritar, compartilhar link, editar layout) e arbitra estados globais (loading inicial, erro de catálogo, viewport)**.

## Quando usar

- Toda página/sub-página cujo nó `dashboard` esteja presente no model retornado por `obter_model_pagina` (engine F009 despacha o discriminante).
- Como home de aplicação (`path === '/'`): dashboard favorito do usuário renderizado direto. Sucessor do `<DashBoardHome>` legado.
- Como página CRUD de dashboards (lista/editar/deletar/favoritar/gerar-link) — variante composta de [[data-grid]] (linha = dashboard) + lançamento desta superfície em modo edição.
- Como modo "exhibition standalone" para links compartilháveis (rota `/d/:token?` ou similar) — variante kiosk fora do [[app-shell]].

## Quando NÃO usar

- Para visualização de **um único gráfico** em página dedicada — use [[dashboard-widget]] solto dentro de outra superfície.
- Para **edição de catálogo de objetos** (`TBobjetos_dashboard`) — esse é CRUD comum, renderizado pelo engine via [[data-grid]] + [[generic-form]].
- Para **monitoramento real-time intensivo** (sub-segundo) — dashboard aqui é polling/SSE com refresh em segundos. Painéis de tempo real merecem spec dedicada.
- Para **relatórios estáticos imprimíveis** — usar variante de export do [[data-grid]] ou spec própria `report-page`.

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `title` | texto | — | Título exibido no header da página (em desktop e em mobile no `app-header`). |
| `description` | texto | — | Subtítulo curto. Em mobile, abrevia/oculta se > 60 caracteres. |
| `widgets` | `WidgetSlot[]` | obrigatório | Lista ordenada de widgets. Cada slot tem `id`, `widget`, `layout`. v1 aceita até 4 (paridade); spec permite N. |
| `mode` | enum: `view`, `edit`, `exhibition` | `view` | `view` = padrão; `edit` = mostra handles de drag, botões de configurar/remover, toolbar de "Adicionar widget"; `exhibition` = kiosk (sem header/sidebar, fundo full-bleed, sem controles editáveis). |
| `refreshPolicy` | objeto `{strategy, defaultInterval}` | `{strategy:'per-widget', defaultInterval: 60}` | `per-widget` = cada widget tem seu intervalo; `global` = um único intervalo dispara todos; `sse` = listener de eventos (F-dashboard-sse, P2); `manual` = só refresh sob demanda. |
| `favoriteState` | objeto `{isFavorite, onToggle}` | — | Quando definido, mostra estrela no header. Click toggle. |
| `shareState` | objeto `{enabled, onGenerate}` | — | Quando `enabled`, mostra botão "Compartilhar" que abre [[modal-sheet]] com geração de link (delegado a callback; spec do token vive em F-dashboard-shared-link). |
| `onEditLayout` | callback | — | Disparado ao clicar em "Editar layout" no header. Engine alterna `mode='edit'`. |
| `onSaveLayout` | callback | — | Disparado ao confirmar edição. Engine persiste `boxConfig` e volta para `mode='view'`. |
| `onCancelEdit` | callback | — | Descarta edits. |
| `onAddWidget` | callback | — | Em `mode='edit'`, abre [[modal-sheet]] de seleção de objeto do catálogo. |
| `catalogEndpoint` | path | — | Endpoint para listar objetos disponíveis (paleta). Usado pelo modal de adição. |
| `applicationKey` | string | — | Contexto de aplicação (delimita catálogo + persistência). |
| `dashboardSwitcher` | objeto `{options[], current, onChange}` | — | Quando definido, mostra seletor de dashboard no header (em mobile, no top do scroll; em desktop, na toolbar). Lista de dashboards do usuário/app. Sucessor do `<GridButton>` da Home legada. |
| `rotation` | objeto `{enabled, interval, dashboards[]}` | — | Modo exhibition com múltiplos dashboards rotativos. Quando ativo, dashboard atual transiciona a cada `interval`s. |
| `emptyState` | objeto opcional | `{title, description, icon, action}` | Empty quando `widgets.length === 0`. Default: ilustração + "Nenhum widget configurado" + ação "Adicionar widget" (se `mode='edit'` ou `onEditLayout` definido). |

### `WidgetSlot`

| Propriedade | Default | Efeito |
|---|---|---|
| `id` | obrigatório | Identificador estável do slot (chave para refresh, persistência, drag-drop). No legado é `'0'..'3'`. |
| `widget` | obrigatório | Objeto do catálogo de objetos: `{id, nome, descricao, tipo, procedure, filtros, intervalo, data?}`. Spec do widget em [[dashboard-widget]]. |
| `layout` | obrigatório | `{colSpan: 1|2, rowSpan: 1|2, order: number}` em desktop; em mobile só `order` importa. |
| `linkedSlotId` | — | Apenas para `tipo='switcher'`. Referência ao slot cujo conteúdo é trocado pelos botões. Sucessor do `quadrante.value` legado. |
| `filterOverride` | objeto | — | Filtro sobreposto manualmente (chips visíveis no widget). |

## Sub-estruturas

### `dashboardSwitcher.options[]`

```
[{ id, label, isFavorite }]
```

Renderiza como dropdown (desktop) ou bottom-sheet (mobile). Item favorito tem ícone `Star` preenchido. Click em item troca o dashboard ativo (callback `onChange`).

## Layout responsivo

### Mobile (< 640px) — Stack vertical

- **Sem grid**. Widgets empilham na ordem `layout.order`, full-width, com `gap-y-3` entre eles.
- Cada widget ocupa **largura total da viewport menos padding** (`px-4`), altura **intrínseca ao tipo** (KPI: ~120px; tabela: até `max-h-[60vh]` com scroll interno; chart: aspect-ratio `4/3`; gauge: ~200px).
- **Scroll vertical natural** da página. Sem swipe horizontal entre widgets (decisão UX: swipe horizontal compete com gestos do app-shell e do switcher; scroll vertical é o gesto previsível).
- **Header da página em mobile** (dentro do [[app-shell]]):
  - Título à esquerda + `dashboardSwitcher` colapsado em ícone `CaretDown` (abre bottom-sheet).
  - Botão `MoreVertical` (`DotsThreeVertical`) à direita: kebab com `Favoritar`, `Compartilhar`, `Editar layout`, `Atualizar agora`.
- **Sem reorder em modo edit no mobile via drag-drop nativo**: use a sub-tela `Editar layout` (lista vertical com handles `DotsSixVertical`, drag pointerdown). Adicionar widget vira bottom-sheet com paleta do catálogo. Configurar widget abre bottom-sheet.
- **Swipe down to refresh** (pull-to-refresh) na viewport: dispara refresh global de todos os widgets visíveis. Limite de 1× a cada 3s para evitar spam.

### Tablet (640–1024px) — Grid 2 colunas

- Grid 2×N: `grid-template-columns: repeat(2, 1fr)`, com widgets podendo span 1 ou 2 colunas (`colSpan`).
- `rowSpan` ainda em jogo (widget pode ocupar 2 linhas verticalmente — útil para tabela alta).
- Header inline: título + `dashboardSwitcher` + botões `Favoritar` (ícone), `Compartilhar` (ícone), `Editar` (ícone+label colapsa em ícone < 900px).
- Ações secundárias colapsam em kebab quando > 3.

### Desktop (> 1024px) — Grid 2×2 (paridade) com extensão N×M

- **Default**: `grid-template-columns: repeat(2, 1fr)` + `grid-template-rows: repeat(2, 1fr)`. Mesmo footprint visual do legado (paridade visual MVP).
- **Estendido** (quando `widgets.length > 4` ou layout customizado): `grid-template-columns: repeat(auto-fit, minmax(380px, 1fr))`; widgets fluem por linhas, com `colSpan`/`rowSpan` respeitados.
- Altura: cada célula da grid 2×2 ocupa `(viewport_height - shell_chrome) / 2` mínimo (≈ `40vh` cada). Tabelas e listas com `overflow-auto` interno.
- Header da página:
  - Linha 1: breadcrumbs + título grande à esquerda; `dashboardSwitcher` dropdown + botões `Favoritar`/`Compartilhar`/`Editar layout` à direita.
  - Linha 2 (opcional): descrição em `text-muted-foreground`.
- **Edit mode**: cada widget mostra handles de drag nas bordas (4 handles para resize: top/right/bottom/left) + botão `Configurar` (ícone `Gear`) + `Remover` (ícone `X`) no canto superior direito. Sucessor do `verifyBoxDimensions` legado.
- **Drop indicator**: ao arrastar widget, slots vazios e zonas de fusão destacam com `border-2 border-dashed border-primary` + `bg-primary/5`.

### Espaçamento e contenção

- Mobile: `px-4` na página, `gap-y-3` entre widgets.
- Tablet/Desktop: `px-6 py-4` na página, `gap-3` na grid.
- Cada widget é um **card** ([[dashboard-widget]] define o card): `bg-card`, `border border-border`, `rounded-lg`, `overflow-hidden`.

## Header de página (composição)

```
[breadcrumbs?]                                        (desktop linha 0)
[title]              [switcher] [fav] [share] [edit]  (linha principal)
[description?]                                        (opcional)
[refresh-status-chip] [filter-chips?]                 (linha de status)
```

### `refresh-status-chip`

- Chip pequeno (`text-xs`, `text-muted-foreground`) com:
  - Texto: `Atualizado há {Xs|Xmin|Xh}` (relativo, recalcula a cada 10s).
  - Spinner inline `CircleNotch` (Phosphor) quando **algum** widget está refazendo fetch.
  - Em `refreshPolicy='manual'`: vira botão clicável "Atualizar agora" com ícone `ArrowsClockwise`.
- Tooltip ao hover lista quando cada widget atualizou pela última vez (debug útil).

### Filter chips globais

- Quando o dashboard tem filtros aplicados em nível de página (não por widget), renderiza chips removíveis abaixo do header. Mesmo vocabulário visual dos chips de [[data-grid]].
- Em mobile, vira scroll horizontal.

## Modo edit

Disparado por `mode='edit'` (engine alterna ao clicar "Editar layout").

### Comportamento

- Background da grade muda sutilmente (`bg-muted/10`) para sinalizar "modo edição".
- Cada widget ganha overlay com:
  - **Handle de drag**: ícone `DotsSix` no canto superior esquerdo (cursor `grab`/`grabbing`). Mobile: long-press para iniciar drag.
  - **Botões de ação**: `Configurar` (`Gear`), `Remover` (`X`). Canto superior direito.
  - **Handles de resize** (desktop): 4 bordas (`cursor-{col,row,nwse,nesw}-resize`).
- **Drop-zones vazios**: slots sem widget mostram botão `+ Adicionar widget` centralizado, com `border-2 border-dashed border-border`. Click abre modal de seleção.
- **Toolbar superior fixa** durante edit:
  - Esquerda: `[Cancelar]` + `[Salvar layout]`.
  - Direita: `+ Adicionar widget` (sempre disponível, mesmo se há slots vazios — opção para inserir antes/depois).
- **Validação ao salvar**:
  - Switcher (`tipo='switcher'`) precisa de `linkedSlotId` válido; senão erro inline antes de fechar.
  - Widget sem `procedure` válida: bloqueia salvamento.

### Mobile edit

- Sem drag visual nativo na grade (não há grade em mobile).
- Tela `Editar layout` é **lista vertical reordenável** com:
  - Cada item: ícone do tipo + nome do widget + handle `DotsSixVertical` + botões `Configurar`, `Remover`.
  - Reorder por arrastar handle (`pointerdown` + threshold).
  - Botão fixo no rodapé: `+ Adicionar widget` (abre bottom-sheet de catálogo).
  - Botões topo: `Cancelar` (X) e `Salvar` (Check).
- Configurar widget abre **bottom-sheet** com form: nome, procedure (read-only), intervalo (slider 10s–10min), filtros (sub-form), e (se `tipo='switcher'`) seleção de slot alvo.

## Estados

- **idle** — dashboard carregado, todos os widgets têm dados resolvidos ou estão em refresh silencioso.
- **loading-initial** — primeiro carregamento (config do dashboard + primeiros fetches dos widgets). Layout do dashboard aparece com **placeholders por widget** (skeleton específico por `tipo` — ver [[dashboard-widget]]). Header já visível.
- **loading-config** — buscando o `boxConfig` do banco (entre selecionar dashboard no switcher e os widgets aparecerem). Tela mostra **skeleton da grade inteira**: 4 cards com `bg-muted/30 animate-pulse`. Sem header de widgets ainda.
- **empty** — `widgets.length === 0`. Mostra empty-state: ilustração discreta + "Este dashboard ainda não tem widgets" + ação `+ Adicionar widget` (se `onAddWidget` definido) ou `Editar layout`.
- **error-config** — falha ao carregar o `boxConfig` (404, sem permissão, JSON inválido). Page-level error-state: `WarningCircle` + título "Não foi possível carregar o dashboard" + descrição vinda da resposta + botão "Tentar novamente".
- **error-partial** — um ou mais widgets falharam, mas o dashboard está funcional. Banner discreto no topo: `inline-alert` tom `warning`: "{N} widgets não puderam ser carregados." + botão "Tentar de novo" (refaz só os que falharam). Cada widget afetado mostra seu próprio error-state interno.
- **mode-edit-dirty** — em edit mode com alterações não salvas. Visual: bordas dos cards alterados ganham `ring-1 ring-primary/40`; toolbar mostra dot `bg-primary` ao lado de "Salvar". Tentar sair da página dispara confirmação ("Descartar alterações?").
- **mode-edit-saving** — após click em "Salvar layout". Toolbar com botão em estado loading; widgets ficam `pointer-events-none`. Toast `success` ao concluir; toast `error` com possibilidade de retry se falhar.
- **rotation-active** — `mode='exhibition'` + `rotation.enabled`. Indicador discreto no canto superior direito: progress ring + nome do próximo dashboard. Click no ring pausa rotação.
- **hidden-tab** — `document.visibilityState !== 'visible'`. Auto-refresh **pausado globalmente** (vale para todas as estratégias). Retomada ao voltar: cada widget refaz fetch se seu intervalo vencer.

## Motion

- **entrada do dashboard**: fade-in 200ms (`normal`), `ease-out`. Sem slide.
- **troca de dashboard via switcher**: fade-out 100ms (widgets atuais somem) + skeleton aparece + fade-in 200ms quando dados chegam. Total ≈ 300ms (`normal`).
- **rotação exhibition**: cross-fade entre dashboards (200ms `ease-in-out`), progress ring no canto avança linearmente durante o intervalo.
- **entrada em edit mode**: cards animam um shake sutil 1× (`rotate(-0.5deg → 0.5deg → 0`, 300ms) para sinalizar "movível". Background da grade transita para `bg-muted/10` em 150ms.
- **drag de widget**: ghost translúcido (`opacity-60 shadow-md`) segue cursor; drop-zone destaca com `border-dashed border-primary` pulsando 150ms (`fast`).
- **resize de widget**: dimensão muda 1:1 com gesto, sem easing (feedback direto); snap às bordas de outros widgets com `transition-all 150ms ease-out` ao soltar.
- **refresh de widget individual**: pulse sutil no header do widget (background `bg-muted/40` por 200ms `fast`) + spinner no chip global. Sem flash do conteúdo (mantém valores anteriores até novos chegarem).
- **switcher button click** (widget interno tipo `switcher`): widget alvo faz cross-fade do conteúdo (150ms `fast`).
- **pull-to-refresh (mobile)**: indicador de spinner cresce conforme gesto; ao soltar acima do threshold, snap + spinner anima 360deg até término do fetch.
- **reduced-motion**: todas as transições caem para mudança instantânea exceto cross-fades (50ms).

## Responsivo (resumo)

- **mobile (< 640px)**: stack vertical scrollável; header colapsado com kebab; edit em sub-tela com lista reordenável; pull-to-refresh; sem rotação visual exhibition.
- **tablet (640–1024px)**: grid 2 colunas com colSpan/rowSpan; header inline com ações em ícone; modal full-screen para configuração de widget.
- **desktop (> 1024px)**: grid 2×2 (paridade legado) ou N×M (estendido); edit inline com drag+resize; modal dialog para configuração.
- **thumb zone (mobile)**: ações primárias no kebab (canto superior, alcançável só com polegar estendido) — aceitável porque ações são secundárias; ação principal "rolar para ver mais" usa o gesto natural. Pull-to-refresh é polegar-friendly.
- **gestos mobile**: scroll vertical (default), pull-to-refresh, long-press para iniciar drag em edit, tap para abrir kebab, swipe horizontal **livre** (não consumido — não conflita com app-shell).

## Acessibilidade

- Página tem `<main role="main">` com `aria-labelledby` apontando para o título.
- Cada widget é `<section aria-labelledby="widget-{id}-title">`.
- Refresh chip: `role="status" aria-live="polite"` — anuncia "Atualizado há X" mas só quando muda (debounce).
- Switcher: `<button aria-haspopup="menu">` com lista `role="menu"` e items `role="menuitemradio" aria-checked`.
- Modo edit: anúncio inicial via `aria-live="polite"`: "Modo edição ativado. Use Tab para navegar entre widgets e Espaço para mover."
- **Reorder por teclado** (alternativa a drag): `Space` no handle entra em modo "mover"; setas movem widget pela grade; `Enter` confirma posição; `Esc` cancela.
- **Resize por teclado** (alternativa): `Space` no handle de borda entra em modo "redimensionar"; setas ajustam; `Enter` confirma.
- Botões de ação por widget: `aria-label` explícito (`"Configurar widget {nome}"`, `"Remover widget {nome}"`).
- Pull-to-refresh anuncia início e fim em `aria-live="polite"`: "Atualizando..." / "Atualizado".
- Contraste: WCAG AA mínimo em todos os tokens (ver [[semantic-colors]]).
- Foco visível em todos os controles interativos (`focus-visible:ring-2 ring-ring`).
- Modo exhibition: ainda navegável por teclado (não é "decorativo"); usuário pode pausar rotação com `Space`.

## Composição

- **Compõe**: [[dashboard-widget]] (cada slot), [[button]] (ações do header e da toolbar de edit), [[modal-sheet]] (sheet de configurar widget, bottom-sheet de catálogo, modal de "Compartilhar"), [[inline-alert]] (banner `error-partial`), [[data-grid]] (variante para CRUD de dashboards — `<DashBoardCrud>` legado), `dropdown-menu` (kebab mobile, switcher desktop), `tooltip` (refresh chip, botões em ícone), `skeleton` (loading-initial, loading-config), `empty-state`, `error-state`, `breadcrumbs` (header desktop).
- **É composto por**: pages renderizadas pelo engine schema-driven (F009 → F012), home de aplicação (`path='/'`) via `<DashBoardHome>` sucessor, rota standalone `/d/:token?` (exhibition).

## Cores e tokens

- `bg-background`, `bg-card` — superfícies da página e dos widgets.
- `bg-muted/10` — overlay de "modo edição" sobre a grade.
- `bg-muted/30` — skeleton placeholder.
- `bg-muted/40` — header de widget pulse durante refresh.
- `border-border` — borda dos cards, divisores.
- `border-primary`, `border-dashed border-primary` — drop-zone em edit mode.
- `ring-primary/40` — widgets com alterações não salvas.
- `text-foreground`, `text-muted-foreground` — texto principal e auxiliar.
- `text-x-warning`, `bg-x-warning/10` — banner `error-partial`.
- `text-x-error`, `bg-x-error/10` — error-state page-level.
- `bg-primary/5` — drop-zone hover.

## Edge cases

- **Widget sem `procedure` válida**: render error-state interno do widget; dashboard como um todo continua funcional.
- **`boxConfig` com `tipo` desconhecido**: widget mostra `unknown-type` fallback ([[dashboard-widget]] §"Tipo desconhecido") + warning no console + debug strip do engine. Não bloqueia a página.
- **`linkedSlotId` aponta para slot inexistente (switcher)**: widget switcher mostra erro interno "Slot alvo não encontrado". Em edit mode, força reconfiguração.
- **Catálogo de objetos vazio em edit mode**: modal `+ Adicionar widget` mostra empty-state: "Nenhum objeto disponível para esta aplicação. Cadastre objetos em [link para catálogo]."
- **Sem dashboard favorito (`/` da app)**: home renderiza empty-state: "Você ainda não definiu um dashboard favorito" + ação "Escolher dashboard" (abre lista via `dashboardSwitcher`).
- **Mudança de viewport mid-session**: layout reflows (4 cards do legado 2×2 viram stack vertical). Estado de edit preservado. Drag em curso é cancelado se viewport muda.
- **Snapshot legado persistido com dados**: ao carregar, dashboard mostra dados antigos imediatamente; cada widget marca `Atualizado há ?` até primeiro refresh. Studio decide se respeita snapshot (paridade) ou força refetch ao montar — recomendação: ignora snapshot, refetch sempre (dados velhos são pior que skeleton breve).
- **Auto-refresh com aba oculta**: pausa global. Retoma com refresh imediato se algum intervalo venceu durante a ausência.
- **Edit mode + alguém edita o mesmo dashboard em outra aba**: SSE futuro (F-dashboard-sse) avisa; v1 ignora — last-write-wins com warning quando detectado divergência ao salvar.
- **Rotação exhibition + falha em 1 dashboard**: pula para o próximo, registra erro, mostra toast `warning` no quadrante onde rota visível. Não interrompe loop.

## Notas para o smith

- **Schema unificado**: legado tem `boxElements`/`boxDimension`/`chartData`/`quadrante` — engine normaliza para `widgets[]` com `WidgetSlot` antes de chegar ao componente. Adapter é parte do engine F012, não desta spec.
- **Refresh é orquestrado pelo dashboard, não pelo widget**: cada widget expõe `onRefresh` callback; dashboard mantém timers e dispara. Permite refresh global, pausa em aba oculta, retry coordenado em `error-partial`.
- **AbortController em flight**: trocar dashboard via switcher ou refresh manual cancela fetches em andamento dos widgets do dashboard anterior.
- **Persistência de layout em edit**: salvar dispara um único POST com `boxConfig` serializado (paridade endpoint `acesso.sp_persistir_dashboard`); sem optimistic-update (aguarda confirmação).
- **Rotação exhibition**: é setTimeout recursivo + reset de fetches por widget. Para SSE futuro, fica isolado em hook `useDashboardRotation`.
- **Snapshot vs metadata**: smith decide se persiste `data` resolvido dentro do JSON (paridade legado) ou só metadata. Recomendação: **só metadata** + refetch ao mount. Documentar a decisão no atlas.
- **Pull-to-refresh**: usar lib enxuta ou implementação minimal com `touchstart`/`touchmove`/`touchend` no container; threshold ~80px; resistência elástica.
- **Modal de configuração de widget**: reusa [[modal-sheet]]; conteúdo é um [[generic-form]] minúsculo (form-field de nome + intervalo + sub-form de filtros).
- **Drag-resize desktop**: lib de grid (ex.: `react-grid-layout`) ou implementação caseira (eventos pointer + cálculo de span). Spec não obriga; lib se aceita acessibilidade por teclado, fica.

## Notas vs legado (divergências conscientes)

- **N widgets em vez de 4 fixos**: spec aceita layout estendido; v1 desktop mantém 2×2 para paridade, mas estrutura não amarra.
- **Mobile reinventado**: legado não tem mobile; stack vertical + pull-to-refresh + edit como sub-tela.
- **Skeleton de loading**: legado usa overlay global (`setPageBlur(true)`); Studio tem skeleton por widget.
- **Edit mode explícito**: legado mistura visualização e edição (handles sempre visíveis). Studio separa via `mode='view'|'edit'`.
- **Empty/error states explícitos**: legado fica silencioso ou usa toast genérico.
- **Auto-refresh pausa em aba oculta**: legado drena bateria.
- **Refresh chip "atualizado há X"**: novo; transparência para o usuário.
- **Reorder por teclado**: legado é mouse-only HTML5; Studio adiciona alternativa por teclado.
- **`Buttons` legado é redesignado como `switcher` widget** ([[dashboard-widget]]) — mesma mecânica (linkedSlot) mas vocabulário visual de tab/segmented control em vez de botões dispersos.
- **Charts via Recharts**: decisão F012 substitui Google Charts. Mapping de `tipo` legado → componente Recharts vive em [[dashboard-widget]].
- **Link compartilhável**: continua funcional (modo exhibition), mas token de 30 dias na URL é re-engenhado (F-dashboard-shared-link); spec do componente apenas expõe `shareState.onGenerate`.

## Sinais ao curator

- **`pull-to-refresh`** — primitivo reusável (não só dashboard). Sub-spec quando outra superfície precisar (timeline, feed).
- **`grid-layout-editor`** — primitivo desktop de drag-resize em grade. Pode virar spec própria se reusado fora do dashboard.
- **`F-dashboard-sse`** (P2) — substitui polling por eventos. Pré-requisito: F023 (`hub-sse-mapping`).
- **`F-dashboard-shared-link`** (P1, adiável) — token escopado, sem JWT-de-30-dias-na-URL.
- **`F-dashboard-grid-layout`** (P2) — promoção para N×M responsivo via lib (`react-grid-layout`).
- **`F-dashboard-export`** (P3) — PDF/imagem de snapshot. Não existe no legado.
- **`F-tbobjetos-dashboard`** (P1) — catálogo de objetos. Pré-requisito de F012 estável (define universo real de `tipo`).
- **`dashboard-snapshot-persistence`** — decisão de persistir `data` resolvido junto do `boxConfig` ou não. Documentar como ADR.

## Sources

- [[calendar/notes/2026-05-15.md]] — UX de F012
- [[model-valor-dashboard]] — contrato legado
