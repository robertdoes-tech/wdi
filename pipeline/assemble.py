"""Step 5: sync clips to voice lines, zoom/pan in post, burn in captions, export landscape + square + thumbnail.

    python3 pipeline/assemble.py <slug> [--preview]     (--preview: fast encode for checking)

Reads build/<slug>/vo/*.json (voice + word timings) and build/<slug>/clips/*.{mp4,json} (recordings + cursor/zoom
events), renders the template cards with render.mjs, writes output/<CompanyName>/.
"""
import argparse
import json
import os
import re
import subprocess
import sys
import wave
from pathlib import Path

import cv2
import numpy as np

sys.path.insert(0, os.path.dirname(__file__))
from common import PIPELINE, ROOT, abs_path, active_steps, load_config  # noqa: E402

SR = 44100
XFADE = 0.3          # dissolve in from the intro and out to the outro; steps hard-cut


# ------------------------------------------------------------------ helpers
def decode(path, w, h):
    # stderr discarded: the decoder is often abandoned mid-stream once its segment ends (harmless broken pipe)
    p = subprocess.Popen(["ffmpeg", "-v", "error", "-i", str(path), "-f", "rawvideo", "-pix_fmt", "bgr24", "-"],
                         stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    n = w * h * 3
    last = None
    while True:
        buf = p.stdout.read(n)
        if len(buf) < n:
            break
        last = np.frombuffer(buf, np.uint8).reshape(h, w, 3)
        yield last
    p.wait()
    while last is not None:      # hold the last frame if the timeline asks for more
        yield last


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "v:0", "-show_entries", "stream=width,height:format=duration",
                        "-of", "json", str(path)], capture_output=True, text=True, check=True)
    j = json.loads(r.stdout)
    return j["streams"][0]["width"], j["streams"][0]["height"], float(j["format"]["duration"])


def load_audio(path):
    raw = subprocess.run(["ffmpeg", "-v", "error", "-i", str(path), "-f", "f32le", "-ac", "1", "-ar", str(SR), "-"],
                         capture_output=True, check=True).stdout
    return np.frombuffer(raw, np.float32).copy()


def gauss_smooth(x, sigma_frames):
    if sigma_frames <= 0:
        return x
    r = int(sigma_frames * 3)
    k = np.exp(-0.5 * (np.arange(-r, r + 1) / sigma_frames) ** 2)
    k /= k.sum()
    pad = np.concatenate([np.full(r, x[0]), x, np.full(r, x[-1])])
    return np.convolve(pad, k, mode="valid")


# ------------------------------------------------------------------ captions
BREAK_BEFORE = re.compile(r"^(that|and|but|so|or|to|for|with|which|who|when|where|whether|because|if|just|in|on|from)$", re.I)
NO_END = re.compile(r"^(a|an|the|I|to|of|and|or|for|your|their|its|in|on|with|it's|they|we)$", re.I)


def lines_needed(ws, max_chars):
    lines, cur = 1, 0
    for w in ws:
        add = len(w) + (1 if cur else 0)
        if cur + add > max_chars and cur:
            lines, cur = lines + 1, len(w)
        else:
            cur += add
    return lines


def protected_breaks(texts, keep):
    """Indexes where a split would cut through a phrase that must stay on one caption (the company name)."""
    norm = [re.sub(r"[^\w'&]", "", t).lower() for t in texts]
    bad = set()
    for phrase in keep:
        p = phrase.lower().split()
        for i in range(len(norm) - len(p) + 1):
            if norm[i:i + len(p)] == [re.sub(r"[^\w'&]", "", x) for x in p]:
                bad.update(range(i + 1, i + len(p)))
    return bad


