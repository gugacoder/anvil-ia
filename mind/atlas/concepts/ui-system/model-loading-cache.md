---
title: "Model Loading & Cache"
aliases: [model-loading-cache, model-cache, model-refresh, page-loading-policy, swr-policy, model-skeleton]
tags: [ui-system, pattern, loading, cache, refresh, schema-driven, engine, director-studio]
sources:
  - "calendar/notes/2026-05-17.md"
created: 2026-05-17
updated: 2026-05-17
---

# Model Loading & Cache

Política unificada de **carga, cache e refresh** dos models que alimentam o engine schema-driven ([[engine-schema-driven]]). Não é um componente visual isolado — é o **contrato de comportamento** que rege como `<ModelEngine>` (e os renderers internos: [[generic-form]], [[data-grid]], [[model-calendar]], [[model-action-form]], [[tree-view]], [[model-tabs]], [[dashboard]]) busca, mostra, mantém em memória, revalida e descarta o payload do `POST /api/model`.

Modelo mental: **toda navegação de rota dispara potencialmente um fetch de model; toda renderização de tela passa por um dos quatro estados — `boot`, `revalidating`, `ready`, `error`**. A spec define o que o usuário vê em cada um, quando o Studio decide refazer a chamada, e como o usuário força refresh manual.

A spec **diverge conscientemente do legado** em três pontos centrais: (a) skeleton sempre durante boot, (b) cache leve com SWR (stale-while-revalidate) dentro da sessão da aba, (c) invalidação por mutação. Detalhes em §"Divergências conscientes do legado".

## Escopo

- Cobre **`POST /api/model`** — a chamada que retorna `{ model, modelParams, funcoes }` e é interpretada por `<ModelEngine>`.
- **Não cobre** fetches de dados internos dos renderers (linhas do [[data-grid]], submit de [[generic-form]], eventos de [[model-calendar]]). Esses têm políticas próprias documentadas em suas respectivas specs.
- **Não cobre** ACL/menu (`acesso.obter_acl_token`) — esses são cacheados em sessão por F007/F008 com regras próprias.

## Estados canônicos

Toda página do engine atravessa exatamente um dos quatro:

| Estado | Quando acontece | UI dominante | Bloqueia interação? |
|---|---|---|---|
| `boot` | Primeira carga do model na sessão da aba (sem cache hit). | **Skeleton** específico por chave do model (§"Skeleton shapes"). | Sim — área de conteúdo é skeleton. |
| `revalidating` | Cache hit + revalidação em background (SWR), refresh manual, ou refetch pós-mutação. | Conteúdo **anterior** visível + indicador discreto de "atualizando" (§"Indicador de revalidação"). | Não — usuário continua interagindo com o stale. |
| `ready` | Model parseado, renderizado, sem fetch em curso. | Renderer normal. | Não. |
| `error` | Fetch falhou (rede, 4xx, 5xx) ou parse falhou. | **Error state** com retry (§"Erro de fetch"). | Sim na área de conteúdo; resto do shell normal. |

Transições válidas:

```
        boot ───────► ready ◄─────── revalidating
         │              │                  ▲
         │              │                  │
         ▼              ▼                  │
       error ◄──── (qualquer)              │
         │                                 │
         └────────► (retry) ──► boot ──────┘
```

- `boot → error`: fetch ou parse falha na primeira carga; nenhum conteúdo prévio para mostrar.
- `revalidating → error`: revalidação falha; conteúdo stale **permanece** visível, e um toast `warning` informa "Não foi possível atualizar — exibindo última versão". Não cai para `error` cheio (a UX não regride).
- `ready → revalidating`: refresh manual, foco da aba retornando após `staleTime`, ou invalidação por mutação.

## Skeleton shapes

O skeleton **espelha a forma do conteúdo final**, derivada da inspeção do model assim que ele chega — ou, no `boot` inicial sem nenhuma pista, do **shape default** (ver abaixo). Princípio: o usuário não vê layout mudando dramaticamente entre boot e ready; a página "ganha conteúdo", não "muda de forma".

