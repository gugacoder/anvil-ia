---
title: "Registro de aplicações — acesso.TBaplicacao"
aliases: [tbaplicacao-registry, tbaplicacao, acesso-tbaplicacao, aplicacao-registry, app-registry, discovery-aplicacao, app-discovery]
tags: [contract, legacy, registry, multi-tenant, discovery, bridge, auth, director-studio]
sources:
  - "calendar/notes/2026-05-17.md"
created: 2026-05-17
updated: 2026-05-17
---

# Contrato: `acesso.TBaplicacao` — registry canônico de aplicações por tenant

`acesso.TBaplicacao` é a **tabela mãe de service discovery** do Portal Director. Cada **linha = uma aplicação remota** (web ou serviço) que o tenant conhece — Portal Director on-prem, Portal AWS, Cotacao, Cotacao-Integrador, eDoc, Pipeliner, Processa.ADM, Processa-SPED, Integrador.AWS, WMS, Agent, Checkin, Gerenciamento-de-Integrações, etc. Para cada uma, a tabela guarda o **endereço HTTP** (host+porta+path opcional), o **domínio** (discriminador multi-tenant que entra como claim no JWT), uma **chave única estável** (`DFchave`, kebab-case), e flags de habilitação/externalidade. É a única fonte da verdade do ecossistema HTTP do tenant — `PortalAwsClient`, `CotacaoIntegradorClient`, `EdocController`, `SpedRepository`, `AppClientService.ExecProc/GetProc`, `AcessoAplicacaoRepository.ObterEndereco` e a proc `acesso.obter_aplicacoes_pagina_home` (que monta o menu da home) **todos consultam aqui por `DFchave`**.

O efeito sistêmico é triplo: (1) **bridge dispatch** — qualquer chamada cross-app HTTP do Director resolve `DFendereco` por `DFchave`, sem hardcode; (2) **handshake JWT** — `DFdominio` é o tenant-id que entra na `DirectorIdentity` antes de assinar o token compartilhado (chave simétrica `Consts.SecretKey`); (3) **catálogo de menu** — somente linhas com `DFhabilitado=1` e `DFchave != 'portal-aws'` aparecem no menu da home (filtragem em proc, não em código).

Não há schema separado de "tipo de aplicação": o **discriminador é `DFchave` literal**, e o código que consome decide caso-a-caso o que fazer com aquela linha (PortalAwsClient hardcoda `'portal-aws'`, AppClientService faz switch por chave para escolher esquema de auth, etc.). Não é tabela de roles, não é tabela de permissões, não é tabela de feature flags — é **service registry literal**, com semântica única por consumidor.

Crítico para o cutover do Studio: **toda generalização do proxy multi-app (`POST /api/:appKey/proc/:proc`) tem que resolver host/port/domain/auth-scheme a partir desta tabela**, replicando exatamente o que `AppClientService.ExecProc` faz hoje.

## Citações de fonte

- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBaplicacao.sql:1-91` — DDL canônico do Director. CREATE inicial 10 colunas; ALTERs adicionais idempotentes para `DFchave` (UNIQUE), `DFdata_inativacao`, `DFtema`, `DFporta`, `DFutiliza_email`.
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/0-criacao/acesso.TBaplicacao.sql:1-83` — DDL espelhado pelo AppBuilder (mesma estrutura, sem `DFutiliza_email`).
- `sources/engenharia--fabrica--sql--processa-appbuilder/appbuilder/0-criacao/acesso.TBaplicacao.sql:1-83` — DDL espelhado pelo Processa.AppBuilder standalone.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/pos-script.sql:6-16` — seed canônico (10 linhas: portal-director, portal-aws, edoc, cotacao-integrador, cotacao, processaadm, pipeliner, processa-sped, integrador-aws; WMS adicionado em migração posterior).
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Api/PortalAwsClient.cs:12-15` — leitura de `DFendereco`+`DFdominio` para `DFchave='portal-aws'`; é o **único** consumer que muda o Domain da identity antes de assinar JWT.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Api/CotacaoIntegradorClient.cs:11-13` — leitura de `DFendereco` para `DFchave='cotacao-integrador'`; usa auth **Basic** literal (`Basic cHJvY2Vzc2E6OTk=` = `processa:99` hardcoded), **não JWT**.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Controllers/EdocController.cs:20` — leitura de `DFendereco` para `DFchave='edoc'`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Repositories/SpedRepository.cs:8` — `SELECT * FROM acesso.TBaplicacao WHERE DFchave='processa-sped'`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Repositories/AcessoAplicacaoRepository.cs:89-94` — `ObterAcessoAplicacao(chave)`: `SELECT * FROM acesso.TBaplicacao WHERE DFchave = @chave` parametrizado; **é o resolver genérico** que o `AppClientService` consome.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Services/AppClientService.cs:10-56` — `ExecProc(appKey, proc, body)` e `GetProc(appKey, proc, param)`: lê o registro inteiro via `repository.ObterAcessoAplicacao(appKey)`, extrai `DFendereco`, monta header `Authorization` via `BuildHeader(app)` que tem **switch por `DFchave`**: `case "cotacao"` → `Basic processa|<domain>:99` base64; `default` → `Bearer <jwt-com-DirectorIdentity-fixa>`. Também envia header `Domain: <DFdominio>`. URL final: `{DFendereco}/api/proc/{proc}` (POST) ou `{DFendereco}/api/get/proc/{proc}/{param}` (GET).
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Controllers/UtilsController.cs:101-106` — endpoint `POST /api/{appkey}/proc/{proc}` que delega ao `AppClientService.ExecProc`. **Este é o caminho que F110 generaliza no Studio**.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Repositories/AcessoAplicacaoRepository.cs:27-87` — `ObterEndereco(chave)`: produz URL de "abertura de app" usada pelo menu do Director — lê o registro da chave, monta JWT com `Domain = app.Dominio`, retorna `{app.Caminho}/#/auth?tkn=<base64>&jwt=<jwt>`. **Confirma que `DFdominio` é o tenant-id que vai dentro da identity assinada**.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_aplicacoes_pagina_home.sql:38-75` — proc que projeta `TBaplicacao` em `TApp` para o menu home: campos `DFid_aplicacao→Value`, `DFnome→Label`, `DFdescricao→Descricao`, `DFendereco→Caminho` (fallback `http:{host-from-portal-director}:{DFporta}` quando `DFendereco` vazio), `DFicone→Icone`, `DFdominio→Dominio`, `DFhabilitado→Habilitado`, `DFchave→AppKey`, `DFtema→SideBarTheme`. Filtros: `WHERE DFhabilitado=1 AND DFchave NOT IN ('portal-aws')`. URLs `URLPortalDirector` e `URLPortalAWS` injetadas em cada linha lendo as duas linhas correspondentes da própria tabela.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.atualizar_dados_aplicacao.sql` — proc de UPDATE: única forma "pública" de atualizar a linha. Consumidor: tela de configurações de aplicações no AppBuilder.
- `sources/engenharia--fabrica--dotnet-core--director.web/Fontes/Director.Web.Aplicacao/Controllers/AppsController.cs` — controller espelhado no Director.Web (paralelo legado). Confirma que `TBaplicacao` é o registro consultado em ambos os stacks `.NET` do tenant.
- **Probe real**: `calendar/notes/2026-05-17.md` survey TBaplicacao cross-tenant. 97 bases `DBdirector_*` em `172.27.0.121\SQL2k19` listadas, **89 com tabela `acesso.TBaplicacao` populada** (7 sem a tabela, 1 sem login). 970 linhas totais. Probe `.tmp/probe-tbapl-cross.ps1`; outputs `.tmp/tbapl-cross.csv`, `.tmp/tbapl-universe.{txt,csv}`, `.tmp/tbapl-cotacao.txt`, `.tmp/tbapl-sample5.txt`.

