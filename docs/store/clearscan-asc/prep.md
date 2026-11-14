# ClearScan ASC prep

Written 14 November 2026, about 3:40 AM Asia/Dhaka (BDT, UTC+6).
ASC app `6833164518` (`com.samayhuf.clearscan`), version 1.0 `40d9a518-40d8-4418-9622-54b6e7904e77` (PREPARE_FOR_SUBMISSION), appInfo `9e167966-5753-4781-b1bd-2307a437a984`.
Nothing submitted: reviewSubmissions count = 0, no subscriptionSubmissions, no build attached or changed. The ASC key was read from disk and never printed. $0 spend.
Files: `apply_prep.py`, `prep-writes.json` (write log), `readback.py`, `readback.json`, `iap-review-paywall-1290x2796.png`.

## What was missing
Before: all 3 products MISSING_METADATA. en-US localizations, review notes, prices, intro offers, availability and the group localization already existed. **The only missing piece was the App Review screenshot** (null on all 3).

## Writes (all 2xx)
- Review screenshot: sim paywall `run-43493934205/.../05-paywall.png` (471x1024, real paywall: $19.99/yr and $2.99/mo with 7-day trials, $39.99 lifetime, Restore link) scaled to 1290x2796 RGB, MD5 `b5ba4036418b1aa366bd6112df6a1b6c`. Uploaded via reserve, upload, commit. All COMPLETE.
- Review notes rewritten per product (the old shared note mentioned a "sparkles button" that the version notes don't list). No ellipsis characters and no AI wording.
- Age rating questionnaire set to all NONE/false (ageRatingOverrideV2 NONE, no v1 override sent).
- contentRightsDeclaration was null; set to DOES_NOT_USE_THIRD_PARTY_CONTENT.
- appStoreReviewDetail created.

## Products (read back)
| Product | id | State | Screenshot | en-US loc | US price | Intro offer |
|---|---|---|---|---|---|---|
| Pro Monthly `com.samayhuf.clearscan.pro.monthly` | 6834361474 | **READY_TO_SUBMIT** | 412ed46b-6abf-48e7-b910-b15b746a88e4 COMPLETE 1290x2796 | "ClearScan Pro Monthly" / "Auto-sort and Word or Markdown export, billed monthly" | $2.99 (175 territories) | FREE_TRIAL ONE_WEEK x1, 175 territories |
| Pro Yearly `com.samayhuf.clearscan.pro.yearly` | 6834351556 | **READY_TO_SUBMIT** | 446a48a0-d37e-4cd1-bdd7-17af915b4dc8 COMPLETE 1290x2796 | "ClearScan Pro Yearly" / "Auto-sort and Word or Markdown export, billed yearly" | $19.99 (175) | FREE_TRIAL ONE_WEEK x1, 175 |
| Pro Lifetime `com.samayhuf.clearscan.pro.lifetime` (non-consumable) | 6834367887 | **READY_TO_SUBMIT** | 0fc464eb-11b7-4948-ab95-857d0df23ed4 COMPLETE | "ClearScan Pro Lifetime" / "Unlock ClearScan Pro forever on this Apple ID." | $39.99 (175 manual prices) | none (correct) |

Lifetime availability: 175 territories, availableInNewTerritories true. Group `22575550` en-US localization "ClearScan Pro" exists. No prices changed.

## App price
Manual USA $0.00 (Free), base territory USA, 174 automatic prices, so 175 territories in total. Already set, so nothing was written.

## Age rating
appStoreAgeRating **FOUR_PLUS**. brazilAgeRating L, brazilAgeRatingV2 SELF_RATED_L. All questionnaire fields NONE/false, including advertising, ageAssurance, healthOrWellnessTopics, messagingAndChat, parentalControls, userGeneratedContent, gunsOrOtherWeapons and lootBox. kidsAgeBand null.

## Review detail
id `b3d29f58-cee2-428a-b4cf-06642ef65256`: Samay Vashsht, [phone redacted], samayhuf@gmail.com, demoAccountRequired false. Notes are an exact byte match with `review-notes/clearscan.txt` (3907 chars, under the 4000 limit).

## Flags (not changed)
- The notes file still contains the placeholder line `[Screen recording link: TO ADD]`. It was pasted as is because the notes had to match exactly. Replace it before submitting.
- The paywall lists "Book mode COMING SOON" and "Sign and fill forms COMING SOON" as Pro features. Reviewers can flag features that aren't available yet on a paywall (guideline 2.1 / 3.1.2), so this is a risk.
- The subscription localization descriptions say "Auto-sort", while the notes say "type filters". This is cosmetic, so I left it.
