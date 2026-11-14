import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesOfferings, type PurchasesPackage, type PurchasesStoreProduct } from 'react-native-purchases';
import { CONFIG } from '../config';
import type { PlanId } from './offerCopy';

let configured = false;
let plus = false;
const listeners = new Set<(v: boolean) => void>();

function setPlus(v: boolean) {
  plus = v;
  listeners.forEach((l) => l(v));
}

function fromInfo(info: CustomerInfo) {
  setPlus(Boolean(info.entitlements.active[CONFIG.entitlementId]));
}

export const purchasesReady = () => configured;

export async function initPurchases() {
  if (configured || Platform.OS !== 'ios' || !CONFIG.revenueCatIosKey) return;
  try {
    Purchases.configure({ apiKey: CONFIG.revenueCatIosKey });
    configured = true;
    Purchases.addCustomerInfoUpdateListener(fromInfo);
    fromInfo(await Purchases.getCustomerInfo());
  } catch {
    // Offline or not yet configured: the app keeps working on the free core.
  }
}

export function usePlus(): boolean {
  const [v, setV] = useState(plus);
  useEffect(() => {
    listeners.add(setV);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}

export type LoadedPlan = { pkg?: PurchasesPackage; product?: PurchasesStoreProduct };
export type Offer = Record<PlanId, LoadedPlan>;

export const emptyOffer = (): Offer => ({ yearly: {}, monthly: {}, lifetime: {} });

function sameProduct(identifier: string, productId: string) {
  return identifier === productId || identifier.startsWith(`${productId}:`);
}

function uniquePackages(offerings: PurchasesOfferings): PurchasesPackage[] {
  const lists = Object.values(offerings.all).map((o) => o.availablePackages);
  if (offerings.current) lists.unshift(offerings.current.availablePackages);
  const seen = new Set<string>();
  const out: PurchasesPackage[] = [];
  for (const list of lists) {
    for (const p of list) {
      const key = `${p.product.identifier}:${p.packageType}`;
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(p);
    }
  }
  return out;
}

function pick(pkgs: PurchasesPackage[], productId: string, type: PurchasesPackage['packageType']) {
  return pkgs.find((p) => sameProduct(p.product.identifier, productId)) ?? pkgs.find((p) => p.packageType === type);
}

export function productOf(plan: LoadedPlan | undefined): PurchasesStoreProduct | undefined {
  return plan?.pkg?.product ?? plan?.product;
}

async function attachStoreProducts(offer: Offer) {
  const missingSubs = (['monthly', 'yearly'] as const).filter((id) => !offer[id].pkg);
  if (missingSubs.length) {
    try {
      const products = await Purchases.getProducts(
        missingSubs.map((id) => CONFIG.products[id]),
        Purchases.PRODUCT_CATEGORY.SUBSCRIPTION
      );
      for (const id of missingSubs) {
        offer[id].product = products.find((p) => sameProduct(p.identifier, CONFIG.products[id]));
      }
    } catch {
      // Packages already found on an offering still work.
    }
  }
  if (!offer.lifetime.pkg) {
    try {
      const products = await Purchases.getProducts([CONFIG.products.lifetime], Purchases.PRODUCT_CATEGORY.NON_SUBSCRIPTION);
      offer.lifetime.product = products.find((p) => sameProduct(p.identifier, CONFIG.products.lifetime));
    } catch {
      // Lifetime stays unavailable until the store responds.
    }
  }
}

export async function loadOffer(): Promise<Offer> {
  if (!configured) return emptyOffer();
  try {
    const offerings = await Purchases.getOfferings();
    const pkgs = uniquePackages(offerings);
    const offer: Offer = {
      monthly: { pkg: pick(pkgs, CONFIG.products.monthly, Purchases.PACKAGE_TYPE.MONTHLY) },
      yearly: { pkg: pick(pkgs, CONFIG.products.yearly, Purchases.PACKAGE_TYPE.ANNUAL) },
      lifetime: { pkg: pick(pkgs, CONFIG.products.lifetime, Purchases.PACKAGE_TYPE.LIFETIME) },
    };
    await attachStoreProducts(offer);
    return offer;
  } catch {
    return emptyOffer();
  }
}

function unlocked(info: CustomerInfo) {
  fromInfo(info);
  return Boolean(info.entitlements.active[CONFIG.entitlementId]);
}

/** Returns true when the purchase unlocked Plus. User cancellation returns false. */
export async function buyPlan(plan: LoadedPlan): Promise<boolean> {
  try {
    const result = plan.pkg
      ? await Purchases.purchasePackage(plan.pkg)
      : plan.product
        ? await Purchases.purchaseStoreProduct(plan.product)
        : null;
    if (!result) return false;
    return unlocked(result.customerInfo);
  } catch (e: any) {
    if (e?.userCancelled) return false;
    throw e;
  }
}

export async function restore(): Promise<boolean> {
  if (!configured) return false;
  const info = await Purchases.restorePurchases();
  fromInfo(info);
  return Boolean(info.entitlements.active[CONFIG.entitlementId]);
}
