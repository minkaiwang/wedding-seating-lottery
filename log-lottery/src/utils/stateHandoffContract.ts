export type HandoffMode = 'replace' | 'synchronize'

export type HandoffDecision
    = | 'replace'
      | 'merge'
      | 'clear'
      | 'skip-empty'
      | 'ignore-stale'
      | 'reject'

export type HandoffPhase
    = | 'ready-received'
      | 'transfer-sent'
      | 'message-received'
      | 'commit-started'
      | 'commit-succeeded'
      | 'commit-failed'
      | 'completion-success'
      | 'completion-failure'

export type HandoffClauseId = 'I1' | 'I2' | 'I3' | 'I4'
export type HandoffOracleId = 'O0' | 'O1' | 'O2'

export interface HandoffRecordModel<S, D> {
    sourceIdentity: (record: S) => string | undefined
    destinationIdentity: (record: D) => string | undefined
    sourcePublicState: (record: S) => unknown
    destinationPublicState: (record: D) => unknown
    sourceFallbackIdentity?: (record: S) => string | undefined
    destinationFallbackIdentity?: (record: D) => string | undefined
    destinationOwnedState?: (record: D) => unknown
    destinationInstanceIdentity?: (record: D) => string | undefined
    sourceEligible?: (record: S) => boolean
}

export interface HandoffScenario {
    expectedOrigin?: string
    expectedPeer?: string
    authoritativeSourceCount?: number
    incomingSequence?: number
    acceptedSequenceBefore?: number
    persistedSequenceBefore?: number
    persistenceOutcome?: 'success' | 'failure'
}

export interface HandoffExecution {
    observedOrigin?: string
    observedPeer?: string
    decision: HandoffDecision
    phases: readonly HandoffPhase[]
    acceptedSequenceAfter?: number
    persistedSequenceAfter?: number
    atomicCommit?: boolean
}

export interface StateHandoffObservation<S, D> {
    mode: HandoffMode
    source: readonly S[]
    destinationBefore: readonly D[]
    destinationAfter: readonly D[]
    model: HandoffRecordModel<S, D>
    scenario: HandoffScenario
    execution: HandoffExecution
}

export interface HandoffFailure {
    code: string
    message: string
    identity?: string
}

export interface HandoffClauseResult {
    clause: HandoffClauseId
    applicable: boolean
    passed: boolean
    failures: HandoffFailure[]
}

export interface HandoffOracleResult {
    oracle: HandoffOracleId
    passed: boolean
    failures: HandoffFailure[]
}

export interface StateHandoffContractReport {
    mode: HandoffMode
    expectedDecision: HandoffDecision
    clauses: Record<HandoffClauseId, HandoffClauseResult>
    oracles: Record<HandoffOracleId, HandoffOracleResult>
    metrics: {
        sourceRecords: number
        eligibleSourceRecords: number
        expectedIdentities: number
        duplicateSourceIdentities: number
        destinationBeforeRecords: number
        destinationAfterRecords: number
    }
}

interface IndexedRecords<T> {
    byIdentity: Map<string, T>
    duplicateIdentities: Set<string>
    missingIdentityCount: number
}

function stableValue(value: unknown): string {
    if (value === undefined)
        return 'undefined'
    if (value === null || typeof value !== 'object')
        return JSON.stringify(value)
    if (Array.isArray(value))
        return `[${value.map(stableValue).join(',')}]`

    const entries = Object.entries(value as Record<string, unknown>)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, item]) => `${JSON.stringify(key)}:${stableValue(item)}`)
    return `{${entries.join(',')}}`
}

function indexLastWins<T>(records: readonly T[], identityOf: (record: T) => string | undefined): IndexedRecords<T> {
    const byIdentity = new Map<string, T>()
    const duplicateIdentities = new Set<string>()
    let missingIdentityCount = 0
    for (const record of records) {
        const identity = identityOf(record)
        if (!identity) {
            missingIdentityCount++
            continue
        }
        if (byIdentity.has(identity))
            duplicateIdentities.add(identity)
        byIdentity.set(identity, record)
    }
    return { byIdentity, duplicateIdentities, missingIdentityCount }
}

function makeClause(
    clause: HandoffClauseId,
    applicable: boolean,
    failures: HandoffFailure[],
): HandoffClauseResult {
    return {
        clause,
        applicable,
        passed: !applicable || failures.length === 0,
        failures,
    }
}

function failure(code: string, message: string, identity?: string): HandoffFailure {
    return { code, message, identity }
}

