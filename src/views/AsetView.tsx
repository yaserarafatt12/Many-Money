import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowDown,
  ArrowUp,
  Banknote,
  Building2,
  Check,
  ChevronRight,
  CreditCard,
  Eye,
  EyeOff,
  Landmark,
  Menu,
  Minus,
  Pencil,
  PiggyBank,
  Plus,
  Shield,
  TrendingUp,
  Wallet,
  X,
} from 'lucide-react';
import { Account, AccountGroup } from '../types';
import { useMoneyStore } from '../store/useMoneyStore';
import { formatMoney } from '../utils/format';

const GROUPS: {
  id: AccountGroup;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  { id: 'cash', label: 'Tunai', icon: Banknote, color: '#4CC38A' },
  { id: 'bank', label: 'Bank', icon: Building2, color: '#64A6F0' },
  { id: 'card', label: 'Kartu', icon: CreditCard, color: '#A98AD8' },
  { id: 'debit', label: 'Kartu debit', icon: CreditCard, color: '#63B8C8' },
  { id: 'savings', label: 'Tabungan', icon: PiggyBank, color: '#E59866' },
  { id: 'prepaid', label: 'Kartu prabayar', icon: Wallet, color: '#D97B93' },
  { id: 'investment', label: 'Investasi', icon: TrendingUp, color: '#4CC38A' },
  { id: 'overdraft', label: 'Rekening minus', icon: Landmark, color: '#E57373' },
  { id: 'loan', label: 'Pinjaman', icon: Landmark, color: '#E5A454' },
  { id: 'insurance', label: 'Asuransi', icon: Shield, color: '#7D8CE0' },
  { id: 'other', label: 'Lainnya', icon: Wallet, color: '#8E8E93' },
];

