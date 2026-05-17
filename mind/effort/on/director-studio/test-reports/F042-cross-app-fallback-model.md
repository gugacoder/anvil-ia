# Test report — F042 Cross-app fallback do model

**Data**: 2026-05-17 (retry com VPN ativa)
**Resultado**: fail
**Ambiente**: localhost:3001 (apps/api) + SQL `172.27.0.121\SQL2k19` DB `DBdirector_imperial_logistica_29` (Área 52, Imperial Logística)
**Caso real testado**: tenant Imperial Logística — apps presentes: `portal-director`, `wms`. Login AD `processa\guga` via LDAP bridge.

## Cenários cobertos

| # | Cenário (DoD briefing) | Esperado (contrato §F042) | Observado | Resultado |
|---|---|---|---|---|
| sanity-1 | `/api/model` sem cookie | 401 | `{"ok":false,"error":"no-session"}` HTTP 401 | pass |
| auth | `POST /api/auth/login` com `processa\guga` (LDAP bridge) | 200 + cookie `director_session` | `{"ok":true,"user":{...,"path":"ldap-bridge"}}` HTTP 200, cookie httpOnly | pass |
| A | `app=portal-director&path=/acessos/usuarios` → `fellBack:false` | payload com idModel + `fellBack:false` (etapa 1 resolveu sem fallback) | `{ok:true, idModel:14, fellBack:null, divergences:["TBmodel_pagina sem DFid_aplicacao nesta base — tenancy por app não aplicada (F042); fellBack=null"]}` HTTP 200 | **fail** — discriminador `fellBack` retorna `null`, não `false` |
| B | appKey legítimo sem model próprio + path core processa → `fellBack:true` | payload + `fellBack:true` | `app=cotacao&path=/acessos/usuarios` → `{ok:true, idModel:14, appKey:"cotacao", fellBack:null}` (serviu o model do portal-director ignorando appKey) | **fail** — appKey é ignorado; não há resolução em duas etapas; `fellBack:null` |
| C | `app=processa&path=/acessos/usuarios` → `fellBack:false`, query única | payload + `fellBack:false`, sem etapa 2 redundante | `{ok:true, idModel:14, appKey:"processa", fellBack:null}` (mesmo idModel que A e B) | **fail** — `fellBack:null` em vez de `false`; comportamento idêntico para qualquer appKey |
| D | path inexistente em ambos | 404 ou payload vazio com `fellBack` consistente | `{ok:false, error:"page-not-found", message:"no TBpagina with DFcaminho=/totalmente/inventado/nao-existe"}` HTTP 404 | pass — 404 explícito (porém sem campo `fellBack` no payload) |

Resultado agregado: **2/6 pass** (sanity + auth + D), **3/6 fail** (A, B, C). DoD do briefing exige 4/4 dos cenários A-D — atingido 1/4.

## Retry — o que mudou desde o run anterior

VPN Processa **ativa**: `172.27.0.121` ping 48ms TTL=127. SQL2k19 alcançável (handler bate na base e retorna 200 com payload real, não mais `fetch-failed` HTTP 500). **Auth path** permanece OK (LDAP bridge).

Com a barreira de rede removida, observa-se o **comportamento real** do handler — e ele **não implementa a asserção F042 do contrato**.

## Falhas (descrição precisa)

### F042.A — `fellBack:false` esperado, `fellBack:null` observado

Contrato §"Asserção F042" (linhas 222-225 de `obter-model-pagina.md`):
> O backend Studio implementa o fallback em **duas etapas sequenciais**... O payload da resposta carrega `fellBack: boolean` discriminando se a segunda etapa foi usada.

Observado: `fellBack:null` com `divergences:["TBmodel_pagina sem DFid_aplicacao nesta base — tenancy por app não aplicada (F042); fellBack=null"]`.

O handler **se autodeclara não-conforme** via divergence message — admite que a tenancy por app não está sendo aplicada porque a tabela `TBmodel_pagina` neste seed não tem `DFid_aplicacao`. Confirmei via query direta ao schema: `TBmodel_pagina` só tem `DFchave_pagina` como discriminador (não há coluna de aplicação). A resolução real é pelo `JOIN` `TBpagina.DFcaminho=path` × `TBmodel_pagina.DFchave_pagina=TBpagina.DFchave`, ignorando `appKey`.

