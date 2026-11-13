// Product IDs follow the bundle id com.samayhuf.clearscan.
// Monthly $2.99 and yearly $19.99 each get a 7-day free trial once created in ASC.
// Lifetime $39.99 is a non-consumable. ASC products are not created by this repo.
export const PRODUCT_IDS = {
  monthly: 'com.samayhuf.clearscan.pro.monthly',
  yearly: 'com.samayhuf.clearscan.pro.yearly',
  lifetime: 'com.samayhuf.clearscan.pro.lifetime',
} as const;

export type ProductId = (typeof PRODUCT_IDS)[keyof typeof PRODUCT_IDS];
export type PlanKind = 'monthly' | 'yearly' | 'lifetime';

export const SUBSCRIPTION_IDS: ProductId[] = [PRODUCT_IDS.monthly, PRODUCT_IDS.yearly];
export const ALL_PRODUCT_IDS: ProductId[] = [PRODUCT_IDS.monthly, PRODUCT_IDS.yearly, PRODUCT_IDS.lifetime];

export const PLAN_KIND: Record<ProductId, PlanKind> = {
  [PRODUCT_IDS.monthly]: 'monthly',
  [PRODUCT_IDS.yearly]: 'yearly',
  [PRODUCT_IDS.lifetime]: 'lifetime',
};

export const CONFIG = {
  appName: 'ClearScan',
  products: PRODUCT_IDS,
  privacyUrl: 'https://samayhuf-star.github.io/app-legal/clearscan/privacy.html',
  termsUrl: 'https://samayhuf-star.github.io/app-legal/clearscan/terms.html',
  supportEmail: 'samayhuf@gmail.com',
} as const;
