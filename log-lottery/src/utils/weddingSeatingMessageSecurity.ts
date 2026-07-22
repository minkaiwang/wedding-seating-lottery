/** Exact window identity check in addition to the existing origin allow-list. */
export function isTrustedWindowSource(source: unknown, expectedSource: unknown): boolean {
    return expectedSource != null && source === expectedSource
}

/**
 * Live sync must be the hidden, explicitly configured iframe. A normal lottery
 * page must not accept parent-window messages merely because their origin is
 * allow-listed.
 */
export function readTrustedLiveSyncParentOrigin(
    search: string,
    isEmbedded: boolean,
    hasParentWindow: boolean,
    allowedOrigins: readonly string[],
): string | null {
    if (!isEmbedded || !hasParentWindow)
        return null

    try {
        const params = new URLSearchParams(search)
        if (params.get('embed') !== '1' || params.get('liveSync') !== '1')
            return null
        const from = params.get('from')
        if (!from)
            return null
        const origin = new URL(from).origin
        return allowedOrigins.includes(origin) ? origin : null
    }
    catch {
        return null
    }
}
