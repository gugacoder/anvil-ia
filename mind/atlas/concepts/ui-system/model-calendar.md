---
title: "Model Calendar (Event Calendar Renderer)"
aliases: [model-calendar, event-calendar, generic-calendar, calendar-renderer, F036]
tags: [ui-system, component, calendar, renderer, schema-driven, director-studio, F036]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Model Calendar

Renderizador de **calendário de eventos** dirigido por dados. Recebe uma lista plana de eventos com intervalo `{startAt, endAt}` e materializa a visualização temporal em **quatro modos** — mês, semana, dia, agenda — alternáveis por um segmented control no header. É o **quarto organismo** do design system para schemas de domínio, irmão de [[generic-form]], [[data-grid]] e [[generic-filter]] — onde o form expressa "1 registro × N campos", o grid "N registros × M campos" e o filter "1 conjunto de critérios", o calendar expressa "**N eventos × eixo temporal**".

Substitui o legado `<GenericCalendar>` + `<Calendar>` (ver contrato [[model-valor-genericcalendar]] / F036). O Studio moderniza três coisas em relação ao legado: (a) **mobile-first** real (legado tinha `minWidth: 908px` hardcoded — nesta wave funciona em <768px); (b) **schema de evento canônico** desacoplado de domínio (`tempoDescarga` legado vazado some — consumidor mapeia se precisar); (c) **sem mutex global** — cada `<ModelCalendar>` é instância independente, múltiplos podem coexistir.

A paginação é **delegada ao consumidor**: o componente recebe `events: Event[]` já carregados e expõe `onRangeChange(start, end)` quando o usuário navega — quem traduz isso em POST com `startOfRange`/`endOfRange` é o consumidor (tipicamente um wrapper que conhece o endpoint do model).

## Quando usar

- Visualização temporal de eventos com data de início (e opcionalmente fim) — agendamentos, tarefas, reservas, plantões, prazos.
- Toda página/sub-página cujo nó `genericcalendar` esteja presente no model retornado por `obter_model_pagina`.
- Como **alternativa de visualização** ao [[data-grid]] para o mesmo dataset, quando a dimensão temporal é o eixo dominante de navegação.
- Dashboards que precisem expor agenda como widget (variante compacta).

## Quando NÃO usar

- Para **picker de data** (selecionar uma data como valor de campo) — use [[date-pickers]] (F018). O calendar é leitura/navegação de eventos, não input.
- Para **timeline horária densa** (Gantt, schedule 24h com grade de hora) — fora de escopo. Quando demandado, criar `time-grid-calendar` separado; este componente assume granularidade de **dia** como unidade visual mínima.
- Para **lista cronológica simples** sem navegação por mês — use uma `data-grid` ordenada por data; calendar carrega overhead de header/navegação sem ganho.
- Para **range-select de intervalo arbitrário** como input — esse é trabalho de `form-field-date-range`, não deste componente. (O legado tinha range-select half-broken via `console.log`; no Studio essa interação **não existe** — clique de célula vazia muda pra view `day`, ponto.)

## Stack subjacente

Renderer **próprio**, composto sobre primitives shadcn já existentes:

- **Header** (segmented control de view + navegação): composição de `Button` (variant ghost/outline) + `Tabs` (ou `ToggleGroup`) shadcn. Sem lib externa.
- **Grid mensal** (6×7): grade própria de divs com tokens semânticos — não usa shadcn `<Calendar>` (react-day-picker), porque aquele é otimizado pra **picker de seleção**, não pra plotar eventos por célula. Reuso seria forçado.
- **Datas, locale, math de range**: `date-fns` + `date-fns/locale/pt-BR` (mesmo do [[date-pickers]] F018). **Sem moment**. Semana começa em **Domingo** (consistência com legado e convenção pt-BR de calendários impressos).
- **Big Calendar (react-big-calendar) é descartado** — adiciona ~50KB, traz CSS próprio que conflita com tokens semânticos, não é mobile-first, e força adaptação de schema. O esforço de adaptar é maior que implementar a grade própria sobre shadcn primitives.

A grade própria é deliberada: o componente fica como **vocabulário do design system**, sob controle de tokens semânticos e de motion. Bibliotecas externas de calendário trazem suas próprias decisões de UX que conflitam com o resto do Studio.

## Schema canônico de evento

O componente aceita exclusivamente este shape. Consumidor adapta (legado emitia `eventStatus` e `tempoDescarga` — adaptador na borda traduz pra `status` e descarta campos de domínio):

