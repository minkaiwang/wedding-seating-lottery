import assert from 'node:assert/strict';
import test from 'node:test';
import { readJsonBodyWithLimit } from './readJsonBody';

test('readJsonBodyWithLimit parses a body inside the byte limit', async () => {
  const result = await readJsonBodyWithLimit(
    new Request('https://example.test/api', { method: 'POST', body: JSON.stringify({ ok: true }) }),
    100,
  );
  assert.deepEqual(result, { ok: true, value: { ok: true } });
});

test('readJsonBodyWithLimit rejects content-length and streamed overflow', async () => {
  const declared = await readJsonBodyWithLimit(
    new Request('https://example.test/api', {
      method: 'POST',
      headers: { 'content-length': '101' },
      body: '{}',
    }),
    100,
  );
  assert.equal(declared.ok, false);
  if (!declared.ok) assert.equal(declared.status, 413);

  const streamed = await readJsonBodyWithLimit(
    new Request('https://example.test/api', { method: 'POST', body: '中文' }),
    5,
  );
  assert.equal(streamed.ok, false);
  if (!streamed.ok) assert.equal(streamed.status, 413);
});

test('readJsonBodyWithLimit rejects malformed JSON', async () => {
  const result = await readJsonBodyWithLimit(
    new Request('https://example.test/api', { method: 'POST', body: '{' }),
    100,
  );
  assert.deepEqual(result, { ok: false, status: 400, error: 'Invalid JSON' });
});
