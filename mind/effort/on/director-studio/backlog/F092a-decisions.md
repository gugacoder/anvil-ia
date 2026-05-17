---
title: "F092a — Sub-model do tab `gerais` (decisões de implementação)"
tags: [effort, director-studio, F092a, F092, F052b, refactor, decisions]
created: 2026-05-17
---

# F092a — Decisões de implementação

Sub-feature 1/4 do EPIC F092. Tab `gerais` de `Configuracoes/Cotacao/Cotacao.jsx`
→ componente `CotacaoConfig.jsx` real.

## Contrato lido (anti-violação exceção: briefing explícito)

`sources/.../Configuracoes/Cotacao/CotacaoConfig.jsx` (170 linhas):
- 2 inputs texto: `nomeEmpresa`, `integradorIp` (com `<small><i>` info "IP ou DNS").
- 7 checkboxes: `emailAtivacaoHabilitado`, `botaoAcoesAtivado`,
  `botaoVendedoresAtivado`, `botaoVincularAtivado`, `habilitarPrecoUnitario`,
  `menuHistoricoAtivado`, `habilitarPlanoPagamento`.
- 1 select via API legada `/select/planoPagamento` com `defaultOption="-- Todos
  os planos --"` e `defaultOptionValue=null`: `planoPagamentoErpId`.
- Bool-like aceito: `'true' | true`.
- Procs reais: `execProc('cotacao_persistir_config_opcoes')` + `execProc(
  'cotacao_sp_consultar_opcoes')` via `useAppClient()` (default appKey
  `cotacao`) → `POST /api/cotacao/proc/<proc>`.

Procs SQL reais lidas em
`sources/.../portal-aws/cotacao/programacao/*.sql`:
- `cotacao_persistir_config_opcoes(@xml)` — espera 10 campos no XML (case-
  insensitive lower-case-name match): `nomeEmpresa`, `integradorIp`,
  `emailAtivacaoHabilitado`, `botaoAcoesAtivado`, `botaoVendedoresAtivado`,
  `botaoVincularAtivado`, `habilitarPrecoUnitario`, `menuHistoricoAtivado`,
  `habilitarPlanoPagamento`, `planoPagamentoErpId`. Persiste em `Configuracao`
  (tabela KV `Chave`/`Valor`) e `Recurso` (`Titulo='Histórico'`).
- `cotacao_sp_consultar_opcoes(@xml)` — retorna SELECT com aliases camelCase
  `NomeEmpresa`/`IntegradorIp`/`EmailAtivacaoHabilitado`/...
  /`MenuHistoricoAtivado`/`HabilitarPlanoPagamento`/`PlanoPagamentoErpId`.
  Bool-like serializado como `'true'`/`'false'`. `MenuHistoricoAtivado`
  derivado de `Recurso.Habilitado` (1→true/0→false), não de `Configuracao`.

## Decisões

### D1 — Roteamento: appKey `cotacao` via F110 multi-app-proxy

- URLs no model: `/api/cotacao/proc/cotacao_persistir_config_opcoes` (endPoint)
  + `/api/cotacao/proc/cotacao_sp_consultar_opcoes` (api).
- **NÃO** usar `/portal-aws/proc/...` (appKey errado, diferente registration
  em `acesso.TBaplicacao`).
- Auth: `case "cotacao" → Basic("processa|{DFdominio}:99")` (R4 do
  [[tbaplicacao-registry]]) + header `Domain:{DFdominio}` (R6) + URL
  `{DFendereco}/api/proc/{proc}` literal (R7).
- F110 já implementa o switch em `app-registry.ts:buildOutboundHeaders` —
  zero código novo em apps/api/src/routes; reusamos `multi-app-proxy.ts`
  inteiro.

### D2 — Shape: sub-model F043 sob `pageTabs[0]` (F108)

- Engine F108 consome `pageTabs: [{key,label,model}]` com `tab.model`
  despachado recursivamente pelo `<ModelEngine/>` (paridade smoke-f108.tsx).
- F092a escreve a **page inteira** `portal-director.configuracoes_cotacao`
  com 4 slots de `pageTabs`:
  - slot 0 (`gerais`): real, com `genericform` + 10 fields.
  - slot 1 (`usuarios`): stub `genericPageTitle: "Usuários (TBD F092b)"`.
  - slot 2 (`email`): stub `genericPageTitle: "E-mail (TBD F092c)"`.
  - slot 3 (`logo`): stub `genericPageTitle: "Logo (TBD F092d)"`.
- Quando F092b/c/d rodam depois, **JSON_MODIFY** substitui apenas o slot
  correspondente — preserva os demais.

### D3 — Idempotência: JSON_MODIFY em `$.pageTabs[0]` quando row já existe

- Se a row de `configuracoes_cotacao` não existe → INSERT com `pageTabs[0..3]`
  (slot 0 real + 3 stubs).
- Se existe mas `pageTabs` é ausente (F043 inventou shape flat `genericform`
  single, conforme F043-decisions.md OK id=18) → **full rewrite** com
  `@fullValor`. Esta é a transição F043 → F108.
- Se existe e já tem `pageTabs[0].key` (já passou pelo F092a antes ou tem
  pageTabs de outro sub-feature) → `JSON_MODIFY($.pageTabs[0], @geraisTab)`
  preserva slots 1-3 que F092b/c/d podem ter escrito.

Validei idempotência: 2 applies seguidos retornam o mesmo `DFid_model_pagina=18`
com `pageTabs=4` e 10 campos no slot 0 (probe re-rodada PASS pós-2º apply).

### D4 — Submit funcional: gap conhecido (paridade com F090)

