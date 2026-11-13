import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, it } from 'node:test';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { freeTrialDays, planPriceText } from '../src/lib/introOffer.ts';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const read = (rel: string) => readFileSync(join(root, rel), 'utf8');

const weekTrial = {
  subscriptionOffers: [
    { type: 'introductory', paymentMode: 'free-trial', period: { unit: 'week', value: 1 }, periodCount: 1 },
  ],
};
const dayTrial = {
  subscriptionOffers: [
    { type: 'introductory', paymentMode: 'free-trial', period: { unit: 'day', value: 7 }, periodCount: 1 },
  ],
};
const paidIntro = {
  subscriptionOffers: [
    { type: 'introductory', paymentMode: 'pay-as-you-go', period: { unit: 'month', value: 1 }, periodCount: 3 },
  ],
};
const legacyIOS = {
  introductoryPricePaymentModeIOS: 'free-trial',
  introductoryPriceSubscriptionPeriodIOS: 'week',
  introductoryPriceNumberOfPeriodsIOS: '1',
};

const IDS = {
  monthly: 'com.samayhuf.clearscan.pro.monthly',
  yearly: 'com.samayhuf.clearscan.pro.yearly',
  lifetime: 'com.samayhuf.clearscan.pro.lifetime',
};

describe('ClearScan Pro 7-day free trial copy', () => {
  it('reads the trial length from the store offer', () => {
    assert.equal(freeTrialDays(weekTrial), 7);
    assert.equal(freeTrialDays(dayTrial), 7);
    assert.equal(freeTrialDays(legacyIOS), 7);
    assert.equal(freeTrialDays(paidIntro), null);
    assert.equal(freeTrialDays({ introductoryPricePaymentModeIOS: 'empty' }), null);
    assert.equal(freeTrialDays({}), null);
    assert.equal(freeTrialDays(null), null);
  });

  it('eligible user with a trial: "Try 7 days free, then <price>/month" (or /year)', () => {
    assert.equal(
      planPriceText({ kind: 'monthly', current: '$2.99 / month', price: '$2.99', trialDays: 7 }),
      'Try 7 days free, then $2.99/month'
    );
    assert.equal(
      planPriceText({ kind: 'yearly', current: '$19.99 / year', price: '19,99 €', trialDays: 7 }),
      'Try 7 days free, then 19,99 €/year'
    );
  });

  it('no trial, not eligible, or missing price: the current copy stays', () => {
    assert.equal(
      planPriceText({ kind: 'monthly', current: '$2.99 / month', price: '$2.99', trialDays: null }),
      '$2.99 / month'
    );
    assert.equal(
      planPriceText({ kind: 'yearly', current: '$19.99 / year', price: '$19.99' }),
      '$19.99 / year'
    );
    assert.equal(
      planPriceText({ kind: 'monthly', current: 'Unavailable from the store', price: null, trialDays: 7 }),
      'Unavailable from the store'
    );
  });

  it('lifetime copy is unchanged even if a trial length is passed by mistake', () => {
    assert.equal(
      planPriceText({ kind: 'lifetime', current: '$39.99 one-time', price: '$39.99', trialDays: 7 }),
      '$39.99 one-time'
    );
  });

  it('trial days are only set when StoreKit says the user is eligible', () => {
    const src = read('src/lib/purchases.ts');
    assert.match(src, /const days = daysFromOffer && \(await introEligible\(item\)\) \? daysFromOffer : null;/);
    assert.match(src, /isEligibleForIntroOfferIOS\(group\)/);
    const fn = src.slice(src.indexOf('async function introEligible'), src.indexOf('export async function initPurchases'));
    assert.match(fn, /catch[\s\S]*return false/);
    assert.match(read('src/app/paywall.tsx'), /planPriceText\(/);
    assert.match(read('src/lib/introOffer.ts'), /plan\.price/);
  });

  it('uses the bundle-id product ids and a StoreKit 7-day intro on monthly and yearly only', () => {
    const cfg = read('src/config.ts');
    assert.match(cfg, new RegExp(IDS.monthly.replace(/\./g, '\\.')));
    assert.match(cfg, new RegExp(IDS.yearly.replace(/\./g, '\\.')));
    assert.match(cfg, new RegExp(IDS.lifetime.replace(/\./g, '\\.')));
    assert.doesNotMatch(cfg, /revenueCat|RevenueCat|react-native-purchases/);
    assert.doesNotMatch(read('src/lib/purchases.ts'), /react-native-purchases|Purchases\.configure|RevenueCat/);

    const sk = JSON.parse(read('storekit/ClearScan.storekit'));
    const subs = sk.subscriptionGroups[0].subscriptions;
    for (const id of [IDS.monthly, IDS.yearly]) {
      const s = subs.find((x: { productID: string }) => x.productID === id);
      assert.ok(s, id);
      assert.deepEqual(
        { mode: s.introductoryOffer.paymentMode, period: s.introductoryOffer.subscriptionPeriod },
        { mode: 'free', period: 'P1W' },
        id
      );
    }
    const lifetime = sk.products.find((x: { productID: string }) => x.productID === IDS.lifetime);
    assert.ok(lifetime);
    assert.equal(lifetime.type, 'NonConsumable');
    assert.equal(lifetime.displayPrice, '39.99');
    assert.equal(lifetime.introductoryOffer, undefined);
    const monthly = subs.find((x: { productID: string; displayPrice: string }) => x.productID === IDS.monthly);
    const yearly = subs.find((x: { productID: string; displayPrice: string }) => x.productID === IDS.yearly);
    assert.equal(monthly.displayPrice, '2.99');
    assert.equal(yearly.displayPrice, '19.99');
  });
});
