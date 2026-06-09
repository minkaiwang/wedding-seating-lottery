import { LOTTERY_APP_NAME_ZH, SEATING_APP_NAME_EN, SEATING_APP_NAME_ZH } from '@/constant/brand'

export const integrationEn = {
    bridgeWaiting: `Linked with ${SEATING_APP_NAME_EN} — waiting for the guest list…`,
    bridgeDone: `Guest list saved. Configure prizes here, or return to ${SEATING_APP_NAME_EN}.`,
    bridgeMisconfigured:
        `This page was opened with bridge mode but cannot connect to ${SEATING_APP_NAME_EN}. Use “one-click import” from the ${SEATING_APP_NAME_EN} preview (same browser, pop-ups allowed).`,
    bridgeInvalidData: `Import failed: no valid names were received. Close this window and try again from ${SEATING_APP_NAME_EN}.`,
    backToWedding: `Focus ${SEATING_APP_NAME_EN} window`,
    hubNavLabel: 'Wedding tools',
    openSeating: 'Seating planner',
    openLottery: 'Lottery',
}

export const integrationZhCn = {
    bridgeWaiting: `已与「${SEATING_APP_NAME_ZH}」建立连接，正在等待宾客名单…`,
    bridgeDone: `名单已写入。可在此继续配置奖项，或切回「${SEATING_APP_NAME_ZH}」窗口。`,
    bridgeMisconfigured:
        `当前为「桥接」地址，但未检测到来自「${SEATING_APP_NAME_ZH}」的窗口。请在预览页使用「一键导入${LOTTERY_APP_NAME_ZH}」打开本页，并允许弹出窗口。`,
    bridgeInvalidData: `导入失败：未收到有效姓名。请关闭本窗口后从「${SEATING_APP_NAME_ZH}」重试。`,
    backToWedding: `切回「${SEATING_APP_NAME_ZH}」窗口`,
    hubNavLabel: '婚礼工具',
    openSeating: '座位规划',
    openLottery: '婚礼抽奖',
}

export const integration = {
    en: integrationEn,
    zhCn: integrationZhCn,
}
