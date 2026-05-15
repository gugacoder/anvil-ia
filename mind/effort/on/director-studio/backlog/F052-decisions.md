---
title: "F052 — Decisões de implementação"
tags: [effort, director-studio, F052, seed, decisions, sql, procs]
created: 2026-05-15
---

# F052 — Seed de stored procedures `portal-director` em base de teste — decisões

Frente: [[feature-manifest]] F052. Follow-up de [[feature-manifest]] F043.
Contratos base: [[obter-model-pagina]], [[model-valor-datagrid]], [[model-valor-genericform]].

## Contexto

F043 instalou 9 models `portal-director.*` em `acesso.TBmodel_pagina` cujos
`datagrid.api` (5 pages) e `genericform.actions.submit.api` (4 pages)
referenciam procs `acesso.sp_consultar_*` (leitura) e
`acesso.sp_persistir_*` (escrita). Sem essas procs instaladas/existentes,
o ui-tester de F010/F011 fica limitado a dispatch+parse.

## Inventário de procs referenciadas pelos 9 models

Extraído via varredura regex dos JSON dos models seedados em F043
(`.tmp/F052-extract-procs.mjs`):

| # | Page | Renderer | Proc referenciada | Em sources? | Já na base? |
|---|---|---|---|---|---|
| 1 | acessos_acesso | datagrid | `acesso.sp_consultar_niveis_acesso` | sim | sim |
| 2 | acessos_usuarios | datagrid | `acesso.sp_consultar_usuarios` | sim | sim |
| 3 | acessos_fornecedor | datagrid | `acesso.sp_consultar_usuarios_fornecedor` | **NÃO** | não |
| 4 | configuracoes_conexoes | datagrid | `acesso.sp_conexao_datagrid` | sim | sim |
| 5 | configuracoes_director-mobile | datagrid | `acesso.sp_consultar_config_mobile` | sim | sim |
| 6 | configuracoes_agendameno | genericform | `acesso.sp_persistir_configuracao_agendamento` | **NÃO** | não |
| 7 | configuracoes_cotacao | genericform | `acesso.sp_persistir_configuracao_cotacao` | **NÃO** | não |
| 8 | configuracoes_email | genericform | `acesso.sp_persistir_configuracao_email` | **NÃO** | não |
| 9 | configuracoes_integrador-aws | genericform | `acesso.sp_persistir_configuracao_aws` | **NÃO** | não |

**4 existem em sources e estão presentes na base. 5 não existem nem em sources nem na base** — são gaps de contrato que vivem no seed F043 como chave de fetch mas não têm DDL correspondente no legado catalogado.

## Dependências transitivas verificadas

Apenas dependência observável nas 4 procs reais é a UDF `dbo.Split(@txt, @sep)`
usada para parsear `@ordenacao = 'coluna,direcao'`:

- `acesso.sp_consultar_niveis_acesso` → `dbo.Split`
- `acesso.sp_consultar_usuarios` → `dbo.Split`
- `acesso.sp_conexao_datagrid` → `dbo.Split`
- `acesso.sp_consultar_config_mobile` → (sem dep — não tem ordenação)

`dbo.Split` confirmado presente como `SQL_TABLE_VALUED_FUNCTION` na base
(`DBdirector_imperial_logistica_29`). Não precisou instalar.

Tabelas referenciadas (todas confirmadas presentes):
`acesso.TBpapel`, `acesso.TBaplicacao`, `acesso.TBusuario`, `acesso.TBconexao`,
`acesso.TBconfig_mobile`, `acesso.TBconfiguracao`.

## Decisão

Escopo F052 = **procs que existem em sources E são referenciadas pelos
9 models de F043**. Cobre 4 procs (todas de leitura — `sp_consultar_*` +
`sp_conexao_datagrid`). Reaplicar idempotentemente via DROP+CREATE
(pattern já presente no .sql do legado) para garantir que a versão na base
é exatamente a do sources catalogado.

**5 procs faltantes ficam fora do escopo de F052** — não posso inventar
DDL nem inferir contrato. Documentadas abaixo como follow-up.

## Procedimento aplicado

