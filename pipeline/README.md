# Demo video pipeline (reference)

Same stack as `showreel/`: HTML + GSAP rendered frame by frame in headless Chromium, ffmpeg, a Python mix.
How to run a company end to end is in `/NOTES.md`. This file is the reference for configs and the action list.

## Stages

| Stage | Script | In | Out |
|---|---|---|---|
| audit | `audit.mjs` | config | `output/<Co>/audit/AUDIT.md` + screenshots. Read-only except one add-to-basket. **Stops here for review.** |
| voice | `voice.py` | script lines | `build/<slug>/vo/NN-step.mp3` + `.json` (word timings), one file per line, cached |
| record | `record.mjs` | steps, voice lengths | `build/<slug>/clips/NN-step.mp4` + `.json` (cursor path, zoom targets, on-screen flags) |
| assemble | `assemble.py` | all of the above | `output/<Co>/<Co>_TradeAccount_Explainer.mp4`, `…_Square.mp4`, `<Co>_Thumbnail.png`, `.srt` |
| qa | `qa.py` | timeline | `output/<Co>/QA.md`, non-zero exit on any FAIL |

`demo.mjs <slug> build` runs voice → record → assemble → qa, and refuses unless the audit is approved.

## Config (`configs/<slug>.json`)

| Key | Notes |
|---|---|
| `company_name`, `slug` | Name exactly as the client spells it. File names come from it (`file_name` overrides) |
| `live_url` | The published app (`*.replit.app` or custom domain), never the editor. Placeholder → skipped |
| `demo_login` | `{user, password}`. Either value can be `"env:VAR_NAME"` to keep it out of git |
| `login_selectors` | Optional `{user, password, submit}` if the generic login finder misses |
| `logo_path`, `brand_colour` | Logo PNG/SVG (transparent is best; it sits on a white card). Brand colour drives the intro, outro pill and cursor ripple |
| `voice_id` | Defaults to Joe (`yWs0htDxddBoX2qwSDfZ`). Model/settings in `defaults.json` |
| `intro_line` | Defaults to "Your trade account, built for {company_name}" |
| `pronunciations` | `{"Quinlan": "Kwinlan"}`. TTS text only; captions keep the real spelling. Keep the same word count |
| `script` | One line per step, same order as `steps` |
| `outro_script` | Spoken over the outro card |
| `steps` | See below |
| `audit` | `{approved, confirmed: [...], dropped_steps: [...]}`. Steps whose `requires` aren't all confirmed are dropped with their line |
| `audit_search_term` | Word the audit types into search |
| `captions.keep_together` | Extra phrases never split across two captions (the company name always is) |

Anything in `defaults.json` (timing, outro text, music, caption width) can be overridden per company.

### Step

```json
{ "name": "order", "requires": ["basket", "submit_order"], "start_url": "/products",
  "setup": [ ...not recorded... ], "actions": [ ...recorded... ],
  "zoom_target": ".price", "zoom": 1.6, "thumbnail": true, "hold_ms": 900 }
```

`requires` keys: `login, pricing, search_browse, basket, delivery_collection, submit_order, past_orders, reorder, invoices_balance`.
`zoom_target`: if nothing in the step zoomed, post zooms here at the end of the actions and holds.
`thumbnail: true`: the screen at the end of this step is the thumbnail background.

### Actions

Selectors are Playwright selectors (CSS, `:has-text('…')`, `text=…`, `>> nth=0`). Add `"zoom": true` (or a number) to any
pointing action to zoom in on that element in post. `"pause": ms` overrides the pause after it (default 650 ms).

| Action | Effect |
|---|---|
| `{"login": true}` | Types the demo login and submits (`"instant"` fills without typing) |
| `{"click": sel}` | Glide the cursor there (eased, slight arc), click, wait for the page |
| `{"hover": sel}` | Glide there |
| `{"type": sel, "text": "…"}` | Click in and type with a human cadence (long strings capped at ~1.3 s) |
| `{"fill": sel, "text": "…"}` | Instant fill (use in `setup`) |
| `{"press": "Enter"}` | Key press |
| `{"select": sel, "value": "…"}` / `{"check": sel}` | Dropdowns / checkboxes and radios |
| `{"scroll": 400}` / `{"scroll_to": sel}` | Smooth wheel scroll |
| `{"focus": sel}` | Zoom on something without touching it (a price, a balance) |
| `{"goto": "/path"}` | Navigate (relative to `live_url`) |
| `{"wait": ms}` / `{"wait_for": sel}` / `{"eval": "js"}` | Timing and escape hatch |

## Template

`template/template.html`: intro (3 s logo card + intro line), outro (≥4 s: "Want this live for your customers?",
"Reply to this message", "Joe, WDI", WDI logo from `assets/wdi/wdi-logo.png`), captions (Inter 800, white in a dark box,
bottom third, max two lines, shrinks to fit), thumbnail. Change the look there once; every company picks it up.
Music: set `music.path` in `defaults.json` (ducked under the voice); off by default.

## Self-test

```sh
python3 -m http.server 8765 -d pipeline/test/portal &
node pipeline/demo.mjs _test-portal build --test --dry-run
```
Records the local fixture portal with silent placeholder audio. QA fails it on purpose ("dry run").
