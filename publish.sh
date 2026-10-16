#!/usr/bin/env bash
set -Eeuo pipefail
cd "$(dirname "${BASH_SOURCE[0]}")"

registry="https://registry.npmjs.org/"
workspaces=(
  packages/core
  packages/compiler
  packages/events
  packages/database
  packages/paradigms
  packages/router
  packages/ghost-cli
)

read_package() {
  node -e '
    const p = require("./" + process.argv[1] + "/package.json");
    process.stdout.write(`${p.name}\t${p.version}\n`);
  ' "$1"
}

registry_view() {
  local spec="$1"
  local field="$2"
  local output

  if output=$(npm view --registry="$registry" "$spec" "$field" 2>&1); then
    if [[ "$output" == "undefined" ]]; then
      return 1
    fi
    printf '%s' "$output"
    return 0
  fi

  if [[ "$output" == *E404* || "$output" == *"404 Not Found"* ]]; then
    return 1
  fi

  printf 'Registry lookup failed for %s (%s):\n%s\n' "$spec" "$field" "$output" >&2
  return 2
}

validate_version() {
  node -e '
    if (!/^\d+\.\d+\.\d+$/.test(process.argv[1])) {
      console.error(`Expected a stable x.y.z version, got: ${process.argv[1]}`);
      process.exit(1);
    }
  ' "$1"
}

compare_versions() {
  node -e '
    const parse = value => {
      if (!/^\d+\.\d+\.\d+$/.test(value)) throw new Error(`Invalid stable version: ${value}`);
      return value.split(".").map(BigInt);
    };
    const a = parse(process.argv[1]);
    const b = parse(process.argv[2]);
    for (let i = 0; i < 3; i++) {
      if (a[i] < b[i]) process.exit(0);
      if (a[i] > b[i]) process.exit(2);
    }
    process.exit(1);
  ' "$1" "$2"
}

next_patch() {
  node -e '
    const match = /^(\d+)\.(\d+)\.(\d+)$/.exec(process.argv[1]);
    if (!match) throw new Error(`Invalid stable version: ${process.argv[1]}`);
    console.log(`${match[1]}.${match[2]}.${BigInt(match[3]) + 1n}`);
  ' "$1"
}

declare -A package_names
declare -A current_versions
declare -A release_versions

plan_release() {
  local workspace name current latest base current_status compare_status target target_status status

  for workspace in "${workspaces[@]}"; do
    IFS=$'\t' read -r name current < <(read_package "$workspace")
    validate_version "$current"
    package_names["$workspace"]="$name"
    current_versions["$workspace"]="$current"

    latest=""
    if latest=$(registry_view "$name" dist-tags.latest); then
      validate_version "$latest"
    else
      status=$?
      if [[ "$status" -ne 1 ]]; then
        return "$status"
      fi
    fi

    base="$current"
    if [[ -n "$latest" ]]; then
      if compare_versions "$current" "$latest"; then
        compare_status=0
      else
        compare_status=$?
      fi
      if [[ "$compare_status" -eq 0 ]]; then
        base="$latest"
      fi
    fi

    if registry_view "$name@$current" version >/dev/null; then
      target=$(next_patch "$base")
    else
      current_status=$?
      if [[ "$current_status" -ne 1 ]]; then
        return "$current_status"
      fi
      if [[ -n "$latest" ]]; then
        if compare_versions "$current" "$latest"; then
          compare_status=0
        else
          compare_status=$?
        fi
        if [[ "$compare_status" -le 0 ]]; then
          target=$(next_patch "$latest")
        elif [[ "$compare_status" -eq 2 ]]; then
          target="$current"
        else
          return "$compare_status"
        fi
      else
        target="$current"
      fi
    fi

    while true; do
      if registry_view "$name@$target" version >/dev/null; then
        target=$(next_patch "$target")
      else
        target_status=$?
        if [[ "$target_status" -eq 1 ]]; then
          break
        fi
        return "$target_status"
      fi
    done

    release_versions["$workspace"]="$target"
  done
}

print_plan() {
  local workspace
  printf '\nPlanned package versions:\n'
  for workspace in "${workspaces[@]}"; do
    printf '  %-22s %s -> %s\n' \
      "${package_names[$workspace]}" \
      "${current_versions[$workspace]}" \
      "${release_versions[$workspace]}"
  done
  printf '\n'
}

apply_release_versions() {
  local workspace
  local core_version="${release_versions[packages/core]}"
  local compiler_version="${release_versions[packages/compiler]}"

  for workspace in "${workspaces[@]}"; do
    npm pkg set "version=${release_versions[$workspace]}" --workspace="$workspace" >/dev/null
  done

  npm pkg set "dependencies.@ghost-js/core=$core_version" --workspace=packages/paradigms >/dev/null
  npm pkg set "dependencies.@ghost-js/core=$core_version" --workspace=packages/router >/dev/null
  npm pkg set "dependencies.@ghost-js/core=$core_version" --workspace=packages/ghost-cli >/dev/null
  npm pkg set "dependencies.@ghost-js/compiler=$compiler_version" --workspace=packages/ghost-cli >/dev/null

  npm install --package-lock-only --ignore-scripts --no-audit --no-fund
}

mode="${1:---dry-run}"
if [[ "$#" -gt 1 ]]; then
  echo "Usage: $0 [--dry-run|--publish]" >&2
  exit 2
fi

case "$mode" in
  --dry-run)
    plan_release
    print_plan
    echo "Checking package contents (manifests remain unchanged in dry-run mode)."
    for workspace in "${workspaces[@]}"; do
      npm pack --dry-run --workspace="$workspace" --registry="$registry"
    done
    ;;

  --publish)
    if ! npm whoami --registry="$registry" >/dev/null; then
      echo "Log in first with: npm login --registry=$registry" >&2
      exit 1
    fi

    plan_release
    print_plan
    apply_release_versions

    echo "Checking package contents after updating versions and dependency pins."
    for workspace in "${workspaces[@]}"; do
      npm pack --dry-run --workspace="$workspace" --registry="$registry"
    done

    for workspace in "${workspaces[@]}"; do
      name="${package_names[$workspace]}"
      version="${release_versions[$workspace]}"
      echo "Publishing $name@$version"
      npm publish --registry="$registry" --workspace="$workspace" --access public
    done
    ;;

  *)
    echo "Usage: $0 [--dry-run|--publish]" >&2
    exit 2
    ;;
esac
