import type { HandoffMode, HandoffPhase } from './stateHandoffContract'

export const WEDDING_SEATING_HANDOFF_TRACE_EVENT = 'wedding-seating-handoff-trace'

let traceSequence = 0

/** Emits metadata-only observation points for the reproducible browser-path evaluation. */
export function emitWeddingSeatingHandoffTrace(
    mode: HandoffMode,
    phase: HandoffPhase,
    detail: { incomingSequence?: number } = {},
): void {
    const eventDetail = {
        mode,
        phase,
        traceSequence: ++traceSequence,
        occurredAtEpochMs: Date.now(),
        ...detail,
    }
    queueMicrotask(() => {
        try {
            window.dispatchEvent(new CustomEvent(WEDDING_SEATING_HANDOFF_TRACE_EVENT, { detail: eventDetail }))
        }
        catch {
            // Observation must not alter the handoff path.
        }
    })
}
