---
title: "Generic Form"
aliases: [generic-form, schema-form, form-renderer, df-form]
tags: [ui-system, component, form, renderer, schema-driven, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Generic Form

Renderizador de formulário **dirigido por schema** (JSON). Recebe uma descrição declarativa — campos, regras de visibilidade, dependências entre campos, botões, endpoints — e materializa em UI consistente sem que a feature precise compor `form-field` a mão. É o componente de mais alta granularidade do design system: empilha [[form-field]]s + [[button]]s + [[inline-alert]] + (opcionalmente) [[modal-sheet]] num único organismo coerente.

Tudo que no legado é `<GenericForm>` (ver contrato [[model-valor-genericform]]) é renderizado por este componente no Studio. O schema 2D `model[linha][campo]` do legado é o input canônico; o componente é responsável por interpretar layout, reatividade e submit.

## Quando usar

- Toda página/sub-página cujo nó `genericform` esteja presente no model retornado por `obter_model_pagina`.
- Em modal de cadastro/edição aberto pelo botão `+` de uma página de grid (`formOnModal=true`).
- Em modais auxiliares com mini-form (`actionModalConfigs[].model`).
- Em forms de telas próprias do Studio que se beneficiem do mesmo vocabulário (setup wizard avançado, cadastros internos).

## Quando NÃO usar

- Para formulários muito simples (1–2 campos) onde a composição direta de [[form-field]] + [[button]] é mais clara — ex: barra de busca, login.
- Para wizard multi-step com navegação entre etapas — esse é `wizard-form` (F015, ainda não catalogado).
- Para edição inline em tabela — usar primitivos da `data-table` (F011).

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `schema` | matriz 2D de descritores de campo (`Field[][]`) | obrigatório | Topologia visual: cada linha externa é uma row; campos internos ocupam colunas dentro da row. |
| `mode` | enum: `inline`, `modal` | `inline` | Inline renderiza no fluxo da página; modal usa [[modal-sheet]] como contêiner. |
| `crudMode` | enum: `create`, `edit`, `auto` | `auto` | Em `edit`, o componente carrega registro via `loadEndpoint+id` ao montar (ou ao receber `recordId`). `auto` decide por presença de `recordId`. |
| `recordId` | string/number | — | Id do registro em edição. Quando presente em `auto`, ativa `edit`. |
| `loadEndpoint` | path string | — | Endpoint para GET do registro em modo edit (concatena `id`). |
| `submitEndpoint` | path string | — | Endpoint padrão de POST. |
| `submitHandler` | enum: `default`, `genericFunction`, `external` | `default` | `genericFunction` chama função do banco; `external` delega callback. Mapeia 3 caminhos de submit do legado. |
| `submitExtras` | objeto | — | Merge de campos extras no body (substitui `genericFormAdditionalBodyParam`). |
| `buttons` | `Button[]` | — | Substitui o botão "Salvar" default por botões customizados em footer. Cada botão carrega `actions[]` declarativas. |
| `primaryActionLabel` | string | `"Salvar"` | Label do botão default quando `buttons` vazio. |
| `requireConfirmation` | bool / objeto `{title, body, confirmLabel}` | `true` | Quando `true`, exibe confirmação pré-submit (substitui texto hard-coded do legado). |
| `onSubmitSuccess` | callback | — | Pós-sucesso. Default: fecha modal (se modal), limpa state, dispara reload do grid acoplado. |
| `onLoadActions` | array de ações | — | Equivalente a `executeOnOpenForm` — proc/ação ao abrir form vazio. |
| `onCloseActions` | array de ações | — | Equivalente a `onCloseFormModalActions`. |
| `actionModals` | `ActionModalConfig[]` | — | Modais auxiliares disparados por botão do form. |
| `pipelinerMode` | bool | `false` | Liga overlay global durante submit longo. |

> O componente **consome** o catálogo de actions descrito em [[model-valor-genericform]] §"Action set" sem expô-lo na API React — actions vêm dentro do schema.

## Layout e composição visual

### Estrutura macro (top → bottom)

```
[ form-header opcional: título + descrição contextual (só em modal) ]
[ inline-alert opcional (erro de submit no nível form) ]
[ form-body: rows × cols                                 ]
   ┌─────────────────────────────────────────────────────┐
   │  row 1: [form-field] [form-field] [form-field]      │
   │  row 2: [form-field] [form-field]                   │
   │  row n: ...                                         │
   └─────────────────────────────────────────────────────┘
[ form-footer: [cancel] [primary] OU buttons customizados ]
```

### Layout responsivo (regra de breakpoint)

A topologia 2D do schema é **respeitada em desktop e reorganizada em mobile**:

- **mobile (< 640px)**: **single-column forçada**. O componente ignora a topologia 2D do schema e empilha todos os campos verticalmente na ordem `[row][col]`. Larguras `md` do legado são ignoradas. Padding lateral do form: `px-4`.
- **tablet (640–1024px)**: respeita rows; converte `md` Bootstrap (1–12) em colunas CSS Grid (`grid-cols-12`, span = `md`). Mínimo de coluna por campo: `min-w-[200px]`. Se um campo excederia 200px em < 50% da coluna, quebra para nova row visual mantendo a ordem.
- **desktop (> 1024px)**: topologia 2D plena. `grid-cols-12` com `gap-4`. `md` do schema = `col-span-{md}`. Rows com `gap-y-3` entre si.

### Espaçamento interno

- gap horizontal entre campos da mesma row: `gap-4` (16px) desktop, `gap-3` (12px) tablet.
- gap vertical entre rows: `gap-y-3` (12px).
- footer separado por `border-t border-border` + `pt-4 mt-6`.

### Densidade

- **densidade compacta** (default em modal e em forms de filtro): campos com `h-9` desktop / `h-10` mobile.
- **densidade confortável** (default em página primária): `h-10` em todas as viewports.
- Propriedade `density` opcional: `compact` | `comfortable`. Default `auto` (compact em modal, comfortable em inline).

### Agrupamento (sections)

Schema legado **não tem sections explícitas**, mas o Studio aceita grupos opcionais como **enriquecimento**:

- Se schema vier com `groups[]` (opcional, novo no Studio), o renderer agrupa rows sob um título de seção (`text-sm font-semibold text-muted-foreground uppercase tracking-wide`).
- Sem groups, todas as rows ficam num único bloco. Compatibilidade total com legado.
- Em mobile, groups viram divisores horizontais com label flutuante; não há collapse default.

## Estados

- **idle** — pronto para input. Submit habilitado se obrigatórios preenchidos (validação leniente — não bloqueia botão, mas bloqueia ação).
- **loading-record** — carregando registro em modo edit. Skeleton de rows (≥ 3 linhas com `bg-muted/40` pulse). Cancel disponível; submit oculto até carregar.
- **validating** — durante digitação, campos com debounce de 250ms aplicam `form-field` em estado error individual. Inline-alert no topo só aparece em submit, não em digitação.
- **submitting** — botão primário em estado `loading` (ver [[button]]). Form inteiro com `aria-busy="true"`. Campos ficam `readOnly` (visual sutil, não bloqueante para leitura) durante o submit. Pipeliner mode liga overlay global por cima.
- **success** — pós-submit OK. Default: dispara toast `success` (não inline). Em modal: fecha modal com motion de saída. Em inline: limpa form (modo create) ou mantém valores (modo edit).
- **error-validation** — submit falhou no gate de obrigatórios. Inline-alert no topo: `"Verifique os campos destacados."` + scroll para primeiro campo inválido (smooth, com margem de 24px do topo do viewport).
- **error-server** — submit chegou no servidor e falhou. Inline-alert no topo: mensagem humanizada vinda da resposta. Casos especiais:
  - Erro de UNIQUE constraint: mensagem `"Já existe um registro com esses dados."` (substitui texto cru de SQL).
  - Erro 500 sem mensagem: `"Não foi possível salvar. Tente novamente em instantes."`
  - Erro de rede: `"Sem conexão. Verifique sua internet."`
- **dirty** — pelo menos um campo modificado em relação ao state inicial. Visual sutil: indicador `•` ao lado do título do form (ou label do modal). Tentativa de fechar modal em estado dirty dispara confirmação `"Descartar alterações?"`.
- **clean** — sem modificações; default em mount.

## Validação

### Inline (durante digitação)

- Cada [[form-field]] valida sozinho contra: `required`, `maskType` (formato), `maxLength`.
- Validação dispara após **primeiro blur** do campo, **e** em mudanças subsequentes — não no primeiro foco.
- Erro de campo: borda `border-x-error` + mensagem abaixo. Sem inline-alert no topo durante digitação.

### Submit gate

- No clique do botão primário (ou confirmação do dialog de confirmação): valida **todos** os campos visíveis e obrigatórios.
- Se algum inválido:
  - Aplica `aria-invalid="true"` em cada campo inválido.
  - Mostra inline-alert no topo.
  - Foca primeiro inválido com scroll smooth.
  - **Não envia** o request.
- Campos escondidos por `hideField`/`checkValue` são ignorados na validação, mesmo que `required=true`.

### LinkedFields (cascata reativa)

Quando um campo `A` muda e dispara `linkedFields` em campo `B`:

- **Loading visual no campo dependente**: se a action é `executeProcedure` ou `sendRequestCorreiosApi` (assíncrona), `B` entra em estado `loading` (spinner Phosphor `CircleNotch` no suffix do form-field, controle não-editável temporariamente). Duração típica: 200ms–2s.
- **Disable/enable**: motion `fast` (150ms) — opacity + cursor. Sem layout shift.
- **Hide/show**: fade-out 150ms seguido de collapse de altura 200ms (`slow-ish`). Show inverte: expand 200ms + fade-in 150ms. Em `prefers-reduced-motion`, alternância instantânea.
- **setValue programático**: campo recebe valor; aplica um leve flash de fundo (`bg-x-info/10` por 400ms então fade) para sinalizar que mudou sem ação do usuário.
- **Cascata recursiva**: o componente preserva o `actionController` do legado — uma cadeia A→B→C dispara em sequência mas sem loop.

## Botões e footer

### Posição

- **mobile (< 640px)**: footer **fixo no rodapé do viewport** (`position: sticky; bottom: 0`), com fundo `bg-background` + sombra superior sutil + `border-t`. Garante thumb-zone. Padding `px-4 py-3`. Em modal mobile (bottom sheet via [[modal-sheet]]/vaul), o footer é parte do sheet, não do viewport.
- **tablet/desktop**: footer **inline no fluxo**, alinhado ao fim do form-body. Não-sticky.

### Ordem

- **Sempre**: ação secundária (`Cancelar`/`Voltar`) à **esquerda**, ação primária (`Salvar`) à **direita**.
- **Mobile**: mesma ordem; primário ocupa mais espaço (`flex-1` ou `min-w-[60%]`). Secundário pode ser variant `ghost` para reduzir peso visual.
- **Justificação**: a convenção brasileira/ocidental de "ação positiva à direita" é mantida em todas as viewports. **Não invertemos em mobile** — inversão confunde usuários acostumados ao padrão.

### Estado loading

- Botão primário em estado `loading` ([[button]] §loading): spinner substitui ícone (ou aparece antes do label), texto preservado, botão `disabled`.
- Botão secundário fica habilitado durante submit normal — usuário pode cancelar. **Exceção**: em `pipelinerMode`, ambos ficam disabled (operação não-cancelável).

### Botões customizados (`buttons[]`)

- Quando schema fornece `buttons[]`, substituem o par default. Renderizados na ordem do array, todos no footer, alinhados à direita.
- Em mobile com `buttons[].length > 2`: empilha verticalmente (`flex-col gap-2`), primário no topo.
- Em mobile com `buttons[].length > 4`: agrupa secundários em menu overflow (botão `⋯ Mais ações` que abre [[modal-sheet]] com lista).

## Confirmation modal pre-submit

Substitui o `openConfirmationModal` hard-coded do legado.

- **Trigger**: clique no botão primário (ou em qualquer botão customizado que tenha `requiresConfirmation=true`).
- **Render**: [[modal-sheet]] com `variant=dialog` (modal centrado desktop, bottom-sheet mobile via vaul). Tamanho `sm`.
- **Conteúdo default**:
  - Título: `"Confirmar operação"`.
  - Corpo: `"Tem certeza que deseja realizar a operação?"` (mantém texto legado por compatibilidade, mas parametrizável).
  - Botões: `Cancelar` (ghost) + `Confirmar` (primary).
- **Parametrização**: prop `requireConfirmation` aceita objeto `{title, body, confirmLabel, confirmVariant}`. `confirmVariant=destructive` em operações de exclusão.
- **Opt-out**: `requireConfirmation=false` pula o modal. Por default permanece **ligado** (alinha com legado).
- **A11y**: foco inicial no botão `Cancelar` (não no destrutivo). Esc fecha. Backdrop click fecha. `role="alertdialog"` quando destrutivo, `role="dialog"` caso contrário.

## Feedback pós-submit

- **Sucesso**: toast de `success` (ainda não catalogado como spec — sinal ao curator) com mensagem vinda da resposta (`resposta.dados` ou `resposta.mensagem`) ou fallback `"Salvo com sucesso."`. Duração 4s. Posicionamento: bottom-center em mobile, bottom-right em desktop.
- **Erro de validação local**: inline-alert no topo do form (não toast). Texto: `"Verifique os campos destacados."` Não some sozinho — some quando usuário corrigir todos ou re-tentar.
- **Erro de servidor**: inline-alert no topo + toast `error` curto (3s) com a mesma mensagem (redundância intencional — alert persistente para leitura, toast para chamar atenção). Alert some quando próximo submit.
- **Success em modal**: fecha modal com motion `slide-out` (200ms) + dispara toast no contexto pai (não dentro do modal já fechado).

## Motion

- **entrada do form em modal**: composto pelo motion do [[modal-sheet]]. Form interno aparece com 50ms de delay para fluidez.
- **entrada inline**: form aparece com fade-in 200ms (`normal`), easing `ease-out`. Sem slide.
- **mudança de schema reativo** (linked actions reorganizando visibilidade): cada show/hide em 200ms; o restante do form transita layout via `transition-[grid-template]` quando possível (chrome moderno).
- **flash de setValue programático**: bg flash 400ms (`slow`), ease-out, depois fade.
- **scroll para campo com erro**: `behavior: smooth`, duração ~300ms.
- **footer sticky em mobile**: aparece sem motion; fica solidário ao scroll.
- **reduced-motion**: todas as transições caem para mudança instantânea exceto fade-in inicial (50ms).

## Responsivo

- **mobile (< 640px)**: single-column forçada; footer sticky; densidade comfortable; modal vira bottom-sheet; ordem de botões preservada (cancel esquerda / primary direita); buttons[] empilha se > 2.
- **tablet (640–1024px)**: grid 12-col respeitado mas com `min-w-[200px]` por campo; footer inline; densidade comfortable.
- **desktop (> 1024px)**: topologia 2D plena do schema; footer inline; densidade ajustada por contexto (compact em modal, comfortable em página primária).
- **thumb zone**: campos com tap target ≥ 44px; footer sticky garante alcance do polegar.
- **gestos**: em modal mobile (bottom-sheet), swipe-down no handle do sheet fecha (delegado a [[modal-sheet]]/vaul); se form está dirty, dispara confirmação de descarte.

## Acessibilidade

- Form raiz é `<form>` semântico com `aria-labelledby` apontando para o título (em modal) ou para um heading visível (em inline).
- `aria-busy="true"` durante submitting.
- Cada campo: ver [[form-field]] (`aria-required`, `aria-invalid`, `aria-describedby`).
- Inline-alert no topo: `role="alert"` quando aparece pós-submit; `aria-live="polite"` durante validação inline.
- Navegação por teclado:
  - Tab percorre campos na ordem visual (row 1 col 1 → row 1 col 2 → row 2 col 1 ...). Em mobile single-column, ordem natural.
  - Enter em campo de texto único: dispara submit do form pai.
  - Enter em textarea: quebra linha (não submete).
  - Esc em modal: fecha modal (com confirmação se dirty).
  - Botão primário tem foco visível distinto.
- LinkedFields que mudam visibilidade: anuncia via `aria-live="polite"` no container do form (`"Campo X agora visível"`).
- Confirmation modal: foco move para `Cancelar`; Tab cíclico dentro do dialog (focus trap).
- Contraste: todos os textos seguem [[form-field]] §contraste.

## Composição

- **Compõe**: [[form-field]] (todos os controles), [[button]] (footer), [[inline-alert]] (erro de submit), [[modal-sheet]] (mode=modal e confirmation), `toast` (feedback pós-submit, ainda não catalogado), `loading-skeleton` (estado loading-record, ainda não catalogado), variantes de field listadas em [[field-types]].
- **É composto por**: pages renderizadas pelo engine schema-driven (F010), modais de cadastro em páginas de grid (F011 acopla form em modal), wizard (F015 usa generic-form por step), templates do legado `TemplateCadastro`/`TemplateFormulario`/`TemplateIntegracao`.

## Cores e tokens

- `bg-background`, `bg-card` — superfícies.
- `text-foreground`, `text-muted-foreground` — texto principal e auxiliar.
- `border-border`, `border-input` — divisores e bordas de campo.
- `border-t`, `bg-background` + `shadow-[0_-1px_0_rgba(0,0,0,0.04)]` — footer sticky mobile.
- `bg-muted/40` — skeleton de loading.
- `bg-x-info/10` — flash de setValue.
- `text-x-error`, `border-x-error` — campos e mensagens de erro.
- `text-x-success` — toast de sucesso.

## Edge cases

- **Schema vazio** (`model: []`): renderiza só o footer com botão primário (caso real de form que executa proc sem inputs). Se também `buttons: []`, não renderiza nada — sinaliza erro de schema (log).
- **Campo único em row única**: ainda respeita grid; campo ocupa `col-span-{md}` (ou `col-span-12` se `md` ausente).
- **Edição com `selectOptions` lazy-loaded**: campo select pode mostrar valor cru (id) enquanto opções carregam. Durante esse gap, exibir skeleton dentro do select; só revelar o label quando opções resolverem.
- **Cascata circular em linkedFields**: o legado tem `actionController` de dedup; replicar. Se loop detectado em runtime, log + abortar a cadeia (sem crash).
- **Schema com `useGenericFunction` mas sem função registrada**: erro de schema; mostrar inline-alert `"Configuração inválida do formulário."` e desabilitar submit. Não tentar evaluar.
- **Form em modal com confirmação destrutiva**: dois modais empilham (form modal + confirm modal). Garantir z-index e focus-trap aninhados.
- **Submit otimista (legado não trava)**: o Studio **trava** o botão durante submit (divergência consciente do legado — melhoria de UX).
- **Pipeliner mode**: overlay global cobre toda a tela; form footer fica desabilitado; cancel não aparece.

## Notas para o smith

- A topologia 2D do schema é **input**, não dogma. O componente decide layout final por viewport. O smith **não** propaga `col-md-X` cru — usa o sistema de grid próprio.
- LinkedFields são **lógica do renderer**, não da feature. Smith aciona o renderer com o schema; o renderer interpreta.
- Confirmation modal é **opt-in default ligado** — manter compatibilidade com legado por default, mas expor opt-out para casos novos.
- Loading state diverge do legado (que era otimista). Decisão UX consciente.

## Sources

- [[calendar/notes/2026-05-15.md]] — UX de F010
- [[model-valor-genericform]] — contrato legado
