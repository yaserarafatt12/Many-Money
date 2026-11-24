import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDownUp,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Sliders,
  X,
} from 'lucide-react';
import { StatistikSubTab, StatsPeriodMode } from '../types';
import { useMoneyStore } from '../store/useMoneyStore';
import { IosSegmentedControl } from '../components/IosSegmentedControl';
import { CATEGORY_ACCENTS, CategoryBadge, CategoryIcon } from '../components/CategoryIcon';
import { MONTHS_SHORT_ID, formatMonthYear, formatMoney, parseISODate } from '../utils/format';

const PERIOD_OPTIONS: { id: StatsPeriodMode; label: string }[] = [
  { id: 'mingguan', label: 'Mingguan' },
  { id: 'bulanan', label: 'Bulanan' },
  { id: 'tahunan', label: 'Tahunan' },
  { id: 'periode', label: 'Periode' },
  { id: 'ringkasan', label: 'Ringkasan' },
  { id: 'tren', label: 'Tren' },
];

const FALLBACK_COLORS = ['#6BA4E8', '#4CC38A', '#E59866', '#A98AD8', '#D97B93', '#63B8C8'];

interface StatistikViewProps {
  subTab?: StatistikSubTab;
  onSubTabChange?: (tab: StatistikSubTab) => void;
}

