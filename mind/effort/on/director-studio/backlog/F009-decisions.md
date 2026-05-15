---
title: "F009 — Decisões de implementação"
tags: [effort, director-studio, F009, render-engine, decisions]
created: 2026-05-15
---

# F009 — Engine schema-driven — decisões

Frente: [[feature-manifest]] F009.
Contratos: [[engine-schema-driven]] + [[obter-model-pagina]].

## D1. Backend: query direta a TBmodel_pagina, não chamada à proc XML

A proc `acesso.obter_model_pagina` devolve XML com namespace Newtonsoft.
Já temos parser XML em F007, mas para o model:
- O payload é uma **string JSON em DFvalor** — parsear XML pra extrair string
  JSON e parsear de novo é ruído.
- O .NET legado já optou pelo caminho direto (`GenericPagesRepository.cs`).
- A proc tem **bug histórico**: retorna todas as funções de todas as páginas
  (sem WHERE). Replicar isso é regressão; o .NET filtra corretamente.

→ Adotado o caminho .NET (3 queries SELECT diretas) replicado em TypeScript.

## D2. Schema-aware: DFid_aplicacao opcional

Em DBdirector_imperial_logistica_29 (Area 52), TBmodel_pagina NÃO tem coluna
`DFid_aplicacao` apesar do legado .NET assumir que tem. Provavelmente schema
divergente entre bases (Area 52 só tem 6 modelos, todos wms.*).

→ A descoberta detecta a coluna em INFORMATION_SCHEMA.COLUMNS. Quando ausente,
  query cai para `WHERE DFchave_pagina = @pageKey` puro (sem cross-app
  fallback). Divergence registrada no payload para o frontend mostrar warning.

  F042 (cross-app fallback) precisa decidir a estratégia final — aqui só
  preservamos a semântica de "se a coluna está, usamos; se não, abrimos pra
  qualquer app".

## D3. ZERO `eval` no Studio

Legado tem 3 pontos de `eval`:
1. `modelParams.valor` (expressão JS no cliente).
2. `funcoes.valor` (handler JS).
3. `button.externalAction` (JS inline).

→ **Nenhum é executado**. Política:
- `modelParams.valor`: interpolador puro tenta `JSON.parse(valor)`. Se literal
  JSON-válido (string, número, boolean, null, objeto, array), substitui;
  caso contrário substitui por `null` e adiciona divergence "non-literal
  legacy eval expression".
- `funcoes`: entregue ao cliente como cápsula, mas a engine **não chama
  executeGenericFunctions**. Divergence enumera quantas funções foram
  ignoradas. F039 cataloga e decide migração.
- `externalAction`: respeitado caso a caso por F010+ (cada renderer real
  decide). A engine F009 só renderiza stubs.

## D4. Frontend: dispatch por presença de chave

Implementação direta do contrato §"Tabela de dispatch":
- `pageTabs` é exclusivo no topo (vira `<RendererStub kind="pageTabs"/>` até
  F014).
- Demais chaves acumulam, na ordem canônica do legado:
  `genericform → datagrid2 → datagrid → filtro → genericcalendar →
   genericactionform → generictreeview → genericgridcollection → buttons →
   pipeliner`.

Cada chave detectada vira um `<RendererStub>` que mostra:
- a chave + feature alvo (F010/F011/F013/F014/F016/F021/F024/F036/F037/F038);
- summary curto (quantos campos, etc.);
- JSON tree colapsável da config, para ui-tester/archaeologist inspecionarem
  ao vivo o conteúdo recebido sem precisar SSMS.

Chaves desconhecidas no top-level (fora do catálogo) viram banner amarelo
"Chaves desconhecidas — vale escavação do arqueólogo".

## D5. Cache: Redis TTL 60s (mesmo padrão de F007/F008)

Key: `ds:model:<appKey>:<pageKey>`. Default `STUDIO_APP_KEY=portal-director`,
override via `?app=...`. F041 catalogou a decisão; aqui implementamos o
caminho conservador (legado não tinha cache, Studio tem 60s curto).

## D6. Ergonomia: aceita pageKey OU path

- `GET /api/model/:pageKey` — caminho canônico.
- `GET /api/model?path=/foo/bar` — resolve via `TBpagina.DFcaminho` antes de
  buscar em `TBmodel_pagina`.

A integração em `app-page.tsx` passa `pageKey` quando o menu retorna `key`,
ou `path` puro como fallback — o backend cobre os dois.

## D7. Integração: app-page.tsx delega ao ModelEngine quando ACL libera

Antes: `<PagePlaceholder>` mostrando ACL info estática.
Agora: rota acessível → `<ModelEngine pageKey={...} path={...}/>`. O header
da página (titulo + módulo) fica fora do engine; o engine renderiza só o
"corpo schema-driven" (avisos + stubs).

## Smoke test

DB: `DBdirector_imperial_logistica_29` (Area 52).

### `/configuracoes/agendamento` (caso pedido)
- TBpagina resolve para `portal-director.configuracoes_agendameno` ✓
- TBmodel_pagina NÃO tem essa chave nesta base (só 6 rows wms.*) → 404
  `page-not-found`. **Comportamento correto** — Studio mostra info banner.

### `wms.cadastros_grupo-de-trabalho` (chave existente)
- HTTP 200, 6504 bytes.
- `idModel=7`, `modelJson` com chaves
  `['functionKey', 'genericform', 'filtro', 'datagrid', 'genericPageTitle',
    'genericPageDescription']`.
- Detectado **3 renderers**: `genericform` (F010), `datagrid` (F011),
  `filtro` (F016). Empilhados verticalmente como stubs com config inspeccionável.
- `modelParams=0`, `funcoes=0` (esta página não usa eval).
- divergence: 1 — `TBmodel_pagina sem DFid_aplicacao nesta base — tenancy
  por app não aplicada (F042)`.
- Cache hit confirmado na 2a chamada (`cached: true`).

### Sem regressão
- Typecheck verde nos 3 workspaces (ui, api, director-studio).
- Vite build verde (817KB precache, igual ao baseline).
