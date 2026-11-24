# Play Store Listing — Many Money (Siap Salin)

## Identitas Teknis
- **Package Name (`applicationId`):** `com.inuniverse.manymoney` (permanen, sudah sesuai `capacitor.config.json`)
- **Target API Level:** Android 16 (API level 36) atau lebih tinggi
- **Format Upload:** Android App Bundle (`.aab`) + aktifkan **Play App Signing**
- **Privacy Policy URL (live):** `https://many-money-theta.vercel.app/privacy.html`

---

## 1. Judul & Deskripsi (Bahasa Indonesia)
- **Judul Aplikasi (maks. 30 karakter):**
  `Many Money: Catat Keuangan` *(26 karakter)*
- **Deskripsi Singkat (maks. 80 karakter):**
  `Catat pemasukan, pengeluaran, aset, & scan struk. Ringan, gratis, tanpa iklan.` *(79 karakter)*
- **Deskripsi Lengkap (maks. 4.000 karakter):**
```text
Many Money adalah aplikasi pencatat keuangan pribadi yang bersih, ringan, dan bebas iklan. Dirancang untuk membantu Anda mencatat pengeluaran harian, memantau pemasukan, mengatur anggaran, dan melacak saldo aset hanya dalam hitungan detik.

FITUR UTAMA:
• Catat Super Cepat: Ketik catatan seperti "sarapan 10 le" atau "kopi 25rb", nominal dan kategori langsung terdeteksi otomatis.
• Scan Struk & Input Suara: Foto atau pilih gambar struk dari galeri, atau dikte transaksi lewat mikrofon (diproses langsung di perangkat).
• Kelola Banyak Mata Uang: Mendukung IDR (Rp), EGP (E£), USD ($), GBP (£), SGD (S$), dan puluhan mata uang populer lainnya.
• Statistik & Anggaran: Grafik kategori interaktif, ringkasan harian/kalender/bulanan, serta pengatur batas anggaran pengeluaran.
• Mode Guest atau Sync Cloud: Pakai langsung tanpa login (tersimpan di perangkat), atau masuk dengan Akun Google untuk sinkronisasi otomatis via Supabase.
• Ekspor Data: Unduh laporan transaksi ke CSV/Excel maupun cadangan JSON kapan saja.

Tanpa iklan, tanpa langganan tersembunyi. Fokus bantu keuanganmu tetap rapi setiap hari.
```

---

## 2. Judul & Deskripsi (English)
- **App Name (max 30 chars):**
  `Many Money: Expense Tracker` *(27 chars)*
- **Short Description (max 80 chars):**
  `Clean, ad-free expense, budget & asset tracker with receipt OCR & cloud sync.` *(78 chars)*
- **Full Description (max 4,000 chars):**
```text
Many Money is a clean, lightweight, and ad-free personal finance tracker built to make daily expense logging effortless.

KEY FEATURES:
• Smart Quick Entry: Type naturally like "breakfast 10 le" or "coffee 5" and let Many Money auto-fill amount and category.
• Receipt Scan & Voice Input: Capture or pick a receipt photo from your gallery, or dictate expenses via microphone.
• Multi-Currency Ready: Supports IDR, EGP, USD, GBP, SGD, EUR, and top global currencies.
• Insights & Budgets: Visual category breakdown, daily/calendar/monthly views, and monthly spending limits.
• Guest Mode or Google Sync: Start privately on your device without an account, or sign in with Google to sync securely via Supabase.
• Easy Export: Export transactions to CSV/Excel or JSON backup anytime.
```

---

## 3. Data Safety & Policy Notes (Untuk Form Play Console)
- **Mengumpulkan data pengguna?** Ya (jika user login Google/Email: **Email address** & **User ID** untuk fungsi *App functionality / Account management*). Mode Guest tidak mengirim data ke server.
- **Data dibagikan ke pihak ketiga?** Tidak (tidak dijual dan tidak untuk iklan).
- **Enkripsi transit?** Ya (HTTPS/TLS via Supabase & Vercel).
- **Mekanisme Hapus Akun:**
  - Wajib sediakan URL penghapusan akun / instruksi jelas: `https://many-money-theta.vercel.app/privacy.html` (dan sangat disarankan menambahkan tombol *"Hapus Akun"* langsung di dalam menu **Lainnya → Akun & Sinkronisasi** sebelum submit Production!).
- **Iklan:** Tidak mengandung iklan.
- **Target Audiens:** 13+ / Semua usia non-anak (bukan aplikasi khusus anak-anak).
