import { Account, Category, Transaction, TransactionType } from '../types';

export interface ParsedTransactionDraft {
  type?: TransactionType;
  amount?: number;
  title?: string;
  categoryId?: string;
  accountId?: string;
  date?: string;
}

const EXPENSE_KEYWORDS: Record<string, string[]> = {
  'cat-makanan': [
    'makan',
    'sarapan',
    'siang',
    'malam',
    'minum',
    'air',
    'aer',
    'kopi',
    'coffee',
    'cafe',
    'kafe',
    'teh',
    'roti',
    'nasi',
    'ayam',
    'bakso',
    'mie',
    'soto',
    'warung',
    'resto',
    'restoran',
    'jajan',
    'snack',
    'kue',
    'boba',
    'es',
    'shawarma',
    'pizza',
    'burger',
    'lunch',
    'dinner',
    'breakfast',
    'food',
    'drink',
    'konsumsi',
  ],
  'cat-transport': [
    'transport',
    'bensin',
    'bbm',
    'pertamina',
    'pertamax',
    'pertalite',
    'shell',
    'ojol',
    'gojek',
    'grab',
    'maxim',
    'indrive',
    'taxi',
    'taksi',
    'uber',
    'bus',
    'kereta',
    'krl',
    'mrt',
    'lrt',
    'tol',
    'parkir',
    'ongkos',
    'pp',
    'tiket',
    'fuel',
    'gas',
    'parking',
  ],
  'cat-kebutuhan': [
    'wifi',
    'internet',
    'kuota',
    'pulsa',
    'paket data',
    'listrik',
    'pln',
    'token',
    'air pdam',
    'pdam',
    'gas elpiji',
    'elpiji',
    'galon',
    'sabun',
    'shampo',
    'odol',
    'deterjen',
    'tisu',
    'sewa',
    'kos',
    'kontrakan',
    'utilitas',
    'electricity',
    'rent',
    'bill',
  ],
  'cat-belanja': [
    'belanja',
    'indomaret',
    'alfamart',
    'alfamidi',
    'superindo',
    'hypermart',
    'transmart',
    'lotte',
    'tokopedia',
    'shopee',
    'lazada',
    'blibli',
    'baju',
    'celana',
    'sepatu',
    'tas',
    'skincare',
    'parfum',
    'mall',
    'minimarket',
    'supermarket',
    'shopping',
    'groceries',
  ],
  'cat-pendidikan': [
    'buku',
    'edukasi',
    'pendidikan',
    'kursus',
    'les',
    'kuliah',
    'sekolah',
    'spp',
    'ukt',
    'seminar',
    'webinar',
    'udemy',
    'coursera',
    'alat tulis',
    'pena',
    'pulpen',
    'kertas',
    'print',
    'fotokopi',
    'fotocopy',
    'book',
    'course',
    'tuition',
  ],
  'cat-kesehatan': [
    'obat',
    'apotek',
    'kimia farma',
    'k24',
    'dokter',
    'klinik',
    'rumah sakit',
    'rs',
    'vitamin',
    'suplemen',
    'gym',
    'fitness',
    'olahraga',
    'kesehatan',
    'gigi',
    'medicine',
    'pharmacy',
    'doctor',
    'health',
  ],
  'cat-hiburan': [
    'hiburan',
    'nonton',
    'bioskop',
    'xxi',
    'cgv',
    'netflix',
    'spotify',
    'youtube',
    'icloud',
    'cloud',
    'game',
    'steam',
    'topup',
    'top up',
    'karaoke',
    'konser',
    'liburan',
    'hotel',
    'movie',
    'music',
    'entertainment',
  ],
};

const INCOME_KEYWORDS: Record<string, string[]> = {
  'cat-gaji': ['gaji', 'salary', 'payroll', 'upah', 'bulanan'],
  'cat-kiriman': ['freelance', 'proyek', 'project', 'klien', 'client', 'kiriman', 'jasa'],
  'cat-bonus': ['bonus', 'thr', 'hadiah', 'cashback', 'komisi', 'reward', 'dividen'],
};

const INCOME_TRIGGER_WORDS = [
  'gaji',
  'pemasukan',
  'masuk',
  'terima',
  'diterima',
  'dapat',
  'bonus',
  'thr',
  'freelance',
  'kiriman',
  'cashback',
  'refund',
  'income',
  'salary',
];

