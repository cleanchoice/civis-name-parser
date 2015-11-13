#!/usr/bin/env bash

# fail on first error and print out every line executed
set -e #-x

# Civis Custom Scripts don't drop you in to this directory by default

if [ ! -e "package.json" ]; then
  cd /app
fi

# Install the app quietly
npm install --production > /dev/null

npm start -- "$1" "$2" "$3" --bucket "$4"
