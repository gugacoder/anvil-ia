# Test report — F019 PowerSelect (FormFieldSelect + FormFieldMultiSelect)

**Data**: 2026-05-16
**Resultado**: **fail**
**Ambiente**: localhost:3000 (dev) — `/smoke/f019`
**Contrato**: [[power-select]] (PS1..PS23)
**Specs cobertos**: 5 cenários C1..C5 do smoke + a11y/keyboard/console/responsive

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| S1.a | C1 single — abrir popover (PS2) | Popover abre com `[role="listbox"]`, search input "Buscar..." | Popover abre, listbox `#ps-1-listbox`, input com `aria-label="Buscar opções"` | ✓ |
| S1.b | C1 — filtro substring "ri" (PS4) | 4 cidades (Curitiba, Florianópolis, Rio de Janeiro, Belo Horizonte) | Exatamente 4 cidades filtradas, case-insensitive substring | ✓ |
| S1.c | C1 — select Rio fecha popover (PS5/smoke) | trigger mostra label, popover fecha, payload=Option | Trigger mostra "Rio de Janeiro", payload=`{value:6,label:"Rio de Janeiro",uf:"RJ"}` mas **popover NÃO fecha automaticamente** | ✗ |
| S2.a | C2 multi async loading state (PS6) | "Buscando..." aparece após 250ms debounce + spinner | "Buscando..." aparece, mas **precedido por flash de "Nenhuma opção encontrada"** entre keystroke e fetch | ✗ |
| S2.b | C2 — fetch resolve + chips | 16 resultados "Tech", 2 chips após selecionar 2 | 16 opções renderizadas, 2 chips com cnpj preservado no payload | ✓ |
| S2.c | C2 — AbortSignal cancela in-flight | typing rápido aborta query anterior, resultado final reflete última query | Type "log"+"atac" em <250ms → estado final reflete "logatac" (sem resultados), sem stale "Logística"; consistente com cancel | ✓ |
| S3.a | C3 maxSelected=3 bloqueia 4ª seleção | 4ª opção disabled ou click bloqueado | Após 3 selecionados, opções restantes ganham `aria-disabled="true"`; click na 4ª não seleciona; mensagem "Limite de 3 opções selecionadas" aparece | ✓ |
| S3.b | C3 commitMode=confirm com footer | Botões "Confirmar" e "Cancelar" no footer do popover | **Nenhum botão Confirmar/Cancelar renderizado**; payload nunca commita (fica em `[]` mesmo após selecionar 3) — usuário fica preso sem caminho para confirmar | ✗ |
| S4.a | C4 fetch falha mostra InlineAlert | "Erro ao carregar opções" + botão "Tentar novamente" | Após 380ms, exibe "Erro ao carregar opções" + "Tentar novamente" | ✓ |
| S4.b | C4 retry refaz fetch | Segundo clique resolve ok | Click em "Tentar novamente" → "Buscando..." → resultado (sem erro segundo) | ✓ |
| S5 | C5 required + erro visual (PS17) | `aria-invalid=true`, `aria-required=true`, border vermelho, mensagem | combobox `aria-invalid="true"` + `aria-required="true"` + classe error + mensagem "Selecione um centro de custo" em vermelho. Mas **`aria-describedby` é null** — leitor de tela não associa erro ao campo | ⚠ (parcial) |
| S6.a | A11y keyboard navigation | Arrow down navega, Enter seleciona, Esc fecha | Arrow Down move `aria-activedescendant` (`ps-3-listbox-opt-2`); Enter seleciona (3 selecionados); Esc fecha (`aria-expanded=false`) | ✓ |
| S6.b | A11y roles e atributos | `role=combobox/listbox/option`, `aria-multiselectable=true` no multi | Listbox multi tem `aria-multiselectable="true"`; trigger tem `role=combobox`, `aria-haspopup="dialog"`, `aria-expanded` correto | ✓ |
| S6.c | Console limpo | Sem erros/warnings | **Hydration error**: button dentro de button (Chip remove-btn dentro do combobox trigger) — semantic/a11y issue real | ✗ |
| S6.d | Mobile bottom-sheet (375px) | Drawer Vaul ao invés de popover | Drawer com handle, título, search e lista exibido corretamente em viewport 375px | ✓ |
| S6.e | Responsive 768px/1280px | Layout coerente | Tablet (768px) single-column full-width; desktop (1280px) two-column | ✓ |

## Falhas (5)

