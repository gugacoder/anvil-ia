# Item de Estoque

## O que e esta tela?

Esta tela e o cadastro completo dos produtos, mercadorias e materiais que a empresa compra, vende ou utiliza. Aqui voce informa de uma so vez tudo que o sistema precisa saber sobre cada item: descricao, departamento, fornecedores, impostos, unidades de venda, codigos de barras, parametros de balanca, vasilhame, medicamento, auto-pecas, parametros por empresa e muito mais. E o ponto central que alimenta vendas, compras, estoque, fiscal e financeiro com os dados do produto.

## Quando usar?

- Quando um produto novo chegar e precisar ser cadastrado pela primeira vez.
- Quando precisar alterar dados de um produto ja cadastrado (descricao, imposto, comprador, codigo de barras, fornecedor).
- Para suspender a compra ou venda de um produto temporariamente sem excluir o cadastro.
- Para consultar informacoes complementares de um produto (estoque, precos, fornecedores, notas fiscais, lote, historico, observacoes).
- Para cadastrar relacoes entre produtos (similar, correspondente, vasilhame, origem de estoque, item composto).

## Como chegar nesta tela?

Esta mesma tela e usada por varios modulos do sistema. O caminho varia conforme o modulo aberto:

- **Retaguarda do Varejo** — Menu **Cadastros > Item Estoque > Item de Estoque**. Tambem pode ser aberta pelos botoes **Item de Estoque** e **Item Estq Cadastro** da barra de ferramentas.
- **Cadastros** — Menu **Cadastros > Item de Estoque > Item de Estoque**.
- **Compras AV** — Menu **Cadastros > Item de Estoque > Item de Estoque**. Tambem pelo botao **Item de Estoque** da barra de ferramentas.
- **Faturamento AV** — botao **Item de Estoque** da barra de ferramentas.
- **Fiscal** — Menu **Cadastros > Itens de Estoque > Item de Estoque**.
- **Prestacao de Servicos** — Menu **Cadastros > Item de Estoque > Item de Estoque**.
- **Ativo Imobilizado** — Menu **Cadastros > Item de Estoque > Item de Estoque**.
- **Terminal de Vendas** — Menu **Cadastros > Item de Estoque > Item de Estoque**.
- **WMS** — Menu **Cadastros > Item de Estoque > Item de Estoque Faturamento**.
- **PCP / Planejamento e Controle de Producao** — Menu **Cadastros > Itens de Estoque > Item de Estoque**.
- **Integracao PDA** — Menu **Cadastros > Item de Estoque > Item de Estoque**.

Em todos os modulos a tela funciona da mesma forma — mas alguns campos podem aparecer ou nao dependendo das configuracoes da empresa e do modulo.

---

## Estrutura da tela

A tela e dividida em **11 abas** no topo. As primeiras 8 abas concentram o cadastro do item, a aba **Empresa** ajusta parametros por empresa do grupo, a aba **Consulta** filtra a busca, e a aba **Listagem** mostra a lista dos itens encontrados. Na barra superior ha os botoes de **Incluir, Confirmar, Cancelar, Gravar, Alterar, Excluir, Atualizar, Copiar Atributos** e **Sair**, alem de menus de navegacao **Analitico/Sintetico** e **Padrao/Com Imposto/Gerencial** (para precos).

### Aba 1: Cadastro... (dados principais)

E a aba inicial. Concentra os dados que identificam o produto e os fornecedores.

#### Identificacao

- **Codigo** — numero unico do produto. Pode ser informado pelo usuario ou gerado automaticamente, dependendo da configuracao.
- **DV (Digito Verificador)** — numero de seguranca calculado pelo sistema, exibido ao lado do codigo.
- **Descricao** — nome completo do produto, como aparece nas notas fiscais. Maximo 50 caracteres.
- **Descricao Resumida** — versao curta da descricao (usada no PDV, etiquetas e telas com pouco espaco). **Obrigatoria.** Maximo 50 caracteres.
- **Descricao Analitica** — descricao detalhada, com mais informacoes tecnicas. **Obrigatoria.**
- **Departamento** — secao a que o produto pertence (ex.: Mercearia, Hortifruti, Limpeza). Use o botao de pesquisa ao lado para escolher. **Obrigatorio.**
- **Comprador** — pessoa responsavel pelas compras do produto. **Obrigatorio.**
- **Unidade de Medida** — como o produto e medido (UN, KG, CX, LT etc.).
- **Peso Liquido** — peso do produto sem embalagem.
- **Cross Docking** — marque se o produto so passa pelo Centro de Distribuicao para ser despachado para as lojas, sem ficar estocado no CD.
- **Cadastro** — data em que o produto foi cadastrado (preenchida pelo sistema).
- **Ultima Alteracao** — data e usuario da ultima alteracao realizada.

#### Status

- **Ativo / Inativo** — define se o produto esta ativo (disponivel para uso) ou inativo (nao deve ser usado em novas operacoes).

#### Peso Variavel

- **Sim / Nao** — Marque "Sim" para produtos vendidos por peso variavel (ex.: hortifruti, padaria); "Nao" para produtos com peso fixo na embalagem.

#### Fornecedores

Aqui voce associa um ou mais fornecedores ao produto:

- **Fornecedor** — escolha o fornecedor a ser vinculado.
- **Cod. no Fornecedor** — codigo (part number) do produto no catalogo do fornecedor.
- **Referencia** — codigo de referencia interna.
- **Tp. Com.** — tipo de comercializacao usado pelo fornecedor.
- **Vendedor** — vendedor de contato do fornecedor.
- Botoes: **Incluir, Alterar, Excluir, Excluir Todos** e **Cancelar** (cada um trata um fornecedor da grade).

A grade abaixo lista todos os fornecedores ja vinculados, com colunas como **Codigo, Nome, Nome Fantasia, CNPJ/CPF, Inscricao Estadual, Cod. no Fornecedor, Referencia, Tipo de Comercializacao** e **Fornecedor Principal** (so um pode ser principal).

