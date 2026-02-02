#!/bin/bash
APP_DIR="/home/ubuntu/app/nextjs"
LOG_FILE="$APP_DIR/next.log"

cd "$APP_DIR"

# node_modules 없으면 설치
if [ ! -d "node_modules" ]; then
  npm ci --omit=dev
fi

# 앱 실행
echo "=== $(date -Is) starting nextjs ===" >> "$LOG_FILE"
nohup npm run start >> "$LOG_FILE" 2>&1 &
disown || true
exit 0