/**
 * Remove stale build caches that embed bundled strings (e.g. couple names in brand.ts).
 * Run from repo root: `npm run clean:next`
 * Stop `npm run dev` first — deleting `.next` while the dev server runs breaks pages.
 */
import { rmSync } from 'node:fs';

const paths = ['.next', 'log-lottery/dist'];

for (const p of paths) {
  try {
    rmSync(p, { recursive: true, force: true });
    console.log(`Removed ${p}`);
  }
  catch (e) {
    const code = e && typeof e === 'object' && 'code' in e ? e.code : undefined;
    if (code === 'ENOENT') continue;
    throw e;
  }
}
