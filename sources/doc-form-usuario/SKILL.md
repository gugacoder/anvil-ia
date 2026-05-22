---
name: doc-form-usuario
description: Documenta um formulario VB6 (.frm) para usuario leigo, gerando documentacao completa no vault Obsidian
---

Documente o formulario `$ARGUMENTS` para usuario final, seguindo o padrao abaixo.

## Passos:

1. Leia o arquivo .frm completo em `E:\Projetos\Director\Fontes\Formularios\$ARGUMENTS.frm` (encoding Windows-1252, usar Read tool).
   - **OBRIGATORIO**: se o arquivo passar de 256KB, leia em blocos sucessivos com `offset`/`limit` (recomendado 500 linhas por bloco) ate cobrir 100% do designer do formulario (linha 1 ate a linha que contem `Attribute VB_Name`). Nao pule trechos. Nenhum controle ou aba pode ficar de fora porque o arquivo e grande.
2. Localize **TODOS os modulos VBP que abrem este formulario** e mapeie o caminho de menu de cada um:
   - Use Grep em `E:\Projetos\Director\Fontes\Especificos\*\frmPrincipal.frm` e em `E:\Projetos\Director\Fontes\*.vbp` procurando pelo nome do formulario.
   - Para cada `frmPrincipal.frm` encontrado, localize a chamada `clsSeguranca.Show <formulario>` (geralmente dentro de um `Case <indice>`) e identifique o caminho do menu, encadeando os Captions de `mnu*`/`smn*` ate chegar no item com aquele Index.
   - Tambem registre se o formulario e aberto via barra de ferramentas (`Button.Key` / `ButtonMenu.Key`).
3. Analise o codigo extraindo:
   - Caption do formulario (titulo da janela)
   - Abas (TabCaption do SSTab)
   - Controles de dados (TextBox, ComboBox, CheckBox, OptionButton, DTPicker, GridEX, MaskEdBox, controles piDirector — `ctlTextNumerico`, `ctlTextAlfaNumerico`, `ctlData_Combo`, `ctlData_Painel`, `ctlEntidade` etc.) com seus Labels associados (Caption do Label mais proximo acima ou a esquerda) e Captions de Frames que agrupam controles
   - Botoes de acao (cmd*) com seus Captions e ToolTipText (quando o Caption esta vazio, use o ToolTipText)
   - Para cada GridEX: identifique APENAS as colunas **visiveis ao usuario** na grade. Para isso:
     - Liste as colunas reais a partir do SELECT/INTO/INSERT que alimenta a grade (ex.: a tabela temporaria criada em `Inicializar_Grid_*`).
     - Cruze com as configuracoes da grade no codigo VBA: `<grade>.Columns("DF...").Visible = False`, `<grade>.Columns("DF...").Hidden = True`, `<grade>.RetrieveStructure` etc. **Excluir** qualquer coluna marcada como invisivel/oculta, colunas de chave (`DFid_*`, `DFcod_cliente` quando usado so como FK interna) e colunas tecnicas que o usuario nao ve.
     - **PROIBIDO** listar coluna que nao aparece literalmente no SELECT/tabela temporaria que alimenta a grade. Nao inventar, nao supor, nao adicionar colunas "comuns" como Data/Usuario/Status se elas nao existem no codigo.
     - Se em duvida se uma coluna e visivel, **omita** — e melhor documentar de menos do que documentar errado.
     - **Caption real vs nome tecnico**: use o **Caption exibido na tela** (o que aparece como header da coluna na grade), nao o nome interno do campo. Se voce conhece o nome `DFmargem_lucro` mas nao tem certeza do caption real (porque ele esta no .frx binario), prefira o nome generico ("Margem desejada", "Lucro (%)") ou consulte a tela. Nunca escreva o nome tecnico `DF*` ou o use disfarcado como rotulo.
   - Legenda de cores/icones (se houver frame fraLegenda)
   - Logica dos botoes de comando como cmdconfirmar, cmdAlterar etc. (validacoes, regras de gravacao)
   - Mensagens MsgBox (alertas, erros, perguntas)
   - Calculos em geral, formulas, regras de negocio
   - Opcoes do sistema referenciadas (`Opcoes.Pegar_Valor`)
   - Stored procedures chamadas
