---
title: "acesso.TBmodel_parametro (parâmetros dinâmicos `dParamX` do model)"
aliases: [tbmodel-parametro, model-parametro, dparam, dparam-interpolation, model-params]
tags: [contract, legacy, acesso, sql, react-tools, director-studio, eval, dparam]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: `acesso.TBmodel_parametro` (placeholders `dParamX` e interpolação no fetch do model)

Tabela do schema `acesso.*` que guarda **expressões JS por página** cujo resultado é interpolado **literal-textualmente** no JSON do model **antes** do `JSON.parse` no cliente. É o **segundo dos 3 pontos de `eval`** do engine schema-driven (ver [[engine-schema-driven]] §"Como `funcoes` (eval JS) entram no fluxo"), distinto de [[tbfuncao-model]] que é executado **N vezes por interação** — `TBmodel_parametro` roda **uma vez por fetch** do model.

A função do mecanismo é parametrizar o **JSON** do `TBmodel_pagina.DFvalor` por contexto do usuário/sessão (CNPJ logado, empresas da ACL, configs locais), sem que o backend conheça esse contexto. O resultado: a página chega no front com `dParam1`, `dParam2`, … no meio do JSON, e o `<GenericPages/>` substitui cada um pelo `eval(DFvalor)` correspondente antes de parsear.

## Citações de fonte

- `sources/engenharia--fabrica--sql--portal-director/portal.director/criacao/acesso.TBmodel_parametro.sql:1-11` — DDL da tabela (no `portal.director`).
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/0-criacao/acesso.TBmodel_parametro.sql:1-11` — DDL replicada no scriptpack do AppBuilder (idêntica).
- `sources/engenharia--fabrica--sql--processa-appbuilder/appbuilder/0-criacao/acesso.TBmodel_parametro.sql` — idem em outro repo (paridade).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPages/GenericPages.js:26-58` — `evalModelDynamicParams`: consumidor único do payload, faz `eval(param.valor)` + `replaceAll(param.chave, valor)`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPages/GenericPages.js:70-77` — chamada `evalModelDynamicParams(modelParams, model)` dentro de `getModel`, anterior ao `JSON.parse`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Repositories/GenericPagesRepository.cs:36-45` — query que carrega o array `ModelParams` no payload `/api/model`.
- `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.tabelas_temporarias_persistir.sql:130-151` — caminho de escrita (UPSERT idempotente via `##TempModelParametro`).
- `sources/engenharia--fabrica--sql--portal-aws/agent/alimentacao/insert_pagina_gerenciar_agendamento.sql` — seed produção (módulo agent).
- `sources/engenharia--fabrica--sql--portal-aws/agent/alimentacao/insert_pagina_realizar_agendamento.sql:1-60,265-285,373,428-435` — seed + uso de `dParamX` dentro do JSON do model.
- `sources/engenharia--fabrica--sql--portal-aws/agent/alimentacao/insert_pagina_consultar_agendamento.sql` — seed produção.
- `sources/engenharia--fabrica--sql--portal-aws/agent/alimentacao/insert_pagina_itens_sem_picking.sql` — referência (não cadastra params, só consome via outro fluxo).

## DDL

```sql
CREATE TABLE acesso.TBmodel_parametro (
  DFid_model_parametro INT IDENTITY PRIMARY KEY,
  DFchave              NVARCHAR(100),
  DFvalor              NVARCHAR(MAX),
  DFchave_pagina       NVARCHAR(50)
)
```

