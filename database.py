"""
VOLODIUM PARFUM — SQLite WAL Database Engine & Security Persistence
Autonomous database for Perfumes (265+), Aroma Boxes (9+), Secret Boxes (3),
Site Content CMS, Bulk Price Snapshots (with 1-click Rollback),
PBKDF2 Auth, Dual Gateway Token Roles, Rate Limiting & Local Audit Logs.
"""

import sqlite3
import json
import os
import re
import time
import hmac
import hashlib
import secrets
from typing import List, Dict, Any, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "volodium_database.db")
PERFUMES_JS_PATH = os.path.join(BASE_DIR, "assets", "data", "perfumes.js")


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False, timeout=15.0)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA synchronous=NORMAL;")
    conn.execute("PRAGMA temp_store=MEMORY;")
    conn.execute("PRAGMA cache_size=-32000;")
    return conn


# ==============================================================================
# CRYPTO & PASSWORD HASHING UTILITIES (PBKDF2-HMAC-SHA256)
# ==============================================================================

def hash_password(password: str, iterations: int = 310000) -> str:
    salt = secrets.token_bytes(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
    return f"pbkdf2_sha256${iterations}${salt.hex()}${dk.hex()}"


def verify_password(password: str, stored_hash: str) -> bool:
    try:
        parts = stored_hash.split("$")
        if len(parts) != 4 or parts[0] != "pbkdf2_sha256":
            return False
        iterations = int(parts[1])
        salt = bytes.fromhex(parts[2])
        expected_dk = bytes.fromhex(parts[3])
        actual_dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, iterations)
        return hmac.compare_digest(actual_dk, expected_dk)
    except Exception:
        return False


def hash_token(raw_token: str) -> str:
    return hashlib.sha256(raw_token.encode("utf-8")).hexdigest()


# ==============================================================================
# DEFAULT SITE CONTENT & SEASONALITY HELPERS
# ==============================================================================

SEASON_PRESETS: Dict[str, Dict[str, str]] = {
    "Круглый год": {"icon": "🌸", "time": "День & Вечер", "timeIcon": "✨"},
    "Весна — Лето": {"icon": "☀️", "time": "Идеально на день", "timeIcon": "☀️"},
    "Осень — Зима": {"icon": "🍂", "time": "Вечер / Особый случай", "timeIcon": "🌙"},
    "Весна — Осень": {"icon": "🌿", "time": "День & Романтический вечер", "timeIcon": "✨"},
    "Зима": {"icon": "❄️", "time": "Морозный день & Вечер", "timeIcon": "❄️"},
    "Лето": {"icon": "🍋", "time": "Лёгкий дневной шлейф", "timeIcon": "☀️"},
}


def infer_lifestyle_meta(item: Dict[str, Any]) -> Dict[str, str]:
    metrics = item.get("metrics") if isinstance(item.get("metrics"), dict) else {}
    family = str(item.get("notesFamily") or "").lower()
    desc = str(item.get("description") or "").lower()
    name = str(item.get("name") or "").lower()
    text = f"{family} {desc} {name}"

    season = "Круглый год"
    season_icon = "🌸"
    time_of_day = "День & Вечер"
    time_icon = "✨"
    mood = "Изысканный нишевый стиль"

    if any(k in text for k in ("citrus", "цитрус", "бергамот", "лимон", "морск", "акватич", "fresh", "свеж", "лайм", "мята", "грейпфрут")):
        season = "Весна — Лето"
        season_icon = "☀️"
        time_of_day = "Идеально на день"
        time_icon = "☀️"
        mood = "Освежающий, энергичный, искрящийся"
    elif any(k in text for k in ("oriental", "gourmand", "восток", "ваниль", "табак", "кожа", "уд", "прян", "смол", "шоколад", "кофе", "амбр", "вишн")):
        season = "Осень — Зима"
        season_icon = "🍂"
        time_of_day = "Вечер / Особый случай"
        time_icon = "🌙"
        mood = "Глубокий, согревающий, статусный"
    elif any(k in text for k in ("floral", "цвет", "роза", "пион", "жасмин", "тубероз", "ландыш", "ирис")):
        season = "Весна — Осень"
        season_icon = "🌿"
        time_of_day = "День & Романтический вечер"
        time_icon = "✨"
        mood = "Утонченный, женственный, летящий"
    elif any(k in text for k in ("woody", "древ", "кедр", "сандал", "ветивер", "пачули", "мускус")):
        season = "Круглый год"
        season_icon = "🌲"
        time_of_day = "Деловой день & Вечер"
        time_icon = "💼"
        mood = "Благородный, сдержанный, стойкий"

    explicit_season = item.get("season") or metrics.get("season")
    if explicit_season and str(explicit_season).strip():
        season = str(explicit_season).strip()
        preset = SEASON_PRESETS.get(season)
        if preset:
            season_icon = item.get("seasonIcon") or metrics.get("seasonIcon") or preset["icon"]
            time_of_day = item.get("timeOfDay") or metrics.get("timeOfDay") or preset["time"]
            time_icon = item.get("timeIcon") or metrics.get("timeIcon") or preset["timeIcon"]

    if item.get("seasonIcon") or metrics.get("seasonIcon"):
        season_icon = item.get("seasonIcon") or metrics.get("seasonIcon")
    if item.get("timeOfDay") or metrics.get("timeOfDay"):
        time_of_day = item.get("timeOfDay") or metrics.get("timeOfDay")
    if item.get("timeIcon") or metrics.get("timeIcon"):
        time_icon = item.get("timeIcon") or metrics.get("timeIcon")
    if item.get("mood") or metrics.get("vibe"):
        mood = item.get("mood") or metrics.get("vibe")

    return {
        "season": season,
        "seasonIcon": season_icon,
        "timeOfDay": time_of_day,
        "timeIcon": time_icon,
        "mood": mood,
    }


