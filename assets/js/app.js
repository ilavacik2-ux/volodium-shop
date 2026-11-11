/**
 * VOLODIUM PARFUM — Application Logic & Interactive Experience
 * Pure modern vanilla JS (ES6+), 60fps animations, interactive aroma pyramid,
 * interactive fragrance quiz, 3D certificate studio, and real-time cart.
 */

// Force browser to always restore to top of homepage on page reload
if (typeof history !== 'undefined' && 'scrollRestoration' in history) {
  history.scrollRestoration = 'manual';
}
if (!window.location.hash) {
  window.scrollTo(0, 0);
}
window.addEventListener('beforeunload', () => {
  if (!window.location.hash) window.scrollTo(0, 0);
});

const SEASON_PRESET_META = {
  'Круглый год': { seasonIcon: '🌸', timeOfDay: 'День & Вечер', timeIcon: '✨' },
  'Весна — Лето': { seasonIcon: '☀️', timeOfDay: 'Идеально на день', timeIcon: '☀️' },
  'Осень — Зима': { seasonIcon: '🍂', timeOfDay: 'Вечер / Особый случай', timeIcon: '🌙' },
  'Весна — Осень': { seasonIcon: '🌿', timeOfDay: 'День & Романтический вечер', timeIcon: '✨' },
  'Зима': { seasonIcon: '❄️', timeOfDay: 'Морозный день & Вечер', timeIcon: '❄️' },
  'Лето': { seasonIcon: '🍋', timeOfDay: 'Лёгкий дневной шлейф', timeIcon: '☀️' }
};

let DYNAMIC_PROMO_CODES = [
  { code: 'СТАРТ', discountPercent: 10, active: true, label: 'Скидка 10% на первый заказ' },
  { code: 'START', discountPercent: 10, active: true, label: 'Скидка 10%' },
  { code: 'VOLODIUM', discountPercent: 15, active: true, label: 'Клубная скидка 15%' },
  { code: 'VOVA', discountPercent: 15, active: true, label: 'Персональная скидка 15%' }
];

let ACTIVE_CONTACTS = {
  telegramHandle: 'volodiumparfum',
  channelHandle: 'vatsiik',
  whatsappPhone: '79094442617',
  whatsappDisplay: '+7 (909) 444-26-17',
  vkUrl: 'https://vk.ru/volodya_v_v',
  vkDisplay: 'vk.ru/volodya_v_v',
  address: 'Самовывоз Ⓜ️ Автозаводская',
  hours: 'Ежедневно 10:00 — 22:00 МСК'
};

let ACTIVE_SITE_CONTENT = null;

function resolveSafeMediaUrl(raw, fallback = 'assets/images/noroot.png') {
  const s = String(raw || '').trim();
  if (!s) return fallback;
  if (/^(javascript|vbscript|data:text\/html):/i.test(s)) return fallback;
  return s;
}

function syncSecretBoxesDom() {
  if (typeof SECRET_BOXES_DATA === 'undefined' || !Array.isArray(SECRET_BOXES_DATA)) return;
  const tabs = document.querySelectorAll('.secret-tab-btn');
  SECRET_BOXES_DATA.forEach((sb, idx) => {
    const card = document.querySelector(`.secret-card[data-secret-id="${sb.id}"]`) || document.querySelectorAll('.secret-card')[idx];
    if (!card) return;
    card.dataset.secretId = sb.id;
    card.classList.toggle('hit', Boolean(sb.isHit));

    const hitBadge = card.querySelector('.secret-badge-hit');
    if (hitBadge) {
      if (sb.badge && String(sb.badge).trim()) {
        hitBadge.textContent = sb.badge;
        hitBadge.style.display = '';
      } else {
        hitBadge.style.display = 'none';
      }
    }

    const img = card.querySelector('.secret-card-img-wrap img');
    if (img && sb.image) {
      img.src = resolveSafeMediaUrl(sb.image, img.getAttribute('src') || 'assets/img/aromaboxes/secret_box_explorer.jpg');
      img.alt = sb.name || sb.level || 'Secret Box';
      if (sb.objectPosition) img.style.objectPosition = sb.objectPosition;
    }

    const levelEl = card.querySelector('.secret-card-level');
    if (levelEl) levelEl.textContent = sb.level || sb.name || '';
    if (tabs[idx]) {
      const span = tabs[idx].querySelector('span');
      const tabTitle = sb.level || sb.name || '';
      if (span) span.textContent = sb.isHit ? `★ ${tabTitle}` : tabTitle;
    }

    const subEl = card.querySelector('.secret-card-sub');
    if (subEl && sb.subtitle != null) subEl.textContent = sb.subtitle;

    const descEl = card.querySelector('.secret-card-desc');
    if (descEl && sb.description != null) descEl.textContent = sb.description;

    const featList = card.querySelector('.secret-features-list');
    if (featList && Array.isArray(sb.features) && sb.features.length > 0) {
      featList.innerHTML = sb.features.map(f => `
        <li class="secret-feature-item">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>
          <span>${escapeHtml(String(f))}</span>
        </li>
      `).join('');
    }

    const curPriceEl = card.querySelector('.secret-current-price');
    if (curPriceEl && sb.price != null) curPriceEl.textContent = formatPrice(sb.price);

    const oldPriceEl = card.querySelector('.secret-old-price');
    if (oldPriceEl) {
      if (sb.oldPrice && Number(sb.oldPrice) > Number(sb.price || 0)) {
        oldPriceEl.textContent = formatPrice(sb.oldPrice);
        oldPriceEl.style.display = '';
      } else {
        oldPriceEl.style.display = 'none';
      }
    }
  });
}

