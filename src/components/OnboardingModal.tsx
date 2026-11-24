import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { ArrowLeft, Check, Search, UserRound, Wallet } from 'lucide-react';
import { CurrencyCode } from '../types';
import { useMoneyStore } from '../store/useMoneyStore';
import { CURRENCIES } from '../utils/format';
import { GoogleLogo } from './GoogleLogo';

const POPULAR_CURRENCIES: CurrencyCode[] = ['IDR', 'USD', 'EUR', 'GBP', 'SGD', 'JPY'];

const FlagID: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 rounded-full shrink-0 shadow-sm" aria-hidden="true">
    <clipPath id="flag-id-clip">
      <circle cx="12" cy="12" r="12" />
    </clipPath>
    <g clipPath="url(#flag-id-clip)">
      <rect width="24" height="12" y="0" fill="#E11D48" />
      <rect width="24" height="12" y="12" fill="#FFFFFF" />
    </g>
    <circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" strokeOpacity="0.14" />
  </svg>
);

const FlagEN: React.FC = () => (
  <svg viewBox="0 0 24 24" className="w-5 h-5 rounded-full shrink-0 shadow-sm" aria-hidden="true">
    <clipPath id="flag-en-clip">
      <circle cx="12" cy="12" r="12" />
    </clipPath>
    <g clipPath="url(#flag-en-clip)">
      <rect width="24" height="24" fill="#FFFFFF" />
      <rect width="24" height="3.4" y="0" fill="#DC2626" />
      <rect width="24" height="3.4" y="6.8" fill="#DC2626" />
      <rect width="24" height="3.4" y="13.6" fill="#DC2626" />
      <rect width="24" height="3.6" y="20.4" fill="#DC2626" />
      <rect width="12" height="12" x="0" y="0" fill="#1D4ED8" />
      <circle cx="4" cy="4" r="1" fill="#FFFFFF" />
      <circle cx="8" cy="4" r="1" fill="#FFFFFF" />
      <circle cx="6" cy="6" r="1" fill="#FFFFFF" />
      <circle cx="4" cy="8" r="1" fill="#FFFFFF" />
      <circle cx="8" cy="8" r="1" fill="#FFFFFF" />
    </g>
    <circle cx="12" cy="12" r="11.5" fill="none" stroke="currentColor" strokeOpacity="0.14" />
  </svg>
);

