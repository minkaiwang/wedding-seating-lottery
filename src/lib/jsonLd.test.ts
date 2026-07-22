import assert from 'node:assert/strict';
import test from 'node:test';
import { serializeJsonLd } from './jsonLd';

test('serializeJsonLd cannot close the containing script element', () => {
  const serialized = serializeJsonLd({ value: '</script><script>alert(1)</script>' });
  assert.equal(serialized.includes('<'), false);
  assert.deepEqual(JSON.parse(serialized), { value: '</script><script>alert(1)</script>' });
});
