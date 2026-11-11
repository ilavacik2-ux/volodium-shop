#!/usr/bin/env python3
"""
Splits single-page index.html into a clean 9-page storefront while preserving
100% of shared layout, modals, cart drawer, scripts, and user customizations.
"""
from pathlib import Path
import re

ROOT = Path(__file__).resolve().parent.parent
SRC_FILE = ROOT / "index.html"

text = SRC_FILE.read_text(encoding="utf-8")
lines = text.splitlines(keepends=True)


def slice_lines(start_1idx: int, end_1idx: int) -> str:
    return "".join(lines[start_1idx - 1 : end_1idx])


# Extract exact building blocks from current verified index.html
head_block = slice_lines(1, 43)       # <!DOCTYPE html> ... <body class="intro-active">
intro_block = slice_lines(44, 68)     # <aside id="monroeIntro"> ... </aside>
header_drawer_block = slice_lines(69, 275)  # Promo bar + Header + Volodium Drawer

hero_section = slice_lines(276, 356)
marquee_section = slice_lines(357, 374)
catalog_section = slice_lines(375, 428)
aromaboxes_section = slice_lines(429, 467)
secret_section = slice_lines(468, 609)
quiz_section = slice_lines(610, 1138)
cert_section = slice_lines(1139, 1370)
consult_section = slice_lines(1371, 1473)
reviews_section = slice_lines(1474, 1609)
tester_section = slice_lines(1610, 1638)
custom_scent_section = slice_lines(1639, 1703)
delivery_section = slice_lines(1704, 1889)

footer_and_bottom = slice_lines(1890, len(lines))


def rewrite_links(html: str, current_page: str) -> str:
    """Rewrite section anchor links to multi-page URLs cleanly."""
    # Brand logo -> index.html
    html = html.replace('<a href="#" class="brand">', '<a href="index.html" class="brand">')

    replacements = [
        ('href="#catalog"', 'href="catalog.html"'),
        ('href="#aroma-boxes"', 'href="boxes.html"'),
        ('href="#secret-boxes"', 'href="boxes.html#secret-boxes"'),
        ('href="#quiz"', 'href="quiz.html"'),
        ('href="#consultation"', 'href="consultation.html"'),
        ('href="#tester-guide"', 'href="request.html"'),
        ('href="#certificates"', 'href="certificates.html"'),
        ('href="#reviews"', 'href="reviews.html"'),
        ('href="#delivery"', 'href="delivery.html"'),
    ]
    for old, new in replacements:
        html = html.replace(old, new)

    # On boxes.html, smooth-scroll directly to #secret-boxes
    if current_page == "boxes.html":
        html = html.replace('href="boxes.html#secret-boxes"', 'href="#secret-boxes"')

    return html


def build_subpage_head(title: str, description: str) -> str:
    h = head_block
    h = h.replace('<html lang="ru" class="intro-active">', '<html lang="ru">')
    h = h.replace('<body class="intro-active">', '<body class="hero-cinematic-active">')
    # Remove critical splash protection CSS on subpages
    h = re.sub(
        r"\s*<!-- Critical Splash Screen Protection -->.*?</style>",
        "",
        h,
        flags=re.DOTALL,
    )
    h = re.sub(
        r"<title>.*?</title>",
        f"<title>{title}</title>",
        h,
        count=1,
    )
    h = re.sub(
        r'<meta name="description" content=".*?">',
        f'<meta name="description" content="{description}">',
        h,
        count=1,
    )
    return h


def build_home_head() -> str:
    # Add fast pre-paint check on homepage so back-navigation skips splash cleanly
    guard_script = (
        "  <script>try{if(sessionStorage.getItem('vp_intro_seen')==='1'||window.location.hash)"
        "{document.documentElement.classList.remove('intro-active');}}catch(e){}</script>\n"
    )
    return head_block.replace("  <!-- Main Stylesheet -->", guard_script + "  <!-- Main Stylesheet -->")


