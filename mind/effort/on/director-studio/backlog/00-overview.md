# 00 — Overview do protótipo Director.Studio

> Este backlog rastreia tarefas de implementação do **protótipo**. Conhecimento atemporal sobre a plataforma vive no mind, não aqui. Quando o protótipo virar produto, conceitos relevantes graduam para `mind/atlas/concepts/`.

## Conceito

Ver [[mind/atlas/concepts/director-studio]] — tese, escopo, justificativa.

## Conhecimento dependente (atlas)

- [[mind/atlas/concepts/director-studio]] — o que é a plataforma
- [[mind/atlas/concepts/acesso-metamodel]] — schema do banco que o Studio renderiza
- [[mind/atlas/concepts/processa-auth-paths]] — os 5 caminhos de auth a replicar
- [[mind/atlas/concepts/react-tools]] — framework atual; referência de contrato
- [[mind/atlas/concepts/appbuilder]] — ancestral conceitual do cadastro
- [[mind/atlas/concepts/director-web]] — evidência da viabilidade (20 linhas)

## Estrutura do protótipo

```
workspace/director-studio/
├── apps/
│   └── director-studio/        # Vite SPA
├── packages/
│   └── ui/                     # shadcn components
├── package.json                # workspace root
├── TODO.md                     # dívidas técnicas conhecidas
└── backlog/                    # este diretório
```

Backend Hono (`apps/api`) entra em iteração posterior; primeiro fechamos frontend + auth.

## Estado

Pré-bootstrap. Não foi rodado nenhum comando ainda. Decisões de stack consolidadas em [[01-stack]]; decisões de auth em [[02-auth]]; estratégia de rendering em [[03-rendering]].
