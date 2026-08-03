import { createHash } from 'node:crypto';
import { execFileSync, spawn } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, renameSync, writeFileSync } from 'node:fs';
import { cpus, release, totalmem } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium, firefox, webkit } from 'playwright';

const evaluationDir = dirname(dirname(fileURLToPath(import.meta.url)));
const root = dirname(evaluationDir);
const lotteryDir = join(root, 'log-lottery');
const rawDir = join(evaluationDir, 'results', 'raw');
const seatingOrigin = process.env.EVAL_SEATING_ORIGIN ?? 'http://localhost:3101';
const lotteryOrigin = process.env.EVAL_LOTTERY_ORIGIN ?? 'http://localhost:6721';
const serverMode = process.env.EVAL_SERVER_MODE ?? 'development';
if (!['development', 'production'].includes(serverMode))
  throw new Error(`Unsupported EVAL_SERVER_MODE: ${serverMode}`);
const sizes = (process.env.EVAL_SIZES ?? '50,200,500')
  .split(',')
  .map(value => Number(value.trim()))
  .filter(value => Number.isInteger(value) && value > 0);
const repetitions = Math.max(1, Number(process.env.EVAL_REPETITIONS ?? '1'));
const warmups = Math.max(0, Number(process.env.EVAL_WARMUPS ?? '1'));
const browserNames = (process.env.EVAL_BROWSERS ?? 'chromium')
  .split(',')
  .map(value => value.trim())
  .filter(Boolean);
const launchers = { chromium, firefox, webkit };
const batchLabel = (process.env.EVAL_BATCH_LABEL ?? 'bridge_pilot').replace(/[^a-zA-Z0-9_-]/g, '_');
const generatedRunId = new Date().toISOString().replaceAll(':', '').replaceAll('.', '');
const runId = (process.env.EVAL_RUN_ID ?? generatedRunId).replace(/[^a-zA-Z0-9_-]/g, '_');
const resume = process.env.EVAL_RESUME === '1';

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
    if (lines.length > 80)
      lines.splice(0, lines.length - 80);
  };
  child.stdout.on('data', capture);
  child.stderr.on('data', capture);
  child.on('error', error => capture(`${name}: ${error.message}`));
  return { name, child, lines };
}

async function waitForHttp(url, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok)
        return;
      lastError = new Error(`HTTP ${response.status}`);
    }
    catch (error) {
      lastError = error;
    }
    await new Promise(resolve => setTimeout(resolve, 400));
  }
  throw new Error(`Server did not become ready at ${url}: ${lastError?.message ?? 'timeout'}`);
}

async function stopServer(server) {
  if (server.child.exitCode !== null)
    return;
  server.child.kill();
  await Promise.race([
    new Promise(resolve => server.child.once('exit', resolve)),
    new Promise(resolve => setTimeout(resolve, 3_000)),
  ]);
}

async function readLotteryRoster(page) {
  return page.evaluate(() => new Promise((resolve, reject) => {
    const open = indexedDB.open('person');
    open.onerror = () => reject(open.error ?? new Error('Unable to open person database'));
    open.onsuccess = () => {
      const db = open.result;
      if (!db.objectStoreNames.contains('allPersonList')) {
        db.close();
        resolve([]);
        return;
      }
      const transaction = db.transaction('allPersonList', 'readonly');
      const request = transaction.objectStore('allPersonList').getAll();
      request.onerror = () => reject(request.error ?? new Error('Unable to read person roster'));
      request.onsuccess = () => {
        db.close();
        resolve(request.result);
      };
    };
  }));
}

async function waitForRoster(page, expectedCount, timeoutMs = 60_000) {
  const deadline = Date.now() + timeoutMs;
  let rows = [];
  while (Date.now() < deadline) {
    rows = await readLotteryRoster(page);
    if (rows.length === expectedCount)
      return rows;
    await page.waitForTimeout(100);
  }
  return rows;
}

