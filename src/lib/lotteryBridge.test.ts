import assert from 'node:assert/strict';
import test from 'node:test';
import type { Guest, Table } from '@/types';
import {
  LOTTERY_MSG_DONE,
  LOTTERY_MSG_IMPORT,
  LOTTERY_MSG_READY,
  startLotteryImportBridge,
} from './lotteryBridge';

interface FakeChildWindow {
  closed: boolean;
  focus: () => void;
  postMessage: (message: unknown, targetOrigin: string) => void;
}

function installWindowHarness() {
  let messageListener: ((event: MessageEvent) => void) | undefined;
  let intervalCallback: (() => void) | undefined;
  const sent: Array<{ message: unknown; targetOrigin: string }> = [];
  const child: FakeChildWindow = {
    closed: false,
    focus: () => {},
    postMessage: (message, targetOrigin) => sent.push({ message, targetOrigin }),
  };
  const sibling: FakeChildWindow = {
    closed: false,
    focus: () => {},
    postMessage: () => {},
  };
  const fakeWindow = {
    location: { origin: 'http://localhost:3201' },
    open: () => child,
    addEventListener: (type: string, listener: (event: MessageEvent) => void) => {
      if (type === 'message') messageListener = listener;
    },
    removeEventListener: (type: string, listener: (event: MessageEvent) => void) => {
      if (type === 'message' && messageListener === listener) messageListener = undefined;
    },
    setTimeout: () => 1,
    clearTimeout: () => {},
    setInterval: (callback: () => void) => {
      intervalCallback = callback;
      return 2;
    },
    clearInterval: () => {},
  };

  const priorWindow = Object.getOwnPropertyDescriptor(globalThis, 'window');
  Object.defineProperty(globalThis, 'window', {
    configurable: true,
    writable: true,
    value: fakeWindow,
  });

  return {
    child,
    sibling,
    sent,
    dispatch(origin: string, source: FakeChildWindow, data: unknown) {
      messageListener?.({ origin, source, data } as unknown as MessageEvent);
    },
    pollClosed() {
      intervalCallback?.();
    },
    restore() {
      if (priorWindow) Object.defineProperty(globalThis, 'window', priorWindow);
      else delete (globalThis as { window?: unknown }).window;
    },
  };
}

const guests: Guest[] = [{ id: 'guest-1', name: 'Guest One', tags: ['family'], tableId: 'table-1' }];
const tables: Table[] = [{
  id: 'table-1',
  name: 'Table 1',
  type: 'round',
  capacity: 10,
  guests: ['guest-1'],
}];

test('bridge binds READY and DONE to the opened child and protocol order', () => {
  const harness = installWindowHarness();
  const previousUrl = process.env.NEXT_PUBLIC_LOTTERY_IMPORT_URL;
  process.env.NEXT_PUBLIC_LOTTERY_IMPORT_URL = 'http://localhost:6721/log-lottery/config/person/all';
  let done = 0;
  try {
    const cleanup = startLotteryImportBridge(guests, tables, {
      onDone: () => { done += 1; },
      onTimeout: () => assert.fail('unexpected timeout'),
      onPopupBlocked: () => assert.fail('unexpected popup block'),
    });

    harness.dispatch('http://localhost:6721', harness.sibling, { type: LOTTERY_MSG_READY });
    harness.dispatch('http://localhost:6721', harness.child, { type: LOTTERY_MSG_DONE, ok: true });
    harness.dispatch('http://untrusted.test', harness.child, { type: LOTTERY_MSG_READY });
    assert.equal(harness.sent.length, 0);
    assert.equal(done, 0);

    harness.dispatch('http://localhost:6721', harness.child, { type: LOTTERY_MSG_READY });
    assert.equal(harness.sent.length, 1);
    assert.equal(harness.sent[0].targetOrigin, 'http://localhost:6721');
    assert.equal((harness.sent[0].message as { type: string }).type, LOTTERY_MSG_IMPORT);

    harness.dispatch('http://localhost:6721', harness.sibling, { type: LOTTERY_MSG_DONE, ok: true });
    assert.equal(done, 0);
    harness.dispatch('http://localhost:6721', harness.child, { type: LOTTERY_MSG_DONE, ok: true });
    assert.equal(done, 1);
    cleanup();
  }
  finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_LOTTERY_IMPORT_URL;
    else process.env.NEXT_PUBLIC_LOTTERY_IMPORT_URL = previousUrl;
    harness.restore();
  }
});

test('bridge reports a child window closed before completion', () => {
  const harness = installWindowHarness();
  const previousUrl = process.env.NEXT_PUBLIC_LOTTERY_IMPORT_URL;
  process.env.NEXT_PUBLIC_LOTTERY_IMPORT_URL = 'http://localhost:6721/log-lottery/config/person/all';
  let closed = 0;
  try {
    startLotteryImportBridge(guests, tables, {
      onDone: () => assert.fail('unexpected completion'),
      onTimeout: () => assert.fail('unexpected timeout'),
      onPopupBlocked: () => assert.fail('unexpected popup block'),
      onClosedBeforeComplete: () => { closed += 1; },
    });
    harness.child.closed = true;
    harness.pollClosed();
    harness.pollClosed();
    assert.equal(closed, 1);
  }
  finally {
    if (previousUrl === undefined) delete process.env.NEXT_PUBLIC_LOTTERY_IMPORT_URL;
    else process.env.NEXT_PUBLIC_LOTTERY_IMPORT_URL = previousUrl;
    harness.restore();
  }
});