def split_phrase(ws, max_chars, max_lines, keep=()):
    """Split a run of words into caption chunks at the most natural points (punctuation, before conjunctions),
    never leaving a dangling "the" / "I" at the end of a chunk, and keeping chunks roughly balanced."""
    texts = [w["w"] for w in ws]
    if lines_needed(texts, max_chars) <= max_lines:
        return [ws]
    best, best_cost = None, 1e9
    total = len(" ".join(texts))
    no_split = protected_breaks(texts, keep)
    for i in range(1, len(ws)):
        left, right = texts[:i], texts[i:]
        cost = 500.0 if i in no_split else 0.0
        if lines_needed(left, max_chars) > max_lines:
            cost += 1000
        if re.search(r"[.!?]$", left[-1]):
            cost -= 40
        elif re.search(r"[,;:]$", left[-1]):
            cost -= 25
        if BREAK_BEFORE.match(re.sub(r"\W", "", right[0])):
            cost -= 6
        if NO_END.match(re.sub(r"[^\w']", "", left[-1])):
            cost += 30
        if len(left) < 2 or len(right) < 2:
            cost += 25
        cost += abs(len(" ".join(left)) - total / 2) * 0.6
        if cost < best_cost:
            best, best_cost = i, cost
    return split_phrase(ws[:best], max_chars, max_lines, keep) + split_phrase(ws[best:], max_chars, max_lines, keep)


def chunk_captions(words, max_chars, max_lines, keep=()):
    # sentences (and long pauses) always break; anything longer than two lines is split naturally
    phrases, cur = [], []
    for w in words:
        if cur and (re.search(r"[.!?]$", cur[-1]["w"]) or w["start"] - cur[-1]["end"] > 0.65):
            phrases.append(cur)
            cur = []
        cur.append(w)
    if cur:
        phrases.append(cur)
    chunks = [c for p in phrases for c in split_phrase(p, max_chars, max_lines, keep)]
    out = []
    for i, c in enumerate(chunks):
        start = c[0]["start"] - 0.05
        end = c[-1]["end"] + 0.7
        if i + 1 < len(chunks):
            end = min(end, chunks[i + 1][0]["start"] - 0.05)
        out.append({"text": " ".join(x["w"] for x in c), "start": start, "end": end})
    return out


def srt_time(t):
    ms = int(round(t * 1000))
    return f"{ms // 3600000:02d}:{ms // 60000 % 60:02d}:{ms // 1000 % 60:02d},{ms % 1000:03d}"


# ------------------------------------------------------------------ camera
def camera_paths(meta, nframes, fps, vp):
    """Per-frame (cx, cy, zoom) for the landscape cut and (cx, cy, zoom) for the square cut, in CSS px."""
    W, H = vp["width"], vp["height"]
    t = np.arange(nframes) / fps
    ev = meta["events"]
    cur = sorted((e["t"], e["x"], e["y"]) for e in ev if e["type"] == "cursor")
    ct = np.array([c[0] for c in cur]) if cur else np.array([0.0])
    cx_cur = np.interp(t, ct, [c[1] for c in cur]) if cur else np.full(nframes, W / 2)

    z = np.ones(nframes)
    cx, cy = np.full(nframes, W / 2), np.full(nframes, H / 2)
    sq_x = cx_cur.copy()
    sq_z = np.ones(nframes)
    sq_y = np.full(nframes, H / 2)
    focus = sorted((e for e in ev if e["type"] == "focus"), key=lambda e: e["t"])
    for i, e in enumerate(focus):
        b = e["box"]
        Z = e.get("zoom") or float(np.clip(min(W / (b["width"] * 3.2), H / (b["height"] * 4.5)), 1.35, 1.85))
        nxt = focus[i + 1]["t"] if i + 1 < len(focus) else 1e9
        end = min(nxt, meta["duration"] - 0.35) if e.get("kind") == "hold" else min(nxt, e["t"] + 2.4, meta["duration"] - 0.35)
        m = (t >= e["t"] - 0.15) & (t < end)
        bx, by = b["x"] + b["width"] / 2, b["y"] + b["height"] / 2
        z[m], cx[m], cy[m] = Z, bx, by
        sq_z[m], sq_x[m], sq_y[m] = max(1.0, Z * 0.82), bx, by
    s = 0.3 * fps
    z, cx, cy = gauss_smooth(z, s), gauss_smooth(cx, s), gauss_smooth(cy, s)
    sq_z, sq_x, sq_y = gauss_smooth(sq_z, s), gauss_smooth(sq_x, 0.55 * fps), gauss_smooth(sq_y, s)
    # keep the window inside the frame
    hw, hh = W / z / 2, H / z / 2
    cx, cy = np.clip(cx, hw, W - hw), np.clip(cy, hh, H - hh)
    side = H / sq_z / 2
    sq_x, sq_y = np.clip(sq_x, side, W - side), np.clip(sq_y, side, H - side)
    return (cx, cy, z), (sq_x, sq_y, sq_z)


