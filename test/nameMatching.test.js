import { test } from 'node:test';
import assert from 'node:assert/strict';
import { matchByName, NameMatchError } from '../src/shopify/nameMatching.js';

const byName = (item) => item.name;

test('returns the single exact match', () => {
  const items = [{ name: 'Warehouse' }, { name: 'Warehouse Annex' }];
  assert.equal(matchByName(items, 'Warehouse', byName), items[0]);
});

test('falls back to a case-insensitive substring match when there is no exact match', () => {
  const items = [{ name: 'Downtown Retail Store' }, { name: 'Airport Kiosk' }];
  assert.equal(matchByName(items, 'retail', byName), items[0]);
});

test('prefers the exact match over a substring match', () => {
  const items = [{ name: 'Store' }, { name: 'Downtown Store' }];
  assert.equal(matchByName(items, 'Store', byName), items[0]);
});

test('throws when there are multiple exact matches', () => {
  const items = [{ name: 'Store' }, { name: 'Store' }];
  assert.throws(() => matchByName(items, 'Store', byName), NameMatchError);
});

test('throws when there are multiple substring matches', () => {
  const items = [{ name: 'North Store' }, { name: 'South Store' }];
  assert.throws(() => matchByName(items, 'store', byName), NameMatchError);
});

test('throws when there is no match at all', () => {
  const items = [{ name: 'Warehouse' }];
  assert.throws(() => matchByName(items, 'Kiosk', byName), NameMatchError);
});

test('throws instead of guessing on an empty list', () => {
  assert.throws(() => matchByName([], 'Anything', byName), NameMatchError);
});
