<script setup lang="ts">
import { useScroll } from '@vueuse/core'
import { computed, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRoute } from 'vue-router'
import CustomModal from '@/components/Dialog/index.vue'
import { Loading } from '@/components/Loading'
import ToTop from '@/components/ToTop/index.vue'
import WeddingHubLinks from '@/components/WeddingHubLinks/index.vue'
import { isLogLotteryEmbedMode } from '@/utils/runtimeEmbed'
import RightButton from './RightButton/index.vue'
import { useMounted } from './useMounted'

const tipDialog = ref()
const { tipDesc } = useMounted(tipDialog)
const { t } = useI18n()
const route = useRoute()
const isConfigRoute = computed(() => route.path.includes('/log-lottery/config'))
const isEmbed = isLogLotteryEmbedMode()

const mainContainer = ref<HTMLElement | null>(null)
const { y } = useScroll(mainContainer)

const mainElClass = computed(() => {
    return [
        'box-content w-screen h-screen overflow-x-hidden overflow-y-auto main-container',
        isConfigRoute.value && 'lottery-config-admin wedding-config-warm px-4 py-4 sm:px-6 sm:py-6 md:px-8',
        !isConfigRoute.value && 'lottery-wedding-festive',
    ].filter(Boolean).join(' ')
})

function scrollToTop() {
    mainContainer.value?.scrollTo({
        top: 0,
        behavior: 'smooth',
    })
}
</script>

<template>
  <div class="w-screen">
    <WeddingHubLinks />
    <Loading />
    <ToTop v-if="y > 400 && !isEmbed" @click="scrollToTop" />
    <main
      ref="mainContainer"
      :data-theme="isConfigRoute ? 'light' : undefined"
      :class="mainElClass"
    >
      <router-view class="h-full min-h-0 main-container-content" />
    </main>
    <RightButton v-if="!isConfigRoute && !isEmbed" class="absolute right-0 bottom-1/2" />
    <CustomModal ref="tipDialog" :title="t('dialog.titleTip')" :desc="tipDesc" />
  </div>
</template>

<style scoped lang="scss">

</style>
