---
title: "Componente Configurações/IntegradorAWS"
aliases: [integrador-aws-component, configuracoes-aws, integradoraws-component, integrador-aws-tabs]
tags: [contract, legacy, page-shell, page-tabs, sync, aws, director-studio, f094]
sources:
  - "calendar/notes/2026-05-17.md"
created: 2026-05-17
updated: 2026-05-17
---

# Contrato: Componente Configurações/IntegradorAWS

A page legada `/configuracoes/integrador-aws` no `PortalDirector.Website` é uma **page-shell `pageTabs` com 3 tabs**, **não 5**. A página em si (`IntegradorAws.jsx`) é uma casca trivial — `<Page>` + `<PageTabs>` (mesmo `PageTabs` consumido por Cotacao em F092/F108) — e delega tudo a três componentes-filho independentes. Cada tab tem origem-de-dados próprio e **só uma das três tabs invoca de fato a bridge AWS documentada em [[portal-aws-bridge]]**. As outras duas conversam com endpoints `/api/...` do próprio Director (mas, no estado atual da fonte, **dois desses endpoints não têm controller no `PortalDirector.Aplicacao` e dependem de mount externo ou estão quebrados** — ver §"Endpoints consumidos por tab" e §"Notas de implementação para o Studio").

A tab **`utilitarios`** é um painel de 4 mini-utilitários: (1) gerar um token de teste a partir de `domínio/usuário/senha` (puramente client-side: `btoa("user|domain:password")`); (2) extrair credenciais de um token (`atob` + split); (3) testar comunicação com o "servidor remoto configurado nas opções" (faz `GET /api/status` esperando um payload XML com elementos `Servico/Titulo/Descricao/Versao`); (4) consultar um pedido por número (faz `GET /api/pedidos/{numero}`). Sem persistência, sem proc, sem `PortalAwsClient`.

A tab **`opcoes`** é um `OptionList` (componente compartilhado, mesmo usado em outros tabs de configuração) que faz `GET /opcoes` (que após `useRequest.sanitize` vira `/api/opcoes`), exibe a lista `{codigo, descricao, documentacao, valor}` em campos editáveis, e salva via `POST /api/opcoes` com body `{ opcao: [{codigo, valor}, ...] }`. Em caso de erro do GET, faz fallback para IndexedDB (`storeKey='app_data', objectKey='app_integrador_aws_configs'`). O legado descreve esses valores genericamente como "opções do serviço integrador" (configurações arbitrárias key/value); o conteúdo concreto da lista vem do banco em runtime e **não está hardcoded no front**.

A tab **`entidades`** (rotulada **"Sincronizar - Entidades"** na UI) é a **única** das três que aciona a bridge AWS: select com 10 entidades hardcoded (`redes, empresas, centros, departamentos, veiculos, feriados, fornecedores, itens, planos, usuarios`) + botão "Enviar" → `GET /api/integradoraws/sincronizar/{entidade}`. Esse endpoint **tem** controller no Director (`IntegradorAwsController.SincronizarEntidade`), executa a proc local `aws_sincronizar_entidade @entidade, null` (sempre `@ids=null` = full-sync) e faz POST do XML resultante para `{IpPortalAws}/api/proc/portal.sincronizar_{entidade}` via `PortalAwsClient`. A semântica completa do payload XML por entidade, idempotência, error envelope `<Resposta>`, e config da bridge (`acesso.TBaplicacao WHERE DFchave='portal-aws'`) estão em [[portal-aws-bridge]] — este contrato **não duplica**, apenas referencia.

## Citações de fonte

- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/routes/Configuracoes/IntegradorAWS/IntegradorAws.jsx:1-38` — shell da page. ACL `'/configuracoes/integrador-aws'`. Constrói `model = [{tabName:'utilitarios'}, {tabName:'opcoes'}, {tabName:'entidades'}]` (3 tabs, **nesta ordem**) e renderiza `<PageTabs tabList={model}>`. Breadcrumbs: `Home > Configurações > Integrador AWS`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/routes/Configuracoes/IntegradorAWS/IntegradorUtilitarios.jsx:1-211` — tab 0. Quatro cards: (a) gerar token (`handleGenerateToken` em `useConfigUtils`, btoa), (b) extrair token (`handleExtractFromToken`, atob), (c) testar comunicação (`get('/api/status')` via `useFetch`, parseia resposta XML com `DOMParser` em `Servico/Titulo/Descricao/Versao`), (d) consultar pedido (`get('/api/pedidos/${numero}')` via `useFetch`, exibe `res.dados[0]` como JSON pretty-print).
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/routes/Configuracoes/IntegradorAWS/IntegradorOpcoes.jsx:1-83` — tab 1. `getAsync('/opcoes')` → `setOptions(dados)` e `indexDbPersist(...)`; `postAsync('/api/opcoes', { opcao: [{codigo, valor}] })` salva. Persistência local IndexedDB `storeKey='app_data', objectKey='app_integrador_aws_configs'`. Renderiza `<OptionList>`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/_components/OptionList.jsx:1-63` — componente genérico. Shape de cada item: `{codigo, descricao, documentacao}` (input value = `state[codigo]`). Botão "Salvar" no rodapé com texto override via prop `buttonTitle`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/routes/Configuracoes/IntegradorAWS/IntegradorEntidades.jsx:1-63` — tab 2. Select com 10 `<option value="...">` hardcoded (ordem UI: Redes, Empresas, Centros, Departamentos, Veículos, Feriados, Fornecedores, Itens, Planos de pagamento, Usuários — labels PT-BR). Botão "Enviar" → `get('/api/integradoraws/sincronizar/${entidade}')` via `useRequest`. `setPageBlur(true)` antes / `setPageBlur()` depois. Toasts via `useNotifications` (`success`/`warning`).
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Website/src/hooks/useConfigUtils.js:1-25` — `handleGenerateToken({user, domain, password})` = `btoa(\`${user}|${domain}:${password}\`)`. `handleExtractFromToken(param)` faz `atob` + `.split('|')` + `.split(':')` e devolve `[\`Domínio: ${dom}\`, \`Usuário: ${user}\`, \`Senha: ${sen}\`]`. **Puramente client-side**, sem chamada de rede, sem assinatura criptográfica — não é JWT.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useRequest.js:5-11, 92-112` — `sanitize(res)` injeta prefixo `/api` quando o path não começa com `/api`. Por isso `getAsync('/opcoes')` em `IntegradorOpcoes` vira request real para `GET /api/opcoes`. `postAsync('/api/opcoes', body)` permanece literal.
- `sources/engenharia--fabrica--javascript--react-tools/src/hooks/useFetch.js:7-14, 27-52` — mesmo padrão `sanitize` (`/api` prefix). `useFetch.get(url, cb, errCb)` usa `fetch` nativo com `signal` de `AbortController` (timeout default 300s). Usado pelo `IntegradorUtilitarios` para `/api/status` e `/api/pedidos/{n}`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Controllers/IntegradorAwsController.cs:1-29` — controller único da bridge tab `entidades`. `[Route("api/integradoraws/")]` + `[HttpGet("sincronizar/{entidade}")]`. Detalhado em [[portal-aws-bridge]]:§"Endpoints externos".
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Controllers/PedidoController.cs:1-22` — **controller real existente** para pedido: `[Route("/api/pedido/")]` (singular, com barra final) + `[HttpGet("{id}")]`. **Tab utilitarios chama `/api/pedidos/{n}`** (plural). Discrepância: ou (i) há reescrita de rota / wildcard alias em deploy real não capturado em `Program.cs`, ou (ii) o GET de pedido na tab utilitarios está **quebrado em produção** desde sempre. > inferido — sem evidência de mount alternativo em `sources/`.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Controllers/OpcoesSelectController.cs:1-21` — arquivo **inteiramente comentado**. Era um controller `/api/opcoes/select/{entidade}` (chamava `acesso.obter_opcoes_selecao`) — desativado. **Não atende** ao `GET /api/opcoes` plano da tab opções.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Controllers/UtilsController.cs:1-107` — varredura completa: nenhum handler para `/api/opcoes` (GET ou POST), `/api/status`, `/api/pedidos` (plural). Tem `/api/versao`, `/api/model`, `/api/teste-email`, `/api/apps`, `/api/fornecedor/*`, e o genérico `[HttpPost("{appkey}/proc/{proc}")]`. **Nenhum cobre os endpoints chamados pelas tabs `opcoes` e `utilitarios`**.
- `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Aplicacao/Program.cs:1-60` — bootstrap. Sem reverse-proxy, sem `MapWhen`/`UseWhen`, sem fallback de rota. Só `app.UseDefaultFiles()`, `app.UseStaticFiles()`, `app.UseMiddleware<AuthMiddleware>()`, `app.MapControllers()`, hubs SignalR. Confirma que **não há mount silencioso** para `/api/opcoes`, `/api/status`, `/api/pedidos` no Director atual.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:11-39` — middleware de auth (compartilhado com [[portal-aws-bridge]]). Não tem fallback de rota.
- `sources/engenharia--fabrica--sql--portal-director/processa.agendamento/programacao/aws_sincronizar_entidade.sql:1-215` — proc local da tab `entidades` (detalhe da carga XML por entidade está em [[portal-aws-bridge]]:§"Citações" linha 32; **não duplico aqui**).

## Estrutura

### Casca `pageTabs` (`IntegradorAws.jsx`)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| ACL path | const | sim | Path verificado pelo `useAcl().checkUserAccess` | `'/configuracoes/integrador-aws'` | Bloqueia acesso à página se o papel do usuário não tem permissão | `IntegradorAws.jsx:10` |
| `pageTabs` shape | array | sim | Lista de 3 tabs, **nesta ordem** | ver tabela abaixo | Cada elemento vira uma aba renderizada via `<PageTabs>` ([[model-valor-pagetabs]]) | `IntegradorAws.jsx:12-24` |
| Breadcrumbs | array | sim | Trilha exibida no `<Page>` | `[Home, Configurações, Integrador AWS]` | Navegação superior | `IntegradorAws.jsx:28-32` |

### Tabs (ordem fixa)

| Slot | `tabName` | `tabLabel` | Componente | Origem de dados | Bridge AWS? |
|---|---|---|---|---|---|
| 0 | `utilitarios` | `Utilitários` | `IntegradorUtilitarios` | Local (browser + 2 endpoints Director sem controller atual) | Não |
| 1 | `opcoes` | `Opções` | `IntegradorOpcoes` | Director `/api/opcoes` (sem controller) + IndexedDB fallback | Não |
| 2 | `entidades` | `Sincronizar - Entidades` | `IntegradorEntidades` | Director `/api/integradoraws/sincronizar/{entidade}` (→ AWS via `PortalAwsClient`) | **Sim** (única tab que aciona [[portal-aws-bridge]]) |

### Tab 0 — `utilitarios` (`IntegradorUtilitarios.jsx`)

Quatro mini-cards independentes em layout `card card-body` + grid `col-md-6`. Sem persistência, sem proc, sem upload de model.

| Sub-card | Inputs | Ação | Endpoint | Resposta esperada | Vem de |
|---|---|---|---|---|---|
| Gerar token de autenticação | `dominio`, `usuario`, `senha` (3 inputs texto) | Botão "Gerar" → `handleGenerateToken` (client-side `btoa`) | (nenhum) | Token base64 exibido no campo "Resultado" | `IntegradorUtilitarios.jsx:18-25, 92-134`, `useConfigUtils.js:15-19` |
| Extrair credenciais de um token | `token` (1 input) | Botão "Extrair" → `handleExtractFromToken` (client-side `atob` + split) | (nenhum) | Lista `<li>` com `Domínio:`, `Usuário:`, `Senha:` | `IntegradorUtilitarios.jsx:34-40, 136-163`, `useConfigUtils.js:2-13` |
| Testar comunicação | (nenhum input) | Botão "Enviar" → `useFetch.get('/api/status')` | `GET /api/status` | XML com `Servico`, `Titulo`, `Descricao`, `Versao`; renderiza em `<pre><code>` formatado. Em erro: "Falha ao comunicar-se com o servidor remoto..." | `IntegradorUtilitarios.jsx:60-82, 164-180` |
| Consultar pedido | `pedido` (1 input, lido via `document.querySelector` — não controlled) | Botão "Consultar" → `useFetch.get('/api/pedidos/{numero}')` | `GET /api/pedidos/{numero}` | `res.dados[0]` exibido como `JSON.stringify(..., null, 2)` | `IntegradorUtilitarios.jsx:42-57, 181-205` |

#### Token utilitário (formato literal — não é JWT)

| Item | Tipo | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|
| Algoritmo | const | Codificação reversível | `base64` (`btoa`/`atob`) | Não cripta, não assina. Qualquer cliente do navegador consegue gerar/extrair. | `useConfigUtils.js:17` |
| Payload | string | Concatenação `{user}|{domain}:{password}` antes do `btoa` | qualquer string | Único formato aceito pelo `handleExtractFromToken` (parser quebra se faltar `|` ou `:`) | `useConfigUtils.js:6-12, 17` |
| Persistência | nenhuma | Token só vive na string `state.token` da tela | — | Fechou a tab, perdeu. Não vai pra storage. | `IntegradorUtilitarios.jsx:25` |

> Importante: esse token **não é** o JWT usado pelo `PortalAwsClient` (esse vem de `TokenUtils.GenerateJWTToken` server-side e é HMAC-SHA256 com `Consts.SecretKey`). Esse aqui é puramente um helper de copy-paste para o operador configurar manualmente o serviço integrador AWS instalado em algum host on-prem. Ver [[portal-aws-bridge]]:§"JWT do handshake bridge" para o JWT real da bridge.

### Tab 1 — `opcoes` (`IntegradorOpcoes.jsx` + `OptionList`)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| Endpoint GET (load) | URL | sim | Lista das opções | `/opcoes` (sanitizado → `GET /api/opcoes`) | Popula `options[]` e `state{}` (map `codigo→valor`) | `IntegradorOpcoes.jsx:38-39`, `useRequest.js:9` |
| Endpoint POST (save) | URL | sim | Salva todas as opções de uma vez | `POST /api/opcoes` | Body `{ opcao: [{codigo, valor}, ...] }` | `IntegradorOpcoes.jsx:21-36` |
| Item shape (resposta GET) | object | sim | Cada opção exibida | `{codigo, descricao, documentacao, valor?}` | `codigo` é label do campo + key em `state`; `descricao` aparece como subtítulo; `documentacao` aparece como `<small class='form-text text-muted'>` (helper textual abaixo do input) | `OptionList.jsx:14-38` |
| IndexedDB cache | object-store | não | Cópia local em caso de falha do GET | `storeKey='app_data', objectKey='app_integrador_aws_configs'` | Fallback offline-only; **a tela continua exibindo a lista** mesmo offline, mas o GET-com-erro **não preenche `state{}`** — usuário consegue ver mas não editar com confiança | `IntegradorOpcoes.jsx:50-66` |
| Botão de salvar (texto) | string | não | Override do label do submit | `'Salvar'` (default) | A tela atual não passa `buttonTitle`, então sempre lê "Salvar" | `OptionList.jsx:44-47` |

> O **conteúdo concreto** das opções (lista de `codigo` legais, valores default, regras de validação por opção) **não está hardcoded no front**: vem do banco em runtime via `GET /api/opcoes`. Catálogo real vive (presumivelmente) em alguma tabela `TBopcao` / `TBconfig` do Director / portal-aws — mapeamento exato exige sub-survey adicional (ver §"Lacunas conhecidas").

### Tab 2 — `entidades` (`IntegradorEntidades.jsx`)

| Item | Tipo | Obrigatório | Semântica | Valores legais | Efeito | Vem de |
|---|---|---|---|---|---|---|
| Select de entidade | enum | sim | Discriminador do tipo de carga a sincronizar | `redes, empresas, centros, departamentos, veiculos, feriados, fornecedores, itens, planos, usuarios` (10 valores fixos, hardcoded em ordem) | Vai como `{entidade}` no path | `IntegradorEntidades.jsx:41-50` |
| Endpoint trigger | URL | sim | Trigger do sync (GET, single-shot, manual) | `GET /api/integradoraws/sincronizar/{entidade}` | Director executa `aws_sincronizar_entidade @entidade, null` e repassa XML resultante para `POST {IpPortalAws}/api/proc/portal.sincronizar_{entidade}` (ver [[portal-aws-bridge]]) | `IntegradorEntidades.jsx:14` |
| Page blur | flag UI | sim | Tela fica desabilitada (overlay) durante o request | `true` enquanto request em vôo / `false` (default) ao fim | UX bloqueante. Sem progresso, sem cancelar. | `IntegradorEntidades.jsx:13, 21` |
| Toast sucesso | string | sim | Mensagem PT-BR exibida em 200/sucesso | `"Entidade sincronizada com sucesso."` | `useNotifications.success(...)` | `IntegradorEntidades.jsx:16` |
| Toast erro | string | sim | Mensagem PT-BR exibida em qualquer outro caso | `"Ocorreu um problema durante a sincronização da entidade."` | `useNotifications.warning(...)` + `console.log(response)` | `IntegradorEntidades.jsx:18-19` |

> Não há feedback granular do tamanho da carga, contagem de registros sincronizados, ou linha-por-linha de erro. O front recebe a stream do `<Resposta>` da AWS (XML), mas **a tela ignora o corpo** — só olha `sucesso === true && status === 200`. Para ver o conteúdo de erro o operador precisa abrir o console do browser (`console.log(response)`).

## Endpoints consumidos por tab (visão consolidada)

| Endpoint chamado pelo front | Método | Tab | Controller no Director (sources/) | Onde o trabalho de fato acontece | Vem de |
|---|---|---|---|---|---|
| `/api/integradoraws/sincronizar/{entidade}` | GET | `entidades` | `IntegradorAwsController.SincronizarEntidade` ✓ | Proc local `aws_sincronizar_entidade` + bridge `PortalAwsClient.SendRequest` → AWS `portal.sincronizar_<entidade>` | `IntegradorAwsController.cs:13-27`, [[portal-aws-bridge]] |
| `/api/opcoes` | GET | `opcoes` | **Ausente** — `OpcoesSelectController` está integralmente comentado | Desconhecido. Fallback IndexedDB. > inferido: pode existir em build legado ou outro deploy | `OpcoesSelectController.cs:1-21`, `Program.cs:51` |
| `/api/opcoes` | POST | `opcoes` | **Ausente** | Desconhecido | (ausência) |
| `/api/status` | GET | `utilitarios` (Testar comunicação) | **Ausente** | Desconhecido. > inferido: provavelmente proxy para o serviço `Processa.Integrador.AWS` (porta `4303`, ver `acesso.TBaplicacao WHERE DFchave='integrador-aws'`), que serve XML de health-check com `Servico/Titulo/Descricao/Versao` — não confirmado nas fontes | (ausência) + [[portal-aws-bridge]]:§"linhas 24, 43" |
| `/api/pedidos/{n}` | GET | `utilitarios` (Consultar pedido) | **Ausente** (existe `/api/pedido/{id}` singular em `PedidoController` — discrepância plural vs singular) | `PedidoService.GetPedidoById` retorna pedido do Director local | `PedidoController.cs:8-22` |

## Comportamento de erro

| Cenário | Efeito atual | Vem de |
|---|---|---|
| Bridge sync falha (tab `entidades`) | Sempre `200 OK` HTTP (controller no Director só faz `console.log + return Stream.Null` em exceção). Front decide sucesso/erro inspecionando `res.sucesso` e `res.status` do payload. | `IntegradorAwsController.cs:23-26`, `IntegradorEntidades.jsx:15-20` |
| `GET /api/opcoes` falha (sem controller) | XHR não-2xx → `useRequest` resolve `{status:<n>, sucesso:false, dados:<text>}`. Front **não exibe erro**, faz fallback silencioso para IndexedDB e popula só `options[]` (sem `state{}`). Usuário pode digitar nos inputs mas Salvar provavelmente falhará. | `IntegradorOpcoes.jsx:55-68`, `useRequest.js:53-71` |
| `POST /api/opcoes` falha | Toast warning genérico `"Ocorreu um erro ao realizar a operação."` + `console.log(response)`. Sem retry. Estado local da tela mantém os valores digitados. | `IntegradorOpcoes.jsx:30-35` |
| `GET /api/status` falha | Mensagem fixa `"Falha ao comunicar-se com o servidor remoto..."` no `<pre>` da tela. | `IntegradorUtilitarios.jsx:78-80` |
| `GET /api/pedidos/{n}` falha | `console.log(err)` silencioso. Tela não exibe nada para o operador (o `<pre>` continua mostrando o último pedido ou vazio). | `IntegradorUtilitarios.jsx:53-55` |

## Lacunas conhecidas (não-cobertas pelas fontes em `sources/`)

1. **Endpoints `/api/opcoes` (GET/POST), `/api/status`, `/api/pedidos/{n}`** não têm controller no `PortalDirector.Aplicacao` atual. Hipóteses não-confirmadas: (a) os endpoints vivem em outro deploy/branch e a versão capturada em `sources/` está incompleta; (b) os endpoints estão de fato quebrados em produção e ninguém mais usa as tabs `opcoes`/`utilitarios`; (c) há reescrita de rota em IIS/NGINX reverse-proxy on-prem que redireciona esses paths para outro serviço (provável destino: `Processa.Integrador.AWS` em `:4303`). Sub-survey necessário antes do Studio reescrever (provavelmente já cobre F048 runtime-stable, mas vale registrar follow-up).
2. **Catálogo de `codigo` aceitos pela tab `opcoes`**: a UI é genérica (key/value), mas o universo de chaves real (e suas regras) vive em tabela do banco do integrador. Sub-survey opcional — só necessário se o Studio precisar **validar** as opções, não só exibi-las.
3. **`integrador-aws` vs `portal-aws`** como appKey: `acesso.TBaplicacao` tem **ambas as chaves** (seeds: `portal-aws` em `:5100`, `integrador-aws` em `:4303` — ver [[portal-aws-bridge]]:§"Citações" linha 40 e [[tbaplicacao-registry]]:§R19 análogo). O `PortalAwsClient` da bridge usa **`portal-aws`** (sempre). A tab `utilitarios > Testar comunicação` (XML com `Servico/Titulo/Descricao/Versao`) provavelmente fala com o **`integrador-aws`** (o serviço .NET on-prem, não o portal AWS hospedado). Como o controller `/api/status` não existe nas fontes, isso é **inferido** e exige confirmação on-prem ou em outro source-tree.
4. **Discrepância plural/singular `/api/pedidos/{n}` vs `/api/pedido/{id}`**: provavelmente bug latente do front (mantido porque a tab é pouco usada) ou alias em deploy. Não escolher um lado sem confirmação.

## Decisão de escopo F094 (para o curator + smith)

- **F094 É page-shell `pageTabs`** com **3 tabs** (mesma forma de F092/Cotacao, mas 3 e não 5). Reusa o enabler **F108** (engine `pageTabs`).
- **Apenas a tab `entidades`** é "F052b caminho A" puro (proc-based via bridge AWS). As outras duas tabs **não são proc-based** e dependem de endpoints REST cujo backend **não está documentado em `sources/`**.
- **Não há analogia 1:1 com F109**: F109 deferida (P3) refere a 5 tabs REST não-proc de **Cotacao** (`CotacaoConsulta/Sincronizar/Monitorar/Opcoes/Utilitarios`) consumindo `Cotacao.Integrador.WebAPI`. As tabs `opcoes` e `utilitarios` do IntegradorAWS são **outro conjunto** de endpoints REST e devem ser tratadas como **deferred próprio** (cutover-fase-2 do IntegradorAWS), gemelar de F109 mas com survey independente. Sub-features sugeridas (a curador decidir entrada no manifest):
  - **F094a** — tab `entidades` (proc-based bridge AWS): single sub-model `pageTabs[2]` com `genericform` (select+botão) → endpoint literal `/api/integradoraws/sincronizar/:entidade` (Studio precisa montar essa rota literal, gemelar do `/portal-aws/proc/...` de F090) **ou** rota engine-driven equivalente. Procs envolvidas listadas em [[portal-aws-bridge]]:§"Endpoints externos" (10 procs `portal.sincronizar_<entidade>` + 1 proc local `aws_sincronizar_entidade`).
  - **F094b (deferred)** — tab `utilitarios`: gemelar F109. Depende de survey `/api/status` + `/api/pedidos`. Pode ser drop-out se decisão for não migrar.
  - **F094c (deferred)** — tab `opcoes`: gemelar F109. Depende de survey `/api/opcoes` + catálogo `codigo`. Pode ser drop-out.
- Não inventar `acesso.sp_persistir_configuracao_aws` (anti-padrão já anotado no manifest). A `tab entidades` **não persiste configuração** — só dispara sync. Persistência de "configuração" do integrador é responsabilidade da tab `opcoes` (que pode ficar deferred até o backend ser localizado).

## Relações com o ecossistema

- Consome de: [[portal-aws-bridge]] (tab `entidades` — única consumidora real), [[model-valor-pagetabs]] (shell), [[engine-page-tabs]] (engine renderer F108), [[tbaplicacao-registry]] (resolução das chaves `portal-aws` e `integrador-aws`).
- Page-tabs vizinhos como referência de shape: [[obter-model-pagina]] §"Consumo pelos models F043", model `configuracoes_cotacao` (F092) — mesma forma de shell, número de tabs diferente.
- Hooks utilitários: `useConfigUtils` (token base64) é **exclusivo** desta página (zero hits no resto do `PortalDirector.Website` segundo grep) — não merece contrato próprio. `useRequest`/`useFetch`/`useNotifications`/`useBlur` são do `@engenharia/react-tools` e estão documentados implicitamente em outros contratos (`useFetch` sanitize prefix `/api` é o mesmo padrão usado em todas as pages).

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- Casca de 3 tabs é **menor** que Cotacao (4 tabs em F092). Template `JSON_MODIFY $.pageTabs[N]` de F092a-d se aplica diretamente (slots 0/1/2 — adaptar guards THROW para os índices corretos).
- Tab `entidades` é o **único** caminho dependente de bridge AWS. Procs envolvidas (10 entidades) **já estão cobertas** por [[portal-aws-bridge]] — F094a herda contrato existente, não precisa reescavar.
- Lista de 10 entidades é **hardcoded no front**, na ordem `redes, empresas, centros, departamentos, veiculos, feriados, fornecedores, itens, planos, usuarios`. Se a tab for refeita como `genericform` schema-driven, essa lista vira `fixedList` no select (não vem do banco).
- O parâmetro `@ids` da proc `aws_sincronizar_entidade` **está disponível** mas **nunca é exercido** (controller atual sempre passa `null` = full-sync). Hook de extensão pronto para "sync incremental por IDs" se o Studio quiser adicionar — não bloqueia paridade.
- Tabs `utilitarios` e `opcoes` **não devem entrar** no escopo F094a sem survey adicional confirmar onde vivem os endpoints. Recomendação: tratar como cutover-fase-2 análogo a F109 e criar features dedicadas (F094b/F094c) **deferred** até que (i) o backend dos endpoints `/api/opcoes`+`/api/status`+`/api/pedidos` seja confirmado, ou (ii) decisão de produto seja não migrar esses utilitários.
- O "token de autenticação" gerado pela tab `utilitarios` é **base64 plain**, não JWT. Migrar para Studio não exige `Consts.SecretKey` nem qualquer config server-side — é função pura de string. Se a tab for migrada, sub-feature pode ser puramente client-side.

## Sources

- [[calendar/notes/2026-05-17.md]] (F094 sub-escavação)