### Como o Studio decide o shape

O Studio **não conhece** o shape antes do primeiro fetch da rota. Estratégia em três níveis:

1. **Primeiro acesso à rota na sessão**: skeleton **default neutro** (§"Default neutro") — três blocos verticais empilhados (header, faixa, área principal). Genérico mas não desonesto.
2. **Acessos subsequentes à mesma rota**: o Studio **memoriza** o último shape conhecido por `path` em `sessionStorage` (`director-studio:model-shape:<path>`) — só o discriminador de chaves presentes, não o payload. No próximo boot, monta o skeleton específico antes mesmo do fetch resolver.
3. **Pós-fetch durante boot**: assim que `model` chega, o skeleton **pode** ser substituído pelo skeleton refinado por ~150ms antes do conteúdo real entrar — mas só se a diferença for relevante (ex.: passou de "default" para "calendar" inteiro). Evita flicker de "skeleton genérico → skeleton específico → conteúdo".

### Shapes por chave do model

Cada chave de dispatch ([[engine-schema-driven]] §"Tabela de dispatch") tem um skeleton canônico:

| Chave no model | Skeleton shape | Detalhes |
|---|---|---|
| `datagrid` / `datagrid2` | **Grid skeleton**: header de tabela (4–6 colunas com larguras variadas) + 8 linhas striped + footer de paginação. Mobile: 6 cards stackados com 3 linhas de texto cada. |
| `filtro` | **Filter skeleton**: barra horizontal com 3–4 chips de largura aleatória + botão de aplicar à direita. Acompanha o grid quando ambos presentes. |
| `genericform` | **Form skeleton**: 6 pares (label curta + input) em coluna única mobile, 2 colunas desktop. Botão de submit largura média no final. |
| `genericcalendar` | **Calendar skeleton**: header de mês (nav + título) + grid 7×5 de células quadradas. Mobile: lista de 10 itens de evento. |
| `genericactionform` | **Action form skeleton**: 3 grupos verticais, cada um com 2–3 linhas de "botão+texto". |
| `generictreeview` | **Tree skeleton**: 8 linhas com indentação variável (0–3 níveis), cada uma com chevron + ícone + texto. Mobile: lista plana com indentação visual. |
| `genericgridcollection` | **Grid collection skeleton**: filter skeleton no topo + 2 grids skeleton lado a lado (desktop) ou empilhados (mobile). |
| `pageTabs` | **Tabs skeleton**: linha de 3–4 chips de aba no topo + skeleton default abaixo. O conteúdo da aba ativa entra em boot próprio quando o model resolver. |
| `buttons` (pageButtons/dropdownOptions) | Não é shape próprio — entra como parte do header skeleton (2 botões à direita do título). |

### Combinações

Como o dispatch é por **presença** (não exclusivo), models combinam chaves. Skeleton segue a mesma ordem vertical do renderer ([[engine-schema-driven]] §[9]): header → form → grid → calendar → actionform → treeview → gridcollection. Cada bloco presente contribui com seu skeleton; o resto é omitido.

### Default neutro

Quando o Studio não tem nada memorizado para o `path`:

```
┌─────────────────────────────────────┐
│ ▓▓▓▓▓▓▓▓▓▓▓▓                  ▓▓ ▓▓ │  título + ações
├─────────────────────────────────────┤
│ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓ ▓▓▓▓▓                │  faixa horizontal
├─────────────────────────────────────┤
│                                     │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓              │
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓                  │  bloco principal
│ ▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓            │
│                                     │
└─────────────────────────────────────┘
```

Usado: primeira navegação à rota, rota nova após deploy, `sessionStorage` indisponível.

### Composição visual do skeleton

