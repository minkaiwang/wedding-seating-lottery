/**
 * Origins allowed to postMessage into log-lottery (import bridge + live sync).
 * Override with `VITE_WEDDING_SEATING_ORIGINS` (comma-separated) for other deployments.
 */
export const DEFAULT_WEDDING_SEATING_ORIGINS: readonly string[] = [
    'http://localhost:3001',
    'http://127.0.0.1:3001',
    'http://localhost:3000',
    'http://127.0.0.1:3000',
    'http://localhost:3002',
    'http://127.0.0.1:3002',
    'https://wedding-seating-plan-pearl.vercel.app',
]

export function allowedWeddingSeatingOrigins(): string[] {
    const raw = (import.meta.env.VITE_WEDDING_SEATING_ORIGINS as string | undefined)?.trim()
    if (raw) {
        const list = raw.split(',').map(s => s.trim()).filter(Boolean)
        return [...new Set(list)]
    }
    return [...DEFAULT_WEDDING_SEATING_ORIGINS]
}
