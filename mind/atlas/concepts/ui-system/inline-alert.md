---
title: "Inline Alert"
aliases: [inline-alert, alert-banner, form-alert]
tags: [ui-system, component, feedback, alert]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Inline Alert

Mensagem de feedback **fixa no fluxo da página** (não flutuante, não toast). Usada para comunicar um estado relevante ao bloco onde está inserida — tipicamente erro de submit, aviso contextual, ou confirmação não-transitória. Sempre apareceu por uma causa identificável e some quando a causa desaparece (usuário corrige, recarrega, descarta).

A diferença essencial para `toast`: **inline-alert vive no documento**, ocupa espaço, é relido por leitores de tela como parte do contexto. Toast é transitório e sai do fluxo.

## Quando usar

- Erro de autenticação no [[login-page]] ("Usuário ou senha inválidos").
- Erro de validação de form que não cabe em um único campo (ex: "Os dois campos de senha não coincidem").
- Aviso contextual num bloco ("Atenção: este cadastro está bloqueado para edição").
- Informação importante associada a uma seção ("Esta operação não pode ser desfeita").

## Quando NÃO usar

- Para erro vinculado a **um** campo específico → usar o `error` do [[form-field]].
- Para sucesso transitório ("Salvo com sucesso") → usar `toast` (não nesta wave).
- Para diálogo de confirmação destrutiva → usar `confirm-dialog` (não nesta wave).
- Para erro fatal de aplicação (rota quebrada, exceção não tratada) → usar `error-boundary-state` (não nesta wave).

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `variant` | `info` \| `success` \| `warning` \| `error` \| `critical` | `info` | Mapeia para tokens semânticos da [[semantic-palette]]. |
| `title` | texto curto | — | Linha 1, peso 600. Opcional; quando ausente, `description` vira a linha principal. |
| `description` | texto / nó | — | Linha 2, peso 400. Conteúdo principal da mensagem. |
| `icon` | nó Phosphor / `false` | auto | Ícone à esquerda. Auto-resolve por variant (ver mapping). `false` desliga. |
| `dismissible` | booleano | `false` | Quando `true`, renderiza botão `X` no canto superior direito. Default `false` porque o alert costuma sumir por correção do estado, não por dismiss manual. |
| `actions` | array de buttons | — | Até 2 botões à direita (desktop) ou abaixo (mobile). Use variants `ghost` ou `link` para não competir com o conteúdo. |
| `role` | `alert` \| `status` | `alert` para `error`/`critical`; `status` para o resto | Override a11y. |

### Mapping de ícones por variant

| Variant | Ícone Phosphor default |
|---|---|
| `info` | `Info` |
| `success` | `CheckCircle` |
| `warning` | `Warning` |
| `error` | `XCircle` |
| `critical` | `WarningOctagon` |

## Estrutura visual

```
┌───────────────────────────────────────────┐
│ [icon]  Title (opcional)             [X?] │
│         Description ............          │
│         [action1] [action2]               │
└───────────────────────────────────────────┘
```

- Padding interno: `p-3` mobile, `p-4` desktop.
- Border-radius: `rounded-md` (consistente com cards e inputs).
- Borda: `border-l-4` na cor da variant + `border-y border-r` em cor neutra (`border-border`). O destaque à esquerda comunica severidade sem dominar a tela.
- Background: cor da variant com opacidade `/10` (sutil). Ex: `bg-x-error/10`.
- Texto: `text-x-{variant}-foreground` quando sobre fundo da variant ainda contrasta; quando background é translúcido, usar `text-foreground` e deixar a cor da variant apenas no ícone e na borda esquerda — **regra**: contraste sempre AA mínimo; preferir `text-foreground` para o corpo e cor de variant para ícone/borda.

## Estados

- **default** — render normal.
- **hover** — sem mudança (alert não é interativo; ações internas têm seus próprios estados).
- **focus** — alert em si não recebe foco; ações dentro sim.
- **active** — N/A.
- **disabled** — N/A.
- **loading** — N/A (alert não tem loading; o que carrega é o que o cerca).
- **error** — N/A (o alert *é* o erro).
- **empty** — N/A (sem `description` nem `title`, não renderiza).
- **dismissing** — animação de saída (ver Motion).

