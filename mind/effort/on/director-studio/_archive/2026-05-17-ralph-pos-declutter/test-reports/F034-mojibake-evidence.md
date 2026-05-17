# Test report — F034 mojibake aria-label (evidence capture)

**Data**: 2026-05-16
**Resultado**: inconclusivo (escopo original) / **bug paralelo confirmado** (perda de diacríticos em strings estáticas do shell)
**Ambiente**: localhost:3000 (dev), API localhost:3001
**Caso real testado**: usuário `processa` autenticado, rota `/areas/portal-director`

## Sumário executivo

A hipótese original do F034 era que `/api/menu/routes` retornava strings com mojibake clássico (`Ã`, `Â`, `ï¿½`) que vazavam pro `aria-label` enquanto `textContent` ficava OK (ou vice-versa). **Não consegui validar essa hipótese** porque o backend SQL (`172.27.0.121\SQL2k19`) está inacessível desta máquina — endpoint retorna 500 antes de produzir payload.

Porém, no fluxo de captura, encontrei **outro defeito empírico** no shell (não no menu): várias strings estáticas do `PageShell` perderam diacríticos no código-fonte (não é mojibake — é ausência de caractere). Isso é um bug real, paralelo ao F034.

## Captura empírica

### 1. `/api/menu/routes?app=portal-director`

```
status: 500
content-type: application/json
body: {"ok":false,"error":"menu-fetch-failed","message":"Failed to connect to 172.27.0.121\\SQL2k19 in 8000ms"}
```

Sem rede SQL, sidebar de módulos não renderiza — portanto não foi possível inspecionar `aria-label` vs `textContent` dos itens "Configurações" / outros módulos.

### 2. Strings estáticas do shell (achado paralelo)

Análise dos aria-labels e textContent presentes no DOM da página `/areas/portal-director`:

| Elemento | aria-label observado | Esperado (PT-BR) | Bytes (hex) | Diagnóstico |
|---|---|---|---|---|
| Botão recolher sidebar | `Recolher navegacao` | `Recolher navegação` | `... 63 61 6f` (cao) | Falta `ç` (`c3 a7`) e `ã` (`c3 a3`) |
| Botão notificações | `Notificacoes (0 nao lidas)` | `Notificações (0 não lidas)` | `4e 6f 74 69 66 69 63 61 63 6f 65 73` | Falta `ç`, `õ`, `ã` |
| Botão home | `Ir para inicio — Director.Studio · Portal Director` | `Ir para início — ...` | `69 6e 69 63 69 6f` | Falta `í` (`c3 ad`) |
| Skip link | `Pular para o conteudo` (texto) | `Pular para o conteúdo` | — | Falta `ú` |
| Botão conta | aria `Conta de processa`, texto `Pprocessavia temp-password` | aria sem til de "conta"? texto concatenado errado | — | (a) aria sem diacrítico relevante; (b) texto colado: parece template `"P{name}via temp-password"` sem espaços/separador |

Confirmação por grep no DOM completo (`document.documentElement.outerHTML`):

```
"navegacao"     → 2 ocorrências
"navegação"     → 0 ocorrências
"Notificacoes"  → 1 ocorrência
"Notificações"  → 0 ocorrências
"inicio"        → 1 ocorrência
"início"        → 0 ocorrências
```

Zero versões acentuadas existem no payload do shell. **Não é mojibake** (não há `Ã`, `Â`, byte 0xC3 órfão, nem `ï¿½`/`�`). É **diacrítico nunca foi escrito** na fonte do código React do shell.

### 3. Texto duplicado/concatenado no botão de conta

`aria-label="Conta de processa"` + `textContent="Pprocessavia temp-password"`.

Parece que um template tipo `` `P${user}via temp-password` `` está produzindo "Pprocessavia temp-password" — falta espaço/quebra após `P` e antes de `via`. Isso é separado dos diacríticos e provavelmente um terceiro defeito.

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| 1 | GET `/api/menu/routes?app=portal-director` retorna JSON UTF-8 com módulos do Portal Director | 200 + payload com `Configurações` codificado em UTF-8 (`c3 a7 c3 b5 65 73`) | 500 — SQL backend inacessível | ✗ não testável |
| 2 | Módulo "Configurações" no sidebar — `aria-label` vs `textContent` batem | Ambos com `ç`, `õ`, `e`, `s` corretos | Módulos não renderizam (depende de #1) | ✗ não testável |
| 3 | Cache stale após `sessionStorage.clear()` + reload | Reload limpo, sem dados antigos | Reload OK, mas API continua 500 | n/a |
| 4 | Diacríticos em strings do PageShell (aria + texto) | "navegação", "Notificações", "início", "conteúdo" com acentos | Todos sem acento (ASCII puro) | ✗ bug confirmado |
| 5 | Texto do botão de conta concatenado corretamente | algo como `processa (via temp-password)` | `Pprocessavia temp-password` (sem espaço) | ✗ bug confirmado |

## Conclusão pro smith

**F034 (escopo original — menu module mojibake)**: **inconclusivo neste ambiente.** Não pude reproduzir nem refutar porque `/api/menu/routes` retorna 500 (SQL `172.27.0.121\SQL2k19` inacessível desta máquina). Para fechar F034 com `pass` ou `fail` empírico, preciso de uma das duas:

1. Ambiente com SQL legacy acessível (VPN/Área 52), ou
2. Fixture/mock no api server que devolva o payload real de menu em UTF-8 e em CP1252 mal-decodificado, pra eu comparar.

**Bug paralelo (não-F034)**: confirmado e reproduzível. Pelo menos 5 strings do `PageShell` perderam diacríticos. Não é mojibake — é fonte sem acento. Sugiro abrir feature separada (F0XX-shell-i18n-strings) cobrindo:
- `Recolher navegação` (botão sidebar collapse)
- `Notificações (N não lidas)` (botão notificações)
- `Ir para início — ...` (logo/home button)
- `Pular para o conteúdo` (skip link)
- Template do botão de conta (concatenação errada)

## Próxima ação

- F034: **aguarda ambiente com SQL ou fixture** — não marco pass/fail no manifest.
- Bug paralelo: smith decide se cria nova feature (F0XX shell strings) ou estende escopo de F034 pra cobrir strings estáticas do shell além do menu dinâmico.

## Evidência bruta

- Hex de cada aria-label capturado in-line acima (sem bytes `c3 xx` ou `ef bf bd`).
- Erro API: `{"ok":false,"error":"menu-fetch-failed","message":"Failed to connect to 172.27.0.121\\SQL2k19 in 8000ms"}`
- Grep no DOM: 0 ocorrências com acento vs N ocorrências sem.
