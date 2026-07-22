<script setup lang="ts">
import { onMounted, onUnmounted, provide, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { useToast } from 'vue-toast-notification'
import { loadingKey, loadingState } from '@/components/Loading'
import i18n from '@/locales/i18n'
import { useGlobalConfig } from '@/store/globalConfig'
import { useServerConfig } from '@/store/serverConfig'
import { isLogLotteryEmbedMode } from '@/utils/runtimeEmbed'
import { setupWeddingSeatingImportBridge } from '@/utils/weddingSeatingBridge'
import { setupWeddingSeatingLiveSync } from '@/utils/weddingSeatingLiveSync'

provide(loadingKey, loadingState)

const router = useRouter()
const toast = useToast()
const { t } = useI18n()
const isEmbed = isLogLotteryEmbedMode()

let disposeWeddingBridge: (() => void) | undefined
let disposeWeddingLiveSync: (() => void) | undefined

type Banner = 'off' | 'waiting' | 'success' | 'hint' | 'error'
const banner = ref<Banner>('off')

function onActive() {
    banner.value = 'waiting'
}
function onImported() {
    banner.value = 'success'
}
function onMisconfigured() {
    banner.value = 'hint'
}
function onFailed() {
    banner.value = 'error'
}

function focusOpener() {
    try {
        window.opener?.focus()
    }
    catch {
        // ignore
    }
}

let removeBridgeUiListeners: (() => void) | undefined

onMounted(() => {
    const globalConfig = useGlobalConfig()
    globalConfig.migrateLegacyLanguage()
    globalConfig.migrateWeddingDefaultLanguage()
    globalConfig.migrateLegacyTopTitle()
    globalConfig.migrateStaleBrandTopTitle()
    globalConfig.migrateLegacyRemoteMusic()
    useServerConfig().migrateLegacyDefaultHost()
    i18n.global.locale.value = globalConfig.getLanguage as 'en' | 'zhCn'

    if (!isEmbed) {
        window.addEventListener('wedding-seating-bridge-active', onActive)
        window.addEventListener('wedding-seating-bridge-imported', onImported)
        window.addEventListener('wedding-seating-bridge-misconfigured', onMisconfigured)
        window.addEventListener('wedding-seating-bridge-failed', onFailed)
        removeBridgeUiListeners = () => {
            window.removeEventListener('wedding-seating-bridge-active', onActive)
            window.removeEventListener('wedding-seating-bridge-imported', onImported)
            window.removeEventListener('wedding-seating-bridge-misconfigured', onMisconfigured)
            window.removeEventListener('wedding-seating-bridge-failed', onFailed)
        }
        disposeWeddingBridge = setupWeddingSeatingImportBridge(router, toast)
    }
    else {
        removeBridgeUiListeners = undefined
        disposeWeddingBridge = () => {}
    }

    disposeWeddingLiveSync = setupWeddingSeatingLiveSync()
})
onUnmounted(() => {
    disposeWeddingBridge?.()
    disposeWeddingLiveSync?.()
    removeBridgeUiListeners?.()
})
</script>

<template>
  <div
    v-if="!isEmbed && banner !== 'off'"
    class="wedding-bridge-banner"
    :data-variant="banner === 'error' ? 'error' : banner === 'hint' ? 'hint' : banner === 'success' ? 'success' : 'info'"
    role="status"
  >
    <span class="wedding-bridge-banner__text">
      <template v-if="banner === 'waiting'">{{ t('integration.bridgeWaiting') }}</template>
      <template v-else-if="banner === 'success'">{{ t('integration.bridgeDone') }}</template>
      <template v-else-if="banner === 'hint'">{{ t('integration.bridgeMisconfigured') }}</template>
      <template v-else-if="banner === 'error'">{{ t('integration.bridgeInvalidData') }}</template>
    </span>
    <button
      v-if="banner === 'success'"
      type="button"
      class="wedding-bridge-banner__btn"
      @click="focusOpener"
    >
      {{ t('integration.backToWedding') }}
    </button>
  </div>
  <router-view />
</template>

<style scoped lang="scss">
.wedding-bridge-banner {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 10px 16px;
  font-size: 14px;
  line-height: 1.4;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  z-index: 50;
}

.wedding-bridge-banner[data-variant='info'] {
  background: linear-gradient(90deg, #fff1f2, #fff7ed);
  color: #9f1239;
  border-bottom-color: rgba(225, 29, 72, 0.12);
}

.wedding-bridge-banner[data-variant='success'] {
  background: linear-gradient(90deg, #fef3c7, #ffedd5);
  color: #92400e;
  border-bottom-color: rgba(217, 119, 6, 0.15);
}

.wedding-bridge-banner[data-variant='hint'] {
  background: linear-gradient(90deg, #fffbeb, #fef9c3);
  color: #854d0e;
}

.wedding-bridge-banner[data-variant='error'] {
  background: linear-gradient(90deg, #fef2f2, #fee2e2);
  color: #991b1b;
}

.wedding-bridge-banner__btn {
  border: none;
  border-radius: 8px;
  padding: 6px 14px;
  cursor: pointer;
  font-weight: 600;
  background: linear-gradient(135deg, #e11d48, #be123c);
  color: #fff;
  box-shadow: 0 1px 4px rgba(190, 18, 60, 0.25);
}

.wedding-bridge-banner__btn:hover {
  background: linear-gradient(135deg, #be123c, #9f1239);
}
</style>
