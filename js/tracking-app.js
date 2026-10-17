(function () {
  'use strict';
  const STORAGE_KEY = 'sittaVueOrders_v2';
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function localDateInput() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  function initialOrders() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch (error) {}
    return Object.keys(window.SITTA_DATA.tracking).map(number => {
      const order = clone(window.SITTA_DATA.tracking[number]);
      order.nomorDO = number;
      order.layanan = order.layanan || 'REG';
      order.upbjj = order.upbjj || 'Jakarta';
      order.createdAt = `${order.tanggalKirim}T00:00:00`;
      return order;
    });
  }

  new Vue({
    el: '#trackingApp',
    data: {
      upbjjList: window.SITTA_DATA.upbjjList,
      pengirimanList: window.SITTA_DATA.pengirimanList,
      paket: window.SITTA_DATA.paket,
      stokAwal: window.SITTA_DATA.stok,
      orders: initialOrders(),
      searchDO: 'DO2025-0001',
      selectedOrder: null,
      searchMessage: '',
      formError: '',
      toastMessage: '',
      toastTimer: null,
      destinationTip: 'Pilih UT-Daerah tujuan agar tujuan distribusi tercatat pada DO.',
      form: { nim: '', nama: '', upbjj: '', layanan: 'REG', paketKode: '', tanggalKirim: localDateInput(), totalHarga: 0 }
    },
    computed: {
      nextDONumber: function () {
        const year = new Date().getFullYear();
        const prefix = `DO${year}-`;
        let maxSequence = 0;
        this.orders.forEach(order => {
          const number = String(order.nomorDO || '');
          if (number.startsWith(prefix)) {
            const sequence = Number(number.slice(prefix.length));
            if (Number.isFinite(sequence)) maxSequence = Math.max(maxSequence, sequence);
          }
        });
        return prefix + String(maxSequence + 1).padStart(3, '0');
      },
      selectedPackage: function () {
        return this.paket.find(item => item.kode === this.form.paketKode) || null;
      },
      packageDetails: function () {
        if (!this.selectedPackage) return [];
        return this.selectedPackage.isi.map(code => {
          const book = this.stokAwal.find(item => item.kode === code);
          return { kode: code, judul: book ? book.judul : 'Judul tidak tersedia pada data dummy' };
        });
      },
      sortedOrders: function () {
        return this.orders.slice().sort((a, b) => new Date(b.createdAt || b.tanggalKirim) - new Date(a.createdAt || a.tanggalKirim));
      }
    },
    watch: {
      searchDO: function (value) {
        this.lookupOrder(value, true);
      },
      'form.paketKode': function (code) {
        const selected = this.paket.find(item => item.kode === code);
        this.form.totalHarga = selected ? selected.harga : 0;
      },
      'form.upbjj': function (location) {
        this.destinationTip = location ? `Delivery Order ini akan dicatat untuk tujuan UT-Daerah ${location}.` : 'Pilih UT-Daerah tujuan agar tujuan distribusi tercatat pada DO.';
      }
    },
    created: function () { this.lookupOrder(this.searchDO, true); },
    methods: {
      formatCurrency: function (value) { return new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', maximumFractionDigits: 0 }).format(Number(value || 0)); },
      formatDate: function (value) {
        if (!value) return '—';
        const parts = String(value).split('-');
        return parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : value;
      },
      persistOrders: function () {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(this.orders)); }
        catch (error) { this.showToast('Penyimpanan lokal tidak tersedia; data sementara ada di halaman ini.'); }
      },
      showToast: function (message) {
        this.toastMessage = message;
        window.clearTimeout(this.toastTimer);
        this.toastTimer = window.setTimeout(() => { this.toastMessage = ''; }, 2800);
      },
      createOrder: function () {
        this.formError = '';
        if (!/^\d{8,12}$/.test(String(this.form.nim).trim())) { this.formError = 'NIM harus terdiri dari 8 sampai 12 angka.'; return; }
        if (String(this.form.nama).trim().length < 3) { this.formError = 'Nama mahasiswa wajib diisi minimal 3 karakter.'; return; }
        if (!this.form.upbjj || !this.upbjjList.includes(this.form.upbjj)) { this.formError = 'Pilih UT-Daerah tujuan yang tersedia.'; return; }
        if (!this.pengirimanList.some(item => item.kode === this.form.layanan)) { this.formError = 'Pilih layanan ekspedisi.'; return; }
        if (!this.selectedPackage) { this.formError = 'Pilih paket bahan ajar yang tersedia.'; return; }
        if (!this.form.tanggalKirim) { this.formError = 'Tanggal kirim wajib diisi.'; return; }
        const number = this.nextDONumber;
        const service = this.pengirimanList.find(item => item.kode === this.form.layanan);
        const order = {
          nomorDO: number,
          nim: String(this.form.nim).trim(),
          nama: String(this.form.nama).trim(),
          upbjj: this.form.upbjj,
          layanan: this.form.layanan,
          ekspedisi: service ? service.ekspedisi : 'JNE Regular',
          estimasi: service ? service.estimasi : '',
          status: 'Diproses',
          tanggalKirim: this.form.tanggalKirim,
          paket: this.selectedPackage.kode,
          namaPaket: this.selectedPackage.nama,
          total: this.selectedPackage.harga,
          perjalanan: [{ waktu: `${this.form.tanggalKirim} 09:00:00`, keterangan: 'Delivery Order dibuat dan menunggu proses pengiriman.' }],
          createdAt: new Date().toISOString()
        };
        this.orders.push(order);
        this.persistOrders();
        this.searchDO = number;
        this.selectedOrder = order;
        this.searchMessage = `Data ditemukan untuk ${number}.`;
        this.resetForm(false);
        this.showToast(`DO ${number} berhasil dibuat.`);
      },
      lookupOrder: function (value, fromWatcher) {
        const key = String(value || '').trim().toUpperCase();
        if (!key) { this.selectedOrder = null; this.searchMessage = ''; return; }
        const match = this.orders.find(order => String(order.nomorDO).toUpperCase() === key);
        this.selectedOrder = match || null;
        this.searchMessage = match ? `Data ditemukan untuk ${match.nomorDO}.` : (fromWatcher && key.length < 5 ? '' : 'Nomor DO tidak ditemukan pada data simulasi.');
      },
      showOrder: function (order) {
        this.searchDO = order.nomorDO;
        this.selectedOrder = order;
        this.searchMessage = `Data ditemukan untuk ${order.nomorDO}.`;
        window.scrollTo({ top: 0, behavior: 'smooth' });
      },
      resetForm: function (clearMessage) {
        this.form = { nim: '', nama: '', upbjj: '', layanan: 'REG', paketKode: '', tanggalKirim: localDateInput(), totalHarga: 0 };
        this.formError = '';
        if (clearMessage !== false) this.destinationTip = 'Pilih UT-Daerah tujuan agar tujuan distribusi tercatat pada DO.';
      },
      statusClass: function (status) {
        if (status === 'Selesai') return 'status-safe';
        if (status === 'Dalam Perjalanan' || status === 'Dikirim') return 'status-info';
        return 'status-low';
      },
      progressPercent: function (status) {
        if (status === 'Selesai') return 100;
        if (status === 'Dalam Perjalanan' || status === 'Dikirim') return 65;
        return 25;
      }
    }
  });
}());
