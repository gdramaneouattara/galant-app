#!/usr/bin/env bash
set -euo pipefail

WRAPPER_FILE="android/gradle/wrapper/gradle-wrapper.properties"

if [[ ! -f "$WRAPPER_FILE" ]]; then
  echo "[eas-post-install] No gradle wrapper file found, skipping."
  exit 0
fi

echo "[eas-post-install] Patching ${WRAPPER_FILE}"

# Smaller Gradle distribution to reduce download size on unstable networks.
sed -i 's/gradle-8\.10\.2-all\.zip/gradle-8.10.2-bin.zip/g' "$WRAPPER_FILE"
sed -i 's/gradle-8\.10-all\.zip/gradle-8.10-bin.zip/g' "$WRAPPER_FILE"

# Increase wrapper network timeout (milliseconds).
if grep -q '^networkTimeout=' "$WRAPPER_FILE"; then
  sed -i 's/^networkTimeout=.*/networkTimeout=600000/g' "$WRAPPER_FILE"
else
  printf '\nnetworkTimeout=600000\n' >> "$WRAPPER_FILE"
fi

echo "[eas-post-install] Patch applied."
