---
title: F007 — Decisões de implementação
tags: [effort, director-studio, backlog, F007, decisions]
created: 2026-05-15
---

# F007 — Decisões de implementação

## Empresa do super-user

O parâmetro `<empresa>` da proc `acesso.obter_acl_token` identifica o tenant
master. O branch canônico do super-user só ativa quando `(empresa='Processa', id_usuario=1)`.

Na nossa base de teste (Area 52 `DBdirector_imperial_logistica_29`), o usuário
`PROCESSA` (id=1) tem `nomeEmpresa='IMPERIAL LOG'`. Chamar a proc com
`empresa='IMPERIAL LOG'` retorna 0 módulos.

**Decisão**: backend detecta super-user (`id=1 && nome.toUpperCase()==='PROCESSA'`)
e força `empresa='Processa'` na chamada. Override explícito via
`STUDIO_EMPRESA` no `.env` se a base tiver convenção diferente.

Trade-off: heurística por nome do usuário. Aceita porque é o caso documentado
no contrato `[[menu-hierarquia]]`. Demais usuários usam `nomeEmpresa` direto —
ACL fina será feature da F008.

## Cache em Redis com TTL 60s

Contrato legacy usa cache de sessão sem invalidação (só limpa em logout).
Decidi adotar TTL curto (60s) porque:

1. Sem TTL, mudanças no ACL no banco só aparecem em re-login (igual legado, mas
   ruim em dev). 60s é "quase imperceptível" para o usuário e dá frescor.
2. Frontend ainda cacheia em `sessionStorage` (`studio:menu:v1`) — o Redis é só
   defesa contra spam do mesmo usuário. Frontend invalida em logout.
3. Override via `MENU_CACHE_TTL` no `.env`.

## Visibility (`DFexibir_menu`)

Olhando os dados reais: TODOS os itens vêm com `Visible=0` no XML e o legado os
exibe. Contrato `[[menu-hierarquia]]` registra que `defaultMapper` legado não
respeita esse campo — é bug documentado.

**Decisão**: filtro `isHidden(v)` retorna true APENAS quando `v.trim() === '1'`.
Qualquer outro valor (0, null, ausente, inválido) renderiza. Replica a
tolerância de fato do legado.

## Routing — TanStack Router

Adotei catch-all `/app/$` (rota wildcard) renderizada por `AppPage`. Vantagens:

- Não exige registry dinâmico de rotas a cada mudança de ACL.
- `AppPage` resolve a rota da URL contra a árvore do menu para titular e
  marcar item ativo.
- Página inexistente no menu cai num placeholder com mensagem explícita.
- F009 (engine schema-driven) só precisa preencher o conteúdo do placeholder.

## Icones — Phosphor mapping

Legado usa classes CoreUI (`cil-calendar`, `cil-list`, etc.). Mapeei as mais
comuns para ícones Phosphor (`Calendar`, `ListBullets`, etc.) em
`sidebar-menu.tsx`. Não-mapeados caem em `File` (folha) ou `Folder` (módulo).

Trade-off: lista hardcoded em vez de tabela externa. Aceito porque o conjunto
de ícones CoreUI usados pelo Processa é pequeno e estável — quando F009 popular
páginas e mais ícones surgirem, estende o mapping.

## Grupos acumulativos

Spec `[[sidebar]] §80` decide acumulativo (legado era mutuamente exclusivo).
Implementado: `Set<id>` persistido em `localStorage:director-studio:sidebar-groups`.
Auto-abre o grupo que contém a rota ativa no mount inicial.

## Modo rail

Grupo no rail abre **popover lateral** (não expande inline). Cada popover lista
as páginas filhas. Spec `[[sidebar]] §66`.
