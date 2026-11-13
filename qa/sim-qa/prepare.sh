#!/usr/bin/env bash
# ClearScan prepare step for the public sim-qa runner (after expo prebuild / pod install, before the build).
# CI only, never EAS. Only touches the CI checkout and the generated ios/ folder on the runner.
#  1. Drops "_developerTeamID" from storekit/ClearScan.storekit on the CI checkout only (never
#     committed). The runner builds unsigned, and with a team id SKTestSession failed to attach
#     for Lulla (SKInternalErrorDomain Code=3), so purchases fell through to the sandbox sign-in.
#  2. Adds the ClearScanQATests UI test target (qa/ClearScanQATests/SimQATests.swift) with the
#     .storekit as a test resource, so the runner picks build-for-testing.
#  3. Points the shared scheme's Run and Test actions at the StoreKit configuration.
# This script does not start a run, EAS build, or App Store Connect write.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
OUT="${OUT:-$PWD/artifacts}"
mkdir -p "$OUT"
cd "$ROOT"

python3 - <<'PY' | tee -a "$OUT/prepare.log"
import json
p = "storekit/ClearScan.storekit"
d = json.load(open(p))
had = d.get("settings", {}).pop("_developerTeamID", None) is not None
json.dump(d, open(p, "w"), indent=2)
print(f"storekit: removed _developerTeamID on the CI checkout: {had}")
PY

gem list -i xcodeproj >/dev/null 2>&1 || gem install xcodeproj --no-document --user-install
export PATH="$(ruby -e 'print Gem.user_dir')/bin:$PATH"
ruby qa/scripts/prepare-xcode-qa.rb | tee -a "$OUT/prepare.log"

APP_DIR="$ROOT" "$ROOT/scripts/ios-sim-qa/attach-storekit-scheme.sh" | tee -a "$OUT/prepare.log"
{
  echo "==> StoreKit scheme references"
  grep -n "StoreKitConfigurationFileReference" -A1 ios/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme 2>/dev/null || \
    echo "No StoreKitConfigurationFileReference found"
  grep -q TestableReference ios/*.xcodeproj/xcshareddata/xcschemes/*.xcscheme && echo "scheme has the UI test host"
  echo "==> Products in storekit/ClearScan.storekit"
  python3 - "$ROOT/storekit/ClearScan.storekit" << 'PY'
import json, sys
sk = json.load(open(sys.argv[1]))
subs = sk["subscriptionGroups"][0]["subscriptions"]
for s in subs:
    print(f"{s['productID']}: {s.get('introductoryOffer')} price={s.get('displayPrice')}")
life = next(p for p in sk["products"] if p["productID"].endswith(".pro.lifetime"))
print(f"{life['productID']}: introductoryOffer={life.get('introductoryOffer')} price={life.get('displayPrice')}")
print("team id present:", "_developerTeamID" in sk.get("settings", {}))
PY
} | tee -a "$OUT/prepare.log"
