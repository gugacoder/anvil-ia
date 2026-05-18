---
title: "Test report — F094a IntegradorAWS tab entidades"
tags: [test-report, director-studio, F094a, fail]
created: 2026-05-17
---

# Test report — F094a IntegradorAWS tab entidades

**Data**: 2026-05-17
**Resultado**: **fail**
**Ambiente**: localhost:3001 (api dev, VPN ATIVA)
**Caso real testado**: DBdirector_imperial_logistica_29 @ 172.27.0.121\\SQL2k19 (tenant Imperial Logistica), user `processa` via temp-password F068.

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| 1 | `probe-f094a.ts` 14/14 PASS | 14 PASS, 0 FAIL, 0 SKIP | `14 PASS, 0 FAIL, 0 SKIP (total 14)` | ✓ |
| 2 | Curl autenticado `GET /api/model?app=portal-director&path=/configuracoes/integrador_aws` retorna `pageTabs[2].key='entidades'` com `entityActions.actions.length=10` e slots 0/1 stubs | 200 + pageTabs[2].entityActions com 10 actions | **404 page-not-found**: `no TBpagina with DFcaminho=/configuracoes/integrador_aws` | ✗ |
| 2b | (extra) Path corrigido `/configuracoes/integrador-aws` (hifén — DFcaminho real em TBpagina) retorna o sub-model F094a | 200 + pageTabs com 3 tabs e entityActions no slot 2 | 200 mas servindo **model legado antigo (DFid=21, shape genericform flat, sem pageTabs)**. Seed F094a (DFid=22) está **orfão** | ✗ |
| 3 | `POST /portal-aws/proc/portal.sincronizar_redes` com cookie da sessão → 502 (F048 mock não rodando) | 502 + envelope `aws-unreachable` | 502 com `{"ok":false,"error":"aws-unreachable","message":"AWS inacessível em http://127.0.0.1:5100/api/proc/portal.sincronizar_redes: fetch failed"}` | ✓ |
| 4 | `apply-f094a-seed.ts` rodado 2× — segunda execução idempotente | 2× OK com mesmo `DFid_model_pagina=22; pageTabs=3; 10 actions` | 2× OK idênticos (linha de saída byte-perfeita) | ✓ |

## Falhas (críticas)

### F094a.case-2 — DFcaminho do seed não bate com TBpagina

**Esperado** por [[integrador-aws-component]] §"Citações" linha 23 (e §"Resumo" linha 13): ACL e roteamento da página vivem em `'/configuracoes/integrador-aws'` (hífen).

**Esperado** pela própria DoD da entrega (curl com `path=/configuracoes/integrador_aws`, underline): que essa query resolva via `acesso.TBpagina` → `DFchave_pagina` do seed.

**Observado** no DB do tenant `imperial_logistica_29`:

```text
TBpagina única matching aws/integrador:
  DFchave  = 'portal-director.configuracoes_integrador-aws'
  DFcaminho = '/configuracoes/integrador-aws'   (hífen, não underline)
```

Logo:
- Curl da DoD com `path=/configuracoes/integrador_aws` (underline) → **404** (`page-not-found`). Nenhuma row em TBpagina com esse DFcaminho.
- Mesmo se o curl usasse hífen (`/configuracoes/integrador-aws`), a resolução iria via `DFchave='portal-director.configuracoes_integrador-aws'` → row de TBmodel_pagina **DFid=21** (724 bytes), shape antigo flat `{genericPageTitle, genericPageDescription, genericform}` — **sem `pageTabs`**, **sem `entityActions`**.

### F094a.case-2b — seed escreveu sob DFchave_pagina órfã

`apply-f094a-seed.ts` grava em `acesso.TBmodel_pagina` com `DFchave_pagina='portal-director.configuracoes_aws'` (cf SQL linha 85: `DECLARE @chave NVARCHAR(255) = N'portal-director.configuracoes_aws'`). Esse `DFchave_pagina` **não existe** em TBpagina:

```text
acesso.TBmodel_pagina (filtrada por aws/integrador):
  DFid=21  DFchave_pagina='portal-director.configuracoes_integrador-aws'  valor_len=724    ← consumida via /api/model
  DFid=22  DFchave_pagina='portal-director.configuracoes_aws'              valor_len=2415   ← seed F094a, ÓRFÃ
```

A row 22 carrega o novo shape (pageTabs[3] com `entityActions` 10 actions no slot 2) mas o engine model-loader nunca a alcança porque a resolução `path → DFchave → DFchave_pagina` cai em DFid=21.

Probe `db.model.configuracoes_aws.pageTabs[2]` passa porque consulta direto pela DFchave_pagina inventada — não exerce o caminho real do engine.

