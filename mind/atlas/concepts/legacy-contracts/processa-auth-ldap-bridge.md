---
title: "Bridge LDAP — autenticação via servidor AWS (porta 4306)"
aliases: [processa-auth-ldap-bridge, ldap-bridge, ldap-bridge-aws, auth-validate-bridge, bridge-4306]
tags: [contract, legacy, auth, ldap, aws, bridge, cryptography, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Contrato: Bridge LDAP — `/api/auth/validate` (AWS:4306)

O Portal.Director on-prem (e qualquer app que monte o `AuthMiddleware`/`LDAPAuthMiddleware` do `Processa.Sdk.Auth`) **não fala LDAP diretamente do processo .NET de cada tenant**: terceiriza a validação de credenciais de Active Directory para **um único servidor de autenticação hospedado em AWS**, exposto em `http://{ServidorAutenticacao}:4306/api/auth/validate`. Esse servidor é o **único processo que carrega a dependência `Novell.Directory.Ldap`** e tem acesso de rede ao `dc1.processa.com` (controller de domínio da Processa). Os clientes (Director, AppBuilder, ADM, etc.) detectam que o login é AD via heurística textual (`User.StartsWith("processa\\")` ou `"processa.com\\"`) e fazem **um único POST cripto-tunelado** com as credenciais; o bridge faz o `Connection.ConnectAsync(...)` + `BindAsync(...)` real (a classe `ProcessaLDAPAuth` no SDK é a implementação de referência do que **roda dentro do bridge**, não dentro do cliente).

Em produção o host é **`52.67.203.133`** (default em todos os `appsettings.json` e `InstallService.js` do legado, configurável via `AppSettings:ServidorAutenticacao`). O endpoint está vivo neste momento (probe 2026-05-16T05:04Z: Kestrel responde 200 OK com envelope semântico mesmo a payload inválido — confirmação registrada na seção [[#Probe — comportamento observado]] abaixo).

Caminho lógico do legado:

1. `LDAPAuthMiddleware.BuildPrincipal` (ou `AuthMiddleware.BuildPrincipal` para apps com fallback local) extrai `User:Password` do header `Authorization: Basic`.
2. `IsLdapUser()` retorna `true` se `User` começa com `processa\` ou `processa.com\` (case-insensitive).
3. Chama `AuthenticateLdap(user, password, group)` (estático em `AbstractBearerAuth`).
4. `AuthenticateLdap` gera um JWT de identidade dummy `(1, user, 1, "Processa")` apenas para preencher o header `Authorization: Bearer` da requisição ao bridge — esse JWT **não carrega credencial**, é só carona para o middleware do bridge não rejeitar por falta de header (na prática, o probe deste contrato mostra que o bridge **não exige** o header — manda mesmo assim por convenção do `HttpClient` legado).
5. Monta payload JSON `{ idUser:1, loginUser, passwordUser, validarGrupo, validarLDAP:false }`, cifra com AES-256-CBC + key derivada de `Consts.SecretKey` por HMAC-SHA256, prefixa o IV nos primeiros 16 bytes do output, codifica tudo em base64.
6. **Re-serializa a string base64 como JSON string** (envolve em aspas; literal `"<base64>"`) e POSTa no body.
7. Bridge responde 200 OK com `{status, sucesso, dados}` (envelope `Response.cs`). Em sucesso `dados` é um array JSON de grupos AD; em falha `dados` é mensagem textual e `sucesso=false`.
8. Cliente lê `response.Dados as JArray`, popula `identity.Grupos`, retorna `DirectorPrincipal(identity)` para o pipeline.

**Inputs sensíveis nunca tocam disco local**; a única dependência de configuração do tenant é o IP do bridge em `AppSettings:ServidorAutenticacao`. Não há cache. Não há retry no caminho LDAP (o `HttpClient` legado tem `Attempts=5` default, mas como o bridge sempre retorna 200, falhas semânticas não disparam retry — apenas timeouts/network errors o fazem). Não há circuit breaker.

## Citações de fonte

- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:88-93` — `IsLdapUser()`: discriminador textual `User.StartsWith("processa\\")` ou `"processa.com\\"` (case-insensitive). Sem `\` no identity → não é LDAP.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:95-137` — `AuthenticateLdap(user, password, group)`: corpo inteiro da chamada ao bridge.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:99` — `var name = user.Split("\\")[1];` extrai sAMAccountName do identity (descarta o domínio).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:100` — `DirectorIdentity(1, name, 1, "Processa")`: usuário LDAP sempre recebe `Id=1, CodEmpresa=1, NomeEmpresa="Processa"` (sentinela — o identity real do AD não é resolvido contra `acesso.TBusuario`, é fixo).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:103` — JWT do header é gerado com identity `(1, user, 1, "Processa")` (note: usa o `user` original com `\`, não o `name` split).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:106-113` — shape exato do payload claro: `{ idUser=1, loginUser=user, passwordUser=password, validarGrupo=group, validarLDAP=false }`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:115` — `var paramToken = new Cryptography().Encrypt(paramJson);` aplica AES + base64 (vide sub-contrato [[processa-cryptography]]).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:116-126` — `HttpClient` setup: `UrlBase = http://{ServidorAutenticacao}:4306/api/auth`, `Timeout=300` (segundos), headers `Authorization: Bearer <authToken>`, `Content-Type: application/json`, `Accept: application/json`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:128` — `client.Send("validate", HTTP.POST, paramToken.ToJson())`: resource é `validate` (path final `/api/auth/validate`); body é `paramToken.ToJson()` (re-serializa a string base64 envolvida em aspas).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:129-135` — resposta: `JsonToObject<Response>` (shape `{Status, Sucesso, Dados}`); em `!Sucesso` lança `AuthenticationException("Token de autenticação inválido.")`; em sucesso `Dados` é castado para `JArray` e atribuído a `identity.Grupos`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:59-86` — `ExtractCredentials`: o header `Authorization` do cliente do legado vem como `Basic base64(user:pass)`, decodificado em UTF-8, split por `:` na **primeira** ocorrência. `Group` lê de `AppSettings:GrupoAD` do `Settings`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:131-132` — semântica de erro: `response.Sucesso==false` → throw `AuthenticationException("Token de autenticação inválido.")` que sobe para o catch do `InvokeAsync:38-51` → resposta HTTP **401** com body `{status:401, sucesso:false, dados:"Falha na autenticação do usuário"}` (mensagem é fixa exceto se `ex.Source` for `ValidateJWTToken` ou `ValidateTempPassword`).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/LDAPAuthMiddleware.cs:31-39` — quando `User.Same("processa")` (literal, sem `\`) o caminho LDAP é desviado para `AuthenticateTempPassword`; quando `IsLdapUser()` falso lança "Autenticação permitida somente para usuários internos." (este middleware é mais estrito que `AuthMiddleware.cs` que tem fallback `AuthenticateLocal`).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/ProcessaLDAPAuth.cs:29-82` — implementação de referência (provavelmente equivalente ao que **roda dentro do bridge AWS:4306**, não dentro do cliente). Conecta `dc1.processa.com:LdapConnection.DefaultPort` (389), `SecureSocketLayer=false`, bind com `User.StartsWith("processa") ? User : $@"processa\{User}"` + password, search `(&(objectClass=user)(objectClass=person)(sAMAccountName={User.Split("\\").LastOrDefault()}))` em `DC=processa,DC=com`, atributo `memberOf`. Resposta interna: `{ isAuthenticated, hasAccessToGroup, adGroups[] }`. Em exceção: `{ isAuthenticated:false, hasAccessToGroup:false, adGroups:[] }`. **Esta resposta é da classe de referência — o que o bridge devolve no wire (após embrulhar em `Response`) está documentado na seção [[#Probe — comportamento observado]].**
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:1-90` — algoritmo completo de cifra (sub-contrato dedicado em [[processa-cryptography]]).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Consts.cs:34` — `SecretKey` (literal hardcoded de 116 chars começando com `aAGoWJTMbnbarretinFWaORnBblzcsyMOYOHJxXLrprLaqcoroaJEYOBrCYnaGSRUpXtbN...`).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Clients/HttpClient.cs:70-132` — `Send(resource, verb, body, ...)`: dispara via `curl.exe` (Windows) ou `curl` (Linux) em subprocess, grava body em arquivo temporário (`body-{guid}.json`) e envia com `-d @path`. `Timeout=300s` propaga para `--connect-timeout` + `--max-time` do curl. `Attempts=5` default com sleep 1s entre tentativas.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Domain/DirectorIdentity.cs:12-67` — shape de `DirectorIdentity` (apenas relevante para o JWT-de-carona do header Authorization): `Id, Name, CodEmpresa, NomeEmpresa, JWT, Domain="Director", Grupos`. O JWT vai assinado HS256 com `Consts.SecretKey` em ASCII bytes, claim única `"identidade"` com o JSON da identity.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:24-66` — geração do JWT (compartilhado com a bridge AWS — vide [[portal-aws-bridge]]).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Response.cs:8-41` — envelope `{Status:int, Sucesso:bool, Dados:object}` retornado pelo bridge.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Config/appsettings.json:24` — seed `ServidorAutenticacao = 52.67.203.133`.
- `sources/engenharia--fabrica--dotnet-core--director/Config/appsettings.json:20`, `sources/engenharia--fabrica--dotnet--processa.appbuilder/Config/appsettings.json:17`, `sources/engenharia--fabrica--dotnet--processa.ADM/Assets/appsettings.json:10`, `sources/engenharia--fabrica--dotnet-core--director.web/Config/appsettings.json:14` — todos com o mesmo IP `52.67.203.133`.
- `sources/engenharia--fabrica--dotnet-core--director/msiTools/InstallService.js:109` (idem `processa.appbuilder/msiTools/InstallService.js:105`, `director.web/msiTools/InstallService.js:109`) — wizard de instalação grava o IP no `appsettings.json` durante deploy.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Sandbox/Program.cs:843-876` — sandbox manual (comentado) que confirma URL `http://52.67.203.133:4306/api/auth` + path `/validate` + payload com `idUser, loginUser, passwordUser, validarGrupo, validarLDAP`.

## Estrutura

### Endpoint

| Item | Valor | Vem de |
|---|---|---|
| Host | `{AppSettings:ServidorAutenticacao}` (default `52.67.203.133`) | `appsettings.json:24` |
| Porta | `4306` (hardcoded no SDK; **não vem de config**) | `AbstractBearerAuth.cs:118` |
| Path | `/api/auth/validate` (montado como `UrlBase=/api/auth` + `resource=validate`) | `AbstractBearerAuth.cs:118, 128` |
| Método | `POST` | `AbstractBearerAuth.cs:128` |
| Esquema | `http://` (plain HTTP — **não há TLS**) | `AbstractBearerAuth.cs:118` |
| Outras rotas no host | `GET /` → 404; `GET /api/auth/validate` → 405; nenhuma outra rota mapeada conhecida | probe 2026-05-16 |

### Headers da requisição (cliente → bridge)

| Header | Valor | Obrigatório? | Vem de |
|---|---|---|---|
| `Authorization` | `Bearer <jwt-HS256>` com identity `DirectorIdentity(1, "processa\\<sAMAccountName>", 1, "Processa")` assinada com `Consts.SecretKey` em ASCII bytes | **Não exigido pelo bridge** (probe sem header retornou 200) — o legado **sempre envia** por convenção do `HttpClient` | `AbstractBearerAuth.cs:122`, `TokenUtils.cs:24-49` |
| `Content-Type` | `application/json` | sim (Kestrel exige conforme `[Consumes]`/binding `[FromBody]`) | `AbstractBearerAuth.cs:123` |
| `Accept` | `application/json` | não | `AbstractBearerAuth.cs:124` |

### Body da requisição

**Formato wire**: JSON string literal — abre com `"`, fecha com `"`, conteúdo é o base64 do payload encriptado. Exemplo conceitual (sem rodar a cifra):

```
"AAAAAAAAAAAAAAAAAAAAAB+IV+ciphertext+base64+padding=="
```

(O `paramToken.ToJson()` no legado equivale a `JsonConvert.SerializeObject((string)paramToken)` que envolve a string em aspas + escapa `"` internos. Em base64 padrão `[A-Za-z0-9+/=]` não há `"` para escapar.)

**Payload claro (antes da cifra)** — JSON com 5 campos:

| Campo | Tipo | Valor | Semântica | Vem de |
|---|---|---|---|---|
| `idUser` | int | sempre `1` | Sentinela — não é usado para lookup; LDAP não tem identidade local | `AbstractBearerAuth.cs:108` |
| `loginUser` | string | identity completa **com domain** (ex.: `"processa\\<user>"`) | sAMAccountName + domain — bridge faz o split internamente | `AbstractBearerAuth.cs:109` (passa `user` cru) |
| `passwordUser` | string | senha em texto claro **dentro do envelope cifrado** | Vai cifrada (AES) então a senha nunca trafega em plaintext na rede | `AbstractBearerAuth.cs:110` |
| `validarGrupo` | string | nome do grupo AD a verificar (lido de `AppSettings:GrupoAD`) — pode ser vazio | Se vazio/null, bridge skipa verificação de grupo; se setado, deve aparecer em `memberOf` do user | `AbstractBearerAuth.cs:111`, `AbstractBearerAuth.cs:79` |
| `validarLDAP` | bool | sempre `false` no path canônico | Flag legacy — sentido exato no servidor é opaco (provável: `false` = não pular validação, contrato negativo; `true` reservado para outro fluxo) > **inferido** | `AbstractBearerAuth.cs:112` |

**Cifra**: AES-256-CBC, key = HMAC-SHA256(`Consts.SecretKey`, `Consts.SecretKey`) (32 bytes), IV = `Aes.Create().IV` (16 bytes aleatórios por chamada), output = `IV ‖ ciphertext` concatenado e base64-encoded. Sub-contrato [[processa-cryptography]] tem os passos formais + asserções de fidelidade.

### Resposta de sucesso (bridge → cliente)

| Item | Tipo | Vem de |
|---|---|---|
| HTTP status | `200 OK` (sempre — status semântico vive no body) | probe + `Response.cs:30` |
| `Content-Type` | `application/json` | probe |
| Body | `{ status:200, sucesso:true, dados:[<groupName>, ...] }` | `AbstractBearerAuth.cs:134-135` (`response.Dados as JArray`) |

`dados` é array JSON de strings, cada string sendo o nome do grupo AD ao qual o usuário pertence. O cliente joga isso direto em `DirectorIdentity.Grupos` (`IEnumerable<string>`). **Não há mais nada na resposta**: o bridge não retorna `id`, `nome` real, `email`, `dn`, `displayName` — só a lista de grupos. A identity construída no cliente é `(Id=1, Name=user-completo-com-backslash, CodEmpresa=1, NomeEmpresa="Processa", Grupos=<groups>)`.

### Resposta de erro (bridge → cliente)

| Cenário | HTTP | Body | Tratamento no cliente legado |
|---|---|---|---|
| Credencial inválida / falha LDAP genérica (probe confirmou shape) | `200 OK` | `{"status":500, "sucesso":false, "dados":"Ocorreu uma exceção ao tentar autenticar o usuário no AD"}` | `response.Sucesso==false` → `throw AuthenticationException("Token de autenticação inválido.")` → middleware emite `401 {status:401, sucesso:false, dados:"Falha na autenticação do usuário"}` |
| Body ausente ou JSON malformado (não envelopado como string) | `400 Bad Request` | `application/problem+json` com `errors.$` (`The input does not contain any JSON tokens`) e `errors.tkn` (`The tkn field is required`) — indica que o controller .NET tem binding `[FromBody] string` + presença de parâmetro `tkn` no schema de validação | Nunca observado pelo legado (cliente sempre envia body válido) |
| `GET` ao endpoint | `405 Method Not Allowed` + `Allow: POST` | vazio | Nunca observado pelo legado |
| Host inalcançável (timeout/connection refused) | `(sem resposta)` | — | `HttpClient.Send` lança após 5 tentativas com 1s entre cada (default `Attempts=5`); exceção propaga e middleware emite `401 "Falha na autenticação do usuário"` (mensagem genérica — não diferencia bridge-down de credencial-inválida) |
| Validação de grupo falha mas credencial OK | desconhecido — comportamento exato do bridge para `validarGrupo` setado + user válido não verificável sem credencial real | — | > **inferido**: provavelmente devolve `sucesso=true` com `dados=[]` (lista vazia) e cabe ao cliente decidir, OU `sucesso=false` com mensagem específica. Probe seguro impossível sem `processa\<user>` real (proibido por mandato) |

### Discriminação `IsLdapUser` (cliente decide se aciona bridge)

| Identity de entrada | É LDAP? | Decisão |
|---|---|---|
| `processa\<user>` | sim | chama bridge |
| `processa.com\<user>` | sim | chama bridge |
| `Processa\<User>` | sim (case-insensitive) | chama bridge |
| `<user>` (sem `\`) | não | cai em `AuthenticateLocal` (`AuthMiddleware`) ou em `AuthenticationException("Autenticação permitida somente para usuários internos.")` (`LDAPAuthMiddleware`) |
| `processa` (literal, sem `\`) | não-LDAP (caso especial) | desvia para `AuthenticateTempPassword` no `LDAPAuthMiddleware:31-34` |
| `vendedor@fornecedor.com` (com `@`) | não | `AuthenticateLocal` usa `AuthFornecedorAWSQuery` (vide [[portal-aws-bridge]] §3) |

### Side effects

| Item | Comportamento | Vem de |
|---|---|---|
| Sessão remota no bridge | **Nenhuma** — bridge é stateless. Sem cookie. Sem token. Sem refresh. | inferido da ausência de qualquer setter de cookie/header na resposta + `ProcessaLDAPAuth.cs:77` `Connection.Disconnect()` finally |
| JWT no retorno | **Não emitido pelo bridge**. O JWT é gerado **localmente pelo cliente** depois da validação (não está em `AuthenticateLdap`; é o middleware up-stack que pode emitir o JWT para o front depois) | `AbstractBearerAuth.cs:95-137` (nenhuma menção a JWT no retorno) |
| Auditoria | Não há evidência de log/audit no path do bridge. `Logger.Error` no SDK só registra falhas de bind no `ProcessaLDAPAuth:72` | `ProcessaLDAPAuth.cs:71-73` |
| Rate limit | Sem evidência. Bridge responde a probes consecutivos sem throttle observado | probe |

## Asserções observáveis

| # | Input | Output esperado | Regra de comparação | Fonte legado |
|---|---|---|---|---|
| A1 | identity contém `\` e prefixo case-insensitive `processa\` ou `processa.com\` (ex.: `processa\<user>`, `Processa.com\<User>`) | path resolvido = `ldap-bridge` (chama `AuthenticateLdap`) | `User.StartsWith("processa\\", IgnoreCase) \|\| User.StartsWith("processa.com\\", IgnoreCase)` | `Processa.Sdk.Auth/AbstractBearerAuth.cs:91-92` |
| A2 | identity = `processa` (literal sem `\`) | path resolvido = `temp-password` (não LDAP) — desvia para `AuthenticateTempPassword` | `LDAPAuthMiddleware.cs:31` (`User.Same("processa")` antes de `IsLdapUser`); cobre o caso "literal processa" como temp-password override | `Processa.Sdk.Auth/LDAPAuthMiddleware.cs:31-35` |
| A3 | identity sem `\` que não é literal `processa` (ex.: `<user>`) | `LDAPAuthMiddleware` → throw `AuthenticationException("Autenticação permitida somente para usuários internos.")`; `AuthMiddleware` (com fallback) → tenta `AuthenticateLocal` | `IsLdapUser()` retorna `false` por ausência do prefixo | `Processa.Sdk.Auth/LDAPAuthMiddleware.cs:36-39` + `AuthMiddleware.cs:36` |
| A4 | request ao bridge usa `POST http://{ServidorAutenticacao}:4306/api/auth/validate` | URL final é exatamente esse path; porta `4306` é hardcoded no SDK; host vem de env/config `ServidorAutenticacao` | `UrlBase = $"http://{Settings.Get(\"AppSettings:ServidorAutenticacao\")}:4306/api/auth"` + `resource="validate"` | `Processa.Sdk.Auth/AbstractBearerAuth.cs:118, 128` |
| A5 | request body ao bridge é uma JSON-encoded string (abre/fecha com aspas) contendo o base64 do payload cifrado | wire bytes: `"<base64>"` (com aspas literais); Content-Type `application/json` | `paramToken.ToJson()` envolve string em aspas; equivalente a `JSON.stringify(base64String)` | `Processa.Sdk.Auth/AbstractBearerAuth.cs:128` |
| A6 | payload claro (antes da cifra) é JSON com exatamente 5 campos | `{"idUser":1,"loginUser":"<identity>","passwordUser":"<password>","validarGrupo":"<group>","validarLDAP":false}` | ordem dos campos não é mandatória (JSON object) — basta os 5 nomes exatos com os valores certos | `Processa.Sdk.Auth/AbstractBearerAuth.cs:106-113` |
| A7 | `loginUser` no payload | identity **completa com domínio**, exatamente como veio no header `Authorization: Basic` antes do split — `processa\<user>` permanece `processa\<user>`, **não** vira só `<user>` | `var paramJson = new { ... loginUser = user, ... }` passa `user` cru (não o `name` do `Split` da linha 99) | `Processa.Sdk.Auth/AbstractBearerAuth.cs:99 vs 109` (split vai para o JWT do header, não para o payload) |
| A8 | `validarGrupo` no payload | string lida de `AppSettings:GrupoAD` no `Settings` do tenant; pode ser string vazia | `Settings.Get("AppSettings:GrupoAD")` direto | `Processa.Sdk.Auth/AbstractBearerAuth.cs:79, 111` |
| A9 | `validarLDAP` no payload | sempre literal boolean `false` (não `"false"` string) | hardcoded no objeto anônimo | `Processa.Sdk.Auth/AbstractBearerAuth.cs:112` |
| A10 | cifra do payload | AES-256-CBC com `Key = HMACSHA256(Consts.SecretKey, Consts.SecretKey)` (32 bytes), `IV = aleatório de 16 bytes por chamada`, padding PKCS7 (default do `Aes.Create()` no .NET), output `Convert.ToBase64String(IV ‖ ciphertext)` | smith porta para `node:crypto.createCipheriv('aes-256-cbc', key, iv)` + `Buffer.concat([iv, cipher.update(plain, 'utf8'), cipher.final()]).toString('base64')`. Sub-asserções formais em [[processa-cryptography]] | `Processa.Sdk.Api/Cryptography.cs:11, 26-34, 36-53` |
| A11 | header `Authorization` na request ao bridge | `Bearer <jwt>` com JWT HS256 assinado com `Encoding.ASCII.GetBytes(Consts.SecretKey)` (não UTF8), claim única `"identidade"=<DirectorIdentity.ToJson()>`, expira em 1 dia. **Probe deste contrato confirmou que o bridge NÃO exige esse header**; o legado o envia por convenção do `HttpClient`. Smith pode enviar ou omitir; recomenda-se enviar por compatibilidade com versões futuras do bridge | `TokenUtils.cs:24-49` para shape; probe 2026-05-16 para "não exigido" | `Processa.Sdk.Auth/AbstractBearerAuth.cs:103, 122` + `TokenUtils.cs:24-49` + probe |
| A12 | header `Content-Type` na request ao bridge | `application/json` (Kestrel rejeita sem isso ou com outro valor) | hardcoded | `Processa.Sdk.Auth/AbstractBearerAuth.cs:123` |
| A13 | bridge retorna 200 OK com `sucesso=true` | body JSON `{ "status": 200, "sucesso": true, "dados": [<grupoAD>, ...] }` onde `dados` é array de strings (nomes de grupos) | `response.Dados as JArray` no cliente; cliente lê apenas `dados` (ignora `status` quando `sucesso=true`) | `Processa.Sdk.Auth/AbstractBearerAuth.cs:129-135` + `Response.cs:8-23` |
| A14 | bridge retorna 200 OK com `sucesso=false` (credencial inválida / domínio inexistente / qualquer falha de bind) | body JSON `{ "status": 500, "sucesso": false, "dados": "<mensagem textual>" }`. Probe confirmou mensagem literal `"Ocorreu uma exceção ao tentar autenticar o usuário no AD"` para body cifrado garbage | cliente: `if (response is null \|\| !response.Sucesso) throw new AuthenticationException("Token de autenticação inválido.")` — resposta final para o caller HTTP do Studio é **401** com body `{status:401, sucesso:false, dados:"Falha na autenticação do usuário"}` (mensagem genérica do middleware, **não** vaza a mensagem original do bridge) | `Processa.Sdk.Auth/AbstractBearerAuth.cs:131-132` + `AbstractBearerAuth.cs:38-51` (catch genérico) + probe |
| A15 | bridge inalcançável (timeout > Timeout ou connection refused) | `HttpClient.Send` no legado retenta 5 vezes (`Attempts=5`) com 1s entre cada, depois lança `AttemptOverflowException`; middleware catch genérico responde **401** com `"Falha na autenticação do usuário"` (não diferencia de credencial inválida — defeito do legado) | smith no Studio deve **diferenciar**: emitir **502 aws-unreachable** (vide AwsBridgeError em F024) ao invés de 401 genérico, com sanitização do host:port na message (não vazar IP) | `Processa.Sdk.Clients/HttpClient.cs:38, 53, 79-124` + `AbstractBearerAuth.cs:38-51` |
| A16 | `dados` (array de grupos do AD) é populado em `identity.Grupos` no cliente legado, principal retornado é `DirectorPrincipal(identity)` com `identity = DirectorIdentity(Id=1, Name=<user-com-backslash>, CodEmpresa=1, NomeEmpresa="Processa")` | smith deve mapear principal do Studio como `{ id: 1, nome: <user-com-backslash>, codEmpresa: 1, nomeEmpresa: "Processa", grupos: <dados>, path: 'ldap-bridge' }`. **`Id=1, CodEmpresa=1` são sentinelas — não lookups reais**; preservar para compatibilidade legada | `Processa.Sdk.Auth/AbstractBearerAuth.cs:100, 134-136` |
| A17 | bridge é stateless — não emite cookie, não retorna JWT, não cria sessão remota | resposta tem apenas envelope `Response`; sem `Set-Cookie`, sem `Authorization` no response, sem refresh-token | probe + `AbstractBearerAuth.cs:128-136` |
| A18 | bridge aceita requisição sem header `Authorization` (sem JWT) | probe confirmou: `POST` com body válido sem header → 200 OK com erro semântico (mesmo shape de credencial inválida porque o body é garbage). Conclusão: middleware do bridge **não exige** Bearer. Smith pode omitir; recomenda-se enviar por defesa-em-profundidade | probe 2026-05-16T05:04Z (sem header → 200, conteúdo igual ao com header garbage) | probe + `AbstractBearerAuth.cs:122` |
| A19 | timeout total da request | legado: `Timeout=300` segundos (`HttpClient.Timeout` em segundos, passado ao curl como `--connect-timeout 300 --max-time 300`). 300s é **demasiado** para LDAP (bind real é tipicamente <1s); preservar limite é tolerável mas smith pode usar 5-10s no Studio sem risco | `Processa.Sdk.Auth/AbstractBearerAuth.cs:119` + `Processa.Sdk.Clients/HttpClient.cs:38, 252` |
| A20 | path canônico observável (assertion auditável end-to-end pelo ui-tester com `processa\<user>`) | (a) Studio recebe `Basic base64("processa\\<user>:<senha>")` em `POST /api/auth/login`; (b) detecta prefixo `processa\` (case-insensitive) → resolve para path `ldap-bridge`; (c) POSTa body `"<base64>"` ao bridge; (d) recebe 200 + `{sucesso:true, dados:[grupos]}`; (e) emite cookie `director_session` com principal `{id:1, nome:"processa\\<user>", codEmpresa:1, nomeEmpresa:"Processa", grupos:[...]}` e responde 200 ao cliente. Falha de credencial em (d) → resposta 401 ao cliente com `{error:"invalid-credentials"}`. Falha de rede em (c) → 502 com `{error:"aws-unreachable"}` (host:port sanitizado da message) | composição A1+A4..A18 | (consolida fontes acima) |

## ⚠️ Inércia legada

O contrato do legado embute uma série de decisões discutíveis que smith **deve preservar para fidelidade** mas curator deve estar ciente:

1. **Senha em texto claro dentro do envelope cifrado** — o payload tem `passwordUser=<plaintext>`; só a cifra AES protege em trânsito. Não há hash no cliente, não há challenge-response, não há TLS no transporte (HTTP plain). Toda a segurança depende do segredo compartilhado `Consts.SecretKey` (literal, 116 chars, mesmo em todos os deploys do legado).
2. **`Consts.SecretKey` é hardcoded** no binário do SDK — qualquer attacker com acesso ao DLL pode descriptografar o tráfego. Não há rotação, não há per-tenant key. O `STUDIO_AWS_JWT_SECRET` em F024/F049 é o mesmo segredo; LDAP bridge usa-o também (ver `Cryptography.cs` + `TokenUtils.cs:26` ambos usando `Consts.SecretKey`).
3. **`Id=1, CodEmpresa=1` sentinelas** — usuário LDAP nunca vira um `acesso.TBusuario` real; toda a sessão roda com identity dummy. ACL para usuário LDAP só pode funcionar via `Grupos` (lista de grupos AD), não via tabelas locais. Smith deve garantir que o engine ACL (F008) saiba lidar com `Id=1` como caso especial — ou o LDAP user vira "super-user implícito" (que é exatamente o que acontece hoje no legado para `processa` literal via temp-password).
4. **Heurística de domínio é textual** — só `processa\` e `processa.com\` são reconhecidos. Cliente que tente `PROCESSA\<user>` funciona (case-insensitive). Cliente que tente `processa.com.br\<user>` cai em `AuthenticateLocal`. Smith deve replicar exatamente os dois prefixos legados, não generalizar para "qualquer domain prefix".
5. **Mensagem de erro genérica** — cliente legado retorna `"Falha na autenticação do usuário"` para qualquer falha (credencial errada, bridge down, AD down, network split). Smith **deve diferenciar** (A15) — F024 já estabelece o padrão `AwsBridgeError` com sanitização.
6. **Hardcoded port 4306 no SDK** — `AppSettings:ServidorAutenticacao` configura host mas não porta. Se o bridge mudar de porta, é refactor no SDK (e no Studio se preservarmos a inércia). Smith pode escolher tornar a porta configurável via env `STUDIO_LDAP_BRIDGE_URL` sem quebrar paridade (basta default = `http://<env-host>:4306`).
7. **JWT de carona inútil** — o cliente legado gera JWT só para preencher header que o bridge não exige (A18). Custo CPU + dependência transitiva. Smith pode omitir; preservar é defesa-em-profundidade barata.
8. **HTTP plain, sem TLS** — qualquer sniffer na rota AWS↔tenant vê o tráfego. Mitigação real depende de VPN/PrivateLink, fora deste contrato. Smith preserva HTTP a menos que F049/wizard adicione `STUDIO_LDAP_BRIDGE_TLS=true`.
9. **`HttpClient` do SDK roda via `curl.exe` subprocess** — cada chamada faz fork de processo + grava body em arquivo temp em disco. Não é exigência de contrato; é detalhe interno do legado. Smith no Studio usa cliente HTTP nativo do Node sem perder fidelidade.

## Probe — comportamento observado (2026-05-16T05:04Z)

Probes feitos contra `http://52.67.203.133:4306` direto (sem VPN; bridge responde na internet pública), nenhum com credencial real:

| Probe | Resposta |
|---|---|
| `GET /` | `404 Not Found` (Kestrel, sem body) |
| `GET /api/auth/validate` | `405 Method Not Allowed` + `Allow: POST` |
| `POST /api/auth/validate` (sem body, sem header) | `400` + `application/problem+json` com `errors.$` (JSON required) + `errors.tkn` ("tkn field is required") — revela que controller .NET tem binding híbrido: `[FromBody] string` + parâmetro `tkn` em outra fonte (provavelmente query string `?tkn=`) |
| `POST /api/auth/validate` com body `"garbage"` (JSON string, sem header) | `200 OK` + `{"status":500,"sucesso":false,"dados":"Ocorreu uma exceção ao tentar autenticar o usuário no AD"}` |
| `POST /api/auth/validate?tkn=garbage` com body vazio | `400` (mesma estrutura de problem+json) |
| `POST /api/auth/validate?tkn=garbage` com body `"garbage"` | `200 OK` + mesmo envelope de falha que o de cima |
| `POST /api/auth/validate` com body `{"tkn":"garbage"}` | `400` ("JSON value could not be converted to System.String") — confirma que body é binding `string`, não objeto |
| `POST /api/auth/validate` com body `{}` | `400` (idem) |

**Conclusões do probe**:

- Bridge está vivo e responde da internet pública (não exige VPN para o controller HTTP — VPN talvez seja necessária só para o LDAP `dc1.processa.com` chegar ao DC, o que é problema do bridge, não do cliente).
- Server header `Kestrel` confirma .NET hosting.
- Body do path canônico é **JSON string** no body — não objeto.
- Há um parâmetro `tkn` no esquema do controller (sempre referenciado em mensagens de erro); o legado nunca o envia explicitamente como query/route, então deve ser um param opcional ou alternativo (uma variante de chamada onde `tkn` substitui o body). Smith deve usar o caminho canônico (body JSON string) por compatibilidade com o legado.
- Falha do bridge ao decifrar/processar produz **sempre** `status=500, sucesso=false, dados="Ocorreu uma exceção ao tentar autenticar o usuário no AD"` no HTTP 200 — não diferencia credencial errada de bridge interno quebrado de DC unreachable. Smith não consegue distinguir esses subcasos pelo wire.
- Não há rate limit observável em probes consecutivos.

## Sub-contratos

- [[processa-cryptography]] — algoritmo AES-256-CBC compartilhado por **três** caminhos do legado: (a) este bridge LDAP `paramToken`, (b) `TokenUtils.ValidateJWTToken` decrypt path (`TokenUtils.cs:97-101`), (c) qualquer chamada futura que use `new Cryptography().Encrypt/Decrypt`. Asserções de fidelidade nesse sub-contrato.

## Relações com o ecossistema

- Consome de: [[processa-cryptography]] (cifra) — compartilhado com **[[portal-aws-bridge]]** (mesma `Consts.SecretKey`, mas JWT da bridge AWS é apenas assinado, não cifrado).
- Pareado com **[[processa-auth-paths]]** (F003) — este contrato preenche o caminho `ldap-bridge` que ficou stubado como `501 not-implemented` no Studio (`apps/api/src/routes/auth.ts:377-388`).
- Pareado com **[[portal-aws-bridge]]** (F024) — outra bridge ao mesmo AWS (`52.67.203.133`), porta diferente (`5100` vs `4306`), propósito diferente (sync ERP↔cloud vs auth AD). Compartilham `Consts.SecretKey` mas não usam o mesmo endpoint nem o mesmo formato de wire.
- Procedures relacionadas: **nenhuma** — bridge LDAP não toca SQL no caminho síncrono. O AD é o backing store. (Quando o cliente cria identity dummy `Id=1`, não há `INSERT` no `acesso.TBusuario` — apenas a session/cookie do cliente carrega o estado.)
- Apps que montam `LDAPAuthMiddleware`: ADM (`Processa.ADM.Aplicacao`) — login interno via AD. Apps que montam `AuthMiddleware` (com fallback local): Director, AppBuilder, Director.Web — login híbrido (local + LDAP + JWT).
- Bridge **provavelmente** é o `Processa.Auth.AWS` ou similar (não está em `sources/` — é o único processo legado **não-portado** para o Studio que tem dependência `Novell.Directory.Ldap.NETStandard`). Não consta na lista de sources catalogadas; é serviço fechado rodando em AWS.

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- Cliente legado retenta 5× com 1s entre tentativas em erros de rede; smith pode preservar ou reduzir — não é contrato observável pelo bridge, é resiliência do cliente.
- O bridge não diferencia credencial inválida de bridge-em-falha (sempre 200 + `sucesso=false`). Smith no Studio só consegue mapear (i) network error → 502 aws-unreachable; (ii) HTTP 200 + sucesso=false → 401 invalid-credentials. **Não há terceira distinção possível** pelo wire.
- A porta 4306 é compartilhada pelo único endpoint observável `/api/auth/validate`. O controller .NET tem schema-validation que menciona param `tkn` — explorar essa variante exige credencial AD real e está fora do escopo deste contrato.
- Cifra usa IV aleatório por chamada — o output base64 é diferente a cada chamada para a mesma entrada. Smith **não pode cachear** o body cifrado entre tentativas (e nem deveria — senha do usuário não muda mas o `validarGrupo` pode variar entre middlewares).
- `Encoding.Default.GetString(symUnencryptedData)` no `Cryptography.Decrypt` (linha 72) usa o encoding default da plataforma (CP1252 em Windows pt-BR, UTF-8 em Linux). Para fidelidade no decrypt, smith deve usar UTF-8 (encoding correto do payload original) — `Encoding.Default` é bug latente do legado mas o cliente nunca chama `Decrypt` no path LDAP (só Encrypt). Sem impacto prático.

## Sources

- [[calendar/notes/2026-05-16.md]]
