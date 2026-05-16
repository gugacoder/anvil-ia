# Test report — F027 Anti-FOUC theme bootstrap inline

**Data**: 2026-05-16
**Resultado**: pass
**Ambiente**: localhost:3000 (dev, Vite)
**Commit testado**: fcb61f9
**OS preferência**: dark (`matchMedia('(prefers-color-scheme: dark)').matches === true`)

## Casos cobertos

| # | Cenário | Esperado | Observado | Resultado |
|---|---|---|---|---|
| A1 | Reload com `director-studio:theme='dark'` | `<html>` com `.dark`, `style.colorScheme='dark'`, sem `.light` | `htmlClasses='dark'`, `colorScheme='dark'`, `hasDark=true`, `hasLight=false`, `themeKey='dark'` | ✓ |
| A2 | Reload com `director-studio:theme='light'` | `<html>` com `.light`, `style.colorScheme='light'`, sem `.dark` | `htmlClasses='light'`, `colorScheme='light'`, `hasLight=true`, `hasDark=false`, `themeKey='light'` | ✓ |
| A3 | Reload sem chave (default), OS em dark | Resolve para dark via `matchMedia('(prefers-color-scheme: dark)')` | `themeKey=null`, `osDark=true`, `htmlClasses='dark'`, `colorScheme='dark'` | ✓ |
| A4 | Console sem `Uncaught`/erros JS no script inline | Sem erros, apenas logs do vite client | 4 mensagens DEBUG do `@vite/client` (connecting/connected); zero errors/exceptions | ✓ |
| A5 | Persistência light↔dark via reload (mecanismo do toggle) | Set localStorage + reload aplica classe/colorScheme corretos sem flash | Sequência `light→reload→light` e `dark→reload→dark` aplicou estado correto em ambas as direções | ✓ (parcial — ver nota) |

## Notas sobre A5

O fluxo interativo "clicar no toggle Claro/Escuro no app-shell" não pôde ser
exercitado porque o app-shell só monta após a rota `/areas` carregar áreas, e
a API `/api/areas` retorna 500 no ambiente atual: `Failed to connect to
172.27.0.121\\SQL2k19 in 8000ms` (banco upstream indisponível). Isso é
**fora do escopo de F027** (regressão de infra, não do anti-FOUC).

A semântica do toggle foi validada **indiretamente**: o componente toggle
escreve em `localStorage['director-studio:theme']` e aplica a classe; o
reload subsequente passando pelo script inline reproduz exatamente o mesmo
caminho que o usuário veria após um toggle + refresh. Ambos sentidos
(light→dark, dark→light) funcionam e persistem. Sem flash porque a classe
é aplicada **antes** de qualquer pintura do React.

## Evidência

- A1: `{colorScheme:'dark', hasDark:true, hasLight:false, htmlClasses:'dark', themeKey:'dark'}`
- A2: `{colorScheme:'light', hasDark:false, hasLight:true, htmlClasses:'light', themeKey:'light'}`
- A3: `{colorScheme:'dark', hasDark:true, hasLight:false, htmlClasses:'dark', osDark:true, themeKey:null}`
- A4: console messages = `[vite] connecting...`, `[vite] connected.` (×2 ciclos de reload); `onlyErrors=true` → vazio
- A5: ciclos light→reload + dark→reload reproduzem o estado correto cada vez

## Próxima ação

- pass → curator aceita F027
- Recomendação paralela: registrar nota separada que `/api/areas` está
  retornando 500 por SQL2k19 inacessível em dev (não bloqueia F027 mas
  bloqueia testes que dependem do app-shell montado).
