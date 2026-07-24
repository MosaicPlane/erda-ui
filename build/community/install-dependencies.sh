#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${repo_root}"
COMMUNITY_PNPM_BIN="${COMMUNITY_PNPM_BIN:-${repo_root}/build/community/tooling/node_modules/.bin}"
locked_pnpm="${COMMUNITY_PNPM_BIN}/pnpm"
test -x "${locked_pnpm}" || {
  echo "locked community pnpm is not executable: ${locked_pnpm}" >&2
  exit 1
}
export PATH="${COMMUNITY_PNPM_BIN}:${PATH}"
test "$(command -v pnpm)" = "${locked_pnpm}"

if [[ "${1:-}" == "--check-pnpm-path" ]]; then
  printf '%s\n' "${locked_pnpm}"
  exit 0
fi

# Skip every dependency lifecycle hook. Reproduce only the two required root
# postinstall build steps with the integrity-locked pnpm binary.
"${locked_pnpm}" install --frozen-lockfile --no-optional --ignore-scripts
"${locked_pnpm}" --filter @erda-ui/components run build:noDeclare
"${locked_pnpm}" --filter @erda-ui/cli run build
