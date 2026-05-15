---
title: "Director.Studio — Scope decisions log"
tags: [effort, director-studio, scope, curator]
created: 2026-05-15
updated: 2026-05-15
---

# Scope decisions — Director.Studio

Append-only. Cada decisão de escopo do curator (aceitar/recusar/dividir/adiar) entra aqui com data, motivo e impacto no manifest.

## 2026-05-15

### F004 — Sessão httpOnly cookie + Redis → accepted

**Decisão**: aceitar. 6/6 critérios pass com caso real PROCESSA/99 em IMPERIAL LOG (Área 52, DBdirector_imperial_logistica_29).

**Observações do ui-tester → resolução**:

1. `.env` aponta `REDIS_URL=redis://localhost:6379` (coletivos-redis) em vez de `:3010` (director-studio-redis derivado de PREFIX=30).
   → **Nova feature F031** (P1, infra, wizard). Não bloqueia F004 — keys têm namespace `ds:` e cenários todos passaram com Redis correto após edição manual do `.env`.

2. `config.ts:51-57` sobrescreve `process.env[key]` ao carregar `.env`, impedindo override via env explícita.
   → **Nova feature F032** (P2, infra). Convenção UNIX é env explícita ganha. Não bloqueia F004 — só atrita testes.

3. Critério 6 supôs Redis volátil, mas compose tem `--appendonly yes` + volume `redis-data`.
   → **Não vira feature**. Documentado no test-report (linhas 32, 50). Decisão de infra: persistência é desejada (sobrevive restart de container). Se time decidir voltar a volátil, ajusta `infra/docker-compose.platform.yml`.

**Impacto no manifest**: F004 `Status=accepted`, `Accepted=✓ 2026-05-15`. Adicionadas F031 e F032.

### F009 — Engine schema-driven → accepted

**Decisão**: aceitar. 8/8 ui-tester pass com payload real Area 52 (`wms.cadastros_grupo-de-trabalho`, `DBdirector_imperial_logistica_29`, idModel=7, 6504 bytes).

**Critérios auditados**:

1. **Contrato seguido**: dispatch por **presença de chave** (não DFtipo) conforme `engine-schema-driven.md` §"Tabela de dispatch"; ordem canônica preservada (genericform→datagrid2→datagrid→filtro→genericcalendar→genericactionform→generictreeview→genericgridcollection→buttons→pipeliner); `pageTabs` exclusivo no topo; sem `eval` (D3 enumera as 3 entradas e como cada uma foi neutralizada); schema-aware (D2 cobre Area 52 sem `DFid_aplicacao`); endpoint `GET /api/model/:pageKey` (+ `?path=`) é equivalente funcional do `POST /api/model` legado (D6).

2. **Componente do design system**: engine entrega `RendererStub` próprio + banner de divergências + banner amarelo para chaves desconhecidas. F009 é o **motor** — renderers reais (form/grid/etc.) são F010-F022. Stub é a entrega correta do motor isolado.

3. **Caso real ui-tester**: pageKey `wms.cadastros_grupo-de-trabalho` da Area 52, payload real do banco, 3 renderers detectados (genericform F010, datagrid F011, filtro F016), cache Redis hit confirmado em 2ª chamada, sem regressão F007/F008.

**Sobre o "fetch-stub" em C3**:
- Smith stubou apenas o **pareamento URL→pageKey** porque app `portal-director` (menu/ACL) e únicos models existentes (`wms.*`) não coincidem nesta base de teste.
- O que C3 valida — fluxo de carga, parse, interpolação de `modelParams`, dispatch por presença, ordem de empilhamento, payload real — **foi exercitado com dado real**.
- O stub é limitação de **infraestrutura de teste** (base sem seed cruzado), não de comportamento da engine. Equivalente a "o usuário clicou num menu que aponta para esta página".
- **Não invalida** F009. Invalidaria se mascarasse comportamento da engine — não mascara.

**Lacuna estrutural** (não bloqueia F009, mas impacta F010+):
- `DBdirector_imperial_logistica_29` só tem 6 models `wms.*`. Todos os renderers reais (F010-F022) vão bater no mesmo problema em ui-tester end-to-end.
- → **Nova feature F043** (P0, infra, seed): "Seed de models `portal-director` em base de teste (Area 52)". Decidir entre (a) carregar `processa.appbuilder/1-alimentacao/*.sql` na Area 52, (b) clonar base com models reais, ou (c) criar fixture mínima por feature.

**Divergence "TBmodel_pagina sem DFid_aplicacao"**: já coberta por F042 (cross-app fallback / tenancy). Sem ação adicional.

**Impacto no manifest**: F009 `Status=accepted`, `Accepted=✓ 2026-05-15`. Adicionada F043 (P0).

### F011 — Renderer DFtipo=grid (DataGrid2) → accepted

