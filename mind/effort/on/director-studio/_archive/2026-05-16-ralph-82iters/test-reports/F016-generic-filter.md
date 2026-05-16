---
title: "Test report — F016 GenericFilterRenderer"
feature: F016
date: 2026-05-16
result: pass-with-deferrals
environment: localhost:3000 (dev)
route: /smoke/f016
tags: [test-report, director-studio, f016, generic-filter]
---

# Test report — F016 GenericFilterRenderer

**Data**: 2026-05-16
**Resultado**: **pass** (com 2 cenários deferred + 1 observação não-bloqueante)
**Ambiente**: `http://localhost:3000/smoke/f016` (Vite dev — vite-monorepo, console limpo)
**Casos reais**: schemas declarativos do `/smoke/f016` (3 cenários + 1 ModelEngine), exercitando os tipos de controle catalogados em [[ui-system/generic-filter]] §"Tipos de controle".

## Casos cobertos

| # | Cenário | Esperado (contrato/spec) | Observado | Resultado |
|---|---|---|---|---|
| F1 | Cenário 1 — filtro básico (text+select+datetime-interval+radio+bool+checkbox+dates) | Submit dispara payload `_filter`; required vazio bloqueia + `border-x-error` + inline-alert + msg "Campo obrigatório." (spec §Validação, §Required visual) | Submit sem empresa: `aria-invalid="true"`, classe `border-x-error`, mensagem inline "Campo obrigatório.", inline-alert topo "Verifique os campos destacados / Preencha os campos obrigatórios antes de pesquisar". Após preencher: payload coerente `{ periodo, periodoDe, periodoAte, tipo, ativo:null, urgente:false, data, empresa }`. `tri-state-bool` retorna `null` quando intacto (FL3 OK); checkbox retorna `false`. | ✓ |
| F2 | Cenário 2 — cascading País → Estado → Cidade (`linkedFilters`) | Antes da escolha: dependente disabled + placeholder "Selecione o filtro anterior primeiro" (spec §Cascading selects "antes da escolha"). Durante fetch: loading visível com `CircleNotch`. Pós-fetch: habilita; ao trocar pai, dependente carrega de novo. | Estado e Cidade iniciam `disabled=true` + placeholder esperado. Após `País=BR`: Estado entra em `disabled=true` + opção 0 = `"Carregando opções..."` + 1 spinner SVG; após ~1-2s habilita com opções [`Paraná`, `São Paulo`, `Rio de Janeiro`]. Cidade segue disabled. Após `Estado=PR`: Cidade entra em `"Carregando opções..."` e habilita com [`Curitiba`, `Londrina`]. | ✓ |
| F3 | Cenário 3 — clear (mode=`full`) | "Limpar" zera **todos** os campos, inclusive datas (Studio diverge do legado FL8; spec §Clear behavior). `onClear` dispara após reset. | Preenchi `nome=alpha`, `dataDe=2026-01-01`, `dataAte=2026-01-05`. Click "Limpar": todos os 3 inputs voltam a `""`. Contador "onClear disparado N vez(es)" incrementa em +1. | ✓ |
| F4 | Collapse preserva estado (FL11 fix) | Colapsar e expandir não reseta valores (spec §Estados "collapsed"). | Setei `nome=manter-valor` no painel 3, alternei `aria-expanded` `true→false→true` via header (Space key também funciona). Pós-reexpand: input mantém `"manter-valor"`. | ✓ |
| F5 | Botão Pesquisar com id estável (FL12) | `#btn-filtro-pesquisar-<id>` único por instância para E2E targeting. | `#btn-filtro-pesquisar-default` **existe** mas está **duplicado em 4 elementos** (um por painel). `document.querySelectorAll('#btn-filtro-pesquisar-default').length === 4`. Viola unicidade DOM esperada para selector estável. | ✗ (não-bloqueante para wave atual; ver §"Observações" e §"Próxima ação") |
| F6 | externalActionConfigs (FL13) | Botão extra no footer dispara `onClick(filter)`. | Smoke não declara `externalAction` em nenhum cenário — `forms[].buttons` = `[Limpar, Pesquisar]` puros (e `[Sim/Não/—, Limpar, Pesquisar]` quando há tri-state, sem extras). Cobertura conceitual ausente nesta rota. | — deferred |
| F7 | Mobile bottom-sheet Vaul (FL2/FL14) | <768px: trigger abre Vaul Drawer; footer fixo bottom com Limpar/Pesquisar; focus trap. | `resize_window(420×800)` não reduz `window.innerWidth` efetivo (Chrome reporta `1122x666` com `devicePixelRatio=1.25`). MCP não tem device mode; não consegui forçar viewport real <768px. Cenário não exercitado nesta rota — `/smoke/f016` em desktop renderiza inline em todos os painéis, sem trigger de drawer no DOM. | — deferred → **sugiro cobrir em F033** (mobile-first audit) |
| F8 | Console limpo + a11y | Sem erros React; `role="search"`, `aria-required`, `aria-invalid`, `aria-live`. | Console pós-refresh: 4 mensagens DEBUG do Vite (`[vite] connecting/connected`), zero error/warning React. 4 forms com `role="search"` + `aria-label="Filtros"`. 1 `aria-required="true"` (empresa); `aria-invalid` aparece sob demanda em erro de validação. 1 `aria-live="polite"` no container. Header colapsável: `role="button"` + `tabindex="0"` + `aria-expanded`. | ✓ |

