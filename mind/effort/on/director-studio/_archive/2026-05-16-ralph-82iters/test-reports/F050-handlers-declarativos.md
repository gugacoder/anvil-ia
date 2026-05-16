# Test report — F050 handlers declarativos (retry)

**Data**: 2026-05-15
**Resultado**: pass
**Ambiente**: localhost:3000 (Studio dev), API :3001 offline (C11 declarado n/a por spec)
**Caso real testado**: smoke route `/smoke/f050` com fetch-stub local interceptando `/api/forms-proxy` — exercita o pipeline integral resolveFuncoes → GenericFormRenderer → handlers declarativos (`submit-com-validacao` + `submit-com-validacao-e-comprovante`) sem dependência de backend. Modelos das funções derivados das 4 funções reais do app `agent` em Área 52 (`handle_submit_realizar_agendamento`, `handle_submit_gerenciar_agendamento`, `update_gerenciar_agendamento`, `cancelar_gerenciar_agendamento`), conforme inventário F039.

## Casos cobertos

| # | Cenário | Esperado (contrato/spec) | Observado | Resultado |
|---|---|---|---|---|
| 1 | Caminho feliz form1 (validate=ok, persist=ok) | confirma → 2 calls (validar+persistir) → banner sucesso com `mensagemSucesso` | confirmou → 2 stub calls → "Sucesso — Smoke F050 concluído — handler declarativo OK." | ✓ |
| 2 | Caminho via ManualEngineRender (model JSON top-level) | `resolveFuncoes(model.funcoes)` injeta map → submit dispara handler igual ao C1 | 2 stub calls (validar+persistir), submit OK pelo caminho ModelEngine | ✓ |
| 3 | validate=fail-business (envelope XML `<Resposta><Sucesso>false`) | troca de select NÃO crasha; persist NÃO é chamado; mensagem do envelope visível | select OK; 1 stub call (só validate); "Não foi possível salvar — CNPJ duplicado." | ✓ |
| 4 | validate=fail-network (throw) | troca de select NÃO crasha; mensagem amigável de rede | select OK; 1 stub call; "Sem conexão. Verifique sua internet." | ✓ |
| 5 | persist=fail-business (`ok:false`) | troca de select NÃO crasha; 2 calls; mensagem do payload `message` | select OK; 2 stub calls; "Banco recusou: chave duplicada." | ✓ |
| 6 | Comprovante feliz (validate=ok+persist=ok+receipt=ok) | 3 calls; modal ReceiptModal renderiza HTML em iframe | 3 stub calls; modal "Comprovante (smoke)" com tabela Origem/Status visível | ✓ |
| 7 | Comprovante vazio (receipt=fail → `dados:[]`, sem html) | NÃO crasha; mensagem "Comprovante indisponível" | "Não foi possível salvar — Comprovante indisponível — resposta sem HTML." | ✓ |
| 8 | Chave desconhecida (`useGenericFunction='chave_inexistente'`) | `console.warn` específico + fallback graceful para submit default → erro visível | warn `[generic-form-renderer] useGenericFunction='chave_inexistente' nao encontrada em model.funcoes[]; caindo no submit default.` + banner "Schema sem endPoint e sem useGenericFunction resolvido — submit impossível." | ✓ |
| 9 | XSS strip no comprovante | DOMPurify remove `<script>` e `javascript:` hrefs antes do iframe | iframe sem `<script>`; anchor "link malicioso" com `href=null` (verificado via `iframe.contentDocument`) | ✓ |
| 10 | Zero `eval`/`new Function` runtime | grep em `generic-form-renderer.tsx` + `handlers/` retorna zero matches | confirmado | ✓ |
| 11 | F010 regressão | n/a se API offline | API :3001 offline (502); spec diz n/a | n/a |
| 12 | Console limpo | apenas o warn esperado de C8 + log informativo do stub local | só [smoke-f050 stub] LOG + 1 WARNING esperado de C8; zero ERROR; zero pageerror | ✓ |

## Falhas

Nenhuma.

## Evidência

- Fix C3/C4/C5/C7 (crash em selects) confirmado: 4 trocas de select consecutivas (validate=fail-business→fail-network→ok, persist=fail-business→ok, receipt=fail) sem nenhum `pageerror`/`Uncaught`/blank screen.
- Fix C8 silencioso confirmado: warning capturado no console com a string exata especificada pelo smith em `generic-form-renderer.tsx:610-613`.
- DOMPurify: `iframe.contentDocument.querySelector('script')` → null; `iframe.contentDocument.querySelectorAll('a')[0].getAttribute('href')` → null (era `javascript:alert(1)` na origem).
- Stub calls: contagem coerente com fluxo declarativo — validate-fail aborta antes de persist; persist-fail aborta antes de comprovante.

## Próxima ação

- pass → curator aceita F050.
