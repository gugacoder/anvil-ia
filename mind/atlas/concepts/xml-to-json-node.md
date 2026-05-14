# XmlToJsonNode — conversor XML→JSON da plataforma

> Convenção interna da Processa para controlar a geração de JSON a partir de XML, contornando duas limitações das bibliotecas padrão do .NET / Newtonsoft.JSON:
> 1. Todos os valores virariam **string** (sem tipo numérico, decimal, booleano).
> 2. A geração default de _arrays_ pelo Newtonsoft descarta a tag raiz, usando só as filhas.

Usado pelo `Pipeliner` no ato do envio da requisição — XML produzido pelo SQL (via `FOR XML PATH`) é convertido para JSON antes de ser despachado.

## Onde vive no source

- **Implementação**: classe `XmlExtensions`, métodos `XmlToJsonNode(string)` e `XmlStringToJson(string, bool)`. Não está em `sources/` (provavelmente lib compartilhada / NuGet interno).
- **Pontos de uso conhecidos**:
  - `sources/engenharia--fabrica--dotnet--pipeliner/Fontes/Pipeliner.Service/RequestService.cs:241-242`
  - `sources/engenharia--fabrica--dotnet--pipeliner/Fontes/Sandbox/Program.cs`
  - `sources/engenharia--fabrica--dotnet-core--director/Fontes/PortalDirector.Repositories/Repository.cs`
- **UI de teste**: `Processa.ADM` → `Ferramentas` → `Conversor XML/JSON`. Permite visualizar a conversão antes de plugar no Pipeliner. Disponível a partir da versão **v1.1.0-028** do Processa.ADM.
  - URL interna: `http://52.67.203.133:6300`
  - Login: usuário de rede com prefixo `processa/` (ex.: `processa/joaolucas`) + senha de rede.

## Atributos especiais reconhecidos

Nomes de atributos e valores são **case-insensitive**.

### `Type` — define tipo do valor (default: string)

| Valor | Resultado JSON |
|-------|----------------|
| `Int` / `Integer` | inteiro |
| `Decimal` / `Double` | decimal (preserva casas) |
| `Bool` / `Boolean` | booleano |

```xml
<id type="integer">1</id>           → "id": 1
<valor type="decimal">1.987</valor> → "valor": 1.987
<ativo type="bool">false</ativo>    → "ativo": false
```

### `Array="true"` — primeiro filho marcado vira array

Marcando o **primeiro** filho de um nó com `Array="true"`, o nó pai é convertido para array JSON. Por padrão, a tag raiz é **omitida**.

```xml
<root>
  <row array="true"><id>1</id></row>
  <row><id>2</id></row>
</root>
```
→ `[ { "id": "1" }, { "id": "2" } ]`

#### `Omitir="false"` — preservar a tag raiz no array

```xml
<row array="true" Omitir="false">...</row>
```
→ `{ "row": [ ... ] }`

#### Array de valores simples (não objetos)

Valores ficam direto como conteúdo das tags filhas:

```xml
<root>
  <row array="true">imagem1.png</row>
  <row>imagem2.png</row>
</root>
```
→ `[ "imagem1.png", "imagem2.png" ]`

### Objetos aninhados

Sem atributo especial — aninhamento XML vira aninhamento JSON natural.

## Geração via TSQL (`FOR XML PATH`)

Padrões para emitir XML que o conversor entenderá:

- **Tipo de coluna**: `SELECT 'Int' AS 'Id/@Type', Id AS Id, ...`
- **Marcar array**: `SELECT 'True' AS '@Array', ...` (precisa estar no primeiro registro)
- **Array de valores simples**: subquery com `Coluna AS [text()]` e `FOR XML PATH, ROOT('NomeRoot'), TYPE` (PATH vazio).
- **Array de objetos aninhado**: subquery com `FOR XML PATH('Item'), ROOT('Items'), TYPE`.

Exemplo combinado (array de objetos com tipos):

```sql
SELECT 'True' AS '@Array'
     , 'Int' AS 'Id/@Type', Id AS Id
     , Nome AS Nome
     , 'Bool' AS 'Ativo/@Type'
     , CASE WHEN Ativo = 1 THEN 'true' ELSE 'false' END AS Ativo
  FROM Cliente WITH(NOLOCK)
   FOR XML PATH('Row'), ROOT('Root'), TYPE
```

## Onde isso importa para mim

- Quando ler SQL em `sources/engenharia--fabrica--sql--*` que termina em `FOR XML PATH`, lembrar que o destino provável é o conversor — `@Array`, `@Type`, `Omitir` no SELECT não são bugs, são metadados do conversor.
- Quando ler chamadas `XmlExtensions.XmlToJsonNode(...)` / `XmlStringToJson(...)`, são o ponto onde o XML do banco vira o JSON da requisição/resposta.
- Para validar uma conversão sem rodar pipeline inteiro: usar o Conversor XML/JSON do Processa.ADM.

## Alternativa em estudo

Hipótese aberta (2026-05-13): se os XMLs estiverem em pasta de rede acessível pelo DBdirector, importar direto via procedure — Pipeliner vira só agendador de uma procedure sem parâmetros. Detalhes e perguntas pendentes em [[2026-05-13]]. **Quando o assunto voltar, inquirir o analista** (instrução explícita do usuário).

## Relacionados

- [[pipeliner]] (quando existir)
- [[processa-adm]] (quando existir)
