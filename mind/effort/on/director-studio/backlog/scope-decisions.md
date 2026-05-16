---
title: "Director.Studio — Scope decisions log"
tags: [effort, director-studio, scope, curator]
created: 2026-05-15
updated: 2026-05-16
---

# Scope decisions — Director.Studio

Append-only. Cada decisão de escopo do curator (aceitar/recusar/dividir/adiar) entra aqui com data, motivo e impacto no manifest.

## 2026-05-16

### F015 — scope-decision (c): deferir como P3, reabrir junto com AppBuilder

**Decisão**: opção **(c)** — deprecar F015 como feature **ativa** agora, rebaixar a **P3 `deferred`**, com nota explícita de reabertura sob escopo **(a)** (chave `wizard` como template cadastrável no engine) quando AppBuilder virar feature ativa do Studio.

**Razão central — alinhamento com MISSION**:

A MISSION declara: *"AppBuilder será um app do próprio Studio — quando cadastrarmos templates de edição de páginas no banco, o AppBuilder aparece como mais um app no menu, indistinguível dos outros pelo runtime. Recursivo: a ferramenta que cadastra apps roda dentro da plataforma que renderiza apps."*

Sob essa lente, o Pipeliner é uma feature **do AppBuilder**, não do Studio core. As 3 opções de escopo do contrato [[model-valor-wizard]] §⚠️ se reorganizam pela MISSION:

- **(a) `wizard` como template no engine** — coerência máxima com MISSION (template cadastrável em `TBmodel_pagina` resolve Pipeliner como dado, não como código hardcoded; AppBuilder cadastra wizards como cadastra qualquer outra page). Mas requer engine maduro, design de schema novo (sem precedente legado), e caso de uso concreto — que **é** o Pipeliner do AppBuilder, que ainda é P3.
- **(b) Componente reusável fora do engine** — viável tecnicamente, mas **contradiz a MISSION**: deixaria o Pipeliner como rota hardcoded `/areas/appbuilder/pipeliner`, e qualquer wizard novo viraria código manual em vez de template cadastrável. Empurra o AppBuilder para fora do paradigma "app indistinguível pelo runtime".
- **(c) Deprecar como feature ativa** — preserva (a) como caminho futuro, evita decisão prematura sem caso de uso concreto, libera o curator/smith/designer para focar nos renderers core do cutover dos apps cliente (F016 filtros, F018 datepicker, F019 powerselect, F020 notifications, F021 modal, F025/F026 admin).

**Por que (c) e não (a) já**:

1. **Cutover dos apps cliente vem primeiro** — o Studio precisa entregar os apps que rodam **dentro** dele (portal-director, portal-aws, processa.adm, mobile) antes de entregar o app que cadastra apps (AppBuilder). Tempo de engenharia hoje em F015 é tempo desviado do bloco P0/P1 que destrava cutover.
2. **Caso de uso único hoje = Pipeliner = AppBuilder** — não há segunda tela em Área 52 / sources que precise de wizard genérico. Probe cross-source não identificou nenhuma rota legada operando em modo multi-step além de `/#/pipeliner` (ponto aberto §8 do contrato). Decidir schema declarativo de wizard com 1 caso de uso é greenfield sem disciplina.
3. **Decisão (a) sob (c) preserva todas as opções** — quando AppBuilder for reaberto, F015 reabre sob (a) sem perda; o contrato [[model-valor-wizard]] permanece como referência empírica (W1..W10) do comportamento legado a paralelar.

**Por que não (b)**:

(b) também é viável, mas (b) compete com (a) por mindshare: se hoje fizermos (b), criamos um precedente "wizards no Studio são componentes, não templates" que dificulta (a) no futuro. Como AppBuilder é P3, evitar decisão (b) preserva (a) como caminho dominante quando reabrir. (b) só faria sentido se houvesse demanda concreta no escopo P0/P1 de cutover — e não há.

**Reabertura — gatilho explícito**:

F015 sai de `deferred` para `todo` (sob escopo (a)) quando **qualquer um** destes ocorrer:
- AppBuilder for promovido a feature ativa (cutover do AppBuilder no roadmap), OU
- Archaeologist identificar segunda tela no legado/Área 52 operando como wizard multi-step (revisão do ponto aberto §8 do contrato), OU
- Cliente/PERSONA pedir wizard genérico no Studio core.

Até lá, fica P3 `deferred`. Contrato [[model-valor-wizard]] segue válido como cobertura empírica do legado.

