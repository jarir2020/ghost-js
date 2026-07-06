#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPMRC_FILE="$ROOT_DIR/scripts/.npmrc"
cd "$ROOT_DIR"

PACKAGES=(
  "packages/core"
  "packages/compiler"
  "packages/events"
  "packages/database"
  "packages/router"
  "packages/paradigms"
  "packages/ghost-cli"
)

if [[ -f "$NPMRC_FILE" ]]; then
  export NPM_CONFIG_USERCONFIG="$NPMRC_FILE"
fi

for package_dir in "${PACKAGES[@]}"; do
  echo "Publishing ${package_dir}..."
  if [[ -n "${NPM_OTP:-}" ]]; then
    export npm_config_otp="$NPM_OTP"
    npm publish "./${package_dir}" --access public --otp "${NPM_OTP}"
  else
    npm publish "./${package_dir}" --access public
  fi
done

echo "All Ghost.js packages published successfully."
