import type { NormalizedWeddingSeatingRow } from './weddingSeatingProtocol'
import { isSyncExcluded, seatingLegacyIdentityKey, seatingPersonKey } from './seatingSyncExclusions'

export interface WeddingSeatingMergePerson {
    id: unknown
    plannerGuestId?: string
    uid?: unknown
    name: string
    department: string
    identity: string
    avatar: string
}

export interface WeddingSeatingMergeMetrics {
    incoming: number
    excluded: number
    deduplicated: number
    matchedByStableKey: number
    upgradedFromLegacy: number
    created: number
}

export interface WeddingSeatingMergeResult<P extends WeddingSeatingMergePerson> {
    allPersonList: P[]
    alreadyPersonList: P[]
    metrics: WeddingSeatingMergeMetrics
}

export function deduplicateWeddingSeatingRows(rows: readonly NormalizedWeddingSeatingRow[]): {
    rows: NormalizedWeddingSeatingRow[]
    duplicateCount: number
} {
    const byKey = new Map<string, NormalizedWeddingSeatingRow>()
    for (const row of rows)
        byKey.set(seatingPersonKey(row), row)
    return {
        rows: [...byKey.values()],
        duplicateCount: rows.length - byKey.size,
    }
}

/** Pure roster merge used by the runtime store and the reproducible evaluation harness. */
export function mergeWeddingSeatingRoster<P extends WeddingSeatingMergePerson>(
    existingAll: readonly P[],
    existingAlready: readonly P[],
    incomingRows: readonly NormalizedWeddingSeatingRow[],
    exclusions: ReadonlySet<string>,
    createPerson: (row: NormalizedWeddingSeatingRow) => P,
): WeddingSeatingMergeResult<P> {
    const clonedAll = existingAll.map(person => ({ ...person }) as P)
    const clonedById = new Map(clonedAll.map(person => [person.id, person]))
    const clonedAlready = existingAlready
        .map(person => clonedById.get(person.id))
        .filter((person): person is P => person !== undefined)
    const acceptedRows = incomingRows.filter(row => !isSyncExcluded(exclusions, row))
    const deduplicated = deduplicateWeddingSeatingRows(acceptedRows)
    const effective = deduplicated.rows
    const metrics: WeddingSeatingMergeMetrics = {
        incoming: incomingRows.length,
        excluded: incomingRows.length - acceptedRows.length,
        deduplicated: deduplicated.duplicateCount,
        matchedByStableKey: 0,
        upgradedFromLegacy: 0,
        created: 0,
    }

    if (effective.length === 0) {
        return incomingRows.length === 0
            ? { allPersonList: [], alreadyPersonList: [], metrics }
            : { allPersonList: clonedAll, alreadyPersonList: clonedAlready, metrics }
    }

    const existingByKey = new Map<string, P>()
    const legacyByKey = new Map<string, P[]>()
    for (const person of clonedAll) {
        existingByKey.set(seatingPersonKey(person), person)
        if (person.plannerGuestId == null || String(person.plannerGuestId).trim() === '') {
            const legacyKey = seatingLegacyIdentityKey(person)
            const candidates = legacyByKey.get(legacyKey) ?? []
            candidates.push(person)
            legacyByKey.set(legacyKey, candidates)
        }
    }

    const nextList: P[] = []
    const usedIds = new Set<unknown>()
    for (const row of effective) {
        const key = seatingPersonKey(row)
        let existing = existingByKey.get(key)
        if (existing && !usedIds.has(existing.id)) {
            metrics.matchedByStableKey++
        }
        else {
            existing = undefined
            if (row.plannerGuestId != null && row.plannerGuestId.trim() !== '') {
                const candidates = legacyByKey.get(seatingLegacyIdentityKey(row)) ?? []
                existing = candidates.find(person => !usedIds.has(person.id))
                if (existing) {
                    existing.plannerGuestId = row.plannerGuestId
                    existingByKey.set(key, existing)
                    metrics.upgradedFromLegacy++
                }
            }
        }

        if (existing) {
            usedIds.add(existing.id)
            existing.name = row.name
            existing.department = row.department
            existing.identity = row.identity
            if (row.plannerGuestId != null)
                existing.plannerGuestId = row.plannerGuestId
            existing.uid = String(row.uid)
            existing.avatar = row.avatar
            nextList.push(existing)
        }
        else {
            const created = createPerson({ ...row })
            if (row.plannerGuestId != null)
                created.plannerGuestId = row.plannerGuestId
            nextList.push(created)
            usedIds.add(created.id)
            existingByKey.set(key, created)
            metrics.created++
        }
    }

    const nextById = new Map(nextList.map(person => [person.id, person]))
    const nextAlready = clonedAlready
        .map(person => nextById.get(person.id))
        .filter((person): person is P => person !== undefined)
    return { allPersonList: nextList, alreadyPersonList: nextAlready, metrics }
}
