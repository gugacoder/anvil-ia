---
name: note-polish
description: "Otimiza nota do inbox LYT: enriquece conteúdo, gera frontmatter, cria wikilinks contextuais e move para a pasta correta do vault. Use quando o usuário chamar /note-polish [arquivo] ou pedir para processar uma nota em output/+/"
---

# note-polish — Otimiza nota do inbox LYT

Processa uma nota de `+/` (inbox do vault) e a integra ao vault LYT: reescreve, conecta e move.

O vault está em `output/` relativo à raiz do projeto (`D:/LYT-Analysis/`).

## Comportamento

Ao receber `/note-polish [arquivo?]`:

### 1. Identifica a nota

- Se `[arquivo]` foi passado: usa `output/+/[arquivo]`
- Se não: lista arquivos em `output/+/` e processa o único existente (se houver um só) ou pergunta qual

### 2. Varre o vault para contexto

Antes de escrever qualquer coisa, leia:
- `output/Atlas/Maps/` — MOCs existentes (nomes = temas mapeados)
- `output/Atlas/Dots/` — notas atômicas existentes (glob para nomes)
- `output/Efforts/` — esforços ativos/sleeping

Objetivo: identificar notas e MOCs que se conectam tematicamente ao conteúdo da nota.

### 3. Reescreve na voz da persona

- Lê `persona.md` (raiz do projeto) para calibrar voz
- Reescreve o conteúdo na primeira pessoa, como Guga Coder
- Não soa como IA — usa linguagem direta, reflexiva, com opinião
- Preserva a substância original; enriquece com conexões
- Injeta wikilinks contextuais no corpo: `[[Nota Relacionada]]`, `[[MOC Tema]]`

### 4. Gera frontmatter completo

```yaml
---
up: "[[MOC Pai]]"          # MOC mais próximo tematicamente
related: "[[Nota A]]"      # notas horizontalmente relacionadas (max 3-5)
created: YYYY-MM-DD        # data do arquivo original ou hoje
tags:
  - tema
in: "[[Collection]]"       # se pertence a uma collection (opcional)
---
```

Regras:
- Wikilinks no YAML **sempre** entre aspas duplas
- `up` aponta para MOC existente — se não existir MOC adequado, deixar vazio e criar o MOC no passo 5
- `related` aponta para Dots existentes no vault
- `created` usa a data de modificação do arquivo original se disponível

### 5. Determina destino e move

| Natureza da nota | Destino |
|---|---|
| Conhecimento atemporal, conceito, ideia | `output/Atlas/Dots/` |
| Reflexão datada, post, newsletter | `output/Calendar/Notes/YYYY-MM-DD/` |
| Evento, reunião, compromisso | `output/Calendar/Events/YYYY-MM-DD/` |
| Projeto ativo ou em andamento | `output/Efforts/On/` ou `Efforts/Simmering/` |

Move o arquivo de `output/+/` para o destino determinado.

### 6. Cria ou atualiza MOC se necessário

- Se já há 3+ Dots sobre o tema e não existe MOC: cria `output/Atlas/Maps/MOC [Tema].md`
- Se MOC existe: adiciona link para a nova nota (ou deixa o Dataview resolver via `up`)
- MOC usa callout + Dataview:

```markdown
> [!MAP] Tema
>
> ```dataview
> TABLE WITHOUT ID file.link AS "Nota", created AS "Criado"
> FROM "Atlas/Dots"
> WHERE up AND contains(up, [[MOC Tema]])
> SORT created ASC
> ```
```

### 7. Verifica alcançabilidade

Toda nota deve ser alcançável a partir de `output/Home.md`:
- Home → MOC → Dot: verificar que o MOC linkado em `up` está referenciado no Home
- Se não estiver, atualizar o Home ou o MOC pai

## Regras

- **Input é read-only** — nunca tocar em `input/`
- **Inbox zero** — ao final, `output/+/` não deve conter a nota processada
- **Wikilinks reais** — só linkar notas que existem no vault (verificar antes)
- **Não inventar MOCs** — MOC nasce do Mental Squeeze Point, não preventivamente
- **Voz autêntica** — se a nota soar como IA, reescrever
