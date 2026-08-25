import { createHash } from 'node:crypto';
import { spawn, spawnSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  readFileSync,
  renameSync,
  writeFileSync,
} from 'node:fs';
import { dirname, isAbsolute, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const evaluationDir = dirname(dirname(fileURLToPath(import.meta.url)));
const root = dirname(evaluationDir);
const lotteryDir = join(root, 'log-lottery');
const browserScript = join(evaluationDir, 'scripts', 'run-jsep-holdout-browser.mjs');
const defaultManifestPath = join(evaluationDir, 'jsep', 'holdout-mutants.json');
const expectedIds = Array.from({ length: 8 }, (_, index) => `JSEP-H${String(index + 1).padStart(2, '0')}`);
const expectedBrowsers = ['chromium', 'firefox', 'webkit'];

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

function executableName(command) {
  if (process.platform !== 'win32')
    return command;
  if (command.toLowerCase() === 'npm')
    return 'npm.exe';
  if (command.toLowerCase() === 'npx')
    return 'npx.exe';
  return command;
}

function commandText(command, args) {
  return [command, ...args].map(item => /\s/.test(item) ? JSON.stringify(item) : item).join(' ');
}

async function runCommand(command, args, options = {}) {
  const startedAt = Date.now();
  const timeoutMs = options.timeoutMs ?? 900_000;
  const stdoutHash = createHash('sha256');
  const stderrHash = createHash('sha256');
  const stdoutLines = [];
  const stderrLines = [];
  const capture = (chunk, hash, lines) => {
    hash.update(chunk);
    lines.push(...String(chunk).split(/\r?\n/).filter(Boolean));
    if (lines.length > 160)
      lines.splice(0, lines.length - 160);
  };
  process.stdout.write(`[holdout] ${options.label ?? commandText(command, args)}\n`);
  return new Promise(resolvePromise => {
    const child = spawn(executableName(command), args, {
      cwd: options.cwd ?? root,
      env: { ...process.env, ...(options.env ?? {}) },
      windowsHide: true,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let timedOut = false;
    let spawnError = null;
    child.stdout.on('data', chunk => capture(chunk, stdoutHash, stdoutLines));
    child.stderr.on('data', chunk => capture(chunk, stderrHash, stderrLines));
    child.on('error', error => { spawnError = error; });
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill();
    }, timeoutMs);
    child.on('close', (code, signal) => {
      clearTimeout(timer);
      resolvePromise({
        command: commandText(command, args),
        cwd: options.cwd ?? root,
        started_at_utc: new Date(startedAt).toISOString(),
        duration_ms: Date.now() - startedAt,
        exit_code: code,
        signal,
        timed_out: timedOut,
        spawn_error: spawnError?.message ?? '',
        passed: code === 0 && !timedOut && spawnError === null,
        stdout_sha256: stdoutHash.digest('hex'),
        stderr_sha256: stderrHash.digest('hex'),
        stdout_tail: stdoutLines,
        stderr_tail: stderrLines,
      });
    });
  });
}

function gitText(args) {
  const result = runCommandSync('git', args, root);
  if (result.exitCode !== 0)
    throw new Error(`git ${args.join(' ')} failed: ${result.stderr}`);
  return result.stdout.trim();
}

function runCommandSync(command, args, cwd) {
  const result = spawnSync(executableName(command), args, {
    cwd,
    encoding: 'utf8',
    windowsHide: true,
    shell: false,
    maxBuffer: 16 * 1024 * 1024,
  });
  return {
    exitCode: result.status,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? result.error?.message ?? '',
  };
}

function normalizeLf(text) {
  return text.replaceAll('\r\n', '\n').replaceAll('\r', '\n');
}

function decodeUtf8(buffer, path) {
  const hasBom = buffer.length >= 3 && buffer[0] === 0xef && buffer[1] === 0xbb && buffer[2] === 0xbf;
  const body = hasBom ? buffer.subarray(3) : buffer;
  const text = body.toString('utf8');
  if (text.includes('\uFFFD'))
    throw new Error(`Mutation target is not valid UTF-8: ${path}`);
  return { hasBom, text };
}

function detectEol(text, path) {
  const crlfCount = (text.match(/\r\n/g) ?? []).length;
  const withoutCrLf = text.replaceAll('\r\n', '');
  const lfCount = (withoutCrLf.match(/\n/g) ?? []).length;
  const crCount = (withoutCrLf.match(/\r/g) ?? []).length;
  if (crCount > 0 || (crlfCount > 0 && lfCount > 0))
    throw new Error(`Mixed or lone-CR line endings are not allowed in mutation target: ${path}`);
  return {
    style: crlfCount > 0 ? 'CRLF' : 'LF',
    sequence: crlfCount > 0 ? '\r\n' : '\n',
    crlf_count: crlfCount,
    lf_count: lfCount,
  };
}

function countOccurrences(text, search) {
  if (search.length === 0)
    throw new Error('Manifest search string must not be empty');
  let count = 0;
  let offset = 0;
  while (true) {
    const index = text.indexOf(search, offset);
    if (index < 0)
      return count;
    count++;
    offset = index + search.length;
  }
}

function encodeWithEol(normalized, eol, hasBom) {
  const body = Buffer.from(eol === '\n' ? normalized : normalized.replaceAll('\n', eol), 'utf8');
  return hasBom ? Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), body]) : body;
}

