---
name: hub-port
description: Portar páginas do app legado /hub para o novo /hub repensando-as mobile-first PWA. Use SEMPRE que o usuário pedir para "portar página X do hub", "trazer X para hub", "migrar tela X", "revisar a página X no hub", ou quando estiver implementando/refatorando qualquer rota dentro de apps/hub/src/routes/. Não é só copiar — é redesenhar o conceito primeiro para mobile e então construir o desktop em cima.
---

# Hub Port — Mobile-First Re-imagining

Estamos portando páginas de `apps/hub` (legado) para `apps/hub` (novo PWA). O hub antigo desobedeceu a ordem de ser mobile-first. Esta porta é a oportunidade de **repensar cada página do zero**, começando pelo mobile.

## Princípio inegociável

> **Não é "fazer mobile e esticar para desktop". Não é "fazer desktop e espremer para mobile".**
>
> É: **garantir primeiro um conceito que funciona no mobile**, depois construir em cima dele a experiência otimizada para desktop.

Mobile e desktop são experiências distintas que compartilham o mesmo modelo de dados e o mesmo propósito — não a mesma UI esticada. Em mobile, espaço é caro, polegar manda, e gestos importam. Em desktop, hover, atalhos de teclado e densidade informacional importam.

## DNA do porte em 4 passos (canônico — siga sempre)

Toda vez que portar uma página, antes de tocar em qualquer arquivo de `apps/hub/`:

1. **Estude o legado.** Abra `apps/hub/src/routes/...` correspondente. Leia o componente, os hooks que ele consome, os endpoints, e o que ele *resolve* (não o que ele *mostra*).
2. **Reflita sobre dores e trabalho do usuário.** Liste em 3-5 bullets: qual a tarefa principal, quais ações são primárias/secundárias/raras, onde o usuário se confunde no legado, qual estado precisa virar URL.
3. **Desenhe o conceito mobile primeiro.** Defina onde fica a thumb zone, o que vai pra drawer-up, o que some, o que vira gesto. O mobile é a base — se o conceito não fecha em mobile, não fecha em lugar nenhum.
4. **Construa o desktop como expansão coerente.** Não estica: o que era drawer no mobile vira painel/popover/sheet no desktop, o que era 1 ação por tela vira densidade informacional. Mas o conceito é o mesmo.

Esses 4 passos são parte do contrato — pulou um, o porte está incompleto.

## Processo de porte (siga em ordem)

### 1. Entenda o propósito da página legada

Antes de tocar em código:

- Abra `apps/hub/src/routes/<area>/...` e leia o que a página faz hoje.
- Identifique: **qual é o trabalho do usuário nesta página?** (não "o que ela mostra", mas "o que ela permite resolver").
- Liste as ações primárias (1-2), secundárias (até 4) e raras (esconder em menu).
- Identifique o estado visível que precisa de URL (filtros, abas, drawers abertos, item selecionado). Princípio do projeto: **estado visível exige rota**.

### 2. Desenhe o conceito mobile primeiro

Pense no mobile como restrição criativa, não como degradação:

- **Thumb zone**: a ação primária fica acessível ao polegar (bottom area). Veja `conventions/ux/mobile-patterns.md`.
- **Uma coisa por vez**: telas mobile fazem uma coisa bem. Se a tela legada tem 3 colunas, o mobile provavelmente vira 3 telas/abas/drawers.
- **Drawer up (Vaul) para detalhe**: detalhes que no desktop ficam em painel lateral, no mobile sobem como drawer. Veja a skill `vaul`.
- **Shortcut bar**: ações primárias e navegação contextual no bottom — não no header.
- **Gestos**: swipe-to-delete, pull-to-refresh, long-press para menu contextual quando fizerem sentido.
- **Listas virtualizadas** quando longas (`@tanstack/react-virtual`).
- **Skeleton + optimistic UI**: feedback imediato.

Saída desta etapa: um esboço (mental ou em comentário) de como o mobile resolve o trabalho do usuário.

### 3. Construa o desktop em cima

Com o mobile firme, o desktop vira uma **expansão**, não uma reinvenção:

- O que era drawer-up vira painel lateral (Sheet) ou popover.
- O que era 3 telas vira 3 colunas / split view.
- O que era shortcut bar vira sidebar / command palette / atalhos de teclado.
- Hover states, tooltips em ícones (regra do projeto: **tooltip em ícone** sempre — o ícone não é intuitivo para o usuário leigo).
- Densidade aumenta, mas não vira lista de DataTable infinita só porque "tem espaço".

A transição é via `useIsMobile()` (breakpoint 768px) — já existe no app shell. Veja a skill `app-shell`.

### 4. Implemente respeitando os pilares

**DRY rigoroso (skill `ui-dry`)**: antes de criar componente/hook/utilitário, **procure em `packages/ui`**. Se existe, use. Se quase existe, generalize lá. Se não existe e vai ser usado em mais de uma tela, crie em `packages/ui`. Apps consomem via `@workspace/ui` — não duplique.

