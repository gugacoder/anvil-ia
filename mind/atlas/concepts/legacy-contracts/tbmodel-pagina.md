---
title: "Contrato: TBmodel_pagina"
aliases: [tbmodel-pagina, contract-tbmodel-pagina]
tags: [contract, legacy, schema, acesso, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
status: superseded
---

# Contrato: `acesso.TBmodel_pagina`

> **STATUS: superseded** — este stub foi substituído pelo contrato canônico [[obter-model-pagina]] (que documenta a tabela `TBmodel_pagina`, as tabelas satélite `TBfuncao_model`/`TBmodel_parametro`, e a proc + endpoint que as expõem). O dispatch runtime que esta nota previa estar em "DFtipo" vive em [[engine-schema-driven]] — e **não** é por `DFtipo` (coluna que não existe), mas por presença de chaves no JSON do `DFvalor`.

Tabela do schema `acesso.*` do `DBdirector` que armazena a **definição de cada tela renderizada** pelo `<AppMain />` do [[react-tools]]. Cada linha descreve um "model" — i.e. uma view com seu tipo, sua proc-fonte, suas configurações específicas. É **o coração** do metamodelo schema-driven. O [[director-studio]] precisa ler essas linhas e renderizar telas a partir delas.

## Citações de fonte (a verificar)

- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBmodel_pagina.sql` — definição da tabela
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_model_pagina.sql` — consumidor canônico
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.TBprocedure_model.sql` — relação com procedures que populam o model

## Estrutura (a confirmar pelo archaeologist)

| Coluna | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| DFid | int | sim | Identificador do model | int > 0 | PK; referenciado por TBpagina | sequence |
| DFtipo | varchar | sim | Discriminador de renderer | a-confirmar (esperado: "form", "grid", "dashboard", "tabs", "tree", "wizard") | Driver de qual componente renderiza | cadastro humano via AppBuilder |
| DFconfig | xml ou nvarchar | sim | Config específica do tipo | XML/JSON conforme sub-contrato por DFtipo | Alimenta props do componente | cadastro humano |
| ... | ... | ... | ... | ... | ... | ... |

## Sub-contratos esperados (a criar)

Quando o archaeologist confirmar os valores de `DFtipo`, criar arquivos separados:

- `tbmodel-pagina-form.md` — config quando DFtipo=form
- `tbmodel-pagina-grid.md` — config quando DFtipo=grid
- `tbmodel-pagina-dashboard.md`
- `tbmodel-pagina-tabs.md`
- `tbmodel-pagina-tree.md`
- `tbmodel-pagina-wizard.md`

## Relações com o ecossistema

- **Referenciado por**: [[tbpagina]] (a documentar) via FK
- **Procedures consumidoras**: `acesso.obter_model_pagina`, `acesso.obter_rotas_aplicacao` (parcialmente)
- **Cadastrado por**: UI do AppBuilder (rotas em `appbuilder/website/src/routes/`)
- **Sub-tabela**: `acesso.TBmodel_parametro` — parâmetros dinâmicos do model

## Notas para o Studio

(Apenas observações de comportamento — preencher quando confirmado.)

## Sources

- [[calendar/notes/2026-05-15.md]]