`GenericFormRenderer` submete via `POST /api/forms-proxy` com body `{endPoint,
body}`. `forms-proxy.ts` extrai proc-name de `/proc/<name>` no endPoint e
executa **localmente** no SQL Server do tenant — não roteia para
multi-app-proxy. Isso é o mesmo gap que F090 declarou (procs do appKey
`portal-aws` também precisam do gateway HTTP, não do exec local).

F092a herda esse débito: o model é declarativo-correto, mas o submit
end-to-end via `<GenericFormRenderer>` em produção exige que `forms-proxy` (ou
o renderer) detecte endpoints `/api/:appKey/proc/...` e roteie via
multi-app-proxy. Não há feature dedicada no manifest — é débito sistêmico
acumulado de F090/F092a-d/F093/F094. Sugerido enfileirar como follow-up
("forms-proxy multi-app routing").

### D5 — Load inicial de valores: gap conhecido (paridade com F090)

`GenericFormRenderer` declara `config.api` mas **não auto-fetcha** — sem load,
o form aparece em branco e perde valores anteriores. Legado faz `getData()`
em `useEffect`. Mesmo débito de F090. F092a entrega o model declarativo
correto; load funcional é outra feature.

### D6 — Field `planoPagamentoErpId`: declarado `selectDataType:"api"` com
`api:"/select/planoPagamento"`

O legado tem um endpoint REST `/select/planoPagamento` separado das procs
(retorna lista de planos). Não é proc, é uma rota plain do Director.Website.
No Studio, essa rota ainda não existe — F019 (search-input/select dinâmico)
está como `deferred` no renderer (gap conhecido). Por enquanto o select
aparece como **placeholder** com aviso "ctype não implementado nesta onda"
(comportamento padrão do GenericFormRenderer para `selectDataType != fixedList`).
Não bloqueia F092a (anti-violação ok: declaração espelha o legado).

### D7 — Smoke route: não criar dedicada; smoke-f108.tsx já cobre `pageTabs`

A rota `/smoke/f108` (esbuild bloqueado em ui-tester, mas o conceito existe)
já demonstra `pageTabs` com sub-models. Quando o ModelEngine for capaz de
consumir `pageKey="portal-director.configuracoes_cotacao"` e a multi-app-proxy
fizer o submit, F092a renderiza naturalmente em `/app/configuracoes_cotacao`
(rota dinâmica do app-shell). Não vale criar `smoke-f092a.tsx` separado:
seria duplicata de F108.

## Artefatos

- `infra/sql/seed/F092a-model-cotacao-gerais.sql` — seed idempotente
  T-SQL com JSON_MODIFY.
- `apps/api/src/scripts/apply-f092a-seed.ts` — runner dotenv + mssql +
  post-check JSON parse + assert dos 10 campos.
- `apps/api/src/scripts/probe-f092a.ts` — 3 vetores: DB shape, bridge
  forward via helpers F110 (mock cotacao), route gates (multi-app-proxy).

## Validação local (smith pré-entrega)

- `apply-f092a-seed.ts` rodou 2× contra
  `172.27.0.121\SQL2k19.DBdirector_imperial_logistica_29` com OK final:
  `DFid_model_pagina=18; pageTabs=4; pageTabs[0]=gerais com endPoint+api
  /api/cotacao/proc/... e 10 campos`. Idempotente.
- `probe-f092a.ts` 6/6 PASS:
  - `db.model.configuracoes_cotacao.pageTabs[0]` — DFid=18, 10 campos.
  - `bridge.cotacao.cotacao_persistir_config_opcoes` — Basic R4 + Domain R6 + URL R7.
  - `bridge.cotacao.cotacao_sp_consultar_opcoes` — idem.
  - `route.cotacao.proc.no-session` — 503 gate sessão/redis.
  - `route.cotacao.health` — 200 OK.
  - `route.invalid-app-key.uppercase` — 503 gate kebab-case R10/R23.
- `npx turbo typecheck` — 3 packages successful.

## Anti-violação

- Leitura permitida: `CotacaoConfig.jsx` (briefing explícito) +
  `cotacao_persistir_config_opcoes.sql` + `cotacao_sp_consultar_opcoes.sql`
  (procs reais para extrair shape do XML+SELECT). Nenhuma outra leitura em
  `sources/engenharia--fabrica--*` feita nesta sub-feature.
- Reuso: `app-registry.ts` (F110) + `multi-app-proxy.ts` (F110) inteiros, sem
  modificação. Nenhuma rota nova criada (F110 já generaliza para qualquer
  appKey).

## Gates e dependências

- ✓ F110 accepted (multi-app-proxy + app-registry com switch Basic/Bearer).
- ✓ F113 accepted (TBaplicacao Imperial tem appKey `cotacao` com `DFendereco='http://127.0.0.1:5000'`).
- ⏳ F108 deferred (esbuild bloqueia smoke; shape `pageTabs` consumido pelo
  ModelEngine continua planejado — a F092a entrega o **dado correto**, não
  depende de F108 rodar para ser aceito).

## Notas

- F092a NÃO toca em `forms-proxy.ts` ou `multi-app-proxy.ts` — débito de
  submit cross-app é sistêmico (vide D4) e fora do escopo desta sub-feature.
- Os stubs `usuarios`/`email`/`logo` (D2) **NÃO** poluem o model com
  conteúdo errado: cada um declara só `genericPageTitle` "(TBD F092X)".
  Quando F092b/c/d rodam, JSON_MODIFY do slot correspondente substitui o
  stub pelo sub-model real, sem tocar nos demais.
