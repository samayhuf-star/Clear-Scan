import assert from 'node:assert/strict';
import test from 'node:test';
import { ctaLabel, planCopy, selectionDisclosure, trialLength, yearlySavingsPercent } from './offerCopy.ts';

test('a one-week free intro is described as 7 days', () => {
  assert.equal(trialLength({ price: 0, periodNumberOfUnits: 1, periodUnit: 'WEEK' }), '7 days');
  assert.equal(trialLength({ price: 0, periodNumberOfUnits: 7, periodUnit: 'DAY' }), '7 days');
});

test('a paid introductory price is not called a free trial', () => {
  assert.equal(trialLength({ price: 0.99, periodNumberOfUnits: 1, periodUnit: 'MONTH' }), null);
  assert.equal(trialLength(null), null);
});

test('subscriptions disclose the trial until StoreKit says otherwise', () => {
  const yearly = planCopy('yearly', null, '$19.99', '7 days');
  assert.equal(yearly.headline, 'Try 7 days free, then $19.99/year');
  assert.equal(yearly.trial, '7 days');
  assert.match(selectionDisclosure('yearly', yearly), /7 days free/);
  assert.match(selectionDisclosure('yearly', yearly), /\$19\.99 per year/);
  assert.equal(ctaLabel('yearly', yearly), 'Start 7 days free trial');
});

test('a loaded product with no intro offer does not invent a trial', () => {
  const monthly = planCopy('monthly', { priceString: '$2.99', price: 2.99, introPrice: null }, '$2.99', '7 days');
  assert.equal(monthly.trial, null);
  assert.equal(monthly.headline, '$2.99 / month');
  assert.equal(ctaLabel('monthly', monthly), 'Subscribe · $2.99');
});

test('lifetime is a one-time price with no trial', () => {
  const life = planCopy('lifetime', { priceString: '$39.99', price: 39.99, introPrice: null }, '$39.99', null);
  assert.equal(life.headline, '$39.99 one-time');
  assert.equal(life.trial, null);
  assert.match(life.note, /Does not renew/);
  assert.match(selectionDisclosure('lifetime', life), /Does not renew/);
  assert.equal(ctaLabel('lifetime', life), 'Continue · $39.99 one-time');
});

test('yearly savings use the store prices, not a fixed percent', () => {
  assert.equal(yearlySavingsPercent(2.99, 19.99), 44);
  assert.equal(yearlySavingsPercent(undefined, 19.99), null);
});