function applySiteContent(sc) {
  if (!sc || typeof sc !== 'object') return;
  ACTIVE_SITE_CONTENT = sc;

  try {
    // 1. Brand, Logo, Favicon & Monroe Intro
    if (sc.brand) {
      const b = sc.brand;
      const bTitle = b.title || 'VOLODIUM';
      const bSub = b.subtitle || 'Parfum';
      document.querySelectorAll('.brand-title, .v-drawer-brand-name, .footer-brand-title').forEach(el => {
        el.textContent = bTitle;
      });
      document.querySelectorAll('.brand-sub, .v-drawer-brand-sub').forEach(el => {
        el.textContent = bSub;
      });
      const crestChar = bTitle.trim().charAt(0).toUpperCase() || 'V';
      document.querySelectorAll('.v-drawer-crest, .footer-emblem').forEach(el => {
        el.textContent = crestChar;
      });
      if (b.logo) {
        const logoSrc = resolveSafeMediaUrl(b.logo, 'assets/images/E610BB2F-DBAE-4672-9.PNG');
        document.querySelectorAll('.brand-logo-img').forEach(img => {
          img.src = logoSrc;
          img.alt = bTitle;
        });
      }
      const favHref = b.favicon || b.logo;
      if (favHref) {
        const safeFav = resolveSafeMediaUrl(favHref, 'assets/images/E610BB2F-DBAE-4672-9.PNG');
        document.querySelectorAll('link[rel="icon"], link[rel="apple-touch-icon"]').forEach(link => {
          link.href = safeFav;
        });
      }
      const grandTitle = document.getElementById('monroeGrandTitle');
      if (grandTitle && b.introTitle && b.introTitle.trim()) {
        const letters = Array.from(b.introTitle.trim());
        grandTitle.setAttribute('aria-label', b.introTitle.trim());
        grandTitle.innerHTML = letters.map((ch, i) =>
          `<span class="monroe-title-letter" style="--l-idx: ${i}">${escapeHtml(ch)}</span>`
        ).join('');
      }
      const grandSub = document.querySelector('#monroeGrandSub .mgs-word');
      if (grandSub && b.introSubtitle != null) {
        grandSub.textContent = b.introSubtitle;
      }
      if (b.introEnabled === false) {
        if (typeof window.dismissMonroeIntro === 'function') {
          window.dismissMonroeIntro();
        } else {
          const introEl = document.getElementById('monroeIntro');
          if (introEl) introEl.classList.add('hidden');
          document.documentElement.classList.remove('intro-active');
          document.body.classList.remove('intro-active');
          document.documentElement.style.overflow = '';
          document.body.style.overflow = '';
        }
      }
    }

    // 2. Top Promo Bar
    if (sc.promoBar) {
      const pb = sc.promoBar;
      const bar = document.getElementById('promoTopBar');
      if (bar) {
        bar.style.display = pb.enabled === false ? 'none' : '';
        const textEl = bar.querySelector('.promo-bar-text');
        const hiCode = (pb.highlightCode || '').trim();
        if (textEl) {
          textEl.innerHTML = `${escapeHtml(pb.prefix || '')} ${hiCode ? `<strong class="promo-highlight">${escapeHtml(hiCode)}</strong>` : ''} ${escapeHtml(pb.suffix || '')}`.trim();
        }
        const btnEl = document.getElementById('btnCopyTopPromo');
        if (btnEl) {
          btnEl.textContent = pb.buttonText || 'Применить в корзине';
          btnEl.onclick = () => window.copyPromoCode(hiCode || 'СТАРТ');
        }
      }
    }

    // 3. Hero Texts, Portrait, Backdrop & Stats
    if (sc.hero) {
      const h = sc.hero;
      const badgeSpan = document.querySelector('#hero .hero-badge span:last-child');
      if (badgeSpan && h.badge) badgeSpan.textContent = h.badge;

      const titleMain = document.querySelector('#hero .hero-title-main');
      if (titleMain && (h.titleLine != null || h.titleAccent != null)) {
        titleMain.textContent = '';
        titleMain.appendChild(document.createTextNode((h.titleLine || 'Открой. Вдохни.') + ' '));
        const acc = document.createElement('span');
        acc.className = 'hero-serif-accent';
        acc.textContent = h.titleAccent || 'Почувствуй.';
        titleMain.appendChild(acc);
      }

      const heroDesc = document.querySelector('#hero .hero-description');
      if (heroDesc && h.description != null) heroDesc.textContent = h.description;

      const ctaCat = document.querySelector('#hero .hero-actions a[href*="catalog"] span');
      if (ctaCat && h.ctaCatalogText) ctaCat.textContent = h.ctaCatalogText;
      const ctaQuiz = document.querySelector('#hero .hero-actions a[href*="quiz"] span');
      if (ctaQuiz && h.ctaQuizText) ctaQuiz.textContent = h.ctaQuizText;
      const ctaSec = document.querySelector('#hero .hero-actions a[href*="secret-boxes"] span');
      if (ctaSec && h.ctaSecretText) ctaSec.textContent = h.ctaSecretText;

      if (Array.isArray(h.stats)) {
        const statItems = document.querySelectorAll('#hero .hero-stats .stat-item');
        h.stats.forEach((st, idx) => {
          if (!statItems[idx] || !st) return;
          const numEl = statItems[idx].querySelector('.stat-number');
          const lblEl = statItems[idx].querySelector('.stat-label');
          if (numEl && st.value != null) numEl.textContent = st.value;
          if (lblEl && st.label != null) lblEl.textContent = st.label;
        });
      }

      const portraitImg = document.getElementById('heroLookbookImg');
      if (portraitImg) {
        if (h.portraitImage) portraitImg.src = resolveSafeMediaUrl(h.portraitImage, HERO_PORTRAIT.image);
        if (h.portraitPosition) portraitImg.style.objectPosition = h.portraitPosition;
      }
      const pTitle = document.getElementById('heroLookbookTitle');
      if (pTitle && h.portraitTitle != null) pTitle.textContent = h.portraitTitle;
      const pSub = document.getElementById('heroLookbookSub');
      if (pSub && h.portraitQuote != null) pSub.textContent = h.portraitQuote;

      const backdropImg = document.getElementById('heroBackdropImg');
      if (backdropImg) {
        if (h.backdropImage) {
          const safeBg = resolveSafeMediaUrl(h.backdropImage, HERO_BACKDROP_IMAGE).replace(/["\\]/g, '');
          backdropImg.style.backgroundImage = `url("${safeBg}")`;
        }
        if (h.backdropOpacity != null) {
          const op = Math.min(1, Math.max(0.05, Number(h.backdropOpacity) || 0.75));
          backdropImg.style.opacity = String(op);
        }
      }
    }

    // 4. Consultation Cards
    if (sc.consultation) {
      const c = sc.consultation;
      const cards = document.querySelectorAll('#consultation .consult-method-card');
      if (cards[0]) {
        const img = cards[0].querySelector('.method-card-media img');
        const h3 = cards[0].querySelector('.method-card-heading');
        const sub = cards[0].querySelector('.method-card-subheading');
        const pr = cards[0].querySelector('.method-price-amount');
        const note = cards[0].querySelector('.method-price-note');
        if (img && c.onlineImage) img.src = resolveSafeMediaUrl(c.onlineImage, img.getAttribute('src'));
        if (h3 && c.onlineTitle != null) h3.textContent = c.onlineTitle;
        if (sub && c.onlineSub != null) sub.textContent = c.onlineSub;
        if (pr && c.onlinePrice != null) pr.textContent = c.onlinePrice;
        if (note && c.onlineNote != null) note.textContent = c.onlineNote;
      }
      if (cards[1]) {
        const img = cards[1].querySelector('.method-card-media img');
        const h3 = cards[1].querySelector('.method-card-heading');
        const sub = cards[1].querySelector('.method-card-subheading');
        const pr = cards[1].querySelector('.method-price-amount');
        const note = cards[1].querySelector('.method-price-note');
        if (img && c.offlineImage) img.src = resolveSafeMediaUrl(c.offlineImage, img.getAttribute('src'));
        if (h3 && c.offlineTitle != null) h3.textContent = c.offlineTitle;
        if (sub && c.offlineSub != null) sub.textContent = c.offlineSub;
        if (pr && c.offlinePrice != null) pr.textContent = c.offlinePrice;
        if (note && c.offlineNote != null) note.textContent = c.offlineNote;
      }
    }

    // 5. Reviews & Unboxings (Live Text, Photos & Vertical Crop)
    if (Array.isArray(sc.reviews)) {
      const grid = document.querySelector('.reviews-editorial-grid');
      let reviewCards = document.querySelectorAll('.reviews-editorial-grid .review-editorial-card');
      if (grid && sc.reviews.length > reviewCards.length) {
        for (let i = reviewCards.length; i < sc.reviews.length; i++) {
          const r = sc.reviews[i];
          if (!r) continue;
          const art = document.createElement('article');
          art.className = 'review-editorial-card';
          art.innerHTML = `
            <div class="rec-top">
              <div class="rec-stars" aria-label="Оценка 5 из 5">★★★★★</div>
              <span class="rec-tag">${r.tag || ''}</span>
            </div>
            <div class="rec-client">
              <span class="rec-name">${r.name || ''}</span>
              <span class="rec-city">${r.city || 'Telegram отзыв'}</span>
            </div>
            <p class="rec-text">${r.text || ''}</p>
            <div class="rec-photo-thumb">
              <img src="${resolveSafeMediaUrl(r.image, '')}" alt="${r.name || ''}" loading="lazy" decoding="async" style="object-position: ${r.objectPosition || 'center 25%'};">
            </div>
          `;
          grid.appendChild(art);
        }
        reviewCards = document.querySelectorAll('.reviews-editorial-grid .review-editorial-card');
      }

      sc.reviews.forEach((r, idx) => {
        const card = reviewCards[idx];
        if (!card || !r) return;
        const tag = card.querySelector('.rec-tag');
        if (tag && r.tag) tag.textContent = r.tag;
        const name = card.querySelector('.rec-name');
        if (name && r.name) name.textContent = r.name;
        const city = card.querySelector('.rec-city');
        if (city && r.city) city.textContent = r.city;
        const text = card.querySelector('.rec-text');
        if (text && r.text) text.textContent = r.text;
        const img = card.querySelector('.rec-photo-thumb img');
        if (img) {
          if (r.image) img.src = resolveSafeMediaUrl(r.image, img.getAttribute('src') || '');
          if (r.objectPosition) img.style.objectPosition = r.objectPosition;
        }
      });
    }

    // 5. Commerce Thresholds & Promo Codes
    if (sc.commerce) {
      const cm = sc.commerce;
      if (cm.minOrderThreshold != null && !Number.isNaN(Number(cm.minOrderThreshold))) {
        MIN_ORDER_THRESHOLD = Math.max(0, Number(cm.minOrderThreshold));
      }
      if (cm.freeDeliveryThreshold != null && !Number.isNaN(Number(cm.freeDeliveryThreshold))) {
        FREE_DELIVERY_THRESHOLD = Math.max(0, Number(cm.freeDeliveryThreshold));
      }
      if (Array.isArray(cm.promoCodes)) {
        DYNAMIC_PROMO_CODES = cm.promoCodes;
      }

      document.querySelectorAll('#dfPanelDelivery .dcr-badge-free').forEach(el => {
        el.textContent = `Бесплатно от ${formatPrice(FREE_DELIVERY_THRESHOLD)}`;
      });
      const dgbStrong = document.querySelectorAll('#delivery .delivery-guarantee-bar .dgb-text strong');
      if (dgbStrong.length >= 2) {
        dgbStrong[dgbStrong.length - 1].textContent = formatPrice(MIN_ORDER_THRESHOLD);
      }
      const cartDelivNote = document.querySelector('.cart-delivery-calc-note');
      if (cartDelivNote) {
        cartDelivNote.textContent = `По тарифам СДЭК (от ${formatPrice(FREE_DELIVERY_THRESHOLD)} бесплатно)`;
      }
      const sdekOpt = document.querySelector('#orderDelivery option[value^="СДЭК по России"]');
      if (sdekOpt) {
        sdekOpt.textContent = `СДЭК по России (Бесплатно от ${formatPrice(FREE_DELIVERY_THRESHOLD)} / 300 ₽)`;
      }
      const faqItems = document.querySelectorAll('#dfPanelFaq .faq-item .faq-answer');
      if (faqItems[1]) {
        faqItems[1].textContent = `Минимальная сумма заказа составляет ${formatPrice(MIN_ORDER_THRESHOLD)}. Это позволяет обеспечить бесплатную премиальную крафтовую упаковку и оперативную отправку день-в-день.`;
      }

      if (appliedPromo && typeof findActivePromo === 'function') {
        const refreshedPromo = findActivePromo(appliedPromo.code);
        if (refreshedPromo) {
          appliedPromo.discountPercent = Math.min(90, Math.max(1, Number(refreshedPromo.discountPercent) || 10));
        }
      }

      const firstActivePromo = DYNAMIC_PROMO_CODES.find(p => p && p.active !== false);
      const promoInp = document.getElementById('promoCodeInput');
      const promoTip = document.querySelector('.promo-tip');
      if (firstActivePromo) {
        if (promoInp) promoInp.placeholder = `Промокод (${firstActivePromo.code})`;
        if (promoTip) {
          promoTip.style.display = '';
          promoTip.innerHTML = `✦ Скидка ${Number(firstActivePromo.discountPercent || 10)}% на ваш заказ по промокоду <strong>${escapeHtml(firstActivePromo.code)}</strong>`;
        }
      } else {
        if (promoInp) promoInp.placeholder = 'Введите промокод';
        if (promoTip) promoTip.style.display = 'none';
      }
    }

    // 6. Contacts
    if (sc.contacts) {
      const ct = sc.contacts;
      const tg = (ct.telegramHandle || 'volodiumparfum').replace(/^@/, '').trim();
      const ch = (ct.channelHandle || 'vatsiik').replace(/^@/, '').trim();
      const waPhone = (ct.whatsappPhone || '79094442617').replace(/\D/g, '') || '79094442617';
      const waDisp = ct.whatsappDisplay || '+7 (909) 444-26-17';
      const rawVkUrl = String(ct.vkUrl || 'https://vk.ru/volodya_v_v').trim();
      const vkUrl = /^https?:\/\//i.test(rawVkUrl) ? rawVkUrl : 'https://vk.ru/volodya_v_v';
      const vkDisp = ct.vkDisplay || vkUrl.replace(/^https?:\/\//, '');
      const rawAddress = (ct.address || '').trim();
      const address = (!rawAddress || /23\s*к\s*7/i.test(rawAddress)) ? 'Самовывоз Ⓜ️ Автозаводская' : rawAddress;
      const hours = ct.hours || 'Ежедневно 10:00 — 22:00 МСК';

      ACTIVE_CONTACTS = { telegramHandle: tg, channelHandle: ch, whatsappPhone: waPhone, whatsappDisplay: waDisp, vkUrl, vkDisplay: vkDisp, address, hours };

      document.querySelectorAll('a[href^="https://t.me/"]').forEach(a => {
        const href = a.getAttribute('href') || '';
        const qIdx = href.indexOf('?');
        const query = qIdx !== -1 ? href.slice(qIdx) : '';
        const handlePart = href.slice('https://t.me/'.length, qIdx !== -1 ? qIdx : undefined);
        const rowLbl = (a.closest('.footer-contact-row')?.querySelector('.fc-label')?.textContent || '').toLowerCase();
        const isChannelLink = a.classList.contains('reviews-tg-pill') || a.classList.contains('footer-channel-badge') || rowLbl.includes('канал') || (a.closest('.footer-contact-row') && (handlePart === 'vatsiik' || (a.textContent || '').includes('@vatsiik')));
        const nextHandle = isChannelLink ? ch : tg;
        a.setAttribute('href', `https://t.me/${encodeURIComponent(nextHandle)}${query}`);
      });

      const revPillSpan = document.querySelector('#reviews .reviews-tg-pill span');
      if (revPillSpan) revPillSpan.textContent = `Telegram-канал эксперта: распаковки и свежие поступления (@${ch})`;

      document.querySelectorAll('.footer-contact-row').forEach(row => {
        const lbl = (row.querySelector('.fc-label')?.textContent || '').toLowerCase();
        const valEl = row.querySelector('a, .fc-val, .fc-val-muted');
        if (!valEl) return;
        if (lbl.includes('связь в telegram')) {
          valEl.innerHTML = `@${escapeHtml(tg)} <small style="color: #D4AF37; font-weight:600;">(быстрее всего)</small>`;
        } else if (lbl.includes('whatsapp')) {
          valEl.textContent = waDisp;
          valEl.setAttribute('href', `https://wa.me/${waPhone}`);
        } else if (lbl.includes('вконтакте')) {
          valEl.textContent = vkDisp;
          valEl.setAttribute('href', vkUrl);
        } else if (lbl.includes('канал')) {
          valEl.textContent = `@${ch}`;
        } else if (lbl.includes('режим')) {
          valEl.textContent = hours;
        }
      });

      document.querySelectorAll('a[href^="https://wa.me/"]').forEach(a => a.setAttribute('href', `https://wa.me/${waPhone}`));
      document.querySelectorAll('a[href^="https://vk.ru/"], a[href^="https://vk.com/"]').forEach(a => a.setAttribute('href', vkUrl));

      const drawerSub = document.querySelector('.v-drawer-tg-sub');
      if (drawerSub) drawerSub.textContent = `Быстрый ответ @${tg}`;
      document.querySelectorAll('.v-drawer-loc, .footer-showroom-item .fsi-line').forEach(el => {
        el.textContent = address;
      });
      const pickupOpt = document.querySelector('#orderDelivery option[value*="Самовывоз"]');
      if (pickupOpt) pickupOpt.textContent = address.includes('Самовывоз') ? address : `Самовывоз Москва (${address})`;
      const waCheckoutSub = document.querySelector('.cms-btn[data-messenger="WhatsApp"] .cms-speed-time');
      if (waCheckoutSub) waCheckoutSub.textContent = waDisp;
      const vkCheckoutSub = document.querySelector('.cms-btn[data-messenger="VK"] .cms-speed-time');
      if (vkCheckoutSub) vkCheckoutSub.textContent = vkDisp;
      const activeMessenger = document.querySelector('.cms-btn.active')?.getAttribute('data-messenger') || 'Telegram';
      if (typeof getCheckoutMessengerMeta === 'function') {
        const cfg = getCheckoutMessengerMeta(activeMessenger);
        const chHint = document.getElementById('checkoutMessengerHint');
        const subTxt = document.getElementById('btnCheckoutSubmitText');
        if (chHint) chHint.textContent = cfg.hint;
        if (subTxt) subTxt.textContent = cfg.btnText;
      }
    }
  } catch (err) {
    console.warn('Site content hydration notice:', err);
  }

  syncSecretBoxesDom();
  if (typeof renderCartDrawer === 'function') renderCartDrawer();
}

async function loadBootstrapFromApi(isLiveSync = false) {
  try {
    const res = await fetch('/api/bootstrap', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    if (Array.isArray(data.perfumes)) {
      window.PERFUMES_DATA = data.perfumes;
      if (typeof PERFUMES_DATA !== 'undefined') PERFUMES_DATA = data.perfumes;
    }
    if (Array.isArray(data.aromaboxes)) {
      window.AROMA_BOXES_DATA = data.aromaboxes;
      if (typeof AROMA_BOXES_DATA !== 'undefined') AROMA_BOXES_DATA = data.aromaboxes;
    }
    if (Array.isArray(data.secretBoxes)) {
      window.SECRET_BOXES_DATA = data.secretBoxes;
      if (typeof SECRET_BOXES_DATA !== 'undefined') SECRET_BOXES_DATA = data.secretBoxes;
    }
    if (data.siteContent) {
      applySiteContent(data.siteContent);
    }
    if (typeof renderCatalog === 'function') renderCatalog(false);
    if (typeof renderAromaBoxes === 'function') renderAromaBoxes();
    syncSecretBoxesDom();
    if (isLiveSync && typeof showToast === 'function') {
      showToast('Витрина обновлена в реальном времени');
    }
  } catch (_) {
    // Graceful static fallback when served without Python backend
  }
}

document.addEventListener('DOMContentLoaded', () => {
  if (!window.location.hash) {
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }

  // Initialize all subsystems cleanly from static bundle first
  initMonroeIntro();
  initHeroCanvas();
  initHeroLookbook();
  initNavServicesDropdown();
  if (typeof VOLODIUM_SITE_CONTENT !== 'undefined') {
    applySiteContent(VOLODIUM_SITE_CONTENT);
  } else {
    syncSecretBoxesDom();
  }
  initCatalog();
  initCart();
  initQuiz();
  initCertificates();
  initFAQ();
  initCookieBanner();
  initSmoothScroll();
  initVolodiumDrawer();
  init3DTiltCards();
  initFloatingBackTop();
  initSecretBoxesCarousel();
  initReviewsCarousel();

  // Then hydrate live database state from backend API + listen for cross-tab studio updates
  loadBootstrapFromApi(false);
  if (typeof BroadcastChannel !== 'undefined') {
    const ch = new BroadcastChannel('volodium_sync');
    ch.addEventListener('message', () => loadBootstrapFromApi(true));
  }
  window.addEventListener('storage', (e) => {
    if (e.key === 'volodium_sync_ts') loadBootstrapFromApi(true);
  });
});

window.addEventListener('load', () => {
  if (!window.location.hash) {
    window.scrollTo(0, 0);
  }
});

/* ==========================================================================
   0. Monroe Handwriting Intro Controller
   ========================================================================== */
function initMultiPageActiveNav() {
  const path = (window.location.pathname.split('/').pop() || 'index.html').toLowerCase();
  const current = path === '' ? 'index.html' : path;
  document.querySelectorAll('.nav-desktop .nav-link, .nav-dropdown-item, .v-drawer-link, .mobile-bottom-dock .dock-item').forEach(el => {
    const href = (el.getAttribute('href') || '').split('#')[0].toLowerCase();
    if (!href) return;
    if (href === current || (current === 'index.html' && (href === '#' || href === 'index.html'))) {
      el.classList.add('is-active-page');
    }
  });
}

function initMonroeIntro() {
  const intro = document.getElementById('monroeIntro');
  const replayBtn = document.getElementById('btnReplayIntro');
  initMultiPageActiveNav();
  if (!intro) return;

  try {
    if (sessionStorage.getItem('vp_intro_seen') === '1' || window.location.hash) {
      intro.classList.add('hidden');
      document.documentElement.classList.remove('intro-active');
      document.body.classList.remove('intro-active');
      document.documentElement.style.overflow = '';
      document.body.style.overflow = '';
      document.body.style.backgroundColor = '';
      return;
    }
    sessionStorage.setItem('vp_intro_seen', '1');
  } catch (e) {}

  let autoTimer = null;
  let canDismiss = false;

  // Lock scroll while intro is playing on both html and body
  document.documentElement.style.overflow = 'hidden';
  document.body.style.overflow = 'hidden';
  document.body.style.backgroundColor = '#FAF8F5';

  // Grace period: ignore accidental clicks and reload keystrokes (Cmd+R, Ctrl+R, F5)
  setTimeout(() => {
    canDismiss = true;
  }, 150);

  function dismissIntro() {
    if (autoTimer) {
      clearTimeout(autoTimer);
      autoTimer = null;
    }
    intro.classList.add('hidden');
    document.documentElement.classList.remove('intro-active');
    document.body.classList.remove('intro-active');
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
    document.body.style.backgroundColor = '';
  }
  window.dismissMonroeIntro = dismissIntro;

  function playIntro() {
    canDismiss = false;
    setTimeout(() => {
      canDismiss = true;
    }, 150);
    intro.classList.remove('hidden');
    document.documentElement.classList.add('intro-active');
    document.body.classList.add('intro-active');
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    const stage = intro.querySelector('.monroe-brand-stage');
    if (stage) {
      const clone = stage.cloneNode(true);
      stage.parentNode.replaceChild(clone, stage);
    }
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      dismissIntro();
    }, 2400);
  }

  if (replayBtn) {
    replayBtn.addEventListener('click', playIntro);
  }

  // Initial auto-dismiss after Haute Parfumerie golden foil shimmer (~2.4s)
  autoTimer = setTimeout(() => {
    dismissIntro();
  }, 2400);

  // Click or touch anywhere to enter after grace period
  intro.addEventListener('click', (e) => {
    if (canDismiss) {
      dismissIntro();
    }
  });

  // Explicit user keys only (Escape, Enter, Space) after grace period
  window.addEventListener('keydown', (e) => {
    if (!intro.classList.contains('hidden') && canDismiss) {
      if (e.key === 'Escape' || e.key === 'Enter' || e.key === ' ') {
        dismissIntro();
      }
    }
  });
}

/* ==========================================================================
   1. Canvas Luxury Scent Particle Animation
   ========================================================================== */
function initHeroCanvas() {
  const canvas = document.getElementById('heroCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  let width, height;
  let particles = [];

  function resize() {
    width = canvas.width = window.innerWidth;
    height = canvas.height = canvas.parentElement.offsetHeight;
  }
  window.addEventListener('resize', resize);
  resize();

  class Particle {
    constructor() {
      this.reset();
    }
    reset() {
      this.x = Math.random() * width;
      this.y = height + Math.random() * 50;
      this.vx = (Math.random() - 0.5) * 0.4;
      this.vy = -(Math.random() * 0.6 + 0.2);
      this.size = Math.random() * 2 + 0.8;
      this.alpha = Math.random() * 0.25 + 0.05;
      this.maxAlpha = this.alpha;
      this.color = Math.random() > 0.4 ? '143, 109, 53' : '180, 175, 165';
    }
    update() {
      this.x += this.vx;
      this.y += this.vy;
      if (this.y < height * 0.1) {
        this.alpha -= 0.003;
      }
      if (this.y < 0 || this.alpha <= 0) {
        this.reset();
      }
    }
    draw() {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.color}, ${this.alpha})`;
      ctx.shadowBlur = 4;
      ctx.shadowColor = `rgba(${this.color}, 0.25)`;
      ctx.fill();
    }
  }

  // Create 60 golden dust particles
  for (let i = 0; i < 60; i++) {
    const p = new Particle();
    p.y = Math.random() * height; // initial spread
    particles.push(p);
  }

  function loop() {
    ctx.clearRect(0, 0, width, height);
    particles.forEach(p => {
      p.update();
      p.draw();
    });
    requestAnimationFrame(loop);
  }
  loop();
}

/* ==========================================================================
   1.1 Hero Signature Portrait & Atmospheric Background
   ========================================================================== */
const HERO_PORTRAIT = {
  image: 'assets/img/editorial/vladimir_atomizer_portrait.jpg',
  tag: 'STUDIO EDITORIAL',
  title: 'ВЛАДИМИР ВАЦИК',
  sub: '«Парфюм — это чувственное продолжение вашей индивидуальности»'
};

const HERO_BACKDROP_IMAGE = 'assets/img/editorial/hero_perfume_flacons_neutral.jpg';

let heroCinematicMode = true;

function initHeroLookbook() {
  const hero = document.getElementById('hero');
  if (hero) hero.classList.add('hero-cinematic-mode');
  document.body.classList.add('hero-cinematic-active');

  const backdropImg = document.getElementById('heroBackdropImg');
  if (backdropImg) {
    backdropImg.style.backgroundImage = `url('${HERO_BACKDROP_IMAGE}')`;
  }
}

// Safe fallback no-op handlers
window.switchHeroLookbook = function(index) {};
window.toggleHeroBgMode = function() {};

/* ==========================================================================
   1.2 Header Services Dropdown Controller
   ========================================================================== */
function initNavServicesDropdown() {
  const wrap = document.getElementById('navServicesWrap');
  const btn = document.getElementById('navServicesBtn');
  const menu = document.getElementById('navServicesMenu');
  if (!wrap || !btn || !menu) return;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const isOpen = wrap.classList.toggle('is-open');
    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });

  document.addEventListener('click', (e) => {
    if (!wrap.contains(e.target)) {
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && wrap.classList.contains('is-open')) {
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
      btn.focus();
    }
  });

  menu.querySelectorAll('.nav-dropdown-item').forEach(item => {
    item.addEventListener('click', () => {
      wrap.classList.remove('is-open');
      btn.setAttribute('aria-expanded', 'false');
    });
  });
}

/* ==========================================================================
   1.2 Interactive 3D Perspective Card Tilt (Desktop)
   ========================================================================== */
function init3DTiltCards() {
  if (window.matchMedia('(pointer: coarse)').matches) return; // Skip touch devices

  const tiltCards = document.querySelectorAll('.hero-lookbook-frame, .tester-compare-card, .decants-portrait-card, .pes-photo-card');

  tiltCards.forEach(card => {
    card.style.transformStyle = 'preserve-3d';
    card.style.transition = 'transform 0.15s ease-out, box-shadow 0.3s ease';

    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = ((y - centerY) / centerY) * -3.5;
      const rotateY = ((x - centerX) / centerX) * 3.5;

      card.style.transform = `perspective(1000px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.01, 1.01, 1.01)`;
    });

    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  });
}

/* ==========================================================================
   1.3 Desktop Floating Quick Return Button
   ========================================================================== */
function initFloatingBackTop() {
  const btn = document.getElementById('floatingBackTop');
  if (!btn) return;

  window.addEventListener('scroll', () => {
    if (window.scrollY > 450) {
      btn.classList.add('visible');
    } else {
      btn.classList.remove('visible');
    }
  }, { passive: true });
}

/* ==========================================================================
   2. Catalog Engine with Filter, Volume Selector & Modals
   ========================================================================== */
let currentCategory = 'all';
let currentBoxGender = 'all';
let aromaBoxesExpanded = false;
let currentSearch = '';
let currentSort = 'popular';
const selectedVolumes = {}; // map of perfumeId -> selected volume string ('3ml', '5ml', '10ml', 'bottle')

const CATALOG_PAGE_SIZE = 12;
let catalogVisibleCount = CATALOG_PAGE_SIZE;
let lastFilteredCatalogItems = [];

function initCatalog() {
  const searchInput = document.getElementById('catalogSearch');
  const sortSelect = document.getElementById('catalogSort');
  const tabBtns = document.querySelectorAll('.catalog-tabs .tab-btn');
  const btnLoadMore = document.getElementById('btnLoadMore');
  const boxFilterBtns = document.querySelectorAll('.box-filter-bar .box-filter-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      catalogVisibleCount = CATALOG_PAGE_SIZE;
      renderCatalog(true);
    });
  });

  boxFilterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      boxFilterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentBoxGender = btn.dataset.boxGender || 'all';
      if (currentBoxGender !== 'all') {
        aromaBoxesExpanded = true;
      }
      renderAromaBoxes();
      playChime(500);
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      catalogVisibleCount = CATALOG_PAGE_SIZE;
      renderCatalog(true);
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      catalogVisibleCount = CATALOG_PAGE_SIZE;
      renderCatalog(true);
    });
  }

  if (btnLoadMore) {
    btnLoadMore.addEventListener('click', () => {
      catalogVisibleCount += CATALOG_PAGE_SIZE;
      renderCatalog(false);
      playChime(520);
    });
  }

  renderCatalog(true);
  renderAromaBoxes();

  // Deep-link auto-opener for shared scent (#scent=...)
  function checkSharedScentDeepLink() {
    if (window.location.hash && window.location.hash.startsWith('#scent=')) {
      const scentId = decodeURIComponent(window.location.hash.replace('#scent=', ''));
      if (scentId) {
        setTimeout(() => {
          openProductModal(scentId);
        }, 350);
      }
    }
  }

  checkSharedScentDeepLink();
  window.addEventListener('hashchange', checkSharedScentDeepLink);
}

function renderCatalog(resetScroll = false) {
  const grid = document.getElementById('perfumesGrid');
  if (!grid || typeof PERFUMES_DATA === 'undefined') return;

  // Filter items (purely perfumes, aromaboxes are in their own dedicated showcase)
  let items = [];

  if (currentCategory === 'all') {
    items = [...PERFUMES_DATA];
  } else if (currentCategory === 'men') {
    items = PERFUMES_DATA.filter(p => p.gender === 'men' || p.gender === 'unisex');
  } else if (currentCategory === 'women') {
    items = PERFUMES_DATA.filter(p => p.gender === 'women' || p.gender === 'unisex');
  } else if (currentCategory === 'unisex') {
    items = PERFUMES_DATA.filter(p => p.gender === 'unisex');
  } else {
    items = PERFUMES_DATA.filter(p => p.gender === currentCategory);
  }

  // Search filter
  if (currentSearch) {
    items = items.filter(item => {
      const name = (item.name || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const fullTitle = (item.fullTitle || '').toLowerCase();
      return name.includes(currentSearch) || brand.includes(currentSearch) || desc.includes(currentSearch) || fullTitle.includes(currentSearch);
    });
  }

  // Sort
  if (currentSort === 'price-asc') {
    items.sort((a, b) => getMinPrice(a) - getMinPrice(b));
  } else if (currentSort === 'price-desc') {
    items.sort((a, b) => getMinPrice(b) - getMinPrice(a));
  }

  lastFilteredCatalogItems = items;

  const paginationWrap = document.getElementById('catalogPagination');
  const btnLoadMore = document.getElementById('btnLoadMore');
  const loadMoreCount = document.getElementById('loadMoreCount');
  const loadedInfo = document.getElementById('catalogLoadedInfo');

  if (items.length === 0) {
    const totalCount = Array.isArray(PERFUMES_DATA) ? PERFUMES_DATA.length : 265;
    const tgHandle = encodeURIComponent((ACTIVE_CONTACTS && ACTIVE_CONTACTS.telegramHandle) || 'volodiumparfum');
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--text-main);">Ничего не найдено по запросу «${escapeHtml(currentSearch)}»</p>
        <p style="font-size: 0.9rem;">В нашей коллекции более ${totalCount} нишевых ароматов. Попробуйте изменить запрос или напишите Владимиру в Telegram для индивидуального поиска.</p>
        <a href="https://t.me/${tgHandle}" target="_blank" rel="noopener noreferrer" class="btn-secondary" style="margin-top: 1.5rem; display: inline-flex;">Написать в Telegram</a>
      </div>
    `;
    if (paginationWrap) paginationWrap.style.display = 'none';
    return;
  }

  const visibleItems = items.slice(0, catalogVisibleCount);
  grid.innerHTML = visibleItems.map(item => createProductCardHtml(item)).join('');

  // Update pagination controls
  if (paginationWrap && btnLoadMore) {
    const remaining = items.length - visibleItems.length;
    paginationWrap.style.display = 'flex';
    if (remaining > 0) {
      btnLoadMore.style.display = 'inline-flex';
      if (loadMoreCount) loadMoreCount.textContent = `(+${Math.min(remaining, CATALOG_PAGE_SIZE)})`;
      if (loadedInfo) loadedInfo.textContent = `Показано ${visibleItems.length} из ${items.length} ароматов`;
    } else {
      btnLoadMore.style.display = 'none';
      if (loadedInfo) loadedInfo.textContent = `Все ${items.length} ароматов каталога показаны`;
    }
  }

  // Attach card event listeners
  visibleItems.forEach(item => {
    // Volume buttons
    const volBtns = grid.querySelectorAll(`.vol-btn-${item.id}`);
    volBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vol = btn.dataset.vol;
        selectedVolumes[item.id] = vol;
        updateCardPrice(item.id, vol);
        volBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playChime(440);
      });
    });

    // Add to cart buttons
    const addBtn = grid.querySelector(`.add-cart-${item.id}`);
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vol = selectedVolumes[item.id] || getDefaultVolume(item);
        addItemToCart(item, vol);
        playChime(660);
      });
    }

    // Click on title/image -> open modal
    const detailsTriggers = grid.querySelectorAll(`.trigger-modal-${item.id}`);
    detailsTriggers.forEach(el => {
      el.addEventListener('click', () => {
        openProductModal(item.id);
        playChime(520);
      });
    });
  });
}

