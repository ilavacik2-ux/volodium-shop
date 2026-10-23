# Generate print-ready vector SVG and 300 DPI PNG of Vladimir Vacik's business card back with QR code
import os, sys
sys.path.append(os.path.dirname(__file__))
from qr_generator import QRCode

def generate_business_card():
    QRCode.init_gf256()
    qr = QRCode(version=3, error_correction='M')
    qr.setup_finders_and_timing()
    qr.encode_data("https://volodiumparfum.ru")
    
    # Extract QR path commands
    margin = 1
    total_size = qr.size + margin * 2
    mid = qr.size // 2
    logo_rad = 3 # 7x7 module zone in center for luxury monogram
    
    qr_paths = []
    for r in range(qr.size):
        for c in range(qr.size):
            if (mid - logo_rad <= r <= mid + logo_rad) and (mid - logo_rad <= c <= mid + logo_rad):
                continue
            if qr.modules[r][c]:
                qr_paths.append(f"M{c+margin},{r+margin}h1v1h-1z")
    qr_d = "".join(qr_paths)

    # 90mm x 50mm standard Russian business card
    svg_content = f'''<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 90 50" width="90mm" height="50mm">
  <defs>
    <style>
      @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&amp;family=Montserrat:wght@300;400;500;600&amp;display=swap');
      .bg {{ fill: #D2D1CC; }}
      .border {{ fill: none; stroke: #812020; stroke-width: 0.35; stroke-opacity: 0.45; }}
      .inner-border {{ fill: none; stroke: #812020; stroke-width: 0.15; stroke-opacity: 0.3; stroke-dasharray: 1, 0.6; }}
      .brand-title {{ font-family: 'Cormorant Garamond', Georgia, serif; font-size: 5.2px; font-weight: 700; fill: #812020; letter-spacing: 0.35em; text-anchor: middle; }}
      .brand-sub {{ font-family: 'Montserrat', sans-serif; font-size: 1.65px; font-weight: 500; fill: #111216; letter-spacing: 0.32em; text-anchor: middle; text-transform: uppercase; }}
      .qr-caption {{ font-family: 'Montserrat', sans-serif; font-size: 1.55px; font-weight: 600; fill: #812020; letter-spacing: 0.18em; text-anchor: middle; text-transform: uppercase; }}
      .qr-url {{ font-family: 'Montserrat', sans-serif; font-size: 1.35px; font-weight: 400; fill: #333336; letter-spacing: 0.14em; text-anchor: middle; }}
      .monogram {{ font-family: 'Cormorant Garamond', Georgia, serif; font-size: 2.3px; font-weight: 700; fill: #812020; text-anchor: middle; }}
    </style>
  </defs>

  <!-- Background in Limestone Card Tone (#D2D1CC) -->
  <rect width="90" height="50" class="bg" />

  <!-- Elegant Double Framing -->
  <rect x="2.5" y="2.5" width="85" height="45" class="border" />
  <rect x="3.5" y="3.5" width="83" height="43" class="inner-border" />

  <!-- Corner Flourishes -->
  <path d="M 2.5 6.5 L 6.5 2.5" stroke="#812020" stroke-width="0.35" stroke-opacity="0.5" fill="none" />
  <path d="M 87.5 6.5 L 83.5 2.5" stroke="#812020" stroke-width="0.35" stroke-opacity="0.5" fill="none" />
  <path d="M 2.5 43.5 L 6.5 47.5" stroke="#812020" stroke-width="0.35" stroke-opacity="0.5" fill="none" />
  <path d="M 87.5 43.5 L 83.5 47.5" stroke="#812020" stroke-width="0.35" stroke-opacity="0.5" fill="none" />

  <!-- Brand Header -->
  <text x="45" y="10.2" class="brand-title">VOLODIUM</text>
  <text x="45" y="12.8" class="brand-sub">HAUTE PARFUMERIE • MOSCOW</text>
  <line x1="32" y1="14.2" x2="58" y2="14.2" stroke="#812020" stroke-width="0.2" stroke-opacity="0.4" />

  <!-- QR Code Section in Center -->
  <g transform="translate(34.5, 15.8)">
    <rect x="-0.8" y="-0.8" width="22.6" height="22.6" fill="#F4EFE6" rx="0.5" stroke="#812020" stroke-width="0.25" stroke-opacity="0.3" />
    <svg x="0" y="0" width="21" height="21" viewBox="0 0 {total_size} {total_size}">
      <path d="{qr_d}" fill="#812020" />
      <!-- Center Monogram -->
      <circle cx="{total_size/2.0}" cy="{total_size/2.0}" r="3.6" fill="#F4EFE6" stroke="#812020" stroke-width="0.35" />
      <text x="{total_size/2.0}" y="{total_size/2.0 + 1.2}" class="monogram">V</text>
    </svg>
  </g>

  <!-- Bottom CTA & Brand URL -->
  <text x="45" y="42.5" class="qr-caption">СКАНИРУЙТЕ ДЛЯ ПЕРЕХОДА В БУТИК</text>
  <text x="45" y="45.2" class="qr-url">volodiumparfum.ru • @volodiumparfum</text>
</svg>'''

    out_svg = os.path.join(os.path.dirname(__file__), "../assets/img/qr/business_card_back_print.svg")
    with open(out_svg, "w", encoding="utf-8") as f:
        f.write(svg_content)
    print("Created assets/img/qr/business_card_back_print.svg successfully!")

if __name__ == "__main__":
    generate_business_card()
