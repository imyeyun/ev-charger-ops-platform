#!/bin/bash
APP_DIR="/home/ubuntu/app/nextjs"

cd "$APP_DIR"

# node_modules 없으면 설치
if [ ! -d "node_modules" ]; then
  npm ci --omit=dev
fi

# 앱 실행
nohup npm run start > /dev/null 2>&1 &
disown || true
exit 0