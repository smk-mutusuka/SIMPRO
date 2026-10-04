/* =============================================================
 * api.js — Jembatan Frontend ↔ Apps Script Backend
 * =============================================================
 * JANGAN ubah apapun kecuali baris API_URL di bawah.
 * URL HARUS dalam SATU baris, tidak boleh ada enter/spasi.
 * ============================================================= */

var API_URL = 'https://script.google.com/macros/s/AKfycbzkVsmVwLGKBMMYlEN7KBf38cPsYxcIDV1PG5BgZPWnGgiigEkR4kUa5UOoMNYaiaN7/exec';

// =============================================================
// DAFTAR ACTION yang pakai method POST
// (yang tidak ada di sini otomatis dianggap GET)
// =============================================================
var POST_ACTIONS = [
  // Auth
  'serverLogin',
  'changePassword',
  // Guru
  'saveGuruData',
  // Jadwal
  'saveJadwal',
  'ajukanJadwal',        // ← TAHAP B (baru)
  'approveJadwal',       // ← TAHAP B (baru)
  'tolakJadwal',         // ← TAHAP B (baru)
  'batalkanPengajuan',   // ← TAHAP B (baru)
  'hapusDataJadwal',
  // Observasi
  'saveObservasi',
  'hapusDataObservasi',
  // Instrumen
  'saveInstrumenData',
  'hapusDataInstrumen',
  // Tindak Lanjut
  'saveTindakLanjut',
  // Drive
  'uploadFileToDrive'
  'saveSupervisor',      // ← TAHAP C
  'kirimWAReminder',     // ← TAHAP C
];

// =============================================================
// DAFTAR ACTION GET yang butuh argumen (dikirim via query string)
// =============================================================
var GET_ARGS_MAP = {
  'getDraftObservasi': ['jadwalID'],
  'getDetailCetakLengkap': ['obsID']
};

// =============================================================
// FUNGSI UTAMA
// =============================================================
async function apiCall(action, ...args) {
  const isPost = POST_ACTIONS.indexOf(action) !== -1;
  const url = new URL(API_URL);
  url.searchParams.set('action', action);

  const opts = { method: isPost ? 'POST' : 'GET' };

  if (isPost) {
    opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    opts.body = JSON.stringify({ args: args });
  } else {
    const argNames = GET_ARGS_MAP[action];
    if (argNames && argNames.length > 0) {
      argNames.forEach(function(name, i) {
        if (args[i] !== undefined && args[i] !== null) {
          url.searchParams.set(name, args[i]);
        }
      });
    }
  }

  const response = await fetch(url.toString(), opts);
  if (!response.ok) throw new Error('HTTP ' + response.status + ': ' + response.statusText);
  return await response.json();
}