4. **Mapeamento aba ↔ controle (CRITICO)**: para cada controle/frame/grade identificado no passo 3, antes de coloca-lo em uma aba na documentacao, encontre a entrada `Tab(N).Control(M) = "<nome_do_controle>"` no inicio do designer do SSTab. Aquele `N` (zero-indexed) e a aba REAL do controle. Nao deduza pela ordem de declaracao no .frm nem pela proximidade visual no codigo — controles aparecem fora de ordem dentro do designer.
   - Conferencia obrigatoria: ao final do passo 3, monte uma tabela mental Tab(0)..Tab(N) com o conjunto de controles declarado, e use SOMENTE essa tabela como fonte da verdade para descrever cada aba na documentacao.
   - Frames com Index (ex.: `frame2(4)`, `frame2(6)`, `fraGuia3(2)`) devem ser tratados como controles unicos — cuidado para nao confundir `frame2(4)` com `frame2(6)` quando os captions sao parecidos.
5. **Controles e abas condicionais (Visible/TabVisible/diretivas de compilacao)**: muitos controles, abas, colunas de grade e botoes so aparecem quando uma configuracao do sistema, opcao da empresa ou modulo esta ativo. **Identifique e DOCUMENTE essas condicoes** ao usuario (em linguagem de negocio, sem citar numero da opcao):
   - Busque por `.Visible = <expressao>`, `sstGuias.TabVisible(N) = ...`, `.Caption = "X" ... Else .Caption = "Y"` (caption dinamico de botoes), `#If booModulo Then` e similares.
   - Quando o controle/aba/coluna/caption depende de `Opcoes.Pegar_Valor(NNN)`, `OPT.<flag>`, `clsUsuario.<...>` ou diretiva `#If`: anote a condicao em linguagem de negocio (ex.: "so aparece quando o modulo de Auto-Pecas esta habilitado", "so aparece quando a empresa usa Tabela Regional", "muda para 'Origem' quando o modulo de Auto-Pecas esta desabilitado").
   - O usuario que esta lendo a doc PRECISA saber por que ele nao esta vendo um campo/botao/aba que a doc descreve. Sem essa nota, ele acha que a doc esta errada.
6. **Cobertura obrigatoria**: o documento deve mencionar TODOS os controles encontrados no passo 3 — se um Caption de Label, Frame, CheckBox, OptionButton, ComboBox, TextBox, ctlTextNumerico, ctlTextAlfaNumerico, ctlData_Combo, ctlData_Painel, ctlEntidade, MaskEdBox, DTPicker ou GridEX existe no .frm, ele tem que aparecer no documento (em linguagem de negocio, agrupado pela aba/area onde esta, segundo o mapeamento do passo 4). Antes de escrever, faca um inventario rapido para conferir que nada foi omitido.
7. Escreva o documento em `E:\IA\knowledge_director\Usuario\Telas\$ARGUMENTS.md`.

## Padrao do documento:

