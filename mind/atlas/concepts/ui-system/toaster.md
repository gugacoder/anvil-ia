---
title: "Toaster"
aliases: [toast, toaster, notifications, sonner, use-toast]
tags: [ui-system, component, feedback, toast, notifications, sonner]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Toaster

Sistema de **notificação flutuante transitória** do Director.Studio. Mensagens curtas, sobrepostas à interface, que comunicam o resultado de uma ação assíncrona, um erro de rede, ou um aviso pontual — e desaparecem sozinhas. O Toaster é o canal de feedback **efêmero**: o que precisa ser dito *agora*, mas não precisa ficar.

Modelo mental: o usuário acabou de fazer algo, e o sistema responde sem interromper o fluxo. Toast nasce de uma ação, não de um estado pré-existente da página.

A spec cobre **três peças que andam juntas**:

1. **`<Toaster />`** — root invisível montado uma única vez no [[app-shell]]. Renderiza a pilha de toasts ativos.
2. **`useToast()`** — hook idiomático que o app consome. Devolve a fachada `{success, info, warning, error, dismiss}`.
3. **`toast.*`** — API funcional global (sem hook) para uso fora de React (utilitários, interceptors de fetch, side-effects).

Base: **sonner** (de facto padrão no ecossistema shadcn/Tailwind). Não reinventar — sonner já cuida de stack, a11y básica, animações, swipe mobile, hover-pause, action button.

## Quando usar

- Resultado de submit bem-sucedido ("Cadastro salvo").
- Erro de rede ou de validação distante do form ("Falha ao conectar ao servidor").
- Aviso operacional pontual ("Sessão expira em 5 minutos").
- Confirmação de operação assíncrona ("Exportação iniciada — você será notificado quando concluir"), opcionalmente com `action` (botão "Ver progresso").
- Resultado de ação iniciada longe do ponto de retorno (ex: ação em grid que dispara job).

## Quando NÃO usar

- Erro associado a **um** campo de form → `error` do [[form-field]].
- Erro de submit que precisa ser relido como contexto da página → [[inline-alert]].
- Confirmação destrutiva ("Tem certeza?") → `confirm-dialog` (não nesta wave).
- Banner persistente ancorado em página ("Este registro está bloqueado") → [[inline-alert]] ou futuro `page-banner` (spec separada).
- Erro fatal de aplicação (rota quebrada, crash) → `error-boundary-state` (não nesta wave).
- Mensagens longas (> 2 linhas em desktop) → reformular ou usar modal/alert.

## API conceitual

### Hook `useToast()`

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `success(message, options?)` | fn | — | Dispara toast verde com ícone `CheckCircle`. Duração 4s. |
| `info(message, options?)` | fn | — | Dispara toast neutro/azul com ícone `Info`. Duração 5s. |
| `warning(message, options?)` | fn | — | Dispara toast amarelo com ícone `Warning`. Duração 6s. |
| `error(message, options?)` | fn | — | Dispara toast vermelho com ícone `XCircle`. Duração 8s. |
| `dismiss(id?)` | fn | — | Fecha um toast específico por `id`. Sem argumento, fecha **todos**. |

A API funcional `toast.success(...)` / `toast.error(...)` / `toast.info(...)` / `toast.warning(...)` / `toast.dismiss(...)` é equivalente e disponível para uso fora de componentes React (ex.: interceptor de fetch, store actions).

### `options` por toast

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `description` | string | — | Linha secundária menor sob o `message` principal. Quando ausente, `message` ocupa a linha única. |
| `duration` | number ms \| `Infinity` | por severidade (ver Motion) | Sobrescreve duração default. `Infinity` torna o toast persistente até dismiss manual. |
| `id` | string | gerado | Identidade lógica do toast. Disparo com mesmo `id` substitui o anterior in-place (útil para atualizar progresso). |
| `action` | `{label, onClick}` | — | Botão à direita do toast. Ao clicar, executa `onClick` e fecha o toast. Usar para CTA imediato ("Desfazer", "Ver detalhes"). |
| `onDismiss` | fn(id) | — | Callback chamado quando o toast é fechado por qualquer causa (timeout, click, swipe, dismiss programático). |
| `onAutoClose` | fn(id) | — | Callback chamado especificamente quando o timer expira. |

