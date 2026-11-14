# ClearScan sim-qa run 43406268420

- Repo: samayhuf-star/Clear-Scan
- Ref: clearscan/trial @ e569a25ecfa0df22e02156f195766036d767dcbf (first trial commit; the five-screen flow was not on this SHA)
- Runner: https://github.com/AI-Samay/sim-qa-runner/actions/runs/43406268420
- Started: 13 Nov 2026, 4:04 PM Asia/Dhaka
- Finished: 13 Nov 2026, 4:20 PM Asia/Dhaka
- Overall: FAIL

This run is kept for the compile result. Screenshots from it are not store shots and were not copied to /workspace/shots-now/ClearScan/. Nothing from this run was uploaded.

## Steps

| Step | Result | Notes |
| --- | --- | --- |
| Target is public | PASS | samayhuf-star/Clear-Scan |
| Checkout clearscan/trial | PASS | e569a25 |
| Boot iPhone simulator | PASS | iPhone 17 Pro, UDID 98A0BFA3-CEC3-4FD6-9916-5A2149774DBF |
| npm ci | PASS | |
| Expo prebuild (iOS) | PASS | |
| Pods | PASS | |
| Prepare (StoreKit scheme) | PASS | ClearScan.storekit attached; yearly/monthly 7-day free intros, lifetime $39.99, no intro |
| Build Release simulator app | PASS | `** TEST BUILD SUCCEEDED **` (no compile errors) |
| Seed invoice photo | FAIL | `qa/sim-qa/flow.sh` generated the JPEG with Pillow; the macOS runner has no PIL. Flow exited before install, Maestro, or any screenshot. |
| Launch / home | FAIL | Not reached |
| Scanning | FAIL | Not reached |
| Scan result / document | FAIL | Not reached |
| Export options | FAIL | Not reached (this SHA also did not capture an export sheet) |
| Paywall (prices and trial) | FAIL | Not reached |
| Restore (QA log only) | FAIL | Not reached |

## Follow-up (not part of this run)

Pillow was removed from the flow. The invoice JPEG is now a committed fixture at `qa/sim-qa/fixtures/clearscan-qa-invoice.jpg`. The branch tip c6967f4 plus that fixture change is what the next run should use. Official review shots, if any, must be only 01-home, 02-scanning, 03-result, 04-export, and 05-paywall, and must never be uploaded.
