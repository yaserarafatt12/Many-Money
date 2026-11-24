# Checklist Praproduksi Google Play — Many Money

## 1. Akun Google Play Console (Saat Berusia 18+)
- [ ] Daftar akun **Personal** di Google Play Console (`$25 USD` sekali bayar).
- [ ] Siapkan **KTP / Paspor** asli, email aktif, nomor HP aktif.
- [ ] Lakukan **verifikasi perangkat** lewat aplikasi **Google Play Console** di HP Android fisik.

## 2. Persiapan Teknis (`com.inuniverse.manymoney`)
- [ ] Pastikan project Android Capacitor dibuat (`npx cap add android`) dan di-set `targetSdkVersion = 36` & `compileSdkVersion = 36` (Android 16).
- [ ] Tambahkan tombol **Hapus Akun** di dalam app (wajib Google Play karena ada login Google/Email).
- [ ] Build Android App Bundle (`.aab`) signed release di Android Studio / Gradle (`./gradlew bundleRelease`).
- [ ] Aktifkan **Play App Signing** saat pertama kali upload `.aab` di Play Console.

## 3. Aset Etalase (Store Listing)
- [ ] **App Icon:** `512 × 512 px` (PNG 32-bit, tanpa transparansi aneh).
- [ ] **Feature Graphic:** `1024 × 500 px` (PNG/JPG).
- [ ] **Screenshots HP:** Minimal 2–5 screenshot rasio HP (1080×1920 atau 1080×2400).
- [ ] **Privacy Policy URL:** `https://many-money-theta.vercel.app/privacy.html`

## 4. Closed Testing (12 Tester × 14 Hari Berturut-turut)
- [ ] Buat **Google Group** khusus tester (supaya tester tinggal klik 1 link join group, tidak perlu input email satu per satu).
- [ ] Targetkan **15–18 tester** (buffer di atas syarat minimum 12) dari:
  - **Reddit:** `r/AndroidClosedTesting` (`https://www.reddit.com/r/AndroidClosedTesting/`)
  - **App Play Store:** `Testers Community`
  - **Facebook / Telegram:** Grup *Android Developers Indonesia* / *Komunitas Developer Android Indonesia*
  - **Teman/keluarga Android terdekat** (2–4 HP fisik berbeda)
- [ ] Pastikan tester membuka app secara berkala selama 14 hari penuh dan menulis feedback singkat di Play Store.
- [ ] Setelah hari ke-14 selesai, isi kuesioner **Production Access** di Play Console.
