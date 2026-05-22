# sources/

Material de estudo do agente. Mistura de:

1. **Clones externos** — repositórios do GitLab interno da Processa (`gitlab.processa.info`) e de projetos públicos no GitHub. Não são commitados no anvil; reconstruir do zero com os comandos abaixo.
2. **Material local** (in-repo) — projetos curados pela equipe que vivem dentro do próprio anvil-ia: skills de documentação do Director montadas pelo Lupa, dump de procedures, etc.

Convenção de nomes para clones do GitLab interno: o caminho do projeto no GitLab é achatado em um único nome de pasta substituindo `/` por `--`. Para clones de outras origens, o padrão é `<owner>--<repo>`.

## Reconstruir clones do zero

```bash
cd sources

# GitLab interno da Processa
git clone http://gitlab.processa.info/engenharia/fabrica/dotnet-core/director.git           engenharia--fabrica--dotnet-core--director
git clone http://gitlab.processa.info/engenharia/fabrica/dotnet-core/director.web.git       engenharia--fabrica--dotnet-core--director.web
git clone http://gitlab.processa.info/engenharia/fabrica/dotnet/pipeliner.git               engenharia--fabrica--dotnet--pipeliner
git clone http://gitlab.processa.info/engenharia/fabrica/dotnet/processa.appbuilder.git     engenharia--fabrica--dotnet--processa.appbuilder
git clone http://gitlab.processa.info/engenharia/fabrica/dotnet/processa.ADM.git            engenharia--fabrica--dotnet--processa.ADM
git clone http://gitlab.processa.info/engenharia/fabrica/dotnet/processa.sdk.git            engenharia--fabrica--dotnet--processa.sdk
git clone http://gitlab.processa.info/engenharia/fabrica/javascript/react-tools.git         engenharia--fabrica--javascript--react-tools
git clone http://gitlab.processa.info/engenharia/fabrica/sql/portal-aws.git                 engenharia--fabrica--sql--portal-aws
git clone http://gitlab.processa.info/engenharia/fabrica/sql/portal-director.git            engenharia--fabrica--sql--portal-director
git clone http://gitlab.processa.info/engenharia/fabrica/sql/portal-processa.git            engenharia--fabrica--sql--portal-processa
git clone http://gitlab.processa.info/engenharia/fabrica/sql/processa-adm.git               engenharia--fabrica--sql--processa-adm
git clone http://gitlab.processa.info/engenharia/fabrica/sql/processa-appbuilder.git        engenharia--fabrica--sql--processa-appbuilder
git clone http://gitlab.processa.info/qualidade/playwright/appbuilder.git                   qualidade--playwright--appbuilder

# GitHub público — harness builder para workflows de AI coding
git clone https://github.com/coleam00/Archon.git                                            coleam00--archon
```

## Índice

### Clones externos

| Pasta local | Origin |
|---|---|
| `engenharia--fabrica--dotnet-core--director/` | http://gitlab.processa.info/engenharia/fabrica/dotnet-core/director.git |
| `engenharia--fabrica--dotnet-core--director.web/` | http://gitlab.processa.info/engenharia/fabrica/dotnet-core/director.web.git |
| `engenharia--fabrica--dotnet--pipeliner/` | http://gitlab.processa.info/engenharia/fabrica/dotnet/pipeliner.git |
| `engenharia--fabrica--dotnet--processa.appbuilder/` | http://gitlab.processa.info/engenharia/fabrica/dotnet/processa.appbuilder.git |
| `engenharia--fabrica--dotnet--processa.ADM/` | http://gitlab.processa.info/engenharia/fabrica/dotnet/processa.ADM.git |
| `engenharia--fabrica--dotnet--processa.sdk/` | http://gitlab.processa.info/engenharia/fabrica/dotnet/processa.sdk.git |
| `engenharia--fabrica--javascript--react-tools/` | http://gitlab.processa.info/engenharia/fabrica/javascript/react-tools.git |
| `engenharia--fabrica--sql--portal-aws/` | http://gitlab.processa.info/engenharia/fabrica/sql/portal-aws.git |
| `engenharia--fabrica--sql--portal-director/` | http://gitlab.processa.info/engenharia/fabrica/sql/portal-director.git |
| `engenharia--fabrica--sql--portal-processa/` | http://gitlab.processa.info/engenharia/fabrica/sql/portal-processa.git |
| `engenharia--fabrica--sql--processa-adm/` | http://gitlab.processa.info/engenharia/fabrica/sql/processa-adm.git |
| `engenharia--fabrica--sql--processa-appbuilder/` | http://gitlab.processa.info/engenharia/fabrica/sql/processa-appbuilder.git |
| `qualidade--playwright--appbuilder/` | http://gitlab.processa.info/qualidade/playwright/appbuilder.git |
| `coleam00--archon/` | https://github.com/coleam00/Archon.git |

### Material local (versionado no próprio anvil-ia)

| Pasta | Conteúdo |
|---|---|
| `procedures/` | Dump de stored procedures SQL Server do Director / integrações (Tecnospeed etc). |
| `doc-form-usuario/` | Projeto agêntico do Lupa para documentar formulários VB6 (.frm) do Director em linguagem de usuário leigo. Contém `SKILL.md` (instruções), `CLAUDE.md` (contexto do Director) e `exemplos_docs_gerados/` (gabarito de qualidade). |
| `doc_form_tecnico/` | Projeto agêntico do Lupa para documentar formulários VB6 em nível técnico (DB, classes, regras). Atualmente empacotado em `director-agent.rar`. |
