# Test report — F010 Renderer DFtipo=form (GenericForm)

**Data**: 2026-05-15
**Resultado**: fail
**Ambiente**: localhost:3000 (dev), API localhost:3001, sessão PROCESSA / 99 (cod_empresa=1), DBdirector_imperial_logistica_29 (Area 52)
**Caso real testado**: model `wms.cadastros_grupo-de-trabalho` (única página com `genericform` real na base), via override `?model=wms.cadastros_grupo-de-trabalho` em `/app/cadastros/grupo-de-trabalho`. Submit real contra proc `sp_Persistir_GrupoTrabalho` (que retorna erro de junção quando dado descrição+status sem mapas/junções).

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| C1 | Plug-in no ModelEngine: nó `genericform` deixa de ser stub e vira renderer real | Stub "F010" some; aparece "Formulário (modal): Grupo de Trabalho" com badge `formOnModal=true` + botão "Novo" | Exato: cabeçalho mostra `Formulário (modal): Grupo de Trabalho`, hint sobre `crudForm=true`, botão "Novo" presente; outros nós (`datagrid`/`filtro`) seguem em placeholder F011/F016 conforme [[engine-schema-driven]] | pass |
| C2 | Campos renderizam por ctype | dfdescricao=input required; dfativo_inativo=select Ativo/Inativo required; mapas+juncao=grid-button placeholder F010+; usuarios=hideField | dialog vaul com `<input type=text name=dfdescricao aria-required=true>`; `<select aria-required=true>` com options `Selecione…/Ativo (value=1)/Inativo (value=0)`; áreas "Mapa (grid-button)" e "Junção (grid-button)" com aviso amarelo "ctype grid-button não implementado nesta onda — chega em F010+ (grid-button (sub-feature))"; campo `usuarios` ausente do DOM (hideField OK). 4 campos visíveis + 1 oculto = 5 alvos do legado, todos contabilizados | pass |
| C3 | Validação inline ao Salvar com required vazio | Submit gate em [[generic-form]] §Validação: `aria-invalid=true` em dfdescricao + select; inline-alert no topo "Verifique os campos destacados."; foco no primeiro inválido; **request NÃO enviado**; confirmation drawer NÃO aparece (gate antecede confirmação) | **Clicar "Salvar" com `dfdescricao=""` e `select=""` abre direto o "Confirmar operação"**. `aria-invalid` permanece `null` nos dois inputs. **Nenhum** `[role=alert]` aparece no dialog. **Nenhuma** mensagem "Campo obrigatório" inline. Verificado em duas tentativas (campos limpos no input/blur/change). O fluxo de submit pula o gate de validação local e vai direto pro confirmation drawer | **fail** |
| C4 | Submit feliz/erro humanizado | Preencher dfdescricao+status → Salvar → Confirmar → POST /api/forms-proxy → erro de negócio surface em InlineAlert vermelho | Confirmation drawer aparece (texto hard-coded "Tem certeza que deseja realizar a operação?"). Clicando Confirmar → POST `/api/forms-proxy` 200 com body `{"ok":true,"dados":[{"":"<Resposta><Status>400</Status><Sucesso>false</Sucesso><dados><Mensagem>Ocorreu um erro na sp_Persistir_GrupoTrabalho, Informe uma junção válida Erro na linha: 98</Mensagem></dados></Resposta>"}]}`. InlineAlert dentro do dialog com classes `bg-x-error/10 border-l-x-error` (variant=error/red), título "Não foi possível salvar" e corpo com o texto da `<Mensagem>` parseada. `role=alert` presente. Parse do `<Resposta>/<Mensagem>` embutido funcionando (`extractLegacyProcError` cumprindo papel) | pass |
| C5 | LinkedFields (setValue/enable/disable/show/hide/setRequired/setNotRequired) | Exercitar pelo menos uma cadeia reativa | O model `wms.cadastros_grupo-de-trabalho` é o único acessível por override nessa base e **nenhum** dos 4 campos visíveis declara `linkedFields` exercitável: dfdescricao (input livre), select (sem cascata), grid-button placeholders (sem render). `usuarios` hideField estático (não-reativo). Sem campo testável de cascade. F043 ainda pendente → sem outro model com linkedFields à mão | n/a |
| C6 | F009 sem regressão | Outras chaves do model continuam stub | `datagrid` e `filtro` aparecem com placeholder "Esta chave foi detectada no model mas seu renderer ainda não está implementado. A engine F009 empilha..." + badges F011/F016. Banner com avisos do contrato legado (F042 tenancy) preservado. Chaves desconhecidas `functionKey`/`genericPageDescription` listadas em região separada | pass |
| C7 | F007/F008 intactos | Sidebar+header+ACL continuam | Navegando para `/app`: sidebar com itens (Agendamento, conexões, Cotação, director-mobile, e-mail, integrador, ACL, fornecedores, usuários), header com busca + notificações + Conta PROCESSA, main com botões "Aprovar pedido"/"Exportar relatório" (home cards) | pass |
| C8 | Console limpo | Warnings de ctypes deferidos e actions no-op OK | Console **sem erros**. Warnings encontrados: 2× `Warning: Missing 'Description' or 'aria-describedby={undefined}' for {DialogContent}` (Radix Dialog a11y, vindo do confirmation drawer vaul) — não é warning de ctype deferido nem de action no-op, é a11y descoberta nova. Bloco até onde a graduação do critério aceita | **fail** (parcial) |

