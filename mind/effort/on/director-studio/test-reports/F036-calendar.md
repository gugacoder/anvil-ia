# Test report — F036 ModelCalendarRenderer

**Data**: 2026-05-17 (retry às ~13:45Z)
**Resultado**: fail (blocked-by-environment — esbuild service crashed)

> **Retry status**: o ambiente foi parcialmente destravado (Vite agora responde HTTP 200 na rota raiz e no `/smoke/f036`), mas o **serviço esbuild interno morreu** e nenhum módulo `.tsx` pode ser transformado. Detalhes na seção §"Retry 2026-05-17T13:45Z".

---

## Retry 2026-05-17T13:45Z

### Sintoma observado in vivo

`http://localhost:3002/smoke/f036` retorna **HTML shell válido (200, 1554 bytes)** com `<div id="root"></div>` vazio, mas React **não monta**:

| Probe | Resultado |
|---|---|
| `curl http://localhost:3002/smoke/f036` | HTTP 200, 14ms — shell HTML completo |
| Chrome MCP `navigate` + `read_page` | `root.children.length === 0`, `body.innerText.length === 0` |
| Console messages | apenas `[vite] connecting` / `[vite] connected` — zero erros logados |
| Network requests | 44 capturados; main.tsx/react/router/styles/tree.tsx OK (200) |
| **Network requests `503`** | **14 módulos `.tsx` retornam 503**: `sonner.tsx`, `smoke-f036.tsx`, `boot.tsx` outros routes, `app-page.tsx`, `login.tsx`, `dashboard.tsx`, `wizard.tsx`, etc. |

### Causa raiz

Fetch direto de `http://localhost:3002/src/routes/smoke-f036.tsx` retorna HTML de erro do Vite contendo:

```
{"message":"The service is no longer running",
 "stack":"... esbuild/lib/main.js:999:38 ... sendRequest ... transform ...",
 "id":"D:/anvil/.../smoke-f036.tsx",
 "plugin":"vite:esbuild"}
```

O **esbuild worker do Vite morreu** (provavelmente OOM durante cold-transform do monorepo). Todo módulo `.tsx` requisitado após esse momento retorna 503 com erro `"The service is no longer running"`. Os modules JS pré-bundled em `node_modules/.vite/deps/*` ainda servem (200), por isso o shell HTML + `@vite/client` + react/router carregam — mas qualquer source TSX do app falha o transform, então o `tree.tsx`/`smoke-f036.tsx`/etc. nunca executam o `createRoot`.

Adicionalmente, a primeira tab Chrome travada nesse ciclo bateu `ERR_INSUFFICIENT_RESOURCES`. Tab nova ainda assim observa o mesmo: shell vazio, sem montagem.

### Por que o curl da rota raiz dá 200

O middleware HTML do Vite serve `index.html` direto, sem invocar esbuild. Logo `/smoke/f036` (catch-all SPA) retorna 200 com o shell. O 200 confirma só que o **HTTP server** está vivo, não que o **build pipeline** está. Diagnóstico anterior (probe HTTP 200) era condição necessária mas insuficiente.

### Cenários planejados (não exercitados — mesma lista do bloqueio anterior)

| # | Cenário | Esperado por contrato/spec | Status retry |
|---|---|---|---|
| 1 | Cenário 1 — render + 4 status (info/success/warning/destructive) | C6, C7, C12 + UX spec §Schema, §Cores | ✗ não testado (esbuild down) |
| 2 | Cenário 2 — all-day spanning 3 dias em view week | UX spec §Schema (`endAt` aparece em cada dia, sem barra contínua, decisão consciente §1) | ✗ não testado |
| 3 | Cenário 3 — empty state | UX spec §Estados:empty + Phosphor `CalendarBlank` + `emptyMessage` (divergência §3) | ✗ não testado |
| 4 | Cenário 4 — dispatch via `ModelEngine` chave `genericcalendar` | Contrato §"Estrutura do nó `genericcalendar`" + §"Sub-contratos relacionados" | ✗ não testado |
| 5 | Toggle entre 4 views via ToggleGroup | C4 + UX spec | ✗ não testado |
| 6 | Gate mobile — `resize_window` 375/414/700px → month vira lista vertical | UX spec §Responsivo:Mobile + divergência §10 | ✗ não testado |
| 7 | Console limpo | DoD §5 | ✗ não testado |
| 8 | Tokens semânticos + Phosphor only | DoD §6 + spec §Cores, §Ícones | ✗ não testado |

