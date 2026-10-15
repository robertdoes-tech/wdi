"""Config loading for the Python stages. Mirrors lib/config.mjs."""
import json
import os
import re
from pathlib import Path

PIPELINE = Path(__file__).resolve().parent
ROOT = PIPELINE.parent
DEFAULTS = json.loads((PIPELINE / "defaults.json").read_text())


def _merge(base, over):
    out = dict(base)
    for k, v in (over or {}).items():
        out[k] = _merge(base[k], v) if isinstance(v, dict) and isinstance(base.get(k), dict) else v
    return out


def file_stem(name):
    words = re.sub(r"[^A-Za-z0-9]+", " ", name.replace("&", "And")).split()
    return "".join(w[0].upper() + w[1:] for w in words)


def load_config(slug_or_path):
    p = Path(slug_or_path)
    f = p.resolve() if p.suffix == ".json" else ROOT / "configs" / f"{slug_or_path}.json"
    raw = json.loads(f.read_text())
    cfg = _merge(DEFAULTS, raw)
    cfg["voice"] = {**cfg["voice"], "voice_id": raw.get("voice_id") or cfg["voice"]["voice_id"]}
    cfg.setdefault("intro_line", None)
    cfg["intro_line"] = cfg["intro_line"] or cfg["intro"]["line_template"].format(company_name=cfg["company_name"])
    cfg["file_name"] = cfg.get("file_name") or file_stem(cfg["company_name"])
    cfg["config_file"] = f
    cfg["out_dir"] = ROOT / "output" / cfg["file_name"]
    cfg["build_dir"] = ROOT / "build" / cfg["slug"]
    if len(cfg["script"]) != len(cfg["steps"]):
        raise SystemExit(f"{cfg['slug']}: {len(cfg['script'])} script lines but {len(cfg['steps'])} steps")
    return cfg


def active_steps(cfg):
    audit = cfg.get("audit") or {}
    confirmed, dropped = set(audit.get("confirmed", [])), set(audit.get("dropped_steps", []))
    out = []
    for i, s in enumerate(cfg["steps"]):
        if s["name"] in dropped or not all(r in confirmed for r in s.get("requires", [])):
            continue
        out.append({**s, "index": i, "line": cfg["script"][i], "id": f"{i + 1:02d}-{s['name']}"})
    return out


def abs_path(p):
    return (ROOT / p).resolve() if p else None


def is_placeholder(cfg):
    url = cfg.get("live_url") or ""
    return not re.match(r"https?://", url) or bool(re.search(r"\[|\]|TODO|TBC|placeholder|example\.(com|org)", url, re.I))
