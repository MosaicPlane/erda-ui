#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${repo_root}"

source build/community/base-images.env
[[ "${UI_NODE_IMAGE}" =~ ^docker\.io/library/node@sha256:[0-9a-f]{64}$ ]]
grep -q 'SOURCE_DATE_EPOCH' cli/lib/util/gen-version.ts
grep -q 'SOURCE_DATE_EPOCH' core/webpack.production.js
grep -q 'SOURCE_DATE_EPOCH' shell/webpack.production.js
grep -q '"pnpm": "6.32.8"' build/community/tooling/package.json
grep -q 'FOR_COMMUNITY=true' Dockerfile.community
grep -q 'CMD \["node", "scheduler/dist/main"\]' Dockerfile.community
grep -q '"integrity": "sha512-' build/community/tooling/package-lock.json
grep -q '^\.git$' Dockerfile.community.dockerignore
grep -q 'node_modules' Dockerfile.community.dockerignore
grep -q 'RUN bash build/community/install-dependencies.sh' Dockerfile.community
grep -Fq 'ENV COMMUNITY_PNPM_BIN=/opt/tooling/node_modules/.bin' Dockerfile.community
grep -Fq 'ENV PATH=${COMMUNITY_PNPM_BIN}:${PATH}' Dockerfile.community
if rg -n 'npx|only-allow' Dockerfile.community build/community/install-dependencies.sh; then
  echo "unlocked package runner found in community image path" >&2
  exit 1
fi
python3 - <<'PY'
from pathlib import Path

for path in (Path("Dockerfile.community"), Path("build/community/install-dependencies.sh")):
    logical = path.read_text().replace("\\\n", " ")
    for line in logical.splitlines():
        if "pnpm install" in line and "--ignore-scripts" not in line:
            raise SystemExit(f"{path}: pnpm install can execute root lifecycle scripts")
PY
bash build/community/tests/pnpm-path-test.sh

if rg -n 'branch\(\)|os\.userInfo\(\)|new Date\(\)' \
  cli/lib/util/gen-version.ts core/webpack.production.js shell/webpack.production.js; then
  echo "nondeterministic UI metadata source remains" >&2
  exit 1
fi

if rg -n \
  'erda-ui-enterprise|registry\.erda\.cloud|registry\.npm\.terminus\.io|:latest' \
  Dockerfile.community build/community package.json .npmrc pnpm-lock.yaml \
  --glob '!image-policy.sh'; then
  echo "private, enterprise, or floating UI build input found" >&2
  exit 1
fi
bash -n build/community/resolve-base-images.sh
bash -n build/community/build-image.sh
echo "community UI image policy: PASS"
