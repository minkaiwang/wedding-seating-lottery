import type {
    HandoffExecution,
    HandoffRecordModel,
    HandoffScenario,
    StateHandoffObservation,
} from '@/utils/stateHandoffContract'
import { describe, expect, it } from 'vitest'
import { checkStateHandoffContract } from '@/utils/stateHandoffContract'

interface SourceRecord {
    key: string
    fallback: string
    label: string
}

interface DestinationRecord {
    key: string
    fallback: string
    instance: string
    label: string
    localState: string
}

const model: HandoffRecordModel<SourceRecord, DestinationRecord> = {
    sourceIdentity: record => record.key,
    destinationIdentity: record => record.key,
    sourceFallbackIdentity: record => record.fallback,
    destinationFallbackIdentity: record => record.fallback,
    sourcePublicState: record => ({ label: record.label }),
    destinationPublicState: record => ({ label: record.label }),
    destinationOwnedState: record => ({ instance: record.instance, localState: record.localState }),
    destinationInstanceIdentity: record => record.instance,
}

const source = [
    { key: 'source-1', fallback: 'person-a', label: 'Alpha updated' },
    { key: 'source-2', fallback: 'person-b', label: 'Beta updated' },
]

const before = [
    { key: 'source-1', fallback: 'person-a', instance: 'destination-1', label: 'Alpha', localState: 'kept-a' },
    { key: 'source-2', fallback: 'person-b', instance: 'destination-2', label: 'Beta', localState: 'kept-b' },
]

const after = [
    { key: 'source-1', fallback: 'person-a', instance: 'destination-1', label: 'Alpha updated', localState: 'kept-a' },
    { key: 'source-2', fallback: 'person-b', instance: 'destination-2', label: 'Beta updated', localState: 'kept-b' },
]

function execution(overrides: Partial<HandoffExecution> = {}): HandoffExecution {
    return {
        observedOrigin: 'https://source.test',
        observedPeer: 'bound-peer',
        decision: 'merge',
        phases: ['message-received', 'commit-started', 'commit-succeeded', 'completion-success'],
        acceptedSequenceAfter: 3,
        persistedSequenceAfter: 3,
        ...overrides,
    }
}

function scenario(overrides: Partial<HandoffScenario> = {}): HandoffScenario {
    return {
        expectedOrigin: 'https://source.test',
        expectedPeer: 'bound-peer',
        authoritativeSourceCount: 2,
        incomingSequence: 3,
        acceptedSequenceBefore: 2,
        persistedSequenceBefore: 2,
        persistenceOutcome: 'success',
        ...overrides,
    }
}

function observation(overrides: Partial<StateHandoffObservation<SourceRecord, DestinationRecord>> = {}) {
    return {
        mode: 'synchronize' as const,
        source,
        destinationBefore: before,
        destinationAfter: after,
        model,
        scenario: scenario(),
        execution: execution(),
        ...overrides,
    }
}

