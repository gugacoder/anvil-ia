---
title: "Processa OS"
aliases: [processa-os, so-web, web-os, gnome-shell]
tags: [projeto, processa, pwa, shell, window-manager, prototype]
sources:
  - "calendar/notes/2026-05-22.md"
created: 2026-05-22
updated: 2026-05-22
---

# Processa OS

Protótipo de sistema operacional web da Processa — shell GNOME-like que hospeda apps como janelas com drag/resize/minimize/maximize. Inspirado em LinuxOS demo do Kimi (login violet, top bar com Activities/clock/tray, dock, janelas com min/max/close), NIC hub (proxy/shell de subapps) e jornada (bridge openclaude-sdk + openclaude-chat). Workspace em `workspace/processa-os/`, slug `/so/`.

## Key Points

- **Shell GNOME-like**: lock screen pt-BR violet, top bar (Activities/clock/tray), dock com ícones de apps, janelas com min/max/close. Window manager próprio em `apps/web/src/lib/windows.tsx` — drag/resize/z-index via hooks, sem libs externas.
- **Apps reais, sem mock**: Anvil Chat (via [[openclaude-sdk-chat]] + bridge SSE), Notas (CRUD JSON por usuário em `storage/data/notes-<sub>.json`), Arquivos (lista real de `storage/files/`), Sistema (theme + logout), Relógio (live + 4 fusos).
- **Auth simplificada (protótipo)**: aceita qualquer credencial, emite JWT em cookie httpOnly (`so_session`), rota `/so/api/v1/me`. Sem store de usuário — JWT carrega `sub/name/avatar` derivados. Produção exigirá integração com auth real da Processa.
- **SSE para notificações in-process**: bus emite eventos `system|chat|note|file|info`, frontend assina via `EventSource` e mostra contador no sino + toast de canto. Consistente com o padrão SSE (polling e WebSocket proibidos) adotado no ecossistema.
- **Stack idêntico ao Director.Studio**: Vite 7 + React 19 + Tailwind v4 + Hono. Single port em prod (server serve dist), Vite proxy em dev.

## Details

O Processa OS foi iniciado como frente paralela ao [[director-studio]] em 2026-05-22. Enquanto o Director.Studio substitui os frontends operacionais do ERP (AppBuilder, Portal, Director.Web/WMS, ADM), o Processa OS é uma camada acima — um ambiente desktop web que pode hospedar o próprio Studio e qualquer outro app como "janelas" dentro de um shell unificado. O conceito é ortogonal: Studio resolve "como renderizar apps Processa", OS resolve "como organizar a experiência de trabalho do operador".

O protótipo foi scaffoldado e smoke-testado na mesma sessão. O teste em Chrome confirmou: lock screen renderizando em pt-BR, login gerando JWT, desktop com ícones+dock+top bar, janelas arrastáveis/redimensionáveis, app Arquivos lendo `storage/files/` real, e Anvil Chat streamando turn real (5.7s / $0.266 / claude-opus-4-6) com notificação SSE chegando como toast ao fim do turn. O window manager é implementação própria (sem dependência de react-dnd, react-rnd ou similares) — hooks gerenciam z-index stack, posição, tamanho e estado min/max por janela.

A auth do protótipo é deliberadamente simplificada: aceita qualquer combinação login/senha e gera JWT com claims derivados. Em produção, a intenção é delegar para a auth real da Processa (provavelmente via AppBuilder ou ADM, replicando caminhos do [[processa-auth-paths]]). A decisão de cookie httpOnly é consistente com a abordagem do [[director-studio]] (cookie + sessão server-side, não localStorage).

Uma variante federada (**processa-os-fed**) em `workspace/processa-os-fed/` foi auditada na mesma data — ver [[processa-os-federation]] para a arquitetura Module Federation que permite apps como remotes React no mesmo DOM.

## Open Questions

- **cwd do Anvil em deploy real**: `D:/anvil` expõe mind/sources do agente — provavelmente necessário um cwd sandbox para o SO em produção.
- **UI de Notas não exercitada**: CRUD via API validado no smoke test, mas a interface de Notas no browser não foi testada.
- **Integração auth real**: quando sair do protótipo, decidir se auth delega para AppBuilder, ADM, ou bridge AWS diretamente.

## Related Concepts

- [[director-studio]] — projeto irmão que resolve renderização de apps ERP; OS é camada acima (ambiente desktop)
- [[openclaude-sdk-chat]] — par SDK+UI usado no app Anvil Chat dentro do OS
- [[processa-os-federation]] — variante arquitetural com Module Federation (apps como remotes)
- [[processa-auth-paths]] — modelo de auth que a versão de produção precisará integrar

## Sources

- [[calendar/notes/2026-05-22.md]] — Session 15:00: scaffolding completo do protótipo; stack decisions; apps reais com Anvil Chat streamando; window manager próprio; SSE notifications; smoke test verde em Chrome
