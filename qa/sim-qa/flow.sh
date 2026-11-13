#!/usr/bin/env bash
# ClearScan flow for the public sim-qa runner, modelled on Playsz qa/sim-qa/flow.sh.
# Env from the workflow: UDID, BUNDLE_ID, SCHEME, WORKSPACE, DERIVED_DATA, OUT.
# Installs the Release .app, seeds a local document photo, then drives Maestro:
# launch (skip onboarding), import a photo as a scan, paywall prices and
# "Try 7 days free, then <price>" copy, Restore, and screenshots.
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

echo "==> Install and grant Photos / Camera"
xcrun simctl install "$UDID" "$APP"
xcrun simctl privacy "$UDID" grant photos "$BUNDLE_ID" || true
xcrun simctl privacy "$UDID" grant photos-add "$BUNDLE_ID" || true
xcrun simctl privacy "$UDID" grant camera "$BUNDLE_ID" || true
xcrun simctl addmedia "$UDID" "$PHOTO" | tee -a "$OUT/seed.txt" || echo "addmedia failed" | tee -a "$OUT/seed.txt"
sleep 3

shot() {
  local name="$1"
  xcrun simctl io "$UDID" screenshot "$OUT/screenshots/${name}.png" >/dev/null
  echo "screenshot: $OUT/screenshots/${name}.png"
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
  return $rc
}

RC=0
echo "==> Launch"
xcrun simctl terminate "$UDID" "$BUNDLE_ID" >/dev/null 2>&1 || true
run_flow 01_launch.yaml 01_launch || RC=1
shot "01-launch"

echo "==> Import a seeded photo"
run_flow 02_import_photo.yaml 02_import || true
# Import can fail on the system picker; still capture whatever is on screen.
sleep 2
shot "02-import-or-home"

echo "==> Paywall, trial copy, Restore"
if run_flow 03_paywall.yaml 03_paywall; then
  shot "03-paywall"
  run_flow 04_restore.yaml 04_restore || RC=1
  shot "04-restore"
else
  echo "Paywall flow failed" | tee -a "$OUT/flow-error.txt"
  shot "03-paywall-failed"
  RC=1
fi

shot "05-final"
echo "flow exit $RC"
exit $RC
