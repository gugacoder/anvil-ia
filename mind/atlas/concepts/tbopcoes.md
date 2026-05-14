---
title: "TBopcoes"
aliases: [TBopcoes, tabela de opções, tabela de configuração Director]
tags: [director-erp, configuracao, sql-server]
sources:
  - "calendar/notes/2026-05-13.md"
created: 2026-05-13
updated: 2026-05-13
---

# TBopcoes

Tabela de configuração do Director ERP que armazena parâmetros operacionais do sistema em formato chave-valor. Funciona como um key-value store centralizado para configurações que variam por instalação ou cliente, evitando hard-coding de valores em procedures e aplicação.

## Key Points

- **Localização**: banco [[concepts/dbdirector]] (`DBdirector`).
- **Papel**: armazena configurações operacionais do Director ERP — caminhos de rede, flags de feature, parâmetros de integração, etc.
- **Uso em procedures**: procedures SQL consultam `TBopcoes` para obter valores configuráveis (ex: pasta raiz de XMLs para ingestão).
- **Convenções de nomenclatura**: ainda não investigadas — perguntar ao analista se há padrão para nomes de chaves e se o escopo é global ou por cliente.
- **Princípio "analista decide"**: nomes de chaves propostos pelo agente são tentativos até validação pelo analista.

## Details

Na frente de ingestão de XML (2026-05-13), `TBopcoes` foi identificada como o local natural para configurar a pasta raiz onde os XMLs são depositados. A procedure varredora (`sp_xml_varrer`, nome tentativo) consultaria `TBopcoes` para saber qual diretório monitorar, em vez de ter o caminho hard-coded.

Questões em aberto para o analista: (1) existe convenção de nomenclatura para chaves em `TBopcoes`? (2) o escopo é global ou por cliente/empresa? (3) o formato do valor para caminhos de rede é UNC absoluto (`\\servidor\share\pasta`) ou admite templates com placeholders? (4) existem chaves existentes para pastas de integração que sirvam de referência? Essas perguntas acumulam na lista de itens a discutir quando o tema voltar.

## Related Concepts

- [[concepts/dbdirector]] — banco onde a tabela vive
- [[concepts/pipeliner-service]] — serviço que pode disparar procedures que consultam `TBopcoes`
- [[concepts/idempotencia-filesystem]] — o valor configurado em `TBopcoes` (pasta raiz) alimenta a convenção de pastas para idempotência

## Sources

- [[calendar/notes/2026-05-13.md]] — identificação de `TBopcoes` como local da configuração de pasta raiz; perguntas pendentes para o analista sobre convenções
