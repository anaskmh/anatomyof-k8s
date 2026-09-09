"""Generate the static Open Graph preview images in public/og/.

One-off tool (the PNGs are committed). Requires Pillow and the brand fonts:
  Space Grotesk variable TTF and JetBrains Mono TTFs, paths below or via env.
Usage: python3 scripts/build/og-images.py
"""
import os
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
BG, INK, MUTED, LINE, LINE_STRONG, ACCENT, CARD = '#F6F4F0', '#1A1A2E', '#5C5A6F', '#DCDAD4', '#B2B0A9', '#E8653A', '#FFFFFF'
FONT_DIR = os.environ.get('OG_FONT_DIR', '/tmp/ctfonts')
GROTESK = os.path.join(FONT_DIR, 'SpaceGrotesk.ttf')
MONO = os.path.join(FONT_DIR, 'JetBrainsMono-Regular.ttf')
MONO_BOLD = os.path.join(FONT_DIR, 'JetBrainsMono-Bold.ttf')


def grotesk(size, weight=700):
    f = ImageFont.truetype(GROTESK, size)
    f.set_variation_by_axes([weight])
    return f


def mono(size, bold=False):
    return ImageFont.truetype(MONO_BOLD if bold else MONO, size)


def canvas():
    im = Image.new('RGB', (W, H), BG)
    d = ImageDraw.Draw(im)
    grid = (232, 230, 226)
    for x in range(0, W, 40):
        d.line([(x, 0), (x, H)], fill=grid, width=1)
    for y in range(0, H, 40):
        d.line([(0, y), (W, y)], fill=grid, width=1)
    return im, d


def keycap(d, box, radius=14, fill=CARD):
    x0, y0, x1, y1 = box
    d.rounded_rectangle((x0, y0 + 3, x1, y1 + 3), radius=radius, fill=LINE_STRONG)
    d.rounded_rectangle(box, radius=radius, fill=fill, outline=LINE, width=1)


def chip(d, x, y, text, font, fg=INK, bg=CARD, pad=(14, 9)):
    tw = d.textlength(text, font=font)
    th = font.size
    box = (x, y, x + tw + pad[0] * 2, y + th + pad[1] * 2)
    d.rounded_rectangle(box, radius=8, fill=bg, outline=LINE, width=1)
    d.text((x + pad[0], y + pad[1] - 1), text, font=font, fill=fg)
    return box[2]


def brand(d, x, y):
    d.text((x, y), 'DEVOPS COMMUNITY', font=mono(14), fill=MUTED)
    f = grotesk(40, 700)
    d.text((x, y + 20), 'Cloud', font=f, fill=INK)
    d.text((x + d.textlength('Cloud', font=f), y + 20), 'Truck', font=f, fill=ACCENT)


def wrap(d, text, font, max_w):
    words, lines, cur = text.split(), [], ''
    for w in words:
        t = (cur + ' ' + w).strip()
        if d.textlength(t, font=font) <= max_w:
            cur = t
        else:
            lines.append(cur); cur = w
    if cur:
        lines.append(cur)
    return lines


def draw_title(d, x, y, lines, font, accent_words=(), line_h=None):
    line_h = line_h or int(font.size * 1.08)
    for line in lines:
        cx = x
        for word in line.split(' '):
            clean = word.strip('.,&')
            color = ACCENT if clean in accent_words else INK
            d.text((cx, y), word, font=font, fill=color)
            cx += d.textlength(word + ' ', font=font)
        y += line_h
    return y


def careers():
    im, d = canvas()
    keycap(d, (60, 50, W - 60, H - 50), radius=18)
    brand(d, 100, 86)
    d.text((100, 172), '➜  ~  CAREERS · UAE & SAUDI ARABIA · LIVE JOB BOARD', font=mono(16), fill=ACCENT)
    f = grotesk(60, 700)
    lines = wrap(d, 'Recent Cloud, DevOps, Software & AI jobs in UAE and Saudi Arabia', f, 760)
    y = draw_title(d, 100, 204, lines, f, accent_words={'UAE', 'Saudi', 'Arabia'})
    d.text((100, y + 10), 'Collected from LinkedIn and Indeed. Filter by role and country, apply directly.', font=mono(17), fill=MUTED)
    # role chips
    cx, cy = 100, y + 62
    for t in ['DevOps', 'SRE', 'Platform', 'Cloud', 'Software Eng', 'QA / Testing', 'AI / ML']:
        cx = chip(d, cx, cy, t, mono(15)) + 10
    # right stat tiles
    tiles = [('DUBAI · ABU DHABI', 'UAE'), ('RIYADH · JEDDAH', 'KSA'), ('OPEN ROLES · APPLY', 'LIVE')]
    tx, ty = 900, 90
    for label, big in tiles:
        keycap(d, (tx, ty, tx + 200, ty + 96), radius=10)
        d.text((tx + 18, ty + 16), big, font=mono(30, bold=True), fill=ACCENT if big == 'LIVE' else INK)
        d.text((tx + 18, ty + 62), label, font=mono(12), fill=MUTED)
        ty += 112
    d.text((100, H - 96), '[ APPLY AT cloudtruck.space/careers ]', font=mono(15, bold=True), fill=INK)
    return im


def default():
    im, d = canvas()
    keycap(d, (60, 50, W - 60, H - 50), radius=18)
    brand(d, 100, 86)
    d.text((100, 172), '➜  ~  INTERACTIVE GUIDE · EVERY MAJOR COMPONENT', font=mono(16), fill=ACCENT)
    f = grotesk(64, 700)
    lines = wrap(d, 'DevOps architecture with the moving parts exposed.', f, 760)
    y = draw_title(d, 100, 204, lines, f, accent_words={'DevOps'})
    d.text((100, y + 10), 'Trace requests through real systems. Click any component for a real-world example.', font=mono(17), fill=MUTED)
    cx, cy = 100, y + 62
    for t in ['Kubernetes', 'Docker', 'CI/CD', 'Terraform', 'Observability', 'Linux', 'Cloud', 'GitOps']:
        cx = chip(d, cx, cy, t, mono(15)) + 10
    # terminal card
    tx, ty = 860, 96
    d.rounded_rectangle((tx, ty, tx + 250, ty + 300), radius=12, fill=INK)
    d.rounded_rectangle((tx, ty, tx + 250, ty + 38), radius=12, fill='#2A2A32')
    for i, c in enumerate(['#FF5F57', '#FEBC2E', '#28C840']):
        d.ellipse((tx + 16 + i * 20, ty + 13, tx + 28 + i * 20, ty + 25), fill=c)
    rows = [('➜ ~ kubectl apply', '#F8FAFC'), ('✓ auth · rbac · admission', '#9391A0'), ('✓ persist to etcd', '#9391A0'), ('● scheduler binds pod', '#F8FAFC'), ('○ kubelet starts pod', '#9391A0'), ('○ service wired', '#9391A0')]
    ry = ty + 56
    for text, col in rows:
        d.text((tx + 18, ry), text, font=mono(14), fill=col)
        ry += 30
    d.text((tx + 18, ry + 10), '➜ ~ ▍', font=mono(14), fill=ACCENT)
    d.text((100, H - 96), '[ EXPLORE AT cloudtruck.space ]', font=mono(15, bold=True), fill=INK)
    return im


if __name__ == '__main__':
    os.makedirs('public/og', exist_ok=True)
    careers().save('public/og/careers.png', optimize=True)
    default().save('public/og/default.png', optimize=True)
    print('wrote public/og/careers.png and public/og/default.png')
