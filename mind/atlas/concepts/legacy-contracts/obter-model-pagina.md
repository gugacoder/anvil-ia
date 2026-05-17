---
title: "acesso.obter_model_pagina + POST /api/model"
aliases: [obter-model-pagina, acesso-obter-model-pagina, api-model, generic-pages-model]
tags: [contract, legacy, acesso, sql, dotnet, react-tools, director-studio, engine]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-17
---

# Contrato: `acesso.obter_model_pagina` e endpoint `POST /api/model`

Pipeline canônico de **resolução do model de uma página** a partir de uma rota navegada no shell `AppMain`. Existe em **duas implementações coexistentes** no legado, ambas alimentando o engine schema-driven (F009):

1. **Stored procedure SQL** `acesso.obter_model_pagina(@caminho, @id_aplicacao)` — versão "pesada", produz **XML** com `FOR XML PATH` (com namespace `http://james.newtonking.com/projects/json` para sinalizar arrays a serem convertidos via [[xml-to-json-node]]). Usada por aplicações que ainda passam pelo pipeline XML→JSON da Processa.
2. **Repositório .NET inline** `PortalDirector.Repositories.GenericPagesRepository.ObterModel(caminho, chaveAplicacao)` — versão "leve", monta SQL direto via `GenericDAO.Query<GenericPagesModel>`, faz 3 queries separadas (model + funções + parâmetros) e retorna objeto JSON nativo. É o caminho efetivamente exercido pelo Director (`POST /api/model`) que o `<GenericPages api='/model'>` consome.

As duas implementações **divergem na resolução** da página (ver §"Resolução do `caminho`" abaixo) e **convergem no payload** que o React recebe: `{ model, modelParams, funcoes }`.

## Citações de fonte

- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_model_pagina.sql:1-49` — proc SQL.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBmodel_pagina.sql:1-38` — DDL da tabela do model.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBfuncao_model.sql:1-29` — DDL das funções por página.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBmodel_parametro.sql:1-11` — DDL dos parâmetros dinâmicos.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Repositories/GenericPagesRepository.cs:9-48` — implementação .NET ativa.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Services/GenericPagesService.cs:11-22` — serviço (lê `caminho` e `chaveAplicacao` do body).
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Controllers/UtilsController.cs:20-25` — controller `[HttpPost("model")]`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Dominio/GenericPagesModel.cs:3-13` — DTO de saída.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Dominio/Funcao.cs:3-9` — DTO `Funcao`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Dominio/ModelParam.cs:3-9` — DTO `ModelParam`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPages/GenericPages.js:60-94` — consumidor React (POST `/model`, parse, eval).
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.tabelas_temporarias_persistir.sql:105-211` — caminho de **escrita** do model (alimentação via `##TempModelPagina`).
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/1-alimentacao/insert_template_pagina.sql:10-19` — 8 templates de model que o AppBuilder oferece para cadastro humano.

## Entradas

### Request HTTP (versão .NET — caminho ativo)

`POST /api/model` — body JSON:

| Campo | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `caminho` | string | sim | Path da rota (hash do URL, ex.: `/agendamento/gerenciar-agendamento`). Identifica a página dentro da aplicação | string com `/` inicial; sem fragmento, sem query | Predicado do `WHERE` em `TBpagina.DFcaminho` | `useNavigation.currentRoute.path` (vindo da ACL) ou hash do `window.location` (fallback no `GenericPages.js:62-64`) |
| `chaveAplicacao` | string | sim | Identificador estável da aplicação (ex.: `agent`, `director`, `processa`) | string | Resolve `id_aplicacao` via `acesso.TBaplicacao.DFchave` | `appConfigs.appKey` do `sessionStorage['@director/appconfigs']` |
| `idUsuario` | int | não (presente no body do React, **ignorado** pelo Service) | Id do usuário logado | int | Não utilizado pelo `GenericPagesService` atual; auditoria potencial | `loggedUserData.id` (de `localStorage['@director/usr']`) |

### Procedure SQL (versão XML — caminho legado paralelo)

`EXEC acesso.obter_model_pagina @caminho, @id_aplicacao`

| Parâmetro | Tipo | Obrigatório | Semântica |
|---|---|---|---|
| `@caminho` | NVARCHAR(255) | sim | Mesmo papel do `caminho` HTTP. |
| `@id_aplicacao` | INT | sim | Já resolvido (FK direto de `TBaplicacao.DFid_aplicacao`); chamador resolve `chave→id` externamente. |

## Resolução do `caminho` (divergência entre implementações)

A proc SQL e o repositório .NET **não casam** no `JOIN` de `TBpagina × TBmodel_pagina` nem no escopo de aplicação:

| Aspecto | Proc SQL (`obter_model_pagina.sql`) | Repositório .NET (`GenericPagesRepository.cs`) |
|---|---|---|
| Identificação da aplicação | `@id_aplicacao` recebido como INT | `chaveAplicacao` (string) — resolvido inline via subquery `SELECT DFid_aplicacao FROM TBaplicacao WHERE DFchave = ...` |
| Match TBpagina × TBmodel_pagina | `t1.DFchave = t2.DFchave_pagina` | `t1.DFchave = t2.DFchave_pagina` |
| Filtro adicional de status | nenhum | nenhum (não filtra `TBmodel_pagina.DFstatus='H'` apesar da coluna existir — ver §"Notas") |
| Cross-app fallback | nenhum — só a aplicação informada | **`OR` cláusula** que também busca em `DFchave='processa'` — qualquer página com chave `processa` é compartilhada entre aplicações |
| Resultado se múltiplos models | retorna todos no FOR XML | `.FirstOrDefault()` — primeiro arbitrário (não há `ORDER BY`) |

> inferido: o cross-app fallback (`OR ... DFchave='processa'`) significa que páginas "core" da plataforma (cadastros comuns) são definidas uma vez sob a aplicação **processa** e consumidas por todas as demais.

## Saída

### Payload (.NET — formato exposto ao React)

```
GenericPagesModel {
  IdModel:     int          // TBmodel_pagina.DFid_model_pagina
  IdPagina:    int          // TBpagina.DFid_pagina
  Chave:       string       // TBpagina.DFchave (= TBmodel_pagina.DFchave_pagina)
  Model:       string?      // TBmodel_pagina.DFvalor (string JSON serializada)
  Funcoes:     Funcao[]?    // de TBfuncao_model filtrado por DFchave_pagina
  ModelParams: ModelParam[]? // de TBmodel_parametro filtrado por DFchave_pagina
}
```

Aliases na resposta JSON (camelCase via serializer .NET default): `model`, `funcoes`, `modelParams`, `idModel`, `idPagina`, `chave`.

| Campo | Tipo | Semântica | Efeito |
|---|---|---|---|
| `model` | string (JSON serializado) | **Definição completa da página** — objeto JSON com chaves discriminantes que o engine usa para dispatch (ver [[engine-schema-driven]]). Pode conter placeholders `dParam0..N` resolvidos via `modelParams` antes do parse | Após interpolação, `JSON.parse(model)` → objeto passado a `<GenericPage model={...}/>` ou `<GenericTabPage model={...}/>` |
| `funcoes` | array de `Funcao` | Lista de funções JS por página (script bruto a ser executado via `eval`) — vide [[engine-schema-driven]] §funções | Armazenado em `functionsArray.current`, chamado em handlers (e.g. `executeGenericFunctions(chave, args)`) |
| `modelParams` | array de `ModelParam` | Pares chave-valor a serem **substituídos** no `model` string antes do `JSON.parse`. Permite parametrizar o JSON por contexto (e.g. companhia, perfil, feature flag) | `evalModelDynamicParams(modelParams, model)` em `GenericPages.js:26-58` (faz `replaceAll(chave, eval(valor))`) |

### `Funcao` (item de `funcoes`)

| Campo | Tipo | Origem (.NET) | Origem (SQL) | Semântica |
|---|---|---|---|---|
| `idFuncao` | int | `IdFuncao` | `DFid_funcao_model` | PK |
| `chaveFuncao` | string | `ChaveFuncao` | `DFchave` | Identificador chamado pelo front via `executeGenericFunctions(chaveFuncao, args)` |
| `chavePagina` | string | `ChavePagina` | `DFchave_pagina` | FK lógica para a página dona |
| `valor` | string | `Valor` | `DFvalor` | **Código JS bruto** a ser `eval`-ado. Pode conter `param0..N` substituídos por argumentos em tempo de chamada |
| `idPagina` | int | (presente no DTO, não populado pelo repo) | n/a | Legado — só populado no caminho XML antigo |

### `ModelParam` (item de `modelParams`)

| Campo | Tipo | Origem (.NET) | Origem (SQL) | Semântica |
|---|---|---|---|---|
| `idParam` | int | `IdParam` | `DFid_model_parametro` | PK |
| `chave` | string | `Chave` | `DFchave` | Placeholder a ser substituído no JSON do model (ex.: `dParam3`, `#dParamCnpj`) |
| `valor` | string | `Valor` | `DFvalor` | **Expressão JS** que será `eval`-ada para produzir o substituto. Tem acesso ao escopo do `evalModelDynamicParams` (i.e. `getAclResourceCompanies` e outras refs locais) |
| `idModelPagina` | int | `IdModelPagina` (não populado pelo repo, vem 0) | n/a | Legado |

