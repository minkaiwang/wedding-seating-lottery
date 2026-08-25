import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';
import { checkWeddingSeatingHandoff } from '../../log-lottery/src/utils/weddingSeatingContractAdapter.ts';

const evaluationDir = dirname(dirname(fileURLToPath(import.meta.url)));
const root = dirname(evaluationDir);
const lotteryDir = join(root, 'log-lottery');
const rawDir = join(evaluationDir, 'results', 'raw');
const seatingOrigin = process.env.EVAL_SEATING_ORIGIN ?? 'http://localhost:3101';
const lotteryOrigin = process.env.EVAL_LOTTERY_ORIGIN ?? 'http://localhost:6721';
const seatingUrl = new URL(seatingOrigin);
const lotteryUrl = new URL(lotteryOrigin);
const seatingPort = Number(seatingUrl.port);
const lotteryPort = Number(lotteryUrl.port);
if (!seatingPort || !lotteryPort)
  throw new Error('Evaluation origins must include explicit ports');
const serverMode = process.env.EVAL_SERVER_MODE ?? 'development';
if (!['development', 'production'].includes(serverMode))
  throw new Error(`Unsupported EVAL_SERVER_MODE: ${serverMode}`);
const rosterSize = Math.max(1, Number(process.env.EVAL_FAULT_ROSTER_SIZE ?? '200'));
const browserName = process.env.EVAL_FAULT_BROWSER ?? 'chromium';
const launcher = { chromium, firefox, webkit }[browserName];
if (!launcher)
  throw new Error(`Unsupported EVAL_FAULT_BROWSER: ${browserName}`);
const batchLabel = (process.env.EVAL_FAULT_BATCH_LABEL ?? 'live_sync_fault_pilot').replace(/[^a-zA-Z0-9_-]/g, '_');

function fileSha256(path) {
  return existsSync(path)
    ? createHash('sha256').update(readFileSync(path)).digest('hex')
    : null;
}

function sourceHash() {
  const files = [
    'log-lottery/src/store/personConfig.ts',
    'log-lottery/src/utils/dexie/index.ts',
    'log-lottery/src/utils/seatingSyncExclusions.ts',
    'log-lottery/src/utils/stateHandoffContract.ts',
    'log-lottery/src/utils/weddingSeatingContractAdapter.ts',
    'log-lottery/src/utils/weddingSeatingHandoffTrace.ts',
    'log-lottery/src/utils/weddingSeatingLiveSync.ts',
    'log-lottery/src/utils/weddingSeatingMerge.ts',
    'log-lottery/src/utils/weddingSeatingProtocol.ts',
    'research-evaluation/scripts/run-live-sync-faults.mjs',
  ];
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update(readFileSync(join(root, file)));
  }
  return hash.digest('hex');
}

