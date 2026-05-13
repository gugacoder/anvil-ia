# Anvil

Agente de estudo da plataforma **AppBuilder** da Processa. Lê o código em `sources/` (Director, Pipeliner, AppBuilder, portais SQL, Playwright), aprende a operar a plataforma e os apps que ela gera, e destila o que descobre em conhecimento durável dentro do próprio `mind/`.

Não implementa features na plataforma, não modifica `sources/`, não decide rumo de produto. Serve como par técnico do arquiteto: traz análise, opções e tradeoffs ancorados em código real (`file:line`), e o usuário escolhe.

## Instalação

```bash
./install.sh
```

Instala as dependências Node dos sistemas em `.systems/node_modules/`. Aceita argumentos do `npm install` (ex.: `./install.sh --production`).

> **Windows:** rode pelo **Git Bash** (ou WSL). Alternativa sem shell: `cd .systems && npm install`.

## Estrutura

```
abulder/
├── AGENTS.md              # protocolo de execução + ponteiro para a identidade
├── CLAUDE.md              # redireciona para AGENTS.md
├── install.sh             # instala deps dos sistemas
├── .claude/               # config do Claude Code (hooks, skills, commands)
├── .systems/              # sistemas auto-contidos (memory, etc.)
├── sources/               # repos da fábrica Processa (leitura apenas)
│   ├── engenharia--fabrica--dotnet-core--director/
│   ├── engenharia--fabrica--dotnet--pipeliner/
│   ├── engenharia--fabrica--dotnet--processa.appbuilder/
│   ├── engenharia--fabrica--sql--portal-*/
│   └── qualidade--playwright--appbuilder/
└── mind/                  # mente persistente do Anvil
    ├── HOME.md            # índice mestre
    ├── atlas/             # conhecimento permanente
    │   ├── self/          # identidade (SOUL, CONVERSATION, HEARTBEAT)
    │   ├── concepts/
    │   ├── connections/
    │   └── maps/
    ├── calendar/          # eventos e notes do dia
    ├── effort/            # frentes em curso (on/slow/off)
    └── x/                 # artefatos não-nota
```

## Mente

A mente vive em `mind/`. Anvil pensa a partir dela: ao receber uma mensagem, entra por `HOME.md` e segue os `[[wikilinks]]` até onde o assunto leva. Quatro camadas separadas pela relação com o tempo ([[ACE]]):

- `atlas/` — atemporal — **conhecimentos** (permanente)
- `calendar/` — ponto no tempo — **agenda** (eventos + notes do dia)
- `effort/` — timespan — **frentes** (`on/`, `slow/`, `off/`)
- `x/` — artefatos não-nota

Também é vault Obsidian (`mind/.obsidian/`) — pode ser aberto para navegação visual do grafo.

## Sistemas

Capacidades vêm de sistemas auto-contidos sob `.systems/`. Cada sistema tem código, prompts e estado próprios, e escreve em locais compartilhados sob `mind/`.

- **memory** — constrói a base de conhecimento a partir das próprias conversas. Hooks de session-start, session-end e pre-compact destilam contexto em notas. Comandos `/mind:*` complementam a operação manual.

Veja `.systems/KNOWLEDGE_BASE.md` e `mind/atlas/maps/-about.md` para o contrato canônico.
