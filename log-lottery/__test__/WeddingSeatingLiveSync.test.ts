import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
    mergeFromSeatingPlanner: vi.fn(),
    resetPerson: vi.fn(),
}))

vi.mock('@/store', () => ({
    default: () => ({
        personConfig: {
            mergeFromSeatingPlanner: mocks.mergeFromSeatingPlanner,
            resetPerson: mocks.resetPerson,
        },
    }),
}))

vi.mock('@/utils/runtimeEmbed', () => ({
    isLogLotteryEmbedMode: () => true,
}))

vi.mock('@/utils/weddingSeatingMessageSecurity', () => ({
    isTrustedWindowSource: () => true,
    readTrustedLiveSyncParentOrigin: () => 'https://planner.test',
}))

vi.mock('@/utils/weddingSeatingOrigins', () => ({
    allowedWeddingSeatingOrigins: () => ['https://planner.test'],
}))

import {
    LIVE_SYNC_RESULT_EVENT,
    MSG_WEDDING_LIVE_SYNC,
    setupWeddingSeatingLiveSync,
} from '@/utils/weddingSeatingLiveSync'

function mergeOutcome(persistence: Promise<void>) {
    return {
        finalCount: 1,
        deduplicated: 0,
        excluded: 0,
        matchedByStableKey: 1,
        upgradedFromLegacy: 0,
        created: 0,
        persistence,
    }
}

describe('wedding seating live-sync persistence retry', () => {
    beforeEach(() => {
        mocks.mergeFromSeatingPlanner.mockReset()
        mocks.resetPerson.mockReset()
        vi.spyOn(window, 'postMessage').mockImplementation(() => {})
    })

    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('rejects a duplicate while pending and accepts the same sequence after persistence fails', async () => {
        let rejectPersistence!: (reason: Error) => void
        let resolveRetryPersistence!: () => void
        const firstPersistence = new Promise<void>((_resolve, reject) => {
            rejectPersistence = reject
        })
        const retryPersistence = new Promise<void>((resolve) => {
            resolveRetryPersistence = resolve
        })
        mocks.mergeFromSeatingPlanner
            .mockReturnValueOnce(mergeOutcome(firstPersistence))
            .mockReturnValueOnce(mergeOutcome(retryPersistence))

        const events: Array<Record<string, unknown>> = []
        const onResult = (event: Event) => {
            events.push((event as CustomEvent<Record<string, unknown>>).detail)
        }
        window.addEventListener(LIVE_SYNC_RESULT_EVENT, onResult)
        const dispose = setupWeddingSeatingLiveSync()

        const message = {
            type: MSG_WEDDING_LIVE_SYNC,
            persons: [{ plannerGuestId: 'guest-1', name: 'Guest 1' }],
            seq: 1,
            guestCount: 1,
        }
        const dispatch = () => window.dispatchEvent(new MessageEvent('message', {
            data: message,
            origin: 'https://planner.test',
            source: window,
        }))

        dispatch()
        dispatch()
        expect(mocks.mergeFromSeatingPlanner).toHaveBeenCalledTimes(1)
        await vi.waitFor(() => expect(events.some(event => event.action === 'ignore-stale')).toBe(true))

        rejectPersistence(new Error('Injected persistence failure'))
        await vi.waitFor(() => expect(events.some(event => (
            event.action === 'persistence-failed' && event.lastAppliedSeq === 0
        ))).toBe(true))

        dispatch()
        await vi.waitFor(() => expect(mocks.mergeFromSeatingPlanner).toHaveBeenCalledTimes(2))
        expect(events.filter(event => event.action === 'merge')).toHaveLength(0)

        resolveRetryPersistence()
        await vi.waitFor(() => expect(events.filter(event => event.action === 'merge')).toHaveLength(1))

        dispose()
        window.removeEventListener(LIVE_SYNC_RESULT_EVENT, onResult)
    })
})