function renderAromaBoxes() {
  const grid = document.getElementById('aromaBoxesGrid');
  if (!grid || typeof AROMA_BOXES_DATA === 'undefined') return;

  const volLabels = {
    '3ml': '5 × 3 мл',
    '5ml': '5 × 5 мл',
    '10ml': '5 × 10 мл'
  };

  const sprayHints = {
    '3ml': '~45 распылений на флакон (225 всего)',
    '5ml': '~75 распылений на флакон (375 всего)',
    '10ml': '~150 распылений на флакон (750 всего)'
  };

  const filteredBoxes = currentBoxGender === 'all'
    ? AROMA_BOXES_DATA
    : AROMA_BOXES_DATA.filter(b => b.gender === currentBoxGender);

  // When 'all' is active and not yet expanded, show exactly 3 cards
  const isCollapsedView = (currentBoxGender === 'all' && !aromaBoxesExpanded);
  const displayBoxes = isCollapsedView ? filteredBoxes.slice(0, 3) : filteredBoxes;

  // Update filter bar counts dynamically from AROMA_BOXES_DATA
  const totalBoxes = AROMA_BOXES_DATA.length;
  const remainingBoxes = Math.max(0, totalBoxes - 3);
  const filterCounts = {
    all: totalBoxes,
    women: AROMA_BOXES_DATA.filter(b => b.gender === 'women').length,
    men: AROMA_BOXES_DATA.filter(b => b.gender === 'men').length,
    unisex: AROMA_BOXES_DATA.filter(b => b.gender === 'unisex').length
  };
  document.querySelectorAll('#aromaBoxFilterBar .box-filter-btn').forEach(btn => {
    const g = btn.dataset.boxGender || 'all';
    const cntEl = btn.querySelector('.bf-count');
    if (cntEl && filterCounts[g] != null) cntEl.textContent = String(filterCounts[g]);
  });

  // Manage Animated Filter Bar
  const filterBar = document.getElementById('aromaBoxFilterBar');
  if (filterBar) {
    if (!isCollapsedView) {
      filterBar.style.display = 'flex';
      // Trigger smooth spring animation
      filterBar.classList.remove('fly-in-spring');
      void filterBar.offsetWidth; // force reflow for animation restart
      filterBar.classList.add('fly-in-spring');
    } else {
      filterBar.style.display = 'none';
      filterBar.classList.remove('fly-in-spring');
    }
  }

  // Manage Expander Button
  const expanderWrap = document.getElementById('aromaExpanderWrap');
  if (expanderWrap) {
    if (totalBoxes <= 3 && currentBoxGender === 'all') {
      expanderWrap.innerHTML = '';
    } else if (currentBoxGender === 'all') {
      if (!aromaBoxesExpanded) {
        expanderWrap.innerHTML = `
          <button type="button" class="btn-expand-aromaboxes" onclick="window.toggleAromaBoxesExpanded()" aria-expanded="false">
            <span class="bea-sparkle">✦</span>
            <span class="bea-text">Посмотреть ещё ${remainingBoxes} авторских сетов</span>
            <span class="bea-badge">Все ${totalBoxes} боксов</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
        `;
      } else {
        expanderWrap.innerHTML = `
          <button type="button" class="btn-expand-aromaboxes is-expanded" onclick="window.toggleAromaBoxesExpanded()" aria-expanded="true">
            <span class="bea-text">Свернуть до 3 основных сетов</span>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="18 15 12 9 6 15"/></svg>
          </button>
        `;
      }
    } else {
      expanderWrap.innerHTML = `
        <button type="button" class="btn-expand-aromaboxes is-filtered" onclick="window.setAromaBoxGenderFilter('all')" aria-expanded="true">
          <span class="bea-text">Показать всю коллекцию (${totalBoxes} боксов)</span>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="6 9 12 15 18 9"/></svg>
        </button>
      `;
    }
  }

  if (displayBoxes.length === 0) {
    grid.innerHTML = `
      <div class="catalog-empty-state" style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center;">
        <p style="font-size: 1.1rem; color: var(--text-muted);">В выбранной категории сейчас нет аромабоксов.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = displayBoxes.map((box, idx) => {
    const availableVols = box.prices ? Object.keys(box.prices) : ['3ml'];
    const currentVol = selectedVolumes[box.id] || availableVols[0];
    const price = box.prices ? box.prices[currentVol] : 3240;
    const oldPrice = box.oldPrices ? box.oldPrices[currentVol] : null;
    const discountPct = (oldPrice && price && oldPrice > price)
      ? Math.round((1 - price / oldPrice) * 100)
      : null;
    const boxImg = resolveSafeMediaUrl(box.image);
    const boxFallbackImg = resolveSafeMediaUrl(box.cdnImage || box.image);
    const objPos = escapeHtml(box.objectPosition || 'center center');
    const compCount = Array.isArray(box.perfumes) && box.perfumes.length ? box.perfumes.length : 5;

    return `
      <div class="aroma-box-card ${!isCollapsedView ? 'aroma-card-reveal' : ''}" id="card-${escapeHtml(box.id)}" style="animation-delay: ${idx * 0.05}s">
        <div class="aroma-box-img-wrap box-open-modal" data-box-id="${escapeHtml(box.id)}" role="button" tabindex="0" title="Нажмите, чтобы изучить подробный состав">
          <img src="${escapeHtml(boxImg)}" alt="${escapeHtml(box.name)}" style="object-position: ${objPos};" loading="lazy" onerror="this.onerror=null;this.src='${escapeHtml(boxFallbackImg)}';">
          
          <div class="aroma-box-badges-overlay">
            <span class="aroma-box-gender-badge gender-${escapeHtml(box.gender || 'unisex')}">${escapeHtml(box.genderLabel || 'Сет')}</span>
            ${discountPct ? `<span class="aroma-box-discount-badge">-${discountPct}%</span>` : ''}
          </div>

          ${box.badge ? `<span class="aroma-box-hit-badge">${escapeHtml(box.badge)}</span>` : ''}
          
          <div class="aroma-box-img-hover-hint">
            <span>Изучить состав</span>
          </div>
        </div>

        <div class="aroma-box-content">
          <h3 class="aroma-box-title box-open-modal" data-box-id="${escapeHtml(box.id)}" role="button" tabindex="0">${escapeHtml(box.name)}</h3>
          <p class="aroma-box-short-subtitle">${escapeHtml(box.shortSubtitle || '')}</p>

          <div class="box-composition-preview box-open-modal" data-box-id="${escapeHtml(box.id)}" role="button" tabindex="0" title="Нажмите, чтобы открыть подробный состав и ноты сета">
            <span class="bcp-action">✦ Состав сета (${compCount} ароматов) →</span>
          </div>

          <div class="aroma-box-vol-block">
            <div class="volume-selector aroma-box-vol-selector">
              ${availableVols.map(v => `
                <button type="button" class="volume-btn vol-btn-${box.id} ${currentVol === v ? 'active' : ''}" data-vol="${v}">
                  ${v === '3ml' ? '5 x 3 мл' : v === '5ml' ? '5 x 5 мл' : v === '10ml' ? '5 x 10 мл' : v}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="card-footer aroma-box-footer">
            <div class="price-wrap">
              <div class="price-row-box">
                <span class="price-old" id="old-price-${box.id}" style="${oldPrice ? '' : 'display:none;'}">${oldPrice ? formatPrice(oldPrice) : ''}</span>
                <div class="price-current" id="price-${box.id}">${formatPrice(price)}</div>
              </div>
              <div class="price-unit">за сет из 5 флаконов</div>
            </div>
            <button type="button" class="btn-primary btn-add-cart add-cart-${box.id}" aria-label="Добавить сет ${escapeHtml(box.name)} в корзину">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span>В корзину</span>
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');

  // Attach event listeners for each displayed box
  displayBoxes.forEach(box => {
    // Volume buttons
    const volBtns = grid.querySelectorAll(`.vol-btn-${box.id}`);
    volBtns.forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const vol = btn.dataset.vol;
        selectedVolumes[box.id] = vol;
        const priceEl = document.getElementById(`price-${box.id}`);
        const oldPriceEl = document.getElementById(`old-price-${box.id}`);
        const sprayHintEl = document.getElementById(`spray-hint-${box.id}`);

        if (priceEl && box.prices && box.prices[vol]) {
          priceEl.textContent = formatPrice(box.prices[vol]);
        }
        if (oldPriceEl) {
          if (box.oldPrices && box.oldPrices[vol]) {
            oldPriceEl.textContent = formatPrice(box.oldPrices[vol]);
            oldPriceEl.style.display = 'inline';
          } else {
            oldPriceEl.style.display = 'none';
          }
        }
        if (sprayHintEl && sprayHints[vol]) {
          sprayHintEl.textContent = sprayHints[vol];
        }

        volBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        playChime(440);
      });
    });

    // Add to cart button
    const addBtn = grid.querySelector(`.add-cart-${box.id}`);
    if (addBtn) {
      addBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const availableVols = box.prices ? Object.keys(box.prices) : ['3ml'];
        const vol = selectedVolumes[box.id] || availableVols[0];
        addItemToCart(box, vol);
        playChime(660);
      });
    }

    // Modal triggers on card elements
    const cardEl = document.getElementById(`card-${box.id}`);
    if (cardEl) {
      const modalOpeners = cardEl.querySelectorAll('.box-open-modal');
      modalOpeners.forEach(opener => {
        opener.addEventListener('click', (e) => {
          e.stopPropagation();
          openProductModal(box.id);
          playChime(520);
        });
        opener.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            openProductModal(box.id);
            playChime(520);
          }
        });
      });
    }
  });
}

window.toggleAromaBoxesExpanded = function() {
  aromaBoxesExpanded = !aromaBoxesExpanded;
  if (!aromaBoxesExpanded) {
    currentBoxGender = 'all';
    const filterBtns = document.querySelectorAll('.box-filter-bar .box-filter-btn');
    filterBtns.forEach(btn => {
      btn.classList.toggle('active', (btn.dataset.boxGender || 'all') === 'all');
    });
  }
  renderAromaBoxes();
  playChime(aromaBoxesExpanded ? 580 : 440);
  if (!aromaBoxesExpanded) {
    const section = document.getElementById('aroma-boxes');
    if (section) section.scrollIntoView({ behavior: 'smooth' });
  }
};

window.setAromaBoxGenderFilter = function(gender) {
  currentBoxGender = gender;
  aromaBoxesExpanded = true;
  const filterBtns = document.querySelectorAll('.box-filter-bar .box-filter-btn');
  filterBtns.forEach(btn => {
    btn.classList.toggle('active', (btn.dataset.boxGender || 'all') === gender);
  });
  renderAromaBoxes();
  playChime(520);
};

function getMinPrice(item) {
  if (item.price) return item.price;
  if (item.prices) {
    const vals = Object.values(item.prices);
    return Math.min(...vals);
  }
  return 0;
}

function getDefaultVolume(item) {
  if (item.prices) {
    if (item.prices['3ml']) return '3ml';
    if (item.prices['5ml']) return '5ml';
    return Object.keys(item.prices)[0];
  }
  return 'standard';
}

function getScentLifestyleMeta(item) {
  if (!item) return { season: 'Круглый год', seasonIcon: '🌸', timeOfDay: 'День & Вечер', timeIcon: '✨', mood: 'Изысканный нишевый стиль' };

  const family = (item.notesFamily || '').toLowerCase();
  const desc = (item.description || '').toLowerCase();
  const name = (item.name || '').toLowerCase();
  const text = family + ' ' + desc + ' ' + name;

  let season = 'Круглый год';
  let seasonIcon = '🌸';
  let timeOfDay = 'День & Вечер';
  let timeIcon = '✨';
  let mood = 'Изысканный нишевый стиль';

  if (family.includes('citrus') || text.includes('цитрус') || text.includes('бергамот') || text.includes('лимон') || text.includes('морск') || text.includes('акватич') || family.includes('fresh') || text.includes('свеж') || text.includes('лайм') || text.includes('мята') || text.includes('грейпфрут')) {
    season = 'Весна — Лето';
    seasonIcon = '☀️';
    timeOfDay = 'Идеально на день';
    timeIcon = '☀️';
    mood = 'Освежающий, энергичный, искрящийся';
  } else if (family.includes('oriental') || family.includes('gourmand') || text.includes('восток') || text.includes('ваниль') || text.includes('табак') || text.includes('кожа') || text.includes('уд') || text.includes('прян') || text.includes('смол') || text.includes('шоколад') || text.includes('кофе') || text.includes('амбр') || text.includes('вишн')) {
    season = 'Осень — Зима';
    seasonIcon = '🍂';
    timeOfDay = 'Вечер / Особый случай';
    timeIcon = '🌙';
    mood = 'Глубокий, согревающий, статусный';
  } else if (family.includes('floral') || text.includes('цвет') || text.includes('роза') || text.includes('пион') || text.includes('жасмин') || text.includes('тубероз') || text.includes('ландыш') || text.includes('ирис')) {
    season = 'Весна — Осень';
    seasonIcon = '🌿';
    timeOfDay = 'День & Романтический вечер';
    timeIcon = '✨';
    mood = 'Утонченный, женственный, летящий';
  } else if (family.includes('woody') || text.includes('древ') || text.includes('кедр') || text.includes('сандал') || text.includes('ветивер') || text.includes('пачули') || text.includes('мускус')) {
    season = 'Круглый год';
    seasonIcon = '🌲';
    timeOfDay = 'Деловой день & Вечер';
    timeIcon = '💼';
    mood = 'Благородный, сдержанный, стойкий';
  }

  const explicitSeason = (item.season || (item.metrics && item.metrics.season) || '').trim();
  if (explicitSeason) {
    season = explicitSeason;
    const preset = SEASON_PRESET_META[explicitSeason];
    if (preset) {
      seasonIcon = preset.seasonIcon;
      timeOfDay = preset.timeOfDay;
      timeIcon = preset.timeIcon;
    }
  }
  const explicitSeasonIcon = item.seasonIcon || (item.metrics && item.metrics.seasonIcon);
  if (explicitSeasonIcon) seasonIcon = explicitSeasonIcon;
  const explicitTime = item.timeOfDay || (item.metrics && item.metrics.timeOfDay);
  if (explicitTime) timeOfDay = explicitTime;
  const explicitTimeIcon = item.timeIcon || (item.metrics && item.metrics.timeIcon);
  if (explicitTimeIcon) timeIcon = explicitTimeIcon;
  const explicitMood = item.mood || (item.metrics && item.metrics.vibe);
  if (explicitMood) mood = explicitMood;

  return { season, seasonIcon, timeOfDay, timeIcon, mood };
}

function createProductCardHtml(item) {
  const currentVol = selectedVolumes[item.id] || getDefaultVolume(item);
  const currentPrice = item.prices ? item.prices[currentVol] : item.price;
  const isAromaBox = item.category === 'box';
  const lifestyle = getScentLifestyleMeta(item);
  const imgUrl = resolveSafeMediaUrl(item.image);
  const objPos = escapeHtml(item.objectPosition || 'center center');

  let volumeSelectorHtml = '';
  if (item.prices) {
    volumeSelectorHtml = `
      <div class="volume-selector">
        ${Object.keys(item.prices).map(v => `
          <button class="volume-btn vol-btn-${escapeHtml(item.id)} ${v === currentVol ? 'active' : ''}" data-vol="${escapeHtml(v)}">
            ${v === 'bottle' ? escapeHtml(item.bottleSize || 'Флакон') : escapeHtml(v)}
          </button>
        `).join('')}
      </div>
    `;
  }

  const seasonPillHtml = (!isAromaBox) ? `
    <div class="card-season-pill" title="Рекомендуемый сезон и время суток">
      <span class="csp-icon">${escapeHtml(lifestyle.seasonIcon)}</span>
      <span>${escapeHtml(lifestyle.season)}</span>
      <span class="csp-time">${escapeHtml(lifestyle.timeOfDay)}</span>
    </div>
  ` : '';

  return `
    <div class="perfume-card" id="card-${escapeHtml(item.id)}">
      ${item.badge ? `<span class="card-badge">${escapeHtml(item.badge)}</span>` : ''}
      <div class="card-img-wrap trigger-modal-${escapeHtml(item.id)}">
        <img src="${escapeHtml(imgUrl)}" alt="${escapeHtml(item.name)}" style="object-position: ${objPos};" loading="lazy" onerror="this.onerror=null;this.src='assets/images/noroot.png';">
      </div>
      <div class="card-brand">${escapeHtml(item.brand || 'VOLODIUM PARFUM')}</div>
      <h3 class="card-title trigger-modal-${escapeHtml(item.id)}">${escapeHtml(item.name)}</h3>
      ${seasonPillHtml}
      <p class="card-subtitle">${escapeHtml(item.subtitle || item.description)}</p>
      
      ${volumeSelectorHtml}

      <div class="card-footer">
        <div class="price-wrap">
          <div class="price-current" id="price-${escapeHtml(item.id)}">${formatPrice(currentPrice)}</div>
          <div class="price-unit">${currentVol === 'bottle' ? 'оригинальный флакон' : (item.category === 'box' ? 'набор миниатюр' : 'отливант ' + escapeHtml(currentVol))}</div>
        </div>
        <div class="card-actions-row">
          <button class="btn-details trigger-modal-${escapeHtml(item.id)}" title="Пирамида нот и подробности">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="btn-add-cart add-cart-${escapeHtml(item.id)}">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            В корзину
          </button>
        </div>
      </div>
    </div>
  `;
}

function updateCardPrice(itemId, vol) {
  const allItems = [...PERFUMES_DATA, ...AROMA_BOXES_DATA];
  const item = allItems.find(p => p.id === itemId);
  if (!item || !item.prices) return;

  const priceEl = document.getElementById(`price-${itemId}`);
  if (priceEl && item.prices[vol]) {
    priceEl.textContent = formatPrice(item.prices[vol]);
  }

  const oldPriceEl = document.getElementById(`old-price-${itemId}`);
  if (oldPriceEl) {
    if (item.oldPrices && item.oldPrices[vol]) {
      oldPriceEl.textContent = formatPrice(item.oldPrices[vol]);
      oldPriceEl.style.display = 'inline';
    } else {
      oldPriceEl.style.display = 'none';
    }
  }

  const sprayHintEl = document.getElementById(`spray-hint-${itemId}`);
  const sprayHints = {
    '3ml': '~45 распылений на флакон (225 всего)',
    '5ml': '~75 распылений на флакон (375 всего)',
    '10ml': '~150 распылений на флакон (750 всего)'
  };
  if (sprayHintEl && sprayHints[vol]) {
    sprayHintEl.textContent = sprayHints[vol];
  }

  const card = document.getElementById(`card-${itemId}`);
  if (card) {
    const volBtns = card.querySelectorAll(`.vol-btn-${itemId}`);
    volBtns.forEach(btn => {
      btn.classList.toggle('active', btn.dataset.vol === vol);
    });
  }
}

/* ==========================================================================
   3. Olfactory Pyramid & Product Details Modal
   ========================================================================== */
function openProductModal(itemId) {
  const allItems = [...PERFUMES_DATA, ...AROMA_BOXES_DATA, ...SECRET_BOXES_DATA];
  const item = allItems.find(p => p.id === itemId);
  if (!item) return;

  const modalBackdrop = document.getElementById('productModalBackdrop');
  const modalContent = document.getElementById('productModalContent');
  if (!modalBackdrop || !modalContent) return;

  // Custom dedicated modal layout for Aromaboxes
  if (item.category === 'box') {
    const availableVols = item.prices ? Object.keys(item.prices) : ['3ml'];
    let activeModalVol = selectedVolumes[item.id] || availableVols[0];
    const currentPrice = item.prices ? item.prices[activeModalVol] : 3240;
    const oldPrice = item.oldPrices ? item.oldPrices[activeModalVol] : null;

    const volLabels = {
      '3ml': '5 × 3 мл',
      '5ml': '5 × 5 мл',
      '10ml': '5 × 10 мл'
    };

    const sprayHints = {
      '3ml': '~45 распылений на флакон (225 всего)',
      '5ml': '~75 распылений на флакон (375 всего)',
      '10ml': '~150 распылений на флакон (750 всего)'
    };

    const modalBoxImg = resolveSafeMediaUrl(item.image);
    const modalBoxFallback = resolveSafeMediaUrl(item.cdnImage || item.image);
    const modalObjPos = escapeHtml(item.objectPosition || 'center center');
    const compCount = Array.isArray(item.perfumes) && item.perfumes.length ? item.perfumes.length : 5;
    const tgHandle = encodeURIComponent((ACTIVE_CONTACTS && ACTIVE_CONTACTS.telegramHandle) || 'volodiumparfum');

    modalContent.innerHTML = `
      <div class="modal-grid modal-box-layout">
        <div class="modal-img-col">
          <div class="modal-box-img-wrap">
            <img class="modal-main-img" src="${escapeHtml(modalBoxImg)}" alt="${escapeHtml(item.name)}" style="object-position: ${modalObjPos};" onerror="this.onerror=null;this.src='${escapeHtml(modalBoxFallback)}';">
          </div>
          <div class="modal-guarantee-card">
            <div class="mg-head">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>100% гарантия подлинности</span>
            </div>
            <p>Все ароматы разливаются исключительно из оригинальных флаконов нишевых брендов в стерильные стеклянные атомайзеры с металлической помпой и герметичной крышкой.</p>
          </div>
        </div>

        <div class="modal-info-col">
          <div class="modal-box-badges">
            <span class="aroma-box-gender-badge gender-${escapeHtml(item.gender || 'unisex')}">${escapeHtml(item.genderLabel || 'Коллекция')}</span>
            <span class="modal-box-tag">Тематический сет • ${compCount} ароматов</span>
            ${item.badge ? `<span class="aroma-box-hit-badge-inline">${escapeHtml(item.badge)}</span>` : ''}
          </div>

          <h2 class="modal-box-title">${escapeHtml(item.name)}</h2>
          <p class="modal-box-subtitle">${escapeHtml(item.shortSubtitle || '')}</p>

          <div class="modal-box-description-block">
            <h4 class="mbd-heading">Концепция сета:</h4>
            <p class="mbd-text">${escapeHtml(item.fullDescription || item.description || '')}</p>
          </div>

          <div class="modal-box-perfumes-block">
            <h4 class="mbp-heading">
              <span style="color:var(--bordo-primary);">✦</span>
              <span>В наборе ${compCount} оригинальных композиций:</span>
            </h4>
            <div class="modal-box-perfumes-grid">
              ${(item.perfumes || []).map((perfume, idx) => {
                const parts = String(perfume).split('—');
                const brand = parts[0]?.trim() || '';
                const pName = parts[1]?.trim() || perfume;
                return `
                  <div class="mbp-card">
                    <span class="mbp-num">0${idx + 1}</span>
                    <div class="mbp-details">
                      <strong class="mbp-brand">${escapeHtml(brand)}</strong>
                      <span class="mbp-name">${escapeHtml(pName)}</span>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>

          <div class="modal-box-vol-block">
            <div class="mbv-header">
              <label class="mbv-label">Выберите объем атомайзеров:</label>
              <span class="mbv-hint" id="modalBoxSprayHint">${escapeHtml(sprayHints[activeModalVol] || '')}</span>
            </div>
            <div class="volume-selector" id="modalBoxVolumeSelector">
              ${availableVols.map(v => `
                <button type="button" class="volume-btn modal-vol-btn ${v === activeModalVol ? 'active' : ''}" data-vol="${escapeHtml(v)}">
                  ${escapeHtml(volLabels[v] || v)}
                </button>
              `).join('')}
            </div>
          </div>

          <div class="modal-footer-cta">
            <div class="modal-price-wrap">
              <div class="modal-price-row">
                <span class="price-old" id="modalBoxOldPrice" style="${oldPrice ? '' : 'display:none;'}">${oldPrice ? formatPrice(oldPrice) : ''}</span>
                <div class="modal-price-val" id="modalBoxPrice">${formatPrice(currentPrice)}</div>
              </div>
              <div class="modal-price-sub">за комплект из ${compCount} флаконов в подарочном боксе</div>
            </div>

            <button type="button" class="btn-primary modal-cta-btn" id="modalAddToCartBtn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
                <line x1="3" y1="6" x2="21" y2="6"/>
                <path d="M16 10a4 4 0 0 1-8 0"/>
              </svg>
              <span>В корзину</span>
            </button>
          </div>

          <div class="modal-concierge-row">
            <a href="https://t.me/${tgHandle}?text=${encodeURIComponent('Здравствуйте, Владимир! Подскажите, пожалуйста, по аромабоксу: ' + item.name)}" 
               target="_blank" 
               rel="noopener noreferrer" 
               class="btn-ask-vladimir"
               title="Задать вопрос Владимиру в Telegram">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z"/>
              </svg>
              <span>Спросить у Владимира</span>
            </a>
          </div>
        </div>
      </div>
    `;

    // Wire up modal volume buttons
    const modalVolBtns = modalContent.querySelectorAll('.modal-vol-btn');
    modalVolBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        modalVolBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeModalVol = btn.dataset.vol;
        selectedVolumes[item.id] = activeModalVol;
        updateCardPrice(item.id, activeModalVol);

        const price = item.prices[activeModalVol];
        const oldP = item.oldPrices ? item.oldPrices[activeModalVol] : null;

        const pEl = document.getElementById('modalBoxPrice');
        if (pEl) pEl.textContent = formatPrice(price);

        const oldPEl = document.getElementById('modalBoxOldPrice');
        if (oldPEl) {
          if (oldP) {
            oldPEl.textContent = formatPrice(oldP);
            oldPEl.style.display = 'inline';
          } else {
            oldPEl.style.display = 'none';
          }
        }

        const hintEl = document.getElementById('modalBoxSprayHint');
        if (hintEl && sprayHints[activeModalVol]) {
          hintEl.textContent = sprayHints[activeModalVol];
        }

        playChime(440);
      });
    });

    document.getElementById('modalAddToCartBtn').addEventListener('click', () => {
      addItemToCart(item, activeModalVol);
      closeProductModal();
      playChime(660);
    });

    modalBackdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
    return;
  }

  const currentVol = selectedVolumes[item.id] || getDefaultVolume(item);
  const currentPrice = item.prices ? item.prices[currentVol] : item.price;

  // Volume choices in modal
  let volumeOptionsHtml = '';
  if (item.prices) {
    volumeOptionsHtml = `
      <div style="margin-bottom: 1.5rem;">
        <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.5rem;">Выберите объем:</label>
        <div class="volume-selector" id="modalVolumeSelector">
          ${Object.keys(item.prices).map(v => `
            <button class="volume-btn modal-vol-btn ${v === currentVol ? 'active' : ''}" data-vol="${escapeHtml(v)}">
              ${escapeHtml(v === 'bottle' ? (item.bottleSize || 'Флакон') : v)}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  // Unified Haute Parfumerie Olfactory Presentation (Clean, artisanal, no AI-dashboard clutter)
  const lifestyle = getScentLifestyleMeta(item);
  const normalizeNotes = (val) => {
    if (Array.isArray(val)) return val.map(x => String(x || '').trim()).filter(Boolean);
    if (typeof val === 'string') return val.split(/[·,;|\n]+/).map(x => x.trim()).filter(Boolean);
    return [];
  };
  let olfactoryProfileHtml = '';
  if (item.pyramid && typeof item.pyramid === 'object') {
    const topStr = normalizeNotes(item.pyramid.top).map(escapeHtml).join(' · ') || '—';
    const heartStr = normalizeNotes(item.pyramid.heart).map(escapeHtml).join(' · ') || '—';
    const baseStr = normalizeNotes(item.pyramid.base).map(escapeHtml).join(' · ') || '—';
    olfactoryProfileHtml = `
      <div class="scent-olfactory-card">
        <div class="soc-header">
          <div class="soc-header-left">
            <span class="soc-crest">✦</span>
            <span class="soc-title">Ольфакторная композиция</span>
          </div>
          <span class="soc-vibe">${escapeHtml(item.metrics?.vibe || lifestyle.mood || 'Нишевый ольфакторный профиль')}</span>
        </div>

        <div class="soc-notes-list">
          <div class="soc-note-item">
            <span class="soc-phase">Верхние ноты (15 мин)</span>
            <span class="soc-notes">${topStr}</span>
          </div>
          <div class="soc-note-item heart">
            <span class="soc-phase">Ноты сердца (2–4 ч)</span>
            <span class="soc-notes">${heartStr}</span>
          </div>
          <div class="soc-note-item base">
            <span class="soc-phase">Шлейф и база (до 24 ч)</span>
            <span class="soc-notes">${baseStr}</span>
          </div>
        </div>

        <div class="soc-meta-strip">
          <div class="soc-meta-col">
            <span class="soc-meta-k">Сезон</span>
            <span class="soc-meta-v">${escapeHtml(lifestyle.seasonIcon)} ${escapeHtml(lifestyle.season)}</span>
          </div>
          <div class="soc-meta-sep"></div>
          <div class="soc-meta-col">
            <span class="soc-meta-k">Время</span>
            <span class="soc-meta-v">${escapeHtml(lifestyle.timeIcon)} ${escapeHtml(lifestyle.timeOfDay)}</span>
          </div>
          <div class="soc-meta-sep"></div>
          <div class="soc-meta-col">
            <span class="soc-meta-k">Стойкость</span>
            <span class="soc-meta-v">${escapeHtml(item.metrics?.longevity || 'До 12 часов')}</span>
          </div>
          <div class="soc-meta-sep"></div>
          <div class="soc-meta-col">
            <span class="soc-meta-k">Шлейф</span>
            <span class="soc-meta-v">${escapeHtml(item.metrics?.sillage || 'Выразительный')}</span>
          </div>
        </div>
      </div>
    `;
  }

  const safeImgUrl = resolveSafeMediaUrl(item.image, 'assets/images/noroot.png');
  const safeObjPos = escapeHtml(item.objectPosition || 'center center');
  const tgHandle = encodeURIComponent((ACTIVE_CONTACTS && ACTIVE_CONTACTS.telegramHandle) || 'volodiumparfum');

  modalContent.innerHTML = `
    <div class="modal-grid">
      <div class="modal-img-col">
        <img class="modal-main-img" src="${escapeHtml(safeImgUrl)}" alt="${escapeHtml(item.name)}" style="object-position: ${safeObjPos};" onerror="this.onerror=null;this.src='assets/images/noroot.png';">
        <div style="background: #faf9f7; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 1rem; font-size: 0.8rem; color: var(--text-muted);">
          <div style="color: #111216; font-weight: 600; margin-bottom: 0.25rem;">Гарантия оригинальности</div>
          100% оригинальный парфюм из официального флакона бренда. Разливается в стерильные стеклянные атомайзеры с металлической помпой.
        </div>
      </div>
      <div class="modal-info-col">
        <div class="card-brand">${escapeHtml(item.brand || 'VOLODIUM PARFUM')}</div>
        <h2 style="font-family: var(--font-serif); font-size: 2.2rem; font-weight: 600; color: #111216; margin-bottom: 0.4rem;">${escapeHtml(item.name)}</h2>
        <p style="color: var(--gold-primary); font-size: 0.95rem; margin-bottom: 1.25rem;">${escapeHtml(item.subtitle || '')}</p>
        
        <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.7; margin-bottom: 1.5rem;">
          ${escapeHtml(item.description || '')}
        </p>

        ${olfactoryProfileHtml}
        ${volumeOptionsHtml}

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 1.5rem; margin-top: 1.5rem;">
          <div>
            <div style="font-family: var(--font-serif); font-size: 2rem; font-weight: 700; color: #111216;" id="modalPrice">
              ${formatPrice(currentPrice)}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-dim);" id="modalVolLabel">
              ${escapeHtml(currentVol === 'bottle' ? 'полноразмерный флакон' : 'отливант ' + currentVol)}
            </div>
          </div>
          <button class="btn-primary" id="modalAddToCartBtn" style="padding: 1rem 2rem;">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
              <line x1="3" y1="6" x2="21" y2="6"/>
              <path d="M16 10a4 4 0 0 1-8 0"/>
            </svg>
            Добавить в корзину
          </button>
        </div>

        <div class="modal-concierge-row">
          <a href="https://t.me/${tgHandle}?text=${encodeURIComponent('Здравствуйте, Владимир! Подскажите, пожалуйста, по аромату: ' + (item.fullTitle || item.name))}" 
             target="_blank" 
             rel="noopener noreferrer" 
             class="btn-ask-vladimir"
             title="Задать вопрос Владимиру в Telegram">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 5.373 0 12s5.373 12 12 12 12-5.373 12-12S18.627 0 12 0zm5.894 8.221l-1.97 9.28c-.145.658-.537.818-1.084.508l-3-2.21-1.446 1.394c-.14.18-.357.295-.6.295-.002 0-.003 0-.005 0l.213-3.054 5.56-5.022c.24-.213-.054-.334-.373-.121l-6.869 4.326-2.96-.924c-.643-.204-.657-.643.136-.953l11.57-4.458c.538-.196 1.006.128.832.943z"/>
            </svg>
            <span>Спросить у Владимира</span>
          </a>
        </div>
      </div>
    </div>
  `;

  // Attach modal volume switcher
  let activeModalVol = currentVol;
  const modalVolBtns = modalContent.querySelectorAll('.modal-vol-btn');
  modalVolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      modalVolBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeModalVol = btn.dataset.vol;
      selectedVolumes[item.id] = activeModalVol;
      updateCardPrice(item.id, activeModalVol);

      const price = item.prices[activeModalVol];
      document.getElementById('modalPrice').textContent = formatPrice(price);
      document.getElementById('modalVolLabel').textContent = activeModalVol === 'bottle' ? 'полноразмерный флакон' : 'отливант ' + activeModalVol;
      playChime(440);
    });
  });

  document.getElementById('modalAddToCartBtn').addEventListener('click', () => {
    addItemToCart(item, activeModalVol);
    closeProductModal();
    playChime(660);
  });

  modalBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  const modalBackdrop = document.getElementById('productModalBackdrop');
  if (modalBackdrop) {
    modalBackdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}

