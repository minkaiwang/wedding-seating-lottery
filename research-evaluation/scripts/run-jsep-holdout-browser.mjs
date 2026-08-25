import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { cpus, release, totalmem } from 'node:os';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { checkWeddingSeatingHandoff } from '../../log-lottery/src/utils/weddingSeatingContractAdapter.ts';

const evaluationDir = dirname(dirname(fileURLToPath(import.meta.url)));
const root = dirname(evaluationDir);
const lotteryDir = join(root, 'log-lottery');
const defaultManifestPath = join(evaluationDir, 'jsep', 'holdout-mutants.json');
const launchers = { chromium, firefox, webkit };
const publicFields = ['name', 'department', 'identity', 'avatar'];

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index++) {
    const token = argv[index];
    if (!token.startsWith('--'))
      throw new Error(`Unexpected positional argument: ${token}`);
    const key = token.slice(2);
    const value = argv[index + 1];
    if (value === undefined || value.startsWith('--'))
      throw new Error(`Missing value for --${key}`);
    parsed[key] = value;
    index++;
  }
  return parsed;
}

function csvCell(value) {
  if (value === null || value === undefined)
    return '';
  const text = typeof value === 'object' ? JSON.stringify(value) : String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function writeAtomic(path, content) {
  mkdirSync(dirname(path), { recursive: true });
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, content);
  renameSync(temporaryPath, path);
}

function stableValue(value) {
  if (value === undefined)
    return 'undefined';
  if (value === null || typeof value !== 'object')
    return JSON.stringify(value);
  if (Array.isArray(value))
    return `[${value.map(stableValue).join(',')}]`;
  return `{${Object.entries(value)
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`)
    .join(',')}}`;
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function fileSha256(path) {
  return existsSync(path) ? sha256(readFileSync(path)) : null;
}

function normalizeScalar(value) {
  if (typeof value === 'string')
    return value.normalize('NFC').trim();
  if (typeof value === 'number' && Number.isFinite(value))
    return String(value);
  if (typeof value === 'boolean')
    return String(value);
  return '';
}

function normalizeArray(value) {
  return Array.isArray(value) ? value.map(item => normalizeScalar(item)) : [];
}

function semanticIdentity(row) {
  return normalizeScalar(row?.plannerGuestId);
}

function publicProjection(row) {
  return Object.fromEntries(publicFields.map(field => [field, normalizeScalar(row?.[field])]));
}

function ownedProjection(row, includeInstanceId = true) {
  return {
    ...(includeInstanceId ? { id: normalizeScalar(row?.id) } : {}),
    isWin: row?.isWin === true,
    prizeName: normalizeArray(row?.prizeName),
    prizeId: normalizeArray(row?.prizeId),
    prizeTime: normalizeArray(row?.prizeTime),
  };
}

function indexRows(rows) {
  const byIdentity = new Map();
  const duplicateIdentities = new Set();
  let missingIdentityCount = 0;
  for (const row of rows) {
    const identity = semanticIdentity(row);
    if (!identity) {
      missingIdentityCount++;
      continue;
    }
    if (byIdentity.has(identity))
      duplicateIdentities.add(identity);
    byIdentity.set(identity, row);
  }
  return { byIdentity, duplicateIdentities, missingIdentityCount };
}

function stateSummary(state) {
  const all = Array.isArray(state?.allPersonList) ? state.allPersonList : [];
  const completed = Array.isArray(state?.alreadyPersonList) ? state.alreadyPersonList : [];
  const index = indexRows(all);
  const semanticRows = all.map((row, rowIndex) => ({
    identity: semanticIdentity(row) || `__missing_${rowIndex}`,
    public: publicProjection(row),
    owned: ownedProjection(row, false),
  })).sort((left, right) => left.identity.localeCompare(right.identity));
  const publicRows = semanticRows.map(row => ({ identity: row.identity, public: row.public }));
  const ownedRows = semanticRows.map(row => ({ identity: row.identity, owned: row.owned }));
  const completedIdentities = completed.map(semanticIdentity).filter(Boolean).sort();
  return {
    all_count: all.length,
    completed_count: completed.length,
    stable_identity_count: index.byIdentity.size,
    missing_stable_identity_count: index.missingIdentityCount,
    duplicate_stable_identity_count: index.duplicateIdentities.size,
    public_digest_sha256: sha256(stableValue(publicRows)),
    owned_digest_sha256: sha256(stableValue(ownedRows)),
    semantic_state_digest_sha256: sha256(stableValue(semanticRows)),
    completed_identity_digest_sha256: sha256(stableValue(completedIdentities)),
    first_stable_id_examples: [...index.byIdentity.keys()].sort().slice(0, 3),
  };
}

function sourceSummary(rows) {
  const source = Array.isArray(rows) ? rows : [];
  const index = indexRows(source);
  const projected = source.map((row, rowIndex) => ({
    identity: semanticIdentity(row) || `__missing_${rowIndex}`,
    public: publicProjection(row),
  })).sort((left, right) => left.identity.localeCompare(right.identity));
  return {
    count: source.length,
    stable_identity_count: index.byIdentity.size,
    missing_stable_identity_count: index.missingIdentityCount,
    duplicate_stable_identity_count: index.duplicateIdentities.size,
    semantic_public_digest_sha256: sha256(stableValue(projected)),
  };
}

/** Independent keyed durable-post-state baseline. This function does not call O2 code. */
function evaluateIndependentBState({ expectedRows, beforeState, afterState, preserveOwned }) {
  const failures = [];
  const expectedIndex = indexRows(expectedRows);
  const beforeIndex = indexRows(beforeState.allPersonList ?? []);
  const afterIndex = indexRows(afterState.allPersonList ?? []);

  if (expectedIndex.missingIdentityCount > 0)
    failures.push({ code: 'B_EXPECTED_IDENTITY_MISSING', count: expectedIndex.missingIdentityCount });
  if (afterIndex.missingIdentityCount > 0)
    failures.push({ code: 'B_DESTINATION_IDENTITY_MISSING', count: afterIndex.missingIdentityCount });
  if (afterIndex.duplicateIdentities.size > 0)
    failures.push({ code: 'B_DUPLICATE_DESTINATION_IDENTITY', count: afterIndex.duplicateIdentities.size });
  if ((afterState.allPersonList ?? []).length !== expectedIndex.byIdentity.size) {
    failures.push({
      code: 'B_COUNT_MISMATCH',
      expected: expectedIndex.byIdentity.size,
      observed: (afterState.allPersonList ?? []).length,
    });
  }

  for (const [identity, expected] of expectedIndex.byIdentity) {
    const observed = afterIndex.byIdentity.get(identity);
    if (!observed) {
      failures.push({ code: 'B_IDENTITY_MISSING', identity });
      continue;
    }
    if (stableValue(publicProjection(expected)) !== stableValue(publicProjection(observed)))
      failures.push({ code: 'B_PUBLIC_STATE_MISMATCH', identity });
    if (preserveOwned) {
      const before = beforeIndex.byIdentity.get(identity);
      if (before && stableValue(ownedProjection(before, true)) !== stableValue(ownedProjection(observed, true)))
        failures.push({ code: 'B_DESTINATION_OWNED_STATE_CHANGED', identity });
    }
  }
  for (const identity of afterIndex.byIdentity.keys()) {
    if (!expectedIndex.byIdentity.has(identity))
      failures.push({ code: 'B_UNEXPECTED_IDENTITY', identity });
  }

  return {
    passed: failures.length === 0,
    failure_codes: [...new Set(failures.map(item => item.code))],
    failures: failures.slice(0, 20),
  };
}

function makePlan(size) {
  const tableCount = Math.max(1, Math.ceil(size / 10));
  const tables = Array.from({ length: tableCount }, (_, index) => ({
    id: `table-${String(index + 1).padStart(3, '0')}`,
    name: `Table ${String(index + 1).padStart(3, '0')}`,
    type: 'round',
    capacity: 10,
    guests: [],
  }));
  const guests = Array.from({ length: size }, (_, index) => {
    const table = tables[index % tableCount];
    const guest = {
      id: `guest-${String(index + 1).padStart(5, '0')}`,
      name: `Synthetic Guest ${String(index + 1).padStart(5, '0')}`,
      tags: [`group-${index % 5}`],
      tableId: table.id,
    };
    table.guests.push(guest.id);
    return guest;
  });
  return { guests, tables, lastUpdated: '2026-08-26T00:00:00.000Z' };
}

function intendedRows(plan, flavor = 'base') {
  const tableNames = new Map(plan.tables.map(table => [table.id, table.name]));
  return plan.guests.map((guest, index) => {
    const baseDepartment = tableNames.get(guest.tableId) ?? '';
    if (flavor === 'avatar-old') {
      return {
        uid: index + 1,
        plannerGuestId: guest.id,
        name: guest.name,
        department: baseDepartment,
        identity: guest.tags.join(', '),
        avatar: `holdout://avatar/old/${guest.id}`,
      };
    }
    if (flavor === 'avatar-new') {
      return {
        uid: index + 1,
        plannerGuestId: guest.id,
        name: guest.name,
        department: baseDepartment,
        identity: guest.tags.join(', '),
        avatar: `holdout://avatar/new/${guest.id}`,
      };
    }
    if (flavor === 'durable-update') {
      return {
        uid: index + 1,
        plannerGuestId: guest.id,
        name: guest.name,
        department: `${baseDepartment} updated`,
        identity: `${guest.tags.join(', ')}, durable-update`,
        avatar: `holdout://avatar/durable/${guest.id}`,
      };
    }
    return {
      uid: index + 1,
      plannerGuestId: guest.id,
      name: guest.name,
      department: baseDepartment,
      identity: guest.tags.join(', '),
      avatar: '',
    };
  });
}

