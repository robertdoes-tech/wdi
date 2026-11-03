#!/usr/bin/env bash
# Full pipeline. Expects the clips in ./raw (and optionally tracks in ./music).
set -euo pipefail
cd "$(dirname "$0")/.."
command -v ffmpeg >/dev/null || { sudo apt-get update && sudo apt-get install -y ffmpeg; }
python3 reels/analyze.py raw work                       # frames + sheets in work/sheets, scores in work/analysis.json
# review work/sheets/*.jpg, set "center" overrides in reels/plan.json if needed, then:
MUSIC=(); [ -d music ] && [ -n "$(ls -A music)" ] && MUSIC=(--music music)
python3 reels/build.py reels/plan.json raw work final "${MUSIC[@]}"
