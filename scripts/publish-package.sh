#!/usr/bin/env bash

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
NPMRC_FILE="$ROOT_DIR/scripts/.npmrc"

if [[ $# -lt 1 ]]; then
  echo "Usage: publish-package.sh <package-dir>" >&2
  exit 1
fi

PACKAGE_DIR="$1"
cd "$ROOT_DIR"

if [[ -f "$NPMRC_FILE" ]]; then
  export NPM_CONFIG_USERCONFIG="$NPMRC_FILE"
fi

echo "Publishing ${PACKAGE_DIR}..."
if [[ -n "${NPM_OTP:-}" ]]; then
  export npm_config_otp="$NPM_OTP"
  npm publish "./${PACKAGE_DIR}" --access public --otp "${NPM_OTP}"
else
  npm publish "./${PACKAGE_DIR}" --access public
fi
