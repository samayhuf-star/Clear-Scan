// Central place for IDs and links. Product IDs match the App Store Connect products.
export const CONFIG = {
  appName: 'ClearScan',
  // RevenueCat public SDK key for iOS (starts with "appl_"). Set EXPO_PUBLIC_RC_IOS_KEY in EAS secrets.
  revenueCatIosKey: process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '',
  entitlementId: 'plus',
  // Single plan (17 Nov 2026): weekly auto-renewing subscription, 7-day free trial, then $1.99 per week.
  products: {
    weekly: 'com.samayhuf.clearscan.pro.weekly',
  },
  // Used only until StoreKit returns a localized price. US price of the product above.
  fallbackPrices: { weekly: '$1.99' },
  // Used only until StoreKit returns the introductory offer.
  fallbackTrials: { weekly: '7 days' },
  privacyUrl: 'https://samayhuf-star.github.io/Clear-Scan/',
  termsUrl: 'https://samayhuf-star.github.io/app-legal/clearscan/terms.html',
  supportEmail: 'samayhuf@gmail.com',
} as const;
