#!/usr/bin/env bash

# fail on first error and print out every line executed
set -e -x

# Civis Custom Scripts don't drop you in to this directory by default
cd /app

# Install the app
npm install --production

node start -- "$1" "$2" "$3" --bucket "$4"