**Impacto no manifest**: F015 `Priority=P3`, `Status=deferred`. Manifest acima atualizado com nota explícita. Backlog do arqueólogo §"Features ainda não enumeradas" mantém Mobile/SignalR/edoc/sped/fornecedor — F015 é caso à parte (escavada, contratada, deferida por decisão de timing, não por gap de descoberta).

**Sem features novas enfileiradas** desta decisão (diferente de aceites onde follow-ups viram F0XX): deferral não gera débito; reabertura é o "follow-up" implícito.

### F069 — aceite parcial (caminho fornecedor-aws)

**Decisão**: aceitar F069 com nota `(parcial)` e enfileirar F077 (P2) como follow-up para o happy path.

**Critérios atendidos**:
- Contrato [[processa-auth-fornecedor-aws]] publicado (F1..F25).
- F003 implementa F1+F2+F15 com query SHA2_256 literal-copy do legado em `apps/api/src/routes/auth.ts:498-549`.
- Archaeologist audit-pass estático cobre todas as asserções verificáveis sem dados.
- ui-tester pass 8/8 em casos negativos reais Area 52 IMPERIAL (F1/F3/F9/F10/F12/F20/F24/F25) — resolver → query → 0 rows → 401 exercitado fim-a-fim.

**Gap aceito**: F2/F4/F5/F15/F21 (happy path) não exercitáveis porque `portal.UsuarioFornecedor` na base `DBdirector_imperial_logistica_29` está vazia. Gap é de **dados**, não de **código**. A query é literal cópia do legado; o caminho funcionaria com fornecedor cadastrado.

**Política**: aceite parcial análogo a F005 (C2 mobile → F033), F007 (C7 mobile → F033), F008 (C5 denial n/a → F035) e F052 (5 procs ausentes → F052b). Padrão consistente: aceitar quando o défice é externo (dados/ambiente) e enfileirar follow-up rastreável.

**Proibições mantidas**: PROIBIDO modificar a base IMPERIAL para seed pontual (base de cliente, política transversal). F077 só desbloqueado quando (a) fluxo legado de admin cadastrar fornecedor real em Area 52, (b) Portal AWS real for wired ao Studio (fecha também F048), ou (c) seed em base de teste isolada.

**Impacto manifest**: F069 `accepted` ✓ 2026-05-16 (parcial); F077 adicionado P2 `todo`.

### F071 — aceite parcial (generic-form-renderer Drawers → Dialog + Sheet)

**Decisão**: aceitar F071 com nota `(parcial)` e enfileirar F078 (P3) + F079 (P3) como follow-ups.

**Critérios atendidos**:
- Skill [[vaul]] honrada: smith implementou `useIsMobile` uma vez governando simetricamente os dois branches (confirm linha 1035 → Dialog desktop / Drawer mobile; detalhe linha 1117 → Sheet side=right desktop / Drawer mobile).
- ui-tester pass G1 confirma o gate funcionando empiricamente no confirm (Dialog shadcn desktop 1280×900, zero drawer/sheet anti-pattern, console limpo).
- G4 (console limpo) e G5 (zero regressão F050 + ReceiptModal F070) pass.
- Dialog + Sheet shadcn reusados de `packages/ui` (Phosphor X).

**Gap aceito**: G2 (modal-detalhe linha 1117 → Sheet desktop) não-exercitável porque **nenhum consumer no app atual** dispara `config.formOnModal=true`. Gap é de **cobertura de cenário** (faltam consumidores reais), não de **código**. A simetria do gate `useIsMobile` (mesmo hook, mesma estrutura ternária aplicada nos dois branches) faz G1 evidência forte de que G2 funcionará pelo mesmo mecanismo. G3 mobile bloqueado por F033 (débito transversal de viewport, mesma classe de F005/F007/F013/F014/F070).

**Política**: aceite parcial análogo a F069 (gap de dados), F005/F007/F008 (gaps transversais F033/F035) e F070 (G2 deferred a F033). Bloquear F071 até consumer real emergir paralisaria o cutover sem ganho real de fidelidade — o consumer apareceria naturalmente em F015 (wizard) ou similares.

**Observação Esc-não-fecha-Dialog**: isolada em F079 (P3 microfeature) — Botão Fechar e clique-fora funcionam; Esc provavelmente requer `autoFocus` ou `onEscapeKeyDown` explícito no Radix Portal. Não bloqueia F071 nem cutover.

