#!/usr/bin/env bash
# Dev Sojori-orchestrator PM/owner — port 3001, persistant (hors terminal Cursor).
# Cursor tue les process liés à ses terminaux (SIGTERM 143) → utiliser ce script
# ou le LaunchAgent com.sojori.orchestrator-3001 (KeepAlive).
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
RUNDIR="${HOME}/.sojori"
PIDFILE="${RUNDIR}/orchestrator-3001.pid"
LOGFILE="${RUNDIR}/logs/orchestrator-3001.log"
SUPERVISE_PIDFILE="${RUNDIR}/orchestrator-3001-supervise.pid"
PORT=3001
HMR_PORT=3003
VITE_BIN="${ROOT}/node_modules/.bin/vite"

mkdir -p "${RUNDIR}/logs"

listener_pid() {
  lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null | head -1
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
  for i in $(seq 1 60); do
    if is_running; then
      write_pidfile
      return 0
    fi
    sleep 0.25
  done
  return 1
}

stop_all() {
  local local_pids hmr_pids sup_pid
  if [[ -f "$SUPERVISE_PIDFILE" ]]; then
    sup_pid="$(cat "$SUPERVISE_PIDFILE" 2>/dev/null || true)"
    if [[ -n "${sup_pid:-}" ]] && kill -0 "$sup_pid" 2>/dev/null; then
      kill "$sup_pid" 2>/dev/null || true
    fi
    rm -f "$SUPERVISE_PIDFILE"
  fi
  # kill any leftover supervise loops for this port
  pkill -f "sojori-orchestrator-3001-supervise" 2>/dev/null || true
  local_pids="$(lsof -nP -iTCP:"$PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
  hmr_pids="$(lsof -nP -iTCP:"$HMR_PORT" -sTCP:LISTEN -t 2>/dev/null || true)"
  if [[ -n "${local_pids}${hmr_pids}" ]]; then
    # shellcheck disable=SC2086
    kill $local_pids $hmr_pids 2>/dev/null || true
    sleep 1
    # shellcheck disable=SC2086
    kill -9 $local_pids $hmr_pids 2>/dev/null || true
  fi
  rm -f "$PIDFILE"
}

