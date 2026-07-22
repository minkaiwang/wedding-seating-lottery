import type { IImage, IMusic } from '@/types/storeType'
import { defineStore } from 'pinia'
import i18n from '@/locales/i18n'
import { defaultImageList, defaultMusicList, defaultPatternList } from './data'
// import { IPrizeConfig } from '@/types/storeType';
export const useGlobalConfig = defineStore('global', {
    state() {
        return {
            globalConfig: {
                rowCount: 18,
                isSHowPrizeList: true,
                isShowAvatar: false,
                topTitle: i18n.global.t('data.defaultTitle'),
                language: 'zhCn',
                definiteTime: null as number | null,
                winMusic: false,
                theme: {
                    name: 'dracula',
                    detail: { primary: '#0f5fd3' },
                    cardColor: '#ff79c6',
                    cardWidth: 140,
                    cardHeight: 200,
                    textColor: '#1f2937',
                    luckyCardColor: '#fff5f5',
                    textSize: 30,
                    patternColor: '#db2777',
                    patternList: defaultPatternList as number[],
                    background: {}, // 背景颜色或图片
                    font: '微软雅黑',
                    titleFont: '微软雅黑',
                    titleFontSyncGlobal: true,
                },
                musicList: defaultMusicList as IMusic[],
                imageList: defaultImageList as IImage[],
            },
            currentMusic: {
                item: null as IMusic | null,
                paused: true,
            },
        }
    },
    getters: {
        // 获取全部配置
        getGlobalConfig(state) {
            return state.globalConfig
        },
        // 获取标题
        getTopTitle(state) {
            return state.globalConfig.topTitle
        },
        // 获取行数
        getRowCount(state) {
            return state.globalConfig.rowCount
        },
        // 获取主题
        getTheme(state) {
            return state.globalConfig.theme
        },
        // 获取卡片颜色
        getCardColor(state) {
            return state.globalConfig.theme.cardColor
        },
        // 获取中奖颜色
        getLuckyColor(state) {
            return state.globalConfig.theme.luckyCardColor
        },
        // 获取文字颜色
        getTextColor(state) {
            return state.globalConfig.theme.textColor
        },
        // 获取卡片宽高
        getCardSize(state) {
            return {
                width: state.globalConfig.theme.cardWidth,
                height: state.globalConfig.theme.cardHeight,
            }
        },
        // 获取文字大小
        getTextSize(state) {
            return state.globalConfig.theme.textSize
        },
        // 获取图案颜色
        getPatterColor(state) {
            return state.globalConfig.theme.patternColor
        },
        // 获取图案列表
        getPatternList(state) {
            return state.globalConfig.theme.patternList
        },
        // 获取音乐列表
        getMusicList(state) {
            return state.globalConfig.musicList
        },
        // 获取当前音乐
        getCurrentMusic(state) {
            return state.currentMusic
        },
        // 获取图片列表
        getImageList(state) {
            return state.globalConfig.imageList
        },
        // 获取是否显示奖品列表
        getIsShowPrizeList(state) {
            return state.globalConfig.isSHowPrizeList
        },
        // 获取当前语言
        getLanguage(state) {
            return state.globalConfig.language
        },
        // 获取背景图片设置
        getBackground(state) {
            return state.globalConfig.theme.background
        },
        // 获取字体
        getFont(state) {
            return state.globalConfig.theme.font
        },
        // 获取标题字体
        getTitleFont(state) {
            return state.globalConfig.theme.titleFont
        },
        // 获取标题字体同步全局
        getTitleFontSyncGlobal(state) {
            return state.globalConfig.theme.titleFontSyncGlobal
        },
        // 获取是否显示头像
        getIsShowAvatar(state) {
            return state.globalConfig.isShowAvatar
        },
        // 获取定时抽取时间
        getDefiniteTime(state) {
            return state.globalConfig.definiteTime
        },
        // 是否播放获奖音乐
        getWinMusic(state) {
            return state.globalConfig.winMusic
        },
    },
    actions: {
        // 设置全局配置
        setGlobalConfig(data: any) {
            this.globalConfig = data
        },
        // 设置rowCount
        setRowCount(rowCount: number) {
            this.globalConfig.rowCount = rowCount
        },
        // 设置标题
        setTopTitle(topTitle: string) {
            this.globalConfig.topTitle = topTitle
        },
        // 设置主题
        setTheme(theme: any) {
            const { name } = theme
            this.globalConfig.theme.name = name
        },
        // 设置卡片颜色
        setCardColor(cardColor: string) {
            this.globalConfig.theme.cardColor = cardColor
        },
        // 设置中奖颜色
        setLuckyCardColor(luckyCardColor: string) {
            this.globalConfig.theme.luckyCardColor = luckyCardColor
        },
        // 设置文字颜色
        setTextColor(textColor: string) {
            this.globalConfig.theme.textColor = textColor
        },
        // 设置卡片宽高
        setCardSize(cardSize: { width: number, height: number }) {
            this.globalConfig.theme.cardWidth = cardSize.width
            this.globalConfig.theme.cardHeight = cardSize.height
        },
        // 设置文字大小
        setTextSize(textSize: number) {
            this.globalConfig.theme.textSize = textSize
        },
        // 设置图案颜色
        setPatterColor(patterColor: string) {
            this.globalConfig.theme.patternColor = patterColor
        },
        // 设置图案列表
        setPatternList(patternList: number[]) {
            this.globalConfig.theme.patternList = patternList
        },
        // 重置图案列表
        resetPatternList() {
            this.globalConfig.theme.patternList = defaultPatternList
        },
        // 添加音乐
        addMusic(music: IMusic) {
            // 验证音乐是否已存在，看name字段
            for (let i = 0; i < this.globalConfig.musicList.length; i++) {
                if (this.globalConfig.musicList[i].name === music.name) {
                    return
                }
            }
            this.globalConfig.musicList.push(music)
        },
        // 删除音乐
        removeMusic(musicId: string) {
            for (let i = 0; i < this.globalConfig.musicList.length; i++) {
                if (this.globalConfig.musicList[i].id === musicId) {
                    this.globalConfig.musicList.splice(i, 1)
                    if (this.currentMusic.item?.id === musicId)
                        this.setCurrentMusic(this.globalConfig.musicList[0] ?? null)
                    break
                }
            }
        },
        // 设置当前播放音乐
        setCurrentMusic(musicItem: IMusic | null, paused: boolean = true) {
            this.currentMusic = {
                item: musicItem,
                paused,
            }
        },
        // 重置音乐列表
        resetMusicList() {
            this.globalConfig.musicList = JSON.parse(JSON.stringify(defaultMusicList)) as IMusic[]
            this.setCurrentMusic(null)
        },
        // 清空音乐列表
        clearMusicList() {
            this.globalConfig.musicList = [] as IMusic[]
            this.setCurrentMusic(null)
        },
        // 添加图片
        addImage(image: IImage) {
            for (let i = 0; i < this.globalConfig.imageList.length; i++) {
                if (this.globalConfig.imageList[i].name === image.name) {
                    return
                }
            }
            this.globalConfig.imageList.push(image)
        },
        // 删除图片
        removeImage(imageId: string) {
            for (let i = 0; i < this.globalConfig.imageList.length; i++) {
                if (this.globalConfig.imageList[i].id === imageId) {
                    this.globalConfig.imageList.splice(i, 1)
                    break
                }
            }
        },
        // 重置图片列表
        resetImageList() {
            this.globalConfig.imageList = defaultImageList as IImage[]
        },
        // 清空图片列表
        clearImageList() {
            this.globalConfig.imageList = [] as IImage[]
        },
        // 设置是否显示奖品列表
        setIsShowPrizeList(isShowPrizeList: boolean) {
            this.globalConfig.isSHowPrizeList = isShowPrizeList
        },
        // 设置
        setLanguage(language: string) {
            const normalized: 'en' | 'zhCn' = language === 'en' ? 'en' : 'zhCn'
            this.globalConfig.language = normalized
            i18n.global.locale.value = normalized
            try {
                localStorage.setItem('weddingLotteryLanguageChosen', normalized)
            }
            catch {
                /* ignore */
            }
        },
        /** 婚礼整合站首次访问默认中文；用户手动切换后会记住选择 */
        migrateWeddingDefaultLanguage() {
            try {
                if (localStorage.getItem('weddingLotteryLanguageChosen'))
                    return
            }
            catch {
                /* ignore */
            }
            this.setLanguage('zhCn')
        },
        /** 将历史错误语言码（如 zh-CN）规范为 zhCn，并写回持久化 */
        migrateLegacyLanguage() {
            const raw = this.globalConfig.language as string | undefined
            if (raw === 'en' || raw === 'zhCn')
                return
            this.setLanguage('zhCn')
        },
        /** 清除本地持久化中的旧版大屏标题（如「大明内阁…」） */
        migrateLegacyTopTitle() {
            const title = this.globalConfig.topTitle
            if (!title || typeof title !== 'string')
                return
            const legacy = /大明内阁|御前奏对|六部御前|MING DYNASTY CABINET|Six Ministries of the Ming/i
            if (!legacy.test(title))
                return
            this.globalConfig.topTitle = i18n.global.t('data.defaultTitle')
        },
        /**
         * 婚礼整合：brand.ts 改名后，localStorage 里仍可能是旧新人姓名拼出的标题。
         * 仅重置「像自动生成」的标题，保留用户完全自定义的文案。
         */
        migrateStaleBrandTopTitle() {
            const title = this.globalConfig.topTitle?.trim()
            if (!title)
                return
            const defaultTitle = i18n.global.t('data.defaultTitle')
            if (title === defaultTitle)
                return

            const lower = title.toLowerCase()
            const looksAutoGenerated = title.endsWith('的婚礼抽奖') || title.endsWith(' · 抽奖') || lower.endsWith(' — wedding lottery') || lower.endsWith(' — wedding seating planner')

            if (looksAutoGenerated)
                this.globalConfig.topTitle = defaultTitle
        },
        /** Remove the former upstream playlist that contacted an unverified third-party host. */
        migrateLegacyRemoteMusic() {
            const isLegacyRemote = (music: IMusic | null | undefined) => (
                typeof music?.url === 'string'
                && /^https:\/\/(?:www\.)?to2026\.xyz\//i.test(music.url)
            )
            this.globalConfig.musicList = this.globalConfig.musicList.filter(music => !isLegacyRemote(music))
            if (isLegacyRemote(this.currentMusic.item))
                this.setCurrentMusic(this.globalConfig.musicList[0] ?? null)
        },
        // 设置背景图片
        setBackground(background: any) {
            this.globalConfig.theme.background = background
        },
        // 设置字体
        setFont(font: any) {
            this.globalConfig.theme.font = font
        },
        // 设置标题字体
        setTitleFont(titleFont: any) {
            this.globalConfig.theme.titleFont = titleFont
        },
        // 设置同步全局字体
        setTitleFontSyncGlobal(titleFontSyncGlobal: boolean) {
            this.globalConfig.theme.titleFontSyncGlobal = titleFontSyncGlobal
        },
        // 设置是否显示头像
        setIsShowAvatar(isShowAvatar: boolean) {
            this.globalConfig.isShowAvatar = isShowAvatar
        },
        // 设置定时抽取时间
        setDefiniteTime(definiteTime: number | null) {
            this.globalConfig.definiteTime = definiteTime
        },
        // 设置是否播放获奖音乐
        setIsPlayWinMusic(winMusic: boolean) {
            this.globalConfig.winMusic = winMusic
        },
        // 重置所有配置
        reset() {
            this.globalConfig = {
                rowCount: 18,
                winMusic: false,
                isSHowPrizeList: true,
                isShowAvatar: false,
                topTitle: i18n.global.t('data.defaultTitle'),
                language: 'zhCn',
                definiteTime: null,
                theme: {
                    name: 'dracula',
                    detail: { primary: '#0f5fd3' },
                    cardColor: '#ff79c6',
                    cardWidth: 140,
                    cardHeight: 200,
                    textColor: '#1f2937',
                    luckyCardColor: '#fff5f5',
                    textSize: 30,
                    patternColor: '#db2777',
                    patternList: defaultPatternList as number[],
                    background: {}, // 背景颜色或图片
                    font: '微软雅黑',
                    titleFont: '微软雅黑',
                    titleFontSyncGlobal: true,
                },
                musicList: defaultMusicList as IMusic[],
                imageList: defaultImageList as IImage[],
            }
            this.currentMusic = {
                item: null,
                paused: true,
            }
        },
    },
    persist: {
        enabled: true,
        strategies: [
            {
                // 如果要存储在localStorage中
                storage: localStorage,
                key: 'globalConfig',
                paths: ['globalConfig'],
            },
        ],
    },
})