| Coluna | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `DFid_model_parametro` | INT IDENTITY | sim | PK técnica | int>0 | identidade | sequence |
| `DFchave` | NVARCHAR(100) | sim (na prática) | **Placeholder textual** a ser substituído no JSON do model. Convenção `dParam1..N` ou `#dParamX`. Sem unicidade declarada — o seed depende de (`DFchave_pagina`, `DFchave`) ser único, mas a tabela não força | em produção: `dParam1`..`dParam8` (faixa observada) | Argumento de `replaceAll(chave, valor)` em `GenericPages.js:48,51` | seed SQL ou AppBuilder UI |
| `DFvalor` | NVARCHAR(MAX) | sim | **Expressão JS** (não trecho de código com `;`/`return`) — uma única expressão que, quando passada a `eval(...)` no escopo do `evalModelDynamicParams`, devolve o valor a interpolar | qualquer expressão JS válida; tipos retornados em produção: `string`, `boolean`, `null`, `object` (POJO 1 nível) | `eval(DFvalor)` no cliente; resultado vira string interpolada (caso simples) ou pseudo-literal `#${"k":"v",...}#$` (caso object) | seed SQL ou AppBuilder UI |
| `DFchave_pagina` | NVARCHAR(50) | sim | FK lógica para `acesso.TBpagina.DFchave` (= `TBmodel_pagina.DFchave_pagina`). Tamanho 50 aqui vs 255 em `TBmodel_pagina` é divergência presente no schema (gap) | string conforme `TBpagina.DFchave` | Filtro no `WHERE` do repositório .NET (`GenericPagesRepository.cs:42`) | seed |

> **Sem FK explícita, sem UNIQUE, sem índice**. O UPSERT do `tabelas_temporarias_persistir` usa `(DFchave_pagina, DFchave)` como chave lógica para distinguir UPDATE vs INSERT (`acesso.tabelas_temporarias_persistir.sql:130-151`). Atomicidade depende disso ser único de fato — invariante mantido por convenção, não por constraint.

## Como o react-tools usa (consumo no fetch)

Pipeline relevante em `GenericPages.js:60-94`:

```
[2]  POST /api/model { caminho, chaveAplicacao, idUsuario }
       └─ backend devolve { model: string, modelParams: ModelParam[], funcoes: Funcao[] }
[4]  evalModelDynamicParams(modelParams, model)
       └─ para cada param em ordem do array:
            dParamValue = eval(param.valor)         // contexto léxico abaixo
            if (typeof dParamValue === "object" && dParamValue != null) {
              // monta pseudo-literal: `#${"k":"v","k2":"v2"}#$`
              model = model.replaceAll(param.chave, registro)
              model = model.replaceAll('"#$', '').replaceAll('#$"', '')   // remove aspas que sobraram nas bordas
            } else {
              model = model.replaceAll(param.chave, dParamValue)         // string/boolean/null/number → coerção implícita
            }
