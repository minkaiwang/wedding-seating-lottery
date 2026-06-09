/** Shared cloud plan namespace (multi-device / multi-event). Stored row id in CloudPlan. */

export const DEFAULT_PLAN_KEY = 'singleton';

/** Letters, digits, underscore, hyphen; 1–64 chars. */
export const PLAN_KEY_PATTERN = /^[a-zA-Z0-9_-]{1,64}$/;

export function isValidPlanKey(key: string): boolean {
  return PLAN_KEY_PATTERN.test(key.trim());
}

/** Reads planKey from request URL; missing or empty → default (backward compatible). */
export function getPlanKeyFromRequest(req: Request): string | null {
  const url = new URL(req.url);
  const q = url.searchParams.get('planKey');
  const raw = q == null || q.trim() === '' ? DEFAULT_PLAN_KEY : q.trim();
  if (!isValidPlanKey(raw)) return null;
  return raw;
}
