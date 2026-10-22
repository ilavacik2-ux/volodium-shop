/**
 * VOLODIUM PARFUM — Application Logic & Interactive Experience
 * Pure modern vanilla JS (ES6+), 60fps animations, interactive aroma pyramid,
 * interactive fragrance quiz, 3D certificate studio, and real-time cart.
 */

document.addEventListener('DOMContentLoaded', () => {
  // Initialize all subsystems
  initMonroeIntro();
  initHeroCanvas();
  initCatalog();
  initQuiz();
  initCertificateStudio();
  initCart();
  initFAQ();
  initCookieBanner();
  initSmoothScroll();
});

/* ==========================================================================
   0. Monroe Handwriting Intro Controller
   ========================================================================== */
function initMonroeIntro() {
  const intro = document.getElementById('monroeIntro');
  const enterBtn = document.getElementById('btnEnterBoutique');
  const replayBtn = document.getElementById('btnReplayIntro');
  if (!intro) return;

  function dismissIntro() {
    intro.classList.add('hidden');
    document.body.style.overflow = '';
    playChime(660);
  }

  function playIntro() {
    intro.classList.remove('hidden');
    document.body.style.overflow = 'hidden';
    const svgWrap = intro.querySelector('.monroe-handwriting-wrap');
    if (svgWrap) {
      const clone = svgWrap.cloneNode(true);
      svgWrap.parentNode.replaceChild(clone, svgWrap);
    }
    playChime(520);
    setTimeout(() => playChime(640), 900);
    setTimeout(() => playChime(780), 1800);
  }

  if (enterBtn) {
    enterBtn.addEventListener('click', dismissIntro);
  }

  if (replayBtn) {
    replayBtn.addEventListener('click', playIntro);
  }

  // Auto-dismiss after 4.2 seconds
  const autoTimer = setTimeout(() => {
    if (!intro.classList.contains('hidden')) {
      dismissIntro();
    }
  }, 4200);

  intro.addEventListener('click', (e) => {
    if (e.target.closest('#btnEnterBoutique')) return;
    clearTimeout(autoTimer);
    dismissIntro();
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
      this.size = Math.random() * 2.2 + 0.8;
      this.alpha = Math.random() * 0.4 + 0.1;
      this.maxAlpha = this.alpha;
      this.color = Math.random() > 0.3 ? '230, 202, 133' : '245, 230, 184';
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
      ctx.shadowBlur = 10;
      ctx.shadowColor = `rgba(${this.color}, 0.5)`;
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
   2. Catalog Engine with Filter, Volume Selector & Modals
   ========================================================================== */
let currentCategory = 'all';
let currentSearch = '';
let currentSort = 'popular';
const selectedVolumes = {}; // map of perfumeId -> selected volume string ('3ml', '5ml', '10ml', 'bottle')

function initCatalog() {
  const grid = document.getElementById('perfumesGrid');
  const searchInput = document.getElementById('catalogSearch');
  const sortSelect = document.getElementById('catalogSort');
  const tabBtns = document.querySelectorAll('.catalog-tabs .tab-btn');

  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      tabBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      currentCategory = btn.dataset.category;
      renderCatalog();
    });
  });

  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      renderCatalog();
    });
  }

  if (sortSelect) {
    sortSelect.addEventListener('change', (e) => {
      currentSort = e.target.value;
      renderCatalog();
    });
  }

  renderCatalog();
}

