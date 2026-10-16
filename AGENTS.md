# Repository guidance

## Project shape

- This is the Ghost.js npm-workspaces monorepo. Packages live under `packages/*` and use ES modules.
- The CLI is `packages/ghost-cli`; compiler and runtime work belongs in `packages/compiler` and `packages/core`.
- `packages/core/src/bridge.js` is Ghost's browser persistence helper. Specter Bridge is a separate Android host project; do not mix its native runtime into this package.
- Keep framework behavior, CLI behavior, and generated starter templates aligned with their documentation.

## Working changes

- Read the relevant package README and `docs/` page before changing that area.
- Keep edits scoped to the requested feature. Preserve unrelated working-tree changes.
- Update the affected package version/dependency references together when preparing a release; do not publish packages unless explicitly asked.
- Keep mobile builds compatible with WebView asset-relative paths and the `data-ghost-runtime-loader` replacement documented in `docs/MOBILE.md`.

## Validation

- Run the relevant package test command after code changes. The root `npm test` runs package tests; `npm run size` checks the core bundle-size limit.
- For CLI or build changes, also exercise the affected command with a small fixture when practical.
- Report the exact checks run and distinguish a local build from an installed-device or published release verification.
