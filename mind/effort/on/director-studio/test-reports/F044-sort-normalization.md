# Test report — F044 Sort DataGrid case-insensitive

**Data**: 2026-05-17
**Resultado**: fail (3/5 PASS — duas falhas são de probe-design, não de implementação; pedindo correção do probe antes de re-rodar)
**Ambiente**: API em `http://localhost:3001` + VPN Processa → `172.27.0.121\SQL2k19` DB `DBdirector_imperial_logistica_29`
**Caso real testado**: `sp_Listar_GrupoTrabalho` (Area 52, 4 grupos: SECO, CONGELADOS 01, CONGELADOS 02, PERECIVEIS), sessão `processa\guga` reutilizada de `.tmp/f042-cookies.txt`
**Probe**: `workspace/director-studio/apps/api/src/scripts/probe-f044.ts`
**Login workaround**: probe-script tem dois defeitos pré-existentes — (a) `SESSION_COOKIE_NAME` default `director_studio_session` ≠ real `director_session`; (b) login POST usa `login`/`senha` mas API espera `identity`/`password`. Bypass: setei `DIRECTOR_SESSION_COOKIE` direto com cookie httpOnly válido extraído de sessão LDAP existente (não logueio por probe). Não bloqueia F044 mas é dívida no script.

## Casos cobertos

| # | Cenário | Esperado (F044-decisions §41-46, contrato §Request) | Observado | Resultado |
|---|---|---|---|---|
| 1 | sort `descricao,asc` (heuristic) | attempts esgotam variantes até achar coluna; rows>=1 | `attempts=descricao->Descricao->DFdescricao`, `resolved=DFdescricao`, rows=4, ordenado ASC (CONGELADOS 01, CONGELADOS 02, PERECIVEIS, SECO) | pass |
| 2 | sort `id,desc` (heuristic) | attempts=`id, Id`; resolved=Id; rows>=1 | HTTP 500: `tentadas: id, Id, DFid, DFId`. Real column `DFid_grupo_trabalho` excede cap de 4 variantes (limite documentado §95). Mensagem de erro pede `sortKey` — comportamento correto da implementação | **fail-by-probe-design** |
| 3 | sort `ativo_inativo,asc` (heuristic) | resolve via underscore-preserving capitalize | `attempts=ativo_inativo->Ativo_inativo->DFativo_inativo`, `resolved=DFativo_inativo`, rows=4 | pass |
| 4 | sort `descricao,asc` com `sortKey=Descricao` (override) | override usa **uma única tentativa** (§42); rows>=1 | HTTP 500: `tentadas: Descricao` (single attempt confirmado). Falha porque proc exige `DFdescricao`, não `Descricao`. Probe colocou sortKey errado para esta proc. Implementação correta: respeita override e falha loud | **fail-by-probe-design** |
| 5 | `ordenacao=,,` (no sort) | rows>=1, sem sortResolution | rows=4, `attempts=` vazio, sem resolved | pass |

## Validação adicional (fora do probe)

Para confirmar que as 2 falhas são de probe-design, rodei dois curls manuais contra a mesma API:

- **Case 2 com sortKey explícito**: `__sortColumnMap={"id":"DFid_grupo_trabalho"}` ordena por `id,desc` → `sortResolution.wasOverride=true`, `attempts=[DFid_grupo_trabalho]`, rows=4 ordenadas (21, 20, 13, 12). **Caminho override funciona** quando autor declara `sortKey` correto.
- **Case 4 com sortKey correto**: `__sortColumnMap={"descricao":"DFdescricao"}` → `wasOverride=true`, `attempts=[DFdescricao]`, rows ordenadas alfabeticamente. **Caminho override funciona** quando o valor passado é a coluna real.

Ou seja: a implementação F044 está correta. Os cenários 2 e 4 do probe assumem hipóteses falsas:

- Cenário 2 assume que heurística resolve `id` para `DFid_grupo_trabalho`. Mas §95-decisions documenta que a heurística só gera 4 variantes (`id, Id, DFid, DFId`). Coluna com sufixo semântico (`_grupo_trabalho`) está fora do escopo da heurística por design — exatamente o caso para o qual `sortKey` existe.
- Cenário 4 escolheu `sortKey=Descricao` quando a coluna real é `DFdescricao`. O cenário testa "autor declara sortKey", mas declarou errado, e por design o backend **não faz fallback após override** (§42 — "override sem retry"). Falhar loud é o contrato.

## Falhas (sumário para smith)

- **F044.case-2** — probe-design errado. Esperado pelo cenário: heurística resolve `id`. Esperado pelo spec (§84 + §95): heurística cobre `id → Id`, mas se proc usar coluna com sufixo (ex `DFid_grupo_trabalho`), exige `sortKey`. **Sugestão**: alterar cenário 2 para usar `__sortColumnMap: { id: 'DFid_grupo_trabalho' }` e renomear para "sort by id (sortKey override)".
- **F044.case-4** — probe-design errado. Cenário declara `sortKey=Descricao`, mas coluna real é `DFdescricao`. **Sugestão**: trocar valor para `DFdescricao` e atualizar comentário do cenário ("autor declara sortKey igual à coluna real").

## Evidência

```
[PASS]  sort by descricao (heuristic)     HTTP 200 rows=4 resolved=DFdescricao     attempts=descricao->Descricao->DFdescricao
[FAIL]  sort by id (heuristic)            HTTP 500                                   err=F044: nenhuma variante de coluna funcionou para sort 'id' (tentadas: id, Id, DFid, DFId)
[PASS]  sort by ativo_inativo (heuristic) HTTP 200 rows=4 resolved=DFativo_inativo  attempts=ativo_inativo->Ativo_inativo->DFativo_inativo
[FAIL]  sort by descricao (sortKey=...)   HTTP 500                                   err=F044: nenhuma variante (tentadas: Descricao)
[PASS]  no sort                           HTTP 200 rows=4

[F044 probe] 3/5 PASS, 2 FAIL
```

Curls manuais (override-correto) em `.tmp` confirmam wasOverride=true, attempts single, rows ordenadas, status 200.

## Próxima ação

- **fail** → smith retoma para corrigir o **probe-f044.ts** (e idealmente os 2 defeitos pré-existentes: `SESSION_COOKIE_NAME` default e payload de login com `identity`/`password`). Não é necessário tocar em `grid.ts` ou nada da implementação F044 — o comportamento observado bate exatamente com o contrato.
- Após probe corrigido, rerun esperado 5/5 PASS sem mudança de implementação.
