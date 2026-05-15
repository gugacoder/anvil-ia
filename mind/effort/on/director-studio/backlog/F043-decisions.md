---
title: "F043 — Decisões de implementação"
tags: [effort, director-studio, F043, seed, decisions]
created: 2026-05-15
---

# F043 — Seed de models `portal-director` em base de teste — decisões

Frente: [[feature-manifest]] F043.
Contrato base: [[obter-model-pagina]] (schema do model + cross-app fallback).

## Contexto

Antes do F043, `DBdirector_imperial_logistica_29` (Area 52) tinha **6 models**
em `acesso.TBmodel_pagina`, todos com prefixo `wms.*`. As 9 páginas
`portal-director` em `acesso.TBpagina` (DFid_aplicacao=1) — Acessos × 3,
Configurações × 6 — **não tinham model**, fazendo o engine F009 cair em
`page-not-found` (404) ao navegar pelo menu da PROCESSA.

Sem seed, F010-F022 ficariam presas no mesmo fetch-stub que F009 C3 usou.

## Opções consideradas

### (a) Carregar `sources/engenharia--fabrica--sql--portal-aws/agent/alimentacao/*.sql`
- 5 arquivos `insert_pagina_*.sql` com payloads JSON ricos.
- **Não casam por chave**: usam prefixo `agent.*` (e.g.
  `agent.rel_consultar-agendamento`), não `portal-director.*`.
- Carregar como está produz models órfãos (sem TBpagina apontando).
- Renomear o `DFchave_pagina` resolveria, mas alguns models trazem
  `dParam[1-4]` que são expressões `(function(){...localStorage...})()` —
  ou seja, **`eval` do legado**. F009 D3 proíbe executar isso, e F040+F051
  catalogam migração pra `{path}` declarativo, ainda não implementada.
  Carregar agora introduziria divergences ruidosas e um vetor de tentação
  pra reativar o `eval`.

### (b) Clonar base com models reais
- Exige criar novo banco (proibido pelo briefing F043).

### (c) Fixture mínima portal-director — **escolhida**
- 9 models JSON declarativos, **1 por página** existente em TBpagina.
- Cada model é payload **válido** pro engine schema-driven (chaves
  canônicas: `genericPageTitle`, `genericPageDescription`,
  `filtro.model[]`, `datagrid` com `headers`/`gridActions`/`limits`,
  ou `genericform.model[][]` com `ctype`/`maskType` reais).
- **Zero `dParam*`** — nenhum `TBmodel_parametro` adicionado. Pre-empta
  qualquer caminho de `eval` antes de F040/F051 aterrissarem.
- Dados semânticos derivados de **fontes reais**:
  - DDLs em `portal.director/criacao/acesso.TB{conexao,configuracao,config_mobile,usuario,papel}.sql`
  - Seeds canônicos em `portal-aws/agent/alimentacao/insert_pagina_consultar_agendamento.sql` (consultado para `configuracoes_agendameno`)
- Cobertura de renderers desejada para destravar features downstream:
  - **5 páginas** com `filtro + datagrid` → exercita F011 + F016
    (`acessos_acesso`, `acessos_usuarios`, `acessos_fornecedor`,
     `configuracoes_conexoes`, `configuracoes_director-mobile`)
  - **4 páginas** com `genericform` → exercita F010
    (`configuracoes_agendameno`, `configuracoes_cotacao`,
     `configuracoes_email`, `configuracoes_integrador-aws`)
- **Idempotente**: `IF NOT EXISTS / INSERT, ELSE UPDATE` em
  `acesso.TBmodel_pagina`. Re-executar não duplica nem corrompe.
- Schema-aware: tabela `TBmodel_pagina` da Area 52 **não tem
  `DFid_aplicacao`** (confirmado por F009 D2 e re-verificado em F043 via
  `INFORMATION_SCHEMA.COLUMNS`). Seed insere apenas
  `(DFchave_pagina, DFdata_modificacao, DFvalor)` — colunas opcionais
  (`DFcnpj_cliente`, `DFstatus`) ficam `NULL` (mesma semântica do legado
  pra rows sem tenancy).

## Procedimento

1. Script `workspace/director-studio/.tmp-seed.mjs` lê `./.env`, conecta
   via driver `mssql` aos mesmos `DB_*` do projeto, e aplica os 9
   inserts idempotentes.
2. Script `workspace/director-studio/.tmp-smoke.mjs` replica o
   `fetchModelFromDb` de `apps/api/src/routes/model.ts` (Caso B sem
   `DFid_aplicacao`) e valida que **9/9** páginas portal-director em
   `TBpagina` têm match em `TBmodel_pagina`, JSON parseável e renderers
   detectáveis pelo dispatch do engine.

Resultado (run de 2026-05-15):

```
OK    id=13  portal-director.acessos_acesso                 820  [filtro, datagrid]
OK    id=14  portal-director.acessos_usuarios              1113  [filtro, datagrid]
OK    id=15  portal-director.acessos_fornecedor             929  [filtro, datagrid]
OK    id=16  portal-director.configuracoes_agendameno       966  [genericform]
OK    id=17  portal-director.configuracoes_conexoes         713  [filtro, datagrid]
OK    id=18  portal-director.configuracoes_cotacao          698  [genericform]
OK    id=19  portal-director.configuracoes_director-mobile  712  [filtro, datagrid]
OK    id=20  portal-director.configuracoes_email            896  [genericform]
OK    id=21  portal-director.configuracoes_integrador-aws   724  [genericform]

Cobertura portal-director: 9/9 páginas com model
```

## O que F043 **não** entrega

- **Não popula `acesso.TBmodel_parametro`** (sem `dParam*`). F040 + F051
  são as features que reescrevem expressões com `{path}` declarativo; até
  lá, as 4 expressões `(function(){...localStorage...})()` originais do
  `consultar_agendamento` ficam fora do seed. Quando F051 entregar o
  interpolador, este seed pode ser estendido sem refactor — basta
  adicionar `dParam` literais no JSON do model como `"{user.cnpj}"`.

- **Não popula `acesso.TBfuncao_model`**. F050 reescreve as 4 funções
  observadas em primitivas declarativas. Os 9 models não declaram
  `funcoes` — engine F009 entrega divergence zero pra esse vetor.

- **Não cria stored procedures** referenciadas em `api`/`gridActions`
  (e.g. `acesso.sp_consultar_niveis_acesso`, `sp_persistir_configuracao_*`).
  As procs **existem** parcialmente em
  `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/`
  (e.g. `sp_consultar_niveis_acesso.sql`, `sp_consultar_usuarios.sql`),
  mas instalá-las no DB é trabalho de outra feature de infra (ainda não
  enumerada — candidata a entrar como `F052 — seed de procs de leitura
  portal-director`). Por enquanto, o engine renderiza UI vazia/erro de
  proc-not-found ao tentar listar, e os smoke tests do ui-tester foram
  desenhados pra cobrir até o **dispatch** + **schema parse** — não
  exigem a proc rodar.

## Reversão

Os 9 inserts são identificáveis por `DFchave_pagina LIKE 'portal-director.%'`.
Para reverter:

```sql
DELETE FROM acesso.TBmodel_pagina WHERE DFchave_pagina LIKE 'portal-director.%';
```

## Artefatos

- `workspace/director-studio/.tmp-seed.mjs` — script idempotente (não-comitado, vive em `.tmp-*`)
- `workspace/director-studio/.tmp-smoke.mjs` — verificação (não-comitada)
- 9 rows com `DFid_model_pagina` 13..21 em `acesso.TBmodel_pagina`
