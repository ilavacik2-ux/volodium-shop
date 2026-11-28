#!/usr/bin/env python3
"""
Sync missing products (perfumes & aromaboxes) from the Tilda store (volodiumparfum.ru)
into volodium_database.db and regenerate assets/data/perfumes.js.

Usage:
    ./venv/bin/python scripts/sync_tilda_catalog.py [--dry-run]
"""

import argparse
import html as html_lib
import json
import os
import re
import sqlite3
import sys
import time
import urllib.parse
import urllib.request
from typing import Any, Dict, List, Optional, Tuple

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
sys.path.insert(0, BASE_DIR)

import database as db  # noqa: E402

SITEMAP_PRODUCTS_URL = "https://volodiumparfum.ru/sitemap-store-part1.xml"
SITEMAP_PARTS_URL = "https://volodiumparfum.ru/sitemap-store-parts.xml"
UPLOADS_PERFUMES_DIR = os.path.join(BASE_DIR, "assets", "uploads", "perfumes")
UPLOADS_BOXES_DIR = os.path.join(BASE_DIR, "assets", "img", "aromaboxes")

PARTUID_WOMEN = "951160952172"
PARTUID_MEN = "699163484252"
PARTUID_UNISEX = "645533174463"
PARTUID_AROMABOX = "187295189212"
PARTUID_AROMABOX_WOMEN = "850505087423"
PARTUID_AROMABOX_MEN = "800018559953"
PARTUID_AROMABOX_SECRET = "868149138433"

BOX_PARTUIDS = {
    PARTUID_AROMABOX,
    PARTUID_AROMABOX_WOMEN,
    PARTUID_AROMABOX_MEN,
    PARTUID_AROMABOX_SECRET,
}

# Known multi-word brands that might not yet be in the DB
EXTRA_KNOWN_BRANDS = [
    "French Avenue",
    "Lattafa Perfumes",
    "Divina Terra",
    "The Gate Fragrances",
    "Mes Bisous",
    "Andreas Friedrich",
    "Rubeus Milano",
    "Jo Malone London",
    "Laurent Mazzone Parfums",
    "Mémoires d'Amour",
    "Memoires d'Amour",
    "Matiere Premiere",
    "Matière Première",
    "Max Philip",
]