DEFAULT_SITE_CONTENT: Dict[str, Any] = {
    "brand": {
        "title": "VOLODIUM",
        "subtitle": "Parfum",
        "logo": "assets/images/E610BB2F-DBAE-4672-9.PNG",
        "favicon": "assets/images/E610BB2F-DBAE-4672-9.PNG",
        "introEnabled": True,
        "introTitle": "VOLODIUM",
        "introSubtitle": "PARFUM",
    },
    "promoBar": {
        "enabled": True,
        "prefix": "✦ Промокод",
        "highlightCode": "СТАРТ",
        "suffix": "— скидка 10% на ваш первый заказ",
        "buttonText": "Применить в корзине",
    },
    "hero": {
        "badge": "100% Оригинальная парфюмерия",
        "titleLine": "Открой. Вдохни.",
        "titleAccent": "Почувствуй.",
        "description": "Нишевая парфюмерия, авторские Secret Box и персональный подбор гардероба от эксперта Владимира Вацика. Миниатюры в качественных атомайзерах для тестирования перед покупкой полного флакона.",
        "ctaCatalogText": "Каталог духов (265+)",
        "ctaQuizText": "Парфюмерная анкета",
        "ctaSecretText": "Secret Box от Владимира Вацика",
        "portraitImage": "assets/img/editorial/vladimir_atomizer_portrait.jpg",
        "portraitPosition": "center 20%",
        "portraitTitle": "ВЛАДИМИР ВАЦИК",
        "portraitQuote": "«Парфюм — это чувственное продолжение вашей индивидуальности»",
        "backdropImage": "assets/img/editorial/hero_perfume_flacons_neutral.jpg",
        "backdropOpacity": 0.75,
        "stats": [
            {"value": "1 200+", "label": "Довольных клиентов"},
            {"value": "265+", "label": "Редких ароматов"},
            {"value": "7+ лет", "label": "Экспертизы & байерства"},
            {"value": "100%", "label": "Строго оригинал"},
        ],
    },
    "consultation": {
        "onlineTitle": "Подбор по парфюмерной анкете",
        "onlineSub": "Персональный разбор ольфакторного профиля за 1 минуту",
        "onlinePrice": "0 ₽",
        "onlineNote": "Входит в стоимость сета",
        "onlineImage": "assets/img/consultation/online_selection_infographic.jpg",
        "offlineTitle": "Личная сессия в Москве",
        "offlineSub": "Индивидуальный разбор гардероба с чемоданом на 150+ ароматов",
        "offlinePrice": "5 000 ₽",
        "offlineNote": "45–60 минут индивидуально",
        "offlineImage": "assets/img/consultation/consult_offline_suitcase_enhanced.jpg",
    },
    "commerce": {
        "minOrderThreshold": 3000,
        "freeDeliveryThreshold": 5000,
        "promoCodes": [
            {"code": "СТАРТ", "discountPercent": 10, "active": True, "label": "Скидка 10% на первый заказ"},
            {"code": "START", "discountPercent": 10, "active": True, "label": "Скидка 10% (LAT)"},
            {"code": "VOLODIUM", "discountPercent": 15, "active": True, "label": "Клубная скидка 15%"},
            {"code": "VOVA", "discountPercent": 15, "active": True, "label": "Персональная скидка 15%"},
        ],
    },
    "contacts": {
        "telegramHandle": "volodiumparfum",
        "channelHandle": "vatsiik",
        "whatsappPhone": "79094442617",
        "whatsappDisplay": "+7 (909) 444-26-17",
        "vkUrl": "https://vk.ru/volodya_v_v",
        "vkDisplay": "vk.ru/volodya_v_v",
        "address": "Москва, ул. Автозаводская 23к7",
        "hours": "Ежедневно 10:00 — 22:00 МСК",
    },
    "reviews": [
        {
            "id": 1,
            "name": "Kirill Belov",
            "city": "Telegram отзыв",
            "tag": "Аромабокс",
            "text": "«Арома-бокс приехал, всё дошло в идеальном состоянии — упаковано с душой и вниманием к деталям. Спасибо за атмосферу, которую создаёшь! Парфюмы с порога заявили о себе — всё в моём духе. Рад, что выбрал тебя! Отдельное спасибо за секретный ништячок Al Thaïr!»",
            "image": "assets/img/reviews/review_box_kirill.jpg",
            "objectPosition": "center 25%",
        },
        {
            "id": 2,
            "name": "Юлианна",
            "city": "Telegram отзыв",
            "tag": "Подбор вслепую",
            "text": "«Владимир, спасибо огромное за подбор! Заказывала практически вслепую и переживала, но попадание в точку! Особенно Wavechild — любовь с первого пшика. Видно, что стараешься подобрать под человека, а не просто продать. Упаковка с фирменным посланием — отдельный вайб!»",
            "image": "assets/img/reviews/review_box_open_motto.jpg",
            "objectPosition": "center 65%",
        },
        {
            "id": 3,
            "name": "Екатерина",
            "city": "Telegram отзыв",
            "tag": "Подарочный бокс",
            "text": "«Володя, это восторг! Заказывала подарочный бокс — оформление превзошло все ожидания! Черная лента, фирменная сургучная печать с монограммой, всё до мельчайших деталей продумано. Распаковывать было отдельным эстетическим удовольствием, а ароматы внутри подобраны с первого раза в десятку ❤️»",
            "image": "assets/img/reviews/review_box_wax_ribbon.jpg",
            "objectPosition": "center 50%",
        },
        {
            "id": 4,
            "name": "Анастасия",
            "city": "Telegram отзыв",
            "tag": "Boss Unlimited & Сет",
            "text": "«В общем! Большое тебе спасибо за парфюм и твой подход 🙏🏻 От заказа до его получения мы остались под впечатлением! Быстрая отправка, аккуратная красивая упаковка, молодой человек в восторге, Boss Unlimited — его любимый парфюм и он теперь снова каждый день им пользуется! Обязательно буду обращаться еще! Спасибо за твой труд и твой подход к работе 🫶🏻»",
            "image": "assets/img/reviews/review_boss_unlimited.jpg",
            "objectPosition": "center 45%",
        },
        {
            "id": 5,
            "name": "Максим",
            "city": "Telegram отзыв",
            "tag": "Распаковка & Подарки",
            "text": "«Привет! Все получил, да еще и 2 подарочка 🔥 Ультра доволен, есть как культовые ароматы по типу Альтаира, Ангела, так и варианты на попробовать. От души еще раз, спасибо! ♥️»",
            "image": "assets/img/reviews/review_box_motto_unpack.jpg",
            "objectPosition": "center 65%",
        },
        {
            "id": 6,
            "name": "Ксения",
            "city": "Telegram отзыв",
            "tag": "Парфюмерный гардероб",
            "text": "«Вова, спасибо тебе! Вспоминаю, как впервые попала на консультацию, думая, что мне мало что интересно. А потом провела инвентаризацию: это настоящее исследование себя через мир ароматов и поиск своего образа. Спасибо за это путешествие!»",
            "image": "assets/img/reviews/photo_viola.jpg",
            "objectPosition": "center 30%",
        },
        {
            "id": 7,
            "name": "Никита",
            "city": "Личная встреча / Telegram",
            "tag": "Личный подбор",
            "text": "«Все прошло просто супер! Встретились, открыли огромный чемодан и нашли сразу 6 новых топовых ароматов для меня. Честно, я в полном восторге, обожаю твою работу — ты настоящий профи и эксперт! Теперь за парфюмом только к тебе 🔥»",
            "image": "assets/img/reviews/review_nikita_consult.jpg",
            "objectPosition": "center 20%",
        },
    ],
}


# ==============================================================================
# SCHEMA & INITIALIZATION
# ==============================================================================

def _parse_js_array(src: str, varname: str) -> List[Dict[str, Any]]:
    m = re.search(rf"(?:const|let|var)\s+{varname}\s*=\s*(\[[\s\S]*?\])\s*;", src)
    if not m:
        return []
    raw = re.sub(r",\s*([}\]])", r"\1", m.group(1))
    return json.loads(raw)


