import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cpus, freemem, platform, release, totalmem } from 'node:os'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import fc from 'fast-check'
import type { Arbitrary } from 'fast-check'
import type { HandoffClauseId, HandoffOracleId } from '../../log-lottery/src/utils/stateHandoffContract'
import type {
    WeddingSeatingContractObservation,
    WeddingSeatingContractPerson,
} from '../../log-lottery/src/utils/weddingSeatingContractAdapter'
import { checkWeddingSeatingHandoff } from '../../log-lottery/src/utils/weddingSeatingContractAdapter'

interface SeedInput {
    ids: number[]
    sequence: number
    left: string
    middle: string
    right: string
    declaredCount: number
}

interface FaultCatalogue {
    seeded_faults: Array<{
        id: string
        clause: HandoffClauseId
    }>
}

interface GenerativeFault {
    id: string
    clause: HandoffClauseId
    mode: 'replace' | 'synchronize'
    build: (input: SeedInput) => WeddingSeatingContractObservation
}

interface CounterexampleRecord {
    fault_id: string
    target_clause: HandoffClauseId
    mode: GenerativeFault['mode']
    oracle: HandoffOracleId
    seed: number
    max_cases: number
    detected: boolean
    cases_to_counterexample: number | null
    skipped_cases: number
    shrinks: number
    counterexample_path: string | null
    counterexample: string | null
    target_clause_detected: boolean | null
    first_failed_assertion: string | null
    elapsed_ms: number
}

interface CounterexampleSummary {
    fault_id: string
    target_clause: HandoffClauseId
    mode: GenerativeFault['mode']
    oracle: HandoffOracleId
    seeds: number
    detected_seeds: number
    detection_rate: number
    median_cases_to_counterexample: number | null
    median_shrinks: number | null
}

const evaluationDir = dirname(dirname(fileURLToPath(import.meta.url)))
const root = dirname(evaluationDir)
const jsepDir = join(evaluationDir, 'jsep')
const rawDir = join(jsepDir, 'results', 'raw')
const processedDir = join(jsepDir, 'results', 'processed')
const maxCases = Number(process.env.JSEP_COUNTEREXAMPLE_MAX_CASES ?? '200')
const seeds = (process.env.JSEP_COUNTEREXAMPLE_SEEDS
    ?? '2026082601,2026082602,2026082603,2026082604,2026082605,2026082606,2026082607,2026082608,2026082609,2026082610')
    .split(',')
    .map(value => Number(value.trim()))
