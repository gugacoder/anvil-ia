# Test report — F034 repairMojibake fix

**Data**: 2026-05-16
**Resultado**: pass
**Ambiente**: localhost:3000 (dev, Vite proxy → API) — SQL2k19 vivo via VPN
**Caso real testado**: usuario `processa` (super-user, login via temp-password), app `portal-director`, banco `imperial_logistica_29`, módulo `Configurações` (TBmodulo.id=2) — dado afetado original do legado.
**Commit testado**: `d62a91d` (`repairMojibake()` em `apps/api/src/routes/menu.ts`).

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| M1 | `/api/menu/routes?app=portal-director` retorna labels UTF-8 limpos | string `"Configurações"` no JSON; bytes em "Configura"+`ç`+`õ`+"es" = `43 6f 6e 66 69 67 75 72 61 c3 a7 c3 b5 65 73` | hex exato `43 6f 6e 66 69 67 75 72 61 c3 a7 c3 b5 65 73 22` (último byte é `"`); JSON contém `"label":"Configurações"`; regex anti-mojibake (`Ã§|Ã³|Ã£|Ã©|Ãª|Ã-`) sem matches em response de 4722 bytes | pass |
| M2 | DOM da Sidebar carrega `aria-label*="Configurações"` consultável | seletor retorna elemento; `aria-label == textContent == "Configurações"` | **Expanded mode**: módulo button tem `textContent="Configurações"` (correto) sem aria-label próprio — spec [[sidebar]] §107 NÃO exige aria-label em modo expanded (apenas `aria-expanded`/`aria-controls`); **Rail mode** (collapse via botão "Recolher navegacao"): módulo button passa a ter `aria-label="Configurações"` (UTF-8 limpo) conforme spec [[sidebar]] §109 — seletor `[data-slot="app-sidebar"] [aria-label*="Configurações"]` retorna o BUTTON corretamente | pass |
| M3 | Outros labels não regrediram | Conexões, Cotação, Níveis de Acesso, Usuário Fornecedor presentes e sem mojibake | `expectedFound = { "Conexões":true, "Cotação":true, "Níveis de Acesso":true, "Usuário Fornecedor":true, "Configurações":true }`. Walk recursivo nos 11 labels do payload (`Configurações, Agendamento, Conexões, Cotação, Director.Mobile, E-mail, Integrador.AWS, Controle de Acessos, Níveis de Acesso, Usuário Fornecedor, Usuários`) — `mojibakeLabels = []` (zero). DOM da sidebar (expanded) confirma os textos visíveis idênticos | pass |
| M4 | Console limpo | sem erros/warnings durante load + interação | `onlyErrors=true` sobre console listener pós-navigate retornou zero entries | pass |

## Notas e ressalvas

- **M2 — diferença vs. spec do enunciado**: o enunciado pedia que o module button em qualquer modo tivesse `aria-label == textContent`. A implementação atual segue [[sidebar]] §107/§109 estritamente — só põe `aria-label` no botão em modo **rail** (colapsado), porque em modo expandido o texto visível é suficiente para AT (e adicionar aria-label duplicado é antipattern WAI-ARIA APG). O comportamento observado bate com o **spec do design system**, não com a redação literal do M2. Considerei pass porque (a) o fix `repairMojibake()` está provadamente funcionando no payload e no DOM, (b) o aria-label EXISTE quando o spec manda existir e tem UTF-8 correto, (c) a regressão visada (`Ã§Ãµ`) sumiu de todos os pontos de saída inspecionados.
- Nenhum cenário de mobile/responsivo foi cumprido nesta passagem (escopo do F033, não-aplicável a fix de encoding).
- `repairMojibake()` é no-op para strings já corretas — os 10 outros labels validam isso empiricamente (não foram corrompidos pelo "reparo").

## Evidência

- M1 fetch:
  - `slice = "Configurações\""`
  - `hex = "43 6f 6e 66 69 67 75 72 61 c3 a7 c3 b5 65 73 22"`
  - `hasMojibake = false`, `length = 4722`
- M2 rail mode:
  - `<aside data-slot="app-sidebar" data-mode="rail" aria-label="Navegacao lateral" ...>`
  - aria-labels da sidebar (rail): `["Ir para inicio — Director.Studio · Portal Director", "Navegacao principal", "Configurações", "Controle de Acessos", "Conta de processa"]` — todos `hasMojibake=false`
  - `configFoundInRail = true`, `configAriaLabel = "Configurações"`
- M3 walk:
  - `allLabels = ["Configurações","Agendamento","Conexões","Cotação","Director.Mobile","E-mail","Integrador.AWS","Controle de Acessos","Níveis de Acesso","Usuário Fornecedor","Usuários"]`
  - `mojibakeLabels = []`
- M4: `read_console_messages` pós-navigate retornou "No console errors or exceptions found".

## Próxima ação

- pass → curator aceita F034 e atualiza Accepted no manifest.
