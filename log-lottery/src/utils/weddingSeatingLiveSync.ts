import useStore from '@/store'
import { allowedWeddingSeatingOrigins } from '@/utils/weddingSeatingOrigins'

/** 与婚礼座位站点 `lotteryLiveSync.ts` 中常量一致 */
export const MSG_WEDDING_LIVE_SYNC = 'WEDDING_SEATING_SYNC'

/**
 * Set `localStorage.setItem('logLottery:liveSyncDebug', '1')` on the lottery origin to log every applied sync (and stale skips) even in production.
 * Dev server logs stale skips without this flag; applied payloads log only when the flag is set (avoids console spam while dragging).
 */
export const LIVE_SYNC_DEBUG_LS_KEY = 'logLottery:liveSyncDebug'

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

function liveSyncWarnMismatch(message: string, detail: Record<string, unknown>): void {
    if (!liveSyncVerboseFlag())
        return
    console.warn('[wedding-seating-live-sync]', message, detail)
}

function normalizeImportRows(persons: unknown): Record<string, unknown>[] {
    if (!Array.isArray(persons))
        return []
    const out: Record<string, unknown>[] = []
    for (let i = 0; i < persons.length; i++) {
        const r = persons[i]
        if (!r || typeof r !== 'object')
            continue
        const o = r as Record<string, unknown>
        if (typeof o.name !== 'string' || !o.name.trim())
            continue
        out.push({
            uid: o.uid ?? i + 1,
            plannerGuestId: o.plannerGuestId != null ? String(o.plannerGuestId) : undefined,
            name: String(o.name).trim(),
            department: o.department != null ? String(o.department) : '',
            identity: o.identity != null ? String(o.identity) : '',
            avatar: o.avatar != null ? String(o.avatar) : '',
        })
    }
    return out
}

/**
 * 婚礼座位站点「实时同步」：父窗口按名单变更 postMessage 合并本地人员表。
 * 抽奖端单独删除的宾客会记入排除列表，后续同步不会恢复。
 * 若负载含有限数字 `seq`，则丢弃序号不递增的旧包（与婚礼端 `lotteryLiveSync` 单调 seq 对应）。
 * 可选 `guestCount`、`plannerGuestTotal`、`tableCount`、`sentAt` 仅供调试日志对照。
 */
export function setupWeddingSeatingLiveSync(): () => void {
    const personConfig = useStore().personConfig
    let lastAppliedSeq = 0
    let disposed = false

    function onMessage(e: MessageEvent) {
        if (disposed)
            return
        if (!allowedWeddingSeatingOrigins().includes(e.origin))
            return
        if (e.data?.type !== MSG_WEDDING_LIVE_SYNC)
            return

        const seq = e.data?.seq
        const hasSeq = typeof seq === 'number' && Number.isFinite(seq)
        if (hasSeq && seq <= lastAppliedSeq) {
            liveSyncDebugStale('skip stale message', { seq, lastAppliedSeq })
            return
        }

        const metaGuestCount = e.data?.guestCount
        const metaTableCount = e.data?.tableCount
        const metaPlannerTotal = e.data?.plannerGuestTotal
        const metaSentAt = e.data?.sentAt
        const sentAtMs = typeof metaSentAt === 'number' && Number.isFinite(metaSentAt) ? metaSentAt : undefined
        const latencyMs = sentAtMs !== undefined ? Date.now() - sentAtMs : undefined

        const meta = {
            seq: hasSeq ? seq : undefined,
            guestCount: typeof metaGuestCount === 'number' && Number.isFinite(metaGuestCount) ? metaGuestCount : undefined,
            plannerGuestTotal:
                typeof metaPlannerTotal === 'number' && Number.isFinite(metaPlannerTotal) ? metaPlannerTotal : undefined,
            tableCount: typeof metaTableCount === 'number' && Number.isFinite(metaTableCount) ? metaTableCount : undefined,
            latencyMs: latencyMs !== undefined && Number.isFinite(latencyMs) ? latencyMs : undefined,
        }

        const rows = normalizeImportRows(e.data.persons)

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

        if (rows.length === 0) {
            if (meta.guestCount !== undefined && meta.guestCount > 0) {
                liveSyncWarnMismatch('guestCount > 0 but no rows after normalize', {
                    ...meta,
                    rawPersonsLen: Array.isArray(e.data.persons) ? e.data.persons.length : undefined,
                })
            }
            personConfig.resetPerson()
            if (hasSeq)
                lastAppliedSeq = seq
            liveSyncDebugApply('applied empty list', meta)
            return
        }

        if (meta.guestCount !== undefined && meta.guestCount !== rows.length) {
            liveSyncWarnMismatch('guestCount !== normalized rows', {
                ...meta,
                normalizedRows: rows.length,
                rawPersonsLen: Array.isArray(e.data.persons) ? e.data.persons.length : undefined,
            })
        }

        try {
            const copy = rows.map(r => ({ ...r }))
            personConfig.mergeFromSeatingPlanner(copy)
            if (hasSeq)
                lastAppliedSeq = seq
            liveSyncDebugApply('applied', { ...meta, rowsAccepted: copy.length })
        }
        catch {
            // 静默失败，避免打断抽奖现场
        }
    }

    window.addEventListener('message', onMessage)
    return () => {
        disposed = true
        window.removeEventListener('message', onMessage)
    }
}
