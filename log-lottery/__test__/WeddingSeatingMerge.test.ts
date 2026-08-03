import { describe, expect, it } from 'vitest'
import type { NormalizedWeddingSeatingRow } from '@/utils/weddingSeatingProtocol'
import type { WeddingSeatingMergePerson } from '@/utils/weddingSeatingMerge'
import { mergeWeddingSeatingRoster } from '@/utils/weddingSeatingMerge'
import { seatingPersonKey } from '@/utils/seatingSyncExclusions'

interface SyntheticPerson extends WeddingSeatingMergePerson {
    id: string
    isWin: boolean
    prizeName: string[]
    prizeId: string[]
    prizeTime: string[]
}

function existing(overrides: Partial<SyntheticPerson> = {}): SyntheticPerson {
    return {
        id: 'lottery-1',
        plannerGuestId: 'guest-1',
        uid: '1',
        name: 'Guest 1',
        department: 'Table 1',
        identity: 'friend',
        avatar: '',
        isWin: true,
        prizeName: ['Prize A'],
        prizeId: ['prize-a'],
        prizeTime: ['2026-01-01 12:00:00'],
        ...overrides,
    }
}

function createPerson(row: NormalizedWeddingSeatingRow): SyntheticPerson {
    return existing({
        id: `created-${row.plannerGuestId ?? row.uid}`,
        plannerGuestId: row.plannerGuestId,
        uid: row.uid,
        name: row.name,
        department: row.department,
        identity: row.identity,
        avatar: row.avatar,
        isWin: false,
        prizeName: [],
        prizeId: [],
        prizeTime: [],
    })
}

const updatedRow: NormalizedWeddingSeatingRow = {
    uid: 8,
    plannerGuestId: 'guest-1',
    name: 'Guest 1 renamed',
    department: 'Table 8',
    identity: 'family',
    avatar: '',
}

describe('state-preserving seating roster merge', () => {
    it('updates public fields while preserving lottery identity and prize state', () => {
        const winner = existing()
        const result = mergeWeddingSeatingRoster([winner], [winner], [updatedRow], new Set(), createPerson)

        expect(result.allPersonList).toHaveLength(1)
        expect(result.allPersonList[0]).toMatchObject({
            id: 'lottery-1',
            plannerGuestId: 'guest-1',
            name: 'Guest 1 renamed',
            department: 'Table 8',
            identity: 'family',
            isWin: true,
            prizeName: ['Prize A'],
        })
        expect(result.alreadyPersonList.map(person => person.id)).toEqual(['lottery-1'])
        expect(winner.name).toBe('Guest 1')
    })

    it('upgrades an Excel-origin identity without recreating the lottery person', () => {
        const legacy = existing({ plannerGuestId: undefined, uid: '1', name: 'Guest 1' })
        const incoming = { ...updatedRow, name: 'Guest 1', department: 'Table 1', identity: 'friend' }
        const result = mergeWeddingSeatingRoster([legacy], [legacy], [incoming], new Set(), createPerson)

        expect(result.allPersonList[0]).toMatchObject({ id: 'lottery-1', plannerGuestId: 'guest-1', isWin: true })
        expect(result.metrics.upgradedFromLegacy).toBe(1)
        expect(result.metrics.created).toBe(0)
    })

    it('does not restore an excluded person', () => {
        const exclusions = new Set([seatingPersonKey(updatedRow)])
        const result = mergeWeddingSeatingRoster([], [], [updatedRow], exclusions, createPerson)

        expect(result.allPersonList).toEqual([])
        expect(result.metrics.excluded).toBe(1)
    })

    it('does not create duplicate people from repeated stable-id rows', () => {
        const lastRow = { ...updatedRow, department: 'Table 9' }
        const result = mergeWeddingSeatingRoster([], [], [updatedRow, lastRow], new Set(), createPerson)

        expect(result.allPersonList).toHaveLength(1)
        expect(result.allPersonList[0].department).toBe('Table 9')
        expect(result.metrics.deduplicated).toBe(1)
    })

    it('consumes separate legacy rows when public identity fields are identical', () => {
        const first = existing({ id: 'legacy-1', plannerGuestId: undefined, uid: '1', name: 'Same Guest' })
        const second = existing({ id: 'legacy-2', plannerGuestId: undefined, uid: '2', name: 'Same Guest' })
        const incoming = [
            { ...updatedRow, uid: 1, plannerGuestId: 'guest-1', name: 'Same Guest', department: 'Table 1', identity: 'friend' },
            { ...updatedRow, uid: 2, plannerGuestId: 'guest-2', name: 'Same Guest', department: 'Table 1', identity: 'friend' },
        ]

        const result = mergeWeddingSeatingRoster([first, second], [], incoming, new Set(), createPerson)

        expect(result.allPersonList.map(person => person.id)).toEqual(['legacy-1', 'legacy-2'])
        expect(result.allPersonList.map(person => person.plannerGuestId)).toEqual(['guest-1', 'guest-2'])
        expect(new Set(result.allPersonList.map(person => person.id)).size).toBe(2)
        expect(result.metrics.upgradedFromLegacy).toBe(2)
        expect(result.metrics.created).toBe(0)
    })

    it('keeps delimiter-bearing public identities distinct', () => {
        const first = existing({
            id: 'legacy-a',
            plannerGuestId: undefined,
            uid: undefined,
            name: 'A|B',
            department: 'C',
            identity: '',
        })
        const second = existing({
            id: 'legacy-b',
            plannerGuestId: undefined,
            uid: undefined,
            name: 'A',
            department: 'B|C',
            identity: '',
        })
        const incoming = [
            { ...updatedRow, plannerGuestId: 'guest-a', name: 'A|B', department: 'C', identity: '' },
            { ...updatedRow, plannerGuestId: 'guest-b', name: 'A', department: 'B|C', identity: '' },
        ]

        const result = mergeWeddingSeatingRoster([first, second], [], incoming, new Set(), createPerson)

        expect(result.allPersonList.map(person => person.id)).toEqual(['legacy-a', 'legacy-b'])
        expect(result.metrics.upgradedFromLegacy).toBe(2)
    })

    it('honors an old uid-based exclusion after the row gains a stable planner id', () => {
        const historicalExclusion = 'uid:8|Guest 1 renamed|Table 8|family'
        const result = mergeWeddingSeatingRoster([], [], [updatedRow], new Set([historicalExclusion]), createPerson)

        expect(result.allPersonList).toEqual([])
        expect(result.metrics.excluded).toBe(1)
    })
})
