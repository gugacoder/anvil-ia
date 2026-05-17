---
title: "Model Action Form (Action Group Renderer)"
aliases: [model-action-form, action-form, generic-action-form, action-form-renderer, F037]
tags: [ui-system, component, action-form, renderer, schema-driven, director-studio, F037]
sources:
  - "calendar/notes/2026-05-17.md"
  - "atlas/concepts/legacy-contracts/model-valor-genericactionform.md"
created: 2026-05-17
updated: 2026-05-17
---

# Model Action Form

Renderizador de **grupos de botões de ação dirigidos por dados**. Recebe `actionGroups[]` — uma lista de grupos colapsáveis, cada um com matriz `rows[][]` de botões — e materializa um **catálogo de comandos** que dispara POSTs para o backend. É o **quinto organismo** schema-driven do design system, irmão de [[generic-form]] (1 registro × N campos), [[data-grid]] (N registros × M campos), [[generic-filter]] (1 conjunto de critérios) e [[model-calendar]] (N eventos × eixo temporal) — onde este componente expressa "**N comandos agrupados × 1 destino HTTP por comando**".

Cobre o discriminante `genericactionform` do engine de página (vide contrato [[model-valor-genericactionform]] / F037). Substitui o legado `<GenericActionForm>` corrigindo, na borda do componente, oito bugs catalogados: singleton de módulo, `setTimeout([5000])`, mutação direta do model, `dados.mensagem` invertido, `userGuid` capturado em montagem, `modalConfig` sem guard, `icon` morto, supressão de `generictreeview` (este último é do engine pai, não deste renderer).

Modelo mental: **é um painel de botões, não um formulário**. Não tem estado de form próprio (o estado só existe dentro do modal opcional de filtro). Cada clique é uma transação independente: POST → resposta → feedback transitório → repouso.

## Quando usar

- Toda página/sub-página cujo nó `genericactionform` apareça no model retornado por `obter_model_pagina`.
- Painel de comandos administrativos agrupados (ex.: "Vendas → Atualizar preços", "Produtos → Reindexar catálogo", "Integrações → Disparar sincronização").
- Disparadores de jobs longos no servidor com feedback de progresso (`sendProgressRequest`).
- Como **alternativa de visualização** a [[data-grid]] em páginas onde a unidade de interação é o **verbo** (ação), não o **substantivo** (registro).

## Quando NÃO usar

- Para **formulário de entrada de dados** que vira POST — esse é [[generic-form]]. Action form não tem campos; só botões.
- Para **toolbar de uma grid/lista** (ações sobre seleção) — use [[data-grid]] com `actions` por linha/seleção. Action form é catálogo standalone, não dependente de seleção.
- Para **menu de navegação** (mudar de rota sem efeito colateral) — use [[sidebar]] ou tabs.
- Para **fluxo multi-step** (wizard) — fora de escopo; será spec separada `model-wizard`.
- Para **comandos com payload complexo de configuração** (mais de 3-4 campos) — considerar disparar a partir de uma página [[generic-form]] em vez de um modal de filtro acoplado ao botão. Modal de filtro do action form é para parametrização **leve** (datas, IDs, flags).

## Stack subjacente

Renderer próprio, composto sobre primitivos já catalogados:

- **Container e cabeçalho de página** — herda de [[app-shell]] (`page-shell` + `page-header`). Não introduz layout próprio fora dos grupos.
- **Campo de busca** — [[form-field]] tipo `text` com ícone Phosphor `MagnifyingGlass` à esquerda; debounce **200ms** local no componente.
- **Grupo colapsável** — `Collapsible` shadcn (Radix); cabeçalho clicável + bloco animado. Sem accordion (múltiplos grupos podem ficar abertos simultaneamente — divergência consciente do Accordion shadcn).
- **Botão de ação** — [[button]] variant `outline` por default, com estado `loading` nativo. Largura intrínseca em desktop; full-width em mobile.
- **Modal de filtro** — [[modal]] kind `form` com [[generic-filter]] dentro; primitivo escolhido pelo `mobileAs` da spec do Modal (desktop = Sheet/Dialog conforme `size`; mobile = Drawer Vaul).
- **Feedback de progresso** — [[toaster]] com `id` fixo por `userGuid` para atualização in-place; opcionalmente [[inline-alert]] dentro do botão para feedback persistente quando `progressBar:true`.
- **Empty state** — [[empty-state]] quando filtro de busca não casa com nenhum botão (futuro; nesta wave, inline simples).