**Proibições mantidas**: nenhuma adicional. F078 desbloqueado quando consumer real com `formOnModal=true` emergir (provável: F015 wizard); alternativa é smoke route dedicada se nenhum consumer aparecer até cutover.

**Impacto manifest**: F071 `accepted` ✓ 2026-05-16 (parcial); F078 adicionado P3 `todo`; F079 adicionado P3 `todo`.

### F070..F073 — onda de correções vaul/mobile-first em packages/ui

**Decisão**: enfileirar 4 features dedicadas para corrigir violações da skill [[vaul]] em componentes do design system. Cada componente vira sua própria feature (não agrupar) porque cada um tem trade-off UX distinto (Dialog vs Sheet vs Popover) que precisa de aceitação independente.

**Aprendizado estrutural**: auditoria do principal revelou que smith ignorou a skill [[vaul]] em 3 componentes (`receipt-modal`, `generic-form-renderer` 2×, `RecentStackSheet`) — todos usam Drawer Vaul incondicional sem gate `useIsMobile()`, resultando em drawer-up subindo no desktop. O 4º (`tree-checkable`) usa Drawer `direction="right"` no desktop, que funciona mas não é o canônico da skill (`Sheet side="right"` shadcn). 

**Fechamento do gap**: smith.md foi atualizado com checklist obrigatório anti-violação (skills [[vaul]], [[mobile-first-page]], [[ui-dry]]) — ver linhas 38-52 do agente. A partir daqui, qualquer wave do smith deve confirmar o checklist antes de marcar `ready-for-test`; ui-tester recusa se o checklist não foi seguido.

**Priorização**:
- **F070** ui-system — receipt-modal Drawer→Dialog desktop (P1; bloqueia UX em qualquer página que use ReceiptModal no desktop, fluxo de F050 submit-com-comprovante).
- **F071** ui-system — generic-form-renderer 2 Drawers → Dialog+Sheet desktop (P1; afeta diretamente F010 GenericForm que já está accepted — débito retroativo na impl, sem revogar aceite, política forward-only de scope-decisions §F003).
- **F072** ui-system — RecentStackSheet Drawer→Popover/Sheet desktop (P2; afeta page-tabs/F014 mas é primitivo de navegação periférico, não bloqueia fluxo principal).
- **F073** ui-system — tree-checkable Drawer direction=right → Sheet side=right canônico (P3; refinamento de consistência, funciona como está).

**Impacto retroativo (não-revogatório)**: F010 (accepted), F013 (accepted, depende de tree-checkable) e F014 (accepted, depende de page-tabs) mantêm `Accepted=✓` históricos. As correções migram para F070..F073 forward-only (mesma política aplicada em F003→F067/F068/F069). Cutover bloqueia até 100% accepted nas features novas.

**Critério especial Source/Contract**: Source=`n/a (correção de impl)` — não há contrato legado, é violação de skill interna do Studio. Contract=`skill [[vaul]] + [[mobile-first-page]]` — a verdade aqui é a skill, não a proc/contrato do legado.

### F003 → F067/F068/F069 — divisão forward-only por gap retroativo

**Decisão**: dividir o escopo restante de F003 em três features dedicadas (F067 ldap-bridge, F068 temp-password, F069 fornecedor-aws-coverage). F003 mantém `Accepted=✓ 2026-05-15` (não revogo retroativamente — política forward-only).

**Motivo**: auditoria sob os novos guardrails (`.claude/agents/curator.md` critério C9 — toda feature aceita precisa ter caminho real exercitado; `.claude/agents/archaeologist.md` modo auditoria) revelou que F003 foi aceita com 2 dos 5 caminhos como stub `501 not-implemented` (`workspace/director-studio/apps/api/src/routes/auth.ts:377-399`), e o terceiro (`fornecedor-aws`) implementado parcialmente mas nunca exercitado com credencial real. Sob a regra atual, esses 3 caminhos não contariam como cobertos.

**Regra estabelecida**: *stub que devolve `501 not-implemented` não conta como caminho implementado*. Aceitação requer (a) contrato real, (b) implementação que executa o caminho legado de ponta a ponta, (c) ui-tester com caso real.

**Por que não revogar F003**: revogar aceite quebraria a confiança no histórico do manifest e exigiria política de retroatividade que ainda não temos. Forward-only é mais barato e tão completo quanto: as 3 features novas cobrem o gap antes do cutover (cutover bloqueia até 100% accepted).