### Payload (Proc SQL — formato XML cru)

```xml
<GenericPagesModel xmlns:json="http://james.newtonking.com/projects/json">
  <Model>{...JSON serializado de TBmodel_pagina.DFvalor...}</Model>
  <Funcoes json:Array="true">
    <Funcao>
      <IdFuncao>...</IdFuncao>
      <IdPagina>...</IdPagina>
      <Valor>...</Valor>
    </Funcao>
    ...
  </Funcoes>
</GenericPagesModel>
```

> A proc retorna **todas** as `TBfuncao_model` (não filtra por `DFchave_pagina` — bug observado: usa `select * from #temp_funcoes_model` sem WHERE). O repositório .NET corrigiu isso filtrando explicitamente pelo `Chave`.

> O namespace `json:` sinaliza ao conversor `XmlToJsonNode` ([[xml-to-json-node]]) que `Funcoes` deve virar array (mesmo se houver só um filho).

## Estrutura das tabelas-base

### `acesso.TBmodel_pagina`

| Coluna | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `DFid_model_pagina` | INT IDENTITY | sim | PK | int>0 | identidade | sequence |
| `DFvalor` | NVARCHAR(MAX) | sim | **JSON string** da definição da página. Discriminadores são chaves presentes neste objeto (ver [[engine-schema-driven]]) | JSON válido após interpolação de `modelParams`; pode usar placeholders `dParam*` | Renderizado pelo `<GenericPages/>` | cadastro humano via AppBuilder (insert/update por `acesso.tabelas_temporarias_persistir`) |
| `DFchave_pagina` | NVARCHAR(255) | sim | Chave que casa com `TBpagina.DFchave` (1:1 esperado, embora a tabela não tenha UNIQUE constraint) | string única na prática | JOIN de resolução | cadastro |
| `DFcnpj_cliente` | NVARCHAR(14) | não | Discriminador de **tenancy**: model só vale para o cliente daquele CNPJ quando preenchido | CNPJ ou NULL | inferido: filtro adicional em variantes por cliente (não exercido pelo repo .NET atual — gap) | cadastro |
| `DFstatus` | NVARCHAR(10) | sim | Status do model | `H` (default) — significado a confirmar; provavelmente "homologado" vs outros estados como `R`(ascunho)/`I`(nativo) | inferido: filtro de visibilidade; **não consumido** pelo repo atual | cadastro |
| `DFdata_modificacao` | DATETIME | não | Auditoria — última edição | datetime | trilha | trigger / app |

> A tabela **não tem coluna `DFtipo`**. O nome de feature "dispatch por DFtipo" no manifest é **enganoso** — o dispatch real é por presença de chaves dentro do `DFvalor` JSON (ver [[engine-schema-driven]]).

### `acesso.TBfuncao_model`

| Coluna | Tipo | Obrigatório | Semântica |
|---|---|---|---|
| `DFid_funcao_model` | INT IDENTITY | sim | PK |
| `DFchave` | NVARCHAR(255) | não | Identificador da função (chamado pelo nome no JSON do model, ex.: `"useGenericFunction":"handle_cancelar_agendamento"`) |
| `DFchave_pagina` | NVARCHAR(255) | não | FK lógica para `TBpagina.DFchave` |
| `DFvalor` | NVARCHAR(MAX) | não | Código JS bruto |

### `acesso.TBmodel_parametro`

