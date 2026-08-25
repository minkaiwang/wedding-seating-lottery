import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cpus, freemem, platform, release, totalmem } from 'node:os'
import { dirname, join } from 'node:path'
import { performance } from 'node:perf_hooks'
import { fileURLToPath } from 'node:url'
import type { WeddingSeatingContractPerson } from '../../log-lottery/src/utils/weddingSeatingContractAdapter'
import { checkWeddingSeatingHandoff } from '../../log-lottery/src/utils/weddingSeatingContractAdapter'
import { normalizeWeddingSeatingRows } from '../../log-lottery/src/utils/weddingSeatingProtocol'

interface CostRecord {
    mode: 'replace' | 'synchronize'
    roster_size: number
    repetition: number
    surface_ms: number
    contract_ms: number
    incremental_ms: number
    contract_to_surface_ratio: number | null
    incremental_share_of_contract: number | null
}

interface SummaryRecord {
    mode: CostRecord['mode']
    roster_size: number
    repetitions: number
    surface_median_ms: number
    surface_iqr_ms: number
    surface_p95_ms: number
    contract_median_ms: number
    contract_iqr_ms: number
    incremental_median_ms: number
    incremental_iqr_ms: number
    contract_p95_ms: number
    incremental_p95_ms: number
    incremental_share_median: number
}

const evaluationDir = dirname(dirname(fileURLToPath(import.meta.url)))
const root = dirname(evaluationDir)
const jsepDir = join(evaluationDir, 'jsep')
const rawDir = join(jsepDir, 'results', 'raw')
const processedDir = join(jsepDir, 'results', 'processed')
const sizes = (process.env.JSEP_COST_SIZES ?? '50,200,500,1000')
    .split(',')
    .map(value => Number(value.trim()))
    .filter(value => Number.isSafeInteger(value) && value > 0)
