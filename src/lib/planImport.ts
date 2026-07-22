import type { Guest, SeatingPlan, Table } from '@/types';

export const PLAN_LIMITS = {
  maxGuests: 5_000,
  maxTables: 1_000,
  maxTagsPerGuest: 50,
  maxIdLength: 128,
  maxNameLength: 200,
  maxTagLength: 100,
  maxTableCapacity: 1_000,
  maxCoordinateMagnitude: 1_000_000,
} as const;

function isBoundedString(value: unknown, maxLength: number, allowEmpty = true): value is string {
  return (
    typeof value === 'string' &&
    value.length <= maxLength &&
    (allowEmpty || value.trim().length > 0)
  );
}

/** Accept app-exported JSON; tolerate missing optional fields. */
export function normalizeSeatingPlan(raw: unknown): SeatingPlan | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  if (!Array.isArray(o.guests) || !Array.isArray(o.tables)) return null;
  if (o.guests.length > PLAN_LIMITS.maxGuests || o.tables.length > PLAN_LIMITS.maxTables) {
    return null;
  }

  const guests: Guest[] = [];
  const guestIds = new Set<string>();
  for (const item of o.guests) {
    if (!item || typeof item !== 'object') return null;
    const g = item as Record<string, unknown>;
    if (
      !isBoundedString(g.id, PLAN_LIMITS.maxIdLength, false) ||
      !isBoundedString(g.name, PLAN_LIMITS.maxNameLength)
    ) {
      return null;
    }
    if (guestIds.has(g.id)) return null;
    guestIds.add(g.id);

    if (g.tags !== undefined && !Array.isArray(g.tags)) return null;
    const rawTags = Array.isArray(g.tags) ? g.tags : [];
    if (rawTags.length > PLAN_LIMITS.maxTagsPerGuest) return null;
    if (!rawTags.every((tag) => isBoundedString(tag, PLAN_LIMITS.maxTagLength))) return null;
    const tags = rawTags as string[];

    let tableId: string | undefined;
    if (g.tableId === undefined || g.tableId === null) tableId = undefined;
    else if (isBoundedString(g.tableId, PLAN_LIMITS.maxIdLength, false)) tableId = g.tableId;
    else return null;
    guests.push({ id: g.id, name: g.name, tags, tableId });
  }

  const tables: Table[] = [];
  const tableIds = new Set<string>();
  const assignedGuestIds = new Set<string>();
  const assignedTableByGuest = new Map<string, string>();
  for (const item of o.tables) {
    if (!item || typeof item !== 'object') return null;
    const t = item as Record<string, unknown>;
    if (
      !isBoundedString(t.id, PLAN_LIMITS.maxIdLength, false) ||
      !isBoundedString(t.name, PLAN_LIMITS.maxNameLength) ||
      typeof t.capacity !== 'number' ||
      !Number.isInteger(t.capacity) ||
      t.capacity < 1 ||
      t.capacity > PLAN_LIMITS.maxTableCapacity
    ) {
      return null;
    }
    if (tableIds.has(t.id)) return null;
    tableIds.add(t.id);
    if (t.type !== 'round' && t.type !== 'rectangle') return null;
    if (t.guests !== undefined && !Array.isArray(t.guests)) return null;
    const tableGuestIds = Array.isArray(t.guests) ? t.guests : [];
    if (
      !tableGuestIds.every((id) => isBoundedString(id, PLAN_LIMITS.maxIdLength, false)) ||
      new Set(tableGuestIds).size !== tableGuestIds.length
    ) {
      return null;
    }
    for (const guestId of tableGuestIds) {
      if (!guestIds.has(guestId) || assignedGuestIds.has(guestId)) return null;
      assignedGuestIds.add(guestId);
      assignedTableByGuest.set(guestId, t.id);
    }

    let position: Table['position'] | undefined;
    if (t.position !== undefined && t.position !== null) {
      if (typeof t.position !== 'object') return null;
      const p = t.position as Record<string, unknown>;
      if (
        typeof p.x === 'number' &&
        typeof p.y === 'number' &&
        Number.isFinite(p.x) &&
        Number.isFinite(p.y) &&
        Math.abs(p.x) <= PLAN_LIMITS.maxCoordinateMagnitude &&
        Math.abs(p.y) <= PLAN_LIMITS.maxCoordinateMagnitude
      ) {
        position = { x: p.x, y: p.y };
      } else return null;
    }

    tables.push({
      id: t.id,
      name: t.name,
      type: t.type,
      capacity: t.capacity,
      guests: [...tableGuestIds] as string[],
      position,
    });
  }

  const tableById = new Map(tables.map((table) => [table.id, table]));
  for (const guest of guests) {
    if (guest.tableId !== undefined && !tableIds.has(guest.tableId)) return null;
    const assignedTableId = assignedTableByGuest.get(guest.id);
    if (guest.tableId !== undefined && assignedTableId !== undefined) {
      if (guest.tableId !== assignedTableId) return null;
    } else if (guest.tableId !== undefined) {
      const table = tableById.get(guest.tableId);
      if (!table) return null;
      table.guests.push(guest.id);
      assignedTableByGuest.set(guest.id, guest.tableId);
    } else if (assignedTableId !== undefined) {
      guest.tableId = assignedTableId;
    }
  }

  return {
    guests,
    tables,
    lastUpdated:
      typeof o.lastUpdated === 'string' ? o.lastUpdated : new Date().toISOString(),
  };
}