function startServer(name, executable, args, cwd, env) {
  const lines = [];
  const child = spawn(executable, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  const capture = chunk => {
    lines.push(...String(chunk).split(/\r?\n/).filter(Boolean));
    if (lines.length > 100)
      lines.splice(0, lines.length - 100);
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  child.on('error', error => capture(`${name}: ${error.message}`));
  return { name, child, lines };
}

async function assertOriginUnused(url) {
  try {
    await fetch(url, { signal: AbortSignal.timeout(750) });
  }
  catch {
    return;
  }
  throw new Error(`Evaluation origin is already serving content: ${url}`);
}

async function waitForHttp(url, server, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    if (server.child.exitCode !== null)
      throw new Error(`${server.name} exited with ${server.child.exitCode}:\n${server.lines.join('\n')}`);
    try {
      const response = await fetch(url);
      if (response.ok)
        return;
      lastError = new Error(`HTTP ${response.status}`);
    }
    catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 350));
  }
  throw new Error(`${server.name} did not become ready at ${url}: ${lastError?.message ?? 'timeout'}`);
}

async function stopServer(server) {
  if (!server || server.child.exitCode !== null)
    return;
  server.child.kill();
  await Promise.race([
    new Promise(resolvePromise => server.child.once('exit', resolvePromise)),
    new Promise(resolvePromise => setTimeout(resolvePromise, 3_000)),
  ]);
}

async function readIndexedDbState(frame) {
  return frame.evaluate(() => new Promise((resolvePromise, reject) => {
    const open = indexedDB.open('person');
    open.onerror = () => reject(open.error ?? new Error('Unable to open person database'));
    open.onsuccess = () => {
      const db = open.result;
      const storeNames = ['allPersonList', 'alreadyPersonList']
        .filter(name => db.objectStoreNames.contains(name));
      if (storeNames.length === 0) {
        db.close();
        resolvePromise({ allPersonList: [], alreadyPersonList: [] });
        return;
      }
      const transaction = db.transaction(storeNames, 'readonly');
      const result = { allPersonList: [], alreadyPersonList: [] };
      let pending = storeNames.length;
      for (const name of storeNames) {
        const request = transaction.objectStore(name).getAll();
        request.onerror = () => reject(request.error ?? new Error(`Unable to read ${name}`));
        request.onsuccess = () => {
          result[name] = request.result;
          pending--;
          if (pending === 0) {
            db.close();
            resolvePromise(result);
          }
        };
      }
    };
  }));
}

async function waitForIndexedDbCount(frame, expectedCount, timeoutMs = 20_000) {
  const deadline = Date.now() + timeoutMs;
  let state = { allPersonList: [], alreadyPersonList: [] };
  while (Date.now() < deadline) {
    state = await readIndexedDbState(frame);
    if (state.allPersonList.length === expectedCount)
      return state;
    await frame.waitForTimeout(100);
  }
  return state;
}

async function replaceIndexedDbScenarioState(frame, allPersonList, alreadyPersonList = []) {
  await frame.evaluate(({ allRows, completedRows }) => new Promise((resolvePromise, reject) => {
    const open = indexedDB.open('person');
    open.onerror = () => reject(open.error ?? new Error('Unable to open person database for scenario seeding'));
    open.onsuccess = () => {
      const db = open.result;
      const stores = ['allPersonList', 'alreadyPersonList'];
      if (stores.some(name => !db.objectStoreNames.contains(name))) {
        db.close();
        reject(new Error('Person database stores are unavailable for scenario seeding'));
        return;
      }
      const transaction = db.transaction(stores, 'readwrite');
      transaction.oncomplete = () => {
        db.close();
        resolvePromise();
      };
      transaction.onerror = () => reject(transaction.error ?? new Error('Scenario seed transaction failed'));
      transaction.onabort = () => reject(transaction.error ?? new Error('Scenario seed transaction aborted'));
      const dataSets = { allPersonList: allRows, alreadyPersonList: completedRows };
      for (const storeName of stores) {
        const store = transaction.objectStore(storeName);
        store.clear();
        for (const row of dataSets[storeName])
          store.put(row);
      }
    };
  }), { allRows: allPersonList, completedRows: alreadyPersonList });
}

function durableScenarioRows(rows) {
  return rows.map((row, index) => ({
    ...row,
    id: `holdout-durable-${String(index + 1).padStart(5, '0')}`,
    uid: String(row.uid),
    uuid: `holdout-durable-uuid-${String(index + 1).padStart(5, '0')}`,
    isWin: false,
    x: 0,
    y: 0,
    createTime: '2026-08-26 00:00:00:000',
    updateTime: '2026-08-26 00:00:00:000',
    prizeName: [],
    prizeId: [],
    prizeTime: [],
  }));
}

