#!/usr/bin/env bash
set -euo pipefail

cleanup() {
  echo "Tearing down DB..."
  npm run test:db:down
}
trap cleanup EXIT INT TERM

npm run test:db:setup
npm run test:watch
