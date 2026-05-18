# F092d — decisões de implementação (smith)

**Status:** ready-for-test
**Data:** 2026-05-17
**Sub-feature de:** F092 (EPIC `configuracoes_cotacao`), slot 4/4 (`logo`) — **FECHA O EPIC**
**Gates:** F108 (deferred) + F110 (accepted) + F113 (accepted)
**Template-base:** F092a/F092b/F092c (accepted) — mesmo padrão JSON_MODIFY surgical
                   `$.pageTabs[N]`, mesmo apply+probe shape.

---

## D1 — Shape `logoUploader` (NÃO é genericform)

Diferente de F092a/F092c (genericform single) e F092b (filtro+datagrid+pageActions),
o tab `logo` legado é um componente especializado de upload de imagem
(`ConfigLogo.jsx`). Não tem lista de campos com prop/type/required — é um
fluxo único: preview imagem atual → file picker → preview selecionado →
botão Salvar.

**Decisão:** declarar shape `logoUploader` específico capturando todas as
afordâncias do legado em chaves declarativas:

```json
{
  "key": "logo",
  "label": "Logo",
  "model": {
    "logoUploader": {
      "genericPageTitle": "Logo",
      "genericPageDescription": "Definir logotipo a ser utilizado nos e-mails enviados pelo Cotação.",
      "api":      "/api/cotacao/proc/cotacao_sp_consultar_logo_cliente",
      "endPoint": "/api/cotacao/proc/cotacao_persistir_config_logo_cliente",
      "currentImageProp":     "logo",
      "maxLengthProp":        "maxLength",
      "payloadProp":          "novoLogo",
      "accept":               ".jpeg,.jpg,.png",
      "acceptMimeTypes":      ["image/jpeg", "image/png"],
      "emptySelectionMessage":"Nenhuma imagem selecionada pelo usuário...",
      "selectFileLabel":      "Selecionar imagem para atualizar...",
      "extensionsHint":       ".jpg, .jpeg, .png",
      "submitLabel":          "Salvar"
    }
  }
}
```

**Justificativa:** o shape captura cada decisão do legado de forma
declarativa, sem hardcode no renderer:

- `api`/`endPoint` — paridade F092a/b/c (proc legado real via gateway F110).
- `currentImageProp=logo` — campo da resposta de GET que contém base64 da
  imagem atual (linha 98 do legado).
- `maxLengthProp=maxLength` — campo da resposta que define limite em bytes
  (linha 45 do legado: `parseInt(state.maxLength)`).
- `payloadProp=novoLogo` — nome do field no body do SAVE (linha 28: `body = { novoLogo: logoSelecionado.novoLogo }`).
- `accept` — atributo `accept` do `<input type="file">` (linha 130).
- `acceptMimeTypes` — lista de MIME types validada client-side (linha 60).
- Strings (`emptySelectionMessage`/`selectFileLabel`/`extensionsHint`/`submitLabel`) —
  copy literal do legado (linhas 8, 92, 134, 141).

---

## D2 — Engine renderer `logoUploader` é débito sistêmico (D10)

O Studio engine atual conhece `genericform` (F092a/c), filtro+datagrid+pageActions
(F092b), `genericPageTitle/Description` (page-shell). NÃO conhece `logoUploader`.

**Decisão:** declarar débito D10 — engine renderer `logoUploader` (preview
atual via dataURL, file input com `accept`+ validação MIME contra
`acceptMimeTypes` + validação tamanho via `maxLengthProp` lido da
resposta `api` + preview selecionado + submit do dataURL no campo
`payloadProp` para `endPoint`).

**NÃO bloqueia F092d schema-side.** Manifest F092 exige aceite mecânico do
slot (idempotência + endpoints reais + paridade legado). Engine renderer
fica para fase de UI subsequente (quando esbuild desbloquear F108).

**Anti-violação:** probe valida que o shape está no DB com todas as chaves
declarativas literais — garante que o contrato está correto mesmo sem
renderer rodando.

---

## D3 — Slot 0/1/2 preservação tripla via JSON_MODIFY $.pageTabs[3]

Mesmo padrão idempotente do F092a/b/c, com mudança cirúrgica: o seed do
F092d só toca `$.pageTabs[3]` via `JSON_MODIFY`. Apply 2x consecutivo
mantém DFid_model_pagina=18 sem alteração de slots vizinhos:

- slot 0 (gerais F092a) intacto
- slot 1 (usuarios F092b) intacto
- slot 2 (email F092c) intacto

**Confirmado em runtime:** apply 2x rodado contra
`172.27.0.121\SQL2k19.DBdirector_imperial_logistica_29`, probe DB verifica
slots 0/1/2 keys após apply.

**Anti-violação adicional no SQL:** `THROW 50960/50961/50962` se slots
0/1/2 forem corrompidos — guards explícitos contra regressão F092a/b/c
causada por F092d (terceira camada de defesa, encerrando o epic).

