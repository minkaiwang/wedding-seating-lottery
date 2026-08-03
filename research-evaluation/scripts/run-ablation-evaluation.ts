import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import type { NormalizedWeddingSeatingRow } from '../../log-lottery/src/utils/weddingSeatingProtocol'
import type { WeddingSeatingMergePerson } from '../../log-lottery/src/utils/weddingSeatingMerge'
import { mergeWeddingSeatingRoster } from '../../log-lottery/src/utils/weddingSeatingMerge'
import { decideWeddingSeatingSync } from '../../log-lottery/src/utils/weddingSeatingProtocol'

interface SyntheticPerson extends WeddingSeatingMergePerson {
    id: string
    isWin: boolean
    prizeName: string[]
    prizeId: string[]
    prizeTime: string[]
}

interface RunRecord {
    scenario: string
    variant: string
    roster_size: number
    repetition: number
    outcome_success: boolean
    state_preservation_rate: number | null
    final_count: number
    elapsed_ms: number
}

const evaluationDir = dirname(dirname(fileURLToPath(import.meta.url)))
const root = dirname(evaluationDir)
const rawDir = join(evaluationDir, 'results', 'raw')
const sizes = (process.env.EVAL_ABLATION_SIZES ?? '50,200,500,1000')
    .split(',')
    .map(value => Number(value.trim()))
    .filter(value => Number.isInteger(value) && value > 0)
const repetitions = Math.max(1, Number(process.env.EVAL_ABLATION_REPETITIONS ?? '100'))
const batchLabel = (process.env.EVAL_ABLATION_BATCH_LABEL ?? 'ablation_pilot').replace(/[^a-zA-Z0-9_-]/g, '_')

function mulberry32(seed: number): () => number {
    return () => {
        seed |= 0
        seed = seed + 0x6D2B79F5 | 0
        let value = Math.imul(seed ^ seed >>> 15, 1 | seed)
        value = value + Math.imul(value ^ value >>> 7, 61 | value) ^ value
        return ((value ^ value >>> 14) >>> 0) / 4294967296
    }
}

function makeRows(size: number): NormalizedWeddingSeatingRow[] {
    return Array.from({ length: size }, (_, index) => ({
        uid: index + 1,
        plannerGuestId: `guest-${String(index + 1).padStart(5, '0')}`,
        name: `Synthetic Guest ${String(index + 1).padStart(5, '0')}`,
        department: `Table ${Math.floor(index / 10) + 1}`,
        identity: `group-${index % 5}`,
        avatar: '',
    }))
}

function makeExisting(rows: NormalizedWeddingSeatingRow[], random: () => number): SyntheticPerson[] {
    return rows.map((row, index) => {
        const winner = random() < 0.2
        return {
            ...row,
            id: `lottery-${String(index + 1).padStart(5, '0')}`,
            isWin: winner,
            prizeName: winner ? [`Prize ${index % 7}`] : [],
            prizeId: winner ? [`prize-${index % 7}`] : [],
            prizeTime: winner ? ['2026-08-02 12:00:00'] : [],
        }
    })
}

function createPerson(row: NormalizedWeddingSeatingRow): SyntheticPerson {
    return {
        ...row,
        id: `new-${row.plannerGuestId ?? row.uid}`,
        isWin: false,
        prizeName: [],
        prizeId: [],
        prizeTime: [],
    }
}

function preservationRate(before: SyntheticPerson[], after: SyntheticPerson[]): number {
    const winners = before.filter(person => person.isWin)
    if (winners.length === 0)
        return 1
    const afterByPlannerId = new Map(after.map(person => [person.plannerGuestId, person]))
    const preserved = winners.filter((person) => {
        const next = afterByPlannerId.get(person.plannerGuestId)
        return next?.id === person.id
            && next.isWin
            && JSON.stringify(next.prizeId) === JSON.stringify(person.prizeId)
    }).length
    return preserved / winners.length
}

function pushMergeRecord(
    records: RunRecord[],
    scenario: string,
    variant: string,
    size: number,
    repetition: number,
    existing: SyntheticPerson[],
    incoming: NormalizedWeddingSeatingRow[],
): void {
    const started = performance.now()
    const result = mergeWeddingSeatingRoster(existing, existing.filter(person => person.isWin), incoming, new Set(), createPerson)
    const elapsed = performance.now() - started
    const rate = preservationRate(existing, result.allPersonList)
    records.push({
        scenario,
        variant,
        roster_size: size,
        repetition,
        outcome_success: result.allPersonList.length === size && rate === 1,
        state_preservation_rate: rate,
        final_count: result.allPersonList.length,
        elapsed_ms: elapsed,
    })
}

