import type { Table } from '@/types';

export const LAYOUT_GRID_PX = 20;
export const LAYOUT_GRID_DOT_OFFSET_PX = LAYOUT_GRID_PX / 2;

export type AutoArrangeDirection = 'ltr-ttb' | 'rtl-ttb' | 'ltr-btt' | 'rtl-btt';

export interface AutoArrangeOptions {
  direction?: AutoArrangeDirection;
  /** Per-row table counts; extra rows repeat the last value. Empty = auto-fit columns. */
  rowCounts?: number[];
}

export function parseRowCountsInput(raw: string): number[] | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  const parts = trimmed.split(/[,，\s]+/).filter(Boolean);
  if (parts.length === 0) return null;
  const counts: number[] = [];
  for (const part of parts) {
    const n = Number.parseInt(part, 10);
    if (!Number.isFinite(n) || n < 1) return null;
    counts.push(n);
  }
  return counts;
}

export function formatRowCountsInput(counts: number[]): string {
  return counts.join(',');
}

/** Extract leading table number from names like "13号桌", "1 号桌", "Table 5". */
export function parseTableOrderNumber(name: string): number | null {
  const trimmed = name.trim();
  const leading = trimmed.match(/^(\d+)/);
  if (leading) return Number.parseInt(leading[1], 10);
  const zh = trimmed.match(/(\d+)\s*号桌/);
  if (zh) return Number.parseInt(zh[1], 10);
  const western = trimmed.match(/(?:table|mesa|tisch|stol)\s*(\d+)/i);
  if (western) return Number.parseInt(western[1], 10);
  return null;
}

export function sortTablesForAutoArrange(tables: Table[]): Table[] {
  return [...tables].sort((a, b) => {
    const na = parseTableOrderNumber(a.name);
    const nb = parseTableOrderNumber(b.name);
    if (na !== null && nb !== null && na !== nb) return na - nb;
    if (na !== null && nb === null) return -1;
    if (na === null && nb !== null) return 1;
    return a.name.localeCompare(b.name, 'zh-CN') || a.id.localeCompare(b.id);
  });
}

export function buildAutoArrangedTables(
  tables: Table[],
  rect: DOMRect,
  snap: boolean,
  options: AutoArrangeOptions,
  formatName: (sequence: number) => string,
): Table[] {
  const sorted = sortTablesForAutoArrange(tables);
  const positions = computeAutoArrangePositions(sorted, rect, snap, options);
  return sorted.map((table, index) => {
    const position = positions.get(table.id);
    return {
      ...table,
      name: formatName(index + 1),
      ...(position ? { position } : {}),
    };
  });
}

function tablePixelSize(table: Table): number {
  return table.type === 'round' ? 80 : 100;
}

interface RowColSlot {
  row: number;
  col: number;
  colsInRow: number;
}

function buildRowColSlots(count: number, rowCounts: number[] | undefined, autoCols: number): RowColSlot[] {
  const slots: RowColSlot[] = [];
  if (count <= 0) return slots;

  if (rowCounts && rowCounts.length > 0) {
    let index = 0;
    let row = 0;
    while (index < count) {
      const patternCols = rowCounts[Math.min(row, rowCounts.length - 1)];
      const colsInRow = Math.min(patternCols, count - index);
      for (let col = 0; col < colsInRow; col++) {
        slots.push({ row, col, colsInRow });
        index++;
      }
      row++;
    }
    return slots;
  }

  const cols = Math.max(1, autoCols);
  for (let index = 0; index < count; index++) {
    const row = Math.floor(index / cols);
    const col = index % cols;
    const rowStart = row * cols;
    const colsInRow = Math.min(cols, count - rowStart);
    slots.push({ row, col, colsInRow });
  }
  return slots;
}

function applyDirection(
  row: number,
  col: number,
  colsInRow: number,
  totalRows: number,
  direction: AutoArrangeDirection,
): { row: number; col: number } {
  let r = row;
  let c = col;
  if (direction === 'rtl-ttb' || direction === 'rtl-btt') {
    c = colsInRow - 1 - col;
  }
  if (direction === 'ltr-btt' || direction === 'rtl-btt') {
    r = totalRows - 1 - row;
  }
  return { row: r, col: c };
}

export function snapPixelCoordToDotGrid(px: number, axisLen: number): number {
  if (!Number.isFinite(px) || axisLen <= 0) return 0;
  const stepped =
    Math.round((px - LAYOUT_GRID_DOT_OFFSET_PX) / LAYOUT_GRID_PX) * LAYOUT_GRID_PX +
    LAYOUT_GRID_DOT_OFFSET_PX;
  return Math.max(0, Math.min(axisLen, stepped));
}

