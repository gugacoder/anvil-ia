# agent-template

Template para criar um agente Claude Code com mente persistente — base de conhecimento em arquivo, modos de operação (conversa e heartbeat), e sistemas auto-contidos sob `.systems/`.

## Instalação

```bash
./install.sh
```

O script instala as dependências Node.js compartilhadas pelos sistemas (em `.systems/node_modules/`). Aceita argumentos do `npm install` — por exemplo, `./install.sh --production`.

> **Windows:** rode pelo **Git Bash** (ou WSL). O `install.sh` é um shell script POSIX e não executa direto no PowerShell/CMD. Alternativa sem shell: `cd .systems && npm install`.

## Customização

Esse repositório é um template. Para transformá-lo no seu agente:

1. **Edite `AGENTS.md`** — ponto de entrada do agente. Define o protocolo de execução e aponta para a identidade.
2. **Customize `mind/atlas/self/`** — onde mora a alma do agente:
   - `SOUL.md` — papel, objetivo, contexto, instruções e limites.
   - `CONVERSATION.md` — comportamento em conversa em tempo real.
   - `HEARTBEAT.md` — comportamento em sessões disparadas por scheduler (cron, `/loop`, hook recorrente).
3. **Edite `mind/HOME.md`** — índice mestre da mente, porta de entrada para o grafo de conhecimento.
4. **Configure o que mais fizer sentido** sob `mind/` à medida que o agente for amadurecendo.

### Construindo a alma

Em vez de editar os arquivos de `mind/atlas/self/` na mão, você pode deixar o próprio agente conduzir. Abra uma sessão no diretório do template e digite:

```
construa sua alma — me entreviste
```

O agente vai abrir os arquivos atuais de `atlas/self/`, reconhecer que estão genéricos, e fazer perguntas iniciais sobre quem ele deve ser: papel, propósito, domínio, tom, limites, com quem fala e o que nunca deve fazer. Ao final, ele escreve `SOUL.md`, `CONVERSATION.md` e `HEARTBEAT.md` a partir das suas respostas.

## Estrutura

```
agent-template/
├── AGENTS.md              # protocolo de execução + ponteiro para a identidade
├── CLAUDE.md              # apenas redireciona para AGENTS.md
├── install.sh             # instala deps dos sistemas
├── .claude/               # config do Claude Code (hooks, skills, commands)
├── .systems/              # sistemas auto-contidos (memory, etc.)
└── mind/                  # mente persistente do agente
    ├── HOME.md            # índice mestre
    ├── ABOUT.md           # contrato estrutural (LYT, ACE, ARC, MOCs)
    ├── atlas/             # conhecimento permanente
    │   ├── self/          # identidade do agente
    │   ├── concepts/      # conceitos
    │   ├── connections/   # relações entre conceitos
    │   └── maps/          # MOCs (Maps of Content)
    ├── calendar/          # o que tem peso temporal
    ├── effort/            # trabalho em curso (on/slow/off)
    └── x/                 # artefatos não-nota
```

## Sistemas

Capacidades vêm de sistemas auto-contidos sob `.systems/`. Cada sistema tem código, prompts e estado próprios, e escreve em locais compartilhados sob `mind/`.

- **memory** — constrói a base de conhecimento a partir das próprias conversas. Hooks de session-start, session-end e pre-compact destilam contexto em notas. Comandos `/mind:*` complementam a operação manual.

Veja `.systems/KNOWLEDGE_BASE.md` e `mind/ABOUT.md` para o contrato canônico.

## Mente

A mente vive em `mind/`. É de lá que o agente pensa: ao receber uma mensagem, entra por `HOME.md` e segue os `[[wikilinks]]` até onde o assunto leva.

Quatro camadas com propósitos distintos:

- `atlas/` — conhecimento permanente
- `calendar/` — peso temporal (o que aconteceu, o que vai acontecer)
- `effort/` — trabalho em curso
- `x/` — artefatos não-nota orbitando algum dos acima

A mente é também um vault Obsidian (`mind/.obsidian/`) — pode ser aberta diretamente para navegação visual do grafo.
