#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "${repo_root}"
source build/community/base-images.env

epoch="${SOURCE_DATE_EPOCH:-$(git show -s --format=%ct HEAD)}"
revision="$(git rev-parse HEAD)"
short_revision="$(git rev-parse --short=12 HEAD)"
image="${OUTPUT_IMAGE:-registry.cn-beijing.aliyuncs.com/myerda/erda-ui:sha-${short_revision}}"
builder_args=()
cache_args=()
[[ -z "${BUILDER_NAME:-}" ]] || builder_args+=(--builder "${BUILDER_NAME}")
[[ "${NO_CACHE:-false}" != true ]] || cache_args+=(--no-cache)

# macOS ships Bash 3.2, where expanding an empty array under nounset fails.
set +u
docker buildx build \
  "${builder_args[@]}" \
  "${cache_args[@]}" \
  --platform linux/amd64 \
  --load \
  --provenance=false \
  --build-arg "UI_NODE_IMAGE=${UI_NODE_IMAGE}" \
  --build-arg "SOURCE_DATE_EPOCH=${epoch}" \
  --build-arg "VCS_REF=${revision}" \
  --label "org.opencontainers.image.source=https://github.com/MosaicPlane/erda-ui" \
  --label "org.opencontainers.image.revision=${revision}" \
  --tag "${image}" \
  --file Dockerfile.community \
  .
set -u
echo "${image}"
