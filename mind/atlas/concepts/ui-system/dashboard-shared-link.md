---
title: "Dashboard shared-link"
aliases: [dashboard-shared-link, shared-link, kiosk-link, exhibition-link, dashboard-share, share-modal, share-page]
tags: [ui-system, component, dashboard, share, exhibition, kiosk, security, director-studio]
sources:
  - "calendar/notes/2026-05-17.md"
  - "atlas/concepts/legacy-contracts/model-valor-dashboard.md"
created: 2026-05-17
updated: 2026-05-17
---

# Dashboard shared-link

Vocabulário visual e de URL para **compartilhar um dashboard como link público** (kiosk / exhibition / parede de TV / sócio externo). Cobre dois objetos distintos do design system:

1. **`share-modal`** — overlay disparado pelo botão "Compartilhar" no header do dashboard. Onde o gerador escolhe escopo, TTL e copia o link.
2. **`share-page`** — superfície pública (sem [[app-shell]]) acessível pelo link gerado. Renderiza o dashboard read-only com chrome mínimo.

Cobre **F056**. Substitui o legado `#/dashboard?tkn=<JWT-30d>&obj=<base64>` que carregava credencial completa do gerador na URL (vide §"Anti-padrões legados" em [[model-valor-dashboard]]).

Esta spec **não** define o componente `<Dashboard>` (vive em [[dashboard]]) nem o motor de token (backend). Define **vocabulário de URL**, **UX do compartilhamento** e **chrome da página pública**.

## Quando usar

- Disparar compartilhamento de dashboards autorais para públicos sem login (telões, terminais de exibição, parceiros externos, embed em outras ferramentas).
- Acessar a página pública via link gerado (uso anônimo).
- Variante reusável de "link público escopado" para outras superfícies futuras (relatórios, formulários públicos) — mesma família de URL `/share/<resource>/<token>`.

## Quando NÃO usar

- Compartilhar dashboard **com outro usuário autenticado** do mesmo tenant — use sistema de permissões/papéis (F008). Compartilhamento por link é para acesso **sem login**.
- Exportar snapshot estático (PDF/imagem) — feature distinta (F-dashboard-export, P3 backlog).
- Embed cross-tenant com escopo amplo — exige modelo de OAuth / service tokens, fora desta spec.

## Decisões canônicas

### 1. Token no path, não no query nem no fragment

URL canônica:

```
https://studio.codr/share/dashboard/<token>
```

| Opção | Decisão | Justificativa |
|---|---|---|
| Fragment (`#/dashboard?tkn=...`) | **rejeitada** | Era o legado. Conflita com TanStack Router moderno (pathname-based). Fragment é client-only e não chega ao servidor — impede revalidação no SSR/edge se quisermos no futuro. |
| Query (`?tkn=...`) | **rejeitada** | Query strings vazam em logs de proxy, headers `Referer`, analytics. Tratada como dado opcional/efêmero pela web — semanticamente errado para identidade. |
| Path (`/share/dashboard/<token>`) | **adotada** | Token vira parte da identidade do recurso. Roteamento limpo. Bookmarkável. Permite que o servidor sirva 404 imediato (sem expor que o token existiu). Sem `?tkn` órfão. |

`<token>` é **opaco** (não-JWT-decodificável pelo cliente). Backend resolve internamente para `{dashboardIds[], rotateInterval?, ttl, scope}`. O cliente nunca decodifica payload — pede dados ao backend usando o próprio token como credencial.

### 2. Escopo

Token amarra **uma lista explícita de 1+ dashboards** + parâmetros opcionais de rotação. **Nunca** dá acesso ao perfil completo do gerador.

| Modo | Escopo |
|---|---|
| `single` | 1 dashboard. Sem rotação. |
| `rotation` | N dashboards (≥2) com intervalo de rotação (≥10s, default 30s). |

Token **nunca** carrega:
- Identidade do usuário gerador (pode ser anônima no payload server-side).
- Permissões além da leitura dos dashboards listados.
- Acesso a outros dashboards do gerador.
- Capacidade de escrita (sem `POST` aceitos pelo backend nessa autorização — só `GET`/leitura).
- Acesso ao catálogo `TBobjetos_dashboard` (procs de leitura dos widgets são autorizadas individualmente pelo backend para os widgets daqueles dashboards específicos).

