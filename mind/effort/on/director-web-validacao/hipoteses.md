---
title: "Hipóteses — Director Web validação"
aliases: [hipoteses]
tags: [effort, director-web, hypotheses]
created: 2026-05-12
updated: 2026-05-12
---

# Hipóteses

Lista viva de hipóteses extraídas do source para validar contra `http://172.27.0.52:4300/`.

## Convenção

- Prefixo `[infra-NNN]` = hipóteses do deepseek (rotas, menu, auth, guards).
- Prefixo `[negocio-NNN]` = hipóteses do claude (entidades, telas CRUD, campos, queries).
- Status: `pendente` → `confirmada` | `divergente` | `inacessivel`.
- Cada hipótese: **enunciado**, **evidência no source** (`file:line`), **como validar**, **resultado**.

### Template

```
### [<prefixo>-NNN] <título curto>
- **Status:** pendente
- **Enunciado:** <afirmação verificável>
- **Source:** `<path>:<linha>`
- **Como validar:** <passos no app publicado>
- **Resultado:** —
```

---

## Infra (deepseek)

### [infra-001] Auth — servidor de autenticação
- **Status:** pendente
- **Enunciado:** Ao acessar o app sem token, o `AuthMiddleware` redireciona para o servidor de autenticação em `52.67.203.133`.
- **Source:** `Director.Web.Aplicacao/appsettings.json:9` + `Program.cs:18,27`
- **Como validar:** Abrir `http://172.27.0.52:4300/` em sessão anônima → verificar redirecionamento para tela de login no domínio do servidor de auth.
- **Resultado:** —

### [infra-002] Auth — todas as controllers exigem `DirectorIdentity`
- **Status:** pendente
- **Enunciado:** Toda controller do Director.Web verifica `Thread.CurrentPrincipal?.Identity is DirectorIdentity` antes de processar. Requisições sem JWT válido falham.
- **Source:**
  - `AppsController.cs:78` — cast explícito `(DirectorIdentity)`
  - `DownloadController.cs:26` — guard `is not DirectorIdentity`
  - `EdocController.cs:15` — guard `is not DirectorIdentity`
  - `UtilsController.cs:47` — guard `is not DirectorIdentity`
  - `SelectService.cs:26` — cast explícito
- **Como validar:** Fazer `curl http://172.27.0.52:4300/api/versao` sem header `Authorization` → esperado 401/403.
- **Resultado:** —

### [infra-003] `GET /api/versao` retorna metadata da aplicação
- **Status:** pendente
- **Enunciado:** O endpoint `GET /api/versao` retorna JSON com `Servico: "Director.Web"`, `Versao: "1.21.4"`, `Titulo: "Processa - Director Web"`.
- **Source:** `UtilsController.cs:14-20` — método `Versao()` lê de `Settings.Get("AppInfo:*")`.
- **Como validar:** Autenticar, acessar `http://172.27.0.52:4300/api/versao` com token JWT → verificar JSON.
- **Resultado:** —

### [infra-004] Menu — renderiza módulos do banco, não de arquivo estático
- **Status:** pendente
- **Enunciado:** O menu lateral é populado dinamicamente a partir da tabela `acesso.TBmodulo`, filtrando `DFexibir_menu = 1`. Não existe `Menu.json` estático.
- **Source:**
  - `Processa.AppBuilder.Dominio/Modulo.cs:1-22` — entidade `Modulo` com campo `ExibirMenu`
  - `Processa.AppBuilder.Api/ModelScript.cs:101-114` — INSERT em `acesso.TBmodulo` com campos `titulo, caminho, icone, chave`
  - `website/src/index.jsx:13-20` — `<AppMain useSidebar={true} />` delega ao `@engenharia/react-tools`
- **Como validar:** Fazer login, expandir o menu lateral. Cada item visível deve corresponder a uma linha em `acesso.TBmodulo` com `DFexibir_menu = 1`.
- **Resultado:** —

### [infra-005] Módulo Dashboard é criado automaticamente pelo AppBuilder
- **Status:** pendente
- **Enunciado:** O AppBuilder insere automaticamente um módulo "Dashboard" (chave `{app}.dashboard`) com caminho `/dashboard` e página "Cadastro de Dashboards" (chave `{app}.dashboard-dashboard`).
- **Source:** `ModelScript.cs:248-260` — fallback no fim do script de model: se não existe módulo dashboard, insere.
- **Como validar:** No app publicado, verificar se o menu contém item "Dashboard" com ícone `cil-bar-chart` e rota `/dashboard`.
- **Resultado:** —

