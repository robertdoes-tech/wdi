# Audit: Southern Gas Supplies

https://sgs.thisiswdi.com/ · from Marc's 22 s screen recording (16 Oct 2026), not the automated audit. This session can't reach the site.

The recording covers the public pages only: home, apply form and sign-in. It never logs in, so none of the trade-account screens could be checked.

| Screen | Status | What the recording shows | Screenshot |
|---|---|---|---|
| Login | **page exists, login not tested** | "Trade customer sign in" (email + password + Sign in). The "Or enter the demo counter" box stays as grey loading placeholders for the whole 5 s it's on screen | [04-sign-in.png](04-sign-in.png) |
| Customer-specific pricing | **not seen** | Behind login | |
| Search / browse | **not seen** | Home page promises "Search like you speak" (product name, stock code, category) | [02-how-it-works.png](02-how-it-works.png) |
| Basket | **not seen** | Behind login | |
| Delivery vs collection | **not seen** | Behind login | |
| Submit order | **not seen** | Behind login | |
| Past orders | **not seen** | Behind login | |
| One-click reorder | **not seen** | Behind login | |
| Invoices / account balance | **not seen** | Behind login | |
| *(extra)* Apply for a trade account | **works (form shown)** | Business details form, region ROI / NI, business type, Submit application | [03-apply-form.png](03-apply-form.png) |

## Red flags for a client video

- **"SAMPLE DATA NOTICE" banner on every page:** "This is a private demo. Catalogue, product details and every displayed price are invented sample data, not live stock or commercial offers." It sits across the top of every frame. [05-sample-data-banner.png](05-sample-data-banner.png)
- **More disclaimers on screen:**
  - the home page strip reads "Demo environment · Sample content only";
  - the sign-in panel reads "Catalogue prices and product data are fictional demo content…";
  - the footer reads "Trade portal demonstration".
- **Name and logo mismatch:**
  - the portal is **Southern Gas Supplies** throughout;
  - the logo is the **Southern Gas Installations** sign, marked "Group mark provisional", and the footer says "Group mark shown provisionally for the related Southern Gas Installations group company";
  - in the header the logo is a small, blurry photo of the sign.
- **Demo counter possibly broken:** the "Or enter the demo counter" section never loads in the recording. It may just be slow.

## Effect on the video

Until the logged-in screens are checked, only the opening lines have something to show:

- `welcome` and `the-problem` can use the home page and sign-in page.
- Every other step is on hold, along with its script line: login, pricing, order, reorder, "orders land clean" and "your portal".

## To finish the audit

1. A demo login, plus `thisiswdi.com` allowed in this environment's network settings, so the automated audit and recording can run. **Or:**
2. A second screen recording that signs in and goes through the catalogue/prices, adding to the basket, delivery or collection, placing an order, past orders, reorder and invoices/balance. Even then the video needs the live site to record properly: 1920×1080, the drawn cursor and zoom targets.
