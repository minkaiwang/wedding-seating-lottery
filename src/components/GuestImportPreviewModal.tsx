"use client";

import { useEffect } from "react";
import { getTranslations } from "@/lib/i18n";
import {
  buildGuestImportPreview,
  type ParsedGuestRow,
} from "@/lib/guestImport";

type T = ReturnType<typeof getTranslations>;

const PREVIEW_LIMIT = 14;

export default function GuestImportPreviewModal({
  open,
  rows,
  existingNames,
  onClose,
  onConfirm,
  t,
}: {
  open: boolean;
  rows: ParsedGuestRow[];
  existingNames: string[];
  onClose: () => void;
  onConfirm: (rows: ParsedGuestRow[]) => void;
  t: T;
}) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || rows.length === 0) return null;

  const { previewRows, dupExistingCount, dupInFileRowCount } =
    buildGuestImportPreview(rows, existingNames);

  const hintLabel = (hint: (typeof previewRows)[0]["hint"]) => {
    switch (hint) {
      case "dup_existing":
        return t.guests.bulkImportPreviewHintDupExisting;
      case "dup_file":
        return t.guests.bulkImportPreviewHintDupInFile;
      case "dup_both":
        return t.guests.bulkImportPreviewHintBoth;
      default:
        return t.guests.bulkImportPreviewHintNew;
    }
  };

  const shown = previewRows.slice(0, PREVIEW_LIMIT);
  const rest = previewRows.length - shown.length;

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <button
        type="button"
        className="absolute inset-0 bg-gray-900/50"
        aria-label={t.guests.bulkImportCancel}
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(90vh,720px)] w-full max-w-2xl flex-col rounded-t-2xl bg-white shadow-2xl sm:rounded-2xl sm:mx-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guest-import-preview-title"
      >
        <div className="border-b border-gray-100 px-4 py-4 sm:px-6">
          <h2
            id="guest-import-preview-title"
            className="text-lg font-bold text-gray-900 sm:text-xl"
          >
            {t.guests.bulkImportPreviewTitle}
          </h2>
          <p className="mt-2 text-sm text-gray-700">
            {t.guests.bulkImportPreviewSummary.replace(
              "{n}",
              String(rows.length),
            )}
          </p>
          {dupExistingCount > 0 && (
            <p className="mt-1.5 text-sm text-amber-800">
              {t.guests.bulkImportPreviewDupExisting.replace(
                "{n}",
                String(dupExistingCount),
              )}
            </p>
          )}
          {dupInFileRowCount > 0 && (
            <p className="mt-1.5 text-sm text-amber-800">
              {t.guests.bulkImportPreviewDupInFile.replace(
                "{n}",
                String(dupInFileRowCount),
              )}
            </p>
          )}
        </div>

        <div className="min-h-0 flex-1 overflow-auto px-4 py-3 sm:px-6">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-xs font-semibold uppercase tracking-wide text-gray-500">
                <th className="py-2 pr-2">{t.guests.bulkImportPreviewColName}</th>
                <th className="py-2 pr-2">{t.guests.bulkImportPreviewColTags}</th>
                <th className="py-2">{t.guests.bulkImportPreviewColHint}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {shown.map((row, i) => (
                <tr key={`${row.name}-${i}`} className="text-gray-900">
                  <td className="py-2 pr-2 font-medium">{row.name}</td>
                  <td className="py-2 pr-2 text-gray-600">
                    {row.tags.length ? row.tags.join(", ") : "—"}
                  </td>
                  <td className="py-2">
                    {row.hint !== "new" ? (
                      <span className="inline-block rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-900">
                        {hintLabel(row.hint)}
                      </span>
                    ) : (
                      <span className="text-gray-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {rest > 0 && (
            <p className="mt-3 text-center text-xs text-gray-500">
              {t.guests.bulkImportPreviewMoreRows.replace("{n}", String(rest))}
            </p>
          )}
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-gray-100 px-4 py-4 sm:flex-row sm:justify-end sm:px-6">
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-800 transition-colors hover:bg-gray-50"
          >
            {t.guests.bulkImportCancel}
          </button>
          <button
            type="button"
            onClick={() => onConfirm(rows)}
            className="btn-wedding-primary cursor-pointer rounded-lg px-5 py-2.5 text-sm font-semibold transition-colors"
          >
            {t.guests.bulkImportConfirm}
          </button>
        </div>
      </div>
    </div>
  );
}
