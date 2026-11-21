# Custom Scent Clean Editorial Split & Refined Guarantees Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Redesign the `#custom-scent` concierge section with a clean luxury studio portrait of Vladimir (removing the artificial background gift box with ribbon), replace the generic AI-template 01/02/03 pill bar with an elegant haute-parfumerie service bar, and ensure pixel-perfect responsive rendering on mobile and desktop without layout cutoff.

**Architecture:** Split `#custom-scent` into a dedicated 2-column editorial stage (`.lcc-editorial-split`) with clean studio imagery, followed by a dedicated guarantees band (`.haute-guarantees-bar`) placed below with proper margins and safe-area clearance for the mobile bottom nav.

**Tech Stack:** HTML5, Modern CSS (CSS Grid, Flexbox, Clamp, Backdrop-Filter), Pillow (Python image processing).

**Spec:** `docs/superpowers/specs/2026-11-22-custom-scent-clean-split-design.md`

## Global Constraints
- Preserve exact copy: "Не нашли свой аромат?", "Проверим наличие у поставщиков и поможем подобрать достойную альтернативу.", "Найти мой аромат", "Перейдите в Telegram — обсудим ваш запрос лично".
- Retain the Orto Parisi "О нас" section (`#about`) and bottom wine banner without modifications.
- Ensure 0 unclosed HTML tags and 100% balanced CSS curly braces.
- Maintain mobile clearance above `.mobile-bottom-nav` (minimum 75px bottom offset on screens <= 768px).

## Review Focus
1. Desktop wide screens (1440px+): Vladimir's photo is crisp, studio-lit, seamlessly blending into the warm ivory `#EAE3D9` background without the artificial 3D box.
2. Tablet / Laptop screens (992px–1200px): Two columns scale gracefully without text colliding with Vladimir's silhouette.
3. Mobile screens (375px–430px): Text card does not obscure Vladimir's face; portrait is displayed in natural aspect ratio.
4. Mobile guarantees: 3 rows render cleanly with icons, no horizontal scroll, and no clipping behind the fixed mobile bottom bar.
5. Cache-busting: Updated query string on `style.css` in `index.html`.

---

### Task 1: Clean Editorial Image Preparation

**Files:**
- Create: `assets/images/custom_scent_vladimir_clean_studio.jpg`
- Source: `assets/img/editorial/vladimir_box_present.jpg`

**Interfaces:**
- Produces: `assets/images/custom_scent_vladimir_clean_studio.jpg` (2400x1600 or 1920x1080 web-optimized luxury backdrop with Vladimir on right and warm matching studio tone on left).

- [ ] **Step 1: Write python script to compose clean studio image**
Create `assets/images/custom_scent_vladimir_clean_studio.jpg` by softly vignetting / blending Vladimir's authentic studio portrait onto a clean warm travertine/studio neutral canvas (`#E6DFD5` to `#DDD5C8`), removing any trace of the 3D gift box with ribbon.

- [ ] **Step 2: Run image generation script and verify output size and dimensions**
Run: `python3 -c "from PIL import Image; im = Image.open('assets/images/custom_scent_vladimir_clean_studio.jpg'); print(im.size)"`
Expected: Resolution around 2400x1500, clean gradient on the left half for text legibility.

---

### Task 2: HTML Structure Refactor for #custom-scent and Guarantees

**Files:**
- Modify: `index.html` (around lines 455-570)

**Interfaces:**
- Consumes: `assets/images/custom_scent_vladimir_clean_studio.jpg`, `assets/img/editorial/vladimir_box_present.jpg`
- Produces: Updated `#custom-scent` container and `.haute-guarantees-bar`.

- [ ] **Step 1: Refactor markup in `index.html`**
Replace `.luxury-concierge-card.is-fullbleed` inner markup with clean `.lcc-editorial-stage`:
- Left column: Headline with Didone typography, lead text, button, Telegram hint.
- Right column: Portrait stage.
- Directly under the stage (or in a dedicated strip): `.haute-guarantees-bar` with 3 items:
  - `Оригинальность` (Контроль происхождения и батч-кодов)
  - `Сроки сборки` (1–3 рабочих дня после оплаты)
  - `Личный подход` (Подбор с помощью эксперта)
Remove oversized generic `01`, `02`, `03` numbers in favor of elegant micro-headers.

- [ ] **Step 2: Verify HTML tag closure**
Run: `python3 -c "with open('index.html') as f: h = f.read(); assert h.count('<section') == h.count('</section>'); assert h.count('<div') == h.count('</div>'); print('HTML valid!')"`

---

### Task 3: CSS Refinement for Studio Split and Guarantees

**Files:**
- Modify: `assets/css/style.css`

**Interfaces:**
- Consumes: New class selectors (`.lcc-editorial-stage`, `.haute-guarantees-bar`, etc.)

- [ ] **Step 1: Add editorial desktop and mobile styles to `assets/css/style.css`**
- Set background of `#custom-scent` to clean studio backdrop.
- Style `.haute-guarantees-bar` with understated luxury aesthetic: light warm stone background (`#EBE3D7`), subtle 1px border `rgba(0,0,0,0.08)`, refined line icons, crisp typography.
- On mobile (<= 991px):
  - Stack cleanly: Headline & button on top, portrait in middle with rounded corners and no overlapping blur card.
  - Guarantees styled as clean horizontal rows with generous padding.
  - Safe area margin `margin-bottom: 5rem` to avoid overlap with `.mobile-bottom-nav`.

- [ ] **Step 2: Verify CSS braces count**
Run: `python3 -c "with open('assets/css/style.css') as f: c = f.read(); assert c.count('{') == c.count('}'); print('CSS Balanced!')"`

---

### Task 4: Cache-Busting and Visual Verification

**Files:**
- Modify: `index.html` (cache query string)

- [ ] **Step 1: Bump version in `index.html` link tag**
Update `assets/css/style.css?v=20261122_clean_editorial_v1`.

- [ ] **Step 2: Git status and diff verification**
Run `git diff` and verify changes meet all user constraints.
