#!/usr/bin/env bash
# =============================================================================
# Anvil Heartbeat — invoca o agente em modo batida com trava de exclusão.
#
# Uso:
#   ./heartbeat.sh
#
# Configuração:
#   DEEPSEEK_BIN       caminho para o binário deepseek (default: "deepseek" do PATH)
#   DEEPSEEK_MODEL     modelo a usar (default: "deepseek-v4-flash")
#
# Agendamento (Windows Task Scheduler):
#   schtasks /create /tn "AnvilHeartbeat" /tr "bash -c '/caminho/para/heartbeat.sh'" /sc minute /mo 10
#
# Lock file: .tmp/heartbeat.lock — se o PID dentro dele ainda vive, este pulso faz skip.
# =============================================================================
set -euo pipefail

# ── Resolve paths ──────────────────────────────────────────────────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE="$(cd "$SCRIPT_DIR/../../.." && pwd)"
LOCK_FILE="$WORKSPACE/.tmp/heartbeat.lock"
PROMPT_FILE="$SCRIPT_DIR/../prompts/heartbeat-prompt.md"
LOG_FILE="$WORKSPACE/.tmp/heartbeat.log"

# ── Binary detection ───────────────────────────────────────────────────────
detect_binary() {
    # 1. Explicit env var
    if [ -n "${DEEPSEEK_BIN:-}" ] && command -v "$DEEPSEEK_BIN" &>/dev/null; then
        echo "$DEEPSEEK_BIN"
        return
    fi

    # 2. PATH
    if command -v deepseek &>/dev/null; then
        echo "deepseek"
        return
    fi

    # 3. Common locations (Windows + Unix)
    local candidates=(
        "$HOME/.cargo/bin/deepseek"
        "$HOME/.cargo/bin/deepseek.exe"
        "$HOME/AppData/Roaming/npm/deepseek.cmd"
        "$HOME/AppData/Roaming/npm/deepseek"
        "/c/Users/$USERNAME/.cargo/bin/deepseek.exe"
        "/c/Users/$USERNAME/AppData/Roaming/npm/deepseek.cmd"
    )
    for candidate in "${candidates[@]}"; do
        if [ -x "$candidate" ] || [ -f "$candidate" ]; then
            echo "$candidate"
            return
        fi
    done

    echo ""
}

DEEPSEEK_BIN="$(detect_binary)"
if [ -z "$DEEPSEEK_BIN" ]; then
    echo "$(date -Iseconds) FATAL: deepseek binary not found." | tee -a "$LOG_FILE"
    echo "Install with: npm install -g deepseek-tui"
    echo "Or: cargo install deepseek-tui-cli --locked"
    echo "Or set DEEPSEEK_BIN=/path/to/deepseek"
    exit 1
fi

# ── Lock check ─────────────────────────────────────────────────────────────
if [ -f "$LOCK_FILE" ]; then
    LOCK_PID=$(cat "$LOCK_FILE" 2>/dev/null || echo "")
    if [ -n "$LOCK_PID" ] && kill -0 "$LOCK_PID" 2>/dev/null; then
        echo "$(date -Iseconds) SKIP: heartbeat already running (PID $LOCK_PID)" >> "$LOG_FILE"
        exit 0
    fi
    # Stale lock — previous process died without cleaning up
    echo "$(date -Iseconds) WARN: removing stale lock (PID $LOCK_PID gone)" >> "$LOG_FILE"
    rm -f "$LOCK_FILE"
fi

# ── Acquire lock ───────────────────────────────────────────────────────────
echo $$ > "$LOCK_FILE"
# Ensure lock is released on exit, interrupt, or termination
cleanup() { rm -f "$LOCK_FILE"; }
trap cleanup EXIT INT TERM

# ── Verify prompt file ─────────────────────────────────────────────────────
if [ ! -f "$PROMPT_FILE" ]; then
    echo "$(date -Iseconds) FATAL: prompt file not found: $PROMPT_FILE" >> "$LOG_FILE"
    exit 1
fi
PROMPT=$(cat "$PROMPT_FILE")

# ── Execute heartbeat ──────────────────────────────────────────────────────
MODEL="${DEEPSEEK_MODEL:-deepseek-v4-flash}"

echo "$(date -Iseconds) START: heartbeat pulse (model=$MODEL, bin=$DEEPSEEK_BIN)" >> "$LOG_FILE"

"$DEEPSEEK_BIN" \
    -p "$PROMPT" \
    --workspace "$WORKSPACE" \
    --model "$MODEL" \
    --yolo \
    >> "$LOG_FILE" 2>&1

RC=$?
if [ $RC -eq 0 ]; then
    echo "$(date -Iseconds) DONE: heartbeat pulse completed" >> "$LOG_FILE"
else
    echo "$(date -Iseconds) FAIL: heartbeat pulse exited with code $RC" >> "$LOG_FILE"
fi

exit $RC