- Elementos do skeleton herdam de [[loading-state]] — barras de pulse com `bg-muted` e animação `animate-pulse` (Tailwind), 1.6s loop ease-in-out.
- Border-radius compatível com o elemento que substituem (`rounded-md` para inputs, `rounded-full` para chips, `rounded-lg` para cards).
- **Sem spinner adicional** durante boot — o pulse das barras já comunica atividade. Spinner só aparece em `revalidating` (ver abaixo).
- Skeleton **não tem texto** nem cor de severidade — é estritamente neutro.

## Cache policy

Política: **stale-while-revalidate (SWR)** com escopo de sessão e invalidação por mutação. Cache vive em memória do app (em um store reativo — convenção do projeto, sem prescrever stack), mirror em `sessionStorage` para sobreviver a F5 dentro da mesma aba do navegador.

### Identidade do cache

Chave: `model:<appKey>:<path>` — `appKey` separa contextos diferentes do AppBuilder; `path` é o caminho da rota normalizado (sem query string variável; query relevante a model — raro — deve ser explícita).

### Tempos

| Janela | Duração | Comportamento |
|---|---|---|
| `freshTime` | **30 segundos** | Entrada considerada fresh — navegar de volta à rota dentro desta janela usa cache sem revalidar. Conteúdo aparece instantâneo. |
| `staleTime` | **5 minutos** (após `freshTime`) | Entrada stale — usada imediatamente, mas **dispara revalidação em background** (SWR). Indicador discreto durante o fetch. |
| `maxAge` | **15 minutos** | Após isto, cache é descartado; nova navegação à rota cai em `boot` cheio. |
| `lruCap` | **20 entradas** | Limite de entradas vivas no cache; LRU descarta a menos recentemente acessada. Models são pequenos (KB) — limite generoso. |

Esses números são defaults; expostos como tokens de configuração (`MODEL_CACHE_FRESH_MS`, etc.) caso operação descubra ajuste necessário. **Não expor ao usuário final**.

### Quando se revalida

Cache é re-buscado em background nestes gatilhos:

1. **Navegação à rota com entrada `stale`** (entre `freshTime` e `maxAge`).
2. **Foco da aba do navegador retornando** (`visibilitychange` → `visible`) **se** a rota atual tem entrada `stale` ou mais velha. Mobile-first: este gatilho **NÃO dispara em mobile com bateria < 20% nem em conexão "save-data"** (ver `Mobile-first considerações`).
3. **Refresh manual** pelo usuário (§"Refresh manual") — sempre revalida, ignora freshness.
4. **Invalidação por mutação** (§"Invalidação por mutação") — força próximo acesso a revalidar.
5. **F5 / reload do navegador** — sempre cai em `boot` cheio (não usa cache memória; mas pode usar mirror do `sessionStorage` se ainda fresh — economiza um round-trip no boot do shell).

### Quando NÃO se revalida

- Troca de aba interna do [[page-tabs]] (multi-doc) volta para uma aba já carregada com entrada `fresh` → usa cache, **não revalida**. (Divergência do legado, que refazia fetch.)
- Navegação dentro da mesma página (ex.: paginação do grid, abertura de modal de form) — esses não tocam no model, só nos dados internos do renderer.
- Acesso à rota com entrada `fresh` (< 30s).

### Mirror em sessionStorage

Para sobreviver a F5:

- Chave: `director-studio:model-cache:<appKey>:<path>` — armazena `{ model: object, modelParams, funcoes, fetchedAt: timestamp }`.
- **Não persiste em `localStorage`** — model é específico da sessão autenticada; logout deve limpar.
- Limite de tamanho: se `JSON.stringify` > 100 KB, **não persiste** (mantém só em memória). Models gigantes são raros, mas existem.
- Em F5, antes do fetch, lê do mirror; se `fetchedAt` dentro de `freshTime`, **renderiza imediato e pula `boot`** (vai direto para `ready`); se dentro de `staleTime`, renderiza stale e dispara revalidação (`revalidating`).

