---
title: "ScriptPack-Appbuilder"
aliases: [ScriptPack, scriptpack, ScriptPack-Appbuilder.exe]
tags: [ferramenta, migracao, processa, appbuilder, sql-server]
sources:
  - "calendar/notes/2026-05-14.md"
created: 2026-05-14
updated: 2026-05-14
---

# ScriptPack-Appbuilder

Ferramenta CLI de migração de schema baseada em `migrant.lib`, usada para provisionar e atualizar o banco de dados do [[concepts/appbuilder]]. Disponível no share oficial `\\172.27.0.4\Projetos\Engenharia\Processa.Appbuilder` junto com os MSIs do AppBuilder.

## Key Points

- **Comandos principais**: `encode CREDENCIAL` (criptografa pra uso em URIs), `migrate URI...` (aplica migrações), `get-info` (info do pacote), `export` (exporta scripts).
- **Kind**: `Director(mssql)` com pacote `appbuilder` — é o tipo de migração reconhecido pela ferramenta.
- **URI com named instance**: aceita backslash literal (`mssql://{HASH}@172.27.0.121\SQL2k19/DBx_appb_ti_teste`). URL-encoded `%5C` **falha**.
- **Idempotente**: rodar `migrate` múltiplas vezes não duplica — aplica apenas migrações pendentes.
- **Erro cosmético**: `[fault]The handle is invalid` em stderr é `Console.GetBufferInfo` em processo sem console real — ignorável.

## Details

O ScriptPack foi usado em 2026-05-14 para migrar `DBx_appb_ti_teste` no [[concepts/area-52]]. A base já tinha 67 tabelas antes da migração; após aplicar o pacote `appbuilder`, ficou com 296 procedures. O processo é idempotente e seguro para reexecução.

O fluxo operacional é: (1) `encode` a credencial SQL para obter um hash seguro, (2) montar a URI com o hash no formato `mssql://{HASH}@host\instance/database`, (3) executar `migrate` com a URI. A ferramenta detecta automaticamente quais migrações já foram aplicadas e executa apenas as pendentes.

Localização no share de rede: `\\172.27.0.4\Projetos\Engenharia\Processa.Appbuilder\ScriptPack-Appbuilder.exe`. O mesmo diretório contém MSIs do AppBuilder (versões 1.10.1 até 1.14.0), `changelog.txt` e `Host.txt`.

## Related Concepts

- [[concepts/appbuilder]] — sistema cujo schema é provisionado por esta ferramenta
- [[concepts/area-52]] — ambiente onde a migração foi executada em 2026-05-14
- [[concepts/dbdirector]] — instância SQL Server que hospeda os bancos migrados

## Sources

- [[calendar/notes/2026-05-14.md]] — execução da migração em `DBx_appb_ti_teste`; descoberta do formato de URI com backslash literal; erro cosmético identificado
