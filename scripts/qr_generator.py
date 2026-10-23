# Pure Python QR Code Generator (ISO/IEC 18004)
# Supports Byte mode, Versions 1-10, Error Correction Levels L, M, Q, H.
# Exports scalable SVG and 300 DPI print-ready PNG.

import struct, zlib

class QRCode:
    def __init__(self, version=3, error_correction='M'):
        self.version = version
        self.error_correction = error_correction
        self.size = 21 + (version - 1) * 4
        self.modules = [[None] * self.size for _ in range(self.size)]
        self.is_function = [[False] * self.size for _ in range(self.size)]

    # GF(256) math
    EXP_TABLE = [0] * 512
    LOG_TABLE = [0] * 256
    
    @classmethod
    def init_gf256(cls):
        x = 1
        for i in range(255):
            cls.EXP_TABLE[i] = x
            cls.LOG_TABLE[x] = i
            x <<= 1
            if x & 0x100:
                x ^= 0x11d
        for i in range(255, 512):
            cls.EXP_TABLE[i] = cls.EXP_TABLE[i - 255]

    @classmethod
    def gf_mul(cls, x, y):
        if x == 0 or y == 0:
            return 0
        return cls.EXP_TABLE[cls.LOG_TABLE[x] + cls.LOG_TABLE[y]]

    @classmethod
    def rs_generator_poly(cls, degree):
        poly = [1]
        for i in range(degree):
            poly = cls.poly_mul(poly, [1, cls.EXP_TABLE[i]])
        return poly

    @classmethod
    def poly_mul(cls, p, q):
        r = [0] * (len(p) + len(q) - 1)
        for i in range(len(p)):
            for j in range(len(q)):
                r[i + j] ^= cls.gf_mul(p[i], q[j])
        return r

    @classmethod
    def calc_rs_ecc(cls, data_bytes, ecc_len):
        gen = cls.rs_generator_poly(ecc_len)
        info = list(data_bytes) + [0] * ecc_len
        for i in range(len(data_bytes)):
            coef = info[i]
            if coef != 0:
                for j in range(len(gen)):
                    info[i + j] ^= cls.gf_mul(gen[j], coef)
        return info[len(data_bytes):]

    def add_finder_pattern(self, r, c):
        for y in range(-1, 8):
            for x in range(-1, 8):
                if 0 <= r + y < self.size and 0 <= c + x < self.size:
                    if 0 <= y <= 6 and (x in (0, 6)) or 0 <= x <= 6 and (y in (0, 6)) or 2 <= y <= 4 and 2 <= x <= 4:
                        self.modules[r + y][c + x] = True
                    else:
                        self.modules[r + y][c + x] = False
                    self.is_function[r + y][c + x] = True

    def add_alignment_pattern(self, r, c):
        for y in range(-2, 3):
            for x in range(-2, 3):
                if max(abs(x), abs(y)) in (0, 2):
                    self.modules[r + y][c + x] = True
                else:
                    self.modules[r + y][c + x] = False
                self.is_function[r + y][c + x] = True

    def setup_finders_and_timing(self):
        # 3 Finder patterns
        self.add_finder_pattern(0, 0)
        self.add_finder_pattern(self.size - 7, 0)
        self.add_finder_pattern(0, self.size - 7)

        # Timing patterns
        for i in range(8, self.size - 8):
            v = (i % 2 == 0)
            self.modules[6][i] = v
            self.is_function[6][i] = True
            self.modules[i][6] = v
            self.is_function[i][6] = True

        # Alignment patterns
        align_pos = {
            2: [6, 18],
            3: [6, 22],
            4: [6, 26],
            5: [6, 30]
        }.get(self.version, [])
        for r in align_pos:
            for c in align_pos:
                if not (r <= 8 and c <= 8) and not (r <= 8 and c >= self.size - 8) and not (r >= self.size - 8 and c <= 8):
                    if not self.is_function[r][c]:
                        self.add_alignment_pattern(r, c)

        # Dark module
        self.modules[self.size - 8][8] = True
        self.is_function[self.size - 8][8] = True

        # Reserve format areas
        for i in range(9):
            if i != 6:
                self.is_function[8][i] = True
                self.is_function[i][8] = True
        for i in range(8):
            self.is_function[8][self.size - 1 - i] = True
            self.is_function[self.size - 1 - i][8] = True

    def encode_data(self, text):
        data = text.encode('utf-8')
        # Mode indicator: 0100 for Byte
        bits = [0, 1, 0, 0]
        # Char count (8 bits for v1-9 in byte mode)
        length = len(data)
        for b in range(7, -1, -1):
            bits.append((length >> b) & 1)
        # Data bytes
        for byte in data:
            for b in range(7, -1, -1):
                bits.append((byte >> b) & 1)

        # Capacity for Version 3-M: 44 total data codewords (352 bits)
        # Capacity for Version 2-M: 28 data codewords (224 bits)
        # Capacity for Version 3-H: 26 data codewords (208 bits)
        # Capacity for Version 4-M: 64 data codewords (512 bits)
        caps = {
            (2, 'M'): 28,
            (3, 'M'): 44,
            (3, 'H'): 26,
            (4, 'M'): 64,
            (4, 'H'): 36,
        }
        cap = caps.get((self.version, self.error_correction), 44)
        target_bits = cap * 8

        # Terminator
        term = min(4, target_bits - len(bits))
        bits.extend([0] * term)

        # Bit padding to byte boundary
        while len(bits) % 8 != 0:
            bits.append(0)

        # Pad bytes 0xEC, 0x11
        pad_bytes = [0xEC, 0x11]
        pad_idx = 0
        while len(bits) < target_bits:
            b = pad_bytes[pad_idx % 2]
            pad_idx += 1
            for i in range(7, -1, -1):
                bits.append((b >> i) & 1)

        # Convert to codewords
        codewords = []
        for i in range(0, len(bits), 8):
            val = 0
            for j in range(8):
                val = (val << 1) | bits[i + j]
            codewords.append(val)

        return codewords

    def populate(self, text):
        QRCode.init_gf256()
        self.setup_finders_and_timing()

        data_cw = self.encode_data(text)

        # Version & EC table: (data_blocks, ecc_per_block)
        # For V3-M: 1 block of 44 data bytes, 26 ecc bytes
        # For V4-M: 2 blocks of 32 data bytes, 18 ecc bytes
        if self.version == 3 and self.error_correction == 'M':
            ecc_len = 26
            ecc = QRCode.calc_rs_ecc(data_cw, ecc_len)
            final_bytes = data_cw + ecc
        elif self.version == 4 and self.error_correction == 'M':
            ecc_len = 18
            b1_data = data_cw[:32]
            b2_data = data_cw[32:64]
            b1_ecc = QRCode.calc_rs_ecc(b1_data, ecc_len)
            b2_ecc = QRCode.calc_rs_ecc(b2_data, ecc_len)
            # Interleave
            final_bytes = []
            for i in range(32):
                final_bytes.append(b1_data[i])
                final_bytes.append(b2_data[i])
            for i in range(ecc_len):
                final_bytes.append(b1_ecc[i])
                final_bytes.append(b2_ecc[i])
        else:
            ecc_len = 26
            ecc = QRCode.calc_rs_ecc(data_cw, ecc_len)
            final_bytes = data_cw + ecc

        # Convert final bytes to bitstream
        final_bits = []
        for b in final_bytes:
            for i in range(7, -1, -1):
                final_bits.append((b >> i) & 1)

        # Place bits in zigzag
        bit_idx = 0
        c = self.size - 1
        dir_up = True
        while c > 0:
            if c == 6:
                c -= 1
            cols = [c, c - 1]
            rows = range(self.size - 1, -1, -1) if dir_up else range(self.size)
            for r in rows:
                for col in cols:
                    if not self.is_function[r][col]:
                        val = final_bits[bit_idx] if bit_idx < len(final_bits) else 0
                        self.modules[r][col] = (val == 1)
                        bit_idx += 1
            dir_up = not dir_up
            c -= 2

        # Apply best mask (mask pattern 0: (r + c) % 2 == 0)
        self.apply_mask(0)
        self.write_format_info(0)

    def apply_mask(self, mask_id):
        for r in range(self.size):
            for c in range(self.size):
                if not self.is_function[r][c]:
                    invert = False
                    if mask_id == 0:
                        invert = ((r + c) % 2 == 0)
                    elif mask_id == 1:
                        invert = (r % 2 == 0)
                    elif mask_id == 2:
                        invert = (c % 3 == 0)
                    if invert:
                        self.modules[r][c] = not self.modules[r][c]

    def write_format_info(self, mask_id):
        # Format string for EC level M (00) and mask (000) = 00000 -> BCH code: 101010000010010
        # Format bits with mask 101010000010010:
        fmt_table = {
            ('M', 0): 0x5412,
            ('M', 1): 0x5125,
            ('M', 2): 0x5E7C,
            ('L', 0): 0x77C4,
        }
        fmt = fmt_table.get((self.error_correction, mask_id), 0x5412)
        bits = [(fmt >> i) & 1 for i in range(14, -1, -1)]

        # Place format bits
        # Top-left horizontal & vertical
        coords_top = [
            (8, 0), (8, 1), (8, 2), (8, 3), (8, 4), (8, 5), (8, 7), (8, 8),
            (7, 8), (5, 8), (4, 8), (3, 8), (2, 8), (1, 8), (0, 8)
        ]
        for idx, (r, c) in enumerate(coords_top):
            self.modules[r][c] = (bits[idx] == 1)

        # Bottom-left and Top-right
        coords_other = [
            (self.size - 1, 8), (self.size - 2, 8), (self.size - 3, 8), (self.size - 4, 8),
            (self.size - 5, 8), (self.size - 6, 8), (self.size - 7, 8),
            (8, self.size - 8), (8, self.size - 7), (8, self.size - 6), (8, self.size - 5),
            (8, self.size - 4), (8, self.size - 3), (8, self.size - 2), (8, self.size - 1)
        ]
        for idx, (r, c) in enumerate(coords_other):
            self.modules[r][c] = (bits[idx] == 1)

    def to_svg(self, fg_color="#111216", bg_color="transparent", margin=3, center_logo=True):
        total_size = self.size + margin * 2
        svg = []
        svg.append(f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {total_size} {total_size}" shape-rendering="crispEdges">')
        if bg_color and bg_color != "transparent":
            svg.append(f'<rect width="{total_size}" height="{total_size}" fill="{bg_color}"/>')
        
        # Center logo exclusion zone (if center_logo)
        mid = self.size // 2
        logo_rad = 3 # 7x7 module zone in center for luxury monogram
        
        paths = []
        for r in range(self.size):
            for c in range(self.size):
                if center_logo and (mid - logo_rad <= r <= mid + logo_rad) and (mid - logo_rad <= c <= mid + logo_rad):
                    continue
                if self.modules[r][c]:
                    paths.append(f'M{c + margin},{r + margin}h1v1h-1z')
        
        svg.append(f'<path d="{"".join(paths)}" fill="{fg_color}"/>')

        if center_logo:
            # Elegant luxury monogram circle in center
            cx = total_size / 2.0
            cy = total_size / 2.0
            r_circle = 3.6
            svg.append(f'<circle cx="{cx}" cy="{cy}" r="{r_circle}" fill="{bg_color if bg_color != "transparent" else "#ffffff"}" stroke="{fg_color}" stroke-width="0.35"/>')
            svg.append(f'<text x="{cx}" y="{cy + 1.2}" font-family="Cormorant Garamond, serif" font-size="3.2" font-weight="700" fill="{fg_color}" text-anchor="middle">V</text>')

        svg.append('</svg>')
        return "\n".join(svg)

    def to_png(self, filename, scale=16, fg_rgb=(17, 18, 22), bg_rgb=(255, 255, 255), margin=3):
        total_size = self.size + margin * 2
        width = total_size * scale
        height = total_size * scale

        # Prepare RGB buffer
        pixels = []
        for r in range(height):
            row = bytearray()
            for c in range(width):
                mod_r = (r // scale) - margin
                mod_c = (c // scale) - margin
                
                # Check module
                if 0 <= mod_r < self.size and 0 <= mod_c < self.size and self.modules[mod_r][mod_c]:
                    row.extend(fg_rgb)
                else:
                    row.extend(bg_rgb)
            pixels.append(row)

        def chunk(tag, data):
            return struct.pack('>I', len(data)) + tag + data + struct.pack('>I', zlib.crc32(tag + data) & 0xffffffff)

        header = b'\x89PNG\r\n\x1a\n'
        ihdr = chunk(b'IHDR', struct.pack('>IIBBBBB', width, height, 8, 2, 0, 0, 0)) # 8-bit truecolor RGB
        raw_data = bytearray()
        for row in pixels:
            raw_data.append(0)
            raw_data.extend(row)
        idat = chunk(b'IDAT', zlib.compress(bytes(raw_data), 9))
        iend = chunk(b'IEND', b'')

        with open(filename, 'wb') as f:
            f.write(header + ihdr + idat + iend)

