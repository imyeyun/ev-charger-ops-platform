#!/bin/bash
set -eu

APP_DIR="/home/ubuntu/app"
PORT="3000"

pids_from_ss() {
  # ss 출력에서 pid=NNNN 만 뽑아서 중복 제거
  # 예: users:(("next-server",pid=1927,fd=18))
  sudo ss -lptn "sport = :$PORT" 2>/dev/null \
    | sed -n 's/.*pid=\([0-9][0-9]*\).*/\1/p' \
    | sort -u
}

kill_by_port() {
  PIDS="$(pids_from_ss || true)"

  if [ -z "${PIDS:-}" ]; then
    log "No process is listening on port $PORT (ss found none)"
    return 1
  fi

  for PID in $PIDS; do
    # 혹시 모를 안전 체크: 아직 살아있는지 확인
    if kill -0 "$PID" 2>/dev/null; then
      log "Killing PID $PID listening on port $PORT"
      sudo kill -TERM "$PID" 2>/dev/null || true

      # 짧게 기다렸다가 남아있으면 강제 종료
      sleep 1
      if kill -0 "$PID" 2>/dev/null; then
        log "PID $PID still alive; sending SIGKILL"
        sudo kill -KILL "$PID" 2>/dev/null || true
      fi
    else
      log "PID $PID not running (race condition)"
    fi
  done

  return 0
}

if kill_by_port; then
  log "App stopped via port lookup (port: $PORT)"
  exit 0
fi

log "Stop failed: nothing to stop"
exit 0