---

## D4 — Anti-violação F111 herdada

Mesmo que F092d (logoUploader puro) não tenha sido reportado com path
divergente legado (`ConfigLogo.jsx` legado usa `execProc` via
`useAppClient`, mesmo padrão de F092a/c), mantenho o anti-violação
`THROW 50957` se `"/cotacao/proc/` aparecer no DFvalor — defesa em
profundidade contra cópia errada cross-sub. Mesmo guard no apply TS e
probe TS.

---

## D5 — Anti-violação naming inventado

Manifest cita expressamente `acesso.sp_persistir_logo_cotacao` como
invenção a ser substituída. Guards `THROW 50958/50959` no SQL e checks
equivalentes em apply.ts/probe.ts contra:

- `sp_persistir_logo_cotacao` (invenção do manifest)
- `sp_consultar_logo_cotacao` (variante simétrica defensiva)

---

## D6 — Reuso F110 integral

Nenhuma rota nova criada. `multi-app-proxy.ts` + `app-registry.ts` cobrem
ambas procs (`cotacao_sp_consultar_logo_cliente`,
`cotacao_persistir_config_logo_cliente`) sem 1 linha adicional — paridade
F092a/b/c.

---

## Notas de execução

- **Apply 1:** OK — DFid=18, pageTabs=4, slot 3 logo real, slots 0/1/2
  preservados.
- **Apply 2:** OK — mesmo DFid, mesma estrutura (idempotência confirmada).
- **Probe:** 6/6 PASS — DB shape + bridge 2 procs (Basic R4 + Domain R6 +
  URL R7) + 3 route gates (no-session 503, health 200, uppercase appKey 503).
- **Typecheck:** verde 3 packages (api/ui/director-studio) em 3.476s
  (turbo cache hit em ui+director-studio, api fresh).
- **Reuso F110:** integral — nenhuma rota nova criada.
- **EPIC F092:** F092d é o último slot. Após aceite curator, epic F092
  passa de blocked → accepted (4/4 subs aceitos).

## Débitos declarados (não bloqueiam F092d — herdam ou abrem nova frente)

- **D10** (novo): engine renderer `logoUploader` (preview imagem atual via
  dataURL + file picker `accept`+validação MIME contra `acceptMimeTypes` +
  validação tamanho contra resposta `maxLengthProp` + preview selecionado +
  submit dataURL no `payloadProp` → `endPoint`). NÃO bloqueia F092d
  schema-side (sub aceitável sem renderer cf padrão F092a-c). Engine fica
  para fase de UI (gate esbuild que ainda mantém F108 deferred).
- **D4/D5/D6** herdados de F090/F092a: forms-proxy multi-app routing,
  auto-load api, select dinâmico — não tocados aqui.
- **D7/D8** herdados de F092b: engine genericform-in-modal, renderer
  externalAction default — não tocados aqui.
- **D9** herdado de F092c: mount real `/api/teste-email` (F112 soft-gate) —
  não tocado aqui (escopo F092c/F112).

## Cobertura legado vs Studio

| Legado `ConfigLogo.jsx`                                | Studio F092d                                                                  |
|--------------------------------------------------------|-------------------------------------------------------------------------------|
| `execProc('cotacao_sp_consultar_logo_cliente', {})`    | `logoUploader.api = /api/cotacao/proc/cotacao_sp_consultar_logo_cliente`      |
| `execProc('cotacao_persistir_config_logo_cliente', body)` com `body = { novoLogo }` | `logoUploader.endPoint = /api/cotacao/proc/cotacao_persistir_config_logo_cliente` + `payloadProp=novoLogo` |
| `state.logo` (resposta GET) → `<img src={state.logo}>`  | `currentImageProp=logo`                                                       |
| `parseInt(state.maxLength)` (resposta GET) → validação | `maxLengthProp=maxLength`                                                     |
| `<input type='file' accept='.jpeg,.jpg,.png'>` (linha 130) | `accept=.jpeg,.jpg,.png`                                                  |
| `file.type !== 'image/jpeg' && file.type !== 'image/png'` (linha 60) | `acceptMimeTypes=["image/jpeg","image/png"]`                   |
| `"Nenhuma imagem selecionada pelo usuário..."` (linha 8/63) | `emptySelectionMessage="Nenhuma imagem selecionada pelo usuário..."`     |
| `"Selecionar imagem para atualizar..."` (linha 134)    | `selectFileLabel="Selecionar imagem para atualizar..."`                       |
| `"Extensões permitidas: .jpg, .jpeg, .png"` (linha 92) | `extensionsHint=".jpg, .jpeg, .png"`                                          |
| Botão `<button>Salvar</button>` (linha 141)            | `submitLabel="Salvar"`                                                         |
| `<h4>Logo</h4>` (linha 87) + descrição linha 88-90      | `genericPageTitle="Logo"` + `genericPageDescription="Definir logotipo..."`    |
