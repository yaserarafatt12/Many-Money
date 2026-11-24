import {
  Account,
  AppSettings,
  Budget,
  Category,
  MemoNote,
  RecurringRule,
  Transaction,
} from '../types';

export const DEFAULT_CATEGORIES: Category[] = [
  // Expense
  { id: 'cat-makanan', name: 'Konsumsi', type: 'expense', emoji: 'coffee', color: '#E59866' },
  { id: 'cat-pendidikan', name: 'Edukasi', type: 'expense', emoji: 'book', color: '#7D8CE0' },
  { id: 'cat-kebutuhan', name: 'Kebutuhan', type: 'expense', emoji: 'zap', color: '#63B8C8' },
  { id: 'cat-transport', name: 'Transport', type: 'expense', emoji: 'car', color: '#6BA4E8' },
  { id: 'cat-kesehatan', name: 'Kesehatan', type: 'expense', emoji: 'heart', color: '#DF7A7A' },
  { id: 'cat-hiburan', name: 'Hiburan', type: 'expense', emoji: 'game', color: '#A98AD8' },
  { id: 'cat-belanja', name: 'Belanja', type: 'expense', emoji: 'bag', color: '#D97B93' },
  { id: 'cat-lainnya-exp', name: 'Lainnya', type: 'expense', emoji: 'box', color: '#8E8E93' },
  // Income
  { id: 'cat-gaji', name: 'Gaji', type: 'income', emoji: 'briefcase', color: '#4CC38A' },
  { id: 'cat-kiriman', name: 'Freelance', type: 'income', emoji: 'banknote', color: '#56B8A8' },
  { id: 'cat-bonus', name: 'Bonus', type: 'income', emoji: 'gift', color: '#6BA4E8' },
  { id: 'cat-lainnya-inc', name: 'Lainnya', type: 'income', emoji: 'sparkles', color: '#8E8E93' },
];

export const DEFAULT_ACCOUNTS: Account[] = [
  { id: 'acc-tunai', name: 'Tunai', group: 'cash', initialBalance: 0, includeInTotal: true },
  { id: 'acc-bank', name: 'Bank', group: 'bank', initialBalance: 0, includeInTotal: true },
  {
    id: 'acc-kartu',
    name: 'Kartu',
    group: 'card',
    initialBalance: 0,
    includeInTotal: true,
    payable: 0,
    unpaid: 0,
  },
];

// Clean empty initial state (no dummy data)
export const DEFAULT_TRANSACTIONS: Transaction[] = [];

export const DEFAULT_BUDGETS: Budget[] = [];

export const DEFAULT_MEMOS: MemoNote[] = [];

export const DEFAULT_RECURRING: RecurringRule[] = [];

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  bgPreset: 'obsidian',
  currency: 'IDR',
  showDecimals: false,
  language: 'id',
  hasOnboarded: false,
  monthStartDay: 1,
  carryOverBalance: true,
  pinEnabled: false,
  pinCode: '1234',
  reminderEnabled: true,
  reminderTime: '21:00',
  tags: ['Penting', 'Rutin', 'Kerja', 'Bulanan'],
};
