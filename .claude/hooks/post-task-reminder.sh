#!/bin/bash
# Stop hook: Remind agent to update docs before ending a task.
# Runs when Claude finishes work.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
ACTIVE_WORK="$PROJECT_DIR/.agent-memory/ACTIVE_WORK.md"

if grep -q "Status: in-progress" "$ACTIVE_WORK" 2>/dev/null; then
  cat <<'EOF'
[POST-TASK REMINDER] Before finishing, check:
1. ACTIVE_WORK.md — Delete if done, update Last update if still in progress
2. WORKING_LOG.md — Add record if meaningful changes were made
3. FEATURE_MAP.md — Update if new features/types/screens changed
4. IA docs — Update if screens were added/removed/changed
5. SCHEMA_SUMMARY.md — Update if DB schema changed
EOF
fi