[5]  JSON.parse(modelString)
```

### Ordem de resolução

- Array `modelParams` chega do backend **na ordem do SQL** (`GenericPagesRepository.cs:36-45` — sem `ORDER BY`, então é ordem natural do storage engine; **gap**: não há garantia de ordem estável). Em produção observa-se ordem por `DFid_model_parametro` ascendente.
- O `forEach` aplica `replaceAll` sequencialmente — se `dParam1` aparecer dentro do valor produzido para `dParam0`, esse `dParam1` também seria interpolado na rodada seguinte (ordem importa, mas convenção evita colisão).
- A substituição é **literal global** sem AST/escape: o token `dParam1` é substituído em qualquer posição (chave de objeto, valor string, número, dentro de outra palavra). Convenção dos nomes (`dParam` + dígito) é o que impede colisão acidental.

### Contexto léxico disponível ao `eval`

O `eval` roda dentro de `evalModelDynamicParams`, que é closure do componente `GenericPages`. O escopo léxico expõe:

| Símbolo | Origem | Uso observado em produção |
|---|---|---|
| `getAclResourceCompanies` | `useAcl()` em `GenericPages.js:19` | usado em 3 das 18 linhas (filtro CNPJ na ACL) |
| `loggedUserData` | `JSON.parse(localStorage.getItem('@director/usr'))` em `GenericPages.js:20` | usado em 15 das 18 linhas (CNPJ, email, usuário, flag `fornecedorCNPJ`, flag `usuarioSupply`) |
| `localStorage` (global) | browser | usado em 1 linha (`@director/configs`) |
| `JSON` (global) | browser | usado em 1 linha (`JSON.parse(localStorage.getItem(...))`) |
| `console` (global) | browser | (não exercido) |
| `window` (global) | browser | (não exercido) |
| `dParam` (loop var) | `forEach` | (não exercido — seria padrão) |

> Esse escopo **é API implícita**. Qualquer renomeação/remoção em `GenericPages.js` quebra páginas em produção sem aviso (parse silenciosamente engole erro via `try/catch` em `GenericPages.js:54-56`).

### Pseudo-literal para objetos

Quando `eval` retorna POJO:

```
dParamValue = { usuarioSupply: "true", responsavelCnpj: "12345678000100", emailUsuarioLogado: "x@y" }
registro    = '#${"usuarioSupply": "true","responsavelCnpj": "12345678000100","emailUsuarioLogado": "x@y"}#$'
model = model.replaceAll("dParam3", registro)
model = model.replaceAll('"#$', '').replaceAll('#$"', '')
```

A motivação: se o JSON tem `"genericFormAdditionalBodyParam": "dParam3"` (string), depois da substituição vira `"genericFormAdditionalBodyParam": "#${"usuarioSupply":"true",...}#$"` e a limpeza de aspas externas (`'"#$'` e `'#$"'`) transforma em `"genericFormAdditionalBodyParam": {"usuarioSupply":"true",...}` — um **objeto inline** no JSON parseável.

> Implicação: **a posição do `dParamX` no template precisa estar entre aspas duplas** (i.e., parecer string) para o truque funcionar. Em qualquer outra posição (chave de objeto, valor não-string, dentro de array), o resultado é JSON inválido.

> Valores com aspas duplas no conteúdo (ex.: `value.includes('"')`) **quebram o parse** — o `replaceAll` não escapa. Em produção não foi observado.

### Onde os `dParamX` aparecem no JSON do model

Observado em `insert_pagina_realizar_agendamento.sql` (mesma página, do seed agent):

| Posição no template | Padrão | Exemplo |
|---|---|---|
| Valor de prop booleana | `"required": "dParam2"` | string substituída por `true`/`false` literal → coerção JSON sucede |
| Valor de prop string com interpolação | `"api": "/empresas?codEmpresas=dParam1"` | string substituída inline — vira `/empresas?codEmpresas=null` ou `/empresas?codEmpresas=12345` |
| Valor inteiro de prop string | `"value": "dParam5"` | substituído por string vazia, CNPJ, etc. |
| Slot de objeto inline | `"genericFormAdditionalBodyParam": "dParam3"` | usa pseudo-literal `#${...}#$` para injetar POJO no lugar |
| Lista de IDs como parâmetro | `"apiParams": "dParam3"` | mesmo mecanismo — POJO vira JSON object |

## Inventário real (Área 52, 2026-05-16)

### Cobertura

Probe contra `172.27.0.121\SQL2k19` (DBdirector_*). De 18 bases inspecionadas com cobertura representativa:

| Base | Linhas em `TBmodel_parametro` |
|---|---|
| `DBengenharia_Director_RC` | **18** |
| `DBdirector_Imperial_Logistica_29_Novo` | 18 |
| `DBdirector_Bazinho_29` | 18 |
| `DBdirector_Castro_29` | 18 |
| `DBdirector_china_29` | 18 |
| `DBdirector_Eldorado_29` | 18 |
| `DBdirector_Esquinao_29` | 18 |
| `DBdirector_Mesa_Farta_29` | 18 |
| `DBdirector_Qualidade_29` | 18 |
| `DBdirector_Ribeiro_29` | 18 |
| `DBdirector_StarToys_29` | 18 |
| `DBdirector_Tratoragri_29` | 18 |
| `DBdirector_Casa_Buque_29`, `DBdirector_Flaire_29`, `DBdirector_San_Martins_29`, `DBdirector_Valverde_29`, `DBdirector`, `DBdirector_Imperial_Logistica_29` (legacy), `DBdirector_Implantacao_Base_29`, `DBx_appb_ti_teste`, `DBdirector_Imperial_Logistica_29` | **0** |

