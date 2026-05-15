---
title: "Field Types — mapeamento ctype legado → componentes do design system"
aliases: [field-types, ctype-mapping, form-field-variants]
tags: [ui-system, mapping, form, field, legacy-mapping, director-studio]
sources:
  - "calendar/notes/2026-05-15.md"
created: 2026-05-15
updated: 2026-05-15
---

# Field Types — mapping de `ctype` para o design system

Tabela de equivalência entre os 18 `ctype`s aceitos pelo `<GenericForm>` legado (ver [[model-valor-genericform]] §"Tipos de campo") e os componentes correspondentes no design system do Studio. Serve para:

1. **smith** saber qual primitivo usar ao implementar [[generic-form]];
2. **curator** identificar sub-features ainda não enumeradas no manifest;
3. **designer** rastrear lacunas no catálogo.

Cada linha sinaliza: componente base, variante necessária, comportamento responsivo relevante, e se é sub-feature autônoma do manifest.

## Tabela de mapeamento

| `ctype` legado | Componente do design system | Variante / configuração | Feature do manifest | Status no catálogo |
|---|---|---|---|---|
| (ausente) ou `input` | [[form-field]] | `controlType=text` (default) | F010 (parte) | spec existente |
| `input` + `maskType=cpf-cnpj` | [[form-field]] | `controlType=text` + `mask=cpf-cnpj` | F010 (parte) | extensão de [[form-field]] (mask aplicada via lib externa, validar comprimento 11/14) |
| `input` + `maskType=cnpj` | [[form-field]] | `controlType=text` + `mask=cnpj` | F010 (parte) | extensão de [[form-field]] |
| `input` + `maskType=email` | [[form-field]] | `controlType=email` + validação de domínio `.com`/`.br` | F010 (parte) | extensão de [[form-field]] |
| `input` + `maskType=celular` | [[form-field]] | `controlType=tel` + `mask=celular` (formato BR) | F010 (parte) | extensão de [[form-field]] |
| `input` + `maskType=placaVeicular` | [[form-field]] | `controlType=text` + `mask=placa-br` (Mercosul-aware) | F010 (parte) | extensão de [[form-field]] |
| `input` + `maskType=inteiro` | [[form-field]] | `controlType=text` + `inputMode=numeric` + `mask=inteiro` (respeitar `acceptTypeDefault`) | F010 (parte) | extensão de [[form-field]] |
| `input` + `maskType=decimal` | [[form-field]] | `controlType=text` + `inputMode=decimal` + `mask=decimal` | F010 (parte) | extensão de [[form-field]] |
| `input` + `maskType=numerosTamanhoVariavel` | [[form-field]] | `controlType=text` + `inputMode=numeric` (sem casas decimais; sem limite fixo) | F010 (parte) | extensão de [[form-field]] |
| `numbers` | [[form-field]] | atalho para o anterior (numerosTamanhoVariavel + maskLength default 100) | F010 (parte) | extensão de [[form-field]] |
| `date` | `form-field-date` (variante) | input nativo `<input type=date>` mobile + custom picker desktop. Mín comportamento, máx WCAG. | F018 (DateTimePicker) | sub-feature autônoma — **delegar a F018** |
| `time` | `form-field-time` (variante) | input nativo `<input type=time>` mobile + picker desktop | F018 | sub-feature autônoma — **delegar a F018** |
| `date-time` | `form-field-datetime` | combina date + time; flags `useDefaultDate`, `dateAndTime` (toggle de hora) | F018 | sub-feature autônoma — **delegar a F018** |
| `dates` | `form-field-date-range` | range de datas; state expõe `<name>De` + `<name>Ate` | F018 | sub-feature autônoma — **delegar a F018** |
| `datetime-interval` | `form-field-datetime-range` | range de data+hora; flag `loop` para multi-instâncias | F018 | sub-feature autônoma — **delegar a F018** |
| `select` | `power-select` | typeahead + async loading via proc/api; lazy de opções; multi-select se schema pedir | F019 (PowerSelect3) | sub-feature autônoma — **delegar a F019** |
| `search-input` | `form-field-search` | [[form-field]] com `suffix=Phosphor:MagnifyingGlass` clicável que dispara `actions[]` ou `fillForm` (CRUD lookup) | F010 + F019 (parcial) | extensão leve de [[form-field]] |
| `checkbox` | `checkbox-control` (primitivo novo) | checkbox single ou agrupado; label à direita; suporte ao default boolean parsing legado | F010 | **primitivo novo** — spec mínima abaixo |
| `radio` | `radio-group-control` (primitivo novo) | grupo de radios; layout horizontal desktop, vertical mobile | F010 | **primitivo novo** — spec mínima abaixo |
| `bool` (NullableBool) | `tri-state-toggle` (primitivo novo) | três estados: null / true / false; visual de 3 segmentos | F010 | **primitivo novo** — spec mínima abaixo |
| `text-area` | [[form-field]] | `controlType=textarea` + `rows` configurável + opcional auto-resize | F010 (parte) | spec existente — já coberto |
| `icon-list` | `icon-picker` (primitivo novo) | selector de ícone Phosphor (substituindo CoreUI do legado) — modal com grid de ícones + busca | F010 ou nova feature | **primitivo novo** — spec mínima abaixo. Sinalizar curator. |
| `file` | `file-browser` | upload + preview; integração com endpoint de upload | F017 (FileBrowser) | sub-feature autônoma — **delegar a F017** |
| `append` | `append-list` (primitivo novo) | coleção de sub-formulários (lista de objetos com schema repetido); add/remove rows | F010 ou nova feature | **primitivo novo** — spec mínima abaixo. Sinalizar curator. |
| `append-input` | `append-input` (primitivo novo) | lista de strings; campo + botão `+`; tags removíveis | F010 ou nova feature | **primitivo novo** — spec mínima abaixo. Sinalizar curator. |
| `grid-button` | `grid-button` (primitivo novo, **complexo**) | abre modal com data-grid de seleção; multi-select; state guarda ids + rows completas; tem filtro interno | nova feature recomendada | **primitivo novo complexo** — spec mínima abaixo. **Sinalizar curator para feature dedicada.** |

