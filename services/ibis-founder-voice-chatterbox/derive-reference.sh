#!/usr/bin/env bash
set -euo pipefail

input=${1:?"usage: derive-reference.sh INPUT.ogg OUTPUT.ogg"}
output=${2:?"usage: derive-reference.sh INPUT.ogg OUTPUT.ogg"}
expected_source="a1c58062344bb586dad665b9db6b81bba56af85fbffd214a6c17df3f4d270e9b"
expected_output="5fd8ef67b517ba08c9d28093859004753c10de4d6771c37e1eac1e2c3fbe333e"

source_sha=$(sha256sum "$input" | awk '{print $1}')
if [[ "$source_sha" != "$expected_source" ]]; then
  echo "Founder voice source SHA-256 mismatch; refusing derivation" >&2
  exit 1
fi

ffmpeg -hide_banner -loglevel error -y \
  -ss 100 -i "$input" -t 6 -map_metadata -1 \
  -ac 1 -ar 24000 -c:a libopus -b:a 24k -vbr off \
  -compression_level 10 -application voip \
  -fflags +bitexact -flags:a +bitexact -serial_offset 0 \
  "$output"

output_sha=$(sha256sum "$output" | awk '{print $1}')
if [[ "$output_sha" != "$expected_output" ]]; then
  echo "Derived founder voice SHA-256 mismatch" >&2
  exit 1
fi

echo "$output_sha"
