---
title: "F008 — Decisões de implementação"
tags: [effort, director-studio, F008, smith, decisions]
created: 2026-05-15
---

# F008 — ACL papel × função × página

## Decisão central: expandir `/api/menu/routes` em vez de criar `/api/acl/me`

A proc canônica é a **mesma** de F007 (`acesso.obter_acl_token`). Criar um
endpoint paralelo significaria:

- duas chamadas pra mesma proc no boot do shell
- duas chaves de cache Redis (com TTLs separados pra invalidar)
- duas chaves de sessionStorage no front
- duplicação do schema-discovery + parser XML

Expandir o endpoint existente:

- 1 chamada por boot, 1 chave de cache Redis (`ds:menu:<userId>:<appKey>` TTL 60s)
- 1 chave sessionStorage (`studio:menu:v1`)
- ACL e Menu sempre **coerentes** (vêm do mesmo result-set)
- frontend `useAcl()` reusa o storage de `useMenu()` — zero round-trip extra

A resposta de `GET /api/menu/routes` agora é:

```json
{
  "ok": true,
  "appKey": "portal-director",
  "user": { "id": "1", "empresa": "Processa", "isSuperUser": true },
  "modules": [ /* árvore filtrada por DFexibir_menu — alimenta a Sidebar */ ],
  "acl": {
    "isSuperUser": true,
    "paginas": [
      {
        "id": 6,
        "label": "Agendamento",
        "path": "/configuracoes/agendamento",
        "key": "portal-director.configuracoes_agendameno",
        "moduleId": 2,
        "moduleKey": "portal-director.configuracoes",
        "funcoes": [],
        "empresas": []
      }
    ],
    "pageKeys": ["..."],
    "paths": ["..."],
    "funcoes": ["..."],
    "modulos": ["..."]
  },
  "cached": false
}
```

## Distinção semântica: `modules` vs `acl.paginas`

- `modules` aplica os filtros do legado (DFexibir_menu=1, sem rota raiz). É o
  shape para renderizar o menu.
- `acl.paginas` é o **universo ACL** — inclui também páginas com
  `DFexibir_menu=1` (que o usuário não vê no menu mas pode acessar via link
  direto / ação contextual / breadcrumb / drill-down de outra página).

Essa distinção é necessária porque o gate de rota não pode depender da
visibilidade no menu — usuário pode legitimamente navegar pra
`/relatorio/detalhes/123` mesmo que `relatorio/detalhes` não esteja exposta na
sidebar.

## Super-user

Replicada a mesma regra de F007: `id === '1' && nome === 'PROCESSA'` (case-
insensitive). O backend emite `acl.isSuperUser` e o hook `useAcl` faz bypass em
todas as checagens. Não há flag persistida — vem direto da sessão.

## `useAcl()` no frontend

`packages/ui/src/hooks/use-acl.ts`. Layer fina sobre `useMenu()`:

- consome `acl` do payload já cacheado em sessionStorage
- constrói índices `byPath` e `byKey` (Map) + Set de funções globais
- expõe:
  - `canAccess(matcher, functionKey?)` — matcher é path (`/...`) ou pageKey
  - `canAccessPath(path)`, `canAccessPageKey(key)`
  - `canUseFunction(functionKey)` — função em **qualquer** página acessível
  - `resolvePage(path)`, `resolvePageByKey(key)` — devolve `AclPage | null`
  - `getEmpresas(matcher)` — empresas (array dedup) da página

Super-user passa direto em todos os checks (retorno `true` antes de consultar
índice).

## `<AclGate>` em `packages/ui`

Wrapper declarativo:

```tsx
<AclGate funcao="aprovar-pedido"><Button>Aprovar</Button></AclGate>
<AclGate page="/admin/usuarios"><Link/></AclGate>
<AclGate page="/pedidos" funcao="excluir"><Button>Excluir</Button></AclGate>
```

- `fallback` (default: `null`) — renderizado quando negado
- `optimistic` (default: false) — comportamento durante o load:
  - false: esconde até saber (evita ver botão e ele sumir)
  - true: mostra até saber (evita flash de placeholder em ações comuns)

## Gating de rota em `AppPage`

Em `apps/director-studio/src/routes/app-page.tsx`:

