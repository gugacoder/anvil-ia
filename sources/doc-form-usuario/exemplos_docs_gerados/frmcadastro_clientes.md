# Cliente

## O que e esta tela?

Esta tela e o cadastro completo de Clientes do sistema. Aqui voce mantem todas as informacoes de quem compra da sua empresa: dados de identificacao, enderecos, telefones, contatos, contas bancarias, condicoes de venda, representantes, motivos de bloqueio e muito mais. Tambem permite consultar historico, gerar listagens e abrir telas relacionadas (pedidos, financeiro, notas fiscais).

## Quando usar?

- Ao incluir um novo cliente no sistema (apos uma venda, prospeccao ou parceria).
- Para alterar dados de um cliente existente (ex.: novo endereco, novo telefone, alteracao de plano de pagamento).
- Para bloquear ou desbloquear um cliente (inadimplencia, problemas comerciais, etc.).
- Para consultar o historico do cliente: pedidos, notas fiscais, devolucoes, financeiro, ocorrencias.
- Para inativar um cliente que nao opera mais com a empresa.

## Como chegar nesta tela?

A tela esta disponivel em varios modulos do sistema. Em geral o caminho e atraves do menu de Cadastros ou pelo botao "Cliente" na barra de ferramentas:

- **Cadastro:** menu de cadastros do modulo + botao "Cliente" na barra de ferramentas.
- **Faturamento (AV e PS):** botao "Cliente" na barra de ferramentas / menu de cadastros.
- **Contas a Receber:** botao "Cliente" na barra de ferramentas e menu "Cadastro de Cliente".
- **Contas a Pagar:** botao "Cliente" na barra de ferramentas e menu "Cadastro de Cliente".
- **Movimento Bancario:** botao "Cliente" e menu "Cadastro de Cliente".
- **Retaguarda Varejo:** botao "Cliente" na barra de ferramentas e menu "Cadastro de Cliente".
- **WMS, CTe, Ativo Imobilizado, Fiscal, CRM, Prestacao de Servicos:** menu de cadastros do proprio modulo.

---

## Estrutura da tela

A tela e organizada em **10 abas**, percorridas da esquerda para a direita conforme o cadastro avanca:

| Aba | Para que serve |
|---|---|
| **Cadastro...** | Dados basicos do cliente: codigo, razao social, CPF/CNPJ, plano de pagamento, regiao, etc. |
| **...Cadastro...** | Bloqueios do cliente, socios da empresa, indicadores fiscais e CNAE. |
| **...Cadastro** | Grupo de Venda PDV, Grupo de Cliente (Varejo) e Tipos de Finalizacao permitidos na frente de loja. |
| **Enderecamentos** | Cadastro de um ou mais enderecos do cliente (normal, entrega, cobranca). |
| **Faturamento** | Regras comerciais e fiscais: tributacao, descontos, alvaras, NFe, NFCe, IPI, ISS, etc. |
| **Representantes** | Representantes que atendem este cliente, setor/territorio/rota e operador de telemarketing. |
| **Contas** | Contas bancarias do cliente e contas contabeis utilizadas pela contabilidade. |
| **Contatos** | Telefones, fax, celular, e-mails e dados das pessoas de contato. |
| **Consulta** | Filtros para pesquisar clientes ja cadastrados. |
| **Listagem** | Resultado da pesquisa, em forma de grade, com varios botoes de acoes relacionadas. |

### Aba 1: Cadastro... (dados basicos)

- **Codigo**: numero unico do cliente.
- **Razao Social**: nome oficial da empresa ou pessoa.
- **Nome Fantasia**: como o cliente e conhecido comercialmente.
- **Pessoa**: define se o cliente e Juridica ou Fisica.
- **CNPJ / CPF**: documento. Ao lado existe um botao para fazer a consulta na Receita Federal.
- **Inscr. Estadual** (com a opcao "Inscricao Estadual" marcada quando o cliente possui) e **D.V.** (Digito Verificador).
- **RG**: usado para pessoas fisicas.
- **Inscricao Municipal** e **D.V.**.
- **CMC** e **Inscricao Suframa**: cadastros municipais e de zona franca quando aplicaveis.
- **Cadastro**, **Inativacao** e **Abertura CNPJ**: datas associadas ao cliente.
- **Ult. Atualizacao**: data da ultima alteracao do cadastro (preenchida pelo sistema).
- **Tipo de Cliente**, **Curva ABC**, **Regiao**, **Faixa**, **Tipo de Estabelecimento** e **Ramo de Atividade**: classificacoes do cliente.
- **Plano de Pagamento**: condicao padrao de pagamento.
- **Limite de Credito**: valor maximo que o cliente pode comprar a prazo.
- **Vencimento - Considerar**: marcacoes para Sabado, Domingo e Feriados, indicando se esses dias devem ser considerados como dia util na hora de calcular o vencimento.
- **Home Page**: site do cliente.
- **Observacao**: campo livre para anotacoes.
- **Mensagem para Nota Fiscal**: texto que sera impresso nas notas fiscais emitidas para este cliente.

