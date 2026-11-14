# ClearScan SIM-RUN (simulator only, not device)

flow exit: 1; xcodebuild test exit: 0

storekit_session_errors=no

| Screen | Present |
| --- | --- |
| 01-home | NO |
| 02-scanning | NO |
| 03-result | NO |
| 04-export | NO |
| 05-paywall | yes |

| Step | Result | Detail |
| --- | --- | --- |
| 05 Paywall: local StoreKit prices, 7-day trial, lifetime (attempt 1) | PASS | monthly trial line=true yearly trial line=true lifetime $39.99 one-time=true no lifetime trial=true session=true swipes=1 |
| 22 Monthly purchase through local StoreKit (no sandbox sign-in) | PASS | attempt 1: paywallClosed=true localSheetShown=false proActive=true; local tx com.samayhuf.clearscan.pro.monthly expires in 7.0d |
| 23 Restore purchases (Settings row) | PASS | alert: Restored; local tx com.samayhuf.clearscan.pro.monthly expires in 7.0d; proActiveAfter=true |
