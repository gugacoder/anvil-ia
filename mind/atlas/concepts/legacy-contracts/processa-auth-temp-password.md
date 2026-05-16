---
title: "Temp password — algoritmo offline TokenUtils.GenerateTempPassword/ValidateTempPassword"
aliases: [processa-auth-temp-password, temp-password, senha-temporaria, processa-user-temp, generateTemp, validateTempPassword, AuthenticateTempPassword]
tags: [contract, legacy, auth, temp-password, offline, cryptography, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Contrato: Temp password — algoritmo offline `TokenUtils.GenerateTempPassword/ValidateTempPassword`

A senha temporária do legado é o **único caminho de autenticação que dispensa rede** — não consulta `acesso.TBusuario`, não fala com o bridge LDAP, não toca em banco, não emite registro persistente. É um **token simétrico, autocontido e offline** cujo único insumo, além do plaintext em si, é a constante hardcoded `Consts.SecretKey` (118 caracteres ASCII; vide [[processa-cryptography]] §SecretKey-shared). Quem possui a `SecretKey` consegue **tanto gerar quanto validar** — não há assimetria, não há nonce server-side, não há revogação. O token vale enquanto seu timestamp embutido for futuro.

O algoritmo serve o usuário sentinela `processa` (caso especial; o `AuthMiddleware.GetIdentity` desvia para `AuthenticateTempPassword` quando `name.Same("processa")` — match case-insensitive via `StringExtensions.Same`). Em sucesso, **não há lookup no banco**: a identity é construída por sentinela fixa `DirectorIdentity(1, "processa", 1, "Processa")` com `Domain="Director"`. Em falha, o middleware traduz para HTTP 401 com mensagem genérica `"Falha ao validar o usuário [processa] com a senha temporária"` (via `ex.Source.Same("ValidateTempPassword")`).

A geração tem **dois pontos de exposição HTTP** no legado:

1. **`GET /api/auth/generateTemp?segundos=N`** (`EmbeddedController.GenerateTemp`) — registrado em todo app que embute o SDK; parâmetro em **segundos**.
2. **`GET /api/tools/passwordTemp/{expirationHours:int}`** (`ToolsController.GetTempPassword`, Processa.ADM) — parâmetro em **horas**, internamente multiplicado por 3600 antes de chamar `GenerateTempPassword`.

Em ambos os casos a resposta é um `Response` envelope cujo `Dados` é a string base64 do token. **Não há autenticação obrigatória para gerar** — `EmbeddedController.GenerateTemp` é exposto pelo pipeline do SDK e sua proteção depende de `Settings.IsOnWhiteList` (configuração por tenant); na prática, o caminho é tipicamente acessado por operador interno via ADM (que já está autenticado).

O algoritmo, em termos puramente observáveis:

- **Geração**: sorteia índice aleatório `r ∈ [0,100)` (uniforme via `new Random()` instanciado por chamada — não-determinístico, **um Random novo por chamada**, vide §Inércia legada), extrai `salt = SecretKey.Substring(r, 6)` (6 chars ASCII), encoda salt em ASCII bytes e codifica esses bytes em base64 (resulta em string de 8 caracteres base64). Extrai `separator = SecretKey.Substring(50, 7)` (7 chars ASCII, fixo: `OYOHJxX`). Calcula `expiry = DateTime.Now.AddSeconds(expireTime)` e formata como string `yyyy-MM-dd HH:mm:ss` no fuso/horário **local** do processo (não UTC; usa `DateTime.Now`). Concatena os três pedaços em **uma única string** (ordem: `base64Salt + separator + expiryString`), encoda essa string inteira em ASCII bytes e codifica em base64 de novo. Retorna a base64 externa. Em qualquer exceção, retorna **string vazia** (`""`) — não throw.
- **Validação**: recebe base64. Se nulo/vazio → `false`. `Convert.FromBase64String` desfaz a camada externa, `Encoding.ASCII.GetString` recupera o plaintext, faz `Split(separator)` onde `separator = SecretKey.Substring(50, 7)`. Pega `passwordSplited[0]` (a base64 do salt), faz `Convert.FromBase64String` + `Encoding.ASCII.GetString` → recupera `saltString` (6 chars). Confere `SecretKey.Contains(saltString)` — `Contains` literal substring (não regex, case-sensitive). Se não está contido → `false`. Senão, parseia `passwordSplited[1]` como `DateTime` via `DateTime.Parse` (cultura corrente do processo) e retorna `DateTime.Now < parsed`. Qualquer exceção (base64 inválido, split com 0 elementos, parse falhou, etc.) → log de erro + retorna `null` (nullable). O caller em `AbstractBearerAuth.AuthenticateTempPassword` converte `null → false` via `?? false` antes de comparar, então **null e false geram exatamente o mesmo 401 com a mesma mensagem genérica**.

A `Cryptography` AES descrita em [[processa-cryptography]] **não é usada** neste caminho — temp password é base64 puro, não criptografia simétrica. A única coisa que ambos compartilham é a constante `Consts.SecretKey`.

## Citações de fonte

- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:131-150` — `GenerateTempPassword(int expireTime)`: corpo completo, incluindo `try/catch` que retorna `""` em erro.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:135` — `new Random().Next(0, 100)`: instância de `Random` por chamada (sem seed), faixa `[0, 100)` (upper exclusive). Note que com `SecretKey.Length=118` e índice máximo 99, `Substring(99, 6)` é seguro (99+6=105 < 118).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:136` — `Consts.SecretKey.Substring(randomIndex, 6)`: salt = 6 chars a partir do índice sorteado.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:137` — `Encoding.ASCII.GetBytes(secret)`: salt → bytes ASCII (6 bytes).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:139` — `Consts.SecretKey.Substring(50, 7)`: separator = 7 chars fixos do offset 50.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:140-141` — interpolação string: `$"{Convert.ToBase64String(saltByteArray)}{splitedStringKey}{DateTime.Now.AddSeconds(expireTime):yyyy-MM-dd HH:mm:ss}"`. Ordem dos três pedaços: **base64(salt) + separator + expiry**. Timestamp em `DateTime.Now` (local time).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:142-143` — `Encoding.ASCII.GetBytes(passwordFormated)` + `Convert.ToBase64String(...)`: segunda camada base64 (a externa, o que vai pro wire).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:145-149` — `catch (Exception ex) { Logger.Error(...); return ""; }`: retorno vazio em erro (não throw).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:157-177` — `ValidateTempPassword(string? passwordEncrypt)`: corpo completo.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:161` — `if (string.IsNullOrEmpty(passwordEncrypt)) return false;` — null/empty → `false` (não `null`).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:163-164` — `Convert.FromBase64String` + `Encoding.ASCII.GetString` + `.Split(Consts.SecretKey.Substring(50, 7))`. `Split(string)` em C#/.NET 6+ aceita string separator e retorna array; se separator não aparece, retorna array de 1 elemento (`passwordSplited[1]` no próximo passo lança `IndexOutOfRangeException` → catch externo → `null`).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:166-167` — `Convert.FromBase64String(passwordSplited[0])` + `Encoding.ASCII.GetString`: recupera saltString (6 chars). Se base64 do salt inválido → throw → catch → `null`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:169` — `if (!Consts.SecretKey.Contains(saltString)) return false;` — `string.Contains` em .NET 6 é **case-sensitive ordinal por default** (sem overload de `StringComparison` aqui).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:170` — `return DateTime.Now < DateTime.Parse(passwordSplited[1]);` — comparação em local time (consistente com `DateTime.Now` na geração). `DateTime.Parse` usa `CultureInfo.CurrentCulture` do processo.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:172-176` — `catch { Logger.Error(...); return null; }`: erro → retorna `null` (nullable bool).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:139-146` — `AuthenticateTempPassword(string? password)`:
  - linha 141: `if (string.IsNullOrEmpty(password)) throw new AuthenticationException("Senha temporária nula ou vazia.");`
  - linha 142: `var valid = TokenUtils.ValidateTempPassword(password) ?? false;` — coalesce de `null` para `false`.
  - linha 143-145: `return !valid ? throw new AuthenticationException("") { Source = "ValidateTempPassword" } : new DirectorIdentity(1, "processa", 1, "Processa") { Domain = "Director" };` — identity sentinela fixa em sucesso; exception com `Source="ValidateTempPassword"` em falha (mensagem vazia; o middleware externo traduz para mensagem genérica via `ex.Source.Same("ValidateTempPassword")`).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AbstractBearerAuth.cs:44-45` — `else if (ex.Source.Same("ValidateTempPassword")) message = "Falha ao validar o usuário [processa] com a senha temporária";` — tradução da mensagem 401.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/AuthMiddleware.cs:63` — `if (name.Same("processa")) return AuthenticateTempPassword(password);` — desvio para temp-password antes do query SQL. `name.Same("processa")` via `StringExtensions.Same` (case-insensitive trim, `string.Equals(..., CurrentCultureIgnoreCase)`).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/LDAPAuthMiddleware.cs:31-35` — caminho paralelo no LDAPAuthMiddleware: `else if (User.Same("processa")) { var identity = AuthenticateTempPassword(Password) ?? new GenericIdentity("dumb"); principal = new DirectorPrincipal(identity); }`. Note: aqui se `AuthenticateTempPassword` retornasse `null` (não retorna; ou throw ou identity), cairia em `GenericIdentity("dumb")` — caminho defensivo morto na prática.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Extensions/StringExtensions.cs:19-20` — `public bool Same(string? target) => string.Equals(source?.Trim(), target?.Trim(), StringComparison.CurrentCultureIgnoreCase);` — definição de `String.Same` (trim + case-insensitive cultura corrente).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Consts.cs:34` — `public const string SecretKey = "aAGoWJTMbnbarretinFWaORnBblzcsyMOYOHJxXLrprLaqcoroaJEYOBrCYnaGSRUpXtbNZazQeVrxqIlindotKJcFZzNgqBGnRIFslWNaGesmHkcLRVcm";` — 118 caracteres. Substring(50, 7) = `OYOHJxX`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Controllers/EmbeddedController.cs:59-61` — `[HttpGet("auth/generateTemp")] public ActionResult<Response> GenerateTemp([FromQuery] int segundos) => Actions.Respond(() => TokenUtils.GenerateTempPassword(segundos));` — endpoint público do SDK, parâmetro em segundos.
- `sources/engenharia--fabrica--dotnet--processa.ADM/Fontes/Processa.ADM.Aplicacao/Controllers/ToolsController.cs:16-21` — `[HttpGet("passwordTemp/{expirationHours:int}")] public ActionResult<Response> GetTempPassword([FromRoute] int expirationHours) { expirationHours *= 3600; return Actions.Respond(() => TokenUtils.GenerateTempPassword(expirationHours)); }` — endpoint do ADM, parâmetro em horas convertido para segundos.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Sandbox/Program.cs:759-760` — `var generate = TokenUtils.GenerateTempPassword(3600); var valid = TokenUtils.ValidateTempPassword(generate);` — fixture canônica de round-trip (gerar com 1h, validar imediatamente).

## Estrutura

### Plaintext interno (camada decodificada da base64 externa)

A string ASCII que resulta de `Encoding.ASCII.GetString(Convert.FromBase64String(token))` tem **três pedaços concatenados em ordem fixa, sem delimitador inicial nem terminador**. O delimitador entre `[1]` e `[2]` é o próprio `separator`. Não há delimitador entre `[0]` e `[1]` porque base64 só usa `[A-Za-z0-9+/=]` e o separator é puro ASCII alfabético — o `Split(separator)` localiza a fronteira pelo conteúdo do separator.

| Pedaço | Offset (chars) | Tamanho | Tipo | Semântica | Valores legais | Vem de |
|---|---|---|---|---|---|---|
| `[0]` salt base64 | 0..7 | **8 chars** | base64 ASCII | base64 de 6 bytes ASCII extraídos da `SecretKey` em índice aleatório | Sempre `^[A-Za-z0-9+/]{8}$` (não tem `=` porque 6 bytes → 8 chars base64 sem padding) | `SecretKey.Substring(randomIndex, 6)` com `randomIndex ∈ [0,100)` |
| `[1]` separator | 8..14 | **7 chars** | string ASCII literal | Constante derivada de `SecretKey.Substring(50, 7)` | Sempre exatamente `OYOHJxX` (case-sensitive) | `Consts.SecretKey.Substring(50, 7)` |
| `[2]` expiry | 15..33 | **19 chars** | string formatada | Timestamp de expiração em formato `yyyy-MM-dd HH:mm:ss` no fuso **local** do processo gerador | Sempre `^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$`; representa o momento em que o token deixa de valer | `DateTime.Now.AddSeconds(expireTime)` com formato fixo |

**Comprimento total do plaintext**: 8 + 7 + 19 = **34 caracteres ASCII** sempre.
**Comprimento do token base64 externo**: `ceil(34/3)*4 = 48` caracteres (com 2 chars de padding `==`). Exemplo de shape: `WVZyeHFJT1lPSEp4WDIwMjYtMDUtMTYgMDM6MDA6MDA=` (48 chars).

### Inputs

| Função | Parâmetro | Tipo | Obrigatório | Semântica | Faixa observada |
|---|---|---|---|---|---|
| `GenerateTempPassword` | `expireTime` | `int` | sim | Segundos até a expiração; somado a `DateTime.Now` para compor o timestamp embutido | Não validado (não tem clamp negativo, zero, ou superior). `int.MaxValue/3600` é o limite prático do `ToolsController` (horas → segundos overflow). Endpoint ADM mais comum: 1h, 4h, 24h. |
| `ValidateTempPassword` | `passwordEncrypt` | `string?` | sim (mas tolera null) | Token base64 conforme `GenerateTempPassword` produz | Qualquer string. `null` ou `""` → curto-circuito retorna `false`. |

### Outputs

| Função | Sucesso | Falha controlada | Falha não-controlada |
|---|---|---|---|
| `GenerateTempPassword` | `string` base64 de 48 chars (token) | n/a (não tem caminho "controlado de falha") | `""` (string vazia) — em qualquer exceção (catch genérico, log de erro) |
| `ValidateTempPassword` | `true` (não-expirado e salt válido) | `false` (input nulo/empty, salt não está na SecretKey, OU timestamp já passou) | `null` (qualquer exceção: base64 inválido, separator não encontrado e `passwordSplited[1]` out-of-range, parse de DateTime falhou, etc.) |
| `AuthenticateTempPassword` (wrapper) | `DirectorIdentity(1, "processa", 1, "Processa") { Domain = "Director" }` | `throw AuthenticationException("Senha temporária nula ou vazia.")` para input null/empty; `throw AuthenticationException("") { Source = "ValidateTempPassword" }` para `false`/`null` do `ValidateTempPassword` | (propaga das funções subjacentes) |

### Identity sentinela emitida em sucesso

| Campo | Valor | Tipo | Observação |
|---|---|---|---|
| `Id` | `1` | `int` | Hardcoded; **não consulta `acesso.TBusuario`**. Não há garantia de que `Id=1` mapeie para um usuário real "processa" em todos os tenants — é apenas o número sentinela. |
| `Nome` | `"processa"` | `string` | Literal lowercase. |
| `CodEmpresa` | `1` | `int` | Hardcoded. |
| `NomeEmpresa` | `"Processa"` | `string` | Literal (capitalizado). |
| `Domain` | `"Director"` | `string` | Setado via property initializer; identidade tratada como pertencente ao domínio Director do SDK (não AD `processa`). |
| `Grupos` | `[]` (default) | `IEnumerable<string>` | Não populado por este caminho — token temporário não carrega grupos AD. |
| `JWT` | (não setado) | `string?` | Diferente do caminho LDAP/local, **não há JWT associado** à identity sentinela criada por temp-password. Se o app quiser emitir um JWT subsequente, deve fazê-lo explicitamente via `TokenUtils.GenerateJWTToken(identity)`. |

## Asserções observáveis

| # | Input | Output esperado | Regra de comparação | Fonte legado |
|---|---|---|---|---|
| T1 | `name == "processa"`, `"PROCESSA"`, `" Processa "` ou qualquer variação de caixa/whitespace de `processa` | Path resolvido = `temp-password` (desvio para `AuthenticateTempPassword`) | `string.Equals(source?.Trim(), "processa", StringComparison.CurrentCultureIgnoreCase)` via `StringExtensions.Same` | `Processa.Sdk.Auth/AuthMiddleware.cs:63` + `Processa.Sdk.Api/Extensions/StringExtensions.cs:19-20` |
| T2 | `GenerateTempPassword(N)` com SecretKey K (=118 chars), `r = Random.Next(0,100)` | `Convert.ToBase64String(Encoding.ASCII.GetBytes(Convert.ToBase64String(Encoding.ASCII.GetBytes(K.Substring(r, 6))) + K.Substring(50, 7) + DateTime.Now.AddSeconds(N).ToString("yyyy-MM-dd HH:mm:ss")))` | Concatenação de bytes ASCII em ordem fixa `base64(salt) + separator + expiry`; segunda camada base64 sobre o todo | `Processa.Sdk.Auth/TokenUtils.cs:131-143` |
| T3 | `ValidateTempPassword(b64)` com `b64` gerado < 1s atrás por `GenerateTempPassword(3600)` mesma SecretKey | `true` | base64-decode externo → split por `K.Substring(50,7)` → 2 tokens; salt base64-decoded → 6 ASCII chars; `K.Contains(salt)` é `true`; `DateTime.Now < DateTime.Parse(passwordSplited[1])` é `true` | `Processa.Sdk.Auth/TokenUtils.cs:157-170` |
| T4 | `ValidateTempPassword(b64)` com timestamp embutido = `2020-01-01 00:00:00` (passado) | `false` | `DateTime.Parse("2020-01-01 00:00:00") < DateTime.Now` → expressão final retorna `false` | `Processa.Sdk.Auth/TokenUtils.cs:170` |
| T5 | `ValidateTempPassword(b64)` onde salt decodificado é `"XXXXXX"` (string que **não** é substring de `SecretKey`) | `false` | `Consts.SecretKey.Contains("XXXXXX")` é `false` → early return false | `Processa.Sdk.Auth/TokenUtils.cs:169` |
| T6 | `ValidateTempPassword(b64)` onde o plaintext interno **não contém** o separator `OYOHJxX` | `null` | `Split(separator)` retorna array de 1 elemento; `passwordSplited[1]` lança `IndexOutOfRangeException` → catch externo → `return null` | `Processa.Sdk.Auth/TokenUtils.cs:164-176` |
| T7 | `ValidateTempPassword(b64)` com base64 externo malformado (ex: `"not-base64!"`) | `null` | `Convert.FromBase64String` lança `FormatException` → catch externo → `return null` | `Processa.Sdk.Auth/TokenUtils.cs:163,172-176` |
| T8 | `ValidateTempPassword(null)` | `false` | `string.IsNullOrEmpty(passwordEncrypt)` → `true` → early return `false` (não `null`) | `Processa.Sdk.Auth/TokenUtils.cs:161` |
| T9 | `ValidateTempPassword("")` | `false` | mesmo early return de T8 | `Processa.Sdk.Auth/TokenUtils.cs:161` |
| T10 | `ValidateTempPassword(b64)` onde `passwordSplited[0]` não é base64 válido (ex: salt-bytes contém chars não-base64) | `null` | `Convert.FromBase64String(passwordSplited[0])` lança `FormatException` → catch → `null` | `Processa.Sdk.Auth/TokenUtils.cs:166,172-176` |
| T11 | `ValidateTempPassword(b64)` onde `passwordSplited[1]` não parseia como DateTime (ex: `"abc"`) | `null` | `DateTime.Parse` lança `FormatException` → catch → `null` | `Processa.Sdk.Auth/TokenUtils.cs:170,172-176` |
| T12 | `GenerateTempPassword(0)` chamado em wall-clock `t0` | Token cuja decodificação produz expiry = `t0.ToString("yyyy-MM-dd HH:mm:ss")` (segundo arredondado para baixo) | timestamp == `DateTime.Now` no instante da chamada | `Processa.Sdk.Auth/TokenUtils.cs:141` |
| T13 | `GenerateTempPassword(N)` chamado **dentro de um mesmo segundo wall-clock** N1 ≠ N2 vezes | Tokens **podem diferir** mesmo com N idêntico (salt é aleatório); ou **podem coincidir** se `Random.Next` retornar mesmo `r` e segundo for o mesmo | salt = `SecretKey.Substring(Random.Next(0,100), 6)` — não-determinístico | `Processa.Sdk.Auth/TokenUtils.cs:135-136` |
| T14 | `GenerateTempPassword(expireTime)` lançando exceção interna (ex: simulando `Encoding.ASCII.GetBytes` em situação anômala) | `""` (string vazia) — **não** throw | `catch (Exception ex) { Logger.Error(...); return ""; }` | `Processa.Sdk.Auth/TokenUtils.cs:145-149` |
| T15 | Senha válida → `AuthenticateTempPassword(password)` | `DirectorIdentity(Id=1, Nome="processa", CodEmpresa=1, NomeEmpresa="Processa"){ Domain="Director" }`; **sem `JWT` populado**; `Grupos` vazio | sentinela fixa hardcoded; identity **não consulta `acesso.TBusuario`** | `Processa.Sdk.Auth/AbstractBearerAuth.cs:145` |
| T16 | `AuthenticateTempPassword(null)` ou `AuthenticateTempPassword("")` | `throw AuthenticationException("Senha temporária nula ou vazia.")`; **sem `Source`** setado | `string.IsNullOrEmpty(password)` antes de chamar `ValidateTempPassword` | `Processa.Sdk.Auth/AbstractBearerAuth.cs:141` |
| T17 | `AuthenticateTempPassword(badPassword)` onde `ValidateTempPassword` retorna `false` OU `null` | `throw AuthenticationException("") { Source = "ValidateTempPassword" }` (mensagem vazia, Source não-vazio) | `?? false` coalesce; pipeline externo traduz mensagem via `Source.Same("ValidateTempPassword")` | `Processa.Sdk.Auth/AbstractBearerAuth.cs:142-144` |
| T18 | Exception com `Source="ValidateTempPassword"` chega no `InvokeAsync` do middleware | HTTP 401, body `{ Status: 401, Dados: "Falha ao validar o usuário [processa] com a senha temporária" }`; mensagem **idêntica** para senha errada, senha expirada, salt inválido, base64 inválido (não distingue causa) | `else if (ex.Source.Same("ValidateTempPassword")) message = "Falha ao validar o usuário [processa] com a senha temporária";` + envelope `Response` serializado | `Processa.Sdk.Auth/AbstractBearerAuth.cs:38-50` |
| T19 | `GET /api/auth/generateTemp?segundos=3600` (SDK embedded) | HTTP 200 com envelope `Response { Status=200, Sucesso=true, Dados=<base64Token> }` | `EmbeddedController.GenerateTemp` chama direto `TokenUtils.GenerateTempPassword(segundos)` via `Actions.Respond` | `Processa.Sdk.Controllers/EmbeddedController.cs:59-61` |
| T20 | `GET /api/tools/passwordTemp/4` (Processa.ADM) | HTTP 200 com envelope `Response { Dados=<base64Token> }` onde o token interno tem `expiry = DateTime.Now.AddSeconds(4*3600)` (4h) | `ToolsController.GetTempPassword` multiplica `expirationHours *= 3600` antes de chamar `GenerateTempPassword` | `Processa.ADM.Aplicacao/Controllers/ToolsController.cs:16-21` |
| T21 | Round-trip canônico: `var t = GenerateTempPassword(3600); var v = ValidateTempPassword(t);` | `v == true` (não-null, não-false), executado imediatamente | comportamento exercitado em sandbox legado | `Processa.Sdk/Sandbox/Program.cs:759-760` |
| T22 | Tokens gerados em **dois processos diferentes** com SecretKey idêntica e fuso horário local idêntico | Mutuamente válidos: token gerado pelo processo A valida `true` no processo B (e vice-versa) enquanto não-expirado | Não há nonce server-side, sessão ou state — algoritmo é puramente determinístico sobre `(SecretKey, DateTime.Now, randomIndex)` | `Processa.Sdk.Auth/TokenUtils.cs:131-177` (ausência de state) |
| T23 | Mesmo token usado **N vezes** dentro da janela de validade | Sempre `true` (re-utilizável até expirar) | Não há "consumed" flag, sem revogação, sem rate-limit no algoritmo | `Processa.Sdk.Auth/TokenUtils.cs:157-177` (ausência de state) |
| T24 | `name.Same("Processa  ")` (com trailing whitespace) chega no `AuthMiddleware.GetIdentity` | Desvia para `AuthenticateTempPassword` (T1 case) | `Same` faz `Trim` antes de comparar | `Processa.Sdk.Api/Extensions/StringExtensions.cs:19-20` |
| T25 | `LDAPAuthMiddleware` recebe `User="processa"` (sem `\`) e `Password=tempToken` | Mesmo caminho: chama `AuthenticateTempPassword(Password)` | `else if (User.Same("processa")) { var identity = AuthenticateTempPassword(Password) ?? new GenericIdentity("dumb"); ... }` — paridade com `AuthMiddleware` | `Processa.Sdk.Auth/LDAPAuthMiddleware.cs:31-35` |

## Sub-contratos relacionados

- [[processa-cryptography]] — compartilha `Consts.SecretKey` (118 chars; offset 50..56 = `OYOHJxX` é o separator usado aqui; restante é o pool de salts possíveis). **Mas o AES de `Cryptography.cs` não é chamado neste caminho** — temp password é base64 puro, sem cipher simétrico.
- [[processa-auth-ldap-bridge]] — caminho **paralelo, mutuamente exclusivo**. O discriminador é `IsLdapUser()` (presença de `\` no user); usuário `processa` literal sempre cai em temp-password antes do bridge ser tentado.

## Relações com o ecossistema

- **Consome de**: `Consts.SecretKey` (constante hardcoded no SDK, mesma para todos os tenants Director/ADM/AppBuilder). Não consome banco, não consome rede, não consome filesystem.
- **É consumido por**:
  - `AuthMiddleware.GetIdentity` (Portal.Director, AppBuilder, etc. que embutem `Processa.Sdk.Auth`) — desvio para `AuthenticateTempPassword` quando `name.Same("processa")`.
  - `LDAPAuthMiddleware.BuildPrincipal` (apps onde a única forma de auth é LDAP + temp-password override) — mesmo desvio.
  - `EmbeddedController.GenerateTemp` em `GET /api/auth/generateTemp?segundos=N` (qualquer app que embute o SDK).
  - `ToolsController.GetTempPassword` em `GET /api/tools/passwordTemp/{hours}` (Processa.ADM, exclusivo).
- **Não consome / não dispara**: nenhum `acesso.TBusuario`, `acesso.TBempresa`, log de auditoria persistente, email, SMS, push, fila. **Não há registro de geração nem de uso** — token usado N vezes deixa zero rastro além das mensagens de `Logger.Error` em caminho de falha.
- **UI relacionada (mandato Designer, não escavado aqui)**: ADM expõe um botão "Gerar senha temporária" — descrição UX vive em [[processa-adm-tool]].

## Notas de implementação para o Studio

(Notas curtas de **comportamento observável**; nada de stack/lib/pattern.)

- O caller do path Studio deve retornar **idêntica mensagem 401** para todas as causas de falha — distinguir base64 inválido de expirado de salt-fora-da-SecretKey viola o contrato legado (T18 unifica).
- Identity emitida **não tem `JWT` populado**; se o app Studio quiser sessão JWT subsequente, é decisão do app (não do contrato do legado).
- `Random` é re-instanciado por chamada, sem seed — comportamento de geração tem entropia limitada (100 valores possíveis de `randomIndex`) e **dois processos gerando no mesmo instante podem produzir tokens idênticos**. Não é colisão problemática na prática (token ainda valida), mas explica por que round-trip pode coincidir entre processos.

## ⚠️ Inércia legada

Sinais de "vício do legado" — registrados sem prescrição. Decisão de manter/corrigir é do principal, não deste contrato.

- **SecretKey hardcoded e compartilhada entre todos os tenants** (`Consts.SecretKey` é `const string` em `Processa.Sdk.Api/Consts.cs:34`, mesmo binário em todos os deploys). Quem tem o source do SDK consegue gerar tokens válidos para qualquer instalação. Não há derivação por tenant, por instalação, por ambiente.
- **Salt de 6 chars com pool de 100 posições** (`Random.Next(0,100)`, `Substring(r, 6)` numa SecretKey de 118 chars). Entropia ~100 valores possíveis — não é segredo criptográfico, é só prova de "veio do mesmo SecretKey".
- **Token é base64, não ciphertext.** Plaintext é trivialmente recuperável: `atob(token)` revela salt+separator+expiry diretamente. **Qualquer pessoa que intercepte o token consegue ver o timestamp de expiração**. Não há HMAC, não há assinatura — só "salt deve ser substring de SecretKey", que é verificável só com o SecretKey.
- **Timestamp em horário local não-zonado** (`DateTime.Now`, formatação sem offset). Servidores em fusos diferentes geram tokens com semântica de tempo divergente. Container/serverless sem TZ configurado defaulta UTC → token gerado lá tem timestamp "no passado" do ponto de vista de servidor em São Paulo (`UTC-3`), e vice-versa. Não há mitigação no legado.
- **`Random` sem seed por chamada**: `new Random()` em .NET 6 já tem seed thread-safe automático, mas a entropia útil é mínima (100 valores).
- **Token reutilizável N vezes** (T23) — não há "consumed" flag. Token interceptado pode ser replayed enquanto não expira.
- **Mensagem 401 indistinguível** entre senha errada e bug (T18). Bom para segurança (não vaza causa), ruim para diagnóstico — operador pedindo suporte recebe a mesma string que o atacante.
- **`Convert.FromBase64String` é leniente em .NET 6+** quanto a whitespace e padding, mas estrito quanto a chars fora `[A-Za-z0-9+/=]`. Comportamento exato em padding malformado depende da versão runtime — não auditado em campo, só pelo source.
- **`GenerateTempPassword` retorna `""` em erro** (T14) em vez de throw. Caller que use o retorno sem checar pode passar string vazia adiante (e.g., gravar em log), mascarando o erro real (que só vai pro `Logger.Error`).
- **`ValidateTempPassword` retorna `null` (não `false`) em erro de parsing** (T6, T7, T10, T11). O caller `AuthenticateTempPassword` coalesce com `?? false`, mas o tipo `bool?` exposto sugere "tri-state" que na prática nunca é diferenciado pelo middleware.
- **`AuthenticateTempPassword` lança `AuthenticationException` com mensagem vazia** (T17) — depende exclusivamente de `Source="ValidateTempPassword"` para o middleware traduzir. Se outro código consumir essa exception fora do middleware do SDK, vê string vazia.

## Sources

- [[calendar/notes/2026-05-16.md]]
