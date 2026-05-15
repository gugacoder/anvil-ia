---
title: "Dashboard Widget"
aliases: [dashboard-widget, widget, dashboard-box, kpi-card, dashboard-chart, dashboard-switcher, dashboard-gauge]
tags: [ui-system, component, dashboard, widget, chart, kpi, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Dashboard Widget

Primitivo do **slot de conteúdo** que vive dentro de um [[dashboard]]. Um widget recebe um descritor (`{tipo, procedure, filtros, intervalo, data}` — derivado de `ChartDataItem` no contrato [[model-valor-dashboard]]) e renderiza um cartão auto-contido com header (nome + controles), corpo (visualização tipada) e footer (status). Esta spec define o **vocabulário visual cross-tipo** (card, header, footer, estados) **+ catálogo de tipos** (KPI, tabela compacta, charts, gauge, switcher) com suas particularidades.

Widget é responsável pela **renderização e ciclo de vida da sua visualização**; a **orquestração de fetch e refresh é do [[dashboard]] pai**, que dispara `onRefresh()` no widget conforme o `refreshPolicy`. O widget só sabe pintar `loading|empty|error|data` para o seu `tipo`.

## Quando usar

- Como filho direto de [[dashboard]] em qualquer um dos slots.
- Avulso, em **outras superfícies**, quando precisar mostrar 1 visualização tipada de dados (ex.: KPI em página de cadastro, gauge em modal de status). Spec aceita uso isolado desde que o caller forneça `data` e gerencie refresh.

## Quando NÃO usar

- Para **listagem grande paginada** — use [[data-grid]]. A variante `table` aqui é compacta, sem paginação/filtro próprio, sem header sortable.
- Para **formulário** — use [[generic-form]].
- Para **árvore** — F013 spec própria.
- Como base para **edição inline** de dados — widgets são read-only no v1.

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `id` | string | obrigatório | Identificador estável (chave para refresh, persistência, drag). |
| `tipo` | enum | obrigatório | Discriminante do renderer interno — ver §"Catálogo de tipos". |
| `title` | texto | — | Nome do widget no header. Vem de `widget.nome` no contrato. |
| `description` | texto | — | Tooltip ao hover no header (info adicional do catálogo). |
| `data` | varia por tipo | — | Dados resolvidos para render. Forma depende de `tipo` (ver tabela). |
| `loading` | boolean | `false` | Render skeleton se `true` e sem `data` prévia; ou pulse-overlay sutil se há `data` (refresh em curso). |
| `error` | objeto `{message, code?}` | — | Render error-state interno. |
| `lastUpdatedAt` | timestamp | — | Mostrado no footer como "Atualizado há X". |
| `intervalSeconds` | número | — | Mostrado no menu do widget (informativo); dashboard pai consome para timer. |
| `filterChips` | `Chip[]` | `[]` | Renderiza chips abaixo do header quando filtros aplicados ao widget. |
| `onRefresh` | callback | — | Disparado pelo botão "Atualizar agora" do menu ou pelo dashboard pai. |
| `onConfigure` | callback | — | Disparado pelo botão `Gear` (visível só em `mode='edit'` do dashboard pai). |
| `onRemove` | callback | — | Disparado pelo `X` (`mode='edit'`). |
| `onFilterOpen` | callback | — | Abre o modal de filtros (ver F016 `generic-filter`). Botão `Funnel` no header. |
| `editMode` | boolean | `false` | Quando `true`, mostra handles de drag/resize (dashboard pai injeta). |
| `linkedSlotId` | string | — | Só para `tipo='switcher'`. Slot alvo cujo conteúdo é trocado. |
| `onSwitcherSelect` | callback | — | Só para `tipo='switcher'`. Recebe `{targetWidget}` para o dashboard pai trocar conteúdo do slot alvo. |
| `options` | objeto tipo-específico | — | Opções de renderização (eixo, formatação, paleta). Ver tabela por tipo. |

## Anatomia comum (card)

Todo widget herda esta moldura:

```
┌───────────────────────────────────────────┐
│  [icon] {title}        [funnel] [⋮]       │  ← header
│  {filter-chips?}                          │
├───────────────────────────────────────────┤
│                                           │
│         <body por tipo>                   │  ← corpo (flex-1, overflow per tipo)
│                                           │
├───────────────────────────────────────────┤
│  [status-icon] Atualizado há Xs   [intervalo]?  │  ← footer (opcional)
└───────────────────────────────────────────┘
```

### Card (container)

- `bg-card`, `border border-border`, `rounded-lg`, `overflow-hidden`.
- Sombra: **nenhuma** por padrão (princípio "bordas finas, sem sombra dramática"). `shadow-sm` apenas em estado `dragging`.
- Flex column; corpo tem `flex: 1 1 auto; min-height: 0` (importante para charts redimensionarem corretamente).

### Header do widget

- Altura: `h-10` mobile, `h-11` desktop. `px-3` lateral.
- **Esquerda**: ícone Phosphor representativo do `tipo` (KPI: `Gauge`/`NumberSquareOne`; tabela: `Table`; bar: `ChartBar`; line: `ChartLine`; pie: `ChartPieSlice`; area: `Waveform`; gauge: `Speedometer`; switcher: `Tabs`) + `title` em `text-sm font-semibold text-foreground truncate`.
- **Direita**: botões em ícone (16px), `gap-1`:
  - `Funnel` (filtros, se `onFilterOpen` definido) — badge dot quando filtro ativo.
  - `DotsThreeVertical` (kebab) — dropdown com: `Atualizar agora`, `Ver detalhes` (mostra metadata: procedure, intervalo, última atualização), `Configurar` (só edit), `Remover` (só edit).
- Em `editMode`: kebab é substituído por `Gear` (Configurar) + `X` (Remover) diretos. Handle de drag (`DotsSix`) aparece à esquerda absoluta, antes do ícone.
- Hover no header: leve `bg-muted/20`.

### Filter chips

- `flex flex-wrap gap-1 px-3 py-1.5 border-b border-border` quando há chips.
- Cada chip: `[label: value ×]` com mesma estilística dos chips de [[data-grid]].

### Body

- `flex-1 min-h-0 p-3` por padrão; tipos específicos ajustam (KPI tem `p-4` extra para respiração; charts removem padding e aplicam só nas margens internas via Recharts; tabela usa `p-0` e padding nas células).
- `overflow: auto` em tabela; `overflow: hidden` em charts/KPI/gauge.

### Footer

- Opcional (default oculto se `lastUpdatedAt` ausente).
- Altura: `h-8`, `px-3`, `border-t border-border`, `bg-muted/10`, `text-xs text-muted-foreground`.
- Esquerda: ícone de status (spinner `CircleNotch` se `loading && data`, check `Check` muted se idle, `WarningCircle` se `error-partial`) + "Atualizado há {Xs|Xmin|Xh}" relativo.
- Direita (desktop): badge sutil com `intervalSeconds` formatado (`a cada 30s`).
- **Mobile**: footer pode colapsar para só o ícone de status (texto vai para tooltip) quando widget < 200px de largura — economiza altura preciosa.

## Catálogo de tipos

### `kpi` (sucessor de `'String'`)

Cartão 1-valor.

**Forma de `data`**:
```
{ label: string, value: string|number, delta?: { value: number, direction: 'up'|'down'|'flat' }, sublabel?: string }
```

**Render**:
- Body centralizado vertical e horizontal.
- `label` em `text-xs uppercase tracking-wide text-muted-foreground` (opcional — só renderiza se label não cabe no header).
- `value` GRANDE: `text-4xl font-bold text-foreground tabular-nums` (mobile: `text-3xl`). Formatação por `options.format`: `number`, `currency`, `percent`, `compact` (Intl com `notation: 'compact'`). Default: `text-as-is`.
- `delta` (opcional, novo no Studio — não existe no legado): chip pequeno abaixo do value: `↑ 12%` em `text-x-success` (up) / `↓ 5%` em `text-x-error` (down) / `→` em `text-muted-foreground` (flat). Ícones Phosphor `TrendUp`/`TrendDown`/`Minus`. Tone semântico opcional (algumas métricas "menos é melhor"; `options.deltaInverse: true` inverte cores).
- `sublabel` em `text-xs text-muted-foreground` abaixo do delta.

**Options**:
- `format: 'number'|'currency'|'percent'|'compact'|'text'`
- `currency: 'BRL'` (default), `locale: 'pt-BR'` (default)
- `decimals: 0` (default — varia por format)
- `deltaInverse: false` (default)
- `accentColor: 'neutral'|'info'|'success'|'warning'|'error'` — colore o `value` no token semântico (default: `foreground`).

**Empty state**: `value = "—"` em `text-muted-foreground`.

**Não-rolar**: o KPI **nunca scrolla**; valor longo trunca com tooltip ou cai para `compact`.

### `table` (sucessor de `'Grid'`)

Tabela compacta read-only — **dumb table**, sem ordenação/paginação/filtro próprio. Para listagem rica, use [[data-grid]].

**Forma de `data`**:
```
{ headers: [{ label, prop, align?, type? }], rows: Row[] }
```

**Render**:
- `<table>` HTML completo dentro de container com `overflow-auto`.
- Header sticky no topo do body do widget (`position: sticky; top: 0; bg-muted/20`).
- Headers em `text-xs font-semibold uppercase text-muted-foreground tracking-wide`, `px-2 py-1.5`, `border-b border-border`.
- Linhas: `h-8` (denso), `border-b border-border/50`, hover `bg-muted/20`.
- Células: `px-2 py-1.5 text-sm`. Renderers `type` reaproveitam do [[data-grid]]: `text`, `number` (tabular-nums + align end), `date`, `badge`, `boolean-icon`.
- **Limite visual**: até ~50 linhas confortável; acima, recomenda-se migrar para [[data-grid]]. Widget não pagina.
- **Color row**: respeita `row['@color']` via mapping (mesma tabela do [[data-grid]]).

**Mobile**: tabela rola horizontalmente quando necessário (`overflow-x: auto`). Não há transformação para cards (ao contrário do [[data-grid]]) — o widget é pequeno e a tabela compacta funciona como "tabela mesmo".

**Options**:
- `maxHeight: 'auto'` (preenche o card) | `'<n>px'` — controla altura interna.
- `striped: false` (default — sutileza, sem zebra agressiva).
- `showRowNumbers: false`.

**Empty state**: `EmptyState` discreto: ícone `MagnifyingGlassMinus` + "Sem dados" centralizado.

### Charts (bar | line | pie | area | column)

Renderizados via **Recharts** (decisão F012 — substitui Google Charts). Esta spec descreve **comportamento conceitual**; mapeamento de tipo legado → componente Recharts é responsabilidade do smith.

| Tipo Studio | Recharts | Legado (Google Charts) |
|---|---|---|
| `bar` (horizontal) | `<BarChart layout="vertical">` | `'Bar'` (material) |
| `column` (vertical) | `<BarChart layout="horizontal">` | `'ColumnChart'`, `'Bar'` classic |
| `line` | `<LineChart>` | `'Line'`, `'LineChart'` |
| `area` | `<AreaChart>` | `'AreaChart'` |
| `pie` | `<PieChart><Pie>` | `'PieChart'` |

**Forma de `data`** (canônica cross-charts):
```
{ series: [{ key, label, color? }], rows: [{ category, [seriesKey]: number, ... }] }
```

Onde `category` é o eixo categórico (string) e cada `seriesKey` é o valor numérico em cada série. Adapter no engine F012 converte o `[[header], [row1], ...]` legado para essa forma.

**Render comum**:
- Body sem padding (`p-0`); Recharts respeita `ResponsiveContainer` 100%/100%.
- **Paleta**: gerada a partir de tokens semânticos. Default: ciclo `[primary, x-info, x-success, x-warning, x-error, accent]`. Override por série via `series[].color` (aceita só token semântico; hex rejeitado com warning).
- **Tooltip**: customizado para usar `bg-popover text-popover-foreground border border-border rounded-md shadow-sm px-3 py-2`; valores em `tabular-nums`.
- **Legenda**: na base do body, `text-xs`. Em widget < 300px largura, legenda colapsa em "Mostrar legenda" (botão pequeno que expande sobre o body em popover).
- **Axes**: tick labels em `text-xs text-muted-foreground`; eixo line `stroke="hsl(var(--border))"`.
- **Grid lines**: `strokeDasharray="3 3"` em `border-color` muted, **só horizontais** (linhas verticais somem em bar/line/area — reduz ruído).

**Options por tipo**:

**`bar` / `column`**:
- `stacked: boolean` (default `false`) — empilha séries.
- `showValues: boolean` (default `false`) — labels nos topos das barras (cuidado com overlapping).
- `barRadius: 2` (default — bordas arredondadas leves).

**`line`**:
- `smooth: boolean` (default `false` — linhas retas; `true` = curva monótona).
- `dots: boolean` (default `true` em widget pequeno, `false` em widget grande).
- `area: boolean` (default `false` — sombrear abaixo da linha; quando `true` vira semanticamente um `area` chart).

**`area`**:
- `stacked: boolean` (default `false`).
- `opacity: 0.6` (default).

**`pie`**:
- `innerRadius: 0` (default — pie pura); `> 0` = donut (recomendado `innerRadius=60` para donut padrão).
- `showLabels: 'percent'|'value'|'none'` (default `'percent'`).
- `sortBySize: boolean` (default `true`).

**Empty state**: ilustração discreta (`ChartLine` muted) + "Sem dados suficientes para o gráfico".

**Erro de forma**: se `rows` vazio mas `series` definido → empty. Se schema inválido (séries inconsistentes entre linhas) → error-state interno.

### `gauge` (medidor)

Gauge semicircular (ou circular completo) — útil para KPIs com **meta/range**.

**Forma de `data`**:
```
{ value: number, min: number, max: number, label?: string, thresholds?: [{ value, tone }] }
```

**Render**:
- SVG arc customizado (Recharts não tem gauge nativo — implementação caseira).
- Arco semicircular (180°) por default; full-circle (360°) quando `options.shape='circle'`.
- Background do arc em `bg-muted/30`; fill no token semântico baseado em `thresholds` (ex.: < 50% = `success`; 50–80% = `warning`; > 80% = `error`).
- Valor central: `text-3xl font-bold tabular-nums` no token do threshold corrente.
- Label `min`/`max` nas pontas do arc em `text-xs text-muted-foreground`.
- `label` (opcional) abaixo do valor.

**Options**:
- `shape: 'semi'|'circle'` (default `'semi'`).
- `format: 'number'|'percent'|'currency'` (default `'number'`).
- `thickness: 12` (px, default).
- `thresholds: []` — ranges de tom. Default: tom único `primary`.

**Animation**: ao mudar `value`, arc anima do valor anterior ao novo em 400ms (`slow`) `ease-out`. Reduced-motion: snap.

**Empty state**: arc cinza + "—" no centro.

### `switcher` (sucessor de `'Buttons'`)

**Repensado**: o legado faz "botões num quadrante trocam conteúdo de outro" — acoplamento confuso. Studio mantém o mecanismo (paridade) mas redesenha como **segmented control** ou **tab bar** dentro do widget switcher, com labels claras e indicação visual do slot afetado.

**Forma de `data`**:
```
{ options: [{ id, label, widgetRef }], currentId: string }
```

Onde cada `widgetRef` é a referência ao objeto do catálogo cujo conteúdo será carregado no slot alvo.

**Render**:
- Body sem padding lateral; segmented control horizontal preenche largura.
- Cada opção: `flex-1` (até 4 opções) ou scroll horizontal (5+ opções, scroll snap).
- Item ativo: `bg-primary text-primary-foreground`, `rounded-md`.
- Itens inativos: `text-muted-foreground hover:text-foreground hover:bg-muted/40`.
- Altura: `h-9`, `text-sm font-medium`, `px-3`.
- Animação do "underline/pill" do ativo: `transition-all 200ms ease-out` (move-se entre posições).
- **Em mobile com 5+ opções**: vira dropdown `select`-like (`Select` componente, abre bottom-sheet) — segmented quebra em viewport estreita.

**Indicação do slot alvo**: footer do switcher widget mostra texto sutil `"Atualiza: {targetWidgetTitle}"` em `text-xs text-muted-foreground` — torna explícito o acoplamento que no legado é invisível.

**Em edit mode**: se `linkedSlotId` inválido, banner vermelho dentro do widget: `WarningCircle` + "Selecione um slot alvo nas configurações".

**Comportamento**: click em opção dispara `onSwitcherSelect({targetWidget: option.widgetRef})`; dashboard pai troca o `widget` do slot alvo e dispara fetch.

**Options**:
- `maxOptions: 10` (paridade legado).
- `variant: 'segmented'|'tabs'|'pills'` (default `'segmented'`; tabs adiciona underline na base; pills usa border-radius full).

### Tipo desconhecido (fallback)

Quando `tipo` não está no catálogo (caso comum no legado por causa de Google Charts: `'GeoChart'`, `'TreeMap'`, `'Sankey'`, `'ScatterChart'`, etc. não migrados):

**Render**:
- Body com ícone `Question` (Phosphor) muted, `text-muted-foreground`.
- Título: `"Tipo de widget não suportado"`.
- Subtítulo: `"Tipo: {tipo}"` em `text-xs`.
- Em `editMode`: botão "Trocar tipo" abre configuração.
- Em produção (não-edit): apenas placeholder + log + warning no debug strip.

**Catálogo de tipos legado com mapping no MVP** (smith implementa adapter):

| Legado | Studio | Estratégia |
|---|---|---|
| `'String'` | `kpi` | Direto. |
| `'Grid'` | `table` | Direto. |
| `'Buttons'` | `switcher` | Direto, com redesign visual. |
| `'Line'` | `line` | Direto. |
| `'Bar'` (material) | `bar` (horizontal) | Direto. |
| `'ColumnChart'`, `'Bar'` classic | `column` | Direto. |
| `'PieChart'` | `pie` | Direto. |
| `'AreaChart'` | `area` | Direto. |
| `'Gauge'` | `gauge` | Direto. |
| `'ScatterChart'` | — | Fallback `unknown` no MVP; sub-feature P2 (`widget-scatter`). |
| `'ComboChart'` | — | Fallback; sub-feature P2 (`widget-combo`). |
| `'GeoChart'`, `'TreeMap'`, `'Sankey'`, `'OrgChart'`, `'CandlestickChart'`, `'Histogram'`, `'BubbleChart'`, `'WordTree'`, `'Timeline'` | — | Fallback. Sinal ao curator: avaliar inventário real de uso antes de implementar. Maioria provavelmente raríssima. |

## Estados (cross-tipo)

- **idle** — `data` presente, `loading=false`, `error=null`. Render normal.
- **loading-initial** — `data` ausente, `loading=true`. Body mostra **skeleton tipado**:
  - KPI: bloco `bg-muted/30 animate-pulse h-12 w-3/4` no centro.
  - Tabela: 4 linhas de `bg-muted/30 animate-pulse h-6` com `gap-y-1`.
  - Chart: bloco `bg-muted/30 animate-pulse h-full w-full`.
  - Gauge: círculo `bg-muted/30 animate-pulse h-32 w-32` no centro.
  - Switcher: 3 pílulas `bg-muted/30 animate-pulse h-9 w-20`.
- **loading-refetch** — `data` presente, `loading=true`. Header pulse (`bg-muted/40` por 200ms); body mantém dados anteriores; footer mostra spinner `CircleNotch` no lugar do check.
- **empty** — `data` presente mas vazio (rows.length === 0 ou value undefined). Render empty-state por tipo (descrito acima).
- **error** — `error` definido. Body mostra:
  - Ícone `WarningCircle` em `text-x-error`.
  - Título: `"Não foi possível carregar"` em `text-sm font-medium`.
  - Mensagem: `error.message` em `text-xs text-muted-foreground` (truncate com tooltip se longa).
  - Botão `Tentar novamente` (link button `text-primary`).
- **filter-incomplete** — quando widget requer filtro e ele está vazio (ex.: filtro obrigatório do catálogo `TBobjetos_dashboard.DFfiltros`). Body mostra: ícone `FunnelSimple` + "Aplique o filtro para ver os dados" + botão `Abrir filtros`.
- **drag-over** (em edit, sendo arrastado) — card ganha `shadow-md` + `opacity-80`.
- **drag-source** (sendo arrastado) — card original fica `opacity-40`.

## Motion

- **fade do conteúdo após refresh**: `data` muda → cross-fade 150ms (`fast`) `ease-out`. Aplicado por tipo:
  - KPI: número anima via odômetro (rolling digits) em 300ms para mudanças grandes; cross-fade simples para texto.
  - Charts: Recharts tem animação nativa (`isAnimationActive=true`, `animationDuration=400`); duração `slow`.
  - Gauge: arc anima como descrito acima.
  - Tabela: rows fazem stagger fade-in (cada linha 30ms de delay, total ≤ 300ms).
  - Switcher: indicator do ativo move-se 200ms `ease-out`.
- **pulse no header** (refresh em curso): `bg-muted/40` por 200ms (`fast`) e volta. Sinaliza atividade sem flash do conteúdo.
- **entrada do widget** (mount): scale-in sutil de `0.98` para `1` + fade-in, 200ms `ease-out`.
- **edit handles**: aparecem com fade 150ms ao entrar em `editMode`.
- **filter chip remoção**: chip animou `scale-0` + `opacity-0` em 150ms.
- **error-state shake**: ao primeiro erro (não em retries subsequentes), ícone `WarningCircle` faz shake 1× (300ms).
- **reduced-motion**: tudo cai para snap, exceto cross-fades curtos (50ms).

## Responsivo (resumo)

- **mobile (< 640px)**: widget ocupa full-width; header pode colapsar título longo com truncate; footer compacto (só ícone de status); switcher com 5+ opções vira dropdown.
- **tablet (640–1024px)**: widget ocupa 1 ou 2 colunas conforme `colSpan`; legenda de chart pode colapsar.
- **desktop (> 1024px)**: tamanho conforme grid do dashboard pai; todos os elementos visíveis.
- **thumb zone**: ações no kebab (canto superior) — ok porque são secundárias; switcher tem tap targets `h-9` (≥ 36px, aceitável para conteúdo denso; em pages dedicadas usar `h-11`).
- **gestos**: tap no switcher; tap-and-hold no kebab; sem swipe horizontal (não conflitar com pai).

## Acessibilidade

- Cada widget é `<section role="region" aria-labelledby="widget-{id}-title">`.
- `title` em `<h3 id="widget-{id}-title">`.
- Botões em ícone: `aria-label` explícito (`"Filtros"`, `"Mais opções"`, `"Atualizar agora"`).
- **KPI**: valor anunciado via `aria-live="polite"` quando muda (debounce 1s). `aria-label` no container: `"{label}: {value}"`.
- **Charts**: provê tabela equivalente em `<table>` visualmente oculta (`sr-only`) com headers e rows — leitor de tela acessa dados.
- **Gauge**: `role="meter" aria-valuenow={value} aria-valuemin={min} aria-valuemax={max} aria-label={label}`.
- **Switcher**: `role="tablist"` com items `role="tab" aria-selected`. Setas esquerda/direita navegam, Enter ativa.
- **Tabela**: semântica `<table><thead><tbody>` nativa; headers com `scope="col"`.
- **Error-state**: `role="status"` (não `alert` — não interrompe; usuário já vê).
- Foco visível em todos os controles (`focus-visible:ring-2 ring-ring`).
- **Contraste**: paleta de séries de chart sempre passa WCAG AA contra `bg-card`; smith valida com teste automatizado de contraste de paleta.

## Composição

- **Compõe**: `button` (header e error retry), `dropdown-menu` (kebab), `tooltip` (header truncate, status footer), `skeleton` (loading-initial), `inline-alert` (error interno em edit mode), `badge` (chip de delta no KPI, filter chips), `select`/`segmented-control` (switcher), Recharts components (charts).
- **É composto por**: [[dashboard]] (slot principal), avulso em qualquer superfície que precise de visualização tipada.

## Cores e tokens

- `bg-card`, `border-border` — card container.
- `bg-muted/10`, `bg-muted/20`, `bg-muted/30`, `bg-muted/40` — header hover, footer, skeleton, pulse de refresh.
- `text-foreground`, `text-muted-foreground` — textos principal e auxiliar.
- `text-primary`, `bg-primary` — switcher ativo, retry button, primeira série default de chart.
- `text-x-info`, `text-x-success`, `text-x-warning`, `text-x-error` — paleta de séries, threshold de gauge, delta direção.
- `bg-x-success/10`, `bg-x-warning/10`, `bg-x-error/10` — fundos de thresholds.
- `bg-popover`, `text-popover-foreground` — tooltips de chart.
- `border-input`, `ring-ring` — focus visible.

**Paleta de séries (cross-chart)**: smith implementa como array de tokens; spec impõe que **todas as cores de série venham de tokens semânticos** (proibido hex direto, mesmo para "cor de marca").

## Edge cases

- **`data` com tipos heterogêneos** (linha numérica inesperada em coluna não-numérica de chart): warning + tenta coerção; se falha, error-state com mensagem "Formato de dados inesperado para o tipo {tipo}".
- **KPI com `value` extremamente longo** (ex.: 21 dígitos): formata em `compact` (`21.4Q`); tooltip mostra valor pleno.
- **Tabela com 500+ linhas**: continua renderizando, mas footer mostra warning "Conteúdo grande; considere usar uma grid completa". Sub-feature `widget-table-virtualization` (P2).
- **Chart com 1 ponto só**: line/area degenera; pinta só o ponto. Bar mostra a barra. Pie com 1 fatia mostra círculo cheio + label.
- **Pie com 12+ fatias**: agrupa as menores em "Outros" automaticamente (configurável via `options.othersThreshold`).
- **Gauge com `value` fora de range**: clamp; warning no console.
- **Switcher com `linkedSlotId` órfão** (slot alvo foi removido): em view mode, mostra erro; em edit mode, força reconfiguração.
- **Refresh dispara durante interação do usuário** (ex.: hover em barra do chart com tooltip aberto): mantém tooltip; só atualiza após mouseleave. Reduce flicker.
- **Theme switch** (light → dark): paleta de tokens recalcula; charts re-renderizam com nova paleta (Recharts não é reativo a CSS variables nativamente; smith re-monta `<ResponsiveContainer>` em mudança de tema).
- **Locale em runtime**: KPI/tabela respeita `Intl.NumberFormat` corrente; mudança de locale força re-render (idiomatic React).
- **Snapshot legado com `data` desatualizado**: respeita exibição (paridade) mas footer mostra "Dados de {timestamp}" em `text-x-warning` até primeiro refresh.

## Notas para o smith

- **Recharts é a lib oficial** para charts no Studio (decisão F012). Encapsular em componentes `<KpiWidget>`, `<TableWidget>`, `<BarChartWidget>`, etc., cada um consumindo a forma canônica de `data` deste spec.
- **Adapter no engine F012** converte `chartData[idx]` legado → `WidgetSlot.widget` com `data` na forma desta spec. Spec não dita a forma do adapter; impõe a forma de saída.
- **Gauge é SVG custom**: implementar primitivo `<GaugeArc>` em `packages/ui/src/components/dashboard/gauge.tsx` (caminho sugerido, não obrigatório). Sem dependência externa.
- **Paleta de séries**: helper `getSeriesPalette(seriesCount)` retorna array de tokens semânticos (`['primary', 'x-info', 'x-success', 'x-warning', 'x-error']` ciclando). Reusa em todos os charts.
- **`aria-live` no KPI**: cuidado para não anunciar a cada refresh silencioso — só quando valor muda materialmente. Debounce 1s.
- **Equivalente em `<table>` para charts**: gerar a partir de `series` + `rows` automaticamente em `sr-only`. Reusa para screen readers e para "Ver dados como tabela" em menu kebab (P2 — sub-feature `widget-data-view`).
- **`onRefresh` é orquestrado pelo pai**: widget não tem timer próprio. Smith implementa hook `useDashboardRefresh(widgets, policy)` em [[dashboard]].
- **Forma do `error.message` vinda do backend**: humanizar — se vier "ORA-00942: table or view does not exist", widget mostra "Dados indisponíveis (erro no banco)" + erro técnico em tooltip ou debug strip.
- **Animação de chart só na primeira renderização**: configurar Recharts com `isAnimationActive` apenas no mount; refreshes subsequentes desligam animação para evitar pisca-pisca em widgets que atualizam a cada 10s.

## Notas vs legado (divergências conscientes)

- **Recharts em vez de Google Charts**: lib JS local, sem CDN externo, com tokens semânticos nativos, melhor a11y, sem trackers.
- **`String` rebatizado `kpi`** com `delta` opcional (novo) — antes era só label+valor.
- **`Grid` rebatizado `table`**, sem features avançadas (deliberado — para isso, use [[data-grid]]). Antes era HTML cru sem styling consistente.
- **`Buttons` rebatizado `switcher`** com visual de segmented control + indicação explícita do slot alvo (legado não indica).
- **Skeleton de loading**: legado usa overlay global.
- **Empty/error states por widget**: legado fica em silêncio ou cai em "Dados insuficientes" como toast.
- **Filter chips no widget**: legado tem botão de filtro mas estado é invisível depois de aplicado.
- **a11y completa**: legado não tem ARIA em charts, sem alternativa textual.
- **Reduced-motion respeitado**: legado anima sem checar preferência.
- **Tooltip de chart com design system**: legado usa tooltip default do Google Charts.
- **Paleta semântica**: legado não tem paleta consistente (depende do que admin cadastrou).
- **Aba oculta pausa refresh**: legado drena bateria.

## Sinais ao curator

- **`widget-scatter`** (sub-feature P2) — `'ScatterChart'` legado, Recharts `<ScatterChart>`.
- **`widget-combo`** (sub-feature P2) — `'ComboChart'` legado (bar + line no mesmo eixo).
- **`widget-treemap`** (sub-feature P3) — só se inventário cross-tenant mostrar uso real.
- **`widget-geo`** (sub-feature P3) — sem equivalente direto em Recharts; precisa lib externa (leaflet, react-simple-maps); avaliar uso real antes.
- **`widget-table-virtualization`** (P2) — para `table` com 500+ linhas.
- **`widget-data-view`** (P2) — opção no kebab para "Ver dados como tabela" (útil para charts complexos + a11y).
- **`widget-export`** (P3) — exportar widget individual (CSV de dados, PNG de chart).
- **`gauge-thresholds-from-catalog`** — definir thresholds via `TBobjetos_dashboard.DFfiltros` ou novo campo. Decisão de modelagem do catálogo.
- **`widget-kpi-delta-source`** — onde vem o `delta`? Backend precisa enviar (sub-contrato `proc-dashboard-response` precisa decidir).
- **`series-palette-tokens`** — tabela canônica de paleta de séries (ordem, fallbacks). Sub-spec curta.
- **`recharts-theme-bridge`** — hook que repinta charts ao trocar tema (`document.documentElement` class change). Spec própria se complicar.

## Sources

- [[calendar/notes/2026-05-15.md]] — UX de F012
- [[model-valor-dashboard]] — contrato legado + catálogo de `tipo`
- [[dashboard]] — superfície pai