function installObservationInitScript(context, seatingOrigin, lotteryOrigin) {
  return context.addInitScript(({ plannerOrigin, receiverOrigin }) => {
    const now = () => Date.now();
    if (window.location.origin === plannerOrigin) {
      window.__holdoutPlannerMessages = [];
      window.__holdoutDonePostMessageCalls = [];
      window.__holdoutOnDoneUiEpochMs = null;
      window.addEventListener('message', event => {
        const type = event.data?.type;
        if (type === 'LOG_LOTTERY_IMPORT_BRIDGE_READY' || type === 'WEDDING_SEATING_IMPORT_DONE') {
          window.__holdoutPlannerMessages.push({
            type,
            ok: event.data?.ok,
            epochMs: now(),
            sourceWasWindow: event.source != null,
          });
        }
      });

      const nativePostMessage = window.postMessage;
      try {
        Object.defineProperty(window, 'postMessage', {
          configurable: true,
          writable: true,
          value(message, targetOrigin, transfer) {
            if (message?.type === 'WEDDING_SEATING_IMPORT_DONE') {
              window.__holdoutDonePostMessageCalls.push({
                epochMs: now(),
                ok: message?.ok,
                targetOrigin: typeof targetOrigin === 'string' ? targetOrigin : '',
              });
            }
            if (transfer === undefined)
              return Reflect.apply(nativePostMessage, this, [message, targetOrigin]);
            return Reflect.apply(nativePostMessage, this, [message, targetOrigin, transfer]);
          },
        });
      }
      catch {
        // Parent-side DONE receipt remains available if a browser rejects the wrapper.
      }

      const observeOnDoneUi = () => {
        const check = () => {
          if (window.__holdoutOnDoneUiEpochMs !== null)
            return;
          const text = document.body?.innerText ?? '';
          if (text.includes('名单已发送到') && text.includes('继续配置奖项与抽奖'))
            window.__holdoutOnDoneUiEpochMs = now();
        };
        check();
        if (document.documentElement) {
          const observer = new MutationObserver(check);
          observer.observe(document.documentElement, { childList: true, subtree: true, characterData: true });
        }
      };
      if (document.readyState === 'loading')
        document.addEventListener('DOMContentLoaded', observeOnDoneUi, { once: true });
      else
        observeOnDoneUi();
    }

    if (window.location.origin === receiverOrigin) {
      window.__holdoutIncomingMessages = [];
      window.__holdoutBridgeTerminals = [];
      window.__holdoutLiveSyncEvents = [];
      window.__holdoutHandoffTrace = [];
      window.__holdoutIdbTransactions = [];

      const nativeTransaction = IDBDatabase.prototype.transaction;
      IDBDatabase.prototype.transaction = function transaction(storeNames, mode, options) {
        const transactionResult = options === undefined
          ? Reflect.apply(nativeTransaction, this, [storeNames, mode])
          : Reflect.apply(nativeTransaction, this, [storeNames, mode, options]);
        if (mode === 'readwrite') {
          const entry = {
            sequence: window.__holdoutIdbTransactions.length + 1,
            stores: Array.from(transactionResult.objectStoreNames),
            mode,
            startedEpochMs: now(),
            completedEpochMs: null,
            abortedEpochMs: null,
            errorEpochMs: null,
          };
          window.__holdoutIdbTransactions.push(entry);
          transactionResult.addEventListener('complete', () => { entry.completedEpochMs = now(); });
          transactionResult.addEventListener('abort', () => { entry.abortedEpochMs = now(); });
          transactionResult.addEventListener('error', () => { entry.errorEpochMs = now(); });
        }
        return transactionResult;
      };

      window.addEventListener('message', event => {
        const type = event.data?.type;
        if (type !== 'WEDDING_SEATING_IMPORT' && type !== 'WEDDING_SEATING_SYNC')
          return;
        window.__holdoutIncomingMessages.push({
          type,
          epochMs: now(),
          seq: event.data?.seq,
          guestCount: event.data?.guestCount,
          plannerGuestTotal: event.data?.plannerGuestTotal,
          persons: Array.isArray(event.data?.persons) ? event.data.persons : [],
        });
      });
      window.addEventListener('wedding-seating-bridge-imported', event => {
        window.__holdoutBridgeTerminals.push({ kind: 'imported', epochMs: now(), detail: event.detail });
      });
      window.addEventListener('wedding-seating-bridge-failed', event => {
        window.__holdoutBridgeTerminals.push({ kind: 'failed', epochMs: now(), detail: event.detail });
      });
      window.addEventListener('wedding-seating-bridge-misconfigured', event => {
        window.__holdoutBridgeTerminals.push({ kind: 'misconfigured', epochMs: now(), detail: event.detail });
      });
      window.addEventListener('wedding-seating-live-sync-result', event => {
        window.__holdoutLiveSyncEvents.push({ ...event.detail, observedEpochMs: now() });
      });
      window.addEventListener('wedding-seating-handoff-trace', event => {
        const detail = event.detail ?? {};
        window.__holdoutHandoffTrace.push({
          mode: detail.mode,
          phase: detail.phase,
          traceSequence: detail.traceSequence,
          epochMs: detail.epochMs,
          incomingSequence: detail.incomingSequence,
        });
      });
    }
  }, { plannerOrigin: seatingOrigin, receiverOrigin: lotteryOrigin });
}

async function primePlannerStorage(context, seatingOrigin, lotteryOrigin, plan) {
  await context.addInitScript(({ plannerOrigin, receiverOrigin, seatingPlan }) => {
    if (window.location.origin === plannerOrigin) {
      localStorage.setItem('wedding-seating-plan', JSON.stringify(seatingPlan));
      localStorage.setItem('weddingSeats:lotteryLiveSync', '1');
    }
    if (window.location.origin === receiverOrigin)
      localStorage.setItem('logLottery:liveSyncDebug', '1');
  }, { plannerOrigin: seatingOrigin, receiverOrigin: lotteryOrigin, seatingPlan: plan });
}

function metadataTrace(events, mode, startIndex = 0, incomingSequence = undefined) {
  return events
    .slice(startIndex)
    .filter(event => event.mode === mode)
    .filter(event => incomingSequence === undefined || event.incomingSequence === incomingSequence)
    .sort((left, right) => Number(left.traceSequence) - Number(right.traceSequence))
    .map(event => ({
      mode: event.mode,
      phase: event.phase,
      trace_sequence: event.traceSequence,
      epoch_ms: event.epochMs,
      incoming_sequence: event.incomingSequence,
    }));
}