### [infra-006] Controller Apps — proxy para apps downstream
- **Status:** pendente
- **Enunciado:** `AppsController` atua como proxy JWT: consulta `acesso.TBaplicacao` pelo endereço do app downstream, gera JWT com `TokenUtils.GenerateJWTToken`, e encaminha requisições GET/POST com header `Authorization: Bearer <token>`.
- **Source:** `AppsController.cs:65-81` — método `GetClient()` consulta `TBaplicacao`, gera JWT, injeta header.
- **Como validar:** Acessar uma rota de app via Director (ex: `api/apps/portal-director/get/proc/algum/params`), verificar se o JWT é injetado e o app downstream responde.
- **Resultado:** —

### [infra-007] `POST /api/model` — proxy para portal-director carregar JSON de página
- **Status:** pendente
- **Enunciado:** `POST /api/model` encaminha o body da requisição para o `portal-director` (`/api/model`), repassando o JWT original. É o endpoint usado pelo frontend para carregar o model JSON de cada página.
- **Source:** `UtilsController.cs:24-37` — método `ObterModel()` busca URL do app `"portal-director"` via `repo.GetAppUrl()`, encaminha com JWT.
- **Como validar:** Fazer login, abrir uma tela e inspecionar network → deve haver POST para `/api/model` com payload JSON retornando configuração da página.
- **Resultado:** —

### [infra-008] `POST /api/pipeliner/jobs` — execução de jobs remotos
- **Status:** pendente
- **Enunciado:** `POST /api/pipeliner/jobs` recebe um body com comandos e encaminha para o `PipelinerService.ExecCommand()`, que os executa e retorna stream de respostas.
- **Source:** `PipelinerController.cs:11-23` — endpoint `PipelinerExec()` delega para `IPipelinerService`.
- **Como validar:** (verificação indireta) Verificar se frontend expõe alguma interface de execução de pipelines — o controller existe, mas pode ou não ter UI exposta.
- **Resultado:** —

### [infra-009] `GET /api/selectquery/{queryKey}` — dropdowns dinâmicos
- **Status:** pendente
- **Enunciado:** Queries de select (dropdowns) são resolvidas via `SelectService.ObterOpcoesSelect()`, que busca a query armazenada no banco do Director e retorna JSON array de opções.
- **Source:** `UtilsController.cs:67-84` + `SelectService.cs:26`
- **Como validar:** Em qualquer tela com dropdown (ex: select de cliente, entidade), inspecionar network → deve haver GET para `/api/selectquery/<key>` retornando `[{value, label}, ...]`.
- **Resultado:** —

### [infra-010] `GET /api/image` — serve arquivos via FTP
- **Status:** pendente
- **Enunciado:** `GET /api/image?filepath=<path>` obtém arquivos do servidor FTP via `IFTPService.GetFilesFromPath()`.
- **Source:** `ImageController.cs:10-11`
- **Como validar:** Acessar uma tela que renderize imagens, inspecionar network → buscar GET para `/api/image?filepath=`.
- **Resultado:** —

### [infra-011] `POST /api/download/grid` — download zip de arquivos
- **Status:** pendente
- **Enunciado:** O endpoint recebe um body JSON com `procedure` e `extension`, executa a procedure no banco (retornando lista de `{FileName, FileContent}`), zipa tudo e retorna.
- **Source:** `DownloadController.cs:22-66`
- **Como validar:** Em tela com funcionalidade de download em lote, acionar e verificar retorno de arquivo `.zip`.
- **Resultado:** —

### [infra-012] `POST /api/csv/proc/{procedure}` — export CSV
- **Status:** pendente
- **Enunciado:** O endpoint recebe body XML com parâmetros, executa procedure no banco, converte resultado para CSV com BOM UTF-8, e retorna o stream.
- **Source:** `UtilsController.cs:45-66`
- **Como validar:** Em tela com botão "Exportar CSV", acionar e verificar retorno de arquivo CSV válido.
- **Resultado:** —

### [infra-013] Config — conexão com banco Director
- **Status:** pendente
- **Enunciado:** A connection string do app publicado aponta para `172.27.0.121\SQL2k16`, database `DBdirector_bahamas_29`, user `sl`.
- **Source:** `appsettings.json:7`
- **Como validar:** (indireto) Qualquer query que funcione no app prova que a conexão está ativa. Um endpoint que falhe com erro de banco indicaria divergência.
- **Resultado:** —

## Negócio (claude)

_(a preencher)_

## Notas

- [[director-web-validacao]] — frente-mãe
- [[notas-sessao]] — registro do que rolou em cada rodada
