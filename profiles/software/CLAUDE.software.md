
# Domain Profile: Software Product

> Appended to `CLAUDE.core.md` by `setup.sh`. This profile assumes a software codebase
> with one or more platforms (server / web / mobile / …). "Work product" = code.

## Session Start — profile context files

Beyond the core files, read at session start:

- `.agent-memory/PROJECT_CONTEXT.md`
- `.agent-memory/SCHEMA_SUMMARY.md`
- `.agent-memory/BRAND_CONTEXT.md`
- `.agent-memory/FEATURE_MAP.md`
- `.agent-memory/IA_*.md` (per-platform IA documents)
- `.agent-memory/CODEX_HANDOFF.md` ← Read when delegating to Codex (the shared rulebook prepended to every `/codex:rescue` prompt)
- `.agent-memory/concepts/` ← domain concept graph (query with `domain.mjs`, do not bulk-read)

## Pre-work Gates (Must pass before writing any code)

When receiving feature add/modify/delete requests, execute these gates **in order before writing a single line of code** and show results to the user.

### Gate 1: Read Documentation
- UI/UX/branding work → Read `BRAND_CONTEXT.md` first
- Roadmap/TODO/backlog → Read `ROADMAP.md` first
- **All feature work** → Read `FEATURE_MAP.md` (identify which portals the feature belongs to)
- **All feature work** → Read the relevant platform's IA document (`IA_*.md`)

### Gate 2: Cross-platform Checklist
Fill in and show the user:
```
Affected platforms:
[ ] Server
[ ] Web           (client/)
[ ] Mobile iOS    (apps/mobile-ios/)
[ ] Mobile Android (apps/mobile-android/)
```
- Customize the platform list for your project.
- Check `[x]` for each platform that needs changes.
- Features marked SHARED in FEATURE_MAP must check all related portals.
- Even items not in FEATURE_MAP should be checked if they logically affect other platforms.
- **Work on ALL checked platforms at once. Never ship partial coverage.**

### Gate 3: Reference First
- Check FEATURE_MAP and IA docs for existing implementations of the same feature on other platforms.
- If it exists, read that code first and match the same fields, flows, validations, and API calls.
- Existing implementation is the source of truth. New platform only changes the UI for that environment. Never arbitrarily simplify or omit fields.

### Gate 4: Completeness Check
Never build only the happy path. Always verify:
- **Auth flows**: If login exists, check if signup, social login, password reset, and unauthenticated state handling are also needed.
- **Error/edge cases**: Handle network errors, empty states, loading states, and unauthorized states.
- **Real device environment**: localhost/127.0.0.1 is simulator-only. Real devices need actual network IPs.
- **Adjacent features**: Trace backwards — "What does the user need before they can use this feature?"
- **Server API check**: Verify no existing server endpoints are missing from the client.

### Gate 5: i18n Check (if applicable)
When adding/modifying user-facing strings, **always** verify i18n handling. Never leave hardcoded strings.

Hardcoded string ban applies to:
- Button labels, titles, descriptions, placeholders
- Error/success/confirmation messages (toast, alert, modal)
- Empty state messages
- Tab/navigation labels
- Status badge text (booking status, payment status, etc.)

### Gate 6: Domain Concept Impact Check (DOMAIN_MAP)

When adding/modifying schema columns or behavior on **core concepts** (the entities tracked under `.agent-memory/concepts/`):

1. **Run impact query** before starting — list every surface that touches the concept:
   ```bash
   node .agents/scripts/domain.mjs impact <Concept>.<field>
   node .agents/scripts/domain.mjs check-coverage <Concept>
   ```
   Or grep directly: `grep "<Concept>\.<field>" .agent-memory/concepts/*.md`
2. **⚠️ Review flagged surfaces first.** `check-coverage` lists every edge marked `⚠️ explicit select` / whitelist / gap-risk. These cannot be derived automatically — **manually open each** `select:` / `include:` block and confirm new columns are included. (Real production bugs come from forgetting one of these.)
3. **Fold impact surfaces into Gate 2.** Every file path returned by `impact` must show up on the cross-platform checklist. No partial coverage.
4. **Update the concept file.** Before commit, add or revise edges in `.agent-memory/concepts/<Concept>.md`'s `EDGES` block. New verbs require a README + planning-doc update first (free additions are forbidden).
5. **Verifier must pass.** When concept files change, run before commit:
   ```bash
   node .agents/scripts/domain.mjs verify <Concept>
   node .agents/scripts/domain.mjs audit       # all concepts
   ```
   - **FAIL** = graph error → fix immediately.
   - **WARN** = heuristic miss → human review.
   - **KNOWN_GAP** = graph correct, code incomplete (`⚠️ ... missing/gap/NOT YET`) → register in roadmap.
   - **SKIP** = not auto-verifiable → human-only review.

