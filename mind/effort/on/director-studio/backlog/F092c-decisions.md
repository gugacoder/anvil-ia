# F092c — decisões de implementação (smith)

**Status:** ready-for-test
**Data:** 2026-05-18
**Sub-feature de:** F092 (EPIC `configuracoes_cotacao`), slot 3/4 (`email`)
**Gates:** F108 (deferred) + F110 (accepted) + F113 (accepted) ; soft-gate F112
**Template-base:** F092a/F092b (accepted) — mesmo padrão JSON_MODIFY surgical
                   `$.pageTabs[N]`, mesmo apply+probe shape.

---

## D1 — Shape genericform single (paridade F092a)

Diferente de F092b (composto filtro+datagrid+pageActions), o tab `email`
é genericform puro — `<ConfigEmail>` é um formulário plano com 6 campos
e um botão de save. Mesmo shape do F092a.

**Decisão:** slot 2 modelado como:

```json
{
  "key": "email",
  "label": "E-mail",
  "model": {
    "genericform": {
      "genericPageTitle": "E-mail",
      "genericPageDescription": "Configurar servidor personalizado para envio de e-mails.",
      "api":      "/api/cotacao/proc/cotacao_sp_consultar_configuracao_email",
      "endPoint": "/api/cotacao/proc/cotacao_persistir_config_email",
      "model": [ ...6 campos ]
    },
    "pageActions": {
      "testEmail": { "endPoint": "/api/teste-email" }
    }
  }
}
```

---

## D2 — 6 campos byte-perfect com ConfigEmail.jsx (linhas 118-181)

| Prop        | Type     | Required | maxLength | maskType | Origem legado          |
|-------------|----------|----------|-----------|----------|------------------------|
| smtp        | text     | true     | 255       | —        | linha 118-126          |
| portaSmtp   | text     | true     | 5         | inteiro  | linha 128-139          |
| usuario     | text     | true     | 255       | —        | linha 143-150          |
| senha       | text     | true     | 255       | —        | linha 153-160          |
| remetente   | text     | false    | 255       | —        | linha 163-172          |
| ssl         | checkbox | false    | —         | —        | linha 173-181          |

**Required = 4** (smtp/portaSmtp/usuario/senha) — exato da função
`verifyRequired` linha 45 do legado.

**Decisão sobre `senha`:** legado usa `<Input>` plain (não `type=password`)
— preservo fiel como `type: "text"`. Se o engine quiser mascarar, é
decisão da camada de render, não do model. Débito implícito (não bloqueia
F092c — qualquer engine pode promover via heurística `prop==='senha'`).

**Decisão sobre `ssl`:** legado normaliza `state.ssl === 'true' || state.ssl === true`
(linha 178). No model declaro como `type: "checkbox"` boolean — fica a
critério da camada de hidratação aceitar string `'true'` legada do backend.

**Decisão sobre `portaSmtp`:** `maskType: "inteiro"` espelha legado
(linha 134). Engine F009 já interpreta essa chave.

---

## D3 — F112 soft-gate: `/api/teste-email` declarativo, sem rota Studio

Legado tem botão "Testar email" que chama `postAsync(testEmailApi, body)`
— `testEmailApi='/api/teste-email'` plain REST (NÃO usa `execProc`,
NÃO passa por `useAppClient`). É um endpoint não-proc do Director.Website
legado, ainda não escavado (F112 soft-gate).

**Decisão:** declaro o endpoint canônico no model como
`pageActions.testEmail.endPoint = '/api/teste-email'`. NÃO crio rota
Studio paralela nesta sub.

**Justificativa:** manifest F092c explicita "sub aceitável sem botão
teste-email (débito declarado) caso F112 atrase". O shape do model fica
correto (declarativo) — quando F112 escavar e decidir mount (proxy vs
nativo), basta criar a rota em `apps/api/src/routes/*` e o engine de
runtime começa a renderizar o botão. Zero retrabalho no model.

**Débito declarado D9** (novo, soft-gate F112): mount real de
`/api/teste-email`. NÃO bloqueia F092c schema-side.

**Anti-violação:** probe verifica `pageActions.testEmail.endPoint ===
'/api/teste-email'` literal — garante que o contrato declarativo está no
DFvalor mesmo sem implementação runtime.

---

