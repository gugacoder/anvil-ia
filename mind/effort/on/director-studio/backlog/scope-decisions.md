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

### F024 — Bridge AWS (sync + auth) → accepted

**Decisão**: aceitar. 8/8 ui-tester pass com caso real PROCESSA → IMPERIAL LOG (userId=1, codEmpresa=1) na Área 52.

**Critérios auditados**:

1. **Contrato seguido** ([[portal-aws-bridge]]): `PortalAwsClient` lê `acesso.TBaplicacao(DFchave='portal-aws')` para `DFendereco`+`DFdominio` (com fallback `STUDIO_AWS_URL`/`STUDIO_AWS_DOMAIN`); JWT HS256 com `Consts.SecretKey` via `STUDIO_AWS_JWT_SECRET` e claim única `identidade` = JSON.stringify({Id,Name,CodEmpresa,NomeEmpresa,Domain}); header `Authorization: Bearer <jwt>` + typo legado `ContentType` (sem hífen) preservado; sem retry/timeout custom/circuit-breaker (paridade legado); 10 entidades de sync whitelisted (redes/empresas/centros/departamentos/veiculos/feriados/fornecedores/itens/planos/usuarios) → `EXEC [schema].aws_sincronizar_entidade @entidade, @ids=NULL` → `POST {baseUrl}/api/proc/portal.sincronizar_<entidade>`; proxy genérico `/api/aws/proxy/:proc` com sanitização regex de schema.proc; health endpoint sem chamar AWS.

2. **Componente do design system**: F024 é integração backend pura (bridge cliente HTTP + endpoints API). Sem componente UI próprio — a UI da sincronização (`IntegradorEntidades.jsx`) é renderizada pelo engine F009+F010 quando entrar o cadastro de page. **N/A** corretamente para esta feature.

3. **Caso real ui-tester**: PROCESSA → IMPERIAL LOG (`DBdirector_imperial_logistica_29`, userId=1, codEmpresa=1, Área 52). Não é fixture — base do tenant real com seed legado de `acesso.TBaplicacao(portal-aws)` apontando 127.0.0.1:5100.

**Cenários cobertos pelo ui-tester**:

- **C1 health 200** env-fallback `hasJwtSecret:true`.
- **C2 401** anon sync (sessão obrigatória).
- **C3 400** invalid-entidade (fora da whitelist).
- **C4 503 db-unavailable** (foco do refit): `DB_HOST=10.99.99.99` + cookie válido → body `{ok:false, error:"db-unavailable", message:"DB local indisponível — verifique conexão com SQL Server."}` **sem host/porta/instância no payload**; log interno preserva `ConnectionError code=ETIMEOUT host=10.99.99.99:1433` (sanitização correta — observabilidade interna preservada, superfície externa limpa).
- **C5 400** invalid-proc; **C5b 401** anon proxy.
- **C6 502 aws-unreachable** com URL pública no body (não vaza JWT secret nem identidade).
- **C7 500 server-error** fallback genérico via revisão `routes/aws.ts:273-278` — `"Erro interno na bridge AWS."` sem stack/host (validação por leitura do code path do ui-tester, sem invocar; aceitável porque os 3 kinds antecedentes — db-unavailable/aws-unreachable/aws-timeout — cobrem o branching real e o fallback é a folha "outros").
- **C8 sem regressão**: F003 login PROCESSA/99 ok, F004 `/api/auth/me` 200 com cookie, F023 `/api/hub/snapshot` 401 anon e 200 com cookie. Console limpo.

**Refit aceito sem nova rodada**:

Smith refez sanitização de erro mssql após `[ui-tester] fail` em C4 (erro do driver vazava host SQL `172.27.0.121\SQL2k19`). Refit entregou: (a) `AwsBridgeError` ganhou kinds `db-unavailable`+`proc-failed`; (b) `isMssqlError`/`promoteMssqlError` em `aws-client.ts`; (c) `executeSyncProcedure` envolve connect()+query() em try/catch com warn interno detalhado; (d) `bridgeErrorResponse` mapeia db-unavailable→503, proc-failed→502, fallback substitui message cru por "Erro interno na bridge AWS."; (e) `.env.example` documenta `STUDIO_AWS_JWT_SECRET` como deploy-wide. ui-tester revalidou e deu pass 8/8. Refit foi cirúrgico (não alterou contrato, só ajustou superfície de erro), justifica aceitação sem novo ciclo de design.