| Campo | Tipo | Obrigatório | Semântica |
|---|---|---|---|
| `id` | `string \| number` | sim | Identificador único do evento. Passado em `onEventClick(event)`. |
| `startAt` | `string` ISO `YYYY-MM-DD` ou `YYYY-MM-DDTHH:mm` | sim | Início. Granularidade dia ou minuto — componente usa só o dia para posicionar; minuto fica disponível no payload. |
| `endAt` | `string` ISO ou `null` | não | Fim. Quando ausente, evento é tratado como pontual no `startAt`. Quando presente e cobre múltiplos dias, evento aparece em **cada dia** do intervalo (sem barra contínua — escolha consciente: simplicidade visual e mobile-friendliness > rigor cronológico). |
| `title` | `string` | sim | Linha principal exibida em week/day/agenda. Em month, não aparece (só contadores). |
| `description` | `string` | não | Linha secundária em week/day/agenda. Truncada em uma linha mobile, duas linhas desktop. |
| `status` | `string` | não | Código do status. Match com `statusConfig[].value` para colorir. Quando ausente, evento usa cor neutra. |
| `color` | semantic token name | não | Override direto: `'success' \| 'info' \| 'warning' \| 'destructive' \| 'muted'`. Quando presente, ignora `status`. Permite eventos coloridos sem precisar de tabela de status. |

Schema **plano e fechado**. Campos de domínio (preço, responsável, categoria) **não** aparecem aqui — são responsabilidade do consumidor exibir via clique → modal ou via tooltip custom (não há slot de tooltip nesta wave; F-futuro).

## Sub-estrutura `StatusConfig`

Define a legenda exibida no header (badges clicáveis que togglam visibilidade) e a cor de cada evento por status.

| Campo | Tipo | Semântica |
|---|---|---|
| `value` | `string` | Match com `event.status`. |
| `label` | `string` | Texto exibido no badge da legenda. |
| `color` | semantic token name | Um de `'success' \| 'info' \| 'warning' \| 'destructive' \| 'muted'`. **Sem hex** (proibição designer). O componente mapeia internamente para `bg-x-{token}` / `text-x-{token}-foreground` (ver [[semantic-colors]]). |
| `alwaysShow` | `boolean` | Quando `true`, badge aparece na legenda mesmo com contagem zero no range visível. |

> **Migração consciente do legado**: o legado serializava `style` como string JSON com `backgroundColor`/`color` em hex/rgb. No Studio, isso vira `color: 'success'` (ou similar). O adaptador na borda traduz: hex verde → `'success'`, hex amarelo → `'warning'`, hex vermelho → `'destructive'`, hex azul → `'info'`, demais → `'muted'`. Esse mapeamento é **explícito** no consumidor — o componente não aceita hex.

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `events` | `Event[]` | `[]` | Lista plana já carregada pelo consumidor. Componente filtra/agrupa internamente por view e por `statusVisibility`. |
| `statusConfig` | `StatusConfig[]` | `[]` | Legenda. Quando vazio, header não mostra badges; eventos sem `color` usam token `muted`. |
| `initialView` | `'month' \| 'week' \| 'day' \| 'agenda'` | `'month'` | View inicial. Componente lembra escolha do usuário em estado próprio. |
| `initialDate` | `string` ISO `YYYY-MM-DD` | hoje | Data focal inicial (qual mês/semana/dia abrir). |
| `enabledViews` | `Array<'month' \| 'week' \| 'day' \| 'agenda'>` | todas | Subset de views a expor. Quando 1 item, segmented control some (não há o que alternar). **Corrige dead prop do legado.** |
| `onEventClick` | `(event: Event) => void` | no-op | Callback de clique em evento. Recebe objeto completo. Substitui a bifurcação `fillGenericForm` do legado — quem decide abrir modal/form é o consumidor. |
| `onRangeChange` | `(start: string, end: string) => void` | no-op | Disparado quando usuário navega (`<` / `Hoje` / `>` / seletor mês/ano) — antes do render dos novos eventos. Consumidor usa para refetchar. Datas em ISO `YYYY-MM-DD`. **Range cobre a matriz 6×7 inteira no mês** (pode incluir parte do mês anterior/seguinte) — consistente com legado. |
| `onViewChange` | `(view: View) => void` | no-op | Disparado quando view muda. Útil para o consumidor reagir (ex.: refetchar com granularidade diferente, ou trocar widget irmão). |
| `loading` | `boolean` | `false` | Quando `true`, renderiza skeleton da view ativa (não bloqueia interação no header). Substitui o `setPageBlur` global do legado. |
| `emptyMessage` | `string` | `'Nenhum evento no período'` | Mensagem quando o range visível está sem eventos. **Corrige dead prop `messages.noEventsInRange` do legado.** |
| `densityHint` | `'comfortable' \| 'compact'` | `'comfortable'` | Em mobile, sempre `'compact'` (override). Em desktop, `'compact'` reduz padding das células e aumenta nº de eventos visíveis sem "+N more" overflow. |
| `summarySlot` | render-prop `(day, daySummary) => ReactNode` | nenhum | Slot opcional pra renderizar bloco custom por dia (substitui `eventSummaryConfig` + `SummaryContainer` do legado de forma **componível** em vez de declarativa). Aparece colapsável em agenda; em month/week/day, fica embutido na célula. |

