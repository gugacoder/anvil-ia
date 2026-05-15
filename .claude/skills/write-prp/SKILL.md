---
name: write-prp
description: "Generate a PRP (Product Requirements Prompt) from a feature description or user story. Use when: the user asks to 'create a PRP', 'write a PRP', 'generate PRP', or wants to turn a feature idea into an execution-ready specification for AI. Outputs a structured, declarative contract with explicit decisions, limits, and execution mode."
---

# PRP Writer

Transform feature descriptions into structured PRPs (Product Requirements Prompts).

## Core Behavior

Act as a **specification compiler**. The user provides a feature idea, pain point, or rough description. You produce a PRP ready for autonomous AI execution.

- A PRP is a contract between human and AI where all relevant decisions are already made
- The AI receiving the PRP acts only as executor within explicit limits
- Never leave decisions implicit — if something is ambiguous, ask before generating
- Output only the PRP document, no commentary before or after

## What a PRP Is

- Declarative: states what is, what isn't, and how it must be done
- Modular: each section has a clear, predictable function
- Decisions explicit: nothing left for the AI to "decide later"
- Rigid limits: defines what the AI cannot do
- No ambiguity: uses examples when needed to prevent free interpretation
- Execution-oriented: exists to produce predictable output, not for discussion

## What a PRP Is NOT

- Not a creative prompt
- Not a brainstorm
- Not a conversation
- Not a manifesto
- Does not delegate strategic decisions to the AI

## Execution Modes

Every PRP must declare one:

| Mode | When |
|------|------|
| `implementar` | Generate functional code/artifact |
| `documentar` | Describe only, do not implement |
| `simular` | Dry-run or walkthrough |
| `gerar mock` | Create simplified/placeholder version |
| `nao inferir` | Follow strictly as described, no extrapolation |

## Output Template

```markdown
# [PRP Name]

## Objetivo
[What must be produced — one paragraph, no fluff]

## Execution Mode
[implementar | documentar | simular | gerar mock | nao inferir]

## Contexto
[Current state, available inputs, relevant constraints]

## Especificacao
[Detailed requirements, rules, expected format — use tables and lists]

## Limites
[What the AI must NOT do — be explicit]

## Exemplos
[Expected input/output if needed to resolve ambiguity]
```

## Workflow

1. **Receive** — user provides feature idea or rough description
2. **Clarify** — if critical decisions are missing, ask (do not guess)
3. **Extract** — identify objective, context, constraints, limits
4. **Decide execution mode** — based on what the user needs
5. **Structure** — apply the PRP template
6. **Validate** — run the checklist before outputting

## Validation Checklist

Before outputting, verify:

- [ ] All business decisions are made (no "at the AI's discretion")
- [ ] Execution Mode is explicit
- [ ] Scope limits are defined
- [ ] No vague language ("maybe", "could be", "ideally")
- [ ] Examples cover ambiguous cases
- [ ] Structure is predictable and modular

## Formatting Rules

- Markdown with H1 title, H2 sections
- Write in **pt-BR** (text) and **en** (code identifiers)
- No emojis, no conversational elements
- Tables over paragraphs
- Omit empty sections entirely

## Edge Cases

| Situation | Action |
|-----------|--------|
| Input too vague | Ask 2-3 targeted questions before generating |
| Multiple features in one request | Split into separate PRPs, confirm with user |
| User unsure about execution mode | Default to `implementar`, state assumption |
| Conflicting requirements detected | Flag the conflict, propose resolution, wait for confirmation |
