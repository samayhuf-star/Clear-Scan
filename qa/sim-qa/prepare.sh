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

# Run 43453269152: the SKTestSession saved this config but storekitd answered every product
# request with "Ignoring empty product response". Rewrite the CI copy into the exact shape of
# the Klenzer config that attaches on this runner: format 3.0, settings limited to locale,
# storefront and an empty _storeKitErrors list (no team or app ids), and local UUID internal ids
# instead of the App Store Connect ids, and the 3.0 key name winBackOffers (the committed
# file mixed format 3.0 with the 4.0 key winbackOffers and 4.0-style error entries). Product ids, prices, trials and periods are unchanged.
python3 - <<'PY' | tee -a "$OUT/prepare.log"
import json, uuid
p = "storekit/ClearScan.storekit"
d = json.load(open(p))
before = sorted(d.get("settings", {}))
d["version"] = {"major": 3, "minor": 0}
d["settings"] = {"_failTransactionsEnabled": False, "_locale": "en_US", "_storefront": "USA", "_storeKitErrors": []}
n = [0]
def nid():
    n[0] += 1
    return f"C1EA5CA0-0000-4000-8000-{n[0]:012d}"
for prod in d.get("products", []):
    prod["internalID"] = nid()
for g in d.get("subscriptionGroups", []):
    g["id"] = nid()
    for s in g.get("subscriptions", []):
        s["internalID"] = nid()
        s["subscriptionGroupID"] = g["id"]
        # Format 3.0 names this key winBackOffers (Klenzer); the committed file used the 4.0 name.
        s["winBackOffers"] = s.pop("winbackOffers", s.get("winBackOffers", []))
        if s.get("introductoryOffer"):
            s["introductoryOffer"]["internalID"] = nid()
json.dump(d, open(p, "w"), indent=2)
print(f"storekit (CI copy only): settings {before} -> {sorted(d['settings'])}; version 3.0; local internal ids")
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
