# Test report — F-tbobjetos-dashboard (Caminho A)

**Data**: 2026-05-17
**Resultado**: pass
**Ambiente**: localhost:3001 (apps/api in-process + curl real) + SQL2k19@172.27.0.121 base `DBdirector_imperial_logistica_29` via VPN.
**Caso real testado**: super-user `PROCESSA/1` em `DBdirector_imperial_logistica_29` (Imperial Logistica 29 — base canônica eleita pela archaeologist para o seed sintético, dado que probe cross-tenant em 84 bases `DBdirector_*` ONLINE retornou `COUNT(*)=0` em `acesso.TBdashboard`/`acesso.TBobjetos_dashboard`).

## Casos cobertos

| # | Cenário | Esperado (contrato/spec) | Observado | Resultado |
|---|---|---|---|---|
| 1 | DoD#1 — `probe-tbdashboard.ts` end-to-end | 11/11 PASS: 6 widgets em `acesso.TBobjetos_dashboard` (chaves `studio.demo.*`) + DashboardId=1 "Demo Studio" fav=Sim + 6 procs `acesso.dashboard_demo_*` retornando ≥1 linha + endpoint in-process `/api/dashboards/me` 200 com widgets=6 ([[tbdashboard-catalog]] D5/D11) | 11/11 PASS na íntegra. Recordsets observados: kpi 1 linha, pie 4, bar 4, line 6, table 4, switcher 3. | ✓ |
| 2 | DoD#2 — login real `processa` via temp-password 24h | `POST /api/auth/login {identity:"processa",password:<temp>}` → 200 + cookie `director_session` httpOnly Max-Age=28800 ([[processa-auth-paths]] caminho temp-password) | 200 OK, cookie emitido (`Max-Age=28800; HttpOnly; SameSite=Lax`). Body: `{ok:true, user:{id:"1", nome:"processa", codEmpresa:1, nomeEmpresa:"Processa", path:"temp-password"}}` | ✓ |
| 3 | DoD#3 — `GET /api/dashboards/me?app=portal-director` autenticado | 1 dashboard "Demo Studio" id=1 favorite=true, boxConfig.widgets[] de tamanho 6, com types canônicos kpi/chart/chart/chart/table/switcher e chartKinds pie/bar/line ([[model-valor-dashboard]] + [[tbdashboard-catalog]] D11) | id="1", name="Demo Studio", favorite=true, widgets.length=6, types=[kpi, chart, chart, chart, table, switcher], chartKinds=[pie, bar, line], objetoChave=[studio.demo.kpi.1, ...pie.1, ...bar.1, ...line.1, ...table.1, ...switcher.1], cada widget carrega `procedure` `acesso.dashboard_demo_*`, `intervalSeconds` (30/60/120) e `layout {colSpan,rowSpan,order}`. | ✓ |
| 4 | DoD#4 — payload NÃO é `FAKE_BOX_CONFIG` | Backend `apps/api/src/routes/dashboards.ts` faz SELECT em `acesso.TBdashboard`/`TBobjetos_dashboard` em vez de retornar fixture estática (smith reportou substituição) | `grep FAKE_BOX_CONFIG` em `dashboards.ts` retorna 0 hits. Linha 460 contém `FROM acesso.TBdashboard`. Comentário linha 364 documenta `SELECT em acesso.TBdashboard filtrando por DFid_usuario + DFaplicacao`. Payload contém `objetoId` e `objetoChave` (campos só presentes em parse real do JSON do `DFmodel` SQL, ausentes no fake hardcoded). | ✓ |
| 5 | DoD#5 — idempotência seed 2× | `apply-tbdashboard-seed.ts` rodado duas vezes consecutivas deve produzir os mesmos IDs/chaves (UPSERT por `DFchave`, padrão F063) | Run #1: widgets id=1..6 (chaves `studio.demo.{kpi,pie,bar,line,table,switcher}.1`), DashboardId=1 PROCESSA/1 fav=Sim modelLen=2088. Run #2: idênticos — mesmos IDs, mesmas chaves, modelLen=2088 estável. Re-curl `/api/dashboards/me` pós-Run#2 retorna o mesmo payload (name="Demo Studio", favorite=true, widgets=6, chartKinds=[pie,bar,line]). | ✓ |

