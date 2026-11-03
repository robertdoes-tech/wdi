#!/usr/bin/env python3
"""One review image per ad: each clip's 0.5 s frames in rows, labelled with time and the
motion score around that frame (low = steady). Usage: review.py PLAN WORK_DIR"""
import json, sys
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont
plan = json.load(open(sys.argv[1])); W = Path(sys.argv[2]); A = json.load(open(W / "analysis.json"))
F = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 15)
TW, TH, COLS = 128, 228, 14
for n, ad in plan["ads"].items():
    clips = ad["clips"] + ad.get("spares", [])
    rows = []
    for c in clips:
        fr = sorted((W / "frames" / c).glob("f_*.jpg"))
        mo = A[c]["motion"]
        for r in range(0, len(fr), COLS):
            rows.append((c if r == 0 else "", c, fr[r:r + COLS], r, mo))
    img = Image.new("RGB", (90 + COLS * TW, len(rows) * (TH + 4)), (30, 30, 30))
    d = ImageDraw.Draw(img)
    for y, (label, c, fr, r0, mo) in enumerate(rows):
        yy = y * (TH + 4)
        d.text((4, yy + 4), label.replace(" ", ":"), fill="white", font=F)
        if label: d.text((4, yy + 24), f"{A[c]['duration']}s", fill="gray", font=F)
        for i, fp in enumerate(fr):
            k = r0 + i; x = 90 + i * TW
            img.paste(Image.open(fp).resize((TW, TH)), (x, yy))
            j = min(len(mo) - 1, k * 5) if mo else 0
            m = sum(mo[max(0, j - 2):j + 3]) / max(1, len(mo[max(0, j - 2):j + 3])) if mo else 0
            col = "lime" if m < 6 else "yellow" if m < 14 else "red"
            d.rectangle([x, yy, x + 80, yy + 18], fill="black")
            d.text((x + 2, yy + 1), f"{k*0.5:.1f} m{m:.0f}", fill=col, font=F)
    img.save(W / f"review_ad{int(n):02d}.jpg", quality=82)
    print(n, img.size)