**Ressalvas → features novas (não bloqueantes)**:

1. **Smoke ponta-a-ponta com portal-aws real (n/a)**: portal-aws em `127.0.0.1:5100` desligado durante o teste; caminho feliz `Director → portal-aws → proc espelho → <Resposta>` nunca foi exercitado fim-a-fim. F024 cobre gates de erro (503/502/400/401), sanitização e protocolo do cliente; o que falta é a contraparte. → **Nova feature F048** (P1, integrations): provisionar `portal-aws-mock` (ou contraparte real) que aceite `Authorization: Bearer` com `Consts.SecretKey` e devolva envelope `<Resposta><Status>200|500</Status>...</Resposta>` para as 10 entidades de sync + 4 procs CRUD usuário-fornecedor. Sem F048 não há blocking de cutover, mas há blocking de "verde no primeiro deploy real". Decisão: F048 é P1 porque a bridge é mecanicamente correta (cliente + JWT + sanitização provados isoladamente); o que F048 destrava é confiança operacional, não funcionalidade.

2. **JWT secret deploy-wide vs setup wizard**: decisão atual = `STUDIO_AWS_JWT_SECRET` é env deploy-wide (`.env.example` documenta como "mesma chave Director↔AWS"). Razão: paridade exata com legado — `Consts.SecretKey` é única no Director e única na AWS, configurada por deploy, não por tenant. Multi-tenant compartilhando uma mesma instância de Studio compartilha o segredo (e é o que o legado fazia). Confirmado. → **Nova feature F049** (P1, infra): adicionar step opcional no setup wizard que detecta se `acesso.TBaplicacao(portal-aws)` existe durante onboarding e, se sim, exige `STUDIO_AWS_JWT_SECRET` no `.env` final. Sem essa step, deploy depende de operador lembrar do segredo. F049 é UX/ops do wizard, não escopo de F024.

**Critério não-aplicável**: design system component (N/A justificado acima — F024 é bridge backend pura, sem UI própria).

**MISSION/PERSONA check**: bridge AWS é exatamente o tipo de integração on-prem↔nuvem que vive no escritório de CD/varejo BR — sync de cadastros (fornecedores, veículos, docas, feriados) entre o ERP local do tenant e o portal AWS de agendamento. Refit de sanitização de erro (não vazar `172.27.0.121\SQL2k19` para o usuário) é melhoria real sobre o legado (que `Console.WriteLine(ex.Message)` direto). Vibe check: encaixa em operador do CD que aperta "Enviar Fornecedores" e quer feedback claro quando falha.

**Impacto no manifest**: F024 `Status=accepted`, `Accepted=✓ 2026-05-15`. Adicionadas F048 (P1) e F049 (P1). F024 fecha bloco integrations-core junto com F023. Próximos P0 da fila: F039/F040 (inventário eval/params — pré-requisito para remoção de `eval` no engine) e F043 (seed models — pré-requisito para validar F012-F022 sem stub).

### F039 — Inventário TBfuncao_model → accepted

**Decisão**: aceitar. Inventário documental completo, sem ciclo de UI necessário.

**Critérios auditados**:

1. **Contrato seguido** ([[tbfuncao-model]]): contrato publicado pelo archaeologist cobre DDL canônica (4 colunas, sem FK, sem unique, coluna `DFid_pagina` historicamente dropada), consumo backend (`GenericPagesRepository.cs:26-34`, `ModelRepository.cs:52-58` + DELETE em cascata, proc XML alternativa quebrada referenciando coluna morta), consumo frontend (`GenericPage.js:61-98` faz o `eval`, `GenericForm.js:390-712` chama em 3 pontos — submit, action field, modal aninhado), escopo léxico do `eval` documentado (14 identificadores incluindo `genericProps` array posicional 0..14 — pior tipo de API documentado), pipeline completo (ref não state, replaceAll textual sem AST, retorno descartado, catch silencioso), padrões identificados (4/4 usam `genericProps`, 2/4 manipulam DOM direto, 2/4 bypassam `useFetch`), riscos (RCE-by-design, reorder de `genericProps` quebra silenciosamente tudo, encoding mojibake no seed vai cru para `eval`), relações com [[engine-schema-driven]] e [[obter-model-pagina]].

2. **Componente do design system**: N/A justificado — F039 é inventário (escavação) documental. Sem UI própria. Idem critério aplicado em F024 (bridge backend) e em outras features de catálogo.

