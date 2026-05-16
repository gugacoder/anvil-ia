# MISSION — Director.Studio

> Norte único da frente. **Todo agente lê isto antes de decidir, executar ou aceitar trabalho**. Curator e UI-tester usam como critério de aceitação além da checklist técnica. Não é decorativo — é vinculante.

## Missão em uma frase

Substituir o ecossistema legado de frontends Processa (AppBuilder, Portal Director, Director.Web/WMS, ADM, Mobile) — onde **cada app era um deploy separado em volta do mesmo `@engenharia/react-tools`** — por **uma plataforma única**: Director.Studio. O Studio é o react-tools **sem o wrapper**: lê do banco quais apps existem (`TBaplicacao`), renderiza todos juntos numa única URL, mesmo shell, mesmo login. Os apps (Portal Director, WMS, ADM, AppBuilder, etc.) **continuam existindo como conteúdo cadastrado no banco** — a hierarquia **App → Módulo → Página** é preservada na UI. O que some é o wrapper de deploy. O que muda é a experiência: mobile-first, design system moderno, sem dependência de .NET local, com liberdade criativa pra repaginar.

## O que é o Studio

Conceito-chave que o time precisa internalizar antes de qualquer decisão:

- **Studio é UMA aplicação** — um deploy, uma URL, um shell, um login. Não é "uma das apps Processa"; é o **runtime que renderiza todas elas**.
- **Renderiza N apps simultaneamente** — todos os apps que o usuário tem acesso no tenant aparecem juntos no menu, sem switcher, sem trocar de URL, sem trocar de modo.
- **Os apps vivem no banco** — `TBaplicacao` cadastra, Studio descobre via `SELECT ... WHERE DFdata_inativacao IS NULL` e materializa. App novo no banco → aparece no Studio sem código novo.
- **Hierarquia App → Módulo → Página é visível pro usuário** — ele entende que está em "Portal Director > Configurações > Agendamento" ou em "WMS > Cadastros > Grupo de Trabalho". A divisão por app **não some da UI**; só sai do plumbing (URL, deploy, sessão).
- **AppBuilder será um app do próprio Studio** — quando cadastrarmos templates de edição de páginas no banco, o AppBuilder aparece como mais um app no menu, indistinguível dos outros pelo runtime. Recursivo: a ferramenta que cadastra apps roda dentro da plataforma que renderiza apps.
- **Schema-driven de verdade** — código novo só pra primitivas do design system (botão, form-field, table, etc.). Telas novas nascem como linha em `TBmodel_pagina`. Se você está escrevendo um componente pra uma tela específica, parou de fazer Studio e voltou a fazer wrapper-de-app legado.

### Insight central que o time legado não viu

O `react-tools` já lê o banco e renderiza tudo dinamicamente — **ele já é o app**. O wrapper em volta de cada deploy (Portal Director, WMS, etc.) é só boilerplate. Tirar o wrapper e ter o react-tools rodando sozinho — repaginado, modernizado — é o produto.

## Por que importa

O legado tem ~15 anos, foi escrito pra IE/Bootstrap, usa um pacote interno (`@engenharia/react-tools`) mantido por uma pessoa só, depende de .NET local em cada cliente, é desktop-only, tem auth em localStorage (XSS-vulnerable), e cada cliente roda 3-5 serviços Windows pra ter as mesmas telas. **Trocar isso por um único processo Node moderno é evolução de produto, não tarefa de modernização cosmética.**

O usuário final precisa abrir o Studio e pensar **"finalmente"** — não "ah, mudou o visual". Se a percepção é "é a mesma coisa só mais bonito", a missão falhou.

## Como reconhecer sucesso

Quando uma feature está pronta de verdade, **todos os critérios qualitativos** abaixo se confirmam, não só os técnicos:

### Experiência do usuário final
- **Mobile-first real**: a feature funciona com excelência num iPhone 12 antes de funcionar em desktop. Thumb zone, gestos, drawer-up. Não é "responsivo", é **concebido pra mobile e expandido pra desktop como coerência**.
- **Sensação de upgrade**: alguém que usava o legado abre essa tela e percebe imediatamente que algo é melhor (velocidade, clareza, suavidade, organização). Não precisa explicar.
- **Densidade adequada ao contexto**: telas operacionais (grids, dashboards) são densas; telas de entrada (login, configs) respiram. O legado é uniformemente apertado.
- **Estados completos**: empty, loading, error, success, hover, focus, active, disabled — todos com tratamento explícito. Não há "estado esquecido".
- **Motion como informação**: animações comunicam estado (entrada, saída, transição), não decoram. Suaves, curtas, intencionais.

