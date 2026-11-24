import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  Account,
  AppSettings,
  Budget,
  Category,
  MemoNote,
  RecurringRule,
  Transaction,
} from '../types';
import {
  DEFAULT_ACCOUNTS,
  DEFAULT_BUDGETS,
  DEFAULT_CATEGORIES,
  DEFAULT_MEMOS,
  DEFAULT_RECURRING,
  DEFAULT_SETTINGS,
  DEFAULT_TRANSACTIONS,
} from '../data/seed';
import { supabase } from '../lib/supabase';

const STORAGE_KEY = 'many-money-state-v8';
const LEGACY_STORAGE_KEYS = ['many-money-state-v7'];

interface PersistedState {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  budgets: Budget[];
  memos: MemoNote[];
  recurring: RecurringRule[];
  settings: AppSettings;
}

function loadState(): PersistedState {
  try {
    for (const legacyKey of LEGACY_STORAGE_KEYS) {
      localStorage.removeItem(legacyKey);
    }
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return {
        transactions: DEFAULT_TRANSACTIONS,
        categories: DEFAULT_CATEGORIES,
        accounts: DEFAULT_ACCOUNTS,
        budgets: DEFAULT_BUDGETS,
        memos: DEFAULT_MEMOS,
        recurring: DEFAULT_RECURRING,
        settings: DEFAULT_SETTINGS,
      };
    }
    const parsed = JSON.parse(raw) as Partial<PersistedState>;
    return {
      transactions: parsed.transactions ?? DEFAULT_TRANSACTIONS,
      categories: parsed.categories ?? DEFAULT_CATEGORIES,
      accounts: parsed.accounts ?? DEFAULT_ACCOUNTS,
      budgets: parsed.budgets ?? DEFAULT_BUDGETS,
      memos: parsed.memos ?? DEFAULT_MEMOS,
      recurring: parsed.recurring ?? DEFAULT_RECURRING,
      settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
    };
  } catch {
    return {
      transactions: DEFAULT_TRANSACTIONS,
      categories: DEFAULT_CATEGORIES,
      accounts: DEFAULT_ACCOUNTS,
      budgets: DEFAULT_BUDGETS,
      memos: DEFAULT_MEMOS,
      recurring: DEFAULT_RECURRING,
      settings: DEFAULT_SETTINGS,
    };
  }
}

interface MoneyContextValue {
  transactions: Transaction[];
  categories: Category[];
  accounts: Account[];
  accountBalances: Record<string, number>;
  budgets: Budget[];
  memos: MemoNote[];
  recurring: RecurringRule[];
  settings: AppSettings;
  // Transaction CRUD
  addTransaction: (tx: Omit<Transaction, 'id'>) => void;
  updateTransaction: (id: string, patch: Partial<Transaction>) => void;
  deleteTransaction: (id: string) => void;
  toggleFavorite: (id: string) => void;
  // Category CRUD
  addCategory: (cat: Omit<Category, 'id'>) => void;
  deleteCategory: (id: string) => void;
  // Account CRUD
  addAccount: (acc: Omit<Account, 'id'>) => void;
  updateAccount: (id: string, patch: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  reorderAccount: (fromId: string, toId: string) => void;
  // Budget CRUD
  upsertBudget: (categoryId: string, amount: number) => void;
  // Memo CRUD
  addMemo: (memo: Omit<MemoNote, 'id'>) => void;
  updateMemo: (id: string, patch: Partial<MemoNote>) => void;
  deleteMemo: (id: string) => void;
  // Recurring CRUD
  addRecurring: (rule: Omit<RecurringRule, 'id'>) => void;
  toggleRecurring: (id: string) => void;
  deleteRecurring: (id: string) => void;
  // Settings & Backup
  updateSettings: (patch: Partial<AppSettings>) => void;
  exportBackupJSON: () => void;
  importBackupJSON: (jsonText: string) => boolean;
  resetAllData: (empty?: boolean) => void;
  // Cloud Sync (Supabase)
  cloudUser: { id: string; email?: string } | null;
  cloudSyncStatus: 'idle' | 'syncing' | 'synced' | 'error' | 'offline';
  signInWithEmail: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signUpWithEmail: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  signOutCloud: () => Promise<void>;
  syncNow: () => Promise<void>;
}

const MoneyContext = createContext<MoneyContextValue | null>(null);

export const MoneyProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<PersistedState>(loadState);
  const [cloudUser, setCloudUser] = useState<{ id: string; email?: string } | null>(null);
  const [cloudSyncStatus, setCloudSyncStatus] = useState<
    'idle' | 'syncing' | 'synced' | 'error' | 'offline'
  >(supabase ? 'idle' : 'offline');
  const skipNextRemotePushRef = useRef(false);

