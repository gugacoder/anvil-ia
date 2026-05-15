---
title: "Caminhos de autenticação Processa"
aliases: [processa-auth-paths, processa-auth-model, auth-paths]
tags: [auth, processa, sdk, ldap, jwt, ecosistema]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Caminhos de autenticação Processa

O ecossistema Processa autentica usuários por **cinco caminhos distintos**, todos roteados a partir do mesmo header `Authorization` no endpoint `/api/auth`. A lógica vive no SDK fechado-mas-aberto `Processa.Sdk.Auth` (`sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/`), centralizada em `AbstractBearerAuth.ExtractCredentials` + `AuthMiddleware.BuildPrincipal` + `LDAPAuthMiddleware.BuildPrincipal`. Todos os frontends do ecossistema (AppBuilder, Portal Director, Director.Web/WMS, ADM) seguem o mesmo modelo via `@engenharia/react-tools/AuthProvider`, que faz `btoa("[dominio|]login:senha")` e POST `/api/auth` Basic.

A descoberta-chave: **nenhum dos caminhos exige .NET local** — eles falam SQL Server local (procs cadastradas) ou HTTP contra o bridge AWS em `52.67.203.133:4306`. Isso libera implementações alternativas (Node, Go) a replicar o modelo sem rodar IIS no servidor do cliente.

## Key Points

- **Roteamento por prefixo**: `processa\\` → LDAP-bridge AWS; `@` no nome → fornecedor AWS (DB local); usuário literal `processa` → senha temporária offline; resto → DB local.
- **JWT compartilhado** assinado HMAC-SHA256 com `Consts.SecretKey` hard-coded no SDK (105 caracteres, em `Processa.Sdk.Api/Consts.cs:34`). Toda app Processa aceita o mesmo JWT.
- **LDAP nunca é direto**: o servidor do cliente fala HTTP com bridge `http://{ServidorAutenticacao}:4306/api/auth/validate`, que internamente conecta `dc1.processa.com` via `ProcessaLDAPAuth` (Novell.Directory.Ldap).
- **DB local cobre 2 dos 5 caminhos**: `AuthQuery` para usuário interno (`TBusuario` + `dbo.VALIDAR_CRIPT`), `AuthFornecedorAWSQuery` para email (`portal.UsuarioFornecedor` + `HashBytes('SHA2_256', ...)`).
- **Senha temporária `processa`** é validável offline — algoritmo baseado em substrings da `SecretKey` + timestamp, sem rede.

## Diagrama — Login híbrido (frontend → backend → DB/AWS)

```
[user]
  │ digita { dominio?, login, senha }
  ▼
[Frontend: AuthProvider]
  │ token = btoa(dominio ? `${dominio}|${login}:${senha}` : `${login}:${senha}`)
  │ GET /api/auth   Authorization: Basic <token>
  ▼
[Backend .NET — AbstractBearerAuth.ExtractCredentials]
  │ decodifica Basic → { user, pass }
  ▼
[BuildPrincipal: roteia por padrão de `user`]
  │
  ├─ "processa"          → AuthenticateTempPassword(pass)   [offline]
  ├─ "processa\\..."     → AuthenticateLdap(user, pass)     [bridge AWS]
  ├─ "...@..."           → DB local: AuthFornecedorAWSQuery
  └─ resto               → DB local: AuthQuery
  ▼
[TokenUtils.GenerateJWTToken(DirectorIdentity)]
  │ HMAC-SHA256 com Consts.SecretKey hard-coded
  ▼
[Response: { sucesso: true, dados: { ..., token: <JWT> } }]
  ▼
[Frontend]
  localStorage["@director/tkn"] = JWT
  localStorage["@director/usr"] = { id, nome, codEmpresa, ... }
  próximas requests: Authorization: Bearer <JWT>
```

## Diagrama — Cross-tenant (backend local chama bridge AWS)

```
[Backend local] precisa sincronizar / autenticar LDAP
  ▼
[Consulta acesso.TBaplicacao WHERE DFchave='portal-aws']
  │ → { DFendereco: "52.67.203.133", DFdominio: "..." }
  ▼
[Toma identity do Thread atual, troca Domain pelo do portal-aws]
  ▼
[TokenUtils.GenerateJWTToken(identity)] ← novo JWT efêmero
  ▼
[POST http://52.67.203.133:4306/api/auth/validate]
  │ Authorization: Bearer <novo-jwt>
  │ Body: Cryptography.Encrypt({ idUser, loginUser, passwordUser, validarGrupo })
  ▼
[Bridge AWS] valida JWT (mesma SecretKey) → ProcessaLDAPAuth.Login()
  │ ldap.connect("dc1.processa.com")
  │ ldap.bind("processa\\<user>", <pass>)
  │ ldap.search("DC=processa,DC=com", filter="(sAMAccountName=<user>)")
  ▼
[Response: { isAuthenticated, hasAccessToGroup, adGroups }]
```