def fetch_url(url: str, timeout: int = 20) -> bytes:
    safe_url = url.replace("http://", "https://", 1)
    req = urllib.request.Request(
        safe_url,
        headers={
            "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
            "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
    )
    with urllib.request.urlopen(req, timeout=timeout) as resp:
        return resp.read()


def clean_html_text(raw: str) -> str:
    if not raw:
        return ""
    text = re.sub(r"<br\s*/?>", "\n", raw, flags=re.I)
    text = re.sub(r"</p\s*>", "\n\n", text, flags=re.I)
    text = re.sub(r"</li\s*>", "\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = html_lib.unescape(text)
    text = re.sub(r"\r\n?", "\n", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def extract_product_json(page_html: str, uid: str) -> Optional[Dict[str, Any]]:
    pattern = re.compile(r'\{\s*"uid"\s*:\s*' + re.escape(uid) + r'\b')
    m = pattern.search(page_html)
    if not m:
        pattern = re.compile(r'\{\s*"uid"\s*:\s*"' + re.escape(uid) + r'"')
        m = pattern.search(page_html)
    if not m:
        return None
    decoder = json.JSONDecoder()
    obj, _ = decoder.raw_decode(page_html[m.start():])
    return obj


def infer_notes_family(text: str) -> str:
    t = text.lower()
    if any(k in t for k in ("гурман", "ванил", "шоколад", "карамел", "вишн", "сладк", "кофе", "пралине", "бобы тонка")):
        return "gourmand"
    if any(k in t for k in ("цитрус", "бергамот", "лимон", "лайм", "морск", "акватич", "свеж", "грейпфрут", "озон", "мята")):
        return "fresh"
    if any(k in t for k in ("цветоч", "роза", "пион", "жасмин", "тубероз", "ландыш", "ирис", "флердоранж", "магноли")):
        return "floral"
    if any(k in t for k in ("восточ", "уд", "ладан", "амбр", "смол", "прян", "специ", "шафран", "бальзам", "табак")):
        return "oriental"
    return "woody"


def parse_pyramid_from_text(desc: str) -> Dict[str, List[str]]:
    pyramid: Dict[str, List[str]] = {"top": [], "heart": [], "base": []}
    for line in desc.splitlines():
        l = line.strip()
        low = l.lower()
        notes_part = ""
        target = None
        if low.startswith(("верхние ноты:", "верхняя нота:", "старт:")):
            target = "top"
            notes_part = l.split(":", 1)[1]
        elif low.startswith(("ноты сердца:", "средние ноты:", "сердце:")):
            target = "heart"
            notes_part = l.split(":", 1)[1]
        elif low.startswith(("базовые ноты:", "база:", "шлейф:")):
            target = "base"
            notes_part = l.split(":", 1)[1]
        if target and notes_part:
            items = [x.strip(" .") for x in re.split(r"[,;]", notes_part) if x.strip(" .")]
            pyramid[target].extend(items[:6])
    return pyramid


def split_brand_and_name(title: str, known_brands: List[str]) -> Tuple[str, str]:
    clean_title = re.sub(r"\s+", " ", title).strip()
    sorted_brands = sorted(set(known_brands), key=lambda b: len(b), reverse=True)
    low_title = clean_title.lower()
    for b in sorted_brands:
        if not b:
            continue
        bl = b.lower()
        if low_title.startswith(bl + " "):
            return b, clean_title[len(b):].strip(" -—:")
    parts = clean_title.split(" ", 1)
    if len(parts) == 2:
        return parts[0], parts[1]
    return "", clean_title


def download_image(img_url: str, dest_dir: str, file_stem: str, dry_run: bool = False) -> str:
    if not img_url:
        return ""
    os.makedirs(dest_dir, exist_ok=True)
    parsed = urllib.parse.urlparse(img_url)
    ext = os.path.splitext(parsed.path)[1].lower()
    if ext not in (".webp", ".png", ".jpg", ".jpeg"):
        ext = ".jpg"
    filename = f"{file_stem}{ext}"
    abs_path = os.path.join(dest_dir, filename)
    rel_path = os.path.relpath(abs_path, BASE_DIR).replace("\\", "/")
    if dry_run:
        return rel_path
    if not os.path.exists(abs_path):
        data = fetch_url(img_url, timeout=25)
        if "perfumes" in dest_dir:
            try:
                from scripts.normalize_perfume_images import normalize_image_bytes
                data = normalize_image_bytes(data, ext)
            except Exception:
                pass
        with open(abs_path, "wb") as f:
            f.write(data)
    return rel_path


def parse_prices(obj: Dict[str, Any]) -> Dict[str, int]:
    prices: Dict[str, int] = {}
    editions = obj.get("editions") or []
    for ed in editions:
        vol_raw = str(ed.get("Объем") or ed.get("объем") or ed.get("Volume") or "").strip()
        price_raw = str(ed.get("price") or "").replace(" ", "").replace("\xa0", "").replace(",", ".")
        if not price_raw:
            continue
        try:
            price_val = int(round(float(price_raw)))
        except ValueError:
            continue
        if price_val <= 0:
            continue
        if vol_raw:
            vol_digits = re.sub(r"[^\d]", "", vol_raw)
            key = f"{vol_digits}ml" if vol_digits else vol_raw
        else:
            key = "default"
        prices[key] = price_val

    if not prices and obj.get("price"):
        try:
            p = int(round(float(str(obj["price"]).replace(" ", "").replace(",", "."))))
            if p > 0:
                prices["5ml"] = p
        except ValueError:
            pass
    return prices


def main():
    parser = argparse.ArgumentParser(description="Sync missing Tilda products to local DB")
    parser.add_argument("--dry-run", action="store_true", help="Do not write to DB or download images")
    args = parser.parse_args()

    print(f"Fetching Tilda sitemap: {SITEMAP_PRODUCTS_URL}")
    sitemap_xml = fetch_url(SITEMAP_PRODUCTS_URL).decode("utf-8", "ignore")
    urls = re.findall(r"<loc>(http[^<]+)</loc>", sitemap_xml)
    print(f"Found {len(urls)} products in Tilda sitemap.")

    with db.get_db() as conn:
        existing_uids = set()
        for tbl in ("perfumes", "aromaboxes", "secret_boxes"):
            for (uid,) in conn.execute(f"SELECT uid FROM {tbl}"):
                if uid:
                    existing_uids.add(str(uid))
        known_brands = [
            row[0] for row in conn.execute("SELECT DISTINCT brand FROM perfumes WHERE brand != ''")
        ] + EXTRA_KNOWN_BRANDS

    missing: List[Tuple[str, str]] = []
    for u in urls:
        m = re.search(r"/tproduct/(\d+)-", u)
        if m:
            uid = m.group(1)
            if uid not in existing_uids:
                missing.append((uid, u))

    print(f"Missing products to import: {len(missing)}")
    if not missing:
        print("Everything is already in sync!")
        return

    added_perfumes = 0
    added_boxes = 0
    failed: List[str] = []

    for idx, (uid, url) in enumerate(missing, start=1):
        print(f"[{idx}/{len(missing)}] Fetching {url} ...")
        try:
            page_html = fetch_url(url, timeout=25).decode("utf-8", "ignore")
            obj = extract_product_json(page_html, uid)
            if not obj:
                print(f"  WARN: Could not find product JSON for uid={uid}")
                failed.append(url)
                continue

            title = html_lib.unescape(str(obj.get("title") or "")).strip()
            descr = clean_html_text(str(obj.get("descr") or ""))
            partuids = {str(p) for p in (obj.get("partuids") or [])}
            prices = parse_prices(obj)
            gallery = obj.get("gallery") or []
            img_url = gallery[0].get("img", "") if gallery and isinstance(gallery[0], dict) else ""

            # Gender detection
            if PARTUID_WOMEN in partuids and PARTUID_MEN not in partuids and PARTUID_UNISEX not in partuids:
                gender = "women"
                gender_label = "Для нее"
            elif PARTUID_MEN in partuids and PARTUID_WOMEN not in partuids and PARTUID_UNISEX not in partuids:
                gender = "men"
                gender_label = "Для него"
            else:
                gender = "unisex"
                gender_label = "Унисекс"

            is_box = bool(partuids & BOX_PARTUIDS) or title.lower().startswith("аромабокс") or bool(set(prices.keys()) & {"53ml", "55ml", "510ml"})

            if is_box:
                slug = re.sub(r"[^a-zа-яё0-9]+", "-", title.lower()).strip("-")
                box_id = f"box-{slug}"
                rel_img = download_image(img_url, UPLOADS_BOXES_DIR, f"box-{uid}", dry_run=args.dry_run)
                box_item = {
                    "id": box_id,
                    "uid": uid,
                    "name": title,
                    "category": "box",
                    "gender": gender,
                    "genderLabel": gender_label,
                    "badge": "",
                    "image": rel_img or img_url,
                    "cdnImage": img_url,
                    "objectPosition": "center center",
                    "prices": prices,
                    "oldPrices": {},
                    "shortSubtitle": "",
                    "perfumes": [],
                    "fullDescription": descr,
                    "isActive": True,
                }
                if not args.dry_run:
                    db.upsert_aromabox(box_item)
                added_boxes += 1
                print(f"  + Aromabox: {title} ({prices})")
            else:
                brand, name = split_brand_and_name(title, known_brands)
                notes_family = infer_notes_family(f"{title} {descr}")
                pyramid = parse_pyramid_from_text(descr)
                rel_img = download_image(img_url, UPLOADS_PERFUMES_DIR, f"vp-{uid}", dry_run=args.dry_run)
                perfume_item: Dict[str, Any] = {
                    "id": f"vp-{uid}",
                    "uid": uid,
                    "brand": brand,
                    "name": name,
                    "fullTitle": title,
                    "gender": gender,
                    "category": "analog" if ("дюп" in descr.lower() or "аналог" in descr.lower()) else "perfume",
                    "notesFamily": notes_family,
                    "image": rel_img or img_url,
                    "objectPosition": "center center",
                    "badge": "",
                    "subtitle": "",
                    "bottleSize": "",
                    "description": descr,
                    "prices": prices,
                    "pyramid": pyramid,
                    "url": url,
                    "isActive": True,
                }
                life = db.infer_lifestyle_meta(perfume_item)
                perfume_item.update(life)
                if not args.dry_run:
                    db.upsert_perfume(perfume_item)
                added_perfumes += 1
                print(f"  + Perfume: [{brand}] {name} | gender={gender} | family={notes_family} | prices={prices}")

            time.sleep(0.15)
        except Exception as exc:
            print(f"  ERROR on {url}: {exc}")
            failed.append(url)

    if not args.dry_run and (added_perfumes > 0 or added_boxes > 0):
        print("Regenerating assets/data/perfumes.js ...")
        js_bundle = db.generate_perfumes_js_bundle()
        with open(db.PERFUMES_JS_PATH, "w", encoding="utf-8") as f:
            f.write(js_bundle)
        db.add_audit_log(
            "system",
            "tilda-sync",
            "SYNC",
            f"Синхронизация с Тильдой: +{added_perfumes} ароматов, +{added_boxes} аромабоксов",
        )

    print(f"\nDone! Added {added_perfumes} perfumes, {added_boxes} aromaboxes. Failed: {len(failed)}")
    if failed:
        print("Failed URLs:")
        for u in failed:
            print(" ", u)


if __name__ == "__main__":
    main()
