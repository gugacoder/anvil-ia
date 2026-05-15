---
title: "acesso.obter_rotas_aplicacao"
aliases: [obter-rotas-aplicacao, acesso-obter-rotas, rotas-aplicacao]
tags: [contract, legacy, sql, procedure, acl, menu, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: `acesso.obter_rotas_aplicacao`

Procedure SQL Server do schema `acesso` (banco `portal-director`) que retorna a **lista plana de páginas que um usuário pode acessar dentro de uma aplicação**. É uma das três procs candidatas a alimentar o menu/router do legado — junto com [[acesso-obter-acl-token]] (proc rica, usada hoje pelo `react-tools` via `aclSetup`) e `acesso.obter_acl_usuario_aplicacao` (proc magra, retorna só papéis e recursos).

**Importante**: a despeito do nome no manifest da F007, **o `react-tools` legado não chama `obter_rotas_aplicacao`**. O menu do shell é montado a partir de `obter_acl_token` (que devolve `Routes/Route` com `Children` aninhados — modulos com páginas dentro). `obter_rotas_aplicacao` parece ser uma proc paralela / utilitária para casos onde basta a lista plana das rotas (sem agrupamento por módulo, sem funções, sem empresas, sem ícones de módulo). Veja seção **Comparação com procs irmãs** abaixo.

> inferido (consumidores): nenhum match para `obter_rotas_aplicacao` em `sources/engenharia--fabrica--javascript--react-tools` nem nos `.NET`. Possivelmente consumida por outra superfície (Ember legado? Admin SQL? script de seed?) — TBD verificar no banco vivo / nos `.NET` core não indexados.

## Citações de fonte

- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_rotas_aplicacao.sql:5` — assinatura.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_rotas_aplicacao.sql:26-31` — parsing dos parâmetros XML + resolução de `id_aplicacao` por `DFchave`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_rotas_aplicacao.sql:36-44` — coleta de papéis do usuário na aplicação.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_rotas_aplicacao.sql:50-61` — loop de papéis: extrai `DFid_paginas` de `TBpapel_funcao_pagina_modulo` e desempacota a CSV via `Split`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_rotas_aplicacao.sql:64-85` — segundo passo: páginas via recursos adicionais (`TBrecurso_adicional`).
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_rotas_aplicacao.sql:87-93` — SELECT final.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBpagina.sql` — definição da tabela base ([[tbpagina]]).

## Assinatura

```
CREATE PROCEDURE acesso.obter_rotas_aplicacao (@xml XML)
```

Parâmetro único: documento XML `<Parametros>` com os campos abaixo.

## Parâmetros de entrada (XML)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `appkey` | string (NVARCHAR(50)) | sim | Chave da aplicação alvo (case-insensitive na tag, valor case-sensitive contra `TBaplicacao.DFchave`) | qualquer chave existente em `acesso.TBaplicacao.DFchave` | Resolve `@id_aplicacao` via `SELECT DFid_aplicacao FROM acesso.TBaplicacao WHERE DFchave = @chave_aplicacao`. Se inexistente, `@id_aplicacao` vira NULL e o resultset volta vazio (sem erro) | `appConfigs.appKey` no front; ou backend chamador |
| `userid` | int | sim | ID do usuário no `acesso.TBusuario` | inteiro existente | Filtro de papéis e recursos adicionais | sessão autenticada |

> Observação: nomes das tags XML são lidos **com `lower-case(local-name())`** — i.e. `<UserId>`, `<USERID>` e `<userid>` são todos válidos. Mesma tolerância vale pra `<appkey>`.

> inferido: a proc não valida nem rejeita ausência de parâmetros — XML mal-formado ou faltante produz NULL silencioso → resultset vazio.

## Colunas retornadas

Único result set, **sem nome de schema explícito**. Uma linha por página acessível ao usuário na aplicação.

| Coluna | Tipo (origem) | Semântica | Vem de |
|---|---|---|---|
| `Path` | NVARCHAR(255) | Caminho/rota da página (formato hash-route, ex: `/wms/pedidos`) | `acesso.TBpagina.DFcaminho` |
| `Name` | NVARCHAR(255) | Título exibido (nome legível da página) | `acesso.TBpagina.DFtitulo` |
| `DFchave` | NVARCHAR(255) | Chave técnica da página (formato `<appkey><sufixo>`, ex: `wms_pedidos`) | `acesso.TBpagina.DFchave` |

> ressalva: nome da terceira coluna sai com o prefixo `DF` (não foi aliasado no SELECT). Consumidores precisam saber disso. As outras duas têm alias (`Path`, `Name`).

## Filtros aplicados

A página entra no resultset se e só se **todas** as condições abaixo são verdadeiras:

1. `DFchave LIKE @chave_aplicacao + '%'` — heurística textual: a chave da página começa com a chave da app. **Não usa `DFid_aplicacao`** para esse filtro (potencial bug ou intencional — páginas com chave compatível mas vinculadas a outra app entram). > inferido
2. `DFid_pagina IN (#temp_paginas_usuario)`, onde a temp é a **união** de:
   - Páginas dos papéis do usuário: `acesso.TBpapel_funcao_pagina_modulo.DFid_paginas` (campo CSV) ∩ papéis em `acesso.TBpapel_usuario_empresa` para `(DFid_usuario, DFid_aplicacao)`.
   - Páginas de recursos adicionais: `acesso.TBrecurso_adicional.DFid_paginas` (campo CSV) para `(DFid_usuario, DFid_aplicacao)`.

Não filtra por `DFdata_inativacao` da página. > inferido: páginas inativas continuam retornando se houver vínculo ACL (provável bug histórico — `obter_acl_token` filtra; esta não).

Não filtra por `DFexibir_menu`. Páginas marcadas para não exibir no menu (`DFexibir_menu=0`) também aparecem. > inferido: a proc é "rotas autorizadas", não "menu" — quem precisar de menu filtra depois.

## Ordenação

**Indefinida**. O SELECT final não tem `ORDER BY`. > inferido: na prática SQL Server retorna na ordem do plano (provavelmente `DFid_pagina` por usar a temp como `IN`). Consumidores que queiram ordem estável precisam ordenar do lado deles (campo `DFordem` em `TBpagina` existe mas não é projetado por esta proc).

## Regra de hierarquia

**Não há hierarquia no resultset**. A proc devolve **flat list de páginas**, sem agrupamento por módulo, sem `DFid_modulo`, sem `DFid_pai`. A hierarquia pai→filho do menu (módulo → páginas) só aparece em `obter_acl_token`, que estrutura como XML aninhado `Routes > Route[Children > Route[]]`.

Se o cliente desta proc quiser árvore, precisa fazer JOIN com `acesso.TBmodulo` por outro caminho (não exposto aqui).

## Estado interno (efeitos colaterais)

A proc cria três tabelas temporárias dentro da sessão:

- `#temp_papeis_usuario` — papéis do usuário na aplicação.
- `#temp_paginas_usuario` — união das páginas acessíveis (papéis + recursos adicionais).
- `#temp_recursos_usuario` — IDs dos `TBrecurso_adicional` do usuário.

Todas são `DROP TABLE IF EXISTS` no topo. Não há persistência fora da sessão.

`SET ARITHABORT ON` no preâmbulo (padrão em todas as procs do schema). Sem transações explícitas, sem TRY/CATCH — exceções propagam.

## Comparação com procs irmãs

| Proc | Entrada | Saída | Hierarquia | Funções/Empresas | Filtro `DFexibir_menu` / `DFdata_inativacao` | Consumida em |
|---|---|---|---|---|---|---|
| `acesso.obter_rotas_aplicacao` | `<appkey><userid>` | tabular: `Path, Name, DFchave` | não (flat) | não | não | não localizado em `react-tools` ou `.NET` indexado |
| `acesso.obter_acl_token` | `<idUsuario><empresa><chaveAplicacao>` (ou `idAplicacao`) | XML JSON-array: `Routes > Route(Module) > Children > Route(Page) > Children > Route(Function)` + `Empresas` por página | sim (módulo → páginas → funções) | sim | sim (`DFdata_inativacao IS NULL`); ordena por `DFordem`/`DFtitulo` | **`react-tools/hooks/useAcl.fetchAclAndPersist`** via prop `aclSetup` |
| `acesso.obter_acl_usuario_aplicacao` | `<idUsuario><idAplicacao>` | XML: `ACL > Niveis[] + Recursos[]` (papéis e recursos crus) | não | papéis e recursos crus, sem páginas | n/a | TBD (não indexado) |
| `acesso.sp_obter_paginas_aplicacao` | `<aplicacao><value>` | tabular: páginas da app (todas, sem ACL) | não | não | não | admin/CRUD de páginas |

> conclusão: para alimentar a F007 do Studio, **a proc canônica é `obter_acl_token`**, não `obter_rotas_aplicacao`. Manifest precisa ser atualizado pra refletir isso. `obter_rotas_aplicacao` permanece catalogada como proc auxiliar (e suspeita de uso antigo / Ember / scripts).

## Exemplo de execução

Conforme o bloco de teste embutido no source:

```
DECLARE @xml XML =
  '<Parametros>
    <appkey>wms</appkey>
    <userid>1</userid>
  </Parametros>'
EXEC acesso.obter_rotas_aplicacao @xml
```

Saída esperada (formato):

| Path | Name | DFchave |
|---|---|---|
| `/wms/pedidos` | Pedidos | `wms_pedidos` |
| `/wms/separacao` | Separação | `wms_separacao` |
| ... | ... | ... |

## Relações com o ecossistema

- Consome de: [[tbpagina]], `acesso.TBpapel`, `acesso.TBpapel_usuario_empresa`, `acesso.TBpapel_funcao_pagina_modulo`, `acesso.TBrecurso_adicional`, `acesso.TBaplicacao`.
- É consumido por: TBD — nenhum consumer JS/.NET indexado encontrado.
- Procedures relacionadas: [[acesso-obter-acl-token]] (canônica de menu), `acesso.obter_acl_usuario_aplicacao` (ACL crua), `acesso.sp_obter_paginas_aplicacao` (admin).
- Função utilitária: `Split(string, ',')` — UDF do schema `dbo` que desempacota campos CSV.

## Notas de implementação para o Studio

- **F007 deve ser alimentada por `obter_acl_token`**, não por esta proc. Atualizar manifest.
- A pré-condição `DFchave LIKE appkey + '%'` indica que o legado convencionou **prefixar a chave da página com a chave da aplicação**. Esse contrato textual precisa ser preservado no banco se a F007 for replicar a proc no Studio — mas a F007 não vai precisar dela.
- Campos CSV (`DFid_paginas`, `DFid_funcoes`, `DFid_modulos` em `TBpapel_funcao_pagina_modulo` e `TBrecurso_adicional`) são **strings concatenadas com vírgula**, não tabelas de relacionamento normalizadas. Qualquer reescrita do mecanismo de ACL no Studio precisa lidar com esse formato (ou migrar).
- A proc não diferencia "página acessível" de "página no menu". Quem quiser menu filtra `DFexibir_menu=1` depois.

## Sources

- [[calendar/notes/2026-05-15.md]]
