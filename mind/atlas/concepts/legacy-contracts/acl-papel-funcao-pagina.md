---
title: "ACL por papel × função × página"
aliases: [acl-papel-funcao-pagina, acl-fina, acl-model, acl-permissoes, acl-funcoes-pagina]
tags: [contract, legacy, acl, sql, react-tools, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: ACL por papel × função × página

Modelo de **controle de acesso fino** do Processa legado: como o sistema decide **(a)** se um usuário pode entrar numa página, **(b)** se um módulo aparece no menu, **(c)** se um **botão / aba / função interna** de uma página fica disponível, e **(d)** em **quais empresas** a permissão vale.

Complementa [[menu-hierarquia]] (estrutura macro do menu) e [[acesso-obter-rotas-aplicacao]] (proc auxiliar de rotas flat). Este contrato é a **dimensão de permissão**, ortogonal à dimensão de navegação. As duas se cruzam no mesmo result-set retornado pela proc canônica [[acesso-obter-acl-token]].

> **Nota de coerência**: o manifest F008 lista `acesso.obter_acl_usuario_aplicacao.sql` como source. Esse arquivo existe e é catalogado aqui, mas **não é o source consumido pelo frontend React legado**. A proc canônica que entrega ACL fina (papéis ∪ recursos → módulos ∪ páginas ∪ funções, já resolvidos) é a **mesma `obter_acl_token`** usada pelo menu. O manifest deve ser corrigido (registrado no `progress-messages.txt`).

## Citações de fonte

### Tabelas (DDL)

- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBpapel.sql:1-10` — definição de papel (DFid_papel, DFdescricao, DFid_aplicacao). Unique constraint `(DFdescricao, DFid_aplicacao)`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBpapel_usuario_empresa.sql:1-10` — vínculo usuário × papel × empresas (CSV).
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBpapel_funcao_pagina_modulo.sql:1-11` — vínculo papel → (módulos, páginas, funções) como **três CSVs**.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBrecurso_adicional.sql:1-14` — "permissão extra" por usuário (bypass de papel), também por CSVs.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBfuncao.sql:1-18` — função (permissão fina): `DFid_funcao, DFtitulo, DFdescricao, DFid_paginas (CSV), DFid_modulos (CSV), DFid_aplicacao, DFchave`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBmodulo.sql:1-48` — módulo (visualizado como grupo no menu): `DFid_modulo, DFtitulo, DFcaminho, DFicone, DFexibir_menu, DFid_aplicacao, DFchave, DFordem, DFdata_inativacao`.
- [[tbpagina]] — definição da página (filha de módulo, com `DFexibir_menu`, `DFdata_inativacao`, `DFchave`).

### Procs

- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_acl_token.sql:118-138` — coleta de papéis (`#temp_papeis_usuario`) e recursos adicionais (`#temp_recursos_usuario`) do usuário na aplicação.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_acl_token.sql:151-165` — **branch super-user** (`@empresa = 'Processa' AND @id_usuario = 1`): insere TODOS os módulos, páginas e funções da aplicação sem filtro ACL.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_acl_token.sql:167-273` — loop sobre papéis e recursos adicionais, desempacotando CSVs `DFid_modulos`, `DFid_paginas`, `DFid_funcoes` via `Split(...)`. **União** (sem interseção): primeiro papel é base, demais agregam (`NOT IN (#temp_..._usuario)`).
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_acl_token.sql:295-314` — sub-query de `Empresas` por página: união de empresas vindas de papéis (cruzando `TBpapel_usuario_empresa` ∩ `TBpapel_funcao_pagina_modulo` que contém a página) com empresas vindas de `TBrecurso_adicional`. Resultado é CSV.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_acl_token.sql:315-327` — sub-query de `Funcoes` por página: `TBfuncao` cuja `DFid_paginas` (CSV) contém a página atual **E** cuja `DFid_funcao` está em `#temp_funcoes_usuario`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_acl_usuario_aplicacao.sql:1-69` — proc paralela, **magra**: retorna papéis crus (`Niveis`) e recursos crus (`Recursos`) sem resolução em módulos/páginas/funções.

### Frontend (consumidores)

- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:5` — chave única do storage: `'@director/acl'`.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:10-37` — `defaultMapper(dados)`: aplana o JSON do backend para `[{ name, to, icon, children: { route: [{ icon, name, to }] } }]`. **Descarta** funções, `empresas`, `key`, `visible`, `id`, `order`, `description`.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:39-56` — `getAclResourceCompanies(path)`: lê `aclPage.empresas` da página atual no storage. (Implica que algum **`customMapper` real preserva `empresas`** — `defaultMapper` não preserva → discrepância documentada em [[menu-hierarquia]].)
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:58-75` — `userHasAccessToRoute()`: verifica se a rota corrente está no ACL. **Implementação bugada** (`acl` é string aqui, não array — `forEach` não corre); só loga `'should navigate to home'`. Sem efeito real (não bloqueia navegação).
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:77-87` — `findPageConfig(value, _acl)`: procura página por `key` (= `DFchave` da página) dentro da árvore.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAcl.js:127-155` — `fetchAclAndPersist(aclSetup, ...)`: chama a proc configurada pelo host (default seria `obter_acl_token`) e persiste no storage. **Early-return se storage não-null** (cache de sessão).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/AuthRoute.js:97,104` — segundo caminho de carga: ACL **embarcado no token de autenticação** (`stringToken.split('|')[0]`), parsing `.routes.route`. Co-existe com o caminho via `fetchAclAndPersist`. Mesma chave de storage `@director/acl`.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useAclStorage.js:1-73` — `sanitize/restore/store` para o formato consumido pelo CoreUI `CSidebarNav*`. **Suporta até 3 níveis** (`route → _children → _children`), embora a proc só produza 2.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericTabPage.js:11,20-30` — **uso real de funções no front**: `findPageConfig(model.functionKey, _acl)` recupera a página, lê `_pageConfig.children.route.map(x => x.key)` (= chaves das **funções** acessíveis), e filtra as `pageTabs` do modelo via `x.functionKey`. **Conclusão**: abas e itens internos do modelo declaram `functionKey` (correspondente a `TBfuncao.DFchave`) e só aparecem se a chave está em `pageConfig.children.route[].key`. Aqui o `children` da página são **funções**, não sub-páginas (proc retorna funções como `Children` aninhadas dentro do nó `Route` da página).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPages/GenericPages.js:75-81,115` — caminho paralelo: a proc `obter_model_pagina` (não esta) retorna `funcoes` no payload (`{ model, modelParams, funcoes }`). Esse array vai pra `genericFunctionsArray` e é executado via `eval` em `GenericPage.js:83`. **Estas `funcoes` são funções de comportamento (scripts), não permissões.** Nome colidente, semântica diferente. Veja seção **Duas semânticas de "função"** abaixo.
- `sources/engenharia--fabrica--javascript--react-tools/src/contexts/AuthProvider.js:56` — logout limpa `@director/acl` do `sessionStorage`.

## Modelo de dados (entidades)

### `acesso.TBpapel` — papel

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `DFid_papel` | INT IDENTITY PK | sim | Identidade do papel | autoincremento | Chave estrangeira em todos os vínculos | gerado |
| `DFdescricao` | NVARCHAR(150) | sim | Nome humano do papel ("Administrador", "Operador", ...) | livre, único por `(descricao, aplicacao)` | Exibição em telas admin | cadastro |
| `DFid_aplicacao` | INT | não (NULL = papel global?) | Aplicação à qual o papel pertence | FK `TBaplicacao.DFid_aplicacao` | Filtra papéis por app na proc | cadastro |

> ressalva: `DFid_aplicacao` é nullable. > inferido: papel com `NULL` aqui é **global** (cross-app), mas a query `WHERE DFid_aplicacao = @id_aplicacao` na proc **descarta** papéis NULL — então na prática papel global não funciona via essa proc. TBD verificar no banco vivo se existem registros NULL.

### `acesso.TBpapel_usuario_empresa` — vínculo usuário ↔ papel ↔ empresas

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `DFid_papel_usuario_empresa` | INT IDENTITY PK | sim | Identidade do vínculo | autoincremento | — | gerado |
| `DFid_usuario` | INT | sim | Usuário | FK `TBusuario` | Filtro do papel por usuário | atribuição admin |
| `DFid_papel` | INT | sim | Papel | FK `TBpapel` | Resolução de páginas/funções | atribuição admin |
| `DFcod_empresas` | NVARCHAR(2048) | não | **CSV** de códigos de empresa onde o papel vale | ex: `"1,3,7"` | Filtra escopo de empresa por papel; computa `Empresas` por página | atribuição admin |

> A tabela permite **N papéis por usuário** dentro de uma mesma app (uma linha por papel). Não há constraint unique — duplicatas possíveis.
> ressalva: `DFcod_empresas` é **CSV** (não tabela de junção). Mudanças em N de empresas exigem update do campo inteiro.

### `acesso.TBpapel_funcao_pagina_modulo` — vínculo papel → recursos

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `DFid_papel_funcao_pagina_modulo` | INT IDENTITY PK | sim | Identidade | autoincremento | — | gerado |
| `DFid_papel` | INT | sim | Papel | FK `TBpapel` | Indexa o set de recursos do papel | cadastro |
| `DFid_paginas` | NVARCHAR(2048) | não | **CSV** de IDs de páginas acessíveis pelo papel | ex: `"12,45,78"` | Páginas que o usuário com esse papel pode entrar | cadastro admin |
| `DFid_modulos` | NVARCHAR(2048) | não | **CSV** de IDs de módulos visíveis | ex: `"3,5"` | Módulos que aparecem no menu | cadastro admin |
| `DFid_funcoes` | NVARCHAR(2048) | não | **CSV** de IDs de funções (permissões finas) | ex: `"101,102,205"` | Funções (ex: "Editar", "Excluir", "Aprovar") disponíveis nas páginas | cadastro admin |

> ressalva: a tabela **não tem constraint unique** em `DFid_papel` — papel **pode aparecer múltiplas vezes**. > inferido: a proc faz `SELECT ... WHERE DFid_papel = ...` sem `TOP 1` ou agregação, então se houver mais de uma linha o resultado é **não-determinístico** (a sub-query escalar `(SELECT DFid_paginas FROM ... WHERE DFid_papel=X)` falha com "more than one row"). Convenção implícita: **uma linha por papel**.

> ressalva: nome do campo `DFid_paginas` (plural) embute o CSV — convenção de nomenclatura do legado.

### `acesso.TBrecurso_adicional` — permissão extra por usuário

Mesmo shape de `TBpapel_funcao_pagina_modulo`, mas indexada por **usuário direto** (sem passar por papel). É o "bypass" do modelo de papéis — permissões pontuais.

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `DFid_recurso_adicional` | INT IDENTITY PK | sim | Identidade | autoincremento | — | gerado |
| `DFid_usuario` | INT | sim | Usuário alvo | FK `TBusuario` | Filtro | cadastro |
| `DFid_aplicacao` | INT | não | App alvo | FK `TBaplicacao` | Filtro | cadastro |
| `DFid_modulos` | NVARCHAR(2048) | não | CSV de módulos extras | — | União com módulos vindos de papéis | cadastro |
| `DFid_paginas` | NVARCHAR(2048) | não | CSV de páginas extras | — | União | cadastro |
| `DFid_funcoes` | NVARCHAR(2048) | não | CSV de funções extras | — | União | cadastro |
| `DFcod_empresas` | NVARCHAR(2048) | não | CSV de empresas onde o recurso vale | — | Compõe `Empresas` por página | cadastro |

> Pode haver N linhas por usuário/aplicação (a proc itera). Não há unique constraint.

### `acesso.TBfuncao` — função (permissão fina ou ação)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `DFid_funcao` | INT IDENTITY PK | sim | Identidade | autoincremento | Referenciada nos CSVs de papel/recurso | gerado |
| `DFtitulo` | NVARCHAR(255) | não | Nome humano da função ("Editar", "Aprovar pedido", ...) | livre | Exibição em admin | cadastro |
| `DFdescricao` | NVARCHAR(255) | não | Descrição | livre | tooltip / admin | cadastro |
| `DFid_paginas` | NVARCHAR(2048) | não | **CSV** de páginas onde a função se aplica | ex: `"12,45"` | Liga função → páginas; proc só retorna função na página se a página está nesse CSV | cadastro |
| `DFid_modulos` | NVARCHAR(2048) | não | **CSV** de módulos (uso real TBD) | — | > inferido: paralelo a `DFid_paginas` mas em granularidade de módulo; **não consumido por `obter_acl_token`** | cadastro |
| `DFid_aplicacao` | INT | não | App da função | FK | Filtra `#temp_funcoes` na proc | cadastro |
| `DFchave` | NVARCHAR(255) | não (ADD column, post-create) | **Chave técnica** estável para checks programáticos | snake_case ou kebab | Usada em `findPageConfig` no front: `pageTab.functionKey` casa com `funcao.DFchave` | cadastro |

> A `DFchave` é a **API pública** da função. Renomear quebra checks no front (que matcham por `functionKey === DFchave`). Renomear DFtitulo só muda o label admin.

> ressalva: campo `DFchave` foi adicionado depois (`ALTER TABLE ADD`). Funções antigas podem ter `DFchave = NULL`. > inferido: funções sem chave **não podem ser checadas pelo front** (matching seria contra `undefined`).

### `acesso.TBmodulo` — módulo (grupo no menu)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `DFid_modulo` | INT IDENTITY PK | sim | Identidade | autoincremento | Referenciado em CSVs de papel/recurso e em `TBpagina.DFid_modulo` | gerado |
| `DFtitulo` | NVARCHAR(255) | não | Nome no menu | livre | exibição | cadastro |
| `DFdescricao` | NVARCHAR(255) | não | Tooltip / aria-label > inferido | livre | a11y | cadastro |
| `DFcaminho` | NVARCHAR(255) | não | Rota do módulo (geralmente vazio — módulos são grupos) | hash-route | exposto como `To` mas raramente navegado pelo menu | cadastro |
| `DFicone` | NVARCHAR(100) | não | Classe CSS de ícone | ex: `"cil cil-folder"` | render do ícone do grupo | cadastro |
| `DFexibir_menu` | BIT | sim | Mostra/oculta no menu | 0/1 | **Não respeitada pelo `defaultMapper` do legado**; nova impl do Studio filtra (F007) | cadastro |
| `DFid_aplicacao` | INT | não | App do módulo | FK | filtro principal | cadastro |
| `DFchave` | NVARCHAR(255) | não (added post-create, UNIQUE) | Chave técnica única global | snake_case | identificador estável; `UK_acesso_TBmodulo_DFchave` | cadastro |
| `DFchaves_aplicacoes` | NVARCHAR(255) | não (added post) | CSV de chaves de aplicações > inferido | — | > inferido: módulo cross-app? Não consumido por `obter_acl_token` | cadastro |
| `DFdata_inativacao` | DATETIME | não (added post) | Soft-delete | NULL = ativo | Proc filtra `DFdata_inativacao IS NULL` (módulos inativos somem do menu) | admin |
| `DFordem` | INT | não (added post) | Ordenação no menu | int | Proc ordena por `DFordem ASC` com fallback `DFtitulo` | cadastro |

## Regras de resolução (algoritmo da proc)

A proc canônica `acesso.obter_acl_token` resolve a ACL fina em **4 passos** (vide [[acesso-obter-acl-token]] para detalhe completo, aqui só o que importa pra F008):

### Passo 1 — Carregar universo da aplicação

- `#temp_modulos` ← `TBmodulo WHERE DFid_aplicacao = @id_aplicacao AND DFdata_inativacao IS NULL`, **ordenado por `DFordem`**.
- `#temp_paginas` ← `TBpagina WHERE DFid_aplicacao = @id_aplicacao AND DFdata_inativacao IS NULL`, idem.
- `#temp_funcoes` ← `TBfuncao WHERE DFid_aplicacao = @id_aplicacao`. > ressalva: não filtra `DFdata_inativacao` (a tabela `TBfuncao` não tem esse campo).

### Passo 2 — Carregar vínculos do usuário

- `#temp_papeis_usuario` ← `TBpapel ∩ TBpapel_usuario_empresa` para `(DFid_usuario, DFid_aplicacao)`, row-numbered.
- `#temp_recursos_usuario` ← `TBrecurso_adicional` para `(DFid_usuario, DFid_aplicacao)`, row-numbered.

### Passo 3 — Resolver módulos / páginas / funções acessíveis

Cria três temps: `#temp_modulos_usuario`, `#temp_paginas_usuario`, `#temp_funcoes_usuario`.

**Branch super-user** (`@empresa = 'Processa' AND @id_usuario = 1`):
- Insere **todos** os módulos, páginas e funções da aplicação. Sem filtro de ACL. Bypass total.

**Branch normal**:
- Loop sobre cada papel em `#temp_papeis_usuario`:
  - Lê `DFid_modulos`, `DFid_paginas`, `DFid_funcoes` da única linha em `TBpapel_funcao_pagina_modulo WHERE DFid_papel = ...`.
  - Faz `Split(csv, ',')` e insere em cada temp respectiva, **deduplicando** (`WHERE NOT IN`).
- Loop sobre cada recurso adicional em `#temp_recursos_usuario`:
  - Mesmo procedimento, união dedupe.

> ressalva: módulo `0` ("Home") é pre-inserido em `#temp_modulos_usuario` (linha 143 da proc). Padrão histórico — não há módulo com id=0 (TBmodulo é IDENTITY iniciando em 1), então é insert sem efeito. > inferido: vestígio de feature antiga.

> ressalva: **a regra é UNIÃO, não interseção**. Se o usuário tem papéis A e B, recebe `paginas(A) ∪ paginas(B) ∪ paginas(recursos_adicionais)`. **Não há revogação possível** — adicionar um papel só pode adicionar permissões, nunca remover.

> ressalva: **CSVs degradam**. Se `DFid_paginas = "12,45,abc,78"`, `Split` pode pular `'abc'` ou produzir erro silencioso (depende da implementação da UDF `Split`). TBD revisar `dbo.Split` no banco vivo.

### Passo 4 — Projetar XML aninhado

`SELECT FOR XML PATH('Route'), ROOT('Routes')` produz:

```
Routes
├── Route (= Módulo)
│   ├── @json:Array='true'
│   ├── Id, To, Name, Description, Icon, Visible, Key, Order
│   └── Children
│       ├── Route (= Página)
│       │   ├── Id, To, Name, Description, Icon, Visible, Order, Key
│       │   ├── Empresas (string CSV, ver abaixo)
│       │   └── Children
│       │       ├── Route (= Função)
│       │       │   ├── Id, Name, Key
```

Filtros aplicados na projeção:

- Módulo: `INNER JOIN #temp_modulos_usuario` — só módulos do user.
- Página: `INNER JOIN #temp_paginas_usuario` **E** `Pagina.DFid_modulo = Modulo.DFid_modulo` (agrupa página dentro do módulo correto).
- Função: `Pagina.DFid_pagina IN Split(Funcao.DFid_paginas, ',')` **E** `Funcao.DFid_funcao IN #temp_funcoes_usuario` — só funções vinculadas à página atual E acessíveis pelo user.

### Sub-query `Empresas` por página

Para cada página retornada, computa CSV de códigos de empresa em que o user tem acesso àquela página:

```
UNION
  - acesso.TBpapel_usuario_empresa.DFcod_empresas
    onde papel do user contém a página em DFid_paginas
  - acesso.TBrecurso_adicional.DFcod_empresas
    onde recurso do user contém a página em DFid_paginas
```

Resultado: `"1,3,7"` (ou string vazia se não houver).

> ressalva: o CSV final pode ter **duplicatas** (UNION distincta linhas mas concatena via `FOR XML PATH('')` sem dedupe textual). > inferido: front precisa fazer `split(',').dedupe()` se for usar.

> ressalva: empresa vazia em `Empresas` **não significa "todas"** — significa que nenhum vínculo (papel ou recurso) tinha `DFcod_empresas` preenchido. Semântica de "vazio = todas" é convenção do consumidor, **não da proc**. > inferido: confirmação no banco vivo recomendada.

## Saída para o frontend (formato JSON após conversão XML→JSON do `.NET`)

O backend `.NET` converte o XML via Newtonsoft com namespace `[json:Array]='true'` (já documentado em [[menu-hierarquia]]). O frontend recebe:

```
{
  acl: {
    modulos: [
      { id, key, titulo, descricao, icone, caminho, visible, order,
        paginas: [
          { id, key, titulo, descricao, icone, caminho, visible, order,
            empresas: "1,3,7",
            funcoes: [
              { id, titulo, key }
            ]
          }
        ]
      }
    ]
  }
}
```

> ressalva: os nomes finais dos campos JSON (`titulo` vs `Name`, `caminho` vs `To`, `funcoes` vs `Funcoes`) dependem do conversor. O `defaultMapper` em `useAcl.js` confirma **camelCase em português**: `titulo`, `caminho`, `icone`, `paginas`. > inferido: `funcoes` segue o mesmo padrão (lowercase + plural). Confirmar no `.NET` pipeline.

## Consumo no frontend legado

### Quatro mecanismos distintos (importante)

O front legado usa ACL em **quatro lugares com objetivos diferentes**:

1. **Menu** ([[menu-hierarquia]]): renderiza módulos + páginas. **Funções e empresas descartadas** pelo `defaultMapper`. Só vê o que está visível.
2. **Filtro de abas de página** (`GenericTabPage.js:14-45`): dentro de uma página com `pageTabs`, filtra cada aba pela `functionKey` — só renderiza aba se `pageTab.functionKey` está em `pageConfig.children.route[].key`. **Aqui `children.route` da página são funções**, não sub-páginas. Esta é a checagem ACL fina principal exercida no UI.
3. **Filtro de empresas** (`useAcl.getAclResourceCompanies(path)`): retorna o CSV `aclPage.empresas` da página atual. Usado pra restringir seletor de empresa ou parametrizar queries por escopo. > inferido: `defaultMapper` **não preserva `empresas`** — então este caminho **só funciona com `customMapper`** que preserve o campo. TBD identificar `customMapper` ativo em produção (provavelmente no host `.NET` que serve o react-tools).
4. **Bloqueio de rota** (`useAcl.userHasAccessToRoute()`): **bugado** — `acl` é string, `forEach` não executa. Sem efeito real. **Não há bloqueio funcional de navegação por ACL no front**. Usuário com URL direta entra na página (o backend é que deve bloquear na chamada de `obter_model_pagina`). > inferido: bug histórico ou feature abandonada.

### Dois caminhos de carga

A ACL chega ao `sessionStorage['@director/acl']` por **duas vias** (ver `app-main.md` para boot):

- **Via 1 — Token-embedded** (`AuthRoute.js:97,104`): após login OAuth, o token (`tkn`) contém o ACL serializado já no formato `[{ name, to, icon, children: { route: [...] } }]`. `AuthRoute` decodifica e grava direto no storage. **Sem chamada de proc adicional.** Provavelmente o backend de auth chama `obter_acl_token` na hora do login.
- **Via 2 — Lazy fetch** (`useAcl.fetchAclAndPersist`): se o storage estiver vazio, faz POST para a proc definida em `aclSetup.proc` (e aplica `aclSetup.customMapper` se houver). Early-return se já tem cache.

> ressalva: as duas vias usam a **mesma chave de storage**. Se ambas executam, a segunda pula (early-return). Convenção: token-embedded vence.

### Storage canônico

- Chave: `'@director/acl'` em `sessionStorage`.
- Vida: sessão (limpa em logout via `AuthProvider.js:56`).
- Sem TTL, sem revalidação. Mudanças no banco só aparecem após logout/login.
- Shape: ver `defaultMapper` (legado) — pode ser sobrescrito por `customMapper`.

## Duas semânticas de "função" (atenção!)

Há **dois usos do termo "função"** no legado, com semânticas diferentes:

| Semântica | Origem | Tabela | Tipo | Como é checada | Onde aparece |
|---|---|---|---|---|---|
| **Função-permissão** (ACL fina) | `obter_acl_token` | `acesso.TBfuncao` | metadata: `{ id, titulo, chave }` | match de `DFchave` contra `functionKey` declarada no modelo de página | filtro de `pageTabs`, > inferido botões/ações dentro do GenericPage |
| **Função-comportamento** (script JS) | `obter_model_pagina` | embebida no `DFconfig` da página | código JS em string (`{ chaveFuncao, valor: "código eval()" }`) | `eval(funcaoStr)` em `GenericPage.js:93` | callbacks de botão, lógica reativa do formulário |

> **Confusão proposital ou acidental do legado**: ambas usam a palavra "função". A `TBfuncao` (ACL) declara **permissões**; o array `funcoes` no payload de `obter_model_pagina` declara **scripts executáveis**. **Não há ligação direta** entre os dois — `chaveFuncao` do script não precisa existir em `TBfuncao`. Studio precisa decidir se mantém os dois conceitos separados ou unifica.

> escopo: F008 trata apenas da **função-permissão**. Função-comportamento entra em F009 / F010 (engine schema-driven).

## Caso especial: super-user (Processa empresa, user id=1)

Branch dedicado na proc (`obter_acl_token.sql:151-165`):

```
IF @empresa = 'Processa' AND @id_usuario = 1
  → #temp_modulos_usuario  := TODOS módulos da app
  → #temp_paginas_usuario  := TODAS páginas da app
  → #temp_funcoes_usuario  := TODAS funções da app
```

Implicações:

- **Identificação**: `@empresa` é string (case-sensitive: `'Processa'` com P maiúsculo). `@id_usuario` é o INT 1 fixo. Combinação dupla — qualquer um dos dois faltando vai pro branch normal.
- **Escopo**: super-user é **por aplicação**. Vê tudo de uma app, mas precisa re-logar com outra `chaveAplicacao` pra ver outra. O loop não cruza apps.
- **Sem revogação**: não há flag pra suspender o super-user sem mudar dados (deletar/renomear o user 1 ou mudar `empresa` do contexto).
- **Empresa "Processa"**: a string vem do contexto de autenticação (não do banco diretamente). > inferido: vem de `TBaplicacao` ou de `principal.nomeEmpresa` no `.NET`.

> ressalva: > inferido — a Smith (F007) já tratou esse branch: quando o user logado é PROCESSA, usa `empresa='Processa'`; demais usam `principal.nomeEmpresa`. Mesma regra vale pra F008.

## Outros mecanismos paralelos no legado

### `acesso.obter_acl_usuario_aplicacao` (proc magra)

Retorna **apenas** papéis + recursos crus do usuário, **sem resolver** em módulos/páginas/funções. Saída XML:

```
ACL
├── Niveis (array): { IdPapel, Descricao, Empresas }
└── Recursos (array): { Id, Modulos (CSV), Paginas (CSV), Funcoes (CSV), Empresas }
```

> inferido (consumo): não há match dela em `react-tools` indexado. Provavelmente consumida por:
> - telas admin de cadastro (mostrar papéis atribuídos a um usuário)
> - backend `.NET` para checks server-side
> - ferramentas de auditoria
> TBD verificar no `.NET` e no banco vivo (`sys.dm_exec_procedure_stats`).

**Conclusão**: para F008 (ACL fina no Studio), a proc canônica continua sendo `obter_acl_token`. `obter_acl_usuario_aplicacao` é útil só se Studio precisar dos papéis crus (ex: tela de admin mostrando "este user tem papéis A, B, C").

### Empresas como dimensão de escopo

O CSV `DFcod_empresas` em `TBpapel_usuario_empresa` e `TBrecurso_adicional` é **escopo de dados**, não escopo de UI:

- A ACL diz "user pode entrar na página de Pedidos".
- O `DFcod_empresas` diz "mas só dos pedidos das empresas 1, 3, 7".
- A página, ao consultar pedidos, deve passar o filtro de empresa.

> ressalva: a proc concatena empresas de **todos** os papéis/recursos que dão acesso à página, sem hierarquia. Se papel A dá empresas 1,3 e recurso adicional dá empresa 7, o user vê 1,3,7. **Sem precedência papel > recurso.**

## Sub-contratos relacionados

- [[acesso-obter-acl-token]] — TBD criar contrato dedicado da proc (atualmente só citada em [[menu-hierarquia]] e neste). Conteúdo principal já está nessas duas notas.
- [[tbpagina]] — entidade base referenciada nas CSVs.

## Relações com o ecossistema

- Consome de: [[tbpagina]], `acesso.TBaplicacao`, `acesso.TBusuario`.
- É consumido por: [[menu-hierarquia]] (mesmo result-set), [[app-main]] (storage `@director/acl`), `GenericTabPage` (filtro de abas), `useAcl.getAclResourceCompanies` (escopo de empresa).
- Procedures relacionadas: [[acesso-obter-rotas-aplicacao]] (rotas flat, sem funções), `acesso.obter_acl_usuario_aplicacao` (papéis/recursos crus), `acesso.obter_model_pagina` (carrega `funcoes` de comportamento, **não** de ACL).
- Storage: `sessionStorage['@director/acl']` — mesma chave usada por menu; ACL fina é parte do mesmo blob.

## Notas de implementação para o Studio

- **Proc canônica de F008 é `obter_acl_token`**, mesma de F007. Manifest deve apontar pra ela (correção pendente). Resultado: uma chamada cobre menu **e** ACL fina.
- **Quatro dimensões a expor** no Studio (todas presentes na proc): módulos visíveis, páginas acessíveis, **funções por página**, **empresas por página**. F007 só usou as duas primeiras (descartou funções/empresas como o `defaultMapper`); F008 precisa preservar as quatro.
- **`customMapper` é a chave**: para reaproveitar o fetch já implementado em F007 (`useMenu`/endpoint `/api/menu/routes`), F008 pode estender o normalizador para também emitir `funcoes` e `empresas` por página, ou criar endpoint separado `/api/acl/me` que retorne shape ACL-completo.
- **Checks de função** acontecem por `DFchave` (string). Modelo de página declara `functionKey` no shape `pageTab` (e outros). Smith deve expor API tipo `hasFunction(pageKey, functionKey)` ou `canX(functionKey)` no contexto da página corrente.
- **Bloqueio de rota**: o legado **não bloqueia** (bug em `userHasAccessToRoute`). Studio precisa decidir: bloquear no router (front) ou só no backend (proc `obter_model_pagina` retorna 403). Recomendação > inferido: bloquear no front para UX, e backend como garantia.
- **Branch super-user**: replicar a regra `empresa='Processa' AND id_usuario=1` (já feita em F007 — reaproveitar). Studio pode considerar generalizar via flag explícita em `TBusuario` no futuro, mas isso é mudança de modelo, não de contrato.
- **Empresas (CSV)**: precisa ser exposto por página. Decidir formato no Studio (CSV vs array vs Set) — recomendação > inferido: array de strings na API, normalizado no parse.
- **Ordenação**: módulos e páginas ordenam por `DFordem ASC` com fallback `DFtitulo`. Funções **não ordenam** na proc — saem na ordem do `INNER JOIN`. > inferido: aceitar ordem do banco; se UI precisar ordem estável, ordenar no front.
- **Inativação**: `TBmodulo.DFdata_inativacao` e `TBpagina.DFdata_inativacao` filtram do universo (não retornam). `TBfuncao` **não tem `DFdata_inativacao`** — funções "obsoletas" continuam aparecendo se vinculadas. Se Studio quiser soft-delete de função, é mudança de schema (TBD curator).
- **Confusão de "funções"**: documentar claramente no Studio que `TBfuncao` é permissão, e que `obter_model_pagina.funcoes` é script. Talvez renomear um dos dois conceitos pra evitar bug humano.
- **CSV em todo lugar**: 5 colunas críticas usam CSV (`DFid_paginas`, `DFid_modulos`, `DFid_funcoes`, `DFcod_empresas`, `DFchaves_aplicacoes`). Qualquer ferramenta de admin que edite ACL precisa lidar com isso (ou migrar para tabelas de junção normalizadas — mudança grande, fora do escopo de cutover).

## Sources

- [[calendar/notes/2026-05-15.md]]
