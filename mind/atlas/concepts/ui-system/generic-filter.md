---
title: "Generic Filter"
aliases: [generic-filter, filter-panel, filtros-panel, df-filtro, schema-filter]
tags: [ui-system, component, filter, renderer, schema-driven, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Generic Filter

Renderizador de **painel de filtros dirigido por schema**. Recebe um descritor declarativo de campos (`model[]`) e materializa um agregador de critérios de busca que, ao submeter, devolve um objeto `_filter` ao consumidor. É o **terceiro organismo** do design system, par de [[generic-form]] e [[data-grid]] — onde o form expressa "1 registro × N campos" e o grid expressa "N registros × M campos", o filtro expressa "**1 conjunto de critérios** sobre N campos heterogêneos".

Tudo que no legado é `<Filtros>` (ver contrato [[filtros-componente]]) renderiza por este componente no Studio. Não é um filtro autônomo: vive sempre acoplado a um consumidor — tipicamente [[data-grid]] (F011), mas também `generic-grid-collection`, `generic-calendar` (F019), `dashboard` (F020) e `generic-action-form` (modais de ação com parâmetros).

## Quando usar

- Toda página/sub-página cujo nó `filtro` esteja presente no model retornado por `obter_model_pagina`, acima de uma grid/calendário/dashboard.
- Em modais de ação que precisam coletar parâmetros antes de executar (`executeExternalAction=true`).
- Em qualquer tela do Studio que precise expor um conjunto plural de critérios de busca sobre um endpoint server-paginado.

## Quando NÃO usar

- Para **busca textual única** (uma caixa de busca livre) — use `search-input` (não nesta wave); não há ganho em invocar o painel inteiro.
- Para **filtros pontuais** dentro de uma data-grid (filter por coluna na header da grid) — esse é vocabulário interno do [[data-grid]], não do generic-filter.
- Para **wizard de query** complexo (Power BI-like, operadores expostos, expressões booleanas) — fora de escopo; criar `query-builder` quando demandado.
- Para um **único campo de seleção** (ex. troca de período no dashboard) — use o controle direto, não envolva no painel.

## Princípio invariante: operadores são invisíveis

O componente **não conhece operadores SQL** (`=`, `like`, `between`, `>`, `in`, ...). Cada campo é um **valor** (ou par De/Ate, para intervalos). Quem decide o operador é a stored procedure consumidora — por convenção de nome (`<prop>` → igualdade; `<prop>De`/`<prop>Ate` → between). O Studio preserva essa invariante: a UI mostra apenas "Pesquisar" e "Limpar", nunca um seletor `=` / `like` / `>`.

> Quando a semântica é **intervalo** (datas/datetime), o filtro **pode** rotular visualmente "de" / "até" nos campos pareados — mas é cosmético; o backend continua resolvendo o operador.

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `schema` | `FilterField[]` | obrigatório | Lista plana de descritores de campo (cada item declara `prop`, `label`, `controlType`, regras). Não há topologia 2D — o renderer decide layout. |
| `initialValue` | objeto | `{}` | Valores iniciais (deep-link, restore, defaults vindos do consumidor). Mesclados com defaults computados pelo renderer. |
| `mode` | enum: `inline`, `drawer`, `modal` | `inline` | `inline`: painel acoplado ao topo do consumidor (default em grids). `drawer`: bottom-sheet (mobile) ou side-panel (desktop). `modal`: modal centrado (usado em ações). |
| `position` | enum: `top`, `right` | `top` | Apenas em `mode=inline` desktop: `top` ocupa faixa horizontal acima da grid; `right` ocupa painel lateral colapsável. **Em mobile sempre vira bottom-sheet drawer**, ignorando `position`. |
| `initialOpen` | boolean | `false` | Abre o painel no mount. Equivalente a `openFilter` do legado. |
| `requireSubmit` | boolean | `true` | `true`: nada acontece até clicar "Pesquisar" (default, alinha com legado). `false`: cada mudança de campo dispara `onSubmit` debounced — modo "live filter" (não usado no legado). |
| `clearMode` | enum: `defaults`, `full` | `defaults` | `defaults` recomputa valores default por tipo (intervalo de datas volta para `[hoje-1d, hoje+1d]`); `full` zera todos os campos. **Recomendação do designer: usar `full` no Studio.** Ver §"Clear behavior". |
| `onSubmit` | callback `(filter) => void` | — | Disparado pelo botão "Pesquisar" (passa validação de obrigatórios). |
| `onClear` | callback `() => void` | — | Disparado pelo botão "Limpar" após reset do state. |
| `onChange` | callback `(filter) => void` | — | Notificação contínua a cada mudança de campo (para o consumidor manter `filter` espelhado, se quiser). Não dispara busca. |
| `hideActions` | boolean | `false` | Esconde os botões "Pesquisar" e "Limpar" (usado em modais onde submit é externo). |
| `externalAction` | `{label, onClick}` | — | Adiciona um botão extra ao footer (modo `generic-action-form`); recebe `(filter)`. |
| `dependencies` | `Record<prop, prop[]>` | derivado do schema | Grafo de cascading selects (computado de `field.linkedFilters`). Não exposto como prop direta na maioria dos casos. |

### `FilterField` — descritor de campo

Campos comuns a todos os tipos:

| Propriedade | Tipo | Default | Efeito |
|---|---|---|---|
| `prop` | string | obrigatório | Chave no objeto `_filter`. Em intervalos de data, gera duas chaves derivadas `<prop>De` e `<prop>Ate`. |
| `label` | string | obrigatório | Rótulo visível acima do controle. |
| `controlType` | enum (ver §"Tipos de controle") | `text` | Discriminador do widget. |
| `required` | boolean | `false` | Marca obrigatório; bloqueia submit se vazio. Visual: `*` no label + tooltip "Obrigatório". |
| `hidden` | boolean | `false` | Esconde campo (mantém no state). **`required=true` sobrescreve** (regra herdada do legado). |
| `disabled` | boolean | `false` | Desabilita controle. Aplicado também em cascading selects enquanto o pai está vazio. |
| `defaultValue` | depende do tipo | depende | Valor inicial (sobrepõe defaults computados por tipo). |
| `placeholder` | string | — | Placeholder discreto. |
| `helpText` | string | — | Hint abaixo do controle (mesmo padrão de [[form-field]]). |
| `span` | enum: `1`, `2`, `3`, `4`, `6`, `12` | `4` | Largura em colunas do grid de 12 (apenas desktop). Mobile sempre `12`. |

Campos específicos por `controlType` — ver §"Tipos de controle".

## Tipos de controle

Mapeamento dos `type`s do contrato legado para o vocabulário do Studio. **Ressalva**: tipos de data delegam para F018, selects delegam para F019. Aqui catalogamos apenas o que o painel **compõe**, não o que cada controle interno faz.

| `controlType` | Componente delegado | Variante | Observação |
|---|---|---|---|
| `text` (default) | [[form-field]] | `text` | Fallback para qualquer campo sem `controlType` declarado. |
| `number` | [[form-field]] | `text` + `inputMode=numeric` + `mask=numerosTamanhoVariavel` | Mantém comportamento legado (string sem coerção; backend lida). |
| `date-single` | F018 `form-field-date` | input nativo mobile + picker desktop | Substitui o discriminador mágico `prop==='date'` do legado. |
| `time` | F018 `form-field-time` | — | — |
| `datetime-single` | F018 `form-field-datetime` | — | — |
| `date-range` | F018 `form-field-date-range` | — | Renderiza **dois campos visuais lado a lado** com labels "de"/"até" (cosmético). State expõe `<prop>De`+`<prop>Ate` no `_filter`. Default: `[hoje-1d, hoje+1d]`. |
| `datetime-range` | F018 `form-field-datetime-range` | — | Idem com hora. Default: `[hoje + daysFromStart @00:00, hoje + daysFromEnd @23:59]`. Aceita `daysFromStart`/`daysFromEnd` no schema. |
| `select` | F019 `power-select` | single | Carrega opções via endpoint (proc/select/selectquery) ou lista estática. Aceita `linkedFilters` (ver §"Cascading selects"). |
| `multi-select` | F019 `power-select` | multi | `isMulti=true`. State guarda array de `{value,label}`. |
| `tri-state-bool` | `tri-state-toggle` (ver [[field-types]]) | — | Três estados: `null` (todos) / `true` (sim) / `false` (não). Default `null`. **Required é ignorado** para esse tipo (decisão consciente: null é resposta válida). |
| `radio-group` | `radio-group-control` (ver [[field-types]]) | — | Default = primeiro item. |
| `checkbox` | `checkbox-control` (ver [[field-types]]) | — | Boolean simples (não tri-state). Default `false` ou conforme schema. |
| `grid-button` | `grid-button` (F0XX dedicado, ver [[field-types]]) | — | Campo que abre data-grid de seleção embutida. Armazena ids + linhas. |

### Required visual

- Asterisco `*` discreto à direita do label, cor `text-x-warning` (não destrutivo — é apenas alerta).
- Tooltip ao passar o mouse no asterisco: `"Campo obrigatório"`.
- Em erro (submit com vazio): borda `border-x-error` no controle + texto `text-x-error text-xs` abaixo: `"Campo obrigatório."`. Mensagem some quando o usuário começa a digitar/preencher.
- A11y: `aria-required="true"` no controle; mensagem com `id` referenciado por `aria-describedby`.

### Cascading selects (linkedFilters)

Quando o campo A muda e tem `linkedFilters: [{prop: 'B', value: null}]`:

- **Antes da escolha em A**: campo B fica `disabled` + placeholder `"Selecione {label de A} primeiro"`. Visualmente `opacity-60`, cursor `not-allowed`.
- **Durante o fetch de opções de B** (após escolha em A): B entra em estado `loading` — spinner Phosphor `CircleNotch` no suffix; controle não-clicável; placeholder muda para `"Carregando opções..."`. Duração típica 200ms–2s. Sem debounce (a mudança em A já foi explícita).
- **Pós-fetch sucesso**: B fica habilitado, valor anterior zerado (decisão consciente: trocar A invalida B). Foco **não** muda automaticamente (não roubar tab order).
- **Pós-fetch erro** (rede/500): B exibe inline-alert curto abaixo: `"Não foi possível carregar opções. Tentar novamente."` com botão de retry. Não bloqueia submit dos outros campos.
- **Modo "valor fixo encadeado"** (legado: `linkedFilters[].value !== null`): A não dispara fetch — apenas força B a assumir um valor pré-definido. Visualmente B continua editável; só seu valor é setado programaticamente (flash sutil `bg-x-info/10` 400ms, mesmo padrão de [[generic-form]] §LinkedFields).
- **Cascata recursiva** (A→B→C): permitida; cada elo respeita disabled+loading no seguinte. Sem dedup automático — schema é responsável por não fazer loops.

A11y das cascatas: cada mudança de estado (disabled→enabled, loading) é anunciada via `aria-live="polite"` no container do painel.

## Anatomia: desktop

### `mode=inline`, `position=top` (default em F011)

```
┌────────────────────────────────────────────────────────────────┐
│ Filtros                                            [chevron-up]│  ← header sticky com botão de collapse
├────────────────────────────────────────────────────────────────┤
│ ┌─────────────┐ ┌─────────────┐ ┌─────────────┐ ┌────────────┐│
│ │ Empresa *   │ │ Data de     │ │ Data até    │ │ Status     ││  ← grid 12-col com span por campo
│ │ [select   ] │ │ [date     ] │ │ [date     ] │ │ [select  ] ││
│ └─────────────┘ └─────────────┘ └─────────────┘ └────────────┘│
│ ┌─────────────┐ ┌─────────────────────────────┐                │
│ │ Tipo        │ │ Responsável                 │                │
│ │ ( ) A ( ) B │ │ [text                      ]│                │
│ └─────────────┘ └─────────────────────────────┘                │
│                                                                │
│                                  [ Limpar ]  [ Pesquisar ]    │  ← footer alinhado à direita
└────────────────────────────────────────────────────────────────┘
```

- **Header**: `bg-card` + `border-b border-border`; título `"Filtros"` + contador opcional `"({n} aplicados)"`; chevron Phosphor `CaretUp`/`CaretDown` à direita; click no header inteiro toggla.
- **Body**: padding `px-4 py-4`, grid `grid-cols-12 gap-4 gap-y-3`. Cada campo ocupa `col-span-{span}` (default 4). Em desktop largo (`> 1280px`), default cai para 3 (4 campos por linha em vez de 3).
- **Footer**: `border-t border-border` + `pt-3 mt-2 pb-3`, botões alinhados à direita com `gap-2`. `Limpar` à esquerda do par (variant `ghost` ou `outline`), `Pesquisar` à direita (variant `primary`).
- **Collapsed**: o body+footer somem com transição (ver §Motion); header continua visível e mostra o badge `"({n} aplicados)"` quando há filtros ativos (preview do estado).

### `mode=inline`, `position=right` (opção para grids muito largas)

- Painel lateral à direita da grid, largura fixa `w-80` (320px). Sticky com `top-{header-height}`.
- Botões "Pesquisar"/"Limpar" ficam no rodapé do painel — não no rodapé do viewport (desktop). Painel pode ter scroll interno se schema for grande.
- Collapse via chevron horizontal (`CaretLeft`/`CaretRight`); colapsado vira faixa estreita `w-10` com ícone Phosphor `Funnel` vertical.
- **Quando preferir**: grids com muitas colunas (40+) onde a faixa superior reduziria demais a altura útil da tabela; ou modelos com filtro muito enxuto (≤ 4 campos) onde o painel lateral é menos invasivo.

## Anatomia: mobile

`mode=inline` ou `mode=drawer` em mobile **sempre** vira **bottom-sheet drawer** (vaul). `position` é ignorado.

```
┌───────────────────────────────────┐
│           (conteúdo da grid)      │
│                                   │
│   ┌─────────────────────────┐     │
│   │  [Funnel] Filtros (2)   │     │  ← trigger flutuante (FAB-like) ou
│   └─────────────────────────┘     │    botão na app-header
│                                   │
└───────────────────────────────────┘
                ↓ open
┌───────────────────────────────────┐
│  ════════                         │  ← drag handle vaul
│  Filtros                      [×] │
│ ─────────────────────────────────│
│                                   │
│  Empresa *                        │
│  [select                       ]  │
│                                   │
│  Data de                          │
│  [date                         ]  │
│                                   │
│  Data até                         │
│  [date                         ]  │
│                                   │
│  Status                           │
│  [select                       ]  │
│                                   │
│  Tipo                             │
│  ( ) Opção A                      │
│  ( ) Opção B                      │
│                                   │
│  Responsável                      │
│  [text                         ]  │
│                                   │
│  ...                              │  ← scroll interno do sheet
│                                   │
│ ─────────────────────────────────│
│  [ Limpar ]    [ Pesquisar     ]  │  ← footer fixo no bottom do sheet
└───────────────────────────────────┘
```

- **Trigger**: botão de abrir filtro vive **na app-header da página** (Phosphor `Funnel` + badge com `n` aplicados); não inventar FAB. Esse botão é responsabilidade do [[data-grid]]/`generic-grid-page`, não do filtro em si.
- **Drawer**: vaul bottom-sheet (skill [[vaul]]). Altura padrão `max-h-[85vh]`, com `min-h-[40vh]` para feedback visual de espaço (não abrir apertado).
- **Drag handle**: barra superior arrastável (Vaul default); swipe-down fecha; se houver alterações pendentes não submetidas, abre confirmação `"Descartar alterações?"` antes de fechar.
- **Body**: single-column **forçada**. Todos os `span` do schema são ignorados — cada campo ocupa a largura inteira. Spacing vertical `gap-y-4`. Padding `px-4`. Scroll interno.
- **Footer fixo no bottom**: `position: sticky; bottom: 0`; `bg-background` + `border-t border-border` + sombra superior sutil (`shadow-[0_-1px_0_rgba(0,0,0,0.04)]`). Padding `px-4 py-3`.
- **Ordem dos botões mobile**: `Limpar` (ghost, `flex-1` ou `min-w-[40%]`) à esquerda, `Pesquisar` (primary, `flex-1` ou `min-w-[55%]`) à direita. **Ação positiva fica à direita** — não invertemos em mobile (convenção mantida com [[generic-form]]).
- **Tap targets**: todos os controles com altura mínima `44px` (controlado pelos primitivos delegados em densidade `comfortable`).
- **Backdrop**: opacidade `bg-background/60` com blur sutil (`backdrop-blur-sm`). Tap no backdrop fecha (com confirmação se dirty).

## Estados

- **idle** — pronto para input. Sem erros visíveis. Botão `Pesquisar` habilitado (validação acontece no submit, não no preenchimento).
- **loading-options** — algum select carregando opções iniciais (mount) ou em cascata. Apenas os campos afetados ficam em estado loading; o resto do painel é interativo.
- **submitting** — clique em "Pesquisar" validou; request em voo. `Pesquisar` em estado `loading` ([[button]] §loading: spinner + texto preservado); demais campos com `aria-busy="true"` + leve atenuação visual (`opacity-80`); interação bloqueada nos controles para evitar mudanças que não entrariam na request. `Limpar` desabilitado durante submit. Esc cancela apenas em `mode=drawer`/`modal` (não há cancel-request por default; consumidor decide se aborta).
- **error-validation** — submit bateu no gate de obrigatórios. Inline-alert no topo do body (logo abaixo do header): `"Verifique os campos destacados."`. Campos com erro mostram borda `border-x-error` + texto abaixo `"Campo obrigatório."`. Scroll smooth para primeiro inválido (em drawer mobile: scroll dentro do sheet; em inline desktop: scroll da página). `Pesquisar` volta a habilitado.
- **error-server** — submit chegou no servidor e falhou (rede/500). Inline-alert no topo: mensagem humanizada (`"Não foi possível buscar. Tente novamente."` ou conteúdo da resposta). Estado some no próximo submit.
- **dirty** — pelo menos um campo modificado em relação aos defaults computados. No header: indicador `•` ao lado do título do painel. Em drawer mobile: tentativa de fechar dispara confirmação.
- **clean** — sem modificações em relação aos defaults; default em mount.
- **collapsed** — painel reduzido ao header (desktop inline) ou fechado (mobile drawer). Quando há filtros aplicados, o header mostra badge `"({n} aplicados)"` para preservar visibilidade do estado.

## Validação

- Validação de obrigatórios acontece **apenas no submit**, nunca durante digitação (filtros não são forms — não há sentido em "marcar errado" um campo que o usuário ainda nem chegou).
- Campos `hidden=true` são ignorados na validação (mesmo se `required=true` — mas `required=true` força visibilidade, então isso é teórico).
- Campos `tri-state-bool` e `checkbox` **ignoram** `required` (decisão consciente herdada do legado: `null` é resposta válida em tri-state).
- Validações de formato (mask) acontecem nos primitivos ([[form-field]]) — não há validação cruzada entre campos no painel (ex. "data início < data fim" é responsabilidade do `date-range`, não do filter).

## Clear behavior

**Decisão de design**: o Studio adota `clearMode='full'` como **default**, **divergindo** do legado.

- **Legado** (`clearMode='defaults'`): "Limpar" recomputa defaults por tipo — texto e number persistem com o valor anterior (bug histórico documentado em [[filtros-componente]] §FL8 e §"Inércia legada"). Usuário tem que apagar manualmente cada campo de texto.
- **Studio default** (`clearMode='full'`): "Limpar" **zera todos os campos**. Intervalos de data não voltam para `[hoje-1d, hoje+1d]` — ficam vazios também (e o backend interpreta vazio como "sem filtro de data", o que é o comportamento esperado pela proc para campos não-`required`).
- **Justificativa**: usuário não percebe regressão (clear sempre limpou *visivelmente* tudo no legado; o bug era invisível na maioria dos casos porque texto pouco era usado em filtros). E ganhamos consistência mental ("Limpar = zerar").
- **Opt-in legado**: `clearMode='defaults'` continua disponível como fallback explícito caso algum model dependa do comportamento antigo. Não usar em telas novas.
- **Para campos `required`**: clear zera mesmo assim (não tem como "reset para um valor obrigatório vazio"); o próximo submit cairá em error-validation se nada for digitado. Comportamento correto.
- **`onClear`** é disparado **após** o reset do state interno (sem argumento). Consumidor decide se também deve disparar refetch (com filter vazio) ou apenas atualizar UI. Recomendação para o grid: **não** auto-refetch no clear; aguardar próximo "Pesquisar".

## Submit behavior

- Botão `Pesquisar` (primary): aciona `verifyRequired()` → se ok, chama `onSubmit({ ...currentFilter })` (clone raso).
- Botão `Limpar` (ghost/outline): aciona reset (`clearMode`) → chama `onClear()`.
- **Enter no painel**: submete (envolver tudo em `<form>` semântico). Tab order: campos na ordem visual; foco final no botão `Pesquisar`. Corrige a a11y fraca do legado (que não usava `<form>`).
- **Validação antes do submit** — ver §Validação.
- **Durante submit**: painel entra em estado `submitting` (ver §Estados). Em mobile drawer, o drawer **não fecha automaticamente** durante o submit; só fecha pós-success (e mesmo assim opcionalmente — comportamento default: fecha em mobile, mantém aberto em desktop inline para o usuário continuar refinando).

## Motion

- **expand/collapse do painel (desktop inline)**: altura transita 200ms (`normal`) com `ease-out`; opacity 150ms (`fast`). Chevron rotaciona 180°. Em `prefers-reduced-motion`: troca instantânea.
- **abertura do drawer (mobile)**: delegado ao vaul (spring suave, ~300ms). Backdrop fade-in 200ms.
- **fechamento do drawer**: vaul reverso; backdrop fade-out 150ms.
- **disabled→loading→enabled em cascading select**: opacity 150ms; spinner aparece com fade 100ms.
- **flash de setValue programático em campos encadeados**: `bg-x-info/10` por 400ms (`slow`) com fade-out final 150ms. Igual a [[generic-form]] §LinkedFields para consistência.
- **scroll para campo inválido**: `behavior: smooth`, ~300ms.
- **show/hide reativo de campos** (via `hidden` dinâmico): fade-out 150ms + collapse de altura 200ms; reverso para show. Layout shift suavizado por `transition-[grid-template-rows]` quando possível.
- **inline-alert de erro de submit**: slide-down 200ms + fade-in 150ms. Some com slide-up 150ms quando próximo submit ocorre.
- **badge "({n} aplicados)" no header**: aparece com scale `0.9→1` + fade 150ms quando filtro é aplicado.
- **reduced-motion global**: todas as transições caem para troca instantânea; vaul respeita prefers-reduced-motion nativamente.

## Responsivo

- **mobile (< 640px)**: drawer bottom-sheet (vaul) sempre; single-column; footer sticky no bottom do sheet; densidade `comfortable` (alturas 44px+); ordem dos botões preservada (limpar esquerda, pesquisar direita); `span` do schema ignorado.
- **tablet (640–1024px)**: comporta-se como desktop reduzido — painel inline, grid 12-col, mas `span` mínimo efetivo `6` (no máximo 2 campos por linha) para evitar campos espremidos. Densidade `comfortable`.
- **desktop (> 1024px)**: topologia plena do schema. Densidade `compact` por default em `position=right`; `comfortable` em `position=top` (mais respiro).
- **thumb zone**: em drawer mobile, footer fica no alcance do polegar; controles têm tap target ≥ 44px.
- **gestos**: swipe-down no drag handle do drawer fecha (com confirmação se dirty). Tap no backdrop também fecha. Sem swipe horizontal para "trocar de filtro" (não é padrão estabelecido; evitar gesto custoso).

## Acessibilidade

- Raiz é `<form role="search">` semântico (corrige ausência de `<form>` no legado). `aria-label="Filtros"` ou `aria-labelledby` apontando para o título do header.
- `aria-busy="true"` durante submitting.
- Cada campo: ver primitivo delegado ([[form-field]], F018, F019, `tri-state-toggle`, `radio-group-control`, `checkbox-control`). Cada um já carrega `aria-required`, `aria-invalid`, `aria-describedby`.
- Inline-alert de erro de submit: `role="alert"` + `aria-live="assertive"` (interrupção legítima — usuário acabou de pedir submit).
- Cascading selects: container do painel com `aria-live="polite"` anuncia mudanças de habilitação ("Campo Cidade agora disponível").
- Tab navigation:
  - Tab percorre campos na ordem visual; em mobile single-column, ordem natural.
  - Enter em qualquer campo de texto: submete.
  - Enter em select aberto: seleciona opção (não submete).
  - Esc em drawer/modal: fecha (com confirmação se dirty).
  - Botão `Pesquisar` recebe foco visível distinto (`ring-2 ring-ring`).
- Header colapsável: `role="button"` + `aria-expanded` + `aria-controls` apontando para o body.
- Drawer mobile: focus trap interno; foco inicial no primeiro campo (não no botão de fechar — usuário veio preencher).
- Contraste: todos os textos seguem [[semantic-colors]]; mensagens de erro `text-x-error` cumprem WCAG AA contra `bg-card`/`bg-background`.

## Empty state pós-submit

**Não é responsabilidade do generic-filter**, mas a integração é canônica:

- Quando o submit retorna 0 registros, o [[data-grid]] consumidor exibe seu próprio empty state (`"Nenhum registro encontrado."` + sugestão `"Tente outros filtros."`).
- O painel **permanece visível** (em `mode=inline desktop`) ou **reabre/permanece aberto** (em `mode=drawer mobile`, default: fecha após submit bem-sucedido com resultados; se 0 resultados, **mantém aberto** para o usuário ajustar imediatamente).
- O `header` do filtro pode ganhar o badge `"({n} aplicados, 0 resultados)"` como reforço visual — opcional, decidido pelo consumidor via prop `showResultCount`.

## Persistência

- **Sem persistência local default**. Refresh perde o filtro (comportamento atual do legado).
- **URL-sync opcional** (melhoria não-breaking sobre o legado): prop `urlSync=true` serializa o filter na querystring após cada submit (chave `?f=...` base64+JSON, ou keys explícitas se schema simples). Não é default — `urlSync=false`. Recomendação: ligar em telas operacionais onde compartilhar link com filtro tem valor (ex. "olha esse pedido travado").
- **Restore via `initialValue`**: o consumidor injeta valores iniciais (vindos da rota ou de `additionalParams.filter`). O renderer mescla com defaults computados (initialValue tem prioridade onde define chaves).
- **Cache de opções de select**: as opções carregadas por endpoints são responsabilidade do `power-select` (F019) — o painel não cacheia. O legado mantinha cache em variável de módulo (bug latente: race entre instâncias). Studio confia no cache do primitivo.

## Composição

- **Compõe**: [[form-field]] (variantes text/number/textarea), F018 (`form-field-date/time/datetime/date-range/datetime-range`), F019 (`power-select` single e multi), `tri-state-toggle`, `radio-group-control`, `checkbox-control`, `grid-button`, [[button]] (footer), [[inline-alert]] (erro de validação/server), `modal-sheet`/vaul drawer (mode=drawer/modal e mobile).
- **É composto por**: [[data-grid]] (consumidor principal, via `generic-grid-page`), `generic-grid-collection` (1 filtro → N grids), `generic-calendar` (F019), `dashboard` (F020), `generic-action-form` (F010 modais de ação com `executeExternalAction`).
- **Não compõe**: si mesmo (sem aninhamento de filtros) — se a UX exigir filtros de filtros, é outro padrão (query-builder).

## Cores e tokens

- `bg-card`, `bg-background` — superfícies do painel (card em desktop inline; background em drawer mobile).
- `border-border`, `border-input` — divisores e bordas.
- `text-foreground`, `text-muted-foreground` — texto principal e auxiliar (placeholders, hints, badges).
- `text-x-warning` — asterisco de obrigatório.
- `text-x-error`, `border-x-error`, `bg-x-error/10` — campos em erro e inline-alert de erro.
- `bg-x-info/10` — flash de setValue programático (cascata).
- `ring-ring` — foco visível.
- `bg-background/60` + `backdrop-blur-sm` — backdrop do drawer mobile.
- `shadow-[0_-1px_0_rgba(0,0,0,0.04)]` — sombra superior do footer sticky mobile.

## Edge cases

- **Schema vazio** (`schema: []`): renderiza apenas header + footer com `Pesquisar` (caso real de proc que aceita 0 filtros mas precisa de "buscar"). Se também `hideActions=true`, não renderiza nada — sinaliza erro de schema (log).
- **Único campo no schema**: renderiza no grid 12-col com `col-span-12` (ocupa tudo) em desktop inline; comportamento idêntico em mobile.
- **Schema com 40+ campos**: painel ganha scroll interno em desktop (mantém footer visível dentro do card via `max-h-[60vh] overflow-auto`); em mobile, drawer já tem scroll. Considerar agrupamento por seção (`groups[]`, mesmo padrão de [[generic-form]]) — não nesta wave; sinalizado.
- **Cascading select com opção pré-selecionada via `initialValue`**: o renderer dispara o fetch das opções dependentes no mount, **antes** de habilitar interação no campo dependente. Loading state visível imediatamente.
- **`required` em select com opções ainda carregando**: campo entra em loading; submit fica bloqueado com `Pesquisar` ainda habilitado (não dá pra prever) — se usuário clicar antes das opções resolverem, validação falha como "campo obrigatório" mesmo sem possibilidade de seleção. Edge case raro; mensagem do erro permanece adequada.
- **`hidden=true` + `required=true`**: campo vira visível (mesma regra herdada). Aviso ao desenvolvedor do model — sinal de schema mal-formado, mas não bloqueia.
- **Submit duplo (double-click no Pesquisar)**: botão entra em loading no primeiro click; cliques subsequentes ignorados via disabled state nativo do [[button]] em `loading=true`.
- **Filtro aplicado e usuário muda um campo sem clicar em Pesquisar**: painel fica `dirty`; o grid **não** reflete a mudança (continua com o resultado do último submit). Badge `"({n} aplicados)"` reflete o filtro **submetido**, não o pendente. Indicador `•` no header sinaliza pendência.
- **Drawer mobile com schema longo**: scroll interno, footer sempre visível. Se viewport for muito baixo (landscape no iPhone SE), `max-h-[95vh]` para garantir aproveitamento.

## Divergências conscientes do legado

Decisões do Studio que se afastam do contrato em [[filtros-componente]] §"Inércia legada":

1. **Clear total por default** (`clearMode='full'`) — corrige FL8.
2. **`<form>` semântico** — Enter submete; corrige a11y fraca do legado.
3. **Sem `selectOptions` como variável de módulo** — cache vive no `power-select`/data layer, não compartilhado entre instâncias.
4. **URL-sync opcional** — `urlSync` permite deep-link funcional sem depender de `additionalParams.filter` injetado pela rota.
5. **Cascading select fica disabled antes do pai** — UX mais clara do que "campo vazio sem feedback do porquê".
6. **Mobile vira drawer sempre** — independente de `position`; legado usava `collapse` Bootstrap, que em mobile virava modal-fundo de tela sem affordance de fechar.
7. **`linkedFilters` async sem bloquear UI** — toda cascata roda em paralelo onde possível; campos não-dependentes seguem interativos.
8. **Convenção `prop='date'`** abandonada — Studio usa `controlType='datetime-single'` explícito.
9. **`type` indefinido → `text`** preservado por compatibilidade (modelos legados que omitem `type` continuam funcionando).
10. **Submit em estado de erro de servidor não some sozinho** — inline-alert persiste até próximo submit; usuário escolhe quando fechar.

## Notas para o smith

- O painel é **agregador**, não buscador. Smith **não** dispara HTTP de busca dentro do `generic-filter`; só chama `onSubmit(filter)` e deixa o consumidor decidir.
- A **topologia 2D** que o legado tinha (`col-md-X`) **não é replicada** — Studio usa `span` em grid CSS de 12 cols, decidido pelo renderer. Smith não propaga classes Bootstrap.
- **Cascading selects** são lógica do renderer (e do `power-select` delegado) — não da feature. Smith aciona o renderer com o schema, o renderer interpreta `linkedFilters`.
- **Drawer mobile** é via vaul (skill [[vaul]]) — não inventar bottom-sheet artesanal.
- **Default total clear** é divergência consciente — manter mesmo se o tester estranhar; documentação em §"Clear behavior" responde.
- **Operadores** continuam invisíveis — não criar campos `>`/`<`/`!=` na UI. Se um model precisa disso, é responsabilidade da proc backend ou de schema novo (campo separado por operador).
- **Ícones**: Phosphor `Funnel` para o trigger; `CaretUp`/`CaretDown` para collapse vertical; `CaretLeft`/`CaretRight` para painel lateral; `CircleNotch` para spinner de loading; `X` para fechar drawer. **Nunca** Lucide.

## Sources

- [[calendar/notes/2026-05-16.md]] — UX de F016
- [[filtros-componente]] — contrato legado (FL1..FL15 + inércia)
- [[model-valor-datagrid]] — consumidor principal
- [[generic-form]] — padrão irmão (motion e a11y compartilhados)
- [[field-types]] — mapeamento dos primitivos delegados
