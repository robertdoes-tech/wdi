"""Prepare bottle cut-outs for the ad templates.

For each bottle, the real file in /assets wins (brief section 1 filenames).
If it is missing, the placeholder render from assets/generated is used and
flagged so the build can warn that the ads are not final.

Real files are on white, so each one is:
  1. cut out: rembg if installed, otherwise a white key that only removes
     white connected to the image border (the cream label is never keyed),
     with a soft edge and white fringe decontamination
  2. upscaled 2x: realesrgan-ncnn-vulkan if on PATH, otherwise Lanczos plus
     a light unsharp mask
  3. trimmed to the bottle with a small transparent margin

Writes assets/cut/<name>.png and assets/cut/bottles.json (size, wordmark
boxes as fractions of the trimmed image, placeholder flag).
"""
import json
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parent.parent
ASSETS = ROOT / "assets"
OUT = ASSETS / "cut"
SOURCES = {
    "purus": "purus__1_.png",
    "motus": "motus.png",
    "purus_and_motus": "purus_and_motus.png",
}
# Wordmark boxes for the real renders, as fractions of the ORIGINAL file
# (x, y, w, h). Measure once from the real files and edit here.
REAL_WORDMARKS = json.loads((ASSETS / "wordmarks.json").read_text())


def white_key(im: Image.Image) -> Image.Image:
    rgb = np.asarray(im.convert("RGB")).astype(np.float32)
    dist = np.sqrt(((255 - rgb) ** 2).sum(axis=2))  # 0 = pure white
    near = (dist < 40).astype(np.uint8) * 255
    # Only white that touches the border is background.
    flood = Image.fromarray(near, "L").copy()  # floodfill is a no-op on a numpy-backed image
    w, h = flood.size
    for seed in [(0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)]:
        if flood.getpixel(seed) == 255:
            ImageDraw.floodfill(flood, seed, 128)
    bg = np.asarray(flood) == 128
    bg_grown = np.asarray(Image.fromarray(bg.astype(np.uint8) * 255).filter(ImageFilter.MaxFilter(5))) > 0
    alpha = np.full(dist.shape, 255.0)
    edge = bg_grown & ~bg
    alpha[bg] = 0
    alpha[edge] = np.clip((dist[edge] - 6) / 34, 0, 1) * 255
    a = alpha[..., None] / 255
    # Remove the white the edge pixels were blended with.
    with np.errstate(divide="ignore", invalid="ignore"):
        dec = np.where(a > 0.02, (rgb - (1 - a) * 255) / np.maximum(a, 0.02), rgb)
    out = np.dstack([np.clip(dec, 0, 255), alpha]).astype(np.uint8)
    im2 = Image.fromarray(out, "RGBA")
    a_ch = im2.getchannel("A").filter(ImageFilter.GaussianBlur(0.6))
    im2.putalpha(a_ch)
    return im2


def decontaminate(im: Image.Image) -> Image.Image:
    """Undo the white the soft edge pixels were blended with, so no halo shows on dark grounds."""
    arr = np.asarray(im).astype(np.float32)
    rgb, a = arr[..., :3], arr[..., 3:] / 255
    with np.errstate(divide="ignore", invalid="ignore"):
        dec = np.where((a > 0.02) & (a < 0.98), (rgb - (1 - a) * 255) / np.maximum(a, 0.02), rgb)
    return Image.fromarray(np.dstack([np.clip(dec, 0, 255), arr[..., 3]]).astype(np.uint8), "RGBA")


def cut_out(im: Image.Image) -> Image.Image:
    try:
        from rembg import new_session, remove  # type: ignore
    except ImportError:
        print("rembg not installed (pip install 'rembg[cpu]'), falling back to the white key", file=sys.stderr)
        return white_key(im)
    # isnet copes with a cream bottle on white far better than a colour key.
    cut = remove(im.convert("RGB"), session=new_session("isnet-general-use"))
    a = cut.getchannel("A").filter(ImageFilter.MinFilter(3)).filter(ImageFilter.GaussianBlur(0.7))
    cut.putalpha(a)
    return decontaminate(cut)


def upscale(im: Image.Image) -> Image.Image:
    exe = shutil.which("realesrgan-ncnn-vulkan")
    if exe:
        with tempfile.TemporaryDirectory() as d:
            src, dst = Path(d) / "in.png", Path(d) / "out.png"
            im.save(src)
            r = subprocess.run([exe, "-i", src, "-o", dst, "-s", "2"], capture_output=True)
            if r.returncode == 0 and dst.exists():
                return Image.open(dst).convert("RGBA")
    big = im.resize((im.width * 2, im.height * 2), Image.LANCZOS)
    rgb = big.convert("RGB").filter(ImageFilter.UnsharpMask(radius=2, percent=60, threshold=2))
    rgb.putalpha(big.getchannel("A"))
    return rgb


def trim(im: Image.Image, pad: int = 8):
    box = im.getchannel("A").point(lambda v: 255 if v > 8 else 0).getbbox()
    l, t, r, b = box
    l, t = max(l - pad, 0), max(t - pad, 0)
    r, b = min(r + pad, im.width), min(b + pad, im.height)
    return im.crop((l, t, r, b)), (l, t, r, b)


def remap(boxes, src_size, crop):
    sw, sh = src_size
    l, t, r, b = crop
    cw, ch = r - l, b - t
    return [
        {"x": (bx["x"] * sw - l) / cw, "y": (bx["y"] * sh - t) / ch, "w": bx["w"] * sw / cw, "h": bx["h"] * sh / ch}
        for bx in boxes
    ]


def main():
    OUT.mkdir(parents=True, exist_ok=True)
    gen_meta = json.loads((ASSETS / "generated" / "bottles.json").read_text())
    meta = {}
    for name, fname in SOURCES.items():
        real = ASSETS / fname
        if real.exists():
            src = Image.open(real)
            im = upscale(cut_out(src))
            boxes = REAL_WORDMARKS.get(name, [])
            if not boxes:
                print(f"WARNING {name}: add its wordmark box to assets/wordmarks.json", file=sys.stderr)
            im, crop = trim(im, pad=16)
            boxes = remap(boxes, (src.width * 2, src.height * 2), crop)
            placeholder = False
        else:
            im = Image.open(ASSETS / "generated" / f"{name}.png").convert("RGBA")
            size = im.size
            im, crop = trim(im)
            boxes = remap(gen_meta[name]["wordmarks"], size, crop)
            placeholder = True
            print(f"PLACEHOLDER {name}: {fname} not found in /assets, using generated stand-in")
        im.save(OUT / f"{name}.png", optimize=True)
        meta[name] = {"w": im.width, "h": im.height, "wordmarks": boxes, "placeholder": placeholder}
        print(f"{name}: {im.width}x{im.height}")
    (OUT / "bottles.json").write_text(json.dumps(meta, indent=2))


if __name__ == "__main__":
    main()
