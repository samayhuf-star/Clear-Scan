# Keptly: second-rejection risk audit (2026-11-17)

Status: build 6 was submitted before the "never resubmit until confirmed" rule. Withdrawal pending (needs a browser).

## Blocking
1. RevenueCat key missing from builds. `src/config.ts` reads `EXPO_PUBLIC_RC_IOS_KEY`; the EAS project has no environment variables, the build log lists none, and the repo has no .env. `initPurchases()` returns early, so no subscription or lifetime purchase can complete. A reviewer who opens the paywall hits a dead end (2.1 / 3.1.1). Fix: set the key in EAS (production), rebuild, test a sandbox purchase.
2. Product naming mismatch. In-app and listing say "Keptly Plus"; App Store Connect products and group still display the old "ClearScan Pro" name. Rename them in App Store Connect to "Keptly Plus" before the next submission (3.1.2 / 2.3).
3. Screenshots still show the old blue UI. Replace with captures of build 6 (6.9" size) from a simulator or device (2.3.3).

## Should do
4. Remove unused Android `RECORD_AUDIO` permission from app.json (harmless on iOS, noise in review).
5. Keep one distinctive line at the top of the description and review notes (done). Reply already explains the difference.
6. Space out new submissions from this account; several similar Expo apps from one account raise the 4.3 fingerprint.

## Done
- Distinct features (Facts, Deadlines, share-safe text), new teal identity and icon, listing and review notes rewritten, reply posted.
- Push entitlement removed (local reminders only), so the profile matches.
