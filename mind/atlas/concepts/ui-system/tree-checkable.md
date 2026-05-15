---
title: "Tree Checkable"
aliases: [tree-checkable, search-tree, checkable-tree, resource-picker, acl-tree]
tags: [ui-system, component, tree, multi-select, picker, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Tree Checkable

Primitivo de **árvore com seleção múltipla via checkboxes**, com busca embutida e cascade pai↔filho. Substitui o `<SearchTree/>` do legado — usado tipicamente em modais/sheets para escolher um subconjunto hierárquico de itens (recursos ACL, permissões, categorias, escopos).

É componente **de seleção**, não de navegação. Quando o objetivo é navegar entre páginas com slot de conteúdo, use [[tree-view]]. Os contratos de dados são distintos (este usa `children`; aquele usa `children` também no Studio mas com payload diferente) — **nunca unificar prematuramente**.

## Quando usar

- Modal/sheet para selecionar recursos hierárquicos: ACL (módulo → página → função), categorias com subcategorias, regiões/cidades, contas/sub-contas.
- Widget embutido em formulário do tipo `ctype: 'tree-select'` (multi-select hierárquico inline).
- Configurações onde o usuário precisa marcar/desmarcar muitos itens organizados em árvore.

## Quando NÃO usar

- Seleção única em árvore — use [[tree-view]] com estado de active (semanticamente diferente).
- Seleção plana (sem hierarquia) — use checkbox list ou multi-select.
- Navegação de páginas → [[tree-view]].
- Árvores com **milhares** de nós sem possibilidade de filtro guiado — UX degrada; reconsiderar IA (taxonomia).

## Anatomia

```
+--------------------------------+
| [título opcional]              |
| [🔎 buscar...                ] |  input filtro (sticky)
|                                |
|  □ Pasta A           [parcial] |
|    ☑ Folha A.1                 |
|    □ Folha A.2                 |
|    □ Pasta A.3                 |
|      ☑ Folha A.3.1             |
|  ☑ Pasta B (todos marcados)    |
|                                |
| [Limpar]              [Salvar] |  footer (opcional)
+--------------------------------+
```

Tristate visual nas pastas: ☐ vazio · ☑ todos marcados · ▣ parcial (alguns filhos).

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `nodes` | `TreeNode[]` (recursivo: `{ key, title, icon, children, disabled }`) | — | Dados. `key` é PK estável e única em toda a árvore. |
| `value` | `string[]` (keys marcadas) | controlado/uncontrolled | Conjunto de keys checadas. Componente é controlado se `value` + `onChange`. |
| `defaultValue` | `string[]` | `[]` | Pré-seleção quando uncontrolled. |
| `onChange(keys)` | callback | — | Disparado a **cada** check/uncheck (e em `clear`). |
| `onSave(keys)` | callback | — | Disparado apenas no clique no botão `Salvar` (footer interno). Não dispara se `footer='none'` ou `hideSaveButton`. |
| `cascade` | `'both' \| 'down' \| 'none'` | `both` | `both`: marcar pai marca filhos + marcar todos os filhos marca pai (tristate). `down`: pai propaga mas filhos não promovem pai. `none`: cada nó independente (pasta também checkable como item). |
| `searchable` | boolean | `true` | Renderiza input de filtro. |
| `searchPlaceholder` | string | `'Procurar'` | Placeholder. |
| `minQueryLength` | number | `2` | Limiar mínimo de caracteres para acionar filtro + auto-expand. |
| `autoExpandOnSearch` | boolean | `true` | Expande pais dos matches. Reseta ao limpar. |
| `expandedKeys` | `Set<string>` | uncontrolled | Pastas abertas. Se ausente, gerenciado internamente. |
| `defaultExpanded` | `'none' \| 'all' \| 'top-level' \| 'path-to-checked'` | `path-to-checked` | Estratégia inicial. |
| `footer` | `'save+clear' \| 'save' \| 'clear' \| 'none'` | `save+clear` | Composição do footer. `'none'` quando hospedado em modal/sheet com botões próprios. |
| `hideSaveButton` | boolean | `false` | Atalho — equivalente a omitir `save` do footer. Mantido por compatibilidade legado. |
| `saveLabel` | string | `'Salvar'` | Label do botão. |
| `clearLabel` | string | `'Limpar'` | Label do botão. |
| `title` | string | — | Cabeçalho opcional acima do input. |
| `emptyMessage` | string | `'Sem itens'` | [[empty-state]] quando `nodes` vazio. |
| `loading` | boolean | `false` | Skeleton da árvore. |
| `disabled` | boolean | `false` | Toda a árvore não-interativa. |
| `maxSelection` | number | — | Opcional. Limita total de folhas marcadas; ao atingir, demais checkboxes ficam disabled com tooltip. |

### Tristate de pasta

Em `cascade='both'`:
- ☐ `unchecked` — nenhum descendente folha marcado.
- ☑ `checked` — **todas** as folhas descendentes marcadas.
- ▣ `indeterminate` — algumas mas não todas.

`value` carrega apenas keys das **folhas**, ou de pastas-completamente-marcadas (escolha do caller via prop `valueMode: 'leaves' | 'leaves+full-folders' | 'all'`, default `leaves`). Reduz payload e ambiguidade.

## Estados

- **default** — árvore renderizada, expansão inicial conforme `defaultExpanded`, value reflete `defaultValue` ou `value`.
- **node-hover** — `bg-accent/40`.
- **node-focus-visible** — ring no row do nó.
- **checkbox-checked** — `bg-primary text-primary-foreground` no quadrado; ícone `Check` Phosphor.
- **checkbox-indeterminate** — `bg-primary/80`; ícone `Minus` Phosphor.
- **checkbox-disabled** — `opacity-50 cursor-not-allowed`; tooltip explicando motivo (ex.: `Limite de N atingido`, `Sem permissão`).
- **folder-expanded** / **folder-collapsed** — caret `CaretDown` / `CaretRight`.
- **filter-active** — input com `query.length >= minQueryLength`. Nós sem match (e sem descendentes com match) ocultos. Pais dos matches **auto-expandidos**. Texto do match com `bg-primary/20` destacando a substring (opcional via `highlightMatches: true`, default ligado).
- **filter-below-threshold** — input com `query.length < minQueryLength`. Mostra dica sutil `text-muted-foreground text-xs`: `Digite ao menos N caracteres`. Árvore não filtra.
- **filter-empty** — query válida, zero matches: [[empty-state]] inline `Nenhum resultado para "<query>"` com botão `Limpar`.
- **loading** — skeleton de árvore (similar a [[tree-view]] mas com placeholder de checkbox à esquerda).
- **empty** — `nodes` vazio: [[empty-state]] global.
- **footer-default** — `Salvar` habilitado quando `value` mudou em relação ao snapshot inicial; `Limpar` habilitado quando `value.length > 0`.
- **footer-saving** — botão `Salvar` em estado loading ([[button]] `loading=true`), demais inputs `disabled`.
- **error-save** — mensagem de erro inline acima do footer ([[inline-alert]] variante `error`), preservando seleção.
- **max-reached** — quando `maxSelection` atingido: checkboxes não-marcados ficam disabled; banner sutil acima da árvore: `N/N selecionados (limite)`.

## Motion

- **Entrada (em modal/sheet)** — o componente em si não anima entrada; orquestrado pelo container ([[modal-sheet]]).
- **Expand/collapse de pasta** — `height: auto` em `normal` (250ms) `ease-out`. Caret rotaciona 90°.
- **Filtro** — fade dos nós ocultos `fast` (150ms). Auto-expand dos pais é simultâneo (mesmo timing do expand). Highlight dos matches aparece junto com a renderização.
- **Check/uncheck** — checkbox transition de bg+ícone em 80ms `ease-out`. Tristate troca cor sem flicker.
- **Cascade animado** — quando pai é marcado/desmarcado e cascade propaga: filhos atualizam em cascata visual com stagger de 15ms (no máximo 6 itens visíveis afetados; resto instantâneo). Comunica a propagação. Desliga com `prefers-reduced-motion`.
- **Limpar** — anima desmarcação de todos visíveis com stagger 10ms (cap 8). Mais rápido que cascade individual.
- **prefers-reduced-motion** — tudo cai pra fade 80ms; sem stagger, sem cascade animado.

## Responsivo

Componente é **mobile-first**: é tipicamente hospedado em [[modal-sheet]] que vira bottom-sheet em mobile e modal centralizado em desktop.

### mobile (< 768px)

- Hospedeiro default: bottom-sheet Vaul com `snapPoints={[0.5, 0.9]}`, snap inicial 0.9. Usuário pode arrastar pra meio-snap para enxergar contexto atrás.
- Input de filtro **sticky no topo** do scroll (mantém visível enquanto rola árvore).
- Cada row tem altura mínima **48px** (thumb zone) com tap-target estendido ao label completo. Checkbox + label são um único hit-area.
- Footer **sticky no bottom** do sheet; safe-area inset bottom respeitado (`pb-[env(safe-area-inset-bottom)]`).
- Caret é tap-target separado (24px), à esquerda do checkbox, para evitar conflito (tap em checkbox marca; tap em caret toggla).
- Em sheets muito altos (árvore grande), permite scroll interno sem fechar o sheet (`overscroll-contain`).

### tablet (640–1024px)

- Hospedeiro: modal centralizado de largura `max-w-md`. Altura adaptativa até `max-h-[80vh]`.
- Mesma estrutura do desktop.

### desktop (≥ 1024px)

- Modal centralizado `max-w-lg` (ou conforme o caller). Footer fixo na parte inferior do modal.
- Linhas mais compactas (altura mínima **36px**) — densidade adequada para mouse.
- Filtro embedded mantém sticky.

### Uso standalone (não em modal)

Quando embutido em um form ou painel:
- Footer interno **deve** ser `'none'` ou apenas `'clear'` — save é responsabilidade do form pai.
- Componente passa a se comportar como widget controlado; altura limitada pelo container com scroll interno.

### thumb zone / gestos

- Mobile: footer no bottom + filtro sticky no topo cobre as duas zonas confortáveis.
- Swipe-down no edge do header do sheet → fecha (gesto nativo Vaul).
- Long-press num nó: opcional — `Selecionar todos os filhos` / `Desmarcar todos os filhos` em menu de contexto. Desligado por default.

## Acessibilidade

- Container: `<div role="group" aria-label="<title ou 'Seleção em árvore'>">`.
- Estrutura ARIA: a árvore checkable usa `role="tree"` com `aria-multiselectable="true"`; cada nó `role="treeitem"` com `aria-checked="true" | "false" | "mixed"` (tristate).
- Cada `treeitem`: `aria-expanded` (em pastas), `aria-level`, `aria-setsize`, `aria-posinset`, `aria-disabled` quando aplicável.
- Input de filtro: `<input type="search" aria-label="<searchPlaceholder>" aria-controls="<tree-id>">`. `aria-describedby` para a dica de limiar quando `query.length < minQueryLength`. `aria-live="polite"` anuncia contagem de matches.
- Navegação por teclado (WAI-ARIA Tree multi-select):
  - `↓` / `↑` — próximo/anterior visível.
  - `→` / `←` — expandir/colapsar pasta ou focar pai.
  - `Espaço` — toggla checkbox do nó focado.
  - `Enter` — em pasta: toggla expansão. Em folha: toggla check (atalho equivalente a Espaço, opcional).
  - `Home` / `End` — primeiro/último visível.
  - `Ctrl+A` — marca todos os visíveis (respeitando `maxSelection`). `Ctrl+Shift+A` desmarca todos.
  - Typeahead — pula pro próximo nó cujo título começa com a sequência.
- Foco sempre visível.
- Foco trap dentro do modal/sheet; ESC fecha (orquestrado pelo container).
- Botões do footer: `Salvar` recebe foco automaticamente após mudança? **Não** — mantém foco no nó interagido. Tab move pro footer.
- Contraste: checkbox marcado contra `bg-card` ≥ 4.5:1; indicador indeterminate idem; texto destacado em highlight ≥ 4.5:1 contra fundo destacado.
- Leitor de tela: ao marcar pasta com cascade, anunciar `<n> itens selecionados` via `aria-live`. Ao limpar: `Seleção limpa`.

## Composição

- **Compõe**: Checkbox (do shadcn, com suporte a indeterminate), ícones Phosphor (`CaretRight`, `CaretDown`, `Check`, `Minus`, `MagnifyingGlass`, `Folder`, `File`, `X`), input de filtro (forma reduzida do [[form-field]]), [[empty-state]], [[loading-state]] (skeleton), [[inline-alert]] (erro de save), [[button]] (footer).
- **É composto por**: [[modal-sheet]] (uso canônico), formulários do engine ([[generic-form]] como field-type `tree-select`).

## Cores e tokens

- `bg-popover` (em modal) / `bg-card` (standalone) — fundo.
- `text-foreground` — labels.
- `text-muted-foreground` — caret, ícones inativos, dica de limiar, contagem.
- `bg-primary`, `text-primary-foreground` — checkbox marcado, indeterminate (com `/80`), highlight de match (`/20`).
- `bg-accent`, `text-accent-foreground` — hover.
- `bg-input`, `border-input` — input de filtro.
- `border-border` — divisor opcional entre header/footer.
- `text-destructive` — erro de save.
- `ring` — focus visível.

Nunca cor direta. Ver [[semantic-colors]].

## Notas derivadas do contrato legado

Do [[model-valor-generictreeview]] (Estrutura B — `SearchTree`):

- **Chave de filhos `children`** (não `tree`) — mantém convenção do legado e do rc-tree. Distinto do [[tree-view]] do engine — não confundir.
- **`value` controlado é canônico** — legado tem drift entre HEAD (uncontrolled via `preCheckedList`) e consumer real (`value` controlado em `ModalRecursos`). Studio adota controlado como default; `defaultValue` cobre uncontrolled.
- **Filtro state-driven, não DOM hack** — corrige o `document.getElementsByClassName(title)` do legado, que era frágil (títulos com caracteres especiais quebravam) e só funcionava em 2 níveis. Studio filtra na fonte de dados, recursivamente, com `useMemo`.
- **Limiar de busca = 2 chars** — mantém do legado. Configurável via `minQueryLength`.
- **Auto-expand de pais dos matches** — mantido (era o ponto forte do legado vs `GenericTreeView`).
- **Cascade pai↔filho default** — `cascade='both'`, herdado do rc-tree e do uso real em ACL. Configurável.
- **`hideSaveButton` + footer flexível** — captura o padrão "embed em modal externo" do `ModalRecursos`. Studio expõe via `footer` ou `hideSaveButton`.
- **Sem `ref` exposta** — descartado. Comportamento "imperativo" do legado (`ref` no consumer) substituído por controle via props (`value` + `onChange` + `onSave`). Se hoster precisa disparar save externamente, hoster mantém estado local e chama sua própria API.
- **Sem drag-and-drop** — mantido fora do escopo. Reordenar não é caso de uso desta primitiva.
- **Sem lazy-load** — diferente do [[tree-view]], aqui árvores são tipicamente menores (centenas, não milhares) e a busca local exige árvore completa para indexar. Se necessário no futuro, será débito separado.
- **`onChange` dispara a cada mudança** vs `onSave` apenas no clique — preserva semântica do legado: caller decide se quer save-on-change (form embarcado) ou save-on-confirm (modal).
- **Performance** — `useMemo` para `flatList` (índice de busca) e para árvore filtrada. Cascade computado on-demand via `Set` para O(1) lookup. Em árvores < 2000 nós, sem virtualização. Acima disso, débito P3.

## Sources

- [[calendar/notes/2026-05-15.md]]
- [[model-valor-generictreeview]] — contrato legado (Estrutura B)
