/**
 * VOLODIUM PARFUM — Application Logic & Interactive Experience
 * Pure modern vanilla JS (ES6+), 60fps animations, interactive aroma pyramid,
 * interactive fragrance quiz, 3D certificate studio, and real-time cart.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all subsystems
  initMonroeIntro();
  initHeroCanvas();
  initHeroLookbook();
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
  initQuickNav();
});

/* ==========================================================================
   0. Monroe Handwriting Intro Controller
   ========================================================================== */
function initMonroeIntro() {
  const intro = document.getElementById('monroeIntro');
  const replayBtn = document.getElementById('btnReplayIntro');
  if (!intro) return;

  let autoTimer = null;
  let canDismiss = false;

  // Lock scroll while intro is playing
  document.body.style.overflow = 'hidden';

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
    document.body.style.overflow = '';
  }
  window.dismissMonroeIntro = dismissIntro;

  function playIntro() {
    canDismiss = false;
    setTimeout(() => {
      canDismiss = true;
    }, 150);
    intro.classList.remove('hidden');
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
   1.1 Hero Editorial Lookbook & Cinematic Background Mode
   ========================================================================== */
const HERO_LOOKBOOK_ITEMS = [
  {
    image: 'assets/img/editorial/vladimir_atomizer_portrait.jpg',
    tag: 'STUDIO EDITORIAL • 01',
    title: 'ВЛАДИМИР ВАЦИК',
    sub: '«Парфюм как чувственное продолжение вашей индивидуальности»'
  },
  {
    image: 'assets/img/editorial/vladimir_box_shoulder.jpg',
    tag: 'HAUTE PARFUMERIE • 02',
    title: 'СЕЛЕКТИВНЫЙ БОКС',
    sub: '«Каждый сет собирается вручную и сопровождается личным посланием»'
  },
  {
    image: 'assets/img/editorial/vladimir_flacon_chair.jpg',
    tag: 'PRIVATE SALON • 03',
    title: 'НИШЕВАЯ КОЛЛЕКЦИЯ',
    sub: '«Более 277+ редких композиций и очные встречи в Москве»'
  },
  {
    image: 'assets/img/editorial/vladimir_blotters_monochrome.jpg',
    tag: 'ATELIER NOIR • 04',
    title: 'ИСКУССТВО РАСПИВА',
    sub: '«Итальянские стеклянные флаконы и батч-код верификация»'
  }
];

let heroLookbookIndex = 0;
let heroLookbookTimer = null;
let heroCinematicMode = false;

function initHeroLookbook() {
  const frame = document.getElementById('heroLookbookFrame');
  if (!frame) return;

  // Restore saved cinematic mode from localStorage
  try {
    const savedMode = localStorage.getItem('volodium_hero_cinematic');
    if (savedMode === 'true') {
      heroCinematicMode = true;
      const hero = document.getElementById('hero');
      if (hero) hero.classList.add('hero-cinematic-mode');
      document.body.classList.add('hero-cinematic-active');
      const item = HERO_LOOKBOOK_ITEMS[heroLookbookIndex];
      const backdropImg = document.getElementById('heroBackdropImg');
      if (backdropImg && item) {
        backdropImg.style.backgroundImage = `url('${item.image}')`;
      }
      updateHeroBgBtnState();
    }
  } catch (e) {}

  // Auto-rotation every 7 seconds, pauses on hover
  startHeroLookbookAutoTimer();

  frame.addEventListener('mouseenter', () => {
    stopHeroLookbookAutoTimer();
  });

  frame.addEventListener('mouseleave', () => {
    startHeroLookbookAutoTimer();
  });

  // Mobile Touch Swipe Gesture Support
  let touchStartX = 0;
  let touchEndX = 0;

  frame.addEventListener('touchstart', (e) => {
    touchStartX = e.changedTouches[0].screenX;
  }, { passive: true });

  frame.addEventListener('touchend', (e) => {
    touchEndX = e.changedTouches[0].screenX;
    const diff = touchStartX - touchEndX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) {
        // Swipe Left -> Next
        const nextIdx = (heroLookbookIndex + 1) % HERO_LOOKBOOK_ITEMS.length;
        window.switchHeroLookbook(nextIdx);
      } else {
        // Swipe Right -> Prev
        const prevIdx = (heroLookbookIndex - 1 + HERO_LOOKBOOK_ITEMS.length) % HERO_LOOKBOOK_ITEMS.length;
        window.switchHeroLookbook(prevIdx);
      }
    }
  }, { passive: true });
}

