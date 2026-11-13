#!/usr/bin/env bash
# After `expo prebuild`, copy ClearScan.storekit into ios/ and point every shared
# Xcode scheme's LaunchAction and TestAction at it.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
APP_DIR="${APP_DIR:-$ROOT}"
SRC="$APP_DIR/storekit/ClearScan.storekit"
IOS_DIR="$APP_DIR/ios"

if [[ ! -f "$SRC" ]]; then
  echo "Missing StoreKit file: $SRC" >&2
  exit 1
fi
if [[ ! -d "$IOS_DIR" ]]; then
  echo "Missing ios/ directory; run expo prebuild first." >&2
  exit 1
fi

cp "$SRC" "$IOS_DIR/ClearScan.storekit"
echo "Copied StoreKit config to $IOS_DIR/ClearScan.storekit"

python3 - "$IOS_DIR" << 'PY'
import sys
from pathlib import Path

ios = Path(sys.argv[1])
schemes = list(ios.glob("*.xcodeproj/xcshareddata/xcschemes/*.xcscheme"))
if not schemes:
    schemes = list(ios.glob("**/*.xcscheme"))
if not schemes:
    raise SystemExit("No .xcscheme files found under ios/")

patched = 0
for scheme in schemes:
    text = scheme.read_text()
    if "StoreKitConfigurationFileReference" in text:
        print(f"Already referenced in {scheme}")
        continue
    block = (
        "      <StoreKitConfigurationFileReference\n"
        '         identifier = "../ClearScan.storekit">\n'
        "      </StoreKitConfigurationFileReference>\n"
    )
    changed = text
    for tag in ("LaunchAction", "TestAction", "ProfileAction"):
        close = f"   </{tag}>"
        if close in changed:
            idx = changed.rfind(close)
            if idx == -1:
                continue
            changed = changed[:idx] + block + changed[idx:]
    if changed == text:
        raise SystemExit(f"Could not patch scheme: {scheme}")
    scheme.write_text(changed)
    patched += 1
    print(f"Patched StoreKitConfigurationFileReference into {scheme}")

print(f"Patched {patched} scheme(s)")
PY
