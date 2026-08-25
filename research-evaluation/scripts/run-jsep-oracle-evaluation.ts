import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HandoffClauseId, StateHandoffContractReport } from '../../log-lottery/src/utils/stateHandoffContract'
import type {
    WeddingSeatingContractObservation,
    WeddingSeatingContractPerson,
} from '../../log-lottery/src/utils/weddingSeatingContractAdapter'
import { checkWeddingSeatingHandoff } from '../../log-lottery/src/utils/weddingSeatingContractAdapter'
import { seatingPersonKey } from '../../log-lottery/src/utils/seatingSyncExclusions'

interface CatalogueEntry {
    id: string
    clause: HandoffClauseId
    operator: string
    trigger: string
    expected_failure: string
}

interface FaultCatalogue {
    catalogue_version: string
    seeded_faults: CatalogueEntry[]
}

interface FaultCase {
    faultId: string
    origin: 'reproduced-defect' | 'seeded-fault'
    clause: HandoffClauseId
    mode: 'replace' | 'synchronize'
    correct: WeddingSeatingContractObservation
    faulty: WeddingSeatingContractObservation
}

interface OracleRecord {
    fault_id: string
    origin: FaultCase['origin']
    target_clause: HandoffClauseId
    mode: FaultCase['mode']
    retained: boolean
    exclusion_reason: string | null
    correct_o2_pass: boolean
    faulty_o0_detected: boolean
    faulty_o1_detected: boolean
    faulty_o2_detected: boolean
    o2_unique_over_o1: boolean
    target_clause_detected: boolean
    first_failed_assertion: string | null
    failed_assertions: string
}

