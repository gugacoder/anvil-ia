# Contrato estrutural da base

> Map curado do substrato meta-LYT desta base. A pasta `atlas/meta/` reúne todo conhecimento sobre **como a base é organizada** — separado de `atlas/concepts/`, que reúne o que o agente sabe sobre o mundo. Edite só se estiver fazendo fork do contrato.
>
> Este é o contrato da **estrutura**, não dos **processos**. A operação interna de cada sistema vive sob `.systems/<system>/`.

A base segue [[LYT]] aplicado a `mind/`. Conhecimento é grafo, não árvore. Pastas são anatomia; o significado vive nas arestas. O agente opera como **note-maker** (síntese), não note-taker (estocagem) — veja [[PKM]].

## Estrutura de pastas

```
mind/
├── HOME.md                 # MOC raiz da base
├── +/                      # inbox (Add)
├── atlas/                  # Atlas — atemporal
│   ├── concepts/           #   conceitos atômicos curados pelo agente
│   ├── connections/        #   sínteses transversais
│   ├── maps/               #   higher-order notes (MOCs/Hubs)
│   ├── meta/               #   substrato meta-LYT (átomos sobre a estrutura)
│   ├── qa/                 #   Q&A finalizada
│   └── works/              #   saídas entregues
├── calendar/               # Calendar — ponto no tempo
│   ├── notes/              #   logs diários (append-only)
│   ├── events/             #   notas datadas
│   └── system/             #   gerado por código
├── effort/                 # Efforts — timespan
│   ├── on/                 #   frentes ativas
│   ├── slow/               #   frentes pausadas
│   └── off/                #   frentes abandonadas
└── x/                      # artefatos não-nota
    ├── files/              #   binários preservados do inbox
    ├── work/<slug>/        #   artefatos por frente
    └── <system>/           #   estado interno de sistema
```

## Filosofia LYT

O método. [[LYT]] é o núcleo; [[PKM]] estabelece a postura (sintetizar, não estocar); [[ACE]] e [[ARC]] são, respectivamente, como o conhecimento é particionado e como flui. [[MOC]] é o tipo de nota que faz a curadoria emergir.

- [[LYT]] · [[PKM]] · [[ACE]] · [[ARC]] · [[MOC]]

## Vocabulário

Conceitos auxiliares que o método invoca. [[evergreen]] e [[BOAT]] descrevem o ciclo de vida de uma nota. [[higher-order-notes]] e [[heterarchy]] explicam a topologia. [[proximity]], [[link-curation]] e [[thought-collisions]] modulam a qualidade dos links. [[squeeze-point]] e [[fluid-taxonomies]] guiam a reorganização. [[refraction]] e [[progressive-ideation]] são posturas de trabalho.

- [[evergreen]] · [[BOAT]] · [[higher-order-notes]] · [[heterarchy]] · [[proximity]] · [[link-curation]] · [[thought-collisions]] · [[squeeze-point]] · [[fluid-taxonomies]] · [[refraction]] · [[progressive-ideation]]

## Locations

Specs de cada pasta da base — o que cada lugar guarda e em que formato. [[home]] descreve o MOC raiz; [[inbox]], o staging transitório. Atlas e Calendar têm specs por tipo de nota.

- [[home]] · [[inbox]]
- Atlas: [[concept-spec]] · [[connection-spec]] · [[qa-spec]] · [[work-spec]] · [[map-spec]]
- Calendar: [[calendar-note-spec]] · [[event-spec]] · [[calendar-system-spec]]

## Layer effort

A camada de trabalho em curso. [[effort]] descreve a camada; [[effort-shapes]] o formato single/multi-note; [[effort-graduation]] o destino das notas ao terminar. [[effort-semantics]] articula a divergência do LYT estrito.

- [[effort]] · [[effort-shapes]] · [[effort-graduation]] · [[effort-semantics]]

## Layer x

A camada de artefatos não-nota. [[x]] descreve a camada; [[x-files]], [[x-work]] e [[x-system]] cobrem os três namespaces flat.

- [[x]] · [[x-files]] · [[x-work]] · [[x-system]]

## Regras operacionais

Regras invariantes que valem em toda escrita à base. [[invariants]] consolida 13 delas; [[threshold]] define o limite quantitativo de split de MOC (30 entradas); [[moc-growth]] separa "MOC reorganiza" de "Nota subdivide"; [[home-reachable]] exige que toda nota seja alcançável a partir de HOME, direta ou indiretamente.

- [[invariants]] · [[threshold]] · [[moc-growth]] · [[home-reachable]]

## Auxiliares

- [[tmp]] — `.tmp/` fora da base
