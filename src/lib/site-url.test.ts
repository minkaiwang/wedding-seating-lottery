import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeSiteUrl } from './site-url';

test('normalizeSiteUrl keeps only a valid HTTP(S) origin', () => {
  assert.equal(normalizeSiteUrl('https://example.com/path?q=1'), 'https://example.com');
  assert.equal(normalizeSiteUrl('javascript:alert(1)'), 'http://localhost:3000');
  assert.equal(normalizeSiteUrl('not a URL'), 'http://localhost:3000');
});