function makePlan(size) {
  const tableCount = Math.max(1, Math.ceil(size / 10));
  const tables = Array.from({ length: tableCount }, (_, index) => ({
    id: `table-${String(index + 1).padStart(3, '0')}`,
    name: `Table ${index + 1}`,
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
  return { guests, tables, lastUpdated: '2026-08-02T00:00:00.000Z' };
}

function personRows(plan) {
  const tableById = new Map(plan.tables.map(table => [table.id, table]));
  return plan.guests.map((guest, index) => ({
    uid: index + 1,
    plannerGuestId: guest.id,
    name: guest.name,
    department: tableById.get(guest.tableId)?.name ?? '',
    identity: guest.tags.join(', '),
    avatar: '',
  }));
}

const publicFields = ['name', 'department', 'identity', 'avatar'];

function normalizedValue(value) {
  return value == null ? '' : String(value);
}

function exactPublicState(actualRows, expectedRows) {
  const actualIds = actualRows.map(row => normalizedValue(row.plannerGuestId));
  const expectedIds = expectedRows.map(row => normalizedValue(row.plannerGuestId));
  const actualById = new Map(actualRows.map(row => [normalizedValue(row.plannerGuestId), row]));
  const expectedById = new Map(expectedRows.map(row => [normalizedValue(row.plannerGuestId), row]));
  const missingIds = expectedIds.filter(id => !actualById.has(id));
  const unexpectedIds = actualIds.filter(id => !expectedById.has(id));
  const duplicateStableIds = actualIds.length - new Set(actualIds).size;
  const fieldMismatches = [];
  for (const id of expectedIds) {
    const actual = actualById.get(id);
    const expected = expectedById.get(id);
    if (!actual || !expected)
      continue;
    for (const field of publicFields) {
      const observed = normalizedValue(actual[field]);
      const wanted = normalizedValue(expected[field]);
      if (observed !== wanted)
        fieldMismatches.push({ plannerGuestId: id, field, expected: wanted, observed });
    }
  }
  const identitySetMatch = missingIds.length === 0
    && unexpectedIds.length === 0
    && duplicateStableIds === 0
    && actualRows.length === expectedRows.length;
  const publicFieldMatch = fieldMismatches.length === 0;
  return {
    pass: identitySetMatch && publicFieldMatch,
    identity_set_match: identitySetMatch,
    public_field_match: publicFieldMatch,
    duplicate_stable_ids: duplicateStableIds,
    missing_id_count: missingIds.length,
    unexpected_id_count: unexpectedIds.length,
    public_field_mismatch_count: fieldMismatches.length,
    mismatch_examples: fieldMismatches.slice(0, 5),
  };
}

function startServer(executable, args, cwd, env) {
  return spawn(executable, args, {
    cwd,
    env: { ...process.env, ...env },
    windowsHide: true,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

async function waitForHttp(url, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok)
        return;
    }
    catch {
      // Server is still starting.
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error(`Server did not become ready: ${url}`);
}

async function stop(child) {
  if (child.exitCode !== null)
    return;
  child.kill();
  await Promise.race([
    new Promise(resolve => child.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 3_000)),
  ]);
}

async function readRoster(frame) {
  return frame.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('person');
    open.onerror = () => reject(open.error ?? new Error('Unable to open person database'));
    open.onsuccess = () => {
      const db = open.result;
      const transaction = db.transaction('allPersonList', 'readonly');
      const request = transaction.objectStore('allPersonList').getAll();
      request.onerror = () => reject(request.error ?? new Error('Unable to read roster'));
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
    };
  }));
}

async function waitForRoster(frame, expected, timeoutMs = 15_000) {
  const deadline = Date.now() + timeoutMs;
  let rows = [];
  while (Date.now() < deadline) {
    rows = await readRoster(frame);
    if (rows.length === expected)
      return rows;
    await new Promise(resolve => setTimeout(resolve, 100));
  }
  return rows;
}

async function inject(page, payload) {
  await page.evaluate(({ receiverOrigin, message }) => {
    const iframe = [...document.querySelectorAll('iframe')]
      .find(candidate => candidate.src.includes('liveSync=1'));
    if (!iframe?.contentWindow)
      throw new Error('Live-sync iframe not found');
    iframe.contentWindow.postMessage({ type: 'WEDDING_SEATING_SYNC', ...message }, receiverOrigin);
  }, { receiverOrigin: lotteryOrigin, message: payload });
}

async function waitForAction(frame, previousCount, action) {
  try {
    await frame.waitForFunction(({ count, expected }) => {
      const events = window.__ecLiveSyncEvents;
      return Array.isArray(events) && events.slice(count).some(event => event.action === expected);
    }, { count: previousCount, expected: action }, { timeout: 15_000 });
  }
  catch (error) {
    const observed = await frame.evaluate(count => window.__ecLiveSyncEvents.slice(count), previousCount);
    throw new Error(`Expected live-sync action ${action}; observed ${JSON.stringify(observed)}`, { cause: error });
  }
  return frame.evaluate(({ count, expected }) => {
    return window.__ecLiveSyncEvents.slice(count).find(event => event.action === expected);
  }, { count: previousCount, expected: action });
}

async function readTracePhases(frame, previousCount, incomingSequence) {
  return frame.evaluate(({ count, sequence }) => {
    return window.__jsepHandoffTrace
      .slice(count)
      .filter(item => item.mode === 'synchronize' && item.incomingSequence === sequence)
      .sort((left, right) => left.traceSequence - right.traceSequence)
      .map(item => item.phase);
  }, { count: previousCount, sequence: incomingSequence });
}

function record(records, scenario, expectedAction, event, roster, pass, detail = {}) {
  records.push({
    scenario,
    expected_action: expectedAction,
    observed_action: event?.action ?? '',
    status: pass ? 'pass' : 'fail',
    final_count: roster.length,
    unique_stable_ids: new Set(roster.map(row => row.plannerGuestId).filter(Boolean)).size,
    duplicate_rows_removed: event?.duplicateRowsRemoved ?? null,
    protocol_completion_latency_ms: event?.completionLatencyMs ?? event?.latencyMs ?? null,
    ...detail,
  });
}

function evaluateBrowserContract({
  source,
  before,
  after,
  decision,
  incomingSequence,
  watermarkBefore,
  watermarkAfter,
  authoritativeSourceCount,
  phases,
}) {
  const startedAt = performance.now();
  const report = checkWeddingSeatingHandoff({
    mode: 'synchronize',
    sourcePersons: source,
    destinationBefore: before,
    destinationAfter: after,
    completedBefore: before.filter(row => row.isWin === true),
    completedAfter: after.filter(row => row.isWin === true),
    scenario: {
      expectedOrigin: seatingOrigin,
      expectedPeer: 'bound-parent',
      authoritativeSourceCount,
      incomingSequence,
      acceptedSequenceBefore: watermarkBefore,
      persistedSequenceBefore: watermarkBefore,
      persistenceOutcome: 'success',
    },
    execution: {
      observedOrigin: seatingOrigin,
      observedPeer: 'bound-parent',
      decision,
      phases,
      acceptedSequenceAfter: watermarkAfter,
      persistedSequenceAfter: watermarkAfter,
      atomicCommit: true,
    },
  });
  return {
    passed: report.oracles.O2.passed,
    fields: {
      contract_o0_pass: report.oracles.O0.passed,
      contract_o1_pass: report.oracles.O1.passed,
      contract_o1k_pass: report.oracles.O1K.passed,
      contract_o2_pass: report.oracles.O2.passed,
      contract_failure_codes: report.oracles.O2.failures.map(item => item.code).join('|'),
      contract_check_ms: performance.now() - startedAt,
      receiver_trace_phases: phases.join('|'),
    },
  };
}

const plan = makePlan(rosterSize);
const rows = personRows(plan);
const records = [];
if (serverMode === 'production') {
  if (!existsSync(join(root, '.next', 'BUILD_ID')))
    throw new Error('Production evaluation requires a completed Next.js build (.next/BUILD_ID)');
  if (!existsSync(join(lotteryDir, 'dist', 'index.html')))
    throw new Error('Production evaluation requires a completed lottery build (log-lottery/dist/index.html)');
}
const nextServer = startServer(
  process.execPath,
  [join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), serverMode === 'production' ? 'start' : 'dev', '-p', String(seatingPort), '-H', seatingUrl.hostname],
  root,
  { NEXT_PUBLIC_LOTTERY_IMPORT_URL: `${lotteryOrigin}/log-lottery/config/person/all` },
);
const lotteryServer = startServer(
  process.execPath,
  [
    join(lotteryDir, 'node_modules', 'vite', 'bin', 'vite.js'),
    ...(serverMode === 'production' ? ['preview'] : []),
    '--host', lotteryUrl.hostname,
    '--port', String(lotteryPort),
    '--strictPort',
  ],
  lotteryDir,
  { VITE_WEDDING_SEATING_ORIGINS: seatingOrigin },
);

