---
title: "F010 — GenericForm Renderer — decisões"
tags: [effort, director-studio, F010, decisions]
created: 2026-05-15
updated: 2026-05-15
---

# Decisões — F010 GenericForm Renderer

## Escopo da onda

Camada inicial do `<GenericForm>` legado. Cobre `ctypes` simples e o caminho de submit default. Renderers complexos (file/date/append/grid-button) ficam para features dedicadas (F017/F018, sub-features pendentes).

## Ctypes cobertos

| ctype legado | Componente Studio | Notas |
|---|---|---|
| `input` (com/sem maskType) | `FormField` (controlType=text/email) | mask inteiro/decimal/numerosTamanhoVariavel aplicada via `applyMask`. Validação de `email`, `cpf-cnpj`, `cnpj` via `validateMask`. |
| `text-area` | `FormField` (controlType=textarea) | `rowNumber` → `rows`. |
| `numbers` | `FormField` (atalho) | inputMode=numeric, mask numerosTamanhoVariavel. |
| `checkbox` | `CheckboxControl` (primitivo novo) | `checkBooleanValue` parser. |
| `bool` | `TriStateToggle` (primitivo novo) | 3 estados: true/false/null. |
| `radio` | `RadioGroupControl` (primitivo novo) | options de `field.values[]`. |
| `select` (selectDataType=fixedList) | `SelectControl` (primitivo novo) | options inline; `selectDataType=queryKey/proc` cai em placeholder F019. |

## Ctypes deferidos (placeholder com aviso)

- `file` → F017
- `date`, `time`, `date-time`, `dates`, `datetime-interval` → F018
- `search-input` → F019
- `icon-list`, `grid-button`, `append`, `append-input` → sub-features pendentes (sinalizadas pelo designer no field-types.md)

Para esses ctypes o renderer mostra um bloco amarelo identificando a chave + feature alvo + label original; **valida como skip** (não bloqueia submit por required em ctype não cobertos) para permitir testar o restante do form.

## LinkedFields — actions cobertas

- `setValue` — atualiza `values[fieldName]`
- `enableField` / `disableField` — runtime `disabled`
- `showField` / `hideField` — runtime `hidden`
- `setRequiredField` / `setNotRequiredField` — runtime `required`

Outras 13 actions do contrato (executeProcedure, updateSelectOptions, executeExternalAction, executeGenericFunction, sendRequestCorreiosApi, fillForm, cleanForm, openActionModal, alterButtonsVisibility, handleEnableDisableFields, concatValue, removeConcatValue, removeFieldError) emitem **warning no console** e são no-op. F039 cataloga `funcoes` legadas; futuras ondas reintroduzem caso a caso.

Cascata recursiva: limitada por `actionDepth.current < 5` (sem `actionController` por nome ainda — basta para os casos cobertos; F010+ pode endurecer se necessário).

## Submit

Caminho default único nesta onda: POST `/api/forms-proxy` com `{endPoint, body}`. O proxy:

- valida sessão (cookie httpOnly)
- exige `endPoint` no formato `/proc/<nome>` (regex `[A-Za-z0-9_]+`)
- executa stored procedure SQL Server passando `@xml` = `<root><campo>valor</campo>...</root>` (convenção legado .NET AppBuilder)
- retorna `{ok:true, mensagem?, dados}` ou `{ok:false, error, message}`

`useGenericFunction` / `onSubmitForm` não implementados — placeholders com aviso. F039 inventaria.

## Detecção de erro de proc embutido em 200

O legado .NET retorna HTTP 200 mesmo quando a proc embute erro em XML (`<Resposta><Sucesso>false</Sucesso><dados><Mensagem>...`). O renderer detecta esse padrão (`extractLegacyProcError`) e promove a `<Mensagem>` para estado `error-server`. Mensagens UNIQUE são humanizadas para "Já existe um registro com esses dados.".

## Confirmation modal

`Drawer` (vaul) com texto fixo "Tem certeza que deseja realizar a operação?" — replica o legado. Não exposto opt-out nesta onda (todas as confirmações são ligadas).

