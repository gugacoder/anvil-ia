---
title: "Sidebar"
aliases: [sidebar, side-nav, app-sidebar, nav-panel]
tags: [ui-system, component, navigation, shell, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Sidebar

Painel lateral persistente do desktop que hospeda navegação primária, identidade do usuário e status. No mobile, o **mesmo conteúdo** vive dentro de um Drawer-up (Vaul) acionado pelo botão `Menu` da [[shortcut-bar]] — não há sidebar persistente em mobile.

A sidebar é um **container de regiões**. A árvore de itens em si (menu hierárquico derivado do ACL) é responsabilidade de F007 e está documentada em separado. Esta spec foca em estrutura, estados, dimensões e comportamento.

## Quando usar

- Dentro do [[app-shell]] em viewports `≥ 768px` — como `<aside>` fixo à esquerda.
- Dentro do [[app-shell]] em mobile — como conteúdo de um `Drawer` (Vaul), acionado por `Menu`.

## Quando NÃO usar

- Como navegação secundária dentro de uma página (use [[page-tabs]] ou tabs locais).
- Como container de configurações de página (use Sheet/Drawer dedicado, ver skill `vaul`).

## Anatomia (5 regiões verticais)

```
┌──────────────────┐
│ 1. Brand         │  h-14, alinhado ao header
├──────────────────┤
│ 2. Menu          │  flex-1, scrollável internamente
│   (hierárquico)  │
│                  │
├──────────────────┤
│ 3. Widgets       │  opcional — cards de status (versão API, ambiente, alertas)
├──────────────────┤
│ 4. Avatar Menu   │  usuário + popover (perfil, tema, logout)
├──────────────────┤
│ 5. Editar atalhos│  mobile-only, link discreto (abre ShortcutEditor)
└──────────────────┘
```

A região **Menu** (2) é o coração; demais são satélites. Em viewports muito curtos (mobile landscape ou janelas redimensionadas), Widgets pode colapsar; Avatar nunca colapsa.

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `mode` | `expanded` \| `rail` \| `drawer` | derivado (desktop=expanded, mobile=drawer) | Forma visual. `rail` é a versão colapsada (64px). |
| `brand` | nó (logo expandido) | — | Renderizado em modo `expanded` e `drawer`. |
| `brandCollapsed` | nó (logo reduzido) | — | Renderizado em modo `rail`. |
| `menuRoot` | `MenuContext` | — | Árvore hierárquica de itens. Estrutura: grupos → itens → (subitens via drill-down). Detalhes em F007. |
| `activeRoute` | string | — | Caminho ativo (highlight + grupo expandido). |
| `widgets` | array de `{ icon, label, value }` | `[]` | Cards de status. Vazio = região oculta. |
| `user` | `{ name, role, avatarRoute }` | — | Avatar menu. |
| `onNavigate(path)` | callback | — | Dispara navegação ao clicar em item folha. |
| `onLogout` | callback | — | Saída. |
| `onToggleMode` | callback | — | Alterna `expanded` ↔ `rail` (desktop). |
| `editShortcutsSlot` | nó | — | Renderizado apenas em modo `drawer`. |

## Estados

- **expanded** (desktop default) — 240px, labels visíveis, grupos expansíveis.
- **rail** (desktop colapsado) — 64px, só ícones; labels viram tooltip no hover/focus; grupos expansíveis **desabilitados** (clicar em grupo navega para primeiro item-folha? — decisão: clique em grupo no rail abre **popover** lateral listando os filhos, sem precisar expandir o rail). Estado persistido em `localStorage:director-studio:sidebar-collapsed`.
- **drawer** (mobile) — ocupa altura total do drawer (Vaul `snapPoints={[0.9]}` ou full), labels visíveis sempre.
- **item-hover** — `bg-sidebar-accent/60 text-sidebar-accent-foreground`.
- **item-active** — `bg-sidebar-accent text-sidebar-accent-foreground font-medium`; barra fina à esquerda (`border-l-2 border-primary`) para reforço visual.
- **item-focus-visible** — ring no item (a11y teclado).
- **group-expanded** — chevron `CaretDown`; subitens visíveis com indentação `pl-9`.
- **group-collapsed** — chevron `CaretRight`.
- **loading** — skeleton de 5–8 linhas no lugar do menu (durante boot do ACL). Brand e avatar visíveis com placeholder.
- **empty-menu** — caso raro (ACL sem itens): `Você não tem acesso a nenhuma página. Fale com o administrador.` em [[empty-state]] dentro da região menu.

## Comportamento de grupos

- **Click em item folha** (`route` presente): chama `onNavigate(path)`. Em mobile (drawer), o drawer fecha automaticamente após a navegação.
- **Click em grupo** (`children` presente):
  - **expanded**: expande/colapsa inline. Comportamento configurável — **default acumulativo** (múltiplos grupos podem ficar abertos). O legado tinha mutuamente exclusivo; o Studio adota acumulativo porque é mais previsível e o usuário escolhe. Estado dos grupos abertos persistido em `localStorage:director-studio:sidebar-groups` (Set de IDs).
  - **rail**: abre popover lateral com filhos; popover fecha ao clicar em item folha ou em qualquer outro lugar.
  - **drawer**: drill-down — empilha contexto, troca o título do drawer, mostra `Voltar` à esquerda do título. Não é inline porque mobile tem espaço limitado e drill-down é mais nativo do gesto.

## Motion

- **Toggle mode (expanded ↔ rail)**: `width` animado 240↔64 em 200ms `ease-in-out`; labels fade em 100ms (saem antes de colapsar, entram depois de expandir).
- **Expand/collapse de grupo**: `height: auto` animado em 200ms `ease-out`. Chevron rotaciona 90° no mesmo timing.
- **Drill-down (drawer mobile)**: slide horizontal entre níveis (`translateX(-100%)` no nível atual, novo nível entra de `translateX(100%)`); 250ms `ease-in-out`.
- **Hover de item**: `bg-color` em 100ms.
- **Item active scale**: `active:scale-[0.98]` em mobile, 80ms.
- `prefers-reduced-motion`: todas transições caem para fade 80ms; sem slide nem scale.

## Responsivo

- **mobile (< 768px)**: modo `drawer`. Não há sidebar persistente. Acionada via botão `Menu` na [[shortcut-bar]]. Drawer-up via Vaul; ocupa ~90% da altura da viewport; gesto de swipe-down fecha.
- **desktop (≥ 768px)**: modo `expanded` por default; toggle para `rail` no `border-r` ou via botão `≡` do header.
- **viewports estreitos desktop (768–1024px)**: pode iniciar em `rail` automaticamente; usuário pode expandir manualmente.
- **gestos mobile**:
  - Swipe-down no drawer fecha.
  - Tap fora (backdrop) fecha.
  - Em drill-down: swipe-right do edge esquerdo volta um nível (opt-in, não bloqueante).

## Acessibilidade

- `<aside aria-label="Navegação lateral">` (desktop).
- `<nav aria-label="Navegação principal">` envolvendo a região Menu.
- Cada grupo: `<button aria-expanded={open} aria-controls="...">`. Subitens em `<ul role="group">`.
- Item ativo: `aria-current="page"`.
- Modo `rail`: `<Tooltip side="right">` em cada item + `aria-label` no botão.
- Modo `drawer`: focus trap obrigatório; Escape fecha; foco volta ao trigger ao fechar.
- Skip-link `Pular navegação` no topo da sidebar (mobile drawer especialmente) levando direto ao conteúdo da página.
- Navegação por teclado: `↑/↓` move entre itens, `→` expande grupo / drill-in, `←` colapsa / volta, `Enter` navega.
- Itens com `minTier > userTier` são **filtrados** (não renderizados desabilitados) — não polui leitor.

## Composição

- **Compõe**: itens de menu (F007), [[avatar-menu]], widgets de status, ícones Phosphor.
- **É composto por**: [[app-shell]].
- **Drawer wrapper (mobile)**: `Drawer` do shadcn (Vaul).

## Cores e tokens

- `bg-sidebar`, `text-sidebar-foreground` — background e texto da sidebar.
- `bg-sidebar-accent`, `text-sidebar-accent-foreground` — item ativo/hover.
- `border-sidebar-border` (ou `border-border`) — divisores entre regiões.
- `border-primary` — barra fina à esquerda do item ativo (2px).
- `text-muted-foreground` — labels de grupo em modo expanded (cabeçalhos de seção).
- `ring`, `ring-offset-sidebar` — focus.

Nunca cor direta. Ver [[semantic-colors]].

## Notas derivadas do contrato legado

Do [[app-main]] (AppSidebar legado):

- **Comportamento mutuamente exclusivo de grupos é descartado**: o Studio adota acumulativo (decisão consciente).
- **Item `to === '/'` pulado**: regra mantida — home é acessível pelo Brand (click navega pra `/`) e não polui o menu.
- **Modo rail desabilita dropdowns**: substituído por popover lateral (rail no Studio não é "dead" como no legado, é navegável).
- **Ícones via `acl.icon`**: F007 mapeia ícones do ACL para o conjunto Phosphor; default `File` quando ausente.
- **ACL via `sessionStorage`**: irrelevante para o componente; o sidebar recebe `menuRoot` por props e não conhece origem.

## Sources

- [[calendar/notes/2026-05-15.md]]
- [[app-main]] — comportamento legado do `AppSidebar`