## Estados

- **default** — grid/lista renderizada com eventos visíveis.
- **hover** (desktop) — célula de dia ganha `bg-accent/40`; evento individual ganha `bg-accent` e cursor pointer; badge de status ganha `ring-1 ring-foreground/10`.
- **focus** — keyboard focus visível com `ring-2 ring-ring ring-offset-2 ring-offset-background` em qualquer item interativo (célula, evento, badge, botão de nav, seletor de view).
- **active** — célula/evento clicado: `bg-accent` por 100ms (feedback tátil) antes do callback resolver.
- **disabled** — view desabilitada (não em `enabledViews`) não aparece no segmented control. Botão `<` / `>` nunca fica disabled — calendário é infinito em ambas direções.
- **loading** — skeleton pulsante respeitando layout da view (grid 6×7 de células cinza em month; lista de barras em week/day/agenda). Header continua interativo.
- **error** — quando consumidor falha o fetch, ele passa `events=[]` e exibe um [[inline-alert]] **acima** do calendar; o componente em si não tem estado de erro próprio — divisão de responsabilidades.
- **empty** — quando range visível tem zero eventos pós-filtro de status, exibe `emptyMessage` centralizada em ícone Phosphor `CalendarBlank` (peso `regular`, `text-muted-foreground`).
- **status-hidden** — quando usuário clica badge da legenda, eventos daquele status ficam com `opacity-30` em mês (não somem — preservam densidade visual); em week/day/agenda, somem (decisão deliberada: month tem contadores; week/day/agenda tem lista — opacidade em lista é ruidosa).

## Motion

- **entrada do calendar**: fade-in 150ms (fast). Header e grid aparecem juntos.
- **troca de view**: cross-fade 200ms entre views (fast→normal). Sem slide horizontal — slide implica direção temporal (passado/futuro) que não é o caso.
- **navegação de range** (`<` / `>`): grid sai pra esquerda/direita 250ms (normal) com `ease-out`; nova grid entra do lado oposto. Em mobile, gesto de swipe horizontal dispara a mesma animação.
- **hoje** (botão `Hoje`): grid faz fade-out → fade-in 150ms (sem deslocamento — destino indefinido espacialmente).
- **toggle de status**: 200ms (normal) `ease-out` em `opacity` (month) ou `height`+`opacity` colapso (week/day/agenda).
- **clique em evento**: scale `0.97` por 100ms antes do callback (`ease-out`), depois `1.0` 150ms (`ease-out`). Feedback tátil.
- **skeleton** (loading): pulse 1.5s loop, opacidade 0.6→1.0→0.6.

Reduced-motion: todas transições caem pra fade-only sem deslocamento; durações cortadas pela metade.

## Responsivo

### Mobile (<640px)

- **Header**: empilhado vertical. Linha 1: `[<] [Mês/Ano] [>]` + botão `Hoje` no canto direito. Linha 2: segmented control de view full-width. Linha 3 (opcional, colapsável via botão `Funnel` Phosphor): legenda de badges em flex-wrap.
- **View `month`**: **NÃO** renderiza grid 6×7 (células ficam 40×40px ilegíveis com eventos). Em vez disso, lista vertical agrupada por dia — só dias **com eventos** aparecem, cada um como card: `[dd] [Seg.]` cabeçalho + pills coloridas dos eventos (uma por status com contador, ou lista de até 3 eventos com `+N` se exceder). Tap no dia → muda pra view `day` daquele dia.
- **View `week`**: lista vertical scrollável agrupada por dia da semana (7 grupos). Cabeçalho de grupo `[Seg., 21/05]` sticky-top do scroll. Eventos como cards com title + description + barra lateral colorida (4px) por status.
- **View `day`**: lista vertical pura de eventos do dia. Cabeçalho `[Quarta-feira, 21/05/2025]` no topo.
- **View `agenda`**: idêntica a `day` em estrutura, mas range de **mês** (consistente com legado). Sticky-headers de dia. Dias sem eventos **omitidos**.
- **Navegação**: swipe horizontal na grid/lista navega range (passado/futuro). Tap+hold em evento abre callback (mesma coisa que tap simples — sem long-press distinto).
- **Thumb zone**: botões `<` / `Hoje` / `>` na parte **inferior** do header (mais perto do polegar). Segmented control logo acima. Conteúdo scrollável abaixo.

