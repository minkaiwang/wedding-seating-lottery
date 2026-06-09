"use client";

import { useEffect, useMemo, useRef, useState } from 'react';
import { tableMatchesSearchQuery } from '@/lib/tableListFilter';
import {
  buildAutoArrangedTables,
  computeFallbackPosition,
  LAYOUT_GRID_PX,
  parseRowCountsInput,
  snapPixelCoordToDotGrid,
  sortTablesForAutoArrange,
  type AutoArrangeDirection,
} from '@/lib/tableLayoutGrid';
import { formatTableNameFromSequence, shouldSkipTableNumberFour } from '@/lib/tableNumbering';
import { LayoutGuestTooltip, type LayoutGuestTooltipState } from '@/components/LayoutGuestTooltip';
import { useApp } from '@/contexts/seating-app';
import { Table } from '@/types';

const LAYOUT_SNAP_STORAGE_KEY = 'weddingSeats:layoutSnapToGrid';
const LAYOUT_DIRECTION_STORAGE_KEY = 'weddingSeats:layoutArrangeDirection';
const LAYOUT_ROW_COUNTS_STORAGE_KEY = 'weddingSeats:layoutRowCounts';

const DEFAULT_ROW_COUNTS = '4,5,5,5';

export default function LayoutPage() {
  const { tables, guests, updateTablePosition, replaceTables, t, language, startUndoBatch, endUndoBatch } = useApp();
  const [roomWidth, setRoomWidth] = useState(20);
  const [roomHeight, setRoomHeight] = useState(25);
  const [layoutSearch, setLayoutSearch] = useState('');
  const [snapToGrid, setSnapToGridState] = useState(true);
  const [arrangeDirection, setArrangeDirectionState] = useState<AutoArrangeDirection>('ltr-ttb');
  const [rowCountsInput, setRowCountsInputState] = useState(DEFAULT_ROW_COUNTS);
  const [guestTooltip, setGuestTooltip] = useState<LayoutGuestTooltipState>(null);
  const roomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    try {
      if (typeof window !== 'undefined') {
        const stored = localStorage.getItem(LAYOUT_SNAP_STORAGE_KEY);
        if (stored === '0') {
          setSnapToGridState(false);
        }
        const storedDirection = localStorage.getItem(LAYOUT_DIRECTION_STORAGE_KEY);
        if (
          storedDirection === 'ltr-ttb' ||
          storedDirection === 'rtl-ttb' ||
          storedDirection === 'ltr-btt' ||
          storedDirection === 'rtl-btt'
        ) {
          setArrangeDirectionState(storedDirection);
        }
        const storedRowCounts = localStorage.getItem(LAYOUT_ROW_COUNTS_STORAGE_KEY);
        if (storedRowCounts !== null) {
          setRowCountsInputState(storedRowCounts);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setSnapToGrid = (value: boolean) => {
    setSnapToGridState(value);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAYOUT_SNAP_STORAGE_KEY, value ? '1' : '0');
      }
    } catch {
      /* ignore */
    }
  };

  const setArrangeDirection = (value: AutoArrangeDirection) => {
    setArrangeDirectionState(value);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAYOUT_DIRECTION_STORAGE_KEY, value);
      }
    } catch {
      /* ignore */
    }
  };

  const setRowCountsInput = (value: string) => {
    setRowCountsInputState(value);
    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem(LAYOUT_ROW_COUNTS_STORAGE_KEY, value);
      }
    } catch {
      /* ignore */
    }
  };

  const parsedRowCounts = useMemo(() => parseRowCountsInput(rowCountsInput), [rowCountsInput]);
  const rowCountsInvalid = rowCountsInput.trim() !== '' && parsedRowCounts === null;
  const arrangeOptions = useMemo(
    () => ({
      direction: arrangeDirection,
      rowCounts: parsedRowCounts ?? undefined,
    }),
    [arrangeDirection, parsedRowCounts],
  );
  const tablesForLayoutPreview = useMemo(
    () => sortTablesForAutoArrange(tables),
    [tables],
  );

  const layoutSearchTrimmed = layoutSearch.trim();
  const hasLayoutSearch = layoutSearchTrimmed.length > 0;
  const layoutMatchCount = useMemo(() => {
    if (!layoutSearch.trim()) return tables.length;
    return tables.reduce(
      (n, tab) => n + (tableMatchesSearchQuery(tab, guests, layoutSearch) ? 1 : 0),
      0,
    );
  }, [tables, guests, layoutSearch]);
  const applySearchVisual = hasLayoutSearch && layoutMatchCount > 0;
  const tablesMissingPosition = useMemo(
    () => tables.some((table) => !table.position),
    [tables],
  );

  const handleDragEnd = (
    tableId: string,
    event: React.DragEvent<HTMLDivElement>,
    dragOffset: { x: number; y: number },
  ) => {
    if (!roomRef.current) return;

    const rect = roomRef.current.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    if (w <= 0 || h <= 0) return;

    let px = event.clientX - rect.left - dragOffset.x;
    let py = event.clientY - rect.top - dragOffset.y;

    if (snapToGrid) {
      px = snapPixelCoordToDotGrid(px, w);
      py = snapPixelCoordToDotGrid(py, h);
    }

    const x = (px / w) * 100;
    const y = (py / h) * 100;

    updateTablePosition(tableId, Math.max(0, Math.min(100, x)), Math.max(0, Math.min(100, y)));
  };

  const autoArrange = () => {
    if (rowCountsInvalid) return;
    const rect = roomRef.current?.getBoundingClientRect();
    if (!rect || rect.width <= 0 || rect.height <= 0) return;

    startUndoBatch();
    const skipFour = shouldSkipTableNumberFour(language);
    const nextTables = buildAutoArrangedTables(
      tables,
      rect,
      snapToGrid,
      arrangeOptions,
      (sequence) =>
        formatTableNameFromSequence(sequence, t.seating.autoAssignMixedTableName, skipFour),
    );
    replaceTables(nextTables);
    endUndoBatch();
  };

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.layout.title}</h1>
        <p className="text-sm md:text-base text-gray-800">{t.layout.subtitle}</p>
        <p className="mt-2 max-w-2xl text-xs text-gray-600 leading-relaxed">
          {t.common.shortcutsHint}
        </p>
      </div>

      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 md:mb-8">
        <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">{t.layout.roomSize}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 md:gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              {t.layout.width}
            </label>
            <input
              type="number"
              min="5"
              max="50"
              value={roomWidth}
              onChange={(e) => setRoomWidth(Number(e.target.value))}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-gray-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-800 mb-2">
              {t.layout.height}
            </label>
            <input
              type="number"
              min="5"
              max="50"
              value={roomHeight}
              onChange={(e) => setRoomHeight(Number(e.target.value))}
              className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 text-gray-900"
            />
          </div>
          <div className="flex items-end sm:col-span-2 md:col-span-1">
            <button
              onClick={autoArrange}
              disabled={rowCountsInvalid}
              className="btn-wedding-primary w-full cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 md:px-6 md:text-base"
            >
              {t.layout.autoArrange}
            </button>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-100 pt-4 space-y-4">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {t.layout.arrangeDirection}
              </label>
              <select
                value={arrangeDirection}
                onChange={(e) => setArrangeDirection(e.target.value as AutoArrangeDirection)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-rose-500"
              >
                <option value="ltr-ttb">{t.layout.arrangeDirLtrTtb}</option>
                <option value="rtl-ttb">{t.layout.arrangeDirRtlTtb}</option>
                <option value="ltr-btt">{t.layout.arrangeDirLtrBtt}</option>
                <option value="rtl-btt">{t.layout.arrangeDirRtlBtt}</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-2">
                {t.layout.arrangeRowCounts}
              </label>
              <input
                type="text"
                value={rowCountsInput}
                onChange={(e) => setRowCountsInput(e.target.value)}
                placeholder={t.layout.arrangeRowCountsPlaceholder}
                className={`w-full rounded-lg border px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-rose-500 ${
                  rowCountsInvalid ? 'border-red-400 focus:ring-red-400' : 'border-gray-300'
                }`}
              />
              {rowCountsInvalid ? (
                <p className="mt-1 text-xs text-red-600">{t.layout.arrangeRowCountsInvalid}</p>
              ) : (
                <p className="mt-1 text-xs leading-relaxed text-gray-600">{t.layout.arrangeRowCountsHint}</p>
              )}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-3">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
              checked={snapToGrid}
              onChange={(e) => setSnapToGrid(e.target.checked)}
            />
            <span>
              <span className="block text-sm font-medium text-gray-900">{t.layout.snapToGrid}</span>
              <span className="mt-0.5 block text-xs leading-relaxed text-gray-600">{t.layout.snapToGridHint}</span>
            </span>
          </label>
        </div>
      </div>

      <div className="overflow-visible rounded-xl bg-white p-4 shadow-md sm:p-6 md:p-8">
        {tables.length === 0 ? (
          <div className="text-center py-12 md:py-16 text-gray-700">
            <p className="text-base md:text-lg">{t.layout.noTables}</p>
            <p className="text-sm mt-2">{t.layout.noTablesDesc}</p>
          </div>
        ) : (
          <>
            {tablesMissingPosition && (
              <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                {t.layout.unsavedPositionsHint}
              </div>
            )}

            <div className="mb-4 flex flex-col gap-3 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3 text-xs text-gray-700">
                <span className="font-semibold text-gray-900">{t.layout.legendTitle}</span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border border-rose-200 bg-gradient-to-br from-rose-50 to-rose-100" />
                  {t.layout.legendAvailable}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border border-emerald-200 bg-gradient-to-br from-emerald-50 to-emerald-100" />
                  {t.preview.fullTag}
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-3 w-3 rounded-full border-2 border-red-500 bg-gradient-to-br from-red-50 to-red-100" />
                  {t.tables.overCapacity}
                </span>
              </div>
              <p className="text-xs text-gray-600">{t.layout.dragTable}</p>
            </div>

            <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <input
                type="search"
                value={layoutSearch}
                onChange={(e) => setLayoutSearch(e.target.value)}
                placeholder={t.tables.listSearchPlaceholder}
                autoComplete="off"
                className="w-full sm:max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-rose-500"
              />
              <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                <p className="text-xs text-gray-600">
                  {t.tables.listShowing
                    .replace('{shown}', String(hasLayoutSearch ? layoutMatchCount : tables.length))
                    .replace('{total}', String(tables.length))}
                </p>
                {layoutSearchTrimmed !== '' && (
                  <button
                    type="button"
                    onClick={() => setLayoutSearch('')}
                    className="text-xs font-semibold text-rose-700 hover:underline"
                  >
                    {t.seating.clearFilters}
                  </button>
                )}
              </div>
            </div>

            {hasLayoutSearch && layoutMatchCount === 0 && (
              <p className="mb-3 text-sm text-amber-800">{t.tables.listNoFilterMatch}</p>
            )}

            <div
              ref={roomRef}
              className="relative overflow-visible rounded-lg border-2 border-gray-300 bg-gray-50 md:border-4"
              style={{
                minHeight: `${Math.min(roomHeight * 20, 400)}px`,
                height: `${roomHeight * 30}px`,
                aspectRatio: `${roomWidth} / ${roomHeight}`,
                backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                backgroundSize: `${LAYOUT_GRID_PX}px ${LAYOUT_GRID_PX}px`,
              }}
            >
              <div className="absolute top-2 left-2 bg-white px-2 py-1 rounded text-xs md:text-sm text-gray-700 font-medium z-10">
                {roomWidth}m × {roomHeight}m
              </div>

              {tablesForLayoutPreview.map((table, index) => {
                const rect = roomRef.current?.getBoundingClientRect();
                const position =
                  table.position ??
                  computeFallbackPosition(tablesForLayoutPreview, index, rect ?? null, arrangeOptions);

                const tableGuests = table.guests.map((gId) => guests.find((g) => g.id === gId)).filter(Boolean);
                const guestNames = tableGuests.map((g) => g?.name || '');
                const isOverCapacity = table.guests.length > table.capacity;
                const tableMatches = tableMatchesSearchQuery(table, guests, layoutSearch);
                const searchVisual: 'neutral' | 'highlight' | 'dim' = applySearchVisual
                  ? tableMatches
                    ? 'highlight'
                    : 'dim'
                  : 'neutral';

                return (
                  <DraggableTable
                    key={table.id}
                    table={table}
                    position={position}
                    guestCount={tableGuests.length}
                    guestNames={guestNames}
                    isOverCapacity={isOverCapacity}
                    searchVisual={searchVisual}
                    ariaLabel={`${table.name}, ${tableGuests.length} / ${table.capacity} ${t.tables.seats}`}
                    onDragEnd={(event, dragOffset) => handleDragEnd(table.id, event, dragOffset)}
                    onGuestHover={(rect, names) => {
                      const below = rect.top < 160 || position.y < 42;
                      setGuestTooltip({ names, anchor: rect, below });
                    }}
                    onGuestLeave={() => setGuestTooltip(null)}
                  />
                );
              })}
              <LayoutGuestTooltip state={guestTooltip} />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

interface DraggableTableProps {
  table: Table;
  position: { x: number; y: number };
  guestCount: number;
  guestNames: string[];
  isOverCapacity: boolean;
  searchVisual: 'neutral' | 'highlight' | 'dim';
  ariaLabel: string;
  onDragEnd: (event: React.DragEvent<HTMLDivElement>, dragOffset: { x: number; y: number }) => void;
  onGuestHover: (rect: DOMRect, names: string[]) => void;
  onGuestLeave: () => void;
}

function DraggableTable({
  table,
  position,
  guestCount,
  guestNames,
  isOverCapacity,
  searchVisual,
  ariaLabel,
  onDragEnd,
  onGuestHover,
  onGuestLeave,
}: DraggableTableProps) {
  const size = table.type === 'round' ? 80 : 100;
  const dragOffsetRef = useRef({ x: 0, y: 0 });

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = {
      x: event.clientX - (rect.left + rect.width / 2),
      y: event.clientY - (rect.top + rect.height / 2),
    };
  };

  const searchRing =
    searchVisual === 'highlight' && !isOverCapacity
      ? 'ring-4 ring-amber-400 scale-105'
      : searchVisual === 'dim'
        ? 'opacity-[0.38]'
        : '';

  const baseZ =
    isOverCapacity ? 'z-[25]' : searchVisual === 'highlight' ? 'z-[30]' : searchVisual === 'dim' ? 'z-[1]' : 'z-[10]';

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      onDragEnd={(event) => onDragEnd(event, dragOffsetRef.current)}
      onMouseEnter={(e) => {
        if (guestNames.length > 0) {
          onGuestHover(e.currentTarget.getBoundingClientRect(), guestNames);
        }
      }}
      onMouseLeave={() => onGuestLeave()}
      aria-label={ariaLabel}
      className={`absolute cursor-move transition-all group hover:z-[100] ${baseZ} ${searchRing} ${
        isOverCapacity ? 'ring-4 ring-red-500' : ''
      }`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      <div
        className={`wedding-table-chip flex h-full w-full flex-col items-center justify-center text-sm shadow-lg ${
          table.type === 'round' ? 'rounded-full' : 'rounded-lg'
        } ${
          isOverCapacity
            ? 'wedding-table-chip--over'
            : guestCount === table.capacity
              ? 'wedding-table-chip--full'
              : 'wedding-table-chip--ok'
        }`}
      >
        <div className="max-w-full truncate px-1 text-center font-semibold leading-tight">{table.name}</div>
        <div className="mt-0.5 text-xs font-medium">
          {guestCount}/{table.capacity}
        </div>
      </div>
    </div>
  );
}
