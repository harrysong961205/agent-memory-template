# Claude Code Project Harness

## Execution Principles

- **Simple tasks** (single context, quick): Handle directly. No sub-agents needed.
- **Complex tasks** (multiple steps or parallelizable): **Always spawn Sub Agents** for parallel execution.
  - Delegate full context and authority to each agent.
  - Main thread collects results and reports to the user.
  - Example: server + client simultaneous changes, multi-platform work, research + implementation in parallel.
- Decision rule: "Can I split this work into concurrent streams?" → Yes = use Sub Agents.

---

Read these files at session start:

- `.agent-memory/ACTIVE_WORK.md` ← **Read first** (identify in-progress / incomplete work)
- `.agent-memory/PROJECT_CONTEXT.md`
- `.agent-memory/SCHEMA_SUMMARY.md`
- `.agent-memory/BRAND_CONTEXT.md`
- `.agent-memory/MANUAL_NOTES.md`
- `.agent-memory/ROADMAP.md`
- `.agent-memory/WORKING_LOG.md`
- `.agent-memory/FEATURE_MAP.md`
- `.agent-memory/IA_*.md` (per-platform IA documents)

## Session Tracking (Multi-terminal Context Sharing)

Multiple terminals may work simultaneously, or sessions may be interrupted. Use `.agent-memory/ACTIVE_WORK.md` to share work status.

### On session start
1. Read `ACTIVE_WORK.md` **first**.
2. If incomplete items exist, notify the user: "Previous session had [task] in progress. Continue?"
3. If user requests new work, check for conflicts with existing incomplete items.

### On task start
Register current work in `ACTIVE_WORK.md`:
```
## Session: {YYYY-MM-DDTHH:MM} — {one-line task summary}
- Status: in-progress
- Target: key files/directories
- Plan: what specifically is being done (2-3 lines)
- Blocked: (empty if none)
- Last update: {YYYY-MM-DDTHH:MM}
```
Update `Plan` and `Last update` when direction changes or progress is made.

### On task completion
1. **Delete** the item from `ACTIVE_WORK.md`.
2. Add completion record to `WORKING_LOG.md` (maintain existing format).

### Session recovery
- Next session reads remaining items in `ACTIVE_WORK.md` to identify incomplete work.
- Use `Last update` timestamp to judge how stale the work is.
- If user wants to continue, reference that item's `Plan` and `Target` to resume.

## Core Principles

- Code is the source of truth.
- `.agent-memory/*.md` are fast-recovery cache contexts.
- Brand principles not in `BRAND_CONTEXT.md` must not be assumed — ask the user.
- **No deploy**: Never execute `git push`, `eas build`, `eas submit`, or any deployment unless user explicitly says "deploy", "push", or "배포해".
- When modifying `.agent-memory/` documents, **always tell the user** what was changed and how.

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

## Post-work Checklist

- Update `FEATURE_MAP.md` with new/changed features.
- Update the relevant platform's IA document if screens were added/removed/changed.
- Verify all translation keys exist in locale files (if i18n is active).
- Add a brief record to `WORKING_LOG.md` after meaningful changes.
