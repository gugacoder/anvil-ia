---
title: "PowerSelect — widget de seleção (V1/V2/V3) no react-tools"
aliases: [power-select, power-select3, powerselect, powerselect3, model-valor-select-widget]
tags: [contract, legacy, react-tools, select, widget, filtro, generic-form, dashboard, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Contrato: `PowerSelect` (V1, V2, V3)

Cobre F019 do manifest. **F019 está mal-rotulada** — "typeahead + async" sugere debounce + carga remota por digitação, mas **nenhuma das três versões implementa typeahead remoto**. Toda filtragem por digitação é **client-side sobre lista já carregada**. Carga das opções acontece no **mount** (eager) ou via callback do consumidor; "async" no legado significa apenas "as opções vêm de HTTP", não "stream conforme digito". Este contrato documenta o que existe; o Studio decide se quer typeahead real.

O legado tem **três implementações coexistentes** do conceito "select com label/value, single/multi, fonte estática ou remota":

- **V1** — `react-tools/components/PowerSelect.js` (importado como `PowerSelect`, exportado em `index.js:73`). Usa `react-select` (lib externa) + fetch interno via `useRequest`. **É o único** que faz fetch ele-próprio (api/queryKey/proc).
- **V2** — `react-tools/components/PowerSelect2.js`. Usa `react-select`, NÃO faz fetch (opções vêm 100% por prop). Não exportado em `index.js`; aparentemente legado obsoleto.
- **V3** — `react-tools/components/PowerSelect3/PowerSelect.js` (importado como `PowerSelect2`, exportado em `index.js:74` — sic, nome inverso). **Não usa `react-select`** — render próprio em modal Bootstrap + lista filtrada client-side. Sem fetch interno; recebe `selectOptions[]` pronto do consumidor (que delega a carga ao hook `useSelectFields`). **É o consumido pelos `Generic*`** (Filtros, GenericForm, DashBoardBox) — versão "produção".

Carga remota real (api/proc/selectquery) acontece **fora** do widget V3, no hook compartilhado `useSelectFields`. O cache de opções é responsabilidade do **consumidor**:
- `Filtros.js` mantém var-de-módulo `selectOptions = {}` (cache global compartilhado entre instâncias, vide [[filtros-componente]] §"Inconsistência").
- `GenericForm/Form.js` mantém `selectOptions` em state do hook `useGenericFormUtils`.
- `DashBoardBox.js` constrói opções inline (`apps?.map(...)`, `boxes?.map(...)`).

Conclusão arqueológica: **o PowerSelect3 é um renderizador puro**; o "select com endpoint" é uma colagem composto = `<PowerSelect3>` + `useSelectFields` + cache do consumidor. Documentar isolado o V3 só descreve metade do comportamento sistêmico observável; este contrato cobre o conjunto (com pointers para [[filtros-componente]] e o futuro `select-options-endpoint.md`).

## Citações de fonte

### V3 (canônico de produção)
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:5-13` — assinatura: `({ _disabled, selectOptions, isMulti, onSelect, onRemove, _selectedValue, pipeliner=false })`. **Sem** `value/onChange/options/api/queryKey/placeholder/label/required` — esses ficam no consumidor.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:14-18` — refs/state: `ref` (input de busca), `_filterValue` (string, client-only), `showModal` (bool), `selected` (array, sincronizado com `_selectedValue`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:20-24` — `handleChange` do input: só atualiza `_filterValue` se `value.length >= 3`; senão limpa para `''`. **Mínimo de 3 chars é hardcoded**, sem debounce.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:39-59` — `handleSelect`: se `!isMulti` → substitui `selected` e fecha modal chamando `handleCloseModal(option)`; se `isMulti` → toggle no array (add se ausente, remove se já presente). **Multi NÃO fecha o modal** ao clicar (segue selecionando até clique fora).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:41-43` — se prop `pipeliner=true`, injeta `pipeliner:true` no objeto selecionado antes de propagar (flag de origem usada por hooks downstream).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:31-37` — `handleCloseModal(options)`: fecha modal, limpa input (`ref.current.value=''`); chama `onSelect(options)` apenas se `options !== undefined` (logo: clicar fora **sem ter selecionado** não dispara `onSelect`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:61-64` — `handleRemove(index, option)`: chama `onRemove(index)` (legado: índice, não objeto) e remove do `selected` por match de `value`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:66-89` — `handleClick(event, action, extra)`: switch de ações `open/close/select/remove`. `_disabled=true` bypass de tudo (`if (checkBooleanValue(_disabled)) return`). `close` só dispara quando o click é exatamente no backdrop (`event.target.className === 'modal d-flex justify-content-center align-items-start'`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:80-81` — ao fechar via backdrop click, propaga `selected[0]` (single) ou `selected` (multi) para `onSelect` via `handleCloseModal`. **É como o multi confirma a seleção.**
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:91-141` — `renderContent`: 
  - vazio: placeholder fixo "Clique para selecionar." (linha 98). Não usa prop `placeholder`.
  - 1+ selecionados: exibe **apenas o primeiro chip** (`?.slice(0,1).map`) com label truncado a 17 chars + `...` se label `>= 20`. Se houver mais, mostra `<span>...</span>` + chip `+<N>`. **Render fixo de 1 chip; multi-select com N>1 não mostra N chips inline.**
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:108-127` — chip do selecionado tem `onClick={() => handleClick(idx, 'remove', option)}` — **clique no chip remove**. Marca `data-event` para o handler `open` ignorar (linha 72: `!event.target?.hasAttribute('data-event')`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:143-147` — `useEffect([_selectedValue])`: se prop vier vazia, zera `selected` local. **Sincronização one-way pai→filho apenas no caso "vazio"** — atualizações com valor não substituem `selected` se já houver algo (potencial drift).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:149-160` — wrapper `<div className="form-control p-0">` clicável. Estilo `cursor:pointer`, `minHeight: calc(1.5em + 0.75rem + 2px)`. `disabled` adiciona classe `disabled`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:161-220` — modal: `<div className="modal d-flex justify-content-center align-items-start">` com backdrop `rgba(0,0,0,.5)`, `modal-dialog-scrollable`, `maxWidth:80%/minWidth:50%`. Input `placeholder="Procurar..."`. Lista: `.filter(x.label.toLowerCase().includes(filterValue.toLowerCase()))` (sub-string case-insensitive; **não é prefix**). Item: botão com check `✔` se já selecionado.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect3/PowerSelect.js:224-234` — `propTypes`: `name, isMulti, state, _disabled, selectOptions, onSelect, onRemove, _selectedValue, pipeliner`. `state` declarada mas **não usada** internamente (consumidores passam, V3 ignora).

### V1 (PowerSelect.js — async com react-select)
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect.js:5-27` — assinatura rica: `{label, name, isToggleable, disabled, value, ids, options, isMulti, placeholder, api, queryKey, onChange, onToggle, required, style, allowUpdateSelectOptions, getFormState, opcoes}`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect.js:80-109` — `getSelectData`: lógica de carga:
  - `options.length > 0` → usa as opções fornecidas (sem fetch).
  - `!allowUpdateSelectOptions && items.length` → curto-circuito (não re-fetch).
  - `api.includes('/proc/')` → `postAsync(api, formState)` onde `formState = getFormState?.() || ''` — **proc recebe o state inteiro do form no body**.
  - senão: `queryKey` → GET `/selectquery/{queryKey}?parametro_id={formState.id||''}`; senão `api` cru.
  - Resposta `{status:200, sucesso:true, dados:[]}` → `_setItems(dados)`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect.js:68-78` — `_setItems`: se itens não têm `value`, mapeia `{value: id, label: nome || descricao}` (normalização de payload SQL → option). Senão usa cru.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect.js:33-66` — `tryFill`: dado `ids` (CSV ou array) + `items` carregados, encontra opções correspondentes (`item.id`, `item.value` ou `item.erpId`) e chama `onChange`. Coerce numeric se primeiro item tem id numérico.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect.js:111-115` — `useEffect`: `getSelectData` no mount se `items.length===0`. **Não re-fetch após primeira carga, exceto se `allowUpdateSelectOptions=true`.**
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect.js:117-131` — `useEffect([value, ids])`: sincroniza `_value` com prop (`value=null` → null; `ids+!value` → tryFill; `value` string + `options` → encontra option).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect.js:138-142` — `useEffect([opcoes])`: se prop `opcoes` for array novo, sobrescreve `items` (canal alternativo de injeção pelo pai).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect.js:144-170` — render: `<ReactSelect>` da lib `react-select` com `isClearable=true`, `isMulti`, placeholder padrão "Selecione as opções..." (multi) / "Selecione alguma opção..." (single). `isToggleable=true` renderiza `<Checkbox>` acima que dispara `onToggle`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect.js` — **consumidor único confirmado**: `UserPreference/DataGridPrintingModal.js:9`.

### V2 (PowerSelect2.js — react-select puro, sem fetch)
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect2.js:5-14` — `{name, disabled, value, isMulti, placeholder, onChange, style, options}`. Sem `api/queryKey`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect2.js:21-46` — `handleValueChanged`: dado `value` (string ou objeto), encontra match em `options` por `value` case-insensitive; chama `onChange({target:{name,value: selectedValue||null}})` a cada mudança do `value`. **Não é controlado nem stricto** — o componente "auto-confirma" o que vê.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/PowerSelect2.js:48-67` — render `<ReactSelect>` com `isClearable=true`.
- **Sem consumidores ativos** detectados no react-tools (não importado em lugar nenhum); presumivelmente histórico/morto.

### Consumidores de V3
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:18` — import; `:280-317` — call site no ramo `type='select'`: passa `field={...field}`, espalha props do field, `_disabled`, `state=_filter`, `stateRef={}`, `onSelect` (delega a `_handleSelectOption` + `handleChange`), `onRemove` (delega a `_handleRemoveOption`), `_selectedValue=getSelectedValue(...)`, `selectOptions=getSelectFieldOptions(field, selectOptions)`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/Form.js:16` — import; `:167-209` — call site no ramo `field.ctype='select'`: idêntico padrão (com `state` ao invés de `_filter`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DashBoard/DashBoardBox.js:5` — import; `:576-628`, `:882-907` — uso **manual** com `selectOptions` construído inline (não via `useSelectFields`); `:631` — fallback `<PowerSelect onRemove={...} />` sem outras props (placeholder/empty).

### Cache de opções (responsabilidade do consumidor)
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:22` — `let selectOptions = {};` em escopo de módulo (cache GLOBAL entre instâncias do `<Filtros>`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:125-174` — `verifyLinkedFilters`: cascading manual no consumidor (V3 não conhece linkedFilters). Vide [[filtros-componente]] §"LinkedFilter".
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/hooks/useGenericFormUtils.js` — análogo no Form (state local, não global).

### Endpoint de opções (delegado ao hook compartilhado)
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useSelectFields.js:100-137` (`sendRequest`) e `:139-174` (`sendRequestAsync`): regra canônica de roteamento:
  - `options.length > 0` → curto-circuita com `{status:200, sucesso:true, dados: options}`.
  - `api.includes('/proc/')` → POST `api` body `body=getStateValue()||{}` (state do form/filtro).
  - `queryKey` → GET `/selectquery/{queryKey}?parametro_id={body.id||''}`.
  - `api` cru (sem `/proc/`) → GET `{api}`.
  - `selectDataType==='fixedList'` (linha 32) → curto-circuito em `mapSelectResources` com `options` inline.

## Estrutura

### Props do `<PowerSelect>` V3 (versão de produção)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `_disabled` | bool \| string-bool | não | Desabilita o widget (não abre modal, não responde a clicks) | true/false/'true'/'false' | `checkBooleanValue` coerce; aplica classe `disabled` no wrapper | consumidor (de `field.disabled`) |
| `selectOptions` | `Option[]` | sim (para haver lista) | Lista completa de opções **já carregadas** | `[{label, value, ...}]` | base do `.filter()` por `_filterValue`; render dos itens; check de "já selecionado" | consumidor (Filtros via `getSelectFieldOptions`, Form via `selectOptions[fieldName]`, Dashboard inline) |
| `isMulti` | bool | não (default false) | Multi-select | true/false | `handleSelect` toggle em array vs substituir; close modal só em single (linha 47); backdrop click propaga `selected` (array) vs `selected[0]` (objeto) | model (`field.isMulti`) |
| `onSelect` | `(option \| option[]) => void` | sim | Notificação de seleção | função | chamado com `option` (single) ou `selected[]` (multi, no close); recebe objeto enriquecido com `pipeliner:true` se prop ativa | consumidor (despacha via `_handleSelectOption` + `handleChange`) |
| `onRemove` | `(index) => void` | sim para multi | Notificação de remoção via chip | função | chamado com `index` numérico (não com o objeto) | consumidor (`_handleRemoveOption` + `handleChange`) |
| `_selectedValue` | `Option[]` | não (default `undefined`) | Valor atual selecionado (controlado pelo pai) | `[{label, value}, ...]` | seed do state `selected`; reset quando vazio; base do `renderContent` (chip) | consumidor (de `getSelectedValue(field, state, options)`) |
| `pipeliner` | bool \| string-bool | não (default false) | Marca a opção com `pipeliner:true` ao selecionar | true/false/'true'/'false' | `_selectedOption.pipeliner = true` no payload propagado | consumidor (propaga `pipeliner` da árvore — vide `GenericPage`/`GenericForm`) |
| `name` | string | não (declarada em propTypes; **não usada no render**) | Identificador | string | nenhum efeito interno | consumidor |
| `state` | object | não (declarada; **não usada no render**) | State do form/filtro | objeto | nenhum efeito interno (passado pelos consumidores por inércia) | consumidor |

### Forma de `Option` (item de `selectOptions[]` e `_selectedValue[]`)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `value` | string \| number | sim | Identidade da opção | livre | usado em comparações (`option.value === x.value`); coergido com `.toString()` em vários pontos | endpoint (`dados[].id` mapeado para `value` em `useSelectFields`/V1 `_setItems`) ou model (`field.options`) |
| `label` | string | sim | Texto exibido | livre | render do chip (truncado a 17 chars se ≥ 20) e dos itens da lista; base do `.filter()` por busca (case-insensitive substring) | endpoint (`dados[].nome \|\| dados[].descricao` em V1 normalization) ou model |
| extras (`id`, `erpId`, `aplicacao`, ...) | any | não | Campos extras preservados no objeto | livre | propagados via `{...option}` para `onSelect`; consumidores podem ler | endpoint |

### Convenção de endpoint de opções (via `useSelectFields`)

Aplica-se ao **conjunto** PowerSelect3 + useSelectFields nos consumidores Filtros/Form (não ao PowerSelect3 sozinho).

| Configuração no field do model | Estratégia HTTP | URL/Body | Quando usar |
|---|---|---|---|
| `selectDataType: 'fixedList'` + `options:[...]` | nenhuma | inline | lista estática conhecida em design-time |
| `options: [...]` (sem `selectDataType`) | nenhuma | inline | mesmo efeito; `mapSelectResources` agrupa em `fieldProp` |
| `api: '/proc/<nome>'` | POST | body = `getStateValue() \|\| {}` (state inteiro do form/filtro) | proc parametrizada pelo state corrente |
| `queryKey: '<key>'` (sem api) | GET | `/selectquery/<key>?parametro_id={body.id\|\|''}` | consulta nomeada parametrizada por id-pai |
| `api: '/select/<id>'` (sem `/proc/`) | GET | `{api}` cru | endpoint genérico de select por id (vide `acesso.obter_select_*`) |
| `api: '<qualquer-rota>'` (sem `/proc/`) | GET | `{api}` cru | fallback genérico |

Forma esperada da resposta: `{ status: 200, sucesso: true, dados: Option[] }`. Falhas (status!=200 ou `sucesso:false`) **não** populam — o widget fica com lista vazia, sem mensagem de erro de UI.

### Cascading (linkedFilters)

**Não vive no PowerSelect3.** Vive no `<Filtros>` (vide [[filtros-componente]] §"LinkedFilter"). Quando um `field.linkedFilters[]` é declarado no model, `Filtros.verifyLinkedFilters` (Filtros.js:125-174) dispara a re-carga do select irmão:

| Caso | Comportamento |
|---|---|
| `linkedFilter.value === null` | GET `{rootApi}/select/{lFilter.prop}?filtro={valorSelecionado}`; substitui `selectOptions[lFilter.prop]` na var-de-módulo; zera `_filter[lFilter.prop] = []` |
| `linkedFilter.value !== null` | Substitui `value` (e o `api`) do irmão direto (modo "cascata fixa", sem fetch novo) |

Request é **síncrono** (`await`) dentro do `handleChange` — bloqueia UI até resposta. Sem debounce, sem cancelamento, sem indicador de loading.

O Form (`GenericForm`) tem um padrão paralelo via `useGenericFormUtils` (não documentado neste contrato); merece sub-contrato `linked-filters.md`.

### Cache

**O PowerSelect3 não tem cache próprio.** Cache existe no consumidor:

| Consumidor | Estratégia | Persistência | Granularidade |
|---|---|---|---|
| `Filtros.js` | `let selectOptions = {}` em escopo de módulo (linha 22) | morre no full reload; sobrevive entre instâncias de `<Filtros>` montadas/desmontadas | por `field.prop` |
| `GenericForm/Form.js` | state local de `useGenericFormUtils` | morre quando o form desmonta | por `field.name` |
| `DashBoard/DashBoardBox.js` | inline (`apps?.map(...)`) — sem cache | recomputado a cada render | nenhuma |

V1 (`PowerSelect.js`) tem **cache próprio rudimentar**: `items` em state local; `useEffect` em mount não re-fetch se `items.length>0` (linha 112), exceto se `allowUpdateSelectOptions=true`.

### Typeahead

**Apenas client-side filter** em todas as três versões. Não há debounce nem mínimo de chars no V1/V2 (`react-select` filtra internamente sobre a lista carregada).

V3 implementa **mínimo de 3 chars hardcoded** (`PowerSelect3/PowerSelect.js:22`) — abaixo de 3 chars o `_filterValue` é forçado a `''` (mostra lista inteira). Não há debounce; cada keystroke acima de 3 chars dispara re-render imediato. Filtragem: `label.toLowerCase().includes(filterValue.toLowerCase())` (substring case-insensitive, não prefix, não fuzzy).

### Multi-select — payload e UX

| Aspecto | V1 (`react-select`) | V3 (modal próprio) |
|---|---|---|
| Payload no `onChange`/`onSelect` | array de Options completo (`[{value,label,...},...]`) | mesmo — array completo |
| Display de chips no estado fechado | chips inline N (responsabilidade do `react-select`) | **apenas 1 chip** + `...` + `+<N-1>` |
| Confirmar a seleção | imediata a cada toggle | imediata internamente; propaga via `handleCloseModal` no backdrop click |
| Remover item individual | "x" no chip do `react-select` → onChange | click no chip → `handleClick(idx,'remove',option)` → `onRemove(idx)` |
| Pesquisar dentro da lista | input do `react-select` (built-in) | input `<input placeholder="Procurar...">` no header do modal |
| Indicador de já-selecionado | check visual via styling do `react-select` | `✔` à esquerda do label na lista |

Single-select V3 fecha o modal automaticamente no click de uma opção (linha 47-48); multi mantém aberto.

### Não-encontrado / vazio

| Caso | Comportamento V3 |
|---|---|
| `selectOptions=[]` | lista do modal renderiza vazia; sem mensagem "nenhum resultado" |
| `selectOptions=[...]` + busca sem match | lista do modal renderiza vazia (filter retorna `[]`); sem mensagem |
| `_selectedValue=[]` ou `undefined` | wrapper exibe placeholder fixo `"Clique para selecionar."` (texto hardcoded, sem i18n, sem prop override) |

V1: `react-select` renderiza "No options" nativo da lib. V3 não tem equivalente — render silencioso.

### Loading state

**Nenhuma das três versões mostra loading explícito.** V1 mantém `items=[]` enquanto o fetch corre; render do `react-select` mostra "No options" durante esse intervalo. V3 depende do consumidor para passar `selectOptions=[]` enquanto carrega; sem feedback visual.

### Disabled / readonly

- V3: `_disabled` (bool ou string-bool, via `checkBooleanValue`). Bypass em `handleClick` (linha 67). Classe CSS `disabled` no wrapper. **Não há "readonly" separado** (read-only ≡ disabled).
- V1: `disabled` (bool); passado para `ReactSelect.isDisabled`. `isToggleable=true` permite Checkbox que dispara `onToggle` para alternar disabled (UX de "ativar campo opcional").

### Validação

**Nenhuma das três versões valida.** Validação vive no consumidor:
- `<Filtros>` valida `required` em `verifyRequiredFilters` (vide [[filtros-componente]] FL2).
- `<GenericForm>` valida em `useGenericFormUtils.validateForm` (não coberto neste contrato).

`required` é passada como prop em V1 (só para sufixar `*` no label do Checkbox). V3 não recebe `required` — visualização do `*` é responsabilidade do consumidor (Filtros.js:276-278 monta `<strong>{label}{required?' *':''}</strong>` acima do `<PowerSelect>`).

## Asserções observáveis

| # | Input | Output esperado | Regra de comparação | Fonte legado |
|---|---|---|---|---|
| PS1 | V3 mount com `_selectedValue=[]` ou `undefined` | wrapper renderiza `<div>Clique para selecionar.</div>` (texto literal, classe `text-muted px-2 mt-1`) | igualdade textual do innerText | `PowerSelect3/PowerSelect.js:92-99` |
| PS2 | V3 `_selectedValue=[{value:1,label:'Curitiba'}]`, `isMulti=false`, click no wrapper | `showModal===true`; modal renderiza com `<input placeholder="Procurar...">`; lista renderiza `selectOptions` filtrada por `_filterValue===''` (lista inteira) | DOM tem `.modal.d-flex` visível + N botões `.list-group-item` = `selectOptions.length` | `PowerSelect3/PowerSelect.js:70-72, 161-218` |
| PS3 | V3 modal aberto, digitar `"cu"` (2 chars) no input | `_filterValue===''` (NÃO `"cu"`); lista exibida segue completa | comparação de length de `.list-group-item` antes e depois | `PowerSelect3/PowerSelect.js:22-24` |
| PS4 | V3 modal aberto, digitar `"cur"` (3 chars) | `_filterValue==='cur'`; lista filtrada por `label.toLowerCase().includes('cur')` | length de `.list-group-item` corresponde ao count do filter | `PowerSelect3/PowerSelect.js:22, 187-193` |
| PS5 | V3 `isMulti=false`, click numa opção `{value:7,label:'Joinville'}` da lista | `onSelect` é chamado UMA vez com `{value:7,label:'Joinville'}` (objeto, não array); `showModal===false`; `_filterValue===''` (input ref limpo) | spy em `onSelect` recebe objeto único; modal fechou | `PowerSelect3/PowerSelect.js:45-48, 31-37` |
| PS6 | V3 `isMulti=true`, click em 3 opções sequencialmente | modal permanece aberto; `selected` cresce a 3 itens; `onSelect` **NÃO é chamado a cada click** (só no close) | spy em `onSelect` 0 calls após 3 clicks; lista mostra 3 `✔` | `PowerSelect3/PowerSelect.js:50-59` |
| PS7 | V3 `isMulti=true`, click no backdrop (fora do modal-dialog) após selecionar 3 opções | `onSelect` chamado UMA vez com array de 3 itens; modal fecha | spy recebe `Option[]` com length 3 | `PowerSelect3/PowerSelect.js:74-81` |
| PS8 | V3 `isMulti=true`, click numa opção já selecionada (toggle off) | `selected` perde o item (filter por `value`); `onSelect` ainda não chamado | length de `selected` decrementa; ✔ some daquele item | `PowerSelect3/PowerSelect.js:51-58` |
| PS9 | V3 `_selectedValue=[{value:1,label:'AAA'}, {value:2,label:'BBB'}, {value:3,label:'CCC'}]` (multi, 3 itens), wrapper fechado | renderiza 1 chip "AAA" + `<span>...</span>` + chip `+2` (strong); demais não renderizam inline | DOM tem 2 chips + separador "..."; primeiro chip text === "AAA"; segundo === "+2" | `PowerSelect3/PowerSelect.js:102-138` |
| PS10 | V3 chip com `label="NomeDeCidadeMuitoLongoAcimaDeVinte"` (≥ 20 chars) | chip exibe `"NomeDeCidadeMuit..."` (substring(0,17) + "...") | textContent do chip === primeiros 17 chars + "..." | `PowerSelect3/PowerSelect.js:116-118` |
| PS11 | V3 `_disabled=true`, click no wrapper | nada acontece (`showModal` permanece false; `onSelect`/`onRemove` não chamados) | DOM sem `.modal.d-flex`; wrapper tem classe `disabled` | `PowerSelect3/PowerSelect.js:67, 152` |
| PS12 | V3 `_disabled='true'` (string) | mesmo de PS11 — `checkBooleanValue('true')===true` | idem | `PowerSelect3/PowerSelect.js:67`, hook `useUtils.checkBooleanValue` |
| PS13 | V3 click no chip (`<span class="badge-light">`) com `_selectedValue=[{value:1,label:'AAA'}]` | `onRemove(0)` é chamado (com índice 0, não com o objeto); `selected` perde o item; wrapper **não abre o modal** | spy recebe `0`; sem `.modal.d-flex` | `PowerSelect3/PowerSelect.js:109-127, 109 data-event, 72 hasAttribute` |
| PS14 | V3 `pipeliner=true`, selecionar opção `{value:9,label:'X'}` (single) | `onSelect` recebe `{value:9, label:'X', pipeliner:true}` | spread enriquecido com flag | `PowerSelect3/PowerSelect.js:41-43` |
| PS15 | V3 `pipeliner=false` (default), selecionar opção `{value:9,label:'X'}` | `onSelect` recebe `{value:9, label:'X'}` (sem flag) | objeto cru sem chave `pipeliner` | `PowerSelect3/PowerSelect.js:41` (condicional) |
| PS16 | V3 mount com `selectOptions=undefined` | render do modal não quebra (optional chaining `selectOptions?.filter`); lista renderiza 0 itens | nenhuma exception; 0 `.list-group-item` | `PowerSelect3/PowerSelect.js:187-188` |
| PS17 | V3 prop `_selectedValue` muda de `[{value:1}]` para `[]` (pai zera) | `selected` interno é resetado para `[]` via `useEffect` | render volta a `"Clique para selecionar."` | `PowerSelect3/PowerSelect.js:143-147` |
| PS18 | V1 mount com `api='/proc/listar_empresas'` + `getFormState=()=>({id:5,filtro:'x'})` | dispara POST `/proc/listar_empresas` body `{id:5,filtro:'x'}`; resposta `{status:200,sucesso:true,dados:[{id:1,nome:'E1'}]}` popula `items=[{value:1,label:'E1'}]` | spy do `postAsync` recebe `(api, formState)`; lista do ReactSelect tem 1 opção | `PowerSelect.js:80-95, 68-78` |
| PS19 | V1 mount com `queryKey='empresas_por_grupo'` + `getFormState=()=>({id:7})` | dispara GET `/selectquery/empresas_por_grupo?parametro_id=7` | spy do `getAsync` recebe URL exata | `PowerSelect.js:96-106` |
| PS20 | V1 mount com `api='/select/lojas'` (sem `/proc/`) | dispara GET `/select/lojas` cru | spy `getAsync` recebe `/select/lojas` | `PowerSelect.js:99-106` |
| PS21 | V1 `options.length>0` no mount | NÃO dispara nenhum HTTP; usa `options` direto | spy de `getAsync`/`postAsync` 0 calls | `PowerSelect.js:82-83, 111-112` |
| PS22 | V1 `allowUpdateSelectOptions=false` (default) + `items` já populado, re-render | NÃO dispara HTTP de nova carga | spy 0 calls após segundo render | `PowerSelect.js:85-87` |
| PS23 | useSelectFields.sendRequest com `selectDataType:'fixedList'` em `mapSelectResources` | sem HTTP; resourceMapping carrega `options` inline; callback recebe `{status:200,sucesso:true,dados:options}` (via `sendRequest` linha 102-103) | spy de `_get/_post` 0 calls; callback recebido | `useSelectFields.js:32-38, 102-103` |

## Sub-contratos

- **`select-options-endpoint.md`** — convenção HTTP `/proc/*` (POST com body=state), `/selectquery/{key}?parametro_id=` (GET), `/select/<id>` ou `{api}` cru (GET), `selectDataType:fixedList` (inline). Vive em `useSelectFields`. Já apontado por [[filtros-componente]] §"Features novas identificadas" #4 — F019 reforça a necessidade. **A criar.**
- **`linked-filters.md`** — semântica de `linkedFilters[]` (cascading). Hoje implementada em `<Filtros>` (`verifyLinkedFilters`) e independentemente em `useGenericFormUtils`. Padrão comum, contrato comum. **A criar.**

## Relações com o ecossistema

- **Consome de**:
  - `useSelectFields` ([[filtros-componente]] §44) — backend de carga de opções (apenas indireta — o V3 não chama; consumidor chama e injeta).
  - `useUtils.checkBooleanValue` — coerção `'true'`/`'false'` ↔ bool.
- **É consumido por**:
  - [[filtros-componente]] (F016) — ramo `type='select'` do `<Filtros>`.
  - F010 [[model-valor-genericform]] — ramo `ctype='select'` em `GenericForm/Form.js`.
  - F020 (DashBoard) — `DashBoardBox` no fluxo de configuração de quadrantes.
  - F? (UserPreference) — `DataGridPrintingModal` usa V1 (não V3).
- **Acopla com**:
  - F018 [[date-components]] — nenhum acoplamento direto, mas convive nos mesmos `field.type` switches.
  - F? (GridButton) — alternativa para "select via mini-grid" quando a lista é tabela. Compartilha conceito mas é componente distinto.
  - F? (NullableBool) — alternativa para "select de 3 estados" (bool tri-state).

## ⚠️ Inércia legada

- **F019 mal-rotulada**: "typeahead + async" não existe no legado. Filtragem é client-side; mínimo de 3 chars sem debounce; sem cancel de request; sem stream conforme digita. Studio decide se quer typeahead remoto (= feature nova).
- **Três versões coexistem**: V1 (com fetch interno), V2 (orfã), V3 (canônica). Nomenclatura nos exports do `index.js` é **invertida** (V3 é exportada como `PowerSelect2`). Migração requer escolher uma única abstração.
- **`name`/`state` declaradas em propTypes mas não usadas** no render do V3. Consumidores passam por convenção.
- **`onRemove(index)`** recebe índice, não objeto. Inconsistente com `onSelect(option)` (objeto). Consumidores precisam re-resolver o objeto pelo índice.
- **Sincronização one-way parcial**: `useEffect([_selectedValue])` só zera `selected` interno quando prop é vazia; updates com valor não sincronizam (drift possível se pai atualizar valores em batch sem zerar).
- **Render limitado a 1 chip**: multi-select com N>1 só mostra primeiro + `+N-1`. Sem expansão inline. Usuário não vê quem está selecionado sem reabrir o modal.
- **Truncamento hardcoded a 17/20 chars** sem responsive/tooltip. Labels longos perdem informação.
- **Sem placeholder customizável**: V3 placeholder do estado vazio é `"Clique para selecionar."` (hardcoded, sem i18n). Placeholder do input de busca: `"Procurar..."` (idem).
- **Sem mensagem de "sem resultados"**: lista vazia renderiza silenciosamente.
- **Sem loading state**: enquanto consumidor carrega opções, V3 mostra modal vazio.
- **Backdrop click confirma multi-select**: padrão não-padrão (espera-se botão "OK/Cancel"). Acessibilidade fraca; Esc não cancela explicitamente.
- **Cache global em var-de-módulo no consumidor Filtros**: race conditions possíveis com múltiplas instâncias paralelas (`<GenericGridCollection>`).
- **`linkedFilters` síncrono bloqueia UI**: request `await` dentro de handler do change.
- **Mínimo de 3 chars escondido em código**: não é configurável; modelers/consumidores não sabem onde está.
- **Sem teclado**: V3 não trata `ArrowDown/ArrowUp/Enter/Esc/Tab` na lista do modal — só mouse.
- **a11y zero**: sem `role`, sem `aria-expanded`, sem `aria-activedescendant`, sem `aria-multiselectable`. Leitores de tela navegam apenas como botões soltos.
- **Modal sem `<dialog>` nem foco-trap**: foco escapa.
- **`isClearable`** existe em V1 (react-select), **não existe** em V3 — usuário só limpa removendo chips ou pelo botão "Limpar" do `<Filtros>`.

## Notas de implementação para o Studio

(Observações de comportamento, não prescrição de stack.)

- O padrão de produção é "lista pré-carregada + filtro client". Typeahead remoto verdadeiro seria mudança semântica — proc/select endpoints hoje retornam o dataset inteiro de uma vez (centenas ou poucos milhares de linhas). Migração para typeahead remoto exigiria endpoints com `q=` + paginação que **não existem ainda** no contrato dos `/proc/*` e `/select/*`.
- A separação "widget puro V3 + hook compartilhado `useSelectFields` + cache no consumidor" é uma **delegação consciente** — o widget não sabe carregar; quem orquestra é o renderer da página. Studio pode manter ou unificar (ex. select com fetcher prop opcional).
- `pipeliner` é flag de origem propagada da árvore do `GenericPage` (vide grep `pipeliner` em `GenericPage.js`, `GenericForm.js`, `useGenericFormUtils.js`). Marca que a opção veio de seleção no Pipeliner (AppBuilder). Provavelmente não relevante para fluxo geral do Studio fora do AppBuilder (F015 deferred).
- Filtragem por `includes` (não prefix) significa busca por substring em qualquer posição do label. Studio pode preservar ou trocar por prefix/fuzzy explícito.
- O `field.options` (estático) e `field.api`/`field.queryKey` (remoto) são **exclusivos** em design — mas `useSelectFields.sendRequest` curto-circuita `options` antes do api, então se ambos forem definidos `options` ganha. Modelers usam essa precedência para "default + override".
- O contrato implícito da resposta SQL → option (`{id|value, nome|descricao|label}`) é normalizado **só no V1**. V3 espera `{value, label}` exatos; quem normaliza é o `useSelectFields` ou o consumidor. Se Studio padronizar payload SQL, ganha simplificação.

## Sources

- [[calendar/notes/2026-05-16.md]]
