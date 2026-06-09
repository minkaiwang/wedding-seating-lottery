/**
 * Wedding seating planner opens this app in a 1×1 hidden iframe with `embed=1` (see `buildLotteryLiveSyncUrl`).
 * Mark the document root early so layout can skip floating chrome.
 */
export function applyLogLotteryEmbedClass(): void {
    try {
        if (typeof window === 'undefined')
            return
        if (new URLSearchParams(window.location.search).get('embed') === '1')
            document.documentElement.classList.add('log-lottery-embed')
    }
    catch {
        // ignore
    }
}

export function isLogLotteryEmbedMode(): boolean {
    return typeof document !== 'undefined' && document.documentElement.classList.contains('log-lottery-embed')
}
