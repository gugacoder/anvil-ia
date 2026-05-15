---
title: "Connection: AppBuilder cadastra, Director.Web opera"
connects:
  - "concepts/appbuilder"
  - "concepts/director-web"
  - "concepts/pipeliner-service"
sources:
  - "calendar/notes/2026-05-14.md"
created: 2026-05-14
updated: 2026-05-14
---

# Connection: AppBuilder cadastra, Director.Web opera

## The Connection

O [[concepts/appbuilder]] e o [[concepts/director-web]] dividem responsabilidades complementares sobre o ciclo de vida de um pipeline: AppBuilder é o ambiente de **cadastro e empacotamento** (CRUD de pipelines, estágios, ações), enquanto Director.Web é o ambiente **operacional** (visualização, disparo manual, monitoramento de execução). O [[concepts/pipeliner-service]] é o executor — lê as tabelas `pipeliner.TBpipeline`/`TBstage` e dispara as ações conforme o schedule.

## Key Insight

A topologia foi inicialmente mal-entendida. A primeira hipótese (2026-05-14, sessão da manhã) era que o Director.Portal seria o sistema operacional e o AppBuilder um sistema paralelo de empacotamento. A realidade, corrigida pelo Everton (PO), é que:

1. **AppBuilder** tem a UI de cadastro (wizard React em `/#/pipeliner`) mas **não tem "Executar agora"** — menus de contexto só expõem CRUD.
2. **Director.Web** tem a tela operacional onde o usuário final vê pipelines e pode dispará-los manualmente.
3. O **deploy** (`savePipelineNewDB`) é o mecanismo que transfere a configuração do DB do AppBuilder para o DB destino onde o Pipeliner Service vai ler.

Isso significa que o AppBuilder não participa do runtime — é puramente configuracional. Qualquer prova de conceito que prove o ciclo de execução não precisa do AppBuilder no loop, apenas de dados corretos em `TBpipeline`/`TBstage` no DB destino.

## Evidence

- UI do AppBuilder mapeada: wizard completo testado (pipeline 8273 + stage 8373), sem botão "Executar agora" em nenhum nível.
- Endpoint `POST /api/pipeliner/jobs/exec` do AppBuilder é proxy que depende de `acesso.TBaplicacao` chave `pipeliner` — configuração ausente no DB de teste.
- Everton explicitou: "ver/executar pipeline está no Director.Web" — insight que inverteu a hipótese original.
- No Srv-DirectorWeb, os 3 serviços (Director.Portal, Processa.AppBuilder, Director.Web) rodam independentes — mas não há serviço Pipeliner instalado nesse servidor.

## Related Concepts

- [[concepts/appbuilder]] — lado de cadastro/configuração
- [[concepts/director-web]] — lado operacional
- [[concepts/pipeliner-service]] — executor que lê a configuração e dispara ações
- [[concepts/deploy-pipeline-newdb]] — ponte entre o DB do AppBuilder e o DB operacional
