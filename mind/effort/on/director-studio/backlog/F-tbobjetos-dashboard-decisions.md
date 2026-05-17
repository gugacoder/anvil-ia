---
title: "F-tbobjetos-dashboard — decisões de implementação (Caminho A seed sintético)"
date: 2026-05-17
status: ready-for-test
contract: "[[tbdashboard-catalog]]"
---

# F-tbobjetos-dashboard — decisões

Implementação do **Caminho A** do contrato `tbdashboard-catalog.md`: seed sintético em Area 52 (`DBdirector_Imperial_Logistica_29`) que substitui o payload fake hardcoded de F012 por dashboard real persistido em `acesso.TBdashboard` + `acesso.TBobjetos_dashboard`.

## Escopo desta feature

- 6 widgets em `acesso.TBobjetos_dashboard` cobrindo todos os discriminantes do renderer MVP F012 (`kpi`, `chart{pie,bar,line}`, `table`, `switcher`).
- 1 dashboard "Demo Studio" em `acesso.TBdashboard` com `DFmodel` JSON canônico Studio (`{widgets:[...]}`) montando os 6 widgets.
- 6 procs sintéticas `acesso.dashboard_demo_*` retornando recordsets determinísticos (4-6 linhas cada).
- Backend `dashboards/me` refatorado: SELECT real de `TBdashboard` filtrado por `DFid_usuario` + `DFaplicacao`, parse de `DFmodel`. Sem fallback fake.

## Decisões

### D-1. Login do super-user

Contrato diz `DFusuario` na tabela `acesso.TBusuario`. Probe em Area 52 mostra que **`acesso.TBusuario` não existe** — o legado vive em `dbo.TBusuario` com coluna `DFnome_usuario` (não `DFusuario`). Super-user `PROCESSA` (uppercase), `DFid_usuario=1`. Seed e probe atualizados.

> Sub-contrato pendente: `tbusuario-multi-tenant.md` já listado em "Sub-contratos a criar" do contrato-mãe. Esta divergência (`dbo.TBusuario` vs `acesso.TBusuario`, `DFnome_usuario` vs `DFusuario`) deve ser documentada lá.

### D-2. DFusuario na tabela TBdashboard

`acesso.TBdashboard.DFusuario` é NVARCHAR(255) preenchido com o login literal (`'PROCESSA'`) — paridade com proc legada `sp_persistir_favorito_dashboard` que casa por login. Mantido para idempotência cross-tenant.

### D-3. Forma do DFmodel: canônica Studio (não boxConfig legado)

D11 do contrato recomenda persistir só metadata. Forma armazenada é a **canônica Studio** (`{widgets:[...]}` definida em `packages/ui/src/components/dashboard/types.ts → DashboardBoxConfig`), idêntica ao que o frontend consome via `/api/dashboards/me`. Backend não precisa adapter porque a forma já é a final.

Quando aparecer dado real legado (D12: ponto-cego `DBappBuilder*` resolvido), aplica-se Caminho B: função `parseLegacyBoxConfig` no backend transforma `boxConfig` legado → canônico **on read** sem migrar dado armazenado. Esta feature não implementa o adapter — fica como código defensivo da próxima wave.

### D-4. Procs sintéticas em schema `acesso`

Criadas como `acesso.dashboard_demo_*` (mesmo schema dos widgets). Aceitam parâmetro `@xml NVARCHAR(MAX) = NULL` para casar com a convenção `runProc(procedure, body)` do backend, que sempre passa `<root>...</root>`. Procs ignoram o input — são demo determinísticos.

Recordsets planos: o parser `normalizeRecordset` em `routes/dashboards.ts` aceita recordset plano como fallback (sem envelope `<Response>`). Sub-contrato `proc-dashboard-response.md` pendente do contrato-mãe documentaria o envelope quando exigirmos paridade futura.

### D-5. Idempotência