### 3. Revogação e TTL

| Aspecto | Decisão |
|---|---|
| TTL fixo (paridade legado 30d) | **rejeitada** — força revogação manual sempre. |
| TTL configurável | **adotada** — picker no `share-modal`: `1 dia`, `7 dias`, `30 dias`, `Sem expiração`. Default `30 dias` (paridade visual com o legado). |
| Server-revogável | **adotada** — todo link é revogável a qualquer momento pelo gerador, mesmo antes do TTL. Acesso desliga imediatamente (backend invalida; cliente da `share-page` recebe 401 no próximo refresh). |
| Refresh-on-use vs fixo | **fixo** — TTL absoluto a partir da geração (não renova com uso). Previsível; quem revoga sabe que o link morre no dia X. |

### 4. UX do compartilhamento (gerador)

Botão **"Compartilhar"** no header do [[dashboard]] (já especificado em `shareState` da API conceitual). Click abre `share-modal` (`kind="form"` da [[modal]], `size="md"`).

### 5. UX da página pública (consumidor)

Rota dedicada `/share/dashboard/<token>` renderizada **fora do [[app-shell]]** — sem sidebar, sem header de app, sem breadcrumbs, sem menu de usuário. Chrome mínimo:

- Logo `Director.Studio` discreto, canto inferior direito, `text-muted-foreground`, `text-xs`, link para `https://studio.codr` (`target="_blank" rel="noopener noreferrer"`).
- Footer ausente em mobile (logo flutuante apenas).
- Sem analytics intrusivo, sem cookie banner (rota pública sem cookies funcionais além de tema preferido).

## Componente: `share-modal`

### Propósito

Permitir ao gerador montar e copiar um link público para 1+ dashboards seus, com TTL e revogação visíveis. Renderiza-se como [[modal]] `kind="form"`, com viewport-shift mobile→drawer bottom.

### API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `open` | booleano | — | Controlado pelo dashboard pai. |
| `onOpenChange` | fn(open) | — | Fechamento. |
| `currentDashboard` | `{id, name}` | — | Dashboard de onde o modal foi aberto; pré-selecionado e não-removível. |
| `availableDashboards` | `{id, name, isFavorite}[]` | — | Lista do usuário+aplicação. Usada quando o gerador adiciona mais dashboards para rotação. |
| `existingLinks` | `SharedLink[]` | `[]` | Links ativos do gerador para este dashboard (mostrados em "Links ativos"). |
| `onGenerate` | fn(payload) => Promise<{url, expiresAt, id}> | — | Backend gera token; modal recebe URL pronta. |
| `onRevoke` | fn(linkId) => Promise<void> | — | Revoga link existente. |
| `mode` | `create` \| `manage` | `create` | `create` = form de geração; `manage` = lista de links ativos (toggle aba). |

### `SharedLink`

```
{
  id: string,
  url: string,
  scope: 'single' | 'rotation',
  dashboards: { id, name }[],
  rotateInterval?: number,  // segundos, se rotation
  createdAt: ISO8601,
  expiresAt: ISO8601 | null,  // null = sem expiração
  lastAccessedAt: ISO8601 | null,  // se backend rastreia
  accessCount: number
}
```

### Anatomia (mobile-first)

#### Estado `create`

```
┌──────────────────────────────────────┐
│ Compartilhar dashboard          [X]  │
├──────────────────────────────────────┤
│                                      │
│  Dashboards incluídos                │
│  ┌────────────────────────────────┐  │
│  │ ★ Vendas — diário (atual)      │  │  ← chip, não removível
│  │ ☆ Estoque                  [X] │  │  ← removível
│  │ [+ Adicionar dashboard]        │  │
│  └────────────────────────────────┘  │
│                                      │
│  Modo de exibição                    │
│  ( ) Dashboard único                 │  ← auto se 1 só
│  (•) Rotação automática              │  ← auto se 2+
│       Intervalo: [ 30s ▾ ]           │
│                                      │
│  Validade                            │
│  [ 30 dias ▾ ]                       │
│   1 dia | 7 dias | 30 dias | Nunca   │
│                                      │
│  ┌────────────────────────────────┐  │
│  │ ⓘ  O link dá acesso somente    │  │  ← inline-alert tom info
│  │    leitura aos dashboards      │     (sempre visível)
│  │    listados. Pode ser revogado │
│  │    a qualquer momento.         │
│  └────────────────────────────────┘  │
│                                      │
├──────────────────────────────────────┤
│              [Cancelar] [Gerar link] │
└──────────────────────────────────────┘
```