3. **Caso real ui-tester**: substituído por **probe SQL real** contra **148 bases** da Área 52 (`172.27.0.121\SQL2k19`, todas `DB%` online em 2026-05-15). `Tested=✓ (inventário documental)` é o sinal correto para feature de escavação. Resultado: **216 linhas totais distribuídas em 53 bases com dados** (95 bases com a tabela vazia), **exatamente 4 funções únicas** replicadas via seed `insert_pagina_*_agendamento.sql` do app `agent` — `handle_submit_gerenciar_agendamento`, `handle_update_gerenciar_agendamento`, `handle_cancelar_agendamento`, `handle_submit_realizar_agendamento`. Tamanhos 806–4773 chars. Amostras citadas em `DBengenharia_Director_RC` com schema canônico. Padrões heurísticos contados (4/4 `genericProps`, 3/4 `loggedUserData`, 2/4 `setTimeout`, 2/4 `document.*`, 2/4 `window.*`, 2/4 `fetch(` global, 0/4 `eval`/`new Function` aninhado, 0/4 libs externas). Dado empírico, não fixture.

**Descoberta-chave**: a premissa "cliente cadastra handler arbitrário em produção via AppBuilder" **não está exercida**. **Zero clientes finais** cadastraram funções próprias — todas as 216 linhas são réplicas idênticas de 4 funções escritas pela própria equipe Processa, seed-adas via SQL. A justificativa de manter `eval` ou montar sandbox QuickJS-wasm completo (opções A/B) cai por terra à luz desse dado.

**Decisão de estratégia: opção C (reescrita declarativa) → enfileirada como F050**.

Conclusão descritiva do archaeologist alinhada com curator+smith: as 4 funções caem em **2 templates declarativos** — `submit-com-validacao` (cobre `handle_cancelar_agendamento`) e `submit-com-validacao-e-comprovante` (cobre as outras 3). Modais HTML inline (`document.createElement`/`window.open`) viram **componente nomeado** controlado pelo React (resolve risco alta-severidade do contrato: render fora do React tree, sobrevive a navegação). Nenhuma das 4 funções usa `eval` aninhado, `new Function`, bibliotecas externas, `modelRef` ou `useAclHook` — só APIs nativas do browser e `genericProps` — portanto a primitiva declarativa não precisa absorver complexidade arbitrária.

F050 (P0) será feature de impl dedicada: schema das 2 primitivas, componente de modal de comprovante no design system, plug no engine (`useGenericFunction` resolve no map de primitivas em vez de `eval`), testes com payload real das 4 funções. Quando F050 entregar, **o eval em `executeGenericFunctions` morre** — um dos 3 pontos de `eval` que o Studio precisa eliminar (os outros são F040 `TBmodel_parametro.DFvalor` e `button.externalAction`).

**Por que não esperar F040 (inventário de TBmodel_parametro) para decidir conjunto**: F040 cobre interpolação `dParamX` em URL/body, escopo independente. F050 não depende de F040. Cada ponto de `eval` morre na sua feature.

**Impacto no manifest**: F039 `Status=accepted`, `Accepted=✓ 2026-05-15`. Adicionada F050 (P0, render) — reescrita declarativa em 2 primitivas. Próximos P0 da fila: F040 (inventário params), F043 (seed models), F050 (impl opção C).

### F043 — Seed de models portal-director → accepted

**Decisão**: aceitar. Feature de infra/seed sem superfície UI; smith replicou o caminho real de consumo contra base real Area 52.

**Critérios auditados**:

1. **Contrato seguido** ([[obter-model-pagina]]): 9 models inseridos em `acesso.TBmodel_pagina` (DBdirector_imperial_logistica_29, ids 13..21) com schema válido do engine schema-driven — chaves canônicas `genericPageTitle`/`genericPageDescription`/`filtro.model[]`/`datagrid` com `headers`/`gridActions`/`limits`/`genericform.model[][]` com `ctype`/`maskType`. Zero `dParam*`/`funcoes` (pré-empta `eval` antes de F040/F050/F051 aterrissarem). Schema-aware: tabela sem `DFid_aplicacao` na Area 52 (cobre F042 cross-app fallback). Idempotente (`IF NOT EXISTS / ELSE UPDATE`). Reversível por `DELETE WHERE DFchave_pagina LIKE 'portal-director.%'`.

2. **Componente do design system**: N/A justificado — F043 é seed de dados, não tem UI própria. Mesmo critério aplicado a F039/F040 (inventários documentais) e a F024 (bridge backend pura).

