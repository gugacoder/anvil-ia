---
title: "Idempotência via Filesystem"
aliases: [idempotência por pastas, folder-based idempotency, convenção pendente-importado-falha]
tags: [pattern, integracao, filesystem, idempotencia]
sources:
  - "calendar/notes/2026-05-13.md"
created: 2026-05-13
updated: 2026-05-13
---

# Idempotência via Filesystem

Padrão de design para processamento idempotente de arquivos baseado em convenção de pastas. Arquivos pendentes ficam na raiz; ao serem processados com sucesso, são movidos para uma subpasta `importado/`; em caso de erro, vão para `falha/`. Elimina a necessidade de tabela de controle de "consumido" — o filesystem é o estado.

## Key Points

- **Estrutura de 3 pastas**: `<raiz>/` (pendentes), `<raiz>/importado/` (sucesso), `<raiz>/falha/` (erro).
- **Varredura não-recursiva**: a procedure varredora lê apenas a raiz, sem descer em subpastas — isso garante que arquivos já movidos para `importado/` ou `falha/` não sejam reprocessados.
- **Idempotência gratuita**: o ato de mover o arquivo é atômico do ponto de vista do fluxo — se a procedure vê o arquivo na raiz, ele ainda não foi processado.
- **Origem da ideia**: sugestão do usuário na sessão de 2026-05-13, aceita como base da arquitetura proposta.
- **Complemento com tabela de log**: apesar de o filesystem ser o controle primário, uma tabela de log (`TBingestao_xml_log`, nome tentativo) registra cada processamento para auditoria e troubleshooting.

## Details

O padrão foi proposto no contexto da frente de ingestão de XML, onde o [[concepts/dbdirector]] leria XMLs diretamente de uma pasta de rede. A pasta raiz seria configurada em [[concepts/tbopcoes]]. A procedure varredora (`sp_xml_varrer`) listaria arquivos na raiz (via `xp_dirtree`, `sys.dm_os_enumerate_filesystem` ou técnica equivalente), e para cada arquivo chamaria `sp_xml_processar`, que ao final moveria o arquivo para `importado/` ou `falha/`.

O ganho principal sobre uma tabela de controle é a simplicidade operacional: não há estado a sincronizar entre filesystem e banco, e a visualização do status é trivial (basta listar os arquivos em cada pasta). A desvantagem é que depende de o SQL Server ter permissão de escrita na pasta de rede para mover arquivos — uma das perguntas em aberto para o analista. A tabela de log complementar (`TBingestao_xml_log`, inspirada em `TBintegracao_cobranca_bancaria_log`) fornece o histórico que o filesystem não preserva (timestamps, erros, métricas).

## Related Concepts

- [[concepts/tbopcoes]] — armazena a configuração da pasta raiz
- [[concepts/dbdirector]] — banco onde a procedure varredora executa
- [[concepts/pipeliner-service]] — agendador que dispara a procedure periodicamente

## Sources

- [[calendar/notes/2026-05-13.md]] — proposta da convenção de 3 pastas pelo usuário; decisão de usar filesystem como controle primário de idempotência com tabela de log complementar
