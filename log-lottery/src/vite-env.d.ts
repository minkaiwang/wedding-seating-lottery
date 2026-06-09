/// <reference types="vite/client" />

interface ImportMetaEnv {
    /** Comma-separated origins allowed to postMessage-import (e.g. http://localhost:3001) */
    readonly VITE_WEDDING_SEATING_ORIGINS?: string
    readonly VITE_WEDDING_SEATING_URL?: string
    readonly VITE_WEDDING_LOTTERY_HOME_URL?: string
}

declare module '*.vue' {
    import type { DefineComponent } from 'vue'

    const component: DefineComponent<object, object, any>
    export default component
}

declare module 'sparticles'
declare module 'three-trackballcontrols'
declare module 'virtual:svg-icons-register'
