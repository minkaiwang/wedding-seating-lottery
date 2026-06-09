'use client';

import { createContext, useContext } from 'react';
import type { Guest, SeatingPlan, Table } from '@/types';
import type { Language } from '@/lib/i18n';
import type { getTranslations } from '@/lib/i18n';

export interface SeatingAppContextType {
  guests: Guest[];
  tables: Table[];
  language: Language;
  setLanguage: (lang: Language) => void;
  t: ReturnType<typeof getTranslations>;
  showModal: (config: {
    title: string;
    message: string;
    onConfirm?: () => void;
    type?: 'confirm' | 'alert';
    confirmText?: string;
    cancelText?: string;
  }) => void;
  showConfirm: (
    title: string,
    message: string,
    onConfirm: () => void,
    buttonLabels?: { confirmText?: string; cancelText?: string },
  ) => void;
  showAlert: (title: string, message: string) => void;
  addGuest: (guest: Omit<Guest, 'id'>) => void;
  updateGuest: (id: string, guest: Partial<Guest>) => void;
  renameGuestTag: (from: string, to: string) => number;
  deleteGuest: (id: string) => void;
  addTable: (table: Omit<Table, 'id'>) => string;
  updateTable: (id: string, table: Partial<Table>) => void;
  updateTablePosition: (id: string, x: number, y: number) => void;
  replaceTables: (tables: Table[]) => void;
  deleteTable: (id: string) => void;
  assignGuestToTable: (guestId: string, tableId: string) => void;
  removeGuestFromTable: (guestId: string) => void;
  savePlan: () => void;
  loadPlan: () => void;
  clearAll: () => void;
  replacePlan: (plan: SeatingPlan) => void;
  lotteryLiveSync: boolean;
  setLotteryLiveSync: (enabled: boolean) => void;
  canUndo: boolean;
  undo: () => void;
  canRedo: boolean;
  redo: () => void;
  startUndoBatch: () => void;
  endUndoBatch: () => void;
  cloudSyncAvailable: boolean;
}

export const SeatingAppContext = createContext<SeatingAppContextType | undefined>(undefined);

export function useApp(): SeatingAppContextType {
  const context = useContext(SeatingAppContext);
  if (!context) throw new Error('useApp must be used within AppProvider');
  return context;
}
