---
title: "F050 — Decisões de implementação"
aliases: [F050-decisions]
tags: [effort, director-studio, decisions, F050, render, eval-elimination]
created: 2026-05-15
updated: 2026-05-15
---

# F050 — Reescrita declarativa das 4 funções de `TBfuncao_model`

Implementa a **opção C** do contrato [[tbfuncao-model]] (registry estático de primitivas declarativas, sem `eval`).

## Decisões de arquitetura

1. **Localização do registry**: módulo `packages/ui/src/components/handlers/` (sub-pasta), com export agregado em `index.ts` exposto pelo `package.json` em `@workspace/ui/components/handlers`. Sub-pasta porque o registry é família de arquivos (`types.ts`, `executors.ts`, `registry.ts`), não cabe num único `.tsx`.

2. **Validação de schema**: Zod no boundary de leitura (`resolveFuncoes`). Entradas inválidas no array `funcoes[]` do model não quebram o engine — são logadas como `console.warn` e descartadas. Mesma política para chaves duplicadas (vence a primeira, igual ao `.find` do legado).

3. **Dispatch**: `Map<kind, executor>` estático. Adicionar primitiva nova = entrada em `types.ts` + executor em `executors.ts` + registro em `registry.ts`. Zero metaprogramação. O `switch` em `runHandler` tem `_exhaustive: never` para o TS apontar kinds novos não cobertos.

4. **API do handler**: contexto **nomeado** (`HandlerContext`):
   - `values: Record<string, unknown>` — payload do form já com extras mesclados
   - `apiBase: string` — endpoint do proxy (`/api/forms-proxy`)
   - `setStatus: (status) => void` — callback de status (4 fases mapeadas: validating/submitting/fetching-receipt → submitting na UI; success/error → estados terminais)
   - `openReceipt: ({titulo, html}) => void` — abre `ReceiptModal`
   - `onSuccess?: () => void` — hook de pós-sucesso (fechar form modal)

   **Não** reproduzo o `genericProps[N]` posicional do legado — todas as superfícies necessárias para as 4 funções de produção cabem nessa API nomeada.

5. **ReceiptModal**: substitui o pattern `document.createElement('iframe')+window.open('about:blank').document.write(html)` do legado. Implementação:
   - Drawer (vaul) responsivo
   - Iframe com `srcDoc` (não `src`) e `sandbox="allow-same-origin allow-modals"` (allow-modals só para o `window.print()` do botão "Imprimir")
   - HTML sanitizado por **DOMPurify** antes de virar `srcDoc` (FORBID `script`, `form`, `iframe`, `object`, `embed`, `input` + event handlers `on*`)
   - Documento sandbox tem `<style>` base inline para tabelas/print, fundo branco fixo (`color-scheme: light`)

6. **Wire no `GenericFormRenderer`**:
   - Nova prop opcional `funcoes?: Map<string, FuncaoDeclarativa>` (resolvida pelo `ModelEngine` via `resolveFuncoes(model.funcoes)`)
   - Nova chave em `GenericFormConfig`: `useGenericFunction?: string` (chave referenciando entrada no map)
   - `performSubmit`: se `useGenericFunction` resolve a um handler declarativo, dispara `executeByChave` (registry). Caso contrário, cai no submit default (POST `endPoint`).
   - Drawer de confirmação respeita `confirmacao` da primitiva (título/texto/botões); fallback para texto genérico quando ausente
   - `ReceiptModal` renderizado dentro do bloco `confirmation` (compartilha tree com o drawer de confirm para co-localização visual)

7. **Detecção de erro de proc**: reaproveito o `extractLegacyProcError` (envelope XML `<Resposta><Sucesso>false</Sucesso><Mensagem>...`) de F010, agora também no executor — o legado embute erro de negócio em recordsets de 200/OK. Quando `validacao.errorMessage` é definido na primitiva, usa-se como fallback quando a proc não explicita mensagem.

8. **Detecção de HTML do comprovante**: aceita `{html: "..."}` direto OU `{dados: [{<col>: "<html..."}]}` (coluna sem nome — caminho do legado SQL → `<Relatorio>` → coluna 0). Heurística: string com tag HTML e >16 chars.

## Smoke test

Rota dev: **`/smoke/f050`** (em `apps/director-studio/src/routes/smoke-f050.tsx`).