// Share scent via Web Share API or Clipboard fallback
function shareScent(itemId) {
  const allItems = [...PERFUMES_DATA, ...AROMA_BOXES_DATA, ...(typeof SECRET_BOXES_DATA !== 'undefined' ? SECRET_BOXES_DATA : [])];
  const item = allItems.find(p => p.id === itemId);
  if (!item) return;

  const title = (item.brand ? `${item.brand} — ` : '') + item.name + ' в VOLODIUM PARFUM';
  const text = item.subtitle || item.description || 'Оригинальный нишевый аромат';
  const shareUrl = window.location.origin + window.location.pathname + '#scent=' + encodeURIComponent(item.id);

  if (navigator.share) {
    navigator.share({
      title: title,
      text: `${title}\n${text}\n`,
      url: shareUrl
    }).catch((err) => {
      if (err.name !== 'AbortError') {
        copyShareFallback(shareUrl);
      }
    });
  } else {
    copyShareFallback(shareUrl);
  }
}

function copyShareFallback(url) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(url).then(() => {
      showShareCopiedNotification();
    }).catch(() => {
      prompt('Скопируйте ссылку на аромат:', url);
    });
  } else {
    prompt('Скопируйте ссылку на аромат:', url);
  }
}

function showShareCopiedNotification() {
  const btns = document.querySelectorAll('.btn-share-scent');
  btns.forEach(btn => {
    btn.classList.add('copied');
    const span = btn.querySelector('span');
    const origText = span ? span.textContent : '';
    if (span) span.textContent = 'Скопировано!';
    setTimeout(() => {
      btn.classList.remove('copied');
      if (span) span.textContent = origText || 'Поделиться';
    }, 2400);
  });
  if (typeof showToast === 'function') {
    showToast('Ссылка на аромат скопирована в буфер обмена');
  }
}

