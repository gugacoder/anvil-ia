---
title: F044 — Sort DataGrid case-sensitivity (decisões de implementação)
tags: [effort, director-studio, F044, decisions, smith]
created: 2026-05-17
---

# F044 — Sort do DataGrid contra procs `sp_Listar_*` (e equivalentes)

## Sintoma observado (em F011 audit, C4)

`POST /api/grid/query` com `ordenacao="descricao,asc"` contra `sp_Listar_GrupoTrabalho` resulta em HTTP 500 com `Invalid column name 'descricao'`. O frontend usa `header.prop` (alias da linha = nome lowercase emitido no XML) como token de ordenação; algumas procs aceitam (literal `'descricao'` no `CASE WHEN`), outras rejeitam (dynamic SQL com `ORDER BY ' + @col` esperando o nome SQL fonte, e.g. `Descricao` ou `DFdescricao`).

## Survey das procs `_datagrid` / `consultar_` / `obter_` (portal-director SQL corpus)

Padrões encontrados nos arquivos `sources/engenharia--fabrica--sql--portal-director/**/*.sql`:

1. **CASE WHEN com literal lowercase** (dominante em `solicitacao.rebaixa`, `processa.appbuilder.mobile`):
   ```sql
   CASE WHEN @ordenacao_coluna = 'descricao' AND @ordenacao_direcao = 'asc'
        THEN DFdescricao END ASC
   ```
   Frontend manda `descricao,asc` → match direto.

2. **CASE WHEN com literal camelCase**:
   ```sql
   CASE WHEN @ordenacao_coluna = 'codPedido' AND ... THEN DFcodPedido END ASC
   CASE WHEN @ordenacao_coluna = 'codigoempresa' AND ... THEN DFcodigoEmpresa END ASC
   CASE WHEN @ordenacao_coluna = 'ncupom' AND ... THEN DFnumeroCupom END ASC
   ```
   Frontend precisa mandar exatamente a chave que o legado escolheu — o que só funciona se o autor do model declarou `header.prop="codPedido"` (não `"codpedido"`).

3. **Dynamic SQL** (não amostrado no corpus, mas inferido pelo erro de runtime `Invalid column name`): proc concatena `ORDER BY ' + @ordenacao_coluna` em `EXEC sp_executesql`. Exige o nome real da coluna SQL.

`sp_Listar_GrupoTrabalho` não está no corpus (vive apenas instalada na Area 52 `DBdirector_imperial_logistica_29`) — cai no caso (3) ou variante similar. Sem acesso à proc, **não dá pra catalogar exhaustivamente quais procs usam qual estratégia**. A solução tem que ser tolerante.

## Decisões

1. **Estratégia (a) escolhida no manifest**: normalizar `ordenacao` no backend `apps/api/src/routes/grid.ts`. Não toca nas procs do legado (opção (c) rejeitada), nem força o autor do model a aliasar todo header (opção (b) ainda é suportada como override explícito).

2. **Pipeline de resolução**:
   1. Frontend envia `body.ordenacao = "<prop>,<dir>"` + opcional `body.__sortColumnMap = { <prop>: "<sqlCol>" }` (derivado de `header.sortKey` no model).
   2. Backend (`parseOrdenacao`) tira o `prop` cru; se o map tem override, usa-o **uma única tentativa** (autor é responsável).
   3. Sem override, gera lista de variantes na ordem: `prop` → `CapitalizeFirst(prop)` → `DF<prop>` → `DF<CapitalizeFirst(prop)>`. Filtra com regex `[A-Za-z_][A-Za-z0-9_]{0,63}` (anti-injeção).
   4. `runProcWithSortRetry` chama a proc com a 1ª variante. Se falha com `Invalid column name '<X>'` onde `<X>` bate (case-insensitive) com a variante tentada, retenta com a próxima. Outros erros (timeout/perm/proc-failed) propagam imediatamente.
   5. No sucesso, devolve `sortResolution: { originalProp, resolvedColumn, dir, attempts, wasOverride }` no payload — frontend pode logar/aprender.
   6. Se esgotar variantes: HTTP 500 com mensagem explícita pedindo `header.sortKey="<col>"` ou correção da proc.

3. **Anti-injeção**: `isSafeSortToken` valida cada candidato com `/^[A-Za-z_][A-Za-z0-9_]{0,63}$/` antes de incorporá-lo em `body.ordenacao`. Direção restrita a `asc`/`desc`/`''`. Map do model também passa pelo mesmo filtro. Sem isso, `prop="x;DROP TABLE..."` viria do model não-confiável.

4. **`__sortColumnMap` prefixado por `__`**: convenção Studio para campos que o backend extrai do body **antes** de mandar pra proc. Removido com `delete procBody.__sortColumnMap` antes do `runProc`. Sem isso, o XML body conteria `<__sortColumnMap>{...}</__sortColumnMap>` que algumas procs poderiam rejeitar.

5. **Mesma normalização no `/export`**: bug de sort no CSV existia tão silenciosamente quanto no listing — `ordenacao` ia direto pra proc. Agora `/api/grid/export` usa `runProcWithSortRetry` também.

6. **Frontend** (`packages/ui/src/components/data-grid-renderer.tsx`):
   - `GridHeader.sortKey?: string` adicionado.
   - `sortColumnMap` memoizado a partir dos headers (só inclui entradas onde `sortKey !== prop`).
   - Body de fetch e export inclui `__sortColumnMap` quando presente.
   - Lógica do `sortCol/sortDir` (UI) **não muda** — continua usando `header.prop` para identificar coluna selecionada. Apenas o transporte para o backend ganha o map.

