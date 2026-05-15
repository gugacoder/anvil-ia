---
title: "Director.Studio — Feature Manifest"
aliases: [feature-manifest, director-studio-manifest]
tags: [effort, director-studio, manifest, scope]
created: 2026-05-15
updated: 2026-05-15
---

# Feature Manifest — Director.Studio

> Tabela mestre de features. **100% RTM**, sem exceção. Curator preenche `priority` e `accepted`; archaeologist preenche `source` e `contract`; smith preenche `status`; ui-tester preenche `tested`.

## Convenções

- **Status**: `todo` → `wip` → `ready-for-test` → `tested` → `accepted`
- **Cobertura mandatória**: nenhuma feature do react-tools/AppMain pode ficar de fora.
- **Critério de "done"**: passa em `ui-tester` contra o contrato + spec do design system, com pelo menos um caso real (não fixture) da Área 52.
- **Sem MVP, sem mock, sem placeholder**. Se faltar contrato, archaeologist é chamado; se faltar UX, designer é chamado.

## Áreas

A descobrir pelo arqueólogo. Seed inicial baseado no que já mapeamos:

- **infra**: bootstrap, .env wizard, sessão, observabilidade
- **auth**: 5 caminhos do `processa-auth-paths`
- **shell**: boot gate, layout, sidebar, header, theme, breadcrumbs
- **render**: engine schema-driven que consome `acesso.obter_model_pagina`
- **components**: tipos de `TBmodel_pagina.DFtipo` (form, grid, dashboard, tabs, tree, wizard, ...)
- **integrations**: bridge AWS, hub SignalR (= SSE no Studio), portal-aws cross-tenant
- **admin**: cadastros do próprio AppBuilder (TBaplicacao, TBmodel_pagina, etc.) renderizados pelo Studio

## Features

