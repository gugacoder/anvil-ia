---
title: "Manifesto de scriptagem — pipeliner-ingestao-xml"
aliases: [manifesto-scriptagem]
tags: [effort, manifesto, scriptagem, director]
---

# Manifesto de scriptagem

Lista viva de **tudo que precisa ser aplicado pelo analista no Director real** (sistema de scriptagem do Director ERP — não temos acesso). Aqui prototipamos; o analista replica.

Cada item: o que é, onde vive o protótipo, status (rascunho / pronto-pra-revisão / aplicado), e nota livre.

## Procedures

| Nome | Papel | Protótipo em | Status | Nota |
|------|-------|--------------|--------|------|
| `sp_xml_varrer` | Varredora — lista XMLs da pasta cfg, dispara processadora pra cada um. Sem parâmetros (Pipeliner agenda). | _a criar_ | rascunho | nome tentativo |
| `sp_xml_processar` | Processadora — recebe path do XML, parseia, valida, ingere, atualiza log, move arquivo. | _a criar_ | rascunho | nome tentativo |

## Tabelas

| Nome | Papel | DDL em | Status | Nota |
|------|-------|--------|--------|------|
| `TBingestao_xml_log` | Log + controle (vestígio operacional + idempotência). Modelo: `TBintegracao_cobranca_bancaria_log`. | _a criar_ | rascunho | nome tentativo; estudar a tabela referência antes de modelar |

## Opções (`TBopcoes`)

| Chave | Valor esperado | Status | Nota |
|-------|---------------|--------|------|
| _a definir_ | UNC da pasta raiz dos XMLs (entrada). Subpastas `importado/` e `falha/` são derivadas dela. | rascunho | confirmar com analista: nome da chave, escopo (cliente/global), formato (UNC absoluto ou template) |

## Pipeline (Pipeliner)

| Nome | Schedule | Aciona | Status | Nota |
|------|----------|--------|--------|------|
| _a definir_ | a cada 10 min | `sp_xml_varrer` (sem params) | rascunho | aprender modelo do Pipeliner antes de fechar |

## Convenções

- **Nomes**: tentativos enquanto não confirmados com o analista. Ao confirmar, atualizar aqui e nos protótipos.
- **Protótipos**: tudo vai pra `sources/procedures/pipeliner-ingestao-xml/` (T-SQL + DDL em arquivos separados).
- **Replicação**: o analista usa o sistema de scriptagem do Director para aplicar. Não há comando direto contra o DBdirector daqui — só leitura/estudo.

## Histórico

- 2026-05-13 — manifesto criado, primeiros itens em rascunho.