### Evidência

- Net log: 14 requests `.tsx` com `statusCode: 503`. Os 4 últimos: `smoke-f036.tsx` (503), `app-page.tsx` (503), `wizard.tsx` (503), `sonner.tsx` (503).
- Curl de `/src/routes/smoke-f036.tsx`: HTML com mensagem `"The service is no longer running"` em `plugin: "vite:esbuild"`.
- `root.outerHTML.length === 21` (`<div id="root"></div>`).
- Console: zero erros (Vite não loga falha esbuild no browser; só serve 503 silencioso). Os 503s mostram-se no DevTools Network ou em fetch direto.

### Próxima ação

`fail`. Re-bootstrap necessário do lado do principal/smith:

1. **Reiniciar Vite dev server** (kill PID atual + `pnpm dev` no monorepo root). Esbuild reiniciará junto.
2. Após reload, verificar que **nenhum módulo `.tsx` retorna 503** — probe rápido: `curl -I http://localhost:3002/src/routes/smoke-f036.tsx` deve dar 200 (não 503).
3. Quando saudável, retry desta bateria — os 8 cenários acima continuam válidos sem mudança.

Não é possível diagnosticar tokens, motion, a11y, responsivo ou plug-engine via inspeção estática com a precisão exigida pelo DoD. O ui-tester depende do sistema vivo para emitir veredito.

---

## Bloqueio anterior (2026-05-17T13:30Z)

**Data**: 2026-05-17
**Resultado**: fail (blocked-by-environment)
**Ambiente tentado**: localhost (Vite dev server porta 3002, conforme `apps/director-studio/vite.config.ts` `WEB_PORT=3002`)
**Caso real testado**: nenhum exercitado in vivo — ver §Bloqueio.

## Bloqueio

A smoke route `/smoke/f036` está corretamente registrada no router (`apps/director-studio/src/routes/tree.tsx:15,158-162,190` apontando para `SmokeF036Page` em `routes/smoke-f036.tsx`), e o componente exporta os 4 cenários canônicos esperados pelo briefing (3 cenários de render direto + cenário plug-engine via `ModelEngine.embeddedModel` com chave `genericcalendar`).

Porém o **Vite dev server na porta 3002 está completamente unresponsive**:

| Probe | Resultado |
|---|---|
| `curl http://localhost:3002/` timeout 30s | exit 28, 0 bytes |
| `curl http://localhost:3002/smoke/f036` timeout 60s | exit 28, 0 bytes |
| `curl http://localhost:3002/smoke/f036` timeout 180s | exit 28, 0 bytes |
| Chrome MCP `navigate http://localhost:3002/smoke/f036` (2x) | CDP timeout 45s — renderer frozen |
| Comparativo: API em `:3001/` | 404 NotFound em <100ms (vivo, só sem rota raiz) |
| Comparativo: outros nodes em `:5173`/`:3001`/`:3003` | respondem instantaneamente (mas hospedam outros apps: Nic-Vitrine, HyperFrames, etc.) |
| Comparativo: Caddy proxy em `:3000` (Docker, PID 46516) | retorna 404 imediato (proxy upstream :3002 também não responde) |

Process `PID 50052` (node em `:3002`) está vivo no SO mas não atende requests HTTP — provavelmente travado em cold-compile do monorepo ou deadlock interno. Sem autoridade para `kill` por nome (proibição global) nem para `pnpm dev` (single-task, bloquearia sessão indefinidamente) nem para tocar o processo do usuário.