**Verificação de identidade**: hash MD5 de `DFvalor` por `(DFchave_pagina, DFchave)` comparado entre `DBdirector_Castro_29` e `DBengenharia_Director_RC` — **18/18 match exato**. Conclusão: o conteúdo é distribuído **idêntico** via seed SQL (`portal-aws/agent/alimentacao/*.sql`); nenhum cliente cadastrou variantes próprias.

### Páginas e parâmetros

3 páginas distintas em `DFchave_pagina`, todas do app `agent` (AWS, módulo de agendamento), 18 linhas totais idênticas em cada base com cobertura:

| Página | dParams | Função do parâmetro |
|---|---|---|
| `agent.age_gerenciar-agendamento` | `dParam1`, `dParam3`, `dParam4`, `dParam5`, `dParam6`, `dParam7` (6 linhas) | gates de visibilidade/permissão por papel (fornecedor vs interno vs supply) |
| `agent.age_realizar-agendamento` | `dParam1`, `dParam2`, `dParam3`, `dParam4`, `dParam5`, `dParam6`, `dParam7`, `dParam8` (8 linhas) | mais granular — pedido obrigatório, CNPJ do fornecedor, email, condicionais de campos visíveis |
| `agent.rel_consultar-agendamento` | `dParam1`, `dParam2`, `dParam3`, `dParam4` (4 linhas) | filtro de listagem por papel |

### Amostras canônicas (primeiros 200 chars de `DFvalor`)

| Página | Chave | Valor |
|---|---|---|
| `agent.age_gerenciar-agendamento` | `dParam1` | `loggedUserData.fornecedorCNPJ !== null ? null : getAclResourceCompanies()` |
| `agent.age_gerenciar-agendamento` | `dParam3` | `(function() { return {usuarioSupply: loggedUserData["usuarioSupply"], responsavelCnpj: loggedUserData["cnpj"], emailUsuarioLogado: loggedUserData["email"] } })()` |
| `agent.age_gerenciar-agendamento` | `dParam4` | `loggedUserData.fornecedorCNPJ ? false : true` |
| `agent.age_gerenciar-agendamento` | `dParam5` | `loggedUserData.fornecedorCNPJ ? true : false` |
| `agent.age_gerenciar-agendamento` | `dParam6` | `loggedUserData.usuarioSupply ? loggedUserData.usuarioSupply !== "true" : true` |
| `agent.age_gerenciar-agendamento` | `dParam7` | `loggedUserData.usuarioSupply && loggedUserData.usuarioSupply === "true" ? false : true` |
| `agent.age_realizar-agendamento` | `dParam1` | `loggedUserData.fornecedorCNPJ !== null ? null : getAclResourceCompanies()` |
| `agent.age_realizar-agendamento` | `dParam2` | `JSON.parse(localStorage.getItem("@director/configs")) ? JSON.parse(localStorage.getItem("@director/configs"))["num-pedido-obrigatorio"] : false` |
| `agent.age_realizar-agendamento` | `dParam3` | `(function() { return {usuarioSupply: loggedUserData["usuarioSupply"], emailUsuarioLogado: loggedUserData.email } })()` |
| `agent.age_realizar-agendamento` | `dParam4` | `loggedUserData.cnpj ? loggedUserData.cnpj : ""` |
| `agent.age_realizar-agendamento` | `dParam5` | `loggedUserData.cnpj ? loggedUserData.usuario : ""` |
| `agent.age_realizar-agendamento` | `dParam6` | `loggedUserData.cnpj && loggedUserData.cnpj !== "null" ? true : false` |
| `agent.age_realizar-agendamento` | `dParam7` | `loggedUserData.cnpj && loggedUserData.cnpj !== "null" ? false : true` |
| `agent.age_realizar-agendamento` | `dParam8` | `loggedUserData.cnpj && loggedUserData.cnpj !== "null" ? loggedUserData.email : ""` |
| `agent.rel_consultar-agendamento` | `dParam1` | `loggedUserData.fornecedorCNPJ !== null ? null : getAclResourceCompanies()` |
| `agent.rel_consultar-agendamento` | `dParam2` | `(function() { return (loggedUserData["cnpj"] ? {responsavelCNPJ: loggedUserData["cnpj"]} : { "requestType":"gridrequest" }) })()` |
| `agent.rel_consultar-agendamento` | `dParam3` | `loggedUserData.fornecedorCNPJ ? false : true` |
| `agent.rel_consultar-agendamento` | `dParam4` | `loggedUserData.fornecedorCNPJ ? true : false` |