### Tablet (640–1024px)

- Header em uma linha só (nav + título + view-switch + funnel de legenda à direita).
- View `month`: grid 6×7 aparece (células ~80×80px viáveis), mas cada célula mostra **no máximo 2 contadores de status** + `+N` se exceder. Tap em célula → view `day`.
- Demais views: layout desktop adaptado (week vira 7 colunas estreitas).

### Desktop (>1024px)

- Header em uma linha. Legenda de badges sempre visível (sem funnel).
- View `month`: grid 6×7 padrão. Células ~120×100px. Mostram até 4 badges de status + `+N`. **Não mostram títulos individuais** — só contadores agrupados (consistente com legado, e correto: month é overview, não detalhe).
- View `week`: 7 colunas com cabeçalho `[Dom., 19/05]` por coluna. Eventos como blocos com title + description (truncada em 2 linhas). Sem grade horária (mesma decisão do legado — não é timeline 24h).
- View `day`: coluna única wide, eventos como cards full-width.
- View `agenda`: lista de dias com eventos, com `summarySlot` colapsável por dia.

### Gestos

- **Mobile**: swipe horizontal (navegação de range), tap (clique em evento/célula/badge).
- **Desktop**: clique, hover, keyboard. Sem drag-and-drop nesta wave (legado não tinha; reschedule é trabalho de futuro `editable-calendar`).

## Acessibilidade

- Container raiz tem `role="region"` + `aria-label="Calendário de eventos"`.
- Header de view tem `role="tablist"` (segmented control). Cada botão de view é `role="tab"` com `aria-selected` e `aria-controls` apontando para o id da grid.
- A grid de mês tem `role="grid"`; semana de cabeçalho tem `role="row"`; cada célula de dia tem `role="gridcell"` com `aria-label="Quarta-feira, 21 de maio de 2025, 3 eventos"`.
- Eventos individuais são `<button>` (não `<div onClick>`) — tab-focável, Enter/Space ativam.
- Badges de status são `<button>` com `aria-pressed={visible}` para refletir toggle.
- Navegação por teclado:
  - `Tab` percorre: nav `<` → `Hoje` → `>` → seletor mês/ano → tablist de views → legenda (badges) → grid.
  - Dentro da grid mês: `Arrow` muda célula focada (`Up`/`Down` ±7, `Left`/`Right` ±1). `Enter`/`Space` muda pra view `day`.
  - Dentro de evento focado: `Enter`/`Space` dispara `onEventClick`.
  - `Esc` fecha popovers (se houver).
- Leitor de tela: anúncio em `aria-live="polite"` quando range muda ("Maio de 2025, 12 eventos"). Anúncio em `aria-live="polite"` quando view muda ("Visão de semana ativada").
- Contraste: tokens semânticos garantem AA mínimo. Cores de status nunca são o **único** sinal — eventos sempre têm title/contador legível em foreground.
- Sem dependência de cor para distinguir status crítico — badge tem label texto também.
- Locale pt-BR: `aria-label` e datas formatadas em PT-BR via `date-fns/locale/pt-BR`. Internacionalização fica como hook futuro (mesma posição do F018).

## Composição

- **Compõe**: [[button]] (nav, hoje, view-switch, funnel mobile), [[badge]] (status legend, contadores em month), [[inline-alert]] (vazio, consumidor injeta para erro), [[modal]]/[[modal-sheet]] (consumidor abre em `onEventClick`), [[loading-state]] (skeleton).
- **É composto por**: páginas/sub-páginas via [[app-shell]]; possivelmente embarcado em [[dashboard-widget]] (variante compacta sem view-switch).
- **Convive com**: [[generic-filter]] acima quando o nó `filtro` existe no model — exatamente como o legado posicionava. O filter dispara `onSubmit` que o consumidor traduz em refetch + nova prop `events`.