| Coluna | Tipo | Obrigatório | Semântica |
|---|---|---|---|
| `DFid_model_parametro` | INT IDENTITY | sim | PK |
| `DFchave` | NVARCHAR(100) | sim | Placeholder no JSON (`dParamX`) |
| `DFvalor` | NVARCHAR(MAX) | sim | Expressão JS a ser `eval`-ada |
| `DFchave_pagina` | NVARCHAR(50) | sim | FK lógica |

### Tabela auxiliar relacionada (mencionada, fora de escopo deste contrato)

- `acesso.TBauditoria_model_pagina` — histórico de alterações (DDL em `sources/.../criacao/acesso.TBauditoria_model_pagina.sql`).
- `appbuilder.TBtemplate_pagina` — templates de model oferecidos pelo AppBuilder no cadastro humano (8 entradas seed em `processa.appbuilder/1-alimentacao/insert_template_pagina.sql`).

## Sub-contratos

A taxonomia interna do `DFvalor` é cabe a [[engine-schema-driven]] (dispatch) e aos contratos por variante de página (F010-F022). Os 8 **templates seed** do AppBuilder (ver `insert_template_pagina.sql`) anunciam o universo:

| `DFchave` do template | `DFdescricao` | Chaves discriminantes no `DFvalor` | Renderer no front |
|---|---|---|---|
| `TemplateCadastro` | Cadastro | `genericform` + `filtro` + `datagrid` | `<GenericForm/>` + `<GenericGridPage/>` |
| `TemplateConsulta` | Consulta | `filtro` + `datagrid` | `<GenericGridPage/>` |
| `TemplateFormulario` | Formulário | `genericform` (sem grid) | `<GenericForm/>` standalone |
| `TemplateFormularioAcoes` | Formulário de Ações | `genericactionform` | `<GenericActionForm/>` |
| `TemplateGrids` | Grids | `genericgridcollection` | `<GenericGridCollection/>` |
| `TemplateIntegracao` | Integração | `pipeliner:true` + `genericform` | `<GenericForm/>` com flag pipeliner |
| `TemplatePaginaAbas` | Página de abas | `pageTabs:[]` | `<GenericTabPage/>` → array de `<GenericPage/>` |
| `TemplatePaginaArvore` | Página de árvore | `generictreeview` | `<GenericTreeView/>` |

Sub-contratos a criar (1 por discriminante — alimentam F010+):

- `model-valor-genericform.md`
- `model-valor-datagrid.md` / `model-valor-datagrid2.md`
- `model-valor-filtro.md`
- `model-valor-genericcalendar.md`
- `model-valor-genericactionform.md`
- `model-valor-genericgridcollection.md`
- `model-valor-generictreeview.md`
- `model-valor-pagetabs.md`
- `model-valor-buttons.md` (sub-bloco shared)
- `model-valor-pipeliner-flag.md`

## Relações com o ecossistema

