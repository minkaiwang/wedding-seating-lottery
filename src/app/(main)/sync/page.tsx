"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useApp } from '@/contexts/seating-app';
import type { Language } from '@/lib/i18n';
import { readStoredPlanKey, writeStoredPlanKey } from '@/lib/cloudPlanKeyStorage';
import { DEFAULT_PLAN_KEY, isValidPlanKey } from '@/lib/planKey';
import { normalizeSeatingPlan } from '@/lib/planImport';
import { storageCore } from '@/lib/storage-core';
import type { SeatingPlan } from '@/types';

const LOCALE_BY_LANG: Record<Language, string> = {
  zh: 'zh-CN',
  en: 'en-US',
  hr: 'hr-HR',
  es: 'es-ES',
  de: 'de-DE',
  fr: 'fr-FR',
};

function formatDateTime(iso: string, lang: Language): string {
  try {
    return new Date(iso).toLocaleString(LOCALE_BY_LANG[lang] || 'en-US', {
      dateStyle: 'medium',
      timeStyle: 'short',
    });
  } catch {
    return iso;
  }
}

function compareTimestamps(cloud: string | null, local: string | null): 'cloud' | 'local' | 'tie' | 'none' {
  if (!cloud || !local) return 'none';
  const c = new Date(cloud).getTime();
  const l = new Date(local).getTime();
  if (Number.isNaN(c) || Number.isNaN(l)) return 'none';
  if (Math.abs(c - l) < 3000) return 'tie';
  return c > l ? 'cloud' : 'local';
}

/** True when cloud should be offered after sign-in (newer copy, or cloud exists but this browser never saved). */
function shouldOfferPullAfterLogin(cloud: string | null, local: string | null): boolean {
  if (!cloud) return false;
  if (!local) return true;
  return compareTimestamps(cloud, local) === 'cloud';
}

type SessionState =
  | { status: 'loading' }
  | { status: 'unconfigured' }
  | { status: 'db_error' }
  | { status: 'jwt_error' }
  | { status: 'guest' }
  | { status: 'user'; username: string };

