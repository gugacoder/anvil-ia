# F092b — decisões de implementação (smith)

**Status:** ready-for-test
**Data:** 2026-05-17
**Sub-feature de:** F092 (EPIC `configuracoes_cotacao`), slot 2/4 (`usuarios`)
**Gates:** F108 (deferred) + F110 (accepted) + F113 (accepted) ; soft-gate F111
**Template-base:** F092a (accepted) — mesmo padrão JSON_MODIFY surgical
                   `$.pageTabs[N]`, mesmo apply+probe shape.

---

## D1 — Path divergente legado F111 → mitigação canônica

Legado `CotacaoUsuarios.jsx` usa `/cotacao/proc/...` (sem prefixo `/api`),
divergente de `CotacaoConfig.jsx` que usa `/api/cotacao/proc/...`.

**Decisão:** model usa **canônico** `/api/cotacao/proc/<proc>` (paridade
F092a + `useAppClient` default + multi-app-proxy F110 mount point).

**Justificativa:** F111 documenta isso como **soft-gate**: arqueólogo
investiga se é (a) bug histórico que NGINX/IIS reverse-proxy mascarou em
produção, (b) intenção (mount distinto), ou (c) artefato. NÃO bloqueia
F092b — mitigação aplicada por default.

**Anti-violação:** seed + apply + probe têm guard `CHARINDEX('"/cotacao/proc/')`
para garantir que o path legado NÃO vaza no DFvalor. Se F111 confirmar (b),
ajusta-se sem custo (rota no proxy ou rewrite no engine — uma linha).

---

## D2 — Shape composto (filtro+datagrid+pageActions), NÃO genericform

Legado usa `<GenericPage>` com `pageModel = { buttons, filtro, datagrid }`
+ um Modal+Form custom para CRUD. NÃO é genericform single (que é o shape
do F092a/c/d).

**Decisão:** modelei o slot 1 como:

```json
{
  "key": "usuarios",
  "label": "Usuários",
  "model": {
    "genericPageTitle": "Cadastro de usuários",
    "buttons": { "pageButtons": [{ "title": "Add", ... }] },
    "filtro":   { "id": "cotacao-usuario", "model": [...4 props] },
    "datagrid": { "api": "/api/cotacao/proc/cotacao_sp_obter_usuarios",
                  "headers": [...4 cols], "gridActions": [...2 actions] },
    "pageActions": {
      "persistir": { "endPoint": "/api/cotacao/proc/cotacao_sp_persistir_usuario" }
    }
  }
}
```

**Decisão chave em `pageActions.persistir.endPoint`:** o legado usa o
**mesmo endpoint** para 3 fluxos distintos (insert/update/bulk
ativar-inativar) — distinguindo apenas pelo body XML (`id` presente,
`ids` CSV presente, ou nenhum). Isso espelha exato o legado e fica como
chave única `persistir` no model.

**Modal de cadastro (Add + edit duplo-click):** o legado abre `<Modal>` +
`<Form>` custom com 3 campos (email/nome/senha — required) ou 5 (com
id+email pré-preenchidos no edit). NÃO está coberto pelo engine
genericform atual (não há shape canônico para "genericform-in-modal").

**Débito declarado D7** (sistêmico, não bloqueia F092b): engine
"genericform-in-modal" precisa ser pensado — provavelmente como nova
chave `modal` dentro de `pageActions` ou via composição de sub-models
nas `gridActions`/`pageButtons`. Por ora, o slot 1 deixa o endpoint de
persistir disponível em `pageActions.persistir.endPoint` e o engine de
runtime (frontend) decide como apresentar (renderer-de-tab pode no
futuro montar um GenericForm-in-Modal driven pelo mesmo shape do F092a
quando a UI for completada).

**Anti-violação:** probe verifica
- `pageTabs[1].model.datagrid.api` literal
- `pageTabs[1].model.pageActions.persistir.endPoint` literal
- filtro tem 4 props (email/nome/nomeUsuario/status)
- datagrid tem 4 headers (mesmos props)

