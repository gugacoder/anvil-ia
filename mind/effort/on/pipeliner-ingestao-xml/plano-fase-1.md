---
title: "Plano Fase 1 — provar conceito sem AppBuilder"
aliases: [plano-fase-1-pipeliner-xml]
tags: [effort, plano, pipeliner, fase-1]
created: 2026-05-14
updated: 2026-05-14
---

# Plano Fase 1 — Provar conceito (sem AppBuilder)

Objetivo: cadastrar um pipeline diretamente no DB destino, deixar o serviço Windows do Pipeliner rodar `sp_xml_varrer` a cada 5 minutos, e provar que o ciclo (varrer pasta → processar XML → mover arquivo → logar) funciona end-to-end. Sem isso, Fase 2 (AppBuilder + pacote de instalação) não começa.

## Por que sem AppBuilder

O AppBuilder não participa do runtime do Pipeliner — é apenas UI de cadastro + empacotamento. Em runtime, o serviço Windows do Pipeliner lê `pipeliner.TBpipeline`/`TBstage` do DB destino diretamente. Pra provar Fase 1, podemos popular essas tabelas sem passar pela UI do AppBuilder.

Princípio "não macular base do time dev" continua válido — mas aplica-se ao **DB origem do AppBuilder** (catálogo oficial de pipelines mantido pelo time dev). **Não se aplica ao DB destino**, que em produção também recebe escrita via `savePipelineNewDB`. Estamos escrevendo nas mesmas tabelas que o deploy oficial escreveria.

## Tese confirmada (ver [[hipoteses]])

- Pipeliner aceita action única tipo `Query` rodando proc sem param e termina (sem precisar step HTTP, sem usar conversor XML→JSON). H1, H7.
- Schedule via `TBstage.DFtempo_execucao` em segundos — `300` = 5min trivial.
- Cadastro inicial possível via INSERT direto **ou** `EXEC sp_persistirPipeliner @parametro=<xml>` (proc oficial, mesma usada pelo AppBuilder).
- DDL idempotente das tabelas pronto em `PipelinerRepository.cs:110-186`.

## Arquitetura

```
DB destino (a definir com analista)
├── schema pipeliner
│   ├── TBpipeline (1 linha — "ingestao-<tipo>-xml")
│   └── TBstage (1 linha — DFtempo_execucao=300, DFacoes=[{type:Query, value:"exec sp_xml_varrer"}])
├── sp_xml_varrer (varre pasta da raiz, chama sp_xml_processar pra cada arquivo)
├── sp_xml_processar (parse, valida, ingere, move arquivo)
└── TBingestao_xml_log

Pasta \\share\xmls\<tipo>\
├──                       ← arquivos pendentes
├── importado/             ← sucesso
└── falha/                 ← erro

Serviço Windows do Pipeliner ─► aponta pro DB destino
```

## Passos

### 1. Definir com analista o ambiente de teste (bloqueador)

Pergunta ao analista — grupo 1 em [[pipeliner-ingestao-xml]]:
- Qual DB de teste usar
- Qual pasta de rede usar (com leitura E escrita pelo service account)
- Onde Pipeliner desse ambiente loga execução
- Confirmação de que esse Pipeliner está rodando contra o DB de teste

### 2. Inventário de técnica de leitura/escrita de arquivo (H2, H3, H6)

Pergunta ao analista — grupo 2 em [[pipeliner-ingestao-xml]]. Em paralelo: busca em `\\172.27.3.10\svn\trunk` por padrões (`OPENROWSET`, `xp_dirtree`, `xp_cmdshell`, CLR). Escolher técnica alinhada ao que o time já usa.

### 3. Definir convenções (chave TBopcoes, nomenclatura, schema do log)

Pergunta ao analista — grupo 3.

### 4. Prototipar artefatos SQL

Tudo em `sources/procedures/pipeliner-ingestao-xml/`:
- DDL `TBingestao_xml_log`
- `INSERT TBopcoes` com chave raiz de XMLs
- `sp_xml_varrer` (sem param)
- `sp_xml_processar` (recebe path)

Atualizar [[manifesto-scriptagem]] a cada artefato.

### 5. Cadastrar pipeline no DB destino

Caminho recomendado: `EXEC pipeliner.sp_persistirPipeliner @parametro=<xml>` com payload mínimo:

```xml
<Parametros>
  <Parametro>
    <idPipeline />
    <nome>ingestao-<tipo>-xml</nome>
    <urlBase></urlBase>
    <statusPipeliner>1</statusPipeliner>
    <urlBaseHomolocacao></urlBaseHomolocacao>
    <variaveis>[]</variaveis>
    <stages>
      <stage>
        <idStage />
        <nomeStage>varrer-pasta</nomeStage>
        <statusStage>1</statusStage>
        <tempoExecucao>300</tempoExecucao>
        <ambienteStage>HOMOLOGACAO</ambienteStage>
        <acoes>[{"key":"varrer","type":"Query","value":"exec sp_xml_varrer","interval":0}]</acoes>
      </stage>
    </stages>
  </Parametro>
</Parametros>
```

Plano B: INSERT direto em `TBpipeline`/`TBstage`.

### 6. Garantir serviço Windows do Pipeliner está apontando pro DB destino

Confirmar com analista. Se necessário, restart. Se serviço alheio compartilha o ambiente, considerar rodar instância local do Pipeliner contra DB de teste (source disponível em `sources/engenharia--fabrica--dotnet--pipeliner/`).

### 7. Observar 3 execuções (~15 minutos)

- Tail de `TBingestao_xml_log`
- Inspecionar pasta — arquivos movidos pra `importado/` ou `falha/`
- Inspecionar log do serviço Pipeliner — confirmar que a stage disparou

### 8. Gate pra Fase 2

Pipeline rodando, idempotência funcionando, log limpo, 3+ ciclos sem erro → declara Fase 1 OK. Abre `plano-fase-2.md` (cadastrar mesmo pipeline pela UI do AppBuilder + empacotar via `savePipelineNewDB` + validar pacote no cliente).

## Riscos / pontos de atenção

- **DB compartilhado** — se o DB de teste é usado por outras frentes, qualquer registro polui. Idealmente DB dedicado, ou teardown rigoroso (DELETE FROM `TBpipeline`/`TBstage` ao final de cada iteração).
- **Permissão de escrita** do service account na pasta (H6) — se não houver, idempotência por filesystem desmorona, plano B é tabela de controle.
- **Serviço Windows do Pipeliner** — se está sendo compartilhado, restart pode afetar outras frentes. Considerar instância local.
- **Schema `pipeliner.*`** pode já existir no DB de teste (de outras frentes ou histórico) — DDL idempotente do `savePipelineNewDB` lida com isso, mas vale conferir antes.

## Ferramentas a construir (decidido 2026-05-14)

- **MCP `processa-sql`** (Node.js stdio) — primitivo de execução SQL com helpers de alto nível pra `sp_persistirPipeliner`. Credenciais via `.env`.
- **Skill `/director-importer`** (SQL-only nesta fase) — orquestra ciclo: estudar base → prototipar procs → cadastrar pipeline → observar log → iterar.
- Subagent (`Explore`, `Plan`) já disponível — sem custom necessário.

`claude-in-chrome` e a parte de "abrir UI/invocar manual" só entram na Fase 2.
