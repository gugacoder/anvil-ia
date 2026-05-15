---
title: F011 — DataGrid renderer (decisões de implementação)
tags: [effort, director-studio, F011, decisions, smith]
created: 2026-05-15
---

# F011 — DataGrid renderer / datagrid+datagrid2 unificados

## Decisões

1. **Schema unificado**: `datagrid` e `datagrid2` mapeiam para o mesmo `<DataGridRenderer />`. ModelEngine dispatch por presença de chave, ambas plugadas no mesmo componente. Coerente com contrato §"Schema datagrid e datagrid2 são idênticos".

2. **Endpoint backend novo**: `POST /api/grid/query` em vez de reusar `/api/forms-proxy`. Motivo: grid precisa de normalização de envelope (rows + pageInfo) e o export precisa de batch. Mesma convenção `/proc/<n>` + XML body que forms-proxy.

3. **XML envelope decode no backend**: a proc canônica do Pipeliner devolve `<Relatorio><Linhas><Linha>...` como string XML em **uma única coluna anônima** do recordset SQL. O backend tem um parser dedicado (regex; sem dep externa) que cobre o caso real observado em `sp_Listar_GrupoTrabalho`. Também suporta envelope JSON e recordset plano como fallbacks.

4. **CSV export com filtro honrado**: `POST /api/grid/export` recebe o filtro corrente + ordenação + `limite` alto (100k default). Corrige o bug `Exporter.js:67` do legado (`filter = {}` hard-coded). UTF-8 BOM no início para abrir no Excel BR sem mojibake. Separador `;` para locale BR.

5. **Sort tri-estado server-side**: asc → desc → none. Corrige limitação do legado (só asc/desc). Mono-coluna mantido (contrato §"Ordenação é mono-coluna"). Disparado via re-render do `useEffect[fetchRows]`.

6. **Mobile-first**: detectar via `useIsMobile()` (matchMedia 768px). Desktop = tabela densa com header sticky. Mobile = lista de cards empilhada + sheet "Ajustar" para page-size/export. Tablet (640-1024) cai no desktop com scroll horizontal (aceitável nesta wave).

7. **HTML sanitization obrigatória**: `type='html'` passa por DOMPurify com allowlist `[b, strong, i, em, br, span, a]` + atributos `[href, title, class]`. Conteúdo bloqueado mostra placeholder `[conteúdo bloqueado]` em italic muted. Não usa `dangerouslySetInnerHTML` cru jamais.

8. **PK detection + selection**: order `id|cod|codigo` (legado). Se nenhum existir nas linhas, selection **desabilita** com InlineAlert warning explícito ("PK não detectada"). Corrige falha silenciosa do legado.

9. **Row tone via mapping de tokens**: `row['@color']`/`row['@bgColor']` mapeia para tokens semânticos (`x-success`, `x-warning`, `x-error`, `x-critical`, `x-info`). Hex/CSS color cru cai em `null` (sem border colorida). Lista canônica documentada na constante `COLOR_TOKEN_MAP`.

10. **Estados completos**:
    - `loading-initial` = skeleton 5 linhas × N colunas.
    - `loading-refetch` = body anterior + opacity-70 (não pisca).
    - `empty` (com filtro) e `empty-initial` (sem filtro) com ícones Phosphor distintos.
    - `error` com botão "Tentar novamente" (refetch).
    - `error-server` separado de `error-network` (mensagem da proc surfaceada).

11. **GridActions desta wave (3 funcionais + 5 stub)**:
    - `redirectTo`: navega via TanStack `/app/$splat`.
    - `detailModal`: abre Drawer vaul com `<pre>JSON.stringify(row, null, 2)</pre>` — placeholder pré-F021.
    - `execProc`: POST `/api/forms-proxy` com `{selected: [pks]}`, mostra InlineAlert success/error. Refetch + clear selection no sucesso.
    - `delete`, `actionModal`, `batchEdit`, `externalAction`, `sendRequest`: `console.warn` + toast InlineAlert "ação não implementada nesta wave".

12. **Pagination com range "{start}–{end} de N"**: corrige a legenda do legado ("Exibindo {limit} itens por página"). Botões first/prev/next/last (ícones `CaretDoubleLeft/Left/Right/DoubleRight`). Mobile colapsa em `‹ {page}/{totalPages} ›`.

13. **Auto-update fora desta wave**: presença de `updateIntervals[]` no schema é aceita mas não renderiza controle nesta wave (sub-feature P1 — pausar em `document.visibilityState !== 'visible'`).

14. **Agrupamento fora desta wave**: client-side group-by-column é P1. Schema `groupable` aceito mas no-op por enquanto.

15. **Drag-drop / resize / reorder de colunas fora desta wave**: spec marca como UI-only no legado; persistência via `column-preferences` é feature derivada. Mantido headers em ordem do schema.

16. **`isEditable` ignorado**: contrato explicita que mesmo o legado DataGrid2 não tem efeito — `inlineEdit` é feature derivada.

## Smoke test (Area 52, DBdirector_imperial_logistica_29)

- Login `PROCESSA/99` → 200 + cookie.
- `POST /api/grid/query` `{endPoint:/proc/sp_Listar_GrupoTrabalho, body:{pagina:1,limite:10,ordenacao:",,"}}`:
  - HTTP 200, `rawShape="envelope"`, `pageInfo={partialCount:4, totalCount:4}`, 4 rows reais:
    - `{id:"12", descricao:"SECO", ativo_inativo:"Ativo"}`
    - `{id:"13", descricao:"CONGELADOS 01", ativo_inativo:"Ativo"}`
    - `{id:"20", descricao:"CONGELADOS 02", ativo_inativo:"Ativo"}`
    - `{id:"21", descricao:"PERECIVEIS", ativo_inativo:"Ativo"}`
  - XML `<Relatorio><Linhas><Linha>...` parseado corretamente.
- `POST /api/grid/export` mesmo endpoint → CSV com UTF-8 BOM + cabeçalho `id;descricao;ativo_inativo` + 4 linhas reais. Filtro `{}` enviado → 4 linhas retornadas (filtro honrado; o bug do legado seria hard-coded `{}` ignorando o filtro real do usuário).

## Aberto / followups

- F033 — mobile viewport real (herdado).
- Implementar 5 `gridActions` restantes (delete/actionModal/batchEdit/externalAction/sendRequest) quando F021 (ActionModal) estiver pronta.
- Persistência de column order/width/hidden (column-preferences, P1).
- Auto-update + agrupamento client-side (P1).
- Sticky-column posicionamento (legado tem comentado; pode entrar via `position: sticky` CSS quando designer especificar widths).

## Arquivos tocados

- **Novos**:
  - `workspace/director-studio/apps/api/src/routes/grid.ts` — endpoint POST `/api/grid/query` + `/api/grid/export`, normalizador (XML/JSON/recordset), CSV BR.
  - `workspace/director-studio/packages/ui/src/components/data-grid-renderer.tsx` — `<DataGridRenderer />` completo (desktop table + mobile card list + toolbar + sort tri-estado + 3 gridActions + DOMPurify para `type=html` + estados).
  - `mind/effort/on/director-studio/backlog/F011-decisions.md` — este arquivo.

- **Editados**:
  - `workspace/director-studio/apps/api/src/index.ts` — mount `/api/grid`.
  - `workspace/director-studio/packages/ui/src/components/model-engine.tsx` — dispatch `datagrid`/`datagrid2` → `<DataGridRenderer />`.
  - `workspace/director-studio/packages/ui/package.json` — deps `dompurify` + `@types/dompurify`.
