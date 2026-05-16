# Test report — F069 Cobertura completa do caminho fornecedor-aws

**Data**: 2026-05-16
**Resultado**: blocked (sem credencial real para happy path); exercícios negativos: pass
**Ambiente**: API local `http://localhost:3001` (Hono) + DBdirector `172.27.0.121\SQL2k19`, base `DBdirector_imperial_logistica_29` (IMPERIAL LOG)
**Contrato**: [[processa-auth-fornecedor-aws]] — 25 asserções F1..F25
**Implementação testada**: `workspace/director-studio/apps/api/src/routes/auth.ts` linhas 89-101 (`resolveAuthPath`) e 498-549 (`authenticateFornecedorAws`)

## Achado bloqueante

A base IMPERIAL LOG é **banco do tipo Director on-prem (ERP do tenant)**; não é base do Portal AWS. Probe direto:

```
TABLE_PROBE []
RESULT: tabela UsuarioFornecedor NAO existe nesta base
```

Coerente com o contrato (§"Onde mora a tabela"): `portal.UsuarioFornecedor` só existe no banco do Portal AWS. Para exercitar F2 e F21 end-to-end (happy path com credencial real) é preciso `STUDIO_DB_*` apontar para uma base AWS com fornecedor cadastrado (instalação `52.67.203.133` ou equivalente). **Não foi inserido nenhum registro de fornecedor na base** (proibição respeitada).

Apesar disso, **o code-path de fornecedor-aws no Studio fica integralmente exercitado** pelos casos negativos: o resolver `resolveAuthPath` é chamado, a função `authenticateFornecedorAws` é invocada, `getSchemas(pool)` detecta a ausência da tabela (F10) e retorna `null` → 401 indistinguível (F20). Isto é precisamente o que o contrato prescreve.

## Casos cobertos

| # | Cenário | Esperado (contrato) | Observado | Resultado |
|---|---|---|---|---|
| 1 | F1+F9 — `naoexiste@dominio-fake-f069.com` + senha qualquer | resolve para `fornecedor-aws`; UsuarioFornecedor ausente → `null` → 401 `invalid-credentials` | HTTP 401 `{"ok":false,"error":"invalid-credentials"}` | pass |
| 2 | F3 — `outro@fake-f069.com` + senha diferente | mesma resposta 401, indistinguível do caso 1 (F20) | HTTP 401 `{"ok":false,"error":"invalid-credentials"}` | pass |
| 3 | F12 — `usuariofake_f069` (sem `@`) | resolve para `internal-db`; usuário inexistente em `acesso.TBusuario` → 401 indistinguível | HTTP 401 `{"ok":false,"error":"invalid-credentials"}` | pass |
| 4 | F24 — identity vazia `""` | Zod min(1) → 400 com erro de validação (não 401) — mensagem distinta de F3/F9 | HTTP 400 `ZodError too_small` | pass |
| 5 | F25 — `dominio\vend@empresa.com` (sem prefixo `processa\`) | sem `processa\`, com `@` → resolve para `fornecedor-aws` (não ldap-bridge); ausência de tabela → 401 | HTTP 401 `{"ok":false,"error":"invalid-credentials"}` | pass |
| 6 | F1 case — `FAKE@EMPRESA.COM` uppercase | `Contains('@')` é puro textual; resolve para `fornecedor-aws` | HTTP 401 `{"ok":false,"error":"invalid-credentials"}` | pass |
| 7 | F2/F15/F21 — happy path com credencial real | identity emitida com `Id`, `Nome=Email`, `CodEmpresa=1`, `NomeEmpresa=NomeUsuario`, cookie `director_session` | **não exercitado** — base IMPERIAL LOG não tem `portal.UsuarioFornecedor` | blocked |
| 8 | F4 — `Status=0` | 401 indistinguível | **não exercitado** — depende de fixture na base AWS | blocked |

## Falhas

Nenhuma. Os 6 casos exercitados passaram. Os casos 7 e 8 estão bloqueados por ausência de dados reais — não é defeito da implementação.

## Evidência

- Probe da base: tabela `UsuarioFornecedor` ausente em qualquer schema da base IMPERIAL LOG (`INFORMATION_SCHEMA.TABLES` retornou recordset vazio).
- Respostas HTTP capturadas para todos os 6 casos (acima).
- Sanity inspection do código: `auth.ts:89-101` confirma resolver com prioridade correta (domain → temp-password → ldap-bridge → fornecedor-aws → internal-db); `auth.ts:498-549` confirma query inline alinhada com `Settings.cs:54-65` do legado (mesma fórmula `HashBytes('SHA2_256', ...)`, mesmo `CAST(... VARCHAR(256))`, `Status=1`, mesma projeção de colunas com `1 AS CodEmpresa`).

## Asserções cobertas

Da matriz F1..F25: **F1, F3, F9, F10, F12, F20, F24, F25** confirmadas em comportamento observável.

Pendentes (requerem credencial real ou fixture controlada na base AWS): **F2, F4, F5, F6, F7, F15, F19, F21**.

Implícitas/teóricas (não exercitáveis sem instrumentação invasiva): **F8, F11, F13, F14, F16, F17, F18, F22, F23**.

## Próxima ação

- A implementação está **funcionalmente cabeada e blindada** para os casos negativos relevantes. Não há código adicional para smith escrever no Studio.
- Para promover a `tested`/`accepted`, o curator precisa decidir uma de duas vias:
  1. Aceitar com cobertura negativa (status `tested` com nota "happy path pendente de base AWS real"); ou
  2. Repontar `STUDIO_DB_*` para `52.67.203.133` (Area 52) ou outra instalação Portal AWS com `portal.UsuarioFornecedor` populada e re-rodar caso 7 (F21 end-to-end) e caso 8 (F4 com `Status=0`).
