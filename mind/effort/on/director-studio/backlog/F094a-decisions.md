---
title: "F094a — Sub-model do tab `entidades` (decisões de implementação)"
tags: [effort, director-studio, F094a, F094, F052b, refactor, decisions]
created: 2026-05-17
---

# F094a — Decisões de implementação

Sub-feature 1/3 do EPIC F094. Tab `entidades` de
`Configuracoes/IntegradorAWS/IntegradorAws.jsx` → componente
`IntegradorEntidades.jsx`. Única tab proc-based de IntegradorAWS.

## Contrato lido (anti-violação: apenas legacy-contracts)

`mind/atlas/concepts/legacy-contracts/integrador-aws-component.md` (sub-
escavação archaeologist 2026-05-17):

- Page-shell `pageTabs` com **3 tabs** (NÃO 5; F109-deferred refere a
  Cotacao). Ordem fixa: `utilitarios` (slot 0), `opcoes` (slot 1),
  `entidades` (slot 2).
- Tab `entidades` é a única proc-based. Caminho legado:
  `IntegradorEntidades.jsx` (select de 10 entidades hardcoded + botão Enviar)
  → `GET /api/integradoraws/sincronizar/{entidade}` →
  `IntegradorAwsController.SincronizarEntidade` (Director) →
  proc local `aws_sincronizar_entidade @entidade, null` (Director DB, full-sync) →
  `POST {IpPortalAws}/api/proc/portal.sincronizar_{entidade}` via
  `PortalAwsClient` (bridge AWS, JWT R7).
- 10 entidades em ordem UI (cf [[integrador-aws-component]] §"Tab 2"):
  `redes/empresas/centros/departamentos/veiculos/feriados/fornecedores/
  itens/planos/usuarios`. Labels PT-BR: Redes, Empresas, Centros,
  Departamentos, Veículos, Feriados, Fornecedores, Itens, Planos de
  pagamento, Usuários.
- 10 procs AWS `portal.sincronizar_<entidade>` já cobertas em
  [[portal-aws-bridge]] §"Endpoints externos" (não duplico).
- appKey real para a bridge: `portal-aws` (R7 JWT). A app `integrador-aws`
  (`:4303`) é SEPARADA — suspeita ser backend de `/api/status` (tab
  utilitarios), fora do escopo F094a.

NÃO li nenhum arquivo em `sources/engenharia--fabrica--*`. Toda informação
veio do contrato do arqueólogo.

## Decisões

### D1 — Studio atalha controller + proc local; chama bridge direto

Briefing curator: `No Studio: usar /portal-aws/proc/portal.sincronizar_<entidade> direto via F090 portal-aws-proxy.`

O caminho legado tinha 3 hops:
1. Front → `GET /api/integradoraws/sincronizar/{entidade}` (controller Director)
2. Controller → proc local `aws_sincronizar_entidade @entidade, null` (constrói
   XML lendo do banco do tenant)
3. Controller → `POST {IpPortalAws}/api/proc/portal.sincronizar_{entidade}`
   (envia o XML para a AWS via `PortalAwsClient`)

No Studio, o passo 2 (proc local que constrói XML) **fica do lado da AWS** —
as procs `portal.sincronizar_<entidade>` já leem do banco do tenant via
`PortalAwsClient` consultando o tenant remotamente. O atalho elimina a proc
local `aws_sincronizar_entidade` (que era só payload-builder) e chama a
bridge direto: **1 hop em vez de 3**.

Anti-violação explícita em SQL+TS+probe: nenhum endpoint legado
`/api/integradoraws/` ou referência a `aws_sincronizar_entidade` pode vazar
no DFvalor (THROW 50947/50948 em SQL; checagem em TS/probe).

### D2 — Shape: novo objeto declarativo `entityActions` (sem genericform)

`IntegradorEntidades.jsx` é uma UI customizada (select + botão), não um
genericform. Modelar como genericform seria forçar — o legado tem 1 select
hardcoded com 10 opções e UM endpoint (`/sincronizar/{entidade}`).

No Studio, com a decisão D1 (chamar bridge direto), temos **10 endpoints
distintos** (um por entidade). Shape escolhido:

```json
{
  "entityActions": {
    "genericPageTitle":       "Sincronizar - Entidades",
    "genericPageDescription": "Disparar sincronização de entidades do tenant para o Portal AWS.",
    "selectLabel":            "Entidade",
    "submitLabel":            "Enviar",
    "successMessage":         "Entidade sincronizada com sucesso.",
    "errorMessage":           "Ocorreu um problema durante a sincronização da entidade.",
    "actions": [
      { "key": "redes",         "label": "Redes",                "endPoint": "/portal-aws/proc/portal.sincronizar_redes" },
      … (10 entries total) …
    ]
  }
}
```