Após geração (mesmo modal, estado `created`):

```
├──────────────────────────────────────┤
│                                      │
│  ✓ Link gerado                       │  ← inline-alert tom success
│                                      │
│  ┌────────────────────────────────┐  │
│  │ https://studio.codr/share/...  │  │  ← input read-only,
│  │                       [📋 Copiar]│     selectable
│  └────────────────────────────────┘  │
│                                      │
│  Expira em 30 dias (16 jun 2026)     │
│  Revogável a qualquer momento        │
│                                      │
│  [Abrir em nova aba]  [Ver QR code]  │
│                                      │
├──────────────────────────────────────┤
│       [Gerenciar links] [Concluir]  │
└──────────────────────────────────────┘
```

#### Estado `manage`

Aba "Links ativos" mostra `SharedLink[]` como lista de cards:

```
┌────────────────────────────────────┐
│ Vendas + Estoque (rotação 30s)     │
│ Criado há 5 dias · Expira em 25d   │
│ Acessado 42× · último: há 2h       │
│ [📋 Copiar URL] [Revogar]          │
└────────────────────────────────────┘
```

Revogação dispara **confirm-modal** aninhado ([[modal]] `kind="confirm" tone="destructive"`):

> "Revogar este link? O acesso será desligado imediatamente para quem o usa."

### Estados do `share-modal`

- **default** — formulário pronto, botão "Gerar link" habilitado quando há ≥1 dashboard.
- **generating** — `onGenerate` em andamento. Botão "Gerar link" em [[button]] `loading`; cancelar disabled.
- **created** — link disponível. Foco move ao input com URL (selecionável). Botão "Copiar" em destaque.
- **copied** — após click em "Copiar". Botão muda para "Copiado!" com `Check` (Phosphor) por 2s, depois volta. `aria-live="polite"` anuncia.
- **revoking** — em `manage`, link em estado loading. Botão "Revogar" loading.
- **error** — falha em gerar/revogar. [[inline-alert]] tom `error` no topo do body, modal não fecha.
- **empty-rotation** — usuário escolheu rotation mas só tem 1 dashboard. Validação inline impede submit.
- **invalid-interval** — interval < 10s. Validação inline no campo.

### Motion

- **abertura/fechamento** — herdado de [[modal]] (`normal` 250ms entrada, `fast` 150ms saída).
- **transição `create` → `created`** — slide horizontal sutil (translate-x 20px → 0, fade 100ms `fast`). Sinaliza progressão de etapa sem trocar modal.
- **copy feedback** — botão "Copiar" → "Copiado!" com cross-fade do ícone (150ms `fast`) e checkmark scale 0.8→1.
- **QR code reveal** — fade-in 200ms `normal`, QR aparece em sub-bloco abaixo do input de URL (não modal aninhado).
- **revogação** — card do link faz fade-out + slide-up 200ms `normal` ao confirmar; lista reflui.
- **reduced-motion** — transições caem para 50ms fade puro.

### Responsivo

- **mobile (< 640px)** — drawer bottom (Vaul, herdado de [[modal]] `mobileAs="drawer"`); snap points `[0.7, 0.95]` (preview meia tela, expansão para preencher campos longos). Input de URL ocupa full-width, botão Copiar full-width abaixo (não inline). QR code, se aberto, ocupa quase a viewport inteira (≥240×240px).
- **tablet (640–1024px)** — modal centrado, `size="md"`. URL + Copiar inline.
- **desktop (> 1024px)** — modal centrado `size="md"` (max-w-lg). Layout idêntico ao tablet.
- **thumb zone** — em mobile, botão "Copiar" e ação primária ("Gerar link" / "Concluir") na metade inferior, alcance natural do polegar.

### Acessibilidade

