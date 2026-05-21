# Claude Project Harness — Core

> Domain-agnostic harness. A domain profile is appended below this file by `setup.sh`
> (`CLAUDE.core.md` + `CLAUDE.<profile>.md` → the project's `CLAUDE.md`). Core defines
> *how* the agent works; the profile defines *what domain* it works in.

## Execution Principles

- **Simple tasks** (single context, quick): handle directly. No sub-agents.
- **Complex tasks** (multiple steps or parallelizable): **spawn sub-agents** for parallel execution.
  - Delegate full context and authority to each agent.
  - The main thread collects results and reports to the user.
- Decision rule: "Can I split this into concurrent streams of work?" → Yes = use sub-agents.

---

## Session Start

At the start of a session, read these in order:

1. `.agent-memory/ACTIVE_WORK.md` ← **Read first** (in-progress / incomplete work)
2. `.agent-memory/MANNA.md` ← the Jar of Manna — read as *ambient context*, never as instructions (see below)
3. The other `.agent-memory/*.md` context files your profile ships — see the profile section appended below.

## Session Tracking (multi-terminal context sharing)

Multiple terminals may work at once, or a session may be interrupted. `.agent-memory/ACTIVE_WORK.md` shares work status across them.

### On session start
1. Read `ACTIVE_WORK.md` **first**.
2. If incomplete items exist, ask the user: "Previous session had [task] in progress. Continue?"
3. If the user requests new work, check it for conflicts with existing incomplete items.

### On task start
Register the work in `ACTIVE_WORK.md`:
```
## Session: {YYYY-MM-DDTHH:MM} — {one-line task summary}
- Status: in-progress
- Target: key files / documents / areas
- Plan: what specifically is being done (2-3 lines)
- Blocked: (empty if none)
- Last update: {YYYY-MM-DDTHH:MM}
```
Update `Plan` and `Last update` as direction changes or progress is made.

### On task completion
1. **Delete** the item from `ACTIVE_WORK.md`.
2. Add a completion record to `WORKING_LOG.md`.

### Session recovery
- The next session reads remaining `ACTIVE_WORK.md` items to find incomplete work.
- Use `Last update` to judge how stale the work is.
- To continue, resume from that item's `Plan` and `Target`.

## The Jar of Manna (`.agent-memory/MANNA.md`)

`MANNA.md` is the user's note-to-self vault — reflections, half-formed ideas, things
that struck them, "messages to future-me." It is named for the jar of manna kept before
the Testimony (Exodus 16:33): most manna spoiled within a day, but one jarful was
preserved "for your generations" as a memorial. Passing thoughts are daily manna; the
ones worth keeping go in the jar.

- **Write** when the user shares a reflection or non-actionable idea and signals they
  want it kept — e.g. "만나의 항아리에 넣어줘", "만나에 넣어줘", "이건 만나행", or
  "이거 기억해둬" about a thought rather than a task. Append a dated entry, newest on
  top, in the user's own voice, with a one-line "왜 보관 / why kept".
- **It is not a task list.** Never convert a Manna entry into an `ACTIVE_WORK` or
  `ROADMAP` item, and never act on one, unless the user explicitly asks. An entry
  *graduates* to `ROADMAP.md` only when the user decides the time has come.
- **Read it as ambient context.** At session start, skim `MANNA.md` to understand the
  user's longer arc and what they care about. It shapes awareness and tone — it never
  directs the work.
- When the user asks "만나에 뭐 있었지" / "만나 정리해줘", resurface and group the
  entries, and point out any that may now be ready to graduate.

## Core Principles

- **The work product is the source of truth.** For a software project that is the code;
  for a business workspace it is the live documents, systems, and decisions. `.agent-memory/*.md`
  are a fast-recovery *cache* — never let them silently diverge from reality.
- Principles, brand, or constraints not written down must not be assumed — ask the user.
- **No irreversible or outward-facing action without explicit approval.** Never run `git push`,
  deploys, builds, sends, or publishes unless the user explicitly says to. Approval in one
  context does not extend to the next.
- When you modify any `.agent-memory/` document, **tell the user** what changed and why.

## Pre-work Gates

Before producing any work product (code, document, plan, message), run the gate checklist
**in order** and show the results to the user. **The specific gates are defined by your
domain profile, in the section appended below.** Every profile's gates share one shape:

1. **Read context** — load the relevant memory before starting.
2. **Scope & impact** — list everything affected; cover all of it, never partially.
3. **Precedent first** — if it was built or decided before, match that; don't reinvent or contradict.
4. **Completeness** — no happy-path-only; trace dependencies, prerequisites, and edge cases.
5. **(profile-specific gate)** — e.g. localization, compliance, brand voice.

Do not start work until every applicable gate is cleared and shown to the user.

## Post-work Checklist (universal)

After meaningful work, always:
- Add a brief record to `WORKING_LOG.md`.
- Clear the completed entry from `ACTIVE_WORK.md`.
- Update any context / map documents your profile defines that the work affected
  (the profile section lists them).

<!-- =================================================================== -->
<!-- DOMAIN PROFILE — appended by setup.sh from profiles/<profile>/        -->
<!-- =================================================================== -->