## Details

O fluxo completo, na ordem em que o middleware decide:

```
Authorization recebido
│
├─ Bearer <jwt>
│    └─► TokenUtils.ValidateJWTToken(jwt) — HMAC-SHA256 com Consts.SecretKey
│
└─ Basic <b64> → decode "user:pass"
     │
     ├─ user == "processa"  → AuthenticateTempPassword(senha)
     │                          (TokenUtils.ValidateTempPassword: substrings(SecretKey)+timestamp)
     │
     ├─ user.StartsWith("processa\\") ou "processa.com\\"
     │    └─► AuthenticateLdap: POST http://{ServidorAutenticacao}:4306/api/auth/validate
     │                          Bearer <jwt-efêmero>  body=Cryptography.Encrypt({idUser, loginUser, passwordUser, validarGrupo})
     │                          (bridge AWS faz LDAP contra dc1.processa.com via ProcessaLDAPAuth)
     │
     ├─ user.Contains("@")  → AuthenticateLocal via Settings.AuthFornecedorAWSQuery
     │    └─► SELECT Id, Email AS Nome, 1 AS CodEmpresa, NomeUsuario AS NomeEmpresa
     │          FROM portal.UsuarioFornecedor
     │         WHERE Email=@nome AND Senha=CONVERT(NVARCHAR(256), HashBytes('SHA2_256', CAST(@senha AS VARCHAR(256))), 2)
     │           AND Status=1
     │
     └─ resto              → AuthenticateLocal via Settings.AuthQuery
          └─► SELECT DFid_usuario AS Id, DFnome_usuario AS Nome, DFcod_empresa AS CodEmpresa, ...
                FROM TBusuario JOIN TBempresa
               WHERE DFnome_usuario=@nome AND DFativo_inativo=1 AND dbo.VALIDAR_CRIPT(@senha, DFsenha)=1
```

Há uma sutileza importante entre `AuthMiddleware` e `LDAPAuthMiddleware`: o primeiro (usado em Portal, Director.Web) aceita todos os caminhos; o segundo (usado em AppBuilder, ADM) só aceita LDAP + senha temporária — usuário interno via DB é rejeitado. A escolha de qual middleware um app usa é decidida no `Program.cs` daquele app, registrando `AddTransient<AuthMiddleware>()` ou `AddTransient<LDAPAuthMiddleware>()`.

A `Consts.SecretKey` hard-coded é o nó arquitetural mais frágil: qualquer leak compromete todos os apps Processa simultaneamente, e a rotação exige redeploy coordenado de todo o ecossistema. O Studio pode optar por (a) reutilizar a SecretKey durante coexistência com .NET legado, ou (b) emitir JWT próprio com chave nova quando estiver isolado — a (b) é o destino correto, mas a (a) pode ser ponte temporária.

O bridge AWS em `:4306` aparece referenciado em `appsettings.json` como `AppSettings.ServidorAutenticacao` (geralmente `52.67.203.133`) e também é cadastrado em `acesso.TBaplicacao` com `DFchave='portal-aws'`. O mesmo IP serve como hub central de sincronização cross-tenant via `PortalAwsClient` — auth e sync compartilham infra.

## Related Concepts

- [[director-studio]] — projeto que replica os 5 caminhos em Node para eliminar .NET local
- [[acesso-metamodel]] — schema `acesso.*` que inclui `TBaplicacao` onde o bridge AWS é cadastrado
- [[appbuilder]] — usa `LDAPAuthMiddleware` (mais restritivo)
- [[director-web]] — usa `AuthMiddleware` (todos os caminhos)
- [[react-tools]] — frontend AuthProvider que monta o Basic header

## Sources

- [[calendar/notes/2026-05-15.md]] — leitura completa de `Processa.Sdk.Auth` após clonar `processa.sdk` do GitLab; localização da `SecretKey`, `AuthQuery`, `AuthFornecedorAWSQuery`; bridge AWS em `:4306`