- Input read-only do URL: `aria-readonly="true"`, foco move automático ao entrar em `created`, seleção total via `e.target.select()`.
- Botão Copiar: `aria-label="Copiar URL do link compartilhável"`. Após click, `aria-live="polite"` anuncia "Copiado".
- QR code: `<img alt="QR code do link compartilhável">` + texto abaixo: "Escaneie para abrir em outro dispositivo".
- Aviso de escopo (inline-alert info) sempre presente em `create` — leitor de tela lê antes do botão Gerar.
- Revogação: confirm-modal aninhado tem `role="alertdialog"` (intenção destrutiva).
- Foco retorna ao botão "Compartilhar" do dashboard ao fechar.
- Contraste AA em todos os tokens.

### Cores e tokens

- `bg-background` — superfície do modal (herdado).
- `border-border` — bordas dos chips de dashboard, card de link em `manage`.
- `bg-muted` — fundo do input read-only de URL.
- `text-foreground` / `text-muted-foreground` — texto principal / metadados ("Criado há 5 dias").
- `bg-x-info/10` + `text-x-info` — inline-alert do escopo.
- `bg-x-success/10` + `text-x-success` — inline-alert "Link gerado".
- `bg-x-error/10` + `text-x-error` — falhas de geração/revogação.
- `bg-primary text-primary-foreground` — botão "Gerar link", "Copiar".
- `bg-destructive text-destructive-foreground` — botão "Revogar" (confirm aninhado).
- `text-x-warning` — chip "Expira em X dias" quando < 3 dias (aviso de fim próximo).

### Composição

- **Compõe**: [[modal]] (`kind="form"`), [[button]], [[form-field]] (TTL select, interval input), [[inline-alert]] (escopo info, success/error), `Phosphor Copy` (botão copiar), `Phosphor Check` (feedback copiado), `Phosphor QrCode` (toggle QR), `Phosphor Trash` (revogar), `Phosphor Star` (favorito), `Phosphor Plus` (adicionar dashboard), `Phosphor X` (remover dashboard da lista).
- **É composto por**: [[dashboard]] (header → botão "Compartilhar" → este modal).

## Componente: `share-page`

### Propósito

Superfície pública que renderiza o(s) dashboard(s) associado(s) ao token. Read-only, chrome mínimo, fora do [[app-shell]].

### API conceitual

| Propriedade | Tipo conceitual | Default | Efeito |
|---|---|---|---|
| `token` | string | — | Lido da rota `/share/dashboard/:token`. |
| `tokenState` | `loading` \| `valid` \| `expired` \| `revoked` \| `not-found` \| `network-error` | `loading` | Resolvido após primeira chamada ao backend (`GET /api/share/<token>/meta`). |
| `meta` | `{scope, dashboards[], rotateInterval?, brandingMode?}` | — | Carregado quando `tokenState='valid'`. |
| `theme` | `light` \| `dark` \| `auto` | `auto` | Tema da página pública. Honra `prefers-color-scheme`; sem toggle visível (kiosk default). Override via query `?theme=dark` se backend permitir. |
| `kioskMode` | booleano | derivado | Quando `true` (default em viewport ≥1024px ou via query `?kiosk=1`), oculta logo + cursor após inatividade. |

### Estrutura visual

```
Desktop (kiosk-ready):
┌──────────────────────────────────────────────────┐
│                                                  │
│   [Dashboard ocupa quase a viewport inteira]     │
│   (mesmo renderer de [[dashboard]] em            │
│    mode='exhibition')                            │
│                                                  │
│                                                  │
│                                                  │
│                                                  │
│                            Director.Studio ⓘ    │  ← canto inferior direito
└──────────────────────────────────────────────────┘
                                       text-xs
                                       text-muted-foreground
                                       hover:text-foreground
```

```
Mobile:
┌──────────────────────┐
│                      │
│  [Dashboard stack    │
│   vertical scroll]   │
│                      │
│  widget 1            │
│  widget 2            │
│  widget 3            │
│  widget 4            │
│                      │
│   Director.Studio    │  ← rodapé estático, não flutuante
└──────────────────────┘
```

### Estados

