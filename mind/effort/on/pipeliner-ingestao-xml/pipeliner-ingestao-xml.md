---
title: "Pipeliner — ingestão de XMLs via procedure"
aliases: [pipeliner-ingestao-xml]
tags: [effort, pipeliner, director, sqlserver, ingestao, xml]
status: on
started: 2026-05-13
---

# Pipeliner — ingestão de XMLs via procedure

Estudar o Pipeliner para entender como cadastrar pipelines e validar a melhor forma de ingerir XMLs no Director. Hipótese de trabalho (do usuário, ainda a confirmar com o analista):

> Duas procedures registradas no Pipeliner, executando a cada 10 minutos, varrem uma pasta de rede configurada via `TBopcoes` e importam os XMLs segundo regras que o analista vai detalhar — sem usar o conversor XML→JSON do Pipeliner ([[xml-to-json-node]]).

Aqui é o estágio de **estudo + prototipagem + versão funcional para testes da equipe**. Não temos acesso ao sistema de scriptagem do Director ERP (cadastro real de procedures, tabelas e opções), então **todo artefato precisa ser rastreado em [[manifesto-scriptagem]]** — o analista replica no sistema real depois.

## Refinamento 2026-05-14 — dois sistemas, duas fases

A frente envolve **dois sistemas**:

1. **Director Portal** (AppBuilder gerado) no servidor de teste — onde cadastramos a entrada no Pipeliner (INSERT em `pipeliner.TBpipeline` + `pipeliner.TBstage`) e validamos o fluxo end-to-end com XML real.
2. **AppBuilder** — onde o mesmo procedimento é salvo numa base interna Processa, que gera o **pacote de instalação** para o cliente.

**Fase 1** (atual): provar via Sistema 1 que o conceito funciona — pipeline rodando `sp_xml_varrer` a cada 5 minutos. Schedule confirmado: `TBstage.DFtempo_execucao = 300` (segundos).

**Fase 2** (após validação): replicar o procedimento no AppBuilder e provar que o pacote de instalação gerado leva tudo (procedures + entrada de Pipeliner + chave `TBopcoes`) corretamente.

### Atualização 2026-05-14 (após investigação de UI)

O papel dos sistemas foi **redefinido** — o que parecia ser dois sistemas paralelos é na verdade um fluxo: **AppBuilder cadastra → Portal Director executa**.

- **AppBuilder** (`sources/engenharia--fabrica--dotnet--processa.appbuilder/`): tem rota `/pipeliner` com wizard (pipeline → stages → actions). É o **único** ponto oficial de cadastro. Endpoint `POST /api/pipeliner/savePipelineNewDB` → procedure `pipeliner.sp_persistirPipeliner` (recebe XML estruturado).
- **Portal Director** (`sources/engenharia--fabrica--dotnet-core--director.web/`): **consome** pipelines via serviço Windows Pipeliner que lê `pipeliner.TBpipeline`/`TBstage` do banco do cliente. Não tem CRUD.
- O sufixo `NewDB` no endpoint sugere que o AppBuilder parametriza o DB destino (H11) — coerente com "gerar pacote de instalação por cliente".

Implicação prática: Fase 1 não é "cadastrar no Portal Director", é **"cadastrar pelo AppBuilder apontando para o DB do servidor de teste"**. O pacote de instalação (Fase 2) pode ser na verdade o mesmo fluxo apontando pra DB do cliente — a separação Fase 1 / Fase 2 pode colapsar dependendo de como `savePipelineNewDB` funciona.

Schedule passa de 10min (rascunho original) para **5min** (decisão do usuário 2026-05-14).

### Validação end-to-end 2026-05-14 — ciclo provado pela UI do AppBuilder

Ambiente de teste validado completo (Área 52, ver [[area-52]]):

- Conexão ao DB `DBx_appb_ti_teste` em `172.27.0.121\SQL2k19` via login SQL `director_web` — OK.
- HTTP nos 3 serviços (Director.Portal:4300, AppBuilder:4305, Director.Web:4600) — 200.
- Login no AppBuilder em `http://172.27.0.52:4305` — feito pelo usuário (`guga`).
- Procedure e tabela de prova criados:
  - `dbo._anvil_log` (id, data, executado_por, mensagem, maquina) — convenção `_` é não-oficial.
  - `dbo.sp_anvil_teste` — INSERT na `_anvil_log` (SUSER_SNAME, HOST_NAME).