function determineStateAtDone({ beforeSummary, afterSummary, transactions, doneSendEpochMs, doneReceivedEpochMs }) {
  const referenceEpochMs = doneSendEpochMs ?? doneReceivedEpochMs ?? null;
  if (referenceEpochMs === null) {
    return {
      summary: null,
      reference_epoch_ms: null,
      basis: 'unavailable-no-observed-DONE-time',
      certainty: 'unavailable',
    };
  }
  const writes = transactions.filter(item => item.mode === 'readwrite');
  if (writes.length === 0) {
    return {
      summary: beforeSummary,
      reference_epoch_ms: referenceEpochMs,
      basis: 'no-scenario-readwrite-transaction-observed-by-DONE-time',
      certainty: 'transaction-timeline',
    };
  }
  const startedBefore = writes.filter(item => item.startedEpochMs <= referenceEpochMs);
  const completedBefore = writes.filter(item => item.completedEpochMs !== null && item.completedEpochMs <= referenceEpochMs);
  if (startedBefore.length === 0) {
    return {
      summary: beforeSummary,
      reference_epoch_ms: referenceEpochMs,
      basis: 'DONE-observed-before-first-scenario-readwrite-transaction-started',
      certainty: 'transaction-timeline',
    };
  }
  if (completedBefore.length === writes.length) {
    return {
      summary: afterSummary,
      reference_epoch_ms: referenceEpochMs,
      basis: 'all-scenario-readwrite-transactions-completed-before-DONE',
      certainty: 'transaction-timeline',
    };
  }
  const activeAtDone = writes.some(item => item.startedEpochMs <= referenceEpochMs
    && (item.completedEpochMs === null || item.completedEpochMs > referenceEpochMs));
  if (activeAtDone) {
    return {
      summary: beforeSummary,
      reference_epoch_ms: referenceEpochMs,
      basis: 'scenario-readwrite-transaction-was-uncommitted-at-DONE',
      certainty: 'indexeddb-atomic-transaction-boundary',
    };
  }
  return {
    summary: null,
    reference_epoch_ms: referenceEpochMs,
    basis: 'transaction-timeline-ambiguous',
    certainty: 'unavailable',
  };
}

function o2Fields(report) {
  return {
    o2_pass: report.oracles.O2.passed,
    o2_failure_codes: [...new Set(report.oracles.O2.failures.map(item => item.code))],
    o2_failures: report.oracles.O2.failures,
    o2_expected_decision: report.expectedDecision,
    o2_clause_results: Object.fromEntries(Object.entries(report.clauses).map(([key, value]) => [key, {
      applicable: value.applicable,
      passed: value.passed,
      failure_codes: value.failures.map(item => item.code),
    }])),
  };
}

function completedRows(state) {
  return (state.allPersonList ?? []).filter(row => row.isWin === true);
}

function observationSignature(record) {
  return sha256(stableValue({
    observed_source: record.observed_source_summary,
    observed_decision: record.observed_decision,
    before: record.indexeddb_before_summary,
    at_done: record.indexeddb_at_done_summary,
    after: record.indexeddb_after_summary,
    b_state_pass: record.b_state_pass,
    b_state_failure_codes: record.b_state_failure_codes,
    o2_pass: record.o2_pass,
    o2_failure_codes: record.o2_failure_codes,
    metadata_phases: record.metadata_phases?.map(item => item.phase),
    done_before_durable_commit: record.done_before_durable_commit,
    terminal_kind: record.terminal_kind,
    terminal_action: record.terminal_action,
  }));
}

async function readParentDoneObservation(page, startIndex) {
  return page.evaluate(index => {
    const messages = window.__holdoutPlannerMessages.slice(index);
    const done = messages.find(item => item.type === 'WEDDING_SEATING_IMPORT_DONE') ?? null;
    const sendCall = window.__holdoutDonePostMessageCalls.at(-1) ?? null;
    return {
      done,
      sendCall,
      onDoneUiEpochMs: window.__holdoutOnDoneUiEpochMs,
    };
  }, startIndex);
}

async function waitForPlannerDone(page, startIndex, timeoutMs) {
  await page.waitForFunction(index => window.__holdoutPlannerMessages
    .slice(index)
    .some(item => item.type === 'WEDDING_SEATING_IMPORT_DONE'), startIndex, { timeout: timeoutMs });
  return readParentDoneObservation(page, startIndex);
}

async function waitForOnDoneUi(page, timeoutMs = 5_000) {
  try {
    await page.waitForFunction(() => window.__holdoutOnDoneUiEpochMs !== null, null, { timeout: timeoutMs });
  }
  catch {
    // A rejected import intentionally has no success UI.
  }
  return page.evaluate(() => window.__holdoutOnDoneUiEpochMs);
}

