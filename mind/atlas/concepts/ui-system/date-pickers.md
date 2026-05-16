---
title: "Date Pickers (Date, DateTime, Time, DateRange, DateTimeRange)"
aliases: [date-pickers, datetimepicker, dateinterval, datetimeinterval, timepicker, form-field-date, form-field-datetime, form-field-time, form-field-date-range, form-field-datetime-range, F018]
tags: [ui-system, component, form, date, time, picker, F018, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Date Pickers

Família de **cinco variantes** que cobrem todo o vocabulário temporal do Studio. Substituem os quatro componentes legados (`DateTimePicker`, `DateInterval`, `DateTimeInterval`, `TimePicker` — ver contrato [[date-components]] / F018) com uma **primitiva unificada** parametrizada por modo (`single|range`) e granularidade (`date|datetime|time`). Nasce coesa onde o legado nasceu fragmentado.

Cada variante é uma extensão da [[form-field]] (label + controle + hint/error), portanto herda toda a anatomia de campo (foco, error, hint, required, disabled, sr-only label, `aria-describedby`). O que muda é o **controle interno**: trigger + popover (desktop) ou trigger + bottom-sheet (mobile), com calendário/relógio custom.

| Variante | Modo | Granularidade | Valor emitido (forma canônica Studio) |
|---|---|---|---|
| `form-field-date` | single | dia | `{ date: 'YYYY-MM-DD' \| null }` |
| `form-field-datetime` | single | dia + hora:minuto | `{ date: 'YYYY-MM-DD HH:mm' \| null }` |
| `form-field-time` | single | hora:minuto | `{ time: 'HH:mm' \| null }` |
| `form-field-date-range` | range | dia | `{ from: 'YYYY-MM-DD' \| null, to: 'YYYY-MM-DD' \| null }` |
| `form-field-datetime-range` | range | dia + hora:minuto | `{ from: 'YYYY-MM-DD HH:mm' \| null, to: 'YYYY-MM-DD HH:mm' \| null }` |

Para `time` em range (caso legado `TimePicker`), use **dois `form-field-time` lado a lado** explicitamente no consumidor — não há variante range dedicada porque a UX horária é muito leve para justificar um popover único de range; o range de hora aparece quase só em filtros de jornada e perde valor visual em calendário.

> **Adaptador para o backend legado**: o consumidor (generic-form, generic-filter) é responsável por traduzir o objeto interno para o **string CSV** que stored procedures legadas esperam (`"YYYY-MM-DD,YYYY-MM-DD"`, etc., ver [[date-components]] §"Payload"). O componente do design system **não emite CSV** — emite objeto. A adaptação é uma única função utilitária na borda do form/filter.

## Quando usar

- Qualquer campo de data/hora/intervalo em [[generic-form]] (F010), [[generic-filter]] (F016), [[dashboard]] (F020).
- Filtros de data em [[data-grid]] (header column quick-filter usa a mesma primitiva, em variante compacta).
- Pickers contextuais em modais de ação (`executeExternalAction=true`).

## Quando NÃO usar

- Para **timestamp imutável de exibição** (criado em, atualizado em) — esses são texto formatado, não picker.
- Para **duração** (ex: 2h30min) — duração não é hora-do-dia; criar `duration-input` quando demandado.
- Para **calendário de eventos navegável** (mês inteiro com eventos plotados) — esse é `event-calendar` (F019 generic-calendar), não picker.
- Para **só-mês** ou **só-ano** (não há contrato legado nem demanda atual). Se demandado, criar `form-field-month`/`form-field-year`.

## Decisão de UX: nativo vs custom

O contrato legado usa `<input type="date">` nativo em 3 dos 4 componentes. Para o Studio, a decisão é:

- **Desktop**: sempre **custom** (calendário shadcn + popover). Motivos:
  - Consistência cross-browser (Chrome/Firefox/Safari renderizam o nativo diferente).
  - Locale pt-BR garantido (nativo depende do OS).
  - Suporte a range de calendário (nativo não tem).
  - Teclado e a11y controlados.
- **Mobile**: também **custom** (bottom-sheet com calendário full-width). Motivos:
  - UX consistente com desktop (mesma forma mental).
  - Picker nativo do iOS é decente mas o do Android varia muito por OEM.
  - Range em nativo não existe — precisaríamos de dois inputs separados, que é exatamente a UX ruim do legado.
  - **Exceção opt-in**: em formulários muito densos onde o overhead de bottom-sheet incomoda (ex: tabela inline), o consumidor pode passar `nativeMobile=true` para cair no `<input type="date">` nativo. Default é custom.

Conclusão: **custom em ambos os viewports**. A "consistência" supera o ganho marginal do nativo.

## API conceitual

Herda toda a API de [[form-field]] (`label`, `labelHidden`, `hint`, `error`, `required`, `disabled`, `readOnly`, `id`). Acrescenta:

### Comuns a todas as variantes

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `value` | objeto canônico (ver tabela acima) | `null` (single) ou `{from:null,to:null}` (range) | Valor controlado. |
| `onChange` | callback `(value) => void` | — | Emite o objeto canônico. **Nunca string CSV.** |
| `min` | string (mesma granularidade do value) | — | Limite inferior selecionável. |
| `max` | string (mesma granularidade do value) | — | Limite superior selecionável. |
| `allowedDates` | string[] (formato `YYYY-MM-DD`) | — | Whitelist exata. Datas fora ficam desabilitadas no calendário e bloqueadas para entrada manual. Substitui `allowDates` do legado (também muda o formato de `dd/mm/yyyy` para ISO — internalização do legado para a borda do consumidor). |
| `allowedDatesEndpoint` | `{ url, body }` | — | Endpoint POST que retorna `string[]` (formato `YYYY-MM-DD`) populando `allowedDates` quando o popover/sheet abre. Substitui o `api`/`apiParams`/`pageState` do legado, encapsulando-os em um descritor único. |
| `defaultValue` | objeto canônico ou função `() => objeto` | — | Valor inicial quando `value` é nulo no mount. Substitui o `useDefaultDate` tristate do legado por algo explícito. **Designer recomenda: nada de default automático "hoje" salvo quando o consumidor declarar explicitamente.** |
| `nativeMobile` | boolean | `false` | Em mobile, usa `<input type="date|datetime-local|time">` em vez do bottom-sheet custom. Opt-in para forms densos. |
| `placeholder` | string | depende da variante (ver §"Estados") | Texto do trigger quando `value` é nulo. |

### Específicas de single (date / datetime / time)

| Propriedade | Tipo | Default | Efeito |
|---|---|---|---|
| `showWeekNumbers` | boolean | `false` | Mostra coluna de número da semana no calendário. |
| `timeStep` | número (minutos) | `5` (datetime) / `15` (time) | Granularidade do seletor de minutos. |
| `timeFormat` | `12h` \| `24h` | `24h` (padrão pt-BR) | Formato de exibição da hora. |

### Específicas de range (date-range / datetime-range)

| Propriedade | Tipo | Default | Efeito |
|---|---|---|---|
| `presets` | `{ label, range }[]` | (lista padrão pt-BR, ver §"Presets") | Atalhos rápidos: "Hoje", "Esta semana", "Este mês", etc. Renderizados em coluna lateral (desktop) ou linha rolável horizontal (mobile). |
| `minRange` | número (dias) | — | Range mínimo em dias. Se violado, mostra warning visual. |
| `maxRange` | número (dias) | — | Range máximo em dias. Se violado, mostra warning visual. |
| `swapOnInvert` | boolean | `false` | Se `true`, ao receber `from > to` o componente troca os valores silenciosamente. Default `false` (preserva intenção do usuário e sinaliza warning — designer recomenda). |

## Estrutura visual

### Trigger (desktop e mobile)

```
[ label ]   [ * ]
[ ┌──────────────────────────────────────┐ ]
[ │ [Calendar icon]  DD/MM/AAAA          │ ]   ← single date
[ │ [Calendar icon]  DD/MM/AAAA HH:mm    │ ]   ← single datetime
[ │ [Clock icon]     HH:mm               │ ]   ← single time
[ │ [Calendar]  DD/MM/AAAA – DD/MM/AAAA  │ ]   ← range (um trigger único, formato pt-BR)
[ └──────────────────────────────────────┘ ]
[ hint OR error message                    ]
```

- **Trigger é um único input com máscara** (não dois campos separados como no legado). A máscara aceita digitação direta no formato pt-BR (`DD/MM/AAAA` ou `DD/MM/AAAA HH:mm`).
- **Ícone à esquerda** (`prefix` herdado de form-field): Phosphor `Calendar` para datas, `Clock` para hora.
- **Ícone à direita** (suffix): `CaretDown` quando vazio/colapsado, `X` quando `clearable` e tem valor (clique zera).
- **Range em um trigger só**: visualmente `DD/MM/AAAA – DD/MM/AAAA` com en-dash. Clicar em qualquer parte abre o popover/sheet de range. **Por que não dois campos?**: o legado usa dois inputs e isso fragmenta a UX — o usuário não percebe que é "um intervalo", percebe como "dois campos quaisquer". Trigger único reforça a semântica de intervalo.

### Popover desktop (single date / datetime / range)

```
┌────────────────────────────────────────┐
│ ◀  maio 2026               ▶  ▼ano    │
├────────────────────────────────────────┤
│ dom seg ter qua qui sex sáb            │
│                                        │
│           1   2   3   4   5            │
│   6   7   8   9  10  11  12            │
│  13  14  15  16  17  18  19            │
│  20  21  22  23  24  25  26            │
│  27  28  29  30  31                    │
├────────────────────────────────────────┤ ← só em datetime
│ Hora: [ 14 ] : [ 30 ]                  │
├────────────────────────────────────────┤
│ [ Limpar ]               [ Hoje ]      │
└────────────────────────────────────────┘
```

- Primeiro dia da semana: **domingo** (padrão pt-BR).
- Cabeçalho com mês/ano clicáveis (clique → muda para grid de meses ou grid de anos — drill-up navegável).
- Footer com `Limpar` (esquerda) e `Hoje` (direita) — atalhos discretos. `Limpar` zera o valor; `Hoje` salta a navegação (não seleciona).
- Em **range**, dois meses lado a lado em desktop largo (≥ 768px de popover); um mês só em desktop estreito. Seleção em duas etapas: clica `from` → hover destaca o futuro `to` → clica `to`.

### Bottom-sheet mobile

Usa [[modal-sheet]] em modo `bottom-sheet` (vaul). Conteúdo:

- Handle no topo (padrão vaul).
- Header com mês/ano clicáveis (mesma drill navigation que desktop).
- Calendário **full-width** com células maiores (≥ 40×40px para tap-target).
- Em range: um mês de cada vez; chips no topo mostram `De: 15/05` `Até: 20/05` que destacam qual ponta está sendo editada.
- Em datetime: roda de hora + roda de minuto abaixo do calendário (estilo wheel/picker — duas colunas verticais com snap).
- Em time-only: só as rodas, sem calendário.
- Footer fixo: `Cancelar` (texto, esquerda) + `Confirmar` (primary, direita). Em mobile **submit é explícito** — nada se aplica até o usuário confirmar.

### Time picker mobile (rodas)

```
┌──────────────┐
│  Hora        │
├──────┬───────┤
│  13  │  25   │
│  14  │  30   │  ← linha central destacada = valor selecionado
│  15  │  35   │
└──────┴───────┘
```

- Rodas com momentum scroll + snap.
- Step de minuto configurável (`timeStep`).
- Vibração háptica leve no snap (quando suportada).

## Estados

Herda estados de [[form-field]] (default/hover/focus/disabled/readOnly/error). Específicos:

- **default vazio** — trigger mostra placeholder. Defaults pt-BR:
  - date: `"DD/MM/AAAA"`
  - datetime: `"DD/MM/AAAA HH:mm"`
  - time: `"HH:mm"`
  - range: `"DD/MM/AAAA – DD/MM/AAAA"` (mesmo formato, com en-dash)
- **default preenchido** — formato pt-BR de exibição (`15/05/2026`, `15/05/2026 14:30`, `14:30`, `15/05/2026 – 20/05/2026`).
- **focused (trigger)** — anel de foco padrão de [[form-field]]; popover/sheet pode estar fechado ou aberto.
- **open (popover/sheet aberto)** — trigger mantém anel de foco para sinalizar ancoragem; popover tem sombra discreta (`shadow-md`) e borda `border`.
- **digitação na máscara** — se o usuário digita diretamente no trigger, o popover **não abre automaticamente**; abre só com clique no trigger ou na seta. Texto parcial (`15/05/____`) é tolerado; ao perder foco com data válida emite `onChange`.
- **invalid input (digitação inválida)** — borda `border-x-warning` + ícone `WarningCircle` no suffix + mensagem `"Data inválida"` substituindo hint. **Não bloqueia** — preserva o que o usuário digitou para correção (aligned com legado: validação visual, não barreira).
- **interval invertido** (`from > to` em range) — borda `border-x-warning` + ícone `WarningCircle` + mensagem `"Data inicial deve ser anterior à final"`. **Não bloqueia onChange**: emite mesmo assim, deixando o consumidor/backend decidir. (Decisão alinhada com [[generic-filter]] §"Operadores são invisíveis" — Studio sinaliza, backend julga.)
  - Exceção: se `swapOnInvert=true`, troca silenciosa sem warning.
- **outside range** (valor fora de `min`/`max` ou `allowedDates`) — datas inválidas ficam desabilitadas no calendário (cinza, sem hover); se digitadas via máscara, estado **invalid input** acima.
- **loading** (`allowedDatesEndpoint` em flight) — popover mostra spinner `CircleNotch` Phosphor centralizado no lugar do grid de dias. Trigger fica em estado normal.
- **error endpoint** — popover mostra inline-alert variant `warning` com `"Datas indisponíveis. Tente novamente."` + botão retry pequeno.
- **disabled / readOnly** — herdado de form-field. Trigger não abre popover; máscara não aceita input.

## Motion

- **popover abre**: scale 0.96→1 + fade-in 150ms (`fast`), easing `ease-out`, origem no trigger.
- **popover fecha**: fade-out 100ms.
- **bottom-sheet abre**: slide-up do bottom 250ms (`normal`), spring leve (vaul default).
- **bottom-sheet fecha**: slide-down 200ms.
- **navegação mês (◀/▶)**: slide horizontal 200ms (`normal`) + crossfade do grid de dias.
- **drill-down (mês → ano → década)**: scale 1→0.9 + fade-out 150ms, novo grid scale 1.1→1 + fade-in 150ms.
- **seleção de dia**: célula pulsa scale 1→1.1→1 em 200ms; preenchimento de cor 150ms (`fast`).
- **range em construção** (hover entre `from` e `to`): faixa de fundo `bg-primary/10` aparece com fade 100ms; bordas arredondadas só nas extremidades.
- **warning aparece** (interval invertido ou input inválido): mensagem desliza 2px + fade-in 150ms; borda muda cor sincronizada.
- **time wheel snap**: célula central destaca em 150ms; vibração háptica simultânea.
- **`prefers-reduced-motion`**: todas as animações caem para mudança instantânea, exceto fade do popover (mantém 100ms).

## Responsivo

- **mobile (< 640px)**:
  - Trigger altura `h-10`, texto `text-base` (16px — anti-zoom iOS).
  - Popover **nunca** abre; sempre bottom-sheet vaul.
  - Calendário full-width; células ≥ 40×40px; setas mensais 44×44px.
  - Footer fixo com `Cancelar` / `Confirmar` (submit explícito).
  - Range: chips `De`/`Até` no topo + um mês por vez.
- **tablet (640–1024px)**:
  - Mesmo trigger.
  - Popover (não bottom-sheet) com largura `max-w-[320px]` (single) ou `max-w-[560px]` (range, dois meses lado a lado).
  - Sem footer fixo `Cancelar/Confirmar` — fechamento por click-outside ou seleção completa.
- **desktop (> 1024px)**:
  - Trigger `h-9` em forms densos / `h-10` em forms primários.
  - Popover com dois meses em range; preset column lateral (`min-w-32`).
  - Footer com `Limpar` + `Hoje` apenas; nada de Cancelar/Confirmar (apply é imediato ao selecionar).
- **thumb zone / gestos**:
  - Bottom-sheet com drag handle (vaul) — swipe-down fecha.
  - Time wheel: swipe vertical com momentum + snap (não scroll-bar).
  - Calendário aceita swipe-left/swipe-right para mudar mês.

## Acessibilidade

- **Trigger**: `<button>` real (não `<div>`) com `aria-haspopup="dialog"`, `aria-expanded`, `aria-label` que repete o label visível + valor atual ("Data de início, 15 de maio de 2026").
- **Popover/sheet**: `role="dialog"` com `aria-modal="false"` (popover) ou `"true"` (bottom-sheet); `aria-labelledby` aponta para o header com mês/ano.
- **Calendário**: `role="grid"`, células `role="gridcell"` com `aria-selected` no dia selecionado, `aria-disabled` em dias fora de min/max/allowedDates. Cabeçalho dos dias da semana com `<th>` e `abbr` (`"dom"` com `abbr="domingo"`).
- **Navegação por teclado** dentro do calendário:
  - `←` / `→`: dia anterior/seguinte.
  - `↑` / `↓`: semana anterior/seguinte.
  - `Home` / `End`: domingo / sábado da semana atual.
  - `PageUp` / `PageDown`: mês anterior/seguinte.
  - `Shift+PageUp` / `Shift+PageDown`: ano anterior/seguinte.
  - `Enter` / `Space`: seleciona dia focado.
  - `Esc`: fecha popover/sheet sem aplicar.
  - `Tab`: move foco para Hora/Minuto (datetime), depois para botões do footer, depois sai do popover.
- **Time wheel**: `role="spinbutton"` com `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-valuetext`. `↑`/`↓` incrementam/decrementam; `PageUp`/`PageDown` saltam de 10 em 10.
- **Range**: ao selecionar `from`, anuncia `"Data de início selecionada. Selecione data final."` via `aria-live="polite"`.
- **Foco visível**: dia focado tem ring `ring-2 ring-ring`; nunca depender só de cor (contraste mínimo + indicador de foco gráfico).
- **Contraste**:
  - Dias selecionados: `bg-primary` + `text-primary-foreground` ≥ 4.5:1.
  - Dias desabilitados: `text-muted-foreground` ≥ 3:1 (suficiente para informação não-essencial).
  - Hoje: indicador de borda inferior `border-b-2 border-primary` (não confiar só em cor de fundo).
- **Leitor de tela** anuncia: label do field → valor atual → required → ao abrir, ano e mês atuais → ao navegar, "16 de maio de 2026, sábado".

## Validação visual

| Cenário | Tratamento | Bloqueia onChange? |
|---|---|---|
| Digitação parcial na máscara | tolera, sem warning até blur | — |
| Digitação completa mas inválida (`32/13/2026`) | borda `border-x-warning` + ícone `WarningCircle` + mensagem `"Data inválida"` | **não** (mantém texto digitado) |
| Data fora de `min`/`max` | célula no calendário disabled; via máscara → mesmo tratamento de "inválida" | **não** |
| Data fora de `allowedDates` | célula disabled; via máscara → "inválida" | **não** |
| Range invertido (`from > to`) | borda `border-x-warning` + mensagem `"Data inicial deve ser anterior à final"` | **não** (emite mesmo assim — backend valida) |
| Range fora de `minRange`/`maxRange` | mensagem `"Período mínimo: N dias"` / `"Período máximo: N dias"` (warning, não error) | **não** |
| Erro de endpoint `allowedDates` | inline-alert no popover + retry | — |

Justificativa de não-bloqueio (designer): alinhado com [[generic-filter]] — operadores e validações pertencem ao backend; UI sinaliza, backend é gate. Bloquear no cliente cria casos onde o usuário "não consegue submeter" e não entende por quê. Warning visual + responsabilidade do form pai de gate de submit (`hasWarnings`) é a divisão correta.

## Presets (range)

Default pt-BR para `form-field-date-range` e `form-field-datetime-range`:

- **Hoje** — `from = to = hoje`.
- **Ontem** — `from = to = hoje - 1`.
- **Últimos 7 dias** — `from = hoje - 6, to = hoje`.
- **Últimos 30 dias** — `from = hoje - 29, to = hoje`.
- **Esta semana** — `from = domingo desta semana, to = sábado desta semana`.
- **Semana passada** — análogo.
- **Este mês** — `from = primeiro dia do mês, to = último dia do mês`.
- **Mês passado** — análogo.
- **Este ano** — `from = 01/01, to = 31/12`.
- **Personalizado** — abre o calendário (default quando preset não casa com seleção atual).

Em datetime-range, presets ajustam `00:00` / `23:59` automaticamente.

Em desktop, presets aparecem como coluna lateral à esquerda do calendário. Em mobile, linha horizontal scrollável acima do calendário (chips clicáveis).

Consumidor pode sobrescrever via prop `presets`.

## Defaults computados

**Designer decreta**: nada de default automático "hoje" salvo declaração explícita do consumidor via `defaultValue`. Substitui o `useDefaultDate` tristate/oculto do legado.

- `defaultValue: 'today'` (atalho) → `new Date()` (single date/datetime) ou `{from: hoje, to: hoje}` (range).
- `defaultValue: 'last-7-days'` (atalho) → preset equivalente.
- `defaultValue: () => objetoCanonico` (função) → cálculo customizado (substitui `customConfig.startOfMonth` do legado de forma extensível).
- `defaultValue: undefined` → vazio (default do componente).

Em [[generic-filter]] (F016), o consumidor passa `defaultValue` conforme o schema legado mapeado.

## Composição

- **Compõe**:
  - [[form-field]] — todas as variantes são extensões de form-field.
  - [[modal-sheet]] — bottom-sheet mobile.
  - [[button]] — botões de footer (Cancelar, Confirmar, Limpar, Hoje, presets).
  - [[inline-alert]] — erro de endpoint dentro do popover.
  - Phosphor `Calendar`, `Clock`, `CaretDown`, `CaretLeft`, `CaretRight`, `X`, `WarningCircle`, `CircleNotch`.
  - Calendário shadcn (`react-day-picker` sob o capô, em pt-BR via `date-fns/locale/pt-BR`).
- **É composto por**:
  - [[generic-form]] (F010) via `ctype: date|time|date-time|dates|datetime-interval`.
  - [[generic-filter]] (F016) via `controlType: date|time|date-range|datetime-range`.
  - [[data-grid]] (F011) — quick-filter por coluna (variante compacta).
  - [[dashboard]] (F020) — seletor de período do dashboard.

## Cores e tokens

- `border-input`, `bg-background` — trigger default (herdado de form-field).
- `text-foreground` — valor selecionado no trigger; números do dia.
- `text-muted-foreground` — placeholder; dias do mês adjacente (fora do mês atual); preset não selecionado.
- `bg-primary`, `text-primary-foreground` — dia selecionado; preset ativo; segmento ativo da time wheel.
- `bg-primary/10` — faixa de fundo entre `from` e `to` (range em construção e selecionado).
- `bg-accent`, `text-accent-foreground` — hover de dia (desktop).
- `border-b-2 border-primary` — marcador "hoje" no calendário.
- `text-muted-foreground/50` — dias disabled.
- `bg-popover`, `text-popover-foreground`, `border` — fundo/borda do popover.
- `shadow-md` — sombra do popover.
- `border-x-warning`, `text-x-warning` — input inválido e range invertido.
- `bg-x-warning/10` — fundo do banner de warning dentro do popover (raro).
- `ring-2 ring-ring` — foco de teclado em qualquer célula.

Nenhuma cor crua. Nenhum hex. Tudo via tokens semânticos (ver [[semantic-colors]]).

## Edge cases

- **Fuso horário**: `value` interno representa **data local do usuário** (sem timezone marker). O componente nunca converte para UTC. Se o backend precisa UTC, o consumidor converte na borda. (Alinhado com legado, que também é tz-naive.)
- **Mudança de hora (DST)**: pt-BR não tem horário de verão desde 2019 — sem tratamento especial. Para tenants em outros locales, o navegador resolve.
- **Anos extremos**: range navegável `1900–2099` por default; clamp configurável via `min`/`max`. Drill-down de década limita a esses extremos.
- **Mês com 28/29/30/31 dias**: calendário ajusta naturalmente (depende de `date-fns`).
- **Range que cruza ano**: dois meses visíveis em desktop mostram dezembro/janeiro corretamente; navegação ◀/▶ atravessa o ano sem fricção.
- **Time wheel com `timeStep=15`**: minutos válidos = `00, 15, 30, 45`. Se valor inicial é `14:23` e step 15, **arredonda para baixo na exibição** (`14:15`) mas mantém `14:23` no value até o usuário tocar — designer decreta: nunca silenciosamente alterar valor recebido.
- **Range com `from` igual a `to`** (single-day range): visualmente, célula tem fundo `bg-primary` completo (sem faixa). Permitido (alinhado com `DateInterval` legado).
- **Bottom-sheet aberto + rotação de tela**: vaul reflows; calendário ajusta colunas. Sem dismiss involuntário.
- **Clicar fora do popover desktop**: fecha sem aplicar se houver seleção parcial em range (`from` selecionado mas não `to`); aplica se single já foi selecionado (apply imediato em desktop).
- **Form com submit Enter**: Enter dentro da máscara do trigger NÃO submete o form; só dispara blur+validate. Para submeter, foco precisa estar fora do picker.
- **Múltiplos pickers no mesmo form** (range = 2 triggers ou range = 1 trigger?): **um trigger único por range** (decisão acima). Para casos onde o consumidor quer dois campos lado a lado (ex: filtros legados com `De` e `Até` separados), usa **dois `form-field-date` single** com label `"De"` e `"Até"` — não é o mesmo componente.

## Mapping do legado → Studio

Tradução **direta** (designer + smith implementam na borda do consumidor, não dentro do componente):

| Legado | Studio | Conversão |
|---|---|---|
| `DateTimePicker` (`dateAndTime=false`) | `form-field-date` | `"2026-05-16"` ↔ `{date:"2026-05-16"}` |
| `DateTimePicker` (`dateAndTime=true`) | `form-field-datetime` | `"2026-05-16 14:30"` ↔ `{date:"2026-05-16 14:30"}` |
| `DateInterval` | `form-field-date-range` | `"2026-05-15,2026-05-16"` ↔ `{from:"2026-05-15", to:"2026-05-16"}` |
| `DateTimeInterval` | `form-field-datetime-range` | `"2026-05-15 00:00,2026-05-16 23:59"` ↔ `{from:..., to:...}` |
| `TimePicker` (par sempre) | dois `form-field-time` | `"08:00,18:00"` ↔ `[{time:"08:00"}, {time:"18:00"}]` |
| `allowDates: ["15/05/2026"]` | `allowedDates: ["2026-05-15"]` | converte `dd/mm/yyyy` → ISO na borda |
| `api`, `apiParams`, `pageState` | `allowedDatesEndpoint: {url, body}` | mescla na borda |
| `useDefaultDate=true` | `defaultValue: 'today'` ou explícito | tradução por discriminador |
| `customConfig.endDateInterval='startOfMonth'` | `defaultValue: () => startOfMonth()` | função custom |
| `cName` (inconsistência) | sempre `name` em form-field | normalização |

Adaptador de payload vive em `packages/ui` como helper `dateValueToCSV` / `csvToDateValue` — usado por [[generic-form]] e [[generic-filter]] na borda do submit, não dentro do picker.

## Sources

- [[calendar/notes/2026-05-16.md]] — fase UX de F018, derivada do contrato [[date-components]] (D1..D17)
