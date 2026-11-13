#!/usr/bin/env bash
# ClearScan flow for the public sim-qa runner.
# Env from the workflow: UDID, BUNDLE_ID, SCHEME, WORKSPACE, DERIVED_DATA, OUT.
# Installs the Release .app, seeds a local document photo, then drives Maestro.
#
# Main screens captured (these five are for Samay's review only and must never
# be uploaded to App Store Connect or anywhere else):
#   01-home, 02-scanning, 03-result, 04-export, 05-paywall
# Never keep a permission dialog, Settings, or Restore as a main-screen shot.
# Restore may still be tapped for the QA log after the paywall shot.
# This script does not start a CI run, EAS build, or App Store Connect write.
set -euo pipefail
: "${UDID:?}" "${BUNDLE_ID:?}" "${SCHEME:?}" "${DERIVED_DATA:?}" "${OUT:?}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
cd "$ROOT"
mkdir -p "$OUT/screenshots" "$OUT/maestro" "$OUT/media"
export QA_ARTIFACTS="$OUT"
export BUNDLE_ID
export QA_COMMIT="${QA_COMMIT:-$(git rev-parse HEAD)}"
export QA_STARTED_AT="${QA_STARTED_AT:-$(date -u +%Y-%m-%dT%H:%M:%SZ)}"
export QA_SIMULATOR="${QA_SIMULATOR:-$UDID}"

MAIN_SHOTS="01-home 02-scanning 03-result 04-export 05-paywall"

echo "==> Boot simulator $UDID"
xcrun simctl boot "$UDID" 2>/dev/null || true
xcrun simctl bootstatus "$UDID" -b

echo "==> Locate .app"
APP="$(find "$DERIVED_DATA/Build/Products" -path '*iphonesimulator/*.app' -maxdepth 3 | head -n1 || true)"
if [[ -z "$APP" ]]; then
  APP="$(find "$DERIVED_DATA/Build/Products" -name "$SCHEME.app" | head -n1 || true)"
fi
if [[ -z "$APP" ]]; then
  echo "No .app found under $DERIVED_DATA/Build/Products" | tee "$OUT/flow-error.txt"
  exit 1
fi
echo "app: $APP"

echo "==> Seed a document photo"
python3 - "$OUT/media" << 'PY'
from pathlib import Path
import sys
from PIL import Image, ImageDraw, ImageFont
out = Path(sys.argv[1])
out.mkdir(parents=True, exist_ok=True)
img = Image.new("RGB", (1240, 1754), (250, 248, 240))
d = ImageDraw.Draw(img)
d.rectangle((80, 80, 1160, 1674), outline=(20, 40, 80), width=4)
d.rectangle((80, 80, 1160, 240), fill=(20, 40, 80))
try:
    font = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 48)
    small = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 36)
except Exception:
    font = small = ImageFont.load_default()
d.text((120, 120), "INVOICE 1042", fill=(255, 255, 255), font=font)
lines = [
    "ClearScan QA fixture",
    "Bill to: Sample Customer",
    "Date: 13 November 2026",
    "Amount due: 42.00",
    "This is a generated test page, not a real document.",
]
y = 320
for line in lines:
    d.text((140, y), line, fill=(20, 40, 80), font=small)
    y += 70
path = out / "clearscan-qa-invoice.jpg"
img.save(path, quality=90)
print(path)
PY
PHOTO="$OUT/media/clearscan-qa-invoice.jpg"

echo "==> Install and grant Photos / Camera (so permission dialogs never appear)"
xcrun simctl install "$UDID" "$APP"
xcrun simctl privacy "$UDID" grant photos "$BUNDLE_ID" || true
xcrun simctl privacy "$UDID" grant photos-add "$BUNDLE_ID" || true
xcrun simctl privacy "$UDID" grant camera "$BUNDLE_ID" || true
xcrun simctl addmedia "$UDID" "$PHOTO" | tee -a "$OUT/seed.txt" || echo "addmedia failed" | tee -a "$OUT/seed.txt"

# Marker lets saveScan hold the in-app scanning overlay long enough for 02-scanning.
DATA="$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data 2>/dev/null || true)"
if [[ -n "${DATA:-}" ]]; then
  mkdir -p "$DATA/Documents"
  touch "$DATA/Documents/.clearscan-qa-hold"
  echo "qa hold marker: $DATA/Documents/.clearscan-qa-hold" | tee -a "$OUT/seed.txt"
fi
sleep 3

shot() {
  local name="$1"
  xcrun simctl io "$UDID" screenshot "$OUT/screenshots/${name}.png" >/dev/null
  echo "screenshot: $OUT/screenshots/${name}.png"
}

# Copy a Maestro takeScreenshot PNG into $OUT/screenshots under a stable name.
collect_maestro_shot() {
  local name="$1"
  local dest="$OUT/screenshots/${name}.png"
  local found
  found="$(find "$ROOT" "$OUT" "$HOME/.maestro" -name "${name}.png" 2>/dev/null | head -n1 || true)"
  if [[ -n "$found" && -f "$found" ]]; then
    cp "$found" "$dest"
    echo "collected: $found -> $dest"
    return 0
  fi
  return 1
}

