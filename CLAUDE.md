# Agent Memory Template — Harness Builder

This repository is **not** a ready-to-use harness. It is a *builder*: a domain-agnostic
`core/` plus swappable `profiles/`. Run `setup.sh` to compose a harness into a project.

## Layout

- `core/` — domain-agnostic harness (session tracking, gate framework, hooks, sub-agents).
- `profiles/software/` — software-product profile (tech stack, schema, IA, i18n, Codex, DOMAIN_MAP).
- `profiles/business/` — business-operations profile (org, stakeholders, decisions, per-function docs).
- `setup.sh` — composes `core` + a chosen profile into a target project.

## Working in this repo

- Keep `core/` domain-agnostic. Anything that assumes a software codebase or a specific
  business function belongs in a profile, **not** in core.
- `setup.sh` concatenates `core/CLAUDE.core.md` + `profiles/<x>/CLAUDE.<x>.md` into the
  target project's `CLAUDE.md`. Keep headings non-conflicting across the two.
- A rule added to one profile's `CLAUDE.<profile>.md` does not auto-apply to the other —
  decide per profile.
- The harness hooks (`core/.claude/`) are dormant while editing this builder repo; they
  activate only after `setup.sh` places `.claude/` at a target project root.

See `README.md` for full usage.