### Aba 2: ...Cadastro (classificacoes comerciais e parametros operacionais)

#### Classificacao do produto

- **Classe** — categoria comercial. Pode ser obrigatoria conforme configuracao.
- **Divisao de Empresa** — divisao a que o produto pertence dentro da empresa.
- **Faixa de Comissao** — faixa de comissao aplicada nas vendas.
- **Sazonalidade** — produto sazonal (ex.: panetone, ovo de pascoa).
- **Encargo Transferencia** — encargo aplicado em transferencias entre filiais.
- **Classificacao ONU** — para produtos perigosos (combustiveis, gas, agrotoxicos).
- **N° Pag. Catalogo** — numero da pagina do catalogo.
- **Centro de Distribuicao** — CD vinculado ao item.

#### Caixinhas (marcadores)

- **Calculo de Sug. Diferenciado** — ative se a sugestao de compra deste item segue regra diferente do padrao.
- **Excluir item da geracao de inventario** — ative para que o item nao apareca em inventarios.
- **Validade Obrigatoria** — ative para exigir a data de validade nas entradas.
- **Guelta** — ative se o item gera bonificacao para o vendedor.
- **Pack Promo** — ative se o item e um pack/embalagem promocional.
- **Prioridade de Entrega** — ative para o item ter prioridade na separacao/entrega.

#### Valores e datas

- **% Frete** — percentual de frete aplicado ao item.
- **Dt. Alt. Compra Susp.** — data da ultima alteracao do status de compra suspensa (informativo).

#### Peso Variavel — atributos especificos

- **Validade** — quantos dias o produto pesado dura na loja.
- **Validade Extra** — dias adicionais de validade quando ativado em campanhas.
- **Tecla Associada** — tecla rapida no PDV.
- **Receita** — receita ligada ao item (cestas, kits, processados).
- **Setor Balanca** — setor onde o item e pesado.
- **Ignora Impress. Data Embalagem** — ative para nao imprimir a data da embalagem na etiqueta da balanca.

#### Parametros do PDV

- **Pesagem Obrigatoria** — define a regra de pesagem na venda (ex.: "Nao pesar e nao auditar").
- **Sensibilidade** — sensibilidade de leitura/balanca.
- **Multiplicacao PDV** — define como a quantidade e multiplicada no PDV (ex.: "Nao Multiplicar e Nao Auditar").
- **Conferencia peso Selfcheckout** — define como o peso e conferido no self-checkout (ex.: "Pesar e Nao Conferir").

> A combo **Forma de Coleta de Tags** **nao fica nesta aba** — ela esta na Aba 7 (Cadastro - Auto-Pecas/Peso Variavel), junto com os campos de auto-pecas e peso variavel.

#### Balanca

- **Informacao Nutricional** — codigo da informacao nutricional impressa.
- **Tara** — tara da balanca para o item.

#### Tabela Regional

Grade que vincula o item a tabelas regionais e empresas centralizadoras (aparece quando a opcao de Tabela Regional esta ativa).

#### Opcoes operacionais (caixinhas adicionais)

- **Quebra** — controla quebra/perda do item.
- **Alterar Precos nas Filiais** — ao gravar, propaga alteracoes de preco para as filiais.
- **Ordem de Transferencia** — ordem usada nas transferencias.
- **Envia p/ Palm** — envia o cadastro para coletores Palm/PDA.
- **Entrega Loja** — habilita a entrega na loja.
- **Troca** — habilita troca do produto.
- **CheckOut** — habilita venda no checkout.
- **Troca Centralizada** — troca processada de forma centralizada.
- **Pede Preco** — o PDV solicita o preco no momento da venda.
- **Compra Centralizada** — produto comprado de forma centralizada.
- **Compra Suspensa** — bloqueia novas entradas de compra.
- **Venda Suspensa** — bloqueia novas vendas.
- **Planilha** — entra em planilha de acompanhamento.

### Aba 3: ...Cadastro (relacionamentos do produto e categorias especiais)

#### Cotacoes

Grade onde aparecem as cotacoes recentes do item (informativo).

#### Similar Preco

- **Tipo:** Principal ou **Secundario**. Se Secundario, e obrigatorio escolher o **Produto Principal** (ao lado).

#### Origem Estoque

- **Tipo:** Principal, **Secundario** ou Originado. Para os dois ultimos e obrigatorio escolher o **Produto Principal**.

#### Correspondente

- **Tipo:** Principal ou Secundario. Se Secundario, e obrigatorio o **Produto Correspondente**.
- **Insumo** — marque se o item e considerado insumo.

#### Vasilhame

- **Tipo:** "Sem Vasilhame" ou **"Possui Vasilhame"**. Se possui, escolha o **Produto Vasilhame** associado.

#### Imagem

- Espaco para anexar uma imagem do produto.
- Botoes **Buscar** (selecionar arquivo), **Limpar** (remover) e **Zoom** (ampliar).
- **Exibir** — marque para mostrar a imagem na lista.

#### Composicao

- Tipo: **Normal**, **Composto** ou **Cesta Basica**.
- **Parte Composicao** — marque se o item participa de uma composicao maior.
- **Desmembrado** — marque se o item composto pode ser desmembrado.
- Botao para abrir os componentes.

#### Distribuicao de Pecas

- Tipo: **Peca**, **Parte da Peca**, **Peca/Parte da Peca** ou **Nenhum**.

#### Outros campos da aba

- **Codigo ANP** — codigo da Agencia Nacional do Petroleo (combustiveis).
- **% Mistura GLP** — percentual de mistura para GLP.
- **Tratamento FITOSSANITARIO** — marque para defensivos agricolas.
- **Tipo Separacao** — **Por Pedido** ou **Por Carga** (separacao no estoque).

### Aba 4: Tributos (impostos federais e classificacao fiscal)

