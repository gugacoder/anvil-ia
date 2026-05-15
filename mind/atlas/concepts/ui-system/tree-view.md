---
title: "Tree View"
aliases: [tree-view, generic-tree-view, navigation-tree, sidebar-tree, tree-nav]
tags: [ui-system, component, navigation, tree, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Tree View

Primitivo de **árvore navegável**: cada nó pode ser uma página (folha com `model`) ou um agrupador (pasta com filhos). Substitui o `generictreeview` do legado — caminho do engine schema-driven em que uma página de árvore tem duas superfícies: uma **árvore de navegação** à esquerda e um **slot de conteúdo** que renderiza recursivamente outro model do engine ao selecionar uma folha.

É componente **estrutural** (não de seleção). Se a necessidade é multi-select com checkboxes em árvore (ACL, recursos, escolha em modal), use [[tree-checkable]] — são contratos distintos e nunca devem ser unificados.

## Quando usar

- Renderer canônico de `DFtipo=tree` no engine (F013 — model com `generictreeview.tree[]`).
- Qualquer página que precise expor um **conjunto hierárquico de sub-páginas** sob uma única rota (ex.: "Configurações" com várias sub-telas reusando o engine).
- Sidebar local de um módulo quando o menu principal já está saturado.

## Quando NÃO usar

- Seleção múltipla checkable → [[tree-checkable]].
- Navegação primária global → [[sidebar]] (menu hierárquico do ACL).
- Listas planas com agrupamento simples → [[data-grid]] com `groupBy` ou seções colapsáveis.
- Dados tabulares com expansão de linha → row-expansion no [[data-grid]], não árvore.
- Hierarquia rasa (≤ 1 nível) ou < 4 itens → use lista simples ou [[page-tabs]].

## Anatomia

```
+--------------------+-----------------------------+
| TreeNav            | Slot recursivo do engine    |
| (esq, persistente) | (direita, área principal)   |
|                    |                             |
| [filtro]           |                             |
| ▼ Pasta A          |  <ModelEngine model={...}/> |
|   • Folha A.1 *    |  (form, grid, dashboard…)   |
|   ▼ Pasta A.2      |                             |
|     • Folha A.2.1  |                             |
| ▶ Pasta B          |                             |
+--------------------+-----------------------------+
```

`*` = nó ativo. Pasta tem caret; folha tem ícone (default `File` do Phosphor).

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `nodes` | `TreeNode[]` (recursivo: `{ id, title, icon, children, payload }`) | — | Dados da árvore. `id` é estável (gerado uma vez no mount a partir de path posicional se ausente; ver Identidade abaixo). |
| `activeId` | string | — | Nó ativo. Controla highlight e estado do slot direito. |
| `onSelect(node)` | callback | — | Disparado quando folha (com `payload`) é clicada. Recebe nó completo. |
| `onToggle(id, open)` | callback | — | Opcional — útil para persistir estado de expansão fora. |
| `expandedIds` | `Set<string>` | controlado/uncontrolled | Conjunto de pastas abertas. Se ausente, componente gerencia internamente. |
| `defaultExpanded` | `'none' \| 'all' \| 'path-to-active'` | `path-to-active` | Estratégia inicial de expansão quando uncontrolled. |
| `filter` | `{ query: string }` | — | Busca embutida — controlada ou via input interno (`searchable`). |
| `searchable` | boolean | `true` | Renderiza input de filtro no topo da árvore. |
| `searchPlaceholder` | string | `'Filtrar'` | Placeholder do input. |
| `loading` | boolean | `false` | Mostra skeleton da árvore. |
| `lazyLoadChildren` | `(node) => Promise<TreeNode[]>` | — | Opcional. Quando definido, nós com `children: 'lazy'` carregam sob demanda. |
| `renderContent` | `(node) => ReactNode` | — | Slot direito. Tipicamente `<ModelEngine model={node.payload.model}/>`. |
| `emptyMessage` | string | `'Sem itens'` | Mensagem do [[empty-state]] quando `nodes` vazio. |
| `persistKey` | string | — | Opcional. Quando presente, expansão + filtro persistidos em `localStorage:director-studio:tree:<key>`. |

### Identidade de nó

`id` é **obrigatório semanticamente** mas o componente derivará um path posicional (`'0/1/2'`) quando ausente — compatibilidade com legado. Para deep-link estável (F022), `id` explícito é fortemente recomendado.

### Folha vs pasta

- **Folha**: `children` ausente ou vazio. Tem `payload` (geralmente `{ model }` no engine). Clique → `onSelect`.
- **Pasta**: `children.length > 0` (ou `'lazy'`). Caret visível. Clique no caret → toggle. Clique no label → toggle (default) — não dispara `onSelect`.
- **Híbrido** (pasta-com-página, herdado do legado): nó com `children` E `payload`. Clique no label dispara `onSelect`; caret separado para toggle. Suportado mas **desencorajado**; UX fica ambígua. Componente expõe via `behavior: 'page-and-folder'` opt-in no nó (`payload.alsoNavigates: true`). Default é estrito: pasta toggla, folha navega.

## Estados

- **default** — árvore renderizada, primeiro nó da expansão default visível, slot direito mostra placeholder ou nada (caller decide).
- **node-hover** — `bg-accent/40`.
- **node-active** — `bg-accent text-accent-foreground font-medium`; barra fina `border-l-2 border-primary` à esquerda. Persistente até nova seleção.
- **node-focus-visible** — ring (a11y teclado).
- **folder-expanded** — caret `CaretDown` (Phosphor); filhos renderizados com indentação progressiva (`pl-4` por nível, máx 8 níveis visualmente recomendado).
- **folder-collapsed** — caret `CaretRight`.
- **filter-active** — input com valor; nós que não correspondem têm `opacity-0 h-0` (saem do fluxo) ou são removidos do DOM. **Auto-expansão** dos pais dos matches (correção UX vs legado, que escondia sem expandir).
- **filter-empty** — input com valor mas nenhum match: [[empty-state]] inline `Nenhum resultado para "<query>"`.
- **loading-tree** — skeleton de 6–10 linhas, alturas variando, indentação aleatória sugerindo hierarquia.
- **loading-node** (lazy) — folder com children `'lazy'` em fetch: caret vira spinner pequeno; conteúdo expande mostrando 3 skeleton-rows.
- **error-node** (lazy falhou) — `! Carregar novamente` clicável; texto `text-destructive`.
- **empty** — nenhum nó: [[empty-state]] no lugar da árvore inteira.
- **disabled-node** — `text-muted-foreground opacity-50 pointer-events-none`. Para itens fora do tier do usuário (raro neste primitivo, mais comum em [[sidebar]]).

## Motion

- **Entrada da árvore**: fade-in dos nós em cascata, `fast` (150ms) com `stagger 20ms` por nível visível. Sem stagger se `prefers-reduced-motion`.
- **Expand/collapse de pasta**: `height: auto` animado, `normal` (250ms) `ease-out`. Caret rotaciona 90° no mesmo timing.
- **Filtro**: fade dos nós ocultos, `fast` (150ms). Auto-expansão de pais pra revelar matches anima junto (mesmo timing do expand).
- **Active highlight**: transição de `bg`/`border-l` em 100ms `ease-out` — feedback imediato.
- **Slot direito (mobile sub-tela ou desktop col)**: entrada por slide horizontal (mobile) ou crossfade (desktop), `normal` (250ms). Ver Responsivo abaixo.
- **prefers-reduced-motion**: tudo cai pra fade de 80ms; sem slide, sem stagger.

## Responsivo

A árvore tem **duas superfícies a coordenar**: a navegação (árvore) e o conteúdo (slot direito). A estratégia muda com viewport.

### mobile (< 768px)

**Padrão master/detail com duas telas internas.** A árvore e o slot ocupam viewports separadas:

- **Tela 1 (árvore)** — visível por default ao entrar na rota. Full-width. Input de filtro fixo no topo (sticky). Nós com `tap-target` mínimo de **44px** (thumb-zone). Folder click toggla inline; folha click → empurra Tela 2.
- **Tela 2 (conteúdo)** — entra por slide horizontal da direita ao selecionar folha. Header próprio com botão `Voltar` à esquerda + título do nó. Slot renderiza o engine.

A escolha de **sub-tela** (não drawer-up) é deliberada: o conteúdo da folha pode ser denso (form, grid) e merece viewport inteira. Drawer-up é apropriado pra picker/selector, não pra navegação que carrega conteúdo de página.

Alternativa controlada por prop `mobileLayout`:
- `'subscreen'` (default) — duas telas, slide.
- `'drawer-up'` — árvore vira drawer-up (Vaul) acionado por botão `Navegar` no header; conteúdo permanece visível atrás. Usar quando contexto exige manter o conteúdo enquanto explora a árvore (raro).

Gesto `swipe-right` no edge esquerdo da Tela 2 volta pra Tela 1 (opt-in, não bloqueante; também há botão `Voltar`).

### tablet (640–1024px)

Mesma layout do desktop, mas árvore mais estreita (`w-64` ao invés de `w-72`). Em orientação portrait < 768px, comporta como mobile.

### desktop (≥ 1024px)

**Split horizontal persistente**: árvore à esquerda (`w-72`, mínimo `w-56`, redimensionável opcional via handle), conteúdo à direita (`flex-1`). Bordas finas (`border-r`) separam. Sem sombra.

Em viewports estreitos (1024–1280px), árvore pode iniciar em **modo compacto** (só ícones + label truncado, similar ao rail da [[sidebar]]) — opt-in via `compactBelow={1280}`.

### thumb zone / gestos

- Mobile: toda interação primária (filtro, nós) na metade inferior da viewport quando árvore tem ≥ 8 itens visíveis (input sticky no topo é exceção, mas é alvo grande). Botão `Voltar` na Tela 2 fica à esquerda do header (acessível com polegar em right-handed; aceitável trade-off com botão "fechar" mainstream).
- Long-press num nó: opcional — abre menu de contexto (ações: copiar link, expandir tudo abaixo, colapsar tudo abaixo). Padrão desligado.

## Acessibilidade

- Container: `<nav aria-label="<title da árvore ou 'Árvore de navegação'>">` envolvendo a árvore.
- Estrutura ARIA: `role="tree"` no `<ul>` raiz; `role="treeitem"` em cada nó; `role="group"` em `<ul>` de filhos.
- Cada `treeitem`: `aria-expanded={open}` (apenas em pastas), `aria-selected={isActive}`, `aria-level={depth}`, `aria-setsize`, `aria-posinset`.
- Nó ativo (folha): adicionalmente `aria-current="page"` quando a seleção corresponde à rota atual.
- Navegação por teclado (padrão WAI-ARIA Tree):
  - `↓` / `↑` — move pra próximo/anterior **visível**.
  - `→` — em pasta colapsada: expande. Em pasta expandida: foca primeiro filho. Em folha: nada.
  - `←` — em pasta expandida: colapsa. Em folha ou pasta colapsada: foca pai.
  - `Home` / `End` — primeiro/último nó visível.
  - `Enter` / `Espaço` — em folha: dispara `onSelect`. Em pasta: toggla.
  - `*` (asterisco) — expande todos os irmãos do nó focado.
  - Digitação rápida (typeahead) — pula pro próximo nó cujo título começa com a sequência (mesmo padrão do `<select>` nativo).
- Foco sempre visível (ring) — não-negociável.
- Input de filtro: `<input type="search" aria-label="Filtrar árvore" aria-controls="<tree-id>">`. Quando há filtro ativo, anuncia `aria-live="polite"` com contagem de matches (`"12 itens"`).
- Skip-link no topo da árvore: `Pular para conteúdo` (especialmente útil em mobile drawer-up e desktop split).
- Contraste mínimo: nós inativos contra `bg-card` ≥ 4.5:1; nó ativo (sobre `bg-accent`) ≥ 4.5:1 — garantido pelos tokens semânticos.
- Leitor de tela: ao selecionar folha, anunciar `<title> selecionado, conteúdo carregando` (via `aria-live` no slot direito, gerenciado pelo `renderContent`).

## Composição

- **Compõe**: ícones Phosphor (`CaretRight`, `CaretDown`, `File`, `Folder`, `FolderOpen`, `MagnifyingGlass`), input de filtro (forma reduzida do [[form-field]]), [[empty-state]], skeleton de [[loading-state]].
- **É composto por**: [[app-shell]] (página dedicada), recursivamente pelo próprio engine quando um folha aponta para outra árvore (cenário raro; ver Notas).

## Cores e tokens

- `bg-card`, `text-card-foreground` — fundo da coluna da árvore (desktop split) e da Tela 1 mobile.
- `bg-accent`, `text-accent-foreground` — nó ativo, hover.
- `border-border` — divisor entre coluna da árvore e slot.
- `border-primary` — barra à esquerda do nó ativo (2px).
- `text-muted-foreground` — caret, ícones inativos, contagem de matches.
- `text-foreground` — labels.
- `bg-input`, `border-input` — input de filtro.
- `text-destructive` — estado de erro em lazy-load.
- `ring`, `ring-offset-background` — focus visível.

Nunca cor direta. Ver [[semantic-colors]].

## Notas derivadas do contrato legado

Do [[model-valor-generictreeview]] (Estrutura A):

- **Filtro é state-driven, não DOM hack** — diferente do `SearchTree` legado, e correção do `filterList` mutável do `GenericTreeView`. Filtro deriva do `query` + estrutura; `useMemo` para performance em árvores > 200 nós.
- **Filtro auto-expande pais dos matches** — correção UX vs legado A (que só escondia). Match no caret colapsado fica visível.
- **Limiar de busca 0 char** (filtra desde 1 char) — mantém comportamento do legado A. Limiar configurável via `minQueryLength` (default 1). Diferente do [[tree-checkable]] que usa 2.
- **Sem remount agressivo do slot** — legado usa `key={Math.random()}` forçando perda de estado. Studio usa `key={node.id}` — remonta só quando id muda; permite preservar estado em navegação programática para mesmo id.
- **Caret vs label** — default estrito (caret toggla, label navega/toggla conforme tipo). Modo `page-and-folder` é opt-in por nó, não global.
- **Bloqueio de aninhamento** — recomendação: o caller do engine deve recusar `payload.model` contendo outro `generictreeview` ou `pageTabs` (mantém regra do `TreePageConfig` legado, evita UX colapsada). Não é responsabilidade deste primitivo bloquear, mas a recomendação fica documentada.
- **Lazy-load** — feature nova vs legado (que era 100% estático). Opt-in, não bloqueia uso síncrono. Padrão simples: `children: 'lazy'` no nó dispara `lazyLoadChildren(node)` no primeiro expand.
- **Reorder/drag-and-drop** — fora do escopo deste primitivo (frente de **F-tree-drag-reorder**, vide manifest). Quando vier, será via prop opt-in (`draggable: true`) + callbacks.
- **Deep-link (F022)** — `activeId` controlado pelo caller; um router pode sincronizar `activeId` com `?node=<id>`. Componente não conhece URL.
- **Performance** — virtualização (windowing) **não** no primeiro release; árvores típicas têm dezenas de nós. Caller que prevê milhares deve usar `lazyLoadChildren`. Virtualização é débito pra F-tree-virtualized (P3, sob demanda).

## Sources

- [[calendar/notes/2026-05-15.md]]
- [[model-valor-generictreeview]] — contrato legado (Estrutura A)
