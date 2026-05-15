---
title: "F013 — Decisões"
tags: [effort, director-studio, F013, decisions]
created: 2026-05-16
---

# F013 — Renderer DFtipo=tree (generictreeview + TreeCheckable)

Contratos consumidos:
- [[legacy-contracts/model-valor-generictreeview]] (A=engine, B=SearchTree)
- [[ui-system/tree-view]]
- [[ui-system/tree-checkable]]

## Entregas

1. `packages/ui/src/components/tree-view.tsx` — `<TreeView>` puro
   - Props: `nodes`, `activeId`, `onActiveChange`, `renderContent`, `mode`,
     `persistKey`, `searchable`, `isMobileOverride`, `sidebarWidthClass`,
     `ariaLabel`.
   - Resolve `id` por path posicional quando ausente.
   - Persistência de expand/collapse em **sessionStorage** sob
     `studio:tree:<persistKey>:expanded`. Corrige débito do legado que perdia
     estado a cada navegação.
   - Filtro state-driven recursivo (substring case-insensitive) + auto-expand
     de pais dos matches (correção UX vs `GenericTreeView.js` legado).
   - Desktop split: `sidebarWidthClass="w-72"` (default) + slot `flex-1`.
   - Mobile master/detail (sub-tela com slide horizontal mental; layout via
     mount/unmount com botão "Voltar"). `mobileLayout='drawer-up'` registrado
     como follow-up (não implementado).
   - WAI-ARIA: `role=tree/treeitem/group`, `aria-expanded`, `aria-selected`,
     `aria-level`, `aria-setsize`, `aria-posinset`, `aria-current="page"` em
     folha ativa. Teclado parcial (Enter/Space/Arrow-left/right) — typeahead
     e Home/End enfileirados como débito secundário (não-bloqueante p/ smoke).

2. `packages/ui/src/components/tree-checkable.tsx` — `<TreeCheckable>` puro +
   `<TreeCheckableSheet>` wrapper.
   - Props: `nodes`, `value`, `defaultValue`, `onChange`, `onSave`, `cascade`,
     `valueMode`, `minQueryLength`, `searchable`, `footer`, `hideSaveButton`.
   - `cascade='both'` default; `valueMode='leaves'` default.
   - Estado canônico interno = `Set<leafKey>`. Estados das pastas derivados
     puramente (`computeFolderStates`). Tristate `aria-checked="mixed"`.
   - Filtro state-driven recursivo, limiar 2 chars, auto-expand pais.
   - Mobile-first em `<TreeCheckableSheet>`: Vaul `direction="bottom"` em
     mobile; `"right"` em desktop. Standalone (inline) também suportado.
   - SEM rc-tree. SEM hack DOM `getElementsByClassName`.
   - `value` controlado é o canônico (alinhado ao consumer real do legado,
     `ModalRecursos.jsx`); `defaultValue` cobre uncontrolled.
   - `hideSaveButton` + `footer` flex captura o padrão "embed em modal externo".

3. `packages/ui/src/components/tree-view-renderer.tsx` — `TreeViewRenderer`
   - Plug-in do ModelEngine para a chave `generictreeview`.
   - Mapeia schema legado `{ tree:[{ title, tree?, model?, icon?, template? }] }`
     → `TreeNode[]` do `<TreeView>` (campo legado `tree` vira `children`).
   - `renderContent` chama `renderEmbeddedModel(node.payload.model)` injetado.
   - Nó com `model` **E** `children.length > 0` (híbrido legado) → marcado
     `alsoNavigates: true` (mantém comportamento do legado: label navega,
     caret toggla).

4. `packages/ui/src/components/model-engine.tsx` — alterações:
   - Importa `TreeViewRenderer`.
   - Nova prop `embeddedModel?: Record<string, unknown>` + `embeddedTitle`.
     Quando presente, `useModel` é chamado com `skip:true` e o engine renderiza
     direto sobre o JSON em mãos (sem fetch). Habilita recursão de árvore.
   - No dispatch, chave `generictreeview` agora monta `<TreeViewRenderer>` com
     `renderEmbeddedModel={(subModel) => <ModelEngine embeddedModel={subModel}/>}`
     — recursão real do engine.
   - SEM `key={Math.random()}` legado (que forçava remount agressivo); usa
     `key={activeNode.id}` (via slot do TreeView) — preserva estado quando
     mesmo id é re-selecionado.

5. `apps/director-studio/src/routes/smoke-f013.tsx` — smoke route
   - 3 seções: (1) ModelEngine renderiza um fake model com `generictreeview`
     contendo 3 nós e uma sub-árvore aninhada (testando recursão do engine);
     (2) TreeCheckable inline; (3) TreeCheckableSheet bottom-sheet.
   - Registrada em `tree.tsx` como `/smoke/f013`.

## Decisões explícitas

- **Sem rc-tree, sem react-arborist** — implementação manual com `<ul role="tree">`
  + `<li role="treeitem">` recursivos, animação implícita via mount/unmount.
- **Sem `Collapsible` do shadcn** — usar a primitiva tornaria a árvore mais
  pesada e fragmentaria o ARIA. Mantemos toggle por estado, simples.
- **`children` é a chave canônica no Studio** — tanto em TreeView quanto em
  TreeCheckable. Adaptamos `tree` legado → `children` na camada do
  TreeViewRenderer (não vaza pra primitive).
- **Persistência só de expansão** — `activeId` é responsabilidade do caller
  (quando vier deep-link via F022, será controlado via URL).
- **Não bloqueamos aninhamento de `generictreeview` dentro de `generictreeview`**
  — mantemos o que o runtime do legado já permitia; o editor visual é débito
  de F-tree-editor.
- **`onSave` no Sheet fecha o sheet** — comportamento típico do consumer
  legado (modal fecha ao confirmar). `onSave` no inline NÃO fecha (não há o
  que fechar).

## Débitos / follow-ups

- Teclado completo (Home/End, typeahead, asterisco para expandir irmãos).
- Lazy-load (`lazyLoadChildren`) — opt-in spec, não implementado.
- Drawer-up alternativo no mobile (spec `mobileLayout='drawer-up'`).
- Animação de altura (`height: auto`) no expand/collapse — atualmente é
  mount/unmount sem transição.
- Highlight visual da substring de match (`highlightMatches: true`).
- `maxSelection` no TreeCheckable.
- Deep-link `?node=<id>` (será via F022).
- `ResolvedTreeNode` exporta sem documentação rica — basta para o uso atual.

## Smoke

- Typecheck `turbo run typecheck`: **3/3 OK**.
- `vite build`: **OK** (17s, sem erros).
- Rota local `/smoke/f013` renderiza:
  - Engine sobre fake model → TreeView com 2 raízes ("Cadastros" pasta com
    2 filhos; "Relatório" folha).
  - Click em "Usuários" → engine recursivo monta `<GenericFormRenderer>` no
    slot direito.
  - Click em "Sub-árvore" → engine recursivo monta outro `TreeView` (com 2
    folhas aninhadas), demonstrando recursão real.
  - TreeCheckable inline: tristate visível, cascade pai→filhos.
  - TreeCheckableSheet: bottom-sheet em mobile, drawer-right em desktop.
