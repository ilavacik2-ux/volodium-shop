/* ==========================================================================
   VOLODIUM PARFUM — Atelier Studio Admin Controller
   Zero hardcoded secrets/passwords. Strict Bearer + HttpOnly Cookie Auth.
   ========================================================================== */

(() => {
  'use strict';

  // --- Immediate Stealth Token Scrubbing from URL Bar & Browser History ---
  const urlParams = new URLSearchParams(window.location.search);
  let inMemoryGateToken = (urlParams.get('token') || '').trim();
  if (urlParams.has('token')) {
    const cleanUrl = window.location.pathname + window.location.hash;
    window.history.replaceState({}, document.title, cleanUrl);
  }

  // --- Cross-tab Live Storefront Sync Channel ---
  const syncChannel = typeof BroadcastChannel !== 'undefined'
    ? new BroadcastChannel('volodium_sync')
    : null;

  function notifyStorefrontSync(type = 'refresh') {
    try {
      if (syncChannel) syncChannel.postMessage({ type, ts: Date.now() });
      localStorage.setItem('volodium_sync_ts', String(Date.now()));
    } catch (_) {
      // Ignore storage restrictions
    }
  }

  // --- Global Application State ---
  const state = {
    sessionToken: sessionStorage.getItem('vp_session_token') || '',
    operatorRole: 'owner',
    operatorName: '',
    perfumes: [],
    aromaboxes: [],
    secretBoxes: [],
    siteContent: {},
    priceSnapshots: [],
    auditLogs: [],
    catalogPage: 1,
    pageSize: 24,
    activeTab: 'overview',
    theme: localStorage.getItem('vp_admin_theme') || 'parchment',
  };

  const TAB_TITLES = {
    overview: ['Обзор ателье', 'Сводка каталога, сезонности и быстрое управление ценами'],
    perfumes: ['Каталог духов', 'Редактирование ароматов, фотографий, сезонности и цен по объёмам'],
    pricing: ['Переоценка +% / -%', 'Массовое изменение цен в процентах с предпросмотром и откатом'],
    boxes: ['Аромабоксы & Secret Box', 'Управление тематическими наборами и 3 уровнями Secret Box'],
    storefront: ['Главный экран & Фото', 'Редактор текста, фото Владимира, фона и консультаций'],
    commerce: ['Промокоды & Доставка', 'Верхняя акционная полоса, промокоды, пороги и контакты'],
    audit: ['Журнал действий', 'Локальный аудит входов и изменений без Telegram-уведомлений'],
    security: ['Токены & Бэкап', 'Два секретных токена-шлюза, пароль, JSON-бэкапы и perfumes.js'],
  };

  // --- DOM Helpers ---
  const $ = (id) => document.getElementById(id);
  const qs = (sel, root = document) => root.querySelector(sel);
  const qsa = (sel, root = document) => Array.from(root.querySelectorAll(sel));

  function esc(val) {
    return String(val == null ? '' : val)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function resolveMediaSrc(src) {
    const raw = String(src || '').trim();
    if (!raw) return '/assets/images/noroot.png';
    if (raw.startsWith('//')) return 'https:' + raw;
    if (/^https?:\/\//i.test(raw) || raw.startsWith('data:') || raw.startsWith('blob:')) return raw;
    if (raw.startsWith('/')) return raw;
    return '/' + raw.replace(/^\/+/, '');
  }

  function formatRub(val) {
    const n = Number(val) || 0;
    return n.toLocaleString('ru-RU') + ' ₽';
  }

  function showToast(message, type = 'ok') {
    const root = $('vpToastRoot');
    if (!root) return;
    const el = document.createElement('div');
    el.className = `vp-toast ${type === 'err' ? 'err' : 'ok'}`;
    el.textContent = message;
    root.appendChild(el);
    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.25s ease';
      setTimeout(() => el.remove(), 260);
    }, 3400);
  }

  // --- Network API Wrapper ---
  async function apiFetch(url, options = {}) {
    const headers = new Headers(options.headers || {});
    if (state.sessionToken) {
      headers.set('Authorization', `Bearer ${state.sessionToken}`);
    }
    if (inMemoryGateToken) {
      headers.set('X-Gateway-Token', inMemoryGateToken);
    }
    if (options.body && !(options.body instanceof FormData) && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }

    const res = await fetch(url, {
      ...options,
      headers,
      credentials: 'same-origin',
    });

    const contentType = res.headers.get('content-type') || '';
    const data = contentType.includes('application/json') ? await res.json().catch(() => ({})) : await res.text();

    if (res.status === 401 && !url.includes('/api/auth/login') && !url.includes('/api/auth/verify')) {
      handleUnauthorized();
      throw new Error((data && data.detail) || 'Сессия истекла, войдите повторно');
    }
    if (!res.ok) {
      const msg = (data && typeof data === 'object' && (data.detail || data.message)) || `Ошибка сервера (${res.status})`;
      throw new Error(msg);
    }
    return data;
  }

  function handleUnauthorized() {
    state.sessionToken = '';
    sessionStorage.removeItem('vp_session_token');
    $('vpAppShell').hidden = true;
    $('vpAuthScreen').hidden = false;
    $('vpMasterPassword').value = '';
    checkGateBadge();
  }

  // --- Theme ---
  function applyTheme(theme) {
    state.theme = theme === 'noir' ? 'noir' : 'parchment';
    if (state.theme === 'noir') {
      document.documentElement.setAttribute('data-theme', 'noir');
      $('vpThemeIcon').textContent = '☀️';
    } else {
      document.documentElement.removeAttribute('data-theme');
      $('vpThemeIcon').textContent = '🌙';
    }
    localStorage.setItem('vp_admin_theme', state.theme);
  }

  // ==========================================================================
  // AUTHENTICATION BOOT & GATE CHECK
  // ==========================================================================
  async function checkGateBadge() {
    try {
      const data = await apiFetch('/api/auth/gate-status');
      const badge = $('vpAuthGateBadge');
      if (badge && data.gateActive) {
        badge.textContent = `Шлюз подтверждён · ${data.operatorLabel}`;
      }
    } catch (_) {
      const badge = $('vpAuthGateBadge');
      if (badge) badge.textContent = 'Закрытый вход для команды бутика';
    }
  }

  async function bootAuth() {
    applyTheme(state.theme);

    // Check existing valid session cookie or sessionStorage token first
    try {
      const v = await apiFetch('/api/auth/verify');
      if (v && v.authenticated) {
        state.operatorRole = v.operatorRole || 'owner';
        state.operatorName = v.operatorName || 'Оператор';
        $('vpAuthScreen').hidden = true;
        $('vpAppShell').hidden = false;
        await loadStudioOverview();
        return;
      }
    } catch (_) {
      // Fall through to password screen
    }

    $('vpAuthScreen').hidden = false;
    $('vpAppShell').hidden = true;
    await checkGateBadge();
  }

  function bindAuthEvents() {
    const togglePassBtn = $('vpTogglePassBtn');
    const passInput = $('vpMasterPassword');
    if (togglePassBtn && passInput) {
      togglePassBtn.addEventListener('click', () => {
        passInput.type = passInput.type === 'password' ? 'text' : 'password';
      });
    }

    $('vpAuthForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const errEl = $('vpAuthError');
      const submitBtn = $('vpAuthSubmitBtn');
      errEl.hidden = true;
      submitBtn.disabled = true;

      try {
        const res = await apiFetch('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({
            password: passInput.value,
            honeypot: ($('vpTrapInput') ? $('vpTrapInput').value : ''),
          }),
        });
        state.sessionToken = res.sessionToken || '';
        if (state.sessionToken) {
          sessionStorage.setItem('vp_session_token', state.sessionToken);
        }
        state.operatorRole = res.operatorRole || 'owner';
        state.operatorName = res.operatorName || 'Оператор';
        passInput.value = '';
        $('vpAuthScreen').hidden = true;
        $('vpAppShell').hidden = false;
        await loadStudioOverview();
        showToast(`Добро пожаловать, ${state.operatorName}`, 'ok');
      } catch (err) {
        errEl.textContent = err.message || 'Ошибка входа';
        errEl.hidden = false;
      } finally {
        submitBtn.disabled = false;
      }
    });

    $('vpLogoutBtn').addEventListener('click', async () => {
      try {
        await apiFetch('/api/auth/logout', { method: 'POST' });
      } catch (_) {
        // Ignore network errors on logout
      }
      handleUnauthorized();
    });
  }

  // ==========================================================================
  // NAVIGATION, DRAWER & MODALS
  // ==========================================================================
  function switchTab(tabId) {
    state.activeTab = tabId;
    qsa('.vp-nav-item').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    qsa('.vp-tab-panel').forEach((panel) => {
      panel.classList.toggle('active', panel.id === `tab-${tabId}`);
    });
    const meta = TAB_TITLES[tabId] || ['Студия VOLODIUM', ''];
    $('vpPageTitle').textContent = meta[0];
    $('vpPageSubtitle').textContent = meta[1];

    // Close mobile sidebar
    $('vpSidebar').classList.remove('open');
    $('vpSidebarBackdrop').classList.remove('open');

    if (tabId === 'security') {
      loadSecurityTab();
    } else if (tabId === 'audit') {
      loadAuditTable();
    }
  }

  function openModal(backdropId) {
    const el = $(backdropId);
    if (!el) return;
    el.hidden = false;
    document.body.classList.add('vp-modal-open');
  }

  function closeModal(backdropId) {
    const el = $(backdropId);
    if (!el) return;
    el.hidden = true;
    if (qsa('.vp-modal-backdrop:not([hidden])').length === 0) {
      document.body.classList.remove('vp-modal-open');
    }
  }

  function bindNavigationEvents() {
    qsa('.vp-nav-item').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.tab));
    });
    qsa('[data-goto-tab]').forEach((btn) => {
      btn.addEventListener('click', () => switchTab(btn.dataset.gotoTab));
    });

    // Mobile Sidebar Drawer
    $('vpSidebarOpenBtn').addEventListener('click', () => {
      $('vpSidebar').classList.add('open');
      $('vpSidebarBackdrop').classList.add('open');
    });
    $('vpSidebarClose').addEventListener('click', () => {
      $('vpSidebar').classList.remove('open');
      $('vpSidebarBackdrop').classList.remove('open');
    });
    $('vpSidebarBackdrop').addEventListener('click', () => {
      $('vpSidebar').classList.remove('open');
      $('vpSidebarBackdrop').classList.remove('open');
    });

    // Theme toggle
    $('vpThemeToggleBtn').addEventListener('click', () => {
      applyTheme(state.theme === 'noir' ? 'parchment' : 'noir');
    });

    // Audit Bell Popover
    const bellBtn = $('vpAuditBellBtn');
    const pop = $('vpAuditPopover');
    bellBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      pop.hidden = !pop.hidden;
    });
    document.addEventListener('click', (e) => {
      if (!pop.hidden && !pop.contains(e.target) && !bellBtn.contains(e.target)) {
        pop.hidden = true;
      }
    });
    $('vpOpenFullAuditBtn').addEventListener('click', () => {
      pop.hidden = true;
      switchTab('audit');
    });

    // Modals close buttons & backdrop clicks & Escape key
    qsa('[data-close-modal]').forEach((btn) => {
      btn.addEventListener('click', () => closeModal(btn.dataset.closeModal));
    });
    qsa('.vp-modal-backdrop').forEach((bd) => {
      bd.addEventListener('click', (e) => {
        if (e.target === bd) closeModal(bd.id);
      });
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        qsa('.vp-modal-backdrop:not([hidden])').forEach((bd) => closeModal(bd.id));
      }
    });
  }

  // ==========================================================================
  // DATA LOAD & RENDER ALL SECTIONS
  // ==========================================================================
  async function loadStudioOverview() {
    const data = await apiFetch('/api/admin/overview');
    state.operatorRole = data.operatorRole || state.operatorRole;
    state.operatorName = data.operatorName || state.operatorName;
    state.perfumes = Array.isArray(data.perfumes) ? data.perfumes : [];
    state.aromaboxes = Array.isArray(data.aromaboxes) ? data.aromaboxes : [];
    state.secretBoxes = Array.isArray(data.secretBoxes) ? data.secretBoxes : [];
    state.siteContent = data.siteContent || {};
    state.priceSnapshots = Array.isArray(data.priceSnapshots) ? data.priceSnapshots : [];
    state.auditLogs = Array.isArray(data.auditLogs) ? data.auditLogs : [];

    $('vpOperatorRoleLabel').textContent = state.operatorRole === 'owner' ? 'Владелец бутика' : 'Команда / Помощница';
    $('vpOperatorNameLabel').textContent = state.operatorName;
    $('navBadgePerfumes').textContent = String(state.perfumes.length);
    $('navBadgeBoxes').textContent = String(state.aromaboxes.length + state.secretBoxes.length);

    renderOverview();
    renderPerfumesTable();
    renderSnapshots();
    renderBoxesTab();
    populateStorefrontForm();
    populateCommerceForm();
    renderAuditPopover();
    if (state.activeTab === 'audit') renderAuditTable(state.auditLogs);
    if (state.activeTab === 'security') loadSecurityTab();
  }

  // ==========================================================================
  // TAB 1: OVERVIEW
  // ==========================================================================
  function renderOverview() {
    const p = state.perfumes;
    const total = p.length;
    const women = p.filter((x) => x.gender === 'women').length;
    const men = p.filter((x) => x.gender === 'men').length;
    const unisex = p.filter((x) => x.gender === 'unisex').length;

    $('kpiPerfumesTotal').textContent = String(total);
    $('kpiPerfumesGender').textContent = `Жен: ${women} · Муж: ${men} · Унисекс: ${unisex}`;
    $('kpiBoxesTotal').textContent = `${state.aromaboxes.length} + ${state.secretBoxes.length}`;

    const prices5ml = p
      .map((x) => Number((x.prices && (x.prices['5ml'] || x.prices['3ml'] || Object.values(x.prices)[0])) || 0))
      .filter((v) => v > 0);
    if (prices5ml.length) {
      const avg = Math.round(prices5ml.reduce((a, b) => a + b, 0) / prices5ml.length);
      const minP = Math.min(...prices5ml);
      const maxP = Math.max(...prices5ml);
      $('kpiAvgPrice').textContent = formatRub(avg);
      $('kpiPriceRange').textContent = `От ${formatRub(minP)} до ${formatRub(maxP)}`;
    } else {
      $('kpiAvgPrice').textContent = '0 ₽';
      $('kpiPriceRange').textContent = '—';
    }

    const truncatedCount = p.filter((x) => /(\.\.\.|…)\s*$/.test(String(x.description || '').trim())).length;
    const cdnCount = p.filter((x) => /^https?:\/\//i.test(String(x.image || ''))).length;
    $('kpiQualityCount').textContent = String(truncatedCount);
    $('kpiQualityHint').textContent = `Обрезанных описаний: ${truncatedCount} · Tilda CDN фото: ${cdnCount}`;

    // Seasonality breakdown pills
    const seasonMap = new Map();
    p.forEach((x) => {
      const s = x.season || (x.metrics && x.metrics.season) || 'Круглый год';
      const ico = x.seasonIcon || (x.metrics && x.metrics.seasonIcon) || '🌸';
      if (!seasonMap.has(s)) seasonMap.set(s, { season: s, icon: ico, count: 0 });
      seasonMap.get(s).count += 1;
    });
    const sbWrap = $('vpSeasonBreakdown');
    sbWrap.innerHTML = '';
    Array.from(seasonMap.values())
      .sort((a, b) => b.count - a.count)
      .forEach((entry) => {
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'vp-sb-pill';
        btn.innerHTML = `<span>${esc(entry.icon)}</span> <span>${esc(entry.season)}</span> <strong>${entry.count}</strong>`;
        btn.addEventListener('click', () => {
          $('vpFilterSeason').value = entry.season;
          state.catalogPage = 1;
          switchTab('perfumes');
          renderPerfumesTable();
        });
        sbWrap.appendChild(btn);
      });

    // Recent audit list
    const recWrap = $('vpRecentAuditList');
    const rec = state.auditLogs.slice(0, 8);
    if (!rec.length) {
      recWrap.innerHTML = '<p class="vp-muted-note">Пока нет записей в журнале.</p>';
    } else {
      recWrap.innerHTML = rec.map((row) => `
        <div class="vp-audit-mini-row">
          <div class="vp-audit-mini-top">
            <span><strong>${esc(row.operator_name)}</strong> · ${esc(row.action)}</span>
            <span>${esc(row.created_at)}</span>
          </div>
          <div>${esc(row.summary)}</div>
        </div>
      `).join('');
    }
  }

  function renderAuditPopover() {
    const list = $('vpAuditPopoverList');
    const logs = state.auditLogs.slice(0, 6);
    $('vpBellDot').hidden = logs.length === 0;
    if (!logs.length) {
      list.innerHTML = '<p class="vp-muted-note">Нет недавних событий.</p>';
      return;
    }
    list.innerHTML = logs.map((r) => `
      <div class="vp-audit-mini-row">
        <div class="vp-audit-mini-top">
          <span>${esc(r.operator_name)}</span>
          <span>${esc(r.created_at)}</span>
        </div>
        <div>${esc(r.summary)}</div>
      </div>
    `).join('');
  }

  function bindOverviewQuickActions() {
    qsa('[data-quick-pct]').forEach((btn) => {
      btn.addEventListener('click', async () => {
        const pct = Number(btn.dataset.quickPct);
        switchTab('pricing');
        $('bulkScope').value = 'all';
        $('bulkPercentInput').value = String(pct);
        await runBulkPricePreview();
      });
    });
  }

  // ==========================================================================
  // TAB 2: PERFUMES CATALOG TABLE & PAGINATION
  // ==========================================================================
  function getFilteredPerfumes() {
    const query = ($('vpCatalogSearch').value || '').trim().toLowerCase();
    const gender = $('vpFilterGender').value;
    const season = $('vpFilterSeason').value;
    const quality = $('vpFilterQuality').value;

    return state.perfumes.filter((item) => {
      if (gender !== 'all' && item.gender !== gender) return false;
      const itemSeason = item.season || (item.metrics && item.metrics.season) || 'Круглый год';
      if (season !== 'all' && itemSeason !== season) return false;

      if (quality === 'truncated' && !/(\.\.\.|…)\s*$/.test(String(item.description || '').trim())) return false;
      if (quality === 'cdn' && !/^https?:\/\//i.test(String(item.image || ''))) return false;
      if (quality === 'local' && /^https?:\/\//i.test(String(item.image || ''))) return false;
      if (quality === 'badged' && !String(item.badge || '').trim()) return false;
      if (quality === 'hidden' && item.isActive !== false) return false;

      if (query) {
        const pyr = item.pyramid ? `${item.pyramid.top || ''} ${item.pyramid.heart || ''} ${item.pyramid.base || ''}` : '';
        const hay = `${item.brand || ''} ${item.name || ''} ${item.description || ''} ${item.notesFamily || ''} ${pyr}`.toLowerCase();
        if (!hay.includes(query)) return false;
      }
      return true;
    });
  }

  function renderPerfumesTable() {
    const filtered = getFilteredPerfumes();
    const totalPages = Math.max(1, Math.ceil(filtered.length / state.pageSize));
    if (state.catalogPage > totalPages) state.catalogPage = totalPages;

    const startIdx = (state.catalogPage - 1) * state.pageSize;
    const slice = filtered.slice(startIdx, startIdx + state.pageSize);

    $('vpCatalogCountLabel').textContent = `Найдено: ${filtered.length} из ${state.perfumes.length} · Страница ${state.catalogPage} из ${totalPages}`;

    const tbody = $('vpPerfumesTbody');
    if (!slice.length) {
      tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:36px;color:var(--text-muted);">По вашему фильтру ароматы не найдены</td></tr>';
    } else {
      tbody.innerHTML = slice.map((item) => {
        const p3 = item.prices && item.prices['3ml'];
        const p5 = item.prices && item.prices['5ml'];
        const p10 = item.prices && item.prices['10ml'];
        const pBottle = item.prices && item.prices.bottle;
        const firstPrice = p3 || p5 || p10 || (item.prices ? Object.values(item.prices)[0] : 0) || 0;
        const seasonText = item.season || (item.metrics && item.metrics.season) || 'Круглый год';
        const seasonIco = item.seasonIcon || (item.metrics && item.metrics.seasonIcon) || '🌸';
        const isTrunc = /(\.\.\.|…)\s*$/.test(String(item.description || '').trim());
        const isCdn = /^https?:\/\//i.test(String(item.image || ''));
        const gLabel = item.gender === 'women' ? 'Женский' : item.gender === 'men' ? 'Мужской' : 'Унисекс';

        return `
          <tr data-pid="${esc(item.id)}">
            <td>
              <img
                class="vp-thumb"
                src="${esc(resolveMediaSrc(item.image))}"
                alt="${esc(item.name)}"
                decoding="async"
                referrerpolicy="no-referrer"
                onerror="this.onerror=null;this.src='/assets/images/noroot.png';"
                style="object-position:${esc(item.objectPosition || 'center center')};"
              >
            </td>
            <td>
              <div class="vp-item-cell">
                <span class="vp-item-brand">${esc(item.brand || 'VOLODIUM')}</span>
                <span class="vp-item-name">${esc(item.name)}</span>
                <div class="vp-item-sub">
                  <span class="vp-tag muted">${gLabel}</span>
                  ${item.badge ? `<span class="vp-tag wine">${esc(item.badge)}</span>` : ''}
                  ${isTrunc ? '<span class="vp-tag warn" title="Описание заканчивается на многоточие">Обрезано ...</span>' : ''}
                  ${isCdn ? '<span class="vp-tag muted" title="Загружается с внешнего CDN">CDN</span>' : '<span class="vp-tag ok">Локальное фото</span>'}
                </div>
              </div>
            </td>
            <td>
              <button type="button" class="vp-season-pill-btn" data-edit-pid="${esc(item.id)}" data-focus-season="1" title="Нажмите, чтобы поменять сезонность">
                <span>${esc(seasonIco)}</span>
                <span>${esc(seasonText)}</span>
              </button>
            </td>
            <td>
              <div class="vp-price-stack">
                <span class="vp-price-main">от ${formatRub(firstPrice)}</span>
                <span class="vp-price-sub">
                  ${p5 ? `5мл: ${formatRub(p5)}` : ''}
                  ${pBottle ? ` · Фл: ${formatRub(pBottle)}` : ''}
                </span>
              </div>
            </td>
            <td>
              ${item.isActive === false
                ? '<span class="vp-tag danger">Скрыт</span>'
                : '<span class="vp-tag ok">На витрине</span>'}
            </td>
            <td>
              <div class="vp-row-actions">
                <button type="button" class="vp-btn vp-btn-outline vp-btn-xs" data-edit-pid="${esc(item.id)}">Изменить</button>
                <button type="button" class="vp-btn vp-btn-danger-outline vp-btn-xs" data-toggle-pid="${esc(item.id)}" title="${item.isActive === false ? 'Показать' : 'Скрыть'}">
                  ${item.isActive === false ? 'Показать' : 'Скрыть'}
                </button>
              </div>
            </td>
          </tr>
        `;
      }).join('');
    }

    renderCatalogPagination(totalPages);
  }

  function renderCatalogPagination(totalPages) {
    const wrap = $('vpCatalogPager');
    if (totalPages <= 1) {
      wrap.innerHTML = '';
      return;
    }

    const pages = [];
    for (let i = 1; i <= totalPages; i += 1) {
      if (i === 1 || i === totalPages || Math.abs(i - state.catalogPage) <= 2) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== '...') {
        pages.push('...');
      }
    }

    wrap.innerHTML = `
      <span class="vp-muted-note">Страница ${state.catalogPage} из ${totalPages}</span>
      <div class="vp-pager-btns">
        <button type="button" class="vp-pager-btn" data-page="${state.catalogPage - 1}" ${state.catalogPage <= 1 ? 'disabled' : ''}>←</button>
        ${pages.map((p) => (
          p === '...'
            ? '<span style="padding:0 6px;color:var(--text-dim);">…</span>'
            : `<button type="button" class="vp-pager-btn ${p === state.catalogPage ? 'active' : ''}" data-page="${p}">${p}</button>`
        )).join('')}
        <button type="button" class="vp-pager-btn" data-page="${state.catalogPage + 1}" ${state.catalogPage >= totalPages ? 'disabled' : ''}>→</button>
      </div>
    `;
  }

  function bindCatalogEvents() {
    let searchTimer = null;
    $('vpCatalogSearch').addEventListener('input', () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        state.catalogPage = 1;
        renderPerfumesTable();
      }, 150);
    });
    ['vpFilterGender', 'vpFilterSeason', 'vpFilterQuality'].forEach((id) => {
      $(id).addEventListener('change', () => {
        state.catalogPage = 1;
        renderPerfumesTable();
      });
    });

    $('vpCatalogPager').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-page]');
      if (!btn || btn.disabled) return;
      state.catalogPage = Number(btn.dataset.page);
      renderPerfumesTable();
      $('tab-perfumes').scrollIntoView({ behavior: 'smooth', block: 'start' });
    });

    $('vpPerfumesTbody').addEventListener('click', async (e) => {
      const editBtn = e.target.closest('[data-edit-pid]');
      if (editBtn) {
        openPerfumeModal(editBtn.dataset.editPid, Boolean(editBtn.dataset.focusSeason));
        return;
      }
      const togBtn = e.target.closest('[data-toggle-pid]');
      if (togBtn) {
        const pid = togBtn.dataset.togglePid;
        const item = state.perfumes.find((x) => x.id === pid);
        if (!item) return;
        try {
          const payload = { ...item, isActive: item.isActive === false };
          await apiFetch('/api/admin/perfumes', {
            method: 'POST',
            body: JSON.stringify(payload),
          });
          showToast(payload.isActive ? 'Аромат возвращён на витрину' : 'Аромат скрыт с витрины', 'ok');
          notifyStorefrontSync('catalog');
          await loadStudioOverview();
        } catch (err) {
          showToast(err.message, 'err');
        }
      }
    });

    $('vpAddPerfumeBtn').addEventListener('click', () => openPerfumeModal(null));
  }

  // ==========================================================================
  // PERFUME EDITOR MODAL (PHOTO UPLOAD, SEASONALITY, SINGLE-ITEM +/- %)
  // ==========================================================================
  function extractObjPosY(posStr) {
    const m = String(posStr || '').match(/(\d+)%/);
    return m ? Math.min(100, Math.max(0, Number(m[1]))) : 50;
  }

  function updatePerfumeModalPreview() {
    const imgVal = ($('pmImage').value || '').trim();
    const posY = Number($('pmObjPosY').value || 50);
    $('pmObjPosYVal').textContent = `${posY}%`;

    const imgEl = $('pmPreviewImg');
    imgEl.src = resolveMediaSrc(imgVal);
    imgEl.style.objectPosition = `center ${posY}%`;

    const badgeVal = ($('pmBadge').value || '').trim();
    $('pmPreviewBadge').textContent = badgeVal;
    $('pmPreviewBadge').hidden = !badgeVal;

    $('pmPreviewBrand').textContent = ($('pmBrand').value || '').trim() || 'VOLODIUM';
    $('pmPreviewName').textContent = ($('pmName').value || '').trim() || 'Новый аромат';

    const sIcon = ($('pmSeasonIcon').value || '').trim() || '🌸';
    const sText = ($('pmSeasonText').value || '').trim() || 'Круглый год';
    const tDay = ($('pmTimeOfDay').value || '').trim() || 'День & Вечер';
    $('pmPreviewSeason').textContent = `${sIcon} ${sText} · ${tDay}`;

    const candidates = [
      $('pmPrice3ml').value,
      $('pmPrice5ml').value,
      $('pmPrice10ml').value,
      $('pmPrice15ml').value,
      $('pmPrice20ml').value,
      $('pmPriceBottle').value,
    ].map(Number).filter((v) => v > 0);
    $('pmPreviewPrice').textContent = candidates.length ? `от ${formatRub(Math.min(...candidates))}` : 'Цена по запросу';

    const desc = ($('pmDescription').value || '').trim();
    $('pmTruncWarn').hidden = !/(\.\.\.|…)\s*$/.test(desc);

    // Highlight active season pill preset
    qsa('#pmSeasonPills .vp-sp-btn').forEach((btn) => {
      btn.classList.toggle('active', btn.dataset.season === sText);
    });
  }

  function openPerfumeModal(perfumeId, focusSeason = false) {
    const item = perfumeId ? state.perfumes.find((x) => x.id === perfumeId) : null;
    $('pmId').value = item ? item.id : '';
    $('vpPerfumeModalTag').textContent = item ? 'РЕДАКТОР АРОМАТА' : 'НОВЫЙ АРОМАТ';
    $('vpPerfumeModalTitle').textContent = item ? `${item.brand || ''} — ${item.name}`.replace(/^\s*—\s*/, '') : 'Добавление нового аромата';
    $('pmDeleteBtn').hidden = !item;

    $('pmBrand').value = item ? (item.brand || '') : '';
    $('pmName').value = item ? (item.name || '') : '';
    $('pmGender').value = item ? (item.gender || 'unisex') : 'unisex';
    $('pmBadge').value = item ? (item.badge || '') : '';
    $('pmImage').value = item ? (item.image || '') : '';
    $('pmObjPosY').value = String(extractObjPosY(item && item.objectPosition));

    const metrics = (item && item.metrics) || {};
    $('pmSeasonText').value = (item && item.season) || metrics.season || 'Круглый год';
    $('pmSeasonIcon').value = (item && item.seasonIcon) || metrics.seasonIcon || '🌸';
    $('pmTimeOfDay').value = (item && item.timeOfDay) || metrics.timeOfDay || 'День & Вечер';
    $('pmMood').value = (item && item.mood) || metrics.vibe || 'Изысканный нишевый стиль';
    $('pmLongevity').value = metrics.longevity || (item && item.longevity) || 'До 12 часов';
    $('pmSillage').value = metrics.sillage || (item && item.sillage) || 'Выразительный';

    const p = (item && item.prices) || {};
    $('pmPrice3ml').value = p['3ml'] || '';
    $('pmPrice5ml').value = p['5ml'] || '';
    $('pmPrice10ml').value = p['10ml'] || '';
    $('pmPrice15ml').value = p['15ml'] || '';
    $('pmPrice20ml').value = p['20ml'] || '';
    $('pmPriceBottle').value = p.bottle || '';
    $('pmBottleSize').value = (item && item.bottleSize) || '';
    $('pmSubtitle').value = (item && item.subtitle) || '';
    $('pmDescription').value = (item && item.description) || '';

    const pyr = (item && item.pyramid) || {};
    const fmtNotes = (v) => (Array.isArray(v) ? v.join(', ') : (v || ''));
    $('pmPyrTop').value = fmtNotes(pyr.top);
    $('pmPyrHeart').value = fmtNotes(pyr.heart);
    $('pmPyrBase').value = fmtNotes(pyr.base);
    $('pmIsActive').checked = item ? (item.isActive !== false) : true;
    $('pmCustomPct').value = '';

    updatePerfumeModalPreview();
    openModal('vpPerfumeModalBackdrop');

    if (focusSeason) {
      setTimeout(() => {
        const sb = qs('.vp-season-editor-box');
        if (sb) sb.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }, 60);
    }
  }

  function applyPercentToPerfumeInputs(pct) {
    const mult = 1 + (pct / 100);
    if (!Number.isFinite(mult) || mult <= 0.05) {
      showToast('Некорректный процент скидки', 'err');
      return;
    }
    const ids = ['pmPrice3ml', 'pmPrice5ml', 'pmPrice10ml', 'pmPrice15ml', 'pmPrice20ml', 'pmPriceBottle'];
    let changed = 0;
    ids.forEach((id) => {
      const inp = $(id);
      const val = Number(inp.value);
      if (val > 0) {
        const step = id === 'pmPriceBottle' ? 50 : 10;
        inp.value = String(Math.max(50, Math.round((val * mult) / step) * step));
        changed += 1;
      }
    });
    updatePerfumeModalPreview();
    if (changed > 0) {
      showToast(`Цены позиции пересчитаны (${pct > 0 ? '+' : ''}${pct}%). Нажмите «Сохранить изменения».`, 'ok');
    }
  }

  async function uploadImageFile(file, folder = 'general') {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('folder', folder);
    return await apiFetch('/api/admin/upload', { method: 'POST', body: fd });
  }

  function bindPerfumeModalEvents() {
    [
      'pmBrand', 'pmName', 'pmBadge', 'pmImage', 'pmObjPosY',
      'pmSeasonText', 'pmSeasonIcon', 'pmTimeOfDay', 'pmDescription',
      'pmPrice3ml', 'pmPrice5ml', 'pmPrice10ml', 'pmPrice15ml', 'pmPrice20ml', 'pmPriceBottle',
    ].forEach((id) => {
      $(id).addEventListener('input', updatePerfumeModalPreview);
    });

    // Seasonality quick pill presets
    qsa('#pmSeasonPills .vp-sp-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('pmSeasonText').value = btn.dataset.season || '';
        $('pmSeasonIcon').value = btn.dataset.icon || '';
        $('pmTimeOfDay').value = btn.dataset.time || '';
        updatePerfumeModalPreview();
      });
    });

    // Single-item % buttons
    qsa('[data-item-pct]').forEach((btn) => {
      btn.addEventListener('click', () => applyPercentToPerfumeInputs(Number(btn.dataset.itemPct)));
    });
    $('pmApplyCustomPctBtn').addEventListener('click', () => {
      const pct = Number($('pmCustomPct').value);
      if (Number.isNaN(pct) || pct === 0) return;
      applyPercentToPerfumeInputs(pct);
    });

    // Photo file upload + drag & drop
    const fileInput = $('pmPhotoFileInput');
    const dropzone = $('pmDropzone');
    async function handlePerfumeFile(file) {
      if (!file) return;
      try {
        showToast('Загрузка изображения...', 'ok');
        const res = await uploadImageFile(file, 'perfumes');
        $('pmImage').value = res.url;
        updatePerfumeModalPreview();
        showToast('Фото загружено на сервер', 'ok');
      } catch (err) {
        showToast(err.message, 'err');
      }
    }
    fileInput.addEventListener('change', () => {
      if (fileInput.files && fileInput.files[0]) handlePerfumeFile(fileInput.files[0]);
      fileInput.value = '';
    });
    ['dragenter', 'dragover'].forEach((ev) => {
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((ev) => {
      dropzone.addEventListener(ev, (e) => {
        e.preventDefault();
        dropzone.classList.remove('is-dragover');
      });
    });
    dropzone.addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handlePerfumeFile(file);
    });

    // Submit save
    $('vpPerfumeForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const prices = {};
      const mapFields = [
        ['3ml', 'pmPrice3ml'],
        ['5ml', 'pmPrice5ml'],
        ['10ml', 'pmPrice10ml'],
        ['15ml', 'pmPrice15ml'],
        ['20ml', 'pmPrice20ml'],
        ['bottle', 'pmPriceBottle'],
      ];
      mapFields.forEach(([k, id]) => {
        const val = Number($(id).value);
        if (val > 0) prices[k] = Math.round(val);
      });

      const payload = {
        id: $('pmId').value || undefined,
        brand: $('pmBrand').value.trim(),
        name: $('pmName').value.trim(),
        fullTitle: `${$('pmBrand').value.trim()} ${$('pmName').value.trim()}`.trim(),
        gender: $('pmGender').value,
        category: 'perfume',
        badge: $('pmBadge').value.trim(),
        image: $('pmImage').value.trim(),
        objectPosition: `center ${$('pmObjPosY').value || 50}%`,
        season: $('pmSeasonText').value.trim() || 'Круглый год',
        seasonIcon: $('pmSeasonIcon').value.trim() || '🌸',
        timeOfDay: $('pmTimeOfDay').value.trim() || 'День & Вечер',
        mood: $('pmMood').value.trim(),
        longevity: $('pmLongevity').value.trim(),
        sillage: $('pmSillage').value.trim(),
        bottleSize: $('pmBottleSize').value.trim(),
        subtitle: $('pmSubtitle').value.trim(),
        description: $('pmDescription').value.trim(),
        prices,
        pyramid: {
          top: $('pmPyrTop').value.split(/[,·\n]+/).map((s) => s.trim()).filter(Boolean),
          heart: $('pmPyrHeart').value.split(/[,·\n]+/).map((s) => s.trim()).filter(Boolean),
          base: $('pmPyrBase').value.split(/[,·\n]+/).map((s) => s.trim()).filter(Boolean),
        },
        isActive: $('pmIsActive').checked,
      };

      try {
        await apiFetch('/api/admin/perfumes', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        closeModal('vpPerfumeModalBackdrop');
        showToast('Аромат сохранён и синхронизирован с витриной', 'ok');
        notifyStorefrontSync('perfumes');
        await loadStudioOverview();
      } catch (err) {
        showToast(err.message, 'err');
      }
    });

    // Delete
    $('pmDeleteBtn').addEventListener('click', async () => {
      const pid = $('pmId').value;
      if (!pid) return;
      if (!window.confirm('Удалить этот аромат из каталога безвозвратно?')) return;
      try {
        await apiFetch(`/api/admin/perfumes/${encodeURIComponent(pid)}`, { method: 'DELETE' });
        closeModal('vpPerfumeModalBackdrop');
        showToast('Аромат удалён', 'ok');
        notifyStorefrontSync('perfumes');
        await loadStudioOverview();
      } catch (err) {
        showToast(err.message, 'err');
      }
    });
  }

  // ==========================================================================
  // TAB 3: BULK PERCENTAGE PRICING & 1-CLICK ROLLBACK
  // ==========================================================================
  function readBulkPayload(dryRun) {
    return {
      scope: $('bulkScope').value,
      percent: Number($('bulkPercentInput').value || 0),
      roundStep: Number($('bulkRoundStep').value || 10),
      genderFilter: $('bulkGenderFilter').value,
      seasonFilter: $('bulkSeasonFilter').value,
      brandFilter: $('bulkBrandFilter').value.trim(),
      applyToOldPrices: $('bulkApplyOldPrices').checked,
      dryRun,
    };
  }

  async function runBulkPricePreview() {
    const payload = readBulkPayload(true);
    try {
      const data = await apiFetch('/api/admin/bulk-price', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      const r = data.result;
      const sign = r.percent > 0 ? `+${r.percent}%` : `${r.percent}%`;
      $('bulkPreviewSummary').innerHTML = `
        Предпросмотр <strong>${esc(sign)}</strong> (округление до ${r.roundStep} ₽):
        затронет <strong>${r.totalAffected}</strong> позиций
        (Духи: ${r.affectedPerfumes}, Аромабоксы: ${r.affectedBoxes}, Secret Box: ${r.affectedSecrets}).
        Показаны первые ${r.previews.length} примеров.
      `;

      const tbody = $('bulkPreviewTbody');
      if (!r.previews.length) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:18px;">Нет позиций, подходящих под выбранные фильтры</td></tr>';
      } else {
        tbody.innerHTML = r.previews.map((row) => {
          const diff = row.newPrice - row.oldPrice;
          const diffCls = diff >= 0 ? 'vp-diff-pos' : 'vp-diff-neg';
          const diffStr = `${diff >= 0 ? '+' : ''}${formatRub(diff)}`;
          return `
            <tr>
              <td>${esc(row.kind)}</td>
              <td><strong>${esc(row.title)}</strong></td>
              <td>${esc(row.sampleKey)}</td>
              <td>${formatRub(row.oldPrice)}</td>
              <td><strong>${formatRub(row.newPrice)}</strong></td>
              <td class="${diffCls}">${diffStr}</td>
            </tr>
          `;
        }).join('');
      }
      $('bulkPreviewWrap').hidden = false;
    } catch (err) {
      showToast(err.message, 'err');
    }
  }

  function renderSnapshots() {
    const wrap = $('vpSnapshotsList');
    if (!state.priceSnapshots.length) {
      wrap.innerHTML = '<p class="vp-muted-note">Снимки появятся автоматически перед первой массовой переоценкой.</p>';
      return;
    }
    wrap.innerHTML = state.priceSnapshots.map((s) => `
      <div class="vp-snap-card">
        <div class="vp-snap-top">
          <span>#${s.id} · ${esc(s.operator_name)}</span>
          <span>${esc(s.created_at)}</span>
        </div>
        <div class="vp-snap-summary">${esc(s.summary)}</div>
        <div style="display:flex;align-items:center;justify-content:space-between;gap:8px;margin-top:4px;">
          ${s.restored ? '<span class="vp-tag ok">Откат выполнен</span>' : '<span class="vp-tag muted">Активный снимок</span>'}
          <button type="button" class="vp-btn vp-btn-outline vp-btn-xs" data-rollback-id="${s.id}">Откатить цены ↺</button>
        </div>
      </div>
    `).join('');
  }

  function bindPricingEvents() {
    qsa('[data-set-pct]').forEach((btn) => {
      btn.addEventListener('click', () => {
        $('bulkPercentInput').value = btn.dataset.setPct;
        runBulkPricePreview();
      });
    });

    $('bulkPreviewBtn').addEventListener('click', runBulkPricePreview);

    $('bulkApplyBtn').addEventListener('click', async () => {
      const payload = readBulkPayload(false);
      if (payload.percent === 0) {
        showToast('Укажите ненулевой процент изменения', 'err');
        return;
      }
      const sign = payload.percent > 0 ? `+${payload.percent}%` : `${payload.percent}%`;
      if (!window.confirm(`Применить изменение цен (${sign}) к выбранным товарам?\nПеред изменением автоматически сохранится точка отката.`)) {
        return;
      }
      try {
        const res = await apiFetch('/api/admin/bulk-price', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        showToast(`Цены обновлены (${res.result.totalAffected} позиций). Снимок отката сохранён.`, 'ok');
        notifyStorefrontSync('pricing');
        $('bulkPreviewWrap').hidden = true;
        await loadStudioOverview();
      } catch (err) {
        showToast(err.message, 'err');
      }
    });

    $('vpSnapshotsList').addEventListener('click', async (e) => {
      const btn = e.target.closest('[data-rollback-id]');
      if (!btn) return;
      const sid = Number(btn.dataset.rollbackId);
      if (!window.confirm(`Откатить цены к состоянию до снимка #${sid}?`)) return;
      try {
        const res = await apiFetch(`/api/admin/price-snapshots/${sid}/rollback`, { method: 'POST' });
        showToast(`Восстановлено позиций: ${res.result.restoredCount}`, 'ok');
        notifyStorefrontSync('pricing');
        await loadStudioOverview();
      } catch (err) {
        showToast(err.message, 'err');
      }
    });
  }

  // ==========================================================================
  // TAB 4: AROMA BOXES & SECRET BOXES
  // ==========================================================================
  function renderBoxesTab() {
    const sbGrid = $('vpSecretBoxesGrid');
    sbGrid.innerHTML = state.secretBoxes.map((sb) => `
      <article class="vp-box-admin-card ${sb.isHit ? 'is-hit' : ''}">
        <div class="vp-bac-media">
          <img
            src="${esc(resolveMediaSrc(sb.image))}"
            alt="${esc(sb.name)}"
            decoding="async"
            referrerpolicy="no-referrer"
            onerror="this.onerror=null;this.src='/assets/images/noroot.png';"
            style="object-position:${esc(sb.objectPosition || 'center center')};"
          >
          ${sb.badge ? `<span class="vp-bac-badge">${esc(sb.badge)}</span>` : ''}
        </div>
        <div class="vp-bac-body">
          <h4 class="vp-bac-title">${esc(sb.name)}</h4>
          <div class="vp-bac-sub">${esc(sb.subtitle || '')}</div>
          <div class="vp-bac-price-row">
            <div>
              <span class="vp-bac-price">${formatRub(sb.price)}</span>
              ${sb.oldPrice > 0 ? `<span class="vp-bac-old">${formatRub(sb.oldPrice)}</span>` : ''}
            </div>
            <button type="button" class="vp-btn vp-btn-outline vp-btn-xs" data-edit-secret="${esc(sb.id)}">Настроить</button>
          </div>
        </div>
      </article>
    `).join('');

    const abGrid = $('vpAromaBoxesGrid');
    abGrid.innerHTML = state.aromaboxes.map((box) => {
      const p3 = (box.prices && box.prices['3ml']) || Object.values(box.prices || {})[0] || 0;
      const old3 = (box.oldPrices && box.oldPrices['3ml']) || 0;
      return `
        <article class="vp-box-admin-card">
          <div class="vp-bac-media">
            <img
              src="${esc(resolveMediaSrc(box.image))}"
              alt="${esc(box.name)}"
              decoding="async"
              referrerpolicy="no-referrer"
              onerror="this.onerror=null;this.src='/assets/images/noroot.png';"
              style="object-position:${esc(box.objectPosition || 'center center')};"
            >
            ${box.badge ? `<span class="vp-bac-badge">${esc(box.badge)}</span>` : ''}
          </div>
          <div class="vp-bac-body">
            <span class="vp-item-brand">${esc(box.genderLabel || box.gender)}</span>
            <h4 class="vp-bac-title">${esc(box.name)}</h4>
            <div class="vp-bac-sub">${esc(box.shortSubtitle || '')} · ${(box.perfumes || []).length} ароматов</div>
            <div class="vp-bac-price-row">
              <div>
                <span class="vp-bac-price">от ${formatRub(p3)}</span>
                ${old3 > 0 ? `<span class="vp-bac-old">${formatRub(old3)}</span>` : ''}
              </div>
              <button type="button" class="vp-btn vp-btn-outline vp-btn-xs" data-edit-box="${esc(box.id)}">Редактировать</button>
            </div>
          </div>
        </article>
      `;
    }).join('');
  }

  function updateBoxModalPreview() {
    const imgVal = ($('bmImage').value || '').trim();
    const posY = Number($('bmObjPosY').value || 50);
    $('bmObjPosYVal').textContent = `${posY}%`;

    const imgEl = $('bmPreviewImg');
    imgEl.src = resolveMediaSrc(imgVal);
    imgEl.style.objectPosition = `center ${posY}%`;

    const thumbEl = $('bmCurrentThumb');
    thumbEl.src = resolveMediaSrc(imgVal);
    thumbEl.style.objectPosition = `center ${posY}%`;
    $('bmPhotoSourceLabel').textContent = imgVal || 'assets/images/noroot.png';
    $('bmPhotoStatusTag').textContent = imgVal ? 'Фото активно' : 'Без фото';
    $('bmPhotoStatusTag').className = `vp-tag ${imgVal ? 'ok' : 'muted'}`;

    const badgeVal = ($('bmBadge').value || '').trim();
    $('bmPreviewBadge').textContent = badgeVal;
    $('bmPreviewBadge').hidden = !badgeVal;

    const gmap = { women: 'Для нее', men: 'Для него', unisex: 'Унисекс' };
    $('bmPreviewGender').textContent = gmap[$('bmGender').value] || 'Унисекс';
    $('bmPreviewName').textContent = ($('bmName').value || '').trim() || 'Название бокса';

    const pList = $('bmPerfumes').value.split('\n').map((s) => s.trim()).filter(Boolean);
    const sub = ($('bmSubtitle').value || '').trim();
    $('bmPreviewSub').textContent = `${sub ? sub + ' · ' : ''}${pList.length} ароматов`;

    const p3 = Number($('bmP3').value || 0);
    const p5 = Number($('bmP5').value || 0);
    const p10 = Number($('bmP10').value || 0);
    const candidates = [p3, p5, p10].filter((v) => v > 0);
    $('bmPreviewPrice').textContent = candidates.length ? `от ${formatRub(Math.min(...candidates))}` : 'от 3 200 ₽';

    const old3 = Number($('bmOld3').value || 0);
    if (old3 > 0) {
      $('bmPreviewOldPrice').textContent = formatRub(old3);
      $('bmPreviewOldPrice').hidden = false;
    } else {
      $('bmPreviewOldPrice').hidden = true;
    }
  }

  function updateSecretModalPreview() {
    const imgVal = ($('smImage').value || '').trim();
    const posY = Number($('smObjPosY').value || 50);
    $('smObjPosYVal').textContent = `${posY}%`;

    const imgEl = $('smPreviewImg');
    imgEl.src = resolveMediaSrc(imgVal);
    imgEl.style.objectPosition = `center ${posY}%`;

    const thumbEl = $('smCurrentThumb');
    thumbEl.src = resolveMediaSrc(imgVal);
    thumbEl.style.objectPosition = `center ${posY}%`;
    $('smPhotoSourceLabel').textContent = imgVal || 'assets/images/noroot.png';
    $('smPhotoStatusTag').textContent = imgVal ? 'Фото активно' : 'Без фото';
    $('smPhotoStatusTag').className = `vp-tag ${imgVal ? 'ok' : 'muted'}`;

    const badgeVal = ($('smBadge').value || '').trim();
    $('smPreviewBadge').textContent = badgeVal;
    $('smPreviewBadge').hidden = !badgeVal;

    $('smPreviewName').textContent = ($('smName').value || '').trim() || 'Секретный бокс';
    $('smPreviewSubtitle').textContent = ($('smSubtitle').value || '').trim() || 'Персональный подбор';

    const price = Number($('smPrice').value || 0);
    $('smPreviewPrice').textContent = price > 0 ? formatRub(price) : '4 900 ₽';

    const oldPrice = Number($('smOldPrice').value || 0);
    if (oldPrice > 0) {
      $('smPreviewOldPrice').textContent = formatRub(oldPrice);
      $('smPreviewOldPrice').hidden = false;
    } else {
      $('smPreviewOldPrice').hidden = true;
    }

    const feats = $('smFeatures').value.split('\n').map((s) => s.trim()).filter(Boolean);
    $('smPreviewFeatures').innerHTML = feats.map((f) => `<li>${esc(f)}</li>`).join('');

    const isHit = $('smIsHit').checked;
    $('smPreviewCard').classList.toggle('is-hit', isHit);
  }

  function openBoxModal(boxId) {
    const box = boxId ? state.aromaboxes.find((x) => x.id === boxId) : null;
    $('bmId').value = box ? box.id : '';
    $('vpBoxModalTitle').textContent = box ? box.name : 'Новый тематический аромабокс';
    $('bmDeleteBtn').hidden = !box;

    $('bmName').value = box ? (box.name || '') : '';
    $('bmGender').value = box ? (box.gender || 'unisex') : 'unisex';
    $('bmBadge').value = box ? (box.badge || '') : '';
    $('bmSubtitle').value = box ? (box.shortSubtitle || '') : '';
    $('bmImage').value = box ? (box.image || '') : '';
    $('bmObjPosY').value = extractObjPosY(box ? box.objectPosition : '50%');
    $('bmP3').value = (box && box.prices && box.prices['3ml']) || '';
    $('bmP5').value = (box && box.prices && box.prices['5ml']) || '';
    $('bmP10').value = (box && box.prices && box.prices['10ml']) || '';
    $('bmOld3').value = (box && box.oldPrices && box.oldPrices['3ml']) || '';
    $('bmOld5').value = (box && box.oldPrices && box.oldPrices['5ml']) || '';
    $('bmOld10').value = (box && box.oldPrices && box.oldPrices['10ml']) || '';
    $('bmPerfumes').value = box ? (box.perfumes || []).join('\n') : '';
    $('bmDesc').value = box ? (box.fullDescription || '') : '';
    $('bmIsActive').checked = box ? (box.isActive !== false) : true;
    updateBoxModalPreview();
    openModal('vpBoxModalBackdrop');
  }

  function openSecretModal(secretId) {
    const sb = state.secretBoxes.find((x) => x.id === secretId);
    if (!sb) return;
    $('smId').value = sb.id;
    $('smLevel').value = sb.level || sb.name;
    $('vpSecretModalTitle').textContent = `Secret Box «${sb.level || sb.name}»`;
    $('smName').value = sb.name || '';
    $('smBadge').value = sb.badge || '';
    $('smPrice').value = sb.price || 4900;
    $('smOldPrice').value = sb.oldPrice || '';
    $('smSubtitle').value = sb.subtitle || '';
    $('smImage').value = sb.image || '';
    $('smObjPosY').value = extractObjPosY(sb.objectPosition || '50%');
    $('smDesc').value = sb.description || '';
    $('smFeatures').value = (sb.features || []).join('\n');
    $('smIsHit').checked = Boolean(sb.isHit);
    updateSecretModalPreview();
    openModal('vpSecretModalBackdrop');
  }

  function bindBoxesEvents() {
    $('vpAddBoxBtn').addEventListener('click', () => openBoxModal(null));
    $('vpAromaBoxesGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-edit-box]');
      if (btn) openBoxModal(btn.dataset.editBox);
    });
    $('vpSecretBoxesGrid').addEventListener('click', (e) => {
      const btn = e.target.closest('[data-edit-secret]');
      if (btn) openSecretModal(btn.dataset.editSecret);
    });

    // AromaBox live preview inputs
    ['bmName', 'bmBadge', 'bmSubtitle', 'bmImage', 'bmP3', 'bmP5', 'bmP10', 'bmOld3', 'bmPerfumes'].forEach((id) => {
      $(id).addEventListener('input', updateBoxModalPreview);
    });
    ['bmGender', 'bmObjPosY'].forEach((id) => {
      $(id).addEventListener('input', updateBoxModalPreview);
      $(id).addEventListener('change', updateBoxModalPreview);
    });
    $('bmClearImgBtn').addEventListener('click', () => {
      $('bmImage').value = '';
      updateBoxModalPreview();
    });

    // Secret Box live preview inputs
    ['smName', 'smBadge', 'smSubtitle', 'smPrice', 'smOldPrice', 'smImage', 'smFeatures'].forEach((id) => {
      $(id).addEventListener('input', updateSecretModalPreview);
    });
    ['smObjPosY', 'smIsHit'].forEach((id) => {
      $(id).addEventListener('input', updateSecretModalPreview);
      $(id).addEventListener('change', updateSecretModalPreview);
    });
    $('smClearImgBtn').addEventListener('click', () => {
      $('smImage').value = '';
      updateSecretModalPreview();
    });

    // AromaBox file upload + drag & drop
    const bmFileInp = $('bmFileInput');
    const bmDrop = $('bmDropzone');
    async function handleAromaBoxFile(file) {
      if (!file) return;
      try {
        showToast('Загрузка изображения аромабокса...', 'ok');
        const res = await uploadImageFile(file, 'boxes');
        $('bmImage').value = res.url;
        updateBoxModalPreview();
        showToast('Фото аромабокса загружено', 'ok');
      } catch (err) {
        showToast(err.message, 'err');
      }
    }
    bmFileInp.addEventListener('change', () => {
      if (bmFileInp.files && bmFileInp.files[0]) handleAromaBoxFile(bmFileInp.files[0]);
      bmFileInp.value = '';
    });
    ['dragenter', 'dragover'].forEach((ev) => {
      bmDrop.addEventListener(ev, (e) => {
        e.preventDefault();
        bmDrop.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((ev) => {
      bmDrop.addEventListener(ev, (e) => {
        e.preventDefault();
        bmDrop.classList.remove('is-dragover');
      });
    });
    bmDrop.addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleAromaBoxFile(file);
    });

    // Secret Box file upload + drag & drop
    const smFileInp = $('smFileInput');
    const smDrop = $('smDropzone');
    async function handleSecretBoxFile(file) {
      if (!file) return;
      try {
        showToast('Загрузка изображения Secret Box...', 'ok');
        const res = await uploadImageFile(file, 'boxes');
        $('smImage').value = res.url;
        updateSecretModalPreview();
        showToast('Фото Secret Box загружено', 'ok');
      } catch (err) {
        showToast(err.message, 'err');
      }
    }
    smFileInp.addEventListener('change', () => {
      if (smFileInp.files && smFileInp.files[0]) handleSecretBoxFile(smFileInp.files[0]);
      smFileInp.value = '';
    });
    ['dragenter', 'dragover'].forEach((ev) => {
      smDrop.addEventListener(ev, (e) => {
        e.preventDefault();
        smDrop.classList.add('is-dragover');
      });
    });
    ['dragleave', 'drop'].forEach((ev) => {
      smDrop.addEventListener(ev, (e) => {
        e.preventDefault();
        smDrop.classList.remove('is-dragover');
      });
    });
    smDrop.addEventListener('drop', (e) => {
      const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
      if (file) handleSecretBoxFile(file);
    });

    // Submit save AromaBox
    $('vpBoxForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const prices = {};
      if (Number($('bmP3').value) > 0) prices['3ml'] = Math.round(Number($('bmP3').value));
      if (Number($('bmP5').value) > 0) prices['5ml'] = Math.round(Number($('bmP5').value));
      if (Number($('bmP10').value) > 0) prices['10ml'] = Math.round(Number($('bmP10').value));
      const oldPrices = {};
      if (Number($('bmOld3').value) > 0) oldPrices['3ml'] = Math.round(Number($('bmOld3').value));
      if (Number($('bmOld5').value) > 0) oldPrices['5ml'] = Math.round(Number($('bmOld5').value));
      if (Number($('bmOld10').value) > 0) oldPrices['10ml'] = Math.round(Number($('bmOld10').value));

      const gender = $('bmGender').value;
      const gmap = { women: 'Для нее', men: 'Для него', unisex: 'Унисекс' };
      const posY = Number($('bmObjPosY').value || 50);
      const payload = {
        id: $('bmId').value || undefined,
        name: $('bmName').value.trim(),
        gender,
        genderLabel: gmap[gender] || 'Унисекс',
        badge: $('bmBadge').value.trim(),
        shortSubtitle: $('bmSubtitle').value.trim(),
        image: $('bmImage').value.trim(),
        objectPosition: `center ${posY}%`,
        prices,
        oldPrices,
        perfumes: $('bmPerfumes').value.split('\n').map((s) => s.trim()).filter(Boolean),
        fullDescription: $('bmDesc').value.trim(),
        isActive: $('bmIsActive').checked,
      };
      try {
        await apiFetch('/api/admin/aromaboxes', { method: 'POST', body: JSON.stringify(payload) });
        closeModal('vpBoxModalBackdrop');
        showToast('Аромабокс сохранён', 'ok');
        notifyStorefrontSync('boxes');
        await loadStudioOverview();
      } catch (err) {
        showToast(err.message, 'err');
      }
    });

    $('bmDeleteBtn').addEventListener('click', async () => {
      const bid = $('bmId').value;
      if (!bid || !window.confirm('Удалить этот аромабокс?')) return;
      try {
        await apiFetch(`/api/admin/aromaboxes/${encodeURIComponent(bid)}`, { method: 'DELETE' });
        closeModal('vpBoxModalBackdrop');
        showToast('Аромабокс удалён', 'ok');
        notifyStorefrontSync('boxes');
        await loadStudioOverview();
      } catch (err) {
        showToast(err.message, 'err');
      }
    });

    // Submit save Secret Box
    $('vpSecretForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const posY = Number($('smObjPosY').value || 50);
      const payload = {
        id: $('smId').value,
        level: $('smLevel').value || $('smName').value.trim(),
        name: $('smName').value.trim(),
        title: $('smName').value.trim(),
        badge: $('smBadge').value.trim(),
        price: Math.round(Number($('smPrice').value)),
        oldPrice: Math.round(Number($('smOldPrice').value || 0)),
        subtitle: $('smSubtitle').value.trim(),
        image: $('smImage').value.trim(),
        objectPosition: `center ${posY}%`,
        description: $('smDesc').value.trim(),
        features: $('smFeatures').value.split('\n').map((s) => s.trim()).filter(Boolean),
        isHit: $('smIsHit').checked,
        isActive: true,
      };
      try {
        await apiFetch('/api/admin/secret-boxes', { method: 'POST', body: JSON.stringify(payload) });
        closeModal('vpSecretModalBackdrop');
        showToast('Secret Box обновлён', 'ok');
        notifyStorefrontSync('secret_boxes');
        await loadStudioOverview();
      } catch (err) {
        showToast(err.message, 'err');
      }
    });
  }

  // ==========================================================================
  // TAB 5: STOREFRONT HERO, HEADER, INTRO & CONSULTATION VISUALS
  // ==========================================================================
  function updateLiveHeroPreview() {
    $('lhsBadge').textContent = $('scHeroBadge').value.trim() || 'VOLODIUM PARFUM';
    $('lhsTitleLine').textContent = $('scHeroTitleLine').value.trim() || 'Открой. Вдохни.';
    $('lhsTitleAccent').textContent = $('scHeroTitleAccent').value.trim() || 'Почувствуй.';
    $('lhsDesc').textContent = $('scHeroDesc').value.trim();

    const pImg = $('lhsPortraitImg');
    pImg.src = resolveMediaSrc($('scHeroPortraitImg').value);
    const pY = Number($('scHeroPortraitY').value || 20);
    pImg.style.objectPosition = `center ${pY}%`;
    $('scHeroPortraitYVal').textContent = `${pY}%`;
    $('lhsPortraitTitle').textContent = $('scHeroPortraitTitle').value.trim() || 'ВЛАДИМИР ВАЦИК';
    $('lhsPortraitQuote').textContent = $('scHeroPortraitQuote').value.trim();

    const bgEl = $('lhsBackdrop');
    const bgSrc = resolveMediaSrc($('scHeroBackdropImg').value);
    const bgOp = Number($('scHeroBackdropOpacity').value || 75);
    bgEl.style.backgroundImage = `url("${bgSrc.replace(/"/g, '\\"')}")`;
    bgEl.style.opacity = String(bgOp / 100);
    $('scHeroBackdropOpacityVal').textContent = `${bgOp}%`;

    const statsHtml = [0, 1, 2, 3].map((idx) => {
      const v = $(`scStatVal${idx}`).value.trim();
      const l = $(`scStatLbl${idx}`).value.trim();
      if (!v && !l) return '';
      return `<div class="vp-lhs-stat"><strong>${esc(v)}</strong><span>${esc(l)}</span></div>`;
    }).join('');
    $('lhsStatsPreview').innerHTML = statsHtml;
  }

  function populateStorefrontForm() {
    const sc = state.siteContent || {};
    const hero = sc.hero || {};
    const brand = sc.brand || {};
    const consult = sc.consultation || {};

    $('scHeroBadge').value = hero.badge || '';
    $('scHeroTitleLine').value = hero.titleLine || '';
    $('scHeroTitleAccent').value = hero.titleAccent || '';
    $('scHeroDesc').value = hero.description || '';
    $('scCtaCatalog').value = hero.ctaCatalogText || '';
    $('scCtaQuiz').value = hero.ctaQuizText || '';
    $('scCtaSecret').value = hero.ctaSecretText || '';
    $('scHeroPortraitImg').value = hero.portraitImage || '';
    $('scHeroPortraitY').value = String(extractObjPosY(hero.portraitPosition || 'center 20%'));
    $('scHeroPortraitTitle').value = hero.portraitTitle || '';
    $('scHeroPortraitQuote').value = hero.portraitQuote || '';
    $('scHeroBackdropImg').value = hero.backdropImage || '';
    $('scHeroBackdropOpacity').value = String(Math.round((Number(hero.backdropOpacity ?? 0.75)) * 100));

    const stats = Array.isArray(hero.stats) ? hero.stats : [];
    [0, 1, 2, 3].forEach((idx) => {
      $(`scStatVal${idx}`).value = (stats[idx] && stats[idx].value) || '';
      $(`scStatLbl${idx}`).value = (stats[idx] && stats[idx].label) || '';
    });

    $('scBrandTitle').value = brand.title || 'VOLODIUM';
    $('scBrandSub').value = brand.subtitle || 'Parfum';
    $('scBrandLogo').value = brand.logo || '';
    $('scIntroTitle').value = brand.introTitle || 'VOLODIUM';
    $('scIntroSub').value = brand.introSubtitle || 'PARFUM';
    $('scIntroEnabled').checked = brand.introEnabled !== false;

    $('scConsultOnlineTitle').value = consult.onlineTitle || '';
    $('scConsultOnlineSub').value = consult.onlineSub || '';
    $('scConsultOnlinePrice').value = consult.onlinePrice || '0 ₽';
    $('scConsultOnlineImg').value = consult.onlineImage || '';
    $('scConsultOfflineTitle').value = consult.offlineTitle || '';
    $('scConsultOfflineSub').value = consult.offlineSub || '';
    $('scConsultOfflinePrice').value = consult.offlinePrice || '5 000 ₽';
    $('scConsultOfflineImg').value = consult.offlineImage || '';

    updateLiveHeroPreview();
    renderReviewsAdmin();
  }

  function renderReviewsAdmin() {
    const grid = $('vpReviewsAdminGrid');
    if (!grid) return;
    const sc = state.siteContent || {};
    const reviews = Array.isArray(sc.reviews) && sc.reviews.length ? sc.reviews : [
      { id: 1, name: 'Kirill Belov', tag: 'Аромабокс', text: '«Арома-бокс приехал, всё дошло в идеальном состоянии — упаковано с душой и вниманием к деталям. Спасибо за атмосферу, которую создаёшь! Парфюмы с порога заявили о себе — всё в моём духе. Рад, что выбрал тебя! Отдельное спасибо за секретный ништячок Al Thaïr!»', image: 'assets/img/reviews/review_box_kirill.jpg', objectPosition: 'center 25%' },
      { id: 2, name: 'Юлианна', tag: 'Подбор вслепую', text: '«Владимир, спасибо огромное за подбор! Заказывала практически вслепую и переживала, но попадание в точку! Особенно Wavechild — любовь с первого пшика. Видно, что стараешься подобрать под человека, а не просто продать. Упаковка с фирменным посланием — отдельный вайб!»', image: 'assets/img/reviews/review_box_open_motto.jpg', objectPosition: 'center 65%' },
      { id: 3, name: 'Екатерина', tag: 'Подарочный бокс', text: '«Володя, это восторг! Заказывала подарочный бокс — оформление превзошло все ожидания! Черная лента, фирменная сургучная печать с монограммой, всё до мельчайших деталей продумано. Распаковывать было отдельным эстетическим удовольствием, а ароматы внутри подобраны с первого раза в десятку ❤️»', image: 'assets/img/reviews/review_box_wax_ribbon.jpg', objectPosition: 'center 50%' },
      { id: 4, name: 'Анастасия', tag: 'Boss Unlimited & Сет', text: '«В общем! Большое тебе спасибо за парфюм и твой подход 🙏🏻 От заказа до его получения мы остались под впечатлением! Быстрая отправка, аккуратная красивая упаковка, молодой человек в восторге, Boss Unlimited — его любимый парфюм и он теперь снова каждый день им пользуется! Обязательно буду обращаться еще! Спасибо за твой труд и твой подход к работе 🫶🏻»', image: 'assets/img/reviews/review_boss_unlimited.jpg', objectPosition: 'center 45%' },
      { id: 5, name: 'Максим', tag: 'Распаковка & Подарки', text: '«Привет! Все получил, да еще и 2 подарочка 🔥 Ультра доволен, есть как культовые ароматы по типу Альтаира, Ангела, так и варианты на попробовать. От души еще раз, спасибо! ♥️»', image: 'assets/img/reviews/review_box_motto_unpack.jpg', objectPosition: 'center 65%' },
      { id: 6, name: 'Ксения', tag: 'Парфюмерный гардероб', text: '«Вова, спасибо тебе! Вспоминаю, как впервые попала на консультацию, думая, что мне мало что интересно. А потом провела инвентаризацию: это настоящее исследование себя через мир ароматов и поиск своего образа. Спасибо за это путешествие!»', image: 'assets/img/reviews/photo_viola.jpg', objectPosition: 'center 30%' },
      { id: 7, name: 'Никита', tag: 'Личный подбор', text: '«Все прошло просто супер! Встретились, открыли огромный чемодан и нашли сразу 6 новых топовых ароматов для меня. Честно, я в полном восторге, обожаю твою работу — ты настоящий профи и эксперт! Теперь за парфюмом только к тебе 🔥»', image: 'assets/img/reviews/review_nikita_consult.jpg', objectPosition: 'center 20%' },
    ];

    grid.innerHTML = reviews.map((rev, idx) => {
      const posY = extractObjPosY(rev.objectPosition || 'center 25%');
      return `
        <article class="vp-review-admin-card" data-rev-idx="${idx}">
          <div class="vp-rac-top">
            <span class="vp-rac-badge">Отзыв #${idx + 1}</span>
            <span class="vp-tag ok">5 звёзд ★★★★★</span>
          </div>

          <div class="vp-rac-thumb-wrap">
            <img
              id="scRevThumb${idx}"
              src="${esc(resolveMediaSrc(rev.image))}"
              alt="Превью отзыва #${idx + 1}"
              referrerpolicy="no-referrer"
              decoding="async"
              style="object-position: center ${posY}%;"
            >
          </div>

          <div class="vp-range-row" style="margin-top:8px;">
            <span>Фокус по высоте:</span>
            <input type="range" id="scRevPosY${idx}" min="0" max="100" value="${posY}" data-rev-slider="${idx}">
            <span id="scRevPosYVal${idx}">${posY}%</span>
          </div>

          <div class="vp-upload-row" style="margin-top:8px;">
            <input type="text" id="scRevImg${idx}" value="${esc(rev.image || '')}" placeholder="assets/img/reviews/..." data-rev-img-input="${idx}">
            <label class="vp-btn vp-btn-outline vp-btn-sm vp-upload-trigger">
              <span>Загрузить</span>
              <input type="file" accept="image/jpeg,image/png,image/webp,image/gif" hidden data-upload-review="${idx}">
            </label>
          </div>

          <div class="vp-form-grid" style="margin-top:8px;">
            <div class="vp-field">
              <label>Имя клиента</label>
              <input type="text" id="scRevName${idx}" value="${esc(rev.name || '')}">
            </div>
            <div class="vp-field">
              <label>Тег / Категория</label>
              <input type="text" id="scRevTag${idx}" value="${esc(rev.tag || '')}">
            </div>
          </div>

          <div class="vp-field" style="margin-top:8px;">
            <label>Текст отзыва</label>
            <textarea id="scRevText${idx}" rows="3">${esc(rev.text || '')}</textarea>
          </div>
        </article>
      `;
    }).join('');

    // Wire live sliders for vertical position
    qsa('[data-rev-slider]').forEach((slider) => {
      slider.addEventListener('input', () => {
        const idx = slider.dataset.revSlider;
        const val = slider.value;
        const valEl = $(`scRevPosYVal${idx}`);
        if (valEl) valEl.textContent = `${val}%`;
        const thumb = $(`scRevThumb${idx}`);
        if (thumb) thumb.style.objectPosition = `center ${val}%`;
      });
    });

    // Wire image text input live update
    qsa('[data-rev-img-input]').forEach((inp) => {
      inp.addEventListener('input', () => {
        const idx = inp.dataset.revImgInput;
        const thumb = $(`scRevThumb${idx}`);
        if (thumb) thumb.src = resolveMediaSrc(inp.value.trim());
      });
    });

    // Wire file uploads
    qsa('[data-upload-review]').forEach((fileInp) => {
      fileInp.addEventListener('change', async () => {
        const file = fileInp.files && fileInp.files[0];
        if (!file) return;
        const idx = fileInp.dataset.uploadReview;
        try {
          showToast(`Загрузка фото для отзыва #${Number(idx) + 1}...`, 'ok');
          const res = await uploadImageFile(file, 'reviews');
          const txtInp = $(`scRevImg${idx}`);
          if (txtInp) txtInp.value = res.url;
          const thumb = $(`scRevThumb${idx}`);
          if (thumb) thumb.src = resolveMediaSrc(res.url);
          showToast('Фото отзыва загружено', 'ok');
        } catch (err) {
          showToast(err.message, 'err');
        } finally {
          fileInp.value = '';
        }
      });
    });
  }

  function readReviewsForm() {
    const sc = state.siteContent || {};
    const baseReviews = Array.isArray(sc.reviews) && sc.reviews.length ? sc.reviews : [
      { id: 1, name: 'Kirill Belov', city: 'Telegram отзыв', tag: 'Аромабокс', image: 'assets/img/reviews/review_box_kirill.jpg' },
      { id: 2, name: 'Юлианна', city: 'Telegram отзыв', tag: 'Подбор вслепую', image: 'assets/img/reviews/review_box_open_motto.jpg' },
      { id: 3, name: 'Екатерина', city: 'Telegram отзыв', tag: 'Подарочный бокс', image: 'assets/img/reviews/review_box_wax_ribbon.jpg' },
      { id: 4, name: 'Анастасия', city: 'Telegram отзыв', tag: 'Boss Unlimited & Сет', image: 'assets/img/reviews/review_boss_unlimited.jpg' },
      { id: 5, name: 'Максим', city: 'Telegram отзыв', tag: 'Распаковка & Подарки', image: 'assets/img/reviews/review_box_motto_unpack.jpg' },
      { id: 6, name: 'Ксения', city: 'Telegram отзыв', tag: 'Парфюмерный гардероб', image: 'assets/img/reviews/photo_viola.jpg' },
      { id: 7, name: 'Никита', city: 'Личная встреча / Telegram', tag: 'Личный подбор', image: 'assets/img/reviews/review_nikita_consult.jpg' },
    ];

    const adminCards = qsa('#scReviewsGrid .vp-review-admin-card');
    const indices = adminCards.length ? Array.from(adminCards).map((_, i) => i) : [0, 1, 2, 3, 4, 5, 6];

    return indices.map((idx) => {
      const base = baseReviews[idx] || {};
      const nameEl = $(`scRevName${idx}`);
      const tagEl = $(`scRevTag${idx}`);
      const textEl = $(`scRevText${idx}`);
      const imgEl = $(`scRevImg${idx}`);
      const posYEl = $(`scRevPosY${idx}`);

      const posY = posYEl ? Number(posYEl.value || 25) : 25;
      return {
        id: idx + 1,
        city: 'Telegram отзыв',
        name: nameEl ? nameEl.value.trim() : (base.name || ''),
        tag: tagEl ? tagEl.value.trim() : (base.tag || ''),
        text: textEl ? textEl.value.trim() : (base.text || ''),
        image: imgEl ? imgEl.value.trim() : (base.image || ''),
        objectPosition: `center ${posY}%`,
      };
    });
  }

  function bindStorefrontEvents() {
    qsa('#vpStorefrontForm input, #vpStorefrontForm textarea').forEach((el) => {
      if (!el.dataset.revSlider && !el.dataset.revImgInput && !el.id.startsWith('scRev')) {
        el.addEventListener('input', updateLiveHeroPreview);
      }
    });

    // Generic upload buttons with data-upload-target
    qsa('[data-upload-target]').forEach((inp) => {
      inp.addEventListener('change', async () => {
        const file = inp.files && inp.files[0];
        if (!file) return;
        try {
          showToast('Загрузка изображения...', 'ok');
          const res = await uploadImageFile(file, inp.dataset.uploadFolder || 'storefront');
          const targetEl = $(inp.dataset.uploadTarget);
          if (targetEl) targetEl.value = res.url;
          if (inp.dataset.previewImg && $(inp.dataset.previewImg)) {
            $(inp.dataset.previewImg).src = resolveMediaSrc(res.url);
          }
          updateLiveHeroPreview();
          showToast('Изображение успешно загружено', 'ok');
        } catch (err) {
          showToast(err.message, 'err');
        } finally {
          inp.value = '';
        }
      });
    });

    $('vpStorefrontForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const nextContent = {
        ...state.siteContent,
        brand: {
          ...(state.siteContent.brand || {}),
          title: $('scBrandTitle').value.trim() || 'VOLODIUM',
          subtitle: $('scBrandSub').value.trim() || 'Parfum',
          logo: $('scBrandLogo').value.trim(),
          favicon: $('scBrandLogo').value.trim(),
          introTitle: $('scIntroTitle').value.trim() || 'VOLODIUM',
          introSubtitle: $('scIntroSub').value.trim() || 'PARFUM',
          introEnabled: $('scIntroEnabled').checked,
        },
        hero: {
          ...(state.siteContent.hero || {}),
          badge: $('scHeroBadge').value.trim(),
          titleLine: $('scHeroTitleLine').value.trim(),
          titleAccent: $('scHeroTitleAccent').value.trim(),
          description: $('scHeroDesc').value.trim(),
          ctaCatalogText: $('scCtaCatalog').value.trim(),
          ctaQuizText: $('scCtaQuiz').value.trim(),
          ctaSecretText: $('scCtaSecret').value.trim(),
          portraitImage: $('scHeroPortraitImg').value.trim(),
          portraitPosition: `center ${$('scHeroPortraitY').value || 20}%`,
          portraitTitle: $('scHeroPortraitTitle').value.trim(),
          portraitQuote: $('scHeroPortraitQuote').value.trim(),
          backdropImage: $('scHeroBackdropImg').value.trim(),
          backdropOpacity: Number($('scHeroBackdropOpacity').value || 75) / 100,
          stats: [0, 1, 2, 3].map((idx) => ({
            value: $(`scStatVal${idx}`).value.trim(),
            label: $(`scStatLbl${idx}`).value.trim(),
          })),
        },
        consultation: {
          ...(state.siteContent.consultation || {}),
          onlineTitle: $('scConsultOnlineTitle').value.trim(),
          onlineSub: $('scConsultOnlineSub').value.trim(),
          onlinePrice: $('scConsultOnlinePrice').value.trim(),
          onlineImage: $('scConsultOnlineImg').value.trim(),
          offlineTitle: $('scConsultOfflineTitle').value.trim(),
          offlineSub: $('scConsultOfflineSub').value.trim(),
          offlinePrice: $('scConsultOfflinePrice').value.trim(),
          offlineImage: $('scConsultOfflineImg').value.trim(),
        },
        reviews: readReviewsForm(),
      };

      try {
        const res = await apiFetch('/api/admin/site-content', {
          method: 'POST',
          body: JSON.stringify(nextContent),
        });
        state.siteContent = res.siteContent || nextContent;
        notifyStorefrontSync('siteContent');
        showToast('Оформление витрины и отзывы сохранены!', 'ok');
      } catch (err) {
        showToast(err.message, 'err');
      }
    });
  }

  // ==========================================================================
  // TAB 6: COMMERCE, PROMOCODES, DELIVERY THRESHOLDS & CONTACTS
  // ==========================================================================
  let draftPromoCodes = [];

  function renderPromoCodesList() {
    const wrap = $('cmPromoList');
    if (!draftPromoCodes.length) {
      wrap.innerHTML = '<p class="vp-muted-note">Промокодов пока нет. Нажмите «+ Добавить код».</p>';
      return;
    }
    wrap.innerHTML = draftPromoCodes.map((pc, idx) => `
      <div class="vp-promo-row" data-promo-idx="${idx}">
        <input type="text" data-pfield="code" value="${esc(pc.code)}" placeholder="КОД" style="text-transform:uppercase;font-weight:700;">
        <input type="number" data-pfield="discountPercent" value="${Number(pc.discountPercent || 10)}" min="1" max="80" title="Скидка %">
        <input type="text" data-pfield="label" value="${esc(pc.label || '')}" placeholder="Описание">
        <label class="vp-checkbox-row" title="Активен"><input type="checkbox" data-pfield="active" ${pc.active !== false ? 'checked' : ''}></label>
        <button type="button" class="vp-btn vp-btn-danger-outline vp-btn-xs" data-remove-promo="${idx}">✕</button>
      </div>
    `).join('');
  }

  function populateCommerceForm() {
    const sc = state.siteContent || {};
    const pb = sc.promoBar || {};
    const cm = sc.commerce || {};
    const ct = sc.contacts || {};

    $('cmPromoBarEnabled').checked = pb.enabled !== false;
    $('cmPromoPrefix').value = pb.prefix || '';
    $('cmPromoHighlight').value = pb.highlightCode || '';
    $('cmPromoSuffix').value = pb.suffix || '';
    $('cmPromoBtnText').value = pb.buttonText || '';

    $('cmMinOrder').value = cm.minOrderThreshold != null ? cm.minOrderThreshold : 3000;
    $('cmFreeDelivery').value = cm.freeDeliveryThreshold != null ? cm.freeDeliveryThreshold : 5000;
    draftPromoCodes = JSON.parse(JSON.stringify(Array.isArray(cm.promoCodes) ? cm.promoCodes : []));
    renderPromoCodesList();

    $('cmTgHandle').value = ct.telegramHandle || 'volodiumparfum';
    $('cmChannelHandle').value = ct.channelHandle || 'vatsiik';
    $('cmWaPhone').value = ct.whatsappPhone || '79094442617';
    $('cmWaDisplay').value = ct.whatsappDisplay || '';
    $('cmVkUrl').value = ct.vkUrl || '';
    $('cmHours').value = ct.hours || '';
    $('cmAddress').value = ct.address || '';
  }

  function bindCommerceEvents() {
    $('cmAddPromoBtn').addEventListener('click', () => {
      draftPromoCodes.push({ code: 'NEW10', discountPercent: 10, active: true, label: 'Скидка 10%' });
      renderPromoCodesList();
    });

    $('cmPromoList').addEventListener('input', (e) => {
      const row = e.target.closest('[data-promo-idx]');
      if (!row) return;
      const idx = Number(row.dataset.promoIdx);
      const field = e.target.dataset.pfield;
      if (!field || !draftPromoCodes[idx]) return;
      if (field === 'active') {
        draftPromoCodes[idx].active = e.target.checked;
      } else if (field === 'discountPercent') {
        draftPromoCodes[idx].discountPercent = Math.max(1, Math.min(80, Number(e.target.value) || 0));
      } else if (field === 'code') {
        draftPromoCodes[idx].code = e.target.value.toUpperCase().trim();
      } else {
        draftPromoCodes[idx][field] = e.target.value;
      }
    });

    $('cmPromoList').addEventListener('click', (e) => {
      const del = e.target.closest('[data-remove-promo]');
      if (!del) return;
      draftPromoCodes.splice(Number(del.dataset.removePromo), 1);
      renderPromoCodesList();
    });

    $('vpCommerceForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      const cleanedPromos = draftPromoCodes
        .filter((x) => String(x.code || '').trim().length > 0)
        .map((x) => ({
          code: String(x.code).toUpperCase().trim(),
          discountPercent: Number(x.discountPercent) || 10,
          active: x.active !== false,
          label: String(x.label || '').trim(),
        }));

      const nextContent = {
        ...state.siteContent,
        promoBar: {
          enabled: $('cmPromoBarEnabled').checked,
          prefix: $('cmPromoPrefix').value.trim(),
          highlightCode: $('cmPromoHighlight').value.toUpperCase().trim(),
          suffix: $('cmPromoSuffix').value.trim(),
          buttonText: $('cmPromoBtnText').value.trim(),
        },
        commerce: {
          minOrderThreshold: Math.max(0, Number($('cmMinOrder').value) || 0),
          freeDeliveryThreshold: Math.max(0, Number($('cmFreeDelivery').value) || 0),
          promoCodes: cleanedPromos,
        },
        contacts: {
          ...(state.siteContent.contacts || {}),
          telegramHandle: $('cmTgHandle').value.replace(/^@/, '').trim(),
          channelHandle: $('cmChannelHandle').value.replace(/^@/, '').trim(),
          whatsappPhone: $('cmWaPhone').value.replace(/\D/g, ''),
          whatsappDisplay: $('cmWaDisplay').value.trim(),
          vkUrl: $('cmVkUrl').value.trim(),
          vkDisplay: $('cmVkUrl').value.replace(/^https?:\/\//, '').trim(),
          hours: $('cmHours').value.trim(),
          address: $('cmAddress').value.trim(),
        },
      };

      try {
        const res = await apiFetch('/api/admin/site-content', {
          method: 'POST',
          body: JSON.stringify(nextContent),
        });
        state.siteContent = res.siteContent || nextContent;
        notifyStorefrontSync('commerce');
        showToast('Промокоды, доставка и контакты обновлены', 'ok');
      } catch (err) {
        showToast(err.message, 'err');
      }
    });
  }

  // ==========================================================================
  // TAB 7: AUDIT LOG TABLE
  // ==========================================================================
  function renderAuditTable(logs) {
    const tbody = $('vpAuditTbody');
    if (!logs || !logs.length) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:24px;color:var(--text-muted);">Записей не найдено</td></tr>';
      return;
    }
    tbody.innerHTML = logs.map((r) => {
      const roleCls = r.operator_role === 'owner' ? 'wine' : 'muted';
      const actCls = r.action === 'AUTH_FAIL' || r.action === 'DELETE' ? 'danger' : r.action === 'BULK_PRICE' || r.action === 'PRICE_ROLLBACK' ? 'warn' : 'ok';
      return `
        <tr>
          <td style="white-space:nowrap;">${esc(r.created_at)}</td>
          <td><span class="vp-tag ${roleCls}">${esc(r.operator_name)}</span></td>
          <td><span class="vp-tag ${actCls}">${esc(r.action)}</span></td>
          <td>${esc(r.summary)}</td>
          <td style="font-family:monospace;font-size:11.5px;">${esc(r.ip || '—')}</td>
        </tr>
      `;
    }).join('');
  }

  async function loadAuditTable() {
    try {
      const op = $('auditOperatorFilter').value;
      const act = $('auditActionFilter').value;
      const data = await apiFetch(`/api/admin/audit?operator=${encodeURIComponent(op)}&action=${encodeURIComponent(act)}`);
      renderAuditTable(data.logs || []);
    } catch (err) {
      showToast(err.message, 'err');
    }
  }

  function bindAuditEvents() {
    $('auditOperatorFilter').addEventListener('change', loadAuditTable);
    $('auditActionFilter').addEventListener('change', loadAuditTable);
  }

  // ==========================================================================
  // TAB 8: SECURITY TOKENS, PASSWORD & BACKUPS
  // ==========================================================================
  async function loadSecurityTab() {
    const isOwner = state.operatorRole === 'owner';
    $('vpSecurityOwnerNotice').hidden = isOwner;
    $('vpChangePassForm').style.display = isOwner ? '' : 'none';
    const mgr = $('vpTokensManager');
    if (!isOwner) {
      mgr.innerHTML = '';
      return;
    }

    try {
      const data = await apiFetch('/api/auth/tokens');
      const origin = window.location.origin;
      const ownerFullUrl = `${origin}${data.adminPath}?token=${data.ownerToken}`;
      const assistFullUrl = `${origin}${data.adminPath}?token=${data.assistantToken}`;

      mgr.innerHTML = `
        <div class="vp-token-box">
          <div class="vp-token-head">
            <strong>👑 Секретная ссылка Владимира (Владелец)</strong>
            <div style="display:flex;gap:6px;">
              <button type="button" class="vp-btn vp-btn-outline vp-btn-xs" data-copy-url="${esc(ownerFullUrl)}">Копировать</button>
              <button type="button" class="vp-btn vp-btn-danger-outline vp-btn-xs" data-rotate-role="owner">Перевыпустить</button>
            </div>
          </div>
          <div class="vp-token-url">${esc(ownerFullUrl)}</div>
        </div>
        <div class="vp-token-box">
          <div class="vp-token-head">
            <strong>👩‍💼 Секретная ссылка Помощницы</strong>
            <div style="display:flex;gap:6px;">
              <button type="button" class="vp-btn vp-btn-outline vp-btn-xs" data-copy-url="${esc(assistFullUrl)}">Копировать</button>
              <button type="button" class="vp-btn vp-btn-danger-outline vp-btn-xs" data-rotate-role="assistant">Перевыпустить</button>
            </div>
          </div>
          <div class="vp-token-url">${esc(assistFullUrl)}</div>
        </div>
      `;
    } catch (err) {
      mgr.innerHTML = `<p class="vp-muted-note">${esc(err.message)}</p>`;
    }
  }

  async function downloadWithAuth(url, filename) {
    const headers = new Headers();
    if (state.sessionToken) headers.set('Authorization', `Bearer ${state.sessionToken}`);
    if (inMemoryGateToken) headers.set('X-Gateway-Token', inMemoryGateToken);
    const res = await fetch(url, { headers, credentials: 'same-origin' });
    if (!res.ok) throw new Error('Не удалось выгрузить файл');
    const blob = await res.blob();
    const objUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(objUrl);
  }

  function bindSecurityEvents() {
    $('vpTokensManager').addEventListener('click', async (e) => {
      const copyBtn = e.target.closest('[data-copy-url]');
      if (copyBtn) {
        try {
          await navigator.clipboard.writeText(copyBtn.dataset.copyUrl);
          showToast('Ссылка скопирована в буфер обмена', 'ok');
        } catch (_) {
          showToast('Скопируйте ссылку вручную из рамки', 'err');
        }
        return;
      }

      const rotBtn = e.target.closest('[data-rotate-role]');
      if (rotBtn) {
        const role = rotBtn.dataset.rotateRole;
        const label = role === 'owner' ? 'Владимира' : 'Помощницы';
        if (!window.confirm(`Перевыпустить токен доступа для ${label}?\nСтарая ссылка перестанет открываться (вернёт 404).`)) return;
        try {
          await apiFetch('/api/auth/rotate-token', {
            method: 'POST',
            body: JSON.stringify({ role }),
          });
          showToast(`Токен для ${label} перевыпущен`, 'ok');
          await loadSecurityTab();
        } catch (err) {
          showToast(err.message, 'err');
        }
      }
    });

    $('vpChangePassForm').addEventListener('submit', async (e) => {
      e.preventDefault();
      try {
        await apiFetch('/api/auth/change-password', {
          method: 'POST',
          body: JSON.stringify({
            currentPassword: $('secCurrentPass').value,
            newPassword: $('secNewPass').value,
          }),
        });
        $('secCurrentPass').value = '';
        $('secNewPass').value = '';
        showToast('Мастер-пароль успешно обновлён', 'ok');
      } catch (err) {
        showToast(err.message, 'err');
      }
    });

    $('secRevokeAllBtn').addEventListener('click', async () => {
      if (!window.confirm('Завершить все открытые админ-сессии на всех устройствах?')) return;
      try {
        await apiFetch('/api/auth/revoke-all-sessions', { method: 'POST' });
        handleUnauthorized();
      } catch (err) {
        showToast(err.message, 'err');
      }
    });

    $('btnExportJsonBackup').addEventListener('click', async () => {
      try {
        await downloadWithAuth('/api/admin/backup/export', `volodium_backup_${new Date().toISOString().slice(0, 10)}.json`);
        showToast('JSON-бэкап скачан', 'ok');
      } catch (err) {
        showToast(err.message, 'err');
      }
    });

    $('btnExportPerfumesJs').addEventListener('click', async () => {
      try {
        await downloadWithAuth('/api/admin/backup/export-js', 'perfumes.js');
        showToast('Файл perfumes.js скачан', 'ok');
      } catch (err) {
        showToast(err.message, 'err');
      }
    });

    $('inputRestoreBackup').addEventListener('change', async () => {
      const file = $('inputRestoreBackup').files && $('inputRestoreBackup').files[0];
      if (!file) return;
      if (!window.confirm('Восстановить каталог из выбранного JSON-бэкапа? Перед этим будет создан автоматический снимок цен.')) {
        $('inputRestoreBackup').value = '';
        return;
      }
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const res = await apiFetch('/api/admin/backup/restore', {
          method: 'POST',
          body: JSON.stringify(parsed),
        });
        showToast(`Восстановлено: ${res.perfumes} духов, ${res.aromaboxes} боксов`, 'ok');
        notifyStorefrontSync('restore');
        await loadStudioOverview();
      } catch (err) {
        showToast(err.message || 'Ошибка чтения бэкапа', 'err');
      } finally {
        $('inputRestoreBackup').value = '';
      }
    });
  }

  // ==========================================================================
  // INIT
  // ==========================================================================
  document.addEventListener('DOMContentLoaded', () => {
    bindAuthEvents();
    bindNavigationEvents();
    bindOverviewQuickActions();
    bindCatalogEvents();
    bindPerfumeModalEvents();
    bindPricingEvents();
    bindBoxesEvents();
    bindStorefrontEvents();
    bindCommerceEvents();
    bindAuditEvents();
    bindSecurityEvents();
    bootAuth();
  });
})();
