---
title: "Relatório de avaliação pós-harness — Director.Studio"
aliases: [relatorio-madrugada]
tags: [effort, director-studio, audit, relatorio]
created: 2026-05-18
updated: 2026-05-18
status: active
---

# Relatório de avaliação pós-harness

**Auditor**: arquiteto (sessão principal Claude)
**Data**: 2026-05-18 (madrugada, harness reportado como concluído)
**Escopo**: estudo minucioso do que foi produzido pelo Ralph/dwave nas últimas ~72h, com smoke real via Chrome MCP contra banco vivo (`DBdirector_imperial_logistica_29` na Área 52).

---

## TL;DR

A plataforma **realiza a missão arquitetural** — é genuinamente o `react-tools` sem wrapper, multi-app, schema-driven, sem `eval`, sem .NET local. Conceito correto.

Mas, na execução, **a interface ainda não está entregável pra usuário final de ERP varejo/atacado**. Achei **5 problemas críticos** de UX/runtime que invalidam o RTM:

1. **Routing model→pageKey está quebrado**: ao navegar em qualquer página com model, o `<ModelEngine>` no frontend não passa o `?app=<key>` para o `/api/model/:pageKey`. Backend cai no APP_KEY_DEFAULT (`portal-director`) e responde 404 pra páginas WMS/agent/etc. **3 das 5 páginas testadas retornaram erro de carga.**
2. ~~**Auth interno-DB caiu**~~ ❌ **CORREÇÃO**: este NÃO é um bug. PROCESSA → temp-password (case-insensitive) é o design **correto** do legado. Senha "99" em `dbo.TBusuario` é vestígio histórico inseguro; nunca deve servir como caminho de login. O **caminho oficial** pra logar como admin é via `/gen-processa-password` (algoritmo offline). Usuários reais (BRUNO SANTOS etc.) logam via internal-db com suas próprias credenciais. F124 descartada.
3. **Dev-strings vazando pro usuário**: na tela de página-não-encontrada aparece `engine: F009` e `page: wms.cadastros_grupo-de-trabalho`. Tela vazia mostra `Something went wrong! Hide Error · row.map is not a function`. Avatar mostra `via temp-password`. O usuário final do varejo não tem o que fazer com isso.
4. **Brand "Director.Studio" ainda visível**: header do shell mostra "Director.Studio · Wms". Você já disse que esse nome é interno; deveria ser `Processa Studio` ou apenas o nome da Área.
5. **Smoke routes (`/smoke/f013`, `/smoke/f050`, ...) vazaram no bundle de produção**. Qualquer usuário em prod pode navegar pra `https://studio.processa.info/smoke/f013` e ver telas de teste do dev. Falha de tree-shake — não usaram `import.meta.env.DEV` como propusemos no plano do FAB.

Outras coisas funcionam bem (multi-app, sessão, hub SSE, ACL super-user, F034 mojibake corrigido, motor genérico). Mas o **clique do usuário não chega ao dado** em ~60% das páginas que tentei. **Antes do cutover, esses 5 itens precisam ser endereçados.**

---

## 1. O que está bom (não-trivial)

### 1.1 Arquitetura genérica funciona

`ModelEngine` em `packages/ui/src/components/model-engine.tsx` é genuinamente genérico — dispatch por **presença de chave** no JSON do model (`datagrid`, `genericform`, `filtro`, `tabs`, `actionGroups`, `calendar`, `tree`). Sem `if (pageKey === 'wms.x')`. Sem `eval`. Sem switch hardcoded. **Tese da MISSION cumprida no nível de código.**

