// Central place for IDs and links. Replace the TODO values before you submit to the App Store.
export const CONFIG = {
  appName: 'ClearScan',
  // RevenueCat public SDK key for iOS (starts with "appl_"). Set EXPO_PUBLIC_RC_IOS_KEY in EAS secrets.
  revenueCatIosKey: process.env.EXPO_PUBLIC_RC_IOS_KEY ?? '',
  entitlementId: 'plus',
  // Product IDs to create in App Store Connect and attach to a RevenueCat offering.
  products: {
    monthly: 'clearscan_plus_monthly', // 3.99 USD
    yearly: 'clearscan_plus_yearly', // 14.99 USD
  },
  fallbackPrices: { monthly: '$3.99', yearly: '$14.99' },
  // TODO: replace with hosted pages before App Review.
  privacyUrl: 'https://github.com/samayhuf-star/Clear-Scan/blob/main/PRIVACY.md',
  termsUrl: 'https://www.apple.com/legal/internet-services/itunes/dev/stdeula/',
  supportEmail: 'samayhuf@gmail.com',
} as const;
