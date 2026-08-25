import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { cpus, freemem, platform, release, totalmem } from 'node:os'
import { dirname, join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
import type { HandoffClauseId, HandoffOracleId } from '../../log-lottery/src/utils/stateHandoffContract'
import type {
    CheckInRosterContractObservation,
    CheckInRosterDestinationRecord,
    CheckInRosterSourceRecord,
} from '../jsep/subjects/checkInRosterContractAdapter'
import { checkCheckInRosterHandoff } from '../jsep/subjects/checkInRosterContractAdapter'

interface AdaptationScenario {
    id: string
    clause: HandoffClauseId
    mode: 'replace' | 'synchronize'
    mechanism: string
    correct: CheckInRosterContractObservation
    faulty: CheckInRosterContractObservation
}

interface AdaptationRecord {
    scenario_id: string
    target_clause: HandoffClauseId
    mode: AdaptationScenario['mode']
    mechanism: string
    correct_o2_passed: boolean
    o0_detected: boolean
    o1_detected: boolean
    o2_detected: boolean
    target_clause_detected: boolean
    o2_failure_codes: string
}

const evaluationDir = dirname(dirname(fileURLToPath(import.meta.url)))
const root = dirname(evaluationDir)
const jsepDir = join(evaluationDir, 'jsep')
const rawDir = join(jsepDir, 'results', 'raw')
const processedDir = join(jsepDir, 'results', 'processed')
const runId = (process.env.JSEP_ADAPTATION_RUN_ID
    ?? `jsep_adaptation_pilot_${new Date().toISOString().replaceAll(':', '').replaceAll('.', '')}`)
    .replace(/[^a-zA-Z0-9_-]/g, '_')

const externalSubject = {
    repository: 'https://github.com/GDSC-ESTIN/checkin-system',
    commit: '839831c9be7d2409e825ca14d27a3c285bde3764',
    license: 'MIT',
    evaluationBoundary: 'schema-level adaptation with synthetic records; upstream implementation not executed',
}

function clone<T>(value: T): T {
    return structuredClone(value)
}

function sourceRows(): CheckInRosterSourceRecord[] {
    return [
        { id: 'attendee-1', email: 'alice@example.test', username: 'Alice revised', teamName: 'Blue', tShirt: 'M' },
        { id: 'attendee-2', email: 'bob@example.test', username: 'Bob revised', teamName: 'Green', tShirt: 'L' },
    ]
}

function destinationBefore(): CheckInRosterDestinationRecord[] {
    return [
        { id: 'attendee-1', email: 'alice@example.test', username: 'Alice', teamName: 'Blue', tShirt: 'S', checked: true },
        { id: 'attendee-2', email: 'bob@example.test', username: 'Bob', teamName: 'Green', tShirt: 'L', checked: false },
    ]
}

function synchronizedAfter(): CheckInRosterDestinationRecord[] {
    return [
        { id: 'attendee-1', email: 'alice@example.test', username: 'Alice revised', teamName: 'Blue', tShirt: 'M', checked: true },
        { id: 'attendee-2', email: 'bob@example.test', username: 'Bob revised', teamName: 'Green', tShirt: 'L', checked: false },
    ]
}

function validSynchronization(): CheckInRosterContractObservation {
    return {
        mode: 'synchronize',
        sourceRows: sourceRows(),
        destinationBefore: destinationBefore(),
        destinationAfter: synchronizedAfter(),
        scenario: {
            expectedOrigin: 'https://roster-import.example.test',
            expectedPeer: 'checkin-backend',
            incomingSequence: 2,
            acceptedSequenceBefore: 1,
            persistedSequenceBefore: 1,
            persistenceOutcome: 'success',
        },
        execution: {
            observedOrigin: 'https://roster-import.example.test',
            observedPeer: 'checkin-backend',
            decision: 'merge',
            phases: ['message-received', 'commit-started', 'commit-succeeded', 'completion-success'],
            acceptedSequenceAfter: 2,
            persistedSequenceAfter: 2,
            atomicCommit: true,
        },
    }
}

function validReplacement(): CheckInRosterContractObservation {
    return {
        mode: 'replace',
        sourceRows: sourceRows(),
        destinationBefore: destinationBefore(),
        destinationAfter: [
            { ...sourceRows()[0], checked: false },
            { ...sourceRows()[1], checked: false },
        ],
        scenario: {
            expectedOrigin: 'https://roster-import.example.test',
            expectedPeer: 'checkin-backend',
            persistenceOutcome: 'success',
        },
        execution: {
            observedOrigin: 'https://roster-import.example.test',
            observedPeer: 'checkin-backend',
            decision: 'replace',
            phases: ['ready-received', 'transfer-sent', 'commit-started', 'commit-succeeded', 'completion-success'],
            atomicCommit: true,
        },
    }
}

function failedSynchronization(): CheckInRosterContractObservation {
    const observation = validSynchronization()
    return {
        ...observation,
        destinationAfter: clone(observation.destinationBefore),
        scenario: { ...observation.scenario, persistenceOutcome: 'failure' },
        execution: {
            ...observation.execution,
            phases: ['message-received', 'commit-started', 'commit-failed', 'completion-failure'],
            acceptedSequenceAfter: 1,
            persistedSequenceAfter: 1,
        },
    }
}

const identitySwap = validSynchronization()
const firstAfter = identitySwap.destinationAfter[0]
const secondAfter = identitySwap.destinationAfter[1]
const firstPublic = {
    email: firstAfter.email,
    username: firstAfter.username,
    teamName: firstAfter.teamName,
    tShirt: firstAfter.tShirt,
}
const swappedAfter: CheckInRosterDestinationRecord[] = [
    {
        ...firstAfter,
        email: secondAfter.email,
        username: secondAfter.username,
        teamName: secondAfter.teamName,
        tShirt: secondAfter.tShirt,
    },
    { ...secondAfter, ...firstPublic },
]

const duplicateInstance = validReplacement()
const duplicateInstanceAfter: CheckInRosterDestinationRecord[] = [
    duplicateInstance.destinationAfter[0],
    {
        ...duplicateInstance.destinationAfter[1],
        id: duplicateInstance.destinationAfter[0].id,
    },
]

const regeneratedIds = validSynchronization()
const regeneratedAfter = regeneratedIds.destinationAfter.map((record, index) => ({
    ...record,
    id: `regenerated-${index + 1}`,
}))

const resetCheckIn = validSynchronization()
const resetAfter = resetCheckIn.destinationAfter.map(record => ({ ...record, checked: false }))

const staleWatermark = failedSynchronization()
const wrongPeer = validSynchronization()
const rejectedPeer: CheckInRosterContractObservation = {
    ...wrongPeer,
    destinationAfter: clone(wrongPeer.destinationBefore),
    execution: {
        ...wrongPeer.execution,
        observedPeer: 'unbound-importer',
        decision: 'reject',
        phases: [],
        acceptedSequenceAfter: 1,
        persistedSequenceAfter: 1,
    },
}

const completionOrder = validSynchronization()
const failedCommit = failedSynchronization()
const replacementMissing = validReplacement()

const scenarios: AdaptationScenario[] = [
    {
        id: 'EXT-I1-01',
        clause: 'I1',
        mode: 'synchronize',
        mechanism: 'swap-public-state-between-stable-identities',
        correct: validSynchronization(),
        faulty: { ...identitySwap, destinationAfter: swappedAfter },
    },
    {
        id: 'EXT-I1-02',
        clause: 'I1',
        mode: 'replace',
        mechanism: 'duplicate-retained-roster-id',
        correct: validReplacement(),
        faulty: { ...duplicateInstance, destinationAfter: duplicateInstanceAfter },
    },
    {
        id: 'EXT-I1-03',
        clause: 'I1',
        mode: 'replace',
        mechanism: 'drop-imported-roster-record',
        correct: validReplacement(),
        faulty: { ...replacementMissing, destinationAfter: replacementMissing.destinationAfter.slice(0, 1) },
    },
    {
        id: 'EXT-I1-04',
        clause: 'I1',
        mode: 'synchronize',
        mechanism: 'regenerate-retained-roster-id',
        correct: validSynchronization(),
        faulty: { ...regeneratedIds, destinationAfter: regeneratedAfter },
    },
    {
        id: 'EXT-I2-01',
        clause: 'I2',
        mode: 'synchronize',
        mechanism: 'reset-check-in-state',
        correct: validSynchronization(),
        faulty: { ...resetCheckIn, destinationAfter: resetAfter },
    },
    {
        id: 'EXT-I3-01',
        clause: 'I3',
        mode: 'synchronize',
        mechanism: 'retain-failed-sequence-watermark',
        correct: failedSynchronization(),
        faulty: {
            ...staleWatermark,
            execution: { ...staleWatermark.execution, acceptedSequenceAfter: 2 },
        },
    },
    {
        id: 'EXT-I3-02',
        clause: 'I3',
        mode: 'synchronize',
        mechanism: 'accept-unbound-import-peer',
        correct: rejectedPeer,
        faulty: { ...rejectedPeer, execution: { ...rejectedPeer.execution, decision: 'merge' } },
    },
    {
        id: 'EXT-I4-01',
        clause: 'I4',
        mode: 'synchronize',
        mechanism: 'complete-before-durable-commit',
        correct: validSynchronization(),
        faulty: {
            ...completionOrder,
            execution: {
                ...completionOrder.execution,
                phases: ['message-received', 'completion-success', 'commit-started', 'commit-succeeded'],
            },
        },
    },
    {
        id: 'EXT-I4-02',
        clause: 'I4',
        mode: 'synchronize',
        mechanism: 'change-durable-state-after-failed-commit',
        correct: failedSynchronization(),
        faulty: { ...failedCommit, destinationAfter: synchronizedAfter() },
    },
]

function git(args: string[]): string {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8' }).trim()
}

function sha256(path: string): string {
    return createHash('sha256').update(readFileSync(path)).digest('hex')
}

function csvCell(value: unknown): string {
    const text = String(value ?? '')
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

function writeCsv(path: string, rows: AdaptationRecord[]): void {
    const headers = Object.keys(rows[0]) as Array<keyof AdaptationRecord>
    const lines = [headers.join(',')]
    for (const row of rows)
        lines.push(headers.map(header => csvCell(row[header])).join(','))
    writeFileSync(path, `${lines.join('\n')}\n`)
}

for (const directory of [rawDir, processedDir]) {
    if (!existsSync(directory))
        mkdirSync(directory, { recursive: true })
}

const records: AdaptationRecord[] = scenarios.map((scenario) => {
    const correct = checkCheckInRosterHandoff(scenario.correct)
    const faulty = checkCheckInRosterHandoff(scenario.faulty)
    return {
        scenario_id: scenario.id,
        target_clause: scenario.clause,
        mode: scenario.mode,
        mechanism: scenario.mechanism,
        correct_o2_passed: correct.oracles.O2.passed,
        o0_detected: !faulty.oracles.O0.passed,
        o1_detected: !faulty.oracles.O1.passed,
        o2_detected: !faulty.oracles.O2.passed,
        target_clause_detected: !faulty.clauses[scenario.clause].passed,
        o2_failure_codes: faulty.oracles.O2.failures.map(item => item.code).join('|'),
    }
})

const invalidControls = records.filter(record => !record.correct_o2_passed)
const missedFaults = records.filter(record => !record.o2_detected || !record.target_clause_detected)
if (invalidControls.length > 0 || missedFaults.length > 0) {
    throw new Error(JSON.stringify({ invalidControls, missedFaults }, null, 2))
}

const oracleSummary = (['O0', 'O1', 'O2'] as HandoffOracleId[]).map((oracle) => {
    const field = `${oracle.toLocaleLowerCase('en-US')}_detected` as keyof AdaptationRecord
    const detected = records.filter(record => record[field] === true).length
    return {
        oracle,
        scenarios: records.length,
        detected,
        detection_rate: detected / records.length,
    }
})

const sourceFiles = [
    join(root, 'log-lottery', 'src', 'utils', 'stateHandoffContract.ts'),
    join(jsepDir, 'subjects', 'checkInRosterContractAdapter.ts'),
    join(jsepDir, 'subjects', 'GDSC_CHECKIN_SUBJECT.md'),
    fileURLToPath(import.meta.url),
]
const head = git(['rev-parse', 'HEAD'])
const dirty = git(['status', '--porcelain']).length > 0
const report = {
    schemaVersion: 'jsep-adaptation-v1',
    runId,
    runClass: dirty ? 'pilot' : 'formal-candidate',
    generatedAt: new Date().toISOString(),
    git: {
        head,
        dirty,
        branch: git(['branch', '--show-current']),
    },
    runtime: {
        node: process.version,
        platform: platform(),
        release: release(),
        cpuModel: cpus()[0]?.model ?? 'unknown',
        logicalCpus: cpus().length,
        totalMemoryBytes: totalmem(),
        freeMemoryBytesAtStart: freemem(),
    },
    externalSubject,
    interpretationBoundary: {
        unit: 'predefined cross-subject adaptation scenario',
        separateFromPrimaryFaultCorpus: true,
        independentExternalValidation: false,
        upstreamRuntimeExecuted: false,
    },
    sourceFingerprints: sourceFiles.map(path => ({
        path: relative(root, path).replaceAll('\\', '/'),
        sha256: sha256(path),
        physicalLines: readFileSync(path, 'utf8').split(/\r?\n/).length,
    })),
    summary: {
        scenarios: records.length,
        correctControlsPassed: records.filter(record => record.correct_o2_passed).length,
        targetClausesDetected: records.filter(record => record.target_clause_detected).length,
        oracleSummary,
    },
    records,
}

const rawPath = join(rawDir, `${runId}.json`)
const csvPath = join(processedDir, `${runId}_matrix.csv`)
writeFileSync(rawPath, `${JSON.stringify(report, null, 2)}\n`)
writeCsv(csvPath, records)

console.log(JSON.stringify({
    runId,
    runClass: report.runClass,
    git: report.git,
    externalSubject,
    summary: report.summary,
    output: {
        raw: relative(root, rawPath).replaceAll('\\', '/'),
        matrix: relative(root, csvPath).replaceAll('\\', '/'),
    },
}, null, 2))
