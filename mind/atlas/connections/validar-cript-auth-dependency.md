---
title: "Connection: Validar_Cript e Auth Path 5 (usuário interno)"
connects:
  - "concepts/validar-cript"
  - "concepts/processa-auth-paths"
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-19
updated: 2026-05-19
---

# Connection: Validar_Cript e Auth Path 5 (usuário interno)

## The Connection

O caminho de autenticação para **usuários internos** do Director ERP (path 5 do [[processa-auth-paths]] — "resto" que não é LDAP, não é email, não é `processa`) depende diretamente de [[validar-cript]], a função XOR scramble reversível de 2011. A query `AuthQuery` em `Settings.cs` termina com `(SELECT dbo.VALIDAR_CRIPT(@senha, DFsenha)) = 1` — sem essa função, o login de usuários internos simplesmente não funciona.

## Key Insight

O auth path mais comum em instalações do Director (login local por nome de usuário + senha) depende de criptografia **reversível** sem salt. Isso cria uma cadeia de fragilidade: qualquer acesso de leitura ao banco (DBA, backup, SQL injection) compromete **todas** as credenciais de todos os usuários internos, porque `dbo.fn_Decript` reverte qualquer senha armazenada para plaintext com um simples SELECT.

O [[director-studio]] herda essa dependência durante a fase de coexistência: precisa chamar `VALIDAR_CRIPT` para autenticar usuários existentes. A migração para hashing moderno (bcrypt/argon2) é bloqueada até o cutover completo, porque o legado .NET continuará usando `VALIDAR_CRIPT` em paralelo. A janela de risco é: do primeiro deploy do Studio até o desligamento do último serviço .NET.

## Evidence

- `AuthQuery` canônico em `Processa.Sdk.Api/Settings.cs:42-51` inclui `dbo.VALIDAR_CRIPT(@senha, DFsenha)` como cláusula WHERE.
- `dbo.fn_Decript` existe como função pública no `DBdirector` — testado com round-trip `VALIDAR_CRIPT(fn_Decript(DFsenha), DFsenha) = 1` na base `DBdirector_imperial_logistica_29`.
- Senha seed do admin PROCESSA (id=1) = `99`, extraída via `fn_Decript` durante desbloqueio de F003 (2026-05-15).
- Studio implementou schema-aware probe (`INFORMATION_SCHEMA` com fallback `acesso→dbo`) que localiza `TBusuario` no schema correto e invoca `VALIDAR_CRIPT` do `dbo`.

## Related Concepts

- [[concepts/validar-cript]] — a função XOR reversível
- [[concepts/processa-auth-paths]] — os 5 caminhos de auth, path 5 depende de VALIDAR_CRIPT
- [[concepts/director-studio]] — herda a dependência durante coexistência
- [[concepts/dbdirector]] — banco onde ambas as funções vivem