visible() {
  local id="$1"
  maestro test - <<YAML >/dev/null 2>&1
appId: ${BUNDLE_ID}
---
- assertVisible:
    id: "${id}"
YAML
}

if ! command -v maestro >/dev/null 2>&1; then
  echo "==> Install Maestro"
  curl -Ls "https://get.maestro.mobile.dev" | bash
  export PATH="$HOME/.maestro/bin:$PATH"
fi
command -v maestro >/dev/null 2>&1 || { echo "maestro is not on PATH" | tee "$OUT/flow-error.txt"; exit 1; }

run_flow() {
  local yaml="$1" tag="$2"
  mkdir -p "$OUT/maestro/$tag"
  set +e
  maestro test --debug-output "$OUT/maestro/$tag" "$ROOT/.maestro/$yaml" > "$OUT/maestro/${tag}.log" 2>&1
  local rc=$?
  set -e
  echo "==> $tag exit $rc"
  tail -n 30 "$OUT/maestro/${tag}.log" || true
  # Maestro may write takeScreenshot files next to the test or under debug-output.
  find "$OUT/maestro/$tag" "$ROOT" -maxdepth 3 -name '*.png' -newer "$OUT/maestro/${tag}.log" 2>/dev/null \
    | while read -r p; do cp "$p" "$OUT/screenshots/" 2>/dev/null || true; echo "maestro png: $p"; done || true
  return $rc
}

RC=0
echo "==> Launch"
xcrun simctl terminate "$UDID" "$BUNDLE_ID" >/dev/null 2>&1 || true
run_flow 01_launch.yaml 01_launch || RC=1
# Backup only. Official 01-home is taken after a document is on the home list.
shot "01-home-after-launch"

echo "==> Import a seeded photo (scanning overlay, then result)"
if run_flow 02_import_photo.yaml 02_import; then
  collect_maestro_shot "02-scanning" || true
  collect_maestro_shot "03-result" || true
  if visible "scanning-screen"; then
    shot "02-scanning"
  fi
  if visible "doc-screen"; then
    shot "03-result"
  elif [[ ! -f "$OUT/screenshots/03-result.png" ]]; then
    echo "Result screen was not visible; not saving a substitute shot" | tee -a "$OUT/flow-error.txt"
    RC=1
  fi
else
  echo "Import / scan flow failed" | tee -a "$OUT/flow-error.txt"
  # Do not save the picker or a permission dialog as 02-scanning or 03-result.
  shot "02-import-failed"
  RC=1
fi

echo "==> Export options"
if visible "doc-screen"; then
  if run_flow 03_export.yaml 03_export; then
    collect_maestro_shot "04-export" || true
    # Sheet is dismissed after a successful flow; keep the Maestro capture only.
    if [[ ! -f "$OUT/screenshots/04-export.png" ]]; then
      echo "Export options shot missing" | tee -a "$OUT/flow-error.txt"
      RC=1
    fi
  else
    echo "Export flow failed" | tee -a "$OUT/flow-error.txt"
    RC=1
  fi
else
  echo "Skipping export; document screen never appeared" | tee -a "$OUT/flow-error.txt"
  RC=1
fi

echo "==> Home with the saved scan"
if run_flow 04_back_home.yaml 04_home; then
  collect_maestro_shot "01-home" || true
  if visible "home-screen"; then
    shot "01-home"
  fi
else
  echo "Back-to-home flow failed" | tee -a "$OUT/flow-error.txt"
  RC=1
fi

echo "==> Paywall (prices and 7-day trial copy)"
if run_flow 03_paywall.yaml 05_paywall; then
  collect_maestro_shot "05-paywall" || true
  if visible "paywall-screen"; then
    shot "05-paywall"
  elif [[ ! -f "$OUT/screenshots/05-paywall.png" ]]; then
    echo "Paywall was not visible; not saving a substitute shot" | tee -a "$OUT/flow-error.txt"
    RC=1
  fi
else
  echo "Paywall flow failed" | tee -a "$OUT/flow-error.txt"
  shot "05-paywall-failed"
  RC=1
fi

# QA only: tap Restore for the log. Do not screenshot Settings or Restore.
echo "==> Restore (QA log only, no main-screen shot)"
run_flow 04_restore.yaml 06_restore || true

echo "==> Main screens present"
missing=0
for name in $MAIN_SHOTS; do
  if [[ -f "$OUT/screenshots/${name}.png" ]]; then
    echo "PASS $name"
  else
    echo "FAIL $name missing" | tee -a "$OUT/flow-error.txt"
    missing=1
  fi
done
if [[ "$missing" -ne 0 ]]; then
  RC=1
fi

# Do not leave failed-picker / restore leftovers under the official names.
rm -f "$OUT/screenshots/04-restore.png" "$OUT/screenshots/05-final.png" || true

echo "flow exit $RC"
exit $RC