function parseSpokenAmount(text: string): { amount?: number; matchedToken?: string } {
  const normalized = text.toLowerCase();

  // Handle "setengah juta"
  if (normalized.includes('setengah juta')) {
    return { amount: 500000, matchedToken: 'setengah juta' };
  }

  // Match numbers with Indonesian/English multipliers: 15rb, 15 ribu, 1.5jt, 2 juta, 50k, 5000, 15.000
  const regex = /(\d+(?:[.,]\d+)?)\s*(juta|jt|ribu|rb|k|m)?\b/gi;
  let bestAmount: number | undefined;
  let bestToken: string | undefined;

  for (const match of normalized.matchAll(regex)) {
    const rawNum = match[1];
    const unit = (match[2] || '').toLowerCase();
    const full = match[0];

    let numVal: number;
    if (unit === 'jt' || unit === 'juta' || unit === 'm') {
      numVal = parseFloat(rawNum.replace(',', '.')) * 1_000_000;
    } else if (unit === 'rb' || unit === 'ribu' || unit === 'k') {
      numVal = parseFloat(rawNum.replace(',', '.')) * 1_000;
    } else {
      // Plain number: treat 15.000 or 15,000 (3 digits after separator) as thousand grouping
      if (/^\d{1,3}([.,]\d{3})+$/.test(rawNum)) {
        numVal = parseInt(rawNum.replace(/[.,]/g, ''), 10);
      } else {
        numVal = parseFloat(rawNum.replace(',', '.'));
      }
    }

    if (Number.isFinite(numVal) && numVal > 0) {
      bestAmount = Math.round(numVal * 100) / 100;
      bestToken = full;
    }
  }

  return { amount: bestAmount, matchedToken: bestToken };
}

function capitalizeTitle(s: string): string {
  const trimmed = s.replace(/\s+/g, ' ').trim();
  if (!trimmed) return '';
  return trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
}

