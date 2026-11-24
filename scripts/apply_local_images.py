import os
import re
import sqlite3

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOADS_DIR = os.path.join(BASE_DIR, "assets/uploads/perfumes")
DB_PATH = os.path.join(BASE_DIR, "volodium_database.db")
JS_PATH = os.path.join(BASE_DIR, "assets/data/perfumes.js")

# 1. Update SQLite database
conn = sqlite3.connect(DB_PATH)
c = conn.cursor()

c.execute("SELECT id, image FROM perfumes")
rows = c.fetchall()
updated_db_count = 0
for pid, img in rows:
    webp_name = f"{pid}.webp"
    local_file = os.path.join(UPLOADS_DIR, webp_name)
    if os.path.exists(local_file) and os.path.getsize(local_file) > 1000:
        new_val = f"assets/uploads/perfumes/{webp_name}"
        if img != new_val:
            c.execute("UPDATE perfumes SET image = ? WHERE id = ?", (new_val, pid))
            updated_db_count += 1

conn.commit()
conn.close()
print(f"Updated {updated_db_count} records in SQLite database")

# 2. Update assets/data/perfumes.js
with open(JS_PATH, "r", encoding="utf-8") as f:
    js_text = f.read()

updated_js_count = 0
for f in os.listdir(UPLOADS_DIR):
    if f.endswith(".webp"):
        pid = f[:-5] # remove .webp
        # find perfume block and replace image
        # regex to match "id": "pid"[^}]+"image": "https://..."
        pattern = re.compile(r'(\"id\":\s*\"' + re.escape(pid) + r'\"[\s\S]*?\"image\":\s*\")https://static\.tildacdn\.com/[^\"]+(\")')
        if pattern.search(js_text):
            js_text = pattern.sub(r'\1assets/uploads/perfumes/' + f + r'\2', js_text)
            updated_js_count += 1

with open(JS_PATH, "w", encoding="utf-8") as f:
    f.write(js_text)

print(f"Updated {updated_js_count} image URLs in perfumes.js")
