---
title: "model-valor.genericcalendar — schema do no calendar no DFvalor"
aliases: [model-valor-genericcalendar, genericcalendar-model, calendar-renderer-contract, F036]
tags: [contract, legacy, react-tools, genericcalendar, model-valor, director-studio, F036]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Contrato: no `genericcalendar` dentro de `DFvalor` (model de pagina)

Sub-contrato do [[engine-schema-driven]] para o discriminante `genericcalendar`. Cataloga a **forma** do no JSON `genericcalendar` em `acesso.TBmodel_pagina.DFvalor` (vide [[obter-model-pagina]] e [[tbmodel-pagina]]). Quando o engine encontra a chave `genericcalendar` no model parsed, instancia `<GenericCalendar/>` (`react-tools/src/components/GenericCalendar/GenericCalendar.js`), que e um wrapper fino sobre `<Calendar/>` (`components/DateComponents/Calendar.js`) + `<Filtros/>` (vide [[filtros-componente]]). Cobre **F036** do manifest.

O no `genericcalendar` descreve **quatro coisas em um so lugar**: (a) o **endpoint** que serve os eventos por intervalo de datas; (b) o **endpoint** que serve as configuracoes de estilo/legenda por status; (c) parametros de **filtro adicional** mesclados no body do POST; (d) o **schema do sumario** exibido por dia. Renderer interno e **proprio do react-tools** — nao usa `react-big-calendar`, `FullCalendar` nem outra lib externa de calendario; e construido manualmente sobre `moment` + `moment/locale/pt-br` (locale forcado no import) + grid Bootstrap (`row`/`col`). Vide §"Lib subjacente".

Diferente do [[model-valor-genericform|genericform]] e [[model-valor-datagrid|datagrid]], o `genericcalendar` nao define o **conteudo** dos eventos (campos, formato do title/description) — isso e responsabilidade da procedure de servidor (vide §"API endpoints"). O no JSON so descreve o **renderer**.

## Citacoes de fonte

- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericCalendar/GenericCalendar.js:13-37` — assinatura completa do wrapper `GenericCalendar` (props aceitas, derivadas do no `genericcalendar` via spread em `GenericPage.js:136-141`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericCalendar/GenericCalendar.js:72-80` — `getEventConfigs` (GET `eventStyleConfigsApi` no mount, popula `eventStyles`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericCalendar/GenericCalendar.js:94-130` — `renderGenericCalendar` (filtro acima + `<CalendarProvider><Calendar/></CalendarProvider>` abaixo).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericCalendar/GenericCalendar.js:132-136` — `GenericCalendar` retorna **objeto de fns** (`renderGenericCalendar`, `toggleCalendarFilter`, `setCalendarCurrentFilter`), nao JSX — chamado como hook custom em `GenericPage.js:136`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericCalendar/GenericCalendar.js:64-70` — `handleClickEvent` (bifurcacao `fillGenericForm` → `handleFillForm(id)` vs `onClickCalendarEvent(param)`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericCalendar/GenericCalendar.js:19-20` — props `views` e `messages` sao destructuradas mas **nunca usadas** (dead props no codigo atual, ainda presentes em models de producao).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar.js:24-36` — assinatura do `Calendar` (renderer interno).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar.js:127-155` — `getEventsAsync` (POST `api` com body `{ startOfRange, endOfRange, ...filter, ...additionalFilterParams }`, expects `response.dados.calendarEvents = { events, eventSummary }`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar.js:23` — `_requestInProgress` (mutex de modulo-global; impede concorrencia entre re-renders).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar.js:157-190` — `useEffect`s que re-disparam `updateCalendarRange` em mudancas de `filter`/`currentYear`/`currentMonth`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar.js:192-238` — render switch de views (`month` / `week` / `day` / `agenda`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/CalendarContext.js:10-24` — `CalendarProvider` (estado inicial: `currentView='month'`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/CalendarUtils.js:6-11` — catalogo canonico de `views` (`month`, `week`, `day`, `agenda`).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/CalendarUtils.js:13-21` — `weekdays` (semana comeca em **Domingo**, hardcoded em PT-BR).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/CalendarUtils.js:38-77` — `getCurrentMonthRange` (matriz 6x7 com `startOf('week')` do moment + locale pt-br).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/CalendarUtils.js:79-95` — `getCurrentWeekRange`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/CalendarHeader.js:24-28` — `navigationButtons` (`<` / `Hoje` / `>`) hardcoded.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/CalendarHeader.js:30-61` — `headerTitle` por view (formato `MMMM de YYYY` em mes, intervalo `DD/MM/YYYY` em agenda/semana, `DD de MMMM, YYYY` em dia).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/CalendarHeader.js:84-134` — render dos badges de status (clickable, toggle `eventStatusVisibility` por valor → esconde eventos daquele status).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/CalendarHeader.js:192-208` — botoes de troca de view (todos os 4 sempre renderizados; nao ha gating por config).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/Views/MonthView.js:54-113` — grid de 6 semanas × 7 dias; `onClick` em cada celula muda para view `day` daquele dia.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/Views/MonthView.js:59-80` — `onMouseDown`/`onMouseUp` deteccao de single-click vs range-select; **range-select faz `console.log` apenas**, nao dispara callback.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/Views/AgendaView.js:88-200` — lista vertical de dias com eventos, summary collapsavel por dia.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/Views/WeekView.js:32-77` — 7 colunas, sem grade horaria (week e visao de **dias** lado a lado, nao timeline 24h).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/Views/DayView.js:43-54` — visao unica do dia (sem timeline horaria).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/EventDisplayContainer.js:14-244` — render dos eventos por celula/dia: month mostra **contadores agrupados por status**; week/day mostra **lista de eventos**.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/EventDisplayContainer.js:108-130` — em `month`, evento vira badge com contador (nao mostra titulo/descricao por evento individual).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/EventDisplayContainer.js:170-217` — em `week`/`day`, evento renderiza `id - title` + `description` + `tempoDescarga` (todos do servidor).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/SummaryContainer.js:1-87` — render do `eventSummaryConfig` (lista de `{prop, type?}`; `type='progress-bar'` usa `CalendarProgressBar`, demais sao badges/spans).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/DateComponents/Calendar/CalendarProgressBar.js:4-37` — barra de progresso (verde<50 / amarelo<75 / laranja<100 / vermelho≥100).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:49` — discriminacao no engine: chave `genericcalendar` destructurada do `model`.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:133-141` — engine instancia o renderer e injeta `handleFillForm`, `setFilter` adicionais.
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:236` — em `<Filtros>` do GenericGridPage, botao **filtro** dispara `toggleCalendarFilter` quando `genericcalendar !== undefined` (compartilhamento do toolbar de filtro).
- `sources/engenharia--fabrica--javascript--react-tools/src/components/GenericPage/GenericPage.js:309-310` — gating de render: `genericcalendar !== undefined` instancia o bloco; falsy hide.
- `sources/engenharia--fabrica--javascript--react-tools/src/index.js:57` — `GenericCalendar` exportado pelo barrel.
- `sources/engenharia--fabrica--sql--portal-aws/agent/alimentacao/insert_pagina_gerenciar_agendamento.sql:478-510` — exemplo real de no `genericcalendar` em producao (Gerenciar Agendamento).
- `sources/engenharia--fabrica--sql--portal-director/processa.agendamento/alimentacao/model.gerenciar_agendamento.sql:480` — mesmo no replicado no portal-director.
- `sources/engenharia--fabrica--sql--portal-aws/agent/programacao/agent.obter_calendario_agendamentos.sql:1-227` — proc canonica que serve a chave `api` do `genericcalendar` (formato do payload de resposta).
- `sources/engenharia--fabrica--sql--portal-aws/agent/programacao/agent.obter_calendario_agendamentos.sql:55-75` — schema das duas TVPs internas (`#temp_eventos_calendario`, `#temp_sumario_eventos`) que viram `events[]` e `eventSummary[]` no payload.
- `sources/engenharia--fabrica--sql--portal-aws/agent/programacao/agent.obter_calendario_agendamentos.sql:204-225` — XML→JSON contract (`FOR XML PATH('CalendarEvents')` com namespace `json:Array='true'`).
- `sources/engenharia--fabrica--javascript--react-tools/example/src/routes/TesteGenericCalendar.js:481-552` — exemplo dev (com `eventStyleConfigs` inline, sem `eventStyleConfigsApi`).

## Estrutura do no `genericcalendar`

| Item | Tipo | Obrigatorio | Semantica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| `api` | string (path) | sim | URL do POST que retorna eventos do intervalo atualmente visivel. Resolvido pelo `useRequest` (proxy `/api`). | rota relativa, ex.: `/proc/agent.obter_calendario_agendamentos`. | A cada mudanca de mes/ano/filtro, `Calendar.js:127-155` faz `postAsync(api, { startOfRange, endOfRange, ...filter, ...additionalFilterParams })` e espera `response.dados.calendarEvents`. Se ausente, calendario fica vazio (proc default da chamada nao executa). | `Calendar.js:131-137` |
| `eventStyleConfigsApi` | string (path) | nao | URL do GET que retorna a **legenda de status** (cores + labels). Quando presente, faz a chamada uma vez no mount; caso contrario usa `eventStyleConfigs` inline. | rota relativa, ex.: `/select/statusagendamento`. | `GenericCalendar.js:72-80` faz `getAsync(eventStyleConfigsApi)` e popula `eventStyles` (passado como `eventStatusConfig` ao `Calendar`). | seeds gerenciar_agendamento.sql |
| `eventStyleConfigs` | `EventStatusConfig[]` | nao (fallback de `eventStyleConfigsApi`) | Legenda de status definida inline no model. | array de objetos. Vide §"Sub-estrutura `EventStatusConfig`". | Estado inicial de `eventStyles` em `GenericCalendar.js:40`. | seeds |
| `eventCounterProp` | string | nao (no model) — **forcado a `'eventStatus'` pelo wrapper** | Nome da propriedade do evento usada para contar por status no badge mensal. | qualquer prop do objeto evento. | `GenericCalendar.js:123` injeta hardcoded `eventCounterProp={'eventStatus'}` — chave do model **NAO e respeitada** se vier diferente. | `GenericCalendar.js:123` |
| `additionalFilterParams` | string (chave `dParamN`) ou objeto | nao | Parametros extras mesclados no body do POST de eventos (acima do filtro do usuario). Suporta interpolacao `dParamN` (vide [[engine-schema-driven]] e [[tbmodel-parametro]]). | string-dParamN, objeto `{chave: valor}`, ou objeto aninhado com `{value, label}` (mesmo shape de `<Filtros>`). | `Calendar.js:131-136` faz `{ ...filter, ...additionalFilterParams }`. Casos vistos: `dParam3` (objeto com `usuarioSupply`, `responsavelCnpj`, `emailUsuarioLogado`). | seed gerenciar_agendamento |
| `fillGenericForm` | bool | nao | Quando `true`, clique em evento chama `handleFillForm(event.id)` (abre form em modal carregando o registro). Quando `false`/ausente, chama `onClickCalendarEvent(event)`. | `true`, `false`. | `GenericCalendar.js:64-70`. Em producao, sempre pareado com `genericform.formOnModal=true` e `genericform.api`. | seed |
| `checkFilterToFocusCalendar` | objeto `{filterProp, focusDate}` | nao | **Declarado mas inerte no codigo atual** — destructurado em `GenericCalendar.js:31` mas nunca lido. Provavel intencao: quando filtro mudar (ex.: `numAgendamento` preenchido), focar calendario no dia do evento encontrado. | objeto `{filterProp:string, focusDate:bool}`. | Nenhum efeito observavel no source atual. Documentado em seed mas dead code. | `GenericCalendar.js:31`, seed |
| `views` | `string[]` | nao | **Dead prop no codigo atual** — destructurado em `GenericCalendar.js:19` mas nunca lido. Header sempre renderiza todas as 4 views (`CalendarHeader.js:192-208`). | array com subset de `["month","week","day","agenda"]`. | Nenhum efeito. Models de producao declaram `["month","day","agenda"]` mas botao "Semana" aparece mesmo assim. | `GenericCalendar.js:19`, seed |
| `messages` | `{noEventsInRange, showMore}` | nao | **Dead prop no codigo atual** — destructurado com default `{noEventsInRange:null, showMore:null}` em `GenericCalendar.js:20` mas nunca lido. AgendaView esconde dias sem eventos silenciosamente (`AgendaView.js:92`); nao ha mensagem de "Nenhum agendamento". | objeto `{noEventsInRange:string, showMore:string}`. | Nenhum efeito visivel no DOM. | `GenericCalendar.js:20`, seed |
| `eventSummaryConfig` | `SummaryEntry[]` | nao | Define **quais props do `eventSummary[]`** sao exibidas e em que ordem, por dia. Cada entry vira badge ou progress-bar. | array de `{prop:string, type?:'progress-bar'}`. | Salvo em `CalendarContext.calendarConfigs.eventSummaryConfig`; consumido por `EventDisplayContainer.js:38-49` e `SummaryContainer.js:13-19`. | seed |
| `showCustomComponent` | string (`dParamN`) ou bool | nao | Liga/desliga a renderizacao do `SummaryContainer`. Suporta interpolacao `dParamN` (ex.: `dParam4` resolve para boolean por usuario). | `true`, `false`, `'dParamN'`. | Avaliado por `checkBooleanValue` em `EventDisplayContainer.js:141,149` e `AgendaView.js:112`. | seed |
| `eventProp` | string | nao | **Dead prop no codigo atual** — destructurado em `GenericCalendar.js:34` mas nunca lido. Provavel intencao: nome da prop usada como chave de agrupamento. Substituido na pratica por `eventCounterProp` hardcoded. | qualquer prop. | Nenhum efeito. | seed (`"status"`) |
| `onClick` | fn | nao | Callback declarado mas **nao usado** no codigo atual (`GenericCalendar.js:16`). | funcao. | Nenhum efeito (no codigo do wrapper; `MonthView.js:67-69` apenas faz `console.log('click')`). | declaracao |
| `onDoubleClick` | fn | nao | Idem `onClick` — declarado mas inerte. `MonthView.js:77-79` faz `console.log('dblclick')`. | funcao. | Nenhum efeito. | declaracao |
| `onClickCalendarEvent` | fn | nao | Callback chamado quando `fillGenericForm` falsy e usuario clica em evento. Recebe objeto evento completo. | funcao. | `GenericCalendar.js:68`. Injetado pelo engine ou by-pass do model. | wrapper |
| `handleFillForm` | fn | nao | Callback chamado quando `fillGenericForm=true` e usuario clica em evento. Recebe `event.id`. | funcao. | Injetado pelo `GenericPage.js:138` (sai do `GenericForm` hook). | wrapper |
| `setCurrentFilter` | fn | nao | Injetado pelo engine; usado para atualizacao do filtro do calendario via setter externo. | funcao. | `GenericCalendar.js:30` destructura; e exposto de volta como `setCalendarCurrentFilter`. | wrapper |
| `filtro` | objeto (vide [[filtros-componente]]) | nao | Bloco de filtros exibido **acima** do calendario. Mesmo formato do `filtro` no irmao [[model-valor-datagrid]]. Campos `required` bloqueiam carga de eventos ate serem preenchidos. | objeto `{id, model:[Field]}`. | `GenericCalendar.js:44-46,98-112`; `verifyRequiredFilters` em `:48-62` gateia `getCalendarEvents`. | seed |

## Sub-estrutura `EventStatusConfig`

Cada elemento de `eventStyleConfigs[]` (ou da resposta de `eventStyleConfigsApi`):

| Campo | Tipo | Semantica | Vem de |
|---|---|---|---|
| `value` | string | Valor canonico do status (match contra `event.eventStatus` do servidor). | `EventDisplayContainer.js:53` |
| `label` | string | Texto exibido no badge da legenda. | `CalendarHeader.js:112` |
| `style` | string (JSON serializado!) | Estilo CSS inline do badge. **String com JSON dentro**; `JSON.parse(style)` em runtime. Ex.: `'{"color":"#fff","backgroundColor":"rgb(0 166 80)"}'`. | `CalendarHeader.js:106`, `EventDisplayContainer.js:60` |
| `alwaysShow` | bool / string-bool | Quando truthy, badge aparece mesmo com contador zero. | `EventDisplayContainer.js:122` |
| `showTotalCount` | bool / string-bool | Quando truthy, badge mostra **total geral** do dia, nao filtrado por `value`. Usado em entry tipo "Total". | `CalendarUtils.js:231,241,267` |

## Sub-estrutura `SummaryEntry` (`eventSummaryConfig[]`)

| Campo | Tipo | Semantica |
|---|---|---|
| `prop` | string | Nome da propriedade lida do objeto `eventSummary` daquele dia (vinda do servidor). |
| `type` | string opcional | `'progress-bar'` instancia `CalendarProgressBar`. Ausente → badge/span numerico. |

## API endpoints

### Endpoint de eventos (`api`)

**Verbo**: POST. **Body**: `{ startOfRange:"yyyy-MM-DD", endOfRange:"yyyy-MM-DD", ...filter, ...additionalFilterParams }`. **Resposta esperada**: `{ sucesso, status, dados: { calendarEvents: { events:[Event], eventSummary:[SummaryRow] } } }`. Procedure canonica de exemplo: `agent.obter_calendario_agendamentos`.

#### Shape de `Event` (do servidor)

| Campo | Tipo | Semantica | Vem de |
|---|---|---|---|
| `id` | number | Identificador do registro. Passado pra `handleFillForm` ou `onClickCalendarEvent`. | proc:60 |
| `startAt` | string `yyyy-MM-DD` ou moment | Data de inicio (usada para filtrar eventos por celula). | `CalendarUtils.js:167-178` |
| `endAt` | string ou null | Data de fim. Nao consumido no render atual. | proc:209 |
| `title` | string | Linha principal do evento. | proc:60, render `EventDisplayContainer.js:182` |
| `description` | string | Linha secundaria (multi-bloco em pipes no exemplo). | proc:61, render `EventDisplayContainer.js:204` |
| `eventStatus` | string | Codigo do status (match com `EventStatusConfig.value`). Nome **eventStatus** e hardcoded em varios pontos. | `CalendarUtils.js:235,247`, `EventDisplayContainer.js:53,162` |
| `tempoDescarga` | string | Campo **especifico do dominio agendamento** que vazou para o renderer generico — referenciado por nome em `AgendaView.js:180`, `EventDisplayContainer.js:168,209`. Acoplamento direto entre renderer "generico" e dominio. | `Calendar.js`/`AgendaView.js` |

#### Shape de `SummaryRow` (do servidor)

| Campo | Tipo | Semantica |
|---|---|---|
| `eventDate` | string `yyyy-MM-DD` ou moment | Chave de match com a celula do dia (`CalendarUtils.js:184-213`). |
| `<prop>` | string | Qualquer chave referenciada em `eventSummaryConfig[].prop` (ex.: `total`, `utilizado`, `disponivel`, `departamentos`, `outros`, `porcentagem`). |

### Endpoint de legenda (`eventStyleConfigsApi`)

**Verbo**: GET. **Resposta esperada**: `{ sucesso, status, dados:[EventStatusConfig] }`. Convencao de URL no legado: `/select/<nomeTabela>` (proc do tipo "select de lookup"). Vide [[engine-schema-driven]] sobre o padrao `/select/`.

## Modos de visualizacao

Quatro views fixas, todas hardcoded em `CalendarUtils.js:6-11`:

- `month` (default em `CalendarContext.js:13`) — matriz 6×7. Eventos mostrados como **badges agrupados por status** (contador). Clique em celula → muda para `day` daquele dia (`MonthView.js:93-98`).
- `week` — 7 colunas (Dom..Sab), **sem grade horaria**. Eventos listados verticalmente por dia.
- `day` — coluna unica, **sem grade horaria**. Eventos listados verticalmente.
- `agenda` — lista vertical: para cada dia com eventos, mostra `[Dia da semana, dd/mm/yyyy]` + lista de eventos + sumario collapsavel. Dias sem eventos **omitidos**.

Botoes de troca de view sao **sempre** os 4, em `CalendarHeader.js:192-208`. O prop `views` do model nao restringe (dead prop).

Locale forcado: **pt-br** via `import 'moment/locale/pt-br'` em multiplos arquivos. Nao ha configuracao para outros locales. Inicio de semana: **Domingo** (`weekdays[0].momentWeekDay=0`).

## Interacao

- **Clique em evento**: `handleClickEvent(eventObject)` em todas as views. Bifurca em `GenericCalendar.js:64-70` por `fillGenericForm`. Sempre passa o objeto evento completo.
- **Clique em celula de dia (month)**: muda view para `day` daquele dia (`MonthView.js:93-98`). Nao dispara callback externo.
- **Range-select (mousedown→mouseup em celulas diferentes, month)**: detectado mas **so faz `console.log('select', ...)`** (`MonthView.js:72-74`). Nao ha hook para selecao de intervalo.
- **Double-click**: `console.log('dblclick')` (`MonthView.js:77-79`). Inerte.
- **Navegacao de datas**: `<` / `Hoje` / `>` em `CalendarHeader.js:143-152`. Operacoes: `goBack`/`currentDay`/`goForward`. Step varia por view: month/agenda = 1 mes; day = 1 dia; week = 7 dias (`CalendarUtils.js:121-149`).
- **Seletores de mes/ano**: `<select>` Bootstrap em `CalendarHeader.js:153-181`. Ano e fixado em intervalo `currentYear-3 .. currentYear+3` (`CalendarUtils.js:38-45`); ano so muda dentro de `1999 < y < 2050` (`Calendar.js:162`).
- **Filtro lateral**: botao "filtro" da toolbar do `GenericPage` (`GenericPage.js:236`) chama `toggleCalendarFilter` quando ha `genericcalendar`. Estado `showFilter` em `GenericCalendar.js:38`.
- **Toggle de visibilidade de status**: clique em badge da legenda (`CalendarHeader.js:109-111`) alterna `eventStatusVisibility[value]` — esconde eventos daquele status em todas as views.

## Lib subjacente

**Renderer proprio**, nao usa lib externa de calendario. Stack interno:

- `moment` (legado, ja deprecated upstream) + `moment/locale/pt-br` — calculo de datas, formatacao, intervalos.
- `uuid` — keys de listas.
- Grid Bootstrap (`row`, `col`, `col-md-*`) — layout dos painels.
- `<style jsx>` (vanilla style elements) — CSS scoped por componente.
- React context (`CalendarContext`) — estado compartilhado entre views/header/badges.

Pistas residuais: classe CSS `rbc-event-custom-content` em `EventDisplayContainer.js:128` e o prefixo `rbc-` (react-big-calendar) — sugerem que **houve migracao de react-big-calendar** para implementacao propria em algum momento, mas o codigo atual nao importa `react-big-calendar` em nenhum lugar do `react-tools/src`.

## CSS / locale

- Locale **pt-br** hardcoded via `moment/locale/pt-br` (importado em 9 arquivos do subsistema). Sem mecanismo de troca.
- Estilos sao mistura de classes Bootstrap (`badge`, `btn`, `btn-outline-dark`, `form-select`, `form-control`, `progress`, `progress-bar`, `collapse show`, `row`, `col`) + `<style jsx>` inline em cada view com `.calendar-body`, `.calendar-date-cell`, `.calendar-body-week-view`, `.calendar-body-day-view`, `.calendar-body-agenda-view`.
- Larguras minimas hardcoded (`minWidth: 908px` em varios pontos) — calendario **nao e responsivo** mobile.
- Cores de badge de status sao **dados** (no `style` JSON-string de cada `EventStatusConfig`), nao CSS.

## Mutex global

`Calendar.js:23` declara `let _requestInProgress = false` em escopo de modulo (singleton). Toda chamada de `getCalendarEvents` faz gate por essa flag e dispara `setPageBlur(true)`. Consequencia observavel: **apenas uma instancia de calendario por aplicacao** pode estar carregando ao mesmo tempo. Se houver duas paginas com calendario abertas em abas internas, a segunda chamada pula silenciosamente.

## Asseroes observaveis (C1..C12)

1. **C1** — POST com body `{startOfRange, endOfRange, ...}` dispara em todo mount, mudanca de `filter`, e mudanca de `currentMonth`/`currentYear` (3 useEffects em `Calendar.js:157-170`). Range cobre **6 semanas inteiras** (matriz completa, nao apenas mes), entao `startOfRange` pode ser do mes anterior e `endOfRange` do mes seguinte (`CalendarUtils.js:73-74`).
2. **C2** — Resposta nao no shape `{ dados: { calendarEvents: {...} } }` resulta em `eventDataObject = {}` (sem erro visual) — `Calendar.js:139-143`.
3. **C3** — Quando `filtro.model` tem campo `required:true` e ele esta vazio, **calendario nao carrega eventos** (gating em `GenericCalendar.js:48-62` + `Calendar.js:54-61`). Nenhuma mensagem aparece — apenas grade vazia.
4. **C4** — Botoes de view incluem `Semana` mesmo quando model declara `"views":["month","day","agenda"]`. Prop `views` e dead code.
5. **C5** — Mensagem `messages.noEventsInRange` declarada no model nao aparece em lugar nenhum do DOM (dead prop).
6. **C6** — View `month` mostra contadores agrupados (`12`, `3`, `7`) por status; views `week`/`day` mostram lista de eventos com `id - title` + `description`; view `agenda` agrupa por dia com cabecalho em PT-BR (`Quarta-feira, 21/05/2025`).
7. **C7** — Clique em badge de status na legenda alterna visibilidade (esconde eventos daquele status em todas as views simultaneamente). Estado vive no contexto.
8. **C8** — Clique em evento dispara **uma** das duas rotas, exclusivas: `handleFillForm(id)` se `fillGenericForm=true`, senao `onClickCalendarEvent(event)`. Nao ha bubbling.
9. **C9** — Clique em celula vazia no mes muda a view para `day` daquele dia. Nao dispara nenhum callback do model.
10. **C10** — Loading visual e `setPageBlur(true)` global durante o fetch (vide [[modals]]/global blur). Concorrencia bloqueada pelo mutex `_requestInProgress`.
11. **C11** — Locale e sempre pt-br: nomes de meses (`Janeiro`..`Dezembro`), abreviacoes de dias (`Dom.`..`Sab.`), labels (`Mes`/`Semana`/`Dia`/`Agenda`/`Hoje`) hardcoded em `CalendarUtils.js`/`CalendarHeader.js`.
12. **C12** — Renderer assume que `event.eventStatus` casa com `EventStatusConfig.value` (string compare). Se nao casar, evento ainda renderiza, mas sem estilo (`EventDisplayContainer.js:62-64` fallback `{...x}` sem `style`).

## Sub-contratos relacionados

- [[engine-schema-driven]] — engine que dispatcha por chave (`genericcalendar` aqui).
- [[obter-model-pagina]] / [[tbmodel-pagina]] — onde o JSON vive.
- [[tbmodel-parametro]] / [[tbfuncao-model]] — `dParamN` e funcoes genericas usadas em `additionalFilterParams`, `showCustomComponent`.
- [[filtros-componente]] — bloco `filtro` reaproveitado em cima do calendario.
- [[model-valor-genericform]] — irmao no mesmo `DFvalor`; recebe `handleFillForm` injetado pelo engine para abrir form modal em clique em evento.
- [[model-valor-datagrid]] — alternativa de discriminante para a mesma pagina (datagrid mostra como tabela, genericcalendar como calendario).
- [[notifications]] / [[modals]] — `setPageBlur` global durante carga.

## Relacoes com o ecossistema

- **Consome de**: `acesso.TBmodel_pagina.DFvalor` (JSON model); `acesso.TBmodel_parametro` (dParamN interpolation); endpoint do model (proc tipo `agent.obter_calendario_*`); endpoint de legenda (`/select/<status>`).
- **E consumido por**: `GenericPage` (engine); `<Filtros>` (toolbar compartilhado).
- **Acoplamentos vazados**: `tempoDescarga` referenciado por nome no renderer "generico" — dominio de agendamento vazou para fora.
- **Procs vistas em producao**: `agent.obter_calendario_agendamentos`, `agent.obter_calendario_agendamentosV2` (variante usada no exemplo dev).

## Notas de implementacao para o Studio

- Schema de evento esperado pelo renderer e fixo: `{id, startAt, endAt, title, description, eventStatus, tempoDescarga}`. Procs novas precisam respeitar essa nomenclatura ou o renderer precisa ser parametrizado por map de props.
- A vista mensal **nao** mostra titulo/descricao de eventos individualmente — so contadores por status. Para visualizar detalhe e necessario mudar para `week`/`day`/`agenda`.
- Range carregado e a matriz 6x7 completa (pode pegar parte do mes anterior e seguinte). Cache no Studio deve considerar isso.
- Dead props `views`, `messages`, `eventProp`, `checkFilterToFocusCalendar`, `onClick`, `onDoubleClick` precisam de decisao explicita: implementar (closing the gap com a intencao do seed) ou aceitar e remover do model. Curator decide.
- `eventCounterProp` no model **e ignorado** — wrapper hardcoda `'eventStatus'`. Migracao precisa decidir se respeita o model ou herda o hardcode.
- Mutex global de `_requestInProgress` e por modulo (singleton). Migracao precisa explicitar se multi-calendario simultaneo e suportado.

## Sources

- [[calendar/notes/2026-05-16.md]]