## Cores e tokens

Sempre tokens semânticos. O componente usa:

- `bg-background`, `text-foreground` (container raiz, cabeçalhos).
- `bg-card`, `border-border` (células de dia, cards de evento em week/day/agenda).
- `bg-muted/40`, `text-muted-foreground` (células de dias fora do mês visível em month-view, dias sem eventos em agenda).
- `bg-accent`, `text-accent-foreground` (hover/active em células e eventos).
- `ring-ring`, `ring-offset-background` (focus).
- `bg-primary`, `text-primary-foreground` (botão `Hoje` em estado ativo no dia corrente; view selecionada no tablist).
- `bg-x-success/15`, `text-x-success`, `border-x-success/30` (eventos com `color='success'` ou `status` mapeado).
- `bg-x-info/15`, `text-x-info`, `border-x-info/30` (idem `info`).
- `bg-x-warning/15`, `text-x-warning`, `border-x-warning/30` (idem `warning`).
- `bg-x-destructive/15`, `text-x-destructive`, `border-x-destructive/30` (idem `destructive`).
- `bg-muted`, `text-muted-foreground`, `border-border` (idem `muted` — fallback de evento sem status).

Convenção: **fundo translúcido + texto saturado + borda translúcida** — calendário tem alta densidade de cor, opacidade 15/30 mantém legibilidade do `title` sobreposto e evita "muralha de cor" característica de calendários mal feitos.

> **Day-of-today destaque**: o dia corrente tem `ring-2 ring-primary ring-inset` na célula (month/week). Sem fundo cheio — só ring — pra não conflitar com cores de eventos do dia.

## Ícones (Phosphor only)

- `CaretLeft` / `CaretRight` — navegação de range.
- `CalendarBlank` — empty state.
- `Funnel` — toggle de legenda em mobile.
- `Calendar` — ícone do botão `Hoje` (opcional, junto do label).
- `DotsThree` — affordance de "+N more" em célula cheia.

Todos peso `regular` (1.5px stroke), tamanho `16px` em controles e `20px` em empty state.

## Divergências conscientes do legado (F036)

Decisões deliberadas em relação ao contrato `model-valor-genericcalendar`:

1. **`tempoDescarga` removido do schema canônico** — campo de domínio agendamento vazado pro renderer "genérico". Consumidor adapta exibição via `description` ou `summarySlot`.
2. **`eventCounterProp` removido** — legado hardcodava `'eventStatus'` ignorando o model; Studio canoniza `status` como campo do evento.
3. **Dead props `views`, `messages`, `eventProp`, `checkFilterToFocusCalendar`, `onClick`, `onDoubleClick` resolvidas**:
   - `enabledViews` **ativo** (corrige `views`).
   - `emptyMessage` **ativo** (corrige `messages.noEventsInRange`).
   - `eventProp`, `checkFilterToFocusCalendar`, `onClick`, `onDoubleClick` **descartados** — não havia uso real e a intenção não estava clara.
4. **Range-select via mousedown→mouseup removido** — legado só fazia `console.log`. Studio não implementa porque não há demanda canônica; quando demandado, criar `editable-calendar` separado.
5. **Mutex global `_requestInProgress` removido** — cada instância é independente; concorrência delegada ao consumidor (que controla o fetch).
6. **`setPageBlur(true)` global removido** — substitui por `loading` prop local que renderiza skeleton na view ativa. Sem blur global.
7. **`style` como string JSON serializada eliminada** — `StatusConfig.color` é nome de token semântico (`'success'`, etc.), não JSON com hex/rgb.
8. **Bifurcação `fillGenericForm` vs `onClickCalendarEvent` colapsada em `onEventClick`** — consumidor decide o que fazer (abrir form modal, navegar, etc.). Componente não tem opinião.
9. **`additionalFilterParams` e `dParamN` movidos pra borda** — componente não conhece esquema de filtros nem interpolação; consumidor (o `model-page` wrapper) resolve antes de chamar o endpoint.
10. **Mobile-first** — viewport <640px deixa de ser bug; tem layout dedicado.

## Sources

- [[calendar/notes/2026-05-16.md]]
- [[model-valor-genericcalendar]] (contrato legado / F036)
- [[date-pickers]] (F018 — partilha `date-fns` + locale pt-BR)
- [[generic-filter]] (F016 — convive como filter acima do calendar)