### Aba 2: ...Cadastro... (bloqueios, socios, indicadores)

**Motivos de Bloqueio:** permite registrar motivos pelos quais o cliente esta bloqueado.

- **Motivo de Bloqueio**: lista os motivos cadastrados no sistema. Use os botoes Incluir e Excluir abaixo para adicionar ou remover.

A grade de bloqueios mostra:

| Coluna | O que significa |
|---|---|
| **Codigo do motivo** | Identificador do motivo de bloqueio aplicado ao cliente. |
| **Descricao** | Texto que descreve o motivo do bloqueio. |

**Socios da empresa** (quando o cliente e pessoa juridica):

- **Tipo do socio**: CPF ou CNPJ.
- **CPF/CNPJ do socio**.
- **% Participacao**: percentual de participacao do socio na empresa.
- **Socio**: nome do socio.
- Botoes Incluir / Alterar / Excluir / Confirmar / Cancelar para gerenciar a lista.

A grade de socios mostra:

| Coluna | O que significa |
|---|---|
| **Nome do socio** | Nome completo do socio. |
| **CPF** | Documento do socio (CPF ou CNPJ ja formatado). |
| **% Participacao** | Quanto o socio detem da empresa. |

**Outros campos da aba:**

- **CRMV**: numero de registro no Conselho Regional de Medicina Veterinaria, usado quando aplicavel.
- **Segmento**: segmento de mercado em que o cliente atua.
- **Indicador de Inscricao Estadual**: contribuinte de ICMS, isento ou nao contribuinte.
- **Tipo de Assinante - Serv. Telecom.**: classificacao para servicos de telecomunicacoes.
- **CNAE**: codigo nacional de atividade economica do cliente.
- **Exige informacao de Pedido de Compra do Cliente no Pedido de Venda**: quando marcado, exige no pedido de venda o numero do pedido de compra do cliente.
- **Informacoes Adcionais** (botao): abre uma tela com dados complementares. Este botao **so aparece quando a configuracao do sistema que libera as informacoes adicionais esta ativada**. Se voce nao esta vendo o botao na sua tela, fale com o administrador / suporte para habilitar a configuracao correspondente.

### Aba 3: ...Cadastro (grupos de venda)

- **Grupo de Venda do PDV**: define o grupo de venda associado ao cliente no PDV. Use Incluir e Excluir abaixo da combo para gerenciar a grade abaixo.
- **Tipos de Finalizacao permitidos na frente de loja**: lista os tipos de finalizacao (ex.: dinheiro, cartao, cheque) que podem ser usados em vendas para este cliente. Cada linha pode ser marcada para liberar o tipo correspondente.
- **Grupo de Clientes (Varejo)**: classifica o cliente para fins de varejo.

### Aba 4: Enderecamentos

- **Endereco no Exterior**: marque quando o cliente nao tem endereco no Brasil. Ao marcar, libera o campo "Endereco do Exterior" para preenchimento livre.
- **Tipo Endereco**: define quais tipos de endereco serao cadastrados:
  - **Todos** (entra com qualquer tipo)
  - **Normal** (endereco principal)
  - **Entrega** (para onde a mercadoria vai)
  - **Cobranca** (para onde o boleto/financeiro e enviado)
- **Endereco**: bloco de preenchimento de logradouro, complemento, bairro, cidade, UF, CEP (controle dedicado ao endereco brasileiro).
- **Ponto de Referencia**: texto livre para indicar referencias do local.
- Botoes **Incluir** e **Excluir** para adicionar varios enderecos.

A grade de enderecos cadastrados mostra:

