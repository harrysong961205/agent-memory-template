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
├── .agent-memory/
│   ├── ACTIVE_WORK.md                 ← In-progress task tracker (multi-terminal safe)
│   ├── PROJECT_CONTEXT.md             ← Tech stack & workspace summary
│   ├── BRAND_CONTEXT.md               ← Brand/design guardrails
│   ├── SCHEMA_SUMMARY.md              ← DB schema summary
│   ├── FEATURE_MAP.md                 ← Feature → code location mapping
│   ├── IA_TEMPLATE.md                 ← Copy per platform (IA_WEB.md, IA_MOBILE.md)
│   ├── ROADMAP.md                     ← User-maintained backlog
│   ├── MANUAL_NOTES.md                ← Durable project notes
│   └── WORKING_LOG.md                 ← Rolling change timeline
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

### 5-Gate System (before any code change)

| Gate | What it does |
|------|-------------|
| **Gate 1: Read Docs** | Agent reads relevant memory files before starting |
| **Gate 2: Cross-platform Checklist** | Lists all affected platforms; must work on ALL of them |
| **Gate 3: Reference First** | If the feature exists elsewhere, match that implementation |
| **Gate 4: Completeness Check** | No happy-path-only; verify auth flows, errors, edge cases |
| **Gate 5: i18n Check** | No hardcoded user-facing strings (if i18n is active) |

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