window.shareScent = shareScent;

// Modal close button & outside click
document.addEventListener('click', (e) => {
  if (e.target.matches('#productModalBackdrop') || e.target.closest('#btnModalClose')) {
    closeProductModal();
  }
  if (e.target.matches('#cartDrawerBackdrop') || e.target.closest('#btnCartClose')) {
    closeCart();
  }
  if (e.target.matches('#checkoutModalBackdrop') || e.target.closest('#btnCheckoutClose')) {
    closeCheckoutModal();
  }
});





/* ==========================================================================
   4. Shopping Cart & Checkout System
   ========================================================================== */
let cart = [];
let appliedPromo = null; // e.g. { code: 'СТАРТ', discountPercent: 10 }
let FREE_DELIVERY_THRESHOLD = 5000;
let MIN_ORDER_THRESHOLD = 3000;

function findActivePromo(rawCode) {
  const normalized = String(rawCode || '').trim().toUpperCase();
  if (!normalized || !Array.isArray(DYNAMIC_PROMO_CODES)) return null;
  return DYNAMIC_PROMO_CODES.find(
    (p) => p && p.active !== false && String(p.code || '').trim().toUpperCase() === normalized
  ) || null;
}

function getCheckoutMessengerMeta(messenger) {
  const ct = ACTIVE_CONTACTS || {};
  const tg = String(ct.telegramHandle || 'volodiumparfum').replace(/^@/, '').trim() || 'volodiumparfum';
  const waPhone = String(ct.whatsappPhone || '79094442617').replace(/\D/g, '') || '79094442617';
  const waDisp = String(ct.whatsappDisplay || '+7 909 444-26-17').trim();
  const vkUrlRaw = String(ct.vkUrl || 'https://vk.ru/volodya_v_v').trim();
  const vkUrl = /^https?:\/\//i.test(vkUrlRaw) ? vkUrlRaw : 'https://vk.ru/volodya_v_v';
  const vkDisp = String(ct.vkDisplay || 'vk.ru/volodya_v_v').trim();

  const map = {
    Telegram: {
      hint: `⚡ Быстрее всего: менеджер @${tg} ответит почти мгновенно, согласует состав и отправит трек СДЭК`,
      btnText: 'Отправить заказ в Telegram (Быстрее всего)',
      send: (orderText) => {
        const tgUrl = `https://t.me/${encodeURIComponent(tg)}?text=${encodeURIComponent(orderText)}`;
        window.open(tgUrl, '_blank', 'noopener,noreferrer');
        showToast('✦ Заказ сформирован! Перенаправляем в Telegram к менеджеру...', 6000);
      }
    },
    WhatsApp: {
      hint: `💬 Прямой чат с Владимиром в WhatsApp (${waDisp}) для согласования заказа`,
      btnText: `Отправить заказ в WhatsApp (${waDisp})`,
      send: (orderText) => {
        const waUrl = `https://wa.me/${waPhone}?text=${encodeURIComponent(orderText)}`;
        window.open(waUrl, '_blank', 'noopener,noreferrer');
        showToast('✦ Заказ сформирован! Открываем чат WhatsApp с Владимиром...', 6000);
      }
    },
    VK: {
      hint: `👤 Личные сообщения ВКонтакте (${vkDisp}). Владимир или менеджер ответит и оформит доставку`,
      btnText: `Отправить заказ во ВКонтакте (${vkDisp})`,
      send: (orderText) => {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(orderText).catch(() => {});
        }
        window.open(vkUrl, '_blank', 'noopener,noreferrer');
        showToast(`✦ Текст заказа скопирован в буфер! Отправьте его в открывшемся профиле ВКонтакте (${vkDisp})`, 7000);
      }
    }
  };
  return map[messenger] || map.Telegram;
}

function initCart() {
  // Load from LocalStorage and sanitize
  try {
    const saved = localStorage.getItem('vp_cart');
    if (saved) {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) {
        cart = parsed.filter(item => item && typeof item === 'object').map(item => {
          let resolvedName = item.name;
          if (!resolvedName || resolvedName === 'undefined' || resolvedName === 'null') {
            resolvedName = item.title || (item.level ? `Secret Box «${item.level}»` : 'Фирменный сет Volodium');
          }
          let resolvedVol = item.volume;
          if (!resolvedVol || resolvedVol === 'undefined' || resolvedVol === 'null') {
            resolvedVol = 'стандарт';
          }
          return {
            ...item,
            cartId: String(item.cartId || `${item.itemId || 'item'}__${resolvedVol}`),
            name: String(resolvedName),
            volume: String(resolvedVol),
            image: resolveSafeMediaUrl(item.image, 'assets/img/aromaboxes/real_box_open_kraft.jpg'),
            price: Number(item.price) || 4900,
            qty: Math.max(1, Number(item.qty) || 1)
          };
        });
      }
    }
  } catch (e) {
    cart = [];
  }

  const cartTriggers = document.querySelectorAll('.trigger-cart');
  cartTriggers.forEach(btn => {
    btn.addEventListener('click', () => {
      openCart();
      playChime(440);
    });
  });

  const itemsContainer = document.getElementById('cartItemsList');
  if (itemsContainer && !itemsContainer.dataset.delegated) {
    itemsContainer.dataset.delegated = '1';
    itemsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-cart-action]');
      if (!btn) return;
      const action = btn.dataset.cartAction;
      const cid = btn.dataset.cartId;
      if (!cid) return;
      if (action === 'remove') {
        window.removeCartItem(cid);
      } else if (action === 'qty') {
        const delta = parseInt(btn.dataset.delta || '0', 10);
        if (delta) window.changeCartQty(cid, delta);
      }
    });
  }

  const promoBtn = document.getElementById('btnApplyPromo');
  if (promoBtn) {
    promoBtn.addEventListener('click', applyPromoCode);
  }

  const checkoutBtn = document.getElementById('btnCartCheckout');
  if (checkoutBtn) {
    checkoutBtn.addEventListener('click', () => {
      if (getCartTotal() < MIN_ORDER_THRESHOLD) {
        showToast(`Минимальная сумма заказа — ${formatPrice(MIN_ORDER_THRESHOLD)}`);
        return;
      }
      openCheckoutModal();
      playChime(550);
    });
  }

  initCheckoutForm();
  updateCartBadge();
  renderCartDrawer();
}

function openCart() {
  const drawer = document.getElementById('cartDrawerBackdrop');
  if (drawer) {
    drawer.classList.add('active');
    document.body.style.overflow = 'hidden';
    renderCartDrawer();
  }
}

function closeCart() {
  const drawer = document.getElementById('cartDrawerBackdrop');
  if (drawer) {
    drawer.classList.remove('active');
    document.body.style.overflow = '';
  }
}