**shadcn/ui v4 (skill `shadcn`)**: a fonte de componentes. **Use o MCP do shadcn** (`mcp__shadcn__*`) para descobrir e adicionar componentes:
- `mcp__shadcn__list_items_in_registries` — listar
- `mcp__shadcn__search_items_in_registries` — buscar
- `mcp__shadcn__view_items_in_registries` — ver source
- `mcp__shadcn__get_item_examples_from_registries` — ver exemplos
- `mcp__shadcn__get_add_command_for_items` — pegar comando de instalação
- `mcp__shadcn__get_audit_checklist` — checklist pós-instalação

Componentes shadcn instalados vão para `packages/ui` (style `radix-nova`), nunca para dentro do app.

**Vaul mobile-only (skill `vaul`)**: drawer-up é mobile. Em desktop, use Popover/Sheet/Dialog. Não estique drawer pra desktop.

**Framer Motion (`conventions/ux/framer-motion.md`)**: animações são parte da experiência mobile (transições de página, drawers, gestos, micro-feedback). Use spring naturais, durations curtas (200-400ms). Não decore — anime intenção.

**App Shell (skill `app-shell`)**: a página NUNCA define `max-width` ou `mx-auto`. Largura é controlada pelo shell. Comece de `apps/hub/src/routes/` seguindo o template das páginas já portadas (`thread-detail.tsx`, `chat-thread.tsx` são bons exemplos recentes — chrome dedicado).

**Avatar canônico**: avatares (user/bot/agent/customer) renderizam via `/api/v1/avatars` — não use iniciais como tela final.

**SSE invalida cache**: para qualquer hook que cacheia dados na página, mapeie quais `SSEEventType` afetam e wire listeners. Não é detalhe pós-MVP — é parte da página.

**Semantic colors (skill `semantic-colors`)**: nunca cor direta. Use tokens CSS para consistência claro/escuro.

**Localização**: código em inglês, UI em pt-br. Consistência absoluta na tradução de conceitos.

### 5. RTM (Ready To Market)

Cada página portada deve estar completa: validação, feedback ao usuário, tratamento de erros, empty states, loading states (skeleton), error states, responsividade real (não breakpoint genérico). Se não couber completo no escopo, **reduza o escopo da feature**, não a qualidade. Não deixe lacunas "pra resolver depois".

## Checklist por página portada

Antes de declarar pronta:

- [ ] Li o equivalente em `apps/hub/src/routes/` e entendi o trabalho do usuário.
- [ ] Desenhei o conceito mobile (ações primárias na thumb zone, drawer-up para detalhes, gestos quando aplicáveis).
- [ ] Desktop é uma expansão coerente — não uma página diferente.
- [ ] Estado visível (filtros, drawers, seleções) está na URL.
- [ ] Componentes vieram de `@workspace/ui`. Novos componentes de UI foram criados em `packages/ui`, não no app.
- [ ] Componentes shadcn novos foram adicionados via MCP do shadcn no registry correto.
- [ ] Vaul só em mobile; desktop usa Popover/Sheet/Dialog.
- [ ] Página não define `max-width` nem `mx-auto`.
- [ ] Tooltips em todos os ícones (tooltip em ícone é regra).
- [ ] Avatares via rota canônica.
- [ ] Hooks com cache têm listeners SSE para invalidação.
- [ ] Cores via tokens semânticos.
- [ ] Loading, error, empty states cobertos.
- [ ] UI em pt-br, código em inglês.
- [ ] Animações de transição/feedback presentes onde fazem sentido.
- [ ] Testei em mobile (DevTools responsive) e desktop.

## Referências (leia a relevante antes de agir)

| Skill / Arquivo | Quando consultar |
|---|---|
| Skill `app-shell` | Estrutura do shell, breakpoint, slots de chrome dedicado |
| Skill `vaul` | Decidir Drawer vs Popover vs Sheet vs Dialog responsivamente |
| Skill `ui-dry` | Antes de criar QUALQUER componente/hook/util |
| Skill `shadcn` | Componentes shadcn — sempre via MCP |
| Skill `semantic-colors` | Aplicar qualquer cor |
| Skill `realtime-sse` | Invalidar cache via SSE |
| `conventions/ux/mobile-patterns.md` | Thumb zone, gestos, breakpoints, performance mobile |
| `conventions/ux/framer-motion.md` | Animar transições e micro-interações |
| `conventions/ux/GUIDE.md` | Índice de convenções de UX |
| `apps/hub/src/routes/thread-detail.tsx`, `chat-thread.tsx` | Exemplos recentes de páginas com chrome dedicado |

## Anti-padrões (não faça)

- ❌ Copiar a página do `/hub` e ajustar com `md:` — isso é "desktop espremido".
- ❌ Drawer-up Vaul aparecendo em desktop.
- ❌ Componente novo direto em `apps/hub/src/components/` sem checar `packages/ui`.
- ❌ Página com `max-w-*` ou `mx-auto`.
- ❌ Iniciais como avatar final.
- ❌ Polling para refresh — sempre SSE.
- ❌ Ícone sem tooltip.
- ❌ Hex/rgb hardcoded — sempre token semântico.
- ❌ Declarar pronto sem empty/loading/error states.
- ❌ "Faço o desktop primeiro porque é mais fácil ver no meu monitor."
