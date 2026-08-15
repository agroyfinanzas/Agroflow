/**
 * AgroFlow — PWA Module
 * ──────────────────────────────────────────────────────────────────────
 * Responsabilidades:
 *   1. Registro del Service Worker
 *   2. Guardado/restauración automática en localStorage (Offline Storage)
 *   3. Indicador visual de estado de conexión
 *   4. Banner de actualización disponible
 * ──────────────────────────────────────────────────────────────────────
 */

(function AgroFlowPWA() {
  'use strict';

  // ── Clave de localStorage para el estado completo de la app ──────────
  const STORAGE_KEY     = 'agroflow_state_v2';
  const STORAGE_KEY_VER = 'agroflow_state_version';
  const STATE_VERSION   = '2.1';

  // ── Intervalo de autoguardado (ms) ───────────────────────────────────
  const AUTOSAVE_INTERVAL = 30_000; // cada 30 segundos

  // ════════════════════════════════════════════════════════════════════
  //  1. REGISTRO DEL SERVICE WORKER
  // ════════════════════════════════════════════════════════════════════

  function registerSW() {
    if (!('serviceWorker' in navigator)) {
      console.warn('[PWA] Service Workers no soportados en este navegador.');
      return;
    }

    window.addEventListener('load', async () => {
      try {
        const reg = await navigator.serviceWorker.register('/Agroflow/sw.js', {
          scope: '/Agroflow/',
        });
        console.log('[PWA] Service Worker registrado. Scope:', reg.scope);

        // Detectar actualización disponible
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              showUpdateBanner(newWorker);
            }
          });
        });

        // Si ya hay un SW esperando al cargar la página
        if (reg.waiting) {
          showUpdateBanner(reg.waiting);
        }

      } catch (err) {
        console.error('[PWA] Error al registrar el Service Worker:', err);
      }
    });

    // Recargar cuando el nuevo SW tome el control
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }


  // ════════════════════════════════════════════════════════════════════
  //  2. OFFLINE STORAGE — guardado y restauración
  // ════════════════════════════════════════════════════════════════════

  /**
   * Captura el estado global completo de AgroFlow
   * Lee las variables globales que ya existen en window (definidas en el JS principal)
   */
  function captureState() {
    try {
      // Variables globales que AgroFlow define en su script principal
      return {
        version:         STATE_VERSION,
        timestamp:       new Date().toISOString(),
        // ── Estado del campo actual
        tipoExplotacion: window.tipoExplotacion ?? null,
        horizonte:       window.horizonte       ?? null,
        escenario:       window.escenario       ?? null,
        campoActivo:     window.campoActivo     ?? null,
        contadorCampos:  window.contadorCampos  ?? null,
        contadorLotes:   window.contadorLotes   ?? null,
        // ── Colecciones
        campos:          window.campos          ?? [],
        lotes:           window.lotes           ?? [],
        // ── Silobolsas y ganadería (módulos adicionales)
        silobolsas:      window.silobolsas      ?? [],
        ganaderia:       window.ganaderia       ?? [],
        // ── Inputs del formulario actual (DOM snapshot)
        formSnapshot:    captureFormSnapshot(),
      };
    } catch (err) {
      console.warn('[PWA] Error al capturar estado:', err);
      return null;
    }
  }

  /**
   * Toma un snapshot de todos los inputs/selects/textareas del formulario activo
   */
  function captureFormSnapshot() {
    const snapshot = {};
    const inputs = document.querySelectorAll(
      'input[id], select[id], textarea[id]'
    );
    inputs.forEach((el) => {
      if (el.type === 'checkbox' || el.type === 'radio') {
        snapshot[el.id] = el.checked;
      } else {
        snapshot[el.id] = el.value;
      }
    });
    return snapshot;
  }

  /**
   * Guarda el estado en localStorage
   */
  function saveState() {
    const state = captureState();
    if (!state) return false;

    try {
      const serialized = JSON.stringify(state);
      localStorage.setItem(STORAGE_KEY,     serialized);
      localStorage.setItem(STORAGE_KEY_VER, STATE_VERSION);
      flashSaveIndicator();
      return true;
    } catch (err) {
      // QuotaExceededError → limpiar datos viejos e intentar de nuevo
      if (err.name === 'QuotaExceededError') {
        console.warn('[PWA] localStorage lleno. Limpiando datos obsoletos...');
        pruneStorage();
        try {
          localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
          return true;
        } catch { return false; }
      }
      console.error('[PWA] Error al guardar estado:', err);
      return false;
    }
  }

  /**
   * Restaura el estado desde localStorage al iniciar la app
   * Se llama DESPUÉS de que el JS principal inicializó window.campos etc.
   */
  function restoreState() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      console.log('[PWA] Sin estado guardado — iniciando limpio.');
      return false;
    }

    let state;
    try {
      state = JSON.parse(raw);
    } catch {
      console.warn('[PWA] Estado corrupto — descartando.');
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }

    // Verificar versión — si es muy vieja, descartar
    if (state.version !== STATE_VERSION) {
      console.warn(`[PWA] Versión de estado (${state.version}) desactualizada — descartando.`);
      localStorage.removeItem(STORAGE_KEY);
      return false;
    }

    try {
      // ── Restaurar variables globales
      if (state.tipoExplotacion !== null) window.tipoExplotacion = state.tipoExplotacion;
      if (state.horizonte       !== null) window.horizonte       = state.horizonte;
      if (state.escenario       !== null) window.escenario       = state.escenario;
      if (state.campoActivo     !== null) window.campoActivo     = state.campoActivo;
      if (state.contadorCampos  !== null) window.contadorCampos  = state.contadorCampos;
      if (state.contadorLotes   !== null) window.contadorLotes   = state.contadorLotes;

      if (Array.isArray(state.campos)    && state.campos.length)    window.campos    = state.campos;
      if (Array.isArray(state.lotes)     && state.lotes.length)     window.lotes     = state.lotes;
      if (Array.isArray(state.silobolsas)&& state.silobolsas.length)window.silobolsas= state.silobolsas;
      if (Array.isArray(state.ganaderia) && state.ganaderia.length) window.ganaderia = state.ganaderia;

      // ── Restaurar formulario luego del render (esperar al DOM)
      if (state.formSnapshot && Object.keys(state.formSnapshot).length) {
        requestAnimationFrame(() => restoreFormSnapshot(state.formSnapshot));
      }

      // ── Re-renderizar la UI con los datos restaurados
      requestAnimationFrame(() => {
        if (typeof window.renderCamposTabs === 'function') window.renderCamposTabs();
        if (typeof window.renderLotes      === 'function' && window.lotes?.length) window.renderLotes();
      });

      const ts = new Date(state.timestamp).toLocaleString('es-AR');
      console.log(`[PWA] ✅ Estado restaurado (guardado: ${ts})`);
      showRestoreToast(ts);
      return true;

    } catch (err) {
      console.error('[PWA] Error al restaurar estado:', err);
      return false;
    }
  }

  /**
   * Aplica el snapshot del formulario al DOM
   */
  function restoreFormSnapshot(snapshot) {
    Object.entries(snapshot).forEach(([id, value]) => {
      const el = document.getElementById(id);
      if (!el) return;
      if (el.type === 'checkbox' || el.type === 'radio') {
        el.checked = Boolean(value);
      } else {
        el.value = value ?? '';
      }
      // Disparar evento change/input para que la app recalcule
      el.dispatchEvent(new Event('input',  { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  /**
   * Limpiar entradas antiguas cuando el storage se llena
   */
  function pruneStorage() {
    const keysToKeep = [STORAGE_KEY, STORAGE_KEY_VER];
    Object.keys(localStorage).forEach((key) => {
      if (!keysToKeep.includes(key) && key.startsWith('agroflow_')) {
        localStorage.removeItem(key);
      }
    });
  }

  /**
   * Exportar estado como JSON descargable (backup manual del usuario)
   */
  window.pwaExportarBackup = function () {
    const state = captureState();
    if (!state) { alert('No hay datos para exportar.'); return; }
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `agroflow_backup_${new Date().toISOString().slice(0,10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  /**
   * Importar backup JSON
   */
  window.pwaImportarBackup = function (file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const state = JSON.parse(e.target.result);
        localStorage.setItem(STORAGE_KEY,     JSON.stringify(state));
        localStorage.setItem(STORAGE_KEY_VER, state.version ?? STATE_VERSION);
        alert('✅ Backup importado. La app se recargará para aplicar los cambios.');
        window.location.reload();
      } catch {
        alert('❌ Archivo inválido. Asegurate de seleccionar un backup de AgroFlow.');
      }
    };
    reader.readAsText(file);
  };


  // ════════════════════════════════════════════════════════════════════
  //  3. INDICADOR VISUAL DE ESTADO DE CONEXIÓN
  // ════════════════════════════════════════════════════════════════════

  function createConnectionBadge() {
    // Evitar duplicados
    if (document.getElementById('pwa-connection-badge')) return;

    const badge = document.createElement('div');
    badge.id    = 'pwa-connection-badge';
    badge.innerHTML = `
      <span id="pwa-conn-dot"></span>
      <span id="pwa-conn-label"></span>
    `;

    // Intentar insertarlo en el header
    const header = document.querySelector('.header-right, header .right, #header-right');
    if (header) {
      header.prepend(badge);
    } else {
      // Fallback: esquina superior derecha
      badge.style.cssText = 'position:fixed;top:10px;right:10px;z-index:9999;';
      document.body.appendChild(badge);
    }

    injectConnectionStyles();
    updateConnectionBadge(navigator.onLine);
  }

  function updateConnectionBadge(isOnline) {
    const dot   = document.getElementById('pwa-conn-dot');
    const label = document.getElementById('pwa-conn-label');
    const badge = document.getElementById('pwa-connection-badge');
    if (!dot || !label || !badge) return;

    if (isOnline) {
      dot.className   = 'pwa-dot pwa-dot-online';
      label.textContent = 'En línea';
      badge.className = 'pwa-conn-badge pwa-badge-online';
      badge.title     = 'Conectado a internet';
    } else {
      dot.className   = 'pwa-dot pwa-dot-offline';
      label.textContent = 'Modo Campo';
      badge.className = 'pwa-conn-badge pwa-badge-offline';
      badge.title     = 'Sin conexión — trabajando offline';
    }
  }

  function injectConnectionStyles() {
    if (document.getElementById('pwa-styles')) return;
    const style = document.createElement('style');
    style.id    = 'pwa-styles';
    style.textContent = `
      /* ── Indicador de conexión ── */
      .pwa-conn-badge {
        display: flex;
        align-items: center;
        gap: 5px;
        padding: 4px 10px;
        border-radius: 20px;
        font-family: 'DM Mono', monospace;
        font-size: 10px;
        font-weight: 500;
        letter-spacing: 0.4px;
        cursor: default;
        transition: all 0.4s ease;
        border: 1px solid transparent;
        white-space: nowrap;
        flex-shrink: 0;
      }
      .pwa-badge-online {
        background: rgba(74,222,128,0.10);
        border-color: rgba(74,222,128,0.30);
        color: #4ade80;
      }
      .pwa-badge-offline {
        background: rgba(251,146,60,0.13);
        border-color: rgba(251,146,60,0.40);
        color: #fb923c;
        animation: pwa-pulse-offline 2.5s ease-in-out infinite;
      }
      .pwa-dot {
        width: 7px;
        height: 7px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .pwa-dot-online {
        background: #4ade80;
        box-shadow: 0 0 0 0 rgba(74,222,128,0.5);
        animation: pwa-ping-online 2s ease-in-out infinite;
      }
      .pwa-dot-offline {
        background: #fb923c;
        box-shadow: 0 0 6px rgba(251,146,60,0.6);
      }
      @keyframes pwa-ping-online {
        0%,100% { box-shadow: 0 0 0 0 rgba(74,222,128,0.5); }
        50%      { box-shadow: 0 0 0 4px rgba(74,222,128,0); }
      }
      @keyframes pwa-pulse-offline {
        0%,100% { opacity: 1; }
        50%      { opacity: 0.65; }
      }

      /* ── Toast de restauración ── */
      #pwa-restore-toast {
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(80px);
        background: #1a2b1c;
        border: 1px solid rgba(74,222,128,0.35);
        border-left: 3px solid #4ade80;
        color: #e8f5e9;
        padding: 10px 18px;
        border-radius: 8px;
        font-family: 'DM Mono', monospace;
        font-size: 11px;
        z-index: 9998;
        display: flex;
        align-items: center;
        gap: 10px;
        box-shadow: 0 6px 24px rgba(0,0,0,0.4);
        transition: transform 0.4s cubic-bezier(.4,0,.2,1), opacity 0.4s;
        opacity: 0;
        pointer-events: none;
        white-space: nowrap;
      }
      #pwa-restore-toast.show {
        transform: translateX(-50%) translateY(0);
        opacity: 1;
      }

      /* ── Indicador de autoguardado ── */
      #pwa-save-dot {
        position: fixed;
        bottom: 8px;
        right: 12px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: transparent;
        z-index: 9990;
        transition: background 0.3s, box-shadow 0.3s;
        pointer-events: none;
      }
      #pwa-save-dot.saving {
        background: #fbbf24;
        box-shadow: 0 0 6px rgba(251,191,36,0.7);
      }
      #pwa-save-dot.saved {
        background: #4ade80;
        box-shadow: 0 0 6px rgba(74,222,128,0.5);
      }

      /* ── Banner de actualización ── */
      #pwa-update-banner {
        position: fixed;
        top: 0; left: 0; right: 0;
        background: linear-gradient(135deg, #1a3a5c, #0d2238);
        border-bottom: 2px solid #fbbf24;
        color: #e8f5e9;
        padding: 10px 20px;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 12px;
        z-index: 10000;
        font-family: 'DM Mono', monospace;
        font-size: 12px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.4);
        transform: translateY(-100%);
        transition: transform 0.35s ease;
      }
      #pwa-update-banner.show { transform: translateY(0); }
      #pwa-update-banner .pwa-update-actions { display:flex; gap:8px; }
      .pwa-btn-update {
        background: #fbbf24; color: #0d1a0f; border: none;
        padding: 6px 14px; border-radius: 5px;
        font-family: 'DM Mono', monospace; font-size: 11px;
        font-weight: 700; cursor: pointer; transition: background 0.2s;
      }
      .pwa-btn-update:hover { background: #f59e0b; }
      .pwa-btn-dismiss {
        background: transparent; color: #9cb8a0; border: 1px solid #2a4030;
        padding: 6px 12px; border-radius: 5px;
        font-family: 'DM Mono', monospace; font-size: 11px;
        cursor: pointer; transition: all 0.2s;
      }
      .pwa-btn-dismiss:hover { border-color: #9cb8a0; color: #e8f5e9; }
    `;
    document.head.appendChild(style);
  }


  // ════════════════════════════════════════════════════════════════════
  //  4. TOASTS Y FEEDBACK VISUAL
  // ════════════════════════════════════════════════════════════════════

  function showRestoreToast(timestamp) {
    let toast = document.getElementById('pwa-restore-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'pwa-restore-toast';
      document.body.appendChild(toast);
    }
    toast.innerHTML = `✅ &nbsp;Datos restaurados desde <strong>${timestamp}</strong>`;
    requestAnimationFrame(() => {
      toast.classList.add('show');
      setTimeout(() => toast.classList.remove('show'), 4000);
    });
  }

  function flashSaveIndicator() {
    let dot = document.getElementById('pwa-save-dot');
    if (!dot) {
      dot = document.createElement('div');
      dot.id = 'pwa-save-dot';
      document.body.appendChild(dot);
    }
    dot.className = 'saving';
    setTimeout(() => { dot.className = 'saved'; }, 500);
    setTimeout(() => { dot.className = ''; },      2500);
  }

  function showUpdateBanner(newWorker) {
    let banner = document.getElementById('pwa-update-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'pwa-update-banner';
      banner.innerHTML = `
        <span>🚀 &nbsp;Nueva versión de AgroFlow disponible</span>
        <div class="pwa-update-actions">
          <button class="pwa-btn-update" id="pwa-btn-actualizar">Actualizar ahora</button>
          <button class="pwa-btn-dismiss" id="pwa-btn-cerrar-banner">Ahora no</button>
        </div>
      `;
      document.body.appendChild(banner);
      document.getElementById('pwa-btn-actualizar').addEventListener('click', () => {
        newWorker.postMessage({ type: 'SKIP_WAITING' });
      });
      document.getElementById('pwa-btn-cerrar-banner').addEventListener('click', () => {
        banner.classList.remove('show');
      });
    }
    requestAnimationFrame(() => banner.classList.add('show'));
  }


  // ════════════════════════════════════════════════════════════════════
  //  5. EVENTS — online/offline, guardado automático
  // ════════════════════════════════════════════════════════════════════

  function setupEventListeners() {
    // Conexión
    window.addEventListener('online',  () => {
      updateConnectionBadge(true);
      console.log('[PWA] 🌐 Conexión restaurada');
    });
    window.addEventListener('offline', () => {
      updateConnectionBadge(false);
      console.log('[PWA] 📡 Sin conexión — Modo Campo activo');
      saveState(); // Guardar inmediatamente al perder conexión
    });

    // Guardar al salir / cerrar pestaña
    window.addEventListener('beforeunload', () => saveState());
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) saveState();
    });

    // Guardar cada vez que el usuario interactúa con inputs
    let inputTimer;
    document.addEventListener('input',  () => {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(saveState, 3000); // Debounce 3s
    });
    document.addEventListener('change', () => {
      clearTimeout(inputTimer);
      inputTimer = setTimeout(saveState, 1500);
    });

    // Autoguardado periódico
    setInterval(saveState, AUTOSAVE_INTERVAL);
  }


  // ════════════════════════════════════════════════════════════════════
  //  INIT — punto de entrada
  // ════════════════════════════════════════════════════════════════════

  function init() {
    // 1. Registrar SW
    registerSW();

    // 2. Crear badge de conexión (tan pronto el DOM esté listo)
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', createConnectionBadge);
    } else {
      createConnectionBadge();
    }

    // 3. Restaurar estado guardado (después de que el JS principal inicializó todo)
    //    Usar un pequeño delay para que window.onload del main script se ejecute primero
    window.addEventListener('load', () => {
      setTimeout(() => {
        restoreState();
        setupEventListeners();
      }, 150);
    });
  }

  // Exponer API pública para uso desde la app principal
  window.AgroFlowPWA = {
    save:    saveState,
    restore: restoreState,
    export:  window.pwaExportarBackup,
    import:  window.pwaImportarBackup,
  };

  init();

})();