Tamanhos: mínimo 44 chars, máximo 163 chars, mediana ~70 chars. Nenhuma expressão tem mais de uma linha; nenhuma tem `;`/`return` solto; todas são expressões válidas.

## Padrões observados

Classificando as 18 expressões únicas:

### 1. Lookup booleano de papel ("este usuário é fornecedor?")

`dParam4/5/6/7` em `age_gerenciar`, `dParam6/7` em `age_realizar`, `dParam3/4` em `rel_consultar` — todas variações de `loggedUserData.<flag> ? true : false` ou seu inverso. Função: ligar/desligar campos do form via `required`/`disabled`/`hideField`.

**Forma canônica**: `<flag> ? <const1> : <const2>`. Função pura de uma chave de `loggedUserData`.

### 2. Lookup de string ("CNPJ/email/usuário do logado, ou string vazia")

`dParam4/5/8` em `age_realizar` — `loggedUserData.cnpj ? loggedUserData.email : ""`. Função: pré-preencher campo do form.

**Forma canônica**: `<flag> ? <flag2> : "<default>"`.

### 3. Lookup de lista de CNPJs da ACL ("empresas que esse usuário enxerga")

`dParam1` em todas as 3 páginas — `loggedUserData.fornecedorCNPJ !== null ? null : getAclResourceCompanies()`. Função: filtra `api` do `<select>` por empresas autorizadas.

**Forma canônica**: condicional → função do ACL hook.

### 4. POJO inline ("contexto do body de submit")

`dParam3` em `age_gerenciar` e `age_realizar`, `dParam2` em `rel_consultar` — `(function(){ return {...} })()` IIFE retornando objeto literal de 2-3 chaves vindas de `loggedUserData`.

**Forma canônica**: objeto literal de propriedades fixas, valores lidos de `loggedUserData`. **Único** caso onde a substituição usa o truque do `#${...}#$`.

### 5. Lookup de feature-flag em localStorage

`dParam2` em `age_realizar` — `JSON.parse(localStorage.getItem("@director/configs"))?.["num-pedido-obrigatorio"] ?? false`. Função: chavear `required` de um campo conforme config da app.

**Forma canônica**: ler chave em store de configs (JSON em `localStorage`) com default.

### Sumário das fontes de dados

| Fonte usada por algum dParam | Frequência |
|---|---|
| `loggedUserData.cnpj` | 6 |
| `loggedUserData.fornecedorCNPJ` | 5 |
| `loggedUserData.usuarioSupply` | 4 |
| `loggedUserData.email` | 3 |
| `loggedUserData.usuario` | 1 |
| `getAclResourceCompanies()` (lista de CNPJs da ACL) | 3 |
| `localStorage['@director/configs']["num-pedido-obrigatorio"]` | 1 |
| **Globals JS** (`window`, `document`, `fetch`, etc.) | **0** |
| **APIs do React** (`useState`, `useRef`, refs, props) | **0** |
| **State da página** (form values, grid filter) | **0** |

> O uso real é **estritamente** "ler valor do usuário logado / ACL / config local; opcionalmente envolver em ternário ou IIFE objeto literal". Nada toca o DOM, nada chama servidor, nada depende do estado da página.

## Estratégia para o Director Studio

Observações de comportamento (sem prescrever stack):