- Consome de: `acesso.TBpagina` ([[menu-hierarquia]] e [[acl-papel-funcao-pagina]] documentam-na parcialmente), `acesso.TBaplicacao` (cross-app fallback).
- É consumido por: [[app-main]] (via `<GenericPages api='/model'>` no shell), [[engine-schema-driven]] (pipeline runtime).
- Escrito por: `acesso.tabelas_temporarias_persistir` (procedure de deploy de model em massa, alimentada por scripts SQL nas `alimentacao/` de cada módulo Processa — e.g. `processa.agendamento/alimentacao/model.gerenciar_agendamento.sql`).
- Editado por humanos via: UI do **AppBuilder** (`sources/engenharia--fabrica--javascript--react-tools/...` — rotas de cadastro de páginas; ver F026 no manifest).
- Conversor relacionado: [[xml-to-json-node]] (só relevante na variante SQL XML; na variante .NET atual o JSON já sai pronto).

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- **`Model` é string, não objeto**: o backend devolve `DFvalor` cru (string JSON), porque a interpolação de `modelParams` é feita **no cliente** via `replaceAll`. Parsear no servidor quebraria placeholders `dParamX` que ainda não foram resolvidos.
- **Interpolação é literal**: `replaceAll(chave, valor)` — se a chave aparece dentro de uma string-valor do JSON ou dentro de uma chave de objeto, é substituída igual. Não há escape. Convenção de nomes `dParam0..N` ou `#dParamX` evita colisão.
- **`modelParams.valor` é `eval`-ado**: cada parâmetro carrega uma **expressão JS** que roda no escopo do `evalModelDynamicParams`. O escopo expõe `getAclResourceCompanies` (do `useAcl`) — funções/dados extras viram contrato implícito do que o param pode acessar. Mudar esse escopo quebra páginas em produção.
- **Objetos como valor de param**: quando `eval(valor)` retorna `object`, a função monta uma sintaxe especial `#${...}#$"` e faz dois passos de `replaceAll` para limpar aspas de borda. Permite injetar **um objeto literal** no meio do JSON (chaves estarão dentro de aspas, valores idem). Padrão peculiar — provavelmente para listas de CNPJs/companhias.
- **`funcoes.valor` é `eval`-ado**: cada função carrega código JS bruto. `executeGenericFunctions(chave, args)` substitui `param0..N` no código antes do `eval`. Funções têm acesso ao escopo do `executeGenericFunctions` em `GenericPage.js`: `loggedUserData`, `userPreference`, `modelRef`, `useAclHook`, `useBlurHook`, `setCalendarCurrentFilter`, `cleanForm`, `getFormValues`, `danger`, `get`, `genericProps`, etc. Esse escopo é **API** das funções cadastradas — mudar nomes quebra páginas.
- **Cache**: nenhum. Cada navegação para uma rota chama `POST /api/model` novamente. `GenericPages` é `React.memo`, mas o `useEffect` de boot dispara em cada mount/path-change. O `setModel(null)` no início de `getModel` faz o conteúdo desaparecer durante o fetch (sem skeleton). Studio precisa decidir política própria de cache/stale.
- **Sem versionamento**: `TBmodel_pagina` é tabela viva — editou o `DFvalor`, próxima navegação já vê a nova versão. Auditoria pelo trigger em `TBauditoria_model_pagina` (sub-contrato a criar).
- **Sem tenancy ativa no fluxo .NET**: `DFcnpj_cliente` existe na tabela mas o repositório atual não filtra por CNPJ. Pode haver models duplicados por cliente que coexistem; o `.FirstOrDefault()` decide arbitrariamente. Gap conhecido.
- **`DFstatus` ignorado**: idem — coluna existe (default `H`), repositório não filtra. Models em outros status são entregues normalmente.
- **`idUsuario` no body é ruído**: o React envia, o Service ignora. Manter compatibilidade ou remover é decisão do Studio.
- **Cross-app fallback (`OR DFchave='processa'`)** vive **só no repositório .NET**, não na proc SQL. Studio precisa replicar para que páginas "core" funcionem em qualquer app.
  - **Asserção F042**: o backend Studio implementa o fallback em **duas etapas sequenciais**, não como OR combinado:
    1. `WHERE DFchave_aplicacao = @appKey AND DFcaminho = @path` (ou `DFchave_pagina = @pageKey` na variante por chave).
    2. Se 0 rows, segunda tentativa: `WHERE DFchave_aplicacao = 'processa' AND ...` mesmo predicado.
    O payload da resposta carrega `fellBack: boolean` discriminando se a segunda etapa foi usada. Frontend loga (não exibe banner — feature transparente). Divergência consciente do legado: o OR combinado original tornava cross-app indistinguível; o Studio é honesto sobre qual aplicação serviu o model.
- **Bug histórico da proc SQL**: `select * from #temp_funcoes_model` sem WHERE devolve **todas as funções de todas as páginas**. O front legado provavelmente filtra do lado dele ou aceita o desperdício. O caminho .NET já filtra corretamente.

## Asserção F042 — schema survey (2026-05-17)

Em decorrência do F088 (ui-tester observou `Invalid column name 'DFid_aplicacao'` ao executar a primeira etapa do fallback contra a base `DBdirector_Imperial_Logistica_29`), o legado foi escaneado em todas as bases candidatas no servidor `172.27.0.121\SQL2K19` (default port 1433, SQL auth `sl`):

| Métrica | Valor |
|---|---|
| Bases enumeradas (`DBdirector%` ∪ `DBaws%` ∪ `%processa%`, `state_desc='ONLINE'`) | 99 |
| Bases com tabela `acesso.TBmodel_pagina` | 90 |
| Bases sem a tabela (sub-projetos especializados) | 8 |
| Bases inacessíveis ao login `sl` | 1 (`DBdirector_xti_29_hom`) |
| **Bases com coluna `acesso.TBmodel_pagina.DFid_aplicacao`** | **0 (zero)** |
| Bases com coluna `acesso.TBmodel_pagina.DFchave_aplicacao` | 0 |

