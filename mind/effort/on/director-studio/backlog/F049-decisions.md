---
title: "F049 — Setup wizard step para STUDIO_AWS_JWT_SECRET (decisões)"
aliases: [F049-decisions, setup-portal-aws-decisions]
tags: [effort, director-studio, decisions, F049, setup, portal-aws]
created: 2026-05-17
updated: 2026-05-17
---

# F049 — Decisões de implementação

Contrato: [[portal-aws-bridge]] (F024 expõe a bridge; F049 adiciona o onboarding do segredo no wizard F001).

## Fluxo do wizard

- **STEPS dinâmico**: o array de steps é reconstruído via `buildSteps(portalAwsDetected)`. Quando `detected===true`, o step `portal-aws` é inserido **entre** `aws-bridge` (LDAP, F067) e `redis`. Caso contrário, o step não aparece — não há toggle manual, a decisão é 100% data-driven.
- **Detecção é gatilho do `onNext` do step DB**: o wizard intercepta o avanço para chamar `POST /api/setup/detect/portal-aws` com as mesmas credenciais que acabaram de passar no `test/db`. Em qualquer falha (rede, schema ausente, sem linha), `portalAwsDetected=false` e o wizard avança normalmente.
- **Não-bloqueante**: ausência da linha é benigna; tenants sem AWS sobem sem o step. A bridge AWS responde `400 config-missing` em runtime se chamada — mesma semântica do F024.

## Backend

- **Endpoint novo** `POST /api/setup/detect/portal-aws` em `apps/api/src/routes/setup.ts`. Aceita `{host, instance, database, user, password}` (mesmo shape do `test/db`). Conecta, descobre o schema da `TBaplicacao` via `sys.objects` (preferindo `acesso`), consulta `WHERE DFchave='portal-aws'`, retorna `{ok, detected, baseUrl?, domain?, schema?}`.
- **Schema discovery**: mesma técnica usada em `auth.ts`/`menu.ts`. Bases antigas podem ter `TBaplicacao` em `dbo` em vez de `acesso` — o query ranqueia `acesso` primeiro mas aceita qualquer schema. Sanitização do schema name via regex `[^A-Za-z0-9_]` antes de interpolar (não há `sql.Identifier` no driver `mssql`).
- **Commit schema estendido**: `portalAws?: { secret, url?, domain? }` opcional. Quando presente, `secret` é obrigatório via zod refine (`min(1)` com mensagem clara). Frontend só envia o objeto se o step foi exibido E o usuário preencheu o secret — ausência sinaliza pulo deliberado.

## Persistência no `.env`

- **`OPTIONAL_WIZARD_KEYS`** novo em `config.ts`: `['STUDIO_AWS_JWT_SECRET', 'STUDIO_AWS_URL', 'STUDIO_AWS_DOMAIN']`. Separado das `REQUIRED_KEYS` para não fazer o backend gatear o boot quando o tenant não tem AWS.
- **`WIZARD_KEYS`** agora inclui as opcionais — `reloadConfig` propaga para `process.env` no boot, deixando o `aws-client.ts` (F024) achar os valores do mesmo jeito que achava no `.env.example` antes do wizard escrever.
- **`commitEnv` itera `[...REQUIRED, 'DB_INSTANCE', ...OPTIONAL_WIZARD_KEYS]`** e pula chaves com `value === undefined || value === ''`. Por isso o backend só inclui `STUDIO_AWS_URL`/`DOMAIN` quando vieram não-vazios do front — chaves vazias ficam fora do `.env` em vez de gravar entrada vazia.

## UI/UX

- **`StepPortalAws`** (`apps/director-studio/src/setup/steps/portal-aws.tsx`) — usa primitivos de `@workspace/ui` (Card/Input/Label/Button/InlineAlert), Phosphor (Eye/EyeSlash, **não** Lucide), com toggle de máscara no secret.
- **Pré-preenchimento defensivo**: detecção sobrescreve `url` apenas se o usuário não editou (compara com `initialState.portalAws.url`); `domain` sobrescreve apenas se estiver vazio. Evita perda de edição manual em caso de re-execução do step DB.
- **Renomeio cosmético**: o step existente `aws-bridge` (LDAP F067) tinha rótulo "Bridge AWS"; renomeado para "Bridge LDAP" no STEPS map e no review para evitar colisão nominal com o novo step "Bridge AWS (portal-aws)".

## Smoke

- **`/smoke/f049`** (`apps/director-studio/src/routes/smoke-f049.tsx`) — não chama backend real. Switche 3 cenários (detected / not-detected / error) e mostra:
  1. O `StepPortalAws` renderizado (ou placeholder explicando o pulo quando `!detected`).
  2. Preview do payload que iria ao `/api/setup/commit` — chave `portalAws` aparece/desaparece conforme detection + secret.
  3. 5 asserções DoD (cenários A..E) com Check/X.

## Anti-violação

- Phosphor apenas (Eye, EyeSlash, Check, X, Info) — zero `lucide-react`.
- Cores semânticas (`text-x-success`, `text-x-error`, `text-x-info`, `text-destructive`, `text-muted-foreground`) via tokens — zero hex direto.
- Sem `setInterval`/polling. Detecção é one-shot dispatched no `onNext` do DB.
- Sem `console.log` no backend; `logger.warn` em caminho de erro.
- Sem componente reusável criado fora de `packages/ui` — o step é específico do wizard, vive em `apps/director-studio/src/setup/`.

## Typecheck

- `npm run typecheck` na raiz `workspace/director-studio` — 3 packages PASS (`@workspace/api`, `@workspace/ui`, `@workspace/director-studio`).

## Arquivos tocados

- **Novo** `apps/director-studio/src/setup/steps/portal-aws.tsx`
- **Novo** `apps/director-studio/src/routes/smoke-f049.tsx`
- **Novo** `mind/effort/on/director-studio/backlog/F049-decisions.md`
- **Modificado** `apps/api/src/config.ts` (OPTIONAL_WIZARD_KEYS + commitEnv)
- **Modificado** `apps/api/src/routes/setup.ts` (detect endpoint + commit schema extension)
- **Modificado** `apps/director-studio/src/setup/types.ts` (PortalAwsConfig + portalAwsDetected)
- **Modificado** `apps/director-studio/src/setup/wizard.tsx` (dynamic STEPS + detection trigger)
- **Modificado** `apps/director-studio/src/setup/steps/database.tsx` (busy prop)
- **Modificado** `apps/director-studio/src/setup/steps/review.tsx` (portal-aws rows)
- **Modificado** `apps/director-studio/src/routes/tree.tsx` (smoke route registration)
- **Modificado** `mind/effort/on/director-studio/feature-manifest.md` (status=ready-for-test)
- **Modificado** `mind/effort/on/director-studio/progress-messages.txt` (wip → ready-for-test)
