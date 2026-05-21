#!/usr/bin/env bash
# setup.sh — compose the Claude agent harness into a project.
#
# Usage:  ./setup.sh <software|business> [target-dir]
#         target-dir defaults to the current directory.
#
# Copies core/ (the domain-agnostic harness) plus the chosen profile into the
# target, and concatenates CLAUDE.core.md + CLAUDE.<profile>.md into a single
# CLAUDE.md.

set -euo pipefail

PROFILE="${1:-}"
TARGET="${2:-.}"
SRC="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

list_profiles() {
  for d in "$SRC"/profiles/*/; do
    [[ -d "$d" ]] && basename "$d"
  done | paste -sd'|' -
}

if [[ -z "$PROFILE" ]]; then
  echo "Usage: ./setup.sh <$(list_profiles)> [target-dir]" >&2
  exit 1
fi

PROFILE_DIR="$SRC/profiles/$PROFILE"
if [[ ! -f "$PROFILE_DIR/CLAUDE.$PROFILE.md" ]]; then
  echo "Error: unknown profile '$PROFILE'." >&2
  echo "Available profiles: $(list_profiles)" >&2
  exit 1
fi

mkdir -p "$TARGET"
TARGET="$(cd "$TARGET" && pwd)"

if [[ -e "$TARGET/CLAUDE.md" ]]; then
  echo "⚠️  $TARGET/CLAUDE.md already exists — it will be overwritten."
  if [[ -t 0 ]]; then
    read -r -p "Continue? [y/N] " ans
    [[ "$ans" == "y" || "$ans" == "Y" ]] || { echo "Aborted."; exit 1; }
  fi
fi

# 1. Core harness: settings, hooks, agents, universal memory.
cp -R "$SRC/core/.claude"       "$TARGET/"
cp -R "$SRC/core/.agent-memory" "$TARGET/"

# 2. Profile overlay: profile memory files, cursor rule, profile-only assets.
cp -R "$PROFILE_DIR/.agent-memory/." "$TARGET/.agent-memory/"
[[ -d "$PROFILE_DIR/.cursor" ]] && cp -R "$PROFILE_DIR/.cursor" "$TARGET/"
[[ -d "$PROFILE_DIR/.agents" ]] && cp -R "$PROFILE_DIR/.agents" "$TARGET/"

# 3. Compose CLAUDE.md = core rules + profile rules.
cat "$SRC/core/CLAUDE.core.md" "$PROFILE_DIR/CLAUDE.$PROFILE.md" > "$TARGET/CLAUDE.md"

# 4. .gitignore — append the harness snippet (or create it).
if [[ -f "$TARGET/.gitignore" ]]; then
  if ! grep -q "Claude Code — share settings" "$TARGET/.gitignore" 2>/dev/null; then
    printf '\n' >> "$TARGET/.gitignore"
    cat "$SRC/core/gitignore.snippet" >> "$TARGET/.gitignore"
  fi
else
  cp "$SRC/core/gitignore.snippet" "$TARGET/.gitignore"
fi

echo "✅ Harness ready in: $TARGET"
echo "   Profile: $PROFILE"
echo ""
echo "Next steps:"
echo "  1. Fill in $TARGET/.agent-memory/ context files"
echo "     (or ask Claude: \"Read this project and fill in .agent-memory/\")."
case "$PROFILE" in
  software)
    echo "  2. Customize the Gate 2 platform list in CLAUDE.md."
    echo "  3. Copy IA_TEMPLATE.md per platform (IA_WEB.md, IA_IOS.md, ...)."
    ;;
  business)
    echo "  2. Customize the Gate 2 function list in CLAUDE.md."
    echo "  3. Copy FUNCTION_TEMPLATE.md per function (FUNC_SALES.md, FUNC_HR.md, ...)."
    ;;
  *)
    echo "  2. Review the gates in CLAUDE.md and customize them for your project."
    ;;
esac
