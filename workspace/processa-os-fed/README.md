# Processa OS — Hub edition

Variante NIC-style do `processa-os`. Mesmo shell, mas com apps Chat e Notas extraídos como **Vite SPAs separadas** rodando em portas próprias e proxiadas via path prefix (`/so/chat/`, `/so/notas/`) — pattern do `D:/nic/workspace/nic/hub`.

| Processo        | Porta | Papel                                                     |
|-----------------|------:|-----------------------------------------------------------|
| `apps/server`   |  5620 | Hono: APIs (`/so/api/v1/*`), registry, prod dist server   |
| `apps/shell`    |  5621 | Vite shell SPA (faz o proxy reverso em dev)               |
| `apps/chat`     |  5622 | Vite SPA do Chat Anvil (`base: /so/chat/`)                |
| `apps/notas`    |  5623 | Vite SPA das Notas (`base: /so/notas/`)                   |

## Dev

```bash
npm install
npm run dev
# abre http://localhost:5621/so/
```

O **shell** (porta 5621) é quem o usuário acessa. Seu Vite proxia:

- `/so/api/*` → 5620 (server Hono)
- `/so/chat/*` → 5622 (chat SPA, WS/HMR transparente)
- `/so/notas/*` → 5623 (notas SPA)

Apps externos abrem dentro do shell por `<iframe src="/so/{slug}/">` — **mesma origem**, então o cookie `so_session` atravessa sem CORS.

## Registry

`GET /so/api/v1/apps` retorna manifesto de cada app. O shell lê isso na inicialização e monta ícones/dock dinamicamente. Adicionar app = adicionar entrada no `apps-registry.ts` do server + criar pasta `apps/<slug>` Vite.

## Wallpaper

Paleta esmeralda/turquesa pra diferenciar visualmente do `processa-os` original (que usa violet).
