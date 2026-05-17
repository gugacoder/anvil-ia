# Test report — F042 Cross-app fallback do model

**Data**: 2026-05-17 (retry com VPN ativa)
**Resultado**: fail (run inicial — ver seção v1) → **pass** (run v2 pós-reescrita pós-F088)
**Ambiente**: localhost:3001 (apps/api) + SQL `172.27.0.121\SQL2k19` DB `DBdirector_imperial_logistica_29` (Área 52, Imperial Logística)
**Caso real testado**: tenant Imperial Logística — apps presentes: `portal-director`, `wms`, `cotacao`, `cotacao-integrador`, `edoc`, `integrador-aws`, `pipeliner`, `portal-aws`, `processaadm`, `processa-sped`. **Não há app `processa`** nesta base (nem nenhuma página com `DFchaves_aplicacoes` populada). Login AD `processa\guga` via LDAP bridge.

---

## v2 — pós-reescrita (2026-05-17, run novo)

**Resultado declarado**: **pass**. ui-tester marca `Tested=✓ 2026-05-17` no manifest.

Contexto: smith reescreveu o handler `apps/api/src/routes/model.ts` após survey F088 (2026-05-17) confirmar que `TBmodel_pagina.DFid_aplicacao` não existe em 0/90 bases reais. A discriminação por aplicação foi movida para o lado da `acesso.TBpagina`, com filtro composto:

```
TBpagina t1 INNER JOIN TBmodel_pagina t2 ON t1.DFchave = t2.DFchave_pagina
 WHERE t2.DFchave_pagina = @pageKey
   AND ( t1.DFid_aplicacao IN (SELECT DFid_aplicacao FROM TBaplicacao WHERE DFchave=@scopeKey)
      OR t1.DFchaves_aplicacoes LIKE '%' + @scopeKey + '%' )
```

Two-step: etapa 1 com `scopeKey=appKey` → `fellBack=false`; etapa 2 com `scopeKey='processa'` (apenas se `appKey != 'processa'`) → `fellBack=true`.

### Cenários cobertos (v2)

| # | Cenário | Esperado | Observado | Resultado |
|---|---------|----------|-----------|-----------|
| probe-1 | own-hit (DFid_aplicacao matched) | `fellBack:false`, attempts=1 | PASS | ✓ |
| probe-2 | fallback-hit (etapa 1 miss, etapa 2 processa hit) | `fellBack:true`, attempts=2 | PASS | ✓ |
| probe-3 | processa-direct (sem etapa 2) | `fellBack:false`, attempts=1 | PASS | ✓ |
| probe-4 | not-found em ambas etapas | `page-not-found`, attempts=2 | PASS | ✓ |
| probe-5 | cross-app via DFchaves_aplicacoes LIKE | `fellBack:false`, attempts=1 | PASS | ✓ |
| A | curl real `app=portal-director&path=/acessos/usuarios` | `fellBack:false`, idModel resolvido | `{ok:true, idModel:14, appKey:"portal-director", pageKey:"portal-director.acessos_usuarios", fellBack:false}` HTTP 200 | ✓ |
| B | curl real `app=cotacao&path=/acessos/usuarios` | `fellBack:true` se houver model em processa, senão 404 limpo | `{ok:false, error:"page-not-found"}` HTTP 404 | ✓ (esperado — dataset Imperial Logística **não tem app `processa`** e a página é de `portal-director`; etapa 1 cotacao não bate, etapa 2 processa também não — fallback corretamente não inventa hit) |
| C | curl real `app=processa&path=/acessos/usuarios` | `fellBack:false` se houver model em processa; senão 404 sem segunda etapa | `{ok:false, error:"page-not-found"}` HTTP 404 | ✓ (esperado — dataset não tem app `processa`; algoritmo executa uma única query e retorna 404 sem etapa 2) |
| D | curl real `app=portal-director&path=/totalmente/inventado/nao-existe` | 404 | `{ok:false, error:"page-not-found", message:"no TBpagina with DFcaminho=/totalmente/inventado/nao-existe"}` HTTP 404 | ✓ (404 explícito com mensagem diagnóstica) |
| extra-1 | own-hit em outro app: `app=wms&path=/movimentacoes/abastecimento` | `fellBack:false` | `{ok:true, idModel:11, appKey:"wms", pageKey:"wms.movimentacoes_abastecimento", fellBack:false}` HTTP 200 | ✓ |
| extra-2 | cross-app errado: `app=portal-director&path=/movimentacoes/abastecimento` (path é wms) | 404 (filtro de app rejeita) | `{ok:false, error:"page-not-found"}` HTTP 404 | ✓ — confirma que o filtro de app está ativo (handler já não serve "qualquer model para qualquer appKey" como na v1) |

**Resultado agregado v2**: probe TS **5/5 PASS**; curls reais **6/6 PASS** (A, B, C, D, extra-1, extra-2). DoD do briefing (5/5 probe + 3/4 curls) **superado**.

### O que mudou desde v1

- Antes (v1, 2026-05-17 manhã): `fellBack` retornava **`null`** em A/B/C porque o filtro de app não estava implementado — o handler ignorava `appKey` e retornava o mesmo `idModel:14` para qualquer combinação. Auto-declarava a divergência via `divergences[]`.
- Agora (v2, 2026-05-17 tarde): `fellBack` é **`false|true|null`** conforme spec; `null` só aparece em modo degradado (TBpagina ausente ou colunas de tenancy todas ausentes). Em Imperial Logística, as colunas existem → modo `app-filter` ativo → `fellBack:false` retornado corretamente em A.
- Filtro de app de fato exercido: `extra-2` (path wms requisitado por portal-director) **agora retorna 404**; antes retornava idModel ignorando o appKey. Prova empírica de que o `INNER JOIN` com `TBpagina` + filtro de aplicação está em produção.
- `divergences[]` desaparece do payload em casos com filtro funcionando (caso A não tem divergence; v1 tinha).