Sem libs externas. Todo o motion via [[framer-motion]] já incluído pelos primitivos.

## Schema canônico

O componente aceita exclusivamente este shape. Adaptador na borda traduz formatos legados — o renderer **não** consome `actions:[[button[]]]` (variante obsoleta, vide contrato §"Variantes obsoletas").

### `ActionGroup`

| Campo | Tipo | Obrigatório | Semântica |
|---|---|---|---|
| `id` | `string` | sim | Identidade lógica do grupo. Usado para estado de colapso persistido (localStorage opcional) e para `aria-controls`. **Adição do Studio** — legado usava índice de array, frágil a reordenação. |
| `title` | `string` | sim | Texto do cabeçalho do grupo. |
| `description` | `string` | não | Linha secundária opcional sob o título (contexto curto: "Comandos de manutenção do catálogo"). |
| `defaultOpen` | `boolean` | não | Estado inicial de expansão. Default `true` (todos os grupos começam abertos — alinhado ao legado, que tinha esse comportamento por bug invertido, mas resultado UX é correto: descobrir > esconder). |
| `rows` | `ActionButton[][]` | sim | Matriz: cada elemento é uma linha; cada elemento da linha é um botão. **Estrutura preservada do legado** — controla largura visual relativa dos botões na linha (cols iguais por padrão). |

### `ActionButton`

| Campo | Tipo | Obrigatório | Semântica |
|---|---|---|---|
| `id` | `string` | sim | Identidade lógica do botão. Usado para `key` de render, para `aria-labelledby` quando há tooltip, e para `userGuid` quando consumidor escolhe `userGuidStrategy: 'per-button'`. **Adição do Studio.** |
| `label` | `string` | sim | Texto do botão. Também é a chave de match do campo de busca (substring case-insensitive). |
| `description` | `string` | não | Texto secundário menor sob o label (quando densidade `comfortable`). Útil para diferenciar botões de label próximos. |
| `api` | `string` (path) | sim | Rota relativa do POST. Resolvida pelo http client com prefixo `/api` quando ausente (mesma convenção do legado). |
| `method` | `'POST'` | não | Default `POST`. **Adição do Studio** — abre porta para `GET` no futuro sem quebrar contrato. Por ora aceita só `POST`. |
| `icon` | `PhosphorIconName` | não | Nome de ícone Phosphor (ex.: `'ShoppingCart'`, `'Barcode'`, `'Tag'`). **Renderiza** (corrige dead prop do legado — designer aceita o campo por já estar nos models em produção, com nova semântica Phosphor-only). Adaptador na borda traduz `cilBasket` → `'ShoppingCart'`, `cilBarcode` → `'Barcode'`, `cilTag` → `'Tag'`, etc. Sem fallback se nome não existir no Phosphor — renderer ignora silenciosamente. |
| `tone` | `'default' \| 'destructive' \| 'success' \| 'warning'` | não | Cor semântica do botão (ver [[button]]). Default `'default'`. **Adição do Studio** — legado tinha um único `btn-outline-primary`. `destructive` para ações irreversíveis (precisa confirmação — ver §Confirmação). |
| `confirm` | `boolean \| {title, message, confirmLabel?}` | não | Quando truthy, clique abre [[modal]] kind `confirm` antes do POST. `boolean true` usa textos default (`"Confirmar ação"` / `"Tem certeza que deseja executar <label>?"`). Objeto custom override. **Adição do Studio** — legado não tinha guard de confirmação. |
| `openModal` | `boolean` | não | Quando `true`, clique abre [[modal]] kind `form` com [[generic-filter]] dentro; submit do filtro vira body do POST. Quando ausente/falsy, POST direto. |
| `modalConfig` | `{title: string, model: Field[]}` | obrigatório quando `openModal=true` | Configuração do modal de filtro. **Guard obrigatório**: se `openModal=true` e `modalConfig` ausente, renderer **não dispara** o clique (botão fica `disabled` com tooltip de erro `"Configuração de filtro ausente"`). Corrige crash do legado. |
| `additionalParams` | `object` | não | Body extra mesclado no POST. Spread na ordem `{...additionalParams, userGuid, ...filterParams}` — **inversão consciente da ordem do legado**: `userGuid` agora **sempre vence** `additionalParams.userGuid`, corrigindo o bug do uuid capturado em montagem. |
| `sendProgressRequest` | `boolean` | não | Quando `true`, ativa polling de progresso paralelo ao POST principal. Cadência **fixa 5000ms** (corrige `setTimeout([5000])` do legado). |
| `progressEndpoint` | `string` | não | Rota dedicada de progresso. Quando presente, polling usa esta rota em vez do `api` principal (separação limpa). Quando ausente, polling usa `api` com body `{progressBar: true, userGuid}` — compat com servidores legados que distinguem pela flag. **Adição do Studio**. |
| `hideButton` | `boolean` | não | Quando `true`, botão começa oculto. **Não é mais mutado pelo renderer** — corrige bug de mutação direta do legado. Filtro de busca usa estado React local interno (`visibleButtonIds: Set<string>`). |
| `disabledWhen` | `'always' \| 'no-permission' \| 'custom-flag'` | não | Quando o botão deve ficar `disabled` mas visível. **Adição do Studio**. `'no-permission'` consulta permissões da sessão (consumidor injeta); `'custom-flag'` lê de `additionalParams.disabled`. |

