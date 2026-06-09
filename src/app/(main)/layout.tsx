"use client";

import { useState, useEffect, useLayoutEffect, useRef, useCallback, ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Guest, Table, SeatingPlan } from '@/types';
import { storageCore } from '@/lib/storage-core';
import { normalizeSeatingPlan } from '@/lib/planImport';
import { SeatingAppContext, type SeatingAppContextType } from '@/contexts/seating-app';
import { Language, getTranslations, languageFlags, languageNames, SUPPORTED_LANGUAGES } from '@/lib/i18n';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import Modal from '@/components/Modal';
import GuestsIcon from '@/components/icons/GuestsIcon';
import TablesIcon from '@/components/icons/TablesIcon';
import SeatingIcon from '@/components/icons/SeatingIcon';
import LayoutIcon from '@/components/icons/LayoutIcon';
import PreviewIcon from '@/components/icons/PreviewIcon';
import BlogIcon from '@/components/icons/BlogIcon';
import LotteryLiveSyncIframe from '@/components/LotteryLiveSyncIframe';
import { LOTTERY_APP_NAME_ZH, SEATING_APP_NAME_ZH } from '@/lib/brand';
import {
  createLotteryLiveSyncScheduler,
  listenLotteryLiveSyncReady,
  postLotteryLiveSyncWithRetry,
  readLotteryLiveSyncEnabled,
  writeLotteryLiveSyncEnabled,
} from '@/lib/lotteryLiveSync';
import { BACKUP_ACK_EVENT, dismissBackupBanner, shouldShowBackupBanner } from '@/lib/backupRemind';

interface ModalState {
  isOpen: boolean;
  title: string;
  message: string;
  onConfirm?: () => void;
  type?: 'confirm' | 'alert';
  confirmText?: string;
  cancelText?: string;
}

