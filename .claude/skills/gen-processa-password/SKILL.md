# Skill: Gerar senha Processa

## Quando usar

Quando o usuário pedir uma "senha temporária", "temp password", "senha do PROCESSA", "senha pra logar como processa", "gerar temp", "gen processa password", ou variantes — para entrar em qualquer app do ecossistema Processa (legado ou Studio) com identity=`processa`.

Invocação típica: `/gen-processa-password [horas]`.

## O que ela faz

Gera uma senha temporária **offline** seguindo o algoritmo legado `TokenUtils.GenerateTempPassword` (`sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Auth/TokenUtils.cs:131`).

**100% local**: usa apenas a `Consts.SecretKey` literal (118 chars) + `Date.now()`. Não bate em rede, não precisa de VPN, não precisa de DB.

A senha gerada é aceita por **qualquer app** que carregue a mesma `Consts.SecretKey` — Director.Web, Portal, WMS, AppBuilder, ADM e Studio (quando F068 estiver implementado).

## Algoritmo (paridade com legado)

```
randIdx     = inteiro aleatório [0, 99]
salt        = SecretKey.Substring(randIdx, 6)   // 6 chars do índice random
separator   = SecretKey.Substring(50, 7)        // 7 chars fixos
timestamp   = (now + horas) formatado "yyyy-MM-dd HH:mm:ss"
plaintext   = salt + separator + timestamp      // ASCII concatenado
senha       = base64( ASCII bytes do plaintext )
```

## Como executar

1. **Localize a SecretKey corrente.** Procure nesta ordem:
   - `workspace/director-studio/.env` chave `STUDIO_AWS_JWT_SECRET` ou `JWT_SECRET`.
   - Se não houver, leia do source legado canônico: `sources/engenharia--fabrica--dotnet--processa.sdk/Fontes/Processa.Sdk.Api/Consts.cs` linha do `public const string SecretKey`.
   - Se ambos faltam, **pare** e reporte ao usuário — sem chave não gera.

2. **Determine a validade.** Padrão **24 horas** se o usuário não disser nada. Se passou um número como argumento (`/processa-temp-password 2`), use como horas. Se a duração é absurda (>168h ou <=0), use 24 como fallback e avise.

3. **Gere a senha** via script `.tmp/processa-temp-pw.mjs` (cria ou reusa):

```js
import { writeFileSync } from 'node:fs'

const SECRET = process.argv[2]
const HOURS = Number(process.argv[3] ?? 24)

if (!SECRET || SECRET.length < 57) {
  console.error('SecretKey ausente ou curta demais (precisa >= 57 chars)')
  process.exit(1)
}

const randIdx = Math.floor(Math.random() * 100)
// .NET Substring(start, length) — equivalente ao slice JS:
const salt = SECRET.substring(randIdx, randIdx + 6)
const separator = SECRET.substring(50, 50 + 7)

const now = new Date(Date.now() + HOURS * 3600 * 1000)
const pad = (n) => String(n).padStart(2, '0')
const timestamp =
  `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())} ` +
  `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`

const plaintext = salt + separator + timestamp
const password = Buffer.from(plaintext, 'ascii').toString('base64')

console.log(password)
console.log(`expira em: ${timestamp} (${HOURS}h)`)
```

Invoque: `node .tmp/processa-temp-pw.mjs "<SECRET>" <HORAS>`.

4. **Apresente o resultado** ao usuário em formato copy-friendly:

```
identity: processa
senha:    <base64>
expira:   YYYY-MM-DD HH:MM:SS (Nh)
```

Sem emojis, sem markdown decorativo. Bloco simples.

## Notas de validação

A senha é aceita por **AbstractBearerAuth.AuthenticateTempPassword** → **TokenUtils.ValidateTempPassword** no SDK legado:

1. base64-decode → string ASCII
2. split pelo `separator` (substring fixa da chave)
3. verifica se o `salt` aparece como substring na `SecretKey`
4. confere `DateTime.Now < parsed(timestamp)`

Validação **100% local** no app destino também — não precisa coordenar nada.

## Proibições

- **NÃO** chame nenhum endpoint remoto (`52.67.203.133:*`, `dc1.processa.com`, etc). O algoritmo é offline; chamar rede é bug.
- **NÃO** persista a senha gerada em arquivo committado (nem em `mind/`, `workspace/`, nem em `progress-messages.txt`). Pode escrever em `.tmp/` (gitignorado).
- **NÃO** revele a `SecretKey` no output — só a senha gerada.
- **NÃO** envolva isso em wave do `/dwave`. É operacional, não feature.

## Argumento opcional

- `/gen-processa-password` → 24 horas (default)
- `/gen-processa-password 1` → 1 hora
- `/gen-processa-password 8` → 8 horas