function isAcceptedDecision(decision: HandoffDecision): boolean {
    return decision === 'replace' || decision === 'merge' || decision === 'clear'
}

function phaseIndex(phases: readonly HandoffPhase[], phase: HandoffPhase): number {
    return phases.indexOf(phase)
}

function hasPhase(phases: readonly HandoffPhase[], phase: HandoffPhase): boolean {
    return phaseIndex(phases, phase) >= 0
}

function requireOrderedPhases(
    phases: readonly HandoffPhase[],
    required: readonly HandoffPhase[],
    code: string,
    failures: HandoffFailure[],
): void {
    let previousIndex = -1
    for (const phase of required) {
        const currentIndex = phaseIndex(phases, phase)
        if (currentIndex < 0) {
            failures.push(failure(code, `Missing required phase: ${phase}`))
            return
        }
        if (currentIndex <= previousIndex) {
            failures.push(failure(code, `Phase ${phase} occurred out of order`))
            return
        }
        previousIndex = currentIndex
    }
}

function destinationSnapshot<S, D>(records: readonly D[], model: HandoffRecordModel<S, D>): string[] {
    return records.map(record => stableValue({
        identity: model.destinationIdentity(record),
        instance: model.destinationInstanceIdentity?.(record),
        publicState: model.destinationPublicState(record),
        ownedState: model.destinationOwnedState?.(record),
    })).sort()
}

function sameDestinationSnapshot<S, D>(
    before: readonly D[],
    after: readonly D[],
    model: HandoffRecordModel<S, D>,
): boolean {
    return stableValue(destinationSnapshot(before, model)) === stableValue(destinationSnapshot(after, model))
}

function expectedDecision<S, D>(observation: StateHandoffObservation<S, D>): HandoffDecision {
    const { execution, mode, source, scenario } = observation
    if (
        (scenario.expectedOrigin !== undefined && execution.observedOrigin !== scenario.expectedOrigin)
        || (scenario.expectedPeer !== undefined && execution.observedPeer !== scenario.expectedPeer)
    ) {
        return 'reject'
    }

    if (mode === 'replace') {
        const readyIndex = phaseIndex(execution.phases, 'ready-received')
        const transferIndex = phaseIndex(execution.phases, 'transfer-sent')
        if (source.length === 0 || readyIndex < 0 || transferIndex < 0 || readyIndex >= transferIndex)
            return 'reject'
        return 'replace'
    }

    if (
        scenario.incomingSequence !== undefined
        && scenario.acceptedSequenceBefore !== undefined
        && scenario.incomingSequence <= scenario.acceptedSequenceBefore
    ) {
        return 'ignore-stale'
    }
    if (source.length > 0)
        return 'merge'
    if ((scenario.authoritativeSourceCount ?? 0) > 0)
        return 'skip-empty'
    return 'clear'
}

function checkSemanticIdentity<S, D>(
    observation: StateHandoffObservation<S, D>,
    expectedSource: IndexedRecords<S>,
    after: IndexedRecords<D>,
    expected: HandoffDecision,
): HandoffClauseResult {
    const applicable = isAcceptedDecision(expected)
      && (observation.scenario.persistenceOutcome ?? 'success') === 'success'
    if (!applicable)
        return makeClause('I1', false, [])

    const failures: HandoffFailure[] = []
    if (expectedSource.missingIdentityCount > 0) {
        failures.push(failure(
            'I1_SOURCE_IDENTITY_MISSING',
            `${expectedSource.missingIdentityCount} eligible source record(s) lacked semantic identity`,
        ))
    }
    if (after.missingIdentityCount > 0) {
        failures.push(failure(
            'I1_DESTINATION_IDENTITY_MISSING',
            `${after.missingIdentityCount} destination record(s) lacked semantic identity`,
        ))
    }
    for (const identity of after.duplicateIdentities) {
        failures.push(failure(
            'I1_DUPLICATE_DESTINATION_IDENTITY',
            'Destination contained more than one record for a semantic identity',
            identity,
        ))
    }

    if (observation.model.destinationInstanceIdentity) {
        const instances = indexLastWins(
            observation.destinationAfter,
            observation.model.destinationInstanceIdentity,
        )
        for (const identity of instances.duplicateIdentities) {
            failures.push(failure(
                'I1_DUPLICATE_DESTINATION_INSTANCE',
                'Destination reused one internal instance identity for multiple records',
                identity,
            ))
        }
    }

    for (const [identity, sourceRecord] of expectedSource.byIdentity) {
        const destinationRecord = after.byIdentity.get(identity)
        if (!destinationRecord) {
            failures.push(failure('I1_MISSING_DESTINATION_IDENTITY', 'Expected identity was absent after handoff', identity))
            continue
        }
        if (stableValue(observation.model.sourcePublicState(sourceRecord))
          !== stableValue(observation.model.destinationPublicState(destinationRecord))) {
            failures.push(failure('I1_PUBLIC_STATE_MISMATCH', 'Source-owned public state did not match by semantic identity', identity))
        }
    }
    for (const identity of after.byIdentity.keys()) {
        if (!expectedSource.byIdentity.has(identity)) {
            failures.push(failure('I1_UNEXPECTED_DESTINATION_IDENTITY', 'Destination retained an identity absent from the eligible source snapshot', identity))
        }
    }

    return makeClause('I1', true, failures)
}