Conclusão dura: **a coluna `DFid_aplicacao` nunca existiu em `acesso.TBmodel_pagina`**. Não é caso atípico da Imperial; é o schema canônico do legado em 100% do parque. Idem para `DFchave_aplicacao`.

### Schema real e canônico de `acesso.TBmodel_pagina` (idêntico nas 90 bases amostradas)

```
DFid_model_pagina    int          NOT NULL  (IDENTITY PK)
DFvalor              nvarchar     NULL      (JSON serializado da página)
DFchave_pagina       nvarchar     NULL      (FK lógica para TBpagina.DFchave)
DFcnpj_cliente       nvarchar     NULL      (tenancy por CNPJ — não exercido)
DFstatus             nvarchar     NOT NULL  (default 'H' — não filtrado)
DFdata_modificacao   datetime     NULL      (auditoria)
```

A tabela **não tem coluna de aplicação**. A discriminação por aplicação só acontece via JOIN com `acesso.TBpagina`, que sim tem:

```
DFid_aplicacao        int          (FK para TBaplicacao — aplicação primária da página)
DFchaves_aplicacoes   nvarchar     (lista de chaves de aplicações onde a página também aparece — campo cross-app)
DFchave               nvarchar     (= TBmodel_pagina.DFchave_pagina, join key)
DFcaminho             nvarchar     (= path da rota)
```

### Implicação para F042/F088

A asserção original do F042 — "filtrar `TBmodel_pagina.DFchave_aplicacao` na etapa 1 e cair para `'processa'` na etapa 2" — **não tem base no schema do legado**. O contrato precisa ser reescrito segundo o modelo real:

- A separação por aplicação fica em `TBpagina`, não em `TBmodel_pagina`.
- O JOIN canônico é:
  `TBpagina t1 INNER JOIN TBmodel_pagina t2 ON t1.DFchave = t2.DFchave_pagina`
- O filtro de aplicação fica em `t1.DFid_aplicacao = @id_aplicacao` (após resolver `chave→id` via `TBaplicacao`).
- O fallback cross-app pode ser implementado de três formas que o legado usa coexistindo (verificar qual o Studio adota é decisão de design, fora do escopo do contrato):
  1. `OR` legado da proc/.NET: `t1.DFid_aplicacao = @id OR EXISTS(TBaplicacao WHERE DFchave='processa' AND DFid_aplicacao = t1.DFid_aplicacao)` (combina num único query).
  2. Two-step sequencial: query 1 com `@id_aplicacao` exato; se 0 rows, query 2 com `id` da aplicação `'processa'`.
  3. Via `TBpagina.DFchaves_aplicacoes` (campo string com lista de chaves separadas) — usado em algumas páginas core.

Saída do F088 indicada por este survey: **saída (b)** — reescrita do contrato para refletir o schema real, removendo qualquer menção a `TBmodel_pagina.DFid_aplicacao`/`DFchave_aplicacao`. Saída (a) (migration adicionando coluna) está descartada: criaria divergência entre Studio e legado em 100% das bases, não 1%.

### Notas de execução do survey

- Servidor real: `SERVERSQL\SQL2K19` (named instance via SQL Browser na default port 1433 com instance string).
- Conexão usada: `Server=172.27.0.121\SQL2k19;User Id=sl;Password=123;Encrypt=false;TrustServerCertificate=true` (SQL auth — Integrated Security falhou no handshake mesmo com VPN ativa).
- Probe: `SELECT COUNT(*) FROM [<db>].INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA='acesso' AND TABLE_NAME='TBmodel_pagina' AND COLUMN_NAME='DFid_aplicacao'` para cada base.
- 8 bases sem a tabela (registrar para escavações futuras de sub-projetos): `DBdirector_7_Setembro_29`, `DBdirector_Feijao_Pereira_29`, `DBdirector_Mais_Brasil_29`, `DBdirector_Munck_29`, `DBdirector_Oximil_29_Contabilidade`, `DBdirector_Sol_Neve_29`, `DBdirector_Tripicom_29`, `DBdirectorData_Bazinho`.

## Sources

- [[calendar/notes/2026-05-15.md]]