# Boucle superviseur : si Vite meurt, relance (hors Cursor).
supervise_loop() {
  # marker for pkill
  : # sojori-orchestrator-3001-supervise
  cd "$ROOT"
  while true; do
    if ! is_running; then
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] starting vite on :${PORT}" >>"$LOGFILE"
      env VITE_DEV_PORT="$PORT" VITE_HMR_PORT="$HMR_PORT" "$VITE_BIN" >>"$LOGFILE" 2>&1 &
      local vite_pid=$!
      echo "$vite_pid" >"$PIDFILE"
      wait "$vite_pid" || true
      echo "[$(date '+%Y-%m-%d %H:%M:%S')] vite exited — restart in 2s" >>"$LOGFILE"
      sleep 2
    else
      write_pidfile
      sleep 5
    fi
  done
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
    stop_all
    echo "stopped"
    ;;
  restart)
    stop_all
    sleep 1
    "$0" start
    ;;
  start)
    if is_running; then
      write_pidfile
      echo "already running pid=$(listener_pid) → http://127.0.0.1:${PORT}/"
      exit 0
    fi
    if [[ ! -x "$VITE_BIN" ]]; then
      echo "vite introuvable: $VITE_BIN — lance pnpm install dans $ROOT"
      exit 1
    fi
    # Détache un superviseur hors session (survit à Cursor)
    nohup bash -c "
      # sojori-orchestrator-3001-supervise
      cd \"$ROOT\"
      while true; do
        if ! lsof -nP -iTCP:${PORT} -sTCP:LISTEN -t >/dev/null 2>&1; then
          echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] starting vite on :${PORT}\" >>\"$LOGFILE\"
          env VITE_DEV_PORT=${PORT} VITE_HMR_PORT=${HMR_PORT} \"$VITE_BIN\" >>\"$LOGFILE\" 2>&1 &
          wait \$! || true
          echo \"[\$(date '+%Y-%m-%d %H:%M:%S')] vite exited — restart in 2s\" >>\"$LOGFILE\"
          sleep 2
        else
          sleep 5
        fi
      done
    " >>"$LOGFILE" 2>&1 &
    echo $! >"$SUPERVISE_PIDFILE"
    disown 2>/dev/null || true
    if ! wait_for_port; then
      echo "failed to start — see $LOGFILE"
      tail -40 "$LOGFILE" 2>/dev/null || true
      exit 1
    fi
    echo "started pid=$(listener_pid) → http://127.0.0.1:${PORT}/ (supervise auto-restart)"
    echo "log: $LOGFILE"
    ;;
  logs)
    tail -f "$LOGFILE"
    ;;
  # Mode foreground pour launchd (ne pas détacher — KeepAlive gère le restart).
  run)
    if [[ ! -x "$VITE_BIN" ]]; then
      echo "vite introuvable: $VITE_BIN" >&2
      exit 1
    fi
    cd "$ROOT"
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] launchd/run vite on :${PORT}" >>"$LOGFILE"
    exec env VITE_DEV_PORT="$PORT" VITE_HMR_PORT="$HMR_PORT" "$VITE_BIN"
    ;;
  install-launchagent)
    PLIST="${HOME}/Library/LaunchAgents/com.sojori.orchestrator-3001.plist"
    # Stop superviseur shell éventuel — launchd devient la source de vérité
    stop_all
    cat >"$PLIST" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.sojori.orchestrator-3001</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/bash</string>
    <string>${ROOT}/scripts/dev-owner-3001.sh</string>
    <string>run</string>
  </array>
  <key>WorkingDirectory</key>
  <string>${ROOT}</string>
  <key>RunAtLoad</key>
  <true/>
  <key>KeepAlive</key>
  <true/>
  <key>ThrottleInterval</key>
  <integer>3</integer>
  <key>StandardOutPath</key>
  <string>${RUNDIR}/logs/orchestrator-3001-launchd.out.log</string>
  <key>StandardErrorPath</key>
  <string>${RUNDIR}/logs/orchestrator-3001-launchd.err.log</string>
  <key>EnvironmentVariables</key>
  <dict>
    <key>PATH</key>
    <string>/opt/homebrew/bin:/usr/local/bin:/usr/bin:/bin:${ROOT}/node_modules/.bin</string>
    <key>HOME</key>
    <string>${HOME}</string>
  </dict>
</dict>
</plist>
PLIST
    launchctl bootout "gui/$(id -u)/com.sojori.orchestrator-3001" 2>/dev/null || true
    launchctl unload "$PLIST" 2>/dev/null || true
    launchctl bootstrap "gui/$(id -u)" "$PLIST" 2>/dev/null || launchctl load "$PLIST"
    launchctl enable "gui/$(id -u)/com.sojori.orchestrator-3001" 2>/dev/null || true
    launchctl kickstart -k "gui/$(id -u)/com.sojori.orchestrator-3001" 2>/dev/null || true
    sleep 2
    echo "LaunchAgent installé: $PLIST"
    echo "KeepAlive=true — macOS relance Vite si crash / après login"
    "$0" status || true
    ;;
  uninstall-launchagent)
    PLIST="${HOME}/Library/LaunchAgents/com.sojori.orchestrator-3001.plist"
    launchctl bootout "gui/$(id -u)/com.sojori.orchestrator-3001" 2>/dev/null || true
    launchctl unload "$PLIST" 2>/dev/null || true
    rm -f "$PLIST"
    stop_all
    echo "LaunchAgent retiré + serveur stoppé"
    ;;
  *)
    echo "usage: $0 {start|stop|restart|status|logs|run|install-launchagent|uninstall-launchagent}"
    exit 2
    ;;
esac
