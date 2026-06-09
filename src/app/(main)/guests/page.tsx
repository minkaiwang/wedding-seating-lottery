"use client";

import { useMemo, useRef, useState } from 'react';
import { LOTTERY_APP_NAME_ZH } from '@/lib/brand';
import GuestImportPreviewModal from '@/components/GuestImportPreviewModal';
import {
  downloadGuestImportTemplate,
  parseGuestBulkText,
  parseGuestImportFile,
  type ParsedGuestRow,
} from '@/lib/guestImport';
import { useApp } from '@/contexts/seating-app';

export default function GuestsPage() {
  const {
    guests,
    addGuest,
    updateGuest,
    renameGuestTag,
    deleteGuest,
    t,
    showConfirm,
    showAlert,
    lotteryLiveSync,
    setLotteryLiveSync,
    startUndoBatch,
    endUndoBatch,
  } = useApp();
  const [name, setName] = useState('');
  const [tags, setTags] = useState('');
  const [bulkText, setBulkText] = useState('');
  const [showBulk, setShowBulk] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editTags, setEditTags] = useState('');
  const fileImportRef = useRef<HTMLInputElement>(null);
  const [importNotice, setImportNotice] = useState<{
    kind: 'ok' | 'err';
    text: string;
  } | null>(null);
  const [pendingImport, setPendingImport] = useState<{
    rows: ParsedGuestRow[];
    clearBulkOnConfirm: boolean;
  } | null>(null);
  const [listSearch, setListSearch] = useState('');
  const [listTag, setListTag] = useState('');
  const [renameTagFrom, setRenameTagFrom] = useState('');
  const [renameTagTo, setRenameTagTo] = useState('');

  const handleAddGuest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    addGuest({
      name: name.trim(),
      tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
    });

    setName('');
    setTags('');
  };

  const handleBulkTextPreview = () => {
    setImportNotice(null);
    const rows = parseGuestBulkText(bulkText);
    if (!rows.length) {
      setImportNotice({ kind: 'err', text: t.guests.bulkImportErrorNoRows });
      return;
    }
    setPendingImport({ rows, clearBulkOnConfirm: true });
  };

  const handleGuestFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setImportNotice(null);
    try {
      const rows = await parseGuestImportFile(file);
      if (!rows.length) {
        setImportNotice({ kind: 'err', text: t.guests.bulkImportErrorNoRows });
        return;
      }
      setPendingImport({ rows, clearBulkOnConfirm: false });
    } catch (err) {
      const noName =
        err instanceof Error && err.message === 'NO_NAME_COLUMN';
      setImportNotice({
        kind: 'err',
        text: noName
          ? t.guests.bulkImportErrorNoNameColumn
          : t.guests.bulkImportErrorInvalid,
      });
    }
  };

  const confirmPendingImport = (rows: ParsedGuestRow[]) => {
    const validRows = rows.filter((row) => typeof row.name === 'string' && row.name.trim() !== '');
    if (!validRows.length) {
      setPendingImport(null);
      setImportNotice({ kind: 'err', text: t.guests.bulkImportErrorNoRows });
      return;
    }
    const clearBulk = pendingImport?.clearBulkOnConfirm ?? false;
    startUndoBatch();
    validRows.forEach((row) => addGuest({ name: row.name.trim(), tags: row.tags }));
    endUndoBatch();
    if (clearBulk) {
      setBulkText('');
      setShowBulk(false);
    }
    setPendingImport(null);
    setImportNotice({
      kind: 'ok',
      text: t.guests.bulkImportAdded.replace('{n}', String(validRows.length)),
    });
  };

  const startEdit = (id: string) => {
    const guest = guests.find(g => g.id === id);
    if (guest) {
      setEditingId(id);
      setEditName(guest.name);
      setEditTags(guest.tags.join(', '));
    }
  };

  const saveEdit = () => {
    if (!editingId) return;
    const trimmed = editName.trim();
    if (!trimmed) {
      showAlert(t.guests.guestName, t.guests.editNameRequired);
      return;
    }
    updateGuest(editingId, {
      name: trimmed,
      tags: editTags.split(',').map((s) => s.trim()).filter(Boolean),
    });
    setEditingId(null);
    setEditName('');
    setEditTags('');
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName('');
    setEditTags('');
  };

  const unassignedGuests = guests.filter(g => !g.tableId);
  const assignedGuests = guests.filter(g => g.tableId);
  const allGuestTags = Array.from(new Set(guests.flatMap(g => g.tags))).sort((a, b) =>
    a.localeCompare(b, 'zh-CN'),
  );
  const tagGuestCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const guest of guests) {
      for (const tag of guest.tags) {
        counts.set(tag, (counts.get(tag) ?? 0) + 1);
      }
    }
    return counts;
  }, [guests]);

  const handleRenameTag = () => {
    const from = renameTagFrom.trim();
    const to = renameTagTo.trim();
    if (!from) {
      showAlert(t.guests.tagManageTitle, t.guests.tagManageSelectTag);
      return;
    }
    if (!to) {
      showAlert(t.guests.tagManageTitle, t.guests.tagManageRenameEmpty);
      return;
    }
    if (from === to) {
      showAlert(t.guests.tagManageTitle, t.guests.tagManageRenameSame);
      return;
    }
    const affected = renameGuestTag(from, to);
    if (affected === 0) return;
    if (listTag === from) setListTag(to);
    setRenameTagFrom(to);
    setRenameTagTo('');
    showAlert(
      t.guests.tagManageTitle,
      t.guests.tagManageRenameSuccess
        .replace('{from}', from)
        .replace('{to}', to)
        .replace('{n}', String(affected)),
    );
  };
  const listQuery = listSearch.trim().toLowerCase();
  const filteredGuestList = guests.filter(g => {
    const tagOk = !listTag || g.tags.includes(listTag);
    if (!listQuery) return tagOk;
    const q = listQuery;
    const nameHit = g.name.toLowerCase().includes(q);
    const tagHit = g.tags.some((tag) => tag.toLowerCase().includes(q));
    return (nameHit || tagHit) && tagOk;
  });

  return (
    <div className="max-w-4xl mx-auto">
      <GuestImportPreviewModal
        open={pendingImport !== null && pendingImport.rows.length > 0}
        rows={pendingImport?.rows ?? []}
        existingNames={guests.map((g) => g.name)}
        onClose={() => setPendingImport(null)}
        onConfirm={confirmPendingImport}
        t={t}
      />
      <div className="mb-6 flex flex-col gap-4 md:mb-8 lg:flex-row lg:items-start lg:justify-between lg:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-900">{t.guests.title}</h1>
          <p className="text-sm md:text-base text-gray-700 mt-1">
            {t.guests.total}: {guests.length} | {t.guests.assigned}: {assignedGuests.length} | {t.guests.unassigned}: {unassignedGuests.length}
          </p>
          <p className="mt-2 max-w-xl text-xs text-gray-600 leading-relaxed">
            {t.common.shortcutsHint}
          </p>
          <div className="mt-3 max-w-xl rounded-lg border border-rose-200 bg-rose-50/80 px-3 py-2.5">
            <label className="flex cursor-pointer items-start gap-2.5" title={LOTTERY_APP_NAME_ZH}>
              <input
                type="checkbox"
                className="mt-1 h-4 w-4 shrink-0 rounded border-gray-300 text-rose-600 focus:ring-rose-500"
                checked={lotteryLiveSync}
                onChange={(e) => setLotteryLiveSync(e.target.checked)}
              />
              <span>
                <span className="font-medium text-rose-900">{t.guests.lotteryLiveSync}</span>
                <span className="block text-xs text-rose-800/90 mt-1 leading-relaxed">{t.guests.lotteryLiveSyncHint}</span>
              </span>
            </label>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setShowBulk(!showBulk)}
          className="w-full shrink-0 cursor-pointer rounded-lg bg-gray-600 px-4 py-2 text-sm text-white transition-colors hover:bg-gray-700 sm:w-auto md:text-base lg:mt-1"
        >
          {showBulk ? t.guests.individual : t.guests.bulkAdd}
        </button>
      </div>

      {/* Add Guest Form */}
      {!showBulk ? (
        <form onSubmit={handleAddGuest} className="bg-white p-4 sm:p-6 rounded-xl shadow-md mb-6 md:mb-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 md:gap-4">
            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.guests.guestName}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.guests.namePlaceholder}
                className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />
            </div>

            <div className="md:col-span-1">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t.guests.tags}
              </label>
              <input
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t.guests.tagsPlaceholder}
                className="w-full px-3 md:px-4 py-2 text-sm md:text-base border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent text-gray-900 placeholder-gray-500"
              />
            </div>

            <div className="md:col-span-1 flex items-end">
              <button
                type="submit"
                className="btn-wedding-primary w-full cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors md:px-6 md:text-base"
              >
                {t.guests.addGuest}
              </button>
            </div>
          </div>
        </form>
      ) : (
        <div className="bg-white p-6 rounded-xl shadow-md mb-8">
          <div className="mb-4 rounded-lg border border-rose-100 bg-rose-50/60 p-4 text-sm text-gray-800">
            <p className="leading-relaxed">{t.guests.bulkExcelIntro}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  downloadGuestImportTemplate([
                    t.guests.templateColName,
                    t.guests.templateColTags,
                  ])
                }
                className="cursor-pointer rounded-lg border border-rose-300 bg-white px-4 py-2 text-sm font-medium text-rose-800 shadow-sm transition-colors hover:bg-rose-50"
              >
                {t.guests.bulkDownloadTemplate}
              </button>
              <button
                type="button"
                onClick={() => fileImportRef.current?.click()}
                className="btn-wedding-primary cursor-pointer rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              >
                {t.guests.bulkImportButton}
              </button>
            </div>
            <input
              ref={fileImportRef}
              type="file"
              accept=".xlsx,.xls,.csv,text/csv,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
              className="sr-only"
              aria-label={t.guests.bulkImportButton}
              onChange={handleGuestFileImport}
            />
            <p className="mt-2 text-xs text-gray-600">{t.guests.bulkImportHint}</p>
            {importNotice && (
              <div
                className={
                  importNotice.kind === 'ok' ? 'mt-2' : 'mt-2'
                }
              >
                <p
                  className={
                    importNotice.kind === 'ok'
                      ? 'text-sm font-medium text-green-700'
                      : 'text-sm font-medium text-red-600'
                  }
                  role={importNotice.kind === 'err' ? 'alert' : undefined}
                >
                  {importNotice.text}
                </p>
                {importNotice.kind === 'ok' && (
                  <p className="mt-1.5 text-xs text-gray-600 leading-relaxed">
                    {t.common.backupHint}
                  </p>
                )}
              </div>
            )}
          </div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t.guests.bulkLabel}
          </label>
          <textarea
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            placeholder={t.guests.bulkPlaceholder}
            rows={8}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:border-transparent font-mono text-sm text-gray-900 placeholder-gray-500"
          />
          <button
            type="button"
            onClick={handleBulkTextPreview}
            className="btn-wedding-primary mt-4 cursor-pointer rounded-lg px-6 py-2 font-semibold transition-colors"
          >
            {t.guests.bulkReviewAndAdd}
          </button>
        </div>
      )}

      {/* Tag management */}
      <div className="bg-white rounded-xl shadow-md mb-6 md:mb-8 p-4 sm:p-6">
        <h2 className="text-base md:text-lg font-semibold text-gray-900">{t.guests.tagManageTitle}</h2>
        <p className="mt-1 text-xs md:text-sm text-gray-600 leading-relaxed">{t.guests.tagManageHint}</p>

        {allGuestTags.length === 0 ? (
          <p className="mt-4 text-sm text-gray-500">{t.guests.tagManageNoTags}</p>
        ) : (
          <>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.guests.tagManageSelectTag}
                </label>
                <select
                  value={renameTagFrom}
                  onChange={(e) => setRenameTagFrom(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 focus:border-transparent focus:ring-2 focus:ring-rose-500"
                >
                  <option value="">{t.guests.tagManageSelectTag}</option>
                  {allGuestTags.map((tag) => (
                    <option key={tag} value={tag}>
                      {tag} ({t.guests.tagManageGuestCount.replace('{n}', String(tagGuestCounts.get(tag) ?? 0))})
                    </option>
                  ))}
                </select>
              </div>
              <div className="hidden sm:flex items-center pb-2 text-gray-400 font-medium">→</div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t.guests.tagManageNewName}
                </label>
                <input
                  type="text"
                  value={renameTagTo}
                  onChange={(e) => setRenameTagTo(e.target.value)}
                  placeholder={t.guests.tagManageNewNamePlaceholder}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-rose-500"
                />
              </div>
              <button
                type="button"
                onClick={handleRenameTag}
                className="btn-wedding-primary w-full sm:w-auto cursor-pointer rounded-lg px-5 py-2 text-sm font-semibold transition-colors"
              >
                {t.guests.tagManageRename}
              </button>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              {allGuestTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => {
                    setRenameTagFrom(tag);
                    setRenameTagTo('');
                  }}
                  className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                    renameTagFrom === tag
                      ? 'bg-rose-600 text-white'
                      : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                  }`}
                >
                  {tag}
                  <span className="ml-1 opacity-80">
                    ({tagGuestCounts.get(tag) ?? 0})
                  </span>
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Guests List */}
      <div className="bg-white rounded-xl shadow-md overflow-hidden">
        <div className="px-6 py-4 bg-gray-50 border-b">
          <h2 className="text-lg font-semibold text-gray-900">{t.guests.guestList}</h2>
        </div>

        {guests.length > 0 && (
          <div className="space-y-2 border-b border-gray-100 px-6 py-3">
            <input
              type="search"
              value={listSearch}
              onChange={(e) => setListSearch(e.target.value)}
              placeholder={t.guests.listSearchPlaceholder}
              autoComplete="off"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900 placeholder-gray-500 focus:border-transparent focus:ring-2 focus:ring-rose-500"
            />
            {allGuestTags.length > 0 && (
              <select
                value={listTag}
                onChange={(e) => setListTag(e.target.value)}
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm text-gray-900"
              >
                <option value="">{t.seating.allTags}</option>
                {allGuestTags.map(tag => (
                  <option key={tag} value={tag}>{tag}</option>
                ))}
              </select>
            )}
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-gray-600">
                {t.guests.listShowing
                  .replace('{shown}', String(filteredGuestList.length))
                  .replace('{total}', String(guests.length))}
              </p>
              {(listSearch || listTag) && (
                <button
                  type="button"
                  onClick={() => {
                    setListSearch('');
                    setListTag('');
                  }}
                  className="text-xs font-semibold text-rose-700 hover:underline"
                >
                  {t.seating.clearFilters}
                </button>
              )}
            </div>
          </div>
        )}

        {guests.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p className="text-lg">{t.guests.noGuests}</p>
            <p className="text-sm mt-2">{t.guests.noGuestsDesc}</p>
          </div>
        ) : filteredGuestList.length === 0 ? (
          <div className="p-12 text-center text-gray-500">
            <p>{t.guests.listNoFilterMatch}</p>
          </div>
        ) : (
          <div className="divide-y">
            {filteredGuestList.map(guest => (
              <div key={guest.id} className="px-6 py-4 hover:bg-gray-50 transition-colors">
                {editingId === guest.id ? (
                  <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 sm:items-center">
                    <input
                      type="text"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="flex-1 px-3 py-2 text-sm md:text-base border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                    />
                    <input
                      type="text"
                      value={editTags}
                      onChange={(e) => setEditTags(e.target.value)}
                      placeholder={t.guests.tags.toLowerCase()}
                      className="flex-1 px-3 py-2 text-sm md:text-base border border-gray-300 rounded text-gray-900 placeholder-gray-500"
                    />
                    <div className="flex gap-2">
                      <button
                        onClick={saveEdit}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                      >
                        {t.guests.save}
                      </button>
                      <button
                        onClick={cancelEdit}
                        className="flex-1 sm:flex-none px-4 py-2 text-sm bg-gray-500 text-white rounded hover:bg-gray-600"
                      >
                        {t.guests.cancel}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-900">{guest.name}</h3>
                      <div className="flex flex-wrap gap-1 sm:gap-2 mt-1">
                        {guest.tags.map((tag, idx) => (
                          <span
                            key={idx}
                            className="text-xs px-2 py-1 bg-rose-100 text-rose-700 rounded-full"
                          >
                            {tag}
                          </span>
                        ))}
                        {guest.tableId && (
                          <span className="text-xs px-2 py-1 bg-green-100 text-green-700 rounded-full">
                            {t.guests.assignedTag}
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => startEdit(guest.id)}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm cursor-pointer text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      >
                        {t.guests.edit}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          showConfirm(
                            t.guests.deleteConfirm,
                            `${guest.name}?`,
                            () => deleteGuest(guest.id)
                          );
                        }}
                        className="flex-1 sm:flex-none px-3 sm:px-4 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      >
                        {t.guests.delete}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
