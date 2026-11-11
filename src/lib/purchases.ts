import { useEffect, useState } from 'react';
import { Platform } from 'react-native';
import Purchases, { type CustomerInfo, type PurchasesPackage } from 'react-native-purchases';
import { CONFIG } from '../config';
import { initRevenueCat } from './revenuecat';

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
  if (configured || Platform.OS !== 'ios') return;
  // Shared RevenueCat setup: SDK config, attribution, subscriber attributes, trusted entitlements.
  const ok = await initRevenueCat({ entitlementId: CONFIG.entitlementId, iosKey: CONFIG.revenueCatIosKey });
  if (!ok) return; // no key in this build, or offline: the app keeps working on the free core
  configured = true;
  Purchases.addCustomerInfoUpdateListener(fromInfo);
  try {
    fromInfo(await Purchases.getCustomerInfo());
  } catch {
    // keep free-core behaviour until the next customer-info update
  }
}

export function usePlus(): boolean {
  const [v, setV] = useState(plus);
  useEffect(() => {
    listeners.add(setV);
    setV(plus);
    return () => {
      listeners.delete(setV);
    };
  }, []);
  return v;
}

export type Offer = { monthly?: PurchasesPackage; yearly?: PurchasesPackage };

export async function loadOffer(): Promise<Offer> {
  if (!configured) return {};
  try {
    const offerings = await Purchases.getOfferings();
    const pkgs = offerings.current?.availablePackages ?? [];
    return {
      monthly: pkgs.find((p) => p.packageType === 'MONTHLY'),
      yearly: pkgs.find((p) => p.packageType === 'ANNUAL'),
    };
  } catch {
    return {};
  }
}

/** Returns true when the purchase made the user a Plus member. User cancellation returns false. */
export async function buy(pkg: PurchasesPackage): Promise<boolean> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    fromInfo(customerInfo);
    return Boolean(customerInfo.entitlements.active[CONFIG.entitlementId]);
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