async function runPlannerUiReplacement({ context, seatingOrigin, intendedSource, scenarioId, timeoutMs }) {
  const planner = await context.newPage();
  await planner.goto(`${seatingOrigin}/preview?lang=zh`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  const beforeMessageCount = await planner.evaluate(() => window.__holdoutPlannerMessages.length);
  const importButton = planner.getByRole('button', { name: /一键导入婚礼抽奖/ });
  await importButton.waitFor({ state: 'visible', timeout: timeoutMs });
  await importButton.click();
  const popupPromise = context.waitForEvent('page', { timeout: timeoutMs });
  const startedAtEpochMs = Date.now();
  await planner.getByRole('button', { name: '确定', exact: true }).click();
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  // The init script is installed before application code, so index 0 retains writes
  // that may start before DOMContentLoaded and before the popup handle is available.
  const transactionStartIndex = 0;
  const parentDone = await waitForPlannerDone(planner, beforeMessageCount, timeoutMs);
  const doneProbeStartedAtEpochMs = Date.now();
  const stateAtDoneProbe = await readIndexedDbState(popup);
  const onDoneUiEpochMs = await waitForOnDoneUi(planner);
  await popup.waitForFunction(() => window.__holdoutBridgeTerminals.length > 0, null, { timeout: timeoutMs });
  await popup.waitForTimeout(25);
  const terminal = await popup.evaluate(() => window.__holdoutBridgeTerminals.at(-1));
  const afterState = await readIndexedDbState(popup);
  const receiver = await popup.evaluate(start => ({
    incoming: window.__holdoutIncomingMessages.at(-1) ?? null,
    trace: window.__holdoutHandoffTrace,
    transactions: window.__holdoutIdbTransactions.slice(start),
  }), transactionStartIndex);
  const phases = metadataTrace(receiver.trace, 'replace');
  const senderPhases = [];
  const plannerMessages = await planner.evaluate(index => window.__holdoutPlannerMessages.slice(index), beforeMessageCount);
  if (plannerMessages.some(item => item.type === 'LOG_LOTTERY_IMPORT_BRIDGE_READY'))
    senderPhases.push('ready-received');
  if (receiver.incoming?.type === 'WEDDING_SEATING_IMPORT')
    senderPhases.push('transfer-sent');
  const decision = parentDone.done?.ok === true ? 'replace' : 'reject';
  const beforeState = { allPersonList: [], alreadyPersonList: [] };
  const beforeSummary = stateSummary(beforeState);
  const afterSummary = stateSummary(afterState);
  const atDone = determineStateAtDone({
    beforeSummary,
    afterSummary,
    transactions: receiver.transactions,
    doneSendEpochMs: parentDone.sendCall?.epochMs ?? null,
    doneReceivedEpochMs: parentDone.done?.epochMs ?? null,
  });
  const bState = evaluateIndependentBState({
    expectedRows: intendedSource,
    beforeState,
    afterState,
    preserveOwned: false,
  });
  const durableAtDone = atDone.summary !== null
    && atDone.summary.semantic_state_digest_sha256 === afterSummary.semantic_state_digest_sha256;
  const contract = checkWeddingSeatingHandoff({
    mode: 'replace',
    sourcePersons: intendedSource,
    destinationBefore: beforeState.allPersonList,
    destinationAfter: afterState.allPersonList,
    completedBefore: [],
    completedAfter: completedRows(afterState),
    scenario: {
      expectedOrigin: seatingOrigin,
      expectedPeer: 'opened-child',
      persistenceOutcome: terminal?.kind === 'failed' && terminal?.detail?.reason === 'persistence-failed'
        ? 'failure'
        : 'success',
    },
    execution: {
      observedOrigin: seatingOrigin,
      observedPeer: 'opened-child',
      decision,
      phases: [...senderPhases, ...phases.map(item => item.phase)],
      atomicCommit: decision === 'replace' ? durableAtDone : true,
    },
  });
  const record = {
    scenario_id: scenarioId,
    status: 'complete',
    designated_path_reached: receiver.incoming?.type === 'WEDDING_SEATING_IMPORT'
      && phases.some(item => item.phase === 'message-received'),
    observed_decision: decision,
    terminal_kind: terminal?.kind ?? '',
    terminal_action: terminal?.detail?.reason ?? '',
    observed_source_summary: sourceSummary(receiver.incoming?.persons ?? []),
    intended_source_summary: sourceSummary(intendedSource),
    indexeddb_before_summary: beforeSummary,
    indexeddb_at_done_summary: atDone.summary,
    indexeddb_at_done_basis: atDone.basis,
    indexeddb_at_done_certainty: atDone.certainty,
    indexeddb_after_summary: afterSummary,
    indexeddb_done_probe_summary: stateSummary(stateAtDoneProbe),
    done_send_call_epoch_ms: parentDone.sendCall?.epochMs ?? null,
    done_received_epoch_ms: parentDone.done?.epochMs ?? null,
    on_done_ui_epoch_ms: onDoneUiEpochMs,
    done_probe_started_epoch_ms: doneProbeStartedAtEpochMs,
    done_before_durable_commit: decision === 'replace' ? !durableAtDone : false,
    metadata_phases: phases,
    indexeddb_write_transactions: receiver.transactions,
    event_wait_ms: (parentDone.done?.epochMs ?? Date.now()) - startedAtEpochMs,
    b_state_pass: bState.passed,
    b_state_failure_codes: bState.failure_codes,
    b_state_failures: bState.failures,
    ...o2Fields(contract),
  };
  record.observation_signature_sha256 = observationSignature(record);
  await popup.close();
  await planner.close();
  return record;
}

async function runDirectReplacementHandshake({ page, context, lotteryOrigin, seatingOrigin, persons, token, timeoutMs }) {
  const popupPromise = context.waitForEvent('page', { timeout: timeoutMs });
  await page.evaluate(({ receiverOrigin, plannerOrigin, source, handshakeToken }) => {
    window.__holdoutDirectHandshakes ??= {};
    const targetUrl = `${receiverOrigin}/log-lottery/config/person/all?bridge=1&from=${encodeURIComponent(plannerOrigin)}`;
    const child = window.open(targetUrl, `HoldoutDirect_${handshakeToken}`, 'width=1100,height=800');
    if (!child)
      throw new Error('Direct replacement popup was blocked');
    const state = {
      readyEpochMs: null,
      sentEpochMs: null,
      doneEpochMs: null,
      doneOk: null,
      child,
    };
    window.__holdoutDirectHandshakes[handshakeToken] = state;
    const listener = event => {
      if (event.origin !== receiverOrigin || event.source !== child)
        return;
      if (event.data?.type === 'LOG_LOTTERY_IMPORT_BRIDGE_READY' && state.sentEpochMs === null) {
        state.readyEpochMs = Date.now();
        state.sentEpochMs = Date.now();
        child.postMessage({
          type: 'WEDDING_SEATING_IMPORT',
          persons: source,
          guestCount: source.length,
          sentAt: Date.now(),
        }, receiverOrigin);
      }
      if (event.data?.type === 'WEDDING_SEATING_IMPORT_DONE') {
        state.doneEpochMs = Date.now();
        state.doneOk = event.data?.ok === true;
        window.removeEventListener('message', listener);
      }
    };
    window.addEventListener('message', listener);
  }, {
    receiverOrigin: lotteryOrigin,
    plannerOrigin: seatingOrigin,
    source: persons,
    handshakeToken: token,
  });
  const popup = await popupPromise;
  await popup.waitForLoadState('domcontentloaded');
  await page.waitForFunction(handshakeToken => {
    const state = window.__holdoutDirectHandshakes?.[handshakeToken];
    return state?.doneEpochMs !== null;
  }, token, { timeout: timeoutMs });
  const sender = await page.evaluate(handshakeToken => {
    const state = window.__holdoutDirectHandshakes[handshakeToken];
    return {
      readyEpochMs: state.readyEpochMs,
      sentEpochMs: state.sentEpochMs,
      doneEpochMs: state.doneEpochMs,
      doneOk: state.doneOk,
    };
  }, token);
  return { popup, sender };
}

async function runEmptyReplacementScenario({ context, seatingOrigin, lotteryOrigin, intendedSource, scenarioId, timeoutMs }) {
  const planner = await context.newPage();
  await planner.goto(`${seatingOrigin}/preview?lang=zh`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  const seed = await runDirectReplacementHandshake({
    page: planner,
    context,
    lotteryOrigin,
    seatingOrigin,
    persons: intendedSource,
    token: `seed-${Date.now()}`,
    timeoutMs,
  });
  const seededState = await waitForIndexedDbCount(seed.popup, intendedSource.length, timeoutMs);
  await seed.popup.close();

  const target = await runDirectReplacementHandshake({
    page: planner,
    context,
    lotteryOrigin,
    seatingOrigin,
    persons: [],
    token: `target-${Date.now()}`,
    timeoutMs,
  });
  const transactionStartIndex = 0;
  await target.popup.waitForTimeout(25);
  const afterState = await readIndexedDbState(target.popup);
  const receiver = await target.popup.evaluate(start => ({
    incoming: window.__holdoutIncomingMessages.at(-1) ?? null,
    trace: window.__holdoutHandoffTrace,
    terminal: window.__holdoutBridgeTerminals.at(-1) ?? null,
    transactions: window.__holdoutIdbTransactions.slice(start),
  }), transactionStartIndex);
  const phases = metadataTrace(receiver.trace, 'replace');
  const beforeSummary = stateSummary(seededState);
  const afterSummary = stateSummary(afterState);
  const bState = evaluateIndependentBState({
    expectedRows: seededState.allPersonList,
    beforeState: seededState,
    afterState,
    preserveOwned: true,
  });
  const decision = target.sender.doneOk ? 'replace' : 'reject';
  const contract = checkWeddingSeatingHandoff({
    mode: 'replace',
    sourcePersons: [],
    destinationBefore: seededState.allPersonList,
    destinationAfter: afterState.allPersonList,
    completedBefore: completedRows(seededState),
    completedAfter: completedRows(afterState),
    scenario: {
      expectedOrigin: seatingOrigin,
      expectedPeer: 'opened-child',
      persistenceOutcome: 'success',
    },
    execution: {
      observedOrigin: seatingOrigin,
      observedPeer: 'opened-child',
      decision,
      phases: ['ready-received', 'transfer-sent', ...phases.map(item => item.phase)],
      atomicCommit: true,
    },
  });
  const record = {
    scenario_id: scenarioId,
    status: 'complete',
    designated_path_reached: phases.some(item => item.phase === 'message-received'),
    observed_decision: decision,
    terminal_kind: receiver.terminal?.kind ?? '',
    terminal_action: receiver.terminal?.detail?.reason ?? '',
    observed_source_summary: sourceSummary(receiver.incoming?.persons ?? []),
    intended_source_summary: sourceSummary([]),
    indexeddb_before_summary: beforeSummary,
    indexeddb_at_done_summary: null,
    indexeddb_at_done_basis: 'not-required-for-rejected-empty-scenario',
    indexeddb_at_done_certainty: 'not-applicable',
    indexeddb_after_summary: afterSummary,
    done_send_call_epoch_ms: null,
    done_received_epoch_ms: target.sender.doneEpochMs,
    on_done_ui_epoch_ms: null,
    done_before_durable_commit: false,
    metadata_phases: phases,
    indexeddb_write_transactions: receiver.transactions,
    event_wait_ms: target.sender.doneEpochMs - target.sender.sentEpochMs,
    b_state_pass: bState.passed,
    b_state_failure_codes: bState.failure_codes,
    b_state_failures: bState.failures,
    ...o2Fields(contract),
  };
  record.observation_signature_sha256 = observationSignature(record);
  await target.popup.close();
  await planner.close();
  return record;
}

async function waitForLiveSyncEvent(frame, startIndex, incomingSequence, timeoutMs) {
  const startedAt = performance.now();
  await frame.waitForFunction(({ index, sequence }) => window.__holdoutLiveSyncEvents
    .slice(index)
    .some(item => item.seq === sequence), { index: startIndex, sequence: incomingSequence }, { timeout: timeoutMs });
  const event = await frame.evaluate(({ index, sequence }) => window.__holdoutLiveSyncEvents
    .slice(index)
    .find(item => item.seq === sequence), { index: startIndex, sequence: incomingSequence });
  return { event, waitMs: performance.now() - startedAt };
}

async function injectLiveSync(page, lotteryOrigin, payload) {
  await page.evaluate(({ receiverOrigin, message }) => {
    const iframe = [...document.querySelectorAll('iframe')]
      .find(candidate => candidate.src.includes('liveSync=1'));
    if (!iframe?.contentWindow)
      throw new Error('Live-sync iframe not found');
    iframe.contentWindow.postMessage({ type: 'WEDDING_SEATING_SYNC', ...message }, receiverOrigin);
  }, { receiverOrigin: lotteryOrigin, message: payload });
}

async function establishSyncState({ page, frame, rows, sequence, plan, lotteryOrigin, timeoutMs }) {
  const eventStart = await frame.evaluate(() => window.__holdoutLiveSyncEvents.length);
  await injectLiveSync(page, lotteryOrigin, {
    persons: rows,
    seq: sequence,
    guestCount: rows.length,
    plannerGuestTotal: rows.length,
    tableCount: plan.tables.length,
    sentAt: Date.now(),
  });
  const observed = await waitForLiveSyncEvent(frame, eventStart, sequence, timeoutMs);
  if (observed.event?.action !== 'merge')
    throw new Error(`Unable to establish sync state: observed ${observed.event?.action ?? 'no action'}`);
  return waitForIndexedDbCount(frame, rows.length, timeoutMs);
}

async function runSyncScenario({ context, seatingOrigin, lotteryOrigin, plan, scenario, scenarioId, timeoutMs }) {
  const baseRows = intendedRows(plan, 'base');
  const page = await context.newPage();
  await page.goto(`${seatingOrigin}/guests?lang=zh`, { waitUntil: 'domcontentloaded', timeout: timeoutMs });
  const iframeLocator = page.locator('iframe[src*="liveSync=1"]');
  await iframeLocator.waitFor({ state: 'attached', timeout: timeoutMs });
  const iframeHandle = await iframeLocator.elementHandle();
  const frame = await iframeHandle?.contentFrame();
  if (!frame)
    throw new Error('Live-sync receiver frame was not attached');
  await frame.waitForFunction(() => window.__holdoutLiveSyncEvents.some(item => item.action === 'merge'), null, {
    timeout: timeoutMs,
  });
  await page.waitForTimeout(3_100);
  if (scenario === 'sync-durable-update') {
    await replaceIndexedDbScenarioState(
      frame,
      durableScenarioRows(intendedRows(plan, 'avatar-old')),
    );
  }
  const initial = await waitForIndexedDbCount(frame, baseRows.length, timeoutMs);
  if (initial.allPersonList.length !== baseRows.length)
    throw new Error(`Initial hidden-iframe sync produced ${initial.allPersonList.length}/${baseRows.length} rows`);

  const seedSequence = 10_000;
  let targetRows = baseRows;
  let payloadPersons = baseRows;
  let payloadGuestCount = baseRows.length;
  let payloadPlannerGuestTotal = baseRows.length;
  let expectedRows;
  let preserveOwned = true;

  if (scenario === 'sync-avatar-update-preserve-owned-state') {
    const oldRows = intendedRows(plan, 'avatar-old');
    await establishSyncState({ page, frame, rows: oldRows, sequence: seedSequence, plan, lotteryOrigin, timeoutMs });
    targetRows = intendedRows(plan, 'avatar-new');
    payloadPersons = targetRows;
    expectedRows = targetRows;
  }
  else if (scenario === 'sync-durable-update') {
    const oldRows = intendedRows(plan, 'avatar-old');
    await establishSyncState({ page, frame, rows: oldRows, sequence: seedSequence, plan, lotteryOrigin, timeoutMs });
    targetRows = intendedRows(plan, 'durable-update');
    payloadPersons = targetRows;
    expectedRows = targetRows;
  }
  else {
    await establishSyncState({ page, frame, rows: baseRows, sequence: seedSequence, plan, lotteryOrigin, timeoutMs });
    expectedRows = null;
  }

  const beforeState = await readIndexedDbState(frame);
  const beforeSummary = stateSummary(beforeState);
  let incomingSequence = seedSequence + 1;
  if (scenario === 'sync-duplicate-sequence') {
    incomingSequence = seedSequence;
    payloadPersons = baseRows;
    expectedRows = beforeState.allPersonList;
  }
  else if (scenario === 'sync-transient-empty-single-positive-counter') {
    payloadPersons = [];
    payloadGuestCount = 0;
    payloadPlannerGuestTotal = baseRows.length;
    expectedRows = beforeState.allPersonList;
  }

  const eventStart = await frame.evaluate(() => window.__holdoutLiveSyncEvents.length);
  const traceStart = await frame.evaluate(() => window.__holdoutHandoffTrace.length);
  const messageStart = await frame.evaluate(() => window.__holdoutIncomingMessages.length);
  const transactionStart = await frame.evaluate(() => window.__holdoutIdbTransactions.length);
  const sentAt = Date.now();
  await injectLiveSync(page, lotteryOrigin, {
    persons: payloadPersons,
    seq: incomingSequence,
    guestCount: payloadGuestCount,
    plannerGuestTotal: payloadPlannerGuestTotal,
    tableCount: plan.tables.length,
    sentAt,
  });
  const observed = await waitForLiveSyncEvent(frame, eventStart, incomingSequence, timeoutMs);
  await frame.waitForTimeout(25);
  const afterState = await readIndexedDbState(frame);
  const receiver = await frame.evaluate(({ traceIndex, messageIndex, transactionIndex }) => ({
    trace: window.__holdoutHandoffTrace.slice(traceIndex),
    incoming: window.__holdoutIncomingMessages.slice(messageIndex).at(-1) ?? null,
    transactions: window.__holdoutIdbTransactions.slice(transactionIndex),
  }), { traceIndex: traceStart, messageIndex: messageStart, transactionIndex: transactionStart });
  const phases = metadataTrace(receiver.trace, 'synchronize', 0, incomingSequence);
  const afterSummary = stateSummary(afterState);
  const bState = evaluateIndependentBState({
    expectedRows,
    beforeState,
    afterState,
    preserveOwned,
  });
  const action = observed.event?.action ?? '';
  const acceptedAfter = ['merge', 'clear'].includes(action) ? incomingSequence : seedSequence;
  const persistedAfter = ['merge', 'clear'].includes(action) ? incomingSequence : seedSequence;
  const durableUpdateObserved = scenario !== 'sync-durable-update'
    || afterSummary.semantic_state_digest_sha256 !== beforeSummary.semantic_state_digest_sha256;
  const contract = checkWeddingSeatingHandoff({
    mode: 'synchronize',
    sourcePersons: payloadPersons,
    destinationBefore: beforeState.allPersonList,
    destinationAfter: afterState.allPersonList,
    completedBefore: completedRows(beforeState),
    completedAfter: completedRows(afterState),
    scenario: {
      expectedOrigin: seatingOrigin,
      expectedPeer: 'bound-parent',
      authoritativeSourceCount: scenario === 'sync-transient-empty-single-positive-counter'
        ? baseRows.length
        : payloadPersons.length,
      incomingSequence,
      acceptedSequenceBefore: seedSequence,
      persistedSequenceBefore: seedSequence,
      persistenceOutcome: action === 'persistence-failed' ? 'failure' : 'success',
    },
    execution: {
      observedOrigin: seatingOrigin,
      observedPeer: 'bound-parent',
      decision: action || 'reject',
      phases: phases.map(item => item.phase),
      acceptedSequenceAfter: acceptedAfter,
      persistedSequenceAfter: persistedAfter,
      atomicCommit: scenario === 'sync-durable-update' ? durableUpdateObserved : true,
    },
  });
  const record = {
    scenario_id: scenarioId,
    status: 'complete',
    designated_path_reached: phases.some(item => item.phase === 'message-received'),
    observed_decision: action || 'reject',
    terminal_kind: 'live-sync-result',
    terminal_action: action,
    observed_source_summary: sourceSummary(receiver.incoming?.persons ?? []),
    intended_source_summary: sourceSummary(payloadPersons),
    indexeddb_before_summary: beforeSummary,
    indexeddb_at_done_summary: null,
    indexeddb_at_done_basis: 'not-applicable-to-hidden-iframe-sync',
    indexeddb_at_done_certainty: 'not-applicable',
    indexeddb_after_summary: afterSummary,
    done_send_call_epoch_ms: null,
    done_received_epoch_ms: null,
    on_done_ui_epoch_ms: null,
    done_before_durable_commit: scenario === 'sync-durable-update' && !durableUpdateObserved,
    metadata_phases: phases,
    indexeddb_write_transactions: receiver.transactions,
    event_wait_ms: observed.waitMs,
    b_state_pass: bState.passed,
    b_state_failure_codes: bState.failure_codes,
    b_state_failures: bState.failures,
    ...o2Fields(contract),
  };
  record.observation_signature_sha256 = observationSignature(record);
  await page.close();
  return record;
}

async function runScenario({ browser, browserName, browserVersion, mutant, variant, seatingOrigin, lotteryOrigin, rosterSize, timeoutMs }) {
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1280, height: 800 } });
  const plan = makePlan(rosterSize);
  await installObservationInitScript(context, seatingOrigin, lotteryOrigin);
  await primePlannerStorage(context, seatingOrigin, lotteryOrigin, plan);
  try {
    let record;
    if (mutant.scenario === 'replace-normal-200') {
      record = await runPlannerUiReplacement({
        context,
        seatingOrigin,
        intendedSource: intendedRows(plan, 'base'),
        scenarioId: mutant.id,
        timeoutMs,
      });
    }
    else if (mutant.scenario === 'replace-empty-reject-after-seeded-state') {
      record = await runEmptyReplacementScenario({
        context,
        seatingOrigin,
        lotteryOrigin,
        intendedSource: intendedRows(plan, 'base'),
        scenarioId: mutant.id,
        timeoutMs,
      });
    }
    else if (mutant.scenario.startsWith('sync-')) {
      record = await runSyncScenario({
        context,
        seatingOrigin,
        lotteryOrigin,
        plan,
        scenario: mutant.scenario,
        scenarioId: mutant.id,
        timeoutMs,
      });
    }
    else {
      throw new Error(`Unsupported holdout scenario: ${mutant.scenario}`);
    }
    return {
      ...record,
      holdout_id: mutant.id,
      scenario: mutant.scenario,
      variant,
      browser: browserName,
      browser_version: browserVersion,
      expected_b_state: mutant.expected_b_state,
      expected_o2_clause: mutant.expected_o2_clause,
      error_class: '',
      error_message: '',
    };
  }
  catch (error) {
    return {
      holdout_id: mutant.id,
      scenario: mutant.scenario,
      variant,
      browser: browserName,
      browser_version: browserVersion,
      status: 'error',
      designated_path_reached: false,
      observed_decision: '',
      terminal_kind: '',
      terminal_action: '',
      observed_source_summary: null,
      intended_source_summary: null,
      indexeddb_before_summary: null,
      indexeddb_at_done_summary: null,
      indexeddb_at_done_basis: 'unavailable-scenario-error',
      indexeddb_at_done_certainty: 'unavailable',
      indexeddb_after_summary: null,
      metadata_phases: [],
      event_wait_ms: null,
      b_state_pass: null,
      b_state_failure_codes: [],
      o2_pass: null,
      o2_failure_codes: [],
      observation_signature_sha256: null,
      expected_b_state: mutant.expected_b_state,
      expected_o2_clause: mutant.expected_o2_clause,
      error_class: error instanceof Error ? error.name : 'UnknownError',
      error_message: error instanceof Error ? error.message : String(error),
    };
  }
  finally {
    await context.close();
  }
}

