# PERSONA — Quem usa o Director.Studio

> Persona composta única. Não é marketing — é **âncora operacional** para o time inteiro. Designer, smith, curator e ui-tester lêem isto antes de qualquer decisão de visual, fluxo ou aceitação. Quando faltar critério, perguntar: *"isto serve essa persona?"*

## O Time Director

> Atacadistas e varejistas brasileiros de médio/grande porte. Pense em **Bahamas Supermercados**, **Imperial**, **Esquinão**, **Verona** — redes regionais com 30 a 200 lojas, 3.000 a 15.000 funcionários, faturamento na casa dos bilhões. O Director é o ERP que mantém esses negócios rodando 24/7.

O "Time Director" não é uma pessoa — é uma **operação inteira**. Da diretoria executiva ao repositor de gôndola. Mas eles compartilham características marcantes que definem como o sistema precisa ser. Esta persona descreve essa composição como uma identidade única.

## Onde estão fisicamente

- **Escritório central** — TI, financeiro, controladoria, RH, compras, fiscal, marketing. Monitor 1366×768 ainda comum, Windows 10/11, Chrome ou Edge. Sentados o dia todo.
- **Centro de distribuição / estoque** — logística, recebimento, expedição, inventário. Tablet rugged ou notebook num carrinho. Ruído, frio, pressa, mãos com luva.
- **Frente de loja** — caixa, fiscal de loja, gerente de operação, repositor, açougueiro, padeiro. Terminal antigo, leitor de código de barras, sempre em pé, pressa permanente.
- **Trânsito** — comprador visitando fornecedor, supervisor visitando lojas. Mobile pessoal (Android entry-level a iPhone), conexão variável (4G ruim em depósito, WiFi de loja inconsistente).

Uma única feature do Director.Studio pode ser usada por todos esses contextos no mesmo dia.

## Faixa etária e familiaridade

- **18-65 anos**, com pico em 30-50.
- **Familiaridade técnica**: do "uso WhatsApp e Instagram" (varejo, estoque) ao "domino Excel avançado e SQL" (TI, controladoria). **A maioria está no meio**: digita rápido em tabelas, conhece atalhos óbvios (Ctrl+C, F5), mas não sabe explicar como troca tema do navegador.
- **Treinamento formal**: praticamente zero. Aprenderam o ERP **na coxa**, vendo o colega, com manuais de PDF antigos, ou no suporte por telefone.
- **Memória de uso**: o sistema é uma **ferramenta de trabalho diário há anos** — pessoas têm muscle memory pra teclas, sequências de menu, atalhos. Mudança radical sem aviso = revolta.

## Quando usam

- **Horário comercial estendido**: 06:00 às 23:00 alguma loja está aberta. Centro de distribuição roda em turnos 24h em datas de pico (volta às aulas, Black Friday, Natal). RH/financeiro são 08:00-18:00.
- **Picos de stress**: fechamento mensal (financeiro), inventário (logística), Black Friday (loja inteira), folha de pagamento (RH), entrega de SPED (fiscal). Nessas datas **não pode falhar nem ficar lento**.
- **Multi-tarefa permanente**: a comprador-líder está negociando no telefone enquanto preenche pedido no Director enquanto recebe WhatsApp do gerente da loja perguntando estoque.

## O que carregam pra cabeça

- **Vocabulário do varejo** próprio: SKU, EAN, GTIN, NF-e, NFC-e, SPED, EFD, CFOP, CST, ICMS-ST, MVA, ruptura, giro, cobertura, breakage, encalhe, lastro, picking, cross-docking, sortimento.
- **Cultura PT-BR** real: datas DD/MM/AAAA, valores R$ 1.234,56 (vírgula decimal, ponto milhar), CPF/CNPJ com máscara, telefone (XX) XXXXX-XXXX. **Inglês na UI é estrangeirice** — usam, mas torcem o nariz.
- **Pressa real**: cada clique a mais é 10 mil cliques ao final do mês. Cada segundo de espera é fila atrás do caixa, fornecedor esperando, geladeira aberta perdendo frio.
- **Tolerância zero a erro fatal**: se eles perdem dados, não tem volta — pedido errado vira frete a mais, lançamento errado vira multa SPED, baixa errada de estoque vira ruptura ou sobra inventário.

