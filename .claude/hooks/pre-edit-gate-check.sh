#!/bin/bash
# PreToolUse hook: Remind agent to pass gates before editing code files.
# Runs on Edit/Write tool use. Reads target file path from stdin JSON.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

# Skip non-code files
if echo "$FILE_PATH" | grep -qE '(\.agent-memory/|\.claude/|node_modules/|\.git/|package-lock)'; then
  exit 0
fi

# Only remind for code files
if echo "$FILE_PATH" | grep -qE '\.(ts|tsx|js|jsx|py|go|rs|prisma|json|css|swift|kt)$'; then
  # One reminder per day per project
  PROJECT_HASH=$(echo "${CLAUDE_PROJECT_DIR:-$PWD}" | md5sum 2>/dev/null | cut -c1-8 || echo "default")
  MARKER="/tmp/.claude-gate-passed-$(date +%Y%m%d)-${PROJECT_HASH}"
  if [ ! -f "$MARKER" ]; then
    cat <<'EOF'
[GATE CHECK] Before editing code, confirm:
- Gates 1-4 passed? (FEATURE_MAP, IA docs, Reference First, Completeness Check)
- Cross-platform checklist shown to user?
- If already passed, ignore this reminder.
EOF
    touch "$MARKER"
  fi
fi

exit 0