### Promise toast (atalho)

`toast.promise(promise, { loading, success, error })` — útil para operações assíncronas onde o feedback deve evoluir conforme a promise resolve. Sonner já implementa; herdamos sem reescrita.

## Divergências conscientes do legado

A camada `useNotifications` do legado (vide [[legacy-contracts/notifications|contrato]]) é preservada **só na forma da fachada** (hook com verbos por severidade). Tudo abaixo muda:

| Aspecto | Legado | Studio |
|---|---|---|
| Nome do verbo de erro | `danger` | **`error`** (alinhado a API moderna) |
| Stack | Suprimido — novo cancela velho, único-em-tela do mesmo tipo (bug N11) | **Stack real** (sonner), múltiplos toasts coexistem, ordem cronológica |
| Dismiss programático | Inexistente — app não tem como fechar | **`dismiss(id?)`** disponível no hook e na API funcional |
| Duração por severidade | 5s para todos | **4s/5s/6s/8s** (success/info/warning/error) — erro fica mais tempo |
| Pause on hover | Forçado, sem opção | Default `true`, sonner cuida |
| Posição | `top-center` fixo desktop, `mobile-top` mobile | **`top-right` desktop, `top-center` mobile** (ver Responsivo) |
| Lib | Própria, vendorizada (`rnc__*`) | **sonner** (shadcn-compatível, manutenção zero) |
| A11y | Ausente | `role="status"` (info/success), `role="alert"` (warning/error), `aria-live` apropriado |
| Action button | Inexistente | Suportado via `options.action` |
| Promise integration | Inexistente | `toast.promise(...)` |
| Banner full-width | Mesmo componente em variantes `top-full`/`bottom-full` | **Fora do escopo do Toaster** — banner é spec separada (futuro `page-banner`) |

Migração: features do legado que chamam `notify.danger(msg)` mapeiam para `toast.error(msg)`. Curator decide se há shim de compat para `danger` ou se a renomeação é hard-cut. Spec aqui assume **hard-cut**: API é `error`.

## Estrutura visual

```
┌─────────────────────────────────────────────┐
│ [icon]  Message principal             [×?]  │
│         Description (opcional)        [Act] │
└─────────────────────────────────────────────┘
```

- Padding interno: `p-3` mobile, `p-4` desktop.
- Border-radius: `rounded-lg` (toasts são mais arredondados que cards, dão "ar" flutuante).
- Borda: `border border-border` sutil; sem `border-left` espessa (o toast usa cor de fundo e ícone para comunicar severidade — não precisa do bloco lateral do inline-alert).
- Background: cor sólida da variant com opacidade alta (`bg-card` com tint da variant via mix sutil). Texto sempre `text-foreground` sobre o fundo do toast — contraste AA garantido em ambos os temas.
- Sombra: `shadow-lg` (toast é o único componente onde a sombra dramática é apropriada — comunica "flutua acima do conteúdo").
- Largura: `min-w-[320px] max-w-[420px]` desktop; `w-[calc(100vw-2rem)]` mobile (full-width com margem 16px de cada lado).

## Estados

- **default** — toast visível, timer correndo.
- **hover** (desktop) — timer **pausa**; cursor `default` no corpo, `pointer` em ações.
- **focus** (toast com `action`) — botão de ação recebe foco visível.
- **active** — N/A no corpo; ações têm seus próprios estados ([[button]]).
- **disabled** — N/A.
- **loading** — quando usado via `toast.promise(...)`, o estado loading mostra spinner Phosphor (`CircleNotch` rotativo) no lugar do ícone, sem timer (persistente até resolver).
- **error/success/warning/info** — variantes paralelas (são o ponto principal do componente).
- **dismissing** — animação de saída disparada (ver Motion).

