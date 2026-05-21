# Agent Memory Template

A reusable **agent harness** for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — persistent memory, session continuity, pre-work safety gates, automated reminders, and specialized sub-agents.

It is built in two layers so the same harness works for **software projects** *and* for **general business operations**:

- **`core/`** — a domain-agnostic harness: session tracking, the gate framework, hooks, sub-agents.
- **`profiles/`** — domain packs that plug into core:
  - **`software/`** — software product work (tech stack, DB schema, IA, i18n, Codex delegation, domain concept graph).
  - **`business/`** — business operations (org context, stakeholders, decision log, per-function docs — business development / sales / marketing / operations / HR).

You pick a profile at setup time; `setup.sh` composes `core` + the profile into a ready harness.

## Repository Layout

```
agent-memory-template/
├── setup.sh                       ← composes core + a profile into a project
├── core/                          ← domain-agnostic harness
│   ├── CLAUDE.core.md             ← execution rules, session tracking, gate framework
│   ├── gitignore.snippet
│   ├── .claude/
│   │   ├── settings.json          ← hook configuration
│   │   ├── hooks/                 ← pre-edit gate / memory-change / post-task reminders
│   │   └── agents/                ← 7 specialized sub-agents
│   └── .agent-memory/
│       ├── ACTIVE_WORK.md         ← in-progress task tracker (multi-terminal safe)
│       ├── WORKING_LOG.md         ← rolling change timeline
│       ├── ROADMAP.md             ← now / next / later backlog
│       └── MANUAL_NOTES.md        ← durable notes
└── profiles/
    ├── software/
    │   ├── CLAUDE.software.md      ← Gates 1-6, Codex workflow, UI skills
    │   ├── .cursor/rules/
    │   ├── .agents/scripts/domain.mjs
    │   └── .agent-memory/          ← PROJECT_CONTEXT, SCHEMA_SUMMARY, FEATURE_MAP,
    │                                  IA_TEMPLATE, BRAND_CONTEXT, CODEX_HANDOFF, concepts/
    └── business/
        ├── CLAUDE.business.md      ← business Gates 1-5, multi-function delegation
        ├── .cursor/rules/
        └── .agent-memory/          ← ORG_CONTEXT, STAKEHOLDER_MAP, DECISION_LOG,
                                       PROCESS_PLAYBOOK, BRAND_CONTEXT, FUNCTION_TEMPLATE
```

## Quick Start

```bash
git clone https://github.com/harrysong961205/agent-memory-template.git /tmp/harness

# Compose a harness into your project:
/tmp/harness/setup.sh software /path/to/your-software-project
# or
/tmp/harness/setup.sh business /path/to/your-business-workspace
```

`setup.sh` copies `core/` + the chosen profile into the target and concatenates
`CLAUDE.core.md` + `CLAUDE.<profile>.md` into a single `CLAUDE.md`.

### After setup

1. Fill in the `.agent-memory/` context files — or ask Claude: _"Read this project and fill in `.agent-memory/`."_
2. **software** — customize the Gate 2 platform list in `CLAUDE.md`; copy `IA_TEMPLATE.md` once per platform (`IA_WEB.md`, `IA_IOS.md`, …).
3. **business** — customize the Gate 2 function list in `CLAUDE.md`; copy `FUNCTION_TEMPLATE.md` once per function (`FUNC_SALES.md`, `FUNC_HR.md`, …).

## How It Works

### The gate framework

Both profiles run a pre-work gate checklist before any work product is produced. The gates
share one shape — only the domain wording changes:

| # | Software profile | Business profile | Purpose |
|---|------------------|------------------|---------|
| 1 | Read Documentation | Read Context | Load relevant memory before starting |
| 2 | Cross-platform Checklist | Stakeholder & Scope Check | List everything affected; cover all of it |
| 3 | Reference First | Precedent First | Match prior work/decisions; never reinvent or contradict |
| 4 | Completeness Check | Completeness Check | No happy-path-only; trace dependencies and edge cases |
| 5 | i18n Check | Voice & Compliance Check | Localization / brand voice + legal-policy guardrail |
| 6 | Domain Concept Impact (DOMAIN_MAP) | — | Schema/behavior ripple check (software only) |

`core/CLAUDE.core.md` defines the framework; each profile defines its own concrete gates.

### Session Tracking

`ACTIVE_WORK.md` enables multi-terminal and session-recovery workflows:
- Register work when starting → recover if a session crashes.
- Multiple terminals can see each other's in-progress tasks.
- Completed work moves to `WORKING_LOG.md`.

