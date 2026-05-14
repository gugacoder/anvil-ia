---
title: "Connection: Pipeliner Bypass via DBdirector"
connects:
  - "concepts/pipeliner-service"
  - "concepts/dbdirector"
  - "concepts/xml-to-json-node"
sources:
  - "calendar/notes/2026-05-13.md"
created: 2026-05-13
updated: 2026-05-13
---

# Connection: Pipeliner Bypass via DBdirector

## The Connection

O [[concepts/pipeliner-service]] normalmente atua como orquestrador completo: lê dados, converte XML→JSON via [[concepts/xml-to-json-node]], e despacha requisições. A hipótese de bypass propõe inverter essa arquitetura: o [[concepts/dbdirector]] faz todo o trabalho pesado (leitura de arquivos, parse XML, validação, ingestão), e o Pipeliner se reduz a um cron job que dispara uma procedure sem parâmetros a cada ~10 minutos.

## Key Insight

O conversor [[concepts/xml-to-json-node]] existe para contornar limitações do Newtonsoft.JSON na conversão XML→JSON (tipagem e arrays). Porém, se o destino final dos dados é o próprio banco SQL Server — e não uma API externa que espera JSON — o passo de conversão XML→JSON é desnecessário. O SQL Server já sabe ler XML nativamente (`OPENROWSET BULK` + tipo `xml`, `XQuery`, `nodes()`). Isso elimina o conversor do fluxo e concentra 100% da lógica em T-SQL, onde o time já tem domínio.

O trade-off é que o SQL Server precisa de acesso à pasta de rede (permissão do service account, técnica de leitura de arquivo), e perde-se o que o Pipeliner oferece além da conversão: autenticação HTTP, retry, logging estruturado. Para fluxos puramente de ingestão (arquivo → banco), o bypass faz sentido; para fluxos que terminam em chamada HTTP a APIs externas, o Pipeliner continua necessário.

## Evidence

- Sessão de 2026-05-13: usuário levantou a hipótese e instruiu o agente a inquirir o analista quando o assunto voltar.
- Lista de 8+ perguntas pendentes acumuladas para o analista sobre viabilidade técnica (acesso a rede pelo SQL Server, técnicas de leitura de arquivo, volume de XMLs).
- Técnicas candidatas para leitura de arquivo no SQL Server: `xp_dirtree`, `OPENROWSET BULK`, `xp_cmdshell`, CLR, `sys.dm_os_enumerate_filesystem`.
- Referência: procedures existentes no SVN (`\\172.27.3.10\svn\trunk`) podem já usar alguma dessas técnicas — inventário pendente.

## Related Concepts

- [[concepts/pipeliner-service]] — o orquestrador que seria simplificado
- [[concepts/dbdirector]] — o banco que assumiria o trabalho pesado
- [[concepts/xml-to-json-node]] — o conversor que seria dispensado neste fluxo
- [[concepts/tbopcoes]] — configuração da pasta raiz dos XMLs
- [[concepts/idempotencia-filesystem]] — padrão de idempotência proposto para o fluxo
