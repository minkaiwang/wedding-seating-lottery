const LS_KEY = 'logLottery:seatingSyncExcludedKeys'

interface SeatingIdentityRow {
    plannerGuestId?: unknown
    uid?: unknown
    name?: string
    department?: unknown
    identity?: unknown
}

function normalizedKeyPart(value: unknown): string {
    if (typeof value === 'string')
        return value.normalize('NFC').trim()
    if (typeof value === 'number' && Number.isFinite(value))
        return String(value)
    if (typeof value === 'boolean')
        return String(value)
    return ''
}

function structuredKey(prefix: string, values: string[]): string {
    return `${prefix}:${JSON.stringify(values)}`
}

/** Key format used by the public baseline before structured legacy identities were added. */
function legacyDelimitedPersonKey(row: SeatingIdentityRow, ignorePlannerGuestId = false): string {
    if (!ignorePlannerGuestId && row.plannerGuestId != null && String(row.plannerGuestId).trim() !== '')
        return `gid:${String(row.plannerGuestId).trim()}`
    const name = row.name != null ? String(row.name).trim() : ''
    const dept = row.department != null ? String(row.department) : ''
    const identity = row.identity != null ? String(row.identity) : ''
    if (row.uid != null && String(row.uid).trim() !== '')
        return `uid:${String(row.uid).trim()}|${name}|${dept}|${identity}`
    return `legacy:${name}|${dept}|${identity}`
}

export function seatingPersonKey(row: SeatingIdentityRow): string {
    const plannerGuestId = normalizedKeyPart(row.plannerGuestId)
    if (plannerGuestId)
        return `gid:${plannerGuestId}`

    const uid = normalizedKeyPart(row.uid)
    const publicFields = [
        normalizedKeyPart(row.name),
        normalizedKeyPart(row.department),
        normalizedKeyPart(row.identity),
    ]
    return uid
        ? structuredKey('uid-v2', [uid, ...publicFields])
        : structuredKey('legacy-v2', publicFields)
}

/**
 * Public-field identity used only to upgrade an Excel-origin row to a stable planner id.
 * Unlike `seatingPersonKey`, this intentionally ignores the transient Excel `uid`.
 */
export function seatingLegacyIdentityKey(row: Pick<SeatingIdentityRow, 'name' | 'department' | 'identity'>): string {
    return structuredKey('legacy-v2', [
        normalizedKeyPart(row.name),
        normalizedKeyPart(row.department),
        normalizedKeyPart(row.identity),
    ])
}

/** New and historical keys that may identify the same person across Excel and live sync. */
export function seatingPersonKeyCandidates(row: SeatingIdentityRow): string[] {
    const candidates = [seatingPersonKey(row), legacyDelimitedPersonKey(row)]
    const plannerGuestId = normalizedKeyPart(row.plannerGuestId)
    const uid = normalizedKeyPart(row.uid)
    if (plannerGuestId && uid) {
        const withoutStableId = { ...row, plannerGuestId: undefined }
        candidates.push(seatingPersonKey(withoutStableId))
        candidates.push(legacyDelimitedPersonKey(withoutStableId, true))
    }
    return [...new Set(candidates)]
}

export function isSyncExcluded(exclusions: ReadonlySet<string>, row: SeatingIdentityRow): boolean {
    return seatingPersonKeyCandidates(row).some(key => exclusions.has(key))
}

function readSet(): Set<string> {
    try {
        const raw = localStorage.getItem(LS_KEY)
        if (!raw)
            return new Set()
        const arr = JSON.parse(raw)
        if (!Array.isArray(arr))
            return new Set()
        return new Set(arr.filter((x): x is string => typeof x === 'string' && x.length > 0))
    }
    catch {
        return new Set()
    }
}

function writeSet(set: Set<string>): void {
    try {
        localStorage.setItem(LS_KEY, JSON.stringify([...set]))
    }
    catch {
        /* ignore */
    }
}

export function readSyncExclusions(): Set<string> {
    return readSet()
}

export function addSyncExclusion(row: Parameters<typeof seatingPersonKey>[0]): void {
    const set = readSet()
    for (const key of seatingPersonKeyCandidates(row))
        set.add(key)
    writeSet(set)
}

export function clearSyncExclusions(): void {
    try {
        localStorage.removeItem(LS_KEY)
    }
    catch {
        /* ignore */
    }
}
