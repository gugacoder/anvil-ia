---
title: "Pipeliner Service"
aliases: [Pipeliner, pipeliner]
tags: [plataforma, servico, integracao, processa]
sources:
  - "calendar/notes/2026-05-13.md"
  - "calendar/notes/2026-05-14.md"
created: 2026-05-13
updated: 2026-05-14
---

# Pipeliner Service

Serviço Windows da plataforma Processa responsável por orquestrar pipelines de integração. Executa procedures agendadas, converte XML para JSON via [[concepts/xml-to-json-node]], e despacha requisições HTTP. Funciona como um scheduler + executor de fluxos configuráveis.

## Key Points

- **Função principal**: agendar e executar pipelines — cada pipeline é uma sequência de steps que pode incluir execução de procedures SQL, conversão de formatos e envio de requisições HTTP.
- **Conversão XML→JSON**: usa `XmlExtensions.XmlToJsonNode()` para converter XML produzido por `FOR XML PATH` em JSON tipado antes do despacho. Documentado em [[concepts/xml-to-json-node]].
- **Source code**: `sources/engenharia--fabrica--dotnet--pipeliner/` — solução .NET com o serviço em `Pipeliner.Service/` e sandbox de testes em `Sandbox/`.
- **Arquivo-chave**: `Pipeliner.Service/RequestService.cs` — contém a lógica de envio de requisição, incluindo a chamada ao conversor XML→JSON (linhas 241-242).
- **Modelo de cadastro**: cadastro via [[concepts/appbuilder]] (wizard React), deploy para DB destino via [[concepts/deploy-pipeline-newdb]]. Ação tipo `Query` funciona sozinha (sem step HTTP); procedure sem parâmetros passa dict vazio (`IntegrationRepository.cs:49-68`).
- **Schedule**: `pipeliner.TBstage.DFtempo_execucao` aceita inteiro em segundos (`300` = 5min) ou CRON `HH:MM` (`Pipeliner.Aplicacao:72-84`).
- **Não instalado na Área 52**: `Get-Service` no Srv-DirectorWeb (`172.27.0.52`) lista `Director.Portal`, `Director.Web`, `Processa.AppBuilder` — sem serviço Pipeliner. Ou roda em outro servidor ou não está instalado neste ambiente (2026-05-14).

## Details

O Pipeliner opera como intermediário entre o [[concepts/dbdirector]] e sistemas externos. O fluxo típico é: uma procedure SQL gera XML via `FOR XML PATH`, o Pipeliner converte para JSON usando o conversor [[concepts/xml-to-json-node]], e então despacha como requisição HTTP para uma API destino. O serviço gerencia autenticação, retry e logging do envio.

Na frente de ingestão de XML (2026-05-13), surgiu a hipótese de usar o Pipeliner apenas como agendador de uma procedure sem parâmetros (`sp_xml_varrer`), delegando toda a lógica de leitura, parse e ingestão para o SQL Server. Nesse modelo, o Pipeliner não usaria o conversor XML→JSON — serviria apenas como cron job que dispara a procedure periodicamente (a cada ~5 minutos, refinado em 2026-05-14). A viabilidade dessa abordagem depende de o DBdirector conseguir acessar a pasta de rede onde os XMLs são depositados, usando técnicas como `xp_dirtree`, `OPENROWSET BULK`, `xp_cmdshell` ou CLR.

Em 2026-05-14, confirmou-se que pipelines com ação única tipo `Query` são viáveis — não precisam de step `Request`/`SOAP`. O conversor [[concepts/xml-to-json-node]] só é invocado em ações Request/SOAP. Um pipeline com `"exec sp_xml_varrer"` como ação Query passa dict vazio e funciona. Teste end-to-end de cadastro foi feito pela UI do [[concepts/appbuilder]] (pipeline 8273, stage 8373 em `DBx_appb_ti_teste`), mas o scheduler não disparou em 8 minutos — o serviço Windows do Pipeliner **não está instalado** no Srv-DirectorWeb. A UI operacional de execução vive no [[concepts/director-web]], não no AppBuilder.

## Related Concepts

- [[concepts/xml-to-json-node]] — conversor XML→JSON usado pelo Pipeliner no fluxo padrão (só em ações Request/SOAP)
- [[concepts/dbdirector]] — banco onde as procedures executadas pelo Pipeliner vivem
- [[concepts/tbopcoes]] — tabela de configuração consultada pelas procedures
- [[concepts/appbuilder]] — UI de cadastro de pipelines
- [[concepts/director-web]] — UI operacional de visualização e execução
- [[concepts/area-52]] — ambiente de dev onde o Pipeliner não está instalado (2026-05-14)

## Sources

- [[calendar/notes/2026-05-13.md]] — papel do Pipeliner no fluxo de ingestão XML, hipótese de uso como mero agendador, referência a RequestService.cs
- [[calendar/notes/2026-05-14.md]] — confirmação de Query-only pipeline; schedule via TBstage.DFtempo_execucao; ausência do serviço no Srv-DirectorWeb; teste e2e de cadastro via AppBuilder UI
