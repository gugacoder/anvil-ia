---
title: "Feature Granularity Heuristic"
aliases: [feature-granularity, feature-sizing, wave-feature-size]
tags: [methodology, agent-harness, director-studio, process]
sources:
  - "calendar/notes/2026-05-19.md"
created: 2026-05-23
updated: 2026-05-23
---

# Feature Granularity Heuristic

Heurística para dimensionar features no [[director-studio-wave-model]]: uma feature é **um contrato observável + asserções A1..An**. Pode ser uma tela inteira, um renderer, um fix de 1 linha ou um conceito transversal — a granularidade emerge do comportamento do legado (ou do domínio), não da implementação. Se a wave do smith vai durar >4h ou tocar >15 arquivos, quebrar.

## Key Points

- **Feature = contrato observável, não tarefa de implementação.** O recorte correto é por comportamento que o usuário/sistema percebe (login funciona, menu carrega, filtro aplica), não por passo de engenharia (criar componente, conectar API, escrever teste).
- **Anti-pattern: quebrar por tarefa-de-impl.** F010a "criar componente", F010b "conectar endpoint", F010c "adicionar testes" são três features falsas — são três passos da mesma feature F010. O contrato A1..An cobre o comportamento completo; as asserções não se dividem entre sub-features.
- **Heurística de quebra: >4h smith ou >15 arquivos.** Se o smith estima que vai demorar mais de 4 horas ou tocar mais de 15 arquivos, o escopo é grande demais para uma wave. Quebrar por comportamento observável (não por camada técnica).
- **Granularidade emerge do legado.** O archaeologist extrai o contrato do legado com asserções mecanicamente verificáveis. O tamanho natural do contrato é o tamanho natural da feature. Features artificialmente grandes (F999 "migrar todo o módulo WMS") ou artificialmente pequenas (F999a "cor do botão") indicam recorte errado.
- **Aplicável a retrofit (não-greenfield).** Em projetos já existentes, o catálogo retroativo usa a mesma heurística: cada feature corresponde a um comportamento observável que já existe, marcado como `Accepted=✓ (legacy)` sem auditoria inicial. Auditoria com critério novo vem em amostra de 3-5 features.

## Details

A heurística foi articulada durante agent-chat entre Anvil e NIC (2026-05-19, sessão 03:00). NIC perguntou sobre granularidade de features para o projeto Hub, que é parcialmente greenfield. A resposta distinguiu dois erros simétricos: features grandes demais (wave do smith vira maratona, commit perde granularidade, rollback fica caro) e features pequenas demais (overhead de 5 fases por feature, curator vira burocracia, manifest infla sem ganho).

O Director.Studio começou com 27 features (F001-F027) no manifest seed e expandiu para 132 ao longo da execução. A expansão não foi arbitrária: cada nova feature surgiu quando o archaeologist descobriu um contrato que não cabia numa feature existente (comportamento observável distinto, com asserções próprias). Features como F123 (ModelEngine `?app=appKey` — root cause de ~80% das telas erradas) emergiram da auditoria pós-harness: 1 linha de fix, mas contrato próprio com asserção verificável (trocar appKey muda a tela renderizada).

A regra de retrofit explicada ao NIC segue a mesma lógica: (1) escrever MISSION+PERSONA (ver [[anchor-mission-persona]]); (2) catalogar features existentes retroativamente, uma por comportamento observável, todas `Accepted=✓ (legacy)` sem auditoria; (3) auditar amostra de 3-5 features com critério novo (esperar 2-3 débitos/feature); (4) engatar o harness [[director-studio-wave-model]] nas features que precisam de trabalho. A heurística de granularidade governa o passo (2): se um "comportamento observável" é grande demais pra caber em uma wave, é sinal de que são dois comportamentos distintos.

## Related Concepts

- [[director-studio-wave-model]] — modelo de execução que consome features dimensionadas por esta heurística
- [[anchor-mission-persona]] — o anchor influencia o que conta como "comportamento observável" vs "detalhe de implementação"
- [[director-studio-agent-team]] — archaeologist é quem extrai contratos que definem o tamanho natural; curator valida se o recorte faz sentido
- [[director-studio]] — projeto com 132 features dimensionadas por esta heurística

## Sources

- [[calendar/notes/2026-05-19.md]] — sessão 03:00: NIC pergunta sobre granularidade; resposta com heurística >4h/>15 arquivos; anti-pattern de quebra por tarefa-de-impl; regra de retrofit em 4 passos; F123 como exemplo de feature de 1 linha com contrato próprio