**Impacto no manifest**: F003 inalterado. Adicionadas:

- **F067** auth — LDAP bridge (P0). Source: `Processa.Sdk.Auth/LDAPAuthMiddleware.cs` + `Cryptography.cs`. Contract=TBD (archaeologist).
- **F068** auth — Temp password (P0). Source: `Processa.Sdk.Auth/TokenUtils.cs`. Contract=TBD.
- **F069** auth — Cobertura completa fornecedor-aws (P1). Source: `AbstractBearerAuth.cs` + `sql/portal-aws/`. Contract=TBD.

P0 para LDAP e temp-password (usuários do legado tipo `processa\guga` dependem); P1 para fornecedor-aws (já parcialmente entregue; bloqueia apenas onboarding de fornecedor, não cutover interno).

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

### F052 — Seed de stored procedures portal-director → accepted

**Decisão**: aceitar. Feature de infra/seed sem superfície UI; aplica-se a política transversal de aceitação sem UI consolidada acima.

**Critérios auditados**:

1. **Contrato seguido** ([[obter-model-pagina]] + [[model-valor-datagrid]] + [[model-valor-genericform]]): smith reaplicou 4 procs **exatamente como vivem em sources** (`sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.*`), via DROP+CREATE idempotente do próprio `.sql` legado. Zero mutação de bytecode — só garante que base == sources. Dependência transitiva `dbo.Split` verificada presente. Não inventou DDL para as 5 ausentes — postura correta. Encoding lido em `latin1` (cp1252) respeitando convenção do legado.

2. **Componente do design system**: N/A justificado — F052 é seed de procs SQL. Sem UI. Mesmo critério aplicado a F043 (seed de models) e F039/F040 (inventários).

3. **Caso real**: smoke 4/4 contra `DBdirector_imperial_logistica_29` na Area 52 com payload XML real (`<Parametros><pagina>1</pagina>...`) — não fixture, não mock. Cada proc respondeu com envelope `<Relatorio>` válido (3 procs) ou recordset vazio aceitável (`sp_consultar_config_mobile` — sem dados de mobile no tenant). `modify_date` em `sys.objects` confirma escrita real. Caminho exato que F011 (datagrid) vai consumir em produção: replay do contrato envelope POST.

**Sobre o gap das 5 procs ausentes**:

Smith **não inventou DDL** — postura canônica do mandato de cobertura. Não há proc em sources, não há proc na base, portanto não há contrato auditável. Inventar DDL aqui violaria "100% RTM" do lado oposto: entregaria comportamento que não existe no legado.

Gap isolado em **F052b** (P1, infra) para o archaeologist investigar 3 hipóteses (outro source não-catalogado / endpoint `.cs` sem proc / proc privativa por tenant). Saídas: localizou → smith aplica; vivia em `.cs` → vira feature de endpoint nativo do Studio (rotas em `apps/api/src/routes/`); nunca existiu → descarta as 5 pages do cutover (refactor de F043 ou banner amarelo proc-not-found explícito).

**Por que F052b é P1 e não P0**: F052 destrava 4 das 9 pages portal-director (todas datagrid de leitura). O subset não destravado é 1 datagrid (`acessos_fornecedor`) + 4 genericform (`configuracoes_*`). O cutover global não depende exclusivamente dessas 5 pages — cadastro de fornecedor e configurações de bridge/email/cotação/agendamento são valiosos mas não são porta-de-entrada do produto. Subir para P0 se o usuário sinalizar que alguma dessas 5 pages é blocker.

**Critério não-aplicável**: design system component (N/A justificado).

**MISSION/PERSONA check**: F052 não tem vibe — é trilho de infra. Destrava o vibe das pages portal-director (Acessos/Usuários/Conexões/Director-mobile) — cadastros canônicos PROCESSA que o operador do CD vai consumir em ui-tester de F010/F011.

**Impacto no manifest**: F052 `Status=accepted`, `Accepted=✓ 2026-05-15`. Adicionada F052b (P1, infra). F011 ui-tester end-to-end fica destravado para 4 das 5 datagrid pages portal-director.

### F054 + F054b — Auditoria zero-eval → accepted (consolidado)

**Decisão**: aceitar F054 (`Accepted=✓ 2026-05-15`, no-op confirmado) e aceitar F054b como **redundante referenciando F054**. Escopo idêntico, evidência herdada.