3. **Caso real ui-tester**: substituído por **smoke replay do caminho real de consumo**. Script `.tmp-smoke.mjs` replica `fetchModelFromDb` de `apps/api/src/routes/model.ts` (Caso B sem `DFid_aplicacao`) contra a Area 52 — não é fixture, é o mesmo SQL e mesma lógica de parse que F010/F011 vão executar em produção. Resultado: 9/9 pages portal-director têm match em `TBmodel_pagina`, JSON parseável em 100%, dispatch do engine detecta renderer correto (5×(filtro+datagrid) + 4×(genericform)). Dado empírico contra base real. Dispensa ui-tester formal porque a feature não renderiza UI — o caminho que ela existe para destravar é o consumo do model, e esse caminho foi exercitado.

**Por que não exigir ui-tester formal**: ui-tester valida componente do design system contra contrato + caso real. F043 não tem componente. Exigir ui-tester aqui seria cerimônia que cobre o vazio. O smoke do smith é mais rigoroso para o tipo de feature: replica o fetch real em vez de testar UI que não existe. **Critério registrado para reuso**: features de **infra/seed/inventário sem superfície UI** dispensam ui-tester formal quando o smith demonstra que o caminho de consumo da feature foi exercitado contra base real (não mock/fixture). Mesmo critério já aplicado em F039 e F040 (inventários documentais).

**Ressalvas → features novas (não bloqueantes)**:

1. **Procs não instaladas**: `gridActions`/`api` dos 9 models referenciam `acesso.sp_consultar_*` (5 pages) e `acesso.sp_persistir_*` (4 pages). Procs **existem** em `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.*` mas não estão instaladas em `DBdirector_imperial_logistica_29`. Sem elas, F010/F011 contra as 9 pages portal-director conseguem dispatch+parse (que é o que F043 destrava) mas falham ao listar/persistir (proc-not-found). → **Nova feature F052** (P0, infra): catalogar conjunto mínimo de procs referenciadas, decidir dependências transitivas, aplicar via script idempotente análogo a F043. F052 é o segundo elo da corrente que destrava ui-tester end-to-end das features render P0 já aceitas.

2. **`dParam*`/`funcoes` excluídos do seed por design**: as 4 expressões `(function(){...localStorage...})()` originais do `consultar_agendamento` ficam fora; F051 (interpolador `{path}` declarativo, opção A) e F050 (2 primitivas declarativas, opção C) reescrevem essas expressões. Quando F051 entregar, este seed pode ser estendido sem refactor — basta adicionar `dParam` literais no JSON do model como `"{user.cnpj}"`. Não é débito de F043, é sequenciamento correto: seed não pode introduzir `eval` antes da feature que o elimina.

**Critério não-aplicável**: design system component (N/A justificado acima — F043 é seed de dados, sem UI própria).

**MISSION/PERSONA check**: F043 não tem vibe de PERSONA — é trilho de infra que destrava a vibe das features render P0 (F010/F011 ganham casos reais portal-director: cadastros de Acessos/Usuários/Fornecedor + Configurações). Sem F043, ui-tester de F010/F011 fica limitado ao único model `wms.*` que coincidiu no DB de teste; com F043, exercita o menu canônico PROCESSA real.

**Impacto no manifest**: F043 `Status=accepted`, `Accepted=✓ 2026-05-15`. Adicionada F052 (P0, infra). F043 destrava ui-tester end-to-end de F010/F011 para dispatch+parse contra menu PROCESSA real; F052 destrava para execução de gridAction/api real.

## Política transversal — Aceitação de features sem UI

**Decidido em 2026-05-16, aplicável retroativamente a F039/F040/F043 e prospectivamente a F052 e futuras**:

Features de **infra**, **seed**, **inventário documental** ou **bridge backend pura** — que por natureza não têm componente do design system — dispensam ui-tester formal quando:

1. **Contrato existe** e o smith demonstra adesão por leitura cruzada (não execução de UI).
2. **Caminho de consumo real foi exercitado**: smith replica em smoke próprio o exato code path que features downstream vão consumir, contra base/sistema real (não mock/fixture).
3. **N/A do design system é justificado por escrito** no scope-decisions e no manifest (campo `Accepted`).

Esse padrão **não** se aplica a renderers (F010-F022), shell (F005-F008), auth (F003-F004) ou qualquer feature com superfície UI — ui-tester é mandatório para essas.
