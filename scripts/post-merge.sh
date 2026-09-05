#!/usr/bin/env bash
set -euo pipefail
cd "$(dirname "$0")/.."

# Install any new dependencies added by the merged task
npm install --no-audit --no-fund

# Keep the managed development database aligned with the Drizzle source of truth.
# Replit Publish applies the development-to-production schema diff separately.
npm run db:push