| Coluna | O que significa |
|---|---|
| **Ativo** | Indica se o endereco esta em uso. |
| **Padrao** | Indica se este e o endereco padrao para o tipo. |
| **Tipo** | Tipo do endereco (Normal, Entrega, Cobranca). |
| **Endereco** | Logradouro do cliente. |
| **Complemento** | Complemento (sala, andar, etc.). |
| **Ponto Referencia** | Referencia para encontrar o local. |
| **Bairro** | Bairro do endereco. |
| **Cidade** | Cidade do endereco. |
| **UF** | Estado do endereco. |
| **CEP** | CEP do endereco. |

### Aba 5: Faturamento

Aba mais extensa, organiza as regras comerciais, fiscais e financeiras do cliente.

**Campos de configuracao:**

- **Praca de Pagamento** e **UF** da praca de pagamento.
- **Atendimento**: visita / atendimento padrao para o cliente.
- **Seq. Visita**: ordem em que o cliente e visitado na rota.
- **Tolerancia de Atraso (dias)**: quantos dias o cliente pode atrasar antes de ser considerado inadimplente.
- **Grupo Tributacao**: agrupa o cliente para fins fiscais.
- **Valor Seguro**, **Valor Frete**, **Valor Outras Despesas**: valores padrao usados na nota fiscal.
- **Rede de Cliente**: identifica a rede a que o cliente pertence (ex.: rede de supermercados).
- **Configuracao da Carteira** de cobranca.
- **Senha Venda Telemarketing**: senha que libera vendas via telemarketing.
- **Regra de Importacao Xml**: regra de importacao de arquivos XML.
- **% Desc. Pedido**: percentual de desconto padrao em pedidos.
- **% Desc. Financ.**: desconto financeiro.
- **% Acres/Dec. Palm**: percentual de acrescimo ou decrescimo aplicado em vendas via Palm.
- **N CheckOut**: numero do caixa fixo do cliente, quando aplicavel.

**Calc. Proporcional:** define se o calculo proporcional usa **30** ou **31** dias.

**Documentos Agregados a Nota Fiscal**: lista para marcar quais documentos extras (boleto, romaneio, etc.) devem acompanhar as notas fiscais deste cliente.

**Alvara**: grade onde podem ser cadastrados varios alvaras do cliente.

| Coluna | O que significa |
|---|---|
| **Data do Alvara** | Data em que o alvara foi emitido. |
| **Numero do Alvara** | Numero / identificacao do alvara. |
| **Data de Validade** | Quando o alvara expira. |

**Caixas de marcacao (uma linha cada):**

- **Gera Encargo/Abatimento Devolucao Entrada**: gera lancamento financeiro automatico em devolucoes de entrada.
- **Nao Destacar IPI (Cliente Isento)**: nao destaca o IPI na nota fiscal.
- **Imprime Boleto - Configuracao da Carteira**: imprime o boleto de acordo com a configuracao da carteira definida.
- **Envia e-mail NFCe**: envia automaticamente a NFCe por e-mail.
- **Cliente Manifesto**: indica que o cliente sera incluido no manifesto.
- **Aceita Pedido Urgente**: cliente aceita pedidos com tratamento de urgencia.
- **Utiliza NFe**: cliente recebe nota fiscal eletronica.
- **Imprime Data de validade do item na emissao de nota fiscal**.
- **Utiliza NFCe**: cliente recebe nota fiscal de consumidor eletronica.
- **IRRF Retido**: cliente possui retencao de IRRF.
- **Incorpora IPI na base de Icms**.
- **ISS Retido**.
- **Guelta**: cliente participa de programa de guelta (premio para vendedor).
- **Inibir Identificacao na Emissao do Cupom Fiscal**.
- **Imprime Instrucao de Taxa no Boleto**.
- **Calcular limite de credito em analise de Cliente**.

### Aba 6: Representantes

- **Rota**: rota de visitas onde o cliente esta inserido (apenas leitura).
- **Sequencia rota**: posicao do cliente dentro da rota. Existem botoes para consultar rotas e sugerir a sequencia automaticamente.
- **Operador de Telemarketing**.
- **Setor de Venda** e **Territorio de Venda**.

**Representante** (quadro):

- **Nome**: representante do cliente.
- **Preposto**: preposto vinculado ao representante (opcional).
- Botoes **Incluir** e **Excluir** para gerenciar a lista de representantes.

A grade de representantes mostra:

| Coluna | O que significa |
|---|---|
| **Codigo do representante** | Identificador do representante. |
| **Nome** | Nome do representante. |
| **Codigo do preposto** | Identificador do preposto, quando houver. |
| **Nome do preposto** | Nome do preposto, quando houver. |
| **Status** | Situacao do representante (ativo, inativo). |

