import type { IPersonConfig } from '@/types/storeType'
import confetti from 'canvas-confetti'
import { Object3D, Vector3 } from 'three'
import { filterData } from '@/utils'

/** Home grid: minimum visible rows (was hard-coded 7). */
export const HOME_GRID_MIN_ROWS = 9
export const HOME_GRID_MAX_ROWS = 11
/** Duplicate pool so the wall feels fuller than the raw guest count. */
export const HOME_DISPLAY_FILL_RATIO = 1.3
/** Original home layout reference (7 rows, wider gaps). */
export const HOME_REF_ROWS = 7
export const HOME_REF_GAP_X = 40
export const HOME_REF_GAP_Y = 20
export const HOME_TABLE_GAP_X = 24
export const HOME_TABLE_GAP_Y = 8

export interface HomeLayoutMetrics {
    maxRow: number
    layoutScale: number
    stepX: number
    stepY: number
}

export function computeHomeGridShape(rowCount: number, personCount: number): {
    rows: number
    totalCount: number
} {
    const safeRowCount = Math.max(1, rowCount)
    const safePersonCount = Math.max(0, personCount)
    const targetSlots = Math.max(
        safeRowCount * HOME_GRID_MIN_ROWS,
        Math.ceil(safePersonCount * HOME_DISPLAY_FILL_RATIO),
    )
    const rows = Math.min(
        HOME_GRID_MAX_ROWS,
        Math.max(HOME_GRID_MIN_ROWS, Math.ceil(targetSlots / safeRowCount)),
    )
    return { rows, totalCount: safeRowCount * rows }
}

function fillTablePool(allPersonList: IPersonConfig[], totalCount: number): IPersonConfig[] {
    if (allPersonList.length <= 0 || totalCount <= 0)
        return []
    if (allPersonList.length >= totalCount) {
        return allPersonList.slice(0, totalCount)
    }
    const pool: IPersonConfig[] = []
    while (pool.length < totalCount) {
        pool.push(...allPersonList.map(person => JSON.parse(JSON.stringify(person))))
    }
    return pool.slice(0, totalCount)
}

/**
 * @description 初始化表格数据
 */
export function initTableData({ allPersonList, rowCount }: { allPersonList: IPersonConfig[], rowCount: number }): IPersonConfig[] {
    if (allPersonList.length <= 0) {
        return []
    }
    const { totalCount } = computeHomeGridShape(rowCount, allPersonList.length)
    const tableData = fillTablePool(allPersonList, totalCount)
    return filterData(tableData, rowCount)
}

/** Match original 7-row cell pitch, scaled uniformly for denser grids. */
export function computeHomeLayoutMetrics(
    tableData: IPersonConfig[],
    rowCount: number,
    cardSize: { width: number, height: number },
): HomeLayoutMetrics {
    const maxRow = tableData.length > 0 ? Math.max(...tableData.map(row => row.y)) : HOME_REF_ROWS
    const baseStepX = cardSize.width + HOME_TABLE_GAP_X
    const baseStepY = cardSize.height + HOME_TABLE_GAP_Y
    const refStepX = cardSize.width + HOME_REF_GAP_X
    const refStepY = cardSize.height + HOME_REF_GAP_Y
    const layoutScale = Math.min(refStepX / baseStepX, refStepY / baseStepY)

    return {
        maxRow,
        layoutScale,
        stepX: baseStepX * layoutScale,
        stepY: baseStepY * layoutScale,
    }
}

/**
 * @description 横铺图形：居中放置，按原始间距比例等比放大
 */
export function createTableVertices({
    tableData,
    rowCount,
    layout,
}: {
    tableData: IPersonConfig[]
    rowCount: number
    layout: HomeLayoutMetrics
}): Object3D[] {
    const tableLen = tableData.length
    const objects: Object3D[] = []
    const xMid = (rowCount + 1) / 2
    const yMid = (layout.maxRow + 1) / 2

    for (let i = 0; i < tableLen; i++) {
        const object = new Object3D()
        object.position.x = (tableData[i].x - xMid) * layout.stepX
        object.position.y = (yMid - tableData[i].y) * layout.stepY
        object.position.z = 0
        objects.push(object)
    }
    return objects
}

