---
title: "Workspace layout"
aliases: [workspace-layout, workspace-spec, workspace-pattern]
tags: [lyt, location, meta, workspace]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Workspace layout — `workspace/{project_slug}/`

Cada projeto que o agente constrói vive em `workspace/{project_slug}/`. É **monorepo node autossuficiente** — não compartilha código entre projetos via filesystem; compartilha apenas conceitos via `mind/`. Convenção pareada com a layer de [[effort]] do [[LYT]]: o workspace contém o **código** (output), o `mind/effort/on/{project_slug}/` contém a **narrativa** (decisões, manifesto, progresso).

## Key Points

- Cada projeto = um workspace independente em `workspace/{project_slug}/`.
- Monorepo node interno (`apps/*`, `packages/*`, `infra/`) com npm workspaces.
- **Código no workspace; narrativa no mind.** Workspace só tem o que roda em runtime.
- `workspace/{slug}/README.md` é fino: aponta pro `mind/effort/on/{slug}/` pra contexto.
- Bootstrap canônico: `npx shadcn@latest init --preset b0 --template vite --monorepo --pointer`.

## Details

Estrutura padrão:

```
workspace/{project_slug}/
├── apps/
│   ├── {app-slug}/                     # cada app é um workspace npm
│   └── api/                            # quando houver backend
├── packages/
│   ├── ui/                             # design system compartilhado
│   └── {pacote-compartilhado}/         # criado quando ui-dry aplicar
├── infra/
│   ├── docker-compose.platform.yml             # infra dev+prod (Redis, Caddy)
│   ├── docker-compose.platform.dev-ports.yml   # overlay dev — expõe portas
│   ├── docker-compose.yml                      # stack prod completo (apps + platform)
│   └── docker/
│       └── caddy/Caddyfile                     # proxy reverso interno
├── package.json                        # workspace root (npm workspaces + turbo)
├── turbo.json
├── tsconfig.json
├── .env                                # gitignored, gerado por wizard ou template
├── .env.example                        # template versionado
├── .gitignore
└── README.md                           # fino, aponta pra mind/effort/on/{slug}/
```

A narrativa correspondente vive em `mind/effort/on/{project_slug}/`:

```
mind/effort/on/{project_slug}/
├── README.md                # MOC da frente
├── feature-manifest.md      # contrato de "pronto"
├── progress-messages.txt    # log append-only de todos os agentes
├── backlog/                 # decisões de implementação
└── design-spec/             # specs de UX por feature (quando aplicável)
```

Razão da separação: agentes operam principalmente sobre o mind. Se a narrativa do projeto morasse em `workspace/`, agentes precisariam navegar dois universos diferentes pra entender contexto. Com a separação, o workspace é puro código (output reproduzível) e o mind é a memória completa (decisões, status, contratos).

Convenções de stack vivem em [[stacks]] (skill). Convenções de Docker vivem em [[nic-dockerization]]. Convenções de `.env` em [[nic-env-pattern]]. Convenções de Caddy em [[nic-caddy]]. O workspace-layout aqui só define **o esqueleto**; o conteúdo é responsabilidade das skills.

## Related Concepts

- [[effort]] — layer do LYT que abriga a narrativa do projeto
- [[home-reachable]] — toda frente em `effort/on/` é alcançável a partir de HOME

## Sources

- [[calendar/notes/2026-05-15.md]] — formalização do pareamento workspace/effort durante a montagem do time Director.Studio