### `Field` (dentro de `modalConfig.model`)

Mesma forma de [[field-types]] — herda inteira de [[generic-filter]] / [[generic-form]]. Sem definição própria aqui.

## API conceitual do componente

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `actionGroups` | `ActionGroup[]` | `[]` | Lista de grupos. Quando vazio, renderiza só campo de busca + [[empty-state]] com mensagem "Nenhuma ação disponível". |
| `title` | `string` | — | Título da página (renderizado pelo `page-header` do shell quando o renderer está embarcado em [[app-shell]]). Quando ausente, fallback `genericPageTitle` do model parent. |
| `searchPlacement` | `'header' \| 'per-group' \| 'none'` | `'header'` | Onde mora o campo de busca. **Adição do Studio**. Default `'header'` (filtro global no topo, único — mesma UX do legado). `'per-group'` repete o campo dentro de cada `<CollapsibleHeader>` (útil quando o painel tem 10+ grupos densos). `'none'` desliga a busca. |
| `searchDebounceMs` | `number` | `200` | Debounce do filtro. **Adição do Studio**. |
| `densityHint` | `'comfortable' \| 'compact'` | `'comfortable'` | Em mobile, sempre `'compact'`. `'compact'` esconde `description` dos botões e reduz padding. |
| `userGuidStrategy` | `'per-click' \| 'per-button' \| 'per-mount'` | `'per-click'` | Como o `userGuid` é gerado. **Adição do Studio que corrige bug do legado**. `'per-click'` = uuid fresh a cada clique (recomendado, default). `'per-button'` = uuid estável por botão (server pode dedup). `'per-mount'` = uuid único pelo ciclo de vida do componente (compat com legado). |
| `onAction` | `(button: ActionButton, response: ActionResponse) => void` | no-op | Callback opcional pós-resposta. Útil para o consumidor reagir (ex.: refresh de uma grid irmã). |
| `confirmDefaults` | `{title?, message?, confirmLabel?}` | textos PT-BR | Override global dos textos default de confirmação. Botão pode override por `confirm: {...}`. |
| `toastDefaults` | `{successDuration?, warningDuration?, errorDuration?}` | herda de [[toaster]] | Override de durações por tipo de resposta. |

## Endpoints e protocolo

### POST principal

- **Verbo**: `POST` (único suportado nesta wave).
- **Timeout**: 120s (preservado do legado; consumidor pode override por `additionalParams.__timeoutMs`).
- **Body sem modal**: `{userGuid: <uuid v4>, ...additionalParams}` (uuid gerado conforme `userGuidStrategy`).
- **Body com modal**: `{userGuid: <uuid v4>, ...additionalParams, ...filterValues}` — filtro **vence** colisões (inverso do legado, decisão consciente: o que o usuário acabou de digitar tem precedência sobre default do model).

### Resposta esperada

```
{
  status: number,
  sucesso: boolean,
  dados: string | {
    mensagem?: string,
    resposta?: { dados: string }
  }
}
```

### Mapping resposta → feedback