function safeWorkspacePath(relativePath) {
  if (typeof relativePath !== 'string' || relativePath.length === 0 || isAbsolute(relativePath))
    throw new Error(`Manifest file must be a non-empty relative path: ${relativePath}`);
  const absolute = resolve(root, relativePath);
  const relativeToRoot = relative(root, absolute);
  if (relativeToRoot.startsWith('..') || isAbsolute(relativeToRoot))
    throw new Error(`Manifest path escapes the worktree: ${relativePath}`);
  return absolute;
}

function validateAndDescribeMutation(mutant) {
  const path = safeWorkspacePath(mutant.file);
  if (!existsSync(path))
    throw new Error(`${mutant.id} target does not exist: ${mutant.file}`);
  if (!Array.isArray(mutant.edits) || mutant.edits.length === 0)
    throw new Error(`${mutant.id} has no edits`);
  const original = readFileSync(path);
  const decoded = decodeUtf8(original, path);
  const eol = detectEol(decoded.text, path);
  let normalized = normalizeLf(decoded.text);
  const editChecks = [];
  for (let index = 0; index < mutant.edits.length; index++) {
    const edit = mutant.edits[index];
    const search = normalizeLf(String(edit.search ?? ''));
    const replacement = normalizeLf(String(edit.replacement ?? ''));
    const count = countOccurrences(normalized, search);
    editChecks.push({ edit_index: index, normalized_lf_search_count: count });
    if (count !== 1) {
      throw new Error(`${mutant.id} edit ${index} must match exactly once after LF normalization; observed ${count}`);
    }
    normalized = normalized.replace(search, replacement);
  }
  return {
    path,
    original,
    hasBom: decoded.hasBom,
    eol,
    normalizedMutated: normalized,
    original_sha256: sha256(original),
    mutated_sha256: sha256(encodeWithEol(normalized, eol.sequence, decoded.hasBom)),
    edit_checks: editChecks,
  };
}

