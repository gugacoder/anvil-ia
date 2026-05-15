---
title: "Deploy Pipeline (savePipelineNewDB)"
aliases: [savePipelineNewDB, deploy de pipeline, deploy rápido]
tags: [plataforma, processa, appbuilder, deploy, pipeline]
sources:
  - "calendar/notes/2026-05-14.md"
created: 2026-05-14
updated: 2026-05-14
---

# Deploy Pipeline (savePipelineNewDB)

Endpoint do [[concepts/appbuilder]] que replica um pipeline já cadastrado no DB do AppBuilder para um DB destino. Não é cadastro inicial — é mecanismo de deploy. A equipe dev usa para implantar pipelines em bases internas de teste rapidamente; depois usa o mesmo mecanismo para empacotar para o cliente final.

## Key Points

- **Endpoint**: `POST /api/pipeliner/savePipelineNewDB` no AppBuilder.
- **Payload**: `{ "ids": <id-do-pipeline-no-db-do-appbuilder> }` — referencia um pipeline que já existe no DB origem.
- **Lógica** (`PipelinerRepository.cs:104-196`): busca pipeline+stages via `GenericDAO.Get<Pipeline>`, monta script T-SQL idempotente (`CREATE schema pipeliner` + `CREATE TABLE` + INSERT/UPDATE em `TBpipeline`/`TBstage`), executa no DB destino.
- **DB destino**: determinado pelo **usuário Windows logado** via `appbuilder.TBconfiguracao_usuario`, que mapeia user → connection string. Dev aponta pra base de teste; release aponta pra cliente.
- **Idempotente**: script gerado usa `IF NOT EXISTS` para schema e tabelas; INSERT/UPDATE para dados.

## Details

O `savePipelineNewDB` é a ponte entre o ambiente de cadastro (DB do AppBuilder) e o ambiente de execução (DB destino onde o [[concepts/pipeliner-service]] vai ler `pipeliner.TBpipeline`/`TBstage`). Ele não chama `pipeliner.sp_persistirPipeliner` diretamente — gera SQL inline que cria a infraestrutura completa se necessário.

O fato de o DB destino ser determinado por `appbuilder.TBconfiguracao_usuario` com base no usuário Windows logado significa que a mesma UI serve para deploy em ambientes diferentes sem trocar configuração: cada dev/devops tem sua entrada na tabela apontando para o DB que precisa. Isso valida a tese da equipe: "AppBuilder oferece deploy rápido para implantar em bases internas da equipe dev/devops, e depois empacota pro cliente final" — o mecanismo é o mesmo, muda só a connection string do user.

Implicação operacional: para usar o endpoint via automação (cURL), é necessário autenticar como um usuário que tenha entrada em `TBconfiguracao_usuario`. Auth via LDAP global (`--ntlm`) — não testado em 2026-05-14.

## Related Concepts

- [[concepts/appbuilder]] — sistema que expõe o endpoint
- [[concepts/pipeliner-service]] — consome o resultado do deploy (lê `TBpipeline`/`TBstage` no DB destino)
- [[concepts/area-52]] — ambiente de dev onde o deploy é testado

## Sources

- [[calendar/notes/2026-05-14.md]] — leitura direta de `PipelinerRepository.cs:104-196`; confirmação da tese da equipe sobre deploy rápido vs empacotamento; payload e lógica do endpoint
