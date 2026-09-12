#!/usr/bin/env bash
# Starts the development database and waits until it is healthy.
# Used as a before-launch step by the IntelliJ run configurations in .run/.
set -euo pipefail

# IDEs started from the Dock don't inherit the shell PATH; add the usual Docker CLI locations.
export PATH="/usr/local/bin:/opt/homebrew/bin:$HOME/.orbstack/bin:$PATH"

cd "$(dirname "$0")/.."
docker compose up -d --wait postgres