**Origem do desvio**: divergência de chave entre F052b/F043 anterior (`configuracoes_aws`) e a TBpagina real do tenant (`configuracoes_integrador-aws`). A sub-escavação do arqueólogo registra `/configuracoes/integrador-aws` como rota legada, mas a decisão D1-D8 não revalidou a `DFchave_pagina` correspondente.

## Evidência

Comando 1 (DoD curl path underline):
```text
$ curl -sS -b cookies "http://localhost:3001/api/model?app=portal-director&path=/configuracoes/integrador_aws"
{"ok":false,"error":"page-not-found","message":"no TBpagina with DFcaminho=/configuracoes/integrador_aws"}
```

Comando 2 (path real com hífen — descobre o modelo antigo):
```text
$ curl -sS -b cookies "http://localhost:3001/api/model?app=portal-director&path=/configuracoes/integrador-aws"
{"ok":true,"pageKey":"portal-director.configuracoes_integrador-aws","appKey":"portal-director","idModel":21,"idPagina":4,"modelJson":{"genericPageTitle":"Integrador.AWS",...,"genericform":{...}}}
keys do modelJson: ['genericPageTitle','genericPageDescription','genericform']  ← sem pageTabs, sem entityActions
```

Comando 3 (bridge 502 OK):
```text
$ curl -sS -b cookies -X POST -d '{}' http://localhost:3001/portal-aws/proc/portal.sincronizar_redes
HTTP 502
{"ok":false,"error":"aws-unreachable","message":"AWS inacessível em http://127.0.0.1:5100/api/proc/portal.sincronizar_redes: fetch failed"}
```

Comando 4 (idempotência 2×):
```text
[F094a apply] OK — DFid_model_pagina=22; pageTabs=3; pageTabs[2]=entidades com entityActions 10 actions (redes, empresas, centros, departamentos, veiculos, feriados, fornecedores, itens, planos, usuarios); slots 0 utilitarios + 1 opcoes preservados (stubs F094b/c).
=== second run ===
[F094a apply] OK — DFid_model_pagina=22; pageTabs=3; pageTabs[2]=entidades com entityActions 10 actions (redes, empresas, centros, departamentos, veiculos, feriados, fornecedores, itens, planos, usuarios); slots 0 utilitarios + 1 opcoes preservados (stubs F094b/c).
```

Comando 5 (probe 14/14 com env carregado):
```text
[F094a probe] 14 PASS, 0 FAIL, 0 SKIP (total 14)
```

## Próxima ação — smith retoma

Duas hipóteses de correção (smith decide com curator):

1. **Realinhar a chave** — alterar `DECLARE @chave` no SQL seed (`F094a-model-configuracoes-aws-entidades.sql:85`) e o pós-check em `apply-f094a-seed.ts` para `portal-director.configuracoes_integrador-aws` (chave real da TBpagina). Migrar o conteúdo da row órfã DFid=22 para DFid=21 (ou deletar a 22 e refazer JSON_MODIFY na 21). Isso bate com o contrato §"Citações" linha 23 e com a `DFcaminho` real do tenant.

2. **Corrigir TBpagina** (improvável — seria mudar dado do tenant): inserir uma nova row em TBpagina com `DFchave='portal-director.configuracoes_aws'` + `DFcaminho='/configuracoes/integrador_aws'` (underline, divergindo do legado). **Não recomendado**: bate de frente com o ACL legado `/configuracoes/integrador-aws` documentado no contrato e quebraria menu/breadcrumb.

Sugestão: opção 1 (smith corrige a `@chave` do seed para a real DFchave_pagina, mantém pageTabs do F094a, e o probe DB-shape passa a usar a chave corrigida). A DoD curl da entrega precisa também ser ajustada para `path=/configuracoes/integrador-aws` (hífen) já que esse é o `DFcaminho` real.

## Notas

- A probe `probe-f094a.ts` passa 14/14 porque exerce a row órfã diretamente — não exerce o pipeline real `GET /api/model?path=...`. O smith ganhou cobertura de shape do JSON mas não de **resolução de roteamento**. Sugiro adicionar à probe um quarto vetor: `engine.resolve.path → DFchave_pagina` que faça o JOIN real com TBpagina e falhe se a chave não bater.
- Idempotência (case-4) e gate de bridge 502 (case-3) estão sólidos. Os 10 endpoints declarados (`portal.sincronizar_<entidade>`) e o sanitizador da rota portal-aws-proxy F090 também estão OK no probe.
- VPN ativa durante todo o teste. Conexão SQL via 172.27.0.121\\SQL2k19 OK.
