<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import { isLogLotteryEmbedMode } from '@/utils/runtimeEmbed'
import {
    getWeddingLotteryHomeUrl,
    getWeddingSeatingUrl,
} from '@/utils/weddingHubUrls'

const { t } = useI18n()
const isEmbed = isLogLotteryEmbedMode()

const seatingUrl = computed(() => getWeddingSeatingUrl())
const lotteryUrl = computed(() => getWeddingLotteryHomeUrl())
</script>

<template>
  <nav
    v-if="!isEmbed"
    class="wedding-hub-links"
    :aria-label="t('integration.hubNavLabel')"
  >
    <a
      class="wedding-hub-links__item"
      :href="seatingUrl"
      target="_blank"
      rel="noopener noreferrer"
    >
      {{ t('integration.openSeating') }}
    </a>
    <span class="wedding-hub-links__sep" aria-hidden="true">·</span>
    <a
      class="wedding-hub-links__item wedding-hub-links__item--current"
      :href="lotteryUrl"
    >
      {{ t('integration.openLottery') }}
    </a>
  </nav>
</template>

<style scoped lang="scss">
.wedding-hub-links {
    position: fixed;
    top: 12px;
    left: 12px;
    z-index: 60;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px 8px;
    max-width: min(96vw, 42rem);
    padding: 8px 14px;
    border-radius: 999px;
    background: rgba(15, 23, 42, 0.55);
    backdrop-filter: blur(8px);
    font-size: 13px;
    line-height: 1.3;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.18);
}

.wedding-hub-links__item {
    color: rgba(255, 255, 255, 0.92);
    text-decoration: none;
    white-space: nowrap;
    transition: color 0.2s ease;
}

.wedding-hub-links__item:hover {
    color: #fecdd3;
}

.wedding-hub-links__item--current {
    color: #fda4af;
    font-weight: 600;
    pointer-events: none;
}

.wedding-hub-links__sep {
    color: rgba(255, 255, 255, 0.35);
}
</style>
