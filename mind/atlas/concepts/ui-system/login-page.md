---
title: "Login Page"
aliases: [login-page, login-screen, auth-page]
tags: [ui-system, page-spec, auth, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Login Page

Página única de entrada do Director.Studio. Endereça os **cinco caminhos de autenticação** do ecossistema Processa ([[processa-auth-paths]]) atrás de **um único formulário**, sem expor ao usuário a complexidade do roteamento. O usuário digita identidade + senha; o backend decide se vira LDAP-bridge, fornecedor AWS, usuário interno, senha temporária ou JWT direto.

A premissa de design é **invisibilizar os 5 caminhos**. O usuário não escolhe "qual login" — ele só preenche, e a forma do `login` (com `\`, com `@`, literal `processa`, ou simples) decide a rota no backend. A página comunica isso por **hints contextuais discretos**, nunca por toggle ou tab.

## Quando usar

- Rota raiz `/login` quando não há sessão válida.
- Acionada pelo boot-gate (F002) quando `/api/setup/status` está OK mas não há cookie de sessão.

## Quando NÃO usar

- Não é wizard de setup (F001) — wizard é primeira execução do servidor.
- Não é re-auth no meio de uma sessão — re-auth é modal/sheet sobre a app, não navegação para `/login`.

## Conceito mobile-first

O conceito ([[mobile-first-page]]):

1. **Trabalho do usuário**: entrar no sistema com credenciais conhecidas. Não pensa em "qual caminho".
2. **Ações primárias**: 1 — botão *Entrar*. Ação secundária: 1 — link *Não consigo entrar* (futuro, fora desta wave; reservar slot).
3. **Estado em URL**: `?next=/path` preservado para redirecionar após sucesso. Não há outros estados em URL nesta página.
4. **Mobile**: viewport único, scroll vertical mínimo, foco automático no campo de identidade. Logo no topo, formulário central, botão na thumb zone (parte inferior do bloco do formulário, não no rodapé da tela).
5. **Desktop**: o mesmo formulário centralizado horizontal e verticalmente, com largura intrínseca (`max-w-sm` aproximado, ~360px). **Não estica** os inputs nem o botão para a largura da tela. O respiro lateral é o desktop "aproveitando o espaço".

## API conceitual

A página em si não recebe props — é uma rota. As propriedades semânticas que ela expõe ao backend:

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `identity` | texto livre | — | Encaminhado como parte do Basic `login`. Pode conter `\`, `@`, ou ser literal `processa`. |
| `password` | secret | — | Senha em claro só no momento do POST; nunca persistida client-side. |
| `domain` | texto opcional, oculto por default | — | Quando preenchido, prefixa `identity` com `domain|` ao montar o token Basic. Veja seção "Domínio opcional". |
| `next` | URL relativa (vem do query string) | `/app` | Para onde navegar após sucesso. |

## Layout

### Estrutura semântica (top → bottom)

1. **Brand block**: wordmark "Director.Studio" + tagline curta. Tipografia 600/24px mobile, 600/28px desktop. Margem inferior generosa (`mb-8`).
2. **Form block** (`<form>`):
   - `form-field` — Identidade (label: "Usuário ou e-mail")
   - `form-field` — Senha (label: "Senha", type=password com toggle de visibilidade)
   - `form-field` — Domínio (label: "Domínio", **collapsed por default**; revelado por toggle "Outro domínio" ou quando o `identity` contém `\`)
   - `inline-alert` — erro de autenticação (slot reservado; só renderiza em estado `error`)
   - `button` primário — "Entrar" (loading state com spinner)
3. **Secondary block**: link discreto "Não consigo entrar" (slot reservado; placeholder até feature de recuperação existir).

### Sem `max-width` na página

A página NÃO define `max-w-*` nem `mx-auto` ela mesma. O app-shell (ou um layout neutro de auth) centraliza. O bloco do formulário tem largura intrínseca via `max-w-sm` aplicado ao **container do form**, não à página.

## Os 5 caminhos — UX

Como cada caminho do [[processa-auth-paths]] se manifesta na mesma tela:

| Caminho backend | O que o usuário digita | Hint visual |
|---|---|---|
| LDAP-bridge (`processa\user`) | `processa\joao` em Identidade, senha AD | Quando detecta `\` no identity, mostra hint `text-x-muted` abaixo do campo: "Autenticação via diretório corporativo". |
| LDAP-bridge com Domínio explícito | `joao` + senha + Domínio=`processa` | Toggle "Outro domínio" revela campo. Hint: "Será autenticado em {domínio}". |
| Fornecedor AWS (email) | `fornecedor@empresa.com` + senha | Hint quando detecta `@`: "Acesso de fornecedor". |
| Senha temporária | `processa` literal + token temporário | Sem hint visual — caminho operacional, não exposto. Funciona silenciosamente. |
| Usuário interno (DB local) | qualquer outro string + senha | Hint padrão: nenhum. É o default. |

Hints são **discretos** (`text-x-muted`, 12px, abaixo do campo) e **reagem em tempo real** ao input. Não bloqueiam nem validam — apenas informam o usuário de qual via será usada. Se errado, o erro vem do backend e cai no `inline-alert`.

## Estados

- **idle** — formulário vazio ou parcialmente preenchido; botão "Entrar" habilitado quando `identity` e `password` têm conteúdo.
- **submitting** — usuário clicou "Entrar". Botão em loading, campos `disabled`, `inline-alert` escondido. POST `/api/auth` em andamento.
- **success** — receber `{ sucesso: true, dados: { token } }`. Cookie httpOnly setado pelo backend (F004); página dispara navegação para `next` ou `/app`. Visualmente: botão volta de loading para "Entrando..." por ~150ms antes do redirect.
- **error-credentials** — backend retornou 401 ou `{ sucesso: false }`. `inline-alert` aparece com mensagem genérica: "Usuário ou senha inválidos." Foco volta ao campo de identidade. Campos mantêm valores (exceto senha, que é limpa).
- **error-network** — fetch falhou (offline, timeout). `inline-alert` variante `warning`: "Não foi possível alcançar o servidor. Tente novamente."
- **error-server** — 5xx. `inline-alert` variante `error`: "Erro no servidor. Tente novamente em instantes."
- **error-locked** — backend sinaliza usuário bloqueado / inativo. `inline-alert` variante `error` com mensagem específica do backend quando segura para exibir.
- **rate-limited** — backend 429. `inline-alert` variante `warning`: "Muitas tentativas. Aguarde um instante antes de tentar de novo."

Estado **error-*** é sempre transitório: ao usuário tocar em qualquer campo, o `inline-alert` faz fade-out e volta a `idle`.

## Motion

- **Entrada da página**: fade-in do brand block (duração `normal` 250ms, easing `ease-out`), seguido por slide-up curto (8px) + fade-in do form block com delay de 80ms. Comunica hierarquia, não decora.
- **Hint contextual** (LDAP/fornecedor): fade-in `fast` 150ms ao detectar padrão; fade-out `fast` ao deixar de combinar.
- **Toggle "Outro domínio"**: altura animada (auto-height) do campo Domínio em `normal` 250ms.
- **`inline-alert` aparece**: slide-down 4px + fade-in `normal` 250ms. Some com fade-out `fast` 150ms.
- **Botão loading**: spinner gira em loop linear 800ms; ícone substitui o label, label não some — vira "Entrando...".
- **Sucesso → redirect**: nenhuma animação de saída na página. O shell que recebe faz a transição.
- **Respeitar `prefers-reduced-motion`**: todas as animações de entrada caem para fade simples 100ms.

## Responsivo

- **mobile (< 640px)**: form-field empilhado, full-width do container do form. Container do form tem padding lateral `px-6`. Brand block centralizado. Botão "Entrar" full-width do form. Teclado virtual: `inputMode` apropriado em cada campo (`text` em identity, `password` em senha). `autocomplete` correto (`username`, `current-password`) para integração com gerenciadores de senha.
- **tablet (640–1024px)**: mesma estrutura, container do form com `max-w-sm` centralizado vertical/horizontal. Botão deixa de ser full-width quando viewport > 640px? **Não** — neste caso específico, o botão acompanha a largura do form porque é a única ação primária da tela e a coerência visual ganha. Exceção legitimada por estar inserido num form de coluna única.
- **desktop (> 1024px)**: idêntico ao tablet em termos de largura do form. O respiro lateral aumenta naturalmente. Possibilidade futura: split view com ilustração à esquerda + form à direita (não nesta wave; deixar slot mental).
- **gestos / thumb zone**: nada de especial — é um form linear. A thumb zone está coberta porque o botão fica no final do form, naturalmente próximo ao polegar em mobile.

## Acessibilidade

- `<form>` com `aria-label="Entrar no Director.Studio"`.
- Cada `form-field` segue suas regras de a11y (ver [[form-field]]).
- `inline-alert` com `role="alert"` e `aria-live="polite"` para anunciar erros sem roubar foco.
- **Foco inicial**: campo de Identidade recebe foco no mount, exceto se vazio + usuário com `prefers-reduced-motion` (evita salto). Em mobile, foco automático só dispara teclado se o usuário não tiver navegado para a página via link externo — heurística para evitar abrir teclado virtual indesejado.
- **Ordem de tabulação**: identity → password → toggle visibilidade da senha → toggle "Outro domínio" → domain (se visível) → Entrar → "Não consigo entrar".
- **Enter dispara submit** quando foco está em qualquer campo do form.
- Contraste mínimo WCAG AA em todos os textos, inclusive hints.
- Toggle de visibilidade da senha tem `aria-label` dinâmico ("Mostrar senha" / "Ocultar senha") e ícone Phosphor (`Eye` / `EyeSlash`).

## Composição

- **Compõe**: [[form-field]], [[button]], [[inline-alert]]
- **É composto por**: nenhum componente — é uma página/rota.
- **Ícones (Phosphor)**: `Eye`, `EyeSlash` no toggle de senha; `CaretDown` opcional no toggle de domínio.

## Cores e tokens

Tokens semânticos usados:

- `bg-background` — fundo da página.
- `text-foreground` — labels, valores digitados, wordmark.
- `text-muted-foreground` — tagline, hints contextuais.
- `bg-card`, `border-border` — caso o form seja envolvido em card sutil (decisão de smith; default é sem card, direto sobre `bg-background`).
- `bg-primary`, `text-primary-foreground` — botão "Entrar".
- `ring` — focus ring em campos e botão.
- `text-x-error`, `bg-x-error/10`, `border-x-error` — `inline-alert` variante error.
- `text-x-warning`, `bg-x-warning/10` — variante warning.
- `text-x-info`, `bg-x-info/10` — variante info (não usado por default, mas reservado).

Nunca cor direta. Veja [[semantic-colors]].

## Segurança (não-UX, mas restrições que afetam o componente)

- Senha **nunca** vai para `localStorage` nem `sessionStorage`. Vive apenas no estado do componente até o POST.
- Domínio + identity são concatenados com `|` apenas no momento de montar o header `Authorization: Basic <btoa(...)>` — não antes. O campo na UI permanece separado.
- `autocomplete="current-password"` permitido para gerenciadores; `autocomplete="off"` no campo de domínio para evitar lixo.
- Após erro, campo de senha é zerado; identity preservado.
- CSRF token (se aplicável ao endpoint `/api/auth`) é responsabilidade do contrato de F004 (sessão), não desta página.

## Edge cases

- **Identity com espaços nas pontas**: trim no submit, não no input.
- **Caps Lock ligado** durante digitação da senha: hint discreto abaixo do campo senha em `text-x-warning`: "Caps Lock ativado". Detecta via `KeyboardEvent.getModifierState("CapsLock")`.
- **Cookie já válido** ao abrir `/login` (usuário voltou pelo histórico): boot-gate redireciona antes da página montar; defesa em profundidade redireciona via `useEffect` se chegou aqui.
- **Domínio digitado em identity** (`processa\joao`) + Domain field preenchido: usar Domain field como prefixo final (mais explícito); ignorar o `\` no identity sem reescrever o que o usuário digitou — backend resolve. Hint avisa: "Domínio será {domain}".

## Sources

- [[calendar/notes/2026-05-15.md]] — definição da feature F003 e dos 5 caminhos
- [[processa-auth-paths]] — contrato dos 5 caminhos de autenticação