function addItemToCart(item, volume) {
  if (!item) return;
  const vol = volume || 'стандарт';
  const cartId = `${item.id || 'box'}__${vol}`;
  const existing = cart.find(ci => ci.cartId === cartId);

  const price = item.prices ? (item.prices[vol] || Object.values(item.prices)[0] || item.price || 0) : (item.price || 0);

  if (existing) {
    existing.qty += 1;
  } else {
    let itemName = item.name || item.title || item.fullTitle;
    if (!itemName && item.level) {
      itemName = `Secret Box «${item.level}»`;
    }
    if (!itemName || itemName === 'undefined') {
      itemName = 'VOLODIUM Парфюм';
    }

    cart.push({
      cartId: cartId,
      itemId: item.id || '',
      name: itemName,
      brand: item.brand || 'VOLODIUM PARFUM',
      volume: vol,
      price: price,
      image: resolveSafeMediaUrl(item.image || item.cdnImage, 'assets/img/aromaboxes/real_box_open_kraft.jpg'),
      qty: 1
    });
  }

  saveCart();
  updateCartBadge();
  renderCartDrawer();
  showToast(`«${item.name || item.title || 'Товар'}» добавлен в корзину`);
}

window.addItemToCartById = function(itemId, volume = 'стандарт') {
  const allItems = [...PERFUMES_DATA, ...AROMA_BOXES_DATA, ...SECRET_BOXES_DATA];
  const item = allItems.find(p => p.id === itemId);
  if (item) {
    const vol = item.prices ? (item.prices[volume] ? volume : Object.keys(item.prices)[0]) : volume;
    addItemToCart(item, vol);
  }
};

function saveCart() {
  try {
    localStorage.setItem('vp_cart', JSON.stringify(cart));
  } catch (e) {}
}

function updateCartBadge() {
  const totalCount = cart.reduce((sum, item) => sum + item.qty, 0);
  const badges = document.querySelectorAll('.cart-badge-count, .cart-count-badge');
  badges.forEach(b => {
    b.textContent = totalCount;
    b.style.display = totalCount > 0 ? 'flex' : 'none';
  });
}

function renderCartDrawer() {
  const itemsContainer = document.getElementById('cartItemsList');
  const subtotalEl = document.getElementById('cartSubtotal');
  const discountRow = document.getElementById('cartDiscountRow');
  const discountValEl = document.getElementById('cartDiscountVal');
  const totalEl = document.getElementById('cartTotal');
  const freeTrackEl = document.getElementById('freeDeliveryFill');
  const freeTextEl = document.getElementById('freeDeliveryText');
  const orderExtras = document.getElementById('cartOrderExtras');
  const stickyBottom = document.getElementById('cartStickyBottom');
  if (!itemsContainer) return;

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--bordo-primary); opacity: 0.85;">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p style="font-size: 1.15rem; color: #111216; font-weight: 600;">Ваша парфюмерная корзина пуста</p>
        <p style="font-size: 0.85rem; max-width: 280px; color: var(--text-muted); line-height: 1.45;">Выберите понравившийся аромат или готовый аромабокс в каталоге.</p>
        <button class="btn-primary" onclick="closeCart(); if(!document.getElementById('perfumesGrid')){window.location.href='catalog.html';}" style="margin-top: 1rem; padding: 0.75rem 1.5rem; font-size: 0.9rem;">Перейти к ароматам</button>
      </div>
    `;
    if (orderExtras) orderExtras.style.display = 'none';
    if (stickyBottom) stickyBottom.style.display = 'none';
    if (subtotalEl) subtotalEl.textContent = '0 ₽';
    if (totalEl) totalEl.textContent = '0 ₽';
    if (discountRow) discountRow.style.display = 'none';
    if (freeTrackEl) freeTrackEl.style.width = '0%';
    if (freeTextEl) freeTextEl.innerHTML = `Бесплатная доставка СДЭК при заказе от&nbsp;<strong>5&nbsp;000&nbsp;₽</strong>`;
    return;
  }

  if (orderExtras) orderExtras.style.display = 'block';
  if (stickyBottom) stickyBottom.style.display = 'block';

  itemsContainer.innerHTML = cart.map(item => {
    const rawName = (item.name && item.name !== 'undefined' && item.name !== 'null') ? item.name : (item.title || 'Фирменный сет Volodium');
    const rawVol = (item.volume && item.volume !== 'undefined' && item.volume !== 'null') ? item.volume : 'стандарт';
    const volMeta = rawVol === 'bottle' ? 'Полноразмерный флакон' : 
                    (item.itemId && item.itemId.startsWith('box-') ? `Сет из 5 флаконов × ${rawVol}` : `Отливант ${rawVol}`);
    const imgSrc = resolveSafeMediaUrl(item.image, 'assets/img/aromaboxes/real_box_open_kraft.jpg');
    const cidEsc = escapeHtml(String(item.cartId || ''));
    return `
    <div class="cart-item">
      <img class="cart-item-img" src="${escapeHtml(imgSrc)}" alt="${escapeHtml(rawName)}" onerror="this.onerror=null;this.src='assets/img/aromaboxes/real_box_open_kraft.jpg';">
      <div class="cart-item-info">
        <div class="cart-item-top">
          <div class="cart-item-title">${escapeHtml(rawName)}</div>
          <button class="cart-item-del" data-cart-action="remove" data-cart-id="${cidEsc}" title="Удалить" aria-label="Удалить товар">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>
        <div class="cart-item-meta">${escapeHtml(volMeta)}</div>
        <div class="cart-item-bot">
          <div class="cart-item-qty">
            <button class="qty-btn" data-cart-action="qty" data-delta="-1" data-cart-id="${cidEsc}" aria-label="Уменьшить">−</button>
            <span class="qty-number">${Math.max(1, Number(item.qty) || 1)}</span>
            <button class="qty-btn" data-cart-action="qty" data-delta="1" data-cart-id="${cidEsc}" aria-label="Увеличить">+</button>
          </div>
          <div class="cart-item-price">${formatPrice((Number(item.price) || 0) * Math.max(1, Number(item.qty) || 1))}</div>
        </div>
      </div>
    </div>
  `}).join('');

  const subtotal = getCartSubtotal();
  const total = getCartTotal();
  const discountAmount = subtotal - total;

  if (subtotalEl) subtotalEl.textContent = formatPrice(subtotal);
  if (totalEl) totalEl.textContent = formatPrice(total);

  if (discountRow && discountValEl) {
    if (appliedPromo && discountAmount > 0) {
      discountRow.style.display = 'flex';
      discountValEl.textContent = `-${formatPrice(discountAmount)} (${appliedPromo.discountPercent}%)`;
    } else {
      discountRow.style.display = 'none';
    }
  }

  // Free delivery progress
  if (freeTrackEl && freeTextEl) {
    const denom = FREE_DELIVERY_THRESHOLD > 0 ? FREE_DELIVERY_THRESHOLD : 1;
    const pct = Math.min(100, Math.round((total / denom) * 100));
    freeTrackEl.style.width = `${pct}%`;
    if (total >= FREE_DELIVERY_THRESHOLD) {
      freeTextEl.innerHTML = `✨ <strong>Поздравляем!</strong> Вам доступна бесплатная доставка СДЭК`;
    } else {
      const diff = FREE_DELIVERY_THRESHOLD - total;
      freeTextEl.innerHTML = `До бесплатной доставки осталось <strong>${formatPrice(diff)}</strong>`;
    }
  }
}

window.changeCartQty = function(cartId, delta) {
  const item = cart.find(ci => ci.cartId === cartId);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter(ci => ci.cartId !== cartId);
  }
  saveCart();
  updateCartBadge();
  renderCartDrawer();
  playChime(500);
};

window.removeCartItem = function(cartId) {
  cart = cart.filter(ci => ci.cartId !== cartId);
  saveCart();
  updateCartBadge();
  renderCartDrawer();
  playChime(350);
  showToast('Товар удален из корзины');
};

function getCartSubtotal() {
  return cart.reduce((sum, item) => sum + ((Number(item.price) || 0) * Math.max(1, Number(item.qty) || 1)), 0);
}

function getCartTotal() {
  const sub = getCartSubtotal();
  if (appliedPromo && appliedPromo.discountPercent) {
    return Math.round(sub * (1 - appliedPromo.discountPercent / 100));
  }
  return sub;
}

function applyPromoCode() {
  const input = document.getElementById('promoCodeInput');
  if (!input) return;
  const code = input.value.trim().toUpperCase();
  const found = findActivePromo(code);

  if (found) {
    const pct = Math.min(90, Math.max(1, Number(found.discountPercent) || 10));
    appliedPromo = { code: String(found.code).trim().toUpperCase(), discountPercent: pct };
    renderCartDrawer();
    showToast(`Промокод применен: скидка ${pct}% на ваш заказ`);
  } else {
    showToast('Неверный промокод или срок его действия истек');
  }
}

window.copyPromoCode = function(code) {
  const firstActive = (Array.isArray(DYNAMIC_PROMO_CODES) && DYNAMIC_PROMO_CODES.find(p => p && p.active !== false)) || null;
  const targetCode = String(code || firstActive?.code || 'СТАРТ').trim().toUpperCase();
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(targetCode).catch(() => {});
  }
  const input = document.getElementById('promoCodeInput');
  if (input) {
    input.value = targetCode;
  }
  const found = findActivePromo(targetCode);
  const pct = found ? Math.min(90, Math.max(1, Number(found.discountPercent) || 10)) : (Number(firstActive?.discountPercent) || 10);
  appliedPromo = { code: targetCode, discountPercent: pct };
  openCart();
  renderCartDrawer();
  playChime(660);
  showToast(`Промокод «${targetCode}» активирован! Скидка ${pct}% применена.`);
};

/* ==========================================================================
   7. Checkout Form & Telegram Order Forwarding
   ========================================================================== */
function openCheckoutModal() {
  closeCart(); // Close cart drawer so it doesn't overlap/block checkout
  const backdrop = document.getElementById('checkoutModalBackdrop');
  if (backdrop) {
    backdrop.classList.add('active');
    document.body.style.overflow = 'hidden';
    const totalEl = document.getElementById('checkoutDisplayTotal');
    if (totalEl) totalEl.textContent = formatPrice(getCartTotal());
  }
}

function closeCheckoutModal() {
  const backdrop = document.getElementById('checkoutModalBackdrop');
  if (backdrop) {
    backdrop.classList.remove('active');
    document.body.style.overflow = '';
  }
}
window.openCheckoutModal = openCheckoutModal;
window.closeCheckoutModal = closeCheckoutModal;

function initCheckoutForm() {
  const form = document.getElementById('checkoutForm');
  const closeBtn = document.getElementById('btnCheckoutClose');
  const checkoutBackdrop = document.getElementById('checkoutModalBackdrop');
  const messengerButtons = document.querySelectorAll('.cms-btn');
  const messengerHint = document.getElementById('checkoutMessengerHint');
  const submitBtnText = document.getElementById('btnCheckoutSubmitText');
  let selectedMessenger = 'Telegram';

  if (messengerButtons.length) {
    messengerButtons.forEach((btn) => {
      btn.addEventListener('click', () => {
        messengerButtons.forEach((b) => {
          b.classList.remove('active');
          b.setAttribute('aria-checked', 'false');
        });
        btn.classList.add('active');
        btn.setAttribute('aria-checked', 'true');
        selectedMessenger = btn.getAttribute('data-messenger') || 'Telegram';

        const cfg = getCheckoutMessengerMeta(selectedMessenger);
        if (messengerHint) messengerHint.textContent = cfg.hint;
        if (submitBtnText) submitBtnText.textContent = cfg.btnText;
        if (typeof playChime === 'function') playChime(620);
      });
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeCheckoutModal();
    });
  }

  if (checkoutBackdrop) {
    checkoutBackdrop.addEventListener('click', (e) => {
      if (e.target === checkoutBackdrop) {
        closeCheckoutModal();
      }
    });
  }

  if (!form) return;

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = form.querySelector('[name="name"]').value.trim();
    const phone = form.querySelector('[name="phone"]').value.trim();
    const delivery = form.querySelector('[name="delivery"]').value;
    const address = form.querySelector('[name="address"]').value.trim();
    const comment = form.querySelector('[name="comment"]').value.trim();

    if (!name || !phone) {
      showToast('Пожалуйста, заполните ваше имя и телефон');
      return;
    }

    const total = getCartTotal();
    const itemsListText = cart.map((item, idx) => 
      `${idx + 1}. ${item.name} (${item.volume}) x ${item.qty} шт. = ${formatPrice(item.price * item.qty)}`
    ).join('\n');

    const orderText = `🛍️ НОВЫЙ ЗАКАЗ — VOLODIUM PARFUM
-----------------------------
Клиент: ${name}
Телефон: ${phone}
Канал связи: ${selectedMessenger}
Доставка: ${delivery}
Адрес / ПВЗ: ${address || 'Уточнить при подтверждении'}
${comment ? `Пожелания: ${comment}\n` : ''}
${appliedPromo ? `Промокод: ${appliedPromo.code} (-${appliedPromo.discountPercent}%)\n` : ''}
ИТОГО К ОПЛАТЕ: ${formatPrice(total)}