- **loading** — entrada na rota antes da resolução do token. Tela de splash discreta: logo `Director.Studio` centralizado, spinner `CircleNotch` (Phosphor) abaixo, `bg-background`. Sem texto de "Carregando..." em telões (poluição visual); só em viewport < 640px aparece "Conectando…" em `text-muted-foreground text-sm`.
- **valid** — dashboard renderizado em `mode='exhibition'` ([[dashboard]]). Sem header de app, sem switcher (a rotação, se houver, é controlada internamente). Pull-to-refresh **desabilitado** (não é o usuário que decide refresh em kiosk).
- **expired** — empty-state full-page: ícone `ClockCountdown` (Phosphor) grande + título "Este link expirou" + descrição "O link compartilhado venceu em {data}. Solicite um novo ao gerador." + link discreto para `studio.codr`.
- **revoked** — empty-state similar: ícone `Prohibit` + título "Este link foi revogado" + descrição "O acesso a este dashboard foi desligado pelo gerador." Sem CTA (não há como o anônimo agir).
- **not-found** — empty-state: ícone `Question` + "Link inválido" + "Verifique se o endereço está correto." Sem revelar se o token existiu (anti-enumeração).
- **network-error** — `WarningCircle` + "Não foi possível conectar" + botão "Tentar novamente". Auto-retry exponencial (3 tentativas: 2s, 5s, 15s) antes de mostrar botão manual.
- **rotation-active** — apenas quando `meta.scope='rotation'`. Mini progress ring no canto inferior esquerdo (oposto ao logo), `text-muted-foreground`, mostra progresso até próximo dashboard. Hover/tap revela nome do próximo. Em kiosk total (sem cursor por 30s), some também.
- **idle-kiosk** — cursor escondido após 30s sem movimento (`cursor: none` no `body`). Movimento traz cursor de volta.

### Motion

- **entrada da página** — fade-in 300ms `slow` da splash; ao resolver token, cross-fade 200ms `normal` para o dashboard.
- **rotação entre dashboards** — cross-fade 300ms `slow`, controlado pelo [[dashboard]] (`rotation` prop).
- **expiração mid-session** — se token vencer durante uso (refresh do widget retorna 401), tela faz fade lento (500ms) para o estado `expired`. Não some abruptamente.
- **reduced-motion** — todas as transições viram fade puro 100ms.

### Responsivo

- **mobile (< 640px)** — stack vertical natural do [[dashboard]]. Footer "Director.Studio" estático ao final do scroll. Sem kiosk-cursor-hide (mobile não tem cursor). Pull-to-refresh desabilitado.
- **tablet (640–1024px)** — grid 2 colunas do dashboard. Logo flutuante canto inferior direito.
- **desktop (> 1024px)** — kiosk mode default: grid 2×2, logo flutuante, cursor auto-hide. Query `?kiosk=0` desliga auto-hide (modo apresentação interativa).
- **TV (≥ 1920px)** — grid 2×2 mantido (paridade legado). Tipografia escala via `clamp()` no [[dashboard]]. Footer logo `text-sm` em vez de `text-xs`.
- **viewport ultra-tall (orientação retrato em TV vertical)** — stack vertical com cards maiores. Detectado por `aspect-ratio < 1`. Spec do [[dashboard]] responsivo já cobre.

### Acessibilidade

- `<main role="main" aria-label="Dashboard compartilhado: {nomes}">`.
- Footer "Director.Studio" sempre keyboard-focusável (link discreto, mas alcançável via Tab).
- `tokenState` transitions anunciadas via `aria-live="polite"` (ex.: "Link expirado").
- Cursor-hide em kiosk não afeta navegação por teclado (focus visível sempre).
- Reduced-motion respeitado.
- Sem traps de tecla: usuário pode `Esc` (sem efeito por design — não há onde sair), Tab cicla logo+widgets focáveis.
- Contraste AA mantido mesmo em background full-bleed.

### Segurança e privacidade (camada UX)

- **Nenhum dado do gerador é exposto** ao consumidor do link (sem nome, email, foto, tenant). Header do dashboard em `mode='exhibition'` mostra **só o título do dashboard**, nunca "Compartilhado por @usuario".
- **Logs de acesso** ficam no backend, visíveis ao gerador via aba `manage` do `share-modal` (`accessCount`, `lastAccessedAt`). Anônimos, sem IP/user-agent expostos ao gerador (LGPD-safe; o gerador vê uso agregado, não rastreamento).
- **Sem fingerprinting** na `share-page`. Sem analytics de terceiros. Telemetria interna só com hash do token (server-side).
- **Token nunca em `Referer`** — `<meta name="referrer" content="no-referrer">` na rota `/share/*` previne vazamento ao clicar em links externos da página (ex.: o próprio logo `Director.Studio`).
- **Sem service-worker cache** do payload de dados (configuração + dashboard meta podem cachear; valores resolvidos dos widgets, não).