export function computeHomeTableCameraZ(
    layout: HomeLayoutMetrics,
    rowCount: number,
    viewport: { width: number, height: number },
    fovDeg = 40,
): number {
    const halfW = (rowCount * layout.stepX) / 2
    const halfH = (layout.maxRow * layout.stepY) / 2
    if (halfW <= 0 || halfH <= 0)
        return 3000

    const fovRad = (fovDeg * Math.PI) / 180
    const aspect = Math.max(0.5, viewport.width / Math.max(1, viewport.height))
    const distV = halfH / Math.tan(fovRad / 2)
    const distH = halfW / (Math.tan(fovRad / 2) * aspect)

    return Math.max(distV * 1.14, distH * 1.06, 2800)
}

/** Slight downward shift so the pattern sits between title and bottom button. */
export function computeHomeCameraYOffset(layout: HomeLayoutMetrics): number {
    return -layout.stepY * 0.35
}

/**
 * @description 创建球体
 */
export function createSphereVertices({ objectsLength }: { objectsLength: number }): Object3D[] {
    let i = 0
    const resObjects: Object3D[] = []
    const vector = new Vector3()
    const radius = Math.min(920, 760 + Math.sqrt(objectsLength) * 12)

    for (; i < objectsLength; ++i) {
        const phi = Math.acos(-1 + (2 * i) / objectsLength)
        const theta = Math.sqrt(objectsLength * Math.PI) * phi
        const object = new Object3D()

        object.position.x = radius * Math.cos(theta) * Math.sin(phi)
        object.position.y = radius * Math.sin(theta) * Math.sin(phi)
        object.position.z = -radius * Math.cos(phi)

        vector.copy(object.position).multiplyScalar(2)
        object.lookAt(vector)
        resObjects.push(object)
    }
    return resObjects
}

const WEDDING_CONFETTI_COLORS = ['#e11d48', '#f43f5e', '#fb7185', '#fbbf24', '#fef3c7', '#ffffff', '#fda4af']

export function confettiFire(index: number, maxLimit: number) {
    if (index > maxLimit) {
        return
    }

    const burstDelay = index * 220

    window.setTimeout(() => {
        confetti({
            particleCount: 90,
            angle: 60,
            spread: 76,
            startVelocity: 52,
            origin: { x: 0, y: 0.62 },
            colors: WEDDING_CONFETTI_COLORS,
        })
        confetti({
            particleCount: 90,
            angle: 120,
            spread: 76,
            startVelocity: 52,
            origin: { x: 1, y: 0.62 },
            colors: WEDDING_CONFETTI_COLORS,
        })
        confetti({
            particleCount: 140,
            spread: 110,
            startVelocity: 48,
            origin: { y: 0.52 },
            scalar: 1.15,
            colors: WEDDING_CONFETTI_COLORS,
        })
        confetti({
            particleCount: 50,
            spread: 360,
            ticks: 120,
            gravity: 0.35,
            decay: 0.92,
            startVelocity: 28,
            shapes: ['star'],
            colors: ['#fbbf24', '#fef08a', '#ffffff'],
        })
        confetti({
            particleCount: 36,
            spread: 100,
            origin: { y: 0.7 },
            scalar: 0.9,
            shapes: ['circle'],
            colors: ['#fda4af', '#fbcfe8', '#fff1f2'],
        })
    }, burstDelay)

    const duration = 3.6 * 1000
    const end = Date.now() + duration;
    (function frame() {
        confetti({
            particleCount: 3,
            angle: 60,
            spread: 55,
            origin: { x: 0, y: 0.7 },
            colors: WEDDING_CONFETTI_COLORS,
        })
        confetti({
            particleCount: 3,
            angle: 120,
            spread: 55,
            origin: { x: 1, y: 0.7 },
            colors: WEDDING_CONFETTI_COLORS,
        })
        if (Date.now() < end) {
            requestAnimationFrame(frame)
        }
    }())
    centerFire(0.3, {
        spread: 26,
        startVelocity: 55,
        colors: WEDDING_CONFETTI_COLORS,
    })
    centerFire(0.25, {
        spread: 60,
        colors: WEDDING_CONFETTI_COLORS,
    })
    centerFire(0.4, {
        spread: 100,
        decay: 0.91,
        scalar: 0.9,
        colors: WEDDING_CONFETTI_COLORS,
    })
    centerFire(0.15, {
        spread: 120,
        startVelocity: 28,
        decay: 0.92,
        scalar: 1.25,
        colors: WEDDING_CONFETTI_COLORS,
    })
    centerFire(0.12, {
        spread: 130,
        startVelocity: 42,
        colors: ['#fbbf24', '#fef3c7'],
    })
}
function centerFire(particleRatio: number, opts: Record<string, unknown>) {
    const count = 260
    confetti({
        origin: { y: 0.58 },
        ...opts,
        particleCount: Math.floor(count * particleRatio),
    })
}
