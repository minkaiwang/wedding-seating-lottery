'use client';

import { memo, useEffect, useRef } from 'react';
import { LOTTERY_APP_NAME_ZH } from '@/lib/brand';
import {
  buildLotteryLiveSyncUrl,
  registerLotteryLiveSyncTarget,
  unregisterLotteryLiveSyncTarget,
} from '@/lib/lotteryLiveSync';

/**
 * 在页面内隐藏加载 log-lottery，用于实时同步名单（postMessage），避免 window.open 弹窗。
 */
function LotteryLiveSyncIframe({
  enabled,
  onFrameReady,
}: {
  enabled: boolean;
  /** iframe 加载完成且已注册 contentWindow 后调用，便于立刻推送一次 */
  onFrameReady?: () => void;
}) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (!enabled) {
      unregisterLotteryLiveSyncTarget();
    }
    return () => {
      unregisterLotteryLiveSyncTarget();
    };
  }, [enabled]);

  if (!enabled) return null;

  return (
    <iframe
      ref={iframeRef}
      title={`${LOTTERY_APP_NAME_ZH}（后台同步）`}
      src={buildLotteryLiveSyncUrl()}
      className="fixed left-0 top-0 h-px w-px opacity-0 pointer-events-none border-0"
      aria-hidden
      onLoad={(e) => {
        // Ignore stale load events after disable/unmount (ref may point at a newer iframe or null).
        if (iframeRef.current !== e.currentTarget) return;
        const w = e.currentTarget.contentWindow;
        registerLotteryLiveSyncTarget(w);
        onFrameReady?.();
      }}
    />
  );
}

export default memo(LotteryLiveSyncIframe);
