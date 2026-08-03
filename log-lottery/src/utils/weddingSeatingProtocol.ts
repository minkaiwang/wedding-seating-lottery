export interface NormalizedWeddingSeatingRow {
    uid: unknown
    plannerGuestId?: string
    name: string
    department: string
    identity: string
    avatar: string
}

export interface WeddingSeatingSyncMeta {
    seq?: number
    guestCount?: number
    plannerGuestTotal?: number
    tableCount?: number
    sentAt?: number
    latencyMs?: number
    rawPersonsLen?: number
}

export interface WeddingSeatingSequenceWatermark {
    acceptedSeq: number
    persistedSeq: number
}

export type WeddingSeatingSyncDecision
    = | { action: 'ignore-stale', rows: [], meta: WeddingSeatingSyncMeta, reason: 'non-increasing-seq' }
      | { action: 'skip-empty', rows: [], meta: WeddingSeatingSyncMeta, reason: 'authoritative-roster-nonempty' }
      | { action: 'clear', rows: [], meta: WeddingSeatingSyncMeta }
      | { action: 'merge', rows: NormalizedWeddingSeatingRow[], meta: WeddingSeatingSyncMeta }

export function createWeddingSeatingSequenceWatermark(
    initialSeq: number = 0,
): WeddingSeatingSequenceWatermark {
    return { acceptedSeq: initialSeq, persistedSeq: initialSeq }
}

export function reserveWeddingSeatingSequence(
    watermark: WeddingSeatingSequenceWatermark,
    seq: number | undefined,
): WeddingSeatingSequenceWatermark {
    if (seq === undefined)
        return watermark
    return { ...watermark, acceptedSeq: Math.max(watermark.acceptedSeq, seq) }
}

export function settleWeddingSeatingSequence(
    watermark: WeddingSeatingSequenceWatermark,
    seq: number | undefined,
    outcome: 'persisted' | 'failed',
): WeddingSeatingSequenceWatermark {
    if (seq === undefined)
        return watermark

    if (outcome === 'persisted') {
        const persistedSeq = Math.max(watermark.persistedSeq, seq)
        return {
            acceptedSeq: Math.max(watermark.acceptedSeq, persistedSeq),
            persistedSeq,
        }
    }

    if (watermark.acceptedSeq === seq && watermark.persistedSeq < seq) {
        return { ...watermark, acceptedSeq: watermark.persistedSeq }
    }
    return watermark
}

function finiteNumber(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function normalizedScalar(value: unknown): string {
    if (typeof value === 'string')
        return value.normalize('NFC').trim()
    if (typeof value === 'number' && Number.isFinite(value))
        return String(value)
    if (typeof value === 'boolean')
        return String(value)
    return ''
}

function normalizedUid(value: unknown, fallback: number): string | number {
    if (typeof value === 'number' && Number.isFinite(value))
        return value
    const normalized = normalizedScalar(value)
    return normalized || fallback
}

export function normalizeWeddingSeatingRows(persons: unknown): NormalizedWeddingSeatingRow[] {
    if (!Array.isArray(persons))
        return []

    const rows: NormalizedWeddingSeatingRow[] = []
    for (let i = 0; i < persons.length; i++) {
        const candidate = persons[i]
        if (!candidate || typeof candidate !== 'object')
            continue

        const row = candidate as Record<string, unknown>
        if (typeof row.name !== 'string')
            continue

        const name = row.name.normalize('NFC').trim()
        if (!name)
            continue

        rows.push({
            uid: normalizedUid(row.uid, i + 1),
            plannerGuestId: normalizedScalar(row.plannerGuestId) || undefined,
            name,
            department: normalizedScalar(row.department),
            identity: normalizedScalar(row.identity),
            avatar: normalizedScalar(row.avatar),
        })
    }
    return rows
}

export function decideWeddingSeatingSync(
    payload: Record<string, unknown>,
    lastAppliedSeq: number,
    nowMs: number = Date.now(),
): WeddingSeatingSyncDecision {
    const seq = finiteNumber(payload.seq)
    const guestCount = finiteNumber(payload.guestCount)
    const plannerGuestTotal = finiteNumber(payload.plannerGuestTotal)
    const tableCount = finiteNumber(payload.tableCount)
    const sentAt = finiteNumber(payload.sentAt)
    const rawPersonsLen = Array.isArray(payload.persons) ? payload.persons.length : undefined
    const latency = sentAt !== undefined ? nowMs - sentAt : undefined
    const meta: WeddingSeatingSyncMeta = {
        seq,
        guestCount,
        plannerGuestTotal,
        tableCount,
        sentAt,
        latencyMs: latency !== undefined && Number.isFinite(latency) ? latency : undefined,
        rawPersonsLen,
    }

    if (seq !== undefined && seq <= lastAppliedSeq) {
        return { action: 'ignore-stale', rows: [], meta, reason: 'non-increasing-seq' }
    }

    const rows = normalizeWeddingSeatingRows(payload.persons)
    if (rows.length > 0)
        return { action: 'merge', rows, meta }

    if ((guestCount ?? 0) > 0 || (plannerGuestTotal ?? 0) > 0) {
        return {
            action: 'skip-empty',
            rows: [],
            meta,
            reason: 'authoritative-roster-nonempty',
        }
    }

    return { action: 'clear', rows: [], meta }
}