function renderCatalog() {
  const grid = document.getElementById('perfumesGrid');
  if (!grid) return;

  // Filter items
  let items = [];

  if (currentCategory === 'all') {
    items = [...PERFUMES_DATA, ...AROMA_BOXES_DATA];
  } else if (currentCategory === 'boxes') {
    items = [...AROMA_BOXES_DATA];
  } else if (currentCategory === 'secrets') {
    items = [...SECRET_BOXES_DATA];
  } else if (currentCategory === 'men') {
    items = PERFUMES_DATA.filter(p => p.gender === 'men' || p.gender === 'unisex');
  } else if (currentCategory === 'women') {
    items = PERFUMES_DATA.filter(p => p.gender === 'women' || p.gender === 'unisex');
  } else {
    items = PERFUMES_DATA.filter(p => p.gender === currentCategory || p.category === currentCategory);
  }

  // Search filter
  if (currentSearch) {
    items = items.filter(item => {
      const name = (item.name || '').toLowerCase();
      const brand = (item.brand || '').toLowerCase();
      const desc = (item.description || '').toLowerCase();
      const subtitle = (item.subtitle || '').toLowerCase();
      return name.includes(currentSearch) || brand.includes(currentSearch) || desc.includes(currentSearch) || subtitle.includes(currentSearch);
    });
  }

  // Sort
  if (currentSort === 'price-asc') {
    items.sort((a, b) => getMinPrice(a) - getMinPrice(b));
  } else if (currentSort === 'price-desc') {
    items.sort((a, b) => getMinPrice(b) - getMinPrice(a));
  }

  if (items.length === 0) {
    grid.innerHTML = `
      <div style="grid-column: 1 / -1; text-align: center; padding: 4rem 1rem; color: var(--text-muted);">
        <p style="font-size: 1.2rem; margin-bottom: 0.5rem;">Ничего не найдено по запросу «${escapeHtml(currentSearch)}»</p>
        <p style="font-size: 0.9rem;">Попробуйте изменить категорию или напишите Владимиру в Telegram для подбора редкого аромата.</p>
        <a href="https://t.me/volodiumparfum" target="_blank" class="btn-secondary" style="margin-top: 1.5rem; display: inline-flex;">Написать в Telegram</a>
      </div>
    `;
    return;
  }

  grid.innerHTML = items.map(item => createProductCardHtml(item)).join('');

  // Attach card event listeners
  items.forEach(item => {
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
  if (priceEl) {
    priceEl.textContent = formatPrice(item.prices[vol]);
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
        <div style="background: rgba(255,255,255,0.03); border: 1px solid var(--border-subtle); border-radius: var(--radius-sm); padding: 1rem; font-size: 0.8rem; color: var(--text-dim);">
          <div style="color: var(--gold-light); font-weight: 600; margin-bottom: 0.25rem;">Гарантия оригинальности</div>
          100% аутентичный парфюмерный сок из оригинального флакона. Разливается в стерильные стеклянные атомайзеры с металлической помпой.
        </div>
      </div>
      <div class="modal-info-col">
        <div class="card-brand">${item.brand || 'VOLODIUM PARFUM'}</div>
        <h2 style="font-family: var(--font-serif); font-size: 2.2rem; font-weight: 600; margin-bottom: 0.4rem;">${item.name}</h2>
        <p style="color: var(--gold-primary); font-size: 0.95rem; margin-bottom: 1.25rem;">${item.subtitle || ''}</p>
        
        <p style="color: var(--text-muted); font-size: 0.95rem; line-height: 1.7; margin-bottom: 1.5rem;">
          ${item.description}
        </p>

        ${pyramidHtml}
        ${metricsHtml}
        ${volumeOptionsHtml}

        <div style="display: flex; align-items: center; justify-content: space-between; border-top: 1px solid var(--border-subtle); padding-top: 1.5rem; margin-top: 1.5rem;">
          <div>
            <div style="font-family: var(--font-serif); font-size: 2rem; font-weight: 700; color: #ffffff;" id="modalPrice">
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
   4. Interactive Fragrance Quiz ("Парфюмерный гардероб за 60 секунд")
   ========================================================================== */
const QUIZ_STEPS = [
  {
    question: "Кому подбираем аромат?",
    subtitle: "Выберите, для кого создается персональный парфюмерный гардероб",
    options: [
      { label: "Для неё", hint: "Женственные, чувственные, романтичные ноты", icon: "✨", val: "women" },
      { label: "Для него", hint: "Мужественные, уверенные, статусные аккорды", icon: "🏛️", val: "men" },
      { label: "Унисекс", hint: "Стильные нишевые композиции без гендерных рамок", icon: "💎", val: "unisex" },
      { label: "В подарок", hint: "Идеально сбалансированные комплиментарные хиты", icon: "🎁", val: "gift" }
    ]
  },
  {
    question: "Какое впечатление вы хотите производить?",
    subtitle: "Аромат — это невидимая визитная карточка вашего характера",
    options: [
      { label: "Статусный & Респектабельный", hint: "Дорогая кожа, благородное дерево, пряности", icon: "👑", val: "status" },
      { label: "Сексуальный & Магнетический", hint: "Ликерная вишня, ваниль, амбра, манящий шлейф", icon: "🔥", val: "sexy" },
      { label: "Свежий & Элегантный", hint: "Чистая белая рубашка, минералы, утренняя роса", icon: "🌿", val: "fresh" },
      { label: "Уютный & Гурманский", hint: "Коньяк в дубовой бочке, корица, пралине", icon: "☕", val: "gourmand" }
    ]
  },
  {
    question: "Какие ноты вам наиболее приятны?",
    subtitle: "Выберите любимое ольфакторное направление",
    options: [
      { label: "Дерево, Кожа и Табак", hint: "Уд, сандал, кедр, выдержанный табак", icon: "🪵", val: "woody" },
      { label: "Минералы и Замша", hint: "Авангардная свежесть как в Ganymede", icon: "🪐", val: "mineral" },
      { label: "Спелая вишня и Десерты", hint: "Ликер, миндаль, ваниль, шоколад", icon: "🍒", val: "cherry" },
      { label: "Цветы и Экзотические фрукты", hint: "Пионы, личи, белый персик, флердоранж", icon: "🌸", val: "floral" }
    ]
  },
  {
    question: "В каком формате хотите познакомиться?",
    subtitle: "Выберите комфортный для вас вариант знакомства",
    options: [
      { label: "Secret Box (Сюрприз)", hint: "Владимир подберет ароматы под вас лично", icon: "📦", val: "secret" },
      { label: "Аромабокс (5 миниатюр)", hint: "Готовый тематический сет бестселлеров", icon: "✨", val: "box" },
      { label: "Отливант 5 или 10 мл", hint: "Знакомство с конкретным флаконом на месяц", icon: "🧪", val: "decant" },
      { label: "Личная консультация", hint: "Встреча с Владимиром и 150+ ароматами", icon: "👤", val: "consult" }
    ]
  }
];

let quizCurrentStep = 0;
const quizAnswers = {};

function initQuiz() {
  const card = document.getElementById('quizCard');
  if (!card) return;
  renderQuizStep();
}

function renderQuizStep() {
  const container = document.getElementById('quizStepContainer');
  const progressFill = document.getElementById('quizProgressFill');
  const stepText = document.getElementById('quizStepNumber');
  const resultWrap = document.getElementById('quizResultWrap');
  if (!container) return;

  if (quizCurrentStep >= QUIZ_STEPS.length) {
    // Show Results
    container.style.display = 'none';
    if (resultWrap) {
      resultWrap.style.display = 'block';
      renderQuizResults();
    }
    progressFill.style.width = '100%';
    stepText.textContent = 'Итог подбора';
    return;
  }

  container.style.display = 'block';
  if (resultWrap) resultWrap.style.display = 'none';

  const step = QUIZ_STEPS[quizCurrentStep];
  progressFill.style.width = `${((quizCurrentStep + 1) / QUIZ_STEPS.length) * 100}%`;
  stepText.textContent = `Шаг ${quizCurrentStep + 1} из ${QUIZ_STEPS.length}`;

  container.innerHTML = `
    <h3 class="quiz-question-title">${step.question}</h3>
    <p class="quiz-question-sub">${step.subtitle}</p>
    <div class="quiz-options-grid">
      ${step.options.map((opt, i) => `
        <button class="quiz-opt-btn ${quizAnswers[quizCurrentStep] === opt.val ? 'active' : ''}" data-val="${opt.val}">
          <span class="quiz-opt-icon">${opt.icon}</span>
          <span class="quiz-opt-label">${opt.label}</span>
          <span class="quiz-opt-hint">${opt.hint}</span>
        </button>
      `).join('')}
    </div>
    <div class="quiz-actions">
      ${quizCurrentStep > 0 ? `
        <button class="btn-secondary" id="btnQuizPrev" style="padding: 0.65rem 1.4rem;">
          ← Назад
        </button>
      ` : '<div></div>'}
      <button class="btn-primary" id="btnQuizNext" style="padding: 0.65rem 1.8rem;" ${!quizAnswers[quizCurrentStep] ? 'disabled style="opacity:0.5; pointer-events:none;"' : ''}>
        ${quizCurrentStep === QUIZ_STEPS.length - 1 ? 'Получить подборку ✨' : 'Далее →'}
      </button>
    </div>
  `;

  // Attach option clicks
  container.querySelectorAll('.quiz-opt-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      container.querySelectorAll('.quiz-opt-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      quizAnswers[quizCurrentStep] = btn.dataset.val;
      const nextBtn = document.getElementById('btnQuizNext');
      if (nextBtn) {
        nextBtn.removeAttribute('disabled');
        nextBtn.style.opacity = '1';
        nextBtn.style.pointerEvents = 'auto';
      }
      playChime(480);
    });
  });

  const nextBtn = document.getElementById('btnQuizNext');
  if (nextBtn) {
    nextBtn.addEventListener('click', () => {
      if (!quizAnswers[quizCurrentStep]) return;
      quizCurrentStep++;
      renderQuizStep();
      playChime(600);
    });
  }

  const prevBtn = document.getElementById('btnQuizPrev');
  if (prevBtn) {
    prevBtn.addEventListener('click', () => {
      quizCurrentStep--;
      renderQuizStep();
      playChime(400);
    });
  }
}

function renderQuizResults() {
  const resultCards = document.getElementById('quizResultCards');
  if (!resultCards) return;

  // Compute recommendations
  let recPerfumes = [];
  const notePref = quizAnswers[2];
  const vibePref = quizAnswers[1];

  if (notePref === 'cherry' || vibePref === 'sexy') {
    recPerfumes = [
      PERFUMES_DATA.find(p => p.id === 'lost-cherry'),
      PERFUMES_DATA.find(p => p.id === 'angels-share'),
      AROMA_BOXES_DATA.find(b => b.id === 'box-gourmand')
    ];
  } else if (notePref === 'mineral' || vibePref === 'fresh') {
    recPerfumes = [
      PERFUMES_DATA.find(p => p.id === 'ganymede'),
      PERFUMES_DATA.find(p => p.id === 'byredo-blanche'),
      AROMA_BOXES_DATA.find(b => b.id === 'box-cleanliness')
    ];
  } else if (notePref === 'woody' || vibePref === 'status') {
    recPerfumes = [
      PERFUMES_DATA.find(p => p.id === 'tobacco-vanille'),
      PERFUMES_DATA.find(p => p.id === 'initio-oud-for-greatness'),
      AROMA_BOXES_DATA.find(b => b.id === 'box-woody-leather')
    ];
  } else {
    recPerfumes = [
      PERFUMES_DATA.find(p => p.id === 'baccarat-540'),
      PERFUMES_DATA.find(p => p.id === 'fleur-narcotique'),
      AROMA_BOXES_DATA.find(b => b.id === 'box-compliments')
    ];
  }

  // Filter out undefined
  recPerfumes = recPerfumes.filter(Boolean);

  resultCards.innerHTML = recPerfumes.map(item => `
    <div class="perfume-card" style="background: rgba(255,255,255,0.03);">
      <div class="card-img-wrap" style="height: 180px;">
        <img src="${item.image}" alt="${escapeHtml(item.name)}">
      </div>
      <div class="card-brand">${item.brand || 'VOLODIUM PARFUM'}</div>
      <h4 style="font-family: var(--font-serif); font-size: 1.25rem; margin-bottom: 0.35rem;">${item.name}</h4>
      <p style="font-size: 0.8rem; color: var(--gold-light); margin-bottom: 1rem;">${item.subtitle || ''}</p>
      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; border-top: 1px solid var(--border-subtle); padding-top: 0.75rem;">
        <span style="font-family: var(--font-serif); font-size: 1.3rem; font-weight: 600;">${formatPrice(getMinPrice(item))}</span>
        <button class="btn-add-cart" onclick="addItemToCartById('${item.id}'); playChime(660);">В корзину</button>
      </div>
    </div>
  `).join('');

  // Telegram direct message link
  const tgBtn = document.getElementById('btnQuizTgShare');
  if (tgBtn) {
    const summary = `Здравствуйте, Владимир! Я прошел подбор на сайте:
- Для кого: ${quizAnswers[0] || 'не указано'}
- Впечатление: ${quizAnswers[1] || 'не указано'}
- Ноты: ${quizAnswers[2] || 'не указано'}
- Формат: ${quizAnswers[3] || 'не указано'}
Помогите, пожалуйста, согласовать идеальный бокс!`;
    tgBtn.href = `https://t.me/volodiumparfum?text=${encodeURIComponent(summary)}`;
  }
}

window.resetQuiz = function() {
  quizCurrentStep = 0;
  for (let key in quizAnswers) delete quizAnswers[key];
  renderQuizStep();
};

/* ==========================================================================
   5. Interactive 3D Gold Foil Certificate Studio
   ========================================================================== */
function initCertificateStudio() {
  const card = document.getElementById('liveCertCard');
  const nameInput = document.getElementById('certNameInput');
  const wishInput = document.getElementById('certWishInput');
  const recipientNameEl = document.getElementById('certDisplayRecipient');
  const wishEl = document.getElementById('certDisplayWish');
  const amountEl = document.getElementById('certDisplayAmount');
  const amtBtns = document.querySelectorAll('.cert-amt-btn');
  const addToCartBtn = document.getElementById('btnOrderCert');

  let activeAmount = 5000;

  if (amtBtns.length) {
    amtBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        amtBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        activeAmount = parseInt(btn.dataset.amt, 10);
        if (amountEl) amountEl.textContent = formatPrice(activeAmount);
        playChime(500);
      });
    });
  }

  if (nameInput && recipientNameEl) {
    nameInput.addEventListener('input', (e) => {
      recipientNameEl.textContent = e.target.value.trim() || 'Имя получателя';
    });
  }

  if (wishInput && wishEl) {
    wishInput.addEventListener('input', (e) => {
      wishEl.textContent = e.target.value.trim() ? `«${e.target.value.trim()}»` : '«Для самого особенного человека в мире ароматов»';
    });
  }

  // 3D tilt tracking mouse
  if (card) {
    card.addEventListener('mousemove', (e) => {
      const rect = card.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      const rotateX = -(y / rect.height) * 16;
      const rotateY = (x / rect.width) * 16;
      card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.02, 1.02, 1.02)`;
    });
    card.addEventListener('mouseleave', () => {
      card.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
    });
  }

  if (addToCartBtn) {
    addToCartBtn.addEventListener('click', () => {
      const recipient = (nameInput ? nameInput.value.trim() : '') || 'Владельцу сертификата';
      const wish = (wishInput ? wishInput.value.trim() : '') || 'Для лучшего парфюмерного выбора';
      const certItem = {
        id: `cert-${activeAmount}-${Date.now()}`,
        name: `Подарочный сертификат ${formatPrice(activeAmount)}`,
        brand: 'VOLODIUM PARFUM',
        price: activeAmount,
        image: 'assets/images/IMG_3867.PNG',
        isCert: true,
        recipient: recipient,
        wish: wish
      };
      addItemToCart(certItem, 'электронный');
      playChime(700);
      showToast(`Подарочный сертификат на ${formatPrice(activeAmount)} добавлен в корзину!`);
    });
  }
}

/* ==========================================================================
   6. Shopping Cart & Checkout System
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
    cart.push({
      cartId: cartId,
      itemId: item.id,
      name: item.name,
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
  showToast(`«${item.name}» (${volume}) добавлен в корзину`);
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
        <p style="font-size: 1.1rem; color: #ffffff;">Ваша парфюмерная корзина пуста</p>
        <p style="font-size: 0.85rem; max-width: 260px;">Выберите понравившийся аромат в каталоге или закажите персональный Secret Box.</p>
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
        <div class="cart-item-meta">${item.volume === 'bottle' ? 'Полноразмерный флакон' : item.volume}</div>
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
   8. FAQ Accordion
   ========================================================================== */
function initFAQ() {
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const questionBtn = item.querySelector('.faq-question');
    const answer = item.querySelector('.faq-answer');

    if (questionBtn && answer) {
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
          answer.style.maxHeight = answer.scrollHeight + 'px';
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
      if (targetId === '#' || targetId === '#opencart') return;
      const targetEl = document.querySelector(targetId);
      if (targetEl) {
        e.preventDefault();
        targetEl.scrollIntoView({ behavior: 'smooth' });
        // Close mobile menu if open
        const mobileNav = document.getElementById('mobileNav');
        if (mobileNav) mobileNav.classList.remove('active');
      }
    });
  });

  const mobileMenuBtn = document.getElementById('btnMobileMenu');
  const mobileNav = document.getElementById('mobileNav');
  const mobileNavClose = document.getElementById('btnMobileNavClose');
  if (mobileMenuBtn && mobileNav) {
    mobileMenuBtn.addEventListener('click', () => {
      mobileNav.classList.add('active');
      document.body.style.overflow = 'hidden';
      playChime(480);
    });
  }
  if (mobileNavClose && mobileNav) {
    mobileNavClose.addEventListener('click', () => {
      mobileNav.classList.remove('active');
      document.body.style.overflow = '';
    });
  }
  if (mobileNav) {
    mobileNav.addEventListener('click', (e) => {
      if (e.target === mobileNav) {
        mobileNav.classList.remove('active');
        document.body.style.overflow = '';
      }
    });
  }
}