function browserCsv(records) {
  const columns = [
    'holdout_id', 'scenario', 'variant', 'browser', 'browser_version', 'status',
    'designated_path_reached', 'observed_decision', 'terminal_kind', 'terminal_action',
    'b_state_pass', 'b_state_failure_codes', 'o2_pass', 'o2_failure_codes',
    'o2_expected_decision', 'expected_b_state', 'expected_o2_clause',
    'indexeddb_before_summary', 'indexeddb_at_done_summary', 'indexeddb_at_done_basis',
    'indexeddb_after_summary', 'metadata_phases', 'event_wait_ms',
    'done_send_call_epoch_ms', 'done_received_epoch_ms', 'on_done_ui_epoch_ms',
    'done_before_durable_commit', 'observation_signature_sha256', 'error_class', 'error_message',
  ];
  return `${[
    columns.join(','),
    ...records.map(record => columns.map(column => csvCell(record[column])).join(',')),
  ].join('\n')}\n`;
}

const args = parseArgs(process.argv.slice(2));
const manifestPath = resolve(args.manifest ?? defaultManifestPath);
if (!existsSync(manifestPath))
  throw new Error(`Holdout manifest not found: ${manifestPath}`);
if (isAbsolute(relative(root, manifestPath)) || relative(root, manifestPath).startsWith('..'))
  throw new Error('Holdout manifest must be inside the dedicated worktree');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const supportedScenarios = new Set([
  'replace-normal-200',
  'replace-empty-reject-after-seeded-state',
  'sync-duplicate-sequence',
  'sync-transient-empty-single-positive-counter',
  'sync-avatar-update-preserve-owned-state',
  'sync-durable-update',
]);
for (const mutant of manifest.mutants ?? []) {
  if (!supportedScenarios.has(mutant.scenario))
    throw new Error(`Manifest scenario is not implemented: ${mutant.id} -> ${mutant.scenario}`);
}

