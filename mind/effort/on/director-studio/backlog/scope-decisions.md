---
title: "Director.Studio — Scope decisions log"
tags: [effort, director-studio, scope, curator]
created: 2026-05-15
updated: 2026-05-15
---

# Scope decisions — Director.Studio

Append-only. Cada decisão de escopo do curator (aceitar/recusar/dividir/adiar) entra aqui com data, motivo e impacto no manifest.

## 2026-05-15

### F004 — Sessão httpOnly cookie + Redis → accepted

**Decisão**: aceitar. 6/6 critérios pass com caso real PROCESSA/99 em IMPERIAL LOG (Área 52, DBdirector_imperial_logistica_29).

**Observações do ui-tester → resolução**:

1. `.env` aponta `REDIS_URL=redis://localhost:6379` (coletivos-redis) em vez de `:3010` (director-studio-redis derivado de PREFIX=30).
   → **Nova feature F031** (P1, infra, wizard). Não bloqueia F004 — keys têm namespace `ds:` e cenários todos passaram com Redis correto após edição manual do `.env`.

2. `config.ts:51-57` sobrescreve `process.env[key]` ao carregar `.env`, impedindo override via env explícita.
   → **Nova feature F032** (P2, infra). Convenção UNIX é env explícita ganha. Não bloqueia F004 — só atrita testes.

3. Critério 6 supôs Redis volátil, mas compose tem `--appendonly yes` + volume `redis-data`.
   → **Não vira feature**. Documentado no test-report (linhas 32, 50). Decisão de infra: persistência é desejada (sobrevive restart de container). Se time decidir voltar a volátil, ajusta `infra/docker-compose.platform.yml`.

**Impacto no manifest**: F004 `Status=accepted`, `Accepted=✓ 2026-05-15`. Adicionadas F031 e F032.
