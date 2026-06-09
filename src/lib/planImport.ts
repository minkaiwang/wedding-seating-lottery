import type { Guest, SeatingPlan, Table } from '@/types';

/** Accept app-exported JSON; tolerate missing optional fields. */
export function normalizeSeatingPlan(raw: unknown): SeatingPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.guests) || !Array.isArray(o.tables)) return null;

  const guests: Guest[] = [];
  for (const item of o.guests) {
    if (!item || typeof item !== 'object') return null;
    const g = item as Record<string, unknown>;
    if (typeof g.id !== 'string' || typeof g.name !== 'string') return null;
    const tags = Array.isArray(g.tags)
      ? g.tags.filter((t): t is string => typeof t === 'string')
      : [];
    let tableId: string | undefined;
    if (g.tableId === undefined || g.tableId === null) tableId = undefined;
    else if (typeof g.tableId === 'string') tableId = g.tableId;
    else return null;
    guests.push({ id: g.id, name: g.name, tags, tableId });
  }

  const tables: Table[] = [];
  for (const item of o.tables) {
    if (!item || typeof item !== 'object') return null;
    const t = item as Record<string, unknown>;
    if (
      typeof t.id !== 'string' ||
      typeof t.name !== 'string' ||
      typeof t.capacity !== 'number' ||
      !Number.isFinite(t.capacity)
    ) {
      return null;
    }
    if (t.type !== 'round' && t.type !== 'rectangle') return null;
    const guestIds = Array.isArray(t.guests)
      ? t.guests.filter((id): id is string => typeof id === 'string')
      : [];

    let position: Table['position'] | undefined;
    if (t.position !== undefined && t.position !== null) {
      if (typeof t.position !== 'object') return null;
      const p = t.position as Record<string, unknown>;
      if (typeof p.x === 'number' && typeof p.y === 'number') {
        position = { x: p.x, y: p.y };
      }
    }

    tables.push({
      id: t.id,
      name: t.name,
      type: t.type,
      capacity: t.capacity,
      guests: guestIds,
      position,
    });
  }

  return {
    guests,
    tables,
    lastUpdated:
      typeof o.lastUpdated === 'string' ? o.lastUpdated : new Date().toISOString(),
  };
}