```markdown
# [Caption do formulario]

## O que e esta tela?

[Explicar em 2-3 frases simples O QUE esta tela faz, QUAL problema ela resolve, em linguagem que qualquer pessoa entenda. Nao usar termos tecnicos.]

## Quando usar?

[Lista de 2-4 situacoes praticas do dia a dia em que o usuario precisaria abrir esta tela.]

## Como chegar nesta tela?

[Caminho pelo menu do sistema ou como a tela e aberta (automaticamente apos outro processo, pelo menu, etc). Verifique todos modulos vbp que utilizam esse form e mostre o caminho]

---

## Estrutura da tela

[Descrever a organizacao visual: abas, areas, grades. Para cada aba, explicar o proposito.]

### Aba N: [Nome da aba]

[Se a aba tiver uma grade/tabela, listar as colunas com explicacao do que cada uma significa:]

| Coluna | O que significa |
|---|---|
| **[Nome]** | [Explicacao simples] |

[Se houver checkboxes, radio buttons ou campos especiais, explicar cada um.]

[Se houver legenda de cores/icones, explicar cada cor/icone.]

### Area inferior / Totais / Filtros

[Se houver area com totais, filtros ou campos extras, explicar cada campo.]

---

## Passo a passo

### Cenario 1: [Operacao mais comum]

1. [Passo detalhado]
2. [Passo detalhado]
...

### Cenario 2: [Outra operacao comum]

1. [Passo detalhado]
...

### Cenario 3: [Operacao alternativa, se houver]

---

## Regras importantes

[Para cada regra extraida dos botoes cmd* e das MsgBox, explicar em linguagem simples:]

- **[Titulo da regra]:** [Explicacao do que acontece e por que.]

---

## Como o sistema calcula [se houver calculos]

[Explicar a logica de calculo em passos numerados com (+) e (-), sem formulas tecnicas.]

---

## Tipos / Classificacoes [se houver enums ou tipos]

| Tipo | Descricao |
|---|---|
| **[Codigo]** | [Explicacao] |

---

## Botoes

| Botao | O que faz |
|---|---|
| **[Caption]** | [Explicacao simples da acao] |

---

## Perguntas frequentes

[5-7 perguntas que um usuario leigo faria, com respostas praticas.]

**[Pergunta]?**
[Resposta direta e pratica.]

---

## Telas relacionadas

- [[Entidade XXX]] — [Relacao]

---

*Para duvidas, consulte o administrador do sistema ou o suporte tecnico.*

[[DOC Usuario Home|Voltar ao indice]]
```

## Regras obrigatorias:

- **NUNCA alucinar conteudo**: nao inventar colunas, campos, botoes, abas, regras, calculos ou mensagens que nao existem literalmente no codigo .frm/.bas. Se nao encontrou no codigo, NAO escreva. Em caso de duvida, omita — e melhor documentacao incompleta do que documentacao errada.
- **Colunas de grade**: documentar apenas as que o usuario realmente VE na tela. Excluir colunas com `.Visible = False` ou `.Hidden = True`, IDs internos e chaves estrangeiras tecnicas.
- **Mapeamento de aba e mostrar a aba correta**: cada controle/frame/botao/grade tem que ser colocado na aba indicada pelo `Tab(N).Control(M) = "..."` do designer. Nao adivinhe pela ordem fisica no .frm.
- **Caption real, nao nome interno**: use o caption que aparece na tela (o rotulo da label, header da coluna, caption do botao). Nao traduza o nome tecnico (`DFmargem_lucro` → "Margem de Lucro") se nao tem certeza de qual e o caption exibido na tela.
- **Controles condicionais**: sempre que um controle/coluna/aba/caption for controlado por `.Visible`, `TabVisible`, `OPT.<flag>`, `Opcoes.Pegar_Valor(NNN)` ou diretiva `#If`, documente a condicao em linguagem de negocio. Ex.: "Aba 'Medicamentos' aparece quando o sistema esta configurado para Material Hospitalar"; "Coluna 'IPI' aparece quando a empresa aceita IPI no cadastro do item"; "Botao alterna entre 'Obs. Item' e 'Origem' conforme o modulo de Auto-Pecas". Nunca cite o numero da opcao nem o nome da flag.
- **Botoes com caption dinamico**: se um botao tem mais de um caption possivel (atribuicao `<botao>.Caption = "X"` ... `<botao>.Caption = "Y"`), documente os dois e a condicao que dispara cada um.
- NUNCA usar termos tecnicos (VB6, SQL, ADODB, Recordset, cnConexao, strSQL, etc)
- NUNCA mencionar nomes de variaveis (booXXX, strXXX, intXXX, lonXXX)
- NUNCA mencionar nomes de tabelas (TBXXX) ou campos (DFXXX) do banco
- NUNCA mencionar opcoes por numero (Opcao 1234) — traduzir para linguagem de negocio
- Sempre usar linguagem simples como se estivesse explicando para alguem que nunca viu um computador
- Explicar cada coluna de grade com uma frase curta e clara
- Cada checkbox e campo deve ter explicacao do que acontece quando marcado/preenchido
- Alertas do sistema devem explicar O QUE FAZER quando aparecem, nao apenas listar a mensagem
- Se o formulario tiver icones coloridos, explicar cada cor
- Se o formulario tiver calculos, explicar a logica sem mostrar formulas
