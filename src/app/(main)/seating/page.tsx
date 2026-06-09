"use client";

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { LOTTERY_APP_NAME_ZH } from '@/lib/brand';
import { filterTablesBySearchQuery } from '@/lib/tableListFilter';
import { formatTableNameFromSequence, shouldSkipTableNumberFour } from '@/lib/tableNumbering';
import { useApp } from '@/contexts/seating-app';
import { Guest, Table } from '@/types';
import { getTranslations } from '@/lib/i18n';
import {
  DndContext,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
  useSensor,
  useSensors,
  PointerSensor,
  closestCenter,
  useDraggable,
  useDroppable,
} from '@dnd-kit/core';

/** 标题用深色字展示，去掉前置 🎯，避免与按钮文案完全重复 */
function autoAssignPlainTitle(label: string): string {
  return label.replace(/^🎯\s*/u, '').trim();
}

export default function SeatingPage() {
  const { guests, tables, assignGuestToTable, removeGuestFromTable, addTable, t, language, showAlert, startUndoBatch, endUndoBatch } = useApp();
  const [activeId, setActiveId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterTag, setFilterTag] = useState('');
  const [tableListSearch, setTableListSearch] = useState('');
  const [isAutoAssigning, setIsAutoAssigning] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  );

  const handleAutoAssign = () => {
    const unassigned = guests.filter(g => !g.tableId);
    if (unassigned.length === 0) {
      showAlert(t.seating.autoAssign, t.seating.autoAssignNoGuests);
      return;
    }

    setIsAutoAssigning(true);

    startUndoBatch();

    // Group guests by their primary tag (first tag or 'Mixed' if no tag)
    const guestsByGroup: { [key: string]: Guest[] } = {};
    unassigned.forEach(guest => {
      const primaryTag = guest.tags[0] || 'Mixed';
      if (!guestsByGroup[primaryTag]) guestsByGroup[primaryTag] = [];
      guestsByGroup[primaryTag].push(guest);
    });

    let tablesCreated = 0;
    const tableCapacity = 8;

    const skipFour = shouldSkipTableNumberFour(language);

    // For each group, create tables and assign guests
    Object.entries(guestsByGroup).forEach(([groupName, groupGuests]) => {
      const numTablesNeeded = Math.ceil(groupGuests.length / tableCapacity);

      for (let i = 0; i < numTablesNeeded; i++) {
        const tableName = groupName === 'Mixed'
          ? formatTableNameFromSequence(tables.length + tablesCreated + 1, t.seating.autoAssignMixedTableName, skipFour)
          : `${groupName} ${i + 1}`;

        const guestsForThisTable = groupGuests.slice(i * tableCapacity, (i + 1) * tableCapacity);

        const newTable = {
          name: tableName,
          type: 'round' as const,
          capacity: tableCapacity,
          guests: [],
        };

        const tableId = addTable(newTable);
        tablesCreated++;

        // Assign each guest to this table
        guestsForThisTable.forEach(guest => {
          assignGuestToTable(guest.id, tableId);
        });
      }
    });

    endUndoBatch();

    // Show success message
    setTimeout(() => {
      const message = t.seating.autoAssignSuccess
        .replace('{tables}', tablesCreated.toString())
        .replace('{guests}', unassigned.length.toString());
      showAlert(t.seating.autoAssign, message);
      setIsAutoAssigning(false);
    }, 300);
  };

  const unassignedGuests = guests.filter(g => !g.tableId);
  const allTags = Array.from(new Set(guests.flatMap(g => g.tags)));

  const searchQ = searchTerm.trim().toLowerCase();
  const filteredGuests = unassignedGuests.filter(guest => {
    const matchesSearch =
      !searchQ ||
      guest.name.toLowerCase().includes(searchQ) ||
      guest.tags.some((tag) => tag.toLowerCase().includes(searchQ));
    const matchesTag = !filterTag || guest.tags.includes(filterTag);
    return matchesSearch && matchesTag;
  });

  const filteredTables = filterTablesBySearchQuery(tables, guests, tableListSearch);

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    try {
      if (over) {
        const guestId = active.id as string;
        const targetId = over.id as string;

        const table = tables.find(t => t.id === targetId);
        if (table) {
          assignGuestToTable(guestId, targetId);
        }
      }
    } finally {
      setActiveId(null);
    }
  };

  const handleDragCancel = () => {
    setActiveId(null);
  };

  /** If drag ends without firing end (tab switch / browser quirks), release overlay so nav stays clickable. */
  useEffect(() => {
    const release = () => setActiveId(null);
    const onVis = () => {
      if (document.visibilityState === 'hidden') release();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  const activeGuest = guests.find(g => g.id === activeId);

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={handleDragCancel}
    >
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.seating.title}</h1>
          <p className="text-sm md:text-base text-gray-700">
            {t.seating.subtitle}
          </p>
          <p className="mt-2 max-w-2xl text-xs text-gray-600 leading-relaxed">
            {t.common.shortcutsHint}
          </p>

          <div className="mt-5 flex flex-col gap-3 rounded-xl border border-rose-200 bg-white/95 p-4 shadow-sm ring-1 ring-rose-100/80 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2 text-lg font-semibold text-gray-900">
                <span className="text-2xl leading-none" aria-hidden>
                  🎯
                </span>
                <span>{autoAssignPlainTitle(t.seating.autoAssign)}</span>
              </div>
              <p className="mt-1.5 text-sm leading-relaxed text-gray-600">
                {t.seating.autoAssignDesc}
              </p>
            </div>
            <button
              type="button"
              onClick={handleAutoAssign}
              disabled={isAutoAssigning}
              className="btn-wedding-primary flex shrink-0 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold whitespace-nowrap shadow-sm transition-colors md:px-6 md:py-3 md:text-base"
            >
              {isAutoAssigning && (
                <svg className="h-4 w-4 shrink-0 animate-spin text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" aria-hidden>
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              )}
              {t.seating.autoAssignButton}
            </button>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 lg:items-stretch gap-4 md:gap-6">
          {/* Left Panel - Unassigned Guests */}
          <div className="lg:col-span-1 flex min-h-0 flex-col">
            <div className="flex min-h-0 flex-1 flex-col bg-white rounded-xl shadow-md lg:sticky lg:top-20 lg:min-h-[calc(100vh-6rem)] lg:max-h-[calc(100vh-6rem)] lg:flex lg:flex-col">
              <div className="shrink-0 p-3 sm:p-4 bg-rose-50 border-b">
                <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-3">
                  {t.seating.unassignedGuests} ({unassignedGuests.length})
                </h2>

                <input
                  type="text"
                  placeholder={t.seating.searchPlaceholder}
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg mb-2 text-sm text-gray-900 placeholder-gray-500"
                />

                {allTags.length > 0 && (
                  <select
                    value={filterTag}
                    onChange={(e) => setFilterTag(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900"
                  >
                    <option value="">{t.seating.allTags}</option>
                    {allTags.map(tag => (
                      <option key={tag} value={tag}>{tag}</option>
                    ))}
                  </select>
                )}

                <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs text-gray-600">
                    {t.seating.filterShowing
                      .replace('{shown}', String(filteredGuests.length))
                      .replace('{total}', String(unassignedGuests.length))}
                  </p>
                  {(searchTerm || filterTag) && (
                    <button
                      type="button"
                      onClick={() => {
                        setSearchTerm('');
                        setFilterTag('');
                      }}
                      className="text-xs font-semibold text-rose-700 hover:underline"
                    >
                      {t.seating.clearFilters}
                    </button>
                  )}
                </div>
              </div>

              <div className="min-h-[min(50vh,28rem)] flex-1 space-y-2 overflow-y-auto p-3 sm:p-4 lg:min-h-0">
                {filteredGuests.length === 0 ? (
                  <div className="text-center text-gray-500 py-8 space-y-3">
                    {unassignedGuests.length === 0 ? (
                      <>
                        <p className={guests.length > 0 ? 'text-green-600 font-medium' : undefined}>
                          {t.seating.allAssigned}
                        </p>
                        {guests.length > 0 && (
                          <Link
                            href="/preview?lottery=1"
                            className="inline-block text-sm font-semibold text-rose-700 hover:underline"
                            title={LOTTERY_APP_NAME_ZH}
                          >
                            {t.nav.previewLottery}
                          </Link>
                        )}
                      </>
                    ) : (
                      <p>{t.seating.noMatch}</p>
                    )}
                  </div>
                ) : (
                  filteredGuests.map(guest => (
                    <DraggableGuest key={guest.id} guest={guest} />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Right Panel - Tables */}
          <div className="lg:col-span-2">
            <div className="bg-white rounded-xl shadow-md p-4 sm:p-6">
              <h2 className="text-base md:text-lg font-semibold text-gray-900 mb-4">
                {t.seating.tablesTitle} ({tables.length})
              </h2>

              {tables.length === 0 ? (
                <div className="text-center py-12 md:py-16 text-gray-500">
                  <p className="text-base md:text-lg mb-2">{t.seating.noTablesMsg}</p>
                  <p className="text-sm">{t.seating.noTablesDesc}</p>
                </div>
              ) : (
                <>
                  <div className="mb-4 flex flex-col gap-2 border-b border-gray-100 pb-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                    <input
                      type="search"
                      value={tableListSearch}
                      onChange={(e) => setTableListSearch(e.target.value)}
                      placeholder={t.tables.listSearchPlaceholder}
                      autoComplete="off"
                      className="w-full sm:max-w-md rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-rose-500"
                    />
                    <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
                      <p className="text-xs text-gray-600">
                        {t.tables.listShowing
                          .replace('{shown}', String(filteredTables.length))
                          .replace('{total}', String(tables.length))}
                      </p>
                      {tableListSearch.trim() !== '' && (
                        <button
                          type="button"
                          onClick={() => setTableListSearch('')}
                          className="text-xs font-semibold text-rose-700 hover:underline"
                        >
                          {t.seating.clearFilters}
                        </button>
                      )}
                    </div>
                  </div>

                  {filteredTables.length === 0 ? (
                    <div className="py-12 text-center text-gray-500">
                      <p>{t.tables.listNoFilterMatch}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-4">
                      {filteredTables.map((table) => {
                        const isOverCapacity = table.guests.length > table.capacity;
                        const isFull = table.guests.length === table.capacity;
                        const tableGuests = table.guests
                          .map((gId: string) => guests.find((g) => g.id === gId))
                          .filter((g): g is Guest => g !== undefined);

                        return (
                          <DroppableTable
                            key={table.id}
                            table={table}
                            guests={tableGuests}
                            isOverCapacity={isOverCapacity}
                            isFull={isFull}
                            onRemoveGuest={removeGuestFromTable}
                            t={t}
                          />
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      <DragOverlay zIndex={60} dropAnimation={null}>
        {activeGuest ? (
          <div className="btn-wedding-primary rounded-lg px-4 py-2 text-sm font-semibold shadow-xl">
            {activeGuest.name}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}

// Draggable Guest Component
function DraggableGuest({ guest }: { guest: Guest }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: guest.id,
  });

  return (
    <div
      ref={setNodeRef}
      {...listeners}
      {...attributes}
      className={`touch-none p-3 bg-gray-50 border-2 border-gray-200 rounded-lg cursor-grab active:cursor-grabbing hover:border-rose-400 hover:bg-rose-50 transition-colors ${
        isDragging ? 'opacity-30' : ''
      }`}
    >
      <div className="font-semibold text-gray-900">{guest.name}</div>
      {guest.tags.length > 0 && (
        <div className="flex gap-1 mt-1 flex-wrap">
          {guest.tags.map((tag: string, idx: number) => (
            <span
              key={idx}
              className="text-xs px-2 py-0.5 bg-rose-100 text-rose-700 rounded-full"
            >
              {tag}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

// Droppable Table Component
function DroppableTable({
  table,
  guests,
  isOverCapacity,
  isFull,
  onRemoveGuest,
  t,
}: {
  table: Table;
  guests: Guest[];
  isOverCapacity: boolean;
  isFull: boolean;
  onRemoveGuest: (guestId: string) => void;
  t: ReturnType<typeof getTranslations>;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: table.id,
  });

  return (
    <div
      ref={setNodeRef}
      className={`p-4 border-2 rounded-xl transition-all min-h-[200px] ${
        isOver
          ? 'border-rose-500 bg-rose-50 scale-105'
          : isOverCapacity
          ? 'border-red-500 bg-red-50'
          : isFull
          ? 'border-green-500 bg-green-50'
          : 'border-gray-200 bg-white'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-lg text-gray-900">
            {table.type === 'round' ? '🔵' : '🟦'} {table.name}
          </h3>
          <p
            className={`text-sm font-semibold ${
              isOverCapacity ? 'text-red-600' : 'text-gray-700'
            }`}
          >
            {table.guests.length} / {table.capacity} {t.tables.seats}
            {isOverCapacity && ' ⚠️'}
          </p>
        </div>
      </div>

      <div className="space-y-2">
        {guests.map((guest: Guest) => (
          <div
            key={guest.id}
            className="flex items-center justify-between p-2 bg-white rounded border border-gray-200 group"
          >
            <span className="text-sm font-medium text-gray-900">{guest.name}</span>
            <button
              onClick={() => onRemoveGuest(guest.id)}
              className="text-red-600 hover:bg-red-50 px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity text-xs"
            >
              ✕
            </button>
          </div>
        ))}

        {guests.length === 0 && !isOver && (
          <p className="text-sm text-gray-400 italic text-center py-8">
            {t.seating.dragHere}
          </p>
        )}

        {isOver && (
          <div className="text-sm text-rose-600 font-semibold text-center py-8 animate-pulse">
            {t.seating.dropHere}
          </div>
        )}
      </div>
    </div>
  );
}
