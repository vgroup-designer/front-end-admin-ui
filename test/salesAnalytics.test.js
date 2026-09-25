import { test } from 'node:test';
import assert from 'node:assert/strict';
import { computeSalesSummary } from '../src/shopify/salesAnalytics.js';

function order(total_price, productTitles) {
  return {
    total_price,
    line_items: productTitles.map((title) => ({ title })),
  };
}

test('sums order count and revenue for the current period', () => {
  const current = [order('50.00', ['Widget']), order('30.00', ['Gadget'])];
  const summary = computeSalesSummary(current, []);

  assert.equal(summary.orderCount, 2);
  assert.equal(summary.totalRevenue, 80);
});

test('computes a positive percentage when revenue increases', () => {
  const current = [order('150.00', ['Widget'])];
  const previous = [order('100.00', ['Widget'])];
  const summary = computeSalesSummary(current, previous);

  assert.equal(summary.percentChangeVsPreviousPeriod, 50);
});

test('ranks the most frequently ordered product first', () => {
  const current = [
    order('10.00', ['Widget']),
    order('10.00', ['Widget']),
    order('10.00', ['Gadget']),
    order('10.00', ['Widget', 'Gizmo']),
  ];
  const summary = computeSalesSummary(current, []);

  assert.equal(summary.topProducts[0].title, 'Widget');
  assert.equal(summary.topProducts[0].orderCount, 3);
});

test('reports null percentage change when the previous period had zero revenue', () => {
  const current = [order('100.00', ['Widget'])];
  const previous = [];
  const summary = computeSalesSummary(current, previous);

  assert.equal(summary.percentChangeVsPreviousPeriod, null);
});