function startHeroLookbookAutoTimer() {
  stopHeroLookbookAutoTimer();
  heroLookbookTimer = setInterval(() => {
    const nextIdx = (heroLookbookIndex + 1) % HERO_LOOKBOOK_ITEMS.length;
    window.switchHeroLookbook(nextIdx);
  }, 7000);
}

function stopHeroLookbookAutoTimer() {
  if (heroLookbookTimer) {
    clearInterval(heroLookbookTimer);
    heroLookbookTimer = null;
  }
}

window.switchHeroLookbook = function(index) {
  if (index < 0 || index >= HERO_LOOKBOOK_ITEMS.length) return;
  heroLookbookIndex = index;
  const item = HERO_LOOKBOOK_ITEMS[index];

  const img = document.getElementById('heroLookbookImg');
  const tag = document.getElementById('heroLookbookTag');
  const title = document.getElementById('heroLookbookTitle');
  const sub = document.getElementById('heroLookbookSub');
  const backdropImg = document.getElementById('heroBackdropImg');

  // Fade transition on card image
  if (img) {
    img.style.opacity = '0.3';
    setTimeout(() => {
      img.src = item.image;
      img.style.opacity = '1';
    }, 150);
  }

  if (tag) tag.textContent = item.tag;
  if (title) title.textContent = item.title;
  if (sub) sub.textContent = item.sub;

  // Update backdrop image for cinematic mode
  if (backdropImg) {
    backdropImg.style.backgroundImage = `url('${item.image}')`;
  }

  // Update active state on lookbook buttons and reset progress bar animation
  const btns = document.querySelectorAll('.hero-lookbook-nav .hlb-btn');
  btns.forEach(btn => {
    const btnIdx = parseInt(btn.getAttribute('data-index'), 10);
    if (btnIdx === index) {
      btn.classList.remove('active');
      void btn.offsetWidth; // Trigger reflow to restart CSS animation
      btn.classList.add('active');
    } else {
      btn.classList.remove('active');
    }
  });

  // Restart auto timer so active slide gets full 7 seconds
  startHeroLookbookAutoTimer();
};

function updateHeroBgBtnState() {
  const btn = document.getElementById('heroBgModeBtn');
  if (!btn) return;
  const label = btn.querySelector('.hmb-label');
  const icon = btn.querySelector('.hmb-icon');
  if (heroCinematicMode) {
    if (label) label.textContent = 'Студийный вид';
    if (icon) icon.textContent = '🖼️';
    btn.setAttribute('title', 'Вернуться к студийному виду карточки');
  } else {
    if (label) label.textContent = 'Атмосферный фон';
    if (icon) icon.textContent = '🌌';
    btn.setAttribute('title', 'Включить атмосферный фон во весь экран');
  }
}

