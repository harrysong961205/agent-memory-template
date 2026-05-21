#!/bin/bash
# PostToolUse hook: Alert when .agent-memory/ files are modified.
# Ensures the agent explicitly tells the user what changed.

INPUT=$(cat)
FILE_PATH=$(echo "$INPUT" | grep -o '"file_path":"[^"]*"' | head -1 | cut -d'"' -f4)

if echo "$FILE_PATH" | grep -q '\.agent-memory/'; then
  FILENAME=$(basename "$FILE_PATH")
  echo "[MEMORY UPDATED] .agent-memory/$FILENAME was modified. Tell the user what changed and why."
fi

exit 0