7. **Resposta `sortResolution`**: campo novo em `POST /api/grid/query`. Forma:
   ```ts
   {
     originalProp: string | null,
     resolvedColumn: string | null,
     dir: 'asc' | 'desc' | '',
     attempts: string[],   // variantes tentadas, em ordem
     wasOverride: boolean, // true se veio do __sortColumnMap
   }
   ```
   Frontend nesta wave não consome (decisão: nenhum efeito visual). Disponível para logging/debug e para uma feature derivada futura (auto-popular `sortKey` ao detectar resolução heurística repetida).

## Heurística vs lookup do `header[].DFchave`

A DoD original mencionava "Map vem de `model.config.colunas[].DFchave` se exposto". Nos models de produção lidos no corpus (e.g. `model.consultar_agendamento.sql`, `model.fusion_pedidos.sql`), os headers JSON expõem `prop` e `label` — não há campo `DFchave` no nó `datagrid.headers[]`. Isso é refletido no contrato `[[model-valor-datagrid]]` §Header (tabela canônica não tem `DFchave`). Logo:

- O caminho do "model autor" precisa de um **novo campo** no schema do header — `sortKey` (escolhido). Não-existente no legado.
- Para os models legados (que não vão receber `sortKey`), a heurística é o único caminho. Cobre case (1) acima (prop bate com literal lowercase) trivialmente; cobre caso (2) e (3) via retry de variantes.

## Smoke (probe-f044.ts)

Script `apps/api/src/scripts/probe-f044.ts` exercita 5 cenários contra a API rodando + Area 52:

1. `sort by descricao (heuristic)` — sem `__sortColumnMap`, espera que backend resolva. Se proc aceitar `descricao`, attempts=[descricao] resolved=descricao. Se proc rejeitar e aceitar `Descricao`, attempts=[descricao, Descricao] resolved=Descricao.
2. `sort by id (heuristic)` — caso especialmente sensível porque a coluna SQL fonte é `DFid_grupo_trabalho` (legado), mas o alias é `Id`. Cobre o caminho `id → Id`.
3. `sort by ativo_inativo (heuristic)` — testa `_` no nome (capitalize só sobe a primeira letra: `Ativo_inativo`).
4. `sort by descricao (sortKey=Descricao)` — caminho do model autor: backend usa override sem retry.
5. `no sort` — sanity. Garante que `,,` continua funcionando.

Pré-req: `$DIRECTOR_SESSION_COOKIE` setado, ou `$PROBE_USER`/`$PROBE_PASS` para auto-login.

Saída: tabela com PASS/FAIL + `sortResolution.attempts` por cenário.

## Limites conhecidos

- **Snake_case lower em prop com underscores**: `ativo_inativo` → variantes geradas: `ativo_inativo`, `Ativo_inativo`, `DFativo_inativo`, `DFAtivo_inativo`. Não cobre `AtivoInativo` (PascalCase) nem `DFAtivoInativo`. Se alguma proc usar essa convenção, autor declara `sortKey="AtivoInativo"`.
- **Caso (2) puro** (proc com literal camelCase no CASE WHEN tipo `'codPedido'`): heurística não ajuda — proc espera EXATAMENTE `'codPedido'`, mas frontend manda o `prop` do header (que normalmente já é `codPedido` em CamelCase quando o autor do model declarou assim). Aqui não há bug: o frontend usa `prop` como veio do model. F044 cobre o caso em que `prop` lowercase do model precisa virar CamelCase na proc — não o inverso.
- **Outros idiomas no erro do SQL Server**: `extractInvalidColumnFromError` captura `Invalid column name '...'` (en) e `Nome de coluna '...' inválido` (pt-BR). Outros idiomas → retry não dispara, propaga erro 500 com mensagem original.
- **Performance**: retry adiciona 1 round-trip por variante rejeitada. Pior caso (4 variantes) = 4 chamadas à proc. Aceitável para sort ad-hoc (raro em produção); se virasse hot-path, dá pra cachear `prop → resolvedColumn` por proc.

## Arquivos tocados

- **Editados**:
  - `workspace/director-studio/apps/api/src/routes/grid.ts` — adiciona `parseOrdenacao`, `buildSortVariants`, `extractInvalidColumnFromError`, `runProcWithSortRetry`; integra em `/query` e `/export`.
  - `workspace/director-studio/packages/ui/src/components/data-grid-renderer.tsx` — adiciona `GridHeader.sortKey`, memoiza `sortColumnMap` e inclui `__sortColumnMap` no body de fetch e export.
  - `mind/atlas/concepts/legacy-contracts/model-valor-datagrid.md` — anota F044 em §Request (`ordenacao`) e §Header (`sortKey` novo, Studio-only).

- **Novos**:
  - `workspace/director-studio/apps/api/src/scripts/probe-f044.ts` — probe smoke contra Area 52.
  - `mind/effort/on/director-studio/backlog/F044-decisions.md` — este arquivo.

## Aberto / followups

- Frontend consumir `sortResolution.attempts` para detectar resolução heurística e sugerir ao autor declarar `sortKey` (telemetria opt-in).
- Cache backend de resolução por proc+prop para encurtar retry depois da 1ª resolução com sucesso.
- Survey runtime na Area 52 (precisa de DBA): rodar `SELECT name FROM sys.procedures WHERE name LIKE 'sp_Listar_%' OR name LIKE 'sp_listar_%'` e categorizar cada uma como (1)/(2)/(3) acima — material para um sub-contrato `sp-listar-conventions.md` futuro.
