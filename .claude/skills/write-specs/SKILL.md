---
name: write-specs
description: "Generate a structured spec document following project patterns. Use when: the user asks to 'create a spec', 'write a spec', 'generate requirements', 'write user stories', 'create ER diagram', 'design doc', 'UI guide', or 'feature spec'. Supports 6 spec types: requirements, user stories, ER model, design/architecture, UI/UX guide, and feature spec."
---

# Spec Writer

Generate structured specification documents following standardized patterns.

## Core Behavior

Act as a **specification architect**. The user describes what they need specified. You produce a document conforming strictly to the type's format rules.

- Output only the spec document, no commentary
- Use tables over paragraphs — always
- Portuguese (pt-BR) for text, English for code (variables, SQL, types)
- Tone: direct, declarative, no flourish
- IDs are sequential with consistent prefixes
- Every spec ends with a Rastreabilidade (traceability) section

## Spec Type Selection

Ask the user which type, or infer from context:

| Type | File Pattern | When |
|------|-------------|------|
| **Requirements** | `{project}-requirements.md` | Atomic "O Sistema Deve" statements |
| **User Stories** | `{project}-user-stories.md` | Who/wants/for stories with acceptance criteria |
| **ER Model** | `{project}-er.md` | Database entities, relationships, enums, indexes |
| **Design** | `{project}-design.md` | Stack, architecture, conventions, security |
| **UI Guide** | `{project}-ui-guide.md` | Tokens, components, page patterns, accessibility |
| **Feature Spec** | `{project}-{feature}.md` | Complex features needing dedicated documentation |

---

## Type 1: Requirements

Atomic statements in OSD ("O Sistema Deve") pattern.

### Format

```markdown
# {Project} - {Descriptive Title}

{One sentence describing the document's purpose.}

---

## {Module}

### RF - Requisitos Funcionais

| ID | Requisito |
|----|-----------|
| OSD001 | O sistema deve ... |

### RNF - Requisitos Nao Funcionais

| ID | Requisito |
|----|-----------|
| RNF001 | O sistema deve ... |

---

## Rastreabilidade

| Modulo | Requisitos |
|--------|------------|
| {Module} | OSD001-OSD011 |
```

### Rules

- Prefix `OSD` for functional, `RNF` for non-functional
- Sequential IDs grouped by module with reserved ranges
- Each requirement: one sentence, one infinitive verb, one testable capability
- No vague requirements — use metrics ("in less than 2 seconds")
- Include **Matriz de Permissoes** when permissions are involved

---

## Type 2: User Stories

### Format

```markdown
## {User Type}

### US001 - {Short Title}
**Como** {role}
**Quero** {action}
**Para** {benefit}

**Criterios de Aceite:**
- [ ] {Verifiable criterion}

**Requisitos:** OSD001, OSD002
```

### Rules

- Prefix `US` with sequential IDs
- ID ranges by role (001-008 member, 020-023 volunteer, etc.)
- Acceptance criteria as checklist (`- [ ]`) — each verifiable
- Always reference OSD IDs from requirements
- Group by user type, least privileged to most

---

## Type 3: ER Model

### Format

```markdown
## Diagrama Entidade-Relacionamento

{Mermaid erDiagram}

## Entidades Detalhadas

### {table_name}
{One line of context.}

| Campo | Tipo | Descricao |
|-------|------|-----------|

## Enums

{SQL block}

## Indices Recomendados

{SQL block with comments}

## Relacionamentos Principais

1. **Entity -> Entity**: cardinality via join_table
```

### Rules

- Mermaid diagram at top (macro view)
- One subsection per entity with field table
- Tables and fields in snake_case (English)
- Enum values in Portuguese when user-facing
- Relationships as numbered list with cardinality

---

## Type 4: Design & Architecture

### Format

```markdown
## Stack Principal

| Camada | Tecnologia | Justificativa |
|--------|------------|---------------|

## Estrutura do Monorepo

{Directory tree in code block}

## Autenticacao

{Numbered flow}

## Convencoes de Codigo

| Item | Convencao | Exemplo |
|------|-----------|---------|

## Seguranca

{Checklist with [x]}

## Performance

| Metrica | Alvo | Medicao |
|---------|------|---------|
```

### Rules

- Stack as table with justification (why, not just what)
- Flows as numbered lists or ASCII diagrams
- Libraries with version
- Technical decisions are binding
- Performance with concrete metrics and measurement tool

---

## Type 5: UI/UX Guide

### Format

```markdown
## Principio Fundamental

**{One bold sentence.}**

## Tokens Semanticos

| Token | Uso | Exemplo |

### Uso Correto

// wrong
// right

## Componentes

| Componente | Uso |

## Padroes de Pagina

{Reference JSX}

## Acessibilidade

- [ ] {Checklist item}
```

### Rules

- Fundamental principle in one bold sentence
- Tokens as table with use and concrete example
- JSX examples with correct/prohibited for style rules
- Component catalog by category
- Page templates (List, Form, Detail, Dashboard)
- Accessibility as checklist

---

## Type 6: Feature Spec

For complex features needing dedicated documentation.

### Format

Numbered sections: 1. Objetivo, 2. Estrategias, 3. Fluxos por Contexto, 4. Requisitos Funcionais, 5. Componentes, 6. Banco de Dados, 7. Server Actions, 8. Hook, 9. Integracao, 10. Rastreabilidade, 11. Metricas de Sucesso.

### Rules

- Own ID prefix per feature (OB for onboarding, EV for events, etc.)
- Components with: exact location, TS props interface, behavior list
- Complete SQL schema with types, FK, constraints
- Server Actions as signatures (not implementation)
- Hook with full return interface
- Integration shows JSX for plugging into existing app
- Metrics with numeric values

### When to Create

Create a feature spec when the feature:
- Has different flows per user profile
- Needs dedicated UI components
- Needs own database tables
- Is too complex for a user story

---

## Quality Checklist

Before outputting, verify:

- [ ] Title follows `# {Project} - {Title}` with descriptive sentence
- [ ] Tables where paragraphs could be
- [ ] Sequential IDs with consistent prefix
- [ ] Each requirement is atomic and testable
- [ ] Code examples where applicable
- [ ] Correct/prohibited markers for style rules
- [ ] Rastreabilidade section at the end
- [ ] No duplication with other specs
- [ ] Portuguese in text, English in code
