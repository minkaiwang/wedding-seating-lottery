import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { performance } from 'node:perf_hooks'
import { cpus, freemem, platform, release, totalmem } from 'node:os'
import fc from 'fast-check'
import type { IProperty } from 'fast-check'
import type { NormalizedWeddingSeatingRow } from '../../log-lottery/src/utils/weddingSeatingProtocol'
import type { WeddingSeatingMergePerson } from '../../log-lottery/src/utils/weddingSeatingMerge'
import {
    createWeddingSeatingSequenceWatermark,
    decideWeddingSeatingSync,
    normalizeWeddingSeatingRows,
    reserveWeddingSeatingSequence,
    settleWeddingSeatingSequence,
} from '../../log-lottery/src/utils/weddingSeatingProtocol'
import {
    deduplicateWeddingSeatingRows,
    mergeWeddingSeatingRoster,
} from '../../log-lottery/src/utils/weddingSeatingMerge'
import {
    seatingLegacyIdentityKey,
    seatingPersonKey,
} from '../../log-lottery/src/utils/seatingSyncExclusions'

interface SyntheticPerson extends WeddingSeatingMergePerson {
    id: string
    isWin: boolean
    prizeName: string[]
    prizeId: string[]
    prizeTime: string[]
}

interface PropertyResult {
    property_id: string
    invariant: string
    boundary: string
    passed: boolean
    generated_cases: number
    skipped_cases: number
    shrinks: number
    seed: number
    counterexample_path: string | null
    counterexample: string | null
    error: string | null
    elapsed_ms: number
}

