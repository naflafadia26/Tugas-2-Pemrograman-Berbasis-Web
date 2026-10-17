# SITTA Vue — Tugas Praktik 2

Aplikasi front-end simulasi pengelolaan stok bahan ajar dan tracking Delivery Order (DO) untuk tugas Pemrograman Berbasis Web Universitas Terbuka.

## Teknologi
- HTML5 semantik
- CSS3 responsif
- Vue.js 2.7.16 (Options API melalui CDN)
- JavaScript dan `localStorage` untuk simulasi penyimpanan lokal

Vue 2 dipilih karena berkas dummy dari soal memakai pola `new Vue({ el, data })`. Tugas ini tidak memakai template component, sesuai petunjuk soal.

## Struktur folder

```text
tugas2-vue-ut/
├── index.html
├── stok.html
├── tracking.html
├── css/
│   └── style.css
├── js/
│   ├── dataBahanAjar.js
│   ├── stok-app.js
│   └── tracking-app.js
└── assets/
    └── logo-ut.png
```

## Cara menjalankan
1. Ekstrak ZIP ke folder lokal.
2. Buka folder proyek di Visual Studio Code.
3. Jalankan `index.html` melalui ekstensi Live Server. Jangan membuka berkas dari mode preview teks.
4. Pastikan koneksi internet tersedia agar Vue.js 2.7.16 dapat dimuat dari CDN jsDelivr.
5. Buka menu Stok Bahan Ajar atau Tracking DO dari halaman beranda.

## Fitur halaman stok
- Menampilkan daftar dari `SITTA_DATA.stok`.
- Pencarian kode/judul, filter UT-Daerah, kategori yang bergantung pada pilihan UT-Daerah, filter stok menipis/kosong, pengurutan judul/stok/harga, dan reset filter.
- Status stok: Aman jika `qty >= safety`, Menipis jika `0 < qty < safety`, dan Kosong jika `qty === 0`.
- Tambah dan edit bahan ajar dengan validasi dan pemeriksaan kode duplikat.
- Ringkasan jumlah judul, total unit, stok menipis, dan stok kosong.
- Filter/pengurutan menggunakan computed property Vue agar hasil dihitung ulang berdasarkan dependensi reaktifnya.
- Data perubahan disimpan di `localStorage` browser.

## Fitur halaman tracking
- Menghasilkan nomor DO berikutnya berdasarkan tahun berjalan, misalnya `DO2026-001`.
- Form NIM, nama, UT-Daerah tujuan, layanan JNE Regular/Express, paket, dan tanggal kirim.
- Rincian paket ditampilkan setelah paket dipilih; harga otomatis diambil dari data paket.
- Pencarian DO reaktif, detail pengiriman, visualisasi progress, riwayat perjalanan, dan daftar transaksi.
- Minimal dua watcher: pemantauan perubahan `searchDO` dan `form.paketKode`, ditambah watcher untuk tujuan UT-Daerah.
- Data DO baru disimpan di `localStorage` browser.

## Akun dan data contoh
Tidak diperlukan akun. Data awal menggunakan objek dummy dari lampiran soal, termasuk DO contoh `DO2025-0001`. Data di browser dapat berubah karena fitur edit/tambah; hapus data situs/localStorage untuk kembali ke data awal.

## Batasan
Aplikasi ini hanya simulasi front-end. `localStorage` berada di browser yang sama, bukan database server. Data dummy dan kode JavaScript dapat dibaca pengguna, sehingga mekanisme ini bukan autentikasi atau penyimpanan produksi.
