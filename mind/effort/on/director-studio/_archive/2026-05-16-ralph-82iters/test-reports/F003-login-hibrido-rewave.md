---
title: "F003 — Login híbrido (re-wave C4/C5)"
date: 2026-05-15
tested-by: ui-tester
result: fail
---

# Test report — F003 Login híbrido (re-execução C4/C5)

**Data**: 2026-05-15
**Resultado**: **fail** (C4 blocked-by-data, C5 fail)
**Ambiente**: localhost — web 3002, api 3001 (proxy 3000 ocupado por outro vite, mas API direta + vite proxy do web funcionam)
**Caso real**: `DBdirector_imperial_logistica_29` em `172.27.0.121\SQL2k19` (VPN Processa reconectada, `Test-Connection` true).

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| C4 | identity+senha real do `.env` → 200 + cookie + `/me` ok + redirect `/app` | usuário `sl`/`123` autentica via `acesso.TBusuario` | (a) query falha com `Invalid object name 'acesso.TBusuario'`; (b) `sl/123` não existe como `TBusuario.DFnome_usuario` ativo neste banco — é a credencial de SQL Server login | **fail / blocked-by-data** |
| C5 | identity real + senha errada → 401 + InlineAlert "usuário ou senha inválidos" | resolveAuthPath → `internal-db` → `authenticateInternalDb` retorna `null` → 401 | **500** com `{"ok":false,"error":"server-error","message":"Invalid object name 'acesso.TBusuario'."}` | **fail** |

## Evidências

### C4 — login real

```
POST http://localhost:3001/api/auth/login
{"identity":"sl","password":"123"}
→ HTTP/1.1 500
{"ok":false,"error":"server-error","message":"Invalid object name 'acesso.TBusuario'."}
```

Via vite proxy (3002): mesmo resultado.

### Introspecção do schema real do banco

Probe direto na instância via `mssql` (script descartado após uso):

- `INFORMATION_SCHEMA.TABLES` confirma: `TBusuario` e `TBempresa` existem **apenas em `dbo`**, não em `acesso`.
- Schemas existentes incluem `acesso`, `appbuilder`, `dbo`, mas `acesso` possui apenas `TBconexao_usuario`, `TBpapel_usuario_empresa` — não `TBusuario`.
- Usuários ativos amostrados em `dbo.TBusuario`: `PROCESSA`, `BRUNO SANTOS`, `JULIANALOUREIRO` (todos `DFcod_empresa=1`).
- Query do contrato adaptada para `dbo` + `sl`/`123` retorna 0 linhas → `sl/123` NÃO é credencial de TBusuario; é o login SQL Server registrado no setup wizard.

### C5 — credencial inválida

```
POST http://localhost:3001/api/auth/login
{"identity":"PROCESSA","password":"wrongpassword"}
→ HTTP/1.1 500   (esperado: 401)
{"ok":false,"error":"server-error","message":"Invalid object name 'acesso.TBusuario'."}
```

A condição "senha errada → 401" não pode ser observada porque a query nunca executa: SQL Server aborta com `Invalid object name` antes de chegar ao `dbo.VALIDAR_CRIPT`.

## Diagnóstico

Duas falhas independentes precisam ser tratadas pelo curator/archaeologist + smith:

1. **Schema do `auth.ts` está rígido em `acesso.*`.** O contrato `processa-auth-paths` foi extraído do `processa.sdk/AuthQuery.cs`, que usa `acesso.TBusuario`. No entanto, a instância real `DBdirector_imperial_logistica_29` (a "Área 52" combinada para a wave) mantém essas tabelas em `dbo`. Possíveis caminhos:
   - **Contrato precisa de revisão**: archaeologist confirma se o legado de produção usa de fato `acesso.*` (talvez via synonym, ou em outras instalações) ou se `dbo.*` é o canônico. Provavelmente as duas formas existem entre instalações distintas — a implementação deve ser **schema-aware** (config ou descoberta via `INFORMATION_SCHEMA`).
   - **Ou**: configurar `DB_SCHEMA` no `.env` (default `dbo`, com `acesso` opcional) e parametrizar as queries.

2. **Credencial do `.env` (`sl`/`123`) é login SQL, não usuário do app.** O setup wizard F001 grava o login que conecta ao SQL Server, mas o contrato C4 exige credencial de `TBusuario`. Não há, hoje, no fluxo combinado, uma credencial de aplicação real combinada para teste. Opções:
   - Curator combina com Processa uma credencial de teste de `TBusuario` em `DBdirector_imperial_logistica_29` (ex.: usuário `PROCESSA` com senha conhecida) e armazena fora do `.env` (test fixtures separado).
   - Ou ui-tester recebe a senha por canal lateral apenas durante a sessão de teste.

## Próxima ação

- **fail** — smith retoma F003 para corrigir o schema rígido (1) e aguardar combinação de credencial real (2).
- Manifest: `Tested` permanece `—` para F003.
- progress: linha `fail` registrada.

## Status final

- C4: fail (blocked-by-data + schema bug)
- C5: fail (schema bug mascara o 401)
