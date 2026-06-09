/** Hub URLs shared with the wedding seating planner and lottery apps. */
export function getWeddingSeatingUrl(): string {
    return import.meta.env.VITE_WEDDING_SEATING_URL ?? 'http://localhost:3000'
}

export function getWeddingLotteryHomeUrl(): string {
    const fromEnv = import.meta.env.VITE_WEDDING_LOTTERY_HOME_URL
    if (fromEnv)
        return fromEnv
    if (typeof window !== 'undefined' && window.location?.origin)
        return `${window.location.origin}/log-lottery/home`
    return 'http://localhost:6719/log-lottery/home'
}
