// i18n配置
import { createI18n } from 'vue-i18n'
import en from './en'
import zhCn from './zhCn'

export type Language = 'en' | 'zhCn'

function readPersistedLanguage(): Language {
    try {
        const parsed = JSON.parse(localStorage.getItem('globalConfig') || '{}') as {
            globalConfig?: { language?: string }
        }
        const raw = parsed.globalConfig?.language
        if (raw === 'en')
            return 'en'
        // 仅注册 zhCn / en；历史误用 zh-CN 等会导致回退为英文界面
        return 'zhCn'
    }
    catch {
        return 'zhCn'
    }
}

export const languageList = [
    {
        key: 'zhCn',
        name: '中文',
        flag: 'zh-cn',
    },
    {
        key: 'en',
        name: 'English',
        flag: 'en-us',
    },
]
const initialLocale = readPersistedLanguage()
// 创建i18n
const i18n = createI18n({
    locale: initialLocale,
    fallbackLocale: 'zhCn',
    legacy: false,
    messages: {
        zhCn,
        en,
    },
})

export default i18n
