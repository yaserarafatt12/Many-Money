import { CurrencyCode, Transaction, Category, Account } from '../types';

export const CURRENCIES: Record<
  CurrencyCode,
  { symbol: string; name: string; decimals: number; locale: string }
> = {
  IDR: { symbol: 'Rp', name: 'Rupiah Indonesia (IDR)', decimals: 0, locale: 'id-ID' },
  USD: { symbol: '$', name: 'US Dollar (USD)', decimals: 2, locale: 'en-US' },
  EUR: { symbol: '€', name: 'Euro (EUR)', decimals: 2, locale: 'de-DE' },
  GBP: { symbol: '£', name: 'British Pound (GBP)', decimals: 2, locale: 'en-GB' },
  JPY: { symbol: '¥', name: 'Japanese Yen (JPY)', decimals: 0, locale: 'ja-JP' },
  SGD: { symbol: 'S$', name: 'Singapore Dollar (SGD)', decimals: 2, locale: 'en-SG' },
  MYR: { symbol: 'RM', name: 'Malaysian Ringgit (MYR)', decimals: 2, locale: 'ms-MY' },
  AUD: { symbol: 'A$', name: 'Australian Dollar (AUD)', decimals: 2, locale: 'en-AU' },
  CNY: { symbol: '¥', name: 'Chinese Yuan (CNY)', decimals: 2, locale: 'zh-CN' },
  KRW: { symbol: '₩', name: 'South Korean Won (KRW)', decimals: 0, locale: 'ko-KR' },
  SAR: { symbol: 'SR', name: 'Saudi Riyal (SAR)', decimals: 2, locale: 'en-US' },
  AED: { symbol: 'AED', name: 'UAE Dirham (AED)', decimals: 2, locale: 'en-US' },
  EGP: { symbol: 'E£', name: 'Egyptian Pound (EGP)', decimals: 2, locale: 'en-US' },
  THB: { symbol: '฿', name: 'Thai Baht (THB)', decimals: 2, locale: 'th-TH' },
  PHP: { symbol: '₱', name: 'Philippine Peso (PHP)', decimals: 2, locale: 'en-PH' },
  VND: { symbol: '₫', name: 'Vietnamese Dong (VND)', decimals: 0, locale: 'vi-VN' },
  INR: { symbol: '₹', name: 'Indian Rupee (INR)', decimals: 2, locale: 'en-IN' },
  CHF: { symbol: 'CHF', name: 'Swiss Franc (CHF)', decimals: 2, locale: 'de-CH' },
  CAD: { symbol: 'C$', name: 'Canadian Dollar (CAD)', decimals: 2, locale: 'en-CA' },
  NZD: { symbol: 'NZ$', name: 'New Zealand Dollar (NZD)', decimals: 2, locale: 'en-NZ' },
  HKD: { symbol: 'HK$', name: 'Hong Kong Dollar (HKD)', decimals: 2, locale: 'en-HK' },
  TWD: { symbol: 'NT$', name: 'Taiwan Dollar (TWD)', decimals: 0, locale: 'zh-TW' },
  TRY: { symbol: '₺', name: 'Turkish Lira (TRY)', decimals: 2, locale: 'tr-TR' },
  BRL: { symbol: 'R$', name: 'Brazilian Real (BRL)', decimals: 2, locale: 'pt-BR' },
  ZAR: { symbol: 'R', name: 'South African Rand (ZAR)', decimals: 2, locale: 'en-ZA' },
};

export function formatMoney(
  amount: number,
  currency: CurrencyCode = 'IDR',
  withSymbol = true,
  showDecimals = false
): string {
  const meta = CURRENCIES[currency] || CURRENCIES.IDR;
  const sign = amount < 0 ? '-' : '';
  const absVal = Math.abs(amount);
  const hasFraction = Math.abs(absVal - Math.round(absVal)) > 0.001;
  const minFrac = showDecimals ? meta.decimals : 0;
  const maxFrac = showDecimals ? meta.decimals : hasFraction ? 2 : 0;

  const formatted = absVal.toLocaleString(meta.locale, {
    minimumFractionDigits: minFrac,
    maximumFractionDigits: maxFrac,
  });
  if (!withSymbol) return `${sign}${formatted}`;
  return `${sign}${meta.symbol} ${formatted}`;
}

export function formatCompactMoney(amount: number, currency: CurrencyCode = 'IDR'): string {
  const meta = CURRENCIES[currency] || CURRENCIES.IDR;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  if (abs >= 1_000_000) {
    return `${sign}${(abs / 1_000_000).toFixed(1)}M`;
  }
  if (abs >= 10_000) {
    return `${sign}${(abs / 1_000).toFixed(abs % 1000 === 0 ? 0 : 1)}k`;
  }
  return `${sign}${Math.round(abs).toLocaleString(meta.locale)}`;
}

export const MONTHS_SHORT_ID = [
  'Jan',
  'Feb',
  'Mar',
  'Apr',
  'Mei',
  'Jun',
  'Jul',
  'Agu',
  'Sep',
  'Okt',
  'Nov',
  'Des',
];

export const DAYS_SHORT_ID = ['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'];
export const DAYS_FULL_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, (m || 1) - 1, d || 1);
}

export function toISODate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function formatMonthYear(year: number, monthIndex: number): string {
  return `${MONTHS_SHORT_ID[monthIndex]} ${year}`;
}

export function formatShortDateHeader(iso: string): {
  dayNum: string;
  dayName: string;
  dayFull: string;
  monthShort: string;
  isWeekend: boolean;
  isSunday: boolean;
} {
  const d = parseISODate(iso);
  const dow = d.getDay();
  return {
    dayNum: String(d.getDate()).padStart(2, '0'),
    dayName: DAYS_SHORT_ID[dow],
    dayFull: DAYS_FULL_ID[dow],
    monthShort: MONTHS_SHORT_ID[d.getMonth()],
    isWeekend: dow === 0 || dow === 6,
    isSunday: dow === 0,
  };
}

export function getMonthDaysGrid(year: number, monthIndex: number): Date[] {
  const firstOfMonth = new Date(year, monthIndex, 1);
  const startDow = firstOfMonth.getDay();
  const gridStart = new Date(year, monthIndex, 1 - startDow);
  const days: Date[] = [];
  for (let i = 0; i < 42; i++) {
    days.push(new Date(gridStart.getFullYear(), gridStart.getMonth(), gridStart.getDate() + i));
  }
  return days;
}

export function exportTransactionsToCSV(
  transactions: Transaction[],
  categories: Category[],
  accounts: Account[],
  currency: CurrencyCode
) {
  const catMap = new Map(categories.map((c) => [c.id, c.name]));
  const accMap = new Map(accounts.map((a) => [a.id, a.name]));
  const headers = [
    'Tanggal',
    'Waktu',
    'Tipe',
    'Kategori',
    'Akun',
    'Tujuan',
    'Catatan',
    'Jumlah',
    'Mata Uang',
  ];
  const rows = transactions.map((t) => [
    t.date,
    t.time,
    t.type,
    catMap.get(t.categoryId) || (t.type === 'transfer' ? 'Transfer' : '-'),
    accMap.get(t.accountId) || '-',
    t.toAccountId ? accMap.get(t.toAccountId) || '-' : '-',
    `"${(t.title || '').replace(/"/g, '""')}"`,
    t.amount.toString(),
    currency,
  ]);
  const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
  const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `many-money-export-${toISODate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
