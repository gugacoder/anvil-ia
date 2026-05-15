---
title: "Área 52 — ambiente de desenvolvimento"
aliases: [area-52, dev-env, 172.27.0.52]
tags: [ambiente, infra, processa, dev]
sources:
  - "calendar/notes/2026-05-14.md"
  - "calendar/notes/2026-05-15.md"
created: 2026-05-14
updated: 2026-05-15
---

# Área 52 — ambiente de desenvolvimento Processa

`172.27.0.52` é o **único servidor de estudo** que a equipe Anvil pode operar dentro da rede Processa. Apelido "Área 52", também referido como **Srv-DirectorWeb**. É o local onde construímos com a plataforma [[concepts/appbuilder]], testamos no [[concepts/director-web]]/Portal, e empacotamos pra entregar aos clientes.

## Fronteira operacional — outros hosts são proibidos

**Só Área 52 (`172.27.0.52`) está autorizada pra estudo/experimentação.** Existem outros servidores AppBuilder na rede `172.27.0.*` que **não devem ser tocados** sob nenhuma hipótese — são da equipe de desenvolvimento da Processa:

| IP | Hostname | Versão (2026-05-15) | Ambiente | Acesso |
|---|---|---|---|---|
| `172.27.0.113` | **SERVERBETA** | AppBuilder 1.14.0-11 | **Beta da equipe dev** (runner GitLab `serverbeta` no `.gitlab-ci.yml` do AppBuilder) | ❌ não tocar |
| `172.27.0.130` | (não publica DNS) | AppBuilder 1.14.0 release | **Produção da equipe dev** | ❌ não tocar |

Regra: qualquer leitura/escrita/probe nesses hosts é fora do escopo. Investigação de comportamento da plataforma faz-se em Área 52, mesmo que mais lento/com versões antigas. Quando precisar entender o que esses servidores fazem, perguntar pro guga ou pra alguém da fábrica — não scan, não login, não inferência intrusiva.

## Endpoints

| Serviço | Porta | URL | Versão (2026-05-14) | Função |
|---|---|---|---|---|
| Director.Portal | 4300 | http://172.27.0.52:4300 | 1.18.2 | Portal Director — app gerado pelo AppBuilder, consome pipelines via serviço Windows Pipeliner |
| Processa.AppBuilder | 4305 | http://172.27.0.52:4305 | 1.13.1 | UI de cadastro de pipelines + empacotamento pro cliente. Rota `/pipeliner` |
| Director.Web | 4600 | http://172.27.0.52:4600 | 1.21.3 | Frontend principal Director |

Os 3 serviços responderam HTTP 200 em 2026-05-14 a partir da máquina dev do usuário (rede interna Processa).

## DB associado

DB do AppBuilder: **`DBx_appb_ti_teste`** em `172.27.0.121\SQL2k19` (instância `SERVERSQL\SQL2K19`). Já tem schemas `acesso`, `appbuilder`, `pipeliner` provisionados, incluindo `pipeliner.TBpipeline` e `pipeliner.TBstage`. Acesso via login SQL `director_web` — credencial em `.env` (`APPBUILDER_DB_*`). Ver [[concepts/dbdirector]] pra distinguir do banco principal Director.

## Workflow do ambiente

1. **Cadastrar** componentes (pipelines, formulários, módulos) via [[appbuilder]] em http://172.27.0.52:4305
2. **Testar** no Director.Web / Director.Portal (mesma máquina, portas 4600/4300) que consomem o que foi cadastrado
3. **Empacotar** pelo AppBuilder pra entrega ao cliente final (Fase 2 da frente [[pipeliner-ingestao-xml]])

## Convenções

- **Tabelas com prefixo `_`** (ex: `dbo._anvil_log`) são **não-oficiais** — podemos criar e remover livremente sem violar contrato com o time dev.
- Schema `dbo` no DB `DBx_appb_ti_teste` é espaço seguro pra prototipagem.
- Pipelines cadastrados na UI vão pra `pipeliner.TBpipeline`/`TBstage` do mesmo DB.

## Infraestrutura do servidor

- **OS**: Windows Server 2019.
- **Runtime**: .NET 8 e .NET 10 instalados.
- **3 serviços Windows** rodando como `LocalSystem`/Automatic: `Director.Portal`, `Director.Web`, `Processa.AppBuilder`.
- **Sem Pipeliner**: `Get-Service` confirma que o serviço Windows do Pipeliner **não está instalado** neste servidor. Pipelines cadastrados no DB não têm executor local — ou roda em outro host ou não foi implantado neste ambiente.
- **SSH acessível**: OpenSSH com username `processa\guga` (domínio). Shell default é PowerShell, não cmd. Para scripts complexos: codificar UTF-16LE → base64 → `powershell -EncodedCommand`. `processa\guga` tem privilégios admin (Restart-Service, Set-Content em `Program Files`, New-NetFirewallRule).
- **Connection strings**: base64, em dois locais por serviço: `Program Files (x86)\Processa Sistemas\<App>\appsettings.json` (primário) e `ProgramData\Processa Sistemas\<App>\appsettings.json` (fallback para reinstalação silenciosa via `InstallService.js`).
- **DB apontamento (2026-05-14)**: AppBuilder aponta pra `DBx_appb_ti_teste`; Director.Web e Director.Portal continuam em `DBdirector_ti_29_homo`. Inconsistência aceita — backups em `.bak-20260514-150106`.
- **Firewall**: regra `Portal.Director` cobre portas 4300+4600. Regra `Processa.AppBuilder` (TCP/4305, Profile=Any) criada em 2026-05-14 — não existia antes (artefato de instalação manual). `Get-NetFirewallPortFilter | Where LocalPort -eq N` é o caminho confiável pra achar regras por porta.

## Pendente

- Confirmar **onde está rodando o serviço Windows do Pipeliner** — confirmado que **não está neste servidor**. Roda em outro host ou não está instalado neste ambiente.
- Identificar **onde o serviço Pipeliner loga** execução de stages.
- Cadastrar a chave `pipeliner` em `acesso.TBaplicacao` apontando pra URL do serviço Windows — sem isso o "Executar agora" via API do AppBuilder (proxy) não funciona.

## Notas de uso descobertas (2026-05-14)

- **Roteamento SPA com hash**: rotas internas usam `/#/...` (ex: `/#/pipeliner`). Bater em `/pipeliner` direto retorna JSON 401 — não é rota SPA, é endpoint API.
- **Login Nome/Senha próprio** em `/#/login` (não Windows auth automático). Após autenticar, sessão por cookie. Usuário `guga` validado.
- **AppBuilder mostra na home 4 cards**: Cadastros, Páginas, Pipeliner, Páginas Mobile.
- **Rota `/#/pipeliner`** tem lista de integrações + botão `+` pra criar nova. Wizard: integração → estágio → ação. Tipos de ação: Request, SOAP, **Query**, Log, Monitoramento de Email, Envio de Email.
- **UI não tem "Executar agora"** — menus de contexto só expõem operações CRUD.
- Versões instaladas em 2026-05-14: Director.Portal 1.18.2, Processa.AppBuilder 1.13.1, Director.Web 1.21.3.

## Sources

- Endpoints fornecidos pelo usuário (2026-05-14).
- Teste HTTP: PowerShell `Invoke-WebRequest` retornou 200 nos 3 endpoints.
- Teste SQL: PowerShell `System.Data.SqlClient` conectou em `DBx_appb_ti_teste` e listou schemas.
