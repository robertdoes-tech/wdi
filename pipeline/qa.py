"""Step 6: QA before handing back. Writes output/<CompanyName>/QA.md and exits non-zero on any FAIL.

    python3 pipeline/qa.py <slug>
"""
import difflib
import json
import os
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, os.path.dirname(__file__))
from common import PIPELINE, ROOT, load_config  # noqa: E402

# US spellings that slip into captions, and the UK form we want.
US_UK = {r"\bcolor": "colour", r"\bfavor": "favour", r"\bcenter\b": "centre", r"\borganiz": "organis", r"\bcustomiz": "customis",
         r"\boptimiz": "optimis", r"\brealiz": "realis", r"\bprioritiz": "prioritis", r"\bpersonaliz": "personalis",
         r"\bcatalog\b": "catalogue", r"\bcheck(s)? out\b(?= the| your)": "", r"\blicense\b": "licence (noun)", r"\bprogram\b": "programme",
         r"\bjewelry\b": "jewellery", r"\btraveled\b": "travelled", r"\bcanceled\b": "cancelled", r"\bdialog\b": "dialogue",
         r"\banalyz": "analys", r"\bbehavior": "behaviour", r"\blabor\b": "labour", r"\bneighbor": "neighbour", r"\bgray\b": "grey",
         r"\bpercent\b": "per cent", r"\bfulfill\b": "fulfil", r"\benroll\b": "enrol", r"\bmeter\b": "metre"}
US_UK = {k: v for k, v in US_UK.items() if v}


def probe(path):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "stream=codec_type,width,height:format=duration", "-of", "json", str(path)],
                       capture_output=True, text=True)
    return json.loads(r.stdout) if r.returncode == 0 else None


def spell_words(text):
    try:
        from spellchecker import SpellChecker  # pip install pyspellchecker (optional)
    except ImportError:
        return None
    sc = SpellChecker(language="en")
    toks = re.findall(r"[A-Za-z][A-Za-z']+", text)
    return sorted({t for t in sc.unknown([t.lower() for t in toks if not t[0].isupper()])})


def main():
    cfg = load_config(sys.argv[1])
    build, out_dir = cfg["build_dir"], cfg["out_dir"]
    tl = json.loads((build / "timeline.json").read_text())
    rows = []

    def check(name, ok, detail, warn=False):
        rows.append(("PASS" if ok else ("WARN" if warn else "FAIL"), name, detail))

    name = cfg["company_name"]
    caption_text = " ".join(c["text"] for c in tl["captions"])
    # company name: exact everywhere it should appear, and no near-misses
    check("Company name in intro line", name in cfg["intro_line"], f'"{cfg["intro_line"]}"')
    toks = name.split()
    near = []
    for i in range(len(caption_text.split()) - len(toks) + 1):
        cand = " ".join(re.sub(r"[^\w'&]", "", w) for w in caption_text.split()[i:i + len(toks)])
        r = difflib.SequenceMatcher(None, cand.lower(), name.lower()).ratio()
        if 0.8 <= r < 1 or (r == 1 and cand != name):
            near.append(cand)
    check("Company name spelling in captions", not near, f"near-misses: {near}" if near else
          (f'"{name}" appears {caption_text.count(name)}x, all exact' if name in caption_text else "not spoken (fine)"))
    for k in ("landscape", "square"):
        check(f"Company name in {k} filename", Path(tl["files"][k]).name.startswith(cfg["file_name"]), Path(tl["files"][k]).name)

    # logo in first 3 seconds (intro card renders the logo at 0.05–0.75s)
    intro = [i for i in tl["render_info"] if "intro_" in i["out"]]
    logo_ok = bool(tl["logo_used"]) and all(i["card"] and i["card"]["logoLoaded"] for i in intro)
    check("Logo visible in first 3s", logo_ok, "client logo loaded on both intro cards" if logo_ok else "logo file missing or failed to load — intro shows the company name as text")
    check("WDI logo on outro", bool(tl["wdi_logo_used"]), tl["wdi_logo_used"] or "assets/wdi/wdi-logo.png missing — outro shows a WDI wordmark", warn=True)

    # captions: UK spelling, spell check, script fidelity, 2 lines max
    us = [f'{m.group(0)}→{v}' for k, v in US_UK.items() for m in re.finditer(k, caption_text, re.I)]
    check("Captions: UK spelling", not us, ", ".join(us) or "no US spellings found")
    unknown = spell_words(caption_text)
    if unknown is None:
        check("Captions: spell check", False, "pyspellchecker not installed (pip install pyspellchecker); US/UK list only", warn=True)
    else:
        check("Captions: spell check", not unknown, f"unknown words (check by eye): {unknown}" if unknown else "all words recognised", warn=True)
    script = " ".join(l["text"] for l in tl["lines"])
    check("Captions match script word for word", caption_text.split() == script.split(), "captions use the written script, not the respelt TTS text")
    caps_info = [i for i in tl["render_info"] if "/cap_" in i["out"]]
    over = [Path(i["out"]).name for i in caps_info if i["caption"] and i["caption"]["lines"] > 2]
    check("Captions: max 2 lines", not over, f"overflow: {over}" if over else f"{len(tl['captions'])} captions")

    # on-screen content
    flags = {k: v for k, v in tl["clip_flags"].items() if v}
    check("No test data / broken pages on screen", not flags, "; ".join(f"{k}: {v}" for k, v in flags.items()) or "text scan clean on every step")
    editor = [u for us_ in tl["clip_urls"].values() for u in us_ if re.search(r"replit\.com|\.replit\.dev|\.repl\.co", u)]
    check("No Replit editor on screen", not editor, ", ".join(editor) or "only the published app was recorded")

    # duration + formats
    total = tl["total"]
    check("Length under 90s", total <= cfg["timing"]["target_seconds"], f"{total:.1f}s", warn=total <= cfg["timing"]["hard_cap_seconds"])
    for k, size in (("landscape", (1920, 1080)), ("square", (1080, 1080))):
        p = probe(tl["files"][k])
        if not p:
            check(f"{k} export", False, "missing")
            continue
        v = next(s for s in p["streams"] if s["codec_type"] == "video")
        has_a = any(s["codec_type"] == "audio" for s in p["streams"])
        dur = float(p["format"]["duration"])
        check(f"{k} export", (v["width"], v["height"]) == size and has_a and abs(dur - total) < 0.5,
              f'{v["width"]}x{v["height"]}, {dur:.1f}s, audio {"yes" if has_a else "NO"}')
    check("Thumbnail", Path(tl["thumbnail"]).exists(), Path(tl["thumbnail"]).name)
    check("Real voiceover (not dry run)", not tl["dry_run"], "dry-run build: silent placeholder audio, not for clients" if tl["dry_run"] else cfg["voice"]["voice_id"])

    fails = [r for r in rows if r[0] == "FAIL"]
    md = (f"# QA: {name}\n\n**{'READY' if not fails else 'NOT READY'}** · {total:.1f}s · {len(tl['lines'])} voice lines\n\n"
          "| | Check | Detail |\n|---|---|---|\n" + "\n".join(f"| {s} | {n} | {d} |" for s, n, d in rows) +
          "\n\n## Script as captioned\n\n" + "\n".join(f"- `{l['id']}` ({l['duration']:.1f}s) {l['text']}" for l in tl["lines"]) + "\n")
    (out_dir / "QA.md").write_text(md)
    print(md)
    sys.exit(1 if fails else 0)


if __name__ == "__main__":
    main()
