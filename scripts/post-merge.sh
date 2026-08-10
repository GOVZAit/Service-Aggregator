#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Install any new dependencies added by the merged task
npm install --no-audit --no-fund
