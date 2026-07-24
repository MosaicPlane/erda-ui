#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../../.." && pwd)"
wrapper="${repo_root}/build/community/install-dependencies.sh"
host_bin="${repo_root}/build/community/tooling/node_modules/.bin"

test "$(env -u COMMUNITY_PNPM_BIN bash "${wrapper}" --check-pnpm-path)" = \
  "${host_bin}/pnpm"

override_root="$(mktemp -d)"
trap 'rm -rf "${override_root}"' EXIT
mkdir -p "${override_root}/bin"
ln -s "${host_bin}/pnpm" "${override_root}/bin/pnpm"
test "$(
  COMMUNITY_PNPM_BIN="${override_root}/bin" \
    bash "${wrapper}" --check-pnpm-path
)" = "${override_root}/bin/pnpm"

grep -Fq 'COMMUNITY_PNPM_BIN:-${repo_root}/build/community/tooling/node_modules/.bin' \
  "${wrapper}"
grep -Fq 'locked_pnpm="${COMMUNITY_PNPM_BIN}/pnpm"' "${wrapper}"
grep -Fq 'export PATH="${COMMUNITY_PNPM_BIN}:${PATH}"' "${wrapper}"
if rg -n 'command -v pnpm.*repo_root|locked_bin=.*/build/community/tooling' "${wrapper}"; then
  echo "source-only pnpm assertion remains" >&2
  exit 1
fi
echo "community pnpm path policy: PASS"