СОСТАВ ЗАКАЗА:
${itemsListText}
-----------------------------
После отправки менеджер свяжется для отправки реквизитов и трек-номера СДЭК.`;

    // Clear cart and show congratulations
    cart = [];
    saveCart();
    updateCartBadge();
    closeCheckoutModal();
    closeCart();

    // Trigger messenger-specific routing using live ACTIVE_CONTACTS
    const cfg = getCheckoutMessengerMeta(selectedMessenger);
    cfg.send(orderText);
  });
}

/* ==========================================================================
   8. Delivery & FAQ Tabs and Accordion
   ========================================================================== */
window.switchDeliveryTab = function(tabName) {
  const tabDelivery = document.getElementById('dfTabDelivery');
  const tabFaq = document.getElementById('dfTabFaq');
  const panelDelivery = document.getElementById('dfPanelDelivery');
  const panelFaq = document.getElementById('dfPanelFaq');

  if (!tabDelivery || !tabFaq || !panelDelivery || !panelFaq) return;

  if (tabName === 'faq') {
    tabDelivery.classList.remove('active');
    tabDelivery.setAttribute('aria-selected', 'false');
    tabFaq.classList.add('active');
    tabFaq.setAttribute('aria-selected', 'true');

    panelDelivery.classList.remove('active');
    panelFaq.classList.add('active');

    // Recalculate height for open FAQ answer
    const openItem = panelFaq.querySelector('.faq-item.open');
    if (openItem) {
      const ans = openItem.querySelector('.faq-answer');
      if (ans) ans.style.maxHeight = (ans.scrollHeight || 220) + 'px';
    }
  } else {
    tabFaq.classList.remove('active');
    tabFaq.setAttribute('aria-selected', 'false');
    tabDelivery.classList.add('active');
    tabDelivery.setAttribute('aria-selected', 'true');

    panelFaq.classList.remove('active');
    panelDelivery.classList.add('active');
  }
};

function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (questionBtn && answer) {
      if (item.classList.contains('open')) {
        answer.style.maxHeight = answer.scrollHeight ? (answer.scrollHeight + 'px') : '220px';
      }

      questionBtn.addEventListener('click', () => {
        const isOpen = item.classList.contains('open');
        // Close others
        faqItems.forEach(i => {
          i.classList.remove('open');
          const ans = i.querySelector('.faq-answer');
          if (ans) ans.style.maxHeight = null;
        });

        if (!isOpen) {
          item.classList.add('open');
          answer.style.maxHeight = (answer.scrollHeight || 220) + 'px';
          playChime(420);
        }
      });
    }
  });
}

/* ==========================================================================
   9. Official Legal Document Modals (152-ФЗ, Public Offer, Returns) & Cookies
   ========================================================================== */
function playChime() {
  // Silent audio fallback to ensure no synthetic noise
}

window.openLegalDoc = function(type) {
  const modalBackdrop = document.getElementById('legalModalBackdrop');
  const modalBody = document.getElementById('legalModalContent');
  if (!modalBackdrop || !modalBody) return;

  if (type === 'privacy') {
    modalBody.innerHTML = `
      <div class="legal-doc-header">
        <span class="section-tag">Федеральный закон № 152-ФЗ</span>
        <h3 class="legal-doc-title">Политика обработки персональных данных</h3>
        <p class="legal-doc-subtitle">Интернет-магазин нишевой парфюмерии VOLODIUM PARFUM</p>
      </div>
      <div class="legal-doc-content">
        <h4>1. Общие положения</h4>
        <p>1.1. Настоящая Политика обработки персональных данных составлена в соответствии с требованиями Федерального закона от 27.07.2006 г. № 152-ФЗ «О персональных данных» и определяет порядок сбора, систематизации, накопления, хранения и защиты конфиденциальной информации клиентов интернет-магазина VOLODIUM PARFUM (далее — «Оператор»).</p>
        <p>1.2. Оператор ставит важнейшей целью соблюдение прав и свобод человека при обработке его персональных данных, включая защиту прав на неприкосновенность частной жизни, личную и семейную тайну.</p>

        <h4>2. Состав обрабатываемых данных</h4>
        <p>2.1. Для оформления заказов, экспресс-доставки и индивидуального парфюмерного сопровождения Оператор обрабатывает следующие сведения:</p>
        <ul>
          <li>Имя и фамилия покупателя;</li>
          <li>Контактный номер телефона для связи;</li>
          <li>Никнейм в мессенджере Telegram (для отправки трек-номеров и подтверждений);</li>
          <li>Город и адрес доставки (включая выбранный пункт выдачи курьерской службы СДЭК).</li>
        </ul>

        <h4>3. Цели обработки персональных данных</h4>
        <p>3.1. Персональные данные используются строго для:</p>
        <ul>
          <li>Формирования накладных курьерской службы СДЭК и курьерской доставки по Москве и регионам РФ;</li>
          <li>Оформления заказа на оригинальную парфюмерию, персональные аромабоксы или подарочные сертификаты;</li>
          <li>Индивидуального консультирования покупателя основателем интернет-магазина Владимиром Вациком;</li>
          <li>Предоставления информации о статусе отправления и батч-кодах флаконов.</li>
        </ul>

        <h4>4. Безопасность и локализация данных (242-ФЗ)</h4>
        <p>4.1. Оператор обеспечивает конфиденциальность данных и принимает необходимые правовые и организационные меры по их защите от неправомерного доступа третьих лиц.</p>
        <p>4.2. Базы данных с персональной информацией граждан Российской Федерации размещаются на серверах, физически расположенных на территории РФ (в соответствии с Федеральным законом № 242-ФЗ).</p>
        <p>4.3. Данные не передаются третьим лицам, за исключением логистического партнера (СДЭК) в объеме, необходимом для вручения посылки.</p>

        <h4>5. Файлы Cookie</h4>
        <p>5.1. Сайт использует исключительно технические файлы cookie для корректной работы корзины и сохранения настроек.</p>
      </div>
    `;
  } else if (type === 'offer') {
    modalBody.innerHTML = `
      <div class="legal-doc-header">
        <span class="section-tag">Статьи 435, 437 ГК РФ</span>
        <h3 class="legal-doc-title">Публичная оферта интернет-магазина</h3>
        <p class="legal-doc-subtitle">Условия дистанционной розничной купли-продажи нишевой парфюмерии</p>
      </div>
      <div class="legal-doc-content">
        <h4>1. Общие положения</h4>
        <p>1.1. Настоящий документ является официальным предложением (публичной офертой по ст. 435 и п. 2 ст. 437 Гражданского кодекса РФ) интернет-магазина VOLODIUM PARFUM заключить договор розничной купли-продажи парфюмерной продукции дистанционным способом.</p>
        <p>1.2. Ознакомительная информация на страницах каталога носит информационно-демонстрационный характер. Моментом заключения договора является подтверждение заказа покупателем и согласование деталей с менеджером интернет-магазина.</p>

        <h4>2. Гарантия оригинальности и качество товара</h4>
        <p>2.1. Продавец гарантирует 100% подлинность и оригинальность всех представленных ароматов, их соответствие стандартам IFRA и возможность проверки батч-кодов перед вскрытием.</p>
        <p>2.2. Продавец передает Покупателю оригинальную парфюмерную продукцию (оригинальные духи во флаконах, атомайзерах или фирменных сетах аромабоксов), а Покупатель оплачивает товар по согласованной стоимости.</p>

        <h4>3. Оплата и доставка</h4>
        <p>3.1. Заказ оформляется через корзину сайта либо посредством прямой коммуникации в официальном канале Telegram @${escapeHtml((ACTIVE_CONTACTS && ACTIVE_CONTACTS.telegramHandle) || 'volodiumparfum')}.</p>
        <p>3.2. Доставка по территории РФ осуществляется курьерской службой СДЭК (до двери или пункта выдачи) либо специализированной курьерской службой по Москве. При сумме заказа от ${escapeHtml(formatPrice(FREE_DELIVERY_THRESHOLD))} доставка по РФ до ПВЗ СДЭК бесплатная.</p>
      </div>
    `;
  } else if (type === 'returns') {
    modalBody.innerHTML = `
      <div class="legal-doc-header">
        <span class="section-tag">Постановление Правительства РФ № 55 / № 2463</span>
        <h3 class="legal-doc-title">Регламент обмена и возврата</h3>
        <p class="legal-doc-subtitle">Правовые стандарты возврата парфюмерно-косметической продукции</p>
      </div>
      <div class="legal-doc-content">
        <h4>1. Нормативная база</h4>
        <p>1.1. В соответствии с Законом РФ «О защите прав потребителей» и <strong>Постановлением Правительства РФ № 55 от 19.01.1998 г.</strong> (а также пришедшим ему на смену Постановлением № 2463 от 31.12.2020 г.), <strong>парфюмерно-косметические товары надлежащего качества возврату и обмену на аналогичный товар не подлежат</strong>.</p>
        <p>1.2. Данное ограничение обусловлено санитарно-гигиеническими нормами, особенностями хранения тонких парфюмерных композиций и защитой покупателей от риска получения вскрытой или подмененной продукции.</p>

        <h4>2. Гарантии целостности при транспортировке</h4>
        <p>2.1. Интернет-магазин VOLODIUM PARFUM использует усиленную многослойную премиальную упаковку, защищающую флаконы от механических повреждений и температурных колебаний в процессе доставки СДЭК.</p>
        <p>2.2. При получении заказа в пункте выдачи СДЭК или от курьера Покупатель имеет право осмотреть внешнюю упаковку. В случае выявления повреждения транспортной коробки или флакона при доставке Покупатель составляет акт совместно с сотрудником СДЭК, после чего интернет-магазин VOLODIUM производит мгновенную бесплатную повторную отправку либо 100% возврат средств.</p>

        <h4>3. Проверка оригинальности и батч-кодов</h4>
        <p>3.1. До распечатывания слюды на полноразмерных флаконах покупатель может сверить батч-код на дне флакона и коробки через международные базы косметических брендов или обратиться к нам за подтверждением.</p>
      </div>
    `;
  }

  modalBackdrop.classList.add('active');
  document.body.style.overflow = 'hidden';
};

window.closeLegalDoc = function() {
  const modalBackdrop = document.getElementById('legalModalBackdrop');
  if (modalBackdrop) {
    modalBackdrop.classList.remove('active');
  }
  document.body.style.overflow = '';
};

// Close legal modal on backdrop click
document.addEventListener('click', (e) => {
  const modalBackdrop = document.getElementById('legalModalBackdrop');
  if (modalBackdrop && e.target === modalBackdrop) {
    closeLegalDoc();
  }
});

// Close modals on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    closeLegalDoc();
    const productModal = document.getElementById('productModalBackdrop');
    if (productModal && productModal.classList.contains('active')) {
      productModal.classList.remove('active');
      document.body.style.overflow = '';
    }
    const checkoutModal = document.getElementById('checkoutModalBackdrop');
    if (checkoutModal && checkoutModal.classList.contains('active')) {
      checkoutModal.classList.remove('active');
      document.body.style.overflow = '';
    }
  }
});

function initCookieBanner() {
  try {
    if (!localStorage.getItem('volodium_cookie_consent')) {
      const banner = document.getElementById('volodiumCookieBanner');
      if (banner) {
        setTimeout(() => {
          banner.style.display = 'flex';
        }, 1200);
      }
    }
  } catch (e) {}
}

window.acceptVolodiumCookies = function() {
  try {
    localStorage.setItem('volodium_cookie_consent', 'true');
  } catch (e) {}
  const banner = document.getElementById('volodiumCookieBanner');
  if (banner) {
    banner.style.opacity = '0';
    banner.style.transform = 'translate(-50%, 20px)';
    setTimeout(() => {
      banner.style.display = 'none';
    }, 300);
  }
};

/* ==========================================================================
   10. Helper Utilities & Toast System
   ========================================================================== */
function formatPrice(val) {
  return new Intl.NumberFormat('ru-RU').format(val) + ' ₽';
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>"']/g, (m) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  })[m]);
}

function showToast(msg, duration = 3500) {
  let container = document.getElementById('toastContainer');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toastContainer';
    container.className = 'toast-container';
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.innerHTML = `
    <span class="toast-sparkle" style="color: var(--gold-primary);">✦</span>
    <span class="toast-text">${escapeHtml(msg)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = window.innerWidth <= 768 ? 'translateY(-16px)' : 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
}

// Secret Boxes Mobile Carousel Sync
window.scrollToSecretCard = function(index) {
  const grid = document.querySelector('.secret-grid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.secret-card');
  if (cards[index]) {
    cards[index].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
  }
};

function initSecretBoxesCarousel() {
  const grid = document.querySelector('.secret-grid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.secret-card');
  const tabs = document.querySelectorAll('.secret-tab-btn');
  const dots = document.querySelectorAll('.secret-dot');

  let ticking = false;
  grid.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const gridCenter = grid.scrollLeft + grid.clientWidth / 2;
        let closestIndex = 0;
        let minDistance = Infinity;

        cards.forEach((card, idx) => {
          const cardCenter = card.offsetLeft + card.clientWidth / 2;
          const dist = Math.abs(gridCenter - cardCenter);
          if (dist < minDistance) {
            minDistance = dist;
            closestIndex = idx;
          }
        });

        tabs.forEach((tab, idx) => {
          const isActive = idx === closestIndex;
          tab.classList.toggle('active', isActive);
          tab.setAttribute('aria-selected', isActive ? 'true' : 'false');
        });

        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === closestIndex);
        });

        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

function initReviewsCarousel() {
  const grid = document.querySelector('.reviews-editorial-grid');
  if (!grid) return;
  const cards = grid.querySelectorAll('.review-editorial-card');
  const dotsNav = document.getElementById('reviewsDotsNav');
  if (dotsNav && cards.length > 0) {
    const currentDots = dotsNav.querySelectorAll('.reviews-dot');
    if (currentDots.length !== cards.length) {
      dotsNav.innerHTML = '';
      cards.forEach((_, idx) => {
        const dot = document.createElement('span');
        dot.className = 'reviews-dot' + (idx === 0 ? ' active' : '');
        dot.dataset.index = idx;
        dotsNav.appendChild(dot);
      });
    }
  }
  const dots = document.querySelectorAll('.reviews-dot');
  if (!dots.length) return;

  dots.forEach((dot, idx) => {
    dot.addEventListener('click', () => {
      if (cards[idx]) {
        cards[idx].scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
      }
    });
  });

  let ticking = false;
  grid.addEventListener('scroll', () => {
    if (!ticking) {
      window.requestAnimationFrame(() => {
        const gridCenter = grid.scrollLeft + grid.clientWidth / 2;
        let closestIndex = 0;
        let minDistance = Infinity;

        cards.forEach((card, idx) => {
          const cardCenter = card.offsetLeft + card.clientWidth / 2;
          const dist = Math.abs(gridCenter - cardCenter);
          if (dist < minDistance) {
            minDistance = dist;
            closestIndex = idx;
          }
        });

        dots.forEach((dot, idx) => {
          dot.classList.toggle('active', idx === closestIndex);
        });

        ticking = false;
      });
      ticking = true;
    }
  }, { passive: true });
}

function initSmoothScroll() {
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function(e) {
      const targetId = this.getAttribute('href');
      if (!targetId || targetId === '#' || targetId === '#opencart') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
        // Close Saisei menu if open
        if (typeof closeSaiseiMenu === 'function') closeSaiseiMenu();
      }
    });
  });
}

/* ==========================================================================
   Bespoke Volodium Boutique Drawer Controller (100% Volodium Identity)
   ========================================================================== */
function initVolodiumDrawer() {
  const menuBtn = document.getElementById('volodiumMenuBtn') || document.getElementById('saiseiMenuBtn');
  const drawerOverlay = document.getElementById('volodiumDrawer') || document.getElementById('saiseiMenuOverlay');
  const closeBtn = document.getElementById('vDrawerCloseBtn') || document.getElementById('smoCleanCloseBtn');
  const labelEl = menuBtn ? menuBtn.querySelector('.vmt-label, .smt-label') : null;

  function openDrawer() {
    if (!drawerOverlay) return;
    drawerOverlay.classList.add('is-open');
    drawerOverlay.setAttribute('aria-hidden', 'false');
    if (menuBtn) {
      menuBtn.classList.add('is-active');
      menuBtn.setAttribute('aria-expanded', 'true');
      if (labelEl) labelEl.textContent = 'ЗАКРЫТЬ';
    }
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
  }

  function closeDrawer() {
    if (!drawerOverlay) return;
    drawerOverlay.classList.remove('is-open');
    drawerOverlay.setAttribute('aria-hidden', 'true');
    if (menuBtn) {
      menuBtn.classList.remove('is-active');
      menuBtn.setAttribute('aria-expanded', 'false');
      if (labelEl) labelEl.textContent = 'МЕНЮ';
    }
    document.documentElement.style.overflow = '';
    document.body.style.overflow = '';
  }

  function toggleDrawer(force) {
    if (typeof force === 'boolean') {
      if (force) openDrawer();
      else closeDrawer();
      return;
    }
    if (drawerOverlay && drawerOverlay.classList.contains('is-open')) {
      closeDrawer();
    } else {
      openDrawer();
    }
  }

  if (menuBtn) {
    menuBtn.onclick = (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDrawer();
    };
  }

  if (closeBtn) {
    closeBtn.onclick = (e) => {
      e.preventDefault();
      closeDrawer();
    };
  }

  const drawerBackdrop = drawerOverlay ? drawerOverlay.querySelector('.v-drawer-backdrop') : null;
  if (drawerBackdrop) {
    drawerBackdrop.onclick = (e) => {
      e.preventDefault();
      closeDrawer();
    };
  }

  if (drawerOverlay) {
    drawerOverlay.querySelectorAll('.v-drawer-link, .smo-clean-link').forEach(link => {
      link.addEventListener('click', () => {
        closeDrawer();
      });
    });
  }

  // Close on Escape key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      if (drawerOverlay && drawerOverlay.classList.contains('is-open')) {
        closeDrawer();
      }
      closeBusinessCardModal();
    }
  });

  window.toggleVolodiumMenu = toggleDrawer;
  window.openVolodiumMenu = openDrawer;
  window.closeVolodiumMenu = closeDrawer;
  // Backward compatibility aliases
  window.openSaiseiMenu = openDrawer;
  window.closeSaiseiMenu = closeDrawer;
  window.toggleSaiseiMenu = toggleDrawer;
}

function switchTesterExpertImg(btn, src) {
  const img = document.getElementById('testerExpertImg');
  if (img) {
    img.style.opacity = '0.3';
    setTimeout(() => {
      img.src = src;
      img.style.opacity = '1';
    }, 140);
  }
  const tabs = btn && btn.parentElement ? btn.parentElement.querySelectorAll('.tec-tab') : [];
  tabs.forEach(t => t.classList.remove('active'));
  if (btn) btn.classList.add('active');
}
window.switchTesterExpertImg = switchTesterExpertImg;

/* ==========================================================================
   Business Card Print Center & QR Modal Controller
   ========================================================================== */
function openBusinessCardModal() {
  if (typeof closeSaiseiMenu === 'function') closeSaiseiMenu();
  const backdrop = document.getElementById('businessCardModalBackdrop');
  if (backdrop) {
    backdrop.style.display = 'flex';
    document.body.style.overflow = 'hidden';
    if (typeof playChime === 'function') playChime(640);
  }
}

function closeBusinessCardModal() {
  const backdrop = document.getElementById('businessCardModalBackdrop');
  if (backdrop) {
    backdrop.style.display = 'none';
    document.body.style.overflow = '';
  }
}

function switchCardPreview(side) {
  const backView = document.getElementById('cardBackView');
  const frontView = document.getElementById('cardFrontView');
  const btnBack = document.getElementById('btnCardBackTab');
  const btnFront = document.getElementById('btnCardFrontTab');

  if (side === 'front') {
    if (backView) backView.style.display = 'none';
    if (frontView) frontView.style.display = 'block';
    if (btnBack) btnBack.classList.remove('active');
    if (btnFront) btnFront.classList.add('active');
  } else {
    if (frontView) frontView.style.display = 'none';
    if (backView) backView.style.display = 'block';
    if (btnFront) btnFront.classList.remove('active');
    if (btnBack) btnBack.classList.add('active');
  }
}

window.openBusinessCardModal = openBusinessCardModal;
window.closeBusinessCardModal = closeBusinessCardModal;
window.switchCardPreview = switchCardPreview;

/* ==========================================================================
   PERFUME QUESTIONNAIRE CONTROLLER (Парфюмерная Анкета Владимира Вацика)
   ========================================================================== */
let currentQuizStep = 1;
const quizState = {
  gender: 'Девушке / Женщине',
  occasion: 'Каждый день & Офис',
  vibe: 'Чувственность & Магнетизм',
  sillage: 'Интеллигентный шлейф (2.0 м)',
  sweetness: 'Умеренная сладость (50%)',
  families: ['Белоцветочные', 'Древесные & Уд'],
  name: '',
  telegram: '',
  tabooCustom: ''
};