def init_db():
    conn = get_connection()
    cursor = conn.cursor()
    cursor.execute("PRAGMA journal_mode=WAL;")
    cursor.execute("PRAGMA synchronous=NORMAL;")

    # 1. Perfumes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS perfumes (
        id TEXT PRIMARY KEY,
        uid TEXT,
        brand TEXT NOT NULL DEFAULT '',
        name TEXT NOT NULL,
        full_title TEXT DEFAULT '',
        gender TEXT DEFAULT 'unisex',
        category TEXT DEFAULT 'perfume',
        notes_family TEXT DEFAULT '',
        image TEXT DEFAULT '',
        object_position TEXT DEFAULT 'center center',
        badge TEXT DEFAULT '',
        subtitle TEXT DEFAULT '',
        bottle_size TEXT DEFAULT '',
        description TEXT DEFAULT '',
        season TEXT DEFAULT 'Круглый год',
        season_icon TEXT DEFAULT '🌸',
        time_of_day TEXT DEFAULT 'День & Вечер',
        time_icon TEXT DEFAULT '✨',
        mood TEXT DEFAULT 'Изысканный нишевый стиль',
        longevity TEXT DEFAULT 'До 12 часов',
        sillage TEXT DEFAULT 'Выразительный',
        prices_json TEXT NOT NULL DEFAULT '{}',
        pyramid_json TEXT DEFAULT '{}',
        metrics_json TEXT DEFAULT '{}',
        url TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        updated_at REAL DEFAULT 0
    )
    """)

    # 2. Aroma Boxes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS aromaboxes (
        id TEXT PRIMARY KEY,
        uid TEXT,
        name TEXT NOT NULL,
        category TEXT DEFAULT 'box',
        gender TEXT DEFAULT 'unisex',
        gender_label TEXT DEFAULT 'Унисекс',
        badge TEXT DEFAULT '',
        image TEXT DEFAULT '',
        cdn_image TEXT DEFAULT '',
        object_position TEXT DEFAULT 'center center',
        prices_json TEXT NOT NULL DEFAULT '{}',
        old_prices_json TEXT NOT NULL DEFAULT '{}',
        short_subtitle TEXT DEFAULT '',
        perfumes_json TEXT NOT NULL DEFAULT '[]',
        full_description TEXT DEFAULT '',
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        updated_at REAL DEFAULT 0
    )
    """)

    # 3. Secret Boxes
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS secret_boxes (
        id TEXT PRIMARY KEY,
        uid TEXT,
        level TEXT NOT NULL,
        name TEXT NOT NULL,
        title TEXT DEFAULT '',
        subtitle TEXT DEFAULT '',
        price INTEGER NOT NULL DEFAULT 4900,
        old_price INTEGER DEFAULT 0,
        image TEXT DEFAULT '',
        cdn_image TEXT DEFAULT '',
        object_position TEXT DEFAULT 'center center',
        description TEXT DEFAULT '',
        badge TEXT DEFAULT '',
        features_json TEXT DEFAULT '[]',
        is_hit INTEGER DEFAULT 0,
        sort_order INTEGER DEFAULT 0,
        is_active INTEGER DEFAULT 1,
        updated_at REAL DEFAULT 0
    )
    """)

    # 4. Site Settings (site_content, password_hash, tokens, etc.)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS site_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at REAL DEFAULT 0
    )
    """)

    # 5. Bulk Price Snapshots (1-click Undo)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS price_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        summary TEXT NOT NULL,
        operator_role TEXT NOT NULL,
        operator_name TEXT NOT NULL,
        scope TEXT NOT NULL,
        percent REAL NOT NULL,
        snapshot_json TEXT NOT NULL,
        restored INTEGER DEFAULT 0,
        created_at TEXT NOT NULL
    )
    """)

    # 6. Audit Logs (local boutique security & change history — NO Telegram)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        operator_role TEXT DEFAULT 'system',
        operator_name TEXT DEFAULT 'Система',
        action TEXT NOT NULL,
        entity_type TEXT DEFAULT '',
        entity_id TEXT DEFAULT '',
        summary TEXT NOT NULL,
        details_json TEXT DEFAULT '{}',
        ip TEXT DEFAULT '',
        created_at TEXT NOT NULL
    )
    """)

    # 7. Admin Sessions (token_hash only, bound to role)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS admin_sessions (
        token_hash TEXT PRIMARY KEY,
        operator_role TEXT NOT NULL,
        operator_name TEXT NOT NULL,
        ip TEXT DEFAULT '',
        user_agent TEXT DEFAULT '',
        expires_at REAL NOT NULL,
        created_at REAL NOT NULL
    )
    """)

    # 8. Rate Limits (persistent anti-bruteforce & anti-enumeration)
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS rate_limits (
        key TEXT PRIMARY KEY,
        fails INTEGER DEFAULT 0,
        lockout_until REAL DEFAULT 0,
        updated_at REAL DEFAULT 0
    )
    """)

    conn.commit()

    # Seed Catalog if empty
    cursor.execute("SELECT COUNT(*) FROM perfumes")
    if cursor.fetchone()[0] == 0:
        seed_initial_catalog(cursor)
        conn.commit()

    # Seed Site Content if not set
    cursor.execute("SELECT value FROM site_settings WHERE key = 'site_content'")
    if not cursor.fetchone():
        cursor.execute(
            "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)",
            ("site_content", json.dumps(DEFAULT_SITE_CONTENT, ensure_ascii=False), time.time()),
        )
        conn.commit()

    # Seed Admin Password Hash if not set (from .env or fallback CSPRNG)
    cursor.execute("SELECT value FROM site_settings WHERE key = 'admin_password_hash'")
    if not cursor.fetchone():
        initial_pass = os.environ.get("VP_ADMIN_PASSWORD", "").strip()
        if not initial_pass or initial_pass == "CHANGE_ME_STRONG_PASSWORD":
            initial_pass = "Volodium!Atelier2026#"
        cursor.execute(
            "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)",
            ("admin_password_hash", hash_password(initial_pass), time.time()),
        )
        conn.commit()

    # Seed Dual Gateway Tokens if not in DB (synced initially from .env)
    _ensure_gateway_tokens(cursor)
    conn.commit()
    conn.close()


def _ensure_gateway_tokens(cursor: sqlite3.Cursor):
    for setting_key, env_key, prefix in [
        ("gateway_token_owner", "VP_GATEWAY_TOKEN_OWNER", "vp_vova_"),
        ("gateway_token_assistant", "VP_GATEWAY_TOKEN_ASSISTANT", "vp_help_"),
    ]:
        cursor.execute("SELECT value FROM site_settings WHERE key = ?", (setting_key,))
        row = cursor.fetchone()
        env_val = os.environ.get(env_key, "").strip()
        if not row:
            token_val = env_val if (env_val and not env_val.startswith("CHANGE_ME")) else (prefix + secrets.token_urlsafe(24))
            cursor.execute(
                "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?)",
                (setting_key, token_val, time.time()),
            )


