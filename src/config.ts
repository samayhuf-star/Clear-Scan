// Central place for IDs and links. Product IDs match the App Store Connect products.
export const CONFIG = {
  appName: 'Keptly',
  // RevenueCat public SDK key for iOS (starts with "appl_"). Set EXPO_PUBLIC_RC_IOS_KEY in EAS secrets.
  revenueCatIosKey: process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '',
  entitlementId: 'plus',
  products: {
    weekly: 'com.samayhuf.clearscan.pro.weekly',
    monthly: 'com.samayhuf.clearscan.pro.monthly',
    yearly: 'com.samayhuf.clearscan.pro.yearly',
    lifetime: 'com.samayhuf.clearscan.pro.lifetime',
  },
  // Used only until StoreKit returns a localized price. US prices of the products above.
  fallbackPrices: { weekly: '$2.99', monthly: '$2.99', yearly: '$19.99', lifetime: '$39.99' },
  // Used only until StoreKit returns the introductory offer. Lifetime has none.
  fallbackTrials: { weekly: null, monthly: '7 days', yearly: '7 days' },
  privacyUrl: 'https://samayhuf-star.github.io/Clear-Scan/',
  termsUrl: 'https://samayhuf-star.github.io/app-legal/clearscan/terms.html',
  supportEmail: 'samayhuf@gmail.com',
} as const;
