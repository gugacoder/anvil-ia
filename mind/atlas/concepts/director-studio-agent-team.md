---
title: "Director.Studio — time de 5 agentes"
aliases: [agent-team, studio-agents, non-contamination]
tags: [projeto, director-studio, agentes, arquitetura, processo]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-19
updated: 2026-05-19
---

# Director.Studio — time de 5 agentes

O [[director-studio]] é construído por um time de **5 agentes especializados** com mandatos rígidos e separação estrita de responsabilidades. A regra central é o **princípio de não-contaminação**: o código legado (`sources/engenharia--fabrica--*`) só é lido pelo archaeologist, que publica contratos em `mind/atlas/concepts/legacy-contracts/`. Os demais agentes consomem apenas esses contratos — nunca o fonte original.

## Key Points

- **5 papéis fixos**: archaeologist (escava legado), designer (UX/design system), curator (manifest/escopo/aceitação), smith (implementação), ui-tester (testa no browser).
- **Princípio de não-contaminação**: smith **nunca** lê `sources/engenharia--fabrica--*`. Archaeologist é o único com essa permissão. Acoplamento entre legado e implementação acontece exclusivamente via contratos publicados em `legacy-contracts/`.
- **Sem invocação cruzada**: agentes não invocam uns aos outros diretamente. Orquestração acontece pelo principal via `progress-messages.txt` e o harness [[director-studio-wave-model]].
- **Mandatos complementares**: archaeologist nunca prescreve stack/componente; designer nunca codifica; smith nunca vê legado; curator e ui-tester também não leem fonte legada.
- **Comunicação via artefatos**: archaeologist → `legacy-contracts/`; designer → `ui-system/`; curator → `feature-manifest.md`; smith → código em `workspace/director-studio/`; ui-tester → relatórios de teste.

## Details

A separação nasceu da insistência do usuário em evitar que a implementação do Studio fosse "contaminada" pela arquitetura do legado .NET. O risco concreto: se o smith lê o código do Director.Web para entender como uma feature funciona, tende a replicar patterns .NET (middleware chains, service locator, etc.) em vez de pensar nativamente em Node/Hono/React. O archaeologist serve como tradutor — extrai o **contrato** (o que a feature faz, quais dados consome/produz, quais invariantes respeita) sem expor o **como** do legado.

O curator é dono do `feature-manifest.md` (seed inicial: 27 features F001-F027) e exige 100% de cobertura RTM (Requirements Traceability Matrix) — nenhuma feature é aceita sem que todas as assertivas do contrato correspondente estejam verificadas pelo ui-tester. Essa cadeia (contrato → UX spec → implementação → teste → aceitação) é o que o [[director-studio-wave-model]] orquestra feature por feature.

A decisão de 5 agentes (não 3 ou 7) reflete o pipeline natural do projeto: descoberta (archaeologist) → design (designer) → priorização (curator) → código (smith) → validação (ui-tester). Cada fase produz um artefato que alimenta a próxima, e o principal (operador humano + Claude Code) orquestra o fluxo.

## Related Concepts

- [[director-studio]] — projeto que este time constrói
- [[director-studio-wave-model]] — harness de execução que orquestra os agentes feature por feature
- [[acesso-metamodel]] — schema legado que o archaeologist documenta em contratos para o smith consumir
- [[react-tools]] — framework legado que o archaeologist analisa; smith nunca toca

## Sources

- [[calendar/notes/2026-05-15.md]] — decisão de 5 agentes com mandatos rígidos; princípio de não-contaminação; insistência do usuário em "plataforma única, sem .NET no servidor do cliente"; smith proibido de ler `sources/`; comunicação via artefatos publicados