- **Tipo de Item** — natureza do produto (mercadoria, materia-prima, produto acabado, servico, uso e consumo etc.).
- **Classificacao Fiscal (NCM)** — codigo NCM oficial do produto.
- **Cod. Ex. TIPI** — exececao da TIPI.
- **Genero** — genero contabil/fiscal.
- **Codigo do Servico** — para itens classificados como servico (ISS).
- **Linha do Item** — linha (agrupamento fiscal/comercial), com botao de busca ao lado.
- **Excecao de Tributacao** — tabela alternativa de tributacao (aparece se a empresa usa essa funcao).
- **Tributavel — PIS / COFINS** — caixinhas que dizem se o item e tributavel para PIS e para COFINS.
- **CST PIS Entrada** e **CST PIS Saida** — codigo de situacao tributaria do PIS.
- **CST COFINS Entrada** e **CST COFINS Saida** — codigo de situacao tributaria do COFINS.
- **Natureza da Receita Pis/Cofins** — natureza da receita exigida em alguns CSTs.
- **Natureza Base de Credito PIS/COFINS** — natureza da base de credito.

### Aba 5: Tributos (IPI, CEST e REINF)

#### Especificacao do Item para Substituicao Tributaria

- **CEST** — codigo CEST exigido para Substituicao Tributaria.

#### Tipo de Servico - REINF

Para servicos sujeitos a REINF.

#### IPI

- **Cod.** e **Classe** (Enquadramento) — codigo e classe do enquadramento do IPI.
- **CNPJ do Produtor** — CNPJ do fabricante (em casos especificos).
- **Selo** — descricao do selo de IPI.
- **Qtde do Selo** — quantidade do selo.
- **CST Entrada** e **CST Saida** — codigos de situacao tributaria do IPI na entrada e na saida.

### Aba 6: Unidade

#### Unidades

Grade **Unidades** lista as varias unidades de venda/compra do mesmo produto (UN, CX, FD, granel etc.). Cada linha mostra a sigla, descricao, fator de conversao, codigo de barras vinculado e demais atributos da unidade. O botao **Incluir/Alterar** abre uma tela secundaria para cadastrar/editar uma unidade. **Atencao:** so e possivel incluir/alterar unidades depois que o produto ja foi salvo pelo menos uma vez.

- **Fator Conversao M²** — fator de conversao para metros quadrados (quando aplicavel).

#### Tipo de Unidade

Grade que mostra os tipos de unidade vinculados (Compra, Venda, Saida etc.).

#### Codigo de Barras

Grade com os codigos de barras (EAN) vinculados ao item.

> **Observacao:** os campos **Codigo de Barra digitavel via SRF**, **Quantidade digitavel via SRF** e o quadro **Area e Localizacao** **nao estao nesta aba** — todos eles estao na Aba 7 (Cadastro - Auto-Pecas/Peso Variavel).

### Aba 7: Cadastro (Auto-Pecas / Peso Variavel / Area e Localizacao)

> **Aba condicional:** esta aba **so aparece** se o sistema estiver configurado para Auto-Pecas, se a empresa usar Classificacao ABC por Rede, ou se o modulo WMS estiver desabilitado. Caso nenhuma dessas configuracoes esteja ativa, a aba fica oculta.

#### Fornecimento Automatico (peso variavel)

- **Peso Medio** — peso medio do item (entre zero e 9.999).
- **% Ger. Arred.** — percentual de geracao de arredondamento (entre zero e 100).

#### Coleta de Tags

- **Forma de Coleta de Tags** — combo que define a forma de coleta de etiquetas/tags no PDV.

#### Codigos de Barras (parametros SRF)

- **Codigo de Barra digitavel via SRF** — marque se o caixa pode digitar o codigo manualmente quando a leitura falhar.
- **Quantidade digitavel via SRF** — marque se a quantidade pode ser digitada no caixa.

#### Area e Localizacao

- **Area de Armazenagem** — area onde o item fica armazenado.
- **Localizacao** — localizacao especifica dentro da area.
- Botoes **Incluir** e **Excluir** alimentam a grade abaixo, que mostra todas as areas/localizacoes do item.

#### Classificacao ABC - Rede (so aparece se a empresa usa esta configuracao)

Grade que mostra a classificacao ABC (A, B ou C) por Rede para o item.

#### Auto-Pecas (so aparece quando o sistema esta configurado para Auto-Pecas)

- **Codigo de Origem** — codigo de origem da peca (unico).
- **Codigo Universal** — codigo universal da peca.
- **Aplicacao** — aplicacao da peca.
- **Marca** — marca da peca.
- **Modelo** — modelo da peca.
- **Retornavel** — marque se a peca e retornavel.
- **Ano do Item** — grade com os anos a que a peca se aplica (incluir/excluir anos).
- **Observacoes** — campo livre.

### Aba 8: Cadastro (Medicamentos / Manipulados)

> **Aba condicional:** esta aba **so aparece** quando o sistema esta configurado para **Material Hospitalar / Medicamentos Manipulados**. Se a sua empresa nao usa esse modulo, a aba fica oculta.

So preencha se o produto for medicamento ou agrotoxico:

- **Medicamento** — marque se o produto e um medicamento.
- **Exige Receita Ministerio Agricultura** — marque para defensivos que exigem receituario agronomico.
- **Especie** — especie do medicamento (ate 100 caracteres).
- **Indicacao** — para que serve o medicamento (ate 500 caracteres).
- **Observacoes** — observacoes adicionais (ate 8.000 caracteres).

#### Dados do medicamento manipulado (Sal/Medicamento)

- **Marca** — marca do medicamento.
- **Nome Comercial** — nome comercial do medicamento.
- **Procedencia** — procedencia do produto.
- **Codigo DCB** — codigo DCB (Denominacao Comum Brasileira).
- **Nome do Sal** — nome do sal (principio ativo).
- **Registro** — numero do registro do medicamento.

### Aba 9: Empresa

Mostra todas as empresas/filiais do grupo em uma grade, com parametros por empresa. A grade pode ter ate 42 colunas; varias sao **mostradas/ocultas conforme a configuracao** da empresa e do sistema. Abaixo a relacao das colunas mais comuns:

| Coluna | O que significa |
|---|---|
| **Empresa** (Codigo / Nome / Rede) | Empresa ou filial |
| **Mix** | Item faz parte do mix da empresa? |
| **Industrializado** | Marca o item como industrializado pela empresa |
| **Estoque Minimo** | Estoque minimo desejado |
| **Estoque Min. Alterado** | Estoque minimo ajustado manualmente |
| **Estoque Maximo** | Estoque maximo desejado |
| **% Lucro** | Margem de lucro desejada para o item (em percentual) |
| **Ponto de Pedido** | Quantidade que dispara reposicao |
| **Qtde Min. Venda** | Quantidade minima permitida em uma venda |
| **Classificacao ABC** | A, B ou C (importancia do item) |
| **Margem Adicional** | Margem complementar (%) |
| **CNPJ Fabricante** | CNPJ do fabricante na empresa |
| **Cod. Beneficio Fiscal** | Codigo de beneficio fiscal aplicado |
| **% Reducao ST Retido** | Percentual de reducao de ST |
| **Cod. Item IPM** | Codigo do item no IPM |
| **Bloqueado** | Item bloqueado nessa empresa? |
| **Estoque Loja** | Estoque atual da loja (informativo, aparece se o tipo de estoque estiver habilitado) |
| **Estoque Troca** | Estoque de troca (informativo, aparece se o tipo de estoque estiver habilitado) |
| **Estoque Deposito** | Estoque do deposito (informativo, aparece se o tipo de estoque estiver habilitado) |
| **Estoque Suspeito** | Estoque suspeito (informativo, aparece se o tipo de estoque estiver habilitado) |

**Colunas que aparecem somente sob certas configuracoes:**

| Coluna | Quando aparece |
|---|---|
| **Tipo IPI** (Aliquota / Pauta / Unidade) | So aparece quando alguma empresa do grupo aceita IPI no cadastro do item. |
| **IPI** (percentual ou valor) | So aparece quando alguma empresa do grupo aceita IPI no cadastro do item. |
| **Compra Centralizada** | So aparece na grade quando a empresa usa **Tabela Regional**. Quando nao aparece, a marcacao **Compra Centralizada** e feita pelo checkbox da **Aba 2** (...Cadastro). |

> **Observacao:** "Compra Centralizada" existe em dois lugares na tela: como **checkbox** na Aba 2 (vale para o item como um todo) e como **coluna na grade da Aba 9** (vale por empresa) — esta ultima so e exibida com a Tabela Regional habilitada.

Ao lado da grade ficam ainda:

- **Status Empresa** — painel que mostra o status do item naquela empresa.
- **Unidade Empresa** — combo com a unidade da empresa.

### Aba 10: Consulta (filtros de pesquisa)

Tela de filtros para localizar itens cadastrados. Voce escolhe quais filtros usar e clica em **Pesquisar**:

- **Codigo** — filtra por codigo do item.
- **Codigo de Barras** — busca por codigo de barras.
- **Cod. no Fornecedor** — busca pelo codigo do item no catalogo do fornecedor.
- **Comprador** — filtra por comprador.
- **Unidade** — unidade.
- **Unidade de Medida** — unidade de medida.
- **Linha do Item** — linha.
- **Classe** — classe.
- **Classificacao Fiscal** — NCM.
- **Area de Armazenagem** — area.
- **Tipo de Item** — natureza do produto.
- **Divisao de Empresa** — divisao.
- **Vendedor / Representante** — vendedor.
- **Fornecedor** — fornecedor.
- **Departamentos** — arvore para escolher departamentos.
- **Pack Virtual** / **Campanha** / **Faixa Precos** / **Consulta Venda** — combos de filtro.
- **Classificacao ABC** — A, B ou C.
- **PIS** / **COFINS** / **Centralizado** / **Peso Variavel** / **Pack Promo** / **Compra Suspensa** / **Venda Suspensa** / **Cross Docking** / **Troca** — combos com Sim, Nao ou todos.
- **Status** — Ativo, Inativo ou todos.
- **Produto Similar** — Principal, Secundario ou todos.
- **Periodo de Cadastramento (De / Ate)** — intervalo de datas.
- Botoes **Limpar** (zera filtros) e **Pesquisar** (aplica filtros).

### Aba 11: Listagem

Mostra a lista dos itens encontrados pela pesquisa. As colunas incluem entre outras: **Codigo, Digito (DV), Descricao, Departamento, Unidade, Comprador, Classe, Classificacao Fiscal, Tipo de Item, Linha, Sazonalidade, Status (Ativo/Inativo), Compra Suspensa, Venda Suspensa, Pack Promo, Cross Docking, Centralizado, Codigo de Barras, Estoque, Peso Liquido, Margem, Data de Cadastro**, entre outras (a grade tem 48 colunas no total — voce pode reordenar e ocultar colunas conforme necessario).

#### Filtro rapido

- **Somente Itens Ativos** — esconde os itens inativos.
- **Campo de pesquisa por palavra** — digite uma palavra e clique na lupa **Pesquisar** para localizar o item.

#### Legenda de cores e icones

O botao **Legenda** abre um quadro flutuante com a explicacao dos icones e cores usados nas linhas:

- **Item Principal** — produto que e a referencia para outros (similares ou origens).
- **Item Secundario** — produto que depende de um principal.
- **Item Campanha** — esta participando de uma campanha promocional.
- **Item Pack Virtual** — formado por outros itens (kit virtual).
- **Item Ativo** — produto disponivel (texto preto).
- **Item Inativo** — produto desativado (texto em cor diferente).

#### Botoes laterais (acoes da listagem)

