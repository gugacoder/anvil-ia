---
name: brand-assets
description: Inventario e regras de uso dos brand assets do projeto Coletivos. Use quando referenciar logo, icone, splash, favicon ou qualquer asset visual de marca em qualquer app.
---

# Brand Assets — Coletivos

Cada arquivo do brand tem **um proposito unico**. Nao trocar de proposito,
nao renomear, nao improvisar. Esta skill e a referencia canonica.

---

## Os 6 assets de marca

Cada um existe em duas variantes (light/dark). Total: 12 SVGs por projeto.

| Arquivo | Conteudo | Uso |
|---------|----------|-----|
| `icon.svg` | Glifo do C, 100x100, sem fundo | **EXCLUSIVAMENTE favicon do browser**. Nada mais. |
| `logo.svg` | Simbolo puro (so a logo, sem texto) | Onde se mostra **so** a marca compacta. Ex: sidebar colapsada. |
| `logo-h.svg` | Simbolo + nome do brand, horizontal | Onde precisa da marca completa em horizontal. Ex: sidebar expandida, header. |
| `logo-v.svg` | Simbolo + nome do brand, vertical | Onde precisa da marca completa em vertical. Ex: splash de loading, login. |
| `creative-h.svg` | Banner artistico horizontal | Splash mobile/tablet em **landscape**. NAO usar em desktop. |
| `creative-v.svg` | Banner artistico vertical | Splash mobile/tablet em **portrait**. NAO usar em desktop. |

### Regras invioladas

- **`icon.svg` e SOMENTE para favicon do browser.** Nao use em sidebar, nao use em splash, nao use em UI nenhuma. Se voce esta tentado a usar `icon.svg` dentro do app, pare e pergunte qual dos outros 5 e o correto.
- **`logo.svg` e simbolo puro.** Quando precisar exibir apenas a logo (sem o nome), use ele. NUNCA use `icon.svg` no lugar.
- **`logo-h.svg` e `logo-v.svg` ja contem o nome do brand.** NAO adicione texto "Coletivos" separado ao lado deles — duplica a identidade.
- **`creative-h.svg` e `creative-v.svg` sao mobile/tablet only.** Nao foram otimizados para telas grandes.

---

## Arquitetura de pastas

Tres niveis: canon, app-publico-raiz, app-publico-brand.

```
1. CANON (fonte unica de verdade)
   assets/brand/coletivos/
     light/
       icon.svg, logo.svg, logo-h.svg, logo-v.svg,
       creative-h.svg, creative-v.svg
     dark/
       (idem)

2. APP — RAIZ DO public/  (uso FORA do app)
   apps/<app>/public/
     favicon.svg              <- copia de assets/brand/coletivos/light/icon.svg
     icon.svg                 <- versao apple-touch-icon (apos derivacao)
     apple-touch-icon.png
     favicon-16x16.png, favicon-32x32.png
     icons/icon-{192,512}.png, icons/icon-{192,512}-maskable.png

3. APP — public/brand/<theme>/  (uso DENTRO do app — UI)
   apps/<app>/public/brand/
     light/
       icon.svg, logo.svg, logo-h.svg, logo-v.svg,
       creative-h.svg, creative-v.svg
     dark/
       (idem)
```

### Regras de cada nivel

**Raiz `public/`** (nivel 2): assets que o **mundo de fora** consome — browser tab, OS, manifest PWA, apple touch. Nao varia por tema (uma unica versao serve tab clara e tab escura). E o que vai em `<link rel="icon">`, `<link rel="apple-touch-icon">`, manifest icons.

**`public/brand/<theme>/`** (nivel 3): assets que a **UI do app** renderiza. Varia por tema porque a UI tem tema. E o que vai em `<img src="/<base>/brand/<theme>/<file>.svg">` dentro de componentes React.

### Regras de copia entre niveis

- **Copia preserva nome.** Se canon tem `logo-h.svg`, app tem `logo-h.svg`. Nao renomeie pra "wordmark-horizontal" ou qualquer variacao.
- **Nivel 2 nao tem `<theme>/`** porque consumidores externos (browser, OS) nao sabem nada sobre tema do app.

---

## Onde usar cada asset (mapa por posicao)

