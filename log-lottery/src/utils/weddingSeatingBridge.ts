import type { Router } from 'vue-router'
import type { useToast } from 'vue-toast-notification'
import i18n from '@/locales/i18n'
import useStore from '@/store'
import { addOtherInfo } from '@/utils/index'
import { isLogLotteryEmbedMode } from '@/utils/runtimeEmbed'
import { clearSyncExclusions } from '@/utils/seatingSyncExclusions'
import { allowedWeddingSeatingOrigins } from '@/utils/weddingSeatingOrigins'

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
        if (e.data?.type !== MSG_WEDDING_IMPORT)
            return

        const rows = normalizeImportRows(e.data.persons)
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
            clearSyncExclusions()
            personConfig.resetPerson()
            personConfig.addNotPersonList(processed)
            toast.open({
                message: t('error.weddingSeatingBridgeSuccess'),
                type: 'success',
                position: 'top-right',
            })
            router.push({ name: 'AllPersonConfig' }).catch(() => {})
            emitBridge(EVT_IMPORTED, { parentOrigin })
            window.opener?.postMessage({ type: MSG_WEDDING_DONE, ok: true }, parentOrigin)
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
