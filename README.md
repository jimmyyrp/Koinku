# KOIN KU - Financial Manager 🪙

Aplikasi manajemen keuangan pribadi dengan desain **Neobrutalisme** yang berani dan fungsional. Dibangun dengan Next.js 15, Tailwind CSS, dan **MongoDB Atlas** sebagai penyimpanan data.

## ✨ Fitur Utama

- **Login Aman**: Akses aplikasi menggunakan kredensial database MongoDB (`koinku_db_user`), diverifikasi server-side.
- **Database MongoDB**: Semua data tersimpan di MongoDB Atlas (profil, kategori, transaksi) melalui API route server-side.
- **Migrasi Otomatis**: Struktur database, index unik, dan kategori default otomatis dibuat saat server pertama kali berjalan — tidak perlu menyentuh database.
- **Offline-First & Auto-Sync**: Data tersimpan instan di perangkat (Cache Lokal) dan otomatis sinkron ke MongoDB saat internet tersedia, termasuk migrasi data lama dari cache lokal.
- **Dashboard Interaktif**: Saldo, tren arus kas 7 hari, kontrol anggaran bulanan, dan target dana darurat.
- **Input Cepat (Single-Page Form)**: Pencatatan transaksi efisien dengan pemisah ribuan otomatis.
- **Manajemen Kategori Mandiri**: Tambah, hapus, dan atur anggaran kategori (pemasukan/pengeluaran).
- **Sistem CRUD Lengkap**: Tambah, baca, edit, dan hapus transaksi dengan konfirmasi keamanan.
- **Kontrol Data Pribadi**: Ekspor data ke JSON (Backup) atau CSV (Excel) dan reset total data.
- **Desain Neobrutalisme**: Responsif dengan Sidebar (Desktop) dan Fixed Floating Navigation (Mobile).

## 🚀 Menjalankan

1. Salin `.env.example` menjadi `.env.local` lalu isi `MONGODB_URI` (dan `MONGODB_DB`).
2. Install dependensi: `npm install`
3. Jalankan aplikasi: `npm run dev` (otomatis migrasi dijalankan saat server start)
4. (Opsional) Migrasi manual: `npm run migrate`

Login default menggunakan kredensial MongoDB Atlas kamu:
- **Username**: `koinku_db_user`
- **Password**: (password database Atlas yang kamu buat)

## 🗄️ Struktur Database

| Koleksi | Kegunaan |
|---|---|
| `profiles` | Saldo awal & target dana darurat (id: `global`) |
| `categories` | Klasifikasi transaksi + anggaran bulanan |
| `transactions` | Riwayat pemasukan / pengeluaran |

## ☁️ Push ke GitHub (Aman)

`.gitignore` sudah melindungi file sensitif (`node_modules`, `.env.local`, dll).

1. `git add .`
2. `git commit -m "Initial commit KOIN KU"`
3. `git push -u origin main`

*PENTING: Jangan pernah menghapus file `.gitignore` dan jangan pernah commit `.env.local` agar kredensial database tetap aman.*