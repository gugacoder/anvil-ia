---
title: "Metamodelo acesso.*"
aliases: [acesso-metamodel, metamodel, acesso-schema, schema-driven-ui]
tags: [schema, processa, dbdirector, metamodelo, ui]
sources:
  - "calendar/notes/2026-05-15.md"
  - "calendar/notes/2026-05-17.md"
created: 2026-05-15
updated: 2026-05-19
---

# Metamodelo `acesso.*`

Schema do `DBdirector` que descreve **a UI dos apps Processa como dados**, não como código. Vive no banco sob o namespace `acesso.*` (visível em `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/` e `programacao/`). Toda app Processa renderizada pelo `<AppMain />` do [[react-tools]] — AppBuilder, Portal Director, Director.Web/WMS, ADM — consome esse mesmo metamodelo, discriminando apenas qual `TBaplicacao` corresponde àquela instância. É o substrato técnico que torna [[director-studio]] viável: um único renderizador serve N apps porque N apps são N conjuntos de linhas nas mesmas tabelas.

## Key Points

- **Tabelas-núcleo**: `TBaplicacao` (apps — ver [[tbaplicacao-app-registry]] para deep cross-tenant survey com 23 appKeys e 5 caminhos de resolução), `TBmodulo` (grupos de menu), `TBpagina` (entradas/rotas), `TBmodel_pagina` (template/view da página), `TBmodel_parametro` (parâmetros do template), `TBprocedure_model` (proc que popula o model).
- **RBAC granular**: `TBpapel`, `TBfuncao`, `TBpapel_funcao_pagina_modulo`, `TBpapel_usuario_empresa`, `TBsessao` — permissões por papel × função × página × módulo × empresa.
- **Multi-tenant nativo**: `TBconexao`, `TBconexao_usuario` — cada usuário/app pode rotear para conexão diferente. Permite Studio servir múltiplos bancos com um único processo.
- **Dashboards declarativos**: `TBdashboard` + `TBobjetos_dashboard` — composição via objetos cadastrados, não código.
- **Procs canônicas** expostas como API pelo backend: `obter_rotas_aplicacao`, `obter_aplicacoes_pagina_home`, `obter_model_pagina`, `obter_acl_token`, `obter_acl_usuario_aplicacao`, `obter_opcoes_selecao`, `consultar_model_dashboards`. Renderizar um app é orquestrar 4-5 dessas chamadas.

## Details

O insight de schema-driven UI é que **a página renderizada é uma instância de `TBmodel_pagina`**: a tabela carrega a definição do template (campos, layout, comportamento) e `TBmodel_parametro` ata variáveis de runtime. Quando o usuário acessa `/path/x`, o frontend chama `obter_model_pagina` passando o id da página, o backend retorna o JSON do model, e o renderer mapeia esse JSON para componentes React. Não há código JSX por página — há código JSX por *tipo de model*.

A separação `TBmodulo → TBpagina → TBmodel_pagina` permite hierarquia de menu reusável. Um mesmo `model_pagina` pode aparecer em `pagina`s diferentes de `modulo`s diferentes em `aplicacao`s diferentes — só muda o que cada `TBpapel_funcao_pagina_modulo` permite ao usuário fazer. Essa heterarquia é o que diferencia o metamodelo Processa de uma "tabela de telas" ingênua.

Convenção de nomenclatura (ver [[nic-sqlserver]]): prefixos `TB` (tabela), `DF` (data field/coluna), `PK`/`FK`/`UQ`/`IX` (constraints). Procedures usam padrão `verb_object[_modifier]`: `obter_*` para SELECT, `persistir_*` para INSERT/UPDATE, `atualizar_*` para UPDATE pontual, `consultar_*` para queries com filtros, `sp_*` para procs auxiliares.

O metamodelo também codifica integrações cross-tenant: `TBaplicacao` com chave `portal-aws` armazena `DFendereco` e `DFdominio` do bridge AWS (ver [[processa-auth-paths]]) — apps locais consultam essa tabela para descobrir o bridge em runtime, ao invés de hard-coding. O Studio segue o mesmo padrão: lê `TBaplicacao` no boot e sabe com quem falar. Um survey empírico de 97 bases `DBdirector_*` (2026-05-17) revelou que `TBaplicacao` contém 23 appKeys distintos com taxonomia core/opt-in/one-off, e que `DFchave` (não `DFid`) é o discriminador estável cross-tenant — detalhes completos em [[tbaplicacao-app-registry]].

A descoberta de campos/colunas exatos do metamodelo é o eixo principal do trabalho de documentação que precede a implementação do Studio. As 50+ tabelas em `portal-director/portal.director/criacao/` precisam ser lidas individualmente para extrair: (a) campos por tabela, (b) procedures que tocam cada tabela, (c) contratos de entrada/saída das procs canônicas, (d) convenções implícitas (campos opcionais com semântica especial).

## Related Concepts

- [[director-studio]] — projeto que renderiza este metamodelo como app único
- [[dbdirector]] — instância SQL Server onde o schema vive
- [[processa-auth-paths]] — `TBaplicacao` armazena também endereços para auth cross-tenant
- [[react-tools]] — implementação atual do renderer que consome esse metamodelo
- [[appbuilder]] — UI atual de cadastro do metamodelo
- [[tbaplicacao-app-registry]] — deep cross-tenant survey de `TBaplicacao` (23 appKeys, 5 caminhos de resolução, auth-scheme switching)

## Sources

- [[calendar/notes/2026-05-15.md]] — exploração de `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/` (~50 tabelas listadas) e `programacao/` (procs `obter_*`); decisão de tratar a descoberta dos contratos como frente própria do projeto Studio
- [[calendar/notes/2026-05-17.md]] — survey cross-tenant de 97 bases revelando 23 appKeys em TBaplicacao, taxonomia core/opt-in/one-off, DFchave como discriminador estável
