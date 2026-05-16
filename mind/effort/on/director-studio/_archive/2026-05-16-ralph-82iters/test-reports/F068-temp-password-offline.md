# Test report — F068 Temp password offline

**Data**: 2026-05-16
**Resultado**: pass
**Ambiente**: localhost:3001 (API) / localhost:3000 (frontend)
**Caso real testado**: senha temporária gerada com algoritmo legado-fiel a partir de `STUDIO_AWS_JWT_SECRET` real (.env), identity `processa` (super-user sentinela).

## Casos cobertos

| #  | Cenário                                          | Esperado (contrato)                          | Observado                                                                 | Resultado |
|----|--------------------------------------------------|----------------------------------------------|---------------------------------------------------------------------------|-----------|
| T1a | login identity="PROCESSA" + senha válida        | 200, user.nome="processa", path=temp-password | 200 `{nome:"processa",codEmpresa:1,nomeEmpresa:"Processa",path:"temp-password"}` | pass |
| T1b | identity="Processa"                              | idem                                         | idem                                                                      | pass |
| T1c | identity="processa"                              | idem                                         | idem                                                                      | pass |
| T3/T7 | round-trip salt b64-interno + sentinela       | login válido com user normalizado            | confirmado em T1a/b/c                                                     | pass |
| T4 | senha gerada com HOURS=0, aguarda 3s             | 401 invalid-credentials                      | 401 `{ok:false,error:"invalid-credentials"}`                              | pass |
| T5 | salt sobrescrito por "zzzzzzzzz" (fora SecretKey)| 401 invalid-credentials                      | 401 `{ok:false,error:"invalid-credentials"}`                              | pass |
| T6/T20 | password="not-a-valid-base64!@#$%"          | 401, sem stack trace                         | 401 `{ok:false,error:"invalid-credentials"}`, sem 500                     | pass |
| Round-trip sessão | login → cookie → GET /api/auth/me     | session válida com path=temp-password        | cookie `director_session` setado; `/me` retorna `path:"temp-password"`, `loginAt` recém-criado | pass |

## Evidência

- Senha válida exemplo: `VVdWV2NuaHhhSkVZT0JyMjAyNi0wNS0xNyAwNToxNzo0Ng==` (expira 2026-05-17 05:17:46) — 200 em três variações de caixa.
- Senha expirada `VDFKdVFtSnNhSkVZT0JyMjAyNi0wNS0xNyAwNToxODo0MQ==` regenerada com HOURS=0 — 401 após 3s.
- Tampered salt: `enp6enp6enp6SkVZT0JyMjAyNi0wNS0xNyAwNToxODo0MQ==` (primeiros 9 chars→"zzzzzzzzz", sem match em SecretKey[0..99]) — 401.
- Cookie de sessão emitido após login (`director_session=9uD23_G7…`) consumido com sucesso por `/api/auth/me`.

## Notas

- Browser MCP não disponível nesta sessão (extensão Chrome offline). Vibe-check visual foi substituído por round-trip de API equivalente (login → /me com cookie). O contrato é puramente backend; layer visual de "processa via temp-password" no sidebar é cosmético e fora do escopo de F068.
- API `/api/areas` retorna 404 — feature `/areas` não implementada ainda, fora do escopo de F068.
- Script gerador legado-fiel criado em `.tmp-F068-gen.mjs` (com camada base64-interna do salt) e removido após teste; NÃO foi commitado nem persistiu SecretKey.

## Próxima ação

pass → curator aceita.
