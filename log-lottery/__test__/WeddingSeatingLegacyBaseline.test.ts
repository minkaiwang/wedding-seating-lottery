import { describe, expect, it } from 'vitest'
import { seatingLegacyIdentityKey, seatingPersonKey } from '@/utils/seatingSyncExclusions'

describe('legacy Excel identity upgrade baseline', () => {
    it('matches an Excel row carrying uid with a later stable-id row by public identity', () => {
        const excelRow = {
            uid: '1',
            name: 'Synthetic Guest 001',
            department: 'Table 1',
            identity: 'family',
        }
        const stableIdRow = {
            plannerGuestId: 'guest-001',
            name: 'Synthetic Guest 001',
            department: 'Table 1',
            identity: 'family',
        }

        expect(seatingPersonKey(excelRow)).not.toBe(seatingPersonKey(stableIdRow))
        expect(seatingLegacyIdentityKey(excelRow)).toBe(seatingLegacyIdentityKey(stableIdRow))
    })
})