export function parseVoiceToTransaction(
  transcript: string,
  categories: Category[],
  accounts: Account[],
  pastTransactions: Transaction[]
): ParsedTransactionDraft {
  const lower = transcript.toLowerCase().trim();
  if (!lower) return {};

  // 1. Amount
  const { amount, matchedToken } = parseSpokenAmount(lower);

  // 2. Type
  let type: TransactionType = 'expense';
  if (lower.includes('transfer') || lower.includes('pindah saldo')) {
    type = 'transfer';
  } else if (INCOME_TRIGGER_WORDS.some((w) => new RegExp(`\\b${w}\\b`, 'i').test(lower))) {
    type = 'income';
  }

  // 3. Account match
  let accountId: string | undefined;
  for (const acc of accounts) {
    const accLower = acc.name.toLowerCase();
    if (lower.includes(accLower)) {
      accountId = acc.id;
      break;
    }
  }
  if (!accountId) {
    if (/\b(cash|tunai|dompet)\b/i.test(lower)) {
      accountId = accounts.find((a) => a.group === 'cash')?.id;
    } else if (/\b(bank|bca|bri|bni|mandiri|jago|blu|qris|debit|rekening|tf)\b/i.test(lower)) {
      accountId = accounts.find((a) => a.group === 'bank' || a.group === 'debit')?.id;
    } else if (/\b(kartu|kredit|cc)\b/i.test(lower)) {
      accountId = accounts.find((a) => a.group === 'card')?.id;
    }
  }

  // 4. Clean title (strip amount token, currency words, and account filler phrases)
  let cleaned = transcript;
  if (matchedToken) {
    const escaped = matchedToken.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    cleaned = cleaned.replace(new RegExp(escaped, 'i'), ' ');
  }
  cleaned = cleaned
    .replace(/\b(rp|rupiah|idr|egp|le|pound|geneh|usd|dollar|sar|riyal|sgd|myr|jpy|beli|bayar|buat|untuk|pakai|via|di|ke|dari|sebesar|senilai)\b/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  // Remove trailing account name from title if matched
  if (accountId) {
    const accName = accounts.find((a) => a.id === accountId)?.name;
    if (accName) {
      cleaned = cleaned.replace(new RegExp(`\\b${accName}\\b`, 'gi'), ' ').replace(/\s+/g, ' ').trim();
    }
  }

  const title = capitalizeTitle(cleaned);

  // 5. Category match: first check user's own past transactions, then keyword dictionary
  let categoryId: string | undefined;
  if (type !== 'transfer') {
    const titleLower = title.toLowerCase();
    const pastMatch = pastTransactions.find(
      (tx) =>
        tx.type === type &&
        titleLower.length >= 2 &&
        (tx.title.toLowerCase().includes(titleLower) ||
          titleLower.includes(tx.title.toLowerCase()))
    );
    if (pastMatch) {
      categoryId = pastMatch.categoryId;
    } else {
      const dict = type === 'income' ? INCOME_KEYWORDS : EXPENSE_KEYWORDS;
      for (const [catId, words] of Object.entries(dict)) {
        if (
          categories.some((c) => c.id === catId && c.type === type) &&
          words.some((w) => lower.includes(w))
        ) {
          categoryId = catId;
          break;
        }
      }
      // Fallback: match category name directly
      if (!categoryId) {
        categoryId = categories.find(
          (c) => c.type === type && lower.includes(c.name.toLowerCase())
        )?.id;
      }
    }
  }

  return {
    type,
    amount,
    title: title || undefined,
    categoryId,
    accountId,
  };
}

function extractAmountFromReceiptLine(line: string): number | null {
  const matches = line.match(/\d[\d.,]*\d|\d+/g);
  if (!matches) return null;
  const candidates: number[] = [];
  for (const raw of matches) {
    // Skip long codes (barcodes / phone numbers / dates)
    const digitsOnly = raw.replace(/[.,]/g, '');
    if (digitsOnly.length > 10) continue;

    let val: number;
    if (/^\d{1,3}(\.\d{3})+,\d{2}$/.test(raw)) {
      val = parseFloat(raw.replace(/\./g, '').replace(',', '.'));
    } else if (/^\d{1,3}(,\d{3})+\.\d{2}$/.test(raw)) {
      val = parseFloat(raw.replace(/,/g, ''));
    } else if (/^\d{1,3}([.,]\d{3})+$/.test(raw)) {
      val = parseInt(digitsOnly, 10);
    } else if (/^\d+[.,]\d{2}$/.test(raw)) {
      val = parseFloat(raw.replace(',', '.'));
    } else if (/^\d+$/.test(raw)) {
      val = parseInt(raw, 10);
    } else {
      val = parseFloat(raw.replace(/[.,]/g, ''));
    }
    if (Number.isFinite(val) && val >= 5 && val <= 100_000_000) {
      candidates.push(val);
    }
  }
  return candidates.length > 0 ? candidates[candidates.length - 1] : null;
}

export function parseReceiptText(
  ocrText: string,
  categories: Category[]
): ParsedTransactionDraft {
  const lines = ocrText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 1);

  if (lines.length === 0) return {};

  // 1. Extract Merchant Name from top lines
  const skipMerchantRegex =
    /^(struk|nota|receipt|welcome|selamat|jl\.|jalan|telp|npwp|tanggal|date|kasir|cashier|\d+[-/]\d+)/i;
  let merchant = '';
  for (const line of lines.slice(0, 5)) {
    const alphaCount = (line.match(/[a-zA-Z]/g) || []).length;
    if (alphaCount >= 3 && !skipMerchantRegex.test(line)) {
      merchant = line.replace(/[^a-zA-Z0-9\s&.'-]/g, '').trim();
      if (merchant.length >= 3) break;
    }
  }

  // 2. Extract Total Amount (prioritize lines with TOTAL / BAYAR / TAGIHAN)
  let totalAmount: number | undefined;
  const totalKeywords =
    /(grand\s*t[o0]tal|t[o0]tal\s*bayar|t[o0]tal\s*belanja|t[o0]tal\s*tagihan|jumlah\s*bayar|amount\s*due|amount\s*paid|to\s*pay|net\s*t[o0]tal|netto|tagihan|pembayaran|\bt[o0]tal\b|\bjumlah\b)/i;

  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    if (totalKeywords.test(line) && !/(sub\s*total|diskon|discount|kembali|change|pajak|tax|ppn|tunai|cash)/i.test(line)) {
      const val = extractAmountFromReceiptLine(line);
      if (val !== null) {
        totalAmount = val;
        break;
      }
      // Check next line if number is on the line below
      if (i + 1 < lines.length) {
        const nextVal = extractAmountFromReceiptLine(lines[i + 1]);
        if (nextVal !== null) {
          totalAmount = nextVal;
          break;
        }
      }
    }
  }

  // Fallback: largest plausible amount in bottom half of receipt
  if (!totalAmount) {
    let maxFound = 0;
    const bottomHalf = lines.slice(Math.floor(lines.length / 3));
    for (const line of bottomHalf) {
      if (/(kembali|change|tunai|cash|bayar)/i.test(line)) continue;
      const val = extractAmountFromReceiptLine(line);
      if (val !== null && val > maxFound) {
        maxFound = val;
      }
    }
    if (maxFound > 0) totalAmount = maxFound;
  }

  // 3. Extract Date (YYYY-MM-DD or DD/MM/YYYY or DD-MM-YYYY)
  let date: string | undefined;
  for (const line of lines) {
    const isoMatch = line.match(/\b(20\d{2})[-/](\d{1,2})[-/](\d{1,2})\b/);
    if (isoMatch) {
      date = `${isoMatch[1]}-${isoMatch[2].padStart(2, '0')}-${isoMatch[3].padStart(2, '0')}`;
      break;
    }
    const dmyMatch = line.match(/\b(\d{1,2})[-/](\d{1,2})[-/](20\d{2}|\d{2})\b/);
    if (dmyMatch) {
      const yr = dmyMatch[3].length === 2 ? `20${dmyMatch[3]}` : dmyMatch[3];
      const mo = Number(dmyMatch[2]);
      const dy = Number(dmyMatch[1]);
      if (mo >= 1 && mo <= 12 && dy >= 1 && dy <= 31) {
        date = `${yr}-${String(mo).padStart(2, '0')}-${String(dy).padStart(2, '0')}`;
        break;
      }
    }
  }

  // 4. Guess Category from full receipt text
  const fullLower = ocrText.toLowerCase();
  let categoryId: string | undefined;
  for (const [catId, words] of Object.entries(EXPENSE_KEYWORDS)) {
    if (
      categories.some((c) => c.id === catId && c.type === 'expense') &&
      words.some((w) => fullLower.includes(w))
    ) {
      categoryId = catId;
      break;
    }
  }

  return {
    type: 'expense',
    amount: totalAmount,
    title: merchant ? capitalizeTitle(merchant) : 'Belanja Struk',
    categoryId,
    date,
  };
}
