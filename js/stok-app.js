(function () {
  'use strict';
  const STORAGE_KEY = 'sittaVueStocks_v2';

  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function loadStocks() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : clone(window.SITTA_DATA.stok);
    } catch (error) {
      return clone(window.SITTA_DATA.stok);
    }
  }
  function escapeHtml(value) {
    return String(value == null ? '' : value).replace(/[&<>"']/g, function (char) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char];
    });
  }

  new Vue({
    el: '#stokApp',
    data: {
      upbjjList: window.SITTA_DATA.upbjjList,
      kategoriList: window.SITTA_DATA.kategoriList,
      books: loadStocks(),
      selectedUpbjj: '',
      selectedKategori: '',
      searchKeyword: '',
      sortBy: 'judul-asc',
      onlyLowStock: false,
      onlyEmpty: false,
      lastFilterChange: '',
      showAddModal: false,
      showEditModal: false,
      formError: '',
      editError: '',
      toastMessage: '',
      toastTimer: null,
      form: { kode: '', judul: '', kategori: '', upbjj: '', lokasiRak: '', harga: 0, qty: 0, safety: 0, catatan: '' },
      editForm: { kode: '', judul: '', kategori: '', upbjj: '', lokasiRak: '', harga: 0, qty: 0, safety: 0, catatan: '' }
    },
    computed: {
      kategoriOptions: function () {
        if (!this.selectedUpbjj) return this.kategoriList;
        const present = this.books.filter(book => book.upbjj === this.selectedUpbjj).map(book => book.kategori);
        return present.length ? this.kategoriList.filter(category => present.indexOf(category) !== -1) : this.kategoriList;
      },
      filteredStok: function () {
        let result = this.books.filter(book => {
          const term = this.searchKeyword.toLowerCase();
          const matchKeyword = !term || book.kode.toLowerCase().includes(term) || book.judul.toLowerCase().includes(term);
          const matchUpbjj = !this.selectedUpbjj || book.upbjj === this.selectedUpbjj;
          const matchCategory = !this.selectedKategori || book.kategori === this.selectedKategori;
          const matchLow = !this.onlyLowStock || Number(book.qty) < Number(book.safety);
          const matchEmpty = !this.onlyEmpty || Number(book.qty) === 0;
          return matchKeyword && matchUpbjj && matchCategory && matchLow && matchEmpty;
        });
        const sorters = {
          'judul-asc': (a, b) => a.judul.localeCompare(b.judul, 'id'),
          'judul-desc': (a, b) => b.judul.localeCompare(a.judul, 'id'),
          'qty-asc': (a, b) => Number(a.qty) - Number(b.qty),
          'qty-desc': (a, b) => Number(b.qty) - Number(a.qty),
          'harga-asc': (a, b) => Number(a.harga) - Number(b.harga),
          'harga-desc': (a, b) => Number(b.harga) - Number(a.harga)
        };
        return result.slice().sort(sorters[this.sortBy] || sorters['judul-asc']);
      },
      ringkasan: function () {
        return {
          judul: this.books.length,
          qty: this.books.reduce((sum, book) => sum + Number(book.qty || 0), 0),
          menipis: this.books.filter(book => Number(book.qty) > 0 && Number(book.qty) < Number(book.safety)).length,
          kosong: this.books.filter(book => Number(book.qty) === 0).length
        };
      },
      hasActiveFilter: function () {
        return Boolean(this.searchKeyword || this.selectedUpbjj || this.selectedKategori || this.onlyLowStock || this.onlyEmpty || this.sortBy !== 'judul-asc');
      }
    },
    watch: {
      selectedUpbjj: function () {
        // Watcher 1: saat UT-Daerah berubah, pilihan kategori disetel ulang agar tidak bertentangan.
        this.selectedKategori = '';
        this.markFilterUpdated();
      },
      searchKeyword: function () {
        // Watcher 2: mencatat bahwa pencarian diperbarui; hasil tabel dihitung ulang oleh computed.
        this.markFilterUpdated();
      },
      onlyLowStock: function () { this.markFilterUpdated(); },
      onlyEmpty: function () { this.markFilterUpdated(); },
      selectedKategori: function () { this.markFilterUpdated(); },
      sortBy: function () { this.markFilterUpdated(); }
    },
    methods: {
      markFilterUpdated: function () { this.lastFilterChange = new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }); },
      formatCurrency: function (value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0)); },
      statusName: function (book) { if (Number(book.qty) === 0) return 'Kosong'; if (Number(book.qty) < Number(book.safety)) return 'Menipis'; return 'Aman'; },
      persistBooks: function () {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.books)); }
        catch (error) { this.showToast('Perubahan hanya tersedia selama halaman dibuka.'); }
      },
      showToast: function (message) {
        this.toastMessage = message;
        window.clearTimeout(this.toastTimer);
        this.toastTimer = window.setTimeout(() => { this.toastMessage = ''; }, 2800);
      },
      blankForm: function () { return { kode: '', judul: '', kategori: '', upbjj: '', lokasiRak: '', harga: 0, qty: 0, safety: 0, catatan: '' }; },
      openAddModal: function () { this.form = this.blankForm(); this.formError = ''; this.showAddModal = true; },
      closeAddModal: function () { this.showAddModal = false; this.formError = ''; },
      openEditModal: function (book) {
        this.editForm = Object.assign({}, book, { catatan: String(book.catatanHTML || '').replace(/<[^>]*>/g, '') });
        this.editError = '';
        this.showEditModal = true;
      },
      closeEditModal: function () { this.showEditModal = false; this.editError = ''; },
      validateBook: function (book, isEdit) {
        if (!String(book.kode || '').trim() || !String(book.judul || '').trim() || !book.kategori || !book.upbjj || !String(book.lokasiRak || '').trim()) return 'Lengkapi kode, judul, kategori, UT-Daerah, dan lokasi rak.';
        if (book.harga === '' || book.qty === '' || book.safety === '' || !Number.isFinite(Number(book.harga)) || Number(book.harga) < 0 || !Number.isFinite(Number(book.qty)) || Number(book.qty) < 0 || !Number.isInteger(Number(book.qty)) || !Number.isFinite(Number(book.safety)) || Number(book.safety) < 0 || !Number.isInteger(Number(book.safety))) return 'Harga wajib diisi dan tidak negatif; stok serta safety harus bilangan bulat nol atau lebih.';
        const duplicate = this.books.some(item => item.kode.toLowerCase() === String(book.kode).trim().toLowerCase() && (!isEdit || item.kode !== this.editForm.kode));
        if (duplicate) return 'Kode mata kuliah sudah digunakan. Gunakan kode yang berbeda.';
        return '';
      },
      addBook: function () {
        const error = this.validateBook(this.form, false);
        if (error) { this.formError = error; return; }
        const entry = {
          kode: String(this.form.kode).trim().toUpperCase(), judul: String(this.form.judul).trim(),
          kategori: this.form.kategori, upbjj: this.form.upbjj, lokasiRak: String(this.form.lokasiRak).trim().toUpperCase(),
          harga: Number(this.form.harga), qty: Number(this.form.qty), safety: Number(this.form.safety),
          // Input catatan pengguna di-escape sebelum ditampilkan menggunakan v-html.
          catatanHTML: escapeHtml(String(this.form.catatan || '').trim()) || '—'
        };
        this.books.push(entry);
        this.persistBooks();
        this.closeAddModal();
        this.showToast('Bahan ajar berhasil ditambahkan.');
      },
      saveEdit: function () {
        const error = this.validateBook(this.editForm, true);
        if (error) { this.editError = error; return; }
        const index = this.books.findIndex(book => book.kode === this.editForm.kode);
        if (index < 0) { this.editError = 'Data tidak ditemukan. Tutup formulir dan coba lagi.'; return; }
        this.$set(this.books, index, {
          kode: this.editForm.kode,
          judul: String(this.editForm.judul).trim(), kategori: this.editForm.kategori, upbjj: this.editForm.upbjj,
          lokasiRak: String(this.editForm.lokasiRak).trim().toUpperCase(), harga: Number(this.editForm.harga),
          qty: Number(this.editForm.qty), safety: Number(this.editForm.safety),
          catatanHTML: escapeHtml(String(this.editForm.catatan || '').trim()) || '—'
        });
        this.persistBooks();
        this.closeEditModal();
        this.showToast('Perubahan bahan ajar berhasil disimpan.');
      },
      resetFilters: function () {
        this.selectedUpbjj = ''; this.selectedKategori = ''; this.searchKeyword = '';
        this.onlyLowStock = false; this.onlyEmpty = false; this.sortBy = 'judul-asc';
        this.markFilterUpdated();
      }
    }
  });
}());
