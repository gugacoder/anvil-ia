---
title: "Director.Studio"
aliases: [director-studio, studio, director.studio, processa-studio]
tags: [plataforma, processa, renderizacao, metamodelo, projeto]
sources:
  - "calendar/notes/2026-05-15.md"
  - "calendar/notes/2026-05-19.md"
created: 2026-05-15
updated: 2026-05-23
---

# Director.Studio

Plataforma única de renderização de apps Processa, derivada da percepção de que **o ecossistema atual (AppBuilder + Director.Web/WMS + Portal Director + Pipeliner + ADM) já compartilha schema, framework de UI e modelo de auth** — diverge apenas em quais metadados consome do banco. Director.Studio reescreve esse runtime como **um único processo Node** que substitui os 4-5 serviços Windows .NET locais, lê o metamodelo [[acesso-metamodel]] e renderiza qualquer "app" como configuração, não como código.

A nomenclatura segue o padrão de IDEs/ambientes de engenharia (Visual Studio, Android Studio, Data Studio): "Studio" é o ambiente onde se constroem e operam os apps Director, não uma metáfora teatral. O time dev hoje chama essa camada de "AppBuilder" — o Studio é a evolução: deixa de ser só o cadastro e passa a ser também o runtime unificado, eliminando a divisão cadastro-vs-execução documentada em [[appbuilder-directorweb-topology]].

**Brand exposto ao cliente: "Processa Studio"** (com espaço, não ponto). "Director.Studio" é nome interno do projeto/plataforma. A distinção surgiu da auditoria pós-harness (2026-05-19): cliente real confunde "Director.Studio" com o nome do app. O smith atualizou 5 telas + manifest PWA para exibir "Processa Studio" com logomarca em vez de texto.

## Key Points

- **Tese central**: o banco já é a linguagem. `acesso.TBaplicacao` discrimina apps, `acesso.TBmodel_pagina` descreve telas, `acesso.TBmodulo`/`TBpagina` formam menus. Renderizar isso uma única vez substitui N frontends.
- **Substitui (não convive com)** AppBuilder, Portal Director, Director.Web/WMS, ADM. Frontends .NET deixam de existir no servidor do cliente.
- **Backend Node** fala direto com SQL local (mssql) e com o bridge AWS em `52.67.203.133:4306` (ver [[processa-auth-paths]]) — sem .NET intermediário.
- **Auth idêntico ao atual** nos 5 caminhos do [[processa-auth-paths]]; o Studio é mais um cliente Processa do ponto de vista do bridge AWS.
- **Frontend é casca**: a tese é a mesma do `<AppMain />` do [[react-tools]], mas a implementação é livre — shadcn/Tailwind ao invés do Bootstrap/CSS custom do react-tools.
- **Stack definido**: Vite 7 + React 19 + TanStack Router + Tailwind 4 + shadcn v4 + Phosphor Icons (Lucide proibido) + Framer Motion + Vaul + next-themes. Backend: Hono + Pino + tsx + mssql + ioredis + SSE (polling e WebSocket proibidos).
- **Auth diverge do legado**: cookie httpOnly + sessão server-side (Redis no protótipo → tabela SQL pré-cutover). Studio NÃO emite JWT compatível com Processa.Sdk salvo em modo `processa-interop`. Valida senhas via `dbo.VALIDAR_CRIPT` (ver [[validar-cript]]) durante coexistência.
- **Time de 5 agentes**: archaeologist, designer, curator, smith, ui-tester — separação rígida de mandatos com princípio de não-contaminação (ver [[director-studio-agent-team]]). Execução via wave model feature-locked (ver [[director-studio-wave-model]]).

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

### Stack e infraestrutura (2026-05-15)

Frontend: Vite 7, React 19, TanStack Router, Tailwind 4, shadcn v4, Phosphor Icons (Lucide proibido — conflito com Design System), Framer Motion, Vaul, next-themes (default `system`/auto). Backend: Hono (não Express), Pino (logger), tsx (dev runner), mssql (driver SQL Server), ioredis (sessões), SSE para realtime (polling proibido, WebSocket proibido).

Infra Docker em 3 compose files: `platform.yml` (SQL Server + Redis), `platform.dev-ports.yml` (portas de dev), `docker-compose.yml` (app). Scripts npm `platform:up/down` (dev) e `docker:up/down` (prod) via `dotenv-cli`. Caddy embarcado como proxy reverso interno com `host.docker.internal:host-gateway`. Convenção PREFIX de portas: `${PREFIX}00`=Caddy, `${PREFIX}01-09`=apps, `${PREFIX}10+`=serviços extras — permite N projetos paralelos sem colisão.