describe('mode-aware state handoff contract', () => {
    it('accepts a committed synchronization with exact identity and destination-state continuity', () => {
        const report = checkStateHandoffContract(observation())

        expect(report.expectedDecision).toBe('merge')
        expect(report.oracles.O0.passed).toBe(true)
        expect(report.oracles.O1.passed).toBe(true)
        expect(report.oracles.O2.passed).toBe(true)
        expect(Object.values(report.clauses).every(result => result.passed)).toBe(true)
    })

    it('detects identity-to-public-state swaps missed by completion and unkeyed surface checks', () => {
        const swapped = [
            { ...after[0], label: after[1].label },
            { ...after[1], label: after[0].label },
        ]
        const report = checkStateHandoffContract(observation({ destinationAfter: swapped }))

        expect(report.oracles.O0.passed).toBe(true)
        expect(report.oracles.O1.passed).toBe(true)
        expect(report.oracles.O2.passed).toBe(false)
        expect(report.clauses.I1.failures.map(item => item.code)).toContain('I1_PUBLIC_STATE_MISMATCH')
    })

    it('detects destination-owned state loss missed by completion and surface checks', () => {
        const reset = after.map(record => ({ ...record, localState: 'reset' }))
        const report = checkStateHandoffContract(observation({ destinationAfter: reset }))

        expect(report.oracles.O0.passed).toBe(true)
        expect(report.oracles.O1.passed).toBe(true)
        expect(report.oracles.O2.passed).toBe(false)
        expect(report.clauses.I2.failures.map(item => item.code)).toContain('I2_DESTINATION_STATE_CHANGED')
    })

    it('detects an accepted message from an unbound peer', () => {
        const report = checkStateHandoffContract(observation({
            execution: execution({ observedPeer: 'same-origin-sibling' }),
        }))

        expect(report.expectedDecision).toBe('reject')
        expect(report.oracles.O0.passed).toBe(false)
        expect(report.oracles.O1.passed).toBe(false)
        expect(report.oracles.O2.passed).toBe(false)
        expect(report.clauses.I3.failures.map(item => item.code)).toContain('I3_UNBOUND_PEER_ACCEPTED')
    })

    it('accepts rejection of a message from an unbound peer without changing state', () => {
        const report = checkStateHandoffContract(observation({
            destinationAfter: before,
            execution: execution({
                observedPeer: 'same-origin-sibling',
                decision: 'reject',
                phases: ['message-received'],
                acceptedSequenceAfter: 2,
                persistedSequenceAfter: 2,
            }),
        }))

        expect(report.expectedDecision).toBe('reject')
        expect(report.oracles.O0.passed).toBe(true)
        expect(report.oracles.O1.passed).toBe(true)
        expect(report.oracles.O2.passed).toBe(true)
    })

    it('detects completion emitted before durable commit', () => {
        const report = checkStateHandoffContract(observation({
            execution: execution({
                phases: ['message-received', 'commit-started', 'completion-success', 'commit-succeeded'],
            }),
        }))

        expect(report.oracles.O0.passed).toBe(true)
        expect(report.oracles.O1.passed).toBe(true)
        expect(report.oracles.O2.passed).toBe(false)
        expect(report.clauses.I4.failures.map(item => item.code)).toContain('I4_COMMIT_COMPLETION_ORDER')
    })

    it('accepts a stale-message rejection without applying or completing it', () => {
        const report = checkStateHandoffContract(observation({
            destinationAfter: before,
            scenario: scenario({ incomingSequence: 2 }),
            execution: execution({
                decision: 'ignore-stale',
                phases: ['message-received'],
                acceptedSequenceAfter: 2,
                persistedSequenceAfter: 2,
            }),
        }))

        expect(report.expectedDecision).toBe('ignore-stale')
        expect(report.oracles.O0.passed).toBe(true)
        expect(report.oracles.O1.passed).toBe(true)
        expect(report.oracles.O2.passed).toBe(true)
        expect(report.clauses.I1.applicable).toBe(false)
        expect(report.clauses.I2.applicable).toBe(false)
    })

    it('accepts rollback to the persisted watermark after an injected commit failure', () => {
        const report = checkStateHandoffContract(observation({
            destinationAfter: before,
            scenario: scenario({ persistenceOutcome: 'failure' }),
            execution: execution({
                phases: ['message-received', 'commit-started', 'commit-failed', 'completion-failure'],
                acceptedSequenceAfter: 2,
                persistedSequenceAfter: 2,
            }),
        }))

        expect(report.oracles.O0.passed).toBe(true)
        expect(report.oracles.O1.passed).toBe(true)
        expect(report.oracles.O2.passed).toBe(true)
        expect(report.clauses.I4.passed).toBe(true)
    })

    it('checks replacement handshake and commit order without applying continuity', () => {
        const replacementAfter = source.map((record, index): DestinationRecord => ({
            ...record,
            instance: `new-${index}`,
            localState: 'initial',
        }))
        const report = checkStateHandoffContract(observation({
            mode: 'replace',
            destinationBefore: before,
            destinationAfter: replacementAfter,
            scenario: scenario({ incomingSequence: undefined }),
            execution: execution({
                decision: 'replace',
                phases: ['ready-received', 'transfer-sent', 'commit-started', 'commit-succeeded', 'completion-success'],
                acceptedSequenceAfter: undefined,
                persistedSequenceAfter: undefined,
            }),
        }))

        expect(report.oracles.O2.passed).toBe(true)
        expect(report.clauses.I2.applicable).toBe(false)
    })
})