async function runCase(browserName, browserVersion, browser, size, repetition, phase) {
  const plan = makePlan(size);
  const context = await browser.newContext({ locale: 'zh-CN', viewport: { width: 1280, height: 800 } });
  await context.addInitScript(({ plannerOrigin, receiverOrigin, seatingPlan }) => {
    if (window.location.origin === plannerOrigin)
      localStorage.setItem('wedding-seating-plan', JSON.stringify(seatingPlan));
    if (window.location.origin === receiverOrigin) {
      window.__ecBridgeEvents = [];
      window.addEventListener('wedding-seating-bridge-imported', event => {
        window.__ecBridgeEvents.push(event.detail);
      });
    }
  }, { plannerOrigin: seatingOrigin, receiverOrigin: lotteryOrigin, seatingPlan: plan });

  const page = await context.newPage();
  const startedAt = Date.now();
  try {
    await page.goto(`${seatingOrigin}/preview?lang=zh`, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const importButton = page.getByRole('button', { name: /一键导入婚礼抽奖/ });
    await importButton.waitFor({ state: 'visible', timeout: 30_000 });
    await importButton.click();
    const popupPromise = context.waitForEvent('page', { timeout: 30_000 });
    await page.getByRole('button', { name: '确定', exact: true }).click();
    const popup = await popupPromise;
    await popup.waitForLoadState('domcontentloaded');
    await popup.waitForFunction(() => Array.isArray(window.__ecBridgeEvents) && window.__ecBridgeEvents.length > 0, null, {
      timeout: 30_000,
    });
    const event = await popup.evaluate(() => window.__ecBridgeEvents.at(-1));
    const rows = await waitForRoster(popup, size);
    const stableIds = rows.map(row => row.plannerGuestId).filter(Boolean);
    const stableIdSet = new Set(stableIds);
    const expectedIds = new Set(plan.guests.map(guest => guest.id));
    const exactIdentitySet = stableIdSet.size === expectedIds.size
      && [...expectedIds].every(id => stableIdSet.has(id));

    return {
      browser: browserName,
      browser_version: browserVersion,
      roster_size: size,
      repetition,
      phase,
      status: rows.length === size && exactIdentitySet ? 'pass' : 'fail',
      final_count: rows.length,
      unique_stable_ids: stableIdSet.size,
      duplicate_stable_ids: stableIds.length - stableIdSet.size,
      exact_identity_set: exactIdentitySet,
      receiver_rows_accepted: event?.rowsAccepted ?? null,
      receiver_preparation_ms: event?.receiverPreparationMs ?? null,
      receiver_persistence_ms: event?.receiverPersistenceMs ?? null,
      protocol_completion_latency_ms: event?.completionLatencyMs ?? null,
      observed_wall_time_ms: Date.now() - startedAt,
      error_class: '',
      error_message: '',
    };
  }
  catch (error) {
    return {
      browser: browserName,
      browser_version: browserVersion,
      roster_size: size,
      repetition,
      phase,
      status: 'error',
      final_count: null,
      unique_stable_ids: null,
      duplicate_stable_ids: null,
      exact_identity_set: false,
      receiver_rows_accepted: null,
      protocol_completion_latency_ms: null,
      observed_wall_time_ms: Date.now() - startedAt,
      error_class: error instanceof Error ? error.name : 'UnknownError',
      error_message: error instanceof Error ? error.message : String(error),
    };
  }
  finally {
    await context.close();
  }
}

function csvCell(value) {
  if (value === null || value === undefined)
    return '';
  const text = String(value);
  return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function sourceHash() {
  const files = [
    'package.json',
    'src/lib/lotteryBridge.ts',
    'log-lottery/src/store/personConfig.ts',
    'log-lottery/src/utils/dexie/index.ts',
    'log-lottery/src/utils/seatingSyncExclusions.ts',
    'log-lottery/src/utils/weddingSeatingBridge.ts',
    'log-lottery/src/utils/weddingSeatingLiveSync.ts',
    'log-lottery/src/utils/weddingSeatingMerge.ts',
    'log-lottery/src/utils/weddingSeatingProtocol.ts',
    'research-evaluation/scripts/run-bridge-e2e.mjs',
  ];
  const hash = createHash('sha256');
  for (const file of files) {
    hash.update(file);
    hash.update(readFileSync(join(root, file)));
  }
  return hash.digest('hex');
}

function recordKey(record) {
  return [record.browser, record.roster_size, record.phase, record.repetition].join('|');
}

function writeAtomic(path, content) {
  const temporaryPath = `${path}.tmp`;
  writeFileSync(temporaryPath, content);
  renameSync(temporaryPath, path);
}

function fileSha256(path) {
  return existsSync(path)
    ? createHash('sha256').update(readFileSync(path)).digest('hex')
    : null;
}

mkdirSync(rawDir, { recursive: true });
const commit = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim();
const evaluatedSourceSha256 = sourceHash();
const jsonPath = join(rawDir, `${batchLabel}_${runId}.json`);
const csvPath = join(rawDir, `${batchLabel}_${runId}.csv`);
const prior = resume && existsSync(jsonPath)
  ? JSON.parse(readFileSync(jsonPath, 'utf8'))
  : null;
const records = Array.isArray(prior?.records) ? prior.records : [];
const browserVersions = { ...(prior?.metadata?.browser_versions ?? {}) };
const metadata = {
  generated_at_utc: prior?.metadata?.generated_at_utc ?? new Date().toISOString(),
  baseline_commit: 'e63c8d1',
  evaluated_commit: commit,
  evaluated_source_sha256: evaluatedSourceSha256,
  node: process.version,
  playwright: JSON.parse(readFileSync(join(root, 'node_modules', 'playwright', 'package.json'), 'utf8')).version,
  platform: `${process.platform}-${process.arch}`,
  os_release: release(),
  cpu_model: cpus()[0]?.model ?? 'unknown',
  logical_cpu_count: cpus().length,
  total_memory_bytes: totalmem(),
  seating_origin: seatingOrigin,
  lottery_origin: lotteryOrigin,
  server_mode: serverMode,
  next_build_id_sha256: serverMode === 'production' ? fileSha256(join(root, '.next', 'BUILD_ID')) : null,
  lottery_dist_index_sha256: serverMode === 'production' ? fileSha256(join(lotteryDir, 'dist', 'index.html')) : null,
  browsers_requested: browserNames,
  browser_versions: browserVersions,
  roster_sizes: sizes,
  repetitions,
  warmups_per_browser_size_cell: warmups,
};
if (prior) {
  const comparable = ['evaluated_commit', 'evaluated_source_sha256', 'node', 'playwright', 'platform', 'seating_origin', 'lottery_origin', 'server_mode', 'next_build_id_sha256', 'lottery_dist_index_sha256', 'repetitions', 'warmups_per_browser_size_cell'];
  for (const field of comparable) {
    if (JSON.stringify(prior.metadata?.[field]) !== JSON.stringify(metadata[field]))
      throw new Error(`Cannot resume: metadata mismatch for ${field}`);
  }
  for (const field of ['browsers_requested', 'roster_sizes']) {
    if (JSON.stringify(prior.metadata?.[field]) !== JSON.stringify(metadata[field]))
      throw new Error(`Cannot resume: metadata mismatch for ${field}`);
  }
}
const completedKeys = new Set(records.map(recordKey));

function writeCheckpoint(runStatus) {
  const checkpointMetadata = {
    ...metadata,
    browser_versions: browserVersions,
    run_status: runStatus,
    checkpointed_at_utc: new Date().toISOString(),
    completed_at_utc: runStatus === 'complete' ? new Date().toISOString() : null,
  };
  writeAtomic(jsonPath, `${JSON.stringify({ metadata: checkpointMetadata, records }, null, 2)}\n`);
  const columns = [...new Set(records.flatMap(record => Object.keys(record)))];
  const csv = columns.length
    ? [columns.join(','), ...records.map(record => columns.map(column => csvCell(record[column])).join(','))].join('\n')
    : '';
  writeAtomic(csvPath, csv ? `${csv}\n` : '');
}

writeCheckpoint('running');
if (serverMode === 'production') {
  if (!existsSync(join(root, '.next', 'BUILD_ID')))
    throw new Error('Production evaluation requires a completed Next.js build (.next/BUILD_ID)');
  if (!existsSync(join(lotteryDir, 'dist', 'index.html')))
    throw new Error('Production evaluation requires a completed lottery build (log-lottery/dist/index.html)');
}
const nextServer = startServer(
  'seating',
  process.execPath,
  [join(root, 'node_modules', 'next', 'dist', 'bin', 'next'), serverMode === 'production' ? 'start' : 'dev', '-p', '3101'],
  root,
  { NEXT_PUBLIC_LOTTERY_IMPORT_URL: `${lotteryOrigin}/log-lottery/config/person/all` },
);
const lotteryServer = startServer(
  'lottery',
  process.execPath,
  [
    join(lotteryDir, 'node_modules', 'vite', 'bin', 'vite.js'),
    ...(serverMode === 'production' ? ['preview'] : []),
    '--host', 'localhost',
    '--port', '6721',
    '--strictPort',
  ],
  lotteryDir,
  { VITE_WEDDING_SEATING_ORIGINS: seatingOrigin },
);

try {
  await Promise.all([
    waitForHttp(`${seatingOrigin}/preview?lang=zh`),
    waitForHttp(`${lotteryOrigin}/log-lottery/config/person/all`),
  ]);

  for (const browserName of browserNames) {
    const launcher = launchers[browserName];
    if (!launcher) {
      records.push({ browser: browserName, roster_size: null, repetition: null, status: 'unsupported-browser-name' });
      writeCheckpoint('running');
      continue;
    }
    let browser;
    try {
      browser = await launcher.launch({ headless: true });
      const browserVersion = browser.version();
      browserVersions[browserName] = browserVersion;
      for (const size of sizes) {
        for (let warmup = 1; warmup <= warmups; warmup++) {
          if (completedKeys.has([browserName, size, 'warmup', warmup].join('|')))
            continue;
          const record = await runCase(browserName, browserVersion, browser, size, warmup, 'warmup');
          records.push(record);
          completedKeys.add(recordKey(record));
          writeCheckpoint('running');
          process.stdout.write(`${browserName} n=${size} warmup=${warmup}: ${record.status}\n`);
        }
        for (let repetition = 1; repetition <= repetitions; repetition++) {
          if (completedKeys.has([browserName, size, 'measurement', repetition].join('|')))
            continue;
          const record = await runCase(browserName, browserVersion, browser, size, repetition, 'measurement');
          records.push(record);
          completedKeys.add(recordKey(record));
          writeCheckpoint('running');
          process.stdout.write(`${browserName} n=${size} run=${repetition}: ${record.status}\n`);
        }
      }
    }
    catch (error) {
      records.push({
        browser: browserName,
        roster_size: null,
        repetition: null,
        status: 'browser-launch-error',
        error_class: error instanceof Error ? error.name : 'UnknownError',
        error_message: error instanceof Error ? error.message : String(error),
      });
      writeCheckpoint('running');
    }
    finally {
      await browser?.close();
    }
  }
}
catch (error) {
  const serverLogs = [nextServer, lotteryServer]
    .map(server => `${server.name}:\n${server.lines.join('\n')}`)
    .join('\n\n');
  throw new Error(`${error instanceof Error ? error.message : String(error)}\n\n${serverLogs}`);
}
finally {
  await Promise.all([stopServer(nextServer), stopServer(lotteryServer)]);
}

writeCheckpoint('complete');

console.log(`Raw JSON: ${jsonPath}`);
console.log(`Raw CSV: ${csvPath}`);
if (records.some(record => record.status !== 'pass'))
  process.exitCode = 1;
