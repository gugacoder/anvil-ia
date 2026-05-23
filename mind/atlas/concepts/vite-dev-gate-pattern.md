---
title: "Vite Dev-Gate Pattern — tree-shake de código dev-only"
aliases: [vite-dev-gate, dev-gate-pattern, tree-shake-dev, import-meta-env-dev]
tags: [pattern, vite, build, frontend, security]
sources:
  - "calendar/notes/2026-05-19.md"
created: 2026-05-23
updated: 2026-05-23
---

# Vite Dev-Gate Pattern — tree-shake de código dev-only

Padrão para garantir que rotas, componentes e logs exclusivos de desenvolvimento sejam eliminados do bundle de produção em projetos Vite/Rollup. Exige ação em **dois pontos**: o import do módulo e o registro na árvore de rotas. Falhar em qualquer um dos dois vaza código dev no bundle — risco de segurança (rotas internas acessíveis em prod) e risco de performance (bundle inflado).

## Key Points

- **Dois pontos de gate, não um.** (1) O import estático precisa virar `lazy()` condicional: `const X = import.meta.env.DEV ? lazy(() => import('./x')) : null`. (2) O registro na route tree precisa ser condicional: `{...(X ? [route] : [])}`. Sem ambos, Rollup inclui o módulo no bundle.
- **Verificação obrigatória pós-build.** `grep -roE "smoke/f0[0-9]{2,3}" dist/assets` (ou pattern equivalente) confirma se rotas dev vazaram. Na auditoria do [[director-studio]] (2026-05-19), 20 smoke routes apareceram no bundle prod por import estático em `tree.tsx`.
- **`console.log` também precisa de gate.** Logs de debug que não usam `import.meta.env.DEV` guard passam pro bundle prod. Pattern: `if (import.meta.env.DEV) console.log(...)` ou logger com level configurável.
- **Risco de segurança concreto.** No caso descoberto, um usuário em prod podia abrir `/smoke/f013` e ver componentes internos de teste. Smoke routes expõem contratos, dados de teste e comportamento não polido.
- **TanStack Router default error component é um leak lateral.** O overlay padrão exibe mensagem em inglês (`Something went wrong! · row.map is not a function`) com stack trace. Precisa de `defaultErrorComponent` no `router` E `errorComponent` no `rootRoute` pra cobrir erros pré-mount e pós-mount.

## Details

A descoberta surgiu durante a auditoria pós-harness do [[director-studio]] (sessão 18:00 de 2026-05-19). O ui-tester reportou 4 strings de debug vazando no bundle prod: `engine: F009` na shell de debug, `via temp-password` no avatar, o overlay de erro do TanStack Router em inglês, e chaves UPPERCASE (`COTACAO-INTEGRADOR`, `PORTAL-AWS`) nos cards de Área. O smith corrigiu com gates `import.meta.env.DEV` + `lazy()`.

Paralelamente, grep no `dist/assets/` revelou 20 smoke routes (`smoke-fXXX.tsx`) incluídas no bundle. A causa raiz era que `tree.tsx` importava cada smoke route estaticamente (`import SmokeF001 from './smoke-f001'`). O Rollup não pode tree-shake imports estáticos que são referenciados — mesmo que a route registration fosse condicional, o módulo já estava no grafo de dependências pelo import. A solução foi dupla: (1) trocar imports estáticos por `lazy()` condicional, e (2) condicionalizar o array de registrations.

O pattern funcional em Vite/Rollup é:

```typescript
// 1. Import condicional com lazy
const SmokeF001 = import.meta.env.DEV
  ? lazy(() => import('./smoke/smoke-f001'))
  : null;

// 2. Registration condicional na route tree
const routes = [
  // ... production routes
  ...(import.meta.env.DEV && SmokeF001
    ? [{ path: '/smoke/f001', component: SmokeF001 }]
    : []),
];
```

`import.meta.env.DEV` é substituído por `false` em build de produção pelo Vite, o que permite ao Rollup eliminar o branch inteiro (dead-code elimination). Sem a substituição no import, o `import()` dinâmico fica no bundle mesmo que nunca seja chamado — Rollup preserva side-effects potenciais de imports.

## Related Concepts

- [[director-studio]] — projeto onde o pattern foi descoberto empiricamente após vazamento de 20 smoke routes no bundle prod
- [[director-studio-agent-team]] — smith implementa o fix; ui-tester verifica pós-build via grep no bundle

## Sources

- [[calendar/notes/2026-05-19.md]] — sessão 18:00: 20 smoke routes vazadas no bundle prod; 4 strings de debug em prod; fix com `import.meta.env.DEV` + `lazy()`; grep de verificação; TanStack Router default error component como leak lateral