| Botao | O que faz |
|---|---|
| **Estoque** | Mostra o estoque atual do item nas empresas |
| **Preco** | Consulta os precos cadastrados (Padrao, Com Imposto, Gerencial) |
| **N.F. Entrada** | Mostra notas fiscais de entrada do item |
| **N.F. Saida** | Mostra notas fiscais de saida do item |
| **Pedido Compra** | Mostra pedidos de compra do item |
| **Fornecedor** | Mostra os fornecedores do item |
| **Historico** | Mostra o historico de alteracoes |
| **Area Armazen.** | Mostra a area/localizacao de armazenagem |
| **Composicao** | Mostra os componentes do item composto (alterna para "Integra ao PCP" quando aplicavel) |
| **Distrib. Pecas** | Mostra a distribuicao de pecas |
| **Obs. Item** / **Origem** | Mesmo botao com **caption dinamico**: aparece como **"Obs. Item"** (abre as observacoes do item) quando o modulo de **Auto-Pecas esta habilitado**; aparece como **"Origem"** (abre a origem da peca) quando Auto-Pecas esta desabilitado. |
| **Concorrentes** | Mostra concorrentes do item |
| **Palm** | Mostra/configura envio para Palm/PDA |
| **Aliq. ICMS** | Mostra aliquotas de ICMS por estado |
| **Similar** | Mostra itens similares relacionados |
| **Corresp.** | Mostra itens correspondentes |
| **Venda Futura** | Mostra/registra vendas futuras vinculadas |
| **Lote** | Mostra os lotes em estoque |
| **Imprimir** | Gera relatorio dos itens listados |
| **Legenda** | Mostra/oculta o quadro de legenda |

---

## Passo a passo

### Cenario 1: Cadastrar um produto novo

1. Va para a aba **Listagem** e clique em **Incluir** na barra superior.
2. Na aba **Cadastro...** preencha:
   - Codigo (se nao for automatico).
   - Descricao, Descricao Resumida e Descricao Analitica.
   - Departamento (clique no botao de busca).
   - Comprador.
   - Unidade de Medida.
   - Peso Liquido.
   - Status: Ativo.
   - Peso Variavel: Sim ou Nao.
3. Inclua pelo menos um **Fornecedor** na area de fornecedores e marque-o como principal.
4. Va para a 2a aba **...Cadastro** e informe Classe, Divisao de Empresa, Sazonalidade (se aplicavel) e marque as caixinhas de operacao necessarias (Compra Suspensa, Venda Suspensa, Centralizado etc.).
5. Va para a 3a aba **...Cadastro** e configure Similaridade, Origem Estoque, Correspondente, Composicao e Distribuicao de Pecas conforme o caso. Anexe imagem se quiser.
6. Va para a aba **Tributos** (4a) e informe Tipo de Item, Classificacao Fiscal (NCM), CSTs de PIS e COFINS (Entrada e Saida), Genero e demais codigos fiscais.
7. Va para a 5a aba **Tributos** e informe CEST, codigos de IPI (enquadramento, CSTs), REINF se for servico.
8. Va para a aba **Unidade** e cadastre o **Codigo de Barras** e a unidade de venda (ex.: UN, CX). Marque os campos do SRF se necessario. Inclua a area/localizacao de armazenagem.
9. Se for medicamento, va para a aba **Cadastro** (8a) e marque **Medicamento**, preenchendo Especie, Indicacao e Observacoes.
10. Va para a aba **Empresa** e configure os parametros para cada empresa (Mix, Estoque Minimo/Maximo, Margem, ABC, IPI etc.).
11. Clique em **Confirmar** (ou **Gravar**) para salvar.

### Cenario 2: Alterar dados de um produto

1. Va para a aba **Listagem**, use a aba **Consulta** para filtrar e localize o produto.
2. Selecione a linha e clique em **Alterar**.
3. Os campos liberam edicao. Mude o que precisar.
4. Clique em **Confirmar**.

### Cenario 3: Suspender a compra ou a venda

1. Localize o produto na **Listagem** e clique em **Alterar**.
2. Marque **Compra Suspensa** e/ou **Venda Suspensa** na area Opcoes da 2a aba.
3. Clique em **Confirmar**.
4. Para reativar, repita desmarcando.

### Cenario 4: Excluir um produto

1. Selecione o produto na **Listagem**.
2. Clique em **Excluir**.
3. Se houver movimentacao (NF, pedido, venda, inventario, cupom), o sistema bloqueia e explica o motivo. Se nao houver, o produto e removido.

### Cenario 5: Consultar informacoes do produto

1. Selecione o item na **Listagem**.
2. Use os botoes laterais (Estoque, Preco, N.F. Entrada/Saida, Lote, Historico etc.) para abrir a consulta desejada.

### Cenario 6: Copiar atributos de um produto

1. Selecione o produto modelo na **Listagem**.
2. Clique em **Copiar Atributos** (barra superior).
3. O sistema cria um cadastro novo ja preenchido. Ajuste os campos diferentes (codigo, descricao, codigo de barras) e clique em **Confirmar**.

### Cenario 7: Cadastrar/alterar uma unidade do item

1. Salve o item primeiro (cenario 1) — sem o item gravado, a inclusao de unidade e bloqueada.
2. Va para a aba **Unidade**, clique em **Incluir/Alterar** abaixo da grade Unidades.
3. Uma janela auxiliar abre — preencha sigla, descricao, fator de conversao e codigo de barras da unidade.
4. Confirme; a unidade aparece na grade.

### Cenario 8: Anexar imagem do produto

1. Va para a 3a aba (...Cadastro), area Imagem.
2. Clique em **Buscar** e escolha o arquivo de imagem (deve estar no diretorio configurado).
3. Use **Zoom** para ampliar ou **Limpar** para remover.
4. Marque **Exibir** se quiser mostrar a imagem na lista.

---

## Regras importantes

### Identificacao e descricoes

- **Codigo obrigatorio:** o codigo precisa ser informado e ser numerico. Se a configuracao for "Codigo Informado", nao pode ser zero ou negativo.
- **Descricao, Resumida e Analitica obrigatorias.** As tres precisam ser preenchidas. Se nao forem, o sistema avisa para preencher.
- **Caracteres especiais bloqueados:** o sistema impede caracteres invalidos nas descricoes (como aspas simples `'`). Refaca usando apenas letras, numeros e pontuacao basica.
- **Mudanca de descricao gera alerta SPED:** se voce alterar a descricao de um item ja existente, o sistema pergunta se quer continuar — porque a mudanca e declarada no registro 0205 do SPED Fiscal.

