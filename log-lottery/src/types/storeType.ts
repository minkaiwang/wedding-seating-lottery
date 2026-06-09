export interface IPersonConfig {
    id: number
    /** Stable guest id from wedding seating planner (live sync matching). */
    plannerGuestId?: string
    uid: string
    uuid: string
    name: string
    department: string
    identity: string
    avatar: string
    isWin: boolean
    x: number
    y: number
    createTime: string
    updateTime: string
    prizeName: string[]
    prizeId: string[]
    prizeTime: string[]
}
export interface Separate {
    id: string
    count: number
    isUsedCount: number
}
export interface IPrizeConfig {
    id: number | string
    name: string
    sort: number
    isAll: boolean
    count: number
    isUsedCount: number
    picture: {
        id: string
        name: string
        url: string | Blob | ArrayBuffer
    }
    separateCount: {
        enable: boolean
        countList: Separate[]
    }
    desc: string
    isShow: boolean
    isUsed: boolean
    frequency: number
    /** 可重复奖项已完成轮数（isAll 为 true 时使用） */
    frequencyUsedCount?: number
}
export interface IMusic {
    id: string
    name: string
    url: string | Blob | ArrayBuffer
}

export interface IImage {
    id: string
    name: string
    url: string | Blob | ArrayBuffer
}

export interface WsMsgData { data: string, id: string, dateTime: string }
export interface ServerType {
    id: string
    name: string
    value: string
    host: string
}