function applyMutation(mutant) {
  const prepared = validateAndDescribeMutation(mutant);
  const mutatedBuffer = encodeWithEol(prepared.normalizedMutated, prepared.eol.sequence, prepared.hasBom);
  writeFileSync(prepared.path, mutatedBuffer);
  const readBack = readFileSync(prepared.path);
  const readBackDecoded = decodeUtf8(readBack, prepared.path);
  const readBackEol = detectEol(readBackDecoded.text, prepared.path);
  if (readBackEol.style !== prepared.eol.style)
    throw new Error(`${mutant.id} changed EOL from ${prepared.eol.style} to ${readBackEol.style}`);
  if (!readBack.equals(mutatedBuffer))
    throw new Error(`${mutant.id} mutation readback differs from written bytes`);
  return {
    ...prepared,
    mutatedBuffer,
    applied_at_utc: new Date().toISOString(),
  };
}

function restoreMutation(mutant, applied) {
  writeFileSync(applied.path, applied.original);
  const restored = readFileSync(applied.path);
  if (!restored.equals(applied.original))
    throw new Error(`${mutant.id} source restoration was not byte-exact`);
  const restoredDecoded = decodeUtf8(restored, applied.path);
  const restoredEol = detectEol(restoredDecoded.text, applied.path);
  if (restoredEol.style !== applied.eol.style)
    throw new Error(`${mutant.id} restoration changed EOL style`);
  return {
    restored_at_utc: new Date().toISOString(),
    restored_sha256: sha256(restored),
    byte_exact: true,
    eol_style: restoredEol.style,
  };
}

function trackedDiff() {
  return runCommandSync('git', ['diff', '--binary', '--'], root);
}

function cachedDiff() {
  return runCommandSync('git', ['diff', '--cached', '--binary', '--'], root);
}

function assertTrackedClean(label) {
  const worktreeDiff = trackedDiff();
  const indexDiff = cachedDiff();
  if (worktreeDiff.exitCode !== 0 || indexDiff.exitCode !== 0)
    throw new Error(`${label}: unable to inspect git diff`);
  if (worktreeDiff.stdout.length > 0 || indexDiff.stdout.length > 0) {
    throw new Error(`${label}: tracked worktree/index is not clean\n${worktreeDiff.stdout}\n${indexDiff.stdout}`);
  }
}

function statusEntries() {
  const result = runCommandSync('git', ['status', '--porcelain=v1', '--untracked-files=all'], root);
  if (result.exitCode !== 0)
    throw new Error(`Unable to read git status: ${result.stderr}`);
  return result.stdout.split(/\r?\n/).filter(Boolean);
}

function allowedUntrackedStatus(entry) {
  if (!entry.startsWith('?? '))
    return false;
  const path = entry.slice(3).replaceAll('\\', '/');
  return path === 'research-evaluation/jsep/holdout-mutants.json'
    || path === 'research-evaluation/scripts/run-jsep-holdout-browser.mjs'
    || path === 'research-evaluation/scripts/run-jsep-holdout-suite.mjs'
    || path.startsWith('research-evaluation/results/');
}

function assertDedicatedWorktreeAndClean(manifest) {
  const topLevel = resolve(gitText(['rev-parse', '--show-toplevel']));
  if (topLevel.toLowerCase() !== resolve(root).toLowerCase())
    throw new Error(`Script root ${root} differs from git top-level ${topLevel}`);
  const gitDir = resolve(root, gitText(['rev-parse', '--git-dir']));
  const commonDir = resolve(root, gitText(['rev-parse', '--git-common-dir']));
  if (gitDir.toLowerCase() === commonDir.toLowerCase())
    throw new Error('Holdout suite must run in a linked dedicated worktree, not the primary worktree');
  const head = gitText(['rev-parse', 'HEAD']);
  if (head !== manifest.application_base_commit) {
    throw new Error(`HEAD ${head} does not match frozen application_base_commit ${manifest.application_base_commit}`);
  }
  assertTrackedClean('initial preflight');
  const entries = statusEntries();
  const disallowed = entries.filter(entry => !allowedUntrackedStatus(entry));
  if (disallowed.length > 0)
    throw new Error(`Dedicated worktree has disallowed untracked/status entries:\n${disallowed.join('\n')}`);
  return {
    top_level: topLevel,
    git_dir: gitDir,
    common_git_dir: commonDir,
    linked_worktree: true,
    base_commit: head,
    allowed_untracked_entries: entries,
  };
}

