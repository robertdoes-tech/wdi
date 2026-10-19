# Replit Agent prompts

Paste one prompt per project into Replit Agent. Each one tells the agent to keep everything that already works and only add what's missing. When the build is done, send me a screen recording or screenshots of the new screens and I'll make the videos.

---

## 1. Southern Gas Supplies (sgs.thisiswdi.com)

```
This is the Southern Gas Supplies trade portal demo. Keep everything that already works: the public site, the "Or enter the demo counter" sign-in, the trade catalogue, search and categories, product pages with tiered "From 10 units" pricing, the DEMO PRICE badges, and the staff desk (Overview, Applications, Accounts, Products, Price lists, Orders). Do not remove or restyle existing pages. Add the features below so a trade customer can place an order end to end and staff can approve it. All data stays fictional demo data.

1. BASKET
- "Add to basket" button with a quantity stepper on every catalogue card and on the product page.
- Basket icon with a live item count in the customer header.
- Basket page: lines with product name, stock code, quantity (editable), unit price (using the customer's own price list and quantity tiers), line total, remove button, then subtotal, VAT and total.

2. CHECKOUT
- Required "Your PO number" field at the top.
- Delivery or Collection choice (collection from Powerstown, Clonmel); delivery uses the account's address.
- Optional requested date and notes.
- Payment is "On account" only. No card payments.
- "Place order" button.
- If the same PO number was already used by this account, show a clear warning before placing: "PO 4471 was already used on order SGS-2026-1045. Place anyway?"

3. ORDER CONFIRMATION PAGE
- Shows the order number, PO number, delivery or collection, lines and totals, status "Awaiting approval", plus "View my orders" and "Back to catalogue" buttons.

4. MY ORDERS AND BUY AGAIN (customer side)
- "My orders" page in the customer header listing past orders: order number, date, PO, status, total.
- A "Buy again" button on every past order. One tap puts all its lines in the basket at today's prices and opens checkout.
- On the customer home or catalogue page, a "Your last order" card with its own "Buy again" button.

5. STAFF ORDER DESK APPROVAL
- New customer orders arrive in staff Orders with status "Awaiting approval".
- Opening an order shows: customer, PO number, lines, totals, delivery or collection, plus "Approve" and "Query" buttons.
- Approve changes the status to "Approved" and creates an invoice record (INV-xxxxx) with the customer's PO number printed in the reference field. Add a simple invoice view page that shows the PO on it.

6. NORTHERN IRELAND PRICING
- Accounts have a region: ROI or NI.
- ROI accounts see euro (€) prices with 23% VAT. NI accounts see sterling (£) prices with 20% VAT, everywhere: catalogue, product page, basket, checkout, invoice.
- Use a separate demo GBP price list. Show a small label: "Prices in GBP · 20% VAT".
- Add a demo counter login "Demo Belfast Buyer" (Demo Belfast Heating Ltd, NI, customer buyer).

7. DEMO DATA
- Demo Heating Buyer (Gold pricing) has 3 past orders using real catalogue items, so Buy Again works straight away.
- The staff order desk has 2 orders "Awaiting approval".
- Add a "Reset demo data" button in staff Demo settings that restores all of this.

8. VIDEO RECORDING MODE
- When the URL has ?video=1 (remember it for the session), hide the yellow "SAMPLE DATA NOTICE" banner and the "Demo environment" strips.
- Keep the DEMO PRICE badges.

9. QUALITY
- Everything above works on a phone (390px wide) as well as desktop.
- No dead buttons, empty pages or console errors anywhere in the flow: sign in, catalogue, add to basket, checkout with PO, confirmation, my orders, buy again, then staff approve and invoice.
- Keep the existing look; use deep navy with flame orange for primary buttons.
- The logo in the header is loaded from one file (public/logo.png) so it can be swapped for the real Southern Gas logo.
```

---

## 2. Southern Building Products (sbp.thisiswdi.com)

