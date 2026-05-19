---
title: "TBaplicacao — registro cross-tenant de apps"
aliases: [tbaplicacao-app-registry, tbaplicacao-registry, TBaplicacao, app-registry]
tags: [schema, processa, dbdirector, metamodelo, cross-tenant, proxy, inter-app]
sources:
  - "calendar/notes/2026-05-17.md"
created: 2026-05-19
updated: 2026-05-19
---

# TBaplicacao — registro cross-tenant de apps

`acesso.TBaplicacao` no [[dbdirector]] funciona como **registro central de endpoints de serviços** do ecossistema Processa. Cada linha mapeia um `DFchave` (identificador estável cross-tenant) para um endereço (`DFendereco`), domínio (`DFdominio`), porta e flags. É consumida tanto pelo menu home (projeção de apps disponíveis) quanto pelo proxy multi-app (resolução de inter-app calls). Escavação F113 do [[director-studio]] fez survey empírico de 97 bases `DBdirector_*`, revelando 23 appKeys distintos com taxonomia core/opt-in/one-off.

## Key Points

- **23 appKeys distintos cross-tenant**. Núcleo estável (≥87 bases): `portal-aws, portal-director, edoc, pipeliner, cotacao-integrador, processaadm, cotacao, processa-sped, integrador-aws`. Opt-in: `wms (56), agent (43), gerenciamento-de-integracoes (35), checkin (34)`. Cauda one-off: `processa (9), mercadologic, aplicacao-teste, qualidade, rebaixa-de-preco, folha-de-pagamento, concentrador, retaguarda-varejo`, etc.
- **`DFchave` é o discriminador estável** — `DFid_aplicacao` varia per-tenant (cotacao=4/5/6/7/8/11 dependendo da base). Todo lookup deve usar `DFchave`, nunca `DFid`.
- **`DFhabilitado=0` NÃO bloqueia** chamadas via proxy multi-app — só esconde do menu home (`acesso.obter_aplicacoes_pagina_home` filtra `WHERE DFhabilitado=1`).
- **5 caminhos de resolução**: (1) `PortalAwsClient` dedicado para `portal-aws` (identity do usuário corrente, JWT inter-tenant); (2) `AppClientService.ExecProc/GetProc` genérico (switch auth por chave, identity de serviço fixa); (3) `CotacaoIntegradorClient` Basic estática para `cotacao-integrador`; (4) `EdocController` para `edoc`; (5) `acesso.obter_aplicacoes_pagina_home` projeção para menu.
- **Auth-scheme switching** via `AppClientService.BuildHeader`: `case "cotacao"` → `Basic base64("processa|{DFdominio}:99")`; `default` → `Bearer <JWT>` com `DirectorIdentity` fixa (`Id=1, Name="processa", CodEmpresa=0`) — **não propaga identity do usuário corrente**. Ver [[connections/tbaplicacao-auth-scheme-switching]].

## Details

A escavação F113 executou probe SQL contra todas as 97 bases `DBdirector_*` em `172.27.0.121\SQL2k19` (2026-05-17). Das 97, 89 tinham `acesso.TBaplicacao` populada (7 sem a tabela, 1 sem login), totalizando 970 linhas. O universo de 23 appKeys foi extraído por agregação de `DFchave` cross-tenant, revelando uma taxonomia natural: **core** (presente em quase toda base — portal-aws, portal-director, edoc, pipeliner, etc.), **opt-in** (habilitado conforme necessidade do cliente — wms, agent, checkin, gerenciamento-de-integracoes), e **one-off** (específico de instalação — mercadologic, aplicacao-teste, folha-de-pagamento).

A descoberta mais impactante é o modelo de auth-scheme switching em `AppClientService.BuildHeader` (em `PortalDirector.Services/AppClientService.cs:43-56`). Para inter-app calls via proxy, o código decide o header de autenticação baseado no `DFchave` da app destino. O caso `"cotacao"` usa Basic com credenciais fixas (`processa|{dominio}:99` — a senha seed do admin PROCESSA, ver [[validar-cript]]). Todos os outros casos usam Bearer JWT com uma `DirectorIdentity` fixa de serviço (`Id=1, Name="processa", CodEmpresa=0, NomeEmpresa="Processa"`) cujo `Domain` é preenchido pelo `DFdominio` da `TBaplicacao`. Criticamente, **nenhum caminho propaga a identity do usuário que iniciou a chamada** — toda comunicação inter-app é feita em nome de um service account fixo.

A URL final é composta como `{DFendereco}/api/proc/{proc}` — literal, sem normalização de trailing slash (apps como `checkin/` preservam o sufixo no path). O header HTTP `Domain: {DFdominio}` é adicionado em **todas** as chamadas, independente do auth-scheme.

Para a Imperial (base de referência do Studio): cotação existe (`DFid=5, DFendereco='http://127.0.0.1:5000', DFhabilitado=0`) mas em endereço de dev — produção real usaria `http://52.67.203.133:5000` com `DFdominio=<tenant-slug>`. A Imperial **não tem appKey `agent`**, o que impacta F093 (cutover `configuracoes_email` via `agent.sp_*` quebraria silenciosamente sem mitigação).

Data-quality bug observado cross-tenant: `processa-sped` tem `DFporta=5003` mas `DFendereco='http://localhost:5005'` em todos os tenants — seed inconsistente. Sem efeito em runtime porque clients ignoram `DFporta` (asserção R17 do contrato).

## Contrato legacy

O contrato completo com schema de 13 colunas, constraints, 5 caminhos de resolução documentados, tabela do universo 23 appKeys, snapshot Imperial, e **24 asserções R1-R24** mecanicamente verificáveis foi publicado em [[legacy-contracts/tbaplicacao-registry]]. O [[director-studio]] (F110 proxy multi-app) é obrigado a replicar: lookup por `DFchave` + switch auth-scheme + header `Domain` + URL literal + ignorar `DFhabilitado`.

## Related Concepts

- [[acesso-metamodel]] — `TBaplicacao` é uma das tabelas-núcleo do schema `acesso.*`
- [[processa-auth-paths]] — o auth-scheme switching no proxy multi-app complementa os 5 caminhos de auth de endpoint
- [[processa-aws-ports]] — mapping de portas do host AWS que aparece como `DFendereco` em múltiplos appKeys
- [[director-studio]] — F110 (proxy multi-app) e F113 (gate enabler) dependem deste registro
- [[validar-cript]] — senha seed `99` usada em Basic auth para cotacao
- [[director-web]] — consumidor principal via `AppClientService` e `PortalAwsClient`

## Sources

- [[calendar/notes/2026-05-17.md]] — probe SQL cross-tenant de 97 bases, 23 appKeys, 5 caminhos de resolução, auth-scheme switching via `AppClientService.BuildHeader`, Imperial sem appKey `agent`, data-quality bug `processa-sped`, 24 asserções R1-R24
