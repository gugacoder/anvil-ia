Digere as notes brutas de `mind/calendar/notes/` em artigos de conhecimento no `mind/atlas/`.

Executa `node .systems/memory/scripts/kb/compile.js` a partir da raiz do workspace.

Aceita argumentos opcionais:
- `--all` — recompila tudo, mesmo notes já digeridas
- `--file <path>` — digere apenas uma note específica
- `--dry-run` — mostra o que seria digerido sem executar

Se nenhum argumento for passado, digere apenas notes novas ou alteradas.

Ao finalizar, reporte: quantas notes foram digeridas, quantos artigos existem no mind, e o custo.
