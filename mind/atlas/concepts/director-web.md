---
title: "Director.Web"
aliases: [Director.Web, director-web, DirectorWeb]
tags: [plataforma, processa, frontend, operacional, multi-app, runtime]
sources:
  - "calendar/notes/2026-05-14.md"
created: 2026-05-14
updated: 2026-05-19
---

# Director.Web

Frontend operacional do Director ERP que funciona como **host de múltiplos apps/módulos**, não como sistema único. Cada "app" (WMS, Pipeliner, GDE, Check-in, Cotação, Agendamento, etc.) é um módulo do [[concepts/appbuilder]] com pasta SQL própria, carregado em runtime pelo Director.Web conforme o contexto do usuário/sessão. Distinto do [[concepts/appbuilder]], que é a UI de cadastro e configuração. A topologia é: **AppBuilder cadastra → Director.Web opera**.

## Key Points

- **Multi-app host**: Director.Web não é um sistema único — é um runtime que carrega múltiplos apps/módulos. O app que aparece (ex: WMS, Pipeliner) é determinado pelo contexto (usuário, menu, parâmetros).
- **12+ módulos SQL**: cada app tem pasta SQL própria em `sources/engenharia--fabrica--sql--portal-director/`, com `module.info` configurando conexão, ordem de precedência e embed no setup.
- **Porta**: 4600 no [[concepts/area-52]] (`http://172.27.0.52:4600`), versão 1.21.3 em 2026-05-14.
- **Serviço Windows**: `Director.Web`, roda como `LocalSystem`/Automatic no Srv-DirectorWeb.
- **Insight do Everton**: a tela de "ver/executar pipeline" vive no Director.Web (módulo `processa.pipeliner`), não no AppBuilder. AppBuilder não tem UI de execução — apenas CRUD de cadastro.

## Módulos conhecidos

Descobertos em `sources/engenharia--fabrica--sql--portal-director/` (2026-05-14, Session 16:40):

| Pasta SQL | App/Módulo | Notas |
|---|---|---|
| `director.checkin/` | Check-in | Telemetria de check-in |
| `director.gde/` | GDE | Gerenciamento de documentos/entregas |
| `director.web/` | Director.Web (core) | Módulo base do runtime |
| `director.wms/` | WMS | Warehouse Management — o app que aparece por default em `localhost:4600` |
| `portal.director/` | Portal Director | Portal principal do Director ERP |
| `processa.appbuilder/` | AppBuilder | Cadastro de artefatos (módulo SQL do AppBuilder dentro do host Director.Web) |
| `processa.appbuilder.mobile/` | AppBuilder Mobile | Versão mobile do cadastro |
| `processa.cotacao/` | Cotação | Sistema de cotações |
| `processa.gerenciamento.integracoes/` | Gerenciamento de Integrações | Gestão de integrações cross-system |
| `processa.pipeliner/` | **Pipeliner (operacional)** | UI operacional de visualização e disparo de pipelines — a tela que o Everton mencionou |
| `processa.agendamento/` | Agendamento | Agendamento de entregas |
| `solicitacao.rebaixa/` | Rebaixa | Solicitação de rebaixa |

Cada módulo tem `module.info` com configuração: `connection.name` (qual DB usar), ordem de precedência, e flag de embed no setup. Ex: `director.wms/module.info` aponta pra `connection.name=Director`.

## Details

O Director.Web foi inicialmente confundido com um mero frontend complementar ao Director.Portal. O insight trazido pelo Everton (PO da frente [[concepts/pipeliner-service]]) em 2026-05-14 esclareceu que é no Director.Web que a parte operacional do Pipeliner vive — listagem de pipelines, disparo manual ("Executar agora"), e visualização de jobs. Essa separação de responsabilidades é fundamental: o [[concepts/appbuilder]] configura o que será executado, e o Director.Web é onde o operador interage com a execução.

A descoberta de que Director.Web é um **host multi-app** veio na mesma sessão (16:40): ao acessar `localhost:4600`, o app visível era "WMS", não "Pipeliner". Investigação do source revelou que `engenharia--fabrica--sql--portal-director/` contém **12 módulos SQL distintos**, cada um pareando com um app/módulo do Director.Web. O arquivo `Director.Web/Config/Configuracao.xml` referencia `sp_director_wms_obter_opcoes_selecao`, confirmando que WMS é carregado como app pelo runtime. O módulo `processa.pipeliner/` é provavelmente o que contém a UI operacional de pipelines que o Everton referenciou.

No Srv-DirectorWeb (172.27.0.52), o Director.Web roda como serviço Windows na porta 4600. Em 2026-05-14, a connection string do serviço apontava para `DBdirector_ti_29_homo` (base de homologação), não para `DBx_appb_ti_teste`. A connection string é armazenada em base64 em dois locais: `Program Files (x86)\Processa Sistemas\Director.Web\appsettings.json` (primário) e `ProgramData\Processa Sistemas\Director.Web\appsettings.json` (fallback para reinstalação silenciosa).

Essa arquitetura multi-app reforça a viabilidade do [[concepts/director-studio]]: se Director.Web já é um host genérico que carrega N apps via metadados, o Studio replica esse mesmo padrão — apenas com stack moderna e sem .NET local. O source `.NET` do Director.Web é notavelmente magro (`src/index.jsx` tem 20 linhas montando `<AppMain />`); a riqueza está nos módulos SQL e no metamodelo [[concepts/acesso-metamodel]].

## Open Questions

- Como o Director.Web escolhe qual app/módulo carregar pra cada usuário/sessão? (menu, default por user, parâmetro de URL, `TBaplicacao`?)
- Existe frontend .NET separado pra cada módulo ou todos rodam dentro do mesmo host Director.Web?
- Os outros módulos (GDE, Check-in, Cotação) têm telas próprias ou são extensões dentro do mesmo SPA?
- A tela operacional do Pipeliner no Director.Web (módulo `processa.pipeliner`) ainda não foi explorada — sessão expirou antes de investigar. Confirmar rota, menu e funcionalidades disponíveis é ação pendente.

## Related Concepts

- [[concepts/appbuilder]] — UI de cadastro e empacotamento; complementar ao Director.Web
- [[concepts/pipeliner-service]] — serviço Windows que executa os pipelines visualizados no Director.Web
- [[concepts/area-52]] — ambiente de dev onde Director.Web roda na porta 4600
- [[concepts/acesso-metamodel]] — schema `acesso.*` que o Director.Web consome pra renderizar cada módulo
- [[concepts/director-studio]] — projeto que replica a arquitetura multi-app do Director.Web em stack moderna
- [[concepts/react-tools]] — framework `<AppMain />` que é o runtime de renderização dentro do Director.Web

## Sources

- [[calendar/notes/2026-05-14.md]] — insight do Everton sobre a tela operacional; endpoints validados; separação de responsabilidades AppBuilder vs Director.Web; descoberta dos 12 módulos SQL em `engenharia--fabrica--sql--portal-director/`; WMS como app default em `localhost:4600`; `processa.pipeliner/` como módulo operacional de pipelines
