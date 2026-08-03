import { describe, expect, it } from 'vitest'
import { decideWeddingSeatingSync, normalizeWeddingSeatingRows } from '@/utils/weddingSeatingProtocol'

describe('wedding seating protocol normalization', () => {
    it('normalizes public fields and drops rows without a usable name', () => {
        const rows = normalizeWeddingSeatingRows([
            null,
            { name: '   ' },
            {
                uid: 8,
                plannerGuestId: 42,
                name: '  Synthetic Guest 042  ',
                department: 3,
                identity: 'friend',
            },
        ])

        expect(rows).toEqual([{
            uid: 8,
            plannerGuestId: '42',
            name: 'Synthetic Guest 042',
            department: '3',
            identity: 'friend',
            avatar: '',
        }])
    })

    it('canonicalizes Unicode, trims identifiers, and ignores non-scalar public fields', () => {
        const rows = normalizeWeddingSeatingRows([{
            uid: { unexpected: true },
            plannerGuestId: '  guest-001  ',
            name: '  Cafe\u0301 Guest  ',
            department: '  Table 1  ',
            identity: { unexpected: true },
            avatar: '  avatar.png  ',
        }])

        expect(rows).toEqual([{
            uid: 1,
            plannerGuestId: 'guest-001',
            name: 'Caf\u00e9 Guest',
            department: 'Table 1',
            identity: '',
            avatar: 'avatar.png',
        }])
    })
})

describe('wedding seating live-sync decisions', () => {
    it('accepts a valid roster and exposes deterministic timing metadata', () => {
        const decision = decideWeddingSeatingSync({
            persons: [{ plannerGuestId: 'g1', name: 'Guest 1' }],
            seq: 4,
            guestCount: 1,
            plannerGuestTotal: 1,
            tableCount: 1,
            sentAt: 1_000,
        }, 3, 1_025)

        expect(decision.action).toBe('merge')
        expect(decision.meta).toMatchObject({ seq: 4, latencyMs: 25, rawPersonsLen: 1 })
    })

    it('rejects duplicate and reordered sequence numbers', () => {
        for (const seq of [9, 8]) {
            const decision = decideWeddingSeatingSync({
                persons: [{ plannerGuestId: 'g1', name: 'Guest 1' }],
                seq,
                guestCount: 1,
            }, 9)
            expect(decision.action).toBe('ignore-stale')
        }
    })

    it('protects a nonempty authoritative roster from a transient empty payload', () => {
        const decision = decideWeddingSeatingSync({
            persons: [{ name: '  ' }, null],
            seq: 2,
            guestCount: 1,
            plannerGuestTotal: 1,
        }, 1)

        expect(decision.action).toBe('skip-empty')
    })

    it('distinguishes an intentional zero-roster clear', () => {
        const decision = decideWeddingSeatingSync({
            persons: [],
            seq: 2,
            guestCount: 0,
            plannerGuestTotal: 0,
        }, 1)

        expect(decision.action).toBe('clear')
    })
})