export const OnboardingModal: React.FC = () => {
  const { settings, updateSettings, signInWithGoogle, cloudUser } = useMoneyStore();
  const [step, setStep] = useState<'account' | 'prefs'>(cloudUser ? 'prefs' : 'account');
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
  const isDark = settings.theme === 'dark';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center p-0 sm:p-4 overflow-hidden">
      {/* Solid 100% Opaque Base Layer so underlying app never bleeds through */}
      <div className={`absolute inset-0 ${isDark ? 'bg-black' : 'bg-[#F2F2F7]'}`} />

      {/* Soft Abstract Silk Wallpaper + Tempered Backdrop */}
      <img
        src="/onboarding-bg.jpg"
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full object-cover scale-105 transition-all duration-500 ${
          isDark ? 'opacity-90 brightness-90' : 'opacity-40 invert brightness-110 contrast-90'
        }`}
      />
      <div
        className="absolute inset-0 transition-colors duration-500"
        style={{
          background: isDark
            ? 'radial-gradient(110% 80% at 50% 0%, rgba(255,255,255,0.06) 0%, rgba(0,0,0,0.42) 60%, rgba(0,0,0,0.65) 100%)'
            : 'radial-gradient(110% 80% at 50% 0%, rgba(255,255,255,0.35) 0%, rgba(242,242,247,0.55) 60%, rgba(229,229,234,0.75) 100%)',
        }}
      />

      <motion.div
        initial={{ y: 36, opacity: 0, scale: 0.98 }}
        animate={{ y: 0, opacity: 1, scale: 1 }}
        transition={{ duration: 0.28, ease: [0.32, 0.72, 0, 1] }}
        className="relative z-10 w-full max-w-[430px] max-h-[92vh] flex flex-col rounded-t-[30px] sm:rounded-[30px] overflow-hidden border"
        style={{
          background: isDark
            ? 'linear-gradient(180deg, rgba(28,28,32,0.66) 0%, rgba(16,16,20,0.76) 100%)'
            : 'linear-gradient(180deg, rgba(255,255,255,0.72) 0%, rgba(244,244,248,0.82) 100%)',
          borderColor: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(255,255,255,0.85)',
          boxShadow: isDark
            ? '0 24px 60px rgba(0,0,0,0.65), inset 0 1.5px 0 rgba(255,255,255,0.22)'
            : '0 24px 60px rgba(15,23,42,0.14), inset 0 1.5px 0 rgba(255,255,255,0.95)',
          backdropFilter: 'blur(36px) saturate(190%)',
          WebkitBackdropFilter: 'blur(36px) saturate(190%)',
        }}
      >
        {/* Top Tab Bar + Header */}
        <div className="px-5 pt-4 pb-3 shrink-0">
          <div className="w-9 h-1 rounded-full bg-[var(--text-tertiary)]/40 mx-auto mb-3 sm:hidden" />

          <div className="flex items-center justify-between mb-3.5">
            <div className="flex items-center gap-2.5">
              {step === 'prefs' ? (
                <button
                  type="button"
                  onClick={() => setStep('account')}
                  className="w-9 h-9 rounded-full ios-input-well flex items-center justify-center active:scale-95 transition"
                  aria-label="Kembali"
                >
                  <ArrowLeft className="w-4 h-4" />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] flex items-center justify-center shadow-sm">
                  <Wallet className="w-4 h-4" />
                </div>
              )}
              <div>
                <h2 className="text-[17px] font-bold leading-tight tracking-tight">Many Money</h2>
                <p className="text-[11.5px] text-[var(--text-secondary)]">
                  {step === 'account'
                    ? isId
                      ? 'Pilih cara simpan datamu'
                      : 'Choose how to save your data'
                    : isId
                      ? 'Sesuaikan tampilan & mata uang'
                      : 'Customize theme & currency'}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => updateSettings({ hasOnboarded: true })}
              className="text-[13px] font-semibold text-[var(--text-secondary)] px-2.5 py-1 rounded-full hover:bg-[var(--ios-fill-secondary)] transition"
            >
              {isId ? 'Lewati' : 'Skip'}
            </button>
          </div>

          {/* Segmented Tab Switcher */}
          <div className="grid grid-cols-2 gap-1 p-1 rounded-full ios-input-well">
            {[
              { id: 'account' as const, label: isId ? '1. Akun' : '1. Account' },
              { id: 'prefs' as const, label: isId ? '2. Preferensi' : '2. Preferences' },
            ].map((tab) => {
              const active = step === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setStep(tab.id)}
                  className={`relative py-1.5 rounded-full text-[12.5px] font-semibold transition ${
                    active ? 'text-[var(--accent-primary-fg)]' : 'text-[var(--text-secondary)]'
                  }`}
                >
                  {active && (
                    <motion.span
                      layoutId="onboarding-tab-pill"
                      transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                      className="absolute inset-0 rounded-full bg-[var(--accent-primary)] shadow-sm"
                    />
                  )}
                  <span className="relative z-10">{tab.label}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Scrollable Slide Content */}
        <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-6">
          <AnimatePresence mode="wait">
            {step === 'account' ? (
              <motion.div
                key="step-account"
                initial={{ opacity: 0, x: -16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -16 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="space-y-3 pt-2"
              >
                {/* Account Mode Buttons */}
                <div className="space-y-2.5">
                  <button
                    type="button"
                    onClick={async () => {
                      updateSettings({ hasOnboarded: true });
                      const res = await signInWithGoogle();
                      if (!res.ok && res.error) setAuthMsg(res.error);
                    }}
                    className="w-full py-3.5 px-4 rounded-[16px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-semibold text-[14.5px] flex items-center justify-center gap-2.5 shadow-sm active:scale-[0.99] transition"
                  >
                    <GoogleLogo className="w-4 h-4 shrink-0" />
                    <span>{isId ? 'Masuk dengan Google' : 'Continue with Google'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setStep('prefs')}
                    className="w-full py-3.5 px-4 rounded-[16px] ios-input-well font-semibold text-[14px] text-[var(--text-primary)] flex items-center justify-center gap-2 active:scale-[0.99] transition"
                  >
                    <UserRound className="w-4 h-4 text-[var(--text-secondary)]" />
                    <span>{isId ? 'Lanjut sebagai Guest' : 'Continue as Guest'}</span>
                  </button>
                </div>

                {authMsg && (
                  <p className="text-[12px] text-center" style={{ color: 'var(--sys-red)' }}>
                    {authMsg}
                  </p>
                )}

                <p className="text-[11.5px] text-center text-[var(--text-tertiary)] pt-1">
                  {isId
                    ? 'Mode Guest menyimpan data aman di browser ini. Kamu bisa pindah ke Google kapan saja di Menu.'
                    : 'Guest Mode saves locally in your browser. You can link Google anytime in Settings.'}
                </p>
              </motion.div>
            ) : (
              <motion.div
                key="step-prefs"
                initial={{ opacity: 0, x: 16 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 16 }}
                transition={{ duration: 0.2, ease: [0.32, 0.72, 0, 1] }}
                className="space-y-4 pt-1"
              >
                {/* 1. Theme — Visual iOS Black & White Slide Cards (No Parentheses) */}
                <div>
                  <div className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">
                    {isId ? 'Tampilan' : 'Appearance'}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      {
                        mode: 'dark' as const,
                        preset: 'obsidian' as const,
                        label: isId ? 'Hitam' : 'Dark',
                        bg: '#090A0D',
                        card: '#1C1C1E',
                        bar: '#FFFFFF',
                        sub: 'rgba(255,255,255,0.28)',
                      },
                      {
                        mode: 'light' as const,
                        preset: 'cloud' as const,
                        label: isId ? 'Putih' : 'Light',
                        bg: '#F2F2F7',
                        card: '#FFFFFF',
                        bar: '#111827',
                        sub: 'rgba(17,24,39,0.22)',
                      },
                    ].map((opt) => {
                      const selected = settings.theme === opt.mode;
                      return (
                        <button
                          key={opt.mode}
                          type="button"
                          onClick={() => updateSettings({ theme: opt.mode, bgPreset: opt.preset })}
                          className={`rounded-[18px] p-2.5 text-left transition-all duration-200 border ${
                            selected
                              ? 'ring-2 ring-[#0A84FF] border-transparent bg-[var(--ios-fill)] scale-[1.01]'
                              : 'ios-input-well border-transparent opacity-80 hover:opacity-100'
                          }`}
                        >
                          {/* Mini iOS Screen Preview */}
                          <div
                            className="h-16 rounded-[12px] p-2.5 flex flex-col justify-between mb-2 border border-black/10 dark:border-white/10"
                            style={{ backgroundColor: opt.bg }}
                          >
                            <div className="flex items-center justify-between">
                              <span
                                className="w-7 h-1.5 rounded-full"
                                style={{ backgroundColor: opt.bar }}
                              />
                              <span
                                className="w-2.5 h-2.5 rounded-full"
                                style={{ backgroundColor: opt.sub }}
                              />
                            </div>
                            <div
                              className="h-6 rounded-[7px] px-2 flex items-center gap-1.5"
                              style={{ backgroundColor: opt.card }}
                            >
                              <span
                                className="w-3 h-3 rounded-full"
                                style={{ backgroundColor: opt.sub }}
                              />
                              <span
                                className="w-10 h-1.5 rounded-full"
                                style={{ backgroundColor: opt.bar }}
                              />
                            </div>
                          </div>
                          <div className="flex items-center justify-between px-1">
                            <span className="text-[13.5px] font-semibold">{opt.label}</span>
                            {selected && (
                              <span className="w-4 h-4 rounded-full bg-[#0A84FF] text-white flex items-center justify-center">
                                <Check className="w-2.5 h-2.5 stroke-[3]" />
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 2. Language — Tempered Glass Cards with SVG Flags */}
                <div>
                  <div className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">
                    {isId ? 'Bahasa' : 'Language'}
                  </div>
                  <div className="grid grid-cols-2 gap-2.5">
                    {[
                      { code: 'id' as const, label: 'Indonesia', flag: <FlagID /> },
                      { code: 'en' as const, label: 'English', flag: <FlagEN /> },
                    ].map((lang) => {
                      const selected = settings.language === lang.code;
                      return (
                        <button
                          key={lang.code}
                          type="button"
                          onClick={() => updateSettings({ language: lang.code })}
                          className={`p-3 rounded-[16px] flex items-center justify-between transition border ${
                            selected
                              ? 'ring-2 ring-[#0A84FF] border-transparent bg-[var(--ios-fill)]'
                              : 'ios-input-well border-transparent'
                          }`}
                        >
                          <span className="flex items-center gap-2.5">
                            {lang.flag}
                            <span className="text-[13.5px] font-semibold">{lang.label}</span>
                          </span>
                          {selected && (
                            <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--sys-blue)' }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 3. Currency — Popular Pills + Clean Searchable List */}
                <div>
                  <div className="text-[12px] font-semibold text-[var(--text-secondary)] mb-2">
                    {isId ? 'Mata Uang Utama' : 'Primary Currency'}
                  </div>

                  {/* Quick Popular Pills */}
                  <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-2">
                    {POPULAR_CURRENCIES.map((code) => {
                      const selected = settings.currency === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => updateSettings({ currency: code })}
                          className={`px-3 py-1.5 rounded-full text-[12px] font-semibold shrink-0 transition ${
                            selected
                              ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                              : 'ios-input-well text-[var(--text-secondary)]'
                          }`}
                        >
                          {code} · {CURRENCIES[code].symbol}
                        </button>
                      );
                    })}
                  </div>

                  <div className="flex items-center gap-2 rounded-[14px] ios-input-well px-3 py-2 mb-2">
                    <Search className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                    <input
                      type="text"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      placeholder={isId ? 'Cari mata uang...' : 'Search currency...'}
                      className="w-full bg-transparent text-[13.5px] outline-none placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>

                  <div className="max-h-40 overflow-y-auto no-scrollbar rounded-[16px] ios-input-well divide-y ios-divider">
                    {filteredCurrencies.map((code) => {
                      const c = CURRENCIES[code];
                      const selected = settings.currency === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => updateSettings({ currency: code })}
                          className="w-full px-3.5 py-2.5 flex items-center justify-between text-[13px] active:bg-[var(--ios-fill-secondary)] transition"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="w-8 h-6 rounded-[7px] ios-card flex items-center justify-center text-[11px] font-bold shrink-0">
                              {c.symbol}
                            </span>
                            <div className="text-left truncate">
                              <span className={selected ? 'font-bold' : 'font-medium'}>{code}</span>
                              <span className="text-[var(--text-secondary)] ml-1.5">
                                {c.name.replace(/\s*\([^)]*\)/, '')}
                              </span>
                            </div>
                          </div>
                          {selected && (
                            <Check className="w-4 h-4 shrink-0" style={{ color: 'var(--sys-blue)' }} />
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => updateSettings({ hasOnboarded: true })}
                  className="w-full mt-2 py-3.5 rounded-[16px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-bold text-[14.5px] active:opacity-85 transition"
                >
                  {isId ? 'Mulai Sekarang' : 'Get Started'}
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};