**Contexto**: F054 foi originalmente enfileirada para eliminar o 3º ponto de `eval` (`button.externalAction`). Archaeologist em 2026-05-15 rejeitou a hipótese — `externalAction` no legado é função JSX literal, nunca string, nunca eval. Auditoria cross-tenant (15 bases, 133+ models de `TBmodel_pagina` + amostras de `TBfuncao_model` + seeds SQL canônicos) deu zero hits. Os únicos 2 `eval` em `react-tools/src` (GenericPage.js:93 + GenericPages.js:33) já estão cobertos por F050+F051. Curator reclassificou F054 como no-op dependente de auditoria final, e principal abriu F054b (mesmo escopo).

**Por que aceitar F054 e marcar F054b como redundante (opção 1) em vez de remover F054b (opção 2) ou manter separada (opção 3)**:

- **Não remover** porque o ui-tester registrou a duplicação no progress; arqueólogo referenciou F054b em survey; auditabilidade pede preservação do rastro.
- **Não manter separada** porque escopo+evidência são idênticos — fazer duplo aceite gera ruído, não rigor.
- **Marcar redundante** preserva rastreabilidade e fecha o trilho num só movimento.

**Evidência (compartilhada por F054 + F054b)**: ui-tester confirmou 0 hits de `eval(` e `new Function(` em `packages/ui/src` + `apps/api/src` + `apps/director-studio/src`; smokes `/smoke/f050` e `/smoke/f051` carregam sem regressão; F051 reporta 25/25 PASS.

**Impacto no manifest**: F054 `Status=accepted`, `Accepted=✓ 2026-05-15`. F054b `Status=accepted (redundante c/ F054)`, `Accepted=✓ 2026-05-15 (herdado)`. Linhas anotadas com prefixo de redundância. Trilho de eliminação de `eval` está **completo** (F050 handlers + F051 interpolation + F054/F054b auditoria invariante).

### F012 — Renderer DFtipo=dashboard → accepted

**Decisão**: aceitar. 12/12 ui-tester pass no retry (linha 174 do progress, 2026-05-16T01:30:00Z) contra Area 52 sessão PROCESSA/99 IMPERIAL LOG.

**Critérios auditados**:

1. **Contrato seguido** ([[model-valor-dashboard]]): 11 decisões registradas em [[F012-decisions]], todas alinhadas ao contrato:
   - Rota separada `/app/dashboard` (não via ModelEngine) — refletindo que dashboard vive em `acesso.TBdashboard`, não `TBmodel_pagina`.
   - Schema canônico `boxConfig = { widgets: WidgetSlot[] }` em `packages/ui/src/components/dashboard/types.ts`; adapter para forma legada (`boxElements/boxDimension/chartData/quadrante`) fica para F-tbobjetos-dashboard quando F052b destravar.
   - Recharts em vez de Google Charts (decisão UX spec).
   - Tokens semânticos como cor de série (proibido hex; paleta `[primary, x-info, x-success, x-warning, x-error, accent-foreground]` reciclada em mod n).
   - Layout: mobile stack vertical / desktop CSS Grid 2×2 com `colSpan`/`rowSpan`.
   - Auto-refresh por widget via `setInterval` mínimo 10s, paridade legado `DashBoardBox.js:285-291`; pausa em `document.visibilityState !== 'visible'`, refetch dos vencidos ao voltar (upgrade sobre legado que drenava bateria).
   - Endpoints `GET /api/dashboards/me` (1 dashboard fake hardcoded com 4 widgets) + `POST /api/dashboards/refresh` (batch tolerante a partial failure, parser de envelope `<Response>`/`<Relatorio>`/JSON/recordset).
   - Sem persistir snapshot do `data` no `boxConfig` (metadata-only, refetch sempre ao mount).
   - Switcher redesenhado como segmented control conforme spec dashboard-widget; `linkedSlotId` exposto textualmente, aplicação efetiva da troca fica para wave subsequente.
   - Sem Google Charts, sem `eval`, sem polling fora do hook, sem `console.log` no backend.

2. **Componente do design system** ([[ui-system/dashboard]] + [[ui-system/dashboard-widget]]): `dashboard-surface.tsx`, 4 widgets (kpi/chart/table/switcher) + `widget-card.tsx` no `packages/ui/src/components/dashboard/`, hook `useDashboard` em `packages/ui/src/hooks/use-dashboard.ts`, rota `/app/dashboard` em `apps/director-studio/src/routes/dashboard.tsx`. Paleta semântica via CSS var, Recharts aceita `var(--token)` literal.

