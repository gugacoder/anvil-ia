# Test report — F036 ModelCalendarRenderer

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
