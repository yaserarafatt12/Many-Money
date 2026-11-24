import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  FileSpreadsheet,
  NotebookPen,
  Plus,
  Search,
  SlidersHorizontal,
  Star,
  Trash2,
  Wallet,
  X,
} from 'lucide-react';
import { MemoNote, Transaction, TransaksiSubTab } from '../types';
import { useMoneyStore } from '../store/useMoneyStore';
import { IosSegmentedControl } from '../components/IosSegmentedControl';
import { CategoryBadge } from '../components/CategoryIcon';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { STRINGS } from '../utils/i18n';
import {
  DAYS_SHORT_ID,
  MONTHS_SHORT_ID,
  exportTransactionsToCSV,
  formatCompactMoney,
  formatMonthYear,
  formatMoney,
  formatShortDateHeader,
  getMonthDaysGrid,
  parseISODate,
  toISODate,
} from '../utils/format';

interface TransaksiViewProps {
  subTab: TransaksiSubTab;
  onSubTabChange: (tab: TransaksiSubTab) => void;
  onAddTransaction: (defaultDate?: string) => void;
  onEditTransaction: (tx: Transaction) => void;
  memoModalTrigger: number;
}

const SUB_TABS: { id: TransaksiSubTab; label: string }[] = [
  { id: 'harian', label: 'Harian' },
  { id: 'kalender', label: 'Kalender' },
  { id: 'bulanan', label: 'Bulanan' },
  { id: 'ringkasan', label: 'Ringkas' },
  { id: 'deskripsi', label: 'Memo' },
];