**Decisão**: aceitar. 12/13 ui-tester pass contra Area 52 (`sp_Listar_GrupoTrabalho` → 4 linhas reais: SECO, CONGELADOS 01, CONGELADOS 02, PERECIVEIS — caso real de varejo/atacado BR conforme PERSONA).

**Critérios auditados**:

1. **Contrato seguido** ([[model-valor-datagrid]]): envelope POST `{pagina,limite,ordenacao,...filter}` → `dados.relatorio.{linhas.linha,quantidadeParcial,quantidadeTotal}` normalizado em 3 shapes (envelope XML/JSON/recordset plano); sort tri-estado mono-coluna server-side; paginacao server-side; selecao via `getUniqueProp(id|cod|codigo)`; tone via `@color/@bgColor`; `type=html` sanitizado obrigatório (DOMPurify allowlist conservadora); 3 gridActions reais (`redirectTo`/`detailModal`/`execProc`) — alinhado com a ressalva do próprio contrato §17 (DataGrid2 do legado tem 7/8 actions stubadas em redesign). CSV BR com UTF-8 BOM (verificado via curl + xxd: `EF BB BF`) e `;` separator, **honrando filtro corrente** — corrige bug `Exporter.js:67` do legado (filter hardcoded `{}`).

2. **Componente do design system** ([[data-grid]]): table densa header sticky desktop + card list `<768px` mobile; sheet "Ajustar" mobile (vaul) substituindo toolbar inline; paginacao com range `{start}-{end} de {N}`; sort tri-estado mono-coluna; selecao single/multi com master checkbox; skeleton ≥200ms first-load + opacity refetch; empty-state filter-active vs initial; error-state com retry; DOMPurify obrigatório; gridActions catalogo declarativo.

3. **Caso real ui-tester**: `wms.cadastros_grupo-de-trabalho` na Area 52, 4 linhas reais de grupos de trabalho de centro de distribuição (escopo varejo). Encaixa em PERSONA (escritório do CD), não SaaS genérico.

**Fix de retry-loop** (cascade infinita de fetches em estado de erro): causa-raiz identificada (objetos inline `filter`/`additionalFilterParams` mudando referência a cada render → useCallback recriava → useEffect re-fire). Solução estrutural: (a) `JSON.stringify` em `filterKey`/`extraParamsKey` via useMemo, (b) circuit breaker `errorCountRef` (≥1 erro bloqueia auto-fetch até `handleManualRetry` zerar contador via `retryNonce`), (c) `ErrorState onRetry` chama `handleManualRetry`. Política final: "1 request por requisição do usuário", sem retry automático nem backoff. Reduziu de 159+ reqs em 12s para 1 req.

**Ressalvas → features novas (não bloqueantes)**:

1. **C4 — Sort dispara `Invalid column name 'descricao'`**: backend SQL Server faz match case-sensitive de column names enquanto headers do model expõem chaves lowercase. **Defeito do banco/proc do legado** (não da impl F011 — renderer envia `ordenacao` conforme contrato §envelope; proc é quem rejeita case mismatch). → **Nova feature F044** (P1, components/contract): catalogar procs `sp_Listar_*` afetadas e decidir entre (a) normalizar `ordenacao` no backend grid via map server-side, (b) aliasing nos headers do model, (c) corrigir procs. F011 segue contrato — fix vai onde o defeito vive.

2. **C9 — gridAction `delete` stubada**: F011 entrega `InlineAlert "Ação ainda não disponível"` como stub **explícito e visível** porque o `delete` legado tinha confirmation flow específico (provavelmente proc dedicada, soft vs hard delete) não documentado em [[model-valor-datagrid]] §gridActions. → **Nova feature F045** (P1, components): escavar contrato canônico de `delete` no DataGrid v1 (legado tinha 8 actions, F011 cobriu 3 reais + 5 stub conforme ressalva do contrato §17) e implementar como sub-feature. F045 não é débito de F011 — é feature dedicada porque tem UX e contrato próprios.

**Critério não-aplicável**: nenhum. 12/13 = todos os critérios exercitáveis no escopo de F011 passaram; o 13º é o `delete` (C9) que é sub-feature por design.

**MISSION/PERSONA check**: grid sentindo upgrade real do legado — sort/paginação/CSV honrando filtro funcionam contra dados reais de varejo (grupos de trabalho de CD); mobile card-list é entrega nova (legado não tinha); circuit breaker contra DB instável via VPN é robustez nova que o legado não tinha. Vibe check: encaixa em escritório de CD (operador conferindo grupos antes de abrir agendamento).

**Impacto no manifest**: F011 `Status=accepted`, `Accepted=✓ 2026-05-15`. Adicionadas F044 (P1) e F045 (P1). F011 fecha bloco grid-core. Próximos P0: F023 (hub realtime), F024 (bridge AWS), F039/F040 (inventário eval/params), F043 (seed models).