function validateManifest(manifest) {
  if (!Array.isArray(manifest.mutants))
    throw new Error('Manifest mutants must be an array');
  const ids = manifest.mutants.map(item => item.id);
  if (stableValue(ids) !== stableValue(expectedIds))
    throw new Error(`Manifest IDs/order must be ${expectedIds.join(', ')}; observed ${ids.join(', ')}`);
  if (stableValue(manifest.browser_repetitions) !== stableValue(expectedBrowsers))
    throw new Error('Manifest browser_repetitions must be chromium, firefox, webkit');
  if (Number(manifest.synthetic_roster_size) !== 200)
    throw new Error('Manifest synthetic_roster_size must be 200');
  if (!Array.isArray(manifest.pre_o2_exclusion_rules) || manifest.pre_o2_exclusion_rules.length < 3)
    throw new Error('Manifest must retain the three preregistered exclusion rules');
  const descriptions = manifest.mutants.map(mutant => ({
    id: mutant.id,
    file: mutant.file,
    project: mutant.project,
    scenario: mutant.scenario,
    existing_test_command: mutant.existing_test_command,
    ...(() => {
      const prepared = validateAndDescribeMutation(mutant);
      return {
        original_eol_style: prepared.eol.style,
        original_sha256: prepared.original_sha256,
        prospective_mutated_sha256: prepared.mutated_sha256,
        edit_checks: prepared.edit_checks,
      };
    })(),
  }));
  return descriptions;
}

async function runBuildPair(label, buildEnv, timeoutMs) {
  const rootBuild = await runCommand('npm', ['run', 'build'], {
    cwd: root,
    env: buildEnv,
    timeoutMs,
    label: `${label}: Next production build`,
  });
  const lotteryBuild = await runCommand('npm', ['run', 'build'], {
    cwd: lotteryDir,
    env: buildEnv,
    timeoutMs,
    label: `${label}: Vite production build`,
  });
  return {
    label,
    passed: rootBuild.passed && lotteryBuild.passed,
    root: rootBuild,
    lottery: lotteryBuild,
    next_build_id_sha256: fileSha256(join(root, '.next', 'BUILD_ID')),
    lottery_dist_index_sha256: fileSha256(join(lotteryDir, 'dist', 'index.html')),
  };
}

async function runExistingTest(mutant, timeoutMs) {
  if (!Array.isArray(mutant.existing_test_command) || mutant.existing_test_command.length === 0)
    throw new Error(`${mutant.id} existing_test_command must be a non-empty argv array`);
  const [command, ...args] = mutant.existing_test_command.map(String);
  const cwd = mutant.project === 'lottery' ? lotteryDir : root;
  return runCommand(command, args, {
    cwd,
    timeoutMs,
    label: `${mutant.id}: existing test baseline`,
  });
}

async function runBrowserMatrix({ ids, variant, manifestPath, outputJson, outputCsv, seatingOrigin, lotteryOrigin, timeoutMs }) {
  const tsxCli = join(root, 'node_modules', 'tsx', 'dist', 'cli.mjs');
  if (!existsSync(tsxCli))
    throw new Error(`tsx CLI not found: ${tsxCli}`);
  const command = await runCommand(process.execPath, [
    tsxCli,
    browserScript,
    '--manifest', manifestPath,
    '--ids', ids.join(','),
    '--variant', variant,
    '--browsers', expectedBrowsers.join(','),
    '--seating-origin', seatingOrigin,
    '--lottery-origin', lotteryOrigin,
    '--timeout-ms', String(Math.min(timeoutMs, 120_000)),
    '--output-json', outputJson,
    '--output-csv', outputCsv,
  ], {
    cwd: root,
    timeoutMs,
    label: `${variant}: production browser matrix`,
  });
  let output = null;
  let parseError = '';
  if (existsSync(outputJson)) {
    try {
      output = JSON.parse(readFileSync(outputJson, 'utf8'));
    }
    catch (error) {
      parseError = error instanceof Error ? error.message : String(error);
    }
  }
  return { command, output, parse_error: parseError, output_json: outputJson, output_csv: outputCsv };
}

