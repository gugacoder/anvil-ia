---
title: "AppMain (shell do AppBuilder legado)"
aliases: [app-main, appmain-shell, react-tools-appmain]
tags: [contract, legacy, shell, react-tools, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: AppMain

`AppMain` é o **componente-raiz da aplicação autenticada** do `react-tools` (biblioteca consumida pelo Director, AppBuilder e demais portais da Processa). Ele é o **shell**: monta sidebar + header + área de conteúdo + footer; faz boot da sessão; busca ACL; popula a navegação; e despacha o conteúdo principal (seja por **abas** ou **full-page**) para `GenericPages` (que por sua vez consome `acesso.obter_model_pagina` e é coberto por F009).

Toda página do produto vive **dentro** de `AppMain`. Quando `authState.token` está ausente, ele degrada para `<Login />` (F003). Quando presente, ele orquestra: ACL → rotas → abas → render do conteúdo.

## Citações de fonte

- `sources/engenharia--fabrica--javascript--react-tools/src/components/AppMain/AppMain.js:32-196` — componente principal.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/AppMain/AppHeader.js:11-78` — barra de topo (toggler da sidebar, avatar, logout, menu de aplicações).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/AppMain/AppSidebar.js:7-114` — sidebar com menu hierárquico dirigido pelo ACL.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/AppMain/AppMainTabs.js:4-43` — barra de abas (multi-doc interface) no modo `useTabs`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/AppMenu/AppMenu.js:4-71` — switcher de aplicações Processa no header.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PageBlur/PageBlur.js:3-54` — overlay de blocking/loading global.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Footer.js:3-42` — rodapé com versão do backend (`/api/versao`).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useSidebar.js:7-78` — estado e toggles da sidebar (responsivo).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useNavigation.js:16-149` — abas, rota atual, abrir/fechar, scroll.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:7-172` — fetch + persistência + flatten da ACL (menu).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useBlur.js:3-64` — controle imperativo do `PageBlur`.
- `sources/engenharia--fabrica--javascript--react-tools/src/contexts/AuthProvider.js:54-75` — fluxo de logout que limpa storages e redireciona pro Portal.

## Estrutura

### Props de `AppMain`

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `useSidebar` | bool | não (default `true`) | Renderiza a sidebar | `true`/`false` | Quando `false` (e `useTabs=false`), shell vira só header+conteúdo+footer | prop do app consumidor |
| `useAuthRoute` | bool | não (default `false`) | Habilita rota especial `#/auth?...` (callback OAuth/SSO) e exibe tela "Falha na autenticação" caso usuário esteja ausente em vez de logar | `true`/`false` | Muda fallback quando `authState.user` é null | prop |
| `useTabs` | bool | não (default `true`) | Liga o **modo multi-aba** (cada rota navegada vira uma aba; máx 10) | `true`/`false` | Se `false`, o shell renderiza `fullPageLayout()` (uma página por vez) | prop |
| `useDomain` | bool | não (default `false`) | Propagado para `<Login useDomain>` (F003, caminho com seleção de domínio) | `true`/`false` | Afeta tela de login | prop |
| `children` | element | não | Slot extra renderizado **dentro** do `c-app` mas fora do `c-wrapper` (útil para portais/toasts globais montados pelo consumidor) | qualquer JSX | Renderizado por último | prop |
| `aclSetup` | string \| `{ proc, customMapper }` | não | Procedure de ACL a chamar no boot. Forma string = só o nome da proc; forma objeto permite mapper customizado das `modulos[].paginas[]` | nome de proc do backend | Dispara `fetchAclAndPersist` que persiste em `sessionStorage['@director/acl']` | prop |
| `CustomHeader` | function (component) | não | Header customizado em lugar de `AppHeader` | componente React | Recebe `{title, dropdownList, handleShowSideBar}` | prop |
| `routes` | array de `{ path, component, ... }` | não (default `[]`) | Lista de **rotas com componente customizado** (não vindas do `GenericPages`). São merged no flatList do ACL via `path` | objetos com `path` string | Permite ao consumidor injetar telas custom no menu | prop |
| `doOnAuthSuccess` | function | não | Callback disparado **uma vez** após `authState.token` aparecer | `(authState) => void` | Pós-login hook | prop |
| `doOnLogout` | function | não | Override do logout default (que limpa storages e redireciona pro Portal) | `() => void` | Logout customizado | prop |

### Estado interno

| Estado | Origem | Semântica |
|---|---|---|
| `appConfigs` | `sessionStorage['@director/appconfigs']` lido após login | Configurações da aplicação atual (vide tabela abaixo) |
| `sidebarClass` | `useSidebar` hook | Classe CSS controlando visibilidade responsiva da sidebar (`c-sidebar-lg-show`, `c-sidebar-show`, ou vazio) |
| `sidebarMinimized` | `useSidebar` hook | Modo "rail" (sidebar colapsada para só ícones) |
| `dropdownVisibility` | `useSidebar` hook | Mapa `{ [index]: 'c-show' \| '' }` controlando qual grupo da sidebar está expandido. **Comportamento mutuamente exclusivo**: abrir um fecha os outros |
| `tabs` | `GenericPagesContext` via `useNavigation` | Lista de abas abertas (cada aba é uma rota com `active`/`visible`) |
| `currentRoute` | `GenericPagesContext` via `useNavigation` | Rota atualmente ativa (usada em `fullPageLayout`) |
| `routes` | `GenericPagesContext` via `useNavigation` | Flat list de rotas vindas do ACL + props.routes; cada uma vira potencial aba |

### `appConfigs` (lido de `sessionStorage['@director/appconfigs']`)

| Item | Tipo | Obrigatório | Semântica | Vem de |
|---|---|---|---|---|
| `appKey` | string | sim | Identificador da aplicação atual (usado em chamadas a `GenericPages api='/model'`) | Setado pelo Portal Director no redirect pós-login |
| `headerTitle` | string | não | Texto exibido como `c-header-brand` em telas pequenas | Portal |
| `sideBarBrand` | string | não | Brand/título completo da sidebar (modo expandido) | Portal |
| `sideBarBrandMinimized` | string | não | Brand reduzido (modo minimizado/rail). Fallback: `sideBarBrand` | Portal |
| `urlPortalDirector` | string (URL) | sim para multi-app | URL do Portal Director — usada por logout (redirect) e `AppMenu` (deep-link entre aplicações via `#/redirect?appkey=...`) | Portal |

### Storages observados

| Chave | Storage | Escritor | Leitor | Conteúdo |
|---|---|---|---|---|
| `@director/appconfigs` | sessionStorage | Portal Director (no redirect) | AppMain, AppMenu | Configurações da app (acima) |
| `@director/acl` | sessionStorage | `useAcl.fetchAclAndPersist` | AppSidebar, useNavigation, useAcl | Árvore ACL: `[{ name, to, icon, children: { route: [...] } }]` |
| `@director/appmenu` | sessionStorage | Portal Director | AppMenu | Lista de apps Processa para o switcher do header |
| `@director/userguid` | sessionStorage | AuthProvider | AuthProvider | GUID da sessão; limpo no logout |
| `@director/usr` | localStorage | AuthProvider | AuthProvider | Sessão persistida quando "lembrar de mim" |
| `@director/tabs` | localStorage | (legado, limpo no logout) | — | Estado persistido das abas |
| `@director/configs` | localStorage | (legado, limpo no logout) | — | Preferências |

## Sub-componentes

### `AppHeader` (`AppMain/AppHeader.js`)

Barra de topo fixa (`c-header c-header-fixed`). Composição:

| Slot | Renderiza | Condições |
|---|---|---|
| Toggler mobile | Botão hamburguer (`c-header-toggler ml-md-3 d-lg-none`) | Visível < lg |
| Toggler desktop | Botão hamburguer (`c-header-toggler ml-3 d-md-down-none`) | Visível >= md |
| Brand mobile | `<span class="c-header-brand mx-auto d-lg-none">{title}</span>` | Só < lg |
| Avatar/usuário | `DropdownComponent` com nome `authState.user.usuario`, ícone `cil-user`, header "Opções"; item "Sair" chama `handleLogout({doOnLogout})` | Só se logado |
| `AppMenu` | Switcher entre aplicações Processa (grid 3x3 de ícones) | Só se `@director/appmenu` tem itens |

Props consumidas: `title`, `dropdownList` (sempre `[]` no uso interno — extensível), `handleShowSideBar`, `doOnLogout`.

### `AppSidebar` (`AppMain/AppSidebar.js`)

Lê `@director/acl` direto do `sessionStorage` (não via context) e renderiza menu hierárquico:

| Tipo de item ACL | Estrutura | Render |
|---|---|---|
| `to === '/'` | — | **Pulado** (não vira item da sidebar; é a home, acessível por outros caminhos) |
| `item.children` presente | grupo expansível | `<li class="c-sidebar-nav-dropdown">` com toggle; expande mostrando `children.route[]` |
| sem `children` | item folha | `<li class="c-sidebar-nav-dropdown c-show">` com link direto |

Comportamentos:

- **Click no brand** → navega para `/` (home).
- **Click em item folha** → `handleSideNavClick(to)` → navega + fecha backdrop mobile.
- **Click em grupo** → expande/colapsa (`handleDropdownVisibility`); abrir um grupo **fecha** todos os outros (estado é objeto com chave única).
- **Ícones**: vêm de `acl.icon` (default `cil cil-file`); normalizados por `useUtils.getIconName`.
- **Modo minimizado**: classe `c-sidebar-minimized`; dropdowns ficam desabilitados (early return em `handleDropdownVisibility`).

### `AppMainTabs` (`AppMain/AppMainTabs.js`)

Barra de abas (`<ul id="app-main-tabs" class="nav nav-tabs">`):

- Cada aba é um item de `tabs` (vindo de `useNavigation`).
- Clique no label → `navigateTo(t.path)` ativa a aba.
- Botão `×` fecha a aba via `handleClose` — **exceto** na aba `/` (home, não-fechável).
- Aba ativa: `active tab-active` + `font-weight-bold`.
- Overflow horizontal (`overflowX: auto`) — abas excedentes scrollam, não quebram linha.

Regras de gestão (em `useNavigation`):

- **Limite de 10 abas**. Tentar abrir a 11ª: warning toast `Feche uma das abas abertas...`, mantém a última ativa.
- **Reuso**: navegar para path já aberto reativa a aba existente, não cria nova.
- **Política de close**: fechar aba ativa → ativa a aba imediatamente anterior (índice -1); fechar aba inativa → mantém ativa atual; fechando última → array vazio.

### `Footer` (`components/Footer.js`)

Faixa fixa no rodapé:

- "**Director**GE © {ano atual} Processa Sistemas" (esquerda)
- "Versão **{info.versao}**" (direita), com `info` vindo de `GET /api/versao`.

Em caso de erro de rede, fallback `{ versao: '1.0.0' }`.

### `PageBlur` (`components/PageBlur/PageBlur.js`)

Overlay full-screen `position: fixed; zIndex: 10000`, fundo preto 75% opaco, com spinner CSS (`lds-spinner`) e mensagem "Aguarde..." opcional via `#load-progress-span`. Controlado **imperativamente** por `useBlur.setPageBlur(true|false)` que manipula DOM diretamente (`getElementById`).

Usado por `AppMain` durante o boot da ACL (blur ON → fetch ACL → blur OFF) e por qualquer chamada longa do produto.

### `AppMenu` (`components/AppMenu/AppMenu.js`)

Switcher de aplicações Processa. Lê `@director/appmenu` (lista de apps com `appKey`, `title`, `icon`). Clicar redireciona para `${urlPortalDirector}/#/redirect?appkey=${app.appKey}` — o portal central recebe, valida sessão, redireciona pra app destino. Layout fixo: grid 3x3 (100x100 cada slot), dropdown via `:focus-within`.

## Ciclo de vida (boot)

```
mount AppMain
   |
   v
authState.token presente?
   |        |
   não      sim
   |        |
   v        v
<Login/>  PageBlur ON
          |
          v
          ler @director/appconfigs → setAppConfigs
          |
          v
          aclSetup definido?
              |        |
              sim      não
              |        |
              v        v
              POST(proc, appConfigs, token)
                  → @director/acl persistido em sessionStorage
              |
              v
          setupNavigation(routes):
            - readAclAsFlatlist() → flat list de rotas
            - merge com `routes` prop (matching por path → injeta `component`)
            - setRoutes(flatList)
            - setCurrentRoute(flatList[0])
            - navigateTo('/') (via setNavigateToHome → effect)
          |
          v
          PageBlur OFF
          |
          v
          doOnAuthSuccess(authState)
          |
          v
          render shell:
            Sidebar (se useSidebar || useTabs)
            AppHeader (ou CustomHeader)
            c-body:
              useTabs ? <AppMainTabs/> + tabs.map(...) : <fullPageLayout/>
            Footer
            children (slot extra)
```

## Modos especiais de roteamento

| Hash | Comportamento | Onde |
|---|---|---|
| `#/dashboard?...` | **Bypassa** todo o shell. Renderiza só `<DashBoardPage/>` dentro de `c-app > c-wrapper > c-body`. Sem sidebar, sem header, sem footer | `AppMain.js:71-81` |
| `#/auth?...` | Quando `useAuthRoute=true`: renderiza `<AuthRoute/>` (callback de OAuth/SSO) | `AppMain.js:84-85` |
| Outras | Fluxo normal (sidebar + header + tabs/page) | — |

## Dispatch do conteúdo principal

Dentro de `c-body`, o conteúdo de cada rota é decidido em ordem:

| Condição | Renderiza |
|---|---|
| `route.component !== null` | `<ComponentPage element={route.component}/>` (componente custom passado via prop `routes`) |
| `route.path === '/'` | `<DashBoardHome/>` |
| `route.path === '/dashboard'` | `<DashBoardCrud/>` |
| caso geral | `<GenericPages api='/model' appKey={...} path={route.path} additionalParams={route}/>` — engine schema-driven (F009) |

Em modo `useTabs`, cada aba aberta tem **seu próprio** componente montado simultaneamente; abas inativas recebem classe `d-none` (continuam montadas, apenas escondidas — preservam estado).

Em modo `fullPageLayout`, só `currentRoute` é montada por vez.

## Comportamento responsivo (observado no legado)

Breakpoint chave: `< 990px` (`isMobileScreen`) — derivado do CoreUI/Bootstrap.

| Aspecto | Desktop (≥ lg) | Mobile (< lg) |
|---|---|---|
| Sidebar | Fixed à esquerda; classe inicial `c-sidebar-lg-show` (visível) | Off-canvas (overlay com backdrop); inicialmente oculta |
| Toggler do header | Botão `d-md-down-none` (visível ≥ md) alterna entre `c-sidebar-lg-show` e vazia (mostra/esconde lateral) | Botão `d-lg-none` cria backdrop + classe `c-sidebar-show` |
| Brand do header | Oculto (`d-lg-none` no `c-header-brand`) — brand vive na sidebar | Visível centralizado |
| Brand da sidebar | `c-sidebar-brand-full` (`d-md-down-none`) ou `c-sidebar-brand-minimized` (modo rail) | (sidebar é off-canvas; brand do header assume) |
| Clique em item da sidebar | Navega; sidebar permanece | Navega + remove backdrop + fecha sidebar |
| Modo "rail" (sidebar minimizada) | Disponível (`c-sidebar-minimized` + `c-sidebar-brand-minimized`); dropdowns desabilitados | n/a |

> inferido (não confirmado em código): Suporte a tablet (md) usa breakpoints CoreUI intermediários — comportamento exato (sidebar fixa vs off-canvas em md) depende do CSS do `@coreui` consumido, fora do escopo do `AppMain.js`.

> TBD designer: o legado não tem **mobile-first**; sidebar mobile é uma adaptação tardia via backdrop manual em JS. A Studio precisa decidir comportamento canônico mobile (drawer, bottom nav, etc.) — não há precedente no legado para copiar.

## Hooks de integração com o ecossistema

| Integração | Onde | Detalhe |
|---|---|---|
| **Auth** (F003/F004) | `AuthContext.authState.token` e `.user` | Gate de shell vs `<Login/>` |
| **ACL** (F008) | `useAcl.fetchAclAndPersist(aclSetup, token, appConfigs)` | POST `aclSetup.proc` (tipicamente `acesso.obter_acl_usuario_aplicacao`) → sessionStorage |
| **Menu/Rotas** (F007) | `useAcl.readAclAsFlatlist` → `useNavigation.setupNavigation` | Menu derivado do ACL; cada `modulos[].paginas[]` vira rota |
| **Render engine** (F009) | `GenericPages` em cada aba/página | Chama `acesso.obter_model_pagina` por path |
| **Notifications** (F020) | `useNotifications.warning` em `useNavigation` | Toast quando rota não encontrada ou limite de abas |
| **Realtime** (F023) | **Não há** ligação direta no AppMain | SignalR é setupado em outro nível (`HubMobileHandler.cs` no .NET, cliente no app). No Studio vira SSE; ponto de montagem do client SSE será no shell — TBD |
| **Backend versão** | `GET /api/versao` (Footer) | Endpoint de healthcheck/versão |
| **Portal cross-app** | `${urlPortalDirector}/#/redirect?appkey=...` | Switcher de apps no header + destino do logout |

## Relações com o ecossistema

- Consome de: [[processa-auth-paths]] (token + user), [[tbmodel-pagina]] (indiretamente via `GenericPages`)
- É consumido por: nenhum contrato — é a raiz; consumido por cada app `.web` que importa `react-tools`
- Procedures relacionadas: `acesso.obter_acl_usuario_aplicacao` (via `aclSetup`), `acesso.obter_rotas_aplicacao` (via flatten do ACL), `acesso.obter_model_pagina` (via `GenericPages`)
- Sub-features deste contrato no manifest: F005 (este shell), F006 (theme — paralelo, não dentro do AppMain legado), F007 (menu/rotas), F008 (ACL), F009 (engine render), F020 (notifications), F023 (realtime)

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- **Multi-aba é central**: o produto inteiro é desenhado em torno de "10 abas abertas simultaneamente, cada uma preservando estado quando inativa". Não é decorativo — é o modelo de trabalho do usuário.
- **Bypass de shell por hash** (`#/dashboard?`) existe no legado para embeds. Cobrir no Studio (cenário: dashboard exibido em iframe externo, sem cromos).
- **ACL é cache de sessão, não estado de runtime**: gravado uma vez em `sessionStorage`, lido por componentes via `JSON.parse` síncrono. Refresh manual exige `sessionStorage.removeItem('@director/acl')` (`fetchAclAndPersist` faz early-return se já existe — comentário no código questiona isso).
- **`PageBlur` é imperativo via DOM**: ponto de fricção do legado; spinner global aplicado por `document.getElementById`. Toda chamada longa quer essa UX.
- **Logout limpa 5 chaves de storage e redireciona** para o Portal Director (`urlPortalDirector`) ou raiz se ausente. Não é só "esquecer token" — é também trocar de aplicação.
- **`AppMenu` (switcher de apps Processa) é parte do shell, não do header customizável**: vive sempre no header, mesmo com `CustomHeader` injetado o consumidor é responsável por replicar essa afetação se quiser.
- **Sem breadcrumbs no legado**: o AppMain não monta breadcrumbs. A "localização" do usuário vem do conjunto sidebar-ativa + aba-ativa + título. Breadcrumbs no Studio são decisão nova — não-derivada.
- **Sem slot dedicado a toasts**: notificações são montadas externamente (provavelmente em `children` ou em provider global do consumidor). O shell não reserva área específica.

## Sources

- [[calendar/notes/2026-05-15.md]]
