import assert from 'node:assert/strict';
import test from 'node:test';
import { ctaLabel, planCopy, selectionDisclosure, trialLength } from './offerCopy.ts';

test('a one-week free intro is described as 7 days', () => {
  assert.equal(trialLength({ price: 0, periodNumberOfUnits: 1, periodUnit: 'WEEK' }), '7 days');
  assert.equal(trialLength({ price: 0, periodNumberOfUnits: 7, periodUnit: 'DAY' }), '7 days');
});

test('a paid introductory price is not called a free trial', () => {
  assert.equal(trialLength({ price: 0.99, periodNumberOfUnits: 1, periodUnit: 'MONTH' }), null);
  assert.equal(trialLength(null), null);
});

test('the weekly plan discloses the 7-day trial and weekly price until StoreKit says otherwise', () => {
  const weekly = planCopy('weekly', null, '$1.99', '7 days');
  assert.equal(weekly.headline, 'Try 7 days free, then $1.99/week');
  assert.equal(weekly.trial, '7 days');
  assert.match(selectionDisclosure('weekly', weekly), /7 days free/);
  assert.match(selectionDisclosure('weekly', weekly), /\$1\.99 per week/);
  assert.equal(ctaLabel('weekly', weekly), 'Start 7 days free trial');
});

test('a loaded product with no intro offer does not invent a trial', () => {
  const weekly = planCopy('weekly', { priceString: '$1.99', price: 1.99, introPrice: null }, '$1.99', '7 days');
  assert.equal(weekly.trial, null);
  assert.equal(weekly.headline, '$1.99 / week');
  assert.equal(ctaLabel('weekly', weekly), 'Subscribe · $1.99');
});