### Opção A — Interpolador puro `{nome}` → valor

Substituir `dParamX` (textual) por um motor de interpolação que pega `{nome}` no JSON e resolve contra um **contexto declarado**. Modelo:

- Contexto exposto: `{ user: {cnpj, email, usuario, fornecedorCNPJ, usuarioSupply, ...}, acl: {resourceCompanies}, configs: {...} }`.
- Sintaxe no template: `"{user.cnpj}"`, `"{user.cnpj ?? ''}"` (ou sintaxe equivalente declarativa).
- Sem `eval` — resolver via path lookup + operadores reconhecidos (ternário, coalescing, comparação por igualdade).

Cobre **18/18 dos casos reais** em produção (todos são lookup + ternário simples).

**Pontos a decidir** (não prescrever):
- Sintaxe (Mustache/Handlebars-like, JSONPath, JMESPath, ou DSL própria).
- Escape de aspas / coerção (boolean dentro de string vs literal — o legado depende da coerção implícita).
- Quem injeta o `acl` e `configs` no contexto (server-side ao servir o model, ou client-side antes do render).

### Opção B — Resolver no backend, eliminar `modelParams` do payload

Como o contexto (user/acl/configs) **é conhecível no servidor** após o login, o backend pode aplicar a interpolação antes de devolver o `model`. Cliente recebe JSON puro sem placeholders.

Custo: backend precisa importar a noção de `configs` do localStorage (que hoje é só do cliente). Migrável se `configs` virar resposta do `/api/me` ou similar.

Ganho: zero placeholders no fio, zero motor de interpolação no front.

### Opção C — DSL declarativa por campo (no schema, não no JSON)

Em vez de injetar valores no JSON do model, declarar diretamente no campo:

```
{ "name": "empresaId",
  "required": { "kind": "user-flag", "key": "fornecedorCNPJ", "ifTruthy": false, "ifFalsy": true },
  "value":    { "kind": "user-field", "key": "email", "default": "" },
  "api":      { "kind": "template", "url": "/empresas", "params": { "codEmpresas": { "kind": "acl-companies" } } } }
```

O renderer entende cada `kind`. Não há texto livre, não há eval, não há placeholders. Mais verboso, mais explícito, mais auditável.

Cobre **18/18** com 5 kinds (`user-flag`, `user-field`, `acl-companies`, `template`, `config-key`).

### Recomendação descritiva

O **uso observado** é tão restrito (5 padrões fechados, contexto restrito a user/acl/configs, nenhum cliente cadastrou variantes próprias) que a premissa de "AppBuilder permite código JS arbitrário em param" **não está exercida em produção**. Espelha o achado de [[tbfuncao-model]] (F039). Curator+Smith escolhem entre A/B/C; nenhuma requer compatibilidade com `eval`.

## Riscos

