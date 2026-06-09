/** Session-only: remind to export JSON; cleared when tab closes. */

export const BACKUP_NAG_SESSION_KEY = 'wedding-backup-nag';
export const BACKUP_ACK_EVENT = 'wedding-backup-ack';

export type BackupNagValue = 'done' | 'dismiss';

export function acknowledgeBackupExport(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(BACKUP_NAG_SESSION_KEY, 'done');
  window.dispatchEvent(new CustomEvent(BACKUP_ACK_EVENT));
}

export function dismissBackupBanner(): void {
  if (typeof window === 'undefined') return;
  sessionStorage.setItem(BACKUP_NAG_SESSION_KEY, 'dismiss');
  window.dispatchEvent(new CustomEvent(BACKUP_ACK_EVENT));
}

export function readBackupNagState(): BackupNagValue | null {
  if (typeof window === 'undefined') return null;
  const v = sessionStorage.getItem(BACKUP_NAG_SESSION_KEY);
  if (v === 'done' || v === 'dismiss') return v;
  return null;
}

export function shouldShowBackupBanner(guestCount: number): boolean {
  if (typeof window === 'undefined' || guestCount === 0) return false;
  const v = readBackupNagState();
  return v !== 'done' && v !== 'dismiss';
}