def make_breadcrumb(label: str) -> str:
    return f"""
  <div class="subpage-breadcrumb-bar">
    <div class="container subpage-breadcrumb-inner">
      <a href="index.html" class="spb-back">← Главная</a>
      <span class="spb-sep">/</span>
      <span class="spb-current">{label}</span>
    </div>
  </div>
"""


HOME_HUB_SECTION = """
  <!-- Luxury Storefront Sections Hub -->
  <section class="home-hub-section" id="storefront-hub">
    <div class="container">
      <div class="section-header">
        <span class="section-tag">Навигация по магазину</span>
        <h2 class="section-title">Коллекция и сервисы</h2>
        <p class="section-descr">
          Выберите нужный раздел: полный каталог из 265+ ароматов, готовые сеты, персональный подбор или оформление подарочного сертификата.
        </p>
      </div>

      <div class="home-hub-grid">
        <a href="catalog.html" class="home-hub-card hhc-featured">
          <div>
            <div class="hhc-top">
              <span class="hhc-num">01</span>
              <span class="hhc-tag">265+ ароматов</span>
            </div>
            <h3 class="hhc-title">Каталог парфюмерии</h3>
            <p class="hhc-desc">Редкая нишевая парфюмерия в стеклянных атомайзерах от 3 мл и полноценные флаконы с быстрым поиском по нотам и брендам.</p>
          </div>
          <span class="hhc-cta">Открыть каталог →</span>
        </a>

        <a href="boxes.html" class="home-hub-card">
          <div>
            <div class="hhc-top">
              <span class="hhc-num">02</span>
              <span class="hhc-tag">9 сетов</span>
            </div>
            <h3 class="hhc-title">Тематические аромабоксы</h3>
            <p class="hhc-desc">Готовые коллекции из 5 культовых ароматов по 3 или 5 мл — идеальный формат для знакомства со знаковыми шедеврами.</p>
          </div>
          <span class="hhc-cta">Смотреть сеты →</span>
        </a>

        <a href="boxes.html#secret-boxes" class="home-hub-card">
          <div>
            <div class="hhc-top">
              <span class="hhc-num">03</span>
              <span class="hhc-tag">Эксклюзив</span>
            </div>
            <h3 class="hhc-title">Secret Box от Владимира</h3>
            <p class="hhc-desc">Персональный набор-сюрприз, составленный Владимиром Вациком на основе ваших предпочтений и стоп-нот.</p>
          </div>
          <span class="hhc-cta">Выбрать Secret Box →</span>
        </a>

        <a href="quiz.html" class="home-hub-card">
          <div>
            <div class="hhc-top">
              <span class="hhc-num">04</span>
              <span class="hhc-tag">За 2 минуты</span>
            </div>
            <h3 class="hhc-title">Парфюмерная анкета</h3>
            <p class="hhc-desc">Ответьте на 7 коротких вопросов — эксперт соберёт вашу персональную формулу парфюмерного гардероба.</p>
          </div>
          <span class="hhc-cta">Пройти анкету →</span>
        </a>

        <a href="consultation.html" class="home-hub-card">
          <div>
            <div class="hhc-top">
              <span class="hhc-num">05</span>
              <span class="hhc-tag">Онлайн и Москва</span>
            </div>
            <h3 class="hhc-title">Консультация с экспертом</h3>
            <p class="hhc-desc">Персональный онлайн-разбор или личная встреча в Москве с чемоданом на 150+ редких композиций.</p>
          </div>
          <span class="hhc-cta">Записаться →</span>
        </a>

        <a href="certificates.html" class="home-hub-card">
          <div>
            <div class="hhc-top">
              <span class="hhc-num">06</span>
              <span class="hhc-tag">От 3 000 ₽</span>
            </div>
            <h3 class="hhc-title">Подарочные сертификаты</h3>
            <p class="hhc-desc">Электронный сертификат или фирменный конверт с сургучной печатью — беспроигрышный подарок на любой случай.</p>
          </div>
          <span class="hhc-cta">Оформить подарок →</span>
        </a>
      </div>

      <div class="home-hub-secondary-links">
        <a href="request.html" class="hhs-pill">Запрос на полноценный флакон →</a>
        <a href="reviews.html" class="hhs-pill">Отзывы &amp; Распаковки →</a>
        <a href="delivery.html" class="hhs-pill">Доставка СДЭК (от 300 ₽) &amp; FAQ →</a>
      </div>
    </div>
  </section>
"""