window.toggleHeroBgMode = function() {
  const hero = document.getElementById('hero');
  if (!hero) return;
  heroCinematicMode = !heroCinematicMode;

  const item = HERO_LOOKBOOK_ITEMS[heroLookbookIndex];
  const backdropImg = document.getElementById('heroBackdropImg');

  if (heroCinematicMode) {
    hero.classList.add('hero-cinematic-mode');
    document.body.classList.add('hero-cinematic-active');
    if (backdropImg && item) {
      backdropImg.style.backgroundImage = `url('${item.image}')`;
    }
  } else {
    hero.classList.remove('hero-cinematic-mode');
    document.body.classList.remove('hero-cinematic-active');
  }

  updateHeroBgBtnState();

  try {
    localStorage.setItem('volodium_hero_cinematic', heroCinematicMode ? 'true' : 'false');
  } catch (e) {}
};

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
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1.2rem; margin-bottom: 0.5rem; color: var(--text-main);">Ничего не найдено по запросу «${escapeHtml(currentSearch)}»</p>
        <p style="font-size: 0.9rem;">В нашей коллекции более 270 нишевых ароматов. Попробуйте изменить запрос или напишите Владимиру в Telegram для индивидуального поиска.</p>
        <a href="https://t.me/volodiumparfum" target="_blank" class="btn-secondary" style="margin-top: 1.5rem; display: inline-flex;">Написать в Telegram</a>
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

  if (filteredBoxes.length === 0) {
    grid.innerHTML = `
      <div class="catalog-empty-state" style="grid-column: 1 / -1; padding: 4rem 1rem; text-align: center;">
        <p style="font-size: 1.1rem; color: var(--text-muted);">В выбранной категории сейчас нет аромабоксов.</p>
      </div>
    `;
    return;
  }

  grid.innerHTML = filteredBoxes.map(box => {
    const availableVols = box.prices ? Object.keys(box.prices) : ['3ml'];
    const currentVol = selectedVolumes[box.id] || availableVols[0];
    const price = box.prices ? box.prices[currentVol] : 3240;
    const oldPrice = box.oldPrices ? box.oldPrices[currentVol] : null;
    const discountPct = (oldPrice && price && oldPrice > price)
      ? Math.round((1 - price / oldPrice) * 100)
      : null;

    return `
      <div class="aroma-box-card" id="card-${box.id}">
        <div class="aroma-box-img-wrap box-open-modal" data-box-id="${box.id}" role="button" tabindex="0" title="Нажмите, чтобы изучить подробный состав">
          <img src="${box.image}" alt="${escapeHtml(box.name)}" loading="lazy" onerror="this.src='${box.cdnImage || box.image}'">
          
          <div class="aroma-box-badges-overlay">
            <span class="aroma-box-gender-badge gender-${box.gender}">${escapeHtml(box.genderLabel || 'Сет')}</span>
            ${discountPct ? `<span class="aroma-box-discount-badge">-${discountPct}%</span>` : ''}
          </div>

          ${box.badge ? `<span class="aroma-box-hit-badge">${escapeHtml(box.badge)}</span>` : ''}
          
          <div class="aroma-box-img-hover-hint">
            <span>Изучить состав</span>
          </div>
        </div>

        <div class="aroma-box-content">
          <h3 class="aroma-box-title box-open-modal" data-box-id="${box.id}" role="button" tabindex="0">${escapeHtml(box.name)}</h3>
          <p class="aroma-box-short-subtitle">${escapeHtml(box.shortSubtitle || '')}</p>

          <div class="box-composition-preview box-open-modal" data-box-id="${box.id}" role="button" tabindex="0" title="Нажмите, чтобы открыть подробный состав и ноты сета">
            <span class="bcp-action">✦ Состав сета (5 ароматов) →</span>
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

  // Attach event listeners for each box
  filteredBoxes.forEach(box => {
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

function createProductCardHtml(item) {
  const currentVol = selectedVolumes[item.id] || getDefaultVolume(item);
  const currentPrice = item.prices ? item.prices[currentVol] : item.price;
  const isAromaBox = item.category === 'box';

  let volumeSelectorHtml = '';
  if (item.prices) {
    volumeSelectorHtml = `
      <div class="volume-selector">
        ${Object.keys(item.prices).map(v => `
          <button class="volume-btn vol-btn-${item.id} ${v === currentVol ? 'active' : ''}" data-vol="${v}">
            ${v === 'bottle' ? (item.bottleSize || 'Флакон') : v}
          </button>
        `).join('')}
      </div>
    `;
  }

  return `
    <div class="perfume-card" id="card-${item.id}">
      ${item.badge ? `<span class="card-badge">${item.badge}</span>` : ''}
      <div class="card-img-wrap trigger-modal-${item.id}">
        <img src="${item.image}" alt="${escapeHtml(item.name)}" loading="lazy">
      </div>
      <div class="card-brand">${item.brand || 'VOLODIUM PARFUM'}</div>
      <h3 class="card-title trigger-modal-${item.id}">${item.name}</h3>
      <p class="card-subtitle">${item.subtitle || item.description}</p>
      
      ${volumeSelectorHtml}

      <div class="card-footer">
        <div class="price-wrap">
          <div class="price-current" id="price-${item.id}">${formatPrice(currentPrice)}</div>
          <div class="price-unit">${currentVol === 'bottle' ? 'оригинальный флакон' : (item.category === 'box' ? 'набор миниатюр' : 'отливант ' + currentVol)}</div>
        </div>
        <div class="card-actions-row">
          <button class="btn-details trigger-modal-${item.id}" title="Пирамида нот и подробности">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z"/>
              <circle cx="12" cy="12" r="3"/>
            </svg>
          </button>
          <button class="btn-add-cart add-cart-${item.id}">
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

    modalContent.innerHTML = `
      <div class="modal-grid modal-box-layout">
        <div class="modal-img-col">
          <div class="modal-box-img-wrap">
            <img class="modal-main-img" src="${item.image}" alt="${escapeHtml(item.name)}" onerror="this.src='${item.cdnImage || item.image}'">
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
            <span class="aroma-box-gender-badge gender-${item.gender}">${escapeHtml(item.genderLabel || 'Коллекция')}</span>
            <span class="modal-box-tag">Тематический сет • 5 ароматов</span>
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
              <span>В наборе 5 оригинальных композиций:</span>
            </h4>
            <div class="modal-box-perfumes-grid">
              ${(item.perfumes || []).map((perfume, idx) => {
                const parts = perfume.split('—');
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
              <span class="mbv-hint" id="modalBoxSprayHint">${sprayHints[activeModalVol] || ''}</span>
            </div>
            <div class="volume-selector" id="modalBoxVolumeSelector">
              ${availableVols.map(v => `
                <button type="button" class="volume-btn modal-vol-btn ${v === activeModalVol ? 'active' : ''}" data-vol="${v}">
                  ${volLabels[v] || v}
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
              <div class="modal-price-sub">за комплект из 5 флаконов в подарочном боксе</div>
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

  // Build pyramid HTML if perfume
  let pyramidHtml = '';
  if (item.pyramid) {
    pyramidHtml = `
      <div class="pyramid-box">
        <div class="pyramid-header">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polygon points="12 2 2 22 22 22"/>
          </svg>
          Ольфакторная пирамида нот
        </div>
        <div class="pyramid-tier">
          <span class="pyramid-tier-title">Верхние ноты (первые 15 минут)</span>
          <span class="pyramid-tier-notes">${item.pyramid.top.join(' • ')}</span>
        </div>
        <div class="pyramid-tier heart">
          <span class="pyramid-tier-title">Ноты сердца (раскрытие 2–4 часа)</span>
          <span class="pyramid-tier-notes">${item.pyramid.heart.join(' • ')}</span>
        </div>
        <div class="pyramid-tier base">
          <span class="pyramid-tier-title">Базовые ноты & Шлейф (до 24 часов)</span>
          <span class="pyramid-tier-notes">${item.pyramid.base.join(' • ')}</span>
        </div>
      </div>
    `;
  }

  // Metrics HTML
  let metricsHtml = '';
  if (item.metrics) {
    metricsHtml = `
      <div class="metrics-row">
        <div class="metric-bar-item">
          <div class="metric-bar-label">
            <span>Стойкость</span>
            <span class="text-gold">${item.metrics.longevity}</span>
          </div>
          <div class="metric-bar-track">
            <div class="metric-bar-fill" style="width: ${item.metrics.longevityScore || 90}%"></div>
          </div>
        </div>
        <div class="metric-bar-item">
          <div class="metric-bar-label">
            <span>Шлейф</span>
            <span class="text-gold">${item.metrics.sillage}</span>
          </div>
          <div class="metric-bar-track">
            <div class="metric-bar-fill" style="width: ${item.metrics.sillageScore || 90}%"></div>
          </div>
        </div>
      </div>
      <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 1.5rem;">
        <span class="text-gold">Сезон & Характер:</span> ${item.metrics.season} • ${item.metrics.vibe}
      </div>
    `;
  }

  // Volume choices in modal
  let volumeOptionsHtml = '';
  if (item.prices) {
    volumeOptionsHtml = `
      <div style="margin-bottom: 1.5rem;">
        <label style="font-size: 0.85rem; color: var(--text-muted); display: block; margin-bottom: 0.5rem;">Выберите объем:</label>
        <div class="volume-selector" id="modalVolumeSelector">
          ${Object.keys(item.prices).map(v => `
            <button class="volume-btn modal-vol-btn ${v === currentVol ? 'active' : ''}" data-vol="${v}">
              ${v === 'bottle' ? (item.bottleSize || 'Флакон') : v}
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  modalContent.innerHTML = `
    <div class="modal-grid">
      <div class="modal-img-col">
        <img class="modal-main-img" src="${item.image}" alt="${escapeHtml(item.name)}">
        <div style="background: #faf9f7; border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 1rem; font-size: 0.8rem; color: var(--text-muted);">
          <div style="color: #111216; font-weight: 600; margin-bottom: 0.25rem;">Гарантия оригинальности</div>
          100% оригинальный парфюм из официального флакона бренда. Разливается в стерильные стеклянные атомайзеры с металлической помпой.
        </div>
      </div>
      <div class="modal-info-col">
        <div class="card-brand">${item.brand || 'VOLODIUM PARFUM'}</div>
        <h2 style="font-family: var(--font-serif); font-size: 2.2rem; font-weight: 600; color: #111216; margin-bottom: 0.4rem;">${item.name}</h2>
        <p style="color: var(--gold-primary); font-size: 0.95rem; margin-bottom: 1.25rem;">${item.subtitle || ''}</p>
        
        <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.7; margin-bottom: 1.5rem;">
          ${item.description}
        </p>

        ${pyramidHtml}
        ${metricsHtml}
        ${volumeOptionsHtml}

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 1.5rem; margin-top: 1.5rem;">
          <div>
            <div style="font-family: var(--font-serif); font-size: 2rem; font-weight: 700; color: #111216;" id="modalPrice">
              ${formatPrice(currentPrice)}
            </div>
            <div style="font-size: 0.8rem; color: var(--text-dim);" id="modalVolLabel">
              ${currentVol === 'bottle' ? 'полноразмерный флакон' : 'отливант ' + currentVol}
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
const FREE_DELIVERY_THRESHOLD = 5000;
const MIN_ORDER_THRESHOLD = 3000;

function initCart() {
  // Load from LocalStorage
  try {
    const saved = localStorage.getItem('vp_cart');
    if (saved) cart = JSON.parse(saved);
  } catch (e) {}

  const cartTriggers = document.querySelectorAll('.trigger-cart');
  cartTriggers.forEach(btn => {
    btn.addEventListener('click', () => {
      openCart();
      playChime(440);
    });
  });

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
  const cartId = `${item.id}__${volume}`;
  const existing = cart.find(ci => ci.cartId === cartId);

  const price = item.prices ? item.prices[volume] : item.price;

  if (existing) {
    existing.qty += 1;
  } else {
    const itemName = item.name || item.title || item.level || 'VOLODIUM Парфюм';
    cart.push({
      cartId: cartId,
      itemId: item.id,
      name: itemName,
      brand: item.brand || 'VOLODIUM PARFUM',
      volume: volume,
      price: price,
      image: item.image,
      qty: 1
    });
  }

  saveCart();
  updateCartBadge();
  renderCartDrawer();
  const volLabel = (item.category === 'box' || (item.itemId && item.itemId.startsWith('box-'))) ? `5 × ${volume}` : volume;
  showToast(`«${item.name || item.title || 'Товар'}» (${volLabel}) добавлен в корзину`);
}

window.addItemToCartById = function(itemId, volume = '3ml') {
  const allItems = [...PERFUMES_DATA, ...AROMA_BOXES_DATA, ...SECRET_BOXES_DATA];
  const item = allItems.find(p => p.id === itemId);
  if (item) {
    const vol = item.prices ? (item.prices[volume] ? volume : Object.keys(item.prices)[0]) : 'стандарт';
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
  const badges = document.querySelectorAll('.cart-badge-count');
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
  if (!itemsContainer) return;

  if (cart.length === 0) {
    itemsContainer.innerHTML = `
      <div class="cart-empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="color: var(--gold-primary); opacity: 0.7;">
          <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 0 1-8 0"/>
        </svg>
        <p style="font-size: 1.1rem; color: #111216; font-weight: 600;">Ваша парфюмерная корзина пуста</p>
        <p style="font-size: 0.85rem; max-width: 260px; color: var(--text-muted);">Выберите понравившийся аромат в каталоге или закажите персональный Secret Box.</p>
        <button class="btn-primary" onclick="closeCart();" style="margin-top: 1rem;">Перейти к ароматам</button>
      </div>
    `;
    if (subtotalEl) subtotalEl.textContent = '0 ₽';
    if (totalEl) totalEl.textContent = '0 ₽';
    if (discountRow) discountRow.style.display = 'none';
    if (freeTrackEl) freeTrackEl.style.width = '0%';
    if (freeTextEl) freeTextEl.innerHTML = `Бесплатная доставка СДЭК при заказе от <strong>${formatPrice(FREE_DELIVERY_THRESHOLD)}</strong>`;
    return;
  }

  itemsContainer.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img class="cart-item-img" src="${item.image}" alt="${escapeHtml(item.name)}">
      <div class="cart-item-info">
        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
          <div class="cart-item-title">${item.name}</div>
          <button class="cart-item-del" onclick="removeCartItem('${item.cartId}');" title="Удалить">✕</button>
        </div>
        <div class="cart-item-meta">${item.volume === 'bottle' ? 'Полноразмерный флакон' : (item.itemId && item.itemId.startsWith('box-') ? `Сет из 5 флаконов × ${item.volume}` : item.volume)}</div>
        <div class="cart-item-bot">
          <div class="cart-item-qty">
            <button class="qty-btn" onclick="changeCartQty('${item.cartId}', -1);">–</button>
            <span class="qty-number">${item.qty}</span>
            <button class="qty-btn" onclick="changeCartQty('${item.cartId}', 1);">+</button>
          </div>
          <div class="cart-item-price">${formatPrice(item.price * item.qty)}</div>
        </div>
      </div>
    </div>
  `).join('');

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
    const pct = Math.min(100, Math.round((total / FREE_DELIVERY_THRESHOLD) * 100));
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
  return cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
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

  if (code === 'СТАРТ' || code === 'START') {
    appliedPromo = { code: code, discountPercent: 10 };
    renderCartDrawer();
    showToast('Промокод применен: скидка 10% на ваш заказ');
  } else if (code === 'VOLODIUM' || code === 'VOVA') {
    appliedPromo = { code: code, discountPercent: 15 };
    renderCartDrawer();
    showToast('Промокод применен: скидка 15%');
  } else {
    showToast('Неверный промокод или срок его действия истек');
  }
}

window.copyPromoCode = function(code = 'СТАРТ') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(code).catch(() => {});
  }
  const input = document.getElementById('promoCodeInput');
  if (input) {
    input.value = code;
  }
  appliedPromo = { code: code, discountPercent: 10 };
  openCart();
  renderCartDrawer();
  playChime(660);
  showToast(`Промокод «${code}» активирован! Скидка 10% применена.`);
};

