# ClearScan 1.0.0 (5): build, upload and attach (dev 3)

- Sim verdict: PASS. See ../tester/clearscan-sim/VERDICT-43509544883.md (run 43509544883 @ f36d9d0).
- Build: free GitHub macOS runner, `eas build --local`, expo_account krosz, build_number=5, upload=true. Run 43550607526 (AI-Samay/sim-qa-runner, public), success. Source b9a862f (paywall copy fix). No EAS cloud. The IPA was not an artifact (only scrubbed logs are here).
- Signing: iPhone Distribution PGLT2QZX88, "ClearScan App Store" profile, get-task-allow false, codesign OK. altool: UPLOAD SUCCEEDED, delivery a889c064-96f1-42c7-8cb4-7e0fc4a111a1.
- ASC build a889c064-96f1-42c7-8cb4-7e0fc4a111a1, 1.0.0 (5): VALID, usesNonExemptEncryption=false (from Info.plist).
- Attached to appStoreVersion 40d9a518 (v1.0, PREPARE_FOR_SUBMISSION), releaseType AFTER_APPROVAL.
- TestFlight: internal "Team (Expo)" 3188709c (all builds) has build 5, IN_BETA_TESTING. External F&F aded5eb9 untouched.
- Review detail b3d29f58: notes == review-notes/clearscan.txt (3350 chars, no recording placeholder). Contact Samay Vashsht [phone redacted] samayhuf@gmail.com.
- Screenshots: APP_IPHONE_67 (6.9in, 1320x2868) en-US, 4 uploaded, COMPLETE: scanning, result/OCR, home, export. Composed from run 43509544883 via clearscan-sim/compose_shots.py; files in clearscan-sim/store-shots-43509544883/6.9/. The paywall was left out because that run's paywall has the old COMING SOON rows.
- Price Free (USA manual $0, 174 auto). IAPs READY_TO_SUBMIT: 6834361474 $2.99, 6834351556 $19.99, 6834367887 $39.99 (US).
- reviewSubmissions: 0. Not submitted (dev 1's job).
