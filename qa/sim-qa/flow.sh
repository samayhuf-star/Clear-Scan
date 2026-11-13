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
PHOTO="$OUT/media/clearscan-qa-invoice.jpg"
mkdir -p "$OUT/media"
FIXTURE="$ROOT/qa/sim-qa/fixtures/clearscan-qa-invoice.jpg"
if [[ ! -f "$FIXTURE" ]]; then
  echo "Missing fixture $FIXTURE" | tee "$OUT/flow-error.txt"
  exit 1
fi
cp "$FIXTURE" "$PHOTO"
echo "photo: $PHOTO"

echo "==> Install and grant Photos / Camera (so permission dialogs never appear)"
xcrun simctl install "$UDID" "$APP"
xcrun simctl privacy "$UDID" grant photos "$BUNDLE_ID" || true
xcrun simctl privacy "$UDID" grant photos-add "$BUNDLE_ID" || true
xcrun simctl privacy "$UDID" grant camera "$BUNDLE_ID" || true
xcrun simctl addmedia "$UDID" "$PHOTO" | tee -a "$OUT/seed.txt" || echo "addmedia failed" | tee -a "$OUT/seed.txt"

# Marker lets saveScan hold the in-app scanning overlay long enough for 02-scanning.
# The inbox JPEG lets pickFromLibrary skip the system photo picker, whose File
# Provider URIs hung ImageManipulator on the iOS 26 simulator (run 43408603258).
DATA="$(xcrun simctl get_app_container "$UDID" "$BUNDLE_ID" data 2>/dev/null || true)"
if [[ -n "${DATA:-}" ]]; then
  mkdir -p "$DATA/Documents"
  touch "$DATA/Documents/.clearscan-qa-hold"
  cp "$PHOTO" "$DATA/Documents/.clearscan-qa-inbox.jpg"
  echo "qa hold marker: $DATA/Documents/.clearscan-qa-hold" | tee -a "$OUT/seed.txt"
  echo "qa inbox: $DATA/Documents/.clearscan-qa-inbox.jpg" | tee -a "$OUT/seed.txt"
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

