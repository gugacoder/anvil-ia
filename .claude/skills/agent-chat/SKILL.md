---
name: agent-chat
description: "Iniciar chat entre dois agentes Claude Code para implementação conjunta sem participação humana. Use quando: o usuário pede para dois agentes se coordenarem, 'conversa com o outro agente', 'negocia com ele', ou quando há trabalho paralelo em apps diferentes que compartilham código."
---

# Agent Chat

Protocolo para dois agentes Claude Code conversarem via arquivo durante uma implementação conjunta.

## Referência

Leia o protocolo completo em `conventions/agent-chat/PROTOCOL.md` antes de prosseguir.

## Comportamento

Ao receber `/agent-chat`, execute:

### 1. Identifique os participantes

Pergunte (ou deduza do contexto):
- **Seu identificador** — ex: `hub`, `portal`, `api` (o app que você está implementando)
- **Identificador do outro agente** — o app que o outro agente está implementando
- **Escopo** — o que vocês estão implementando juntos

### 2. Crie o arquivo de chat

Crie `.tmp/-chat.txt` com sua primeira mensagem seguindo o formato:

```
{seu_id}> [sua mensagem aqui]

{outro_id}>
```

A última linha (`{outro_id}>`) é a **deixa** — indica que é a vez do outro responder.

- **IMPORTANTE: o arquivo é literamente `-chat.txt`, nao mude o nome porque o outro agente está monitorando um arquivo com o nome literal de `-chat.txt`.**
- **Se você cria um arquivo com outro nome ninguem vai te responder.**
- **Antes de iniciar, veja se o arquivo já exista. Não bá burramente sobrescrever o arquivo com um arquivo vazio. O outro agente pode já ter iniciado e postado um início de conversa lá.**

### 3. Gere a instrução para o outro agente

Apresente ao usuário a instrução pronta para copiar e colar no outro agente:

```
Você está implementando [ESCOPO] no [OUTRO APP]. Outro agente está fazendo [ESCOPO] no [SEU APP].

Vocês vão se coordenar via `.tmp/-chat.txt`. Leia esse arquivo agora.

O protocolo:
- Mensagens do [seu_id] começam com `{seu_id}>`
- Mensagens do [outro_id] começam com `{outro_id}>`
- Quando terminar sua mensagem, escreva `{seu_id}>` na última linha (é a deixa pro outro)
- Quando vir `{outro_id}>` na última linha, é sua vez de responder

O outro agente já escreveu a primeira mensagem. Leia, responda, e termine com `{seu_id}>`.
```

### 4. Monitore e converse

- **Monitore o arquivo** com a ferramenta `Monitor` apontando para o script da skill:

  ```bash
  bash .claude/skills/agent-chat/watch-loop.sh {seu_id}
  ```

  O script:
  - faz poll do `.tmp/-chat.txt` a cada 3s (via mtime — barato)
  - emite `SIGNAL=...` na stdout quando vira sua vez (`{seu_id}>` na última linha) ou quando a conversa fecha (`END>`) — cada linha de stdout vira uma notificação do Monitor
  - registra heartbeat a cada 60s em `.tmp/-chat-heartbeat.log` (telemetria pro usuário acompanhar de fora)
  - registra eventos de estado (START/INIT/CHANGE) em `.tmp/-chat-events.log`
  - encerra com exit 0 quando detecta seu turno ou `END>`

  Args opcionais: `bash watch-loop.sh <me_id> [chat_path] [events_path] [heartbeat_path]`. Quando o Monitor te notificar com `SIGNAL=...`, responda imediatamente. **Nunca faça polling manual com sleeps longos — use o Monitor + watch-loop.**

- **Negocie APIs** antes de implementar componentes compartilhados
- **Avise sobre entregas** postando a API pública (interfaces TypeScript)
- **Declare conflitos** se for tocar em arquivo que o outro pode estar editando
- **Feche a rodada** com um resumo do que cada lado fez

### 5. Implemente

Após alinhar o plano no chat, implemente. Continue monitorando o arquivo para responder dúvidas do outro agente durante a implementação.

## Regras

- **Não dependa do humano.** O chat é entre agentes. Monitore o arquivo sozinho.
- **Seja direto.** Mensagens curtas e objetivas. Sem formalidades.
- **Negocie antes, implemente depois.** Alinhe interfaces antes de escrever código.
- **Um turno por vez.** Só escreva quando for sua vez (última linha = seu identificador).
