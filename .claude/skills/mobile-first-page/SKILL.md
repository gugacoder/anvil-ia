---
name: mobile-first-page
description: Padrao para conceber e construir paginas mobile-first PWA — desenhar primeiro o conceito mobile (thumb zone, drawer-up, gestos, shortcut bar) e depois expandir para desktop como uma coerencia, nao como uma tela diferente. Use SEMPRE que for criar uma pagina/rota nova, refatorar uma existente, decidir layout responsivo, escolher entre Drawer/Sheet/Popover, posicionar acoes primarias, ou quando o usuario disser "nova pagina", "nova tela", "nova rota", "nova view", "redesenhar X", "deixa isso responsivo", "isso nao funciona no celular", "ajusta o mobile". Tambem use quando estiver implementando rotas dentro de qualquer app frontend do monorepo. Nao confunda com hub-port (porte do legado): esta skill aplica os mesmos principios para *trabalho novo*.
---

# Mobile-First Page — Conceito antes de Layout

Toda pagina deste projeto nasce mobile-first. Nao porque mobile seja prioridade comercial, mas porque o mobile e a *restricao criativa* que forca a clareza: se o conceito da pagina nao fecha no celular, ele nao esta pronto em lugar nenhum.

## Principio inegociavel

> **Nao e "fazer mobile e esticar para desktop". Nao e "fazer desktop e espremer para mobile".**
>
> E: garantir primeiro um conceito que funciona no mobile, depois construir em cima dele a experiencia otimizada para desktop.

Mobile e desktop sao experiencias distintas que compartilham o mesmo modelo de dados e o mesmo proposito — nao a mesma UI esticada. Em mobile, espaco e caro, polegar manda, gestos importam. Em desktop, hover, atalhos de teclado e densidade informacional importam.

## DNA em 4 passos (siga sempre)

Antes de tocar em qualquer arquivo de rota:

1. **Entenda o trabalho do usuario.** Qual a tarefa principal? Quais sao as acoes primarias (1-2), secundarias (ate 4), raras (esconder em menu)? Qual estado precisa virar URL?
2. **Liste dores e atritos.** Onde o usuario se confunde? O que e ruido? O que e essencial?
3. **Desenhe o conceito mobile primeiro.** Onde fica a thumb zone? O que vai pra drawer-up? O que some? O que vira gesto? O mobile e a base — se o conceito nao fecha aqui, nao fecha em lugar nenhum.
4. **Construa o desktop como expansao coerente.** O que era drawer no mobile vira painel/popover/sheet no desktop. O que era 1 acao por tela vira densidade. Mas o conceito e o mesmo — voce nao esta desenhando outra pagina.

Pulou um passo, a pagina esta incompleta.

## Conceito mobile — checklist mental

- **Thumb zone**: a acao primaria fica acessivel ao polegar (bottom area).
- **Uma coisa por vez**: telas mobile fazem uma coisa bem. Se a versao desktop tem 3 colunas, o mobile provavelmente vira 3 telas/abas/drawers.
- **Drawer up (Vaul) para detalhe**: detalhes que no desktop ficam em painel lateral, no mobile sobem como drawer. Veja a skill `vaul`.
- **Shortcut bar**: acoes primarias e navegacao contextual no bottom — nao no header.
- **Gestos**: swipe-to-delete, pull-to-refresh, long-press para menu contextual quando fizerem sentido.
- **Listas virtualizadas** quando longas (`@tanstack/react-virtual`).
- **Skeleton + optimistic UI**: feedback imediato.

Saida desta etapa: um esboco (mental ou em comentario) de como o mobile resolve o trabalho do usuario.

## Expansao para desktop

Com o mobile firme, o desktop vira *expansao*, nao reinvencao:

- O que era drawer-up vira painel lateral (Sheet) ou popover.
- O que era 3 telas vira 3 colunas / split view.
- O que era shortcut bar vira sidebar / command palette / atalhos de teclado.
- Hover states, tooltips em icones (regra do projeto: tooltip em icone sempre).
- Densidade aumenta, mas nao vira DataTable infinita so porque "tem espaco".

