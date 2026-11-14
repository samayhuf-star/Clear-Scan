# ClearScan SIM-RUN (simulator only, not device) — 43408603258

- Repo: samayhuf-star/Clear-Scan
- Ref: clearscan/trial @ dcf92824c680cf1792ce89aa5c2df93f9f4ef4c1
- Runner: https://github.com/AI-Samay/sim-qa-runner/actions/runs/43408603258
- Started: 13 Nov 2026, 4:22 PM Asia/Dhaka (BDT)
- Finished: 13 Nov 2026, 5:28 PM Asia/Dhaka (BDT)
- Overall: FAIL
- This run was already in progress; it was not cancelled. No official main screens were copied to /workspace/shots-now/ClearScan/. Nothing was uploaded to App Store Connect.

## Steps

| Step | Result | Notes |
| --- | --- | --- |
| Target is public | PASS | samayhuf-star/Clear-Scan |
| Checkout clearscan/trial | PASS | dcf9282 (fixture invoice; no Pillow) |
| Boot iPhone simulator | PASS | iPhone 17 Pro, iOS 26.2, UDID 98A0BFA3-CEC3-4FD6-9916-5A2149774DBF |
| npm ci / prebuild / Pods / Prepare | PASS | StoreKit scheme attached; yearly/monthly 7-day free intros, lifetime $39.99, no intro |
| Build Release simulator app | PASS | 10:32–11:13 UTC |
| Seed invoice photo | PASS | Fixture copied; hold marker written; addmedia used |
| Launch / home | FAIL | 01-home (with a saved scan) was never taken. 01-home-after-launch.png shows the empty home, which is a backup only. |
| Scanning | FAIL | Overlay appeared ("Preparing pages") but never finished. Official 02-scanning was not collected. |
| Scan result / OCR | FAIL | doc-screen never appeared |
| PDF export | FAIL | Skipped because the document screen never appeared |
| Paywall (prices and trial) | FAIL | home-paywall was tapped while the overlay was still up; paywall-screen never appeared |

## Root cause

Import did pick a photo. The system photo picker then handed back a File Provider URI under `File Provider Storage/photospicker/...`. `saveScan` called `ImageManipulator.manipulateAsync` on that URI and never returned, so the in-app "Preparing pages" overlay stayed on screen for the rest of the flow (app.log: file-coordination claim at 11:21:50 UTC, then no further file work).

The 2.8s QA hold is not the cause: the overlay was already on the prepare step, and it was still there minutes later when the paywall flow ran.

## Follow-up

A later commit on clearscan/trial seeds `.clearscan-qa-inbox.jpg` into the app container so `pickFromLibrary` can skip the system picker in sim QA, and `saveScan` copies File Provider URIs to cache with a timeout before normalizing. Re-run at most twice after that fix. Official review shots, if any, must be only 01-home, 02-scanning, 03-result, 04-export, and 05-paywall, and must never be uploaded from shots-now.