## Sub-features sinalizadas ao curator

Componentes que justificam feature própria no manifest (não como detalhe interno de F010):

- **F0XX — `grid-button` (campo seletor com grid embutida)**: tem filtro, paginação, multi-select, state composto (`[name]`, `gridButtonData[name]`, `[name]Rows`). Acopla F010 + F011 + F016. **Recomendar feature dedicada.**
- **F0XX — `append-list` / `append-input` (coleções de campos)**: schema repetido N vezes, add/remove dinâmico, validação por item. Padrão de UX próprio. **Recomendar feature dedicada (pode ser uma única feature cobrindo ambos os tipos `append`).**
- **F0XX — `icon-picker` (selector de ícone Phosphor)**: catálogo de ~7000 ícones do Phosphor; busca + preview + categorização. UX não trivial. **Recomendar feature dedicada se for usado em mais de um lugar; senão, primitivo embutido.**

Já enfileiradas no manifest:

- **F017** — FileBrowser (ctype `file`).
- **F018** — DateTimePicker / DateInterval (ctypes `date`, `time`, `date-time`, `dates`, `datetime-interval`).
- **F019** — PowerSelect (ctypes `select`, parte de `search-input`).

## Specs mínimas dos primitivos novos

Estas são specs **mínimas** para destravar F010. Specs completas serão escritas conforme demanda real.

### checkbox-control

- Bloco: `[ checkbox ] [ label ]` em linha; checkbox à esquerda, label clicável.
- Tamanho: caixa 20×20px desktop, 24×24px mobile. Label `text-sm`.
- Estados: default (vazio), checked (ícone Phosphor `Check`), disabled (`opacity-50`), error (borda `border-x-error`).
- Motion: check entra com scale 0.7→1 + fade 100ms.
- A11y: `<input type=checkbox>` nativo + `<label for>`; `aria-required`, `aria-invalid` quando aplicável; espaço-bar toggla.
- Cores: borda `border-input`, checked `bg-primary` + `text-primary-foreground`.
- Boolean parsing legado: aceita `true`/`false`/`'true'`/`'false'`/`0`/`1` como valor inicial (matriz de equivalência conforme `checkBooleanValue`).

### radio-group-control

- Bloco: label do grupo (opcional) + lista de radios.
- Layout: vertical mobile, horizontal desktop quando ≤ 4 opções, vertical desktop quando > 4.
- Radio: círculo 18×18px (desktop) / 22×22px (mobile); selected = `bg-primary` no centro.
- Estados: default, selected, disabled, error.
- Motion: dot center scale 0.6→1 fade 100ms.
- A11y: grupo é `<fieldset>` + `<legend>`; cada radio é `<input type=radio>` real; teclado: setas movem entre options, espaço seleciona.
- Default = primeiro item de `values[]` (compatibilidade legado).