Auth do Studio diverge conscientemente do legado: cookie httpOnly + sessão server-side (Redis no protótipo, tabela SQL antes do cutover final). O Studio NÃO emite JWT compatível com `Consts.SecretKey` do Processa.Sdk salvo em modo `processa-interop` para coexistência. Wizard de setup escreve `.env` atomicamente; LDAP continua via bridge AWS (não direto).

Descoberta operacional: `AuthQuery` usa schema `dbo.*` (não `acesso.*`) na maioria das bases — `TBusuario` e `TBempresa` vivem em `dbo`. Smith implementou schema-aware probe via `INFORMATION_SCHEMA` com fallback `acesso→dbo` e cache. `portal.UsuarioFornecedor` (auth path 4 — fornecedor por email) não existe em toda base — é específico de instalações com integração de fornecedores.

### Manifest seed (2026-05-15) → 132 features (2026-05-19)

27 features (F001-F027) no seed inicial do `feature-manifest.md`. Expandido para 132 features (F001-F131) durante execução do harness Ralph Loop. 50 features foram bulk-deferred para cutover-fase-2. Cobertura RTM 100% obrigatória — sem MVP/mock. Manifest gerenciado pelo curator, expandido incrementalmente pelo archaeologist. Harness de execução: `/dwave` em `/loop` self-paced (ver [[director-studio-wave-model]]).

### Auditoria pós-harness (2026-05-19)

Auditoria humana via Chrome MCP após Ralph Loop marcar 132/132 features como `accepted`. Encontrados 9 débitos (F123-F131):

- **F123** — ModelEngine `?app=appKey` (root cause de ~80% das telas erradas; fix de 3 linhas em `area-page.tsx`)
- **F125** — 4 strings de debug vazando no bundle prod (gateadas via `import.meta.env.DEV`; ver [[vite-dev-gate-pattern]])
- **F126/F127** — 20 smoke routes no bundle prod + console.logs (tree-shake fix)
- **F128** — brand text "Director.Studio" → logo image "Processa Studio" + manifest PWA pt-BR
- **F129** — sidebar não reagia a troca de appKey (bug de early-return guard em `use-menu.ts`)
- **F130** — duplicata "Sep/ Abst" no menu WMS (não-bug: 2 rows reais em `acesso.TBmodulo`; decisão pendente)
- **F131** — `tsc -b` quebrando build por TS errors pré-existentes (débito P1)

Lição: harness mecânico produz cobertura técnica mas não substitui juízo humano. Ver [[anchor-mission-persona]] para o conceito de anchor que faltou durante a execução autônoma.

## Related Concepts

- [[acesso-metamodel]] — schema `acesso.*` que descreve apps/menus/páginas no banco; é o contrato que o Studio renderiza
- [[processa-auth-paths]] — os 5 caminhos de autenticação que o Studio precisa cobrir; a chave para eliminar .NET local
- [[react-tools]] — framework JS atual que faz hoje o que o Studio fará; referência de contrato, não de implementação
- [[appbuilder]] — sistema legado que é o ancestral conceitual do Studio (cadastro); será absorvido
- [[director-web]] — frontend operacional cuja simplicidade (20 linhas) é a evidência mais forte da viabilidade do Studio
- [[appbuilder-directorweb-topology]] — separação cadastro/runtime atual, que o Studio dissolve
- [[director-studio-agent-team]] — time de 5 agentes com princípio de não-contaminação
- [[director-studio-wave-model]] — harness de execução feature-locked via `/dwave`
- [[validar-cript]] — criptografia legada reversível que o Studio herda durante coexistência

- [[anchor-mission-persona]] — conceito de anchor (MISSION+PERSONA) que mantém qualidade durante execução autônoma do harness
- [[vite-dev-gate-pattern]] — pattern descoberto durante auditoria pós-harness para eliminar código dev do bundle prod

## Sources

- [[calendar/notes/2026-05-15.md]] — sessão de descoberta do metamodelo, leitura do `Processa.Sdk.Auth`, decisão pelo nome Director.Studio, escopo do protótipo em `workspace/director-studio/`; bootstrap do workspace com stack definido; montagem do time de 5 agentes; wave model feature-locked; manifest seed de 27 features; bloqueio F003 resolvido via fn_Decript
- [[calendar/notes/2026-05-19.md]] — auditoria pós-harness: 9 débitos F123-F131; brand "Processa Studio"; manifest expandido para 132 features; ciclo smith↔ui-tester de 7 fixes; agent-chat com NIC sobre metodologia
