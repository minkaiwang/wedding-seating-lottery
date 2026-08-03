import type { Router } from 'vue-router'
import type { useToast } from 'vue-toast-notification'
import i18n from '@/locales/i18n'
import useStore from '@/store'
import { addOtherInfo } from '@/utils/index'
import { isLogLotteryEmbedMode } from '@/utils/runtimeEmbed'
import { clearSyncExclusions } from '@/utils/seatingSyncExclusions'
import { deduplicateWeddingSeatingRows } from '@/utils/weddingSeatingMerge'
import { isTrustedWindowSource } from '@/utils/weddingSeatingMessageSecurity'
import { allowedWeddingSeatingOrigins } from '@/utils/weddingSeatingOrigins'
import { normalizeWeddingSeatingRows } from '@/utils/weddingSeatingProtocol'

type ToastApi = ReturnType<typeof useToast>

export const MSG_LOTTERY_READY = 'LOG_LOTTERY_IMPORT_BRIDGE_READY'
export const MSG_WEDDING_IMPORT = 'WEDDING_SEATING_IMPORT'
export const MSG_WEDDING_DONE = 'WEDDING_SEATING_IMPORT_DONE'

const EVT_ACTIVE = 'wedding-seating-bridge-active'
const EVT_IMPORTED = 'wedding-seating-bridge-imported'
const EVT_MISCONFIGURED = 'wedding-seating-bridge-misconfigured'
const EVT_FAILED = 'wedding-seating-bridge-failed'

function emitBridge(name: string, detail?: Record<string, unknown>) {
    queueMicrotask(() => {
        try {
            window.dispatchEvent(new CustomEvent(name, { detail }))
        }
        catch {
            // ignore
        }
    })
}

function isAllowedParentOrigin(origin: string): boolean {
    return allowedWeddingSeatingOrigins().includes(origin)
}

function readParentOriginFromQuery(): string | null {
    try {
        const raw = new URLSearchParams(window.location.search).get('from')
        if (!raw)
            return null
        const decoded = decodeURIComponent(raw)
        const u = new URL(decoded)
        return u.origin
    }
    catch {
        return null
    }
}

/**
 * When opened from the wedding seating planner with ?bridge=1&from=<origin>, listen for postMessage import
 * and merge into person list (same effect as Excel import).
 */
export function setupWeddingSeatingImportBridge(router: Router, toast: ToastApi): () => void {
    if (isLogLotteryEmbedMode())
        return () => {}

    const params = new URLSearchParams(window.location.search)
    if (params.get('bridge') !== '1')
        return () => {}

    const parentOrigin = readParentOriginFromQuery()
    if (!parentOrigin) {
        emitBridge(EVT_MISCONFIGURED, { reason: 'missing-from' })
        return () => {}
    }
    if (!isAllowedParentOrigin(parentOrigin)) {
        emitBridge(EVT_MISCONFIGURED, { reason: 'origin-not-allowed' })
        return () => {}
    }
    if (!window.opener) {
        emitBridge(EVT_MISCONFIGURED, { reason: 'no-opener' })
        return () => {}
    }

    emitBridge(EVT_ACTIVE, { parentOrigin })

    const personConfig = useStore().personConfig
    const t = (key: string) => i18n.global.t(key)
    let disposed = false

    function onMessage(e: MessageEvent) {
        if (disposed)
            return
        if (e.origin !== parentOrigin)
            return
        if (!isTrustedWindowSource(e.source, window.opener))
            return
        if (e.data?.type !== MSG_WEDDING_IMPORT)
            return

        const receiverStartedAt = performance.now()
        const normalized = normalizeWeddingSeatingRows(e.data.persons)
        const { rows, duplicateCount } = deduplicateWeddingSeatingRows(normalized)
        if (rows.length === 0) {
            emitBridge(EVT_FAILED, { reason: 'invalid-data' })
            toast.open({
                message: t('error.weddingSeatingBridgeInvalid'),
                type: 'error',
                position: 'top-right',
            })
            window.opener?.postMessage({ type: MSG_WEDDING_DONE, ok: false }, parentOrigin)
            return
        }

        try {
            const copy = rows.map(r => ({ ...r }))
            const processed = addOtherInfo(copy)
            const replacement = personConfig.replacePersonList(processed)
            const persistenceStartedAt = performance.now()
            const sentAt = typeof e.data.sentAt === 'number' && Number.isFinite(e.data.sentAt)
                ? e.data.sentAt
                : undefined
            replacement.persistence
                .then(() => {
                    clearSyncExclusions()
                    toast.open({
                        message: t('error.weddingSeatingBridgeSuccess'),
                        type: 'success',
                        position: 'top-right',
                    })
                    router.push({ name: 'AllPersonConfig' }).catch(() => {})
                    emitBridge(EVT_IMPORTED, {
                        parentOrigin,
                        rowsAccepted: replacement.finalCount,
                        rowsNormalized: normalized.length,
                        duplicateRowsRemoved: duplicateCount,
                        guestCount: typeof e.data.guestCount === 'number' ? e.data.guestCount : undefined,
                        receiverPreparationMs: persistenceStartedAt - receiverStartedAt,
                        receiverPersistenceMs: performance.now() - persistenceStartedAt,
                        completionLatencyMs: sentAt !== undefined ? Date.now() - sentAt : undefined,
                    })
                    window.opener?.postMessage({ type: MSG_WEDDING_DONE, ok: true }, parentOrigin)
                })
                .catch(() => {
                    emitBridge(EVT_FAILED, { reason: 'persistence-failed' })
                    toast.open({
                        message: t('error.importFail'),
                        type: 'error',
                        position: 'top-right',
                    })
                    window.opener?.postMessage({ type: MSG_WEDDING_DONE, ok: false }, parentOrigin)
                })
        }
        catch {
            emitBridge(EVT_FAILED, { reason: 'exception' })
            toast.open({
                message: t('error.importFail'),
                type: 'error',
                position: 'top-right',
            })
            window.opener?.postMessage({ type: MSG_WEDDING_DONE, ok: false }, parentOrigin)
        }
    }

    window.addEventListener('message', onMessage)

    queueMicrotask(() => {
        if (disposed)
            return
        try {
            window.opener?.postMessage({ type: MSG_LOTTERY_READY }, parentOrigin)
        }
        catch {
            // ignore
        }
    })

    return () => {
        disposed = true
        window.removeEventListener('message', onMessage)
    }
}