## Modal vs inline

`formOnModal=true` → renderer mostra botão "Novo" + drawer com form dentro; submit fecha drawer em sucesso. `formOnModal=false` ou `forceInline=true` → form inline na página.

`hideAddButton=true` esconde o botão "Novo" (caso real: form modal aberto só por linhas do grid; entrega completa em F011+F010 integração).

## Layout grid

Topologia 2D do schema é preservada em desktop via `grid-cols-12` + inline `style.gridColumn: span N / span N` (não usamos `sm:col-span-N` dinâmico — Tailwind 4 JIT exigiria safelist). Em mobile, `grid-cols-1` força stacking; `gridColumn span N` torna-se no-op.

## Estados visíveis

- **idle** — formulário pronto
- **submitting** — botão primary com `CircleNotch` animado, `disabled`; aria-busy no container
- **success** — InlineAlert verde no topo
- **error-validation** — InlineAlert amarelo + `aria-invalid` nos campos + foco/scroll no primeiro inválido
- **error-server** — InlineAlert vermelho com mensagem humanizada (UNIQUE→amigável; proc XML→mensagem extraída)

## Sem testes automatizados

Smoke test: `/app/cadastros/grupo-de-trabalho?model=wms.cadastros_grupo-de-trabalho` (override de model via query, ativado em `EnginePage` para destravar F010+ enquanto F043 não seedar models de `portal-director`).

Validado contra DB Area 52:
- Form renderiza em modo modal (formOnModal=true, crudForm=true)
- Botão "Novo" abre drawer com 5 campos: dfdescricao (input,required), dfativo_inativo (select Ativo/Inativo,required), mapas (grid-button placeholder), usuarios (grid-button hidden), juncao (grid-button required→skip)
- Validation gate ativa aria-invalid + inline alert ao tentar Salvar vazio
- Confirmação drawer → Confirmar → POST /api/forms-proxy → SQL Server proc `sp_Persistir_GrupoTrabalho` → resposta XML detectada como erro de negócio ("Informe uma junção válida") → InlineAlert vermelho

## Override de model via query (`?model=<pageKey>`)

`EnginePage` em `app-page.tsx` aceita `?model=<chave>` na URL e usa diretamente como pageKey, bypassando menu/ACL. Necessário enquanto F043 não seedar models de `portal-director` na base de teste (Area 52 só tem 6 models `wms.*` fora do menu PROCESSA). Documentado no arquivo. Não é debt — é caminho de smoke test para destravar F010-F022.

## Arquivos novos

- `packages/ui/src/components/checkbox-control.tsx`
- `packages/ui/src/components/radio-group-control.tsx`
- `packages/ui/src/components/tri-state-toggle.tsx`
- `packages/ui/src/components/select-control.tsx`
- `packages/ui/src/components/generic-form-renderer.tsx`
- `apps/api/src/routes/forms-proxy.ts`

## Arquivos editados

- `packages/ui/src/components/model-engine.tsx` — registry: genericform → GenericFormRenderer (demais chaves continuam stub)
- `apps/api/src/index.ts` — mount /api/forms-proxy
- `apps/director-studio/src/routes/app-page.tsx` — override `?model=` para smoke

## Limites conscientes

- 11 das ~30 actions de linkedFields cobertas; resto loga warning e pula
- Submit só por `/proc/<nome>` (sem suporte a endpoints arbitrários nesta onda)
- Sem `useGenericFunction` (eval) — F039
- Sem `actionModalConfigs` (modais auxiliares com mini-form ou grid)
- Sem `executeOnOpenForm` (proc on mount)
- Sem `onRequiredFieldsFilledExecuteActions`
- Sem load de registro em modo edit (`api+id`) — requer F019 + F011 (grid-select) para fluxo real
- Footer mobile-sticky simplificado (sem position:sticky bottom nesta camada — aplicado em onda de polish)
- Toast ainda não catalogado no design system; usamos InlineAlert no topo do form para feedback (compatível com spec)
