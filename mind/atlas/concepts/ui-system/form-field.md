---
title: "Form Field"
aliases: [form-field, field, input-field]
tags: [ui-system, component, form, primitive]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Form Field

Bloco atômico de um formulário: **label + controle + (hint | error)**. É a unidade mínima reusada em toda página de formulário do Studio — login, setup wizard, cadastros do AppBuilder, filtros expandidos, etc. Encapsula a relação label/controle (`for`/`id`), o estado de erro, o hint contextual, e a acessibilidade de cada campo.

A regra é: **nenhum input do Studio aparece "solto"**. Mesmo um campo sem label visível usa `form-field` com label sr-only.

## Quando usar

- Qualquer campo de formulário em página, modal, drawer, filtro.
- Como bloco-base para variantes derivadas (form-field-text, form-field-password, form-field-select, form-field-date, ...). Esta spec descreve a forma genérica; variantes específicas (date, select, power-select) serão specs próprias quando chegarem.

## Quando NÃO usar

- Para inputs de busca em headers/toolbars que não fazem parte de um form — use componente `search-input` separado (não nesta wave).
- Para toggle/switch isolado que age como configuração imediata — esses são `toggle-control` (não nesta wave).

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `label` | texto | — (obrigatório) | Rótulo visível acima do controle. |
| `labelHidden` | booleano | `false` | Quando `true`, label vira sr-only. Acessibilidade preservada. |
| `controlType` | enum: `text`, `email`, `password`, `number`, `tel`, `url`, `search`, `textarea` | `text` | Tipo do controle nativo subjacente. |
| `value` | texto / número | — | Valor controlado. |
| `placeholder` | texto | vazio | Placeholder discreto, **não substitui label**. |
| `hint` | texto | — | Texto auxiliar abaixo do controle (variante `muted`). |
| `error` | texto / boolean | — | Mensagem de erro. Quando presente, suprime `hint` e aplica estado error. |
| `required` | booleano | `false` | Marca campo obrigatório; renderiza `*` discreto ao lado do label. |
| `disabled` | booleano | `false` | Bloqueia interação e aplica estado disabled. |
| `readOnly` | booleano | `false` | Mostra valor sem permitir edição; visual menos atenuado que disabled. |
| `autoComplete` | token nativo | — | Repassado ao input para gerenciadores de senha/contato. |
| `inputMode` | token nativo | — | Hint de teclado virtual em mobile (`numeric`, `decimal`, `email`, ...). |
| `prefix` | nó/ícone | — | Ícone ou texto curto à esquerda dentro do controle (ex: `@` para email). |
| `suffix` | nó/ícone | — | Ícone ou ação à direita (ex: toggle de visibilidade de senha, unidade). |
| `id` | string | gerado | Usado em `for`/`id`. Se omitido, gerado automaticamente e estável. |

## Estados

- **default** — borda `border-input`, fundo `bg-background`. Texto `text-foreground`. Placeholder `text-muted-foreground`.
- **hover** — borda levemente reforçada (`border-input` → `border-ring/40`). Apenas em desktop (`@media (hover: hover)`).
- **focus** — anel de foco visível: `ring-2 ring-ring`, borda assume `border-ring`. Transição `fast` 150ms.
- **active** (durante digitação) — idêntico a focus.
- **disabled** — `opacity-50`, `cursor-not-allowed`, sem pointer events. Label e hint também atenuados.
- **readOnly** — borda `border-input/60`, fundo `bg-muted/30`. Sem ring de foco mesmo quando focado (pouco contraste; sinaliza não-edição).
- **error** — borda `border-x-error`, ring de foco `ring-x-error/40`. Mensagem de erro em `text-x-error` 12px abaixo. Substitui hint.
- **loading** (variantes async, ex: select com busca) — spinner Phosphor `CircleNotch` no suffix. Não nesta wave; reservado.
- **success** (validação ok visível) — não default. Só usar quando faz sentido (ex: campo com validação assíncrona tipo "CEP válido"). Borda `border-x-success/60`, ícone `CheckCircle` no suffix. Opt-in.
- **empty** — N/A (estado vazio = default sem valor).

## Estrutura visual (top → bottom)

```
[ label ]   [ *required-marker ]
[ ┌──────────────────────────────────┐ ]
[ │ [prefix]  control text  [suffix] │ ]
[ └──────────────────────────────────┘ ]
[ hint OR error message              ]
```

- Espaçamento label↔controle: `mt-1.5` (6px).
- Espaçamento controle↔hint/error: `mt-1` (4px).
- Altura do controle: `h-10` (40px) mobile, `h-9` (36px) desktop quando inserido em form denso (ex: filtros avançados). Login usa sempre `h-10`.
- Textarea: altura mínima `min-h-24` (96px), resize vertical.