### 3 Hooks (automated guardrails — core)

| Hook | Trigger | What it does |
|------|---------|-------------|
| `pre-edit-gate-check.sh` | Before Edit/Write | Reminds the agent to pass gates before editing code (once per day) |
| `notify-memory-change.sh` | After Edit/Write | Alerts when `.agent-memory/` is modified |
| `post-task-reminder.sh` | On Stop | Reminds the agent to update memory docs if work is in progress |

### 7 Specialized Sub-agents (core)

| Agent | Role |
|-------|------|
| **Jenny** | Verify implementation matches specifications |
| **Karen** | Reality-check completion status |
| **ultrathink-debugger** | Deep root cause analysis for hard bugs |
| **task-completion-validator** | Verify claimed completions actually work |
| **code-quality-pragmatist** | Catch over-engineering and unnecessary complexity |
| **claude-md-compliance-checker** | Ensure changes follow `CLAUDE.md` rules |
| **ui-comprehensive-tester** | Thorough UI testing across web/mobile |

These ship in `core/` as available capabilities; the software profile uses them most.

## The `software` Profile

Adds, on top of core:

- **Gate 6 — DOMAIN_MAP.** Real domains are webs, not trees: a single column on `Booking` can
  ripple through endpoints, UI surfaces, locale files, PDF/push/email templates.
  `.agent-memory/concepts/` is a per-concept edge graph, and `.agents/scripts/domain.mjs`
  answers `impact` / `check-coverage` / `verify` / `audit` queries so schema-vs-API drift
  surfaces as `FAIL` instead of a production bug.
- **Codex Delegation Workflow.** If the project uses the `openai/codex-plugin-cc` plugin,
  Claude plans/verifies and Codex implements; `CODEX_HANDOFF.md` is the shared rulebook.
- **Modern UI Design Skills.** `CLAUDE.md` maps each UI surface to a Claude Code design skill.
- Memory: `PROJECT_CONTEXT`, `SCHEMA_SUMMARY`, `FEATURE_MAP`, `IA_TEMPLATE`, `BRAND_CONTEXT`,
  `CODEX_HANDOFF`, `concepts/`.

## The `business` Profile

Adds, on top of core, the same discipline applied to running a business across functions
(business development, sales, marketing, operations, HR, finance/legal):

- **Business gates 1-5** — Read Context → Stakeholder & Scope → Precedent First →
  Completeness → Voice & Compliance.
- **Multi-function delegation** — one sub-agent per affected function for parallel work,
  reconciled in the main thread.
- Memory:
  - `ORG_CONTEXT.md` — company, market, business model, org structure.
  - `STAKEHOLDER_MAP.md` — function → owner → documents/systems → external parties (the
    cross-function impact guide).
  - `DECISION_LOG.md` — dated decisions + rationale; the source of truth for "Precedent First".
  - `PROCESS_PLAYBOOK.md` — standard recurring processes (SOPs).
  - `BRAND_CONTEXT.md` — brand voice, messaging, visual identity, compliance notes.
  - `FUNCTION_TEMPLATE.md` — copy per function (`FUNC_SALES.md`, `FUNC_HR.md`, …).

## Problems This Solves

| Problem | Solution |
|---------|----------|
| Agent loses context between sessions | `.agent-memory/` persists knowledge |
| Session crashes mid-task | `ACTIVE_WORK.md` session tracking + recovery |
| Agent quietly changes memory docs | Hook: `notify-memory-change.sh` |
| Fixed web but forgot mobile / ignored an affected team | Gate 2: Cross-platform / Stakeholder check |
| Reinvented a feature / contradicted a past decision | Gate 3: Reference / Precedent First |
| Shipped only the happy path | Gate 4: Completeness Check |
| Schema column added but missing from an API select | Gate 6 + DOMAIN_MAP `verify` (software) |
| Off-brand or non-compliant external content | Gate 5: Voice & Compliance Check (business) |

## Adding a New Profile

1. Create `profiles/<name>/CLAUDE.<name>.md` — define that domain's gates and session-start files.
2. Add `profiles/<name>/.agent-memory/` with the domain's memory templates.
3. Optionally add `profiles/<name>/.cursor/` and other profile-only assets.
4. `setup.sh <name> <target>` works automatically once `profiles/<name>/` exists.

Keep anything truly domain-agnostic in `core/` so every profile inherits it.

## License

MIT — Use freely in any project.