If a concept file does not yet exist, **create it the first time the concept is modified.** Format and conventions live in `.agent-memory/concepts/README.md`. Sub-agent delegation uses `.agent-memory/concepts/AGENT_TEMPLATE.md`.

#### Verify status tiers

| Status | Meaning | Action |
|--------|---------|--------|
| `PASS` | auto-verified | OK |
| `FAIL` | graph error | **fix immediately** |
| `WARN` | heuristic suspicion | human review |
| `SKIP` | not auto-verifiable | human-only |
| `KNOWN_GAP` | graph correct, code incomplete | track in roadmap |

#### Concept-file scanning rules
- **Do not Read whole concept files** for impact analysis — use `domain.mjs impact` or `grep`. Files can be 100+ KB.
- The README in `.agent-memory/concepts/README.md` is the single source of truth for vocabulary and address formats. Always check it before adding a new verb.

## Modern UI Design Skills (use proactively for UI work)

Before hand-rolling any UI/UX/styling work, **prefer Claude Code Skills** that already encode design systems, accessibility rules, and platform guidelines. Pick the skill that matches the surface, then apply its guidance on top of the project's `BRAND_CONTEXT.md`.

| Task type | Skill to call | When |
|-----------|---------------|------|
| Comprehensive UI/UX design + review | `ui-ux-pro-max` | New screens, color/font/spacing decisions, component architecture |
| iOS native (SwiftUI) | `mobile-ios-design` | Apple HIG compliance, SwiftUI patterns |
| Android native (Compose) | `mobile-android-design` | Material Design 3 patterns, Compose UI |
| Mobile design (cross-platform) | `sleek-design-mobile-apps` | Mobile flows, screen prototypes |
| Airbnb-style web aesthetic | `airbnb-ui-skills` | Light mode, Inter font, 4px grid |
| Web Interface Guidelines audit | `web-design-guidelines` | "Review my UI / check accessibility / audit design" |
| React/Next.js performance | `vercel-react-best-practices` | Component, rendering, and bundle optimization |
| Static visual assets | `canvas-design` | Posters, marketing graphics, PDF designs |

Usage rules:

1. **UI work = call a skill first.** If the user asks for a new screen or a design polish, invoke the matching skill before writing code so you receive its tokens, accessibility checks, and patterns.
2. **`BRAND_CONTEXT.md` wins on conflict.** When a skill suggests colors/fonts that disagree with the brand, follow the brand and only borrow structural/accessibility guidance from the skill.
3. **Match the skill to the platform.** iOS code → `mobile-ios-design`; Android → `mobile-android-design`; web → `web-design-guidelines` or `ui-ux-pro-max`. Don't cross-wire.
4. **Review triggers.** "Review my UI", "audit accessibility", "check this design" → start with `web-design-guidelines` or `ui-ux-pro-max`.
5. **No skill available?** Say so to the user, then fall back to `BRAND_CONTEXT.md` plus general design principles.
6. **Persist what you adopt.** Tokens or patterns chosen from a skill go into `BRAND_CONTEXT.md` so the next session reuses them instead of re-deciding.

## 🚨 Codex Delegation Self-Check (efficiency first)

The goal is **saving time**, not creating ritual. Don't add noise rules like "output a decision line on every turn."

### When to self-check
On every implementation request, briefly check **mentally** before starting to code (output not required):

- Multi-file / multi-platform / dozens-of-lines work? → **consider delegating**
- 1–2 spots in 1–2 files? → handle directly
- Still need design conversation? → talk to the user (no delegation)

### Output the decision line *only when the work is large*
For substantial implementations, lead the response with one line:

> **Codex delegation: YES — <why>**  or  **Codex delegation: NO — <why direct>**

For self-evidently small work (typo, 1–2 line fix, config tweak, rule-text edit), don't print the line — it becomes noise.

### When YES, the action is clear
- Call `/codex:rescue`. Don't start writing code yourself.
- Exceptions: user said "you write it yourself", or the task needs multi-round decisions Codex can't handle non-interactively. In those cases work directly and note the reason in one line.

