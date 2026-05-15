---
title: "Button"
aliases: [button, btn, action-button]
tags: [ui-system, component, primitive, action]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Button

Ação primária da interface. Provoca um efeito (submit, abrir modal, navegar, executar comando). **Botão não é decoração** — todo botão na tela é um verbo que o usuário pode acionar.

Esta spec **deriva diretamente do `Button` do shadcn/ui** (variantes `default`, `secondary`, `outline`, `ghost`, `link`, `destructive`; tamanhos `sm`, `default`, `lg`, `icon`). Documenta apenas o que **diverge** ou **completa** o default, para evitar redundância.

## Quando usar

- Qualquer ação acionável do usuário que produza um efeito imediato (submit, navegar, abrir, fechar, deletar, executar).
- Submit de form (variant `default`, tipo `submit`).
- Ações destrutivas (variant `destructive`, geralmente com confirmação via modal).
- Ações secundárias em forms/dialogs (variant `outline` ou `secondary`).
- Ações terciárias / atalhos discretos (variant `ghost`).
- Texto-ação inline tipo "Saiba mais" (variant `link`).
- Ícone-só em toolbars (size `icon`, sempre com `aria-label` E tooltip).

## Quando NÃO usar

- Para navegar para URL externa que abre nova aba: ainda pode ser button, mas considere `<a>` semântico se for puramente navegação sem efeito colateral.
- Para toggle de estado persistente (claro/escuro, ativo/inativo) sem ação imediata: use `toggle` ou `switch` (não nesta wave).
- Para ações em listas (linha da grid): use `dropdown-action` ou botão `ghost size=sm`.

## Divergências e extensões sobre o shadcn padrão

### Estado `loading` (extensão)

Shadcn não tem loading nativo. **Adicionar como propriedade obrigatória do nosso button.**

- Quando `loading=true`:
  - Botão fica `disabled` (não clicável).
  - Ícone Phosphor `CircleNotch` aparece à esquerda do label, girando em loop linear 800ms.
  - **Label permanece visível** (não substitui por spinner sozinho) — exceto em variant `icon`, onde o spinner substitui o ícone.
  - Cursor: `cursor-wait`.
  - `aria-busy="true"`.

Exemplo de label durante loading no contexto de [[login-page]]: "Entrando..." substitui "Entrar". O componente pode aceitar `loadingLabel` opcional; sem ele, mantém o label original.

### Tamanho `icon` exige tooltip (extensão)

Botões só com ícone sempre carregam tooltip em desktop. Mobile não tem tooltip — confiar em `aria-label` para leitor de tela. Esta é regra do projeto, não shadcn default.

### Ícones via Phosphor apenas

Nenhum ícone fora do conjunto Phosphor. Tamanho default do ícone: `size-4` (16px) em buttons `sm`/`default`, `size-5` (20px) em `lg`, `size-5` em `icon` size `default`. Peso Phosphor padrão do projeto: `regular`; `bold` para ações enfatizadas.

### Largura

- **Default**: largura intrínseca (pelo conteúdo). NUNCA `w-full` por default.
- **`w-full` permitido só com justificativa**:
  - Mobile + form-único-CTA (caso do login): `w-full md:w-auto`? Aqui o login é exceção legitimada — botão "Entrar" acompanha a largura do form (~360px) por coerência visual mesmo em desktop, **não** estica para tela toda.
  - Botões em bottom-sheet/drawer mobile que precisam virar shortcut bar: `w-full` ok.
- Padding horizontal nunca cai abaixo de `px-4` em `default` para garantir presença visual.

### Foco visível obrigatório

`ring-2 ring-ring ring-offset-2 ring-offset-background` no `:focus-visible`. Não usar `outline: none` sem substituto. Validar em ambos os temas.

### Hover comportamental

- Variant `default` (primary): hover escurece levemente (`hover:bg-primary/90`).
- Variant `destructive`: hover escurece (`hover:bg-destructive/90`).
- Variant `ghost`: hover aplica `bg-accent text-accent-foreground`.
- Hover **só em desktop** (`@media (hover: hover)`); em touch, ignorar para evitar "sticky hover".

