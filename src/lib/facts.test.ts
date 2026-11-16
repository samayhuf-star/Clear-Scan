import assert from 'node:assert/strict';
import test from 'node:test';
import { extractFacts, maskValue, redactText, upcomingDeadlines } from './facts.ts';

test('finds an expiry date and labels it as a deadline', () => {
  const f = extractFacts('Passport No: Z1234567\nDate of Expiry: 14/10/2031\nDate of Birth: 02/03/1990');
  const exp = f.find((x) => x.label === 'Expires');
  assert.ok(exp);
  assert.equal(exp.iso, '2031-10-14');
  assert.equal(exp.deadline, true);
  assert.equal(f.find((x) => x.label === 'Born')?.iso, '1990-03-02');
});

test('reads written-out dates and flags due dates', () => {
  const f = extractFacts('Invoice date: Oct 3, 2026\nDue date: 17 November 2026');
  assert.equal(f.find((x) => x.label === 'Due')?.iso, '2026-11-17');
  assert.equal(f.find((x) => x.label === 'Issued')?.iso, '2026-10-03');
});

test('rejects impossible dates', () => {
  assert.equal(extractFacts('Ref 31/02/2026').filter((x) => x.kind === 'date').length, 0);
});

test('picks out totals and amounts', () => {
  const f = extractFacts('Subtotal ₹1,200.00\nTotal ₹1,416.00');
  assert.equal(f.find((x) => x.value === '₹1,416.00')?.label, 'Total');
  assert.equal(f.find((x) => x.value === '₹1,200.00')?.label, 'Amount');
});

test('finds contacts', () => {
  const f = extractFacts('Call +91 99537 10111 or mail help@example.com, see www.example.com.');
  assert.ok(f.some((x) => x.kind === 'email' && x.value === 'help@example.com'));
  assert.ok(f.some((x) => x.kind === 'url' && x.value === 'www.example.com'));
  assert.ok(f.some((x) => x.kind === 'phone'));
});

test('flags a valid card number as sensitive and ignores a failed checksum', () => {
  assert.ok(extractFacts('Card 4111 1111 1111 1111').some((x) => x.label === 'Card number' && x.sensitive));
  assert.ok(!extractFacts('Ref 4111 1111 1111 1112').some((x) => x.label === 'Card number'));
});

test('recognises PAN and Aadhaar shaped numbers', () => {
  const f = extractFacts('PAN ABCDE1234F  Aadhaar 1234 5678 9123');
  assert.ok(f.some((x) => x.label === 'PAN' && x.sensitive));
  assert.ok(f.some((x) => x.label === 'Aadhaar' && x.sensitive));
});

test('masking keeps only the last four characters', () => {
  assert.equal(maskValue('4111 1111 1111 1234'), '•••• •••• •••• 1234');
  assert.equal(maskValue('ABCDE1234F'), '••••••234F');
});

test('share-safe text hides sensitive numbers and leaves the rest', () => {
  const r = redactText('Name: Asha\nPAN ABCDE1234F\nTotal ₹500');
  assert.equal(r.hidden, 1);
  assert.ok(!r.text.includes('ABCDE1234F'));
  assert.ok(r.text.includes('Total ₹500'));
});

test('only future deadlines are upcoming', () => {
  const f = extractFacts('Expires: 01/01/2020\nRenew by 01/01/2030');
  const up = upcomingDeadlines(f, new Date('2026-11-17T00:00:00Z'));
  assert.equal(up.length, 1);
  assert.equal(up[0].iso, '2030-01-01');
});
