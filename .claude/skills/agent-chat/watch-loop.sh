#!/bin/bash
# agent-chat watch loop — script unico, self-contained.
#
# Funde o que era chat-watcher + watch-loop + heartbeat:
#   - poll do .tmp/-chat.txt a cada 3s (via mtime)
#   - heartbeat a cada 60s no -chat-heartbeat.log
#   - SIGNAL na stdout quando virar minha vez ou END> (pareado com Monitor)
#   - auto-restart interno em caso de erro transiente (stat/awk falham)
#   - encerra com exit 0 quando detecta "$ME>" ou "END>"
#
# Uso (como command do Monitor):
#   bash .claude/skills/agent-chat/watch-loop.sh <me_id> [chat_path] [events_path] [heartbeat_path]
#
# Defaults:
#   chat_path      = .tmp/-chat.txt
#   events_path    = .tmp/-chat-events.log
#   heartbeat_path = .tmp/-chat-heartbeat.log
#
# Eventos de ACAO (SIGNAL, ERROR)  -> stdout + events
# Eventos de ESTADO (START/CHANGE) -> events
# Heartbeat                        -> heartbeat

set -u

ME="${1:-mestre}"
CHAT="${2:-.tmp/-chat.txt}"
EVENTS="${3:-.tmp/-chat-events.log}"
HEARTBEAT="${4:-.tmp/-chat-heartbeat.log}"

POLL_INTERVAL=3
HEARTBEAT_EVERY=20   # 20 * 3s = 60s

ts() { date '+%Y-%m-%dT%H:%M:%S'; }
log_state()  { echo "$(ts) $*" >> "$EVENTS"; }
log_action() { local line; line="$(ts) $*"; echo "$line"; echo "$line" >> "$EVENTS"; }
log_beat()   { echo "$(ts) $*" >> "$HEARTBEAT"; }

last_line() { awk 'NF{last=$0} END{print last}' "$CHAT" 2>/dev/null; }
mtime()     { stat -c %Y "$CHAT" 2>/dev/null || echo 0; }

log_state "START me=$ME pid=$$ chat=$CHAT"
log_beat  "START me=$ME pid=$$"

if [ ! -f "$CHAT" ]; then
  log_action "ERROR chat_not_found=$CHAT"
  exit 1
fi

LAST_MTIME=$(mtime)
LAST_LINE=$(last_line)
log_state "INIT last='$LAST_LINE' mtime=$LAST_MTIME"

# Check imediato — pode JA estar na minha vez antes do loop iniciar
if [ "$LAST_LINE" = "${ME}>" ] || [ "$LAST_LINE" = "END>" ]; then
  log_action "SIGNAL=$LAST_LINE (already-my-turn)"
  exit 0
fi

TICK=0
while true; do
  TICK=$((TICK + 1))

  MTIME=$(mtime)
  if [ "$MTIME" != "$LAST_MTIME" ]; then
    LAST_LINE=$(last_line)
    log_state "CHANGE last='$LAST_LINE' mtime=$MTIME"
    if [ "$LAST_LINE" = "${ME}>" ] || [ "$LAST_LINE" = "END>" ]; then
      log_action "SIGNAL=$LAST_LINE"
      exit 0
    fi
    LAST_MTIME=$MTIME
  fi

  if [ $((TICK % HEARTBEAT_EVERY)) -eq 0 ]; then
    log_beat "alive me=$ME last='$LAST_LINE' mtime=$LAST_MTIME tick=$TICK"
  fi

  sleep "$POLL_INTERVAL"
done