## Estrutura

### Schema da tabela `acesso.TBaplicacao`

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `DFid_aplicacao` | `int IDENTITY PRIMARY KEY` | sim (auto) | PK surrogate **per-tenant** — não é estável cross-DB, varia base-a-base (Imperial cotacao=5, Castro cotacao=7, Pereira cotacao=4) | qualquer int positivo | Usado em FK `TBpagina.DFid_aplicacao` e `TBmodulo.DFid_aplicacao` (relacionamento local-only) | `acesso.TBaplicacao.sql:6` |
| `DFchave` | `nvarchar(255) UNIQUE NOT NULL` (na prática) | sim | **Discriminador canônico cross-tenant** — kebab-case literal. **Único campo estável entre bases**. Usado em **todas** as buscas de código (`WHERE DFchave = 'portal-aws'`, etc.) e em FK lógicas (`TBconta_email.DFaplicacao`, `TBpagina.DFchaves_aplicacoes` em CSV). | `'portal-director'`, `'portal-aws'`, `'edoc'`, `'cotacao'`, `'cotacao-integrador'`, `'processaadm'`, `'pipeliner'`, `'processa-sped'`, `'integrador-aws'`, `'wms'`, `'agent'`, `'checkin'`, `'gerenciamento-de-integracoes'`, `'processa'`, `'mercadologic'`, `'centralmercadologic'`, `'rebaixa-de-preco'`, `'folha-de-pagamento'`, `'concentrador'`, `'retaguarda-varejo'`, `'aplicacao-teste'`, `'qualidade'`, `'testenivel'`, `'processa-adm'` (23 universos observados) | Chave de roteamento de **todos** os clients HTTP e de filtro de menu | `acesso.TBaplicacao.sql:19-44`, `UK_acesso_TBaplicacao_DFchave` |
| `DFnome` | `nvarchar(255) UNIQUE NULL` | não-NULL na prática | Label legível, mostrado no menu | string | `obter_aplicacoes_pagina_home → Label` | `acesso.TBaplicacao.sql:7`, `UK_acesso_TBaplicacao_DFnome` |
| `DFdescricao` | `nvarchar(255) NULL` | não | Descrição longa | string | `obter_aplicacoes_pagina_home → Descricao`/`HeaderTitle` | `acesso.TBaplicacao.sql:8` |
| `DFordem` | `int NULL` | não | Ordem no menu (não usado pelo `ORDER BY` real — proc ordena por `DFnome`) | int | Atualmente vestigial — proc usa `ORDER BY DFnome` | `acesso.TBaplicacao.sql:9`, `obter_aplicacoes_pagina_home.sql:75` |
| `DFicone` | `nvarchar(100) NULL` | não | Classe de ícone CSS (família CoreUI: `cil-*`, `cilFile`, etc.) | string | `obter_aplicacoes_pagina_home → Icone` | `acesso.TBaplicacao.sql:10` |
| `DFendereco` | `nvarchar(500) NULL` | sim (efetivo) | **Endereço HTTP base** da aplicação. Pode incluir esquema+host+porta+path opcional (`http://52.67.203.133:4302/checkin`). **Sem trailing slash garantido** — alguns tenants têm `http://52.67.203.133:5000/` (com `/`) outros sem (`http://52.67.203.133:5000`); a proc/cliente concatena `/api/proc/...` direto, então uma `/` duplicada em alguns tenants é observada na prática. | URL absoluta `http(s)://host[:port][/path]` | Prefixa todas as URLs montadas pelos clients HTTP. Quando NULL/empty na proc `obter_aplicacoes_pagina_home`, fallback `http:{host-from-portal-director}:{DFporta}` (regra observada na proc; **não há fallback no `PortalAwsClient` nem no `AppClientService`** — NULL aqui quebra a chamada) | `acesso.TBaplicacao.sql:11`, `PortalAwsClient.cs:13`, `AppClientService.cs:15`, `obter_aplicacoes_pagina_home.sql:46-49` |
| `DFhabilitado` | `bit` | sim (efetivo) | Flag de "aparece no menu home" | `0`/`1` | **Filtra `obter_aplicacoes_pagina_home`** (`WHERE DFhabilitado=1`). **Não filtra** os clients HTTP — `PortalAwsClient`, `CotacaoIntegradorClient`, `EdocController`, `AppClientService.ExecProc` chamam mesmo se a flag for 0. Em Imperial: cotacao=0 (não no menu) mas continua chamável via `/api/cotacao/proc/<proc>`. | `acesso.TBaplicacao.sql:12`, `obter_aplicacoes_pagina_home.sql:71`, `AppClientService.cs` (ausência de filtro) |
| `DFendereco_externo` | `bit` | não | Flag "endereço aponta para servidor fora do tenant" (cloud). Em Imperial: portal-aws=True, agent=True (quando presente), wms=False, checkin=True | `0`/`1`/`NULL` | Documentação/UI hint. **Não consumida** pelos clients HTTP — `PortalAwsClient` usa o endereço sempre, sem ramificar por essa flag. Aparece em telas administrativas. | `acesso.TBaplicacao.sql:13` |
| `DFid_area` | `int NULL` | não | FK para `acesso.TBarea` (organização lógica de apps em áreas — administração, ERP, etc.) | int | Agrupa apps em telas administrativas; **não usado** pela bridge ou pelo proxy | `acesso.TBaplicacao.sql:14` |
| `DFdominio` | `nvarchar(150) NULL` | sim p/ apps que usam JWT inter-tenant; não p/ apps com auth Basic ou local | **Tenant-id que entra na claim `Domain` da `DirectorIdentity` antes de assinar o JWT**. Valores em produção: `castro`, `pereira`, `tupa`, `engenharia`, `eskynao`, `srgranel`, `mundomix`, `irmaosresende`, `tradicao`, `leao`, `sanmartins`, `pereira`, `novaera`, `senehomo`, etc. Em bases default/dev: `'cotacao'` literal (Imperial, StarToys, etc.) ou vazio. | string | (a) Em `PortalAwsClient`: sobrescreve `identity.Domain` antes de `GenerateJWTToken` — é o tenant-discriminator no JWT enviado à AWS. (b) Em `AppClientService.BuildHeader`: para `DFchave='cotacao'`, entra no token Basic literal `processa\|{domain}:99`. (c) Em `AppClientService.ExecProc/GetProc`: enviado como header HTTP `Domain: {DFdominio}` em **todas** as chamadas (extra-JWT). (d) Em `AcessoAplicacaoRepository.ObterEndereco`: vira `Domain` na identity passada para o JWT do handshake `/#/auth?tkn=...&jwt=...`. | `acesso.TBaplicacao.sql:15`, `PortalAwsClient.cs:19`, `AppClientService.cs:20,45-54`, `AcessoAplicacaoRepository.cs:55` |
| `DFdata_inativacao` | `datetime NULL` | não | Timestamp de soft-delete (inativação histórica) | datetime | **Não consumido** pelos clients HTTP nem pelo menu (proc `obter_aplicacoes_pagina_home` filtra apenas por `DFhabilitado=1`, não por `DFdata_inativacao IS NULL`). Em todos os 970 registros observados cross-tenant: NULL. Coluna existe mas vestigial na prática. | `acesso.TBaplicacao.sql:58-62`, observação cross-tenant |
| `DFtema` | `nvarchar(100) NULL` | não | Tema CSS da sidebar quando a app é aberta | string CoreUI theme | `obter_aplicacoes_pagina_home → SideBarTheme` | `acesso.TBaplicacao.sql:64-68` |
| `DFporta` | `nvarchar(100) NULL` | não (efetivo) | Porta lógica — usada **apenas no fallback** do `obter_aplicacoes_pagina_home` quando `DFendereco` é NULL/empty. **Não consumida** pelos clients HTTP, que usam `DFendereco` puro. Conhecido data-quality issue cross-tenant: `processa-sped` tem `DFporta=5003` mas `DFendereco` aponta para `:5005` em todas as bases observadas — divergência seed sem efeito porque ninguém lê `DFporta` em runtime real para este caso. | string numérica | Fallback de URL no menu home; documentação | `acesso.TBaplicacao.sql:70-83`, `obter_aplicacoes_pagina_home.sql:47` |
| `DFutiliza_email` | `bit NULL` | não | Flag "esta app envia email" — sincronizada via `UPDATE` quando a app tem entrada em `email.TBconta_email` | `0`/`1`/`NULL` | Consumida apenas pelo seed: `UPDATE ... SET DFutiliza_email=1 WHERE DFchave IN (SELECT DFaplicacao FROM email.TBconta_email)` | `acesso.TBaplicacao.sql:85-91` |