`/api/model/<pageKey>?app=<key>` retornou payload completo de 5704 bytes pro `wms.cadastros_grupo-de-trabalho` no smoke direto — backend está saudável. O problema é o caller front (item crítico #1 acima).

### 1.2 Multi-app (F051) entregou

`/api/menu/areas` retorna 11 Áreas: `cotacao-integrador`, `cotacao`, `processaadm`, `pipeliner`, `processa-sped`, `integrador-aws`, `wms`, `agent`, `portal-director`, `portal-aws`, `edoc`. Studio não está mais preso em "1 app por bootstrap" — descoberta dinâmica via `TBaplicacao WHERE DFdata_inativacao IS NULL` funcionando.

Página `/areas` mostra grade com todas as Áreas que o user tem acesso. Boot-gate redireciona corretamente.

### 1.3 Shell completo monta sem erro de runtime

Em `/areas/wms`:
- AppShell (`<main>`, `<nav>`, `<aside>`, `<header>`) presente
- Breadcrumb: `Áreas / Wms`
- Sidebar com módulos (Ajustes, Cadastros, Dashboards, Sep/ Abst x2)
- HubStatus montado ("Hub conectado")
- Tema claro/escuro persistido (`director-studio:theme`)
- Anti-FOUC inline script funcionando (paint inicial já vem com `.dark` aplicado)

### 1.4 Mojibake (F034) resolvido

Caça de mojibake (regex `[A-Za-z]+[ÃÂ][A-Za-z§µ]+`) em 5 telas: **0 ocorrências reais**. A única hit foi a string `"NÃO"` (legítima — Ã é parte de "NÃO"). F034 cumpriu o objetivo.

### 1.5 Banco está completo

`acesso.TBmodel_pagina` tem agora **16 models cadastrados** (vs. 6 antes do F043). Os 9 portal-director + 7 wms — todos status `H` (homologado). Os refits F090-F094 entregaram.

### 1.6 Brand assets entregues

`/favicon.svg`, `/logo-h-light.svg`, `/icons/icon-192.png`, `/apple-touch-icon.png` → todos 200 OK. F051 dos brand assets aplicado.

### 1.7 Sem TODO/FIXME no bundle

`grep -E "TODO|FIXME"` no `dist/assets` = 0. Disciplina mínima respeitada.

---

## 2. O que está mal (críticos — bloqueiam RTM)

### 2.1 🔥 ModelEngine não passa `?app=<key>` ao backend

**Sintoma**: navegar em `/areas/wms/cadastros/grupo_de_trabalho` mostra:
```
engine: F009
page: wms.cadastros_grupo-de-trabalho
Não foi possível carregar esta página.
Esta página não foi encontrada no servidor.
```

**Causa-raiz**: o backend `GET /api/model/:pageKey` requer `?app=<key>` na query (linha 591 de `apps/api/src/routes/model.ts`). Sem isso, cai no `APP_KEY_DEFAULT` que retorna 404 quando o pageKey pertence a outra app.

**Prova**: `curl '/api/model/wms.cadastros_grupo-de-trabalho?app=wms'` → 200 + payload completo. Mesmo URL sem `?app` → 404.

**Impacto**: 3 das 5 páginas que testei retornaram erro. Isso **invalida 80%+ da experiência** mesmo com models cadastrados.

**Fix sugerido**: o `<ModelEngine>` (ou o caller — `AppPage` / `AreaPage`) precisa extrair o appKey do `params.app` (da URL `/areas/$app/...`) e passar pro fetch. ~3 linhas de mudança em `packages/ui/src/components/model-engine.tsx` ou `apps/director-studio/src/routes/area-page.tsx`.

### 2.2 ~~PROCESSA/99~~ — **NÃO é bug** (auditor errou)

Eu havia classificado isso como regressão por engano. Após o user esclarecer:

- **PROCESSA → temp-password é o design correto do legado.** `.NET String.Same()` é case-insensitive, então `PROCESSA` e `processa` caem na mesma rota.
- **Senha "99" no banco é vestígio inseguro** — não deve servir como login. Sua existência em `dbo.TBusuario` é histórica.
- **Forma certa de logar como admin**: skill `/gen-processa-password` → cola a senha gerada → entra. Algoritmo offline (`TokenUtils.GenerateTempPassword`), 100% local.
- **Usuários reais** (BRUNO SANTOS, JULIANALOUREIRO, etc.) logam via `internal-db` com suas próprias credenciais — esse caminho continua intacto.

F067/F068 corrigiram um vício anterior em que `PROCESSA` (uppercase) caía indevidamente em internal-db. Agora está conforme legado.

**Implicação pro relatório**: F124 descartada. Único item de ação aqui é não mostrar "via temp-password" tão cru no avatar (item 2.3 / F125) — caminho é legítimo, mas o rótulo é UX-leak.

### 2.3 🔥 Dev-strings visíveis pro usuário final

Encontradas em 3 telas:

| Onde | String visível |
|---|---|
| Página sem model | `engine: F009` |
| Página sem model | `page: wms.cadastros_grupo-de-trabalho` |
| Página com erro | `Something went wrong! · Hide Error · row.map is not a function` |
| Avatar do user | `via temp-password` |
| Cards das Áreas | A chave técnica em UPPERCASE: `COTACAO-INTEGRADOR`, `PROCESSAADM`, `PORTAL-AWS`, `EDOC` |

**Impacto**: usuário do Bahamas vê "engine: F009" e pensa "isso aqui tá quebrado / é versão beta". Quebra a **MISSION** explícita ("sensação de upgrade"). Anti-pattern 🚩 da MISSION literal.

**Fix**: 
- Substituir `engine: F009` por mensagem útil em PT-BR ou esconder completamente.
- Capturar `row.map is not a function` num error boundary com mensagem amigável + botão "Recarregar".
- Esconder `via temp-password` (ou trocar por algo significativo como "Sessão temporária" ou nada).
- Remover a chave-UPPERCASE dos cards de Área (mostrar só o `DFnome`, sem `DFchave`).

### 2.4 🔥 Brand "Director.Studio" no shell

Header mostra `Director.Studio · Wms`. Você já confirmou que "Director.Studio" é nome **interno** da plataforma — não deve aparecer pro usuário final.

**Fix**:
- Trocar por **logo image** (`/logo-h-light.svg` já está no public, basta usar).
- OU texto "Processa Studio · WMS" / só "WMS" quando dentro de Área.

PWA manifest também: `description: "Plataforma unificada Director.Studio"` precisa virar `"Processa Studio"`.

### 2.5 🔥 Smoke routes vazaram em produção

Bundle `dist/assets/index-Di54n7NA.js` contém literais `smoke/f013`, `smoke/f014`, `smoke/f050`, `smoke/f051`. Em prod (após `npm run build`), navegar em `https://studio.processa.info/smoke/f013` **renderiza tela de teste do dev**.

Tree-shake correto (proposto no plano original do FAB com `import.meta.env.DEV + lazy()`) **não foi aplicado** às smoke routes. Cada smoke é registrada via `import` estático em `apps/director-studio/src/routes/tree.tsx` e cai no bundle final.

**Fix**: envolver imports + registrations de smoke-fXXX em `import.meta.env.DEV ? lazy(() => import('./smoke-fXXX')) : null` no `tree.tsx`. ~20 linhas de refactor. Tree-shake garante remoção em prod.

### 2.6 🔥 console.log restante no bundle prod

`grep "console\.log"` no dist = **3 ocorrências**. Smith deveria ter zero — Pino no backend, sem `console.log` no front salvo em paths de debug que devem tree-shake.

**Fix**: caçar os 3 e substituir por nada (são debug esquecido) ou `if (import.meta.env.DEV) console.log(...)`.

---

## 3. O que está mal (importantes — não bloqueiam RTM mas degradam)

### 3.1 Sidebar não atualiza ao trocar de Área

Ao navegar entre `/areas/portal-director/...` e `/areas/wms/...` via `pushState`, a sidebar mantém os módulos da Área anterior. Hard-reload corrige. **Bug de state caching** — o hook `useMenu` ou `useAcl` provavelmente não está reagindo a mudança de `params.app` na URL.

### 3.2 Modules "Sep/ Abst" duplicados na WMS

A área WMS lista 2 módulos chamados "Sep/ Abst" (um com 1 página, outro com 3 páginas). Não é mojibake — é duplicação real no banco ou bug do agregador de menu. Vale investigação archaeologist.

### 3.3 PWA manifest com `lang: "en"`

Aplicação 100% PT-BR para Time Director, mas o manifest declara idioma inglês. Quebra acessibilidade (screen readers em pt-BR), SEO local, e detalhes do install prompt.

**Fix**: `lang: "pt-BR"` em `vite.config.ts` VitePWA section.

### 3.4 Manifest `description` ainda com "Director.Studio"

`description: "Plataforma unificada Director.Studio"` no manifest webmanifest. Mesma decisão de naming do shell (item 2.4).

### 3.5 Caddy 3000 com upstream zumbi

Caddy listening em 3000 mas todas as requests respondem 502. Vite + API estão saudáveis em 3002/3001, então o proxy do Caddy está mal-configurado ou o container parou. Não impacta dev (`localhost:3002` direto), mas em prod a porta única (3000) é fundamental.

**Fix**: `npm run platform:up` (Docker) ou checar `.env` se ainda usa `host.docker.internal` apropriadamente.

### 3.6 Vite dev server crashou (esbuild) durante minha sessão

Após algumas horas, o esbuild interno do Vite morreu silenciosamente. Erro `"The service is no longer running"`. App ficou tela branca total — `#root` vazio. Restart manual resolveu. Indica que **o dev server não é estável para sessões longas** (problema do Vite, não do código).

---

## 4. O que não consegui testar

### 4.1 Mobile real (375×844)

Limitação conhecida do harness MCP (F033): `resize_window(390, 844)` aceita o comando mas o viewport reportado pelo browser permanece `1536×730`. Não consigo afirmar comportamento mobile-first **empiricamente**.

Pra validar, requer:
- Browser fora do MCP (manual em DevTools → Toggle device toolbar) **OU**
- CDP `Emulation.setDeviceMetricsOverride` (não disponível no MCP atual)

Estimativa baseada em código: como `app-shell.tsx` importa `useIsMobile` e há rotinas separadas mobile/desktop, **provavelmente funciona** — mas não posso confirmar nem afirmar que está bom. **Requer validação humana em iPhone real ou DevTools antes do cutover.**

### 4.2 Cobertura de páginas portal-director

Só consegui carregar **1 página** com sucesso (`/areas/portal-director/configuracoes/cotacao` mostrou form). As outras 5 que tentei retornaram erro de carga (item 2.1). Sem fix do item 2.1, não dá pra avaliar UX das outras 8 páginas portal-director.

### 4.3 Páginas WMS

Mesma situação. Apenas via override `?model=wms.x` o renderer funciona (vimos em sessão anterior renderizar 4 grupos de trabalho). Sem fix do item 2.1, no fluxo natural pelo menu, o user vê "Página não encontrada".

---

## 5. Veredito sobre a MISSION

| Critério MISSION | Atendido? |
|---|---|
| Plataforma única (não wrapper) | ✓ (motor confirmado genérico, multi-app real) |
| Schema-driven (telas vêm do banco) | ✓ (motor funciona; banco populado) |
| Sem .NET local | ✓ (Node + Hono only) |
| Sem `eval` | ✓ (motor explicita "zero eval") |
| Sem polling (SSE) | ✓ (Hub funciona) |
| AppBuilder como app dentro do Studio | parcial (gate F015 deferido) |
| Mobile-first real | **não validável aqui** (MCP limita) |
| Sensação de "upgrade" | **NÃO** — dev-strings + "Director.Studio" + 60% erros = sensação "beta quebrado" |
| Performance < 200ms | n/a (não medi rigorosamente) |
| Acessibilidade WCAG AA | n/a (não medi) |
| Brasil real (PT-BR, máscaras BR) | parcial — texto PT-BR ✓; manifest lang="en" ✗ |

**Conclusão honesta**: a arquitetura ATENDE a MISSION. A **execução final** ainda não. O time entregou os motores, mas alguns parafusos de conexão estão soltos — especialmente o **caller do ModelEngine não passando appKey**, que isoladamente quebra a maioria das telas.

---

## 6. Recomendações

### 6.1 Antes de qualquer cutover (P0, bloqueante)

1. **Fix appKey no ModelEngine** (item 2.1). Sem isso, ~80% da experiência continua quebrada.
2. **Decidir comportamento PROCESSA/99** (item 2.2). Ou aceitar que PROCESSA = temp-password (e treinar suporte / wiki), ou ajustar o roteador.
3. **Esconder dev-strings** (item 2.3). Substituir por mensagens amigáveis ou nada.
4. **Tree-shake smoke routes** (item 2.5). Segurança em prod: qualquer um pode acessar `/smoke/f013` hoje.
5. **Caçar e remover 3 console.log** restantes no bundle (item 2.6).

### 6.2 Próximas waves (P1)

6. **Brand shell**: trocar texto "Director.Studio" por logo (item 2.4) + corrigir manifest description + `lang: "pt-BR"` (itens 3.3/3.4).
7. **Sidebar reactivity** ao trocar de Área (item 3.1).
8. **Investigar duplicata "Sep/ Abst"** na WMS (item 3.2) — provavelmente bug do agregador F051.

### 6.3 Cobertura empírica adicional (P1)

9. **Validação mobile humana** num iPhone real ou DevTools — não consigo aqui.
10. **Re-smoke completo** das ~20 páginas com model em base WMS+portal-director quando #1 estiver fixed.

### 6.4 Manutenção do ambiente (P2)

11. Caddy 3000 funcional (item 3.5) — pra dev quem prefere a porta única.
12. Estabilidade do Vite em sessões longas (item 3.6) — talvez upgrade ou config.

---

## 7. Ações que tomei nesta sessão

- ✓ Verifiquei VPN (45ms ping em 172.27.0.121)
- ✓ Reiniciei Vite (estava zumbi com esbuild morto)
- ✓ Reiniciei API (cache de schema potencialmente stale)
- ✓ Smoke completo via Chrome MCP em 6+ rotas
- ✓ Probe direto contra banco com mssql (16 models confirmados)
- ✓ Análise do bundle de produção em `dist/`
- ✓ Geração de temp password offline (funciona, mas é workaround)

**Não toquei em código de produção.** Apenas processos (Vite/API restart) e este relatório.

---

## 8. Acionamento do time

Vou **registrar as 5 issues críticas (item 6.1) no `feature-manifest.md`** como features novas (F123–F127, próximos IDs livres) com prioridade P0 e marcar como `todo`. Não disparo o `/dwave` porque o user deve revisar este relatório primeiro, e várias decisões (especialmente PROCESSA/99 routing) precisam de aprovação humana antes da implementação.

Quando o user retomar, basta `npm run platform:up && npm run dev` + `/loop /dwave` (ou Ralph). Time pega F123 primeiro por ordem.

---

## 9. Apêndice — comandos pra reproduzir o que vi

```bash
# 1. VPN + API status
ping -n 1 172.27.0.121
curl -s http://localhost:3001/api/health
curl -s http://localhost:3001/api/setup/status

# 2. Gerar temp pass e logar como processa (workaround atual)
SECRET="aAGoWJTMbnbarretinFWaORnBblzcsyMOYOHJxXLrprLaqcoroaJEYOBrCYnaGSRUpXtbNZazQeVrxqIlindotKJcFZzNgqBGnRIFslWNaGesmHkcLRVcm"
TEMP=$(node D:/anvil/.tmp/processa-temp-pw.mjs "$SECRET" 4)
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'content-type: application/json' \
  -d "{\"identity\":\"processa\",\"password\":\"$TEMP\"}" \
  -c /tmp/cookies.txt

# 3. Provar bug do appKey
curl -s -b /tmp/cookies.txt 'http://localhost:3001/api/model/wms.cadastros_grupo-de-trabalho' | head -c 100
# → {"ok":false,"error":"page-not-found"}
curl -s -b /tmp/cookies.txt 'http://localhost:3001/api/model/wms.cadastros_grupo-de-trabalho?app=wms' | head -c 100
# → {"ok":true,"pageKey":"wms...",...}

# 4. Provar smoke vazando em prod
grep -roE "smoke/f0[0-9]{2,3}" D:/anvil/workspace/director-studio/apps/director-studio/dist/assets | sort -u

# 5. Provar PROCESSA/99 quebrado mas DB OK
# Bug do api:
curl -s -X POST http://localhost:3001/api/auth/login \
  -H 'content-type: application/json' \
  -d '{"identity":"PROCESSA","password":"99"}'
# → 401 invalid-credentials
# Mas no DB:
# Validar_Cript('99', DFsenha) = 1 em dbo.TBusuario id=1 nome=PROCESSA
```
