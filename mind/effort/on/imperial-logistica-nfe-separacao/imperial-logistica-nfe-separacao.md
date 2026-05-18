---
title: "Imperial Logística — NFE → pedido de separação (lado Anvil)"
aliases: [imperial-logistica-nfe-separacao]
tags: [effort, imperial-logistica, nfe, romaneio, director, importador]
status: on
substatus: coletando-info
started: 2026-05-17
client: imperial-logistica
parceria: Nic + Anvil
---

# Imperial Logística — NFE → pedido de separação

Contraparte Anvil da frente que o Nic abriu em [[nic:imperial-logistica-nfe-pedido-separacao]]. A Imperial é operador logístico: a NFE que chega precisa virar **pedido de separação (romaneio)**, não entrada fiscal — caminho que o importador atual do Director não cobre.

Esta frente é o **primeiro impedimento sistêmico** que a dupla implantação+IA (Nic + Anvil) tenta resolver sem escalar pro time de devs Processa.

## Estado

Brief do Nic lido em 2026-05-17. Spec do Everton ainda não chegou; handshake Nic↔Anvil via `agent-chat` está travado até spec consumível.

Decisão 2026-05-17: avançar coleta de info em paralelo com **Everton** (negócio/spec) e **Luiz Paulo** (técnico/Director). Sem isso, qualquer desenho de implementação é especulativo.

## O que falta saber

**Do Everton** (spec de negócio):
- Fluxo: quem emite a NFE, quem é destinatário, papel fiscal exato da Imperial.
- Estrutura do romaneio que precisa sair (campos, formato).
- Mapeamento NFE → pedido de separação (itens, lote, endereço de armazenagem, prazo).
- Tratamento fiscal — Imperial não escritura, mas rastreia como?
- Casos de borda: NFE parcial, devolução, troca de destinatário, cancelamento.

**Do Luiz Paulo** (técnico Director):
- **ID da interface do importador NFE atual** — gatilho para localizar o ponto exato no fonte onde o caminho "vira entrada de nota" precisa ser bifurcado.
- Modelo nativo de pedido de separação / romaneio no Director (existe? ou criar?).
- Módulo de endereçamento/WMS — Imperial usa?
- Validação de tributação (apontamento do portfólio).

## Próximas ações

- Coletar spec com o Everton.
- Coletar ID da interface + contexto técnico com o Luiz Paulo.
- Ao receber ID da interface → mapear ponto de bifurcação no fonte e registrar como contrato em `atlas/concepts/legacy-contracts/`.
- Quando spec amadurecer → abrir chat Nic↔Anvil via skill `agent-chat`.

## Referências

- [[nic:imperial-logistica-nfe-pedido-separacao]] — frente espelho no mind do Nic (fonte da spec).
- Snapshot do portfólio (Nic): item "Importação XML Nota Fiscal de Entrada (Em desenvolvimento) — Tributação será necessário validar".