const evaluationDir = dirname(dirname(fileURLToPath(import.meta.url)))
const root = dirname(evaluationDir)
const jsepDir = join(evaluationDir, 'jsep')
const rawDir = join(jsepDir, 'results', 'raw')
const processedDir = join(jsepDir, 'results', 'processed')
const runId = (process.env.JSEP_ORACLE_RUN_ID ?? `jsep_oracle_pilot_${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_')

function person(overrides: Partial<WeddingSeatingContractPerson> = {}): WeddingSeatingContractPerson {
    return {
        id: 'destination-1',
        plannerGuestId: 'source-1',
        uid: '1',
        name: 'Alpha',
        department: 'Group 1',
        identity: 'member',
        avatar: '',
        isWin: true,
        prizeName: ['Material A'],
        prizeId: ['material-a'],
        prizeTime: ['2026-08-26 12:00:00'],
        ...overrides,
    }
}

function clone<T>(value: T): T {
    return structuredClone(value)
}

function baseSync(): WeddingSeatingContractObservation {
    const sourcePersons = [
        { uid: 11, plannerGuestId: 'source-1', name: 'Alpha updated', department: 'Group 3', identity: 'member', avatar: '' },
        { uid: 12, plannerGuestId: 'source-2', name: 'Beta updated', department: 'Group 4', identity: 'member', avatar: '' },
    ]
    const before = [
        person(),
        person({
            id: 'destination-2',
            plannerGuestId: 'source-2',
            uid: '2',
            name: 'Beta',
            department: 'Group 2',
            isWin: false,
            prizeName: [],
            prizeId: [],
            prizeTime: [],
        }),
    ]
    const after = [
        person({ uid: '11', name: 'Alpha updated', department: 'Group 3' }),
        person({
            id: 'destination-2',
            plannerGuestId: 'source-2',
            uid: '12',
            name: 'Beta updated',
            department: 'Group 4',
            isWin: false,
            prizeName: [],
            prizeId: [],
            prizeTime: [],
        }),
    ]
    return {
        mode: 'synchronize',
        sourcePersons,
        destinationBefore: before,
        destinationAfter: after,
        completedBefore: [before[0]],
        completedAfter: [after[0]],
        scenario: {
            expectedOrigin: 'https://source.test',
            expectedPeer: 'bound-parent',
            incomingSequence: 2,
            acceptedSequenceBefore: 1,
            persistedSequenceBefore: 1,
            persistenceOutcome: 'success',
        },
        execution: {
            observedOrigin: 'https://source.test',
            observedPeer: 'bound-parent',
            decision: 'merge',
            phases: ['message-received', 'commit-started', 'commit-succeeded', 'completion-success'],
            acceptedSequenceAfter: 2,
            persistedSequenceAfter: 2,
            atomicCommit: true,
        },
    }
}

function baseReplacement(): WeddingSeatingContractObservation {
    const sourcePersons = [
        { uid: 11, plannerGuestId: 'source-1', name: 'Alpha final', department: 'Group 3', identity: 'member', avatar: '' },
        { uid: 12, plannerGuestId: 'source-2', name: 'Beta final', department: 'Group 4', identity: 'member', avatar: '' },
    ]
    return {
        mode: 'replace',
        sourcePersons,
        destinationBefore: [person()],
        destinationAfter: [
            person({
                id: 'replacement-1',
                uid: '11',
                name: 'Alpha final',
                department: 'Group 3',
                isWin: false,
                prizeName: [],
                prizeId: [],
                prizeTime: [],
            }),
            person({
                id: 'replacement-2',
                plannerGuestId: 'source-2',
                uid: '12',
                name: 'Beta final',
                department: 'Group 4',
                isWin: false,
                prizeName: [],
                prizeId: [],
                prizeTime: [],
            }),
        ],
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

function persistenceFailure(): WeddingSeatingContractObservation {
    const observation = baseSync()
    observation.destinationAfter = clone(observation.destinationBefore)
    observation.completedAfter = clone(observation.completedBefore)
    observation.scenario.persistenceOutcome = 'failure'
    observation.execution.phases = ['message-received', 'commit-started', 'commit-failed', 'completion-failure']
    observation.execution.acceptedSequenceAfter = 1
    observation.execution.persistedSequenceAfter = 1
    return observation
}

function staleSequence(): WeddingSeatingContractObservation {
    const observation = baseSync()
    observation.destinationAfter = clone(observation.destinationBefore)
    observation.completedAfter = clone(observation.completedBefore)
    observation.scenario.incomingSequence = 1
    observation.execution.decision = 'ignore-stale'
    observation.execution.phases = ['message-received']
    observation.execution.acceptedSequenceAfter = 1
    observation.execution.persistedSequenceAfter = 1
    return observation
}

function transientEmpty(): WeddingSeatingContractObservation {
    const observation = baseSync()
    observation.sourcePersons = [{ name: '   ' }, null]
    observation.destinationAfter = clone(observation.destinationBefore)
    observation.completedAfter = clone(observation.completedBefore)
    observation.scenario.authoritativeSourceCount = 2
    observation.execution.decision = 'skip-empty'
    observation.execution.phases = ['message-received']
    observation.execution.acceptedSequenceAfter = 1
    observation.execution.persistedSequenceAfter = 1
    return observation
}

function explicitClear(): WeddingSeatingContractObservation {
    const observation = baseSync()
    observation.sourcePersons = []
    observation.destinationAfter = []
    observation.completedAfter = []
    observation.scenario.authoritativeSourceCount = 0
    observation.execution.decision = 'clear'
    return observation
}

function excludedIdentity(): WeddingSeatingContractObservation {
    const observation = baseSync()
    const firstSource = (observation.sourcePersons as Array<Record<string, unknown>>)[0]
    observation.sourcePersons = [firstSource]
    observation.destinationBefore = []
    observation.destinationAfter = []
    observation.completedBefore = []
    observation.completedAfter = []
    observation.exclusions = new Set([seatingPersonKey(firstSource)])
    return observation
}

function repeatedIdentity(): WeddingSeatingContractObservation {
    const observation = baseSync()
    observation.destinationBefore = []
    observation.completedBefore = []
    observation.sourcePersons = [
        { uid: 1, plannerGuestId: 'source-1', name: 'Alpha draft', department: 'Group 1', identity: 'member', avatar: '' },
        { uid: 2, plannerGuestId: 'source-1', name: 'Alpha final', department: 'Group 2', identity: 'member', avatar: '' },
    ]
    observation.destinationAfter = [person({
        id: 'created-1',
        uid: '2',
        name: 'Alpha final',
        department: 'Group 2',
        isWin: false,
        prizeName: [],
        prizeId: [],
        prizeTime: [],
    })]
    observation.completedAfter = []
    return observation
}

function legacyMigration(): WeddingSeatingContractObservation {
    const observation = baseSync()
    observation.sourcePersons = [
        { uid: 1, plannerGuestId: 'source-1', name: 'Same', department: 'Group', identity: 'member', avatar: '' },
        { uid: 2, plannerGuestId: 'source-2', name: 'Same', department: 'Group', identity: 'member', avatar: '' },
    ]
    const first = person({ plannerGuestId: undefined, id: 'legacy-1', uid: '1', name: 'Same', department: 'Group' })
    const second = person({
        plannerGuestId: undefined,
        id: 'legacy-2',
        uid: '2',
        name: 'Same',
        department: 'Group',
        isWin: false,
        prizeName: [],
        prizeId: [],
        prizeTime: [],
    })
    observation.destinationBefore = [first, second]
    observation.completedBefore = [first]
    observation.destinationAfter = [
        person({ plannerGuestId: 'source-1', id: 'legacy-1', uid: '1', name: 'Same', department: 'Group' }),
        person({
            plannerGuestId: 'source-2',
            id: 'legacy-2',
            uid: '2',
            name: 'Same',
            department: 'Group',
            isWin: false,
            prizeName: [],
            prizeId: [],
            prizeTime: [],
        }),
    ]
    observation.completedAfter = [observation.destinationAfter[0]]
    return observation
}

function delimiterFallback(): WeddingSeatingContractObservation {
    const observation = baseSync()
    observation.destinationBefore = []
    observation.completedBefore = []
    observation.sourcePersons = [
        { uid: 1, name: 'A|B', department: 'C', identity: '', avatar: '' },
        { uid: 1, name: 'A', department: 'B|C', identity: '', avatar: '' },
    ]
    observation.destinationAfter = [
        person({ id: 'fallback-1', plannerGuestId: undefined, uid: '1', name: 'A|B', department: 'C', identity: '', isWin: false, prizeName: [], prizeId: [], prizeTime: [] }),
        person({ id: 'fallback-2', plannerGuestId: undefined, uid: '1', name: 'A', department: 'B|C', identity: '', isWin: false, prizeName: [], prizeId: [], prizeTime: [] }),
    ]
    observation.completedAfter = []
    return observation
}

function canonicalIdentity(): WeddingSeatingContractObservation {
    const observation = baseSync()
    observation.destinationBefore = []
    observation.completedBefore = []
    observation.sourcePersons = [{ uid: '', name: 'Caf\u00e9', department: 'Group', identity: 'member', avatar: '' }]
    observation.destinationAfter = [person({
        id: 'canonical-1',
        plannerGuestId: undefined,
        uid: '1',
        name: 'Cafe\u0301',
        department: 'Group',
        identity: 'member',
        isWin: false,
        prizeName: [],
        prizeId: [],
        prizeTime: [],
    })]
    observation.completedAfter = []
    return observation
}

function altered(base: WeddingSeatingContractObservation, mutate: (copy: WeddingSeatingContractObservation) => void) {
    const copy = clone(base)
    mutate(copy)
    return copy
}

const templates = new Map<string, { correct: WeddingSeatingContractObservation, faulty: WeddingSeatingContractObservation }>()

const m01 = baseSync()
templates.set('JSEP-M01', { correct: m01, faulty: altered(m01, (copy) => {
    copy.destinationAfter[0].plannerGuestId = undefined
    copy.destinationAfter[0].id = 'recreated-1'
}) })

const m02 = delimiterFallback()
templates.set('JSEP-M02', { correct: m02, faulty: altered(m02, (copy) => {
    copy.destinationAfter = [copy.destinationAfter[1]]
}) })

const m03 = canonicalIdentity()
templates.set('JSEP-M03', { correct: m03, faulty: altered(m03, (copy) => {
    copy.destinationAfter = [...copy.destinationAfter, person({
        id: 'canonical-2',
        plannerGuestId: undefined,
        uid: '',
        name: 'Caf\u00e9',
        department: 'Group',
        identity: 'member',
        isWin: false,
        prizeName: [],
        prizeId: [],
        prizeTime: [],
    })]
}) })

const m04 = repeatedIdentity()
templates.set('JSEP-M04', { correct: m04, faulty: altered(m04, (copy) => {
    copy.destinationAfter = [person({
        id: 'created-draft',
        uid: '1',
        name: 'Alpha draft',
        department: 'Group 1',
        isWin: false,
        prizeName: [],
        prizeId: [],
        prizeTime: [],
    }), ...copy.destinationAfter]
}) })

const m05 = legacyMigration()
templates.set('JSEP-M05', { correct: m05, faulty: altered(m05, (copy) => {
    copy.destinationAfter[1].id = 'legacy-1'
}) })

const m06 = excludedIdentity()
templates.set('JSEP-M06', { correct: m06, faulty: altered(m06, (copy) => {
    copy.destinationAfter = [person({ uid: '11', name: 'Alpha updated', department: 'Group 3' })]
    copy.completedAfter = [copy.destinationAfter[0]]
}) })

for (const id of ['JSEP-M07', 'JSEP-M08', 'JSEP-M09', 'JSEP-M10', 'JSEP-M11']) {
    const correct = baseSync()
    const faulty = altered(correct, (copy) => {
        if (id === 'JSEP-M07') {
            copy.destinationAfter = copy.destinationAfter.map((record, index) => person({
                ...record,
                id: `replacement-${index + 1}`,
                isWin: false,
                prizeName: [],
                prizeId: [],
                prizeTime: [],
            }))
            copy.completedAfter = []
        }
        if (id === 'JSEP-M08')
            copy.destinationAfter[0].id = 'regenerated-1'
        if (id === 'JSEP-M09') {
            copy.destinationAfter[0].isWin = false
            copy.completedAfter = []
        }
        if (id === 'JSEP-M10') {
            copy.destinationAfter[0].prizeName = []
            copy.destinationAfter[0].prizeId = []
            copy.destinationAfter[0].prizeTime = []
        }
        if (id === 'JSEP-M11')
            copy.completedAfter = []
    })
    templates.set(id, { correct, faulty })
}

const acceptedSync = baseSync()
const m12 = altered(acceptedSync, (copy) => {
    copy.destinationAfter = clone(copy.destinationBefore)
    copy.completedAfter = clone(copy.completedBefore)
    copy.execution.observedOrigin = 'https://untrusted.test'
    copy.execution.decision = 'reject'
    copy.execution.phases = ['message-received']
    copy.execution.acceptedSequenceAfter = 1
    copy.execution.persistedSequenceAfter = 1
})
templates.set('JSEP-M12', { correct: m12, faulty: altered(m12, (copy) => {
    copy.destinationAfter = clone(acceptedSync.destinationAfter)
    copy.completedAfter = clone(acceptedSync.completedAfter)
    copy.execution.decision = 'merge'
    copy.execution.phases = ['message-received', 'commit-started', 'commit-succeeded', 'completion-success']
    copy.execution.acceptedSequenceAfter = 2
    copy.execution.persistedSequenceAfter = 2
}) })

const m13 = altered(acceptedSync, (copy) => {
    copy.destinationAfter = clone(copy.destinationBefore)
    copy.completedAfter = clone(copy.completedBefore)
    copy.execution.observedPeer = 'same-origin-sibling'
    copy.execution.decision = 'reject'
    copy.execution.phases = ['message-received']
    copy.execution.acceptedSequenceAfter = 1
    copy.execution.persistedSequenceAfter = 1
})
templates.set('JSEP-M13', { correct: m13, faulty: altered(m13, (copy) => {
    copy.destinationAfter = clone(acceptedSync.destinationAfter)
    copy.completedAfter = clone(acceptedSync.completedAfter)
    copy.execution.decision = 'merge'
    copy.execution.phases = ['message-received', 'commit-started', 'commit-succeeded', 'completion-success']
    copy.execution.acceptedSequenceAfter = 2
    copy.execution.persistedSequenceAfter = 2
}) })

const acceptedReplacement = baseReplacement()
const m14 = altered(acceptedReplacement, (copy) => {
    copy.destinationAfter = clone(copy.destinationBefore)
    copy.execution.decision = 'reject'
    copy.execution.phases = ['transfer-sent', 'ready-received']
})
templates.set('JSEP-M14', { correct: m14, faulty: altered(m14, (copy) => {
    copy.destinationAfter = clone(acceptedReplacement.destinationAfter)
    copy.execution.decision = 'replace'
    copy.execution.phases = ['transfer-sent', 'ready-received', 'commit-started', 'commit-succeeded', 'completion-success']
}) })

const m15 = staleSequence()
templates.set('JSEP-M15', { correct: m15, faulty: altered(m15, (copy) => {
    const applied = baseSync()
    copy.destinationAfter = clone(applied.destinationAfter)
    copy.completedAfter = clone(applied.completedAfter)
    copy.execution.decision = 'merge'
    copy.execution.phases = ['message-received', 'commit-started', 'commit-succeeded', 'completion-success']
}) })

const m16 = transientEmpty()
templates.set('JSEP-M16', { correct: m16, faulty: altered(m16, (copy) => {
    copy.destinationAfter = []
    copy.completedAfter = []
    copy.execution.decision = 'clear'
    copy.execution.phases = ['message-received', 'commit-started', 'commit-succeeded', 'completion-success']
    copy.execution.acceptedSequenceAfter = 2
    copy.execution.persistedSequenceAfter = 2
}) })

const m17 = explicitClear()
templates.set('JSEP-M17', { correct: m17, faulty: altered(m17, (copy) => {
    copy.destinationAfter = clone(copy.destinationBefore)
    copy.completedAfter = clone(copy.completedBefore)
    copy.execution.decision = 'skip-empty'
    copy.execution.phases = ['message-received']
    copy.execution.acceptedSequenceAfter = 1
    copy.execution.persistedSequenceAfter = 1
}) })

const m18 = persistenceFailure()
templates.set('JSEP-M18', { correct: m18, faulty: altered(m18, copy => { copy.execution.acceptedSequenceAfter = 2 }) })

const m19 = baseSync()
templates.set('JSEP-M19', { correct: m19, faulty: altered(m19, copy => {
    copy.execution.phases = ['message-received', 'commit-started', 'completion-success', 'commit-succeeded']
}) })

const m20 = persistenceFailure()
templates.set('JSEP-M20', { correct: m20, faulty: altered(m20, (copy) => {
    const applied = baseSync()
    copy.destinationAfter = clone(applied.destinationAfter)
    copy.completedAfter = clone(applied.completedAfter)
    copy.execution.phases = ['message-received', 'commit-started', 'commit-failed', 'completion-success']
}) })

const catalogue = JSON.parse(readFileSync(join(jsepDir, 'fault-catalogue.json'), 'utf8')) as FaultCatalogue
const cases: FaultCase[] = catalogue.seeded_faults.map((entry) => {
    const template = templates.get(entry.id)
    if (!template)
        throw new Error(`Missing executable template for ${entry.id}`)
    return {
        faultId: entry.id,
        origin: 'seeded-fault',
        clause: entry.clause,
        mode: template.correct.mode,
        ...template,
    }
})

const reproducedMappings: Array<[string, HandoffClauseId, string]> = [
    ['EC-001', 'I1', 'JSEP-M01'],
    ['EC-002', 'I1', 'JSEP-M04'],
    ['EC-004', 'I1', 'JSEP-M05'],
    ['EC-005', 'I1', 'JSEP-M06'],
    ['EC-006', 'I1', 'JSEP-M02'],
    ['EC-007', 'I3', 'JSEP-M18'],
    ['EC-008', 'I3', 'JSEP-M13'],
]
for (const [faultId, clause, templateId] of reproducedMappings) {
    const template = templates.get(templateId)
    if (!template)
        throw new Error(`Missing reproduced-defect template ${templateId}`)
    cases.push({
        faultId,
        origin: 'reproduced-defect',
        clause,
        mode: template.correct.mode,
        correct: clone(template.correct),
        faulty: clone(template.faulty),
    })
}

const ec003Correct = baseSync()
const ec003Faulty = altered(ec003Correct, (copy) => {
    copy.destinationAfter = []
    copy.completedAfter = []
    copy.execution.atomicCommit = false
})
cases.push({
    faultId: 'EC-003',
    origin: 'reproduced-defect',
    clause: 'I4',
    mode: 'synchronize',
    correct: ec003Correct,
    faulty: ec003Faulty,
})

function failedCodes(report: StateHandoffContractReport): string[] {
    return report.oracles.O2.failures.map(item => item.code)
}

const records: OracleRecord[] = cases.map((item) => {
    const correct = checkWeddingSeatingHandoff(item.correct)
    const faulty = checkWeddingSeatingHandoff(item.faulty)
    const targetClauseDetected = !faulty.clauses[item.clause].passed
    let exclusionReason: string | null = null
    if (!correct.oracles.O2.passed)
        exclusionReason = 'correct-implementation-fixture-failed'
    else if (faulty.oracles.O2.passed)
        exclusionReason = 'fault-variant-not-observable'
    else if (!targetClauseDetected)
        exclusionReason = 'target-clause-not-triggered'
    const codes = failedCodes(faulty)
    const targetCodes = faulty.clauses[item.clause].failures.map(failure => failure.code)
    return {
        fault_id: item.faultId,
        origin: item.origin,
        target_clause: item.clause,
        mode: item.mode,
        retained: exclusionReason === null,
        exclusion_reason: exclusionReason,
        correct_o2_pass: correct.oracles.O2.passed,
        faulty_o0_detected: !faulty.oracles.O0.passed,
        faulty_o1_detected: !faulty.oracles.O1.passed,
        faulty_o2_detected: !faulty.oracles.O2.passed,
        o2_unique_over_o1: faulty.oracles.O1.passed && !faulty.oracles.O2.passed,
        target_clause_detected: targetClauseDetected,
        first_failed_assertion: targetCodes[0] ?? codes[0] ?? null,
        failed_assertions: codes.join('|'),
    }
})

function summarize(origin: FaultCase['origin']) {
    const subset = records.filter(record => record.origin === origin && record.retained)
    return {
        origin,
        retained_faults: subset.length,
        o0_detected: subset.filter(record => record.faulty_o0_detected).length,
        o1_detected: subset.filter(record => record.faulty_o1_detected).length,
        o2_detected: subset.filter(record => record.faulty_o2_detected).length,
        o2_unique_over_o1: subset.filter(record => record.o2_unique_over_o1).length,
    }
}

function stableSourceHash(): string {
    const files = [
        'log-lottery/src/utils/stateHandoffContract.ts',
        'log-lottery/src/utils/weddingSeatingContractAdapter.ts',
        'research-evaluation/jsep/PROTOCOL.md',
        'research-evaluation/jsep/fault-catalogue.json',
        'research-evaluation/scripts/run-jsep-oracle-evaluation.ts',
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

const gitStatus = execFileSync('git', ['status', '--porcelain'], { cwd: root, encoding: 'utf8' }).trim()
const metadata = {
    generated_at_utc: new Date().toISOString(),
    run_id: runId,
    run_class: gitStatus.length === 0 ? 'formal-candidate' : 'pilot-dirty-worktree',
    evaluated_commit: execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root, encoding: 'utf8' }).trim(),
    working_tree_dirty: gitStatus.length > 0,
    source_sha256: stableSourceHash(),
    catalogue_version: catalogue.catalogue_version,
    node: process.version,
    cases: records.length,
    retained_cases: records.filter(record => record.retained).length,
    excluded_cases: records.filter(record => !record.retained).length,
    summaries: [summarize('reproduced-defect'), summarize('seeded-fault')],
    interpretation: 'Fixed-corpus oracle adequacy. Reproduced defects and systematically seeded boundary faults are reported separately; neither estimates field defect prevalence.',
}

mkdirSync(rawDir, { recursive: true })
mkdirSync(processedDir, { recursive: true })
const rawPath = join(rawDir, `${runId}.json`)
const csvPath = join(processedDir, `${runId}_matrix.csv`)
if (existsSync(rawPath) && process.env.JSEP_ALLOW_OVERWRITE !== '1')
    throw new Error(`Refusing to overwrite existing run: ${rawPath}`)

writeFileSync(rawPath, `${JSON.stringify({ metadata, records }, null, 2)}\n`)
const columns = Object.keys(records[0]) as Array<keyof OracleRecord>
const csv = [
    columns.join(','),
    ...records.map(record => columns.map(column => csvCell(record[column])).join(',')),
].join('\n')
writeFileSync(csvPath, `${csv}\n`)

console.log(JSON.stringify(metadata, null, 2))
console.log(`Raw JSON: ${rawPath}`)
console.log(`Matrix CSV: ${csvPath}`)

if (metadata.excluded_cases > 0)
    process.exitCode = 1