def view(src, rec_scale, cx, cy, win_w, win_h, OW, OH):
    """Crop a (cx, cy, win_w x win_h) CSS-px window from a recorded frame and scale it to OW x OH, sub-pixel smooth."""
    k = OW / (win_w * rec_scale)
    ox, oy = (cx - win_w / 2) * rec_scale, (cy - win_h / 2) * rec_scale
    if k < 0.98:
        h, w = src.shape[:2]
        rw, rh = max(1, round(w * k)), max(1, round(h * k))
        small = cv2.resize(src, (rw, rh), interpolation=cv2.INTER_AREA)
        kx, ky = rw / w, rh / h
        M = np.float32([[k / kx, 0, -ox * k], [0, k / ky, -oy * k]])
        return cv2.warpAffine(small, M, (OW, OH), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    M = np.float32([[k, 0, -ox * k], [0, k, -oy * k]])
    return cv2.warpAffine(src, M, (OW, OH), flags=cv2.INTER_CUBIC, borderMode=cv2.BORDER_REPLICATE)


def overlay(dst, rgba):
    img, (y0, y1, x0, x1) = rgba
    a = img[:, :, 3:4].astype(np.float32) / 255.0
    roi = dst[y0:y1, x0:x1].astype(np.float32)
    dst[y0:y1, x0:x1] = (img[:, :, :3] * a + roi * (1 - a)).astype(np.uint8)


def load_overlay(path):
    img = cv2.imread(str(path), cv2.IMREAD_UNCHANGED)
    ys, xs = np.nonzero(img[:, :, 3])
    if not len(ys):
        return None
    y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    return img[y0:y1, x0:x1].copy(), (y0, y1, x0, x1)


# ------------------------------------------------------------------ main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--preview", action="store_true")
    a = ap.parse_args()
    cfg = load_config(a.slug)
    fps, vp, T = cfg["fps"], cfg["viewport"], cfg["timing"]
    build, out_dir = cfg["build_dir"], cfg["out_dir"]
    out_dir.mkdir(parents=True, exist_ok=True)
    (build / "render").mkdir(parents=True, exist_ok=True)
    steps = active_steps(cfg)
    if not steps:
        raise SystemExit("no steps left after the audit")

    def vo(lid):
        return json.loads((build / "vo" / f"{lid}.json").read_text())

    # ---- timeline
    segs, lines = [], []
    intro_len = cfg["intro"]["seconds"]
    segs.append({"kind": "card", "name": "intro", "start": 0.0, "len": intro_len})
    t = intro_len - XFADE
    for i, s in enumerate(steps):
        v = vo(s["id"])
        meta = json.loads((build / "clips" / f"{s['id']}.json").read_text())
        if i == 0 and T["first_line_over_intro"]:
            vo_at = T["first_line_start"]
        else:
            vo_at = t + T["vo_lead"]
        length = max(vo_at + v["duration"] + T["vo_tail"] - t, meta["acted"] + 0.5, 1.2)
        segs.append({"kind": "clip", "name": s["id"], "start": t, "len": length, "meta": meta})
        lines.append({"id": s["id"], "at": vo_at, "vo": v})
        t += length
    outro_vo = vo("99-outro") if cfg.get("outro_script") else None
    outro_start = t - XFADE
    outro_len = cfg["outro"]["min_seconds"]
    if outro_vo:
        lines.append({"id": "99-outro", "at": outro_start + 0.45, "vo": outro_vo})
        outro_len = max(outro_len, 0.45 + outro_vo["duration"] + 1.4)
    segs.append({"kind": "card", "name": "outro", "start": outro_start, "len": outro_len})
    total = outro_start + outro_len
    nframes = int(round(total * fps))
    dry = any(l["vo"].get("dry_run") for l in lines)
    print(f"{cfg['company_name']}: {len(steps)} steps, {total:.1f}s{'  [DRY RUN]' if dry else ''}")
    if total > T["hard_cap_seconds"]:
        raise SystemExit(f"{total:.1f}s is over the {T['hard_cap_seconds']}s hard cap — trim the script")

    # ---- captions
    caps = []
    for l in lines:
        ws = [{**w, "start": w["start"] + l["at"], "end": w["end"] + l["at"]} for w in l["vo"]["words"]]
        caps += chunk_captions(ws, cfg["captions"]["max_chars_per_line"], cfg["captions"]["max_lines"],
                               [cfg["company_name"], *cfg["captions"].get("keep_together", [])])

    # ---- render template pieces
    logo, wdi_logo = abs_path(cfg.get("logo_path")), abs_path(cfg["outro"].get("logo_path"))
    logo = str(logo) if logo and logo.exists() else None
    wdi_logo = str(wdi_logo) if wdi_logo and wdi_logo.exists() else None
    home = build / "home.png"
    base = {"fps": fps, "brand": cfg.get("brand_colour"), "accent": cfg.get("accent_colour"), "company": cfg["company_name"], "intro_line": cfg["intro_line"],
            "logo": logo, "wdi_logo": wdi_logo, "outro": cfg["outro"], "dry": dry}
    R = build / "render"
    jobs = []
    for fmt in ("landscape", "square"):
        jobs.append({"mode": "intro", "format": fmt, "data": {**base, "seconds": intro_len}, "out": str(R / f"intro_{fmt}.mp4")})
        jobs.append({"mode": "outro", "format": fmt, "data": {**base, "seconds": outro_len}, "out": str(R / f"outro_{fmt}.mp4")})
        for i, c in enumerate(caps):
            jobs.append({"mode": "caption", "format": fmt, "data": {"text": c["text"]}, "out": str(R / f"cap_{fmt}_{i:03d}.png")})
    thumb = out_dir / f"{cfg['file_name']}_Thumbnail.png"
    jobs.append({"mode": "thumbnail", "format": "landscape", "data": {**base, "home": str(home) if home.exists() else None}, "out": str(thumb)})
    (R / "job.json").write_text(json.dumps({"jobs": jobs, "info": str(R / "info.json")}))
    subprocess.run(["node", str(PIPELINE / "render.mjs"), str(R / "job.json")], check=True)
    info = json.loads((R / "info.json").read_text())

    caption_px = {fmt: [load_overlay(R / f"cap_{fmt}_{i:03d}.png") for i in range(len(caps))] for fmt in ("landscape", "square")}

    # ---- audio
    n = int(total * SR) + SR
    voice = np.zeros(n, np.float32)
    for l in lines:
        clip = load_audio(build / "vo" / f"{l['id']}.mp3")
        i = int(l["at"] * SR)
        voice[i:i + len(clip)] += clip[: n - i]
    mix = voice.copy()
    mpath = abs_path(cfg["music"].get("path"))
    if mpath and mpath.exists():
        music = load_audio(mpath)
        music = np.tile(music, int(np.ceil(n / len(music))))[:n] * 10 ** (cfg["music"]["gain_db"] / 20)
        env = np.convolve(np.abs(voice), np.ones(int(0.12 * SR)) / int(0.12 * SR), mode="same")
        env = np.clip(env / (env.max() * 0.2 + 1e-9), 0, 1)
        env = np.convolve(env, np.ones(int(0.25 * SR)) / int(0.25 * SR), mode="same")   # smooth attack/release
        duck = 10 ** (cfg["music"]["duck_db"] * env / 20)
        fade = np.minimum(1, np.minimum(np.arange(n) / (0.8 * SR), (total * SR - np.arange(n)) / (1.5 * SR)).clip(0))
        mix += music * duck * fade
    mix = mix[: int(total * SR)]
    peak = np.abs(mix).max()
    if peak > 0:
        mix *= 0.9 / peak
    wav = build / "mix.wav"
    with wave.open(str(wav), "wb") as w:
        w.setnchannels(1); w.setsampwidth(2); w.setframerate(SR)
        w.writeframes((np.clip(mix, -1, 1) * 32767).astype("<i2").tobytes())

    # ---- picture
    files = {"landscape": out_dir / f"{cfg['file_name']}_TradeAccount_Explainer.mp4",
             "square": out_dir / f"{cfg['file_name']}_TradeAccount_Explainer_Square.mp4"}
    sizes = {"landscape": (1920, 1080), "square": (1080, 1080)}
    enc = {}
    for fmt, f in files.items():
        W, H = sizes[fmt]
        af = [] if dry else ["-af", "loudnorm=I=-14:TP=-1.5:LRA=11"]
        enc[fmt] = subprocess.Popen(
            ["ffmpeg", "-y", "-v", "error", "-f", "rawvideo", "-pix_fmt", "bgr24", "-s", f"{W}x{H}", "-r", str(fps), "-i", "-",
             "-i", str(wav), "-map", "0:v", "-map", "1:a", "-c:v", "libx264", "-preset", "veryfast" if a.preview else "slow",
             "-crf", "23" if a.preview else "18", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "192k", "-ar", "48000", *af,
             "-shortest", "-movflags", "+faststart", str(f)], stdin=subprocess.PIPE)

    sources = []
    for sg in segs:
        sf, ef = int(round(sg["start"] * fps)), int(round((sg["start"] + sg["len"]) * fps))
        if sg["kind"] == "card":
            its = {fmt: decode(R / f"{sg['name']}_{fmt}.mp4", *sizes[fmt]) for fmt in sizes}
            sources.append({"sf": sf, "ef": ef, "get": (lambda its: lambda k: {fmt: next(its[fmt]) for fmt in its})(its)})
        else:
            meta = sg["meta"]
            clip = build / "clips" / f"{sg['name']}.mp4"
            cw, ch, _ = probe(clip)
            it = decode(clip, cw, ch)
            land, sq = camera_paths(meta, ef - sf, fps, vp)
            rs = cw / vp["width"]

            def get(k, it=it, land=land, sq=sq, rs=rs):
                src = next(it)
                lx, ly, lz = (p[k] for p in land)
                qx, qy, qz = (p[k] for p in sq)
                frames = {"landscape": view(src, rs, lx, ly, vp["width"] / lz, vp["height"] / lz, 1920, 1080),
                          "square": view(src, rs, qx, qy, vp["height"] / qz, vp["height"] / qz, 1080, 1080)}
                if dry:
                    for fmt, fr in frames.items():
                        cv2.putText(fr, "DRY RUN - NO VOICE", (fr.shape[1] - 330, 40), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (60, 60, 255), 2, cv2.LINE_AA)
                return frames
            sources.append({"sf": sf, "ef": ef, "get": get})

    for f in range(nframes):
        act = [s for s in sources if s["sf"] <= f < s["ef"]]
        got = [(s, s["get"](f - s["sf"])) for s in act]
        out = {}
        for fmt in sizes:
            if len(got) == 1:
                fr = got[0][1][fmt].copy()
            else:
                (s0, a0), (s1, a1) = got[0], got[-1]
                k = (f - s1["sf"]) / max(1, s0["ef"] - s1["sf"])
                fr = cv2.addWeighted(a0[fmt], 1 - k, a1[fmt], k, 0)
            out[fmt] = fr
        tt = f / fps
        for i, c in enumerate(caps):
            if c["start"] <= tt < c["end"]:
                for fmt in sizes:
                    if caption_px[fmt][i] is not None:
                        overlay(out[fmt], caption_px[fmt][i])
        for fmt in sizes:
            enc[fmt].stdin.write(out[fmt].tobytes())
        if f % (fps * 10) == 0:
            print(f"  frame {f}/{nframes}")
    for p in enc.values():
        p.stdin.close()
        p.wait()

    srt = out_dir / f"{cfg['file_name']}_TradeAccount_Explainer.srt"
    srt.write_text("\n".join(f"{i + 1}\n{srt_time(c['start'])} --> {srt_time(c['end'])}\n{c['text']}\n" for i, c in enumerate(caps)))
    timeline = {"total": total, "dry_run": dry, "segments": [{k: v for k, v in s.items() if k != "meta"} for s in segs],
                "lines": [{"id": l["id"], "at": l["at"], "text": l["vo"]["text"], "duration": l["vo"]["duration"]} for l in lines],
                "captions": caps, "render_info": info, "files": {k: str(v) for k, v in files.items()}, "thumbnail": str(thumb),
                "logo_used": logo, "wdi_logo_used": wdi_logo,
                "clip_flags": {s["name"]: s["meta"].get("flags", []) for s in segs if s["kind"] == "clip"},
                "clip_urls": {s["name"]: s["meta"].get("urls", []) for s in segs if s["kind"] == "clip"}}
    (build / "timeline.json").write_text(json.dumps(timeline, indent=1))
    for f in (*files.values(), thumb, srt):
        print(f"  → {f.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