## Indicador de revalidação

O usuário **deve saber** que o conteúdo está sendo atualizado — sem que isso roube atenção do que ele está fazendo. Convenção:

- **Ícone Phosphor `ArrowsClockwise`** girando 360° em `1s ease-in-out infinite` no botão de refresh manual (mesmo botão; ver §"Refresh manual"). Quando não há fetch, o ícone fica estático.
- Em mobile, quando o botão de refresh não está visível (header denso), adicionar **barra de progresso indeterminada** de 2px de altura sob o app-header durante revalidação. Cor: `bg-primary/60`. Animação: `animate-progress-indeterminate` (translateX ciclo de 1.5s).
- **Sem overlay**, sem dim, sem pointer-events lock. Stale é interativo.

Diferença visual `boot` × `revalidating`:

| Aspecto | `boot` | `revalidating` |
|---|---|---|
| Conteúdo | Skeleton | Conteúdo real anterior (stale) |
| Indicador | Pulse das barras de skeleton | Botão de refresh girando OU barra de progresso fina sob header |
| Bloqueio | Sim (sem conteúdo para interagir) | Não |
| Duração esperada | Até 2s típico | < 1s típico (cache hit + servidor responde rápido) |

## Refresh manual

### Onde fica o botão

- **Desktop**: ícone `ArrowsClockwise` no `app-header` ([[app-shell]]), à direita do breadcrumb e à esquerda do bloco de notificações/avatar. Tooltip `"Atualizar página"`.
- **Mobile**: o botão **não vive no header** (espaço escasso). Disponibilizar via:
  - **Pull-to-refresh** no scroll do `<main>` quando `scrollTop === 0`. Gesto canônico, sem botão visual em estado idle.
  - Item "Atualizar página" no menu kebab do header (`DotsThree`) — fallback acessível para quem não usa o gesto.
  - Quando há erro (estado `error`), botão de retry **dentro do error state** (ver §"Erro de fetch") substitui a necessidade.

### Comportamento

- Clicar/gesticular dispara **revalidação imediata**, ignorando `freshTime`. Estado vira `revalidating`. Conteúdo stale fica.
- Se o usuário disparar refresh durante outro fetch em curso, **debounce de 500ms** + **cancel do anterior** (`AbortController`). Não acumular 5 fetches por 5 cliques.
- Atalho de teclado: `Ctrl/Cmd + R` é interceptado **apenas se o foco estiver dentro do `<main>`** — caso contrário, deixa o navegador fazer F5 normal (que é hard reload, comportamento esperado pelo poder-user).
- `Ctrl/Cmd + Shift + R` **nunca** é interceptado — sempre hard reload do navegador.

### Diferenciação "atualizando" × "carregando inicial"

A spec é explícita: **nunca volte para skeleton ao refrescar**. Skeleton é exclusivamente `boot`; refresh é `revalidating`. Se o servidor demorar muito (> 8s), considerar exibir hint não-bloqueante ("Atualização demorando mais que o normal — verifique a conexão") como toast `info`, mas o conteúdo stale **permanece**.

## Erro de fetch

### Erro durante `boot` (sem conteúdo prévio)

A área de conteúdo renderiza um **error state** completo:

```
┌─────────────────────────────────────┐
│           [WarningCircle]           │
│                                     │
│   Não foi possível carregar         │
│   esta página.                      │
│                                     │
│   <razão curta — 1 linha>           │
│                                     │
│      [ Tentar novamente ]           │
│                                     │
└─────────────────────────────────────┘
```

