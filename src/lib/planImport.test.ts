import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSeatingPlan, PLAN_LIMITS } from './planImport';

const validPlan = {
  guests: [{ id: 'g1', name: 'Guest', tags: ['family'], tableId: 't1' }],
  tables: [{ id: 't1', name: 'Table 1', type: 'round', capacity: 10, guests: ['g1'] }],
  lastUpdated: '2026-01-01T00:00:00.000Z',
};

test('normalizeSeatingPlan accepts a valid exported plan', () => {
  assert.deepEqual(normalizeSeatingPlan(validPlan), {
    ...validPlan,
    tables: [{ ...validPlan.tables[0], position: undefined }],
  });
});

test('normalizeSeatingPlan rejects duplicate and dangling identifiers', () => {
  assert.equal(
    normalizeSeatingPlan({ ...validPlan, guests: [validPlan.guests[0], validPlan.guests[0]] }),
    null,
  );
  assert.equal(
    normalizeSeatingPlan({
      ...validPlan,
      tables: [{ ...validPlan.tables[0], guests: ['missing'] }],
    }),
    null,
  );
});

test('normalizeSeatingPlan repairs one-sided assignments and rejects conflicts', () => {
  const fromGuest = normalizeSeatingPlan({
    ...validPlan,
    tables: [{ ...validPlan.tables[0], guests: [] }],
  });
  assert.deepEqual(fromGuest?.tables[0].guests, ['g1']);

  const fromTable = normalizeSeatingPlan({
    ...validPlan,
    guests: [{ ...validPlan.guests[0], tableId: undefined }],
  });
  assert.equal(fromTable?.guests[0].tableId, 't1');

  assert.equal(
    normalizeSeatingPlan({
      guests: [{ ...validPlan.guests[0], tableId: 't2' }],
      tables: [
        validPlan.tables[0],
        { id: 't2', name: 'Table 2', type: 'round', capacity: 10, guests: [] },
      ],
    }),
    null,
  );
});

test('normalizeSeatingPlan rejects unbounded or non-finite values', () => {
  assert.equal(
    normalizeSeatingPlan({
      ...validPlan,
      guests: Array.from({ length: PLAN_LIMITS.maxGuests + 1 }, (_, index) => ({
        id: `g${index}`,
        name: 'Guest',
        tags: [],
      })),
    }),
    null,
  );
  assert.equal(
    normalizeSeatingPlan({
      ...validPlan,
      tables: [{ ...validPlan.tables[0], position: { x: Number.POSITIVE_INFINITY, y: 0 } }],
    }),
    null,
  );
});
