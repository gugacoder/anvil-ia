---
title: "model-valor.genericform — schema do nó form no DFvalor"
aliases: [model-valor-genericform, genericform-model, form-renderer-contract]
tags: [contract, legacy, react-tools, genericform, model-valor, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Contrato: nó `genericform` dentro de `DFvalor` (model de página)

Sub-contrato do [[engine-schema-driven]] para o discriminante `genericform`. Cataloga a **forma** do nó JSON `genericform` no `acesso.TBmodel_pagina.DFvalor` (vide [[obter-model-pagina]] e [[tbmodel-pagina]]). Quando o engine encontra `genericform.model` no model parsed, instancia `<GenericForm/>` (`react-tools/src/components/GenericForm/GenericForm.js`) e o renderiza inline ou em modal. Cobre F010 do manifest.

O nó `genericform` descreve **três coisas em um só lugar**: (a) o **schema do formulário** — uma matriz 2D de campos agrupados em linhas; (b) os **endpoints** de leitura (`api`) e gravação (`endPoint`); (c) os **botões de ação** e **modais auxiliares** atrelados ao form. Não há separação entre "model" e "view" no legado — o JSON contém ambos.

## Citações de fonte

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:25-53` — props aceitas pelo componente (forma plana derivada do nó `genericform`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:106-130` — `openModalForm` (fluxo "+ novo" em `formOnModal`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:153-172` — `cleanForm` (reset por defaultValue dos fields).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:411-462` — `openConfirmationModal` + `handleSubmit` (gating de obrigatórios + 3 caminhos de submit).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:501-539` — `handleDefaultValue` (popula state inicial por ctype).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/GenericForm.js:635-775` — `renderGenericForm` (branch inline vs modal + render dos `actionModalConfigs`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/Form.js:71-414` — dispatch de campo por `ctype`/`maskType` (catálogo completo de tipos de campo suportados).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/Form.js:74-91` — regra `checkValue` (visibilidade condicional baseada em outro campo).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/Form.js:417-543` — render dos `buttons` (incluindo `checkValue` por botão, `select-button`, `editForm`, e fallback `btnSaveFormButton`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/hooks/useGenericForm.js:6-13` — universo de actions de field-prop (`alterFieldPropsActions`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/hooks/useGenericForm.js:106-198` — `executeLinkedFields` (cascata reativa entre campos).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/hooks/useGenericForm.js:223-259` — `handleExecuteProcedure` (POST `/proc/<chave>`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/hooks/useGenericFormActions.js:10-195` — catálogo completo de `action` aceitos em `actions[]` / `linkedFields[].actions`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/hooks/useGenericFormUtils.js:62-130` — `_handleFillForm` (GET `api+id` → preencher form, modo edit).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/hooks/useGenericFormUtils.js:201-265` — `_sendPostRequest` (submit + tratamento de erros + reload do grid via `setCurrentFilter`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/hooks/useGenericFormValidation.js:34-187` — regras de validação de obrigatoriedade por `ctype`/`maskType`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:115-130` — como o engine **injeta** as props no `GenericForm` (spread de `...genericform` + props auxiliares do `GenericPage`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:266-296` — gating de render: `genericform.model` é o discriminador real; `formOnModal` decide se o botão `+` aparece.
- `sources/engenharia--fabrica--sql--portal-director/processa.appbuilder/1-alimentacao/insert_template_pagina.sql:12-17` — seeds canônicos contendo `genericform` (`TemplateCadastro`, `TemplateFormulario`, `TemplateIntegracao`).
- `sources/engenharia--fabrica--sql--portal-director/processa.agendamento/alimentacao/model.gerenciar_agendamento.sql:7-438` — exemplo real e completo de `genericform` em produção (com `api`, `actionModalConfigs`, `buttons` com `checkValue`, `model` 2D de 8 linhas, `linkedFields`, `dParam*`).

## Estrutura do nó `genericform`

Chaves no objeto raiz `genericform`:

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `model` | `Field[][]` (matriz 2D) | sim | Schema do formulário. Cada elemento externo é uma **linha visual**; cada interno é um **campo**. Layout: `row.mb-2` por linha; campos em colunas Bootstrap (`col-md-{field.md}`). | array de arrays. Vazio `[]` é legal (form sem campos). | `<GenericForm/>` itera `rows.map(row.map(field))` (`Form.js:71`). Render do nó só dispara se `genericform.model` truthy (`GenericPage.js:292`). | `Form.js:71` |
| `endPoint` | string (path) | quando há submit default | URL alvo do POST de submit. Resolvido pelo `useRequest` (proxy `/api` na origem). | rota relativa, ex.: `/proc/agent.persistir_agendamento`, `/api/pipeliner/jobs`. | Submit default (`_sendPostRequest`) faz `postAsync(endPoint, body)`. Se ausente e sem `useGenericFunction`/`onSubmitForm`, submit é no-op silencioso. | `useGenericFormUtils.js:213` |
| `api` | string (path com `{id}` implícito) | quando `crudForm=true` ou edit por search-input | URL para **carregar** registro (modo edição). O componente concatena `api + id`. | rota relativa que aceita id ao final, ex.: `/get/proc/agent.consultar_agendamento_calendario/`. | `_handleFillForm` faz `getAsync(api + id)`, mapeia resposta pra `state` por nome de campo, ajusta `disabled` para `notEditable`, abre modal se `formOnModal`. | `useGenericFormUtils.js:62-130` |
| `crudForm` | bool / `'true'`/`'false'` | não | Marca form como CRUD. Quando truthy, abrir modal com `id` faz `handleFillForm` (carrega dados); título do modal muda para `Alterar ...` vs `Cadastro ...`. | `true`, `false`, strings equivalentes. | `GenericForm.js:106-110`, `:735-738`. | seed `TemplateCadastro` |
| `formOnModal` | bool / `'true'`/`'false'` | não | Form não renderiza inline; só aparece em `<Modal/>` disparado pelo botão `+` ou por `handleFillForm`. | `true`, `false`. | `GenericForm.js:636-767`; gate do botão `+` em `GenericPage.js:266-279`. | seed `TemplateCadastro` |
| `hideAddButton` | bool / `'true'`/`'false'` | não | Esconde o botão `+` mesmo com `formOnModal=true`. | bool / string-bool. | `GenericPage.js:268-269`. Usado quando o form em modal é aberto exclusivamente por interação no grid (handleFillForm), sem cadastro novo. | `GenericPage.js:268` |
| `openModalButtonId` | string | não | `id` HTML do botão `+`. | qualquer string. | `GenericPage.js:271`. | exemplo `model.gerenciar_agendamento` |
| `styleModalButton` | objeto CSS | não | Inline style do botão `+`. | objeto `{cssProp: valor}`. | `GenericPage.js:273`. Esconde botão com `{display: "none"}` em formulários abertos só por linhas do grid. | seed |
| `modalConfig` | objeto | quando `formOnModal=true` | Configuração visual do modal. | ver §"Sub-estrutura `modalConfig`". | passado a `<Modal/>`. | `GenericForm.js:73-80` |
| `buttons` | `Button[]` | não | Botões de ação no rodapé do form, **substituindo** o "Salvar" default quando array não-vazio. | array de objetos `Button`. | `GenericForm.js:69`, `Form.js:417-543`. Se `length>0` em modal, modal não mostra `onConfirm`/`onCancel` próprios — botões customizados controlam o submit. | seed `TemplateCadastro`/`TemplateIntegracao` |
| `actionModalConfigs` | `ActionModalConfig[]` | não | Modais auxiliares acionados por botão do form (ex.: "Cancelar agendamento" pede uma observação em modal extra). | array. | `GenericForm.js:131-150`, `:640-723`. | `model.gerenciar_agendamento.sql:17-51` |
| `genericFormAdditionalBodyParam` | string (chave `dParamN`) / objeto | não | Merge de chaves adicionais no body do POST de submit. Suporta interpolação `dParamN` (eval em [[engine-schema-driven]]). | objeto ou string-dParamN. | `GenericForm.js:432-436`. | seed |
| `executeOnOpenForm` | objeto `executeProcedure` | não | Proc chamada quando modal abre (sem id). Resposta vira `state` inicial. | objeto `{ proc, updateFormValues, ...}`. | `GenericForm.js:113-128` (via `handleExecuteProcedure`). | uso ad-hoc |
| `onRequiredFieldsFilledExecuteActions` | `Rule[]` | não | Quando todos os obrigatórios estiverem preenchidos, executa `actions[]`; caso contrário executa `counterActions[]`. | array de `{ actions, counterActions }`. | `GenericForm.js:557-577`. | uso ad-hoc |
| `onCloseFormModalActions` | `Action[]` | não | Ações disparadas ao fechar o modal do form. | array de actions (vide §"Action set"). | `GenericForm.js:93-95`. | seed |
| `useGenericFunction` | string (chave de `funcoes`) | não | Quando presente, submit chama `executeGenericFunctions(chave, args)` em vez de `_sendPostRequest`. | chave existente em `funcoes` do payload de [[obter-model-pagina]]. | `GenericForm.js:438-449`. | `model.gerenciar_agendamento.sql` (referencia `handle_*`) |
| `genericFunctionArgs` | array | não | Argumentos do `executeGenericFunctions`. | qualquer. | `GenericForm.js:441-447`. | seed |
| `onSubmitForm` | função JS | não | Override programático do submit (só quando o componente é embutido por código React custom; **não** vem do JSON do banco — chega via prop direta). | função. | `GenericForm.js:450-458`. Ver §"Notas — submit". | uso em componentes proprietários |
| `formButtonTitle` | string | não | Label do botão "Salvar" default (quando `buttons` é vazio). | qualquer string. | `Form.js:538`. | seed `TemplateIntegracao` (`"Enviar"`) |
| `resetFormConfig` | objeto | não | (Recebido como prop mas não exercitado no caminho que lemos.) Reservado para auto-reset. | objeto. | declarado em `GenericForm.js:27`; sem uso ativo. | (legado-órfão) |
| `editForm` | bool | não | Habilita botão extra "Editar" no rodapé do form para re-habilitar campos `disabled`. | bool. | `Form.js:521-529`. | uso ad-hoc |

### Sub-estrutura `modalConfig`

| Item | Tipo | Obrigatório | Semântica | Efeito |
|---|---|---|---|---|
| `modalTitle` | string | sim quando `formOnModal=true` | Título do modal. Em `crudForm`, é prefixado por `Cadastro ` (sem id) ou `Alterar ` (com id). | `GenericForm.js:734-737` |
| `modalColor` | string (token Bootstrap) | não | Cor de cabeçalho. | `GenericForm.js:730` |
| `modalStyle` | objeto CSS | não | Style do `<Modal/>`. | `:732` |
| `modalBodyStyle` | objeto CSS | não | Style do body. | `:733` |
| `onCloseModalAction` | função | não | (Recebida via prop direta — não vem do JSON.) | `GenericForm.js:92` |
| `onCancelModalAction` | função | não | idem. | `:98` |
| `submitButtonTitle` | string | não | Label do botão de confirmar. | `:79` |

### Sub-estrutura `actionModalConfigs[]`

Cada item:

| Item | Tipo | Obrigatório | Semântica | Efeito |
|---|---|---|---|---|
| `modalId` | string | sim | Identificador único do modal auxiliar. | chave para abrir/fechar via `openActionModal`/`handleCloseActionModal`. |
| `modalTitle` | string | sim | Título. | render. |
| `useGrid` | bool | não | Se `true`, modal exibe um `<DataGrid/>` no lugar do mini-formulário. | `GenericForm.js:652-666` |
| `gridTitle` | string | quando `useGrid=true` | Título do grid. | `:657` |
| `gridApi` | string (path) | quando `useGrid=true` | Endpoint da grid auxiliar. | `:660` |
| `gridHeaders` | `Header[]` | quando `useGrid=true` | Headers do grid auxiliar (mesma estrutura de [[tbmodel-pagina-grid]]). | `:661` |
| `model` | `Field[]` (linha única) | quando `useGrid=false` | Mini-formulário do modal auxiliar (não 2D — array plano de campos). | `:669-691` |
| `useGenericFunction` | string | sim | Chave de `funcoes` a executar no clique de Confirmar. | `:701-706` |
| `submitButtonTitle` | string | não | Label do botão confirmar. | `:709` |

### Sub-estrutura `Field` (cada elemento de `model[i][j]`)

Campos comuns a **todos** os tipos:

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `name` | string | sim | Chave técnica. Também vira `state[name]` no React e chave no body do submit. | identificador. Nome com sufixo `De`/`Ate` é gerado automaticamente para `dates`/`datetime-interval` (`GenericForm.js:319-324`). | `Form.js` usa em todos os branches; `_getFormValues` propaga para o body. | `Form.js` |
| `label` | string | sim para visibilidade | Rótulo visível. | qualquer. | `Form.js:397` via `<FieldLabel/>`. | seed |
| `ctype` | string (enum) | não (default = `input` puro) | Discrimina o tipo de controle. Ver §"Tipos de campo (`ctype`)". | enum (lista abaixo). | `Form.js:94-391` — cadeia de `if/else if`. | seed/exemplo |
| `md` | string/number | não | Largura Bootstrap (1-12); col padrão se omitido. | 1-12 ou string. | `Form.js:395` → `col-md-${md}`. | seed |
| `required` | bool / `'true'` | não | Marca obrigatório (asterisco + validação). | bool / string-bool. | `Form.js:397`; `useGenericFormValidation.js:64-66`. | seed |
| `hideField` | bool / `'true'` / string-`dParamN` | não | Esconde o campo. | bool / `'true'` / `'false'` / chave dParam. | `useGenericFormUtils.js:14-23` retorna `display:'none'`. | seed |
| `disabled` | bool | não | Desabilita controle. Pode ser ligado dinamicamente por `disableField`/`enableField`. | bool. | passado para `<Input/>` etc. via spread. | runtime |
| `notEditable` | bool / `'true'` / string-`dParamN` | não | Em modo edit (form carregado via `api`), força `disabled=true`. | bool / string-bool. | `useGenericFormUtils.js:147-148`, `:174-175`, `:191-193`. | seed |
| `forceDisable` | bool | não | Imune a `handleEnableDisableFields('enable')` — fica desabilitado. | bool. | `GenericForm.js:278`. | uso ad-hoc |
| `defaultValue` | qualquer | não | Valor inicial em `state[name]`. | depende de `ctype` (ver §). | `GenericForm.js:158`, `:501-539`. | seed |
| `value` | qualquer | não | Valor pre-set quando state ainda vazio (auto-aplica via `handleChange`). | depende de `ctype`. | `Form.js:369-372`. | seed |
| `placeholder` | string | não | Placeholder do controle. | qualquer. | spread. | seed |
| `maxLength` | number / string | não | Tamanho máximo do input. | inteiro. | spread. | seed |
| `style` | objeto CSS | não | Inline style do controle. | objeto. | spread. | seed |
| `fieldInfo` | string | não | Descrição auxiliar exibida com toggle `cil-info` global no topo do form. | qualquer. | `Form.js:405-409`. | seed |
| `checkValue` | objeto `{formProp, mustBeEqual, values[]}` | não | Visibilidade condicional baseada em outro campo. Se `formProp`'s value ∈ `values` ⇔ `mustBeEqual`, mostra; senão esconde. | objeto fixo. | `Form.js:74-91`. | `model.gerenciar_agendamento.sql:425-429` |
| `linkedFields` | `LinkedField[]` | não | Reatividade entre campos: quando outro campo `field` mudar, comparar valor com `checkValue` e executar `actions[]` ou `counterActions[]`. | array de objetos (ver §"`linkedFields[]`"). | `useGenericForm.js:106-198`. | `model.gerenciar_agendamento.sql:336-358` |
| `loop` | bool | não | (Para `datetime-interval`) propaga par `De`/`Ate` como `loop:[{key:'min',value:'<name>De'},...]` no state. | bool. | `GenericForm.js:322-324`. | uso ad-hoc |
| `useDefaultDate` | bool | não | (Para `date-time`/`datetime-interval`) usa data atual como default. | bool. | `Form.js:154`. | seed |
| `dateAndTime` | bool | não | (Para `date-time`) ativa selector de hora além da data. | bool. | `Form.js:155`. | seed |
| `notEditable` adicional para selects | bool | não | Em selects, força `disabled=true` quando edit-mode. | bool. | `useGenericFormUtils.js:147`. | seed |
| `maskType` | string (enum) | não | Máscara/formato. Ver §"`maskType`". | enum. | `Form.js:246-249`, `useGenericFormValidation.js:100-150`. | seed |
| `maskLength` | string/number | não | Tamanho da máscara (para `numerosTamanhoVariavel`/`celular`/`cnpj` etc.). | inteiro. | spread. | seed |
| `acceptTypeDefault` | bool | não | (Para `inteiro`) se `false`, valor `0`/string vazia falha validação obrigatória. | bool. | `useGenericFormValidation.js:124-137`. | uso ad-hoc |

### Tipos de campo (`ctype`)

Enumeração completa do dispatch em `Form.js:94-391`:

| `ctype` | Componente renderizado | Notas | Origem |
|---|---|---|---|
| (ausente) ou `input` | `<Input/>` puro (texto) | Default. Aceita `maskType` para máscaras. | `Form.js:368-390` |
| `append` | `<AppendList/>` | Coleção de objetos (sub-formulário tipo lista). | `:94-104` |
| `append-input` | `<AppendInput/>` | Lista de strings com botão "adicionar". `state[name]` é array. Validação rejeita `['AppendInputError']`. | `:105-114`; `useGenericFormValidation.js:19-32` |
| `date` | `<Input type=date/>` | Pattern dd/mm/yyyy, max `9999-12-31`. | `:115-128` |
| `time` | `<Input type=time/>` | Default `00:00`; obrigatório falha se `===00:00`. | `:130-143`; validation `:155-158` |
| `date-time` | `<DateTimePicker/>` | Aceita `useDefaultDate`, `dateAndTime`. | `:145-156` |
| `dates` | `<DateInterval/>` | Range de datas. State propaga `<name>De`/`<name>Ate`. | `:337-345` |
| `datetime-interval` | `<DateTimeInterval/>` | Range de data+hora. State propaga `<name>De`/`<name>Ate`. | `:358-366` |
| `file` | `<FileBrowser/>` | Upload. `onChange` e `onSendFile` viram `handleChange`. | `:158-166` |
| `select` | `<PowerSelect/>` (`PowerSelect3`) | Combo. Opções vêm de `useSelectFields` (proc/api por `field.api`). | `:167-209` |
| `search-input` | `<Input/>` + botão lupa | Botão chama `field.actions` (se houver) ou `handleFillForm(state[name])` para CRUD lookup. | `:210-244` |
| `checkbox` | `<Checkbox/>` | Default popula `state[name]` por `checkBooleanValue(defaultValue)`. | `:266-277`; default `GenericForm.js:506-513` |
| `icon-list` | `<IconListButton/>` | Selector de ícone (catálogo CoreUI). | `:278-288` |
| `grid-button` | `<GridButton/>` | Campo que abre grid auxiliar para selecionar múltiplas linhas (state guarda `[name]` + `gridButtonData[name]` + `[name]Rows`). | `:289-305`; `GenericForm.js:339-345` |
| `bool` | `<NullableBool/>` | Três estados (null / true / false). Default `null`. | `:306-314`; `:517-519` |
| `text-area` | `<TextArea/>` | Multi-linha. `rowNumber` configura altura. `cleanForm` esvazia DOM direto. | `:315-328`; `GenericForm.js:161-164` |
| `radio` | `<RadioButton/>` | Default = primeiro item de `field.values[]`. | `:329-336`; `:514-516` |
| `numbers` | `<InputNumbers/>` com `maskType=numerosTamanhoVariavel` | Atalho para campo numérico variável (default `maskLength=100`). | `:347-357` |

> **Sem `ctype`** + `maskType in {inteiro,decimal}` cai num branch dedicado `Form.js:246-264` (input com máscara, sem componente diferenciado).

### `maskType` (catálogo observado)

| `maskType` | Semântica | Onde valida |
|---|---|---|
| `inteiro` | Inteiro positivo; `acceptTypeDefault=false` bloqueia `0`/vazio. | `useGenericFormValidation.js:123-137` |
| `decimal` | Decimal com máscara. | `Form.js:247` |
| `cpf-cnpj` | CPF (11) ou CNPJ (14); validação rejeita comprimentos intermediários. Submit limpa `./-`. | `useGenericFormValidation.js:101-114`; `useGenericFormUtils.js:39-41` |
| `cnpj` | CNPJ estrito (14). | `:115-122` |
| `email` | Email único; valida domínio `.com`/`.br`. Detecta duplicatas. | `useGenericFormValidation.js:1-17`, `:138-149` |
| `celular` | Telefone celular (BR). | seed |
| `placaVeicular` | Placa BR (Mercosul-aware). | seed |
| `numerosTamanhoVariavel` | Numérico de tamanho variável. | seed |

### Sub-estrutura `linkedFields[]`

Cada item:

| Item | Tipo | Obrigatório | Semântica | Efeito |
|---|---|---|---|---|
| `field` | string | sim | Nome do campo **observado** (não o atual). | dispara quando `handleChange` desse campo executa. |
| `value` / `checkValue` | qualquer / objeto | não | Valor esperado para acionar `actions[]`. `value: ""` casa com qualquer (é triagem default em `_compareCheckValueWithState`). `checkValue` aplica regra por `ctype` (string-compare, integer-compare, select com `.value`, bool, etc.). | `useGenericForm.js:282-323` |
| `actions` | `Action[]` | sim | Ações executadas quando condição confere. | `useGenericForm.js:139-158` |
| `counterActions` | `Action[]` | não | Ações executadas quando NÃO confere. | idem |

> **Cascata recursiva**: cada ação pode disparar `linkedFields` de outro campo, com **deduplicação** via `actionController` para evitar loop (`useGenericForm.js:143-149`). Reset do guard no fim do invocador raiz.

### Action set (`actions[]` e `counterActions[]`)

Universo aceito em `useGenericFormActions.js:10-195` + `useGenericForm.js:38-100`:

| `action` | Parâmetros | Efeito |
|---|---|---|
| `setValue` | `fieldName`, `value` | Define `state[fieldName] = value`. Para `dates`/`datetime-interval` com `value=''`, limpa também sufixos `De`/`Ate`. |
| `enableField` | `fieldName`, `fieldProp` | `field.disabled=false`. |
| `disableField` | `fieldName`, `fieldProp` | `field.disabled=true`. |
| `showField` | `fieldName`, `fieldProp` | `field.hideField=false`. |
| `hideField` | `fieldName`, `fieldProp` | `field.hideField=true`. |
| `setRequiredField` | `fieldName`, `fieldProp` | `field.required=true`. |
| `setNotRequiredField` | `fieldName`, `fieldProp` | `field.required=false`. |
| `executeProcedure` | `proc`, `value`, `updateFormValues`, `callbackActions?` | POST `/proc/<proc>` (resolve URL com prefixo se ausente). Resposta vira `state` (single-row → merge; array → array). `callbackActions` rodam `actions`/`counterActions` baseado em comparação de campo da resposta. |
| `updateSelectOptions` | `fieldName`, `proc` | POST `/proc/<proc>` → resposta vira `selectOptions[fieldName]`. |
| `concatValue` | `fieldName`, `prefix?`, `sufix?` | `state[fieldName] = prefix + state[fieldName] + sufix`. |
| `removeConcatValue` | `fieldName`, `prefix?`, `sufix?` | Remove prefix/sufix de `state[fieldName]`. |
| `removeFieldError` | `fieldName`, `value` | `fieldErrors[fieldName] = value`. |
| `cleanForm` | — | Reseta todo o form. |
| `alterButtonsVisibility` | `btnName`, `hideButtonsList[]`, `showButtonsList[]` | Liga/desliga `hideButton` de botões. Caso especial `btnSearchInput` (depende de `state.id`). |
| `handleEnableDisableFields` | `value: 'enable'|'disable'` | Liga/desliga **todos** os campos (respeitando `notEditable`/`forceDisable`). |
| `executeExternalAction` | `externalAction(values, helpers)`, `value?`, `checkFields?` | Chama callback JS direto (com gating opcional por obrigatórios). |
| `executeGenericFunction` | `useGenericFunction`, `genericFunctionArgs?`, `checkFields?` | Chama `executeGenericFunctions(chave, args)` (eval do código em `funcoes`). |
| `fillForm` | — | Se `state.id`, dispara `handleFillForm(state.id)` (GET `api+id`). |
| `sendRequestCorreiosApi` | `fieldName`, `value` (>=8 chars) | Chama API de Correios via `useFetch.requestApiCorreios`; preenche `bairro`/`logradouro`/`localidade`/`uf`. |
| `openActionModal` | `actionModalId` | Abre modal auxiliar em `actionModalConfigs[]`. |

### Sub-estrutura `Button` (cada item de `buttons[]` ou `formButtons[]`)

| Item | Tipo | Obrigatório | Semântica | Efeito |
|---|---|---|---|---|
| `id` | string | não | id HTML. | spread |
| `name` | string | sim | Identificador lógico (usado em `alterButtonsVisibility`). | runtime |
| `title` | string | sim | Texto do botão. | render |
| `color` | string (token Bootstrap, sem prefixo `btn-`) | não | Cor. Default `primary`. | `Form.js:449-451` |
| `type` | string | não | `'select-button'` muda render para `<SelectButton/>` (botão com select acoplado, populado por `api`). | `Form.js:432-446`, `:489-503` |
| `api` | string (path) | quando `type='select-button'` | Endpoint do select acoplado. | `:438` |
| `formFieldName` | string | quando `type='select-button'` | Campo do form alimentado pela seleção. | `:440` |
| `disableSelect` | bool / string-dParam | não | Desabilita seleção do `select-button`. | `:442` |
| `disable` | bool / string-dParam | não | Desabilita botão. | `:443` |
| `actions` | `Action[]` | sim | Ações executadas no clique (mesmo catálogo do Action set acima). | `Form.js:453`, `:444` |
| `hideButton` | bool / `'true'`/`'false'` / string-dParam | não | Esconde botão. | `Form.js:421-423` |
| `checkValue` | objeto `{formProp, mustBeEqual, values[]}` | não | Visibilidade condicional baseada em outro campo (mesma semântica de `Field.checkValue`). | `Form.js:425-487` |

> Quando `buttons` é vazio e `formOnModal=false`, o `Form` injeta automaticamente um `<button id="btnSaveFormButton">` cujo `onClick=handleSubmit` (`Form.js:530-542`). Esse é o caminho default "Salvar".

## Submit — 3 caminhos

`handleSubmit` (`GenericForm.js:431-462`), gated por `openConfirmationModal` (que valida obrigatórios e mostra modal "Tem certeza?"):

1. **`useGenericFunction` presente** → `executeGenericFunctions(chave, args)` (eval da função no banco).
2. **`onSubmitForm` presente** (prop direta, não-JSON) → callback custom.
3. **Default** → `_sendPostRequest({ endPoint, body, ...})`:
   - `postAsync(endPoint, body)`.
   - Sucesso (HTTP 200 + `sucesso=true`): toast `success(resposta.dados || mensagem || dados)`, fecha modal, limpa selected/filter no grid acoplado.
   - Erro: HTTP 500 → toast genérico. Mensagem contendo `Violation of UNIQUE KEY constraint` ou `duplicate key` → toast humanizado. Caso contrário → `warning(dados.mensagem || dados)`.
   - `pipeliner=true` → ativa `setPageBlur` (overlay) durante a chamada e desliga depois.

> **Confirmation modal** é fixo, hard-coded com texto `"Tem certeza que deseja realizar a operação?"` (`:624-632`). Não há opt-out por JSON.

## Loading / error / success — estados visíveis

| Momento | Estado | Implementação |
|---|---|---|
| Form carregando dados em modo edit | `setPageBlur(true)` (overlay global) | `useGenericFormUtils.js:76`, `:124` |
| Submit em `pipeliner=true` | `setPageBlur(true)` durante POST | `useGenericFormUtils.js:215`, `:261-263` |
| Submit em modo normal | **Sem indicador.** Botão fica clicável; submit é otimista. | (omissão observada) |
| Erro de validação | Borda vermelha no campo (`Form.js:262`) + `<FieldValidationContainer/>` exibe mensagem. Toast `warning('Verifique todos os campos obrigatórios( * ) .')` no submit. | `GenericForm.js:426-428` |
| Erro do server | Toast (`warning`) ou `console.error`. | `useGenericFormUtils.js:244-260` |
| Sucesso | Toast (`success`). Fecha modal e limpa state se `formOnModal`. Re-fetch do grid acoplado (`setCurrentFilter()`). | `useGenericFormUtils.js:219-243` |

## Estado preservado

- `state` (objeto chave→valor) e `stateRef` (espelho síncrono para `eval` em `funcoes`).
- `rows` (cópia mutável de `model[][]`, alterada por `alterFieldProps` em runtime).
- `formButtons` (cópia mutável de `buttons[]`).
- `originalModel` (ref imutável) — usado por `handleResetForm` para restaurar.
- `selectOptions` — **módulo-level** (`let selectOptions = {}` fora do componente, `GenericForm.js:24`), portanto **compartilhado entre instâncias**. Risco em multi-aba.

## Convivência com outros nós do model

- Quando `genericform` coexiste com `datagrid` / `filtro`: o engine renderiza ambos. `formOnModal=true` faz o form esconder-se até o botão `+` ou interação no grid (cadastro vs edição); `formOnModal=false` empilha o form acima do grid.
- `pipeliner: true` no model raiz é flag externa ao `genericform`; chega ao componente como prop `pipeliner` e modifica apenas o submit (overlay) e implicitamente o `endPoint` (que aponta para `/api/pipeliner/jobs`).
- `actionModalConfigs[]` pode acionar `<DataGrid/>` interno — convivência form+grid também acontece em modal auxiliar.

## Relações com o ecossistema

- Consome de: [[engine-schema-driven]] (define quando esse nó é instanciado); [[obter-model-pagina]] (define o transporte do JSON e a injeção de `funcoes`/`modelParams`).
- Despacha para: `<PowerSelect/>`, `<DataGrid/>`, `<DateTimePicker/>`, `<FileBrowser/>`, `<AppendList/>`, `<AppendInput/>`, `<GridButton/>`, `<NullableBool/>`, `<TextArea/>`, `<RadioButton/>`, `<SelectButton/>`, `<IconListButton/>`, `<DateInterval/>`, `<DateTimeInterval/>`, `<Modal/>`. Cada um merece sub-contrato próprio na onda de descoberta.
- Procedimentos backend: `proc/<chave>` para `executeProcedure`/`updateSelectOptions`/`executeOnOpenForm`; endpoint arbitrário em `endPoint`/`api`.
- Funções `funcoes` (eval JS): consumidas por `useGenericFunction` (submit) e `executeGenericFunction` (botões/linked fields). Toda a superfície de eval do form depende do escopo cascateado de [[engine-schema-driven]] §"Como `funcoes` (eval JS) entram no fluxo".

## Notas de implementação para o Studio

- **Schema é 2D**: `model[][]` força layout em linhas, e cada linha tem larguras Bootstrap (`md`). O Studio decide se preserva a topologia 2D crua ou abstrai linhas (ex.: grupos com `flex-wrap`).
- **Visibilidade não-exclusiva**: `hideField`, `checkValue`, `linkedFields[].actions:hideField` e `disabled` se compõem livremente. Resolver no Studio requer estratégia clara de "última escrita ganha" (legado) vs reativo declarativo (idiomático em React/Solid moderno).
- **`dParamN` é texto, não AST**: aparece como string em `notEditable`, `hideField`, `hideButton`, `disableSelect`, `apiParams`, `additionalFilterParams`. A interpolação é literal em `evalModelDynamicParams` ([[engine-schema-driven]]). Studio precisa de mecanismo equivalente ou compilar dParams em tempo de migração.
- **Submit otimista**: legado não trava UI durante POST exceto via `pipeliner` flag. Estados "submitting" são responsabilidade do Studio (não há precedente legado).
- **`select` é mais complexo do que aparenta**: opções vêm de `field.api` (proc/api) via `useSelectFields`, lazy-loaded em `useLayoutEffect`. Em edit-mode, valor lido do banco vira objeto via `_getSelectOption(options, valorBruto, fieldName)` — depende das opções já estarem carregadas. Race condition latente.
- **`grid-button` é um sub-renderer**: campo que abre grid de seleção dentro do form. Tem filtro próprio + grid próprio + multi-select. Quase um mini-Filtro+DataGrid embutido — merece sub-contrato dedicado.
- **`actionModalConfigs[].useGrid=true`** é mecanismo para "abrir grid em modal a partir do form" — usado em históricos/logs. Acopla F010 com F011.
- **`onSubmitForm`/`executeOnOpenForm` aceitam funções nuas**: na prática só usados quando o componente é embutido por código React custom (não vem do JSON). Não migrar como capability do schema.
- **`selectOptions` em escopo módulo**: bug arquitetural — múltiplas instâncias de `GenericForm` sobrescrevem opções. Studio deve isolar por instância.
- **Confirmation modal hard-coded**: texto fixo "Tem certeza que deseja realizar a operação?" sem opt-out. Studio decide se mantém, parametriza ou remove.
- **`crudForm` muda o título do modal mas não o fluxo**: mesmo sem `crudForm`, `handleFillForm` ainda funciona; `crudForm` só afeta o prefixo `Cadastro `/`Alterar `. Decisão Studio: tratar como cosmético ou como contrato.
- **Eval no submit**: `useGenericFunction` faz `executeGenericFunctions` em todo submit; a função do banco recebe `genericProps` (array fixo de 15 callbacks, `GenericForm.js:391-409`). Esse array é **API estável** — qualquer reordenação quebra os scripts do banco.

## Sources

- [[calendar/notes/2026-05-15.md]]
