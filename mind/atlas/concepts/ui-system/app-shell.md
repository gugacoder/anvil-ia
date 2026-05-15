---
title: "App Shell"
aliases: [app-shell, shell, app-layout, scaffold-shell]
tags: [ui-system, component, layout, shell, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# App Shell

Camada de cromos que envolve **toda a área autenticada** do Director.Studio. Hospeda navegação primária, identidade do usuário, status global, contexto de localização e o slot de conteúdo. Todo conteúdo da aplicação — exceto rotas explicitamente "naked" (login, setup wizard, embeds via `#/dashboard?...`) — renderiza dentro do shell.

O shell é **headless quanto a dados de negócio**: não faz fetch, não conhece schema, não decide ACL. Ele recebe por props/contexto: `user`, `menuRoot`, `activeRoute`, `breadcrumbs`, `pageTitle`, `notifications`, callbacks de navegação e tema. A composição da árvore é responsabilidade da rota raiz (`_shell` no roteador), que injeta o necessário.

O conceito **não é "uma tela responsiva"** — são duas experiências distintas (mobile e desktop) que **compartilham vocabulário, dados e propósito**, não pixels. A transição entre elas é via `useIsMobile()` (breakpoint 768px), embutido no próprio shell (ver skill `app-shell`).

## Quando usar

- Toda rota autenticada do Director.Studio.
- Qualquer página renderizada pelo engine schema-driven (F009): `GenericPages` sempre vive dentro do shell.
- Cadastros administrativos do AppBuilder (F025/F026).

## Quando NÃO usar

- `/login` (F003) — auth roda em layout neutro próprio.
- `/setup` (F001) — wizard de primeira execução.
- Rotas de embed (`#/dashboard?...` no legado): no Studio, equivalente é uma rota `naked` que renderiza `Outlet` direto sob `bg-background` sem header/sidebar — para iframes externos.
- Rotas de callback OAuth/SSO (`/auth/callback?...`).

## Anatomia

### Mobile (< 768px)

```
┌─────────────────────────────────────────┐
│ AppHeader  [<] Título    [Q] [Notif]   │  sticky top, h-14
├─────────────────────────────────────────┤
│                                         │
│   <main>                                │  flex-1, scroll vertical
│     <PageTabs />  (se rota multi-doc)   │
│     <Outlet />                          │
│                                         │
├─────────────────────────────────────────┤
│  [Home] [Cad] [...] [...] [...] | Menu │  ShortcutBar, fixed bottom
└─────────────────────────────────────────┘   safe-area-inset-bottom
```

- **AppHeader** sticky no topo: botão voltar (rota pai, não history.back), título da página, ações (busca expansível, notificações).
- **Conteúdo** ocupa o resto da viewport; rolagem própria. `pb-14` garante que não fique atrás da shortcut bar.
- **ShortcutBar** fixa no bottom com até 5 slots personalizáveis + botão `Menu` que abre `Sidebar` em drawer-up (Vaul).
- **Sidebar** não existe como elemento persistente — vira `Drawer` (Vaul, bottom) acionado pelo botão `Menu`.

### Desktop (≥ 768px)

```
┌──────────┬──────────────────────────────────┐
│ Sidebar  │ AppHeader [≡] Home / Cad / ...  │  h-14 sticky
│ 240/64px ├──────────────────────────────────┤
│  fixed   │                                  │
│          │   <main>                         │
│  Brand   │     <PageTabs /> (se aplicável) │
│  Menu    │     <Outlet />                   │
│  Widgets │                                  │
│  Avatar  │                                  │
│          │                                  │
└──────────┴──────────────────────────────────┘
```

- **Sidebar** lateral fixa à esquerda, larga (240px) ou rail (64px). Persistente, scrollável internamente.
- **AppHeader** sticky com toggle de sidebar à esquerda, breadcrumbs no centro, busca + notificações + avatar à direita.
- **Conteúdo** com `margin-left` igual à largura corrente da sidebar; animado em `200ms ease-in-out` ao colapsar.
- **Sem shortcut bar** — atalhos do mobile, no desktop, viram pinos no avatar menu ou itens fixos da sidebar.

## API conceitual

O shell é um componente único com slots; recebe contexto via props ou React context da rota raiz.

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `user` | objeto `{ name, role, avatarRoute? }` | — | Renderiza no avatar menu (sidebar desktop / menu drawer mobile). |
| `menuRoot` | `MenuContext` (árvore hierárquica) | — | Define a árvore de navegação. Estrutura em [[sidebar]]. F007 popula a partir do ACL. |
| `activeRoute` | string (path) | — | Marca item ativo no menu, sidebar e shortcut bar. |
| `breadcrumbs` | array `{ label, route }` | `[{ label: "Início", route: "/" }]` | Lista para o header desktop. Mobile usa só o último (`pageTitle`). |
| `pageTitle` | string | derivado do último breadcrumb | Texto exibido no header mobile e como `<title>` da aba do navegador. |
| `notifications` | array opcional | `[]` | Conteúdo do [[notification-panel]]. |
| `shortcuts` | array de até 5 `MenuItem` | derivado de `menuRoot.defaultShortcuts` | Atalhos da ShortcutBar mobile. |
| `tabs` | array de abas abertas (`{ path, label, dirty? }`) | `[]` | Se presente e não-vazio, renderiza [[page-tabs]] entre header e conteúdo. |
| `theme` | `light` \| `dark` \| `auto` | `auto` | F006. |
| `onNavigate(path)` | callback | — | Centraliza navegação; rota raiz decide se faz `router.navigate`. |
| `onLogout` | callback | — | Default: limpa sessão + redireciona pra `/login`. |
| `canGoBack` | boolean | `breadcrumbs.length > 1` | Habilita botão voltar no header mobile. |
| `children` | slot | — | Renderiza `<Outlet />` (ou conteúdo da rota). |

## Estados

- **default** — sidebar expandida (desktop) ou shortcut bar visível (mobile); conteúdo carregado.
- **sidebar-collapsed** (desktop) — sidebar em modo rail (64px, ícones + tooltip). Estado persistido em `localStorage:director-studio:sidebar-collapsed`.
- **menu-open** (mobile) — drawer-up aberto sobre o conteúdo; backdrop com `bg-foreground/40 backdrop-blur-sm`; scroll do body travado. Estado em URL via `?menu=true` (preserva F5, voltar fecha).
- **loading-shell** — boot inicial do shell (carregando ACL para popular menu). Renderiza skeleton de sidebar + header; conteúdo principal em [[loading-state]]. Curto (< 500ms típico).
- **offline / hub-degraded** — banner discreto sob o header (variante `warning` de [[inline-alert]]) quando F023 (SSE) detecta queda. Não trava o shell.
- **search-active** (mobile) — input toma o lugar do título no header; backdrop ativa overlay leve sobre conteúdo.
- **page-blocked** — overlay full-screen (substituto do `PageBlur` legado) bloqueando interação durante operações longas. Usa [[loading-state]] em modo `overlay`. Controlado imperativamente via hook `useBlocking()` exposto pelo shell.

## Motion

- **boot do shell**: fade-in normal (250ms) do header + slide-in da sidebar da esquerda (250ms, easing `ease-out`). Mobile: fade-in do header + slide-up da shortcut bar (250ms).
- **toggle sidebar (desktop)**: `width` animado 240↔64 em 200ms `ease-in-out`; conteúdo acompanha via `margin-left` no mesmo timing.
- **abrir/fechar menu (mobile)**: drawer-up via Vaul (spring nativo); backdrop fade 200ms.
- **trocar de rota**: fade `fast` 150ms no conteúdo (entrada do novo `Outlet`). Header e sidebar permanecem.
- **abas (PageTabs)** entram/saem com fade 150ms; ver [[page-tabs]].
- `prefers-reduced-motion`: substitui todas as transições por fade simples 100ms; cancela `scale` e `slide`.

## Responsivo

- **mobile (< 640px)**: sidebar inexistente como persistente; entra via drawer (Vaul). Shortcut bar é a navegação primária. Header com botão voltar + título + ações compactas.
- **tablet (640–1024px)**: ainda em modo "mobile shell" até 768px (breakpoint canônico). Acima de 768px assume modo desktop: sidebar persistente (pode iniciar colapsada para acomodar viewports estreitos).
- **desktop (> 1024px)**: sidebar expandida por default; toggle disponível. Header com breadcrumbs completos.
- **ultra-wide (> 1440px)**: o shell **não estica indefinidamente**. Conteúdo recebe respiro lateral (controlado por cada página, não pelo shell). Sidebar mantém 240px.
- **thumb zone**: no mobile, ações primárias da página devem ficar no terço inferior; shortcut bar e o botão `Menu` ficam no bottom natural do polegar.

## Acessibilidade

- `<header role="banner">` no AppHeader.
- `<nav aria-label="Navegação principal">` na Sidebar e no AppMenu (mobile drawer).
- `<main id="main-content">` no slot de conteúdo; skip-link `<a href="#main-content">Pular para o conteúdo</a>` no topo (visível só com foco por teclado).
- Drawer mobile (`menu-open`): focus trap dentro do drawer; Escape fecha; Tab/Shift+Tab circula só nos itens do menu.
- Sidebar colapsada (rail): cada item com `<Tooltip>` no hover/focus + `aria-label` para leitor.
- Botão voltar mobile: `aria-label="Voltar para {nome-da-rota-pai}"` dinâmico.
- Contraste mínimo WCAG AA em todos os textos, inclusive em sidebar colapsada.
- Atalhos de teclado documentados (e.g. `D` para alternar tema, F006). Reservar `Ctrl/Cmd+K` para command palette (futuro, fora desta wave; deixar slot mental).
- `useIsMobile()` deve respeitar `matchMedia` real, não user-agent sniffing.

## Composição

- **Compõe**: [[sidebar]], [[app-header]], [[page-tabs]], [[shortcut-bar]] (mobile), [[notification-panel]], [[avatar-menu]], [[loading-state]], [[inline-alert]] (banners de status).
- **É composto por**: a rota raiz `_shell` do roteador do app. Toda rota autenticada do Studio.

## Slots/Composição interna

| Slot | Posição | Mobile | Desktop |
|---|---|---|---|
| `header` | topo, sticky | [[app-header]] mobile | [[app-header]] desktop |
| `sidebar` | esquerda, fixa | — (vira drawer via `Menu`) | [[sidebar]] persistente |
| `tabs` | abaixo do header (opcional) | [[page-tabs]] mobile | [[page-tabs]] desktop |
| `main` | centro, flex-1 | `<Outlet />` | `<Outlet />` |
| `shortcut-bar` | bottom, fixa | [[shortcut-bar]] | — |
| `footer` | bottom do `main` | — (substituído pela shortcut-bar) | rodapé fininho opcional com versão do backend |
| `blocking-overlay` | full-screen, z-50 | [[loading-state]] overlay | [[loading-state]] overlay |
| `toasts` | top-right (desktop) / top-center (mobile) | [[toast]] (F020) | [[toast]] (F020) |

## Cores e tokens

- `bg-background`, `text-foreground` — área de conteúdo.
- `bg-sidebar`, `text-sidebar-foreground` — sidebar.
- `bg-sidebar-accent`, `text-sidebar-accent-foreground` — item ativo na sidebar.
- `bg-card`, `border-border` — header (sutil contraste com `bg-background`).
- `border-border` — divisores entre regiões (header/conteúdo, sidebar/conteúdo).
- `bg-foreground/40 backdrop-blur-sm` — backdrop do drawer mobile e do blocking overlay.
- `ring`, `ring-offset-background` — focus.

Nunca cor direta. Ver [[semantic-colors]].

## Notas derivadas do contrato legado

O legado ([[app-main]]) tem comportamentos que **não** são portados como estão:

- **Sem multi-aba como núcleo** no Studio mobile: o modelo "10 abas simultâneas com estado preservado" do legado (`useTabs`) é desktop-only. Ver [[page-tabs]] para o redesign mobile.
- **Sem `AppMenu` (switcher de apps Processa)**: o Director.Studio é app única; switcher entre apps Processa não existe nesta versão. Slot reservado caso retorne futuramente — viraria item no avatar menu, não cromo permanente do header.
- **`PageBlur` imperativo via DOM** vira hook `useBlocking()` declarativo no shell, com `<BlockingOverlay />` montado uma vez no nível do shell.
- **Bypass `#/dashboard?` para embeds**: no Studio, equivale a uma rota `naked` (`/embed/dashboard/$id`) que NÃO renderiza shell. Decisão do roteador, não do shell.
- **Boot do ACL com PageBlur**: substituído por `loading-shell` state com skeleton.
- **Storage de tabs em `localStorage`**: ver [[page-tabs]] — Studio mantém persistência mas com escopo por usuário+app.

## Sources

- [[calendar/notes/2026-05-15.md]]
- [[app-main]] — contrato do shell legado