## Exhibition rotation (F059 follow-up)

A rotação entre dashboards é responsabilidade do [[dashboard]] (`rotation` prop). O `share-page` apenas **alimenta** o componente com `rotation.enabled=true` quando `meta.scope='rotation'`. Detalhes:

- Backend retorna `meta.rotateInterval` e `meta.dashboards[]` (com configs já resolvidas ou IDs para resolver).
- Frontend orquestra o ciclo (setTimeout/raf, paridade legado).
- Falha em um dashboard → pula para próximo + log local (não exibido em kiosk).
- Pausa manual (desktop interativo, `?kiosk=0`): tap/click no progress ring pausa; novo tap retoma.

Spec interna da rotação **não** explode aqui — vive em [[dashboard]]. F059 fica como aprimoramento de UX da rotação (ex.: transição diferenciada, pré-carregamento do próximo, indicador mais rico).

## Mobile considerations (resumo)

- `share-modal` vira drawer bottom; campos full-width; ação primária full-width próxima ao polegar.
- `share-page` vira stack vertical do [[dashboard]] sem chrome flutuante (logo no rodapé do scroll, não overlay).
- Auto-rotação **funciona em mobile**, mas o progress ring fica `text-xs` no rodapé acima do logo. Tap no ring abre bottom-sheet com lista dos dashboards do ciclo + posição atual.
- QR code do `share-modal` é especialmente útil em mobile (gerar link no celular, abrir em TV / outro device).

## Edge cases

- **TTL "Nunca"** — backend gera token sem `expiresAt`. UI mostra "Sem expiração" em vez de data; aviso adicional no `share-modal` em `text-x-warning`: "Links sem expiração permanecem ativos até revogação manual."
- **Rotação com 1 dashboard restante (outros revogados/deletados)** — `share-page` detecta via `meta`, degrada para modo `single` sem alarde (sem alerta no consumidor).
- **Todos os dashboards do link foram deletados** — token resolve para estado `not-found` (paridade UX com link inexistente, evita revelar que existia).
- **Catálogo do widget alterou** (`TBobjetos_dashboard` mudou após geração do link) — backend resolve com snapshot do momento (decisão server-side) ou retorna widget em estado `unknown` (renderer já trata em [[dashboard-widget]]).
- **Mudança de aplicação do dashboard** — link permanece válido (token é amarrado ao dashboard, não à aplicação corrente do gerador).
- **Gerador perde acesso à aplicação** (papel revogado em F008) — todos os links que ele gerou para dashboards daquela aplicação são automaticamente invalidados pelo backend (estado `revoked` para consumidores). UI no `share-modal manage` marca esses links com tag "Sem permissão" e oferece só "Remover".
- **Tema do consumidor ≠ tema do gerador** — `share-page` honra `prefers-color-scheme` do consumidor por default. Geradores podem fixar tema via query (`?theme=dark`) se quiserem padronizar o telão.
- **Embed em iframe** — `share-page` permite embed (sem `X-Frame-Options: DENY`) **opt-in por link**: opção no `share-modal` "Permitir embed em outros sites" (default `false`). Backend então emite `Content-Security-Policy: frame-ancestors *` ou lista específica.

## Anti-padrões legados corrigidos

| Gap legado (vide [[model-valor-dashboard]] §"Implicação de segurança") | Mandato no Studio |
|---|---|
| **L1** JWT de 30 dias **do gerador** carregado na URL | Token opaco escopado, sem credenciais do gerador. |
| **L2** Sem revogação | Server-revogável sempre, via aba `manage`. |
| **L3** Config codificada em base64 na URL (`?obj=`) | Backend resolve token → config. URL tem só o token. |
| **L4** Hash routing (`#/dashboard?`) | Path routing (`/share/dashboard/<token>`). |
| **L5** TTL fixo 30 dias hardcoded | TTL configurável (1d/7d/30d/nunca). |
| **L6** Sem UI de gestão de links ativos | Aba `manage` no mesmo modal. |
| **L7** Sem logs de acesso visíveis ao gerador | `accessCount` + `lastAccessedAt` exibidos. |
| **L8** Sem QR code (compartilhamento cross-device manual) | QR code embutido no estado `created`. |
| **L9** Página pública usa o mesmo shell autenticado (com header + sidebar visíveis se a sessão do gerador estiver ativa no mesmo browser) | Rota `/share/*` é **estrita fora** do [[app-shell]]; nunca renderiza chrome autenticado, mesmo com sessão paralela. |
| **L10** Sem `referrer policy` — token vazava em logs ao clicar em links externos | `<meta referrer no-referrer>` em `/share/*`. |
| **L11** Embed cross-site implícito | Embed opt-in com lista de origens permitidas. |