| Condição | Ação no Studio |
|---|---|
| `status === 200 && sucesso === true && dados.resposta?.dados` | `toast.success(dados.resposta.dados)` |
| `status === 200 && sucesso === true` (sem `resposta`) | `toast.success(dados?.mensagem ?? String(dados))` |
| `status === 200 && sucesso === false` | `toast.warning(dados?.mensagem ?? String(dados))` |
| `status >= 400` (erro HTTP) | `toast.error(<mensagem extraída ou genérica>)` — **adição do Studio**, legado silenciava. |
| Timeout / network error | `toast.error('Falha de conexão — tente novamente')`. |
| `silent: true` no body de retorno | Sem feedback (canal explícito; substitui o silêncio bugado do legado). |

Extração defensiva de mensagem: `(dados && typeof dados === 'object' ? dados.mensagem : null) ?? (typeof dados === 'string' ? dados : null) ?? '<fallback do tipo>'`. **Corrige `dados || dados.mensagem` invertido**.

### Polling de progresso

- **Cadência**: 5000ms fixos, via `setTimeout` ou `setInterval` com number literal (corrige `[5000]`).
- **Não sobrepõe**: nova chamada só dispara após a anterior **resolver** (`await` antes de agendar próxima — corrige overlap do legado).
- **Endpoint**: `progressEndpoint` se presente, senão `api` com flag `{progressBar: true}`.
- **Body**: `{userGuid: <mesmo da chamada principal>, progressBar: true, ...additionalParams, ...filterValues}` — `userGuid` consistente entre principal e progresso (preservado do legado, é correto).
- **Encerramento**: `AbortController` por instância — quando a chamada principal resolve, abort do polling. **Por instância**, não singleton — múltiplos `<ModelActionForm>` na página coexistem sem interferência. **Corrige singleton de módulo do legado.**
- **Resposta esperada**: `{dados: string | {mensagem: string}}`. Conteúdo atualiza o toast in-place via `id` fixo igual ao `userGuid`.

## Estados

- **default** — grupos renderizados; nenhum POST em voo; campo de busca vazio.
- **filtering** — usuário digitou no campo de busca; após debounce, lista de botões visíveis filtra por substring case-insensitive no `label` (e em `description` quando presente). Filtro é estado React local (não muta model). Vazio total → [[empty-state]] inline `"Nenhuma ação corresponde a <query>"` com botão "Limpar busca".
- **collapsed** (grupo) — bloco `<CollapsibleContent>` oculto; chevron rotacionado; estado individual por grupo, persistido em memória do componente (opcionalmente em localStorage por `groupId` via prop `persistCollapseKey`).
- **idle** (botão) — pronto para clicar.
- **hover** (botão, desktop) — escurecimento sutil; cursor pointer; `description` ganha brilho leve.
- **focus** (botão) — `ring-2 ring-ring ring-offset-2 ring-offset-background`; mesmo padrão do design system.
- **active** (botão) — clique pressionado; `scale-[0.98]` por 100ms (feedback tátil).
- **confirming** — quando `confirm` truthy, [[modal]] kind `confirm` aberto; botão original mantém estado idle (não loading); espera resolução do confirm.
- **loading** (botão) — POST principal em voo. Botão `disabled`, ícone Phosphor `CircleNotch` rotativo substitui o `icon` original, label preservado. Outros botões do mesmo painel **permanecem clicáveis** (paralelismo é OK — corrige UX do legado que travava tudo via `setPageBlur`).
- **loading-with-progress** (botão) — quando `sendProgressRequest: true`. Botão entra em `loading` E uma fina barra de progresso aparece **abaixo** do label (linha de 2px com `bg-primary/40`, animação shimmer indeterminada) — **alternativa inline** ao toast persistente. Toast com `id` fixo também atualiza com `progressMessage` recebido (canal redundante, intencional: usuário olha pro botão E recebe toast).
- **disabled** — botão visível mas não clicável; opacity 60%; cursor `not-allowed`. Disparado por `disabledWhen`, por `loading` próprio, ou por `modalConfig` ausente quando `openModal=true`.
- **hidden** — botão fora do DOM; ocorre via `hideButton: true` no model OU via filtro de busca sem match.
- **modal-open** — modal de filtro renderizado; foco capturado pelo modal; botão de origem permanece idle abaixo (não disabled — usuário pode cancelar e tentar outro).
- **error** (botão) — pós-resposta de erro HTTP/network: botão volta a idle; toast.error mostra a falha. Sem badge persistente no botão (escolha consciente: ação é transação efêmera, não tem estado de "última execução").
- **empty** (painel inteiro) — `actionGroups=[]`: [[empty-state]] com ícone Phosphor `LightningSlash` e mensagem `"Nenhuma ação disponível"`.