## Motion

- **focus ring**: fade-in 150ms (`fast`), easing `ease-out`. Borda muda de cor sincronizada.
- **error aparece**: a mensagem desliza 2px para baixo + fade-in 150ms (`fast`). A borda transita cor em 150ms.
- **error some**: fade-out 100ms simples.
- **prefix/suffix swap** (ex: troca de ícone Eye → EyeSlash): cross-fade 100ms.
- **readOnly ↔ editable** (raro, casos de "destravar para edição"): transição de fundo 200ms.
- **`prefers-reduced-motion`**: todas as transições caem para mudança instantânea exceto focus ring (mantém 100ms).

## Responsivo

- **mobile (< 640px)**: altura `h-10`, texto `text-base` (16px) — **16px é mínimo para evitar zoom automático do iOS Safari**. Padding interno generoso (`px-3`). Suffix com área de toque ≥ 44×44px (importante para toggle de senha).
- **tablet (640–1024px)**: mesmo `h-10`, texto `text-sm` (14px) permitido. Padding `px-3`.
- **desktop (> 1024px)**: `h-9` permitido em forms densos; `h-10` em forms primários (login, cadastros). Texto `text-sm`. Suffix pode ser menor (área de clique ≥ 32×32px).
- **thumb zone / gestos**: campo de senha em mobile expõe toggle de visibilidade no suffix; toque grande (44px). Long-press não tem semântica aqui (deixa para o gerenciador de senha nativo).

## Acessibilidade

- `<label for>` ↔ `<input id>` sempre vinculados, mesmo quando `labelHidden`.
- `aria-required="true"` quando `required`.
- `aria-invalid="true"` quando `error`.
- `aria-describedby` aponta para o `id` do hint OU do error (o que estiver visível).
- Mensagem de erro tem `role="alert"` apenas quando aparece como resposta a submit; durante digitação validada, é `aria-live="polite"` no container do hint/error.
- Navegação por teclado: Tab entra no controle; Shift+Tab sai. Enter dispara submit do form pai (não consumido pelo field).
- Suffix interativo (toggle de senha) é botão real (`<button type="button">`) com `aria-label` próprio, navegável por Tab após o input.
- Leitor de tela anuncia: label → valor (ou placeholder se vazio) → estado required → erro/hint.
- Contraste mínimo: label e valor em `text-foreground` (≥ 7:1 em WCAG AAA). Hint em `text-muted-foreground` ≥ 4.5:1. Erro em `text-x-error` ≥ 4.5:1 (validar em ambos os temas).

## Composição

- **Compõe**: nativo `<input>` / `<textarea>`; ícones Phosphor (no prefix/suffix); botão (no suffix interativo); [[inline-alert]] não compõe — error inline é parte do field, alert é nível superior.
- **É composto por**: [[login-page]], futuros forms (setup wizard, cadastros), filtros, modais.
- **Variantes derivadas (futuras specs)**: `form-field-select`, `form-field-date`, `form-field-power-select`, `form-field-file`, `form-field-checkbox-group`, `form-field-radio-group`.

## Cores e tokens

- `text-foreground` — label, valor.
- `text-muted-foreground` — placeholder, hint.
- `bg-background` — fundo do controle.
- `border-input` — borda default.
- `ring`, `border-ring` — focus.
- `bg-muted/30`, `border-input/60` — readOnly.
- `text-x-error`, `border-x-error`, `ring-x-error/40` — error.
- `text-x-warning` — hint contextual de warning (ex: "Caps Lock ativado" no login).
- `text-x-success`, `border-x-success/60` — success opt-in.

## Edge cases

- **Senha + toggle de visibilidade**: toggle muda `controlType` entre `password` e `text` localmente; valor preservado. Não persiste preferência entre campos diferentes.
- **Autofill de gerenciador**: respeitar estilos nativos quando possível; aplicar override mínimo para manter contraste no tema dark (em alguns browsers o autofill força fundo amarelo).
- **Number input com `inputMode="decimal"`** em mobile: usar `inputMode` correto; o type `number` nativo é problemático — preferir `text` + `inputMode` + validação.
- **Textarea growing**: opcional auto-resize (`field-sizing: content` CSS quando disponível, fallback fixo). Não default.
- **Campo vazio submetido com `required`**: error é `"Campo obrigatório"` em pt-br por default; pode ser sobrescrito.

## Sources

- [[calendar/notes/2026-05-15.md]] — formalização do design system para F003
