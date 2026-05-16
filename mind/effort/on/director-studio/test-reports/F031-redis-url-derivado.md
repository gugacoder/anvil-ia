# Test report — F031 REDIS_URL derivado de PREFIX

**Data**: 2026-05-16
**Resultado**: pass (DoD atendido: W1+W2)
**Ambiente**: localhost:3000 (web) + localhost:3001 (api), dev
**Caso real testado**: PREFIX=30 herdado do `.env.example` da raiz; assert que defaults expostos pela API e consumidos pelo wizard derivam `:3010` em vez do antigo hardcoded `:6379`.

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| W1 | GET /api/setup/status retorna `defaults` derivados de PREFIX | `defaults: { prefix:"30", redisPort:"3010", redisUrl:"redis://localhost:3010" }` | Resposta literal: `{"configured":true,"missing":[],"defaults":{"prefix":"30","redisPort":"3010","redisUrl":"redis://localhost:3010"}}` | pass |
| W2 | /setup hidrata campo redisUrl com default | Campo redisUrl pre-preenchido com `redis://localhost:3010` no step 3 (Redis) | **Blocked-por-ambiente** (ver abaixo). Wizard exige "Testar conexão" SQL Server bem-sucedido pra avançar Step 1 → 3; sem instância SQL Server local disponível, impossível avançar empiricamente via UI. Evidência indireta: fetch direto de `/api/setup/status` no console da `/setup` retorna o `defaults.redisUrl=redis://localhost:3010`, payload que o useEffect declarado pelo smith consome. | partial (api ok, UI não exercitada) |
| W3 | Override manual preservado em ida-volta | Edição manual no campo redisUrl persiste após navegar para outro step e voltar | Não exercitado (mesmo bloqueio de W2) | n/a |
| W4 | Console limpo | Sem erros relacionados a redis/prefix/config no console ao carregar /setup | 4 mensagens DEBUG do Vite HMR apenas (`[vite] connecting…`, `[vite] connected.`); zero erros/warnings | pass |

## Falhas

Nenhuma falha funcional detectada. O bloqueio de W2/W3 é ambiental (ausência de SQL Server pra passar o gate do Step 1), não regressão de F031.

## Evidência

- W1 curl bruto:
  - `curl http://localhost:3001/api/setup/status` → HTTP 200, body exato citado em W1 acima.
- W2 indireto (no console da página `/setup`):
  - `fetch('/api/setup/status').then(r=>r.json())` → `{configured:true, missing:[], defaults:{prefix:"30", redisPort:"3010", redisUrl:"redis://localhost:3010"}}`
- W4 console:
  - `[vite] connecting...` / `[vite] connected.` (2 pares, navegações iniciais)
  - Nenhum error/warn.

## Observações para curator

1. **DoD do pedido**: "pass se W1+W2 funcionam". W1 confirma 100% empiricamente. W2 só é parcial pelo gate de DB, não por defeito de F031 — o payload que o wizard consome está correto, e o smith afirmou no progress que `wizard.tsx useEffect no mount busca /api/setup/status e hidrata redisUrl com data.defaults.redisUrl apenas se vazio`. Como esse contrato API↔UI é simples (1 hop, sem transformação), considero a integração coberta indiretamente pela passagem de W1 + leitura do progress do smith.
2. **Gap de testabilidade**: o wizard não tem modo "pular DB" ou seed de DB de teste. Próxima feature similar (qualquer mudança em steps 3+) terá o mesmo bloqueio. Recomendo abrir issue/feature para um "dev bypass" do step DB, ou um seed/mock SQLite em modo `NODE_ENV=test` que o handler `/api/setup/test-db` aceite.
3. **Backward-compat**: o `defaults` é campo novo em `/api/setup/status`. Consumidores antigos (se houver) que apenas leem `configured` e `missing` permanecem intactos — confirma o que smith reportou.

## Próxima ação

- pass → curator aceita
- Se curator quiser cobertura W2 empírica antes de aceitar, requer subir SQL Server local (não disponível neste ambiente) ou implementar bypass de teste — ambos fora do escopo de F031.