### Coerência sistêmica
- **Component-first ([[ui-dry]])**: nenhum visual aparece em duas features sem estar em `packages/ui`. Inconsistência visual é bug.
- **Tokens semânticos sempre**: nada de hex, oklch literal, ou classes de cor cruas em features. Tudo via tokens — claro e escuro nascem juntos.
- **Phosphor only**: vocabulário de ícones uniforme.
- **Tipografia hierárquica clara**: pesos 400/500/600/700 do Inter resolvem 90% dos casos.

### Qualidade técnica
- **Performance**: navegação interna < 200ms (p95). Boot inicial cold cache < 2s.
- **Acessibilidade**: WCAG AA mínimo. Tab navigation funciona em **toda** feature. Foco visível sempre.
- **Sem dependência de .NET local**: tudo via Node + SQL Server + AWS bridge.
- **Sem polling**: SSE pra realtime, sempre.
- **Sem console.log no backend**: Pino estruturado.

### Independência arquitetural
- **Schema-driven**: novas telas nascem como linha em `TBmodel_pagina`, não como código novo.
- **Design system antes de feature**: componente novo entra primeiro no catálogo (designer), depois é consumido (smith).
- **Auth moderna**: cookie httpOnly, sem JWT no localStorage, sem segredo hard-coded em produção pós-cutover.

## Anti-patterns (red flags — se algum aparece, missão regrediu)

Lista não-exaustiva de sinais de que algo está errado e a feature **não deve ser aceita**, mesmo passando em checklist técnica:

- 🚩 **"Generic AI app aesthetic"** — caixa branca, sombra fofa, espaçamento "fofinho", botão azul genérico. Soa como output de scaffold sem alma. Designer tem que dar **caráter**.
- 🚩 **Hover/focus invisível** — você não percebe que tem foco no input ou que o botão está hover. A11y falha real.
- 🚩 **Componente que só serve uma feature** — em `apps/director-studio/src/components/<X>/` ao invés de `packages/ui/`. Indica que ui-dry foi atropelado.
- 🚩 **Cor inline** — `bg-blue-500`, `text-red-600`, ou hex literal em qualquer feature. Quebra o sistema de cores semânticas.
- 🚩 **Lucide icon** — projeto é Phosphor only.
- 🚩 **"Funciona mas parece o legado"** — se a feature pronta lembra esteticamente o react-tools, regrediu. Especialmente: visual bootstrap-like, botões pequenos, layouts apertados sem motivo, formulários com label-em-cima sem respiro.
- 🚩 **Tela desktop adaptada pra mobile depois** — gera "modal cobrindo a tela toda", "tabela com scroll horizontal", "tipografia pequena demais pra dedo". Era pra ser mobile-first, virou desktop-first.
- 🚩 **`isMobile()` no JSX** — separar branches mobile/desktop em código JSX é falha. Layout deve ser **uma coisa só**, responsiva por CSS/container queries.
- 🚩 **Bug que repete o pattern do legado** — se uma decisão de UX errada do legado foi reproduzida porque "é assim que era", abandona. Estamos fugindo dele, não imitando.
- 🚩 **Console com erro/warning durante uso normal** — qualidade técnica não passou.
- 🚩 **Build de dev > 3s em watch mode** — degradação que mata DX.
- 🚩 **Feature hardcoda chave de uma app** — ex.: `STUDIO_APP_KEY ?? 'portal-director'`, `WHERE DFchave_aplicacao = 'wms'`, `appKey: 'admin'` no caminho de menu/ACL/rota/sessão. O Studio renderiza TODAS as apps cadastradas no banco simultaneamente — **nunca elege uma**. Filtrar por chave de app é vício do legado (cada app era um deploy isolado em volta do react-tools) e viola a MISSION literal. **Exceção legítima**: `appKey` referenciando um **destino externo** (bridge AWS chama `portal-aws`, integrador chama `integrador-aws`) — aí é endereçamento de integração, não hosting de UI. Regra prática: se o código pergunta "qual app eu sou?" → vício. Se pergunta "que apps existem no banco?" → correto.
- 🚩 **Feature trata "app" como estado do shell** — variável global `currentApp`, badge "você está em WMS" como afirmação de modo, redirect/troca de URL ao mudar de app. App é categoria do conteúdo (vem do banco, aparece no menu), nunca estado do runtime. O usuário navega entre apps sem perceber que mudou de "modo" — porque não há modo.
- 🚩 **Componente próprio pra uma tela específica** — se o smith escreveu `<TelaCadastroUsuarios/>` ou `<PaginaConfiguracoes/>`, parou de fazer Studio e voltou a fazer wrapper-de-app legado. Telas nascem como linha em `TBmodel_pagina`, renderizadas por primitivas genéricas do design system. Código novo é só primitiva nova no `packages/ui/`.