## Motion

- **entrada do painel**: fade-in 150ms (fast). Grupos cascateiam com stagger de 30ms entre cabeçalhos.
- **expand/collapse de grupo**: height transition 200ms `ease-out`; chevron rotaciona 180° em 200ms `ease-out` (Phosphor `CaretDown` ↔ `CaretUp`). Sem bounce.
- **clique em botão**: scale `0.98` por 100ms `ease-out`, retorno `1.0` em 150ms `ease-out`. Padrão do design system.
- **entrada de loading**: ícone original cross-fade para `CircleNotch` em 150ms; spinner gira em loop linear 800ms.
- **saída de loading**: cross-fade reverso em 150ms; toast aparece em paralelo.
- **filtro de busca**: botões que somem fazem fade-out + scale-down `0.95` em 150ms; entrar de volta = fade-in + scale-up em 200ms. Grid faz reflow suave via `layout` (framer-motion).
- **barra de progresso indeterminada**: shimmer linear gradient deslocando esquerda-direita em loop 1.2s, `ease-in-out`.
- **modal de filtro**: herda motion de [[modal]] (entrada normal 250ms, saída fast 150ms).
- **reduced-motion**: todas as transições caem para fade puro 100ms; sem scale/translate; spinner mantém rotação (é a única affordance de loading).

## Responsivo

### Mobile (<640px)

- **Header**: título da página + campo de busca em duas linhas (busca full-width). Campo de busca **sticky-top** quando o usuário rola — não some.
- **Grupos**: todos **colapsáveis** com defaults configuráveis; por default **fechados** em mobile (override do `defaultOpen=true` do model — decisão de UX: descoberta progressiva em viewport pequeno é melhor que parede de botões). Override por `mobilePolicy: 'preserve-default'` na prop do componente.
- **Rows**: cada `row[]` vira **stack vertical** — cada botão ocupa largura total. A semântica de "vários botões na mesma linha bootstrap" é deliberadamente perdida em mobile (preserva descoberta e thumb zone; corrige `minWidth: 908px` do legado que entortava tudo abaixo de tablet).
- **Botão**: full-width, `min-h-12` (48px alvo de toque WCAG), `text-base` (16px) para legibilidade, ícone Phosphor à esquerda quando presente. Densidade sempre `compact` (sem `description` no botão; tooltip-tap opcional via long-press exibindo [[modal]] kind `detail` mínimo — futuro).
- **Cabeçalho de grupo**: full-width, `min-h-14`, ícone chevron à direita, contador `(N)` à direita do título quando há filtro de busca ativo (`"Vendas (3)"`).
- **Modal de filtro**: sempre Drawer Vaul bottom-sheet com snap points `[0.6, 0.95]` (herda de [[modal]] kind `form` + `mobileAs="drawer"`).
- **Toast**: posição top-center, swipe-to-dismiss (herda de [[toaster]]).
- **Thumb zone**: campo de busca no topo (ergonomia de leitura), grupos abaixo. Botões dentro de grupos abertos podem ficar fora do alcance — confiar no scroll, não tentar reposicionar.

### Tablet (640–1024px)

- **Header**: título + busca em uma linha.
- **Grupos**: default `open` (todos expandidos). Densidade `comfortable`.
- **Rows**: respeita matriz do model — `row.length` botões em `flex-row` com `flex-1` cada. Acima de 4 botões na mesma row, wrap automático em duas linhas para evitar botões estreitos demais (alvo mínimo `min-w-[180px]`).
- **Botão**: largura intrínseca + flex-grow; `min-h-10`; `description` visível em densidade `comfortable`.
- **Modal de filtro**: Sheet desktop (herda de [[modal]] kind `form`).

### Desktop (>1024px)

- **Header**: título + busca em uma linha; busca **largura fixa** `w-[320px]` à direita; título à esquerda. Padding generoso.
- **Grupos**: default `open`. Pode persistir colapso em localStorage por `groupId` via prop opcional.
- **Rows**: matriz do model é respeitada com fidelidade — controla largura visual exatamente como o consumidor desenhou.
- **Botão**: largura intrínseca; `description` visível; `tooltip` aparece em hover quando `description` está truncado.

### Gestos

- **Mobile**: tap (clique), tap no chevron (collapse), swipe-down em modal de filtro (dismiss), pull-to-refresh **não** suportado (action form não tem fetch — é catálogo estático até o consumidor passar `actionGroups` novo).
- **Desktop**: clique, hover, keyboard.