| Posicao na UI | Asset correto | Variante |
|---------------|---------------|----------|
| Browser tab | `apps/<app>/public/favicon.svg` (= canon `icon.svg` light) | unica |
| iOS apple-touch | `apps/<app>/public/apple-touch-icon.png` | unica |
| PWA manifest icons | `apps/<app>/public/icons/icon-*.png` | unica |
| Sidebar **colapsada** (header) | `public/brand/<theme>/logo.svg` | theme-aware |
| Sidebar **expandida** (header) | `public/brand/<theme>/logo-h.svg` | theme-aware |
| Splash de loading | `public/brand/<theme>/logo-v.svg` | theme-aware |
| Splash bg mobile portrait | `public/brand/<theme>/creative-v.svg` | theme-aware |
| Splash bg mobile landscape | `public/brand/<theme>/creative-h.svg` | theme-aware |
| Splash bg desktop | (sem creative — cor solida do tema) | — |
| Login/Signup pagina | `public/brand/<theme>/logo-v.svg` | theme-aware |

---

## Anti-padroes (erros recorrentes)

| Tentacao | Por que esta errado | Correto |
|----------|---------------------|---------|
| Usar `icon.svg` no sidebar colapsado | `icon.svg` e favicon do browser, nao tem padding pra UI pequena | `logo.svg` |
| Usar `favicon.svg` no sidebar colapsado | `favicon.svg` (= icon copiado) tem fundo branco quadrado — fica "fundo flutuante" no dark mode | `logo.svg` |
| Adicionar `<span>Coletivos</span>` ao lado de `logo-v.svg` | logo-v ja tem o nome embutido — duplica | so o `<img>` do logo-v |
| Renomear arquivos no destino (`logo-h.svg` → `wordmark-horizontal.svg`) | Quebra rastreabilidade com o canon | manter nome |
| Usar creative-h em desktop | Asset nao foi otimizado para telas grandes | cor solida do tema |
| Adicionar suffix ao nome (`logo+brand-horizontal.svg` em vez de `logo-h.svg`) | Diverge do canon | usar nome curto do canon |

---

## Theme-aware switching (UI dentro do app)

Para selecionar light vs dark, duas estrategias validas:

### A) Prop `theme` controlada pelo theme-provider

```tsx
const theme = useResolvedTheme()  // "light" | "dark"
<img src={`/<base>/brand/${theme}/logo.svg`} alt="Coletivos" />
```

Use quando o componente ja tem acesso ao theme-provider.

### B) Duas tags + CSS class-based

```html
<img class="theme-light-only" src="/brand/light/logo.svg" />
<img class="theme-dark-only" src="/brand/dark/logo.svg" />
```

```css
html:not(.dark) .theme-dark-only { display: none; }
html.dark .theme-light-only { display: none; }
```

Use em HTML estatico (index.html, splash inicial) onde nao tem React/Context disponivel.

**Nao misturar com swap via JS** (`element.src = "..."`) — paths em strings JS nao sao reescritos pelo Vite e produzem 404 em produc1ao com `base` configurado.

---

## Pipeline de copia/derivacao

Origem -> destino:

1. Designer atualiza `assets/brand/coletivos/<theme>/<file>.svg` (canon)
2. **Copia direta** para `apps/<app>/public/brand/<theme>/<file>.svg` — nivel 3
3. **Derivacao** do `icon.svg` (canon ou light selecionado) para PNGs/ICOs:
   - `apps/<app>/public/favicon.svg` (copia de icon.svg light)
   - `apps/<app>/public/favicon-16x16.png` e `-32x32.png` (resize)
   - `apps/<app>/public/apple-touch-icon.png` (180x180)
   - `apps/<app>/public/icons/icon-{192,512}.png` (PWA)
   - `apps/<app>/public/icons/icon-{192,512}-maskable.png` (PWA com 10% safe zone padding)

Quando adicionar novo app, copie a pasta `public/brand/<theme>/` e os arquivos de raiz `public/` de um app existente como template — nao re-derive a partir do canon a mao.

---

## Checklist ao referenciar asset em codigo

Antes de digitar `<img src="...">`:

- [ ] E **dentro** do app? Use `public/brand/<theme>/`. **Fora** (favicon, manifest)? Use raiz `public/`.
- [ ] O proposito e o correto pro asset escolhido? Consulte a tabela "Os 6 assets de marca".
- [ ] Se theme-aware, esta lendo o tema do user-prefs (nao localStorage cru, nao matchMedia direto)?
- [ ] Path comeca com `/<base>/...` em codigo React, ou com `/...` em atributos HTML (Vite reescreve)? Veja a skill `vite` se houver duvida sobre `base`.
- [ ] Esta usando o nome canonico (`logo-h.svg`, nao `wordmark-horizontal.svg`)?
