---
title: "Hipóteses — pipeliner-ingestao-xml"
aliases: [hipoteses-pipeliner-xml]
tags: [effort, hipoteses]
---

# Hipóteses

Hipóteses verificáveis e perguntas em aberto. Cada uma vira `confirmada`, `divergente` ou `descartada` à medida que estudamos o source / falamos com o analista.

## Status atual

| ID | Hipótese / Pergunta | Status | Evidência / Nota |
|----|---------------------|--------|------------------|
| H1 | Pipeliner permite agendar pipeline executando procedure **sem parâmetros**. | **confirmada** (2026-05-14) | `Pipeliner.Repository/IntegrationRepository.cs:49-68` — action tipo `Query` com `"exec sp_xml_varrer"` passa dict vazio ao `GenericDAO.Query`. Schedule via `TBstage.DFtempo_execucao` (segundos; `300` = 5min). Cadastro via INSERT em `pipeliner.TBpipeline` + `pipeliner.TBstage` (sem UI nativa). Sandbox: `Sandbox/Program.cs:112`. |
| H2 | DBdirector tem técnica já adotada pelo time pra ler arquivo de rede em procedure. | pendente | busca por `OPENROWSET`, `xp_dirtree`, `xp_cmdshell`, `BULK INSERT`, CLR, linked server em `\\172.27.3.10\svn\trunk` |
| H3 | Service account do SQL Server consegue ler a pasta de rede com permissão atual. | pendente | confirmar com analista; testar leitura via procedure |
| H4 | `TBopcoes` já tem chaves de pasta de integração — existe convenção de nomenclatura. | pendente | grep em procedures que consultam `TBopcoes` por padrões UNC |
| H5 | `TBintegracao_cobranca_bancaria_log` é bom modelo de log+controle pra esse fluxo. | pendente | ler DDL e uso real da tabela referência |
| H6 | Idempotência por convenção de filesystem: raiz = pendente, `importado/` = sucesso, `falha/` = erro. Varredura lê só a raiz (não recursivo). | pendente | depende de permissão de **escrita** do service account do SQL Server na pasta — precisa confirmar com analista |
| H7 | Bypassar o conversor XML→JSON do Pipeliner ([[xml-to-json-node]]) é viável e ganha simplicidade. | **confirmada** (2026-05-14) | pipeline aceita action única tipo `Query` e termina — não exige step de despacho HTTP. Conversor só é usado em actions `Request`/`SOAP`. Ainda depende de H2/H3 pra técnica de leitura de arquivo. |
| H8 | Schema `pipeliner.*` vive no próprio DBdirector (não em DB separado). | **divergente** (2026-05-14) | schema `pipeliner` com tabelas `TBpipeline` + `TBstage` confirmado em **`DBx_appb_ti_teste`** (DB do AppBuilder de teste, mesmo servidor `172.27.0.121\SQL2k19`). Não verificado ainda se existe também em `DBdirector` — vale checar pra entender topologia (uma DB Pipeliner por ambiente vs por cliente). |
| H9 | O Portal Director (AppBuilder) **tem** tela de cadastro de pipeline acima das tabelas `pipeliner.*`. | **divergente — refinada** (2026-05-14) | UI **não** está no Portal Director — está no próprio **AppBuilder**: rota `/pipeliner` em `processa.appbuilder/Fontes/website/src/routes/Pipeliner/Pipeliner.jsx`. Wizard pipeline→stages→actions. Backend: `PipelinerController.cs` → `POST /api/pipeliner/savePipelineNewDB` → proc `pipeliner.sp_persistirPipeliner`. Portal Director só **consome** pipelines (executor). |
| H11 | Endpoint `savePipelineNewDB` permite escolher DB destino no cadastro (parametriza connection string / database name). Implicação: o mesmo AppBuilder cadastra pipelines pra qualquer DB cliente — base do "pacote de instalação". | **confirmada** (2026-05-14) | `PipelinerRepository.cs:104-196`. Endpoint é **deploy**, não cadastro inicial: payload `{"ids": <id>}`, busca pipeline+stages no DB do AppBuilder (`GenericDAO.Get<Pipeline>(id)`), gera script T-SQL com `CREATE schema pipeliner` + `CREATE TABLE TBpipeline/TBstage` (idempotente) + INSERT/UPDATE, e executa contra `userConfigRepository.GetUserConnection()` — o **DB destino é configurado pelo usuário Windows logado** via `appbuilder.TBconfiguracao_usuario`. É o "deploy rápido" da tese do usuário. |
| H12 | Cadastro inicial do pipeline (criar no DB do AppBuilder) usa `pipeliner.sp_persistirPipeliner` por trás. | provável | a procedure existe (`sources/engenharia--fabrica--sql--processa-appbuilder/pipeliner/2-procedures/`) e aceita XML estruturado, mas o `PipelinerController.cs` não a chama. Provavelmente invocada via SDK genérico do Processa (`Processa.Sdk`) ou outro controller. Vale confirmar antes de assumir. |
| H13 | API do AppBuilder é chamável headless via cURL com auth Windows (NTLM/Kerberos). | provável-baixo | middleware LDAP (`Processa.Sdk.Auth.LDAPAuthMiddleware`) é global. cURL com `--ntlm -u dom\\user:pass` deve passar SE o usuário tem entrada em `appbuilder.TBconfiguracao_usuario`. Não testado. |
| H10 | A frente se divide em dois sistemas: (1) Director Portal de teste — onde cadastramos pipeline e validamos end-to-end; (2) AppBuilder — onde o procedimento é salvo numa base interna Processa e vira pacote de instalação no cliente. Fase 1 prova H1+H7; só então atacamos fase 2. | em curso | tese do usuário 2026-05-14. |

## Como atualizar

- Ao confirmar/divergir uma hipótese: trocar status, anexar evidência (arquivo:linha do source, citação do analista, resultado de query).
- Ao adicionar hipótese nova: próxima ID livre, status `pendente`.
- Hipótese descartada não é apagada — vira registro do que foi tentado.
