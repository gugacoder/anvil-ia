---
title: "Área 52 — ambiente de desenvolvimento"
aliases: [area-52, dev-env, 172.27.0.52]
tags: [ambiente, infra, processa, dev]
created: 2026-05-14
updated: 2026-05-14
---

# Área 52 — ambiente de desenvolvimento Processa

`172.27.0.52` é o servidor que hospeda o ambiente de desenvolvimento da equipe Anvil dentro da rede Processa. Apelido "Área 52". É o local onde construímos com a plataforma [[appbuilder]] (não documentado ainda como concept próprio), testamos no Director.Web/Portal, e empacotamos pra entregar aos clientes.

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

## Pendente

- Confirmar **onde está rodando o serviço Windows do Pipeliner** que aponta pra `DBx_appb_ti_teste` — pode estar no próprio `172.27.0.52` ou em outro host. Sem isso, pipelines cadastrados não executam.
- Identificar **onde o serviço Pipeliner loga** execução de stages.

## Sources

- Endpoints fornecidos pelo usuário (2026-05-14).
- Teste HTTP: PowerShell `Invoke-WebRequest` retornou 200 nos 3 endpoints.
- Teste SQL: PowerShell `System.Data.SqlClient` conectou em `DBx_appb_ti_teste` e listou schemas.