## Acessibilidade

- Container raiz: `role="region"` + `aria-label="Painel de ações"` (override via prop `ariaLabel`).
- Campo de busca: `<label>` visualmente oculto mas presente para leitor (`sr-only`); placeholder `"Buscar ação..."`; `role="searchbox"` (nativo do `<input type="search">`). `aria-controls` apontando para o id do container de grupos. Anúncio `aria-live="polite"` ao final do debounce: `"3 ações encontradas"`.
- Cabeçalho de grupo: `<button>` com `aria-expanded` refletindo estado; `aria-controls={groupContentId}`. Foco visível padrão.
- Conteúdo do grupo: `role="group"` + `aria-labelledby={groupHeaderId}`.
- Botão de ação: `<button type="button">` nativo. `aria-label` quando o label visual é apenas ícone (raro neste componente — Phosphor + label textual é o default). `aria-busy="true"` durante loading. Quando `disabled`, motivo opcional via `aria-describedby` apontando para tooltip de motivo.
- Navegação por teclado:
  - `Tab` percorre: campo de busca → cabeçalho do grupo 1 → botões do grupo 1 (em ordem de leitura: row1[0..n], row2[0..n]...) → cabeçalho do grupo 2 → ...
  - `Enter`/`Space` em cabeçalho de grupo: toggle collapse.
  - `Enter`/`Space` em botão: dispara clique.
  - `Esc` em modal de filtro: fecha (herda de [[modal]]).
- Leitor de tela: ao filtrar, anúncio `aria-live="polite"` com contagem. Ao clicar botão, toast resultante é `aria-live="polite"` (success/info) ou `"assertive"` (warning/error) — herda de [[toaster]].
- Contraste: todos os tokens usados são AA-validados (`bg-card`, `text-foreground`, `border-border`, `text-primary`, etc.). Cor sozinha **nunca** comunica severidade — botões `destructive` têm também ícone Phosphor `Trash` ou `Warning` por convenção.
- Sem dependência de hover/tooltip para informação essencial: tudo crítico está no label + ícone.

## Composição

- **Compõe**: [[button]] (cada `ActionButton`, incl. loading/disabled/destructive), [[form-field]] (campo de busca), [[modal]] kind `confirm` (guard de confirmação), [[modal]] kind `form` (modal de filtro), [[generic-filter]] (dentro do modal de filtro), [[toaster]] (feedback de resposta), [[inline-alert]] (barra de progresso inline opcional dentro do botão), [[empty-state]] (sem grupos ou filtro sem match), ícones Phosphor (`MagnifyingGlass`, `CaretDown`, `CaretUp`, `CircleNotch`, `LightningSlash`, `Trash`, `Warning`, mais o `icon` declarado em cada botão).
- **É composto por**: páginas via [[app-shell]]; possivelmente embarcado em [[dashboard-widget]] (variante compacta com 1 grupo só, sem busca).
- **Convive com**: [[generic-filter]] global acima quando o nó `filtro` existe no model parent (igual ao legado posicionava); [[data-grid]] irmã quando a página combina catálogo de ações com listagem de registros.

## Cores e tokens

Sempre tokens semânticos. Nenhum hex/oklch direto.

- `bg-background`, `text-foreground` — container raiz.
- `bg-card`, `border-border` — cabeçalho de grupo e wrapper de cada grupo.
- `text-foreground` (peso 600) — título do grupo; `text-muted-foreground` — `description` do grupo.
- `bg-muted/40`, `text-muted-foreground` — chevron e linha de separação.
- `border-input`, `bg-background` — campo de busca; `text-muted-foreground` — placeholder e ícone Phosphor `MagnifyingGlass`.
- `bg-accent`, `text-accent-foreground` — hover de cabeçalho de grupo.
- Botão tone `default` — herda de [[button]] variant `outline` (`border-input`, `bg-background`, `hover:bg-accent`).
- Botão tone `destructive` — herda de [[button]] variant `destructive` (`bg-destructive`, `text-destructive-foreground`).
- Botão tone `success` — `bg-x-success/10 border-x-success/30 text-x-success hover:bg-x-success/20` (consistente com [[toaster]] `success`).
- Botão tone `warning` — `bg-x-warning/10 border-x-warning/30 text-x-warning hover:bg-x-warning/20`.
- `ring-ring`, `ring-offset-background` — focus em qualquer elemento interativo.
- Barra de progresso inline — `bg-primary/20` (track) + `bg-primary` (shimmer).
- Toast — herda inteiro de [[toaster]] (variantes `success`/`warning`/`error`/`info`).

