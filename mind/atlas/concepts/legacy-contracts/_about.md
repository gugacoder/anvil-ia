---
title: "Legacy contracts — sub-namespace"
aliases: [legacy-contracts-about, legacy-contracts]
tags: [contracts, archaeologist, legacy, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# `atlas/concepts/legacy-contracts/`

Sub-namespace dedicado aos **contratos extraídos do sistema Processa legado** pelo agente [[archaeologist]]. Cada arquivo descreve uma tabela, procedure, ou estrutura de dados que o [[director-studio]] precisa entender e replicar. **Não descreve UI, não prescreve implementação** — só **estrutura, semântica, regras e efeito**.

## Key Points

- **Duas seções obrigatórias**:
  1. **Estrutura** — tabela markdown com colunas `Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de`.
  2. **Asserções observáveis** — tabela com colunas `# | Input | Output esperado | Regra de comparação | Fonte legado`. Cada asserção tem **ID estável** (A1, A2, ...) e é **mecanicamente verificável** (passa/falha por código, não por interpretação). Sem essa seção, o contrato é incompleto.
- **Escopo**: tabelas SQL (`TB*`), procedures (`*.sp_*`, `*.obter_*`), atributos XML em campos `DFconfig`, formatos JSON expostos pelas APIs do `.NET`.
- **Audiência**:
  - [[smith]] consome **Estrutura + Asserções** ao implementar.
  - [[archaeologist]] em modo auditoria usa **Asserções** como crivo do diff (única autoridade sobre fidelidade legado).
  - [[ui-tester]] usa **Asserções** como expectativa de teste real.
  - [[curator]] recusa aceitar feature cujo contrato não tem seção de Asserções.
- **Proibido**: dizer "use shadcn Table" ou "implemente com TanStack". O contrato fala da **linguagem do banco**, não da stack escolhida.
- **Citação obrigatória**: cada contrato cita o arquivo-fonte (`sources/...path/file.sql:linha`) pra rastreabilidade. Cada asserção cita a linha exata do legado que define a regra.
- **Asserções são imutáveis**: ao corrigir, marca a antiga como `(revogada YYYY-MM-DD: <motivo>)` e adiciona nova abaixo. Histórico de fidelidade auditável.

## Details

O arqueólogo opera com permissão de leitura sobre `sources/engenharia--fabrica--*`. Nenhum outro agente pode entrar lá. Toda informação que o time precisa do legado **passa por aqui** — se não está no contrato, não existe pro time. Isso garante que o Studio nasce sem contaminação visual ou estrutural do legado.

Quando o smith bloqueia por falta de contrato, registra `blocked: contract-missing <id>` no `progress-messages.txt` da frente. O principal invoca o arqueólogo, que escava e adiciona o contrato. Smith retoma.

Convenção de nomenclatura: kebab-case, prefixo opcional pra discriminar tipo. Exemplos:

```
tbmodel-pagina.md                    # contrato de tabela
tbmodel-pagina-grid.md               # sub-contrato por DFtipo
acesso-obter-rotas-aplicacao.md      # contrato de proc
acesso-obter-model-pagina.md
xml-config-grid.md                   # estrutura XML aninhada
```

## Related Concepts

- [[director-studio]] — projeto que consome estes contratos
- [[acesso-metamodel]] — visão geral do schema; cada tabela aqui ganha seu próprio contrato detalhado
- [[ui-system]] — sub-namespace pareado, do designer

## Sources

- [[calendar/notes/2026-05-15.md]] — formalização do mandato do arqueólogo durante montagem do time
