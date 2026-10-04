  // ==========================================
  // 1. STATE & KONFIGURASI
  // ==========================================
  const APP_STATE = { 
    user: null, isLoggedIn: false, gurus: [], jadwals: [], instrumens: [], allInstrumens: [], activeJadwal: null, tindakLanjut: [], laporanDetail: [], laporanView: []
  };

  const MENU_CONFIG = [
    { id: 'dashboard',     icon: 'fas fa-home',              title: 'Dashboard',              roles: ['ADMIN', 'KEPALA_SEKOLAH', 'WKS_KURIKULUM', 'SUPERVISOR', 'GURU'] },
    { id: 'guru',          icon: 'fas fa-chalkboard-teacher', title: 'Data Guru',              roles: ['ADMIN', 'KEPALA_SEKOLAH', 'WKS_KURIKULUM'] },
    { id: 'jadwal',        icon: 'fas fa-calendar-alt',      title: 'Jadwal Supervisi',       roles: ['ADMIN', 'KEPALA_SEKOLAH', 'WKS_KURIKULUM', 'SUPERVISOR', 'GURU'] },
    { id: 'observasi',     icon: 'fas fa-eye',               title: 'Observasi & Instrumen',  roles: ['ADMIN', 'KEPALA_SEKOLAH', 'WKS_KURIKULUM', 'SUPERVISOR'] },
    { id: 'tindak-lanjut', icon: 'fas fa-sync-alt',          title: 'Tindak Lanjut',          roles: ['ADMIN', 'KEPALA_SEKOLAH', 'WKS_KURIKULUM', 'SUPERVISOR', 'GURU'] },
    { id: 'laporan',       icon: 'fas fa-chart-pie',         title: 'Laporan',                roles: ['ADMIN', 'KEPALA_SEKOLAH', 'WKS_KURIKULUM'] },
    { id: 'instrumen',     icon: 'fas fa-list-ul',           title: 'Manajemen Instrumen',    roles: ['ADMIN', 'KEPALA_SEKOLAH', 'WKS_KURIKULUM'] }
  ];

  // Helper: role yang punya hak manajemen (admin-level)
  function isManajemen() {
    return APP_STATE.user && ['ADMIN', 'KEPALA_SEKOLAH', 'WKS_KURIKULUM'].indexOf(APP_STATE.user.Role) !== -1;
  }

  // Variabel Global untuk Chart
  let chartPieInstance = null;
  let chartBarInstance = null;

  // ==========================================
  // 2. FORMATTER & UTILITIES
  // ==========================================
  function formatTanggalIndo(isoStr) {
    if(!isoStr) return '-';
    try { const d = new Date(isoStr); if(isNaN(d.getTime())) return isoStr; const b = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; return `${d.getDate()} ${b[d.getMonth()]} ${d.getFullYear()}`; } catch(e) { return isoStr; }
  }
  function formatWaktuIndo(isoStr) {
    if(!isoStr) return '-';
    try { if (!isoStr.includes('T') && isoStr.includes(':')) { return isoStr.substring(0,5); } const d = new Date(isoStr); if(isNaN(d.getTime())) return isoStr; return `${d.getHours().toString().padStart(2,'0')}:${d.getMinutes().toString().padStart(2,'0')}`; } catch(e) { return isoStr; }
  }
  function showToast(message, type = 'success') {
    const container = document.getElementById('toast-container'); const toast = document.createElement('div'); toast.className = `toast ${type}`; toast.innerText = message; container.appendChild(toast); setTimeout(() => toast.classList.add('show'), 10); setTimeout(() => { toast.classList.remove('show'); setTimeout(() => toast.remove(), 300); }, 3000);
  }
  function safeSetValue(id, val) { const el = document.getElementById(id); if (el) el.value = val; }
  function safeSetDisplay(id, display) { const el = document.getElementById(id); if (el) el.style.display = display; }

  // ==========================================
  // 3. FUNGSI NAVIGASI
  // ==========================================
  function navigateTo(pageId, title) {
    document.querySelectorAll('.page-section').forEach(el => { el.style.display = 'none'; });
    const targetPage = document.getElementById('page-' + pageId);
    if(targetPage) { targetPage.style.display = 'block'; } else { showToast('Halaman belum tersedia.', 'error'); }
    document.getElementById('page-title').innerText = title;
    document.querySelectorAll('.sidebar-menu a').forEach(el => { el.classList.remove('active'); });
    const activeLink = document.getElementById('menu-' + pageId); if(activeLink) activeLink.classList.add('active');
    if(window.innerWidth <= 768) { document.getElementById('sidebar').classList.remove('open'); }
    
    if(pageId === 'guru') loadGuruData(); 
    if(pageId === 'jadwal') { updateTombolJadwal(); loadJadwalData(); }
    if(pageId === 'observasi') loadSiapObservasi(); 
    if(pageId === 'tindak-lanjut') loadTindakLanjutData(); 
    if(pageId === 'laporan' || pageId === 'dashboard') loadLaporanData();
    if(pageId === 'instrumen') loadInstrumenAdmin();
  }

  function renderSidebar() {
    const menuContainer = document.getElementById('sidebar-menu'); menuContainer.innerHTML = '';
    MENU_CONFIG.forEach(menu => {
      if(menu.roles.includes(APP_STATE.user.Role)) {
        const li = document.createElement('li');
        li.innerHTML = `<a href="#" id="menu-${menu.id}" onclick="event.preventDefault(); navigateTo('${menu.id}', '${menu.title}')"><i class="${menu.icon}"></i> ${menu.title}</a>`;
        menuContainer.appendChild(li);
      }
    });
    // Sembunyikan tombol "Buat Jadwal" untuk GURU (nanti diganti tombol "Ajukan Jadwal" di TAHAP B)
    if(APP_STATE.user.Role === 'GURU' || APP_STATE.user.Role === 'SUPERVISOR') {
      const btnAdd = document.getElementById('btn-add-jadwal');
      if(btnAdd) btnAdd.style.display = 'none';
    }
  }
  function toggleSidebar() { document.getElementById('sidebar').classList.toggle('open'); }

  // ==========================================
  // 4. MODUL DATA GURU
  // ==========================================
  function loadGuruData() {
    const tbody = document.getElementById('tbody-guru'); if(!tbody) return; tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>';
    google.script.run.withSuccessHandler(resStr => { const res = JSON.parse(resStr); if(res.status === 'success') { APP_STATE.gurus = res.data; renderGuruTable(res.data); } }).getGuruList();
  }
  function renderGuruTable(data) {
    const tbody = document.getElementById('tbody-guru'); tbody.innerHTML = '';
    if(data.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Belum ada data guru.</td></tr>'; return; }
    data.forEach((guru, index) => {
      const bClass = guru.StatusAktif === 'Aktif' ? 'badge-aktif' : 'badge-nonaktif'; let actBtn = "-";
      if(isManajemen()) { actBtn = `<button class="btn-sm btn-info" onclick="editGuru('${guru.GuruID}')"><i class="fas fa-edit"></i> Edit</button>`; }
      const noWAHtml = guru.No_WA ? `<a href="https://wa.me/${guru.No_WA.toString().replace(/^0/,'62')}" target="_blank" style="text-decoration:none; color:#25D366;"><i class="fab fa-whatsapp"></i> ${guru.No_WA}</a>` : '-';
      tbody.innerHTML += `<tr><td>${index+1}</td><td>${guru.NIP_NBM || '-'}</td><td><strong>${guru.NamaGuru || '-'}</strong></td><td>${noWAHtml}</td><td>${guru.MataPelajaran || '-'}</td><td><span class="badge ${bClass}">${guru.StatusAktif || 'Aktif'}</span></td><td>${actBtn}</td></tr>`;
    });
  }
  function filterGuruTable() { const kw = document.getElementById('search-guru').value.toLowerCase(); renderGuruTable(APP_STATE.gurus.filter(g => (g.NamaGuru && g.NamaGuru.toLowerCase().includes(kw)) || (g.NIP_NBM && g.NIP_NBM.toString().toLowerCase().includes(kw)))); }
  function openModalGuru() {
    document.getElementById('formGuru').reset();
    safeSetValue('guru-id', '');
    safeSetValue('guru-nbm-lama', '');
    document.getElementById('modal-title-guru').innerText = 'Tambah Data Guru Baru';
    document.getElementById('modal-guru').style.display = 'flex';
  }
  function closeModalGuru() { document.getElementById('modal-guru').style.display = 'none'; }

  function editGuru(guruID) {
    const guru = APP_STATE.gurus.find(g => g.GuruID === guruID); if(!guru) return;
    safeSetValue('guru-id', guru.GuruID);
    safeSetValue('guru-nbm-lama', guru.NIP_NBM);
    safeSetValue('guru-nbm', guru.NIP_NBM);
    safeSetValue('guru-nama', guru.NamaGuru);
    safeSetValue('guru-wa', guru.No_WA || '');
    safeSetValue('guru-jk', guru.Jenis_Kelamin || 'Laki-laki');
    safeSetValue('guru-mapel', guru.MataPelajaran);
    safeSetValue('guru-status', guru.StatusAktif);

    const jurusan = guru.ProgramKeahlian || '';
    const selectEl = document.getElementById('guru-jurusan');
    if (selectEl) {
      const daftarOpsi = ['Teknik Pemesinan', 'Teknik Pengelasan', 'Teknik Kendaraan Ringan', 'Teknik Sepeda Motor', 'Semua KK'];
      selectEl.value = (daftarOpsi.indexOf(jurusan) !== -1) ? jurusan : '';
    }

    document.getElementById('modal-title-guru').innerText = 'Edit Data Guru';
    document.getElementById('modal-guru').style.display = 'flex';
  }

  function submitGuru(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-save-guru');
    btn.disabled = true;
    btn.innerText = 'Menyimpan...';
    const formData = {
      GuruID: document.getElementById('guru-id').value,
      NBM_Lama: document.getElementById('guru-nbm-lama').value,
      NBM: document.getElementById('guru-nbm').value,
      NoWA: document.getElementById('guru-wa').value,
      Nama: document.getElementById('guru-nama').value,
      JK: document.getElementById('guru-jk').value,
      Mapel: document.getElementById('guru-mapel').value,
      Jurusan: document.getElementById('guru-jurusan').value,
      Status: document.getElementById('guru-status').value
    };
    google.script.run.withSuccessHandler(resStr => {
      const res = JSON.parse(resStr);
      btn.disabled = false;
      btn.innerText = 'Simpan Data Guru';
      if (res.status === 'success') {
        showToast(res.message, 'success');
        closeModalGuru();
        loadGuruData();
      } else {
        showToast(res.message, 'error');
      }
    }).saveGuruData(formData);
  }

  // ==========================================
  // 5. MODUL JADWAL SUPERVISI & WA
  // ==========================================
  function loadJadwalData() {
    const tbody = document.getElementById('tbody-jadwal'); if(!tbody) return; tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Memuat jadwal...</td></tr>';
    google.script.run.withSuccessHandler(resStr => { const res = JSON.parse(resStr); if(res.status === 'success') { APP_STATE.jadwals = res.data; renderJadwalTable(); } }).getJadwalList();
  }
    function renderJadwalTable() {
    const tbody = document.getElementById('tbody-jadwal'); tbody.innerHTML = '';
    let vw = APP_STATE.jadwals;
    if(APP_STATE.user.Role === 'GURU') { vw = vw.filter(j => j.NamaGuru === APP_STATE.user.Nama); }
    if(APP_STATE.user.Role === 'SUPERVISOR') { vw = vw.filter(j => j.Supervisor === APP_STATE.user.Nama); }
    if(vw.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Belum ada jadwal untuk Anda.</td></tr>'; return; }
    
    vw.forEach(jdw => {
      const statusLower = (jdw.Status || 'terjadwal').toLowerCase();
      let aBtn = "";

      // Admin/KEPSEK/WAKAKUR
      if(isManajemen()) {
        if (jdw.Status === 'Menunggu') {
          aBtn += `<button class="btn-sm" style="background:#28a745; color:white; border:none; margin-bottom:4px; width:100%;" onclick="openApproveModal('${jdw.JadwalID}')"><i class="fas fa-check"></i> Setujui</button><br>`;
          aBtn += `<button class="btn-sm" style="background:#dc3545; color:white; border:none; margin-bottom:4px; width:100%;" onclick="openTolakModal('${jdw.JadwalID}')"><i class="fas fa-times"></i> Tolak</button><br>`;
        } else if (jdw.Status === 'Terjadwal') {
          aBtn += `<button class="btn-sm" style="background:#25D366; color:white; border:none; margin-bottom:4px; width:100%;" onclick="kirimWAJadwal('${jdw.JadwalID}')"><i class="fab fa-whatsapp"></i> Kirim WA</button><br>`;
        }
        aBtn += `<button class="btn-sm" style="background:#dc3545; color:white; border:none; width:100%;" onclick="konfirmasiHapusJadwal('${jdw.JadwalID}')"><i class="fas fa-trash"></i> Hapus</button>`;
      }
      
      // Guru: bisa batalkan pengajuan sendiri jika status Menunggu/Ditolak
      if(APP_STATE.user.Role === 'GURU' && (jdw.Status === 'Menunggu' || jdw.Status === 'Ditolak')) {
        aBtn += `<button class="btn-sm" style="background:#dc3545; color:white; border:none; width:100%;" onclick="batalkanPengajuanSaya('${jdw.JadwalID}')"><i class="fas fa-times"></i> Batalkan</button>`;
      }
      
      if(aBtn === "") aBtn = "-";
      
      // Status tambahan di kolom: tampilkan catatan approval kalau ada
      let statusBadge = `<span class="badge badge-${statusLower}">${jdw.Status}</span>`;
      if (jdw.Status === 'Ditolak' && jdw.CatatanApproval) {
        statusBadge += `<br><small style="color:#dc3545; font-size: 11px;">${jdw.CatatanApproval}</small>`;
      }
      if (jdw.Status === 'Menunggu' && jdw.CatatanPengajuan) {
        statusBadge += `<br><small style="color:#f57c00; font-size: 11px;"><i class="fas fa-comment"></i> ${jdw.CatatanPengajuan}</small>`;
      }
      
      const supervisorText = jdw.Supervisor && jdw.Supervisor !== "" ? jdw.Supervisor : '<em style="color:#999;">Belum ditunjuk</em>';
      
      tbody.innerHTML += `<tr><td><strong>${formatTanggalIndo(jdw.Tanggal)}</strong><br><small><i class="far fa-clock"></i> ${formatWaktuIndo(jdw.Jam)}</small></td><td><strong>${jdw.NamaGuru}</strong><br><small>${jdw.JenisSupervisi}</small></td><td>${jdw.MataPelajaran}</td><td>${jdw.Kelas} <br><small>(${jdw.Ruang})</small></td><td>${supervisorText}</td><td>${statusBadge}</td><td>${aBtn}</td></tr>`;
    });
  }

    function filterJadwalTable() {
    const kw = document.getElementById('search-jadwal').value.toLowerCase();
    let vw = APP_STATE.jadwals;
    if(APP_STATE.user.Role === 'GURU') { vw = vw.filter(j => j.NamaGuru === APP_STATE.user.Nama); }
    if(APP_STATE.user.Role === 'SUPERVISOR') { vw = vw.filter(j => j.Supervisor === APP_STATE.user.Nama); }
    const flt = vw.filter(j => (j.NamaGuru && j.NamaGuru.toLowerCase().includes(kw)) || (j.Kelas && j.Kelas.toLowerCase().includes(kw)) || (j.Supervisor && j.Supervisor.toLowerCase().includes(kw)));
    
    const tbody = document.getElementById('tbody-jadwal'); tbody.innerHTML = '';
    if(flt.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;">Tidak ada data.</td></tr>'; return; }
    
    flt.forEach(jdw => {
      const statusLower = (jdw.Status || 'terjadwal').toLowerCase();
      let aBtn = "";

      if(isManajemen()) {
        if (jdw.Status === 'Menunggu') {
          aBtn += `<button class="btn-sm" style="background:#28a745; color:white; border:none; margin-bottom:4px; width:100%;" onclick="openApproveModal('${jdw.JadwalID}')"><i class="fas fa-check"></i> Setujui</button><br>`;
          aBtn += `<button class="btn-sm" style="background:#dc3545; color:white; border:none; margin-bottom:4px; width:100%;" onclick="openTolakModal('${jdw.JadwalID}')"><i class="fas fa-times"></i> Tolak</button><br>`;
        } else if (jdw.Status === 'Terjadwal') {
          aBtn += `<button class="btn-sm" style="background:#25D366; color:white; border:none; margin-bottom:4px; width:100%;" onclick="kirimWAJadwal('${jdw.JadwalID}')"><i class="fab fa-whatsapp"></i> Kirim WA</button><br>`;
        }
        aBtn += `<button class="btn-sm" style="background:#dc3545; color:white; border:none; width:100%;" onclick="konfirmasiHapusJadwal('${jdw.JadwalID}')"><i class="fas fa-trash"></i> Hapus</button>`;
      }
      
      if(APP_STATE.user.Role === 'GURU' && (jdw.Status === 'Menunggu' || jdw.Status === 'Ditolak')) {
        aBtn += `<button class="btn-sm" style="background:#dc3545; color:white; border:none; width:100%;" onclick="batalkanPengajuanSaya('${jdw.JadwalID}')"><i class="fas fa-times"></i> Batalkan</button>`;
      }
      
      if(aBtn === "") aBtn = "-";
      
      let statusBadge = `<span class="badge badge-${statusLower}">${jdw.Status}</span>`;
      if (jdw.Status === 'Ditolak' && jdw.CatatanApproval) {
        statusBadge += `<br><small style="color:#dc3545; font-size: 11px;">${jdw.CatatanApproval}</small>`;
      }
      if (jdw.Status === 'Menunggu' && jdw.CatatanPengajuan) {
        statusBadge += `<br><small style="color:#f57c00; font-size: 11px;"><i class="fas fa-comment"></i> ${jdw.CatatanPengajuan}</small>`;
      }
      
      const supervisorText = jdw.Supervisor && jdw.Supervisor !== "" ? jdw.Supervisor : '<em style="color:#999;">Belum ditunjuk</em>';
      
      tbody.innerHTML += `<tr><td><strong>${formatTanggalIndo(jdw.Tanggal)}</strong><br><small><i class="far fa-clock"></i> ${formatWaktuIndo(jdw.Jam)}</small></td><td><strong>${jdw.NamaGuru}</strong><br><small>${jdw.JenisSupervisi}</small></td><td>${jdw.MataPelajaran}</td><td>${jdw.Kelas} <br><small>(${jdw.Ruang})</small></td><td>${supervisorText}</td><td>${statusBadge}</td><td>${aBtn}</td></tr>`;
    });
  }

  function kirimWAJadwal(jadwalID) {
    const jdw = APP_STATE.jadwals.find(j => j.JadwalID === jadwalID); if(!jdw) return;
    if(APP_STATE.gurus.length === 0) { showToast("Menyiapkan kontak WA...", "info"); google.script.run.withSuccessHandler(r => { const res = JSON.parse(r); if(res.status === 'success') { APP_STATE.gurus = res.data; prosesKirimWA(jdw); } }).getGuruList(); } else { prosesKirimWA(jdw); }
  }
  function prosesKirimWA(jdw) {
    const guru = APP_STATE.gurus.find(g => g.GuruID === jdw.GuruID || g.NamaGuru === jdw.NamaGuru);
    if(!guru || !guru.No_WA || guru.No_WA.toString().trim() === "") return showToast(`Nomor WA Bapak/Ibu ${jdw.NamaGuru} belum disetting!`, "error");
    let phone = guru.No_WA.toString().replace(/[^0-9]/g, ''); if(phone.startsWith('0')) phone = '62' + phone.substring(1);
    let teksJenis = jdw.JenisSupervisi === "Administrasi" ? "Supervisi Administrasi" : "Observasi Pelaksanaan";
    let sapaan = "Bapak/Ibu"; if (guru.Jenis_Kelamin) { let jk = guru.Jenis_Kelamin.toString().toLowerCase().trim(); if (jk === "laki-laki" || jk === "laki" || jk === "l") sapaan = "Bapak"; else if (jk === "perempuan" || jk === "p") sapaan = "Ibu"; }
    const pesan = `*PEMBERITAHUAN JADWAL SUPERVISI/OBSERVASI*\n\nAssalaamu'alaikum ${sapaan} *${jdw.NamaGuru}*, berikut kami informasikan Jadwal Supervisi Anda yang telah ditetapkan di sistem SIMPRO:\n\n📅 *Tanggal:* ${formatTanggalIndo(jdw.Tanggal)}\n⏰ *Jam:* ${formatWaktuIndo(jdw.Jam)}\n📚 *Mata Pelajaran:* ${jdw.MataPelajaran}\n🏫 *Kelas/Ruang:* ${jdw.Kelas} / ${jdw.Ruang}\n👤 *Supervisor:* ${jdw.Supervisor}\n📝 *Jenis:* ${teksJenis}\n\nMohon dipersiapkan perangkat serta proses pembelajarannya dengan baik, terima kasih.\n\n*Tim Kurikulum*`;
    window.open(`whatsapp://send?phone=${phone}&text=${encodeURIComponent(pesan)}`, '_self');
  }

  function konfirmasiHapusJadwal(id) { if(confirm("Yakin ingin menghapus Jadwal ini secara permanen?")) { showToast("Menghapus...", "info"); google.script.run.withSuccessHandler(r => { const res = JSON.parse(r); if(res.status === 'success') { showToast(res.message, 'success'); loadJadwalData(); } else showToast(res.message, 'error'); }).hapusDataJadwal(id); } }
  function openJadwalModal() { document.getElementById('modal-jadwal').style.display = 'flex'; document.getElementById('jdw-supervisor').value = APP_STATE.user.Nama; if(APP_STATE.gurus.length === 0) { document.getElementById('jdw-guru').innerHTML = '<option>Memuat data guru...</option>'; google.script.run.withSuccessHandler(r => { const res = JSON.parse(r); if(res.status === 'success') { APP_STATE.gurus = res.data; populateGuruSelect(); } }).getGuruList(); } else { populateGuruSelect(); } }
  function closeJadwalModal() { document.getElementById('modal-jadwal').style.display = 'none'; document.getElementById('formJadwal').reset(); }
  function populateGuruSelect() { const s = document.getElementById('jdw-guru'); s.innerHTML = '<option value="">-- Pilih Guru --</option>'; if(APP_STATE.gurus.length === 0) { s.innerHTML = '<option value="">(Data kosong)</option>'; return; } APP_STATE.gurus.forEach(g => { if((g.StatusAktif||'aktif').toString().toLowerCase().trim() === 'aktif') { s.innerHTML += `<option value="${g.GuruID}" data-mapel="${g.MataPelajaran}">${g.NamaGuru}</option>`; } }); }
  function fillGuruDetails() { const s = document.getElementById('jdw-guru'); const opt = s.options[s.selectedIndex]; if(opt.value) { document.getElementById('jdw-nama-guru').value = opt.text; document.getElementById('jdw-mapel').value = opt.getAttribute('data-mapel') || ''; } }
  function submitJadwal(e) { e.preventDefault(); const btn = document.getElementById('btn-save-jadwal'); btn.disabled = true; btn.innerText = 'Menyimpan...'; const fd = { GuruID: document.getElementById('jdw-guru').value, NamaGuru: document.getElementById('jdw-nama-guru').value, MataPelajaran: document.getElementById('jdw-mapel').value, Kelas: document.getElementById('jdw-kelas').value, Ruang: document.getElementById('jdw-ruang').value, Tanggal: document.getElementById('jdw-tanggal').value, Jam: document.getElementById('jdw-jam').value, Supervisor: document.getElementById('jdw-supervisor').value, JenisSupervisi: document.getElementById('jdw-jenis').value }; google.script.run.withSuccessHandler(r => { const res = JSON.parse(r); btn.disabled = false; btn.innerText = 'Simpan Jadwal'; if(res.status === 'success') { showToast(res.message, 'success'); closeJadwalModal(); loadJadwalData(); } else { showToast(res.message, 'error'); } }).saveJadwal(fd); }

  // ==========================================
  // 6. MODUL OBSERVASI & INSTRUMEN
  // ==========================================
  function loadSiapObservasi() {
    document.getElementById('obs-list-view').style.display = 'block'; document.getElementById('obs-form-view').style.display = 'none'; const tbody = document.getElementById('tbody-siap-observasi'); if(!tbody) return; tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Mencari jadwal...</td></tr>';
    google.script.run.withSuccessHandler(resStr => {
      const res = JSON.parse(resStr); APP_STATE.jadwals = res.data || []; let siapObs = APP_STATE.jadwals.filter(j => j.Status === 'Terjadwal' || j.Status === 'Draft');
      if(APP_STATE.user.Role === 'SUPERVISOR') { siapObs = siapObs.filter(j => j.Supervisor === APP_STATE.user.Nama); }
      tbody.innerHTML = '';
      if(siapObs.length === 0) { tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;">Tidak ada jadwal siap.</td></tr>'; return; }
      siapObs.forEach(jdw => { tbody.innerHTML += `<tr><td><strong>${formatTanggalIndo(jdw.Tanggal)}</strong><br><small><i class="far fa-clock"></i> ${formatWaktuIndo(jdw.Jam)}</small></td><td><strong>${jdw.NamaGuru}</strong><br><small>${jdw.MataPelajaran}</small></td><td>${jdw.Kelas}</td><td>${jdw.Supervisor}</td><td><button class="btn-sm btn-primary" onclick="mulaiObservasi('${jdw.JadwalID}')"><i class="fas fa-edit"></i> Buka</button></td></tr>`; });
    }).getJadwalList();
  }
  function mulaiObservasi(jadwalID) {
    const jadwal = APP_STATE.jadwals.find(j => j.JadwalID === jadwalID); APP_STATE.activeJadwal = jadwal;
    document.getElementById('obs-list-view').style.display = 'none'; document.getElementById('obs-form-view').style.display = 'block'; document.getElementById('obs-header-guru').innerText = `${jadwal.NamaGuru} - ${jadwal.JenisSupervisi}`; document.getElementById('formObservasi').reset(); const linkDok = document.getElementById('obs-link-dok'); if(linkDok) linkDok.style.display = 'none'; const container = document.getElementById('instrumen-container'); container.innerHTML = '<div style="text-align:center; padding:30px;"><i class="fas fa-spinner fa-spin"></i> Memuat instrumen...</div>';
    google.script.run.withSuccessHandler(resStr => {
      const res = JSON.parse(resStr); APP_STATE.instrumens = (res.data || []).filter(ins => ins.JenisInstrumen === jadwal.JenisSupervisi); renderFormInstrumen();
      google.script.run.withSuccessHandler(draftStr => { const dRes = JSON.parse(draftStr); if(dRes.status === 'success' && dRes.data) { const draft = dRes.data; document.getElementById('obs-kekuatan').value = draft.KekuatanGuru || ""; document.getElementById('obs-pengembangan').value = draft.AreaPengembangan || ""; if(linkDok && draft.Dokumentasi && draft.Dokumentasi !== "") { linkDok.href = draft.Dokumentasi; linkDok.style.display = 'inline-block'; } if(draft.DetailNilai) { draft.DetailNilai.forEach(dn => { const radio = document.querySelector(`input[name="ins_${dn.InstrumenID}"][value="${dn.Skor}"]`); if(radio) radio.checked = true; const cat = document.getElementById(`catatan_${dn.InstrumenID}`); if(cat) cat.value = dn.Catatan || ""; }); } } }).getDraftObservasi(jadwalID);
    }).getInstrumenAktif();
  }
  function batalObservasi() { APP_STATE.activeJadwal = null; loadSiapObservasi(); }
  function renderFormInstrumen() {
    const container = document.getElementById('instrumen-container'); container.innerHTML = ''; if(APP_STATE.instrumens.length === 0) { container.innerHTML = '<div style="color:red; text-align:center; padding:20px;">Instrumen belum disetting.</div>'; return; }
    APP_STATE.instrumens.forEach((ins, idx) => { const field = `ins_${ins.InstrumenID}`; container.innerHTML += `<div class="instrumen-card"><div class="instrumen-aspek">${ins.Aspek}</div><div class="instrumen-indikator">${idx+1}. ${ins.Indikator}</div><div class="skala-container"><input type="radio" id="${field}_0" name="${field}" value="0" class="skala-radio"><label for="${field}_0" class="skala-label">0</label><input type="radio" id="${field}_1" name="${field}" value="1" class="skala-radio"><label for="${field}_1" class="skala-label">1</label><input type="radio" id="${field}_2" name="${field}" value="2" class="skala-radio"><label for="${field}_2" class="skala-label">2</label><input type="radio" id="${field}_3" name="${field}" value="3" class="skala-radio"><label for="${field}_3" class="skala-label">3</label><input type="radio" id="${field}_4" name="${field}" value="4" class="skala-radio"><label for="${field}_4" class="skala-label">4</label><span class="skala-desc">0: Tidak Ada | 1: Sangat Kurang | 2: Kurang | 3: Baik | 4: Sangat Baik</span></div><textarea id="catatan_${ins.InstrumenID}" class="form-control" rows="2" placeholder="Catatan/Bukti observasi..."></textarea></div>`; });
  }
  function submitObservasi(statusAction) {
    if(APP_STATE.instrumens.length === 0) return; let totalSkor = 0, detailNilai = [], isComplete = true;
    APP_STATE.instrumens.forEach(ins => { const radio = document.querySelector(`input[name="ins_${ins.InstrumenID}"]:checked`); const cat = document.getElementById(`catatan_${ins.InstrumenID}`).value; if(radio) { let skor = parseInt(radio.value); totalSkor += skor; detailNilai.push({ InstrumenID: ins.InstrumenID, Aspek: ins.Aspek, Indikator: ins.Indikator, Skor: skor, Catatan: cat }); } else { isComplete = false; } });
    if(statusAction === 'Selesai' && !isComplete) { return showToast("Mohon isi semua skala penilaian sebelum Selesai.", "error"); }
    const jdw = APP_STATE.activeJadwal; const maxSkor = APP_STATE.instrumens.length * 4; const nilaiAkhir = maxSkor > 0 ? Math.round((totalSkor / maxSkor) * 100) : 0; let predikat = "Perlu Pengembangan"; if(nilaiAkhir >= 91) predikat = "Sangat Baik"; else if(nilaiAkhir >= 81) predikat = "Baik"; else if(nilaiAkhir >= 71) predikat = "Cukup";
    const formData = { JadwalID: jdw.JadwalID, GuruID: jdw.GuruID, SupervisorID: APP_STATE.user.UserID, MataPelajaran: jdw.MataPelajaran, Kelas: jdw.Kelas, KekuatanGuru: document.getElementById('obs-kekuatan').value, AreaPengembangan: document.getElementById('obs-pengembangan').value, Kesimpulan: "-", TotalSkor: totalSkor, NilaiAkhir: nilaiAkhir, Predikat: predikat, StatusSubmit: statusAction, DetailNilai: detailNilai, DokumentasiURL: "" };
    const btnDraft = document.getElementById('btn-draft-obs'); const btnSubmit = document.getElementById('btn-submit-obs'); btnDraft.disabled = true; btnSubmit.disabled = true; btnSubmit.innerText = "Memproses...";
    const fileInput = document.getElementById('obs-file');
    if (fileInput && fileInput.files.length > 0) {
      const file = fileInput.files[0]; if (file.size > 3 * 1024 * 1024) { btnDraft.disabled = false; btnSubmit.disabled = false; btnSubmit.innerText = "Selesaikan Penilaian"; return showToast("Ukuran file terlalu besar! Maksimal 3MB.", "error"); }
      btnSubmit.innerText = "Mengunggah Bukti..."; const reader = new FileReader(); reader.onload = function(e) { const dataURI = e.target.result; google.script.run.withSuccessHandler(resStr => { const res = JSON.parse(resStr); if(res.status === 'success') { formData.DokumentasiURL = res.data; lanjutSimpanObservasi(formData, btnDraft, btnSubmit); } else { btnDraft.disabled = false; btnSubmit.disabled = false; btnSubmit.innerText = "Selesaikan Penilaian"; showToast("Gagal unggah: " + res.message, "error"); } }).uploadFileToDrive(dataURI, file.name, file.type); }; reader.readAsDataURL(file);
    } else { lanjutSimpanObservasi(formData, btnDraft, btnSubmit); }
  }
  function lanjutSimpanObservasi(formData, btnDraft, btnSubmit) {
    btnSubmit.innerText = "Menyimpan Data..."; google.script.run.withSuccessHandler(resStr => { const res = JSON.parse(resStr); btnDraft.disabled = false; btnSubmit.disabled = false; btnSubmit.innerText = "Selesaikan Penilaian"; if(res.status === 'success') { showToast(res.message, 'success'); batalObservasi(); } else { showToast(res.message, 'error'); } }).saveObservasi(formData);
  }

  // ==========================================
  // 7. MODUL TINDAK LANJUT
  // ==========================================
  function loadTindakLanjutData() { const tbody = document.getElementById('tbody-tl'); if(!tbody) return; tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Memuat data...</td></tr>'; google.script.run.withSuccessHandler(r => { const res = JSON.parse(r); if(res.status === 'success') { APP_STATE.tindakLanjut = res.data; renderTLTable(); } }).getObservasiSelesai(); }
  function renderTLTable() {
    const tbody = document.getElementById('tbody-tl'); tbody.innerHTML = ''; let vw = APP_STATE.tindakLanjut || [];
    if(APP_STATE.user.Role === 'GURU') { vw = vw.filter(o => o.GuruID === APP_STATE.user.GuruID || o.NamaGuru === APP_STATE.user.Nama); }
    if(APP_STATE.user.Role === 'SUPERVISOR') { vw = vw.filter(o => o.Supervisor === APP_STATE.user.Nama); }
    if(vw.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada hasil observasi selesai.</td></tr>'; return; }
    vw.forEach(obs => { let bTL = obs.StatusTL === 'Selesai' ? 'badge-selesai' : (obs.StatusTL === 'Dalam Proses' ? 'badge-aktif' : 'badge-dibatalkan'); tbody.innerHTML += `<tr><td>${formatTanggalIndo(obs.TanggalObservasi)}</td><td><strong>${obs.NamaGuru}</strong></td><td>${obs.MataPelajaran}<br><small>Kls: ${obs.Kelas}</small></td><td><strong>${obs.NilaiAkhir}</strong> / 100 <br><small>${obs.Predikat}</small></td><td><span class="badge ${bTL}">${obs.StatusTL}</span></td><td><button class="btn-sm btn-primary" onclick="openModalTL('${obs.ObservasiID}')"><i class="fas fa-search"></i> Evaluasi</button></td></tr>`; });
  }
  function filterTLTable() { const kw = document.getElementById('search-tl').value.toLowerCase(); let vw = APP_STATE.tindakLanjut || []; if(APP_STATE.user.Role === 'GURU') { vw = vw.filter(o => o.GuruID === APP_STATE.user.GuruID || o.NamaGuru === APP_STATE.user.Nama); } if(APP_STATE.user.Role === 'SUPERVISOR') { vw = vw.filter(o => o.Supervisor === APP_STATE.user.Nama); } const flt = vw.filter(o => o.NamaGuru && o.NamaGuru.toLowerCase().includes(kw)); const tbody = document.getElementById('tbody-tl'); tbody.innerHTML = ''; flt.forEach(obs => { let bTL = obs.StatusTL === 'Selesai' ? 'badge-selesai' : (obs.StatusTL === 'Dalam Proses' ? 'badge-aktif' : 'badge-dibatalkan'); tbody.innerHTML += `<tr><td>${formatTanggalIndo(obs.TanggalObservasi)}</td><td><strong>${obs.NamaGuru}</strong></td><td>${obs.MataPelajaran}<br><small>Kls: ${obs.Kelas}</small></td><td><strong>${obs.NilaiAkhir}</strong> / 100 <br><small>${obs.Predikat}</small></td><td><span class="badge ${bTL}">${obs.StatusTL}</span></td><td><button class="btn-sm btn-primary" onclick="openModalTL('${obs.ObservasiID}')"><i class="fas fa-search"></i> Evaluasi</button></td></tr>`; }); }
  function openModalTL(obsID) {
    const obs = APP_STATE.tindakLanjut.find(o => o.ObservasiID === obsID); if(!obs) return; document.getElementById('tl-nama-guru').innerText = obs.NamaGuru; document.getElementById('tl-info-obs').innerText = `${obs.MataPelajaran} - Kelas ${obs.Kelas}`; document.getElementById('tl-nilai').innerText = obs.NilaiAkhir; document.getElementById('tl-predikat').innerText = obs.Predikat; document.getElementById('tl-obs-id').value = obs.ObservasiID; document.getElementById('tl-guru-id').value = obs.GuruID;
    if(obs.DataTL) { document.getElementById('tl-temuan').value = obs.DataTL.Temuan||''; document.getElementById('tl-rekomendasi').value = obs.DataTL.Rekomendasi||''; document.getElementById('tl-rencana').value = obs.DataTL.RencanaTindakLanjut||''; document.getElementById('tl-target').value = obs.DataTL.TargetTanggal||''; document.getElementById('tl-status').value = obs.DataTL.Status||'Belum Dimulai'; document.getElementById('tl-catatan').value = obs.DataTL.CatatanSupervisor||''; } else { document.getElementById('formTL').reset(); document.getElementById('tl-obs-id').value = obs.ObservasiID; document.getElementById('tl-guru-id').value = obs.GuruID; }
    const btnSave = document.getElementById('btn-save-tl'); if(APP_STATE.user.Role === 'GURU' && APP_STATE.user.Nama === obs.NamaGuru) { btnSave.style.display = 'none'; document.getElementById('tl-temuan').readOnly = true; document.getElementById('tl-rekomendasi').readOnly = true; document.getElementById('tl-rencana').readOnly = true; } else { btnSave.style.display = 'block'; document.getElementById('tl-temuan').readOnly = false; document.getElementById('tl-rekomendasi').readOnly = false; document.getElementById('tl-rencana').readOnly = false; } document.getElementById('modal-tl').style.display = 'flex';
  }
  function closeModalTL() { document.getElementById('modal-tl').style.display = 'none'; }
  function submitTL(e) { e.preventDefault(); const btn = document.getElementById('btn-save-tl'); btn.disabled = true; btn.innerText = 'Menyimpan...'; const fd = { ObservasiID: document.getElementById('tl-obs-id').value, GuruID: document.getElementById('tl-guru-id').value, Temuan: document.getElementById('tl-temuan').value, Rekomendasi: document.getElementById('tl-rekomendasi').value, RencanaTindakLanjut: document.getElementById('tl-rencana').value, TargetTanggal: document.getElementById('tl-target').value, Status: document.getElementById('tl-status').value, CatatanSupervisor: document.getElementById('tl-catatan').value }; google.script.run.withSuccessHandler(r => { const res = JSON.parse(r); btn.disabled = false; btn.innerText = 'Simpan Tindak Lanjut'; if(res.status === 'success') { showToast(res.message, 'success'); closeModalTL(); loadTindakLanjutData(); } else { showToast(res.message, 'error'); } }).saveTindakLanjut(fd); }

  // ==========================================
  // 8. MODUL LAPORAN, DASHBOARD & CHARTS
  // ==========================================
  function loadLaporanData() { 
    const tbody = document.getElementById('tbody-laporan'); if(tbody) tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Memuat data laporan...</td></tr>'; 
    google.script.run.withSuccessHandler(r => { 
        const res = JSON.parse(r); 
        if(res.status === 'success') { 
            APP_STATE.laporanDetail = res.data.detail; 
            renderLaporanSummary(res.data.summary); 
            filterLaporanTable(); 
            renderDashboardCharts(res.data.detail);
        } 
    }).getRekapLaporan(); 
  }

  function renderLaporanSummary(summary) {
    const htmlCards = `<div class="stat-card"><div class="stat-icon" style="background:#e3f2fd; color:#1756a9;"><i class="fas fa-users"></i></div><div class="stat-details"><h3>Total Guru</h3><h2>${summary.totalGuru}</h2></div></div><div class="stat-card"><div class="stat-icon" style="background:#fff3e0; color:#f57c00;"><i class="fas fa-calendar"></i></div><div class="stat-details"><h3>Supervisi Terjadwal</h3><h2>${summary.jadwalAktif}</h2></div></div><div class="stat-card"><div class="stat-icon" style="background:#e8f5e9; color:#2e7d32;"><i class="fas fa-check"></i></div><div class="stat-details"><h3>Observasi Selesai</h3><h2>${summary.obsSelesai}</h2></div></div><div class="stat-card"><div class="stat-icon" style="background:#fce4ec; color:#c2185b;"><i class="fas fa-sync"></i></div><div class="stat-details"><h3>Tindak Lanjut Selesai</h3><h2>${summary.tlSelesai}</h2></div></div>`;
    const sumDiv = document.getElementById('laporan-summary'); if(sumDiv) sumDiv.innerHTML = htmlCards;
    const sumDash = document.getElementById('laporan-summary-dashboard'); if(sumDash) sumDash.innerHTML = htmlCards;
  }

  function renderDashboardCharts(dataDetail) {
    if(!document.getElementById('pieChart')) return;
    
    let pieData = { "Sangat Baik": 0, "Baik": 0, "Cukup": 0, "Perlu Pengembangan": 0 };
    dataDetail.forEach(item => {
        if (pieData[item.Predikat] !== undefined) pieData[item.Predikat]++;
    });

    const ctxPie = document.getElementById('pieChart').getContext('2d');
    if(chartPieInstance) chartPieInstance.destroy();
    chartPieInstance = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: ['Sangat Baik', 'Baik', 'Cukup', 'Perlu Pengembangan'],
            datasets: [{
                data: [pieData["Sangat Baik"], pieData["Baik"], pieData["Cukup"], pieData["Perlu Pengembangan"]],
                backgroundColor: ['#28a745', '#17a2b8', '#ffc107', '#dc3545'],
                borderWidth: 2
            }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'bottom' } } }
    });

    const listAdmin = document.getElementById('list-administrasi');
    const listPelaksanaan = document.getElementById('list-pelaksanaan');
    
    if(listAdmin && listPelaksanaan) {
        listAdmin.innerHTML = '';
        listPelaksanaan.innerHTML = '';
        
        let adminData = dataDetail.filter(item => item.JenisSupervisi === 'Administrasi');
        let pelaksanaanData = dataDetail.filter(item => item.JenisSupervisi === 'Pelaksanaan');
        
        if(adminData.length === 0) {
            listAdmin.innerHTML = '<li style="color:#999; list-style:none; margin-left:-20px; text-align:center; font-style:italic;">Belum ada data.</li>';
        } else {
            adminData.forEach(item => { listAdmin.innerHTML += `<li>${item.NamaGuru}</li>`; });
        }
        
        if(pelaksanaanData.length === 0) {
            listPelaksanaan.innerHTML = '<li style="color:#999; list-style:none; margin-left:-20px; text-align:center; font-style:italic;">Belum ada data.</li>';
        } else {
            pelaksanaanData.forEach(item => { listPelaksanaan.innerHTML += `<li>${item.NamaGuru}</li>`; });
        }
    }
  }

  function filterLaporanTable() {
    const jenisFilter = document.getElementById('filter-jenis-laporan').value; const kw = document.getElementById('search-laporan').value.toLowerCase(); let vw = APP_STATE.laporanDetail || []; if(APP_STATE.user.Role === 'GURU') { vw = vw.filter(d => d.NamaGuru === APP_STATE.user.Nama); } vw = vw.filter(d => d.JenisSupervisi === jenisFilter); if(kw) { vw = vw.filter(d => d.NamaGuru.toLowerCase().includes(kw) || d.MataPelajaran.toLowerCase().includes(kw)); } APP_STATE.laporanView = vw; 
    const tbody = document.getElementById('tbody-laporan'); if(!tbody) return; tbody.innerHTML = ''; if(vw.length === 0) { tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding:20px;">Tidak ada data pada kategori ini.</td></tr>'; return; }
    vw.forEach(item => { let bTL = item.StatusTL === 'Selesai' ? 'badge-selesai' : (item.StatusTL === 'Dalam Proses' ? 'badge-aktif' : 'badge-dibatalkan'); let aksiCetak = `<button class="btn-sm btn-info" onclick="cetakInstrumen('${item.ObservasiID}')" style="margin-bottom:4px; width:100%;"><i class="fas fa-print"></i> Detail</button>`; if(isManajemen()) { aksiCetak += `<br><button class="btn-sm" style="background:#dc3545; color:white; border:none; width:100%;" onclick="konfirmasiHapusObservasi('${item.ObservasiID}')"><i class="fas fa-trash"></i> Hapus</button>`; } tbody.innerHTML += `<tr><td style="text-align:center;">${formatTanggalIndo(item.Tanggal)}</td><td><strong>${item.NamaGuru}</strong></td><td style="text-align:center;">${item.MataPelajaran}</td><td style="text-align:center;"><strong>${item.Nilai}</strong></td><td style="text-align:center;">${item.Predikat}</td><td style="text-align:center;"><span class="badge ${bTL}">${item.StatusTL}</span></td><td class="no-print" style="text-align:center;">${aksiCetak}</td></tr>`; });
  }

  function konfirmasiHapusObservasi(id) { if(confirm("Yakin ingin menghapus data Laporan Observasi ini? Seluruh instrumen nilai dan tindak lanjut akan ikut terhapus permanen!")) { showToast("Sedang menghapus data...", "info"); google.script.run.withSuccessHandler(r => { const res = JSON.parse(r); if(res.status === 'success') { showToast(res.message, 'success'); loadLaporanData(); } else showToast(res.message, 'error'); }).hapusDataObservasi(id); } }
  function exportToExcel() { const data = APP_STATE.laporanView || []; if(data.length === 0) return showToast("Tidak ada data diekspor!", "error"); let csvContent = "data:text/csv;charset=utf-8,TANGGAL,NAMA GURU,MATA PELAJARAN,NILAI AKHIR,PREDIKAT,STATUS TINDAK LANJUT\n"; data.forEach(item => { let tgl = formatTanggalIndo(item.Tanggal); let nama = item.NamaGuru ? item.NamaGuru.replace(/"/g, '""') : ""; let mapel = item.MataPelajaran ? item.MataPelajaran.replace(/"/g, '""') : ""; csvContent += `"${tgl}","${nama}","${mapel}",${item.Nilai},"${item.Predikat}","${item.StatusTL}"\n`; }); const encodedUri = encodeURI(csvContent); const link = document.createElement("a"); link.setAttribute("href", encodedUri); const sel = document.getElementById('filter-jenis-laporan'); link.setAttribute("download", `Data_${sel.options[sel.selectedIndex].text.replace(/ /g, "_")}.csv`); document.body.appendChild(link); link.click(); document.body.removeChild(link); showToast("File Excel diunduh!", "success"); }
  function cetakLaporan() { const tgl = new Date(); const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; document.getElementById('print-tanggal-cetak').innerText = `Surakarta, ${tgl.getDate()} ${bulan[tgl.getMonth()]} ${tgl.getFullYear()}`; const selectObj = document.getElementById('filter-jenis-laporan'); document.getElementById('judul-print-laporan').innerText = "LAPORAN " + selectObj.options[selectObj.selectedIndex].text; window.print(); }

  function cetakInstrumen(obsID) {
    if(!obsID) return showToast("Error: ID Laporan tidak valid.", "error"); showToast("Mempersiapkan instrumen...", "info"); google.script.run.withSuccessHandler(resStr => { try { const res = JSON.parse(resStr); if(res.status === 'success') buatTemplateCetak(res.data); else showToast("Gagal: " + res.message, "error"); } catch(e) { showToast("Error sistem saat membaca data.", "error"); } }).withFailureHandler(e => showToast("Error Server!", "error")).getDetailCetakLengkap(obsID);
  }
  function buatTemplateCetak(data) {
    let printDiv = document.getElementById('print-temp-div'); if(!printDiv) { printDiv = document.createElement('div'); printDiv.id = 'print-temp-div'; document.body.appendChild(printDiv); }
    const tgl = new Date(); const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember']; const tglCetak = `Surakarta, ${tgl.getDate()} ${bulan[tgl.getMonth()]} ${tgl.getFullYear()}`;
    let judulCetak = data.JenisSupervisi === 'Administrasi' ? 'INSTRUMEN SUPERVISI ADMINISTRASI <br>PERENCANAAN PEMBELAJARAN MENDALAM' : 'INSTRUMEN OBSERVASI PELAKSANAAN <br>PEMBELAJARAN MENDALAM';
    let theadHtml = data.JenisSupervisi === 'Administrasi' ? `<tr><th rowspan="2" style="width: 30px;">No</th><th rowspan="2">Aspek yang diamati</th><th colspan="5">Skala</th><th rowspan="2" style="width: 200px;">Komentar Kritis</th></tr><tr><th style="width: 30px;">0</th><th style="width: 30px;">1</th><th style="width: 30px;">2</th><th style="width: 30px;">3</th><th style="width: 30px;">4</th></tr>` : `<tr><th style="width: 30px;">No</th><th>Aspek yang diamati</th><th style="width: 100px;">Bukti Pembelajaran</th><th style="width: 250px;">Catatan</th></tr>`;
    let tbodyHtml = ''; let currentAspek = ''; let totalSkor = 0;
    data.DetailNilai.forEach((item, index) => {
      totalSkor += (item.Skor || 0);
      if(item.Aspek !== currentAspek) { currentAspek = item.Aspek; let colspanSize = data.JenisSupervisi === 'Administrasi' ? 8 : 4; tbodyHtml += `<tr style="background:#f9f9f9; page-break-inside: avoid;"><td colspan="${colspanSize}"><strong>${currentAspek}</strong></td></tr>`; }
      if(data.JenisSupervisi === 'Administrasi') { tbodyHtml += `<tr style="page-break-inside: avoid;"><td style="text-align:center;">${index + 1}</td><td>${item.Indikator}</td><td style="text-align:center;">${item.Skor === 0 ? 'V' : ''}</td><td style="text-align:center;">${item.Skor === 1 ? 'V' : ''}</td><td style="text-align:center;">${item.Skor === 2 ? 'V' : ''}</td><td style="text-align:center;">${item.Skor === 3 ? 'V' : ''}</td><td style="text-align:center;">${item.Skor === 4 ? 'V' : ''}</td><td>${item.Catatan || ''}</td></tr>`; } else { tbodyHtml += `<tr style="page-break-inside: avoid;"><td style="text-align:center;">${index + 1}</td><td>${item.Indikator}</td><td style="text-align:center;">(Skor: ${item.Skor})</td><td>${item.Catatan || ''}</td></tr>`; }
    });
    let maxSkor = data.DetailNilai.length * 4; let nilaiAkhir = maxSkor > 0 ? Math.round((totalSkor / maxSkor) * 100) : 0; let predikat = "Perlu Pengembangan"; if(nilaiAkhir >= 91) predikat = "Sangat Baik"; else if(nilaiAkhir >= 81) predikat = "Baik"; else if(nilaiAkhir >= 71) predikat = "Cukup";
    let safeNbmSup = data.NBMSupervisor ? data.NBMSupervisor : '.......................'; let safeNbmGuru = data.NBMGuru ? data.NBMGuru : '.......................';
    printDiv.innerHTML = `<style>@media print { #app-layout { display: none !important; } #toast-container { display: none !important; } #print-temp-div { display: block !important; width: 100%; padding: 0; font-family: 'Times New Roman', Times, serif; color: #000; } .print-dokumen table { width: 100%; border-collapse: collapse; font-size: 14px; margin-bottom: 20px; page-break-inside: auto; } .print-dokumen .identitas td { border: none; padding: 4px; } .print-dokumen .rubrik { width: 100%; border-collapse: collapse; } .print-dokumen .rubrik thead { display: table-header-group; } .print-dokumen .rubrik tr { page-break-inside: avoid; } .print-dokumen .rubrik th, .print-dokumen .rubrik td { border: 1px solid #000; padding: 6px; } .print-dokumen .rubrik th { text-align: center; background-color: #f0f0f0 !important; -webkit-print-color-adjust: exact; } .print-dokumen .rekap-nilai td { border: 1px solid #000; padding: 6px; } .print-dokumen .refleksi { width: 100%; border-collapse: collapse; page-break-inside: auto; } .print-dokumen .refleksi tr { page-break-inside: avoid; } .print-dokumen .refleksi td { border: 1px solid #000; padding: 6px; } .ttd-table td { border: none; text-align: center; } }</style><div class="print-dokumen"><div style="text-align: center; margin-bottom: 20px;"><img src="https://drive.google.com/thumbnail?id=1BokjTNpAmp9l6QpM0ULASQp2TpvMEUjb&sz=w400" style="max-width: 100px;"><h3 style="margin: 15px 0 0 0; font-size: 16px;">${judulCetak}</h3></div><table class="identitas" style="width: 70%;"><tr><td style="width: 180px;">Nama Guru</td><td>: <strong>${data.NamaGuru}</strong></td></tr><tr><td>Mata Pelajaran</td><td>: ${data.MataPelajaran}</td></tr><tr><td>Kelas/ Konsentrasi</td><td>: ${data.Kelas}</td></tr><tr><td>Topik</td><td>: ....................................................</td></tr><tr><td>Supervisor</td><td>: ${data.Supervisor}</td></tr></table><div style="font-size: 12px; font-style: italic; margin-bottom: 10px;">${data.JenisSupervisi === 'Administrasi' ? 'Skala yang digunakan dalam menelaah: 0 = tidak ada, 1 = sangat kurang, 2 = kurang, 3 = baik, 4 = sangat baik. (Berikan tanda V pada kolom)' : 'Berikan umpan balik terhadap praktik pembelajaran yang telah dilakukan oleh guru yang diamati dengan menggunakan instrumen berikut!'}</div><table class="rubrik"><thead>${theadHtml}</thead><tbody>${tbodyHtml}</tbody></table><div style="page-break-inside: avoid;"><table class="rekap-nilai" style="width: 350px; margin-top: 20px; border-collapse: collapse;"><tr><td style="border: 1px solid #000; padding: 6px; font-weight: bold; width: 60%;">Total Skor</td><td style="border: 1px solid #000; padding: 6px; text-align: center;">${totalSkor} / ${maxSkor}</td></tr><tr><td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Nilai Akhir (Skala 100)</td><td style="border: 1px solid #000; padding: 6px; text-align: center;"><strong>${nilaiAkhir}</strong></td></tr><tr><td style="border: 1px solid #000; padding: 6px; font-weight: bold;">Predikat</td><td style="border: 1px solid #000; padding: 6px; text-align: center;"><strong>${predikat}</strong></td></tr></table></div><h4 style="margin-top: 20px; margin-bottom: 5px; page-break-inside: avoid;">Refleksi</h4><table class="refleksi" style="page-break-inside: auto;"><tr style="page-break-inside: avoid;"><td style="width: 30px; text-align:center;">1</td><td>Pelajaran apa yang telah diperoleh dari Implementasi Perencanaan Pembelajaran yang telah dilakukan beserta faktor-faktor pendukungnya?<br><strong>Catatan:</strong> ${data.Kekuatan || '-'}</td></tr><tr style="page-break-inside: avoid;"><td style="text-align:center;">2</td><td>Hal-hal apa saja yang pencapaiannya belum memuaskan dari Implementasi Perencanaan Pembelajaran yang telah dilakukan beserta faktor-faktor penghambatnya?<br><strong>Catatan:</strong> ${data.AreaPengembangan || '-'}</td></tr><tr style="page-break-inside: avoid;"><td style="text-align:center;">3</td><td>Rencana tindak lanjut apa yang akan dibuat untuk perbaikan ke depan?<br><strong>Catatan:</strong> ${data.RencanaTL || '-'}</td></tr></table><div style="margin-top: 20px;"><div style="text-align: right; margin-bottom: 15px; font-size: 14px; padding-right: 40px;">${tglCetak}</div><table class="ttd-table" style="width: 100%; font-size: 14px; page-break-inside: avoid;"><tr><td style="width: 50%;">Supervisor</td><td style="width: 50%;">Guru</td></tr><tr><td style="height: 60px;"></td><td></td></tr><tr><td><strong>${data.Supervisor}</strong><br>NBM. ${safeNbmSup}</td><td><strong>${data.NamaGuru}</strong><br>NBM. ${safeNbmGuru}</td></tr></table><div style="text-align: center; margin-top: 20px; font-size: 14px; page-break-inside: avoid;">Mengetahui,<br>Kepala Sekolah<br><div style="height: 60px;"></div><strong>Joko Harinto, M.Pd.</strong><br>NIPM. 512 099 314</div></div></div>`;
    document.getElementById('app-layout').style.display = 'none'; setTimeout(() => { window.print(); document.getElementById('app-layout').style.display = 'flex'; printDiv.style.display = 'none'; }, 500);
  }

  // ==========================================
  // 9. CRUD MANAJEMEN INSTRUMEN
  // ==========================================
  function loadInstrumenAdmin() {
    const tbody = document.getElementById('tbody-instrumen'); if(!tbody) return;
    tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;"><i class="fas fa-spinner fa-spin"></i> Memuat data instrumen...</td></tr>';
    google.script.run.withSuccessHandler(resStr => {
      const res = JSON.parse(resStr);
      if(res.status === 'success') { APP_STATE.allInstrumens = res.data; renderInstrumenAdminTable(); }
    }).getInstrumenAll();
  }

  function renderInstrumenAdminTable() {
    const tbody = document.getElementById('tbody-instrumen'); tbody.innerHTML = '';
    if(!APP_STATE.allInstrumens || APP_STATE.allInstrumens.length === 0) { tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;">Belum ada data instrumen.</td></tr>'; return; }
    APP_STATE.allInstrumens.forEach((ins) => {
      const bClass = ins.Status === 'Aktif' ? 'badge-aktif' : 'badge-nonaktif';
      let actBtn = `<button class="btn-sm btn-info" onclick="editInstrumen('${ins.InstrumenID}')" style="margin-bottom:4px;"><i class="fas fa-edit"></i> Edit</button><br><button class="btn-sm" style="background:#dc3545; color:white; border:none;" onclick="hapusInstrumen('${ins.InstrumenID}')"><i class="fas fa-trash"></i> Hapus</button>`;
      tbody.innerHTML += `<tr><td style="text-align:center;">${ins.Urutan}</td><td><strong>${ins.JenisInstrumen}</strong></td><td>${ins.Aspek}</td><td>${ins.Indikator}</td><td style="text-align:center;"><span class="badge ${bClass}">${ins.Status}</span></td><td style="text-align:center;">${actBtn}</td></tr>`;
    });
  }

  function openModalInstrumen() { document.getElementById('formInstrumen').reset(); document.getElementById('ins-id').value = ''; document.getElementById('modal-title-instrumen').innerText = 'Tambah Instrumen'; document.getElementById('modal-instrumen').style.display = 'flex'; }
  function closeModalInstrumen() { document.getElementById('modal-instrumen').style.display = 'none'; }
  function editInstrumen(id) {
    const ins = APP_STATE.allInstrumens.find(i => i.InstrumenID === id); if(!ins) return;
    document.getElementById('ins-id').value = ins.InstrumenID;
    document.getElementById('ins-jenis').value = ins.JenisInstrumen;
    document.getElementById('ins-aspek').value = ins.Aspek;
    document.getElementById('ins-indikator').value = ins.Indikator;
    document.getElementById('ins-urutan').value = ins.Urutan;
    document.getElementById('ins-status').value = ins.Status;
    document.getElementById('modal-title-instrumen').innerText = 'Edit Instrumen'; document.getElementById('modal-instrumen').style.display = 'flex';
  }
  function submitInstrumen(e) {
    e.preventDefault(); const btn = document.getElementById('btn-save-instrumen'); btn.disabled = true; btn.innerText = 'Menyimpan...';
    const fd = { InstrumenID: document.getElementById('ins-id').value, Jenis: document.getElementById('ins-jenis').value, Aspek: document.getElementById('ins-aspek').value, Indikator: document.getElementById('ins-indikator').value, Urutan: document.getElementById('ins-urutan').value, Status: document.getElementById('ins-status').value };
    google.script.run.withSuccessHandler(r => { const res = JSON.parse(r); btn.disabled = false; btn.innerText = 'Simpan Instrumen'; if(res.status === 'success') { showToast(res.message, 'success'); closeModalInstrumen(); loadInstrumenAdmin(); } else showToast(res.message, 'error'); }).saveInstrumenData(fd);
  }
  function hapusInstrumen(id) { if(confirm("Yakin ingin menghapus butir instrumen ini secara permanen?")) { showToast("Sedang menghapus...", "info"); google.script.run.withSuccessHandler(r => { const res = JSON.parse(r); if(res.status === 'success') { showToast(res.message, 'success'); loadInstrumenAdmin(); } else showToast(res.message, 'error'); }).hapusDataInstrumen(id); } }

  // ==========================================
  // 10. LOGIN, AUTH & INIT
  // ==========================================
  function switchLoginTab(type) {
    ['admin', 'guru', 'supervisor'].forEach(t => {
      const tab = document.getElementById('tab-' + t);
      if (tab) tab.classList.remove('active');
    });
    document.getElementById('loginFormAdmin').style.display = 'none';
    document.getElementById('loginFormGuru').style.display = 'none';
    document.getElementById('loginFormSupervisor').style.display = 'none';

    document.getElementById('tab-' + type).classList.add('active');
    if (type === 'admin') document.getElementById('loginFormAdmin').style.display = 'block';
    else if (type === 'guru') document.getElementById('loginFormGuru').style.display = 'block';
    else if (type === 'supervisor') document.getElementById('loginFormSupervisor').style.display = 'block';
  }

  function handleLogin(type) {
    const u = document.getElementById('username-' + type).value;
    const p = document.getElementById('password-' + type).value;
    const btn = document.getElementById('btn-login-' + type);
    if (!u || !p) return showToast('Wajib diisi!', 'error');
    btn.disabled = true;
    btn.innerText = 'Memproses...';

    // Tentukan role yang diharapkan berdasarkan tab login
    let expectedRole = [];
    if (type === 'admin') expectedRole = ['ADMIN', 'KEPALA_SEKOLAH', 'WKS_KURIKULUM'];
    else if (type === 'guru') expectedRole = ['GURU'];
    else if (type === 'supervisor') expectedRole = ['SUPERVISOR'];

    google.script.run.withSuccessHandler(r => {
      const res = JSON.parse(r);
      btn.disabled = false;
      btn.innerText = 'Masuk';
      if (res.status === 'success') {
        if (expectedRole.indexOf(res.data.Role) === -1) {
          const roleNames = { 'ADMIN': 'Admin', 'KEPALA_SEKOLAH': 'Kepala Sekolah', 'WKS_KURIKULUM': 'WKS Kurikulum', 'GURU': 'Guru', 'SUPERVISOR': 'Supervisor' };
          const myRole = roleNames[res.data.Role] || res.data.Role;
          showToast('Akun Anda terdaftar sebagai ' + myRole + '. Silakan pilih tab login yang sesuai.', 'error');
          return;
        }
        APP_STATE.user = res.data;
        APP_STATE.isLoggedIn = true;
        sessionStorage.setItem('simpro_user', JSON.stringify(res.data));
        initApp();
      } else {
        showToast(res.message, 'error');
      }
    }).serverLogin(u, p);
  }

  function handleLogout() {
    sessionStorage.removeItem('simpro_user');
    APP_STATE.user = null;
    APP_STATE.isLoggedIn = false;
    document.getElementById('login-layout').style.display = 'flex';
    document.getElementById('app-layout').style.display = 'none';
    document.getElementById('loginFormAdmin').reset();
    document.getElementById('loginFormGuru').reset();
    document.getElementById('loginFormSupervisor').reset();
    showToast('Berhasil keluar', 'success');
  }

  function openPasswordModal() { document.getElementById('modal-password').style.display = 'flex'; }
  function closePasswordModal() { document.getElementById('modal-password').style.display = 'none'; document.getElementById('formPassword').reset(); }
  function submitPasswordChange(e) { e.preventDefault(); const lama = document.getElementById('pass-lama').value, baru = document.getElementById('pass-baru').value, btn = document.getElementById('btn-save-pass'); if(baru.length < 4) return showToast("Password baru minimal 4 karakter!", "error"); btn.disabled = true; btn.innerText = 'Menyimpan...'; google.script.run.withSuccessHandler(r => { const res = JSON.parse(r); btn.disabled = false; btn.innerText = 'Simpan Password Baru'; if(res.status === 'success') { showToast(res.message, 'success'); closePasswordModal(); } else showToast(res.message, 'error'); }).changePassword(APP_STATE.user.UserID, lama, baru); }

  function initApp() {
    document.getElementById('login-layout').style.display = 'none';
    document.getElementById('app-layout').style.display = 'flex';
    document.getElementById('welcome-user').innerText = APP_STATE.user.Nama + ' (' + APP_STATE.user.Role + ')';
    renderSidebar();
    navigateTo('dashboard', 'Dashboard');
  }

  window.addEventListener('includes-loaded', function() {
    document.getElementById('app-layout').style.display = 'none';
    const su = sessionStorage.getItem('simpro_user');
    if(su) {
      APP_STATE.user = JSON.parse(su);
      APP_STATE.isLoggedIn = true;
      initApp();
    }
  });

  // ==========================================
  // 11. MODUL PENGAJUAN JADWAL (TAHAP B)
  // ==========================================
  function updateTombolJadwal() {
    const btnAdd = document.getElementById('btn-add-jadwal');
    const btnAjukan = document.getElementById('btn-ajukan-jadwal');
    if (!btnAdd || !btnAjukan) return;
    if (isManajemen()) {
      btnAdd.style.display = 'inline-block';
      btnAjukan.style.display = 'none';
    } else if (APP_STATE.user.Role === 'GURU') {
      btnAdd.style.display = 'none';
      btnAjukan.style.display = 'inline-block';
    } else {
      btnAdd.style.display = 'none';
      btnAjukan.style.display = 'none';
    }
  }

  function openAjukanJadwalModal() {
    document.getElementById('formAjukanJadwal').reset();
    document.getElementById('modal-ajukan-jadwal').style.display = 'flex';
  }
  function closeAjukanJadwalModal() {
    document.getElementById('modal-ajukan-jadwal').style.display = 'none';
  }

  function submitAjukanJadwal(e) {
    e.preventDefault();
    const btn = document.getElementById('btn-submit-ajukan');
    btn.disabled = true;
    btn.innerText = 'Mengirim...';
    
    const fd = {
      GuruID: APP_STATE.user.GuruID || '',
      NamaGuru: APP_STATE.user.Nama,
      MataPelajaran: document.getElementById('aj-mapel').value,
      Kelas: document.getElementById('aj-kelas').value,
      Ruang: document.getElementById('aj-ruang').value,
      Tanggal: document.getElementById('aj-tanggal').value,
      Jam: document.getElementById('aj-jam').value,
      JenisSupervisi: document.getElementById('aj-jenis').value,
      CatatanPengajuan: document.getElementById('aj-catatan').value
    };
    
    google.script.run.withSuccessHandler(r => {
      const res = JSON.parse(r);
      btn.disabled = false;
      btn.innerText = 'Kirim Pengajuan';
      if (res.status === 'success') {
        showToast(res.message, 'success');
        closeAjukanJadwalModal();
        loadJadwalData();
      } else {
        showToast(res.message, 'error');
      }
    }).ajukanJadwal(fd);
  }

  // ===== APPROVE =====
  function openApproveModal(jadwalID) {
    const jdw = APP_STATE.jadwals.find(j => j.JadwalID === jadwalID);
    if (!jdw) return;
    document.getElementById('apr-jadwal-id').value = jadwalID;
    document.getElementById('apr-guru').innerText = jdw.NamaGuru;
    document.getElementById('apr-info').innerText = `${jdw.MataPelajaran} - ${jdw.Kelas} - ${formatTanggalIndo(jdw.Tanggal)} - ${formatWaktuIndo(jdw.Jam)}`;
    
    const sel = document.getElementById('apr-supervisor');
    sel.innerHTML = '<option value="">-- Pilih Supervisor --</option>';
    
    // Load daftar guru (untuk sementara: semua guru aktif bisa jadi supervisor; nanti di TAHAP C difilter)
    if (APP_STATE.gurus.length === 0) {
      google.script.run.withSuccessHandler(r => {
        const res = JSON.parse(r);
        if (res.status === 'success') {
          APP_STATE.gurus = res.data;
          populateSupervisorSelect(jdw.NamaGuru);
        }
      }).getGuruList();
    } else {
      populateSupervisorSelect(jdw.NamaGuru);
    }
    
    document.getElementById('modal-approve-jadwal').style.display = 'flex';
  }
  
  function populateSupervisorSelect(namaGuruDiSupervisi) {
    const sel = document.getElementById('apr-supervisor');
    sel.innerHTML = '<option value="">-- Pilih Supervisor --</option>';
    APP_STATE.gurus.forEach(g => {
      if ((g.StatusAktif || 'aktif').toString().toLowerCase().trim() === 'aktif' && g.NamaGuru !== namaGuruDiSupervisi) {
        sel.innerHTML += `<option value="${g.NamaGuru}">${g.NamaGuru}</option>`;
      }
    });
  }

  function closeApproveModal() {
    document.getElementById('modal-approve-jadwal').style.display = 'none';
  }

  function submitApprove(e) {
    e.preventDefault();
    const jadwalID = document.getElementById('apr-jadwal-id').value;
    const supervisorNama = document.getElementById('apr-supervisor').value;
    if (!supervisorNama) return showToast('Pilih supervisor terlebih dahulu.', 'error');
    
    const btn = document.getElementById('btn-approve-submit');
    btn.disabled = true;
    btn.innerText = 'Menyetujui...';
    
    google.script.run.withSuccessHandler(r => {
      const res = JSON.parse(r);
      btn.disabled = false;
      btn.innerText = 'Setujui & Tunjuk Supervisor';
      if (res.status === 'success') {
        showToast(res.message, 'success');
        closeApproveModal();
        loadJadwalData();
      } else {
        showToast(res.message, 'error');
      }
    }).approveJadwal(jadwalID, supervisorNama);
  }

  // ===== TOLAK =====
  function openTolakModal(jadwalID) {
    const jdw = APP_STATE.jadwals.find(j => j.JadwalID === jadwalID);
    if (!jdw) return;
    document.getElementById('tol-jadwal-id').value = jadwalID;
    document.getElementById('tol-guru').innerText = jdw.NamaGuru;
    document.getElementById('tol-info').innerText = `${jdw.MataPelajaran} - ${jdw.Kelas} - ${formatTanggalIndo(jdw.Tanggal)} - ${formatWaktuIndo(jdw.Jam)}`;
    document.getElementById('tol-catatan').value = '';
    document.getElementById('modal-tolak-jadwal').style.display = 'flex';
  }

  function closeTolakModal() {
    document.getElementById('modal-tolak-jadwal').style.display = 'none';
  }

  function submitTolak(e) {
    e.preventDefault();
    const jadwalID = document.getElementById('tol-jadwal-id').value;
    const catatan = document.getElementById('tol-catatan').value;
    
    const btn = document.getElementById('btn-tolak-submit');
    btn.disabled = true;
    btn.innerText = 'Menolak...';
    
    google.script.run.withSuccessHandler(r => {
      const res = JSON.parse(r);
      btn.disabled = false;
      btn.innerText = 'Tolak Pengajuan';
      if (res.status === 'success') {
        showToast(res.message, 'success');
        closeTolakModal();
        loadJadwalData();
      } else {
        showToast(res.message, 'error');
      }
    }).tolakJadwal(jadwalID, catatan);
  }

  // ===== GURU BATALKAN =====
  function batalkanPengajuanSaya(jadwalID) {
    if (!confirm("Yakin ingin membatalkan pengajuan jadwal ini?")) return;
    showToast("Membatalkan...", "info");
    google.script.run.withSuccessHandler(r => {
      const res = JSON.parse(r);
      if (res.status === 'success') {
        showToast(res.message, 'success');
        loadJadwalData();
      } else {
        showToast(res.message, 'error');
      }
    }).batalkanPengajuan(jadwalID);
  }