## Falhas / observações

### F5 — `#btn-filtro-pesquisar-default` duplicado (id colidindo entre instâncias)

- **Esperado por FL12** ([[filtros-componente]] §FL12, smoke prompt): id estável **único** por instância de filtro, targetável por E2E (`document.querySelector('#btn-filtro-pesquisar-XYZ')` deve retornar 1 nó).
- **Observado**: na rota `/smoke/f016`, todos os 4 painéis emitem o mesmo `id="btn-filtro-pesquisar-default"` — `querySelectorAll` retorna 4 nós com o mesmo id (DOM inválido por spec HTML; selectors E2E ficariam ambíguos).
- **Hipótese**: prop de identidade (`scope`/`instanceId`/`name`) não está sendo passada pela rota smoke, e o componente cai num default literal `"default"` em vez de gerar um sufixo único (uuid/uid).
- **Severidade**: não-bloqueante para a wave (a feature **suporta** id estável; o smoke não fornece scope diferente por painel). Mas FL12 implica que **o componente deveria gerar fallback único** quando scope não é informado — não duplicar `"default"`.
- **Próxima ação smith** (se aceito como bug): em `generic-filter-renderer.tsx`, garantir que sem `scope` explícito o id derive de `React.useId()` ou similar; alternativamente exigir `scope` obrigatório quando E2E targeting é prometido.

### F4 — observação não-bloqueante: click nativo no header não toggla

- O header (`<header role="button" tabindex="0" aria-expanded>`) **não responde a click sintético** via `MouseEvent('click')` puro nem a `computer.left_click` do MCP em algumas coordenadas. Toggou apenas com sequência `mousedown → mouseup → click` simulada via JS e via **Space/Enter** com foco.
- A11y por teclado funciona (Space toggla). UX por mouse em browsers reais deve funcionar (handler provavelmente é onClick padrão; suspeita de event-handler em onPointerDown ou similar, ou seletor de click capturado por filho não-target). **Não consegui reproduzir falha em uso real**, então registro apenas para o smith conferir se há regressão silenciosa.

### F6 / F7 — cobertura não-atingida nesta sessão

- **F6 (externalAction)**: o `/smoke/f016` não declara `externalActionConfigs` em nenhum dos 4 painéis. Sugiro o designer/smith adicionar um 4º cenário no smoke (ou estender o painel ModelEngine) com `externalAction={{label:'Exportar', onClick}}` para validação.
- **F7 (Vaul mobile)**: MCP Chrome não simula viewport <768px sem device emulation real. Deferred para **F033** ([[ui-system/generic-filter]] §Anatomia mobile e [[mobile-first-page]]/[[vaul]] skills) — recomendo cobrir em audit dedicado de mobile com Playwright em emulador.

## Evidência

- **Payload F1 (cenário 1)**:
  ```
  {
    "periodo": "2026-05-15 00:00,2026-05-17 23:59",
    "periodoDe": "2026-05-15 00:00",
    "periodoAte": "2026-05-17 23:59",
    "tipo": "in",
    "ativo": null,
    "urgente": false,
    "data": "2026-05-15,2026-05-17",
    "empresa": "1"
  }
  ```
- **Required visual**: classe `border-x-error focus-visible:ring-x-error/40 focus-visible:border-x-error` + mensagem `"Campo obrigatório."` (`mt-1 text-xs text-x-error`) + inline-alert topo `role="alert"` (presumido via spec §Validação).
- **Cascata loading**: estado pós-`País=BR`: `select[1].disabled=true`, primeira option = `"Carregando opções..."`, `<svg class="animate-spin">` presente.
- **Console**: 4 msgs DEBUG do Vite, 0 React errors/warnings.

## Próxima ação

- **Curator pode aceitar F016** com as duas ressalvas registradas (F5 id-collision, F7 mobile deferred):
  1. Abrir mini-tarefa no smith para corrigir id-collision de `btn-filtro-pesquisar-default` (`useId` fallback ou exigir `scope`).
  2. Criar cobertura mobile em F033 (audit mobile-first) cobrindo Vaul drawer + footer sticky + focus trap.
  3. (Opcional) Adicionar cenário de `externalAction` em `/smoke/f016` antes de mergear `generic-action-form` consumidor.

- Resultado canônico: **pass** (cenários funcionais OK, divergências conscientes do legado respeitadas, a11y mínima atingida).

## Sources

- [[ui-system/generic-filter]] — spec do design system (consulted)
- [[filtros-componente]] — contrato legado FL1..FL15 (referenced via spec)
- `/smoke/f016` — fixture exercitada
