#!/usr/bin/env python3
"""
Leeres DATEV LOHN17 ohne Geistertexte.
Labels/Gitter bleiben soweit möglich; alle Beispieldaten weg.
"""
from PIL import Image, ImageDraw, ImageFilter, ImageEnhance

W_MM, H_MM = 210, 297
SRC = "assets/referenz-datev-mustermann.png"
OUT = "assets/datev-lohn17-blank.png"
SCALE = 3

CLEAR = [
    # Kopf rechts
    (168, 3.5, 40, 13),
    # Monat im Titel
    (48, 13.5, 80, 7),
    # Stammdaten-Werte Zeile 1+2 (Labels oben bleiben meist)
    (8, 21.8, 200, 6.2),
    (8, 30.8, 200, 6.2),
    # Url / Tage / Std
    (112, 21.8, 96, 24),
    # Absender + MA + Eintritt/Steuer-ID
    (8, 42, 105, 36),
    # Hinweise inkl. Wöch.Arb / Pau
    (110, 42, 96, 40),
    # Brutto-Zeilen + Testabrechnung-Hinweis (Header bleibt ~84–88)
    (8, 87, 200, 32),
    # Summen rechts Brutto/Steuer/SV/Netto
    (185, 114, 22, 40),
    # Steuer/SV Wertzellen
    (48, 122, 155, 26),
    # Verdienstbescheinigung komplett (Labels werden als Overlay neu gesetzt)
    (8, 149, 200, 94),
    # Fuß Bank / AG / Auszahlung
    (8, 242, 200, 30),
]


def box(w, h, left, top, width, height, pad=0.35):
    return (
        max(0, int((left - pad) / W_MM * w)),
        max(0, int((top - pad) / H_MM * h)),
        min(w, int((left + width + pad) / W_MM * w)),
        min(h, int((top + height + pad) / H_MM * h)),
    )


def restore_lines(draw, w, h):
    ink = (40, 40, 40)

    def hl(y, x1=8, x2=202, width=1):
        draw.line(
            [(int(x1 / W_MM * w), int(y / H_MM * h)), (int(x2 / W_MM * w), int(y / H_MM * h))],
            fill=ink,
            width=width,
        )

    def vl(x, y1, y2, width=1):
        draw.line(
            [(int(x / W_MM * w), int(y1 / H_MM * h)), (int(x / W_MM * w), int(y2 / H_MM * h))],
            fill=ink,
            width=width,
        )

    # Brutto
    hl(88, width=1)
    hl(118, width=2)
    vl(190, 88, 150, 1)
    # Steuer/SV
    hl(124, width=1)
    hl(134, width=1)
    hl(149, width=1)
    # Verdienst grob
    hl(152, width=1)
    hl(244, width=1)
    # Auszahlung
    hl(268, width=2)


def main():
    base = Image.open(SRC).convert("RGB")
    im = base.resize((base.size[0] * SCALE, base.size[1] * SCALE), Image.Resampling.LANCZOS)
    w, h = im.size
    draw = ImageDraw.Draw(im)
    for r in CLEAR:
        draw.rectangle(box(w, h, *r), fill=(255, 255, 255))
    restore_lines(draw, w, h)
    im = ImageEnhance.Contrast(im).enhance(1.05)
    im = im.filter(ImageFilter.SHARPEN)
    im.save(OUT, optimize=True)
    print(f"Written {OUT} ({w}x{h})")


if __name__ == "__main__":
    main()
