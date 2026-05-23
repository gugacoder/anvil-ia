---
title: "OpenClaude SDK + Chat"
aliases: [openclaude-sdk-chat, openclaude-sdk, openclaude-chat, codrstudio-openclaude]
tags: [biblioteca, sdk, chat, ai, vendorizado, integracao]
sources:
  - "calendar/notes/2026-05-22.md"
created: 2026-05-22
updated: 2026-05-22
---

# OpenClaude SDK + Chat

Par de pacotes `@codrstudio/openclaude-sdk` (backend: bridge SSE para Claude) e `@codrstudio/openclaude-chat` (frontend: componente React de chat) que juntos permitem embutir um chat AI em qualquer app. Vendorizados como `.tgz` em `vendor/` do projeto consumidor para evitar dependência do registry interno. Usados em pelo menos 3 projetos: NIC hub (`D:/nic/workspace/nic/hub`), jornada (`D:/nic/workspace/nic/jornada`) e [[processa-os]] (`workspace/processa-os/`).

## Key Points

- **SDK (backend)**: bridge SSE que conecta ao Claude API e streama respostas como `EventSource`. Rota típica: `apps/server/src/routes/ai.ts`. Aceita config de agente (nome, cwd, model) e retorna stream SSE com chunks de resposta.
- **Chat (frontend)**: componente React instalado via source-copy (`registry/install.mjs` do `.tgz` extraído). Integra com `components.json` do shadcn customizado do projeto consumidor. Exporta `<Chat>`, `<ChatHeader>`, `<HistoryTrigger>` entre outros.
- **Vendorização**: `dependencies: { "@codrstudio/openclaude-sdk": "file:../../vendor/<x>.tgz" }` em npm workspaces funciona limpo. Evita depender do registry interno e garante reprodutibilidade.
- **Peer dep não declarada**: `@codrstudio/openclaude-sdk@0.6.0` tem `zod` como peer dependency não declarada — causa `Cannot find package 'zod'` na primeira tentativa. Instalar `zod` explicitamente no host resolve.
- **API evolui rápido**: `ChatHeader` da v0.6.2 não tem prop `showHistoryTrigger` que exemplo anterior (jornada) usa — em vez disso, padrão de slot: `leftContent={<HistoryTrigger />}`. Verificar API da versão atual antes de copiar exemplos de outros projetos.

## Details

O par SDK+Chat é o mecanismo padrão para adicionar capacidade de chat AI em apps do ecossistema. O SDK faz o trabalho pesado no backend: gerencia sessões de chat, faz chamadas ao Claude API com streaming, e expõe os resultados como SSE. O Chat é o componente React que consome esse stream e renderiza a interface de conversa com suporte a markdown, code blocks, e histórico.

A instalação do Chat segue o padrão source-copy do shadcn: o `registry/install.mjs` copia componentes para o diretório configurado em `components.json`, adaptando imports e paths. Isso é diferente de uma dependência npm clássica — o código-fonte é copiado para o projeto e pode ser customizado. A vantagem é controle total sobre o componente; a desvantagem é que atualizações exigem reexecução do install e merge manual.

No [[processa-os]], o Anvil Chat é um app completo dentro do shell (abre como janela), com o agente `anvil` configurado para usar `cwd: D:/anvil`. O smoke test confirmou streaming funcional: turn real completou em 5.7s ($0.266) usando `claude-opus-4-6`, com notificação SSE chegando como toast no shell quando o turn termina. Esse padrão (app de chat como janela no OS, conectado a um agente com cwd específico) pode ser replicado para outros agentes ou contextos.

## Related Concepts

- [[processa-os]] — consumidor do par SDK+Chat como app Anvil Chat dentro do shell
- [[processa-os-federation]] — variante federada onde Chat é um remote Module Federation
- [[director-studio]] — projeto que compartilha stack (Vite+React+Hono) e poderia integrar chat AI no futuro

## Sources

- [[calendar/notes/2026-05-22.md]] — Session 15:00: vendorização via `.tgz` em npm workspaces; peer dep `zod` não declarada; `registry/install.mjs` para source-copy; evolução rápida da API (`ChatHeader` sem `showHistoryTrigger`); smoke test do Anvil Chat streamando turn real (5.7s / $0.266 / claude-opus-4-6) com SSE notification
