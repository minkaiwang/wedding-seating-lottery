import type { EntityTable } from 'dexie'
import type { DbData } from './type'
import dayjs from 'dayjs'
import Dexie from 'dexie'
import { v4 as uuidv4 } from 'uuid'

class IndexDb {
    name: string
    dbStore: any
    version: number
    dbKeys: string[]
    tableNames: string[]
    constructor(name: string, tableNames: string[], version = 1, dbKeys: string[] = []) {
        this.name = name // 数据库名称
        this.version = version // 数据库版本号
        this.dbKeys = dbKeys // 数据库key
        this.tableNames = tableNames
        this.dbStore = new Dexie(name) as Dexie & { [key: string]: EntityTable<DbData, 'id'> }
        // 获取存在的key
        const stores: Record<string, string> = {}
        for (const tableName of tableNames) {
            stores[tableName] = `id,dateTime,type,uid,${dbKeys.join(',')}` // 根据需要调整字段
        }
        this.dbStore.version(this.version).stores(stores)
    }

    setAllData(tableName: string, data: DbData[]) {
        this.dbStore[tableName].bulkAdd(data)
    }

    /**
     * @param tableName 表名
     * @param data 记录（可缺省 id / dateTime / type，将自动补全）
     * @description 添加单条数据，并为数据添加 dataTime 和 type 属性
     */
    setData(tableName: string, data: Partial<DbData>) {
        if (!data.dateTime) {
            data.dateTime = dayjs().format('YYYY-MM-DD HH:mm:ss:SSS')
        }
        if (!data.type) {
            data.type = 'info'
        }
        if (!data.id) {
            data.id = uuidv4()
        }

        this.dbStore[tableName].add(data)
    }

    // 更新单条数据
    updateData(tableName: string, data: Partial<DbData>) {
        this.dbStore[tableName].update(data.id, data)
    }

    /**
     * @returns 所有数据Array
     * @description 删除所有数据并返回被删除的数据
     */
    deleteAll(tableName: string) {
        return this.dbStore[tableName].clear()
    }

    /**
     * @param tableName 表名
     * @param data 含主键 id 的记录片段
     * @description 删除单条数据
     */
    deleteData(tableName: string, data: Partial<DbData>) {
        this.dbStore[tableName].delete(data.id)
    }

    /**
     * @returns 所有数据Array
     * @description 获取所有数据
     */
    async getAllData(tableName: string, isAsc: boolean = true) {
        const allData = await this.dbStore[tableName].toArray()
        // return allData
        return isAsc ? allData : allData.reverse()
    }

    // 按 dateTime 排序获取所有数据
    async getDataSortedByDateTime(tableName: string, orderTimeName: string = 'dataTime') {
        const allData = await this.dbStore[tableName].orderBy(orderTimeName).toArray()
        return allData
    }

    // 分页获取数据
    async getPageData(tableName: string, pageNum: number, pageSize: number, isAsc: boolean = true) {
        const allData = await this.dbStore[tableName].toArray()
        const start = (pageNum - 1) * pageSize
        const end = pageNum * pageSize
        return isAsc ? allData.slice(start, end) : allData.slice(end, start).reverse()
    }

    /**
     * @returns 数据库总长度
     * @description 获取所有数据的列表长度
     */
    getAllLength(tableName: string) {
        return this.dbStore[tableName].count()
    }

    /**
     * @param tableName 表名
     * @param filter 匹配 `content` 字段包含该字符串
     * @returns 满足条件的记录数组（Dexie Collection `toArray()` 的 Promise）
     */
    getFilterData(tableName: string, filter: string) {
        return this.dbStore[tableName].filter((item: any) => {
            return item.content.includes(filter)
        }).toArray()
    }

    getKeys(tableName: string, key: string) {
        // keys 方法获取所有主键
        return this.dbStore[tableName].orderBy(key).keys()
    }
}

export { IndexDb }