function checkDestinationContinuity<S, D>(
    observation: StateHandoffObservation<S, D>,
    expectedSource: IndexedRecords<S>,
    after: IndexedRecords<D>,
    expected: HandoffDecision,
): HandoffClauseResult {
    const applicable = observation.mode === 'synchronize'
      && expected === 'merge'
      && (observation.scenario.persistenceOutcome ?? 'success') === 'success'
    if (!applicable)
        return makeClause('I2', false, [])

    const failures: HandoffFailure[] = []
    const ownedState = observation.model.destinationOwnedState
    if (!ownedState) {
        failures.push(failure('I2_OWNED_STATE_MODEL_MISSING', 'Synchronization requires a destination-owned state projection'))
        return makeClause('I2', true, failures)
    }

    const beforeByStable = new Map<string, D[]>()
    const beforeByFallback = new Map<string, D[]>()
    for (const record of observation.destinationBefore) {
        const stableIdentity = observation.model.destinationIdentity(record)
        if (stableIdentity) {
            const candidates = beforeByStable.get(stableIdentity) ?? []
            candidates.push(record)
            beforeByStable.set(stableIdentity, candidates)
        }
        const fallbackIdentity = observation.model.destinationFallbackIdentity?.(record)
        if (fallbackIdentity) {
            const candidates = beforeByFallback.get(fallbackIdentity) ?? []
            candidates.push(record)
            beforeByFallback.set(fallbackIdentity, candidates)
        }
    }

    const usedBefore = new Set<D>()
    for (const [identity, sourceRecord] of expectedSource.byIdentity) {
        const stableCandidate = (beforeByStable.get(identity) ?? []).find(record => !usedBefore.has(record))
        const fallbackIdentity = observation.model.sourceFallbackIdentity?.(sourceRecord)
        const fallbackCandidate = fallbackIdentity
            ? (beforeByFallback.get(fallbackIdentity) ?? []).find(record => !usedBefore.has(record))
            : undefined
        const beforeRecord = stableCandidate ?? fallbackCandidate
        if (!beforeRecord)
            continue
        usedBefore.add(beforeRecord)

        const afterRecord = after.byIdentity.get(identity)
        if (!afterRecord) {
            failures.push(failure('I2_CONTINUITY_TARGET_MISSING', 'A previously represented identity had no post-handoff record', identity))
            continue
        }
        if (stableValue(ownedState(beforeRecord)) !== stableValue(ownedState(afterRecord))) {
            failures.push(failure('I2_DESTINATION_STATE_CHANGED', 'Destination-owned state changed for the same semantic identity', identity))
        }
    }

    return makeClause('I2', true, failures)
}