| ID | Área | Feature | Source (sources/...) | Contract (atlas link) | Priority | Status | Tested | Accepted |
|---|---|---|---|---|---|---|---|---|
| F001 | infra | Setup wizard de primeira execução | n/a (próprio) | n/a | P0 | done | — | — |
| F002 | infra | Boot gate + splashscreen | n/a (próprio) | n/a | P0 | done | — | — |
| F003 | auth | Login híbrido (5 caminhos) | `processa.sdk/Fontes/Processa.Sdk.Auth/` | [[processa-auth-paths]] | P0 | accepted | ✓ 2026-05-15 | ✓ 2026-05-15 |
| F004 | auth | Sessão httpOnly cookie + Redis | derivado | [[processa-auth-paths]] | P0 | accepted | ✓ 2026-05-15 | ✓ 2026-05-15 |
| F005 | shell | App layout (sidebar + header) | `react-tools/AppMain/` | [[app-main]] | P0 | accepted | ✓ 2026-05-15 (7/8, C2 mobile → F033) | ✓ 2026-05-15 |
| F006 | shell | Theme claro/escuro/auto (default auto) | n/a (novo) | n/a | P0 | accepted | ✓ 2026-05-15 | ✓ 2026-05-15 |
| F007 | shell | Menu hierárquico (proc canônica: `acesso.obter_acl_token`; `obter_rotas_aplicacao` é auxiliar) | `acesso.obter_acl_token.sql` + `react-tools/hooks/useAcl.js` + `react-tools/components/AppMain/AppSidebar.js` | [[menu-hierarquia]] + [[acesso-obter-rotas-aplicacao]] | P0 | accepted | ✓ 2026-05-15 (C7 mobile → F033) | ✓ 2026-05-15 |
| F008 | shell | ACL por papel × função × página (proc canônica: `acesso.obter_acl_token` — mesma de F007; `obter_acl_usuario_aplicacao` é proc paralela, retorna papéis/recursos crus) | `acesso.obter_acl_token.sql` + `react-tools/hooks/useAcl.js` + `react-tools/components/GenericPage/GenericTabPage.js` (+ tabelas `acesso.TBpapel*`, `acesso.TBrecurso_adicional`, `acesso.TBfuncao`, `acesso.TBmodulo`) | [[acl-papel-funcao-pagina]] | P0 | accepted | ✓ 2026-05-15 (7/8, C5 denial n/a → F035) | ✓ 2026-05-15 |
| F009 | render | Engine schema-driven (dispatch por presença de chave, **não** por DFtipo — vide contrato) | `react-tools/components/GenericPages/` + `react-tools/components/GenericPage/` + `acesso.obter_model_pagina` + `PortalDirector.Repositories/GenericPagesRepository.cs` | [[engine-schema-driven]] + [[obter-model-pagina]] | P0 | accepted | ✓ 2026-05-15 (8/8; C3 exercitado via fetch-stub p/ contornar ACL — única page com model na base é `wms.cadastros_grupo-de-trabalho`, fora do menu PROCESSA — comportamento do engine + payload real do banco; sem regressão F007/F008) | ✓ 2026-05-15 (stub C3 cobre só pareamento URL→pageKey; engine+fetch+parse+dispatch são reais; F043 enfileirada p/ destravar F010+) |
| F010 | components | Renderer DFtipo=form | `react-tools/components/GenericForm/` | TBD | P0 | todo | — | — |
| F011 | components | Renderer DFtipo=grid (DataGrid2) | `react-tools/components/DataGrid2/` | TBD | P0 | todo | — | — |
| F012 | components | Renderer DFtipo=dashboard | `react-tools/components/DashBoard/` | TBD | P1 | todo | — | — |
| F013 | components | Renderer DFtipo=tree (SearchTree) | `react-tools/components/SearchTree/` | TBD | P1 | todo | — | — |
| F014 | components | Renderer DFtipo=tabs | `react-tools/components/PageTabs/` | TBD | P1 | todo | — | — |
| F015 | components | Renderer DFtipo=wizard / Steps | `react-tools/components/GenericPages/` | TBD | P1 | todo | — | — |
| F016 | components | Filtros (Filtro/) | `react-tools/components/Filtro/` | TBD | P1 | todo | — | — |
| F017 | components | FileBrowser | `react-tools/components/FileBrowser/` | TBD | P2 | todo | — | — |
| F018 | components | DateTimePicker / DateInterval | `react-tools/components/DateComponents/` | TBD | P1 | todo | — | — |
| F019 | components | PowerSelect (typeahead + async) | `react-tools/components/PowerSelect3/` | TBD | P1 | todo | — | — |
| F020 | components | Notifications (toast/banner) | `react-tools/components/Notifications/` | TBD | P1 | todo | — | — |
| F021 | components | Modal / ActionModal | `react-tools/components/ActionModal/` | TBD | P1 | todo | — | — |
| F022 | components | ReorderableGrid | `react-tools/components/ReorderableGrid/` | TBD | P2 | todo | — | — |
| F023 | integrations | Hub realtime (substitui SignalR por SSE) | `Director.Portal.Aplicacao/HubMobileHandler.cs` | TBD | P0 | todo | — | — |
| F024 | integrations | Bridge AWS (sync + auth) | `Director.Portal.Api/PortalAwsClient.cs` | TBD | P0 | todo | — | — |
| F025 | admin | Cadastro de Aplicações (TBaplicacao) | `appbuilder/website/src/routes/` | TBD | P1 | todo | — | — |
| F026 | admin | Cadastro de Páginas/Models (TBmodel_pagina) | `appbuilder/website/src/routes/Pipeliner/` | TBD | P1 | todo | — | — |
| F027 | shell | Anti-FOUC theme bootstrap inline (script em index.html aplica `.dark` antes do mount React) | n/a (novo, derivado de F006) | n/a | P1 | todo | — | — |
| F028 | auth | Atualizar contrato `processa-auth-paths` (DFnome_empresa → DFnome_fantasia; alinhar com .cs canônico + DDL) | `processa.sdk/Fontes/Processa.Sdk.Api/Settings.cs` | [[processa-auth-paths]] | P1 | todo | — | — |
| F029 | auth | Alinhar nome do cookie de sessão entre spec e impl (`director_session` vs `director_studio_session`) | n/a (próprio) | [[processa-auth-paths]] | P2 | todo | — | — |
| F030 | components | FormField — `aria-invalid="true"` quando em estado error (spec [[form-field]] §95) | n/a (próprio) | [[form-field]] | P1 | todo | — | — |
| F031 | infra | Setup wizard deve escrever `REDIS_URL=redis://localhost:${REDIS_PORT}` derivado de PREFIX (não hardcoded :6379) | n/a (próprio, follow-up de F001/F004) | n/a | P1 | todo | — | — |
| F032 | infra | `config.ts` deve respeitar env externa (env explícita ganha de `.env`, convenção UNIX) | n/a (próprio, follow-up de F004) | n/a | P2 | todo | — | — |
| F033 | shell | Validar shell em viewport mobile real <768px (drawer-up + shortcut-bar bottom + sidebar oculta) — F005 C2 não exercitável no Chrome MCP (viewport travado em 1536px); requer device emulation real (CDP `Emulation.setDeviceMetricsOverride`) ou browser real em 375/414/767px | n/a (follow-up de F005/F007) | [[app-shell]] | P1 | todo | — | — |
| F034 | shell | Corrigir mojibake em `aria-label` da Sidebar (double UTF-8 encoding ao setar atributo — `Configurações` vira `ConfiguraÃ§Ãµes`; `textContent` OK). Causa-raiz no pipeline de encoding do atributo, não no menu. Afeta a11y do rail (tooltip/leitor de tela). | n/a (follow-up de F007) | [[sidebar]] + [[menu-hierarquia]] | P1 | todo | — | — |
| F035 | shell | Validar empiricamente o caminho de denial da ACL (`canAccessPath=false` → `<AccessDenied/>` com `InlineAlert variant=warning`; `<AclGate>` com `fallback`). F008 C5 não exercitável pois PROCESSA/id=1 é super-user (bypass total) e `TBfuncao`/`TBpapel_funcao_pagina_modulo.DFid_funcoes` da base `imperial_logistica_29/portal-director` está vazia. Requer (a) seed de TBusuario não-super com papel limitado em Area 52, ou (b) override `STUDIO_EMPRESA` ≠ Processa para forçar branch normal no user 1. | n/a (follow-up de F008) | [[acl-papel-funcao-pagina]] | P1 | todo | — | — |
| F036 | components | Renderer GenericCalendar (chave `genericcalendar` no model) — vista calendário/agenda como discriminante de página | `react-tools/components/GenericCalendar/` | TBD | P1 | todo | — | — |
| F037 | components | Renderer GenericActionForm (chave `genericactionform` no model) — form de ações agrupadas (`actionGroups`); template `TemplateFormularioAcoes` | `react-tools/components/GenericPage/GenericActionForm.js` | TBD | P1 | todo | — | — |
| F038 | components | Renderer GenericGridCollection (chave `genericgridcollection` no model) — múltiplos grids compostos com filtro compartilhado; template `TemplateGrids` | `react-tools/components/GenericPage/GenericGridCollection.js` | TBD | P2 | todo | — | — |
| F039 | render | Inventário e migração de `acesso.TBfuncao_model` (catalogar todas as funções JS cadastradas por aplicação para decidir estratégia: transpile vs sandbox vs reescrita) — pré-requisito para remoção de `eval` no Studio | `acesso.TBfuncao_model` + `react-tools/components/GenericPage/GenericPage.js:61-98` | [[engine-schema-driven]] | P0 | todo | — | — |
| F040 | render | Inventário e migração de `acesso.TBmodel_parametro` (catalogar todos os `dParamX` para decidir contrato de interpolação no Studio) — pré-requisito para remoção de `eval` no caminho de fetch | `acesso.TBmodel_parametro` + `react-tools/components/GenericPages/GenericPages.js:26-58` | [[engine-schema-driven]] + [[obter-model-pagina]] | P0 | todo | — | — |
| F041 | render | Política de cache/refresh do model no Studio (legado: sem cache, 1 fetch por mount de aba, sem skeleton durante carga) — decisão de UX + persistência | `react-tools/components/GenericPages/GenericPages.js:96-104` | [[engine-schema-driven]] | P1 | todo | — | — |
| F042 | render | Cross-app fallback do model (`OR DFchave='processa'` no repo .NET — páginas core compartilhadas entre apps) — replicar ou redesenhar tenancy | `PortalDirector.Repositories/GenericPagesRepository.cs:11-21` | [[obter-model-pagina]] | P1 | todo | — | — |
| F043 | infra | Seed de models `portal-director` em base de teste (Area 52) — `DBdirector_imperial_logistica_29` só tem 6 models `wms.*`, impedindo validação end-to-end (menu→ACL→engine) de F010+; sem seed, todo renderer cai no mesmo fetch-stub de F009 C3. Decidir: (a) carregar `processa.appbuilder/1-alimentacao/*.sql` na base 52, (b) clonar base com models reais, ou (c) criar fixture mínima por feature. Pré-requisito para F010-F022 sem stub. | n/a (follow-up de F009) | [[obter-model-pagina]] | P0 | todo | — | — |

## Backlog do arqueólogo

Features ainda não enumeradas — descoberta pendente:

- Catalogar **todos** os componentes em `react-tools/src/components/` que faltam acima
- Catalogar **todas** as procs em `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.*`
- Catalogar **todas** as tabelas em `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TB*`
- Catalogar features fora do AppMain (e.g. Mobile, SignalR Hub, edoc, sped, fornecedor portal)

Cada item descoberto **vira linha nova nesta tabela**, com `Source` + `Contract` apontado.