const selectedIds = (args.ids ?? 'all') === 'all'
  ? manifest.mutants.map(item => item.id)
  : (args.ids ?? '').split(',').map(item => item.trim()).filter(Boolean);
const selectedMutants = selectedIds.map(id => {
  const mutant = manifest.mutants.find(item => item.id === id);
  if (!mutant)
    throw new Error(`Unknown holdout ID: ${id}`);
  return mutant;
});
const browserNames = (args.browsers ?? manifest.browser_repetitions?.join(',') ?? 'chromium,firefox,webkit')
  .split(',').map(item => item.trim()).filter(Boolean);
for (const browserName of browserNames) {
  if (!launchers[browserName])
    throw new Error(`Unsupported browser: ${browserName}`);
}
const variant = args.variant ?? 'control';
const seatingOrigin = args['seating-origin'] ?? 'http://127.0.0.1:3111';
const lotteryOrigin = args['lottery-origin'] ?? 'http://127.0.0.1:6811';
const seatingUrl = new URL(seatingOrigin);
const lotteryUrl = new URL(lotteryOrigin);
if (!seatingUrl.port || !lotteryUrl.port)
  throw new Error('Holdout origins must use explicit ports');
const rosterSize = Number(manifest.synthetic_roster_size);
if (rosterSize !== 200)
  throw new Error(`This frozen harness requires synthetic_roster_size=200, observed ${rosterSize}`);