- Home (`/app`) sempre passa (não é uma página da ACL)
- `/app/$splat` → `currentPath = /<splat>`:
  - se `!acl.ready` → "Verificando permissoes..."
  - se `acl.canAccessPath(currentPath)` → renderiza `PagePlaceholder` com
    metadata da ACL (funções e empresas da página)
  - senão → `<AccessDenied />` com `<InlineAlert variant="warning">`

Super-user passa direto. Usuário normal com rota fora da ACL vê o aviso.

## Persistência

- backend: cache Redis (mesma TTL de F007 — `MENU_CACHE_TTL=60`)
- frontend: sessionStorage `studio:menu:v1` (versionado, contém modules + acl)
- `clearMenuCache()` (de `use-menu.ts`) limpa ambos os caches no logout
  (chamado via `refetch()` se mudou a sessão)

## Compat com cache antigo

O storage Redis pode ter entries gravados pelo F007 antigo (array puro). Lendo:

```ts
if (Array.isArray(parsed)) {
  return { modules: parsed, paginas: [] }  // degrada graciosamente
}
return parsed as CachedAcl
```

Entradas antigas são lidas como "menu OK, ACL vazia" — o front trata isso como
ACL não-ready e renderiza placeholder. Próxima escrita reformula no novo shape.

## Smoke test (PROCESSA/99 / IMPERIAL LOG na Area 52)

```
POST /api/auth/login {identity:"PROCESSA",password:"99"} → 200 + cookie
GET /api/menu/routes (1ª)  → ok, cached=false, modules=2, acl.paginas=9, isSuperUser=true
GET /api/menu/routes (2ª)  → ok, cached=true,  modules=2, acl.paginas=9, isSuperUser=true
```

Shape das páginas confirmado:

```json
{
  "id": 6,
  "label": "Agendamento",
  "path": "/configuracoes/agendamento",
  "key": "portal-director.configuracoes_agendameno",
  "moduleId": ..., "moduleKey": "portal-director.configuracoes",
  "funcoes": [],         // TBfuncao vazia ou sem vínculos nesta base
  "empresas": []         // CSV vazio = sem restrição de empresa
}
```

Resolution funciona: `acl.paths` e `acl.pageKeys` populados com todos os 9
caminhos. `acl.funcoes` vazia porque a base de teste não tem
`TBfuncao`/`TBpapel_funcao_pagina_modulo.DFid_funcoes` populados para
`portal-director`. Em base com dados de função, o array sai populado.

## Limitação de smoke test

PROCESSA é super-user — todo `canAccess()` retorna `true` por bypass.
**Validação empírica do caminho "denied"** depende de:

1. um TBusuario não-super com papel limitado, ou
2. simulação no front (forçar `isSuperUser=false` num teste manual)

A lógica de bloqueio está implementada e exercitada por inspeção do código
(linha de `AccessDenied` em `app-page.tsx`). UI-tester pode validar
empiricamente quando tivermos um segundo usuário cadastrado, ou usar
`STUDIO_EMPRESA` para "destruir" o bypass (a regra `empresa==='Processa' AND
id===1` no backend respeita os dois lados — então um override de empresa
diferente de Processa para o user 1 forçaria branch normal e poderia ser usado
em teste manual). Por ora segue como **smoke test parcial** — bypass exercitado,
denial não exercitado por dados.

## Arquivos tocados

Novos:
- `packages/ui/src/hooks/use-acl.ts`
- `packages/ui/src/components/acl-gate.tsx`
- `mind/effort/on/director-studio/backlog/F008-decisions.md` (este)

Editados:
- `apps/api/src/routes/menu.ts` — `AclPage`, `AclPayload`, `buildMenuAndAcl`,
  `buildAclPayload`, cache shape, `user.isSuperUser`
- `packages/ui/src/hooks/use-menu.ts` — re-exporta `AclPage`, `AclPayload`,
  hook devolve `acl`
- `packages/ui/package.json` — export `./hooks/use-acl`
- `apps/director-studio/src/routes/app-page.tsx` — route-gating, AccessDenied,
  demo AclGate, HomeContent estendida com stats ACL, PagePlaceholder mostra
  funcoes/empresas da página