let browser;
let browserVersion = '';
try {
  await Promise.all([
    waitForHttp(`${seatingOrigin}/guests?lang=zh`),
    waitForHttp(`${lotteryOrigin}/log-lottery/config/person/all`),
  ]);
  browser = await launcher.launch({ headless: true });
  browserVersion = browser.version();
  const context = await browser.newContext({ locale: 'zh-CN' });
  await context.addInitScript(({ plannerOrigin, receiverOrigin, seatingPlan }) => {
    if (window.location.origin === plannerOrigin) {
      localStorage.setItem('wedding-seating-plan', JSON.stringify(seatingPlan));
      localStorage.setItem('weddingSeats:lotteryLiveSync', '1');
    }
    if (window.location.origin === receiverOrigin) {
      window.__ecLiveSyncEvents = [];
      window.__jsepHandoffTrace = [];
      window.addEventListener('wedding-seating-live-sync-result', event => {
        window.__ecLiveSyncEvents.push(event.detail);
      });
      window.addEventListener('wedding-seating-handoff-trace', event => {
        window.__jsepHandoffTrace.push(event.detail);
      });
    }
  }, { plannerOrigin: seatingOrigin, receiverOrigin: lotteryOrigin, seatingPlan: plan });

  const page = await context.newPage();
  await page.goto(`${seatingOrigin}/guests?lang=zh`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
  const iframeLocator = page.locator('iframe[src*="liveSync=1"]');
  await iframeLocator.waitFor({ state: 'attached', timeout: 30_000 });
  const iframeHandle = await iframeLocator.elementHandle();
  const frame = await iframeHandle?.contentFrame();
  if (!frame)
    throw new Error('Live-sync receiver frame was not attached');
  await frame.waitForFunction(() => Array.isArray(window.__ecLiveSyncEvents) && window.__ecLiveSyncEvents.some(event => event.action === 'merge'), null, {
    timeout: 30_000,
  });
  await page.waitForTimeout(3_500);
  let roster = await waitForRoster(frame, rosterSize);
  let events = await frame.evaluate(() => window.__ecLiveSyncEvents);
  let oracle = exactPublicState(roster, rows);
  record(records, 'initial-sync', 'merge', events.at(-1), roster, oracle.pass, {
    ...oracle,
    contract_o0_pass: null,
    contract_o1_pass: null,
    contract_o1k_pass: null,
    contract_o2_pass: null,
    contract_failure_codes: '',
    contract_check_ms: null,
    receiver_trace_phases: '',
    contract_boundary: 'Excluded from contract replay because startup retries can create multiple accepted pre-states before the final observed event.',
  });

  let seq = 10_000;
  const initialWatermark = Math.max(0, ...events.map(item => Number(item.seq)).filter(Number.isFinite));
  let eventCount = events.length;
  let traceCount = await frame.evaluate(() => window.__jsepHandoffTrace.length);
  let before = roster.map(row => ({ ...row }));
  await inject(page, { persons: rows, seq, guestCount: rosterSize, plannerGuestTotal: rosterSize, tableCount: plan.tables.length, sentAt: Date.now() });
  let event = await waitForAction(frame, eventCount, 'merge');
  let phases = await readTracePhases(frame, traceCount, seq);
  roster = await waitForRoster(frame, rosterSize);
  oracle = exactPublicState(roster, rows);
  let contract = evaluateBrowserContract({
    source: rows,
    before,
    after: roster,
    decision: 'merge',
    incomingSequence: seq,
    watermarkBefore: initialWatermark,
    watermarkAfter: seq,
    authoritativeSourceCount: rosterSize,
    phases,
  });
  record(records, 'control-current-sequence', 'merge', event, roster, oracle.pass && contract.passed, { ...oracle, ...contract.fields });

  events = await frame.evaluate(() => window.__ecLiveSyncEvents);
  eventCount = events.length;
  traceCount = await frame.evaluate(() => window.__jsepHandoffTrace.length);
  before = roster.map(row => ({ ...row }));
  await inject(page, { persons: rows, seq, guestCount: rosterSize, plannerGuestTotal: rosterSize, tableCount: plan.tables.length, sentAt: Date.now() });
  event = await waitForAction(frame, eventCount, 'ignore-stale');
  phases = await readTracePhases(frame, traceCount, seq);
  roster = await waitForRoster(frame, rosterSize);
  oracle = exactPublicState(roster, rows);
  contract = evaluateBrowserContract({
    source: rows,
    before,
    after: roster,
    decision: 'ignore-stale',
    incomingSequence: seq,
    watermarkBefore: seq,
    watermarkAfter: seq,
    authoritativeSourceCount: rosterSize,
    phases,
  });
  record(records, 'duplicate-sequence', 'ignore-stale', event, roster, oracle.pass && contract.passed, { ...oracle, ...contract.fields });

  events = await frame.evaluate(() => window.__ecLiveSyncEvents);
  eventCount = events.length;
  traceCount = await frame.evaluate(() => window.__jsepHandoffTrace.length);
  before = roster.map(row => ({ ...row }));
  await inject(page, { persons: [], seq: ++seq, guestCount: rosterSize, plannerGuestTotal: rosterSize, tableCount: plan.tables.length, sentAt: Date.now() });
  event = await waitForAction(frame, eventCount, 'skip-empty');
  phases = await readTracePhases(frame, traceCount, seq);
  roster = await waitForRoster(frame, rosterSize);
  oracle = exactPublicState(roster, rows);
  contract = evaluateBrowserContract({
    source: [],
    before,
    after: roster,
    decision: 'skip-empty',
    incomingSequence: seq,
    watermarkBefore: seq - 1,
    watermarkAfter: seq - 1,
    authoritativeSourceCount: rosterSize,
    phases,
  });
  record(records, 'transient-empty', 'skip-empty', event, roster, oracle.pass && contract.passed, { ...oracle, ...contract.fields });

  events = await frame.evaluate(() => window.__ecLiveSyncEvents);
  eventCount = events.length;
  traceCount = await frame.evaluate(() => window.__jsepHandoffTrace.length);
  before = roster.map(row => ({ ...row }));
  const duplicateRows = [...rows, { ...rows[0], department: 'Table corrected' }];
  await inject(page, { persons: duplicateRows, seq: ++seq, guestCount: duplicateRows.length, plannerGuestTotal: rosterSize, tableCount: plan.tables.length, sentAt: Date.now() });
  event = await waitForAction(frame, eventCount, 'merge');
  phases = await readTracePhases(frame, traceCount, seq);
  roster = await waitForRoster(frame, rosterSize);
  const corrected = roster.find(row => row.plannerGuestId === rows[0].plannerGuestId);
  const correctedRows = rows.map((row, index) => index === 0 ? { ...row, department: 'Table corrected' } : row);
  oracle = exactPublicState(roster, correctedRows);
  contract = evaluateBrowserContract({
    source: duplicateRows,
    before,
    after: roster,
    decision: 'merge',
    incomingSequence: seq,
    watermarkBefore: seq - 2,
    watermarkAfter: seq,
    authoritativeSourceCount: duplicateRows.length,
    phases,
  });
  record(
    records,
    'duplicate-row-last-wins',
    'merge',
    event,
    roster,
    oracle.pass && corrected?.department === 'Table corrected' && event?.duplicateRowsRemoved === 1 && contract.passed,
    { ...oracle, ...contract.fields, corrected_department: corrected?.department ?? '' },
  );

  events = await frame.evaluate(() => window.__ecLiveSyncEvents);
  eventCount = events.length;
  traceCount = await frame.evaluate(() => window.__jsepHandoffTrace.length);
  before = roster.map(row => ({ ...row }));
  await inject(page, { persons: [], seq: ++seq, guestCount: 0, plannerGuestTotal: 0, tableCount: 0, sentAt: Date.now() });
  event = await waitForAction(frame, eventCount, 'clear');
  phases = await readTracePhases(frame, traceCount, seq);
  roster = await waitForRoster(frame, 0);
  oracle = exactPublicState(roster, []);
  contract = evaluateBrowserContract({
    source: [],
    before,
    after: roster,
    decision: 'clear',
    incomingSequence: seq,
    watermarkBefore: seq - 1,
    watermarkAfter: seq,
    authoritativeSourceCount: 0,
    phases,
  });
  record(records, 'intentional-clear', 'clear', event, roster, oracle.pass && contract.passed, { ...oracle, ...contract.fields });

  events = await frame.evaluate(() => window.__ecLiveSyncEvents);
  eventCount = events.length;
  traceCount = await frame.evaluate(() => window.__jsepHandoffTrace.length);
  before = roster.map(row => ({ ...row }));
  await inject(page, { persons: rows, seq: ++seq, guestCount: rosterSize, plannerGuestTotal: rosterSize, tableCount: plan.tables.length, sentAt: Date.now() });
  event = await waitForAction(frame, eventCount, 'merge');
  phases = await readTracePhases(frame, traceCount, seq);
  roster = await waitForRoster(frame, rosterSize);
  oracle = exactPublicState(roster, rows);
  contract = evaluateBrowserContract({
    source: rows,
    before,
    after: roster,
    decision: 'merge',
    incomingSequence: seq,
    watermarkBefore: seq - 1,
    watermarkAfter: seq,
    authoritativeSourceCount: rosterSize,
    phases,
  });
  record(records, 'recovery-after-clear', 'merge', event, roster, oracle.pass && contract.passed, { ...oracle, ...contract.fields });

  await context.close();
}
finally {
  await browser?.close();
  await Promise.all([stop(nextServer), stop(lotteryServer)]);
}

mkdirSync(rawDir, { recursive: true });
const timestamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '');
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const output = {
  metadata: {
    generated_at_utc: new Date().toISOString(),
    baseline_commit: 'e63c8d1',
    evaluated_commit: commit,
    evaluated_source_sha256: sourceHash(),
    node: process.version,
    browser: browserName,
    browser_version: browserVersion,
    roster_size: rosterSize,
    server_mode: serverMode,
    seating_origin: seatingOrigin,
    lottery_origin: lotteryOrigin,
    next_build_id_sha256: serverMode === 'production' ? fileSha256(join(root, '.next', 'BUILD_ID')) : null,
    lottery_dist_index_sha256: serverMode === 'production' ? fileSha256(join(lotteryDir, 'dist', 'index.html')) : null,
    contract_observation_boundary: 'Offline O0/O1/O1K/O2 evaluation over synthetic source payloads, metadata-only receiver phase events, and IndexedDB pre/post states after production-path live-sync results. The startup retry row is excluded from contract replay.',
  },
  records,
};
const outputPath = join(rawDir, `${batchLabel}_${browserName}_${timestamp}.json`);
writeFileSync(outputPath, `${JSON.stringify(output, null, 2)}\n`);
console.log(records.map(item => `${item.scenario}: ${item.status}`).join('\n'));
console.log(`Raw JSON: ${outputPath}`);
if (records.some(item => item.status !== 'pass'))
  process.exitCode = 1;
