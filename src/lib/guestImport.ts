import * as XLSX from 'xlsx';

export type ParsedGuestRow = { name: string; tags: string[] };

export type GuestImportPreviewRow = ParsedGuestRow & {
  hint: 'new' | 'dup_existing' | 'dup_file' | 'dup_both';
};

export function normalizeGuestImportName(name: string): string {
  return name.trim().toLowerCase();
}

/** Build per-row hints: clash with existing list and/or duplicate names inside this import. */
export function buildGuestImportPreview(
  rows: ParsedGuestRow[],
  existingNames: string[],
): {
  previewRows: GuestImportPreviewRow[];
  dupExistingCount: number;
  dupInFileRowCount: number;
} {
  const existingSet = new Set(
    existingNames.map((n) => normalizeGuestImportName(n)),
  );
  const normCounts = new Map<string, number>();
  for (const r of rows) {
    const k = normalizeGuestImportName(r.name);
    normCounts.set(k, (normCounts.get(k) ?? 0) + 1);
  }

  const previewRows: GuestImportPreviewRow[] = rows.map((r) => {
    const k = normalizeGuestImportName(r.name);
    const ex = existingSet.has(k);
    const inf = (normCounts.get(k) ?? 0) > 1;
    let hint: GuestImportPreviewRow['hint'] = 'new';
    if (ex && inf) hint = 'dup_both';
    else if (ex) hint = 'dup_existing';
    else if (inf) hint = 'dup_file';
    return { ...r, hint };
  });

  const dupExistingCount = previewRows.filter(
    (p) => p.hint === 'dup_existing' || p.hint === 'dup_both',
  ).length;
  const dupInFileRowCount = previewRows.filter(
    (p) => p.hint === 'dup_file' || p.hint === 'dup_both',
  ).length;

  return { previewRows, dupExistingCount, dupInFileRowCount };
}

/** One guest per line: Name, tag1, tag2 (commas, same rules as bulk textarea). */
export function parseGuestBulkText(text: string): ParsedGuestRow[] {
  const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const out: ParsedGuestRow[] = [];
  for (const line of lines) {
    const parts = line.split(',').map((s) => s.trim());
    const name = parts[0] ?? '';
    if (!name) continue;
    out.push({ name, tags: parts.slice(1).filter(Boolean) });
  }
  return out;
}

/** Normalized header → match these for the name column */
const NAME_HEADERS = new Set([
  'name',
  '姓名',
  'guest',
  'guest name',
  'guestname',
  'full name',
  'fullname',
  'ime',
  'ime gosta',
  'nombre',
  'nom',
  'nome',
  'gast',
  'gastname',
]);

/** Normalized header → tags column (optional) */
const TAG_HEADERS = new Set([
  'tags',
  '标签',
  'tag',
  'tagovi',
  'identity',
  'identität',
  'identité',
  'identidad',
  'etiquetas',
  'étiquettes',
  'oznake',
]);

function normalizeHeader(cell: string): string {
  return cell.trim().toLowerCase();
}

function cellStr(v: unknown): string {
  if (v == null || v === '') return '';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  return String(v).trim();
}

function splitTags(raw: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,，;；|｜]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function resolveColumnIndex(headerRow: unknown[]): { nameIdx: number; tagsIdx: number } {
  const normalized = headerRow.map((c) => normalizeHeader(cellStr(c)));
  let nameIdx = -1;
  let tagsIdx = -1;
  normalized.forEach((h, i) => {
    if (NAME_HEADERS.has(h) && nameIdx < 0) nameIdx = i;
    if (TAG_HEADERS.has(h) && tagsIdx < 0) tagsIdx = i;
  });
  return { nameIdx, tagsIdx };
}

export function parseGuestImportWorkbook(wb: XLSX.WorkBook): ParsedGuestRow[] {
  const sheetName = wb.SheetNames[0];
  if (!sheetName) return [];
  const sheet = wb.Sheets[sheetName];
  const matrix = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: '',
    raw: false,
  }) as unknown[][];
  if (!matrix.length) return [];

  const { nameIdx, tagsIdx } = resolveColumnIndex(matrix[0] ?? []);
  if (nameIdx < 0) {
    throw new Error('NO_NAME_COLUMN');
  }

  const out: ParsedGuestRow[] = [];
  for (let r = 1; r < matrix.length; r++) {
    const row = matrix[r] ?? [];
    const name = cellStr(row[nameIdx]);
    if (!name) continue;
    const tagCell = tagsIdx >= 0 ? cellStr(row[tagsIdx]) : '';
    out.push({ name, tags: splitTags(tagCell) });
  }
  return out;
}

export async function parseGuestImportFile(file: File): Promise<ParsedGuestRow[]> {
  const lower = file.name.toLowerCase();
  let wb: XLSX.WorkBook;
  try {
    if (lower.endsWith('.csv')) {
      const text = await file.text();
      wb = XLSX.read(text, { type: 'string', codepage: 65001 });
    } else {
      const buf = await file.arrayBuffer();
      wb = XLSX.read(buf, { type: 'array', cellDates: false });
    }
  } catch {
    throw new Error('INVALID_FILE');
  }
  return parseGuestImportWorkbook(wb);
}

export function downloadGuestImportTemplate(sampleHeaders: [string, string]): void {
  const [nameH, tagsH] = sampleHeaders;
  const ws = XLSX.utils.aoa_to_sheet([
    [nameH, tagsH],
    ['张三', '女方亲友, 素食'],
    ['李四', '同事'],
    ['Alex Smith', 'friend, vegetarian'],
  ]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'guests');
  XLSX.writeFile(wb, 'guest-import-template.xlsx');
}