const runId = (process.env.JSEP_COUNTEREXAMPLE_RUN_ID
    ?? `jsep_counterexamples_pilot_${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_')

if (!Number.isSafeInteger(maxCases) || maxCases < 1)
    throw new Error('JSEP_COUNTEREXAMPLE_MAX_CASES must be a positive safe integer')
if (seeds.length === 0 || seeds.some(seed => !Number.isSafeInteger(seed)))
    throw new Error('JSEP_COUNTEREXAMPLE_SEEDS must contain safe integers')
if (new Set(seeds).size !== seeds.length)
    throw new Error('JSEP_COUNTEREXAMPLE_SEEDS must not contain duplicates')

function clone<T>(value: T): T {
    return structuredClone(value)
}

function person(
    plannerGuestId: string,
    index: number,
    overrides: Partial<WeddingSeatingContractPerson> = {},
): WeddingSeatingContractPerson {
    const completed = index === 0
    return {
        id: `destination-${plannerGuestId}`,
        plannerGuestId,
        uid: String(index + 1),
        name: `Earlier ${plannerGuestId}`,
        department: `Earlier group ${index + 1}`,
        identity: `type-${index % 3}`,
        avatar: '',
        isWin: completed,
        prizeName: completed ? ['Material A'] : [],
        prizeId: completed ? ['material-a'] : [],
        prizeTime: completed ? ['2026-08-26 12:00:00'] : [],
        ...overrides,
    }
}

function baseSynchronization(input: SeedInput): WeddingSeatingContractObservation {
    const sourcePersons = input.ids.map((id, index) => ({
        uid: id,
        plannerGuestId: `source-${id}`,
        name: `Updated ${id}`,
        department: `Group ${(id % 7) + 1}`,
        identity: `type-${index % 3}`,
        avatar: '',
    }))
    const destinationBefore = sourcePersons.map((row, index) => person(row.plannerGuestId, index))
    const destinationAfter = sourcePersons.map((row, index) => person(row.plannerGuestId, index, {
        ...row,
        uid: String(row.uid),
        id: destinationBefore[index].id,
        isWin: destinationBefore[index].isWin,
        prizeName: destinationBefore[index].prizeName,
        prizeId: destinationBefore[index].prizeId,
        prizeTime: destinationBefore[index].prizeTime,
    }))
    return {
        mode: 'synchronize',
        sourcePersons,
        destinationBefore,
        destinationAfter,
        completedBefore: destinationBefore.filter(record => record.isWin),
        completedAfter: destinationAfter.filter(record => record.isWin),
        scenario: {
            expectedOrigin: 'https://source.test',
            expectedPeer: 'bound-parent',
            incomingSequence: input.sequence + 1,
            acceptedSequenceBefore: input.sequence,
            persistedSequenceBefore: input.sequence,
            persistenceOutcome: 'success',
        },
        execution: {
            observedOrigin: 'https://source.test',
            observedPeer: 'bound-parent',
            decision: 'merge',
            phases: ['message-received', 'commit-started', 'commit-succeeded', 'completion-success'],
            acceptedSequenceAfter: input.sequence + 1,
            persistedSequenceAfter: input.sequence + 1,
            atomicCommit: true,
        },
    }
}

function baseReplacement(input: SeedInput): WeddingSeatingContractObservation {
    const sync = baseSynchronization(input)
    return {
        ...sync,
        mode: 'replace',
        destinationAfter: sync.destinationAfter.map((record, index) => ({
            ...record,
            id: `replacement-${index + 1}`,
            isWin: false,
            prizeName: [],
            prizeId: [],
            prizeTime: [],
        })),
        completedAfter: [],
        scenario: {
            expectedOrigin: 'https://source.test',
            expectedPeer: 'opened-child',
            persistenceOutcome: 'success',
        },
        execution: {
            observedOrigin: 'https://source.test',
            observedPeer: 'opened-child',
            decision: 'replace',
            phases: ['ready-received', 'transfer-sent', 'commit-started', 'commit-succeeded', 'completion-success'],
            atomicCommit: true,
        },
    }
}

const faults: GenerativeFault[] = [
    {
        id: 'JSEP-M01',
        clause: 'I1',
        mode: 'synchronize',
        build(input) {
            const observation = baseSynchronization(input)
            const first = observation.destinationAfter[0]
            const second = observation.destinationAfter[1]
            observation.destinationAfter = [
                { ...first, name: second.name, department: second.department, identity: second.identity },
                { ...second, name: first.name, department: first.department, identity: first.identity },
                ...observation.destinationAfter.slice(2),
            ]
            return observation
        },
    },
    {
        id: 'JSEP-M02',
        clause: 'I1',
        mode: 'synchronize',
        build(input) {
            const uid = input.ids[0]
            const sourcePersons = [
                { uid, name: `${input.left}|${input.middle}`, department: input.right, identity: '', avatar: '' },
                { uid, name: input.left, department: `${input.middle}|${input.right}`, identity: '', avatar: '' },
            ]
            const retained = sourcePersons[1]
            return {
                mode: 'synchronize',
                sourcePersons,
                destinationBefore: [],
                destinationAfter: [{
                    id: 'collision-survivor',
                    uid: String(uid),
                    name: retained.name,
                    department: retained.department,
                    identity: retained.identity,
                    avatar: '',
                }],
                scenario: {
                    expectedOrigin: 'https://source.test',
                    expectedPeer: 'bound-parent',
                    incomingSequence: input.sequence + 1,
                    acceptedSequenceBefore: input.sequence,
                    persistedSequenceBefore: input.sequence,
                    persistenceOutcome: 'success',
                },
                execution: {
                    observedOrigin: 'https://source.test',
                    observedPeer: 'bound-parent',
                    decision: 'merge',
                    phases: ['message-received', 'commit-started', 'commit-succeeded', 'completion-success'],
                    acceptedSequenceAfter: input.sequence + 1,
                    persistedSequenceAfter: input.sequence + 1,
                    atomicCommit: true,
                },
            }
        },
    },
    {
        id: 'JSEP-M07',
        clause: 'I2',
        mode: 'synchronize',
        build(input) {
            const observation = baseSynchronization(input)
            observation.destinationAfter = observation.destinationAfter.map((record, index) => ({
                ...record,
                id: `recreated-${index + 1}`,
                isWin: false,
                prizeName: [],
                prizeId: [],
                prizeTime: [],
            }))
            observation.completedAfter = []
            return observation
        },
    },
    {
        id: 'JSEP-M09',
        clause: 'I2',
        mode: 'synchronize',
        build(input) {
            const observation = baseSynchronization(input)
            observation.destinationAfter = observation.destinationAfter.map(record => ({
                ...record,
                isWin: false,
                prizeName: [],
                prizeId: [],
                prizeTime: [],
            }))
            observation.completedAfter = []
            return observation
        },
    },
    {
        id: 'JSEP-M13',
        clause: 'I3',
        mode: 'synchronize',
        build(input) {
            const observation = baseSynchronization(input)
            observation.execution = { ...observation.execution, observedPeer: 'same-origin-sibling' }
            return observation
        },
    },
    {
        id: 'JSEP-M14',
        clause: 'I3',
        mode: 'replace',
        build(input) {
            const observation = baseReplacement(input)
            observation.execution = {
                ...observation.execution,
                phases: ['transfer-sent', 'ready-received', 'commit-started', 'commit-succeeded', 'completion-success'],
            }
            return observation
        },
    },
    {
        id: 'JSEP-M15',
        clause: 'I3',
        mode: 'synchronize',
        build(input) {
            const observation = baseSynchronization(input)
            observation.scenario = {
                ...observation.scenario,
                incomingSequence: input.sequence,
            }
            observation.execution = {
                ...observation.execution,
                acceptedSequenceAfter: input.sequence,
                persistedSequenceAfter: input.sequence,
            }
            return observation
        },
    },
    {
        id: 'JSEP-M16',
        clause: 'I3',
        mode: 'synchronize',
        build(input) {
            const observation = baseSynchronization(input)
            observation.sourcePersons = []
            observation.destinationAfter = []
            observation.completedAfter = []
            observation.scenario = {
                ...observation.scenario,
                authoritativeSourceCount: input.declaredCount,
            }
            observation.execution = { ...observation.execution, decision: 'clear' }
            return observation
        },
    },
    {
        id: 'JSEP-M18',
        clause: 'I3',
        mode: 'synchronize',
        build(input) {
            const observation = baseSynchronization(input)
            observation.destinationAfter = clone(observation.destinationBefore)
            observation.completedAfter = clone(observation.completedBefore ?? [])
            observation.scenario = { ...observation.scenario, persistenceOutcome: 'failure' }
            observation.execution = {
                ...observation.execution,
                phases: ['message-received', 'commit-started', 'commit-failed', 'completion-failure'],
                acceptedSequenceAfter: input.sequence + 1,
                persistedSequenceAfter: input.sequence,
            }
            return observation
        },
    },
    {
        id: 'JSEP-M19',
        clause: 'I4',
        mode: 'synchronize',
        build(input) {
            const observation = baseSynchronization(input)
            observation.execution = {
                ...observation.execution,
                phases: ['message-received', 'commit-started', 'completion-success', 'commit-succeeded'],
            }
            return observation
        },
    },
    {
        id: 'JSEP-M20',
        clause: 'I4',
        mode: 'synchronize',
        build(input) {
            const observation = baseSynchronization(input)
            observation.destinationAfter = clone(observation.destinationBefore)
            observation.completedAfter = clone(observation.completedBefore ?? [])
            observation.scenario = { ...observation.scenario, persistenceOutcome: 'failure' }
            observation.execution = {
                ...observation.execution,
                phases: ['message-received', 'commit-started', 'commit-failed', 'completion-success'],
                acceptedSequenceAfter: input.sequence,
                persistedSequenceAfter: input.sequence,
            }
            return observation
        },
    },
]

const catalogue = JSON.parse(readFileSync(join(jsepDir, 'fault-catalogue.json'), 'utf8')) as FaultCatalogue
const catalogueById = new Map(catalogue.seeded_faults.map(entry => [entry.id, entry]))
if (new Set(faults.map(fault => fault.id)).size !== faults.length)
    throw new Error('Generative fault IDs must be unique')
for (const fault of faults) {
    const catalogueEntry = catalogueById.get(fault.id)
    if (!catalogueEntry)
        throw new Error(`Generative fault is absent from the frozen catalogue: ${fault.id}`)
    if (catalogueEntry.clause !== fault.clause)
        throw new Error(`Target clause drift for ${fault.id}: ${fault.clause} != ${catalogueEntry.clause}`)
}

const textPart: Arbitrary<string> = fc.array(
    fc.constantFrom('A', 'B', 'C', '1', '2', '3', '张', '李', '友', '-', '_'),
    { minLength: 1, maxLength: 6 },
).map(parts => parts.join(''))
const inputArbitrary: Arbitrary<SeedInput> = fc.record({
    ids: fc.uniqueArray(fc.integer({ min: 1, max: 1_000_000 }), { minLength: 2, maxLength: 8 }),
    sequence: fc.integer({ min: 1, max: 1_000_000 }),
    left: textPart,
    middle: textPart,
    right: textPart,
    declaredCount: fc.integer({ min: 1, max: 10_000 }),
})

function round(value: number): number {
    return Number(value.toFixed(6))
}

function percentile(sorted: readonly number[], probability: number): number {
    if (sorted.length === 0)
        return Number.NaN
    const index = (sorted.length - 1) * probability
    const lower = Math.floor(index)
    const upper = Math.ceil(index)
    if (lower === upper)
        return sorted[lower]
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower)
}

const records: CounterexampleRecord[] = []
for (const fault of faults) {
    for (const oracle of ['O0', 'O1', 'O2'] as const) {
        for (const seed of seeds) {
            const started = performance.now()
            const details = fc.check(fc.property(inputArbitrary, (input) => {
                return checkWeddingSeatingHandoff(fault.build(input)).oracles[oracle].passed
            }), {
                seed,
                numRuns: maxCases,
            })
            const counterexampleInput = details.counterexample?.[0] as SeedInput | undefined
            const report = counterexampleInput
                ? checkWeddingSeatingHandoff(fault.build(counterexampleInput))
                : undefined
            records.push({
                fault_id: fault.id,
                target_clause: fault.clause,
                mode: fault.mode,
                oracle,
                seed,
                max_cases: maxCases,
                detected: details.failed,
                cases_to_counterexample: details.failed ? details.numRuns : null,
                skipped_cases: details.numSkips,
                shrinks: details.numShrinks,
                counterexample_path: details.counterexamplePath,
                counterexample: counterexampleInput === undefined ? null : fc.stringify(counterexampleInput),
                target_clause_detected: report === undefined ? null : !report.clauses[fault.clause].passed,
                first_failed_assertion: report?.clauses[fault.clause].failures[0]?.code ?? null,
                elapsed_ms: round(performance.now() - started),
            })
        }
    }
}

const summaries: CounterexampleSummary[] = []
for (const fault of faults) {
    for (const oracle of ['O0', 'O1', 'O2'] as const) {
        const subset = records.filter(record => record.fault_id === fault.id && record.oracle === oracle)
        const detected = subset.filter(record => record.detected)
        const cases = detected
            .map(record => record.cases_to_counterexample)
            .filter((value): value is number => value !== null)
            .sort((left, right) => left - right)
        const shrinks = detected.map(record => record.shrinks).sort((left, right) => left - right)
        summaries.push({
            fault_id: fault.id,
            target_clause: fault.clause,
            mode: fault.mode,
            oracle,
            seeds: subset.length,
            detected_seeds: detected.length,
            detection_rate: round(detected.length / subset.length),
            median_cases_to_counterexample: cases.length > 0 ? round(percentile(cases, 0.5)) : null,
            median_shrinks: shrinks.length > 0 ? round(percentile(shrinks, 0.5)) : null,
        })
    }
}

const invalidO2Counterexamples = records.filter(record => (
    record.oracle === 'O2'
    && record.detected
    && record.target_clause_detected !== true
))
if (invalidO2Counterexamples.length > 0) {
    throw new Error(`O2 counterexample missed its target clause for: ${invalidO2Counterexamples.map(record => `${record.fault_id}/${record.seed}`).join(', ')}`)
}

function sourceHash(): string {
    const files = [
        'log-lottery/src/utils/stateHandoffContract.ts',
        'log-lottery/src/utils/weddingSeatingContractAdapter.ts',
        'research-evaluation/jsep/PROTOCOL.md',
        'research-evaluation/jsep/fault-catalogue.json',
        'research-evaluation/scripts/run-jsep-counterexamples.ts',
    ]
    const hash = createHash('sha256')
    for (const file of files) {
        hash.update(file)
        hash.update(readFileSync(join(root, file)))
    }
    return hash.digest('hex')
}

function csvCell(value: unknown): string {
    if (value === null || value === undefined)
        return ''
    const text = String(value)
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function toCsv<T extends object>(rows: readonly T[]): string {
    const columns = Object.keys(rows[0]) as Array<keyof T>
    return [
        columns.join(','),
        ...rows.map(row => columns.map(column => csvCell(row[column])).join(',')),
    ].join('\n')
}

const gitStatus = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()
const fastCheckPackage = JSON.parse(readFileSync(join(root, 'node_modules', 'fast-check', 'package.json'), 'utf8')) as { version: string }
const metadata = {
    generated_at_utc: new Date().toISOString(),
    run_id: runId,
    run_class: gitStatus.length === 0 ? 'formal-candidate' : 'pilot-dirty-worktree',
    evaluated_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    working_tree_dirty: gitStatus.length > 0,
    source_sha256: sourceHash(),
    fast_check_version: fastCheckPackage.version,
    node: process.version,
    operating_system: `${platform()} ${release()}`,
    logical_processors: cpus().length,
    total_memory_bytes: totalmem(),
    free_memory_bytes_at_summary: freemem(),
    faults: faults.length,
    oracles: ['O0', 'O1', 'O2'],
    seeds,
    maximum_cases_per_seed: maxCases,
    executions: records.length,
    analysis_unit: 'fault; seeds are repeated search runs',
    boundary: 'Generated counterexamples for contract-boundary fault operators using synthetic records; not defect prevalence, exhaustive proof, browser timing, or field evidence.',
}

mkdirSync(rawDir, { recursive: true })
mkdirSync(processedDir, { recursive: true })
const rawPath = join(rawDir, `${runId}.json`)
const recordsPath = join(rawDir, `${runId}_records.csv`)
const summaryPath = join(processedDir, `${runId}_summary.csv`)
for (const path of [rawPath, recordsPath, summaryPath]) {
    if (existsSync(path) && process.env.JSEP_ALLOW_OVERWRITE !== '1')
        throw new Error(`Refusing to overwrite existing run: ${path}`)
}

writeFileSync(rawPath, `${JSON.stringify({ metadata, summaries, records }, null, 2)}\n`)
writeFileSync(recordsPath, `${toCsv(records)}\n`)
writeFileSync(summaryPath, `${toCsv(summaries)}\n`)

console.log(JSON.stringify(metadata, null, 2))
console.table(summaries)
console.log(`Raw JSON: ${rawPath}`)
console.log(`Records CSV: ${recordsPath}`)
console.log(`Summary CSV: ${summaryPath}`)
