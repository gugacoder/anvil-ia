---
title: "Frente: Director.Studio"
aliases: [director-studio-frente, director-studio-effort]
tags: [effort, director-studio, frente]
created: 2026-05-15
updated: 2026-05-15
status: on
---

# Frente: Director.Studio

> MOC desta frente. Toda decisão, manifesto, progresso e spec da frente é alcançável daqui.

Reescrita completa do ecossistema Processa (AppBuilder + Portal Director + Director.Web/WMS + ADM) em uma plataforma única: **Director.Studio**. Detalhes em [[director-studio]].

**Mandato**: 100% RTM, não MVP. Substitui o sistema legado em produção. Conformidade com contratos extraídos pelo arqueólogo é absoluta.

## Time

| Agente | Papel | Mandato |
|---|---|---|
| `archaeologist` | Verdade | Extrai contratos de dados/templates/procs do legado |
| `designer` | UX | Cataloga componentes do design system em `atlas/concepts/ui-system/` |
| `curator` | Escopo | Mantém o feature-manifest e aceita features prontas |
| `smith` | Engenharia | Implementa em stack moderna, livre |
| `ui-tester` | Verificação | Valida via Chrome MCP contra contratos + UX specs |

## Artefatos vivos

- [[MISSION]] — **norte vinculante** da frente; lido por todos os agentes antes de cada wave
- [[PERSONA]] — **âncora humana vinculante**: Time Director (atacadista/varejista BR tipo Bahamas), do escritório à frente de loja
- [[feature-manifest]] — tabela mestre de features e status
- [[progress-messages]] (`progress-messages.txt`) — log append-only de todos os agentes
- `backlog/` — decisões de implementação por área
- `design-spec/` — specs por feature quando o design system não bastar

## Conhecimento dependente (atlas)

- [[director-studio]] — conceito da plataforma
- [[processa-auth-paths]] — modelo de auth a replicar
- [[acesso-metamodel]] — schema que dirige a UI
- [[react-tools]] — framework atual (referência de contrato)
- `atlas/concepts/legacy-contracts/` — contratos extraídos pelo arqueólogo
- `atlas/concepts/ui-system/` — design system catalogado pelo designer

## Estado atual

Bootstrap concluído em `workspace/director-studio/`. Setup wizard funcional (F001-F002 done aguardando aceite do curator). Demais features no `todo`.
