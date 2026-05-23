---
title: "Director.Studio — wave model (feature-locked)"
aliases: [wave-model, dwave, feature-locked-wave, director-studio-waves, ralph-loop]
tags: [projeto, director-studio, processo, execucao, harness]
sources:
  - "calendar/notes/2026-05-15.md"
  - "calendar/notes/2026-05-19.md"
created: 2026-05-19
updated: 2026-05-23
---

# Director.Studio — wave model (feature-locked)

Modelo de execução do [[director-studio]] onde cada **wave** foca em **uma única feature** do manifest, despacha o agente da fase atual (do [[director-studio-agent-team]]), commita o resultado, e avança para a próxima fase ou feature. Implementado como slash command `/dwave` que roda em `/loop` self-paced (o modelo decide o intervalo entre iterações).

## Key Points

- **Feature-locked**: cada wave trabalha em exatamente UMA feature do `feature-manifest.md`. Não há paralelismo entre features dentro de uma wave.
- **Fases sequenciais**: contract (archaeologist) → UX spec (designer) → implementation (smith) → test (ui-tester) → acceptance (curator). Cada fase produz um artefato que alimenta a próxima.
- **Self-paced loop**: `/loop /dwave` sem intervalo fixo — o modelo decide quando acordar baseado no que está esperando (build terminando, teste rodando, etc.).
- **Commit por fase**: cada fase concluída gera um commit. Isso mantém granularidade no histórico e permite rollback por fase.
- **Manifest-driven**: o curator mantém o `feature-manifest.md` com status por feature. O harness lê o manifest para decidir qual feature atacar e em qual fase está.
- **Stateless e sem argumentos**: `/dwave` não recebe feature por argumento — escolhe autonomamente a partir do manifest. Fila vive no manifest, não na cabeça do humano. Curator ajusta priority quando ambíguo.

## Details

A decisão pelo modelo feature-locked veio após hesitação entre duas alternativas: "wave = 1 agente fazendo tudo" vs "wave = 5 agentes colaborando em paralelo". A primeira é simples mas lenta; a segunda é rápida mas difícil de coordenar (agentes não invocam uns aos outros diretamente). O modelo feature-locked é o meio-termo: cada wave é um passo discreto — despacha o agente certo para a fase certa da feature certa, espera o resultado, commita, e avança.

O manifest seed inicial contém 27 features (F001-F027), e a cobertura RTM (Requirements Traceability Matrix) é 100% obrigatória — nenhuma feature é aceita sem que todas as assertivas do contrato correspondente estejam verificadas. Isso significa que o wave model não permite atalhos: mesmo features "simples" passam por todas as 5 fases. O curator tem poder de veto — se o ui-tester não validou, a feature não avança para `accepted`.

Na prática, o harness `/dwave` é um slash command que: (1) lê o manifest para encontrar a feature em curso, (2) identifica a fase atual, (3) despacha o agente correspondente via `Agent` tool, (4) recebe o resultado, (5) atualiza `progress-messages.txt`, (6) commita. O loop repete até todas as features estarem aceitas ou até encontrar um bloqueio que exija intervenção humana (como o bloqueio de F003 por falta de credencial, resolvido pela descoberta de [[validar-cript]]).

### Execução real: Ralph Loop (2026-05-19)

O harness Ralph executou 132 features (F001-F131, expandido do seed de 27) marcando todas como `accepted`. Porém, 50 foram bulk-deferred para cutover-fase-2, e o completion-promise `STUDIO-RTM-DONE` nunca foi atingido. Auditoria humana pós-harness via Chrome MCP (sessão 18:00) encontrou 9 débitos (F123-F131) que passaram pelo gate automático — evidência de que o harness mecânico produz cobertura mas não substitui juízo humano (ver [[anchor-mission-persona]] e [[connections/anchor-curator-quality-gate]]).

### Feature granularity

A granularidade de features segue a heurística: **feature = um contrato observável + asserções A1..An**. Pode ser tela inteira, renderer, fix de 1 linha, ou conceito transversal. Se a wave do smith vai durar >4h ou tocar >15 arquivos, quebrar. Anti-pattern: quebrar por tarefa-de-impl (F010a/b/c). Correto: quebrar por comportamento observável. Ver [[feature-granularity-heuristic]] para detalhes.

### Retrofit (projetos não-greenfield)

A recipe para aplicar o wave model a projetos existentes foi articulada na sessão 03:00 de 2026-05-19: (1) escrever MISSION+PERSONA (ver [[anchor-mission-persona]]); (2) catalogar features retroativamente como `Accepted=✓ (legacy)` sem auditoria; (3) auditar amostra de 3-5 features com critério novo (esperar 2-3 débitos/feature como baseline); (4) engatar harness nas features que precisam de trabalho.

## Related Concepts

- [[director-studio]] — projeto que este modelo executa
- [[director-studio-agent-team]] — os 5 agentes que o wave model orquestra
- [[validar-cript]] — exemplo de bloqueio resolvido durante execução do wave model (F003 login)
- [[acesso-metamodel]] — contratos extraídos pelo archaeologist alimentam as fases de implementação
- [[anchor-mission-persona]] — anchor que mantém o harness calibrado; sem ele, curator rubber-stamps
- [[feature-granularity-heuristic]] — como dimensionar features para as waves

## Sources

- [[calendar/notes/2026-05-15.md]] — decisão entre wave models; convergência em feature-locked; implementação como `/dwave` em `/loop`; manifest seed de 27 features; cobertura RTM 100%; bloqueio e destrava de F003
- [[calendar/notes/2026-05-19.md]] — Ralph Loop executou 132 features; auditoria pós-harness encontrou 9 débitos; confirmação de dwave stateless; heurística de granularidade; recipe de retrofit; agent-chat com NIC sobre metodologia
