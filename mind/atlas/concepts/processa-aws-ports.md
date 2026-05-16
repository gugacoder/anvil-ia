---
title: "Portas do servidor AWS Processa (52.67.203.133)"
aliases: [aws-ports, 52.67.203.133, processa-aws-services]
tags: [reference, aws, processa, infra, ports]
sources:
  - "sources/engenharia--fabrica--sql--portal-director/portal.director/pos-script.sql"
  - "sources/engenharia--fabrica--sql--portal-aws/agent/pre-script.sql"
  - "sources/engenharia--fabrica--dotnet--processa.ADM/Fontes/Processa.ADM.Website/vite.config.js"
  - "sources/engenharia--fabrica--dotnet--processa.sdk/Sandbox/Program.cs"
created: 2026-05-16
updated: 2026-05-16
---

# Mapping de portas — `52.67.203.133` (AWS Processa)

Host único na AWS que concentra serviços compartilhados entre tenants. Cada porta = um serviço distinto. Esta página existe como **referência rápida** porque a confusão entre portas (ADM vs Agendamento vs bridge auth) já causou erro de diagnóstico na frente Director.Studio.

## Tabela canônica

| Porta | Serviço | `TBaplicacao.DFchave` | Função | Fonte |
|---|---|---|---|---|
| **4306** | Bridge LDAP / Auth | (config `ServidorAutenticacao`) | Endpoint `POST /api/auth/validate` — usado pelo caminho `ldap-bridge` do [[processa-auth-paths]]. Body criptografado pelo `Processa.Sdk.Api/Cryptography.cs`. | `Config/appsettings.json:ServidorAutenticacao` em todo SDK; `processa.sdk/Sandbox/Program.cs:861` |
| **4303** | Integrador AWS | `integrador-aws` | Serviço auxiliar `Processa.Integrador.AWS`. Destino de sync do módulo Cotação/Agent via cliente próprio (não `PortalAwsClient`). Default em on-prem usa `172.27.0.114`/`131`. | seed `acesso.TBaplicacao` em pos-script.sql |
| **5000** | Cotação API | `cotacao` | Endpoint `/Cotacao/Api/1` — chamado pelo `CotacaoIntegradorClient`. | `processa.sdk/Sandbox/Program.cs:957` |
| **5100** | Portal AWS | `portal-aws` | Bridge cross-tenant pro `PortalAwsClient` ([[portal-aws-bridge]]). Sync de 10 entidades + CRUD usuário fornecedor. Default seed local é `127.0.0.1:5100` — IP de produção do portal-aws na AWS é **TBD** (não confirmado nos sources, pode estar em outro host). |  pos-script.sql:8 |
| **5200** | Agendamento | `agent` | Serviço operacional de **agendamento de entregas** — voltado pra cliente final, não admin. App separado (cil-calendar). | `portal-aws/agent/pre-script.sql:24` |
| **5300** | Processa ADM | `processaadm` | **UI de suporte interno da Processa** — gerencia clientes, instalações, configurações, ferramentas (gerador de senha temp, executor de query, controle de serviços, manipulação de arquivos). Ver [[processa-adm-tool]]. | `portal-director/pos-script.sql:13`; `processa.ADM.Website/vite.config.js:8` |
| **6300** | Homologação | (alias `homologacao`) | Ambiente de homologação do ADM (mesma UI/API, dados de teste). | `processa.ADM.Website/vite.config.js:6` |

## Confusões comuns

- **5200 ≠ admin**. Quem está procurando a UI de suporte do time Processa quer **5300** (Processa ADM). O 5200 é serviço end-user de agendamento.
- **4306 ≠ portal-aws**. 4306 é bridge auth LDAP; portal-aws é 5100. Os dois compartilham infra mas são endpoints distintos.
- **`ServidorAutenticacao` é só auth**. Não é "servidor genérico AWS Processa" — é especificamente o LDAP bridge na 4306.
- **IP de produção do portal-aws pode não ser este**. O diagrama de arquitetura mostra `52.67.203.133` como host genérico, mas a `DFendereco` do `portal-aws` no banco de cada tenant é que manda. Seeds usam `127.0.0.1:5100` (dev) ou `52.67.203.133:5100` (referência). **Verificar via on-prem** quando precisar.

## Links relacionados

- [[processa-adm-tool]] — UI ADM em si (rotas, ferramentas, geração de senha temp).
- [[processa-auth-paths]] — 5 caminhos de auth, incluindo o LDAP bridge na 4306.
- [[portal-aws-bridge]] — cliente HTTP que fala com portal-aws (5100).
- [[hub-signalr-legacy]] — hubs SignalR (não confundir com endpoints HTTP listados aqui).
