import type { WeddingSeatingContractPerson } from '@/utils/weddingSeatingContractAdapter'
import { describe, expect, it } from 'vitest'
import { checkWeddingSeatingHandoff } from '@/utils/weddingSeatingContractAdapter'

function person(overrides: Partial<WeddingSeatingContractPerson> = {}): WeddingSeatingContractPerson {
    return {
        id: 'lottery-1',
        plannerGuestId: 'guest-1',
        uid: '1',
        name: 'Guest One',
        department: 'Table 1',
        identity: 'friend',
        avatar: '',
        isWin: true,
        prizeName: ['Prize A'],
        prizeId: ['prize-a'],
        prizeTime: ['2026-08-26 12:00:00'],
        ...overrides,
    }
}

const sourcePersons = [{
    uid: 8,
    plannerGuestId: 'guest-1',
    name: 'Guest One updated',
    department: 'Table 8',
    identity: 'family',
    avatar: '',
}]

function validSynchronization(after: WeddingSeatingContractPerson) {
    const before = person()
    return checkWeddingSeatingHandoff({
        mode: 'synchronize',
        sourcePersons,
        destinationBefore: [before],
        destinationAfter: [after],
        completedBefore: [before],
        completedAfter: after.isWin ? [after] : [],
        scenario: {
            expectedOrigin: 'https://planner.test',
            expectedPeer: 'parent-window',
            incomingSequence: 2,
            acceptedSequenceBefore: 1,
            persistedSequenceBefore: 1,
        },
        execution: {
            observedOrigin: 'https://planner.test',
            observedPeer: 'parent-window',
            decision: 'merge',
            phases: ['message-received', 'commit-started', 'commit-succeeded', 'completion-success'],
            acceptedSequenceAfter: 2,
            persistedSequenceAfter: 2,
        },
    })
}

describe('seating-lottery contract adapter', () => {
    it('maps a state-preserving synchronization to all four contract clauses', () => {
        const report = validSynchronization(person({
            uid: '8',
            name: 'Guest One updated',
            department: 'Table 8',
            identity: 'family',
        }))

        expect(report.oracles.O2.passed).toBe(true)
        expect(report.clauses.I2.applicable).toBe(true)
    })

    it('reveals prize-history loss that count and public fields do not detect', () => {
        const report = validSynchronization(person({
            uid: '8',
            name: 'Guest One updated',
            department: 'Table 8',
            identity: 'family',
            isWin: false,
            prizeName: [],
            prizeId: [],
            prizeTime: [],
        }))

        expect(report.oracles.O0.passed).toBe(true)
        expect(report.oracles.O1.passed).toBe(true)
        expect(report.oracles.O2.passed).toBe(false)
        expect(report.clauses.I2.failures.map(item => item.code)).toContain('I2_DESTINATION_STATE_CHANGED')
    })

    it('treats a final snapshot as replacement and does not require history continuity', () => {
        const replacement = person({
            id: 'new-1',
            uid: '8',
            name: 'Guest One updated',
            department: 'Table 8',
            identity: 'family',
            isWin: false,
            prizeName: [],
            prizeId: [],
            prizeTime: [],
        })
        const report = checkWeddingSeatingHandoff({
            mode: 'replace',
            sourcePersons,
            destinationBefore: [person()],
            destinationAfter: [replacement],
            scenario: {
                expectedOrigin: 'https://planner.test',
                expectedPeer: 'opened-popup',
            },
            execution: {
                observedOrigin: 'https://planner.test',
                observedPeer: 'opened-popup',
                decision: 'replace',
                phases: ['ready-received', 'transfer-sent', 'commit-started', 'commit-succeeded', 'completion-success'],
            },
        })

        expect(report.oracles.O2.passed).toBe(true)
        expect(report.clauses.I2.applicable).toBe(false)
    })
})