function makeExcludedRows(mutant, variant, rule, detail, controlRecords) {
  return expectedBrowsers.map(browser => {
    const control = controlRecords.find(item => item.holdout_id === mutant.id && item.browser === browser);
    return {
      holdout_id: mutant.id,
      scenario: mutant.scenario,
      variant,
      browser,
      browser_version: control?.browser_version ?? '',
      status: 'excluded',
      designated_path_reached: null,
      observed_decision: '',
      b_state_pass: null,
      b_state_failure_codes: [],
      o2_pass: null,
      o2_failure_codes: [],
      metadata_phases: [],
      event_wait_ms: null,
      observation_signature_sha256: null,
      fault_disposition: 'excluded',
      exclusion_rule: rule,
      exclusion_detail: detail,
      error_class: '',
      error_message: '',
    };
  });
}

function controlMap(records) {
  return new Map(records.map(record => [`${record.holdout_id}|${record.browser}`, record]));
}

function classifyBrowserOutcome(mutant, records, controls) {
  const complete = records.filter(item => item.status === 'complete');
  if (complete.length !== expectedBrowsers.length) {
    return {
      disposition: 'inconclusive-browser-error',
      exclusion_rule: '',
      detail: `${complete.length}/${expectedBrowsers.length} browser replications completed`,
    };
  }
  if (complete.every(item => item.designated_path_reached === false)) {
    return {
      disposition: 'excluded',
      exclusion_rule: 'designated-production-path-unreachable',
      detail: 'All three browser replications completed without reaching the designated path.',
    };
  }
  const controlsByKey = controlMap(controls);
  const equivalent = complete.every(item => {
    const control = controlsByKey.get(`${mutant.id}|${item.browser}`);
    return control?.observation_signature_sha256
      && control.observation_signature_sha256 === item.observation_signature_sha256;
  });
  if (equivalent) {
    return {
      disposition: 'excluded',
      exclusion_rule: 'behaviorally-equivalent-complete-observation',
      detail: 'Source summary, terminal action, trace, durable pre/post state, B-state, and O2 observations matched the control in all three browsers.',
    };
  }
  return { disposition: 'included', exclusion_rule: '', detail: '' };
}

function summarizeFault(mutant, records, testResult, buildResult, classification) {
  const complete = records.filter(item => item.status === 'complete');
  const bDetected = complete.map(item => item.b_state_pass === false);
  const o2Detected = complete.map(item => item.o2_pass === false);
  return {
    holdout_id: mutant.id,
    scenario: mutant.scenario,
    disposition: classification.disposition,
    exclusion_rule: classification.exclusion_rule,
    exclusion_detail: classification.detail,
    existing_test_command_passed: testResult?.passed ?? null,
    existing_tests_detected_fault: testResult ? !testResult.passed : null,
    production_build_passed: buildResult?.passed ?? null,
    browser_replications_completed: complete.length,
    b_state_detected_any_replication: bDetected.some(Boolean),
    b_state_detected_all_completed_replications: complete.length > 0 && bDetected.every(Boolean),
    o2_detected_any_replication: o2Detected.some(Boolean),
    o2_detected_all_completed_replications: complete.length > 0 && o2Detected.every(Boolean),
    o2_incremental_over_b_state_all_replications: complete.length === expectedBrowsers.length
      && complete.every(item => item.b_state_pass === true && item.o2_pass === false),
    browser_repetitions_are_technical_replications: true,
    fault_count_contribution: classification.disposition === 'included' ? 1 : 0,
  };
}

