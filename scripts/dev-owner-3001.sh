#!/usr/bin/env bash
# Dev Sojori-orchestrator PM/owner — port 3001, persistant (hors terminal Cursor).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PIDFILE="${TMPDIR:-/tmp}/sojori-orchestrator-3001.pid"
LOGFILE="${TMPDIR:-/tmp}/sojori-orchestrator-3001.log"
PORT=3001
HMR_PORT=3003

listener_pid() {
  lsof -i :"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1
}

is_running() {
  local pid
  pid="$(listener_pid || true)"
  [[ -n "$pid" ]]
}

write_pidfile() {
  local pid
  pid="$(listener_pid || true)"
  if [[ -n "$pid" ]]; then
    echo "$pid" >"$PIDFILE"
  fi
}

wait_for_port() {
  local i
  for i in $(seq 1 40); do
    if is_running; then
      write_pidfile
      return 0
    fi
    sleep 0.25
  done
  return 1
}

cmd="${1:-start}"

case "$cmd" in
  status)
    if is_running; then
      echo "running pid=$(listener_pid) → http://127.0.0.1:${PORT}/"
      exit 0
    fi
    echo "stopped"
    exit 1
    ;;
  stop)
    local_pids="$(lsof -i :"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
    hmr_pids="$(lsof -i :"$HMR_PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
    if [[ -n "$local_pids$hmr_pids" ]]; then
      # shellcheck disable=SC2086
      kill $local_pids $hmr_pids 2>/dev/null || true
      sleep 1
    fi
    rm -f "$PIDFILE"
    echo "stopped"
    ;;
  restart)
    "$0" stop || true
    "$0" start
    ;;
  start)
    if is_running; then
      write_pidfile
      echo "already running pid=$(listener_pid) → http://127.0.0.1:${PORT}/"
      exit 0
    fi
    cd "$ROOT"
    nohup env VITE_DEV_PORT="$PORT" VITE_HMR_PORT="$HMR_PORT" npx vite >>"$LOGFILE" 2>&1 &
    disown 2>/dev/null || true
    if ! wait_for_port; then
      echo "failed to start — see $LOGFILE"
      tail -25 "$LOGFILE" 2>/dev/null || true
      exit 1
    fi
    echo "started pid=$(listener_pid) → http://127.0.0.1:${PORT}/"
    echo "log: $LOGFILE"
    ;;
  logs)
    tail -f "$LOGFILE"
    ;;
  *)
    echo "usage: $0 {start|stop|restart|status|logs}"
    exit 2
    ;;
esac
