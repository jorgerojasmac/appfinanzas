#!/bin/bash
# Genera las pantallas de arranque del iPhone 15 Pro (1179x2556) en claro y oscuro.
set -e
cd "$(dirname "$0")/.."
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
TMP=$(mktemp -d)
for mode in light dark; do
  BG="#F2F2F7"; FG="#000000"; [ "$mode" = dark ] && BG="#000000" && FG="#FFFFFF"
  cat > "$TMP/s.html" <<HTML
<html><body style="margin:0;width:1179px;height:2556px;background:$BG;display:flex;flex-direction:column;align-items:center;justify-content:center;font-family:-apple-system,system-ui">
<img src="file://$PWD/scripts/icon.svg" width="360" height="360" style="border-radius:80px;display:block">
<div style="margin-top:56px;font-size:72px;font-weight:600;color:$FG;letter-spacing:-1px">Finanzas</div>
</body></html>
HTML
  "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 \
    --window-size=1179,2556 --screenshot="$PWD/public/splash-1179x2556-$mode.png" "file://$TMP/s.html" >/dev/null 2>&1
  echo "public/splash-1179x2556-$mode.png"
done
rm -rf "$TMP"
