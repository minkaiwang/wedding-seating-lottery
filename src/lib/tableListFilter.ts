import type { Guest, Table } from '@/types';

export function tableMatchesSearchQuery(
  table: Table,
  guests: Guest[],
  rawQuery: string,
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return true;
  if (table.name.toLowerCase().includes(q)) return true;
  return table.guests.some((gId) => {
    const g = guests.find((x) => x.id === gId);
    if (!g) return false;
    if (g.name.toLowerCase().includes(q)) return true;
    return g.tags.some((tag) => tag.toLowerCase().includes(q));
  });
}

export function filterTablesBySearchQuery(
  tables: Table[],
  guests: Guest[],
  rawQuery: string,
): Table[] {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return tables;
  return tables.filter((tab) => tableMatchesSearchQuery(tab, guests, rawQuery));
}
