---
title: "Processa ADM — UI de suporte interno"
aliases: [processa-adm, adm-website, adm-tool, support-ui]
tags: [reference, processa, admin, support, legacy]
sources:
  - "sources/engenharia--fabrica--dotnet--processa.ADM/Fontes/Processa.ADM.Website/"
  - "sources/engenharia--fabrica--dotnet--processa.ADM/Fontes/Processa.ADM.Aplicacao/Controllers/"
created: 2026-05-16
updated: 2026-05-16
---

# Processa ADM — UI de suporte

App **React de uso interno do time Processa** rodando em `52.67.203.133:5300` (produção) e `:6300` (homologação). Não é cliente-facing: é a ferramenta operacional do suporte/dev pra gerenciar instalações, configurar tenants, gerar credenciais e operar manutenção remota.

Vive em `sources/engenharia--fabrica--dotnet--processa.ADM/`:

```
Fontes/
├─ Processa.ADM.Aplicacao/   ← API .NET (Controllers, Services)
├─ Processa.ADM.Repository/
├─ Processa.ADM.Services/
└─ Processa.ADM.Website/     ← UI React (consome a API local + react-tools)
```

Frontend: React 18 + Vite 4, importa `@engenharia/react-tools` (mesmo pacote interno do Portal Director/WMS/etc.) — confirma a tese da MISSION de que **todo wrapper de app legado era boilerplate em volta do mesmo react-tools** (vide [[mission]]).

## Rotas / Telas

Mapa de `Processa.ADM.Website/src/routes/index.jsx`:

| Rota | Componente | Função |
|---|---|---|
| `/` | `<Home/>` | Painel inicial |
| `/analises/checkin` | `<CheckIn/>` | Telemetria de check-in dos clientes |
| `/aplicacoes` | `<Aplicacoes/>` | Inventário de aplicações instaladas (`TBaplicacao` cross-tenant) |
| `/cadastros/servidor_smtp` | `<SMTP/>` | Configurar servidor SMTP de envio |
| `/configuracoes/connection-strings` | `<ConnectionStrings/>` | Strings de conexão SQL por tenant |
| `/configuracoes/preferencias` | `<Preferencias/>` | Preferências do ADM |
| **`/ferramentas/gerador_de_senha`** | **`<GeradorDeSenha/>`** | **Gera senha temporária pra logar como super-user `processa`** — vide §"Gerador de senha temp" |
| `/ferramentas/executor_de_query` | `<ExecutorDeQuery/>` | Roda SQL ad-hoc em qualquer tenant (Monaco editor) |
| `/ferramentas/controle_de_servicos` | `<ControleDeServicos/>` | Start/stop/restart dos serviços Windows nos servidores de cliente |
| `/ferramentas/manipulacao_de_arquivos` | `<ManipulacaoDeArquivos/>` | Manipular arquivos remotos no servidor de cliente |
| `/ferramentas/notificador` | `<Notificador/>` | Disparar notificações via hub SignalR (`/hub-suphelp`) |
| `/ferramentas/edit_app_config` | `<EditAppConfig/>` | Editar `appsettings.json` remoto |
| `/ferramentas/event_viewer` | `<EventViewer/>` | Ler Event Viewer Windows do servidor de cliente |
| `/ferramentas/ambiente_aws` | `<AmbienteAws/>` | Inspecionar/operar recursos AWS |
| `/instalacoes/agendada` | `<Agendada/>` | Agendar instalação/upgrade automático |
| `/instalacoes/manual` | `<Manual/>` | Roteiro de instalação manual |
| `/instalacoes/director` | `<Director/>` | Setup do Director |

Realtime via SignalR (`@microsoft/signalr`), hub `/hub-suphelp` — vide [[hub-signalr-legacy]].

## Gerador de senha temp (`/ferramentas/gerador_de_senha`)

**Esta é a UX intencionada pra obter credencial de super-user.**

Arquivo: `Processa.ADM.Website/src/routes/ferramentas/GeradorDeSenha.jsx`.

Fluxo:

1. Suporte abre a tela no ADM.
2. Digita "validade em horas" (1 a 24).
3. Clica Executar.
4. Frontend faz `GET /api/tools/passwordtemp/{horas}` no backend do ADM.
5. Backend (`ToolsController.GetTempPassword`, `Processa.ADM.Aplicacao/Controllers/ToolsController.cs:17`) chama `TokenUtils.GenerateTempPassword(horas * 3600)` do `Processa.Sdk.Auth`.
6. Algoritmo (`TokenUtils.cs:131`):
   - Pega 6 chars aleatórios de `Consts.SecretKey` (índice 0..99).
   - Anexa separador fixo `SecretKey.Substring(50, 7)`.
   - Anexa timestamp de expiração `yyyy-MM-dd HH:mm:ss`.
   - Codifica em ASCII bytes → Base64.
7. Frontend exibe a string base64 num input readonly com botão de copy.
8. Suporte cola a senha no campo de login do app destino, com identity `processa`.
9. Auth do app destino (`AbstractBearerAuth.AuthenticateTempPassword`, mesma SDK) valida: Base64-decode, split pelo separador, confere salt na SecretKey, confere `DateTime.Now < expirationTimestamp`.

> Nota: o backend `Processa.Sdk.Controllers.EmbeddedController.GenerateTemp` (`GET /api/auth/generateTemp?segundos=N`) está disponível **em qualquer app** do ecossistema (não só ADM). O ADM apenas oferece UI sobre isso; programaticamente, todo app expõe o endpoint via SDK.

## Implicações pra Director.Studio

- **Gerador de senha temp** vira feature do Studio (categoria "Ferramentas"/admin) — `TokenUtils.GenerateTempPassword` portado pra Node usando a mesma `SecretKey` (já configurada como `STUDIO_AWS_JWT_SECRET` em [[portal-aws-bridge]]).
- **Outras telas ADM** (executor de query, edit-app-config, event viewer, etc.) são candidatas a feature **fora do contrato MISSION imediato** — o ADM é app de suporte interno, e a MISSION inicial foca em substituir os apps cliente-facing (Portal Director, WMS, etc.). Mas eventualmente o ADM também é app no Studio (consistente com a visão "Studio renderiza todas as apps cadastradas em `TBaplicacao`" — ADM é a chave `processaadm` em [[processa-aws-ports]]).
- **Confirma a tese central da MISSION**: o ADM usa `@engenharia/react-tools` como dependência. É só mais um wrapper React+Vite em volta do mesmo motor. O Studio sem-wrapper substitui isso também.

## Links

- [[processa-aws-ports]] — mapping de portas do `52.67.203.133`.
- [[processa-auth-paths]] — caminho `temp-password` no contrato de auth.
- [[mission]] — `react-tools sem wrapper`.
- [[hub-signalr-legacy]] — hub `/hub-suphelp` usado pelo ADM.