---

## D3 — Filtro `status` como fixedList com 3 opções

Legado:
```js
{ label: 'Status', prop: 'status', type: 'select',
  selectDataType: 'fixedList',
  options: [
    { value: 2,   label: 'Todos' },
    { value: 1,   label: 'Ativo' },
    { value: '0', label: 'Inativo' }   // <-- string '0', NÃO number 0
  ]
}
```

A inconsistência de tipos (`2`/`1` numbers, `'0'` string) está no legado.
Replico fiel — engine F009 sabe lidar.

---

## D4 — gridActions `externalAction` sem handler no model

No legado o `onClickAction` é uma callback JS in-loco (abre Modal). No
model schema-driven não temos como serializar callbacks JS. Mantive
`action: "externalAction"` puro, sem `onClickAction`.

**Débito declarado D8:** engine renderer precisa, ao ver
`action: "externalAction"` num gridAction, montar handler "default" que
faz POST `pageActions.<title>.endPoint` (ou `pageActions.persistir.endPoint`
com `acao: <title.toLowerCase()>` no body, fiel ao legado que passa
`acao: 'ativar'|'inativar'` no XML). Não é bloqueador F092b — a
informação contratual (endpoint + ação) está no model.

---

## D5 — Slot 0 preservação garantida via JSON_MODIFY $.pageTabs[1]

Mesmo padrão idempotente do F092a, com mudança cirúrgica: o seed do
F092b só toca `$.pageTabs[1]` via `JSON_MODIFY`. Apply 2x consecutivo
mantém DFid_model_pagina=18 sem alteração de slots vizinhos:
- slot 0 (gerais F092a) intacto — verificado por anti-violação no apply
  + probe
- slots 2/3 stubs continuam stubs até F092c/d preencherem

**Confirmado em runtime:** apply 2x rodado, probe DB verifica slot 0 key
== 'gerais' após apply.

---

## D6 — Anti-violação F111 explícita no SQL + TS

O seed tem `THROW 50934` se o DFvalor contém `"/cotacao/proc/` (path
legado sem /api). O apply TS replica essa checagem. Isso garante que se
no futuro alguém tentar replicar o path errado, o seed falha antes de
gravar.

---

## Notas de execução

- **Apply 1:** OK — DFid=18, pageTabs=4, slot 1 usuarios real, slot 0
  gerais preservado.
- **Apply 2:** OK — mesmo DFid, mesma estrutura (idempotência
  confirmada).
- **Probe:** 6/6 PASS — DB shape + bridge 2 procs (Basic R4 + Domain R6
  + URL R7) + 3 route gates (no-session, health, uppercase appKey).
- **Typecheck:** verde 3 packages (api/ui/director-studio).
- **Reuso F110:** integral — nenhuma rota nova criada. `multi-app-proxy.ts`
  + `app-registry.ts` cobrem ambas procs sem 1 linha adicional.
- **Stubs:** slots 2 (email TBD F092c) e 3 (logo TBD F092d) seguem como
  stubs declarados; slot 0 (gerais F092a) seguia real e segue real.

## Débitos declarados (não bloqueiam F092b — herdam ou abrem novas frentes)

- **D7** (novo, sistêmico): engine `genericform-in-modal` para CRUD com
  modal — tab `usuarios` precisa disso para completar UI runtime.
  Bloqueia UX completa Cotacao>Usuarios mas NÃO bloqueia F092b
  schema-side.
- **D8** (novo, sistêmico): renderer de `gridAction.action ==
  'externalAction'` precisa montar handler default (POST
  `pageActions.persistir.endPoint` + body com `ids` + `acao`).
- **D4/D5/D6** herdados de F090/F092a: forms-proxy multi-app routing,
  auto-load api, select dinâmico — não tocados aqui.