function initQuiz() {
  const quizForm = document.getElementById('quizForm');
  if (!quizForm) return;

  // Setup tactile cards (Steps 1, 2, 3)
  document.querySelectorAll('.quiz-tactile-card').forEach(card => {
    card.addEventListener('click', () => {
      const parentGrid = card.closest('.quiz-tactile-grid');
      if (parentGrid) {
        parentGrid.querySelectorAll('.quiz-tactile-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        const qKey = parentGrid.dataset.question;
        if (qKey && card.dataset.val) {
          quizState[qKey] = card.dataset.val;
        }
      }
      if (typeof playChime === 'function') playChime(520);
    });
  });

  // Setup sillage radar cards (Step 4)
  document.querySelectorAll('.quiz-sillage-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.quiz-sillage-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      if (card.dataset.val) quizState.sillage = card.dataset.val;
      if (typeof playChime === 'function') playChime(580);
    });
  });

  // Setup sweetness meter cards (Step 5)
  document.querySelectorAll('.quiz-sweetness-cards .quiz-meter-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.quiz-sweetness-cards .quiz-meter-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      if (card.dataset.val) quizState.sweetness = card.dataset.val;
      if (typeof playChime === 'function') playChime(500);
    });
  });

  // Setup family cards (Step 6 - Multi-select)
  document.querySelectorAll('.quiz-family-card').forEach(card => {
    card.addEventListener('click', () => {
      card.classList.toggle('selected');
      const selectedFamilies = Array.from(document.querySelectorAll('.quiz-family-card.selected'))
        .map(c => c.dataset.family)
        .filter(Boolean);
      quizState.families = selectedFamilies;
      if (typeof playChime === 'function') playChime(600);
    });
  });

  // Global step navigation methods
  window.quizNextStep = function(fromStep) {
    goToQuizStep(fromStep + 1);
  };

  window.quizPrevStep = function(fromStep) {
    goToQuizStep(fromStep - 1);
  };

  window.finishQuizAndShowResult = function() {
    const nameInput = document.getElementById('quizName');
    const tgInput = document.getElementById('quizTelegram');

    if (nameInput && !nameInput.value.trim()) {
      showToast('Пожалуйста, укажите ваше имя');
      nameInput.focus();
      return;
    }

    if (tgInput && !tgInput.value.trim()) {
      showToast('Пожалуйста, укажите Telegram или телефон для связи');
      tgInput.focus();
      return;
    }

    quizState.name = nameInput ? nameInput.value.trim() : 'Гость';
    quizState.telegram = tgInput ? tgInput.value.trim() : '';
    const tabooInput = document.getElementById('quizTabooCustom');
    quizState.tabooCustom = tabooInput ? tabooInput.value.trim() : '';

    // Populate result card summary items
    const elGender = document.getElementById('resSummaryGender');
    const elOccasion = document.getElementById('resSummaryOccasion');
    const elVibe = document.getElementById('resSummaryVibe');
    const elSillage = document.getElementById('resSummarySillage');
    const elSweetness = document.getElementById('resSummarySweetness');
    const elFamilies = document.getElementById('resSummaryFamilies');
    const elTitle = document.getElementById('quizSummaryTitle');

    if (elGender) elGender.textContent = quizState.gender;
    if (elOccasion) elOccasion.textContent = quizState.occasion;
    if (elVibe) elVibe.textContent = quizState.vibe;
    if (elSillage) elSillage.textContent = quizState.sillage;
    if (elSweetness) elSweetness.textContent = quizState.sweetness;
    if (elFamilies) elFamilies.textContent = quizState.families.length > 0 ? quizState.families.join(', ') : 'Индивидуально';
    if (elTitle) elTitle.textContent = `Карта звучания для ${quizState.name}`;

    goToQuizStep(8);
  };
}

function goToQuizStep(step) {
  if (step < 1 || step > 8) return;
  currentQuizStep = step;

  // Toggle active step
  document.querySelectorAll('.quiz-step').forEach(s => {
    const sNum = parseInt(s.dataset.step, 10);
    s.classList.toggle('active', sNum === step);
  });

  // Step labels and percentages
  const stepLabels = {
    1: 'Вопрос 1 из 7: Кому подбираем аромат?',
    2: 'Вопрос 2 из 7: Главный повод и обстановка',
    3: 'Вопрос 3 из 7: Желаемое впечатление и шлейф',
    4: 'Вопрос 4 из 7: Комфортная дистанция (Sillage)',
    5: 'Вопрос 5 из 7: Уровень сладости в композиции',
    6: 'Вопрос 6 из 7: Любимые семейства нот',
    7: 'Вопрос 7 из 7: Ваши контакты и пожелания',
    8: 'Ваш ольфакторный профиль сформирован'
  };
  const percentages = {
    1: '14%',
    2: '28%',
    3: '42%',
    4: '57%',
    5: '71%',
    6: '85%',
    7: '100%',
    8: '100%'
  };

  const labelEl = document.getElementById('quizStepLabel');
  const percentEl = document.getElementById('quizProgressPercent');
  const fillEl = document.getElementById('quizProgressFill');

  if (labelEl) labelEl.textContent = stepLabels[step] || '';
  if (percentEl) percentEl.textContent = percentages[step] || '100%';
  if (fillEl) fillEl.style.width = percentages[step] || '100%';

  if (typeof playChime === 'function') playChime(460 + step * 35);

  // Smooth scroll quiz card into view
  const wizardCard = document.querySelector('.quiz-wizard-card');
  if (wizardCard) {
    const rect = wizardCard.getBoundingClientRect();
    if (rect.top < 0 || rect.top > 250) {
      wizardCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }
}

function collectQuizData() {
  const genderEl = document.querySelector('.quiz-tactile-grid[data-question="gender"] .quiz-tactile-card.selected');
  const occasionEl = document.querySelector('.quiz-tactile-grid[data-question="occasion"] .quiz-tactile-card.selected');
  const vibeEl = document.querySelector('.quiz-tactile-grid[data-question="vibe"] .quiz-tactile-card.selected');
  const sillageEl = document.querySelector('.quiz-sillage-card.selected');
  const sweetnessEl = document.querySelector('.quiz-sweetness-cards .quiz-meter-card.selected');
  const familyEls = Array.from(document.querySelectorAll('.quiz-family-card.selected')).map(c => c.dataset.family).filter(Boolean);

  const name = document.getElementById('quizName')?.value.trim() || quizState.name || 'Гость';
  const telegram = document.getElementById('quizTelegram')?.value.trim() || quizState.telegram || '';
  const taboo = document.getElementById('quizTabooCustom')?.value.trim() || quizState.tabooCustom || 'Нет табу';

  return {
    name,
    gender: genderEl?.dataset.val || quizState.gender,
    occasion: occasionEl?.dataset.val || quizState.occasion,
    vibe: vibeEl?.dataset.val || quizState.vibe,
    sillage: sillageEl?.dataset.val || quizState.sillage,
    sweetness: sweetnessEl?.dataset.val || quizState.sweetness,
    families: familyEls.length > 0 ? familyEls : quizState.families,
    taboo,
    telegram
  };
}

window.submitQuizToTelegram = function() {
  const data = collectQuizData();
  if (!data.telegram) {
    showToast('Пожалуйста, укажите ваш Telegram или телефон');
    goToQuizStep(7);
    const tgInput = document.getElementById('quizTelegram');
    if (tgInput) tgInput.focus();
    return;
  }

  const lines = [
    `✨ *ПАРФЮМЕРНАЯ АНКЕТА VOLODIUM* ✨`,
    ``,
    `👤 *Имя:* ${data.name}`,
    `💎 *Профиль:* ${data.gender}`,
    `🎯 *Главный повод:* ${data.occasion}`,
    `🔥 *Атмосфера / Шлейф:* ${data.vibe}`,
    `💨 *Дистанция шлейфа:* ${data.sillage}`,
    `🍬 *Сладость:* ${data.sweetness}`,
    `🌸 *Любимые семейства нот:* ${data.families.join(', ')}`,
    `🚫 *Ноты-табу (исключить):* ${data.taboo}`,
    ``,
    `📱 *Контакт:* ${data.telegram}`
  ];

  const fullText = lines.join('\n');
  const encoded = encodeURIComponent(fullText);
  const tgHandle = encodeURIComponent((ACTIVE_CONTACTS && ACTIVE_CONTACTS.telegramHandle) || 'volodiumparfum');
  const tgUrl = `https://t.me/${tgHandle}?text=${encoded}`;

  if (typeof playChime === 'function') playChime(660);
  showToast('Ольфакторный паспорт сформирован! Открываем диалог с Владимиром...');

  setTimeout(() => {
    window.open(tgUrl, '_blank', 'noopener,noreferrer');
  }, 400);
};

window.attachQuizToSecretBox = function() {
  const data = collectQuizData();
  try {
    sessionStorage.setItem('vp_quiz_answers', JSON.stringify(data));
  } catch (e) {}

  if (typeof playChime === 'function') playChime(580);
  showToast('Анкета прикреплена к Secret Box! Выберите подходящий объем сета');

  const secretSection = document.getElementById('secret-boxes');
  if (secretSection) {
    secretSection.scrollIntoView({ behavior: 'smooth' });
  }
};

/* ==========================================================================
   GIFT CERTIFICATES STUDIO CONTROLLER (Подарочные сертификаты)
   ========================================================================== */
let certState = {
  format: 'digital', // 'digital' or 'physical'
  recipient: 'Алисе',
  amount: 5000,
  serviceKey: 'consultation',
  serviceTitle: 'Индивидуальный парфюмерный гардероб',
  greeting: '',
  code: 'VP-2026-' + Math.floor(1000 + Math.random() * 9000)
};

let certIsFlipped = false;

window.toggleCertFlip = function(e) {
  if (e) {
    e.stopPropagation();
  }
  const card = document.getElementById('certCard3d');
  if (!card) return;

  certIsFlipped = !certIsFlipped;
  card.classList.toggle('flipped', certIsFlipped);

  const baseRotY = certIsFlipped ? 180 : 0;
  card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(${baseRotY}deg) scale3d(1, 1, 1)`;

  const glare = document.getElementById('certFoilGlare');
  if (glare) {
    glare.style.opacity = '0';
  }
};

function initCertificates() {
  const scene = document.getElementById('cert3dScene');
  const card = document.getElementById('certCard3d');
  const glare = document.getElementById('certFoilGlare');

  if (!card) return;

  // 1. 3D Perspective Tilt on Mousemove with Flip Awareness
  if (scene) {
    scene.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = -((y - centerY) / centerY) * 10;
      const tiltY = ((x - centerX) / centerX) * 10;
      const baseRotY = certIsFlipped ? 180 : 0;
      const finalRotY = certIsFlipped ? baseRotY - tiltY : tiltY;

      card.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${finalRotY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

      if (glare && !certIsFlipped) {
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;
        glare.style.setProperty('--glare-x', `${glareX}%`);
        glare.style.setProperty('--glare-y', `${glareY}%`);
        glare.style.opacity = '1';
      } else if (glare) {
        glare.style.opacity = '0';
      }
    });

    scene.addEventListener('mouseleave', () => {
      const baseRotY = certIsFlipped ? 180 : 0;
      card.style.transform = `perspective(1200px) rotateX(0deg) rotateY(${baseRotY}deg) scale3d(1, 1, 1)`;
      if (glare) {
        glare.style.opacity = '0';
      }
    });
  }

  // 2. Gyroscope support for mobile tilt with Flip Awareness
  if (window.DeviceOrientationEvent && window.innerWidth <= 768) {
    window.addEventListener('deviceorientation', (e) => {
      if (e.beta !== null && e.gamma !== null) {
        const tiltX = Math.min(Math.max((e.beta - 45) * 0.3, -8), 8);
        const tiltY = Math.min(Math.max(e.gamma * 0.3, -8), 8);
        const baseRotY = certIsFlipped ? 180 : 0;
        const finalRotY = certIsFlipped ? baseRotY - tiltY : tiltY;
        card.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${finalRotY.toFixed(2)}deg)`;
      }
    });
  }

  // 3. Recipient Name Live Sync
  const recipientInput = document.getElementById('certRecipientInput');
  if (recipientInput) {
    recipientInput.addEventListener('input', (e) => {
      const val = e.target.value.trim() || 'Для тебя';
      certState.recipient = val;
      const displayEl = document.getElementById('certLiveRecipient');
      if (displayEl) displayEl.textContent = val;
    });
  }

  // 4. Custom Amount Input Live Sync
  const customAmountInput = document.getElementById('certCustomAmount');
  if (customAmountInput) {
    customAmountInput.addEventListener('input', (e) => {
      const val = parseInt(e.target.value, 10);
      if (val && val >= 500) {
        document.querySelectorAll('.cert-preset-btn').forEach(btn => btn.classList.remove('active'));
        updateCertPrice(val);
      }
    });
  }

  // 5. Service Radio Options
  document.querySelectorAll('.cert-service-opt').forEach(opt => {
    opt.addEventListener('click', () => {
      document.querySelectorAll('.cert-service-opt').forEach(o => o.classList.remove('active'));
      opt.classList.add('active');
      const radio = opt.querySelector('input[type="radio"]');
      if (radio) {
        radio.checked = true;
        window.setCertService(radio.value);
      }
    });
  });

  // Global methods
  window.setCertFormat = function(fmt) {
    certState.format = fmt;
    document.querySelectorAll('.cert-format-btn').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.format === fmt);
    });
    playChime(500);
  };

  window.setCertAmount = function(amount) {
    certState.amount = amount;
    document.querySelectorAll('.cert-preset-btn').forEach(btn => {
      btn.classList.toggle('active', parseInt(btn.dataset.amount, 10) === amount);
    });
    const customInput = document.getElementById('certCustomAmount');
    if (customInput) customInput.value = '';
    updateCertPrice(amount);
    playChime(560);
  };

  window.setCertService = function(serviceKey) {
    certState.serviceKey = serviceKey;
    const services = {
      consultation: 'Индивидуальный парфюмерный гардероб',
      deposit: 'Депозит на коллекцию магазина',
      secret_box: 'Персональный Secret Box Владимира Вацика'
    };
    certState.serviceTitle = services[serviceKey] || services.consultation;
    const displayEl = document.getElementById('certLiveService');
    if (displayEl) displayEl.textContent = certState.serviceTitle;
    playChime(520);
  };

  window.addCertificateToCart = function() {
    const greeting = document.getElementById('certGreetingInput')?.value.trim() || '';
    const certItem = {
      id: `cert-${Date.now()}`,
      name: `Подарочный сертификат «${certState.recipient}»`,
      brand: 'VOLODIUM PARFUM',
      category: 'certificate',
      price: certState.amount,
      prices: { standard: certState.amount },
      image: 'assets/img/certificates/cert_vladimir_official.jpg',
      format: certState.format === 'digital' ? 'Электронный' : 'Фирменный тубус с сургучом',
      recipient: certState.recipient,
      service: certState.serviceTitle,
      greeting: greeting,
      code: certState.code
    };

    addItemToCart(certItem, certState.format === 'digital' ? 'электронный' : 'тубус с сургучом');
    openCart();
    playChime(660);
  };

  window.orderCertInTelegram = function() {
    const greeting = document.getElementById('certGreetingInput')?.value.trim();
    const fmtLabel = certState.format === 'digital' ? 'Электронный (Telegram / PDF)' : 'Фирменный конверт/тубус с сургучной печатью';

    const text = [
      `🎁 *ЗАКАЗ ПОДАРОЧНОГО СЕРТИФИКАТА VOLODIUM* 🎁`,
      ``,
      `👤 *Кому:* ${certState.recipient}`,
      `💰 *Сумма депозита:* ${formatPrice(certState.amount)}`,
      `📦 *Формат:* ${fmtLabel}`,
      `🎯 *На услугу:* ${certState.serviceTitle}`,
      greeting ? `💌 *Пожелание на вкладыше:* ${greeting}` : '',
      `🔑 *Код активации:* ${certState.code}`
    ].filter(Boolean).join('\n');

    const tgHandle = encodeURIComponent((ACTIVE_CONTACTS && ACTIVE_CONTACTS.telegramHandle) || 'volodiumparfum');
    const tgUrl = `https://t.me/${tgHandle}?text=${encodeURIComponent(text)}`;
    playChime(660);
    showToast('Переходим в Telegram для оформления сертификата...');
    setTimeout(() => {
      window.open(tgUrl, '_blank', 'noopener,noreferrer');
    }, 400);
  };
}

function updateCertPrice(amount) {
  certState.amount = amount;
  const depositLiveEl = document.getElementById('certLiveDeposit');
  const sumDisplayEl = document.getElementById('certSumDisplay');

  if (depositLiveEl) {
    depositLiveEl.textContent = `${amount.toLocaleString('ru-RU')} ₽`;
  }
  if (sumDisplayEl) {
    sumDisplayEl.textContent = formatPrice(amount);
  }
}




