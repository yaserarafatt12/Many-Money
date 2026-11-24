import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, Lock } from 'lucide-react';
import { MainTab, Transaction, TransaksiSubTab } from './types';
import { MoneyProvider, useMoneyStore } from './store/useMoneyStore';
import { getCanvasColor } from './utils/themePresets';
import { toISODate } from './utils/format';
import { STRINGS } from './utils/i18n';
import { LiquidBottomNav } from './components/LiquidBottomNav';
import { TransactionModal } from './components/TransactionModal';
import { OnboardingModal } from './components/OnboardingModal';
import { TransaksiView } from './views/TransaksiView';
import { StatistikView } from './views/StatistikView';
import { AsetView } from './views/AsetView';
import { LainnyaView } from './views/LainnyaView';

const AppShell: React.FC = () => {
  const { settings, transactions } = useMoneyStore();
  const isLight = settings.theme === 'light';
  const t = STRINGS[settings.language];

  const [activeTab, setActiveTab] = useState<MainTab>('transaksi');
  const [transaksiSubTab, setTransaksiSubTab] = useState<TransaksiSubTab>('harian');
  const [memoModalTrigger, setMemoModalTrigger] = useState(0);

  const [txModalOpen, setTxModalOpen] = useState(false);
  const [autoStartVoice, setAutoStartVoice] = useState(false);
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [defaultTxDate, setDefaultTxDate] = useState<string | undefined>(undefined);
  const [unlocked, setUnlocked] = useState(() => !settings.pinEnabled);
  const [pinInput, setPinInput] = useState('');
  const [reminderDismissedDate, setReminderDismissedDate] = useState<string | null>(null);
  const [showReminderBanner, setShowReminderBanner] = useState(false);

  // Local time 21:00 daily reminder check
  useEffect(() => {
    const checkReminder = () => {
      if (!settings.reminderEnabled || !settings.hasOnboarded) {
        setShowReminderBanner(false);
        return;
      }
      const now = new Date();
      const todayStr = toISODate(now);
      if (reminderDismissedDate === todayStr) {
        setShowReminderBanner(false);
        return;
      }
      const [rh, rm] = (settings.reminderTime || '21:00').split(':').map(Number);
      const isPastReminderTime =
        now.getHours() > (rh || 21) ||
        (now.getHours() === (rh || 21) && now.getMinutes() >= (rm || 0));
      const hasLoggedToday = transactions.some((tx) => tx.date === todayStr);

      if (isPastReminderTime && !hasLoggedToday) {
        setShowReminderBanner(true);
        const notifKey = `many-money-notified-${todayStr}`;
        if (
          'Notification' in window &&
          Notification.permission === 'granted' &&
          !localStorage.getItem(notifKey)
        ) {
          try {
            new Notification('Many Money', { body: t.reminderBannerTitle });
            localStorage.setItem(notifKey, '1');
          } catch {
            // ignore
          }
        }
      } else {
        setShowReminderBanner(false);
      }
    };
    checkReminder();
    const id = setInterval(checkReminder, 60_000);
    return () => clearInterval(id);
  }, [
    settings.reminderEnabled,
    settings.reminderTime,
    settings.hasOnboarded,
    transactions,
    reminderDismissedDate,
    t.reminderBannerTitle,
  ]);

  const handleOpenAdd = (date?: string, startVoice = false) => {
    setEditingTx(null);
    setDefaultTxDate(date);
    setAutoStartVoice(startVoice);
    setTxModalOpen(true);
  };

  const handleOpenEdit = (tx: Transaction) => {
    setEditingTx(tx);
    setDefaultTxDate(undefined);
    setAutoStartVoice(false);
    setTxModalOpen(true);
  };

  const handlePrimaryDockAction = () => {
    if (activeTab === 'transaksi' && transaksiSubTab === 'deskripsi') {
      setMemoModalTrigger((n) => n + 1);
    } else {
      handleOpenAdd();
    }
  };

  const handlePinDigit = (d: string) => {
    const next = (pinInput + d).slice(0, 4);
    setPinInput(next);
    if (next.length === 4) {
      if (next === settings.pinCode) {
        setUnlocked(true);
        setPinInput('');
      } else {
        setTimeout(() => setPinInput(''), 250);
      }
    }
  };

  const canvasColor = getCanvasColor(settings.bgPreset);

  if (settings.pinEnabled && !unlocked) {
    return (
      <div
        className="min-h-screen flex items-center justify-center p-6 transition-colors duration-300"
        style={{ backgroundColor: canvasColor }}
      >
        <div className="w-full max-w-[340px] ios-card rounded-[28px] p-6 text-center">
          <div className="w-12 h-12 rounded-full ios-input-well flex items-center justify-center mx-auto mb-3">
            <Lock className="w-5 h-5" />
          </div>
          <h1 className="text-[19px] font-bold mb-1">Many Money Terkunci</h1>
          <p className="text-[13px] text-[var(--text-secondary)] mb-5">
            Masukkan 4 digit PIN kamu
          </p>
          <div className="flex justify-center gap-3 mb-6">
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full transition ${
                  i < pinInput.length
                    ? 'bg-[var(--accent-primary)] scale-110'
                    : 'ios-input-well'
                }`}
              />
            ))}
          </div>
          <div className="grid grid-cols-3 gap-2.5">
            {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((k, idx) =>
              k === '' ? (
                <div key={idx} />
              ) : (
                <button
                  key={k}
                  type="button"
                  onClick={() =>
                    k === '⌫' ? setPinInput((p) => p.slice(0, -1)) : handlePinDigit(k)
                  }
                  className="py-3 rounded-2xl ios-input-well text-[18px] font-bold active:opacity-70 transition"
                >
                  {k}
                </button>
              )
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-screen flex justify-center relative transition-colors duration-300"
      style={{
        backgroundColor: canvasColor,
        paddingTop: 'max(16px, env(safe-area-inset-top, 16px))',
        paddingBottom: 'env(safe-area-inset-bottom, 0px)',
      }}
    >
      <main className="w-full max-w-[430px] min-h-screen relative z-10">
        {showReminderBanner && (
          <div className="px-4 pt-3">
            <div className="ios-card px-3.5 py-2.5 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <Bell className="w-4 h-4 shrink-0" style={{ color: 'var(--sys-orange)' }} />
                <div className="min-w-0">
                  <div className="text-[13px] font-semibold truncate">{t.reminderBannerTitle}</div>
                  <div className="text-[11px] text-[var(--text-secondary)]">
                    {t.reminderBannerSub} {settings.reminderTime}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setReminderDismissedDate(toISODate(new Date()))}
                  className="px-2.5 py-1 rounded-full text-[11.5px] font-medium text-[var(--text-secondary)]"
                >
                  {t.dismiss}
                </button>
                <button
                  type="button"
                  onClick={() => handleOpenAdd()}
                  className="px-3 py-1 rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] text-[12px] font-semibold"
                >
                  {t.logNow}
                </button>
              </div>
            </div>
          </div>
        )}
        <AnimatePresence mode="wait">
          {activeTab === 'transaksi' && (
            <motion.div
              key="transaksi"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              <TransaksiView
                subTab={transaksiSubTab}
                onSubTabChange={setTransaksiSubTab}
                onAddTransaction={handleOpenAdd}
                onEditTransaction={handleOpenEdit}
                memoModalTrigger={memoModalTrigger}
              />
            </motion.div>
          )}
          {activeTab === 'statistik' && (
            <motion.div
              key="statistik"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              <StatistikView />
            </motion.div>
          )}
          {activeTab === 'aset' && (
            <motion.div
              key="aset"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              <AsetView />
            </motion.div>
          )}
          {activeTab === 'lainnya' && (
            <motion.div
              key="lainnya"
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.16 }}
            >
              <LainnyaView />
            </motion.div>
          )}
        </AnimatePresence>

        <LiquidBottomNav
          activeTab={activeTab}
          onChange={setActiveTab}
          onPrimaryAction={handlePrimaryDockAction}
          onLongPressPrimary={() => handleOpenAdd(undefined, true)}
          showPrimaryAction={activeTab === 'transaksi'}
          primaryActionKind={
            activeTab === 'transaksi' && transaksiSubTab === 'deskripsi' ? 'memo' : 'transaction'
          }
          isLight={isLight}
          language={settings.language}
        />

        <TransactionModal
          open={txModalOpen}
          editingTx={editingTx}
          defaultDate={defaultTxDate}
          autoStartVoice={autoStartVoice}
          onClose={() => {
            setTxModalOpen(false);
            setAutoStartVoice(false);
          }}
        />

        <OnboardingModal />
      </main>
    </div>
  );
};

export function App() {
  return (
    <MoneyProvider>
      <AppShell />
    </MoneyProvider>
  );
}

export default App;