- Snapshot inicial: 0 linhas.

**Walkthrough da UI** (rota `/#/pipeliner` — SPA com hash routing; `/pipeliner` direto retorna 401 JSON):

1. Home → card "Pipeliner" → tela "Integração" (lista vazia inicialmente).
2. Botão `+` → form "Cadastro de Integração" (campos: nome, status, urlBase prod, urlBase homolog, variáveis).
3. Após preencher nome, botão "Adicionar estágio" → form "Cadastro de estágio" (nome, tempoExecucao em segundos, ambiente dropdown {Produção, Homologação}, status dropdown {Ativo, Inativo}).
4. Botão "Adicionar Ação" → form "Cadastro de Ações". Default tipo = Request. Dropdown "Tipo de ação" expõe: Request, SOAP, **Query**, Log, Monitoramento de Email, Envio de Email.
5. Trocando pra `Query`, o form colapsa pra mostrar só `Nome`, `Intervalo de execução`, `Procedure/Query` (textarea).
6. Salvar Ação → volta pra Edição de Estágio (lista da ação aparece com Editar/Remover). Salvar Estágio → volta pra Edição da Integração (árvore esquerda mostra `pipeline > stage [HOMO] > QUERY ação`). Salvar Integração → toast verde "Integração persistida em:" e volta pra lista.

Resultado: linhas criadas em `pipeliner.TBpipeline` (id 8273) + `pipeliner.TBstage` (id 8373) — `DFAcoes` contém JSON `[{"key":"disparar-sp-anvil","interval":"0","stopWords":[],"stopAction":false,"type":"Query","value":"exec dbo.sp_anvil_teste"}]`. Cadastro via UI **funciona limpo**.

**Achados importantes** (entram em [[hipoteses]] como H14, H15, H16):

- **UI não tem "Executar agora"**. Menu de contexto (`...`) em cada nível só expõe:
  - Pipeline: "Adicionar estágio"
  - Stage: "Clonar estágio", "Excluir estágio"
  - Ação: "Clonar ação", "Excluir ação"
- **Disparo manual via API** existe (`POST /api/pipeliner/jobs/exec`, `PipelinerController.cs:25-30`) mas o service (`PipelinerService.ExecCommand`) faz proxy via `repository.GetUrl()` → `SELECT DFendereco FROM acesso.TBaplicacao WHERE DFchave='pipeliner'`. Nesta DB `acesso.TBaplicacao` tem **só** a chave `director` (`http://localhost:4310`) — **não há chave `pipeliner`**. Portanto o disparo manual via UI/API está quebrado/não configurado neste ambiente.
- **Execução automática** depende exclusivamente do serviço Windows do Pipeliner apontando pra esta DB. O usuário afirmou que está rodando. Validação por polling (até 8min após cadastro) — `dbo._anvil_log` deve receber inserção do scheduler.

**Implicação pra Fase 1 real**:
- Cadastro pela UI: caminho oficial confirmado, trivial pra um pipeline de varredura de XML.
- Disparo manual: se necessário durante prototipagem, ou (a) cadastrar `pipeliner` em `acesso.TBaplicacao` apontando pra URL do serviço Windows, ou (b) chamar `/api/jobs/exec` direto no serviço Windows (precisa URL/porta dele), ou (c) ajustar `tempoExecucao` baixo (ex: 30s) durante teste pra encurtar ciclo.
- Pra produção, `tempoExecucao=300` está confirmado como suportado.

### Atualização 2026-05-14 (final) — Fase 1 não depende do AppBuilder

Análise mais profunda: o **AppBuilder não participa do runtime do Pipeliner**. AppBuilder é apenas a UI de cadastro + ferramenta de empacotamento. Em runtime, o serviço Windows do Pipeliner lê as tabelas `pipeliner.TBpipeline`/`TBstage` do DB destino e executa as actions — sem consultar o AppBuilder.

Portanto, **Fase 1 pode ser feita sem AppBuilder de teste**. Basta:

1. Schema `pipeliner` + tabelas no DB destino (DDL idempotente está em `PipelinerRepository.cs:110-186` — pode ser copiado literalmente).
2. Procedures `sp_xml_varrer` + `sp_xml_processar` + log no DB destino.
3. 1 linha em `TBpipeline` + 1 linha em `TBstage` (`DFtempo_execucao=300`, action `Query: "exec sp_xml_varrer"`).
4. Serviço Windows do Pipeliner apontando pra esse DB.

Caminhos de cadastro da linha (ambos válidos pra Fase 1, sem violar o princípio "não macular base do AppBuilder" — porque estamos escrevendo no DB **destino**, não no DB origem do AppBuilder):

- **INSERT direto** em `TBpipeline`/`TBstage` (mais simples)
- **`EXEC pipeliner.sp_persistirPipeliner @parametro=<xml>`** (usa a proc oficial, mesmo XML que o AppBuilder usaria internamente — menos "ad-hoc")

O princípio "não cadastrar via INSERT direto" do usuário aplica-se ao **DB origem do AppBuilder** (onde o time mantém o catálogo de pipelines). **Não se aplica ao DB destino**, que em produção também recebe escrita via deploy do `savePipelineNewDB` — exatamente as mesmas tabelas, mesma estrutura.

**Fase 2** (subsequente, após Fase 1 provada): aí sim entra AppBuilder — cadastrar o pipeline na UI oficial, usar `savePipelineNewDB` pra empacotar e validar que o pacote gerado leva tudo (DDL + procs + linha de pipeline + chave `TBopcoes`) coerente com o que prototipamos na Fase 1.

## Objetivo

1. Aprender o modelo do Pipeliner (como pipelines são cadastrados, scheduled, executados — sem parâmetros).
2. Levantar como o time já faz leitura de arquivo de rede em procedures hoje (evitar introduzir técnica nova). Vasculhar `\\172.27.3.10\svn\trunk` por padrões: `OPENROWSET`, `xp_dirtree`, `xp_cmdshell`, `BULK INSERT`, `\\` em strings, CLR, linked server.
3. Prototipar o par de procedures (varredora + processadora) + tabela de log + chave em `TBopcoes`.
4. Entregar pacote replicável (manifesto + scripts em `sources/procedures/`) para o analista aplicar no Director real.

## Escopo

**Dentro:**
- Estudo da plataforma Pipeliner (`sources/engenharia--fabrica--dotnet--pipeliner`).
- Pesquisa em procedures existentes do time.
- Prototipagem de procedures, tabela de log e configuração.
- Manifesto de scriptagem.

**Fora:**
- Cadastro no sistema real (analista executa).
- Modificação do share `\\172.27.3.10\svn` (sem permissão de escrita).
- Definição das regras de negócio do XML — virá do analista.

## Arquitetura proposta (rascunho, a refinar)

```
Pipeliner (scheduler, a cada 10min)
   ↓ executa
sp_xml_varrer  (sem parâmetros)
   ↓ lê pasta raiz cfg em TBopcoes
   ↓ pra cada XML na raiz
sp_xml_processar  (recebe path do XML)
   ↓ parse, valida, ingere
   ↓ registra em TBingestao_xml_log
   ↓ move arquivo → importado/  (sucesso)
   ↓                falha/      (erro)
```

**Layout da pasta configurada em `TBopcoes`:**

```
<raiz>/              ← arquivos a processar (entrada)
<raiz>/importado/    ← processados com sucesso
<raiz>/falha/        ← processados com erro
```

Idempotência pela convenção de filesystem: arquivo só fica na raiz enquanto está "pendente". Sucesso ou falha, ele sai da raiz. `sp_xml_varrer` lista apenas a raiz (não recursivo) — `importado/` e `falha/` não voltam a ser varridos.

Log no estilo `TBintegracao_cobranca_bancaria_log` — duplo papel:
- **vestígio operacional**: cada execução / cada arquivo / cada erro fica registrado.
- **controle**: marcador de idempotência (arquivo já consumido? já tentado? quantas tentativas?).

## Fluxo de trabalho