- Ícone Phosphor `WarningCircle`, `size-12` (mobile) / `size-16` (desktop), cor `text-x-destructive`.
- Título: `text-foreground`, `text-lg font-semibold`.
- Razão: `text-muted-foreground`, `text-sm`, máximo 1 linha. Derivada do erro:
  - HTTP 401/403 → `"Sua sessão pode ter expirado."` + ação secundária para `/login`.
  - HTTP 404 → `"Esta página não foi encontrada no servidor."` + ação secundária para `Voltar`.
  - HTTP 5xx → `"Erro do servidor. Tente novamente em instantes."`.
  - Network error → `"Falha de conexão. Verifique sua internet."`.
  - Parse error → `"Os dados desta página vieram corrompidos. Reporte ao suporte."` (não-recuperável por retry; botão de retry presente mas com aviso).
- Botão `Tentar novamente`: variante `default` de [[button]], dispara novo fetch. Estado durante fetch: `loading` (spinner `CircleNotch` no botão).
- **Sem toast** simultâneo — o error state já é a comunicação. Toast seria redundância.

### Erro durante `revalidating` (cache stale visível)

Não regride a UX. Mantém o conteúdo stale visível, e dispara:

- **Toast `warning`** com mensagem curta: `"Não foi possível atualizar. Exibindo última versão."` + `action: { label: "Tentar novamente", onClick: () => refresh() }`. Duração default (`6s`).
- Indicador de revalidação para de girar; volta ao estado idle.
- **Não invalida** o cache stale — usuário continua trabalhando.

### Telemetria

- Todos os erros de fetch de model **emitem evento de telemetria** (canal a definir pelo curator — futuro `telemetry-events` no atlas). Conteúdo: `path`, `status code`, `duration`, `cache state at attempt`, `error message`. Sem dados sensíveis.
- **Sem toast de erro de telemetria** caso a emissão de telemetria em si falhe — log silencioso.

### Retry policy

- Retry manual sempre disponível (botão / gesto).
- **Retry automático**: **apenas** em network error (não em 4xx/5xx). Backoff exponencial: `1s, 2s, 4s` (máx 3 tentativas). Após esgotar, vira erro manual.
- 401/403 **nunca** retry automático — pode amplificar problema de sessão.

## Comportamentos por tipo de navegação

### F5 / hard reload do navegador

- **Sempre** dispara `boot`. Memória in-app perdida.
- Tenta hidratar do `sessionStorage` mirror; se hit fresh, pula direto para `ready`; se hit stale, renderiza em `revalidating`; se miss, segue para `boot` cheio com skeleton.
- ACL/menu também recarregam (governado por F007/F008).

### Troca de aba interna (multi-doc, [[page-tabs]])

- Cada aba tem **seu próprio cache key** (path diferente).
- Trocar para aba já carregada com entrada `fresh` (<30s): **mostra conteúdo imediato, sem fetch**.
- Trocar para aba já carregada com entrada `stale`: mostra conteúdo + revalida em background.
- Fechar aba: cache permanece em memória até `maxAge` ou LRU (reabrir em < 15min reaproveita).
- Divergência consciente do legado: o legado **mantinha aba montada** (`d-none`) preservando state interno (scroll, filtro). Studio descarta DOM da aba não-ativa mas **preserva model em cache** + scroll/filtro **em um store separado por aba** (responsabilidade dos renderers, não desta spec).

### Navegação por URL (link, sidebar, breadcrumb)

- Mesma rota da atual: noop (cache hit fresh) ou revalidação (cache stale).
- Rota diferente: fetch new path; aplica política normal.

### Deep-link com query string

- Query string que **não afeta o model** (ex.: `?modal=open`, `?tab=2` — controla UI interna, não payload do `/api/model`): **mesma chave de cache**.
- Query string que **afeta o model** (raro, mas possível via `additionalParams` que viram `modelParams`): chave separada, normalizada. Designer marca caso a caso quando a feature requer.

### Logout

- **Cache inteiro flushado** (memória + sessionStorage mirror).

## Invalidação por mutação

Quando o usuário **muda dado** (submit de form, ação de grid, delete), o cache do model **dele e de rotas relacionadas** pode estar stale. Política:

- **Mutação no próprio path**: invalida cache do path corrente → próximo acesso vira `revalidating`. **Não** força refresh imediato (a UX de submit já mostrou success/error; usuário decide quando atualizar a página).
- **Mutação em path relacionado** (ex.: cadastro em form-modal que afeta grid pai): o renderer que disparou a mutação informa explicitamente quais paths invalidar via `invalidateModel(paths: string[])`. Sem isso, cache não é invalidado automaticamente — Studio **não tenta adivinhar** dependências.
- Esta API (`invalidateModel`) é exposta no contexto do `<ModelEngine>` e consumida por [[generic-form]], [[data-grid]] (gridActions de delete/update), [[model-action-form]].

## Mobile-first considerações

A spec é mobile-first; ajustes específicos para conservar bateria e dados:

- **Revalidação on focus** (gatilho 2 de §"Quando se revalida"): suprimida em mobile quando:
  - `navigator.connection.saveData === true`, ou
  - `navigator.getBattery()` indica `level < 0.2 && !charging`, ou
  - `navigator.connection.effectiveType === '2g'` ou `'slow-2g'`.
- Pull-to-refresh é o canal explícito de "quero atualizar" no mobile — assume gesto deliberado.
- Skeleton em mobile **não anima durante prefers-reduced-motion**: barras ficam estáticas com `bg-muted` sólido. Comunicação por presença, não por animação.
- Cache mirror em `sessionStorage` é **especialmente valioso em mobile**: F5 acidental por gesto é comum; hidratar do mirror em < 50ms muda a percepção de "app rápido".

## Divergências conscientes do legado

| Aspecto | Legado ([[engine-schema-driven]]) | Studio |
|---|---|---|
| Cache | **Nenhum** — fetch a cada mount de aba | **SWR**: cache em memória + mirror sessionStorage, freshTime 30s, staleTime 5min, maxAge 15min |
| Skeleton | **Inexistente** — `setModel(null)` deixa área em branco | **Skeleton obrigatório** durante boot, com shape específico por chave do model |
| Indicador de revalidação | N/A (sem revalidação) | Botão de refresh girando OU barra fina sob header |
| Refresh manual | **Inexistente** — usuário fecha e reabre aba | Botão dedicado (desktop) + pull-to-refresh (mobile) + atalho `Ctrl/Cmd+R` |
| Erro de fetch | Toast `warning` + área vazia silenciosa | Error state cheio com retry + razão semântica + telemetria |
| Retry automático | Não | Sim para network error (backoff 1/2/4s, 3 tentativas) |
| Troca de aba interna | Mantém aba montada — preservava tudo, sem refetch | Descarta DOM, preserva model em cache + scroll/filtro por store de aba |
| Invalidação por mutação | Manual via `setCurrentFilter` (re-fetch grid) — model nunca re-buscado | `invalidateModel(paths[])` explícito a partir dos renderers |
| Mobile data/battery | Sem consideração | Suprime revalidação on-focus em save-data / bateria baixa / 2G |
| F5 | Sempre hard boot | Hidrata do mirror sessionStorage se fresh |

Migração: features que dependiam de "fetch sempre" para garantir frescor podem precisar declarar `invalidateModel` em pontos de mutação. Designer/curator mapeia em casos concretos.

## Acessibilidade

- Skeleton tem `role="status"` no container e `aria-busy="true"`. `aria-live="polite"` para anunciar transição "Carregando" → conteúdo real.
- Botão de refresh: `aria-label="Atualizar página"`; quando girando, `aria-label="Atualizando página"` + `aria-busy="true"`.
- Error state: `role="alert"` no container, foco move-se para o `h1` do erro no boot-error (não no revalidate-error).
- Barra de progresso indeterminada: `role="progressbar"` + `aria-valuetext="Atualizando"`.
- `prefers-reduced-motion`:
  - Skeleton: pulse vira `bg-muted` estático.
  - Botão de refresh girando: vira ícone estático trocado por `CircleNotch` em opacidade alternada (0.5 ↔ 1.0 em 1s).
  - Barra de progresso: ponto pulsante centralizado em vez de translateX.

