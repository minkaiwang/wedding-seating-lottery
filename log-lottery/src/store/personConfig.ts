import type { IPersonConfig, IPrizeConfig } from '@/types/storeType'
import dayjs from 'dayjs'
import { defineStore } from 'pinia'
import { v4 as uuidv4 } from 'uuid'
import { computed, ref, toRaw } from 'vue'
import { IndexDb } from '@/utils/dexie'
import { addOtherInfo } from '@/utils/index'
import { addSyncExclusion, clearSyncExclusions, readSyncExclusions, seatingPersonKey } from '@/utils/seatingSyncExclusions'
import { defaultPersonList } from './data'
import { usePrizeConfig } from './prizeConfig'

// 获取IPersonConfig的key组成数组
export const personListKey = Object.keys(defaultPersonList[0])
export const usePersonConfig = defineStore('person', () => {
    const personDb = new IndexDb('person', ['allPersonList', 'alreadyPersonList'], 1, ['createTime'])
    // NOTE: state
    const personConfig = ref({
        allPersonList: [] as IPersonConfig[],
        alreadyPersonList: [] as IPersonConfig[],
    })
    personDb.getDataSortedByDateTime('allPersonList', 'createTime').then((data) => {
        personConfig.value.allPersonList = data
    })
    personDb.getAllData('alreadyPersonList').then((data) => {
        personConfig.value.alreadyPersonList = data
    })

    // NOTE: getter
    // 获取全部配置
    const getPersonConfig = computed(() => personConfig.value)
    // 获取全部人员名单
    const getAllPersonList = computed(() => personConfig.value.allPersonList)
    // 获取未获此奖的人员名单（同一奖项多轮抽取时排除已中本奖者）
    const getNotThisPrizePersonList = computed(() => {
        const currentPrize = usePrizeConfig().prizeConfig.currentPrize
        const prizeKey = String(currentPrize.id)
        const data = personConfig.value.allPersonList.filter((item: IPersonConfig) => {
            return !item.prizeId.some(id => String(id) === prizeKey)
        })

        return data
    })

    // 获取已中奖人员名单
    const getAlreadyPersonList = computed(() => {
        return personConfig.value.allPersonList.filter((item: IPersonConfig) => {
            return item.isWin === true
        })
    })
    // 获取中奖人员详情
    const getAlreadyPersonDetail = computed(() => personConfig.value.alreadyPersonList)
    // 获取未中奖人员名单
    const getNotPersonList = computed(() => personConfig.value.allPersonList.filter((item: IPersonConfig) => {
        return item.isWin === false
    }))
    // NOTE: action
    // 添加全部未中奖人员
    function addNotPersonList(personList: IPersonConfig[]) {
        if (personList.length <= 0) {
            return
        }
        personList.forEach((item: IPersonConfig) => {
            personConfig.value.allPersonList.push(item)
        })
        personDb.setAllData('allPersonList', personList)
    }
    // 添加数据
    function addOnePerson(person: IPersonConfig[]) {
        if (person.length <= 0) {
            return
        }
        if (person.length > 1) {
            console.warn('只支持添加单个用户')
            return
        }
        person.forEach((item: IPersonConfig) => {
            personConfig.value.allPersonList.push(item)
            personDb.setData('allPersonList', item)
        })
    }
    // 添加已中奖人员
    function addAlreadyPersonList(personList: IPersonConfig[], prize: IPrizeConfig | null) {
        if (personList.length <= 0) {
            return
        }
        personList.forEach((person: IPersonConfig) => {
            personConfig.value.allPersonList.map((item: IPersonConfig) => {
                if (item.id === person.id && prize != null) {
                    item.isWin = true
                    item.prizeName.push(prize.name)
                    item.prizeTime.push(dayjs(new Date()).format('YYYY-MM-DD HH:mm:ss'))
                    item.prizeId.push(String(prize.id))
                }
                return item
            })
            personConfig.value.alreadyPersonList.push(person)
            personDb.updateData('allPersonList', toRaw(person))
            personDb.setData('alreadyPersonList', toRaw(person))
        })
    }
    // 从已中奖移动到未中奖
    function moveAlreadyToNot(person: IPersonConfig) {
        if (person.id === undefined || person.id == null) {
            return
        }
        const alreadyPersonListLength = personConfig.value.alreadyPersonList.length
        for (let i = 0; i < personConfig.value.allPersonList.length; i++) {
            if (person.id === personConfig.value.allPersonList[i].id) {
                personConfig.value.allPersonList[i].isWin = false
                personConfig.value.allPersonList[i].prizeName = []
                personConfig.value.allPersonList[i].prizeTime = []
                personConfig.value.allPersonList[i].prizeId = []
                personDb.updateData('allPersonList', toRaw(personConfig.value.allPersonList[i]))
                break
            }
        }
        const alreadyPersonListRaw = toRaw(personConfig.value.alreadyPersonList)
        for (let i = 0; i < alreadyPersonListLength; i++) {
            personConfig.value.alreadyPersonList = alreadyPersonListRaw.filter((item: IPersonConfig) =>
                item.id !== person.id,
            )
        }
        personDb.deleteData('alreadyPersonList', person)
    }
    // 删除指定人员
    function deletePerson(person: IPersonConfig) {
        if (person.id === undefined || person.id == null)
            return
        addSyncExclusion(person)
        const allPersonListRaw = toRaw(personConfig.value.allPersonList)
        const alreadyPersonListRaw = toRaw(personConfig.value.alreadyPersonList)
        personConfig.value.allPersonList = allPersonListRaw.filter((item: IPersonConfig) => item.id !== person.id)
        personConfig.value.alreadyPersonList = alreadyPersonListRaw.filter((item: IPersonConfig) => item.id !== person.id)
        personDb.deleteData('allPersonList', person)
        personDb.deleteData('alreadyPersonList', person)
    }
    // 删除所有人员
    function deleteAllPerson() {
        personConfig.value.allPersonList = []
        personConfig.value.alreadyPersonList = []
        clearSyncExclusions()
        personDb.deleteAll('allPersonList')
        personDb.deleteAll('alreadyPersonList')
    }

    // 删除所有人员
    function resetPerson() {
        personConfig.value.allPersonList = []
        personConfig.value.alreadyPersonList = []
        personDb.deleteAll('allPersonList')
        personDb.deleteAll('alreadyPersonList')
    }
    // 重置已中奖人员
    function resetAlreadyPerson() {
        // 把已中奖人员合并到未中奖人员，要验证是否已存在
        personConfig.value.allPersonList.forEach((item: IPersonConfig) => {
            item.isWin = false
            item.prizeName = []
            item.prizeTime = []
            item.prizeId = []
        })
        personConfig.value.alreadyPersonList = []
        const allPersonListRaw = toRaw(personConfig.value.allPersonList)
        personDb.deleteAll('allPersonList')
        personDb.setAllData('allPersonList', allPersonListRaw)
        personDb.deleteAll('alreadyPersonList')
    }

    /** 婚礼座位实时同步：合并名单，保留抽奖端删除记录与中奖项 */
    function mergeFromSeatingPlanner(incomingRows: Array<Record<string, unknown>>) {
        const exclusions = readSyncExclusions()
        const effective = incomingRows.filter((row) => {
            return !exclusions.has(seatingPersonKey({
                plannerGuestId: row.plannerGuestId,
                uid: row.uid,
                name: typeof row.name === 'string' ? row.name : undefined,
                department: row.department,
                identity: row.identity,
            }))
        })

        if (effective.length === 0) {
            resetPerson()
            return
        }

        const existingByKey = new Map<string, IPersonConfig>()
        for (const person of personConfig.value.allPersonList) {
            existingByKey.set(seatingPersonKey(person), person)
        }

        const nextList: IPersonConfig[] = []
        for (const row of effective) {
            const name = String(row.name).trim()
            const key = seatingPersonKey({
                plannerGuestId: row.plannerGuestId,
                uid: row.uid,
                name,
                department: row.department,
                identity: row.identity,
            })
            const existing = existingByKey.get(key)
            if (existing) {
                existing.name = name
                existing.department = row.department != null ? String(row.department) : ''
                existing.identity = row.identity != null ? String(row.identity) : ''
                if (row.plannerGuestId != null)
                    existing.plannerGuestId = String(row.plannerGuestId)
                if (row.uid != null)
                    existing.uid = String(row.uid)
                if (row.avatar != null)
                    existing.avatar = String(row.avatar)
                nextList.push(existing)
            }
            else {
                const copy = [{ ...row, name }]
                const processed = addOtherInfo(copy)[0] as IPersonConfig
                if (row.plannerGuestId != null)
                    processed.plannerGuestId = String(row.plannerGuestId)
                nextList.push(processed)
            }
        }

        personConfig.value.allPersonList = nextList
        const nextIds = new Set(nextList.map(p => p.id))
        personConfig.value.alreadyPersonList = personConfig.value.alreadyPersonList.filter(p => nextIds.has(p.id))

        personDb.deleteAll('allPersonList')
        personDb.setAllData('allPersonList', nextList)
        personDb.deleteAll('alreadyPersonList')
        for (const person of personConfig.value.alreadyPersonList) {
            personDb.setData('alreadyPersonList', toRaw(person))
        }
    }

    function setDefaultPersonList() {
        personConfig.value.allPersonList = defaultPersonList.map((item: any) => {
            item.uuid = uuidv4()
            return item
        })
        personConfig.value.alreadyPersonList = []
        clearSyncExclusions()
        personDb.setAllData('allPersonList', defaultPersonList)
        personDb.deleteAll('alreadyPersonList')
    }
    // 重置所有配置
    function reset() {
        personConfig.value = {
            allPersonList: [] as IPersonConfig[],
            alreadyPersonList: [] as IPersonConfig[],
        }
        clearSyncExclusions()
        personDb.deleteAll('allPersonList')
        personDb.deleteAll('alreadyPersonList')
    }
    return {
        personConfig,
        getPersonConfig,
        getAllPersonList,
        getNotThisPrizePersonList,
        getAlreadyPersonList,
        getAlreadyPersonDetail,
        getNotPersonList,
        addNotPersonList,
        addOnePerson,
        addAlreadyPersonList,
        moveAlreadyToNot,
        deletePerson,
        deleteAllPerson,
        resetPerson,
        resetAlreadyPerson,
        mergeFromSeatingPlanner,
        setDefaultPersonList,
        reset,
    }
})