export default function SyncPage() {
  const { guests, tables, replacePlan, language, t, showConfirm, showAlert } = useApp();
  const tRef = useRef(t);
  tRef.current = t;
  const tSyncRef = useRef(t.sync);
  tSyncRef.current = t.sync;
  const [session, setSession] = useState<SessionState>({ status: 'loading' });
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [cloudUpdatedAt, setCloudUpdatedAt] = useState<string | null | undefined>(undefined);
  const pendingLoginCloudOfferRef = useRef(false);
  const [planKey, setPlanKey] = useState(DEFAULT_PLAN_KEY);
  const [planKeyDraft, setPlanKeyDraft] = useState(DEFAULT_PLAN_KEY);
  const [planKeyHydrated, setPlanKeyHydrated] = useState(false);

  const localLastUpdated = useMemo(
    () => storageCore.loadPlan()?.lastUpdated ?? null,
    // Re-read after edits; parent persists to localStorage in a layout effect after commit.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally tied to plan state
    [guests, tables],
  );

  const fetchPlanMeta = useCallback(async () => {
    try {
      const q = `?planKey=${encodeURIComponent(planKey)}`;
      const r = await fetch(`/api/plan/meta${q}`, { credentials: 'include' });
      if (!r.ok) {
        setCloudUpdatedAt(null);
        return;
      }
      const data = (await r.json()) as { updatedAt?: string | null };
      setCloudUpdatedAt(data.updatedAt ?? null);
    } catch {
      setCloudUpdatedAt(null);
    }
  }, [planKey]);

  useEffect(() => {
    const k = readStoredPlanKey();
    setPlanKey(k);
    setPlanKeyDraft(k);
    setPlanKeyHydrated(true);
  }, []);

  const refreshSession = useCallback(async () => {
    setNotice(null);
    try {
      const r = await fetch('/api/auth/session', { credentials: 'include' });
      const data = (await r.json()) as {
        ok?: boolean;
        configured?: boolean;
        databaseReady?: boolean;
        jwtReady?: boolean;
        username?: string;
      };
      if (!data.configured) {
        setSession({ status: 'unconfigured' });
        return;
      }
      if (!data.databaseReady) {
        setSession({ status: 'db_error' });
        return;
      }
      if (data.jwtReady === false) {
        setSession({ status: 'jwt_error' });
        return;
      }
      if (data.ok && data.username) {
        setSession({ status: 'user', username: data.username });
        return;
      }
      setSession({ status: 'guest' });
    } catch {
      setSession({ status: 'unconfigured' });
    }
  }, []);

  useEffect(() => {
    void refreshSession();
  }, [refreshSession]);

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        void refreshSession();
      }
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => document.removeEventListener('visibilitychange', onVisibility);
  }, [refreshSession]);

  useEffect(() => {
    if (session.status === 'user' && planKeyHydrated) {
      void fetchPlanMeta();
    }
    else if (session.status !== 'user') {
      setCloudUpdatedAt(undefined);
      pendingLoginCloudOfferRef.current = false;
    }
  }, [session.status, planKeyHydrated, planKey, fetchPlanMeta]);

  const performPull = useCallback(async () => {
    const syncTr = tSyncRef.current;
    setBusy(true);
    setNotice(null);
    try {
      const q = `?planKey=${encodeURIComponent(planKey)}`;
      const r = await fetch(`/api/plan${q}`, { credentials: 'include' });
      const data = (await r.json()) as { plan?: unknown; error?: string };
      if (!r.ok) {
        showAlert(syncTr.pullFailedTitle, data.error || syncTr.pullFailed);
        return;
      }
      const plan = normalizeSeatingPlan(data.plan ?? null);
      if (!plan) {
        showAlert(syncTr.pullFailedTitle, syncTr.pullEmpty);
        return;
      }
      replacePlan(plan);
      setNotice(syncTr.pullOk);
      void fetchPlanMeta();
    } catch {
      showAlert(syncTr.pullFailedTitle, syncTr.networkError);
    } finally {
      setBusy(false);
    }
  }, [fetchPlanMeta, planKey, replacePlan, showAlert]);

  useEffect(() => {
    if (session.status !== 'user' || !pendingLoginCloudOfferRef.current) return;
    if (!planKeyHydrated) return;
    if (cloudUpdatedAt === undefined) return;

    pendingLoginCloudOfferRef.current = false;

    const localTs = storageCore.loadPlan()?.lastUpdated ?? null;
    if (!shouldOfferPullAfterLogin(
      typeof cloudUpdatedAt === 'string' ? cloudUpdatedAt : null,
      localTs,
    )) {
      return;
    }

    const syncTr = tSyncRef.current;
    showConfirm(
      syncTr.cloudNewerAfterLoginTitle,
      syncTr.cloudNewerAfterLoginBody,
      () => {
        void performPull();
      },
      {
        confirmText: syncTr.pullConfirmAction,
        cancelText: tRef.current.guests.cancel,
      },
    );
  }, [session.status, planKeyHydrated, cloudUpdatedAt, performPull, showConfirm]);

  const handleApplyPlanKey = () => {
    const trimmed = planKeyDraft.trim();
    if (!isValidPlanKey(trimmed)) {
      showAlert(t.sync.planKeyInvalidTitle, t.sync.planKeyInvalidBody);
      return;
    }
    if (!writeStoredPlanKey(trimmed)) {
      showAlert(t.sync.planKeyInvalidTitle, t.sync.planKeyInvalidBody);
      return;
    }
    setPlanKey(trimmed);
    setPlanKeyDraft(trimmed);
    setNotice(t.sync.planKeyApplied);
    if (session.status === 'user') {
      setCloudUpdatedAt(undefined);
      void fetchPlanMeta();
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setNotice(null);
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ username, password }),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string; code?: string };
      if (!r.ok) {
        if (r.status === 429) {
          setNotice(t.sync.loginTooManyAttempts);
          return;
        }
        if (r.status === 503 && data.code === 'JWT_NOT_CONFIGURED') {
          setNotice(t.sync.loginServerMisconfigured);
          return;
        }
        if (r.status === 503) {
          setNotice(data.error || t.sync.networkError);
          return;
        }
        setNotice(data.error || t.sync.loginFailed);
        return;
      }
      if (data.ok) {
        setPassword('');
        pendingLoginCloudOfferRef.current = true;
        await refreshSession();
        setNotice(t.sync.loginOk);
      }
    } catch {
      setNotice(t.sync.networkError);
    } finally {
      setBusy(false);
    }
  };

  const handleLogout = async () => {
    setBusy(true);
    try {
      await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
      await refreshSession();
      setNotice(t.sync.logoutOk);
    } catch {
      setNotice(t.sync.networkError);
    } finally {
      setBusy(false);
    }
  };

  const handlePush = async () => {
    if (session.status !== 'user') return;
    setBusy(true);
    setNotice(null);
    try {
      const plan: SeatingPlan = {
        guests,
        tables,
        lastUpdated: new Date().toISOString(),
      };
      const q = `?planKey=${encodeURIComponent(planKey)}`;
      const r = await fetch(`/api/plan${q}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(plan),
      });
      const data = (await r.json()) as { ok?: boolean; error?: string };
      if (!r.ok) {
        setNotice(data.error || t.sync.pushFailed);
        return;
      }
      setNotice(t.sync.pushOk);
      void fetchPlanMeta();
    } catch {
      setNotice(t.sync.networkError);
    } finally {
      setBusy(false);
    }
  };

  const handlePull = () => {
    if (session.status !== 'user') return;
    showConfirm(
      t.sync.pullConfirmTitle,
      t.sync.pullConfirmBody,
      () => {
        void performPull();
      },
      { confirmText: t.sync.pullConfirmAction, cancelText: t.guests.cancel },
    );
  };

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-6 md:mb-8">
        <h1 className="mb-2 text-2xl font-bold text-gray-900 md:text-3xl">{t.sync.title}</h1>
        <p className="text-sm leading-relaxed text-gray-700 md:text-base">{t.sync.subtitle}</p>
        <p className="mt-2 text-xs leading-relaxed text-gray-600 md:text-sm">{t.sync.securityHint}</p>
        <p className="mt-2 max-w-xl text-xs text-gray-600 leading-relaxed">{t.common.shortcutsHint}</p>
      </div>

      {session.status === 'loading' && (
        <p className="text-gray-600">{t.common.loading}</p>
      )}

      {session.status === 'unconfigured' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {t.sync.notConfigured}
        </div>
      )}

      {session.status === 'db_error' && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-950">
          {t.sync.databaseUnreachable}
        </div>
      )}

      {session.status === 'jwt_error' && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-950">
          {t.sync.jwtNotConfigured}
        </div>
      )}

      {(session.status === 'guest' || session.status === 'user') && (
        <div className="space-y-6">
          <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
            <label className="mb-2 block">
              <span className="mb-1 block text-sm font-medium text-gray-800">{t.sync.planKeyLabel}</span>
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                <input
                  type="text"
                  autoComplete="off"
                  spellCheck={false}
                  value={planKeyDraft}
                  onChange={(e) => setPlanKeyDraft(e.target.value)}
                  className="w-full flex-1 rounded-lg border border-gray-300 px-3 py-2 font-mono text-sm text-gray-900"
                />
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleApplyPlanKey}
                  className="rounded-lg border border-rose-600 px-4 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  {t.sync.planKeyApply}
                </button>
              </div>
            </label>
            <p className="mt-2 text-xs leading-relaxed text-gray-600">{t.sync.planKeyHint}</p>
          </div>

          {session.status === 'guest' && (
            <form onSubmit={handleLogin} className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <h2 className="mb-4 text-lg font-semibold text-gray-900">{t.sync.loginTitle}</h2>
              <label className="mb-3 block">
                <span className="mb-1 block text-sm font-medium text-gray-800">{t.sync.username}</span>
                <input
                  type="text"
                  autoComplete="username"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                />
              </label>
              <label className="mb-4 block">
                <span className="mb-1 block text-sm font-medium text-gray-800">{t.sync.password}</span>
                <input
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full rounded-lg border border-gray-300 px-3 py-2 text-gray-900"
                />
              </label>
              <button
                type="submit"
                disabled={busy}
                className="btn-wedding-primary w-full rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
              >
                {t.sync.login}
              </button>
            </form>
          )}

          {session.status === 'user' && (
            <div className="rounded-xl border border-gray-200 bg-white p-4 shadow-sm sm:p-6">
              <p className="mb-4 text-sm text-gray-800">
                {t.sync.loggedInAs.replace('{user}', session.username)}
              </p>

              <div className="mb-4 rounded-lg border border-gray-100 bg-gray-50 p-3 text-sm text-gray-800">
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-gray-900">{t.sync.statusTitle}</span>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void fetchPlanMeta()}
                    className="text-xs font-semibold text-rose-700 hover:underline disabled:opacity-50"
                  >
                    {t.sync.refreshStatus}
                  </button>
                </div>
                {cloudUpdatedAt === undefined && (
                  <p className="text-gray-600">{t.common.loading}</p>
                )}
                {cloudUpdatedAt === null && (
                  <p className="text-gray-700">{t.sync.cloudEmpty}</p>
                )}
                {typeof cloudUpdatedAt === 'string' && (
                  <>
                    <p className="mt-1">
                      {t.sync.cloudLastUpdated.replace('{date}', formatDateTime(cloudUpdatedAt, language))}
                    </p>
                    <p className="mt-1">
                      {localLastUpdated
                        ? t.sync.localLastSaved.replace('{date}', formatDateTime(localLastUpdated, language))
                        : t.sync.noLocalTimestamp}
                    </p>
                    {(() => {
                      const cmp = compareTimestamps(cloudUpdatedAt, localLastUpdated);
                      if (cmp === 'cloud') {
                        return <p className="mt-2 text-amber-900">{t.sync.cloudNewerHint}</p>;
                      }
                      if (cmp === 'local') {
                        return <p className="mt-2 text-sky-900">{t.sync.localNewerHint}</p>;
                      }
                      return null;
                    })()}
                  </>
                )}
              </div>

              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  type="button"
                  disabled={busy}
                  onClick={handlePush}
                  className="btn-wedding-primary flex-1 rounded-lg px-4 py-2 font-semibold disabled:opacity-50"
                >
                  {t.sync.push}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handlePull}
                  className="flex-1 rounded-lg border border-rose-600 px-4 py-2 font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                >
                  {t.sync.pull}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={handleLogout}
                  className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-800 hover:bg-gray-50 disabled:opacity-50"
                >
                  {t.sync.logout}
                </button>
              </div>
            </div>
          )}

          {notice && (
            <p className="text-sm text-gray-700" role="status">
              {notice}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