pages = [
    {
        "filename": "index.html",
        "is_home": True,
        "body": hero_section + marquee_section + HOME_HUB_SECTION + custom_scent_section,
    },
    {
        "filename": "catalog.html",
        "title": "Каталог парфюмерии — VOLODIUM PARFUM",
        "desc": "Полный каталог 100% оригинальной нишевой парфюмерии VOLODIUM PARFUM. Распив от 3 мл в стеклянных атомайзерах и полноценные флаконы.",
        "breadcrumb": "Каталог парфюмерии",
        "body": catalog_section,
    },
    {
        "filename": "boxes.html",
        "title": "Тематические аромабоксы и Secret Box — VOLODIUM PARFUM",
        "desc": "Готовые тематические аромабоксы и авторский Secret Box от Владимира Вацика.",
        "breadcrumb": "Аромабоксы & Secret Box",
        "body": aromaboxes_section + secret_section,
    },
    {
        "filename": "quiz.html",
        "title": "Парфюмерная анкета — VOLODIUM PARFUM",
        "desc": "Интерактивная парфюмерная анкета Владимира Вацика для персонального подбора аромата.",
        "breadcrumb": "Парфюмерная анкета",
        "body": quiz_section,
    },
    {
        "filename": "consultation.html",
        "title": "Консультация с Владимиром Вациком — VOLODIUM PARFUM",
        "desc": "Персональный подбор парфюмерного гардероба онлайн или на личной встрече в Москве.",
        "breadcrumb": "Консультация с Владимиром",
        "body": consult_section,
    },
    {
        "filename": "request.html",
        "title": "Запрос на полноценный флакон — VOLODIUM PARFUM",
        "desc": "Проверка наличия редких нишевых флаконов и индивидуальный заказ из Европы.",
        "breadcrumb": "Запрос на полноценный флакон",
        "body": tester_section + custom_scent_section,
    },
    {
        "filename": "certificates.html",
        "title": "Подарочные сертификаты — VOLODIUM PARFUM",
        "desc": "Подарочные сертификаты VOLODIUM PARFUM номиналом от 3 000 до 50 000 ₽.",
        "breadcrumb": "Подарочные сертификаты",
        "body": cert_section,
    },
    {
        "filename": "reviews.html",
        "title": "Отзывы и распаковки — VOLODIUM PARFUM",
        "desc": "Реальные отзывы клиентов и распаковки заказов интернет-магазина VOLODIUM PARFUM.",
        "breadcrumb": "Отзывы & Распаковки",
        "body": reviews_section,
    },
    {
        "filename": "delivery.html",
        "title": "Доставка и оплата — VOLODIUM PARFUM",
        "desc": "Условия доставки СДЭК по России от 300 ₽ (бесплатно от 5 000 ₽), самовывоз Ⓜ️ Автозаводская и ответы на частые вопросы.",
        "breadcrumb": "Доставка & Оплата",
        "body": delivery_section,
    },
]

for page in pages:
    fname = page["filename"]
    if page.get("is_home"):
        head = build_home_head()
        top = head + intro_block + header_drawer_block
        middle = page["body"]
    else:
        head = build_subpage_head(page["title"], page["desc"])
        top = head + header_drawer_block
        middle = (
            '<main class="subpage-main">\n'
            + make_breadcrumb(page["breadcrumb"])
            + page["body"]
            + "</main>\n"
        )

    full_html = top + middle + footer_and_bottom
    full_html = rewrite_links(full_html, fname)
    (ROOT / fname).write_text(full_html, encoding="utf-8")
    print(f"Generated {fname} ({len(full_html):,} bytes)")
