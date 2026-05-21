# Domain Concept Graph

This directory expresses the domain as a **web of concepts**, in an LLM-friendly + grep-friendly form.

## Why this exists

Real-world domains are not trees. A single concept (e.g. `Booking`) is entangled with many others (`Message`, `Notification`, `Push`, `Email`, `PDF`, `Room`, `User`...) in **bidirectional, multi-hop** relationships. A folder structure flattens this into a single perspective and loses the cross-cutting links that cause real production bugs (e.g. "I added a column to `Booking` but forgot to add it to the explicit `select:` whitelist on the admin endpoint, so the value silently disappears in the API response").

This format captures the web directly:

- **One file per concept** (`Booking.md`, `Message.md`, ...).
- Each file has narrative sections (lifecycle, fields, cross-concept dependencies, gap-risk surfaces) **plus** a machine-parseable `EDGES` block.
- Edges are triples: `<source> → <relation> → <target> [@ note]`.

The `domain.mjs` helper script reads these edges and answers questions like:

- "If I change `Booking.totalPrice`, what surfaces (API, UI, PDF, push, email, i18n) might break?"
- "Which surfaces of `Booking` are tagged ⚠️ (explicit selects, whitelists, gap-risk patterns)?"
- "Is the graph internally consistent? (verify) Does the code still match the graph? (audit)"

## File format (per concept)

```
# <Concept>  <!-- concept-anchor -->

<short narrative — what this concept is, why it exists>

## Fields
<mutability, special fields, lifecycle constraints>

## Lifecycle
<state transitions, in plain text>

## Cross-concept dependencies
<wiki-style links to [[OtherConcept]]>

## ⚠️ Gap-risk surfaces
<surfaces that need manual review when the schema changes>

## i18n surfaces
<which locale namespaces this concept depends on>

<!-- ──── EDGES (machine-parseable; format: source → relation → target [@ note]) ──── -->
Booking.totalPrice → read-by → server/src/routes/admin.routes.ts:2731 @ ⚠️ explicit select — add new fields here
Booking.totalPrice → displayed-on → client/src/pages/host/HostChat.tsx:PaymentRow
...
```

## Edge vocabulary (12 verbs, no free additions)

| Category | Verb | Meaning |
|---------|------|---------|
| **data** | `written-by` | source is written by the target endpoint/function |
|  | `read-by` | source is read via the target's `select`/`include`/`where` |
| **shadow** | `shadowed-by` | source is shadowed by a target (e.g. `adjustedX` shadows `X`) |
|  | `effective-via` | UI applies the effective value (`adjusted ?? original`) |
| **effect** | `triggers` | source change triggers target change |
|  | `emits` | source emits a target system message / event |
|  | `side-effect` | push / email / notification / other side effect |
| **presentation** | `displayed-on` | source appears on the target UI surface |
|  | `rendered-in` | system message / pattern is rendered by the target renderer |
|  | `i18n-keys` | source depends on i18n keys in the target namespace |
| **structure** | `derives-from` | source is derived from target |
|  | `composed-of` | source is composed of multiple targets |

If a new verb feels necessary, **add it to this README first** (and to any planning doc you maintain), then use it. Verifier tooling rejects unknown relations.

## Address formats (source/target)

1. `Concept.field` — domain node (e.g. `Booking.totalPrice`)
2. `<file path>:<line>` or `<file path>:<anchor>` — code location (e.g. `server/src/routes/admin.routes.ts:2732`, `client/src/pages/host/HostChat.tsx:summary-card`)
3. `Pattern.[TAG]` — system message / message tag (e.g. `Message.[BOOKING_ADJUSTED]`)
4. HTTP endpoint expression — `POST /admin/bookings/:id/adjust`
5. i18n key path — `guest_chat.booking_adjusted_*`

## Note conventions

- `@ ⚠️ ...` — explicit select / whitelist / gap-risk surface (manual review required when schema changes)
- `@ effective(adjusted ?? original)` — shadow pattern surface
- `@ creation only, immutable thereafter` — lifecycle constraint
- `@ ⚠️ NOT YET / missing / gap / TODO` — graph is correct but code is incomplete (verifier reclassifies FAIL → KNOWN_GAP)

## Usage

```bash
# Impact analysis: what does this node touch?
node .agents/scripts/domain.mjs impact Booking.totalPrice

# Per-concept ⚠️-flagged surfaces (manual review list)
node .agents/scripts/domain.mjs check-coverage Booking

# List all concept files with edge counts
node .agents/scripts/domain.mjs list

# Verify graph correctness for one concept
node .agents/scripts/domain.mjs verify Booking

# Audit all concepts at once
node .agents/scripts/domain.mjs audit
```

Or grep directly:

```bash
grep "Booking\.totalPrice" .agent-memory/concepts/*.md
grep "admin\.routes\.ts:2732" .agent-memory/concepts/*.md
```

## When to add a concept

Don't write all concepts up front. Add a concept file the **next time that concept is modified** — that work already requires reading and reasoning about the concept, so you have everything you need.

Initial concept set (suggested):

- `Booking` — orders / reservations / transactions (core entity)
- `Message` — chat / notification messages with system tags
- `User` — user / role / auth model
- `<Domain entity>` — your project-specific main entity (Room, Product, Job, ...)
- `PDF` / `Notifications` / `Email` — fan-out side-effect concepts (if applicable)

## Sub-agent delegation

To delegate a new concept file to a sub-agent, prepend the contents of `AGENT_TEMPLATE.md` to the prompt. **`domain.mjs verify <Concept>` FAIL 0** must be the agent's exit condition.

## Verification tiers

| Stage | Tool | Required? |
|-------|------|-----------|
| Authoring | `AGENT_TEMPLATE.md` self-verify | sub-agent loops until FAIL 0 |
| Commit time | `domain.mjs verify <Concept>` | yes (gate after edge changes) |
| Steady state | `domain.mjs audit` | overall FAIL 0 maintained |
| Schema regression | `check-coverage` ⚠️ flags | manual review when schema changes |

## Verify result tiers (4-tier + KNOWN_GAP)

| Status | Meaning | Action |
|--------|---------|--------|
| `PASS` | auto-verification passed | OK |
| `FAIL` | graph error (bad path, missing field, multi-target slash, ...) | **fix immediately** |
| `WARN` | heuristic suspicion (e.g. select block not found near line) | human review |
| `SKIP` | not auto-verifiable (semantic anchor, sub-node, opaque expression) | human-only |
| `KNOWN_GAP` | graph is correct, code is incomplete (⚠️ note marks missing/gap/NOT YET) | track in roadmap |
