# Como rodar as waves do Director.Studio

Esta frente progride por **waves** — onda. Cada wave é uma execução do comando `/dwave`, focada em UMA feature, avançando UMA fase, terminando com UM commit. O harness atual é **Ralph Loop**: zero sleep entre waves, re-injeção imediata do prompt, contexto gerenciado por compactação automática do Claude Code.

## TL;DR

Abre uma **sessão NOVA** do Claude Code com `cwd=D:/anvil` e cola o comando exato:

```
/ralph-loop "Execute /dwave para o Director.Studio. Cada iteração é UMA wave: leia o estado em disco (mind/effort/on/director-studio/feature-manifest.md, progress-messages.txt, git log), siga TODOS os 6 passos de /dwave, termine com commit. Ralph re-injeta este mesmo prompt automaticamente — não chame ScheduleWakeup, não durma, não espere; termine a wave atual e a próxima começa sozinha. Quando TODAS as features do feature-manifest tiverem Accepted=✓ E o 'Backlog do arqueólogo' estiver vazio, output exatamente <promise>STUDIO-RTM-DONE</promise>." --completion-promise "STUDIO-RTM-DONE" --max-iterations 1000
```

A cada iteração, Ralph re-injeta o prompt e Claude:
1. lê o estado (`feature-manifest.md` + `progress-messages.txt` + `git log`)
2. escolhe a feature mais bloqueada (Passo 1 do `/dwave`)
3. detecta a fase atual dela (Passo 2)
4. despacha o agente correto (archaeologist | designer | smith | ui-tester | curator)
5. commita (Passo 4)
6. atualiza `progress-messages.txt`
7. encerra a wave — Ralph re-injeta sozinho, sem sleep

Quando o manifest fechar (todas as features `Accepted=✓` E backlog do arqueólogo vazio), Claude emite `<promise>STUDIO-RTM-DONE</promise>` e o loop termina naturalmente.

## Por que Ralph Loop e não `/loop`

`/loop` self-paced tem floor de 60s entre waves (ScheduleWakeup clampa em `[60, 3600]`) e default conservador de 1200-1800s pra idle. Em blocos de tempo já contratados, isso é desperdício: tokens pagos sentando em sleep. Ralph elimina isso — cada wave termina e a próxima começa imediatamente. Trade-off: contexto da sessão cresce até o Claude Code compactar; pra nosso harness (estado durável em `progress-messages.txt` + git log + manifest), a compactação não compromete.

## Acompanhamento

Sem entrar na sessão do Ralph, você acompanha em outro terminal:

```bash
# Estado atual do manifest
cat mind/effort/on/director-studio/feature-manifest.md | head -50

# Log do time (append-only)
tail -f mind/effort/on/director-studio/progress-messages.txt

# Commits
git log --oneline -30
```

Se algo parar de avançar, abre a sessão do Ralph e veja onde travou. Se o problema é claro, corrige e re-dispara o `/ralph-loop`.

## Quando interromper

Cancela com `/cancel-ralph` na sessão ativa, ou Ctrl-C. O estado vive em disco; nenhum trabalho se perde — a próxima sessão retoma do `progress-messages.txt`.

## Quando rodar `/dwave` manualmente (sem Ralph)

- Pra forçar uma única wave (debug do harness)
- Pra retomar após interrupção, ver o resultado antes de soltar o Ralph de novo
- Pra avançar uma feature específica fora da ordem natural — edita o manifest manualmente (sobe a feature pra P0), depois roda `/dwave`

Numa execução manual avulsa, o `/dwave` apenas termina sem re-injeção — Ralph é quem cria o loop.

## Como mudar prioridade

Edite a coluna `Priority` no `mind/effort/on/director-studio/feature-manifest.md`:

- `P0` — bloqueador (auth, shell, contratos base)
- `P1` — features importantes mas não bloqueantes
- `P2` — nice-to-have

O `/dwave` puxa a feature mais alta seguindo a ordem do Passo 1.

## Como adicionar uma feature

Se você (ou o curator) descobre uma feature nova:

1. Adicione linha ao manifest com:
   - ID novo (próximo F0XX livre)
   - Área, título
   - Source (path em `sources/...`) — se conhecido
   - Contract (`TBD` se ainda não escavado)
   - Priority
   - Status `todo`
2. `/dwave` vai pegar quando for hora dela

## Quando o loop deve parar

Ralph encerra **automaticamente** em duas condições:

- **Completion-promise**: Claude emitiu `<promise>STUDIO-RTM-DONE</promise>` — manifest 100% aceito.
- **Max-iterations**: chegou a 1000 iterações sem sinal de fim — safety net contra loop patológico.

Em ambos os casos, a sessão volta a aceitar exit normal. Aí você decide próxima ação (cutover, descanso, outra rodada).

## Garantias

- **Sem push**: nenhum agente faz `git push`. Você sobe quando quiser.
- **Sem branches paralelas**: tudo na `main`. Se quiser branchear, faz você mesmo antes.
- **Sem destruição**: nenhum agente faz `git reset --hard`, `--force`, `--no-verify`, `--amend`.
- **Sem leaks de legado**: smith/designer/curator/ui-tester nunca leem `sources/`.
- **Zero sleep**: Ralph não dorme. 100% do tempo da sessão é gasto em trabalho real.

## Primeira execução

Antes de soltar o Ralph:

1. Verifique que o `.env` está válido (`workspace/director-studio/.env`).
2. Verifique que `npm run platform:up` está de pé (ou que smith vai subir).
3. Verifique que o git status está limpo.
4. Rode `/dwave` **uma vez manualmente** (numa sessão sem Ralph). Veja se ele se comporta bem.
5. Se sim, abre outra sessão e solta o `/ralph-loop ...`.

Esse "wave de smoke" evita descobrir tarde que o harness está mal configurado dentro do Ralph (onde diagnóstico é mais incômodo).