## Motion

Durações por severidade (overridable via `options.duration`):

| Variant | Duração default | Justificativa |
|---|---|---|
| `success` | 4000 ms | Confirma e some — não precisa demorar. |
| `info` | 5000 ms | Leitura simples, default neutro. |
| `warning` | 6000 ms | Mais tempo para o usuário absorver o que precisa atenção. |
| `error` | 8000 ms | Erros exigem reflexão; pode ser longo. Em geral, considerar `Infinity` se a ação corretiva precisa do toast visível. |

- **Entrada**: slide-in do topo (16px) + fade-in, `normal` 250ms, easing `ease-out`. Pilha de toasts mais antigos translada 4px para baixo simultaneamente.
- **Saída**: fade-out + slide-out 8px, `fast` 150ms, easing `ease-in`. Pilha colapsa após a saída completa.
- **Hover (desktop)**: timer pausa imediatamente; visualmente, nenhuma alteração — o pause é silencioso (sem barra de progresso piscando).
- **Swipe-to-dismiss (mobile)**: arrastar horizontalmente. Threshold ~50% da largura. Animação acompanha o dedo; ao soltar, completa a saída ou volta à posição (250ms ease-out).
- **Action click**: fade-out imediato (`fast` 150ms) após `onClick` executar.
- **`prefers-reduced-motion`**: entrada/saída viram fade simples 100ms; sem slide, sem swipe animado (toast desaparece direto).

## Posicionamento e Responsivo

- **mobile (< 640px)**: posição **`top-center`**, full-width com margem lateral 16px. Stack vertical. Swipe horizontal para dismiss. Padding interno `p-3`, texto `text-sm` (14px), description `text-xs` (12px). Ícone `size-4` (16px).
- **tablet (640–1024px)**: posição **`top-right`**, largura `360–400px`. Stack vertical à direita. Padding `p-4`, texto `text-sm`.
- **desktop (> 1024px)**: posição **`top-right`**, largura `360–420px`. Stack vertical. Padding `p-4`, ícone `size-5` (20px).
- **z-index**: acima de modal/sheet/popover. Convenção: `z-toast` token (acima de `z-modal`).
- **thumb zone (mobile)**: toast no topo evita conflito com gestos de navegação no rodapé; dismiss por swipe não exige precisão milimétrica.
- **max simultâneos visíveis**: 3 — toasts além disso ficam em fila interna do sonner e entram conforme os anteriores saem. Configurável via prop do `<Toaster visibleToasts={3} />`.

## Acessibilidade

- **`role`**:
  - `info`, `success` → `role="status"`, `aria-live="polite"`. Leitor anuncia quando ocioso, sem interromper.
  - `warning`, `error` → `role="alert"`, `aria-live="assertive"`. Leitor interrompe e anuncia imediatamente.
- **`aria-atomic="true"`** — o conteúdo do toast é lido inteiro a cada mudança.
- **Ícones por variant** comunicam severidade **junto com cor** — daltônicos identificam pela forma do ícone. Phosphor:
  - `success` → `CheckCircle`
  - `info` → `Info`
  - `warning` → `Warning`
  - `error` → `XCircle`
- **Botão de close (`×`)** opcional via `<Toaster closeButton />`. Quando presente: `aria-label="Fechar notificação"`, foco visível, área de toque 32×32 mobile.
- **Botão de action** segue regras de [[button]]: foco visível, tab-order, `aria-label` quando o `label` é só ícone (não recomendado em toast — preferir label textual).
- **Foco não rouba**: toast não foca automaticamente; mantém o foco do usuário onde estava. Action button só recebe foco via tab.
- **Conteúdo dinâmico**: usar `id` consistente quando atualizar um toast em progresso (ex: `toast.loading(... { id: 'upload' })` → `toast.success(... { id: 'upload' })`).
- **Contraste**: validado em ambos os temas — fundo do toast contra `text-foreground` ≥ AA; cor de ícone contra fundo ≥ AA.
- **Não confiar só em cor**: ícone + texto + role ARIA juntos.