/* ==========================================================================
   7. Checkout Form & Telegram Order Forwarding
   ========================================================================== */
function openCheckoutModal() {
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

function initCheckoutForm() {
  const form = document.getElementById('checkoutForm');
  const msgBtns = document.querySelectorAll('.msg-opt-btn');
  let selectedMessenger = 'Telegram';

  msgBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      msgBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      selectedMessenger = btn.dataset.msg;
      playChime(460);
    });
  });

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
Связь через: ${selectedMessenger}
Доставка: ${delivery}
Адрес / ПВЗ: ${address || 'Уточнить при звонке'}
${comment ? `Пожелания: ${comment}\n` : ''}
${appliedPromo ? `Промокод: ${appliedPromo.code} (-${appliedPromo.discountPercent}%)\n` : ''}
ИТОГО К ОПЛАТЕ: ${formatPrice(total)}

СОСТАВ ЗАКАЗА:
${itemsListText}
-----------------------------
После подтверждения менеджер свяжется для отправки реквизитов и трек-номера СДЭК.`;

    // Clear cart and show congratulations
    cart = [];
    saveCart();
    updateCartBadge();
    closeCheckoutModal();
    closeCart();

    // Open Telegram with pre-filled message
    const tgUrl = `https://t.me/volodiumparfum?text=${encodeURIComponent(orderText)}`;
    window.open(tgUrl, '_blank');

    showToast('🎉 Заказ сформирован! Перенаправляем в Telegram к менеджеру...', 6000);
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
        <p class="legal-doc-subtitle">Интернет-бутик селективной парфюмерии VOLODIUM PARFUM</p>
      </div>
      <div class="legal-doc-content">
        <h4>1. Общие положения</h4>
        <p>1.1. Настоящая Политика обработки персональных данных составлена в соответствии с требованиями Федерального закона от 27.07.2006 г. № 152-ФЗ «О персональных данных» и определяет порядок сбора, систематизации, накопления, хранения и защиты конфиденциальной информации клиентов бутика VOLODIUM PARFUM (далее — «Оператор»).</p>
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
          <li>Оформления заказа на оригинальную селективную парфюмерию, персональные аромабоксы или подарочные сертификаты;</li>
          <li>Индивидуального консультирования покупателя основателем бутика Владимиром Вациком;</li>
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
        <h3 class="legal-doc-title">Публичная оферта интернет-бутика</h3>
        <p class="legal-doc-subtitle">Условия дистанционной розничной купли-продажи селективной парфюмерии</p>
      </div>
      <div class="legal-doc-content">
        <h4>1. Общие положения</h4>
        <p>1.1. Настоящий документ является официальным предложением (публичной офертой по ст. 435 и п. 2 ст. 437 Гражданского кодекса РФ) интернет-бутика VOLODIUM PARFUM заключить договор розничной купли-продажи парфюмерной продукции дистанционным способом.</p>
        <p>1.2. Ознакомительная информация на страницах каталога носит информационно-демонстрационный характер. Моментом заключения договора является подтверждение заказа покупателем и согласование деталей с менеджером бутика.</p>

        <h4>2. Гарантия оригинальности и качество товара</h4>
        <p>2.1. Продавец гарантирует 100% подлинность и оригинальность всех представленных селективных ароматов, их соответствие стандартам IFRA и возможность проверки батч-кодов перед вскрытием.</p>
        <p>2.2. Продавец передает Покупателю оригинальную парфюмерную продукцию (селективные духи во флаконах, атомайзерах или фирменных сетах аромабоксов), а Покупатель оплачивает товар по согласованной стоимости.</p>

        <h4>3. Оплата и доставка</h4>
        <p>3.1. Заказ оформляется через корзину сайта либо посредством прямой коммуникации в официальном канале Telegram @volodiumparfum.</p>
        <p>3.2. Доставка по территории РФ осуществляется курьерской службой СДЭК (до двери или пункта выдачи) либо специализированной курьерской службой по Москве. При сумме заказа от 5 000 ₽ доставка по РФ до ПВЗ СДЭК бесплатная.</p>
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
        <p>2.1. Бутик VOLODIUM PARFUM использует усиленную многослойную премиальную упаковку, защищающую флаконы от механических повреждений и температурных колебаний в процессе доставки СДЭК.</p>
        <p>2.2. При получении заказа в пункте выдачи СДЭК или от курьера Покупатель имеет право осмотреть внешнюю упаковку. В случае выявления повреждения транспортной коробки или флакона при доставке Покупатель составляет акт совместно с сотрудником СДЭК, после чего бутик VOLODIUM производит мгновенную бесплатную повторную отправку либо 100% возврат средств.</p>

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
    <span style="color: var(--gold-primary);">✦</span>
    <span>${escapeHtml(msg)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, duration);
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
    menuBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      toggleDrawer();
    });
  }

  if (closeBtn) {
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      closeDrawer();
    });
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
  const tgUrl = `https://t.me/volodiumparfum?text=${encoded}`;

  if (typeof playChime === 'function') playChime(660);
  showToast('Ольфакторный паспорт сформирован! Открываем диалог с Владимиром...');

  setTimeout(() => {
    window.open(tgUrl, '_blank');
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

function initCertificates() {
  const scene = document.getElementById('cert3dScene');
  const card = document.getElementById('certCard3d');
  const glare = document.getElementById('certFoilGlare');

  if (!card) return;

  // 1. 3D Perspective Tilt on Mousemove
  if (scene) {
    scene.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      const rotateX = -((y - centerY) / centerY) * 12;
      const rotateY = ((x - centerX) / centerX) * 12;

      card.style.transform = `perspective(1200px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.02, 1.02, 1.02)`;

      if (glare) {
        const glareX = (x / rect.width) * 100;
        const glareY = (y / rect.height) * 100;
        glare.style.setProperty('--glare-x', `${glareX}%`);
        glare.style.setProperty('--glare-y', `${glareY}%`);
        glare.style.opacity = '1';
      }
    });

    scene.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1200px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      if (glare) {
        glare.style.opacity = '0';
      }
    });
  }

  // 2. Gyroscope support for mobile tilt
  if (window.DeviceOrientationEvent && window.innerWidth <= 768) {
    window.addEventListener('deviceorientation', (e) => {
      if (e.beta !== null && e.gamma !== null) {
        const tiltX = Math.min(Math.max((e.beta - 45) * 0.4, -10), 10);
        const tiltY = Math.min(Math.max(e.gamma * 0.4, -10), 10);
        card.style.transform = `perspective(1000px) rotateX(${tiltX.toFixed(2)}deg) rotateY(${tiltY.toFixed(2)}deg)`;
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
      deposit: 'Депозит на селективную коллекцию бутика',
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
      brand: 'VOLODIUM HAUTE PARFUMERIE',
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

    const tgUrl = `https://t.me/volodiumparfum?text=${encodeURIComponent(text)}`;
    playChime(660);
    showToast('Переходим в Telegram для оформления сертификата...');
    setTimeout(() => {
      window.open(tgUrl, '_blank');
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

/* ==========================================================================
   CONCIERGE QUICK-JUMP BAR CONTROLLER
   ========================================================================== */
function initQuickNav() {
  const pills = document.querySelectorAll('.cqb-pill');
  if (!pills.length) return;

  // Smooth scroll click with sticky header compensation
  pills.forEach(pill => {
    pill.addEventListener('click', (e) => {
      const targetId = pill.getAttribute('href');
      if (targetId && targetId.startsWith('#')) {
        const targetEl = document.querySelector(targetId);
        if (targetEl) {
          e.preventDefault();
          const headerOffset = 135;
          const elementPosition = targetEl.getBoundingClientRect().top;
          const offsetPosition = elementPosition + window.pageYOffset - headerOffset;

          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth'
          });

          pills.forEach(p => p.classList.remove('active'));
          pill.classList.add('active');
        }
      }
    });
  });

  // Track sections on scroll and highlight current active pill
  const sectionIds = ['catalog', 'aroma-boxes', 'secret-boxes', 'quiz', 'certificates', 'consultation', 'tester-guide', 'decants', 'reviews'];
  window.addEventListener('scroll', () => {
    const scrollPos = window.pageYOffset + 220;
    let currentId = '';

    sectionIds.forEach(id => {
      const el = document.getElementById(id);
      if (el) {
        const top = el.offsetTop;
        const height = el.offsetHeight;
        if (scrollPos >= top && scrollPos < top + height) {
          currentId = id;
        }
      }
    });

    if (currentId) {
      pills.forEach(pill => {
        const matches = pill.getAttribute('href') === `#${currentId}`;
        pill.classList.toggle('active', matches);
        if (matches && pill.scrollIntoView && pill.parentElement) {
          const container = pill.parentElement;
          const pillOffset = pill.offsetLeft - container.offsetLeft - (container.clientWidth / 2) + (pill.clientWidth / 2);
          container.scrollTo({ left: pillOffset, behavior: 'smooth' });
        }
      });
    }
  }, { passive: true });
}