### Constraints e índices

| Constraint | Tipo | Colunas | Efeito | Vem de |
|---|---|---|---|---|
| `PK_TBaplicacao` (implícito) | PRIMARY KEY | `DFid_aplicacao` | Chave surrogate per-tenant | `acesso.TBaplicacao.sql:6` |
| `UK_acesso_TBaplicacao_DFchave` | UNIQUE | `DFchave` | Garante que `DFchave` é discriminador único na base | `acesso.TBaplicacao.sql:35-44` |
| `UK_acesso_TBaplicacao_DFnome` | UNIQUE | `DFnome` | Nome label único na base | `acesso.TBaplicacao.sql:46-55` |

### Universo de `DFchave` observado em produção (cross-tenant)

Survey 89 bases tenant em `172.27.0.121\SQL2k19` (probe 2026-05-17):

| `DFchave` | Bases (#/89) | `DFendereco` distintos | `DFdominio` distintos | Exemplo `DFendereco` | Exemplo `DFdominio` | Auth scheme legado |
|---|---:|---:|---:|---|---|---|
| `portal-aws` | 89 (100%) | 2 | 22 | `http://52.67.203.133:5100` ou `http://127.0.0.1:5100` | `castro`, `pereira`, `tupa`, `engenharia`, ... (per-tenant) | **Bearer JWT** com `DirectorIdentity.Domain = DFdominio` (via `PortalAwsClient`) |
| `portal-director` | 89 (100%) | 12 | 21 | `http://192.168.1.69:4300`, `http://serverap:4300`, ... | per-tenant | local — sem cross-call (é o próprio servidor) |
| `edoc` | 88 (99%) | 7 | 2 | `http://192.168.1.69:90` | `engenharia`, `Esquinao` | (consultado para `DFendereco` apenas; auth via `EdocController` não documentada nesta tabela) |
| `pipeliner` | 87 (98%) | 2 | 0 | `http://localhost:5003` | — | (não cruza por bridge documentada) |
| `cotacao-integrador` | 87 (98%) | 8 | 6 | `http://127.0.0.1:90` | `tupa`, `srgranel`, ... | **Basic** literal `Basic cHJvY2Vzc2E6OTk=` = `processa:99` hardcoded (`CotacaoIntegradorClient.cs:18`) |
| `processaadm` | 87 (98%) | 3 | 0 | `http://52.67.203.133:5300` | — | (sem cliente .NET observado no Director; ADM tem hub SignalR próprio) |
| `cotacao` | 86 (97%) | 4 | 18 | `http://127.0.0.1:5000` ou `http://52.67.203.133:5000` | `castro`, `pereira`, `tupa`, `engenharia`, `cotacao` (default), `eskynao`, `srgranel`, `tradicao`, `lecomze`, `leao`, `mundomix`, `irmaosresende`, `sanmartins`, `pereira`, `novaera`, `senehomo`, `douradao`, `eldorado` | **Basic** com formato `Basic base64("processa\|{DFdominio}:99")` (`AppClientService.BuildHeader case "cotacao"`) — **único appKey com switch dedicado** |
| `processa-sped` | 82 (92%) | 2 | 0 | `http://localhost:5005` | — | `SpedRepository.GetSpedConfig()` lê SELECT * (uso interno) |
| `integrador-aws` | 82 (92%) | 2 | 1 | `http://localhost:4303` | `tradicao` | (mencionado em `Integrador.IP`; não cruza por `PortalAwsClient`) |
| `wms` | 56 (63%) | 10 | 0 | `http://serverlab.processa.com:4600`, `http://192.168.1.69:4600`, ... | — | (consumido apenas pelo `AppClientService` genérico → **default Bearer JWT** com `DirectorIdentity` fixa `("processa", 0, "Processa") + Domain=DFdominio`) |
| `agent` | 43 (48%) | 2 | 3 | `http://52.67.203.133:5200` | `engenharia`, `esquinao`, `srgranel` | **default Bearer JWT** via `AppClientService` |
| `gerenciamento-de-integracoes` | 35 (39%) | 1 | 0 | `http://127.0.0.1:5301` | — | (não documentado) |
| `checkin` | 34 (38%) | 3 | 0 | `http://127.0.0.1:4302/Checkin`, `http://172.27.0.131:4302/checkin` | — | (não documentado; note `DFendereco` com **path-suffix** `/Checkin` — caso especial) |
| `processa` | 9 (10%) | 2 | 0 | `http://127.0.0.1:4300` / `http://127.0.0.1:5100` | — | chave legada/sinônimo de portal-director; usada como **fallback de aplicação** em `GenericPagesRepository.ObterModel` (`OR ... DFchave='processa'`) |
| `mercadologic` | 4 | 2 | 0 | `http://localhost:4600` | — | rare |
| `centralmercadologic` | 2 | 2 | 0 | `http://localhost:4600`, `http://127.0.0.1:4600` | — | rare |
| `aplicacao-teste` | 2 | 1 | 0 | `http://127.0.0.1:4300` | — | bases dev/test |
| `qualidade` | 2 | 1 | 0 | `http://127.0.0.1:4300` | — | bases dev/test |
| `rebaixa-de-preco` | 1 | 1 | 0 | `http://localhost:4600` | — | one-off |
| `folha-de-pagamento` | 1 | 1 | 0 | `http://172.20.0.241:4300` | — | one-off |
| `concentrador` | 1 | 1 | 0 | `http://localhost:4700` | — | one-off |
| `retaguarda-varejo` | 1 | 1 | 0 | `http://127.0.0.1:4600` | — | one-off |
| `testenivel` | 1 | 1 | 0 | `http://127.0.0.1:4300` | — | base dev |
| `processa-adm` | 1 | 1 | 0 | `http://52.67.203.133:5300` | — | duplicata de `processaadm` em uma única base (typo histórico não consolidado) |

**Conclusões do universo**:
- O **núcleo estável** cross-tenant é 9 appKeys (≥87 bases): `portal-aws`, `portal-director`, `edoc`, `pipeliner`, `cotacao-integrador`, `processaadm`, `cotacao`, `processa-sped`, `integrador-aws`.
- `wms`, `agent`, `gerenciamento-de-integracoes`, `checkin` são **opt-in por tenant** (presença mostra adoção do módulo).
- `processa` (9 bases) é alias-fallback histórico: o `GenericPagesRepository.ObterModel` faz `OR DFid_aplicacao = (SELECT ... WHERE DFchave='processa')` para resolver páginas legadas que ainda apontam para uma aplicação "genérica processa" — paridade exigida no Studio se F042 for fiel.
- **Não existe** appKey `'agendamento'`, `'wms-fornecedor'`, `'integrador-cotacao'`, `'agent-config'` ou nenhum nome alternativo plausível para o agent — `agent` é literal e exato.
- Não foi observada **nenhuma** ocorrência de `DFchave` com `_` (underscore) — convenção é estritamente kebab-case com hífens. `cotacao-integrador` ≠ `cotacao_integrador`.

### Snapshot do tenant Imperial Logística (`DBdirector_imperial_logistica_29`, gate de F113)

| `DFid` | `DFchave` | `DFendereco` | `DFdominio` | `DFhabilitado` | `DFendereco_externo` | `DFporta` |
|---:|---|---|---|---|---|---|
| 1 | `portal-director` | `http://192.168.1.69:4300` | (vazio) | False | False | `4300` |
| 2 | `portal-aws` | `http://127.0.0.1:5100` | (vazio) | False | True | `5100` |
| 3 | `edoc` | `http://192.168.1.69:90` | (vazio) | False | False | `90` |
| 4 | `cotacao-integrador` | `http://127.0.0.1:90` | (vazio) | False | (NULL) | `90` |
| **5** | **`cotacao`** | **`http://127.0.0.1:5000`** | **`cotacao`** | **False** | **(NULL)** | **`5000`** |
| 6 | `processaadm` | `http://52.67.203.133:5300` | (vazio) | False | (NULL) | `5300` |
| 7 | `pipeliner` | `http://localhost:5003` | (vazio) | False | (NULL) | `5003` |
| 8 | `processa-sped` | `http://localhost:5005` | (vazio) | False | (NULL) | `5003` (data-quality bug) |
| 9 | `integrador-aws` | `http://localhost:4303` | (vazio) | False | (NULL) | `4303` |
| 10 | `wms` | `http://192.168.1.69:4600` | (vazio) | True | (NULL) | (vazio) |

**Imperial não tem appKey `agent`** — confirma que o tab `email` de `configuracoes_email` (F093) que chama `agent.sp_consultar_configuracao_email` via `AppClientService.ExecProc('agent', ...)` **bloqueia em tenants sem essa linha** se o gate não validar. Em Imperial, o módulo de Agendamento existe apenas como tab/email embedded no Cotacao; o appKey `agent` real só aparece em 43/89 bases (clientes que contrataram o módulo standalone).

**Para F113 (gate de F110)**: linha `DFchave='cotacao'` **existe** em Imperial com `DFid=5`, `DFendereco='http://127.0.0.1:5000'`, `DFdominio='cotacao'`, `DFhabilitado=0`. Endereço é dev/loopback — em produção real seria `http://52.67.203.133:5000` com `DFdominio=<tenant-slug>`.

## Comportamento de resolução (como o legado escolhe host+auth por appKey)

### Caminho 1 — Endpoint cross-app genérico (modelo de F110)

`POST /api/{appkey}/proc/{proc}` no `UtilsController` (`UtilsController.cs:101-106`) delega ao `AppClientService.ExecProc(appKey, proc, body)`. Fluxo:

1. Lê linha por `chave`: `repository.ObterAcessoAplicacao(appKey)` → `SELECT * FROM acesso.TBaplicacao WHERE DFchave = @chave` (param).
2. Extrai `DFendereco` → `address`.
3. Constrói header `Authorization` via `BuildHeader(app)`:
   - **`case "cotacao"`**: `Basic ` + base64(`"processa|" + DFdominio + ":99"`). Hardcoded.
   - **`default`** (qualquer outro appKey): cria `DirectorIdentity(1, "processa", 0, "Processa") { Domain = DFdominio }`, assina JWT via `TokenUtils.GenerateJWTToken(identity)`, retorna `Bearer <jwt>`. **Identity é fixa** — não é a identity do usuário corrente; é uma identity-do-serviço.
4. Envia header HTTP `Domain: <DFdominio>` extra (além do JWT/Basic).
5. Content-Type `application/json`, body bruto da request original.
6. URL final: `{DFendereco}/api/proc/{proc}` (POST) ou `{DFendereco}/api/get/proc/{proc}/{param}` (GET).

**Notas críticas para F110**:
- O switch por `DFchave='cotacao'` produz auth Basic ≠ Bearer JWT do default. Qualquer proxy multi-app que não replique esse case **quebra Cotacao** silenciosamente (a request chega ao Cotacao com `Authorization: Bearer ...` em vez do esperado `Authorization: Basic ...`).
- `DirectorIdentity` no default é **fixa** (`Id=1, Name="processa", Empresa=0, NomeEmpresa="Processa"`) — não há propagação de usuário. Studio precisa decidir se reproduz (paridade exata) ou substitui pela identity da sessão do usuário corrente (divergência consciente).
- Header `Domain` é enviado **adicional ao JWT/Basic** — é redundante com a claim `Domain` dentro do JWT no default-case, mas é a **única forma** do cotacao saber qual tenant atender (auth Basic não carrega claims).

### Caminho 2 — Bridge dedicada `portal-aws` (já documentada)

`PortalAwsClient.SendRequest(...)` (`PortalAwsClient.cs:12-32`) tem caminho **diferente**:

1. Lê **2 colunas** (`DFendereco`, `DFdominio`) com 2 sub-selects literais por `DFchave = 'portal-aws'`. Hardcoded.
2. Pega a identity do **usuário corrente** (`Thread.CurrentPrincipal.Identity`) — **não** uma identity-de-serviço.
3. Sobrescreve `identity.Domain = DFdominio` da linha portal-aws.
4. Assina JWT via `TokenUtils.GenerateJWTToken(identity)`.
5. Header `Authorization: Bearer <jwt>`, header `ContentType: application/json` (typo legado sem hífen).
6. URL final: `{DFendereco}{requestUrlApi}` (o caller passa `requestUrlApi = "/api/proc/portal.<proc>"`).

Ver [[portal-aws-bridge]] para o contrato completo. `PortalAwsClient` **não passa pelo `AppClientService`** — é o caso especial.

### Caminho 3 — Cliente dedicado `cotacao-integrador`

`CotacaoIntegradorClient.SendRequest(...)` (`CotacaoIntegradorClient.cs:7-32`):
1. Lê **só `DFendereco`** por `DFchave='cotacao-integrador'`.
2. Header `Authorization: Basic cHJvY2Vzc2E6OTk=` (= `processa:99` literal, **hardcoded no código** — não usa `DFdominio`).
3. URL final: `{DFendereco}{requestUrlApi}`.

Não passa pelo `AppClientService` nem usa `DFdominio` — auth Basic é estática global.

### Caminho 4 — Cliente eDoc

`EdocController` (`EdocController.cs:20`): lê `DFendereco` por `DFchave='edoc'`. (Detalhes da request não relevantes para F113 — não interage com appKeys cotacao/agent/portal-aws.)

### Caminho 5 — Menu home

`acesso.obter_aplicacoes_pagina_home(@xml)` projeta toda a tabela para o menu. Filtros: `DFhabilitado=1 AND DFchave NOT IN ('portal-aws')`. **Esta é a única função que consulta múltiplas linhas em uma chamada**. Resultado também injeta `URLPortalDirector` e `URLPortalAWS` (sub-selects para essas 2 chaves) em cada linha — esses 2 valores viajam no payload `tkn=` do handshake `/#/auth?tkn=...&jwt=...`.

## Asserções observáveis (mecanicamente verificáveis)

Asserções derivadas das fontes e do survey 2026-05-17. Cada uma é passa/falha binária via SQL ou via inspeção de resposta HTTP.

| # | Input | Output esperado | Regra de comparação | Fonte legado |
|---|---|---|---|---|
| **R1** | `SELECT COUNT(*) FROM acesso.TBaplicacao WHERE DFchave='cotacao'` em qualquer tenant com TBaplicacao presente | `>= 1` (idealmente exatamente `1`) | numeric `>= 1`; observado 86/89 bases retornam `1` | survey `.tmp/tbapl-universe.txt` linha "cotacao 86" |
| **R2** | `SELECT DFendereco FROM acesso.TBaplicacao WHERE DFchave='cotacao'` em `DBdirector_imperial_logistica_29` | `'http://127.0.0.1:5000'` | string equal | survey `.tmp/tbapl-cotacao.txt:48` |
| **R3** | `SELECT DFdominio FROM acesso.TBaplicacao WHERE DFchave='cotacao'` em `DBdirector_imperial_logistica_29` | `'cotacao'` | string equal | survey `.tmp/tbapl-cotacao.txt:48`; sample reflete seed default |
| **R4** | Header `Authorization` produzido pelo `AppClientService.BuildHeader` quando `app.DFchave='cotacao'`, `app.DFdominio='cotacao'` | `Basic cHJvY2Vzc2F8Y290YWNhbzo5OQ==` (base64 de `processa\|cotacao:99`) | string equal | `AppClientService.cs:48-50` |
| **R5** | Header `Authorization` para qualquer `app.DFchave NOT IN ('cotacao')` | `Bearer <jwt>` onde JWT decodifica claim `identidade` com `DirectorIdentity{Id:1, Name:"processa", CodEmpresa:0, NomeEmpresa:"Processa", Domain: DFdominio}` | regex `^Bearer ` + decode JWT + JSON equal de campos canônicos | `AppClientService.cs:52-54` |
| **R6** | Header HTTP `Domain` em qualquer chamada via `AppClientService.ExecProc/GetProc` | string equal a `DFdominio` (mesmo NULL/empty é enviado como string vazia) | string equal | `AppClientService.cs:20,36` |
| **R7** | URL final montada por `AppClientService.ExecProc('portal-aws', 'portal.foo', body)` em Imperial | `http://127.0.0.1:5100/api/proc/portal.foo` | string equal | `AppClientService.cs:18` + `tbapl-sample5.txt:18` |
| **R8** | URL final montada por `AppClientService.ExecProc('cotacao', 'cotacao.foo', body)` em Imperial | `http://127.0.0.1:5000/api/proc/cotacao.foo` | string equal | `AppClientService.cs:18` + `tbapl-sample5.txt:21` |
| **R9** | URL final para `appKey='checkin'` em tenant com `DFendereco='http://172.27.0.131:4302/checkin'` | `http://172.27.0.131:4302/checkin/api/proc/<proc>` (concatenação literal — path-suffix preservado) | string equal | `AppClientService.cs:18` (não normaliza) + sample observado |
| **R10** | `SELECT COUNT(DISTINCT DFchave) FROM acesso.TBaplicacao WHERE DFchave LIKE '%[_]%' ESCAPE ''` em qualquer tenant | `0` | numeric `= 0` | convenção observada — todos `DFchave` em kebab-case com `-`, nenhum com `_` |
| **R11** | `SELECT COUNT(*) FROM acesso.TBaplicacao WHERE DFchave='cotacao' AND DFhabilitado=1` em `DBdirector_imperial_logistica_29` | `0` | numeric `= 0` | survey `.tmp/tbapl-cotacao.txt:48` (False) — confirma que Cotacao **não aparece no menu home** Imperial mas continua chamável via proxy |
| **R12** | `acesso.obter_aplicacoes_pagina_home @xml` retorna linha para appKey `'portal-aws'` | `false` (zero linhas com `AppKey='portal-aws'`) | proc result inspection | `obter_aplicacoes_pagina_home.sql:72-74` (`DFchave NOT IN ('portal-aws')`) |
| **R13** | `acesso.obter_aplicacoes_pagina_home @xml` filtra linhas com `DFhabilitado=0` | `true` (zero linhas) | proc result inspection | `obter_aplicacoes_pagina_home.sql:71` |
| **R14** | Schema `acesso.TBaplicacao` no DDL: existe coluna `DFchave UNIQUE` | `true` | `INFORMATION_SCHEMA.COLUMNS` + `sys.indexes` check | `acesso.TBaplicacao.sql:19-44` |
| **R15** | Cross-tenant: bases `DBdirector_*` que **têm** a tabela `acesso.TBaplicacao` (presente em `INFORMATION_SCHEMA.TABLES`) | `89/97` (com 8 erros: 7 sem tabela + 1 sem login) | survey count | `.tmp/tbapl-errors.txt` |
| **R16** | `SELECT DFid_aplicacao FROM acesso.TBaplicacao WHERE DFchave='cotacao'` é **estável cross-tenant** | `false` (varia: 4, 5, 6, 7, 8, 11) | observação | `.tmp/tbapl-cotacao.txt` — Imperial=5, Bazinho=11, Castro=7, Carnes_Sao_Jose=7, Vicosense=4, Bergao=6, PCP=8 |
| **R17** | `DFporta` reflete a porta de `DFendereco` em todas as linhas | `false` — divergência conhecida: `processa-sped` tem `DFporta=5003` mas `DFendereco` aponta para `:5005` em todos os tenants observados | string parsing + comparison | `.tmp/tbapl-sample5.txt` linhas `processa-sped`; data-quality bug de seed sem efeito em runtime (clients usam `DFendereco`) |
| **R18** | `PortalAwsClient.SendRequest` consulta exclusivamente `DFchave='portal-aws'` (não usa `AppClientService.BuildHeader`) | `true` | code inspection | `PortalAwsClient.cs:12-15` (path-of-2 sub-selects literais) |
| **R19** | `CotacaoIntegradorClient.SendRequest` usa `Authorization: Basic cHJvY2Vzc2E6OTk=` (= `processa:99`) **hardcoded** (não consulta `DFdominio`) | `true` | code inspection | `CotacaoIntegradorClient.cs:18` |
| **R20** | `Cotacao` (sem hífen) e `cotacao-integrador` são duas linhas distintas com `DFchaves` diferentes (e portas/auth diferentes) | `true` em 87/89 bases (ambos presentes); em 3 bases falta um dos dois | survey count | `.tmp/tbapl-universe.txt` linhas `cotacao` (86) vs `cotacao-integrador` (87) |
| **R21** | `DFchave='processa'` é alias-fallback de `'portal-director'` para resolução de páginas no `GenericPagesRepository.ObterModel` | `true` — proc faz `OR ... DFchave='processa'` no segundo ramo | code inspection | `GenericPagesRepository.cs:20` |
| **R22** | Universo de appKeys distintos cross-tenant (após survey 2026-05-17) | `23` chaves distintas | survey count | `.tmp/tbapl-universe.txt` (linhas de dados, excl. header) |
| **R23** | Constraint `UK_acesso_TBaplicacao_DFchave` impede `INSERT` de `DFchave` duplicada | `true` | DDL inspection + INSERT-fail test | `acesso.TBaplicacao.sql:35-44` |
| **R24** | Em Imperial, `DFchave='agent'` **não existe** | `true` (0 linhas) | SQL count | survey `.tmp/tbapl-sample5.txt` Imperial section (10 linhas, sem agent) |

## Relações com o ecossistema

- **Consumido por**:
  - [[portal-aws-bridge]] — lê `DFchave='portal-aws'` (caminho hardcoded de 2-sub-selects, bypass do `AppClientService`)
  - `AppClientService.ExecProc/GetProc` — resolver genérico cross-appKey (modelo de **F110**)
  - `CotacaoIntegradorClient` — lê `DFchave='cotacao-integrador'` (caminho hardcoded; auth Basic estática)
  - `EdocController`, `SpedRepository` — leituras dedicadas por chave
  - [[acesso-obter-rotas-aplicacao]] / `acesso.obter_aplicacoes_pagina_home` — projeta para menu home (filtra habilitado=1, exclui portal-aws)
  - [[obter-model-pagina]] — `GenericPagesRepository.ObterModel` resolve `DFid_aplicacao` a partir de `chaveAplicacao` para JOIN com `TBpagina.DFid_aplicacao` (com fallback `OR DFchave='processa'`)
  - [[acl-papel-funcao-pagina]] — `DFchaves_aplicacoes` em `TBpagina` é CSV de `DFchave`s desta tabela (cross-link lógico)
- **Sub-contratos derivados (gatilhos para criação futura)**:
  - Auth-scheme-por-appKey: hoje só `cotacao` tem case especial Basic. Se mais appKeys ganharem auth custom, mapear sub-contrato `tbaplicacao-auth-schemes.md`.
  - `TApp` (`PortalDirector.Dominio/TApp.cs`) — domain model projetado pela proc `obter_aplicacoes_pagina_home`. Diferente da tabela: agrega campos compostos `URLPortalDirector`/`URLPortalAWS` por chamada. Sub-contrato candidato se Studio consumir o `TApp` literal.
- **Não consome de ninguém** — é tabela-raiz de service discovery. FK lógica para `acesso.TBarea` via `DFid_area` é organização-secundária (não consultada pelos clients HTTP).
- **Procedures relacionadas no Director**:
  - `acesso.atualizar_dados_aplicacao` — UPDATE (única forma "pública" de mutar)
  - `acesso.obter_dados_aplicacao` — SELECT por id (leitura para UI de configurações)
  - `acesso.consultar_aplicacoes` — SELECT all (listagem admin)
  - `appbuilder.sp_persistir_aplicacao` — INSERT/UPDATE (uso AppBuilder)
  - `appbuilder.sp_obter_dados_aplicacao` / `appbuilder.sp_consultar_aplicacoes` / `appbuilder.sp_deletar_aplicacoes` — CRUD AppBuilder
- **Features no manifest**:
  - **F113** (gate-resolved aqui) — universe descoberto, Imperial cotacao confirmado existente
  - **F110** — proxy multi-app consome este contrato como mapa de discovery
  - **F092a-d** — dependem de F110 → dependem deste contrato
  - **F093** (`configuracoes_email` para appKey `agent`) — gate latente: Imperial **não tem** `agent` (R24); cutover de F093 em Imperial requer ou (a) adicionar linha `agent` em Imperial, ou (b) escopo limitado a tenants que têm; ou (c) F093 reescrita para usar `agent` apenas se presente.
  - **F094** (`configuracoes_aws`) — provavelmente consome via gateway `/portal-aws/proc/<schema>.<proc>` (caminho 2 dedicado, não passa por F110); sub-escavação F094 confirma.

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- **Discriminador estável cross-tenant é `DFchave`, nunca `DFid_aplicacao`**. Qualquer cache/dicionário em memória do Studio deve indexar por `DFchave` literal. `DFid_aplicacao` só serve para JOINs locais dentro da mesma base.
- **Resolver caching**: o legado faz uma `SELECT *` por request (sem cache). Studio pode cachear em-processo desde que invalide em mutações via `acesso.atualizar_dados_aplicacao` ou em refresh per-tenant (TTL curto recomendado — endereços mudam em deploys).
- **Auth-scheme branch em F110**: replicar o switch `case "cotacao" → Basic`, `default → Bearer JWT`. Sem isso, Cotacao 401-a.
- **Identity-de-serviço fixa**: o legado **não propaga a identity do usuário** no caminho genérico (`AppClientService` cria `DirectorIdentity(1, "processa", 0, "Processa")`). Studio precisa decidir paridade exata vs upgrade consciente (identity da sessão real). Paridade exata é o caminho seguro para F092a-d.
- **Header `Domain`** é enviado **adicional** ao Authorization. Replicar.
- **Path-suffix em `DFendereco`** (ex: `http://.../checkin` para `checkin`): a concatenação é literal `{DFendereco}/api/proc/{proc}`. Não normalizar trailing slashes — alguns tenants têm `/` no final, outros não; o legado convive com ambos via a barra inicial de `/api/...`.
- **Imperial é tenant atípico para `agent`**: ausência confirmada. Não usar Imperial como ground-truth de F093 sem ressalva.
- **`DFhabilitado=0` não bloqueia o proxy** — só esconde do menu. F110 deve igualmente ignorar essa flag para preservar paridade.
- **Validação de `DFchave` na rota Studio**: aceitar somente kebab-case ASCII (R10). Rejeitar requests com appKey contendo `_`, `.`, espaços, ou caracteres não-ASCII.

## Sources

- [[calendar/notes/2026-05-17.md]] — survey TBaplicacao cross-tenant (89/97 bases probadas, 970 linhas, 23 appKeys distintos)
- Probe scripts: `D:/anvil/.tmp/probe-tbaplicacao.ps1`, `D:/anvil/.tmp/probe-tbapl-cross.ps1`
- Outputs: `D:/anvil/.tmp/tbapl-cross.csv`, `D:/anvil/.tmp/tbapl-universe.{txt,csv}`, `D:/anvil/.tmp/tbapl-cotacao.txt`, `D:/anvil/.tmp/tbapl-sample5.txt`, `D:/anvil/.tmp/tbapl-errors.txt`, `D:/anvil/.tmp/probe-imperial-full.txt`, `D:/anvil/.tmp/probe-dblist.txt`