  const pushWorkspaceToCloud = useCallback(async (userId: string, nextState: PersistedState) => {
    if (!supabase) return;
    setCloudSyncStatus('syncing');
    const { error } = await supabase.from('many_money_workspaces').upsert(
      {
        user_id: userId,
        state: nextState,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'user_id' }
    );
    setCloudSyncStatus(error ? 'error' : 'synced');
  }, []);

  const pullWorkspaceFromCloud = useCallback(
    async (userId: string, currentState: PersistedState) => {
      if (!supabase) return;
      setCloudSyncStatus('syncing');
      const { data, error } = await supabase
        .from('many_money_workspaces')
        .select('state')
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        setCloudSyncStatus('error');
        return;
      }

      if (data?.state && typeof data.state === 'object') {
        const remote = data.state as Partial<PersistedState>;
        if (Array.isArray(remote.transactions)) {
          skipNextRemotePushRef.current = true;
          setState({
            transactions: remote.transactions,
            categories: remote.categories ?? DEFAULT_CATEGORIES,
            accounts: remote.accounts ?? DEFAULT_ACCOUNTS,
            budgets: remote.budgets ?? DEFAULT_BUDGETS,
            memos: remote.memos ?? DEFAULT_MEMOS,
            recurring: remote.recurring ?? DEFAULT_RECURRING,
            settings: { ...DEFAULT_SETTINGS, ...(remote.settings ?? {}) },
          });
          setCloudSyncStatus('synced');
          return;
        }
      }

      await pushWorkspaceToCloud(userId, currentState);
    },
    [pushWorkspaceToCloud]
  );

  useEffect(() => {
    if (!supabase) return;
    let active = true;

    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      const u = data.session?.user;
      if (u) {
        setCloudUser({ id: u.id, email: u.email });
        void pullWorkspaceFromCloud(u.id, state);
      }
    });

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      const u = session?.user;
      if (u) {
        setCloudUser({ id: u.id, email: u.email });
        void pullWorkspaceFromCloud(u.id, state);
      } else {
        setCloudUser(null);
        setCloudSyncStatus('idle');
      }
    });

    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore quota errors
    }
    if (!supabase || !cloudUser) return;
    if (skipNextRemotePushRef.current) {
      skipNextRemotePushRef.current = false;
      return;
    }
    const timer = window.setTimeout(() => {
      void pushWorkspaceToCloud(cloudUser.id, state);
    }, 800);
    return () => window.clearTimeout(timer);
  }, [state, cloudUser, pushWorkspaceToCloud]);

  useEffect(() => {
    const root = document.documentElement;
    if (state.settings.theme === 'light') {
      root.classList.add('light');
      root.classList.remove('dark');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
    }
  }, [state.settings.theme]);

  const accountBalances = useMemo(() => {
    const map: Record<string, number> = {};
    for (const acc of state.accounts) {
      map[acc.id] = acc.initialBalance;
    }
    for (const tx of state.transactions) {
      if (tx.type === 'income') {
        map[tx.accountId] = (map[tx.accountId] ?? 0) + tx.amount;
      } else if (tx.type === 'expense') {
        map[tx.accountId] = (map[tx.accountId] ?? 0) - tx.amount;
      } else if (tx.type === 'transfer') {
        map[tx.accountId] = (map[tx.accountId] ?? 0) - tx.amount;
        if (tx.toAccountId) {
          map[tx.toAccountId] = (map[tx.toAccountId] ?? 0) + tx.amount;
        }
      }
    }
    return map;
  }, [state.accounts, state.transactions]);

  const uid = (prefix: string) => `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const value: MoneyContextValue = {
    ...state,
    accountBalances,
    addTransaction: (tx) =>
      setState((prev) => ({
        ...prev,
        transactions: [{ ...tx, id: uid('tx') }, ...prev.transactions],
      })),
    updateTransaction: (id, patch) =>
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      })),
    deleteTransaction: (id) =>
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.filter((t) => t.id !== id),
      })),
    toggleFavorite: (id) =>
      setState((prev) => ({
        ...prev,
        transactions: prev.transactions.map((t) =>
          t.id === id ? { ...t, isFavorite: !t.isFavorite } : t
        ),
      })),
    addCategory: (cat) =>
      setState((prev) => ({
        ...prev,
        categories: [...prev.categories, { ...cat, id: uid('cat') }],
      })),
    deleteCategory: (id) =>
      setState((prev) => ({
        ...prev,
        categories: prev.categories.filter((c) => c.id !== id),
      })),
    addAccount: (acc) =>
      setState((prev) => ({
        ...prev,
        accounts: [...prev.accounts, { ...acc, id: uid('acc') }],
      })),
    updateAccount: (id, patch) =>
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
      })),
    deleteAccount: (id) =>
      setState((prev) => ({
        ...prev,
        accounts: prev.accounts.filter((a) => a.id !== id),
      })),
    reorderAccount: (fromId, toId) =>
      setState((prev) => {
        if (fromId === toId) return prev;
        const list = [...prev.accounts];
        const fromIdx = list.findIndex((a) => a.id === fromId);
        const toIdx = list.findIndex((a) => a.id === toId);
        if (fromIdx === -1 || toIdx === -1) return prev;
        const [moved] = list.splice(fromIdx, 1);
        list.splice(toIdx, 0, moved);
        return { ...prev, accounts: list };
      }),
    upsertBudget: (categoryId, amount) =>
      setState((prev) => {
        const exists = prev.budgets.find((b) => b.categoryId === categoryId);
        if (exists) {
          return {
            ...prev,
            budgets: prev.budgets.map((b) =>
              b.categoryId === categoryId ? { ...b, amount } : b
            ),
          };
        }
        return {
          ...prev,
          budgets: [...prev.budgets, { id: uid('b'), categoryId, amount }],
        };
      }),
    addMemo: (memo) =>
      setState((prev) => ({
        ...prev,
        memos: [{ ...memo, id: uid('memo') }, ...prev.memos],
      })),
    updateMemo: (id, patch) =>
      setState((prev) => ({
        ...prev,
        memos: prev.memos.map((m) => (m.id === id ? { ...m, ...patch } : m)),
      })),
    deleteMemo: (id) =>
      setState((prev) => ({
        ...prev,
        memos: prev.memos.filter((m) => m.id !== id),
      })),
    addRecurring: (rule) =>
      setState((prev) => ({
        ...prev,
        recurring: [{ ...rule, id: uid('rec') }, ...prev.recurring],
      })),
    toggleRecurring: (id) =>
      setState((prev) => ({
        ...prev,
        recurring: prev.recurring.map((r) => (r.id === id ? { ...r, active: !r.active } : r)),
      })),
    deleteRecurring: (id) =>
      setState((prev) => ({
        ...prev,
        recurring: prev.recurring.filter((r) => r.id !== id),
      })),
    updateSettings: (patch) =>
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...patch },
      })),
    exportBackupJSON: () => {
      const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `many-money-backup-${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
    },
    importBackupJSON: (jsonText) => {
      try {
        const parsed = JSON.parse(jsonText) as Partial<PersistedState>;
        if (!Array.isArray(parsed.transactions)) return false;
        setState({
          transactions: parsed.transactions,
          categories: parsed.categories ?? DEFAULT_CATEGORIES,
          accounts: parsed.accounts ?? DEFAULT_ACCOUNTS,
          budgets: parsed.budgets ?? DEFAULT_BUDGETS,
          memos: parsed.memos ?? [],
          recurring: parsed.recurring ?? [],
          settings: { ...DEFAULT_SETTINGS, ...(parsed.settings ?? {}) },
        });
        return true;
      } catch {
        return false;
      }
    },
    resetAllData: (empty = false) => {
      if (empty) {
        setState({
          transactions: [],
          categories: DEFAULT_CATEGORIES,
          accounts: DEFAULT_ACCOUNTS,
          budgets: [],
          memos: [],
          recurring: [],
          settings: state.settings,
        });
      } else {
        setState({
          transactions: DEFAULT_TRANSACTIONS,
          categories: DEFAULT_CATEGORIES,
          accounts: DEFAULT_ACCOUNTS,
          budgets: DEFAULT_BUDGETS,
          memos: DEFAULT_MEMOS,
          recurring: DEFAULT_RECURRING,
          settings: state.settings,
        });
      }
    },
    cloudUser,
    cloudSyncStatus,
    signInWithEmail: async (email, password) => {
      if (!supabase) return { ok: false, error: 'Supabase belum dikonfigurasi' };
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    signUpWithEmail: async (email, password) => {
      if (!supabase) return { ok: false, error: 'Supabase belum dikonfigurasi' };
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) return { ok: false, error: error.message };
      return { ok: true };
    },
    signOutCloud: async () => {
      if (!supabase) return;
      await supabase.auth.signOut();
      setCloudUser(null);
      setCloudSyncStatus('idle');
    },
    syncNow: async () => {
      if (!cloudUser) return;
      await pushWorkspaceToCloud(cloudUser.id, state);
    },
  };

  return <MoneyContext.Provider value={value}>{children}</MoneyContext.Provider>;
};

export function useMoneyStore() {
  const ctx = useContext(MoneyContext);
  if (!ctx) throw new Error('useMoneyStore must be used inside MoneyProvider');
  return ctx;
}