### F042.B — appKey ignorado; fallback inexistente

Esperado: `app=cotacao&path=/acessos/usuarios` deveria não achar nada na etapa 1 (cotacao não tem essa página) e tentar etapa 2 com `app=processa`. Observado: retorna `idModel:14` (model do `portal-director`) com `appKey:"cotacao"` literalmente ecoado, `fellBack:null`. O handler **não filtra por appKey** — qualquer appKey + qualquer path conhecido retorna o mesmo model.

### F042.C — comportamento idêntico para `app=processa` e qualquer outro

Esperado: cenário C deveria ser **query única** (sem etapa 2) — `fellBack:false` consistente. Observado: idêntico aos demais (`idModel:14`, `fellBack:null`). Indistinguível de A e B em termos de comportamento.

## O que está correto

- **Auth**: LDAP bridge para AD funciona; cookie `director_session` httpOnly emitido.
- **Gating**: rota retorna 401 sem cookie (forma do contrato preservada).
- **Lookup por path**: `TBpagina.DFcaminho` é o predicado real; path inexistente → 404 limpo (cenário D).
- **Cache**: segunda chamada idêntica vem com `cached:true` — cache de resposta funciona (ortogonal a F042; melhora a UX, mas não substitui o discriminador).
- **Honestidade**: o handler **anuncia** a divergência via campo `divergences[]` no payload. Não esconde o gap — apenas não o resolve.

## Divergências informativas (não bloqueantes)

1. **Endpoint é `GET ?app=&path=`, não `POST` com body** (legado .NET é `POST /api/model` com `{caminho, chaveAplicacao}`). Documentado como decisão consciente do Studio. Sanity: `POST /api/model` → 404. Confirma intenção.
2. **Resposta carrega `modelStringRaw`** (string JSON serializada) + `modelJson` (objeto parseado) — legado entrega só `model:string`. Conveniente para o frontend evitar `JSON.parse` redundante; não fere contrato.
3. **Campo `divergences[]` no payload** — não previsto pelo contrato, mas útil como sinal de auto-declaração. Curator pode promover a feature do contrato.

## Causa-raiz e próxima ação

A asserção F042 do contrato pressupõe que `TBmodel_pagina` tenha `DFid_aplicacao` (replicando estrutura do legado .NET com `JOIN` em `TBaplicacao`). O seed atual de Imperial Logística **não tem essa coluna** — segue o schema legacy SQL puro (`DFchave_pagina` único, sem app key). Há duas saídas possíveis:

- (a) **Schema migration**: adicionar `DFid_aplicacao` em `TBmodel_pagina` + backfill no seed F043 (associar cada `wms.*` à app `wms` e cada `portal-director.*` à app `portal-director`). Smith reimplementa two-step query keyed em `DFid_aplicacao`.
- (b) **Reescrever contrato**: aceitar resolução por `DFchave_pagina` apenas (escopo já embute prefixo `appKey.pageKey` — e.g. `portal-director.acessos_usuarios`) e abandonar `fellBack` como discriminador. Curator decide se a divergência atual é fit ou exige redo.

Resta também o caso B propriamente dito (legítimo fallback): só seria exercitável com **um model cuja `DFchave_pagina='processa.X'` e um path que esse model serve via fallback** — o seed atual não tem nenhuma página `processa.*`.

**Resultado declarado**: fail. ui-tester **não marca** Tested=✓ no manifest. Smith precisa decidir entre (a) ou (b) com o curator; depois reimplementa e reabre para retest.

## Evidência

- `D:/anvil/.tmp/cookies-f042-retry.txt` — cookie de sessão
- Probe SQL direta (script descartado): confirmou 16 páginas em 2 apps (`portal-director`, `wms`), 15 models, **0** com `DFid_aplicacao` discriminável, **0** modelos em `processa`
- Respostas HTTP completas dos 4 cenários acima — capturadas neste run
- console api: respondeu 200 ao path real após VPN ativa; sem erros após primeiro warm-up de conexão

## Linha do progress

`[ui-tester] F042 fail: fellBack=null em A/B/C (esperado false/true/false); appKey ignorado no lookup; handler auto-declara divergence "TBmodel_pagina sem DFid_aplicacao nesta base"; D ok 404. 1/4 cenários DoD ok. Curator decide: schema migration (add DFid_aplicacao + backfill) ou reescrita do contrato.`
