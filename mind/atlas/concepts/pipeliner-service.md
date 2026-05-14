---
title: "Pipeliner Service"
aliases: [Pipeliner, pipeliner]
tags: [plataforma, servico, integracao, processa]
sources:
  - "calendar/notes/2026-05-13.md"
created: 2026-05-13
updated: 2026-05-13
---

# Pipeliner Service

Serviço Windows da plataforma Processa responsável por orquestrar pipelines de integração. Executa procedures agendadas, converte XML para JSON via [[concepts/xml-to-json-node]], e despacha requisições HTTP. Funciona como um scheduler + executor de fluxos configuráveis.

## Key Points

- **Função principal**: agendar e executar pipelines — cada pipeline é uma sequência de steps que pode incluir execução de procedures SQL, conversão de formatos e envio de requisições HTTP.
- **Conversão XML→JSON**: usa `XmlExtensions.XmlToJsonNode()` para converter XML produzido por `FOR XML PATH` em JSON tipado antes do despacho. Documentado em [[concepts/xml-to-json-node]].
- **Source code**: `sources/engenharia--fabrica--dotnet--pipeliner/` — solução .NET com o serviço em `Pipeliner.Service/` e sandbox de testes em `Sandbox/`.
- **Arquivo-chave**: `Pipeliner.Service/RequestService.cs` — contém a lógica de envio de requisição, incluindo a chamada ao conversor XML→JSON (linhas 241-242).
- **Modelo de cadastro de pipeline**: ainda não estudado em detalhe (H1 pendente na frente pipeliner-ingestao-xml).

## Details

O Pipeliner opera como intermediário entre o [[concepts/dbdirector]] e sistemas externos. O fluxo típico é: uma procedure SQL gera XML via `FOR XML PATH`, o Pipeliner converte para JSON usando o conversor [[concepts/xml-to-json-node]], e então despacha como requisição HTTP para uma API destino. O serviço gerencia autenticação, retry e logging do envio.

Na frente de ingestão de XML (2026-05-13), surgiu a hipótese de usar o Pipeliner apenas como agendador de uma procedure sem parâmetros (`sp_xml_varrer`), delegando toda a lógica de leitura, parse e ingestão para o SQL Server. Nesse modelo, o Pipeliner não usaria o conversor XML→JSON — serviria apenas como cron job que dispara a procedure periodicamente (a cada ~10 minutos). A viabilidade dessa abordagem depende de o DBdirector conseguir acessar a pasta de rede onde os XMLs são depositados, usando técnicas como `xp_dirtree`, `OPENROWSET BULK`, `xp_cmdshell` ou CLR.

## Related Concepts

- [[concepts/xml-to-json-node]] — conversor XML→JSON usado pelo Pipeliner no fluxo padrão
- [[concepts/dbdirector]] — banco onde as procedures executadas pelo Pipeliner vivem
- [[concepts/tbopcoes]] — tabela de configuração consultada pelas procedures

## Sources

- [[calendar/notes/2026-05-13.md]] — papel do Pipeliner no fluxo de ingestão XML, hipótese de uso como mero agendador, referência a RequestService.cs
