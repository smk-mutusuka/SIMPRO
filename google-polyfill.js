/**
 * =============================================================
 * google-polyfill.js
 * =============================================================
 * Menyediakan:
 *   1. window.google.script.run  → proxy ke apiCall (fetch ke Apps Script)
 *   2. Auto-loader untuk <div data-include="X.html"></div>
 *   3. Auto-inject CSS dari file CSS.css
 *
 * Load URUTAN: api.js  →  google-polyfill.js  →  JS.js
 * =============================================================
 */
(function() {
  'use strict';

  // ===========================================================
  // 1. POLYFILL google.script.run
  // ===========================================================
  function createGoogleScriptRun() {
    let successHandler = null;
    let failureHandler = null;

    const proxy = new Proxy({}, {
      get: function(target, prop) {
        if (prop === 'withSuccessHandler') {
          return function(fn) { successHandler = fn; return proxy; };
        }
        if (prop === 'withFailureHandler') {
          return function(fn) { failureHandler = fn; return proxy; };
        }
        // Selain dua di atas → dianggap nama action
        return function() {
          const args = Array.prototype.slice.call(arguments);
          const s = successHandler;
          const f = failureHandler;
          successHandler = null;
          failureHandler = null;

          (async function() {
            try {
              const res = await apiCall(prop, ...args);
              // Tiru behaviour Apps Script: success handler menerima STRING JSON
              if (s) s(JSON.stringify(res));
            } catch (err) {
              if (f) f(err);
              else console.error('[google.script.run.' + prop + '] gagal:', err);
            }
          })();
        };
      }
    });

    return proxy;
  }

  if (!window.google) window.google = {};
  if (!window.google.script) window.google.script = {};
  window.google.script.run = createGoogleScriptRun();

  // ===========================================================
  // 2. AUTO-INCLUDE PARTIAL HTML
  // ===========================================================
  async function loadIncludes() {
    const nodes = document.querySelectorAll('[data-include]');
    for (const el of nodes) {
      const url = el.getAttribute('data-include');
      try {
        const res = await fetch(url, { cache: 'no-cache' });
        if (!res.ok) throw new Error('HTTP ' + res.status);
        el.innerHTML = await res.text();
      } catch (e) {
        console.error('[include] Gagal load ' + url + ':', e);
        el.innerHTML = '<!-- gagal load: ' + url + ' -->';
      }
    }
    // ===== PERUBAHAN: tandai bahwa includes sudah selesai =====
    window.__includesLoaded = true;
    document.dispatchEvent(new Event('includes-loaded'));
  }

  // ===========================================================
  // 3. AUTO-INJECT CSS dari CSS.css
  // ===========================================================
  async function loadCSS() {
    try {
      const res = await fetch('CSS.css', { cache: 'no-cache' });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      let css = await res.text();
      // Hapus tag <style>...</style> kalau ada
      css = css.replace(/<\/?style[^>]*>/gi, '');
      const style = document.createElement('style');
      style.textContent = css;
      document.head.appendChild(style);
    } catch (e) {
      console.error('[css] Gagal load CSS.css:', e);
    }
  }

  // ===========================================================
  // RUN
  // ===========================================================
  function init() {
    loadCSS().then(function() { return loadIncludes(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