A transicao e via `useIsMobile()` (breakpoint 768px) — vive no app shell. Veja a skill `app-shell`.

### Nao estique componentes no desktop

No mobile, botoes e inputs ocupam `w-full` porque a largura da tela e o proprio container da acao — faz sentido. **No desktop nao.** Espichar um botao primario ate as bordas de um painel largo nao "aproveita o espaco", deixa a pagina amadora.

Depois de planejar o mobile, voce ja tem o **conceito de disposicao** dos componentes e do conteudo. No desktop, o trabalho e *planejar o espaco otimizado* — agrupar acoes, alinhar campos em colunas, deixar respiro — nao deixar tudo crescer ate o limite.

Regras praticas:

- **Botoes**: largura intrinseca (pelo conteudo) ou largura fixa coerente com a grade. `w-full` so em mobile via responsive (`w-full md:w-auto`).
- **Inputs e selects**: largura coerente com o dado que recebem. CEP nao tem a mesma largura que endereco. Em form vertical, alinhe por grade (12 cols), nao por `w-full` em tudo.
- **Cards / paineis**: tem largura maxima de conteudo. Em telas muito largas, prefira **mais colunas** ou **mais respiro nas laterais** do que paineis gigantes com pouco conteudo dentro.
- **Toolbars e shortcut bars**: agrupam, nao se espalham. Ações ficam juntas; o espaco vazio fica entre grupos.
- **Modais e dialogs**: largura proporcional ao conteudo (sm/md/lg do shadcn), nunca colando nas bordas.

**Quando esticar e legitimo** (cite o motivo no codigo se nao for obvio):

- Data grid / tabela longa — a tabela cresce ate o container porque colunas precisam do espaco.
- Editor de texto/codigo em tela cheia.
- Canvas / area de trabalho visual (drag-and-drop, whiteboard).
- Barra de progresso ou timeline que representa o range inteiro de algo.
- Container de layout (grid, flex track) — esse e o trabalho dele, nao o conteudo dentro.

Heuristica: se voce esta prestes a por `w-full` sem `md:w-auto` num componente *de acao* (botao, badge, chip, select pequeno), pare. Pense onde ele se ancora no desktop.

## Pilares de implementacao

**DRY rigoroso (skill `ui-dry`)**: antes de criar componente/hook/utilitario, **procure em `packages/ui` (e nos outros packages compartilhados do monorepo)**. Se existe, use. Se quase existe, generalize la. Se nao existe e tem chance de ser usado em mais de uma tela ou em outro app/projeto, **crie em `packages/ui`** — nao no app. Apps consomem via `@workspace/ui`. Componentes em `packages/ui` sao a moeda de troca entre projetos do monorepo: o que voce coloca la hoje serve outro app amanha.

**shadcn/ui v4 (skill `shadcn`)**: fonte de componentes. Use o MCP do shadcn (`mcp__shadcn__*`) para descobrir, ver source, examples e instalar. Componentes shadcn instalados vao para `packages/ui` (style `radix-nova`), nunca para dentro do app.

**Vaul mobile-only (skill `vaul`)**: drawer-up e mobile. Em desktop, use Popover/Sheet/Dialog. Nao estique drawer pra desktop.

**Framer Motion (skill `framer-motion`)**: animacoes sao parte da experiencia mobile (transicoes de pagina, drawers, gestos, micro-feedback). Spring naturais, durations curtas (200-400ms). Anime intencao, nao decoracao.

**App Shell (skill `app-shell`)**: a pagina NUNCA define `max-width` ou `mx-auto`. Largura e controlada pelo shell. Use o `_page-template.tsx` do app como base.

**Estado visivel exige rota**: filtros, abas, drawers abertos, item selecionado — qualquer coisa que o usuario esperaria preservar apos refresh tem que estar na URL.

**Avatar canonico**: avatares (user/bot/agent/customer) renderizam via rota canonica do app de identidade — nao use iniciais como tela final.