export default function AppLayout({ children }: { children: ReactNode }) {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [language, setLanguage] = useState<Language>('zh');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showLangMenu, setShowLangMenu] = useState(false);
  const [lotteryLiveSync, setLotteryLiveSyncState] = useState(false);
  const [modalState, setModalState] = useState<ModalState>({
    isOpen: false,
    title: '',
    message: '',
    type: 'alert',
  });
  const pathname = usePathname();
  const guestsRef = useRef(guests);
  const tablesRef = useRef(tables);
  guestsRef.current = guests;
  tablesRef.current = tables;

  const liveSyncSchedulerRef = useRef<ReturnType<typeof createLotteryLiveSyncScheduler> | null>(null);
  if (liveSyncSchedulerRef.current === null) {
    liveSyncSchedulerRef.current = createLotteryLiveSyncScheduler(() => ({
      guests: guestsRef.current,
      tables: tablesRef.current,
    }));
  }

  const undoStackRef = useRef<{ guests: Guest[]; tables: Table[] }[]>([]);
  const redoStackRef = useRef<{ guests: Guest[]; tables: Table[] }[]>([]);
  const undoBatchDepthRef = useRef(0);
  const [undoDepth, setUndoDepth] = useState(0);
  const [redoDepth, setRedoDepth] = useState(0);
  const [showBackupBanner, setShowBackupBanner] = useState(false);
  const [cloudSyncAvailable, setCloudSyncAvailable] = useState(false);
  const langMenuButtonRef = useRef<HTMLButtonElement>(null);
  const langMenuPanelRef = useRef<HTMLDivElement>(null);
  const pendingConfirmRef = useRef<(() => void) | undefined>(undefined);
  const [langMenuPlacement, setLangMenuPlacement] = useState<{ top: number; right: number } | null>(null);
  const MAX_UNDO = 20;

  const clonePlan = () => ({
    guests: JSON.parse(JSON.stringify(guestsRef.current)) as Guest[],
    tables: JSON.parse(JSON.stringify(tablesRef.current)) as Table[],
  });

  const clearRedo = () => {
    redoStackRef.current = [];
    setRedoDepth(0);
  };

  const pushUndoSnapshot = () => {
    clearRedo();
    const snap = clonePlan();
    undoStackRef.current.push(snap);
    if (undoStackRef.current.length > MAX_UNDO) {
      undoStackRef.current.shift();
    }
    setUndoDepth(undoStackRef.current.length);
  };

  const maybeSnapshotForUndo = () => {
    if (undoBatchDepthRef.current > 0) return;
    pushUndoSnapshot();
  };

  const startUndoBatch = () => {
    if (undoBatchDepthRef.current === 0) {
      pushUndoSnapshot();
    }
    undoBatchDepthRef.current += 1;
  };

  const endUndoBatch = () => {
    undoBatchDepthRef.current = Math.max(0, undoBatchDepthRef.current - 1);
  };

  const undo = () => {
    const prev = undoStackRef.current.pop();
    if (!prev) return;
    const cur = clonePlan();
    redoStackRef.current.push(cur);
    if (redoStackRef.current.length > MAX_UNDO) {
      redoStackRef.current.shift();
    }
    setUndoDepth(undoStackRef.current.length);
    setRedoDepth(redoStackRef.current.length);
    setGuests(prev.guests);
    setTables(prev.tables);
  };

  const redo = () => {
    const next = redoStackRef.current.pop();
    if (!next) return;
    const cur = clonePlan();
    undoStackRef.current.push(cur);
    if (undoStackRef.current.length > MAX_UNDO) {
      undoStackRef.current.shift();
    }
    setUndoDepth(undoStackRef.current.length);
    setRedoDepth(redoStackRef.current.length);
    setGuests(next.guests);
    setTables(next.tables);
  };

  const undoHotkeyRef = useRef(undo);
  const redoHotkeyRef = useRef(redo);

  // Automatic language detection
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const supportedLangs = SUPPORTED_LANGUAGES;
    
    // 1. Check URL parameter first (?lang=hr)
    const urlParams = new URLSearchParams(window.location.search);
    const urlLang = urlParams.get('lang') as Language;
    
    if (urlLang && supportedLangs.includes(urlLang)) {
      setLanguage(urlLang);
      localStorage.setItem('preferredLanguage', urlLang);
      return;
    }

    // 2. Check localStorage
    const savedLang = localStorage.getItem('preferredLanguage') as Language;
    if (savedLang && supportedLangs.includes(savedLang)) {
      setLanguage(savedLang);
      return;
    }

    // 3. Detect from browser language
    const browserLang = navigator.language.split('-')[0] as Language;
    if (supportedLangs.includes(browserLang)) {
      setLanguage(browserLang);
      localStorage.setItem('preferredLanguage', browserLang);
    }
  }, []);

  const t = getTranslations(language);

  const showModal = (config: Omit<ModalState, 'isOpen'>) => {
    setModalState({ ...config, isOpen: true });
  };

  const showConfirm = useCallback(
    (
      title: string,
      message: string,
      onConfirm: () => void,
      buttonLabels?: { confirmText?: string; cancelText?: string },
    ) => {
      pendingConfirmRef.current = onConfirm;
      setModalState({
        isOpen: true,
        title,
        message,
        type: 'confirm',
        confirmText: buttonLabels?.confirmText ?? t.common.confirm,
        cancelText: buttonLabels?.cancelText ?? t.guests.cancel,
      });
    },
    [t.common.confirm, t.guests.cancel],
  );

  const showAlert = useCallback((title: string, message: string) => {
    setModalState({
      isOpen: true,
      title,
      message,
      type: 'alert',
      confirmText: 'OK',
    });
  }, []);

  const refreshCloudSyncAvailability = useCallback(() => {
    fetch('/api/auth/session', { credentials: 'include' })
      .then((r) => r.json())
      .then((d: { configured?: boolean; databaseReady?: boolean; jwtReady?: boolean }) => {
        const jwtOk = d.jwtReady !== false;
        setCloudSyncAvailable(
          d.configured === true && d.databaseReady === true && jwtOk,
        );
      })
      .catch(() => {
        setCloudSyncAvailable(false);
      });
  }, []);

  const closeModal = () => {
    pendingConfirmRef.current = undefined;
    setModalState(prev => ({ ...prev, isOpen: false }));
  };

  const handleModalConfirm = () => {
    const fn = pendingConfirmRef.current;
    pendingConfirmRef.current = undefined;
    fn?.();
  };

  useEffect(() => {
    undoStackRef.current = [];
    redoStackRef.current = [];
    setUndoDepth(0);
    setRedoDepth(0);
    try {
      const raw = storageCore.loadPlan();
      const plan = raw ? normalizeSeatingPlan(raw) : null;
      if (plan) {
        setGuests(plan.guests);
        setTables(plan.tables);
      } else if (raw && Array.isArray(raw.guests) && Array.isArray(raw.tables)) {
        setGuests(raw.guests);
        setTables(raw.tables);
      }
    } catch (error) {
      console.error('Failed to hydrate seating plan:', error);
    } finally {
      setLoaded(true);
    }
  }, []);

  useEffect(() => {
    if (!loaded || typeof window === 'undefined') return;
    const syncBanner = () => {
      setShowBackupBanner(shouldShowBackupBanner(guests.length));
    };
    syncBanner();
    window.addEventListener(BACKUP_ACK_EVENT, syncBanner);
    return () => window.removeEventListener(BACKUP_ACK_EVENT, syncBanner);
  }, [loaded, guests.length]);

  useEffect(() => {
    if (typeof window === 'undefined' || !loaded) return;
    setLotteryLiveSyncState(readLotteryLiveSyncEnabled());
  }, [loaded]);

  useEffect(() => {
    if (typeof window === 'undefined' || !loaded) return;
    refreshCloudSyncAvailability();
  }, [loaded, refreshCloudSyncAvailability]);

  useEffect(() => {
    if (!loaded || typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        refreshCloudSyncAvailability();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [loaded, refreshCloudSyncAvailability]);

  useEffect(() => {
    if (!loaded || !lotteryLiveSync) {
      liveSyncSchedulerRef.current?.cancel();
      return;
    }
    liveSyncSchedulerRef.current?.schedule();
  }, [guests, tables, loaded, lotteryLiveSync]);

  useEffect(() => {
    return () => {
      liveSyncSchedulerRef.current?.cancel();
    };
  }, []);

  const setLotteryLiveSync = (enabled: boolean) => {
    if (typeof window === 'undefined') return;
    writeLotteryLiveSyncEnabled(enabled);
    setLotteryLiveSyncState(enabled);
  };

  const flushLotteryLiveSyncFromRefs = useCallback(() => {
    postLotteryLiveSyncWithRetry(guestsRef.current, tablesRef.current);
  }, []);

  useEffect(() => {
    if (!lotteryLiveSync) return;
    const flush = () => postLotteryLiveSyncWithRetry(guestsRef.current, tablesRef.current);
    return listenLotteryLiveSyncReady(flush);
  }, [lotteryLiveSync]);

  // Update HTML lang attribute and localStorage when language changes
  useEffect(() => {
    if (typeof window === 'undefined') return;
    
    document.documentElement.lang = language;
    localStorage.setItem('preferredLanguage', language);
    
    // Update URL parameter without page reload
    const url = new URL(window.location.href);
    url.searchParams.set('lang', language);
    window.history.replaceState({}, '', url.toString());
  }, [language]);

  /** Debounce disk writes — tight loops (drag, batch edits) were blocking the main thread. */
  useEffect(() => {
    if (!loaded || typeof window === 'undefined') return;
    const id = window.setTimeout(() => {
      const plan: SeatingPlan = {
        guests,
        tables,
        lastUpdated: new Date().toISOString(),
      };
      storageCore.savePlan(plan);
    }, 200);
    return () => window.clearTimeout(id);
  }, [guests, tables, loaded]);

  const addGuest = (guest: Omit<Guest, 'id'>) => {
    maybeSnapshotForUndo();
    const newGuest: Guest = {
      ...guest,
      id: crypto.randomUUID(),
    };
    setGuests(prev => [...prev, newGuest]);
  };

  const updateGuest = (id: string, updates: Partial<Guest>) => {
    maybeSnapshotForUndo();
    setGuests(prev => prev.map(g => g.id === id ? { ...g, ...updates } : g));
  };

  const renameGuestTag = (from: string, to: string): number => {
    const trimmedFrom = from.trim();
    const trimmedTo = to.trim();
    if (!trimmedFrom || !trimmedTo || trimmedFrom === trimmedTo) return 0;

    let affected = 0;
    maybeSnapshotForUndo();
    setGuests((prev) =>
      prev.map((g) => {
        if (!g.tags.includes(trimmedFrom)) return g;
        affected++;
        const seen = new Set<string>();
        const tags = g.tags
          .map((tag) => (tag === trimmedFrom ? trimmedTo : tag))
          .filter((tag) => {
            if (seen.has(tag)) return false;
            seen.add(tag);
            return true;
          });
        return { ...g, tags };
      }),
    );
    return affected;
  };

  const deleteGuest = (id: string) => {
    maybeSnapshotForUndo();
    setGuests(prev => prev.filter(g => g.id !== id));
    setTables(prev => prev.map(t => ({
      ...t,
      guests: t.guests.filter(gId => gId !== id)
    })));
  };

  const addTable = (table: Omit<Table, 'id'>): string => {
    maybeSnapshotForUndo();
    const newTable: Table = {
      ...table,
      id: crypto.randomUUID(),
    };
    setTables(prev => [...prev, newTable]);
    return newTable.id;
  };

  const updateTable = (id: string, updates: Partial<Table>) => {
    maybeSnapshotForUndo();
    setTables(prev => prev.map(t => t.id === id ? { ...t, ...updates } : t));
  };

  const updateTablePosition = (id: string, x: number, y: number) => {
    maybeSnapshotForUndo();
    setTables(prev => prev.map(t =>
      t.id === id ? { ...t, position: { x, y } } : t
    ));
  };

  const replaceTables = (nextTables: Table[]) => {
    maybeSnapshotForUndo();
    setTables(nextTables);
  };

  const deleteTable = (id: string) => {
    maybeSnapshotForUndo();
    const table = tables.find(t => t.id === id);
    if (table) {
      setGuests(prev => prev.map(g =>
        table.guests.includes(g.id) ? { ...g, tableId: undefined } : g
      ));
    }
    setTables(prev => prev.filter(t => t.id !== id));
  };

  const assignGuestToTable = (guestId: string, tableId: string) => {
    maybeSnapshotForUndo();
    // Remove from old table if exists
    setTables(prev => prev.map(t => ({
      ...t,
      guests: t.guests.filter(gId => gId !== guestId)
    })));

    // Add to new table
    setTables(prev => prev.map(t =>
      t.id === tableId ? { ...t, guests: [...t.guests, guestId] } : t
    ));

    // Update guest
    setGuests(prev => prev.map(g =>
      g.id === guestId ? { ...g, tableId } : g
    ));
  };

  const removeGuestFromTable = (guestId: string) => {
    maybeSnapshotForUndo();
    setTables(prev => prev.map(t => ({
      ...t,
      guests: t.guests.filter(gId => gId !== guestId)
    })));
    setGuests(prev => prev.map(g =>
      g.id === guestId ? { ...g, tableId: undefined } : g
    ));
  };

  const savePlan = () => {
    const plan: SeatingPlan = {
      guests,
      tables,
      lastUpdated: new Date().toISOString(),
    };
    storageCore.savePlan(plan);
  };

  const loadPlan = () => {
    const plan = storageCore.loadPlan();
    if (plan) {
      setGuests(plan.guests);
      setTables(plan.tables);
    }
  };

  const clearAll = () => {
    showConfirm(
      t.preview.deleteAll,
      t.preview.deleteConfirm,
      () => {
        maybeSnapshotForUndo();
        setGuests([]);
        setTables([]);
        storageCore.clearPlan();
      }
    );
  };

  const replacePlan = useCallback((plan: SeatingPlan) => {
    startUndoBatch();
    setGuests(plan.guests);
    setTables(plan.tables);
    endUndoBatch();
    // startUndoBatch/endUndoBatch use refs; stable across renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!loaded || typeof window === 'undefined') return;
    if (guests.length === 0 && tables.length === 0) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [loaded, guests.length, tables.length]);

  useEffect(() => {
    if (!loaded || typeof window === 'undefined') return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const target = e.target;
      if (
        target instanceof HTMLElement &&
        target.closest('input, textarea, select, [contenteditable="true"]')
      ) {
        return;
      }
      const k = e.key.toLowerCase();
      if (k === 'z') {
        if (e.shiftKey) {
          if (redoStackRef.current.length > 0) {
            e.preventDefault();
            redoHotkeyRef.current();
          }
        } else if (undoStackRef.current.length > 0) {
          e.preventDefault();
          undoHotkeyRef.current();
        }
      } else if (k === 'y' && redoStackRef.current.length > 0) {
        e.preventDefault();
        redoHotkeyRef.current();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [loaded]);

  const measureLangMenu = useCallback(() => {
    const btn = langMenuButtonRef.current;
    if (!btn || typeof window === 'undefined') return;
    const rect = btn.getBoundingClientRect();
    setLangMenuPlacement({
      top: rect.bottom + 6,
      right: Math.max(8, window.innerWidth - rect.right),
    });
  }, []);

  useLayoutEffect(() => {
    if (!showLangMenu) {
      setLangMenuPlacement(null);
      return;
    }
    measureLangMenu();
    const sync = () => measureLangMenu();
    window.addEventListener('resize', sync);
    window.addEventListener('scroll', sync, true);
    return () => {
      window.removeEventListener('resize', sync);
      window.removeEventListener('scroll', sync, true);
    };
  }, [showLangMenu, measureLangMenu]);

  useEffect(() => {
    if (!showLangMenu) return;
    const onDown = (e: PointerEvent) => {
      const n = e.target as Node;
      if (langMenuButtonRef.current?.contains(n)) return;
      if (langMenuPanelRef.current?.contains(n)) return;
      setShowLangMenu(false);
    };
    document.addEventListener('pointerdown', onDown, true);
    return () => document.removeEventListener('pointerdown', onDown, true);
  }, [showLangMenu]);

  useEffect(() => {
    if (!showLangMenu) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setShowLangMenu(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [showLangMenu]);

  undoHotkeyRef.current = undo;
  redoHotkeyRef.current = redo;

  const contextValue: SeatingAppContextType = {
    guests,
    tables,
    language,
    setLanguage,
    t,
    showModal,
    showConfirm,
    showAlert,
    addGuest,
    updateGuest,
    renameGuestTag,
    deleteGuest,
    addTable,
    updateTable,
    updateTablePosition,
    replaceTables,
    deleteTable,
    assignGuestToTable,
    removeGuestFromTable,
    savePlan,
    loadPlan,
    clearAll,
    replacePlan,
    lotteryLiveSync,
    setLotteryLiveSync,
    canUndo: undoDepth > 0,
    undo,
    canRedo: redoDepth > 0,
    redo,
    startUndoBatch,
    endUndoBatch,
    cloudSyncAvailable,
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-12 w-12 text-rose-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <div className="text-xl text-gray-800 font-semibold">{t.common.loading}</div>
        </div>
      </div>
    );
  }

  return (
    <SeatingAppContext.Provider value={contextValue}>
      <LotteryLiveSyncIframe enabled={lotteryLiveSync} onFrameReady={flushLotteryLiveSyncFromRefs} />
      <div className="relative min-h-screen wedding-festive-shell">
        <a
          href="#main-content"
          onClick={() => {
            window.requestAnimationFrame(() => {
              document.getElementById('main-content')?.focus({ preventScroll: false });
            });
          }}
          className="absolute left-[-9999px] top-0 z-[200] whitespace-nowrap rounded-lg bg-rose-900 px-4 py-2 text-sm font-semibold text-amber-50 shadow-lg outline-none ring-amber-200/80 focus:left-4 focus:top-4 focus:ring-2"
        >
          {t.common.skipToContent}
        </a>
        {/* Navigation */}
        <nav
          className="sticky top-0 z-50 overflow-visible border-b border-rose-200/70 bg-white/90 shadow-[0_2px_14px_-6px_rgba(225,29,72,0.18)] backdrop-blur-md"
          aria-label={t.nav.ariaMainNav}
        >
          <div className="container mx-auto overflow-visible px-4">
            <div className="flex h-16 min-w-0 items-center justify-between gap-2 overflow-visible">
              <Link
                href="/"
                className="max-w-[min(46vw,11rem)] shrink-0 truncate text-base font-bold text-rose-900 sm:max-w-none md:text-lg"
                title={SEATING_APP_NAME_ZH}
              >
                <span className="whitespace-nowrap">💒 {t.nav.siteBrand}</span>
              </Link>

              {/* 桌面端：核心三步（宾客/餐桌/排座）固定可见，避免被横向滚动挤出视口 */}
              <div className="hidden min-w-0 flex-1 items-center justify-end gap-2 md:flex">
                <div className="flex shrink-0 items-center gap-0.5 rounded-xl border border-rose-200/80 bg-gradient-to-r from-rose-50/90 to-amber-50/70 px-0.5 py-0.5 shadow-sm">
                  <Link
                    href="/guests"
                    aria-label={t.nav.guests}
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 transition-colors sm:gap-1.5 sm:px-2.5 ${
                      pathname === '/guests'
                        ? 'bg-white text-rose-900 shadow-sm ring-1 ring-rose-200/60'
                        : 'text-gray-700 hover:bg-white/80'
                    }`}
                  >
                    <GuestsIcon className="h-5 w-5 shrink-0" />
                    <span className="hidden lg:inline">{t.nav.guests}</span>
                  </Link>
                  <Link
                    href="/tables"
                    aria-label={t.nav.tables}
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 transition-colors sm:gap-1.5 sm:px-2.5 ${
                      pathname === '/tables'
                        ? 'bg-white text-rose-900 shadow-sm ring-1 ring-rose-200/60'
                        : 'text-gray-700 hover:bg-white/80'
                    }`}
                  >
                    <TablesIcon className="h-5 w-5 shrink-0" />
                    <span className="hidden lg:inline">{t.nav.tables}</span>
                  </Link>
                  <Link
                    href="/seating"
                    aria-label={t.nav.seating}
                    className={`flex shrink-0 items-center gap-1 rounded-lg px-2 py-2 transition-colors sm:gap-1.5 sm:px-2.5 ${
                      pathname === '/seating'
                        ? 'bg-white text-rose-900 shadow-sm ring-1 ring-rose-200/60'
                        : 'text-gray-700 hover:bg-white/80'
                    }`}
                  >
                    <SeatingIcon className="h-5 w-5 shrink-0" />
                    <span className="hidden lg:inline">{t.nav.seating}</span>
                  </Link>
                </div>

                <div className="-mx-1 flex min-w-0 max-w-full min-h-0 flex-1 flex-nowrap items-center justify-end gap-x-0.5 overflow-x-auto overflow-y-visible px-1 [scrollbar-width:thin]">
                  <Link
                    href="/layout"
                    aria-label={t.nav.layout}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 transition-colors sm:gap-2 sm:px-3 lg:px-4 ${
                      pathname === '/layout'
                        ? 'bg-rose-100 text-rose-900 font-semibold ring-1 ring-rose-200/50'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <LayoutIcon className="h-5 w-5" />
                    <span className="hidden xl:inline">{t.nav.layout}</span>
                  </Link>
                  <Link
                    href="/preview"
                    aria-label={t.nav.preview}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 transition-colors sm:gap-2 sm:px-3 lg:px-4 ${
                      pathname === '/preview'
                        ? 'bg-rose-100 text-rose-900 font-semibold ring-1 ring-rose-200/50'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <PreviewIcon className="h-5 w-5" />
                    <span className="hidden xl:inline">{t.nav.preview}</span>
                  </Link>
                  {cloudSyncAvailable && (
                    <Link
                      href="/sync"
                      aria-label={t.nav.sync}
                      className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 transition-colors sm:gap-2 sm:px-3 lg:px-4 ${
                        pathname === '/sync'
                          ? 'bg-rose-100 text-rose-900 font-semibold ring-1 ring-rose-200/50'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-lg leading-none" aria-hidden>
                        ☁️
                      </span>
                      <span className="hidden xl:inline">{t.nav.sync}</span>
                    </Link>
                  )}
                  <Link
                    href="/preview?lottery=1"
                    aria-label={t.nav.previewLottery}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 text-sm whitespace-nowrap transition-colors sm:gap-2 sm:px-3 ${
                      pathname === '/preview'
                        ? 'bg-rose-100 text-rose-900 font-semibold ring-1 ring-rose-200/50'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                    title={LOTTERY_APP_NAME_ZH}
                  >
                    <span aria-hidden>🎯</span>
                    <span className="hidden xl:inline">{t.nav.previewLottery}</span>
                  </Link>
                  <Link
                    href="/blog"
                    aria-label={t.nav.blog}
                    className={`flex shrink-0 items-center gap-1.5 rounded-lg px-2 py-2 transition-colors sm:gap-2 sm:px-3 lg:px-4 ${
                      pathname?.startsWith('/blog')
                        ? 'bg-rose-100 text-rose-900 font-semibold ring-1 ring-rose-200/50'
                        : 'text-gray-700 hover:bg-gray-100'
                    }`}
                  >
                    <BlogIcon className="h-5 w-5" />
                    <span className="hidden xl:inline">{t.nav.blog}</span>
                  </Link>
                </div>

                <div className="relative flex shrink-0 items-center gap-1 border-l border-gray-200 pl-2 sm:gap-2 sm:pl-3">
                  <button
                    type="button"
                    onClick={undo}
                    disabled={undoDepth === 0}
                    className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-800 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title={t.nav.undoTooltip}
                    aria-label={t.nav.undo}
                    aria-keyshortcuts="Control+z Meta+z"
                  >
                    <span aria-hidden>↩</span>
                    <span className="hidden lg:inline">{t.nav.undo}</span>
                  </button>
                  <button
                    type="button"
                    onClick={redo}
                    disabled={redoDepth === 0}
                    className="flex cursor-pointer items-center gap-1 rounded-lg border border-gray-200 bg-white px-2 py-2 text-sm text-gray-800 transition-colors hover:border-rose-300 hover:bg-rose-50 disabled:cursor-not-allowed disabled:opacity-40"
                    title={t.nav.redoTooltip}
                    aria-label={t.nav.redo}
                    aria-keyshortcuts="Control+Shift+z Meta+Shift+z Control+y Meta+y"
                  >
                    <span aria-hidden>↪</span>
                    <span className="hidden lg:inline">{t.nav.redo}</span>
                  </button>
                  <button
                    ref={langMenuButtonRef}
                    type="button"
                    aria-expanded={showLangMenu}
                    aria-haspopup="listbox"
                    onClick={() => setShowLangMenu((v) => !v)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-lg border border-rose-200/90 bg-white px-2 py-2 transition-colors hover:border-amber-400/90 hover:bg-amber-50/50 sm:gap-2 sm:px-3"
                  >
                    <span className="text-lg">{languageFlags[language]}</span>
                    <svg className="h-4 w-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {showLangMenu &&
                    langMenuPlacement &&
                    typeof document !== 'undefined' &&
                    createPortal(
                      <div
                        ref={langMenuPanelRef}
                        role="listbox"
                        className="fixed z-[180] w-48 overflow-y-auto overscroll-contain rounded-lg border-2 border-gray-200 bg-white py-1 shadow-lg"
                        style={{
                          top: langMenuPlacement.top,
                          right: langMenuPlacement.right,
                          maxHeight: Math.min(
                            352,
                            Math.max(80, window.innerHeight - langMenuPlacement.top - 12),
                          ),
                        }}
                      >
                        {SUPPORTED_LANGUAGES.map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            role="option"
                            aria-selected={language === lang}
                            onClick={() => {
                              setLanguage(lang);
                              setShowLangMenu(false);
                            }}
                            className={`flex w-full cursor-pointer items-center gap-3 px-4 py-2 text-left transition-colors first:rounded-t-lg last:rounded-b-lg hover:bg-rose-50 ${
                              language === lang ? 'bg-rose-100 font-semibold text-rose-900' : ''
                            }`}
                          >
                            <span className="text-lg">{languageFlags[lang]}</span>
                            <span className="text-sm text-gray-700">{languageNames[lang]}</span>
                          </button>
                        ))}
                      </div>,
                      document.body,
                    )}
                </div>
              </div>

              {/* Mobile Menu Button */}
              <button
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-gray-700 hover:bg-gray-100 rounded-lg"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {mobileMenuOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  )}
                </svg>
              </button>
            </div>

            {/* Mobile Menu */}
            {mobileMenuOpen && (
              <div className="md:hidden border-t py-4">
                <div className="flex flex-col space-y-2">
                  <Link
                    href="/guests"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      pathname === '/guests' ? 'bg-rose-100 text-rose-900 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <GuestsIcon className="w-5 h-5" />
                    <span>{t.nav.guests}</span>
                  </Link>
                  <Link
                    href="/tables"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      pathname === '/tables' ? 'bg-rose-100 text-rose-900 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <TablesIcon className="w-5 h-5" />
                    <span>{t.nav.tables}</span>
                  </Link>
                  <Link
                    href="/seating"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      pathname === '/seating' ? 'bg-rose-100 text-rose-900 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <SeatingIcon className="w-5 h-5" />
                    <span>{t.nav.seating}</span>
                  </Link>
                  <Link
                    href="/layout"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      pathname === '/layout' ? 'bg-rose-100 text-rose-900 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <LayoutIcon className="w-5 h-5" />
                    <span>{t.nav.layout}</span>
                  </Link>
                  <Link
                    href="/preview"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      pathname === '/preview' ? 'bg-rose-100 text-rose-900 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <PreviewIcon className="w-5 h-5" />
                    <span>{t.nav.preview}</span>
                  </Link>
                  {cloudSyncAvailable && (
                    <Link
                      href="/sync"
                      onClick={() => setMobileMenuOpen(false)}
                      className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                        pathname === '/sync' ? 'bg-rose-100 text-rose-900 font-semibold' : 'text-gray-700'
                      }`}
                    >
                      <span className="text-lg" aria-hidden>
                        ☁️
                      </span>
                      <span>{t.nav.sync}</span>
                    </Link>
                  )}
                  <Link
                    href="/preview?lottery=1"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      pathname === '/preview' ? 'bg-rose-100 text-rose-900 font-semibold' : 'text-gray-700'
                    }`}
                    title={LOTTERY_APP_NAME_ZH}
                  >
                    <span className="text-lg" aria-hidden>🎯</span>
                    <span className="break-words">{t.nav.previewLottery}</span>
                  </Link>
                  <Link
                    href="/blog"
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-lg ${
                      pathname?.startsWith('/blog') ? 'bg-rose-100 text-rose-900 font-semibold' : 'text-gray-700'
                    }`}
                  >
                    <BlogIcon className="w-5 h-5" />
                    <span>{t.nav.blog}</span>
                  </Link>

                  <button
                    type="button"
                    onClick={() => {
                      undo();
                      setMobileMenuOpen(false);
                    }}
                    disabled={undoDepth === 0}
                    title={t.nav.undoTooltip}
                    aria-label={t.nav.undo}
                    aria-keyshortcuts="Control+z Meta+z"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 disabled:opacity-40"
                  >
                    <span className="text-lg" aria-hidden>↩</span>
                    <span>{t.nav.undo}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      redo();
                      setMobileMenuOpen(false);
                    }}
                    disabled={redoDepth === 0}
                    title={t.nav.redoTooltip}
                    aria-label={t.nav.redo}
                    aria-keyshortcuts="Control+Shift+z Meta+Shift+z Control+y Meta+y"
                    className="flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 disabled:opacity-40"
                  >
                    <span className="text-lg" aria-hidden>↪</span>
                    <span>{t.nav.redo}</span>
                  </button>

                  <div className="px-4 pt-4 border-t">
                    <div className="text-xs font-medium text-gray-600 mb-2">{t.common.languageLabel}</div>
                    <div className="grid grid-cols-2 gap-2">
                      {SUPPORTED_LANGUAGES.map((lang) => (
                        <button
                          key={lang}
                          onClick={() => setLanguage(lang)}
                          className={`flex items-center gap-2 px-3 py-2 rounded-lg cursor-pointer justify-center ${
                            language === lang ? 'bg-rose-600 text-white font-semibold' : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          <span className="text-base">{languageFlags[lang]}</span>
                          <span className="text-sm">{lang.toUpperCase()}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </nav>

        {showBackupBanner && (
          <div className="border-b border-amber-200/80 bg-amber-50">
            <div className="container mx-auto flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
              <p className="text-sm leading-snug text-amber-950">{t.common.backupBannerText}</p>
              <div className="flex shrink-0 flex-wrap items-center gap-2 sm:gap-3">
                <Link
                  href="/preview"
                  className="text-sm font-semibold text-rose-800 underline decoration-rose-300 underline-offset-2 hover:text-rose-950"
                >
                  {t.common.backupBannerCta}
                </Link>
                <button
                  type="button"
                  onClick={() => dismissBackupBanner()}
                  className="rounded-lg border border-amber-300/80 bg-white px-3 py-1.5 text-sm font-medium text-amber-900 transition-colors hover:bg-amber-100/80"
                >
                  {t.common.backupBannerDismiss}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Content */}
        <main id="main-content" tabIndex={-1} className="container mx-auto px-4 py-8 outline-none">
          {children}
        </main>

        {/* Modal */}
        <Modal
          isOpen={modalState.isOpen}
          onClose={closeModal}
          onConfirm={
            modalState.type === 'confirm'
              ? handleModalConfirm
              : modalState.onConfirm
          }
          title={modalState.title}
          message={modalState.message}
          type={modalState.type}
          confirmText={modalState.confirmText}
          cancelText={modalState.cancelText}
        />
      </div>
    </SeatingAppContext.Provider>
  );
}
