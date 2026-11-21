# Design Spec: Custom Scent Clean Editorial Split & Refined Guarantees

## Intent & The Why
Remove the artificial, cluttered AI composite background (the giant 3D gift box with black ribbon on stones) behind Vladimir in the `#custom-scent` concierge section. Vladimir is already holding the authentic Volodium box in high-res studio photography; having a second giant 3D box behind him looks artificial and cheapens the luxury aesthetic.
Additionally, replace the generic "AI-template" 01/02/03 pill bar with a refined, haute-parfumerie service guarantee bar that looks clean and elegant on desktop, and completely fixes the mobile layout where the card was overlapping Vladimir's face and the guarantees were cut off by the mobile bottom navigation bar.

The "О нас" (About Orto Parisi boutique) section remains intact as confirmed by the user.

## Approaches Considered
- **Approach 1 (Selected): Clean Editorial Studio Split + Dedicated Refined Guarantees Bar**:
  - Two-column editorial desktop split: Left column features Didone typography, description, burgundy pill button, and Telegram consultation note. Right column features Vladimir's authentic studio portrait with soft natural studio lighting seamlessly blending into the warm travertine/limestone neutral palette (`#EAE3D9` / `#F5EFEB`), completely free of any artificial 3D gift boxes.
  - Guarantees: Transition from chunky 01/02/03 pill card to an understated haute-parfumerie trust bar with delicate micro-typography (`Оригинальность · Сроки сборки · Персональный подход`), subtle hairline dividers, and refined line icons.
  - Mobile: Clean linear flow where the headline and action button sit comfortably above Vladimir's full portrait without floating blur boxes blocking his face, followed by the guarantee rows with ample bottom padding above the fixed navigation bar.
- **Approach 2 (Rejected)**: Architectural stone texture with inline bullets under the button. Rejected because the standalone refined guarantee bar gives more balanced breathing room and preserves the horizontal rhythm established by the client's design vision.

## Target Structure
- Files modified:
  - `index.html`: Update `#custom-scent` markup to clean editorial 2-column layout (`.lcc-editorial-split`), use clean portrait image of Vladimir, separate the 3 guarantees into an elegant `.haute-guarantees-bar`.
  - `assets/css/style.css`: Style `.lcc-editorial-split`, `.haute-guarantees-bar`, clean mobile layout with generous safe-area padding for `.mobile-bottom-nav`.
  - Generated asset: clean background composition of Vladimir on studio backdrop (`assets/images/custom_scent_vladimir_clean_studio.jpg`).
