const LS_KEY = 'logLottery:seatingSyncExcludedKeys'

export function seatingPersonKey(row: {
    plannerGuestId?: unknown
    uid?: unknown
    name?: string
    department?: unknown
    identity?: unknown
}): string {
    if (row.plannerGuestId != null && String(row.plannerGuestId).trim() !== '')
        return `gid:${String(row.plannerGuestId).trim()}`
    const name = row.name != null ? String(row.name).trim() : ''
    const dept = row.department != null ? String(row.department) : ''
    const identity = row.identity != null ? String(row.identity) : ''
    if (row.uid != null && String(row.uid).trim() !== '')
        return `uid:${String(row.uid).trim()}|${name}|${dept}|${identity}`
    return `legacy:${name}|${dept}|${identity}`
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
    set.add(seatingPersonKey(row))
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
