# Apps Federados no Processa OS

> Guia para implementadores externos. Como criar um app que se integra no Processa OS via Module Federation, com suporte completo a multi-instância, retenção de estado, indicadores de status, autenticação e theming.

---

## 0. Visão geral

O Processa OS é um shell (host) escrito em React + Vite + Module Federation. Ele descobre apps via `GET /so/api/v1/apps` (registry no server) e renderiza cada um conforme o `kind`:

- **internal**: bundled no próprio shell (caso especial, rotina interna).
- **federated**: Vite SPA independente, com `remoteEntry.js` próprio, carregado em runtime via `@originjs/vite-plugin-federation`.

Federados **não rodam em iframe**. São módulos React que compartilham `react`/`react-dom` com o shell. A árvore React é única. Isso traz consequências importantes:

- O CSS do app é carregado *à parte* (não vem junto do bundle JS exposto). O shell injeta um `<link>` para `/so/<slug>/assets/styles.css` no `<head>` do host.
- O app **não pode importar de `apps/shell`** — bundles são separados, builds são independentes.
- O app **pode** consumir contratos via React Context (porque a árvore é compartilhada) ou via globais (`window.__pos`).

---

## 1. Contrato app ↔ shell

### 1.1 AppInstanceProps

Toda renderização do seu app feita pelo shell entrega estas props:

```ts
interface AppInstanceProps {
  instanceId: string;           // id único da instância (appId em mobile/workspace; windowId em desktop)
  initialPath?: string;         // rota inicial sugerida (default "/")
  onPathChange?: (p: string) => void;  // app reporta path corrente ao shell
  onTitleChange?: (t: string) => void; // app reporta título dinâmico (header de janela)
  formFactor: "desktop" | "mobile";
}
```

Regras:

- `instanceId` é **estável durante a vida da instância** mas pode haver várias por app (multi-instância no desktop). Use-o pra escopar todo estado local.
- `initialPath` é a entrada do seu roteador interno. Use **MemoryRouter** (não BrowserRouter — a URL pertence ao shell, não a você).
- `onPathChange` permite que o shell rastreie a rota interna pra rehidratar em reload e pra "Duplicar com path corrente" no desktop.
- `onTitleChange` é opcional — útil quando o título depende de conteúdo (ex: nome da conversa).
- `formFactor` indica densidade. Não use isso pra decidir layout responsivo — esse é trabalho de `@media`/`matchMedia` dentro do seu app. Sirva apenas como hint pra UX (touch targets, fontes).

### 1.2 Default export

Seu pacote federado deve exportar default um React component compatível com `AppInstanceProps`:

```ts
// src/app.tsx
export default function App(props: AppInstanceProps = {}) { /* ... */ }
```

Aceite `props` como objeto vazio também — quando rodando standalone (sem shell, ex: dev em `/so/<slug>/`), você não recebe props.

---

## 2. Estrutura do projeto

```
apps/<seu-slug>/
├── package.json
├── vite.config.ts          # plugin federation, expõe ./App
├── tsconfig.json
├── index.html              # standalone (dev)
└── src/
    ├── main.tsx            # bootstrap standalone
    ├── app.tsx             # default export federado
    ├── pos-storage.ts      # cópia do helper (ver seção 4)
    └── ...
```

### 2.1 vite.config.ts

```ts
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import tailwindcss from "@tailwindcss/vite";
import federation from "@originjs/vite-plugin-federation";

export default defineConfig({
  base: "/so/<seu-slug>/",
  plugins: [
    react(),
    tailwindcss(),
    federation({
      name: "<seu-slug>",
      filename: "remoteEntry.js",
      exposes: { "./App": "./src/app.tsx" },
      shared: ["react", "react-dom"],
    }),
  ],
  build: {
    target: "esnext",
    cssCodeSplit: false,                 // 1 único bundle CSS
    rollupOptions: {
      output: {
        assetFileNames: (info) =>
          info.name?.endsWith(".css") ? "assets/styles.css" : "assets/[name]-[hash][extname]",
      },
    },
  },
  server: { port: 56XX, strictPort: true },
});
```

**Crítico**: `cssCodeSplit: false` + `assetFileNames` garante que o CSS sai num arquivo fixo (`styles.css`) que o shell consegue carregar.