const timeoutMs = Math.max(10_000, Number(args['timeout-ms'] ?? '60000'));
const timestamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '');
const outputJson = resolve(args['output-json'] ?? join(evaluationDir, 'results', 'raw', `jsep_holdout_browser_${variant}_${timestamp}.json`));
const outputCsv = resolve(args['output-csv'] ?? join(evaluationDir, 'results', 'processed', `jsep_holdout_browser_${variant}_${timestamp}.csv`));

if (!existsSync(join(root, '.next', 'BUILD_ID')))
  throw new Error('Production Next build is missing (.next/BUILD_ID)');
if (!existsSync(join(lotteryDir, 'dist', 'index.html')))
  throw new Error('Production Vite build is missing (log-lottery/dist/index.html)');

await Promise.all([
  assertOriginUnused(`${seatingOrigin}/preview?lang=zh`),
  assertOriginUnused(`${lotteryOrigin}/log-lottery/config/person/all`),
]);

const nextServer = startServer(
  'planner-production',
  process.execPath,
  [join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), 'start', '-p', seatingUrl.port, '-H', seatingUrl.hostname],
  root,
  { NEXT_PUBLIC_LOTTERY_IMPORT_URL: `${lotteryOrigin}/log-lottery/config/person/all` },
);
const lotteryServer = startServer(
  'lottery-production',
  process.execPath,
  [
    join(lotteryDir, 'node_modules', 'vite', 'bin', 'vite.js'),
    'preview', '--host', lotteryUrl.hostname, '--port', lotteryUrl.port, '--strictPort',
  ],
  lotteryDir,
  { VITE_WEDDING_SEATING_ORIGINS: seatingOrigin },
);

const records = [];
const browserVersions = {};
try {
  await Promise.all([
    waitForHttp(`${seatingOrigin}/preview?lang=zh`, nextServer),
    waitForHttp(`${lotteryOrigin}/log-lottery/config/person/all`, lotteryServer),
  ]);
  for (const browserName of browserNames) {
    let browser;
    try {
      browser = await launchers[browserName].launch({ headless: true });
      const browserVersion = browser.version();
      browserVersions[browserName] = browserVersion;
      for (const mutant of selectedMutants) {
        const record = await runScenario({
          browser,
          browserName,
          browserVersion,
          mutant,
          variant,
          seatingOrigin,
          lotteryOrigin,
          rosterSize,
          timeoutMs,
        });
        records.push(record);
        process.stdout.write(`${variant} ${mutant.id} ${browserName}: ${record.status} B=${record.b_state_pass} O2=${record.o2_pass}\n`);
      }
    }
    catch (error) {
      for (const mutant of selectedMutants) {
        if (records.some(record => record.browser === browserName && record.holdout_id === mutant.id))
          continue;
        records.push({
          holdout_id: mutant.id,
          scenario: mutant.scenario,
          variant,
          browser: browserName,
          browser_version: browserVersions[browserName] ?? '',
          status: 'error',
          designated_path_reached: false,
          b_state_pass: null,
          b_state_failure_codes: [],
          o2_pass: null,
          o2_failure_codes: [],
          metadata_phases: [],
          event_wait_ms: null,
          error_class: error instanceof Error ? error.name : 'UnknownError',
          error_message: error instanceof Error ? error.message : String(error),
        });
      }
    }
    finally {
      await browser?.close();
    }
  }
}
finally {
  await Promise.all([stopServer(nextServer), stopServer(lotteryServer)]);
}

const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const sourceDiff = execFileSync('git', ['diff', '--binary', '--', ...selectedMutants.map(item => item.file)], {
  cwd: root,
  encoding: 'utf8',
});
const output = {
  metadata: {
    generated_at_utc: new Date().toISOString(),
    catalogue_version: manifest.catalogue_version,
    manifest_sha256: fileSha256(manifestPath),
    application_base_commit: manifest.application_base_commit,
    evaluated_commit: commit,
    evaluated_diff_sha256: sha256(sourceDiff),
    variant,
    selected_holdout_ids: selectedIds,
    unit_of_analysis: manifest.unit_of_analysis,
    browser_repetitions_are_technical_replications: true,
    roster_size: rosterSize,
    browsers: browserNames,
    browser_versions: browserVersions,
    node: process.version,
    playwright: JSON.parse(readFileSync(join(root, 'node_modules', 'playwright', 'package.json'), 'utf8')).version,
    platform: `${process.platform}-${process.arch}`,
    os_release: release(),
    cpu_model: cpus()[0]?.model ?? 'unknown',
    logical_cpu_count: cpus().length,
    total_memory_bytes: totalmem(),
    server_mode: 'production-only',
    seating_origin: seatingOrigin,
    lottery_origin: lotteryOrigin,
    next_build_id_sha256: fileSha256(join(root, '.next', 'BUILD_ID')),
    lottery_dist_index_sha256: fileSha256(join(lotteryDir, 'dist', 'index.html')),
    baseline_independence: 'B-state is implemented locally as a keyed durable post-state comparison and never calls the O2 implementation.',
    h04_completion_boundary: 'DONE receipt is observed externally in every browser; the sender call is supplementary where the browser permits wrapping it. IndexedDB-at-DONE is reconstructed from all init-script-observed readwrite transactions plus pre/post snapshots. Trace is retained as phase evidence only.',
  },
  records,
};
writeAtomic(outputJson, `${JSON.stringify(output, null, 2)}\n`);
writeAtomic(outputCsv, browserCsv(records));
console.log(`Raw JSON: ${outputJson}`);
console.log(`Processed CSV: ${outputCsv}`);
if (records.some(record => record.status !== 'complete'))
  process.exitCode = 2;
