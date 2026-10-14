# Trim Formworks — 30s showreel

1920×1080, 30 fps, 30 s. Final file: `trim-formworks-showreel-30s.mp4`.

## How it's built

| Layer | Source |
| --- | --- |
| Picture | `public/index.html`: a single GSAP timeline (paused) driving HTML/CSS/SVG. `render.mjs` seeks it frame by frame in headless Chromium and pipes the frames to ffmpeg. |
| Brand | Wordmark, green `#2B9A3E`, navy `#0B1A2E`, Barlow Condensed + Inter (the site's fonts), fleet photos, client logos and the real site screens from the Drive folder (`public/img`). |
| Voice-over | ElevenLabs `eleven_v4`, voice "Darren – Calm Masculine Irish Storyteller". Cut into phrases and placed against word timings from ElevenLabs Scribe (`audio.py` → `CUES`). |
| SFX | ElevenLabs `eleven_text_to_sound_v2`: whooshes, risers and impacts in `audio/`, peak-aligned to the cuts. UI ticks are synthesized. |
| Music | Synthesized in `audio.py`: 120 BPM, D minor (i–VI–III–VII). Every bar line lands on a cut (4 s slam, 8 s stats, 16 s product breakdown, 20 s drop, 24 s end card). Kick sidechain plus VO ducking. |

## Cue sheet

| Time | Scene | VO |
| --- | --- | --- |
| 0.0–4.0 | "2009" odometer → slit reveal of the Leopardstown site | "Since two thousand and nine… we've been shaping Ireland's skyline." |
| 4.0–8.0 | Kinetic type: SHUTTERING FORMWORK / REINFORCED CONCRETE, rebar mesh, dimension lines | "Shuttering formwork. Reinforced concrete." |
| 8.0–12.5 | Track record: 100,000+ m³ counter with a filling iso cube, then 140+ people grid | "Over one hundred thousand cubic metres poured. One hundred and forty people strong." |
| 12.5–16.5 | Fleet: four slanted-slice cuts, then a 4-up | "Our own fleet — on site, on time." |
| 16.5–20.0 | Product showcase: 3D browser stack, cursor clicks Projects, push-in to the clients row | — (music feature) |
| 20.0–24.0 | Clients: Bennett, PJ Hegarty, Collen, Walls | "Trusted by the contractors who build Dublin." |
| 24.0–30.0 | End card: wordmark, tagline, "Get an estimate" CTA, trimformworks.ie | "Trim Formworks. Precision-engineered concrete. Get your estimate today." |

## Rebuild

```sh
npm install
node render.mjs --out=build/video.mp4            # picture (~3 min)
node render.mjs --stills=4.7,17.5 --out=stills   # spot-check frames
python3 audio.py audio build/mix.wav             # needs numpy + scipy
ffmpeg -i build/video.mp4 -i build/mix.wav -map 0:v -map 1:a -c:v copy \
  -af loudnorm=I=-14:TP=-1:LRA=11 -c:a aac -b:a 256k -shortest -movflags +faststart \
  trim-formworks-showreel-30s.mp4
```

Open `public/index.html` in a browser for a real-time looping preview.

## Site loop — 10s hero background

`site-loop-10s.mp4`: 1920×1080, 30 fps, 10 s, silent, seamless loop. Slow push-in/dolly on the Leopardstown site photo (`img/hero-site-2400.jpg`, a Lanczos upscale of `hero-site.jpg`), warm desaturated golden-hour grade, faked shallow depth of field (blurred copy masked above and below the working deck), bokeh, looping film grain, and translucent glass cards for email replies and calendar confirmations.

The camera move runs 11.5 s; the first 1.5 s crossfades the tail of the move over the head, so the last frame flows into the first. Cards, flare, bokeh and grain are all periodic in 10 s.

```sh
node render.mjs --page=loop.html --seconds=10 --out=build/loop.mp4
ffmpeg -i build/loop.mp4 -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -an -movflags +faststart site-loop-10s.mp4
```

Open `public/loop.html` in a browser for a real-time preview.

## Ireland network loop — 10s

`ireland-network-loop-10s.mp4`: 1920×1080, 30 fps, 10 s, silent, seamless loop. Dark tilted aerial map of Ireland (Natural Earth 1:10m coastline via `world-atlas`, pre-projected into `public/ireland-geo.js`), dot-matrix fill with a slow wave rolling out from the centre, dashed route arcs from Dublin, Cork, Limerick and Galway, light pulses travelling each route into a central hub (Athlone) with a ripple on every arrival, gentle orbiting camera, subtle grain. All motion is periodic in 10 s.

```sh
node render.mjs --page=ireland.html --seconds=10 --out=build/ireland.mp4
ffmpeg -i build/ireland.mp4 -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -an -movflags +faststart ireland-network-loop-10s.mp4
```
