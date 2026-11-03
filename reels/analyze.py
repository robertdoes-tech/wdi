#!/usr/bin/env python3
"""Per-clip review material.

For every clip in RAW_DIR:
  * frames every 0.5 s -> work/frames/<stamp>/f_XX.jpg and a labelled contact sheet
    work/sheets/<stamp>.jpg (look at these before picking segments)
  * a 10 fps scan scoring sharpness (Laplacian variance) and camera motion
    (mean abs difference between consecutive frames), and the ~2 s window with the
    best combined score -> work/analysis.json

Usage: python3 analyze.py RAW_DIR WORK_DIR [stamp ...]
"""
import json, re, subprocess, sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont

RAW, WORK = Path(sys.argv[1]), Path(sys.argv[2])
ONLY = set(sys.argv[3:])
WIN = 2.0          # target segment length (s)
SCAN_FPS = 10
FONT = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf", 22)


def stamp(p):
    return re.search(r"(\d\d \d\d \d\d)\.mov$", p.name).group(1)


def duration(p):
    out = subprocess.check_output(["ffprobe", "-v", "error", "-show_entries", "format=duration",
                                   "-of", "csv=p=0", str(p)], text=True)
    return float(out)


def gray_frames(p, fps, w=180, h=320):
    """Decode the clip to small grayscale frames (rotation is auto-applied)."""
    raw = subprocess.check_output(["ffmpeg", "-v", "error", "-i", str(p), "-vf",
                                   f"fps={fps},scale={w}:{h}:force_original_aspect_ratio=increase,"
                                   f"crop={w}:{h},format=gray", "-f", "rawvideo", "-"])
    return np.frombuffer(raw, np.uint8).reshape(-1, h, w).astype(np.float32)


def laplacian_var(f):
    lap = (-4 * f[1:-1, 1:-1] + f[:-2, 1:-1] + f[2:, 1:-1] + f[1:-1, :-2] + f[1:-1, 2:])
    return float(lap.var())


def contact_sheet(p, outdir, sheet):
    outdir.mkdir(parents=True, exist_ok=True)
    for old in outdir.glob("f_*.jpg"):
        old.unlink()
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(p), "-vf",
                    "fps=2,scale=270:480:force_original_aspect_ratio=increase,crop=270:480",
                    "-q:v", "3", str(outdir / "f_%02d.jpg")], check=True)
    frames = sorted(outdir.glob("f_*.jpg"))
    cols = min(len(frames), 8)
    rows = -(-len(frames) // cols)
    img = Image.new("RGB", (cols * 270, rows * 480), "black")
    d = ImageDraw.Draw(img)
    for i, fp in enumerate(frames):
        x, y = (i % cols) * 270, (i // cols) * 480
        img.paste(Image.open(fp), (x, y))
        t = f"{i * 0.5:.1f}s"   # fps=2 samples land on 0.0, 0.5, 1.0 ...
        d.rectangle([x, y, x + 74, y + 30], fill="black")
        d.text((x + 6, y + 3), t, fill="yellow", font=FONT)
    sheet.parent.mkdir(parents=True, exist_ok=True)
    img.save(sheet, quality=85)
    return len(frames)


def best_window(sharp, motion, dur):
    """Return (start, length, score). Score rewards sharpness, penalises motion."""
    n = len(sharp)
    if n == 0:
        return 0.0, dur, 0.0
    s = np.array(sharp) / (np.median(sharp) + 1e-6)
    m = np.array(motion + [motion[-1] if motion else 0])
    m = m / (np.median(m) + 1e-6) if m.any() else m
    per = s - 0.6 * m
    w = max(1, min(n, int(round(WIN * SCAN_FPS))))
    # keep 0.15 s clear of the very start/end (focus hunting, phone being raised/lowered)
    lo = min(int(0.15 * SCAN_FPS), n - w)
    hi = max(lo, n - w - int(0.15 * SCAN_FPS))
    best = max(range(lo, hi + 1), key=lambda i: per[i:i + w].mean())
    return best / SCAN_FPS, min(WIN, dur), float(per[best:best + w].mean())


results = {}
af = WORK / "analysis.json"
if af.exists():
    results = json.loads(af.read_text())
for p in sorted(RAW.glob("*.mov")):
    st = stamp(p)
    if ONLY and st not in ONLY:
        continue
    dur = duration(p)
    n = contact_sheet(p, WORK / "frames" / st, WORK / "sheets" / f"{st}.jpg")
    g = gray_frames(p, SCAN_FPS)
    sharp = [laplacian_var(f) for f in g]
    motion = [float(np.abs(g[i + 1] - g[i]).mean()) for i in range(len(g) - 1)]
    start, length, score = best_window(sharp, motion, dur)
    results[st] = dict(file=p.name, duration=round(dur, 2), frames=n,
                       suggest_start=round(start, 2), suggest_len=round(length, 2),
                       score=round(score, 3),
                       sharp=[round(x) for x in sharp], motion=[round(x, 1) for x in motion])
    print(f"{st}  dur {dur:5.2f}s  suggest {start:4.1f}+{length:.1f}s  "
          f"sharp med {np.median(sharp):7.0f}  motion med {np.median(motion) if motion else 0:5.1f}")
af.write_text(json.dumps(results, indent=1))
