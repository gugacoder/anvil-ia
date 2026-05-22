# PWA Assets

Manual para gerar os assets visuais de uma marca e aplica-los a um app PWA. Usa Inkscape CLI para converter SVGs fonte em todos os formatos necessarios para compatibilidade completa entre dispositivos e sistemas operacionais.

Vale igualmente pra qualquer brand catalogada em [[atlas/maps/brands]] — `nic`, `processa`, `director`, etc.

## Pre-requisitos

- Inkscape 1.4+ instalado (CLI: `inkscape --version`). No Windows via Microsoft Store, ver secao final.
- SVGs fonte da brand vivem em `mind/x/files/brands/{slug}/`, seguindo o contrato canonico descrito no MOC.

## Estrutura de entrada

```
mind/x/files/brands/{slug}/
├── light/
│   ├── icon.svg         icone quadrado (app icon, favicon)
│   ├── logo.svg         logomarca quadrada (composicao completa)
│   ├── logo-h.svg       logomarca horizontal (header, navbar)
│   ├── logo-v.svg       logomarca vertical (splash, about)
│   ├── creative-h.svg   criativo horizontal (thumbnails, og:image)
│   └── creative-v.svg   criativo vertical (splash mobile, stories)
└── dark/
    └── (mesmos arquivos, cores invertidas para fundo escuro)
```

### Convencoes dos SVGs fonte

- **Sem padding**: os SVGs ocupam 100% do viewBox propositadamente. O padding e adicionado no momento da exportacao, garantindo controle preciso da area util em cada formato de destino.
- **Grupo `brand`**: todo SVG contem um grupo com `id="brand"`. Este objeto pode ser redimensionado proporcionalmente mas nao pode ser desmembrado — ele representa a logo como unidade atomica.
- **Unidades em `pt`**: viewBox em pontos (ex: `0 0 100 100` para icons, `0 0 100 30` para horizontal).

## Estrutura de saida

```
apps/{APP}/public/
├── favicon.svg              SVG favicon (browsers modernos)
├── favicon-16x16.png        fallback classico
├── favicon-32x32.png        fallback classico
├── apple-touch-icon.png     180x180, fundo solido
├── logo-h-light.svg         header light (copiado do fonte)
├── logo-h-dark.svg          header dark (copiado do fonte)
└── icons/
    ├── icon-192.png          PWA homescreen
    ├── icon-512.png          PWA splash / store listing
    ├── icon-192-maskable.png Android adaptive icon
    └── icon-512-maskable.png Android adaptive icon
```

## Geracao com Inkscape CLI

### Referencia rapida

```bash
INKSCAPE="inkscape"   # ajustar path se instalado via Microsoft Store (ver final)
SLUG="nic"            # ou "processa", "director", etc.
ICON="mind/x/files/brands/$SLUG/light/icon.svg"
OUT=".tmp/pwa-icons"
mkdir -p "$OUT"
```

### Parametros de padding

O padding e controlado via `--export-area`, estendendo a area de exportacao alem do viewBox original (`0 0 100 100`):

| Tipo | Area | Padding efetivo | Background | Uso |
|---|---|---|---|---|
| Standard | `-5:-5:105:105` | ~4.5% cada lado | transparente | Icons regulares |
| Maskable | `-12.5:-12.5:112.5:112.5` | ~10% cada lado | solido | Safe zone 80% |
| Apple | `-8:-8:108:108` | ~6.9% cada lado | solido | iOS homescreen |
| Favicon | `-2:-2:102:102` | ~1.9% cada lado | transparente | Tab do browser |

O padding maskable garante que o conteudo fique dentro da **safe zone de 80%** exigida pelo Android (a area circular central onde nenhum SO recorta).

### Comandos de exportacao

