<script setup lang="ts">
import { storeToRefs } from 'pinia'
import useStore from '@/store'
import HeaderTitle from './components/HeaderTitle/index.vue'
import OptionButton from './components/OptionsButton/index.vue'
import PrizeList from './components/PrizeList/index.vue'
import StarsBackground from './components/StarsBackground/index.vue'
import { useViewModel } from './useViewModel'
import 'vue-toast-notification/dist/theme-sugar.css'

const viewModel = useViewModel()
const { setDefaultPersonList, tableData, currentStatus, enterLottery, stopLottery, containerRef, startLottery, continueLottery, quitLottery, isInitialDone, titleFont, titleFontSyncGlobal } = viewModel
const globalConfig = useStore().globalConfig

const { getTopTitle: topTitle, getTextColor: textColor, getTextSize: textSize, getBackground: homeBackground } = storeToRefs(globalConfig)
</script>

<template>
  <HeaderTitle
    :table-data="tableData"
    :text-size="textSize"
    :text-color="textColor"
    :top-title="topTitle"
    :set-default-person-list="setDefaultPersonList"
    :is-initial-done="isInitialDone"
    :title-font="titleFont"
    :title-font-sync-global="titleFontSyncGlobal"
  />
  <div id="container" ref="containerRef" class="3dContainer">
    <OptionButton
      :current-status="currentStatus"
      :table-data="tableData"
      :enter-lottery="enterLottery"
      :start-lottery="startLottery"
      :stop-lottery="stopLottery"
      :continue-lottery="continueLottery"
      :quit-lottery="quitLottery"
    />
  </div>
  <StarsBackground :home-background="homeBackground" />
  <PrizeList class="lottery-prize-sidebar" />
</template>

<style scoped lang="scss">
/* 避免贴左边被裁切、与中间球体名单重叠；小屏留安全区 */
.lottery-prize-sidebar {
  position: absolute;
  z-index: 30;
  top: clamp(4.5rem, 11vh, 8rem);
  left: max(0.5rem, env(safe-area-inset-left, 0px));
  width: min(17.5rem, calc(100vw - 1rem));
  height: min(72vh, 38rem);
  max-height: min(72vh, 38rem);
  pointer-events: auto;
}
</style>