1. **Quebra de coerção implícita**. O legado depende de `replaceAll("dParam2", true)` virar a string `"true"` que o `JSON.parse` então **mantém como string**, e o consumidor do schema (`<GenericForm/>`) faz `prop === "true"` ou coerção truthy. Migrar para tipos nativos pode descobrir comparações que assumem string. Mapear consumidores de `required`/`disabled`/`hideField` antes.
2. **Token name aliasing**. Se o nome `dParamX` aparecer em qualquer outro lugar do JSON (chave, valor, fragmento de palavra), o `replaceAll` substitui. Migrar para sintaxe `{...}` muda essa garantia (delimitadores explícitos). Mas se a Studio mantiver placeholders sem delimitadores, mesmo problema persiste. **Recomendar delimitação obrigatória**.
3. **Ordem de aplicação**. Sem `ORDER BY` no repositório .NET, a ordem do array é a ordem do storage engine — **não-determinística**. Se um param depender de outro já substituído, comportamento pode mudar. Probe não encontrou dependência em produção; documentar como invariante a evitar.
4. **Pseudo-literal `#${...}#$"`** é frágil: depende do template ter aspas duplas exatamente nas posições `"dParamX"`. Se algum cadastro humano (futuro) puser o placeholder em outra posição, gera JSON inválido silenciosamente (`JSON.parse` falha → toast genérico, página em branco).
5. **`localStorage["@director/configs"]` é estado de cliente** — se o usuário não tem essa chave (sessão nova), `JSON.parse(null)` retorna `null`, expressão resolve em `false`, e o campo fica não-obrigatório. Comportamento aceitável, mas migração para servidor precisa preservar o default.
6. **Sem unicidade**: nada impede o cadastro de duas linhas com mesma `(DFchave_pagina, DFchave)`. UPSERT do `tabelas_temporarias_persistir` confia em unicidade lógica. Studio deve criar `UNIQUE (DFchave_pagina, DFchave)` ou substituir tabela por estrutura embutida no schema da página.
7. **Schema divergente**: `DFchave_pagina` é `NVARCHAR(50)` aqui mas `NVARCHAR(255)` em `TBmodel_pagina` e `TBfuncao_model`. Chaves de página de até 50 chars passam; mais que isso, INSERT falha com truncamento (SQL Server lança `String or binary data would be truncated`). Probe não encontrou chave > 30 chars.

## Relações com o ecossistema

- Consome de: `acesso.TBpagina` (FK lógica via `DFchave_pagina`).
- É consumido por: [[obter-model-pagina]] (payload `modelParams`), [[engine-schema-driven]] (`evalModelDynamicParams` em `<GenericPages/>` — primeiro dos 3 pontos de `eval`).
- Paralelo a: [[tbfuncao-model]] (segundo e terceiro pontos de `eval`).
- Escrito por: `acesso.tabelas_temporarias_persistir` (UPSERT via `##TempModelParametro`) e UI do **AppBuilder** (`react-tools` rotas de cadastro de páginas).
- Sub-contrato relacionado: `model-valor-genericform.md` (consome `dParamX` interpolados); `model-valor-datagrid.md` (consome `dParamX` em `apiParams`).

## Notas de implementação para o Studio

- **Cobertura de produção em Área 52**: 18 linhas únicas, 3 páginas, 1 app (`agent`), todos seeds canônicos do `portal-aws`. Zero cliente cadastrou linha própria. Mesma situação de [[tbfuncao-model]].
- **Contexto efetivo do `eval`**: somente `user` (`loggedUserData`), `acl.resourceCompanies` (`getAclResourceCompanies()`) e `configs` (`localStorage["@director/configs"]`). Nenhum acesso a globals, DOM, fetch, ou state da página. Premissa restritiva de migração é segura.
- **5 padrões fechados** cobrem 100% do uso: papel-booleano, papel-string, ACL-lista, POJO-inline, config-flag. Qualquer DSL ou interpolador que cubra esses 5 está adequado.
- **Resolução é one-shot, pre-parse**. Não há reatividade: se `loggedUserData` mudar após o mount, o model não é re-interpolado. Studio deve preservar essa semântica (cache do model por sessão) ou romper conscientemente (re-fetch ao mudar contexto).
- **Erro silencioso**: `eval` que lança exceção é engolido pelo `try/catch` em `GenericPages.js:54-56`; o `param` falho deixa o placeholder cru no JSON, o `JSON.parse` quebra, o toast genérico aparece. Studio deve reportar erro de interpolação por placeholder (telemetria) e/ou fallback explícito.
- **Sem ACID**: tabela sem UNIQUE, sem FK, sem trigger de auditoria. Studio pode adicionar `UNIQUE (DFchave_pagina, DFchave)` na migração se mantiver a tabela; ou colapsar para estrutura embutida no schema do model.
- **Idempotência do seed**: o `UPSERT` em `tabelas_temporarias_persistir` permite re-rodar os scripts de alimentação sem duplicar. Studio que mantenha esse mecanismo (deploy de schemas via SQL) preserva o workflow operacional.

## Sources

- [[calendar/notes/2026-05-15.md]]
