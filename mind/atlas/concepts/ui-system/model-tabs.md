---
title: "Model Tabs"
aliases: [model-tabs, intra-page-tabs, generic-tab-page, pagetabs-renderer, tabbed-page]
tags: [ui-system, component, navigation, schema-driven, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Model Tabs

Tabs **dentro de uma página** schema-driven. Cada aba é um sub-model que reentra no engine — pode ser form, grid, dashboard, treeview, ou qualquer template legítimo (e, recursivamente, outra página com abas). É o renderer da chave `pageTabs` no nó raiz do model (template `TemplatePaginaAbas` no legado, dispatched por presença de chave em `GenericPages` antes do fork interno).

**Não é** o mesmo componente que [[page-tabs]]. A distinção é fundamental:

| Aspecto | [[page-tabs]] | [[model-tabs]] (este) |
|---|---|---|
| Escopo | Entre páginas abertas no app | Dentro de uma única página |
| Origem | Stack de navegação do shell | Schema do model (`DFvalor`) |
| Conteúdo | Rotas inteiras com estado | Sub-models do engine |
| Limite típico | 10 abas (sessão de trabalho) | 2–8 abas (estrutura editorial fixa) |
| Persistência ativa | localStorage por usuário | URL hash (decisão Studio) |
| Renderiza | `app-shell` | Conteúdo da página |

Quem desenha quais abas existem é o **admin do AppBuilder** quando popula `TBmodel_pagina.DFvalor`. Quem desenha quais páginas estão abertas é o **usuário final** ao navegar. São camadas diferentes de tabness.

## Quando usar

- Página cujo `model.pageTabs` (array) está presente — o engine despacha automaticamente.
- Páginas que agrupam visões correlatas do mesmo recurso (ex.: "Empresa" com abas Dados, Endereços, Contatos, Histórico).
- Formulários longos quebrados em seções tabbed (alternativa a wizard quando a ordem não importa).

## Quando NÃO usar

- Quando uma das visões tem peso muito maior que as outras: vira página principal + drawer/sheet para as secundárias.
- Para fluxo sequencial obrigatório: use [[wizard]] (F015), não abas.
- Para alternar entre filtros do mesmo grid: use [[segmented-control]] ou [[filter-bar]].
- Para navegação entre recursos diferentes: use [[page-tabs]] (abrir nova página).

## API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `tabs` | array `{ id, label, functionKey?, content, disabled? }` | obrigatório | Lista de abas. Vazia = render só título; sem barra. |
| `activeTabId` | string | primeira aba elegível | Controlado pela URL (ver Persistência). |
| `title` | string | — | `genericPageTitle` do nó raiz — exibido **acima** da barra de abas, sempre visível. Pode ser vazio. |
| `onTabChange(id)` | callback | — | Studio: sincroniza com URL. |
| `lazy` | bool | `true` (Studio) | Se `true`, sub-model só monta na primeira visita à aba; se `false`, todas montam ao entrar (paridade legado). |
| `keepAlive` | bool | `true` | Após primeira montagem, aba permanece no DOM (oculta) para preservar estado. Decoupled de `lazy`. |
| `checkAcl` | bool | herdado da página | Se `true`, filtra abas cujo `functionKey` não está nas permissões. |
| `aclTabsAllowed` | array<string> | — | Conjunto de `functionKey` permitidos (vem de `pageConfig.children.route[].key`). |

### Resolução de aba ativa (prioridade)

1. `?tab={id}` na URL (ou `#tab={id}`, decisão abaixo).
2. Última aba visitada nesta página na sessão (`sessionStorage`, opcional).
3. Primeira aba elegível (pós-ACL).

## Decisões de design vs. legado

### Lazy mount: **default ligado (`lazy: true`)**

Diverge do legado (que monta todas ao mesmo tempo). Justificativa:

- O legado tinha custo proporcional à soma de **todas** as abas no carregamento inicial — aceito por inércia, não por design.
- Páginas reais do AppBuilder podem ter 4–6 abas, cada uma com grid grande ou dashboard de polling. Carregar tudo antecipadamente é desperdício na maioria dos casos.
- Polling em abas escondidas (sub-renderer dashboard) deixa de rodar até a primeira visita — desejável.

**Trade-off**: estado não preexiste à primeira visita da aba. Quando o usuário troca para uma aba e volta, o estado **é preservado** (via `keepAlive`), mas a **primeira** visita causa loading. Aceitável e esperado.

**Escape hatch**: model pode declarar `eager: true` em `pageTabs[i]` para forçar mount imediato de uma aba específica (ex.: dashboard de KPIs que deve estar quente para alerts mesmo sem visita do usuário). Curator decide se expõe este flag no schema do AppBuilder ou se fica como uso interno.

### Persistência da aba ativa: **URL via `?tab={functionKey}`**

Diverge do legado (que sempre cai na primeira aba ao recarregar). Justificativa:

- Deep-link funcional: `/empresas/42?tab=enderecos` abre direto na aba certa.
- Botão voltar do navegador troca abas (UX esperada em SPAs modernas).
- Compatível com [[page-tabs]] (cada aba do shell preserva sua aba interna na URL).

**ID da aba na URL**: `functionKey` (estável), **nunca** o índice posicional `tabPage{i}` do legado. Se `functionKey` ausente, fallback para slug do label. Renomear/reordenar abas no AppBuilder não quebra links existentes (desde que `functionKey` se mantenha).

**Query-param, não hash**: hash conflita com âncoras intra-página; query-param é o padrão React Router e funciona com SSR/prerender se relevante no futuro.

### ACL: aba sem permissão é **hidden silencioso**

Paridade legado. Justificativa:

- Mensagem "você não tem permissão para ver esta aba" vaza estrutura do produto para quem não deveria saber que existe.
- Admins veem todas as abas; usuários comuns veem só as suas — a página parece desenhada sob medida.
- Se ACL filtra **todas** as abas (`tabs.length === 0` pós-filtro), página entra em estado `empty` (ver Estados).

**Sem indicador de "há mais abas escondidas"**. Discrição total.

### Erro do legado **não** replicado

`try/catch` mudo do legado (`GenericTabPage.js:42-44`) que deixava página em branco em qualquer falha de ACL/parse: substituir por estado de erro visível ([[error-boundary]] local na página). Sub-model malformado deve mostrar erro inline na aba, não derrubar a página inteira.

## Anatomia

### Desktop (≥ 768px)

```
┌──────────────────────────────────────────────────────────────┐
│  Cadastro de Empresas                          ← genericPageTitle (h2)
├──────────────────────────────────────────────────────────────┤
│ [ Dados ] [ Endereços ] [ Contatos ] [ Histórico ]          │  barra de tabs
│ ─────────                                                    │  underline na ativa
├──────────────────────────────────────────────────────────────┤
│                                                              │
│  <sub-model renderer>                                        │
│                                                              │
```

- Título `text-2xl font-semibold` acima da barra, com `mb-4`. Pode receber slot de ações à direita (botões globais da página).
- Barra de abas `border-b border-border`, abas como botões com `px-4 py-2`.
- Aba ativa: `border-b-2 border-primary text-foreground font-medium` (underline indicator).
- Aba inativa: `text-muted-foreground hover:text-foreground hover:bg-muted/50`.
- Aba disabled (sem permissão de ação, mas visível): `opacity-50 cursor-not-allowed`.
- **Sem botão de fechar** (são abas fixas do schema, não fechaveis pelo usuário).
- **Sem drag-to-reorder** (ordem vem do model).
- Overflow horizontal (>8 abas, raro): scroll com `scroll-behavior: smooth` + gradients laterais.

### Mobile (< 768px)

Duas formas conforme contagem:

**≤ 5 abas — pill scroll**:

```
┌─────────────────────────────────────────────┐
│  Cadastro de Empresas                        │
├─────────────────────────────────────────────┤
│ ( Dados ) [ Endereços ] [ Contatos ] [ → ]  │  scroll-snap horizontal
├─────────────────────────────────────────────┤
│  <sub-model>                                 │
```

- Pills (`rounded-full px-3 py-1.5`) com `scroll-snap-type: x mandatory`.
- Aba ativa: `bg-primary text-primary-foreground`.
- Aba inativa: `bg-muted text-muted-foreground`.
- Gesto: swipe horizontal na **barra** rola a barra (não troca aba); swipe no **conteúdo** não troca aba (evita conflito com gestos internos de grid/form). Troca de aba só por tap.
- Indicador de overflow: gradiente lateral + chevron sutil.

**> 5 abas — bottom-sheet picker**:

```
[ Dados ▾ ]                ← trigger (label da aba atual + chevron)
─────────────────────────────────
<conteúdo>


tap no trigger abre:
┌─────────────────────────────────┐
│  ━━                             │
│  Selecionar seção               │
├─────────────────────────────────┤
│  ● Dados                        │
│    Endereços                    │
│    Contatos                     │
│    Histórico                    │
│    Documentos                   │
│    Auditoria                    │
└─────────────────────────────────┘
```

- Trigger ocupa lugar da barra; tap abre [[drawer]] (Vaul) com lista vertical.
- Aba ativa: bullet `●` + `font-medium`.
- Tap em linha: troca aba + fecha drawer.
- Threshold de 5 é configurável; default reflete polegar: até 5 pills cabem confortavelmente em telas de 360–390px.

## Estados

- **default** — barra/pills renderizadas com aba ativa destacada; sub-model da aba ativa visível.
- **hover** (desktop) — aba inativa: fundo/texto realçam.
- **focus** — ring de foco visível em qualquer aba navegável.
- **active** (interação) — leve `scale-[0.98]` durante tap (mobile pills).
- **disabled** — aba presente mas não navegável (raro; só se schema marcar). Opacidade reduzida, cursor `not-allowed`.
- **loading (página)** — antes do model chegar (vem de [[obter-model-pagina]]): skeleton — título placeholder + linha de 3–4 pills cinza + área de conteúdo com skeleton genérico do template provável (se discriminante já conhecido) ou bloco neutro.
- **loading (aba específica, primeira visita com `lazy: true`)** — sub-model monta e exibe seu próprio loading; barra de abas permanece interativa. Indicador inline opcional: spinner pequeno ao lado do label da aba que está carregando pela primeira vez.
- **error (sub-model)** — uma aba falhou: ícone `Warning` (Phosphor) ao lado do label + cor `text-x-error`; conteúdo da aba mostra estado de erro com retry. Outras abas continuam funcionais.
- **error (página inteira)** — model não carregou ou ACL deu erro de parse: estado de erro full-page com retry. **Diverge do legado (que ficava em branco mudo).**
- **empty — nenhuma aba elegível** — `tabs.length === 0` pós-ACL: render só do `genericPageTitle` + bloco vazio centralizado com mensagem genérica "Nenhuma seção disponível" e ícone `FolderOpen` (Phosphor). **Não** revela que existem abas filtradas por ACL.
- **empty — `pageTabs: []` no schema** — admin ainda não populou: mesmo render do caso anterior. Mensagem pode ser ligeiramente diferente se contexto for de admin ("Configure as seções desta página no AppBuilder") — decisão de copy do curator.

## Motion

- **entrada da página**: título e barra de tabs fade-in `normal` (250ms `ease-out`). Conteúdo da aba ativa segue motion próprio do sub-renderer.
- **troca de aba (desktop)**: underline desliza de uma aba para outra `fast` (150ms `ease-out`); conteúdo cross-fade `fast` (150ms). Sem slide horizontal (slide é ambíguo com hierarquia de navegação).
- **troca de aba (mobile pills)**: pill ativa transita `bg` em `fast`; conteúdo cross-fade `fast`.
- **troca de aba (mobile bottom-sheet)**: drawer fecha (spring do Vaul); conteúdo cross-fade `fast` após fechamento começar.
- **primeira montagem de aba lazy**: sub-model entra com fade-in `fast` após resolução do loading.
- **overflow scroll na barra**: smooth-scroll nativo do browser.
- **prefers-reduced-motion**: tudo cai para fade simples 80ms; underline troca instantânea (sem slide).

## Responsivo

- **mobile (< 640px)**: pills horizontais com snap (até 5) ou bottom-sheet picker (>5). Título `text-xl`.
- **tablet (640–1024px)**: barra horizontal desktop comprimida — labels com `max-w-[140px]` truncados. Título `text-2xl`.
- **desktop (> 1024px)**: barra horizontal completa, labels até `max-w-[200px]`. Título `text-2xl` + slot de ações.
- **thumb zone / gestos**:
  - Mobile pills: tap (não swipe — swipe conflita com gestos do sub-model).
  - Bottom-sheet picker: tap no trigger abre; tap em linha seleciona; swipe-down fecha (handle do Vaul).
  - Long-press numa pill (mobile): sem ação por enquanto (reservar para futura "fixar aba" se virar requisito).

## Acessibilidade

- Container: `<div role="tabpanel-container">` com `aria-label={title}` quando título existir.
- Lista de tabs (desktop e mobile pills): `<div role="tablist" aria-label="Seções de {title}">`.
- Cada tab: `<button role="tab" aria-selected={isActive} aria-controls={panelId} id={tabId} tabIndex={isActive ? 0 : -1}>`.
- Painel da aba ativa: `<div role="tabpanel" aria-labelledby={tabId} tabIndex={0}>`.
- Painéis inativos (quando `keepAlive` mantém no DOM): `hidden` attribute + `aria-hidden="true"`.
- Mobile bottom-sheet trigger: `<button aria-haspopup="dialog" aria-expanded={isOpen}>`.
- Mobile bottom-sheet: `<Drawer>` shadcn — focus trap, Escape fecha.
- **Navegação por teclado** (desktop):
  - `Tab`: entra na barra (foco na aba ativa) → próximo elemento focável dentro do painel.
  - `←/→`: move foco entre abas (sem ativar — segue [WAI-ARIA APG manual activation](https://www.w3.org/WAI/ARIA/apg/patterns/tabs/)).
  - `Enter` ou `Space`: ativa a aba focada.
  - `Home/End`: vai para primeira/última aba elegível.
- **Leitor de tela**: ao trocar de aba, anunciar nome da aba ativa via `aria-live="polite"` no panel ou via `aria-selected` (suficiente nos screen readers modernos).
- **Contraste mínimo**: AA 4.5:1 para texto da aba inativa contra fundo; AAA 7:1 para a ativa. Underline `border-primary` precisa contraste 3:1 contra fundo (componente gráfico).

## Composição

- **Compõe**:
  - [[button]] (cada tab é botão semântico).
  - [[drawer]] (Vaul) — mobile bottom-sheet picker.
  - [[skeleton]] — estado de loading.
  - [[error-state]] — estado de erro full-page e por aba.
  - [[empty-state]] — sem abas elegíveis.
  - Ícones Phosphor: `Warning` (aba com erro), `CaretDown` (trigger do bottom-sheet picker), `FolderOpen` (empty state).
- **É composto por**: qualquer página do engine cujo model tenha `pageTabs[]` no nó raiz. Renderizado pelo [[engine-dispatcher]] (F-engine) antes do dispatch interno por template.
- **Renderiza dentro de si**: qualquer sub-renderer do engine ([[generic-form]], [[data-grid]], [[dashboard-renderer]], [[treeview-renderer]], inclusive recursivamente outro `model-tabs`).
- **Coordena com**: [[page-tabs]] (a aba interna ativa entra na URL da página, que é o que o page-tabs persiste no localStorage).

## Cores e tokens

- `text-foreground` — título da página, aba ativa.
- `text-muted-foreground` — aba inativa.
- `bg-muted` — pill inativa (mobile).
- `bg-primary`, `text-primary-foreground` — pill ativa (mobile).
- `border-primary` — underline da aba ativa (desktop).
- `border-border` — divisor abaixo da barra (desktop).
- `hover:bg-muted/50`, `hover:text-foreground` — hover desktop.
- `text-x-error` — aba/conteúdo em estado de erro.
- `ring`, `ring-offset-background` — focus visível.
- Nunca cor direta. Ver [[semantic-colors]].

## Notas derivadas do contrato legado

Do [[model-valor-pagetabs]]:

- **Discriminante por presença de chave**: `model.pageTabs` (array) presente → renderer abas. Mantido. Outras chaves no mesmo nó raiz (`genericform`, `genericgrid`...) são ignoradas — sub-models válidos vão **dentro** de cada `pageTabs[i]`.
- **`genericPageTitle` no nó raiz**: título acima da barra. Mantido.
- **`genericPageTitle` em cada `pageTabs[i]`**: rótulo da aba. Mantido.
- **`functionKey` por aba**: usado para ACL **e agora também como ID estável de aba** (URL deep-link).
- **`tabName` posicional (`tabPage{i}`)**: **descontinuado**. Studio usa `functionKey` como ID. Migration interna do engine, transparente ao schema do AppBuilder.
- **Lazy mount**: legado não tem; Studio adota como default (ver Decisões).
- **Persistência da aba ativa**: legado não tem; Studio adota URL query-param (ver Decisões).
- **ACL filter silencioso**: mantido.
- **Aba não-fechável, não-reordenável**: mantido (são parte do schema, não da sessão).
- **`pageTabs` aninhado**: o engine permite. Studio também — o renderer reentra naturalmente. Não há limite imposto além do bom senso (3+ níveis vira labirinto; curator pode flagear).

## Sinalizações ao curator

- **Decisão pendente — `eager: true` por aba**: expor no schema do AppBuilder ou manter como flag interno? Default `lazy: true` cobre o caso comum; `eager` só é necessário para dashboards de alerta. Sugiro **não** expor no AppBuilder na primeira versão — adicionar quando aparecer caso real.
- **Decisão pendente — `sessionStorage` de última aba visitada**: complementa a URL? Útil quando o usuário entra na página via menu (sem `?tab=`) e quer continuar de onde parou. Risco baixo (sessionStorage limpa ao fechar aba do browser). Sugiro **incluir como melhoria silenciosa** — sem documentação ao usuário, só funciona.
- **Decisão pendente — copy do empty state**: "Nenhuma seção disponível" é genérico. Curator pode querer copy condicional (admin vs. usuário final).
- **Possível derivação reutilizável**: o **picker bottom-sheet** (mobile, lista vertical de opções com bullet de seleção) é um padrão que aparece também em [[page-tabs]] mobile e provavelmente em outros lugares (escolha de filtro avançado, escolha de view de grid). Candidato a virar [[option-picker-sheet]] reutilizável quando aparecer o terceiro consumidor.

## Sources

- [[calendar/notes/2026-05-15.md]]
- [[model-valor-pagetabs]] — contrato legado de `pageTabs`, dispatch, ACL, `GenericTabPage`, `PageTabs`.
- [[engine-schema-driven]] — bifurcação raiz que despacha para este renderer.
- [[page-tabs]] — componente sibling (navegação entre páginas), explicitamente distinto.