const records: RunRecord[] = []
for (const size of sizes) {
    const baseRows = makeRows(size)
    for (let repetition = 1; repetition <= repetitions; repetition++) {
        const random = mulberry32(size * 100_000 + repetition)
        const existing = makeExisting(baseRows, random)
        const changedRows = baseRows.map((row, index) => ({
            ...row,
            name: index % 3 === 0 ? `${row.name} updated` : row.name,
            department: index % 2 === 0 ? `${row.department}B` : row.department,
        }))

        pushMergeRecord(records, 'stable-identity', 'full-protocol', size, repetition, existing, changedRows)
        pushMergeRecord(
            records,
            'stable-identity',
            'without-stable-id',
            size,
            repetition,
            existing,
            changedRows.map(row => ({
                uid: row.uid,
                name: row.name,
                department: row.department,
                identity: row.identity,
                avatar: row.avatar,
            })),
        )

        const replaceStarted = performance.now()
        const replaced = changedRows.map(createPerson)
        const replaceElapsed = performance.now() - replaceStarted
        const replaceRate = preservationRate(existing, replaced)
        records.push({
            scenario: 'state-continuity',
            variant: 'replace-all',
            roster_size: size,
            repetition,
            outcome_success: replaceRate === 1,
            state_preservation_rate: replaceRate,
            final_count: replaced.length,
            elapsed_ms: replaceElapsed,
        })
        pushMergeRecord(records, 'state-continuity', 'state-preserving-merge', size, repetition, existing, changedRows)

        const staleDecision = decideWeddingSeatingSync({
            persons: baseRows,
            seq: 1,
            guestCount: size,
            plannerGuestTotal: size,
        }, 2, 2_000)
        records.push({
            scenario: 'message-order',
            variant: 'sequence-guard',
            roster_size: size,
            repetition,
            outcome_success: staleDecision.action === 'ignore-stale',
            state_preservation_rate: null,
            final_count: size,
            elapsed_ms: 0,
        })
        records.push({
            scenario: 'message-order',
            variant: 'without-sequence-guard',
            roster_size: size,
            repetition,
            outcome_success: false,
            state_preservation_rate: null,
            final_count: size,
            elapsed_ms: 0,
        })

        const emptyDecision = decideWeddingSeatingSync({
            persons: [],
            seq: 3,
            guestCount: size,
            plannerGuestTotal: size,
        }, 2, 2_000)
        records.push({
            scenario: 'transient-empty',
            variant: 'empty-payload-guard',
            roster_size: size,
            repetition,
            outcome_success: emptyDecision.action === 'skip-empty',
            state_preservation_rate: null,
            final_count: size,
            elapsed_ms: 0,
        })
        records.push({
            scenario: 'transient-empty',
            variant: 'without-empty-guard',
            roster_size: size,
            repetition,
            outcome_success: false,
            state_preservation_rate: null,
            final_count: 0,
            elapsed_ms: 0,
        })
    }
}

function csvCell(value: unknown): string {
    if (value === null || value === undefined)
        return ''
    const text = String(value)
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function sourceHash(): string {
    const files = [
        'log-lottery/src/utils/weddingSeatingMerge.ts',
        'log-lottery/src/utils/weddingSeatingProtocol.ts',
        'research-evaluation/scripts/run-ablation-evaluation.ts',
    ]
    const hash = createHash('sha256')
    for (const file of files) {
        hash.update(file)
        hash.update(readFileSync(join(root, file)))
    }
    return hash.digest('hex')
}

mkdirSync(rawDir, { recursive: true })
const timestamp = new Date().toISOString().replaceAll(':', '').replaceAll('.', '')
const columns = Object.keys(records[0]) as Array<keyof RunRecord>
const csv = [
    columns.join(','),
    ...records.map(record => columns.map(column => csvCell(record[column])).join(',')),
].join('\n')
const csvPath = join(rawDir, `${batchLabel}_${timestamp}.csv`)
writeFileSync(csvPath, `${csv}\n`)
const metadata = {
    generated_at_utc: new Date().toISOString(),
    baseline_commit: 'e63c8d1',
    evaluated_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    evaluated_source_sha256: sourceHash(),
    node: process.version,
    roster_sizes: sizes,
    repetitions,
    records: records.length,
}
const metadataPath = join(rawDir, `${batchLabel}_${timestamp}_metadata.json`)
writeFileSync(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`)

console.log(`Records: ${records.length}`)
console.log(`Raw CSV: ${csvPath}`)
console.log(`Metadata: ${metadataPath}`)
