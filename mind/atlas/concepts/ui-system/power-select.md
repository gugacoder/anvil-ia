---
title: "Power Select (Combobox single/multi, typeahead, async)"
aliases: [power-select, combobox, select-search, form-field-select, form-field-multi-select, F019]
tags: [ui-system, component, form, select, combobox, typeahead, async, F019, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Power Select

Primitiva única que cobre todo o vocabulário de **seleção a partir de uma lista** no Studio: single ou multi, lista estática ou async, com filtragem por digitação (typeahead). Substitui as três versões legadas (`PowerSelect` V1, V2, V3 — ver [[power-select|contrato legado]] / F019) com uma combobox coesa, acessível e responsiva por design.

Nasce como variante de [[form-field]] — herda label, hint, error, required, disabled, readOnly e a anatomia padrão de campo (`aria-describedby`, sr-only label, foco). O que muda é o **controle interno**: trigger + popover ancorado (desktop/tablet) ou trigger + bottom-sheet vaul (mobile), ambos exibindo um [[command-list]] (shadcn Command — busca + lista navegável por teclado).

| Variante | Modo | Fonte de opções | Valor emitido |
|---|---|---|---|
| `form-field-select` | single | estática ou async | `Option \| null` |
| `form-field-multi-select` | multi | estática ou async | `Option[]` (sempre array, vazio quando nada selecionado) |

Onde `Option = { value: string \| number, label: string, ...extras }`. **Sempre objeto** — nunca string crua. O componente preserva campos extras (`id`, `erpId`, flags como `pipeliner`) via spread no payload, mas só lê `value` e `label`.

> **Adaptador para o backend legado**: o consumidor (generic-form, generic-filter) traduz, se preciso, o array de Options para o formato CSV/scalar que stored procedures legadas esperam. O componente **não emite CSV**, **não emite índice numérico**, **não emite string crua** — emite Option ou Option[].

## Quando usar

- Qualquer campo de seleção em [[generic-form]] (F010), [[generic-filter]] (F016), [[dashboard]] (F020), modais de ação, wizards.
- Filtros de coluna de [[data-grid]] com domínio enumerável (status, categoria, responsável...) — variante compacta.
- Pickers de entidade que apontam para um catálogo (cidade, empresa, produto) com carga remota.

## Quando NÃO usar

- Para **boolean tri-state** (sim/não/indiferente) — usar `form-field-nullable-bool` (componente próprio).
- Para **seleção via tabela** (quando o domínio só faz sentido com colunas extras visíveis na lista) — usar `grid-picker` (componente próprio, F020 derivado).
- Para **rádios fixos com ≤ 4 opções** — usar `form-field-radio-group` (mais legível, não esconde estado).
- Para **toggle entre 2 valores conhecidos** — usar `form-field-toggle`.
- Para **árvore hierárquica selecionável** — usar [[tree-checkable]].

## Decisão de UX: combobox unificada vs select nativo

O contrato legado usa `react-select` (V1/V2) e modal Bootstrap próprio (V3). Para o Studio, a decisão é:

- **Desktop**: sempre **combobox shadcn** (Popover + Command). Motivos:
  - Consistência cross-browser do estilo.
  - Busca embutida com keyboard nav (arrow/Enter/Esc) padronizada.
  - Suporte natural a multi-select com chips no trigger.
  - Acessibilidade controlada (`role="combobox"`, `aria-activedescendant`).
- **Mobile**: sempre **bottom-sheet vaul** com Command list + footer de ação. Motivos:
  - Popover em mobile é fragil (teclado virtual empurra layout, hit area ruim).
  - Tap-target consistente (≥ 40px por item).
  - Submit explícito em multi-select (footer Cancelar/Confirmar) — diferença consciente do legado, que confirmava via backdrop click (anti-padrão de a11y).
- **Sem opção `nativeMobile`**: ao contrário de [[date-pickers]], o `<select multiple>` nativo em mobile é universalmente ruim e não suporta typeahead async — não vale o opt-in.

Conclusão: **combobox custom em ambos os viewports**, com forma única e expansão coerente entre mobile (sheet) e desktop (popover).

## API conceitual

Herda toda a API de [[form-field]] (`label`, `labelHidden`, `hint`, `error`, `required`, `disabled`, `readOnly`, `id`). Acrescenta:

### Comuns a single e multi

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `value` | `Option \| null` (single) ou `Option[]` (multi) | `null` / `[]` | Valor controlado. Sempre forma objeto/array — nunca string. |
| `onChange` | `(value) => void` | — | Emite o novo `Option`/`Option[]`. Em multi, sempre o array completo (não delta). |
| `options` | `Option[]` | `[]` | Lista estática de opções. Quando informado, ganha precedência sobre `fetchOptions`. |
| `fetchOptions` | `(query: string, signal: AbortSignal) => Promise<Option[]>` | — | Carregador async. Recebe a query digitada e um `AbortSignal` para cancelar in-flight. **Obrigatório se `options` ausente.** |
| `searchMode` | `client` \| `server` \| `auto` | `auto` | `client`: filtra `options` local por substring case-insensitive. `server`: dispara `fetchOptions(query)` a cada query. `auto`: usa `client` se `options` informado, `server` se `fetchOptions` informado. |
| `minQueryLength` | número | `1` | Mínimo de chars para disparar filtragem/fetch. **Divergência consciente do legado** (que tinha 3 hardcoded). UX moderna costuma 1 char com debounce. Quando `0`, dispara fetch no abrir do popover (pré-carrega lista vazia → pode ser pesado, opt-in). |
| `debounceMs` | número | `250` | Debounce em ms entre keystroke e disparo de `fetchOptions`. Aplica-se só em `server`/`auto-server`. |
| `placeholder` | string | `"Selecione..."` (single) / `"Selecione..."` (multi vazio) | Texto do trigger quando `value` é vazio. |
| `searchPlaceholder` | string | `"Buscar..."` | Placeholder do input dentro do popover/sheet. |
| `emptyMessage` | string | `"Nenhuma opção encontrada"` | Mensagem exibida quando lista filtrada é vazia (após busca ou no estado inicial sem itens). |
| `loadingMessage` | string | `"Buscando..."` | Mensagem exibida durante `fetchOptions` em flight. |
| `errorMessage` | string | `"Erro ao carregar opções"` | Mensagem inline quando `fetchOptions` rejeita. |
| `clearable` | boolean | `true` | Mostra ícone `X` no suffix do trigger quando há valor; clique zera. Mantido em multi (zera array). |
| `getOptionKey` | `(option) => string \| number` | `option => option.value` | Identidade do item para comparações (selecionado, dedup, key do React). Permite domínios onde `value` colide entre listas. |
| `renderOption` | `(option) => node` | label truncado + check à esquerda se selecionado | Customização opcional do item da lista (ex: avatar + nome + email em duas linhas). Designer recomenda usar com parcimônia — defaults cobrem 95% dos casos. |
| `renderTrigger` | `(value, opts) => node` | chip(s) padrão | Customização do conteúdo do trigger (raro). |
| `groupBy` | `(option) => string` | — | Agrupa opções por chave; renderiza headers no Command list. Opt-in. |

### Específicas de multi

| Propriedade | Tipo | Default | Efeito |
|---|---|---|---|
| `maxChipsVisible` | número | `2` | Quantos chips renderizar inline no trigger; o excedente colapsa em `+N`. |
| `commitMode` | `immediate` \| `confirm` | `immediate` (desktop) / `confirm` (mobile) | Em `immediate`, cada toggle emite `onChange`. Em `confirm`, mantém seleção pendente até clique em `Confirmar` (mobile footer). Auto-resolvido por viewport por default. |
| `maxSelected` | número | — | Limite máximo. Ao atingir, demais opções ficam disabled na lista com hint inline `"Limite de N opções"`. |

### Sub-tipo `Option`

| Campo | Tipo | Obrigatório | Semântica |
|---|---|---|---|
| `value` | string \| number | sim | Identidade da opção (chave). |
| `label` | string | sim | Texto exibido (chip e item da lista). |
| `description` | string | não | Linha secundária no item (não no chip). |
| `icon` | Phosphor icon name | não | Ícone à esquerda do label no item. |
| `disabled` | boolean | não | Item visível mas não selecionável; cursor not-allowed. |
| `group` | string | não | Atalho declarativo para `groupBy` quando `groupBy` não é informado. |
| extras (`id`, `erpId`, `pipeliner`, ...) | any | não | Preservados via spread no payload do `onChange`. |

## Estrutura visual

### Trigger — single

```
[ label ]   [ * ]
[ ┌──────────────────────────────────────────────┐ ]
[ │  Joinville                          ▼  X    │ ]
[ └──────────────────────────────────────────────┘ ]
[ hint OR error                                     ]
```

- Conteúdo: label do option selecionado (truncado com `text-ellipsis` se overflow; tooltip Phosphor padrão revela completo on-hover).
- Vazio: placeholder em `text-muted-foreground`.
- Suffix: `CaretDown` (Phosphor) sempre; `X` (Phosphor) só quando `clearable && value`. Click no `X` zera + para propagação (não abre popover).

### Trigger — multi

```
[ label ]   [ * ]
[ ┌────────────────────────────────────────────────────┐ ]
[ │  [Joinville×] [Curitiba×] +3              ▼  X    │ ]
[ └────────────────────────────────────────────────────┘ ]
[ hint OR error                                           ]
```

- Até `maxChipsVisible` chips inline (default 2). Excedente em chip neutro `+N`.
- Cada chip tem label truncado (`text-ellipsis`, max-width relativo, tooltip on hover) + ícone `X` à direita. Click no `X` do chip remove **somente aquele item** (emite `onChange` com novo array; **divergência do legado**: API recebe `onRemove(value)` conceitualmente, não índice).
- Click em qualquer outra área do trigger abre o popover/sheet.
- `+N` é apenas indicador visual; click nele também abre o picker (não expande inline — abrir o picker mostra todos selecionados com check).
- Vazio: placeholder igual single.

### Popover desktop (single e multi)

```
┌────────────────────────────────────────┐
│ [magnifying-glass]  Buscar...          │  ← input com debounce
├────────────────────────────────────────┤
│  ✓  Joinville                          │
│     Curitiba                           │
│     Florianópolis                      │
│     Porto Alegre                       │
│     ...                                │
└────────────────────────────────────────┘
```

- Largura: `min-w-[var(--radix-popover-trigger-width)]` para casar com o trigger; `max-h-[320px]` com overflow-y scroll.
- Input de busca no topo (ícone `MagnifyingGlass` Phosphor à esquerda). Foco automático ao abrir.
- Lista usando `cmdk` (shadcn Command) — keyboard nav nativa.
- Item com `✓` (Phosphor `Check`) à esquerda quando selecionado (multi: persiste; single: o popover fecha imediato no select).
- Multi com `commitMode=immediate` (default desktop): cada toggle emite `onChange` na hora; popover **não fecha** ao selecionar (continua até click-outside ou Esc).
- Single: popover fecha imediatamente após seleção; `onChange` emitido com o Option.
- Grupos (se `groupBy`): headers em `text-xs uppercase text-muted-foreground` com separação `border-t`.

### Bottom-sheet mobile (single e multi)

Usa [[modal-sheet]] em modo `bottom-sheet` (vaul).

```
┌────────────────────────────────────────┐
│              ─ handle ─                │
├────────────────────────────────────────┤
│  Cidades                          [×] │  ← header com label do field + close
├────────────────────────────────────────┤
│ [magnifying-glass]  Buscar...          │
├────────────────────────────────────────┤
│  ✓  Joinville                          │
│     Curitiba                           │
│     ...                                │
│                                        │
├────────────────────────────────────────┤
│  [ Cancelar ]            [ Confirmar ] │  ← footer (só em multi confirm)
└────────────────────────────────────────┘
```

- Handle drag no topo (vaul default) — swipe-down fecha.
- Header com título (= label do field) e botão `X` (Phosphor) à direita.
- Input de busca sticky logo abaixo do header. Foco automático com pequeno delay (300ms após open, para teclado virtual subir suave).
- Lista full-width com items de altura ≥ 48px (tap target).
- **Single**: tap no item commit + fecha sheet.
- **Multi (`commitMode=confirm`, default mobile)**: tap só marca/desmarca; estado pendente. Footer fixo com `Cancelar` (ghost, esquerda) e `Confirmar` (primary, direita). `Cancelar` descarta seleção pendente; `Confirmar` emite `onChange` e fecha.
- Swipe-down ou `X` em multi-confirm = `Cancelar` implícito (descarta).
- Em multi com `commitMode=immediate` (raro em mobile, opt-in): sem footer; cada toggle emite. Sheet fecha por swipe/click-outside.

## Estados

Herda estados de [[form-field]] (default/hover/focus/disabled/readOnly/error). Específicos:

- **default vazio** — trigger mostra placeholder em `text-muted-foreground`. Suffix `CaretDown` apenas.
- **default preenchido (single)** — label do option em `text-foreground`. Suffix `CaretDown` + `X` (se `clearable`).
- **default preenchido (multi)** — até `maxChipsVisible` chips + `+N`. Suffix idem.
- **focused (trigger)** — anel `ring-2 ring-ring`, borda `border-ring`. Padrão form-field.
- **open (popover/sheet)** — trigger mantém anel de foco; suffix `CaretDown` rotaciona 180° (transição 150ms).
- **loading (server)** — dentro do popover/sheet: lista some, aparece linha centralizada `[CircleNotch spin]  Buscando...` em `text-muted-foreground`. Trigger fica em estado normal (não pisca). Em multi com seleções pendentes, footer permanece habilitado.
- **empty (após busca)** — `emptyMessage` centralizado em `text-muted-foreground` com pequeno ícone `MagnifyingGlassMinus` (Phosphor) acima.
- **empty (sem fetch ainda, `minQueryLength > 0`)** — hint `"Digite ao menos N caractere(s) para buscar"` em `text-muted-foreground` no lugar da lista. (`N` interpolado.)
- **error (fetch falhou)** — inline-alert variant `error` no lugar da lista: `errorMessage` + botão `Tentar novamente` (ghost, pequeno). Não fecha sheet/popover.
- **error (validação do field, ex: required)** — herdado de form-field (borda `border-x-error`, mensagem abaixo). Não afeta a lista.
- **disabled** — trigger não abre popover/sheet; chips perdem `X` (não removíveis em estado disabled).
- **readOnly** — idêntico a disabled na ação, mas visual menos atenuado (`border-input/60`, `bg-muted/30`) — sinaliza "leitura sem desabilitar percepção".
- **maxSelected atingido** — opções não-selecionadas aparecem `opacity-50 cursor-not-allowed`; hint inline acima da lista: `"Limite de N opções selecionadas"`.

## Motion

- **popover abre (desktop)**: scale 0.96→1 + fade-in 150ms (`fast`), origin no trigger, easing `ease-out`.
- **popover fecha**: fade-out 100ms.
- **bottom-sheet abre (mobile)**: slide-up do bottom 250ms (`normal`), spring leve (vaul default).
- **bottom-sheet fecha**: slide-down 200ms.
- **caret rotate** (trigger): rotate 0→180° em 150ms ao abrir.
- **chip insert/remove**: novo chip fade+scale-in 150ms; chip removido fade+scale-out 100ms; layout-shift suavizado com framer-motion `layout`.
- **lista re-render após busca**: items entram com fade-in 100ms staggered (~10ms entre items, capped em 8 itens animados para não ficar pesado).
- **loading transition**: lista fade-out 100ms → spinner fade-in 100ms; ao concluir, spinner fade-out 100ms → lista fade-in 150ms.
- **selection check**: `Check` icon aparece com scale 0→1 em 100ms.
- **`prefers-reduced-motion`**: todas as animações caem para transição instantânea; mantém apenas fade do popover/sheet (100ms).

## Responsivo

- **mobile (< 640px)**:
  - Trigger altura `h-10`, texto `text-base` (16px — anti-zoom iOS no input do search).
  - **Bottom-sheet sempre** (não popover).
  - Items ≥ 48×48px de tap target.
  - Footer Cancelar/Confirmar fixo em multi (default `commitMode=confirm`).
  - Chips no trigger: `maxChipsVisible=1` em mobile (espaço apertado), `+N` para o resto. Override automático: se prop fixa em 2, mobile reduz para 1.
  - Tooltip on long-press (Phosphor pattern) para chips truncados.
- **tablet (640–1024px)**:
  - Mesmo trigger.
  - **Popover** (não bottom-sheet) com largura `min-w-[280px] max-w-[420px]`.
  - Multi com `commitMode=immediate` (sem footer).
  - `maxChipsVisible=2` default.
- **desktop (> 1024px)**:
  - Trigger `h-9` em forms densos / `h-10` em forms primários.
  - Popover ancorado ao trigger; largura mínima = trigger.
  - Lista com `max-h-[320px]`.
  - `maxChipsVisible=2` default; consumidor pode subir para 3-4 em layouts largos.
- **thumb zone / gestos**:
  - Bottom-sheet com drag handle (vaul) — swipe-down fecha.
  - Click no chip `X` em mobile tem hit-area expandida (≥ 32px) ao redor do ícone (12px renderizado).
  - Pressionar e segurar no item da lista mostra description (se houver) em tooltip — alternativa quando description não cabe inline.

## Acessibilidade

- **Trigger**: `<button>` real com `role="combobox"`, `aria-haspopup="listbox"`, `aria-expanded`, `aria-controls` apontando para o id da listbox, `aria-label` que repete o label visível + sumário do valor ("Cidade, Joinville selecionado" / "Cidades, 3 selecionadas").
- **Popover/sheet**: `role="dialog"` com `aria-modal="false"` (popover) ou `"true"` (bottom-sheet); `aria-labelledby` aponta para o título.
- **Search input**: `role="searchbox"` ou `<input type="text">` com `aria-label="Buscar opções"`; `aria-controls` aponta para a listbox.
- **Lista**: `role="listbox"` com `aria-multiselectable="true"` em multi; items com `role="option"`, `aria-selected`, `aria-disabled` se `option.disabled` ou `maxSelected` atingido.
- **Navegação por teclado**:
  - `↓` / `↑`: próximo/anterior item (com wrap opcional — designer recomenda **sem wrap** para não confundir início/fim).
  - `Home` / `End`: primeiro/último item.
  - `Enter` ou `Space`: seleciona item focado. Em single, fecha. Em multi-immediate, mantém aberto. Em multi-confirm, marca pendente.
  - `Esc`: fecha popover/sheet **sem aplicar** (em multi-confirm = Cancelar).
  - `Tab` no popover: foco vai para Confirmar (multi-confirm); senão fecha popover e segue tab order normal.
  - Type-to-search: digitar no input do popover é o caminho default; alfabético direto na listbox não é suportado (evita confusão com cmdk filter).
- **Foco visível**: item focado tem `bg-accent` + ring `ring-1 ring-ring inset` (visual de "este vai ser o selecionado em Enter").
- **Anúncios `aria-live`**:
  - Ao abrir: `"Caixa de combinação aberta, N opções"`.
  - Após busca: `"N resultados"` (debounced 500ms para não spammar leitor de tela).
  - Ao selecionar (multi): `"Joinville selecionado, 3 de N"`.
  - Ao remover chip: `"Joinville removido, 2 de N"`.
  - Loading: `"Buscando opções"`.
  - Empty: `"Nenhuma opção encontrada"`.
- **Foco trap**: bottom-sheet usa foco-trap padrão de [[modal-sheet]]; popover deixa Tab escapar para próximo field (padrão combobox shadcn).
- **Contraste**:
  - Chip: `bg-secondary` + `text-secondary-foreground` ≥ 4.5:1.
  - Chip `X` icon: ≥ 3:1.
  - Item selecionado (check): `text-primary` ≥ 4.5:1.
  - Empty/loading message: `text-muted-foreground` ≥ 4.5:1.
- **Leitor de tela** anuncia: label do field → valor atual (resumido) → required → ao abrir, "Buscar, caixa de pesquisa" → ao navegar opções, label + estado de seleção.

## Validação visual

| Cenário | Tratamento | Bloqueia onChange? |
|---|---|---|
| `required` + valor vazio + submit do form | borda `border-x-error` + mensagem `"Selecione uma opção"` (single) / `"Selecione ao menos uma opção"` (multi) | gate é do form pai, não do componente |
| `maxSelected` atingido + tentativa de selecionar mais | item disabled na lista + hint `"Limite de N"` no topo | **sim** (não emite onChange para extras) |
| `fetchOptions` rejeita | inline-alert variant `error` no lugar da lista + botão retry | — |
| Query digitada < `minQueryLength` | lista some; hint `"Digite ao menos N caractere(s)"` | — |
| Multi-confirm + `Confirmar` sem mudanças | fecha sheet, **não emite onChange** | — |

## Async — contrato

O `fetchOptions` recebe `(query, signal)`:

- `query`: string com o que o usuário digitou (já trimada; nunca chamado se `query.length < minQueryLength`).
- `signal`: `AbortSignal` que o componente aciona em três situações:
  1. Nova chamada antes da anterior resolver (race).
  2. Usuário fechou popover/sheet.
  3. Componente desmontou.
- Implementação deve respeitar `signal` (passar para `fetch`, axios cancelToken, etc.). Componente trata `AbortError` silenciosamente (não vai para estado de erro).
- Retorno: `Promise<Option[]>`. Ordem preservada na lista.
- Rejeição (qualquer outro erro): vai para estado **error** com botão retry. Componente **não** mostra detalhe do erro (apenas `errorMessage` genérico); detalhe vai para console em dev (`console.error`) e logging do consumidor.

Cache local mínimo (last-query memoization) embutido: se o usuário apaga e digita a mesma query em < 5 segundos, reusa o resultado sem refetch. **Cache compartilhado entre instâncias é responsabilidade do consumidor** (não há cache global no widget — divergência consciente do legado `Filtros.js` que mantinha var-de-módulo global, gerando race conditions).

## Divergências conscientes do legado

| Aspecto | Legado | Studio |
|---|---|---|
| Mínimo de chars para busca | 3 hardcoded | `minQueryLength=1` default, configurável |
| Debounce | nenhum (re-render por keystroke) | 250ms default |
| Cancelamento de fetch in-flight | nenhum (race condition) | `AbortSignal` propagado |
| Multi: confirmar seleção | backdrop click do modal | botão `Confirmar` (mobile) ou commit imediato (desktop) |
| Multi: API de remoção | `onRemove(index)` | `onChange(novoArray)` (index não existe na API; o item removido é deduzido por diff) |
| Display de chips | apenas 1 chip + `+N-1` (truncado a 17 chars) | `maxChipsVisible` (default 2) chips + `+N`, com tooltip para labels longos |
| Estado loading | invisível (modal vazio) | spinner + `"Buscando..."` explícito |
| Estado empty | lista vazia silenciosa | `emptyMessage` com ícone |
| Estado error | sem feedback | inline-alert + retry |
| Placeholder | `"Clique para selecionar."` hardcoded | configurável; default `"Selecione..."` |
| Teclado | nenhum (só mouse) | navegação completa via arrows/Enter/Esc/Home/End |
| a11y | sem roles ARIA | `combobox`/`listbox`/`option` + live regions |
| Foco trap | nenhum | bottom-sheet com foco-trap (mobile) |
| `pipeliner` flag | injetada hardcoded na opção | preservada via spread (`...option`) sem lógica especial — consumidor passa a flag no `Option` se quiser |
| Sincronização `value` pai→filho | parcial (só zera quando vazio; drift possível) | sempre controlado; reflete `value` a cada render |
| Filtragem | substring case-insensitive (cmdk default mantém) | mesmo + opcional fuzzy via cmdk built-in |

## Composição

- **Compõe**: [[form-field]] (estrutura label + control + hint/error), [[modal-sheet]] (bottom-sheet mobile), [[command-list]] (Command shadcn cmdk), [[inline-alert]] (estado de erro de fetch), [[button]] (ações de footer mobile).
- **É composto por**: [[generic-form]] (F010 ramo `ctype='select'`), [[generic-filter]] (F016 ramo `type='select'`), [[dashboard-widget]] (F020 configuração de quadrantes), [[data-grid]] (column quick-filter quando coluna é enumerável).

## Cores e tokens

Sempre tokens semânticos ([[semantic-colors]]):

- Trigger: `bg-background`, `border-input`, `text-foreground`, placeholder em `text-muted-foreground`.
- Trigger focused: `ring-ring`, `border-ring`.
- Trigger error: `border-x-error`, `ring-x-error/40`.
- Trigger disabled: `opacity-50`, `bg-muted/30`.
- Chip: `bg-secondary`, `text-secondary-foreground`, hover `bg-secondary/80`. `X` icon `text-secondary-foreground/70`.
- Chip `+N`: `bg-muted`, `text-muted-foreground`.
- Popover/sheet: `bg-popover`, `text-popover-foreground`, `border`, `shadow-md` (popover apenas).
- Search input: `bg-background`, `border-input`.
- Item lista hover/focus: `bg-accent`, `text-accent-foreground`.
- Item lista selected (check): `text-primary`.
- Item lista disabled: `opacity-50`, `text-muted-foreground`.
- Empty/loading message: `text-muted-foreground`.
- Error inline-alert: tokens `x-error` via [[inline-alert]].
- Group header: `text-muted-foreground`, `border-t border-border`.

## Sources

- [[calendar/notes/2026-05-16.md]]