### 2.2 Registro no server

Edite `apps/server/src/routes/apps.ts` adicionando seu app:

```ts
{
  slug: "<seu-slug>",
  label: "Seu App",
  icon: "Calendar",                       // nome de ícone lucide
  kind: "federated",
  basePath: "<seu-slug>",
  devPort: 56XX,
  defaultSize: { w: 900, h: 600 },        // tamanho default no desktop
  order: 99,
  multi: true,                            // permite múltiplas janelas no desktop
  defaultPath: "/",
}
```

E em `apps/shell/src/apps/registry.tsx`, adicione o loader:

```ts
const FEDERATED_LOADERS = {
  // ...
  "<seu-slug>": () => import("<seu-slug>/App"),
};
```

E declare o módulo em `apps/shell/vite.config.ts`:

```ts
federation({
  remotes: {
    "<seu-slug>": "/so/<seu-slug>/assets/remoteEntry.js",
  },
}),
```

Mais o proxy dev:

```ts
server: {
  proxy: {
    "/so/<seu-slug>": { target: "http://localhost:56XX" },
  },
},
```

---

## 3. Backend e autenticação

O shell mantém sessão via cookie `httpOnly` (mesmo origin: `localhost:5641` → `localhost:5640` proxiado em `/so/api`). Seu app federado **herda** essa sessão automaticamente porque:

- Roda no mesmo origin do shell.
- `fetch(url, { credentials: "include" })` envia o cookie.

Para chamar a API:

```ts
const ENDPOINT = "/so/api/v1";

async function jsonFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${ENDPOINT}${path}`, {
    credentials: "include",
    headers: { "Content-Type": "application/json", ...(init?.headers ?? {}) },
    ...init,
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return r.json() as Promise<T>;
}
```

Se o backend do seu app precisa de rotas próprias, adicione-as em `apps/server/src/routes/<seu-slug>.ts` e monte em `apps/server/src/index.ts`. Todas as rotas devem viver sob `/so/api/v1/` por convenção.

Quando o cookie está ausente/expirado, sua rota deve responder 401 e o app deve renderizar um estado "guest" amigável (não redirecionar — o shell controla login).

---

## 4. Retenção de estado

Esta é a parte mais importante. O Processa OS oferece um contrato simples para que apps preservem estado em três cenários:

| Cenário                              | Quem garante  | Como funciona                                                         |
|--------------------------------------|---------------|------------------------------------------------------------------------|
| Alternar pra outro app e voltar      | **Shell**     | Apps abertos ficam montados; só foreground fica visível.              |
| Reload da página (browser)           | **App**       | Use `useAppStorage` para persistir em localStorage com a convenção.   |
| Logout / fechar app                  | **Shell**     | Limpa as chaves do prefixo namespaceado automaticamente.              |

### 4.1 Convenção de chave

Toda chave de estado de app no localStorage segue:

```
pos:state:<sub>:<scope>:<key>
```

- `<sub>` = id do usuário logado (`window.__pos.sub`).
- `<scope>` = `instanceId` recebido via props (isola janelas no desktop).
- `<key>` = nome livre escolhido pelo seu app (ex: `last-path`, `draft.<noteId>`, `selected-tab`).

O shell limpa todo o prefixo `pos:state:<sub>:` no logout e `pos:state:<sub>:<scope>:` ao fechar a janela. Se você não seguir essa convenção, seu lixo fica.

### 4.2 Acesso ao `sub` corrente

O shell publica um global ao boot e atualiza em login/logout:

```ts
interface PosRuntime { sub: string | null; }
declare global { interface Window { __pos?: PosRuntime; } }

function currentSub(): string {
  return window.__pos?.sub ?? "anon";
}
```

`"anon"` é o fallback quando o app roda standalone (fora do shell).

### 4.3 Helper `useAppStorage`

Copie este arquivo pra `src/pos-storage.ts` do seu app:

```ts
import { useCallback, useEffect, useRef, useState } from "react";

interface PosRuntime { sub: string | null; }
declare global { interface Window { __pos?: PosRuntime; } }

function currentSub(): string {
  if (typeof window === "undefined") return "anon";
  return window.__pos?.sub ?? "anon";
}