def seed_initial_catalog(cursor: sqlite3.Cursor):
    if not os.path.exists(PERFUMES_JS_PATH):
        return
    with open(PERFUMES_JS_PATH, "r", encoding="utf-8") as f:
        src = f.read()

    perfumes = _parse_js_array(src, "PERFUMES_DATA")
    boxes = _parse_js_array(src, "AROMA_BOXES_DATA")
    secrets_list = _parse_js_array(src, "SECRET_BOXES_DATA")
    now = time.time()

    # Ensure box duplicates are filtered cleanly
    box_uids = {str(b.get("uid", "")) for b in boxes} | {str(s.get("uid", "")) for s in secrets_list}

    idx = 0
    for item in perfumes:
        uid = str(item.get("uid", ""))
        prices = item.get("prices") or {}
        if uid in box_uids or bool(set(prices.keys()) & {"53ml", "55ml", "510ml"}):
            continue
        idx += 1
        life = infer_lifestyle_meta(item)
        metrics = dict(item.get("metrics") or {})
        metrics.setdefault("season", life["season"])
        metrics.setdefault("seasonIcon", life["seasonIcon"])
        metrics.setdefault("timeOfDay", life["timeOfDay"])
        metrics.setdefault("timeIcon", life["timeIcon"])
        metrics.setdefault("vibe", life["mood"])
        longevity = str(metrics.get("longevity") or "До 12 часов")
        sillage = str(metrics.get("sillage") or "Выразительный")
        metrics["longevity"] = longevity
        metrics["sillage"] = sillage

        cursor.execute(
            """
            INSERT OR REPLACE INTO perfumes (
                id, uid, brand, name, full_title, gender, category, notes_family,
                image, object_position, badge, subtitle, bottle_size, description,
                season, season_icon, time_of_day, time_icon, mood, longevity, sillage,
                prices_json, pyramid_json, metrics_json, url, sort_order, is_active, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                item["id"],
                uid,
                item.get("brand", ""),
                item.get("name", ""),
                item.get("fullTitle", ""),
                item.get("gender", "unisex"),
                item.get("category", "perfume"),
                item.get("notesFamily", ""),
                item.get("image", ""),
                item.get("objectPosition", "center center"),
                item.get("badge", ""),
                item.get("subtitle", ""),
                item.get("bottleSize", ""),
                item.get("description", ""),
                life["season"],
                life["seasonIcon"],
                life["timeOfDay"],
                life["timeIcon"],
                life["mood"],
                longevity,
                sillage,
                json.dumps(prices, ensure_ascii=False),
                json.dumps(item.get("pyramid") or {}, ensure_ascii=False),
                json.dumps(metrics, ensure_ascii=False),
                item.get("url", ""),
                idx,
                1,
                now,
            ),
        )

    for b_idx, box in enumerate(boxes, start=1):
        cursor.execute(
            """
            INSERT OR REPLACE INTO aromaboxes (
                id, uid, name, category, gender, gender_label, badge,
                image, cdn_image, object_position, prices_json, old_prices_json,
                short_subtitle, perfumes_json, full_description, sort_order, is_active, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                box["id"],
                str(box.get("uid", "")),
                box.get("name", ""),
                box.get("category", "box"),
                box.get("gender", "unisex"),
                box.get("genderLabel", "Унисекс"),
                box.get("badge", ""),
                box.get("image", ""),
                box.get("cdnImage", ""),
                box.get("objectPosition", "center center"),
                json.dumps(box.get("prices") or {}, ensure_ascii=False),
                json.dumps(box.get("oldPrices") or {}, ensure_ascii=False),
                box.get("shortSubtitle", ""),
                json.dumps(box.get("perfumes") or [], ensure_ascii=False),
                box.get("fullDescription", ""),
                b_idx,
                1,
                now,
            ),
        )

    default_sb_meta = {
        "secret-исследователь": {
            "subtitle": "3–5 нишевых ароматов под ваш запрос",
            "features": [
                "3–5 нишевых ароматов",
                "Индивидуальный подбор от Владимира Вацика",
                "Фирменная подарочная упаковка",
            ],
            "is_hit": 0,
        },
        "secret-коллекционер": {
            "subtitle": "5–8 нишевых ароматов (точно есть позиция 10 мл)",
            "features": [
                "5–8 редких нишевых композиций",
                "Точно присутствует формат 10 мл",
                "Персональное послание и консультация",
            ],
            "is_hit": 1,
        },
        "secret-одержимость": {
            "subtitle": "8–10 редких композиций + подарки от Владимира Вацика",
            "features": [
                "8–10 премиальных ароматов и эксклюзивов",
                "Мраморные и деревянные тревел-атомайзеры",
                "Диффузор для дома и VIP-подарки",
            ],
            "is_hit": 0,
        },
    }

    for s_idx, sb in enumerate(secrets_list, start=1):
        meta = default_sb_meta.get(sb["id"], {})
        cursor.execute(
            """
            INSERT OR REPLACE INTO secret_boxes (
                id, uid, level, name, title, subtitle, price, old_price,
                image, cdn_image, object_position, description, badge,
                features_json, is_hit, sort_order, is_active, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                sb["id"],
                str(sb.get("uid", "")),
                sb.get("level", ""),
                sb.get("name", ""),
                sb.get("title", ""),
                sb.get("subtitle") or meta.get("subtitle", ""),
                int(sb.get("price", 4900)),
                int(sb.get("oldPrice", 0)),
                sb.get("image", ""),
                sb.get("cdnImage", ""),
                sb.get("objectPosition", "center center"),
                sb.get("description", ""),
                sb.get("badge", ""),
                json.dumps(sb.get("features") or meta.get("features") or [], ensure_ascii=False),
                int(meta.get("is_hit", 0)),
                s_idx,
                1,
                now,
            ),
        )


# ==============================================================================
# ROW SERIALIZERS
# ==============================================================================

def _normalize_pyramid(pyr: Any) -> Dict[str, List[str]]:
    if not isinstance(pyr, dict):
        return {}
    out: Dict[str, List[str]] = {}
    for k in ("top", "heart", "base"):
        val = pyr.get(k)
        if isinstance(val, list):
            items = [str(x).strip() for x in val if str(x).strip()]
        elif isinstance(val, str):
            items = [s.strip() for s in re.split(r"[,·\n]+", val) if s.strip()]
        else:
            items = []
        if items:
            out[k] = items
    return out


def _row_to_perfume(r: sqlite3.Row) -> Dict[str, Any]:
    prices = json.loads(r["prices_json"] or "{}")
    pyramid = _normalize_pyramid(json.loads(r["pyramid_json"] or "{}"))
    metrics = json.loads(r["metrics_json"] or "{}")
    metrics["season"] = r["season"]
    metrics["seasonIcon"] = r["season_icon"]
    metrics["timeOfDay"] = r["time_of_day"]
    metrics["timeIcon"] = r["time_icon"]
    metrics["vibe"] = r["mood"]
    metrics["longevity"] = r["longevity"]
    metrics["sillage"] = r["sillage"]

    item = {
        "id": r["id"],
        "uid": int(r["uid"]) if (r["uid"] and str(r["uid"]).isdigit()) else r["uid"],
        "brand": r["brand"],
        "name": r["name"],
        "fullTitle": r["full_title"],
        "gender": r["gender"],
        "category": r["category"] or "perfume",
        "notesFamily": r["notes_family"],
        "image": r["image"],
        "objectPosition": r["object_position"] or "center center",
        "badge": r["badge"],
        "subtitle": r["subtitle"],
        "bottleSize": r["bottle_size"],
        "description": r["description"],
        "season": r["season"],
        "seasonIcon": r["season_icon"],
        "timeOfDay": r["time_of_day"],
        "timeIcon": r["time_icon"],
        "mood": r["mood"],
        "prices": prices,
        "metrics": metrics,
        "url": r["url"],
        "sortOrder": r["sort_order"],
        "isActive": bool(r["is_active"]),
    }
    if pyramid and any(pyramid.get(k) for k in ("top", "heart", "base")):
        item["pyramid"] = pyramid
    return item


def _row_to_aromabox(r: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": r["id"],
        "uid": int(r["uid"]) if (r["uid"] and str(r["uid"]).isdigit()) else r["uid"],
        "name": r["name"],
        "category": r["category"] or "box",
        "gender": r["gender"],
        "genderLabel": r["gender_label"],
        "badge": r["badge"],
        "image": r["image"],
        "cdnImage": r["cdn_image"],
        "objectPosition": r["object_position"] or "center center",
        "prices": json.loads(r["prices_json"] or "{}"),
        "oldPrices": json.loads(r["old_prices_json"] or "{}"),
        "shortSubtitle": r["short_subtitle"],
        "perfumes": json.loads(r["perfumes_json"] or "[]"),
        "fullDescription": r["full_description"],
        "sortOrder": r["sort_order"],
        "isActive": bool(r["is_active"]),
    }


def _row_to_secret_box(r: sqlite3.Row) -> Dict[str, Any]:
    return {
        "id": r["id"],
        "uid": int(r["uid"]) if (r["uid"] and str(r["uid"]).isdigit()) else r["uid"],
        "level": r["level"],
        "name": r["name"],
        "title": r["title"] or r["name"],
        "subtitle": r["subtitle"],
        "price": r["price"],
        "oldPrice": r["old_price"],
        "image": r["image"],
        "cdnImage": r["cdn_image"],
        "objectPosition": r["object_position"] or "center center",
        "description": r["description"],
        "badge": r["badge"],
        "features": json.loads(r["features_json"] or "[]"),
        "isHit": bool(r["is_hit"]),
        "sortOrder": r["sort_order"],
        "isActive": bool(r["is_active"]),
    }


# ==============================================================================
# CATALOG CRUD
# ==============================================================================

def get_all_perfumes(active_only: bool = False) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    q = "SELECT * FROM perfumes"
    if active_only:
        q += " WHERE is_active = 1"
    q += " ORDER BY sort_order ASC, rowid ASC"
    cur.execute(q)
    rows = [_row_to_perfume(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_perfume(perfume_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM perfumes WHERE id = ?", (perfume_id,))
    row = cur.fetchone()
    conn.close()
    return _row_to_perfume(row) if row else None


def upsert_perfume(item: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cur = conn.cursor()
    now = time.time()

    pid = item.get("id") or f"vp-{secrets.token_hex(6)}"
    item["id"] = pid
    metrics = dict(item.get("metrics") or {})
    season = (item.get("season") or metrics.get("season") or "Круглый год").strip()
    preset = SEASON_PRESETS.get(season, SEASON_PRESETS["Круглый год"])
    season_icon = item.get("seasonIcon") or metrics.get("seasonIcon") or preset["icon"]
    time_of_day = item.get("timeOfDay") or metrics.get("timeOfDay") or preset["time"]
    time_icon = item.get("timeIcon") or metrics.get("timeIcon") or preset["timeIcon"]
    mood = item.get("mood") or metrics.get("vibe") or "Изысканный нишевый стиль"
    longevity = item.get("longevity") or metrics.get("longevity") or "До 12 часов"
    sillage = item.get("sillage") or metrics.get("sillage") or "Выразительный"

    metrics.update({
        "season": season,
        "seasonIcon": season_icon,
        "timeOfDay": time_of_day,
        "timeIcon": time_icon,
        "vibe": mood,
        "longevity": longevity,
        "sillage": sillage,
    })

    # Clean prices
    raw_prices = item.get("prices") or {}
    clean_prices: Dict[str, int] = {}
    for k, v in raw_prices.items():
        if v is None or v == "":
            continue
        try:
            num = int(round(float(v)))
            if num > 0:
                clean_prices[str(k)] = num
        except Exception:
            pass
    if not clean_prices:
        clean_prices = {"3ml": 500, "5ml": 800, "10ml": 1500}

    cur.execute("SELECT sort_order FROM perfumes WHERE id = ?", (pid,))
    existing = cur.fetchone()
    if existing is not None:
        sort_order = int(item.get("sortOrder", existing["sort_order"]))
    else:
        cur.execute("SELECT COALESCE(MAX(sort_order), 0) + 1 AS nxt FROM perfumes")
        sort_order = int(item.get("sortOrder", cur.fetchone()["nxt"]))

    pyramid = _normalize_pyramid(item.get("pyramid"))

    cur.execute(
        """
        INSERT INTO perfumes (
            id, uid, brand, name, full_title, gender, category, notes_family,
            image, object_position, badge, subtitle, bottle_size, description,
            season, season_icon, time_of_day, time_icon, mood, longevity, sillage,
            prices_json, pyramid_json, metrics_json, url, sort_order, is_active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            uid=excluded.uid, brand=excluded.brand, name=excluded.name, full_title=excluded.full_title,
            gender=excluded.gender, category=excluded.category, notes_family=excluded.notes_family,
            image=excluded.image, object_position=excluded.object_position, badge=excluded.badge,
            subtitle=excluded.subtitle, bottle_size=excluded.bottle_size, description=excluded.description,
            season=excluded.season, season_icon=excluded.season_icon, time_of_day=excluded.time_of_day,
            time_icon=excluded.time_icon, mood=excluded.mood, longevity=excluded.longevity,
            sillage=excluded.sillage, prices_json=excluded.prices_json, pyramid_json=excluded.pyramid_json,
            metrics_json=excluded.metrics_json, url=excluded.url, sort_order=excluded.sort_order,
            is_active=excluded.is_active, updated_at=excluded.updated_at
        """,
        (
            pid,
            str(item.get("uid") or pid),
            item.get("brand", ""),
            item.get("name", ""),
            item.get("fullTitle") or f"{item.get('brand', '')} {item.get('name', '')}".strip(),
            item.get("gender", "unisex"),
            item.get("category", "perfume"),
            item.get("notesFamily", ""),
            item.get("image", ""),
            item.get("objectPosition", "center center"),
            item.get("badge", ""),
            item.get("subtitle", ""),
            item.get("bottleSize", ""),
            item.get("description", ""),
            season,
            season_icon,
            time_of_day,
            time_icon,
            mood,
            longevity,
            sillage,
            json.dumps(clean_prices, ensure_ascii=False),
            json.dumps(pyramid, ensure_ascii=False),
            json.dumps(metrics, ensure_ascii=False),
            item.get("url", ""),
            sort_order,
            1 if item.get("isActive", True) else 0,
            now,
        ),
    )
    conn.commit()
    conn.close()
    return get_perfume(pid) or item


def delete_perfume(perfume_id: str) -> bool:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM perfumes WHERE id = ?", (perfume_id,))
    ok = cur.rowcount > 0
    conn.commit()
    conn.close()
    return ok


def get_all_aromaboxes(active_only: bool = False) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    q = "SELECT * FROM aromaboxes"
    if active_only:
        q += " WHERE is_active = 1"
    q += " ORDER BY sort_order ASC, rowid ASC"
    cur.execute(q)
    rows = [_row_to_aromabox(r) for r in cur.fetchall()]
    conn.close()
    return rows


def get_aromabox(box_id: str) -> Optional[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM aromaboxes WHERE id = ?", (box_id,))
    r = cur.fetchone()
    conn.close()
    return _row_to_aromabox(r) if r else None


def upsert_aromabox(box: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cur = conn.cursor()
    now = time.time()
    bid = box.get("id") or f"box-{secrets.token_hex(5)}"
    box["id"] = bid

    def _clean_pmap(raw):
        out = {}
        for k, v in (raw or {}).items():
            if v is None or v == "":
                continue
            try:
                num = int(round(float(v)))
                if num > 0:
                    out[str(k)] = num
            except Exception:
                pass
        return out

    prices = _clean_pmap(box.get("prices")) or {"3ml": 3200, "5ml": 5200, "10ml": 9800}
    old_prices = _clean_pmap(box.get("oldPrices"))

    gender = box.get("gender", "unisex")
    gmap = {"women": "Для нее", "men": "Для него", "unisex": "Унисекс"}
    gender_label = box.get("genderLabel") or gmap.get(gender, "Унисекс")

    cur.execute("SELECT sort_order FROM aromaboxes WHERE id = ?", (bid,))
    ex = cur.fetchone()
    if ex is not None:
        sort_order = int(box.get("sortOrder", ex["sort_order"]))
    else:
        cur.execute("SELECT COALESCE(MAX(sort_order), 0) + 1 AS nxt FROM aromaboxes")
        sort_order = int(box.get("sortOrder", cur.fetchone()["nxt"]))

    cur.execute(
        """
        INSERT INTO aromaboxes (
            id, uid, name, category, gender, gender_label, badge,
            image, cdn_image, object_position, prices_json, old_prices_json,
            short_subtitle, perfumes_json, full_description, sort_order, is_active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            uid=excluded.uid, name=excluded.name, category=excluded.category,
            gender=excluded.gender, gender_label=excluded.gender_label, badge=excluded.badge,
            image=excluded.image, cdn_image=excluded.cdn_image, object_position=excluded.object_position,
            prices_json=excluded.prices_json, old_prices_json=excluded.old_prices_json,
            short_subtitle=excluded.short_subtitle, perfumes_json=excluded.perfumes_json,
            full_description=excluded.full_description, sort_order=excluded.sort_order,
            is_active=excluded.is_active, updated_at=excluded.updated_at
        """,
        (
            bid,
            str(box.get("uid") or bid),
            box.get("name", ""),
            "box",
            gender,
            gender_label,
            box.get("badge", ""),
            box.get("image", ""),
            box.get("cdnImage") or box.get("image", ""),
            box.get("objectPosition", "center center"),
            json.dumps(prices, ensure_ascii=False),
            json.dumps(old_prices, ensure_ascii=False),
            box.get("shortSubtitle", ""),
            json.dumps(box.get("perfumes") or [], ensure_ascii=False),
            box.get("fullDescription", ""),
            sort_order,
            1 if box.get("isActive", True) else 0,
            now,
        ),
    )
    conn.commit()
    conn.close()
    return get_aromabox(bid) or box


def delete_aromabox(box_id: str) -> bool:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("DELETE FROM aromaboxes WHERE id = ?", (box_id,))
    ok = cur.rowcount > 0
    conn.commit()
    conn.close()
    return ok


def get_all_secret_boxes(active_only: bool = False) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    q = "SELECT * FROM secret_boxes"
    if active_only:
        q += " WHERE is_active = 1"
    q += " ORDER BY sort_order ASC, rowid ASC"
    cur.execute(q)
    rows = [_row_to_secret_box(r) for r in cur.fetchall()]
    conn.close()
    return rows


def upsert_secret_box(sb: Dict[str, Any]) -> Dict[str, Any]:
    conn = get_connection()
    cur = conn.cursor()
    now = time.time()
    sbid = sb.get("id") or f"secret-{secrets.token_hex(4)}"
    sb["id"] = sbid

    cur.execute("SELECT sort_order FROM secret_boxes WHERE id = ?", (sbid,))
    ex = cur.fetchone()
    sort_order = int(sb.get("sortOrder", ex["sort_order"] if ex else 10))

    cur.execute(
        """
        INSERT INTO secret_boxes (
            id, uid, level, name, title, subtitle, price, old_price,
            image, cdn_image, object_position, description, badge,
            features_json, is_hit, sort_order, is_active, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(id) DO UPDATE SET
            level=excluded.level, name=excluded.name, title=excluded.title,
            subtitle=excluded.subtitle, price=excluded.price, old_price=excluded.old_price,
            image=excluded.image, cdn_image=excluded.cdn_image, object_position=excluded.object_position,
            description=excluded.description, badge=excluded.badge,
            features_json=excluded.features_json, is_hit=excluded.is_hit,
            sort_order=excluded.sort_order, is_active=excluded.is_active, updated_at=excluded.updated_at
        """,
        (
            sbid,
            str(sb.get("uid") or sbid),
            sb.get("level", ""),
            sb.get("name") or f"Секретный бокс «{sb.get('level', '')}»",
            sb.get("title") or sb.get("name", ""),
            sb.get("subtitle", ""),
            max(100, int(round(float(sb.get("price", 4900))))),
            max(0, int(round(float(sb.get("oldPrice", 0))))),
            sb.get("image", ""),
            sb.get("cdnImage") or sb.get("image", ""),
            sb.get("objectPosition", "center center"),
            sb.get("description", ""),
            sb.get("badge", ""),
            json.dumps(sb.get("features") or [], ensure_ascii=False),
            1 if sb.get("isHit") else 0,
            sort_order,
            1 if sb.get("isActive", True) else 0,
            now,
        ),
    )
    conn.commit()
    conn.close()
    items = [x for x in get_all_secret_boxes() if x["id"] == sbid]
    return items[0] if items else sb


# ==============================================================================
# BULK PERCENTAGE PRICE ENGINE + SNAPSHOT ROLLBACK
# ==============================================================================

def _round_price(raw_val: float, step: int) -> int:
    if step <= 1:
        return max(50, int(round(raw_val)))
    return max(50, int(round(raw_val / step) * step))


def bulk_adjust_prices(
    scope: str,
    percent: float,
    round_step: int = 10,
    gender_filter: str = "all",
    season_filter: str = "all",
    brand_filter: str = "",
    apply_to_old_prices: bool = False,
    dry_run: bool = True,
    operator_role: str = "owner",
    operator_name: str = "Владимир (Владелец)",
) -> Dict[str, Any]:
    """
    Preview or apply +% / -% price adjustments cleanly with automatic Snapshot saving.
    """
    multiplier = 1.0 + (float(percent) / 100.0)
    if multiplier <= 0.05:
        raise ValueError("Скидка не может превышать 95%")

    conn = get_connection()
    cur = conn.cursor()

    include_perfumes = scope in ("all", "perfumes")
    include_boxes = scope in ("all", "aromaboxes")
    include_secrets = scope in ("all", "secret_boxes")

    previews: List[Dict[str, Any]] = []
    affected_perfumes = 0
    affected_boxes = 0
    affected_secrets = 0

    snapshot_data: Dict[str, Any] = {"perfumes": {}, "aromaboxes": {}, "secret_boxes": {}}
    brand_q = (brand_filter or "").strip().lower()

    perfumes_to_update: List[Tuple[str, Dict[str, int]]] = []
    if include_perfumes:
        cur.execute("SELECT id, brand, name, gender, season, prices_json FROM perfumes ORDER BY sort_order ASC")
        for r in cur.fetchall():
            if gender_filter != "all" and r["gender"] != gender_filter:
                continue
            if season_filter != "all" and r["season"] != season_filter:
                continue
            if brand_q and brand_q not in (r["brand"] or "").lower() and brand_q not in (r["name"] or "").lower():
                continue
            old_prices = json.loads(r["prices_json"] or "{}")
            if not old_prices:
                continue
            snapshot_data["perfumes"][r["id"]] = old_prices
            new_prices = {k: _round_price(v * multiplier, round_step) for k, v in old_prices.items()}
            perfumes_to_update.append((r["id"], new_prices))
            affected_perfumes += 1
            if len(previews) < 20:
                first_k = next(iter(old_prices.keys()))
                previews.append({
                    "id": r["id"],
                    "kind": "Аромат",
                    "title": f"{r['brand']} — {r['name']}".strip(" —"),
                    "sampleKey": first_k,
                    "oldPrice": old_prices[first_k],
                    "newPrice": new_prices[first_k],
                })

    boxes_to_update: List[Tuple[str, Dict[str, int], Dict[str, int]]] = []
    if include_boxes:
        cur.execute("SELECT id, name, gender, prices_json, old_prices_json FROM aromaboxes ORDER BY sort_order ASC")
        for r in cur.fetchall():
            if gender_filter != "all" and r["gender"] != gender_filter:
                continue
            old_prices = json.loads(r["prices_json"] or "{}")
            old_old = json.loads(r["old_prices_json"] or "{}")
            snapshot_data["aromaboxes"][r["id"]] = {"prices": old_prices, "oldPrices": old_old}
            new_prices = {k: _round_price(v * multiplier, round_step) for k, v in old_prices.items()}
            new_old = {k: _round_price(v * multiplier, round_step) for k, v in old_old.items()} if apply_to_old_prices else old_old
            boxes_to_update.append((r["id"], new_prices, new_old))
            affected_boxes += 1
            if len(previews) < 20 and old_prices:
                first_k = next(iter(old_prices.keys()))
                previews.append({
                    "id": r["id"],
                    "kind": "Аромабокс",
                    "title": r["name"],
                    "sampleKey": first_k,
                    "oldPrice": old_prices[first_k],
                    "newPrice": new_prices[first_k],
                })

    secrets_to_update: List[Tuple[str, int, int]] = []
    if include_secrets:
        cur.execute("SELECT id, name, price, old_price FROM secret_boxes ORDER BY sort_order ASC")
        for r in cur.fetchall():
            old_p = int(r["price"])
            old_op = int(r["old_price"] or 0)
            snapshot_data["secret_boxes"][r["id"]] = {"price": old_p, "oldPrice": old_op}
            new_p = _round_price(old_p * multiplier, round_step)
            new_op = _round_price(old_op * multiplier, round_step) if (apply_to_old_prices and old_op > 0) else old_op
            secrets_to_update.append((r["id"], new_p, new_op))
            affected_secrets += 1
            if len(previews) < 20:
                previews.append({
                    "id": r["id"],
                    "kind": "Secret Box",
                    "title": r["name"],
                    "sampleKey": "бокс",
                    "oldPrice": old_p,
                    "newPrice": new_p,
                })

    snapshot_id = None
    total_affected = affected_perfumes + affected_boxes + affected_secrets

    if not dry_run and total_affected > 0:
        now = time.time()
        sign_str = f"+{percent}%" if percent > 0 else f"{percent}%"
        summary = f"Массовая переоценка {sign_str} (затронуто позиций: {total_affected})"
        created_at = time.strftime("%Y-%m-%d %H:%M:%S")

        cur.execute(
            """
            INSERT INTO price_snapshots (summary, operator_role, operator_name, scope, percent, snapshot_json, restored, created_at)
            VALUES (?, ?, ?, ?, ?, ?, 0, ?)
            """,
            (summary, operator_role, operator_name, scope, float(percent), json.dumps(snapshot_data, ensure_ascii=False), created_at),
        )
        snapshot_id = cur.lastrowid

        for pid, new_p in perfumes_to_update:
            cur.execute("UPDATE perfumes SET prices_json = ?, updated_at = ? WHERE id = ?", (json.dumps(new_p, ensure_ascii=False), now, pid))
        for bid, new_p, new_old in boxes_to_update:
            cur.execute(
                "UPDATE aromaboxes SET prices_json = ?, old_prices_json = ?, updated_at = ? WHERE id = ?",
                (json.dumps(new_p, ensure_ascii=False), json.dumps(new_old, ensure_ascii=False), now, bid),
            )
        for sbid, new_p, new_op in secrets_to_update:
            cur.execute(
                "UPDATE secret_boxes SET price = ?, old_price = ?, updated_at = ? WHERE id = ?",
                (new_p, new_op, now, sbid),
            )
        conn.commit()

    conn.close()
    return {
        "dryRun": dry_run,
        "percent": float(percent),
        "roundStep": int(round_step),
        "affectedPerfumes": affected_perfumes,
        "affectedBoxes": affected_boxes,
        "affectedSecrets": affected_secrets,
        "totalAffected": total_affected,
        "previews": previews,
        "snapshotId": snapshot_id,
    }


def get_price_snapshots(limit: int = 10) -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT id, summary, operator_role, operator_name, scope, percent, restored, created_at FROM price_snapshots ORDER BY id DESC LIMIT ?",
        (limit,),
    )
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def rollback_price_snapshot(snapshot_id: int) -> Dict[str, Any]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT * FROM price_snapshots WHERE id = ?", (snapshot_id,))
    row = cur.fetchone()
    if not row:
        conn.close()
        raise ValueError("Снимок цен не найден")
    snap = json.loads(row["snapshot_json"] or "{}")
    now = time.time()
    restored_count = 0

    for pid, pmap in snap.get("perfumes", {}).items():
        cur.execute("UPDATE perfumes SET prices_json = ?, updated_at = ? WHERE id = ?", (json.dumps(pmap, ensure_ascii=False), now, pid))
        restored_count += cur.rowcount

    for bid, bobj in snap.get("aromaboxes", {}).items():
        cur.execute(
            "UPDATE aromaboxes SET prices_json = ?, old_prices_json = ?, updated_at = ? WHERE id = ?",
            (json.dumps(bobj.get("prices", {}), ensure_ascii=False), json.dumps(bobj.get("oldPrices", {}), ensure_ascii=False), now, bid),
        )
        restored_count += cur.rowcount

    for sbid, sobj in snap.get("secret_boxes", {}).items():
        cur.execute(
            "UPDATE secret_boxes SET price = ?, old_price = ?, updated_at = ? WHERE id = ?",
            (int(sobj.get("price", 4900)), int(sobj.get("oldPrice", 0)), now, sbid),
        )
        restored_count += cur.rowcount

    cur.execute("UPDATE price_snapshots SET restored = 1 WHERE id = ?", (snapshot_id,))
    conn.commit()
    conn.close()
    return {"snapshotId": snapshot_id, "restoredCount": restored_count, "summary": row["summary"]}


# ==============================================================================
# SETTINGS, SECURITY & SESSIONS
# ==============================================================================

def get_setting(key: str, default: Optional[str] = None) -> Optional[str]:
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT value FROM site_settings WHERE key = ?", (key,))
    row = cur.fetchone()
    conn.close()
    return row["value"] if row else default


def set_setting(key: str, value: str):
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO site_settings (key, value, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at",
        (key, value, time.time()),
    )
    conn.commit()
    conn.close()


def _deep_merge(base: Dict[str, Any], patch: Dict[str, Any]) -> Dict[str, Any]:
    out = dict(base)
    for k, v in (patch or {}).items():
        if isinstance(v, dict) and isinstance(out.get(k), dict):
            out[k] = _deep_merge(out[k], v)
        else:
            out[k] = v
    return out


def get_site_content() -> Dict[str, Any]:
    raw = get_setting("site_content")
    if not raw:
        return json.loads(json.dumps(DEFAULT_SITE_CONTENT))
    try:
        saved = json.loads(raw)
        return _deep_merge(DEFAULT_SITE_CONTENT, saved)
    except Exception:
        return json.loads(json.dumps(DEFAULT_SITE_CONTENT))


def save_site_content(content: Dict[str, Any]) -> Dict[str, Any]:
    merged = _deep_merge(DEFAULT_SITE_CONTENT, content)
    set_setting("site_content", json.dumps(merged, ensure_ascii=False))
    return merged


def get_gateway_tokens() -> Dict[str, str]:
    owner = get_setting("gateway_token_owner") or os.environ.get("VP_GATEWAY_TOKEN_OWNER", "")
    assistant = get_setting("gateway_token_assistant") or os.environ.get("VP_GATEWAY_TOKEN_ASSISTANT", "")
    return {"owner": owner, "assistant": assistant}


def resolve_gateway_token_role(candidate: str) -> Optional[Tuple[str, str]]:
    if not candidate or len(candidate) < 16:
        return None
    tokens = get_gateway_tokens()
    if tokens["owner"] and hmac.compare_digest(candidate, tokens["owner"]):
        return ("owner", "Владимир (Владелец)")
    if tokens["assistant"] and hmac.compare_digest(candidate, tokens["assistant"]):
        return ("assistant", "Помощница")
    return None


def rotate_gateway_token(role: str) -> str:
    if role == "owner":
        new_tok = "vp_vova_" + secrets.token_urlsafe(24)
        set_setting("gateway_token_owner", new_tok)
    elif role == "assistant":
        new_tok = "vp_help_" + secrets.token_urlsafe(24)
        set_setting("gateway_token_assistant", new_tok)
    else:
        raise ValueError("Неизвестная роль токена")
    # Invalidate sessions bound to rotated role
    conn = get_connection()
    conn.execute("DELETE FROM admin_sessions WHERE operator_role = ?", (role,))
    conn.commit()
    conn.close()
    return new_tok


def verify_admin_password(password: str) -> bool:
    stored = get_setting("admin_password_hash")
    if not stored:
        return False
    return verify_password(password, stored)


def update_admin_password(new_password: str):
    set_setting("admin_password_hash", hash_password(new_password))


# --- Sessions ---
def create_admin_session(operator_role: str, operator_name: str, ip: str = "", user_agent: str = "", ttl_seconds: int = 43200) -> str:
    raw_token = secrets.token_urlsafe(32)
    thash = hash_token(raw_token)
    now = time.time()
    conn = get_connection()
    conn.execute("DELETE FROM admin_sessions WHERE expires_at < ?", (now,))
    conn.execute(
        """
        INSERT INTO admin_sessions (token_hash, operator_role, operator_name, ip, user_agent, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        """,
        (thash, operator_role, operator_name, ip, user_agent[:180], now + ttl_seconds, now),
    )
    conn.commit()
    conn.close()
    return raw_token


def get_admin_session(raw_token: str) -> Optional[Dict[str, Any]]:
    if not raw_token or len(raw_token) < 20:
        return None
    thash = hash_token(raw_token)
    now = time.time()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "SELECT operator_role, operator_name, ip, expires_at, created_at FROM admin_sessions WHERE token_hash = ?",
        (thash,),
    )
    row = cur.fetchone()
    if not row:
        conn.close()
        return None
    if float(row["expires_at"]) < now:
        conn.execute("DELETE FROM admin_sessions WHERE token_hash = ?", (thash,))
        conn.commit()
        conn.close()
        return None
    conn.close()
    return dict(row)


def revoke_admin_session(raw_token: str):
    if not raw_token:
        return
    conn = get_connection()
    conn.execute("DELETE FROM admin_sessions WHERE token_hash = ?", (hash_token(raw_token),))
    conn.commit()
    conn.close()


def revoke_all_sessions():
    conn = get_connection()
    conn.execute("DELETE FROM admin_sessions")
    conn.commit()
    conn.close()


# --- Persistent Rate Limits ---
def check_rate_limit(key: str) -> Tuple[bool, int]:
    """Returns (is_locked, remaining_seconds)."""
    now = time.time()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT fails, lockout_until FROM rate_limits WHERE key = ?", (key,))
    row = cur.fetchone()
    if not row:
        conn.close()
        return False, 0
    if row["lockout_until"] > now:
        conn.close()
        return True, max(1, int(row["lockout_until"] - now))
    if row["lockout_until"] > 0 and row["lockout_until"] <= now:
        conn.execute("DELETE FROM rate_limits WHERE key = ?", (key,))
        conn.commit()
    conn.close()
    return False, 0


def record_rate_limit_fail(key: str, max_fails: int, lockout_minutes: int) -> Tuple[int, int]:
    """Returns (current_fails, lockout_seconds)."""
    now = time.time()
    conn = get_connection()
    cur = conn.cursor()
    cur.execute("SELECT fails, updated_at FROM rate_limits WHERE key = ?", (key,))
    row = cur.fetchone()
    if row and (now - float(row["updated_at"])) < (lockout_minutes * 60 + 300):
        fails = int(row["fails"]) + 1
    else:
        fails = 1

    lockout_until = 0.0
    lock_sec = 0
    if fails >= max_fails:
        lock_sec = lockout_minutes * 60
        lockout_until = now + lock_sec

    cur.execute(
        """
        INSERT INTO rate_limits (key, fails, lockout_until, updated_at)
        VALUES (?, ?, ?, ?)
        ON CONFLICT(key) DO UPDATE SET fails=excluded.fails, lockout_until=excluded.lockout_until, updated_at=excluded.updated_at
        """,
        (key, fails, lockout_until, now),
    )
    conn.commit()
    conn.close()
    return fails, lock_sec


def clear_rate_limit(key: str):
    conn = get_connection()
    conn.execute("DELETE FROM rate_limits WHERE key = ?", (key,))
    conn.commit()
    conn.close()


# ==============================================================================
# AUDIT LOG & BACKUP / EXPORT
# ==============================================================================

def add_audit_log(
    operator_role: str,
    operator_name: str,
    action: str,
    summary: str,
    entity_type: str = "",
    entity_id: str = "",
    details: Optional[Dict[str, Any]] = None,
    ip: str = "",
):
    conn = get_connection()
    cur = conn.cursor()
    created_at = time.strftime("%Y-%m-%d %H:%M:%S")
    cur.execute(
        """
        INSERT INTO audit_logs (operator_role, operator_name, action, entity_type, entity_id, summary, details_json, ip, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        """,
        (
            operator_role,
            operator_name,
            action,
            entity_type,
            entity_id,
            summary,
            json.dumps(details or {}, ensure_ascii=False),
            ip,
            created_at,
        ),
    )
    # Keep last 500 entries
    cur.execute("DELETE FROM audit_logs WHERE id NOT IN (SELECT id FROM audit_logs ORDER BY id DESC LIMIT 500)")
    conn.commit()
    conn.close()


def get_audit_logs(limit: int = 80, action_filter: str = "", operator_filter: str = "") -> List[Dict[str, Any]]:
    conn = get_connection()
    cur = conn.cursor()
    clauses = []
    params: List[Any] = []
    if action_filter and action_filter != "all":
        clauses.append("action = ?")
        params.append(action_filter)
    if operator_filter and operator_filter != "all":
        clauses.append("operator_role = ?")
        params.append(operator_filter)
    where_sql = f"WHERE {' AND '.join(clauses)}" if clauses else ""
    params.append(limit)
    cur.execute(f"SELECT * FROM audit_logs {where_sql} ORDER BY id DESC LIMIT ?", params)
    rows = [dict(r) for r in cur.fetchall()]
    conn.close()
    return rows


def export_full_backup() -> Dict[str, Any]:
    return {
        "schemaVersion": 1,
        "exportedAt": time.strftime("%Y-%m-%dT%H:%M:%S"),
        "perfumes": get_all_perfumes(),
        "aromaboxes": get_all_aromaboxes(),
        "secretBoxes": get_all_secret_boxes(),
        "siteContent": get_site_content(),
    }


def generate_perfumes_js_bundle() -> str:
    perfumes = get_all_perfumes(active_only=True)
    boxes = get_all_aromaboxes(active_only=True)
    secrets_list = get_all_secret_boxes(active_only=True)
    site_content = get_site_content()
    return (
        "/**\n * VOLODIUM PARFUM — Exported Catalog & Storefront Config\n */\n"
        + f"var PERFUMES_DATA = {json.dumps(perfumes, ensure_ascii=False, indent=2)};\n\n"
        + f"var AROMA_BOXES_DATA = {json.dumps(boxes, ensure_ascii=False, indent=2)};\n\n"
        + f"var SECRET_BOXES_DATA = {json.dumps(secrets_list, ensure_ascii=False, indent=2)};\n\n"
        + f"var VOLODIUM_SITE_CONTENT = {json.dumps(site_content, ensure_ascii=False, indent=2)};\n"
    )
