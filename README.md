# Claude Code Project Harness

A complete, reusable project harness for [Claude Code](https://docs.anthropic.com/en/docs/claude-code) — the AI coding assistant by Anthropic.

Clone this into any project to get a battle-tested AI development workflow out of the box: session persistence, cross-platform safety gates, automated reminders, and specialized agents.

## What's Included

```
project-root/
├── CLAUDE.md                          ← Main agent behavior rules
├── .claude/
│   ├── settings.json                  ← Hook configuration
│   ├── hooks/
│   │   ├── pre-edit-gate-check.sh     ← Reminds agent to pass gates before editing
│   │   ├── notify-memory-change.sh    ← Alerts when memory docs are modified
│   │   └── post-task-reminder.sh      ← Reminds agent to update docs after work
│   └── agents/
│       ├── Jenny.md                   ← Spec vs implementation verifier
│       ├── karen.md                   ← Project reality checker
│       ├── ultrathink-debugger.md     ← Deep root cause debugger
│       ├── task-completion-validator.md
│       ├── code-quality-pragmatist.md
│       ├── claude-md-compliance-checker.md
│       └── ui-comprehensive-tester.md
├── .agents/
│   └── scripts/
│       └── domain.mjs                 ← Domain concept graph helper (impact / verify / audit)
├── .agent-memory/
│   ├── ACTIVE_WORK.md                 ← In-progress task tracker (multi-terminal safe)
│   ├── PROJECT_CONTEXT.md             ← Tech stack & workspace summary
│   ├── BRAND_CONTEXT.md               ← Brand/design guardrails
│   ├── SCHEMA_SUMMARY.md              ← DB schema summary
│   ├── FEATURE_MAP.md                 ← Feature → code location mapping
│   ├── IA_TEMPLATE.md                 ← Copy per platform (IA_WEB.md, IA_MOBILE.md)
│   ├── ROADMAP.md                     ← User-maintained backlog
│   ├── MANUAL_NOTES.md                ← Durable project notes
│   ├── WORKING_LOG.md                 ← Rolling change timeline
│   ├── CODEX_HANDOFF.md               ← Shared rulebook prepended to every Codex /codex:rescue
│   └── concepts/                      ← Domain concept graph (per-concept edge files)
│       ├── README.md                  ← Format, vocabulary, address conventions
│       └── AGENT_TEMPLATE.md          ← Sub-agent prompt for authoring new concepts
├── .cursor/rules/
│   └── persistent-project-context.mdc ← Cursor rule (also works for Cursor users)
└── .gitignore                         ← Tracks shared config, ignores personal data
```

## Quick Start

### Option A: Copy into existing project

```bash
git clone https://github.com/harrysong961205/agent-memory-template.git /tmp/harness

# Copy everything
cp /tmp/harness/CLAUDE.md your-project/
cp -r /tmp/harness/.claude your-project/
cp -r /tmp/harness/.agent-memory your-project/
cp -r /tmp/harness/.cursor your-project/

# Merge .gitignore (don't overwrite yours)
cat /tmp/harness/.gitignore >> your-project/.gitignore

rm -rf /tmp/harness
```

### Option B: Use as template for new project

```bash
git clone https://github.com/harrysong961205/agent-memory-template.git my-new-project
cd my-new-project
rm -rf .git
git init
```

### After copying

1. **Edit `CLAUDE.md`** — Customize the platform checklist in Gate 2 for your project
2. **Fill `.agent-memory/PROJECT_CONTEXT.md`** — Or ask Claude: _"Read the codebase and fill in `.agent-memory/` files"_
3. **Copy `IA_TEMPLATE.md`** — One per platform (e.g., `IA_WEB.md`, `IA_IOS.md`, `IA_ANDROID.md`)
4. **Fill `BRAND_CONTEXT.md`** — Colors, tone, design principles (if applicable)

## How It Works

### 6-Gate System (before any code change)

| Gate | What it does |
|------|-------------|
| **Gate 1: Read Docs** | Agent reads relevant memory files before starting |
| **Gate 2: Cross-platform Checklist** | Lists all affected platforms; must work on ALL of them |
| **Gate 3: Reference First** | If the feature exists elsewhere, match that implementation |
| **Gate 4: Completeness Check** | No happy-path-only; verify auth flows, errors, edge cases |
| **Gate 5: i18n Check** | No hardcoded user-facing strings (if i18n is active) |
| **Gate 6: Domain Concept Impact (DOMAIN_MAP)** | Schema/behavior changes on a core concept must run an impact query, review ⚠️ flagged surfaces, and pass `domain.mjs verify` |

### 3 Hooks (automated guardrails)

| Hook | Trigger | What it does |
|------|---------|-------------|
| `pre-edit-gate-check.sh` | Before Edit/Write | Reminds agent to pass gates (once per session) |
| `notify-memory-change.sh` | After Edit/Write | Alerts if `.agent-memory/` was modified |
| `post-task-reminder.sh` | On Stop | Reminds to update docs if work is in-progress |

### Session Tracking

`ACTIVE_WORK.md` enables multi-terminal and session-recovery workflows:
- Register work when starting → recover if session crashes
- Multiple terminals can see each other's in-progress tasks
- Completed work moves to `WORKING_LOG.md`

### Domain Concept Graph (DOMAIN_MAP)

Real domains are not trees — they are **webs**. Adding a single column to `Booking` may need updates in multiple endpoints, several UI surfaces, three locale files, two PDF templates, push payloads, and email templates. A folder structure can't capture all that; a triple-store can.

`.agent-memory/concepts/` is a per-concept edge graph where every line is a triple:

```
<source> → <relation> → <target> [@ note]
```

For example, edges in a `Booking.md` file might look like:

```
Booking.totalPrice → read-by → server/src/routes/admin.routes.ts:2731 @ ⚠️ explicit select — add new fields here
Booking.totalPrice → displayed-on → client/src/pages/host/HostChat.tsx:summary-card
Booking.adjustedTotalPrice → effective-via → Booking.totalPrice @ effective(adjusted ?? original)
POST /admin/bookings/:id/adjust → emits → Message.[BOOKING_ADJUSTED]
```

The 12-verb vocabulary covers data flow (`written-by`, `read-by`), shadows (`shadowed-by`, `effective-via`), effects (`triggers`, `emits`, `side-effect`), presentation (`displayed-on`, `rendered-in`, `i18n-keys`), and structure (`derives-from`, `composed-of`).

**`.agents/scripts/domain.mjs`** parses these graphs and answers:

| Command | Purpose |
|---------|---------|
| `domain.mjs list` | All concept files with edge counts |
| `domain.mjs impact <node>` | Every surface that touches a node (forward + reverse edges) |
| `domain.mjs check-coverage <Concept>` | All `⚠️` flagged surfaces for manual review |
| `domain.mjs verify <Concept>` | Auto-verify the graph against the codebase (PASS/FAIL/WARN/SKIP/KNOWN_GAP) |
| `domain.mjs audit` | Verify all concepts at once |

The verifier statically checks file existence, line ranges, schema model/field membership, `select:`/`include:`/`where:` blocks, system-tag presence, and i18n key existence — so bugs from schema-vs-API drift surface as `FAIL` instead of slipping into production. **Gate 6** runs this on every schema/behavior change, and the post-work checklist requires `audit` to be `FAIL 0` before commit.

When delegating new concept files to a sub-agent, prepend `.agent-memory/concepts/AGENT_TEMPLATE.md` — it bakes in the format, the 6 most common mistakes, and the `verify FAIL 0` exit condition.

### Codex Delegation Workflow (optional)

If your project uses the [`openai/codex-plugin-cc`](https://github.com/openai/codex-plugin-cc) plugin, the harness already has the **Plan = Claude, Implement = Codex** workflow wired up:

1. Claude clears Gates 1–5 and settles affected platforms / reference implementations / completeness.
2. Claude prepends `.agent-memory/CODEX_HANDOFF.md` to a task spec and calls `/codex:rescue --background`.
3. Claude polls with `/codex:status`, collects `/codex:result`, and verifies platform coverage, i18n keys, and reference parity.
4. Gaps trigger a focused re-rescue (max 2 retries); remaining gaps are reported to the user.
5. The user approves before any migration / deploy / `git push`.

If you do not use Codex, delete `.agent-memory/CODEX_HANDOFF.md` and the "Codex Delegation Workflow" section in `CLAUDE.md`.

### Modern UI Design Skills (proactive)

`CLAUDE.md` lists which Claude Code Skills to call before hand-rolling UI:

| Surface | Skill |
|---------|-------|
| General UI/UX design + review | `ui-ux-pro-max` |
| iOS (SwiftUI) | `mobile-ios-design` |
| Android (Compose) | `mobile-android-design` |
| Mobile in general | `sleek-design-mobile-apps` |
| Airbnb-style web | `airbnb-ui-skills` |
| Web Interface Guidelines audit | `web-design-guidelines` |
| React/Next.js performance | `vercel-react-best-practices` |
| Visual / poster work | `canvas-design` |

Patterns adopted from a skill go into `BRAND_CONTEXT.md` so the next session reuses them instead of re-deciding.

### 7 Specialized Agents

| Agent | Role |
|-------|------|
| **Jenny** | Verify implementation matches specifications |
| **Karen** | Reality-check project completion status |
| **ultrathink-debugger** | Deep root cause analysis for hard bugs |
| **task-completion-validator** | Verify claimed completions actually work |
| **code-quality-pragmatist** | Catch over-engineering and unnecessary complexity |
| **claude-md-compliance-checker** | Ensure changes follow CLAUDE.md rules |
| **ui-comprehensive-tester** | Thorough UI testing across web/mobile |

## Problems This Solves

| Problem | Solution |
|---------|----------|
| Agent loses context between sessions | `.agent-memory/` persists knowledge |
| "Login works" but signup is missing | Gate 4: Completeness Check |
| Web has 10 fields, mobile only has 5 | Gate 3: Reference First |
| Fixed web but forgot mobile | Gate 2: Cross-platform Checklist |
| Agent quietly changes docs | Hook: `notify-memory-change.sh` |
| Task "done" but doesn't actually work | Agent: `task-completion-validator` |
| Over-engineered simple feature | Agent: `code-quality-pragmatist` |
| UI styling done from scratch every time | Modern UI Design Skills section in `CLAUDE.md` |
| Claude busy while Codex sits idle | Codex Delegation Workflow + `CODEX_HANDOFF.md` |
| Schema column added but missing from API select | Gate 6 + DOMAIN_MAP `⚠️ explicit select` flags + `domain.mjs verify` |
| Cross-cutting impact (push / email / PDF / i18n) silently misses a surface | DOMAIN_MAP `impact` query + `audit` |

## Customization

### Add your own platforms (Gate 2)

Edit `CLAUDE.md` → Gate 2 section:

```
Affected platforms:
[ ] Server        (server/)
[ ] Web           (client/)
[ ] iOS App       (apps/ios/)
[ ] Android App   (apps/android/)
[ ] Chrome Extension (extension/)
```

### Add project-specific cursor rules

Create `.cursor/rules/your-rule.mdc`:

```
---
description: Your rule description
alwaysApply: true
---

# Rule content here
```

### Add your own agents

Create `.claude/agents/your-agent.md` following the existing agent format.

## .gitignore Strategy

**Tracked (shared with team):**
- `settings.json` — hook configuration
- `hooks/` — hook scripts
- `agents/` — custom agent definitions
- `.agent-memory/` — project context

**Ignored (personal):**
- `settings.local.json` — individual permissions
- `projects/`, `worktrees/`, `*.jsonl` — session data

## License

MIT — Use freely in any project.
