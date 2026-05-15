---
title: "App Header"
aliases: [app-header, header, breadcrumb-bar, top-bar]
tags: [ui-system, component, navigation, shell, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# App Header

Barra fixa no topo do [[app-shell]]. Carrega **três responsabilidades**: localização (breadcrumbs/título), ações globais (busca, notificações), e — no desktop — controle da sidebar. Presente em mobile e desktop, com adaptação significativa em cada modo.

O header é **stateless quanto a dados**: recebe `breadcrumbs`, `pageTitle`, `notifications` e callbacks. Não conhece rotas, não consulta backend.

## Quando usar

- Sempre dentro do [[app-shell]]. Toda rota autenticada tem header.
- Em rotas naked (login, setup, embed): **não** usar — essas rotas não vivem no shell.

## Quando NÃO usar

- Como barra de ação interna de uma página (use toolbar local, fora do escopo desta wave).
- Como container de filtros de página (use [[page-tabs]] ou painel de filtros próprio da página).

## Anatomia

### Desktop (≥ 768px)

```
┌─────────────────────────────────────────────────────────────────┐
│ [≡] Início / Cadastros / Empresas    [🔍 Buscar...] [🔔] [👤] │  h-14
└─────────────────────────────────────────────────────────────────┘
  └ toggle    └ breadcrumbs            └ ações globais          
    sidebar     clicáveis              busca/notif/avatar
```

| Área | Conteúdo | Comportamento |
|---|---|---|
| Esquerda | Botão `≡` (List) | Toggle [[sidebar]] entre `expanded` e `rail`. |
| Centro | Breadcrumbs (`Início / Cad / Empresas`) | Cada nível intermediário clicável; último nível em `font-medium` (não-clicável). Separador: `/` em `text-muted-foreground`. |
| Direita | Busca (`Input w-48 h-8`), [[notification-panel]] (popover trigger), [[avatar-menu]]? | Busca sempre visível; notificações abrem popover; avatar **opcional aqui** — default vive na sidebar; quando sidebar em modo `rail` muito estreita, pode aparecer no header (decisão de design pendente, default = sidebar). |

### Mobile (< 768px) — modo normal

```
┌─────────────────────────────────────────────────────┐
│ [←]      Empresas        [🔍] [🔔]                  │  h-14, sticky
└─────────────────────────────────────────────────────┘
```

| Área | Conteúdo | Comportamento |
|---|---|---|
| Esquerda | Botão `CaretLeft` 44×44 | Navega para **rota pai** (último breadcrumb antes do atual), não `history.back()`. Oculto na rota raiz. |
| Centro | `pageTitle` (último breadcrumb) | Truncado com `…` se exceder; tap **não** expande — apenas leitura. |
| Direita | Botão `MagnifyingGlass` 44×44 + [[notification-panel]] (drawer trigger) | Busca expansível; notificações abrem drawer mobile. |

### Mobile — modo busca ativa

```
┌─────────────────────────────────────────────────────┐
│ [←]  [🔍 Buscar empresas...                  ][×]   │  h-14
└─────────────────────────────────────────────────────┘
```

- Input substitui o título; `autoFocus`.
- `CaretLeft` agora **fecha a busca** (volta ao modo normal), não navega.
- `[×]` no input limpa o texto.
- Notificações some (sem espaço); reaparece ao fechar busca.

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `breadcrumbs` | array `{ label, route, isLast? }` | `[{ label: "Início", route: "/" }]` | Desktop: render completo. Mobile: usa só o último em `pageTitle`. |
| `pageTitle` | string | derivado do último breadcrumb | Header mobile. |
| `canGoBack` | boolean | `breadcrumbs.length > 1` | Habilita botão voltar no mobile. |
| `onBack` | callback | navega para `parentRoute = breadcrumbs[length-2].route` | Permite override. |
| `onToggleSidebar` | callback | — | Desktop: alterna sidebar. |
| `searchEnabled` | boolean | `true` | Habilita campo de busca. |
| `onSearchSubmit(query)` | callback | — | Dispara busca global (escopo: page-level ou app-wide — F? a definir). |
| `notifications` | array \| undefined | `[]` | Passa para [[notification-panel]]. `undefined` esconde o sino. |
| `onNavigate(route)` | callback | — | Click em breadcrumb. |

## Estados

- **default** — header em estado normal.
- **scroll-elevated** — quando o conteúdo abaixo rolou, header ganha `shadow-sm` discreto para flutuar. Transição em 150ms.
- **search-active** (mobile) — input substitui título; estado em URL via `?search=...` para preservar.
- **search-active** (desktop) — input expande de `w-48` para `w-64` no foco (animação 150ms).
- **back-disabled** (mobile) — quando `canGoBack=false` (rota raiz), botão voltar oculto e título centralizado por inteiro.
- **notifications-empty** — sino sem badge.
- **notifications-with-badge** — sino com badge `bg-x-error text-white` contendo contagem (até "9+").

## Motion

- **Entrada do header**: fade-in `fast` 150ms no mount do shell (parte da animação de boot do shell).
- **Scroll elevation**: `box-shadow` transition 150ms.
- **Search expand (desktop)**: `width` 150ms `ease-out`.
- **Search swap (mobile)**: title fade-out (100ms) → input fade-in (100ms); sem layout shift (mesmo h-14).
- **Breadcrumb hover (desktop)**: underline aparece em 100ms.
- **Notification badge**: pulse leve quando count incrementa (1 pulso, 600ms total, `scale: 1 → 1.2 → 1`). Respeitar reduced-motion.

## Responsivo

- **mobile (< 640px)**: layout mobile descrito acima; botões com área de toque mínima 44×44.
- **tablet (640–768px)**: ainda no layout mobile (breakpoint canônico 768px).
- **desktop (≥ 768px)**: layout desktop com breadcrumbs. Em viewports estreitos onde breadcrumbs ficam grandes, mostrar apenas últimos 2 níveis com `…` à frente (e.g. `… / Cadastros / Empresas`); breadcrumbs intermediários acessíveis via tooltip ou popover (opt-in).
- **viewports muito largos (> 1440px)**: header não estica; conteúdo do header respira lateralmente, mas componentes mantêm largura intrínseca.

## Acessibilidade

- `<header role="banner">` no root.
- Breadcrumbs em `<nav aria-label="Trilha de navegação">` com `<ol>` de links.
- Último breadcrumb: `aria-current="page"`.
- Botão voltar mobile: `aria-label="Voltar para {parentLabel}"` dinâmico.
- Botão toggle sidebar: `aria-label="Recolher navegação"` / `"Expandir navegação"` conforme estado.
- Input de busca: `aria-label="Buscar"` + placeholder.
- Sino de notificações: `aria-label="Notificações ({count} não lidas)"`.
- Avatar (se no header): segue regras de [[avatar-menu]].
- Foco visível em todos os interativos.
- `Esc` no input de busca: limpa e desfoca (mobile: também fecha modo busca).

## Composição

- **Compõe**: [[notification-panel]], [[avatar-menu]] (opcional), [[button]] (size=icon), input de busca (shadcn Input).
- **É composto por**: [[app-shell]].
- **Ícones (Phosphor)**: `List` (toggle sidebar), `CaretLeft` (voltar), `MagnifyingGlass` (busca), `Bell` (notificações), `X` (limpar busca).

## Cores e tokens

- `bg-background` ou `bg-card` — fundo do header (decisão: `bg-background` com `border-b border-border` para não pesar). 
- `border-b border-border` — separador inferior.
- `text-foreground` — breadcrumb ativo / título mobile.
- `text-muted-foreground` — breadcrumbs intermediários, separador `/`.
- `hover:text-foreground` — hover em breadcrumb intermediário.
- `bg-x-error text-white` — badge de contagem de notificações (uso de token semântico vermelho).
- `ring` — focus.
- `shadow-sm` — estado scroll-elevated.

Nunca cor direta. Ver [[semantic-colors]].

## Notas derivadas do contrato legado

Do [[app-main]] (`AppHeader`):

- **`AppMenu` (switcher de apps Processa) removido**: Studio é app única; slot mental reservado.
- **Avatar default no header → migrado para sidebar**: avatar vive na sidebar (avatar-menu); header só tem se houver decisão de UX específica.
- **Brand do header mobile (`c-header-brand mx-auto`)**: substituído pelo `pageTitle` — mais útil ao usuário do que repetir brand em toda tela. Brand fica na sidebar (drawer mobile).
- **Sem breadcrumbs no legado**: novo no Studio. Cada rota declara seu `breadcrumb` via `staticData`; shell constrói a trilha a partir dos `useMatches()`.

## Sources

- [[calendar/notes/2026-05-15.md]]
- [[app-main]] — comportamento legado do `AppHeader`
