---
title: "Menu hierárquico (legado react-tools)"
aliases: [menu-hierarquia, sidebar-menu-legacy, acl-menu-tree]
tags: [contract, legacy, react-tools, menu, sidebar, acl, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: Menu hierárquico do shell legado

Como o shell `AppMain` do `react-tools` monta o **menu de navegação em árvore (módulo → páginas)** a partir do resultset SQL retornado pela proc de ACL configurada em `aclSetup`. O menu vive na `AppSidebar` (lateral) e simultaneamente alimenta o universo de rotas que o `useNavigation` aceita como destino de aba.

Complementa [[app-main]] (shell), [[acesso-obter-rotas-aplicacao]] (proc auxiliar, **não** consumida pelo menu) e a proc canônica do menu real, [[acesso-obter-acl-token]].

## Pipeline em três etapas

```
SQL (acesso.obter_acl_token, retorna XML json-array)
       |
       v
backend .NET → JSON: { acl: { modulos: [ { ..., paginas: [...] } ] } }
       |
       v
useAcl.defaultMapper(dados)    [react-tools/src/hooks/useAcl.js:10-37]
       → list[]                 (formato shell-friendly, gravado em sessionStorage['@director/acl'])
       |
       +--→ AppSidebar          (renderiza árvore na lateral)        [react-tools/src/components/AppMain/AppSidebar.js]
       |
       +--→ useAcl.readAclAsFlatlist  (achata para o universo de rotas/abas)  [useAcl.js:89-125]
              |
              v
            useNavigation.setupNavigation(routes)
              → GenericPagesContext.routes (flat) + currentRoute
```

## Citações de fonte

- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:10-37` — `defaultMapper(dados)`: transforma o JSON do backend no shape consumido pela sidebar.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:89-125` — `readAclAsFlatlist()`: achata a árvore em lista plana de rotas com `id` (uuid v4).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:127-155` — `fetchAclAndPersist(aclSetup, token, appConfigs)`: chama a proc, persiste em `sessionStorage['@director/acl']`; **early-return se já existe** (cache de sessão, não revalida).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:39-56` — `getAclResourceCompanies(path)`: lê `empresas` da página atual (campo opcional na ACL).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/AppMain/AppSidebar.js:9` — leitura síncrona do storage: `JSON.parse(sessionStorage.getItem('@director/acl') ?? '[]')`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/AppMain/AppSidebar.js:39-93` — render da árvore (skip de `/`, dropdown vs leaf).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useSidebar.js:11,20-25` — `dropdownVisibility`: estado em memória, mutuamente exclusivo (objeto com chave única `{ [index]: 'c-show' }`).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useNavigation.js:119-130` — `setupNavigation(routes)`: merge da flat list com prop `routes` (componentes custom) e `setCurrentRoute(flatList[0])`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_acl_token.sql:275-341` — proc canônica que produz o JSON-array com módulos/páginas/funções.

## Shape do JSON vindo do backend (`dados.acl.modulos[]`)

Conforme produzido por `acesso.obter_acl_token` (vide [[acesso-obter-acl-token]]) e roteado pelo `.NET` como JSON:

| Campo | Tipo | Obrigatório | Semântica | Vem de |
|---|---|---|---|---|
| `acl.modulos[]` | array | sim | Lista de módulos visíveis ao usuário na app | proc, `XML PATH('Route'), ROOT('Routes')` (módulos) |
| `acl.modulos[].titulo` | string | sim | Nome do módulo no menu | `acesso.TBmodulo.DFtitulo` |
| `acl.modulos[].caminho` | string | sim (mas frequentemente vazio em módulos só-agrupadores) | "Rota do módulo" — quase sempre não usada no menu (é o grupo, não folha) | `acesso.TBmodulo.DFcaminho` |
| `acl.modulos[].icone` | string | não | Classe CSS de ícone (`cil cil-folder` etc.) | `acesso.TBmodulo.DFicone` |
| `acl.modulos[].id` | int | sim | ID do módulo | `acesso.TBmodulo.DFid_modulo` |
| `acl.modulos[].descricao` | string | não | Descrição (tooltip / aria-label?) | `acesso.TBmodulo.DFdescricao` |
| `acl.modulos[].visible` | bit | não | Flag `DFexibir_menu` — não respeitada pelo mapper atual (vide nota) | `acesso.TBmodulo.DFexibir_menu` |
| `acl.modulos[].key` | string | não | Chave técnica | `acesso.TBmodulo.DFchave` |
| `acl.modulos[].order` | int | não | Ordenação | `acesso.TBmodulo.DFordem` |
| `acl.modulos[].paginas[]` | array | não | Páginas filhas do módulo (pode estar ausente → módulo "folha" ou módulo vazio) | proc, `XML PATH('Route'), ROOT('Children')` |
| `acl.modulos[].paginas[].titulo` | string | sim | Nome da página no menu e na aba | `acesso.TBpagina.DFtitulo` |
| `acl.modulos[].paginas[].caminho` | string | sim | Rota (hash-route, ex: `/wms/pedidos`) — usado como `to` e como chave de tab | `acesso.TBpagina.DFcaminho` |
| `acl.modulos[].paginas[].icone` | string | não | Ícone (override sobre o do módulo) — **não exibido na sidebar legada** (o mapper guarda mas o render só usa ícone de módulo) | `acesso.TBpagina.DFicone` |
| `acl.modulos[].paginas[].id` | int | sim | ID da página | `acesso.TBpagina.DFid_pagina` |
| `acl.modulos[].paginas[].descricao` | string | não | Descrição | `acesso.TBpagina.DFdescricao` |
| `acl.modulos[].paginas[].visible` | bit | não | `DFexibir_menu` — não respeitada pelo mapper | `acesso.TBpagina.DFexibir_menu` |
| `acl.modulos[].paginas[].key` | string | não | Chave técnica (`DFchave_pagina`) | `acesso.TBpagina.DFchave` |
| `acl.modulos[].paginas[].order` | int | não | Ordenação (proc já ordena por isso) | `acesso.TBpagina.DFordem` |
| `acl.modulos[].paginas[].empresas` | string (CSV) | não | Empresas em que o usuário tem acesso àquela página (códigos separados por vírgula). Vazio = "todas / herda do usuário" | computado na proc por subquery (papéis ∪ recursos adicionais) |
| `acl.modulos[].paginas[].funcoes[]` | array | não | Funções (permissões finas) da página acessíveis ao usuário | `acesso.TBfuncao` ∩ vínculo do papel |
| `acl.modulos[].paginas[].funcoes[].id` | int | sim | ID da função | `acesso.TBfuncao.DFid_funcao` |
| `acl.modulos[].paginas[].funcoes[].titulo` | string | sim | Nome | `acesso.TBfuncao.DFtitulo` |
| `acl.modulos[].paginas[].funcoes[].key` | string | não | Chave técnica usada em checks `hasFunction('...')` | `acesso.TBfuncao.DFchave` |

> nota: a proc emite atributos `[@json:Array]='true'` em `Routes`, `Children` e `Funcoes` — convenção do conversor XML→JSON do Newtonsoft no `.NET`. Os nomes finais dos campos JSON dependem do conversor (geralmente `lower-case`/`camelCase` do atributo XML). O `defaultMapper` confirma os nomes efetivos: `titulo`, `caminho`, `icone`, `paginas`.

## Shape gravado em `sessionStorage['@director/acl']` (saída do `defaultMapper`)

Lista de **módulos** transformados para o formato consumido pela sidebar:

```
[
  {
    name: <modulo.titulo>,
    to:   <modulo.caminho>,            // tipicamente '' ou ausente para módulos-grupo
    icon: <modulo.icone> || 'cil cil-file',   // fallback de ícone
    children: { route: [
      {
        icon: <pagina.icone>,
        name: <pagina.titulo>,
        to:   <pagina.caminho>
      },
      ...
    ] }
  },
  ...
]
```

Notas de design da estrutura:

- **`children` é objeto com chave `route`** — não array direto. Provável vestígio de um wrapper XML (`Children > Route[]`); o mapper preserva a forma.
- Módulos **sem páginas** não recebem `children` no resultado do `defaultMapper`. Mas o source atualiza `children = { route: [] }` quando `m.paginas` é falsy (na verdade: o loop `forEach` só corre se `m?.paginas` existir; senão, `children` cai com `route: []` vazio).
- **Campos descartados pelo mapper** (não vão pro storage): `id`, `descricao`, `visible`, `key`, `order`, `empresas` (por aqui — `empresas` é lido depois, direto do JSON; mas no storage o mapper só guarda `icon/name/to`. Há discrepância: `getAclResourceCompanies` espera `aclPage.empresas` no storage — sugere que algum mapper customizado guarda esse campo, OU que o mapper estava diferente em algum momento). > inferido: bug histórico OU dependência de `customMapper`.
- **Funções não vão pro storage** via mapper default. Quem precisa de função consulta de outra forma (TBD: provavelmente `findPageConfig` ou check direto contra a proc).

## Regras de hierarquia (apenas dois níveis)

A árvore do menu tem **profundidade máxima 2**:

1. Raiz: módulo (item da lista top-level do storage).
2. Folha: página (item dentro de `children.route`).

Não há sub-páginas, não há sub-grupos. Sub-menus de terceiro nível **não existem no legado**.

> inferido: se algum produto precisar de 3+ níveis, hoje gambiarra (criar múltiplos módulos com nomes hierárquicos no título, ex: "Estoque › Saídas › Devoluções").

## Identificação de pai/filho

Não há campo de `parentId` nem `path` materializado. A relação é **estrutural** (a página está dentro do array `children.route` do módulo). O `DFid_modulo` da página, presente no banco, **não é projetado** no JSON final consumido pelo shell.

A proc `obter_acl_token` faz o agrupamento no SQL (subquery aninhada filtrando `Pagina.DFid_modulo = Modulo.DFid_modulo`); o front recebe já agrupado.

## Render na sidebar (`AppSidebar`)

Para cada item top-level do `@director/acl`:

| Condição | Render |
|---|---|
| `item.to === '/'` | Skip total (item ignorado) — `/` é a home, acessada por outras vias (brand, navegação inicial) |
| `item.children` definido (mesmo com `route: []`) | `<li class="c-sidebar-nav-dropdown">` com toggle clicável; expande mostrando `item.children.route[]` como `<li class="c-sidebar-nav-item">` cada |
| `item.children` ausente (= falsy) | `<li class="c-sidebar-nav-dropdown c-show">` (já aberto) com link direto via `handleSideNavClick(item.to)` |

Ícones:

- Módulo: `getIconName(item.icon)` (utilitário normalizador). Default global `'cil cil-file'` (aplicado pelo mapper).
- Página (dentro de dropdown): **sem ícone**. Render é `&nbsp; {itemC.name}` — apenas o nome com espaço inicial.

Indentação: visual via CSS `c-sidebar-nav-dropdown-items` (não há campo `nivel` nem `depth` lidos por JS).

## Estado de expand/collapse

- **Estado**: `dropdownVisibility: { [index]: 'c-show' | '' }` — chave única (objeto sobrescrito a cada toggle).
- **Comportamento**: abrir um grupo **fecha todos os outros** (mutuamente exclusivo) — efeito de `setDropdownVisibility({ [index]: value })` ao invés de spread.
- **Persistência**: **nenhuma**. Estado vive só em memória (`useState`). Reload da página perde o que estava aberto.
- **Modo minimizado (sidebar rail)**: dropdowns desabilitados — `handleDropdownVisibility` faz early-return se `!isOffCanvas && sidebarMinimized`.

## Achatamento para rotas/abas (`readAclAsFlatlist`)

Cada item do storage vira **uma ou mais rotas** na lista plana consumida pelo `useNavigation`:

| Forma do item ACL | Geração na flat list |
|---|---|
| item com `children` | **só os filhos** viram rotas (`{ component: null, label: child.name, visible: false, active: false, path: child.to, id: uuid() }`). O item-pai (módulo-grupo) **não** vira rota. |
| item sem `children` | o próprio item vira rota (folha direta) |

Sempre prepended:

```
{ label: 'Home', visible: true, active: true, path: '/', component: null, id: uuid() }
```

→ `currentRoute` inicial é sempre `Home`.

A flat list é então merged com `props.routes` do `AppMain` em `setupNavigation`: rotas com `path` matching recebem o `component` custom (override do `GenericPages`).

## Links no menu

- `to` é **string de rota hash** (formato `/<segmento>/<segmento>`). No legado HashRouter, vira `#/<rota>`.
- Click no item leaf: `handleSideNavClick(to)` → `navigateTo(to)` + fecha backdrop mobile.
- Click no item dropdown header: só alterna expand; **não navega** (mesmo que `module.caminho` tenha valor — o handler é `handleDropdownVisibility`, não `handleSideNavClick`).
- Click no brand da sidebar: `handleSideNavClick('/')` (home).

## Badges / ícones extras

**Não há suporte a badges** (contador de pendências, "novo", etc.) no menu legado. Nenhum campo do mapper, do storage ou do render contempla isso.

**Não há suporte a active highlight automático**. A classe ativa de aba é gerenciada em `AppMainTabs` (não na sidebar). A sidebar não destaca o item correspondente à rota atual.

> TBD designer: ambos (badge + highlight do item ativo) são candidatos a "decisão nova" no Studio, sem precedente legado.

## Cache e refresh

- **Fetch**: uma vez por sessão. `fetchAclAndPersist` faz `if (sessionStorage.getItem(KEY) !== null) return;` no topo.
- **Invalidação**: manual via `sessionStorage.removeItem('@director/acl')` (ou via logout, que limpa todos os storages do `@director/*`).
- **Sem TTL, sem ETag, sem versionamento**. Mudanças no ACL no banco só aparecem após logout/login.
- **Sem mecanismo de "menu ainda carregando"**: enquanto fetch corre, `PageBlur` global cobre a tela. `AppSidebar` montada antes do fetch lê `'[]'` e renderiza vazio (depois reage só quando o componente re-renderiza por outro motivo — pois lê storage síncrono, não estado React).

> ponto frágil: `AppSidebar` lê do `sessionStorage` direto, sem reatividade. Se o ACL chegar **após** a sidebar montar, a sidebar fica vazia até o próximo render. Na prática, `AppMain` aguarda ACL antes de renderizar shell (`PageBlur` ON durante fetch), mitigando.

## Múltiplos result sets

A proc `obter_acl_token` retorna **um único XML/JSON** (não múltiplos result sets). Tudo está aninhado: `Routes > Route(module) > Children > Route(page) > Children > Route(function)`.

## Caso especial: super-user `(empresa='Processa', id_usuario=1)`

A proc `obter_acl_token` tem um branch que dá **acesso a todos os módulos/páginas/funções da aplicação**, sem filtro ACL. Outros usuários passam pelo cruzamento de papéis + recursos adicionais.

Implicação: o menu pode ter centenas de itens para o user 1 da Processa. O legado não pagina nem agrupa — renderiza tudo.

## Mapper customizável (`aclSetup.customMapper`)

`AppMain` aceita `aclSetup` como objeto `{ proc, customMapper }`. O `customMapper` recebe o `dados` cru do backend e pode produzir qualquer shape — desde que respeite o formato esperado pela `AppSidebar` e `readAclAsFlatlist`:

```
[ { name, to, icon, children: { route: [{ name, to, icon, ... }] } }, ... ]
```

> uso provável de `customMapper`: incluir `empresas` no item de página (campo lido por `getAclResourceCompanies` mas não preservado pelo `defaultMapper`).

## Relações com o ecossistema

- Consome de: [[acesso-obter-acl-token]] (proc canônica), [[tbpagina]], `acesso.TBmodulo`, `acesso.TBfuncao`, `acesso.TBpapel*`, `acesso.TBrecurso_adicional`.
- É consumido por: [[app-main]] (shell), `AppSidebar`, `useNavigation`, `useAcl.getAclResourceCompanies`, `useAcl.findPageConfig`.
- Storage: `sessionStorage['@director/acl']` — chave única, vida = sessão.
- Procedures paralelas (não consumidas pelo menu): [[acesso-obter-rotas-aplicacao]] (utilitária, flat).

## Notas de implementação para o Studio

- **A proc canônica do menu é `obter_acl_token`, não `obter_rotas_aplicacao`**. F007 deve referenciar a primeira.
- **Profundidade 2 é regra do banco**, não convenção do front. `TBmodulo` é pai; `TBpagina` é filho; não há tabela de sub-página. Studio pode escolher manter ou expandir, mas o catálogo legado é raso.
- **Empresas por página** são CSV (`"1,3,7"`), computadas no SQL via UNION de papéis e recursos adicionais. Quem quiser usar isso no Studio precisa de `customMapper` (default descarta).
- **Funções (permissões finas)** vêm dentro do nó da página. Default mapper descarta. Studio que quiser feature-flags por papel/função precisa custom-mappar.
- **Visibilidade no menu (`DFexibir_menu`)** é projetada pela proc mas **não filtrada pelo mapper nem pelo render**. Páginas com `visible=0` aparecem mesmo assim. > inferido: bug ou feature esquecida; vale validar com Processa.
- **Ordenação**: a proc ordena por `DFordem` (com fallback alfabético em `DFtitulo`). O front preserva a ordem do array (não re-ordena).
- **Cache de sessão é a fonte da verdade do menu**; revalidação só por logout. Se o Studio quiser refresh sem logout, é decisão nova.
- **Sem busca/filtro no menu legado**: usuário com muitos módulos rola sidebar manualmente. > TBD designer.
- **Item ativo não é destacado na sidebar legada**. Identificação visual da rota corrente vem da aba ativa, não da sidebar. > TBD designer.

## Sources

- [[calendar/notes/2026-05-15.md]]