## API conceitual (resumida — referência completa = shadcn)

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `variant` | `default` \| `secondary` \| `outline` \| `ghost` \| `link` \| `destructive` | `default` | Estilo visual. |
| `size` | `sm` \| `default` \| `lg` \| `icon` | `default` | Altura/padding. `sm=h-8`, `default=h-9` (desktop) ou `h-10` (mobile/form primário), `lg=h-11`, `icon` quadrado. |
| `loading` | booleano | `false` | Ativa estado loading (extensão sobre shadcn). |
| `loadingLabel` | texto | — | Substitui label durante loading se fornecido. |
| `iconLeft` / `iconRight` | nó Phosphor | — | Ícone à esquerda/direita do label. |
| `disabled` | booleano | `false` | Bloqueia interação. |
| `type` | `button` \| `submit` \| `reset` | `button` | Comportamento nativo no contexto de form. |
| `tooltip` | texto | — | Obrigatório quando `size=icon` em desktop. |

## Estados

- **default** — ver shadcn.
- **hover** — só em desktop; ver shadcn por variant.
- **focus** — `ring-2 ring-ring ring-offset-2`.
- **active** (pressed) — leve `scale-[0.98]` por 80ms (motion, opcional; respeita reduced-motion).
- **disabled** — `opacity-50`, `cursor-not-allowed`, `pointer-events-none`.
- **loading** — ver acima.
- **destructive estados** — variantes mantêm a mesma lógica de estados, apenas com tokens `destructive*`.

## Motion

- **press (active)**: `scale-[0.98]` por 80ms, easing `ease-out`. Opt-in via variant; default ativado.
- **hover**: transição de `bg-color` em 150ms (`fast`).
- **focus ring**: aparece em 100ms.
- **loading spinner**: rotação linear 800ms loop.
- **`prefers-reduced-motion`**: desativar `scale` no press; transições de cor caem para 50ms.

## Responsivo

- **mobile**: `h-10` para botões primários de form (acompanha [[form-field]]); área de toque mínima 44px. `size=icon` ainda quadrado 40×40, expandido para 44×44 via padding ao redor quando possível.
- **tablet/desktop**: `h-9` default; `h-10` em forms primários para alinhar com inputs; `h-11` para CTAs grandes em landing/marketing (não nesta wave).
- **Buttons em sequência** (ex: Cancelar + Salvar): empilhados verticalmente em mobile (`flex-col gap-2`), inline horizontal em desktop (`md:flex-row md:justify-end`).

## Acessibilidade

- `<button>` real, nunca `<div role="button">`.
- `aria-label` quando label visual ausente (size=icon).
- `aria-busy="true"` durante loading.
- `aria-disabled` redundante com `disabled` atributo; preferir `disabled` nativo.
- Foco visível em qualquer variant.
- Enter e Space disparam o handler em estado focado.
- Em form, `type="submit"` por default só quando explicitamente é o submit principal. Demais buttons em form: `type="button"`.
- Tooltip em ícone-só: implementado via componente tooltip-on-hover (skill `shadcn` → tooltip); em mobile, tooltip não aparece e `aria-label` carrega a semântica.

## Composição

- **Compõe**: ícones Phosphor.
- **É composto por**: [[login-page]], [[form-field]] (no suffix interativo), futuras toolbars, modais, drawers — praticamente toda página do Studio.

## Cores e tokens

- `bg-primary`, `text-primary-foreground` — variant `default`.
- `bg-secondary`, `text-secondary-foreground` — variant `secondary`.
- `border-input`, `bg-background`, `text-foreground` — variant `outline`.
- `text-foreground`, `hover:bg-accent`, `hover:text-accent-foreground` — variant `ghost`.
- `text-primary`, `underline-offset-4 hover:underline` — variant `link`.
- `bg-destructive`, `text-destructive-foreground` — variant `destructive`.
- `ring`, `ring-offset-background` — focus.

Nunca cor direta. [[semantic-colors]].

## Edge cases

- **Click duplo / spam**: durante `loading=true`, cliques são ignorados. Para ações não-async que ainda precisam de proteção, usar debounce no handler.
- **Submit dentro de form sem `onClick`**: comportamento padrão dispara submit; ok.
- **Button em link**: para casos onde semanticamente é navegação, usar componente separado `link-button` (não nesta wave) ou `<a>` estilizado como button via `buttonVariants()` do shadcn.
- **Variant `link` em mobile**: área de toque pode ser pequena demais; aumentar padding vertical (`py-2` mínimo).

## Sources

- [[calendar/notes/2026-05-15.md]] — formalização do design system para F003
