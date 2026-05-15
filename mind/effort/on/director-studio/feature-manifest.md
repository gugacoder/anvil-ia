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
| F005 | shell | App layout (sidebar + header) | `react-tools/AppMain/` | TBD | P0 | todo | — | — |
| F006 | shell | Theme claro/escuro/auto (default auto) | n/a (novo) | n/a | P0 | accepted | ✓ 2026-05-15 | ✓ 2026-05-15 |
| F007 | shell | Menu hierárquico a partir de `acesso.obter_rotas_aplicacao` | `acesso.obter_rotas_aplicacao.sql` | TBD | P0 | todo | — | — |
| F008 | shell | ACL por papel × função × página | `acesso.obter_acl_usuario_aplicacao.sql` | TBD | P0 | todo | — | — |
| F009 | render | Engine schema-driven (dispatch por DFtipo) | `react-tools/components/AppMain/` + `acesso.obter_model_pagina` | TBD | P0 | todo | — | — |
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

## Backlog do arqueólogo

Features ainda não enumeradas — descoberta pendente:

- Catalogar **todos** os componentes em `react-tools/src/components/` que faltam acima
- Catalogar **todas** as procs em `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.*`
- Catalogar **todas** as tabelas em `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TB*`
- Catalogar features fora do AppMain (e.g. Mobile, SignalR Hub, edoc, sped, fornecedor portal)

Cada item descoberto **vira linha nova nesta tabela**, com `Source` + `Contract` apontado.