### F019.S1c — Single select NÃO fecha popover após seleção
- **Esperado** (smoke C1, contrato PS5): "click → seleciona, trigger mostra label, **popover fecha**".
- **Observado**: Após click em "Rio de Janeiro", trigger atualiza para "Rio de Janeiro" e payload commita corretamente, mas o popover permanece aberto. Listbox `#ps-1-listbox` continua presente no DOM 500ms+ após o click. Só fecha quando usuário clica fora.
- **Reprodução**: Abrir C1, clicar em qualquer cidade → observar que listbox permanece aberto.

### F019.S2a — Flash de "Nenhuma opção encontrada" antes do loading state
- **Esperado** (smoke C2): após 250ms debounce, mostra "Buscando..." enquanto request roda.
- **Observado**: A sequência temporal capturada por polling DOM (intervalos de 20ms) mostra:
  1. `Digite ao menos 1 caractere para buscar` (estado inicial)
  2. `Nenhuma opção encontrada` (flash — listbox vazio enquanto debounce roda)
  3. `Buscando...` (loading)
  4. `16 resultados` + lista
- O step 2 é incorreto: enquanto o debounce está aguardando, o componente já mostra "no results" embora a busca ainda nem tenha sido feita. Deve mostrar "Buscando..." (ou nada) durante todo o intervalo entre keystroke e resolução.

### F019.S3b — commitMode=confirm sem footer de ação
- **Esperado** (smoke C3): "Botão Confirmar commita; Cancelar reverte".
- **Observado**: O popover de C3 renderiza apenas search + lista. **Não há botão "Confirmar" nem "Cancelar"** no DOM. Após selecionar 3 itens (limite atingido), o payload externo permanece `[]`. Clicar fora também não commita. Estado interno fica preso — não há caminho para o usuário aplicar a seleção.
- Comportamento atual quebra o contrato implícito de commitMode=confirm e torna C3 inutilizável.

### F019.S5 — required: aria-describedby ausente (a11y parcial)
- **Esperado** (ui-system a11y): mensagem de erro vinculada ao campo via `aria-describedby` para leitores de tela.
- **Observado**: combobox tem `aria-invalid="true"` e `aria-required="true"` ✓, mas `aria-describedby="null"` — a mensagem "Selecione um centro de custo" existe no DOM mas não é programaticamente associada ao campo.

### F019.S6c — Hydration error: button dentro de button
- **Esperado**: console limpo.
- **Observado**: React/HTML hydration error: `In HTML, <button> cannot be a descendant of <button>`. A causa raiz é o `Chip` (com seu botão "Remover X") sendo renderizado **dentro** do `<button role="combobox">` que é o trigger. HTML inválido, problema real de acessibilidade (botão aninhado quebra navegação por teclado e leitor de tela), e potencial bug de hidratação em SSR.

## Observações adicionais

- **Layering visual frágil**: popovers em estados de teste mostraram texto/conteúdo das seções subjacentes "vazando" através (sem backdrop/overlay opaco). Em alguns frames o popover ficou translúcido o suficiente para o conteúdo de baixo ser legível por trás dos itens. Pode ser específico do contexto dev/dark-mode. Designer revisar contraste/z-index.
- **Esc keyboard**: funcionou quando o foco estava no search input dentro do popover; não verifiquei se funciona quando o foco está só na trigger antes de abrir.
- **C4 dataset**: parece limitado — busca "for", "Fornec" retornou "Nenhuma opção encontrada". Não foi possível exercitar fluxo "retry → sucesso com resultados", apenas "retry → sucesso (vazio)". O caminho de retry em si funcionou (sem error reaparecendo).

## Evidência

- Screenshots inline em sequência de teste (S1 single, S2 multi, S3 confirm, S4 retry, S5 required, S6 mobile/tablet)
- Console: 1 hydration error capturado durante interação com C2 (chip remove inside combobox button)
- Polling DOM evidence:
  ```
  169268: Digite ao menos 1 caractere para buscar
  174264: Nenhuma opção encontrada   ← flash incorreto
  175275: Buscando...                ← loading começa só aqui
  176269: 16 resultados | Empresa 03 — Indústria | ...
  ```

## Próxima ação

- **fail** → smith retoma. Itens a corrigir (em ordem de gravidade):
  1. **S3b** (bloqueador): adicionar botões Confirmar/Cancelar quando `commitMode=confirm`, sem isso C3 é inoperante.
  2. **S6c** (a11y crítico): não aninhar `<button>` dentro de `<button>`. Trigger pode usar `<div role="button">` ou os chips devem renderizar fora do trigger.
  3. **S1c**: single-select deve fechar popover imediatamente após `onChange`.
  4. **S2a**: durante debounce, mostrar "Buscando..." (ou hidden), não "Nenhuma opção encontrada".
  5. **S5**: adicionar `aria-describedby` ligando combobox à mensagem de erro.
