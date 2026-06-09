<script setup lang='ts'>
import type { CSSProperties } from 'vue'
import { computed, toRefs } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { rgbToHex } from '@/utils/color'

interface Props {
    textSize: number
    textColor: string
    topTitle: string
    tableData: any[]
    setDefaultPersonList: () => void
    isInitialDone: boolean
    titleFont: string
    titleFontSyncGlobal: boolean
}

const props = defineProps<Props>()
const router = useRouter()
const { tableData, textSize, textColor, topTitle, setDefaultPersonList, titleFont, titleFontSyncGlobal } = toRefs(props)
const isTextColor = computed(() => {
    return rgbToHex(textColor.value) !== '#00000000'
})
const titleStyle = computed(() => {
    const maxPx = Math.min(textSize.value * 2.5, 76)
    const style: CSSProperties = {
        fontSize: `clamp(1.2rem, 3.2vw + 0.5rem, ${maxPx}px)`,
        fontWeight: 800,
        letterSpacing: '0.04em',
        lineHeight: 1.15,
        whiteSpace: 'nowrap',
    }
    if (!titleFontSyncGlobal.value) {
        style.fontFamily = titleFont.value
    }
    if (isTextColor.value) {
        style.color = textColor.value
        style.textShadow = '0 2px 0 rgba(255,255,255,0.95), 0 4px 24px rgba(190, 18, 60, 0.45)'
    }

    return style
})
const { t } = useI18n()
</script>

<template>
  <div class="pointer-events-none absolute left-1/2 z-10 flex w-full max-w-[100vw] -translate-x-1/2 flex-col items-center justify-center px-2">
    <h2
      class="lottery-main-title pointer-events-auto m-0 mb-6 max-w-[100vw] px-3 pt-6 text-center whitespace-nowrap sm:mb-8 sm:px-5 sm:pt-8 md:mb-10 md:pt-10"
      :class="{ 'lottery-main-title--gradient': !isTextColor }"
      :style="titleStyle"
    >
      {{ topTitle }}
    </h2>
    <div v-if="isInitialDone" class="pointer-events-auto flex flex-wrap justify-center gap-3">
      <button
        v-if="tableData.length <= 0" class="cursor-pointer btn btn-outline btn-secondary btn-lg"
        @click="router.push('config')"
      >
        {{ t('button.noInfoAndImport') }}
      </button>
      <button
        v-if="tableData.length <= 0" class="cursor-pointer btn btn-outline btn-secondary btn-lg"
        @click="setDefaultPersonList"
      >
        {{ t('button.useDefault') }}
      </button>
    </div>
    <div v-else class="pointer-events-auto flex items-center gap-3">
      <span class="loading loading-spinner loading-xl" />
      <span>{{ t('button.loading') }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.lottery-main-title {
    animation: tracking-in-expand-fwd 0.8s cubic-bezier(0.215, 0.610, 0.355, 1.000) both;
}

.lottery-main-title--gradient {
    background: linear-gradient(92deg, #9f1239 0%, #e11d48 38%, #f97316 72%, #be123c 100%);
    -webkit-background-clip: text;
    background-clip: text;
    color: transparent;
    filter: drop-shadow(0 2px 10px rgba(190, 18, 60, 0.35));
}

@keyframes tracking-in-expand-fwd {
    0% {
        letter-spacing: -0.5em;
        transform: translateZ(-700px);
        opacity: 0;
    }

    40% {
        opacity: 0.6;
    }

    100% {
        transform: translateZ(0);
        opacity: 1;
    }
}
</style>
