import * as XLSX from 'xlsx';
import { SeatingPlan, Guest, Table } from '@/types';
import { buildLotteryPersonRows, storageCore } from '@/lib/storage-core';

export { buildLotteryPersonRows, STORAGE_KEY } from '@/lib/storage-core';

export const storage = {
  ...storageCore,

  exportToJSON: (plan: SeatingPlan): void => {
    const dataStr = JSON.stringify(plan, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seating-plan-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  importFromJSON: (file: File): Promise<SeatingPlan> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const plan = JSON.parse(e.target?.result as string);
          resolve(plan);
        } catch {
          reject(new Error('Nevažeća JSON datoteka'));
        }
      };
      reader.onerror = () => reject(new Error('Greška pri čitanju datoteke'));
      reader.readAsText(file);
    });
  },

  exportToCSV: (
    guests: Guest[],
    tables: Table[],
    labels: {
      nameCol: string;
      tagsCol: string;
      tableCol: string;
      unassigned: string;
    },
  ): void => {
    const esc = (s: string) => `"${String(s).replace(/"/g, '""')}"`;
    const header = [labels.nameCol, labels.tagsCol, labels.tableCol].map(esc).join(',');
    let csv = `${header}\n`;

    guests.forEach(guest => {
      const table = tables.find(t => t.guests.includes(guest.id));
      const tableName = table ? table.name : labels.unassigned;
      csv += `${esc(guest.name)},${esc(guest.tags.join(', '))},${esc(tableName)}\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `seating-plan-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  },

  exportToLotteryXlsx: (guests: Guest[], tables: Table[]): void => {
    const rows = buildLotteryPersonRows(guests, tables);

    const ws =
      rows.length > 0
        ? XLSX.utils.json_to_sheet(rows)
        : XLSX.utils.aoa_to_sheet([['uid', 'name', 'department', 'identity']]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sheet1');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `lottery-persons-${date}.xlsx`);
  },

  exportGuestsImportXlsx: (guests: Guest[], headers: [string, string]): void => {
    const [hName, hTags] = headers;
    const aoa: string[][] = [
      [hName, hTags],
      ...guests.map((g) => [g.name, g.tags.join(', ')]),
    ];
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'guests');
    const date = new Date().toISOString().split('T')[0];
    XLSX.writeFile(wb, `guests-reimport-${date}.xlsx`);
  },
};
