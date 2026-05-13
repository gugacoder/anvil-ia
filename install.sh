#!/usr/bin/env bash
# Installs the shared Node dependencies used by every system under .systems/,
# then optionally registers memory hooks with DeepSeek-TUI if it's detected.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR/.systems"

npm install "$@"

cd "$SCRIPT_DIR"

DEEPSEEK_CFG="$HOME/.deepseek/config.toml"
SNIPPET="$SCRIPT_DIR/.systems/memory/configs/deepseek-hooks.toml"
MARKER="memory-session-end"

if [ -d "$HOME/.deepseek" ] && [ -f "$SNIPPET" ]; then
  if [ -f "$DEEPSEEK_CFG" ] && grep -q "$MARKER" "$DEEPSEEK_CFG" 2>/dev/null; then
    echo "DeepSeek-TUI: memory hooks already registered in $DEEPSEEK_CFG (skipping)."
  else
    echo
    echo "DeepSeek-TUI detected at ~/.deepseek/."
    read -r -p "Register memory hooks in $DEEPSEEK_CFG? [y/N] " reply || reply=""
    case "$reply" in
      [yY]|[yY][eE][sS])
        if [ -f "$DEEPSEEK_CFG" ]; then
          backup="${DEEPSEEK_CFG}.bak.$(date +%s)"
          cp "$DEEPSEEK_CFG" "$backup"
          echo "Backup written to $backup"
          printf '\n' >> "$DEEPSEEK_CFG"
        else
          mkdir -p "$(dirname "$DEEPSEEK_CFG")"
          : > "$DEEPSEEK_CFG"
        fi
        cat "$SNIPPET" >> "$DEEPSEEK_CFG"
        echo "Memory hooks appended to $DEEPSEEK_CFG."
        ;;
      *)
        echo "Skipped. To install later, append $SNIPPET to $DEEPSEEK_CFG."
        ;;
    esac
  fi
fi
