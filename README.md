# Atur Produksi

Aplikasi web untuk mencatat persediaan, transaksi kas, karyawan, penggajian, dan laporan bulanan. Data disimpan bersama di Supabase sehingga dapat dibuka dari beberapa perangkat.

## Menjalankan aplikasi

1. Pasang Node.js versi 20.19+ atau 22.12+.
2. Buat proyek di [Supabase](https://supabase.com/) dan salin Project URL serta anon/publishable key.
3. Salin `.env.example` menjadi `.env`, lalu isi:

   ```env
   VITE_SUPABASE_URL=https://<project-ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-atau-publishable-key>
   ```

4. Di Supabase **SQL Editor**, jalankan seluruh isi `supabase/schema.sql`.
5. Buat akun pengguna melalui Supabase **Authentication > Users**. Untuk penggunaan privat, nonaktifkan pendaftaran publik dan undang/buat akun dari dashboard Supabase. Gunakan format `<id>@perusahaan.id` (misalnya: `admin@perusahaan.id`, `operator1@perusahaan.id`). Pengguna cukup masuk menggunakan **ID** saja (misalnya `admin` atau `operator1`) beserta kata sandinya.
6. Berikan akses admin hanya kepada pemilik/pengelola tepercaya. Di SQL Editor, ganti alamat email pada perintah berikut:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"role":"admin"}'::jsonb
   where email = 'admin@perusahaan.id';
   ```

   Keluar lalu masuk kembali setelah perubahan peran agar token akses diperbarui. Hanya admin dapat melihat data karyawan dan gaji.
7. Jalankan perintah:

   ```sh
   npm install
   npm run dev
   ```

   Buka URL lokal yang ditampilkan Vite.

Untuk menghasilkan versi siap hosting, jalankan `npm run build`; unggah isi folder `dist` ke layanan hosting web. Atur kedua variabel `VITE_SUPABASE_URL` dan `VITE_SUPABASE_ANON_KEY` di konfigurasi build hosting tersebut.

## Fitur

- Ringkasan stok dan arus kas.
- Pengelolaan produk dan pencatatan barang masuk/keluar. Pengeluaran barang ditolak apabila stok tidak mencukupi; produk yang sudah memiliki riwayat pergerakan tidak dapat dihapus.
- Pencatatan kas masuk/keluar beserta kategori dan tanggal.
- Pengelolaan karyawan dengan gaji bulanan dan tarif insentif per unit produksi.
- Pencatatan kuantitas produksi bulanan, perhitungan gaji (gaji pokok + insentif), dan penandaan pembayaran.
- Unduhan CSV laporan bulanan untuk data persediaan dan kas; laporan penggajian disertakan untuk admin.
- Pembaruan langsung lintas perangkat melalui Supabase Realtime. Skrip skema menambahkan tabel aplikasi ke publikasi `supabase_realtime` bila publikasi tersebut tersedia.
- Row Level Security Supabase: akun terautentikasi dapat mengelola data operasional; data karyawan dan penggajian dibatasi ke admin.

## Catatan operasional

- Skrip skema dapat dijalankan ulang untuk memperbarui kebijakan akses dan pemicu stok.
- Nilai gaji pokok dan tarif insentif disalin ke catatan saat penggajian dibuat, sehingga perubahan tarif karyawan tidak mengubah catatan bulan sebelumnya.
- Laporan CSV berisi catatan untuk bulan yang dipilih berdasarkan tanggal transaksi/periode payroll.
