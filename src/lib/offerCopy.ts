/** Paywall strings derived from a StoreKit product, with App Store fallbacks. */

export type PlanId = 'weekly';

export type IntroLike = {
  price: number;
  periodNumberOfUnits: number;
  periodUnit: string;
} | null;

export type ProductLike = {
  priceString: string;
  price: number;
  introPrice: IntroLike;
} | null;

const PERIOD: Record<PlanId, { per: string; billed: string }> = {
  weekly: { per: 'week', billed: 'Billed once a week' },
};

/** Free-trial length, e.g. "7 days". Paid intro offers are not described as free. */
export function trialLength(intro: IntroLike): string | null {
  if (!intro || intro.price > 0 || intro.periodNumberOfUnits <= 0) return null;
  if (intro.periodUnit === 'WEEK' && intro.periodNumberOfUnits === 1) return '7 days';
  const units: Record<string, [string, string]> = {
    DAY: ['day', 'days'],
    WEEK: ['week', 'weeks'],
    MONTH: ['month', 'months'],
    YEAR: ['year', 'years'],
  };
  const pair = units[intro.periodUnit] ?? ['day', 'days'];
  const n = intro.periodNumberOfUnits;
  return `${n} ${n === 1 ? pair[0] : pair[1]}`;
}

export type PlanCopy = {
  price: string;
  headline: string;
  note: string;
  trial: string | null;
};

/**
 * When `product` is missing, `fallbackTrial` is the introductory offer configured
 * for that product. Once StoreKit returns a product, only its own intro price is used.
 */
export function planCopy(id: PlanId, product: ProductLike, fallbackPrice: string, fallbackTrial: string | null): PlanCopy {
  const price = product?.priceString || fallbackPrice;
  const trial = product ? trialLength(product.introPrice) : fallbackTrial;
  const { per, billed } = PERIOD[id];
  if (trial) {
    return {
      price,
      headline: `Try ${trial} free, then ${price}/${per}`,
      note: `${billed} after the trial`,
      trial,
    };
  }
  return {
    price,
    headline: `${price} / ${per}`,
    note: 'Cancel any time',
    trial: null,
  };
}

export function ctaLabel(id: PlanId, copy: PlanCopy): string {
  if (copy.trial) return `Start ${copy.trial} free trial`;
  return `Subscribe · ${copy.price}`;
}

/** Price, period, and renewal terms for the plan the button will buy. Shown next to the button. */
export function selectionDisclosure(id: PlanId, copy: PlanCopy): string {
  const per = PERIOD[id].per;
  if (copy.trial) {
    return `${copy.trial} free for new subscribers, then ${copy.price} per ${per}. Renews automatically unless you cancel at least 24 hours before the trial ends.`;
  }
  return `${copy.price} per ${per}. Renews automatically unless you cancel at least 24 hours before the period ends.`;
}