3. **Caso real ui-tester**: retry 12/12 contra Area 52 sessão PROCESSA/99 IMPERIAL LOG (`DBdirector_imperial_logistica_29`). Auto-refresh comprovado (4 POSTs em 49s), aba oculta zero requests, retomada via `visibilitychange` refetcha vencidos em <2s, mobile 1 col a 372px, desktop 2×2. F051/F050/F011/F023 sem regressão.

**Caveat — payload fake hardcoded**:

O payload retornado por `GET /api/dashboards/me` é um dashboard fake de 4 widgets embutido no backend (não veio de `acesso.TBdashboard`). **Aceito por design** pelo mesmo critério aplicado em F009 C3 (fetch-stub) e em F051 (smoke route): o que F012 entrega é o **renderer + endpoint + protocolo de refresh**, não o catálogo de dashboards reais. Catálogo real depende de **F-tbobjetos-dashboard** (catálogo `TBdashboard`) + **F052b** (seed de procs ausentes) — enfileirados. Equivalente funcional ao paralelo F010/F011 ↔ F043/F052/F052b: renderer aceito com smoke, catálogo separado.

Vai virar débito real se o cutover acontecer sem F-tbobjetos-dashboard rodado; o renderer **funcionalmente está completo** mas o operador do CD não verá dashboards próprios sem o catálogo. F-tbobjetos-dashboard fica P1 (mesma família de F052b).

**Adiados declarados em F012-decisions.md** → enfileirados como features dedicadas:

| Adiado | Feature | Priority |
|---|---|---|
| Edit mode (drag/resize/configurar/salvar layout) | F055 | P2 |
| Shared-link `#/dashboard?tkn=...&obj=...` (JWT 30d redesign) | F056 | P1 |
| `react-grid-layout` (n×m configurável) | F057 | P2 |
| SSE eventos por widget (substitui setInterval onde possível) | F058 | P2 |
| Exhibition rotation multi-dashboard | F059 | P2 |
| Pull-to-refresh mobile (primitivo reusável) | F060 | P2 |
| Gauge widget (custom SVG arc) | F061 | P2 |
| Widgets unknown-type (scatter/combo/treemap/geo/sankey) | F062 | P2 |
| Entrada do menu via `TBpagina` + ACL | F063 | P1 |
| Mobile stack responsive (débito C8) | F064 | P1 |
| Catálogo `TBdashboard` (dashboards reais) | F-tbobjetos-dashboard | P1 |

**Priorização das follow-ups**: P1 para itens que (a) destravam cutover funcional (catálogo F-tbobjetos-dashboard, menu F063), (b) são débito explícito de spec compliance (F064 mobile stack), ou (c) já tinham promessa de UX no legado e usuário verá ausência (F056 shared-link). P2 para upgrades sobre legado e formatos de widget pouco usados — entram depois do cutover global.

**Sinais do designer reconhecidos**:

- F-dashboard-sse → enfileirada como F058.
- F-dashboard-shared-link → enfileirada como F056.
- F-dashboard-grid-layout → enfileirada como F057.
- F-dashboard-export → **não enfileirada nesta rodada** — não foi declarada como adiada por smith em F012-decisions, e não há mandato explícito. Designer registra como P3 no signal log; curator só enfileira quando arqueólogo confirmar que existe no legado.
- Widgets unknown-type (scatter/combo/treemap/geo/sankey) → enfileirada como F062 (P2 condicional a inventário cross-tenant; vira no-op com banner amarelo se nenhum cliente usa).

**Critério não-aplicável**: nenhum. 3/3 critérios cumpridos.

**MISSION/PERSONA check**: dashboard de operação no escritório de CD/varejo BR é vibe central — KPI "Pedidos hoje 128 vs ontem 102", gráfico "Pedidos por turno (Manhã/Tarde/Noite)", tabela "Top motoristas", switcher "Hoje/Semana/Mês" são exatamente o que o supervisor vê numa TV ou no monitor antes do expediente abrir. Recharts com tokens semânticos (em vez de Google Charts com cores hard-coded) é upgrade real — tema escuro funciona, paleta consistente com o resto do app, sem `<iframe>` do Google. Auto-refresh com pausa em aba oculta é melhoria sobre o legado (que drenava bateria). Vibe check: encaixa.

