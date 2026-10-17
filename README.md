# KOIN KU - Financial Manager

Aplikasi manajemen keuangan pribadi dengan desain neobrutalisme, Next.js 15, dan Supabase PostgreSQL.

## Fitur

- Profil, kategori, dan transaksi disimpan di Supabase PostgreSQL.
- API server-side memakai koneksi `DATABASE_URL`; secret key Supabase tidak dikirim ke browser.
- Cache lokal dan sinkronisasi offline tetap tersedia.
- Migrasi database SQL berurutan, transactional, dan tercatat dengan checksum.
- Halaman Insight: skor kesehatan finansial, tren & proyeksi, analisis kategori, serta tips otomatis.

## Menyiapkan aplikasi

1. Salin `.env.example` menjadi `.env.local`.
2. Isi nilai Supabase project dan `DATABASE_URL` dari Supabase Dashboard → Project Settings → Database.
   Pastikan password pada URL di-percent-encode bila mengandung karakter khusus (contoh `&` menjadi `%26`).
   Jika sertifikat Supabase tidak dipercaya oleh Node.js pada mesin ini, unduh root CA dari Dashboard → Database → SSL Certificate,
   simpan di path lokal yang tidak di-commit, lalu isi `DATABASE_SSL_ROOT_CERT_PATH`. Koneksi selalu memverifikasi sertifikat dan hostname;
   aplikasi tetap mewajibkan TLS meskipun URL memiliki parameter `sslmode` yang bertentangan. Jangan menonaktifkan verifikasi TLS
    untuk mengatasi error sertifikat. Secret key dan kredensial database harus tetap server-side;
   jangan beri awalan `NEXT_PUBLIC_`.
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
| `public.profiles` | Saldo awal dan target dana darurat |
| `public.categories` | Kategori pemasukan/pengeluaran dan anggaran |
| `public.transactions` | Transaksi dan referensi kategori |
| `public.schema_migrations` | Riwayat migrasi yang dikelola runner |

Jangan mengedit file migrasi yang sudah berhasil diterapkan; tambahkan file baru untuk perubahan schema. Migrasi awal hanya membuat tabel/index dan seed profil/kategori awal.

## Skrip

| Perintah | Fungsi |
|---|---|
| `npm run dev` | Menjalankan Next.js pada port 9002 |
| `npm run migrate` | Menerapkan migrasi SQL ke `DATABASE_URL` |
| `npm run typecheck` | Memeriksa TypeScript |
| `npm run lint` | Menjalankan ESLint |
| `npm run build` | Membuat production build |

## Keamanan dan deployment

- `.env.local` sudah dikecualikan oleh `.gitignore`; jangan pernah commit kredensial.
- `SUPABASE_SECRET_KEY` dan `DATABASE_URL` hanya untuk environment server.
- Row Level Security aktif tanpa policy publik; akses aplikasi dilakukan oleh server melalui koneksi PostgreSQL.
- Pada deployment, set semua environment variable di pengaturan provider hosting dan jalankan `npm run migrate` terhadap database yang dituju sebelum rilis.
- Jangan menaruh password PostgreSQL atau secret key Supabase dalam log, screenshot, atau variabel `NEXT_PUBLIC_*`.