1. **Aprender Pipeliner** — ler `sources/engenharia--fabrica--dotnet--pipeliner/` focando em: como pipelines são cadastrados, como agendamento funciona, como invocam procedures, se passam parâmetros.
2. **Inventário de técnicas** — busca dirigida no SVN por padrões de leitura de arquivo em procedures. Listar candidatas, ler só as relevantes.
3. **Definir técnica adotada** — escolher a abordagem mais alinhada ao que o time já usa.
4. **Prototipar** — escrever procedures + DDL da tabela de log + INSERT em `TBopcoes`. Tudo em `sources/procedures/<frente>/`.
5. **Manifesto** — manter [[manifesto-scriptagem]] sempre em dia com cada artefato a aplicar no Director real.
6. **Validar com o analista** — perguntas acumuladas em [[hipoteses]] viram conversa com o analista.

## Perguntas pro analista — delegação 2026-05-14

Grupo 1: **infraestrutura de teste (bloqueadores da Fase 1)**

- Qual DB de teste podemos usar pra prototipar Fase 1? Onde o serviço Windows do Pipeliner desse ambiente está rodando, contra qual DB? Podemos ter um DB dedicado (não compartilhado com outras frentes)?
- Existe pasta de rede dedicada pra testes de ingestão? Caminho? Permissão de **leitura** e **escrita** pelo service account do SQL Server desse ambiente?
- Onde o serviço Windows do Pipeliner registra logs de execução? (arquivo, EventLog, tabela própria) — pra acompanhar quando uma stage dispara, sucesso, erro.

Grupo 2: **técnica de leitura/movimentação de arquivo (H2, H3, H6)**

- Quais técnicas de leitura/escrita de arquivo de rede o time **já usa** em procedures do DBdirector? `xp_dirtree`, `OPENROWSET BULK`, `xp_cmdshell`, CLR, linked server, outra? Onde achar exemplos canônicos no SVN `\\172.27.3.10\svn\trunk`?
- Service account do SQL Server tem permissão de **escrita** em pastas de integração hoje? (necessário pra mover arquivos pra `importado/`/`falha/`. Se não, plano B é tabela de controle.)
- Volume/tamanho típico de XML que vamos receber — `OPENROWSET BULK` + tipo `xml` aguenta?

Grupo 3: **convenções e nomenclatura**

- Existe padrão de nomenclatura em `TBopcoes` para chaves de pasta de integração? Como devo nomear a chave da raiz dos XMLs?
- Nomenclatura de procedures de integração — segue padrão? (`sp_xml_varrer` / `sp_xml_processar` são tentativos)
- Tabela de log — `TBingestao_xml_log` no estilo `TBintegracao_cobranca_bancaria_log`. Quer o mesmo modelo de schema? Esse é o template "oficial"?

Grupo 4: **regras de negócio (depois das três grupos acima)**

- Estrutura do XML de entrada (formato, schema esperado).
- Mapeamento pra tabelas-destino do Director.
- Validações (campos obrigatórios, regras de negócio).
- O que fazer com XML inválido — pasta `falha/` + log basta? DLQ separada? Notificação?
- Quem deposita os XMLs na pasta — produtor externo, scheduled task da Processa, outro?

Grupo 5: **Fase 2 — AppBuilder**

- Como funciona o "deploy rápido" do AppBuilder pra base interna de dev/devops? Que credencial usa? Como configurar `appbuilder.TBconfiguracao_usuario` pro meu usuário apontar pra DB de teste?
- Schema `pipeliner.*` em prod vive no DBdirector ou em DB separado? (H8)
- Quando empacotamos pro cliente, o pacote leva DDL completa (procedures, tabelas) + linha do pipeline + chave `TBopcoes`? Ou só parte disso? Algum desses precisa ser scriptado à parte?

## Notas relacionadas

- [[manifesto-scriptagem]] — artefatos a replicar no Director real (vivo, evolui com a frente).
- [[hipoteses]] — hipóteses e perguntas em aberto.
- [[xml-to-json-node]] — convenção atual do Pipeliner pra XML→JSON (o que estamos pensando em **não** usar).
- Daily log: `calendar/notes/2026-05-13.md` — sessão inicial onde a hipótese foi levantada.
