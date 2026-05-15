---
name: stacks
description: Stack tecnologica do scaffold — backend (Node+Hono), frontend (Vite+React ou Next.js para landing pages). Use quando criar projetos, escolher dependencias ou validar stack.
---

# Stacks

## Backend (`@scaffold/backend`)

| Dependencia | Descricao |
|---|---|
| Node.js >= 20 | Runtime |
| TypeScript 5.9 | Tipagem estatica |
| Hono | Framework HTTP leve e performatico |
| @hono/node-server | Adapter Node.js para Hono |
| @hono/zod-validator | Middleware de validacao Hono + Zod |
| Zod | Schema validation |
| Pino | Logging estruturado (JSON) |
| pino-pretty | Formatacao legivel do Pino em dev |
| tsx | Dev runner com hot-reload (watch mode) |

## Frontend — App (`@scaffold/frontend`)

Stack padrao para aplicacoes (SPA/PWA):

| Dependencia | Descricao |
|---|---|
| React 19 | UI library |
| TypeScript 5.9 | Tipagem estatica |
| Vite 7 | Bundler e dev server |
| TanStack Router | Roteamento file-based com tipagem |
| Tailwind CSS 4 | Utility-first CSS |
| Radix UI | Primitivos de acessibilidade (base do shadcn) |
| shadcn/ui | Componentes prontos sobre Radix + Tailwind |
| Framer Motion | Animacoes declarativas |
| Vaul | Drawer mobile-first |
| class-variance-authority | Variantes de estilo para componentes |
| clsx + tailwind-merge | Composicao condicional de classes |
| tw-animate-css | Animacoes CSS para Tailwind |
| Phosphor Icons | Biblioteca de icones |
| vite-plugin-pwa | Service worker e manifest PWA |
| Fontsource | Inter, Plus Jakarta Sans, Lora, Roboto Mono |
| ESLint 9 + Prettier | Lint e formatacao |

## Frontend — Desktop Companion (`@scaffold/desktop`)

Stack para clientes desktop nativos que vivem no system tray (ex: `apps/desk-agent` / Coletivos Sentinela). **Não confundir com wrapper desktop do app inteiro** — este perfil é para clientes pequenos e dedicados que rodam ao lado do app web.

| Dependencia | Descricao |
|---|---|
| Tauri 2 | Wrapper nativo Rust + webview do SO (WebView2 / WKWebView / WebKitGTK). Bundle ~5–15 MB. |
| Rust (stable) | Core nativo, plugins Tauri, IO de áudio |
| React 19 + Vite 7 + TypeScript 5.9 | Webview interna (apenas pareamento e settings) |
| @workspace/ui | **Obrigatório** — consumido idêntico ao hub. Mesma identidade visual (Tailwind 4 + shadcn/ui v4 + Radix + Phosphor + Framer Motion + Vaul). |
| `tauri-plugin-notification` | Notificações nativas com actions (toast Windows, UNUserNotificationCenter macOS, libnotify Linux) |
| `tauri-plugin-deep-link` | Registra protocol handler (`coletivos://`) para receber links do hub |
| `tauri-plugin-single-instance` | Garante uma só instância; reabrir foca a janela existente |
| `tauri-plugin-autostart` | Inicia com o boot do SO (toggle em preferências) |
| `tauri-plugin-updater` | Atualizações assinadas via feed JSON |
| `tauri-plugin-stronghold` ou `keyring-rs` | Armazena `SystemKey` no keyring do SO |
| `rodio` (ou `kira`) | Reprodução de áudio em loop |
| `cpal` | Acesso direto a APIs de áudio (WASAPI / CoreAudio / ALSA-PulseAudio) — necessário para classificar a sessão como "Communications" e bypassar DnD em modo plantão |
| `rust-socketio` | Cliente Socket.IO para conectar em `apps/ws` |
| `keyring` | Acesso cross-platform ao credential store do SO (alternativa a stronghold) |

### Por que Tauri 2 e não Electron

- Bundle 10–20× menor.
- RAM idle ~3× menor.
- Webview do SO já vem instalado (Windows 11 e Mac modernos); WebView2 bootstrap é embutido no installer no Windows 10.
- Code signing e notarization seguem o mesmo fluxo, sem diferença operacional.

### Limitação a observar

A webview varia por SO (Chromium no Windows; Safari no macOS e Linux). Para UI de um companion app (pareamento + settings) é irrelevante — Tailwind, Radix e shadcn são standards suportados em todos. **Não use** features experimentais de Chromium recentes na webview do companion: `@container queries` muito novos, `:has()` em seletores complexos, novas APIs de mídia (WebCodecs, WebGPU), Compression Streams, FileSystem Access API. Se o componente exige algo do tipo, refatore para o subset comum dos três webviews — corte o risco na raiz, não dependa de detecção de features em runtime.

### Distribuição

- Instaladores assinados por SO: MSI (Windows), DMG (macOS notarizado), AppImage/deb (Linux).
- Banner de download dentro do hub web (em `/settings/devices`) — não pelo browser store.
- Auto-update via `tauri-plugin-updater` apontando para feed próprio (S3, GHCR ou endpoint do `apps/api`).

## Frontend — Landing Page

Para landing pages, **trocamos Vite por Next.js**:

| Dependencia | Descricao |
|---|---|
| Next.js (App Router) | SSR, SEO, performance para paginas publicas |
| React 19 | UI library |
| TypeScript 5.9 | Tipagem estatica |
| Tailwind CSS 4 | Utility-first CSS |
| shadcn/ui | Componentes prontos |
| Framer Motion | Animacoes declarativas |
| Phosphor Icons | Biblioteca de icones |

**Quando usar Next.js:** paginas publicas, SEO-critical, landing pages, marketing.
**Quando usar Vite:** apps autenticados, dashboards, PWAs, SPAs.

## Monorepo

| Dependencia | Descricao |
|---|---|
| npm workspaces | Gerenciamento de pacotes (`apps/*`, `packages/*`) |
| concurrently | Execucao paralela de scripts (dev) |
| dotenv-cli | Injeta `.env` nos scripts |
| Playwright | Testes E2E |
| sharp | Processamento de imagens (scripts de build) |

## Observacoes

- **shadcn nao eh dependencia de runtime** — os componentes sao copiados para o projeto via `npx shadcn`. O pacote `shadcn` no package.json eh apenas a CLI.
- **Icones: Phosphor Icons apenas** — Lucide nao eh usado neste projeto.
- **Logging: Pino apenas** — `console.log` eh proibido no backend.
- **`@scaffold/ui`** eh um pacote interno (`packages/ui`) que exporta componentes, hooks e utilitarios compartilhados entre apps.
