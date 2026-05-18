# F032 — config.ts respeita env externa (convenção UNIX)

**Status**: ready-for-test
**Smith**: 2026-05-17

## Problema

`apps/api/src/config.ts:reloadConfig()` lia `.env` e fazia `process.env[key] = value` **incondicionalmente** para cada wizard key. Isso violava a convenção UNIX: env explícita do shell deve ganhar de qualquer arquivo `.env`. Atrito documentado durante F004 (test-report scope-decisions.md linhas 349–351) — testes que tentavam stubar `STUDIO_AWS_JWT_SECRET=xyz` via shell eram silenciosamente sobrescritos pelo valor do `.env` no boot.

## Decisão

**D1 — Shell-baseline snapshot at module load.**
Capturamos uma vez, no module load (antes do primeiro `reloadConfig()`), o conjunto de wizard keys que já vinham populadas em `process.env`. Para essas keys, `reloadConfig()` **nunca** sobrescreve `process.env[key]` com o valor de `.env`, e a view cacheada (`getConfig()`) também reflete o valor do shell — consumers lendo `process.env.X` e `getConfig().X` veem a mesma coisa.

**D2 — Por que snapshot e não "se já existe no process.env, mantém".**
`reloadConfig()` é chamado em runtime depois de `commitEnv()` (wizard). Se usássemos a regra ingênua "preserva qualquer process.env existente", o wizard nunca conseguiria atualizar nada. O snapshot fixa a fonte da verdade no que veio do **shell original**, separado do que foi populado por reloads subsequentes.

**D3 — Telemetria: `shellShadowed`.**
Logger inclui contagem de keys onde `.env` tem valor diferente do shell baseline — observabilidade pra detectar drift de config sem expor segredos.

**D4 — Espelha `dotenv.config({ override: false })`.**
Padrão de fato do ecossistema node. `dotenv-cli` usado pelo boot já se comporta assim — agora `config.ts` (que faz reload manual via `readFileSync`, sem passar pelo dotenv) também se comporta assim. Consistência ponta-a-ponta.

## Implementação

`apps/api/src/config.ts`:

1. `const SHELL_BASELINE: Set<string>` — populado UMA vez no module load.
2. `reloadConfig()` — para cada wizard key: se está no baseline, mantém `process.env[key]` como veio do shell e cacheia esse valor; senão, lê do `.env` e popula `process.env[key]` (comportamento anterior).
3. Logger inclui `shellShadowed` count.

Total: ~20 linhas alteradas em config.ts. Zero impacto em consumers.

## Verificação

**Smoke A — shell wins:**
```
STUDIO_AWS_JWT_SECRET=SHELL_WINS_XYZ DB_USER=SHELL_USER npx tsx <load config.ts>
→ process.env.STUDIO_AWS_JWT_SECRET = "SHELL_WINS_XYZ" ✓
→ process.env.DB_USER = "SHELL_USER" ✓
→ getConfig().JWT_SECRET = (valor do .env, não setado no shell) ✓
→ logger: shellShadowed: 2
```

**Smoke B — regression, sem shell override:**
```
unset STUDIO_AWS_JWT_SECRET DB_USER; npx tsx <load config.ts>
→ getConfig().STUDIO_AWS_JWT_SECRET = (valor do .env) ✓
→ logger: shellShadowed: 0
```

Typecheck: 3 packages verdes, 2.688s.

## Notas

- `commitEnv()` continua funcionando — só não consegue mais sobrescrever uma key que o operador exportou no shell. Esse é o comportamento UNIX correto: shell ganha até o operador `unset`.
- Não tocou consumers. Risco zero de regressão funcional.
