---
title: "Connection: TBaplicacao e Auth-Scheme Switching no Proxy Multi-App"
connects:
  - "concepts/tbaplicacao-app-registry"
  - "concepts/processa-auth-paths"
sources:
  - "calendar/notes/2026-05-17.md"
created: 2026-05-19
updated: 2026-05-19
---

# Connection: TBaplicacao e Auth-Scheme Switching no Proxy Multi-App

## The Connection

O registro de apps em [[tbaplicacao-app-registry]] (`acesso.TBaplicacao`) não serve apenas como catálogo de endpoints — ele **determina qual esquema de autenticação** usar em chamadas inter-app via proxy. O `AppClientService.BuildHeader` (em `PortalDirector.Services/AppClientService.cs:43-56`) faz switch por `DFchave` para decidir entre Basic e Bearer, conectando diretamente o registro de apps com o modelo de [[processa-auth-paths]].

## Key Insight

Os 5 caminhos de autenticação documentados em [[processa-auth-paths]] descrevem como um **usuário** se autentica no endpoint — é sempre o primeiro hop (browser → backend). Mas existe um segundo hop que não estava visível: como um **backend local** autentica ao falar com outro serviço Processa. Esse segundo hop **não usa a identity do usuário corrente** — usa uma identity de serviço fixa (`Id=1, Name="processa", CodEmpresa=0, NomeEmpresa="Processa"`).

Isso cria uma assimetria significativa: o primeiro hop é identity-aware (sabe quem é o usuário), mas toda comunicação inter-app subsequente perde essa informação e opera como service account. A exceção é `PortalAwsClient` (para `portal-aws`), que propaga a identity do usuário e gera JWT efêmero com seus dados — mas é um caminho dedicado, não o padrão genérico.

Para o [[director-studio]], isso significa que o proxy multi-app (F110) precisa replicar essa perda de identity: autenticar como service account fixo, não como o usuário que iniciou a ação. Tentar "melhorar" propagando a identity real quebraria contratos assumidos pelos serviços destino (que esperam sempre receber `processa` com `CodEmpresa=0`).

## Evidence

- `AppClientService.BuildHeader` switch por `DFchave`:
  - `case "cotacao"` → `Basic base64("processa|{DFdominio}:99")` — usa a senha seed do admin PROCESSA (ver [[validar-cript]])
  - `default` → `Bearer <JWT>` assinado com `Consts.SecretKey`, identity fixa `DirectorIdentity(Id=1, Name="processa")`
- Header HTTP `Domain: {DFdominio}` adicionado em todas as chamadas (não é auth, é routing hint)
- `PortalAwsClient` é a exceção: toma identity do Thread atual, troca Domain pelo do portal-aws, gera JWT com dados do usuário corrente
- Cross-tenant survey (2026-05-17): 89 bases com TBaplicacao populada confirmam que o padrão é universal

## Related Concepts

- [[concepts/tbaplicacao-app-registry]] — registro que determina qual auth-scheme usar
- [[concepts/processa-auth-paths]] — modelo de auth do primeiro hop (usuário → endpoint)
- [[concepts/director-studio]] — F110 proxy multi-app precisa replicar o switching fielmente
- [[concepts/validar-cript]] — senha `99` usada no Basic auth para cotacao
