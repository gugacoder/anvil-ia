Processa os arquivos do inbox `mind/+/` e incorpora ao mind.

Executa `node .systems/memory/scripts/kb/ingest.js` a partir da raiz do workspace.

Aceita argumentos opcionais:
- `--all` — reprocessa todos os arquivos do inbox, ignorando o hash-tracking
- `--file <path>` — ingere um arquivo específico (relativo a `mind/+/` ou absoluto)
- `--dry-run` — mostra o que seria ingerido sem executar

Se nenhum argumento for passado, ingere apenas arquivos novos ou alterados.

O agente decide como processar cada arquivo com base nas ferramentas disponíveis (lê texto direto, invoca `pdftotext` via Bash pra PDFs, analisa imagens visualmente, transcreve áudios se houver whisper, etc.). Para cada arquivo, ele cria/atualiza artigos no wiki, preserva o binário em `mind/x/files/` se fizer sentido, e atualiza `mind/HOME.md` e o log do dia em `mind/calendar/system/YYYY-MM-DD/log-memory.md`.

Ao finalizar, reporte: quantos arquivos foram ingeridos, quais artigos foram criados/atualizados, quais binários foram preservados, e o custo total.