export const TransaksiView: React.FC<TransaksiViewProps> = ({
  subTab,
  onSubTabChange,
  onAddTransaction,
  onEditTransaction,
  memoModalTrigger,
}) => {
  const {
    transactions,
    categories,
    accounts,
    budgets,
    memos,
    settings,
    addMemo,
    updateMemo,
    deleteMemo,
  } = useMoneyStore();

  const dec = settings.showDecimals;
  const t = STRINGS[settings.language];
  const [exportConfirmOpen, setExportConfirmOpen] = useState(false);

  const now = new Date();
  const todayISO = toISODate(now);
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const currentDay = now.getDate();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();

  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [onlyFavorites, setOnlyFavorites] = useState(false);
  const [filterModalOpen, setFilterModalOpen] = useState(false);
  const [filterTab, setFilterTab] = useState<'income' | 'expense' | 'account'>('income');
  const [selectedIncomeCats, setSelectedIncomeCats] = useState<string[]>([]);
  const [selectedExpenseCats, setSelectedExpenseCats] = useState<string[]>([]);
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>([]);
  const [selectedCalDate, setSelectedCalDate] = useState<string | null>(null);
  const [expandedMonth, setExpandedMonth] = useState<number>(currentMonth);

  const [memoModalOpen, setMemoModalOpen] = useState(false);
  const [editingMemo, setEditingMemo] = useState<MemoNote | null>(null);
  const [memoTitle, setMemoTitle] = useState('');
  const [memoContent, setMemoContent] = useState('');
  const [memoDate, setMemoDate] = useState(todayISO);

  React.useEffect(() => {
    if (memoModalTrigger > 0) {
      openMemoModal();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memoModalTrigger]);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);
  const accMap = useMemo(() => new Map(accounts.map((a) => [a.id, a])), [accounts]);

  const shiftPeriod = (dir: -1 | 1) => {
    if (navigator.vibrate) navigator.vibrate(5);
    if (subTab === 'bulanan') {
      setYear((y) => y + dir);
      return;
    }
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const basePeriodTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const d = parseISODate(tx.date);
      return subTab === 'bulanan'
        ? d.getFullYear() === year
        : d.getFullYear() === year && d.getMonth() === month;
    });
  }, [transactions, year, month, subTab]);

  const hasActiveFilter =
    selectedIncomeCats.length > 0 ||
    selectedExpenseCats.length > 0 ||
    selectedAccounts.length > 0;

  const periodTransactions = useMemo(() => {
    return basePeriodTransactions.filter((tx) => {
      if (onlyFavorites && !tx.isFavorite) return false;
      if (selectedAccounts.length > 0 && !selectedAccounts.includes(tx.accountId)) return false;
      if (
        tx.type === 'income' &&
        selectedIncomeCats.length > 0 &&
        !selectedIncomeCats.includes(tx.categoryId)
      ) {
        return false;
      }
      if (
        tx.type === 'expense' &&
        selectedExpenseCats.length > 0 &&
        !selectedExpenseCats.includes(tx.categoryId)
      ) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const catName = catMap.get(tx.categoryId)?.name.toLowerCase() || '';
        const matchText =
          tx.title.toLowerCase().includes(q) ||
          (tx.description || '').toLowerCase().includes(q) ||
          catName.includes(q);
        if (!matchText) return false;
      }
      return true;
    });
  }, [
    basePeriodTransactions,
    onlyFavorites,
    selectedAccounts,
    selectedIncomeCats,
    selectedExpenseCats,
    searchQuery,
    catMap,
  ]);

  const totals = useMemo(() => {
    let income = 0;
    let expense = 0;
    for (const tx of periodTransactions) {
      if (tx.type === 'income') income += tx.amount;
      if (tx.type === 'expense') expense += tx.amount;
    }
    return { income, expense, net: income - expense };
  }, [periodTransactions]);

  const expenseRatio =
    totals.income > 0 ? Math.min(100, Math.round((totals.expense / totals.income) * 100)) : 0;
  const savedPct = totals.income > 0 ? Math.max(0, 100 - expenseRatio) : 0;

  const savedColor =
    savedPct >= 50
      ? 'var(--sys-green)'
      : savedPct >= 25
        ? 'var(--sys-orange)'
        : 'var(--sys-red)';

  const groupedByDate = useMemo(() => {
    const map = new Map<string, Transaction[]>();
    const sorted = [...periodTransactions].sort((a, b) =>
      `${b.date} ${b.time}`.localeCompare(`${a.date} ${a.time}`)
    );
    for (const tx of sorted) {
      const arr = map.get(tx.date) || [];
      arr.push(tx);
      map.set(tx.date, arr);
    }
    return Array.from(map.entries()).map(([date, list]) => {
      let inc = 0;
      let exp = 0;
      for (const tx of list) {
        if (tx.type === 'income') inc += tx.amount;
        if (tx.type === 'expense') exp += tx.amount;
      }
      return { date, list, inc, exp };
    });
  }, [periodTransactions]);

  const dailyMap = useMemo(() => {
    const m = new Map<string, { inc: number; exp: number; list: Transaction[] }>();
    for (const tx of periodTransactions) {
      const entry = m.get(tx.date) || { inc: 0, exp: 0, list: [] };
      if (tx.type === 'income') entry.inc += tx.amount;
      if (tx.type === 'expense') entry.exp += tx.amount;
      entry.list.push(tx);
      m.set(tx.date, entry);
    }
    return m;
  }, [periodTransactions]);

  const calendarDays = useMemo(() => getMonthDaysGrid(year, month), [year, month]);

  const monthlyBreakdown = useMemo(() => {
    return Array.from({ length: 12 }, (_, idx) => 11 - idx).map((mIdx) => {
      const mTxs = periodTransactions.filter((t) => parseISODate(t.date).getMonth() === mIdx);
      let inc = 0;
      let exp = 0;
      for (const tx of mTxs) {
        if (tx.type === 'income') inc += tx.amount;
        if (tx.type === 'expense') exp += tx.amount;
      }
      const daysInMonth = new Date(year, mIdx + 1, 0).getDate();
      const weeks: { label: string; inc: number; exp: number; isCurrentWeek: boolean }[] = [];
      for (let start = 1; start <= daysInMonth; start += 7) {
        const end = Math.min(daysInMonth, start + 6);
        let wInc = 0;
        let wExp = 0;
        for (const tx of mTxs) {
          const day = parseISODate(tx.date).getDate();
          if (day >= start && day <= end) {
            if (tx.type === 'income') wInc += tx.amount;
            if (tx.type === 'expense') wExp += tx.amount;
          }
        }
        const pad = (n: number) => String(n).padStart(2, '0');
        const mPad = pad(mIdx + 1);
        const isCurrentWeek =
          year === currentYear &&
          mIdx === currentMonth &&
          start <= currentDay &&
          end >= currentDay;
        weeks.push({
          label: `${pad(start)}/${mPad} – ${pad(end)}/${mPad}`,
          inc: wInc,
          exp: wExp,
          isCurrentWeek,
        });
      }
      return {
        monthIndex: mIdx,
        name: MONTHS_SHORT_ID[mIdx],
        range: `01/${String(mIdx + 1).padStart(2, '0')} – ${daysInMonth}/${String(mIdx + 1).padStart(
          2,
          '0'
        )}`,
        inc,
        exp,
        weeks: weeks.reverse(),
      };
    });
  }, [periodTransactions, year]);

  const totalBudget = budgets.find((b) => b.categoryId === 'total')?.amount || 0;
  const budgetPct =
    totalBudget > 0 ? Math.min(100, Math.round((totals.expense / totalBudget) * 100)) : 0;
  const budgetColor =
    budgetPct >= 90
      ? 'var(--sys-red)'
      : budgetPct >= 65
        ? 'var(--sys-orange)'
        : 'var(--sys-green)';
  const todayDayPct = Math.round((currentDay / daysInCurrentMonth) * 100);

  const openMemoModal = (memo?: MemoNote) => {
    if (memo) {
      setEditingMemo(memo);
      setMemoTitle(memo.title);
      setMemoContent(memo.content);
      setMemoDate(memo.date);
    } else {
      setEditingMemo(null);
      setMemoTitle('');
      setMemoContent('');
      setMemoDate(toISODate(new Date()));
    }
    setMemoModalOpen(true);
  };

  const handleSaveMemo = () => {
    if (!memoTitle.trim() && !memoContent.trim()) return;
    if (editingMemo) {
      updateMemo(editingMemo.id, {
        title: memoTitle.trim() || 'Catatan',
        content: memoContent,
        date: memoDate,
      });
    } else {
      addMemo({
        title: memoTitle.trim() || 'Catatan',
        content: memoContent,
        date: memoDate,
      });
    }
    setMemoModalOpen(false);
  };

  const selectedCalTransactions = selectedCalDate ? dailyMap.get(selectedCalDate)?.list || [] : [];

  const isDark = settings.theme === 'dark';

  const filterSummary = useMemo(() => {
    let totalInc = 0;
    let totalExp = 0;
    let selInc = 0;
    let selExp = 0;
    const catTotals = new Map<string, number>();
    const accTotals = new Map<string, number>();

    for (const tx of basePeriodTransactions) {
      if (tx.type === 'income') {
        totalInc += tx.amount;
        catTotals.set(tx.categoryId, (catTotals.get(tx.categoryId) || 0) + tx.amount);
        if (selectedIncomeCats.includes(tx.categoryId)) selInc += tx.amount;
      } else if (tx.type === 'expense') {
        totalExp += tx.amount;
        catTotals.set(tx.categoryId, (catTotals.get(tx.categoryId) || 0) + tx.amount);
        if (selectedExpenseCats.includes(tx.categoryId)) selExp += tx.amount;
      }
      accTotals.set(
        tx.accountId,
        (accTotals.get(tx.accountId) || 0) + (tx.type === 'income' ? tx.amount : -tx.amount)
      );
    }

    const incPct =
      totalInc > 0 && selectedIncomeCats.length > 0 ? Math.round((selInc / totalInc) * 100) : 0;
    const expPct =
      totalExp > 0 && selectedExpenseCats.length > 0 ? Math.round((selExp / totalExp) * 100) : 0;

    return {
      totalInc,
      totalExp,
      netTotal: totalInc - totalExp,
      incPct,
      expPct,
      catTotals,
      accTotals,
    };
  }, [basePeriodTransactions, selectedIncomeCats, selectedExpenseCats]);

  return (
    <div className="px-4 pt-5 pb-32">
      {/* Clean Borderless iOS Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-0.5 -ml-1.5">
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:opacity-50 transition"
            aria-label="Periode sebelumnya"
          >
            <ChevronLeft className="w-[19px] h-[19px]" />
          </button>
          <span className="text-[16px] font-bold tracking-[-0.015em] px-1">
            {subTab === 'bulanan' ? String(year) : formatMonthYear(year, month)}
          </span>
          <button
            type="button"
            onClick={() => shiftPeriod(1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:opacity-50 transition"
            aria-label="Periode berikutnya"
          >
            <ChevronRight className="w-[19px] h-[19px]" />
          </button>
        </div>

        {/* Tempered Glass Action Pill for Search, Star, Filter */}
        <div
          className="flex items-center gap-1 p-1 rounded-full border"
          style={{
            background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.78)',
            borderColor: isDark ? 'rgba(255,255,255,0.14)' : 'rgba(15,23,42,0.08)',
            backdropFilter: 'blur(20px) saturate(180%)',
            WebkitBackdropFilter: 'blur(20px) saturate(180%)',
            boxShadow: isDark
              ? 'inset 0 1px 0 rgba(255,255,255,0.14), 0 4px 12px rgba(0,0,0,0.25)'
              : 'inset 0 1px 0 rgba(255,255,255,0.9), 0 4px 12px rgba(15,23,42,0.06)',
          }}
        >
          <button
            type="button"
            onClick={() => setShowSearch((s) => !s)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
              showSearch
                ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--ios-fill-secondary)]'
            }`}
            aria-label="Cari transaksi"
          >
            <Search className="w-[18px] h-[18px]" />
          </button>
          <button
            type="button"
            onClick={() => setOnlyFavorites((v) => !v)}
            className={`w-9 h-9 rounded-full flex items-center justify-center transition ${
              onlyFavorites
                ? 'bg-[var(--accent-primary)] text-[var(--sys-orange)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--ios-fill-secondary)]'
            }`}
            aria-label="Filter favorit"
          >
            <Star className={`w-[18px] h-[18px] ${onlyFavorites ? 'fill-current' : ''}`} />
          </button>
          <button
            type="button"
            onClick={() => setFilterModalOpen(true)}
            className={`relative w-9 h-9 rounded-full flex items-center justify-center transition ${
              hasActiveFilter
                ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                : 'text-[var(--text-primary)] hover:bg-[var(--ios-fill-secondary)]'
            }`}
            aria-label="Filter transaksi"
          >
            <SlidersHorizontal className="w-[18px] h-[18px]" />
            {hasActiveFilter && (
              <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-[#0A84FF]" />
            )}
          </button>
        </div>
      </div>

      {/* Collapsible iOS Search */}
      <AnimatePresence>
        {showSearch && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden mb-3"
          >
            <div className="flex items-center gap-2 rounded-[12px] ios-input-well px-3 py-2">
              <Search className="w-4 h-4 text-[var(--text-tertiary)] shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari transaksi atau kategori"
                className="w-full bg-transparent text-[14px] outline-none placeholder:text-[var(--text-tertiary)]"
              />
              {searchQuery && (
                <button type="button" onClick={() => setSearchQuery('')}>
                  <X className="w-4 h-4 text-[var(--text-tertiary)]" />
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Borderless Apple Wallet Hero Balance Block (Straight on Canvas — No Heavy Box!) */}
      {subTab !== 'deskripsi' && (
        <div className="px-1 pt-1 pb-5">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[13px] font-medium text-[var(--text-secondary)]">
              Saldo Periode
            </span>
            {totals.income > 0 && (
              <span
                className="text-[12px] font-semibold tabular-nums"
                style={{ color: savedColor }}
              >
                {savedPct}% tersisa
              </span>
            )}
          </div>

          <div className="text-[40px] font-bold tabular-nums tracking-[-0.035em] leading-[1.08] mb-3.5">
            {formatMoney(totals.net, settings.currency, true, dec)}
          </div>

          {/* Slim 4px Apple Progress Track */}
          <div className="h-[4px] w-full rounded-full ios-input-well overflow-hidden mb-3">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max(3, savedPct)}%`,
                backgroundColor: savedColor,
              }}
            />
          </div>

          {/* Clean Inline Cashflow Strip */}
          <div className="flex items-center justify-between text-[13px] tabular-nums">
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">Masuk</span>
              <span className="font-semibold" style={{ color: 'var(--sys-green)' }}>
                {formatMoney(totals.income, settings.currency, true, dec)}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="text-[var(--text-secondary)]">Keluar</span>
              <span className="font-semibold" style={{ color: 'var(--sys-red)' }}>
                {formatMoney(totals.expense, settings.currency, true, dec)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Compact Native iOS Segmented Control */}
      <div className="mb-5">
        <IosSegmentedControl
          options={SUB_TABS}
          value={subTab}
          onChange={onSubTabChange}
          layoutId="transaksi-ios-seg"
        />
      </div>

      {/* SUB-TAB CONTENT */}
      <AnimatePresence mode="wait">
        {/* 1. HARIAN — Authentic iOS Grouped TableView */}
        {subTab === 'harian' && (
          <motion.div
            key="harian"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="space-y-5"
          >
            {groupedByDate.length === 0 ? (
              <div className="ios-card p-10 text-center">
                <Wallet className="w-7 h-7 text-[var(--text-tertiary)] mx-auto mb-2.5" />
                <p className="font-semibold text-[15px] mb-1">Belum ada transaksi</p>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  Tap tombol + di kanan bawah untuk mencatat transaksi.
                </p>
              </div>
            ) : (
              groupedByDate.map(({ date, list, inc, exp }) => {
                const hdr = formatShortDateHeader(date);
                return (
                  <section key={date}>
                    {/* Clean iOS Section Header */}
                    <div className="flex items-baseline justify-between px-1.5 mb-2">
                      <span className="text-[13px] font-semibold text-[var(--text-secondary)]">
                        {hdr.dayNum} {hdr.monthShort} ·{' '}
                        <span style={{ color: hdr.isSunday ? 'var(--sys-red)' : undefined }}>
                          {hdr.dayFull}
                        </span>
                      </span>
                      <div className="flex items-center gap-2.5 text-[12.5px] font-medium tabular-nums">
                        {inc > 0 && (
                          <span style={{ color: 'var(--sys-green)' }}>
                            +{formatMoney(inc, settings.currency, false, dec)}
                          </span>
                        )}
                        {exp > 0 && (
                          <span className="text-[var(--text-secondary)]">
                            -{formatMoney(exp, settings.currency, false, dec)}
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Clean iOS Grouped Surface with Native Inset Hairlines */}
                    <div className="ios-card overflow-hidden">
                      {list.map((tx, idx) => {
                        const cat = catMap.get(tx.categoryId);
                        const acc = accMap.get(tx.accountId);
                        const toAcc = tx.toAccountId ? accMap.get(tx.toAccountId) : undefined;
                        return (
                          <div key={tx.id}>
                            <button
                              type="button"
                              onClick={() => onEditTransaction(tx)}
                              className="w-full px-3.5 py-3 flex items-center gap-3 text-left active:bg-[var(--ios-fill-secondary)] transition"
                            >
                              <CategoryBadge categoryId={tx.categoryId} type={tx.type} />
                              <div className="min-w-0 flex-1">
                                <div className="text-[15px] font-medium tracking-[-0.01em] truncate">
                                  {tx.title}
                                </div>
                                <div className="text-[12.5px] text-[var(--text-secondary)] truncate flex items-center gap-1">
                                  <span className="truncate">
                                    {tx.type === 'transfer'
                                      ? `${acc?.name || 'Akun'} → ${toAcc?.name || 'Akun'}`
                                      : `${cat?.name || 'Kategori'} · ${acc?.name || 'Tunai'}`}
                                  </span>
                                  {tx.isFavorite && (
                                    <>
                                      <span>·</span>
                                      <Star
                                        className="w-3 h-3 fill-current shrink-0 inline"
                                        style={{ color: 'var(--sys-orange)' }}
                                      />
                                    </>
                                  )}
                                </div>
                              </div>
                              <div
                                className="text-[15px] font-semibold tabular-nums shrink-0"
                                style={{
                                  color:
                                    tx.type === 'income'
                                      ? 'var(--sys-green)'
                                      : tx.type === 'transfer'
                                        ? 'var(--sys-blue)'
                                        : 'var(--text-primary)',
                                }}
                              >
                                {tx.type === 'income' ? '+' : tx.type === 'expense' ? '-' : ''}
                                {formatMoney(tx.amount, settings.currency, true, dec)}
                              </div>
                            </button>
                            {idx < list.length - 1 && (
                              <div
                                className="h-[0.5px] ml-[66px]"
                                style={{ backgroundColor: 'var(--ios-separator)' }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </section>
                );
              })
            )}
          </motion.div>
        )}

        {/* 2. KALENDER */}
        {subTab === 'kalender' && (
          <motion.div
            key="kalender"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="space-y-4"
          >
            <div className="ios-card overflow-hidden">
              <div
                className="grid grid-cols-7 text-center py-2.5 border-b"
                style={{ borderColor: 'var(--ios-separator)' }}
              >
                {DAYS_SHORT_ID.map((d, i) => (
                  <span
                    key={d}
                    className="text-[11px] font-semibold uppercase tracking-wide"
                    style={{ color: i === 0 ? 'var(--sys-red)' : 'var(--text-tertiary)' }}
                  >
                    {d}
                  </span>
                ))}
              </div>

              <div className="grid grid-cols-7">
                {calendarDays.map((dayObj) => {
                  const iso = toISODate(dayObj);
                  const inMonth = dayObj.getMonth() === month;
                  const isToday = iso === todayISO;
                  const isSelected = selectedCalDate === iso;
                  const stat = dailyMap.get(iso);
                  const dow = dayObj.getDay();

                  return (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => setSelectedCalDate(iso)}
                      className={`min-h-[64px] p-1 flex flex-col justify-between text-left border-b border-r transition ${
                        isSelected
                          ? 'bg-[var(--ios-fill)]'
                          : inMonth
                            ? 'active:bg-[var(--ios-fill-secondary)]'
                            : 'opacity-28'
                      }`}
                      style={{ borderColor: 'var(--ios-separator)' }}
                    >
                      <span
                        className={`text-[11.5px] font-semibold px-1.5 py-0.5 rounded-full w-fit leading-none ${
                          isToday
                            ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                            : ''
                        }`}
                        style={{
                          color: !isToday && dow === 0 ? 'var(--sys-red)' : undefined,
                        }}
                      >
                        {dayObj.getDate() === 1
                          ? `1/${dayObj.getMonth() + 1}`
                          : dayObj.getDate()}
                      </span>

                      {stat && (
                        <div className="w-full text-right text-[9.5px] font-semibold tabular-nums leading-tight space-y-0.5">
                          {stat.inc > 0 && (
                            <div className="truncate" style={{ color: 'var(--sys-green)' }}>
                              +{formatCompactMoney(stat.inc, settings.currency)}
                            </div>
                          )}
                          {stat.exp > 0 && (
                            <div className="truncate" style={{ color: 'var(--sys-red)' }}>
                              -{formatCompactMoney(stat.exp, settings.currency)}
                            </div>
                          )}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {selectedCalDate && (
              <div className="ios-card p-4">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-[14px] font-semibold">{selectedCalDate}</span>
                  <button
                    type="button"
                    onClick={() => onAddTransaction(selectedCalDate)}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] text-[12px] font-semibold"
                  >
                    <Plus className="w-3.5 h-3.5" /> Tambah
                  </button>
                </div>
                {selectedCalTransactions.length === 0 ? (
                  <p className="text-[13px] text-[var(--text-secondary)]">
                    Tidak ada transaksi di tanggal ini.
                  </p>
                ) : (
                  <div className="divide-y ios-divider">
                    {selectedCalTransactions.map((tx) => (
                      <button
                        key={tx.id}
                        type="button"
                        onClick={() => onEditTransaction(tx)}
                        className="w-full py-2.5 flex items-center justify-between text-left"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CategoryBadge categoryId={tx.categoryId} type={tx.type} size="sm" />
                          <span className="text-[14px] font-medium truncate">{tx.title}</span>
                        </div>
                        <span
                          className="text-[14px] font-semibold tabular-nums"
                          style={{
                            color:
                              tx.type === 'income' ? 'var(--sys-green)' : 'var(--text-primary)',
                          }}
                        >
                          {formatMoney(tx.amount, settings.currency, true, dec)}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </motion.div>
        )}

        {/* 3. BULANAN */}
        {subTab === 'bulanan' && (
          <motion.div
            key="bulanan"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="ios-card overflow-hidden divide-y ios-divider"
          >
            {monthlyBreakdown.map((m) => {
              const isExpanded = expandedMonth === m.monthIndex;
              return (
                <div key={m.monthIndex}>
                  <button
                    type="button"
                    onClick={() => setExpandedMonth(isExpanded ? -1 : m.monthIndex)}
                    className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-[var(--ios-fill-secondary)] transition"
                  >
                    <div>
                      <div className="text-[15px] font-semibold">{m.name}</div>
                      <div className="text-[11.5px] text-[var(--text-tertiary)]">{m.range}</div>
                    </div>
                    <div className="flex items-center gap-4 text-right tabular-nums">
                      <div className="text-[13.5px] font-semibold" style={{ color: 'var(--sys-green)' }}>
                        {formatMoney(m.inc, settings.currency, true, dec)}
                      </div>
                      <div>
                        <div className="text-[13.5px] font-semibold" style={{ color: 'var(--sys-red)' }}>
                          {formatMoney(m.exp, settings.currency, true, dec)}
                        </div>
                        <div className="text-[11.5px] text-[var(--text-secondary)]">
                          {formatMoney(m.inc - m.exp, settings.currency, true, dec)}
                        </div>
                      </div>
                    </div>
                  </button>

                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden border-t ios-divider divide-y ios-divider"
                      >
                        {m.weeks.map((w) => (
                          <div
                            key={w.label}
                            className={`px-4 py-2.5 flex items-center justify-between text-[12.5px] tabular-nums ${
                              w.isCurrentWeek ? 'bg-[var(--ios-fill-secondary)]' : ''
                            }`}
                          >
                            <span className="font-medium text-[var(--text-secondary)]">{w.label}</span>
                            <div className="flex items-center gap-4 text-right">
                              <span style={{ color: 'var(--sys-green)' }}>
                                {formatMoney(w.inc, settings.currency, false, dec)}
                              </span>
                              <div>
                                <div style={{ color: 'var(--sys-red)' }}>
                                  {formatMoney(w.exp, settings.currency, false, dec)}
                                </div>
                                <div className="text-[11px] text-[var(--text-tertiary)]">
                                  {formatMoney(w.inc - w.exp, settings.currency, false, dec)}
                                </div>
                              </div>
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </motion.div>
        )}

        {/* 4. RINGKASAN */}
        {subTab === 'ringkasan' && (
          <motion.div
            key="ringkasan"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="space-y-4"
          >
            <div className="ios-card p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-[14px] font-semibold">Anggaran Bulanan</span>
                <span
                  className="text-[13px] font-bold tabular-nums"
                  style={{ color: budgetColor }}
                >
                  {budgetPct}%
                </span>
              </div>

              <div className="relative pt-5">
                <div
                  className="absolute top-0 -translate-x-1/2 text-[10px] font-semibold text-[var(--text-secondary)]"
                  style={{ left: `${todayDayPct}%` }}
                >
                  Hari ini
                </div>
                <div className="h-[6px] rounded-full ios-input-well overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${budgetPct}%`, backgroundColor: budgetColor }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-[1.5px] bg-[var(--text-tertiary)]"
                    style={{ left: `${todayDayPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[12.5px] tabular-nums mt-2.5 text-[var(--text-secondary)]">
                  <span>Limit {formatMoney(totalBudget, settings.currency, true, dec)}</span>
                  <span className="font-semibold text-[var(--text-primary)]">
                    Terpakai {formatMoney(totals.expense, settings.currency, true, dec)}
                  </span>
                </div>
              </div>
            </div>

            <div className="ios-card px-4 py-3.5 flex items-center justify-between">
              <span className="text-[14px] text-[var(--text-secondary)]">
                Pengeluaran Tunai & Bank
              </span>
              <span className="text-[15px] font-semibold tabular-nums">
                {formatMoney(totals.expense, settings.currency, true, dec)}
              </span>
            </div>

            <button
              type="button"
              onClick={() => setExportConfirmOpen(true)}
              className="w-full ios-card px-4 py-3.5 flex items-center justify-center gap-2 text-[14px] font-semibold active:opacity-70 transition"
              style={{ color: 'var(--sys-blue)' }}
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>{t.exportCsv}</span>
            </button>
          </motion.div>
        )}

        {/* 5. MEMO */}
        {subTab === 'deskripsi' && (
          <motion.div
            key="deskripsi"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="space-y-4"
          >
            {memos.length === 0 ? (
              <div className="ios-card p-10 text-center">
                <NotebookPen className="w-7 h-7 text-[var(--text-tertiary)] mx-auto mb-2.5" />
                <p className="font-semibold text-[15px] mb-1">Belum ada memo</p>
                <p className="text-[13px] text-[var(--text-secondary)]">
                  Tap tombol memo di kanan bawah untuk mencatat daftar belanja atau harga barang.
                </p>
              </div>
            ) : (
              memos.map((memo) => {
                const hdr = formatShortDateHeader(memo.date);
                const d = parseISODate(memo.date);
                return (
                  <div key={memo.id}>
                    <div className="text-[12.5px] font-medium text-[var(--text-secondary)] px-1.5 mb-1.5">
                      {hdr.dayFull}, {hdr.dayNum}/{String(d.getMonth() + 1).padStart(2, '0')}
                    </div>
                    <button
                      type="button"
                      onClick={() => openMemoModal(memo)}
                      className="w-full ios-card p-4 text-left active:opacity-80 transition"
                    >
                      <div className="text-[15.5px] font-semibold mb-1.5">{memo.title}</div>
                      <p className="text-[13.5px] text-[var(--text-secondary)] whitespace-pre-line leading-relaxed">
                        {memo.content}
                      </p>
                    </button>
                  </div>
                );
              })
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Frosted iOS Memo Bottom Sheet */}
      <AnimatePresence>
        {memoModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setMemoModalOpen(false)}
              className="absolute inset-0 bg-black/50 backdrop-blur-xs"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 360, damping: 34 }}
              className="relative z-10 w-full max-w-[430px] rounded-t-[28px] sm:rounded-[28px] ios-sheet p-5 pb-8"
            >
              <div className="w-9 h-1 rounded-full bg-[var(--text-tertiary)]/50 mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[17px] font-bold">
                  {editingMemo ? 'Edit Memo' : 'Memo Baru'}
                </h3>
                <div className="flex items-center gap-2">
                  {editingMemo && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteMemo(editingMemo.id);
                        setMemoModalOpen(false);
                      }}
                      className="w-8 h-8 rounded-full ios-input-well flex items-center justify-center"
                      style={{ color: 'var(--sys-red)' }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => setMemoModalOpen(false)}
                    className="w-8 h-8 rounded-full ios-input-well flex items-center justify-center text-[var(--text-secondary)]"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3 mb-5">
                <input
                  type="date"
                  value={memoDate}
                  onChange={(e) => setMemoDate(e.target.value)}
                  className="w-full rounded-[12px] ios-input-well px-3.5 py-2.5 text-[14px] font-medium outline-none"
                />
                <input
                  type="text"
                  value={memoTitle}
                  onChange={(e) => setMemoTitle(e.target.value)}
                  placeholder="Judul memo"
                  className="w-full rounded-[12px] ios-input-well px-3.5 py-2.5 text-[15px] font-semibold outline-none placeholder:text-[var(--text-tertiary)]"
                />
                <textarea
                  rows={5}
                  value={memoContent}
                  onChange={(e) => setMemoContent(e.target.value)}
                  placeholder="Tulis daftar belanja atau harga barang..."
                  className="w-full rounded-[12px] ios-input-well px-3.5 py-2.5 text-[14px] outline-none resize-none placeholder:text-[var(--text-tertiary)]"
                />
              </div>

              <button
                type="button"
                onClick={handleSaveMemo}
                className="w-full py-3.5 rounded-[14px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-semibold text-[15px] active:opacity-85 transition"
              >
                Simpan Memo
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
      {/* Filter Transaksi Modal (Money Manager Style) */}
      <AnimatePresence>
        {filterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setFilterModalOpen(false)}
              className="absolute inset-0 bg-black/60"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="relative z-10 w-full max-w-[430px] max-h-[90vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] ios-sheet overflow-hidden"
            >
              {/* Header */}
              <div
                className="px-4 pt-4 pb-3 flex items-center justify-between border-b shrink-0"
                style={{ borderColor: 'var(--ios-separator)' }}
              >
                <button
                  type="button"
                  onClick={() => setFilterModalOpen(false)}
                  className="w-8 h-8 rounded-full ios-input-well flex items-center justify-center"
                  aria-label="Tutup filter"
                >
                  <X className="w-4 h-4" />
                </button>
                <div className="inline-flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => shiftPeriod(-1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-secondary)]"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <span className="text-[15px] font-bold px-1">
                    {subTab === 'bulanan' ? String(year) : formatMonthYear(year, month)}
                  </span>
                  <button
                    type="button"
                    onClick={() => shiftPeriod(1)}
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--text-secondary)]"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSelectedIncomeCats([]);
                    setSelectedExpenseCats([]);
                    setSelectedAccounts([]);
                  }}
                  className="text-[13px] font-semibold px-2 py-1"
                  style={{ color: hasActiveFilter ? 'var(--sys-blue)' : 'var(--text-tertiary)' }}
                >
                  Reset
                </button>
              </div>

              {/* Instruction Banner */}
              <div className="px-4 py-2 text-[12.5px] font-medium bg-[#5856D6]/20 text-[var(--text-primary)] shrink-0">
                Silahkan pilih item yang ingin Anda filter
              </div>

              {/* Ring Progress Summary */}
              <div
                className="px-4 py-4 grid grid-cols-3 gap-2 items-center border-b shrink-0"
                style={{ borderColor: 'var(--ios-separator)' }}
              >
                {/* Pendapatan Ring */}
                <div className="flex flex-col items-center">
                  <span className="text-[11.5px] text-[var(--text-secondary)] mb-1.5">Pendapatan</span>
                  <div className="relative w-14 h-14 flex items-center justify-center mb-1.5">
                    <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="rgba(10,132,255,0.22)"
                        strokeWidth="3.2"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="#0A84FF"
                        strokeWidth="3.2"
                        strokeDasharray={`${filterSummary.incPct}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[12px] font-bold">{filterSummary.incPct}%</span>
                  </div>
                  <span className="text-[12px] font-semibold tabular-nums">
                    {formatMoney(filterSummary.totalInc, settings.currency, dec)}
                  </span>
                </div>

                {/* Pengeluaran Ring */}
                <div className="flex flex-col items-center">
                  <span className="text-[11.5px] text-[var(--text-secondary)] mb-1.5">Pengeluaran</span>
                  <div className="relative w-14 h-14 flex items-center justify-center mb-1.5">
                    <svg viewBox="0 0 36 36" className="w-14 h-14 -rotate-90">
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="rgba(255,69,58,0.22)"
                        strokeWidth="3.2"
                      />
                      <circle
                        cx="18"
                        cy="18"
                        r="15"
                        fill="none"
                        stroke="#FF453A"
                        strokeWidth="3.2"
                        strokeDasharray={`${filterSummary.expPct}, 100`}
                        strokeLinecap="round"
                      />
                    </svg>
                    <span className="absolute text-[12px] font-bold">{filterSummary.expPct}%</span>
                  </div>
                  <span className="text-[12px] font-semibold tabular-nums">
                    {formatMoney(filterSummary.totalExp, settings.currency, dec)}
                  </span>
                </div>

                {/* Total */}
                <div className="flex flex-col items-center justify-center">
                  <span className="text-[11.5px] text-[var(--text-secondary)] mb-1">Total</span>
                  <span className="text-[14px] font-bold tabular-nums text-center">
                    {formatMoney(filterSummary.netTotal, settings.currency, dec)}
                  </span>
                </div>
              </div>

              {/* 3 Tabs: Pendapatan | Pengeluaran | Aset */}
              <div
                className="grid grid-cols-3 border-b shrink-0"
                style={{ borderColor: 'var(--ios-separator)' }}
              >
                {[
                  { id: 'income' as const, label: 'Pendapatan' },
                  { id: 'expense' as const, label: 'Pengeluaran' },
                  { id: 'account' as const, label: 'Aset' },
                ].map((tb) => {
                  const active = filterTab === tb.id;
                  return (
                    <button
                      key={tb.id}
                      type="button"
                      onClick={() => setFilterTab(tb.id)}
                      className={`py-2.5 text-[13px] font-semibold border-b-2 transition ${
                        active
                          ? 'border-[#FF453A] text-[var(--text-primary)]'
                          : 'border-transparent text-[var(--text-secondary)]'
                      }`}
                    >
                      {tb.label}
                    </button>
                  );
                })}
              </div>

              {/* Checklist */}
              <div className="flex-1 overflow-y-auto no-scrollbar divide-y ios-divider">
                {(() => {
                  const listItems =
                    filterTab === 'account'
                      ? accounts.map((a) => ({
                          id: a.id,
                          name: a.name,
                          amount: filterSummary.accTotals.get(a.id) || 0,
                          isAccount: true,
                        }))
                      : categories
                          .filter((c) => c.type === filterTab)
                          .map((c) => ({
                            id: c.id,
                            name: c.name,
                            amount: filterSummary.catTotals.get(c.id) || 0,
                            isAccount: false,
                          }));

                  const currentSel =
                    filterTab === 'income'
                      ? selectedIncomeCats
                      : filterTab === 'expense'
                        ? selectedExpenseCats
                        : selectedAccounts;

                  const setCurrentSel =
                    filterTab === 'income'
                      ? setSelectedIncomeCats
                      : filterTab === 'expense'
                        ? setSelectedExpenseCats
                        : setSelectedAccounts;

                  const allSelected =
                    listItems.length > 0 && listItems.every((it) => currentSel.includes(it.id));

                  return (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          if (allSelected) {
                            setCurrentSel([]);
                          } else {
                            setCurrentSel(listItems.map((it) => it.id));
                          }
                        }}
                        className="w-full px-4 py-3 flex items-center justify-between text-[13.5px] active:bg-[var(--ios-fill-secondary)]"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`w-5 h-5 rounded-[6px] border flex items-center justify-center ${
                              allSelected
                                ? 'bg-[var(--accent-primary)] border-transparent text-[var(--accent-primary-fg)]'
                                : 'border-[var(--text-tertiary)]'
                            }`}
                          >
                            {allSelected && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                          </span>
                          <span className="font-semibold">Pilih semua</span>
                        </div>
                        <span className="text-[12.5px] text-[var(--text-secondary)]">Total</span>
                      </button>

                      {listItems.map((item) => {
                        const checked = currentSel.includes(item.id);
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() =>
                              setCurrentSel((prev) =>
                                prev.includes(item.id)
                                  ? prev.filter((x) => x !== item.id)
                                  : [...prev, item.id]
                              )
                            }
                            className="w-full px-4 py-3 flex items-center justify-between text-[13.5px] active:bg-[var(--ios-fill-secondary)]"
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <span
                                className={`w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 ${
                                  checked
                                    ? 'bg-[var(--accent-primary)] border-transparent text-[var(--accent-primary-fg)]'
                                    : 'border-[var(--text-tertiary)]'
                                }`}
                              >
                                {checked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                              </span>
                              {item.isAccount ? (
                                <Wallet className="w-4 h-4 text-[var(--text-secondary)] shrink-0" />
                              ) : (
                                <CategoryBadge
                                  categoryId={item.id}
                                  type={filterTab === 'income' ? 'income' : 'expense'}
                                  size="sm"
                                />
                              )}
                              <span className="font-medium truncate">{item.name}</span>
                            </div>
                            <span className="text-[13px] font-semibold tabular-nums shrink-0 ml-2">
                              {item.amount !== 0
                                ? formatMoney(item.amount, settings.currency, dec)
                                : '-'}
                            </span>
                          </button>
                        );
                      })}
                    </>
                  );
                })()}
              </div>

              <div
                className="px-4 py-3 border-t shrink-0"
                style={{ borderColor: 'var(--ios-separator)' }}
              >
                <button
                  type="button"
                  onClick={() => setFilterModalOpen(false)}
                  className="w-full py-3 rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-bold text-[14.5px]"
                >
                  Terapkan Filter
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      <ConfirmDialog
        open={exportConfirmOpen}
        title={t.exportConfirmTitle}
        description={t.exportConfirmDesc}
        confirmLabel={t.confirmExport}
        cancelLabel={t.cancel}
        onCancel={() => setExportConfirmOpen(false)}
        onConfirm={() => {
          exportTransactionsToCSV(periodTransactions, categories, accounts, settings.currency);
          setExportConfirmOpen(false);
        }}
      />
    </div>
  );
};
