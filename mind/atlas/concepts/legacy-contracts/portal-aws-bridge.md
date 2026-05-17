---
title: "Bridge Portal Director ↔ Portal AWS"
aliases: [portal-aws-bridge, bridge-aws, integracao-aws, integrador-aws, portal-aws-client, sincronizar-entidade]
tags: [contract, legacy, integration, aws, cross-tenant, sync, auth, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: Bridge Portal Director ↔ Portal AWS

O `Portal.Director` on-premise do tenant **fala com um segundo portal hospedado em nuvem AWS** (`portal-aws`) para dois propósitos: (1) **push de cargas** de cadastros do ERP local para o banco AWS via XML serializado (sincronização de domínio), e (2) **proxy de chamadas REST** para procedures que vivem **no banco AWS** (consultas e mutações de entidades que só existem lá, como `Usuario Fornecedor`, usado pelo módulo de Agendamento). É a ponte clássica de duas bases — uma "on-prem ERP" (Director, com `TBfornecedor`, `TBusuario`, `TBcontato_fornecedor`, etc.) e uma "cloud agendamento" (AWS, com `portal.Usuario`, `portal.Fornecedor`, `portal.Empresa`, agendamentos, configurações de docas, etc.).

A bridge é **um único cliente HTTP estático** (`PortalAwsClient`) no `Portal.Director`. Endereço de destino e domínio do tenant na AWS vêm da tabela `acesso.TBaplicacao` (linha com `DFchave = 'portal-aws'`). Autenticação entre os dois portais é por **JWT compartilhado**: o Director assina um token com a identidade do usuário corrente — incluindo o `Domain` lido do registro `portal-aws` da `TBaplicacao` — e a AWS valida com a **mesma chave simétrica** (`Consts.SecretKey`), reconstrói a `DirectorIdentity` e prossegue. Não há OAuth, não há refresh, não há cert pinning; é um segredo compartilhado entre os dois deploys.

Fluxos coexistentes (todos passam pelo mesmo `PortalAwsClient.SendRequest`):

1. **Sync (push, ERP→AWS), sob-demanda**: tela `/configuracoes/integrador-aws` no Director permite ao usuário selecionar uma entidade (`redes`, `empresas`, `centros`, `departamentos`, `veiculos`, `feriados`, `fornecedores`, `itens`, `planos`, `usuarios`) e clicar **Enviar**. O Director executa a proc `aws_sincronizar_entidade @entidade` no banco local — que produz um **XML `FOR XML PATH(...)`** com o estado atual da entidade — e faz `POST /api/proc/portal.sincronizar_<entidade>` no portal-aws com esse XML no body. Do lado AWS, a proc espelho (`portal.sincronizar_<entidade> @xml XML`) faz `UPDATE` em registros pré-existentes (match por `ErpId`) e `INSERT` em novos, retornando envelope `<Resposta>` com `Status/Sucesso/Dados`. Não há schedule automático: o disparo é sempre manual via UI.
2. **Proxy REST (request/response), por ação de usuário**: Director expõe endpoints HTTP (`/api/fornecedor/listar`, `/api/fornecedor/persistir`, `/api/fornecedor/deletar`, `/api/fornecedor/obter`) que fazem `POST` direto contra procs no AWS (`portal.obter_usuarios_fornecedores`, `portal.persistir_usuario_fornecedor`, `portal.deletar_usuario_fornecedor`, `portal.sp_obter_usuario_fornecedor`). O Director **não armazena** os usuários fornecedores localmente — apenas enriquece o retorno com `Fornecedor` resolvido via `idsFornecedores` consultando `TBfornecedor` local (join cross-base feito em memória no `FornecedorService`).
3. **Login de "usuário fornecedor" (AWS→ERP)**: paralelo à bridge, o `Processa.Sdk.Auth.AuthMiddleware` detecta se o `user` contém `@` (heurística: e-mail = vendedor/fornecedor cadastrado na AWS) e **redireciona a query de auth** para `Settings.AuthFornecedorAWSQuery` em vez de `Settings.AuthQuery`. Essa query alternativa vem do Seat (`SeatContext.AuthFornecedorAWS`, tipo de serviço `TipoServico.AuthFornecedorAWS`) e bate no banco AWS para validar a senha hasheada (SHA2_256 sobre `dbo.fn_Decript` da senha do XML quando veio do ERP, ou sobre a senha plain quando criada direto na AWS). Ver [[processa-auth-paths]] para o desenho completo dos 5 caminhos de login.
4. **LDAP/Active Directory**: o `AuthMiddleware` também tem ramo `IsLdapUser() → AuthenticateLdap(User, Password, Group)`, mas isso é login do **usuário interno** ao Portal.Director — não é parte da bridge AWS. Mencionado aqui só pra fechar o quadro de auth e evitar confusão.

A AWS hospeda também um **serviço auxiliar `Processa.Integrador.AWS`** (TBaplicacao chave `integrador-aws`, porta `4303` default, IP guardado na configuração `Integrador.IP` da `cotacao.TBconfig_opcoes` — exemplo on-prem: `172.27.0.114`/`172.27.0.131`). O Director conhece esse integrador como uma aplicação separada, mas **a bridge documentada aqui não o invoca diretamente** — `PortalAwsClient` fala com o `portal-aws` (porta `5100` default, `52.67.203.133:5100` em produção segundo o diagrama de arquitetura). O `integrador-aws` aparece como destino futuro/alternativo de sincronização > **inferido** — o que está implementado hoje na bridge é Portal.Director → portal-aws direto.

## Citações de fonte

- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Api/PortalAwsClient.cs:1-33` — classe estática `PortalAwsClient.SendRequest(object, requestUrlApi, HttpMethod, jwt?)`: lê `IpPortalAws` e `Domain` da `acesso.TBaplicacao WHERE DFchave='portal-aws'`, gera JWT com `DirectorIdentity` modificada (Domain sobrescrito), monta `HttpRequestMessage` com header `Authorization: Bearer <jwt>` + `ContentType: application/json`, envia via `HttpClient.Send` (síncrono), retorna `Stream` do corpo. Sem retry, sem timeout custom, sem circuit breaker, sem logging de erro.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Controllers/IntegradorAwsController.cs:1-30` — controller único `[Route("api/integradoraws/")]` com `GET /sincronizar/{entidade}`: executa `EXEC aws_sincronizar_entidade @entidade, null` no banco local, captura body XML, repassa via `PortalAwsClient.SendRequest(body, "/api/proc/portal.sincronizar_{entidade}", POST)`. Catch genérico só escreve `ex.Message` no Console; em erro devolve `Stream.Null`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Controllers/UtilsController.cs:60-93` — controllers de fornecedor: `POST /api/fornecedor/listar`, `/persistir`, `/deletar` chamam `PortalAwsClient.SendRequest` com paths `/api/proc/portal.obter_usuarios_fornecedores`, `.../portal.persistir_usuario_fornecedor`, `.../portal.deletar_usuario_fornecedor`. `POST /api/fornecedor/obter` delega ao `FornecedorService`. `POST /api/{appkey}/proc/{proc}` é endpoint genérico que aceita qualquer `appkey` (não só `portal-aws`) e usa `IHttpClientService.ExecProc` — esse caminho passa por outro cliente HTTP (não `PortalAwsClient`).
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Services/FornecedorService.cs:9-30` — `ObterUsuarioFornecedor(id)` usa `httpClientService.GetProc("portal-aws", "portal.sp_obter_usuario_fornecedor", id)`, parseia `Response.Dados` como JSON (resposta da AWS já convertida de XML), extrai `IdsFornecedores` e enriquece com `Fornecedor` resolvido por `repository.ObterFornecedoresId` (consulta ao ERP local).
- `sources/engenharia--fabrica--sql--portal-director/processa.agendamento/programacao/aws_sincronizar_entidade.sql:1-215` — proc no Director que monta cargas XML para cada entidade. Switch por `@entidade`. Saídas: `<Redes>`, `<Empresas>`, `<CentrosDeDistribuicao>` (composta — `<Centros>`+`<Areas>`+`<Docas>`), `<Departamentos>` (apenas níveis 1 e 2), `<Veiculos>` (UNION tipo+marca discriminado por `TipoEntidade='T'|'M'`), `<Feriados>` (somente ano corrente), `<Itens>`, `<Planos>`, `<Fornecedores>` (filtra `DFcgc IS NOT NULL`), `<Usuarios>` (compõe AdministradorEmpresa do `TBusuario` + VENDEDOR do `TBcontato_fornecedor` filtrado por `DFid_setor_contato = TBopcoes.DFcodigo=441`, e-mails únicos via `MAX(DFid_contato_fornecedor)`). Senha do vendedor é literal `'for-' + LEFT(DFcgc, 3)` (3 primeiros dígitos do CNPJ do fornecedor).
- `sources/engenharia--fabrica--sql--portal-aws/portal/integracao/portal.sincronizar_*.sql` — procs espelho do lado AWS. Cada uma recebe `@xml XML`, abre transação, faz `UPDATE` por match `ErpId`, `INSERT` para novos, devolve `<Resposta><Status>200|500</Status><Sucesso>true|false</Sucesso><Dados>...</Dados></Resposta>` em XML. Em erro: ROLLBACK + `[Procedure]: ... | [ERRO]: ... | [LINHA]: ...`.
- `sources/engenharia--fabrica--sql--portal-aws/portal/integracao/portal.sincronizar_usuarios.sql:1-135` — caso mais elaborado: senha do XML, se vier do ERP (tem `EmpresaErpId`), passa por `dbo.fn_Decript` antes do `HashBytes('SHA2_256', ...)`; se vier sem empresa (vendedor), hasheia direto. Coluna alvo: `portal.Usuario.Senha`. `Inativacao = GETDATE()` quando `Ativo=0`, senão `NULL`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:14-66` — `GenerateJWTToken(DirectorIdentity, days=1)`: usa `Consts.SecretKey` + `HmacSha256Signature`, claim única `"identidade"` com `DirectorIdentity.ToJson()`. `ValidateJWTToken` valida assinatura, ignora issuer/audience, custom `LifetimeValidator`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:60-90` — `GetIdentity(name, password, domain)`: se `name.Contains('@')` → seleciona `Settings.AuthFornecedorAWSQuery` em vez de `Settings.AuthQuery`. `Database.GetConnection(domain)` cria a conexão pro banco do tenant; o domain é parte da `DirectorIdentity` e é o discriminador multi-tenant em `Database.cs:25`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Settings.cs:54, 175` — `AuthFornecedorAWSQuery` propriedade estática setada via `SetCustomAuthQuery(...)` (chamado por `SeatContext.AuthFornecedorAWS` no Extensoes.cs:17 do Sdk.Seat).
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Repositories/AcessoAplicacaoRepository.cs:27-87` — `ObterEndereco(chave)` é o caminho de **abertura** de uma app a partir do menu do Director: monta um JWT com `Domain = app.Dominio`, monta payload `{urlPortalDirector, urlPortalAWS, tokenOrigin:"PortalDirector", appKey, sidebarTheme, sideBarBrand, sideBarBrandMinimized}`, concatena com ACL + menu, base64-encoda e retorna URL `{app.Caminho}/#/auth?tkn=<base64>&jwt=<jwt>`. Esse é o handshake de entrada na SPA hospedada na AWS quando o usuário clica na tela da app no portal Director. > inferido: a SPA da AWS lê o `tkn` e o `jwt` da query, decoda o tkn, persiste em storage local e usa o jwt como bearer para chamadas subsequentes — confirmação completa exigiria escavar o handler `/#/auth` na SPA da AWS, fora do escopo das fontes atuais.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Dominio/TApp.cs:1-23` — `TApp.URLPortalDirector` e `TApp.URLPortalAWS` são as duas URLs entregues à SPA no handshake. Sinaliza que cada app conhece **dois back-ends** (on-prem e cloud).
- `sources/engenharia--fabrica--sql--portal-director/portal.director/pos-script.sql:8, 16` — seed inicial da `acesso.TBaplicacao` define `portal-aws` em `http://127.0.0.1:5100` (porta 5100) e o auxiliar `integrador-aws` em `http://localhost:4303` (porta 4303). Linha 13 mostra também `processaadm` em `http://52.67.203.133:5300` — confirma que `52.67.203.133` é o IP do ADM na AWS, **não** do `portal-aws` (que pode estar em outro host AWS). > TBD: o IP de produção real do `portal-aws` deve ser lido da `acesso.TBaplicacao.DFendereco` do banco do tenant rodando, não dos seeds — escavação on-prem necessária para confirmar.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/routes/Configuracoes/IntegradorAWS/IntegradorEntidades.jsx:1-63` — UI da sincronização (apenas referenciado aqui pra rastreabilidade; UX é mandato do designer): select com as 10 entidades hardcoded + botão "Enviar" → `GET /api/integradoraws/sincronizar/${entidade}`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/routes/Configuracoes/IntegradorAWS/IntegradorOpcoes.jsx:1-83` — UI de opções do integrador: lê/escreve em `/opcoes`+`/api/opcoes`, persiste cópia local em IndexedDB `objectKey='app_integrador_aws_configs'`. **Não invoca `PortalAwsClient`** — opções vivem no banco local, só configuram o integrador.
- `sources/engenharia--fabrica--sql--portal-aws/api/pos-script.sql:204` — seed: `Integrador.IP` em `acesso.TBopcoes` (`'Endereço de IP do servidor onde o serviço [Processa.Integrador.AWS] está instalado.'`, valor seed `172.27.0.114`). Linha 290: outro tenant em `172.27.0.131`. IPs são VPN/intranet de tenant, não AWS pública.

## Estrutura

### Endpoints externos (Director → AWS)

| Endpoint AWS chamado | Método | Body | Quem dispara no Director | Para quê | Vem de |
|---|---|---|---|---|---|
| `{IpPortalAws}/api/proc/portal.sincronizar_redes` | POST | XML `<Redes><Rede>...</Rede>...</Redes>` | `GET /api/integradoraws/sincronizar/redes` (UI: tela Integrador) | Push de cadastro de redes para AWS | `PortalAwsClient.cs:23`, `IntegradorAwsController.cs:21`, `aws_sincronizar_entidade.sql:19-30` |
| `{IpPortalAws}/api/proc/portal.sincronizar_empresas` | POST | XML `<Empresas>` | `GET /api/integradoraws/sincronizar/empresas` | Push de empresas | idem, `aws_sincronizar_entidade.sql:31-43` |
| `{IpPortalAws}/api/proc/portal.sincronizar_centros` | POST | XML `<CentrosDeDistribuicao>` (composto) | `GET /api/integradoraws/sincronizar/centros` | Push de CDs+Áreas+Docas (uma só chamada) | idem, `aws_sincronizar_entidade.sql:44-68` |
| `{IpPortalAws}/api/proc/portal.sincronizar_departamentos` | POST | XML `<Departamentos>` (níveis 1 e 2) | `GET /api/integradoraws/sincronizar/departamentos` | Push de árvore de departamentos | idem, `aws_sincronizar_entidade.sql:69-81` |
| `{IpPortalAws}/api/proc/portal.sincronizar_veiculos` | POST | XML `<Veiculos>` (TipoEntidade T\|M) | `GET /api/integradoraws/sincronizar/veiculos` | Push de tipos+marcas de veículo | idem, `aws_sincronizar_entidade.sql:82-94` |
| `{IpPortalAws}/api/proc/portal.sincronizar_feriados` | POST | XML `<Feriados>` (ano corrente) | `GET /api/integradoraws/sincronizar/feriados` | Push de feriados do ano | idem, `aws_sincronizar_entidade.sql:95-103` |
| `{IpPortalAws}/api/proc/portal.sincronizar_itens` | POST | XML `<Itens>` | `GET /api/integradoraws/sincronizar/itens` | Push de itens de estoque | idem, `aws_sincronizar_entidade.sql:104-115` |
| `{IpPortalAws}/api/proc/portal.sincronizar_planos` | POST | XML `<Planos>` | `GET /api/integradoraws/sincronizar/planos` | Push de planos de pagamento | idem, `aws_sincronizar_entidade.sql:116-122` |
| `{IpPortalAws}/api/proc/portal.sincronizar_fornecedores` | POST | XML `<Fornecedores>` (filtra `DFcgc NOT NULL`) | `GET /api/integradoraws/sincronizar/fornecedores` | Push de fornecedores | idem, `aws_sincronizar_entidade.sql:123-140` |
| `{IpPortalAws}/api/proc/portal.sincronizar_usuarios` | POST | XML `<Usuarios>` (AdminEmpresa + VENDEDOR derivado de contato_fornecedor) | `GET /api/integradoraws/sincronizar/usuarios` | Push de usuários (vendedores recebem login `for-<3-digits-CNPJ>`) | idem, `aws_sincronizar_entidade.sql:141-212` |
| `{IpPortalAws}/api/proc/portal.obter_usuarios_fornecedores` | POST | JSON/XML do form (filtros `nome,cnpj,email,status,pagina,limite,ordenacao`) | `POST /api/fornecedor/listar` (datagrid) | Listar usuários-fornecedor (paginado, filtrado) | `UtilsController.cs:60-65`, `portal.obter_usuarios_fornecedores.sql` |
| `{IpPortalAws}/api/proc/portal.persistir_usuario_fornecedor` | POST | XML do form (Salvar) | `POST /api/fornecedor/persistir` | Criar/editar usuário-fornecedor na AWS | `UtilsController.cs:74-79` |
| `{IpPortalAws}/api/proc/portal.deletar_usuario_fornecedor` | POST | XML com id | `POST /api/fornecedor/deletar` | Excluir usuário-fornecedor da AWS | `UtilsController.cs:67-72` |
| `{IpPortalAws}/api/proc/portal.sp_obter_usuario_fornecedor` (via `httpClientService.GetProc`) | GET | id query | `POST /api/fornecedor/obter` | Carrega 1 usuário-fornecedor + enriquece com Fornecedor[] do ERP local | `FornecedorService.cs:15`, `UtilsController.cs:87-93` |
| Genérico: `{IpApp[appkey]}/api/proc/{proc}` (via `httpClientService.ExecProc`) | POST | qualquer | `POST /api/{appkey}/proc/{proc}` | Caminho **genérico** para qualquer app (não só portal-aws) | `UtilsController.cs:101-106` — não usa `PortalAwsClient`, usa o `IHttpClientService` |

### Configuração da bridge (lida do banco local)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `acesso.TBaplicacao.DFchave` | varchar | sim | Discriminador da app destino | `'portal-aws'` | Linha-fonte da configuração da bridge | `PortalAwsClient.cs:13-15` |
| `acesso.TBaplicacao.DFendereco` | varchar | sim | URL base do `portal-aws` no tenant | `http://<host>:<porta>` (seed `http://127.0.0.1:5100`; produção típica `http://<aws-ip>:5100`) | Prefixa todas as URLs chamadas pelo `PortalAwsClient` | `PortalAwsClient.cs:13, 22`, `portal.director/pos-script.sql:8` |
| `acesso.TBaplicacao.DFdominio` | varchar | sim | Domain/tenant a colocar na `DirectorIdentity` antes de assinar o JWT | string identificadora do tenant na AWS | Sobrescreve `identity.Domain` antes do `GenerateJWTToken` — é o "para qual tenant da AWS estamos falando" | `PortalAwsClient.cs:14, 19-20` |
| `acesso.TBaplicacao.DFporta` | varchar | não | Porta default da app | `'5100'` (portal-aws), `'4303'` (integrador-aws) | Documenta porta para seeds e relatórios; o endereço efetivo é `DFendereco` | `pos-script.sql:8, 16` |
| `acesso.TBopcoes.DFcodigo='Integrador.IP'` (no banco AWS) | varchar | sim no fluxo do agent de Agendamento | IP do `Processa.Integrador.AWS` na rede on-prem do cliente | IPv4 (`172.27.0.114`, `172.27.0.131` em seeds) | **Não usado pelo `PortalAwsClient`**; consumido pelo módulo Cotação/Agent ao falar com o integrador on-prem. Aparece aqui só pra mapear o ecossistema | `portal-aws/api/pos-script.sql:204, 290` |
| `app_integrador_aws_configs` (IndexedDB no browser) | object | não | Cache local das opções de configuração do integrador | qualquer | Offline-fallback da tela `/configuracoes/integrador-aws` quando `/opcoes` retorna erro | `IntegradorOpcoes.jsx:53, 60` |

### JWT do handshake bridge

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| Algoritmo | const | sim | Algoritmo de assinatura | `HmacSha256Signature` | Tanto Director quanto portal-aws devem ter a mesma `Consts.SecretKey` em ASCII bytes | `TokenUtils.cs:33, 58` |
| Claim `identidade` | string (JSON) | sim | `DirectorIdentity.ToJson()` serializado | JSON com `Id, Name, CodEmpresa, NomeEmpresa, Domain` | Lado AWS reconstrói via `ClaimsPrincipal.ToDirectorIdentity()` | `TokenUtils.cs:32`, `HostExtensions.cs:50-54` |
| `Expires` | datetime | sim | Validade (default 1 dia) | `DateTime.UtcNow.AddDays(days)` com `days=1` por padrão | Token de 24h; sem refresh — em vencimento, Director re-assina na próxima chamada (cada `SendRequest` gera um novo JWT, então em prática o TTL nunca é atingido pela bridge) | `TokenUtils.cs:24, 30-34`, `PortalAwsClient.cs:20` |
| Header HTTP | const | sim | Carrier do JWT | `Authorization: Bearer <jwt>` | Lado AWS pega via `AuthMiddleware.ExtractCredentials` → `TokenUtils.ValidateJWTToken` | `PortalAwsClient.cs:24` |
| Header `ContentType` | const | sim (typo legado: header `ContentType` em vez de `Content-Type`) | Sinaliza JSON | `application/json` | **Atenção:** está em `ContentType` (sem hífen) — header não-padrão. O corpo real é XML em quase todos os casos de sincronização; o valor `application/json` é mentira histórica do legado | `PortalAwsClient.cs:25` |
| Header `Domain` (recepção AWS) | string | não | Override do `Domain` da identidade no momento da validação | qualquer string | Se o request inclui header `Domain`, ele sobrescreve o `Domain` da identidade decodificada. Usado em ferramentas/scripts; o `PortalAwsClient` **não envia** esse header — o domain já vai dentro do JWT | `AuthMiddleware.cs:27-28` |

### Comportamento de erro

| Cenário | Efeito atual | Vem de |
|---|---|---|
| AWS retorna 4xx/5xx | `HttpClient.Send` não lança; retorna a stream do body como-está (cliente vê o erro do AWS) | `PortalAwsClient.cs:30-31` |
| Timeout de rede | `HttpClient` default (100s) — exceção sobe pra controller | `PortalAwsClient.cs:29` (sem `Timeout` setado) |
| Exceção na proc local de sync | `IntegradorAwsController.SincronizarEntidade` catch genérico → `Console.WriteLine(ex.Message)` + retorna `Stream.Null` (200 OK com corpo vazio para o front) | `IntegradorAwsController.cs:23-26` |
| Erro na proc espelho AWS | Proc faz `ROLLBACK TRAN` + retorna `<Resposta><Status>500</Status><Sucesso>false</Sucesso><Dados>[Procedure]: ... | [ERRO]: ...</Dados></Resposta>` | `portal.sincronizar_usuarios.sql:124-133` (padrão repetido em todas as `sincronizar_*`) |
| Retry / dead-letter | **Inexistente.** Sem retry automático, sem fila, sem DLQ. Se a chamada falha o usuário precisa apertar "Enviar" de novo. | (ausência de retry no `PortalAwsClient` e no controller) |
| Idempotência | Garantida pelo lado AWS via `UPDATE ... WHERE ErpId IN (...)` + `INSERT ... WHERE ErpId NOT IN (SELECT ErpId FROM ...)`. Reenviar o mesmo XML não duplica. | `portal.sincronizar_usuarios.sql:79-115` (padrão repetido) |

### Direções de fluxo

| Direção | O quê | Como |
|---|---|---|
| ERP-local → AWS (push, on-demand) | Sincronização de cadastros (10 entidades listadas acima) | `aws_sincronizar_entidade` produz XML; `PortalAwsClient.SendRequest` posta. Trigger 100% manual via UI. |
| Director (proxy) → AWS (sync-request) | CRUD de usuário-fornecedor a partir das telas do Director | `UtilsController` repassa o body bruto da request pro `portal.<proc>` correspondente. |
| AWS (banco) → Director (read via proxy) | Listagem/leitura de usuário-fornecedor | Mesmo proxy: `POST /api/fornecedor/listar` / `obter`. |
| Director (handshake) → SPA AWS (browser) | Abertura de uma app hospedada na AWS a partir do menu Director | `AcessoAplicacaoRepository.ObterEndereco` gera URL `{app.Caminho}/#/auth?tkn=...&jwt=...` (querystring com base64 do payload + JWT). Não é HTTP server-to-server; é redirect do browser. |
| Browser SPA AWS → portal-aws backend | Chamadas REST após login | Cookie/Bearer com o JWT entregue pelo Director > **inferido** — fonte da SPA da AWS não está em `sources/`. |
| **Não existe**: AWS → Director (push) | — | A bridge é unidirecional para sync (Director→AWS). Não há webhook reverso. Realtime cross-tenant fica a cargo do hub SignalR `/hub-suphelp` ([[hub-signalr-legacy]]), que é **outra** integração, com o `Processa.ADM`, **não** com o `portal-aws`. |

### Dependências

| Dependência | Papel | Vem de |
|---|---|---|
| `Processa.Sdk.Auth.TokenUtils` + `Consts.SecretKey` | Geração/validação do JWT compartilhado | `TokenUtils.cs:14` |
| `Processa.Sdk.Auth.AuthMiddleware` (no portal-aws) | Validação do bearer recebido | `AuthMiddleware.cs:11-39` |
| `Processa.Sdk.Domain.DirectorIdentity` | Modelo de identidade serializado dentro do JWT | `DirectorIdentity.cs:12` |
| `Processa.Sdk.Persistence.GenericDAO` | Consulta `acesso.TBaplicacao` no banco do Director | `PortalAwsClient.cs:12` |
| `aws_sincronizar_entidade` no `processa.agendamento` | Fonte de dados para o push | `processa.agendamento/programacao/aws_sincronizar_entidade.sql` |
| `Split(@ids, ',')` UDF | Usada no `aws_sincronizar_entidade` para filtrar por lista de IDs (parâmetro opcional não exercido pelo controller atual — sempre `null`) | `aws_sincronizar_entidade.sql:27, 40, 78, 112, 137, 209` |
| `dbo.fn_Decript` (AWS) | Decripta senhas enviadas do ERP antes de re-hashear com SHA2_256 | `portal.sincronizar_usuarios.sql:82, 106` |
| `TBopcoes.DFcodigo = 441` | Setor de contato qualificador de vendedor no `TBcontato_fornecedor` | `aws_sincronizar_entidade.sql:188` |
| `LDAP` / `Active Directory` | **Não** é dependência da bridge AWS. É caminho alternativo de auth do Director interno. Listado aqui para evitar confusão. | `AuthMiddleware.cs:36`, `AbstractBearerAuth.cs:88, 95` |
| `S3`, `RDS`, `Cognito`, `IAM` | **Sem evidência** nas fontes. A bridge fala apenas com um endpoint HTTP do `portal-aws`; storage e banco da AWS são opacos pro Director. > **inferido**: o `portal-aws` provavelmente roda em EC2 com RDS SQL Server por trás, mas isso é detalhe de deploy do outro lado, não contrato. | (ausência) |

## Sub-contratos

Cargas XML detalhadas por entidade (forma de cada `<Rede>`, `<Empresa>`, `<Usuario>`, etc.) são candidatas a sub-contratos quando o Studio precisar reproduzir o sync ou consumir essas estruturas. Por ora, a estrutura inteira de cada entidade está documentada inline em `aws_sincronizar_entidade.sql` (lado origem) e `portal.sincronizar_<entidade>.sql` (lado destino) — escavar arquivo por arquivo no momento do consumo. Notáveis:

- `<Usuarios><Usuario>` com 12 campos e regra de senha dual (decripta-e-hasheia vs hasheia-direto) — `portal.sincronizar_usuarios.sql:78-115`.
- `<CentrosDeDistribuicao>` é XML composto com 3 sub-coleções (`<Centros>`, `<Areas>`, `<Docas>`) em uma só chamada — `aws_sincronizar_entidade.sql:44-68`.

## Relações com o ecossistema

- Pareado com **[[processa-auth-paths]]** (F003) — caminho de "usuário fornecedor" (e-mail) é **a contraparte de login** que valida usuários **criados pela bridge sync**. Sync cria o registro em `portal.Usuario` na AWS; auth valida contra esse mesmo registro via `AuthFornecedorAWSQuery`.
- Pareado com **[[hub-signalr-legacy]]** (F023) — o hub `/hub-suphelp` é a **outra** ponte cross-tenant (Director↔ADM, RPC sync). A bridge AWS aqui (`PortalAwsClient`) é Director↔portal-aws (push de cadastros + proxy REST). Ambas usam JWT com `Consts.SecretKey` mas conversam com hosts AWS distintos (ADM vs portal-aws).
- Consumidor canônico do contrato: **F024** no [[director-studio]] feature-manifest.
- Procedures relacionadas no Director: `aws_sincronizar_entidade` (única origem de dados de sync).
- Procedures relacionadas no portal-aws: 10 procs `portal.sincronizar_<entidade>` + 4 procs de CRUD de usuário-fornecedor (`portal.obter_usuarios_fornecedores`, `portal.persistir_usuario_fornecedor`, `portal.deletar_usuario_fornecedor`, `portal.sp_obter_usuario_fornecedor`).
- Existe também um conjunto `cotacao.sincronizar_<entidade>` na AWS (`sincronizar_cotacoes.sql`, `sincronizar_fornecedores.sql`, `sincronizar_itens.sql`, `sincronizar_fornecedor_item.sql`) que é alimentado por **outra integração** (módulo Cotação via `Processa.Integrador.AWS`, **não** via `PortalAwsClient`). Fora do escopo deste contrato; merece feature/contrato próprio se entrar no Studio.

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- A bridge não tem retry, timeout custom, circuit breaker, ou DLQ. Qualquer redesenho que preserve a função terá que decidir esses três pontos (sugestão de cobrir em ressalvas de aceitação, não no contrato).
- A bridge sempre re-assina o JWT a cada chamada — vida útil real do token tende a ser segundos, não 24h. Cache não é exercido.
- Erros do lado AWS chegam ao usuário como corpo de resposta normal (sem status code semântico do HTTP); o front tem que inspecionar o `<Status>` dentro do XML/JSON de resposta. Procs sempre devolvem 200 OK no HTTP mesmo quando `<Status>500</Status>`.
- A proc `aws_sincronizar_entidade` aceita um parâmetro `@ids NVARCHAR(256)` para sincronizar apenas registros específicos, mas o controller atual **sempre passa `null`** (full-sync). Hook de extensão pronto, não exercido.
- Senha de vendedor (`'for-' + LEFT(DFcgc, 3)`) é uma regra de negócio rastreada e documentada — não é hash, é o conteúdo plain antes de ir pro `HashBytes` na AWS.
- O endpoint genérico `POST /api/{appkey}/proc/{proc}` no `UtilsController` é uma **bypass** da bridge (usa outro cliente HTTP) — ao mapear o Studio, verificar se algum consumidor real chama esse caminho com `appkey=portal-aws`, o que duplicaria função.

## Consumo pelos models F043 (Studio — F090..F094)

A partir de F090 (decisão F052b caminho A — 2026-05-17), models do
`acesso.TBmodel_pagina` consomem a bridge AWS via **URL gateway literal**
`/portal-aws/proc/<schema>.<proc>` em vez de SQL procs locais. Isso é
paridade exata com o que `Fornecedores.jsx` (e demais pages
`Configuracoes/*`) já fazem em produção no legado, onde o
`PortalDirector.Aplicacao.Controllers.UtilsController.ExecProc(appkey, proc)`
resolve o appkey `portal-aws` chamando `IHttpClientService.ExecProc` (que
internamente fala com o mesmo portal-aws documentado nesta página).

No Studio, a rota literal `POST /portal-aws/proc/:proc` (montada em
`apps/api/src/routes/portal-aws-proxy.ts`) reproduz o gateway: valida sessão
via cookie httpOnly, sanitiza `[schema.]proc` ASCII, e forwarda via
`PortalAwsClient.sendRequest` — mesmo cliente e JWT da seção §"Endpoints
externos" desta página.

Pages que consomem essa porta hoje:
- `portal-director.acessos_fornecedor` (F090, ✓) — 3 procs:
  `portal.obter_usuarios_fornecedores`, `portal.persistir_usuario_fornecedor`,
  `portal.deletar_usuario_fornecedor`.
- `portal-director.configuracoes_agendamento` (F091, pendente)
- `portal-director.configuracoes_cotacao` (F092, pendente)
- `portal-director.configuracoes_email` (F093, pendente)
- `portal-director.configuracoes_aws` (F094, pendente — sub-escavação)

A rota `/portal-aws/proc/:proc` **não vive sob `/api`** por design: o engine
schema-driven F009/F011 emite `fetch('/portal-aws/proc/...')` direto a partir
do `datagrid.api` declarado no model, sem reescrita. Isso preserva a URL 1:1
com o legado e elimina ambiguidade entre paths SQL (`/proc/<chave>` → forms-proxy)
e paths gateway (`/portal-aws/proc/<schema>.<proc>` → portal-aws-proxy).

## Sources

- [[calendar/notes/2026-05-15.md]]
- [[calendar/notes/2026-05-17.md]] (F090 refactor)