function suiteCsv(records) {
  const columns = [
    'holdout_id', 'scenario', 'variant', 'browser', 'browser_version', 'status',
    'fault_disposition', 'exclusion_rule', 'exclusion_detail',
    'existing_test_command_passed', 'production_build_passed',
    'designated_path_reached', 'observed_decision', 'terminal_kind', 'terminal_action',
    'b_state_pass', 'b_state_failure_codes', 'o2_pass', 'o2_failure_codes',
    'indexeddb_before_summary', 'indexeddb_at_done_summary', 'indexeddb_at_done_basis',
    'indexeddb_after_summary', 'metadata_phases', 'event_wait_ms',
    'done_send_call_epoch_ms', 'done_received_epoch_ms', 'on_done_ui_epoch_ms',
    'done_before_durable_commit', 'observation_signature_sha256',
    'error_class', 'error_message',
  ];
  return `${[
    columns.join(','),
    ...records.map(record => columns.map(column => csvCell(record[column])).join(',')),
  ].join('\n')}\n`;
}

function mutationDiffNames() {
  const result = runCommandSync('git', ['diff', '--name-only', '--'], root);
  if (result.exitCode !== 0)
    throw new Error(`Unable to inspect mutation diff: ${result.stderr}`);
  return result.stdout.split(/\r?\n/).filter(Boolean).map(item => item.replaceAll('\\', '/'));
}

const args = parseArgs(process.argv.slice(2));
const manifestPath = resolve(args.manifest ?? defaultManifestPath);
if (!existsSync(manifestPath))
  throw new Error(`Holdout manifest not found: ${manifestPath}`);
const manifestRelative = relative(root, manifestPath);
if (manifestRelative.startsWith('..') || isAbsolute(manifestRelative))
  throw new Error('Holdout manifest must be inside the dedicated worktree');
if (!existsSync(browserScript))
  throw new Error(`Holdout browser runner not found: ${browserScript}`);
const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
const runId = (args['run-id'] ?? new Date().toISOString().replaceAll(':', '').replaceAll('.', ''))
  .replace(/[^a-zA-Z0-9_-]/g, '_');
const seatingOrigin = args['seating-origin'] ?? 'http://127.0.0.1:3111';
const lotteryOrigin = args['lottery-origin'] ?? 'http://127.0.0.1:6811';
const testTimeoutMs = Math.max(60_000, Number(args['test-timeout-ms'] ?? '600000'));
const buildTimeoutMs = Math.max(120_000, Number(args['build-timeout-ms'] ?? '1200000'));
const browserTimeoutMs = Math.max(120_000, Number(args['browser-timeout-ms'] ?? '1800000'));
const rawDir = join(evaluationDir, 'results', 'raw', `jsep_holdout_${runId}`);
const processedDir = join(evaluationDir, 'results', 'processed', `jsep_holdout_${runId}`);
const outputJson = resolve(args['output-json'] ?? join(evaluationDir, 'results', 'raw', `jsep_holdout_suite_${runId}.json`));
const outputCsv = resolve(args['output-csv'] ?? join(evaluationDir, 'results', 'processed', `jsep_holdout_suite_${runId}.csv`));
mkdirSync(rawDir, { recursive: true });
mkdirSync(processedDir, { recursive: true });

const suite = {
  metadata: {
    generated_at_utc: new Date().toISOString(),
    run_id: runId,
    catalogue_version: manifest.catalogue_version,
    manifest_sha256: fileSha256(manifestPath),
    application_base_commit: manifest.application_base_commit,
    unit_of_analysis: manifest.unit_of_analysis,
    planned_faults: 8,
    planned_browser_cases: 48,
    browser_repetitions_are_technical_replications: true,
    synthetic_roster_size: manifest.synthetic_roster_size,
    seating_origin: seatingOrigin,
    lottery_origin: lotteryOrigin,
    status: 'preflight',
  },
  preflight: null,
  manifest_validation: null,
  base_build: null,
  control_browser_run: null,
  mutants: [],
  fault_summaries: [],
  records: [],
  final_base_rebuild: null,
  final_restoration: null,
};

