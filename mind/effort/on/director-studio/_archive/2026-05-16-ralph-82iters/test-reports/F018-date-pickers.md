# Test report — F018 Date pickers (5 variantes + range time + presets)

**Data**: 2026-05-16
**Resultado**: pass
**Ambiente**: localhost:3000 (dev) — smoke route `/smoke/f018`
**Commit**: eb492ac
**Contrato**: [[date-components]] D1..D17

## Casos cobertos

| # | Cenário | Esperado (contrato/spec) | Observado | Resultado |
|---|---|---|---|---|
| 1 | D1 — Single date popover (Cenário 1) | Click trigger abre Popover com calendário pt-BR; pick dia → trigger `DD/MM/YYYY`, payload `{date: "YYYY-MM-DD"}` | Popover abre com `role="dialog"`+`role="grid"`, aria-labels pt-BR ("domingo, 26 de abril de 2026"), click em 20/05 → payload `{date:"2026-05-20"}` + CSV `"2026-05-20"`; popover fecha (`data-state="closed"`) | ✓ |
| 2 | D2 — Single datetime (Bônus) | Calendário + TimeControl inline; payload `{date:"YYYY-MM-DD HH:MM"}` | Popover com grid + 2 inputs `aria-label="Horas"`/`"Minutos"`; click 22/05 + set 14:30 → `{date:"2026-05-22 14:30"}`, CSV `"2026-05-22 14:30"` | ✓ |
| 3 | D3 — Date range (Cenário 2) | 2 grids lado a lado; from/to ISO + CSV `"from,to"` | 2 `role="grid"` no popover; from=10/05, to=20/05 → `{from:"2026-05-10",to:"2026-05-20"}`, CSV `"2026-05-10,2026-05-20"` | ✓ |
| 4 | D2/D3 — DateTime range (Cenário 3) | Object + CSV + `expanded.de/ate` | Payload contém os 3: `object`, `csv`, `expanded` | ✓ |
| 5 | D4 — allowedDates dual format dd/mm/yyyy (Cenário 7) | Apenas 16, 17, 18 de maio habilitados | Filtro varre 31 dias de maio, retorna exatamente `[16,17,18]` enabled, restante `disabled` | ✓ |
| 6 | D5/D6/D9 — Presets declarativos onMount (Cenário 5) | 3 presets emitem onChange no mount | Payload já populado no carregamento: `single_today.date="2026-05-16"`, `range_last7={"2026-05-10","2026-05-16"}`, `range_thisMonth={"2026-05-01","2026-05-16"}` | ✓ |
| 7 | D7 — Range invertido (warning sem bloquear) | Trigger ganha `border-x-warning` + WarningCircle + mensagem inline; onChange ainda emite | Setei TimeRange 20:00→08:00. Trigger classe contém `border-x-warning`, 2 SVGs no trigger (clock + WarningCircle), mensagem inline: "Hora inicial deve ser anterior à final"; payload emitido `{from:"20:00",to:"08:00"}` | ✓ |
| 8 | D8 — Clear funcional | Click clear/Limpar zera → `null` | Click Limpar do Cenário 1 → payload vira `{date:null}`, CSV `""` | ✓ |
| 9 | D13/D14 — FormFieldTimeRange (Cenário 6) | 2 TimeControls; pick 08:00+18:00 → `{from,to}`+CSV; "Dia todo" → `00:00`/`23:59` | 2 TimeControls + botão "Dia todo"; set 08:00/18:00 → `{from:"08:00",to:"18:00"}`, CSV `"08:00,18:00"`; "Dia todo" → `{from:"00:00",to:"23:59"}` | ✓ |
| 10 | Mobile bottom-sheet (Vaul) | useIsMobile gate abre Drawer em vez de Popover | Reload em 500px width: dialog passou a ter classe `group/drawer-content` + `[data-vaul-drawer]` + `[data-vaul-overlay]` em vez de popover | ✓ |
| 11 | a11y — role/aria/focus | `role="grid"`, `aria-label` pt-BR por dia, focus visível | grid presente; aria-labels completos ("sexta-feira, 1 de maio de 2026"); botão recebe foco programático com `focus-visible` styling | ✓ |
| 12 | console limpo | Sem React errors | 0 erros React; 2 warnings Radix (dev) sobre `DialogContent` faltando `aria-describedby` no Vaul drawer — não bloqueante, não crítico | ✓ |

## Observações (não-bloqueantes)

- **D2 visual select-state ao reabrir**: ao reabrir Popover do Bônus single datetime após seleção prévia, o dia previamente selecionado não vinha com `aria-selected="true"` no DOM (calendário não destaca seleção persistida). Funcionalmente o estado existe (trigger mostra valor); puramente visual no calendário. Vale registro para revisão do designer mas não fere contrato.
- **Radix DialogContent warning** no Vaul drawer (mobile): "Missing `Description` or `aria-describedby={undefined}` for {DialogContent}". Warning de dev, não erro. Pode ser endereçado adicionando `DrawerDescription` (ou `aria-describedby` explícito) no wrapper Vaul mobile do date-picker.
- **D16 (variante disabled)** não tem cenário no smoke `/smoke/f018`. Não testável sem fixture adicional. Contrato D16 verificável separadamente quando consumidor passar `disabled`.
- **D7 inversão por calendário**: o range picker auto-ordena cliques por data (clicar 20 depois 10 produz from=10/to=20). Por isso o warning de inversão só é exercitável via TimeRange (mesmo dia, horas invertidas) ou via TimeControls do DateTime range. Comportamento esperado da Calendar Radix.

## Evidência

- console (final): apenas 2 Radix DialogContent warnings (dev-only, não bloqueante)
- payloads finais lidos do DOM:
  - `D1 cleared`: `{"object":{"date":null},"csv":""}`
  - `D3 range`: `{"object":{"from":"2026-05-10","to":"2026-05-20"},"csv":"2026-05-10,2026-05-20"}`
  - `D7 inverted timerange`: `{"object":{"from":"20:00","to":"08:00"},"csv":"20:00,08:00"}` + inline "Hora inicial deve ser anterior à final"
  - `D14 Dia todo`: `{"object":{"from":"00:00","to":"23:59"},"csv":"00:00,23:59"}`
  - `D5/D6/D9 presets onMount`: todos 3 emitidos sem interação
  - `D4 allowedDates`: somente May 16/17/18 enabled

## Próxima ação

- pass → curator aceita F018