## Ícones (Phosphor only)

- `MagnifyingGlass` — campo de busca.
- `CaretDown` / `CaretUp` — chevron de grupo (rotacionado via transform, não troca de ícone — performance).
- `CircleNotch` — loading do botão (girando linear 800ms).
- `LightningSlash` — empty state global (`actionGroups=[]`).
- `MagnifyingGlassMinus` — empty state de filtro sem match.
- `Trash`, `Warning` — convenção para botões `destructive`.
- Ícones por botão: qualquer nome Phosphor declarado em `ActionButton.icon`.

Todos peso `regular` (1.5px stroke) em controles, `bold` em botões `destructive` para ênfase, `20px` em empty state e `16px` nos demais usos.

## Divergências conscientes do legado (F037)

Decisões deliberadas em relação ao contrato `model-valor-genericactionform`:

1. **`stopProgressRequest` deixa de ser singleton de módulo** — substituído por `AbortController` por instância. Múltiplos `<ModelActionForm>` coexistem sem interferência.
2. **`setTimeout(..., [5000])` corrigido para number literal 5000** — cadência real de 5s, não NaN-coerced para 0.
3. **`await` antes de agendar próximo polling** — sem overlap de POSTs paralelos.
4. **`dados.mensagem` extraído com guard** — `dados?.mensagem ?? String(dados)` em vez de `dados || dados.mensagem`. Sem crash em null.
5. **`userGuid` por clique** — `userGuidStrategy: 'per-click'` é default. Bug de uuid capturado em montagem desaparece. Consumidor pode opt-in para `per-mount` se realmente precisar (compat).
6. **`additionalParams` não vence mais `userGuid`** — ordem de spread invertida; uuid é blindado.
7. **`modalConfig` com guard** — `openModal=true` sem `modalConfig` deixa botão `disabled` com tooltip de erro. Sem crash.
8. **`icon` ressuscitado como Phosphor** — designer aceita o campo (já presente em models de produção) e dá semântica nova: nome Phosphor PascalCase. Adaptador na borda traduz `cil*` → Phosphor.
9. **Mutação do model removida** — filtro de busca usa estado React local (`Set<string>` de ids visíveis). Model fica imutável.
10. **Supressão de `generictreeview` por `genericactionform`** — bug do engine pai ([[engine-schema-driven]]), não deste renderer. Documentado lá; aqui não se aplica.
11. **Sem `setPageBlur` global** — loading é local ao botão clicado; outros botões do painel permanecem clicáveis (paralelismo).
12. **Confirmação opcional via `confirm`** — adição do Studio; legado disparava ações destrutivas direto.
13. **`hideButton` deixa de ser mutado pelo componente** — só lido do model como estado inicial.
14. **`progressEndpoint` separado opcional** — quebra acoplamento `progressBar:true no mesmo endpoint`. Compat preservada como default.
15. **Mobile-first real** — `minWidth: 908px` do legado eliminado. <640px tem layout dedicado (stack vertical, grupos colapsáveis por default, botões full-width).
16. **Stack de toasts real** — múltiplos cliques em sequência produzem múltiplos toasts (herda de [[toaster]]); legado suprimia novo-cancela-velho.
17. **Error HTTP visível** — `status >= 400` ou network error dispara `toast.error` (legado silenciava com `console.log`).
18. **Variante obsoleta `actions:[[button[]]]`** — não suportada no renderer. Migração de dados é responsabilidade do consumidor/curator antes do cutover.

## Sources

- [[calendar/notes/2026-05-17.md]]
- [[model-valor-genericactionform]] (contrato legado / F037, A1..A14 + 8 bugs)
- [[button]] (loading, destructive, focus, ícones Phosphor)
- [[modal]] (kind confirm + form, mobileAs drawer, vaul)
- [[toaster]] (success/warning/error, id fixo para update in-place, sonner)
- [[generic-filter]] (model do modal de filtro)
- [[form-field]] (campo de busca)
- [[inline-alert]] (barra de progresso inline)
- [[app-shell]] (page-shell + page-header)
- skill [[vaul]], [[shadcn]], [[semantic-colors]], [[mobile-first-page]], [[framer-motion]]