```bash
# --- PWA Icons (standard, fundo transparente) ---

inkscape "$ICON" --export-type=png \
  --export-filename="$OUT/icon-512.png" \
  --export-width=512 --export-height=512 \
  --export-area=-5:-5:105:105 \
  --export-background-opacity=0

inkscape "$ICON" --export-type=png \
  --export-filename="$OUT/icon-192.png" \
  --export-width=192 --export-height=192 \
  --export-area=-5:-5:105:105 \
  --export-background-opacity=0

# --- PWA Icons (maskable, fundo branco, safe zone 80%) ---

inkscape "$ICON" --export-type=png \
  --export-filename="$OUT/icon-512-maskable.png" \
  --export-width=512 --export-height=512 \
  --export-area=-12.5:-12.5:112.5:112.5 \
  --export-background=white --export-background-opacity=1.0

inkscape "$ICON" --export-type=png \
  --export-filename="$OUT/icon-192-maskable.png" \
  --export-width=192 --export-height=192 \
  --export-area=-12.5:-12.5:112.5:112.5 \
  --export-background=white --export-background-opacity=1.0

# --- Apple Touch Icon (180x180, fundo branco) ---

inkscape "$ICON" --export-type=png \
  --export-filename="$OUT/apple-touch-icon.png" \
  --export-width=180 --export-height=180 \
  --export-area=-8:-8:108:108 \
  --export-background=white --export-background-opacity=1.0

# --- Favicons (PNG fallback) ---

inkscape "$ICON" --export-type=png \
  --export-filename="$OUT/favicon-32x32.png" \
  --export-width=32 --export-height=32 \
  --export-area=-2:-2:102:102 \
  --export-background-opacity=0

inkscape "$ICON" --export-type=png \
  --export-filename="$OUT/favicon-16x16.png" \
  --export-width=16 --export-height=16 \
  --export-area=-2:-2:102:102 \
  --export-background-opacity=0
```

Os comandos sao independentes entre si e podem rodar em paralelo (`&` + `wait`).

### Favicon SVG

O `icon.svg` do tema light e copiado diretamente como `favicon.svg`:

```bash
cp "mind/x/files/brands/$SLUG/light/icon.svg" "apps/{APP}/public/favicon.svg"
```

Browsers modernos preferem o SVG favicon por ser vetorial e suportar media queries (ex: `prefers-color-scheme`).

### Logos para o header

Copiar os SVGs horizontais para o public do app:

```bash
cp "mind/x/files/brands/$SLUG/light/logo-h.svg" "apps/{APP}/public/logo-h-light.svg"
cp "mind/x/files/brands/$SLUG/dark/logo-h.svg"  "apps/{APP}/public/logo-h-dark.svg"
```

## Integracao no app

### index.html

```html
<!-- PWA -->
<meta name="theme-color" content="{PRIMARY}" media="(prefers-color-scheme: light)" />
<meta name="theme-color" content="{DARK_BG}" media="(prefers-color-scheme: dark)" />
<link rel="manifest" href="/manifest.webmanifest" />

<!-- Apple PWA -->
<meta name="apple-mobile-web-app-capable" content="yes" />
<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
<meta name="apple-mobile-web-app-title" content="{TITLE}" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />

<!-- Favicon (SVG preferencial, PNG fallback) -->
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon-32x32.png" sizes="32x32" type="image/png" />
<link rel="icon" href="/favicon-16x16.png" sizes="16x16" type="image/png" />
```

`{PRIMARY}` e `{DARK_BG}` sao escolhidos a partir da paleta da brand (cor da marca pra `prefers-color-scheme: light`; cor de fundo escuro pra `prefers-color-scheme: dark`).

### Manifest (vite-plugin-pwa)

```ts
manifest: {
  name: "{TITLE}",
  short_name: "{SHORT}",
  description: "{DESCRIPTION}",
  display: "standalone",
  theme_color: "{PRIMARY}",
  background_color: "#ffffff",
  icons: [
    { src: "icons/icon-192.png",          sizes: "192x192", type: "image/png" },
    { src: "icons/icon-512.png",          sizes: "512x512", type: "image/png" },
    { src: "icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
    { src: "icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
  ],
},
```

### Header com logo theme-aware (Tailwind + React)

```tsx
<Link to="/" className="shrink-0">
  <img src="/logo-h-light.svg" alt="{TITLE}" className="h-7 w-auto dark:hidden" />
  <img src="/logo-h-dark.svg"  alt="{TITLE}" className="h-7 w-auto hidden dark:block" />
</Link>
```

A altura `h-7` (28px) funciona bem em headers de 48px (`h-12`). Ajustar conforme o aspect ratio do logo.

## Validacao

| O que testar | Como |
|---|---|
| Favicon na aba | Abrir o app no browser |
| Logo light/dark | Alternar tema no app |
| Maskable safe zone | Upload em [maskable.app/editor](https://maskable.app/editor) |
| PWA install prompt | Chrome DevTools → Application → Manifest |
| Apple touch icon | Safari iOS → Add to Home Screen |
| Lighthouse PWA | Chrome DevTools → Lighthouse → PWA audit |

## Inkscape no Windows (Microsoft Store)

Quando instalado via Microsoft Store, o executavel fica em:

```
C:\Program Files\WindowsApps\25415Inkscape.Inkscape_{VERSION}_x64__9waqn51p1ttv2\VFS\ProgramFilesX64\Inkscape\bin\inkscape.exe
```

Para encontrar dinamicamente:

```powershell
Get-AppxPackage *inkscape* | Select-Object -ExpandProperty InstallLocation
```