export const AsetView: React.FC = () => {
  const {
    accounts,
    accountBalances,
    settings,
    addAccount,
    updateAccount,
    deleteAccount,
    reorderAccount,
  } = useMoneyStore();

  const dec = settings.showDecimals;

  const [editMode, setEditMode] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [groupSheetOpen, setGroupSheetOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [group, setGroup] = useState<AccountGroup>('cash');
  const [initialBalance, setInitialBalance] = useState('0');
  const [description, setDescription] = useState('');
  const [includeInTotal, setIncludeInTotal] = useState(true);
  const [payable, setPayable] = useState('0');
  const [unpaid, setUnpaid] = useState('0');

  const summary = useMemo(() => {
    let assets = 0;
    let liabilities = 0;
    for (const acc of accounts) {
      if (!acc.includeInTotal) continue;
      const bal = accountBalances[acc.id] ?? acc.initialBalance;
      if (bal >= 0) assets += bal;
      else liabilities += Math.abs(bal);
      if (acc.group === 'card') {
        liabilities += (acc.payable || 0) + (acc.unpaid || 0);
      }
    }
    return { assets, liabilities, total: assets - liabilities };
  }, [accounts, accountBalances]);

  const openModal = (acc?: Account) => {
    if (acc) {
      setEditingAccount(acc);
      setName(acc.name);
      setGroup(acc.group);
      setInitialBalance(String(acc.initialBalance));
      setDescription(acc.description || '');
      setIncludeInTotal(acc.includeInTotal);
      setPayable(String(acc.payable || 0));
      setUnpaid(String(acc.unpaid || 0));
    } else {
      setEditingAccount(null);
      setName('');
      setGroup('cash');
      setInitialBalance('');
      setDescription('');
      setIncludeInTotal(true);
      setPayable('0');
      setUnpaid('0');
    }
    setModalOpen(true);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    const payload: Omit<Account, 'id'> = {
      name: name.trim(),
      group,
      initialBalance: Number(initialBalance) || 0,
      description: description.trim() || undefined,
      includeInTotal,
      payable: group === 'card' ? Number(payable) || 0 : undefined,
      unpaid: group === 'card' ? Number(unpaid) || 0 : undefined,
    };
    if (editingAccount) {
      updateAccount(editingAccount.id, payload);
    } else {
      addAccount(payload);
    }
    setModalOpen(false);
  };

  const activeGroups = GROUPS.filter((g) => accounts.some((a) => a.group === g.id));
  const selectedGroupMeta = GROUPS.find((g) => g.id === group) || GROUPS[0];

  const moveRelative = (accId: string, dir: -1 | 1) => {
    const idx = accounts.findIndex((a) => a.id === accId);
    const targetIdx = idx + dir;
    if (idx < 0 || targetIdx < 0 || targetIdx >= accounts.length) return;
    reorderAccount(accId, accounts[targetIdx].id);
  };

  return (
    <div className="px-4 pt-5 pb-32">
      {/* Top Bar (Matches ATM reference: Edit toggles X / +) */}
      <div className="flex items-center justify-between mb-4">
        {editMode ? (
          <button
            type="button"
            onClick={() => setEditMode(false)}
            className="w-9 h-9 rounded-full ios-input-well flex items-center justify-center text-[var(--text-primary)] active:opacity-60"
            aria-label="Selesai edit"
          >
            <X className="w-5 h-5" />
          </button>
        ) : (
          <h1 className="text-[28px] font-bold tracking-[-0.025em] leading-none">
            {settings.language === 'en' ? 'Assets' : 'Aset'}
          </h1>
        )}

        {editMode && <h1 className="text-[17px] font-bold">Aset</h1>}

        <div className="flex items-center gap-2">
          {!editMode && (
            <button
              type="button"
              onClick={() => setEditMode(true)}
              className="w-9 h-9 rounded-full ios-input-well flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition"
              aria-label="Edit aset"
            >
              <Pencil className="w-[17px] h-[17px]" />
            </button>
          )}
          <button
            type="button"
            onClick={() => openModal()}
            className="w-9 h-9 rounded-full ios-input-well flex items-center justify-center text-[var(--text-primary)] transition"
            aria-label="Tambah aset"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Borderless Hero Net Worth */}
      <div className="px-1 pt-1 pb-6">
        <div className="text-[13px] font-medium text-[var(--text-secondary)] mb-1">
          {settings.language === 'en' ? 'Net Worth' : 'Kekayaan Bersih'}
        </div>
        <div className="text-[40px] font-bold tabular-nums tracking-[-0.035em] leading-[1.08] mb-3">
          {formatMoney(summary.total, settings.currency, true, dec)}
        </div>
        <div className="flex items-center justify-between text-[13px] tabular-nums">
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-secondary)]">
              {settings.language === 'en' ? 'Assets' : 'Total Aset'}
            </span>
            <span className="font-semibold" style={{ color: 'var(--sys-green)' }}>
              {formatMoney(summary.assets, settings.currency, true, dec)}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[var(--text-secondary)]">
              {settings.language === 'en' ? 'Liabilities' : 'Liabilitas'}
            </span>
            <span className="font-semibold" style={{ color: 'var(--sys-red)' }}>
              {formatMoney(summary.liabilities, settings.currency, true, dec)}
            </span>
          </div>
        </div>
      </div>

      {/* Grouped Accounts */}
      <div className="space-y-5">
        {activeGroups.map((grp) => {
          const Icon = grp.icon;
          const groupAccounts = accounts.filter((a) => a.group === grp.id);
          const groupTotal = groupAccounts.reduce(
            (s, a) => s + (a.includeInTotal ? accountBalances[a.id] ?? a.initialBalance : 0),
            0
          );

          return (
            <section key={grp.id}>
              <div className="flex items-center justify-between px-1.5 mb-2">
                <span className="text-[13px] font-semibold text-[var(--text-secondary)]">
                  {grp.label}
                </span>
                {grp.id !== 'card' && (
                  <span className="text-[13px] font-semibold tabular-nums text-[var(--text-secondary)]">
                    {formatMoney(groupTotal, settings.currency, true, dec)}
                  </span>
                )}
              </div>

              <div className="ios-card overflow-hidden">
                {groupAccounts.map((acc, idx) => {
                  const bal = accountBalances[acc.id] ?? acc.initialBalance;
                  return (
                    <div
                      key={acc.id}
                      draggable={editMode}
                      onDragStart={() => setDraggingId(acc.id)}
                      onDragOver={(e) => {
                        if (editMode) e.preventDefault();
                      }}
                      onDrop={() => {
                        if (editMode && draggingId && draggingId !== acc.id) {
                          reorderAccount(draggingId, acc.id);
                        }
                        setDraggingId(null);
                      }}
                      onDragEnd={() => setDraggingId(null)}
                      className={draggingId === acc.id ? 'opacity-50' : ''}
                    >
                      <div
                        onClick={() => !editMode && openModal(acc)}
                        className={`px-3.5 py-3 flex items-center justify-between transition ${
                          editMode
                            ? ''
                            : 'cursor-pointer active:bg-[var(--ios-fill-secondary)]'
                        }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          {editMode ? (
                            <button
                              type="button"
                              disabled={accounts.length <= 1}
                              onClick={() => deleteAccount(acc.id)}
                              className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 disabled:opacity-30"
                              style={{ backgroundColor: 'var(--sys-red)', color: '#fff' }}
                              aria-label="Hapus akun"
                            >
                              <Minus className="w-3.5 h-3.5 stroke-[3]" />
                            </button>
                          ) : (
                            <div
                              className="w-9 h-9 rounded-full flex items-center justify-center shrink-0"
                              style={{
                                backgroundColor: `${grp.color}20`,
                                color: grp.color,
                              }}
                            >
                              <Icon className="w-[17px] h-[17px]" />
                            </div>
                          )}

                          <div className="min-w-0">
                            <div
                              className={`text-[15px] font-medium truncate ${
                                !acc.includeInTotal ? 'opacity-50' : ''
                              }`}
                            >
                              {acc.name}
                            </div>
                            {acc.description && (
                              <div className="text-[11.5px] text-[var(--text-tertiary)] truncate">
                                {acc.description}
                              </div>
                            )}
                          </div>
                        </div>

                        {editMode ? (
                          <div className="flex items-center gap-2 shrink-0">
                            {/* Eye visibility toggle (includeInTotal) */}
                            <button
                              type="button"
                              onClick={() =>
                                updateAccount(acc.id, { includeInTotal: !acc.includeInTotal })
                              }
                              className="w-8 h-8 rounded-full flex items-center justify-center text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                              aria-label="Sertakan dalam total"
                            >
                              {acc.includeInTotal ? (
                                <Eye className="w-[17px] h-[17px]" />
                              ) : (
                                <EyeOff className="w-[17px] h-[17px] opacity-45" />
                              )}
                            </button>

                            {/* Mobile-friendly Up/Down + 3-bar drag grip */}
                            <button
                              type="button"
                              onClick={() => moveRelative(acc.id, -1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                              aria-label="Naikkan"
                            >
                              <ArrowUp className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveRelative(acc.id, 1)}
                              className="w-6 h-6 rounded flex items-center justify-center text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
                              aria-label="Turunkan"
                            >
                              <ArrowDown className="w-3.5 h-3.5" />
                            </button>
                            <div
                              className="w-7 h-8 flex items-center justify-center text-[var(--text-tertiary)] cursor-grab active:cursor-grabbing"
                              title="Tarik untuk urutkan"
                            >
                              <Menu className="w-[18px] h-[18px]" />
                            </div>
                          </div>
                        ) : acc.group === 'card' ? (
                          <div className="flex items-center gap-4 text-right tabular-nums">
                            <div>
                              <div className="text-[10.5px] text-[var(--text-tertiary)]">
                                Tagihan
                              </div>
                              <div className="text-[13.5px] font-semibold">
                                {formatMoney(acc.payable || 0, settings.currency, true, dec)}
                              </div>
                            </div>
                            <div>
                              <div className="text-[10.5px] text-[var(--text-tertiary)]">
                                Belum
                              </div>
                              <div className="text-[13.5px] font-semibold">
                                {formatMoney(acc.unpaid || 0, settings.currency, true, dec)}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <span
                            className={`text-[15px] font-semibold tabular-nums ${
                              !acc.includeInTotal ? 'opacity-50' : ''
                            }`}
                            style={{
                              color: bal < 0 ? 'var(--sys-red)' : 'var(--text-primary)',
                            }}
                          >
                            {formatMoney(bal, settings.currency, true, dec)}
                          </span>
                        )}
                      </div>
                      {idx < groupAccounts.length - 1 && (
                        <div
                          className="h-[0.5px] ml-[56px]"
                          style={{ backgroundColor: 'var(--ios-separator)' }}
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </section>
          );
        })}
      </div>

      {/* Add / Edit Account Sheet (Grup -> Nama -> Total -> Deskripsi) */}
      <AnimatePresence>
        {modalOpen && (
          <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              onClick={() => setModalOpen(false)}
              className="absolute inset-0 bg-black/55"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="relative z-10 w-full max-w-[430px] rounded-t-[28px] sm:rounded-[28px] ios-sheet p-5 pb-8"
            >
              <div className="w-9 h-1 rounded-full bg-[var(--text-tertiary)]/50 mx-auto mb-4 sm:hidden" />
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-[17px] font-bold">
                  {editingAccount ? 'Edit Aset' : 'Tambah Aset'}
                </h3>
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="w-8 h-8 rounded-full ios-input-well flex items-center justify-center text-[var(--text-secondary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="ios-card overflow-hidden divide-y ios-divider mb-4">
                {/* 1. Grup */}
                <button
                  type="button"
                  onClick={() => setGroupSheetOpen(true)}
                  className="w-full px-4 py-3.5 flex items-center justify-between text-left active:bg-[var(--ios-fill-secondary)]"
                >
                  <span className="text-[14px] text-[var(--text-secondary)] w-24 shrink-0">
                    Grup
                  </span>
                  <div className="flex items-center gap-1.5 flex-1 justify-end">
                    <span className="text-[15px] font-medium">{selectedGroupMeta.label}</span>
                    <ChevronRight className="w-4 h-4 text-[var(--text-tertiary)]" />
                  </div>
                </button>

                {/* 2. Nama */}
                <label className="px-4 py-3.5 flex items-center gap-3">
                  <span className="text-[14px] text-[var(--text-secondary)] w-24 shrink-0">
                    Nama
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Tunai, BCA, Tabungan..."
                    className="w-full bg-transparent text-[15px] font-medium text-right outline-none placeholder:text-[var(--text-tertiary)]"
                  />
                </label>

                {/* 3. Total */}
                <label className="px-4 py-3.5 flex items-center gap-3">
                  <span className="text-[14px] text-[var(--text-secondary)] w-24 shrink-0">
                    Total
                  </span>
                  <input
                    type="number"
                    value={initialBalance}
                    onChange={(e) => setInitialBalance(e.target.value)}
                    placeholder="0"
                    className="w-full bg-transparent text-[15px] font-semibold tabular-nums text-right outline-none placeholder:text-[var(--text-tertiary)]"
                  />
                </label>

                {/* 4. Deskripsi */}
                <label className="px-4 py-3.5 flex items-center gap-3">
                  <span className="text-[14px] text-[var(--text-secondary)] w-24 shrink-0">
                    Deskripsi
                  </span>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Opsional..."
                    className="w-full bg-transparent text-[14.5px] text-right outline-none placeholder:text-[var(--text-tertiary)]"
                  />
                </label>
              </div>

              {group === 'card' && (
                <div className="grid grid-cols-2 gap-2.5 mb-4">
                  <label className="block rounded-[12px] ios-input-well px-3.5 py-2.5">
                    <span className="text-[11px] text-[var(--text-secondary)] block mb-0.5">
                      Harus dibayar
                    </span>
                    <input
                      type="number"
                      value={payable}
                      onChange={(e) => setPayable(e.target.value)}
                      className="w-full bg-transparent text-[15px] font-semibold tabular-nums outline-none"
                    />
                  </label>
                  <label className="block rounded-[12px] ios-input-well px-3.5 py-2.5">
                    <span className="text-[11px] text-[var(--text-secondary)] block mb-0.5">
                      Belum dibayar
                    </span>
                    <input
                      type="number"
                      value={unpaid}
                      onChange={(e) => setUnpaid(e.target.value)}
                      className="w-full bg-transparent text-[15px] font-semibold tabular-nums outline-none"
                    />
                  </label>
                </div>
              )}

              <button
                type="button"
                onClick={handleSave}
                className="w-full py-3.5 rounded-[14px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-semibold text-[15px] active:opacity-85 transition"
              >
                Simpan Aset
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 11-Group Picker Action Sheet (like ATM reference) */}
      <AnimatePresence>
        {groupSheetOpen && (
          <div className="fixed inset-0 z-[60] flex items-end justify-center">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.16 }}
              onClick={() => setGroupSheetOpen(false)}
              className="absolute inset-0 bg-black/55"
            />
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
              className="relative z-10 w-full max-w-[430px] p-3 pb-6 space-y-2"
            >
              <div className="ios-sheet rounded-[20px] max-h-[65vh] overflow-y-auto no-scrollbar divide-y ios-divider">
                <div className="px-5 py-3 text-[13px] font-semibold text-[var(--text-secondary)]">
                  Grup aset
                </div>
                {GROUPS.map((g) => {
                  const selected = g.id === group;
                  return (
                    <button
                      key={g.id}
                      type="button"
                      onClick={() => {
                        setGroup(g.id);
                        setGroupSheetOpen(false);
                      }}
                      className="w-full px-5 py-3 flex items-center justify-between text-[15px] active:bg-[var(--ios-fill-secondary)]"
                    >
                      <span style={{ color: selected ? 'var(--sys-blue)' : undefined }}>
                        {g.label}
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
                onClick={() => setGroupSheetOpen(false)}
                className="w-full ios-sheet rounded-[16px] py-3.5 text-[15.5px] font-semibold text-center"
              >
                Batalkan
              </button>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
