
# Domain Profile: Business Operations

> Appended to `CLAUDE.core.md` by `setup.sh`. This profile assumes a business workspace —
> a company or team running functions such as business development, sales, marketing,
> operations, and HR. "Work product" here means plans, decisions, documents, campaigns,
> processes, and communications rather than code.

## Session Start — profile context files

Beyond the core files, read at session start:

- `.agent-memory/ORG_CONTEXT.md` — company, market, business model, org structure
- `.agent-memory/STAKEHOLDER_MAP.md` — function → owner → documents/systems → external parties
- `.agent-memory/DECISION_LOG.md` — past decisions and their rationale
- `.agent-memory/PROCESS_PLAYBOOK.md` — standard recurring processes (SOPs)
- `.agent-memory/BRAND_CONTEXT.md` — brand voice, messaging, visual identity
- `.agent-memory/FUNC_*.md` — per-function deep documents (`FUNC_SALES.md`, `FUNC_HR.md`, …)

## Pre-work Gates (Must pass before producing any deliverable)

Before producing any business work product — a plan, a decision memo, a deliverable, an
external message — execute these gates **in order** and show the results to the user.

### Gate 1: Read Context
- **Any work** → read `ORG_CONTEXT.md` and the relevant `FUNC_*.md`.
- Decision / strategy / "why did we…" work → read `DECISION_LOG.md` first.
- Recurring or operational work → read `PROCESS_PLAYBOOK.md` first.
- Brand / messaging / external-facing copy → read `BRAND_CONTEXT.md` first.
- Roadmap / priorities / backlog → read `ROADMAP.md` first.

### Gate 2: Stakeholder & Scope Check
Fill in and show the user:
```
Affected functions / parties:
[ ] Business Development
[ ] Sales
[ ] Marketing
[ ] Operations
[ ] HR / People
[ ] Finance / Legal
[ ] External (customers / partners / candidates / vendors)
```
- Customize the function list for your organization.
- Check `[x]` for every function or party the work touches.
- Items marked SHARED in `STAKEHOLDER_MAP.md` affect multiple functions — check all of them.
- A decision in one function usually has consequences in another (pricing → sales + marketing
  + finance; a new hiring process → HR + ops + the hiring manager). Trace those.
- **Address every checked function in one pass. Never ship a partial answer that ignores an affected function.**

### Gate 3: Precedent First
- Check `DECISION_LOG.md` and the existing `FUNC_*.md` for a prior decision or deliverable on the same topic.
- If one exists, **it is the source of truth** — stay consistent with it. Match terminology, numbers, commitments, and positioning.
- To deviate, say so explicitly and surface it to the user as a decision to revisit — never silently contradict a logged decision.

### Gate 4: Completeness Check
Never deliver only the happy path. Always verify:
- **Downstream effects**: who has to *do* something because of this? (approvals, handoffs, notifications, system updates.)
- **Failure / edge cases**: what if the deal stalls, the candidate declines, the campaign underperforms, the vendor misses the date? Plan the off-path branches.
- **Prerequisites**: trace backwards — "what must be true or done before this is usable?"
- **Owners & dates**: every action item has a named owner and a date. "Someone will handle it" is not a plan.

### Gate 5: Voice & Compliance Check
For anything customer-, partner-, candidate-, or public-facing:
- Match `BRAND_CONTEXT.md` voice, tone, and messaging.
- Respect legal / policy / privacy constraints (contracts, employment law, advertising and financial claims, data handling). When unsure, **flag it — do not guess.**
- Confirm what needs review or sign-off before it goes out, and who gives it.
- Numbers, commitments, and dates in external content must trace to a source — no invented figures.

## Multi-function Delegation

When the Gate 2 checklist spans several functions and the work is substantial, spin up one
sub-agent per function (per the core Execution Principles) so each function's deliverable is
produced with full focus. The main thread then reconciles them — checking for contradictions
across functions — before reporting to the user.

## Post-work Checklist (business additions)

In addition to the universal post-work checklist in the core section:

- Update `STAKEHOLDER_MAP.md` if ownership, key documents, or function boundaries changed.
- Log every non-trivial decision in `DECISION_LOG.md` (date, context, decision, rationale, owner).
- Update the relevant `FUNC_*.md` if objectives, processes, initiatives, or metrics changed.
- Update `PROCESS_PLAYBOOK.md` if a recurring process was created or revised.
- Update `BRAND_CONTEXT.md` if a messaging, positioning, or voice decision was made.
