---
name: binary-ingest
description: "Contextualiza binário do inbox LYT: transcreve áudios, extrai texto de PDFs, analisa imagens, cria notas markdown vinculadas e move o binário para output/x/. Ao final chama note-polish na nota gerada. Use quando o usuário chamar /binary-ingest [arquivo] ou adicionar um binário em output/+/"
---

# binary-ingest — Contextualiza binário do inbox LYT

Processa um arquivo binário de `+/` (inbox do vault): extrai conteúdo, cria nota markdown e move o binário para `x/`.

O vault está em `output/` relativo à raiz do projeto (`D:/LYT-Analysis/`).

## Comportamento

Ao receber `/binary-ingest [arquivo?]`:

### 1. Identifica o arquivo

- Se `[arquivo]` foi passado: usa `output/+/[arquivo]`
- Se não: lista binários em `output/+/` (não-.md) e processa o único existente (se houver um só) ou pergunta qual

### 2. Roteamento por tipo

Identifica a extensão e segue a rota correspondente:

#### Áudio (mp3, wav, m4a, ogg, flac, aac, opus)

Usa a skill `whisper` (ver `~/.claude/skills/whisper/SKILL.md`):

```bash
curl -s -X POST http://localhost:6014/v1/audio/transcriptions \
  -F "file=@output/+/<arquivo>" \
  -F "model=Systran/faster-whisper-small" \
  -F "language=pt" \
  -F "response_format=verbose_json" \
  --max-time 300
```

- Salva transcrição como nota em `output/+/<nome-sem-ext>.md`
- Move áudio para `output/x/<arquivo>`
- Cria wikilink `![[x/<arquivo>]]` na nota gerada
- Chama `/note-polish` na nota gerada

#### PDF

Usa a skill `pdf` (ver `~/.claude/skills/pdf/SKILL.md`):

```bash
pdftotext "output/+/<arquivo>" -
```

**Decisão: textual ou visual?**
- Se extraiu texto legível (>200 chars úteis): é PDF textual
  - Salva conteúdo extraído como nota em `output/+/<nome-sem-ext>.md`
  - Move PDF para `output/x/<arquivo>`
  - Cria wikilink `[[x/<arquivo>]]` na nota
  - Chama `/note-polish` na nota
- Se texto vazio ou ilegível: é PDF visual (scanned, diagramático)
  - Analisa visualmente com Read tool (Claude lê imagem)
  - Descreve o conteúdo e cria nota de contexto em `output/+/<nome-sem-ext>.md`
  - Move PDF para `output/x/<arquivo>`
  - Cria wikilink `![[x/<arquivo>]]` na nota
  - Chama `/note-polish` na nota

#### DOCX (ver `~/.claude/skills/docx/SKILL.md`)

```bash
pandoc "output/+/<arquivo>" -t markdown --wrap=none
```

- Salva conteúdo convertido em `output/+/<nome-sem-ext>.md`
- Descarta o .docx (original preservado em `input/` se veio de lá)
- Chama `/note-polish` na nota

#### DOC legacy (ver `~/.claude/skills/doc/SKILL.md`)

- Extrai texto com antiword
- Salva em `output/+/<nome-sem-ext>.md`
- Chama `/note-polish` na nota

#### Imagem (png, jpg, jpeg, jfif, heic, webp, gif, bmp, tiff)

- **Analisa o conteúdo visual** com Read tool — descreve o que está na imagem
- **Verifica se tem texto legível** (screenshot, foto de documento, quadro branco):
  - Com texto: extrai e inclui na nota
  - Sem texto: descreve o contexto visual
- Cria nota de contexto em `output/+/<nome-sem-ext>.md`:
  ```markdown
  ![[x/<arquivo>]]
  
  [descrição do conteúdo visual / texto extraído]
  ```
- Copia imagem para `output/x/<arquivo>`
- Chama `/note-polish` na nota

#### Outros binários (vídeo, diagramas, executáveis, etc.)

- Copia para `output/x/<arquivo>`
- Cria nota mínima em `output/+/<nome-sem-ext>.md` com `![[x/<arquivo>]]` e breve descrição
- Chama `/note-polish` na nota

### 3. Revalidação — binário já existe em x/

Se o binário **já existe** em `output/x/` com o mesmo nome:
- **Não copiar novamente**
- Verificar se há alguma nota no vault que referencia `![[x/<arquivo>]]` ou `[[x/<arquivo>]]`
- Se não houver: criar a nota de contexto e chamar `/note-polish`
- Se houver: informar ao usuário que o binário já está integrado

### 4. Lost+Found

Se após análise não for possível entender o contexto do binário:
- Copia para `output/x/<arquivo>`
- Referencia em `output/Atlas/Maps/Lost+Found.md`:
  ```markdown
  - [[x/<arquivo>]] — [breve descrição do que foi observado]
  ```
- Cria o `Lost+Found.md` se não existir, com frontmatter básico

## Regra inviolável

**Nenhum binário em `output/x/` sem referência em nota markdown conectada ao Home.**

Sempre verificar, ao final, que existe pelo menos uma nota com `![[x/<arquivo>]]` ou `[[x/<arquivo>]]` no vault.

## Regras gerais

- **Input é read-only** — nunca tocar em `input/`
- **Inbox zero** — ao final, `output/+/` não deve conter o binário processado
- `/note-polish` é chamado ao final de toda rota — não duplicar a lógica de frontmatter aqui
- Se a skill `whisper` ou `pdf` não estiver disponível, informar o usuário e parar
