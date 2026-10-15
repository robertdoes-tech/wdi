# PLH | Klaviyo Flows | Claude Code Build Spec

Client: Pretty Little Homewares (Sarah, Arklow, Co. Wicklow)
Site: https://www.prettylittlehomewares.com
Canva folder: https://www.canva.com/folder/FAHX8CFhUuE (save final designs as "PLH | KLAVIYO FLOWS")
Standard to match: Coded flows (https://www.canva.com/d/THgwdnwj8vZaN2W), 1200 px wide
Status: DRAFT. Nothing goes into Klaviyo until Rory signs off.

---

## 0. Open items (resolve before final export)

1. **Discount code conflict.** The copy deck says no codes in Abandoned Checkout, Browse or Post Purchase. The latest brief adds PRETTY10, GIFT10, SPECIAL10 and FAMILY10. This spec follows the brief and marks every added code line as **[NEW COPY, NEEDS SIGN-OFF]**. Confirm with Rory.
2. **Code placement assumptions** (confirm):
   - PRETTY10: AC3 and AC4 (brief says "final 2")
   - GIFT10: BA3 and BA4 (brief does not say which; mirrored the checkout flow)
   - SPECIAL10: PP2 (first-time, day 10)
   - FAMILY10: PP4 (repeat, day 10)
3. **Codes must exist in Shopify.** Only NEWSLETTER10 is live. PRETTY10, GIFT10, SPECIAL10, FAMILY10 need creating (10% off, once per customer).
4. **Google review link** for PP2 and PP4: Rory to supply.
5. **Assets from Sarah:** hi-res or SVG logo, photo of Sarah, photo of the shop.
6. **Social proof board:** if "PLH | KLAVIYO SOCIAL PROOF" is empty, swap every review block for the Instagram block. Never write or edit a review.

---

## 1. Task for Claude Code

Build 16 email designs and deliver them **in Canva**, as editable designs, 1200 px wide, saved in the PLH Canva folder as "PLH | KLAVIYO FLOWS". The HTML and PNG build is the working master; the Canva designs are the deliverable. See section 9 for the Canva workflow.

- Every email uses the same design system and shared blocks, but **each email has its own layout** (see section 6). No two emails share the same structure.
- All copy lives in one data file (`copy.json`) transcribed **exactly** from the copy deck. Templates render from that file. Do not retype copy inside templates.
- Do not touch Klaviyo.

### Folder structure

```
plh-klaviyo/
  copy.json            # all 16 emails, verbatim copy + new code lines
  tokens.css           # colours, fonts, spacing
  partials/            # header, perks, instagram, signoff, footer, code-box, dynamic-block, product-tile, review
  emails/              # W1.html ... PP4.html
  assets/              # logo, icons, product images
  render.js            # Playwright: emails/*.html -> exports/*.png
  qa.js                # automated checks (section 7)
  exports/             # W1.png ... PP4.png + contact-sheet.png
```

### Rendering

- Build each email at **600 px CSS width**, render with Playwright at `deviceScaleFactor: 2`, full page screenshot. Result: **1200 px wide PNG**.
- Load fonts from Google Fonts: Caveat (600, 700), Roboto (400, 500, 700). Wait for `document.fonts.ready` before screenshot.
- File names: `PLH_W1_Welcome.png`, `PLH_AC1_Checkout.png`, `PLH_BA1_Browse.png`, `PLH_PP1_FirstTime.png` and so on.
- Also output `contact-sheet.png` (all 16 side by side, small) so layout variety is easy to check.

### Product images

- Try `https://www.prettylittlehomewares.com/collections/<handle>/products.json` for bestsellers, new-products, gift-ideas. If it works, use real product images, names and prices in static product tiles.
- If the site is not on Shopify yet or the endpoint fails, use labelled placeholder tiles ("PRODUCT TILE") in light pink. Do not invent product names or prices.

---

## 2. Design system

### Colours

| Token | Hex | Use |
|---|---|---|
| pink | #C76363 | Buttons, top bars, accents, code box border, footer bar, icons |
| light pink | #FFE8E8 | Section backgrounds, code box fill, perks strip, placeholders |
| navy | #1E2843 | All body text and headlines. Text only, never large navy blocks |
| white | #FFFFFF | Main background |

Pink is the primary colour.

### Type

- **Headlines:** Caveat 700, 44 to 56 px (CSS), navy or pink. Hero headlines only.
- **Section labels and top bars:** Roboto 700, 11 to 12 px, uppercase, letter-spacing 0.2em.
- **Body:** Roboto 400, 16 px, line-height 1.6, navy.
- **Buttons:** Roboto 700, 13 px, uppercase, letter-spacing 0.18em, white on pink, 16 x 36 px padding. Radius 2 px (or pill in emails that specify it).
- **Sign-off "Sarah x":** Caveat 700, 32 px, pink.
- Klaviyo fallbacks to note in handoff: Georgia for headlines, Arial for body.

### Spacing and detail

- Outer padding 40 px, section gaps 40 to 56 px.
- Thin pink rule: 1 px #C76363 at 60% width, centred.
- Small decorative touches allowed in pink only: hand-drawn style hearts, sprigs, ribbon lines (simple inline SVG). Keep it pretty, not busy.

---

## 3. Shared blocks (copy exact)

**Top bar:** full width pink, white Roboto bold caps label (text varies per email).

**Header:** logo centred on white, max 150 px wide (logo is 269 x 44, low res, keep it small), thin pink rule under it.

**Perks strip** (light pink, 3 icons):
- Free delivery over €50
- Free gift wrapping
- Hand-picked by Sarah in Arklow

**Instagram block:**
- Text: Follow @prettylittlehomewares for new stock first, photographed in the shop.
- Button: FOLLOW ON INSTAGRAM (https://www.instagram.com/prettylittlehomewares/)

**Sign-off:** Sarah x

**Footer:** pink bar. Pretty Little Homewares, Arklow, Co. Wicklow | info@prettylittlehomewares.com | Unsubscribe

**Code box:** light pink fill, 2 px pink border. Three lines: USE CODE (small caps label) / CODE (Roboto 700, 32 px, letter-spaced) / description (body).

**Dynamic block:** 250 to 350 px tall at 600 CSS (500 to 700 px in the 1200 export), white or light pink fill, 2 px dashed pink border, centred label **KLAVIYO DYNAMIC BLOCK** plus a small note of what drops in (e.g. "checkout items: image, name, quantity, price"). Same treatment as Coded.

**Recommended products space:** same dashed style, label **KLAVIYO PRODUCT FEED** with the count (e.g. "3 recommended products").

**Review card:** only from the social proof board. Name, stars, date, wording, copied exactly. If board is empty, use Instagram block instead.

Sender (for handoff notes): Sarah at Pretty Little Homewares, info@prettylittlehomewares.com

---

## 4. Flow settings (for handoff notes, not design)

| Flow | Trigger | Filter |
|---|---|---|
| Welcome | Joins newsletter list | Has not placed an order |
| Abandoned Checkout | Started checkout | Has not placed an order since starting this flow |
| Browse Abandonment | Viewed product | Has not added to cart, started checkout or placed order since starting this flow |
| Post Purchase | Placed order | Conditional split: Placed Order = 1 (first-time) or > 1 (repeat) |

---

## 5. New code copy [NEW COPY, NEEDS SIGN-OFF]

Written in Sarah's voice. Only used if Rory confirms the codes.

| Email | Code box | Line |
|---|---|---|
| AC3 | USE CODE / PRETTY10 / 10% off your order | To help it on its way, here's 10% off your order with code PRETTY10. |
| AC4 | USE CODE / PRETTY10 / 10% off your order | Your code PRETTY10 is still here for 10% off. |
| BA3 | USE CODE / GIFT10 / 10% off your order | Here's a little something to help you decide: 10% off with code GIFT10. |
| BA4 | USE CODE / GIFT10 / 10% off your order | Use code GIFT10 for 10% off, online or with Click & Collect. |
| PP2 | USE CODE / SPECIAL10 / 10% off your next order | As a thank you for your first order, here's 10% off your next one with code SPECIAL10. |
| PP4 | USE CODE / FAMILY10 / 10% off your next order | For our regulars, 10% off your next order with code FAMILY10. |

---

## 6. The 16 emails

Each email lists: meta, **layout concept** (must differ from every other email), then block order with exact copy.

---

### WELCOME SERIES

#### W1: send immediately
- Subject: Your 10% off is here, {{ first_name|default:'lovely' }}
- Preview: A little hello from Sarah in Arklow

**Layout: "Letter with gift tag."** Big centred Caveat hero, code box shaped like a gift tag (rounded top corners, punched hole, small pink string SVG), bestsellers in a 2x2 grid.

1. Top bar: WELCOME TO PRETTY LITTLE HOMEWARES
2. Header
3. Headline: Welcome to our little world
4. Code box (gift tag): USE CODE / NEWSLETTER10 / 10% off your first order
5. Body: Thank you so much for joining us. I'm Sarah, and Pretty Little Homewares is my little shop in Arklow, Co. Wicklow. Every candle, vase and gift is picked, checked and packed by me, and most pieces come in small numbers, so when they're gone, they're gone.
6. Button: CLAIM MY 10% OFF (/collections/new-products)
7. Section label OUR BESTSELLERS, 4 tiles 2x2 (/collections/bestsellers)
8. Perks strip
9. Instagram block
10. Sign-off: Sarah x
11. Footer

#### W2: day 2
- Subject: The story behind our little shop
- Preview: How Pretty Little Homewares began

**Layout: "Editorial story."** Header first, then a split block: photo left (60%), headline and body right on light pink. Category tiles as 4 tall arched-top cards in one row.

1. Header
2. Top bar: MEET SARAH
3. Split: Image placeholder "PHOTO OF SARAH OR THE SHOP (lifestyle shot until supplied)" + Headline: From a little dream to a little shop
4. Body: Pretty Little Homewares started as a little dream of mine. Today it's a shop in Arklow and a website full of pieces I'd happily have in my own home. I buy everything myself, check it by hand and pack every order with care. If you ever have a question, just reply to this email. It comes straight to me.
5. Section label SHOP BY CATEGORY: Candles & Lights | Artificial Flowers | Kitchen | Gift Ideas
6. Button: EXPLORE THE SHOP
7. Small line: Your code NEWSLETTER10 is still active for 10% off your first order.
8. Perks strip
9. Sign-off: Sarah x
10. Footer

#### W3: day 4
- Subject: The little extras you get with every order
- Preview: Free delivery over €50, free gift wrapping and more

**Layout: "Perks first."** The 4 perks are the hero as a 2x2 icon grid on light pink with large pink line icons. Gift ideas as a single row of 4. Review as a quote card with big pink quote marks. No separate perks strip (already the hero).

1. Top bar: WHY SHOP WITH US
2. Header
3. Headline: Little extras, on us
4. Perks 2x2: Free delivery on orders over €50 | Free gift wrapping on every order | Sending a gift? I'll add a handwritten note | Free Click & Collect from our shop in Arklow
5. Body: Christmas is coming, and these make gifting that little bit easier.
6. Section label GIFT IDEAS, 4 tiles in one row (/collections/gift-ideas)
7. Button: FIND A GIFT
8. Review card: 1 or 2 real reviews (or Instagram block if board empty)
9. Instagram block
10. Sign-off: Sarah x
11. Footer

#### W4: day 7
- Subject: Your 10% off is still waiting, {{ first_name|default:'lovely' }}
- Preview: A gentle reminder from Sarah

**Layout: "Coupon ticket."** Code box as a wide horizontal ticket with perforated edge and a pink stub on the left. Headline in pink. Products in a 3x2 grid.

1. Top bar: A LITTLE REMINDER
2. Header
3. Headline: Still thinking it over?
4. Code ticket: USE CODE / NEWSLETTER10 / 10% off your first order
5. Body: Your welcome code is still here. New stock lands in the shop every few weeks and the Christmas pieces are arriving now, so it's a lovely time to treat yourself or someone special.
6. Section label JUST LANDED, 6 tiles 3x2 (/collections/new-products)
7. Button: USE MY 10% OFF
8. Perks strip
9. Sign-off: Sarah x
10. Footer

---

### ABANDONED CHECKOUT

#### AC1: 1 hour
- Subject: Did something distract you?
- Preview: Your basket is saved and waiting

**Layout: "Handwritten note card."** Body sits on a light pink note card with a soft shadow and a small washi-tape SVG at the top, slightly tilted feel (no real rotation of text). Dynamic block below the card.

1. Top bar: YOUR BASKET IS SAVED
2. Header
3. Note card: Headline: You left something lovely behind / Body: You were nearly there. I've kept your basket safe so you can pick up right where you left off.
4. Dynamic block: checkout items (image, name, quantity, price)
5. Button: COMPLETE MY ORDER
6. Help line: Any questions about delivery or gift wrapping? Just reply to this email and I'll get back to you.
7. Perks strip
8. Sign-off: Sarah x
9. Footer

#### AC2: 24 hours
- Subject: Free delivery on orders over €50
- Preview: Plus free gift wrapping on every order

**Layout: "Delivery progress."** Under the headline, a pink progress bar graphic with a little van icon and "€50" marker (visual only, no numbers implying a cart value). Dynamic block, then 3 recommended products in a row.

1. Top bar: FREE DELIVERY OVER €50
2. Header
3. Headline: Nearly there, and delivery could be on us
4. Progress bar graphic
5. Body: Orders over €50 get free delivery. Add one more little something and your whole basket travels free.
6. Dynamic block: checkout items
7. Section label PAIRS WELL WITH, product feed space for 3 recommended products
8. Button: BACK TO MY BASKET
9. Sign-off: Sarah x
10. Footer

#### AC3: 48 hours
- Subject: Just a heads up, stock is limited
- Preview: Most pieces come in small numbers

**Layout: "Proof sandwich."** Headline and body left-aligned (only left-aligned hero in the set). Dynamic block, then 2 review cards side by side, then PRETTY10 as a slim pill-shaped code bar.

1. Top bar: LIMITED STOCK
2. Header
3. Headline: Once it's gone, it's gone
4. Body: I buy most pieces in small quantities, so I can't promise they'll be here for long. Your basket is saved for now.
5. Dynamic block: checkout items
6. Review cards: 2 real reviews (or Instagram block)
7. Code pill: USE CODE / PRETTY10 / 10% off your order + line from section 5 [NEW COPY, NEEDS SIGN-OFF]
8. Button: COMPLETE MY ORDER
9. Perks strip
10. Sign-off: Sarah x
11. Footer

#### AC4: 72 hours
- Subject: Wrapped and ready to go?
- Preview: Free gift wrapping and a handwritten note

**Layout: "Gift wrapped."** Pink ribbon SVG crossing the top of a light pink panel (like a wrapped box) holding headline and body. Code as a hanging gift tag. Optional Christmas banner as a separate removable block.

1. Top bar: FREE GIFT WRAPPING
2. Header
3. Ribbon panel: Headline: Is it a gift? Let me wrap it / Body: If your basket is for someone special, I'll gift wrap it for free. Sending it straight to them? Add your message at checkout and I'll write it by hand.
4. Dynamic block: checkout items
5. Code tag: USE CODE / PRETTY10 / 10% off your order + line from section 5 [NEW COPY, NEEDS SIGN-OFF]
6. Button: FINISH MY ORDER
7. Optional seasonal banner (Nov to Dec, label it removable): ORDER EARLY FOR CHRISTMAS
8. Instagram block
9. Sign-off: Sarah x
10. Footer

---

### BROWSE ABANDONMENT

#### BA1: 2 hours
- Subject: Still thinking about it?
- Preview: Here it is again

**Layout: "Single spotlight."** Minimal, lots of white. Oversized dynamic block (top of the size range) framed by a thin pink arch outline. Short and quiet.

1. Top bar: YOU HAVE GOOD TASTE
2. Header
3. Headline: Still on your mind?
4. Body: I saw you having a look at this one. It's a favourite in the shop too.
5. Dynamic block (large, arch frame): viewed product (image, name, price)
6. Button: TAKE ANOTHER LOOK
7. Perks strip
8. Sign-off: Sarah x
9. Footer

#### BA2: 24 hours
- Subject: A few more pieces you might love
- Preview: Hand-picked from the same collection

**Layout: "Main plus three."** Dynamic block on the left half, headline and body stacked on the right half on light pink. Below, product feed row of 3.

1. Top bar: PICKED FOR YOU
2. Header
3. Split: Dynamic block (viewed product) | Headline: A few more you might love / Body: If that one wasn't quite right, here are a few more I think you'll love.
4. Product feed space: 3 recommended products
5. Button: SHOP THE COLLECTION
6. Perks strip
7. Sign-off: Sarah x
8. Footer

#### BA3: 48 hours
- Subject: What everyone's buying this week
- Preview: The pieces customers keep coming back for

**Layout: "Bestseller wall."** Slim dynamic reminder strip at the very top (small, horizontal: image left, text right). Then headline, 3x2 bestseller grid with small pink "BESTSELLER" ribbons on tiles, review, code.

1. Top bar: OUR BESTSELLERS
2. Header
3. Dynamic block (slim reminder, around 500 px tall at 1200): viewed product
4. Headline: The pieces everyone loves
5. Body: These are the pieces customers keep coming back for. Most lines come in as just a handful, so popular pieces move quickly.
6. Section label BESTSELLERS, 6 tiles 3x2 (/collections/bestsellers)
7. Review card: 1 or 2 real reviews (or Instagram block)
8. Code box: USE CODE / GIFT10 / 10% off your order + line from section 5 [NEW COPY, NEEDS SIGN-OFF]
9. Button: SHOP BESTSELLERS
10. Sign-off: Sarah x
11. Footer

#### BA4: 4 days
- Subject: Shop online, collect in Arklow
- Preview: Free Click & Collect from our shop

**Layout: "Visit the shop."** Full-width shop photo as hero with headline overlaid in a white card. Small "address card" with a pink map-pin icon. Dynamic block below.

1. Top bar: VISIT THE SHOP
2. Header
3. Hero: Image placeholder "PHOTO OF THE SHOP (request from Sarah)" with headline card: Come and see us in Arklow
4. Body: Prefer to see it in person? Choose free Click & Collect at checkout and pick it up from our shop in Arklow when it suits you.
5. Address card: Pretty Little Homewares, Arklow, Co. Wicklow (pin icon)
6. Dynamic block: viewed product
7. Code box: USE CODE / GIFT10 / 10% off your order + line from section 5 [NEW COPY, NEEDS SIGN-OFF]
8. Button: SHOP NOW
9. Instagram block
10. Sign-off: Sarah x
11. Footer

---

### POST PURCHASE (first-time)

#### PP1 FIRST-TIME: day 1
- Subject: Thank you, {{ first_name|default:'lovely' }} x
- Preview: A little note from Sarah

**Layout: "Thank you card."** Whole message inside a bordered card (double pink rule) like a printed thank you card. Headline extra large. "What happens next" as a vertical timeline with pink dots and connecting line. No products, no buttons except Instagram.

1. Top bar: THANK YOU
2. Header
3. Card: Headline: You've made my day / Body: Thank you so much for your first order. It means the world to a small shop like mine. I'm packing it with care, and you'll get a tracking email as soon as it's on its way. If anything isn't right when it arrives, just reply to this email and I'll sort it.
4. Section label WHAT HAPPENS NEXT, vertical timeline: Packed by hand in Arklow | Tracking sent to your inbox | Delivered to your door
5. Instagram block
6. Sign-off: Sarah x
7. Footer

#### PP2 FIRST-TIME: day 10
- Subject: How are you finding your order?
- Preview: I'd love to hear what you think

**Layout: "Review ask plus care guide."** Five large pink outline stars above the headline. One button. Care tips as three rows with small icons on light pink (candle, mug, flower). Code after care tips. Products row of 3.

1. Top bar: A LITTLE FAVOUR
2. Header
3. Five-star graphic
4. Headline: How did we do?
5. Body: I hope your order arrived safely and you're loving it. A quick review helps other customers find us and means so much to a small shop.
6. Button: LEAVE A REVIEW (Google review link, Rory to supply)
7. Section label CARE TIPS:
   - Candles: trim the wick before each burn and never leave a lit candle unattended.
   - Ceramics and mugs: hand wash to keep the prints looking their best.
   - Artificial flowers: a quick dust now and then keeps them looking fresh.
8. Code box: USE CODE / SPECIAL10 / 10% off your next order + line from section 5 [NEW COPY, NEEDS SIGN-OFF]
9. Section label COMPLETE THE LOOK, product feed space for 3 recommended products
10. Sign-off: Sarah x
11. Footer

---

### POST PURCHASE (repeat)

#### PP3 REPEAT: day 1
- Subject: Welcome back, {{ first_name|default:'lovely' }} x
- Preview: Thank you for shopping with us again

**Layout: "Welcome back banner."** Wide light pink banner with a hand-drawn heart SVG and the headline in pink. Body in two short centred lines. New arrivals 2x2 with "NEW" corner labels.

1. Top bar: THANK YOU FOR COMING BACK
2. Header
3. Banner: Headline: So lovely to see you again
4. Body: Thank you for coming back. Customers like you are the reason this little shop keeps growing. Your order is being packed with care and your tracking email is on its way.
5. Section label NEW SINCE YOUR LAST VISIT, 4 tiles 2x2 (/collections/new-products)
6. Button: SEE WHAT'S NEW
7. Perks strip
8. Sign-off: Sarah x
9. Footer

#### PP4 REPEAT: day 10
- Subject: A little favour from Sarah
- Preview: Your review helps a small shop grow

**Layout: "Regulars club card."** FAMILY10 shown as a membership-style card (pink card, white text, small "ONE OF OUR REGULARS" label). Review ask above it. Gift ideas as 4 in a row, two buttons.

1. Top bar: ONE OF OUR REGULARS
2. Header
3. Headline: Would you share some love?
4. Body: You've shopped with us more than once, and that means a lot. If you have a minute, a quick review would really help other people find the shop.
5. Button: LEAVE A REVIEW (Google review link, Rory to supply)
6. Club card: USE CODE / FAMILY10 / 10% off your next order + line from section 5 [NEW COPY, NEEDS SIGN-OFF]
7. Section label GIFT IDEAS FOR CHRISTMAS, 4 tiles in one row (/collections/gift-ideas)
8. Instagram line: Tag us @prettylittlehomewares in your photos and we may share them.
9. Button 2: SHOP GIFT IDEAS
10. Sign-off: Sarah x
11. Footer

---

## 7. QA before sending for sign-off

`qa.js` must pass on every email:

- [ ] No em dash (U+2014), en dash (U+2013) or "--" anywhere in rendered text
- [ ] Every email ends with "Sarah x" before the footer
- [ ] All copy matches `copy.json` exactly (diff rendered text against source)
- [ ] Only NEWSLETTER10 appears in Welcome; PRETTY10 only in AC3/AC4; GIFT10 only in BA3/BA4; SPECIAL10 only in PP2; FAMILY10 only in PP4
- [ ] No navy background blocks; navy used for text only
- [ ] Every export is exactly 1200 px wide
- [ ] Every dynamic block is labelled KLAVIYO DYNAMIC BLOCK and 500 to 700 px tall in the export
- [ ] Reviews (if any) are copied exactly from the Canva board; otherwise Instagram block is used
- [ ] Contact sheet shows 16 visibly different layouts
- [ ] Logo never shown wider than 300 px in the export (low res)

## 8. Handoff

1. Deliver in Canva (section 9).
2. Send the Canva link for sign-off with the open items list from section 0.
3. Only after sign-off: build in Klaviyo.

---

## 9. Canva delivery (required)

### Setup

Claude Code must have the Canva MCP connected before starting:

```
claude mcp add --transport http canva https://mcp.canva.com/mcp
```

Then run `/mcp` and log in to Canva. Confirm the Canva tools are listed before building.

### Canva IDs

| Item | ID |
|---|---|
| PLH folder | FAHX8CFhUuE |
| Logo image asset | MAHX8HYS70A ("PLH Logo (from live site, low res)") |
| Social proof board | DAHX8NEvsBw (reviews are in reviews.txt, copy from there) |
| Coded reference | https://www.canva.com/d/THgwdnwj8vZaN2W (read it for structure and quality) |

### Workflow

1. **Read the Coded reference** with the Canva read tool first. Match its page size (1200 px wide), section spacing and dynamic block treatment.
2. **Build natively in Canva first.** If the Canva editing tools can add text, shapes, colours and images to a design, build each email directly in Canva:
   - Page width 1200 px, height to fit content
   - Fonts: Caveat for headlines, Roboto for everything else (both are in Canva)
   - Colours and copy exactly as in this spec, copy pulled from `copy.json` and `reviews.txt`
   - Use the existing logo asset MAHX8HYS70A, do not re-upload it
   - Text must stay editable text, not flattened into images
3. **Fallback if native building is not possible:** render the HTML to 1200 px PNGs, upload each to Canva, then run the Canva "separate image layers" tool so text and shapes become editable elements. Check every converted page: if any copy came out wrong, fix it in Canva against `copy.json`.
4. **Combine into one design** named **"PLH | KLAVIYO FLOWS"**, 16 pages in this order: W1, W2, W3, W4, AC1, AC2, AC3, AC4, BA1, BA2, BA3, BA4, PP1, PP2, PP3, PP4. Use the Canva merge tool if each email was built as its own design.
5. **Move it into the PLH folder** (FAHX8CFhUuE).
6. **Delete nothing** already in the folder. Leave the social proof board and logo where they are.
7. **Final check in Canva:** read the finished design back and run the section 7 QA against the Canva text (dashes, sign-offs, codes, review wording). Report the Canva link at the end.

Do not share the design, change its permissions or export to Klaviyo. Marc sends it for sign-off.
