---
title: "Fornecedor AWS — autenticação local por e-mail/senha SHA2_256 contra portal.UsuarioFornecedor"
aliases: [processa-auth-fornecedor-aws, fornecedor-aws-auth, AuthFornecedorAWSQuery, portal-usuario-fornecedor-auth, login-fornecedor]
tags: [contract, legacy, auth, fornecedor, aws, sha2-256, portal-aws, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Contrato: Fornecedor AWS — login por e-mail contra `portal.UsuarioFornecedor`

O caminho `fornecedor-aws` é a **autenticação de usuários externos** (vendedores/representantes de empresas-fornecedoras) que acessam **apps hospedados no Portal AWS** (módulo de Agendamento `agent`, módulo `cotacao`, módulo de gestão de fornecedor no `portal`). Ao contrário do `internal-db` (que bate em `acesso.TBusuario` do banco do tenant), o `fornecedor-aws` bate em **uma única tabela `portal.UsuarioFornecedor` que vive no banco AWS** — base separada do ERP on-prem do tenant. O discriminador é puramente textual: identity contém `@` (heurística "parece um e-mail") → caminho é `fornecedor-aws`.

O legado **não tem uma proc dedicada** para essa autenticação; a query é **inline no .NET**, definida como `string` em `Settings.AuthFornecedorAWSQuery` (com fallback default hardcoded em `Processa.Sdk.Api/Settings.cs:54-65`) e executada por `AuthMiddleware.GetIdentity` com dois parâmetros (`@nome`, `@senha`). A query é overridable por tenant via Seat (`SeatContext.AuthFornecedorAWS` em `Sdk.Seat/Extensoes.cs:17`) — mas o default cobre 100% dos tenants observados no legado.

Lógica do legado, passo-a-passo:

1. `AuthMiddleware.BuildPrincipal` extrai `User:Password` do header `Authorization: Basic`.
2. `IsLdapUser()` testa prefixo `processa\` / `processa.com\` → falso para identity com `@`.
3. Cai em `AuthenticateLocal(User, Password)` → `GetIdentity(name, password, domain)`.
4. Em `GetIdentity`: se `name.Same("processa")` → desvio para `AuthenticateTempPassword` (irrelevante aqui). Senão abre `Database.GetConnection(domain)` (tenant) e testa `var usuarioFornecedor = name.Contains('@')`. Se sim, **usa `Settings.AuthFornecedorAWSQuery`**; se não, `Settings.AuthQuery` (caminho `internal-db`).
5. Comando parametrizado com `@nome = identity` e `@senha = password-plaintext`. A query default hash-eia `@senha` dentro do SQL (`HashBytes('SHA2_256', CAST(@senha AS VARCHAR(256)))` convertido a `NVARCHAR(256)` hex via `CONVERT(..., 2)`) e compara com a coluna `Senha` armazenada — que **já está hash-eada com o mesmo algoritmo** quando o registro foi gravado por `portal.persistir_usuario_fornecedor` ou `portal.sincronizar_usuarios`.
6. Resultado: 1 linha (autenticado) ou 0 linhas (rejeitado). Em sucesso, o reader extrai `Id, Nome, CodEmpresa, NomeEmpresa` e o middleware constrói `new DirectorIdentity(id, nome, codEmpresa, nomeEmpresa) { Domain = domain }` — **sem qualquer flag explícita de "isFornecedor"**. Em falha, o middleware lança `AuthenticationException("Login e/ou senha incorretos.")` → 401 do pipeline.

A query SELECT canônica (`Settings.cs:54-65`):

```
SELECT Id          AS [Id]
     , Email       AS [Nome]
     , 1           AS [CodEmpresa]
     , NomeUsuario AS [NomeEmpresa]
  FROM portal.UsuarioFornecedor WITH(NOLOCK)
 WHERE Email = @nome
   AND Senha = CONVERT(NVARCHAR(256), HashBytes('SHA2_256', CAST(@senha AS VARCHAR(256))), 2)
   AND Status = 1
```

A identity emitida é uma **sentinela parcial**: `Id = registro.Id` (real, autoincrementado da `portal.UsuarioFornecedor`), `Nome = registro.Email` (o próprio e-mail que veio na identity, ecoado), `CodEmpresa = 1` (constante hardcoded — **não** mapeia para `acesso.TBempresa.DFcod_empresa` real do tenant), `NomeEmpresa = registro.NomeUsuario` (nome humano do contato — não é o nome da empresa-fornecedora!). Não há `Grupos`, não há `JWT`, não há flag `fornecedor=true`. A ACL/discriminação posterior depende de o consumidor saber, pelo contexto (qual app está logada / `Domain` da identity), que aquele `Id=N` é índice de `portal.UsuarioFornecedor`, não de `acesso.TBusuario`.

**Onde mora a tabela**: a `portal.UsuarioFornecedor` **não existe** no banco do tenant on-prem (apenas no banco AWS). No legado, o `AuthMiddleware` executa o login `fornecedor-aws` **dentro do processo .NET hospedado na AWS** (Portal AWS hosts: `portal`, `agent`, `cotacao`), conectado ao banco AWS local — não há cross-DB neste caminho. O Portal.Director on-prem **não autentica fornecedor diretamente**; quando precisa de dados de fornecedor, ele **proxia** via `PortalAwsClient.SendRequest` para procs no AWS (vide [[portal-aws-bridge]]) — mas isso é caminho de proxy de dados, não de auth. Para o Studio (que **substitui** os hosts Portal AWS), `fornecedor-aws` significa "consultar a tabela `portal.UsuarioFornecedor` da base configurada no `STUDIO_DB_*` quando essa base for um banco do tipo Portal AWS"; o probe `getSchemas` em `routes/auth.ts:355-370` já confirma presença da tabela antes de tentar a query.

**Cadastro e ciclo de vida**: o registro é criado/editado por **operador interno do ERP** via tela `/configuracoes/fornecedores` no Portal.Director (CRUD do `UtilsController.cs:60-93`), que proxia `portal.persistir_usuario_fornecedor` na AWS. Também é criado em massa via **sincronização**: a proc `aws_sincronizar_entidade @entidade='usuarios'` no Director gera XML com vendedores derivados de `TBcontato_fornecedor` filtrados por `DFid_setor_contato = 441 (VENDEDOR)`, com **senha gerada deterministicamente** como literal `'for-' + LEFT(DFcgc, 3)` (3 primeiros dígitos do CNPJ do fornecedor — vide `aws_sincronizar_entidade.sql:141-212` e `portal.sincronizar_usuarios.sql:79+`), e `portal.sincronizar_usuarios` hash-eia essa senha com SHA2_256 (mesmo algoritmo) no INSERT/UPDATE de `portal.Usuario` (note: `portal.Usuario` ≠ `portal.UsuarioFornecedor` — vide §[[#Confusão de tabelas — Usuario vs UsuarioFornecedor]]). **Não há fluxo de self-service de cadastro nem de reset de senha** no legado — operador interno é o único caminho.

## Citações de fonte

- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:36` — `principal = IsLdapUser() ? AuthenticateLdap(...) : AuthenticateLocal(User, Password);` — entrada do path local (engloba `fornecedor-aws`).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:60-90` — `GetIdentity(name, password, domain)`: corpo completo.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:63` — `if (name.Same("processa")) return AuthenticateTempPassword(password);` — desvio de temp-password antes da query (não-aplicável a fornecedor real porque `Same` faz trim+lowercase e nenhum e-mail equivale a `"processa"`).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:68` — `var usuarioFornecedor = name.Contains('@');` — **discriminador exato**: presença de `@` em qualquer posição da string identity. Case-sensitive (`'@'` é caractere único).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:69` — `using var command = Database.GetCommand(usuarioFornecedor ? Settings.AuthFornecedorAWSQuery : Settings.AuthQuery, connection);` — seleção da query.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:71-80` — parâmetros: `@nome = name` (identity completa, com `@`), `@senha = password` (plaintext). Adicionados via `command.CreateParameter()` (não há `SqlDbType` explícito; defaults do `Microsoft.Data.SqlClient` aplicam).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:82-88` — leitura: `reader.Read()` → false ⇒ retorna `null` (caller traduz para `AuthenticationException("Login e/ou senha incorretos.")`); true ⇒ extrai `Id` (int), `Nome` (string), `CodEmpresa` (int), `NomeEmpresa` (string).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:88` — `return new DirectorIdentity(id, nome, codEmpresa, nomeEmpresa) { Domain = domain };` — identity construída; `Domain` herda do parâmetro do middleware (não da tabela).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:55-57` — em falha do `GetIdentity` (`null`) → `throw new AuthenticationException("Login e/ou senha incorretos.")`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Settings.cs:37-66` — `SetCustomAuthQuery(string customAuthQuery, bool authFornecedor = false)`: setter; default `AuthFornecedorAWSQuery` linhas 54-65. Sobrecarga via Seat (`SetCustomAuthQuery(SeatContext.Instancia.AuthFornecedorAWS ?? string.Empty, true)`) — string vazia preserva o default.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Settings.cs:54-65` — query default literal (citada acima inline).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Settings.cs:175` — `public static string AuthFornecedorAWSQuery { get; private set; } = string.Empty;` — propriedade estática inicialmente vazia até o boot do app (Seat ou default).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Seat/Api/Extensoes.cs:17` — `Settings.SetCustomAuthQuery(SeatContext.Instancia.AuthFornecedorAWS ?? string.Empty, true);` — boot do Seat injeta query custom se disponível (atualmente, nenhum tenant observado fornece — todos usam o default).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Seat/Dominio/TipoServico.cs:6` — enum `TipoServico.AuthFornecedorAWS` (slot do Seat para sobrescrever a query).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Seat/SeatContext.cs:59` — `public string? AuthFornecedorAWS => Servicos("AuthFornecedorAWS").FirstOrDefault()?.Passos.FirstOrDefault()?.Comando;` — lookup via XML `Configuracao.xml`.
- `sources/engenharia--fabrica--sql--portal-aws/portal/criacao/portal.UsuarioFornecedor.sql:1-56` — DDL completo da tabela: `CREATE TABLE` (linhas 4-13) e migrações posteriores que adicionam `Cnpj NVARCHAR(14)` e alargam `Email` (510→1024) e `Senha` (510→2048).
- `sources/engenharia--fabrica--sql--portal-aws/portal/criacao/portal.UsuarioFornecedor.sql:4-13` — schema base: `Id INT PRIMARY KEY IDENTITY`, `NomeUsuario NVARCHAR(255)`, `Senha NVARCHAR(255)`, `Email NVARCHAR(255)`, `Fornecedores NVARCHAR(2048)`, `Status BIT`, `UNIQUE(email)`.
- `sources/engenharia--fabrica--sql--portal-aws/portal/criacao/portal.UsuarioFornecedor.sql:24-30` — `ALTER TABLE ADD Cnpj NVARCHAR(14)` (constraint UNIQUE comentado — não enforçada).
- `sources/engenharia--fabrica--sql--portal-aws/portal/criacao/portal.UsuarioFornecedor.sql:40-43` — `ALTER COLUMN Email NVARCHAR(1024)` quando vier de instalação antiga com 510.
- `sources/engenharia--fabrica--sql--portal-aws/portal/criacao/portal.UsuarioFornecedor.sql:52-55` — `ALTER COLUMN Senha NVARCHAR(2048)` migração análoga.
- `sources/engenharia--fabrica--sql--portal-aws/portal/programacao/portal.persistir_usuario_fornecedor.sql:67-70` — branch "update": se `@senha <> select Senha from portal.UsuarioFornecedor where Id = @id` (a senha enviada **difere** do hash atual), então `SET @senha = CONVERT(NVARCHAR(256), HashBytes('SHA2_256', CAST(@senha AS VARCHAR(256))), 2)` — re-hash. Significa: caller pode mandar plaintext em UPDATE; se for igual ao hash já armazenado, mantém; senão re-hash com SHA2_256 hex sem `0x`.
- `sources/engenharia--fabrica--sql--portal-aws/portal/programacao/portal.persistir_usuario_fornecedor.sql:74-76` — `@status_usuario bit = 0; IF @status = 'true' OR @status = '1' SET @status_usuario = 1` — Status vem do XML como `'true'/'false'/'1'/'0'` (string), normalizado a bit.
- `sources/engenharia--fabrica--sql--portal-aws/portal/programacao/portal.persistir_usuario_fornecedor.sql:79-86` — UPDATE preserva Status do XML (não força 1).
- `sources/engenharia--fabrica--sql--portal-aws/portal/programacao/portal.persistir_usuario_fornecedor.sql:114-119` — branch "insert": `SET @senha = CONVERT(NVARCHAR(256), HashBytes('SHA2_256', CAST(@senha AS VARCHAR(256))), 2)` sempre + INSERT com `Status = 1` literal (recém-criado é ativo).
- `sources/engenharia--fabrica--sql--portal-aws/portal/programacao/portal.persistir_usuario_fornecedor.sql:80-86` — fields atualizados: `Email`, `Fornecedores`, `NomeUsuario`, `Status`, `Senha`, `Cnpj`.
- `sources/engenharia--fabrica--sql--portal-aws/portal/programacao/portal.sp_obter_usuario_fornecedor.sql:19-29` — SELECT por `Id` retornando `Id, NomeUsuario, Email, Status('true'/'false'), Senha, IdsFornecedores=Fornecedores, Cnpj`. Note: **retorna o hash da senha** na consulta de leitura (operador interno pode ver o digest, não o plaintext — irrecuperável mas vazado).
- `sources/engenharia--fabrica--sql--portal-aws/portal/programacao/portal.obter_usuarios_fornecedores.sql:165-185` — listagem paginada/filtrada (consumida pelo datagrid `/api/fornecedor/listar`). Filtros: `nomeUsuario LIKE`, `email LIKE` OR `email IN split`, `cnpj LIKE` OR `cnpj IN Fornecedores split` OR `cnpj IN cnpjs split`, `Status = @status_usuario`.
- `sources/engenharia--fabrica--sql--portal-aws/portal/programacao/portal.deletar_usuario_fornecedor.sql:32-66` — DELETE em cascata: remove `agent.UsuarioFornecedorDefinicao` + `agent.EquipeFornecedor` + `portal.UsuarioFornecedor` apenas para Ids **sem agendamento associado** (`agent.Agendamento.CriadoPor = portal.UsuarioFornecedor.Email`). Restantes ficam preservados; resposta avisa "relacionamentos".
- `sources/engenharia--fabrica--sql--portal-aws/agent/programacao/agent.obter_dados_usuario_fornecedor_email.sql:16-25` — consumidor: dado um e-mail, retorna `NomeUsuario AS Responsavel, Cnpj AS ResponsavelCnpj` da `portal.UsuarioFornecedor`. Usado pelo Agendamento para preencher campos "responsável" automaticamente quando o usuário logado é fornecedor.
- `sources/engenharia--fabrica--sql--portal-aws/agent/programacao/agent.obter_dados_usuario_fornecedor_cnpj.sql:14-27` — análogo, lookup por CNPJ.
- `sources/engenharia--fabrica--sql--portal-aws/agent/criacao/agent.UsuarioFornecedorDefinicao.sql` (referenciado em `obter_usuarios_fornecedores.sql:144-162`) — tabela de configurações por fornecedor (chave-valor): `Chave = 'qtde-agntos'`, `Chave = 'num-pedido-obrigatorio'`, etc. **Não usado no caminho de auth**, mas é a "ACL operacional" do fornecedor (quanto pode agendar, se número-de-pedido é obrigatório).
- `sources/engenharia--fabrica--sql--portal-aws/agent/criacao/agent.EquipeFornecedor.sql` — vínculo fornecedor↔equipe interna (consumido em `deletar_usuario_fornecedor` cascade).
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Controllers/UtilsController.cs:60-93` — proxy controllers do CRUD: `POST /api/fornecedor/listar`, `/persistir`, `/deletar`, `/obter`. **Não fazem auth**; só repassam para procs AWS via `PortalAwsClient.SendRequest`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Services/FornecedorService.cs:9-30` — `ObterUsuarioFornecedor(id)` para enriquecer com `Fornecedor[]` do ERP local (resolve CNPJs do campo `Fornecedores` contra `TBfornecedor` on-prem).
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Services/Interfaces/IFornecedorService.cs` — interface do `FornecedorService` (apenas para rastreabilidade).
- `sources/engenharia--fabrica--sql--portal-aws/portal/integracao/portal.sincronizar_usuarios.sql:1-135` — proc paralela que popula `portal.Usuario` (não-confundir!) via XML do Director; relevante porque mostra o **mesmo SHA2_256** sendo usado mas em **outra tabela** (vide §[[#Confusão de tabelas — Usuario vs UsuarioFornecedor]]).
- `sources/engenharia--fabrica--sql--portal-director/processa.agendamento/programacao/aws_sincronizar_entidade.sql:141-212` — geração XML de "Usuarios" com senha `'for-' + LEFT(DFcgc, 3)` para vendedores derivados de `TBcontato_fornecedor` (sincronização ERP→AWS — alimenta `portal.Usuario`, **não** `portal.UsuarioFornecedor`).

## Estrutura

### Tabela `portal.UsuarioFornecedor` (esquema observado)

| Coluna | Tipo | Nullable | Default | Constraint | Semântica | Vem de |
|---|---|---|---|---|---|---|
| `Id` | `INT IDENTITY` | não | (autoincrementado) | `PRIMARY KEY` | PK autoincrementada | `portal.UsuarioFornecedor.sql:5` |
| `NomeUsuario` | `NVARCHAR(255)` | sim (sem `NOT NULL`) | (none) | — | Nome humano do contato (não o nome da empresa); usado para preencher `[NomeEmpresa]` da identity (sentinela enganosa) e como `Responsavel` em `agent.obter_dados_usuario_fornecedor_email` | `portal.UsuarioFornecedor.sql:6` |
| `Senha` | `NVARCHAR(255)` originalmente; em deploys migrados é `NVARCHAR(2048)` | sim | (none) | — | Hash hex SHA2_256 da senha plaintext, sem prefixo `0x`. Comprimento real do conteúdo é fixo em **64 chars** (SHA2_256 = 32 bytes = 64 hex chars), mas a coluna comporta string maior por migração de versões antigas. Plaintext **nunca é armazenado**. | `portal.UsuarioFornecedor.sql:7,52-55`; `persistir_usuario_fornecedor.sql:69,114`; `Settings.cs:62` |
| `Email` | `NVARCHAR(255)` originalmente; em deploys migrados é `NVARCHAR(1024)` | sim | (none) | `UNIQUE(email)` | E-mail do contato — **é o login**. Único no banco AWS inteiro. Sanitizado via `dbo.fn_sanitizar_email` no INSERT/UPDATE (`persistir_usuario_fornecedor.sql:80,89`). | `portal.UsuarioFornecedor.sql:8,12,40-43`; `persistir_usuario_fornecedor.sql:53,80,89` |
| `Fornecedores` | `NVARCHAR(2048)` | sim | (none) | — | Lista CSV de CNPJs (sem máscara — apenas dígitos) das empresas-fornecedoras que o usuário representa. Pode ser 1 ou N. Resolução cross-base: `FornecedorService.ObterFornecedoresId(split)` no Director consulta `TBfornecedor.DFcgc` para enriquecer. **Não há FK** (não pode haver — CNPJ vive em base separada). | `portal.UsuarioFornecedor.sql:9`; `FornecedorService.cs:9-30` |
| `Status` | `BIT` | sim | (none — pode ser NULL) | — | Ativo/inativo. `1` = ativo (autenticável); `0` ou `NULL` = inativo. **Cláusula `AND Status = 1` no SELECT de auth bloqueia `0` E `NULL`** (SQL Server: `NULL = 1` é UNKNOWN, filtrado). | `portal.UsuarioFornecedor.sql:10`; `Settings.cs:63` |
| `Cnpj` | `NVARCHAR(14)` (adicionado via ALTER posterior) | sim | (none) | UNIQUE **comentado** (não enforçado) | CNPJ do usuário-pessoa-jurídica (raramente preenchido — quando vendedor representa apenas 1 fornecedor, é normalmente o mesmo da lista `Fornecedores`). Normalizado para apenas dígitos na persistência (REPLACE `.`, `/`, `-`). | `portal.UsuarioFornecedor.sql:24-30`; `persistir_usuario_fornecedor.sql:55-57` |

**Índices observáveis**: apenas `PRIMARY KEY (Id)` (clustered, IDENTITY) e `UNIQUE (Email)` declarados no DDL. Não há índice em `Cnpj`, nem em `Status`, nem em `Senha`. Plano de execução da query de auth é provavelmente seek por `UNIQUE(Email)` + key-lookup para conferir `Senha` e `Status`.

**Constraints comentadas / não-enforçadas**:
- `CONSTRAINT UK_portal_Usuario_Fornecedor_Cnpj UNIQUE (Cnpj)` está em comentário no DDL — não há unicidade de CNPJ.
- Sem `NOT NULL` em nenhuma coluna além de `Id` — qualquer inserção que omita campos passará (mas as procs do legado sempre preenchem).

### Query de autenticação (algoritmo observável)

| Item | Valor | Vem de |
|---|---|---|
| Engine | MS SQL Server | toda a base AWS é SQL Server |
| Comando | inline SELECT (não-stored-proc) | `Settings.cs:54-65` |
| Parâmetros | `@nome` (NVARCHAR — tipo inferido do default `CreateParameter`; sem tipo explícito), `@senha` (idem) | `AuthMiddleware.cs:71-77` |
| Filtros | `Email = @nome AND Senha = CONVERT(NVARCHAR(256), HashBytes('SHA2_256', CAST(@senha AS VARCHAR(256))), 2) AND Status = 1` | `Settings.cs:61-63` |
| Colunas retornadas | `Id, Email AS Nome, 1 AS CodEmpresa, NomeUsuario AS NomeEmpresa` | `Settings.cs:56-59` |
| Cardinalidade esperada | 0 ou 1 (UNIQUE em Email garante) | DDL `UNIQUE(email)` |
| WITH(NOLOCK) | sim | `Settings.cs:60` — dirty read aceitável para auth (pior caso: senha recém-trocada pode falhar por 1 transação em vôo) |

**Detalhes do hash** (decompondo o snippet `CONVERT(NVARCHAR(256), HashBytes('SHA2_256', CAST(@senha AS VARCHAR(256))), 2)`):

1. **Cast intermediário `VARCHAR(256)`**: a senha que chega como `NVARCHAR` (do parâmetro .NET, padrão UTF-16) é castada a `VARCHAR` (single-byte). Em SQL Server com collation default Latin1/CP1252, caracteres ASCII puros (`[A-Za-z0-9!@#$%...]`) sobrevivem 1:1; caracteres não-ASCII (acentos, emoji, hebraico, CJK) sofrem conversão lossy ou tornam-se `?`. **Senhas com acentos** (`á`, `ç`) **viram digest diferente** dependendo do collation do banco — é fonte de inércia legada (§[[#Inércia legada]]).
2. **`HashBytes('SHA2_256', ...)`**: aplica SHA-256 sobre os bytes single-byte resultantes do CAST. Retorna `VARBINARY(32)` (32 bytes = 256 bits).
3. **`CONVERT(NVARCHAR(256), <varbinary>, 2)`**: estilo `2` = hexadecimal **sem prefixo `0x`**, **uppercase**, 1 byte → 2 chars hex → total **64 chars**. Resultado é literal alfanumérico `[0-9A-F]{64}`.
4. **Comparação `Senha = <hex>`**: comparação de strings com collation default. Default SQL Server pt-BR é `SQL_Latin1_General_CP1_CI_AS` (case-insensitive, accent-sensitive). Como o digest é só `[0-9A-F]`, case-insensitivity é irrelevante na prática (hex tem chars distinguíveis na faixa ASCII básica), mas vale notar: senha armazenada `"aabbccdd..."` lowercase casaria com `"AABBCCDD..."` uppercase devido ao CI. O legado **sempre grava uppercase** (estilo 2 do CONVERT é uppercase), então a equivalência cross-case nunca é exercitada em produção.

### Identity emitida (sucesso)

| Campo | Valor da identity | Origem real | Observação |
|---|---|---|---|
| `Id` | `(int) row.Id` | `portal.UsuarioFornecedor.Id` (PK autoincrementada) | Real, mas **não** mapeia para `acesso.TBusuario.DFid_usuario` — é PK de outra tabela em outra base. Colisão de ID entre `TBusuario` e `UsuarioFornecedor` é certa em qualquer tenant. Caller deve discriminar pelo path/domain. |
| `Nome` | `(string) row.Nome` (`= registro.Email`) | `portal.UsuarioFornecedor.Email` | Eco do e-mail enviado como identity. Sempre contém `@` (UNIQUE forçou e-mail no cadastro — mas o DDL não enforça `LIKE '%@%'`, é convenção da aplicação). |
| `CodEmpresa` | `1` (literal int) | hardcoded na query (`1 AS CodEmpresa`) | **Não tem significado de tenant ou empresa real**. Sentinela "todos os fornecedores pertencem à empresa 1". Inércia legada. |
| `NomeEmpresa` | `(string) row.NomeEmpresa` (`= registro.NomeUsuario`) | `portal.UsuarioFornecedor.NomeUsuario` | **Confusão de nome**: o campo `NomeUsuario` da tabela vira `NomeEmpresa` da identity. Pra um observador externo da identity, o "nome da empresa" do fornecedor é na verdade o "nome do contato pessoa" — útil pra UI mas semanticamente errado. Inércia legada. |
| `Domain` | `domain` (parâmetro do middleware) | `Database.GetConnection(domain)` — vem do `DirectorIdentity` parente ou header `Domain` da request | Não há campo de domínio na tabela; o Domain é setado pelo caller, normalmente o tenant da app que recebeu o login. Em F003 ele já é capturado no body `loginSchema.domain`. |
| `JWT` | (não setado) | n/a | Não é gerado neste caminho — middleware `AuthMiddleware.BuildPrincipal` retorna principal "raw"; emissão de JWT cabe à camada superior. |
| `Grupos` | `[]` (default `IEnumerable<string>` vazio) | n/a | **Não há equivalente de grupos AD para fornecedor**. ACL operacional (`agent.UsuarioFornecedorDefinicao`) é consultada por outras procs, sob demanda, com `UsuarioFornecedorId = identity.Id` — não pré-carrega na sessão. |

### Side effects

| Item | Comportamento | Vem de |
|---|---|---|
| Sessão remota | **Nenhuma** — a query é stateless. Sem cookie no banco, sem token persistido, sem log de login. | `AuthMiddleware.cs:60-90` (zero `INSERT`/`UPDATE`) |
| Auditoria | **Nenhuma**. Não há `INSERT` em qualquer `audit_log` ou `TBaudit`. Sucessos e falhas são opacos no banco — só ficam no log de aplicação (`Logger.Info/Warn`) se o middleware tiver tal logger configurado (não há evidência no SDK). | varredura de `INSERT INTO.*audit` e similares: zero matches nos paths de auth |
| Rate limit | Sem evidência. Não há contador de tentativas falhas, sem `LockoutEnabled`, sem `AccessFailedCount`. | varredura de `Lockout|AccessFailed|RateLimit`: zero matches |
| Trigger | Sem trigger declarado em `portal.UsuarioFornecedor` no DDL nem em migrações. | DDL completo lido |
| Notificação | Sem `EXEC sp_send_dbmail` no caminho, sem hook de email. | proc `persistir_usuario_fornecedor` linhas 1-143: zero envio de email |

### Discriminador `usuarioFornecedor` (no cliente legado)

| Identity de entrada | É fornecedor? | Decisão |
|---|---|---|
| `vendedor@empresa.com.br` | sim | usa `AuthFornecedorAWSQuery` |
| `vendedor@gmail.com` | sim | idem (provedor de e-mail é irrelevante) |
| `a@b` | sim | idem (qualquer `@`, posição irrelevante) |
| `@inicial` | sim | discriminador é `Contains('@')`, não `Matches /.+@.+/` |
| `final@` | sim | idem |
| `processa\guga` | não (LDAP — desviado antes pelo `IsLdapUser`) | não chega no caminho fornecedor |
| `processa` (literal) | não (temp-password — desviado antes pelo `name.Same("processa")` em GetIdentity:63) | não chega no caminho fornecedor |
| `guga` (sem `@`, sem `\`) | não | usa `AuthQuery` (`internal-db`) contra `acesso.TBusuario` |
| `Vendedor@Empresa.com.br` (maiúsculas/minúsculas) | sim (discriminação é só por `@`); auth funciona porque `Email = @nome` com collation CI compara case-insensitive — UNIQUE também é CI por default | usa `AuthFornecedorAWSQuery` |

## Asserções observáveis

| # | Input | Output esperado | Regra de comparação | Fonte legado |
|---|---|---|---|---|
| F1 | identity contém `@` em **qualquer posição** (case-insensitive em qualquer parte porque discriminador é só `Contains('@')`), não começa com `processa\` nem `processa.com\`, não é literal `"processa"` | path resolvido = `fornecedor-aws` (chama `AuthFornecedorAWSQuery`) | `name.Contains('@')` ⇒ usa `Settings.AuthFornecedorAWSQuery` | `Processa.Sdk.Auth/AuthMiddleware.cs:68-69` |
| F2 | identity = `Vendedor@Empresa.com.br`, registro `portal.UsuarioFornecedor` com `Email = 'vendedor@empresa.com.br'`, `Senha = SHA2_256-hex(senha-plain)`, `Status = 1` | retorna 1 linha com colunas `Id, Email AS Nome, 1 AS CodEmpresa, NomeUsuario AS NomeEmpresa` | `WHERE Email = @nome AND Senha = CONVERT(NVARCHAR(256), HashBytes('SHA2_256', CAST(@senha AS VARCHAR(256))), 2) AND Status = 1`; collation default CI casa Vendedor=vendedor | `Processa.Sdk.Api/Settings.cs:54-65` + DDL `UNIQUE(email)` |
| F3 | senha plain incorreta (qualquer string ≠ a que gerou o hash armazenado) | retorna 0 linhas → middleware lança `AuthenticationException("Login e/ou senha incorretos.")` → 401 | comparação `Senha = HashBytes(...)` falha | `Processa.Sdk.Api/Settings.cs:62` + `AuthMiddleware.cs:55-57` |
| F4 | registro com `Status = 0` E senha correta | retorna 0 linhas (status filtra antes de retornar) → 401 com mesma mensagem genérica de F3 (não diferencia) | `AND Status = 1`; `0 = 1` é FALSE | `Processa.Sdk.Api/Settings.cs:63` |
| F5 | registro com `Status = NULL` E senha correta | retorna 0 linhas — `NULL = 1` é UNKNOWN, filtrado pelo WHERE | semântica SQL Server (3-valued logic) | `Processa.Sdk.Api/Settings.cs:63` |
| F6 | senha enviada com **espaços** no começo/fim (ex.: `" senha123 "`) | hash é calculado **sobre a string com espaços** (`CAST(@senha AS VARCHAR(256))` não faz trim); ⇒ digest diferente de `"senha123"` ⇒ 0 linhas, 401 | sem `LTRIM/RTRIM` em `@senha` na query | `Processa.Sdk.Api/Settings.cs:62` (sem trim) + `persistir_usuario_fornecedor.sql:67-70,114` (insert também não faz trim na senha) |
| F7 | senha com caractere não-ASCII (ex.: `senh@çÁo`) — registro foi inserido com mesma senha sob mesmo collation do banco | autentica `true` (`CAST(@senha AS VARCHAR(256))` aplica a conversão lossy no insert E no validate, e a conversão é determinística para o mesmo collation) | digest gerado é byte-a-byte igual entre `INSERT` e `SELECT` quando o collation é estável | `persistir_usuario_fornecedor.sql:69,114` (INSERT/UPDATE usam o mesmo `CAST(... AS VARCHAR(256))`) + `Settings.cs:62` |
| F8 | senha não-ASCII gravada em banco com **collation A** (ex.: Latin1) e validada em banco com **collation B** (ex.: replicado com SQL_Latin1_General_CP1_CS_AS) | comportamento indefinido — provavelmente falha (digest diferente). **Inércia legada**: nenhum tenant Processa exercita cross-collation, mas é defeito latente | `CAST(... AS VARCHAR(256))` é collation-dependente | inferido de `persistir.sql:69` + `Settings.cs:62` + semântica de `VARCHAR` sem `COLLATE` explícito |
| F9 | identity correta com `@` mas que **não existe** em `portal.UsuarioFornecedor` (não-cadastrado) | retorna 0 linhas → 401 com mesma mensagem que F3/F4/F5 (indistinguível) | `Email = @nome` não casa | `Processa.Sdk.Api/Settings.cs:61` + `AuthMiddleware.cs:55-57` |
| F10 | tabela `portal.UsuarioFornecedor` **não existe** na base (ex.: tenant sem módulo de fornecedor) | query lança exceção SQL (`Invalid object name 'portal.UsuarioFornecedor'`); .NET propaga como `SqlException` no `ExecuteReader` — não há catch específico em `GetIdentity`; sobe para `BuildPrincipal` que **não tem catch** → middleware `InvokeAsync:38-51` traduz para 401 genérico **mas com `Sucesso=false` e mensagem `"Falha na autenticação do usuário"`** | exceção SQL → catch genérico do `AbstractBearerAuth.InvokeAsync` | `AuthMiddleware.cs:65-89` (sem try/catch interno) + `AbstractBearerAuth.cs:38-51` (catch genérico) |
| F11 | `Settings.AuthFornecedorAWSQuery` **não foi inicializada** (Seat boot não rodou e default não foi setado — caminho teórico improvável) | query é `string.Empty` → `Database.GetCommand("", connection)` provavelmente lança `InvalidOperationException` ou retorna recordset vazio → middleware traduz para 401 genérico | `Settings.cs:175` (initial value `string.Empty`) | inferido |
| F12 | identity está limpa de `@` (sem prefixo `processa\`) | discriminador `Contains('@')` retorna `false` → cai em `AuthQuery` (caminho `internal-db`) | exclusivo: identity ou tem `@` ou não tem | `AuthMiddleware.cs:68` |
| F13 | identity já passou pelo desvio de temp-password (`name.Same("processa")` em GetIdentity:63) | nunca chega no caminho fornecedor (return early) | `if (name.Same("processa")) return AuthenticateTempPassword(password);` antes do `usuarioFornecedor = name.Contains('@')` | `AuthMiddleware.cs:63 vs 68` |
| F14 | tabela com 2 registros com mesmo Email **(violação de UNIQUE — impossível no legado)** | DDL `UNIQUE(email)` garante cardinalidade ≤ 1; F2 sempre retorna 0 ou 1 linha | constraint enforçada | `portal.UsuarioFornecedor.sql:12` |
| F15 | identity emitida em sucesso | `DirectorIdentity { Id: <int registro.Id>, Nome: <string registro.Email>, CodEmpresa: 1, NomeEmpresa: <string registro.NomeUsuario>, Domain: <domain do middleware> }`. `Grupos = []`, `JWT = null`. **`CodEmpresa=1` é literal hardcoded — não é tenant real.** | `AuthMiddleware.cs:84-88` + `Settings.cs:56-59` | `Processa.Sdk.Auth/AuthMiddleware.cs:88` |
| F16 | sucesso de auth | **Sem side effect persistente** — zero INSERT/UPDATE/log de auditoria. Mesmo o `Logger.Info` do middleware (se houver) só registra em log de aplicação, não em banco | varredura de paths laterais: zero | `AuthMiddleware.cs:60-90` (zero mutation) |
| F17 | senha **hashada** enviada como `@senha` (caller errôneo passa o hex em vez do plaintext) | hash-do-hash não bate com hash-da-senha-original → 0 linhas → 401. **Bug latente útil**: protege contra replay de hash interceptado | `HashBytes('SHA2_256', <já-é-hex>)` ≠ `<hex>` | `Settings.cs:62` |
| F18 | parâmetros SQL passados com tipo errado (`@senha` enviado como `int` ou `binary`) | `command.CreateParameter()` sem `SqlDbType` permite inferência; .NET marshalls baseado em runtime type. **Cliente legado sempre passa `string`** (não há outro caminho) — comportamento fora desse contrato é fora-do-contrato. Smith no Studio deve passar `sql.NVarChar` explicitamente (vide F003) | `AuthMiddleware.cs:71-80` (sem `SqlDbType` setado) | inferido + comparação com F003 atual |
| F19 | identity = e-mail com case diferente do registro (ex.: `VENDEDOR@empresa.com` vs gravado como `vendedor@empresa.com`) | autentica `true` na collation default (`SQL_Latin1_General_CP1_CI_AS`); UNIQUE também CI; **se** o tenant tem collation case-sensitive (`_CS_`), então autentica `false`. **Inércia latente**: assumir CI é o padrão Processa | semântica de collation SQL Server | DDL sem `COLLATE` explícito + convenção Processa |
| F20 | falha de auth (qualquer F3/F4/F5/F9) | resposta legada: 401 com body `{status:401, sucesso:false, dados:"Login e/ou senha incorretos."}` (ou `"Falha na autenticação do usuário"` se exceção genérica caiu no catch). **Indistinguível**: senha errada, status zero, e-mail inexistente, tabela inexistente — tudo mesmo 401 | `AuthMiddleware.cs:55-57` + `AbstractBearerAuth.cs:38-51` | `Processa.Sdk.Auth/AuthMiddleware.cs:55-57` |
| F21 | path canônico end-to-end (asserção composta, ui-tester rodável) | (a) cliente envia `POST /api/auth/login` com `{identity: "vendedor@empresa.com.br", password: "senha-real"}`; (b) Studio resolve path `fornecedor-aws` por `@`; (c) `getSchemas(pool)` confirma `UsuarioFornecedor` presente; (d) query `SELECT Id, Email AS Nome, 1 AS CodEmpresa, NomeUsuario AS NomeEmpresa FROM [<schema>].UsuarioFornecedor WHERE Email=@nome AND Senha=CONVERT(NVARCHAR(256), HashBytes('SHA2_256', @senha), 2) AND Status=1` retorna 1 linha; (e) Studio emite cookie `director_session` com principal `{id:<row.Id>, nome:<row.Email>, codEmpresa:1, nomeEmpresa:<row.NomeUsuario>, path:'fornecedor-aws'}` e 200. (f) Senha errada/inexistente/status=0 → resposta 401 com `{error:"invalid-credentials"}` | composição F1+F2+F15 | `AuthMiddleware.cs:60-90` + `Settings.cs:54-65` + `portal.UsuarioFornecedor.sql` |
| F22 | cast intermediário VARCHAR(256) na geração do digest | digest é determinístico para senhas só-ASCII em qualquer collation; para senhas com caracteres não-ASCII, depende do collation do banco. Smith deve preservar **exatamente** o `CAST(@senha AS VARCHAR(256))` (não trocar por `NVARCHAR` direto, não trocar por `UTF8` direto) — quebraria login para fornecedor com acento na senha sob collation Latin1 | `CAST(@senha AS VARCHAR(256))` é parte estável do hash | `Settings.cs:62` + `persistir.sql:69,114` (insert e validate usam **a mesma fórmula**, alinhamento crítico) |
| F23 | hash hex gravado em `Senha` | sempre **64 chars uppercase** `[0-9A-F]{64}` (estilo `2` do CONVERT). Smith deve gerar o hash **uppercase sem prefixo `0x`** se for fazer hash em código (TS) em vez de SQL. **Recomendação observada do legado**: sempre fazer o hash dentro do SQL (`HashBytes`) — não confiar em hash JS porque qualquer divergência de encoding quebra | `CONVERT(..., 2)` semântica | `Settings.cs:62` + `persistir.sql:69,114` |
| F24 | identity vazia ou null | F003 já lida via Zod (`min(1)`); legado: `if (user is null \|\| password is null) throw new("Credenciais inválidas")` em `AuthMiddleware.cs:43` antes do `GetIdentity`. Mensagem é literal `"Credenciais inválidas"` (não `"Login e/ou senha incorretos."`) | distinção mensagens 401 | `AuthMiddleware.cs:43` |
| F25 | identity inclui `\` E `@` (ex.: `dominio\vendedor@empresa.com`) | `IsLdapUser()` testa `User.StartsWith("processa\\")` OR `"processa.com\\"` — `dominio\vendedor@...` falha em ambos → **cai em `AuthenticateLocal`**, então `name.Contains('@')` é true → caminho fornecedor. Smith deve replicar: prefixos LDAP têm prioridade sobre `@` | `AuthMiddleware.cs:36` + `AbstractBearerAuth.cs:91-92` + `AuthMiddleware.cs:68` | composição |

## ⚠️ Inércia legada

Decisões discutíveis preservadas pelo legado. Smith **deve replicar para fidelidade** mas curator deve estar ciente.

1. **`CodEmpresa = 1` literal sentinela** — a identity de qualquer fornecedor em qualquer tenant recebe `CodEmpresa = 1`. Não há relação real com `acesso.TBempresa.DFcod_empresa`. Engines de ACL/relatório que assumem `identity.CodEmpresa` indica a empresa real do usuário **vão tratar todos os fornecedores como pertencentes à mesma empresa** — útil quando o app só vê fornecedores (todos isolados de empresa interna), perigoso quando ACL cruza com `internal-db`.
2. **`NomeEmpresa = NomeUsuario`** — campo `NomeUsuario` da tabela (nome humano do contato) é colocado no slot `NomeEmpresa` da identity. Semanticamente errado — o nome da **empresa fornecedora** está em `Fornecedores` (CSV de CNPJ) que precisa ser resolvido contra `TBfornecedor`. UI que mostra `identity.nomeEmpresa` ao usuário fornecedor está mostrando o **nome dele mesmo**, não da empresa que ele representa.
3. **SHA2_256 sem salt** — todos os fornecedores com a **mesma senha** têm o **mesmo digest** na tabela (`SELECT Senha, COUNT(*) FROM portal.UsuarioFornecedor GROUP BY Senha HAVING COUNT(*) > 1` revelaria pares de senhas idênticas). Vulnerável a rainbow tables; defesa real depende de o banco AWS não vazar.
4. **Senha gerada deterministicamente em sincronização** — `'for-' + LEFT(DFcgc, 3)` (vendedores via `sincronizar_usuarios`). Apenas **1000 combinações possíveis** (3 dígitos do CNPJ). Trivial brute-force conhecendo o algoritmo. Vide `aws_sincronizar_entidade.sql:141-212`. **Note bem**: essa senha vai pra `portal.Usuario` (tabela diferente da auth de fornecedor — vide §[[#Confusão de tabelas — Usuario vs UsuarioFornecedor]]), mas a mesma proc de sincronização também replica para `portal.UsuarioFornecedor` em alguns tenants (escavação on-prem necessária para confirmar — TBD).
5. **Sem rate-limit, sem lockout, sem audit log** — atacante pode tentar `SELECT TOP 1` da query indefinidamente. Mitigação real depende de WAF/firewall na frente do Portal AWS.
6. **Mensagem 401 genérica indistinguível** — F3/F4/F5/F9/F10 todos viram `"Login e/ou senha incorretos."` (ou pior, `"Falha na autenticação do usuário"` em exceção genérica). Operador suportando fornecedor recebe a mesma string que atacante. Smith **deve preservar mensagem genérica** para o usuário final mas pode emitir **detalhe estruturado em log interno** (e.g., `reason: "user-not-found" | "wrong-password" | "inactive-status" | "table-missing"`).
7. **`WITH(NOLOCK)` na query de auth** — dirty read. Em janela de UPDATE de senha em transação aberta, autenticação pode rejeitar a senha nova **e** rejeitar a antiga (ambas inconsistentes). Janela é curta; impacto raro mas observável.
8. **Discriminador `@` é meramente textual** — string `"@@@"` cai no caminho fornecedor. Não há validação de e-mail real. Identity malformada simplesmente não casa nenhum registro → 401. Smith pode preservar (defensável: validar e-mail no front, não no auth) ou endurecer (rejeitar identity com `@` mas sem `.` no domínio).
9. **`CAST(@senha AS VARCHAR(256))` é collation-dependente** — senha com acento gravada em collation Latin1 e validada em collation UTF8 dão digests diferentes. Tenants Processa todos parecem usar Latin1, mas é prego latente para migração futura. (F22)
10. **Hash uppercase hex sem prefixo** (`CONVERT(..., 2)`) — escolha arbitrária, mas estável: smith no Studio precisa garantir que **se for hash em JS** (alternativa a `HashBytes` no SQL), o output é `.toUpperCase()` e sem `0x`. **Recomendação**: hash no SQL como hoje, evita classe inteira de bugs.
11. **`Senha NVARCHAR(2048)` em deploys migrados** — coluna comporta string de 2048 chars, mas o conteúdo real é fixo em 64 chars. Lixo histórico do alargamento sem migração de schema canônico.
12. **`UNIQUE(email)` é case-insensitive na collation default** — `vendedor@x.com` e `Vendedor@X.COM` são considerados o mesmo registro pelo banco. Boa propriedade para auth (F19) mas pode confundir operadores que tentam cadastrar "variantes" do mesmo e-mail.
13. **Sem FK para `Fornecedores`** — CSV de CNPJs em texto. Resolução cross-base é feita em memória (`FornecedorService.ObterFornecedoresId`). Fornecedor referenciado pode ter sido deletado do ERP sem deletar o usuário-fornecedor (orfão silencioso).

## Confusão de tabelas — `portal.Usuario` vs `portal.UsuarioFornecedor`

Atenção: o banco AWS tem **DUAS tabelas distintas** de usuário, ambas com `Senha` SHA2_256:

| Aspecto | `portal.UsuarioFornecedor` | `portal.Usuario` |
|---|---|---|
| Quem é | Vendedor/representante externo de empresa-fornecedora | Administrador-empresa (usuário interno do cliente AWS, replicado do ERP via sincronização) |
| Login | E-mail (UNIQUE) | E-mail (provavelmente UNIQUE — não escavado neste contrato) |
| Cadastrado por | Operador via `portal.persistir_usuario_fornecedor` (CRUD no Director) | **Sincronização ERP→AWS** via `portal.sincronizar_usuarios` |
| Senha origem | Plaintext digitado pelo operador → SHA2_256 no INSERT | Plaintext do XML (vendedor: `'for-' + LEFT(DFcgc, 3)`; admin: senha encriptada via `dbo.fn_Decript` antes do hash) → SHA2_256 no INSERT |
| Query de auth | `Settings.AuthFornecedorAWSQuery` (este contrato — F69) | Não escavada neste contrato — provavelmente caminho separado, **possivelmente** ainda usando `AuthQuery` padrão ou query custom via Seat. **TBD em escavação futura**. |
| Tabelas relacionadas | `agent.UsuarioFornecedorDefinicao`, `agent.EquipeFornecedor`, `agent.Agendamento.CriadoPor` (FK textual por Email) | `portal.Empresa`, `portal.AdministradorEmpresa`, etc. (não escavado) |
| Discriminador no login | `identity.Contains('@')` | (mesma heurística — colisão!) |

**Implicação importante**: o discriminador `Contains('@')` no `AuthMiddleware` **não distingue** entre `portal.UsuarioFornecedor` e `portal.Usuario`. A query `AuthFornecedorAWSQuery` aponta **apenas** para `portal.UsuarioFornecedor` — então um e-mail cadastrado **apenas** em `portal.Usuario` (mas não em `portal.UsuarioFornecedor`) **falha** no caminho fornecedor-aws, retorna 401 mesmo sendo válido em outro contexto. Como `portal.Usuario` é autenticada em outro app/contexto (provavelmente o app `portal` que tem seu próprio middleware), isso é por design — mas é fonte de confusão. Smith no Studio deve **rotular o cookie/principal claramente** com `path: 'fornecedor-aws'` (já faz) para que ACL downstream saiba que `Id=5` é índice de `portal.UsuarioFornecedor`, não de `portal.Usuario` nem de `acesso.TBusuario`.

**Escavação futura sugerida**: novo contrato `processa-auth-portal-usuario.md` para cobrir `portal.Usuario` (login de admin-empresa cliente AWS) — fora do escopo de F069.

## ACL para fornecedor

O fornecedor autenticado **não tem `Grupos`** (vide F15) — não há equivalente de "grupos AD" ou "papéis" persistido na sessão do legado. A ACL é resolvida **sob demanda** em cada operação:

| Onde | Como | Vem de |
|---|---|---|
| Quais apps o fornecedor pode acessar | **Inferência implícita pelo Domain** — o `Domain` da identity (do header da request) decide qual app está consumindo. Não há cross-check explícito "fornecedor X tem permissão para app Y" no legado | `AuthMiddleware.cs:88` (`Domain = domain`) — caller decide |
| Quais fornecedores o usuário representa | `portal.UsuarioFornecedor.Fornecedores` (CSV de CNPJ) consultado **em runtime** | `FornecedorService.ObterUsuarioFornecedor(id)` |
| Quantas agendamentos pode fazer | `agent.UsuarioFornecedorDefinicao WHERE UsuarioFornecedorId = identity.Id AND Chave='qtde-agntos'` | `agent.UsuarioFornecedorDefinicao` consultada em `agent.persistir_agendamento` |
| Se número-de-pedido é obrigatório | `agent.UsuarioFornecedorDefinicao WHERE Chave='num-pedido-obrigatorio'` | idem |
| Quais equipes o fornecedor está | `agent.EquipeFornecedor WHERE FornecedorId = identity.Id` | idem |

**Para o Studio**: a "ACL fornecedor" no sentido de "quais rotas/menus mostrar" não tem fonte legada explícita — o legado simplesmente expõe um conjunto fixo de rotas para o app de fornecedor (telas de Agendamento, consulta de pedidos, etc.) e cada query downstream filtra por `identity.Id`. Smith deve garantir que o principal Studio carregue `path='fornecedor-aws'` para que a UI possa decidir "este é fornecedor → mostrar menu reduzido" — mas o **conteúdo do menu por si só** é definido pelos contratos [[acl-papel-funcao-pagina]] e [[menu-hierarquia]] (que provavelmente terão entradas seedadas para o "papel fornecedor" ou similar — escavação futura).

## Sub-contratos relacionados

- [[portal-aws-bridge]] §3 ("Login de usuário fornecedor") já mencionava este caminho em alto nível; **este contrato (F069) é a expansão detalhada** desse §3.
- [[processa-cryptography]] — NÃO é usado aqui. Fornecedor-aws faz SHA2_256 direto, sem AES.
- [[processa-auth-ldap-bridge]] — caminho **mutuamente exclusivo** (LDAP vs fornecedor decidido por presença de `\` antes de `@`).
- [[processa-auth-temp-password]] — caminho **mutuamente exclusivo** (literal `processa` desvia antes do `@` check em GetIdentity:63 → 68).

## Relações com o ecossistema

- **Consome de**: `portal.UsuarioFornecedor` (tabela única, base AWS). Sem dependências externas — query é self-contained.
- **É consumido por**:
  - `AuthMiddleware.GetIdentity` em qualquer app que embute o `Processa.Sdk.Auth` e tenha acesso à base AWS (Portal AWS hosts: `portal`, `agent`, `cotacao`; **não** `Portal.Director` on-prem direto, vide §[[#Onde mora a tabela]]).
  - Downstream pós-login: `agent.obter_dados_usuario_fornecedor_email` (preenche "Responsável" em forms de Agendamento), `agent.UsuarioFornecedorDefinicao` (configurações operacionais por fornecedor), `agent.persistir_agendamento` (cria registro com `CriadoPor = identity.Email`).
- **Procedures de cadastro/manutenção** (CRUD via UI Director):
  - `portal.obter_usuarios_fornecedores` — listagem paginada/filtrada (não autentica).
  - `portal.sp_obter_usuario_fornecedor` — detalhe por Id (não autentica).
  - `portal.persistir_usuario_fornecedor` — create/update (hash de senha aqui — fonte de truth do digest).
  - `portal.deletar_usuario_fornecedor` — delete com cascata em `agent.UsuarioFornecedorDefinicao` + `agent.EquipeFornecedor`; preserva quem tem agendamento associado (`agent.Agendamento.CriadoPor = Email`).
- **Sincronização**: `portal.sincronizar_usuarios` toca `portal.Usuario` (não `portal.UsuarioFornecedor`) — tabelas distintas, mas mesma proc de sincronização ERP→AWS pode em alguns tenants legados ter sido ajustada para também tocar `UsuarioFornecedor` (TBD em escavação on-prem).
- **F003 atual no Studio** (`workspace/director-studio/apps/api/src/routes/auth.ts:498-549`): `authenticateFornecedorAws` já implementa F1+F2 corretamente, com a query inline replicando o legado **com pequena divergência**: usa `sql.VarChar(256)` no input `@senha` (em vez de `NVARCHAR` que o legado usa via `CreateParameter`) — isso **alinha** com o `CAST(@senha AS VARCHAR(256))` do legado e portanto produz **mesmo digest** para entradas ASCII; para entradas não-ASCII a fidelidade depende do collation default do banco (F22). Asserções F1+F2+F15+F21 já são exercitáveis pelo ui-tester contra uma base com `portal.UsuarioFornecedor` populada.

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- Cliente legado **não emite JWT pós-login** — emissão de cookie de sessão é responsabilidade da camada superior; F003 já faz isso via Redis store. Comportamento legado preservado.
- A query de auth **não tem catch SQL específico** — qualquer erro de banco (tabela ausente, schema errado, timeout) sobe como exceção e o middleware traduz para 401 genérico. Studio já tem `getSchemas(pool)` que **pré-checa** presença da tabela e retorna `null` antes de tentar a query (defesa-em-profundidade adequada — F10 não precisa virar exceção).
- Smith deve passar `@senha` como `sql.VarChar(256)` (já faz em F003) — não `sql.NVarChar`. Isso **emula** o `CAST(@senha AS VARCHAR(256))` do legado em uma camada acima (cliente força tipo). Alternativa: usar `sql.NVarChar` e deixar o `CAST` interno do SQL fazer o trabalho — comportamento equivalente em ASCII.
- A resposta de 401 para todos os F3-F10 deve ser **idêntica** ao usuário final (mensagem `"Login e/ou senha incorretos."` ou similar — sem distinguir causa). Logger interno pode diferenciar (`reason: "user-not-found" | "wrong-password" | "inactive" | "table-missing" | "schema-error"`).
- O `Domain` da identity vem do body `domain` opcional do `/api/auth/login` (já em F003). Legado o lia do header `Domain` (`AuthMiddleware.cs:27`); ambos são semanticamente equivalentes.
- Indicadores observáveis para ui-tester após login bem-sucedido:
  - Cookie `director_session` setado, HttpOnly, com expiração ≥ TTL configurado.
  - GET `/api/auth/session` retorna `{id: <int registro.Id>, nome: <email>, codEmpresa: 1, nomeEmpresa: <NomeUsuario>, path: 'fornecedor-aws'}`.
  - Tentativa de senha errada → 401, sem cookie setado.
  - Tentativa com `Status=0` → 401 (indistinguível de senha errada para o ui-tester; precisa fixture no banco para forçar).

## Sources

- [[calendar/notes/2026-05-16.md]]
