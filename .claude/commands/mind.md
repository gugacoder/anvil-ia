Mostra o status do mind (knowledge base do agente) e os comandos disponíveis.

Passos:
1. Conte os artigos em `mind/atlas/concepts/`, `mind/atlas/connections/`, `mind/atlas/qa/`
2. Conte as notes em `mind/calendar/notes/`
3. Verifique se existe `mind/x/memory/state.json` e leia: último compile, total de queries, custo acumulado
4. Liste notes não digeridas (existem em `mind/calendar/notes/` mas não em `state.json` como compiladas)

Mostre o status em formato conciso, e ao final liste os comandos disponíveis:

```
Comandos:
  /mind:digest    — Digere notes em artigos
  /mind:ask       — Consulta o mind
  /mind:audit     — Checa saúde do mind
  /mind:capture   — Extrai memórias da sessão atual
  /mind:add       — Ingere arquivos do inbox mind/+/
  /mind:note      — Registro manual nas notes do dia
  /mind:file      — Arquiva Q&A em atlas/qa
  /mind:review    — Revisa código contra o mind
  /mind:check     — Valida approach contra decisões anteriores
```
