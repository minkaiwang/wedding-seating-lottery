'use client';

import { createPortal } from 'react-dom';
import { useEffect, useState } from 'react';

export type LayoutGuestTooltipState = {
  names: string[];
  anchor: DOMRect;
  below: boolean;
} | null;

export function LayoutGuestTooltip({ state }: { state: LayoutGuestTooltipState }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  if (!mounted || !state || state.names.length === 0) return null;

  const { names, anchor, below } = state;
  const x = anchor.left + anchor.width / 2;
  const y = below ? anchor.bottom + 8 : anchor.top - 8;

  return createPortal(
    <div
      role="tooltip"
      className="pointer-events-none fixed z-[200] min-w-[150px] max-w-[min(260px,calc(100vw-16px))] rounded-lg bg-gray-900 p-2 text-xs text-white shadow-xl"
      style={{
        left: x,
        top: y,
        transform: below ? 'translate(-50%, 0)' : 'translate(-50%, -100%)',
      }}
    >
      <div className="max-h-[min(280px,50vh)] space-y-1 overflow-y-auto overscroll-contain">
        {names.map((name, idx) => (
          <div key={idx} className="whitespace-nowrap">
            {idx + 1}. {name}
          </div>
        ))}
      </div>
      <div
        className={`absolute left-1/2 h-0 w-0 -translate-x-1/2 border-l-4 border-r-4 border-l-transparent border-r-transparent ${
          below
            ? 'bottom-full border-b-4 border-b-gray-900'
            : 'top-full border-t-4 border-t-gray-900'
        }`}
      />
    </div>,
    document.body,
  );
}