## Motion

- **Entrada**: slide-down 4px + fade-in `normal` 250ms, easing `ease-out`. A altura do alert é animada (auto-height) durante a entrada para não dar "salto" no layout pai.
- **Saída** (dismiss ou estado corrige): fade-out + slide-up 4px `fast` 150ms, depois altura colapsa em 100ms.
- **Troca de variant em runtime** (ex: warning → error): cross-fade da cor de fundo/borda em 200ms; ícone faz cross-fade.
- **`prefers-reduced-motion`**: entrada/saída viram fade simples 100ms, sem slide nem animação de altura.

## Responsivo

- **mobile (< 640px)**: `p-3`, `text-sm` (14px) para description, `text-sm font-semibold` para title. Ícone `size-4` (16px). Actions: empilhadas verticalmente abaixo do texto (`flex-col gap-2 mt-2`). Botão dismiss `X` no canto superior direito, área de toque 32×32.
- **tablet (640–1024px)**: `p-4`, `text-sm`. Actions inline à direita do texto quando cabem; senão abaixo.
- **desktop (> 1024px)**: `p-4`, ícone `size-5` (20px). Actions inline à direita.
- **largura**: o alert ocupa 100% do container onde está inserido — ele é parte do fluxo do bloco pai, não tem largura própria. Em [[login-page]], ocupa a largura do form (~360px).

## Acessibilidade

- `role="alert"` (default para `error`/`critical`) — interrompe leitor de tela imediatamente. Use **com parcimônia**: alerts que aparecem em resposta direta a uma ação do usuário (submit) são apropriados; alerts pré-existentes ao mount da página devem usar `role="status"`.
- `role="status"` (default para `info`/`success`/`warning`) — `aria-live="polite"`; lido quando leitor estiver ocioso.
- `aria-atomic="true"` — leitor lê o alert inteiro ao mudar.
- Botão dismiss: `<button type="button" aria-label="Fechar aviso">` com ícone `X`.
- Ações dentro do alert seguem regras de [[button]].
- Contraste do texto sobre o fundo translúcido validado em ambos os temas.
- Não usar **apenas cor** para comunicar severidade — o ícone faz parte da semântica.

## Composição

- **Compõe**: ícones Phosphor; opcionalmente [[button]] em `actions`.
- **É composto por**: [[login-page]], futuros forms (cadastros), páginas de configuração.

## Cores e tokens

Por variant:

| Variant | Background | Border-left | Icon color | Text |
|---|---|---|---|---|
| `info` | `bg-x-info/10` | `border-l-x-info` | `text-x-info` | `text-foreground` (title `font-semibold`) |
| `success` | `bg-x-success/10` | `border-l-x-success` | `text-x-success` | `text-foreground` |
| `warning` | `bg-x-warning/10` | `border-l-x-warning` | `text-x-warning` | `text-foreground` |
| `error` | `bg-x-error/10` | `border-l-x-error` | `text-x-error` | `text-foreground` |
| `critical` | `bg-x-critical/10` | `border-l-x-critical` | `text-x-critical` | `text-foreground` |

Borda restante (top/right/bottom): `border-border` em todas as variantes.

[[semantic-colors]] — nunca cor direta.

## Edge cases

- **Description muito longa**: alert cresce verticalmente; sem truncar. Se for realmente longo (> 4 linhas em mobile), considerar reformular a mensagem ou usar modal.
- **Múltiplos alerts num mesmo form**: empilhar com `gap-2`. Em geral, evitar — preferir resumir em um único alert.
- **HTML/markdown em description**: aceitar nó React para permitir formatação leve (links, ênfase). Não permitir HTML cru.
- **Alert dentro de drawer/modal mobile**: padding interno respeita o container pai; não inventa margem externa.

## Sources

- [[calendar/notes/2026-05-15.md]] — formalização do design system para F003