Stub local de `window.fetch` intercepta `/api/forms-proxy` e devolve respostas scripted (4 cenários por step: validate ok / fail-business / fail-network; persist ok / fail-business; receipt ok / fail). Não depende do backend rodando.

**Cenários cobertos (manual, via UI):**
1. submit-com-validacao (caminho feliz): drawer confirm → validate → persist → success banner
2. submit-com-validacao-e-comprovante: + fetch receipt → ReceiptModal abre com HTML sanitizado (XSS `<script>alert>` e `javascript:` href são strippados)
3. ModelEngine end-to-end: model JSON com `funcoes[]` top-level → resolveFuncoes → renderer recebe map → handler dispatcha
4. Chave desconhecida: `useGenericFunction: "chave_inexistente"` → warning no console + fallback graceful para submit default
5. Erro de validação envelope-XML do legado: validate retorna `<Resposta><Sucesso>false>`... → erro promovido para banner com mensagem da proc
6. Erro de persistência (`ok:false`): mensagem retornada exibida no banner
7. Network error em validação: mensagem humanizada "Sem conexão. Verifique sua internet."
8. Comprovante sem HTML: erro "Comprovante indisponível — resposta sem HTML."

**Verificação automática** via:
- `turbo run typecheck` (3 pacotes) — limpo
- `vite build` em `apps/director-studio` — limpo (chunk warning >500KB já existia, sem regressão)

## Proibições respeitadas

- Zero `eval`, zero `new Function`
- Zero `document.createElement`/`window.open` para UI
- Zero polling (handlers são one-shot await)
- API nomeada (sem `param0..param14` posicional)
- Tokens semânticos via tw-classes (`border-border`, `bg-card`, `text-muted-foreground`)
- Phosphor only (`@phosphor-icons/react`)
- Sem commit

## Caminhos novos

```
packages/ui/src/components/handlers/
  index.ts          — barrel exports
  types.ts          — Zod schemas + tipos (Submit*, Validacao, Persistencia, Comprovante, Confirmacao, HandlerContext)
  registry.ts       — resolveFuncoes + executeByChave + hasHandler
  executors.ts      — runSubmitComValidacao + runSubmitComValidacaoEComprovante + runHandler dispatch
packages/ui/src/components/receipt-modal.tsx  — ReceiptModal (vaul Drawer + iframe srcDoc sandbox + DOMPurify)
apps/director-studio/src/routes/smoke-f050.tsx — smoke route com stub de fetch e 4 cenários

Tocados:
packages/ui/src/components/generic-form-renderer.tsx  — wire do handler + ReceiptModal
packages/ui/src/components/model-engine.tsx           — resolveFuncoes + injeção do map no GenericFormRenderer
packages/ui/package.json                               — exports adicionados ("./components/handlers")
apps/director-studio/src/routes/tree.tsx               — rota /smoke/f050
```

## Cobertura do inventário real

As 4 funções legadas (todas seed do app `agent`, conforme [[tbfuncao-model]] §"Inventário real") caem em 2 primitivas:

| Função legada | Primitiva |
|---|---|
| `handle_submit_gerenciar_agendamento` | `submit-com-validacao` |
| `handle_update_gerenciar_agendamento` | `submit-com-validacao-e-comprovante` |
| `handle_cancelar_agendamento` | `submit-com-validacao` |
| `handle_submit_realizar_agendamento` | `submit-com-validacao-e-comprovante` |

**Não cobertos nesta wave**: encadeamento com `setCalendarCurrentFilter` (re-fetch do grid após persistir), `setTimeout 500ms → genericProps[13]("cancelarAgendamento")` (fechar action modal), `genericProps[10]` (cleanForm). Esses **side-effects pós-sucesso** caem no callback `onSuccess?: () => void` do contexto — quem registra o handler decide se quer limpar form / fechar modal / re-fetchar grid. Refinamento futuro (sub-feature) pode declarar essas pós-ações no schema (`apos: ["cleanForm", "refreshGrid:<chave>", "closeActionModal:<id>"]`).

## Sources

- [[tbfuncao-model]] — contrato canônico
- [[engine-schema-driven]] — engine F009 (host)
- [[model-valor-genericform]] — schema do genericform (F010)