Área 52 não foi proposta como URL alternativa no briefing e não há staging.studio combinado conhecido nas notas recentes.

## Casos planejados (não exercitados)

| # | Cenário | Esperado por contrato/spec | Status |
|---|---|---|---|
| 1 | Cenário 1 — render + 4 status (info/success/warning/destructive) | C6, C7, C12 + UX spec §Schema, §Cores | ✗ não testado |
| 2 | Cenário 2 — all-day spanning 3 dias em view week | UX spec §Schema (`endAt` aparece em cada dia, sem barra contínua, decisão consciente §1) | ✗ não testado |
| 3 | Cenário 3 — empty state | UX spec §Estados:empty + ícone Phosphor `CalendarBlank` + `emptyMessage` (divergência §3, corrige dead prop legado) | ✗ não testado |
| 4 | Cenário 4 — dispatch via `ModelEngine` chave `genericcalendar` | Contrato §"Estrutura do nó `genericcalendar`" + §"Sub-contratos relacionados" engine-schema-driven | ✗ não testado |
| 5 | Toggle entre 4 views via ToggleGroup | C4 (corrige dead prop `views`) + UX spec §"Quando NÃO usar"/§"Estados" | ✗ não testado |
| 6 | Gate mobile — `resize_window` a 375/414/700px deve transformar `month` em lista vertical agrupada por dia | UX spec §Responsivo:Mobile + divergência §10 (legado tinha minWidth:908px) | ✗ não testado |
| 7 | Console limpo | DoD §5 | ✗ não testado |
| 8 | Tokens semânticos + Phosphor (sem hex, sem Lucide) | DoD §6 + spec §Cores e tokens, §Ícones | ✗ não testado |

## Evidência (inspeção estática)

Verifiquei por leitura o que pude:

- **Route wiring correto**: `tree.tsx:15` importa `SmokeF036Page`, `:158-162` cria `smokeF036Route` com `path: '/smoke/f036'`, `:190` registra no array.
- **Componente coerente com spec**: `routes/smoke-f036.tsx:42-47` declara `SCENARIO_1_STATUS` com `color: 'info'|'success'|'warning'|'destructive'` (tokens semânticos, sem hex — conforme spec §Cores e divergência §7). Cenário 4 passa `embeddedModel` com chave `genericcalendar` esperada pelo engine.
- **Console.log audit afirmado pelo smith** (linha de progress de 2026-05-17T00:45Z): "zero console.log/warn/error em renderer e smoke; zero lucide; zero hex inline". Não exercitado em runtime — afirmação ainda não confirmada empiricamente.

## Próxima ação

`fail` — não consigo emitir veredito sem exercitar o sistema vivo. Para destravar:

1. **Smith ou principal precisa reiniciar o Vite dev server** em `:3002` (kill PID 50052 + `npm run dev:web` ou `npm run dev` no monorepo root) **OU**
2. **Combinar URL de staging vivo** (Area 52 ou equivalente) com smoke route já deployada **OU**
3. **Acordar que ui-tester pode subir o server local** (atualmente vetado por single-task e por proibição de matar processos por PID alheio).

Quando o ambiente estiver de pé, re-executar este relatório cobrindo os 8 cenários acima.

## Notas

- O cenário 6 (gate mobile via `resize_window`) é o teste mais crítico desta wave — F033 comprovou que `resize_window` do Chrome MCP entrega viewport efetivo ~500px abaixo do breakpoint 768, suficiente para validar `useIsMobile()` in vivo. Reaproveitar abordagem F033 quando ambiente voltar.
- Os cenários 1-4 são todos passíveis de validação visual via `read_page` + `screenshot`, e cenário 5 via clique em `ToggleGroup` items + `read_page` para confirmar troca de layout grid → lista (week) / coluna única (day) / lista agrupada por dia (agenda).