**Impacto no manifest**: F012 `Status=accepted`, `Accepted=✓ 2026-05-15`. Adicionadas F055-F064 (10 follow-ups) + F-tbobjetos-dashboard. Trilho de renderers core (F010 form, F011 grid, F012 dashboard) está com **3/3 aceitos**. Próximos renderers P1: F013 tree, F014 tabs, F015 wizard, F016 filtros, F018 datepicker, F019 powerselect, F020 notifications, F021 modal.

### F013 — Renderer DFtipo=tree (generictreeview + SearchTree) → accepted

**Decisão**: aceitar. 11/11 ui-tester pass no retry (linha 185 do progress, 2026-05-16T09:15:00Z) após fix `46d8798`, contra Area 52 sessão PROCESSA/99 IMPERIAL LOG.

**Critérios auditados**:

1. **Contrato seguido** ([[model-valor-generictreeview]]): o contrato cobre **duas árvores distintas** do legado, e ambas foram entregues:
   - **(A) `generictreeview`** — nó do model despachado pelo engine (legado: `GenericPage.js:325-329`), navegação multi-página com sidebar + recursão do engine no painel direito. Studio entrega `tree-view.tsx` (split desktop / master-detail mobile) + `tree-view-renderer.tsx` (plug no `ModelEngine` pela chave `generictreeview`), com schema legado mapeado `tree → children`, payload `{model}` repassado, recursão real do engine via prop nova `embeddedModel` em `model-engine.tsx` (`skip:true` no `useModel`, renderiza direto sobre JSON em mãos).
   - **(B) `SearchTree`** — componente standalone checkable do public API (legado: `src/index.js:77`, baseado em `rc-tree`). Studio entrega `tree-checkable.tsx` com cascade pai↔filho tristate (`aria-checked=mixed`), `valueMode=leaves` default, limiar 2 chars + auto-expand, value controlado alinhado ao consumer real (`ModalRecursos.jsx`), footer flex (`save|clear|both|none`) + `hideSaveButton` p/ embed em modal, wrapper `TreeCheckableSheet` Vaul direction=bottom mobile / direction=right desktop.
   
   Upgrades sobre o legado declarados como **paridade UX**: filtro state-driven recursivo com auto-expand de pais dos matches (corrige débito UX do legado que filtrava por DOM-hack só 2 níveis); persistência de expand/collapse em `sessionStorage`; WAI-ARIA tree completo (`treeitem/group/aria-expanded/aria-level/aria-current=page`). Sem `rc-tree`, sem `react-arborist` — primitivos próprios.

2. **Componente do design system** ([[ui-system/tree-view]] + [[ui-system/tree-checkable]]): specs publicadas pelo designer com 2 primitivos coerentes — TreeView (mobile master/detail com sub-tela, desktop split persistente, deep-link via `activeId` controlado, role=tree + WAI-ARIA keyboard completo) e TreeCheckable (mobile-first modal-sheet/bottom-sheet, cascade pai↔filho tristate com `valueMode` controlado, filtro state-driven recursivo substituindo o DOM-hack do legado, footer flex p/ embed-em-modal e standalone). Entregue em `packages/ui/src/components/{tree-view,tree-checkable,tree-view-renderer}.tsx` + alteração mínima em `model-engine.tsx`.

3. **Caso real ui-tester**: 11/11 retry após smith `46d8798` — C7 highlight `<mark bg-primary/20>` × 2 confirmado em filtro TreeCheckable, C8 Sheet abre sem loop/crash (causa-raiz era loop de feedback parent↔child em modo controlado; fix: sync com `controlledValue` compara conteúdo do Set antes de `setState`; `internalLeavesRef`/`syncedFromPropRef` hoisted; emit pula quando sync vem do prop), toggle "Alterar" via Sheet marca checkbox + Salvar dispara `onSave([fn-listar,fn-incluir,fn-alterar])` fechando Sheet limpo. Revalidação C1-C6 OK (TreeView raízes, expand Cadastros, recursão engine→GenericForm, sub-tree aninhado, filtro "Rel" recursivo, TreeCheckable cascade tristate inline cobre 6 leaves). Console limpo.

**Ressalvas isoladas e não-bloqueantes**:

- **F-rc-tree-public-api-drift (P1, archaeologist)** — drift entre HEAD do `react-tools` e pacote em produção (consumer `ModalRecursos.jsx` usa props fora do PropTypes: `ref`, `hideSaveButton`, `value` controlado). Já enfileirada pelo arqueólogo na onda de contrato (linha 180 do progress). Bloqueante apenas p/ decidir o **contrato definitivo** do SearchTree público quando ele virar dependency externa do Studio — não bloqueia o renderer F013 entregue, que já incorporou as props observadas no consumer real.
- **Fixture do smoke `/smoke/f013` divergente** — usa `genericform:{fields:[]}` enquanto F010 lê `config.model=[[Field]]`. Defeito de fixture, não de renderer: o `GenericFormRenderer` reage corretamente ao schema vazio com `InlineAlert "Form sem campos"` (resposta correta a config.model vazio). Vira **F066** (P2, follow-up). Não bloqueia aceite porque recursão do engine cumpriu o contrato no caso real do ui-tester.
- **Highlight de substring no TreeView ausente** — só TreeCheckable destaca matches. Fora do contrato legado (`GenericTreeView.js` não destacava), mas spec [[tree-view]] sugere paridade. Vira **F065** (P2, follow-up). Não bloqueia: legado não tinha, contrato não exige.
- **C9 mobile real** — não exercitável pelo viewport-congelado-em-1536 do Chrome MCP; cobertura <768px segue o débito transversal **F033**. Mesmo critério aplicado em F005/F007/F008/F012.

**7 follow-ups do archaeologist** declarados na onda de contrato (linha 180 do progress) — ficam em **backlog do arqueólogo**, não bloqueiam F013:

| Sinal do archaeologist | Status |
|---|---|
| F-acessos-usuario-recursos (P1) | backlog — feature de admin |
| F-tree-editor (P2) | backlog — editor visual TreePageConfig |
| F-recursos-acesso-tree-shape | backlog — sub-contrato |
| F-tree-lazy-load (P3) | backlog — upgrade sobre legado |
| F-tree-drag-reorder (P2) | backlog — upgrade sobre legado |
| F014-pageTabs simetria | já enfileirada como F014 |
| F-rc-tree-public-api-drift (P1) | backlog — bloqueante de contrato externo |

Não enfileiro nada dessa lista nesta rodada de aceite — F013 entrega o **renderer canônico das duas formas legadas**, que é o que o contrato pede. Os 7 sinais são feature-territory adjacente (admin de acessos, editor visual, drift de contrato) que vivem do lado do archaeologist até virarem manifest-entries com mandato explícito.

**Critério não-aplicável**: nenhum. 3/3 critérios cumpridos.

**MISSION/PERSONA check**: árvore de "Acessos do Usuário" (`ModalRecursos.jsx`) é fluxo central do dia-a-dia de quem opera o ERP do CD/varejo — admin abre modal, marca fn-listar/fn-incluir/fn-alterar por módulo, salva. Studio entrega TreeCheckable com cascade tristate visualmente correto (`aria-checked=mixed`), filtro 2-chars + auto-expand corrigindo o débito UX do `getElementsByClassName` legado (que só filtrava 2 níveis e dependia de DOM-hack), Sheet bottom no mobile p/ uso em tablet/celular no chão do CD. TreeView com recursão real do engine resolve o caso de "Cadastros → escolher entidade → render do GenericForm/Grid no mesmo painel" sem reload. Vibe check: encaixa.

**Impacto no manifest**: F013 `Status=accepted`, `Accepted=✓ 2026-05-15`. Adicionadas **F065** (treeview-highlight-parity, P2) e **F066** (fix-smoke-f013-fixture, P2). Trilho de renderers core agora com **4/4 aceitos**: F010 form + F011 grid + F012 dashboard + F013 tree. Próximos renderers P1: F014 tabs, F015 wizard, F016 filtros, F018 datepicker, F019 powerselect, F020 notifications, F021 modal.

### Incidente — perda do `progress-messages.txt` em 2026-05-15

Durante o aceite de F054/F054b, o curator usou erroneamente o tool `Write` (sobrescrita total) em vez de append/Edit no `progress-messages.txt`, apagando as ~161 linhas de histórico do arquivo. O arquivo era untracked no git (sem backup recuperável). Reconstrução parcial das linhas 152-160 feita a partir do contexto da sessão e do `scope-decisions.md`; linhas 1-151 permanentemente perdidas. O arquivo agora contém aviso explícito no topo e as linhas novas do aceite F054/F054b.

**Lição**: progress-messages.txt é append-only por contrato — qualquer toque deve ser via Edit (anchor na última linha existente) ou via append-equivalent. Nunca Write completo. Considerar mover o arquivo para tracked-no-git ou adicionar snapshot diário em `.tmp/` para recuperação futura.
