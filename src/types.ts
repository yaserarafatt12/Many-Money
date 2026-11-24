export type TransactionType = 'income' | 'expense' | 'transfer';

export type AccountGroup =
  | 'cash'
  | 'bank'
  | 'card'
  | 'debit'
  | 'savings'
  | 'prepaid'
  | 'investment'
  | 'overdraft'
  | 'loan'
  | 'insurance'
  | 'other';

export type CurrencyCode =
  | 'IDR'
  | 'USD'
  | 'EUR'
  | 'GBP'
  | 'JPY'
  | 'SGD'
  | 'MYR'
  | 'AUD'
  | 'CNY'
  | 'KRW'
  | 'SAR'
  | 'AED'
  | 'EGP'
  | 'THB'
  | 'PHP'
  | 'VND'
  | 'INR'
  | 'CHF'
  | 'CAD'
  | 'NZD'
  | 'HKD'
  | 'TWD'
  | 'TRY'
  | 'BRL'
  | 'ZAR';

export type MainTab = 'transaksi' | 'statistik' | 'aset' | 'lainnya';

export type TransaksiSubTab = 'harian' | 'kalender' | 'bulanan' | 'ringkasan' | 'deskripsi';

export type StatistikSubTab = 'statistik' | 'anggaran' | 'catatan';

export type StatsPeriodMode =
  | 'mingguan'
  | 'bulanan'
  | 'tahunan'
  | 'periode'
  | 'ringkasan'
  | 'tren';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  emoji: string;
  color: string;
}

export interface Account {
  id: string;
  name: string;
  group: AccountGroup;
  initialBalance: number;
  includeInTotal: boolean;
  description?: string;
  payable?: number; // for card group ("Harus dibayar")
  unpaid?: number; // for card group ("Belum dibayar")
}

export interface Transaction {
  id: string;
  type: TransactionType;
  amount: number;
  date: string; // YYYY-MM-DD
  time: string; // HH:mm
  categoryId: string; // empty string if transfer
  accountId: string;
  toAccountId?: string;
  title: string; // note / item name
  description?: string;
  isFavorite?: boolean;
  tags?: string[];
  recurringId?: string;
}

export interface Budget {
  id: string;
  categoryId: string; // 'total' or specific categoryId
  amount: number;
}

export interface MemoNote {
  id: string;
  date: string; // YYYY-MM-DD
  title: string;
  content: string;
}

export interface RecurringRule {
  id: string;
  title: string;
  type: 'income' | 'expense';
  amount: number;
  categoryId: string;
  accountId: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  dayOfMonth?: number;
  active: boolean;
}

export type BgPresetId = 'obsidian' | 'cloud';

export interface AppSettings {
  theme: 'light' | 'dark';
  bgPreset: BgPresetId;
  currency: CurrencyCode;
  showDecimals: boolean;
  language: 'id' | 'en';
  hasOnboarded: boolean;
  monthStartDay: number;
  carryOverBalance: boolean;
  pinEnabled: boolean;
  pinCode: string;
  reminderEnabled: boolean;
  reminderTime: string;
  tags: string[];
}