const evaluationDir = dirname(dirname(fileURLToPath(import.meta.url)))
const root = dirname(evaluationDir)
const rawDir = join(evaluationDir, 'results', 'raw')
const processedDir = join(evaluationDir, 'results', 'processed')
const requestedRuns = Number(process.env.EVAL_PROPERTY_RUNS ?? '2000')
const requestedSeed = Number(process.env.EVAL_PROPERTY_SEED ?? '20260804')
const runId = (process.env.EVAL_PROPERTY_RUN_ID ?? `property_${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_')

if (!Number.isSafeInteger(requestedRuns) || requestedRuns < 1)
    throw new Error('EVAL_PROPERTY_RUNS must be a positive safe integer')
if (!Number.isSafeInteger(requestedSeed))
    throw new Error('EVAL_PROPERTY_SEED must be a safe integer')

function invariant(condition: unknown, message: string): asserts condition {
    if (!condition)
        throw new Error(message)
}

function jsonEqual(left: unknown, right: unknown): boolean {
    return JSON.stringify(left) === JSON.stringify(right)
}

function baselineDelimitedKey(row: {
    uid?: unknown
    name?: unknown
    department?: unknown
    identity?: unknown
}): string {
    const name = row.name == null ? '' : String(row.name).trim()
    const department = row.department == null ? '' : String(row.department)
    const identity = row.identity == null ? '' : String(row.identity)
    if (row.uid != null && String(row.uid).trim() !== '')
        return `uid:${String(row.uid).trim()}|${name}|${department}|${identity}`
    return `legacy:${name}|${department}|${identity}`
}

function createPerson(row: NormalizedWeddingSeatingRow): SyntheticPerson {
    return {
        ...row,
        id: `created-${row.plannerGuestId ?? row.uid}`,
        isWin: false,
        prizeName: [],
        prizeId: [],
        prizeTime: [],
    }
}

const textUnitArb = fc.constantFrom(
    'A', 'B', 'C', '1', '2', '3', '张', '李', '親', '友', 'é', 'e\u0301', '|', ',', '-', '_', ' ',
)
const textArb = fc.array(textUnitArb, { minLength: 1, maxLength: 12 })
    .map(parts => parts.join('').normalize('NFC').trim() || 'A')
const simplePartArb = fc.array(
    fc.constantFrom('A', 'B', 'C', '1', '2', '3', '张', '李', '親', '友', '-', '_'),
    { minLength: 1, maxLength: 10 },
).map(parts => parts.join(''))
const stableIdArb = fc.hexaString({ minLength: 4, maxLength: 20 }).map(value => `guest-${value}`)
const normalizedRowArb = fc.record({
    uid: fc.integer({ min: 1, max: 1_000_000 }),
    plannerGuestId: stableIdArb,
    name: textArb,
    department: textArb,
    identity: textArb,
    avatar: fc.constant(''),
})

const results: PropertyResult[] = []

function runProperty<Ts>(
    propertyId: string,
    invariantName: string,
    boundary: string,
    property: IProperty<Ts>,
    seedOffset: number,
): void {
    const seed = requestedSeed + seedOffset
    const started = performance.now()
    const details = fc.check(property, {
        seed,
        numRuns: requestedRuns,
        endOnFailure: true,
    })
    results.push({
        property_id: propertyId,
        invariant: invariantName,
        boundary,
        passed: !details.failed,
        generated_cases: details.numRuns,
        skipped_cases: details.numSkips,
        shrinks: details.numShrinks,
        seed: details.seed,
        counterexample_path: details.counterexamplePath,
        counterexample: details.counterexample === null ? null : fc.stringify(details.counterexample),
        error: details.error,
        elapsed_ms: performance.now() - started,
    })
}

const rawScalarArb = fc.oneof(
    fc.string({ maxLength: 20 }),
    fc.integer(),
    fc.boolean(),
    fc.constant(null),
    fc.record({ unexpected: fc.boolean() }),
)
const rawPersonArb = fc.oneof(
    fc.constant(null),
    fc.integer(),
    fc.record({
        uid: rawScalarArb,
        plannerGuestId: rawScalarArb,
        name: rawScalarArb,
        department: rawScalarArb,
        identity: rawScalarArb,
        avatar: rawScalarArb,
    }),
)

runProperty(
    'PB-01',
    'normalization is idempotent',
    'semantic normalization',
    fc.property(fc.array(rawPersonArb, { maxLength: 50 }), (rawRows) => {
        const once = normalizeWeddingSeatingRows(rawRows)
        const twice = normalizeWeddingSeatingRows(once)
        invariant(jsonEqual(once, twice), 'normalizing normalized rows changed the roster')
    }),
    1,
)

runProperty(
    'PB-02',
    'NFC-equivalent and trim-equivalent records share one normalized identity',
    'semantic normalization',
    fc.property(textArb, textArb, textArb, stableIdArb, (stem, department, identity, stableId) => {
        const decomposed = {
            uid: 1,
            plannerGuestId: `  ${stableId}  `,
            name: `  ${stem}e\u0301  `,
            department: `  ${department}  `,
            identity: `  ${identity}  `,
            avatar: '',
        }
        const composed = {
            uid: 1,
            plannerGuestId: stableId,
            name: `${stem}é`,
            department,
            identity,
            avatar: '',
        }
        const left = normalizeWeddingSeatingRows([decomposed])
        const right = normalizeWeddingSeatingRows([composed])
        invariant(jsonEqual(left, right), 'canonical-equivalent rows normalized differently')
        invariant(seatingLegacyIdentityKey(left[0]) === seatingLegacyIdentityKey(right[0]), 'normalized legacy identity keys differ')
        invariant(baselineDelimitedKey(decomposed) !== baselineDelimitedKey(composed), 'negative control did not distinguish raw legacy strings')
    }),
    2,
)

runProperty(
    'PB-03',
    'structured identity keys avoid delimiter-concatenation collisions',
    'semantic identity',
    fc.property(simplePartArb, simplePartArb, simplePartArb, (left, middle, right) => {
        const first = { name: `${left}|${middle}`, department: right, identity: '' }
        const second = { name: left, department: `${middle}|${right}`, identity: '' }
        invariant(baselineDelimitedKey(first) === baselineDelimitedKey(second), 'negative-control keys did not collide')
        invariant(seatingPersonKey(first) !== seatingPersonKey(second), 'structured keys collided')
    }),
    3,
)

runProperty(
    'PB-04',
    'duplicate stable identifiers are deterministically deduplicated with last-row precedence',
    'semantic identity',
    fc.property(stableIdArb, fc.array(textArb, { minLength: 2, maxLength: 20 }), (stableId, departments) => {
        const rows = departments.map((department, index): NormalizedWeddingSeatingRow => ({
            uid: index + 1,
            plannerGuestId: stableId,
            name: `Synthetic ${index}`,
            department,
            identity: 'generated',
            avatar: '',
        }))
        const deduplicated = deduplicateWeddingSeatingRows(rows)
        invariant(deduplicated.rows.length === 1, 'duplicate stable IDs produced more than one row')
        invariant(deduplicated.duplicateCount === rows.length - 1, 'duplicate count is inconsistent')
        invariant(jsonEqual(deduplicated.rows[0], rows.at(-1)), 'last-row precedence changed')
    }),
    4,
)

runProperty(
    'PB-05',
    'stable-ID merge preserves lottery-side state while updating public fields',
    'historical state',
    fc.property(fc.uniqueArray(normalizedRowArb, {
        minLength: 1,
        maxLength: 30,
        selector: row => row.plannerGuestId,
    }), (rows) => {
        const existing = rows.map((row, index): SyntheticPerson => ({
            ...row,
            id: `lottery-${row.plannerGuestId}`,
            isWin: index % 2 === 0,
            prizeName: index % 2 === 0 ? [`Prize ${index}`] : [],
            prizeId: index % 2 === 0 ? [`prize-${index}`] : [],
            prizeTime: index % 2 === 0 ? ['2026-08-04 12:00:00'] : [],
        }))
        const incoming = rows.map((row, index): NormalizedWeddingSeatingRow => ({
            ...row,
            name: `${row.name} updated`,
            department: `${row.department}-${index}`,
        }))
        const winners = existing.filter(person => person.isWin)
        const merged = mergeWeddingSeatingRoster(existing, winners, incoming, new Set(), createPerson)
        invariant(merged.allPersonList.length === rows.length, 'merge changed roster length')
        invariant(merged.metrics.matchedByStableKey === rows.length, 'not every row matched its stable identity')
        invariant(merged.metrics.created === 0, 'stable identities unexpectedly created new people')
        for (let index = 0; index < incoming.length; index++) {
            const before = existing[index]
            const after = merged.allPersonList[index]
            invariant(after.id === before.id, 'lottery-side identifier was not preserved')
            invariant(after.isWin === before.isWin, 'winning state was not preserved')
            invariant(jsonEqual(after.prizeId, before.prizeId), 'prize history was not preserved')
            invariant(after.name === incoming[index].name, 'public name was not updated')
            invariant(after.department === incoming[index].department, 'public department was not updated')
        }
        invariant(
            jsonEqual(merged.alreadyPersonList.map(person => person.id), winners.map(person => person.id)),
            'winner list did not preserve the same lottery-side identities',
        )
        const replaced = incoming.map(createPerson)
        invariant(replaced.some((person, index) => person.id !== existing[index].id), 'replace-all negative control preserved every internal ID')
    }),
    5,
)

runProperty(
    'PB-06',
    'identical legacy identities are upgraded one-to-one when stable IDs arrive',
    'identity upgrade and historical state',
    fc.property(
        fc.uniqueArray(stableIdArb, { minLength: 2, maxLength: 25 }),
        textArb,
        textArb,
        textArb,
        (stableIds, name, department, identity) => {
            const existing = stableIds.map((_, index): SyntheticPerson => ({
                id: `legacy-${index}`,
                uid: String(index + 1),
                name,
                department,
                identity,
                avatar: '',
                isWin: index % 2 === 0,
                prizeName: index % 2 === 0 ? [`Prize ${index}`] : [],
                prizeId: index % 2 === 0 ? [`prize-${index}`] : [],
                prizeTime: index % 2 === 0 ? ['2026-08-04 12:00:00'] : [],
            }))
            const incoming = stableIds.map((plannerGuestId, index): NormalizedWeddingSeatingRow => ({
                uid: index + 1,
                plannerGuestId,
                name,
                department,
                identity,
                avatar: '',
            }))
            const merged = mergeWeddingSeatingRoster(existing, existing.filter(person => person.isWin), incoming, new Set(), createPerson)
            invariant(merged.metrics.upgradedFromLegacy === stableIds.length, 'not every legacy row was upgraded')
            invariant(merged.metrics.created === 0, 'one-to-one legacy upgrade created a replacement row')
            invariant(new Set(merged.allPersonList.map(person => person.id)).size === stableIds.length, 'legacy identities were reused')
            invariant(
                jsonEqual(
                    [...new Set(merged.allPersonList.map(person => person.id))].sort(),
                    [...new Set(existing.map(person => person.id))].sort(),
                ),
                'legacy lottery-side identity set changed',
            )
            invariant(
                jsonEqual(
                    [...new Set(merged.allPersonList.map(person => person.plannerGuestId))].sort(),
                    [...new Set(stableIds)].sort(),
                ),
                'stable planner identities were not assigned one-to-one',
            )
        },
    ),
    6,
)

runProperty(
    'PB-07',
    'historical UID exclusions survive stable-ID introduction',
    'exclusion continuity',
    fc.property(fc.integer({ min: 1, max: 1_000_000 }), stableIdArb, textArb, textArb, textArb, (uid, stableId, name, department, identity) => {
        const row: NormalizedWeddingSeatingRow = {
            uid,
            plannerGuestId: stableId,
            name,
            department,
            identity,
            avatar: '',
        }
        const historicalKey = baselineDelimitedKey({ uid, name, department, identity })
        const merged = mergeWeddingSeatingRoster([], [], [row], new Set([historicalKey]), createPerson)
        invariant(merged.allPersonList.length === 0, 'historically excluded row was restored')
        invariant(merged.metrics.excluded === 1, 'exclusion metric did not record the historical key match')
    }),
    7,
)

runProperty(
    'PB-08',
    'sequence watermarks permit only safe retry and never roll back past a newer accepted sequence',
    'message order and retry',
    fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 1_000 }),
        fc.option(fc.integer({ min: 1, max: 1_000 }), { nil: undefined }),
        (persisted, delta, newerDelta) => {
            const pending = persisted + delta
            let watermark = createWeddingSeatingSequenceWatermark(persisted)
            watermark = reserveWeddingSeatingSequence(watermark, pending)
            invariant(watermark.acceptedSeq === pending, 'pending sequence was not reserved')
            invariant(
                decideWeddingSeatingSync({ persons: [{ name: 'Generated Guest' }], seq: pending }, watermark.acceptedSeq).action === 'ignore-stale',
                'duplicate pending sequence was not rejected',
            )
            const newer = newerDelta === undefined ? undefined : pending + newerDelta
            if (newer !== undefined)
                watermark = reserveWeddingSeatingSequence(watermark, newer)
            watermark = settleWeddingSeatingSequence(watermark, pending, 'failed')
            invariant(watermark.persistedSeq === persisted, 'failed persistence advanced the persisted sequence')
            invariant(
                watermark.acceptedSeq === (newer ?? persisted),
                'failure either blocked safe retry or rolled back past a newer accepted sequence',
            )
            const retrySeq = watermark.acceptedSeq + 1
            invariant(
                decideWeddingSeatingSync({ persons: [{ name: 'Generated Guest' }], seq: retrySeq }, watermark.acceptedSeq).action === 'merge',
                'next admissible sequence was not accepted',
            )
        },
    ),
    8,
)

const invalidPersonArb = fc.oneof(
    fc.constant(null),
    fc.integer(),
    fc.record({ name: fc.constantFrom('', ' ', '   '), unexpected: fc.boolean() }),
    fc.record({ name: fc.integer(), unexpected: fc.boolean() }),
)

runProperty(
    'PB-09',
    'transient invalid empties are skipped while explicit zero rosters clear',
    'empty-payload semantics',
    fc.property(
        fc.integer({ min: 0, max: 1_000_000 }),
        fc.integer({ min: 1, max: 10_000 }),
        fc.array(invalidPersonArb, { maxLength: 30 }),
        (lastAppliedSeq, declaredCount, persons) => {
            const seq = lastAppliedSeq + 1
            const transient = decideWeddingSeatingSync({
                persons,
                seq,
                guestCount: declaredCount,
                plannerGuestTotal: declaredCount,
            }, lastAppliedSeq)
            invariant(transient.action === 'skip-empty', 'declared nonempty source was cleared after invalid normalization')
            const explicitClear = decideWeddingSeatingSync({
                persons: [],
                seq,
                guestCount: 0,
                plannerGuestTotal: 0,
            }, lastAppliedSeq)
            invariant(explicitClear.action === 'clear', 'explicit zero roster was not cleared')
        },
    ),
    9,
)

function sha256ForFiles(files: string[]): string {
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

const relevantFiles = [
    'log-lottery/src/utils/weddingSeatingProtocol.ts',
    'log-lottery/src/utils/weddingSeatingMerge.ts',
    'log-lottery/src/utils/seatingSyncExclusions.ts',
    'research-evaluation/PROPERTY_PROTOCOL.md',
    'research-evaluation/scripts/run-property-evaluation.ts',
]
const fastCheckPackage = JSON.parse(readFileSync(join(root, 'node_modules', 'fast-check', 'package.json'), 'utf8')) as { version: string }
const gitStatus = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()
const metadata = {
    generated_at_utc: new Date().toISOString(),
    run_id: runId,
    parent_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    working_tree_dirty: gitStatus.length > 0,
    relevant_source_sha256: sha256ForFiles(relevantFiles),
    relevant_files: relevantFiles,
    fast_check_version: fastCheckPackage.version,
    node: process.version,
    operating_system: `${platform()} ${release()}`,
    logical_processors: cpus().length,
    total_memory_bytes: totalmem(),
    free_memory_bytes_at_summary: freemem(),
    requested_runs_per_property: requestedRuns,
    master_seed: requestedSeed,
    properties: results.length,
    generated_cases: results.reduce((sum, result) => sum + result.generated_cases, 0),
    passed_properties: results.filter(result => result.passed).length,
    failed_properties: results.filter(result => !result.passed).length,
    claim_boundary: 'Generated property checks of pure functions; not exhaustive proof, browser/device evidence, field incidence, usability, or wedding-day performance.',
}

mkdirSync(rawDir, { recursive: true })
mkdirSync(processedDir, { recursive: true })
const rawPath = join(rawDir, `${runId}.json`)
const summaryPath = join(processedDir, `${runId}_summary.csv`)
if (existsSync(rawPath) || existsSync(summaryPath))
    throw new Error(`Refusing to overwrite existing property run: ${runId}`)

writeFileSync(rawPath, `${JSON.stringify({ metadata, results }, null, 2)}\n`)
const columns: Array<keyof PropertyResult> = [
    'property_id',
    'invariant',
    'boundary',
    'passed',
    'generated_cases',
    'skipped_cases',
    'shrinks',
    'seed',
    'counterexample_path',
    'counterexample',
    'error',
    'elapsed_ms',
]
const csv = [
    columns.join(','),
    ...results.map(result => columns.map(column => csvCell(result[column])).join(',')),
].join('\n')
writeFileSync(summaryPath, `${csv}\n`)

console.log(`Properties passed: ${metadata.passed_properties}/${metadata.properties}`)
console.log(`Generated cases: ${metadata.generated_cases}`)
console.log(`Raw JSON: ${rawPath}`)
console.log(`Summary CSV: ${summaryPath}`)

if (metadata.failed_properties > 0)
    process.exitCode = 1