## Não-negociáveis

Coisas que **nunca** podem ser violadas, sob nenhuma justificativa:

1. **Smith nunca lê `sources/engenharia--fabrica--*`**. Princípio de não-contaminação.
2. **Designer nunca codifica**. Catálogo descritivo.
3. **Archaeologist nunca prescreve stack**. Só contratos.
4. **Sem polling**. SSE only.
5. **Sem cores diretas**. Tokens semânticos sempre.
6. **Sem componente fora de packages/ui** se serve mais de uma feature.
7. **Sem feature aceita** com red flag qualitativo do checklist acima.
8. **Studio não tem "app corrente"**. Não existe sessão+app, cookie+app, rota global por app, breadcrumb topo "app atual", theme por app, nem variável `currentApp` em código. App é **categoria do menu** (vinda do banco), não estado do shell. O usuário sempre vê o universo inteiro de apps que tem acesso — escolhe página, não app.
9. **Studio nunca filtra menu/ACL por chave de app**. `obter_acl_token` é chamado pra agregar **todas** as apps ativas (`TBaplicacao WHERE DFdata_inativacao IS NULL`) que o usuário tem acesso. Hardcode tipo `'portal-director'` em qualquer ponto do caminho de bootstrap é proibido — vício do legado.
10. **Studio não inventa hierarquia além do banco**. App → Módulo → Página é o que vem de `TBaplicacao`/`TBmodulo`/`TBpagina`. Não criamos categorias adicionais; não suprimimos níveis existentes. Caso degenerate "user tem 1 app só" colapsa visualmente, mas a estrutura conceitual é sempre 3-níveis.

## Como o time aplica isto

| Agente | Como consome a MISSION |
|---|---|
| `archaeologist` | Sabe que extrai contratos *para alimentar uma reescrita superior, não uma cópia*. **Quando o comportamento descrito assume "1 app por bootstrap" (cada app legado tinha seu próprio wrapper em volta do react-tools) ou outro paradigma incompatível com a plataforma única, sinaliza explicitamente no contrato com uma seção `## ⚠️ Inércia legada`** — descreve a inércia, contextualiza o que muda na ótica do Studio, mas não prescreve solução técnica. Não basta documentar fielmente; documentar com sinalização. |
| `designer` | **Toda nota de `ui-system/`** responde implicitamente: "isto serve à missão? avança o estado da arte?". Componentes que parecem "genéricos" são rejeitados pelo próprio designer. |
| `smith` | Antes de mover feature pra `ready-for-test`, faz **vibe check**: "isto é o que substitui o legado, ou só passa nos testes?". Se duvida, registra como nota e espera curator confirmar. |
| `ui-tester` | Além dos cenários técnicos, executa **vibe check qualitativo** em pelo menos 2 dimensões: percepção de upgrade, completude de estados, coerência com design system. Relatório separa "técnico ✓" de "mission ✓". |
| `curator` | **Não aceita** feature que passa técnico mas falha mission. Recusa explícita com o anti-pattern identificado. |

## Decisão final de aceitação

Curator só marca `Accepted=✓` quando:

1. ✅ Todos os critérios técnicos da feature passam (ui-tester confirmou)
2. ✅ Pelo menos 5 dos critérios qualitativos desta MISSION se aplicam à feature e foram observados na execução real (ui-tester reportou)
3. ✅ **Zero** anti-pattern listado acima foi identificado
4. ✅ Design system reusado (não inventado per-feature)

Se algum item falha, **rejeita** com diagnóstico específico (qual critério/anti-pattern). Smith retoma.

## Persona vinculada

A MISSION é abstrata sem âncora humana. **Leia [[PERSONA]]** — descreve quem usa o Director.Studio (Time Director: atacadistas e varejistas brasileiros tipo Bahamas, do escritório à frente de loja). Toda decisão de design, implementação ou aceitação considera **simultaneamente** MISSION + PERSONA. Quando os dois apontam pro mesmo lado, a feature está no rumo.

## Esta missão é viva

Quando o time identificar critério ou anti-pattern que faltava aqui, atualizar este documento. É **vinculante mas evolutivo** — não é monumento.
