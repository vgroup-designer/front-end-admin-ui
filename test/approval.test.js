import { test } from 'node:test';
import assert from 'node:assert/strict';
import { requireApproval } from '../src/approval.js';

test('allows an admin who has confirmed', () => {
  assert.deepEqual(requireApproval({ role: 'admin', confirmed: true }), { allowed: true });
});

test('allows staff who have confirmed', () => {
  assert.deepEqual(requireApproval({ role: 'staff', confirmed: true }), { allowed: true });
});

test('rejects a shopper regardless of confirmation', () => {
  const result = requireApproval({ role: 'shopper', confirmed: true });
  assert.equal(result.allowed, false);
});

test('rejects an admin who has not confirmed', () => {
  const result = requireApproval({ role: 'admin', confirmed: false });
  assert.equal(result.allowed, false);
});

test('rejects when both role and confirmation are missing', () => {
  const result = requireApproval({ role: 'shopper', confirmed: false });
  assert.equal(result.allowed, false);
});
