import type {
    HandoffExecution,
    HandoffMode,
    HandoffScenario,
    StateHandoffContractReport,
} from './stateHandoffContract'
import type { WeddingSeatingMergePerson } from './weddingSeatingMerge'
import { isSyncExcluded, seatingLegacyIdentityKey, seatingPersonKey } from './seatingSyncExclusions'
import { checkStateHandoffContract } from './stateHandoffContract'
import { normalizeWeddingSeatingRows } from './weddingSeatingProtocol'

export interface WeddingSeatingContractPerson extends WeddingSeatingMergePerson {
    isWin?: boolean
    prizeName?: readonly unknown[]
    prizeId?: readonly unknown[]
    prizeTime?: readonly unknown[]
}

export interface WeddingSeatingContractObservation {
    mode: HandoffMode
    sourcePersons: unknown
    destinationBefore: readonly WeddingSeatingContractPerson[]
    destinationAfter: readonly WeddingSeatingContractPerson[]
    completedBefore?: readonly WeddingSeatingContractPerson[]
    completedAfter?: readonly WeddingSeatingContractPerson[]
    exclusions?: ReadonlySet<string>
    scenario: HandoffScenario
    execution: HandoffExecution
}

interface DestinationRecord {
    person: WeddingSeatingContractPerson
    completed: boolean
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

function publicState(record: {
    name?: unknown
    department?: unknown
    identity?: unknown
    avatar?: unknown
}) {
    return {
        name: normalizedScalar(record.name),
        department: normalizedScalar(record.department),
        identity: normalizedScalar(record.identity),
        avatar: normalizedScalar(record.avatar),
    }
}

function wrapDestination(
    records: readonly WeddingSeatingContractPerson[],
    completedRecords: readonly WeddingSeatingContractPerson[],
): DestinationRecord[] {
    const completedIds = new Set(completedRecords.map(record => record.id))
    return records.map(person => ({ person, completed: completedIds.has(person.id) }))
}

/** Maps the seating-to-lottery records onto the business-independent handoff contract. */
export function checkWeddingSeatingHandoff(
    observation: WeddingSeatingContractObservation,
): StateHandoffContractReport {
    const source = normalizeWeddingSeatingRows(observation.sourcePersons)
    const exclusions = observation.exclusions ?? new Set<string>()
    const before = wrapDestination(observation.destinationBefore, observation.completedBefore ?? [])
    const after = wrapDestination(observation.destinationAfter, observation.completedAfter ?? [])

    return checkStateHandoffContract({
        mode: observation.mode,
        source,
        destinationBefore: before,
        destinationAfter: after,
        scenario: {
            authoritativeSourceCount: source.length,
            ...observation.scenario,
        },
        execution: observation.execution,
        model: {
            sourceIdentity: seatingPersonKey,
            destinationIdentity: record => seatingPersonKey(record.person),
            sourceFallbackIdentity: seatingLegacyIdentityKey,
            destinationFallbackIdentity: record => seatingLegacyIdentityKey(record.person),
            sourcePublicState: publicState,
            destinationPublicState: record => publicState(record.person),
            destinationInstanceIdentity: record => normalizedScalar(record.person.id) || undefined,
            destinationOwnedState: record => ({
                id: record.person.id,
                isWin: Boolean(record.person.isWin),
                prizeName: [...(record.person.prizeName ?? [])],
                prizeId: [...(record.person.prizeId ?? [])],
                prizeTime: [...(record.person.prizeTime ?? [])],
                completed: record.completed,
            }),
            sourceEligible: observation.mode === 'synchronize'
                ? row => !isSyncExcluded(exclusions, row)
                : undefined,
        },
    })
}
