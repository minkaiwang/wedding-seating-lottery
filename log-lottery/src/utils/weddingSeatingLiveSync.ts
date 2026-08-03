import useStore from '@/store'
import { isLogLotteryEmbedMode } from '@/utils/runtimeEmbed'
import { isTrustedWindowSource, readTrustedLiveSyncParentOrigin } from '@/utils/weddingSeatingMessageSecurity'
import { allowedWeddingSeatingOrigins } from '@/utils/weddingSeatingOrigins'
import {
    createWeddingSeatingSequenceWatermark,
    decideWeddingSeatingSync,
    reserveWeddingSeatingSequence,
    settleWeddingSeatingSequence,
} from '@/utils/weddingSeatingProtocol'

/** 与婚礼座位站点 `lotteryLiveSync.ts` 中常量一致 */
export const MSG_WEDDING_LIVE_SYNC = 'WEDDING_SEATING_SYNC'
export const MSG_WEDDING_LIVE_SYNC_READY = 'WEDDING_SEATING_SYNC_READY'

/**
 * Set `localStorage.setItem('logLottery:liveSyncDebug', '1')` on the lottery origin to log every applied sync (and stale skips) even in production.
 * Dev server logs stale skips without this flag; applied payloads log only when the flag is set (avoids console spam while dragging).
 */
export const LIVE_SYNC_DEBUG_LS_KEY = 'logLottery:liveSyncDebug'
export const LIVE_SYNC_RESULT_EVENT = 'wedding-seating-live-sync-result'

function emitLiveSyncResult(action: string, detail: object): void {
    queueMicrotask(() => {
        try {
            window.dispatchEvent(new CustomEvent(LIVE_SYNC_RESULT_EVENT, {
                detail: { action, ...detail },
            }))
        }
        catch {
            // Evaluation instrumentation must never alter the runtime path.
        }
    })
}

function liveSyncVerboseFlag(): boolean {
    try {
        return typeof localStorage !== 'undefined' && localStorage.getItem(LIVE_SYNC_DEBUG_LS_KEY) === '1'
    }
    catch {
        return false
    }
}

function liveSyncDebugStale(...args: unknown[]): void {
    if (!import.meta.env.DEV && !liveSyncVerboseFlag())
        return
    // eslint-disable-next-line no-console -- gated by DEV or LIVE_SYNC_DEBUG_LS_KEY
    console.debug('[wedding-seating-live-sync]', ...args)
}

function liveSyncDebugApply(...args: unknown[]): void {
    if (!liveSyncVerboseFlag())
        return
    // eslint-disable-next-line no-console -- gated by LIVE_SYNC_DEBUG_LS_KEY
    console.debug('[wedding-seating-live-sync]', ...args)
}

function liveSyncWarnMismatch(message: string, detail: object): void {
    if (!liveSyncVerboseFlag())
        return
    console.warn('[wedding-seating-live-sync]', message, detail)
}

/**
 * 婚礼座位站点「实时同步」：父窗口按名单变更 postMessage 合并本地人员表。
 * 抽奖端单独删除的宾客会记入排除列表，后续同步不会恢复。
 * 若负载含有限数字 `seq`，则丢弃序号不递增的旧包（与婚礼端 `lotteryLiveSync` 单调 seq 对应）。
 * 已接收高水位阻止并发旧包；持久化失败且未被更新包接替时回退，以允许同序号重试。
 * 可选 `guestCount`、`plannerGuestTotal`、`tableCount`、`sentAt` 仅供调试日志对照。
 */
