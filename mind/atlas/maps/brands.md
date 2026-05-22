# Brands

> MOC das marcas catalogadas na base. Cada brand tem um pacote de SVGs vetoriais em `mind/x/files/brands/{slug}/`, organizados por tema (`light/` e `dark/`) e por variante (icon, logo, logo-h, logo-v, creative-h, creative-v). Esses arquivos são a fonte canônica de qualquer derivação visual (favicons, PWA icons, apple-touch-icon, headers theme-aware, og:images).

## Contrato dos arquivos fonte

Cada brand segue a mesma estrutura — duas pastas de tema, mesmas variantes em cada uma quando aplicável:

```
mind/x/files/brands/{slug}/
├── light/
│   ├── icon.svg         ícone quadrado (app icon, favicon)
│   ├── logo.svg         logomarca quadrada (composição completa)
│   ├── logo-h.svg       logomarca horizontal (header, navbar)
│   ├── logo-v.svg       logomarca vertical (splash, about)
│   ├── creative-h.svg   criativo horizontal (thumbnails, og:image)
│   └── creative-v.svg   criativo vertical (splash mobile, stories)
└── dark/
    └── (mesmas variantes, cores invertidas para fundo escuro)
```

Convenções: sem padding (viewBox 100% ocupado — padding é adicionado na exportação), grupo `id="brand"` atômico, unidades em `pt`. Detalhes e pipeline de derivação em [[pwa-asset-derivation]].

## Brands catalogadas

| Brand | Pasta | Light | Dark | Notas |
|-------|-------|-------|------|-------|
| **nic** | `mind/x/files/brands/nic/` | icon, logo, logo-h, logo-v, creative-h, creative-v | icon, logo, logo-h, logo-v, creative-h, creative-v | Brand-mãe completa em ambos os temas |
| **director** | `mind/x/files/brands/director/` | icon, logo, logo-h, logo-v, creative-h, creative-v | icon, logo | Variante dark mínima (só icon + logo) — para usos onde só o quadrado dark é necessário |
| **processa** | `mind/x/files/brands/processa/` | icon, logo, logo-h, logo-v, creative-h, creative-v | icon, logo | Idem director — dark mínima |

## Derivação de assets

O manual canônico de geração (Inkscape CLI, parâmetros de padding por destino, manifest PWA, integração no `index.html`, header theme-aware) vive em [[pwa-asset-derivation]]. Vale igualmente para qualquer brand listada acima — basta trocar o `SLUG`.