### Aba 7: Contas

A aba e dividida em dois quadros:

**Conta Contabil:**

- **Rede**: rede contabil (no caso de empresa com varias redes).
- **Plano Contabil**: plano de contas contabil utilizado.
- **Grupo Contabil**: grupo dentro do plano.
- Botoes **Incluir** e **Excluir** para vincular contas contabeis ao cliente.

**Conta Bancaria:**

- **Banco** do cliente.
- **Agencia**, **D.V. da agencia** e **Descricao da agencia** (preenchidos automaticamente ao escolher a agencia).
- **N Conta**, **D.V. da conta** e **Descricao da conta**.
- Botao **PIX** para informar dados de PIX.
- Botoes **Incluir**, **Alterar**, **Confirmar**, **Cancelar** e **Excluir** para manipular as contas listadas abaixo.

A grade de contas bancarias mostra:

| Coluna | O que significa |
|---|---|
| **Conta** | Numero da conta. |
| **D.V.** | Digito verificador da conta. |
| **Descricao** | Descricao da conta. |
| **Agencia** | Numero da agencia. |
| **D.V.** | Digito verificador da agencia. |
| **Descricao** | Descricao da agencia. |
| **Banco** | Nome do banco. |
| **Status** | LIBERADO ou BLOQUEADO. |

### Aba 8: Contatos

- **Telefone**, **Fax**, **Celular**: dados de telefonia do contato.
- **Contato**: nome da pessoa de contato.
- **E-mail**: e-mail do contato.
- **Setor do Contato**: setor da empresa em que o contato atua.
- **Aniversario**: data de aniversario do contato.
- Botoes **Incluir**, **Alterar**, **Confirmar**, **Cancelar** e **Excluir** para gerenciar a lista.

A grade de contatos mostra:

| Coluna | O que significa |
|---|---|
| **Telefone** | Telefone fixo. |
| **Fax** | Numero de fax. |
| **Tel Celular** | Telefone celular. |
| **Contato** | Nome da pessoa de contato. |
| **Setor** | Setor onde a pessoa trabalha. |
| **E-mail** | E-mail da pessoa. |
| **Aniversario** | Data de aniversario. |

### Aba 9: Consulta (filtros para pesquisar clientes)

Aqui voce monta o filtro para localizar clientes ja cadastrados:

- **Codigo**, **Razao Social**, **Nome Fantasia**.
- **Pessoa** (Fisica / Juridica).
- **CNPJ / CPF**.
- **Inscricao Estadual** ou **RG** (depende do tipo de pessoa).
- **Status**.
- **Tipo de Cliente**, **Rede**, **Tipo de Estabelecimento**, **Ramo de Atividade**, **Curva ABC**, **Regiao**.
- **Numero Cartao Conveniado**.
- **Plano de Pagamento**, **Representante**.
- **Segmento**, **Grupo de Venda do PDV**.
- **Dias de Atraso (de... ate...)** e **Dias S/ Compra (de... ate...)**: filtros baseados em comportamento do cliente.
- **Bloqueado**: marque para trazer somente clientes bloqueados; ao marcar, libera o quadro **Motivos de bloqueio**, onde pode escolher um ou mais motivos.
- **Datas**: filtra por **Cadastro**, **Atualizacao** e **Inativacao**, cada um com data inicial e final.
- Botoes **Limpar** (zera todos os filtros) e **Pesquisar** (executa a busca, traz o resultado na proxima aba).

### Aba 10: Listagem (resultado da pesquisa)

Mostra os clientes encontrados na grade.

- **Caixa de Consulta** no topo: digite parte de um texto para localizar rapidamente uma linha na grade.
- Botoes ao lado direito:
  - **Pesquisar** - botao de lupa, executa nova pesquisa.
  - **Legenda** - exibe a legenda de cores.
  - **Imprimir** - imprime a listagem.
- Painel **Consultando...** - aparece enquanto o sistema esta carregando os dados.

**Botoes inferiores (acoes para o cliente selecionado):**

