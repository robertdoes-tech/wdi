"""Step 4: one ElevenLabs call per script line, saved as its own file with word timings.

    python3 pipeline/voice.py <slug>                  # generate anything new or changed (cached by text + settings)
    python3 pipeline/voice.py <slug> --line 5 --force # regenerate just line 5
    python3 pipeline/voice.py <slug> --names "Quinlan, Rosanna"   # pronunciation test clip, nothing else
    python3 pipeline/voice.py <slug> --dry-run        # silent placeholder audio with estimated timings (pipeline testing only)

Key: ELEVENLABS_API_KEY in the environment (never in a config file).
Respellings live in config "pronunciations": {"Quinlan": "Kwinlan"}. They change only what is sent to
ElevenLabs; captions always use the script's real spelling.
"""
import argparse
import base64
import hashlib
import json
import os
import re
import subprocess
import sys
import urllib.error
import urllib.request

sys.path.insert(0, os.path.dirname(__file__))
from common import active_steps, load_config  # noqa: E402

API = "https://api.elevenlabs.io/v1/text-to-speech/{voice}/with-timestamps?output_format={fmt}"


def lines_for(cfg):
    out = [(s["id"], s["line"]) for s in active_steps(cfg)]
    if cfg.get("outro_script"):
        out.append(("99-outro", cfg["outro_script"]))
    return out


def respell(text, table):
    for real, said in table.items():
        text = re.sub(rf"\b{re.escape(real)}\b", said, text)
    return text


def tts(text, voice, key):
    body = {
        "text": text,
        "model_id": voice["model_id"],
        "voice_settings": {k: voice[k] for k in ("stability", "similarity_boost", "style")},
    }
    req = urllib.request.Request(
        API.format(voice=voice["voice_id"], fmt=voice["output_format"]),
        data=json.dumps(body).encode(),
        headers={"xi-api-key": key, "content-type": "application/json", "accept": "application/json"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return json.loads(r.read())
    except urllib.error.HTTPError as e:
        raise SystemExit(f"ElevenLabs {e.code}: {e.read().decode()[:400]}")


def words_from_alignment(al):
    words, cur = [], None
    for ch, a, b in zip(al["characters"], al["character_start_times_seconds"], al["character_end_times_seconds"]):
        if ch.isspace():
            if cur:
                words.append(cur)
            cur = None
        elif cur is None:
            cur = {"w": ch, "start": a, "end": b}
        else:
            cur["w"] += ch
            cur["end"] = b
    if cur:
        words.append(cur)
    return words


def caption_words(line, spoken):
    """Pair the script's real words with the timings of what was actually spoken."""
    real = line.split()
    if len(real) == len(spoken):
        return [{"w": r, "start": s["start"], "end": s["end"]} for r, s in zip(real, spoken)]
    print(f"  ! respelling changed the word count ({len(spoken)} spoken vs {len(real)} written); spreading timings proportionally")
    t0, t1 = spoken[0]["start"], spoken[-1]["end"]
    total = sum(len(w) for w in real)
    out, acc = [], 0
    for w in real:
        a = t0 + (t1 - t0) * acc / total
        acc += len(w)
        out.append({"w": w, "start": a, "end": t0 + (t1 - t0) * acc / total})
    return out


def estimate_words(line):
    t, out = 0.12, []
    for w in line.split():
        d = 0.14 + 0.058 * len(re.sub(r"\W", "", w))
        out.append({"w": w, "start": round(t, 3), "end": round(t + d, 3)})
        t += d + (0.32 if re.search(r"[.!?]$", w) else 0.16 if re.search(r"[,;:]$", w) else 0.03)
    return out, t + 0.1


def probe_duration(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", path], capture_output=True, text=True)
    return float(r.stdout.strip())


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("slug")
    ap.add_argument("--line", type=int, help="1-based step number to (re)generate")
    ap.add_argument("--force", action="store_true")
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--names", help="comma-separated names: write a test clip to check pronunciation")
    a = ap.parse_args()
    cfg = load_config(a.slug)
    voice, table = cfg["voice"], cfg.get("pronunciations") or {}
    key = os.environ.get("ELEVENLABS_API_KEY") or os.environ.get("XI_API_KEY")
    if not key and not a.dry_run:
        raise SystemExit("Set ELEVENLABS_API_KEY (or use --dry-run for a silent test build).")
    vo_dir = cfg["build_dir"] / "vo"
    vo_dir.mkdir(parents=True, exist_ok=True)

    if a.names:
        names = [n.strip() for n in a.names.split(",")]
        text = respell(". ".join(names) + f". Hi, it's Joe from WDI. We built a demo trade portal for {cfg['company_name']}.", table)
        res = tts(text, voice, key)
        out = vo_dir / "name-test.mp3"
        out.write_bytes(base64.b64decode(res["audio_base64"]))
        print(f"Sent: {text}\nListen: {out}\nIf a name is wrong, add a respelling to \"pronunciations\" and rerun.")
        return

    for lid, line in lines_for(cfg):
        if a.line and not lid.startswith(f"{a.line:02d}-"):
            continue
        said = respell(line, table)
        sig = hashlib.sha1(json.dumps([said, voice, a.dry_run], sort_keys=True).encode()).hexdigest()[:12]
        meta_path, mp3 = vo_dir / f"{lid}.json", vo_dir / f"{lid}.mp3"
        if meta_path.exists() and mp3.exists() and not a.force and json.loads(meta_path.read_text()).get("sig") == sig:
            print(f"  = {lid} (cached)")
            continue
        if a.dry_run:
            words, dur = estimate_words(line)
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", f"{dur:.3f}", "-q:a", "9", str(mp3)], check=True)
        else:
            res = tts(said, voice, key)
            mp3.write_bytes(base64.b64decode(res["audio_base64"]))
            al = res.get("alignment") or res.get("normalized_alignment")
            if al:
                words = caption_words(line, words_from_alignment(al))
            else:
                print("  ! no alignment returned; caption timings estimated")
                words = estimate_words(line)[0]
        dur = probe_duration(str(mp3))
        meta = {"id": lid, "text": line, "tts_text": said, "words": words, "duration": dur, "sig": sig, "dry_run": a.dry_run, "voice": voice}
        meta_path.write_text(json.dumps(meta, indent=1))
        print(f"  + {lid} {dur:5.2f}s  {line[:70]}{'…' if len(line) > 70 else ''}")


if __name__ == "__main__":
    main()
