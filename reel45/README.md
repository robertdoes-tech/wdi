# WDI — 45s showreel

1920×1080, 30 fps, 45 s. Final file: `wdi-showreel-45s.mp4`.

## How it's built

| Layer | Source |
| --- | --- |
| Picture | `public/index.html` + `public/reel.js`: one paused GSAP timeline plus per-frame procedural layers (counters, paper storm, camera shake, grain). `render.mjs` seeks it frame by frame in headless Chromium and pipes the frames to ffmpeg. |
| Brand | WDI mark (vector rebuild of the logo, split into its three stripes so it can animate), DM Sans (the site's typeface), navy `#0A1628` / blue `#3B82F6` / mark gradient `#0B8BE6 → #4848D8`. The "stack wipe" transition is the logo's three stripes. |
| Screens | The real thisiswdi.com screenshots from the Drive folder (`public/img`): home hero, results-by-sector cards, services, DocketPro, CRM, automation, measurable impact, trade portals, websites, process. |
| Voice-over | ElevenLabs `eleven_v4`, voice "John – Irish Man". Cut into phrases and placed on the edit using word timings from ElevenLabs Scribe (`audio.py` → `CUES`). |
| SFX | ElevenLabs `eleven_text_to_sound_v2` whooshes and riser in `audio/`, peak-aligned to the cuts. Booms, stabs, UI ticks, glitch and paper burst are synthesized. |
| Music | Synthesized in `audio.py`: 120 BPM, A minor (vi–IV–I–V). Drops on 4 s (logo), 14 s (sectors), 28 s (showcase), 38 s (end card); a dead-air beat before 28 s lands "gone". Kick sidechain plus VO ducking. |

## Cue sheet

| Time | Scene | VO |
| --- | --- | --- |
| 0–4 | Growth line draws, then flatlines and glitches | "Referrals built your business, but referrals don't scale." |
| 4–8.5 | Stack wipe → WDI mark assembles stripe by stripe; homepage in a 3D browser | "WDI builds and runs outbound sales for Irish B2B firms." |
| 8.5–14 | €100m+ counter over rising bars; 1,000+ with a 400-cell calendar filling | "Over one hundred million euro in lifetime value. More than a thousand meetings booked." |
| 14–21 | One real results card per word (Steel, Pharma, Plant hire, Security), then all seven as a 3D wall | "Steel, pharma, plant hire, security. Real pipeline in months, not years." |
| 21–28 | Services → hard cuts locked to each word (DocketPro, CRM, Timesheets) → 500+ with a paper storm that bursts on "gone" | "Then we automate the admin. Dockets, CRMs, timesheets. Five hundred hours of paperwork, gone." |
| 28–35 | Drop: 3D screen carousel, Measurable Impact bars filling, six beat-synced cuts | — (music feature) |
| 35–38 | Client wall (ECCH, AllTask, SSG Coatings, Kore, LES Loughryan, ProCraft, Hugh Courtney, Shannonside, Walform) | — |
| 38–45 | End card: mark, tagline, cursor clicks "Book your free sales audit", URL types | "WDI. Book your free sales audit at thisiswdi.com." |

## Rebuild

```sh
npm install && pip install numpy scipy
node render.mjs --out=build/video.mp4            # picture (~6 min)
node render.mjs --stills=4.6,30.9 --out=stills   # spot-check frames
python3 audio.py audio build/mix.wav
ffmpeg -i build/video.mp4 -i build/mix.wav -map 0:v -map 1:a -c:v copy \
  -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 256k -shortest -movflags +faststart \
  wdi-showreel-45s.mp4
```

Open `public/index.html` in a browser for a real-time looping preview (picture only).
