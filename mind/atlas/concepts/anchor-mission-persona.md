---
title: "Anchor (MISSION + PERSONA)"
aliases: [anchor, mission-persona, anchor-concept]
tags: [methodology, agent-harness, quality, director-studio, meta]
sources:
  - "calendar/notes/2026-05-19.md"
created: 2026-05-23
updated: 2026-05-23
---

# Anchor (MISSION + PERSONA)

Conceito metodológico que designa a combinação de **MISSION** (norte abstrato do projeto — o que ele existe pra resolver) e **PERSONA** (rosto humano concreto do usuário-alvo — quem sofre o problema, em que contexto, com que vocabulário e restrições). Juntos formam o "anchor" — a âncora que impede o agente e o time de derivar para trabalho auto-referente (código que serve ao código, refactor que serve ao refactor).

## Key Points

- **MISSION sem PERSONA é abstrata demais.** Um norte como "unificar apps Processa em um runtime Node" é direcional mas não discrimina decisões de UX. Curator sem PERSONA aceita qualquer coisa que compile.
- **PERSONA sem MISSION é anedótica.** Conhecer o operador de WMS no depósito não ajuda se o agente não sabe que o objetivo é eliminar .NET local. A PERSONA dá textura; a MISSION dá direção.
- **Anchor puxa pra fora do código.** Código tem gravidade própria — a tendência natural é refatorar pra refatorar, abstrair pra abstrair, otimizar pra otimizar. O anchor contrapõe: "isto serve ao usuário real?". O teste é: se a PERSONA não nota a diferença, o trabalho provavelmente não era prioritário.
- **Anti-pattern flags (🚩) só funcionam com anchor.** O formato `🚩 [bait curto] — [1 linha por quê]` (ex: `🚩 generic AI aesthetic — parece template Vercel, não ferramenta de operador`) exige contexto humano concreto pra ser aplicável. Sem PERSONA, os flags viram checklist genérica.
- **Termo cunhado pelo usuário** na sessão de 2026-05-19, ao explicar o método do Director.Studio para o agente NIC.

## Details

A descoberta do conceito emergiu durante um agent-chat entre Anvil e NIC (instância Claude Code em `D:/nic/`, projeto Hub). NIC perguntou qual era o "anchor" que mantinha o harness [[director-studio-wave-model]] produzindo trabalho de qualidade ao longo de 132 features. A resposta foi que MISSION e PERSONA são inseparáveis — nenhuma sozinha basta.

O anti-pattern mais revelador é o **curator rubber-stamper**: sem PERSONA, o curator aceita qualquer feature que passe nos testes técnicos (compila, tipos batem, contrato respeitado). O que falta é o juízo de "isso parece uma ferramenta que o operador real usaria no celular entre duas entregas no depósito?". Esse juízo exige saber quem é o operador, onde ele está, que device usa, que luz tem, quanto tempo tem. PERSONA fornece essas coordenadas; MISSION diz por que importa resolver.

Na prática, o anchor se manifesta nos anti-pattern flags que o curator e o ui-tester aplicam durante aceitação. Os top 5 flags usados na auditoria do Director.Studio (2026-05-19) foram: (1) `🚩 generic AI aesthetic` — parece template gerado, não ferramenta operacional; (2) `🚩 parece-o-legado` — funciona mas reproduz padrões .NET no React; (3) `🚩 isMobile no JSX` — branching por device em vez de design responsivo contínuo; (4) `🚩 desktop-adapted-to-mobile` — página pensada desktop com breakpoint grudado; (5) `🚩 componente fora de packages/ui` — widget reusável hardcoded em um app. Todos exigem contexto de PERSONA pra serem aplicáveis (o que é "genérico" depende de pra quem; o que é "legado" depende do que queremos ser).

Para projetos em retrofit (não greenfield), a receita de engajamento do harness confirma a centralidade do anchor: o primeiro passo é escrever MISSION+PERSONA, antes de catalogar features ou engatar o wave model. Sem anchor, o catálogo retroativo vira lista de tarefas sem critério de prioridade ou aceitação.

## Related Concepts

- [[director-studio-wave-model]] — harness que o anchor mantém calibrado; sem anchor, waves produzem output correto mas não necessariamente valioso
- [[director-studio-agent-team]] — curator e ui-tester são os agentes que mais dependem do anchor pra exercer juízo (não apenas verificação técnica)
- [[director-studio]] — projeto onde o conceito de anchor foi exercitado pela primeira vez (132 features, PERSONA = operador logístico Imperial)
- [[feature-granularity-heuristic]] — como dimensionar features; o anchor influencia o que conta como "comportamento observável"

## Sources

- [[calendar/notes/2026-05-19.md]] — sessão 03:00: agent-chat com NIC onde o termo "anchor" foi cunhado; top 5 anti-pattern flags listados; explicação de por que PERSONA impede curator rubber-stamping; receita de retrofit (MISSION+PERSONA primeiro)