# Maestro does not read a flow from stdin, so write a temp file (run 43427632722:
# `maestro test -` always failed, so doc-screen looked absent and export was skipped).
visible() {
  local id="$1" f rc
  f="$(mktemp -t csvis).yaml"
  cat > "$f" <<YAML
appId: ${BUNDLE_ID}
---
- assertVisible:
    id: "${id}"
YAML
  maestro test "$f" >/dev/null 2>&1
  rc=$?
  rm -f "$f"
  return $rc
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
  # Official 02/03 come from Maestro (overlay mid-scan; result on the Text tab).
  if [[ ! -f "$OUT/screenshots/03-result.png" ]] && visible "doc-screen"; then
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
  if [[ ! -f "$OUT/screenshots/01-home.png" ]] && visible "home-screen"; then
    shot "01-home"
  fi
else
  echo "Back-to-home flow failed" | tee -a "$OUT/flow-error.txt"
  RC=1
fi

echo "==> Paywall cross-check with App Store sandbox prices (QA log only, not an official shot)"
SANDBOX_PAYWALL=fail
if run_flow 03_paywall.yaml 05_paywall_sandbox; then
  SANDBOX_PAYWALL=pass
  collect_maestro_shot "05-paywall-sandbox" || true
else
  shot "05-paywall-sandbox-failed"
fi
echo "sandbox paywall cross-check: $SANDBOX_PAYWALL" | tee -a "$OUT/flow-notes.txt"

# Official 05-paywall, purchase (22) and restore (23) run in the ClearScanQATests UI test
# with an SKTestSession from storekit/ClearScan.storekit (simctl launch cannot load it).
echo "==> Paywall, purchase and restore with the local StoreKit session (XCUITest)"
IAP_OUT="$OUT/iap"
mkdir -p "$IAP_OUT"
xcrun simctl terminate "$UDID" "$BUNDLE_ID" >/dev/null 2>&1 || true
xcrun simctl terminate "$UDID" dev.mobile.maestro-driver-iosUITests.xctrunner >/dev/null 2>&1 || true
pkill -f maestro >/dev/null 2>&1 || true
sleep 3
mkdir -p /tmp/clearscan-sk && cp "$ROOT/storekit/ClearScan.storekit" /tmp/clearscan-sk/ClearScan.storekit
if grep -q _developerTeamID /tmp/clearscan-sk/ClearScan.storekit; then
  echo "storekit copy still has a team id" | tee -a "$OUT/flow-notes.txt"
else
  echo "storekit copy: no team id" | tee -a "$OUT/flow-notes.txt"
fi
IAP_START=$(date "+%Y-%m-%d %H:%M:%S")
set +e
TEST_RUNNER_SIM_QA_OUT="$IAP_OUT" TEST_RUNNER_STOREKIT_CONFIG="/tmp/clearscan-sk/ClearScan.storekit" \
xcodebuild test-without-building -workspace "${WORKSPACE:-ios/ClearScan.xcworkspace}" -scheme "$SCHEME" -configuration Release \
  -destination "platform=iOS Simulator,id=$UDID" -derivedDataPath "$DERIVED_DATA" \
  -resultBundlePath "$IAP_OUT/iap.xcresult" -only-testing:ClearScanQATests/SimQATests/testPaywallPurchaseAndRestore \
  > "$OUT/xcodebuild-test-iap.log" 2>&1
IAP_RC=$?
set -e
echo "xcodebuild test exit: $IAP_RC" | tee -a "$OUT/flow-notes.txt"
tail -n 40 "$OUT/xcodebuild-test-iap.log" || true
xcrun simctl spawn "$UDID" log show --start "$IAP_START" --style compact \
  --predicate 'process CONTAINS "ClearScan" OR process == "storekitd" OR process CONTAINS "StoreKit"' > "$OUT/app-iap.log" 2>&1 || true
grep -hE 'SKTestSession|SKInternalErrorDomain|\[clearscan-qa\]' "$OUT/app-iap.log" "$OUT/xcodebuild-test-iap.log" > "$OUT/iap.log" 2>/dev/null || true
if grep -q SKInternalErrorDomain "$OUT/iap.log"; then
  echo "storekit_session_errors=yes" > "$OUT/storekit-note.txt"
else
  echo "storekit_session_errors=no" > "$OUT/storekit-note.txt"
fi
for f in "$IAP_OUT"/*.png; do if [[ -f "$f" ]]; then cp "$f" "$OUT/screenshots/"; fi; done
PAYWALL_LOCAL=$(python3 -c 'import json,sys
try:
    st=json.load(open(sys.argv[1]))["steps"]
    print("pass" if any(s["step"]=="05" and s["pass"] for s in st) else "fail")
except Exception: print("missing")' "$IAP_OUT/results.json")
echo "local StoreKit paywall: $PAYWALL_LOCAL" | tee -a "$OUT/flow-notes.txt"
if [[ "$PAYWALL_LOCAL" != "pass" ]]; then
  rm -f "$OUT/screenshots/05-paywall.png"
  echo "Local StoreKit paywall did not pass (see iap/results.json)" | tee -a "$OUT/flow-error.txt"
  RC=1
fi

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
IAP_PASS=$(python3 -c 'import json,sys
try:
    st=json.load(open(sys.argv[1]))["steps"]
    print("pass" if all(s["pass"] for s in st if s["step"] in ("22","23")) and any(s["step"]=="23" for s in st) else "fail")
except Exception: print("fail")' "$OUT/iap/results.json")
echo "purchase and restore: $IAP_PASS" | tee -a "$OUT/flow-notes.txt"
[[ "$IAP_PASS" == "pass" ]] || { echo "FAIL purchase/restore (see iap/results.json)" | tee -a "$OUT/flow-error.txt"; RC=1; }

# Do not leave failed-picker / restore leftovers under the official names.
rm -f "$OUT/screenshots/04-restore.png" "$OUT/screenshots/05-final.png" || true
python3 "$ROOT/qa/sim-qa/summary.py" "$OUT" "$RC" "${IAP_RC:-na}" || true

echo "flow exit $RC"
exit $RC
