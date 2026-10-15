# Client demo videos: how to run one

60 to 90 second walkthroughs of a live Replit trade portal, with Joe's ElevenLabs voice, burned-in captions, a branded intro and outro, and landscape and square exports. Code lives in `pipeline/` (reference: `pipeline/README.md`). Each company is one file, `configs/<slug>.json`.

## Current state (15 Oct 2026)

| Company | Config | Status |
|---|---|---|
| Southern Gas Supplies | `configs/southern-gas-supplies.json` | **Skipped:** URL, login and logo are still placeholders |
| Southern Building Products (SBP Trade Portal) | `configs/southern-building-products.json` | **Skipped:** placeholders |
| The Traditional Lime Company | `configs/traditional-lime-company.json` | **Skipped:** placeholders |
| Michael Quinlan Motors | `configs/michael-quinlan-motors.json` | **Skipped:** placeholders |
| ECCH docket system | not started | Waiting on the live link, the flow and a clean demo account from Cameron and Jack. Use `intro.line_template` / `intro_line` "Your docket system, built for ECCH" |

Each script is already split into one line per step, and every step lists the screens it `requires`. The step selectors are first guesses because nobody has seen the portals yet. Fix them after the audit.

The pipeline was tested end to end against a local stand-in portal (`pipeline/test/portal`) with silent placeholder audio. The real ElevenLabs call and the real portals have not been run: the cloud session's network policy blocked `api.elevenlabs.io` and `*.replit.app`.

## One-off setup

```sh
cd pipeline && npm install && npx playwright install chromium && cd ..
pip install -r pipeline/requirements.txt          # ffmpeg must be on PATH
export ELEVENLABS_API_KEY=...                      # never put the key in a config
```

Put the WDI logo at `assets/wdi/wdi-logo.png`. Until it's there, the outro shows a "WDI" wordmark and QA warns.

## A new company, end to end

1. **Config.** Copy the closest `configs/*.json` to `configs/<slug>.json`. Fill in `company_name` (spelt exactly as the client spells it), `live_url` (the published app, never the editor), `demo_login`, `logo_path` (drop the file in `assets/<slug>/`), `brand_colour` and `script`. Keep one script line per step. `node pipeline/demo.mjs status` shows what's still a placeholder.
2. **Audit, then stop.** `node pipeline/demo.mjs <slug> audit` logs in and checks each screen: login, pricing, search, basket, delivery vs collection, submit, past orders, reorder, invoices. It takes screenshots and flags lorem ipsum, test data, £0.00, error pages and Replit branding. Read `output/<Co>/audit/AUDIT.md` and the screenshots, and send them over for sign-off before recording.
3. **Apply the audit.** Rerun with `--write`, or paste the `audit` block into the config. Add anything marked "needs check" that's actually fine, then set `"approved": true`. Steps that need a missing screen drop out automatically, along with their script line. If a line covers two screens and only one exists (for example "every past order and invoice"), edit the wording by hand.
4. **Fix the step selectors** against the screenshots: real button text, the price element, the basket link. Use `setup` to empty the basket or open the right page before a step, so each step starts clean.
5. **Names.** Run `python3 pipeline/voice.py <slug> --names "Quinlan, Rosanna"` and listen to `build/<slug>/vo/name-test.mp3`. Add a respelling to `pronunciations` only if a name comes out wrong. "Clonmel" and "Southern Gas Supplies" are fine as written.
6. **Build.** Run `node pipeline/demo.mjs <slug> build`. This does voice, then record, then assemble, then QA, and takes about 6 minutes. Add `--preview` for a fast encode while you iterate.
7. **QA.** Read `output/<Co>/QA.md`, watch both MP4s and send the folder.

### Fixing one thing without redoing everything

- **One voice line:** `python3 pipeline/voice.py <slug> --line 4 --force`, then `node pipeline/demo.mjs <slug> assemble`. Lines are cached by text and settings, so editing a line's text and rerunning `voice` only regenerates that line.
- **A step looks wrong:** fix its actions, then `record` and `assemble` (re-recording is ~2 min).
- **A caption break or the outro card:** `assemble` only.

## How it fits together

- **Recording:** Chromium's screencast at 2x pixel density (~55 fps while the cursor moves), one clip per step. Each clip is held at least as long as its voice line. The cursor is drawn into the page and glides on an eased arc, with a pause after every action. The recorder logs where the cursor was and what to zoom on.
- **Post:** zoom and pan are computed from those logs, so they're smooth, sub-pixel and never letterboxed. The square cut follows the cursor and the zoom targets, so the UI being used stays in shot.
- **Timing:** the first line ("Hi, it's Joe from WDI…") starts over the intro card. Each later line starts 0.3 s into its clip. If the on-screen actions take longer than the line, the clip simply runs on. The outro stretches to fit the closing line.
- **Captions:** they come from the written script and the ElevenLabs word timings. They break at sentences and clauses and never split the company name. Each caption is at most two lines. An `.srt` file is written alongside for platforms that want one.

## What would make the next batch faster

1. **Send everything for a company in one go:** the live URL, a demo login with realistic data (sensible customer name, a few past orders, a non-zero balance), and the logo as a transparent PNG or SVG with its hex colour. Most rework comes from test data showing on screen.
2. **Ask the Replit builds to use the same button text** ("Add to basket", "Basket", "My orders", "Reorder", "Place order", "Invoices"). The step selectors in these four configs would then work unchanged, and a new company would be config plus logo plus script, with no selector fixes.
3. **Add a reset link to each demo portal** (or a `setup` action that clears the basket), so recordings always start from the same state.
4. **Write scripts one line per screen** from the start, with company names spelt as the client spells them. Keep each script to about 130 words (~60 s of voice), which keeps the video under 90 s once the intro, outro and on-screen actions are added.
5. **Let this environment reach `api.elevenlabs.io` and the portal domains** (environment settings → Network access → Allowed domains). The whole batch could then run unattended in the cloud: `for s in …; do node pipeline/demo.mjs $s build; done`.
6. **Optional:** a music bed. Drop a file in `assets/` and set `music.path` in `pipeline/defaults.json`. It's ducked under the voice automatically.