## Falhas

Nenhuma.

## Evidência

**Probe end-to-end** (DoD#1):
```
[probe] PASS 6/6 widgets seed presentes em acesso.TBobjetos_dashboard
[probe] super-user id=1
[probe] PASS dashboard DashboardId=1 fav=Sim
[probe] PASS DFmodel.widgets.length=6
[probe] PASS proc acesso.dashboard_demo_kpi_pedidos → 1 linha(s)
[probe] PASS proc acesso.dashboard_demo_chart_pie_status → 4 linha(s)
[probe] PASS proc acesso.dashboard_demo_chart_bar_vendas → 4 linha(s)
[probe] PASS proc acesso.dashboard_demo_chart_line_historico → 6 linha(s)
[probe] PASS proc acesso.dashboard_demo_table_top → 4 linha(s)
[probe] PASS proc acesso.dashboard_demo_switcher_periodo → 3 linha(s)
[probe] PASS endpoint /api/dashboards/me → "Demo Studio" id=1 fav=true widgets=6
[F-tbobjetos-dashboard probe] OK
```

**Login curl** (DoD#2):
```
HTTP/1.1 200 OK
set-cookie: director_session=...; Max-Age=28800; Path=/; HttpOnly; SameSite=Lax
{"ok":true,"user":{"id":"1","nome":"processa","codEmpresa":1,"nomeEmpresa":"Processa","path":"temp-password"}}
```

**GET /api/dashboards/me autenticado** (DoD#3), trecho do primeiro widget:
```json
{
  "id": "kpi-1",
  "objetoId": 1,
  "objetoChave": "studio.demo.kpi.1",
  "type": "kpi",
  "title": "Pedidos hoje",
  "procedure": "acesso.dashboard_demo_kpi_pedidos",
  "body": {},
  "intervalSeconds": 30,
  "layout": { "colSpan": 1, "rowSpan": 1, "order": 1 }
}
```

**Idempotência** (DoD#5), trecho idêntico em Run #1 e Run #2:
```
[F-tbobjetos-dashboard apply] widgets seeded (6):
  id=3 chave=studio.demo.bar.1 ...
  id=1 chave=studio.demo.kpi.1 ...
  id=4 chave=studio.demo.line.1 ...
  id=2 chave=studio.demo.pie.1 ...
  id=6 chave=studio.demo.switcher.1 ...
  id=5 chave=studio.demo.table.1 ...
[F-tbobjetos-dashboard apply] OK DashboardId=1 user=PROCESSA/1 fav=Sim modelLen=2088
```

## Ressalvas

- **Vite morto (esbuild bloqueado)** — sem UI test. Cobertura UI do dashboard real renderizado no `DashboardSurface` (F012) com este payload SQL fica pendente até esbuild voltar; débito transversal já enfileirado.
- **Caminho B (`parseLegacyBoxConfig`)** — adapter defensivo para `boxConfig` legado quando aparecer dado real cross-tenant. Não está nesta feature (smith entregou só Caminho A); não é DoD.
- **Divergência super-user `dbo.TBusuario` vs contrato `acesso.TBusuario`** — registrada por smith em `backlog/F-tbobjetos-dashboard-decisions.md` e por archaeologist como sub-contrato `tbusuario-multi-tenant.md` (audit-pass-with-note nota 1). Não bloqueia: probe e endpoint reais resolveram super-user id=1 corretamente.
- **Caso real Area 52**: o "real" aqui é uma base real (`DBdirector_imperial_logistica_29`) com seed sintético — porque archaeologist provou em 84 bases que `acesso.TBdashboard` está vazio em produção. Não há "dado de cliente" para testar; o seed é o substituto canônico documentado em [[tbdashboard-catalog]] D0/D9.

## Próxima ação

pass → curator aceita F-tbobjetos-dashboard. Manifest Tested=✓ 2026-05-17.
