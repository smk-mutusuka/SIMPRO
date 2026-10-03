/**
 * =============================================================
 * js/api.js — Jembatan Frontend ↔ Apps Script Backend
 * =============================================================
 *
 * Semua komunikasi ke backend lewat fungsi apiCall() di file ini.
 *
 * Cara pakai dari app.js:
 *   const res = await apiCall('getGuruList');
 *   const res = await apiCall('saveGuruData', formData);
 *   const res = await apiCall('serverLogin', username, password);
 *
 * Response selalu berupa object:
 *   { status: 'success' | 'error', message: '...', data: ... }
 *
 * Catatan CORS:
 *   - GET  : aman, tidak ada preflight
 *   - POST : WAJIB pakai Content-Type: text/plain
 *            (bukan application/json, agar tidak kena preflight OPTIONS
 *             yang tidak didukung Apps Script)
 */

// =============================================================
// ⚠️ GANTI URL DI BAWAH dengan URL Web App Apps Script Anda
// =============================================================
const API_URL = 'const API_URL = 'https://script.google.com/macros/s/AKfycbzkVsmVwLGKBMMYlEN7KBf38cPsYxcIDV1PG5BgZPWnGgiigEkR4kUa5UOoMNYaiaN7/exec';';

// =============================================================
// DAFTAR ACTION yang pakai method POST
// (sisanya otomatis dianggap GET)
// =============================================================
const POST_ACTIONS = [
  'serverLogin',
  'changePassword',
  'saveGuruData',
  'saveJadwal',
  'hapusDataJadwal',
  'saveObservasi',
  'hapusDataObservasi',
  'saveInstrumenData',
  'hapusDataInstrumen',
  'saveTindakLanjut',
  'uploadFileToDrive'
];

// =============================================================
// DAFTAR ACTION GET yang butuh argumen (dikirim via query string)
// Format: { action: ['namaArg1', 'namaArg2', ...] }
// =============================================================
const GET_ARGS_MAP = {
  'getDraftObservasi':    ['jadwalID'],
  'getDetailCetakLengkap':['obsID']
};

// =============================================================
// FUNGSI UTAMA
// =============================================================
async function apiCall(action, ...args) {
  const isPost = POST_ACTIONS.includes(action);
  const url = new URL(API_URL);
  url.searchParams.set('action', action);

  const opts = { method: isPost ? 'POST' : 'GET' };

  if (isPost) {
    opts.headers = { 'Content-Type': 'text/plain;charset=utf-8' };
    opts.body = JSON.stringify({ args: args });
  } else {
    // GET dengan argumen → masukkan ke query string
    const argNames = GET_ARGS_MAP[action];
    if (argNames && argNames.length > 0) {
      argNames.forEach((name, i) => {
        if (args[i] !== undefined && args[i] !== null) {
          url.searchParams.set(name, args[i]);
        }
      });
    }
  }

  const response = await fetch(url.toString(), opts);

  if (!response.ok) {
    throw new Error('HTTP ' + response.status + ': ' + response.statusText);
  }

  const data = await response.json();
  return data;
}

// =============================================================
// VERSION: GET & POST eksplisit (kalau sewaktu-waktu perlu)
// =============================================================
async function apiGet(action, params = {}) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null) url.searchParams.set(k, v);
  });
  const res = await fetch(url.toString());
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}

async function apiPost(action, ...args) {
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  const res = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ args: args })
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  return await res.json();
}
