# ClearScan

Private iOS document scanner. Unlimited scans, on-device OCR, no watermark, no account. Optional ClearScan Pro subscription.

Expo SDK 58 · Expo Router · expo-sqlite (FTS5 search) · VisionKit scanner · Apple Vision OCR · StoreKit 2 via expo-iap (no RevenueCat).

## Run
Native modules need a dev build; Expo Go will not work.
```
npm install
eas build --profile development --platform ios
npx expo start --dev-client
```

## Products
Bundle id `com.samayhuf.clearscan` (ASC 6833164518). Product ids, pending creation in App Store Connect:

- `com.samayhuf.clearscan.pro.monthly` — $2.99, 7-day free trial
- `com.samayhuf.clearscan.pro.yearly` — $19.99, 7-day free trial
- `com.samayhuf.clearscan.pro.lifetime` — $39.99, non-consumable, no trial

Scanning, OCR, search, PDF export, folders and app lock stay free. Pro unlocks auto-sort and Word or Markdown export.

## Before you ship
1. Create the three products in App Store Connect (do not invent other ids).
2. Publish privacy and terms at:
   - https://samayhuf-star.github.io/app-legal/clearscan/privacy.html
   - https://samayhuf-star.github.io/app-legal/clearscan/terms.html
3. Test scan, OCR, export and purchases on a real iPhone (TestFlight).

Listing copy: `store/APP_STORE_LISTING.md`.