const repetitions = Number(process.env.JSEP_COST_REPETITIONS ?? '200')
const warmups = Number(process.env.JSEP_COST_WARMUPS ?? '25')
const runId = (process.env.JSEP_COST_RUN_ID ?? `jsep_contract_cost_pilot_${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_')

if (sizes.length === 0)
    throw new Error('JSEP_COST_SIZES must include at least one positive integer')
if (!Number.isSafeInteger(repetitions) || repetitions < 1)
    throw new Error('JSEP_COST_REPETITIONS must be a positive safe integer')
if (!Number.isSafeInteger(warmups) || warmups < 0)
    throw new Error('JSEP_COST_WARMUPS must be a non-negative safe integer')

function sourceRows(size: number) {
    return Array.from({ length: size }, (_, index) => ({
        uid: index + 1,
        plannerGuestId: `source-${String(index + 1).padStart(6, '0')}`,
        name: `Synthetic ${String(index + 1).padStart(6, '0')}`,
        department: `Group ${Math.floor(index / 10) + 1}`,
        identity: `type-${index % 5}`,
        avatar: '',
    }))
}

function beforePeople(size: number): WeddingSeatingContractPerson[] {
    return Array.from({ length: size }, (_, index) => {
        const completed = index % 5 === 0
        return {
            id: `destination-${String(index + 1).padStart(6, '0')}`,
            uid: String(index + 1),
            plannerGuestId: `source-${String(index + 1).padStart(6, '0')}`,
            name: `Earlier ${String(index + 1).padStart(6, '0')}`,
            department: `Earlier group ${Math.floor(index / 10) + 1}`,
            identity: `type-${index % 5}`,
            avatar: '',
            isWin: completed,
            prizeName: completed ? [`Material ${index % 7}`] : [],
            prizeId: completed ? [`material-${index % 7}`] : [],
            prizeTime: completed ? ['2026-08-26 12:00:00'] : [],
        }
    })
}

function afterPeople(
    rows: ReturnType<typeof sourceRows>,
    before: readonly WeddingSeatingContractPerson[],
    mode: CostRecord['mode'],
): WeddingSeatingContractPerson[] {
    return rows.map((row, index) => {
        const prior = before[index]
        return {
            ...row,
            uid: String(row.uid),
            id: mode === 'synchronize' ? prior.id : `replacement-${String(index + 1).padStart(6, '0')}`,
            isWin: mode === 'synchronize' ? prior.isWin : false,
            prizeName: mode === 'synchronize' ? prior.prizeName : [],
            prizeId: mode === 'synchronize' ? prior.prizeId : [],
            prizeTime: mode === 'synchronize' ? prior.prizeTime : [],
        }
    })
}

function publicState(record: { name: string, department: string, identity: string, avatar: string }) {
    return JSON.stringify([record.name, record.department, record.identity, record.avatar])
}

function surfaceOracle(source: unknown, destination: readonly WeddingSeatingContractPerson[]): boolean {
    const normalized = normalizeWeddingSeatingRows(source)
    const lastByIdentity = new Map<string, (typeof normalized)[number]>()
    for (const row of normalized)
        lastByIdentity.set(row.plannerGuestId ?? String(row.uid), row)
    if (lastByIdentity.size !== destination.length)
        return false
    const expected = [...lastByIdentity.values()].map(publicState).sort()
    const actual = destination.map(record => publicState({
        name: record.name,
        department: record.department,
        identity: record.identity,
        avatar: record.avatar,
    })).sort()
    return JSON.stringify(expected) === JSON.stringify(actual)
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

function round(value: number): number {
    return Number(value.toFixed(6))
}

function interquartileRange(sorted: readonly number[]): number {
    return percentile(sorted, 0.75) - percentile(sorted, 0.25)
}

function measure<T>(operation: () => T): { elapsed: number, value: T } {
    const started = performance.now()
    const value = operation()
    return { elapsed: performance.now() - started, value }
}

const records: CostRecord[] = []
for (const mode of ['replace', 'synchronize'] as const) {
    for (const size of sizes) {
        const source = sourceRows(size)
        const before = beforePeople(size)
        const after = afterPeople(source, before, mode)
        const completedBefore = before.filter(record => record.isWin)
        const completedAfter = mode === 'synchronize' ? after.filter(record => record.isWin) : []
        const observation = {
            mode,
            sourcePersons: source,
            destinationBefore: before,
            destinationAfter: after,
            completedBefore,
            completedAfter,
            scenario: {
                expectedOrigin: 'https://source.test',
                expectedPeer: mode === 'replace' ? 'opened-child' : 'bound-parent',
                incomingSequence: mode === 'synchronize' ? 2 : undefined,
                acceptedSequenceBefore: mode === 'synchronize' ? 1 : undefined,
                persistedSequenceBefore: mode === 'synchronize' ? 1 : undefined,
                persistenceOutcome: 'success' as const,
            },
            execution: {
                observedOrigin: 'https://source.test',
                observedPeer: mode === 'replace' ? 'opened-child' : 'bound-parent',
                decision: mode === 'replace' ? 'replace' as const : 'merge' as const,
                phases: mode === 'replace'
                    ? ['ready-received', 'transfer-sent', 'commit-started', 'commit-succeeded', 'completion-success'] as const
                    : ['message-received', 'commit-started', 'commit-succeeded', 'completion-success'] as const,
                acceptedSequenceAfter: mode === 'synchronize' ? 2 : undefined,
                persistedSequenceAfter: mode === 'synchronize' ? 2 : undefined,
                atomicCommit: true,
            },
        }

        for (let repetition = -warmups; repetition < repetitions; repetition++) {
            let surface
            let contract
            if (repetition % 2 === 0) {
                surface = measure(() => surfaceOracle(source, after))
                contract = measure(() => checkWeddingSeatingHandoff(observation))
            }
            else {
                contract = measure(() => checkWeddingSeatingHandoff(observation))
                surface = measure(() => surfaceOracle(source, after))
            }
            if (!surface.value)
                throw new Error(`Surface baseline failed for ${mode} size ${size}`)
            if (!contract.value.oracles.O2.passed)
                throw new Error(`Contract failed for ${mode} size ${size}: ${contract.value.oracles.O2.failures.map(item => item.code).join(',')}`)
            if (repetition >= 0) {
                records.push({
                    mode,
                    roster_size: size,
                    repetition: repetition + 1,
                    surface_ms: round(surface.elapsed),
                    contract_ms: round(contract.elapsed),
                    incremental_ms: round(contract.elapsed - surface.elapsed),
                    contract_to_surface_ratio: surface.elapsed > 0 ? round(contract.elapsed / surface.elapsed) : null,
                    incremental_share_of_contract: contract.elapsed > 0
                        ? round((contract.elapsed - surface.elapsed) / contract.elapsed)
                        : null,
                })
            }
        }
    }
}

const summaries: SummaryRecord[] = []
for (const mode of ['replace', 'synchronize'] as const) {
    for (const size of sizes) {
        const cell = records.filter(record => record.mode === mode && record.roster_size === size)
        const surface = cell.map(record => record.surface_ms).sort((left, right) => left - right)
        const contract = cell.map(record => record.contract_ms).sort((left, right) => left - right)
        const incremental = cell.map(record => record.incremental_ms).sort((left, right) => left - right)
        const incrementalShare = cell
            .map(record => record.incremental_share_of_contract)
            .filter((value): value is number => value !== null)
            .sort((left, right) => left - right)
        summaries.push({
            mode,
            roster_size: size,
            repetitions: cell.length,
            surface_median_ms: round(percentile(surface, 0.5)),
            surface_iqr_ms: round(interquartileRange(surface)),
            surface_p95_ms: round(percentile(surface, 0.95)),
            contract_median_ms: round(percentile(contract, 0.5)),
            contract_iqr_ms: round(interquartileRange(contract)),
            incremental_median_ms: round(percentile(incremental, 0.5)),
            incremental_iqr_ms: round(interquartileRange(incremental)),
            contract_p95_ms: round(percentile(contract, 0.95)),
            incremental_p95_ms: round(percentile(incremental, 0.95)),
            incremental_share_median: round(percentile(incrementalShare, 0.5)),
        })
    }
}

function sourceHash(): string {
    const files = [
        'log-lottery/src/utils/stateHandoffContract.ts',
        'log-lottery/src/utils/weddingSeatingContractAdapter.ts',
        'research-evaluation/jsep/PROTOCOL.md',
        'research-evaluation/scripts/run-jsep-contract-cost.ts',
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
const metadata = {
    generated_at_utc: new Date().toISOString(),
    run_id: runId,
    run_class: gitStatus.length === 0 ? 'formal-candidate' : 'pilot-dirty-worktree',
    evaluated_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    working_tree_dirty: gitStatus.length > 0,
    source_sha256: sourceHash(),
    node: process.version,
    operating_system: `${platform()} ${release()}`,
    logical_processors: cpus().length,
    total_memory_bytes: totalmem(),
    free_memory_bytes_at_summary: freemem(),
    sizes,
    modes: ['replace', 'synchronize'],
    warmups_per_cell: warmups,
    repetitions_per_cell: repetitions,
    measured_records: records.length,
    boundary: 'Pure in-process adapter and oracle cost. Excludes browser messaging, rendering, persistence, network, and operator time.',
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

writeFileSync(rawPath, `${JSON.stringify({ metadata, summaries }, null, 2)}\n`)
writeFileSync(recordsPath, `${toCsv(records)}\n`)
writeFileSync(summaryPath, `${toCsv(summaries)}\n`)

console.log(JSON.stringify(metadata, null, 2))
console.table(summaries)
console.log(`Raw JSON: ${rawPath}`)
console.log(`Records CSV: ${recordsPath}`)
console.log(`Summary CSV: ${summaryPath}`)
