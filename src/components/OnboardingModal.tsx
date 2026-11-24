import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Check, Globe, Moon, Search, Sun, Wallet } from 'lucide-react';
import { CurrencyCode } from '../types';
import { useMoneyStore } from '../store/useMoneyStore';
import { CURRENCIES } from '../utils/format';
import { GoogleLogo } from './GoogleLogo';

export const OnboardingModal: React.FC = () => {
  const { settings, updateSettings, signInWithGoogle } = useMoneyStore();
  const [search, setSearch] = useState('');
  const [authMsg, setAuthMsg] = useState<string | null>(null);

  const filteredCurrencies = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (Object.keys(CURRENCIES) as CurrencyCode[]).filter((code) => {
      if (!q) return true;
      return (
        code.toLowerCase().includes(q) || CURRENCIES[code].name.toLowerCase().includes(q)
      );
    });
  }, [search]);

  if (settings.hasOnboarded) return null;

  const isId = settings.language === 'id';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/75" />
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.24, ease: [0.32, 0.72, 0, 1] }}
        className="relative z-10 w-full max-w-[430px] max-h-[92vh] overflow-y-auto no-scrollbar rounded-t-[28px] sm:rounded-[28px] ios-sheet p-5 pb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-[18px] font-bold leading-tight">Many Money</h2>
              <p className="text-[12px] text-[var(--text-secondary)]">
                {isId ? 'Atur preferensi awalmu' : 'Quick setup'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => updateSettings({ hasOnboarded: true })}
            className="text-[13.5px] font-semibold text-[var(--text-secondary)] px-2 py-1"
          >
            {isId ? 'Lewati' : 'Skip'}
          </button>
        </div>

        <div className="space-y-4">
          {/* 0. Account Mode: Google vs Guest */}
          <div>
            <div className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">
              {isId ? 'Mode Penyimpanan Akun' : 'Account & Storage Mode'}
            </div>
            <div className="space-y-2">
              <button
                type="button"
                onClick={async () => {
                  updateSettings({ hasOnboarded: true });
                  const res = await signInWithGoogle();
                  if (!res.ok && res.error) setAuthMsg(res.error);
                }}
                className="w-full py-3 px-3.5 rounded-[14px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-semibold text-[14px] flex items-center justify-center gap-2.5 active:opacity-85 transition"
              >
                <GoogleLogo className="w-4 h-4 shrink-0" />
                <span>{isId ? 'Masuk dengan Google (Sync Supabase)' : 'Sign in with Google (Supabase)'}</span>
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ hasOnboarded: true })}
                className="w-full py-2.5 px-3.5 rounded-[14px] ios-input-well text-[13.5px] font-semibold text-[var(--text-primary)] active:opacity-80 transition"
              >
                {isId ? 'Mode Guest (Simpan di Browser)' : 'Guest Mode (Browser Storage)'}
              </button>
            </div>
          </div>

          {/* 1. Theme */}
          <div>
            <div className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">
              {isId ? 'Tampilan' : 'Appearance'}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'dark', bgPreset: 'obsidian' })}
                className={`p-3 rounded-[14px] flex items-center gap-2.5 transition ${
                  settings.theme === 'dark'
                    ? 'ring-2 ring-[#0A84FF] bg-[var(--ios-fill)]'
                    : 'ios-input-well'
                }`}
              >
                <Moon className="w-4 h-4" />
                <span className="text-[14px] font-semibold">Hitam (Dark)</span>
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ theme: 'light', bgPreset: 'cloud' })}
                className={`p-3 rounded-[14px] flex items-center gap-2.5 transition ${
                  settings.theme === 'light'
                    ? 'ring-2 ring-[#0A84FF] bg-[var(--ios-fill)]'
                    : 'ios-input-well'
                }`}
              >
                <Sun className="w-4 h-4" />
                <span className="text-[14px] font-semibold">Putih (Light)</span>
              </button>
            </div>
          </div>

          {/* 2. Language */}
          <div>
            <div className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">
              {isId ? 'Bahasa' : 'Language'}
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => updateSettings({ language: 'id' })}
                className={`p-3 rounded-[14px] flex items-center gap-2.5 transition ${
                  settings.language === 'id'
                    ? 'ring-2 ring-[#0A84FF] bg-[var(--ios-fill)]'
                    : 'ios-input-well'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="text-[14px] font-semibold">Indonesia</span>
              </button>
              <button
                type="button"
                onClick={() => updateSettings({ language: 'en' })}
                className={`p-3 rounded-[14px] flex items-center gap-2.5 transition ${
                  settings.language === 'en'
                    ? 'ring-2 ring-[#0A84FF] bg-[var(--ios-fill)]'
                    : 'ios-input-well'
                }`}
              >
                <Globe className="w-4 h-4" />
                <span className="text-[14px] font-semibold">English</span>
              </button>
            </div>
          </div>

          {/* 3. Currency */}
          <div>
            <div className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">
              {isId ? 'Mata Uang Utama' : 'Primary Currency'}
            </div>
            <div className="flex items-center gap-2 rounded-[12px] ios-input-well px-3 py-2 mb-2">
              <Search className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isId ? 'Cari IDR, USD, JPY...' : 'Search IDR, USD, JPY...'}
                className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-[var(--text-tertiary)]"
              />
            </div>
            <div className="max-h-44 overflow-y-auto no-scrollbar ios-card divide-y ios-divider">
              {filteredCurrencies.map((code) => {
                const c = CURRENCIES[code];
                const selected = settings.currency === code;
                return (
                  <button
                    key={code}
                    type="button"
                    onClick={() => updateSettings({ currency: code })}
                    className="w-full px-3.5 py-2.5 flex items-center justify-between text-[13.5px] active:bg-[var(--ios-fill-secondary)]"
                  >
                    <span className={selected ? 'font-semibold' : ''}>
                      {code} · {c.name.replace(/\s*\([^)]*\)/, '')}
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[var(--text-secondary)] font-semibold">{c.symbol}</span>
                      {selected && (
                        <Check className="w-4 h-4" style={{ color: 'var(--sys-blue)' }} />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {authMsg && (
          <p className="mt-3 text-[12px] text-center" style={{ color: 'var(--sys-red)' }}>
            {authMsg}
          </p>
        )}

        <div className="mt-5">
          <button
            type="button"
            onClick={() => updateSettings({ hasOnboarded: true })}
            className="w-full py-3.5 rounded-[14px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-semibold text-[14.5px] active:opacity-85 transition"
          >
            {isId ? 'Mulai Sekarang (Mode Guest)' : 'Get Started (Guest Mode)'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