function stateKey(sub: string, scope: string, key: string) {
  return `pos:state:${sub}:${scope}:${key}`;
}

function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = window.localStorage.getItem(key);
    if (raw == null) return fallback;
    return JSON.parse(raw) as T;
  } catch { return fallback; }
}

function saveJSON(key: string, value: unknown) {
  try { window.localStorage.setItem(key, JSON.stringify(value)); } catch {}
}

export function useAppStorage<T>(
  scope: string,
  key: string,
  initial: T,
): [T, (next: T | ((prev: T) => T)) => void] {
  const fullKey = stateKey(currentSub(), scope, key);
  const initialRef = useRef(initial);
  const [value, setValueState] = useState<T>(() =>
    loadJSON<T>(fullKey, initialRef.current),
  );
  useEffect(() => {
    setValueState(loadJSON<T>(fullKey, initialRef.current));
  }, [fullKey]);
  const setValue = useCallback(
    (next: T | ((prev: T) => T)) => {
      setValueState((prev) => {
        const resolved = typeof next === "function" ? (next as (p: T) => T)(prev) : next;
        saveJSON(fullKey, resolved);
        return resolved;
      });
    },
    [fullKey],
  );
  return [value, setValue];
}
```

### 4.4 Uso

```ts
function App(props: AppInstanceProps = {}) {
  const scope = props.instanceId ?? "solo";
  const [lastPath, setLastPath] = useAppStorage<string>(scope, "last-path", "/");
  const initialPath = props.initialPath && props.initialPath !== "/" ? props.initialPath : lastPath;

  return (
    <MemoryRouter initialEntries={[initialPath]}>
      <RouteSync onPathChange={(p) => {
        setLastPath(p);
        props.onPathChange?.(p);
      }} />
      {/* ... */}
    </MemoryRouter>
  );
}
```

**Padrões úteis**:

- **Selecionar último item aberto**: `useAppStorage(scope, "active-id", null)`.
- **Draft de input**: `useAppStorage(scope, "draft.<entityId>", "")` — salva enquanto o user digita; limpa após o save real (server).
- **Toggle de UI persistido**: `useAppStorage(scope, "sidebar-open", true)`.

### 4.5 O que NÃO persistir

- Listas vindas do server (busque do server a cada mount — fonte da verdade).
- Tokens, dados sensíveis (cofre é cofre).
- Dados grandes (> 50KB). localStorage é limitado.

---

## 5. Multi-instância (desktop)

No layout **windowed** do desktop, o user pode abrir várias janelas do mesmo app. Cada uma é uma instância isolada:

- `instanceId` distinto por janela.
- Estado `useAppStorage(instanceId, ...)` isolado naturalmente.
- O shell mostra "Nova janela" e "Duplicar com path corrente" no menu da janela.

Pra suportar duplicação correta:

1. Reporte sua rota interna via `onPathChange`.
2. Aceite `initialPath` e use no `<MemoryRouter initialEntries={[initialPath]}>`.

Sem isso, "Duplicar" cria uma janela nova na rota raiz, em vez da rota atual.

---

## 6. Responsividade

O shell decide qual *layout* renderizar (mobile / workspace / windowed) por viewport. Mas **dentro do seu app**, você é responsável pelo layout interno. Use:

```ts
function useIsNarrow(): boolean {
  const [narrow, setNarrow] = useState(() =>
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 640px)").matches,
  );
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    const onChange = () => setNarrow(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);
  return narrow;
}
```

Quando o app está em uma janela pequena no desktop, ele se comporta como mobile — esse hook resolve isso sem depender de `formFactor`.

---

## 7. Theming

O shell aplica tema (claro/escuro) e cor de accent via classes Tailwind no `<html>`. Seu app **herda** automaticamente porque está na mesma árvore DOM. Para que isso funcione:

1. Importe o mesmo CSS base do shell. O mais simples é usar Tailwind com a mesma config (cores semânticas).
2. **Não defina cores hard-coded**. Use classes semânticas: `bg-background`, `text-foreground`, `bg-card`, `text-muted-foreground`, `bg-primary`, `text-primary-foreground`, `border-border`, `ring-primary/50`, etc.
3. Se precisar verificar tema corrente em runtime: `document.documentElement.classList.contains("dark")`.

Cores semânticas suportadas (mesmas do shell, via shadcn convention):

| Classe                  | Quando usar                            |
|-------------------------|----------------------------------------|
| `bg-background`         | Fundo da janela/app                    |
| `bg-card`               | Painéis/cards                          |
| `text-foreground`       | Texto principal                        |
| `text-muted-foreground` | Texto secundário                       |
| `text-primary`          | Destaque, ações ativas                 |
| `bg-primary` + `text-primary-foreground` | Botões primários       |
| `border-border`         | Bordas e divisórias                    |
| `ring-primary/50`       | Foco/seleção                           |
| `bg-accent`             | Hover de itens de lista                |

---

## 8. Roteamento interno

Use **MemoryRouter**, não BrowserRouter:

```tsx
<MemoryRouter initialEntries={[initialPath]}>
  <RouteSync onPathChange={props.onPathChange} />
  <Routes>
    {/* suas rotas */}
  </Routes>
