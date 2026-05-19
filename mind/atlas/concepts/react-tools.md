---
title: "@engenharia/react-tools"
aliases: [react-tools, engenharia-react-tools]
tags: [framework, processa, frontend, react, biblioteca]
sources:
  - "calendar/notes/2026-05-15.md"
  - "calendar/notes/2026-05-16.md"
created: 2026-05-15
updated: 2026-05-19
---

# `@engenharia/react-tools`

Pacote npm interno da Processa (`http://gitlab.processa.info/engenharia/fabrica/javascript/react-tools`) que implementa o **runtime atual de renderização schema-driven** dos apps Processa. Fonte clonada em `sources/engenharia--fabrica--javascript--react-tools/`. Exporta `<AppMain />` — um componente raiz que descobre rotas, telas e ações em runtime consultando o backend, que por sua vez lê o [[acesso-metamodel]]. É o ancestral conceitual direto de [[director-studio]]: o Studio reimplementa o contrato do react-tools em stack moderna (Vite + shadcn + Tailwind 4), sem dependência do pacote.

## Key Points

- **Consumido por 4 frontends Processa** (versões 2026-05-15): Director.Web/WMS `3.1.77-fix004`, Portal Director `^3.1.46`, AppBuilder `3.1.102`, ADM `2.1.0-043` (legado, empacotado local via `.tgz`).
- **`<AppMain />` é a peça central**: aceita flags `useLegacy`, `useAuthRoute`, `useSidebar`, `useConnections` e monta toda a aplicação a partir delas + dados do backend.
- **`AuthProvider`** (em `src/contexts/AuthProvider.js`) faz Basic auth em `/api/auth` e armazena JWT em `localStorage["@director/tkn"]` + user em `@director/usr`. Sessão expira por mensagem `"Lifetime validation failed. The token is expired."` retornada pelo `Processa.Sdk` (ver [[processa-auth-paths]]).
- **Default branch trava em 2.1.0**; as versões 3.x consumidas em produção vivem em outras branches/tags do mesmo repo. Branch policy não verificada.
- **Componentes notáveis em `src/components/`**: `AppMain/`, `AuthRoute`, `DataGrid`, `DataGrid2`, `GenericForm/`, `GenericPage/`, `GenericPages/`, `PowerSelect3/`, `Filtro/`, `DashBoard/`, `SearchTree/`, `Notifications/`, `FileBrowser/`. Cada um é um tipo de "model" que o renderer sabe instanciar.
- **PowerSelect: 3 versões coexistentes** (ver [[power-select-versions]]): V1 (`PowerSelect.js`, async + react-select), V2 (`PowerSelect2.js`, react-select sem fetch), V3 (`PowerSelect3/`, modal + filtro client-side). Hook `useSelectFields` (ver [[select-options-endpoint]]) encapsula a convenção de carga de opções para os 3. Nenhuma versão implementa debounce, cancel ou cache próprio.

## Details

O react-tools é a evidência empírica mais forte da viabilidade do [[director-studio]]: o `src/index.jsx` do Director.Web tem literalmente 20 linhas e só monta `<AppMain useLegacy={false} useAuthRoute useSidebar useConnections />` — toda a UI vem do banco em runtime. Replicar esse padrão com componentes shadcn é o caminho mais curto para o Studio.

O pacote é mantido por um único autor (`joaolucasgtr` no `package.json:5`) e usa `microbundle-crl` como build tool — sinais de baixa cadência de evolução e dependência humana concentrada, o que reforça a justificativa de reimplementação. As versões 3.x consumidas pelos apps recentes não estão no branch default visível, indicando workflow git informal (provavelmente branches longas, sem PR/MR padronizado).

A interop atual via localStorage é problemática do ponto de vista de segurança (XSS expõe JWT) e impede subdomínios diferentes para apps diferentes sem `SameSite=None`. Director.Studio diverge nesse ponto: cookie httpOnly + sessão Redis. Studio não consome `react-tools` — usa-o apenas como **referência de contrato** (quais procs chamar, qual formato de resposta esperar, quais flags de `<AppMain />` representam quais comportamentos).

## Related Concepts

- [[director-studio]] — projeto que substitui o react-tools mantendo o contrato
- [[acesso-metamodel]] — schema do banco que o react-tools renderiza
- [[processa-auth-paths]] — modelo de auth implementado pelo `AuthProvider` do react-tools
- [[appbuilder]] — consumidor do react-tools (versão 3.1.102 em 2026-05-15)
- [[director-web]] — consumidor com a implementação mais minimalista (20 linhas)
- [[power-select-versions]] — 3 versões coexistentes de PowerSelect descobertas em escavação F019
- [[select-options-endpoint]] — hook `useSelectFields` que encapsula a convenção de carga de opções

## Sources

- [[calendar/notes/2026-05-15.md]] — clone do repo `engenharia/fabrica/javascript/react-tools`; leitura de `AuthProvider.js`, `Login.js`, `AppMain/`; mapeamento de versões consumidas pelos 4 frontends do ecossistema
- [[calendar/notes/2026-05-16.md]] — escavação F019: descoberta das 3 versões de PowerSelect, hook `useSelectFields`, auditoria de cache/debounce/cancel
