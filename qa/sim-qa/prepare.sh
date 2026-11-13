#!/usr/bin/env bash
# ClearScan prepare step for the public sim-qa runner (after expo prebuild / pod install, before the build).
# Copies storekit/ClearScan.storekit into the generated ios/ folder and points every shared
# Xcode scheme's Run and Test actions at it, so StoreKit Testing serves the 7-day intro offers
# and the lifetime product. Only touches the generated ios/ folder on the CI runner.
# This script does not start a run, EAS build, or App Store Connect write.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${OUT:-$PWD/artifacts}"
mkdir -p "$OUT"
cd "$ROOT"
APP_DIR="$ROOT" "$ROOT/scripts/ios-sim-qa/attach-storekit-scheme.sh" | tee -a "$OUT/prepare.log"
{
  echo "==> StoreKit scheme references"
  grep -n "StoreKitConfigurationFileReference" -A1 ios/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme 2>/dev/null || \
    grep -nR "StoreKitConfigurationFileReference" ios --include='*.xcscheme' || \
    echo "No StoreKitConfigurationFileReference found (attach-storekit-scheme.sh should have failed)"
  echo "==> Products in ios/ClearScan.storekit"
  python3 - "$ROOT/ios/ClearScan.storekit" << 'PY'
import json, sys
sk = json.load(open(sys.argv[1]))
subs = sk["subscriptionGroups"][0]["subscriptions"]
for s in subs:
    print(f"{s['productID']}: {s.get('introductoryOffer')} price={s.get('displayPrice')}")
life = next(p for p in sk["products"] if p["productID"].endswith(".pro.lifetime"))
print(f"{life['productID']}: introductoryOffer={life.get('introductoryOffer')} price={life.get('displayPrice')}")
PY
} | tee -a "$OUT/prepare.log"
