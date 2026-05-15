---
title: "Director.Studio"
aliases: [director-studio, studio, director.studio]
tags: [plataforma, processa, renderizacao, metamodelo, projeto]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Director.Studio

Plataforma única de renderização de apps Processa, derivada da percepção de que **o ecossistema atual (AppBuilder + Director.Web/WMS + Portal Director + Pipeliner + ADM) já compartilha schema, framework de UI e modelo de auth** — diverge apenas em quais metadados consome do banco. Director.Studio reescreve esse runtime como **um único processo Node** que substitui os 4-5 serviços Windows .NET locais, lê o metamodelo [[acesso-metamodel]] e renderiza qualquer "app" como configuração, não como código.

A nomenclatura segue o padrão de IDEs/ambientes de engenharia (Visual Studio, Android Studio, Data Studio): "Studio" é o ambiente onde se constroem e operam os apps Director, não uma metáfora teatral. O time dev hoje chama essa camada de "AppBuilder" — o Studio é a evolução: deixa de ser só o cadastro e passa a ser também o runtime unificado, eliminando a divisão cadastro-vs-execução documentada em [[appbuilder-directorweb-topology]].

## Key Points

- **Tese central**: o banco já é a linguagem. `acesso.TBaplicacao` discrimina apps, `acesso.TBmodel_pagina` descreve telas, `acesso.TBmodulo`/`TBpagina` formam menus. Renderizar isso uma única vez substitui N frontends.
- **Substitui (não convive com)** AppBuilder, Portal Director, Director.Web/WMS, ADM. Frontends .NET deixam de existir no servidor do cliente.
- **Backend Node** fala direto com SQL local (mssql) e com o bridge AWS em `52.67.203.133:4306` (ver [[processa-auth-paths]]) — sem .NET intermediário.
- **Auth idêntico ao atual** nos 5 caminhos do [[processa-auth-paths]]; o Studio é mais um cliente Processa do ponto de vista do bridge AWS.
- **Frontend é casca**: a tese é a mesma do `<AppMain />` do [[react-tools]], mas a implementação é livre — shadcn/Tailwind ao invés do Bootstrap/CSS custom do react-tools.

## Diagrama — Topologia atual vs Studio

**Hoje** (servidor do cliente roda 3-5 serviços .NET):

```
                  ┌──────────────────────────────────────┐
                  │  AWS 52.67.203.133                    │
                  │    :4306  LDAP bridge / auth          │
                  │    :????  hub central / sync          │
                  └──────────────────────────────────────┘
                                  ▲ HTTP Bearer JWT
                                  │
        ┌─────────────────────────┼─────────────────────────┐
        │                         │                         │
   ┌────┴──────┐         ┌────────┴────┐         ┌──────────┴─┐
   │ Portal    │         │ Director    │         │ AppBuilder │
   │ Director  │         │ .Web/WMS    │         │            │
   │ :4300     │         │ :4600       │         │ :4305      │
   │ (.NET)    │         │ (.NET)      │         │ (.NET)     │
   └────┬──────┘         └────────┬────┘         └──────┬─────┘
        │                         │                     │
        └─────────────────┬───────┴─────────────────────┘
                          ▼
                   ┌─────────────┐
                   │ DBdirector  │
                   │ SQL Server  │
                   │ acesso.*    │
                   └─────────────┘
```

**Studio** (servidor do cliente roda 1 processo Node):

```
                  ┌──────────────────────────────────────┐
                  │  AWS 52.67.203.133                    │
                  │    :4306  LDAP bridge / auth          │
                  └──────────────────────────────────────┘
                                  ▲ HTTP Bearer JWT
                                  │ (caminho LDAP, replicado)
                                  │
                  ┌───────────────┴────────────────┐
                  │   Director.Studio (Node)       │
                  │   ┌──────────────────────────┐ │
                  │   │ apps/director-studio     │ │
                  │   │  (Vite + React + shadcn) │ │
                  │   └──────────┬───────────────┘ │
                  │              │ /api/* (mesmo host)
                  │   ┌──────────┴───────────────┐ │
                  │   │ apps/api  (Hono)         │ │
                  │   │  • renderer schema-driven│ │
                  │   │  • auth (5 caminhos)     │ │
                  │   │  • sessão (cookie+Redis) │ │
                  │   │  • SSE para realtime     │ │
                  │   └────┬─────────────┬───────┘ │
                  └────────┼─────────────┼─────────┘
                           │             │
                           ▼             ▼
                  ┌─────────────┐  ┌──────────┐
                  │ DBdirector  │  │  Redis   │
                  │ acesso.*    │  │ sessões  │
                  └─────────────┘  └──────────┘
```

## Details

Director.Studio nasce da observação empírica de que os 4 frontends Processa clonados (`engenharia--fabrica--dotnet-core--director.web`, `engenharia--fabrica--dotnet-core--director`, `engenharia--fabrica--dotnet--processa.appbuilder`, `engenharia--fabrica--dotnet--processa.ADM`) consomem todos `@engenharia/react-tools` (ver [[react-tools]]), conectam todos ao mesmo `DBdirector_*` no mesmo SQL Server, e diferem apenas no `id_aplicacao`/chave que usam para discriminar metadados. O Director.Web é a evidência mais forte: seu `src/index.jsx` tem 20 linhas e só monta `<AppMain />` — toda a UI vem do banco em runtime.

Replicar esse mesmo contrato (procs de `acesso.*` documentadas em [[acesso-metamodel]] como `obter_rotas_aplicacao`, `obter_model_pagina`, `obter_acl_usuario_aplicacao`, `obter_opcoes_selecao`) com um runtime próprio é o caminho mais curto para colapsar a operação. O ganho não é "menos código" — é colapsar o ciclo de mudança: hoje editar um fluxo exige editar C# + recompilar + MSI + parar serviço + reinstalar + abrir firewall (ver [[area-52]]). No modelo Studio é editar metadado + recarregar.

A separação cadastro-vs-runtime do [[appbuilder]]/[[director-web]] também desaparece: o Studio renderiza o próprio cadastro como mais um app da `TBaplicacao`. O AppBuilder vira "configuração de metadados editando si mesmo" — padrão meta-CMS / self-hosted (Retool, Budibase, Directus seguem o mesmo princípio).

O risco arquitetural está concentrado no item 2 da análise (runtime de templates): replicar bit-a-bit o contrato do `react-tools.AppMain` com o backend .NET. Cada convenção implícita (campo opcional X que muda comportamento, flag Y interpretada de jeito sutil) precisa ser descoberta — daí a frente de documentação do metamodelo precede a implementação.

## Related Concepts

- [[acesso-metamodel]] — schema `acesso.*` que descreve apps/menus/páginas no banco; é o contrato que o Studio renderiza
- [[processa-auth-paths]] — os 5 caminhos de autenticação que o Studio precisa cobrir; a chave para eliminar .NET local
- [[react-tools]] — framework JS atual que faz hoje o que o Studio fará; referência de contrato, não de implementação
- [[appbuilder]] — sistema legado que é o ancestral conceitual do Studio (cadastro); será absorvido
- [[director-web]] — frontend operacional cuja simplicidade (20 linhas) é a evidência mais forte da viabilidade do Studio
- [[appbuilder-directorweb-topology]] — separação cadastro/runtime atual, que o Studio dissolve

## Sources

- [[calendar/notes/2026-05-15.md]] — sessão de descoberta do metamodelo, leitura do `Processa.Sdk.Auth`, decisão pelo nome Director.Studio, escopo do protótipo em `workspace/director-studio/`