### tri-state-toggle

- 3 segmentos: `Sim` | `Não` | `—` (null). Visual de pill-segmented control.
- Estado selected = `bg-primary` + `text-primary-foreground`; outros = `text-muted-foreground` + `bg-muted/30`.
- Tamanho: altura `h-9` desktop / `h-10` mobile; cada segmento min `min-w-[64px]`.
- Default = null (mantém semântica legado `NullableBool`).
- A11y: `role="radiogroup"` com 3 `role="radio"`; setas movem; espaço seleciona; label do grupo obrigatório.
- Motion: indicador deslizante entre segmentos 200ms (`normal`), spring.

### icon-picker

- Trigger: campo [[form-field]] com prefix mostrando ícone atual (ou `Question` se vazio) + label do nome do ícone. Click abre [[modal-sheet]].
- Modal: busca textual no topo + grid de ícones (categorias colapsáveis). 6 cols mobile, 10 cols desktop.
- Selecionar: clique no ícone → fecha modal, atualiza valor (nome do ícone Phosphor, ex: `"ShoppingCart"`).
- Catálogo: usar `@phosphor-icons/react` (já é padrão do Studio).
- A11y: cada ícone é `<button>` com `aria-label={iconName}`; navegação setas + Enter.

### append-list

- Repetidor de schema: cada item do array `state[name]` renderiza uma "linha-card" com mini-formulário (schema do item).
- Header de cada card: número da linha + botão `Remover` (`trash` Phosphor) à direita.
- Footer da lista: botão `+ Adicionar` (variant `outline`).
- Validação: cada item valida independentemente; soma erros para mostrar no inline-alert do generic-form pai.
- Motion: novo item entra com fade-in + slide-down 200ms; remove inverte.
- Mobile: cards empilhados full-width; em desktop, pode ser 2-col se cada item for compacto.
- A11y: cada card é `<fieldset>` com `<legend>` `"Item N"`; remover tem `aria-label`.

### append-input

- Lista de strings simples (tags).
- Visual: pílulas (`bg-muted` rounded-full) com texto + `×` Phosphor; abaixo, [[form-field]] com botão `+` no suffix.
- Add: enter no input ou clique no `+` move o valor para a lista e limpa o input.
- Remove: clique no `×` da pílula.
- Mobile: pílulas com tap-target ≥ 32×32px no `×`.
- A11y: lista é `<ul>` com `<li>` por tag; botão de remover tem `aria-label="Remover {valor}"`.

### grid-button (sinalizado para feature própria)

- Trigger: botão [[button]] com label do tipo `"Selecionar {entidade} ({count} selecionados)"`.
- Click abre [[modal-sheet]] full-screen mobile / largo desktop com:
  - Filtro interno no topo (componente de F016).
  - Data-grid com checkbox por linha (componente de F011).
  - Footer com `Cancelar` / `Confirmar seleção`.
- State no form pai: `[name]` = ids; `gridButtonData[name]` = filtros; `[name]Rows` = linhas completas (para exibir/usar localmente).
- **Por que feature dedicada**: combina 3 componentes complexos (filtro + grid + multi-select sync). Spec full quando F0XX for criada.

## Sinais ao curator

- **F010 destravado para 13 dos 18 ctypes** (todos exceto os delegados a F017/F018/F019 e os 3 primitivos complexos `grid-button`/`append`/`icon-list`).
- **3 novas features recomendadas** a serem enumeradas: `grid-button`, `append-list/append-input` (par), `icon-picker`. Sugiro IDs sequenciais a partir do último do manifest.
- **F010 pode começar** usando os primitivos novos em spec mínima (checkbox/radio/tri-state) — quando o ctype `append` ou `grid-button` aparecer num model real, smith sinaliza e a feature dedicada entra em wave.
- **Mask handling** (cpf-cnpj/celular/etc.) é detalhe da [[form-field]] — não precisa de feature própria, mas precisa de skill/lib estabelecida (sugestão: `imask` ou equivalente).

## Sources

- [[calendar/notes/2026-05-15.md]] — UX de F010
- [[model-valor-genericform]] — contrato legado §"Tipos de campo (`ctype`)" e §"`maskType`"
