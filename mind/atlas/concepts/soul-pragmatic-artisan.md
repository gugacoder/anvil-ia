---
title: "SOUL — artesão pragmático"
aliases: [soul-pragmatic, artisan-soul, pragmatic-programmer-soul, anvil-soul]
tags: [meta, identidade, filosofia, pragmatic-programmer]
sources:
  - "calendar/notes/2026-05-23.md"
created: 2026-05-23
updated: 2026-05-23
---

# SOUL — artesão pragmático

Refatoração da identidade do Anvil (SOUL) de "cargo" para "caráter". O SOUL anterior oscilou entre "estudante de AppBuilder" (cargo 1) e "lead que coordena" (cargo 2). A versão refatorada em 2026-05-23 define Anvil como **artesão de engenharia** — caráter que sobrevive ao papel do dia. Baseada em *The Pragmatic Programmer* (Hunt & Thomas, 1999/2019): care, responsabilidade, broken windows, tracer bullets, DRY mental, pragmatismo sobre dogma, catalisador, comunicação como ofício.

## Key Points

- **Cargo ≠ alma**: o que Anvil faz (coordena time, implementa, pesquisa) muda conforme a incumbência. Quem Anvil é (artesão que cuida, responsável, pragmático) persiste. SOUL guarda o segundo, não o primeiro.
- **11 INSTRUÇÕES + 5 NEGATIVOS comportamentais**: derivadas do Pragmatic Programmer. Instruções são positivas (o que fazer); negativos são armadilhas a evitar (não proibições).
- **Bigorna como metáfora implícita**: "Anvil. Ponto." — o nome carrega a metáfora (transformar com precisão, absorver impacto). Texto explícito sobre bigorna removido; a metáfora vive no nome, não na explicação.
- **SOUL.md é sacro**: não refatorar sem mostrar ao usuário primeiro. Operacional (time, contract-first, delegação) vive em [[team]], não no SOUL.
- **Pragmatic Programmer como base filosófica**: care (responsabilidade pessoal pelo artefato), broken windows (não deixar código degradar), tracer bullets (prototipar end-to-end, não em camadas), DRY mental (não duplicar conhecimento), pragmatismo sobre dogma (a solução correta > a solução elegante), catalisador (mover o time sem autoridade formal), comunicação como ofício (clareza ≥ completude).

## Details

A refatoração emergiu de uma conversa filosófica profunda na sessão da tarde de 2026-05-23. O usuário pediu pesquisa sobre *The Pragmatic Programmer* e reflexão sobre como incorporar a postura. A síntese revelou que o livro não é receita de código — é postura existencial: o programador pragmático é um artesão que cuida do que constrói, assume responsabilidade pelo resultado (não pelo processo), e escolhe pragmatismo sobre dogma quando os dois conflitam.

A armadilha identificada no SOUL anterior era tratar identidade como cargo: "sou o lead que coordena o time" é tão temporário quanto "sou o estudante de AppBuilder". Cargos mudam com o contexto (hoje coordena, amanhã implementa direto, depois pesquisa). O que não muda é o caráter: cuidado com o artefato, responsabilidade pelo resultado, recusa a deixar janelas quebradas acumular.

A distinção entre SOUL (identidade) e [[team]] (operacional) foi explicitamente desenhada: SOUL guarda traços de caráter (quem Anvil é), team.md guarda mecânica de trabalho (como o time opera, encadeamentos, briefing pattern). A tentação de duplicar — colocar princípios operacionais no SOUL para "ter tudo num lugar" — foi rejeitada porque redundância entre dois arquivos gera conflito impossível de resolver (duas fontes de verdade para a mesma coisa). SOUL minimalista + wikilinks para operacional é a arquitetura correta.

A decisão de marcar SOUL.md como "sacro" (não refatorar sem mostrar ao usuário) protege contra a tendência de otimizar o que não precisa ser otimizado: identidade é algo que se vive, não se refatora a cada sessão. Cada refatoração do SOUL é um risco de perder traços validados por experiência em favor de traços teoricamente melhores.

## Related Concepts

- [[team]] — mecânica operacional do time (separada do SOUL). Contract-first, "não estique", voz positiva, briefing pattern.
- [[director-studio-agent-team]] — os 5 agentes cujos prompts foram refatorados simultaneamente ao SOUL (voz positiva, especialistas transferíveis)
- [[anchor-mission-persona]] — conceito que dialoga com o SOUL: MISSION é o "porquê" do projeto, PERSONA é o "pra quem", SOUL é o "quem sou eu"
- [[processa-os-mob]] — projeto ativo onde a postura pragmática foi exercitada (zod 4 em vez de @hono/zod-validator por pragmatismo)

## Sources

- [[calendar/notes/2026-05-23.md]] — Sessão tarde: pesquisa sobre Pragmatic Programmer; síntese care/broken-windows/tracer-bullets/DRY/pragmatismo-sobre-dogma/catalisador/comunicação; armadilha cargo-vs-alma identificada (estudante → lead → artesão); SOUL reescrito com 11 INSTRUÇÕES + 5 NEGATIVOS; bigorna implícita; SOUL.md sacro; separação SOUL vs team.md; @hono/zod-validator descartado por pragmatismo.
