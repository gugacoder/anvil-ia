---
title: "Select Options Endpoint — convencao useSelectFields"
aliases: [select-options-endpoint, useSelectFields, select-endpoint-convention]
tags: [api, react-tools, processa, endpoint, convention, select]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-19
---

# Select Options Endpoint — convencao useSelectFields

Hook `useSelectFields` do [[react-tools]] (`src/hooks/useSelectFields.js`) que encapsula a convencao de carga de opcoes para componentes de selecao ([[power-select-versions]]). Define 4 padroes de endpoint baseados no `selectDataType` do campo, cobrindo desde procedures SQL ate listas fixas. Candidato a sub-contrato do [[director-studio]] — apontado por F016 e reforcado por F019.

## Key Points

- **`/proc/*` POST com state**: para `selectDataType` que referencia uma procedure. Envia o estado atual do formulario como body para que a proc possa filtrar opcoes dinamicamente (ex: listar cidades do estado selecionado).
- **`/selectquery/{key}?parametro_id=` GET**: para queries nomeadas cadastradas no metamodelo. O `key` identifica a query em `TBmodel_parametro`; `parametro_id` e o filtro contextual.
- **`{api}` GET cru**: URL arbitraria configurada no campo — o hook faz GET direto sem transformacao. Para integracao com APIs externas ou endpoints custom.
- **`selectDataType:fixedList` curto-circuito**: nenhuma chamada de rede. Opcoes vem inline no metadado do campo (`TBmodel_parametro`). O hook retorna a lista diretamente.
- **`sendRequest`**: funcao interna do hook que despacha a chamada. Nao implementa debounce, retry, cancel ou cache — e fire-and-forget.

## Details

O `useSelectFields` e o ponto unico de entrada para carga de opcoes em todos os componentes de selecao do [[react-tools]]. Quando um `GenericForm` ou `Filtros` renderiza um campo do tipo select, o hook e invocado com a configuracao do campo (vinda do [[acesso-metamodel]] via `obter_model_pagina`). O hook inspeciona `selectDataType` para decidir qual padrao de endpoint usar e faz a chamada.

A ausencia de cache no hook e uma decisao de arquitetura (intencional ou nao): o cache vive no **consumidor**, nao no hook. `Filtros.js` mantem uma variavel de modulo `selectOptions` que funciona como cache global singleton — todas as instancias de filtro na pagina compartilham o mesmo mapa de opcoes. `GenericForm/Form.js` e `DashBoard/DashBoardBox.js` mantem opcoes como prop local, recarregando a cada mount. Essa assimetria significa que a mesma query pode ser chamada N vezes se N forms estiverem montados simultaneamente, mas filtros chamam uma so vez.

Para o [[director-studio]], este hook define o **contrato de carga de opcoes** que o smith precisa reimplementar. Os 4 padroes de endpoint precisam ser suportados pelo backend Hono, e o frontend precisa de um hook equivalente. A oportunidade de melhoria e clara: adicionar cache por chave (React Query/TanStack Query ja esta no stack do Studio), debounce para digitacao, e cancel de requisicao via AbortController — nenhuma dessas otimizacoes existe no legado.

## Related Concepts

- [[react-tools]] — pacote que contem o hook `useSelectFields`
- [[power-select-versions]] — componentes de selecao que consomem este hook (V1 usa diretamente; V2/V3 recebem opcoes do pai que pode ter usado o hook)
- [[acesso-metamodel]] — `TBmodel_parametro` define `selectDataType` e parametros que o hook consome
- [[director-studio]] — sub-contrato candidato para reimplementacao com melhorias (cache, debounce, cancel)

## Sources

- [[calendar/notes/2026-05-16.md]] — escavacao F019: mapeamento de `useSelectFields.sendRequest` e seus 4 padroes de endpoint; auditoria de ausencia de cache/debounce/cancel; identificacao como sub-contrato reusavel entre F016 e F019
