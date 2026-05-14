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
| [[atlas/concepts/pipeliner-service]] | Serviço Windows que orquestra pipelines: agenda procedures, converte XML→JSON, despacha HTTP | calendar/notes/2026-05-13.md | 2026-05-13 |
| [[atlas/concepts/tbopcoes]] | Tabela key-value de configuração do Director ERP no DBdirector | calendar/notes/2026-05-13.md | 2026-05-13 |
| [[atlas/concepts/idempotencia-filesystem]] | Padrão de idempotência via convenção de pastas: pendente → importado / falha | calendar/notes/2026-05-13.md | 2026-05-13 |
| [[atlas/concepts/area-52]] | Ambiente de dev `172.27.0.52` — Director.Portal:4300, AppBuilder:4305, Director.Web:4600. DB `DBx_appb_ti_teste`. Tabelas `dbo._*` são livres pra prototipar | calendar/notes/2026-05-14.md | 2026-05-14 |

> Substrato meta-LYT (conceitos LYT, specs de locations, regras operacionais, átomos das camadas effort/x) vive em `atlas/meta/` e é alcançável via [[-about]]. Conceitos curados pelo agente sobre o mundo vão aqui em `atlas/concepts/` quando aparecerem.

### Connections

| Article | Summary | Compiled From | Updated |
|---------|---------|---------------|---------|
| [[atlas/connections/pipeliner-dbdirector-bypass]] | Hipótese de bypass: DBdirector lê XMLs direto, Pipeliner vira só cron job | calendar/notes/2026-05-13.md | 2026-05-13 |

### Works

| Article | Summary | Compiled From | Updated |
|---------|---------|---------------|---------|

## Frentes em curso

| Frente | Status | Descricao |
|--------|--------|-----------|
