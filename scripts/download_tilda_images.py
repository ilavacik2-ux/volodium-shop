import os
import re
import sqlite3
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image
import io

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUTPUT_DIR = os.path.join(BASE_DIR, "assets/uploads/perfumes")
os.makedirs(OUTPUT_DIR, exist_ok=True)

with open(os.path.join(BASE_DIR, "assets/data/perfumes.js"), "r", encoding="utf-8") as f:
    text = f.read()

# Pattern to find id and image
pattern = r'\"id\":\s*\"([^\"]+)\"[^}]+?\"image\":\s*\"(https://static\.tildacdn\.com/[^\"]+)\"'
matches = re.findall(pattern, text)
print(f"Total Tilda images to download: {len(matches)}")

def download_and_optimize(item):
    perfume_id, url = item
    ext = "webp"
    target_path = os.path.join(OUTPUT_DIR, f"{perfume_id}.{ext}")
    if os.path.exists(target_path) and os.path.getsize(target_path) > 1000:
        return perfume_id, f"assets/uploads/perfumes/{perfume_id}.{ext}", "cached"
    
    try:
        req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"})
        with urllib.request.urlopen(req, timeout=15) as resp:
            data = resp.read()
        im = Image.open(io.BytesIO(data))
        if im.mode in ("RGBA", "LA") or (im.mode == "P" and "transparency" in im.info):
            im = im.convert("RGBA")
        else:
            im = im.convert("RGB")
        # Resize to max 1000x1000 with high quality
        im.thumbnail((1000, 1000), Image.Resampling.LANCZOS)
        im.save(target_path, "WEBP", quality=88, method=4)
        return perfume_id, f"assets/uploads/perfumes/{perfume_id}.{ext}", "downloaded"
    except Exception as e:
        return perfume_id, url, f"error: {e}"

results = {}
with ThreadPoolExecutor(max_workers=12) as executor:
    for pid, new_url, status in executor.map(download_and_optimize, matches):
        results[pid] = (new_url, status)

downloaded = sum(1 for _, s in results.values() if s == "downloaded")
cached = sum(1 for _, s in results.values() if s == "cached")
errors = sum(1 for _, s in results.values() if s.startswith("error"))
print(f"Done! Downloaded: {downloaded}, Cached: {cached}, Errors: {errors}")