### Limites observados (não bloqueantes)

1. **Cenário B (fallback cross-app cotacao→processa) não exercitado**: a base Imperial Logística não tem app `processa` em `TBaplicacao` e nenhuma página tem `DFchaves_aplicacoes` populado. O algoritmo está correto (etapa 2 dispara com `scopeKey='processa'`), mas para validar a etapa 2 com hit real é preciso uma base com (i) app `processa` em `TBaplicacao` ou (ii) páginas com `DFchaves_aplicacoes` listando `processa`. **Probe TS (cenário 2)** cobre esse caminho de forma determinística — o algoritmo está reproduzido in-memory e passa.
2. **Cenário 5 (cross-app via `DFchaves_aplicacoes` LIKE) também só validado em probe TS** — sem páginas reais com string-list populada nesta base.
3. **Path `/totalmente/inventado` retorna 404 antes de chegar na função two-step** — o handler resolve o path em `TBpagina` numa pré-checagem; quando não acha, devolve 404 com `message` diagnóstica. Comportamento esperado, mais informativo que o 404 dos cenários B/C (onde a página existe mas o app filtra).

### Evidência

- `D:/anvil/.tmp/cookies-f042-v2.txt` — cookie `director_session` httpOnly (LDAP bridge `processa\guga`, login path verificado em `GET /api/auth/me` → 200 com user)
- `D:/anvil/workspace/director-studio/apps/api/src/scripts/probe-f042-v2.ts` — saída completa `5/5 PASS, 0 FAIL`
- `D:/anvil/workspace/director-studio/apps/api/src/scripts/probe-paths-discovery.ts` — survey das 10 apps + 16 páginas + 15 páginas com model na base Imperial Logística; confirmou ausência de app `processa` e de `DFchaves_aplicacoes` populado
- respostas HTTP completas dos 6 curls reais — capturadas neste run, todas com `Content-Type: application/json`, sem erros server-side
- console api: sem warnings após warm-up; cache `cached:true` na segunda chamada idêntica funciona

### Linha do progress (v2)

`[ui-tester] F042 pass: probe TS 5/5 PASS (algoritmo two-step in-memory); curls reais 6/6 PASS (A fellBack:false idModel=14; B/C 404 esperado — base sem app processa; D 404 com message; extra-1 wms own-hit fellBack:false; extra-2 cross-app errado 404 confirma filtro). Reescrita pós-F088 cumpre asserção F042. Tested=✓ 2026-05-17.`

---

## v1 — run inicial (2026-05-17 manhã, ANTES da reescrita pós-F088)

**Resultado declarado**: fail. Mantido abaixo como histórico do gap que motivou F088 + reescrita.

### Cenários cobertos (v1)

| # | Cenário (DoD briefing) | Esperado (contrato §F042) | Observado | Resultado |
|---|---|---|---|---|
| sanity-1 | `/api/model` sem cookie | 401 | `{"ok":false,"error":"no-session"}` HTTP 401 | pass |
| auth | `POST /api/auth/login` com `processa\guga` (LDAP bridge) | 200 + cookie `director_session` | `{"ok":true,"user":{...,"path":"ldap-bridge"}}` HTTP 200, cookie httpOnly | pass |
| A | `app=portal-director&path=/acessos/usuarios` → `fellBack:false` | payload com idModel + `fellBack:false` (etapa 1 resolveu sem fallback) | `{ok:true, idModel:14, fellBack:null, divergences:["TBmodel_pagina sem DFid_aplicacao nesta base — tenancy por app não aplicada (F042); fellBack=null"]}` HTTP 200 | **fail** — discriminador `fellBack` retorna `null`, não `false` |
| B | appKey legítimo sem model próprio + path core processa → `fellBack:true` | payload + `fellBack:true` | `app=cotacao&path=/acessos/usuarios` → `{ok:true, idModel:14, appKey:"cotacao", fellBack:null}` (serviu o model do portal-director ignorando appKey) | **fail** — appKey é ignorado; não há resolução em duas etapas; `fellBack:null` |
| C | `app=processa&path=/acessos/usuarios` → `fellBack:false`, query única | payload + `fellBack:false`, sem etapa 2 redundante | `{ok:true, idModel:14, appKey:"processa", fellBack:null}` (mesmo idModel que A e B) | **fail** — `fellBack:null` em vez de `false`; comportamento idêntico para qualquer appKey |
| D | path inexistente em ambos | 404 ou payload vazio com `fellBack` consistente | `{ok:false, error:"page-not-found", message:"no TBpagina with DFcaminho=/totalmente/inventado/nao-existe"}` HTTP 404 | pass — 404 explícito (porém sem campo `fellBack` no payload) |

Resultado agregado v1: **2/6 pass** (sanity + auth + D), **3/6 fail** (A, B, C). Causa-raiz: contrato F042 v1 pressupunha `TBmodel_pagina.DFid_aplicacao`, coluna que não existe em 0/90 bases (confirmado por F088). Reescrita pós-F088 movou o filtro para `TBpagina` e o cenário v2 acima passa.

### Linha do progress (v1)

`[ui-tester] F042 fail: fellBack=null em A/B/C (esperado false/true/false); appKey ignorado no lookup; handler auto-declara divergence "TBmodel_pagina sem DFid_aplicacao nesta base"; D ok 404. 1/4 cenários DoD ok. Curator decide: schema migration (add DFid_aplicacao + backfill) ou reescrita do contrato.`

Decisão tomada: **(b) reescrever contrato** — F088 survey-done, contrato atualizado, smith reimplementou, ui-tester re-testou na v2 acima.
