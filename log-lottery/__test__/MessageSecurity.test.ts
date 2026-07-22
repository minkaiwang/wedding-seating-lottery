import { describe, expect, it } from 'vitest'
import { safeAvatarUrl } from '@/utils/safeContent'
import { isTrustedWindowSource, readTrustedLiveSyncParentOrigin } from '@/utils/weddingSeatingMessageSecurity'

describe('safeAvatarUrl', () => {
    it('allows ordinary image locations and safe raster data URLs', () => {
        expect(safeAvatarUrl('https://example.com/avatar.png')).toBe('https://example.com/avatar.png')
        expect(safeAvatarUrl('/images/avatar.webp')).toBe('/images/avatar.webp')
        expect(safeAvatarUrl('data:image/png;base64,aGVsbG8=')).toBe('data:image/png;base64,aGVsbG8=')
    })

    it('rejects executable and unsupported avatar sources', () => {
        expect(safeAvatarUrl('javascript:alert(1)')).toBe('')
        expect(safeAvatarUrl('data:image/svg+xml,<svg onload=alert(1)>')).toBe('')
        expect(safeAvatarUrl('file:///C:/private.png')).toBe('')
    })

    it('does not contact the former upstream remote placeholder', () => {
        expect(safeAvatarUrl('https://img1.baidu.com/it/u=2165937980,813753762&fm=253&fmt=auto&app=138&f=JPEG?w=500&h=500')).toBe('')
    })
})

describe('wedding seating message guards', () => {
    const allowed = ['https://planner.example']

    it('requires the explicit embed/liveSync/from handshake', () => {
        expect(readTrustedLiveSyncParentOrigin('?embed=1&liveSync=1&from=https%3A%2F%2Fplanner.example', true, true, allowed)).toBe('https://planner.example')
        expect(readTrustedLiveSyncParentOrigin('?embed=1&from=https%3A%2F%2Fplanner.example', true, true, allowed)).toBeNull()
        expect(readTrustedLiveSyncParentOrigin('?embed=1&liveSync=1&from=https%3A%2F%2Fevil.example', true, true, allowed)).toBeNull()
    })

    it('accepts only the expected parent window identity', () => {
        const parent = {}
        expect(isTrustedWindowSource(parent, parent)).toBe(true)
        expect(isTrustedWindowSource({}, parent)).toBe(false)
        expect(isTrustedWindowSource(parent, null)).toBe(false)
    })
})
