---
title: "DBdirector"
aliases: [DBdirector, banco do Director]
tags: [infraestrutura, sql-server, director-erp]
sources:
  - "calendar/notes/2026-05-13.md"
created: 2026-05-13
updated: 2026-05-13
---

# DBdirector

Instância SQL Server que hospeda o banco de dados `DBdirector`, backend do Director ERP da Processa. É o banco principal onde vivem as tabelas de configuração, dados operacionais e procedures do sistema.

## Key Points

- **Servidor**: `172.27.0.121\SQL2k19` — instância nomeada `SQL2k19` em host na rede interna Processa.
- **Banco**: `DBdirector`.
- **Versão**: SQL Server 2019 Developer Edition (build 15.0.2130.3).
- **Autenticação**: SQL Authentication (login `sl`), com `TrustServerCertificate=true` e `Encrypt=true`.
- **Credenciais**: vivem em `.env` (chaves `DIRECTOR_DB_HOST`, `DIRECTOR_DB_INSTANCE`, `DIRECTOR_DB_NAME`, `DIRECTOR_DB_USER`, `DIRECTOR_DB_PASS`, `DIRECTOR_DB_TRUST_CERT`). Nunca memorizadas pelo agente.

## Details

A conexão foi validada em 2026-05-13 via PowerShell usando `System.Data.SqlClient` com connection string `Server=172.27.0.121\SQL2k19;Database=DBdirector;User Id=sl;Password=...;TrustServerCertificate=true;Encrypt=true;`. O acesso requer VPN ativa para a rede Processa (172.27.x.x).

O DBdirector é o alvo de qualquer procedure ou artefato SQL produzido em frentes de trabalho que envolvam o Director ERP. Procedures como as da frente [[concepts/pipeliner-service]] executam neste banco. A tabela [[concepts/tbopcoes]] (configurações do sistema) também vive aqui. Para prototipar SQL, os scripts vão para `sources/procedures/` e são testados contra este banco; a replicação no sistema real (scriptagem do Director) é feita pelo analista.

O share SVN `\\172.27.3.10\svn\trunk` contém procedures do time de desenvolvimento que também executam neste banco — é a referência para técnicas já adotadas (ex: leitura de arquivos de rede, patterns de log).

## Related Concepts

- [[concepts/tbopcoes]] — tabela de configuração que vive neste banco
- [[concepts/pipeliner-service]] — serviço que agenda e executa procedures neste banco
- [[concepts/xml-to-json-node]] — conversor usado pelo Pipeliner; hipótese de bypass envolve rodar lógica diretamente neste banco

## Sources

- [[calendar/notes/2026-05-13.md]] — validação de conexão via `.env`, detalhes de versão e connection string
