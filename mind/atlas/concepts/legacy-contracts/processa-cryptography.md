---
title: "Processa.Sdk.Api.Cryptography — cifra simétrica AES-256-CBC"
aliases: [processa-cryptography, sdk-cryptography, aes-bridge, paramToken-cipher]
tags: [contract, legacy, cryptography, aes, sdk, sub-contract, director-studio]
sources:
  - "calendar/notes/2026-05-16.md"
created: 2026-05-16
updated: 2026-05-16
---

# Contrato: `Processa.Sdk.Api.Cryptography` (AES-256-CBC)

Cifra simétrica usada em **três** caminhos do legado para empacotar payloads sensíveis antes de cruzarem fronteiras de processo:

1. **LDAP bridge** — `AuthenticateLdap` empacota `{idUser, loginUser, passwordUser, validarGrupo, validarLDAP}` para POST ao bridge AWS:4306 (vide [[processa-auth-ldap-bridge]] A10).
2. **JWT crypto path** — `TokenUtils.ValidateJWTToken:97-101` tem fallback: se o token recebido não validar como JWT puro, tenta decifrar com `Cryptography.Decrypt` antes de re-tentar a validação. Permite que tokens cifrados (não só assinados) sejam aceitos. > **inferido** que algum cliente emita JWT envolto em cifra; não localizei o emissor em sources catalogadas.
3. **Reuso ad-hoc** — qualquer chamada futura `new Cryptography().Encrypt(...)` no SDK herda exatamente este algoritmo, com `Consts.SecretKey` como key seed default.

A cifra é AES em modo CBC com chave de 256 bits derivada de uma secret de 116 chars hardcoded (`Consts.SecretKey`) via HMAC-SHA256 (key=value=`SecretKey`), IV aleatório de 16 bytes por chamada concatenado no início do output, padding PKCS7 (default do `Aes.Create()` no .NET), tudo encapsulado em base64. Smith deve portar 1:1 para `node:crypto` — sem mudar key derivation, sem mudar mode, sem mudar IV layout, sem mudar encoding.

## Citações de fonte

- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:11` — `VetorSize = 16` (tamanho do IV em bytes — match com AES block size).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:12-13` — props `Key` (byte[]) e `Algorithm` (`Aes`).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:15-19` — ctor `(string key)`: deriva `Key` via `GetHashKeys(key)`; cria `Aes.Create()` (default `Mode=CBC, Padding=PKCS7, KeySize=256` no .NET 6+).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:20-25` — ctor `()` parameterless: usa `Consts.SecretKey` como seed.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:26-34` — `GetHashKeys(key)`: `rawKey = Encoding.UTF8.GetBytes(key)`; `sha2 = new HMACSHA256(rawKey)`; `return sha2.ComputeHash(rawKey)`. Output é 32 bytes (256 bits) — usado como AES key.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:36-53` — `Encrypt(entryText)`: `dataToProtectAsArray = Encoding.UTF8.GetBytes(entryText)`; cria encryptor com `Algorithm.CreateEncryptor(Key, aes.IV)` onde `aes = Aes.Create()` (nova instância só para obter IV aleatório); escreve via `CryptoStream` + `FlushFinalBlock`; concatena `aes.IV ‖ memoryStream.ToArray()`; retorna `Convert.ToBase64String(symEncryptedData)`.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:42` — `using var aes = Aes.Create()` é instância **só para extrair `aes.IV`** (gerado aleatoriamente pelo .NET no construtor). O `Algorithm` da própria classe é usado para criar o encryptor; ambos compartilham defaults (CBC/PKCS7/AES-256).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:49` — `symEncryptedData = aes.IV.Concat(memoryStream.ToArray()).ToArray()`: IV prefixado ao ciphertext (16 bytes seguidos de N bytes de ciphertext).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:51` — `Algorithm.Dispose()` no fim do Encrypt — defeito latente: instância da classe fica unusable após primeira chamada (`Algorithm` é singleton por instância de `Cryptography`; ao dispor, próxima chamada de `Encrypt` no mesmo `Cryptography` lança `ObjectDisposedException`). Cliente legado **cria nova instância de `Cryptography` por chamada** (`new Cryptography().Encrypt(...)` em `AbstractBearerAuth.cs:115`), contornando o defeito. Smith no Node não precisa replicar o bug.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:55-73` — `Decrypt(entryText)`: `Convert.FromBase64String`, primeiros 16 bytes vão para IV, restante é ciphertext; decryptor + CryptoStream; **`Encoding.Default.GetString(symUnencryptedData)`** (não UTF-8!) — bug latente: em Windows pt-BR seria CP1252, em Linux é UTF-8. Cliente legado Encrypt-only no path LDAP, então decrypt é exercitado apenas no JWT fallback (TokenUtils:101).
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Cryptography.cs:75-89` — `CheckKey(entryText)`: validador heurístico — tenta `Decrypt` com os primeiros 16 bytes como entrada e retorna `true` se não lança. Usado em `TokenUtils.ValidateJWTToken:97` para decidir se o token está cifrado.
- `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Consts.cs:34` — `SecretKey = "aAGoWJTMbnbarretinFWaORnBblzcsyMOYOHJxXLrprLaqcoroaJEYOBrCYnaGSRUpXtbNZazQeVrxqIlindotKJcFZzNgqBGnRIFslWNaGesmHkcLRVcm"` (116 chars ASCII).

## Estrutura

### Algoritmo Encrypt

| Passo | Operação | Valor / parâmetros | Vem de |
|---|---|---|---|
| 1 | derivar `key` a partir de `Consts.SecretKey` | `rawKey = UTF8.GetBytes(SecretKey)`; `key = HMAC-SHA256(rawKey, rawKey)` (chave = mensagem = rawKey); resultado de 32 bytes | `Cryptography.cs:26-34` |
| 2 | gerar `iv` | 16 bytes aleatórios (CSPRNG do SO via `Aes.Create()` que gera IV no construtor) | `Cryptography.cs:42, 43` |
| 3 | converter plaintext em bytes | `plain = UTF8.GetBytes(entryText)` | `Cryptography.cs:40` |
| 4 | cifrar | AES-256-CBC com `key` (passo 1), `iv` (passo 2), padding PKCS7; encrypt(`plain`) → `cipher` | `Cryptography.cs:43-48` (defaults do `Aes.Create()`) |
| 5 | concatenar | `output_bytes = iv ‖ cipher` (16 bytes + N bytes) | `Cryptography.cs:49` |
| 6 | encodar | `output = Base64.encode(output_bytes)` | `Cryptography.cs:52` |

### Algoritmo Decrypt

| Passo | Operação | Valor / parâmetros | Vem de |
|---|---|---|---|
| 1 | derivar `key` (mesmo de Encrypt) | idem passo 1 do Encrypt | `Cryptography.cs:26-34` |
| 2 | decodar base64 | `bytes = Base64.decode(entryText)` | `Cryptography.cs:57` |
| 3 | separar IV | `iv = bytes[0..16]` | `Cryptography.cs:59` |
| 4 | extrair ciphertext | `cipher = bytes[16..]` | `Cryptography.cs:60` |
| 5 | decifrar | AES-256-CBC com `key`, `iv`, PKCS7; decrypt(`cipher`) → `plain` | `Cryptography.cs:63-69` |
| 6 | decodar string | `result = Encoding.Default.GetString(plain)` — **bug**: deveria ser UTF-8. Em Windows pt-BR retorna CP1252, em Linux retorna UTF-8 (sem distorção quando bytes do plain são ASCII puro) | `Cryptography.cs:72` |

### Parâmetros canônicos (todas as chamadas legadas)

| Parâmetro | Valor | Vem de |
|---|---|---|
| Cipher | AES (Rijndael 128-bit block) | `Aes.Create()` |
| Mode | CBC | default de `Aes.Create()` |
| Padding | PKCS7 | default de `Aes.Create()` |
| Key size | 256 bits (32 bytes) | output de HMAC-SHA256 |
| Block size | 128 bits (16 bytes) | AES |
| IV size | 16 bytes | `VetorSize = 16` (`Cryptography.cs:11`) |
| IV source | CSPRNG do SO (`Aes.Create().IV`) | `Cryptography.cs:42-43` |
| IV location no output | prefixo (primeiros 16 bytes do output binário antes do base64) | `Cryptography.cs:49` |
| Plain encoding | UTF-8 | `Cryptography.cs:40` |
| Output encoding | Base64 standard (não URL-safe; alfabeto `[A-Za-z0-9+/]` com padding `=`) | `Convert.ToBase64String` no `Cryptography.cs:52` |
| Key seed | `Consts.SecretKey` (116 chars ASCII) | `Consts.cs:34` |

### Key derivation

```
rawKey   = UTF8.encode(SecretKey)                        # 116 bytes
hmacKey  = rawKey                                        # mesma coisa
hmacMsg  = rawKey                                        # mesma coisa
aesKey   = HMAC-SHA256(hmacKey, hmacMsg)                 # 32 bytes
```

Note: `HMACSHA256` em .NET usa o construtor `new HMACSHA256(rawKey)` que **adota `rawKey` como chave** do HMAC; depois `.ComputeHash(rawKey)` passa `rawKey` como mensagem. Resultado é determinístico — sempre o mesmo `aesKey` para a mesma `SecretKey`.

## Asserções observáveis (fidelidade Node ↔ .NET)

Cada asserção é validável com vetor de teste (smith deve criar um test fixture que cifre/decifre os mesmos inputs no Node e bata com o output do .NET legado).

| # | Input | Output esperado | Regra de comparação | Fonte legado |
|---|---|---|---|---|
| C1 | `aesKey = HMAC-SHA256(UTF8(Consts.SecretKey), UTF8(Consts.SecretKey))` | 32 bytes determinísticos. Hex esperado (calculado offline pelo smith no port; este contrato registra a **regra**, não o valor — smith documenta o hex no test fixture) | comparar byte-a-byte com `crypto.createHmac('sha256', secretKeyBuf).update(secretKeyBuf).digest()` no Node | `Cryptography.cs:26-34` |
| C2 | `Encrypt("hello")` chamado duas vezes consecutivas | dois outputs base64 **diferentes** (IV é aleatório) | `out1 !== out2` (asserção de não-determinismo) | `Cryptography.cs:42-49` |
| C3 | `Encrypt(text)` → base64 output | `Buffer.from(output, 'base64').length === 16 + ceil(UTF8.byteLength(text) / 16) * 16` (IV 16 bytes + ciphertext em múltiplos de 16 com PKCS7 padding) | comparação aritmética do tamanho | `Cryptography.cs:11, 49` + PKCS7 padding |
| C4 | round-trip Node-Node: `Decrypt(Encrypt(text)) === text` para `text in ["", "a", "ASCII text", "açúcar", "{\"idUser\":1,\"loginUser\":\"processa\\\\<user>\",\"passwordUser\":\"x\",\"validarGrupo\":\"\",\"validarLDAP\":false}"]` | identidade preservada | `assert.strictEqual` em cada caso | `Cryptography.cs:36-73` |
| C5 | round-trip cross-runtime: `Node.Decrypt(.NET.Encrypt(text)) === text` | identidade preservada. **Esta é a asserção crítica** — smith deve gerar 5+ ciphertexts no .NET legado (script Sandbox/Program.cs com inputs canônicos) e validar que o port Node descriptografa idêntico | comparar strings UTF-8 (não usar `Encoding.Default` no port — Node usa UTF-8 e isso é o correto) | `Cryptography.cs:36-73` |
| C6 | round-trip cross-runtime: `.NET.Decrypt(Node.Encrypt(text)) === text` (asserção espelhada) | identidade preservada | comparar no .NET após cifrar no Node | `Cryptography.cs:36-73` |
| C7 | `Encrypt(text)` no Node deve usar **padding PKCS7** explicitamente (Node default em `createCipheriv('aes-256-cbc', ...)` é PKCS7 — assert por completude) | output decifrável com `setAutoPadding(true)` | `decipher.setAutoPadding(true)` no decrypt | `Cryptography.cs:42` (default .NET) |
| C8 | IV layout no output | bytes `[0..16]` do `Buffer.from(output, 'base64')` ≡ IV usado pelo cipher | smith deve poder extrair IV do output e re-cifrar mesma plain → mesmo ciphertext (determinismo dado o mesmo IV) | `Cryptography.cs:49, 59` |
| C9 | `Encrypt(text)` aceita string vazia `""` | output válido (16 bytes IV + 16 bytes de padding PKCS7 puro = 32 bytes = 44 chars base64 com `=` padding) | `Buffer.from(Encrypt(""), 'base64').length === 32` | `Cryptography.cs:36-53` (sem early-return) |
| C10 | `Encrypt(text)` com `text` contendo caracteres não-ASCII (acentos pt-BR) | output decifrável produzindo a string original (UTF-8) | `Decrypt(Encrypt("ação")) === "ação"` (no port Node, **não** no .NET — lá o decrypt usa `Encoding.Default` e pode dar `aÃ§Ã£o` em Windows pt-BR) | `Cryptography.cs:40, 72` |
| C11 | output de `Encrypt` usa alfabeto base64 **standard** (não URL-safe) | regex `^[A-Za-z0-9+/]+=*$` | `Convert.ToBase64String` no .NET é standard; Node `Buffer.toString('base64')` também é standard | `Cryptography.cs:52` |
| C12 | `Decrypt` rejeita input que não seja base64 válido | lança erro/exceção; cliente legado captura em `CheckKey` (retorna `false`) | `try/catch` no port; não silenciar | `Cryptography.cs:75-89` |
| C13 | `Decrypt` com base64 cujo bytes têm < 16 bytes (sem IV) | lança erro (não há IV para extrair) | port deve falhar fast, não retornar string vazia | `Cryptography.cs:59-60` (Take/Skip em array curto retorna vazio; CryptoStream lança) |

## ⚠️ Inércia legada / defeitos

1. **Key derivation pobre** — HMAC(key, key) com a própria chave como mensagem é apenas um hash de `SecretKey` com extra step. Não há salt, não há iteração (PBKDF2 seria padrão). É efetivamente um SHA-256 fortalecido. Smith preserva exatamente (fidelidade), curator nota para hardening futuro.
2. **`SecretKey` hardcoded e compartilhada** — mesma chave em todos os tenants, todos os deploys, todos os caminhos (LDAP bridge, JWT signing, bridge AWS). Comprometimento total se o binário do SDK vazar.
3. **`Encoding.Default` no Decrypt** — bug latente que afeta strings com caracteres não-ASCII descriptografadas em hosts não-UTF8. Smith no Node usa UTF-8 (correto) — paridade quebra em casos com acentos só se o `.NET` os tiver cifrado e depois lido o resultado em Windows pt-BR. Caminho LDAP não exercita Decrypt no cliente, então sem impacto prático.
4. **`Algorithm.Dispose()` após cada Encrypt/Decrypt** — torna a instância da classe `Cryptography` single-use. Bug que o legado contorna criando nova instância por chamada (`new Cryptography().Encrypt(...)`). Smith no Node não tem analogia (cipher instances do `node:crypto` são single-use por padrão, sem precisar dispor).
5. **IV não autenticado** — modo CBC sem MAC (não é AES-GCM). Sem proteção contra tampering do ciphertext; um attacker pode flip-bits. Mitigação real depende do canal (HTTPS + JWT no header), mas o canal **é HTTP plain** (bridge LDAP). Smith preserva por fidelidade; curator nota.
6. **Sem versionamento** — não há byte de versão no header do ciphertext. Migrar para AES-GCM no futuro implica wire incompatible com legado.

## Sub-asserções relacionadas no contrato pai

- [[processa-auth-ldap-bridge]] A10 (cifra do payload LDAP) depende de C1+C5+C10 deste sub-contrato.
- [[portal-aws-bridge]] não usa esta cifra para o JWT (JWT é apenas assinado, não cifrado), mas usa a mesma `Consts.SecretKey` como chave HS256 — não é encrypt, é HMAC HS256 (vide `TokenUtils.cs:33` `HmacSha256Signature`).

## Relações com o ecossistema

- Consumido por: [[processa-auth-ldap-bridge]] (Encrypt do paramToken).
- Consumido por: `TokenUtils.ValidateJWTToken` fallback (Decrypt de tokens cifrados antes de re-validar JWT).
- Compartilha seed `Consts.SecretKey` com: [[portal-aws-bridge]] JWT (HS256 signing).
- Sem dependências externas em sources (não usa BouncyCastle, libsodium, etc. — apenas `System.Security.Cryptography.Aes` + `HMACSHA256` do BCL .NET).

## Notas de implementação para o Studio

Observações de comportamento (sem prescrever stack):

- Smith no Node deve gerar IV via CSPRNG (`crypto.randomBytes(16)`), não reutilizar IV entre chamadas.
- Smith deve usar UTF-8 em **ambas** as direções (encrypt input e decrypt output) — corrigindo o bug `Encoding.Default` do legado. Caminho LDAP é só Encrypt no cliente, então sem regressão observável.
- Smith deve criar test fixture com 3+ vetores cifrados no .NET (script no `Sandbox/Program.cs` legado, rodado em VM disponível, capturando outputs base64) e validar C5 antes do port ir pra produção. Sem C5 validado, paridade não está provada — é o teste-chave.
- O `STUDIO_AWS_JWT_SECRET` (env do Studio definido em F049) **deve** receber o valor literal de `Consts.SecretKey` para que: (a) o JWT que o Studio assina seja aceito pela bridge AWS, (b) o paramToken que o Studio cifra seja decifrado pela bridge LDAP. Reutilizar a env é correto e desejado.

## Sources

- [[calendar/notes/2026-05-16.md]]
