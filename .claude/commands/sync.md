# Sincronizar com gitlab (pull → resolver → commit → push)

## Objetivo

Sincronizar o estado local do `mind/` (e demais arquivos versionados) com o remote, resolvendo conflitos sozinho usando julgamento semântico — sem intervenção humana no caso comum.

Esse comando existe porque há várias instâncias do NIC rodando em paralelo. Cada uma escreve no próprio `mind/`. O git é a camada de sincronização entre elas.

## Fluxo

1. **Pull com rebase**
   ```bash
   git pull --rebase origin <branch-atual>
   ```

2. **Se houver conflito**, resolver cada arquivo conflitante com julgamento. Veja a seção *Estratégia de merge* abaixo. Para cada arquivo resolvido:
   ```bash
   git add <arquivo>
   ```
   Quando todos resolvidos:
   ```bash
   git rebase --continue
   ```
   Se um arquivo for ambíguo demais pra resolver com confiança, **pare e pergunte ao usuário** — não chute.

3. **Commitar mudanças locais** invocando `/git-commit -a` (agrupamento temático, pt-BR, conventional commits — única fonte da verdade pro estilo de commit). Não duplique essa lógica aqui.

4. **Push**
   ```bash
   git push origin <branch-atual>
   ```

5. **Reportar** em uma linha o que foi sincronizado: quantos commits subiram, quantos desceram, se houve conflito resolvido.

## Estratégia de merge — como decidir quando há conflito

O conteúdo é **texto markdown que você mesmo escreveu nos dois lados**. Você tem contexto pra decidir. Princípios:

- **Regra de ouro: nunca descarte conteúdo sem motivo explícito.** Em dúvida, preserve os dois lados. Perda de informação é o pior resultado possível — pior que duplicação temporária.

- **`mind/calendar/notes/YYYY-MM-DD.md`** (daily logs, append-only) — una os dois lados concatenando. Se houver duas seções da mesma hora, mantenha as duas em ordem. Esses arquivos deveriam estar marcados `merge=union` no `.gitattributes` (criar se não existir).

- **`mind/HOME.md`** (tabela MOC) — merge linha-a-linha da tabela. Linhas presentes em qualquer um dos lados são preservadas. Se a mesma linha aparece dos dois lados com summaries diferentes, escolha a versão mais informativa ou sintetize.

- **`mind/atlas/concepts/*.md`, `connections/*.md`, `qa/*.md`** — notas atômicas. Conflito real significa que duas instâncias editaram o mesmo conceito. Leia os dois lados, sintetize o que cada uma agregou e produza uma versão que contém ambas as contribuições. Atualize `updated:` no frontmatter.

- **`mind/atlas/maps/*.md`** — MOCs com prosa curatorial entre links. Funda os links de ambos os lados, preservando a ordem semântica. Se a prosa diverge, sintetize.

- **`mind/effort/on/<slug>/*.md`** — pensamento ativo. Conflito provavelmente significa duas instâncias trabalhando no mesmo effort. Funda preservando todas as decisões/runbooks de ambos os lados; marque com nota `> [!note] merge de N sessões paralelas` se o conteúdo divergir significativamente.

- **`mind/x/<slug>/*`** — artefatos não-nota (scripts, logs, configs). Conflito aqui é mais delicado: scripts não fundem semanticamente. Se for log (append-only), una. Se for script `.ps1`/`.sql` com conflito real, **pare e pergunte ao usuário** — não invente código.

- **`.systems/`, `.claude/`, `CLAUDE.md`** — código e configuração do agente. Não tente fundir cegamente; se houver conflito real aqui, pare e pergunte.

## Pré-requisito recomendado

Garantir que `D:\nic\.gitattributes` contém:

```
mind/calendar/notes/*.md merge=union
mind/calendar/system/log.md merge=union
```

Isso faz daily logs e o build log fundirem automaticamente sem conflito quando dois lados só apenderam linhas. Se o arquivo não existir, criar antes do primeiro `/sync`.

## Restrições

- Não use `git push --force` em hipótese alguma (regra global do usuário).
- Não use `git reset --hard`, `git checkout --`, `git restore`, `git stash drop`, `git clean -f` (regras globais).
- Não pule hooks (`--no-verify`).
- Se o rebase ficar enrolado e não fizer sentido continuar, aborte com `git rebase --abort` e reporte ao usuário — nunca deixe o repo num estado meio-rebased.
- Em conflito ambíguo: **pare e pergunte**. Melhor pedir confirmação do que destruir trabalho.