</MemoryRouter>
```

O `RouteSync` é o bridge:

```tsx
function RouteSync({ onPathChange }: { onPathChange?: (p: string) => void }) {
  const loc = useLocation();
  useEffect(() => {
    onPathChange?.(loc.pathname);
  }, [loc.pathname, onPathChange]);
  return null;
}
```

Por que MemoryRouter:
- A URL do browser pertence ao shell — alterá-la quebraria o shell.
- Múltiplas janelas do mesmo app no desktop precisam ter rotas independentes.
- O shell rehidrata sua última rota via `initialPath` na próxima abertura.

---

## 9. Status do app (indicador visual)

O shell mostra três estados visuais para cada app:

| Estado     | Indicador                  | Significado                                          |
|------------|----------------------------|------------------------------------------------------|
| foreground | linha curta cor primary    | App está em foco agora                               |
| background | bolinha cor muted          | App está aberto mas não em foreground (state vivo)   |
| fechado    | nada                       | Sem instância aberta, sem state persistido           |

Você não controla esse indicador — o shell calcula a partir do estado interno (open list + foreground). Sua única responsabilidade é não burlar o ciclo de vida: **não tente "fingir" estar aberto** quando não está.

---

## 10. Notificações

Para emitir notificação ao usuário, faça `POST /so/api/v1/notifications` com:

```json
{ "kind": "note" | "chat" | "file" | "info" | "system", "title": "...", "body": "..." }
```

O shell renderiza no Notification Center e no toast stack. Não invente sistema de toast próprio.

---

## 11. Acessibilidade

- Todo botão sem texto visível precisa de `aria-label` ou `title`.
- Suporte navegação por teclado (Enter/Space em botões custom, ESC pra fechar modais).
- Respeite `prefers-reduced-motion` desativando animações pesadas.
- Use elementos semânticos (`<button>`, não `<div onClick>`).

---

## 12. Checklist final

Antes de submeter seu app:

- [ ] Default export aceita `AppInstanceProps`.
- [ ] Usa MemoryRouter com `initialEntries={[initialPath]}`.
- [ ] Reporta path via `onPathChange`.
- [ ] Persiste estado-chave via `useAppStorage(instanceId, ...)`.
- [ ] Roda standalone (`/so/<slug>/`) e federado (dentro do shell).
- [ ] CSS bundle único em `assets/styles.css`.
- [ ] Cores semânticas (sem hex hardcoded).
- [ ] Lida com 401 (sessão expirada) sem crashar.
- [ ] Registry do server atualizado com seu slug.
- [ ] Loader registrado em `registry.tsx` do shell.
- [ ] Proxy dev no `vite.config.ts` do shell.
- [ ] Testou em 3 layouts: mobile, workspace, windowed.

---

## 13. Referências

- Apps de exemplo: `apps/chat/`, `apps/notas/`, `apps/calendario/` (federados); `apps/shell/src/apps/ContadorApp.tsx` (interno, prova de retenção).
- Storage do shell: `apps/shell/src/lib/app-storage.ts`, `apps/shell/src/lib/use-app-storage.ts`.
- Runtime contract: `apps/shell/src/lib/pos-runtime.ts`.
- Status visual: `apps/shell/src/lib/use-app-status.ts`, `apps/shell/src/components/AppStatusIndicator.tsx`.