## Sinais ao curator

- **F056** — esta spec. Implementação cobre `share-modal` + `share-page` + rota dedicada + backend de token opaco.
- **F059** (já enfileirada) — refinamento de exhibition rotation. Spec da rotação em si vive em [[dashboard]]; F059 é UX de telão (pre-fetch, transições mais ricas, indicador de saúde dos dashboards no ciclo).
- **F-share-link-generic** (P3 sugestão) — promover `/share/<resource>/<token>` como família de URL para outros recursos no futuro (relatórios públicos, formulários abertos). Hoje só dashboards.
- **F-share-embed-allowlist** (P2 sugestão) — UI para o gerador listar origens permitidas no embed (em vez de "qualquer site"). Útil quando portais clientes querem embedar.
- **F-share-link-password** (P2 sugestão) — proteger link com senha (segundo fator simétrico). Reduz risco de vazamento. Não no MVP.
- **F-share-link-rate-limit** (backend, P1 antes de release público) — anti-enumeração de tokens + cap de requests por IP. Não-UX mas crítico.
- **`qr-code` primitivo** — componente reusável para gerar QR de qualquer URL. Sub-spec se reusado (export de relatórios, share de outros recursos).

## Notas para smith

- Rota TanStack: `/share/dashboard/$token` (não authenticated layout; root layout próprio sem [[app-shell]]).
- `meta` resolve via `GET /api/share/:token/meta` (sem auth header — token é o credential, no path). Cache curto (60s) ok no client; backend pode 304.
- Resolução de widgets na `share-page` chama `/api/share/:token/widget/:widgetId/data` (não as procs autenticadas do gerador). Backend medeia.
- `share-modal` reusa [[modal]] kind="form"; nenhum modal custom novo.
- Confirm-modal de revogação é aninhado — stack manager do [[modal]] cuida.
- Estados `expired`/`revoked`/`not-found` reusam vocabulário de `empty-state` / `error-state` (sub-spec futura) — não inventar overlays novos.
- Logo no rodapé é um simples `<Link>` com `Phosphor LightningSlash` discreto + label. Sem branding pesado.
- `cursor: none` em kiosk: usar CSS class `is-kiosk-idle` aplicada via timer + `pointermove` listener (re-armar a cada movimento, debounce 100ms).

## Notas vs legado (divergências conscientes)

- **Sem `?tkn=&obj=&interval=`** — toda a config vira responsabilidade do backend, identificada pelo token.
- **Sem `localStorage['@director/tkn']`** — token nunca persiste no client da `share-page`; cada request envia via Authorization header derivado da rota (ou cookie httpOnly emitido pelo `/meta` para fixar a sessão pública).
- **Sem `disableAppsRequest=true`/`disableInterval=true` props na `<DashBoard>`** — `mode='exhibition'` da [[dashboard]] já configura tudo.
- **Refresh interno por widget continua ativo** em `mode='exhibition'` (paridade visual com kiosk vivo). Diferente do legado que desligava (`disableInterval=true`) confiando só na rotação — Studio mantém auto-refresh por widget E rotação inter-dashboard, ambos coexistem.
- **QR code é nativo** — legado não tinha.
- **Embed controlado** — legado expunha sem CSP; Studio pede opt-in.

## Sources

- [[calendar/notes/2026-05-17.md]]
- [[atlas/concepts/legacy-contracts/model-valor-dashboard.md]] §"Modo exhibition standalone" + §"Implicação de segurança"
- [[dashboard]] §`shareState`, §`rotation`, §`mode='exhibition'`
- [[modal]] kind="form" + stack aninhado
- skill [[semantic-colors]], [[mobile-first-page]], [[vaul]]
