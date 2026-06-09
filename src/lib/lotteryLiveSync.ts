import type { Guest, Table } from '@/types';
import { buildLotteryPersonRows } from '@/lib/storage-core';
import { getLotteryImportPageUrl, getLotteryPostMessageTargetOrigin } from '@/lib/lotteryBridge';

/** 与抽奖端 `weddingSeatingLiveSync.ts` 一致 */
export const LOTTERY_MSG_LIVE_SYNC = 'WEDDING_SEATING_SYNC';

const STORAGE_KEY = 'weddingSeats:lotteryLiveSync';

/** Trailing debounce + max wait so rapid edits (e.g. drag) still sync within a bounded delay. */
const LIVE_SYNC_WAIT_MS = 800;
const LIVE_SYNC_MAX_WAIT_MS = 2800;

/** 隐藏 iframe 内嵌抽奖页的 contentWindow；无需弹窗 */
let syncTargetWindow: Window | null = null;

/** Monotonic id per tab so the lottery iframe can ignore stale / reordered postMessages. */
let liveSyncSeq = 0;

export function readLotteryLiveSyncEnabled(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function writeLotteryLiveSyncEnabled(value: boolean): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

export function buildLotteryLiveSyncUrl(): string {
  const page = getLotteryImportPageUrl();
  const sep = page.includes('?') ? '&' : '?';
  const from = encodeURIComponent(
    typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000',
  );
  return `${page}${sep}liveSync=1&from=${from}&embed=1`;
}

export function registerLotteryLiveSyncTarget(win: Window | null): void {
  syncTargetWindow = win;
}

export function unregisterLotteryLiveSyncTarget(): void {
  syncTargetWindow = null;
}

/**
 * 向隐藏 iframe 内的抽奖页推送当前名单（合并同步，保留抽奖端删除与中奖项）。
 * 附带单调递增的 `seq`，供 iframe 侧忽略乱序或重复的 postMessage。
 * `guestCount` 与 `persons.length` 一致（有效姓名行）。`plannerGuestTotal` 为座位规划里宾客条数（含被过滤的空白名）。
 * `tableCount` 为餐桌数量。`sentAt` 为发送端 `Date.now()`，供 iframe 估算投递延迟（仅调试）。
 */
export function postLotteryLiveSync(guests: Guest[], tables: Table[]): void {
  if (typeof window === 'undefined' || !syncTargetWindow) return;
  try {
    if (syncTargetWindow.closed) {
      unregisterLotteryLiveSyncTarget();
      return;
    }
  } catch {
    /* cross-origin or restricted Window — still attempt postMessage below */
  }
  const targetOrigin = getLotteryPostMessageTargetOrigin();
  const persons = buildLotteryPersonRows(guests, tables);
  const seq = ++liveSyncSeq;
  const guestCount = persons.length;
  const plannerGuestTotal = guests.length;
  const tableCount = tables.length;
  const sentAt = Date.now();
  try {
    syncTargetWindow.postMessage(
      {
        type: LOTTERY_MSG_LIVE_SYNC,
        persons,
        seq,
        guestCount,
        plannerGuestTotal,
        tableCount,
        sentAt,
      },
      targetOrigin,
    );
  } catch {
    unregisterLotteryLiveSyncTarget();
  }
}

/**
 * Coalesces rapid `schedule()` calls: fires after idle `LIVE_SYNC_WAIT_MS`, or at latest
 * `LIVE_SYNC_MAX_WAIT_MS` after the first pending call in a burst. Uses refs via `getGuestsAndTables`.
 */
export function createLotteryLiveSyncScheduler(getGuestsAndTables: () => { guests: Guest[]; tables: Table[] }) {
  /** DOM timer ids are `number`; Node ambient types use `Timeout` — keep `number` in this client-only path. */
  let waitTimer: number | null = null;
  let maxTimer: number | null = null;

  function clearTimers(): void {
    if (waitTimer !== null) {
      window.clearTimeout(waitTimer);
      waitTimer = null;
    }
    if (maxTimer !== null) {
      window.clearTimeout(maxTimer);
      maxTimer = null;
    }
  }

  function flush(): void {
    clearTimers();
    const { guests, tables } = getGuestsAndTables();
    postLotteryLiveSync(guests, tables);
  }

  return {
    schedule(): void {
      if (waitTimer !== null) window.clearTimeout(waitTimer);
      waitTimer = window.setTimeout(flush, LIVE_SYNC_WAIT_MS);

      if (maxTimer === null) {
        maxTimer = window.setTimeout(flush, LIVE_SYNC_MAX_WAIT_MS);
      }
    },
    cancel(): void {
      clearTimers();
    },
  };
}