function checkProtocolEligibility<S, D>(
    observation: StateHandoffObservation<S, D>,
    expected: HandoffDecision,
): HandoffClauseResult {
    const failures: HandoffFailure[] = []
    const { scenario, execution, mode } = observation

    if (
        scenario.expectedOrigin !== undefined
        && execution.observedOrigin !== scenario.expectedOrigin
        && execution.decision !== 'reject'
    ) {
        failures.push(failure('I3_UNTRUSTED_ORIGIN_ACCEPTED', 'A message from an unconfigured origin was not rejected'))
    }
    if (
        scenario.expectedPeer !== undefined
        && execution.observedPeer !== scenario.expectedPeer
        && execution.decision !== 'reject'
    ) {
        failures.push(failure('I3_UNBOUND_PEER_ACCEPTED', 'A message from a peer other than the bound window was not rejected'))
    }
    if (execution.decision !== expected) {
        failures.push(failure(
            'I3_DECISION_MISMATCH',
            `Expected protocol decision ${expected}, observed ${execution.decision}`,
        ))
    }

    if (mode === 'replace' && expected === 'replace') {
        requireOrderedPhases(
            execution.phases,
            ['ready-received', 'transfer-sent'],
            'I3_REPLACEMENT_PHASE_ORDER',
            failures,
        )
    }
    if (mode === 'synchronize' && isAcceptedDecision(expected)) {
        const messageIndex = phaseIndex(execution.phases, 'message-received')
        const commitIndex = phaseIndex(execution.phases, 'commit-started')
        if (messageIndex < 0 || commitIndex < 0 || messageIndex >= commitIndex) {
            failures.push(failure(
                'I3_SYNCHRONIZATION_PHASE_ORDER',
                'Synchronization must receive an eligible message before commit starts',
            ))
        }
        if (
            (scenario.persistenceOutcome ?? 'success') === 'failure'
            && scenario.incomingSequence !== undefined
        ) {
            if (execution.acceptedSequenceAfter !== scenario.acceptedSequenceBefore) {
                failures.push(failure(
                    'I3_FAILED_SEQUENCE_NOT_RETRYABLE',
                    'Failed sequence did not restore the prior accepted watermark',
                ))
            }
            if (execution.persistedSequenceAfter !== scenario.persistedSequenceBefore) {
                failures.push(failure(
                    'I3_FAILED_SEQUENCE_MARKED_PERSISTED',
                    'Failed sequence advanced the persisted watermark',
                ))
            }
        }
    }

    return makeClause('I3', true, failures)
}

function checkCompletion<S, D>(
    observation: StateHandoffObservation<S, D>,
    expected: HandoffDecision,
): HandoffClauseResult {
    const failures: HandoffFailure[] = []
    const { scenario, execution } = observation
    const persistenceOutcome = scenario.persistenceOutcome ?? 'success'
    const accepted = isAcceptedDecision(expected)

    if (accepted && persistenceOutcome === 'success') {
        requireOrderedPhases(
            execution.phases,
            ['commit-started', 'commit-succeeded', 'completion-success'],
            'I4_COMMIT_COMPLETION_ORDER',
            failures,
        )
        if (hasPhase(execution.phases, 'commit-failed'))
            failures.push(failure('I4_SUCCESS_AFTER_FAILURE', 'Successful completion followed a failed commit'))
        if (execution.atomicCommit === false)
            failures.push(failure('I4_NON_ATOMIC_COMMIT', 'The destination snapshot was not committed atomically'))

        if (observation.mode === 'synchronize' && scenario.incomingSequence !== undefined) {
            if (execution.acceptedSequenceAfter !== scenario.incomingSequence) {
                failures.push(failure(
                    'I4_ACCEPTED_WATERMARK_MISMATCH',
                    'Accepted sequence watermark did not equal the committed message sequence',
                ))
            }
            if (execution.persistedSequenceAfter !== scenario.incomingSequence) {
                failures.push(failure(
                    'I4_PERSISTED_WATERMARK_MISMATCH',
                    'Persisted sequence watermark did not equal the committed message sequence',
                ))
            }
        }
    }
    else if (accepted) {
        requireOrderedPhases(
            execution.phases,
            ['commit-started', 'commit-failed'],
            'I4_FAILURE_PHASE_ORDER',
            failures,
        )
        if (hasPhase(execution.phases, 'completion-success'))
            failures.push(failure('I4_SUCCESS_AFTER_FAILURE', 'Failed persistence was reported as successful completion'))
        if (!sameDestinationSnapshot(observation.destinationBefore, observation.destinationAfter, observation.model)) {
            failures.push(failure('I4_FAILED_COMMIT_CHANGED_DURABLE_STATE', 'Durable destination state changed after failed persistence'))
        }
    }
    else {
        if (hasPhase(execution.phases, 'commit-started') || hasPhase(execution.phases, 'commit-succeeded'))
            failures.push(failure('I4_INELIGIBLE_MESSAGE_COMMITTED', 'An ineligible or protected message entered the commit path'))
        if (hasPhase(execution.phases, 'completion-success'))
            failures.push(failure('I4_INELIGIBLE_MESSAGE_COMPLETED', 'An ineligible or protected message reported successful completion'))
        if (!sameDestinationSnapshot(observation.destinationBefore, observation.destinationAfter, observation.model))
            failures.push(failure('I4_INELIGIBLE_MESSAGE_CHANGED_STATE', 'Destination changed for an ineligible or protected message'))
        if (observation.mode === 'synchronize' && scenario.incomingSequence !== undefined) {
            if (execution.acceptedSequenceAfter !== scenario.acceptedSequenceBefore)
                failures.push(failure('I4_INELIGIBLE_SEQUENCE_ADVANCED_ACCEPTED', 'Ineligible message advanced the accepted watermark'))
            if (execution.persistedSequenceAfter !== scenario.persistedSequenceBefore)
                failures.push(failure('I4_INELIGIBLE_SEQUENCE_ADVANCED_PERSISTED', 'Ineligible message advanced the persisted watermark'))
        }
    }

    return makeClause('I4', true, failures)
}

