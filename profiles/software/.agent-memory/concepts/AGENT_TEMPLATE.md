# Sub-agent Prompt Template — writing a concept file

> **Purpose**: a standard prompt to delegate the authoring of a new `concepts/<Concept>.md` file to a sub-agent.
> **Key rule**: the sub-agent **must self-verify** and loop until `domain.mjs verify <Concept>` reports **FAIL 0**.
>
> When delegating, **prepend this entire file** to the sub-agent's prompt and append the concept-specific hint.

---

## Working environment
- Working directory: the project repo root.
- **Do not modify code.** You may only write to `.agent-memory/concepts/<Concept>.md`.

## Required reading before you start (in this order)
1. `.agent-memory/concepts/README.md` — format, vocabulary, address conventions
2. An **existing example concept file** (whichever one already exists in this repo). Match its tone, section structure, and edge format exactly.
3. The concept-specific schema/code hint provided by the delegator.

## Vocabulary (12 verbs, no free additions)
- data: `written-by`, `read-by`
- shadow: `shadowed-by`, `effective-via`
- effect: `triggers`, `emits`, `side-effect`
- presentation: `displayed-on`, `rendered-in`, `i18n-keys`
- structure: `derives-from`, `composed-of`

## Address formats
1. `Concept.field` — actual schema field (e.g. `Booking.totalPrice`)
2. `<file path>:<line>` — repo-relative full path (e.g. `server/src/middlewares/auth.middleware.ts:19`)
3. `Pattern.[TAG]` — system message / tag pattern (e.g. `Message.[BOOKING_ADJUSTED]`)

## ⚠️ marker usage
- Use `⚠️` only for explicit `select:` whitelists, gap-risk surfaces, and other things that need manual review when the schema changes.
- For code gaps (graph is correct but code is incomplete), the note must include `⚠️ ... missing|gap|NOT YET|TODO` so the verifier reclassifies `FAIL` → `KNOWN_GAP`.

---

## Common mistakes (sub-agents make these — do not)

### 1. Not splitting multi-target edges
```
❌ User.id → read-by → Message.guestId / Message.hostId / Message.senderId
```
✅ Each is its own edge:
```
User.id → read-by → Message.guestId @ chat row sender/receiver
User.id → read-by → Message.hostId @ chat row sender/receiver
User.id → read-by → Message.senderId @ sender identification
```

### 2. Missing repo-root prefix on file paths
```
❌ middlewares/auth.middleware.ts:19
```
✅ Repo-root relative full path:
```
server/src/middlewares/auth.middleware.ts:19
```

### 3. Action verbs treated as fields
```
❌ POST /auth/register → emits → User.created   (User.created is not a schema field)
```
- Prisma methods (`Model.create`, `Model.upsert`, `Model.deleteMany`) are OK — verifier accepts them.
- Past-participle event names (`Model.created`, `Model.deleted`) are also OK.
- Arbitrary verbs (`Model.fooBar`) collide with schema fields — verifier FAILs.

### 4. Guessing i18n keys
```
❌ rooms.studio → i18n-keys → client/src/locales/*/common.json   (the key may not exist)
```
✅ Only register keys that **actually exist** in the locale files. Grep first, then add.

### 5. Treating derived values as schema fields
```
❌ Review.rating → derives-from → Room.avgRating   (Room.avgRating is not a schema column)
```
✅ Use the actual derivation site:
```
formatRoom.avgRating → derives-from → Review.rating @ controller computes average on response
```

### 6. Wildcard-path conventions
- `client/src/locales/*/common.json` — `*` expands across language subdirs.
- `apps/<x>/src/locales/{en,ko}.json` — brace expansion.
- The verifier recognizes both. Do not invent other patterns.

---

## Output file structure (mirror the existing example)

1. `# <Concept> <!-- concept-anchor -->` plus a short narrative
2. `## Fields` — mutability / special fields / lifecycle constraints
3. `## Lifecycle` — state-transition diagram in plain text
4. `## Cross-concept dependencies` — `[[OtherConcept]]` wiki-style links
5. `## ⚠️ Gap-risk surfaces` (if any)
6. `## i18n surfaces` (separate per-platform locale namespaces)
7. `<!-- ──── EDGES (machine-parseable; format: source → relation → target [@ note]) ──── -->`
8. The edge lines

---

## Self-verify is mandatory (do not skip)

### Step 1 — run the verifier
```bash
node .agents/scripts/domain.mjs verify <Concept>
```

### Step 2 — loop until FAIL 0
- For every `FAIL`, read the line and fix the graph.
- Cross-check against the 6 common mistakes above.
- Run verify again. Stop only when FAIL count is 0.

### Step 3 — review WARN
- `WARN` = heuristic miss (couldn't find the select/include block, suspicious line number).
- Read the actual code to confirm semantic correctness.
- WARN is not a failure — leave it if the meaning is right.

### Step 4 — audit `KNOWN_GAP`
- `KNOWN_GAP` means the graph is right but the code is incomplete.
- Make sure the `⚠️` note clearly states the gap (`missing`, `gap`, `NOT YET`, `TODO`, `deprecated`).
- Report each KNOWN_GAP back to the main agent — it is a roadmap candidate.

### Step 5 — audit the whole graph
```bash
node .agents/scripts/domain.mjs audit
```
Make sure your new file did not break cross-references in other concepts.

---

## Report back to the main agent (≤ 200 words, all required)

Include:
1. **File path** + edge count + verify summary (PASS/FAIL/WARN/SKIP/KNOWN_GAP).
2. **Confirm `verify FAIL 0`** explicitly. Anything else means the work is not done.
3. **Core fields / sub-nodes** covered.
4. **Bidirectional cross-concept relations** that need to be added/updated in *other* concept files (the main agent integrates).
5. **KNOWN_GAP findings** — code-incomplete items, candidates for the roadmap.
6. **New vocabulary needed?** Free additions are forbidden — but if you genuinely need one, surface it. The main agent decides whether to update README and any planning doc.
7. **Real code issues discovered while writing** — actual code gaps (not false positives) that the main agent should know about.

---

## Definition of done

- ✅ `concepts/<Concept>.md` written
- ✅ `domain.mjs verify <Concept>` reports FAIL 0
- ✅ `domain.mjs audit` reports overall FAIL 0
- ✅ Report covers all 7 items above

Until all four are satisfied, do **not** declare the work finished.