Gemelar de `logoUploader` em F092d: shape declarativo Studio-canonical SEM
engine renderer ainda. Engine renderer `entityActions` é débito sistêmico
**D11** (gemelar D10 de F092d) — shape correto no DB; renderer é fase
posterior. Não bloqueia aceite F094a (manifest exige só o shape correto).

`successMessage`/`errorMessage` espelham strings PT-BR do legado linha 16/18
de `IntegradorEntidades.jsx` (cf contrato). `submitLabel="Enviar"` espelha
o botão linha 50.

### D3 — Roteamento: appKey `portal-aws` via F090 portal-aws-proxy

URLs no model: `/portal-aws/proc/portal.sincronizar_<entidade>` (literal,
NÃO `/api/portal-aws/proc/...` nem `/api/cotacao/proc/...` nem
`/api/agent/proc/...`).

A rota `/portal-aws/proc/:proc` já existe em
`apps/api/src/routes/portal-aws-proxy.ts` (F090) — reuso integral. Forward
via `PortalAwsClient.sendRequest` com JWT R7 (HMAC-SHA256) + Domain R6 lido
de `acesso.TBaplicacao WHERE DFchave='portal-aws'`. Nenhum código novo em
`apps/api/src/routes/`.

Anti-violação em SQL+TS+probe: nenhum `/api/cotacao/proc/` (THROW 50946 SQL)
ou `/api/agent/proc/` (THROW 50946 SQL) — appKey errado para portal-aws.

### D4 — Idempotência: JSON_MODIFY em `$.pageTabs[2]` quando row já existe

Template F092a/b/c/d consolidado:
- Row NÃO existe (sanity DB virgem ou F043 fixture ausente nesta base) →
  INSERT com pageTabs de 3 slots (slot 2 real + slots 0/1 stubs F094b/c).
- Row EXISTE com pageTabs[N].key conhecido → JSON_MODIFY apenas
  `$.pageTabs[2]` (preserva slots 0/1 — quando F094b/c saírem do deferred,
  elas escrevem nos próprios slots sem mexer no entidades).
- Row EXISTE mas pageTabs ausente (F043 shape flat antigo) → full rewrite
  com `@fullValor` (transição F043 → F108).

Validado idempotência: 2 applies seguidos retornam o mesmo
`DFid_model_pagina=22` com `pageTabs=3` e 10 actions no slot 2.

### D5 — Submit funcional: gap conhecido (paridade com F090/F092a-d)

`GenericFormRenderer` submete via `POST /api/forms-proxy` com body
`{endPoint, body}`. `forms-proxy.ts` extrai proc-name de `/proc/<name>` no
endPoint e executa **localmente** no SQL Server do tenant — não roteia para
`/portal-aws/proc/`. Mesmo gap de F090.

F094a herda esse débito: o model é declarativo-correto, mas o submit
end-to-end via engine em produção exige que `forms-proxy` (ou o renderer de
`entityActions`) detecte endpoints `/portal-aws/proc/...` e roteie via a
rota literal portal-aws-proxy. Débito sistêmico (D5/D7/D9/D10/D11) acumulado
de F090/F092a-d/F093 — fora do escopo desta sub-feature.

### D6 — Engine renderer `entityActions` é débito sistêmico (D11)

Shape `entityActions` (D2) é NOVO no Studio. Engine atual
(`packages/ui/src/components/model-engine.tsx`) conhece `genericform` e
`datagrid`/`filtro`, mas NÃO conhece `entityActions`. Mesmo padrão de D10
(`logoUploader` de F092d) — F117 enfileira engine renderer logoUploader, e
um follow-up análogo será necessário para entityActions.

Manifest F094a exige aceite mecânico do slot — shape correto no DB,
renderer para fase UI quando esbuild desbloquear F108 + sub-contrato
`model-valor-entity-actions` formalizado.

Sugiro enfileirar follow-ups gemelares de F116+F117:
- **F119 (P2)** — contrato `mind/atlas/concepts/legacy-contracts/model-valor-entity-actions.md`
  documentando shape `entityActions` (selectLabel/submitLabel/successMessage/
  errorMessage/actions[].key/label/endPoint).
- **F120 (P3)** — engine renderer `entityActions` em `packages/ui/` consumindo
  shape F119. Bloqueia chamada runtime das 10 procs via UI; não bloqueia
  cutover de F094a (shape do model está canônico).

### D7 — Stubs slots 0/1 (utilitarios + opcoes) ficam declarados como deferred