export function snapPercentPairToDotGrid(
  xPct: number,
  yPct: number,
  rect: DOMRect,
): { x: number; y: number } {
  const w = rect.width;
  const h = rect.height;
  if (w <= 0 || h <= 0) {
    return { x: xPct, y: yPct };
  }
  let px = (xPct / 100) * w;
  let py = (yPct / 100) * h;
  px = snapPixelCoordToDotGrid(px, w);
  py = snapPixelCoordToDotGrid(py, h);
  return {
    x: Math.max(0, Math.min(100, (px / w) * 100)),
    y: Math.max(0, Math.min(100, (py / h) * 100)),
  };
}

/** Pixel-aware grid: table centers spaced by size + gap, converted to %. */
export function computeAutoArrangePositions(
  tables: Table[],
  rect: DOMRect,
  snap = true,
  options: AutoArrangeOptions = {},
): Map<string, { x: number; y: number }> {
  const result = new Map<string, { x: number; y: number }>();
  if (tables.length === 0 || rect.width <= 0 || rect.height <= 0) return result;

  const direction = options.direction ?? 'ltr-ttb';
  const w = rect.width;
  const h = rect.height;
  const maxSize = Math.max(...tables.map(tablePixelSize), 80);
  const gapPx = maxSize + 24;
  const marginPx = maxSize / 2 + 16;
  const autoCols = Math.max(1, Math.floor((w - marginPx * 2) / gapPx));
  const useCustomRows = Boolean(options.rowCounts && options.rowCounts.length > 0);

  const slots = buildRowColSlots(tables.length, options.rowCounts, autoCols);
  const totalRows = slots.length > 0 ? slots[slots.length - 1].row + 1 : 0;
  const availableH = h - marginPx * 2;
  const availableW = w - marginPx * 2;
  let verticalSpacing = gapPx;
  let gridHeightPx = totalRows > 0 ? (totalRows - 1) * verticalSpacing + maxSize : maxSize;
  if (gridHeightPx > availableH && totalRows > 1) {
    verticalSpacing = Math.max(maxSize * 0.55, (availableH - maxSize) / (totalRows - 1));
    gridHeightPx = (totalRows - 1) * verticalSpacing + maxSize;
  }
  const startY = marginPx + Math.max(0, (availableH - gridHeightPx) / 2);

  tables.forEach((table, index) => {
    const slot = slots[index];
    if (!slot) return;

    const { row, col } = applyDirection(slot.row, slot.col, slot.colsInRow, totalRows, direction);
    let horizontalSpacing = gapPx;
    const rowWidth = (slot.colsInRow - 1) * horizontalSpacing;
    if (rowWidth > availableW && slot.colsInRow > 1) {
      horizontalSpacing = Math.max(maxSize * 0.55, (availableW - maxSize) / (slot.colsInRow - 1));
    }
    const adjustedRowWidth = (slot.colsInRow - 1) * horizontalSpacing;
    const rowStartX = useCustomRows
      ? marginPx + Math.max(0, (w - marginPx * 2 - adjustedRowWidth) / 2)
      : marginPx;

    let px = rowStartX + col * horizontalSpacing;
    let py = startY + row * verticalSpacing;

    if (snap) {
      px = snapPixelCoordToDotGrid(px, w);
      py = snapPixelCoordToDotGrid(py, h);
    }

    result.set(table.id, {
      x: Math.max(0, Math.min(100, (px / w) * 100)),
      y: Math.max(0, Math.min(100, (py / h) * 100)),
    });
  });

  return result;
}

export function computeFallbackPosition(
  tables: Table[],
  index: number,
  rect?: DOMRect | null,
  options: AutoArrangeOptions = {},
): { x: number; y: number } {
  if (rect && rect.width > 0 && rect.height > 0) {
    const positions = computeAutoArrangePositions(tables, rect, true, options);
    const table = tables[index];
    if (table) {
      return positions.get(table.id) ?? { x: 50, y: 50 };
    }
  }

  const cols = Math.max(1, Math.ceil(Math.sqrt(tables.length)));
  const row = Math.floor(index / cols);
  const col = index % cols;
  const spacing = 80 / (cols + 1);
  return {
    x: spacing * (col + 1) + 10,
    y: spacing * (row + 1) + 10,
  };
}