export const StatistikView: React.FC<StatistikViewProps> = ({
  subTab: controlledSubTab,
  onSubTabChange,
}) => {
  const { transactions, categories, budgets, settings, upsertBudget } = useMoneyStore();
  const dec = settings.showDecimals;

  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();
  const daysInCurrentMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  const todayMarkerPct = Math.round((now.getDate() / daysInCurrentMonth) * 100);

  const [internalSubTab, setInternalSubTab] = useState<StatistikSubTab>('statistik');
  const subTab = controlledSubTab ?? internalSubTab;
  const setSubTab = (next: StatistikSubTab) => {
    setInternalSubTab(next);
    onSubTabChange?.(next);
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  };
  const [periodMode, setPeriodMode] = useState<StatsPeriodMode>('bulanan');
  const [periodSheetOpen, setPeriodSheetOpen] = useState(false);
  const [txType, setTxType] = useState<'income' | 'expense'>('expense');
  const [year, setYear] = useState(currentYear);
  const [month, setMonth] = useState(currentMonth);
  const [selectedSliceId, setSelectedSliceId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'count' | 'total'>('total');
  const [budgetModalOpen, setBudgetModalOpen] = useState(false);

  const catMap = useMemo(() => new Map(categories.map((c) => [c.id, c])), [categories]);

  const shiftPeriod = (dir: -1 | 1) => {
    if (navigator.vibrate) navigator.vibrate(5);
    if (periodMode === 'tahunan') {
      setYear((y) => y + dir);
      return;
    }
    const d = new Date(year, month + dir, 1);
    setYear(d.getFullYear());
    setMonth(d.getMonth());
  };

  const periodTxs = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.type === 'transfer') return false;
      const d = parseISODate(tx.date);
      if (periodMode === 'tahunan' || periodMode === 'tren') {
        return d.getFullYear() === year;
      }
      return d.getFullYear() === year && d.getMonth() === month;
    });
  }, [transactions, year, month, periodMode]);

  const incomeTotal = useMemo(
    () => periodTxs.filter((t) => t.type === 'income').reduce((s, t) => s + t.amount, 0),
    [periodTxs]
  );
  const expenseTotal = useMemo(
    () => periodTxs.filter((t) => t.type === 'expense').reduce((s, t) => s + t.amount, 0),
    [periodTxs]
  );

  const activeTxs = useMemo(
    () => periodTxs.filter((t) => t.type === txType),
    [periodTxs, txType]
  );
  const activeTotal = txType === 'income' ? incomeTotal : expenseTotal;

  const categoryStats = useMemo(() => {
    const map = new Map<string, number>();
    for (const tx of activeTxs) {
      map.set(tx.categoryId, (map.get(tx.categoryId) || 0) + tx.amount);
    }
    return Array.from(map.entries())
      .map(([categoryId, amount]) => {
        const cat = catMap.get(categoryId);
        const pct = activeTotal > 0 ? (amount / activeTotal) * 100 : 0;
        return { categoryId, name: cat?.name || 'Lainnya', amount, pct };
      })
      .sort((a, b) => b.amount - a.amount)
      .map((item, idx) => ({
        ...item,
        tone: CATEGORY_ACCENTS[item.categoryId] || FALLBACK_COLORS[idx % FALLBACK_COLORS.length],
      }));
  }, [activeTxs, activeTotal, catMap]);

  // Crisp Pie Chart geometry with smart left/right callout label collision avoidance
  const pieData = useMemo(() => {
    const cx = 180;
    const cy = 118;
    const r = 74;
    let startAngle = -Math.PI / 2;

    const rawSlices = categoryStats.map((item) => {
      const sweep = (item.pct / 100) * Math.PI * 2;
      const endAngle = startAngle + sweep;
      const midAngle = startAngle + sweep / 2;

      const x1 = cx + r * Math.cos(startAngle);
      const y1 = cy + r * Math.sin(startAngle);
      const x2 = cx + r * Math.cos(endAngle);
      const y2 = cy + r * Math.sin(endAngle);
      const largeArc = sweep > Math.PI ? 1 : 0;

      const path =
        item.pct >= 99.9
          ? `M ${cx} ${cy - r} A ${r} ${r} 0 1 1 ${cx - 0.01} ${cy - r} Z`
          : `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2} Z`;

      const anchorX = cx + (r + 3) * Math.cos(midAngle);
      const anchorY = cy + (r + 3) * Math.sin(midAngle);
      const elbowX = cx + (r + 18) * Math.cos(midAngle);
      const elbowY = cy + (r + 18) * Math.sin(midAngle);
      const isRight = Math.cos(midAngle) >= 0;

      const slice = {
        ...item,
        path,
        midAngle,
        anchorX,
        anchorY,
        elbowX,
        elbowY,
        labelY: elbowY,
        isRight,
      };
      startAngle = endAngle;
      return slice;
    });

    // Separate left & right labels and resolve vertical overlaps cleanly
    const resolveSide = (sideSlices: typeof rawSlices) => {
      const sorted = [...sideSlices].sort((a, b) => a.labelY - b.labelY);
      const minGap = 28;
      for (let i = 1; i < sorted.length; i++) {
        if (sorted[i].labelY - sorted[i - 1].labelY < minGap) {
          sorted[i].labelY = sorted[i - 1].labelY + minGap;
        }
      }
      // Clamp within SVG bounds
      for (let i = sorted.length - 1; i >= 0; i--) {
        if (sorted[i].labelY > 212) sorted[i].labelY = 212;
        if (i < sorted.length - 1 && sorted[i + 1].labelY - sorted[i].labelY < minGap) {
          sorted[i].labelY = sorted[i + 1].labelY - minGap;
        }
      }
      for (let i = 0; i < sorted.length; i++) {
        if (sorted[i].labelY < 20) sorted[i].labelY = 20;
      }
    };

    const labeled = rawSlices.slice(0, 6);
    resolveSide(labeled.filter((s) => s.isRight));
    resolveSide(labeled.filter((s) => !s.isRight));

    return { cx, cy, r, slices: rawSlices, labeledIds: new Set(labeled.map((s) => s.categoryId)) };
  }, [categoryStats]);

  const trendBars = useMemo(() => {
    const bars: { label: string; amount: number }[] = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(year, month - i, 1);
      const amt = transactions
        .filter((t) => {
          if (t.type !== txType) return false;
          const td = parseISODate(t.date);
          return td.getFullYear() === d.getFullYear() && td.getMonth() === d.getMonth();
        })
        .reduce((s, t) => s + t.amount, 0);
      bars.push({ label: MONTHS_SHORT_ID[d.getMonth()], amount: amt });
    }
    const max = Math.max(1, ...bars.map((b) => b.amount));
    return bars.map((b) => ({ ...b, pct: Math.round((b.amount / max) * 100) }));
  }, [transactions, year, month, txType]);

  const noteStats = useMemo(() => {
    const map = new Map<string, { label: string; count: number; total: number }>();
    for (const tx of activeTxs) {
      const key = tx.title.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.count += 1;
        existing.total += tx.amount;
      } else {
        map.set(key, { label: tx.title.trim(), count: 1, total: tx.amount });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      sortBy === 'count' ? b.count - a.count || b.total - a.total : b.total - a.total
    );
  }, [activeTxs, sortBy]);

  const totalBudget = budgets.find((b) => b.categoryId === 'total')?.amount || 0;
  const remainingBudget = Math.max(0, totalBudget - expenseTotal);
  const totalBudgetPct =
    totalBudget > 0 ? Math.min(100, Math.round((expenseTotal / totalBudget) * 100)) : 0;
  const budgetColor =
    totalBudgetPct >= 90
      ? 'var(--sys-red)'
      : totalBudgetPct >= 65
        ? 'var(--sys-orange)'
        : 'var(--sys-green)';

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type === 'expense'),
    [categories]
  );

  const activePeriodLabel =
    PERIOD_OPTIONS.find((p) => p.id === periodMode)?.label || 'Bulanan';

  const highlightedSlice =
    categoryStats.find((c) => c.categoryId === selectedSliceId) || categoryStats[0];

  return (
    <div className="px-4 pt-4 pb-32">
      {/* Clean Borderless Top Bar */}
      <div className="flex items-center justify-between mb-4">
        <div className="inline-flex items-center gap-0.5 -ml-1.5">
          <button
            type="button"
            onClick={() => shiftPeriod(-1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:opacity-50 transition"
          >
            <ChevronLeft className="w-[18px] h-[18px]" />
          </button>
          <span className="text-[15px] font-semibold tracking-[-0.01em] px-1">
            {periodMode === 'tahunan' ? String(year) : formatMonthYear(year, month)}
          </span>
          <button
            type="button"
            onClick={() => shiftPeriod(1)}
            className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] active:opacity-50 transition"
          >
            <ChevronRight className="w-[18px] h-[18px]" />
          </button>
        </div>

        <button
          type="button"
          onClick={() => setPeriodSheetOpen(true)}
          className="px-3 py-1.5 rounded-full ios-input-well text-[13px] font-semibold inline-flex items-center gap-1 active:opacity-70 transition"
        >
          <span>{activePeriodLabel}</span>
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]" />
        </button>
      </div>

      {/* Native iOS Segmented Control */}
      <div className="mb-4">
        <IosSegmentedControl
          options={[
            { id: 'statistik', label: 'Statistik' },
            { id: 'anggaran', label: 'Anggaran' },
            { id: 'catatan', label: 'Catatan' },
          ]}
          value={subTab}
          onChange={setSubTab}
          layoutId="statistik-ios-seg"
        />
      </div>

      {/* Clean Underline Pemasukan (Green) / Pengeluaran (Red) Bar */}
      <div
        className="grid grid-cols-2 border-b mb-4"
        style={{ borderColor: 'var(--ios-separator)' }}
      >
        <button
          type="button"
          onClick={() => setTxType('income')}
          className="relative pb-3 pt-1 text-center transition"
        >
          <div
            className={`text-[12px] font-medium ${
              txType === 'income' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
            }`}
          >
            Pemasukan
          </div>
          <div
            className="text-[16px] font-bold tabular-nums mt-0.5 transition-opacity"
            style={{
              color: 'var(--sys-green)',
              opacity: txType === 'income' ? 1 : 0.65,
            }}
          >
            {formatMoney(incomeTotal, settings.currency, true, dec)}
          </div>
          {txType === 'income' && (
            <motion.div
              layoutId="stats-tx-underline"
              className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-full"
              style={{ backgroundColor: 'var(--sys-green)' }}
            />
          )}
        </button>

        <button
          type="button"
          onClick={() => setTxType('expense')}
          className="relative pb-3 pt-1 text-center transition"
        >
          <div
            className={`text-[12px] font-medium ${
              txType === 'expense' ? 'text-[var(--text-primary)]' : 'text-[var(--text-tertiary)]'
            }`}
          >
            Pengeluaran
          </div>
          <div
            className="text-[16px] font-bold tabular-nums mt-0.5 transition-opacity"
            style={{
              color: 'var(--sys-red)',
              opacity: txType === 'expense' ? 1 : 0.65,
            }}
          >
            {formatMoney(expenseTotal, settings.currency, true, dec)}
          </div>
          {txType === 'expense' && (
            <motion.div
              layoutId="stats-tx-underline"
              className="absolute bottom-0 left-3 right-3 h-[2.5px] rounded-full"
              style={{ backgroundColor: 'var(--sys-red)' }}
            />
          )}
        </button>
      </div>

      {/* Sub-Tab Views */}
      <AnimatePresence mode="wait">
        {subTab === 'statistik' && (
          <motion.div
            key="stats"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="space-y-4"
          >
            {periodMode === 'tren' ? (
              <div className="ios-card p-5">
                <div className="text-[13px] font-semibold text-[var(--text-secondary)] mb-4">
                  Tren 6 Bulan
                </div>
                <div className="grid grid-cols-6 gap-2.5 items-end h-44 pt-4">
                  {trendBars.map((bar) => (
                    <div
                      key={bar.label}
                      className="flex flex-col items-center gap-2 h-full justify-end"
                    >
                      <span className="text-[10.5px] font-semibold tabular-nums text-[var(--text-secondary)]">
                        {bar.amount > 0 ? Math.round(bar.amount) : ''}
                      </span>
                      <div className="w-full max-w-[26px] h-28 rounded-full ios-input-well flex items-end overflow-hidden">
                        <motion.div
                          initial={{ height: 0 }}
                          animate={{ height: `${Math.max(8, bar.pct)}%` }}
                          transition={{ duration: 0.4 }}
                          className="w-full rounded-full"
                          style={{
                            backgroundColor:
                              txType === 'income' ? 'var(--sys-green)' : 'var(--sys-blue)',
                          }}
                        />
                      </div>
                      <span className="text-[11px] font-medium text-[var(--text-tertiary)]">
                        {bar.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="py-1 flex flex-col items-center">
                {categoryStats.length === 0 ? (
                  <p className="py-10 text-[14px] text-[var(--text-secondary)]">
                    Belum ada data untuk periode ini.
                  </p>
                ) : (
                  <svg
                    viewBox="0 0 360 236"
                    className="w-full max-w-[360px] h-auto overflow-visible select-none"
                  >
                    {/* Pie Slices */}
                    {pieData.slices.map((slice) => {
                      const isSelected = selectedSliceId === slice.categoryId;
                      const dx = isSelected ? Math.cos(slice.midAngle) * 5 : 0;
                      const dy = isSelected ? Math.sin(slice.midAngle) * 5 : 0;
                      return (
                        <path
                          key={slice.categoryId}
                          d={slice.path}
                          fill={slice.tone}
                          stroke="var(--ios-bg)"
                          strokeWidth="1.75"
                          strokeLinejoin="round"
                          transform={`translate(${dx}, ${dy})`}
                          className="transition-transform duration-200 cursor-pointer"
                          onClick={() =>
                            setSelectedSliceId((prev) =>
                              prev === slice.categoryId ? null : slice.categoryId
                            )
                          }
                        />
                      );
                    })}

                    {/* Clean Callout Leader Lines & Labels */}
                    {pieData.slices
                      .filter((s) => pieData.labeledIds.has(s.categoryId) && s.pct >= 2.5)
                      .map((slice) => {
                        const endX = slice.isRight ? 286 : 74;
                        const textX = slice.isRight ? 290 : 70;
                        const shortName =
                          slice.name.length > 10 ? `${slice.name.slice(0, 9)}…` : slice.name;
                        return (
                          <g
                            key={`lbl-${slice.categoryId}`}
                            className="cursor-pointer"
                            onClick={() => setSelectedSliceId(slice.categoryId)}
                          >
                            <polyline
                              points={`${slice.anchorX},${slice.anchorY} ${slice.elbowX},${slice.labelY} ${endX},${slice.labelY}`}
                              fill="none"
                              stroke={slice.tone}
                              strokeWidth="1.2"
                              strokeOpacity="0.85"
                            />
                            <text
                              x={textX}
                              y={slice.labelY - 2}
                              textAnchor={slice.isRight ? 'start' : 'end'}
                              fill="var(--text-primary)"
                              fontSize="11"
                              fontWeight="600"
                            >
                              {shortName}
                            </text>
                            <text
                              x={textX}
                              y={slice.labelY + 11}
                              textAnchor={slice.isRight ? 'start' : 'end'}
                              fill="var(--text-secondary)"
                              fontSize="10.5"
                              fontWeight="500"
                            >
                              {slice.pct.toFixed(1)}%
                            </text>
                          </g>
                        );
                      })}
                  </svg>
                )}
              </div>
            )}

            {/* Clean Category Breakdown List (NO duplicate icon clutter — crisp % pill + name + thin bar + amount) */}
            {categoryStats.length > 0 && (
              <div className="ios-card overflow-hidden">
                {categoryStats.map((cat, idx) => {
                  const selected = highlightedSlice?.categoryId === cat.categoryId;
                  return (
                    <div key={cat.categoryId}>
                      <button
                        type="button"
                        onClick={() => setSelectedSliceId(cat.categoryId)}
                        className={`w-full px-4 py-3 text-left transition ${
                          selected ? 'bg-[var(--ios-fill-secondary)]' : ''
                        }`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className="min-w-[44px] text-center py-0.5 px-1.5 rounded-[7px] text-[12px] font-bold tabular-nums"
                              style={{
                                backgroundColor: `${cat.tone}22`,
                                color: cat.tone,
                              }}
                            >
                              {Math.round(cat.pct)}%
                            </span>
                            <span className="text-[15px] font-medium truncate">{cat.name}</span>
                          </div>
                          <span className="text-[15px] font-semibold tabular-nums shrink-0">
                            {formatMoney(cat.amount, settings.currency, true, dec)}
                          </span>
                        </div>
                        <div className="mt-2 ml-[56px] h-[3px] rounded-full ios-input-well overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-300"
                            style={{
                              width: `${Math.max(4, Math.round(cat.pct))}%`,
                              backgroundColor: cat.tone,
                            }}
                          />
                        </div>
                      </button>
                      {idx < categoryStats.length - 1 && (
                        <div
                          className="h-[0.5px] ml-[72px]"
                          style={{ backgroundColor: 'var(--ios-separator)' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}

        {subTab === 'anggaran' && (
          <motion.div
            key="budget"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="space-y-4"
          >
            <div className="ios-card p-4">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-[12.5px] font-medium text-[var(--text-secondary)]">
                    Sisa Anggaran
                  </div>
                  <div className="text-[30px] font-bold tabular-nums tracking-[-0.03em] mt-0.5">
                    {formatMoney(remainingBudget, settings.currency, true, dec)}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ios-input-well text-[12.5px] font-semibold"
                  style={{ color: 'var(--sys-blue)' }}
                >
                  <Sliders className="w-3.5 h-3.5" />
                  Atur
                </button>
              </div>

              <div className="relative pt-5">
                <div
                  className="absolute top-0 -translate-x-1/2 text-[10px] font-semibold text-[var(--text-secondary)]"
                  style={{ left: `${todayMarkerPct}%` }}
                >
                  Hari ini
                </div>
                <div className="h-[6px] rounded-full ios-input-well overflow-hidden relative">
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${totalBudgetPct}%`, backgroundColor: budgetColor }}
                  />
                  <div
                    className="absolute top-0 bottom-0 w-[1.5px] bg-[var(--text-tertiary)]"
                    style={{ left: `${todayMarkerPct}%` }}
                  />
                </div>
                <div className="flex items-center justify-between text-[12.5px] tabular-nums mt-2.5">
                  <span className="text-[var(--text-secondary)]">
                    Limit {formatMoney(totalBudget, settings.currency, true, dec)}
                  </span>
                  <span className="font-bold" style={{ color: budgetColor }}>
                    {totalBudgetPct}%
                  </span>
                </div>
              </div>
            </div>

            <div className="ios-card overflow-hidden divide-y ios-divider">
              {expenseCategories.map((cat) => {
                const spent = periodTxs
                  .filter((t) => t.type === 'expense' && t.categoryId === cat.id)
                  .reduce((s, t) => s + t.amount, 0);
                const limit = budgets.find((b) => b.categoryId === cat.id)?.amount || 0;
                if (spent === 0 && limit === 0) return null;
                const pct = limit > 0 ? Math.min(100, Math.round((spent / limit) * 100)) : 0;
                const barCol =
                  pct >= 90
                    ? 'var(--sys-red)'
                    : pct >= 65
                      ? 'var(--sys-orange)'
                      : 'var(--sys-green)';
                return (
                  <div key={cat.id} className="px-4 py-3.5">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2.5">
                        <CategoryBadge categoryId={cat.id} type="expense" size="sm" />
                        <span className="text-[14.5px] font-medium">{cat.name}</span>
                      </div>
                      <div className="text-right tabular-nums">
                        <span className="text-[14.5px] font-semibold">
                          {formatMoney(spent, settings.currency, false, dec)}
                        </span>
                        {limit > 0 && (
                          <span className="text-[12px] text-[var(--text-tertiary)]">
                            {' '}
                            / {formatMoney(limit, settings.currency, false, dec)}
                          </span>
                        )}
                      </div>
                    </div>
                    {limit > 0 && (
                      <div className="h-[5px] rounded-full ios-input-well overflow-hidden">
                        <div
                          className="h-full rounded-full"
                          style={{ width: `${pct}%`, backgroundColor: barCol }}
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </motion.div>
        )}

        {subTab === 'catatan' && (
          <motion.div
            key="notes"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.14 }}
            className="ios-card overflow-hidden"
          >
            <div
              className="grid grid-cols-[1fr_64px_110px] items-center px-4 py-2.5 border-b text-[11.5px] font-semibold text-[var(--text-secondary)]"
              style={{ borderColor: 'var(--ios-separator)' }}
            >
              <span>Catatan</span>
              <button
                type="button"
                onClick={() => setSortBy((s) => (s === 'count' ? 'total' : 'count'))}
                className="inline-flex items-center justify-center gap-1"
                style={{ color: 'var(--sys-blue)' }}
              >
                <ArrowDownUp className="w-3.5 h-3.5" />
                <span>{sortBy === 'count' ? 'Qty' : 'Val'}</span>
              </button>
              <span className="text-right">Total</span>
            </div>

            {noteStats.length === 0 ? (
              <p className="py-10 text-center text-[13.5px] text-[var(--text-secondary)]">
                Belum ada catatan transaksi di periode ini.
              </p>
            ) : (
              <div className="divide-y ios-divider">
                {noteStats.map((row) => (
                  <div
                    key={row.label}
                    className="grid grid-cols-[1fr_64px_110px] items-center px-4 py-3 text-[14px]"
                  >
                    <span className="font-medium truncate pr-2">{row.label}</span>
                    <span className="text-center text-[var(--text-secondary)] tabular-nums">
                      {row.count}
                    </span>
                    <span className="text-right font-semibold tabular-nums">
                      {formatMoney(row.total, settings.currency, true, dec)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Native iOS Action Sheet for Period */}
      <AnimatePresence>
        {periodSheetOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setPeriodSheetOpen(false)}
              className="absolute inset-0 bg-black/55"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="relative z-10 w-full max-w-[430px] p-3 pb-6 space-y-2"
            >
              <div className="ios-sheet rounded-[20px] overflow-hidden divide-y ios-divider">
                {PERIOD_OPTIONS.map((opt) => {
                  const selected = periodMode === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setPeriodMode(opt.id);
                        setPeriodSheetOpen(false);
                      }}
                      className="w-full px-5 py-3.5 flex items-center justify-between text-[15.5px] font-medium active:bg-[var(--ios-fill-secondary)] transition"
                    >
                      <span style={{ color: selected ? 'var(--sys-blue)' : undefined }}>
                        {opt.label}
                      </span>
                      {selected && (
                        <Check className="w-4 h-4" style={{ color: 'var(--sys-blue)' }} />
                      )}
                    </button>
                  );
                })}
              </div>
              <button
                type="button"
                onClick={() => setPeriodSheetOpen(false)}
                className="w-full ios-sheet rounded-[16px] py-3.5 text-[15.5px] font-semibold text-center"
              >
                Batalkan
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Budget Editor Sheet */}
      <AnimatePresence>
        {budgetModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setBudgetModalOpen(false)}
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
                <h3 className="text-[17px] font-bold">Pengaturan Anggaran</h3>
                <button
                  type="button"
                  onClick={() => setBudgetModalOpen(false)}
                  className="w-8 h-8 rounded-full ios-input-well flex items-center justify-center text-[var(--text-secondary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3">
                <label className="block rounded-[14px] ios-input-well p-3.5">
                  <span className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1">
                    Total Anggaran Bulanan ({settings.currency})
                  </span>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={totalBudget || ''}
                    placeholder="0"
                    onChange={(e) => upsertBudget('total', Math.max(0, Number(e.target.value) || 0))}
                    className="w-full bg-transparent text-[22px] font-bold tabular-nums outline-none placeholder:text-[var(--text-tertiary)]"
                  />
                </label>

                <div className="text-[12px] font-semibold text-[var(--text-secondary)] pt-1 px-1">
                  Per Kategori
                </div>
                <div className="ios-card overflow-hidden divide-y ios-divider">
                  {expenseCategories.map((cat) => {
                    const val = budgets.find((b) => b.categoryId === cat.id)?.amount || 0;
                    return (
                      <div
                        key={cat.id}
                        className="flex items-center justify-between px-3.5 py-2.5 gap-3"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <CategoryIcon categoryId={cat.id} className="w-4 h-4 shrink-0" />
                          <span className="text-[14px] font-medium truncate">{cat.name}</span>
                        </div>
                        <input
                          type="number"
                          value={val || ''}
                          placeholder="0"
                          onChange={(e) =>
                            upsertBudget(cat.id, Math.max(0, Number(e.target.value) || 0))
                          }
                          className="w-28 text-right bg-transparent text-[14.5px] font-semibold tabular-nums outline-none"
                        />
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
