# Codex Handoff Briefing — [Project Name]

> **Purpose**
> When Claude delegates implementation to Codex via `/codex:rescue`, **the entire contents of this file are prepended to the rescue prompt**. Codex does not read `CLAUDE.md`, so this file is the only project rulebook Codex sees. Any new rule added to `CLAUDE.md` must also be reflected here.
>
> **When to use**: only meaningful for projects that use the `openai/codex-plugin-cc` plugin. If you do not delegate to Codex, delete this file.

---

## 1. Project Identity

- **Name**: (project name)
- **Nature**: (one-line product description, plus any business-structure notes — e.g. "marketplace by structure but operated as a single-host service; never add third-party marketplace disclaimers")
- **Domain**: (production domain)

## 2. Repo Layout (top-level paths Codex must know)

| Path | Platform | Lang | i18n |
|------|----------|------|------|
| `server/` | Backend | TS / Node / etc. | (Korean only / not applied / etc.) |
| `client/` | Web | TS / React / etc. | (supported locales) |
| `apps/<mobile>/` | Mobile (iOS + Android shared) | TS / RN / Flutter / etc. | (supported locales) |
| (other portals) | | | |

Additional metadata:
- DB: (e.g. Prisma + PostgreSQL). State the migration policy explicitly (e.g. `prisma migrate deploy` only, `db push` forbidden).
- Deploy: never run `git push`, build, or deploy commands without explicit user instruction.

## 3. Cross-Platform Rule (no partial implementations)

Identify all affected platforms before starting and **implement every checked platform in a single pass**. Claude includes the platform table in the rescue prompt; Codex must implement **every** `[x]` row.

```
Affected platforms:
[ ] Server
[ ] Web
[ ] Mobile (iOS + Android)
[ ] (other portals)
```

Features marked `SHARED` in `FEATURE_MAP.md` must be implemented in every related portal. Implementing some but not all is treated as task failure.

## 4. Reference-First Rule

If the same feature already exists on another platform, **that code is the source of truth**. The new platform must:
- Match fields, validations, API calls, and error message keys exactly.
- Only adapt UI to the new environment (web vs mobile).
- Never simplify or drop fields on its own.

Claude lists the reference paths in the rescue prompt. Codex reads them first, then writes code.

## 5. Completeness (no happy-path-only)

Always handle:
- **Auth flows**: if login exists, also cover signup, social login, password reset, and the unauthenticated state.
- **Error / edge cases**: network errors, empty state, loading state, unauthorized state.
- **Real-device environment**: `localhost` / `127.0.0.1` is simulator-only. Real devices need the actual network base URL.
- **Adjacent dependencies**: trace backwards — "what does the user need before this feature is usable?"
- **Server API audit**: confirm no server endpoint is missing on the client.

## 6. i18n Rule

| Platform | Library | Locale files |
|----------|---------|--------------|
| (e.g. Web) | (e.g. i18next) | (e.g. `client/src/locales/{lang}/common.json`) |
| (e.g. Mobile) | (e.g. i18next + expo-localization) | (e.g. `apps/<mobile>/src/locales/{en,ko}.json`) |
| **(Korean-only / hardcoded zones)** | — | **Hardcoded strings allowed** |

Rules:
1. User-facing text added/modified in i18n zones **must** use `t('key')` or the equivalent API.
2. Add the key to every supported locale file. Primary locale gets a real translation; others may use a fallback if the project allows it.
3. Hardcoding ban: button labels, titles, descriptions, placeholders, toast/alert/modal copy, empty states, tab/nav labels, status badges, email subject/body.
4. Dates / numbers / currency use locale-aware formatters.

## 7. Source-of-Truth Files

Codex will frequently be asked to read:

- `.agent-memory/SCHEMA_SUMMARY.md` — data model summary
- `.agent-memory/FEATURE_MAP.md` — feature → platform matrix
- `.agent-memory/IA_*.md` — screen IA per platform
- `.agent-memory/BRAND_CONTEXT.md` — brand tone, copy style, design tokens
- `.agent-memory/MANUAL_NOTES.md` — manual overrides not derivable from code
- (coding-rule path, e.g. `.cursor/rules/*.mdc`)
- (DB schema path, e.g. `prisma/schema.prisma`)

Claude names the files Codex needs in each rescue prompt.

## 7.1 Domain Concept Graph (DOMAIN_MAP)

