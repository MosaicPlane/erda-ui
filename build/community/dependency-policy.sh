#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${repo_root}"

if rg -n \
  'registry\.npm\.terminus\.io|registry\.erda\.cloud|registry\.cn-hangzhou\.aliyuncs\.com/terminus|@terminus/ai-components' \
  .npmrc shell/package.json pnpm-lock.yaml; then
  echo "private UI package or registry remains in the install graph" >&2
  exit 1
fi
grep -q '^registry=https://registry\.npmjs\.org/$' .npmrc
grep -Fq '"${locked_pnpm}" install --frozen-lockfile --no-optional --ignore-scripts' \
  build/community/install-dependencies.sh
grep -Fq '"${locked_pnpm}" --filter @erda-ui/components run build:noDeclare' \
  build/community/install-dependencies.sh
grep -Fq '"${locked_pnpm}" --filter @erda-ui/cli run build' \
  build/community/install-dependencies.sh
if rg -n 'npx|only-allow' build/community/install-dependencies.sh; then
  echo "unlocked package runner found in community install path" >&2
  exit 1
fi
bash -n build/community/install-dependencies.sh
bash -n build/community/tests/pnpm-path-test.sh
bash build/community/tests/pnpm-path-test.sh
bash build/community/install-dependencies.sh
echo "community UI dependency policy: PASS"
