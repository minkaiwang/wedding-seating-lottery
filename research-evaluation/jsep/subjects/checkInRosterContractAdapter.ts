import type {
    HandoffExecution,
    HandoffMode,
    HandoffScenario,
    StateHandoffContractReport,
} from '../../../log-lottery/src/utils/stateHandoffContract'
import { checkStateHandoffContract } from '../../../log-lottery/src/utils/stateHandoffContract'

export interface CheckInRosterSourceRecord {
    id?: unknown
    email?: unknown
    username?: unknown
    teamName?: unknown
    tShirt?: unknown
}

export interface CheckInRosterDestinationRecord extends CheckInRosterSourceRecord {
    id?: unknown
    checked?: unknown
}

export interface CheckInRosterContractObservation {
    mode: HandoffMode
    sourceRows: readonly CheckInRosterSourceRecord[]
    destinationBefore: readonly CheckInRosterDestinationRecord[]
    destinationAfter: readonly CheckInRosterDestinationRecord[]
    scenario: HandoffScenario
    execution: HandoffExecution
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

function stableIdentity(record: CheckInRosterSourceRecord): string | undefined {
    return normalizedScalar(record.id) || undefined
}

function publicState(record: CheckInRosterSourceRecord) {
    return {
        email: normalizedScalar(record.email).toLocaleLowerCase('en-US'),
        username: normalizedScalar(record.username),
        teamName: normalizedScalar(record.teamName),
        tShirt: normalizedScalar(record.tShirt),
    }
}

function checkedState(value: unknown): boolean {
    return value === true || normalizedScalar(value).toLocaleLowerCase('en-US') === 'true'
}

/** Maps a CSV-roster-to-check-in workflow onto the business-independent handoff contract. */
export function checkCheckInRosterHandoff(
    observation: CheckInRosterContractObservation,
): StateHandoffContractReport {
    return checkStateHandoffContract({
        mode: observation.mode,
        source: observation.sourceRows,
        destinationBefore: observation.destinationBefore,
        destinationAfter: observation.destinationAfter,
        scenario: {
            authoritativeSourceCount: observation.sourceRows.length,
            ...observation.scenario,
        },
        execution: observation.execution,
        model: {
            sourceIdentity: stableIdentity,
            destinationIdentity: stableIdentity,
            sourcePublicState: publicState,
            destinationPublicState: publicState,
            destinationOwnedState: record => ({
                checked: checkedState(record.checked),
            }),
        },
    })
}