| Botao | O que faz |
|---|---|
| **Financeiro** | Abre o financeiro do cliente. |
| **Cheques** | Abre os cheques do cliente. |
| **NF Saida** | Abre as notas fiscais de saida emitidas para o cliente (com sub-opcoes "Notas Fiscais Emitidas" e "Dados de Recebimento das Notas Fiscais"). |
| **Pedidos** | Abre os pedidos do cliente. |
| **Itens Vendidos** | Lista os itens ja vendidos para o cliente. |
| **Hist. Ocorrencia** | Mostra o historico de ocorrencias (bloqueios, observacoes etc.). |
| **Trocas** | Abre as trocas relacionadas ao cliente. |
| **Cancelar/Ativar** | Cancela ou reativa a unidade de servico (servicos contratados pelo cliente). |
| **Consignacao** | Abre as consignacoes do cliente. |
| **Orcamento** | Abre os orcamentos do cliente. |
| **NF Entrada** | Abre as notas fiscais de entrada relacionadas. |
| **Devolucoes** | Abre as devolucoes do cliente. |
| **Equipamentos** | Lista equipamentos vinculados (assistencia tecnica, locacao). |
| **Hist. Compra** | Historico de compras do cliente. |
| **Venda Futura** | Operacoes de venda futura. |

> **Atencao - Trocas x Cancelar/Ativar:** os botoes **Trocas** e **Cancelar/Ativar** ocupam a mesma posicao na tela e nunca aparecem juntos:
> - Quando a empresa logada **e** do ramo de atividade de Prestador de Servico, aparece o botao **Cancelar/Ativar** e o botao **Trocas** fica oculto.
> - Quando a empresa logada **nao e** do ramo de atividade de Prestador de Servico, aparece o botao **Trocas** e o botao **Cancelar/Ativar** fica oculto.

> **Observacao geral sobre os botoes inferiores:** alguns dos botoes acima (Orcamento, Consignacao, NF Entrada, Devolucoes, Equipamentos, Hist. Compra, Venda Futura, NF Saida) podem mostrar a mensagem "Formulario nao disponivel para este modulo" quando voce esta no WMS ou no controle de Frota. Use estes botoes pelo modulo correspondente (Faturamento, Contas a Receber, etc.).

#### Legenda de cores na listagem

| Cor | Significado |
|---|---|
| **Preto** | Cliente **Ativo**. |
| **Cinza** | Cliente **Inativo**. |
| **Vermelho** | Cliente **Bloqueado**. |

---

## Passo a passo

### Cenario 1: Incluir um novo cliente

1. Clique no botao **Incluir** (sinal de "+") no topo da tela.
2. Preencha o **Codigo** (ou deixe o sistema sugerir).
3. Em **Razao Social**, digite o nome oficial.
4. Em **Nome Fantasia**, digite como o cliente e conhecido.
5. Escolha **Pessoa** (Juridica ou Fisica). Os campos seguintes se ajustam.
6. Informe **CNPJ/CPF**. Use o botao ao lado para consultar a Receita Federal.
7. Marque **Inscricao Estadual** se aplicavel e informe o numero (ou marque "Isento" via Indicador de Inscricao Estadual na aba 2).
8. Preencha **Tipo de Cliente**, **Curva ABC**, **Regiao**, **Plano de Pagamento** e **Limite de Credito**.
9. Va para a aba **Enderecamentos** e cadastre pelo menos um endereco do tipo Normal e marque-o como Padrao.
10. Va para a aba **Contatos** e cadastre ao menos um telefone (ou celular) e um contato.
11. Va para a aba **Faturamento** e configure as opcoes que se aplicam ao cliente (NFe, NFCe, descontos, etc.).
12. Va para a aba **Representantes** e inclua os representantes que atendem este cliente.
13. Clique em **Confirmar** para gravar.

### Cenario 2: Pesquisar e abrir um cliente existente

1. Clique na aba **Consulta**.
2. Preencha um ou mais filtros (codigo, nome, CNPJ, etc.). Pode deixar todos em branco para listar todos.
3. Clique em **Pesquisar**. O sistema mostra o resultado na aba **Listagem**.
4. Localize o cliente na grade e clique nele para selecionar.
5. Clique em **Alterar** no topo da tela para edicao, ou utilize um dos botoes inferiores para abrir telas relacionadas.

### Cenario 3: Bloquear um cliente

1. Localize o cliente pela aba **Consulta** e selecione na **Listagem**.
2. Clique em **Alterar**.
3. Va para a aba **...Cadastro...**.
4. Escolha um **Motivo de Bloqueio** na combo.
5. Clique em **Incluir** para adicionar o motivo a grade.
6. Clique em **Confirmar** no topo da tela. O cliente passa a aparecer em vermelho na listagem.

