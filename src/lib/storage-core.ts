import { SeatingPlan, Guest, Table } from '@/types';

function tableForGuest(guest: Guest, tables: Table[]): Table | undefined {
  return tables.find(t => t.guests.includes(guest.id)) ?? tables.find(t => t.id === guest.tableId);
}

/** Rows for log-lottery (Excel template: uid, name, department, identity). Skips blank names so imports match lottery normalization. */
export function buildLotteryPersonRows(guests: Guest[], tables: Table[]) {
  return guests
    .filter((g) => typeof g.name === 'string' && g.name.trim() !== '')
    .map((guest, index) => {
      const table = tableForGuest(guest, tables);
      const tableName = table?.name ?? '';
      const identity = guest.tags.length ? guest.tags.join(', ') : '';
      return {
        uid: index + 1,
        plannerGuestId: guest.id,
        name: guest.name.trim(),
        department: tableName,
        identity,
      };
    });
}

export const STORAGE_KEY = 'wedding-seating-plan';

export const storageCore = {
  savePlan: (plan: SeatingPlan): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan));
    } catch (error) {
      console.error('Failed to save seating plan:', error);
    }
  },

  loadPlan: (): SeatingPlan | null => {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEY);
      if (!data) return null;
      return JSON.parse(data) as SeatingPlan;
    } catch (error) {
      console.error('Failed to load seating plan:', error);
      return null;
    }
  },

  clearPlan: (): void => {
    if (typeof window === 'undefined') return;
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch (error) {
      console.error('Failed to clear seating plan:', error);
    }
  },
};