## Composição

- **Compõe**: ícones Phosphor; opcionalmente [[button]] (size `sm`, variant `ghost` ou `link`) para `action`.
- **É composto por**: [[app-shell]] (monta `<Toaster />` uma vez na root); chamado por virtualmente todas as features que executam ações assíncronas — [[generic-form]] (submit), [[data-grid]] (export/delete), [[dashboard]] (refresh), AuthProvider (sessão expirada), interceptor global de fetch (erros de rede).

## Cores e tokens

Por variant — fundo é uma camada sólida derivada de `bg-card` tingida pela cor da severidade. **Não usar opacidade translúcida** (toast precisa ser opaco para legibilidade sobre conteúdo dinâmico atrás dele).

| Variant | Background | Border | Icon color | Text |
|---|---|---|---|---|
| `success` | `bg-x-success/10` (camada sólida via `mix` ou variável composta) | `border-x-success/20` | `text-x-success` | `text-foreground`; description `text-muted-foreground` |
| `info` | `bg-x-info/10` | `border-x-info/20` | `text-x-info` | `text-foreground` / `text-muted-foreground` |
| `warning` | `bg-x-warning/10` | `border-x-warning/20` | `text-x-warning` | `text-foreground` / `text-muted-foreground` |
| `error` | `bg-x-destructive/10` | `border-x-destructive/20` | `text-x-destructive` | `text-foreground` / `text-muted-foreground` |

Tokens semânticos sempre — nunca cor direta. Ver [[semantic-colors]] / [[semantic-palette]]. Nota sobre `error`: nas tokens semânticas do projeto a cor de erro é exposta como `destructive` (alinhada ao shadcn) e/ou `x-error` no namespace estendido — a spec usa `x-destructive` como contrato canônico; aliases (`x-error`) resolvem para o mesmo valor.

Sombra: `shadow-lg` (definida na escala do design system, não cor direta).

Z-index: token `z-toast` (acima de `z-modal`, `z-popover`, `z-sheet`).

## Edge cases

- **Dois toasts disparados em sucessão rápida (< 200ms)**: sonner stackeia naturalmente; ambos aparecem com leve cascata. Não suprimir como o legado fazia (decisão consciente).
- **Toast disparado durante navegação de rota**: persiste através do route change — `<Toaster />` está na root, fora do `<Outlet />`.
- **Toast com `Infinity` duration**: usuário **precisa** ter como fechar. Garantir `closeButton` ou `action` que dispense. Spec recomenda: se `duration === Infinity`, ativar `closeButton` automaticamente (override do default).
- **Atualizar toast em progresso (`id` fixo)**: caso clássico do upload — `toast.loading('Enviando...', { id: 'upload' })`, depois `toast.success('Enviado', { id: 'upload' })`. Mesmo slot, sem flicker.
- **Action button com side-effect longo**: o toast fecha imediatamente ao clicar; o `onClick` é responsável por feedback subsequente (talvez outro toast). Não bloquear o close.
- **Erro de rede recorrente** (5 chamadas falham em sequência): considerar deduplicar por `id` no caller (não no Toaster) para não vomitar 5 toasts iguais. Toaster confia no caller para fazer a decisão de dedup.
- **Toast acionado fora de componente React** (interceptor de fetch, store middleware): usar `toast.error(...)` da API funcional importada de `sonner` — funciona sem hook.
- **Mobile + teclado virtual aberto**: toast no topo evita conflito com teclado no rodapé. Não precisa reposicionar.
- **RTL (futuro)**: sonner suporta — swipe-to-dismiss inverte direção, posição top-right vira top-left. Não bloqueia adoção atual.

## Sources

- [[calendar/notes/2026-05-16.md]] — UX F020 (Notifications) decidida
- [[legacy-contracts/notifications]] — contrato do arqueólogo (N1..N12); divergências formalizadas aqui