### Dados comerciais

- **Comprador obrigatorio e ativo:** todo item exige comprador. Se o comprador escolhido estiver inativo, troque por outro.
- **Departamento obrigatorio:** sem departamento, o sistema bloqueia.
- **Linha do Item obrigatoria** quando a empresa esta configurada para tratar dados fiscais ou comerciais por linha.
- **Classe obrigatoria (configuravel):** quando ativada, o sistema sugere uma classe padrao se voce nao informar.
- **Divisao de Empresa obrigatoria** quando a empresa exige divisao.

### Tributos

- **Classificacao Fiscal (NCM) obrigatoria** para itens que nao sao servico, uso ou consumo.
- **CEST obrigatorio** para alguns NCMs (o sistema avisa quando obrigatorio).
- **CSTs PIS/COFINS obrigatorios** quando a empresa trata tributos no item: PIS Entrada, PIS Saida, COFINS Entrada, COFINS Saida.
- **Natureza da Receita PIS/COFINS** exigida em alguns CSTs — sem ela o sistema nao salva.
- **CSTs de IPI obrigatorios** quando alguma empresa cobra IPI: codigo do enquadramento, CST de Entrada e CST de Saida.
- **Tipo de Item obrigatorio** sempre.
- **CST da Natureza vs CST do Item:** se a Natureza Pis/Cofins for diferente do CST informado, o sistema mostra um alerta. Ajuste para que fiquem coerentes.

### Relacoes entre produtos

- **Similar/Correspondente/Origem Secundario:** se o item e marcado como Secundario, e obrigatorio escolher o produto principal.
- **Vasilhame:** quando "Possui Vasilhame", e obrigatorio indicar o produto-vasilhame; o mesmo vasilhame nao pode estar associado a mais de um item.

### Peso e balanca

- **Peso Liquido nao pode ser zero** quando a opcao de validar peso esta ativa.
- **Peso Medio e % Arred.:** se o item e de peso variavel e voce preencher um, tem que preencher o outro. Peso Medio entre zero e 9.999, Percentual entre zero e 100.
- **Fator de Conversao M²:** nao pode ser negativo.

### Compra/Venda Suspensa e Centralizado

- **Compra/Venda Suspensa e Classificacao ABC da Rede:** o sistema impede suspender quando a classificacao ABC da rede esta fora do permitido.
- **Centralizado obriga uma empresa de centralizacao:** quando o item e Centralizado e a Tabela Regional esta ativa, e obrigatorio existir pelo menos uma empresa de centralizacao na grade Regional, e pelo menos uma empresa marcada como centralizada.
- **Centro de Distribuicao:** obrigatorio quando o item e centralizado e a configuracao exige.

### Fornecedores

- **Fornecedor principal unico:** havendo varios fornecedores, somente um pode ser principal — nao mais e nem menos.
- **Codigo do item no fornecedor (part number) obrigatorio** quando a configuracao exige.
- **Vendedor (contato) obrigatorio por fornecedor** quando a configuracao exige.

### Auto-pecas

- Quando o modulo de auto-pecas esta ativo, sao obrigatorios:
  - **Codigo de Origem** (e nao pode repetir entre itens);
  - **Marca**;
  - **Modelo**.

### Tributacao por Departamento ou Linha

- Se o sistema tributa por **Departamento**, a tributacao do departamento ja deve estar cadastrada antes de gravar o item.
- Se tributa por **Linha**, a tributacao da linha ja deve estar cadastrada.

### Aba Empresa

- **Estoque Minimo, Maximo, Margem, Quantidade Minima de Venda devem ser positivos.**
- **Estoque Minimo nao pode ser maior que Estoque Maximo.**
- **Classificacao ABC obrigatoria** para cada empresa.
- **Mix:** so e possivel marcar Mix em uma filial se a empresa matriz tambem tiver Mix do item. Para tirar Mix da matriz, primeiro tire Mix das filiais.
- **Inativacao com estoque:** o item nao pode ser inativado se ainda houver estoque em alguma empresa. Zere os estoques das empresas listadas e tente novamente.

### Imagem

- A imagem precisa estar no **diretorio configurado** de imagens (caminho informado pelo administrador).
- Apenas formatos validos de imagem sao aceitos.

### CNPJ do produtor (IPI)

- Quando informado, o **CNPJ deve ter 14 posicoes validas**.

### Unidades, Codigo de Barras e Areas de Armazenagem

- **Inclusao de unidade so depois de salvar o item.** O sistema mostra "Para ter acesso a inclusao da unidade e necessario gravar o registro em uso." quando voce tenta antes.
- **Area de Armazenagem precisa pertencer a empresa do usuario** — caso contrario o sistema bloqueia.
- **Localizacao obrigatoria** ao incluir uma area.
- **Area duplicada** — nao e possivel adicionar a mesma area duas vezes para o item.

### Listagem e exclusao

- **Selecione apenas um item** ao usar Lote, Composicao e algumas outras consultas.
- **Itens com movimentacao nao sao excluidos:** Pedido de Compra, NF de Entrada, NF de Saida, Venda Diaria, Cupom Fiscal, Pedido de Venda ou Inventario Fiscal — qualquer um deles bloqueia a exclusao.

### Outras

- **Item bloqueado por Cadastro de Fornecedor em andamento:** "Termine ou cancele o cadastro do Fornecedor" indica que ha um fornecedor sendo editado — finalize antes de gravar.
- **Caractere `'` nao permitido** em nenhuma descricao.

---

## Como o sistema calcula

### Sugestao de compra (estoque minimo, maximo e ponto de pedido)

O sistema usa os parametros informados na aba **Empresa** para sugerir reposicao:

1. (+) **Estoque Maximo** — quanto o sistema gostaria de ter em estoque.
2. (-) **Estoque Atual** — o que ja tem na loja/deposito.
3. (=) **Quantidade sugerida** para reposicao.
4. Se o **Estoque Atual** estiver abaixo do **Ponto de Pedido**, o sistema dispara o pedido automaticamente.
5. O **Estoque Minimo Alterado** substitui o **Estoque Minimo** quando preenchido (permite ajustes pontuais sem perder o valor original).

Quando o item esta marcado como **Calculo de Sugestao Diferenciado**, o sistema usa uma regra alternativa configurada para esse item especifico.

### Margem de lucro e preco

A **Margem de Lucro** e a **Margem Adicional** indicam o percentual desejado em cima do custo. O calculo final do preco de venda considera:

1. (+) Custo do produto (entrada).
2. (+) IPI, ST e demais impostos quando aplicavel.
3. (+) % de Frete.
4. (+) Margem de Lucro.
5. (+) Margem Adicional.
6. (=) Preco sugerido na empresa.

Os botoes **Padrao / Com Imposto / Gerencial** permitem ver o mesmo preco sob tres oticas diferentes.

### Peso variavel — peso medio e arredondamento

Para itens de peso variavel:

1. (+) **Peso Medio** — peso esperado por embalagem (ex.: 1,250 kg).
2. (+) **% Geracao Arredondamento** — tolerancia de variacao para cima ou para baixo.
3. (=) Faixa de peso aceita pelo sistema na hora da pesagem.

### Sensibilidade e Multiplicacao PDV

Quando o item e vendido por unidade no PDV mas exige tratamento especial:

- **Multiplicacao PDV** controla se a quantidade lida deve ser multiplicada (ex.: pacote vendido como uma unidade vira tantos itens internos).
- **Sensibilidade** define o quanto a balanca precisa concordar com o peso esperado para aceitar a venda.

---

## Tipos / Classificacoes

### Composicao

| Tipo | Descricao |
|---|---|
| **Normal** | Item comum, sem composicao |
| **Composto** | Item formado por outros itens (kit) |
| **Cesta Basica** | Item especial classificado como cesta basica |

### Distribuicao de Pecas

| Tipo | Descricao |
|---|---|
| **Peca** | Item e considerado peca completa |
| **Parte da Peca** | Item compoe parte de uma peca maior |
| **Peca / Parte da Peca** | Item pode atuar como peca ou parte |
| **Nenhum** | Sem aplicacao |

### Similar / Correspondente / Origem de Estoque

| Tipo | Descricao |
|---|---|
| **Principal** | Item de referencia |
| **Secundario** | Item dependente de um principal (precisa indicar qual) |
| **Originado** | (Apenas Origem Estoque) Item gerado a partir de outro |

### Vasilhame

| Tipo | Descricao |
|---|---|
| **Sem Vasilhame** | Item nao possui casco/vasilhame retornavel |
| **Possui Vasilhame** | Item e vendido com casco/vasilhame (precisa indicar o produto-vasilhame) |

### Tipo Separacao

| Tipo | Descricao |
|---|---|
| **Por Pedido** | Item separado por cada pedido individual |
| **Por Carga** | Item separado por agrupamento de carga |

### Tipo de IPI

| Codigo | Descricao |
|---|---|
| **A** | Aliquota |
| **P** | Pauta |
| **U** | Unidade |

### Classificacao ABC

| Tipo | Descricao |
|---|---|
| **A** | Item de maior importancia em vendas/lucro |
| **B** | Item de importancia media |
| **C** | Item de menor importancia |

### Status

| Tipo | Descricao |
|---|---|
| **Ativo** | Item disponivel para uso |
| **Inativo** | Item desativado, nao deve ser usado em novas operacoes |

### Sensibilidade / Multiplicacao PDV / Pesagem Obrigatoria / Forma de Coleta de Tags

Sao listas com varios niveis (de 0 a 9 ou similares) configurados pelo administrador conforme o tipo de balanca/PDV usado.

### Tipo de Comercializacao (fornecedor)

Define como o fornecedor comercializa o item (Industria, Distribuidor, etc., conforme cadastro).

---

## Botoes

### Barra superior (acoes principais)

| Botao | O que faz |
|---|---|
| **Incluir** | Limpa a tela e prepara para cadastrar um item novo |
| **Confirmar** | Confirma a operacao em andamento |
| **Cancelar** | Cancela a operacao atual sem salvar |
| **Gravar** | Salva os dados preenchidos |
| **Alterar** | Habilita a edicao do item selecionado |
| **Excluir** | Apaga o item selecionado (se nao tiver movimentacao) |
| **Atualizar** | Recarrega os dados da listagem |
| **Copiar Atributos** | Cria um item novo copiando os dados do item selecionado |
| **Sair** | Fecha a tela |
| **Analitico / Sintetico** | Alterna a visualizacao da listagem |
| **Padrao / Com Imposto / Gerencial** | Alterna a forma de exibicao dos precos consultados |

### Botoes da Listagem (acoes complementares)

Veja a tabela completa na secao **Aba 11: Listagem**.

### Botoes em areas internas

| Botao | Onde aparece | O que faz |
|---|---|---|
| **Pesquisar Departamento** | Aba Cadastro... | Abre a arvore de departamentos para escolher |
| **Incluir/Alterar/Excluir/Excluir Todos Fornecedor** | Aba Cadastro... (Fornecedores) | Operacoes na grade de fornecedores |
| **Cancelar Fornecedor** | Aba Cadastro... (Fornecedores) | Cancela edicao do fornecedor em andamento |
| **Buscar / Limpar / Zoom** | Aba ...Cadastro 3 (Imagem) | Anexa, remove ou amplia a imagem |
| **Composicao** | Aba ...Cadastro 3 | Abre a tela de componentes do item composto |
| **Similar / Correspondente / Origem Estoque / Vasilhame** | Aba ...Cadastro 3 | Botoes de pesquisa do produto principal correspondente |
| **Pesquisar CEST / Linha do Item** | Aba Tributos | Abre busca dos codigos |
| **Incluir/Alterar Unidade** | Aba Unidade | Abre tela auxiliar para cadastrar/alterar unidades |
| **Incluir/Excluir Area** | Aba Unidade (Area e Localizacao) | Adiciona ou remove area na grade |
| **Limpar / Pesquisar** | Aba Consulta | Zera filtros ou aplica a busca |

