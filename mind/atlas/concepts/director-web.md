---
title: "Director.Web"
aliases: [Director.Web, director-web, DirectorWeb]
tags: [plataforma, processa, frontend, operacional]
sources:
  - "calendar/notes/2026-05-14.md"
created: 2026-05-14
updated: 2026-05-14
---

# Director.Web

Frontend operacional do Director ERP, onde usuários finais visualizam e executam pipelines. Distinto do [[concepts/appbuilder]], que é a UI de cadastro e configuração. A topologia é: **AppBuilder cadastra → Director.Web opera**.

## Key Points

- **Função**: UI operacional do Director ERP — onde pipelines são visualizados, disparados e monitorados pelo usuário final.
- **Porta**: 4600 no [[concepts/area-52]] (`http://172.27.0.52:4600`), versão 1.21.3 em 2026-05-14.
- **Serviço Windows**: `Director.Web`, roda como `LocalSystem`/Automatic no Srv-DirectorWeb.
- **Insight do Everton**: a tela de "ver/executar pipeline" vive no Director.Web, não no AppBuilder. AppBuilder não tem UI de execução — apenas CRUD de cadastro.
- **Source**: `sources/engenharia--fabrica--dotnet-core--director.web/`.

## Details

O Director.Web foi inicialmente confundido com um mero frontend complementar ao Director.Portal. O insight trazido pelo Everton (PO da frente [[concepts/pipeliner-service]]) em 2026-05-14 esclareceu que é no Director.Web que a parte operacional do Pipeliner vive — listagem de pipelines, disparo manual ("Executar agora"), e visualização de jobs. Essa separação de responsabilidades é fundamental: o [[concepts/appbuilder]] configura o que será executado, e o Director.Web é onde o operador interage com a execução.

No Srv-DirectorWeb (172.27.0.52), o Director.Web roda como serviço Windows na porta 4600. Em 2026-05-14, a connection string do serviço apontava para `DBdirector_ti_29_homo` (base de homologação), não para `DBx_appb_ti_teste`. A connection string é armazenada em base64 em dois locais: `Program Files (x86)\Processa Sistemas\Director.Web\appsettings.json` (primário) e `ProgramData\Processa Sistemas\Director.Web\appsettings.json` (fallback para reinstalação silenciosa).

Questão em aberto: a tela operacional do Pipeliner no Director.Web ainda não foi explorada diretamente — a sessão do navegador expirou antes de investigar. Confirmar rota, menu e funcionalidades disponíveis é ação pendente.

## Related Concepts

- [[concepts/appbuilder]] — UI de cadastro e empacotamento; complementar ao Director.Web
- [[concepts/pipeliner-service]] — serviço Windows que executa os pipelines visualizados no Director.Web
- [[concepts/area-52]] — ambiente de dev onde Director.Web roda na porta 4600

## Sources

- [[calendar/notes/2026-05-14.md]] — insight do Everton sobre a tela operacional; endpoints validados; separação de responsabilidades AppBuilder vs Director.Web