## Como interagem com o sistema

- **Velocidade > Beleza, mas Clareza > Velocidade**. Eles preferem feio e rápido a bonito e lento. E preferem **claro e claro-o-quê-clicar** a tudo.
- **Tab + Enter** é o teclado deles. Mouse só pra coisas que não dá pra tabular. Forms são preenchidos com **uma mão no teclado, outra segurando o telefone ou folha de papel**.
- **Atalhos sagrados**: F2 editar, F4 buscar, ESC voltar, Enter confirmar. Quebrar isso = revolta.
- **Volume de dados**: telas de listagem com **500 a 50.000 linhas** são rotina. Filtro, ordenação, exportação pra Excel são **vitais**, não nice-to-have.
- **Print/PDF/Excel é cultura**: tudo importante acaba em papel ou planilha. Toda tela de listagem precisa exportar.
- **Erro precisa ser específico**: "Algo deu errado" é inaceitável. Eles precisam saber **qual campo, por quê, o que fazer**.

## Devices e ambientes reais

| Contexto | Device típico | Resolução | Particularidade |
|---|---|---|---|
| Escritório | Desktop antigo + monitor 1366×768 ou 1920×1080 | 14"-24" | Chrome/Edge, mouse e teclado de US$ 30, sem dual-monitor |
| TI / controladoria | Notebook + monitor extra | 24"+ dual | Power user, várias abas, Excel sempre aberto |
| CD / estoque | Tablet rugged ou notebook em carrinho | 10"-15" | Tela suja, dedos com luva às vezes, WiFi instável, pode molhar |
| Frente de loja | Terminal POS dedicado + tela pequena | 12"-15" | Touch ocasional, sempre em pé, ambiente barulhento |
| Mobile | Smartphone pessoal Android entry-level a iPhone meio | 5.5"-6.7" | Conexão 4G fraca, bateria contada, dedos grandes/cansados |

Ou seja: **mobile-first é vital** (CD, loja, trânsito), mas desktop denso continua sendo o pão-com-manteiga (escritório). O sistema não pode ser **só** uma das duas coisas.

## O que essa persona NÃO é

- **Não é tech-native millennial de SaaS B2B SF**. Não dão valor a animações sutis se isso atrasa o clique.
- **Não é o usuário do app de banco bonito**. Funcionalidade > forma quando precisa escolher (mas ideal: ambas).
- **Não tem paciência pra "carregando" sem fim**. > 2s sem feedback visível = "travou".
- **Não fala inglês fluente**. UI em inglês causa dúvida; placeholder "Search..." é estrangeiro, "Buscar..." é casa.
- **Não usa só uma tela**. Telas grandes (40 colunas, 200 linhas) são realidade diária — não pode quebrar tudo em modal.
- **Não está sozinho**. Está cercado de gente, telefone, papel, conversas paralelas. A UI precisa funcionar com **atenção dividida**.

## O que ela ESPERA do Director.Studio

Quando o Time Director abre o Studio e usa pela primeira vez, espera (consciente ou inconscientemente):

1. **Reconhecimento** — palavras, ícones, fluxos parecidos com o que ele já fazia no Director antigo, mas **melhorados**. Não estranho.
2. **Velocidade percebida** — clique resolve, lista carrega, busca filtra. **Sem espera estranha**.
3. **Não-erro** — campos bem-rotulados, validação clara, mensagem de erro útil. Erro fatal **nunca**.
4. **Atalhos** — Tab/Enter funciona, F-keys honradas, ESC volta.
5. **Densidade quando precisa** — tela operacional cabe muita informação sem virar parede de texto.
6. **Respiro quando faz sentido** — formulários de cadastro não amontoam.
7. **Brasil real** — PT-BR, R$, datas BR, CNPJ com máscara, telefone com máscara.
8. **Mobile que funciona** — quando ele abre no celular do CD, **funciona de verdade**, não é "site desktop quebrado".
9. **Imprimir e exportar** — qualquer tela importante vira PDF/Excel.
10. **Confiável** — não trava, não perde dado, não some.

