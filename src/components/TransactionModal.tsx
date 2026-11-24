import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Calculator, Camera, Loader2, Mic, MicOff, Sparkles, Star, Trash2, X } from 'lucide-react';
import { Transaction, TransactionType } from '../types';
import { useMoneyStore } from '../store/useMoneyStore';
import { LiquidGlassTabs } from './LiquidGlassTabs';
import { CategoryBadge } from './CategoryIcon';
import { CURRENCIES, toISODate } from '../utils/format';
import { parseReceiptText, parseVoiceToTransaction } from '../utils/smartParser';

interface TransactionModalProps {
  open: boolean;
  editingTx: Transaction | null;
  defaultDate?: string;
  autoStartVoice?: boolean;
  onClose: () => void;
}

function safeEvalMath(expr: string): number | null {
  const cleaned = expr.replace(/[^0-9.+\-*/() ]/g, '').trim();
  if (!cleaned) return null;
  try {
    // eslint-disable-next-line no-new-func
    const val = Function(`"use strict"; return (${cleaned})`)();
    if (typeof val === 'number' && Number.isFinite(val) && val >= 0) {
      return Math.round(val * 100) / 100;
    }
    return null;
  } catch {
    return null;
  }
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  open,
  editingTx,
  defaultDate,
  autoStartVoice = false,
  onClose,
}) => {
  const {
    transactions,
    categories,
    accounts,
    settings,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    addRecurring,
  } = useMoneyStore();

  const [type, setType] = useState<TransactionType>('expense');
  const [amountInput, setAmountInput] = useState('');
  const [date, setDate] = useState(defaultDate || toISODate(new Date()));
  const [time, setTime] = useState('12:00');
  const [categoryId, setCategoryId] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || 'acc-tunai');
  const [toAccountId, setToAccountId] = useState(accounts[1]?.id || 'acc-bank');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [isFavorite, setIsFavorite] = useState(false);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [repeatFreq, setRepeatFreq] = useState<'none' | 'weekly' | 'monthly' | 'yearly'>('none');
  const [showCalc, setShowCalc] = useState(false);

  // Free On-Device Voice & Receipt OCR State
  const [isListening, setIsListening] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState('');
  const [showQuickText, setShowQuickText] = useState(false);
  const [quickTextInput, setQuickTextInput] = useState('');
  const [smartStatus, setSmartStatus] = useState<string | null>(null);
  const [ocrProgress, setOcrProgress] = useState<number | null>(null);
  const recognitionRef = useRef<{ stop: () => void; abort?: () => void } | null>(null);
  const receiptInputRef = useRef<HTMLInputElement>(null);

  const filteredCategories = categories.filter(
    (c) => c.type === (type === 'income' ? 'income' : 'expense')
  );

  useEffect(() => {
    if (!open) return;
    if (editingTx) {
      setType(editingTx.type);
      setAmountInput(String(editingTx.amount));
      setDate(editingTx.date);
      setTime(editingTx.time || '12:00');
      setCategoryId(editingTx.categoryId);
      setAccountId(editingTx.accountId);
      setToAccountId(editingTx.toAccountId || accounts[1]?.id || accounts[0]?.id || '');
      setTitle(editingTx.title);
      setDescription(editingTx.description || '');
      setIsFavorite(Boolean(editingTx.isFavorite));
      setSelectedTags(editingTx.tags || []);
    } else {
      const now = new Date();
      setType('expense');
      setAmountInput('');
      setDate(defaultDate || toISODate(now));
      setTime(
        `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
      );
      const firstExp = categories.find((c) => c.type === 'expense');
      setCategoryId(firstExp?.id || '');
      setAccountId(accounts[0]?.id || 'acc-tunai');
      setToAccountId(accounts[1]?.id || accounts[0]?.id || '');
      setTitle('');
      setDescription('');
      setIsFavorite(false);
      setSelectedTags([]);
    }
    setShowCalc(false);
    setIsListening(false);
    setVoiceTranscript('');
    setShowQuickText(false);
    setQuickTextInput('');
    setSmartStatus(null);
    setOcrProgress(null);

    if (autoStartVoice && !editingTx) {
      setTimeout(() => {
        startVoiceCapture();
      }, 240);
    }

    return () => {
      try {
        recognitionRef.current?.abort?.();
      } catch {
        recognitionRef.current?.stop();
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editingTx, defaultDate]);

  const applyDraft = (draft: ReturnType<typeof parseVoiceToTransaction>, sourceLabel: string) => {
    if (draft.type) setType(draft.type);
    if (draft.amount && draft.amount > 0) setAmountInput(String(draft.amount));
    if (draft.title) setTitle(draft.title);
    if (draft.categoryId) setCategoryId(draft.categoryId);
    if (draft.accountId) setAccountId(draft.accountId);
    if (draft.date) setDate(draft.date);
    setSmartStatus(sourceLabel);
  };

  const startVoiceCapture = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      return;
    }

    const w = window as unknown as {
      SpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: (e: { error?: string }) => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
        abort: () => void;
      };
      webkitSpeechRecognition?: new () => {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        maxAlternatives: number;
        onresult: (e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void;
        onerror: (e: { error?: string }) => void;
        onend: () => void;
        start: () => void;
        stop: () => void;
        abort: () => void;
      };
    };

    const SpeechRec = w.SpeechRecognition || w.webkitSpeechRecognition;
    if (!SpeechRec) {
      setShowQuickText(true);
      setSmartStatus('Browser ini belum mendukung Mic langsung — pakai Quick Input (atau Mic keyboard) di bawah.');
      return;
    }

    try {
      const rec = new SpeechRec();
      rec.lang = settings.language === 'en' ? 'en-US' : 'id-ID';
      rec.continuous = false;
      rec.interimResults = true;
      rec.maxAlternatives = 1;

      let finalText = '';
      let hadError = false;
      rec.onresult = (event) => {
        let combined = '';
        for (let i = 0; i < event.results.length; i++) {
          combined += event.results[i][0].transcript + ' ';
        }
        finalText = combined.trim();
        setVoiceTranscript(finalText);
      };

      rec.onerror = (event) => {
        hadError = true;
        setIsListening(false);
        setShowQuickText(true);
        const err = event?.error || 'unknown';
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          setSmartStatus(
            'Izin mic ditolak browser/WebView. Buka lewat Chrome/HTTPS atau pakai Quick Input (Mic keyboard) di bawah.'
          );
        } else if (err === 'network') {
          setSmartStatus(
            'Layanan suara browser butuh koneksi/Chrome. Pakai Quick Input di bawah sementara.'
          );
        } else if (err === 'no-speech') {
          setSmartStatus('Tidak ada suara terdeteksi. Coba lagi atau ketik di Quick Input.');
        } else {
          setSmartStatus(`Mic terhenti (${err}). Gunakan Quick Input di bawah.`);
        }
      };

      rec.onend = () => {
        setIsListening(false);
        if (finalText.trim()) {
          const parsed = parseVoiceToTransaction(
            finalText,
            categories,
            accounts,
            transactions
          );
          applyDraft(parsed, `Terisi dari suara: "${finalText}"`);
        } else if (!hadError) {
          setShowQuickText(true);
          setSmartStatus('Suara belum tertangkap — coba lagi atau ketik cepat di bawah.');
        }
      };

      recognitionRef.current = rec;
      setVoiceTranscript('');
      setSmartStatus(null);
      setIsListening(true);
      rec.start();
    } catch {
      setIsListening(false);
      setShowQuickText(true);
      setSmartStatus('Tidak bisa membuka mikrofon di browser ini — pakai Quick Input di bawah.');
    }
  };

  const handleApplyQuickText = () => {
    if (!quickTextInput.trim()) return;
    const parsed = parseVoiceToTransaction(
      quickTextInput,
      categories,
      accounts,
      transactions
    );
    applyDraft(parsed, `Terisi otomatis: "${quickTextInput.trim()}"`);
    setQuickTextInput('');
    setShowQuickText(false);
  };

  const preprocessReceiptImage = async (file: File): Promise<HTMLCanvasElement | File> => {
    try {
      const bitmap = await createImageBitmap(file);
      const maxDim = 1600;
      const scale = Math.min(1, maxDim / Math.max(bitmap.width, bitmap.height));
      const w = Math.max(1, Math.round(bitmap.width * scale));
      const h = Math.max(1, Math.round(bitmap.height * scale));
      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) return file;
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, w, h);
      ctx.filter = 'grayscale(1) contrast(1.45) brightness(1.05)';
      ctx.drawImage(bitmap, 0, 0, w, h);
      bitmap.close?.();
      return canvas;
    } catch {
      return file;
    }
  };

  const handleReceiptSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    setOcrProgress(5);
    setSmartStatus(null);
    try {
      const processed = await preprocessReceiptImage(file);
      const { createWorker } = await import('tesseract.js');
      const worker = await createWorker('eng', 1, {
        logger: (m: { status?: string; progress?: number }) => {
          if (m.status === 'recognizing text' && typeof m.progress === 'number') {
            setOcrProgress(Math.max(15, Math.round(m.progress * 100)));
          }
        },
      });
      const {
        data: { text },
      } = await worker.recognize(processed);
      await worker.terminate();

      const parsed = parseReceiptText(text, categories);
      applyDraft(
        parsed,
        parsed.amount
          ? `Struk terbaca: ${parsed.title || 'Belanja'} (${parsed.amount})`
          : text.trim().length > 0
            ? 'Struk terbaca — nominal belum terdeteksi, cek kolom Nominal.'
            : 'Teks struk tidak terbaca — coba foto lebih dekat & terang.'
      );
    } catch (err) {
      console.error('Receipt OCR error:', err);
      setSmartStatus('Gagal membaca gambar struk — pastikan koneksi stabil & foto jelas.');
    } finally {
      setOcrProgress(null);
    }
  };

  useEffect(() => {
    if (type === 'transfer') return;
    const valid = filteredCategories.some((c) => c.id === categoryId);
    if (!valid && filteredCategories[0]) {
      setCategoryId(filteredCategories[0].id);
    }
  }, [type, filteredCategories, categoryId]);

  const handleSave = () => {
    const computed = safeEvalMath(amountInput);
    if (!computed || computed <= 0) return;
    const payload = {
      type,
      amount: computed,
      date,
      time,
      categoryId: type === 'transfer' ? '' : categoryId,
      accountId,
      toAccountId: type === 'transfer' ? toAccountId : undefined,
      title:
        title.trim() ||
        (type === 'transfer'
          ? 'Transfer antar akun'
          : categories.find((c) => c.id === categoryId)?.name || 'Transaksi'),
      description: description.trim() || undefined,
      isFavorite,
      tags: selectedTags.length ? selectedTags : undefined,
    };

    if (editingTx) {
      updateTransaction(editingTx.id, payload);
    } else {
      addTransaction(payload);
      if (repeatFreq !== 'none' && type !== 'transfer') {
        const dayNum = Number(date.split('-')[2]) || 1;
        addRecurring({
          title: payload.title,
          type: type === 'income' ? 'income' : 'expense',
          amount: payload.amount,
          categoryId: payload.categoryId,
          accountId: payload.accountId,
          frequency: repeatFreq,
          dayOfMonth: dayNum,
          active: true,
        });
      }
    }
    setRepeatFreq('none');
    onClose();
  };

  const appendCalc = (key: string) => {
    if (key === 'C') {
      setAmountInput('');
    } else if (key === '⌫') {
      setAmountInput((p) => p.slice(0, -1));
    } else if (key === '=') {
      const res = safeEvalMath(amountInput);
      if (res !== null) setAmountInput(String(res));
    } else {
      setAmountInput((p) => p + key);
    }
  };

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const currencyMeta = CURRENCIES[settings.currency];
  const isLight = settings.theme === 'light';

  // Smart note autocomplete from past transactions (only shown while typing)
  const noteSuggestions = React.useMemo(() => {
    const q = title.trim().toLowerCase();
    if (!q) return [];
    const map = new Map<
      string,
      { title: string; count: number; categoryId: string; accountId: string; lastAmount: number }
    >();
    for (const tx of transactions) {
      if (tx.type !== type) continue;
      const key = tx.title.trim().toLowerCase();
      if (!key) continue;
      const prev = map.get(key);
      if (prev) {
        prev.count += 1;
      } else {
        map.set(key, {
          title: tx.title.trim(),
          count: 1,
          categoryId: tx.categoryId,
          accountId: tx.accountId,
          lastAmount: tx.amount,
        });
      }
    }
    return Array.from(map.values())
      .filter((item) => {
        const lower = item.title.toLowerCase();
        return lower.includes(q) && lower !== q;
      })
      .sort((a, b) => {
        const aStarts = a.title.toLowerCase().startsWith(q) ? 1 : 0;
        const bStarts = b.title.toLowerCase().startsWith(q) ? 1 : 0;
        if (aStarts !== bStarts) return bStarts - aStarts;
        return b.count - a.count;
      })
      .slice(0, 4);
  }, [transactions, type, title]);

  // Detect if user typed an amount inside Catatan directly (e.g. "sarapan 10 le")
  const inlineParsedNote = React.useMemo(() => {
    if (!/\d/.test(title)) return null;
    const parsed = parseVoiceToTransaction(title, categories, accounts, transactions);
    if (!parsed.amount || parsed.amount <= 0) return null;
    return parsed;
  }, [title, categories, accounts, transactions]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.18 }}
            onClick={onClose}
            className="absolute inset-0 bg-black/55"
          />

          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="relative z-10 w-full max-w-[430px] max-h-[92vh] flex flex-col rounded-t-[28px] sm:rounded-[28px] ios-sheet overflow-hidden"
          >
            {/* Pinned Top Header */}
            <div className="px-5 pt-3.5 pb-2.5 shrink-0">
              <div className="w-9 h-1 rounded-full bg-[var(--text-tertiary)]/50 mx-auto mb-3 sm:hidden" />

              <div className="flex items-center justify-between">
                <h2 className="text-[17px] font-bold">
                  {editingTx ? 'Edit Transaksi' : 'Transaksi Baru'}
                </h2>
                <div className="flex items-center gap-2">
                  {!editingTx && (
                    <>
                      <button
                        type="button"
                        onClick={startVoiceCapture}
                        className={`w-8 h-8 rounded-full flex items-center justify-center transition ${
                          isListening
                            ? 'bg-[#FF453A] text-white animate-pulse'
                            : 'bg-[#0A84FF]/15 text-[#0A84FF] border border-[#0A84FF]/35'
                        }`}
                        title="Input Suara (Gratis)"
                        aria-label="Input Suara"
                      >
                        {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                      </button>
                      <button
                        type="button"
                        disabled={ocrProgress !== null}
                        onClick={() => receiptInputRef.current?.click()}
                        className="w-8 h-8 rounded-full bg-[#30D158]/15 text-[#30D158] border border-[#30D158]/35 flex items-center justify-center transition disabled:opacity-60"
                        title="Scan Struk"
                        aria-label="Scan Struk"
                      >
                        {ocrProgress !== null ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Camera className="w-4 h-4" />
                        )}
                      </button>
                    </>
                  )}
                  <button
                    type="button"
                    onClick={() => setIsFavorite((v) => !v)}
                    className="w-8 h-8 rounded-full ios-input-well flex items-center justify-center"
                    style={{ color: isFavorite ? 'var(--sys-orange)' : 'var(--text-secondary)' }}
                    aria-label="Favorit"
                  >
                    <Star className={`w-4 h-4 ${isFavorite ? 'fill-current' : ''}`} />
                  </button>
                  {editingTx && (
                    <button
                      type="button"
                      onClick={() => {
                        deleteTransaction(editingTx.id);
                        onClose();
                      }}
                      className="w-8 h-8 rounded-full ios-input-well flex items-center justify-center"
                      style={{ color: 'var(--sys-red)' }}
                      aria-label="Hapus transaksi"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={onClose}
                    className="w-8 h-8 rounded-full ios-input-well text-[var(--text-secondary)] flex items-center justify-center"
                    aria-label="Tutup"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <LiquidGlassTabs
                  options={[
                    { id: 'expense', label: 'Pengeluaran' },
                    { id: 'income', label: 'Pemasukan' },
                    { id: 'transfer', label: 'Transfer' },
                  ]}
                  value={type}
                  onChange={setType}
                  isLight={isLight}
                  size="sm"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto no-scrollbar px-5 pb-4">

              <input
                ref={receiptInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleReceiptSelected}
                className="hidden"
              />

              {/* Live Voice / OCR / High-Contrast B&W Smart Status */}
              {!editingTx && (isListening || ocrProgress !== null || smartStatus || showQuickText) && (
                <div className="mb-3 space-y-2">
                  {isListening && (
                    <div className="rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] px-3.5 py-2.5 text-[12.5px] font-medium">
                      <span className="font-bold">Mendengarkan: </span>
                      {voiceTranscript || 'Ucapkan mis. "Sarapan 10 le"...'}
                    </div>
                  )}

                  {ocrProgress !== null && (
                    <div className="rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] px-3.5 py-2 text-[12.5px] font-semibold flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Membaca struk... {ocrProgress}%</span>
                    </div>
                  )}

                  {smartStatus && !isListening && ocrProgress === null && (
                    <div className="rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] px-3.5 py-2 flex items-center gap-2 text-[12px] font-semibold shadow-sm">
                      <Sparkles className="w-3.5 h-3.5 shrink-0" />
                      <span className="truncate">{smartStatus}</span>
                    </div>
                  )}

                  {showQuickText && !isListening && (
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={quickTextInput}
                        onChange={(e) => setQuickTextInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            handleApplyQuickText();
                          }
                        }}
                        placeholder='Ketik / dikte: "Sarapan 10 le"'
                        className="flex-1 rounded-[12px] ios-input-well px-3.5 py-2 text-[13px] outline-none placeholder:text-[var(--text-tertiary)]"
                      />
                      <button
                        type="button"
                        onClick={handleApplyQuickText}
                        className="px-3.5 py-2 rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] text-[12.5px] font-semibold shrink-0"
                      >
                        Isi
                      </button>
                    </div>
                  )}
                </div>
              )}

            {/* Amount Box */}
            <div className="rounded-[16px] ios-input-well p-4 mb-4">
              <div className="flex items-center justify-between text-[12px] text-[var(--text-secondary)] mb-1">
                <span>Nominal ({settings.currency})</span>
                <button
                  type="button"
                  onClick={() => setShowCalc((v) => !v)}
                  className="inline-flex items-center gap-1 font-semibold"
                  style={{ color: 'var(--sys-blue)' }}
                >
                  <Calculator className="w-3.5 h-3.5" />
                  {showCalc ? 'Tutup' : 'Kalkulator'}
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold text-[var(--text-secondary)]">
                  {currencyMeta.symbol}
                </span>
                <input
                  type="text"
                  inputMode="decimal"
                  value={amountInput}
                  onChange={(e) => setAmountInput(e.target.value)}
                  placeholder={settings.showDecimals ? '0.00' : '0'}
                  className="w-full bg-transparent text-[32px] font-bold tabular-nums outline-none placeholder:text-[var(--text-tertiary)]"
                />
              </div>

              {showCalc && (
                <div className="grid grid-cols-4 gap-1.5 mt-3 pt-3 border-t ios-divider">
                  {[
                    '7',
                    '8',
                    '9',
                    '/',
                    '4',
                    '5',
                    '6',
                    '*',
                    '1',
                    '2',
                    '3',
                    '-',
                    'C',
                    '0',
                    '.',
                    '+',
                    '⌫',
                    '=',
                  ].map((k) => (
                    <button
                      key={k}
                      type="button"
                      onClick={() => appendCalc(k)}
                      className={`py-2.5 rounded-[10px] text-sm font-semibold transition active:opacity-70 ${
                        k === '='
                          ? 'col-span-3 bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                          : 'ios-card'
                      }`}
                    >
                      {k}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Date & Time */}
            <div className="grid grid-cols-2 gap-2.5 mb-3">
              <label className="rounded-[12px] ios-input-well px-3.5 py-2.5 block">
                <span className="text-[11px] text-[var(--text-secondary)] block mb-0.5">
                  Tanggal
                </span>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full bg-transparent text-[14px] font-medium outline-none"
                />
              </label>
              <label className="rounded-[12px] ios-input-well px-3.5 py-2.5 block">
                <span className="text-[11px] text-[var(--text-secondary)] block mb-0.5">
                  Waktu
                </span>
                <input
                  type="time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className="w-full bg-transparent text-[14px] font-medium outline-none"
                />
              </label>
            </div>

            {/* Account Pill Selector (Replaces broken OS <select> popup) */}
            <div className="space-y-3 mb-4">
              <div>
                <span className="text-[12px] font-medium text-[var(--text-secondary)] block mb-2 px-0.5">
                  {type === 'transfer' ? 'Dari Aset' : 'Aset'}
                </span>
                <div className="flex flex-wrap gap-2">
                  {accounts.map((a) => {
                    const selected = a.id === accountId;
                    return (
                      <button
                        key={a.id}
                        type="button"
                        onClick={() => setAccountId(a.id)}
                        className={`px-3.5 py-2 rounded-[12px] text-[13.5px] font-semibold transition active:scale-95 ${
                          selected
                            ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                            : 'ios-input-well text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {a.name}
                      </button>
                    );
                  })}
                </div>
              </div>

              {type === 'transfer' && (
                <div>
                  <span className="text-[12px] font-medium text-[var(--text-secondary)] block mb-2 px-0.5">
                    Ke Aset
                  </span>
                  <div className="flex flex-wrap gap-2">
                    {accounts.map((a) => {
                      const selected = a.id === toAccountId;
                      return (
                        <button
                          key={a.id}
                          type="button"
                          onClick={() => setToAccountId(a.id)}
                          className={`px-3.5 py-2 rounded-[12px] text-[13.5px] font-semibold transition active:scale-95 ${
                            selected
                              ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                              : 'ios-input-well text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                          }`}
                        >
                          {a.name}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Category Grid */}
            {type !== 'transfer' && (
              <div className="mb-4">
                <span className="text-[12px] font-medium text-[var(--text-secondary)] block mb-2 px-0.5">
                  Kategori
                </span>
                <div className="grid grid-cols-4 gap-2">
                  {filteredCategories.map((cat) => {
                    const selected = cat.id === categoryId;
                    return (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setCategoryId(cat.id)}
                        className={`flex flex-col items-center justify-center gap-1.5 py-2.5 px-1 rounded-[14px] transition ${
                          selected
                            ? 'ring-2 ring-[#0A84FF] bg-[var(--ios-fill)]'
                            : 'ios-input-well'
                        }`}
                      >
                        <CategoryBadge
                          categoryId={cat.id}
                          type={type === 'income' ? 'income' : 'expense'}
                          size="sm"
                        />
                        <span className="text-[11px] font-medium truncate w-full text-center">
                          {cat.name}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Notes */}
            <div className="space-y-2.5 mb-4">
              <label className="rounded-[12px] ios-input-well px-3.5 py-2.5 block">
                <span className="text-[11px] text-[var(--text-secondary)] block mb-0.5">
                  Catatan
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && inlineParsedNote && !amountInput.trim()) {
                      e.preventDefault();
                      applyDraft(inlineParsedNote, `Terisi otomatis dari "${title.trim()}"`);
                    }
                  }}
                  placeholder="Tulis catatan..."
                  className="w-full bg-transparent text-[14.5px] font-medium outline-none placeholder:text-[var(--text-tertiary)]"
                />
              </label>

              {inlineParsedNote && (
                <button
                  type="button"
                  onClick={() =>
                    applyDraft(inlineParsedNote, `Terisi otomatis dari "${title.trim()}"`)
                  }
                  className="w-full px-3.5 py-2.5 rounded-[12px] bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] flex items-center justify-between text-[12.5px] font-bold shadow-md transition active:scale-[0.99]"
                >
                  <span className="inline-flex items-center gap-1.5 truncate">
                    <Sparkles className="w-3.5 h-3.5 shrink-0" />
                    Auto-isi: {inlineParsedNote.title || 'Transaksi'} · {currencyMeta.symbol}{' '}
                    {inlineParsedNote.amount}
                  </span>
                  <span className="shrink-0 underline underline-offset-2">Terapkan</span>
                </button>
              )}

              {noteSuggestions.length > 0 && (
                <div className="space-y-1.5">
                  {noteSuggestions.map((s) => (
                    <button
                      key={s.title}
                      type="button"
                      onClick={() => {
                        setTitle(s.title);
                        if (s.categoryId) setCategoryId(s.categoryId);
                        if (s.accountId) setAccountId(s.accountId);
                        if (!amountInput.trim() && s.lastAmount > 0) {
                          setAmountInput(String(s.lastAmount));
                        }
                      }}
                      className="w-full px-3.5 py-2 rounded-[12px] ios-input-well flex items-center justify-between text-[12.5px] active:scale-[0.99] transition"
                    >
                      <span className="font-semibold truncate">{s.title}</span>
                      <span className="text-[11.5px] text-[var(--text-secondary)] shrink-0 ml-2">
                        {currencyMeta.symbol} {s.lastAmount.toLocaleString('id-ID')} · Pakai
                      </span>
                    </button>
                  ))}
                </div>
              )}

              <label className="rounded-[12px] ios-input-well px-3.5 py-2.5 block">
                <span className="text-[11px] text-[var(--text-secondary)] block mb-0.5">
                  Deskripsi (opsional)
                </span>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail ekstra..."
                  className="w-full bg-transparent text-[14px] outline-none placeholder:text-[var(--text-tertiary)]"
                />
              </label>
            </div>

            {settings.tags.length > 0 && (
              <div className="mb-5">
                <span className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5 px-0.5">
                  Tag
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {settings.tags.map((tag) => {
                    const active = selectedTags.includes(tag);
                    return (
                      <button
                        key={tag}
                        type="button"
                        onClick={() => toggleTag(tag)}
                        className={`px-3 py-1 rounded-full text-[12px] font-medium transition ${
                          active
                            ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                            : 'ios-input-well text-[var(--text-secondary)]'
                        }`}
                      >
                        #{tag}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {!editingTx && type !== 'transfer' && (
              <div className="mb-4">
                <span className="text-[12px] font-medium text-[var(--text-secondary)] block mb-1.5 px-0.5">
                  Ulangi Otomatis
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { id: 'none' as const, label: 'Sekali' },
                    { id: 'weekly' as const, label: 'Mingguan' },
                    { id: 'monthly' as const, label: 'Bulanan' },
                    { id: 'yearly' as const, label: 'Tahunan' },
                  ].map((opt) => {
                    const active = repeatFreq === opt.id;
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setRepeatFreq(opt.id)}
                        className={`px-3 py-1.5 rounded-full text-[12px] font-medium transition ${
                          active
                            ? 'bg-[var(--accent-primary)] text-[var(--accent-primary-fg)]'
                            : 'ios-input-well text-[var(--text-secondary)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            </div>

            {/* Sticky Bottom Save CTA */}
            <div
              className="px-5 pt-3 pb-6 border-t shrink-0"
              style={{ borderColor: 'var(--ios-separator)' }}
            >
              <button
                type="button"
                onClick={handleSave}
                className="w-full py-3.5 rounded-full bg-[var(--accent-primary)] text-[var(--accent-primary-fg)] font-bold text-[15px] active:opacity-85 transition"
              >
                {editingTx ? 'Simpan Perubahan' : 'Simpan Transaksi'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