## Cores e tokens

- `bg-muted` — barras de skeleton.
- `text-muted-foreground` — razões secundárias no error state.
- `text-foreground` — títulos.
- `text-x-destructive` — ícone do error state.
- `bg-primary/60` — barra de progresso de revalidação.
- `border-border`, `bg-card` — molduras do error state.
- `ring`, `ring-offset-background` — focus.

Nunca cor direta. Ver [[semantic-colors]].

## Composição

- **Compõe**: [[loading-state]] (primitivas de skeleton/spinner), [[button]] (retry, refresh), [[toaster]] (warning de revalidate-error, hint de slow-fetch), [[inline-alert]] (cenários de degradação prolongada — futuro), ícones Phosphor (`ArrowsClockwise`, `WarningCircle`, `CircleNotch`, `DotsThree`).
- **É composto por**: `<ModelEngine>` (wrapper de F009) que aplica esta política em torno de cada renderer; [[app-shell]] (host do botão de refresh, da barra de progresso, do pull-to-refresh).

## Edge cases

- **Model muito grande (> 100 KB serializado)**: não persiste em `sessionStorage`; permanece em memória. Em F5, cai em `boot` com skeleton.
- **Servidor responde rápido demais (< 100ms) durante boot**: ainda mostra skeleton por **mínimo 200ms** para evitar flash desagradável de "skeleton aparece e some". Floor controlado pelo `<ModelEngine>`.
- **Dois fetches concorrentes (refresh manual durante revalidação automática)**: o segundo cancela o primeiro (`AbortController`).
- **Cache hit fresh mas usuário "sabe" que mudou**: poder-user usa `Ctrl/Cmd+R` ou pull-to-refresh — ignora freshness. UX confia no usuário.
- **`modelParams` mudaram entre fetches** (raríssimo — depende de `eval` no escopo do componente, que pode referenciar estado mutável tipo empresa selecionada): mudança de empresa **invalida cache inteiro de models** — é uma "mudança de contexto" tratada pelo provider de contexto (fora do escopo desta spec, mas o hook `invalidateAllModels()` existe).
- **Aba do navegador hibernada (Chrome `Memory Saver`)**: ao reativar, `visibilitychange` dispara; aplica regras normais.
- **Conexão volta após offline prolongado**: se há entrada `stale` ou mais, revalida. Se há entrada em `error` boot, **não tenta automaticamente** — usuário aciona retry.
- **`pageTabs` (multi-render via tabs no model)**: o model raiz cacheia inteiro; trocar de aba interna do `pageTabs` não dispara fetch (já está tudo no model raiz). Diferente de [[page-tabs]] multi-doc do shell, que é multi-rota.

## Notas para Smith

- Implementar `<ModelEngine>` como wrapper único que gerencia os 4 estados; renderers internos recebem `{ model, status, error, refresh }` por contexto.
- Store de cache: convenção do projeto (provavelmente um zustand/jotai/react-query — decisão de Smith). Importante: a **interface contratual** (`getModel(path)`, `invalidateModel(paths)`, `invalidateAllModels()`, `refreshCurrent()`) é o que esta spec define; a stack interna é livre.
- `sessionStorage` writes em throttle (debounce 200ms) para não bloquear thread em models grandes.
- Telemetria: usar canal único exposto pelo shell (`useTelemetry()`), não importar lib direto.

## Sources

- [[calendar/notes/2026-05-17.md]] — F041 política de cache/refresh
- [[engine-schema-driven]] §"Estado preservado entre fetches", §"Cache" — base legada (sem cache, sem skeleton)
- [[loading-state]] — primitivas de skeleton (a criar/atualizar quando demandado)
- [[toaster]] — canal de warning durante revalidate-error
- [[app-shell]] — host do refresh manual e barra de progresso
