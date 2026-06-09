import type { IPrizeConfig } from '@/types/storeType'
import { defineStore } from 'pinia'
import { defaultPrizeList } from './data'

function cloneSeparateCount(prize: IPrizeConfig): IPrizeConfig['separateCount'] {
    return {
        enable: prize.separateCount.enable,
        countList: prize.separateCount.countList.map(item => ({ ...item })),
    }
}

function emptyTemporaryPrize(): IPrizeConfig {
    return {
        id: '',
        name: '',
        sort: 0,
        isAll: false,
        count: 1,
        isUsedCount: 0,
        picture: {
            id: '-1',
            name: '',
            url: '',
        },
        separateCount: {
            enable: true,
            countList: [],
        },
        desc: '',
        isShow: false,
        isUsed: false,
        frequency: 1,
    } as IPrizeConfig
}

export const usePrizeConfig = defineStore('prize', {
    state() {
        return {
            prizeConfig: {
                prizeList: defaultPrizeList,
                currentPrize: defaultPrizeList[0],
                temporaryPrize: emptyTemporaryPrize(),
            },
        }
    },
    getters: {
    // 获取全部配置
        getPrizeConfigAll(state) {
            return state.prizeConfig
        },
        // 获取奖品列表
        getPrizeConfig(state) {
            return state.prizeConfig.prizeList
        },
        // 根据id获取配置
        getPrizeConfigById(state) {
            return (id: number | string) => {
                return state.prizeConfig.prizeList.find(item => item.id === id)
            }
        },
        // 获取当前奖项
        getCurrentPrize(state) {
            return state.prizeConfig.currentPrize
        },
        // 获取临时的奖项
        getTemporaryPrize(state) {
            return state.prizeConfig.temporaryPrize
        },

    },
    actions: {
        findPrizeIndexById(id: number | string): number {
            return this.prizeConfig.prizeList.findIndex(item => item.id === id)
        },
        /** 根据已抽人数校正 isUsed，避免 currentPrize 与 prizeList 状态不一致 */
        normalizePrizeUsage(prize: IPrizeConfig): void {
            const roundsUsed = prize.frequencyUsedCount ?? 0
            const maxRounds = prize.frequency ?? 1
            const roundFull = prize.count > 0 && prize.isUsedCount >= prize.count

            if (roundFull && prize.isAll) {
                if (maxRounds > 1 && roundsUsed >= maxRounds) {
                    prize.isUsed = true
                    prize.isUsedCount = prize.count
                }
                else {
                    prize.isUsed = false
                }
                return
            }

            if (roundFull) {
                prize.isUsed = true
                prize.isUsedCount = prize.count
            }
            else if (prize.isUsedCount < prize.count) {
                prize.isUsed = false
            }
        },
        /** 本轮已抽满 count 人：不可重复则标记已抽取；可重复则重置进度以便继续抽 */
        completeDrawRound(prize: IPrizeConfig): void {
            if (prize.count <= 0 || prize.isUsedCount < prize.count)
                return

            if (prize.isAll) {
                const roundsUsed = (prize.frequencyUsedCount ?? 0) + 1
                prize.frequencyUsedCount = roundsUsed
                const maxRounds = prize.frequency ?? 1
                if (maxRounds > 1 && roundsUsed >= maxRounds) {
                    prize.isUsed = true
                    prize.isUsedCount = prize.count
                    return
                }
                prize.isUsedCount = 0
                prize.isUsed = false
                if (prize.separateCount?.enable && prize.separateCount.countList?.length) {
                    for (const batch of prize.separateCount.countList)
                        batch.isUsedCount = 0
                }
                return
            }

            prize.isUsed = true
            prize.isUsedCount = prize.count
        },
        /** 将 currentPrize / 传入项的进度写回 prizeList 中同 id 项 */
        syncPrizeToList(prize: IPrizeConfig): void {
            const idx = this.findPrizeIndexById(prize.id)
            if (idx < 0)
                return
            const target = this.prizeConfig.prizeList[idx]
            target.isUsedCount = prize.isUsedCount
            target.isUsed = prize.isUsed
            target.frequencyUsedCount = prize.frequencyUsedCount ?? 0
            target.separateCount = cloneSeparateCount(prize)
        },
        /** 让 currentPrize 始终指向 prizeList 中的同一对象 */
        syncCurrentPrizeFromList(): void {
            const idx = this.findPrizeIndexById(this.prizeConfig.currentPrize.id)
            if (idx >= 0)
                this.prizeConfig.currentPrize = this.prizeConfig.prizeList[idx]
        },
        /** 启动或刷新后：对齐引用并选中第一个仍有名额的奖项 */
        ensureCurrentPrize(): void {
            this.syncCurrentPrizeFromList()
            this.normalizePrizeUsage(this.prizeConfig.currentPrize)

            const current = this.prizeConfig.currentPrize
            if (current?.id && !current.isUsed && current.isUsedCount < current.count)
                return

            for (const prize of this.prizeConfig.prizeList) {
                this.normalizePrizeUsage(prize)
                if (prize.isShow !== false && !prize.isUsed && prize.isUsedCount < prize.count) {
                    this.prizeConfig.currentPrize = prize
                    return
                }
            }
        },
        /** 清空各奖项已抽进度，便于重复抽奖（不删除奖项配置） */
        resetPrizeDrawProgress(): void {
            for (const prize of this.prizeConfig.prizeList) {
                prize.isUsed = false
                prize.isUsedCount = 0
                prize.frequencyUsedCount = 0
                if (prize.separateCount?.countList?.length) {
                    for (const batch of prize.separateCount.countList)
                        batch.isUsedCount = 0
                }
            }
            if (this.prizeConfig.prizeList.length > 0)
                this.prizeConfig.currentPrize = this.prizeConfig.prizeList[0]
            this.resetTemporaryPrize()
        },
        // 设置奖项
        setPrizeConfig(prizeList: IPrizeConfig[]) {
            this.prizeConfig.prizeList = prizeList
            this.syncCurrentPrizeFromList()
        },
        // 添加奖项
        addPrizeConfig(prizeConfigItem: IPrizeConfig) {
            this.prizeConfig.prizeList.push(prizeConfigItem)
        },
        // 删除奖项
        deletePrizeConfig(prizeConfigItemId: number | string) {
            this.prizeConfig.prizeList = this.prizeConfig.prizeList.filter(item => item.id !== prizeConfigItemId)
            this.ensureCurrentPrize()
        },
        // 更新奖项数据
        updatePrizeConfig(prizeConfigItem: IPrizeConfig) {
            this.normalizePrizeUsage(prizeConfigItem)
            this.syncPrizeToList(prizeConfigItem)

            if (!prizeConfigItem.isUsed && prizeConfigItem.isUsedCount < prizeConfigItem.count) {
                this.syncCurrentPrizeFromList()
                this.resetTemporaryPrize()
                return
            }

            for (let i = 0; i < this.prizeConfig.prizeList.length; i++) {
                const prize = this.prizeConfig.prizeList[i]
                this.normalizePrizeUsage(prize)
                if (prize.isShow !== false && !prize.isUsed && prize.isUsedCount < prize.count) {
                    this.prizeConfig.currentPrize = prize
                    this.resetTemporaryPrize()
                    return
                }
            }

            this.syncCurrentPrizeFromList()
            this.resetTemporaryPrize()
        },
        // 删除全部奖项
        deleteAllPrizeConfig() {
            this.prizeConfig.prizeList = [] as IPrizeConfig[]
        },
        // 设置当前奖项
        setCurrentPrize(prizeConfigItem: IPrizeConfig) {
            const idx = this.findPrizeIndexById(prizeConfigItem.id)
            if (idx >= 0) {
                this.syncPrizeToList(prizeConfigItem)
                this.prizeConfig.currentPrize = this.prizeConfig.prizeList[idx]
                return
            }
            this.prizeConfig.currentPrize = prizeConfigItem
        },
        // 设置临时奖项
        setTemporaryPrize(prizeItem: IPrizeConfig) {
            if (prizeItem.isShow === false) {
                this.ensureCurrentPrize()
                this.resetTemporaryPrize()

                return
            }

            this.prizeConfig.temporaryPrize = prizeItem
        },
        // 重置临时奖项
        resetTemporaryPrize() {
            this.prizeConfig.temporaryPrize = emptyTemporaryPrize()
        },
        // 重置所有配置
        resetDefault() {
            this.prizeConfig = {
                prizeList: defaultPrizeList,
                currentPrize: defaultPrizeList[0],
                temporaryPrize: emptyTemporaryPrize(),
            }
            this.ensureCurrentPrize()
        },
    },
    persist: {
        enabled: true,
        strategies: [
            {
                // 如果要存储在localStorage中
                storage: localStorage,
                key: 'prizeConfig',
            },
        ],
    },
})
