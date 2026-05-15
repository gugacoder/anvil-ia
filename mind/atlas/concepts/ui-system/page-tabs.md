---
title: "Page Tabs"
aliases: [page-tabs, app-tabs, multi-doc, tab-bar, recent-stack]
tags: [ui-system, component, navigation, shell, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Page Tabs

Sistema de **múltiplos documentos abertos simultaneamente** com preservação de estado entre eles. É a forma como o usuário do Director (legado e Studio) trabalha: abre Cadastro de Empresas, deixa lá com filtros aplicados, abre Cadastro de Pessoas, alterna, volta para Empresas e tudo está como deixou.

Não é apenas decoração visual. É **modelo de trabalho**: 80% das sessões do produto têm 3+ páginas abertas em paralelo. O usuário usa abas como contexto cognitivo persistente, não como atalho de navegação.

O legado ([[app-main]] / `AppMainTabs`) é uma barra horizontal scrollável de até 10 abas com `×` em cada. Mobile-first exige **repensar** este vocabulário, não estendê-lo. Em mobile, barra de abas horizontal é frágil (área de toque pequena, scroll horizontal compete com swipe da página, fecha-aba acidental).

## Decisão de design (mobile)

**Mobile substitui a barra de abas por uma "Recent Stack" (Pilha de recentes) acessada via bottom-sheet.**

Premissas:

1. **Conceito preservado**: múltiplas páginas abertas com estado mantido — funcionalmente idêntico ao legado. Não é "abas removidas no mobile", é "abas reapresentadas".
2. **Indicador discreto no header**: um badge no botão voltar (ou um pequeno chip "+3 abertas") avisa que há outras páginas; tap abre o bottom-sheet.
3. **Bottom-sheet "Páginas abertas"**: lista vertical com nome da página + breadcrumb + botão "fechar" por linha + botão "Fechar todas". É o painel canônico para gerenciar abas no mobile. Acessível também pela [[shortcut-bar]] em slot fixo (`Páginas` ao lado de `Menu`)? — **opt-in da feature**, default = só pelo header.
4. **Sem barra horizontal de abas em mobile**. Nunca. Compete com gestos da página e tem área de toque insuficiente.

Desktop mantém o paradigma legado adaptado: barra horizontal sob o header, com adaptações de UX (afford. de close, drag-to-reorder, atalhos de teclado).

## Quando usar

- Apps/rotas onde múltiplas páginas devem coexistir (`apps/director-studio` — todo o produto principal).
- Página decide se entra na pilha de abas via flag `tabbable: true` em `staticData` da rota.

## Quando NÃO usar

- Páginas singleton (configurações globais, perfil): não vão pra pilha; substituem o conteúdo (modal/sheet ou navegação simples).
- Sub-páginas dentro de uma aba já aberta (ex: detalhe de registro): **não** abrem aba nova; usam Sheet/drawer ou substituem o conteúdo da aba corrente.
- Wizards multi-step: cada step é interno à aba, não vira aba.

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `tabs` | array `{ id, path, label, breadcrumb?, dirty?, closable? }` | `[]` | Lista de abas abertas. |
| `activeTabId` | string | — | Aba atualmente em foco. |
| `maxTabs` | número | `10` (desktop), `15` (mobile recent stack) | Limite. Acima do limite, abrir 11ª: feedback via [[toast]] "Feche uma das abas para abrir uma nova" e mantém aba corrente (mesma regra do legado). |
| `onActivate(id)` | callback | — | Trocar aba ativa. |
| `onClose(id)` | callback | — | Fechar aba. Aba não-fechável (e.g. `/`): bloqueia. |
| `onCloseAll()` | callback | — | Mobile: botão "Fechar todas" na bottom-sheet. Desktop: opção em context-menu da aba (clique direito). |
| `onReorder(fromIndex, toIndex)` | callback | — | Desktop: drag-and-drop. |

## Anatomia

### Desktop (≥ 768px)

```
┌──────────────────────────────────────────────────────────────┐
│ AppHeader                                                    │
├──────────────────────────────────────────────────────────────┤
│ [Início] [Cad. Empresas •] [Cad. Pessoas]  [Pedido 42] …     │  PageTabs h-9
├──────────────────────────────────────────────────────────────┤
│ <Outlet /> (aba ativa)                                       │
│                                                              │
```

- Barra `h-9` logo abaixo do header.
- Cada aba: pílula com label truncado + ícone `×` à direita (exceto aba não-fechável).
- Aba ativa: `bg-background` (mesma cor do conteúdo, "ancora" visualmente na página) + `font-medium` + `border-x border-t border-border` (cantos arredondados topo).
- Abas inativas: `bg-muted text-muted-foreground` + hover `bg-muted/70`.
- Indicador "dirty" (estado não salvo): bullet `•` antes do label.
- Overflow horizontal: scroll com `scroll-behavior: smooth`; gradients laterais (`bg-gradient-to-r from-background`) indicam mais abas escondidas.
- Drag-and-drop: cursor `grab`, drag visual com `opacity-50` no item arrastado; drop reordena.

### Mobile (< 768px) — Recent Stack

**Trigger** (no header ou shortcut bar):

```
[←]  Empresas              [📑3] [🔍] [🔔]    
              └ badge com contagem total se > 1
```

- Quando `tabs.length > 1`: chip discreto `[📑 3]` (`Stack` icon do Phosphor + count) no header, à esquerda das ações.
- Tap no chip abre o bottom-sheet.

**Bottom-sheet "Páginas abertas"** (Vaul):

```
┌─────────────────────────────────────────┐
│  ━━                                     │  handle do Vaul
│  Páginas abertas (3)    [Fechar todas]  │
├─────────────────────────────────────────┤
│  ● Cadastro de Empresas         [×]    │  aba ativa: bullet + bold
│    Início / Cadastros                   │
├─────────────────────────────────────────┤
│   Cadastro de Pessoas           [×]    │
│    Início / Cadastros                   │
├─────────────────────────────────────────┤
│   Pedido 42 •                   [×]    │  bullet de dirty
│    Pedidos / 42                         │
└─────────────────────────────────────────┘
```

- Cada linha: tap navega para aba (e fecha o sheet); `×` fecha aba.
- Aba ativa marcada com bullet `●` à esquerda + `font-medium`.
- Breadcrumb pequeno (`text-xs text-muted-foreground`) abaixo do label para desambiguar abas com nomes parecidos.
- "Fechar todas" pede confirmação se houver aba com `dirty`.

## Estados

- **empty** — `tabs.length === 0` (nunca acontece em uso normal, pois a rota raiz sempre conta; mas se acontecer: PageTabs não renderiza nada).
- **single-tab** — `tabs.length === 1`: PageTabs **não renderiza** (sem barra desktop, sem chip mobile). Reduz ruído visual quando só há uma página aberta.
- **multi-tab** — `tabs.length >= 2`: renderiza barra (desktop) ou chip + sheet (mobile).
- **at-limit** — `tabs.length === maxTabs`: tentar abrir nova dispara toast warning; barra/sheet ficam visualmente normais (limite não é visualmente sinalizado).
- **tab-active** — aba atualmente em foco; conteúdo renderizado; outras abas mantêm estado mas com `display: none` ou similar (preservação de estado de DOM).
- **tab-dirty** — aba com mudanças não salvas; bullet `•` no label; fechar pede confirmação via Dialog (desktop) / Drawer (mobile).
- **tab-loading** — aba recém-aberta, conteúdo carregando: spinner inline no label substitui ícone (se houver).
- **tab-error** — aba cuja carga falhou: ícone `Warning` no label + cor `text-x-error`; tap reabre/tenta novamente.

## Preservação de estado

Mesma semântica do legado: abas inativas **continuam montadas** no DOM, apenas escondidas (`hidden` / `d-none` no legado). Isso preserva:

- Scroll position
- Estado de filtros e ordenação em grids
- Estado de forms parcialmente preenchidos
- Estado de wizards em meio-passo

**Custo**: memória cresce com número de abas. Limite de 10 (desktop) / 15 (mobile) é precaução. Abas muito antigas (não-tocadas há > N minutos)? — **não** descartar automaticamente; usuário decide quando fechar.

Implementação: a página em si decide se preserva via `<KeepAlive>` ou padrão similar; o sistema de abas só orquestra visibilidade. Detalhe técnico fora desta spec.

## Persistência entre sessões

- **Desktop**: lista de abas abertas persiste em `localStorage:director-studio:tabs:{userId}:{appKey}`. Ao retornar à app, abas anteriores são restauradas (carregamento sob demanda — aba é "reaberta" só quando ativada).
- **Mobile**: mesma chave, mesmo comportamento. Recent stack é restaurada.
- **Logout**: persistência é limpa junto com sessão.
- **Sobrescrita de schema do localStorage**: versionar a chave (`:v1`) para invalidar em mudanças incompatíveis.

## Motion

- **Abrir nova aba**: 
  - Desktop: aba entra com `width: 0 → auto` (200ms `ease-out`) + fade-in.
  - Mobile: nenhuma motion na barra (não existe); chip atualiza contagem com pulse leve.
- **Fechar aba**:
  - Desktop: aba sai com `width: auto → 0` (150ms `ease-in`) + fade-out; abas vizinhas deslizam pra preencher.
  - Mobile: linha do sheet faz fade+slide-out 150ms.
- **Trocar aba ativa**:
  - Desktop: estilo da aba transita em 100ms; conteúdo cross-fade 150ms.
  - Mobile: sheet fecha (Vaul spring); conteúdo cross-fade 150ms.
- **Drag-reorder (desktop)**: ghost element segue cursor; vizinhos shift com transição 150ms `ease-out`.
- `prefers-reduced-motion`: tudo cai para fade simples 80ms.

## Responsivo

- **mobile (< 768px)**: Recent Stack via bottom-sheet. Sem barra horizontal.
- **tablet (768px+)**: barra horizontal desktop. (Tablet em retrato 768–1024px pode ter abas mais comprimidas com `max-w-[120px]` no label.)
- **desktop (≥ 1024px)**: barra completa; labels podem ir até `max-w-[200px]`.
- **gestos mobile**:
  - Swipe-left numa linha do sheet revela botão `Fechar` (alternativa ao `×` explícito).
  - Long-press numa linha: context-menu com `Fechar`, `Fechar outras`, `Fechar todas à direita`.

## Acessibilidade

- Desktop:
  - `<nav aria-label="Páginas abertas">` envolvendo a barra.
  - Cada aba: `<button role="tab" aria-selected={isActive} aria-controls="...">` + label.
  - Botão close: `<button aria-label="Fechar aba {label}">`.
  - Navegação por teclado: `←/→` move entre abas; `Enter` ativa; `Ctrl+W` fecha aba ativa; `Ctrl+Tab` cicla.
- Mobile:
  - Chip: `<button aria-label="Páginas abertas ({count})">`.
  - Bottom-sheet: `<Drawer>` do shadcn — focus trap, Escape fecha.
  - Cada linha: `<button>` com `aria-label="Abrir {label}, {breadcrumb}"`.
- Indicador dirty: ícone tem `aria-label="Mudanças não salvas"`.
- Confirmação de fechar aba dirty: Dialog (desktop) / Drawer (mobile) com texto claro e ações `Salvar e fechar`, `Descartar e fechar`, `Cancelar`.

## Composição

- **Compõe**: [[button]] (size=icon para `×`), ícone Phosphor `Stack` (mobile chip), `Drawer` shadcn (Vaul) no mobile, `Dialog` shadcn (confirmação dirty).
- **É composto por**: [[app-shell]] (renderiza entre header e Outlet quando há tabs).
- **Coordena com**: [[app-header]] (chip mobile é renderizado dentro do header).

## Cores e tokens

- `bg-muted`, `text-muted-foreground` — aba inativa.
- `bg-background`, `text-foreground` — aba ativa (cor do conteúdo abaixo, ancorando visualmente).
- `border-border` — borda das abas ativas e divisor abaixo da barra.
- `hover:bg-muted/70` — hover em aba inativa.
- `text-x-error` — aba em estado erro.
- `text-x-warning` — bullet de dirty (ou `text-primary`, decisão de uso: `text-primary` é mais neutro e não alarmista).
- `ring`, `ring-offset-background` — focus.
- `bg-gradient-to-r from-background` — gradients indicando overflow na barra desktop.

Nunca cor direta. Ver [[semantic-colors]].

## Notas derivadas do contrato legado

Do [[app-main]] (`AppMainTabs` + `useNavigation`):

- **Limite de 10 abas**: mantido. Warning toast (`useNotifications.warning`) no overflow.
- **Reuso de aba já aberta**: mantido — navegar para `/empresas` quando já existe aba `/empresas` reativa em vez de criar duplicata.
- **Política de close**: `fechar aba ativa → ativa a aba imediatamente anterior; fechar aba inativa → mantém ativa atual`. Mantido.
- **Aba `/` (home) não-fechável**: mantido. Sem `×`.
- **Persistência em `localStorage` (`@director/tabs`)**: mantida no Studio, com chave versionada e escopada por usuário+appKey.
- **Conteúdo persistente entre trocas (DOM oculto, não desmontado)**: mantido. É o que viabiliza o modelo de trabalho.

## Sinalizações ao curator

Componentes derivados que **podem virar features** próprias se a complexidade justificar (não nesta wave):

- **`recent-stack-sheet`** (bottom-sheet de páginas abertas no mobile): hoje é parte interna do `page-tabs`. Se for reusado em outros contextos (e.g. histórico de navegação), promover.
- **`tab-context-menu`** (context-menu/long-press em abas): pode derivar para componente reutilizável de menu contextual em listas.
- **`dirty-confirm-dialog`** (confirmação de fechar com mudanças não salvas): padrão reutilizável; vira componente próprio quando for usado fora de tabs (e.g. ao sair de form).

## Sources

- [[calendar/notes/2026-05-15.md]]
- [[app-main]] — `AppMainTabs`, `useNavigation`, regra das 10 abas
