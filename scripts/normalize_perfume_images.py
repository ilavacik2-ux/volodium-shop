#!/usr/bin/env python3
"""
Normalizes perfume bottle images so that every bottle fills ~88% of the square canvas
and is centered on pure white studio background.

This eliminates the issue where some bottles are tiny (55% height) while others are huge (95% height),
ensuring clean visual leveling in catalog cards and product modals.
"""

import os
import io
import sqlite3
from PIL import Image
import numpy as np

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "volodium_database.db")
TARGET_FILL = 0.88  # 88% of canvas width or height


def normalize_image_obj(im: Image.Image, target_fill: float = TARGET_FILL) -> Image.Image:
    """
    Normalizes a PIL Image by trimming excess white borders around the bottle
    and centering it on a square white canvas at target_fill scale.
    If the image does not have white background corners, returns the original image.
    """
    rgb_im = im.convert("RGB")
    arr = np.array(rgb_im)

    # Verify that the 4 corners are white (studio background)
    corners = [arr[0, 0], arr[0, -1], arr[-1, 0], arr[-1, -1]]
    if not all(np.all(c >= 240) for c in corners):
        return im

    non_bg = np.any(arr < 245, axis=-1)
    if not np.any(non_bg):
        return im

    rows = np.where(np.any(non_bg, axis=1))[0]
    cols = np.where(np.any(non_bg, axis=0))[0]

    # Safe margin of 3px around detected object
    r0 = max(0, rows[0] - 3)
    r1 = min(im.height, rows[-1] + 4)
    c0 = max(0, cols[0] - 3)
    c1 = min(im.width, cols[-1] + 4)

    crop = rgb_im.crop((c0, r0, c1, r1))
    bw, bh = crop.size
    if bw <= 10 or bh <= 10:
        return im

    target_size = max(1000, im.width, im.height)
    max_dim = int(round(target_size * target_fill))

    scale = min(max_dim / bh, max_dim / bw)
    nw = int(round(bw * scale))
    nh = int(round(bh * scale))

    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas = Image.new("RGB", (target_size, target_size), (255, 255, 255))
    px = (target_size - nw) // 2
    py = (target_size - nh) // 2
    canvas.paste(resized, (px, py))
    return canvas


def normalize_image_bytes(content: bytes, ext: str, target_fill: float = TARGET_FILL) -> bytes:
    """
    Normalizes raw image bytes and returns normalized image bytes in the same format.
    Used for uploaded images in server.py.
    """
    try:
        im = Image.open(io.BytesIO(content))
        normalized = normalize_image_obj(im, target_fill)
        out = io.BytesIO()
        ext_lower = ext.lower().lstrip(".")
        if ext_lower == "webp":
            normalized.save(out, "WEBP", quality=92, method=6)
        elif ext_lower in ("jpg", "jpeg"):
            normalized.save(out, "JPEG", quality=92, optimize=True)
        elif ext_lower == "png":
            normalized.save(out, "PNG", optimize=True)
        else:
            return content
        return out.getvalue()
    except Exception:
        return content


def process_all_perfumes():
    conn = sqlite3.connect(DB_PATH)
    cur = conn.cursor()
    rows = cur.execute(
        "SELECT id, name, category, image FROM perfumes WHERE category = 'perfume'"
    ).fetchall()
    conn.close()

    print(f"Starting normalization for {len(rows)} perfumes...")
    updated_count = 0
    skipped_count = 0

    for pid, name, cat, img_rel in rows:
        if not img_rel:
            skipped_count += 1
            continue
        abs_path = os.path.join(BASE_DIR, img_rel)
        if not os.path.exists(abs_path):
            skipped_count += 1
            continue

        try:
            im = Image.open(abs_path)
            orig_mode = im.mode
            norm_im = normalize_image_obj(im, TARGET_FILL)

            ext = os.path.splitext(abs_path)[1].lower()
            if ext == ".webp":
                norm_im.save(abs_path, "WEBP", quality=92, method=6)
            elif ext in (".jpg", ".jpeg"):
                norm_im.save(abs_path, "JPEG", quality=92, optimize=True)
            elif ext == ".png":
                norm_im.save(abs_path, "PNG", optimize=True)

            updated_count += 1
            if updated_count % 30 == 0 or updated_count == len(rows):
                print(f"Processed {updated_count}/{len(rows)}...")
        except Exception as e:
            print(f"Error processing {name} ({abs_path}): {e}")
            skipped_count += 1

    print(f"\nDone! Successfully normalized: {updated_count}, Skipped/Errors: {skipped_count}")


if __name__ == "__main__":
    process_all_perfumes()
