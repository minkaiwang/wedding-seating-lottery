"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useApp } from '@/contexts/seating-app';
import { getTranslations } from '@/lib/i18n';
import { startLotteryImportBridge } from '@/lib/lotteryBridge';
import { acknowledgeBackupExport } from '@/lib/backupRemind';
import { normalizeSeatingPlan } from '@/lib/planImport';
import { filterTablesBySearchQuery } from '@/lib/tableListFilter';
import { computeFallbackPosition, sortTablesForAutoArrange } from '@/lib/tableLayoutGrid';
import { buildLotteryPersonRows, storage } from '@/lib/storage';
import type { Guest } from '@/types';

export default function PreviewPage() {
  const { guests, tables, clearAll, replacePlan, t, language, showConfirm, showAlert, showModal, cloudSyncAvailable } =
    useApp();
  const pathname = usePathname();
  const printRef = useRef<HTMLDivElement>(null);
  const bridgeCleanupRef = useRef<(() => void) | null>(null);
  const lotteryAutoImportConsumedRef = useRef(false);
  const guestsSnapshotRef = useRef(guests);
  const tablesSnapshotRef = useRef(tables);
  guestsSnapshotRef.current = guests;
  tablesSnapshotRef.current = tables;
  const jsonImportRef = useRef<HTMLInputElement>(null);
  const [previewListSearch, setPreviewListSearch] = useState('');

  const lotteryPersonRowCount = useMemo(
    () => buildLotteryPersonRows(guests, tables).length,
    [guests, tables],
  );

  useEffect(() => {
    return () => {
      bridgeCleanupRef.current?.();
      bridgeCleanupRef.current = null;
    };
  }, []);

  // Map language codes to locale strings
  const localeMap: Record<string, string> = {
    zh: 'zh-CN',
    en: 'en-US',
    hr: 'hr-HR',
    es: 'es-ES',
    de: 'de-DE',
    fr: 'fr-FR',
  };

  const handleExportPDF = () => {
    // Use browser's native print to PDF functionality
    window.print();
  };

  const handleExportJSON = () => {
    storage.exportToJSON({
      guests,
      tables,
      lastUpdated: new Date().toISOString(),
    });
    acknowledgeBackupExport();
  };

  const handlePickImportJSON = () => {
    jsonImportRef.current?.click();
  };

  const handleImportJSONFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    try {
      const text = await file.text();
      const raw: unknown = JSON.parse(text);
      const plan = normalizeSeatingPlan(raw);
      if (!plan) {
        showAlert(t.preview.importLotteryErrorTitle, t.preview.importError);
        return;
      }
      const summary = t.preview.importJSONSummary
        .replace('{guests}', String(plan.guests.length))
        .replace('{tables}', String(plan.tables.length));
      showModal({
        title: t.preview.importJSON,
        message: `${t.preview.importConfirm}\n\n${summary}`,
        type: 'confirm',
        confirmText: t.preview.importJSONConfirm,
        cancelText: t.guests.cancel,
        onConfirm: () => {
          replacePlan(plan);
          acknowledgeBackupExport();
          showAlert(t.preview.importJSON, t.preview.importJSONSuccess);
        },
      });
    } catch {
      showAlert(t.preview.importLotteryErrorTitle, t.preview.importError);
    }
  };

  const handleExportCSV = () => {
    storage.exportToCSV(guests, tables, {
      nameCol: t.preview.exportCSVColName,
      tagsCol: t.preview.exportCSVColTags,
      tableCol: t.preview.exportCSVColTable,
      unassigned: t.preview.exportCSVUnassigned,
    });
  };

  const handleExportLotteryXlsx = () => {
    storage.exportToLotteryXlsx(guests, tables);
  };

  const handleExportGuestsImportXlsx = () => {
    if (guests.length === 0) return;
    storage.exportGuestsImportXlsx(guests, [
      t.guests.templateColName,
      t.guests.templateColTags,
    ]);
  };

  const handleImportLotteryOneClick = useCallback(() => {
    const tr = getTranslations(language);
    if (buildLotteryPersonRows(guests, tables).length === 0) {
      showAlert(tr.preview.importLotteryErrorTitle, tr.preview.importLotteryNoValidNames);
      return;
    }
    showConfirm(tr.preview.importLotteryConfirmTitle, tr.preview.importLotteryConfirmMessage, () => {
      bridgeCleanupRef.current?.();
      bridgeCleanupRef.current = startLotteryImportBridge(guests, tables, {
        getSnapshot: () => ({
          guests: guestsSnapshotRef.current,
          tables: tablesSnapshotRef.current,
        }),
        onDone: () => {
          bridgeCleanupRef.current = null;
          showAlert(tr.preview.importLotterySuccessTitle, tr.preview.importLotterySuccessMessage);
        },
        onTimeout: () => {
          bridgeCleanupRef.current = null;
          showAlert(tr.preview.importLotteryErrorTitle, tr.preview.importLotteryTimeout);
        },
        onPopupBlocked: () => {
          showAlert(tr.preview.importLotteryErrorTitle, tr.preview.importLotteryPopupBlocked);
        },
        onImportRejected: () => {
          bridgeCleanupRef.current = null;
          showAlert(tr.preview.importLotteryErrorTitle, tr.preview.importLotteryRejected);
        },
        onClosedBeforeComplete: () => {
          bridgeCleanupRef.current = null;
          showAlert(tr.preview.importLotteryErrorTitle, tr.preview.importLotteryWindowClosed);
        },
      });
    });
  }, [guests, tables, language, showConfirm, showAlert]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (pathname !== '/preview') {
      lotteryAutoImportConsumedRef.current = false;
      return;
    }
    const params = new URLSearchParams(window.location.search);
    if (params.get('lottery') !== '1') return;
    if (lotteryAutoImportConsumedRef.current) return;

    lotteryAutoImportConsumedRef.current = true;
    params.delete('lottery');
    const qs = params.toString();
    window.history.replaceState({}, '', qs ? `${pathname}?${qs}` : pathname);

    if (guests.length === 0) {
      showAlert(t.preview.importLotteryErrorTitle, t.preview.importLotteryNoGuests);
      return;
    }
    if (lotteryPersonRowCount === 0) {
      showAlert(t.preview.importLotteryErrorTitle, t.preview.importLotteryNoValidNames);
      return;
    }

    queueMicrotask(() => {
      handleImportLotteryOneClick();
    });
  }, [
    pathname,
    guests.length,
    lotteryPersonRowCount,
    handleImportLotteryOneClick,
    showAlert,
    t.preview.importLotteryErrorTitle,
    t.preview.importLotteryNoGuests,
    t.preview.importLotteryNoValidNames,
  ]);

  const unassignedGuests = guests.filter(g => !g.tableId);
  const assignedGuests = guests.filter(g => g.tableId);

  const previewQ = previewListSearch.trim().toLowerCase();
  const filteredPreviewTables = filterTablesBySearchQuery(tables, guests, previewListSearch);
  const filteredUnassignedGuests = unassignedGuests.filter((g) => {
    if (!previewQ) return true;
    if (g.name.toLowerCase().includes(previewQ)) return true;
    return g.tags.some((tag) => tag.toLowerCase().includes(previewQ));
  });

  const layoutTablesForMap = previewQ ? filteredPreviewTables : tables;
  const layoutTablesSortedForMap = useMemo(
    () => sortTablesForAutoArrange(layoutTablesForMap),
    [layoutTablesForMap],
  );
  const previewLayoutRect = useMemo(
    () => ({ width: 800, height: 500 }) as DOMRect,
    [],
  );

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6 md:mb-8 no-print">
        <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">{t.preview.title}</h1>
        <p className="text-sm md:text-base text-gray-700">{t.preview.subtitle}</p>
        <p className="text-xs md:text-sm text-gray-600 mt-3 max-w-3xl leading-relaxed">
          {t.preview.lotteryIntegrationHint}
        </p>
        <p className="text-xs text-gray-600 mt-2 max-w-3xl leading-relaxed">
          {t.common.backupHint}
        </p>
        <p className="text-xs text-gray-600 mt-2 max-w-3xl leading-relaxed">
          {t.common.shortcutsHint}
        </p>
        {cloudSyncAvailable && (
          <p className="text-xs text-gray-600 mt-2 max-w-3xl leading-relaxed">
            {t.common.cloudSyncHint}{' '}
            <Link href="/sync" className="font-semibold text-rose-700 hover:underline">
              {t.nav.sync} →
            </Link>
          </p>
        )}
      </div>

      {/* Action Buttons */}
      <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6 md:mb-8 no-print">
        <h2 className="text-base md:text-lg font-semibold mb-4 text-gray-900">{t.preview.actions}</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
          <button
            onClick={handleExportPDF}
            className="px-3 md:px-4 py-2 md:py-3 text-sm md:text-base cursor-pointer bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
          >
            {t.preview.exportPDF}
          </button>
          <button
            onClick={handleExportCSV}
            className="px-3 md:px-4 py-2 md:py-3 text-sm md:text-base cursor-pointer bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors font-semibold"
          >
            {t.preview.exportCSV}
          </button>
          <button
            onClick={handleExportLotteryXlsx}
            className="px-3 md:px-4 py-2 md:py-3 text-sm md:text-base cursor-pointer bg-teal-600 text-white rounded-lg hover:bg-teal-700 transition-colors font-semibold"
          >
            {t.preview.exportLotteryXlsx}
          </button>
          <button
            type="button"
            onClick={handleExportGuestsImportXlsx}
            disabled={guests.length === 0}
            className="px-3 md:px-4 py-2 md:py-3 text-sm md:text-base cursor-pointer bg-cyan-700 text-white rounded-lg hover:bg-cyan-800 transition-colors font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.preview.exportGuestsImportXlsx}
          </button>
          <button
            type="button"
            onClick={handleImportLotteryOneClick}
            disabled={lotteryPersonRowCount === 0}
            className="px-3 md:px-4 py-2 md:py-3 text-sm md:text-base cursor-pointer bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors font-semibold disabled:cursor-not-allowed disabled:opacity-50"
          >
            {t.preview.importLotteryOneClick}
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className="px-3 md:px-4 py-2 md:py-3 text-sm md:text-base cursor-pointer bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-semibold"
          >
            {t.preview.exportJSON}
          </button>
          <button
            type="button"
            onClick={handlePickImportJSON}
            className="px-3 md:px-4 py-2 md:py-3 text-sm md:text-base cursor-pointer bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition-colors font-semibold"
          >
            {t.preview.importJSON}
          </button>
          <input
            ref={jsonImportRef}
            type="file"
            accept=".json,application/json"
            className="sr-only"
            aria-label={t.preview.importJSON}
            onChange={handleImportJSONFile}
          />
          <button
            type="button"
            onClick={clearAll}
            className="px-3 md:px-4 py-2 md:py-3 text-sm md:text-base cursor-pointer bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors font-semibold"
          >
            {t.preview.deleteAll}
          </button>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8 no-print">
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md text-center">
          <div className="text-2xl md:text-3xl font-bold text-rose-600">{guests.length}</div>
          <div className="text-xs md:text-sm text-gray-700 mt-1">{t.preview.totalGuests}</div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md text-center">
          <div className="text-2xl md:text-3xl font-bold text-green-600">{assignedGuests.length}</div>
          <div className="text-xs md:text-sm text-gray-700 mt-1">{t.preview.assignedCount}</div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md text-center">
          <div className="text-2xl md:text-3xl font-bold text-orange-600">{unassignedGuests.length}</div>
          <div className="text-xs md:text-sm text-gray-700 mt-1">{t.preview.unassignedCount}</div>
        </div>
        <div className="bg-white p-4 md:p-6 rounded-xl shadow-md text-center">
          <div className="text-2xl md:text-3xl font-bold text-blue-600">{tables.length}</div>
          <div className="text-xs md:text-sm text-gray-700 mt-1">{t.preview.tablesCount}</div>
        </div>
      </div>

      {/* Preview list filter (screen + print/PDF); exports use full data */}
      {(tables.length > 0 || unassignedGuests.length > 0) && (
        <div className="no-print mb-6 md:mb-8 rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5">
          <p className="mb-2 text-xs leading-relaxed text-gray-600">{t.preview.listSearchHint}</p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
            <input
              type="search"
              value={previewListSearch}
              onChange={(e) => setPreviewListSearch(e.target.value)}
              placeholder={t.tables.listSearchPlaceholder}
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-rose-500 sm:max-w-lg"
            />
            <div className="flex flex-wrap items-center justify-between gap-2 sm:justify-end">
              {tables.length > 0 && (
                <p className="text-xs text-gray-600">
                  {t.tables.listShowing
                    .replace('{shown}', String(previewQ ? filteredPreviewTables.length : tables.length))
                    .replace('{total}', String(tables.length))}
                </p>
              )}
              {unassignedGuests.length > 0 && (
                <p className="text-xs text-gray-600">
                  {t.seating.filterShowing
                    .replace('{shown}', String(previewQ ? filteredUnassignedGuests.length : unassignedGuests.length))
                    .replace('{total}', String(unassignedGuests.length))}
                </p>
              )}
              {previewListSearch.trim() !== '' && (
                <button
                  type="button"
                  onClick={() => setPreviewListSearch('')}
                  className="text-xs font-semibold text-rose-700 hover:underline"
                >
                  {t.seating.clearFilters}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Print Preview */}
      <div ref={printRef} data-pdf-export className="bg-white rounded-xl shadow-md p-4 sm:p-6 md:p-8">
        <div className="text-center mb-6 md:mb-8">
          <h2 className="text-2xl md:text-3xl font-bold text-gray-900 mb-2">
            {t.preview.pageTitle}
          </h2>
          <p className="text-sm md:text-base text-gray-700">
            {new Date().toLocaleDateString(localeMap[language] || 'en-US', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        {tables.length === 0 ? (
          <div className="text-center py-12 md:py-16 text-gray-500">
            <p className="text-base md:text-lg">{t.preview.noTablesPreview}</p>
            <p className="text-sm mt-2">{t.preview.noTablesPreviewDesc}</p>
          </div>
        ) : previewQ && filteredPreviewTables.length === 0 ? (
          <div className="py-10 text-center text-gray-600">
            <p>{t.tables.listNoFilterMatch}</p>
          </div>
        ) : (
          <div className="space-y-4 md:space-y-6">
            {filteredPreviewTables.map(table => {
              const tableGuests = table.guests
                .map((gId: string) => guests.find(g => g.id === gId))
                .filter((g): g is Guest => g !== undefined);

              return (
                <div key={table.id} className="pdf-avoid-break border-2 border-gray-200 rounded-lg p-4 md:p-6">
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-4 pb-3 border-b">
                    <div>
                      <h3 className="text-xl md:text-2xl font-bold text-gray-900">
                        {table.type === 'round' ? '🔵' : '🟦'} {table.name}
                      </h3>
                      <p className="text-xs md:text-sm text-gray-700 mt-1">
                        {t.tables.capacity}: {table.guests.length} / {table.capacity} {t.tables.seats}
                      </p>
                    </div>
                    {table.guests.length > table.capacity && (
                      <span className="text-sm md:text-base text-red-600 font-semibold">{t.preview.overCapacityWarning}</span>
                    )}
                    {table.guests.length === table.capacity && (
                      <span className="text-sm md:text-base text-green-600 font-semibold">{t.preview.fullTag}</span>
                    )}
                  </div>

                  {tableGuests.length === 0 ? (
                    <p className="text-gray-400 italic text-sm">{t.preview.noGuestsAssigned}</p>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 md:gap-3">
                      {tableGuests.map((guest: Guest, idx: number) => (
                        <div key={guest.id} className="flex items-start gap-2">
                          <span className="text-gray-500 font-mono">{idx + 1}.</span>
                          <div className="flex-1">
                            <div className="font-semibold text-gray-900">{guest.name}</div>
                            {guest.tags.length > 0 && (
                              <div className="flex gap-1 mt-1 flex-wrap">
                                {guest.tags.map((tag: string, tidx: number) => (
                                  <span
                                    key={tidx}
                                    className="text-xs px-2 py-0.5 bg-gray-100 text-gray-700 rounded-full"
                                  >
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Unassigned Guests */}
        {filteredUnassignedGuests.length > 0 && (
          <div className="mt-6 md:mt-8 border-2 border-orange-200 bg-orange-50 rounded-lg p-4 md:p-6 pdf-avoid-break">
            <h3 className="text-lg md:text-xl font-bold text-orange-900 mb-4">
              {`${t.preview.unassignedTitle} (${filteredUnassignedGuests.length}${
                previewQ && filteredUnassignedGuests.length !== unassignedGuests.length
                  ? ` / ${unassignedGuests.length}`
                  : ''
              })`}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              {filteredUnassignedGuests.map((guest, idx) => (
                <div key={guest.id} className="flex items-center gap-2">
                  <span className="text-gray-500 font-mono">{idx + 1}.</span>
                  <span className="font-medium text-gray-900">{guest.name}</span>
                  {guest.tags.length > 0 && (
                    <span className="text-xs text-gray-600">
                      ({guest.tags.join(', ')})
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Room Layout for PDF */}
        {tables.length > 0 && (!previewQ || filteredPreviewTables.length > 0) && (
          <div className="mt-8 border-t pt-8 pdf-avoid-break">
            <h3 className="text-2xl font-bold text-gray-900 mb-6 text-center">
              {t.layout.title}
            </h3>
            <div
              className="relative bg-gray-50 border-2 border-gray-300 rounded-lg mx-auto"
              style={{
                width: '100%',
                maxWidth: '800px',
                height: '500px',
                backgroundImage: 'radial-gradient(circle, #d1d5db 1px, transparent 1px)',
                backgroundSize: '20px 20px',
              }}
            >
              {layoutTablesForMap.map((table) => {
                const idx = layoutTablesSortedForMap.findIndex((t) => t.id === table.id);
                const position =
                  table.position ??
                  computeFallbackPosition(
                    layoutTablesSortedForMap,
                    idx >= 0 ? idx : 0,
                    previewLayoutRect,
                  );

                const isOverCapacity = table.guests.length > table.capacity;
                const size = table.type === 'round' ? 70 : 90;

                return (
                  <div
                    key={table.id}
                    className={`absolute ${isOverCapacity ? 'ring-4 ring-red-500' : ''}`}
                    style={{
                      left: `${position.x}%`,
                      top: `${position.y}%`,
                      transform: 'translate(-50%, -50%)',
                      width: `${size}px`,
                      height: `${size}px`,
                    }}
                  >
                    <div
                      className={`wedding-table-chip flex h-full w-full flex-col items-center justify-center text-xs shadow-lg ${
                        table.type === 'round' ? 'rounded-full' : 'rounded-lg'
                      } ${
                        isOverCapacity
                          ? 'wedding-table-chip--over'
                          : table.guests.length === table.capacity
                            ? 'wedding-table-chip--full'
                            : 'wedding-table-chip--ok'
                      }`}
                    >
                      <div className="text-xs">{table.type === 'round' ? '🔵' : '🟦'}</div>
                      <div className="text-xs">{table.name}</div>
                      <div className="text-xs mt-1">
                        {table.guests.length}/{table.capacity}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="mt-8 text-center text-sm text-gray-500">
          <p>{t.preview.generatedBy}</p>
        </div>
      </div>
    </div>
  );
}
