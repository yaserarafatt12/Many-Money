import React, { useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Bell,
  ChevronRight,
  Cloud,
  Coins,
  DatabaseBackup,
  Download,
  FileSpreadsheet,
  Globe,
  Languages,
  Lock,
  LogOut,
  Moon,
  Plus,
  RefreshCw,
  Repeat,
  Search,
  Sun,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { CurrencyCode } from '../types';
import { useMoneyStore } from '../store/useMoneyStore';
import { CategoryIcon } from '../components/CategoryIcon';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { CURRENCIES, exportTransactionsToCSV } from '../utils/format';
import { BG_PRESETS } from '../utils/themePresets';
import { STRINGS } from '../utils/i18n';

type ActiveModal =
  | null
  | 'currency'
  | 'language'
  | 'cat-expense'
  | 'cat-income'
  | 'recurring'
  | 'tags'
  | 'backup'
  | 'pin';

const IosSwitch: React.FC<{ checked: boolean; onChange: () => void }> = ({ checked, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={checked}
    onClick={(e) => {
      e.stopPropagation();
      onChange();
    }}
    className={`w-[46px] h-[28px] rounded-full p-[2px] transition-colors duration-200 flex items-center ${
      checked ? 'bg-[#30D158]' : 'bg-[var(--ios-fill)]'
    }`}
  >
    <span
      className={`w-[24px] h-[24px] rounded-full bg-white shadow-sm transition-transform duration-200 ${
        checked ? 'translate-x-[18px]' : 'translate-x-0'
      }`}
    />
  </button>
);

export const LainnyaView: React.FC = () => {
  const {
    transactions,
    categories,
    accounts,
    recurring,
    settings,
    updateSettings,
    addCategory,
    deleteCategory,
    addRecurring,
    toggleRecurring,
    deleteRecurring,
    exportBackupJSON,
    importBackupJSON,
    resetAllData,
    cloudUser,
    cloudSyncStatus,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    signOutCloud,
    syncNow,
  } = useMoneyStore();

  const t = STRINGS[settings.language];
  const isEn = settings.language === 'en';

  const [activeModal, setActiveModal] = useState<ActiveModal>(null);
  const [currencySearch, setCurrencySearch] = useState('');
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);
  const [newCatName, setNewCatName] = useState('');
  const [newTag, setNewTag] = useState('');
  const [newRecTitle, setNewRecTitle] = useState('');
  const [newRecAmount, setNewRecAmount] = useState('');
  const [pinDraft, setPinDraft] = useState(settings.pinCode);
  const [cloudEmail, setCloudEmail] = useState('');
  const [cloudPassword, setCloudPassword] = useState('');
  const [cloudAuthLoading, setCloudAuthLoading] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredCurrencies = useMemo(() => {
    const q = currencySearch.trim().toLowerCase();
    return (Object.keys(CURRENCIES) as CurrencyCode[]).filter((code) => {
      if (!q) return true;
      return code.toLowerCase().includes(q) || CURRENCIES[code].name.toLowerCase().includes(q);
    });
  }, [currencySearch]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2200);
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const ok = importBackupJSON(String(reader.result || ''));
      showToast(ok ? 'Data cadangan dipulihkan.' : 'File JSON tidak valid.');
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const SettingRow: React.FC<{
    icon?: React.ComponentType<{ className?: string }>;
    iconText?: string;
    badgeColor: string;
    title: string;
    value?: string;
    right?: React.ReactNode;
    onClick?: () => void;
    isLast?: boolean;
  }> = ({ icon: Icon, iconText, badgeColor, title, value, right, onClick, isLast }) => (
    <div>
      <div
        role="button"
        tabIndex={0}
        onClick={onClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            onClick?.();
          }
        }}
        className="w-full px-4 py-3 flex items-center justify-between gap-3 text-left cursor-pointer active:bg-[var(--ios-fill-secondary)] transition"
      >
        <div className="flex items-center gap-3 min-w-0">
          <div
            className="w-7 h-7 rounded-[7px] flex items-center justify-center shrink-0 text-white font-bold text-[10.5px]"
            style={{ backgroundColor: badgeColor }}
          >
            {iconText ? <span>{iconText}</span> : Icon && <Icon className="w-[15px] h-[15px]" />}
          </div>
          <span className="text-[15px] font-normal truncate">{title}</span>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {value && (
            <span className="text-[14px] text-[var(--text-secondary)] truncate max-w-[130px]">
              {value}
            </span>
          )}
          {right ?? <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />}
        </div>
      </div>
      {!isLast && (
        <div
          className="h-[0.5px] ml-[56px]"
          style={{ backgroundColor: 'var(--ios-separator)' }}
        />
      )}
    </div>
  );

  return (
    <div className="px-4 pt-4 pb-32">
      {/* Toast */}
      <AnimatePresence>
        {toast && (
          <motion.div
            initial={{ opacity: 0, y: -12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -12 }}
            className="fixed top-5 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] text-[13px] font-semibold shadow-lg"
          >
            {toast}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Native iOS Large Title Header */}
      <div className="flex items-center justify-between mb-5">
        <h1 className="text-[28px] font-bold tracking-[-0.025em] leading-none">{t.settings}</h1>
        <button
          type="button"
          onClick={() => {
            const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
            updateSettings({
              theme: nextTheme,
              bgPreset: nextTheme === 'dark' ? 'obsidian' : 'cloud',
            });
          }}
          className="px-3 py-1.5 rounded-full ios-input-well inline-flex items-center gap-1.5 text-[13px] font-semibold active:opacity-70 transition"
        >
          {settings.theme === 'dark' ? (
            <>
              <Moon className="w-3.5 h-3.5" /> Dark
            </>
          ) : (
            <>
              <Sun className="w-3.5 h-3.5" /> Light
            </>
          )}
        </button>
      </div>

      <div className="space-y-6">
        {/* Section: Akun & Sinkronisasi (Guest vs Google Supabase) */}
        <section>
          <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-secondary)] px-3 mb-2">
            {isEn ? 'Account & Sync' : 'Akun & Sinkronisasi'}
          </div>
          <div className="ios-card p-3.5 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="text-[15px] font-semibold truncate">
                  {cloudUser ? cloudUser.email || 'Google Account' : isEn ? 'Guest Mode' : 'Mode Guest'}
                </div>
                <div className="text-[12px] text-[var(--text-secondary)] truncate">
                  {cloudUser
                    ? isEn
                      ? 'Synced to Supabase Cloud'
                      : 'Tersinkron ke Supabase Cloud'
                    : isEn
                      ? 'Saved locally in this browser'
                      : 'Tersimpan lokal di browser ini'}
                </div>
              </div>
              <span
                className="px-2.5 py-1 rounded-full text-[11px] font-semibold shrink-0"
                style={{
                  backgroundColor: cloudUser
                    ? 'rgba(48,209,88,0.16)'
                    : 'var(--ios-fill-secondary)',
                  color: cloudUser ? 'var(--sys-green)' : 'var(--text-secondary)',
                }}
              >
                {cloudUser
                  ? cloudSyncStatus === 'syncing'
                    ? 'Syncing...'
                    : 'Supabase'
                  : 'Browser'}
              </span>
            </div>

            {cloudUser ? (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={async () => {
                    await syncNow();
                    showToast(isEn ? 'Synced to Supabase.' : 'Tersinkron ke Supabase.');
                  }}
                  className="flex-1 py-2.5 px-3 rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] text-[13px] font-semibold flex items-center justify-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  {isEn ? 'Sync Now' : 'Sync Sekarang'}
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    await signOutCloud();
                    showToast(isEn ? 'Switched to Guest Mode.' : 'Kembali ke Mode Guest.');
                  }}
                  className="py-2.5 px-3.5 rounded-[12px] ios-input-well text-[13px] font-medium flex items-center justify-center gap-1.5"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {isEn ? 'Guest' : 'Keluar'}
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={async () => {
                  const res = await signInWithGoogle();
                  if (!res.ok) showToast(res.error || 'Gagal login Google');
                }}
                className="w-full py-2.5 px-3.5 rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] text-[13.5px] font-semibold flex items-center justify-center gap-2 active:opacity-85 transition"
              >
                <span className="font-bold">G</span>
                {isEn ? 'Sign in with Google (Sync Supabase)' : 'Masuk dengan Google (Sync Supabase)'}
              </button>
            )}
          </div>
        </section>

        {/* Section: Tampilan (Hitam & Putih saja) */}
        <section>
          <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-secondary)] px-3 mb-2">
            {isEn ? 'Appearance' : 'Tampilan'}
          </div>
          <div className="ios-card p-3 grid grid-cols-2 gap-2.5">
            {BG_PRESETS.map((preset) => {
              const selected = settings.bgPreset === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    updateSettings({ bgPreset: preset.id, theme: preset.mode });
                    showToast(preset.name);
                  }}
                  className={`rounded-[12px] p-2.5 text-left transition ${
                    selected
                      ? 'ring-2 ring-[#0A84FF] bg-[var(--ios-fill-secondary)]'
                      : 'bg-[var(--ios-fill-secondary)]/50'
                  }`}
                >
                  <div
                    className="h-9 w-full rounded-[8px] mb-1.5 border border-black/10 dark:border-white/15"
                    style={{ backgroundColor: preset.color }}
                  />
                  <div className="text-[12.5px] font-semibold truncate">{preset.name}</div>
                </button>
              );
            })}
          </div>
        </section>

        {/* Section: Format, Bahasa & Mata Uang */}
        <section>
          <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-secondary)] px-3 mb-2">
            {isEn ? 'Language & Currency' : 'Bahasa & Mata Uang'}
          </div>
          <div className="ios-card overflow-hidden">
            <SettingRow
              icon={Languages}
              badgeColor="#30D158"
              title={isEn ? 'Language' : 'Bahasa'}
              value={settings.language === 'id' ? 'Indonesia' : 'English'}
              onClick={() => setActiveModal('language')}
            />
            <SettingRow
              icon={Globe}
              badgeColor="#0A84FF"
              title={isEn ? 'Primary currency' : 'Mata uang utama'}
              value={`${settings.currency} (${CURRENCIES[settings.currency].symbol})`}
              onClick={() => {
                setCurrencySearch('');
                setActiveModal('currency');
              }}
            />
            <SettingRow
              iconText=".00"
              badgeColor="#5E5CE6"
              title={isEn ? 'Show decimals (.00)' : 'Tampilkan desimal (.00)'}
              right={
                <IosSwitch
                  checked={settings.showDecimals}
                  onChange={() => updateSettings({ showDecimals: !settings.showDecimals })}
                />
              }
              onClick={() => updateSettings({ showDecimals: !settings.showDecimals })}
              isLast
            />
          </div>
        </section>

        {/* Section: Transaksi & Kategori */}
        <section>
          <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-secondary)] px-3 mb-2">
            {isEn ? 'Transactions & Categories' : 'Transaksi & Kategori'}
          </div>
          <div className="ios-card overflow-hidden">
            <SettingRow
              icon={Repeat}
              badgeColor="#FF9F0A"
              title={isEn ? 'Recurring' : 'Transaksi berulang'}
              value={`${recurring.filter((r) => r.active).length} ${isEn ? 'active' : 'aktif'}`}
              onClick={() => setActiveModal('recurring')}
            />
            <SettingRow
              icon={Coins}
              badgeColor="#30D158"
              title={isEn ? 'Income categories' : 'Kategori pemasukan'}
              value={`${categories.filter((c) => c.type === 'income').length}`}
              onClick={() => setActiveModal('cat-income')}
            />
            <SettingRow
              icon={Coins}
              badgeColor="#FF453A"
              title={isEn ? 'Expense categories' : 'Kategori pengeluaran'}
              value={`${categories.filter((c) => c.type === 'expense').length}`}
              onClick={() => setActiveModal('cat-expense')}
            />
            <SettingRow
              icon={Tag}
              badgeColor="#BF5AF2"
              title="Tag"
              value={`${settings.tags.length} tag`}
              onClick={() => setActiveModal('tags')}
              isLast
            />
          </div>
        </section>

        {/* Section: Data & Keamanan */}
        <section>
          <div className="text-[12px] font-medium uppercase tracking-wide text-[var(--text-secondary)] px-3 mb-2">
            {isEn ? 'Data & Security' : 'Data & Keamanan'}
          </div>
          <div className="ios-card overflow-hidden">
            <SettingRow
              icon={FileSpreadsheet}
              badgeColor="#30D158"
              title={t.exportCsv}
              onClick={() => setExportConfirmOpen(true)}
            />
            <SettingRow
              icon={DatabaseBackup}
              badgeColor="#64D2FF"
              title={isEn ? 'Backup & Reset' : 'Cadangan & Reset'}
              onClick={() => setActiveModal('backup')}
            />
            <SettingRow
              icon={Lock}
              badgeColor="#8E8E93"
              title={isEn ? 'Passcode (PIN)' : 'Kunci PIN'}
              value={settings.pinEnabled ? (isEn ? 'On' : 'Aktif') : isEn ? 'Off' : 'Nonaktif'}
              onClick={() => {
                setPinDraft(settings.pinCode);
                setActiveModal('pin');
              }}
            />
            <SettingRow
              icon={Bell}
              badgeColor="#FF375F"
              title={isEn ? 'Daily reminder (local)' : 'Pengingat harian (lokal)'}
              value={settings.reminderEnabled ? settings.reminderTime : undefined}
              right={
                <IosSwitch
                  checked={settings.reminderEnabled}
                  onChange={() => {
                    const next = !settings.reminderEnabled;
                    updateSettings({ reminderEnabled: next });
                    if (next && 'Notification' in window && Notification.permission === 'default') {
                      Notification.requestPermission().catch(() => {});
                    }
                    showToast(
                      next
                        ? `Pengingat aktif tiap ${settings.reminderTime}`
                        : 'Pengingat dimatikan'
                    );
                  }}
                />
              }
              onClick={() => {
                const next = !settings.reminderEnabled;
                updateSettings({ reminderEnabled: next });
              }}
              isLast
            />
          </div>
        </section>

        <div className="text-center text-[12px] text-[var(--text-tertiary)] pt-1">
          Many Money · v1.0 · Offline & Bebas Iklan
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="application/json"
        onChange={handleImportFile}
        className="hidden"
      />

      <ConfirmDialog
        open={exportConfirmOpen}
        title={t.exportConfirmTitle}
        description={t.exportConfirmDesc}
        confirmLabel={t.confirmExport}
        cancelLabel={t.cancel}
        onCancel={() => setExportConfirmOpen(false)}
        onConfirm={() => {
          exportTransactionsToCSV(transactions, categories, accounts, settings.currency);
          setExportConfirmOpen(false);
          showToast('File CSV diunduh.');
        }}
      />

      {/* MODALS (Silky-smooth native iOS easing) */}
      <AnimatePresence>
        {activeModal && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setActiveModal(null)}
              className="absolute inset-0 bg-black/55"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="relative z-10 w-full max-w-[430px] max-h-[85vh] overflow-y-auto no-scrollbar rounded-t-[28px] sm:rounded-[28px] ios-sheet p-5 pb-8"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[17px] font-bold">
                  {activeModal === 'currency' && (isEn ? 'Primary Currency' : 'Mata Uang Utama')}
                  {activeModal === 'language' && (isEn ? 'Language' : 'Bahasa')}
                  {activeModal === 'cat-expense' &&
                    (isEn ? 'Expense Categories' : 'Kategori Pengeluaran')}
                  {activeModal === 'cat-income' &&
                    (isEn ? 'Income Categories' : 'Kategori Pemasukan')}
                  {activeModal === 'recurring' && (isEn ? 'Recurring' : 'Transaksi Berulang')}
                  {activeModal === 'tags' && 'Tag'}
                  {activeModal === 'backup' && (isEn ? 'Backup & Reset' : 'Cadangan & Reset')}
                  {activeModal === 'pin' && (isEn ? 'PIN Lock' : 'Kunci PIN')}
                </h3>
                <button
                  type="button"
                  onClick={() => setActiveModal(null)}
                  className="w-8 h-8 rounded-full ios-input-well flex items-center justify-center text-[var(--text-secondary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {activeModal === 'language' && (
                <div className="ios-card overflow-hidden divide-y ios-divider">
                  {[
                    { id: 'id' as const, label: 'Bahasa Indonesia' },
                    { id: 'en' as const, label: 'English' },
                  ].map((l) => {
                    const selected = settings.language === l.id;
                    return (
                      <button
                        key={l.id}
                        type="button"
                        onClick={() => {
                          updateSettings({ language: l.id });
                          setActiveModal(null);
                        }}
                        className="w-full px-4 py-3.5 flex items-center justify-between text-[15px] active:bg-[var(--ios-fill-secondary)]"
                      >
                        <span className={selected ? 'font-semibold' : ''}>{l.label}</span>
                        {selected && (
                          <span className="font-semibold" style={{ color: 'var(--sys-blue)' }}>
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {activeModal === 'currency' && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 rounded-[12px] ios-input-well px-3 py-2">
                    <Search className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
                    <input
                      type="text"
                      value={currencySearch}
                      onChange={(e) => setCurrencySearch(e.target.value)}
                      placeholder="Cari IDR, USD, SGD, JPY, EGP..."
                      className="w-full bg-transparent text-[14px] outline-none placeholder:text-[var(--text-tertiary)]"
                    />
                  </div>
                  <div className="ios-card overflow-hidden divide-y ios-divider max-h-[55vh] overflow-y-auto no-scrollbar">
                    {filteredCurrencies.map((code) => {
                      const c = CURRENCIES[code];
                      const selected = settings.currency === code;
                      return (
                        <button
                          key={code}
                          type="button"
                          onClick={() => {
                            updateSettings({ currency: code });
                            setActiveModal(null);
                            showToast(`Mata uang: ${code}`);
                          }}
                          className="w-full px-4 py-3 flex items-center justify-between text-[14.5px] active:bg-[var(--ios-fill-secondary)]"
                        >
                          <span className={selected ? 'font-semibold' : ''}>{c.name}</span>
                          <span
                            className="font-semibold"
                            style={{
                              color: selected ? 'var(--sys-blue)' : 'var(--text-secondary)',
                            }}
                          >
                            {c.symbol}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {(activeModal === 'cat-expense' || activeModal === 'cat-income') && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newCatName}
                      onChange={(e) => setNewCatName(e.target.value)}
                      placeholder="Nama kategori baru"
                      className="flex-1 rounded-[12px] ios-input-well px-3.5 py-2.5 text-[14.5px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newCatName.trim()) return;
                        addCategory({
                          name: newCatName.trim(),
                          emoji: 'box',
                          type: activeModal === 'cat-income' ? 'income' : 'expense',
                          color: '#8E8E93',
                        });
                        setNewCatName('');
                      }}
                      className="px-4 rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-semibold"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>

                  <div className="ios-card overflow-hidden divide-y ios-divider">
                    {categories
                      .filter(
                        (c) => c.type === (activeModal === 'cat-income' ? 'income' : 'expense')
                      )
                      .map((c) => (
                        <div
                          key={c.id}
                          className="px-3.5 py-3 flex items-center justify-between"
                        >
                          <div className="flex items-center gap-2.5">
                            <CategoryIcon categoryId={c.id} className="w-4 h-4" />
                            <span className="text-[14.5px] font-medium">{c.name}</span>
                          </div>
                          <button
                            type="button"
                            onClick={() => deleteCategory(c.id)}
                            className="p-1.5"
                            style={{ color: 'var(--sys-red)' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {activeModal === 'recurring' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newRecTitle}
                      onChange={(e) => setNewRecTitle(e.target.value)}
                      placeholder="Nama (mis. Internet)"
                      className="flex-1 rounded-[12px] ios-input-well px-3 py-2.5 text-[14px] outline-none"
                    />
                    <input
                      type="number"
                      value={newRecAmount}
                      onChange={(e) => setNewRecAmount(e.target.value)}
                      placeholder="Nominal"
                      className="w-24 rounded-[12px] ios-input-well px-3 py-2.5 text-[14px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (!newRecTitle.trim() || !Number(newRecAmount)) return;
                        addRecurring({
                          title: newRecTitle.trim(),
                          amount: Number(newRecAmount),
                          type: 'expense',
                          categoryId: categories[0]?.id || 'cat-kebutuhan',
                          accountId: accounts[0]?.id || 'acc-tunai',
                          frequency: 'monthly',
                          dayOfMonth: 1,
                          active: true,
                        });
                        setNewRecTitle('');
                        setNewRecAmount('');
                      }}
                      className="px-3.5 rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="ios-card overflow-hidden divide-y ios-divider">
                    {recurring.map((r) => (
                      <div
                        key={r.id}
                        className="px-3.5 py-3 flex items-center justify-between"
                      >
                        <div>
                          <div className="text-[14.5px] font-medium">{r.title}</div>
                          <div className="text-[12px] text-[var(--text-secondary)]">
                            Bulanan · {CURRENCIES[settings.currency].symbol} {r.amount}
                          </div>
                        </div>
                        <div className="flex items-center gap-2.5">
                          <IosSwitch checked={r.active} onChange={() => toggleRecurring(r.id)} />
                          <button
                            type="button"
                            onClick={() => deleteRecurring(r.id)}
                            style={{ color: 'var(--sys-red)' }}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {activeModal === 'tags' && (
                <div className="space-y-3">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      placeholder="Tambah tag baru"
                      className="flex-1 rounded-[12px] ios-input-well px-3.5 py-2.5 text-[14.5px] outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const clean = newTag.trim().replace(/^#/, '');
                        if (!clean || settings.tags.includes(clean)) return;
                        updateSettings({ tags: [...settings.tags, clean] });
                        setNewTag('');
                      }}
                      className="px-4 rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {settings.tags.map((tItem) => (
                      <span
                        key={tItem}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ios-input-well text-[13px] font-medium"
                      >
                        #{tItem}
                        <button
                          type="button"
                          onClick={() =>
                            updateSettings({ tags: settings.tags.filter((x) => x !== tItem) })
                          }
                        >
                          <X className="w-3.5 h-3.5 text-[var(--text-tertiary)]" />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {activeModal === 'backup' && (
                <div className="space-y-3">
                  <div className="rounded-[16px] ios-input-well p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 text-[13.5px] font-semibold">
                        <Cloud className="w-4 h-4 text-[#0A84FF]" />
                        Cloud Sync (Supabase)
                      </span>
                      <span className="text-[11px] font-medium text-[var(--text-secondary)]">
                        {cloudSyncStatus === 'synced'
                          ? 'Tersinkron'
                          : cloudSyncStatus === 'syncing'
                            ? 'Menyinkron...'
                            : cloudSyncStatus === 'error'
                              ? 'Gagal sync'
                              : cloudSyncStatus === 'offline'
                                ? 'Offline'
                                : 'Belum login'}
                      </span>
                    </div>

                    {cloudUser ? (
                      <div className="space-y-2">
                        <div className="text-[12px] text-[var(--text-secondary)] truncate">
                          Akun: <span className="text-[var(--text-primary)] font-medium">{cloudUser.email}</span>
                        </div>
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={async () => {
                              await syncNow();
                              showToast('Sinkronisasi Supabase selesai.');
                            }}
                            className="flex-1 py-2.5 px-3 rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] text-[12.5px] font-semibold flex items-center justify-center gap-1.5"
                          >
                            <RefreshCw className="w-3.5 h-3.5" /> Sync Sekarang
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              await signOutCloud();
                              showToast('Keluar dari akun cloud.');
                            }}
                            className="py-2.5 px-3 rounded-[12px] ios-card text-[12.5px] font-medium flex items-center justify-center gap-1.5"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Keluar
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        <button
                          type="button"
                          onClick={async () => {
                            const res = await signInWithGoogle();
                            if (!res.ok) showToast(res.error || 'Gagal login Google');
                          }}
                          className="w-full py-2.5 rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] text-[13px] font-semibold flex items-center justify-center gap-2"
                        >
                          <span className="font-bold">G</span> Masuk dengan Google
                        </button>
                        <div className="text-[11px] text-center text-[var(--text-tertiary)]">
                          atau pakai email
                        </div>
                        <input
                          type="email"
                          value={cloudEmail}
                          onChange={(e) => setCloudEmail(e.target.value)}
                          placeholder="Email..."
                          className="w-full rounded-[10px] ios-card px-3 py-2 text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
                        />
                        <input
                          type="password"
                          value={cloudPassword}
                          onChange={(e) => setCloudPassword(e.target.value)}
                          placeholder="Password..."
                          className="w-full rounded-[10px] ios-card px-3 py-2 text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
                        />
                        <div className="flex gap-2">
                          <button
                            type="button"
                            disabled={cloudAuthLoading || !cloudEmail || !cloudPassword}
                            onClick={async () => {
                              setCloudAuthLoading(true);
                              const res = await signInWithEmail(cloudEmail.trim(), cloudPassword);
                              setCloudAuthLoading(false);
                              showToast(res.ok ? 'Berhasil masuk & sync!' : res.error || 'Gagal masuk');
                            }}
                            className="flex-1 py-2.5 rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] text-[12.5px] font-semibold disabled:opacity-50"
                          >
                            Masuk
                          </button>
                          <button
                            type="button"
                            disabled={cloudAuthLoading || !cloudEmail || !cloudPassword}
                            onClick={async () => {
                              setCloudAuthLoading(true);
                              const res = await signUpWithEmail(cloudEmail.trim(), cloudPassword);
                              setCloudAuthLoading(false);
                              showToast(res.ok ? 'Akun dibuat! Cek email / login.' : res.error || 'Gagal daftar');
                            }}
                            className="flex-1 py-2.5 rounded-[12px] ios-card text-[12.5px] font-medium disabled:opacity-50"
                          >
                            Daftar
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      exportBackupJSON();
                      showToast('Cadangan JSON diunduh.');
                    }}
                    className="w-full py-3.5 px-4 rounded-[14px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-semibold flex items-center justify-center gap-2"
                  >
                    <Download className="w-4 h-4" /> Ekspor Cadangan (JSON)
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full py-3.5 px-4 rounded-[14px] ios-input-well font-medium flex items-center justify-center gap-2"
                  >
                    <Upload className="w-4 h-4" /> Impor Cadangan (JSON)
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      resetAllData(true);
                      setActiveModal(null);
                      showToast('Semua transaksi dikosongkan.');
                    }}
                    className="w-full py-3.5 px-4 rounded-[14px] font-semibold flex items-center justify-center gap-2"
                    style={{
                      backgroundColor: 'rgba(255,69,58,0.14)',
                      color: 'var(--sys-red)',
                    }}
                  >
                    <Trash2 className="w-4 h-4" /> Kosongkan Semua Transaksi
                  </button>
                </div>
              )}

              {activeModal === 'pin' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between rounded-[14px] ios-input-well px-4 py-3">
                    <span className="text-[15px] font-medium">Aktifkan Kunci PIN</span>
                    <IosSwitch
                      checked={settings.pinEnabled}
                      onChange={() => updateSettings({ pinEnabled: !settings.pinEnabled })}
                    />
                  </div>
                  <label className="block rounded-[14px] ios-input-well px-4 py-3">
                    <span className="text-[11.5px] text-[var(--text-secondary)] block mb-1">
                      PIN 4 Digit
                    </span>
                    <input
                      type="password"
                      maxLength={4}
                      inputMode="numeric"
                      value={pinDraft}
                      onChange={(e) => setPinDraft(e.target.value.replace(/\D/g, '').slice(0, 4))}
                      className="w-full bg-transparent text-xl font-bold tracking-[0.5em] outline-none"
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (pinDraft.length === 4) {
                        updateSettings({ pinCode: pinDraft });
                        setActiveModal(null);
                        showToast('PIN disimpan.');
                      }
                    }}
                    className="w-full py-3.5 rounded-[14px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-semibold"
                  >
                    Simpan PIN
                  </button>
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
