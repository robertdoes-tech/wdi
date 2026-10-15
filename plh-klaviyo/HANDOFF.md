# PLH | Klaviyo Flows: handoff notes

Status: DRAFT for Rory sign-off. Nothing has been built in Klaviyo.

- Canva design: **PLH | KLAVIYO FLOWS** (16 pages, 1200 px wide), in the PLH folder: https://www.canva.com/d/ljx8pu2PEONf8Sz
- PNG masters: `exports/` (1200 px), contact sheet: `exports/contact-sheet.png`
- Sender: Sarah at Pretty Little Homewares, info@prettylittlehomewares.com
- Klaviyo font fallbacks: Georgia for headlines (Caveat), Arial for body (Roboto)

## Subjects and preview text

| Email | Flow | Timing | Subject | Preview |
|---|---|---|---|---|
| W1 | Welcome | send immediately | Your 10% off is here, {{ first_name|default:'lovely' }} | A little hello from Sarah in Arklow |
| W2 | Welcome | day 2 | The story behind our little shop | How Pretty Little Homewares began |
| W3 | Welcome | day 4 | The little extras you get with every order | Free delivery over €50, free gift wrapping and more |
| W4 | Welcome | day 7 | Your 10% off is still waiting, {{ first_name|default:'lovely' }} | A gentle reminder from Sarah |
| AC1 | Abandoned Checkout | 1 hour | Did something distract you? | Your basket is saved and waiting |
| AC2 | Abandoned Checkout | 24 hours | Free delivery on orders over €50 | Plus free gift wrapping on every order |
| AC3 | Abandoned Checkout | 48 hours | Just a heads up, stock is limited | Most pieces come in small numbers |
| AC4 | Abandoned Checkout | 72 hours | Wrapped and ready to go? | Free gift wrapping and a handwritten note |
| BA1 | Browse Abandonment | 2 hours | Still thinking about it? | Here it is again |
| BA2 | Browse Abandonment | 24 hours | A few more pieces you might love | Hand-picked from the same collection |
| BA3 | Browse Abandonment | 48 hours | What everyone's buying this week | The pieces customers keep coming back for |
| BA4 | Browse Abandonment | 4 days | Shop online, collect in Arklow | Free Click & Collect from our shop |
| PP1 | Post Purchase (first-time) | day 1 | Thank you, {{ first_name|default:'lovely' }} x | A little note from Sarah |
| PP2 | Post Purchase (first-time) | day 10 | How are you finding your order? | I'd love to hear what you think |
| PP3 | Post Purchase (repeat) | day 1 | Welcome back, {{ first_name|default:'lovely' }} x | Thank you for shopping with us again |
| PP4 | Post Purchase (repeat) | day 10 | A little favour from Sarah | Your review helps a small shop grow |

## Flow settings

| Flow | Trigger | Filter |
|---|---|---|
| Welcome | Joins newsletter list | Has not placed an order |
| Abandoned Checkout | Started checkout | Has not placed an order since starting this flow |
| Browse Abandonment | Viewed product | Has not added to cart, started checkout or placed order since starting this flow |
| Post Purchase | Placed order | Conditional split: Placed Order = 1 (first-time) or > 1 (repeat) |

## Open items (from spec section 0)

1. **Discount codes [NEW COPY, NEEDS SIGN-OFF]:** PRETTY10 (AC3, AC4), GIFT10 (BA3, BA4), SPECIAL10 (PP2), FAMILY10 (PP4). Copy deck said no codes in these flows; the brief adds them. Confirm with Rory.
2. **Codes must be created in Shopify** (10% off, once per customer). Only NEWSLETTER10 is live.
3. **Google review link** for LEAVE A REVIEW in PP2 and PP4: Rory to supply (placeholder link in build).
4. **Assets from Sarah:** hi-res or SVG logo, photo of Sarah (W2), photo of the shop (BA4).
5. **Reviews:** the Canva social proof board is still empty. Review cards in W3, AC3 and BA3 use the three Google reviews in `reviews.txt`, copied exactly (spelling, capitals and emojis untouched).
6. **Product tiles are placeholders.** The shop products.json endpoint could not be reached from the build environment, so no product names, images or prices were invented. Swap tiles for real products or Klaviyo product blocks.
7. AC4 "ORDER EARLY FOR CHRISTMAS" banner is a removable block (Nov to Dec only).

## Rebuild

```
npm run all          # build.js -> render.js -> qa.js (Playwright; set NODE_PATH if global)
node canva-html.js   # canva/PLH_KLAVIYO_FLOWS.html, imported into Canva via URL
node canva-qa.js     # section 7 QA against text read back from Canva
```