### Cenario 4: Inativar um cliente

1. Localize o cliente e clique em **Alterar**.
2. Na aba **Cadastro...**, preencha a data em **Inativacao**.
3. Clique em **Confirmar**.

> Atencao: nao e possivel inativar um cliente que possua titulos a receber em aberto. O sistema avisa caso isso ocorra.

### Cenario 5: Imprimir uma listagem de clientes

1. Va para a aba **Consulta** e monte os filtros desejados.
2. Clique em **Pesquisar**.
3. Na aba **Listagem**, clique em **Imprimir**.

---

## Regras importantes

- **Codigo do Cliente:** o codigo e obrigatorio e e limitado a 9 digitos numericos.
- **Razao Social e Nome Fantasia:** ambos sao obrigatorios.
- **Tipo de Estabelecimento e Ramo de Atividade:** ambos sao obrigatorios. O Tipo de Pessoa (Fisica/Juridica) precisa ser compativel com o Ramo de Atividade; caso contrario o sistema bloqueia a gravacao.
- **CPF/CNPJ valido:** o sistema valida o digito verificador. Se ja existir o mesmo CPF/CNPJ cadastrado para outro cliente, o sistema avisa e mostra o nome do cliente ja existente.
- **Endereco:** e obrigatorio cadastrar pelo menos um endereco. Quando o cliente possui endereco no exterior, basta preencher o campo "Endereco do Exterior". Para enderecos no Brasil, sao obrigatorios:
  - Endereco do tipo **Normal** com complemento preenchido.
  - Endereco do tipo **Entrega** marcado como Padrao.
  - Endereco do tipo **Cobranca** marcado como Padrao.
  - **Apenas um endereco padrao** por tipo.
- **Plano de Pagamento, Tipo do Cliente e Curva ABC:** todos sao obrigatorios.
- **Plano de pagamento x Regiao:** o plano de pagamento precisa ser compativel com a regiao do cliente.
- **Indicador de Inscricao Estadual:** precisa estar coerente com o Ramo de Atividade. O sistema sugere o valor correto (1 - Contribuinte ICMS, 2 - Isento ou 9 - Nao Contribuinte) conforme o ramo informado.
- **Limite de Credito:** nao pode ser negativo.
- **Conta Bancaria:** ao incluir, sao obrigatorios Banco, Agencia, Numero da Conta e Digito Verificador. Nao e permitido cadastrar a mesma conta duas vezes.
- **Representante:** nao e permitido incluir o mesmo representante duas vezes; nao e permitido incluir representantes com mesma "regra de fornecedor" ou mesma "regra de classe". A regiao do representante precisa ser compativel com a regiao do cliente.
- **Socios:** o somatorio do percentual de participacao nao pode ultrapassar 100%. CPF/CNPJ duplicado na lista de socios nao e permitido.
- **Bloqueios:** nao e permitido aplicar o mesmo motivo de bloqueio duas vezes para o mesmo cliente. Cada inclusao ou exclusao de motivo gera automaticamente um registro no historico de ocorrencias do cliente.
- **Alvaras:** numero do alvara nao pode se repetir; data e numero sao obrigatorios.
- **Telefones:** ao cadastrar contato, e obrigatorio informar telefone ou celular. O sistema valida o formato (mascara configurada nas opcoes do sistema).
- **Conta Contabil:** ao incluir conta contabil, sao obrigatorios Plano Contabil, Rede e Grupo Contabil. Nao e possivel excluir uma conta contabil que ja tenha lancamentos efetuados.
- **Mensagem da Receita Federal:** so e possivel consultar quando o CNPJ informado estiver valido.
- **Datas de cadastro:** a data de cadastro nao pode ser maior que a data atual.
- **Inativacao com pendencias:** nao e possivel inativar cliente com titulos a receber em aberto.
- **Exclusao com vinculos:** nao e possivel excluir um cliente que possua pedidos de venda ou notas fiscais emitidas.
- **Filtros de datas:** na aba de consulta, a data inicial nao pode ser maior que a final, e o valor final do filtro de Dias de Atraso / Dias sem Compra nao pode ser inferior ao valor inicial.

---

## Tipos / Classificacoes

**Pessoa:**

| Tipo | Descricao |
|---|---|
| **Juridica** | Empresa (CNPJ). |
| **Fisica** | Pessoa fisica (CPF). |

