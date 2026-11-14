# ClearScan ASO (ASC 6833164518)

Applied 13 Nov 2026, 4:49 PM BDT (Asia/Dhaka). Metadata only. No builds, prices, subscriptions, screenshots, TestFlight or review submissions were touched. Version 1.0 was PREPARE_FOR_SUBMISSION and the written fields stayed editable, except for one rejected name (see Failed fields).

## Final (live read-back)

| Field | Value | Chars |
|---|---|---|
| Name | ClearScan: Document Scanner | 27/30 |
| Subtitle | PDF & OCR, No Watermark | 23/30 |
| Keywords | receipt,invoice,offline,private,photo,camera,text,export,free,converter,image,pages,folder,scan,id | 98/100 |
| Promo text | Scan documents and receipts on your iPhone. Text is read on device, so you can search every page. No watermark, no account, no ads. Try Pro free for 7 days. | 156/170 |
| Primary category | BUSINESS | |
| Secondary category | PRODUCTIVITY | |
| Description | (see below) | 1538/4000 |

First 3 lines of the description (benefit hook):

> Scan a document, receipt or ID and get a clean PDF with no watermark.
>
> Text is read on your iPhone, so you can search every page. Nothing is uploaded. No account and no ads.
>
> Unlimited scans are free. Try Pro for 7 days, then $2.99 a month or $19.99 a year, or buy lifetime for $39.99.

Screenshot captions (not uploaded): `/home/box/shared/app-monitor/reports/clearscan-aso/captions.json`

## Before → after

| Field | Before | After |
|---|---|---|
| Name | ClearScan: Private PDF Scanner | ClearScan: Document Scanner |
| Subtitle | (empty) | PDF & OCR, No Watermark |
| Keywords | (empty) | `receipt,invoice,offline,private,photo,camera,text,export,free,converter,image,pages,folder,scan,id` (98) |
| Promo | (empty) | new promo (156) |
| Description | (empty) | full listing, 1538 characters |
| Categories | (none) | BUSINESS / PRODUCTIVITY |

## Failed fields

- First name write, "ClearScan: PDF Scanner & OCR" (28), returned HTTP 409 `ENTITY_ERROR.ATTRIBUTE.INVALID.DUPLICATE.DIFFERENT_ACCOUNT` on `/data/attributes/name`. Apple's message: the app name is already being used on a different account.
- A subtitle-only write then succeeded. "ClearScan: Document Scanner" (27) was accepted on the next name attempt.
- Other name candidates were not needed after that success.
- What's New was left alone (not editable on a first 1.0 version).
- Support URL and privacy policy URL were not written. The hosted pages `https://samayhuf-star.github.io/app-legal/clearscan/privacy.html` and `.../terms.html` both returned HTTP 404 at apply time, so they were not put in the listing. The description uses Apple's standard EULA: https://www.apple.com/legal/internet-services/itunes/dev/stdeula/

## Sources (free only, $0)

App Store search autocomplete, US storefront header, same hints endpoint as Lulla. Raw dump lives with the Lulla report at `/home/box/shared/app-monitor/reports/lulla-aso/apple-hints.json` (same research run).

Top ClearScan hints:

- "document scanner", "document scanner app free", "document scanner to pdf", "pdf scanner", "pdf scan", "scan to pdf", "scanner app free", "ocr scanner", "ocr scan", "receipt scanner", "photo to pdf", "image to pdf", "pdf maker", "offline scanner".
- "no watermark" / "without watermark" showed up strongly in Google autocomplete for "pdf scanner no watermark" and "pdf scanner app without watermark".
- Competitor brands in the hints (CamScanner, Genius Scan, Microsoft, Google, Adobe) were not used in any field. No "AI" wording.

Google autocomplete: document scanner, pdf scanner app (including "without watermark"), document scanner iphone, ocr scanner app, scan to pdf, receipt scanner app, scan document iphone, offline document scanner. Saved in `/home/box/shared/app-monitor/reports/lulla-aso/google-suggest.json`.

iTunes Search API competitor listings (`itunes-competitors.json` in the Lulla ASO folder):

- For document scanner / pdf scanner / scan to pdf / OCR / receipt queries, the dominant category pair is Business + Productivity (27 hits). Business was the most common primary (30), then Productivity (15). That is why categories were set to BUSINESS / PRODUCTIVITY, matching Adobe Scan, Genius Scan and iScanner, rather than the earlier draft of Productivity / Business.

## Notes

- The name leads with the brand and the top "document scanner" term. PDF, OCR and the no-watermark benefit sit in the subtitle, so those words are indexed without repeating title words.
- Keywords are comma-separated with no spaces after commas, and share no words with the title or subtitle (ocr, pdf, document, scanner, watermark are already indexed there; "scan" is in keywords because it is a different word from "scanner" and is a high-volume query such as "scan to pdf").
- Description and prices match the app: unlimited scans, on-device OCR, search, searchable PDF, Face ID lock, photo import, no watermark, no account, no ads, nothing uploaded. Pro unlocks auto-sort (Receipts, Invoices, IDs, Letters) and Word or Markdown export. Monthly $2.99 and yearly $19.99 include a 7-day trial when eligible; lifetime is $39.99 with no trial.
- Copy is based on `/workspace/7apps/Clear-Scan-src` and `store/APP_STORE_LBDTING.md`, with "ClearScan Pro" (the in-app name) instead of the older "ClearScan Plus" wording in that draft.
