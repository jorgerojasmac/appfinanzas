#!/bin/bash
# Genera los PNG de la app a partir de scripts/icon.svg usando Chrome headless.
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
for spec in "apple-touch-icon.png:180" "pwa-192.png:192" "pwa-512.png:512"; do
  name=${spec%%:*}; size=${spec##*:}
  cat > "$TMP/i.html" <<HTML
<html><body style="margin:0"><img src="file://$PWD/scripts/icon.svg" width="$size" height="$size" style="display:block"></body></html>
HTML
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=$size,$size --screenshot="$PWD/public/$name" "file://$TMP/i.html" >/dev/null 2>&1
  echo "public/$name"
done
rm -rf "$TMP"