```
This is the Southern Building Products (SBP) trade portal demo for Irish builders' merchants. Keep everything that already works: the public site, magic-link sign-in, the product catalogue with 323 SBP products, search, categories, the DEMO PRICE badges, and the trade desk sidebar (Product catalogue, Accounts and branches, Demo settings, Purchase order review, Sage CSV import and export). Do not remove existing pages. Make every item below fully working with fictional demo data. The demo must prove one rule: "your customers change nothing". Orders can still arrive by email PO and WhatsApp, and the portal is optional for customers.

1. DEMO LOGINS
- Add a demo counter on the sign-in page (one-click login, no email needed) for these accounts:
  - admin@sbp-demo.test (SBP admin)
  - buyer.dublin@customer-demo.test (Demo Merchants Group, Dublin branch)
  - buyer.cork@customer-demo.test (Demo Merchants Group, Cork branch)
  - buyer.contractor@customer-demo.test (one-man-band contractor)
- Keep the magic-link form as well.

2. PURCHASE ORDER REVIEW: EMAILED POs BECOME DRAFT ORDERS
- Seed a sample PO (a realistic PDF) "emailed" by Demo Merchants Group. It appears in Purchase order review as a Draft order, with nobody having logged in.
- The review screen shows the original PDF on the left. On the right are the extracted lines, each matched to an SBP stock code, with quantity and price.
- The PO number, customer, branch, delivery address and requested date are captured at the top.
- One line uses the customer's own product code. Highlight it, let staff pick the SBP product from a search box, and add a checkbox "Remember this code for this customer". Next time that code matches automatically.
- Approve button turns the draft into a confirmed order.
- Add a "Simulate incoming PO email" button in Demo settings that drops in another sample PO.

3. DUPLICATE PO WARNING
- If a PO number already exists for that customer, show a red banner on the draft: "PO 4471 was already received on [date] as order SBP-xxxx."
- Seed one duplicate so the warning can be shown.

4. SAGE CSV IMPORT AND EXPORT
- Export approved orders as a Sage 50-compatible CSV (sales order or invoice import layout) with the customer's PO number in the reference column. Show a preview table and a Download button.
- Import screen accepts the standard Sage product, price and customer CSV exports (simulated is fine), and shows "323 products loaded".

5. REORDER FROM THE CONFIRMATION EMAIL (no password)
- Add a "Demo inbox" page showing the order confirmation email for buyer.dublin. It has a big "Reorder this" button.
- The button uses a one-time magic-link token: it signs the buyer straight in with no password and lands on checkout with last order's lines in the basket.
- Customer checkout: basket, required PO number, delivery address chosen from the branch, requested date, then "Place order" (on account, no card).
- Everything must work on a phone (390px).

6. ACCOUNTS AND BRANCHES
- Demo Merchants Group has at least 4 branches (Dublin, Cork, Galway, Limerick) and at least 3 users, each with their own login.
- Each order shows which branch and user placed it, with its own PO number and delivery address. Seed two orders from different branches.
- The Cork buyer sees their account price, which is exactly the invoice price. Rebates never appear anywhere on the customer side.

7. STAFF ENTRY: PASTE A WHATSAPP ORDER
- A "Staff entry" page with a paste box.
- Pasting this exact text must work: "Hi lads can I get 20 of the grey dry verge left hand and 2 boxes of 1143 terracotta for Tuesday, PO 4471". It builds editable order lines (matched SBP products and quantities), the PO number 4471, and the requested date (next Tuesday).
- Staff can edit, then click "Create order".
- Use reliable matching so this sample always parses correctly.

8. QUICK ORDER PAD (contractor, mobile)
- Customer page with rows of product code plus quantity, and type-ahead search.
- Typing "dpte" must find RTVMULTI-DPTE.
- "Add all to basket" button. Must work on a phone.

9. PROTECTING THE MERCHANTS
- The public site shows no prices anywhere and no self sign-up checkout, only "Apply for a trade account".
- Applications land in admin with Approve and Decline. Seed one waiting for approval.
- The customer side never shows stock levels or which depot an item comes from.

10. DEMO DATA, BRANDING AND VIDEO MODE
- Use SBP colours: green #1F674D, red #B61F27. The logo is loaded from one file (public/logo.png) so it can be swapped for the real SBP logo.
- Every price keeps its DEMO PRICE badge.
- Add a "Reset demo data" button in Demo settings that restores all the seeded data above.
- When the URL has ?video=1 (remember it for the session), hide "Private demo" banners and notices, but keep the DEMO PRICE badges.

11. QUALITY
- Every scene works in three clicks or fewer.
- No dead buttons, error messages or empty pages.
- Pages load in under two seconds.
- Customer screens work on a real phone.
```

---

## When the build is done, send me

- **Southern Gas:** a screen recording (or screenshots) of:
  - customer: add to basket → basket → checkout with PO → confirmation → My orders → Buy again;
  - staff: open the order → Approve → invoice with the PO;
  - the Demo Belfast Buyer seeing £ and 20% VAT.
- **SBP:** a screen recording (or screenshots) of each of the 11 items above, in order.
- Turn on ?video=1 first so the demo banners are hidden.