---

## Perguntas frequentes

**Esqueci de preencher uma descricao e o sistema nao deixa salvar. O que fazer?**
O sistema sempre exige Descricao, Descricao Resumida e Descricao Analitica. Volte para a primeira aba **Cadastro...** e preencha as tres antes de clicar em Confirmar.

**Apareceu uma mensagem dizendo que tem caracter invalido. O que isso significa?**
Voce usou um simbolo que o sistema nao aceita (como aspas simples `'` ou caracteres especiais). Refaca a descricao usando letras, numeros e pontuacao basica.

**Como faco para o produto nao aparecer mais nas vendas mas sem perder os dados?**
Use **Venda Suspensa** (e/ou **Compra Suspensa**) na 2a aba. Isso bloqueia novas vendas/compras sem excluir o cadastro. Ou marque o item como **Inativo** na primeira aba — mas, nesse caso, e preciso zerar os estoques antes.

**Por que nao consigo excluir o produto?**
Porque ele ja teve movimentacao. Se ja apareceu em pedido, NF (entrada ou saida), inventario, venda diaria ou cupom, o sistema bloqueia. Suspenda ou inative em vez de excluir.

**Por que aparece a mensagem "Para ter acesso a inclusao da unidade e necessario gravar o registro em uso"?**
A inclusao de unidade so e permitida depois de salvar o item pela primeira vez. Salve e tente de novo.

**O que fazer quando o sistema avisa que o vasilhame ja esta associado a outro item?**
Cada vasilhame pode estar vinculado a um unico item. Verifique no item indicado pela mensagem qual e o vinculo e remova de la antes de associar ao novo item.

**O que e a opcao Cross Docking?**
Marque quando o produto so passa pelo Centro de Distribuicao para ser despachado para as lojas, sem ficar estocado no CD.

**Qual a diferenca entre Pack Promo e Pack Virtual?**
**Pack Promo** e um pack/embalagem promocional cadastrado como item normal. **Pack Virtual** e quando varios itens sao agrupados virtualmente para venda como um conjunto, sem ter um codigo fisico unico.

**O que e CEST e quando preciso preencher?**
CEST e um codigo da Substituicao Tributaria. O sistema avisa quando ele e obrigatorio para o NCM informado. Preencha consultando a legislacao do produto.

**Posso cadastrar um produto sem fornecedor?**
Em geral nao — para produtos comerciais voce precisa associar pelo menos um fornecedor e marca-lo como principal. Para alguns tipos especificos (uso e consumo, servico) pode ser dispensado.

**O que acontece se eu mudar a descricao de um produto que ja existe?**
O sistema pergunta se quer realmente alterar — porque a mudanca constara no SPED Fiscal (registro 0205) enviado ao governo. Confirme apenas se for mesmo a intencao.

**Por que nao consigo marcar o item como Inativo?**
Se houver estoque em alguma empresa, o sistema bloqueia a inativacao. Zere os estoques das empresas listadas pela mensagem e tente de novo.

**Como funciona a Mix nas filiais?**
A Mix da matriz controla as filiais: so consigo marcar Mix em uma filial se a matriz ja tiver Mix. E para tirar a Mix da matriz, primeiro tenho que tirar de todas as filiais.

**Por que o IPI nao aparece em algumas linhas da grade Empresa?**
Porque a empresa nao esta configurada para usar IPI nesse cadastro. As colunas Tipo IPI e IPI sao ocultadas automaticamente nesses casos.

---

## Telas relacionadas

- [[Departamento de Item]] — origem do departamento associado ao item.
- [[Comprador]] — cadastro de compradores.
- [[Fornecedor]] — fornecedores vinculados ao item.
- [[Unidade de Medida]] — unidades cadastradas.
- [[Unidade de Item de Estoque]] — tela auxiliar para cadastrar/alterar unidades do item.
- [[Codigo de Barras]] — tabela e formato de codigos de barras.
- [[Classificacao Fiscal (NCM)]] — codigos NCM.
- [[CEST]] — codigos CEST.
- [[CST PIS / CST COFINS]] — codigos de situacao tributaria.
- [[CST IPI]] — codigos de situacao tributaria do IPI.
- [[Codigo de Servico]] — para itens classificados como servico.
- [[Tipo de Servico - REINF]] — para servicos com REINF.
- [[Genero de Item]] — generos contabeis/fiscais.
- [[Linha do Item]] — agrupamento por linha.
- [[Classe]] — classificacao comercial.
- [[Sazonalidade]] — sazonalidades cadastradas.
- [[Faixa de Comissao]] — faixas usadas na comissao.
- [[Centro de Distribuicao]] — vinculo com CD.
- [[Receita do Item]] — receitas para itens processados.
- [[Tara da Balanca]] — taras das balancas.
- [[Informacao Nutricional]] — informacoes para etiquetas de balanca.
- [[Codigo ANP]] — para combustiveis.
- [[Tabela Regional]] — tabelas regionais de compra centralizada.
- [[Curva ABC]] — classificacao ABC por empresa e rede.
- [[Producao / Composicao do Item]] — para itens compostos.
- [[Area de Armazenagem]] / [[Localizacao]] — definicoes de WMS.
- [[Marca]] / [[Modelo]] / [[Aplicacao]] — para auto-pecas.
- [[Item Estoque Composto]] — itens compostos.
- [[Vasilhame]] — vasilhames cadastrados.
- [[Cadastro de Promocao]] — promocoes do item.
- [[Cadastro de Cliente]] — clientes (relacionado pelo PDV).
- [[Excecao de Tributacao]] — tabelas alternativas de tributacao.

---

*Para duvidas, consulte o administrador do sistema ou o suporte tecnico.*

[[DOC Usuario Home|Voltar ao indice]]