## D4 — Slot 0/1 preservação dupla via JSON_MODIFY $.pageTabs[2]

Mesmo padrão idempotente do F092a/b, com mudança cirúrgica: o seed do
F092c só toca `$.pageTabs[2]` via `JSON_MODIFY`. Apply 2x consecutivo
mantém DFid_model_pagina=18 sem alteração de slots vizinhos:
- slot 0 (gerais F092a) intacto
- slot 1 (usuarios F092b) intacto
- slot 3 (logo) continua stub até F092d preencher

**Confirmado em runtime:** apply 2x rodado, probe DB verifica slot 0
key == 'gerais' E slot 1 key == 'usuarios' após apply.

**Anti-violação adicional no SQL:** `THROW 50948` se slot 0 não for
'gerais' e `THROW 50949` se slot 1 não for 'usuarios' — guards explícitos
contra regressão F092a/F092b causada por F092c.

---

## D5 — Anti-violação F111 herdada de F092b

Mesmo que F092c (genericform single) não tenha sido reportado com path
divergente legado (CotacaoConfig.jsx legado já usava /api/cotacao/proc/),
mantenho o anti-violação `THROW 50945` se `"/cotacao/proc/` aparecer no
DFvalor — defesa em profundidade contra cópia errada cross-sub. Mesmo
guard no apply TS e probe TS.

---

## D6 — Reuso F110 integral

Nenhuma rota nova criada. `multi-app-proxy.ts` + `app-registry.ts` cobrem
ambas procs (`cotacao_sp_consultar_configuracao_email`,
`cotacao_persistir_config_email`) sem 1 linha adicional — paridade F092a/b.

`/api/teste-email` (F112) NÃO passa pelo proxy multi-app (é endpoint
plain não-proc), portanto nada a mexer em F110.

---

## Notas de execução

- **Apply 1:** OK — DFid=18, pageTabs=4, slot 2 email real, slots 0/1
  preservados.
- **Apply 2:** OK — mesmo DFid, mesma estrutura (idempotência
  confirmada).
- **Probe:** 6/6 PASS — DB shape + bridge 2 procs (Basic R4 + Domain R6
  + URL R7) + 3 route gates (no-session 503, health 200, uppercase
  appKey 503).
- **Typecheck:** verde 3 packages (api/ui/director-studio) em 2.592s.
- **Reuso F110:** integral — nenhuma rota nova criada.
- **Stubs:** slot 3 (logo TBD F092d) segue como stub declarado; slots 0
  (gerais F092a) e 1 (usuarios F092b) seguem reais e preservados.

## Débitos declarados (não bloqueiam F092c — herdam ou abrem nova frente)

- **D9** (novo, soft-gate F112): mount real de `/api/teste-email`
  endpoint não-proc — necessário para botão "Testar email" funcionar em
  runtime. NÃO bloqueia F092c schema-side (sub aceitável sem botão cf
  manifest).
- **D4/D5/D6** herdados de F090/F092a/F092b: forms-proxy multi-app
  routing, auto-load api, select dinâmico — não tocados aqui.
- **D7/D8** herdados de F092b: engine genericform-in-modal, renderer
  externalAction default — não tocados aqui.

## Cobertura legado vs Studio

| Legado `ConfigEmail.jsx`                          | Studio F092c                                                    |
|---------------------------------------------------|-----------------------------------------------------------------|
| `getInfoApi='cotacao_sp_consultar_configuracao_email'` via execProc | `genericform.api = /api/cotacao/proc/cotacao_sp_consultar_configuracao_email` |
| `persistInfoApi='cotacao_persistir_config_email'` via execProc | `genericform.endPoint = /api/cotacao/proc/cotacao_persistir_config_email`     |
| `testEmailApi='/api/teste-email'` via postAsync   | `pageActions.testEmail.endPoint = /api/teste-email` (declarativo, D9) |
| 6 inputs (smtp/portaSmtp/usuario/senha/remetente/ssl) | `genericform.model[]` 6 campos com required/maxLength/maskType fieis |
| `verifyRequired()` 4 campos                       | `required: true` em smtp/portaSmtp/usuario/senha                |
| Save button → POST `persistInfoApi`               | engine F009 default (botão Salvar do genericform)               |
| Test button → POST `testEmailApi` com body composto | `pageActions.testEmail.endPoint` (engine constrói body do state runtime — D9) |
