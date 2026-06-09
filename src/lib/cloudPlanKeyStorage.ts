import { DEFAULT_PLAN_KEY, isValidPlanKey } from '@/lib/planKey';

const LS_KEY = 'wedding-cloud-plan-key';

export function readStoredPlanKey(): string {
  if (typeof window === 'undefined') return DEFAULT_PLAN_KEY;
  try {
    const v = localStorage.getItem(LS_KEY)?.trim();
    if (v && isValidPlanKey(v)) return v;
  } catch {
    /* ignore */
  }
  return DEFAULT_PLAN_KEY;
}

export function writeStoredPlanKey(key: string): boolean {
  const t = key.trim();
  if (!isValidPlanKey(t)) return false;
  try {
    localStorage.setItem(LS_KEY, t);
    return true;
  } catch {
    return false;
  }
}
