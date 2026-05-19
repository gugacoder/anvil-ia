---
title: "PowerSelect — 3 versoes coexistentes no react-tools"
aliases: [power-select, power-select-versions, PowerSelect, PowerSelect2, PowerSelect3]
tags: [componente, react-tools, processa, ui, select, legacy]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-19
---

# PowerSelect — 3 versoes coexistentes no react-tools

O [[react-tools]] carrega **tres versoes** coexistentes do componente de selecao, todas exportadas na public API via `src/index.js`. A feature F019 do [[director-studio]] estava **mal-rotulada no manifest** como "typeahead+async" — o componente `PowerSelect3` referenciado nao e typeahead async; e um modal client-side de filtro local. O typeahead async real e a V1 (`PowerSelect.js`), ainda ativa.

## Key Points

- **V1 — `PowerSelect.js`**: async + `react-select`. Faz fetch remoto de opcoes via [[select-options-endpoint]] (`useSelectFields`). E o unico que carrega dados do servidor. Ainda na public API como `PowerSelect`.
- **V2 — `PowerSelect2.js`**: `react-select` sem fetch. Recebe opcoes prontas via props — nenhuma carga remota. Uso mais restrito.
- **V3 — `PowerSelect3/PowerSelect.js`**: modal proprio + filtro client-side sobre `selectOptions[]` injetado pelo componente pai. Nao faz fetch, nao e typeahead remoto. E o componente que o manifest F019 referenciava erroneamente como "typeahead+async".
- **Nenhuma versao implementa**: debounce, minimo de caracteres, cancel de requisicao, ou cache proprio. O cache de `selectOptions` e responsabilidade do **consumidor** (Filtros.js usa var-de-modulo global; Form/Dashboard usam prop).
- **Typeahead remoto nao existe no legado**: toda filtragem por digitacao e client-side sobre lista ja carregada. A expectativa "typeahead async" do manifest era ilusoria.

## Details

A descoberta surgiu durante a escavacao da feature F019 pelo archaeologist do [[director-studio]] (2026-05-16). O manifest original rotulava F019 como "typeahead+async", apontando para `PowerSelect3`. A investigacao revelou que `PowerSelect3` e um modal de selecao com filtro local — abre um overlay, exibe a lista completa de opcoes (ja carregada pelo pai), e permite filtrar digitando. Nao ha chamada de rede, nao ha debounce, nao ha paginacao server-side.

O typeahead async real vive em `PowerSelect.js` (V1), que usa `react-select` e carrega opcoes via o hook `useSelectFields` (ver [[select-options-endpoint]]). Porem, mesmo essa versao nao implementa debounce ou cancel de requisicao — o fetch acontece uma vez (on-mount ou on-focus, dependendo do `selectDataType`), e a filtragem subsequente e feita client-side pelo `react-select` sobre a lista ja carregada.

A coexistencia de 3 versoes e tipica do padrao de evolucao incremental do [[react-tools]]: versoes novas nao substituem as anteriores porque consumidores existentes (GenericForm, Filtros, DashBoard) ja referenciam versoes especificas. O contrato do Studio precisa cobrir as 3 porque o metamodelo [[acesso-metamodel]] pode referenciar qualquer uma via `TBmodel_parametro`.

Consumidores descobertos: `Filtro/Filtros.js` (mantem `selectOptions` como var-de-modulo global — cache compartilhado entre instancias), `GenericForm/Form.js` (mantem opcoes como prop), `DashBoard/DashBoardBox.js` (idem prop), `UserPreference/DataGridPrintingModal.js`.

## Related Concepts

- [[react-tools]] — pacote que exporta as 3 versoes na public API
- [[select-options-endpoint]] — convencao de endpoints que a V1 usa para carga remota via `useSelectFields`
- [[director-studio]] — precisa reimplementar as 3 variantes; F019 re-rotulada
- [[acesso-metamodel]] — metamodelo que pode referenciar qualquer versao do PowerSelect via parametros de model

## Sources

- [[calendar/notes/2026-05-16.md]] — escavacao F019: descoberta das 3 versoes, re-rotulagem no manifest, auditoria de ausencia de debounce/cache/cancel, identificacao de consumidores e padroes de cache por consumidor