**Tipo de Endereco:**

| Tipo | Descricao |
|---|---|
| **Normal** | Endereco principal do cliente. |
| **Entrega** | Endereco para onde a mercadoria e entregue. |
| **Cobranca** | Endereco para onde o boleto / cobranca e enviado. |
| **Todos** | Aplica todas as marcacoes acima ao mesmo endereco. |

**Indicador de Inscricao Estadual** (na aba ...Cadastro...):

| Tipo | Descricao |
|---|---|
| **1 - Contribuinte ICMS** | Cliente com inscricao estadual ativa. |
| **2 - Contribuinte Isento de IE** | Possui o cadastro mas e isento. |
| **9 - Nao Contribuinte** | Cliente final, sem inscricao estadual. |

**Status do Cliente** (cor na Listagem):

| Status | Descricao |
|---|---|
| **Ativo** | Cliente em uso (cor preta). |
| **Inativo** | Cliente desativado (cor cinza). |
| **Bloqueado** | Cliente com motivo de bloqueio aplicado (cor vermelha). |

---

## Botoes

**Botoes da barra superior (acima das abas):**

| Botao | O que faz |
|---|---|
| **Incluir** | Inicia o cadastro de um novo cliente. |
| **Confirmar** | Grava no sistema os dados informados. |
| **Cancelar** | Descarta a operacao em andamento. |
| **Alterar** | Habilita os campos para alterar o cliente atual. |
| **Excluir** | Exclui o cliente atual (somente se nao houver vinculos). |
| **Atualizar** | Atualiza a tela com os dados mais recentes do banco. |
| **Sair** | Fecha a tela. |

---

## Perguntas frequentes

**Posso usar o mesmo cliente em todos os modulos do Director?**
Sim. O cadastro e unico no sistema; basta acessa-lo a partir do modulo onde esta trabalhando. Algumas operacoes especificas (ex.: "NF Entrada", "Equipamentos") podem nao estar disponiveis em todos os modulos - quando isso acontece o sistema avisa "Rotina nao disponivel para este modulo".

**Como bloquear um cliente temporariamente?**
Pela aba "...Cadastro...", aplicando um Motivo de Bloqueio. O cliente passa a aparecer em vermelho na listagem. Para liberar, basta excluir o motivo na mesma aba.

**O que acontece se eu marcar Inativacao com data?**
O cliente fica indisponivel para novas operacoes de venda. Se houver titulos a receber em aberto, o sistema nao deixa inativar.

**Como sei quais sao os enderecos obrigatorios?**
Para enderecos no Brasil, sao tres tipos com endereco padrao: Normal, Entrega e Cobranca. Se algum estiver faltando, o sistema avisa qual antes de salvar.

**O sistema preenche automaticamente o endereco apos consultar a Receita Federal?**
Ao usar o botao de consulta CNPJ, o sistema busca os dados na Receita Federal e oferece o preenchimento automatico de razao social e endereco.

**Quantos representantes podem atender o mesmo cliente?**
Pode haver mais de um, desde que tenham regras (de fornecedor e de classe) diferentes entre si.

**Como verificar o historico de bloqueios e desbloqueios?**
Na listagem, com o cliente selecionado, clique no botao **Hist. Ocorrencia**. O sistema registra automaticamente cada inclusao e exclusao de motivo de bloqueio.

**Posso cadastrar varias contas bancarias para o mesmo cliente?**
Sim, na aba Contas. Cada conta tera seu proprio status (Liberado/Bloqueado).

---

## Telas relacionadas

- [[Entidade Endereco]] - cadastro de logradouros (CEP).
- [[Entidade Banco]] e [[Entidade Agencia]] - bases das contas bancarias.
- [[Entidade Plano de Pagamento]] - condicao de pagamento padrao.
- [[Entidade Representante]] e [[Entidade Preposto]] - representantes e prepostos.
- [[Entidade Plano de Contas Contabil]] - plano e grupos contabeis.
- [[Entidade Pedido de Venda]] - acessivel pelo botao "Pedidos" na listagem.
- [[Entidade Nota Fiscal de Saida]] - acessivel pelo botao "NF Saida".
- [[Entidade Titulo a Receber]] - acessivel pelo botao "Financeiro".

---

*Para duvidas, consulte o administrador do sistema ou o suporte tecnico.*

[[DOC Usuario Home|Voltar ao indice]]
