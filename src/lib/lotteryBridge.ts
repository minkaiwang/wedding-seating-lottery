import type { Guest, Table } from '@/types';
import { buildLotteryPersonRows } from '@/lib/storage-core';

export const LOTTERY_MSG_READY = 'LOG_LOTTERY_IMPORT_BRIDGE_READY';
export const LOTTERY_MSG_IMPORT = 'WEDDING_SEATING_IMPORT';
export const LOTTERY_MSG_DONE = 'WEDDING_SEATING_IMPORT_DONE';

/** Full URL to log-lottery “人员名单” page (no query). */
export function getLotteryImportPageUrl(): string {
  return process.env.NEXT_PUBLIC_LOTTERY_IMPORT_URL ?? 'http://localhost:6719/log-lottery/config/person/all';
}

export function getLotteryPostMessageTargetOrigin(): string {
  try {
    return new URL(getLotteryImportPageUrl()).origin;
  } catch {
    return 'http://localhost:6719';
  }
}

/**
 * Opens log-lottery in a new window and sends the guest list when the app signals readiness.
 * Do not use noopener so the child can use window.opener for the handshake.
 */
export function startLotteryImportBridge(
  guests: Guest[],
  tables: Table[],
  options: {
    onDone: () => void;
    onTimeout: () => void;
    onPopupBlocked: () => void;
    /** Child posted `WEDDING_SEATING_IMPORT_DONE` with `ok: false` (e.g. no valid names). */
    onImportRejected?: () => void;
    /** User closed the lottery window before import finished. */
    onClosedBeforeComplete?: () => void;
    /** Re-read guests/tables when child signals READY (avoids stale snapshot if user edits while popup loads). */
    getSnapshot?: () => { guests: Guest[]; tables: Table[] };
    timeoutMs?: number;
  },
): () => void {
  if (typeof window === 'undefined') {
    return () => {};
  }

  const lotteryOrigin = getLotteryPostMessageTargetOrigin();
  const page = getLotteryImportPageUrl();
  const sep = page.includes('?') ? '&' : '?';
  const from = encodeURIComponent(window.location.origin);
  const url = `${page}${sep}bridge=1&from=${from}`;

  const child = window.open(url, 'WeddingLotteryBridge', 'width=1100,height=800');

  if (!child || child.closed) {
    options.onPopupBlocked();
    return () => {};
  }

  try {
    child.focus();
  } catch {
    /* ignore — some environments restrict focus on new windows */
  }

  const persons = buildLotteryPersonRows(guests, tables);
  let sent = false;
  let completed = false;
  const timeoutMs = options.timeoutMs ?? 25000;
  /** DOM timer ids are `number`; Node ambient types use `Timeout` — keep `number` in this browser-only path. */
  let closePoll: number | null = null;
  let timeoutId: number | undefined;

  function buildPersonsForImport() {
    if (options.getSnapshot) {
      const snap = options.getSnapshot();
      return buildLotteryPersonRows(snap.guests, snap.tables);
    }
    return persons;
  }

  function onMessage(e: MessageEvent) {
    if (completed) return;
    if (e.origin !== lotteryOrigin) return;

    if (e.data?.type === LOTTERY_MSG_READY && !sent && child && !child.closed) {
      sent = true;
      child.postMessage({ type: LOTTERY_MSG_IMPORT, persons: buildPersonsForImport() }, lotteryOrigin);
      return;
    }

    if (e.data?.type === LOTTERY_MSG_DONE) {
      finish();
      if (e.data?.ok) {
        options.onDone();
      }
      else {
        options.onImportRejected?.();
      }
    }
  }

  function finish(): void {
    if (completed) return;
    completed = true;
    if (timeoutId !== undefined) {
      window.clearTimeout(timeoutId);
      timeoutId = undefined;
    }
    if (closePoll !== null) {
      window.clearInterval(closePoll);
      closePoll = null;
    }
    window.removeEventListener('message', onMessage);
  }

  timeoutId = window.setTimeout(() => {
    if (completed) return;
    finish();
    options.onTimeout();
  }, timeoutMs);

  closePoll = window.setInterval(() => {
    if (completed) return;
    if (child.closed) {
      finish();
      options.onClosedBeforeComplete?.();
    }
  }, 400);

  window.addEventListener('message', onMessage);

  return () => {
    finish();
  };
}
