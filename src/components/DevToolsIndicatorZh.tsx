'use client';

import { useEffect } from 'react';

/**
 * Next.js 开发模式左下角「N」小球：框架自带的开发者指示器（仅 development）。
 * 用于快速查看当前路由渲染方式（静态/动态）、是否启用 Turbopack、打开偏好设置等；
 * 正式打包上线后不会出现。
 *
 * 文案来自 next-devtools，渲染在 <nextjs-portal> 的 Shadow DOM 内，必须递归进入 shadowRoot 才能替换文本。
 */
const PORTAL_HINT =
  'Next.js 开发工具：查看当前路由与编译方式（仅本地开发显示，正式环境不会出现）';

function translateText(input: string): string {
  let s = input;
  const pairs: [string, string][] = [
    ['Partial Prerendering', '部分预渲染'],
    ['Route Segment Config', '路由段配置'],
    ['Learn about Turbopack and how to enable it in your application.', '了解 Turbopack 以及如何在项目中启用。'],
    ['Turbopack is enabled.', '已启用 Turbopack。'],
    ['Route Info', '路由信息'],
    ['Try Turbopack', '试用 Turbopack'],
    ['Preferences', '偏好设置'],
    ['Documentation', '文档'],
    ['Open in editor', '在编辑器中打开'],
    ['Copy to clipboard', '复制到剪贴板'],
    ['Hide dev indicator', '隐藏开发指示器'],
    ['Show dev indicator', '显示开发指示器'],
    ['Keyboard shortcuts', '键盘快捷键'],
    ['Static', '静态'],
    ['Dynamic', '动态'],
    ['Rendering', '渲染'],
    ['Enabled', '已启用'],
    ['Disabled', '已关闭'],
    ['Issues', '问题'],
    ['Route', '路由'],
  ];
  for (const [en, zh] of pairs) {
    if (s.includes(en)) {
      s = s.split(en).join(zh);
    }
  }
  return s;
}

function translateSubtree(root: HTMLElement): void {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node = walker.nextNode();
  while (node) {
    const text = node.nodeValue;
    if (text?.trim()) {
      const next = translateText(text);
      if (next !== text) node.nodeValue = next;
    }
    node = walker.nextNode();
  }

  root.querySelectorAll<HTMLElement>('*').forEach((el) => {
    for (const attr of ['title', 'aria-label'] as const) {
      const val = el.getAttribute(attr);
      if (!val?.trim()) continue;
      const next = translateText(val);
      if (next !== val) el.setAttribute(attr, next);
    }
  });
}

/** 递归进入 open shadow root，扫描 dev-tools-indicator 子树 */
function scanShadowAware(root: Document | ShadowRoot): void {
  root.querySelectorAll<HTMLElement>('[class*="dev-tools-indicator"]').forEach((el) => {
    translateSubtree(el);
  });
  root.querySelectorAll('*').forEach((el) => {
    if (el instanceof HTMLElement && el.shadowRoot) {
      scanShadowAware(el.shadowRoot);
    }
  });
}

function annotatePortalHost(): void {
  document.querySelectorAll('nextjs-portal').forEach((el) => {
    if (el instanceof HTMLElement && !el.getAttribute('data-ws-dev-hint')) {
      el.setAttribute('data-ws-dev-hint', '1');
      el.title = PORTAL_HINT;
    }
  });
}

function scan(): void {
  scanShadowAware(document);
  annotatePortalHost();
}

export default function DevToolsIndicatorZh() {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    scan();
    const t1 = window.setTimeout(scan, 300);
    const t2 = window.setTimeout(scan, 1200);

    const obs = new MutationObserver(() => {
      requestAnimationFrame(scan);
    });
    obs.observe(document.documentElement, {
      childList: true,
      subtree: true,
      characterData: true,
    });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      obs.disconnect();
    };
  }, []);

  return null;
}
