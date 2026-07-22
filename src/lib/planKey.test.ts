import assert from 'node:assert/strict';
import test from 'node:test';
import { DEFAULT_PLAN_KEY, getPlanKeyFromRequest, isValidPlanKey } from './planKey';

test('plan keys accept the documented safe alphabet', () => {
  assert.equal(isValidPlanKey('wedding_2026-main'), true);
  assert.equal(isValidPlanKey('../other'), false);
  assert.equal(isValidPlanKey('x'.repeat(65)), false);
});

test('missing planKey stays backward compatible and invalid keys are rejected', () => {
  assert.equal(getPlanKeyFromRequest(new Request('https://example.test/api/plan')), DEFAULT_PLAN_KEY);
  assert.equal(
    getPlanKeyFromRequest(new Request('https://example.test/api/plan?planKey=%2E%2E%2Fsecret')),
    null,
  );
});