If the project has a `.agent-memory/concepts/` directory, Claude tracks every core concept (Booking, User, ...) as an explicit edge graph there. **Codex must respect these rules**:

- **Do not bulk-Read concept files.** They can be 100+ KB. Use the helper:
  ```bash
  node .agents/scripts/domain.mjs impact <Concept>.<field>
  node .agents/scripts/domain.mjs check-coverage <Concept>
  ```
  Or grep: `grep "<Concept>\.<field>" .agent-memory/concepts/*.md`
- **Apply ⚠️ flagged surfaces.** Every edge with `⚠️ explicit select` / `⚠️ whitelist` is a hand-curated whitelist. When you add columns to the schema, you **must** open the corresponding `select:` / `include:` block and add the new columns there. The file/line is exactly what `check-coverage` prints.
- **Update the concept file when behavior changes.** If you add fields, endpoints, system messages, side effects, or i18n keys, edit the matching `.agent-memory/concepts/<Concept>.md` `EDGES` block. The vocabulary is fixed (12 verbs); see `.agent-memory/concepts/README.md`.
- **Run the verifier before reporting done.** Concept files include automated verification:
  ```bash
  node .agents/scripts/domain.mjs verify <Concept>
  node .agents/scripts/domain.mjs audit
  ```
  Both must end with **FAIL 0**. `KNOWN_GAP` is acceptable when the `⚠️` note states the gap (`missing`, `gap`, `NOT YET`, `TODO`). Report any KNOWN_GAP back to the main agent so it can be added to the roadmap.
- **New vocabulary requires approval.** If you genuinely need a verb beyond the 12, surface it in the result report — do not invent it.

## 8. Output Contract

Every Codex run must report:
1. **Changed files** (full paths).
2. **Affected-platforms checklist** — return the prompt's table with each row marked `[x]` or `[ ]` based on what was actually changed.
3. **i18n key changes** — which locale files received which keys.
4. **Known limitations / unfinished items** — anything beyond the happy path that was not handled.
5. **Migration suggestion** — if the schema changed, propose the migration command (do not run it).

## 9. Forbidden Actions

- `git push`, build, or deploy commands of any kind.
- Risky DB operations (`prisma db push`, `DROP TABLE`, etc.).
- Direct production-DB writes or deletions.
- Committing `.env`, secrets, tokens, or keys.
- Bypassing safeguards (`--force`, `--no-verify`, etc.) without explicit user approval.

## 10. LLM Coding Behavior (caution over speed)

Applies to both Claude and Codex. For trivial tasks judge contextually, but when there is any tradeoff, **prefer caution**.

### 10.1 Think before coding
- State assumptions explicitly. When uncertain, ask (Codex must include assumptions and unresolved questions in the result report).
- If multiple interpretations are reasonable, present alternatives instead of picking silently.
- Suggest a simpler approach when one exists. Push back on the request when justified.
- If something is unclear, stop and report it.

### 10.2 Simplicity first
- Write the **minimum code** needed.
- Do not add unrequested features, flexibility, or configuration.
- Do not handle scenarios that cannot occur.
- Do not introduce abstractions for one-off code.
- If 200 lines can be 50, rewrite.
- Ask "is this overkill for a senior engineer?" — if yes, simplify.

### 10.3 Surgical changes
- Touch only the parts the task requires.
- Do not opportunistically reformat / refactor / "improve" adjacent code.
- Match the existing style even if you disagree with it.
- Dead code unrelated to the task: **report it but do not delete it**.
- Only remove imports/variables/functions made unused by your own change.
- Every modified line must trace directly to the user request.

### 10.4 Goal-driven execution
- Convert tasks into verifiable goals: "fix the bug" → "reproduction steps + verified pass after fix".
- For multi-step work, list the steps with their per-step verification criteria.
- "Make it work" is not an acceptable success criterion.
- Record the verification you actually performed in the result report (`/codex:result` output).

## 11. UI / Design Work (when applicable)

If the task is UI/styling work, Codex must verify before writing code:
- Honor `BRAND_CONTEXT.md` color, font, and spacing tokens.
- Follow the platform's design guidelines (web: WCAG and Web Interface Guidelines; iOS: HIG; Android: Material Design 3).
- Reuse existing components — never invent a new component without checking `FEATURE_MAP.md` first.
- Account for dark mode, responsiveness, and accessibility (keyboard focus, ARIA, color contrast).
- When a design call is judgment-based, the result report must include "options considered + chosen reason".
