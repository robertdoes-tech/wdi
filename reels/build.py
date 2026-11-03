#!/usr/bin/env python3
"""Render the Reels ads described in plan.json.

plan.json:
  {"target": 9.0,
   "ads": {"1": {"clips": ["18 58 20", ...],          # in order
                 "transition": "fade", "xfade": 0.35,  # ffmpeg xfade type / seconds
                 "center": {"18 58 20": 3.1},          # optional: centre (s) of the window to use;
                                                       # defaults to analysis.json's best window
                 "length": {"19 02 32": 1.6}}}}        # optional: fixed segment length (s)
Segment lengths are solved so the cut lands on `target` seconds:
  sum(segments) - (n-1) * xfade = target
Short clips give their whole usable length; the rest is shared across the longer ones.

Usage: python3 build.py PLAN RAW_DIR WORK_DIR OUT_DIR [--music DIR] [ad ...]
"""
import argparse, json, subprocess
from pathlib import Path

ap = argparse.ArgumentParser()
ap.add_argument("plan"); ap.add_argument("raw"); ap.add_argument("work"); ap.add_argument("out")
ap.add_argument("--music", help="folder of tracks, rotated across ads (omit for a silent AAC track)")
ap.add_argument("ads", nargs="*")
a = ap.parse_args()

plan = json.loads(Path(a.plan).read_text())
analysis = json.loads((Path(a.work) / "analysis.json").read_text())
RAW, OUT = Path(a.raw), Path(a.out)
OUT.mkdir(parents=True, exist_ok=True)
TARGET = plan.get("target", 9.0)
EDGE = 0.1   # never use the first/last 0.1 s of a clip
tracks = sorted(p for p in Path(a.music).iterdir()
                if p.suffix.lower() in {".mp3", ".wav", ".m4a", ".aac", ".flac", ".ogg"}) if a.music else []


def solve_lengths(avail, total):
    """Equal shares, capped by each clip's usable length; leftover goes to the others."""
    n, lens, free = len(avail), [0.0] * len(avail), set(range(len(avail)))
    remaining = total
    while free:
        share = remaining / len(free)
        capped = [i for i in free if avail[i] < share]
        if not capped:
            for i in free:
                lens[i] = share
            break
        for i in capped:
            lens[i] = avail[i]; remaining -= avail[i]; free.discard(i)
    return lens


def windows(ad):
    clips, d = ad["clips"], ad["xfade"]
    info = [analysis[c] for c in clips]
    avail = [i["duration"] - 2 * EDGE for i in info]
    need = TARGET + (len(clips) - 1) * d
    fixed = ad.get("length", {})
    free = [i for i, c in enumerate(clips) if c not in fixed]
    part = solve_lengths([avail[i] for i in free], need - sum(fixed.values()))
    lens = [fixed.get(c, 0.0) for c in clips]
    for i, L in zip(free, part):
        lens[i] = L
    if sum(lens) + 1e-6 < need:
        raise SystemExit(f"clips too short: {sum(lens):.2f}s available, need {need:.2f}s")
    out = []
    for c, inf, L in zip(clips, info, lens):
        centre = ad.get("center", {}).get(c, inf["suggest_start"] + inf["suggest_len"] / 2)
        start = min(max(EDGE, centre - L / 2), inf["duration"] - EDGE - L)
        out.append((c, round(start, 3), round(L, 3)))
    return out


def render(num, ad, track):
    segs, d, tr = windows(ad), ad["xfade"], ad["transition"]
    cmd = ["ffmpeg", "-v", "error", "-y"]
    for c, start, L in segs:
        cmd += ["-ss", f"{start}", "-t", f"{L + 0.2}", "-i", str(RAW / analysis[c]["file"])]
    fg = []
    for i, (_, _, L) in enumerate(segs):
        fg.append(f"[{i}:v]trim=duration={L},setpts=PTS-STARTPTS,"
                  "scale=1080:1920:force_original_aspect_ratio=increase:flags=lanczos,"
                  f"crop=1080:1920,fps=30,setsar=1,format=yuv420p[v{i}]")
    last, t = "v0", segs[0][2]
    for i in range(1, len(segs)):
        off = t - d
        fg.append(f"[{last}][v{i}]xfade=transition={tr}:duration={d}:offset={off:.3f}[x{i}]")
        last, t = f"x{i}", off + segs[i][2]
    total = round(t, 3)
    fg.append(f"[{last}]trim=duration={total},setpts=PTS-STARTPTS[vout]")
    n = len(segs)
    if track:
        cmd += ["-i", str(track)]
        fg.append(f"[{n}:a]atrim=duration={total},asetpts=PTS-STARTPTS,"
                  f"afade=t=in:d=0.3,afade=t=out:st={total - 0.5:.3f}:d=0.5,"
                  "aresample=48000,aformat=channel_layouts=stereo[aout]")
    else:
        cmd += ["-f", "lavfi", "-t", f"{total}", "-i", "anullsrc=r=48000:cl=stereo"]
        fg.append(f"[{n}:a]atrim=duration={total}[aout]")
    dst = OUT / f"ad_{int(num):02d}.mp4"
    cmd += ["-filter_complex", ";".join(fg), "-map", "[vout]", "-map", "[aout]",
            "-c:v", "libx264", "-preset", "slow", "-crf", "18", "-profile:v", "high",
            "-pix_fmt", "yuv420p", "-r", "30", "-g", "60",
            "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2",
            "-movflags", "+faststart", "-t", f"{total}", str(dst)]
    subprocess.run(cmd, check=True)
    return dst, segs, total


def sheet(video, dst):
    """Every 0.5 s of the finished ad, tiled 6 across."""
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-i", str(video), "-vf",
                    "fps=2,scale=216:384,tile=6x3:padding=6:margin=6:color=white",
                    "-frames:v", "1", "-q:v", "3", str(dst)], check=True)


log = {}
for idx, (num, ad) in enumerate(sorted(plan["ads"].items(), key=lambda kv: int(kv[0]))):
    if a.ads and num not in a.ads:
        continue
    track = tracks[idx % len(tracks)] if tracks else None
    dst, segs, total = render(num, ad, track)
    sheet(dst, OUT / f"ad_{int(num):02d}_sheet.jpg")
    log[num] = dict(total=total, transition=ad["transition"], xfade=ad["xfade"],
                    music=track.name if track else None,
                    segments=[dict(clip=c, start=s, length=L) for c, s, L in segs])
    print(f"ad_{int(num):02d}  {total:.2f}s  {ad['transition']} {ad['xfade']}s  "
          f"music={track.name if track else 'none'}  " +
          "  ".join(f"{c}@{s:.2f}+{L:.2f}" for c, s, L in segs))
(OUT / "edit_log.json").write_text(json.dumps(log, indent=1))
