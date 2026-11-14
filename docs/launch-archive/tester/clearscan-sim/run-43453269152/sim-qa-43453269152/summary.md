# ClearScan SIM-RUN (simulator only, not device)

flow exit: 1; xcodebuild test exit: 0

storekit_session_errors=no

| Screen | Present |
| --- | --- |
| 01-home | NO |
| 02-scanning | NO |
| 03-result | NO |
| 04-export | NO |
| 05-paywall | NO |

| Step | Result | Detail |
| --- | --- | --- |
| 05 Paywall: local StoreKit prices, 7-day trial, lifetime (attempt 1) | FAIL | monthly trial line=false yearly trial line=false lifetime $39.99 one-time=false no lifetime trial=true session=true swipes=1 |
| 05 Paywall: local StoreKit prices, 7-day trial, lifetime (attempt 2) | FAIL | monthly trial line=false yearly trial line=false lifetime $39.99 one-time=false no lifetime trial=true session=true swipes=1 |
| 22 Monthly purchase through local StoreKit (no sandbox sign-in) | FAIL | attempt 2: app alert Plans unavailable |
| 23 Restore purchases (Settings row) | FAIL | skipped, purchase did not complete |
