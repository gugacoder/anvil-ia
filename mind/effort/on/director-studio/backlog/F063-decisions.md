---
title: "F063 — Entrada de menu para /app/dashboard via TBpagina + ACL"
feature: F063
status: ready-for-test
created: 2026-05-17
author: smith
---

# F063 — Decisões

## Contexto

F012 entregou rota `/app/dashboard` no Studio (componente `DashboardRoutePage`),
mas o menu hierárquico — alimentado pela proc `acesso.obter_acl_token` — não
exibia a entrada porque não havia linha correspondente em `acesso.TBpagina`.

## Decisões

### D1. Aplicação alvo: `portal-director` (apenas)

Conservador. O dashboard do Studio vive primeiro em portal-director.
Re-uso em WMS/outras Áreas fica para uma feature futura (basta preencher
`DFchaves_aplicacoes='wms,...'` ou adicionar `TBpagina` por app).

WMS já tem um módulo órfão `wms.dashboard` (id=10, sem filhos) — não tocamos.

### D2. Hierarquia profundidade-2: novo módulo `portal-director.dashboards` + página filha

A proc `obter_acl_token` só projeta a árvore módulo → página. Não há
módulo de dashboard em portal-director (`id=1` tem só `acessos` e
`configuracoes`). Criamos:

- **Módulo**: `DFchave='portal-director.dashboards'`, `DFcaminho='/dashboard'`,
  `DFtitulo='Dashboards'`, `DFicone='cil cil-chart'`.
- **Página**: `DFchave='portal-director.dashboards_index'`,
  `DFcaminho='/dashboard'`, `DFtitulo='Dashboard'`.

Convenção da chave segue o padrão observado em portal-director:
`<app>.<modulo>_<pagina>` (ex.: `portal-director.acessos_usuarios`).

### D3. `DFcaminho='/dashboard'` (não `/app/dashboard`)

`app-page.tsx` (`handleNavigate`) prefixa `/app` no caminho legado vindo
da ACL. O frontend roteia para a URL `/app/dashboard` quando clica num
item com `path='/dashboard'`. Manter `/dashboard` no banco preserva o
contrato legado e funciona com o redirect de fallback do `/app/$` quando
existir match em `tree.tsx:appDashboardRoute`.

### D4. `DFexibir_menu=0` (visível)

Convenção legada validada em `menu.ts:isHidden` — `Visible='1'` significa
oculto; `0`/null/qualquer outro = visível. Idem para o módulo.

### D5. ACL: super-user only (por ora)

O branch super-user da proc (`@empresa='Processa' AND @id_usuario=1`)
entrega todos os módulos/páginas/funções sem checar papéis. Cobre o
usuário PROCESSA/1 do dev. Para usuários não-super-user, o vínculo
exige `INSERT/UPDATE` em `acesso.TBpapel_funcao_pagina_modulo` por
papel — bloco comentado no seed exemplifica append idempotente no
CSV `DFid_paginas`/`DFid_modulos`. Decisão de **quais papéis** ganham
acesso é de negócio, fora do escopo desta feature.

### D6. Idempotência: três `IF NOT EXISTS` por entidade

Re-aplicação não duplica linhas nem altera valores. PageId/ModuleId
estáveis. Reverter é `DELETE` por `DFchave` (documentado no header do SQL).

## Artefatos

- `workspace/director-studio/infra/sql/seed/F063-dashboard-menu.sql`
- `workspace/director-studio/apps/api/src/scripts/apply-f063-seed.ts`
- `workspace/director-studio/apps/api/src/scripts/probe-f063.ts`
- `workspace/director-studio/apps/api/src/scripts/probe-f063-schema.ts` (diagnose)
- `workspace/director-studio/apps/api/src/scripts/probe-f063-wms.ts` (diagnose)

## Validação executada (DBdirector_imperial_logistica_29)

1. **Schema probe** confirmou layout real de TBpagina/TBmodulo/TBaplicacao
   (vide `obter-model-pagina.md` §F042 schema survey).
2. **Apply seed**: insere ModuleId/PageId — `PageId=25`,
   `ModuleId=11` (na Imperial).
3. **Re-apply**: detecta linhas, no-op, PageId mantido em 25.
4. **Probe ACL**: chamada `obter_acl_token(<idUsuario>1</idUsuario><empresa>Processa</empresa><chaveAplicacao>portal-director</chaveAplicacao>)`
   retorna XML contendo o módulo `portal-director.dashboards` com filho
   `to=/dashboard` (chave `portal-director.dashboards_index`).

## Follow-ups (não bloqueantes)

- **F063-FU1**: Listar papéis em produção (Imperial e outros tenants)
  que devem ganhar acesso ao Dashboard, e adicionar `INSERT/UPDATE` real
  no seed (substituindo o bloco comentado).
- **F063-FU2**: Replicar seed em outras Áreas (WMS, agendamento, cotacao)
  conforme as Áreas ganham Dashboard próprio — via `DFchaves_aplicacoes`
  string-list ou novas linhas de `TBpagina`.
- **F063-FU3**: Smoke route `apps/director-studio/src/routes/smoke-f063.tsx`
  com link visualmente verificável para `/app/dashboard` — útil quando
  o `ui-tester` for revalidar.

## Sources

- Contratos: [[menu-hierarquia]], [[obter-model-pagina]] (schema survey F088),
  [[acl-papel-funcao-pagina]].
- Sessão WMS module reference: `acesso.TBmodulo` id=10.
- Padrão de chave: `acesso.TBpagina` rows id=1..7 do portal-director.