function checkpoint(status) {
  suite.metadata.status = status;
  suite.metadata.checkpointed_at_utc = new Date().toISOString();
  writeAtomic(outputJson, `${JSON.stringify(suite, null, 2)}\n`);
  writeAtomic(outputCsv, suiteCsv(suite.records));
}

const buildEnv = {
  NEXT_PUBLIC_LOTTERY_IMPORT_URL: `${lotteryOrigin}/log-lottery/config/person/all`,
  VITE_WEDDING_SEATING_ORIGINS: seatingOrigin,
};

let fatalError = null;
try {
  suite.manifest_validation = validateManifest(manifest);
  suite.preflight = assertDedicatedWorktreeAndClean(manifest);
  checkpoint('base-build');

  suite.base_build = await runBuildPair('base', buildEnv, buildTimeoutMs);
  checkpoint('base-control-browser');
  if (!suite.base_build.passed)
    throw new Error('Base production build failed; holdout mutations were not started');

  const controlJson = join(rawDir, 'control.json');
  const controlCsv = join(processedDir, 'control.csv');
  suite.control_browser_run = await runBrowserMatrix({
    ids: expectedIds,
    variant: 'control',
    manifestPath,
    outputJson: controlJson,
    outputCsv: controlCsv,
    seatingOrigin,
    lotteryOrigin,
    timeoutMs: browserTimeoutMs,
  });
  const controlRecords = suite.control_browser_run.output?.records ?? [];
  suite.records.push(...controlRecords.map(record => ({
    ...record,
    fault_disposition: 'control',
    exclusion_rule: '',
    exclusion_detail: '',
    existing_test_command_passed: null,
    production_build_passed: suite.base_build.passed,
  })));
  checkpoint('control-validated');
  if (!suite.control_browser_run.command.passed
    || controlRecords.length !== 24
    || controlRecords.some(record => record.status !== 'complete'
      || record.designated_path_reached !== true
      || record.b_state_pass !== true
      || record.o2_pass !== true)) {
    throw new Error('The 8 x 3 correct-implementation control matrix did not complete with B-state and O2 passing');
  }

  for (const mutant of manifest.mutants) {
    checkpoint(`mutating-${mutant.id}`);
    const item = {
      id: mutant.id,
      scenario: mutant.scenario,
      file: mutant.file,
      pre_registered_exclusion_rules: manifest.pre_o2_exclusion_rules,
      mutation: null,
      existing_test: null,
      build: null,
      browser_run: null,
      restoration: null,
      classification: null,
      records: [],
    };
    suite.mutants.push(item);
    let applied = null;
    try {
      assertTrackedClean(`${mutant.id} before mutation`);
      applied = applyMutation(mutant);
      const changedPaths = mutationDiffNames();
      if (stableValue(changedPaths) !== stableValue([mutant.file.replaceAll('\\', '/')])) {
        throw new Error(`${mutant.id} changed unexpected tracked paths: ${changedPaths.join(', ')}`);
      }
      item.mutation = {
        file: mutant.file,
        original_sha256: applied.original_sha256,
        mutated_sha256: applied.mutated_sha256,
        original_eol_style: applied.eol.style,
        original_eol_counts: { crlf: applied.eol.crlf_count, lf: applied.eol.lf_count },
        edit_checks: applied.edit_checks,
        applied_at_utc: applied.applied_at_utc,
        changed_paths: changedPaths,
      };

      item.existing_test = await runExistingTest(mutant, testTimeoutMs);
      item.build = await runBuildPair(mutant.id, buildEnv, buildTimeoutMs);
      if (!item.build.passed) {
        item.classification = {
          disposition: 'excluded',
          exclusion_rule: 'mutation-does-not-compile-or-build',
          detail: 'At least one production application build failed under the frozen build environment.',
        };
        item.records = makeExcludedRows(
          mutant,
          mutant.id,
          item.classification.exclusion_rule,
          item.classification.detail,
          controlRecords,
        );
      }
      else {
        const mutantJson = join(rawDir, `${mutant.id}.json`);
        const mutantCsv = join(processedDir, `${mutant.id}.csv`);
        item.browser_run = await runBrowserMatrix({
          ids: [mutant.id],
          variant: mutant.id,
          manifestPath,
          outputJson: mutantJson,
          outputCsv: mutantCsv,
          seatingOrigin,
          lotteryOrigin,
          timeoutMs: browserTimeoutMs,
        });
        item.records = item.browser_run.output?.records ?? makeExcludedRows(
          mutant,
          mutant.id,
          'browser-output-unavailable',
          item.browser_run.parse_error || 'Browser runner produced no readable raw JSON.',
          controlRecords,
        );
        item.classification = classifyBrowserOutcome(mutant, item.records, controlRecords);
      }

      item.records = item.records.map(record => ({
        ...record,
        fault_disposition: item.classification.disposition,
        exclusion_rule: item.classification.exclusion_rule,
        exclusion_detail: item.classification.detail,
        existing_test_command_passed: item.existing_test.passed,
        production_build_passed: item.build.passed,
      }));
      suite.records.push(...item.records);
      suite.fault_summaries.push(summarizeFault(
        mutant,
        item.records,
        item.existing_test,
        item.build,
        item.classification,
      ));
    }
    finally {
      if (applied)
        item.restoration = restoreMutation(mutant, applied);
      assertTrackedClean(`${mutant.id} after byte-exact restoration`);
      item.diff_empty_after_restore = true;
      checkpoint(`restored-${mutant.id}`);
    }
  }

  suite.final_base_rebuild = await runBuildPair('final-restored-base', buildEnv, buildTimeoutMs);
  assertTrackedClean('final suite restoration');
  const finalHead = gitText(['rev-parse', 'HEAD']);
  suite.final_restoration = {
    verified_at_utc: new Date().toISOString(),
    tracked_diff_empty: true,
    head_unchanged: finalHead === manifest.application_base_commit,
    final_head: finalHead,
    base_build_restored: suite.final_base_rebuild.passed,
  };
  if (!suite.final_restoration.head_unchanged)
    throw new Error('HEAD changed during the holdout suite');
  if (!suite.final_base_rebuild.passed)
    throw new Error('Source was restored, but the final base production rebuild failed');
  if (suite.records.length !== 48)
    throw new Error(`Expected 48 browser-case rows, observed ${suite.records.length}`);
  checkpoint('complete');
}
catch (error) {
  fatalError = error;
  suite.metadata.fatal_error = {
    class: error instanceof Error ? error.name : 'UnknownError',
    message: error instanceof Error ? error.message : String(error),
  };
  try {
    assertTrackedClean('fatal-exit restoration check');
    suite.final_restoration = {
      ...(suite.final_restoration ?? {}),
      verified_at_utc: new Date().toISOString(),
      tracked_diff_empty: true,
      final_head: gitText(['rev-parse', 'HEAD']),
    };
  }
  catch (restorationError) {
    suite.metadata.restoration_error = {
      class: restorationError instanceof Error ? restorationError.name : 'UnknownError',
      message: restorationError instanceof Error ? restorationError.message : String(restorationError),
    };
  }
  checkpoint('failed');
}

console.log(`Raw JSON: ${outputJson}`);
console.log(`Processed CSV: ${outputCsv}`);
if (fatalError) {
  console.error(fatalError instanceof Error ? fatalError.stack ?? fatalError.message : String(fatalError));
  process.exitCode = 1;
}