### Common traps (memo, not a hard rule)
- Harness banners (e.g. SessionStart) covering the screen don't excuse skipping the mental self-check.
- "Already half done, may as well finish" — fine for small remainders, but if the rest is still large, switch to delegation mid-task.

## Codex Delegation Workflow (Plan = Claude, Implement = Codex)

If this project uses the `openai/codex-plugin-cc` plugin, **Claude plans/designs/verifies and Codex writes the code**. Claude runs the workflow automatically — the user does not need to ask.

> If the project does not use Codex, delete this section and `.agent-memory/CODEX_HANDOFF.md`.

### Auto-trigger conditions (Claude delegates without asking)

Delegate to Codex when **all** are true (unless the user explicitly says "you write it yourself"):

1. Gates 1–6 have passed.
2. Affected platforms, reference implementations, and completeness checks are settled.
3. The task is **pure implementation** (writing code, not deciding design) and is more than a one-line tweak.

Keep these in Claude's hands instead:
- 1–2 line typos / config tweaks / quick debugging.
- Tasks that still need conversation to settle decisions (Codex is non-interactive).
- Risky actions: deploys, DB migrations, `git push` (always confirm with the user directly).

### Delegation protocol (Claude executes automatically)

1. **Read `.agent-memory/CODEX_HANDOFF.md` in full.** Codex does not read CLAUDE.md, so this file is its only project rulebook.
2. **Compose the rescue prompt** using the template below — paste the full `CODEX_HANDOFF.md` first, then the task spec.
3. **Call `/codex:rescue --background`** with that prompt.
4. **Poll with `/codex:status`** — once immediately, then again after a short interval.
5. **Collect the result with `/codex:result`**.
6. **Verify the result** (see next section). If gaps exist, send a focused re-rescue (max 2 retries). After that, report remaining gaps to the user and finish manually if needed.

### Rescue prompt template

```
====== PROJECT BRIEFING (mandatory, identical every delegation) ======
<paste the full contents of .agent-memory/CODEX_HANDOFF.md here>

====== TASK SPEC ======
## Goal
<one paragraph — what the user can do after this is shipped>

## Affected platforms (Gate 2 result)
[ ] Server
[x] Web
[x] Mobile
[ ] (other portals)
(All checked platforms must be implemented in one pass — no partial coverage.)

## Reference implementations (Gate 3, Reference-First)
- <path 1> — pattern to follow
- <path 2> — fields / validation to mirror

## i18n keys to add or modify (Gate 5)
- <locale file paths> — keys + translations per language

## Completeness checklist (Gate 4)
- [ ] Auth flow handling: <items needed>
- [ ] Error / empty / loading states
- [ ] Real-device base URL (if mobile)
- [ ] Server API gaps to close: <endpoints>

## DB / schema changes
None | Yes (model + fields, suggested migration name)

## Output requirements (CODEX_HANDOFF §8)
1. List of changed files
2. Affected-platforms checklist filled in
3. i18n keys added per locale
4. Known limitations / unfinished items
5. Suggested migration command (if any)
```

### Verification after collecting `/codex:result`

1. **Platform coverage** — every `[x]` platform has actual file changes; if not, re-rescue.
2. **i18n keys** — every supported locale file received the new keys.
3. **Reference parity** — fields, validations, and API calls match the reference implementation cited in the prompt.
4. **Report to the user** — list changed files, unfinished items, and whether a migration is needed. Never run migrations or deploys without explicit user approval.
5. **Update memory** — `FEATURE_MAP.md`, `IA_*.md`, `WORKING_LOG.md`, and clear the entry from `ACTIVE_WORK.md`.

### Operational notes

- Keep `CODEX_HANDOFF.md` and CLAUDE.md in sync. A rule added to one must be mirrored in the other.
- If Codex commits on its own, Claude verifies and reports; only push after explicit user approval.
- If `/codex:rescue` fails or the plugin is not installed, tell the user and fall back to writing the code directly.

## Post-work Checklist (software additions)

In addition to the universal post-work checklist in the core section:

- Update `FEATURE_MAP.md` with new/changed features.
- Update the relevant platform's IA document if screens were added/removed/changed.
- Verify all translation keys exist in locale files (if i18n is active).
- Update `SCHEMA_SUMMARY.md` if the DB schema changed.
- **If a core concept changed**, update `.agent-memory/concepts/<Concept>.md`'s `EDGES` block. Add new edges, revise `⚠️` flags for new explicit selects/whitelists. Run `node .agents/scripts/domain.mjs audit` and confirm overall **FAIL 0** before commit.