export function setupWeddingSeatingLiveSync(): () => void {
    const parentOrigin = readTrustedLiveSyncParentOrigin(
        window.location.search,
        isLogLotteryEmbedMode(),
        window.parent !== window,
        allowedWeddingSeatingOrigins(),
    )
    if (!parentOrigin)
        return () => {}

    const personConfig = useStore().personConfig
    let sequenceWatermark = createWeddingSeatingSequenceWatermark()
    let disposed = false

    function onMessage(e: MessageEvent) {
        if (disposed)
            return
        if (e.origin !== parentOrigin)
            return
        if (!isTrustedWindowSource(e.source, window.parent))
            return
        if (e.data?.type !== MSG_WEDDING_LIVE_SYNC)
            return

        const decision = decideWeddingSeatingSync(e.data, sequenceWatermark.acceptedSeq)
        const { meta } = decision

        if (decision.action === 'ignore-stale') {
            liveSyncDebugStale('skip stale message', {
                seq: meta.seq,
                lastAppliedSeq: sequenceWatermark.acceptedSeq,
            })
            emitLiveSyncResult('ignore-stale', {
                ...meta,
                lastAppliedSeq: sequenceWatermark.acceptedSeq,
            })
            return
        }

        if (
            liveSyncVerboseFlag()
            && meta.plannerGuestTotal !== undefined
            && meta.guestCount !== undefined
            && meta.plannerGuestTotal > meta.guestCount
        ) {
            liveSyncDebugApply('note: planner guest rows exceed sync payload (usually blank names omitted upstream)', {
                plannerGuestTotal: meta.plannerGuestTotal,
                guestCount: meta.guestCount,
            })
        }

        if (decision.action === 'skip-empty') {
            liveSyncWarnMismatch('skip empty payload while seating still has guests (bad or transient sync)', meta)
            emitLiveSyncResult('skip-empty', meta)
            return
        }

        if (decision.action === 'clear') {
            const persistence = personConfig.resetPerson()
            sequenceWatermark = reserveWeddingSeatingSequence(sequenceWatermark, meta.seq)
            liveSyncDebugApply('accepted empty list (intentional clear)', meta)
            persistence
                .then(() => {
                    sequenceWatermark = settleWeddingSeatingSequence(sequenceWatermark, meta.seq, 'persisted')
                    emitLiveSyncResult('clear', { ...meta, rowsAccepted: 0 })
                })
                .catch((err) => {
                    sequenceWatermark = settleWeddingSeatingSequence(sequenceWatermark, meta.seq, 'failed')
                    emitLiveSyncResult('persistence-failed', {
                        ...meta,
                        requestedAction: 'clear',
                        lastAppliedSeq: sequenceWatermark.acceptedSeq,
                        errorName: err instanceof Error ? err.name : 'unknown',
                    })
                })
            return
        }

        const rows = decision.rows
        if (meta.guestCount !== undefined && meta.guestCount !== rows.length) {
            liveSyncWarnMismatch('guestCount !== normalized rows', {
                ...meta,
                normalizedRows: rows.length,
            })
        }

        try {
            const copy = rows.map(r => ({ ...r }))
            const mergeOutcome = personConfig.mergeFromSeatingPlanner(copy)
            sequenceWatermark = reserveWeddingSeatingSequence(sequenceWatermark, meta.seq)
            liveSyncDebugApply('accepted', { ...meta, rowsAccepted: copy.length })
            mergeOutcome.persistence
                .then(() => {
                    sequenceWatermark = settleWeddingSeatingSequence(sequenceWatermark, meta.seq, 'persisted')
                    emitLiveSyncResult('merge', {
                        ...meta,
                        rowsNormalized: copy.length,
                        rowsAccepted: mergeOutcome.finalCount,
                        duplicateRowsRemoved: mergeOutcome.deduplicated,
                        excludedRows: mergeOutcome.excluded,
                        stateMatches: mergeOutcome.matchedByStableKey,
                        legacyUpgrades: mergeOutcome.upgradedFromLegacy,
                        createdRows: mergeOutcome.created,
                        completionLatencyMs: meta.sentAt !== undefined ? Date.now() - meta.sentAt : undefined,
                    })
                })
                .catch((err) => {
                    sequenceWatermark = settleWeddingSeatingSequence(sequenceWatermark, meta.seq, 'failed')
                    emitLiveSyncResult('persistence-failed', {
                        ...meta,
                        requestedAction: 'merge',
                        lastAppliedSeq: sequenceWatermark.acceptedSeq,
                        errorName: err instanceof Error ? err.name : 'unknown',
                    })
                })
        }
        catch (err) {
            if (import.meta.env.DEV || liveSyncVerboseFlag()) {
                console.warn('[wedding-seating-live-sync] merge failed', err)
            }
            emitLiveSyncResult('merge-failed', {
                ...meta,
                errorName: err instanceof Error ? err.name : 'unknown',
            })
        }
    }

    window.addEventListener('message', onMessage)

    window.parent.postMessage({ type: MSG_WEDDING_LIVE_SYNC_READY }, parentOrigin)

    return () => {
        disposed = true
        window.removeEventListener('message', onMessage)
    }
}
