Arquiva um Q&A deliberado em `mind/atlas/qa/`.

O argumento pode ser:
- Uma pergunta — gera a resposta consultando o mind e salva como artigo Q&A
- Sem argumento — revisa a conversa atual e pergunta ao usuário o que vale arquivar

Executa `node .systems/memory/scripts/kb/query.js "$ARGUMENTS" --file-back` a partir da raiz do workspace.

Ao finalizar, confirme o path do artigo criado e mostre quantos Q&A existem no total.
