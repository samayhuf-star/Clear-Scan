# ClearScan

Private iOS document scanner. Unlimited scans, on-device OCR, no watermark, no account. Optional Plus subscription.

Expo SDK 58 · Expo Router · expo-sqlite (FTS5 search) · VisionKit scanner · Apple Vision OCR · RevenueCat.

## Run
Native modules need a dev build; Expo Go will not work.
```
npm install
eas build --profile development --platform ios
npx expo start --dev-client
```

## Before you ship
1. Confirm the bundle ID in `app.json` (`com.samayhuf.clearscan`).
2. App Store products: `com.samayhuf.clearscan.pro.monthly`, `com.samayhuf.clearscan.pro.yearly` (each with a 7-day free trial), and `com.samayhuf.clearscan.pro.lifetime`.
3. In RevenueCat add an entitlement `plus`, attach both products, create a current offering.
4. Set `EXPO_PUBLIC_RC_IOS_KEY` (EAS secret).
5. Host `PRIVACY.md` at a public URL and update `src/config.ts`.
6. Test scan, OCR, export and purchases on a real iPhone (TestFlight).

Listing copy: `store/APP_STORE_LISTING.md`.
