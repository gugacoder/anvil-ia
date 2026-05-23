# Processa OS — Mobile edition

Variante do `processa-os-fed` com **shell adaptativo** (desktop = window manager, mobile = SO iOS/Android-like) e **instalável como PWA** na home screen do celular.

Não substitui `-fed` — vive em paralelo, mesmas APIs, apps compartilhados via Module Federation.

## Quando usar

- Desktop: experiência idêntica ao `-fed` (janelas, dock, top bar)
- Mobile: home screen iOS-style, app switcher, gestos, notification shade, dynamic theming a partir do wallpaper

## Portas

| Processo        | Porta | Papel                                                     |
|-----------------|------:|-----------------------------------------------------------|
| `apps/server`   |  5640 | Hono: APIs (`/so/api/v1/*`), registry, prod dist server   |
| `apps/shell`    |  5641 | Vite shell SPA (proxy reverso em dev)                     |
| `apps/chat`     |  5642 | Vite SPA do Chat Anvil (`base: /so/chat/`)                |
| `apps/notas`    |  5643 | Vite SPA das Notas (`base: /so/notas/`)                   |

## Dev

```bash
npm install
npm run dev
# abre http://localhost:5641/so/
```

## Instalar como PWA (mobile)

1. Acesse `http://<seu-ip-lan>:5641/so/` pelo navegador do celular
2. Compartilhar → "Adicionar à tela de início" (iOS) ou banner automático (Android)
3. App abre em modo standalone — shell mobile entra em ação

## Arquitetura mobile

- **Form-factor router** (`useFormFactor`) decide entre `DesktopShell` e `MobileShell`
- **Mobile shell** = home screen (grid + dock) + fullscreen app runtime + gestures
- **Apps** (`chat`, `notas`) viram fullscreen no mobile sem alteração
- **PWA**: manifest + service worker + safe-area handling