## O que ela percebe como "isso é melhor"

Sinais que fariam o Time Director pensar **"finalmente"**:

- Tela carrega **antes** dele perceber que clicou.
- Busca é **instantânea** enquanto digita, com resultados ordenados por relevância.
- O foco do teclado é **óbvio** — ele sabe onde vai cair o próximo Tab.
- A tabela densa **mantém legibilidade** com fontes claras, alinhamento numérico à direita, zebra discreta.
- O dark mode existe e **respeita** o ambiente (CD escuro, monitor antigo).
- O mobile **não é versão desktop com scroll horizontal** — é uma forma própria, coerente, que serve as mesmas tarefas.
- Mensagem de erro fala em **PT-BR claro**: "CNPJ inválido — verifique os 14 dígitos" ao invés de "Validation error 422".
- Atalho `F2` edita a linha selecionada, `Ctrl+S` salva, `ESC` cancela. **Sem treinamento**.
- Confirmação de ação destrutiva existe, mas é **enxuta** — não é "Você tem certeza que tem certeza?".
- Exportar pra Excel **funciona de verdade** — abre no Excel BR, com vírgula decimal, sem aspas estranhas.

## O que ela percebe como "tá estranho"

Sinais de que o Studio falhou em servir essa persona (alguns são anti-patterns de [[MISSION]]):

- 🚩 Botão grande azul "Submit" — onde já se viu? **"Salvar"**, **"Confirmar"**, **"Enviar"**.
- 🚩 Espaçamento "respiroso" demais em telas operacionais — tabela com 8 linhas visíveis num monitor 1080p é absurdo. Eles precisam ver 30+.
- 🚩 Modal cobrindo tela inteira pra editar 2 campos — ele queria editar inline.
- 🚩 Animação de entrada de 600ms — atrasa o trabalho.
- 🚩 Loading spinner sem texto — ele não sabe se travou.
- 🚩 Ícone sem rótulo em ação destrutiva — ambíguo demais.
- 🚩 Toast que some em 3s com info importante — ele não viu, já fechou.
- 🚩 Cor única pra "ativo" e "inativo" diferindo só por intensidade — daltônico não distingue.
- 🚩 Date picker calendário grande pra digitar uma data — ele queria digitar `15/05` e dar Tab.
- 🚩 Confirmação extra ("você tem certeza?") em ação claramente reversível — paternalismo.
- 🚩 UI em inglês — "Filters", "Settings", "Cancel". Aqui é Brasil.

## Como o time aplica esta PERSONA

| Agente | Aplicação |
|---|---|
| `designer` | Cada componente do `ui-system/` resolve **uma necessidade real desta persona**. Densidade configurável, atalhos no protocolo, máscaras BR, mobile-first verdadeiro. Animações **funcionais** (≤ 250ms), nunca decorativas. |
| `smith` | PT-BR sempre na UI. Máscaras BR. Tab order honrado. Atalhos canônicos do varejo (F2, F4, Esc, Enter, Ctrl+S quando aplicável). Mensagens de erro específicas. Exportação Excel onde fizer sentido. |
| `ui-tester` | Inclui no vibe check: vocabulário PT-BR, tab order, atalhos, densidade adequada, mobile real em 375px, mensagens de erro úteis. |
| `curator` | Não aceita feature com red flag da PERSONA. Pergunta: *"se eu sentasse com o comprador da Bahamas e mostrasse, ele acharia melhor que o antigo?"* |

## Esta persona é viva

Conforme o time observar comportamentos reais (em smoke tests contra ambientes reais, conversas com PO sobre clientes específicos), atualizar este documento. Persona **vinculante mas evolutiva**.
