# Knowledge Base Index

> Root MOC. Toda nota da base é alcançável a partir daqui — direta (linha em tabela) ou indireta (via algum MOC linkado abaixo). Veja [[home]] e [[home-reachable]].

## Self

| Article | Summary | Compiled From | Updated |
|---------|---------|---------------|---------|
| [[atlas/self/SOUL]] | Alma do agente | TBagente.DFsoul | 2026-05-04 |
| [[atlas/self/CONVERSATION]] | Modo conversa | TBagente.DFconversation | 2026-05-04 |
| [[atlas/self/HEARTBEAT]] | Modo heartbeat | TBagente.DFheartbeat | 2026-05-04 |

## Indice de Atlas

### Maps

| Article | Summary | Compiled From | Updated |
|---------|---------|---------------|---------|
| [[-about]] | Contrato estrutural da base — filosofia LYT, locations, regras operacionais | atlas/maps/-about.md | 2026-05-11 |

### Concepts

| Article | Summary | Compiled From | Updated |
|---------|---------|---------------|---------|
| [[atlas/concepts/xml-to-json-node]] | Conversor XML→JSON da plataforma (atributos `Type`, `Array`, `Omitir`) usado pelo Pipeliner | doc interna + RequestService.cs | 2026-05-13 |
| [[atlas/concepts/mind-pipeline]] | Pipeline de compilação de conhecimento em 3 estágios: flush → capture → digest | calendar/notes/2026-05-13.md | 2026-05-13 |
| [[atlas/concepts/dbdirector]] | Instância SQL Server 2019 (`172.27.0.121\SQL2k19`) — banco `DBdirector` do Director ERP | calendar/notes/2026-05-13.md | 2026-05-13 |
| [[atlas/concepts/pipeliner-service]] | Serviço Windows que orquestra pipelines — Query-only viável, schedule via TBstage, não instalado na Área 52 | calendar/notes/2026-05-13.md, calendar/notes/2026-05-14.md | 2026-05-14 |
| [[atlas/concepts/tbopcoes]] | Tabela key-value de configuração do Director ERP no DBdirector | calendar/notes/2026-05-13.md | 2026-05-13 |
| [[atlas/concepts/idempotencia-filesystem]] | Padrão de idempotência via convenção de pastas: pendente → importado / falha | calendar/notes/2026-05-13.md | 2026-05-13 |
| [[atlas/concepts/area-52]] | Ambiente de dev `172.27.0.52` (Srv-DirectorWeb) — 3 serviços Windows, SSH, firewall, sem Pipeliner instalado | calendar/notes/2026-05-14.md | 2026-05-14 |
| [[atlas/concepts/appbuilder]] | Sistema Processa de cadastro de pipelines/artefatos (wizard React) e empacotamento — não participa do runtime | calendar/notes/2026-05-14.md | 2026-05-14 |
| [[atlas/concepts/director-web]] | Frontend operacional do Director ERP — onde pipelines são visualizados e executados (porta 4600) | calendar/notes/2026-05-14.md | 2026-05-14 |
| [[atlas/concepts/deploy-pipeline-newdb]] | Endpoint `savePipelineNewDB` do AppBuilder — replica pipeline cadastrado para DB destino via script T-SQL idempotente | calendar/notes/2026-05-14.md | 2026-05-14 |
| [[atlas/concepts/scriptpack-appbuilder]] | Ferramenta CLI migrant.lib para provisionar schema do AppBuilder em SQL Server | calendar/notes/2026-05-14.md | 2026-05-14 |
| [[atlas/concepts/director-studio]] | Plataforma única que substitui AppBuilder + Portal + Director.Web/WMS + ADM renderizando o metamodelo `acesso.*` em Node | calendar/notes/2026-05-15.md | 2026-05-15 |
| [[atlas/concepts/processa-auth-paths]] | Os 5 caminhos de autenticação do ecossistema Processa (JWT/temp/LDAP-bridge/email/local) | calendar/notes/2026-05-15.md | 2026-05-15 |
| [[atlas/concepts/acesso-metamodel]] | Schema `acesso.*` do DBdirector que descreve UI (apps/menus/páginas) como dados — substrato técnico do Studio | calendar/notes/2026-05-15.md | 2026-05-15 |
| [[atlas/concepts/react-tools]] | Framework JS interno `@engenharia/react-tools` — runtime atual schema-driven, referência de contrato para o Studio | calendar/notes/2026-05-15.md | 2026-05-15 |

> Substrato meta-LYT (conceitos LYT, specs de locations, regras operacionais, átomos das camadas effort/x) vive em `atlas/meta/` e é alcançável via [[-about]]. Conceitos curados pelo agente sobre o mundo vão aqui em `atlas/concepts/` quando aparecerem.

### Connections

| Article | Summary | Compiled From | Updated |
|---------|---------|---------------|---------|
| [[atlas/connections/pipeliner-dbdirector-bypass]] | Hipótese de bypass: DBdirector lê XMLs direto, Pipeliner vira só cron job | calendar/notes/2026-05-13.md | 2026-05-13 |
| [[atlas/connections/appbuilder-directorweb-topology]] | AppBuilder cadastra, Director.Web opera — separação cadastro vs runtime confirmada pelo PO | calendar/notes/2026-05-14.md | 2026-05-14 |

### Works

| Article | Summary | Compiled From | Updated |
|---------|---------|---------------|---------|

## Frentes em curso

| Frente | Status | Descricao |
|--------|--------|-----------|
| `director-studio` | scoping | Protótipo da plataforma única em `workspace/director-studio/`. Backlog em `workspace/director-studio/backlog/`. Conceito em [[atlas/concepts/director-studio]]. |
