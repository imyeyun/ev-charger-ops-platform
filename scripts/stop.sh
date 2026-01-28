#!/bin/bash

APP_DIR=/home/ubuntu/app
PID_FILE=$APP_DIR/app.pid

if [ -f "$PID_FILE" ]; then
  PID=$(cat $PID_FILE)
  kill $PID || true
  rm -f $PID_FILE
else
  echo "No PID file found" >> $APP_DIR/app.log
fi
