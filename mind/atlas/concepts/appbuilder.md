---
title: "AppBuilder"
aliases: [Processa.AppBuilder, appbuilder, AppBuilder]
tags: [plataforma, processa, cadastro, pipeline, ui]
sources:
  - "calendar/notes/2026-05-14.md"
created: 2026-05-14
updated: 2026-05-14
---

# AppBuilder

Sistema da Processa que funciona como UI de cadastro e empacotamento de artefatos da plataforma — pipelines, formulários, cadastros, páginas e módulos. Não participa do runtime de execução dos pipelines; essa responsabilidade é do serviço Windows [[concepts/pipeliner-service]] e do [[concepts/director-web]]. A topologia correta é: **AppBuilder cadastra → Director.Web/Portal executa**.

## Key Points

- **Função dual**: (1) cadastro de artefatos via wizard React, (2) empacotamento para deploy em bases internas de dev/devops ou para cliente final via endpoint `savePipelineNewDB`.
- **UI do Pipeliner**: rota `/#/pipeliner` expõe wizard de cadastro — integração → estágios → ações. Tipos de ação: Request, SOAP, **Query**, Log, Monitoramento de Email, Envio de Email. Não tem "Executar agora" — apenas operações CRUD.
- **Auth**: login Nome/Senha próprio em `/#/login` (não Windows auth automático). Middleware LDAP global (`Processa.Sdk.Auth.LDAPAuthMiddleware`) aplicado sem `[Authorize]` nos controllers.
- **SPA com hash routing**: rotas internas usam `/#/...`. Bater em `/pipeliner` direto retorna JSON 401 — não é rota SPA, é endpoint API.
- **Home exibe 4 cards**: Cadastros, Páginas, Pipeliner, Páginas Mobile.

## Details

O AppBuilder gera apps para o Director ERP da Processa. A equipe dev usa o AppBuilder para cadastrar interfaces (pipelines, formulários, etc.), depois faz "deploy rápido" para bases internas de dev/devops via [[concepts/deploy-pipeline-newdb]], abre o [[concepts/director-web]] ou Director.Portal e testa. Quando o resultado é satisfatório, o AppBuilder empacota para o cliente final.

O wizard de pipeline em `/#/pipeliner` permite cadastro completo: criar integração (nome, status, URLs), adicionar estágios (tempo de execução em segundos ou CRON, ambiente HOMOLOGACAO/PRODUCAO, status), e adicionar ações por estágio (tipo, nome, intervalo, procedure/query). A ação tipo `Query` aceita procedures sem parâmetros — `exec sp_xml_varrer` passa dict vazio. O conversor [[concepts/xml-to-json-node]] só é invocado em ações tipo `Request` ou `SOAP`, não em `Query`.

O endpoint `POST /api/pipeliner/jobs/exec` existe mas funciona como proxy: lê endereço externo de `acesso.TBaplicacao` chave `pipeliner`. Se essa chave não estiver cadastrada no DB, o disparo manual via API falha. Em `DBx_appb_ti_teste` essa chave não existia em 2026-05-14 (apenas `director` em `http://localhost:4310`).

Source code: `sources/engenharia--fabrica--dotnet--processa.appbuilder/` — frontend React em `Fontes/website/src/routes/Pipeliner/`, backend em `Processa.AppBuilder/Controllers/PipelinerController.cs`.

## Related Concepts

- [[concepts/director-web]] — UI operacional onde pipelines são visualizados e executados
- [[concepts/deploy-pipeline-newdb]] — mecanismo de deploy de pipelines para DBs destino
- [[concepts/pipeliner-service]] — serviço Windows que executa os pipelines cadastrados
- [[concepts/area-52]] — ambiente de dev onde AppBuilder roda na porta 4305
- [[concepts/xml-to-json-node]] — conversor usado apenas em ações Request/SOAP, não Query

## Sources

- [[calendar/notes/2026-05-14.md]] — UI localizada no AppBuilder (não no Portal Director); wizard mapeado; auth LDAP; endpoint jobs/exec como proxy; teste e2e de cadastro via UI (pipeline 8273, stage 8373)
