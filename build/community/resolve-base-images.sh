#!/usr/bin/env bash
set -euo pipefail

repo_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
output="${repo_root}/build/community/base-images.env"
tagged_ref=docker.io/library/node:22.22.3-bookworm-slim
repository="${tagged_ref%:*}"
docker pull "${tagged_ref}" >/dev/null
repo_digest="$(docker image inspect --format '{{index .RepoDigests 0}}' "${tagged_ref}")"
digest="${repo_digest##*@}"
[[ "${digest}" =~ ^sha256:[0-9a-f]{64}$ ]] || {
  echo "could not resolve ${tagged_ref}" >&2
  exit 1
}
printf 'UI_NODE_IMAGE=%s@%s\n' "${repository}" "${digest}" >"${output}"
echo "locked ${repository}@${digest}"
