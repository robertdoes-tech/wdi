# Allium static ads (Meta)

Ten static ads for Allium Supplements, built as HTML/CSS templates and rendered to PNG with headless Chromium.
78 renders: 10 ads, 2 or 3 colourways each, plus the two variants the brief asks for (Ad 8 Siména quote, Ad 9 Purus), in three sizes.

> **The bottle images are placeholders.** The real files (`purus__1_.png`, `motus.png`, `purus_and_motus.png`) were not in the repo,
> and this environment could not reach alliumsupplements.com. `scripts/placeholder-bottles.mjs` draws stand-ins so the layouts could be built and checked.
> Drop the real files into `assets/` and run `npm run assets && npm run build`. The real files then replace the stand-ins everywhere.

## Run

```sh
npm install
pip install "rembg[cpu]" pillow numpy   # background removal for the real bottle files
npm run assets      # placeholder renders + cut-out, 2x upscale, trim -> assets/cut/
npm run build       # all ads -> out/, contact sheet -> out/allium_contact_sheet.png
node build.mjs --only=01,08 --sizes=1350   # a subset while iterating
npm run qa          # copy QA only
```

The build exits 1 if any QA check fails. The PNGs are still written, failing ones get a red outline on the contact sheet, and `build/qa-report.json` lists every failure along with the contrast ratio of every text element.

Output names follow `allium_ad##_product_colourway_size.png`, e.g. `allium_ad01_purus_forest_1350.png`. Product is `purus`, `motus` or `range`.

## Layout

| Path | What |
|---|---|
| `copy.json` | Every word on every ad, plus each ad's variants, colourways and bottle. Copy edits never touch layout. |
| `tokens.css` | Fonts, brand colours, the seven colourways (text, accent, panel, plinth, glow, grain) and the three canvas sizes with the 1920 safe zone. |
| `components.css` | Shared pieces: type styles, bottle (glow, contact shadow, rim light), plinth, glass chips, tags, Trustpilot badge, grain. |
| `templates/ad01.html` to `ad10.html` | One template per ad. Positioning only, with per-size overrides. |
| `build.mjs` | Fills templates, renders, runs QA, writes PNGs and the contact sheet. |
| `qa/claims.mjs` | Banned words and claims rules, verbatim reviews, stat wording and source lines, Trustpilot numbers. |
| `qa/page-qa.mjs` | Per-render checks inside Chromium (see below). |
| `scripts/prep_assets.py` | Bottle cut-out (rembg isnet, white fringe removed), 2x upscale (Real-ESRGAN if `realesrgan-ncnn-vulkan` is on PATH, otherwise Lanczos plus unsharp), trim. |
| `assets/wordmarks.json` | Where the "allium. purus/motus" wordmark sits on each **real** bottle file, as fractions of the original. Fill this in when the real files arrive; it drives the uncropped-wordmark check. |

## QA (brief section 6), automated

1. Banned words, em dashes, ingredient counts, timed results, prices, five stars, the 4.8 rating, "verified" and the review outcome claims are all checked in `copy.json` before rendering and again on each page's rendered text. "guarantee" is allowed only inside the permitted sentence, and "Pain" only inside the AXA source line.
2. Stat source lines must be present, at 20px or larger, and worded exactly ("YouGov, January 2022", "AXA Health Joint Pain Report, 2025"). The stat wording itself is locked too.
3. The legal footer must be exact, in Roboto, at 20px or larger, on every render.
4. Each bottle's wordmark box must sit fully on canvas, unclipped, with no text or visual covering it.
5. WCAG AA contrast is checked for every text run against what is actually behind it: backdrop, glass panel and radial glow, with opacity taken into account. The threshold is 4.5:1, or 3:1 above 40px.
6. On 1920, every text box must sit between 14% and 80% of the height.
7. Text must not overflow its box, collide with other text, or sit on a bottle, plinth, garlic or capsule.
8. Contact sheet: `out/allium_contact_sheet.png`, for the "one family" review by eye.

## Decisions worth checking

- **Hot pink (Ad 1).** White on #f02d9b is 3.5:1, which passes only for large type. The headline stays white and all small text is black, which is 6:1.
- **Ad 9 Purus variant** uses the forest and cream colourways, so terracotta stays Motus's colour. Its proof strip quotes Siména (a Purus review) rather than T Digital (a Motus review).
- **Ad 8 variant B** shows the Purus bottle only, because Siména reviewed Purus.
- **Ad 10** uses the single Purus and Motus files, because one bottle has to stand raised on a plinth and the combined file can't be split.
- **Ad 3** gets the footer "Motus. 2 capsules a day with food." to match Ad 1. This is approved wording, but it wasn't asked for.
- **Ad 7** has no Malawi outline (it was optional) and no Nourish Fund logo.
- **Trustpilot badge** is drawn to Trustpilot's layout with the real 4.5 rating and 15 reviews. Swap in the official asset once the usage rules are confirmed.
- **Iron, Zinc, Vitamin C, Manganese and Copper** use a line hexagon icon with a text label. No rock images are used.
- **Grain** uses overlay blending, with its opacity calibrated per colourway. It measures 2.5% luminance noise on every backdrop except cream, where overlay maxes out at about 1.9%.

## Open items for Marc (from the brief)

- Send the real bottle renders, high-res or transparent if available, then fill in `assets/wordmarks.json`.
- Confirm the 20% and 28% subscribe-and-save offer applies to both products and is current.
- Confirm the Nourish Fund partnership and wording with Nourish Fund and Ripple Africa before Ad 7 runs.
- Confirm the three pharmacies are happy to be named in paid ads.
- The YouGov stat is from January 2022. Replace it if newer data exists.
- Confirm Trustpilot's rules on using reviews and the logo in paid ads.
