# KOIN KU - Financial Manager

Aplikasi manajemen keuangan pribadi dengan desain modern-soft, Next.js 15, dan Supabase PostgreSQL.

## Fitur

- Profil, kategori, dan transaksi disimpan di Supabase PostgreSQL.
- API server-side memakai koneksi `DATABASE_URL`; secret key Supabase tidak dikirim ke browser.
- Data selalu dibaca dari database online; tidak ada cache atau mode offline di browser.
- Migrasi database SQL berurutan, transactional, dan tercatat dengan checksum.
- Halaman Insight: skor kesehatan finansial, tren & proyeksi, analisis kategori, serta tips otomatis.
- Halaman Rencana Gaji: pembagian 40/30/20/10, pengaturan tanggal gajian (default 28), batas harian, fase dana darurat, dan jadwal alokasi otomatis.

## Menyiapkan aplikasi

1. Salin `.env.example` menjadi `.env`.
2. Isi nilai Supabase project dan `DATABASE_URL` dari Supabase Dashboard → Project Settings → Database.
   Gunakan **Connection Pooler** (host `db.<ref>.supabase.co` sekarang hanya IPv6 sehingga gagal di banyak jaringan):
   `postgresql://postgres.<project-ref>:PASSWORD@aws-0-<region>.pooler.supabase.com:5432/postgres`.
   Pastikan password pada URL di-percent-encode bila mengandung karakter khusus (contoh `&` menjadi `%26`).
   Root CA Supabase sudah dibundel di `src/lib/supabase-ca.ts`, jadi tidak wajib diunduh. Bila ingin override,
   isi `DATABASE_SSL_ROOT_CERT_PATH` (path berkas, untuk lokal) atau `DATABASE_SSL_ROOT_CERT` (isi PEM/base64, untuk serverless).
   Koneksi selalu memverifikasi sertifikat dan hostname; aplikasi tetap mewajibkan TLS meskipun URL memiliki parameter `sslmode`
   yang bertentangan. Jangan menonaktifkan verifikasi TLS untuk mengatasi error sertifikat. Secret key dan kredensial database
   harus tetap server-side; jangan beri awalan `NEXT_PUBLIC_`.
3. Install dependencies dengan `npm install`.
4. Terapkan migrasi SQL ke database yang dipilih:

   ```bash
   npm run migrate
   ```

5. Jalankan aplikasi:

   ```bash
   npm run dev
   ```

Migrasi tidak berjalan otomatis ketika server aplikasi dimulai. Runner membaca file SQL di `supabase/migrations/`, mengambil advisory lock, menerapkan tiap file dalam transaksi, lalu mencatat SHA-256. Menjalankan `npm run migrate` kembali aman: migrasi yang sudah tercatat dilewati, dan perubahan pada file yang sudah diterapkan akan ditolak.

## Migrasi

File SQL migrasi diberi nama `YYYYMMDDNNNN_nama_migrasi.sql` dan diterapkan secara berurutan. Migrasi awal membuat:

| Tabel | Kegunaan |
|---|---|
| `public.profiles` | Saldo awal, target & saldo dana darurat, gaji bulanan, tanggal gajian, status cicilan, dan penanda reset data |
| `public.categories` | Kategori pemasukan/pengeluaran dan anggaran |
| `public.transactions` | Transaksi dan referensi kategori |
| `public.schema_migrations` | Riwayat migrasi yang dikelola runner |

Jangan mengedit file migrasi yang sudah berhasil diterapkan; tambahkan file baru untuk perubahan schema. Migrasi awal hanya membuat tabel/index dan seed profil/kategori awal.

## Reset data

`npm run reset-data` membersihkan data secara aman (default hanya transaksi):

```bash
npm run reset-data -- --dry-run          # lihat jumlah data tanpa mengubah
npm run reset-data                        # kosongkan transaksi saja
npm run reset-data -- --full              # transaksi + kategori bawaan + profil default
```

Transaksi yang dihapus juga memperbarui `profiles.data_reset_at`. Karena aplikasi selalu membaca data
dari server, halaman akan langsung menampilkan kondisi kosong setelah reset tanpa menyisakan cache lokal.

## Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan Next.js pada port 9002 |
| `npm run migrate` | Menerapkan migrasi SQL ke `DATABASE_URL` |
| `npm run reset-data` | Membersihkan data di `DATABASE_URL` |
| `npm run typecheck` | Memeriksa TypeScript |
| `npm run lint` | Menjalankan ESLint |
| `npm run build` | Membuat production build |

## Deployment ke Vercel

1. Import repositori di Vercel; framework terdeteksi otomatis sebagai Next.js (`vercel.json` sudah disertakan).
2. Region function diatur ke `hnd1` (Tokyo) agar dekat dengan Supabase `ap-northeast-1`.
3. Set environment variable berikut di Project Settings → Environment Variables untuk **Production, Preview, dan Development** (jangan commit):
   - `DATABASE_URL` — **wajib**, gunakan connection pooler Supabase (`aws-0-<region>.pooler.supabase.com`), bukan host `db.<ref>.supabase.co`.
   - `DATABASE_POOL_MAX` — opsional, mis. `3` untuk membatasi koneksi di lingkungan serverless.
   - Root CA Supabase **sudah dibundel** di aplikasi (`src/lib/supabase-ca.ts`), jadi tidak perlu mengisi `DATABASE_SSL_ROOT_CERT` di Vercel. Variabel itu hanya untuk override bila diperlukan.
4. Jalankan `npm run migrate` (dari lokal, dengan `DATABASE_URL` yang sama) sebelum rilis karena migrasi tidak berjalan otomatis.
5. Setelah deploy, buka `https://<domain>/api/health`. Respons `{"ok":true,"database":"connected"}` berarti koneksi database sudah benar; bila `ok:false`, pesan `error` menunjukkan penyebabnya (mis. sertifikat, password, atau host salah).

## Keamanan dan deployment

- `.env.local` sudah dikecualikan oleh `.gitignore`; jangan pernah commit kredensial.
- `SUPABASE_SECRET_KEY` dan `DATABASE_URL` hanya untuk environment server.
- Row Level Security aktif tanpa policy publik; akses aplikasi dilakukan oleh server melalui koneksi PostgreSQL.
- Pada deployment, set semua environment variable di pengaturan provider hosting dan jalankan `npm run migrate` terhadap database yang dituju sebelum rilis.
- Jangan menaruh password PostgreSQL atau secret key Supabase dalam log, screenshot, atau variabel `NEXT_PUBLIC_*`.
