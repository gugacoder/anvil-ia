# 03 — Engine de rendering schema-driven

> Modelo conceitual em [[mind/atlas/concepts/acesso-metamodel]] + [[mind/atlas/concepts/react-tools]]. Este documento é só o plano de execução no protótipo.

## Objetivo

Renderizar qualquer app Processa lendo `acesso.TBmodel_pagina` + `TBmodulo` + `TBpagina` em runtime, sem código por tela.

## Procs canônicas a expor

Backend Hono expõe endpoints REST que envelopam as procs já existentes:

| Endpoint | Proc | Quando o frontend chama |
|---|---|---|
| `GET /api/acl/me` | `obter_acl_usuario_aplicacao` | Boot do app — descobre permissões |
| `GET /api/menu` | `obter_rotas_aplicacao` | Boot do app — monta sidebar |
| `GET /api/home` | `obter_aplicacoes_pagina_home` | Rota raiz — launcher |
| `GET /api/page/:id/model` | `obter_model_pagina` | Carrega tela |
| `GET /api/select/:source` | `obter_opcoes_selecao` | Dropdowns / autocomplete |
| `GET /api/dashboard/:id` | `consultar_model_dashboards` | Dashboards |
| `POST /api/page/:id/save` | `persistir_*` (resolver por convenção) | Submits |

Validação Zod nas entradas. Pino nos logs.

## Renderer no frontend

`TBmodel_pagina` retorna JSON descritivo. Renderer mapeia tipos para componentes shadcn:

```
model.type → componente
─────────────────────────────────────
"form"     → <GenericForm /> (Form + Card + Inputs shadcn)
"grid"     → <DataGrid /> (TanStack Table + shadcn Table)
"dashboard"→ <Dashboard /> (composição de widgets)
"tree"     → <SearchTree /> (custom + shadcn TreeView)
"tabs"     → <Tabs /> (shadcn Tabs)
...
```

Não há JSX por página. Há JSX por **tipo de model**. Adicionar um tipo novo = adicionar um componente novo + registrar no dispatcher.

## Componentes mínimos do MVP

Ordem de implementação no protótipo:

1. **`<AppShell />`** — layout: header + sidebar + content. Tema claro/escuro/auto.
2. **`<GenericForm model={...} />`** — campos: text, number, date, select, checkbox, textarea.
3. **`<DataGrid model={...} />`** — colunas dinâmicas, paginação, filtros básicos, ordenação.
4. **`<Sidebar items={menu} />`** — renderiza `obter_rotas_aplicacao` como menu hierárquico.
5. **`<PageRouter />`** — TanStack Router consumindo `obter_rotas_aplicacao` no boot.

Suficiente para renderizar ~60% das telas Processa. Componentes raros (FileBrowser, SearchTree complexa, dashboards) ficam para iteração 2.

## Estratégia de descoberta

Antes/durante implementação, precisamos extrair contratos exatos das procs canônicas. Tarefas:

- [ ] Ler `sources/engenharia--fabrica--sql--portal-director/portal.director/programacao/acesso.obter_model_pagina.sql`
- [ ] Ler `acesso.obter_rotas_aplicacao.sql`
- [ ] Ler `acesso.obter_aplicacoes_pagina_home.sql`
- [ ] Ler `acesso.obter_acl_usuario_aplicacao.sql`
- [ ] Ler `acesso.obter_opcoes_selecao.sql`
- [ ] Documentar JSON de saída de cada uma em `backlog/04-proc-contracts.md` (próxima)
- [ ] Identificar campos opcionais com semântica especial (a "armadilha" arquitetural)

## TODO transversais

- Cache de respostas: `obter_model_pagina` é pseudo-estático (muda quando o admin edita), bom candidato a cache invalidável via SSE.
- SSE channel `studio:model-changed` empurra invalidação para clientes ativos quando um model é atualizado.
- Decidir se "App switching" (trocar de aplicação dentro do Studio) recarrega o SPA ou só troca um contexto. Recomendação: contexto, sem reload — preserva sessão e cache.
