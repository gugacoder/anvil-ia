---
title: "Date components (DateTimePicker, DateInterval, DateTimeInterval, TimePicker) — widgets de data/hora do react-tools"
aliases: [date-components, datetimepicker, dateinterval, datetimeinterval, timepicker, F018]
tags: [contract, legacy, react-tools, date, time, widget, F018, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Contrato: componentes de data/hora (`react-tools/components/Date*` e `TimePicker`)

Cobre **F018** do manifest. Quatro componentes irmãos exportados pelo `react-tools/src/index.js` que cobrem o universo de entrada temporal do legado:

| Componente | Arquivo | Granularidade | Tipo de valor | Single/Range |
|---|---|---|---|---|
| `DateTimePicker` | `components/DateTimePicker/DateTimePicker.js` | data (com hora opcional via `dateAndTime`) | string `yyyy-MM-dd` ou `yyyy-MM-dd HH:mm` | single |
| `DateInterval` | `components/DateInterval.js` | data (sem hora) | string CSV `yyyy-MM-dd,yyyy-MM-dd` (par De/Ate) | range |
| `DateTimeInterval` | `components/DateComponents/DateTimeInterval.js` | data + hora (minuto) | string CSV `yyyy-MM-dd HH:mm,yyyy-MM-dd HH:mm` | range |
| `TimePicker` | `components/TimePicker.js` | hora (minuto) | string CSV `HH:mm,HH:mm` (par De/Ate) | range (sempre — mesmo o nome `Picker` é enganoso) |

Os três interval-widgets compartilham uma convenção opaca: o valor é **sempre uma string com vírgula** (split por `,` para obter início/fim). Não é array, não é objeto. Quem consome (`<Filtros>`, `<GenericForm>`) precisa fazer split. Veja [[filtros-componente]] §"API/payload" para como esses valores aparecem dentro de `_filter` (especialmente FL4: tipo `datetime-interval` é **expandido** em três chaves `<prop>`/`<prop>De`/`<prop>Ate` na agregação do filtro).

`DateTimePicker` é o único single — usa biblioteca externa `react-datepicker` com locale `date-fns/pt-BR`. Os três outros são `<input type="date|datetime-local|time">` nativos do browser (sem locale forçado — depende do OS/browser do usuário). Não há contrato de calendário visual customizado fora do `DateTimePicker`.

## Citações de fonte

- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:1-259` — `DateTimePicker` completo.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:3-5` — imports: `react-datepicker` + CSS + `date-fns/locale/pt-BR`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:13-25` — assinatura: `selectedDate, disabled, name, onDateChange, allowDates, api, apiParams, pageState, useDefaultDate, style, dateAndTime`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:31-84` — `getDateString(date, format)`: formatos `dd/mm/yyyy`, `dd-mm-yyyy`, `yyyy/mm/dd`, default `yyyy-MM-dd[ HH:mm]`. **Default é o que vai para o `onDateChange`** (linha 88 chama `getDateString(date)` sem format).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:85-104` — `handleChange`: valida com `checkAllowedDate`; se inválida emite `value:''` + warning `"Selecione uma data válida."`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:105-112` — `checkAllowedDate`: compara `getDateString(date, 'dd/mm/yyyy')` contra `allowedDates[]` (lista exata de strings).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:113-119` — `handleDayStyle`: aplica `class="date-allowed|date-not-allowed"` por célula quando `allowedDates[]` não-vazio.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:120-145` — `getAllowedDates`: POST `api` com body `{...pageState, ...apiParams}` no `onCalendarOpen`; espera `res.dados.datas.dia: string[]` (formato `dd/mm/yyyy`). Em erro 500 emite warning `"Nenhuma data disponível foi encontrada."`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:146-162` — `useEffect([selectedDate])`: parse de string para `Date`. **Quando `dateAndTime=false` concatena `T00:00:00`**. Date inválida vira `null`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:164-170` — `useEffect`: se `useDefaultDate && !selectedDate` seta `new Date()` (hoje agora) e dispara `handleChange`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:172-185` — `DatePickerButton`: render custom — botão exibindo o valor formatado ou texto `'Abrir calendário.'`. Calendário abre sob clique.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:189-203` — props passadas a `<DatePicker>`: `locale={ptBR}`, `dateFormat={dateAndTime ? 'dd/MM/yyyy HH:mm' : 'dd/MM/yyyy'}` (formato de **exibição** — diferente do formato emitido em `onDateChange`), `onKeyDown={e=>!dateAndTime && e.preventDefault()}` (bloqueia digitação manual quando só data), `showTimeSelect={dateAndTime}`, `timeCaption='Hora'`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateTimePicker/DateTimePicker.js:245-257` — `propTypes`.

- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateInterval.js:1-133` — `DateInterval` completo.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateInterval.js:8-15` — assinatura: `name, value=',', onChange, disabled, loop, useDefaultDate=true`. `loop` é declarado em `propTypes` mas **não é usado no corpo do componente** (dead prop).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateInterval.js:19-27` — `setDefaultDate`: `[hoje-1d, hoje]` formato `yyyy-MM-DD` (note o `-1d`: padrão **assimétrico** com `DateTimeInterval`, que usa `[hoje+daysFromStartDate@00:00, hoje+daysFromEndDate@23:59]`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateInterval.js:29-44` — `handleValidateInterval`: usa `moment().isAfter`/`isBefore`. Erro sinalizado via `<FieldValidationContainer>` mas **não bloqueia `onChange`** — o valor inválido é propagado mesmo assim.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateInterval.js:46-55` — `handleChange`: limpar campo (val==='') re-aplica defaults se `useDefaultDate`, senão **não faz nada** (não zera o estado nem emite onChange — bug observável).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateInterval.js:57-69` — `useEffect([value])`: parse de string com `split(',')`. `null/undefined` → `['','']`. String vazia `''` → `['','']`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateInterval.js:77-82` — `useEffect` mount: `setDefaultDate()` se `useDefaultDate && !value`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateInterval.js:87-106` — render: dois `<input type="date" max="9999-12-31" pattern="..."/>` lado a lado, sem locale (browser-nativo).

- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/DateTimeInterval.js:1-196` — `DateTimeInterval` completo.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/DateTimeInterval.js:8-17` — assinatura: `cName, value=',', containerStyle, onChange, daysFromStartDate=0, daysFromEndDate=0, customConfig, useDefaultDate=true`. **Note `cName` em vez de `name`** — inconsistência de naming entre os irmãos.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/DateTimeInterval.js:21-74` — `setDefaultDate`: ramo `customConfig.endDateInterval === 'startOfMonth'` ajusta para início do mês corrente (apenas esse caso é tratado; outros valores de `customConfig` são ignorados). Default sem `customConfig`: `[hoje+daysFromStart@00:00, hoje+daysFromEnd@23:59]`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/DateTimeInterval.js:76-91` — `handleValidateInterval`: usa `isSameOrAfter`/`isSameOrBefore` (mais estrito que `DateInterval`: rejeita igualdade). Mensagem idêntica.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/DateTimeInterval.js:93-117` — `handleChange`: ramo `val===''` zera para `null` (não string vazia) **se `useDefaultDate=false`**; senão re-aplica defaults. Emite `value` com `.replace('T', ' ')` (browser `datetime-local` produz `2026-05-16T14:30`; legado guarda `2026-05-16 14:30`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/DateTimeInterval.js:119-143` — `useEffect`s: validação reativa, parse de `value`, default no mount.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/DateTimeInterval.js:148-167` — render: dois `<input type="datetime-local" pattern="..." max="9999-12-31T23:59"/>` lado a lado.

- `sources/engenharia--fabrica--javascript--react-tools/src/components/TimePicker.js:1-49` — `TimePicker` completo.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/TimePicker.js:4-12` — assinatura: `name, value=',', onChange`. Sempre dois inputs (não é "picker" singular — é interval de horas).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/TimePicker.js:14-18` — `useEffect([value])`: `value.split(',')`. **Não há validação de ordem nem de formato**; não há default — campo nasce `['','']` se `value` não vier.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/TimePicker.js:21-37` — render: dois `<input type="time">` (browser-nativo).

- `sources/engenharia--fabrica--javascript--react-tools/src/index.js:39-41,81` — exports públicos: os 4 componentes estão na public API do `react-tools`.

### Consumidores principais

- `sources/engenharia--fabrica--javascript--react-tools/src/components/Filtro/Filtros.js:373-378,393-409,421-425,440-446` — `<Filtros>` (F016) consome todos os 4. Veja [[filtros-componente]] §"Estrutura do componente"/`FilterField` para discriminadores:
  - `prop === 'date'` (sic — discriminador por nome de prop, não type) → `<DateTimePicker>`
  - `type === 'time'` → `<TimePicker>`
  - `type === 'dates'` → `<DateInterval>`
  - `type === 'datetime-interval'` → `<DateTimeInterval>` (expande para `<prop>De`/`<prop>Ate` em `handleChange`)
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericForm/Form.js:145-156,337-345,358-366` — `<GenericForm>` consome com nomenclatura diferente: discriminador é `ctype` (não `type`):
  - `ctype === 'date-time'` → `<DateTimePicker>` (passa `dateAndTime` e `useDefaultDate`)
  - `ctype === 'dates'` → `<DateInterval useDefaultDate=false>` (override **fixo** em forms)
  - `ctype === 'datetime-interval'` → `<DateTimeInterval>`
  - `ctype === 'time'` no Form é tratado por `<input type="time">` direto (linhas 137-143), **não usa `<TimePicker>`** — `<TimePicker>` só vive em filtros.

## Estrutura por componente

### `DateTimePicker` (single, data ou data+hora)

| Prop | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `selectedDate` | string | não | Valor atual (controlado externamente) | string `yyyy-MM-dd` ou `yyyy-MM-dd HH:mm`; `''`/`null`/`undefined` para vazio | parse em `Date` interno via `new Date(value + ('T00:00:00' se !dateAndTime))` | state do pai |
| `disabled` | boolean | não | Desabilita botão | true/false | botão recebe `disabled` + classe `custom-data-button-disabled` | model/pai |
| `name` | string | não | Nome do campo emitido no event sintético | string | `onDateChange({target:{name,value}})` | model |
| `onDateChange` | `(e)=>void` | não | Callback no formato `event.target.{name,value}` | função | recebe `value: getDateString(date)` (default `yyyy-MM-dd` ou `yyyy-MM-dd HH:mm` se `dateAndTime`) | pai |
| `allowDates` | string[] | não | Lista exata de datas permitidas em `dd/mm/yyyy` | array de strings | bloqueia clique em datas fora da lista (warning) | model |
| `api` | string | não | Endpoint POST para buscar `allowDates` dinamicamente | URL | chamado em `onCalendarOpen`; body=`{...pageState,...apiParams}`; espera `res.dados.datas.dia: string[]` | model |
| `apiParams` | object | não | Merge no body da request | objeto | spread em cima de `pageState` | model |
| `pageState` | object | não | Estado da página injetado no body | objeto | base do body | pai |
| `useDefaultDate` | boolean | não | Se true e `selectedDate` vazio, usa `new Date()` (agora) como default | true/false | dispara `handleChange(new Date())` no mount | model |
| `style` | object | não | Override inline do wrapper `.col-md-12` | CSSProperties | spread em `<div style>` | model |
| `dateAndTime` | boolean | não (default false) | Liga o time-picker do `react-datepicker` | true/false | `showTimeSelect`, formato de exibição muda para `dd/MM/yyyy HH:mm`, formato emitido muda para `yyyy-MM-dd HH:mm`, libera digitação manual | model |

> **Bug conhecido**: quando `dateAndTime=false`, o `useEffect` concatena `T00:00:00` cru ao parsear `selectedDate`. Em fuso negativo (Brasil = UTC-3), `new Date('2026-05-16T00:00:00')` produz `Date` local correto, mas `new Date('2026-05-16')` (sem `T`) seria UTC-midnight — caindo no dia anterior. O legado evita isso forçando `T00:00:00`. Mas se o valor de entrada já tem `T`, vira `2026-05-16T00:00:00T00:00:00` (Invalid Date) → state=`null`.

### `DateInterval` (range, data sem hora)

| Prop | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `name` | string | não | Nome no event sintético | string | `onChange({target:{name,value}})` | model |
| `value` | string | não (default `','`) | CSV `inicio,fim` em `yyyy-MM-dd` | `'yyyy-MM-dd,yyyy-MM-dd'`, `''`, `','` | parse via `value.split(',')` em `useState(['',''])` | pai |
| `onChange` | `(e)=>void` | não | Callback no formato event-like | função | `value` é `state.toString()` → `"inicio,fim"` | pai |
| `disabled` | boolean | não | Desabilita ambos inputs | true/false | passa `disabled` ao `<input>` | model |
| `loop` | boolean | não (não usado) | Prop declarada mas nunca lida no componente | — | nenhum | — |
| `useDefaultDate` | boolean | não (default `true`) | Aplica `[hoje-1d, hoje]` no mount se sem valor | true/false | dispara `setDefaultDate` no mount e/ou no `handleChange('')` | model |

> Diferenças sutis vs `DateTimeInterval`:
> - default é `[hoje-1d, hoje]` (1 dia atrás → hoje), **sem hora**.
> - Validação usa `isAfter`/`isBefore` (permite igualdade — `[hoje, hoje]` é válido).
> - `handleChange` com `val===''` e `useDefaultDate=false` **não faz nada** (não emite onChange, não zera). Bug observável.
> - Discriminador como prop é `name`, **não `cName`**.

### `DateTimeInterval` (range, data + hora)

| Prop | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `cName` | string | não | Nome no event sintético (**`cName`**, não `name` — inconsistência) | string | `onChange({target:{name:cName,value}})` | model |
| `value` | string | não (default `','`) | CSV `inicio,fim` em `yyyy-MM-dd HH:mm` | `'yyyy-MM-dd HH:mm,yyyy-MM-dd HH:mm'`, `','`, `''` | parse via `value.split(',')` | pai |
| `containerStyle` | object | não | Override do wrapper flex | CSSProperties | spread em `<div style>` | model |
| `onChange` | `(e)=>void` | não | Callback event-like; valor emitido com `.replace('T',' ')` | função | converte `2026-05-16T14:30` (formato HTML `datetime-local`) em `2026-05-16 14:30` | pai |
| `daysFromStartDate` | number | não (default `0`) | Offset em dias do início | inteiro | usado em `setDefaultDate` (`hoje + N dias @00:00`) | model |
| `daysFromEndDate` | number | não (default `0`) | Offset em dias do fim | inteiro | usado em `setDefaultDate` (`hoje + N dias @23:59`) | model |
| `customConfig` | object | não | Override de cálculo do default. Único ramo implementado: `endDateInterval:'startOfMonth'` + `!startDateInterval` → começa do dia 1 do mês | `{startDateInterval, endDateInterval}` | só dispara branch alternativa de cálculo | model |
| `useDefaultDate` | boolean | não (default `true`) | Aplica default no mount; também controla comportamento de clear | true/false | sem default, clear (val==='') seta `null` em vez de re-aplicar | model |

> Validação usa `isSameOrAfter`/`isSameOrBefore` — **rejeita igualdade**. `[hoje 10:00, hoje 10:00]` é inválido aqui (mas seria válido em `DateInterval`).

### `TimePicker` (range, hora)

| Prop | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `name` | string | não | Nome no event sintético | string | `onChange({target:{name,value}})` | model |
| `value` | string | não (default `','`) | CSV `HH:mm,HH:mm` | string com vírgula | parse via `split(',')` | pai |
| `onChange` | `(e)=>void` | não | Callback event-like | função | `value` é `state.toString()` | pai |

> Componente é **um par de inputs `type="time"` lado a lado**, sempre. Não há validação de ordem (`['10:00','09:00']` passa) nem default. Não há prop `disabled`.

## Payload (forma final no estado consumidor)

Convenção **uniforme** dos três interval-widgets: **string CSV**, par separado por `,`. Não array, não objeto. Browsers nativos (inputs `date`/`datetime-local`/`time`) entregam strings; legado preserva e concatena.

| Widget | Forma | Exemplo |
|---|---|---|
| `DateTimePicker` (default) | string `yyyy-MM-dd` | `"2026-05-16"` |
| `DateTimePicker` (`dateAndTime`) | string `yyyy-MM-dd HH:mm` | `"2026-05-16 14:30"` |
| `DateInterval` | string `yyyy-MM-dd,yyyy-MM-dd` | `"2026-05-15,2026-05-16"` |
| `DateTimeInterval` | string `yyyy-MM-dd HH:mm,yyyy-MM-dd HH:mm` | `"2026-05-15 00:00,2026-05-16 23:59"` |
| `TimePicker` | string `HH:mm,HH:mm` | `"08:00,18:00"` |

Quando consumido por `<Filtros>` (F016), o tipo `datetime-interval` é **expandido** em três chaves de `_filter` (vide [[filtros-componente]] FL4): `<prop>` (CSV completo), `<prop>De` (primeira metade), `<prop>Ate` (segunda metade). Os outros tipos não são expandidos — `dates` permanece string CSV, `time` permanece string CSV.

## Validação

| Componente | Regra | Bloqueia onChange? | Como sinaliza |
|---|---|---|---|
| `DateTimePicker` | `allowedDates[]` (lista exata em `dd/mm/yyyy`) — se não-vazia, datas fora viram `value:''` + warning toast | sim (emite `''` no lugar) | `useNotifications.warning('Selecione uma data válida.')` + CSS por célula |
| `DateInterval` | início ≤ fim (`isAfter`/`isBefore`) — permite igualdade | **não** (propaga onChange mesmo inválido) | `<FieldValidationContainer message="A data inicial deve ser menor que a data final."/>` |
| `DateTimeInterval` | início < fim (`isSameOrAfter`/`isSameOrBefore`) — rejeita igualdade | **não** | idem (`'A data inicial deve ser menor que a data final.'`) |
| `TimePicker` | nenhuma | — | — |

**Inversão De/Ate é sinalizada visualmente mas não impede submit** nos intervals — o consumidor (`<Filtros>`/`<GenericForm>`) recebe o valor "ruim" e fica por sua conta validar. O backend (proc) acaba sendo o gate efetivo.

## Internacionalização (locale)

- `DateTimePicker`: usa `date-fns/locale/pt-BR` explicitamente. Calendário e dias da semana em português (domingo = primeiro dia, padrão do pt-BR). Formato de exibição forçado `dd/MM/yyyy[ HH:mm]`. **Formato emitido** ao pai é diferente: `yyyy-MM-dd[ HH:mm]` (ISO-like).
- `DateInterval`, `DateTimeInterval`, `TimePicker`: **sem locale forçado** — usam `<input type="date|datetime-local|time">` nativos. Exibição depende do OS/browser do usuário (Chrome em pt-BR mostra `dd/mm/yyyy`, em en-US mostra `mm/dd/yyyy`). Valor interno (`input.value`) é sempre ISO `yyyy-MM-dd[THH:mm]` por especificação HTML, então o payload final é consistente.
- `moment.locale('pt-br')` é importado em `DateInterval` e `DateTimeInterval` mas é usado apenas para validação e formatação interna do default (`moment().format('yyyy-MM-DD')`). Não afeta UI.

## Mínimos/máximos

- `DateInterval`: `<input max="9999-12-31">` — limite browser-nativo. Sem `min`.
- `DateTimeInterval`: `<input max="9999-12-31T23:59">`. Sem `min`.
- `DateTimePicker`: sem `min`/`max`; mas `allowDates[]` substitui esse conceito com whitelist.
- `TimePicker`: sem `min`/`max`.

Nenhum dos componentes aceita props `minDate`/`maxDate`/`min`/`max` configuráveis — limites são hard-coded ou via `allowDates[]`.

## Estado vazio

| Componente | Vazio é... | Como aparece |
|---|---|---|
| `DateTimePicker` | `selectedDate` falsy → state `null` → botão mostra `'Abrir calendário.'` | botão com texto-placeholder |
| `DateInterval` | `value` falsy ou `','` → state `['','']` → inputs vazios | dois inputs `type=date` vazios |
| `DateTimeInterval` | `value` falsy ou `','` → state `['','']` (ou `null` em handleChange com useDefaultDate=false) | dois inputs `type=datetime-local` vazios |
| `TimePicker` | `value` falsy → state `['','']` | dois inputs `type=time` vazios |

Nenhum aceita `placeholder` configurável. O texto `'Abrir calendário.'` é hard-coded.

## Pares De/Ate (relação com F016)

Quando consumidos por `<Filtros>` com tipo `datetime-interval`, o componente Filtros aplica a convenção de **expansão em três chaves** dentro de `_filter`:

```
_filter['dataAg']     = '2026-05-15 00:00,2026-05-17 23:59'  // CSV original
_filter['dataAgDe']   = '2026-05-15 00:00'                    // split(',')[0]
_filter['dataAgAte']  = '2026-05-17 23:59'                    // split(',')[1]
```

Veja [[filtros-componente]] FL4 e §"API/payload". A expansão é **decisão do Filtros**, não do `DateTimeInterval` — o componente em si só emite a string CSV. Stored procedures consumidoras costumam ler `<prop>De`/`<prop>Ate` direto (convenção implícita `WHERE col BETWEEN @propDe AND @propAte`).

Para `dates` (DateInterval) e `time` (TimePicker), o Filtros **não expande**: a string CSV vai inteira no body, e a proc faz o split.

## Defaults computados

| Componente | Default | Quando aplica |
|---|---|---|
| `DateTimePicker` | `new Date()` (agora — data **e** hora atual) | `useDefaultDate=true` && `!selectedDate` no mount |
| `DateInterval` | `[hoje-1d, hoje]` em `yyyy-MM-DD` | `useDefaultDate=true` no mount && `!value`; também no clear (val==='') |
| `DateTimeInterval` | `[hoje+daysFromStart@00:00, hoje+daysFromEnd@23:59]` (offsets default 0/0) ou `[startOfMonth+daysFromStart@00:00, startOfMonth+daysFromEnd@23:59]` se `customConfig.endDateInterval='startOfMonth'` | `useDefaultDate=true` no mount, no clear, ou quando `value===','` |
| `TimePicker` | nenhum | — |

> **Inconsistência**: `DateInterval` default é `[hoje-1d, hoje]` (intervalo passado de 1 dia); `DateTimeInterval` default é `[hoje@00:00, hoje@23:59]` (dia inteiro de hoje). Os defaults **não são equivalentes** apesar de aparência similar.

## Asserções observáveis (D1..D14)

| # | Componente | Input | Output esperado | Regra | Fonte legado |
|---|---|---|---|---|---|
| D1 | `DateTimePicker` | `selectedDate="2026-05-16"`, `dateAndTime=false` | state interno = `Date` válido representando 2026-05-16 local; botão exibe `"16/05/2026"`; clique abre `react-datepicker` em pt-BR | parse com `T00:00:00` força meia-noite local; `dateFormat='dd/MM/yyyy'`; locale `ptBR` | `DateTimePicker.js:146-162, 195, 5` |
| D2 | `DateTimePicker` | escolher 16/05/2026 no calendário, `dateAndTime=false` | `onDateChange({target:{name, value:"2026-05-16"}})` | `getDateString(date)` sem format → branch default `yyyy-MM-dd` | `DateTimePicker.js:73-80, 88-94` |
| D3 | `DateTimePicker` | `dateAndTime=true`, escolher 16/05/2026 14:30 | `onDateChange({target:{name, value:"2026-05-16 14:30"}})` (espaço, não T) | branch default concatena `' '+time` se `dateAndTime` | `DateTimePicker.js:77-80, 195` |
| D4 | `DateTimePicker` | `allowDates=["15/05/2026"]`, escolher 16/05/2026 | `onDateChange({target:{name, value:""}})` + toast warning `"Selecione uma data válida."` | `checkAllowedDate` compara em `dd/mm/yyyy`; falha → `warning()` e value vazio | `DateTimePicker.js:96-103, 105-112` |
| D5 | `DateTimePicker` | `useDefaultDate=true`, `selectedDate=""` no mount | dispara `handleChange(new Date())` automaticamente → emite data de hoje | `useEffect` linha 164-170 | `DateTimePicker.js:164-170` |
| D6 | `DateInterval` | mount com `value=""`, `useDefaultDate=true` | `onChange({target:{name, value:"<hoje-1d>,<hoje>"}})` formato `yyyy-MM-DD,yyyy-MM-DD` | `setDefaultDate` em `useEffect([])` | `DateInterval.js:19-27, 77-82` |
| D7 | `DateInterval` | `value="2026-05-20,2026-05-15"` (fim < início) | render mostra `<FieldValidationContainer>` com mensagem `"A data inicial deve ser menor que a data final."`; **`onChange` NÃO é re-emitido** (valor já externalizado) | validação reativa em `useEffect([state])` mas não bloqueia upstream | `DateInterval.js:29-44, 119-121` |
| D8 | `DateInterval` | usuário digita início válido, depois apaga (val==='') com `useDefaultDate=false` | **nada acontece** (state inalterado, sem onChange) | `handleChange` linha 46-55: ramo `val===''` sem `useDefaultDate` é no-op | `DateInterval.js:46-55` |
| D9 | `DateTimeInterval` | mount, `useDefaultDate=true`, sem `customConfig`, offsets default | `onChange({target:{name:cName, value:"<hoje> 00:00,<hoje> 23:59"}})` (formato `yyyy-MM-DD HH:mm`) | `setDefaultDate` linha 52-67 | `DateTimeInterval.js:52-67, 139-143` |
| D10 | `DateTimeInterval` | usuário escolhe 2026-05-16T14:30 no input HTML | `onChange({target:{name:cName, value:"2026-05-16 14:30,..."}})` — **`T` virou espaço** | `handleChange` chama `.replace('T',' ')` na string final | `DateTimeInterval.js:103-115` |
| D11 | `DateTimeInterval` | `customConfig={endDateInterval:'startOfMonth'}`, mount em 16/05/2026 | default vira `["2026-05-01 00:00", "2026-05-01 23:59"]` (início do mês, mesmo dia para os dois) | branch `startOfMonth` em `setDefaultDate` linha 27-49 | `DateTimeInterval.js:25-50` |
| D12 | `DateTimeInterval` | `value="2026-05-16 10:00,2026-05-16 10:00"` (início == fim) | `<FieldValidationContainer>` ativo (`isSameOrAfter` falha); diferença vs `DateInterval` que aceita igualdade | `isSameOrAfter`/`isSameOrBefore` linha 79-86 | `DateTimeInterval.js:76-91` |
| D13 | `TimePicker` | mount sem `value` | inputs renderizam vazios; **sem default**; **sem onChange disparado** | `useEffect([value])` só age se `value` truthy; sem `useEffect([])` de default | `TimePicker.js:14-18` |
| D14 | `TimePicker` | usuário muda só o segundo input para `18:00`, primeiro estava `08:00` | `onChange({target:{name, value:"08:00,18:00"}})` | `handleChange(idx, val)` clona state, atualiza índice, emite `state.toString()` | `TimePicker.js:7-12` |
| D15 | todos os intervals | clear de um dos inputs com `useDefaultDate=true` | recomputa defaults dos dois e re-emite — clear é **bilateral**, perde o valor manualmente preenchido do outro lado | `handleChange` ramo `val===''` chama `setDefaultDate` | `DateInterval.js:46-49`, `DateTimeInterval.js:93-108` |
| D16 | `DateTimePicker` | `disabled=true` | botão custom recebe atributo `disabled` + classe `custom-data-button-disabled`; calendário não abre | render linha 173-181 | `DateTimePicker.js:172-185` |
| D17 | `DateTimePicker` | `api="/data/disponiveis"`, `pageState={emp:1}`, abrir calendário | POST `/data/disponiveis` body `{emp:1, ...apiParams}`; `res.dados.datas.dia` populando `allowedDates` | `getAllowedDates` no `onCalendarOpen` | `DateTimePicker.js:120-145` |

## Relações com o ecossistema

- Consumidos por:
  - [[filtros-componente]] (F016) — discriminadores `prop='date'`, `type='time'`, `type='dates'`, `type='datetime-interval'`.
  - `<GenericForm>` (F010) — discriminador `ctype`: `'date-time'`, `'dates'`, `'datetime-interval'`. **Não usa `<TimePicker>`** (usa `<input type=time>` direto).
- Exportados publicamente: `react-tools/src/index.js:39-41,81`.
- Dependências externas:
  - `DateTimePicker` → `react-datepicker` + `date-fns/locale/pt-BR`.
  - `DateInterval`, `DateTimeInterval` → `moment` + `moment/locale/pt-br` (apenas para defaults; UI é browser-nativa).
  - `DateInterval`, `DateTimeInterval` → `FieldValidationContainer` (componente de mensagem de erro inline).
- Backend não tem contrato dedicado de data — procs leem strings cruas (`yyyy-MM-dd` ou `yyyy-MM-dd HH:mm`) e fazem `CAST` ou comparação direta. O formato emitido pelo legado **bate** com o que o SQL Server aceita em `CONVERT(datetime, @x, 120)` (ISO 8601 sem T), o que sugere convergência intencional ao longo do tempo.

## ⚠️ Inércia legada

Pontos que o Studio deve decidir explicitamente preservar ou superar:

- **Payload string CSV** em vez de `{from,to}` ou `[Date,Date]`. Convenção opaca exigindo `split(',')` em todo consumidor. Procs assumem o formato.
- **`cName` vs `name`** entre irmãos (`DateTimeInterval` quebra a convenção). Modelers precisam lembrar.
- **`prop==='date'` no Filtros** discrimina o single-picker por nome de prop, não por type. Convenção mágica (vide [[filtros-componente]]).
- **Defaults assimétricos**: `DateInterval` = `[hoje-1d, hoje]`; `DateTimeInterval` = `[hoje@00:00, hoje@23:59]`. Mesma "cara", semânticas diferentes.
- **Validação não bloqueia**: intervalos com início > fim **passam** pelo onChange. Só sinalizam visualmente. Backend é o gate efetivo.
- **`DateInterval.handleChange('', useDefaultDate=false)` é no-op silencioso** (D8) — bug observável: usuário apaga, nada acontece. Provavelmente herdado e ninguém reportou.
- **`TimePicker` sem default e sem validação** — qualquer combinação `HH:mm,HH:mm` passa, inclusive invertida.
- **`allowDates[]` em `dd/mm/yyyy`** (formato exibição), enquanto valor emitido é `yyyy-MM-dd`. Conversão acontece em `checkAllowedDate`. Inconsistência interna do próprio componente.
- **Single-picker depende de react-datepicker**; intervals dependem de browser-nativo. UX divergente (mobile especialmente).
- **`useDefaultDate` é tristate na prática**: ausente vs `false` vs `true` produzem comportamentos sutilmente diferentes em cada componente (em `DateInterval` default é `true`; em `DateTimePicker` ausência = `false`). Não há contrato canônico.
- **`DateTimeInterval.customConfig`** só implementa o ramo `startOfMonth`. Qualquer outro valor é silenciosamente ignorado (cai no default normal). Extensibilidade ilusória.
- **`react-datepicker` carrega CSS global** (`react-datepicker/dist/react-datepicker.css`) — afeta o resto da página se houver colisão de seletores.
- **Sem suporte a fuso horário explícito** — tudo é "local do browser". Operações cross-tz não têm contrato.
- **Sem suporte a só-mês ou só-ano** — granularidades existentes: data, datetime, time. Nada acima de dia, nada abaixo de minuto (segundos não são editáveis na UI).

## Notas de implementação para o Studio

- Os 4 componentes são candidatos a colapso em uma primitiva única configurável por modo (`single|range`, `date|datetime|time`) e granularidade. O acoplamento atual é orgânico (cada um nasceu separado), não arquitetural.
- Considerar payload em objeto/array (`{from, to}` ou `[from, to]`) com adaptador na ponte para preservar compatibilidade com procs que esperam CSV.
- Estabilizar discriminação: hoje há **três** discriminadores diferentes (`type` em Filtros, `ctype` em Form, `prop` em Filtros para o single-picker). Padronizar.
- Locale forçado em todos (não só no single-picker) — ou contrato explícito de "respeita locale do browser".
- Validação que bloqueia onChange (ou um modo `strict`) é melhoria não-breaking se mantiver fallback.
- TimePicker hoje é par — se Studio quiser "hora única", precisa de componente novo.

## Sub-contratos relacionados

- [[filtros-componente]] (F016) — como esses widgets são despachados e como o tipo `datetime-interval` é expandido em `<prop>De`/`<prop>Ate`.
- (futuro) `select-options-endpoint.md` — não relacionado diretamente, mas mesma família de "widget de filtro".
- (futuro) `input-masking.md` — convenções de máscara em texto/número, complementares.

## Sources

- [[calendar/notes/2026-05-16.md]]
