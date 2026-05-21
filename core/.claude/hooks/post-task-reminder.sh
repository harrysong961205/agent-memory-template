#!/bin/bash
# Stop hook: Remind agent to update docs before ending a task.
# Runs when Claude finishes work.

PROJECT_DIR="${CLAUDE_PROJECT_DIR:-$(cd "$(dirname "$0")/../.." && pwd)}"
ACTIVE_WORK="$PROJECT_DIR/.agent-memory/ACTIVE_WORK.md"

if grep -q "Status: in-progress" "$ACTIVE_WORK" 2>/dev/null; then
  cat <<'EOF'
[POST-TASK REMINDER] Before finishing, check:
1. ACTIVE_WORK.md — delete if done, update "Last update" if still in progress
2. WORKING_LOG.md — add a record if meaningful changes were made
3. Profile context/map docs — update any your changes affected
   (software: FEATURE_MAP / IA docs / SCHEMA_SUMMARY / concepts;
    business: STAKEHOLDER_MAP / DECISION_LOG / FUNC_* docs)
EOF
fi
