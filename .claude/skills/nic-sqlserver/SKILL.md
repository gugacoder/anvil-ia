---
name: nic-sqlserver
description: "Convenção de nomenclatura SQL Server do stack Processa. Aplica prefixos TB/DF/PK/FK/UQ/IX/TR ao criar ou revisar tabelas, colunas, constraints, índices e triggers. Use sempre que: criar migration SQL Server, revisar DDL, nomear objetos no banco, ou quando o usuário perguntar sobre convenção de nomes no SQL Server / Processa."
---

# Convenção SQL Server — Stack Processa

> Derivada do `DBcoletivos`. Aplica-se **exclusivamente ao SQL Server**.  
> PostgreSQL usa snake_case comum, sem nenhum desses prefixos.

---

## Tabelas — `TB{entidade}`

- Prefixo `TB` colado, sem underscore
- Nome **singular**, snake_case

```sql
TBusuario          -- correto
TBchamado_historico
TB_usuario         -- ERRADO (underscore após TB)
TBusuarios         -- ERRADO (plural)
```

---

## Colunas — `DF{campo}`

Campos comuns: apenas o nome semântico, sem sufixo da tabela.

```sql
DFnome_completo
DFemail
DFativo
DFdata_criacao
DFpassword_hash
```

### PK numérica — `DFid_{entidade}`

```sql
-- TBusuario  →  DFid_usuario
-- TBchamado  →  DFid_chamado
-- TBchamado_historico  →  DFid_historico
```

### PK natural (lookup/tipo)

Quando a tabela é uma tabela de domínio e o próprio valor é o identificador, a PK não usa `id`:

```sql
-- TBtipo_prioridade  →  DFtipo_prioridade  (PK = o código do tipo)
-- TBcor_semantica    →  DFcor
```

### FK — `DFid_{entidade_referenciada}`

Quando há múltiplas FKs para a mesma tabela, ou o papel semântico difere, adicionar qualificador:

```sql
-- FK simples para TBatendente
DFid_atendente

-- Duas FKs para TBatendente na mesma tabela
DFid_atendente_responsavel
DFid_atendente_criador

-- FK com papel diferente da entidade
DFid_remetente               -- FK → TBatendente (papel = remetente)
DFid_status_chamado_anterior -- FK → TBstatus_chamado + qualificador
DFid_usuario_alteracao       -- FK → TBusuario + qualificador
```

---

## Constraints

O `{schema}` é um identificador curto do módulo/app (ex: `sac`, `nic`, `col`). Escolher um por projeto e usar em todos os constraints.

### Primary Key

```
PK__{schema}_TB{entidade}
```

```sql
PK__nic_TBusuario
PK__nic_TBusuario_papel    -- PK composta: nome da tabela, sem listar colunas
```

### Foreign Key

```
FK__{schema}_TB{origem}__{schema}_TB{destino}
```

```sql
FK__nic_TBatendente__nic_TBusuario
FK__nic_TBchamado__nic_TBatendente
FK__nic_TBchamado_historico__nic_TBstatus_chamado
```

### Unique

```
UQ__{schema}_TB{entidade}__{DFcampo}
```

Multi-coluna — listar campos com `_` entre eles:

```sql
UQ__nic_TBusuario__DFemail
UQ__nic_TBpapel_permissao__DFid_papel_DFid_permissao

-- Multi-coluna com nome descritivo quando lista ficaria longa
UQ__nic_TBferiado__DFdata_tipo
```

---

## Índices

### Não-único

```
IX__{schema}_TB{entidade}__{DFcampo}
```

Composto — listar campos com `_` entre eles:

```sql
IX__nic_TBusuario__DFativo
IX__nic_TBusuario__DFdata_criacao
IX__nic_TBatendimento__DFdata_inicio_DFstatus_atendimento
IX__nic_TBauditoria__DFid_usuario_DFtipo_usuario
```

### Único explícito (não-constraint)

```
UQ_IDX__{schema}_TB{entidade}__{DFcampo}
```

```sql
UQ_IDX__nic_TBcontato__DFid_usuario
```

---

## Triggers

```
TR_TB{entidade}__{verbo_descricao}
```

- Sem prefixo de schema
- Dois underscores separam tabela da descrição
- Verbo no infinitivo

```sql
TR_TBusuario_papel__validar_papel_fixo
TR_TBchamado__atualizar_data_modificacao
```

---

## Views

```
VW{entidade}
```

- Prefixo `VW` colado, sem underscore
- Entidade no singular, snake_case
- Nome do arquivo: `{schema}.VW{entidade}.sql`
- Colunas da view mantêm o prefixo `DF{campo}` quando são projeção direta de colunas de tabelas; quando são calculadas ou renomeadas por clareza (ex: `thread_id`, `comment_count`, `last_activity`), não precisam do prefixo — são colunas "públicas" da view

```sql
VWthreads
VWchamado_sla_resumo
VWauditoria_diaria
```

### Índice em view materializada (raro)

```
IX__{schema}_VW{entidade}__{campo}
```

---

## Resumo rápido

| Objeto | Padrão |
|--------|--------|
| Tabela | `TB{entidade}` |
| View | `VW{entidade}` |
| Campo comum | `DF{campo}` |
| PK numérica | `DFid_{entidade}` |
| PK natural | `DF{campo}` |
| FK simples | `DFid_{entidade_ref}` |
| FK qualificada | `DFid_{entidade_ref}_{qualificador}` |
| PK constraint | `PK__{schema}_TB{entidade}` |
| FK constraint | `FK__{schema}_TB{origem}__{schema}_TB{destino}` |
| UQ constraint | `UQ__{schema}_TB{entidade}__{DFcampo}` |
| Índice | `IX__{schema}_TB{entidade}__{DFcampo}` |
| Índice único | `UQ_IDX__{schema}_TB{entidade}__{DFcampo}` |
| Trigger | `TR_TB{entidade}__{verbo_descricao}` |
