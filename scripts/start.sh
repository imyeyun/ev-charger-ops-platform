#!/bin/bash

APP_DIR=/home/ubuntu/app
JAR_PATH=$(find $APP_DIR -name "*.jar" | grep build/libs | head -n 1)

if [ -z "$JAR_PATH" ]; then
  echo "JAR not found" >> $APP_DIR/app.log
  exit 1
fi

echo "Starting $JAR_PATH" >> $APP_DIR/app.log

nohup java -jar "$JAR_PATH" \
  > $APP_DIR/app.log 2>&1 &

echo $! > $APP_DIR/app.pid