- **Widgets**: `IF NOT EXISTS WHERE DFchave=...` por chave estável (D5 do contrato — `DFchave NOT NULL UNIQUE`).
- **Dashboard**: `IF NOT EXISTS WHERE DFid_usuario + DFnome + DFaplicacao` (schema legado sem UNIQUE — D2 do contrato). Reaplicação atualiza `DFmodel` (sem duplicar linha) — sobrescreve para refletir versão mais recente do seed.
- **Procs**: padrão `IF OBJECT_ID IS NULL CREATE` seguido de `ALTER` — funciona em qualquer estado anterior.

### D-6. DFaplicacao = 'portal-director'

Mesma convenção de F063 (entrada de menu `/dashboard`). Filtra dashboards do tenant correto e isola de outros apps que partilhem `acesso.TBdashboard`.

### D-7. Backend retorna lista vazia (não fake) se user sem dashboards

Usuário sem dashboards na app vê 0 dashboards (não mais o "Operação — visão geral" hardcoded). Comportamento aceitável até seed cross-tenant — a página de smoke deve ser atualizada (follow-up).

### D-8. Probe in-process via app.fetch + sessão forjada

Probe injeta sessão via `createSession()` real do `session-store` (Redis-backed) e monta cookie assinado com HMAC compatível com `verifySession`. Não bate na rota de login `/api/auth/login` — evita dependência da LDAP bridge / temp-password durante teste de backend.

## Arquivos

| Path | Função |
|---|---|
| `workspace/director-studio/infra/sql/seed/F-tbobjetos-dashboard.sql` | Seed idempotente: 6 procs + 6 widgets + 1 dashboard. |
| `workspace/director-studio/apps/api/src/scripts/apply-tbdashboard-seed.ts` | Aplica o seed via `dotenv-cli + mssql`. |
| `workspace/director-studio/apps/api/src/scripts/probe-tbdashboard.ts` | Probe end-to-end DB + procs + endpoint in-process. |
| `workspace/director-studio/apps/api/src/routes/dashboards.ts` | Backend `dashboards/me` SQL real (substituiu FAKE_BOX_CONFIG). |

## Probe results (2026-05-17 21:23 UTC)

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
[F-tbobjetos-dashboard probe] OK — todas as etapas criticas passaram.
```

11/11 PASS. Typecheck verde em `@workspace/api`.

## Anti-violações conferidas

- Não toquei `sources/engenharia--fabrica--*`. Schema do `dbo.TBusuario` foi descoberto via `INFORMATION_SCHEMA.COLUMNS` no banco vivo (Area 52), não lendo o legado.
- Não há `console.log` em `routes/dashboards.ts` — Pino estruturado.
- Não há polling: o `/me` é one-shot (refresh por widget é separado).
- Sem cores hex / Lucide: backend puro.
- Componentes UI não tocados (smoke do dashboard continua usando `fake` rows do `/refresh`; a próxima feature pode trocar para "carregar 'Demo Studio' do `/me`").
- PROIBIDO commit — não commitado.

## Débitos / follow-ups

1. **F-tbobjetos-dashboard-replicar**: aplicar o seed em outras Areas (`DBdirector_*` cross-tenant) — orquestrar com curator quando houver demanda.
2. **F-tbobjetos-dashboard-smoke**: substituir a rota `/smoke/f064` (que ainda tem widgets fake hardcoded) por carregamento de "Demo Studio" via `/api/dashboards/me`. Fora do escopo desta feature.
3. **F-parse-legacy-box-config**: Caminho B (adapter `parseLegacyBoxConfig`) quando ponto-cego D12 (`DBappBuilder*`) for resolvido e aparecer dado legado real.
4. **Sub-contrato `tbusuario-multi-tenant.md`** (já enfileirado no contrato-mãe): documentar `dbo.TBusuario` vs `acesso.TBusuario`, `DFnome_usuario` vs `DFusuario`.
5. **Sub-contrato `proc-dashboard-response.md`** (já enfileirado): envelope `<Response>` vs `<Relatorio>` vs recordset plano — atualmente o parser aceita os 3; documentar quando exigir paridade.
6. Script temporário `probe-user-schema.ts` deixado em `apps/api/src/scripts/` para referência futura (descoberta do schema dbo.TBusuario). Pode ser removido pelo curator.