F094b (utilitarios) e F094c (opcoes) estão `deferred` no manifest pendente
de survey backend (`/api/status`, `/api/pedidos`, `/api/opcoes`, catálogo
`codigo`). Stubs declaram `genericPageTitle: "Utilitários (TBD F094b)"` /
`Opções (TBD F094c)" + descrição explicando o estado pendente. Quando F094b/c
saírem do deferred, JSON_MODIFY do slot correspondente substitui o stub.

### D8 — Reuso integral de F090 portal-aws-proxy + F048 bridge mock

F090 já implementa `POST /portal-aws/proc/:proc` (sanitização `[schema.]proc`,
gate sessão, forward via `PortalAwsClient.sendRequest`). F048 mock cobre as
10 procs via `PortalAwsClient.resolveConfig` (banco ou env STUDIO_AWS_URL).

F094a NÃO cria rota nova, NÃO toca em portal-aws-proxy.ts, NÃO toca em
aws-client.ts. Reuso 100%.

## Artefatos

- `infra/sql/seed/F094a-model-configuracoes-aws-entidades.sql` — seed
  idempotente T-SQL com JSON_MODIFY surgical em `$.pageTabs[2]`.
- `apps/api/src/scripts/apply-f094a-seed.ts` — runner dotenv + mssql +
  post-check JSON parse + assert das 10 actions ordem+labels+endpoints.
- `apps/api/src/scripts/probe-f094a.ts` — 3 vetores: DB shape (1), bridge
  via mock standalone portal-aws para as 10 procs (2), route gates do
  portal-aws-proxy F090 (3).

## Validação local (smith pré-entrega)

- `apply-f094a-seed.ts` rodou 2× contra
  `172.27.0.121\SQL2k19.DBdirector_imperial_logistica_29` com OK final:
  `DFid_model_pagina=22; pageTabs=3; pageTabs[2]=entidades com entityActions
  10 actions (redes/empresas/centros/departamentos/veiculos/feriados/
  fornecedores/itens/planos/usuarios); slots 0 utilitarios + 1 opcoes
  preservados (stubs F094b/c)`. Byte-perfect idempotente.
- `probe-f094a.ts` **14/14 PASS**:
  - (1) `db.model.configuracoes_aws.pageTabs[2]` — DFid=22, pageTabs=3, 10
    actions OK, slots 0/1 preservados, anti-violação 5 classes (cotacao,
    agent, sp_persistir_configuracao_aws, /api/integradoraws/,
    aws_sincronizar_entidade).
  - (2) `bridge.happy.portal.sincronizar_*` × 10 — JWT R7 + envelope
    `<Sucesso>true</Sucesso>` para todas as 10 procs.
  - (3) Route gates: health 200; POST sem cookie em
    `portal.sincronizar_redes` → 503 (sanitização aceita `schema.proc`);
    proc com dashes → 503.
- `npx turbo typecheck` — 3 packages successful (3.603s cache miss api).

## Anti-violação

- Leitura permitida: somente
  `mind/atlas/concepts/legacy-contracts/integrador-aws-component.md`
  (contrato do arqueólogo). NENHUMA leitura em
  `sources/engenharia--fabrica--*` foi feita nesta sub-feature.
- Reuso: F090 portal-aws-proxy.ts + aws-client.ts (PortalAwsClient) +
  app-registry/multi-app-proxy (não usados — F094a é portal-aws, não
  multi-app). Nenhuma rota nova criada.

## Gates e dependências

- ✓ F090 accepted (rota literal `POST /portal-aws/proc/:proc` + sanitização
  + forward via PortalAwsClient JWT R7).
- ✓ F048 runtime-stable (mock bridge cobre as 10 procs em probe; cf
  bridge.happy.* 10/10 PASS).
- ⏳ F108 deferred (esbuild bloqueia smoke; shape `pageTabs` consumido pelo
  ModelEngine continua planejado — F094a entrega o **dado correto**, não
  depende de F108 rodar para ser aceito).

## Débitos declarados

- **D5** (herdado) — submit funcional via engine não routa `/portal-aws/proc/`
  através de forms-proxy. Mesmo de F090/F092a-d.
- **D11** (novo) — engine renderer `entityActions` em `packages/ui/`. Shape
  canônico está no DB; renderer é fase posterior. Sugerido enfileirar F119
  (sub-contrato) + F120 (engine renderer), gemelares de F116+F117 para
  logoUploader.

Herdados de F090: D4 (load inicial). De F092a-d: D5, D6, D7, D8, D9, D10.
De F093: D9.

## Notas

- F094a NÃO toca em forms-proxy.ts ou portal-aws-proxy.ts — débito de submit
  cross-rota é sistêmico (D5) e fora do escopo desta sub-feature.
- Os stubs `utilitarios`/`opcoes` (D7) NÃO poluem o model com conteúdo
  errado: cada um declara só `genericPageTitle` "(TBD F094b/c)" + descrição.
  Quando F094b/c saírem do deferred, JSON_MODIFY do slot correspondente
  substitui o stub.
- EPIC F094 aceita só com F094a aceito; F094b/c podem permanecer deferred
  cf manifest (cutover-fase-2 análogo a F109).