1. Script `workspace/director-studio/.tmp-F052-seed-procs.mjs`:
   - Lê `./.env`, conecta via driver `mssql`.
   - Verifica pré-requisito `dbo.Split` (presente).
   - Para cada uma das 4 procs, lê o `.sql` de sources em `latin1`
     (encoding legado cp1252), separa por `GO` em linha sozinha
     (regex `^\s*GO\s*$` case-insensitive, multiline), e executa cada
     batch via `pool.request().batch(...)`.
   - Verifica `sys.objects.modify_date` pós-aplicação.

2. Resultado (run 2026-05-15T17:37Z):

```
[F052] OK: dbo.Split presente.
[F052] acesso.sp_consultar_niveis_acesso: 2 batch(es)
[F052]   -> applied. modify_date=2026-05-15T17:36:59.353Z
[F052] acesso.sp_consultar_usuarios: 2 batch(es)
[F052]   -> applied. modify_date=2026-05-15T17:36:59.907Z
[F052] acesso.sp_conexao_datagrid: 2 batch(es)
[F052]   -> applied. modify_date=2026-05-15T17:37:00.197Z
[F052] acesso.sp_consultar_config_mobile: 2 batch(es)
[F052]   -> applied. modify_date=2026-05-15T17:37:00.447Z
```

## Smoke test

`workspace/director-studio/.tmp-F052-smoke.mjs` chama cada proc com
payload mínimo `<Parametros><pagina>1</pagina><limite>5</limite><idusuario>1</idusuario></Parametros>`
e valida que o recordset traz envelope `<Relatorio xmlns:json="...">`
ou vazio (caso config_mobile sem dados).

```
PASS  acesso.sp_consultar_niveis_acesso   <Relatorio ...><Titulo>Níveis de Acesso</Titulo><Linhas ...>
PASS  acesso.sp_consultar_usuarios         <Relatorio ...><Titulo>Usuários</Titulo><Linhas ...>
PASS  acesso.sp_conexao_datagrid           <Relatorio ...><Titulo>Conexões</Titulo><QuantidadeTotal>0</...>
PASS  acesso.sp_consultar_config_mobile    (empty)

F052 smoke: 4/4 procs respondem com envelope <Relatorio> ou vazio.
```

## O que F052 **não** entrega — follow-ups

### F052b — procs faltantes em sources

5 procs referenciadas pelos models F043 não têm DDL em
`sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/`:

- `acesso.sp_consultar_usuarios_fornecedor` (datagrid de fornecedor)
- `acesso.sp_persistir_configuracao_agendamento`
- `acesso.sp_persistir_configuracao_cotacao`
- `acesso.sp_persistir_configuracao_email`
- `acesso.sp_persistir_configuracao_aws`

Possibilidades a investigar pelo arqueólogo:
1. Procs existem em outro source não-catalogado (processa-adm? portal-aws?).
2. Procs nunca existiram no legado — são endpoints que o portal-director
   chamava direto em `.cs` controller sem stored procedure.
3. Procs são privativas de tenants específicos (não vieram no dump).

**Impacto para ui-tester**:
- F011 (DataGrid) sobre `acessos_fornecedor` cai em proc-not-found ao
  listar. As outras 4 pages com datagrid estão OK.
- F010 (GenericForm) sobre `configuracoes_*` cai em proc-not-found ao
  submeter. Path feliz não exercitável end-to-end nessas 4 pages até
  F052b ou refactor do model F043 para apontar pra procs existentes.

### Não invadi escopo

- Não baixei procs fora das referenciadas pelos 9 models (briefing).
- Não alterei DDL existente (briefing). O DROP+CREATE de cada proc
  reaplica **o mesmo bytecode** que veio de sources — sem mutação de
  comportamento; somente garante que base = sources.
- Não commitei (briefing).

## Reversão

`acesso.sp_consultar_*` originalmente não estavam versionadas pelo Studio
— elas vieram pré-instaladas com a base. Para "reverter" reaplique de
sources (idempotente) ou faça `DROP PROCEDURE acesso.sp_<nome>` se quiser
voltar ao estado pré-F052 (mas vai quebrar features que já dependem das
procs — F011, F015 etc.).

## Artefatos

- `workspace/director-studio/.tmp-F052-seed-procs.mjs` — script idempotente (não-comitado, vive em `.tmp-*`)
- `workspace/director-studio/.tmp-F052-smoke.mjs` — smoke (não-comitado)
- 4 procs `acesso.sp_*` com `modify_date` 2026-05-15T17:37Z em `sys.objects`