**SSE invalida cache (skill `realtime-sse`)**: para qualquer hook que cacheia dados, mapeie quais `SSEEventType` afetam e wire listeners. Nao e detalhe pos-MVP — e parte da pagina. Polling e proibido.

**Semantic colors (skill `semantic-colors`)**: nunca cor direta. Tokens CSS para consistencia claro/escuro.

**Localizacao**: codigo em ingles, UI em pt-br. Consistencia absoluta na traducao de conceitos — uma entidade tem um unico nome em pt-br no produto inteiro.

## RTM (Ready To Market)

Cada pagina deve estar completa: validacao, feedback ao usuario, tratamento de erros, empty states, loading states (skeleton), error states, responsividade real. Se nao couber completo no escopo, **reduza o escopo da feature**, nao a qualidade. Nao deixe lacunas "pra resolver depois".

## Checklist por pagina

Antes de declarar pronta:

- [ ] Entendi o trabalho do usuario (nao so o que a tela mostra).
- [ ] Desenhei o conceito mobile (acoes primarias na thumb zone, drawer-up para detalhes, gestos quando aplicaveis).
- [ ] Desktop e expansao coerente — nao uma pagina diferente.
- [ ] Estado visivel (filtros, drawers, selecoes) esta na URL.
- [ ] Procurei em `packages/ui` antes de criar qualquer componente/hook/util.
- [ ] Componentes novos compartilhaveis foram criados em `packages/ui`, nao no app.
- [ ] Componentes shadcn novos foram adicionados via MCP do shadcn.
- [ ] Vaul so em mobile; desktop usa Popover/Sheet/Dialog.
- [ ] Pagina nao define `max-width` nem `mx-auto`.
- [ ] Tooltips em todos os icones.
- [ ] Avatares via rota canonica.
- [ ] Hooks com cache tem listeners SSE para invalidacao.
- [ ] Cores via tokens semanticos.
- [ ] Loading, error, empty states cobertos.
- [ ] UI em pt-br, codigo em ingles, traducao consistente.
- [ ] Animacoes de transicao/feedback presentes onde fazem sentido.
- [ ] Testei em mobile (DevTools responsive) e desktop.

## Referencias

| Skill / Arquivo | Quando consultar |
|---|---|
| Skill `app-shell` | Estrutura do shell, breakpoint, slots de chrome dedicado |
| Skill `vaul` | Decidir Drawer vs Popover vs Sheet vs Dialog responsivamente |
| Skill `ui-dry` | Antes de criar QUALQUER componente/hook/util |
| Skill `shadcn` | Componentes shadcn — sempre via MCP |
| Skill `semantic-colors` | Aplicar qualquer cor |
| Skill `realtime-sse` | Invalidar cache via SSE |
| Skill `framer-motion` | Animar transicoes e micro-interacoes |
| `conventions/ux/mobile-patterns.md` | Thumb zone, gestos, breakpoints, performance mobile |
| `conventions/ux/GUIDE.md` | Indice de convencoes de UX |

## Anti-padroes

- Desenhar desktop primeiro e adicionar `md:` "pra ficar responsivo".
- Drawer-up Vaul aparecendo em desktop.
- Componente novo direto no app sem checar `packages/ui`.
- Pagina com `max-w-*` ou `mx-auto`.
- Iniciais como avatar final.
- Polling para refresh — sempre SSE.
- Icone sem tooltip.
- Hex/rgb hardcoded — sempre token semantico.
- Declarar pronto sem empty/loading/error states.
- "Faco o desktop primeiro porque e mais facil ver no meu monitor."
- Tratar mobile como "versao reduzida" do desktop.
- Botoes / inputs / selects `w-full` no desktop "pra aproveitar o espaco". Largura intrinseca ou grade — esticar so com justificativa clara (data grid, editor, canvas, timeline).
- Paineis gigantes com pouco conteudo em telas largas em vez de mais colunas / mais respiro.