function checkCompletionOracle<S, D>(
    observation: StateHandoffObservation<S, D>,
    expected: HandoffDecision,
): HandoffOracleResult {
    const shouldComplete = isAcceptedDecision(expected)
      && (observation.scenario.persistenceOutcome ?? 'success') === 'success'
    const didComplete = hasPhase(observation.execution.phases, 'completion-success')
    const failures = shouldComplete === didComplete
        ? []
        : [failure('O0_COMPLETION_MISMATCH', 'Observed successful completion did not match the scenario terminal expectation')]
    return { oracle: 'O0', passed: failures.length === 0, failures }
}

function checkSurfaceOracle<S, D>(
    observation: StateHandoffObservation<S, D>,
    expectedSource: IndexedRecords<S>,
    expected: HandoffDecision,
    completion: HandoffOracleResult,
): HandoffOracleResult {
    const failures = [...completion.failures]
    const shouldComplete = isAcceptedDecision(expected)
      && (observation.scenario.persistenceOutcome ?? 'success') === 'success'
    if (shouldComplete) {
        if (observation.destinationAfter.length !== expectedSource.byIdentity.size) {
            failures.push(failure('O1_COUNT_MISMATCH', 'Destination count did not match the deduplicated eligible source count'))
        }
        const expectedPublic = [...expectedSource.byIdentity.values()]
            .map(observation.model.sourcePublicState)
            .map(stableValue)
            .sort()
        const actualPublic = observation.destinationAfter
            .map(observation.model.destinationPublicState)
            .map(stableValue)
            .sort()
        if (stableValue(expectedPublic) !== stableValue(actualPublic))
            failures.push(failure('O1_PUBLIC_MULTISET_MISMATCH', 'Visible public fields differed as an unkeyed multiset'))
    }
    return { oracle: 'O1', passed: failures.length === 0, failures }
}

export function checkStateHandoffContract<S, D>(
    observation: StateHandoffObservation<S, D>,
): StateHandoffContractReport {
    const eligibleSource = observation.model.sourceEligible
        ? observation.source.filter(observation.model.sourceEligible)
        : [...observation.source]
    const sourceIndex = indexLastWins(eligibleSource, observation.model.sourceIdentity)
    const afterIndex = indexLastWins(observation.destinationAfter, observation.model.destinationIdentity)
    const expected = expectedDecision(observation)

    const i1 = checkSemanticIdentity(observation, sourceIndex, afterIndex, expected)
    const i2 = checkDestinationContinuity(observation, sourceIndex, afterIndex, expected)
    const i3 = checkProtocolEligibility(observation, expected)
    const i4 = checkCompletion(observation, expected)
    const o0 = checkCompletionOracle(observation, expected)
    const o1 = checkSurfaceOracle(observation, sourceIndex, expected, o0)
    const o2Failures = [i1, i2, i3, i4]
        .filter(result => result.applicable)
        .flatMap(result => result.failures)
    const o2: HandoffOracleResult = { oracle: 'O2', passed: o2Failures.length === 0, failures: o2Failures }

    return {
        mode: observation.mode,
        expectedDecision: expected,
        clauses: { I1: i1, I2: i2, I3: i3, I4: i4 },
        oracles: { O0: o0, O1: o1, O2: o2 },
        metrics: {
            sourceRecords: observation.source.length,
            eligibleSourceRecords: eligibleSource.length,
            expectedIdentities: sourceIndex.byIdentity.size,
            duplicateSourceIdentities: sourceIndex.duplicateIdentities.size,
            destinationBeforeRecords: observation.destinationBefore.length,
            destinationAfterRecords: observation.destinationAfter.length,
        },
    }
}

export function assertStateHandoffContract(report: StateHandoffContractReport): void {
    if (report.oracles.O2.passed)
        return
    const codes = report.oracles.O2.failures.map(item => item.code).join(', ')
    throw new Error(`State handoff contract failed: ${codes}`)
}