## Falhas

- **F010.C3 — submit gate ausente**. Esperado por [[generic-form]] §Validação > Submit gate (linhas 121–128 do spec): "Se algum inválido: aplica aria-invalid=true, mostra inline-alert no topo, foca primeiro inválido com scroll smooth, **Não envia o request**". Esperado também por [[model-valor-genericform]] §Submit (linhas 226–238): "`openConfirmationModal` gated por validação de obrigatórios". Observado: clicar Salvar com `dfdescricao=""` e `select=""` (ambos `aria-required=true`) abre imediatamente o "Confirmar operação". Nenhum `aria-invalid` aplicado, nenhum InlineAlert no topo, nenhuma mensagem "Campo obrigatório" abaixo dos campos, request não bloqueado pelo gate (e seria enviado caso o usuário clicasse Confirmar). O gate de validação local foi pulado — o flow vai direto para confirmation → POST. O smith afirmou no progress-message que "validation gate ativa aria-invalid", mas empiricamente isso não ocorre.

- **F010.C8 — warnings a11y do Radix DialogContent**. Dois warnings repetidos no console quando o dialog do form ou o confirmation drawer abrem: `Missing 'Description' or 'aria-describedby={undefined}' for {DialogContent}`. Não bloqueante por si só, mas o critério 8 cita só "warnings de ctypes deferidos e actions no-op" como aceitáveis — esses dois são a11y do contêiner, fora dessa lista. Esperado por [[generic-form]] §Acessibilidade: form raiz com `aria-labelledby` apontando para título e descrição associada (`aria-describedby` recomendado pelo Radix quando há descrição auxiliar). Fix: adicionar `<DialogDescription>` (visible ou sr-only) no contêiner.

## Evidência

- Network capture do submit (instrumentado via `window.fetch` wrapper):
  - `POST /api/forms-proxy` → 200 OK
  - body: `{"ok":true,"dados":[{"":"<Resposta><Status>400</Status><Sucesso>false</Sucesso><dados><Mensagem>Ocorreu um erro na sp_Persistir_GrupoTrabalho, Informe uma junção válida Erro na linha: 98</Mensagem></dados></Resposta>"}]}`
- DOM snapshot do dialog após Salvar vazio:
  - `<input name=dfdescricao type=text aria-required=true>` — `aria-invalid=null`, `value=""`
  - `<select>` (Status) — `aria-required=true`, `aria-invalid=null`, `value=""`
  - Confirmation drawer aberto em paralelo: `[role=dialog]` com heading "Confirmar operação", body "Tem certeza que deseja realizar a operação?"
- InlineAlert pós-erro:
  - `<div role=alert class="... bg-x-error/10 border-l-x-error ...">Não foi possível salvar | Ocorreu um erro na sp_Persistir_GrupoTrabalho, Informe uma junção válida Erro na linha: 98</div>`
- Viewport mobile (resize_window 480×800): viewport reportado pelo navegador permanece 1536x730 — limitação MCP já mapeada em F033; modal/drawer responsivo não exercitável aqui.

## Notas auxiliares (não bloqueiam, mas valem registro pro curator/smith)

- **Confirmation drawer continua aberto após retorno do erro server**. O dialog "Confirmar operação" não fecha automaticamente quando o submit falha — fica empilhado atrás do dialog do form. Esperado por UX: fechar o confirm tão logo o submit retorne (sucesso ou erro), deixando só o form com o alert. Não há critério explícito sobre isso em [[generic-form]], mas é higiene de fluxo.
- **State persiste entre aberturas do "Novo"**. Após cancelar o form, reabrir via "Novo" mostra os valores anteriores (`dfdescricao="F010 UI-tester ..."`, `status=1`). Pelo legado `cleanForm` é disparado em fechar/abrir; pelo spec não há regra explícita mas o sentido é começar limpo em modo create.
- **Drawer vaul em desktop**: o form abre como bottom-drawer (`data-vaul-drawer-direction=bottom`, classes `mt-24 max-h-[90vh] rounded-t-2xl`) em viewport 1536px. Spec [[generic-form]] §Responsivo diz mobile vira bottom-sheet, desktop dialog centrado. Aqui veio bottom-drawer em desktop. Decisão de [[modal-sheet]] (F021), não de F010, mas vale verificação cruzada.

## Próxima ação

- fail → smith retoma: implementar gate de validação local em GenericFormRenderer ANTES do confirmation drawer. Quando algum campo `required` visível estiver vazio (ou maskType inválido), aplicar `aria-invalid=true`, renderizar InlineAlert "Verifique os campos destacados." no topo do form, focar primeiro inválido, **não** abrir confirmation drawer. Critério 3 será re-testado.
- Adicionar `<DialogDescription>` (visível ou sr-only) nos DialogContent do form e do confirmation drawer para silenciar warnings a11y do Radix.
